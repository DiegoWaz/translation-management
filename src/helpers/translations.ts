import type { ParsedImport } from '../types'
import { resolveLocaleCode } from './lang'

type TranslationMap = Record<string, Record<string, string>>

export const addKeyToAll = (prev: TranslationMap, key: string): TranslationMap => {
  return Object.keys(prev).reduce<TranslationMap>((next, lang) => {
    // Only fill in the key with '' where it's genuinely missing — never
    // overwrite an existing value in a language that already has one.
    next[lang] = key in prev[lang] ? prev[lang] : { ...prev[lang], [key]: '' }
    return next
  }, { ...prev })
}

/** Copy all locale values from `sourceKey` onto a new `newKey` (source kept). */
export const duplicateKeyInAll = (
  prev: TranslationMap,
  sourceKey: string,
  newKey: string,
): TranslationMap => {
  return Object.keys(prev).reduce<TranslationMap>((next, lang) => {
    const map = prev[lang] ?? {}
    next[lang] = { ...map, [newKey]: map[sourceKey] ?? '' }
    return next
  }, { ...prev })
}

export const removeKeyFromAll = (prev: TranslationMap, key: string): TranslationMap => {
  return Object.keys(prev).reduce<TranslationMap>((next, lang) => {
    const copy = { ...prev[lang] }
    delete copy[key]
    next[lang] = copy
    return next
  }, { ...prev })
}

/** Rename a key across every locale, preserving its position and value. */
export const renameKeyInAll = (prev: TranslationMap, oldKey: string, newKey: string): TranslationMap => {
  return Object.keys(prev).reduce<TranslationMap>((next, lang) => {
    const entries = Object.entries(prev[lang] ?? {})
    next[lang] = entries.reduce<Record<string, string>>((acc, [k, v]) => {
      acc[k === oldKey ? newKey : k] = v
      return acc
    }, {})
    return next
  }, { ...prev })
}

export const applyBulkAssignments = (
  prev: TranslationMap,
  assignments: Array<{ paragraphIndex: number; key: string }>,
  parsed: ParsedImport[],
): { next: TranslationMap; count: number } => {
  let count = 0
  const next = { ...prev }
  for (const { paragraphIndex, key } of assignments) {
    if (!key) continue
    for (const { localeCode, paragraphs } of parsed) {
      const lang = resolveLocaleCode(localeCode)
      const value = paragraphs[paragraphIndex]
      if (value === undefined) continue
      next[lang] = { ...(next[lang] ?? {}), [key]: value }
      count++
    }
  }
  return { next, count }
}

export const mergeTranslationMaps = (
  prev: TranslationMap,
  data: Record<string, Record<string, string>>,
): { next: TranslationMap; count: number } => {
  let count = 0
  const next = { ...prev }
  for (const [lang, keys] of Object.entries(data)) {
    next[lang] = { ...(next[lang] ?? {}), ...keys }
    count += Object.keys(keys).length
  }
  return { next, count }
}

export const cloneTranslations = (map: TranslationMap): TranslationMap => {
  return JSON.parse(JSON.stringify(map)) as TranslationMap
}
