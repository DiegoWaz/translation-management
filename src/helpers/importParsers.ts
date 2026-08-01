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

export const parseTableText = (text: string): ParsedImport[] => {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rows = normalized.trim().split('\n')
  const sep = rows[0]?.includes('\t') ? '\t' : ','
  const result: ParsedImport[] = []
  for (const rawRow of rows) {
    const cells = parseTsvRow(rawRow, sep)
    const rawLocale = cells[0]?.trim() ?? ''
    const localeCode = rawLocale.replace(/_/g, '-').toUpperCase()
    if (!localeCode || !/^[A-Z]{2,3}(-[A-Z]{2,3})?$/.test(localeCode)) continue
    const paragraphs = cells.slice(1).map(v => v.trim()).filter(Boolean)
    if (paragraphs.length > 0) result.push({ localeCode, paragraphs })
  }
  return result
}

export const detectFormat = (text: string): ImportFormat => {
  const t = text.trim()
  if (t.startsWith('{')) return 'json'
  const firstLine = t.split(/\r?\n/)[0] ?? ''
  if (firstLine.includes('\t') || (firstLine.includes(',') && /^[A-Z]{2,3}[,\t]/.test(firstLine))) return 'table'
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
