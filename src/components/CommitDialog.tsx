import type { GitHubConfig } from '../types'
import { cn } from '../helpers/cn'
import { btnPrimaryClass, btnSecClass, inputClass } from '../helpers/styles'
import { ui, t } from '../i18n/ui'
import { Overlay } from './Overlay'
import { Field } from './Field'
import { GithubIcon } from './Icons'

export const CommitDialog = ({
  commitMsg,
  onMsgChange,
  modifiedKeys,
  newFileLangs,
  config,
  onConfirm,
  onClose,
  isMobile,
}: {
  commitMsg: string
  onMsgChange: (m: string) => void
  modifiedKeys: Array<{ lang: string; key: string }>
  newFileLangs: string[]
  config: GitHubConfig
  onConfirm: () => void
  onClose: () => void
  isMobile: boolean
}) => {
  const byLang = modifiedKeys.reduce<Record<string, string[]>>((acc, { lang, key }) => {
    acc[lang] = acc[lang] ?? []
    acc[lang].push(key)
    return acc
  }, {})

  const langsShown = new Set([...Object.keys(byLang), ...newFileLangs])

  return (
    <Overlay onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className={cn(
          'bg-card flex flex-col gap-4',
          isMobile ? 'fixed bottom-0 left-0 w-screen rounded-t-2xl border-none p-5' : 'w-[480px] rounded-xl border border-border p-6',
        )}
      >
        <div className="flex justify-between">
          <div className="flex items-center gap-2">
            <GithubIcon size={16} />
            <h2 className="m-0 text-[15px] font-semibold text-fg">{ui.commit.title}</h2>
          </div>
          <button onClick={onClose} className="bg-transparent border-none text-fg-muted cursor-pointer text-xl">{ui.common.close}</button>
        </div>
        <div className="bg-elevated border border-border rounded-lg p-3">
          {[...langsShown].map(lang => {
            const file = config.files.find(f => f.lang === lang)
            const keys = byLang[lang] ?? []
            const isNew = newFileLangs.includes(lang)
            return (
              <div key={lang} className="mb-2">
                <div className="text-xs text-fg-tertiary mb-1">
                  {file?.flag} {file?.label ?? lang} — <code className="font-mono text-[11px] text-fg-muted">{file?.path}</code>
                  {isNew && <span className="ml-1.5 text-fg-brand">{ui.commit.newFile}</span>}
                </div>
                {keys.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {keys.slice(0, 8).map(k => (
                      <span key={k} className="text-[10px] font-mono bg-border-muted border border-border-strong rounded px-1.5 py-0.5 text-fg-brand">{k}</span>
                    ))}
                    {keys.length > 8 && <span className="text-[10px] text-fg-muted">{t(ui.common.moreCount, { count: keys.length - 8 })}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <Field label={ui.commit.messageLabel}>
          <input value={commitMsg} onChange={e => onMsgChange(e.target.value)} placeholder={ui.commit.messagePlaceholder} className={inputClass} />
        </Field>
        <div className="flex gap-2.5 justify-end">
          <button onClick={onClose} className={btnSecClass}>{ui.common.cancel}</button>
          <button onClick={onConfirm} disabled={!commitMsg.trim()} className={btnPrimaryClass}>
            <GithubIcon size={13} /> {t(ui.commit.pushTo, { branch: config.branch })}
          </button>
        </div>
      </div>
    </Overlay>
  )
}
