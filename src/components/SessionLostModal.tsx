import { GithubIcon } from './Icons'
import { btnPrimaryClass } from '../helpers/styles'
import { ui } from '../i18n/ui'

/** Blocks the app until the user reconnects to GitHub after auth failure. */
export const SessionLostModal = ({
  reason,
  onReconnect,
}: {
  reason?: string
  onReconnect: () => void
}) => {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-page/95 backdrop-blur-sm p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-lost-title"
    >
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="size-10 rounded-full bg-warning-bg flex items-center justify-center text-lg shrink-0">
            {ui.sessionLost.icon}
          </div>
          <h2 id="session-lost-title" className="m-0 text-base font-semibold text-fg">
            {ui.sessionLost.title}
          </h2>
        </div>
        <p className="m-0 text-sm text-fg-secondary leading-relaxed">
          {ui.sessionLost.message}
        </p>
        {reason && (
          <p className="mt-2 mb-0 text-[11px] text-fg-muted font-mono break-all leading-relaxed">
            {reason}
          </p>
        )}
        <p className="mt-3 mb-0 text-xs text-fg-muted leading-relaxed">
          {ui.sessionLost.draftHint}
        </p>
        <button
          type="button"
          onClick={onReconnect}
          className={`${btnPrimaryClass} w-full mt-5 flex items-center justify-center gap-2`}
        >
          <GithubIcon size={14} />
          {ui.sessionLost.reconnect}
        </button>
      </div>
    </div>
  )
}
