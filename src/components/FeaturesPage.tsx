import { cn } from '../helpers/cn'
import { Logo } from './Logo'
import { MarketingChrome } from './MarketingChrome'
import { ui } from '../i18n/ui'

/** Routed features overview (`/features`) — mirrors product scope in docs/features.md. */
export const FeaturesPage = ({
  isMobile,
  showBackToApp = true,
}: {
  isMobile: boolean
  showBackToApp?: boolean
}) => {
  const f = ui.featuresPage

  return (
    <MarketingChrome isMobile={isMobile} showBackToApp={showBackToApp}>
      <div
        className={cn(
          'mx-auto w-full max-w-3xl',
          isMobile ? 'px-5 py-8' : 'px-8 py-12',
        )}
      >
        <header className={cn('flex flex-col', isMobile ? 'gap-4 mb-8' : 'gap-5 mb-12')}>
          <Logo size="md" showWordmark />
          <h1
            className={cn(
              'm-0 font-semibold tracking-tight text-fg text-balance',
              isMobile ? 'text-2xl leading-snug' : 'text-3xl leading-tight',
            )}
          >
            {f.title}
          </h1>
          <p className="m-0 text-fg-secondary text-pretty text-sm leading-relaxed">{f.lead}</p>
          <p className="m-0 font-mono text-[11px] text-fg-muted bg-elevated border border-border-subtle rounded-lg px-3 py-2.5">
            {f.flow}
          </p>
        </header>

        <section className="mb-10">
          <h2 className="m-0 mb-3 text-sm font-semibold text-fg">{f.audienceTitle}</h2>
          <div className={cn('grid gap-3', !isMobile && 'grid-cols-2')}>
            <div className="rounded-lg border border-border bg-card px-3.5 py-3">
              <div className="text-xs font-semibold text-fg-brand mb-1">{f.audienceDevTitle}</div>
              <p className="m-0 text-xs text-fg-secondary leading-relaxed">{f.audienceDev}</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-3.5 py-3">
              <div className="text-xs font-semibold text-fg-muted mb-1">{f.audienceOutTitle}</div>
              <p className="m-0 text-xs text-fg-secondary leading-relaxed">{f.audienceOut}</p>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="m-0 mb-3 text-sm font-semibold text-fg">{f.absentTitle}</h2>
          <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
            {f.absent.map(item => (
              <li key={item} className="flex gap-2 text-xs text-fg-secondary leading-snug">
                <span className="text-fg-faint shrink-0" aria-hidden>—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {f.sections.map(section => (
          <section key={section.title} className="mb-10 last:mb-0">
            <h2 className="m-0 mb-3 text-sm font-semibold text-fg">{section.title}</h2>
            <ul className="m-0 p-0 list-none flex flex-col gap-2">
              {section.items.map(item => (
                <li key={item} className="flex gap-2.5 text-sm text-fg-secondary leading-snug">
                  <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </MarketingChrome>
  )
}
