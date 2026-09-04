import { useEffect, useRef } from 'react'
import { cn } from '../helpers/cn'
import { ui, t } from '../i18n/ui'

/** Inline panel: pick a new key name, then create in-app or download CSV under that name. */
export const KeyCopyBar = ({
  sourceKey,
  value,
  onChange,
  onDuplicate,
  onExport,
  onCancel,
  compact,
}: {
  sourceKey: string
  value: string
  onChange: (v: string) => void
  onDuplicate: () => void
  onExport: () => void
  onCancel: () => void
  compact?: boolean
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [])

  return (
    <div
      className={cn(
        'flex items-center min-w-0 w-full',
        compact ? 'gap-1.5' : 'gap-2',
      )}
      onClick={e => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); onDuplicate() }
          if (e.key === 'Escape') onCancel()
        }}
        placeholder={ui.table.duplicateKeyPlaceholder}
        title={t(ui.table.duplicateKeyHint, { key: sourceKey })}
        className={cn(
          'font-mono bg-input border border-border-brand rounded-md outline-none min-w-0 flex-1 text-fg',
          compact ? 'text-xs px-2 py-1.5' : 'text-sm px-2.5 py-2',
        )}
      />
      <button
        type="button"
        onClick={onDuplicate}
        className={cn(
          'bg-brand border-none rounded-md text-fg-on-brand font-semibold cursor-pointer shrink-0 whitespace-nowrap',
          compact ? 'text-xs px-2.5 py-1.5' : 'text-sm px-3 py-2',
        )}
        title={ui.table.duplicateKeyConfirmTitle}
      >
        {ui.table.duplicateKeyCreate}
      </button>
      <button
        type="button"
        onClick={onExport}
        className={cn(
          'bg-elevated border border-border-strong rounded-md text-fg-brand cursor-pointer shrink-0 whitespace-nowrap',
          compact ? 'text-xs px-2.5 py-1.5' : 'text-sm px-3 py-2',
        )}
        title={ui.table.duplicateKeyExportTitle}
      >
        {ui.table.duplicateKeyExport}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className={cn(
          'bg-transparent border-none text-fg-muted hover:text-fg cursor-pointer shrink-0 leading-none',
          compact ? 'text-base px-1.5 py-1' : 'text-lg px-2 py-1',
        )}
        title={ui.table.renameKeyCancelTitle}
      >
        {ui.common.close}
      </button>
    </div>
  )
}
