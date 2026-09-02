import type { GitHubConfig, WorkspaceMode } from '../types'
import { cn } from '../helpers/cn'
import { ui, UI_LOCALES, t, type UiLocale } from '../i18n/ui'
import { GithubIcon, HistoryIcon, SpinnerIcon } from './Icons'
import { Logo } from './Logo'

export const TopBar = ({
  config,
  isDemoMode,
  modifiedCount,
  loading,
  showHistory,
  isMobile,
  isTablet,
  isDark,
  uiLocale,
  workspace,
  onWorkspaceChange,
  onUiLocaleChange,
  onLoad,
  onBranchClick,
  onCommit,
  onHistory,
  onSettings,
  onSetup,
  onToggleTheme,
}: {
  config: GitHubConfig
  isDemoMode: boolean
  modifiedCount: number
  loading: boolean
  showHistory: boolean
  isMobile: boolean
  isTablet?: boolean
  isDark: boolean
  uiLocale: UiLocale
  workspace: WorkspaceMode
  onWorkspaceChange: (mode: WorkspaceMode) => void
  onUiLocaleChange: (locale: UiLocale) => void
  onLoad: () => void
  onBranchClick?: () => void
  onCommit: () => void
  onHistory: () => void
  onSettings: () => void
  onSetup: () => void
  onToggleTheme: () => void
}) => {
  const isConnected = Boolean(config.token && config.owner && config.repo)
  const sourceDiffersFromBase = isConnected && config.sourceBranch !== config.branch
  // Compact mode hides secondary labels/badges on medium screens (tablet) to prevent overflow
  const compact = isMobile || Boolean(isTablet)

  return (
    <header className={cn('h-[52px] flex items-center px-3.5 bg-surface border-b border-border-muted shrink-0 overflow-x-auto overflow-y-hidden', isMobile ? 'gap-2' : 'gap-3.5')}>
      <Logo showWordmark={!isMobile && !isTablet} />

      <div className="flex bg-elevated border border-border-strong rounded-md overflow-hidden shrink-0">
        {([
          ['translations', ui.topBar.workspaceTranslations, 'i18n', false],
          ['configs', ui.topBar.workspaceConfigs, 'cfg', true],
          ['schema', ui.topBar.workspaceSchema, 'dto', true],
        ] as const).map(([mode, label, short, disabled], index) => (
          <button
            key={mode}
            type="button"
            disabled={disabled}
            title={disabled ? ui.topBar.workspaceDisabled : undefined}
            onClick={() => onWorkspaceChange(mode)}
            className={cn(
              'px-2.5 py-1 border-none text-[11px] font-inherit whitespace-nowrap',
              index < 2 && 'border-r border-border-strong',
              disabled
                ? 'bg-transparent text-fg-faint cursor-not-allowed opacity-50'
                : workspace === mode ? 'bg-brand-soft-bg text-fg-brand-strong font-semibold cursor-pointer' : 'bg-transparent text-fg-muted font-normal cursor-pointer',
            )}
          >
            {compact ? short : label}
          </button>
        ))}
      </div>

      {!compact && (
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-elevated border border-border rounded-full shrink-0">
          <GithubIcon size={12} />
          <span className={cn('text-[11px] font-mono whitespace-nowrap', isConnected ? 'text-fg-tertiary' : 'text-fg-muted')}>
            {isConnected ? `${config.owner}/${config.repo}` : ui.topBar.disconnected}
          </span>
          {isConnected && (
            <>
              <span className="text-fg-faint">@</span>
              <button
                type="button"
                onClick={onBranchClick ?? onLoad}
                title={ui.topBar.sourceBranchTitle}
                className="text-[10px] text-fg-success bg-success-bg px-1.5 py-px rounded-full font-mono border-none cursor-pointer hover:opacity-80"
              >
                {config.sourceBranch}
              </button>
              {sourceDiffersFromBase && (
                <span className="text-[9px] text-fg-muted font-mono whitespace-nowrap">
                  {t(ui.topBar.prBaseSuffix, { branch: config.branch })}
                </span>
              )}
            </>
          )}
          {isDemoMode && <span className="text-[9px] text-fg-demo bg-warning-bg px-1.5 py-px rounded-full font-bold tracking-wider">{ui.topBar.demo}</span>}
        </div>
      )}
      {compact && isDemoMode && <span className="text-[9px] text-fg-demo bg-warning-bg px-1.5 py-px rounded-full font-bold shrink-0">{ui.topBar.demo}</span>}

      {isDemoMode && (
        <button
          type="button"
          onClick={onSetup}
          disabled={loading}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1 bg-brand border border-brand-hover rounded-md text-fg-on-brand text-xs cursor-pointer font-inherit whitespace-nowrap shrink-0',
            loading && 'opacity-50 cursor-not-allowed',
          )}
        >
          <GithubIcon size={12} />
          {!compact && ` ${ui.setup.connect}`}
        </button>
      )}

      <div className="flex-1 min-w-2" />

      <label className="relative shrink-0" title={ui.topBar.uiLang}>
        <span className="sr-only">{ui.topBar.uiLang}</span>
        <select
          value={uiLocale}
          onChange={e => onUiLocaleChange(e.target.value as UiLocale)}
          className="appearance-none bg-elevated border border-border rounded-md text-fg-tertiary text-xs cursor-pointer font-inherit pl-2 pr-6 py-1 outline-none"
        >
          {UI_LOCALES.map(l => (
            <option key={l.code} value={l.code}>
              {l.flag} {compact ? l.code.split('-')[0].toUpperCase() : l.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-fg-muted">▼</span>
      </label>

      <button
        onClick={onToggleTheme}
        title={isDark ? ui.theme.toLight : ui.theme.toDark}
        className="bg-transparent border border-border rounded-md text-fg-tertiary cursor-pointer text-sm px-2 py-1 shrink-0 leading-none"
      >
        {isDark ? ui.theme.lightIcon : ui.theme.darkIcon}
      </button>

      {!compact && (
        <button
          onClick={onLoad}
          disabled={loading}
          title={ui.topBar.loadGithubTitle}
          className={cn('flex items-center gap-1.5 px-3 py-1 bg-elevated border border-border-strong rounded-md text-fg-tertiary text-xs cursor-pointer font-inherit whitespace-nowrap shrink-0', loading && 'opacity-50')}
        >
          {loading ? <SpinnerIcon size={12} /> : null}
          <span>{loading ? ui.topBar.loading : ui.topBar.loadGithub}</span>
        </button>
      )}

      <button
        onClick={onHistory}
        title={ui.topBar.historyTitle}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs cursor-pointer font-inherit shrink-0 border',
          showHistory ? 'bg-accent-bg border-border-brand-soft text-brand-soft' : 'bg-elevated border-border-strong text-fg-tertiary',
        )}
      >
        <HistoryIcon size={13} />{!compact && ` ${ui.topBar.history}`}
      </button>

      <button
        onClick={onCommit}
        disabled={loading || modifiedCount === 0}
        title={ui.topBar.commitTitle}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium shrink-0 border font-inherit',
          modifiedCount > 0 ? 'bg-brand border-brand-hover text-fg-on-brand cursor-pointer' : 'bg-elevated border-border-strong text-fg-muted cursor-default',
          loading && 'opacity-50',
        )}
      >
        <GithubIcon size={13} />
        {!compact && ` ${ui.topBar.commit}`}
        {modifiedCount > 0 && <span className="bg-white/20 rounded-full px-1.5 py-px text-[11px] font-bold">{modifiedCount}</span>}
      </button>

      <button onClick={onSettings} title={ui.topBar.settings} className="bg-transparent border-none text-fg-muted cursor-pointer text-[17px] p-1 shrink-0">{ui.topBar.settings}</button>
    </header>
  )
}
