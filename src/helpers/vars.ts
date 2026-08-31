export const extractVars = (text: string): string[] => {
  if (typeof text !== 'string') return []
  return [...new Set([...text.matchAll(/\{([^}]+)\}/g)].map(m => m[1]))]
}

export const missingVars = (source: string, target: string): string[] => {
  if (!source || !target) return []
  const srcVars = extractVars(source)
  const tgtVars = new Set(extractVars(target))
  return srcVars.filter(v => !tgtVars.has(v))
}
