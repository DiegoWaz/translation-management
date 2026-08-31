import type { CommitRecord, ConfigMap, ConfigSchema, GitHubConfig, LangFile } from '../types'

export const DEFAULT_PATH_TEMPLATE = 'locales/{lang}.json'
export const DEFAULT_CONFIG_PATH_TEMPLATE = 'configs/{lang}.json'
export const DEFAULT_CONFIG_SCHEMA_PATH = 'configs/schema.json'

// Default demo configuration when no GitHub config is available
export const DEFAULT_DEMO_CONFIG: GitHubConfig = {
  token: '',
  owner: '',
  repo: '',
  branch: 'main',
  baseLang: 'en-UK',
  files: [
    { lang: 'en-UK', label: 'English (UK)', flag: '🇬🇧', path: 'locales/en-UK.json' },
    { lang: 'fr-FR', label: 'Français', flag: '🇫🇷', path: 'locales/fr-FR.json' },
    { lang: 'es-ES', label: 'Español', flag: '🇪🇸', path: 'locales/es-ES.json' },
  ] as LangFile[],
  configPathTemplate: DEFAULT_CONFIG_PATH_TEMPLATE,
  configSchemaPath: DEFAULT_CONFIG_SCHEMA_PATH,
  alwaysNestJson: true,
}

const DEMO_KEYS = [
  'app.title', 'app.subtitle', 'nav.home', 'nav.dashboard', 'nav.settings', 'nav.logout',
  'button.save', 'button.cancel', 'button.delete', 'button.edit', 'button.confirm',
  'form.email', 'form.password', 'form.name', 'form.submit',
  'error.required', 'error.invalid_email', 'error.network', 'error.unauthorized',
  'error.field_min', 'success.saved', 'success.deleted', 'success.uploaded',
  'greeting.hello', 'greeting.welcome', 'cart.items', 'email.sent', 'promo.discount',
  'pagination.previous', 'pagination.next', 'pagination.of',
] as const

/** Sample base-language strings for offline demo (not tied to a specific locale code). */
const SAMPLE_BASE: Record<string, string> = {
  'app.title': 'LocaleHub',
  'app.subtitle': 'Manage your translations',
  'nav.home': 'Home',
  'nav.dashboard': 'Dashboard',
  'nav.settings': 'Settings',
  'nav.logout': 'Log out',
  'button.save': 'Save',
  'button.cancel': 'Cancel',
  'button.delete': 'Delete',
  'button.edit': 'Edit',
  'button.confirm': 'Confirm',
  'form.email': 'Email address',
  'form.password': 'Password',
  'form.name': 'Full name',
  'form.submit': 'Submit',
  'error.required': 'This field is required',
  'error.invalid_email': 'Invalid email address',
  'error.network': 'Network error, please try again',
  'error.unauthorized': '',
  'error.field_min': 'Minimum {min} characters for {field}',
  'success.saved': 'Changes saved',
  'success.deleted': 'Item deleted',
  'success.uploaded': 'File uploaded',
  'greeting.hello': 'Hello {name}!',
  'greeting.welcome': 'Welcome, {firstName} {lastName}',
  'cart.items': '{count} items in your cart',
  'email.sent': 'An email has been sent to {email}',
  'promo.discount': 'Save {percent}% on {product}',
  'pagination.previous': 'Previous',
  'pagination.next': 'Next',
  'pagination.of': 'of',
}

/** Partial target sample with intentional missing vars (for demo validation). */
const SAMPLE_TARGET: Record<string, string> = {
  ...Object.fromEntries(DEMO_KEYS.map(k => [k, ''])),
  'nav.home': '…',
  'button.save': '…',
  'greeting.hello': 'Hello!',
  'greeting.welcome': 'Welcome, {firstName} {lastName}',
  'cart.items': '{count} …',
  'email.sent': 'An email has been sent',
  'promo.discount': 'Save {percent}% on {product}',
  'error.field_min': 'Minimum {min} characters for {field}',
}

const emptyKeys = (): Record<string, string> =>
  DEMO_KEYS.reduce<Record<string, string>>((acc, key) => {
    acc[key] = ''
    return acc
  }, {})

/** Build demo translation maps for langs coming from .env (no hardcoded locale list). */
export const buildDemoTranslations = (
  langs: string[],
  baseLang: string,
): Record<string, Record<string, string>> => {
  const targetLang = langs.find(l => l !== baseLang)
  return langs.reduce<Record<string, Record<string, string>>>((acc, lang) => {
    if (lang === baseLang) acc[lang] = { ...SAMPLE_BASE }
    else if (lang === targetLang) acc[lang] = { ...SAMPLE_TARGET }
    else acc[lang] = emptyKeys()
    return acc
  }, {})
}

export const DEMO_CONFIG_SCHEMA: ConfigSchema = {
  supportEmail: 'text',
  featureMaxItems: 'number',
  themeColors: 'json',
}

const DEMO_CONFIG_BASE: ConfigMap = {
  supportEmail: 'support@example.com',
  featureMaxItems: 12,
  themeColors: { primary: '#3b82f6', danger: '#ef4444' },
}

const DEMO_CONFIG_TARGET: ConfigMap = {
  // Intentionally partial: configs may exist on some locales only
  supportEmail: 'support@example.fr',
  featureMaxItems: 10,
}

export const buildDemoConfigs = (
  langs: string[],
  baseLang: string,
): Record<string, ConfigMap> => {
  const targetLang = langs.find(l => l !== baseLang)
  return langs.reduce<Record<string, ConfigMap>>((acc, lang) => {
    if (lang === baseLang) acc[lang] = { ...DEMO_CONFIG_BASE }
    else if (lang === targetLang) acc[lang] = { ...DEMO_CONFIG_TARGET }
    else acc[lang] = {}
    return acc
  }, {})
}

export const makeDemoHistory = (): CommitRecord[] => [
  {
    sha: 'a1b2c3d',
    message: 'feat(i18n): sample demo history',
    author: 'Demo',
    date: new Date(Date.now() - 2 * 3600000),
    changedKeys: {
      'greeting.hello': { before: 'Hello!', after: 'Hello {name}!', type: 'modified' },
    },
  },
]
