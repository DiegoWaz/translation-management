import { assertGitHubResponseOk } from './githubAuth'

const GH = 'https://api.github.com'

const gitTreeRefPath = (owner: string, repo: string, branchOrSha: string): string =>
  `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branchOrSha)}`

const ghFetch = async <T>(token: string, path: string): Promise<T> => {
  const res = await fetch(`${GH}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })
  await assertGitHubResponseOk(res)
  return res.json() as Promise<T>
}

export interface GhRepo {
  full_name: string
  owner: { login: string }
  name: string
  default_branch: string
  private: boolean
}

export interface GhBranch {
  name: string
}

export interface GhTreeEntry {
  path: string
  type: 'blob' | 'tree'
}

/** Validate token by fetching the authenticated user. */
export const validateToken = async (token: string): Promise<string> => {
  const user = await ghFetch<{ login: string }>(token, '/user')
  return user.login
}

/** List repos the token can access (first 100). */
export const listRepos = async (token: string): Promise<GhRepo[]> => {
  return ghFetch<GhRepo[]>(token, '/user/repos?per_page=100&sort=updated')
}

type GhqlRefsPage = {
  data?: {
    repository?: {
      refs?: {
        nodes: Array<{ name: string } | null> | null
        pageInfo: { hasNextPage: boolean; endCursor: string | null }
      } | null
    } | null
  }
  errors?: Array<{ message: string }>
}

/** Newest commit first via GraphQL refs orderBy TAG_COMMIT_DATE. */
const listBranchesViaGraphql = async (
  token: string,
  owner: string,
  repo: string,
): Promise<GhBranch[]> => {
  const all: GhBranch[] = []
  let cursor: string | null = null
  const maxPages = 30

  for (let page = 0; page < maxPages; page++) {
    const res = await fetch(`${GH}/graphql`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `query($owner: String!, $name: String!, $cursor: String) {
          repository(owner: $owner, name: $name) {
            refs(
              refPrefix: "refs/heads/"
              first: 100
              after: $cursor
              orderBy: { field: TAG_COMMIT_DATE, direction: DESC }
            ) {
              nodes { name }
              pageInfo { hasNextPage endCursor }
            }
          }
        }`,
        variables: { owner, name: repo, cursor },
      }),
    })
    await assertGitHubResponseOk(res)
    const json = await res.json() as GhqlRefsPage
    if (json.errors?.length) {
      throw new Error(json.errors[0]?.message || 'GitHub GraphQL error')
    }
    const refs = json.data?.repository?.refs
    if (!refs) break
    for (const node of refs.nodes ?? []) {
      if (node?.name) all.push({ name: node.name })
    }
    if (!refs.pageInfo.hasNextPage || !refs.pageInfo.endCursor) break
    cursor = refs.pageInfo.endCursor
  }

  return all
}

const listBranchesViaRest = async (
  token: string,
  owner: string,
  repo: string,
): Promise<GhBranch[]> => {
  const all: GhBranch[] = []
  const perPage = 100
  const maxPages = 30
  for (let page = 1; page <= maxPages; page++) {
    const batch = await ghFetch<GhBranch[]>(
      token,
      `/repos/${owner}/${repo}/branches?per_page=${perPage}&page=${page}`,
    )
    all.push(...batch)
    if (batch.length < perPage) break
  }
  return all
}

/** List branches newest-commit-first (GraphQL); REST fallback if GraphQL fails. */
export const listBranches = async (token: string, owner: string, repo: string): Promise<GhBranch[]> => {
  try {
    const branches = await listBranchesViaGraphql(token, owner, repo)
    if (branches.length > 0) return branches
  } catch {
    // fall through — older tokens / GraphQL outages
  }
  return listBranchesViaRest(token, owner, repo)
}

/** Resolve whether a branch ref exists (avoids relying on the branches list alone). */
export const branchExists = async (
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<boolean> => {
  try {
    await ghFetch(token, `/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`)
    return true
  } catch {
    return false
  }
}

/** Recursively list the full tree of a repo branch. */
export const listTree = async (
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<GhTreeEntry[]> => {
  const data = await ghFetch<{ tree: GhTreeEntry[] }>(
    token,
    `${gitTreeRefPath(owner, repo, branch)}?recursive=1`,
  )
  return data.tree
}

const LOCALE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?\.json$/

/** Detect locale JSON files inside a given folder from the tree listing.
 * Searches recursively (any depth) so structures like `translations/locale/{lang}.json`
 * are found, not just files directly at the folder root. */
export const detectLocaleFiles = (
  tree: GhTreeEntry[],
  folder: string,
): string[] => {
  const prefix = folder ? (folder.endsWith('/') ? folder : `${folder}/`) : ''
  return tree
    .filter(e => e.type === 'blob' && e.path.startsWith(prefix))
    .map(e => e.path.split('/').pop()!)
    .filter(name => LOCALE_PATTERN.test(name))
    .map(name => name.replace('.json', ''))
    .sort()
}

/** List subdirectories at a given depth from tree entries. */
export const listFolders = (tree: GhTreeEntry[], parent: string): string[] => {
  const prefix = parent ? (parent.endsWith('/') ? parent : `${parent}/`) : ''
  return tree
    .filter(e => e.type === 'tree' && e.path.startsWith(prefix) && !e.path.slice(prefix.length).includes('/'))
    .map(e => e.path.slice(prefix.length))
    .sort()
}

/** Find ALL folders with a given name anywhere in the repo tree. */
export const detectAllFoldersWithName = (tree: GhTreeEntry[], folderName: string): string[] => {
  const results = new Set<string>()
  tree
    .filter(e => e.type === 'tree')
    .forEach(e => {
      const parts = e.path.split('/')
      parts.forEach((part, idx) => {
        if (part === folderName) {
          const folderPath = parts.slice(0, idx + 1).join('/')
          results.add(folderPath)
        }
      })
    })
  return Array.from(results).sort()
}

/**
 * Resolve folder input to concrete paths in the tree.
 * - `translations` → every folder named translations (any depth)
 * - `apps/web/translations` → that exact prefix
 */
export const resolveFolderPaths = (tree: GhTreeEntry[], folderInput: string): string[] => {
  const trimmed = folderInput.trim().replace(/\/+$/, '')
  if (!trimmed) return []
  if (trimmed.includes('/')) {
    return detectLocaleFiles(tree, trimmed).length > 0 ? [trimmed] : []
  }
  return detectAllFoldersWithName(tree, trimmed)
}

/** Parent paths of locale JSON files — suggestions for the setup folder picker. */
export const listTranslationFolderCandidates = (tree: GhTreeEntry[]): string[] => {
  const candidates = new Set<string>()
  for (const e of tree) {
    if (e.type !== 'blob') continue
    const fileName = e.path.split('/').pop()!
    if (!LOCALE_PATTERN.test(fileName)) continue
    const parent = e.path.slice(0, e.path.lastIndexOf('/'))
    if (parent) candidates.add(parent)
  }
  return Array.from(candidates).sort()
}

/** Detect locale files from ALL folders with a given name. */
export const detectAllLocaleFiles = (tree: GhTreeEntry[], folderInput: string): string[] => {
  const folders = resolveFolderPaths(tree, folderInput)
  const allFiles = new Set<string>()
  folders.forEach(folder => {
    detectLocaleFiles(tree, folder).forEach(lang => allFiles.add(lang))
  })
  return Array.from(allFiles).sort()
}

/** Get all file paths for each locale from ALL folders matching folderInput. */
export const getTranslationFilePaths = (
  tree: GhTreeEntry[],
  folderInput: string,
): Record<string, string[]> => {
  const folders = resolveFolderPaths(tree, folderInput)
  const result: Record<string, string[]> = {}

  folders.forEach(folder => {
    const prefix = folder ? `${folder}/` : ''
    tree
      .filter(e => e.type === 'blob' && e.path.startsWith(prefix))
      .forEach(e => {
        const fileName = e.path.split('/').pop()!
        if (!LOCALE_PATTERN.test(fileName)) return
        const lang = fileName.replace('.json', '')
        if (!result[lang]) result[lang] = []
        result[lang].push(e.path)
      })
  })

  return result
}
