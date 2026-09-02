import { useEffect, useState } from 'react'
import { cn } from '../helpers/cn'
import { btnPrimaryClass, btnSecClass, inputClass } from '../helpers/styles'
import {
  detectAllLocaleFiles,
  listBranches,
  listRepos,
  listTree,
  validateToken,
  type GhRepo,
} from '../helpers/githubBrowser'
import { buildAuthorizeUrl } from '../helpers/githubOAuth'
import { GithubIcon } from './Icons'
import { ui, t } from '../i18n/ui'

type Step = 'auth' | 'repo' | 'langs'

interface Props {
  /** Pre-filled token from OAuth redirect (if available). */
  oauthToken?: string
  onComplete: (cfg: {
    token: string
    owner: string
    repo: string
    branch: string
    langs: string[]
    baseLang: string
    translationsFolderName: string
  }) => void
  onSkip: () => void
  isMobile: boolean
}

export const SetupWizard = ({ oauthToken, onComplete, onSkip, isMobile }: Props) => {
  const hasOAuthClientId = !!import.meta.env.VITE_GH_CLIENT_ID
  const translationsFolderName = import.meta.env.VITE_TRANSLATIONS_FOLDER_NAME || 'translations'
  
  const [step, setStep] = useState<Step>(oauthToken ? 'repo' : 'auth')
  const [token, setToken] = useState(oauthToken ?? '')
  const [patInput, setPatInput] = useState('')
  const [showPatFallback, setShowPatFallback] = useState(false)
  const [username, setUsername] = useState('')
  const [repos, setRepos] = useState<GhRepo[]>([])
  const [repoSearch, setRepoSearch] = useState('')
  const [selectedRepo, setSelectedRepo] = useState<GhRepo | null>(null)
  const [branch, setBranch] = useState('main')
  const [branchNames, setBranchNames] = useState<string[]>([])
  const [detectedLangs, setDetectedLangs] = useState<string[]>([])
  const [selectedLangs, setSelectedLangs] = useState<Set<string>>(new Set())
  const [baseLang, setBaseLang] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Advance to repo step when OAuth token arrives
  useEffect(() => {
    if (oauthToken && step === 'auth') {
      setStep('repo')
    }
  }, [oauthToken])

  // Sync token state with oauthToken prop (for API calls)
  useEffect(() => {
    if (oauthToken) {
      setToken(oauthToken)
    }
  }, [oauthToken])

  // When an OAuth token is provided, immediately load repos
  useEffect(() => {
    if (oauthToken && step === 'repo' && repos.length === 0) {
      setLoading(true)
      Promise.all([validateToken(oauthToken), listRepos(oauthToken)])
        .then(([login, repoList]) => {
          setUsername(login)
          setRepos(repoList)
        })
        .catch((e: Error) => { setError(e.message); setStep('auth') })
        .finally(() => setLoading(false))
    }
  }, [oauthToken, step, repos.length])

  const handleOAuthSignIn = () => {
    try {
      window.location.href = buildAuthorizeUrl()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handlePatConnect = async () => {
    if (!patInput.trim()) return
    setLoading(true)
    setError('')
    try {
      const login = await validateToken(patInput.trim())
      setToken(patInput.trim())
      setUsername(login)
      const repoList = await listRepos(patInput.trim())
      setRepos(repoList)
      setStep('repo')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const loadLangsForBranch = async (repo: GhRepo, branchName: string) => {
    const tree = await listTree(token, repo.owner.login, repo.name, branchName)
    const langs = detectAllLocaleFiles(tree, translationsFolderName)
    if (langs.length === 0) {
      setError(`No translation files found in '${translationsFolderName}' folders`)
      return false
    }
    setDetectedLangs(langs)
    setSelectedLangs(new Set(langs))
    const defaultBase = langs.includes('en-GB') ? 'en-GB' : langs.find(l => l.startsWith('en')) ?? langs[0]
    setBaseLang(defaultBase)
    return true
  }

  const handleSelectRepo = async (repo: GhRepo) => {
    setSelectedRepo(repo)
    setLoading(true)
    setError('')
    try {
      const branchList = await listBranches(token, repo.owner.login, repo.name)
      const names = branchList.map(b => b.name).sort((a, b) => a.localeCompare(b))
      setBranchNames(names)
      const selectedBranch = names.includes(repo.default_branch) ? repo.default_branch : names[0] || 'main'
      setBranch(selectedBranch)

      const ok = await loadLangsForBranch(repo, selectedBranch)
      if (ok) setStep('langs')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleBranchChange = async (branchName: string) => {
    if (!selectedRepo) return
    setBranch(branchName)
    setLoading(true)
    setError('')
    try {
      await loadLangsForBranch(selectedRepo, branchName)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleFinish = () => {
    if (!selectedRepo || selectedLangs.size === 0) return
    onComplete({
      token,
      owner: selectedRepo.owner.login,
      repo: selectedRepo.name,
      branch,
      langs: [...selectedLangs],
      baseLang,
      translationsFolderName,
    })
  }

  const toggleLang = (l: string) => setSelectedLangs(prev => {
    const next = new Set(prev)
    next.has(l) ? next.delete(l) : next.add(l)
    return next
  })

  const filteredRepos = repoSearch
    ? repos.filter(r => r.full_name.toLowerCase().includes(repoSearch.toLowerCase()))
    : repos

  const stepIndex = { auth: 0, repo: 1, langs: 2 }[step]
  const stepLabels = [
    ui.setup.stepToken,
    ui.setup.stepRepo,
    ui.setup.stepLangs,
  ]

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center backdrop-blur-[4px] bg-overlay">
      <div
        className={cn(
          'bg-card flex flex-col overflow-hidden relative',
          isMobile ? 'w-screen h-dvh rounded-none border-none' : 'w-[600px] max-h-[85vh] rounded-xl border border-border',
        )}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <h2 className="m-0 text-base font-semibold text-fg">{ui.setup.title}</h2>
          <p className="m-0 mt-1 text-xs text-fg-muted">{ui.setup.subtitle}</p>
          <div className="flex gap-1.5 mt-3">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex-1 flex flex-col gap-1">
                <div className={cn('h-1 rounded-full', i <= stepIndex ? 'bg-brand' : 'bg-elevated')} />
                <span className={cn('text-[10px]', i <= stepIndex ? 'text-fg-brand font-medium' : 'text-fg-muted')}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {error && (
            <div className="mb-3 p-2.5 rounded-lg bg-error-bg border border-border-error text-fg-error text-xs">
              {error}
            </div>
          )}

          {/* Step 1 — Auth: OAuth button + PAT fallback */}
          {step === 'auth' && (
            <div className="flex flex-col gap-5 items-center py-4">
              {hasOAuthClientId && (
                <button
                  type="button"
                  onClick={handleOAuthSignIn}
                  className="flex items-center gap-3 px-8 py-3.5 bg-[#24292f] hover:bg-[#1b1f23] text-white rounded-lg text-sm font-medium cursor-pointer border-none transition-colors"
                >
                  <GithubIcon size={20} />
                  {ui.setup.signInGithub}
                </button>
              )}

              {hasOAuthClientId && !showPatFallback && (
                <button
                  type="button"
                  onClick={() => setShowPatFallback(true)}
                  className="bg-transparent border-none text-fg-muted text-[11px] cursor-pointer underline font-inherit"
                >{ui.setup.usePatInstead}</button>
              )}

              {(!hasOAuthClientId || showPatFallback) && (
                <div className="flex flex-col gap-3 w-full max-w-sm">
                  {hasOAuthClientId && <div className="flex items-center gap-3 text-[10px] text-fg-muted">
                    <div className="flex-1 h-px bg-border" />
                    {ui.setup.orPat}
                    <div className="flex-1 h-px bg-border" />
                  </div>}
                  <label className="text-xs text-fg-muted font-medium">
                    {ui.setup.tokenLabel}
                    <input
                      type="password"
                      value={patInput}
                      onChange={e => setPatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handlePatConnect()}
                      placeholder="ghp_… / github_pat_…"
                      className={cn(inputClass, 'mt-1.5 font-mono')}
                      autoFocus={!hasOAuthClientId}
                    />
                  </label>
                  <p className="m-0 text-[11px] text-fg-muted leading-relaxed">{ui.setup.tokenHint}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Repo */}
          {step === 'repo' && (
            <div className="flex flex-col gap-3">
              <div className="text-xs text-fg-muted">{t(ui.setup.loggedAs, { user: username })}</div>
              <input
                type="text"
                value={repoSearch}
                onChange={e => setRepoSearch(e.target.value)}
                placeholder={ui.setup.searchRepo}
                className={inputClass}
                autoFocus
              />
              <div className="flex flex-col gap-1 max-h-[340px] overflow-y-auto">
                {filteredRepos.map(r => (
                  <button
                    key={r.full_name}
                    type="button"
                    onClick={() => handleSelectRepo(r)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-md text-left cursor-pointer border',
                      selectedRepo?.full_name === r.full_name
                        ? 'bg-accent-bg border-border-brand-soft'
                        : 'bg-transparent border-border hover:bg-elevated',
                    )}
                  >
                    <span className="text-xs text-fg font-mono truncate">{r.full_name}</span>
                    {r.private && <span className="text-[10px] text-fg-muted bg-elevated px-1.5 py-0.5 rounded">private</span>}
                  </button>
                ))}
                {filteredRepos.length === 0 && !loading && (
                  <div className="text-xs text-fg-muted py-4 text-center">{ui.setup.noRepos}</div>
                )}
              </div>
            </div>
          )}

          {/* Step 3 — Language selection */}
          {step === 'langs' && (
            <div className="flex flex-col gap-4">
              <div className="text-xs text-fg-muted">
                {t(ui.setup.langsDetected, { count: detectedLangs.length })} — {detectedLangs.join(', ')}
              </div>

              <div>
                <div className="text-[10px] text-fg-muted font-semibold tracking-wider uppercase mb-2">{ui.setup.branchLabel}</div>
                <select
                  value={branch}
                  onChange={e => void handleBranchChange(e.target.value)}
                  className={cn(inputClass, 'w-full font-mono text-xs')}
                >
                  {branchNames.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-[10px] text-fg-muted font-semibold tracking-wider uppercase mb-2">{ui.setup.baseLangLabel}</div>
                <select
                  value={baseLang}
                  onChange={e => setBaseLang(e.target.value)}
                  className={cn(inputClass, 'w-full')}
                >
                  {detectedLangs.filter(l => selectedLangs.has(l)).map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-[10px] text-fg-muted font-semibold tracking-wider uppercase mb-2">{ui.setup.selectLangs}</div>
                <div className="flex flex-col gap-1 max-h-[260px] overflow-y-auto">
                  {detectedLangs.map(l => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => toggleLang(l)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-md text-left cursor-pointer border',
                        selectedLangs.has(l) ? 'bg-elevated border-border-strong' : 'bg-transparent border-border',
                      )}
                    >
                      <div className={cn(
                        'size-3.5 rounded-sm flex items-center justify-center text-[9px] text-fg-on-brand shrink-0 border-[1.5px]',
                        selectedLangs.has(l) ? 'bg-brand border-brand' : 'bg-transparent border-fg-muted',
                      )}>{selectedLangs.has(l) ? '✓' : ''}</div>
                      <span className="text-xs text-fg">{l}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-border flex items-center justify-between gap-2">
          <button type="button" onClick={onSkip} className={cn(btnSecClass, 'text-xs')}>{ui.setup.skip}</button>

          <div className="flex gap-2">
            {step !== 'auth' && (
              <button
                type="button"
                onClick={() => {
                  if (step === 'repo') setStep('auth')
                  else if (step === 'langs') setStep('repo')
                }}
                className={btnSecClass}
              >{ui.setup.back}</button>
            )}

            {step === 'auth' && showPatFallback && (
              <button
                type="button"
                onClick={handlePatConnect}
                disabled={!patInput.trim() || loading}
                className={btnPrimaryClass}
              >{loading ? ui.setup.connecting : ui.setup.connect}</button>
            )}

            {step === 'langs' && (
              <button
                type="button"
                onClick={handleFinish}
                disabled={selectedLangs.size === 0}
                className={cn(btnPrimaryClass, 'bg-success-bg border-border-success text-fg-success')}
              >{ui.setup.finish}</button>
            )}
          </div>
        </div>

        {loading && step !== 'auth' && (
          <div className="absolute inset-0 bg-overlay flex items-center justify-center z-10">
            <div className="text-sm text-fg-muted">{ui.setup.loading}</div>
          </div>
        )}
      </div>
    </div>
  )
}
