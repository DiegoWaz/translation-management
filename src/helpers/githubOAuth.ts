const GITHUB_AUTHORIZE = 'https://github.com/login/oauth/authorize'
const STATE_KEY = 'localehub:oauth_state'

/** Build the GitHub OAuth authorize URL and persist a random state for CSRF protection. */
export const buildAuthorizeUrl = (): string => {
  const clientId = import.meta.env.VITE_GH_CLIENT_ID
  if (!clientId) throw new Error('VITE_GH_CLIENT_ID is not set')

  const state = crypto.randomUUID()
  sessionStorage.setItem(STATE_KEY, state)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${window.location.origin}${window.location.pathname}`,
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
  const stored = sessionStorage.getItem(STATE_KEY)
  sessionStorage.removeItem(STATE_KEY)
  return stored === state
}

/** Exchange the authorization code for an access token via our server proxy. */
export const exchangeCodeForToken = async (code: string): Promise<string> => {
  const res = await fetch('/api/github/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  const data = await res.json() as Record<string, unknown>

  if (!res.ok) {
    throw new Error((data.error as string) ?? 'Token exchange failed')
  }
  return (data.access_token as string) ?? ''
}

/** Clean up OAuth query params from the URL without reload. */
export const cleanOAuthParams = (): void => {
  const url = new URL(window.location.href)
  url.searchParams.delete('code')
  url.searchParams.delete('state')
  window.history.replaceState({}, '', url.pathname)
}
