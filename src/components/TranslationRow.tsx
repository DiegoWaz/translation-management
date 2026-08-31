import { useState, useRef, useEffect } from 'react'
import type { LangFile } from '../types'
import { cn } from '../helpers/cn'
import { timeAgo } from '../helpers/format'
import { ui, t, plural } from '../i18n/ui'
import { Avatar } from './Avatar'
import { highlight } from './highlight'

export const TranslationRow = ({ rowKey, baseValue, targetValue, originalValue, lastModified, isEven, colTemplate, showBase, showLastMod, isMobile, onChange, onDelete, onShowKeyHistory, searchQuery, matchedLangs, configFiles, activeLang, missingVarsList }: {
  rowKey: string; baseValue: string; targetValue: string; originalValue: string
  lastModified?: { author: string; date: Date; sha: string }; isEven: boolean
  colTemplate: string; showBase: boolean; showLastMod: boolean; isMobile: boolean
  onChange: (v: string) => void; onDelete: () => void; onShowKeyHistory?: (key: string) => void
  searchQuery?: string; matchedLangs?: string[]; configFiles?: LangFile[]; activeLang?: string
  missingVarsList?: string[]
}) => {
  const [editing, setEditing] = useState(false)
  const [hovered, setHovered] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isModified = targetValue !== originalValue
  const isMissing = !targetValue
  const q = searchQuery ?? ''
  const missing = missingVarsList ?? []
  const otherMatches = (matchedLangs ?? []).filter(l => l !== activeLang)
  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select() } }, [editing])

  const missingVarsTitle = t(
    plural(missing.length, ui.table.missingVarsTitle, ui.table.missingVarsTitlePlural),
    { vars: missing.map(v => `{${v}}`).join(', ') },
  )

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn('grid border-b border-border-subtle', hovered ? 'bg-row-hover' : isEven ? 'bg-row-even' : 'bg-row-odd')}
      style={{ gridTemplateColumns: colTemplate }}
    >
      <div className={cn('flex items-center gap-1.5 min-w-0', isMobile ? 'px-2.5 py-2' : 'px-3 py-2')}>
        {isModified && <span className="size-1 rounded-full bg-brand shrink-0" />}
        {isMissing && !isModified && <span className="size-1 rounded-full bg-fg-warning shrink-0" />}
        {missing.length > 0 && (
          <span title={missingVarsTitle} className="text-[11px] shrink-0">⚠️</span>
        )}
        <span className={cn('font-mono text-fg-key whitespace-nowrap overflow-hidden text-ellipsis', isMobile ? 'text-[11px]' : 'text-xs')}>{highlight(rowKey, q)}</span>
      </div>

      {showBase && (
        <div className={cn('flex items-center min-w-0', isMobile ? 'px-2.5 py-2' : 'px-3 py-2')}>
          <span className="text-[13px] text-fg-muted whitespace-nowrap overflow-hidden text-ellipsis">
            {baseValue ? highlight(baseValue, q) : <span className="text-fg-faint italic">{ui.table.empty}</span>}
          </span>
        </div>
      )}

      <div className={cn('flex flex-col justify-center min-w-0 gap-0.5', isMobile ? 'px-2.5 py-1' : 'px-3 py-1')} onClick={() => setEditing(true)}>
        {editing ? (
          <textarea
            ref={inputRef}
            value={targetValue}
            onChange={e => onChange(e.target.value.replace(/\n/g, ''))}
            onBlur={() => setEditing(false)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setEditing(false) } if (e.key === 'Escape') setEditing(false) }}
            rows={1}
            className="w-full bg-input border border-border-brand rounded px-2 py-1 text-fg text-[13px] font-inherit outline-none resize-none leading-normal min-h-7"
          />
        ) : (
          <span className={cn(
            'text-[13px] whitespace-nowrap overflow-hidden text-ellipsis w-full cursor-text rounded px-1.5 py-0.5 border border-solid',
            isMissing ? 'text-fg-faint italic' : isModified ? 'text-fg-brand-strong' : 'text-fg-secondary',
            hovered ? 'border-border-strong' : 'border-transparent',
          )}>
            {targetValue ? highlight(targetValue, q) : (isMobile ? ui.common.emptyDash : ui.table.clickToTranslate)}
          </span>
        )}
        {missing.length > 0 && (
          <div className="flex gap-0.5 flex-wrap pl-1.5">
            {missing.map(v => (
              <span key={v} className="text-[10px] bg-warning-bg border border-fg-warning/30 rounded-full px-1.5 py-px text-fg-warning font-mono whitespace-nowrap">{t(ui.table.missingVar, { var: `{${v}}` })}</span>
            ))}
          </div>
        )}
        {q && otherMatches.length > 0 && (
          <div className="flex gap-0.5 flex-wrap pl-1.5">
            {otherMatches.map(lang => {
              const file = configFiles?.find(f => f.lang === lang)
              return <span key={lang} title={t(ui.table.foundInLang, { label: file?.label ?? lang })} className="text-[10px] bg-accent-bg border border-border-brand-soft rounded-full px-1 py-px text-fg-brand-strong whitespace-nowrap">{file?.flag ?? ''} {lang}</span>
            })}
          </div>
        )}
      </div>

      {showLastMod && (
        <div className={cn('flex items-center gap-1.5 overflow-hidden', isMobile ? 'px-2.5 py-2' : 'px-3 py-2')}>
          {lastModified ? (
            <>
              <Avatar name={lastModified.author} size={18} />
              <div className="overflow-hidden">
                <div className="text-[11px] text-fg-key whitespace-nowrap overflow-hidden text-ellipsis">{lastModified.author.split(' ')[0]}</div>
                <div className="text-[10px] text-fg-muted">{timeAgo(lastModified.date)}</div>
              </div>
            </>
          ) : <span className="text-[11px] text-fg-faint">{ui.common.emptyDash}</span>}
        </div>
      )}

      <div className="flex items-center justify-center gap-1">
        {hovered && onShowKeyHistory && (
          <button 
            onClick={() => onShowKeyHistory(rowKey)} 
            className="bg-transparent border-none text-fg-muted hover:text-fg-brand cursor-pointer text-sm p-1"
            title="View key history"
          >
            🕐
          </button>
        )}
        {hovered && <button onClick={onDelete} className="bg-transparent border-none text-fg-muted cursor-pointer text-sm p-1">{ui.common.close}</button>}
      </div>
    </div>
  )
}
