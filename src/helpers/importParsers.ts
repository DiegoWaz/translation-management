import type { ImportFormat, JsonImportResult, ParsedImport, TableImportResult } from '../types'

export const parseFreeText = (text: string): ParsedImport[] => {
  const localeHeaderRe = /^([A-Za-z]{2,3}(?:[-_][A-Za-z]{2,3})?)\s*$/
  const result: ParsedImport[] = []
  let currentCode: string | null = null
  let currentChunk: string[] = []

  const flush = () => {
    if (!currentCode) return
    const paragraphs = currentChunk.join('\n').split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
    if (paragraphs.length > 0) {
      result.push({ localeCode: currentCode.replace(/_/g, '-').toUpperCase(), paragraphs })
    }
  }

  for (const line of text.split('\n')) {
    const m = line.match(localeHeaderRe)
    if (m) {
      flush()
      currentCode = m[1]
      currentChunk = []
    } else if (currentCode !== null) {
      currentChunk.push(line)
    }
  }
  flush()
  return result
}

export const parseTsvRow = (row: string, sep = '\t'): string[] => {
  const cells: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < row.length; i++) {
    const ch = row[i]
    if (ch === '"') {
      if (inQ && row[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (ch === sep && !inQ) {
      cells.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  cells.push(cur)
  return cells
}

const LOCALE_CELL = /^[A-Za-z]{2,3}(?:[-_][A-Za-z]{2,3})?$/
const HEADER_LABEL = /^(locale|lang|language|code|langue|idioma|localisation)$/i
const TRANSLATION_KEY = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)+$/

/** Split a table row: prefer tabs, then commas, then 2+ spaces (paste from docs/chat). */
export const splitTableRow = (row: string): string[] => {
  if (row.includes('\t')) return parseTsvRow(row, '\t').map(c => c.trim())
  // CSV when first cell looks like a locale or a Locale header
  if (row.includes(',')) {
    const cells = parseTsvRow(row, ',').map(c => c.trim())
    if (cells[0] && (LOCALE_CELL.test(cells[0]) || HEADER_LABEL.test(cells[0]))) return cells
  }
  if (/\s{2,}/.test(row)) {
    return row.trim().split(/\s{2,}/).map(c => c.trim())
  }
  // "fr-FR value…" — single space only when locale has a region (avoid "Les Marques…")
  const m = row.trim().match(/^([A-Za-z]{2,3}[-_][A-Za-z]{2,3})\s+(.+)$/)
  if (m) return [m[1], m[2]]
  return [row.trim()]
}

/** Header row: Locale + key names → prefill column assignments. */
export const tryParseHeaderRow = (cells: string[]): string[] | null => {
  if (cells.length < 2) return null
  const [first, ...rest] = cells.map(c => c.trim())
  if (!first || LOCALE_CELL.test(first)) return null
  const keys = rest.filter(Boolean)
  if (keys.length === 0) return null
  if (HEADER_LABEL.test(first)) return keys
  if (keys.every(k => TRANSLATION_KEY.test(k))) return keys
  return null
}

const normalizeLocale = (raw: string) => raw.replace(/_/g, '-').toUpperCase()

const padParagraphs = (
  parsedRows: Array<{ localeCode: string; cells: string[] }>,
): ParsedImport[] => {
  if (parsedRows.length === 0) return []
  const maxCols = Math.max(...parsedRows.map(r => r.cells.length))
  return parsedRows.map(({ localeCode, cells }) => ({
    localeCode,
    paragraphs: Array.from({ length: maxCols }, (_, i) => (cells[i] ?? '').trim()),
  }))
}

const emptyTable = (): TableImportResult => ({ rows: [], columnKeys: [] })

/**
 * Notes / Excel / Sheets: one physical line per locale, cells separated by tab/CSV/spaces.
 * Optional header: Locale	key.one	key.two
 */
export const parseClassicTableText = (text: string): TableImportResult => {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rows = normalized.split('\n').map(r => r.trimEnd()).filter(r => r.trim())
  if (rows.length === 0) return emptyTable()

  let columnKeys: string[] = []
  let dataRows = rows
  const headerKeys = tryParseHeaderRow(splitTableRow(rows[0]))
  if (headerKeys) {
    columnKeys = headerKeys
    dataRows = rows.slice(1)
  }

  const parsedRows: Array<{ localeCode: string; cells: string[] }> = []
  for (const rawRow of dataRows) {
    const cells = splitTableRow(rawRow)
    const rawLocale = cells[0] ?? ''
    if (!rawLocale || !LOCALE_CELL.test(rawLocale)) continue
    const values = cells.slice(1)
    if (values.every(v => !v.trim())) continue
    parsedRows.push({ localeCode: normalizeLocale(rawLocale), cells: values })
  }
  const result = padParagraphs(parsedRows)
  if (result.length === 0 && columnKeys.length === 0) return emptyTable()
  return { rows: result, columnKeys }
}

/**
 * Teams (and similar): each table cell is pasted on its own line.
 * Optional leading header block: Locale / key1 / key2 before the first locale row.
 */
export const parseTeamsVerticalTable = (text: string): TableImportResult => {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n')
  const parsedRows: Array<{ localeCode: string; cells: string[] }> = []
  let currentCode: string | null = null
  let chunk: string[] = []
  let columnKeys: string[] = []
  let preamble: string[] = []
  let seenLocale = false

  const flush = () => {
    if (!currentCode) return
    const body = chunk.join('\n')
    let cells = body.split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean)
    const nonEmptyLines = body.split('\n').map(l => l.trim()).filter(Boolean)
    if (cells.length <= 1 && nonEmptyLines.length > 1) cells = nonEmptyLines
    if (cells.some(c => c.trim())) {
      parsedRows.push({ localeCode: currentCode, cells })
    }
    currentCode = null
    chunk = []
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (LOCALE_CELL.test(trimmed)) {
      if (!seenLocale && preamble.length > 0) {
        const headerKeys = tryParseHeaderRow(preamble.map(l => l.trim()).filter(Boolean))
        if (headerKeys) columnKeys = headerKeys
      }
      seenLocale = true
      flush()
      currentCode = normalizeLocale(trimmed)
      chunk = []
      continue
    }
    if (!seenLocale) {
      if (trimmed) preamble.push(trimmed)
      continue
    }
    if (currentCode !== null) chunk.push(line)
  }
  flush()
  return { rows: padParagraphs(parsedRows), columnKeys }
}

/**
 * Table import: one logical row per locale, each extra column = one translation key.
 * Accepts Notes/Excel TSV and Teams vertical pastes; optional Locale header prefills keys.
 */
export const parseTableText = (text: string): TableImportResult => {
  const classic = parseClassicTableText(text)
  if (classic.rows.length > 0 || classic.columnKeys.length > 0) return classic
  return parseTeamsVerticalTable(text)
}

export const detectFormat = (text: string): ImportFormat => {
  const t = text.trim()
  if (t.startsWith('{')) return 'json'
  const rawLines = t.split(/\r?\n/)
  const firstLine = rawLines[0] ?? ''
  if (firstLine.includes('\t')) return 'table'
  if (/^[A-Za-z]{2,3}(?:[-_][A-Za-z]{2,3})?\s{2,}\S/.test(firstLine)) return 'table'
  if (firstLine.includes(',') && /^[A-Za-z]{2,3}(?:[-_][A-Za-z]{2,3})?\s*,/.test(firstLine)) return 'table'
  // Header row starting with Locale (no tab on first line alone)
  if (HEADER_LABEL.test(firstLine.trim())) return 'table'
  if (/^[A-Za-z]{2,3}(?:[-_][A-Za-z]{2,3})?\s+\S/.test(firstLine) && t.includes('\n')) {
    const lines = rawLines.filter(Boolean).slice(0, 8)
    const localeLines = lines.filter(l => /^[A-Za-z]{2,3}(?:[-_][A-Za-z]{2,3})?\b/.test(l.trim()))
    if (localeLines.length >= 2) return 'table'
  }
  const REGION_LOCALE = /^[A-Za-z]{2,3}[-_][A-Za-z]{2,3}$/
  const meaningful = rawLines.map(l => l.trim()).filter(Boolean)
  const regionLocales = meaningful.filter(l => REGION_LOCALE.test(l))
  if (
    regionLocales.length >= 2
    && meaningful.length > regionLocales.length
    && REGION_LOCALE.test(meaningful[0] ?? '')
  ) {
    return 'table'
  }
  return 'text'
}

export const parseJsonText = (text: string): JsonImportResult | null => {
  try {
    const obj = JSON.parse(text) as unknown
    if (typeof obj !== 'object' || obj === null) return null
    const firstVal = Object.values(obj as Record<string, unknown>)[0]
    if (typeof firstVal === 'object' && firstVal !== null && typeof Object.values(firstVal as object)[0] === 'string') {
      return { type: 'multi', data: obj as Record<string, Record<string, string>> }
    }
    return null
  } catch {
    return null
  }
}
