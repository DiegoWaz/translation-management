import { useMemo } from 'react'
import type { DuplicateKeyWarning, GitHubConfig } from '../types'
import { ui, t } from '../i18n/ui'

export const DuplicateKeysBanner = ({
  warnings,
  config,
  onDismiss,
}: {
  warnings: DuplicateKeyWarning[]
  config: GitHubConfig
  onDismiss: () => void
}) => {
  const preview = useMemo(() => warnings.slice(0, 5), [warnings])
  if (warnings.length === 0) return null

  return (
    <div className="flex items-start gap-2.5 px-4 py-2 bg-danger-bg border-b border-fg-danger/25 flex-wrap">
      <span className="text-[15px] shrink-0">{ui.duplicates.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="m-0 text-xs text-fg-danger leading-snug font-medium">
          {t(ui.duplicates.summary, { count: warnings.length })}
        </p>
        <ul className="m-0 mt-1.5 pl-4 text-[11px] text-fg-danger/90 space-y-1">
          {preview.map(w => {
            const langMeta = config.files.find(f => f.lang === w.lang)
            return (
              <li key={`${w.lang}:${w.key}`} className="font-mono break-all">
                <span className="font-sans">{langMeta?.flag ?? w.lang}</span>{' '}
                <strong>{w.key}</strong>
                {' — '}
                {w.entries.map(e => e.path).join(', ')}
              </li>
            )
          })}
        </ul>
        {warnings.length > preview.length && (
          <p className="m-0 mt-1 text-[10px] text-fg-danger/80">
            {t(ui.duplicates.more, { count: warnings.length - preview.length })}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="bg-transparent border-none text-fg-danger cursor-pointer text-base leading-none px-0.5 shrink-0"
      >
        {ui.common.close}
      </button>
    </div>
  )
}
