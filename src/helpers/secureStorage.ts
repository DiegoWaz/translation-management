/**
 * At-rest encryption for the locally-persisted GitHub token.
 *
 * A plain PAT sitting in localStorage is readable by anything that can read
 * the origin's storage (malicious browser extensions, a supply-chain-compromised
 * dependency, a stolen backup of the browser profile, etc.) without ever running
 * our JS. This does not defend against an active XSS in *this* page (the key
 * lives in the same origin and a script running here can always call our
 * decrypt function) — but it does stop passive/offline scraping of storage,
 * which is the realistic threat model for a token sitting on disk.
 *
 * The AES-GCM key is generated once per browser profile with
 * `extractable: false` and kept in IndexedDB — it can be *used* by
 * `crypto.subtle` but never exported as raw bytes, even by our own code.
 */

const DB_NAME = 'localehub-keystore'
const STORE_NAME = 'keys'
const KEY_ID = 'token-encryption-key'

const openDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

const getStoredKey = async (db: IDBDatabase): Promise<CryptoKey | undefined> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(KEY_ID)
    req.onsuccess = () => resolve(req.result as CryptoKey | undefined)
    req.onerror = () => reject(req.error)
  })
}

const putKey = async (db: IDBDatabase, key: CryptoKey): Promise<void> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(key, KEY_ID)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Get this browser profile's non-extractable AES-GCM key, generating it on first use. */
const getOrCreateKey = async (): Promise<CryptoKey> => {
  const db = await openDb()
  const existing = await getStoredKey(db)
  if (existing) return existing

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  await putKey(db, key)
  return key
}

const toBase64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes))
const fromBase64 = (b64: string): Uint8Array<ArrayBuffer> => new Uint8Array([...atob(b64)].map(c => c.charCodeAt(0)))

/** Encrypt a string for storage. Returns `iv:ciphertext`, both base64. */
export const encryptForStorage = async (plainText: string): Promise<string> => {
  const key = await getOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plainText)
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  return `${toBase64(iv)}:${toBase64(new Uint8Array(cipherBuf))}`
}

/** Decrypt a value previously produced by encryptForStorage. Returns '' on any failure. */
export const decryptFromStorage = async (stored: string): Promise<string> => {
  try {
    const [ivB64, cipherB64] = stored.split(':')
    if (!ivB64 || !cipherB64) return ''
    const key = await getOrCreateKey()
    const iv = fromBase64(ivB64)
    const cipherBuf = fromBase64(cipherB64)
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBuf)
    return new TextDecoder().decode(plainBuf)
  } catch {
    return ''
  }
}

/** Whether Web Crypto + IndexedDB are available (all evergreen browsers, but not e.g. some SSR/test environments). */
export const isSecureStorageSupported = (): boolean =>
  typeof indexedDB !== 'undefined' && typeof crypto !== 'undefined' && Boolean(crypto.subtle)
