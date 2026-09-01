import type { CommitRecord, GitHubConfig, KeyChange } from '../types'
import { flattenJson, unflattenJson, isNestedJson, applyChangesToNested } from './flattenJson'

const GH = 'https://api.github.com'
/**
 * SHA-1 of the empty Git tree object — identical in every Git repo
 * (`git hash-object -t tree /dev/null`). Not project-specific.
 * GitHub often 404s GET on this tree; we omit it as base_tree instead.
 */
const EMPTY_TREE_SHA = '4b825dc642cb6eb9a060e54bf8d69288fbee4904'

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

const encodeJsonContent = (content: unknown): string =>
  btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 4) + '\n')))

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

/** Create or update one JSON file at `path` via Contents API (works on empty / missing files). */
export const putJsonFile = async (
  config: GitHubConfig,
  path: string,
  content: unknown,
  sha: string,
  message: string,
): Promise<string> => {
  const body: Record<string, string> = {
    message,
    content: encodeJsonContent(content),
    branch: config.branch,
  }
  if (sha) body.sha = sha

  const data = await ghFetch(
    config.token,
    `/repos/${config.owner}/${config.repo}/contents/${path}`,
    { method: 'PUT', body: JSON.stringify(body) },
  )
  return data.content.sha as string
}

/**
 * Fallback when Git Data API cannot build a multi-file commit (empty repo, etc.).
 * Creates each missing/updated file at its exact path (one commit per file).
 */
const commitJsonFilesViaContents = async (
  config: GitHubConfig,
  files: JsonFileChange[],
  message: string,
): Promise<Record<string, string>> => {
  const pathShas: Record<string, string> = {}
  for (const file of files) {
    // Re-read sha in case a previous PUT in this batch advanced the branch
    const { sha } = await loadJsonFile(config, file.path, null)
    const label = files.length === 1
      ? message
      : `${message} (${file.path})`
    pathShas[file.path] = await putJsonFile(config, file.path, file.content, sha, label)
  }
  return pathShas
}

