import type { TranslationColumnWidths } from '../types'

export const COL_WIDTHS_KEY = 'localehub:col-widths:v1'

export const DEFAULT_TRANSLATION_COLUMN_WIDTHS: TranslationColumnWidths = {
  key: 200,
  base: 280,
  target: 360,
  lastMod: 180,
}

export const MIN_TRANSLATION_COLUMN_WIDTHS: TranslationColumnWidths = {
  key: 96,
  base: 120,
  target: 140,
  lastMod: 110,
}

export const loadColumnWidths = (): TranslationColumnWidths => {
  try {
    const raw = localStorage.getItem(COL_WIDTHS_KEY)
    if (!raw) return { ...DEFAULT_TRANSLATION_COLUMN_WIDTHS }
    const parsed = JSON.parse(raw) as Partial<TranslationColumnWidths>
    return {
      key: clampWidth('key', parsed.key),
      base: clampWidth('base', parsed.base),
      target: clampWidth('target', parsed.target),
      lastMod: clampWidth('lastMod', parsed.lastMod),
    }
  } catch {
    return { ...DEFAULT_TRANSLATION_COLUMN_WIDTHS }
  }
}

export const saveColumnWidths = (widths: TranslationColumnWidths): void => {
  try { localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(widths)) } catch { /* ignore */ }
}

export const clampWidth = (
  col: keyof TranslationColumnWidths,
  value: number | undefined,
): number => {
  const fallback = DEFAULT_TRANSLATION_COLUMN_WIDTHS[col]
  const min = MIN_TRANSLATION_COLUMN_WIDTHS[col]
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.max(min, Math.round(value))
}
