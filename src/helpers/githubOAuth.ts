const GITHUB_AUTHORIZE = 'https://github.com/login/oauth/authorize'
const STATE_KEY = 'localehub:oauth_state'
const STATE_MAX_AGE_MS = 10 * 60_000

export type GitHubOAuthTokens = {
  accessToken: string
  refreshToken?: string
  /** Epoch ms when accessToken expires (if GitHub returned expires_in). */
  expiresAt?: number
}

/** Must match the Authorization callback URL registered on the GitHub OAuth App. */
export const getOAuthRedirectUri = (): string =>
  `${window.location.origin}${window.location.pathname}`

const storeOAuthState = (state: string): void => {
  const payload = JSON.stringify({ state, at: Date.now() })
  sessionStorage.setItem(STATE_KEY, payload)
  try { localStorage.setItem(STATE_KEY, payload) } catch { /* ignore */ }
}

const readOAuthState = (): string | null => {
  const parse = (raw: string | null): string | null => {
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as { state?: string; at?: number }
      if (parsed.state && parsed.at && Date.now() - parsed.at < STATE_MAX_AGE_MS) return parsed.state
    } catch { /* legacy plain string */ }
    return raw
  }
  return parse(sessionStorage.getItem(STATE_KEY)) ?? parse(localStorage.getItem(STATE_KEY))
}

const clearOAuthState = (): void => {
  sessionStorage.removeItem(STATE_KEY)
  try { localStorage.removeItem(STATE_KEY) } catch { /* ignore */ }
}

/** Build the GitHub OAuth authorize URL and persist a random state for CSRF protection. */
export const buildAuthorizeUrl = (): string => {
  const clientId = import.meta.env.VITE_GH_CLIENT_ID
  if (!clientId) throw new Error('VITE_GH_CLIENT_ID is not set')

  const state = crypto.randomUUID()
  storeOAuthState(state)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getOAuthRedirectUri(),
    scope: 'repo',
    state,
  })
  return `${GITHUB_AUTHORIZE}?${params}`
}

/** After GitHub redirects back, extract the code from the URL if present. */
export const extractOAuthCode = (): { code: string; state: string } | null => {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')
  if (!code || !state) return null
  return { code, state }
}

/** Verify the state matches what we stored, then clear it. */
export const verifyState = (state: string): boolean => {
  const stored = readOAuthState()
  clearOAuthState()
  return stored === state
}

/** True when the URL contains an OAuth callback from GitHub. */
export const hasOAuthCallback = (): boolean => {
  const params = new URLSearchParams(window.location.search)
  return Boolean(params.get('code') && params.get('state'))
}

export const parseOAuthTokenResponse = (data: Record<string, unknown>): GitHubOAuthTokens => {
  const accessToken = (data.access_token as string) ?? ''
  if (!accessToken) throw new Error('GitHub returned an empty access token')
  const refreshToken = typeof data.refresh_token === 'string' && data.refresh_token
    ? data.refresh_token
    : undefined
  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : undefined
  return {
    accessToken,
    refreshToken,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
  }
}

const postTokenEndpoint = async (body: Record<string, string>): Promise<GitHubOAuthTokens> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)

  let res: Response
  try {
    res = await fetch('/api/github/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw new Error('GitHub token exchange timed out — check Vercel API route /api/github/token')
    }
    throw e
  } finally {
    clearTimeout(timer)
  }

  let data: Record<string, unknown>
  try {
    data = await res.json() as Record<string, unknown>
  } catch {
    throw new Error('Invalid response from /api/github/token — serverless function may be misconfigured')
  }

  if (!res.ok) {
    const detail = (data.error_description as string) ?? (data.error as string)
    throw new Error(detail ?? 'Token exchange failed')
  }
  return parseOAuthTokenResponse(data)
}

/** Exchange the authorization code for access (+ optional refresh) tokens. */
export const exchangeCodeForToken = async (code: string): Promise<GitHubOAuthTokens> =>
  postTokenEndpoint({ code, redirect_uri: getOAuthRedirectUri() })

/** Rotate an expired access token using the stored refresh token. */
export const refreshAccessToken = async (refreshToken: string): Promise<GitHubOAuthTokens> =>
  postTokenEndpoint({ refresh_token: refreshToken })

/** Clean up OAuth query params from the URL without reload. */
export const cleanOAuthParams = (): void => {
  const url = new URL(window.location.href)
  url.searchParams.delete('code')
  url.searchParams.delete('state')
  window.history.replaceState({}, '', url.pathname)
}
