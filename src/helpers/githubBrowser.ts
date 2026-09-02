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

/** List branches for a repo. */
export const listBranches = async (token: string, owner: string, repo: string): Promise<GhBranch[]> => {
  return ghFetch<GhBranch[]>(token, `/repos/${owner}/${repo}/branches?per_page=100`)
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
