import { ui } from '../i18n/ui'
import { SpinnerIcon } from './Icons'

/** Blocks the whole app while GitHub operations are in progress. */
export const LoadingOverlay = ({ label }: { label?: string }) => {
  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 bg-page/90 backdrop-blur-sm"
      role="alert"
      aria-busy="true"
      aria-live="polite"
    >
      <SpinnerIcon size={32} />
      <span className="text-sm text-fg-tertiary">{label ?? ui.topBar.loading}</span>
    </div>
  )
}
