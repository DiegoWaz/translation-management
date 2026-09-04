import { useId } from 'react'
import { cn } from '../helpers/cn'
import { ui } from '../i18n/ui'

const LogoMark = ({ size, gradientId }: { size: number; gradientId: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    className="shrink-0"
  >
    <defs>
      <linearGradient id={gradientId} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="var(--brand)" />
        <stop offset="1" stopColor="var(--brand-soft)" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="8" fill={`url(#${gradientId})`} />
    <circle cx="16" cy="16" r="7.25" stroke="var(--text-on-brand)" strokeWidth="1.75" />
    <ellipse cx="16" cy="16" rx="3.25" ry="7.25" stroke="var(--text-on-brand)" strokeWidth="1.5" />
    <path d="M8.75 16h14.5" stroke="var(--text-on-brand)" strokeWidth="1.5" strokeLinecap="round" />
    <path
      d="M16 8.75v14.5"
      stroke="var(--text-on-brand)"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.85"
    />
  </svg>
)

export const Logo = ({
  size = 'sm',
  showWordmark = false,
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
  className?: string
}) => {
  const gradientId = useId()
  const markSize = size === 'lg' ? 40 : size === 'md' ? 32 : 26

  return (
    <div className={cn('flex items-center gap-2 shrink-0', size === 'lg' && 'gap-3', className)} aria-label={ui.app.name}>
      <LogoMark size={markSize} gradientId={gradientId} />
      {showWordmark && (
        <span className={cn(
          'font-semibold text-fg tracking-tight whitespace-nowrap',
          size === 'lg' ? 'text-2xl' : 'text-[13px]',
        )}>
          {ui.app.name}
        </span>
      )}
    </div>
  )
}
