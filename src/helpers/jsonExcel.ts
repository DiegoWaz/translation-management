import type { ConfigValue } from '../types'

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

export const PATH_COLUMN = '_path'
export const DEPTH_COLUMN = '_depth'
export const KIND_COLUMN = '_kind'
export const FIELD_COLUMN = 'field'
export const VALUE_COLUMN = 'value'
/** Base-locale value for side-by-side diff (optional column). */
export const BASE_COLUMN = 'base'

/** @deprecated kept for callers that still import it */
export const PARENT_COLUMN = '_parent'

export type ExcelSheet = {
  id: string
  title: string
  arrayPath: string | null
  columns: string[]
  rows: string[][]
  /** Property-list sheet: field|value rows (label and value on the same line) */
  kind?: 'properties'
}

const cellString = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

type PropRow = {
  path: string
  field: string
  value: string
  depth: number
  /** group = structural node (not written back); leaf = editable value */
  kind: 'group' | 'leaf'
}

/**
 * Walk JSON into an indented field|value tree.
 * Depth increases at every object/array level so sous-sous-enfants stay correct.
 */
const collectPropertyRows = (value: ConfigValue): PropRow[] => {
  const rows: PropRow[] = []

  const walk = (node: unknown, path: string, depth: number) => {
    if (node === undefined) return

    if (Array.isArray(node)) {
      if (node.length === 0) {
        rows.push({ path, field: path.split('.').pop() || '[]', value: '[]', depth, kind: 'leaf' })
        return
      }
      if (!node.some(isPlainObject)) {
        rows.push({ path, field: path.split('.').pop() || path, value: cellString(node), depth, kind: 'leaf' })
        return
      }
      node.forEach((item, index) => {
        const itemPath = path ? `${path}.${index}` : String(index)
        rows.push({
          path: itemPath,
          field: `[${index}]`,
          value: '',
          depth,
          kind: 'group',
        })
        if (isPlainObject(item)) {
          walk(item, itemPath, depth + 1)
        } else if (Array.isArray(item)) {
          walk(item, itemPath, depth + 1)
        } else {
          rows.push({
            path: itemPath,
            field: `[${index}]`,
            value: cellString(item),
            depth: depth + 1,
            kind: 'leaf',
          })
        }
      })
      return
    }

    if (isPlainObject(node)) {
      const entries = Object.entries(node)
      if (entries.length === 0) {
        rows.push({
          path: path || 'root',
          field: path.split('.').pop() || 'root',
          value: '{}',
          depth,
          kind: 'leaf',
        })
        return
      }
      for (const [key, child] of entries) {
        const childPath = path ? `${path}.${key}` : key
        if (isPlainObject(child)) {
          rows.push({ path: childPath, field: key, value: '', depth, kind: 'group' })
          walk(child, childPath, depth + 1)
        } else if (Array.isArray(child)) {
          if (child.length === 0) {
            rows.push({ path: childPath, field: key, value: '[]', depth, kind: 'leaf' })
          } else if (!child.some(isPlainObject)) {
            rows.push({
              path: childPath,
              field: key,
              value: cellString(child),
              depth,
              kind: 'leaf',
            })
          } else {
            rows.push({ path: childPath, field: key, value: '', depth, kind: 'group' })
            walk(child, childPath, depth + 1)
          }
        } else {
          rows.push({
            path: childPath,
            field: key,
            value: cellString(child),
            depth,
            kind: 'leaf',
          })
        }
      }
      return
    }

    rows.push({
      path: path || 'value',
      field: path.split('.').pop() || 'value',
      value: cellString(node),
      depth,
      kind: 'leaf',
    })
  }

  if (Array.isArray(value)) {
    walk(value, '', 0)
  } else {
    walk(value, '', 0)
  }
  return rows
}

const parseCell = (raw: string): unknown => {
  const trimmed = raw.trim()
  if (trimmed === '') return ''
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed === 'null') return null
  if (trimmed === '{}') return {}
  if (trimmed === '[]') return []
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}'))
    || (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return raw
    }
  }
  return raw
}

