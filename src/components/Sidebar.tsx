import { useState, type ReactNode } from 'react'
import type { FilterMode, LangStat } from '../types'
import { cn } from '../helpers/cn'
import { ui, t, missingLabel, modifiedLabel } from '../i18n/ui'

export const SidebarSection = ({ title, children, defaultOpen = true, compact }: { title: string; children: ReactNode; defaultOpen?: boolean; compact?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className={cn('flex items-center justify-between w-full bg-transparent border-0 border-t border-border-muted cursor-pointer text-inherit', compact ? 'px-2.5 py-1.5' : 'px-3 py-2')}
      >
        <span className="text-[10px] text-fg-muted tracking-widest uppercase font-semibold">{title}</span>
        <span className={cn('text-[9px] text-fg-faint inline-block transition-transform duration-150', open && 'rotate-90')}>▶</span>
      </button>
      {open && children}
    </div>
  )
}

const filterLabel = (f: FilterMode, compact: boolean, missing: number, modified: number): string => {
  if (compact) {
    switch (f) {
      case 'all': return ui.filters.all
      case 'missing': return `${ui.filters.missingShort}${missing > 0 ? ` (${missing})` : ''}`
      case 'modified': return `${ui.filters.modifiedShort}${modified > 0 ? ` (${modified})` : ''}`
      case 'var-issues': return ui.filters.varIssuesShort
    }
  }
  switch (f) {
    case 'all': return ui.filters.allKeys
    case 'missing': return `${ui.filters.missing}${missing > 0 ? ` (${missing})` : ''}`
    case 'modified': return `${ui.filters.modified}${modified > 0 ? ` (${modified})` : ''}`
    case 'var-issues': return ui.filters.varIssuesLong
  }
}

export const Sidebar = ({
  langs,
  activeLang,
  filter,
  onSelectLang,
  onFilterChange,
  baseKeys,
  compact,
  hideVarIssues,
}: {
  langs: LangStat[]
  activeLang: string
  filter: FilterMode
  onSelectLang: (l: string) => void
  onFilterChange: (f: FilterMode) => void
  baseKeys: string[]
  compact?: boolean
  hideVarIssues?: boolean
}) => {
  const s = langs.find(l => l.lang === activeLang)
  const missing = s ? s.total - s.filled : 0
  const modified = s?.modified ?? 0

  return (
    <aside className={cn('bg-surface border-r border-border-muted flex flex-col shrink-0 overflow-y-auto', compact ? 'w-40' : 'w-[210px]')}>
      <SidebarSection title={ui.sidebar.languages} compact={compact}>
        {langs.map(l => {
          const pct = l.total > 0 ? Math.round((l.filled / l.total) * 100) : 0
          const isActive = l.lang === activeLang
          return (
            <button
              key={l.lang}
              type="button"
              onClick={() => onSelectLang(l.lang)}
              className={cn(
                'flex flex-col gap-1 w-full border-0 border-l-2 cursor-pointer text-left',
                compact ? 'px-2.5 py-2' : 'px-3 py-2',
                isActive ? 'bg-elevated border-l-brand' : 'bg-transparent border-l-transparent',
              )}
            >
              <div className="flex justify-between items-center gap-1">
                <span
                  className={cn(
                    'overflow-hidden text-ellipsis whitespace-nowrap min-w-0 flex-1',
                    compact ? 'text-xs' : 'text-[13px]',
                    isActive ? 'text-fg font-medium' : 'text-fg-tertiary font-normal',
                  )}
                >
                  {l.flag} {compact ? l.lang.toUpperCase() : l.label}
                </span>
                <span className={cn('text-[10px] font-mono shrink-0', pct === 100 ? 'text-fg-success' : 'text-fg-tertiary')}>
                  {pct}%
                </span>
              </div>
              <div className="h-0.5 bg-border-muted rounded-sm overflow-hidden">
                <div
                  className={cn('h-full rounded-sm', pct === 100 ? 'bg-fg-success' : pct > 70 ? 'bg-brand' : 'bg-fg-warning')}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {l.modified > 0 && <span className="text-[9px] text-fg-warning">● {l.modified}</span>}
            </button>
          )
        })}
      </SidebarSection>

      <SidebarSection title={ui.sidebar.filter} compact={compact}>
        <div className={cn('flex flex-col gap-0.5', compact ? 'px-2 pb-2 pt-1' : 'px-2.5 pb-2.5 pt-1')}>
          {((hideVarIssues
            ? ['all', 'missing', 'modified']
            : ['all', 'missing', 'modified', 'var-issues']) as FilterMode[]).map(f => {
            const active = filter === f
            return (
              <button
                key={f}
                onClick={() => onFilterChange(f)}
                className={cn(
                  'block w-full text-left px-1.5 py-1 border-none rounded cursor-pointer font-inherit',
                  compact ? 'text-[11px]' : 'text-xs',
                  active ? (f === 'var-issues' ? 'bg-accent-bg text-fg-warning' : 'bg-accent-bg text-fg-brand') : (f === 'var-issues' ? 'bg-transparent text-fg-demo' : 'bg-transparent text-fg-tertiary'),
                )}
              >
                {filterLabel(f, Boolean(compact), missing, modified)}
              </button>
            )
          })}
        </div>
      </SidebarSection>

      <div className="flex-1" />
      <div className="px-3.5 py-3 border-t border-border-muted text-[11px] text-fg-muted leading-relaxed">
        <div>{t(ui.sidebar.keysCount, { count: baseKeys.length })}</div>
        {missing > 0 && <div className="text-fg-warning">{missingLabel(missing)}</div>}
        {modified > 0 && <div className="text-brand">{modifiedLabel(modified)}</div>}
      </div>
    </aside>
  )
}
