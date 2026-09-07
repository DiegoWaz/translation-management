import type { ImportFormat, JsonImportResult, ParsedImport } from '../types'

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

/** Split a table row: prefer tabs, then commas, then 2+ spaces (paste from docs/chat). */
export const splitTableRow = (row: string): string[] => {
  if (row.includes('\t')) return parseTsvRow(row, '\t').map(c => c.trim())
  // CSV only when first cell looks like a locale (avoid splitting values with commas)
  if (row.includes(',')) {
    const cells = parseTsvRow(row, ',').map(c => c.trim())
    if (cells[0] && LOCALE_CELL.test(cells[0])) return cells
  }
  if (/\s{2,}/.test(row)) {
    return row.trim().split(/\s{2,}/).map(c => c.trim())
  }
  // "fr-FR value…" — single space after locale (one column only)
  const m = row.trim().match(/^([A-Za-z]{2,3}(?:[-_][A-Za-z]{2,3})?)\s+(.+)$/)
  if (m) return [m[1], m[2]]
  return [row.trim()]
}

/**
 * Table import: one row per locale, each extra column = one translation key.
 * Example:
 *   fr-FR	Les Marques de A à Z	Plus de 200 marques…
 *   de-DE	Marken von A bis Z	Über 150 Marken…
 * → 2 columns → 2 keys to assign.
 */
export const parseTableText = (text: string): ParsedImport[] => {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rows = normalized.split('\n').map(r => r.trimEnd()).filter(r => r.trim())
  const result: ParsedImport[] = []
  let maxCols = 0

  const parsedRows: Array<{ localeCode: string; cells: string[] }> = []
  for (const rawRow of rows) {
    const cells = splitTableRow(rawRow)
    const rawLocale = cells[0] ?? ''
    if (!rawLocale || !LOCALE_CELL.test(rawLocale)) continue
    const localeCode = rawLocale.replace(/_/g, '-').toUpperCase()
    // Keep empty cells so column indices stay aligned across locales
    const values = cells.slice(1)
    if (values.every(v => !v.trim())) continue
    maxCols = Math.max(maxCols, values.length)
    parsedRows.push({ localeCode, cells: values })
  }

  for (const { localeCode, cells } of parsedRows) {
    const paragraphs = Array.from({ length: maxCols }, (_, i) => (cells[i] ?? '').trim())
    result.push({ localeCode, paragraphs })
  }
  return result
}

export const detectFormat = (text: string): ImportFormat => {
  const t = text.trim()
  if (t.startsWith('{')) return 'json'
  const firstLine = t.split(/\r?\n/)[0] ?? ''
  if (firstLine.includes('\t')) return 'table'
  if (/^[A-Za-z]{2,3}(?:[-_][A-Za-z]{2,3})?\s{2,}\S/.test(firstLine)) return 'table'
  if (firstLine.includes(',') && /^[A-Za-z]{2,3}(?:[-_][A-Za-z]{2,3})?\s*,/.test(firstLine)) return 'table'
  if (/^[A-Za-z]{2,3}(?:[-_][A-Za-z]{2,3})?\s+\S/.test(firstLine) && t.includes('\n')) {
    // Several lines starting with a locale → treat as table (one value col or more)
    const lines = t.split(/\r?\n/).filter(Boolean).slice(0, 8)
    const localeLines = lines.filter(l => /^[A-Za-z]{2,3}(?:[-_][A-Za-z]{2,3})?\b/.test(l.trim()))
    if (localeLines.length >= 2) return 'table'
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
