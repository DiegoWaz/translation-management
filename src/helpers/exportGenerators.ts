import JSZip from 'jszip'
import type { ConfigMap, ConfigSchema, ConfigValue, LangFile } from '../types'
import { serializeConfigValue } from './configValues'

/** Set a value at a dot-separated path inside a nested object. */
const setNestedValue = (obj: Record<string, unknown>, path: string[], value: string): void => {
  let current = obj
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i]
    if (!(segment in current) || typeof current[segment] !== 'object' || current[segment] === null) {
      current[segment] = {}
    }
    current = current[segment] as Record<string, unknown>
  }
  current[path[path.length - 1]] = value
}

/** JSON export — keys are converted to a nested object structure. */
export const generateJsonExport = (
  translations: Record<string, Record<string, string>>,
  langs: string[],
  keys: string[],
): string => {
  const out: Record<string, Record<string, unknown>> = {}
  for (const lang of langs) {
    const nested: Record<string, unknown> = {}
    for (const k of keys) {
      const segments = k.split('.')
      setNestedValue(nested, segments, translations[lang]?.[k] ?? '')
    }
    out[lang] = nested
  }
  return JSON.stringify(out, null, 2)
}

/** Build namespace-split nested objects: { namespace → { lang → nested rest-of-key } }. */
export const buildNamespaceBuckets = (
  translations: Record<string, Record<string, string>>,
  langs: string[],
  keys: string[],
): Record<string, Record<string, Record<string, unknown>>> => {
  const buckets: Record<string, Record<string, Record<string, unknown>>> = {}
  for (const k of keys) {
    const dotIdx = k.indexOf('.')
    const ns = dotIdx === -1 ? 'default' : k.slice(0, dotIdx)
    const rest = dotIdx === -1 ? [k] : k.slice(dotIdx + 1).split('.')
    if (!buckets[ns]) buckets[ns] = {}
    for (const lang of langs) {
      if (!buckets[ns][lang]) buckets[ns][lang] = {}
      setNestedValue(buckets[ns][lang], rest, translations[lang]?.[k] ?? '')
    }
  }
  return buckets
}

/** Preview string for namespace-split export (not downloadable as-is). */
export const generateNamespacedJsonPreview = (
  translations: Record<string, Record<string, string>>,
  langs: string[],
  keys: string[],
): string => {
  const buckets = buildNamespaceBuckets(translations, langs, keys)
  const preview: Record<string, Record<string, unknown>> = {}
  for (const [ns, langMap] of Object.entries(buckets)) {
    for (const [lang, nested] of Object.entries(langMap)) {
      const path = `locales/${ns}/${lang}.json`
      preview[path] = nested
    }
  }
  return JSON.stringify(preview, null, 2)
}

/** Generate a ZIP blob with namespace-split JSON files. */
export const generateNamespacedZip = async (
  translations: Record<string, Record<string, string>>,
  langs: string[],
  keys: string[],
): Promise<Blob> => {
  const buckets = buildNamespaceBuckets(translations, langs, keys)
  const zip = new JSZip()
  for (const [ns, langMap] of Object.entries(buckets)) {
    for (const [lang, nested] of Object.entries(langMap)) {
      zip.file(`locales/${ns}/${lang}.json`, JSON.stringify(nested, null, 2) + '\n')
    }
  }
  return zip.generateAsync({ type: 'blob' })
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
