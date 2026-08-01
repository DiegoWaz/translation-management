import type { CommitRecord, KeyLastModifiedMap } from '../types'

export const buildKeyLastModified = (commits: CommitRecord[]): KeyLastModifiedMap => {
  return commits.reduce<KeyLastModifiedMap>((map, c) => {
    for (const key of Object.keys(c.changedKeys)) {
      if (!map[key]) map[key] = { author: c.author, date: c.date, sha: c.sha }
    }
    return map
  }, {})
}
