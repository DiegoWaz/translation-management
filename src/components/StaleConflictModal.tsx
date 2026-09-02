import { useEffect, useMemo, useState } from 'react'
import type { GitHubConfig, StaleLangConflict } from '../types'
import { cn } from '../helpers/cn'
import { btnPrimaryClass, btnSecClass } from '../helpers/styles'
import { ui, t } from '../i18n/ui'
import { Overlay } from './Overlay'

export const StaleConflictModal = ({
  conflicts,
  config,
  onClose,
  onResolve,
  onReloadAll,
  onKeepAllLocal,
  isMobile,
}: {
  conflicts: StaleLangConflict[]
  config: GitHubConfig
  onClose: () => void
  onResolve: (lang: string, resolutions: Record<string, 'local' | 'remote'>) => void
  onReloadAll: () => void
  onKeepAllLocal: () => void
  isMobile: boolean
}) => {
  const [activeLang, setActiveLang] = useState(conflicts[0]?.lang ?? '')
  const active = conflicts.find(c => c.lang === activeLang) ?? conflicts[0]

  const allKeys = useMemo(() => {
    if (!active) return [] as Array<[string, { local: string; remote: string }]>
    const keys = new Map<string, { local: string; remote: string }>()
    for (const source of active.sources) {
      for (const { key, local, remote } of source.changedKeys) {
        keys.set(key, { local, remote })
      }
    }
    return [...keys.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [active])

  const [resolutions, setResolutions] = useState<Record<string, 'local' | 'remote'>>({})

  useEffect(() => {
    const init: Record<string, 'local' | 'remote'> = {}
    for (const [key] of allKeys) init[key] = 'remote'
    setResolutions(init)
  }, [activeLang, allKeys])

  const mergedResolutions = useMemo(() => {
    const next: Record<string, 'local' | 'remote'> = { ...resolutions }
    for (const [key] of allKeys) {
      if (!next[key]) next[key] = 'remote'
    }
    return next
  }, [resolutions, allKeys])

  const setAll = (choice: 'local' | 'remote') => {
    const next: Record<string, 'local' | 'remote'> = {}
    for (const [key] of allKeys) next[key] = choice
    setResolutions(next)
  }

  const langMeta = config.files.find(f => f.lang === active?.lang)

  return (
    <Overlay onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className={cn(
          'bg-card flex flex-col overflow-hidden',
          isMobile ? 'w-screen h-dvh max-h-dvh rounded-none' : 'w-[min(920px,95vw)] max-h-[85vh] rounded-xl border border-border',
        )}
      >
        <div className="px-5 py-4 border-b border-border shrink-0">
          <h2 className="m-0 text-[15px] font-semibold text-fg">{ui.staleConflict.title}</h2>
          <p className="m-0 mt-1 text-xs text-fg-muted">{ui.staleConflict.subtitle}</p>
        </div>

        <div className="flex gap-1 px-4 pt-3 border-b border-border overflow-x-auto shrink-0">
          {conflicts.map(c => {
            const meta = config.files.find(f => f.lang === c.lang)
            const keyCount = c.sources.reduce((n, s) => n + s.changedKeys.length, 0)
            return (
              <button
                key={c.lang}
                type="button"
                onClick={() => setActiveLang(c.lang)}
                className={cn(
                  'px-3 py-1.5 rounded-t-md text-xs border border-b-0 cursor-pointer font-inherit whitespace-nowrap',
                  activeLang === c.lang
                    ? 'bg-card border-border-strong text-fg font-semibold'
                    : 'bg-elevated border-border text-fg-muted',
                )}
              >
                {meta?.flag ?? c.lang} {keyCount}
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {active && (
            <>
              <p className="m-0 mb-3 text-[11px] text-fg-muted font-mono">
                {langMeta?.flag} {langMeta?.label ?? active.lang}
                {' · '}
                {t(ui.staleConflict.keyCount, { count: allKeys.length })}
              </p>
              <div className="flex gap-2 mb-3">
                <button type="button" onClick={() => setAll('remote')} className={btnSecClass}>
                  {ui.staleConflict.takeAllRemote}
                </button>
                <button type="button" onClick={() => setAll('local')} className={btnSecClass}>
                  {ui.staleConflict.keepAllLocal}
                </button>
              </div>
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="text-left text-fg-muted">
                    <th className="pb-2 pr-2 font-semibold">{ui.table.key}</th>
                    <th className="pb-2 pr-2 font-semibold">{ui.staleConflict.yours}</th>
                    <th className="pb-2 pr-2 font-semibold">{ui.staleConflict.theirs}</th>
                    <th className="pb-2 font-semibold">{ui.staleConflict.choice}</th>
                  </tr>
                </thead>
                <tbody>
                  {allKeys.map(([key, { local, remote }]) => (
                    <tr key={key} className="border-t border-border-subtle">
                      <td className="py-2 pr-2 font-mono text-fg-tertiary align-top">{key}</td>
                      <td className="py-2 pr-2 text-fg align-top max-w-[200px] break-words">{local || ui.common.emptyDash}</td>
                      <td className="py-2 pr-2 text-fg align-top max-w-[200px] break-words">{remote || ui.common.emptyDash}</td>
                      <td className="py-2 align-top">
                        <div className="flex flex-col gap-1">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`${active.lang}-${key}`}
                              checked={mergedResolutions[key] === 'local'}
                              onChange={() => setResolutions(prev => ({ ...prev, [key]: 'local' }))}
                            />
                            <span>{ui.staleConflict.keepLocal}</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`${active.lang}-${key}`}
                              checked={mergedResolutions[key] === 'remote'}
                              onChange={() => setResolutions(prev => ({ ...prev, [key]: 'remote' }))}
                            />
                            <span>{ui.staleConflict.takeRemote}</span>
                          </label>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-border flex flex-wrap gap-2 justify-end shrink-0">
          <button type="button" onClick={onClose} className={btnSecClass}>{ui.common.cancel}</button>
          <button type="button" onClick={onKeepAllLocal} className={btnSecClass}>{ui.staleConflict.dismissKeepMine}</button>
          <button type="button" onClick={onReloadAll} className={btnSecClass}>{ui.stale.reload}</button>
          {active && (
            <button
              type="button"
              onClick={() => onResolve(active.lang, mergedResolutions)}
              className={btnPrimaryClass}
            >
              {ui.staleConflict.apply}
            </button>
          )}
        </div>
      </div>
    </Overlay>
  )
}
