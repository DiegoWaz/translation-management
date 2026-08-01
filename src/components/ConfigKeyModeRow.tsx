import { useEffect, useRef, useState, type RefObject } from 'react'
import type { ConfigMap, ConfigValue, ConfigValueType, LangFile } from '../types'
import { cn } from '../helpers/cn'
import {
  displayConfigValue,
  hasConfigKey,
  valuesEqual,
} from '../helpers/configValues'
import { ui, t } from '../i18n/ui'
import { ConfigJsonModal, ConfigJsonTrigger } from './ConfigJsonModal'

const ConfigValueEditor = ({
  type,
  value,
  onChange,
  onDone,
}: {
  type: Exclude<ConfigValueType, 'json'>
  value: ConfigValue | undefined
  onChange: (v: ConfigValue) => void
  onDone: () => void
}) => {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (type === 'number') setDraft(value === undefined || value === null ? '' : String(value))
    else setDraft(typeof value === 'string' ? value : displayConfigValue(value))
    setError('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [type, value])

  const commit = () => {
    if (type === 'text') {
      onChange(draft)
      onDone()
      return
    }
    const n = Number(draft)
    if (draft.trim() === '' || Number.isNaN(n)) {
      setError(ui.configs.invalidNumber)
      return
    }
    onChange(n)
    onDone()
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
      <input
        ref={inputRef as RefObject<HTMLInputElement>}
        type={type === 'number' ? 'number' : 'text'}
        value={draft}
        onChange={e => { setDraft(e.target.value); setError('') }}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') onDone()
        }}
        className="w-full bg-input border border-border-brand rounded px-2 py-1 text-fg text-xs font-inherit outline-none box-border"
      />
      {error && <span className="text-[10px] text-fg-warning">{error}</span>}
    </div>
  )
}

