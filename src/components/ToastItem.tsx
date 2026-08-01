import type { Toast } from '../types'
import { cn } from '../helpers/cn'

const TOAST_ACCENT = {
  success: 'border-fg-success',
  error: 'border-fg-danger',
  info: 'border-brand',
} as const

export const ToastItem = ({ toast }: { toast: Toast }) => {
  return (
    <div
      className={cn(
        'px-4 py-2.5 bg-card border rounded-lg text-[13px] text-fg max-w-[340px] border-l-[3px] shadow-[var(--shadow-toast)]',
        TOAST_ACCENT[toast.type],
        toast.type === 'success' && 'border-fg-success/25',
        toast.type === 'error' && 'border-fg-danger/25',
        toast.type === 'info' && 'border-brand/25',
      )}
    >
      {toast.message}
    </div>
  )
}
