import { Link } from 'react-router-dom'
import { cn } from '../helpers/cn'
import { ui } from '../i18n/ui'
import { ROUTES } from '../routes'

/** Slim footer — product links anytime. */
export const AppFooter = ({ isMobile }: { isMobile: boolean }) => (
  <footer
    className={cn(
      'shrink-0 flex items-center justify-between border-t border-border-muted bg-surface text-fg-muted',
      isMobile ? 'px-3 py-2 text-[10px] gap-2' : 'px-4 py-2 text-[11px] gap-4',
    )}
  >
    <span className="truncate">{ui.app.name}</span>
    <nav className="flex items-center gap-3 shrink-0">
      <Link
        to={ROUTES.welcome}
        className="text-fg-brand hover:text-fg-brand-strong no-underline font-medium"
      >
        {ui.footer.welcome}
      </Link>
      <Link
        to={ROUTES.features}
        className="text-fg-brand hover:text-fg-brand-strong no-underline font-medium"
      >
        {ui.footer.features}
      </Link>
    </nav>
  </footer>
)
