import type { FilterMode, KeyGroup, LangFile, SearchMode } from '../types'
import { missingVars } from './vars'

export const collectTranslationKeys = (
  translations: Record<string, Record<string, string>>,
  original: Record<string, Record<string, string>>,
  langs: string[],
  baseLang: string,
): string[] => {
  const keys = new Set<string>()
  for (const lang of langs) {
    Object.keys(translations[lang] ?? {}).forEach(k => keys.add(k))
    Object.keys(original[lang] ?? {}).forEach(k => keys.add(k))
  }
  const order = [
    ...Object.keys(original[baseLang] ?? {}),
    ...Object.keys(translations[baseLang] ?? {}),
  ]
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const key of order) {
    if (keys.has(key) && !seen.has(key)) {
      seen.add(key)
      ordered.push(key)
    }
  }
  for (const key of [...keys].sort((a, b) => a.localeCompare(b))) {
    if (!seen.has(key)) ordered.push(key)
  }
  return ordered
}

export const buildSearchMatchMap = (
  search: string,
  baseKeys: string[],
  allLangs: string[],
  translations: Record<string, Record<string, string>>,
): Record<string, string[]> => {
  if (!search.trim()) return {}
  const q = search.toLowerCase()
  return baseKeys.reduce<Record<string, string[]>>((result, key) => {
    result[key] = allLangs.filter(lang => (translations[lang]?.[key] ?? '').toLowerCase().includes(q))
    return result
  }, {})
}

export const buildVarIssuesMap = (
  varValidation: boolean,
  baseKeys: string[],
  translations: Record<string, Record<string, string>>,
  baseLang: string,
  activeLang: string,
): Record<string, string[]> => {
  if (!varValidation) return {}
  return baseKeys.reduce<Record<string, string[]>>((result, key) => {
    const missing = missingVars(translations[baseLang]?.[key] ?? '', translations[activeLang]?.[key] ?? '')
    if (missing.length > 0) result[key] = missing
    return result
  }, {})
}

export const buildKeyGroups = (baseKeys: string[]): KeyGroup[] => {
  const counts = baseKeys.reduce<Record<string, number>>((acc, key) => {
    const sep = key.includes('.') ? '.' : key.includes('_') ? '_' : null
    if (!sep) return acc
    const prefix = key.slice(0, key.indexOf(sep))
    if (prefix) acc[prefix] = (acc[prefix] ?? 0) + 1
    return acc
  }, {})
  return Object.entries(counts)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }))
}

/** Prefix for a new key under the active group tab (e.g. `common.`). */
export const groupKeyPrefix = (group: string | null, sampleKeys: string[]): string => {
  if (!group) return ''
  if (sampleKeys.some(k => k.startsWith(`${group}.`))) return `${group}.`
  if (sampleKeys.some(k => k.startsWith(`${group}_`))) return `${group}_`
  return `${group}.`
}

export const filterKeys = (opts: {
  baseKeys: string[]
  activeGroup: string | null
  search: string
  searchMode: SearchMode
  searchMatchMap: Record<string, string[]>
  filter: FilterMode
  translations: Record<string, Record<string, string>>
  original: Record<string, Record<string, string>>
  activeLang: string
  varIssuesMap: Record<string, string[]>
}): string[] => {
  const {
    baseKeys, activeGroup, search, searchMatchMap,
    filter, translations, original, activeLang, varIssuesMap,
  } = opts

  return baseKeys.filter(key => {
    if (activeGroup) {
      const sep = key.includes('.') ? '.' : '_'
      if (!key.startsWith(activeGroup + sep)) return false
    }
    // Both table layouts search key names and values across all locales.
    if (search.trim()) {
      const q = search.toLowerCase()
      const keyMatches = key.toLowerCase().includes(q)
      const anyLangMatches = (searchMatchMap[key]?.length ?? 0) > 0
      if (!keyMatches && !anyLangMatches) return false
    }
    if (filter === 'missing') return !original[activeLang]?.[key]
    if (filter === 'modified') return (translations[activeLang]?.[key] ?? '') !== (original[activeLang]?.[key] ?? '')
    if (filter === 'var-issues') return Boolean(varIssuesMap[key])
    return true
  })
}

export const buildLangStats = (
  files: LangFile[],
  baseKeys: string[],
  translations: Record<string, Record<string, string>>,
  original: Record<string, Record<string, string>>,
) => {
  return files.map(f => ({
    ...f,
    total: baseKeys.length,
    filled: baseKeys.filter(k => translations[f.lang]?.[k]).length,
    modified: baseKeys.filter(k => (translations[f.lang]?.[k] ?? '') !== (original[f.lang]?.[k] ?? '')).length,
  }))
}

export const getModifiedKeys = (
  translations: Record<string, Record<string, string>>,
  original: Record<string, Record<string, string>>,
  _baseLang: string,
): Array<{ lang: string; key: string }> => {
  const modified: Array<{ lang: string; key: string }> = []
  for (const lang of Object.keys(translations)) {
    for (const key of Object.keys(translations[lang] ?? {})) {
      // A brand-new key (not present in the original file yet) must always be
      // committed for every locale, even if its value is still empty —
      // otherwise locales left untouched by the user never get the key added.
      const isNewKey = !(key in (original[lang] ?? {}))
      if (isNewKey || (translations[lang][key] ?? '') !== (original[lang]?.[key] ?? '')) {
        modified.push({ lang, key })
      }
    }
    // Keys removed from a locale vs original
    for (const key of Object.keys(original[lang] ?? {})) {
      if (!(key in (translations[lang] ?? {}))) {
        modified.push({ lang, key })
      }
    }
  }
  return modified
}

export const columnLayout = (
  isMobile: boolean,
  isTablet: boolean,
  widths: { key: number; base: number; target: number; lastMod: number },
) => {
  const showBase = !isMobile
  const showLastMod = !isMobile && !isTablet
  const parts = [`${widths.key}px`]
  if (showBase) parts.push(`${widths.base}px`)
  if (isMobile) {
    return {
      showBase,
      showLastMod,
      colTemplate: `${widths.key}px 1fr 28px`,
      keyModeColTemplate: '1fr 24px',
    }
  }
  parts.push(`${widths.target}px`)
  if (showLastMod) parts.push(`${widths.lastMod}px`)
  parts.push('28px')
  return {
    showBase,
    showLastMod,
    colTemplate: parts.join(' '),
    keyModeColTemplate: `${widths.key}px 1fr 24px`,
  }
}
