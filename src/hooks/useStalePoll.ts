import { useEffect, useRef } from 'react'
import type { GitHubConfig, FileSource } from '../types'
import { loadFile } from '../helpers/github'

export const useStalePoll = (opts: {
  config: GitHubConfig
  shas: Record<string, string>
  isConnected: boolean
  isDemoMode: boolean
  fileSources: Record<string, FileSource[]>
  onStale: (langs: string[]) => void
}) => {
  const { config, shas, isConnected, isDemoMode, fileSources, onStale } = opts
  const shasRef = useRef(shas)
  useEffect(() => { shasRef.current = shas }, [shas])

  useEffect(() => {
    if (!isConnected || isDemoMode) return
    const check = async () => {
      try {
        const stale: string[] = []
        
        // Check all tracked file sources
        for (const [lang, sources] of Object.entries(fileSources)) {
          for (const source of sources) {
            const { sha } = await loadFile(config, source.path)
            if (source.sha && sha !== source.sha) {
              stale.push(lang)
              break // Only add lang once even if multiple sources changed
            }
          }
        }
        
        if (stale.length > 0) onStale(stale)
      } catch { /* next tick retries */ }
    }
    const id = setInterval(check, 30_000)
    return () => clearInterval(id)
  }, [isConnected, isDemoMode, config, fileSources, onStale])
}
