import type { DuplicateKeyWarning, FileSource, StaleLangConflict, StaleSourceConflict } from '../types'
import { flattenJson, isNestedJson, unflattenJson } from './flattenJson'
import { prepareCommitContent } from './github'

/** Per-locale map: translation key → index in `fileSources[lang]`. */
export type KeyOwnerMap = Record<string, Record<string, number>>

/** True when at least one locale has a tracked source file path. */
export const hasUsableFileSources = (
  fileSources?: Record<string, FileSource[]> | null,
): boolean =>
  Boolean(fileSources && Object.values(fileSources).some(sources => (sources?.length ?? 0) > 0))

/** Pick the source file that should own a key (multi-folder repos). */
export const resolveKeySourceIndex = (
  sources: FileSource[],
  key: string,
  keyOwners?: Record<string, number>,
): number => {
  if (sources.length <= 1) return 0
  if (keyOwners && keyOwners[key] !== undefined) return keyOwners[key]

  const ns = key.split('.')[0].toLowerCase()

  for (let i = 0; i < sources.length; i++) {
    const segments = sources[i].path.toLowerCase().split('/')
    if (segments.some(seg => seg === ns || seg === `${ns}.json`)) return i
  }

  let bestIdx = 0
  let bestCount = -1
  sources.forEach((source, idx) => {
    const count = Object.keys(source.originalFlat).filter(
      k => k.split('.')[0].toLowerCase() === ns,
    ).length
    if (count > bestCount) {
      bestCount = count
      bestIdx = idx
    }
  })
  if (bestCount > 0) return bestIdx

  let commonIdx = 0
  let commonCount = -1
  sources.forEach((source, idx) => {
    const count = Object.keys(source.originalFlat).filter(
      k => k.split('.')[0].toLowerCase() === 'common',
    ).length
    if (count > commonCount) {
      commonCount = count
      commonIdx = idx
    }
  })
  if (ns === 'common' && commonCount > 0) return commonIdx
  if (commonCount > 0) return commonIdx

  return 0
}

export const buildKeyOwnersFromSources = (
  fileSources: Record<string, FileSource[]>,
): KeyOwnerMap => {
  const result: KeyOwnerMap = {}
  for (const [lang, sources] of Object.entries(fileSources)) {
    const owners: Record<string, number> = {}
    sources.forEach((source, idx) => {
      for (const key of Object.keys(source.originalFlat)) {
        if (owners[key] === undefined) owners[key] = idx
      }
    })
    result[lang] = owners
  }
  return result
}

export const splitFlatByFileSources = (
  sources: FileSource[],
  currentFlat: Record<string, string>,
  keyOwners?: Record<string, number>,
): Record<string, string>[] => {
  const perSource: Record<string, string>[] = sources.map(() => ({}))
  if (sources.length === 0) return perSource
  if (sources.length === 1) {
    perSource[0] = { ...currentFlat }
    return perSource
  }

  for (const [key, value] of Object.entries(currentFlat)) {
    const idx = resolveKeySourceIndex(sources, key, keyOwners)
    perSource[idx][key] = value
  }
  return perSource
}

/** Build a minimal FileSource when a draft restored translations without fileSources. */
export const synthesizeFileSource = (
  path: string,
  originalFlat: Record<string, string>,
  sha = '',
): FileSource => {
  const rawContent = unflattenJson(originalFlat)
  return {
    path,
    sha,
    nested: isNestedJson(rawContent) || Object.keys(originalFlat).some(k => k.includes('.')),
    originalFlat: { ...originalFlat },
    rawContent,
  }
}

/** True when two flats differ (missing key ≠ empty string for presence of new keys). */
export const flatsDiffer = (
  current: Record<string, string>,
  baseline: Record<string, string>,
): boolean => {
  for (const key of Object.keys(current)) {
    if (!(key in baseline) || (current[key] ?? '') !== (baseline[key] ?? '')) return true
  }
  for (const key of Object.keys(baseline)) {
    if (!(key in current)) return true
  }
  return false
}

/**
 * Build the flat map to commit for one source file.
 *
 * CRITICAL: start from `source.originalFlat` and overlay the working copy.
 * Never commit a "only touched keys" map — `applyChangesToNested` deletes any
 * original key missing from currentFlat, which wiped entire locale files.
 *
 * Intentional deletes: key was in the session merged original and is gone from
 * the working copy. Keys missing from an incomplete working copy are preserved.
 */
export const buildSourceFlatForCommit = (
  source: FileSource,
  sourceIndex: number,
  sources: FileSource[],
  currentLangFlat: Record<string, string>,
  sessionOriginalLangFlat: Record<string, string>,
  keyOwners?: Record<string, number>,
): Record<string, string> => {
  const owns = (key: string) => resolveKeySourceIndex(sources, key, keyOwners) === sourceIndex
  const next: Record<string, string> = {}

  for (const [key, value] of Object.entries(source.originalFlat)) {
    if (!owns(key)) continue
    // Loaded in this session and removed from the working copy → delete.
    if (!(key in currentLangFlat) && key in sessionOriginalLangFlat) continue
    next[key] = key in currentLangFlat ? currentLangFlat[key] : value
  }

  for (const [key, value] of Object.entries(currentLangFlat)) {
    if (!owns(key)) continue
    if (!(key in next)) next[key] = value
  }

  return next
}

