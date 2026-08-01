import type { ConfigMap, ConfigSchema, ConfigValue, ConfigValueType } from '../types'
import {
  isCamelCaseConfigKey,
  isValidConfigType,
  normalizeSchema,
} from './configValues'
import { resolveLocaleCode } from './lang'

export type ConfigImportPayload = {
  schemaPatch: ConfigSchema
  locales: Record<string, ConfigMap>
  warnings: string[]
}

export type ConfigImportMergeResult = {
  schema: ConfigSchema
  configs: Record<string, ConfigMap>
  /** Number of locale×key values written */
  valueCount: number
  /** New schema keys added */
  keysAdded: number
  langsTouched: string[]
  skippedKeys: string[]
  skippedLangs: string[]
}

export const inferConfigType = (value: unknown): ConfigValueType => {
  if (typeof value === 'number' && !Number.isNaN(value)) return 'number'
  if (typeof value === 'string') return 'text'
  return 'json'
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

/** Match a file name / path to a known locale code. */
export const resolveLangFromFilename = (
  filename: string,
  knownLangs: string[],
): string | null => {
  const base = filename.split(/[/\\]/).pop() ?? filename
  const stem = base.replace(/\.json$/i, '')
  const normalizedStem = resolveLocaleCode(stem)
  const direct = knownLangs.find(l => l === normalizedStem || l.toLowerCase() === stem.toLowerCase())
  if (direct) return direct

  // Prefer longest match so en-UK wins over en
  const sorted = [...knownLangs].sort((a, b) => b.length - a.length)
  for (const lang of sorted) {
    const re = new RegExp(`(?:^|[^a-z0-9])${lang.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^a-z0-9]|$)`, 'i')
    if (re.test(base) || re.test(stem)) return lang
  }
  return null
}

const coerceValue = (raw: unknown, type: ConfigValueType): ConfigValue | undefined => {
  if (raw === undefined) return undefined
  if (type === 'number') {
    if (typeof raw === 'number' && !Number.isNaN(raw)) return raw
    if (typeof raw === 'string' && raw.trim() !== '') {
      const n = Number(raw)
      if (!Number.isNaN(n)) return n
    }
    return undefined
  }
  if (type === 'text') {
    if (typeof raw === 'string') return raw
    if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw)
    try {
      return JSON.stringify(raw)
    } catch {
      return String(raw)
    }
  }
  // json
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return {}
    try {
      return JSON.parse(trimmed) as ConfigValue
    } catch {
      return raw
    }
  }
  return raw as ConfigValue
}

const mapFromUnknown = (raw: unknown): Record<string, unknown> => {
  if (!isPlainObject(raw)) return {}
  return raw
}

/**
 * Parse multi-locale config JSON.
 * Accepted shapes:
 * - { "en-UK": { key: value }, "fr-FR": { … } }
 * - { "schema": { key: "text" }, "en-UK": { … } }
 * - { "schema": { … }, "locales": { "en-UK": { … } } }
 */
export const parseConfigImportJson = (
  text: string,
  knownLangs: string[],
): { ok: true; payload: ConfigImportPayload } | { ok: false; error: string } => {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
  if (!isPlainObject(parsed)) {
    return { ok: false, error: 'root_not_object' }
  }

  const warnings: string[] = []
  let schemaPatch: ConfigSchema = {}
  let localeSource: Record<string, unknown> = parsed

  if (isPlainObject(parsed.schema)) {
    schemaPatch = normalizeSchema(parsed.schema)
    if (isPlainObject(parsed.locales)) {
      localeSource = parsed.locales
    } else {
      const { schema: _s, locales: _l, ...rest } = parsed
      localeSource = rest
    }
  } else if (isPlainObject(parsed.locales) && !knownLangs.some(l => l in parsed)) {
    localeSource = parsed.locales
  }

  const locales: Record<string, ConfigMap> = {}
  const knownSet = new Set(knownLangs)

  for (const [rawLang, rawMap] of Object.entries(localeSource)) {
    if (rawLang === 'schema' || rawLang === 'locales') continue
    const lang = resolveLocaleCode(rawLang)
    const matched = knownLangs.find(l => l === lang || l.toLowerCase() === rawLang.toLowerCase())
    if (!matched) {
      warnings.push(`unknown_lang:${rawLang}`)
      continue
    }
    if (!knownSet.has(matched)) continue
    const entries = mapFromUnknown(rawMap)
    const map: ConfigMap = {}
    for (const [key, value] of Object.entries(entries)) {
      if (!key.trim()) continue
      map[key] = value as ConfigValue
    }
    locales[matched] = { ...(locales[matched] ?? {}), ...map }
  }

  if (Object.keys(locales).length === 0 && Object.keys(schemaPatch).length === 0) {
    return { ok: false, error: 'no_locales' }
  }

  return { ok: true, payload: { schemaPatch, locales, warnings } }
}

