/**
 * Detect if commit is a fix (updates) or feat (new keys)
 */
export { splitFlatByFileSources } from './fileSources'

export const detectCommitType = (
  modifiedKeys: Array<{ lang: string; key: string }>,
  original: Record<string, Record<string, string>>,
): 'fix' | 'feat' => {
  for (const { key, lang } of modifiedKeys) {
    if (!(key in (original[lang] ?? {}))) {
      return 'feat'
    }
  }
  return 'fix'
}

export const generateBranchName = (type: 'fix' | 'feat'): string => {
  const timestamp = Date.now()
  return `${type}/${timestamp}`
}

export const generatePrTitle = (type: 'fix' | 'feat', message: string): string => {
  const prefix = type === 'fix' ? 'fix' : 'feat'
  return `${prefix}: ${message}`
}
