import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ImportFormat, JsonImportResult, LangFile, ParsedImport } from '../types'
import { cn } from '../helpers/cn'
import { resolveLocaleCode } from '../helpers/lang'
import { detectFormat, parseFreeText, parseJsonText, parseTableText } from '../helpers/importParsers'
import { btnPrimaryClass, btnSecClass } from '../helpers/styles'
import { ui, t, plural, localeSuffix } from '../i18n/ui'
import { Overlay } from './Overlay'

const KeyPicker = ({
  keys,
  value,
  onChange,
  onCreate,
}: {
  keys: string[]
  value: string
  onChange: (key: string) => void
  onCreate: (seed?: string) => void
}) => {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return keys.slice(0, 80)
    return keys.filter(k => k.toLowerCase().includes(q)).slice(0, 80)
  }, [keys, query])

  const pick = (key: string) => {
    onChange(key)
    setQuery(key)
    setOpen(false)
  }

  const createFromQuery = () => {
    const seed = query.trim()
    if (!seed) {
      onCreate()
      return
    }
    onCreate(seed)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="flex gap-1 min-w-0 w-full">
      <div className="relative flex-1 min-w-0">
        <input
          value={query}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={ui.import.searchKey}
          onFocus={() => setOpen(true)}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
            if (!e.target.value) onChange('')
          }}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              setOpen(false)
              setQuery(value)
            }
            if (e.key === 'Enter') {
              e.preventDefault()
              if (filtered[0]) pick(filtered[0])
              else if (query.trim()) createFromQuery()
            }
          }}
          className={cn(
            'w-full min-w-0 bg-input rounded px-2 py-1.5 text-[11px] font-mono outline-none',
            value ? 'border border-border-brand-soft text-fg-brand' : 'border border-border-strong text-fg',
          )}
        />
        {open && (
          <div
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-44 overflow-y-auto rounded-md border border-border bg-card shadow-lg"
          >
            {filtered.length === 0 ? (
              <div className="p-1.5 flex flex-col gap-1">
                <div className="px-1 py-1 text-[11px] text-fg-muted">{ui.import.noMatchingKeys}</div>
                {query.trim() && (
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={createFromQuery}
                    className="w-full text-left px-2.5 py-2 rounded-md text-[11px] font-mono border border-border-brand-soft bg-brand-soft-bg text-fg-brand cursor-pointer"
                  >
                    {t(ui.import.createKeyFromSearch, { key: query.trim() })}
                  </button>
                )}
              </div>
            ) : (
              filtered.map(key => (
                <button
                  key={key}
                  type="button"
                  role="option"
                  aria-selected={key === value}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => pick(key)}
                  className={cn(
                    'w-full text-left px-2.5 py-1.5 text-[11px] font-mono border-none cursor-pointer',
                    key === value ? 'bg-brand-soft-bg text-fg-brand' : 'bg-transparent text-fg hover:bg-row-hover',
                  )}
                >
                  {key}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        title={ui.import.newKeyPlaceholder}
        onClick={() => onCreate(query.trim() || undefined)}
        className="shrink-0 size-8 flex items-center justify-center bg-elevated border border-border-strong rounded text-fg-tertiary cursor-pointer text-base leading-none"
      >
        +
      </button>
    </div>
  )
}

export const BulkImportModal = ({ baseKeys, configFiles, onApplyParsed, onApplyJson, onClose, isMobile }: {
  baseKeys: string[]; configFiles: LangFile[]
  onApplyParsed: (assignments: Array<{ paragraphIndex: number; key: string }>, parsed: ParsedImport[]) => void
  onApplyJson: (data: Record<string, Record<string, string>>) => void
  onClose: () => void; isMobile: boolean
}) => {
  const [format, setFormat] = useState<ImportFormat>('text')
  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState<ParsedImport[]>([])
  const [jsonResult, setJsonResult] = useState<JsonImportResult | null>(null)
  const [jsonError, setJsonError] = useState('')
  const [assignments, setAssignments] = useState<Record<number, string>>({})
  const [newKeyInputs, setNewKeyInputs] = useState<Record<number, string>>({})
  const [creating, setCreating] = useState<Record<number, boolean>>({})

  const handleParse = (text: string, fmt: ImportFormat) => {
    setRawText(text); setAssignments({}); setJsonError('')
    if (!text.trim()) { setParsed([]); setJsonResult(null); return }
    if (fmt === 'json') {
      const r = parseJsonText(text)
      if (r) setJsonResult(r); else setJsonError(ui.import.jsonInvalid)
      setParsed([])
    } else {
      const result = fmt === 'table' ? parseTableText(text) : parseFreeText(text)
      setParsed(result); setJsonResult(null)
    }
  }

  const switchFormat = (fmt: ImportFormat) => { setFormat(fmt); handleParse(rawText, fmt) }

  const handleAutoDetectPaste = (text: string) => {
    const detected = detectFormat(text)
    setFormat(detected)
    handleParse(text, detected)
  }
  const maxParagraphs = parsed.reduce((m, p) => Math.max(m, p.paragraphs.length), 0)
  const resolvedLangs = parsed.map(p => {
    const langCode = resolveLocaleCode(p.localeCode)
    return { ...p, langCode, file: configFiles.find(f => f.lang === langCode), inConfig: Boolean(configFiles.find(f => f.lang === langCode)) }
  })
  const assignedCount = Object.values(assignments).filter(Boolean).length
  const totalValues = assignedCount * parsed.length
  const allKeys = [...new Set([...baseKeys, ...Object.values(newKeyInputs).filter(Boolean), ...Object.values(assignments).filter(Boolean)])].sort()

  const formatTabs: Array<{ key: ImportFormat; label: string; hint: string }> = [
    { key: 'text', label: ui.import.formatText, hint: ui.import.hintText },
    { key: 'table', label: ui.import.formatTable, hint: ui.import.hintTable },
    { key: 'json', label: ui.import.formatJson, hint: ui.import.hintJson },
  ]

  const placeholderByFormat: Record<ImportFormat, string> = {
    json: ui.import.placeholderJson,
    table: ui.import.placeholderTable,
    text: ui.import.placeholderText,
  }

  return (
    <Overlay onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className={cn(
          'bg-card flex flex-col overflow-hidden',
          isMobile ? 'w-screen h-dvh max-h-dvh rounded-none border-none' : 'w-[min(920px,calc(100vw-2rem))] max-h-[90vh] rounded-xl border border-border',
        )}
      >
        <div className="px-6 pt-[18px] border-b border-border shrink-0">
          <div className="flex justify-between items-start mb-3.5">
            <div>
              <h2 className="m-0 mb-1 text-[15px] font-semibold text-fg">{ui.import.title}</h2>
              <p className="m-0 text-xs text-fg-muted">{ui.import.subtitle}</p>
            </div>
            <button onClick={onClose} className="bg-transparent border-none text-fg-muted cursor-pointer text-xl">{ui.common.close}</button>
          </div>
          <div className="flex gap-0.5">
            {formatTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => switchFormat(tab.key)}
                className={cn(
                  'px-4 py-1.5 bg-transparent border-none text-xs cursor-pointer font-inherit -mb-px',
                  format === tab.key ? 'bg-elevated border-b-2 border-b-brand text-fg-brand font-semibold' : 'border-b-2 border-b-transparent text-fg-muted font-normal',
                )}
              >{tab.label}</button>
            ))}
          </div>
        </div>

        <div className={cn('flex flex-1 min-h-0 overflow-hidden', isMobile ? 'flex-col' : 'flex-row')}>
          <div className={cn(
            'shrink-0 flex flex-col',
            isMobile ? 'w-full max-h-[40%] px-4 py-3 border-b border-border' : 'w-[320px] p-4 border-r border-border',
          )}>
            <div className="text-[11px] text-fg-muted font-mono bg-row-even border border-border-muted rounded px-2.5 py-1.5 mb-2.5 leading-relaxed whitespace-pre overflow-hidden text-ellipsis">
              {formatTabs.find(tab => tab.key === format)?.hint}
            </div>
            <textarea
              value={rawText}
              onChange={e => handleParse(e.target.value, format)}
              onPaste={e => {
                e.preventDefault()
                const text = e.clipboardData.getData('text')
                handleAutoDetectPaste(text)
              }}
              placeholder={placeholderByFormat[format]}
              className="flex-1 bg-input border border-border-strong rounded-md px-3 py-2.5 text-fg-secondary text-xs font-mono outline-none resize-none leading-relaxed"
            />
            {jsonError && (
              <div className="text-[11px] text-fg-danger mt-2 px-2.5 py-1.5 bg-danger-bg rounded">{jsonError}</div>
            )}
            {parsed.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1">
                {resolvedLangs.map(l => (
                  <span
                    key={l.localeCode}
                    className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-[10px] border',
                      l.inConfig ? 'bg-success-bg text-fg-success border-border-success' : 'bg-warning-bg text-fg-demo border-border-warning',
                    )}
                  >{l.file?.flag ?? '?'} {l.localeCode}</span>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {format === 'json' && jsonResult ? (
              <JsonPreview data={jsonResult.data} configFiles={configFiles} />
            ) : parsed.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-fg-muted gap-2.5">
                <div className="text-[28px]">{ui.import.emptyArrow}</div>
                <div className="text-[13px] text-fg-tertiary">{ui.import.emptyHint}</div>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-border text-xs text-fg-tertiary shrink-0">
                  {t(ui.import.assignmentSummary, {
                    locales: parsed.length,
                    localesSuffix: localeSuffix(parsed.length),
                    columns: maxParagraphs,
                    columnsSuffix: localeSuffix(maxParagraphs),
                  })}
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                  {Array.from({ length: maxParagraphs }, (_, idx) => {
                    const preview = parsed.find(p => p.paragraphs[idx])?.paragraphs[idx] ?? ''
                    const isCreating = creating[idx]
                    const assignedLocales = resolvedLangs.filter(l => l.paragraphs[idx])
                    return (
                      <div key={idx} className="px-4 py-2.5 border-b border-border-subtle grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] gap-3 items-start">
                        <div className="min-w-0">
                          <div className="text-[10px] text-fg-muted font-semibold tracking-wider uppercase mb-1">{t(ui.import.column, { index: idx + 1 })}</div>
                          <div className="text-xs text-fg-tertiary bg-row-even border border-border-muted rounded px-2.5 py-1.5 leading-normal max-h-[52px] overflow-hidden">{preview}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {assignedLocales.slice(0, 5).map(l => (
                              <span key={l.localeCode} className="text-[9px] text-fg-muted bg-elevated px-1.5 py-px rounded-sm">{l.localeCode}</span>
                            ))}
                            {assignedLocales.length > 5 && (
                              <span className="text-[9px] text-fg-muted">{t(ui.common.moreCount, { count: assignedLocales.length - 5 })}</span>
                            )}
                          </div>
                        </div>
                        <div className="min-w-0 w-full">
                          <div className="text-[10px] text-fg-muted font-semibold tracking-wider uppercase mb-1">{ui.import.targetKey}</div>
                          {isCreating ? (
                            <div className="flex gap-1 min-w-0">
                              <input
                                autoFocus
                                value={newKeyInputs[idx] ?? ''}
                                onChange={e => setNewKeyInputs(p => ({ ...p, [idx]: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter') { const k = (newKeyInputs[idx] ?? '').trim(); if (k) { setAssignments(p => ({ ...p, [idx]: k })); setCreating(p => ({ ...p, [idx]: false })) } } if (e.key === 'Escape') setCreating(p => ({ ...p, [idx]: false })) }}
                                placeholder={ui.import.newKeyPlaceholder}
                                className="flex-1 min-w-0 bg-input border border-border-brand rounded px-2 py-1.5 text-fg text-[11px] font-mono outline-none"
                              />
                              <button
                                onClick={() => { const k = (newKeyInputs[idx] ?? '').trim(); if (k) { setAssignments(p => ({ ...p, [idx]: k })); setCreating(p => ({ ...p, [idx]: false })) } }}
                                className="shrink-0 bg-brand border-none rounded px-2 text-fg-on-brand cursor-pointer"
                              >{ui.common.check}</button>
                            </div>
                          ) : (
                            <KeyPicker
                              keys={allKeys}
                              value={assignments[idx] ?? ''}
                              onChange={key => setAssignments(p => ({ ...p, [idx]: key }))}
                              onCreate={seed => {
                                if (seed) {
                                  setAssignments(p => ({ ...p, [idx]: seed }))
                                  setNewKeyInputs(p => ({ ...p, [idx]: seed }))
                                  setCreating(p => ({ ...p, [idx]: false }))
                                  return
                                }
                                setNewKeyInputs(p => ({ ...p, [idx]: '' }))
                                setCreating(p => ({ ...p, [idx]: true }))
                              }}
                            />
                          )}
                          {assignments[idx] && (
                            <div className="text-[9px] text-fg-success mt-0.5 truncate">
                              {ui.common.check}{' '}
                              {t(plural(assignedLocales.length, ui.import.localesAssigned, ui.import.localesAssignedPlural), { count: assignedLocales.length })}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-border flex justify-between items-center shrink-0 gap-3">
          <div className="text-xs text-fg-muted min-w-0">
            {format === 'json' && jsonResult && (
              <span className="text-fg-success">
                {t(ui.import.detected, {
                  langs: Object.keys(jsonResult.data).length,
                  langsSuffix: localeSuffix(Object.keys(jsonResult.data).length),
                  keys: Object.keys(Object.values(jsonResult.data)[0] ?? {}).length,
                  keysSuffix: localeSuffix(Object.keys(Object.values(jsonResult.data)[0] ?? {}).length),
                })}
              </span>
            )}
            {format !== 'json' && parsed.length > 0 && assignedCount > 0 && (
              <span className="text-fg-success">
                {t(plural(totalValues, ui.import.valuesToImport, ui.import.valuesToImportPlural), { count: totalValues })}
              </span>
            )}
            {format !== 'json' && parsed.length > 0 && assignedCount === 0 && ui.import.assignAtLeastOne}
          </div>
          <div className="flex gap-2.5 shrink-0">
            <button onClick={onClose} className={btnSecClass}>{ui.common.cancel}</button>
            {format === 'json' ? (
              <button onClick={() => jsonResult && onApplyJson(jsonResult.data)} disabled={!jsonResult} className={btnPrimaryClass}>{ui.import.applyJson}</button>
            ) : (
              <button
                onClick={() => { const ass = Object.entries(assignments).filter(([, k]) => Boolean(k)).map(([i, k]) => ({ paragraphIndex: Number(i), key: k })); onApplyParsed(ass, parsed) }}
                disabled={assignedCount === 0 || parsed.length === 0}
                className={btnPrimaryClass}
              >
                {totalValues > 0 ? t(ui.import.applyWithCount, { count: totalValues }) : ui.import.apply}
              </button>
            )}
          </div>
        </div>
      </div>
    </Overlay>
  )
}

export const JsonPreview = ({ data, configFiles }: { data: Record<string, Record<string, string>>; configFiles: LangFile[] }) => {
  const langs = Object.keys(data)
  const allKeys = [...new Set(langs.flatMap(l => Object.keys(data[l] ?? {})))]
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="text-[11px] text-fg-muted mb-3">
        {t(ui.import.detected, {
          langs: langs.length,
          langsSuffix: localeSuffix(langs.length),
          keys: allKeys.length,
          keysSuffix: localeSuffix(allKeys.length),
        })}
      </div>
      <div className="flex flex-col gap-1.5">
        {langs.map(lang => {
          const file = configFiles.find(f => f.lang === lang)
          const keys = Object.keys(data[lang] ?? {})
          return (
            <div key={lang} className="bg-row-even border border-border-muted rounded-md px-3 py-2.5">
              <div className="text-xs font-semibold text-fg mb-1.5">
                {file?.flag ?? '?'} {file?.label ?? lang.toUpperCase()}{' '}
                <span className="text-[10px] text-fg-muted font-mono font-normal">{t(ui.import.keysInLang, { count: keys.length })}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {keys.slice(0, 8).map(k => (
                  <span key={k} className="text-[10px] font-mono bg-accent-bg px-1.5 py-px rounded text-fg-brand">{k}</span>
                ))}
                {keys.length > 8 && <span className="text-[10px] text-fg-muted">{t(ui.common.moreOthers, { count: keys.length - 8 })}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
