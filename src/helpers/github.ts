import type { CommitRecord, GitHubConfig, KeyChange } from '../types'

const GH = 'https://api.github.com'

const ghRequest = async (token: string, path: string, opts?: RequestInit) => {
  return fetch(`${GH}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...(opts?.headers ?? {}),
    },
  })
}

const ghFetch = async (token: string, path: string, opts?: RequestInit) => {
  const res = await ghRequest(token, path, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? res.statusText)
  }
  return res.json()
}

export const loadFile = async (config: GitHubConfig, path: string) => {
  const res = await ghRequest(
    config.token,
    `/repos/${config.owner}/${config.repo}/contents/${path}?ref=${config.branch}`,
  )
  if (res.status === 404) {
    return { content: {} as Record<string, string>, sha: '' }
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? res.statusText)
  }
  const data = await res.json()
  return {
    content: JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))))) as Record<string, string>,
    sha: data.sha as string,
  }
}

export const pushFile = async (
  config: GitHubConfig,
  path: string,
  content: Record<string, string>,
  sha: string,
  message: string,
) => {
  const body: Record<string, string> = {
    message,
    content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
    branch: config.branch,
  }
  if (sha) body.sha = sha

  const data = await ghFetch(config.token, `/repos/${config.owner}/${config.repo}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  return data.content.sha as string
}

export const fetchFileCommits = async (config: GitHubConfig, path: string): Promise<CommitRecord[]> => {
  const commits = await ghFetch(
    config.token,
    `/repos/${config.owner}/${config.repo}/commits?path=${encodeURIComponent(path)}&sha=${config.branch}&per_page=20`,
  )
  const records: CommitRecord[] = []
  for (let i = 0; i < commits.length; i++) {
    const c = commits[i]
    let changedKeys: Record<string, KeyChange> = {}
    try {
      const [curr, prev] = await Promise.all([
        loadFile({ ...config, branch: c.sha }, path).then(r => r.content),
        i + 1 < commits.length
          ? loadFile({ ...config, branch: commits[i + 1].sha }, path).then(r => r.content)
          : Promise.resolve({} as Record<string, string>),
      ])
      for (const key of new Set([...Object.keys(curr), ...Object.keys(prev)])) {
        const before = prev[key] ?? ''
        const after = curr[key] ?? ''
        if (before !== after) {
          changedKeys[key] = { before, after, type: !before ? 'added' : !after ? 'deleted' : 'modified' }
        }
      }
    } catch { /* skip diff */ }
    records.push({
      sha: c.sha.slice(0, 7),
      message: c.commit.message,
      author: c.commit.author?.name ?? c.author?.login ?? 'unknown',
      date: new Date(c.commit.author?.date ?? Date.now()),
      changedKeys,
    })
  }
  return records
}
