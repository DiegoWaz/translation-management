import type { GitHubConfig, LangFile } from '../types'
import { DEFAULT_PATH_TEMPLATE } from './defaults'
import { buildLangFile } from './lang'

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

/** GitHub + locale list are env-only. Project locales live in VITE_GH_LANGS. */
export const loadConfig = (): GitHubConfig => {
  const files = filesFromEnv()
  return {
    token: envString('VITE_GH_TOKEN') ?? '',
    owner: envString('VITE_GH_OWNER') ?? '',
    repo: envString('VITE_GH_REPO') ?? '',
    branch: envString('VITE_GH_BRANCH') ?? 'main',
    baseLang: envString('VITE_GH_BASE_LANG') ?? files[0]?.lang ?? '',
    files,
  }
}

export const isGithubConfigured = (config: GitHubConfig): boolean =>
  Boolean(config.token && config.owner && config.repo)
