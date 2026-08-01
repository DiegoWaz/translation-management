import type { LangFile } from '../types'

export const generateJsonExport = (
  translations: Record<string, Record<string, string>>,
  langs: string[],
  keys: string[],
): string => {
  const out = langs.reduce<Record<string, Record<string, string>>>((acc, lang) => {
    acc[lang] = keys.reduce<Record<string, string>>((keysAcc, k) => {
      keysAcc[k] = translations[lang]?.[k] ?? ''
      return keysAcc
    }, {})
    return acc
  }, {})
  return JSON.stringify(out, null, 2)
}

export const generateTsvExport = (
  translations: Record<string, Record<string, string>>,
  langs: string[],
  keys: string[],
  configFiles: LangFile[],
): string => {
  const headerRow = ['', ...keys].join('\t')
  const dataRows = langs.map(lang => {
    const code = (configFiles.find(f => f.lang === lang)?.lang ?? lang).toUpperCase()
    return [code, ...keys.map(k => (translations[lang]?.[k] ?? '').replace(/\t/g, ' '))].join('\t')
  })
  return [headerRow, ...dataRows].join('\n')
}
