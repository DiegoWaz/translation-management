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

const decodeContent = (data: { content: string }) =>
  JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))))

export const loadJsonFile = async <T>(
  config: GitHubConfig,
  path: string,
  empty: T,
): Promise<{ content: T; sha: string }> => {
  const res = await ghRequest(
    config.token,
    `/repos/${config.owner}/${config.repo}/contents/${path}?ref=${config.branch}`,
  )
  if (res.status === 404) {
    return { content: empty, sha: '' }
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? res.statusText)
  }
  const data = await res.json()
  return {
    content: decodeContent(data) as T,
    sha: data.sha as string,
  }
}

export type JsonFileChange = {
  path: string
  content: unknown
}

/**
 * Creates a single Git commit that updates one or more JSON files on the branch.
 * Returns a map of path → blob SHA (same as Contents API content.sha).
 */
export const commitJsonFiles = async (
  config: GitHubConfig,
  files: JsonFileChange[],
  message: string,
): Promise<Record<string, string>> => {
  if (files.length === 0) return {}

  const { owner, repo, branch, token } = config
  const refPath = `/repos/${owner}/${repo}/git/ref/heads/${branch}`
  const ref = await ghFetch(token, refPath)
  const parentSha = ref.object.sha as string

  const parentCommit = await ghFetch(token, `/repos/${owner}/${repo}/git/commits/${parentSha}`)
  const baseTreeSha = parentCommit.tree.sha as string

  const treeItems = await Promise.all(
    files.map(async ({ path, content }) => {
      const blob = await ghFetch(token, `/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({
          content: JSON.stringify(content, null, 4),
          encoding: 'utf-8',
        }),
      })
      return {
        path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blob.sha as string,
      }
    }),
  )

  const newTree = await ghFetch(token, `/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeItems,
    }),
  })

  const newCommit = await ghFetch(token, `/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({
      message,
      tree: newTree.sha,
      parents: [parentSha],
    }),
  })

  await ghFetch(token, refPath, {
    method: 'PATCH',
    body: JSON.stringify({ sha: newCommit.sha }),
  })

  return Object.fromEntries(treeItems.map(item => [item.path, item.sha]))
}

export const loadFile = async (config: GitHubConfig, path: string) => {
  return loadJsonFile<Record<string, string>>(config, path, {})
}

const asDiffString = (value: unknown): string => {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
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
        loadJsonFile<Record<string, unknown>>({ ...config, branch: c.sha }, path, {}).then(r => r.content),
        i + 1 < commits.length
          ? loadJsonFile<Record<string, unknown>>({ ...config, branch: commits[i + 1].sha }, path, {}).then(r => r.content)
          : Promise.resolve({} as Record<string, unknown>),
      ])
      for (const key of new Set([...Object.keys(curr), ...Object.keys(prev)])) {
        const before = asDiffString(prev[key])
        const after = asDiffString(curr[key])
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
