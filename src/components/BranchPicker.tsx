import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { cn } from '../helpers/cn'
import { inputClass } from '../helpers/styles'
import { SearchIcon } from './Icons'

export const BranchPicker = ({
  branches,
  value,
  onChange,
  disabled = false,
  placeholder,
  noMatchesLabel,
  formatOption,
  allowFreeform = false,
}: {
  branches: string[]
  value: string
  onChange: (branch: string) => void
  disabled?: boolean
  placeholder: string
  noMatchesLabel: string
  /** Optional label suffix/formatter for list rows (e.g. base PR marker). */
  formatOption?: (branch: string) => string
  /** Allow confirming a typed name even when it is not in `branches`. */
  allowFreeform?: boolean
}) => {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)

  useEffect(() => {
    if (!open) setQuery(value)
  }, [value, open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return branches
    return branches.filter(b => b.toLowerCase().includes(q))
  }, [branches, query])

  const pick = (branch: string) => {
    onChange(branch)
    setQuery(branch)
    setOpen(false)
  }

  const commitTyped = () => {
    const typed = query.trim()
    if (!typed) {
      setQuery(value)
      setOpen(false)
      return
    }
    const exact = branches.find(b => b.toLowerCase() === typed.toLowerCase())
    if (exact) {
      pick(exact)
      return
    }
    if (filtered[0]) {
      pick(filtered[0])
      return
    }
    if (allowFreeform) {
      pick(typed)
      return
    }
    setQuery(value)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted">
          <SearchIcon />
        </span>
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
            if (allowFreeform) onChange(e.target.value)
          }}
          onBlur={() => {
            if (allowFreeform && query.trim()) onChange(query.trim())
          }}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              e.preventDefault()
              setQuery(value)
              setOpen(false)
            }
            if (e.key === 'Enter') {
              e.preventDefault()
              commitTyped()
            }
            if (e.key === 'ArrowDown' && filtered[0]) {
              e.preventDefault()
              setOpen(true)
            }
          }}
          className={cn(
            inputClass,
            'w-full font-mono text-xs pl-8',
            disabled && 'opacity-60',
          )}
        />
      </div>
      {open && !disabled && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-52 overflow-y-auto rounded-md border border-border bg-card shadow-lg"
        >
          {filtered.length === 0 ? (
            <div className="p-1.5 flex flex-col gap-1">
              <div className="px-1 py-1 text-[11px] text-fg-muted">{noMatchesLabel}</div>
              {allowFreeform && query.trim() && (
                <button
                  type="button"
                  role="option"
                  aria-selected
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => pick(query.trim())}
                  className="w-full text-left px-2.5 py-2 rounded-md text-[11px] font-mono border border-border-brand-soft bg-brand-soft-bg text-fg-brand cursor-pointer"
                >
                  {query.trim()}
                </button>
              )}
            </div>
          ) : (
            filtered.map(branch => (
              <button
                key={branch}
                type="button"
                role="option"
                aria-selected={branch === value}
                onMouseDown={e => e.preventDefault()}
                onClick={() => pick(branch)}
                className={cn(
                  'w-full text-left px-2.5 py-1.5 text-[11px] font-mono border-none cursor-pointer',
                  branch === value
                    ? 'bg-brand-soft-bg text-fg-brand'
                    : 'bg-transparent text-fg hover:bg-row-hover',
                )}
              >
                {formatOption ? formatOption(branch) : branch}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
