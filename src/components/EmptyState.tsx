import type { FilterMode } from '../types'
import { ui, t } from '../i18n/ui'

export const EmptyState = ({ filter, search }: { filter: FilterMode; search: string }) => {
  return (
    <div className="flex flex-col items-center justify-center h-60 gap-2">
      <div className="text-3xl">{filter === 'missing' ? ui.empty.iconMissing : ui.empty.iconSearch}</div>
      <div className="text-sm text-fg-tertiary">
        {filter === 'missing'
          ? ui.empty.noMissing
          : filter === 'modified'
            ? ui.empty.noModified
            : search
              ? t(ui.empty.noResult, { query: search })
              : ui.empty.noKey}
      </div>
    </div>
  )
}
