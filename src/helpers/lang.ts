import type { LangFile } from '../types'
import { countryByCode, flagFromCountryCode } from './countries'
import { getUiLocale } from '../i18n/ui'

export const defaultPath = (lang: string, pathTemplate: string) => {
  return pathTemplate.replace('{lang}', lang)
}

/** Normalize import / short codes (language → lowercase, or xx-XX casing). */
export const resolveLocaleCode = (localeCode: string): string => {
  const trimmed = localeCode.trim()
  if (!trimmed) return ''
  if (trimmed.includes('-')) {
    return trimmed.split('-').map((s, i) => (i === 0 ? s.toLowerCase() : s.toUpperCase())).join('-')
  }
  return trimmed.toLowerCase()
}

/** Region subtag → ISO flag code (`UK` uses GB flag). */
export const regionFromLang = (lang: string): string | undefined => {
  const parts = lang.split('-')
  if (parts.length < 2) return undefined
  const region = parts[1].toUpperCase()
  return region === 'UK' ? 'GB' : region
}

const languageLabel = (langCode: string, uiLocale: string): string => {
  try {
    const name = new Intl.DisplayNames([uiLocale], { type: 'language' }).of(langCode)
    if (!name) return langCode
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch {
    return langCode
  }
}

/** Derive display label + flag from a BCP47 locale. */
export const deriveLangMeta = (
  lang: string,
  uiLocale: string = getUiLocale(),
): { label: string; flag: string } => {
  const langPart = lang.split('-')[0]?.toLowerCase() || lang
  const region = regionFromLang(lang)
  const flag = region ? flagFromCountryCode(region) : '🏳️'
  const country = region ? countryByCode(region, uiLocale) : undefined
  const label = country
    ? `${languageLabel(langPart, uiLocale)} (${country.name})`
    : languageLabel(langPart, uiLocale)
  return { label, flag }
}

export const buildLangFile = (
  lang: string,
  pathTemplate: string,
  overrides?: { label?: string; flag?: string },
): LangFile => {
  const derived = deriveLangMeta(lang)
  return {
    lang,
    label: overrides?.label?.trim() || derived.label,
    flag: overrides?.flag?.trim() || derived.flag,
    path: defaultPath(lang, pathTemplate),
  }
}
