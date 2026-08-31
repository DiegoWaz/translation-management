import { useMemo, useState } from 'react'
import type { ExportFormat, LangFile, ToastType } from '../types'
import { cn } from '../helpers/cn'
import {
  buildSheetMatrix,
  generateCsvExport,
  generateJsonExport,
  generateNamespacedJsonPreview,
  generateNamespacedZip,
  generateTsvExport,
} from '../helpers/exportGenerators'
import { btnPrimaryClass, btnSecClass } from '../helpers/styles'
import { ui, t, localeSuffix } from '../i18n/ui'
import { Overlay } from './Overlay'

export const ExportModal = ({
  data,
  baseKeys,
  filteredKeys,
  configFiles,
  title,
  downloadBasename,
  onClose,
  showToast,
  isMobile,
}: {
  data: Record<string, Record<string, string>>
  baseKeys: string[]
  filteredKeys: string[]
  configFiles: LangFile[]
  title?: string
  downloadBasename?: string
  onClose: () => void
  showToast: (m: string, t: ToastType) => void
  isMobile: boolean
}) => {
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [previewMode, setPreviewMode] = useState<'table' | 'raw'>('table')
  const [selectedLangs, setSelectedLangs] = useState<Set<string>>(new Set(configFiles.map(f => f.lang)))
  const [keyScope, setKeyScope] = useState<'all' | 'filtered'>('all')
  const [copied, setCopied] = useState(false)

  const langs = configFiles.map(f => f.lang).filter(l => selectedLangs.has(l))
  const keys = keyScope === 'all' ? baseKeys : filteredKeys

  const output = useMemo(() => {
    if (format === 'json') return generateJsonExport(data, langs, keys)
    if (format === 'json-ns') return generateNamespacedJsonPreview(data, langs, keys)
    if (format === 'csv') return generateCsvExport(data, langs, keys)
    return generateTsvExport(data, langs, keys)
  }, [format, data, langs, keys])

  const matrix = useMemo(
    () => (format === 'json' || format === 'json-ns' ? [] : buildSheetMatrix(data, langs, keys)),
    [format, data, langs, keys],
  )

  const extMap = { json: 'json', 'json-ns': 'zip', csv: 'csv', tsv: 'tsv' } as const
  const mimeMap = { json: 'application/json', 'json-ns': 'application/zip', csv: 'text/csv;charset=utf-8', tsv: 'text/tab-separated-values' } as const
  const ext = extMap[format]
  const mime = mimeMap[format]

  const toggleLang = (l: string) => setSelectedLangs(prev => {
    const next = new Set(prev)
    next.has(l) ? next.delete(l) : next.add(l)
    return next
  })

  const handleCopy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      showToast(ui.toast.copiedClipboard, 'success')
    })
  }

  const handleDownload = () => {
    if (format === 'json-ns') {
      generateNamespacedZip(data, langs, keys).then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `${downloadBasename ?? 'export'}.zip`
        a.click()
        URL.revokeObjectURL(a.href)
        showToast(t(ui.toast.fileDownloaded, { ext: 'zip' }), 'success')
      })
      return
    }
    const blob = new Blob([output], { type: mime })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${downloadBasename ?? 'export'}.${ext}`
    a.click()
    URL.revokeObjectURL(a.href)
    showToast(t(ui.toast.fileDownloaded, { ext }), 'success')
  }

  const formatOptions = [
    { key: 'csv' as const, label: ui.export.formatCsv, hint: ui.export.formatCsvHint },
    { key: 'tsv' as const, label: ui.export.formatTsv, hint: ui.export.formatTsvHint },
    { key: 'json' as const, label: ui.export.formatJson, hint: ui.export.formatJsonHint },
    { key: 'json-ns' as const, label: ui.export.formatJsonNs, hint: ui.export.formatJsonNsHint },
  ]

  const keyScopeOptions = [
    { key: 'all' as const, label: t(ui.export.keysAll, { count: baseKeys.length }) },
    { key: 'filtered' as const, label: t(ui.export.keysFiltered, { count: filteredKeys.length }) },
  ]

  const showTable = format !== 'json' && format !== 'json-ns' && previewMode === 'table'

  return (
    <Overlay onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className={cn(
          'bg-card flex flex-col overflow-hidden',
          isMobile ? 'w-screen h-dvh max-h-dvh rounded-none border-none' : 'w-[860px] max-h-[85vh] rounded-xl border border-border',
        )}
      >
        <div className="px-6 py-[18px] border-b border-border flex justify-between items-center shrink-0">
          <div>
            <h2 className="m-0 mb-0.5 text-[15px] font-semibold text-fg">{title ?? ui.export.title}</h2>
            <p className="m-0 text-xs text-fg-muted">
              {t(ui.export.summary, {
                langs: langs.length,
                langsSuffix: localeSuffix(langs.length),
                keys: keys.length,
                keysSuffix: localeSuffix(keys.length),
              })}
            </p>
          </div>
          <button onClick={onClose} className="bg-transparent border-none text-fg-muted cursor-pointer text-xl">{ui.common.close}</button>
        </div>

        <div className={cn('flex flex-1 overflow-hidden', isMobile ? 'flex-col' : 'flex-row')}>
          <div className={cn(
            'shrink-0 flex gap-5',
            isMobile
              ? 'w-full flex-row flex-wrap px-4 py-3 border-b border-border overflow-x-auto overflow-y-hidden'
              : 'w-[220px] flex-col p-4 border-r border-border overflow-y-auto overflow-x-hidden',
          )}>
            <div>
              <div className="text-[10px] text-fg-muted font-semibold tracking-wider uppercase mb-2">{ui.export.format}</div>
              {formatOptions.map(({ key, label, hint }) => (
                <button
                  key={key}
                  onClick={() => setFormat(key)}
                  className={cn(
                    'flex flex-col gap-0.5 w-full px-2.5 py-2 mb-1 rounded-md cursor-pointer text-left',
                    format === key ? 'bg-accent-bg border border-border-brand-soft' : 'bg-transparent border border-border',
                  )}
                >
                  <span className={cn('text-xs', format === key ? 'text-fg-brand font-semibold' : 'text-fg-tertiary font-normal')}>{label}</span>
                  <span className="text-[10px] text-fg-muted font-mono">{hint}</span>
                </button>
              ))}
            </div>
            <div>
              <div className="text-[10px] text-fg-muted font-semibold tracking-wider uppercase mb-2">{ui.export.keys}</div>
              {keyScopeOptions.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setKeyScope(key)}
                  className={cn(
                    'block w-full text-left px-2.5 py-1.5 mb-0.5 rounded-md cursor-pointer text-xs font-inherit',
                    keyScope === key ? 'bg-accent-bg border border-border-brand-soft text-fg-brand' : 'bg-transparent border border-border text-fg-tertiary',
                  )}
                >{label}</button>
              ))}
            </div>
            <div>
              <div className="text-[10px] text-fg-muted font-semibold tracking-wider uppercase mb-2">{ui.export.languages}</div>
              {configFiles.map(f => (
                <button
                  key={f.lang}
                  onClick={() => toggleLang(f.lang)}
                  className={cn(
                    'flex items-center gap-2 w-full px-2.5 py-1.5 mb-0.5 rounded-md cursor-pointer text-left',
                    selectedLangs.has(f.lang) ? 'bg-elevated border border-border-strong' : 'bg-transparent border border-border',
                  )}
                >
                  <div className={cn(
                    'size-3.5 rounded-sm flex items-center justify-center text-[9px] text-fg-on-brand shrink-0 border-[1.5px]',
                    selectedLangs.has(f.lang) ? 'bg-brand border-brand' : 'bg-transparent border-fg-muted',
                  )}>{selectedLangs.has(f.lang) ? ui.common.check : ''}</div>
                  <span className={cn('text-xs', selectedLangs.has(f.lang) ? 'text-fg' : 'text-fg-tertiary')}>{f.flag} {f.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between shrink-0 gap-2">
              <span className="text-[11px] text-fg-muted">{ui.export.preview}</span>
              <div className="flex items-center gap-2">
                {format !== 'json' && format !== 'json-ns' && (
                  <div className="flex bg-elevated border border-border rounded-md overflow-hidden">
                    {(['table', 'raw'] as const).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPreviewMode(mode)}
                        className={cn(
                          'px-2 py-0.5 text-[10px] border-none cursor-pointer font-inherit',
                          previewMode === mode ? 'bg-brand-soft-bg text-fg-brand font-semibold' : 'bg-transparent text-fg-muted',
                        )}
                      >
                        {mode === 'table' ? ui.export.tableView : ui.export.rawView}
                      </button>
                    ))}
                  </div>
                )}
                <span className="text-[11px] text-fg-muted font-mono">{t(ui.common.characters, { count: output.length.toLocaleString() })}</span>
              </div>
            </div>

            {showTable ? (
              <div className="flex-1 overflow-auto bg-row-even">
                <table className="border-collapse text-[11px] font-mono min-w-full">
                  <thead className="sticky top-0 bg-surface">
                    <tr>
                      {matrix[0]?.map(cell => (
                        <th
                          key={cell}
                          className="text-left px-2.5 py-1.5 border-b border-r border-border text-fg-muted font-semibold whitespace-nowrap"
                        >
                          {cell}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.slice(1, 201).map((row, i) => (
                      <tr key={row[0] || i} className={i % 2 === 0 ? 'bg-row-odd' : 'bg-row-even'}>
                        {row.map((cell, j) => (
                          <td
                            key={`${i}-${j}`}
                            className="px-2.5 py-1 border-b border-r border-border-subtle text-fg-tertiary max-w-[220px] truncate"
                            title={cell}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {matrix.length > 201 && (
                  <div className="px-3 py-2 text-[10px] text-fg-muted">… +{matrix.length - 201} rows</div>
                )}
              </div>
            ) : (
              <pre className="flex-1 m-0 px-4 py-3.5 overflow-y-auto text-[11px] font-mono text-fg-tertiary leading-relaxed bg-row-even whitespace-pre break-all">
                {output.slice(0, 3000)}{output.length > 3000 && '\n…'}
              </pre>
            )}
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-border flex gap-2.5 justify-end shrink-0">
          <button onClick={onClose} className={btnSecClass}>{ui.export.close}</button>
          <button
            onClick={handleCopy}
            disabled={langs.length === 0}
            className={cn(
              btnSecClass,
              copied ? 'text-fg-success border-border-success' : 'text-fg-secondary border-border-strong',
            )}
          >{copied ? ui.export.copied : ui.export.copy}</button>
          <button
            onClick={handleDownload}
            disabled={langs.length === 0}
            className={cn(btnPrimaryClass, 'bg-success-bg border-border-success text-fg-success')}
          >{t(ui.export.download, { ext })}</button>
        </div>
      </div>
    </Overlay>
  )
}
