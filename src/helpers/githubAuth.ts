/** GitHub API auth/session handling — detect expired or revoked tokens. */

export class GitHubSessionError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'GitHubSessionError'
    this.status = status
  }
}

/** True only for definitive auth failures — not rate limits or transient 403s. */
export const isDefinitiveAuthFailure = (status: number, message: string): boolean => {
  if (status === 401) return true
  const m = message.toLowerCase()
  if (status !== 403) return false
  if (m.includes('rate limit') || m.includes('abuse') || m.includes('secondary rate limit')) return false
  return (
    m.includes('bad credentials')
    || m.includes('requires authentication')
    || m.includes('invalid token')
  )
}

/** Throw `GitHubSessionError` on definitive auth failure (callers decide UX). */
export const assertGitHubResponseOk = async (res: Response): Promise<void> => {
  if (res.ok) return
  const err = await res.json().catch(() => ({}))
  const message = (err as { message?: string }).message ?? res.statusText
  if (isDefinitiveAuthFailure(res.status, message)) {
    throw new GitHubSessionError(message, res.status)
  }
  throw new Error(message)
}

export const isGitHubSessionError = (error: unknown): error is GitHubSessionError =>
  error instanceof GitHubSessionError
