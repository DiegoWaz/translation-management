import type { GitHubConfig } from '../types'
import { ui, plural } from '../i18n/ui'

export const StaleBanner = ({
  staleLangs,
  config,
  onReview,
  onReload,
  onDismiss,
}: {
  staleLangs: string[]
  config: GitHubConfig
  onReview: () => void
  onReload: () => void
  onDismiss: () => void
}) => {
  if (staleLangs.length === 0) return null

  return (
    <div className="flex items-center gap-2.5 px-4 py-2 bg-warning-bg border-b border-border-warning flex-wrap">
      <span className="text-[15px]">{ui.stale.icon}</span>
      <span className="flex-1 text-xs text-fg-stale leading-snug">
        <strong>{staleLangs.map(l => config.files.find(f => f.lang === l)?.flag ?? l).join(' ')}</strong>
        {' '}
        {plural(staleLangs.length, ui.stale.changedSingular, ui.stale.changedPlural)} {ui.stale.bySomeoneElse}
      </span>
      <button
        type="button"
        onClick={onReview}
        className="px-3 py-1 bg-elevated border border-fg-stale/40 rounded-md text-fg-stale text-xs cursor-pointer font-inherit whitespace-nowrap"
      >
        {ui.stale.review}
      </button>
      <button onClick={onReload} className="px-3 py-1 bg-border-warning border border-fg-stale/40 rounded-md text-fg-stale text-xs cursor-pointer font-inherit whitespace-nowrap">
        {ui.stale.reload}
      </button>
      <button onClick={onDismiss} className="bg-transparent border-none text-fg-stale-muted cursor-pointer text-base leading-none px-0.5">{ui.common.close}</button>
    </div>
  )
}
