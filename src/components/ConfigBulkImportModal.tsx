import { useRef, useState } from 'react'
import type { ConfigMap, ConfigSchema, LangFile } from '../types'
import { cn } from '../helpers/cn'
import {
  mergeConfigImport,
  parseConfigImportJson,
  payloadFromLocaleFiles,
  type ConfigImportPayload,
} from '../helpers/configImport'
import { btnPrimaryClass, btnSecClass } from '../helpers/styles'
import { t, ui } from '../i18n/ui'
import { Overlay } from './Overlay'

type SourceMode = 'paste' | 'files'

export const ConfigBulkImportModal = ({
  schema,
  configs,
  configFiles,
  onApply,
  onClose,
  isMobile,
}: {
  schema: ConfigSchema
  configs: Record<string, ConfigMap>
  configFiles: LangFile[]
  onApply: (next: {
    schema: ConfigSchema
    configs: Record<string, ConfigMap>
    valueCount: number
    keysAdded: number
    langsTouched: number
  }) => void
  onClose: () => void
  isMobile: boolean
}) => {
  const knownLangs = configFiles.map(f => f.lang)
  const fileRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<SourceMode>('files')
  const [rawText, setRawText] = useState('')
  const [fileNames, setFileNames] = useState<string[]>([])
  const [payload, setPayload] = useState<ConfigImportPayload | null>(null)
  const [error, setError] = useState('')
  const [addMissingKeys, setAddMissingKeys] = useState(true)

  const applyParseResult = (
    result: { ok: true; payload: ConfigImportPayload } | { ok: false; error: string },
  ) => {
    if (!result.ok) {
      setPayload(null)
      setError(
        result.error === 'no_locales'
          ? ui.import.configsNoLocales
          : result.error === 'root_not_object'
            ? ui.import.configsInvalid
            : t(ui.import.configsParseError, { message: result.error }),
      )
      return
    }
    setError('')
    setPayload(result.payload)
  }

  const handlePaste = (text: string) => {
    setRawText(text)
    setFileNames([])
    if (!text.trim()) {
      setPayload(null)
      setError('')
      return
    }
    applyParseResult(parseConfigImportJson(text, knownLangs))
  }

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return
    const files = [...list]
    setFileNames(files.map(f => f.name))
    setRawText('')
    setMode('files')
    try {
      const texts = await Promise.all(
        files.map(async f => ({ name: f.name, text: await f.text() })),
      )
      applyParseResult(payloadFromLocaleFiles(texts, knownLangs))
    } catch (e) {
      setPayload(null)
      setError(t(ui.import.configsParseError, { message: (e as Error).message }))
    }
  }

  const preview = payload
    ? mergeConfigImport(schema, configs, payload, { addMissingKeys, knownLangs })
    : null

  const canApply = Boolean(preview && (preview.valueCount > 0 || preview.keysAdded > 0))

  const handleApply = () => {
    if (!payload || !preview || !canApply) return
    onApply({
      schema: preview.schema,
      configs: preview.configs,
      valueCount: preview.valueCount,
      keysAdded: preview.keysAdded,
      langsTouched: preview.langsTouched.length,
    })
  }

  return (
    <Overlay onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className={cn(
          'bg-card flex flex-col overflow-hidden',
          isMobile ? 'w-screen h-dvh max-h-dvh rounded-none border-none' : 'w-[720px] max-h-[90vh] rounded-xl border border-border',
        )}
      >
        <div className="px-6 pt-[18px] pb-3 border-b border-border shrink-0">
          <div className="flex justify-between items-start gap-3">
            <div>
              <h2 className="m-0 mb-1 text-[15px] font-semibold text-fg">{ui.import.configsTitle}</h2>
              <p className="m-0 text-xs text-fg-muted">{ui.import.configsSubtitle}</p>
            </div>
            <button type="button" onClick={onClose} className={cn(btnSecClass, 'shrink-0 py-1.5 px-3 text-xs')}>
              {ui.common.close}
            </button>
          </div>

          <div className="flex gap-1 mt-3">
            {([
              ['files', ui.import.configsModeFiles],
              ['paste', ui.import.configsModePaste],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={cn(
                  'px-2.5 py-1 text-[11px] rounded-md border cursor-pointer font-inherit',
                  mode === key
                    ? 'border-border-brand-soft bg-accent-bg text-fg-brand font-semibold'
                    : 'border-border bg-elevated text-fg-muted',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 flex flex-col gap-3">
          {mode === 'files' ? (
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                multiple
                className="hidden"
                onChange={e => handleFiles(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="px-3 py-6 rounded-lg border border-dashed border-border-strong bg-elevated text-sm text-fg-tertiary cursor-pointer font-inherit hover:border-border-brand-soft hover:text-fg-brand"
              >
                {ui.import.configsPickFiles}
              </button>
              {fileNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {fileNames.map(name => (
                    <span key={name} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-row-even border border-border text-fg-muted">
                      {name}
                    </span>
                  ))}
                </div>
              )}
              <p className="m-0 text-[11px] text-fg-muted">{ui.import.configsFilesHint}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <textarea
                value={rawText}
                onChange={e => handlePaste(e.target.value)}
                placeholder={ui.import.configsPlaceholderJson}
                spellCheck={false}
                className="w-full min-h-40 resize-y bg-input border border-border rounded-lg px-3 py-2 text-[12px] font-mono text-fg outline-none focus:border-border-brand"
              />
              <p className="m-0 text-[11px] text-fg-muted">{ui.import.configsPasteHint}</p>
            </div>
          )}

          <label className="flex items-center gap-2 text-xs text-fg-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={addMissingKeys}
              onChange={e => setAddMissingKeys(e.target.checked)}
              className="accent-[var(--brand)]"
            />
            {ui.import.configsAddKeys}
          </label>

          {error && (
            <div className="text-xs text-fg-warning bg-warning-bg border border-border-warning rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {preview && payload && (
            <div className="border border-border rounded-lg bg-elevated overflow-hidden">
              <div className="px-3 py-2 border-b border-border text-xs text-fg-secondary">
                {t(ui.import.configsPreview, {
                  langs: preview.langsTouched.length || Object.keys(payload.locales).length,
                  values: preview.valueCount,
                  keys: preview.keysAdded,
                })}
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-border-subtle">
                {Object.entries(payload.locales).map(([lang, map]) => {
                  const file = configFiles.find(f => f.lang === lang)
                  const keys = Object.keys(map)
                  return (
                    <div key={lang} className="px-3 py-2 flex items-start gap-2 text-xs">
                      <span className="shrink-0">{file?.flag}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-fg-brand font-medium">{lang}</div>
                        <div className="text-fg-muted font-mono text-[10px] mt-0.5 break-all">
                          {keys.slice(0, 12).join(', ')}
                          {keys.length > 12 ? ` · +${keys.length - 12}` : ''}
                        </div>
                      </div>
                      <span className="shrink-0 text-fg-muted">{t(ui.import.keysInLang, { count: keys.length })}</span>
                    </div>
                  )
                })}
              </div>
              {(preview.skippedKeys.length > 0 || payload.warnings.length > 0) && (
                <div className="px-3 py-2 border-t border-border text-[10px] text-fg-warning space-y-0.5">
                  {preview.skippedKeys.length > 0 && (
                    <div>{t(ui.import.configsSkippedKeys, { keys: preview.skippedKeys.slice(0, 8).join(', ') })}</div>
                  )}
                  {payload.warnings.filter(w => w.startsWith('unmatched_file:')).length > 0 && (
                    <div>
                      {t(ui.import.configsUnmatchedFiles, {
                        files: payload.warnings
                          .filter(w => w.startsWith('unmatched_file:'))
                          .map(w => w.slice('unmatched_file:'.length))
                          .join(', '),
                      })}
                    </div>
                  )}
                  {payload.warnings.filter(w => w.startsWith('unknown_lang:')).length > 0 && (
                    <div>
                      {t(ui.import.configsUnknownLangs, {
                        langs: payload.warnings
                          .filter(w => w.startsWith('unknown_lang:'))
                          .map(w => w.slice('unknown_lang:'.length))
                          .join(', '),
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!payload && !error && (
            <div className="text-center text-xs text-fg-faint py-6">{ui.import.configsEmpty}</div>
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-border flex justify-end gap-2 shrink-0">
          <button type="button" onClick={onClose} className={btnSecClass}>{ui.common.cancel}</button>
          <button
            type="button"
            disabled={!canApply}
            onClick={handleApply}
            className={cn(btnPrimaryClass, !canApply && 'opacity-40 cursor-default')}
          >
            {canApply
              ? t(ui.import.configsApply, { count: preview?.valueCount ?? 0 })
              : ui.import.configsApplyDisabled}
          </button>
        </div>
      </div>
    </Overlay>
  )
}
