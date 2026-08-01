import { useState } from 'react'
import type { CommitRecord, LangFile } from '../types'
import { cn } from '../helpers/cn'
import { timeAgo } from '../helpers/format'
import { ui, keysLabel } from '../i18n/ui'
import { Avatar } from './Avatar'
import { HistoryIcon } from './Icons'

export const HistoryPanel = ({ lang, langFile, commits, loading, isDemoMode, onClose, onRestoreKey, compact }: {
  lang: string; langFile?: LangFile; commits: CommitRecord[]; loading: boolean; isDemoMode: boolean
  onClose: () => void; onRestoreKey: (lang: string, key: string, value: string) => void; compact?: boolean
}) => {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [restoredKeys, setRestoredKeys] = useState<Set<string>>(new Set())
  const handleRestore = (key: string, value: string) => { onRestoreKey(lang, key, value); setRestoredKeys(prev => new Set([...prev, `${expanded}:${key}`])) }

  return (
    <aside className={cn(
      'bg-surface flex flex-col shrink-0 overflow-y-auto',
      compact ? 'w-full border-l-0' : 'w-[320px] border-l border-border-muted',
    )}>
      <div className="px-4 py-3.5 border-b border-border-muted flex items-center justify-between shrink-0">
        <div>
          <div className="text-[13px] font-semibold text-fg flex items-center gap-1.5">
            <HistoryIcon size={13} /> {ui.history.title} {langFile ? `${langFile.flag} ${langFile.label}` : lang}
          </div>
          {langFile && <div className="text-[10px] text-fg-muted font-mono mt-0.5">{langFile.path}</div>}
        </div>
        <button onClick={onClose} className="bg-transparent border-none text-fg-muted cursor-pointer text-lg">{ui.common.close}</button>
      </div>
      {isDemoMode && (
        <div className="px-3.5 py-2 bg-warning-bg border-b border-border-warning text-[11px] text-fg-demo">
          {ui.history.demoBanner}
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center h-[120px] text-fg-muted text-[13px]">{ui.history.loading}</div>
      ) : commits.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-fg-muted gap-2">
          <HistoryIcon size={24} />
          <div className="text-[13px]">{ui.history.empty}</div>
        </div>
      ) : (
        <div className="flex-1">
          {commits.map((commit, i) => {
            const isExpanded = expanded === commit.sha, keyCount = Object.keys(commit.changedKeys).length
            return (
              <div key={commit.sha} className="border-b border-border-subtle">
                <button
                  onClick={() => setExpanded(isExpanded ? null : commit.sha)}
                  className={cn(
                    'w-full px-4 py-3 bg-transparent border-none cursor-pointer text-left flex gap-2.5',
                    isExpanded && 'bg-row-hover',
                  )}
                >
                  <div className={cn(
                    'size-2 rounded-full shrink-0 mt-0.5 border-2',
                    i === 0 ? 'bg-brand border-brand-hover' : 'bg-border-strong border-border-strong',
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-fg-secondary whitespace-nowrap overflow-hidden text-ellipsis font-medium">{commit.message}</div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Avatar name={commit.author} size={16} />
                      <span className="text-[11px] text-fg-key">{commit.author}</span>
                      <span className="text-[10px] text-fg-muted">· {timeAgo(commit.date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] font-mono text-fg-muted bg-elevated px-1.5 py-px rounded-sm">{commit.sha}</span>
                      {keyCount > 0 && (
                        <span className="text-[10px] text-fg-success bg-success-bg px-1.5 py-px rounded-[10px]">{keysLabel(keyCount)}</span>
                      )}
                      {keyCount > 0 && (
                        <span className="text-[10px] text-fg-muted ml-auto">{isExpanded ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </div>
                </button>
                {isExpanded && keyCount > 0 && (
                  <div className="px-3 pb-3 pl-[34px] flex flex-col gap-1.5">
                    {Object.entries(commit.changedKeys).map(([key, change]) => {
                      const restoreId = `${commit.sha}:${key}`, wasRestored = restoredKeys.has(restoreId)
                      return (
                        <div key={key} className="bg-row-even border border-border-muted rounded-md px-2.5 py-2">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className={cn(
                              'text-[9px] font-bold px-1.5 py-px rounded-sm',
                              change.type === 'added' ? 'bg-success-bg text-fg-success' : change.type === 'deleted' ? 'bg-danger-bg text-fg-danger' : 'bg-accent-bg text-fg-brand',
                            )}>{change.type === 'added' ? ui.history.typeAdded : change.type === 'deleted' ? ui.history.typeDeleted : ui.history.typeModified}</span>
                            <span className="text-[11px] font-mono text-fg-key overflow-hidden text-ellipsis whitespace-nowrap flex-1">{key}</span>
                          </div>
                          {change.type !== 'added' && change.before && (
                            <div className="text-[11px] text-fg-danger bg-danger-bg px-2 py-1 rounded mb-1 flex items-start justify-between gap-2">
                              <span className="italic flex-1">− {change.before}</span>
                              <button
                                onClick={() => handleRestore(key, change.before)}
                                disabled={wasRestored}
                                className={cn(
                                  'text-[10px] bg-transparent rounded px-1.5 py-0.5 whitespace-nowrap shrink-0 font-inherit',
                                  wasRestored ? 'text-fg-muted border border-border cursor-default' : 'text-fg-brand border border-border-brand-soft cursor-pointer',
                                )}
                              >
                                {wasRestored ? ui.history.restored : ui.history.restore}
                              </button>
                            </div>
                          )}
                          {change.after && (
                            <div className="text-[11px] text-fg-success bg-success-bg px-2 py-1 rounded">+ {change.after}</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </aside>
  )
}
