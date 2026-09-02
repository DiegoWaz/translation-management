import { useEffect, useState } from 'react'
import type { GitHubConfig } from '../types'
import { cn } from '../helpers/cn'
import { btnPrimaryClass, btnSecClass, inputClass } from '../helpers/styles'
import { listBranches } from '../helpers/githubBrowser'
import { ui, t } from '../i18n/ui'
import { Overlay } from './Overlay'
import { Field } from './Field'
import { GithubIcon, SpinnerIcon } from './Icons'

export const LoadDialog = ({
  config,
  hasUnsavedChanges,
  loading = false,
  onConfirm,
  onClose,
  isMobile,
}: {
  config: GitHubConfig
  hasUnsavedChanges: boolean
  loading?: boolean
  onConfirm: (branch: string) => void
  onClose: () => void
  isMobile: boolean
}) => {
  const [branches, setBranches] = useState<string[]>([])
  const [loadingBranches, setLoadingBranches] = useState(true)
  const [selectedBranch, setSelectedBranch] = useState(config.sourceBranch)

  useEffect(() => {
    setLoadingBranches(true)
    listBranches(config.token, config.owner, config.repo)
      .then(list => {
        const names = list.map(b => b.name).sort((a, b) => a.localeCompare(b))
        setBranches(names)
        if (names.includes(config.sourceBranch)) {
          setSelectedBranch(config.sourceBranch)
        } else if (names.length > 0) {
          setSelectedBranch(names[0])
        }
      })
      .catch(() => setBranches([]))
      .finally(() => setLoadingBranches(false))
  }, [config.token, config.owner, config.repo, config.sourceBranch])

  const sourceDiffersFromBase = selectedBranch !== config.branch

  return (
    <Overlay onClick={() => { if (!loading) onClose() }}>
      <div
        onClick={e => e.stopPropagation()}
        className={cn(
          'bg-card flex flex-col gap-4 relative',
          isMobile ? 'fixed bottom-0 left-0 w-screen rounded-t-2xl border-none p-5' : 'w-[480px] rounded-xl border border-border p-6',
        )}
      >
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-overlay/60 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg text-xs text-fg-tertiary shadow-lg">
              <SpinnerIcon size={14} />
              {ui.load.loading}
            </div>
          </div>
        )}
        <div className="flex justify-between">
          <div className="flex items-center gap-2">
            <GithubIcon size={16} />
            <h2 className="m-0 text-[15px] font-semibold text-fg">{ui.load.title}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={loading} className="bg-transparent border-none text-fg-muted cursor-pointer text-xl disabled:opacity-40">{ui.common.close}</button>
        </div>

        <p className="m-0 text-xs text-fg-muted leading-relaxed">{ui.load.subtitle}</p>

        <Field label={ui.load.branchLabel}>
          {loadingBranches ? (
            <div className="text-xs text-fg-muted px-1 py-1.5">{ui.load.branchesLoading}</div>
          ) : branches.length === 0 ? (
            <div className="text-xs text-fg-muted px-1 py-1.5">{ui.load.noBranches}</div>
          ) : (
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              disabled={loading}
              className={cn(inputClass, 'w-full font-mono text-xs', loading && 'opacity-60')}
            >
              {branches.map(b => (
                <option key={b} value={b}>
                  {b}{b === config.branch ? ` (${ui.load.baseBranchSuffix})` : ''}
                </option>
              ))}
            </select>
          )}
          {sourceDiffersFromBase && (
            <span className="text-[11px] text-fg-muted mt-1 block">
              {t(ui.load.prTargetHint, { branch: config.branch })}
            </span>
          )}
        </Field>

        {hasUnsavedChanges && (
          <div className="px-3 py-2.5 bg-warning-bg border border-border-warning rounded-lg text-xs text-fg-warning leading-relaxed">
            {ui.load.draftWarning}
          </div>
        )}

        <div className="flex gap-2.5 justify-end">
          <button type="button" onClick={onClose} disabled={loading} className={cn(btnSecClass, loading && 'opacity-50')}>{ui.common.cancel}</button>
          <button
            type="button"
            onClick={() => onConfirm(selectedBranch)}
            disabled={!selectedBranch.trim() || loadingBranches || loading}
            className={cn(btnPrimaryClass, 'flex items-center gap-1.5', loading && 'opacity-80')}
          >
            {loading ? <SpinnerIcon size={13} /> : <GithubIcon size={13} />}
            {loading ? ui.load.loading : ui.load.confirm}
          </button>
        </div>
      </div>
    </Overlay>
  )
}
