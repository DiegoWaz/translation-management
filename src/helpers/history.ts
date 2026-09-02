import type { CommitRecord, KeyLastModifiedMap } from '../types'

export const buildKeyLastModified = (commits: CommitRecord[]): KeyLastModifiedMap => {
  return commits.reduce<KeyLastModifiedMap>((map, c) => {
    for (const key of Object.keys(c.changedKeys)) {
      if (!map[key]) map[key] = { author: c.author, date: c.date, sha: c.sha }
    }
    return map
  }, {})
}

/** Merge commit lists from multiple source files (dedupe by short sha). */
export const mergeCommitRecords = (batches: CommitRecord[][]): CommitRecord[] => {
  const bySha = new Map<string, CommitRecord>()
  for (const batch of batches) {
    for (const commit of batch) {
      const existing = bySha.get(commit.sha)
      if (!existing) {
        bySha.set(commit.sha, commit)
      } else {
        bySha.set(commit.sha, {
          ...commit,
          changedKeys: { ...existing.changedKeys, ...commit.changedKeys },
        })
      }
    }
  }
  return [...bySha.values()].sort((a, b) => b.date.getTime() - a.date.getTime())
}
