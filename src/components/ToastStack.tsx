import type { Toast } from '../types'
import { ToastItem } from './ToastItem'

export const ToastStack = ({ toasts }: { toasts: Toast[] }) => {
  return (
    <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-[1000]">
      {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
    </div>
  )
}
