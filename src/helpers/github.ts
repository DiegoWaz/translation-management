import type { CommitRecord, GitHubConfig, KeyChange } from '../types'
import { assertGitHubResponseOk } from './githubAuth'
import { flattenJson, unflattenJson, isNestedJson, applyChangesToNested } from './flattenJson'

const GH = 'https://api.github.com'
/**
 * SHA-1 of the empty Git tree object — identical in every Git repo
 * (`git hash-object -t tree /dev/null`). Not project-specific.
 * GitHub often 404s GET on this tree; we omit it as base_tree instead.
 */
const EMPTY_TREE_SHA = '4b825dc642cb6eb9a060e54bf8d69288fbee4904'

/** GET a branch ref (`/git/ref/…`). */
const gitRefHeadsPath = (owner: string, repo: string, branch: string): string =>
  `/repos/${owner}/${repo}/git/ref/${encodeURIComponent(`heads/${branch}`)}`

/** PATCH/DELETE a branch ref (`/git/refs/…` — plural). */
const gitRefsHeadsPath = (owner: string, repo: string, branch: string): string =>
  `/repos/${owner}/${repo}/git/refs/${encodeURIComponent(`heads/${branch}`)}`

const branchTipPath = (owner: string, repo: string, branch: string): string =>
  `/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`

const resolveBranchTipSha = async (
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<string> => {
  try {
    const ref = await ghFetch(token, gitRefHeadsPath(owner, repo, branch)) as { object: { sha: string } }
    return ref.object.sha
  } catch {
    const branchData = await ghFetch(token, branchTipPath(owner, repo, branch)) as { commit: { sha: string } }
    return branchData.commit.sha
  }
}

const gitTreeRefPath = (owner: string, repo: string, branchOrSha: string): string =>
  `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branchOrSha)}`

const dedupeFilesByPath = (files: JsonFileChange[]): JsonFileChange[] => {
  const byPath = new Map<string, JsonFileChange>()
  for (const file of files) byPath.set(file.path, file)
  return [...byPath.values()]
}

const sleep = (ms: number) => new Promise<void>(resolve => { setTimeout(resolve, ms) })

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
  await assertGitHubResponseOk(res)
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
    `/repos/${config.owner}/${config.repo}/contents/${path}?ref=${encodeURIComponent(config.branch)}`,
  )
  if (res.status === 404) {
    return { content: empty, sha: '' }
  }
  await assertGitHubResponseOk(res)
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
 * Last-resort single-file commit via Contents API (one file only).
 */
const commitSingleFileViaContents = async (
  config: GitHubConfig,
  file: JsonFileChange,
  message: string,
): Promise<Record<string, string>> => {
  const { sha } = await loadJsonFile(config, file.path, null)
  const newSha = await putJsonFile(config, file.path, file.content, sha, message)
  return { [file.path]: newSha }
}

const commitJsonFilesGitData = async (
  config: GitHubConfig,
  files: JsonFileChange[],
  message: string,
): Promise<Record<string, string>> => {
  const { owner, repo, branch, token } = config
  const parentSha = await resolveBranchTipSha(token, owner, repo, branch)

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

  await ghFetch(token, gitRefsHeadsPath(owner, repo, branch), {
    method: 'PATCH',
    body: JSON.stringify({ sha: newCommit.sha }),
  })

  return Object.fromEntries(treeItems.map(item => [item.path, item.sha]))
}

/**
 * Creates a single Git commit that creates/updates one or more JSON files on the branch
 * at the given paths (including when the remote file is missing).
 * Never creates one commit per file when multiple paths are provided.
 */
export const commitJsonFiles = async (
  config: GitHubConfig,
  files: JsonFileChange[],
  message: string,
): Promise<Record<string, string>> => {
  const uniqueFiles = dedupeFilesByPath(files)
  if (uniqueFiles.length === 0) return {}

  const retriable = (err: unknown): boolean => {
    const msg = ((err as Error).message ?? '').toLowerCase()
    return msg.includes('conflict')
      || msg.includes('fast forward')
      || msg.includes('not found')
  }

  let lastError: Error | undefined
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await commitJsonFilesGitData(config, uniqueFiles, message)
    } catch (e) {
      lastError = e as Error
      if (!retriable(e) || attempt === 2) break
      await sleep(400 * (attempt + 1))
    }
  }

  if (uniqueFiles.length === 1) {
    try {
      return await commitSingleFileViaContents(config, uniqueFiles[0], message)
    } catch (e) {
      throw new Error(
        `Commit failed: ${(e as Error).message}. LocaleHub always commits all changed files in a single Git commit.`,
      )
    }
  }

  throw new Error(
    lastError
      ? `Could not create a single commit for ${uniqueFiles.length} files: ${lastError.message}`
      : `Could not create a single commit for ${uniqueFiles.length} files.`,
  )
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
): Promise<{ prUrl: string; prNumber: number; branchName: string }> => {
  if (files.length === 0) throw new Error('No files to commit')

  const { owner, repo, branch: baseBranch, token } = config
  const branchName = customBranchName || `localehub/${Date.now()}`

  const branchAlreadyExists = await resolveBranchTipSha(token, owner, repo, branchName)
    .then(() => true)
    .catch(() => false)

  if (!branchAlreadyExists) {
    const baseSha = await resolveBranchTipSha(token, owner, repo, baseBranch)
    await ghFetch(token, `/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }),
    })
  }

  // Commit files onto the branch (new or existing)
  await commitJsonFiles({ ...config, branch: branchName }, files, commitMessage)

  if (branchAlreadyExists) {
    // Reuse an already-open PR for this branch if one exists
    const openPrs = await ghFetch(token, `/repos/${owner}/${repo}/pulls?head=${owner}:${branchName}&state=open`)
    const existingPr = Array.isArray(openPrs) ? openPrs[0] : undefined
    if (existingPr) {
      return { prUrl: existingPr.html_url as string, prNumber: existingPr.number as number, branchName }
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

  return { prUrl: pr.html_url as string, prNumber: pr.number as number, branchName }
}

export const fetchFileCommits = async (config: GitHubConfig, path: string): Promise<CommitRecord[]> => {
  const commits = await ghFetch<
    Array<{
      sha: string
      commit: { message: string; author?: { name?: string; date?: string } }
      author?: { login?: string }
    }>
  >(
    config.token,
    `/repos/${config.owner}/${config.repo}/commits?path=${encodeURIComponent(path)}&sha=${encodeURIComponent(config.branch)}&per_page=20`,
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
      const currFlat = flattenJson(curr)
      const prevFlat = flattenJson(prev)
      for (const key of new Set([...Object.keys(currFlat), ...Object.keys(prevFlat)])) {
        const before = prevFlat[key] ?? ''
        const after = currFlat[key] ?? ''
        if (before !== after) {
          changedKeys[key] = { before, after, type: !before ? 'added' : !after ? 'deleted' : 'modified' }
        }
      }
    } catch { /* skip diff for this commit */ }
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