/** Set a dotted path that may include numeric array indices. */
export const setPathValue = (root: unknown, path: string, raw: string): unknown => {
  const parts = path.split('.').filter(Boolean)
  if (parts.length === 0) return parseCell(raw)

  const setDeep = (current: unknown, segs: string[]): unknown => {
    if (segs.length === 0) return parseCell(raw)
    const [head, ...rest] = segs
    const index = /^\d+$/.test(head) ? Number(head) : null

    if (index !== null) {
      const arr = Array.isArray(current) ? [...current] : []
      while (arr.length <= index) arr.push(null)
      arr[index] = setDeep(arr[index], rest)
      return arr
    }

    const obj = isPlainObject(current) ? { ...current } : {}
    obj[head] = setDeep(obj[head], rest)
    return obj
  }

  return setDeep(root, parts)
}

/** Flatten nested objects to dotted paths (legacy helper). */
export const flattenToPaths = (
  value: ConfigValue,
  prefix = '',
): Record<string, string> => {
  const rows = collectPropertyRows(value)
  return rows.reduce<Record<string, string>>((acc, row) => {
    if (row.kind !== 'leaf') return acc
    const fullPath = prefix ? `${prefix}.${row.path}` : row.path
    acc[fullPath] = row.value
    return acc
  }, {})
}

export const jsonToExcelSheets = (
  value: ConfigValue,
  compareBase?: ConfigValue,
): ExcelSheet[] => {
  const props = collectPropertyRows(value)
  const showBase = compareBase !== undefined
  const baseLeaves = showBase
    ? new Map(
      collectPropertyRows(compareBase)
        .filter(r => r.kind === 'leaf')
        .map(r => [r.path, r.value] as const),
    )
    : null

  const columns = showBase
    ? [PATH_COLUMN, DEPTH_COLUMN, KIND_COLUMN, FIELD_COLUMN, VALUE_COLUMN, BASE_COLUMN]
    : [PATH_COLUMN, DEPTH_COLUMN, KIND_COLUMN, FIELD_COLUMN, VALUE_COLUMN]

  const rows: string[][] = props.map(row => {
    const base = row.kind === 'leaf' && baseLeaves
      ? (baseLeaves.get(row.path) ?? '')
      : ''
    if (showBase) {
      return [row.path, String(row.depth), row.kind, row.field, row.value, base]
    }
    return [row.path, String(row.depth), row.kind, row.field, row.value]
  })

  if (baseLeaves) {
    const targetLeafPaths = new Set(
      props.filter(r => r.kind === 'leaf').map(r => r.path),
    )
    for (const [path, baseVal] of baseLeaves) {
      if (targetLeafPaths.has(path)) continue
      const parts = path.split('.').filter(Boolean)
      const field = parts[parts.length - 1] || path
      const depth = Math.max(0, parts.length - 1)
      // base-only: present in base locale, missing here — skipped on save until filled
      rows.push([path, String(depth), 'base-only', field, '', baseVal])
    }
  }

  return [{
    id: 'properties',
    title: 'data',
    arrayPath: null,
    kind: 'properties',
    columns,
    rows,
  }]
}

/** True when at least one leaf differs from the base locale value. */
export const excelHasBaseDiffs = (sheet: ExcelSheet): boolean =>
  excelBaseDiffCount(sheet) > 0

/** Number of leaf rows that differ from the base locale column. */
export const excelBaseDiffCount = (sheet: ExcelSheet): number => {
  const valueIdx = sheet.columns.indexOf(VALUE_COLUMN)
  const baseIdx = sheet.columns.indexOf(BASE_COLUMN)
  const kindIdx = sheet.columns.indexOf(KIND_COLUMN)
  if (valueIdx < 0 || baseIdx < 0) return 0
  let count = 0
  for (const row of sheet.rows) {
    const kind = kindIdx >= 0 ? row[kindIdx] : 'leaf'
    if (kind === 'group') continue
    if ((row[valueIdx] ?? '') !== (row[baseIdx] ?? '')) count++
  }
  return count
}

