import type { UiLocale, UiMessages } from './types'
import { UI_LOCALES } from './types'
import { enUK } from './locales/en-UK'
import { frFR } from './locales/fr-FR'
import { esES } from './locales/es-ES'

export type { UiLocale, UiMessages }
export { UI_LOCALES }

type Vars = Record<string, string | number>

export const t = (template: string, vars?: Vars): string => {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`))
}

export const plural = (count: number, one: string, many: string): string => {
  return count === 1 ? one : many
}

const MESSAGES: Record<UiLocale, UiMessages> = {
  'en-UK': enUK,
  'fr-FR': frFR,
  'es-ES': esES,
}

const STORAGE_KEY = 'th.uiLocale'

export const isUiLocale = (value: string): value is UiLocale => {
  return value === 'en-UK' || value === 'fr-FR' || value === 'es-ES'
}

export const detectUiLocale = (): UiLocale => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && isUiLocale(stored)) return stored
  } catch { /* ignore */ }

  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase()
  if (nav.startsWith('fr')) return 'fr-FR'
  if (nav.startsWith('es')) return 'es-ES'
  return 'en-UK'
}

let currentLocale: UiLocale = detectUiLocale()

export const getUiLocale = (): UiLocale => currentLocale

export const setUiLocale = (locale: UiLocale): void => {
  currentLocale = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch { /* ignore */ }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
}

export const getUi = (): UiMessages => MESSAGES[currentLocale]

/** Reactive message bag — reads the active UI locale on each property access. */
export const ui: UiMessages = new Proxy({} as UiMessages, {
  get(_target, section: string | symbol) {
    if (typeof section !== 'string') return undefined
    return getUi()[section as keyof UiMessages]
  },
})

export const localeSuffix = (count: number): string => {
  return count > 1 ? 's' : ''
}

export const keysLabel = (count: number): string => {
  return t(plural(count, ui.history.keysCount, ui.history.keysCountPlural), { count })
}

export const missingLabel = (count: number): string => {
  return t(plural(count, ui.sidebar.missingCount, ui.sidebar.missingCountPlural), { count })
}

export const modifiedLabel = (count: number): string => {
  return t(plural(count, ui.sidebar.modifiedCount, ui.sidebar.modifiedCountPlural), { count })
}

// Apply initial html lang
if (typeof document !== 'undefined') {
  document.documentElement.lang = currentLocale
}
