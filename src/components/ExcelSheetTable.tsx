import { useMemo } from 'react'
import { cn } from '../helpers/cn'
import {
  BASE_COLUMN,
  DEPTH_COLUMN,
  FIELD_COLUMN,
  KIND_COLUMN,
  PATH_COLUMN,
  VALUE_COLUMN,
  type ExcelSheet,
} from '../helpers/jsonExcel'
import { ui } from '../i18n/ui'

const HIDDEN_COLUMNS = new Set([PATH_COLUMN, DEPTH_COLUMN, KIND_COLUMN, '_parent'])

export type ExcelSheetLabels = {
  field?: string
  value?: string
  base?: string
  diffHint?: string
  missingInValue?: string
  missingInBase?: string
}

/** field | value [| base] — or field | base | value in compare layout. */
export const ExcelSheetTable = ({
  sheet,
  editable = false,
  onCellChange,
  compact = false,
  /** Diffchecker-style: original (base) then changed (value) */
  compareLayout = false,
  labels,
  hideDiffHint = false,
}: {
  sheet: ExcelSheet
  editable?: boolean
  onCellChange?: (rowIndex: number, colIndex: number, value: string) => void
  compact?: boolean
  compareLayout?: boolean
  labels?: ExcelSheetLabels
  hideDiffHint?: boolean
}) => {
  void compact

  const columnLabel = (col: string): string => {
    if (col === FIELD_COLUMN) return labels?.field ?? ui.configs.excelFieldColumn
    if (col === VALUE_COLUMN) return labels?.value ?? ui.configs.excelValueColumn
    if (col === BASE_COLUMN) return labels?.base ?? ui.configs.excelBaseColumn
    return col
  }

  const visible = useMemo(() => {
    const indexes: number[] = []
    sheet.columns.forEach((col, i) => {
      if (!HIDDEN_COLUMNS.has(col)) indexes.push(i)
    })
    return indexes.sort((a, b) => {
      const order = (c: string) => {
        if (c === FIELD_COLUMN) return 0
        if (compareLayout) {
          if (c === BASE_COLUMN) return 1
          if (c === VALUE_COLUMN) return 2
        } else {
          if (c === VALUE_COLUMN) return 1
          if (c === BASE_COLUMN) return 2
        }
        return 3
      }
      return order(sheet.columns[a]) - order(sheet.columns[b])
    })
  }, [sheet.columns, compareLayout])

  const valueIdx = sheet.columns.indexOf(VALUE_COLUMN)
  const baseIdx = sheet.columns.indexOf(BASE_COLUMN)

  const metaOf = (row: string[]) => {
    const di = sheet.columns.indexOf(DEPTH_COLUMN)
    const ki = sheet.columns.indexOf(KIND_COLUMN)
    const depth = di >= 0 ? Number(row[di] ?? 0) : 0
    const kind = ki >= 0 ? row[ki] : 'leaf'
    const isGroup = kind === 'group'
    const isDiff = !isGroup
      && baseIdx >= 0
      && valueIdx >= 0
      && (row[valueIdx] ?? '') !== (row[baseIdx] ?? '')
    return {
      depth: Number.isFinite(depth) && depth > 0 ? depth : 0,
      isGroup,
      isDiff,
    }
  }

  const isProperties = sheet.kind === 'properties'
    || (sheet.columns.includes(FIELD_COLUMN) && sheet.columns.includes(VALUE_COLUMN))
  const hasBaseColumn = baseIdx >= 0
  const diffHint = labels?.diffHint ?? ui.configs.excelDiffHint
  const missingInValue = labels?.missingInValue ?? ui.configs.excelMissingInLocale
  const missingInBase = labels?.missingInBase ?? ui.configs.excelOnlyInLocale

  return (
    <div className="overflow-auto w-full max-w-full h-full">
      {hasBaseColumn && !hideDiffHint && (
        <div className="px-2 py-1.5 text-[10px] text-fg-muted border-b border-border bg-surface sticky top-0 z-20">
          {diffHint}
        </div>
      )}
      <table className="border-collapse text-[11px] font-mono w-full table-fixed">
        <thead className="sticky top-0 bg-surface z-10">
          <tr>
            <th className="w-10 px-2 py-1.5 border-b border-r border-border text-fg-muted text-left whitespace-nowrap">#</th>
            {visible.map(ci => {
              const col = sheet.columns[ci]
              const isField = col === FIELD_COLUMN
              const isValue = col === VALUE_COLUMN
              const isBase = col === BASE_COLUMN
              return (
                <th
                  key={col}
                  className={cn(
                    'px-2 py-1.5 border-b border-r border-border text-fg-muted text-left whitespace-nowrap font-semibold',
                    isField && 'w-[28%]',
                    isValue && (hasBaseColumn ? 'w-[36%]' : 'w-auto'),
                    isBase && 'w-[36%]',
                  )}
                >
                  {columnLabel(col)}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sheet.rows.map((row, ri) => {
            const { depth, isGroup, isDiff } = metaOf(row)
            return (
              <tr
                key={ri}
                className={cn(
                  isDiff
                    ? 'bg-warning-bg/70'
                    : isGroup
                      ? 'bg-elevated/80'
                      : ri % 2 === 0
                        ? 'bg-row-odd'
                        : 'bg-row-even',
                )}
              >
                <td className="px-2 py-0.5 border-b border-r border-border-subtle text-fg-faint whitespace-nowrap align-middle">
                  {ri + 1}
                </td>
                {visible.map(ci => {
                  const col = sheet.columns[ci]
                  const cell = row[ci] ?? ''
                  const isField = col === FIELD_COLUMN
                  const isValue = col === VALUE_COLUMN
                  const isBase = col === BASE_COLUMN
                  const indent = isField && depth > 0 ? depth * 14 : 0
                  const emptyHint = isDiff && isValue && cell === ''
                    ? missingInValue
                    : isDiff && isBase && cell === ''
                      ? missingInBase
                      : null

                  return (
                    <td
                      key={ci}
                      className={cn(
                        'border-b border-r border-border-subtle p-0 align-middle',
                        isDiff && isValue && 'bg-warning-bg/40',
                        isDiff && isBase && 'bg-elevated/50',
                      )}
                    >
                      {editable && isValue && !isGroup ? (
                        <input
                          value={cell}
                          onChange={e => onCellChange?.(ri, ci, e.target.value)}
                          placeholder={emptyHint ?? undefined}
                          className={cn(
                            'w-full bg-transparent border-none outline-none px-2 py-1.5 text-[11px] font-mono box-border text-fg',
                            isDiff && 'font-semibold text-fg-warning',
                          )}
                        />
                      ) : editable && isField && !isBase ? (
                        <input
                          value={cell}
                          onChange={e => onCellChange?.(ri, ci, e.target.value)}
                          readOnly={isProperties || isGroup}
                          className={cn(
                            'w-full bg-transparent border-none outline-none px-2 py-1.5 text-[11px] font-mono box-border cursor-default',
                            isGroup && 'text-fg-brand font-semibold',
                            !isGroup && 'text-fg-key font-medium',
                          )}
                          style={indent ? { paddingLeft: 8 + indent } : undefined}
                        />
                      ) : (
                        <div
                          className={cn(
                            'px-2 py-1.5 whitespace-pre-wrap break-words',
                            isGroup && isField && 'text-fg-brand font-semibold',
                            !isGroup && isField && 'text-fg-key font-medium',
                            isValue && !isDiff && 'text-fg-tertiary',
                            isValue && isDiff && 'text-fg-warning font-semibold',
                            isBase && 'text-fg-muted',
                            emptyHint && 'italic text-fg-faint',
                          )}
                          style={indent ? { paddingLeft: 8 + indent } : undefined}
                        >
                          {isField && depth > 0 && (
                            <span className="text-fg-faint select-none mr-1">
                              {'│ '.repeat(Math.max(0, depth - 1))}{'└ '}
                            </span>
                          )}
                          {cell || emptyHint || ''}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
