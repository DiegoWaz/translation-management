import type { FilterMode, LangStat } from '../types'
import { cn } from '../helpers/cn'
import { ui } from '../i18n/ui'

const FILTER_LABELS: Record<FilterMode, string> = {
  all: ui.filters.all,
  missing: ui.filters.missing,
  modified: ui.filters.modified,
  'var-issues': ui.filters.varIssues,
}

export const MobileLangStrip = ({
  langs,
  activeLang,
  onSelectLang,
  filter,
  onFilterChange,
  hideVarIssues,
}: {
  langs: LangStat[]
  activeLang: string
  onSelectLang: (l: string) => void
  filter: FilterMode
  onFilterChange: (f: FilterMode) => void
  hideVarIssues?: boolean
}) => {
  return (
    <div className="bg-surface border-b border-border-muted shrink-0">
      <div className="flex overflow-x-auto px-3 py-2 gap-1.5">
        {langs.map(l => {
          const pct = l.total > 0 ? Math.round((l.filled / l.total) * 100) : 0
          const isActive = l.lang === activeLang
          return (
            <button
              key={l.lang}
              onClick={() => onSelectLang(l.lang)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg cursor-pointer shrink-0 border',
                isActive ? 'bg-accent-bg border-border-brand-soft' : 'bg-transparent border-border',
              )}
            >
              <span className="text-base">{l.flag}</span>
              <span className={cn('text-[9px] font-mono', pct === 100 ? 'text-fg-success' : isActive ? 'text-brand-soft' : 'text-fg-muted')}>{pct}%</span>
              {l.modified > 0 && <span className="size-1.5 rounded-full bg-fg-warning" />}
            </button>
          )
        })}
      </div>
      <div className="flex px-3 pb-2 gap-1.5">
        {((hideVarIssues
          ? ['all', 'missing', 'modified']
          : ['all', 'missing', 'modified', 'var-issues']) as FilterMode[]).map(f => {
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={cn(
                'px-2.5 py-0.5 rounded-full cursor-pointer text-[11px] font-inherit border',
                active ? 'bg-accent-bg border-border-brand-soft text-fg-brand' : 'bg-transparent border-border text-fg-muted',
              )}
            >
              {FILTER_LABELS[f]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
