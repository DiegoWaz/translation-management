import { ui } from '../i18n/ui'
import { SpinnerIcon } from './Icons'

/** Full-panel overlay shown while translations/configs are being fetched from GitHub. */
export const LoadingOverlay = () => {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-page/80 backdrop-blur-[1px]">
      <SpinnerIcon size={28} />
      <span className="text-sm text-fg-tertiary">{ui.topBar.loading}</span>
    </div>
  )
}
