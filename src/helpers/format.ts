import { getUiLocale, ui, t } from '../i18n/ui'

export const timeAgo = (date: Date): string => {
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 60) return ui.time.justNow
  if (s < 3600) return t(ui.time.minutesAgo, { count: Math.floor(s / 60) })
  if (s < 86400) return t(ui.time.hoursAgo, { count: Math.floor(s / 3600) })
  if (s < 86400 * 7) return t(ui.time.daysAgo, { count: Math.floor(s / 86400) })
  return date.toLocaleDateString(getUiLocale())
}

export const initials = (name: string) => {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}
