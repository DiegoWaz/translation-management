import type { ConfigMap, ConfigSchema, ConfigValue, ConfigValueType, GitHubConfig, LangFile } from '../types'
import { DEFAULT_CONFIG_PATH_TEMPLATE, DEFAULT_CONFIG_SCHEMA_PATH, DEFAULT_PATH_TEMPLATE } from './defaults'
import { buildLangFile } from './lang'
import { refreshAccessToken, type GitHubOAuthTokens } from './githubOAuth'
import { encryptForStorage, decryptFromStorage, isSecureStorageSupported } from './secureStorage'

const UI_CONFIG_KEY = 'localehub:config:v1'
const SOURCE_BRANCH_KEY = 'localehub:sourceBranch:v1'
const ENC_PREFIX = 'enc:'
/** Refresh access token this many ms before expiry. */
const REFRESH_SKEW_MS = 5 * 60_000

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

// Access + refresh tokens are encrypted at rest. Decryption is async; caches
// keep synchronous reads working after the first waitForTokenReady().
let tokenCache: string | null = null
let refreshTokenCache: string | null = null
let tokenReady: Promise<void> = Promise.resolve()
let refreshInFlight: Promise<GitHubOAuthTokens | null> | null = null

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
  /** OAuth refresh token (encrypted at rest when present). */
  refreshToken?: string
  /** Epoch ms when `token` expires (OAuth expiring tokens only). */
  tokenExpiresAt?: number
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

const encryptField = async (value: string): Promise<string> => {
  if (!isSecureStorageSupported()) return value
  return `${ENC_PREFIX}${await encryptForStorage(value)}`
}

const resolveEncryptedField = (
  value: string | undefined,
  cache: string | null,
  setCache: (plain: string) => void,
): { plain: string; pending?: Promise<void> } => {
  if (!value) return { plain: '' }
  if (!value.startsWith(ENC_PREFIX)) return { plain: value }
  const encValue = value.slice(ENC_PREFIX.length)
  if (cache !== null) return { plain: cache }
  if (encValue === 'pending') return { plain: '' }
  return {
    plain: '',
    pending: decryptFromStorage(encValue).then(plain => { setCache(plain) }),
  }
}

/** Persist cfg. Tokens are encrypted at rest. */
export const saveUiConfig = (cfg: StoredConfig): void => {
  tokenCache = cfg.token
  refreshTokenCache = cfg.refreshToken ?? null

  const placeholder: StoredConfig = {
    ...cfg,
    token: `${ENC_PREFIX}pending`,
    refreshToken: cfg.refreshToken ? `${ENC_PREFIX}pending` : undefined,
  }
  try { localStorage.setItem(UI_CONFIG_KEY, JSON.stringify(placeholder)) } catch { /* ignore */ }

  tokenReady = (async () => {
    const [tokenEnc, refreshEnc] = await Promise.all([
      encryptField(cfg.token),
      cfg.refreshToken ? encryptField(cfg.refreshToken) : Promise.resolve(undefined),
    ])
    try {
      const raw = localStorage.getItem(UI_CONFIG_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as StoredConfig
      parsed.token = tokenEnc
      if (refreshEnc) parsed.refreshToken = refreshEnc
      else delete parsed.refreshToken
      if (cfg.tokenExpiresAt) parsed.tokenExpiresAt = cfg.tokenExpiresAt
      else delete parsed.tokenExpiresAt
      localStorage.setItem(UI_CONFIG_KEY, JSON.stringify(parsed))
    } catch { /* ignore */ }
  })()
}

/**
 * Load the stored config. Encrypted tokens come back empty until
 * `waitForTokenReady()` finishes, then re-call this helper.
 */
export const loadUiConfig = (): StoredConfig | null => {
  try {
    const raw = localStorage.getItem(UI_CONFIG_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredConfig
    if (!parsed.owner || !parsed.repo) return null

    const token = resolveEncryptedField(parsed.token, tokenCache, v => { tokenCache = v })
    const refresh = resolveEncryptedField(parsed.refreshToken, refreshTokenCache, v => { refreshTokenCache = v })
    parsed.token = token.plain
    parsed.refreshToken = refresh.plain || undefined

    const pending = [token.pending, refresh.pending].filter(Boolean) as Promise<void>[]
    if (pending.length > 0) tokenReady = Promise.all(pending).then(() => undefined)

    return parsed
  } catch { return null }
}

export const clearUiConfig = (): void => {
  tokenCache = null
  refreshTokenCache = null
  try { localStorage.removeItem(UI_CONFIG_KEY) } catch { /* ignore */ }
}

/** Clear an invalid token but keep repo / langs so reconnect is faster. */
export const invalidateStoredToken = (): void => {
  tokenCache = null
  refreshTokenCache = null
  try {
    const raw = localStorage.getItem(UI_CONFIG_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as StoredConfig
    parsed.token = ''
    delete parsed.refreshToken
    delete parsed.tokenExpiresAt
    localStorage.setItem(UI_CONFIG_KEY, JSON.stringify(parsed))
  } catch { /* ignore */ }
}

/** Update only auth fields after a successful OAuth refresh. */
export const updateStoredOAuthTokens = (tokens: GitHubOAuthTokens): void => {
  const ui = loadUiConfig()
  if (!ui) {
    tokenCache = tokens.accessToken
    refreshTokenCache = tokens.refreshToken ?? null
    return
  }
  saveUiConfig({
    ...ui,
    token: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? ui.refreshToken,
    tokenExpiresAt: tokens.expiresAt,
  })
}

/** True when access token is missing an expiry, or expires within the skew window. */
export const shouldRefreshAccessToken = (expiresAt?: number): boolean => {
  if (!expiresAt) return false
  return Date.now() >= expiresAt - REFRESH_SKEW_MS
}

/**
 * Silently rotate the OAuth access token when a refresh token is available.
 * Dedupes concurrent callers. Returns null if refresh is impossible.
 */
export const refreshGitHubSession = async (): Promise<GitHubOAuthTokens | null> => {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    await waitForTokenReady()
    const ui = loadUiConfig()
    const refreshToken = ui?.refreshToken || refreshTokenCache || ''
    if (!refreshToken) return null

    try {
      const tokens = await refreshAccessToken(refreshToken)
      updateStoredOAuthTokens(tokens)
      return tokens
    } catch {
      return null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

/** Proactively refresh if we know the access token is about to expire. */
export const ensureFreshAccessToken = async (): Promise<string | null> => {
  await waitForTokenReady()
  const ui = loadUiConfig()
  if (!ui?.token && !tokenCache) return null
  if (shouldRefreshAccessToken(ui?.tokenExpiresAt)) {
    const refreshed = await refreshGitHubSession()
    if (refreshed) return refreshed.accessToken
  }
  return tokenCache ?? ui?.token ?? null
}

/** Load config from localStorage first, then fall back to env vars. */
export const loadConfig = (): GitHubConfig => {
  const ui = loadUiConfig()

  if (ui) {
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
  }
}

export const isGithubConfigured = (config: GitHubConfig): boolean =>
  Boolean(config.token && config.owner && config.repo)

export type { ConfigMap, ConfigSchema, ConfigValue, ConfigValueType }
