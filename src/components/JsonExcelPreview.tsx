import { useMemo, useState } from 'react'
import type { ConfigValue } from '../types'
import { cn } from '../helpers/cn'
import { jsonToExcelSheets } from '../helpers/jsonExcel'
import { ui } from '../i18n/ui'
import { ExcelSheetTable } from './ExcelSheetTable'

/** Read-only Excel-like preview of a JSON config value. */
export const JsonExcelPreview = ({
  value,
  compareBase,
  /** Show every sheet stacked, full height — for base column */
  expand = false,
  className,
  onActivate,
}: {
  value: ConfigValue | undefined
  /** When set, Excel shows a base column and highlights diffs */
  compareBase?: ConfigValue
  expand?: boolean
  className?: string
  onActivate?: () => void
}) => {
  const sheets = useMemo(
    () => (value === undefined || value === null ? [] : jsonToExcelSheets(value, compareBase)),
    [value, compareBase],
  )
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = sheets.find(s => s.id === (activeId ?? sheets[0]?.id)) ?? sheets[0]

  if (value === undefined || value === null || sheets.length === 0) {
    return <span className="text-fg-faint italic text-xs">{ui.table.empty}</span>
  }

  if (expand) {
    return (
      <div className={cn('w-full min-w-0 flex flex-col gap-2', className)}>
        {sheets.map(sheet => (
          <div key={sheet.id} className="border border-border rounded-md overflow-hidden bg-row-even">
            <div className="px-2 py-1 border-b border-border bg-surface text-[9px] font-mono text-fg-muted font-semibold">
              {sheet.title}
              <span className="ml-2 text-fg-faint font-normal">
                {sheet.columns.length} cols · {sheet.rows.length} rows
              </span>
            </div>
            <ExcelSheetTable sheet={sheet} compact />
          </div>
        ))}
      </div>
    )
  }

  const body = (
    <div className={cn('w-full min-w-0 border border-border rounded-md overflow-hidden bg-row-even', className)}>
      {sheets.length > 1 && (
        <div className="flex gap-1 px-1.5 py-1 border-b border-border bg-surface overflow-x-auto">
          {sheets.map(sheet => (
            <button
              key={sheet.id}
              type="button"
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                setActiveId(sheet.id)
              }}
              className={cn(
                'px-1.5 py-0.5 text-[9px] rounded border cursor-pointer font-inherit whitespace-nowrap',
                active?.id === sheet.id
                  ? 'border-border-brand-soft bg-accent-bg text-fg-brand'
                  : 'border-border bg-elevated text-fg-muted',
              )}
            >
              {sheet.title}
            </button>
          ))}
        </div>
      )}
      {active && (
        <div className="overflow-auto max-h-36">
          <ExcelSheetTable sheet={active} compact />
        </div>
      )}
    </div>
  )

  if (!onActivate) return body

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onActivate()
        }
      }}
      className="w-full text-left cursor-pointer rounded outline-none focus-visible:ring-1 focus-visible:ring-border-brand"
    >
      {body}
    </div>
  )
}
