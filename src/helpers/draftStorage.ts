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

const IDB_NAME = 'localehub-drafts'
const IDB_STORE = 'drafts'
const IDB_VERSION = 1

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

export type DraftSaveResult = { ok: true; via: 'idb' | 'localStorage' } | { ok: false; reason: string }

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

const isDraftSnapshot = (value: unknown): value is DraftSnapshot => {
  if (!value || typeof value !== 'object') return false
  const parsed = value as DraftSnapshot
  return parsed.v === 1
    && Boolean(parsed.translations && parsed.original)
    && Boolean(parsed.configs && parsed.configsOriginal)
    && Boolean(parsed.configSchema && parsed.configSchemaOriginal)
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

const openDraftDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
  })

const idbGet = async (key: string): Promise<DraftSnapshot | null> => {
  try {
    const db = await openDraftDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(key)
      req.onsuccess = () => {
        const value = req.result
        resolve(isDraftSnapshot(value) ? value : null)
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

const idbPut = async (key: string, draft: DraftSnapshot): Promise<boolean> => {
  try {
    const db = await openDraftDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put(draft, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    return true
  } catch {
    return false
  }
}

const idbDelete = async (key: string): Promise<void> => {
  try {
    const db = await openDraftDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // ignore
  }
}

const clearLocalDraftKeys = (config: GitHubConfig, keepCanonical = false): void => {
  try {
    const canonical = draftStorageKey(config)
    if (!keepCanonical) localStorage.removeItem(canonical)
    const base = draftRefKey(STORAGE_PREFIX, config)
    const legacyBase = draftRefKey(LEGACY_STORAGE_PREFIX, config)
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (!key) continue
      if (keepCanonical && key === canonical) continue
      if (key === legacyBase || key.startsWith(`${base}:`) || key.startsWith(`${legacyBase}:`)) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    // ignore
  }
}

/** Sync read from localStorage only (boot fast-path / legacy). */
export const loadDraftFromLocalStorage = (config: GitHubConfig): DraftSnapshot | null => {
  const canonical = draftStorageKey(config)
  const current = readDraftRaw(canonical)
  if (current) return current

  const legacy = findLegacyLangSuffixedDraft(config)
  if (!legacy) return null

  migrateDraftKey(legacy.key, canonical, legacy.draft)
  return legacy.draft
}

/** @deprecated Prefer loadDraftAsync — kept as sync alias for boot. */
export const loadDraft = (config: GitHubConfig): DraftSnapshot | null =>
  loadDraftFromLocalStorage(config)

const pickNewer = (a: DraftSnapshot | null, b: DraftSnapshot | null): DraftSnapshot | null => {
  if (!a) return b
  if (!b) return a
  return (a.savedAt ?? 0) >= (b.savedAt ?? 0) ? a : b
}

const hasFileSources = (draft: DraftSnapshot | null | undefined): boolean =>
  Boolean(draft?.fileSources && Object.keys(draft.fileSources).some(lang => (draft.fileSources?.[lang]?.length ?? 0) > 0))

/**
 * Prefer the newer snapshot, but never drop fileSources from the other store —
 * a newer localStorage mirror can omit them after a quota trim / partial boot.
 */
const mergeDraftStores = (
  fromIdb: DraftSnapshot | null,
  fromLs: DraftSnapshot | null,
): DraftSnapshot | null => {
  const newer = pickNewer(fromIdb, fromLs)
  if (!newer) return null
  if (hasFileSources(newer)) return newer
  const other = newer === fromIdb ? fromLs : fromIdb
  if (!hasFileSources(other)) return newer
  return {
    ...newer,
    fileSources: other!.fileSources,
    keyOwners: other!.keyOwners ?? newer.keyOwners,
  }
}

/** Full draft load: IndexedDB (prod-scale) + localStorage migration. */
export const loadDraftAsync = async (config: GitHubConfig): Promise<DraftSnapshot | null> => {
  const key = draftStorageKey(config)
  const fromIdb = await idbGet(key)
  const fromLs = loadDraftFromLocalStorage(config)
  const draft = mergeDraftStores(fromIdb, fromLs)
  if (!draft) return null

  // Promote localStorage-only drafts into IDB so the next refresh survives quota.
  if (!fromIdb && fromLs) {
    await idbPut(key, draft)
  }
  return draft
}

const tryLocalStorageSave = (key: string, payload: DraftSnapshot): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

/** Persist draft — IndexedDB first (large repos), localStorage best-effort mirror. */
export const saveDraft = async (
  config: GitHubConfig,
  draft: Omit<DraftSnapshot, 'v' | 'savedAt'>,
): Promise<DraftSaveResult> => {
  const canonical = draftStorageKey(config)
  // Never overwrite a stored draft's fileSources with an empty map (boot race /
  // hydrate before Load) — without them commit thinks there is nothing to push.
  let fileSources = draft.fileSources
  let keyOwners = draft.keyOwners
  if (!hasFileSources({ ...draft, v: 1, savedAt: 0 } as DraftSnapshot)) {
    const existing = await idbGet(canonical) ?? loadDraftFromLocalStorage(config)
    if (hasFileSources(existing)) {
      fileSources = existing!.fileSources
      keyOwners = existing!.keyOwners ?? keyOwners
    }
  }

  const payload: DraftSnapshot = {
    v: 1,
    savedAt: Date.now(),
    ...draft,
    fileSources,
    keyOwners,
  }

  const idbOk = await idbPut(canonical, payload)
  const lsOk = tryLocalStorageSave(canonical, payload)
  if (lsOk) {
    clearLocalDraftKeys(config, true)
  } else {
    // Quota exceeded — drop LS copies so they don't block; IDB remains source of truth.
    clearLocalDraftKeys(config, false)
  }

  if (idbOk) return { ok: true, via: 'idb' }
  if (lsOk) return { ok: true, via: 'localStorage' }
  return { ok: false, reason: 'quota' }
}

/** Fire-and-forget wrapper for call sites that cannot await. */
export const saveDraftFireAndForget = (
  config: GitHubConfig,
  draft: Omit<DraftSnapshot, 'v' | 'savedAt'>,
  onResult?: (result: DraftSaveResult) => void,
): void => {
  void saveDraft(config, draft).then(result => onResult?.(result))
}

export const clearDraft = async (config: GitHubConfig): Promise<void> => {
  clearLocalDraftKeys(config, false)
  await idbDelete(draftStorageKey(config))
}

/** True when the draft has uncommitted translation, config, or schema edits. */
export const isDraftDirty = (draft: DraftSnapshot): boolean => {
  for (const lang of Object.keys(draft.translations)) {
    const current = draft.translations[lang] ?? {}
    const orig = draft.original[lang] ?? {}
    const keys = new Set([...Object.keys(current), ...Object.keys(orig)])
    for (const key of keys) {
      // New keys count as dirty even when still empty (same as getModifiedKeys).
      if (!(key in orig) || (current[key] ?? '') !== (orig[key] ?? '')) return true
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
