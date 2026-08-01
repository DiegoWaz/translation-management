import { useEffect, useState } from 'react'
import type { ConfigValue } from '../types'
import { cn } from '../helpers/cn'
import {
  formatJsonLikeBase,
  parseJsonConfigValue,
  serializeConfigValue,
  validateJsonAgainstBase,
} from '../helpers/configValues'
import {
  applyExcelSheet,
  jsonToExcelSheets,
  type ExcelSheet,
} from '../helpers/jsonExcel'
import { ui } from '../i18n/ui'
import { ExcelSheetTable } from './ExcelSheetTable'
import { JsonCodeEditor } from './JsonCodeEditor'

const isBlankJson = (value: ConfigValue | undefined): boolean => {
  if (value === undefined || value === null) return true
  if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return true
  return false
}

type ViewMode = 'json' | 'excel'
type SheetDraft = { columns: string[]; rows: string[][] }

const draftsFromValue = (
  value: ConfigValue,
  compareBase?: ConfigValue,
): { sheets: ExcelSheet[]; drafts: Record<string, SheetDraft> } => {
  const sheets = jsonToExcelSheets(value, compareBase)
  const drafts = Object.fromEntries(
    sheets.map(sheet => [
      sheet.id,
      {
        columns: [...sheet.columns],
        rows: sheet.rows.map(r => [...r]),
      },
    ]),
  )
  return { sheets, drafts }
}

const valueFromDrafts = (
  base: ConfigValue,
  sheets: ExcelSheet[],
  drafts: Record<string, SheetDraft>,
): ConfigValue => {
  let next = base
  for (const sheet of sheets) {
    const local = drafts[sheet.id]
    if (!local) continue
    next = applyExcelSheet(next, sheet, local.columns, local.rows)
  }
  return next
}

