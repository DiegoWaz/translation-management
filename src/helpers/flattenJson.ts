/** Flatten a nested JSON object into dot-notation keys with string values. */
export const flattenJson = (obj: unknown, prefix = ''): Record<string, string> => {
  const result: Record<string, string> = {}
  if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) return result

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenJson(value, fullKey))
    } else {
      result[fullKey] = typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value)
    }
  }
  return result
}

/** Unflatten dot-notation keys back into a nested JSON object. */
export const unflattenJson = (flat: Record<string, string>): Record<string, unknown> => {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.')
    let current = result
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current) || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {}
      }
      current = current[parts[i]] as Record<string, unknown>
    }
    current[parts.at(-1)!] = value
  }
  return result
}

/** Check whether a JSON object has any nested objects (not flat string values). */
export const isNestedJson = (obj: unknown): boolean => {
  if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) return false
  return Object.values(obj as Record<string, unknown>).some(
    v => v != null && typeof v === 'object' && !Array.isArray(v),
  )
}

/** Deep clone a JSON-serialisable value. */
const deepClone = <T>(v: T): T => structuredClone(v)

/** Set a value at a nested dot-notation path, creating intermediate objects as needed. */
const setNested = (obj: Record<string, unknown>, dotPath: string, value: string) => {
  const parts = dotPath.split('.')
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in cur) || typeof cur[parts[i]] !== 'object' || cur[parts[i]] == null) {
      cur[parts[i]] = {}
    }
    cur = cur[parts[i]] as Record<string, unknown>
  }
  cur[parts.at(-1)!] = value
}

/** Delete a value at a nested dot-notation path, removing empty parent objects. */
const deleteNested = (obj: Record<string, unknown>, dotPath: string) => {
  const parts = dotPath.split('.')
  const stack: { parent: Record<string, unknown>; key: string }[] = []
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in cur) || typeof cur[parts[i]] !== 'object') return
    stack.push({ parent: cur, key: parts[i] })
    cur = cur[parts[i]] as Record<string, unknown>
  }
  delete cur[parts.at(-1)!]
  // Clean up empty parent objects bottom-up
  for (let i = stack.length - 1; i >= 0; i--) {
    const child = stack[i].parent[stack[i].key] as Record<string, unknown>
    if (Object.keys(child).length === 0) delete stack[i].parent[stack[i].key]
    else break
  }
}

/**
 * Apply flat-key changes onto the original nested JSON, preserving structure and key order.
 * Only modified/added/deleted keys produce diffs.
 */
export const applyChangesToNested = (
  originalNested: Record<string, unknown>,
  originalFlat: Record<string, string>,
  currentFlat: Record<string, string>,
): Record<string, unknown> => {
  const result = deepClone(originalNested)

  // Update changed values and add new keys
  for (const [key, value] of Object.entries(currentFlat)) {
    if (originalFlat[key] !== value) {
      setNested(result, key, value)
    }
  }

  // Delete removed keys
  for (const key of Object.keys(originalFlat)) {
    if (!(key in currentFlat)) {
      deleteNested(result, key)
    }
  }

  return result
}
