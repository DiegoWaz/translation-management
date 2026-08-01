import { useEffect, useRef, useState, type RefObject } from 'react'
import type { ConfigValue, ConfigValueType } from '../types'
import { cn } from '../helpers/cn'
import {
  displayConfigValue,
  valuesEqual,
} from '../helpers/configValues'
import { ui } from '../i18n/ui'
import { ConfigJsonModal, ConfigJsonTrigger } from './ConfigJsonModal'

export const ConfigRow = ({
  rowKey,
  type,
  baseValue,
  targetValue,
  originalValue,
  isEven,
  colTemplate,
  showBase,
  isBaseLocale = false,
  isMobile,
  onChange,
  onClear,
  onDelete,
  searchQuery,
}: {
  rowKey: string
  type: ConfigValueType
  baseValue: ConfigValue | undefined
  targetValue: ConfigValue | undefined
  originalValue: ConfigValue | undefined
  isEven: boolean
  colTemplate: string
  showBase: boolean
  isBaseLocale?: boolean
  isMobile: boolean
  onChange: (v: ConfigValue) => void
  onClear: () => void
  onDelete: () => void
  searchQuery?: string
}) => {
  const [editing, setEditing] = useState(false)
  const [jsonModal, setJsonModal] = useState<'edit' | 'base' | null>(null)
  const [hovered, setHovered] = useState(false)
  const [draft, setDraft] = useState('')
  const [jsonError, setJsonError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const isModified = !valuesEqual(targetValue, originalValue)
  const isUnset = targetValue === undefined
  const q = (searchQuery ?? '').toLowerCase()

  useEffect(() => {
    if (!editing || type === 'json') return
    if (type === 'number') setDraft(targetValue === undefined || targetValue === null ? '' : String(targetValue))
    else setDraft(typeof targetValue === 'string' ? targetValue : displayConfigValue(targetValue))
    setJsonError('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [editing, type, targetValue])

  const commitScalar = () => {
    if (type === 'text') {
      if (draft.trim() === '' && !isUnset) {
        onClear()
        setEditing(false)
        return
      }
      onChange(draft)
      setEditing(false)
      return
    }
    if (type === 'number') {
      if (draft.trim() === '') {
        onClear()
        setEditing(false)
        return
      }
      const n = Number(draft)
      if (Number.isNaN(n)) {
        setJsonError(ui.configs.invalidNumber)
        return
      }
      onChange(n)
      setEditing(false)
    }
  }

  const highlightKey = q && rowKey.toLowerCase().includes(q)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'grid border-b border-border-subtle items-center',
        hovered ? 'bg-row-hover' : isEven ? 'bg-row-even' : 'bg-row-odd',
      )}
      style={{ gridTemplateColumns: colTemplate }}
    >
      <div className={cn('flex items-center gap-1.5 min-w-0', isMobile ? 'px-2.5 py-2' : 'px-3 py-2')}>
        {isModified && <span className="size-1 rounded-full bg-brand shrink-0" />}
        <span className={cn('font-mono text-fg-key whitespace-nowrap overflow-hidden text-ellipsis', isMobile ? 'text-[11px]' : 'text-xs', highlightKey && 'text-fg-brand')}>
          {rowKey}
        </span>
        <span className="text-[10px] font-mono uppercase tracking-wide text-fg-muted bg-elevated border border-border rounded px-1.5 py-px shrink-0">
          {ui.configs.types[type]}
        </span>
      </div>

      {showBase && (
        <div className={cn('flex items-start min-w-0', isMobile ? 'px-2.5 py-2' : 'px-3 py-2')}>
          {type === 'json' ? (
            <ConfigJsonTrigger
              value={baseValue}
              isUnset={baseValue === undefined}
              onOpen={() => setJsonModal('base')}
            />
          ) : (
            <span className="text-[13px] text-fg-muted font-mono whitespace-nowrap overflow-hidden text-ellipsis">
              {displayConfigValue(baseValue) || <span className="text-fg-faint italic">{ui.configs.notSet}</span>}
            </span>
          )}
        </div>
      )}

      <div className={cn('flex flex-col justify-center min-w-0 gap-0.5', isMobile ? 'px-2.5 py-1' : 'px-3 py-1')}>
        {type === 'json' ? (
          <ConfigJsonTrigger
            value={targetValue}
            compareBase={isBaseLocale || baseValue === undefined ? undefined : baseValue}
            isUnset={isUnset}
            isModified={isModified}
            hovered={hovered}
            onOpen={() => setJsonModal('edit')}
          />
        ) : editing ? (
          <>
            <input
              ref={inputRef as RefObject<HTMLInputElement>}
              type={type === 'number' ? 'number' : 'text'}
              value={draft}
              onChange={e => { setDraft(e.target.value); setJsonError('') }}
              onBlur={commitScalar}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); commitScalar() }
                if (e.key === 'Escape') setEditing(false)
              }}
              className="w-full bg-input border border-border-brand rounded px-2 py-1 text-fg text-[13px] font-inherit outline-none min-h-7"
            />
            {jsonError && <span className="text-[10px] text-fg-warning">{jsonError}</span>}
          </>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={cn(
              'text-left text-[13px] overflow-hidden text-ellipsis w-full cursor-text rounded px-1.5 py-0.5 border border-solid bg-transparent font-inherit whitespace-nowrap',
              type === 'number' ? 'font-mono' : '',
              isUnset ? 'text-fg-faint italic' : isModified ? 'text-fg-brand-strong' : 'text-fg-secondary',
              hovered ? 'border-border-strong' : 'border-transparent',
            )}
          >
            {displayConfigValue(targetValue) || (isMobile ? ui.common.emptyDash : ui.configs.notSet)}
          </button>
        )}
      </div>

      <div className={cn('flex items-center justify-center gap-0.5', isMobile ? 'px-1' : 'px-2')}>
        {!isUnset && (
          <button
            type="button"
            title={ui.configs.clearOnLocale}
            onClick={onClear}
            className={cn(
              'size-6 rounded border-none bg-transparent text-fg-muted cursor-pointer text-[10px] leading-none',
              hovered ? 'opacity-100' : 'opacity-0',
            )}
          >
            ⌫
          </button>
        )}
        <button
          type="button"
          title={ui.configs.deleteKey}
          onClick={onDelete}
          className={cn(
            'size-6 rounded border-none bg-transparent text-fg-muted cursor-pointer text-sm leading-none',
            hovered ? 'opacity-100' : 'opacity-0',
          )}
        >
          {ui.common.close}
        </button>
      </div>

      {jsonModal === 'edit' && (
        <ConfigJsonModal
          rowKey={rowKey}
          value={targetValue}
          baseValue={isBaseLocale || baseValue === undefined ? undefined : baseValue}
          isMobile={isMobile}
          onSave={onChange}
          onClose={() => setJsonModal(null)}
        />
      )}
      {jsonModal === 'base' && (
        <ConfigJsonModal
          rowKey={rowKey}
          value={baseValue}
          readOnly
          isMobile={isMobile}
          onClose={() => setJsonModal(null)}
        />
      )}
    </div>
  )
}
