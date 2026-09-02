import { useEffect, useRef } from 'react'
import { ui } from '../i18n/ui'

export const AddKeyBar = ({
  value,
  onChange,
  onConfirm,
  onCancel,
}: {
  value: string
  onChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
}) => {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.focus()
    const pos = el.value.length
    el.setSelectionRange(pos, pos)
  }, [])

  return (
    <div className="px-4 py-2.5 border-b border-border bg-card flex gap-2">
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onConfirm()
          if (e.key === 'Escape') onCancel()
        }}
        placeholder={ui.addKey.placeholder}
        className="flex-1 bg-input border border-border-brand rounded-md px-2.5 py-1.5 text-fg text-xs font-mono outline-none"
      />
      <button onClick={onConfirm} className="px-3.5 py-1.5 bg-brand border-none rounded-md text-fg-on-brand text-xs cursor-pointer">{ui.common.add}</button>
      <button onClick={onCancel} className="px-2.5 py-1.5 bg-elevated border border-border rounded-md text-fg-tertiary text-xs cursor-pointer">{ui.common.close}</button>
    </div>
  )
}
