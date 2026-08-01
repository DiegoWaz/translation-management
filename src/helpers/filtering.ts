import type { FilterMode, KeyGroup, LangFile, SearchMode } from '../types'
import { missingVars } from './vars'

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
    baseKeys, activeGroup, search, searchMode, searchMatchMap,
    filter, translations, original, activeLang, varIssuesMap,
  } = opts

  return baseKeys.filter(key => {
    if (activeGroup) {
      const sep = key.includes('.') ? '.' : '_'
      if (!key.startsWith(activeGroup + sep)) return false
    }
    if (search.trim()) {
      if (searchMode === 'key') {
        if (!key.toLowerCase().includes(search.toLowerCase())) return false
      } else {
        const keyMatches = key.toLowerCase().includes(search.toLowerCase())
        const anyLangMatches = (searchMatchMap[key]?.length ?? 0) > 0
        if (!keyMatches && !anyLangMatches) return false
      }
    }
    if (filter === 'missing') return !translations[activeLang]?.[key]
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
  baseLang: string,
): Array<{ lang: string; key: string }> => {
  const modified: Array<{ lang: string; key: string }> = []
  for (const lang of Object.keys(translations)) {
    if (lang === baseLang) continue
    for (const key of Object.keys(translations[lang] ?? {})) {
      if ((translations[lang][key] ?? '') !== (original[lang]?.[key] ?? '')) {
        modified.push({ lang, key })
      }
    }
  }
  return modified
}

export const columnLayout = (isMobile: boolean, isTablet: boolean) => {
  return {
    showBase: !isMobile,
    showLastMod: !isMobile && !isTablet,
    colTemplate: isMobile ? '1fr 1fr 28px' : isTablet ? '160px 1fr 1fr 28px' : '200px 1fr 1.4fr 180px 28px',
  }
}