/** Leaf fields belonging to this locale (excludes group headers and base-only gaps). */
export const excelLocalFieldCount = (sheet: ExcelSheet): number => {
  const kindIdx = sheet.columns.indexOf(KIND_COLUMN)
  return sheet.rows.filter(row => {
    const kind = kindIdx >= 0 ? row[kindIdx] : 'leaf'
    return kind === 'leaf'
  }).length
}

/** Keep only groups that still have a differing descendant, plus differing leaves. */
export const filterExcelSheetDiffs = (sheet: ExcelSheet): ExcelSheet => {
  const valueIdx = sheet.columns.indexOf(VALUE_COLUMN)
  const baseIdx = sheet.columns.indexOf(BASE_COLUMN)
  const kindIdx = sheet.columns.indexOf(KIND_COLUMN)
  const pathIdx = sheet.columns.indexOf(PATH_COLUMN)
  if (valueIdx < 0 || baseIdx < 0) return sheet

  const isDiffRow = (row: string[]) => {
    const kind = kindIdx >= 0 ? row[kindIdx] : 'leaf'
    if (kind === 'group') return false
    return (row[valueIdx] ?? '') !== (row[baseIdx] ?? '')
  }

  const diffPaths = new Set(
    sheet.rows.filter(isDiffRow).map(row => (pathIdx >= 0 ? row[pathIdx] : '')).filter(Boolean),
  )

  const rows = sheet.rows.filter(row => {
    const kind = kindIdx >= 0 ? row[kindIdx] : 'leaf'
    const path = pathIdx >= 0 ? row[pathIdx] ?? '' : ''
    if (kind === 'group') {
      // keep group if any diff path is under it
      return [...diffPaths].some(p => p === path || p.startsWith(`${path}.`))
    }
    return isDiffRow(row)
  })

  return { ...sheet, rows }
}

/** Build a compare sheet: left = original (base col), right = changed (value col). */
export const jsonDiffToExcelSheet = (
  original: ConfigValue,
  changed: ConfigValue,
): ExcelSheet => {
  const sheets = jsonToExcelSheets(changed, original)
  return sheets[0] ?? {
    id: 'properties',
    title: 'data',
    arrayPath: null,
    kind: 'properties',
    columns: [PATH_COLUMN, DEPTH_COLUMN, KIND_COLUMN, FIELD_COLUMN, VALUE_COLUMN, BASE_COLUMN],
    rows: [],
  }
}

/** Apply an edited sheet matrix back onto the JSON value. */
export const applyExcelSheet = (
  root: ConfigValue,
  sheet: ExcelSheet,
  columns: string[],
  rows: string[][],
): ConfigValue => {
  const pathIdx = columns.indexOf(PATH_COLUMN)
  const fieldIdx = columns.indexOf(FIELD_COLUMN)
  const valueIdx = columns.indexOf(VALUE_COLUMN)
  const kindIdx = columns.indexOf(KIND_COLUMN)

  if (sheet.kind === 'properties' || sheet.id === 'properties' || (fieldIdx >= 0 && valueIdx >= 0)) {
    let next: unknown = Array.isArray(root) ? [] : {}
    for (const row of rows) {
      const kind = kindIdx >= 0 ? row[kindIdx] : 'leaf'
      if (kind === 'group') continue
      const path = (pathIdx >= 0 ? row[pathIdx] : row[fieldIdx])?.trim()
      if (!path) continue
      const raw = valueIdx >= 0 ? (row[valueIdx] ?? '') : ''
      // Paths only present on the base locale stay absent until the user fills a value
      if (kind === 'base-only' && !raw.trim()) continue
      next = setPathValue(next, path, raw)
    }
    return next as ConfigValue
  }

  if (sheet.id === '_fields') {
    let next: unknown = isPlainObject(root) ? { ...root } : {}
    if (columns.length === 2 && columns[0] === 'path' && columns[1] === 'value') {
      for (const row of rows) {
        const path = row[0]?.trim()
        if (!path) continue
        next = setPathValue(next, path, row[1] ?? '')
      }
      return next as ConfigValue
    }
    const row = rows[0] ?? []
    columns.forEach((path, i) => {
      if (!path.trim()) return
      next = setPathValue(next, path, row[i] ?? '')
    })
    return next as ConfigValue
  }

  return root
}
