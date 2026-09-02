import { useEffect, useRef, type MutableRefObject } from 'react'
import type { FileSource, GitHubConfig, StaleLangConflict } from '../types'
import { buildStaleLangConflicts, type KeyOwnerMap } from '../helpers/fileSources'
import { loadFile } from '../helpers/github'
import { loadRefConfig } from '../helpers/config'

export const dismissStaleLang = (dismissed: Set<string>, lang: string) => {
  dismissed.add(lang)
}

export const useStalePoll = (opts: {
  config: GitHubConfig
  translations: Record<string, Record<string, string>>
  githubApiReady: boolean
  loading: boolean
  fileSources: Record<string, FileSource[]>
  keyOwners: KeyOwnerMap
  dismissedLangsRef: MutableRefObject<Set<string>>
  onStale: (conflicts: StaleLangConflict[]) => void
}) => {
  const {
    config,
    translations,
    githubApiReady,
    loading,
    fileSources,
    keyOwners,
    dismissedLangsRef,
    onStale,
  } = opts
  const onStaleRef = useRef(onStale)
  useEffect(() => { onStaleRef.current = onStale }, [onStale])

  useEffect(() => {
    dismissedLangsRef.current.clear()
  }, [config.owner, config.repo, config.sourceBranch, dismissedLangsRef])

  useEffect(() => {
    if (!githubApiReady || loading) return
    const loadConfig = loadRefConfig(config)

    const check = async () => {
      try {
        const remoteByLang: Record<string, Array<{
          path: string
          sha: string
          flat: Record<string, string>
          raw: Record<string, unknown>
          nested: boolean
        }>> = {}

        for (const [lang, sources] of Object.entries(fileSources)) {
          if (dismissedLangsRef.current.has(lang)) continue

          for (const source of sources) {
            const { content, sha, nested, rawContent } = await loadFile(loadConfig, source.path)
            if (!source.sha || sha === source.sha) continue

            if (!remoteByLang[lang]) remoteByLang[lang] = []
            remoteByLang[lang].push({
              path: source.path,
              sha,
              flat: content,
              raw: rawContent,
              nested,
            })
          }
        }

        if (Object.keys(remoteByLang).length === 0) return

        const conflicts = buildStaleLangConflicts(
          fileSources,
          translations,
          keyOwners,
          remoteByLang,
        )
        if (conflicts.length > 0) onStaleRef.current(conflicts)
      } catch {
        /* retry next tick */
      }
    }

    let intervalId: ReturnType<typeof setInterval> | undefined
    const startId = setTimeout(() => {
      void check()
      intervalId = setInterval(check, 30_000)
    }, 15_000)

    return () => {
      clearTimeout(startId)
      if (intervalId) clearInterval(intervalId)
    }
  }, [githubApiReady, loading, config, fileSources, translations, keyOwners, dismissedLangsRef])
}
