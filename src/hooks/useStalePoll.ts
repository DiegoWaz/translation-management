import { useEffect, useRef } from 'react'
import type { GitHubConfig } from '../types'
import { loadFile } from '../helpers/github'

export const useStalePoll = (opts: {
  config: GitHubConfig
  shas: Record<string, string>
  isConnected: boolean
  isDemoMode: boolean
  onStale: (langs: string[]) => void
}) => {
  const { config, shas, isConnected, isDemoMode, onStale } = opts
  const shasRef = useRef(shas)
  useEffect(() => { shasRef.current = shas }, [shas])

  useEffect(() => {
    if (!isConnected || isDemoMode) return
    const check = async () => {
      try {
        const stale: string[] = []
        for (const f of config.files) {
          const { sha } = await loadFile(config, f.path)
          if (shasRef.current[f.lang] && sha !== shasRef.current[f.lang]) stale.push(f.lang)
        }
        if (stale.length > 0) onStale(stale)
      } catch { /* next tick retries */ }
    }
    const id = setInterval(check, 30_000)
    return () => clearInterval(id)
  }, [isConnected, isDemoMode, config, onStale])
}
