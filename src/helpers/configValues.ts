import type { ConfigMap, ConfigSchema, ConfigValue, ConfigValueType } from '../types'

export const CONFIG_VALUE_TYPES: ConfigValueType[] = ['text', 'number', 'json']

export const defaultConfigValue = (type: ConfigValueType): ConfigValue => {
  switch (type) {
    case 'text': return ''
    case 'number': return 0
    case 'json': return {}
  }
}

export const isValidConfigType = (value: unknown): value is ConfigValueType =>
  value === 'text' || value === 'number' || value === 'json'

/** Top-level config keys must be camelCase (e.g. featureMaxItems). */
export const isCamelCaseConfigKey = (key: string): boolean =>
  /^[a-z][a-zA-Z0-9]*$/.test(key)

export const normalizeSchema = (raw: unknown): ConfigSchema => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const schema: ConfigSchema = {}
  for (const [key, type] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof key === 'string' && key.trim() && isValidConfigType(type)) {
      schema[key] = type
    }
  }
  return schema
}

export const normalizeConfigMap = (raw: unknown, schema: ConfigSchema): ConfigMap => {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {}
  const map: ConfigMap = {}
  // Keys are optional per locale: only keep values present in the file.
  for (const key of Object.keys(schema)) {
    if (key in source) map[key] = source[key] as ConfigValue
  }
  return map
}

/** Whether the key is defined on this locale (absent ≠ error). */
export const hasConfigKey = (map: ConfigMap | undefined, key: string): boolean =>
  Boolean(map) && Object.prototype.hasOwnProperty.call(map, key)

export const valuesEqual = (a: ConfigValue | undefined, b: ConfigValue | undefined): boolean => {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

export const isConfigValueFilled = (value: ConfigValue | undefined, type: ConfigValueType): boolean => {
  if (value === undefined || value === null) return false
  if (type === 'text') return String(value).trim() !== ''
  if (type === 'number') return typeof value === 'number' && !Number.isNaN(value)
  if (type === 'json') {
    if (typeof value === 'object') return true
    return false
  }
  return true
}

export const serializeConfigValue = (value: ConfigValue | undefined): string => {
  if (value === undefined) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 4)
  } catch {
    return String(value)
  }
}

