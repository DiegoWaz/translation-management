import { useEffect, useRef, useState } from 'react'
import { cn } from '../helpers/cn'
import { btnPrimaryClass, btnSecClass, inputClass } from '../helpers/styles'
import {
  detectAllLocaleFiles,
  getTranslationFilePaths,
  listBranches,
  listRepos,
  listTranslationFolderCandidates,
  listTree,
  resolveFolderPaths,
  validateToken,
  type GhRepo,
  type GhTreeEntry,
} from '../helpers/githubBrowser'
import { buildAuthorizeUrl } from '../helpers/githubOAuth'
import { loadSetupPreferences, type SetupPreferences } from '../helpers/config'
import { GithubIcon } from './Icons'
import { Logo } from './Logo'
import { ui, t } from '../i18n/ui'

type Step = 'auth' | 'repo' | 'langs'

interface Props {
  oauthToken?: string
  onComplete: (cfg: {
    token: string
    owner: string
    repo: string
    branch: string
    langs: string[]
    baseLang: string
    translationsFolderName: string
    filePaths: Record<string, string[]>
  }) => void
  onSkip: () => void
  isMobile: boolean
}

const defaultBaseLang = (langs: string[]): string =>
  langs.includes('en-GB') ? 'en-GB' : langs.find(l => l.startsWith('en')) ?? langs[0]

const prefsForRepo = (prefs: SetupPreferences | null, repo: GhRepo): SetupPreferences | null =>
  prefs?.owner === repo.owner.login && prefs?.repo === repo.name ? prefs : null

const defaultFolderInput = (prefs: SetupPreferences | null): string =>
  prefs?.translationsFolderName
  || import.meta.env.VITE_TRANSLATIONS_FOLDER_NAME
  || 'translations'