export const JsonConfigEditor = ({
  value,
  baseValue,
  onChange,
  onCancel,
  autoFocus = true,
  defaultView = 'excel',
  rows = 14,
  spacious = false,
}: {
  value: ConfigValue | undefined
  baseValue?: ConfigValue
  onChange: (v: ConfigValue) => void
  onCancel: () => void
  autoFocus?: boolean
  defaultView?: ViewMode
  rows?: number
  /** Larger editor area for modal use */
  spacious?: boolean
}) => {
  const [draft, setDraft] = useState('')
  const [view, setView] = useState<ViewMode>(defaultView)
  const [parseError, setParseError] = useState('')
  const [shapeErrors, setShapeErrors] = useState<string[]>([])
  const [sheets, setSheets] = useState<ExcelSheet[]>([])
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null)
  const [sheetDrafts, setSheetDrafts] = useState<Record<string, SheetDraft>>({})

  const loadDraftText = (nextValue: ConfigValue | undefined) =>
    isBlankJson(nextValue) && baseValue !== undefined
      ? formatJsonLikeBase(undefined, baseValue)
      : serializeConfigValue(nextValue ?? {})

  const initExcelFromText = (text: string): boolean => {
    const parsed = parseJsonConfigValue(text)
    if (!parsed.ok) {
      setParseError(parsed.error)
      return false
    }
    const { sheets: nextSheets, drafts } = draftsFromValue(parsed.value, baseValue)
    setSheets(nextSheets)
    setSheetDrafts(drafts)
    setActiveSheetId(nextSheets[0]?.id ?? null)
    setDraft(serializeConfigValue(parsed.value))
    setParseError('')
    return true
  }

  useEffect(() => {
    const text = loadDraftText(value)
    setDraft(text)
    setParseError('')
    setShapeErrors([])
    setView(defaultView)
    if (defaultView === 'excel') {
      initExcelFromText(text)
    } else {
      setSheets([])
      setSheetDrafts({})
      setActiveSheetId(null)
    }
  }, [value, baseValue, autoFocus, defaultView])

  const switchToExcel = () => {
    if (view === 'excel') return
    if (!initExcelFromText(draft)) {
      setView('json')
      return
    }
    setView('excel')
  }

  const switchToJson = () => {
    if (view === 'json') return
    const parsed = parseJsonConfigValue(draft)
    if (!parsed.ok) {
      setParseError(parsed.error)
      return
    }
    const synced = valueFromDrafts(parsed.value, sheets, sheetDrafts)
    setDraft(serializeConfigValue(synced))
    setParseError('')
    setShapeErrors([])
    setView('json')
  }

  const commit = () => {
    let parsedValue: ConfigValue
    if (view === 'excel') {
      const parsed = parseJsonConfigValue(draft)
      if (!parsed.ok) {
        setParseError(parsed.error)
        return
      }
      parsedValue = valueFromDrafts(parsed.value, sheets, sheetDrafts)
    } else {
      const parsed = parseJsonConfigValue(draft)
      if (!parsed.ok) {
        setParseError(parsed.error)
        return
      }
      parsedValue = parsed.value
    }

    const shape = baseValue !== undefined
      ? validateJsonAgainstBase(baseValue, parsedValue)
      : []
    if (shape.length > 0) {
      setShapeErrors(shape)
      setParseError('')
      return
    }
    onChange(parsedValue)
  }

  const activeSheet = sheets.find(s => s.id === activeSheetId) ?? sheets[0]
  const activeLocal = activeSheet ? sheetDrafts[activeSheet.id] : undefined

  const updateCell = (rowIndex: number, colIndex: number, cellValue: string) => {
    if (!activeSheet) return
    setSheetDrafts(prev => {
      const current = prev[activeSheet.id] ?? {
        columns: [...activeSheet.columns],
        rows: activeSheet.rows.map(r => [...r]),
      }
      const nextRows = current.rows.map(r => [...r])
      if (!nextRows[rowIndex]) return prev
      nextRows[rowIndex] = [...nextRows[rowIndex]]
      nextRows[rowIndex][colIndex] = cellValue
      return { ...prev, [activeSheet.id]: { ...current, rows: nextRows } }
    })
  }

  return (
    <div className={cn('flex flex-col gap-1.5 w-full min-w-0', spacious && 'h-full min-h-0')}>
      <div className="flex gap-1.5 flex-wrap items-center shrink-0">
        <div className="inline-flex rounded border border-border overflow-hidden">
          <button
            type="button"
            onClick={switchToExcel}
            className={cn(
              'px-2 py-0.5 text-[10px] border-none cursor-pointer font-inherit',
              view === 'excel' ? 'bg-accent-bg text-fg-brand' : 'bg-elevated text-fg-tertiary',
            )}
          >
            {ui.configs.excelView}
          </button>
          <button
            type="button"
            onClick={switchToJson}
            className={cn(
              'px-2 py-0.5 text-[10px] border-none border-l border-border cursor-pointer font-inherit',
              view === 'json' ? 'bg-accent-bg text-fg-brand' : 'bg-elevated text-fg-tertiary',
            )}
          >
            {ui.configs.jsonView}
          </button>
        </div>
      </div>

      {view === 'json' ? (
        <JsonCodeEditor
          value={draft}
          autoFocus={autoFocus}
          onChange={next => {
            setDraft(next)
            setParseError('')
            setShapeErrors([])
          }}
          onEscape={onCancel}
          onSaveShortcut={commit}
          className={cn(spacious ? 'flex-1 min-h-0' : 'min-h-48', 'flex flex-col [&_.cm-editor]:min-h-[12rem]')}
        />
      ) : (
        <div className={cn(
          'border border-border rounded-md overflow-hidden bg-row-even flex flex-col min-h-0',
          spacious ? 'flex-1' : 'min-h-48',
        )}>
          {sheets.length > 1 && (
            <div className="flex gap-1 px-2 py-1.5 border-b border-border bg-surface overflow-x-auto shrink-0">
              {sheets.map(sheet => (
                <button
                  key={sheet.id}
                  type="button"
                  onClick={() => setActiveSheetId(sheet.id)}
                  className={cn(
                    'px-2 py-0.5 text-[10px] rounded border cursor-pointer font-inherit whitespace-nowrap',
                    activeSheet?.id === sheet.id
                      ? 'border-border-brand-soft bg-accent-bg text-fg-brand'
                      : 'border-border bg-elevated text-fg-muted',
                  )}
                >
                  {sheet.title}
                </button>
              ))}
            </div>
          )}
          {activeSheet && activeLocal ? (
            <div className={cn('overflow-auto', spacious ? 'flex-1 min-h-0' : 'max-h-80')}>
              <ExcelSheetTable
                sheet={{
                  ...activeSheet,
                  columns: activeLocal.columns,
                  rows: activeLocal.rows,
                }}
                editable
                onCellChange={updateCell}
              />
            </div>
          ) : (
            <div className="px-3 py-6 text-center text-xs text-fg-muted">{ui.configs.excelEmpty}</div>
          )}
        </div>
      )}

      <div className="flex gap-2 justify-end shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="px-2.5 py-1 text-[11px] rounded border border-border bg-elevated text-fg-tertiary cursor-pointer font-inherit"
        >
          {ui.common.cancel}
        </button>
        <button
          type="button"
          onClick={commit}
          className="px-2.5 py-1 text-[11px] rounded border border-brand bg-brand text-fg-on-brand cursor-pointer font-inherit"
        >
          {ui.common.save}
        </button>
      </div>
      {parseError && <span className="text-[10px] text-fg-warning shrink-0">{parseError}</span>}
      {shapeErrors.length > 0 && (
        <div className="text-[10px] text-fg-warning leading-relaxed shrink-0">
          <div className="font-medium mb-0.5">{ui.configs.shapeMismatch}</div>
          <ul className="m-0 pl-4">
            {shapeErrors.slice(0, 8).map(err => (
              <li key={err}>{err}</li>
            ))}
            {shapeErrors.length > 8 && <li>…+{shapeErrors.length - 8}</li>}
          </ul>
        </div>
      )}
      <span className="text-[10px] text-fg-muted shrink-0">
        {view === 'excel' ? ui.configs.excelHint : ui.configs.jsonHint}
      </span>
    </div>
  )
}
