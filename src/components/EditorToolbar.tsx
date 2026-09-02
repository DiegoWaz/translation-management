import { cn } from '../helpers/cn'
import type { SearchMode, WorkspaceMode } from '../types'
import { ui, t, plural } from '../i18n/ui'
import { SearchIcon } from './Icons'

export const EditorToolbar = ({
  workspace,
  search,
  onSearchChange,
  searchMode,
  onSearchModeChange,
  filteredCount,
  totalCount,
  isMobile,
  varValidation,
  varIssuesCount,
  onToggleVarValidation,
  onExport,
  onImport,
  onAddKey,
}: {
  workspace: WorkspaceMode
  search: string
  onSearchChange: (v: string) => void
  searchMode: SearchMode
  onSearchModeChange: (m: SearchMode) => void
  filteredCount: number
  totalCount: number
  isMobile: boolean
  varValidation: boolean
  varIssuesCount: number
  onToggleVarValidation: () => void
  onExport: () => void
  onImport: () => void
  onAddKey: () => void
}) => {
  const searchModeLabels: Record<SearchMode, string> = { locale: ui.toolbar.modeLocale, key: ui.toolbar.modeKey }
  const hasVarIssues = varValidation && varIssuesCount > 0
  const isConfigs = workspace === 'configs'

  return (
    <div className="border-b border-border bg-surface flex flex-col">
      <div className={cn('flex gap-2 items-center', isMobile ? 'px-3 py-2.5' : 'px-5 pt-2.5')}>
        <SearchIcon />
        <input
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={
            isConfigs
              ? ui.toolbar.searchConfigs
              : ui.toolbar.searchAllLocales
          }
          className="flex-1 bg-transparent border-none outline-none text-fg text-[13px] font-inherit min-w-0"
        />
        {search && (
          <button onClick={() => onSearchChange('')} className="bg-transparent border-none text-fg-muted cursor-pointer text-base shrink-0">{ui.common.close}</button>
        )}
        {!isMobile && <span className="text-xs text-fg-muted whitespace-nowrap">{filteredCount} / {totalCount}</span>}
      </div>
      <div className={cn('flex gap-1.5 items-center flex-nowrap', isMobile ? 'px-3 pt-2 pb-2.5 overflow-x-auto' : 'px-5 pt-2 pb-2.5')}>
        <div className="flex bg-elevated border border-border-strong rounded-md overflow-hidden shrink-0">
          {(['locale', 'key'] as SearchMode[]).map(m => {
            const isActive = searchMode === m
            return (
              <button
                key={m}
                onClick={() => onSearchModeChange(m)}
                className={cn(
                  'px-2.5 py-1 border-none text-[11px] cursor-pointer font-inherit whitespace-nowrap',
                  m === 'locale' && 'border-r border-border-strong',
                  isActive ? 'bg-brand-soft-bg text-fg-brand-strong font-semibold' : 'bg-transparent text-fg-muted font-normal',
                )}
              >
                {searchModeLabels[m]}
              </button>
            )
          })}
        </div>
        <div className="flex-1" />
        {!isConfigs && (
          <button
            onClick={onToggleVarValidation}
            title={varValidation ? ui.toolbar.varsDisableTitle : ui.toolbar.varsEnableTitle}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs cursor-pointer whitespace-nowrap shrink-0 border',
              !varValidation && 'bg-elevated border-border-strong text-fg-muted',
              varValidation && !hasVarIssues && 'bg-success-bg border-border-success text-fg-success',
              hasVarIssues && 'bg-warning-bg border-fg-warning/25 text-fg-warning',
            )}
          >
            {varValidation
              ? (hasVarIssues
                ? t(plural(varIssuesCount, ui.toolbar.varsIssues, ui.toolbar.varsIssuesPlural), { count: varIssuesCount })
                : ui.toolbar.varsOk)
              : ui.toolbar.varsOff}
          </button>
        )}
          <button onClick={onImport} title={ui.toolbar.importTitle} className="flex items-center gap-1 px-2.5 py-1 bg-elevated border border-border-strong rounded-md text-fg-brand text-xs cursor-pointer whitespace-nowrap shrink-0">
            {ui.toolbar.import}
          </button>
        <button onClick={onExport} title={ui.toolbar.exportTitle} className="flex items-center gap-1 px-2.5 py-1 bg-elevated border border-border-success rounded-md text-fg-success text-xs cursor-pointer whitespace-nowrap shrink-0">
          {ui.toolbar.export}
        </button>
        <button
          onClick={onAddKey}
          title={isConfigs ? ui.toolbar.addConfigKeyTitle : ui.toolbar.addKeyTitle}
          className="flex items-center gap-1 px-2.5 py-1 bg-elevated border border-border rounded-md text-fg-tertiary text-xs cursor-pointer shrink-0"
        >
          {isConfigs ? ui.toolbar.addConfigKey : ui.toolbar.addKey}
        </button>
      </div>
    </div>
  )
}
