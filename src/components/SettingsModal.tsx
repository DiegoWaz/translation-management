import type { GitHubConfig } from '../types'
import { cn } from '../helpers/cn'
import { btnSecClass, btnPrimaryClass } from '../helpers/styles'
import { isGithubConfigured, loadUiConfig } from '../helpers/config'
import { ui } from '../i18n/ui'
import { Overlay } from './Overlay'
import { Field } from './Field'

const maskToken = (token: string) => {
  if (!token) return ui.settings.missingValue
  if (token.length <= 8) return '••••••••'
  return `${token.slice(0, 4)}…${token.slice(-4)}`
}

export const SettingsModal = ({
  config,
  onClose,
  onSetup,
  onDisconnect,
  isMobile,
}: {
  config: GitHubConfig
  onClose: () => void
  onSetup: () => void
  onDisconnect: () => void
  isMobile: boolean
}) => {
  const configured = isGithubConfigured(config)
  const fromUi = !!loadUiConfig()
  const pathTemplate = import.meta.env.VITE_GH_PATH_TEMPLATE || ui.settings.placeholders.pathTemplate

  const rows: Array<{ label: string; value: string }> = [
    { label: ui.settings.fields.token, value: maskToken(config.token) },
    { label: ui.settings.fields.owner, value: config.owner || ui.settings.missingValue },
    { label: ui.settings.fields.repo, value: config.repo || ui.settings.missingValue },
    { label: ui.settings.fields.branch, value: config.branch || ui.settings.missingValue },
    { label: ui.settings.fields.baseLang, value: config.baseLang || ui.settings.missingValue },
    { label: ui.settings.pathTemplateLabel, value: pathTemplate },
  ]

  return (
    <Overlay onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className={cn(
          'bg-card overflow-y-auto flex flex-col',
          isMobile ? 'w-screen h-dvh max-h-dvh rounded-none border-none' : 'w-[520px] max-h-[90vh] rounded-xl border border-border',
        )}
      >
        <div className={cn('flex justify-between items-center border-b border-border', isMobile ? 'px-5 py-4' : 'px-7 py-5')}>
          <h2 className="m-0 text-base font-semibold text-fg">{ui.settings.title}</h2>
          <button onClick={onClose} className="bg-transparent border-none text-fg-muted cursor-pointer text-xl leading-none">{ui.common.close}</button>
        </div>

        <div className={cn('flex-1 overflow-y-auto flex flex-col gap-5', isMobile ? 'px-5 py-4' : 'px-7 py-5')}>
          <div className={cn(
            'p-3 rounded-lg text-xs leading-relaxed border',
            configured ? 'bg-success-bg border-border-success text-fg-success' : 'bg-warning-bg border-border-warning text-fg-warning',
          )}>
            {configured ? ui.settings.envConfigured : ui.settings.envMissing}
          </div>

          <p className="m-0 text-xs text-fg-muted leading-relaxed">{ui.settings.envOnlyHint}</p>

          <pre className="m-0 p-3 bg-row-even border border-border rounded-lg text-[11px] font-mono text-fg-tertiary leading-relaxed whitespace-pre-wrap">
            {ui.settings.envInstallCommands}
          </pre>

          {rows.map(row => (
            <Field key={row.label} label={row.label}>
              <div className="px-3 py-2 bg-elevated border border-border rounded-md text-[13px] font-mono text-fg break-all">
                {row.value}
              </div>
            </Field>
          ))}

          <div>
            <div className="text-xs text-fg-tertiary font-medium mb-2">{ui.settings.activeLanguages}</div>
            <div className="flex flex-wrap gap-1.5">
              {config.files.map(f => (
                <span key={f.lang} className="flex items-center gap-1.5 text-xs bg-accent-bg border border-border-brand-soft rounded-full px-2.5 py-0.5 text-fg-brand">
                  {f.flag} <span className="font-mono text-[11px]">{f.lang}</span>
                  <span className="text-fg-muted font-mono text-[10px]">{f.path}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className={cn('flex gap-2.5 justify-between border-t border-border', isMobile ? 'px-5 py-3' : 'px-7 py-4')}>
          <div className="flex gap-2">
            {fromUi && (
              <button type="button" onClick={() => { onClose(); onDisconnect() }} className={cn(btnSecClass, 'text-fg-error border-border-error')}>
                {ui.setup.disconnect}
              </button>
            )}
            <button type="button" onClick={() => { onClose(); onSetup() }} className={btnPrimaryClass}>
              {fromUi || configured ? ui.setup.connectedTo.replace('{repo}', `${config.owner}/${config.repo}`) + ' — ' : ''}{ui.setup.connect}
            </button>
          </div>
          <button type="button" onClick={onClose} className={btnSecClass}>{ui.settings.done}</button>
        </div>
      </div>
    </Overlay>
  )
}
