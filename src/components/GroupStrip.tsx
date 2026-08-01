import type { KeyGroup } from '../types'
import { cn } from '../helpers/cn'
import { ui } from '../i18n/ui'

export const GroupStrip = ({
  groups,
  activeGroup,
  onSelect,
}: {
  groups: KeyGroup[]
  activeGroup: string | null
  onSelect: (name: string | null) => void
}) => {
  if (groups.length === 0) return null

  return (
    <div className="flex gap-1 px-4 py-1.5 border-b border-border-muted bg-row-even overflow-x-auto shrink-0">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'px-2.5 py-0.5 rounded-full cursor-pointer text-[11px] font-inherit whitespace-nowrap shrink-0 border',
          activeGroup === null ? 'bg-elevated border-border-brand-soft text-fg-brand' : 'bg-transparent border-border text-fg-muted',
        )}
      >
        {ui.common.all}
      </button>
      {groups.map(g => {
        const active = activeGroup === g.name
        return (
          <button
            key={g.name}
            onClick={() => onSelect(active ? null : g.name)}
            className={cn(
              'px-2.5 py-0.5 rounded-full cursor-pointer text-[11px] font-inherit whitespace-nowrap shrink-0 flex items-center gap-1.5 border',
              active ? 'bg-elevated border-border-brand-soft text-fg-brand' : 'bg-transparent border-border text-fg-muted',
            )}
          >
            <span className="font-mono">{g.name}</span>
            <span className={cn('text-[10px] rounded-full px-1.5', active ? 'bg-brand/12 text-fg-brand' : 'bg-border-muted text-fg-muted')}>{g.count}</span>
          </button>
        )
      })}
    </div>
  )
}