export const payloadFromLocaleFiles = (
  files: Array<{ name: string; text: string }>,
  knownLangs: string[],
): { ok: true; payload: ConfigImportPayload } | { ok: false; error: string } => {
  const locales: Record<string, ConfigMap> = {}
  const warnings: string[] = []
  let schemaPatch: ConfigSchema = {}

  for (const file of files) {
    let parsed: unknown
    try {
      parsed = JSON.parse(file.text)
    } catch {
      warnings.push(`invalid_json:${file.name}`)
      continue
    }

    // Whole multi-locale blob in one of the files
    if (isPlainObject(parsed) && (
      isPlainObject(parsed.schema)
      || isPlainObject(parsed.locales)
      || knownLangs.some(l => l in parsed)
    )) {
      const nested = parseConfigImportJson(file.text, knownLangs)
      if (nested.ok) {
        schemaPatch = { ...schemaPatch, ...nested.payload.schemaPatch }
        for (const [lang, map] of Object.entries(nested.payload.locales)) {
          locales[lang] = { ...(locales[lang] ?? {}), ...map }
        }
        warnings.push(...nested.payload.warnings)
        continue
      }
    }

    const lang = resolveLangFromFilename(file.name, knownLangs)
    if (!lang) {
      warnings.push(`unmatched_file:${file.name}`)
      continue
    }
    if (!isPlainObject(parsed)) {
      warnings.push(`invalid_map:${file.name}`)
      continue
    }
    // Single-locale file may be the map itself, or { schema, ...values }
    let mapRaw = parsed
    if (isPlainObject(parsed.schema)) {
      schemaPatch = { ...schemaPatch, ...normalizeSchema(parsed.schema) }
      const { schema: _s, ...rest } = parsed
      mapRaw = rest
    }
    const map: ConfigMap = {}
    for (const [key, value] of Object.entries(mapFromUnknown(mapRaw))) {
      if (key === 'schema' || key === 'locales') continue
      map[key] = value as ConfigValue
    }
    locales[lang] = { ...(locales[lang] ?? {}), ...map }
  }

  if (Object.keys(locales).length === 0 && Object.keys(schemaPatch).length === 0) {
    return { ok: false, error: 'no_locales' }
  }
  return { ok: true, payload: { schemaPatch, locales, warnings } }
}

export const mergeConfigImport = (
  schema: ConfigSchema,
  configs: Record<string, ConfigMap>,
  payload: ConfigImportPayload,
  opts: { addMissingKeys: boolean; knownLangs: string[] },
): ConfigImportMergeResult => {
  let nextSchema: ConfigSchema = { ...schema, ...payload.schemaPatch }
  const skippedKeys: string[] = []
  const skippedLangs: string[] = []
  let keysAdded = 0
  let valueCount = 0
  const langsTouched = new Set<string>()

  // Infer / register keys from locale payloads
  const allKeys = new Set<string>()
  for (const map of Object.values(payload.locales)) {
    for (const key of Object.keys(map)) allKeys.add(key)
  }
  for (const key of Object.keys(payload.schemaPatch)) allKeys.add(key)

  for (const key of allKeys) {
    if (nextSchema[key]) continue
    if (!opts.addMissingKeys) {
      skippedKeys.push(key)
      continue
    }
    if (!isCamelCaseConfigKey(key)) {
      skippedKeys.push(key)
      continue
    }
    // Prefer explicit schema patch type, else infer from first seen value
    let type: ConfigValueType | undefined = payload.schemaPatch[key]
    if (!type || !isValidConfigType(type)) {
      for (const map of Object.values(payload.locales)) {
        if (key in map) {
          type = inferConfigType(map[key])
          break
        }
      }
    }
    type = type ?? 'text'
    nextSchema = { ...nextSchema, [key]: type }
    keysAdded++
  }

  const nextConfigs: Record<string, ConfigMap> = { ...configs }
  for (const lang of opts.knownLangs) {
    nextConfigs[lang] = { ...(configs[lang] ?? {}) }
  }

  for (const [lang, map] of Object.entries(payload.locales)) {
    if (!opts.knownLangs.includes(lang)) {
      skippedLangs.push(lang)
      continue
    }
    const target = { ...(nextConfigs[lang] ?? {}) }
    let touched = false
    for (const [key, raw] of Object.entries(map)) {
      const type = nextSchema[key]
      if (!type) continue
      const coerced = coerceValue(raw, type)
      if (coerced === undefined) continue
      target[key] = coerced
      valueCount++
      touched = true
    }
    if (touched) {
      nextConfigs[lang] = target
      langsTouched.add(lang)
    }
  }

  return {
    schema: nextSchema,
    configs: nextConfigs,
    valueCount,
    keysAdded,
    langsTouched: [...langsTouched],
    skippedKeys: [...new Set(skippedKeys)],
    skippedLangs: [...new Set(skippedLangs)],
  }
}