export const SetupWizard = ({ oauthToken, onComplete, onSkip, isMobile }: Props) => {
  const hasOAuthClientId = !!import.meta.env.VITE_GH_CLIENT_ID
  const [savedPrefs] = useState(() => loadSetupPreferences())

  const [step, setStep] = useState<Step>(oauthToken ? 'repo' : 'auth')
  const [token, setToken] = useState(oauthToken ?? '')
  const [patInput, setPatInput] = useState('')
  const [showPatFallback, setShowPatFallback] = useState(false)
  const [username, setUsername] = useState('')
  const [repos, setRepos] = useState<GhRepo[]>([])
  const [repoSearch, setRepoSearch] = useState('')
  const [selectedRepo, setSelectedRepo] = useState<GhRepo | null>(null)
  const [branch, setBranch] = useState(savedPrefs?.branch ?? 'main')
  const [branchNames, setBranchNames] = useState<string[]>([])
  const [folderInput, setFolderInput] = useState(() => defaultFolderInput(savedPrefs))
  const [folderCandidates, setFolderCandidates] = useState<string[]>([])
  const [matchedFolders, setMatchedFolders] = useState<string[]>([])
  const [detectedLangs, setDetectedLangs] = useState<string[]>([])
  const [selectedLangs, setSelectedLangs] = useState<Set<string>>(new Set())
  const [baseLang, setBaseLang] = useState(savedPrefs?.baseLang ?? '')
  const [prefsRestored, setPrefsRestored] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const treeCacheRef = useRef<{ repo: string; branch: string; tree: GhTreeEntry[] } | null>(null)

  const computeLangSelection = (langs: string[], prefs: SetupPreferences | null) => {
    const preferredActive = prefs?.langs.filter(l => langs.includes(l)) ?? []
    const active = preferredActive.length > 0 ? preferredActive : langs
    const preferredBase = prefs?.baseLang && active.includes(prefs.baseLang)
      ? prefs.baseLang
      : defaultBaseLang(active)
    const restored = Boolean(
      prefs && (
        (prefs.baseLang && active.includes(prefs.baseLang))
        || preferredActive.length > 0
      ),
    )
    return { active, baseLang: preferredBase, restored }
  }

  const applyLangSelection = (langs: string[], prefs: SetupPreferences | null): boolean => {
    setDetectedLangs(langs)
    const { active, baseLang: nextBase, restored } = computeLangSelection(langs, prefs)
    setSelectedLangs(new Set(active))
    setBaseLang(nextBase)
    setPrefsRestored(restored)
    return restored
  }

  const detectFromTree = (
    tree: GhTreeEntry[],
    folder: string,
    prefs: SetupPreferences | null,
  ): string[] => {
    const folders = resolveFolderPaths(tree, folder)
    setMatchedFolders(folders)
    setFolderCandidates(listTranslationFolderCandidates(tree))
    const langs = detectAllLocaleFiles(tree, folder)
    if (langs.length > 0) applyLangSelection(langs, prefs)
    else {
      setDetectedLangs([])
      setSelectedLangs(new Set())
      setBaseLang('')
    }
    return langs
  }

  const fetchTree = async (repo: GhRepo, branchName: string): Promise<GhTreeEntry[]> => {
    const cacheKey = `${repo.full_name}:${branchName}`
    const cached = treeCacheRef.current
    if (cached && `${cached.repo}:${cached.branch}` === cacheKey) return cached.tree
    const tree = await listTree(token, repo.owner.login, repo.name, branchName)
    treeCacheRef.current = { repo: repo.full_name, branch: branchName, tree }
    return tree
  }

  const completeSetup = (
    repo: GhRepo,
    branchName: string,
    langs: string[],
    nextBaseLang: string,
    tree: GhTreeEntry[],
  ) => {
    const folder = folderInput.trim()
    onComplete({
      token,
      owner: repo.owner.login,
      repo: repo.name,
      branch: branchName,
      langs,
      baseLang: nextBaseLang,
      translationsFolderName: folder,
      filePaths: getTranslationFilePaths(tree, folder),
    })
  }

  useEffect(() => {
    if (oauthToken && step === 'auth') setStep('repo')
  }, [oauthToken, step])

  useEffect(() => {
    if (oauthToken) setToken(oauthToken)
  }, [oauthToken])

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

  const openRepoSetup = async (
    repo: GhRepo,
    prefs: SetupPreferences | null,
    options?: { autoFinish?: boolean },
  ) => {
    setSelectedRepo(repo)
    treeCacheRef.current = null
    setLoading(true)
    setError('')
    setPrefsRestored(false)
    const folder = prefs?.translationsFolderName ?? folderInput
    if (prefs?.translationsFolderName) setFolderInput(prefs.translationsFolderName)

    try {
      const branchList = await listBranches(token, repo.owner.login, repo.name)
      const names = branchList.map(b => b.name).sort((a, b) => a.localeCompare(b))
      setBranchNames(names)
      const selectedBranch = prefs?.branch && names.includes(prefs.branch)
        ? prefs.branch
        : names.includes(repo.default_branch) ? repo.default_branch : names[0] || 'main'
      setBranch(selectedBranch)

      const tree = await fetchTree(repo, selectedBranch)
      const langs = detectFromTree(tree, folder, prefs)
      if (langs.length === 0) {
        setError(t(ui.setup.folderNoMatch, { folder }))
        return
      }

      const { active, baseLang: nextBaseLang, restored } = computeLangSelection(langs, prefs)

      if (options?.autoFinish && restored && active.length > 0) {
        completeSetup(repo, selectedBranch, active, nextBaseLang, tree)
        return
      }

      setStep('langs')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectRepo = (repo: GhRepo) => {
    void openRepoSetup(repo, prefsForRepo(savedPrefs, repo))
  }

  const handleResumeLastSetup = () => {
    if (!savedPrefs) return
    const repo = repos.find(r => r.owner.login === savedPrefs.owner && r.name === savedPrefs.repo)
    if (!repo) {
      setError(t(ui.setup.resumeNotFound, { repo: `${savedPrefs.owner}/${savedPrefs.repo}` }))
      return
    }
    void openRepoSetup(repo, savedPrefs, { autoFinish: true })
  }

  const handleBranchChange = async (branchName: string) => {
    if (!selectedRepo) return
    setBranch(branchName)
    setLoading(true)
    setError('')
    try {
      const tree = await fetchTree(selectedRepo, branchName)
      const langs = detectFromTree(tree, folderInput, prefsForRepo(savedPrefs, selectedRepo))
      if (langs.length === 0) setError(t(ui.setup.folderNoMatch, { folder: folderInput.trim() }))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleFolderChange = (nextFolder: string) => {
    setFolderInput(nextFolder)
    setError('')
    const cached = treeCacheRef.current
    if (!cached || !selectedRepo) return
    const langs = detectFromTree(cached.tree, nextFolder, prefsForRepo(savedPrefs, selectedRepo))
    if (langs.length === 0) setError(t(ui.setup.folderNoMatch, { folder: nextFolder.trim() }))
  }

  const handleFinish = () => {
    if (!selectedRepo || selectedLangs.size === 0) return
    const cached = treeCacheRef.current
    if (!cached) return
    completeSetup(selectedRepo, branch, [...selectedLangs], baseLang, cached.tree)
  }

  const toggleLang = (l: string) => setSelectedLangs(prev => {
    const next = new Set(prev)
    next.has(l) ? next.delete(l) : next.add(l)
    return next
  })

  const filteredRepos = repoSearch
    ? repos.filter(r => r.full_name.toLowerCase().includes(repoSearch.toLowerCase()))
    : repos

  const canResumeLast = Boolean(
    savedPrefs
    && token
    && repos.some(r => r.owner.login === savedPrefs.owner && r.name === savedPrefs.repo),
  )

  const stepIndex = { auth: 0, repo: 1, langs: 2 }[step]
  const stepLabels = [ui.setup.stepToken, ui.setup.stepRepo, ui.setup.stepLangs]

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center backdrop-blur-[4px] bg-overlay">
      <div
        className={cn(
          'bg-card flex flex-col overflow-hidden relative',
          isMobile ? 'w-screen h-dvh rounded-none border-none' : 'w-[600px] max-h-[85vh] rounded-xl border border-border',
        )}
      >
        <div className="px-6 py-4 border-b border-border">
          <Logo size="md" showWordmark className="mb-3" />
          <p className="m-0 text-xs text-fg-muted">{ui.setup.subtitle}</p>
          <div className="flex gap-1.5 mt-3">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex-1 flex flex-col gap-1">
                <div className={cn('h-1 rounded-full', i <= stepIndex ? 'bg-brand' : 'bg-elevated')} />
                <span className={cn('text-[10px]', i <= stepIndex ? 'text-fg-brand font-medium' : 'text-fg-muted')}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {error && (
            <div className="mb-3 p-2.5 rounded-lg bg-error-bg border border-border-error text-fg-error text-xs">
              {error}
            </div>
          )}

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

          {step === 'repo' && (
            <div className="flex flex-col gap-3">
              <div className="text-xs text-fg-muted">{t(ui.setup.loggedAs, { user: username })}</div>

              {canResumeLast && savedPrefs && (
                <div className="rounded-lg border border-border-brand-soft bg-brand-soft-bg p-3 flex flex-col gap-2">
                  <p className="m-0 text-[11px] text-fg-secondary leading-relaxed">{ui.setup.resumeLastHint}</p>
                  <button
                    type="button"
                    onClick={handleResumeLastSetup}
                    className={cn(btnPrimaryClass, 'w-full text-xs')}
                  >
                    {t(ui.setup.resumeLast, {
                      repo: `${savedPrefs.owner}/${savedPrefs.repo}`,
                      baseLang: savedPrefs.baseLang,
                      count: savedPrefs.langs.length,
                    })}
                  </button>
                </div>
              )}

              <input
                type="text"
                value={repoSearch}
                onChange={e => setRepoSearch(e.target.value)}
                placeholder={ui.setup.searchRepo}
                className={inputClass}
                autoFocus={!canResumeLast}
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

          {step === 'langs' && (
            <div className="flex flex-col gap-4">
              {prefsRestored && (
                <div className="text-xs text-fg-success bg-success-bg border border-border-success rounded-md px-3 py-2">
                  {ui.setup.prefsRestored}
                </div>
              )}

              <div>
                <div className="text-[10px] text-fg-muted font-semibold tracking-wider uppercase mb-2">{ui.setup.folderLabel}</div>
                <input
                  type="text"
                  value={folderInput}
                  onChange={e => handleFolderChange(e.target.value)}
                  placeholder="translations"
                  className={cn(inputClass, 'w-full font-mono text-xs')}
                  list="folder-suggestions"
                />
                <datalist id="folder-suggestions">
                  {folderCandidates.map(path => (
                    <option key={path} value={path} />
                  ))}
                </datalist>
                <p className="m-0 mt-1.5 text-[11px] text-fg-muted leading-relaxed">{ui.setup.folderHint}</p>
                {matchedFolders.length > 0 && (
                  <p className="m-0 mt-1 text-[11px] text-fg-secondary">
                    {t(ui.setup.folderMatched, { count: matchedFolders.length, paths: matchedFolders.join(', ') })}
                  </p>
                )}
              </div>

              {folderCandidates.length > 0 && (
                <div>
                  <div className="text-[10px] text-fg-muted font-semibold tracking-wider uppercase mb-2">{ui.setup.folderSuggestions}</div>
                  <div className="flex flex-wrap gap-1.5 max-h-[88px] overflow-y-auto">
                    {folderCandidates.map(path => (
                      <button
                        key={path}
                        type="button"
                        onClick={() => handleFolderChange(path)}
                        className={cn(
                          'px-2 py-1 rounded-md text-[11px] font-mono cursor-pointer border',
                          folderInput === path
                            ? 'bg-brand-soft-bg border-border-brand-soft text-fg-brand'
                            : 'bg-elevated border-border text-fg-muted hover:text-fg',
                        )}
                      >
                        {path}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-fg-muted">
                {t(ui.setup.langsDetected, { count: detectedLangs.length })}
                {detectedLangs.length > 0 && ` — ${detectedLangs.join(', ')}`}
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
                <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto">
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
