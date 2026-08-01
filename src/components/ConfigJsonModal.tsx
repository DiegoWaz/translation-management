import { useState } from 'react'
import type { ConfigValue } from '../types'
import { cn } from '../helpers/cn'
import { displayConfigValue, serializeConfigValue } from '../helpers/configValues'
import { excelBaseDiffCount, excelLocalFieldCount, jsonToExcelSheets } from '../helpers/jsonExcel'
import { btnSecClass } from '../helpers/styles'
import { t, ui } from '../i18n/ui'
import { JsonCodeEditor } from './JsonCodeEditor'
import { JsonConfigEditor } from './JsonConfigEditor'
import { JsonExcelPreview } from './JsonExcelPreview'
import { Overlay } from './Overlay'

type ViewMode = 'json' | 'excel'

/** Compact trigger shown in table cells — opens the full modal. */
export const ConfigJsonTrigger = ({
  value,
  compareBase,
  isUnset,
  isModified,
  hovered,
  onOpen,
  label,
}: {
  value: ConfigValue | undefined
  compareBase?: ConfigValue
  isUnset: boolean
  isModified?: boolean
  hovered?: boolean
  onOpen: () => void
  label?: string
}) => {
  const sheets = value === undefined || value === null
    ? (compareBase !== undefined ? jsonToExcelSheets({}, compareBase) : [])
    : jsonToExcelSheets(value, compareBase)
  const sheet = sheets[0]
  const fieldCount = sheet ? excelLocalFieldCount(sheet) : 0
  const diffCount = sheet && compareBase !== undefined ? excelBaseDiffCount(sheet) : 0
  const summary = isUnset && diffCount === 0
    ? (label ?? ui.configs.notSet)
    : diffCount > 0
      ? t(ui.configs.excelDiffCount, { count: diffCount })
      : fieldCount > 0
        ? t(ui.configs.fieldsCount, { count: fieldCount })
        : displayConfigValue(value).slice(0, 48) || ui.configs.openModal

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'w-full text-left text-[12px] rounded px-2 py-1.5 border border-solid bg-transparent font-inherit cursor-pointer',
        'flex items-center justify-between gap-2 min-w-0',
        isUnset && diffCount === 0 ? 'text-fg-faint italic' : isModified || diffCount > 0 ? 'text-fg-brand-strong' : 'text-fg-secondary',
        hovered ? 'border-border-strong' : 'border-border',
        diffCount > 0 && 'border-border-warning',
      )}
    >
      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono">
        {summary}
      </span>
      <span className="shrink-0 text-[10px] text-fg-muted not-italic">{ui.configs.openModal}</span>
    </button>
  )
}

export const ConfigJsonModal = ({
  rowKey,
  value,
  baseValue,
  readOnly = false,
  isMobile,
  onSave,
  onClose,
}: {
  rowKey: string
  value: ConfigValue | undefined
  baseValue?: ConfigValue
  readOnly?: boolean
  isMobile: boolean
  onSave?: (v: ConfigValue) => void
  onClose: () => void
}) => {
  const [view, setView] = useState<ViewMode>('excel')

  return (
    <Overlay onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className={cn(
          'bg-card flex flex-col overflow-hidden shadow-lg',
          isMobile
            ? 'w-screen h-dvh max-h-dvh rounded-none border-none'
            : 'w-[min(1100px,94vw)] h-[min(880px,90vh)] rounded-xl border border-border',
        )}
      >
        <div className="px-5 py-3.5 border-b border-border flex justify-between items-start gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="m-0 mb-0.5 text-[15px] font-semibold text-fg font-mono truncate">{rowKey}</h2>
            <p className="m-0 text-xs text-fg-muted">
              {readOnly ? ui.configs.modalViewOnly : ui.configs.modalEdit}
            </p>
          </div>
          <button type="button" onClick={onClose} className={cn(btnSecClass, 'shrink-0 py-1.5 px-3 text-xs')}>
            {ui.common.close}
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden p-4 flex flex-col">
          {readOnly ? (
            <div className="flex flex-col gap-2 h-full min-h-0">
              <div className="inline-flex self-start rounded border border-border overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => setView('excel')}
                  className={cn(
                    'px-2.5 py-1 text-[11px] border-none cursor-pointer font-inherit',
                    view === 'excel' ? 'bg-accent-bg text-fg-brand' : 'bg-elevated text-fg-tertiary',
                  )}
                >
                  {ui.configs.excelView}
                </button>
                <button
                  type="button"
                  onClick={() => setView('json')}
                  className={cn(
                    'px-2.5 py-1 text-[11px] border-none border-l border-border cursor-pointer font-inherit',
                    view === 'json' ? 'bg-accent-bg text-fg-brand' : 'bg-elevated text-fg-tertiary',
                  )}
                >
                  {ui.configs.jsonView}
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-auto border border-border rounded-md bg-row-even">
                {value === undefined ? (
                  <div className="px-4 py-8 text-center text-sm text-fg-faint italic">{ui.configs.notSet}</div>
                ) : view === 'excel' ? (
                  <div className="p-2">
                    <JsonExcelPreview value={value} compareBase={baseValue} expand />
                  </div>
                ) : (
                  <JsonCodeEditor
                    value={serializeConfigValue(value)}
                    readOnly
                    className="h-full min-h-0 flex flex-col border-0 rounded-none"
                  />
                )}
              </div>
            </div>
          ) : (
            <JsonConfigEditor
              value={value}
              baseValue={baseValue}
              defaultView="excel"
              spacious
              onChange={v => {
                onSave?.(v)
                onClose()
              }}
              onCancel={onClose}
              rows={24}
            />
          )}
        </div>
      </div>
    </Overlay>
  )
}
