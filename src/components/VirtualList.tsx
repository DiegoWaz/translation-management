import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

const OVERSCAN = 10

export const VirtualList = ({
  itemCount,
  itemHeight,
  renderItem,
  className = 'flex-1 overflow-y-auto min-h-0',
  getItemKey,
}: {
  itemCount: number
  itemHeight: number
  renderItem: (index: number) => ReactNode
  className?: string
  getItemKey?: (index: number) => string | number
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(480)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setViewportHeight(el.clientHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const onScroll = useCallback(() => {
    if (containerRef.current) setScrollTop(containerRef.current.scrollTop)
  }, [])

  if (itemCount === 0) return <div ref={containerRef} className={className} />

  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - OVERSCAN)
  const visible = Math.ceil(viewportHeight / itemHeight) + OVERSCAN * 2
  const end = Math.min(itemCount, start + visible)
  const totalHeight = itemCount * itemHeight
  const offsetY = start * itemHeight

  return (
    <div ref={containerRef} onScroll={onScroll} className={className}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {Array.from({ length: end - start }, (_, i) => {
            const index = start + i
            const key = getItemKey?.(index) ?? index
            return <div key={key}>{renderItem(index)}</div>
          })}
        </div>
      </div>
    </div>
  )
}

/** Fixed row height for locale-mode translation rows. */
export const TRANSLATION_ROW_HEIGHT = 46
