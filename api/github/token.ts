import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Vercel Serverless Function — POST /api/github/token
 *
 * Exchanges a GitHub OAuth `code` for an `access_token`. This MUST run
 * server-side: it is the only place `GH_CLIENT_SECRET` is used.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const clientId = process.env.VITE_GH_CLIENT_ID
  const clientSecret = process.env.GH_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    res.status(500).json({ error: 'GH_CLIENT_SECRET or VITE_GH_CLIENT_ID not set in environment' })
    return
  }

  const { code, redirect_uri: redirectUri } = (req.body ?? {}) as {
    code?: string
    redirect_uri?: string
  }

  if (!code) {
    res.status(400).json({ error: 'Missing code' })
    return
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

    if (data.error) {
      res.status(401).json(data)
      return
    }

    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
}