export const displayConfigValue = (value: ConfigValue | undefined): string => {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

export const parseJsonConfigValue = (raw: string): { ok: true; value: ConfigValue } | { ok: false; error: string } => {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: true, value: {} }
  try {
    return { ok: true, value: JSON.parse(trimmed) as ConfigValue }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/** Build an empty skeleton matching the base locale shape (strings → "", numbers → 0, etc.). */
export const scaffoldFromBase = (base: ConfigValue): ConfigValue => {
  if (Array.isArray(base)) {
    return base.map(item => scaffoldFromBase(item))
  }
  if (base !== null && typeof base === 'object') {
    return Object.fromEntries(
      Object.entries(base).map(([key, value]) => [key, scaffoldFromBase(value)]),
    )
  }
  if (typeof base === 'string') return ''
  if (typeof base === 'number') return 0
  if (typeof base === 'boolean') return false
  return null
}

const typeLabel = (value: ConfigValue): string => {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

const isPlainObject = (value: ConfigValue): value is { [key: string]: ConfigValue } =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

/** Deep-merge shapes so array items with different optional fields share one prototype. */
export const mergeShapes = (a: ConfigValue, b: ConfigValue): ConfigValue => {
  if (Array.isArray(a) && Array.isArray(b)) {
    const items = [...a, ...b]
    if (items.length === 0) return []
    return [items.reduce((acc, item) => mergeShapes(acc, item))]
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    const out: { [key: string]: ConfigValue } = {}
    for (const key of keys) {
      if (key in a && key in b) out[key] = mergeShapes(a[key], b[key])
      else out[key] = key in a ? a[key] : b[key]
    }
    return out
  }
  return a
}

const arrayItemPrototype = (base: ConfigValue[]): ConfigValue | undefined => {
  if (base.length === 0) return undefined
  return base.reduce((acc, item) => mergeShapes(acc, item))
}

/**
 * Soft structural check vs base locale:
 * - missing fields/keys are allowed (optional)
 * - extra keys are allowed (optional extensions)
 * - only type mismatches on paths present in both sides are errors
 * - array items use a merged prototype of all base items (heterogeneous optional fields)
 */
export const validateJsonAgainstBase = (
  base: ConfigValue | undefined,
  value: ConfigValue | undefined,
  path = '',
): string[] => {
  if (base === undefined) return []
  if (value === undefined || value === null) return [] // omitted / optional

  if (Array.isArray(base)) {
    if (!Array.isArray(value)) {
      return [`${path || 'root'}: expected array, got ${typeLabel(value)}`]
    }
    const proto = arrayItemPrototype(base)
    if (proto === undefined) return []
    return value.flatMap((item, i) =>
      validateJsonAgainstBase(proto, item, `${path || 'root'}[${i}]`),
    )
  }

  if (isPlainObject(base)) {
    if (!isPlainObject(value)) {
      return [`${path || 'root'}: expected object, got ${typeLabel(value)}`]
    }
    const errors: string[] = []
    for (const key of Object.keys(value)) {
      // Extra keys are allowed. Only recurse when the key also exists on base.
      if (key in base) {
        errors.push(
          ...validateJsonAgainstBase(
            base[key],
            value[key],
            path ? `${path}.${key}` : key,
          ),
        )
      }
    }
    // Missing base keys are optional → ok
    return errors
  }

  if (typeof base !== typeof value) {
    return [`${path || 'root'}: expected ${typeof base}, got ${typeof value}`]
  }
  return []
}

/** Pretty-print an empty scaffold cloned from the base locale shape. */
export const formatJsonLikeBase = (
  _value: ConfigValue | undefined,
  base?: ConfigValue,
): string => {
  if (base === undefined) return serializeConfigValue({})
  return serializeConfigValue(scaffoldFromBase(base))
}

export const cloneConfigs = (
  map: Record<string, ConfigMap>,
): Record<string, ConfigMap> => JSON.parse(JSON.stringify(map)) as Record<string, ConfigMap>

export const cloneSchema = (schema: ConfigSchema): ConfigSchema => ({ ...schema })

export const getModifiedConfigKeys = (
  configs: Record<string, ConfigMap>,
  original: Record<string, ConfigMap>,
  schema: ConfigSchema,
  baseLang: string,
): Array<{ lang: string; key: string }> => {
  const modified: Array<{ lang: string; key: string }> = []
  const keys = Object.keys(schema)
  for (const lang of Object.keys(configs)) {
    if (lang === baseLang) continue
    for (const key of keys) {
      if (!valuesEqual(configs[lang]?.[key], original[lang]?.[key])) {
        modified.push({ lang, key })
      }
    }
  }
  // Also track base-lang edits for configs (unlike translations)
  for (const key of keys) {
    if (!valuesEqual(configs[baseLang]?.[key], original[baseLang]?.[key])) {
      modified.push({ lang: baseLang, key })
    }
  }
  return modified
}

export const schemasEqual = (a: ConfigSchema, b: ConfigSchema): boolean =>
  JSON.stringify(a) === JSON.stringify(b)

export const addConfigKey = (
  schema: ConfigSchema,
  configs: Record<string, ConfigMap>,
  key: string,
  type: ConfigValueType,
  /** Locale(s) that receive an initial value; others stay without the key. */
  seedLangs: string[] = [],
): { schema: ConfigSchema; configs: Record<string, ConfigMap> } => {
  const nextSchema = { ...schema, [key]: type }
  const empty = defaultConfigValue(type)
  const seed = new Set(seedLangs)
  const nextConfigs = Object.keys(configs).reduce<Record<string, ConfigMap>>((acc, lang) => {
    if (seed.has(lang)) {
      acc[lang] = { ...configs[lang], [key]: empty }
    } else {
      acc[lang] = { ...configs[lang] }
    }
    return acc
  }, { ...configs })
  for (const lang of seedLangs) {
    if (!nextConfigs[lang]) nextConfigs[lang] = { [key]: empty }
  }
  return { schema: nextSchema, configs: nextConfigs }
}

/** Remove a key from one locale only (schema unchanged). */
export const clearConfigKeyOnLang = (
  configs: Record<string, ConfigMap>,
  lang: string,
  key: string,
): Record<string, ConfigMap> => {
  const map = { ...(configs[lang] ?? {}) }
  delete map[key]
  return { ...configs, [lang]: map }
}

export const removeConfigKey = (
  schema: ConfigSchema,
  configs: Record<string, ConfigMap>,
  key: string,
): { schema: ConfigSchema; configs: Record<string, ConfigMap> } => {
  const nextSchema = { ...schema }
  delete nextSchema[key]
  const nextConfigs = Object.keys(configs).reduce<Record<string, ConfigMap>>((acc, lang) => {
    const copy = { ...configs[lang] }
    delete copy[key]
    acc[lang] = copy
    return acc
  }, {})
  return { schema: nextSchema, configs: nextConfigs }
}

/** Rename a config key across the schema and every locale, preserving its type and values. */
export const renameConfigKey = (
  schema: ConfigSchema,
  configs: Record<string, ConfigMap>,
  oldKey: string,
  newKey: string,
): { schema: ConfigSchema; configs: Record<string, ConfigMap> } => {
  const nextSchema = Object.entries(schema).reduce<ConfigSchema>((acc, [k, v]) => {
    acc[k === oldKey ? newKey : k] = v
    return acc
  }, {})
  const nextConfigs = Object.keys(configs).reduce<Record<string, ConfigMap>>((acc, lang) => {
    const entries = Object.entries(configs[lang] ?? {})
    acc[lang] = entries.reduce<ConfigMap>((map, [k, v]) => {
      map[k === oldKey ? newKey : k] = v
      return map
    }, {})
    return acc
  }, {})
  return { schema: nextSchema, configs: nextConfigs }
}

export const filterConfigKeys = (
  keys: string[],
  opts: {
    search: string
    searchMode?: 'locale' | 'key'
    filter: 'all' | 'missing' | 'modified'
    schema: ConfigSchema
    configs: Record<string, ConfigMap>
    original: Record<string, ConfigMap>
    activeLang: string
  },
): string[] => {
  const q = opts.search.trim().toLowerCase()
  return keys.filter(key => {
    if (q) {
      if (opts.searchMode === 'key') {
        if (!key.toLowerCase().includes(q)) return false
      } else {
        const type = opts.schema[key] ?? ''
        const inKey = key.toLowerCase().includes(q)
        const inType = type.includes(q)
        const inActive = displayConfigValue(opts.configs[opts.activeLang]?.[key]).toLowerCase().includes(q)
        const inAny = Object.values(opts.configs).some(map =>
          displayConfigValue(map[key]).toLowerCase().includes(q),
        )
        if (!inKey && !inType && !inActive && !inAny) return false
      }
    }
    if (opts.filter === 'missing') {
      // "Unset on this locale" — optional, not an error
      return !hasConfigKey(opts.configs[opts.activeLang], key)
    }
    if (opts.filter === 'modified') {
      return !valuesEqual(opts.configs[opts.activeLang]?.[key], opts.original[opts.activeLang]?.[key])
    }
    return true
  })
}

export const buildConfigLangStats = (
  files: Array<{ lang: string; label: string; flag: string; path: string }>,
  schema: ConfigSchema,
  configs: Record<string, ConfigMap>,
  original: Record<string, ConfigMap>,
  configPathForLang: (lang: string) => string,
) => {
  const keys = Object.keys(schema)
  return files.map(f => {
    const map = configs[f.lang] ?? {}
    const orig = original[f.lang] ?? {}
    let present = 0
    let modified = 0
    for (const key of keys) {
      if (hasConfigKey(map, key)) present++
      if (!valuesEqual(map[key], orig[key])) modified++
    }
    // Keys are optional per locale: progress reflects coverage of the schema catalog.
    return {
      ...f,
      path: configPathForLang(f.lang),
      total: keys.length,
      filled: present,
      modified,
    }
  })
}
