/**
 * Detect if commit is a fix (updates) or feat (new keys)
 */
export const detectCommitType = (
  modifiedKeys: Array<{ lang: string; key: string }>,
  original: Record<string, Record<string, string>>,
): 'fix' | 'feat' => {
  // If all modified keys existed before → fix
  // If any new key → feat
  for (const { key, lang } of modifiedKeys) {
    if (!(key in (original[lang] ?? {}))) {
      return 'feat'
    }
  }
  return 'fix'
}

/**
 * Generate default branch name from commit type and timestamp
 */
export const generateBranchName = (type: 'fix' | 'feat'): string => {
  const timestamp = Date.now()
  return `${type}/${timestamp}`
}

/**
 * Generate default PR title from commit type
 */
export const generatePrTitle = (type: 'fix' | 'feat', message: string): string => {
  const prefix = type === 'fix' ? 'fix' : 'feat'
  return `${prefix}: ${message}`
}
