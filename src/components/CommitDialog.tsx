import { useState, useMemo } from 'react'
import type { GitHubConfig } from '../types'
import { cn } from '../helpers/cn'
import { btnPrimaryClass, btnSecClass, inputClass } from '../helpers/styles'
import { ui, t } from '../i18n/ui'
import { detectCommitType, generateBranchName, generatePrTitle } from '../helpers/commitHelpers'
import { Overlay } from './Overlay'
import { Field } from './Field'
import { GithubIcon } from './Icons'

export type CommitMode = 'pr'

export const CommitDialog = ({
  commitMsg,
  onMsgChange,
  modifiedKeys,
  newFileLangs,
  schemaDirty,
  resolvePath,
  config,
  original,
  onConfirm,
  onClose,
  isMobile,
}: {
  commitMsg: string
  onMsgChange: (m: string) => void
  modifiedKeys: Array<{ lang: string; key: string }>
  newFileLangs: string[]
  schemaDirty?: boolean
  resolvePath?: (lang: string) => string
  config: GitHubConfig
  original: Record<string, Record<string, string>>
  onConfirm: (mode: CommitMode, prTitle?: string, branchName?: string) => void
  onClose: () => void
  isMobile: boolean
}) => {
  // Only Pull Requests are supported: LocaleHub never pushes directly to the
  // base branch, so it can never overwrite or delete anything on its own —
  // every change lands as a reviewable PR the user merges (or discards)
  // themselves on GitHub.
  const mode: CommitMode = 'pr'
  
  // Auto-detect commit type
  const commitType = useMemo(() => detectCommitType(modifiedKeys, original), [modifiedKeys, original])
  
  // Auto-generate branch name and PR title
  const defaultBranchName = useMemo(() => generateBranchName(commitType), [commitType])
  const defaultPrTitle = useMemo(() => generatePrTitle(commitType, commitMsg), [commitType, commitMsg])
  
  const [branchName, setBranchName] = useState(defaultBranchName)
  const [prTitle, setPrTitle] = useState(defaultPrTitle)

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
          <button type="button" onClick={onClose} className="bg-transparent border-none text-fg-muted cursor-pointer text-xl">{ui.common.close}</button>
        </div>

        {/* Commit type badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-tertiary">{ui.commit.type}:</span>
          <span className={cn(
            'px-2 py-1 rounded text-xs font-semibold',
            commitType === 'feat' 
              ? 'bg-brand-soft-bg text-fg-brand'
              : 'bg-warning-bg text-fg-warning'
          )}>
            {commitType === 'feat' ? '✨ feat' : '🔧 fix'}
          </span>
        </div>

        {/* PR-only: LocaleHub never pushes directly to the base branch, so it
            can't overwrite or delete repo content on its own. */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-brand-soft-bg border border-border rounded-md text-xs text-fg-brand">
          <GithubIcon size={13} />
          <span className="font-semibold">{ui.commit.modePr}</span>
          <span className="text-fg-muted">— {ui.commit.prOnlyHint}</span>
        </div>

        <div className="bg-elevated border border-border rounded-lg p-3 max-h-56 overflow-y-auto">
          {schemaDirty && (
            <div className="mb-2 text-xs text-fg-tertiary">
              <code className="font-mono text-[11px] text-fg-muted">{config.configSchemaPath}</code>
              <span className="ml-1.5 text-fg-brand">{ui.commit.schemaFile}</span>
            </div>
          )}
          {[...langsShown].map(lang => {
            const file = config.files.find(f => f.lang === lang)
            const path = resolvePath?.(lang) ?? file?.path
            const keys = byLang[lang] ?? []
            const isNew = newFileLangs.includes(lang)
            return (
              <div key={lang} className="mb-2">
                <div className="text-xs text-fg-tertiary mb-1">
                  {file?.flag} {file?.label ?? lang} — <code className="font-mono text-[11px] text-fg-muted">{path}</code>
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

        <Field label={ui.commit.branchNameLabel}>
          <input value={branchName} onChange={e => setBranchName(e.target.value)} placeholder="fix/1234567890" className={inputClass} />
        </Field>
        <Field label={ui.commit.prTitleLabel}>
          <input value={prTitle} onChange={e => setPrTitle(e.target.value)} placeholder={ui.commit.prTitlePlaceholder} className={inputClass} />
        </Field>

        <Field label={ui.commit.messageLabel}>
          <input value={commitMsg} onChange={e => onMsgChange(e.target.value)} placeholder={ui.commit.messagePlaceholder} className={inputClass} />
        </Field>

        <div className="flex gap-2.5 justify-end">
          <button type="button" onClick={onClose} className={btnSecClass}>{ui.common.cancel}</button>
          <button
            type="button"
            onClick={() => onConfirm('pr', prTitle, branchName)}
            disabled={!commitMsg.trim() || !prTitle.trim() || !branchName.trim()}
            className={cn(btnPrimaryClass, 'bg-success-bg border-border-success text-fg-success')}
          >
            <GithubIcon size={13} /> {ui.commit.createPr}
          </button>
        </div>
      </div>
    </Overlay>
  )
}