/** Sync nested `rawContent` + `originalFlat` after a successful commit. */
export const refreshFileSourceAfterCommit = (
  source: FileSource,
  sourceFlat: Record<string, string>,
): FileSource => {
  const rawContent = prepareCommitContent(
    sourceFlat,
    source.nested,
    source.originalFlat,
    source.rawContent,
  )

  return {
    ...source,
    originalFlat: { ...sourceFlat },
    rawContent: structuredClone(rawContent),
    nested: true,
  }
}

export const detectDuplicateKeys = (
  fileSources: Record<string, FileSource[]>,
): DuplicateKeyWarning[] => {
  const warnings: DuplicateKeyWarning[] = []

  for (const [lang, sources] of Object.entries(fileSources)) {
    if (sources.length < 2) continue

    const keyEntries = new Map<string, Array<{ path: string; value: string }>>()
    for (const source of sources) {
      for (const [key, value] of Object.entries(source.originalFlat)) {
        const entries = keyEntries.get(key) ?? []
        if (!entries.some(e => e.path === source.path)) {
          entries.push({ path: source.path, value })
        }
        keyEntries.set(key, entries)
      }
    }

    for (const [key, entries] of keyEntries) {
      if (entries.length > 1) warnings.push({ lang, key, entries })
    }
  }

  return warnings.sort((a, b) => a.key.localeCompare(b.key))
}

const diffSourceFlats = (
  localFlat: Record<string, string>,
  remoteFlat: Record<string, string>,
): StaleSourceConflict['changedKeys'] => {
  const keys = new Set([...Object.keys(localFlat), ...Object.keys(remoteFlat)])
  const changed: StaleSourceConflict['changedKeys'] = []
  for (const key of keys) {
    const local = localFlat[key] ?? ''
    const remote = remoteFlat[key] ?? ''
    if (local !== remote) changed.push({ key, local, remote })
  }
  return changed.sort((a, b) => a.key.localeCompare(b.key))
}

/** Build per-file diffs between local state and freshly fetched remote files. */
export const buildStaleLangConflicts = (
  fileSources: Record<string, FileSource[]>,
  translations: Record<string, Record<string, string>>,
  keyOwners: KeyOwnerMap,
  remoteByLang: Record<string, Array<{
    path: string
    sha: string
    flat: Record<string, string>
    raw: Record<string, unknown>
    nested: boolean
  }>>,
): StaleLangConflict[] => {
  const conflicts: StaleLangConflict[] = []

  for (const [lang, remoteSources] of Object.entries(remoteByLang)) {
    const localSources = fileSources[lang] ?? []
    if (localSources.length === 0) continue

    const langFlat = translations[lang] ?? {}
    const perSourceLocal = splitFlatByFileSources(localSources, langFlat, keyOwners[lang])

    const sourceConflicts: StaleSourceConflict[] = []
    remoteSources.forEach((remote, sourceIdx) => {
      const localSource = localSources.find(s => s.path === remote.path)
      if (!localSource) return
      const idx = localSources.indexOf(localSource)
      const changedKeys = diffSourceFlats(perSourceLocal[idx] ?? {}, remote.flat)
      if (changedKeys.length === 0) return

      sourceConflicts.push({
        path: remote.path,
        sourceIdx: idx,
        localSha: localSource.sha,
        remoteSha: remote.sha,
        remoteFlat: remote.flat,
        remoteRaw: remote.raw,
        remoteNested: remote.nested,
        changedKeys,
      })
    })

    if (sourceConflicts.length > 0) {
      conflicts.push({ lang, sources: sourceConflicts })
    }
  }

  return conflicts
}

/** Apply per-key stale resolutions onto translations + file sources. */
export const applyStaleResolutions = (
  conflict: StaleLangConflict,
  sources: FileSource[],
  langFlat: Record<string, string>,
  keyOwners: Record<string, number> | undefined,
  resolutions: Record<string, 'local' | 'remote'>,
): { translations: Record<string, string>; sources: FileSource[] } => {
  const nextFlat = { ...langFlat }
  const nextSources = sources.map(s => ({ ...s }))

  for (const sourceConflict of conflict.sources) {
    for (const { key, remote } of sourceConflict.changedKeys) {
      if ((resolutions[key] ?? 'remote') === 'remote') nextFlat[key] = remote
    }
  }

  for (const sourceConflict of conflict.sources) {
    const idx = sourceConflict.sourceIdx
    // Re-baseline from the remote tip, then overlay the resolved working copy —
    // never feed a split-only subset into refreshFileSourceAfterCommit (wipe).
    const remoteSource: FileSource = {
      ...nextSources[idx],
      sha: sourceConflict.remoteSha,
      nested: sourceConflict.remoteNested,
      originalFlat: remoteFlatFromRaw(sourceConflict.remoteRaw, sourceConflict.remoteNested),
      rawContent: structuredClone(sourceConflict.remoteRaw),
    }
    const sourceFlat = buildSourceFlatForCommit(
      remoteSource,
      idx,
      nextSources,
      nextFlat,
      langFlat,
      keyOwners,
    )
    nextSources[idx] = refreshFileSourceAfterCommit(remoteSource, sourceFlat)
  }

  return { translations: nextFlat, sources: nextSources }
}

export const remoteFlatFromRaw = (raw: Record<string, unknown>, nested: boolean): Record<string, string> =>
  nested ? flattenJson(raw) : (raw as Record<string, string>)
