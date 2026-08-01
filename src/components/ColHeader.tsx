import { cn } from '../helpers/cn'

export const ColHeader = ({ label, accent }: { label: string; accent?: boolean }) => {
  return (
    <div className={cn('px-3 py-2 text-[11px] font-semibold tracking-wide uppercase select-none', accent ? 'text-fg-brand' : 'text-fg-muted')}>
      {label}
    </div>
  )
}
