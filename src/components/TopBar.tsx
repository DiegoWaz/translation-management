import type { GitHubConfig } from '../types'
import { cn } from '../helpers/cn'
import { ui, UI_LOCALES, type UiLocale } from '../i18n/ui'
import { GithubIcon, HistoryIcon } from './Icons'

export const TopBar = ({
  config,
  isDemoMode,
  modifiedCount,
  loading,
  showHistory,
  isMobile,
  isDark,
  uiLocale,
  onUiLocaleChange,
  onLoad,
  onCommit,
  onHistory,
  onSettings,
  onToggleTheme,
}: {
  config: GitHubConfig
  isDemoMode: boolean
  modifiedCount: number
  loading: boolean
  showHistory: boolean
  isMobile: boolean
  isDark: boolean
  uiLocale: UiLocale
  onUiLocaleChange: (locale: UiLocale) => void
  onLoad: () => void
  onCommit: () => void
  onHistory: () => void
  onSettings: () => void
  onToggleTheme: () => void
}) => {
  const isConnected = Boolean(config.token && config.owner && config.repo)

  return (
    <header className={cn('h-[52px] flex items-center px-3.5 bg-surface border-b border-border-muted shrink-0', isMobile ? 'gap-2' : 'gap-3.5')}>
      <div className="flex items-center gap-1.5">
        <div className="size-[26px] bg-linear-to-br from-brand to-brand-soft rounded-md flex items-center justify-center text-[10px] font-bold text-fg-on-brand shrink-0">{ui.app.logo}</div>
        {!isMobile && <span className="text-[13px] font-semibold text-fg tracking-tight whitespace-nowrap">{ui.app.name}</span>}
      </div>

      {!isMobile && (
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-elevated border border-border rounded-full shrink-0">
          <GithubIcon size={12} />
          <span className={cn('text-[11px] font-mono whitespace-nowrap', isConnected ? 'text-fg-tertiary' : 'text-fg-muted')}>
            {isConnected ? `${config.owner}/${config.repo}` : ui.topBar.disconnected}
          </span>
          {isConnected && (
            <>
              <span className="text-fg-faint">@</span>
              <span className="text-[10px] text-fg-success bg-success-bg px-1.5 py-px rounded-full font-mono">{config.branch}</span>
            </>
          )}
          {isDemoMode && <span className="text-[9px] text-fg-demo bg-warning-bg px-1.5 py-px rounded-full font-bold tracking-wider">{ui.topBar.demo}</span>}
        </div>
      )}
      {isMobile && isDemoMode && <span className="text-[9px] text-fg-demo bg-warning-bg px-1.5 py-px rounded-full font-bold">{ui.topBar.demo}</span>}

      <div className="flex-1" />

      <label className="relative shrink-0" title={ui.topBar.uiLang}>
        <span className="sr-only">{ui.topBar.uiLang}</span>
        <select
          value={uiLocale}
          onChange={e => onUiLocaleChange(e.target.value as UiLocale)}
          className="appearance-none bg-elevated border border-border rounded-md text-fg-tertiary text-xs cursor-pointer font-inherit pl-2 pr-6 py-1 outline-none"
        >
          {UI_LOCALES.map(l => (
            <option key={l.code} value={l.code}>
              {l.flag} {isMobile ? l.code.split('-')[0].toUpperCase() : l.label}
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

      {!isMobile && (
        <button
          onClick={onLoad}
          disabled={loading}
          title={ui.topBar.loadGithubTitle}
          className={cn('flex items-center gap-1.5 px-3 py-1 bg-elevated border border-border-strong rounded-md text-fg-tertiary text-xs cursor-pointer font-inherit whitespace-nowrap', loading && 'opacity-50')}
        >
          <span>{ui.topBar.loadGithub}</span>
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
        <HistoryIcon size={13} />{!isMobile && ` ${ui.topBar.history}`}
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
        {!isMobile && ` ${ui.topBar.commit}`}
        {modifiedCount > 0 && <span className="bg-white/20 rounded-full px-1.5 py-px text-[11px] font-bold">{modifiedCount}</span>}
      </button>

      <button onClick={onSettings} title={ui.topBar.settings} className="bg-transparent border-none text-fg-muted cursor-pointer text-[17px] p-1 shrink-0">{ui.topBar.settings}</button>
    </header>
  )
}
