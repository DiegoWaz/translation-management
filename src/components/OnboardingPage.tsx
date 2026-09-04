import { Link } from 'react-router-dom'
import { cn } from '../helpers/cn'
import { btnPrimaryClass, btnSecClass } from '../helpers/styles'
import { Logo } from './Logo'
import { GithubIcon } from './Icons'
import { ui } from '../i18n/ui'
import { ROUTES } from '../routes'

/** Routed welcome page (`/welcome`) — product pitch, connect, or demo. */
export const OnboardingPage = ({
  onConnect,
  onDemo,
  isMobile,
  showBackToApp,
}: {
  onConnect: () => void
  onDemo: () => void
  isMobile: boolean
  showBackToApp?: boolean
}) => {
  const points = [
    ui.onboarding.pointEdit,
    ui.onboarding.pointDraft,
    ui.onboarding.pointPr,
  ]

  return (
    <div className="relative min-h-dvh overflow-y-auto bg-page text-fg">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in srgb, var(--brand) 18%, transparent), transparent 55%),
            radial-gradient(ellipse 60% 40% at 100% 100%, color-mix(in srgb, var(--brand-soft) 22%, transparent), transparent 50%)
          `,
        }}
        aria-hidden
      />

      <div
        className={cn(
          'relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center',
          isMobile ? 'gap-10 px-5 py-10' : 'gap-14 px-8 py-16',
        )}
      >
        {showBackToApp && (
          <Link
            to={ROUTES.app}
            className="absolute top-4 text-xs text-fg-muted hover:text-fg-brand no-underline"
            style={{ left: isMobile ? 20 : 32 }}
          >
            ← {ui.onboarding.backToApp}
          </Link>
        )}

        <header className={cn('flex flex-col', isMobile ? 'gap-5' : 'gap-6 max-w-xl')}>
          <Logo size="lg" showWordmark />
          <h1
            className={cn(
              'm-0 font-semibold tracking-tight text-fg text-balance',
              isMobile ? 'text-[1.75rem] leading-snug' : 'text-4xl leading-tight',
            )}
          >
            {ui.onboarding.headline}
          </h1>
          <p className={cn('m-0 text-fg-secondary text-pretty', isMobile ? 'text-sm leading-relaxed' : 'text-base leading-relaxed')}>
            {ui.onboarding.lead}
          </p>
          <p className="m-0 text-xs text-fg-muted">{ui.onboarding.audience}</p>
        </header>

        <div className={cn('grid items-start', isMobile ? 'gap-8' : 'grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-12')}>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {points.map(point => (
              <li
                key={point}
                className="flex gap-3 text-sm text-fg-secondary leading-snug"
              >
                <span className="mt-0.5 size-5 shrink-0 rounded-full bg-brand-soft-bg text-center text-[11px] font-bold leading-5 text-fg-brand" aria-hidden>
                  ✓
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <div
            className={cn(
              'overflow-hidden rounded-xl border border-border bg-card shadow-[0_12px_40px_hsl(0_0%_0%/0.08)]',
              isMobile && 'order-first',
            )}
            aria-hidden
          >
            <div className="flex items-center gap-2 border-b border-border-subtle bg-elevated/60 px-3 py-2">
              <span className="size-2 rounded-full bg-border-strong" />
              <span className="size-2 rounded-full bg-border-strong" />
              <span className="size-2 rounded-full bg-border-strong" />
              <span className="ml-2 font-mono text-[10px] text-fg-muted">fr-FR.json · en-GB.json</span>
            </div>
            <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-px bg-border-subtle text-[11px]">
              <div className="bg-card px-3 py-2 font-mono text-fg-muted">{ui.table.key}</div>
              <div className="bg-card px-3 py-2 text-fg-muted">{ui.common.base}</div>
              <div className="bg-card px-3 py-2 text-fg-muted">fr-FR</div>
              {[
                ['common.save', 'Save', 'Enregistrer'],
                ['auth.login', 'Sign in', 'Se connecter'],
                ['errors.network', 'Network error', 'Erreur réseau'],
              ].map(([key, base, target], i) => (
                <div key={key} className="contents">
                  <div className={cn('px-3 py-2.5 font-mono text-fg-key', i % 2 ? 'bg-row-odd' : 'bg-row-even')}>{key}</div>
                  <div className={cn('px-3 py-2.5 text-fg-muted', i % 2 ? 'bg-row-odd' : 'bg-row-even')}>{base}</div>
                  <div className={cn('px-3 py-2.5 text-fg-brand-strong', i % 2 ? 'bg-row-odd' : 'bg-row-even')}>{target}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={cn('flex flex-wrap items-center', isMobile ? 'flex-col gap-3' : 'gap-3')}>
          <button
            type="button"
            onClick={onConnect}
            className={cn(btnPrimaryClass, isMobile ? 'w-full justify-center py-2.5 text-sm' : 'px-5 py-2.5 text-sm')}
          >
            <GithubIcon size={18} />
            {ui.onboarding.connect}
          </button>
          <button
            type="button"
            onClick={onDemo}
            className={cn(btnSecClass, isMobile ? 'w-full justify-center py-2.5 text-sm' : 'px-5 py-2.5 text-sm')}
          >
            {ui.onboarding.demo}
          </button>
          <Link
            to={ROUTES.features}
            className={cn(
              'text-xs text-fg-brand hover:text-fg-brand-strong no-underline font-medium',
              isMobile && 'mt-1',
            )}
          >
            {ui.footer.features} →
          </Link>
        </div>
      </div>
    </div>
  )
}