const commitJsonFilesGitData = async (
  config: GitHubConfig,
  files: JsonFileChange[],
  message: string,
): Promise<Record<string, string>> => {
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
          content: JSON.stringify(content, null, 4) + '\n',
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

  const treePayload =
    !baseTreeSha || baseTreeSha === EMPTY_TREE_SHA
      ? { tree: treeItems }
      : { base_tree: baseTreeSha, tree: treeItems }

  const newTree = await ghFetch(token, `/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify(treePayload),
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

/**
 * Creates a single Git commit that creates/updates one or more JSON files on the branch
 * at the given paths (including when the remote file is missing).
 * Falls back to Contents API (per-file commits) if the Git database API rejects the repo state.
 */
export const commitJsonFiles = async (
  config: GitHubConfig,
  files: JsonFileChange[],
  message: string,
): Promise<Record<string, string>> => {
  if (files.length === 0) return {}

  try {
    return await commitJsonFilesGitData(config, files, message)
  } catch (e) {
    const msg = ((e as Error).message ?? '').toLowerCase()
    // Empty tree / Git DB unavailable / permission quirks often surface as Not Found or Conflict
    if (
      msg.includes('not found')
      || msg.includes('conflict')
      || msg.includes('git repository is empty')
    ) {
      return commitJsonFilesViaContents(config, files, message)
    }
    throw e
  }
}

export const loadFile = async (config: GitHubConfig, path: string) => {
  const { content: raw, sha } = await loadJsonFile<Record<string, unknown>>(config, path, {})
  const nested = isNestedJson(raw)
  const flat = nested ? flattenJson(raw) : raw as Record<string, string>
  return { content: flat, sha, nested, rawContent: raw }
}

/** Load and merge multiple files (from different translation folders) for the same language. */
export const loadMergedFiles = async (
  config: GitHubConfig,
  paths: string[],
): Promise<{ content: Record<string, string>; shas: string[]; nested: boolean; originalFlat: Record<string, string>; rawContent: Record<string, unknown> }> => {
  const results = await Promise.all(
    paths.map(path => loadFile(config, path)),
  )
  
  const merged: Record<string, string> = {}
  const mergedRaw: Record<string, unknown> = {}
  const shas: string[] = []
  let wasNested = false
  
  results.forEach(result => {
    if (result.nested) wasNested = true
    Object.assign(merged, result.content)
    Object.assign(mergedRaw, result.rawContent)
    if (result.sha) shas.push(result.sha)
  })
  
  return { content: merged, shas, nested: wasNested, originalFlat: { ...merged }, rawContent: mergedRaw }
}

/**
 * Prepare translation content for commit.
 * When rawContent + originalFlat are provided, applies only the actual changes
 * onto the original nested structure, preserving key order and untouched sections.
 */
export const prepareCommitContent = (
  currentFlat: Record<string, string>,
  wasNested: boolean,
  forceNest: boolean = false,
  originalFlat?: Record<string, string>,
  rawContent?: Record<string, unknown>,
): unknown => {
  if (wasNested && rawContent && originalFlat) {
    // Original was nested — apply diffs onto the original structure
    return applyChangesToNested(rawContent, originalFlat, currentFlat)
  }
  if (forceNest && originalFlat) {
    // Original was flat but we want nested output — unflatten original, then apply diffs
    const nestedBase = unflattenJson(originalFlat) as Record<string, unknown>
    return applyChangesToNested(nestedBase, originalFlat, currentFlat)
  }
  return currentFlat
}

/**
 * Create a branch (or reuse an existing one), commit files, and ensure a PR exists.
 * - If `customBranchName` refers to a branch that already exists, files are committed
 *   directly onto it (no new branch created) — this lets you push follow-up commits
 *   onto a PR you already opened, or fix a mistake in your last commit there.
 * - If an open PR already targets that branch, its URL/number is returned instead of
 *   opening a duplicate PR.
 */
export const commitJsonFilesAsPR = async (
  config: GitHubConfig,
  files: JsonFileChange[],
  commitMessage: string,
  prTitle: string,
  customBranchName?: string,
): Promise<{ prUrl: string; prNumber: number }> => {
  if (files.length === 0) throw new Error('No files to commit')

  const { owner, repo, branch: baseBranch, token } = config
  const branchName = customBranchName || `localehub/${Date.now()}`

  const existingBranch = await ghFetch(token, `/repos/${owner}/${repo}/git/ref/heads/${branchName}`).catch(() => null)

  if (!existingBranch) {
    // Get the SHA of the base branch tip and create the new branch from it
    const baseRef = await ghFetch(token, `/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`)
    const baseSha = baseRef.object.sha as string
    await ghFetch(token, `/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }),
    })
  }

  // Commit files onto the branch (new or existing)
  await commitJsonFiles({ ...config, branch: branchName }, files, commitMessage)

  if (existingBranch) {
    // Reuse an already-open PR for this branch if one exists
    const openPrs = await ghFetch(token, `/repos/${owner}/${repo}/pulls?head=${owner}:${branchName}&state=open`)
    const existingPr = Array.isArray(openPrs) ? openPrs[0] : undefined
    if (existingPr) {
      return { prUrl: existingPr.html_url as string, prNumber: existingPr.number as number }
    }
  }

  // Create the PR
  const pr = await ghFetch(token, `/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    body: JSON.stringify({
      title: prTitle,
      head: branchName,
      base: baseBranch,
      body: `Translations updated via LocaleHub.\n\n${commitMessage}`,
    }),
  })

  return { prUrl: pr.html_url as string, prNumber: pr.number as number }
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
  let commits: Array<{
    sha: string
    commit: { message: string; author?: { name?: string; date?: string } }
    author?: { login?: string }
  }>
  try {
    commits = await ghFetch(
      config.token,
      `/repos/${config.owner}/${config.repo}/commits?path=${encodeURIComponent(path)}&sha=${config.branch}&per_page=20`,
    )
  } catch {
    return []
  }
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
