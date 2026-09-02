import type { ConfigMap, ConfigSchema, ConfigValue, ConfigValueType, GitHubConfig, LangFile } from '../types'
import { DEFAULT_CONFIG_PATH_TEMPLATE, DEFAULT_CONFIG_SCHEMA_PATH, DEFAULT_PATH_TEMPLATE } from './defaults'
import { buildLangFile } from './lang'
import { encryptForStorage, decryptFromStorage, isSecureStorageSupported } from './secureStorage'

const UI_CONFIG_KEY = 'localehub:config:v1'
const SOURCE_BRANCH_KEY = 'localehub:sourceBranch:v1'

const sourceBranchStorageKey = (owner: string, repo: string): string =>
  `${SOURCE_BRANCH_KEY}:${owner}/${repo}`

/** Persist load branch for env-only setups (no full UI config). */
export const saveSourceBranch = (owner: string, repo: string, sourceBranch: string): void => {
  if (!owner || !repo) return
  try { localStorage.setItem(sourceBranchStorageKey(owner, repo), sourceBranch) } catch { /* ignore */ }
}

const loadSourceBranchFromStorage = (owner: string, repo: string): string | null => {
  if (!owner || !repo) return null
  try {
    const raw = localStorage.getItem(sourceBranchStorageKey(owner, repo))
    return raw?.trim() || null
  } catch {
    return null
  }
}

/** Config with `branch` set to the active load ref (for GitHub read APIs). */
export const loadRefConfig = (config: GitHubConfig): GitHubConfig => ({
  ...config,
  branch: config.sourceBranch,
})

export const persistSourceBranch = (config: GitHubConfig, sourceBranch: string): void => {
  saveSourceBranch(config.owner, config.repo, sourceBranch)
  const ui = loadUiConfig()
  if (ui) saveUiConfig({ ...ui, sourceBranch })
}

/** When loading from a non-base branch, commits should default to that branch. */
export const preferExistingCommitBranch = (config: GitHubConfig): boolean =>
  config.sourceBranch !== config.branch

// The GitHub token is the only genuinely sensitive value we persist. It is
// encrypted at rest (see secureStorage.ts) so it never sits as plain text in
// localStorage. Because storage APIs here are used synchronously in many
// places (React useState initializers), decryption happens once in the
// background after load and is cached in memory; `tokenReady` lets callers
// await the real token becoming available and re-read the config.
let tokenCache: string | null = null
let tokenReady: Promise<void> = Promise.resolve()

/** Await this, then re-call loadConfig()/loadUiConfig() to get the decrypted token. */
export const waitForTokenReady = (): Promise<void> => tokenReady

