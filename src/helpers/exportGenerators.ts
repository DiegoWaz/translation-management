import type { ConfigMap, ConfigSchema, ConfigValue, LangFile } from '../types'
import { serializeConfigValue } from './configValues'

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

const cellText = (value: string): string => value.replace(/\t/g, ' ').replace(/\r?\n/g, ' ')

/** Escape a CSV field (RFC-style) for Excel. */
export const escapeCsvField = (value: string): string => {
  const normalized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
}

/** Spreadsheet matrix: header = key + langs, rows = one per key. */
export const buildSheetMatrix = (
  data: Record<string, Record<string, string>>,
  langs: string[],
  keys: string[],
): string[][] => {
  const header = ['key', ...langs]
  const rows = keys.map(key => [
    key,
    ...langs.map(lang => data[lang]?.[key] ?? ''),
  ])
  return [header, ...rows]
}

export const generateTsvExport = (
  data: Record<string, Record<string, string>>,
  langs: string[],
  keys: string[],
): string => {
  return buildSheetMatrix(data, langs, keys)
    .map(row => row.map(cellText).join('\t'))
    .join('\n')
}

/** UTF-8 CSV with BOM so Excel opens accents correctly. */
export const generateCsvExport = (
  data: Record<string, Record<string, string>>,
  langs: string[],
  keys: string[],
): string => {
  const body = buildSheetMatrix(data, langs, keys)
    .map(row => row.map(escapeCsvField).join(','))
    .join('\n')
  return `\uFEFF${body}`
}

export const configMapsToStringMaps = (
  configs: Record<string, ConfigMap>,
  schema: ConfigSchema,
  langs: string[],
  keys: string[],
): Record<string, Record<string, string>> => {
  return langs.reduce<Record<string, Record<string, string>>>((acc, lang) => {
    acc[lang] = keys.reduce<Record<string, string>>((row, key) => {
      const value = configs[lang]?.[key]
      const type = schema[key]
      if (type === 'json') {
        row[key] = value === undefined ? '' : serializeConfigValue(value as ConfigValue)
      } else if (type === 'number') {
        row[key] = value === undefined || value === null ? '' : String(value)
      } else {
        row[key] = typeof value === 'string' ? value : (value == null ? '' : String(value))
      }
      return row
    }, {})
    return acc
  }, {})
}

export const langCodes = (langs: string[], files: LangFile[]): string[] =>
  langs.map(lang => files.find(f => f.lang === lang)?.lang ?? lang)