export const ConfigKeyModeRow = ({
  rowKey,
  type,
  configs,
  original,
  configFiles,
  baseLang,
  isEven,
  isMobile,
  onUpdate,
  onDelete,
  searchQuery,
}: {
  rowKey: string
  type: ConfigValueType
  configs: Record<string, ConfigMap>
  original: Record<string, ConfigMap>
  configFiles: LangFile[]
  baseLang: string
  isEven: boolean
  isMobile: boolean
  onUpdate: (lang: string, key: string, value: ConfigValue) => void
  onDelete: () => void
  searchQuery?: string
}) => {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [editingLang, setEditingLang] = useState<string | null>(null)
  const [jsonModalLang, setJsonModalLang] = useState<string | null>(null)
  const q = (searchQuery ?? '').toLowerCase()
  const highlightKey = q && rowKey.toLowerCase().includes(q)

  const baseValue = configs[baseLang]?.[rowKey]
  const hasAnyModification = configFiles.some(f => !valuesEqual(configs[f.lang]?.[rowKey], original[f.lang]?.[rowKey]))
  const presentCount = configFiles.filter(f => hasConfigKey(configs[f.lang], rowKey)).length
  const unsetCount = configFiles.length - presentCount
  const modifiedCount = configFiles.filter(f => !valuesEqual(configs[f.lang]?.[rowKey], original[f.lang]?.[rowKey])).length
  const overflowCount = configFiles.length - (isMobile ? 3 : 6)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'border-b border-border-subtle',
        open ? 'bg-card' : hovered ? 'bg-row-hover' : isEven ? 'bg-row-even' : 'bg-row-odd',
      )}
    >
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={cn(
            'flex-1 flex items-center gap-2.5 bg-transparent border-none cursor-pointer text-left text-inherit min-w-0',
            isMobile ? 'px-3 py-2.5' : 'px-5 py-2.5',
          )}
        >
          <span className={cn(
            'text-[10px] inline-block shrink-0 transition-transform duration-150',
            open ? 'text-fg-brand rotate-90' : 'text-fg-faint rotate-0',
          )}>▶</span>
          {hasAnyModification && <span className="size-[5px] rounded-full bg-brand shrink-0" />}
          <span className={cn(
            'font-mono flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap',
            isMobile ? 'text-[11px]' : 'text-xs',
            open || highlightKey ? 'text-fg-brand' : 'text-fg-key',
          )}>
            {rowKey}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wide text-fg-muted bg-elevated border border-border rounded px-1.5 py-px shrink-0">
            {ui.configs.types[type]}
          </span>
          {!isMobile && !open && (
            <span className="text-[11px] text-fg-muted font-mono italic overflow-hidden text-ellipsis whitespace-nowrap max-w-48 shrink">
              {displayConfigValue(baseValue) || ui.configs.notSet}
            </span>
          )}
          {!open && (
            <div className="flex items-center gap-0.5 shrink-0">
              {configFiles.slice(0, isMobile ? 3 : 6).map(f => {
                const present = hasConfigKey(configs[f.lang], rowKey)
                const isModified = !valuesEqual(configs[f.lang]?.[rowKey], original[f.lang]?.[rowKey])
                return (
                  <span
                    key={f.lang}
                    title={present ? `${f.label}: ${displayConfigValue(configs[f.lang]?.[rowKey])}` : t(ui.configs.unsetInLang, { label: f.label })}
                    className={cn(isMobile ? 'text-[11px]' : 'text-[13px]', present ? 'opacity-100' : 'opacity-25', !isModified && 'grayscale-[0.3]')}
                  >{f.flag}</span>
                )
              })}
              {overflowCount > 0 && (
                <span className="text-[10px] text-fg-muted">{t(ui.common.moreCount, { count: overflowCount })}</span>
              )}
            </div>
          )}
          {!isMobile && (
            <div className="flex gap-1 shrink-0">
              {modifiedCount > 0 && (
                <span className="text-[9px] font-bold bg-accent-bg border border-border-brand-soft rounded-[10px] px-1.5 py-px text-fg-brand">{t(ui.table.modifiedShortBadge, { count: modifiedCount })}</span>
              )}
              {!open && (
                <span className="text-[9px] text-fg-muted bg-elevated border border-border rounded-[10px] px-1.5 py-px">
                  {presentCount}/{configFiles.length}
                  {unsetCount > 0 ? ` · ${unsetCount}` : ''}
                </span>
              )}
            </div>
          )}
        </button>

        {hovered && (
          <button type="button" onClick={onDelete} className="bg-transparent border-none text-fg-muted cursor-pointer text-sm px-2.5 shrink-0 leading-none">{ui.common.close}</button>
        )}
      </div>

      {open && (
        <div className={cn(
          'flex flex-col gap-1 border-t border-border-muted',
          isMobile ? 'px-3 pb-3 pt-1 pl-8' : 'px-5 pb-3.5 pt-1 pl-[42px]',
        )}>
          {configFiles.map(f => {
            const val = configs[f.lang]?.[rowKey]
            const isModified = !valuesEqual(val, original[f.lang]?.[rowKey])
            const isUnset = !hasConfigKey(configs[f.lang], rowKey)
            const isEditing = editingLang === f.lang
            const isBase = f.lang === baseLang
            return (
              <div key={f.lang} className="flex items-start gap-2 min-h-[30px]">
                <div className={cn('flex items-center gap-1.5 shrink-0 pt-1', isMobile ? 'w-[60px]' : 'w-[100px]')}>
                  <span className="text-sm">{f.flag}</span>
                  <span className={cn('text-[10px] font-mono', isModified ? 'text-fg-brand' : 'text-fg-muted')}>{f.lang}</span>
                  {isBase && <span className="text-[8px] text-fg-muted bg-elevated px-1 py-px rounded-sm tracking-wide">{ui.common.baseBadge}</span>}
                </div>
                {isEditing && type !== 'json' ? (
                  <ConfigValueEditor
                    type={type}
                    value={val}
                    onChange={v => onUpdate(f.lang, rowKey, v)}
                    onDone={() => setEditingLang(null)}
                  />
                ) : type === 'json' ? (
                  <div className="flex-1 min-w-0">
                    <ConfigJsonTrigger
                      value={val}
                      compareBase={f.lang === baseLang || baseValue === undefined ? undefined : baseValue}
                      isUnset={isUnset}
                      isModified={isModified}
                      onOpen={() => setJsonModalLang(f.lang)}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingLang(f.lang)}
                    className={cn(
                      'flex-1 min-w-0 text-left block text-xs overflow-hidden text-ellipsis px-2 py-1 rounded border border-solid bg-transparent font-inherit cursor-text whitespace-nowrap',
                      type !== 'text' && 'font-mono',
                      isUnset ? 'text-fg-faint italic bg-row-even border-border' : isModified ? 'text-fg-brand-strong bg-row-even border-border-accent' : 'text-fg-secondary bg-row-even border-border',
                    )}
                  >
                    {displayConfigValue(val) || ui.configs.notSet}
                  </button>
                )}
                {isModified && <span className="size-[5px] rounded-full bg-brand shrink-0 mt-2" />}
              </div>
            )
          })}
        </div>
      )}

      {jsonModalLang !== null && (
        <ConfigJsonModal
          rowKey={rowKey}
          value={configs[jsonModalLang]?.[rowKey]}
          baseValue={
            jsonModalLang === baseLang || baseValue === undefined
              ? undefined
              : baseValue
          }
          isMobile={isMobile}
          onSave={v => {
            onUpdate(jsonModalLang, rowKey, v)
            setJsonModalLang(null)
          }}
          onClose={() => setJsonModalLang(null)}
        />
      )}
    </div>
  )
}
