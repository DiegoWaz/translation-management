import type { ConfigValueType } from '../types'
import { CONFIG_VALUE_TYPES } from '../helpers/configValues'
import { ui } from '../i18n/ui'

export const AddConfigKeyBar = ({
  value,
  onChange,
  type,
  onTypeChange,
  onConfirm,
  onCancel,
}: {
  value: string
  onChange: (v: string) => void
  type: ConfigValueType
  onTypeChange: (t: ConfigValueType) => void
  onConfirm: () => void
  onCancel: () => void
}) => {
  return (
    <div className="px-4 py-2.5 border-b border-border bg-card flex gap-2 items-center flex-wrap">
      <input
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onConfirm()
          if (e.key === 'Escape') onCancel()
        }}
        placeholder={ui.configs.keyPlaceholder}
        className="flex-1 min-w-[140px] bg-input border border-border-brand rounded-md px-2.5 py-1.5 text-fg text-xs font-mono outline-none"
      />
      <select
        value={type}
        onChange={e => onTypeChange(e.target.value as ConfigValueType)}
        className="bg-input border border-border-strong rounded-md px-2.5 py-1.5 text-fg text-xs font-inherit outline-none"
      >
        {CONFIG_VALUE_TYPES.map(t => (
          <option key={t} value={t}>{ui.configs.types[t]}</option>
        ))}
      </select>
      <button onClick={onConfirm} className="px-3.5 py-1.5 bg-brand border-none rounded-md text-fg-on-brand text-xs cursor-pointer">{ui.common.add}</button>
      <button onClick={onCancel} className="px-2.5 py-1.5 bg-elevated border border-border rounded-md text-fg-tertiary text-xs cursor-pointer">{ui.common.close}</button>
    </div>
  )
}
