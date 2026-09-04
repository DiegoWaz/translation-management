import type {
  ConfigMap,
  ConfigSchema,
  FileSource,
  GitHubConfig,
  WorkspaceMode,
} from '../types'
import { loadRefConfig } from './config'

const STORAGE_PREFIX = 'localehub:draft:v1'
/** Previous product key — still read once for migration. */
const LEGACY_STORAGE_PREFIX = 'tm:draft:v1'

export type DraftSnapshot = {
  v: 1
  savedAt: number
  isDemoMode: boolean
  workspace: WorkspaceMode
  activeLang: string
  translations: Record<string, Record<string, string>>
  original: Record<string, Record<string, string>>
  configs: Record<string, ConfigMap>
  configsOriginal: Record<string, ConfigMap>
  configSchema: ConfigSchema
  configSchemaOriginal: ConfigSchema
  shas: Record<string, string>
  configShas: Record<string, string>
  schemaSha: string
  /** Per-locale source files (multiple `translations/` folders → several paths per lang). */
  fileSources?: Record<string, FileSource[]>
  /** Explicit routing for keys across multiple source files per locale. */
  keyOwners?: Record<string, Record<string, number>>
}

const keyWithPrefix = (prefix: string, config: GitHubConfig): string => {
  const langs = config.files.map(f => f.lang).join(',')
  const owner = config.owner || 'local'
  const repo = config.repo || 'demo'
  const ref = loadRefConfig(config).branch
  return `${prefix}:${owner}/${repo}/${ref}:${langs}`
}

export const draftStorageKey = (config: GitHubConfig): string =>
  keyWithPrefix(STORAGE_PREFIX, config)

const parseDraft = (raw: string | null): DraftSnapshot | null => {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as DraftSnapshot
    if (!parsed || parsed.v !== 1) return null
    if (!parsed.translations || !parsed.original) return null
    if (!parsed.configs || !parsed.configsOriginal) return null
    if (!parsed.configSchema || !parsed.configSchemaOriginal) return null
    return parsed
  } catch {
    return null
  }
}

export const loadDraft = (config: GitHubConfig): DraftSnapshot | null => {
  const current = parseDraft(localStorage.getItem(draftStorageKey(config)))
  if (current) return current

  const legacyKey = keyWithPrefix(LEGACY_STORAGE_PREFIX, config)
  const legacy = parseDraft(localStorage.getItem(legacyKey))
  if (!legacy) return null

  try {
    localStorage.setItem(draftStorageKey(config), JSON.stringify(legacy))
    localStorage.removeItem(legacyKey)
  } catch {
    // keep returning legacy even if migrate write fails
  }
  return legacy
}

export const saveDraft = (config: GitHubConfig, draft: Omit<DraftSnapshot, 'v' | 'savedAt'>): void => {
  try {
    const payload: DraftSnapshot = {
      v: 1,
      savedAt: Date.now(),
      ...draft,
    }
    localStorage.setItem(draftStorageKey(config), JSON.stringify(payload))
    localStorage.removeItem(keyWithPrefix(LEGACY_STORAGE_PREFIX, config))
  } catch {
    // Quota / private mode — ignore
  }
}

export const clearDraft = (config: GitHubConfig): void => {
  try {
    localStorage.removeItem(draftStorageKey(config))
    localStorage.removeItem(keyWithPrefix(LEGACY_STORAGE_PREFIX, config))
  } catch {
    // ignore
  }
}

/** True when the draft has uncommitted translation, config, or schema edits. */
export const isDraftDirty = (draft: DraftSnapshot): boolean => {
  for (const lang of Object.keys(draft.translations)) {
    const current = draft.translations[lang] ?? {}
    const orig = draft.original[lang] ?? {}
    const keys = new Set([...Object.keys(current), ...Object.keys(orig)])
    for (const key of keys) {
      if ((current[key] ?? '') !== (orig[key] ?? '')) return true
    }
  }
  for (const lang of Object.keys(draft.original)) {
    if (!(lang in draft.translations)) return true
  }
  for (const lang of Object.keys(draft.configs)) {
    const current = draft.configs[lang] ?? {}
    const orig = draft.configsOriginal[lang] ?? {}
    const keys = new Set([...Object.keys(current), ...Object.keys(orig)])
    for (const key of keys) {
      if (JSON.stringify(current[key]) !== JSON.stringify(orig[key])) return true
    }
  }
  return JSON.stringify(draft.configSchema) !== JSON.stringify(draft.configSchemaOriginal)
}
