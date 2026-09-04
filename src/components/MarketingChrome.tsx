import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../helpers/cn'
import { ui } from '../i18n/ui'
import { ROUTES } from '../routes'

/** Shared chrome for marketing pages (`/welcome`, `/features`). */
export const MarketingChrome = ({
  isMobile,
  showBackToApp,
  children,
}: {
  isMobile: boolean
  showBackToApp?: boolean
  children: ReactNode
}) => (
  <div className="relative min-h-dvh flex flex-col bg-page text-fg">
    <div
      className="pointer-events-none absolute inset-0 opacity-90"
      style={{
        background: `
          radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in srgb, var(--brand) 18%, transparent), transparent 55%),
          radial-gradient(ellipse 60% 40% at 100% 100%, color-mix(in srgb, var(--brand-soft) 14%, transparent), transparent 50%)
        `,
      }}
      aria-hidden
    />

    <header
      className={cn(
        'relative z-10 flex items-center justify-between border-b border-border-muted/60',
        isMobile ? 'px-4 py-3' : 'px-8 py-3.5',
      )}
    >
      {showBackToApp ? (
        <Link to={ROUTES.app} className="text-xs text-fg-muted hover:text-fg-brand no-underline">
          ← {ui.onboarding.backToApp}
        </Link>
      ) : (
        <span />
      )}
      <nav className={cn('flex items-center', isMobile ? 'gap-3 text-[11px]' : 'gap-4 text-xs')}>
        <Link to={ROUTES.welcome} className="text-fg-muted hover:text-fg-brand no-underline">
          {ui.footer.welcome}
        </Link>
        <Link to={ROUTES.features} className="text-fg-muted hover:text-fg-brand no-underline">
          {ui.footer.features}
        </Link>
        <Link to={ROUTES.app} className="text-fg-brand hover:text-fg-brand-strong no-underline font-medium">
          {ui.footer.app}
        </Link>
      </nav>
    </header>

    <div className="relative z-10 flex-1">{children}</div>
  </div>
)
