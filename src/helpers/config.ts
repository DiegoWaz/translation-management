import type { ConfigMap, ConfigSchema, ConfigValue, ConfigValueType, GitHubConfig, LangFile } from '../types'
import { DEFAULT_CONFIG_PATH_TEMPLATE, DEFAULT_CONFIG_SCHEMA_PATH, DEFAULT_PATH_TEMPLATE } from './defaults'
import { buildLangFile } from './lang'

const UI_CONFIG_KEY = 'localehub:config:v1'

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
  baseLang: string
  langs: string[]
  translationsFolderName?: string
  pathTemplate?: string
  configPathTemplate: string
  configSchemaPath: string
}

export const saveUiConfig = (cfg: StoredConfig): void => {
  try { localStorage.setItem(UI_CONFIG_KEY, JSON.stringify(cfg)) } catch { /* ignore */ }
}

export const loadUiConfig = (): StoredConfig | null => {
  try {
    const raw = localStorage.getItem(UI_CONFIG_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredConfig
    if (!parsed.token || !parsed.owner || !parsed.repo) return null
    return parsed
  } catch { return null }
}

export const clearUiConfig = (): void => {
  try { localStorage.removeItem(UI_CONFIG_KEY) } catch { /* ignore */ }
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
    
    return {
      token: ui.token,
      owner: ui.owner,
      repo: ui.repo,
      branch: ui.branch,
      baseLang: ui.baseLang || files[0]?.lang || '',
      files,
      configPathTemplate: ui.configPathTemplate || DEFAULT_CONFIG_PATH_TEMPLATE,
      configSchemaPath: ui.configSchemaPath || DEFAULT_CONFIG_SCHEMA_PATH,
      translationsFolderName: ui.translationsFolderName,
      alwaysNestJson,
    }
  }
  const files = filesFromEnv()
  return {
    token: envString('VITE_GH_TOKEN') ?? '',
    owner: envString('VITE_GH_OWNER') ?? '',
    repo: envString('VITE_GH_REPO') ?? '',
    branch: envString('VITE_GH_BRANCH') ?? 'main',
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