const envString = (key: keyof ImportMetaEnv): string | undefined => {
  const value = import.meta.env[key]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

const filesFromEnv = (): LangFile[] => {
  const langs = envString('VITE_GH_LANGS')
  if (!langs) return []
  const pathTemplate = envString('VITE_GH_PATH_TEMPLATE') ?? DEFAULT_PATH_TEMPLATE
  return langs.split(',').map(code => buildLangFile(code.trim(), pathTemplate)).filter(f => f.lang)
}

export interface StoredConfig {
  token: string
  owner: string
  repo: string
  branch: string
  sourceBranch?: string
  baseLang: string
  langs: string[]
  translationsFolderName?: string
  pathTemplate?: string
  configPathTemplate: string
  configSchemaPath: string
}

const ENC_PREFIX = 'enc:'

/** Persist cfg. The token is encrypted at rest; encryption happens in the background. */
export const saveUiConfig = (cfg: StoredConfig): void => {
  tokenCache = cfg.token
  // Write immediately with a placeholder token so nothing sensitive ever hits
  // disk unencrypted, then swap in the encrypted value once it's ready.
  try { localStorage.setItem(UI_CONFIG_KEY, JSON.stringify({ ...cfg, token: `${ENC_PREFIX}pending` })) } catch { /* ignore */ }

  const persistEncrypted = (token: string) => {
    try {
      const raw = localStorage.getItem(UI_CONFIG_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      parsed.token = token
      localStorage.setItem(UI_CONFIG_KEY, JSON.stringify(parsed))
    } catch { /* ignore */ }
  }

  tokenReady = isSecureStorageSupported()
    ? encryptForStorage(cfg.token).then(enc => persistEncrypted(`${ENC_PREFIX}${enc}`))
    : Promise.resolve(persistEncrypted(cfg.token))
}

/**
 * Load the stored config. If the token is encrypted and not yet decrypted in
 * memory, it comes back as an empty string and `waitForTokenReady()` +
 * `loadUiConfig()` again will yield the real value shortly after.
 * Returns null only when there's no usable stored config (missing owner/repo),
 * so presence-checks (e.g. "has the user set up GitHub?") stay accurate even
 * mid-decrypt.
 */
export const loadUiConfig = (): StoredConfig | null => {
  try {
    const raw = localStorage.getItem(UI_CONFIG_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredConfig
    if (!parsed.owner || !parsed.repo) return null

    if (typeof parsed.token === 'string' && parsed.token.startsWith(ENC_PREFIX)) {
      const encValue = parsed.token.slice(ENC_PREFIX.length)
      if (tokenCache !== null) {
        parsed.token = tokenCache
      } else {
        parsed.token = ''
        if (encValue !== 'pending') {
          tokenReady = decryptFromStorage(encValue).then(plain => { tokenCache = plain })
        }
      }
    }
    return parsed
  } catch { return null }
}

export const clearUiConfig = (): void => {
  try { localStorage.removeItem(UI_CONFIG_KEY) } catch { /* ignore */ }
}

/** Clear an invalid token but keep repo / langs so reconnect is faster. */
export const invalidateStoredToken = (): void => {
  tokenCache = null
  const ui = loadUiConfig()
  if (!ui) return
  try {
    localStorage.setItem(UI_CONFIG_KEY, JSON.stringify({ ...ui, token: '' }))
  } catch { /* ignore */ }
}

/** Load config from localStorage first, then fall back to env vars. */
export const loadConfig = (): GitHubConfig => {
  const ui = loadUiConfig()
  const alwaysNestJson = envString('VITE_ALWAYS_NEST_JSON') === 'true'
  
  if (ui) {
    // If translationsFolderName is set (new system), generate files with the folder name
    let files: LangFile[]
    if (ui.translationsFolderName) {
      files = ui.langs.map(code => ({
        lang: code,
        label: code,
        flag: '🌐',
        path: `${ui.translationsFolderName}/${code}.json`,
      }))
    } else if (ui.pathTemplate) {
      files = ui.langs.map(code => buildLangFile(code, ui.pathTemplate!))
    } else {
      files = []
    }
    
    const branch = ui.branch
    return {
      token: ui.token,
      owner: ui.owner,
      repo: ui.repo,
      branch,
      sourceBranch: ui.sourceBranch || branch,
      baseLang: ui.baseLang || files[0]?.lang || '',
      files,
      configPathTemplate: ui.configPathTemplate || DEFAULT_CONFIG_PATH_TEMPLATE,
      configSchemaPath: ui.configSchemaPath || DEFAULT_CONFIG_SCHEMA_PATH,
      translationsFolderName: ui.translationsFolderName,
      alwaysNestJson,
    }
  }
  const files = filesFromEnv()
  const owner = envString('VITE_GH_OWNER') ?? ''
  const repo = envString('VITE_GH_REPO') ?? ''
  const branch = envString('VITE_GH_BRANCH') ?? 'main'
  return {
    token: envString('VITE_GH_TOKEN') ?? '',
    owner,
    repo,
    branch,
    sourceBranch: loadSourceBranchFromStorage(owner, repo) ?? branch,
    baseLang: envString('VITE_GH_BASE_LANG') ?? files[0]?.lang ?? '',
    files,
    configPathTemplate: envString('VITE_GH_CONFIG_PATH_TEMPLATE') ?? DEFAULT_CONFIG_PATH_TEMPLATE,
    configSchemaPath: envString('VITE_GH_CONFIG_SCHEMA_PATH') ?? DEFAULT_CONFIG_SCHEMA_PATH,
    translationsFolderName: envString('VITE_TRANSLATIONS_FOLDER_NAME'),
    alwaysNestJson,
  }
}

export const isGithubConfigured = (config: GitHubConfig): boolean =>
  Boolean(config.token && config.owner && config.repo)

export type { ConfigMap, ConfigSchema, ConfigValue, ConfigValueType }
