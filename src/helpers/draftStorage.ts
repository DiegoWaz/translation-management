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

/**
 * Draft key is owner/repo/branch only — NOT langs.
 * Including langs broke refresh: after Load, files = all discovered locales;
 * on reload, env/setup langs differ → key miss → draft (and keys) vanished.
 */
const draftRefKey = (prefix: string, config: GitHubConfig): string => {
  const owner = config.owner || 'local'
  const repo = config.repo || 'demo'
  const ref = loadRefConfig(config).branch
  return `${prefix}:${owner}/${repo}/${ref}`
}

/** Older keys appended `:${langs}` — used only for migration. */
const legacyLangsSuffix = (config: GitHubConfig): string => {
  const sorted = [...config.files.map(f => f.lang)].sort().join(',')
  const unsorted = config.files.map(f => f.lang).join(',')
  return sorted || unsorted
}

export const draftStorageKey = (config: GitHubConfig): string =>
  draftRefKey(STORAGE_PREFIX, config)

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

const readDraftRaw = (key: string): DraftSnapshot | null =>
  parseDraft(localStorage.getItem(key))

const migrateDraftKey = (fromKey: string, toKey: string, draft: DraftSnapshot): void => {
  if (fromKey === toKey) return
  try {
    localStorage.setItem(toKey, JSON.stringify(draft))
    localStorage.removeItem(fromKey)
  } catch {
    // keep readable at fromKey if migrate write fails
  }
}

/** Find a draft stored under an old langs-suffixed key for this owner/repo/ref. */
const findLegacyLangSuffixedDraft = (config: GitHubConfig): { key: string; draft: DraftSnapshot } | null => {
  const base = draftRefKey(STORAGE_PREFIX, config)
  const legacyBase = draftRefKey(LEGACY_STORAGE_PREFIX, config)
  const langs = legacyLangsSuffix(config)

  const candidates = [
    langs ? `${base}:${langs}` : null,
    langs ? `${legacyBase}:${langs}` : null,
    legacyBase,
  ].filter(Boolean) as string[]

  for (const key of candidates) {
    const draft = readDraftRaw(key)
    if (draft) return { key, draft }
  }

  // Scan localStorage for any draft of this ref (langs unknown after refresh).
  try {
    const prefixes = [`${base}:`, `${legacyBase}:`]
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if (!prefixes.some(p => key.startsWith(p))) continue
      const draft = readDraftRaw(key)
      if (draft) return { key, draft }
    }
  } catch {
    // private mode
  }
  return null
}

export const loadDraft = (config: GitHubConfig): DraftSnapshot | null => {
  const canonical = draftStorageKey(config)
  const current = readDraftRaw(canonical)
  if (current) return current

  const legacy = findLegacyLangSuffixedDraft(config)
  if (!legacy) return null

  migrateDraftKey(legacy.key, canonical, legacy.draft)
  return legacy.draft
}

export const saveDraft = (config: GitHubConfig, draft: Omit<DraftSnapshot, 'v' | 'savedAt'>): void => {
  try {
    const payload: DraftSnapshot = {
      v: 1,
      savedAt: Date.now(),
      ...draft,
    }
    const canonical = draftStorageKey(config)
    localStorage.setItem(canonical, JSON.stringify(payload))

    // Drop old langs-suffixed keys for this ref so refresh can't pick a stale one.
    const base = draftRefKey(STORAGE_PREFIX, config)
    const legacyBase = draftRefKey(LEGACY_STORAGE_PREFIX, config)
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (!key || key === canonical) continue
      if (key === legacyBase || key.startsWith(`${base}:`) || key.startsWith(`${legacyBase}:`)) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    // Quota / private mode — ignore
  }
}

export const clearDraft = (config: GitHubConfig): void => {
  try {
    const canonical = draftStorageKey(config)
    localStorage.removeItem(canonical)
    const base = draftRefKey(STORAGE_PREFIX, config)
    const legacyBase = draftRefKey(LEGACY_STORAGE_PREFIX, config)
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (!key) continue
      if (key === legacyBase || key.startsWith(`${base}:`) || key.startsWith(`${legacyBase}:`)) {
        localStorage.removeItem(key)
      }
    }
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
