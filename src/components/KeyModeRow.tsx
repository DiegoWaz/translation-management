import { useState, useRef, useEffect } from 'react'
import type { LangFile } from '../types'
import { cn } from '../helpers/cn'
import { ui, t } from '../i18n/ui'
import { highlight } from './highlight'

export const KeyModeRow = ({ rowKey, translations, original, configFiles, baseLang, isEven, isMobile, onUpdate, onDelete, onRename, onShowKeyHistory, searchQuery }: {
  rowKey: string; translations: Record<string, Record<string, string>>; original: Record<string, Record<string, string>>
  configFiles: LangFile[]; baseLang: string; isEven: boolean; isMobile: boolean
  onUpdate: (lang: string, key: string, value: string) => void; onDelete: () => void
  onRename?: (oldKey: string, newKey: string) => boolean
  onShowKeyHistory?: (key: string) => void; searchQuery?: string
}) => {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [editingLang, setEditingLang] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [keyDraft, setKeyDraft] = useState(rowKey)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const q = searchQuery ?? ''

  useEffect(() => { if (editingLang && inputRef.current) { inputRef.current.focus(); inputRef.current.select() } }, [editingLang])
  useEffect(() => { if (renaming && renameInputRef.current) { renameInputRef.current.focus(); renameInputRef.current.select() } }, [renaming])

  const startRename = () => { setKeyDraft(rowKey); setRenaming(true) }
  const confirmRename = () => {
    if (onRename?.(rowKey, keyDraft)) setRenaming(false)
  }
  const cancelRename = () => { setKeyDraft(rowKey); setRenaming(false) }

  const baseValue = translations[baseLang]?.[rowKey] ?? ''
  const hasAnyModification = configFiles.some(f => (translations[f.lang]?.[rowKey] ?? '') !== (original[f.lang]?.[rowKey] ?? ''))
  const missingCount = configFiles.filter(f => f.lang !== baseLang && !translations[f.lang]?.[rowKey]).length
  const modifiedCount = configFiles.filter(f => (translations[f.lang]?.[rowKey] ?? '') !== (original[f.lang]?.[rowKey] ?? '')).length
  const filledCount = configFiles.filter(f => f.lang !== baseLang && translations[f.lang]?.[rowKey]).length
  const totalTarget = configFiles.filter(f => f.lang !== baseLang).length
  const overflowCount = configFiles.filter(f => f.lang !== baseLang).length - (isMobile ? 3 : 6)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmingDelete(false) }}
      className={cn(
        'border-b border-border-subtle',
        open ? 'bg-card' : hovered ? 'bg-row-hover' : isEven ? 'bg-row-even' : 'bg-row-odd',
      )}
    >
      <div className="flex items-center">
        <button
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
          {missingCount > 0 && !hasAnyModification && <span className="size-[5px] rounded-full bg-fg-warning shrink-0" />}
          {renaming ? (
            <input
              ref={renameInputRef}
              value={keyDraft}
              onClick={e => e.stopPropagation()}
              onChange={e => setKeyDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') cancelRename() }}
              onBlur={confirmRename}
              className={cn('font-mono bg-input border border-border-brand rounded px-1 py-0.5 outline-none min-w-0 flex-1', isMobile ? 'text-[11px]' : 'text-xs')}
            />
          ) : (
            <span className={cn(
              'font-mono flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap',
              isMobile ? 'text-[11px]' : 'text-xs',
              open ? 'text-fg-brand' : 'text-fg-key',
            )}>
              {highlight(rowKey, q)}
            </span>
          )}
          {!isMobile && !open && baseValue && (
            <span className="text-[11px] text-fg-muted italic overflow-hidden text-ellipsis whitespace-nowrap max-w-60 shrink">
              {baseValue.length > 60 ? baseValue.slice(0, 60) + '…' : baseValue}
            </span>
          )}
          {!open && (
            <div className="flex items-center gap-0.5 shrink-0">
              {configFiles.filter(f => f.lang !== baseLang).slice(0, isMobile ? 3 : 6).map(f => {
                const val = translations[f.lang]?.[rowKey] ?? ''
                const isModified = (val) !== (original[f.lang]?.[rowKey] ?? '')
                return (
                  <span
                    key={f.lang}
                    title={val ? `${f.label}: ${val}` : t(ui.table.missingInLang, { label: f.label })}
                    className={cn(isMobile ? 'text-[11px]' : 'text-[13px]', val ? 'opacity-100' : 'opacity-25', !isModified && 'grayscale-[0.3]')}
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
              {missingCount > 0 && (
                <span className="text-[9px] font-bold bg-warning-bg border border-border-warning rounded-[10px] px-1.5 py-px text-fg-warning">{t(ui.table.missingShortBadge, { count: missingCount })}</span>
              )}
              {modifiedCount > 0 && (
                <span className="text-[9px] font-bold bg-accent-bg border border-border-brand-soft rounded-[10px] px-1.5 py-px text-fg-brand">{t(ui.table.modifiedShortBadge, { count: modifiedCount })}</span>
              )}
              {!open && missingCount === 0 && modifiedCount === 0 && (
                <span className="text-[9px] text-fg-success bg-success-bg border border-border-success rounded-[10px] px-1.5 py-px">{filledCount}/{totalTarget}</span>
              )}
            </div>
          )}
        </button>

        {hovered && onRename && !confirmingDelete && (
          <button
            onClick={startRename}
            className="bg-transparent border-none text-fg-muted hover:text-fg-brand cursor-pointer text-sm px-2 shrink-0 leading-none"
            title={ui.table.editKeyTitle}
          >
            ✎
          </button>
        )}
        {hovered && !confirmingDelete && (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="bg-transparent border-none text-fg-muted hover:text-fg-danger cursor-pointer text-sm px-2.5 shrink-0 leading-none"
            title={ui.table.deleteKeyTitle}
          >
            {ui.common.close}
          </button>
        )}
        {confirmingDelete && (
          <div className="flex items-center gap-1 px-2 shrink-0">
            <span className="text-[10px] text-fg-danger whitespace-nowrap" title={t(ui.table.deleteKeyConfirm, { key: rowKey })}>{ui.table.deleteKeyConfirmShort}</span>
            <button
              onClick={onDelete}
              className="bg-transparent border-none text-fg-danger cursor-pointer text-xs font-bold p-1"
              title={ui.table.renameKeyConfirmTitle}
            >
              ✓
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="bg-transparent border-none text-fg-muted cursor-pointer text-xs p-1"
              title={ui.table.renameKeyCancelTitle}
            >
              {ui.common.close}
            </button>
          </div>
        )}
      </div>

      {open && (
        <div className={cn(
          'flex flex-col gap-1 border-t border-border-muted',
          isMobile ? 'px-3 pb-3 pt-1 pl-8' : 'px-5 pb-3.5 pt-1 pl-[42px]',
        )}>
          {configFiles.map(f => {
            const val = translations[f.lang]?.[rowKey] ?? ''
            const orig = original[f.lang]?.[rowKey] ?? ''
            const isModified = val !== orig
            const isMissing = !val
            const isEditing = editingLang === f.lang
            const isBase = f.lang === baseLang
            return (
              <div key={f.lang} className="flex items-center gap-2 min-h-[30px]">
                <div className={cn('flex items-center gap-1.5 shrink-0', isMobile ? 'w-[60px]' : 'w-[100px]')}>
                  <span className="text-sm">{f.flag}</span>
                  <span className={cn('text-[10px] font-mono', isModified ? 'text-fg-brand' : 'text-fg-muted')}>{f.lang}</span>
                  {isBase && <span className="text-[8px] text-fg-muted bg-elevated px-1 py-px rounded-sm tracking-wide">{ui.common.baseBadge}</span>}
                </div>
                <div className="flex-1 min-w-0" onClick={() => !isEditing && setEditingLang(f.lang)}>
                  {isEditing ? (
                    <textarea
                      ref={inputRef}
                      value={val}
                      onChange={e => onUpdate(f.lang, rowKey, e.target.value.replace(/\n/g, ''))}
                      onBlur={() => setEditingLang(null)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setEditingLang(null) } if (e.key === 'Escape') setEditingLang(null) }}
                      rows={1}
                      className="w-full bg-input border border-border-brand rounded px-2 py-1 text-fg text-xs font-inherit outline-none resize-none leading-normal box-border"
                    />
                  ) : (
                    <span className={cn(
                      'block text-xs whitespace-nowrap overflow-hidden text-ellipsis px-2 py-1 rounded border border-solid cursor-text',
                      isMissing ? 'text-fg-faint italic bg-row-even border-border-warning' : isModified ? 'text-fg-brand-strong bg-row-even border-border-accent' : isBase ? 'text-fg-muted bg-row-even border-border' : 'text-fg-secondary bg-row-even border-border',
                    )}>
                      {val || ui.table.clickToTranslateEllipsis}
                    </span>
                  )}
                </div>
                {isModified && <span className="size-[5px] rounded-full bg-brand shrink-0" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
