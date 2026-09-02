import { useEffect, useRef } from 'react'
import { cn } from '../helpers/cn'

export const ColHeader = ({
  label,
  accent,
  resizable,
  onResize,
  onResetWidth,
}: {
  label: string
  accent?: boolean
  /** Drag the right edge to resize this column. */
  resizable?: boolean
  onResize?: (deltaX: number) => void
  /** Double-click the handle to restore the default width. */
  onResetWidth?: () => void
}) => {
  const dragging = useRef(false)
  const lastX = useRef(0)

  useEffect(() => {
    if (!resizable || !onResize) return

    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const delta = e.clientX - lastX.current
      lastX.current = e.clientX
      if (delta !== 0) onResize(delta)
    }
    const onUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [resizable, onResize])

  return (
    <div className={cn(
      'relative px-3 py-2 text-[11px] font-semibold tracking-wide uppercase select-none',
      accent ? 'text-fg-brand' : 'text-fg-muted',
    )}>
      <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
      {resizable && onResize && (
        <div
          role="separator"
          aria-orientation="vertical"
          title={onResetWidth ? 'Drag to resize · double-click to reset' : 'Drag to resize'}
          onMouseDown={e => {
            e.preventDefault()
            e.stopPropagation()
            dragging.current = true
            lastX.current = e.clientX
            document.body.style.cursor = 'col-resize'
            document.body.style.userSelect = 'none'
          }}
          onDoubleClick={e => {
            e.preventDefault()
            e.stopPropagation()
            onResetWidth?.()
          }}
          className="absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize z-10 group"
        >
          <div className="absolute inset-y-1 right-0 w-px bg-border group-hover:bg-brand group-active:bg-brand" />
        </div>
      )}
    </div>
  )
}
