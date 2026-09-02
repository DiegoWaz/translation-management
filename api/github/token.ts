/**
 * Vercel Serverless Function — POST /api/github/token
 *
 * Exchanges a GitHub OAuth `code` for an `access_token`. This MUST run
 * server-side: it is the only place `GH_CLIENT_SECRET` is used, and that
 * secret must never reach the browser bundle (unlike `VITE_*` vars, a plain
 * `GH_CLIENT_SECRET` env var is not exposed to client code by Vite).
 *
 * This mirrors the dev-only `githubOAuthProxy` Vite middleware
 * (see vite.config.ts) so the OAuth flow works identically in `pnpm run dev`
 * and in a Vercel deployment — `src/helpers/githubOAuth.ts` always calls
 * `/api/github/token` and doesn't need to know which one is serving it.
 *
 * Uses the standard Web `Request`/`Response` API (Vercel's Node.js runtime
 * supports this natively), so no extra `@vercel/node` dependency is needed.
 */

export const config = { runtime: 'nodejs' }

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const clientId = process.env.VITE_GH_CLIENT_ID
  const clientSecret = process.env.GH_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return new Response(
      JSON.stringify({ error: 'GH_CLIENT_SECRET or VITE_GH_CLIENT_ID not set in environment' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  let code: string | undefined
  let redirectUri: string | undefined
  try {
    const body = await request.json() as { code?: string; redirect_uri?: string }
    code = body.code
    redirectUri = body.redirect_uri
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!code) {
    return new Response(JSON.stringify({ error: 'Missing code' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const ghRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        ...(redirectUri ? { redirect_uri: redirectUri } : {}),
      }),
    })
    const data = await ghRes.json() as Record<string, unknown>

    return new Response(JSON.stringify(data), {
      status: data.error ? 401 : 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
