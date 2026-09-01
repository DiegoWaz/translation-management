import { cn } from '../helpers/cn'
import { ui, t } from '../i18n/ui'

export const Pagination = ({
  page,
  pageCount,
  pageSize,
  pageSizeOptions,
  totalCount,
  isMobile,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  pageCount: number
  pageSize: number
  pageSizeOptions: readonly number[]
  totalCount: number
  isMobile: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}) => {
  if (totalCount === 0) return null

  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  return (
    <div
      className={cn(
        'flex items-center gap-3 border-t border-border bg-surface shrink-0 flex-wrap',
        isMobile ? 'px-3 py-2' : 'px-5 py-2',
      )}
    >
      <label className="flex items-center gap-1.5 text-xs text-fg-muted whitespace-nowrap">
        {ui.pagination.perPage}
        <select
          value={pageSize}
          onChange={e => onPageSizeChange(Number(e.target.value))}
          className="bg-elevated border border-border-strong rounded-md text-fg text-xs px-1.5 py-1 cursor-pointer"
        >
          {pageSizeOptions.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </label>

      <span className="text-xs text-fg-muted whitespace-nowrap">
        {t(ui.pagination.showingRange, { from, to, total: totalCount })}
      </span>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          title={ui.pagination.previous}
          className="px-2.5 py-1 bg-elevated border border-border-strong rounded-md text-fg text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ‹ {!isMobile && ui.pagination.previous}
        </button>
        <span className="text-xs text-fg-muted whitespace-nowrap px-1">
          {ui.pagination.page} {page} {ui.pagination.of} {pageCount}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          title={ui.pagination.next}
          className="px-2.5 py-1 bg-elevated border border-border-strong rounded-md text-fg text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {!isMobile && ui.pagination.next} ›
        </button>
      </div>
    </div>
  )
}
