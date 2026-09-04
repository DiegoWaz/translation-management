import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type {
  CommitRecord,
  ConfigMap,
  ConfigSchema,
  ConfigValue,
  ConfigValueType,
  FileSource,
  FilterMode,
  KeyLastModifiedMap,
  ParsedImport,
  SearchMode,
  StaleLangConflict,
  TranslationColumnWidths,
  WorkspaceMode,
} from '../types'
import { useWidth } from './useWidth'
import { useToast } from './useToast'
import { useStalePoll } from './useStalePoll'
import {
  buildDemoConfigs,
  buildDemoTranslations,
  DEFAULT_CONFIG_PATH_TEMPLATE,
  DEFAULT_CONFIG_SCHEMA_PATH,
  DEFAULT_DEMO_CONFIG,
  DEMO_CONFIG_SCHEMA,
  makeDemoHistory,
} from '../helpers/defaults'
import { isGithubConfigured, loadConfig, saveUiConfig, loadUiConfig, waitForTokenReady, loadRefConfig, persistSourceBranch, invalidateStoredToken, refreshGitHubSession, ensureFreshAccessToken } from '../helpers/config'
import {
  clampWidth,
  DEFAULT_TRANSLATION_COLUMN_WIDTHS,
  loadColumnWidths,
  saveColumnWidths,
} from '../helpers/columnWidths'
import { buildKeyLastModified, mergeCommitRecords } from '../helpers/history'
import { commitJsonFilesAsPR, fetchFileCommits, loadFile, loadJsonFile, prepareCommitContent } from '../helpers/github'
import { isGitHubSessionError } from '../helpers/githubAuth'
import { listTree, getTranslationFilePaths } from '../helpers/githubBrowser'
import { downloadKeyCsv } from '../helpers/exportGenerators'
import { loadConfigBundle, loadTranslationBundle } from '../helpers/loadBundle'
import {
  buildKeyGroups,
  buildLangStats,
  buildSearchMatchMap,
  buildVarIssuesMap,
  collectTranslationKeys,
  columnLayout,
  filterKeys,
  getModifiedKeys,
  groupKeyPrefix,
} from '../helpers/filtering'
import {
  addKeyToAll,
  applyBulkAssignments,
  cloneTranslations,
  duplicateKeyInAll,
  mergeTranslationMaps,
  removeKeyFromAll,
  renameKeyInAll,
} from '../helpers/translations'
import {
  addConfigKey,
  buildConfigLangStats,
  clearConfigKeyOnLang,
  cloneConfigs,
  cloneSchema,
  filterConfigKeys,
  getModifiedConfigKeys,
  isCamelCaseConfigKey,
  normalizeConfigMap,
  normalizeSchema,
  removeConfigKey,
  renameConfigKey,
  schemasEqual,
} from '../helpers/configValues'
import { defaultPath, deriveLangMeta } from '../helpers/lang'
import { splitFlatByFileSources } from '../helpers/commitHelpers'
import {
  applyStaleResolutions,
  buildKeyOwnersFromSources,
  detectDuplicateKeys,
  refreshFileSourceAfterCommit,
  resolveKeySourceIndex,
  type KeyOwnerMap,
} from '../helpers/fileSources'
import { isDraftDirty, loadDraft, saveDraft } from '../helpers/draftStorage'
import { dismissWelcome } from '../helpers/welcome'
import { detectUiLocale, setUiLocale, t, ui, type UiLocale } from '../i18n/ui'
import {
  cleanOAuthParams,
  exchangeCodeForToken,
  extractOAuthCode,
  verifyState,
  hasOAuthCallback,
  type GitHubOAuthTokens,
} from '../helpers/githubOAuth'

// Load config with fallback to demo config if empty
export const loadConfigOrDefault = () => {
  const c = loadConfig()
  return c.files.length > 0 ? c : DEFAULT_DEMO_CONFIG
}

const PAGE_SIZE_KEY = 'localehub:pageSize:v1'
const THEME_KEY = 'localehub:theme:v1'
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const
const DEFAULT_PAGE_SIZE = 50

const loadStoredIsDark = (): boolean => {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light') return false
    if (stored === 'dark') return true
  } catch { /* ignore */ }
  return true
}

export const useTranslationApp = () => {
  const [config, setConfig] = useState(loadConfigOrDefault)
  const [initialDraft] = useState(() => loadDraft(loadConfigOrDefault()))
  const [showSetup, setShowSetup] = useState(() => hasOAuthCallback())
  const [oauthToken, setOauthToken] = useState<string | undefined>(undefined)
  const [oauthConnecting, setOauthConnecting] = useState(false)
  const pendingOAuthRef = useRef<GitHubOAuthTokens | null>(null)
  /** Skip autosave while Load swaps branches so we don't clobber another branch's draft. */
  const suppressDraftSaveRef = useRef(false)
  const [fileSources, setFileSources] = useState<Record<string, FileSource[]>>(
    () => initialDraft?.fileSources ?? {},
  )
  const [keyOwners, setKeyOwners] = useState<KeyOwnerMap>(
    () => initialDraft?.keyOwners ?? buildKeyOwnersFromSources(initialDraft?.fileSources ?? {}),
  )
  const [workspace] = useState<WorkspaceMode>('translations')
  const [translations, setTranslations] = useState(() => {
    if (initialDraft) return initialDraft.translations
    const c = loadConfigOrDefault()
    return buildDemoTranslations(c.files.map(f => f.lang), c.baseLang)
  })
  const [original, setOriginal] = useState(() => {
    if (initialDraft) return initialDraft.original
    const c = loadConfigOrDefault()
    return buildDemoTranslations(c.files.map(f => f.lang), c.baseLang)
  })
  const [shas, setShas] = useState<Record<string, string>>(() => initialDraft?.shas ?? {})
  const [configSchema, setConfigSchema] = useState<ConfigSchema>(
    () => initialDraft ? { ...initialDraft.configSchema } : { ...DEMO_CONFIG_SCHEMA },
  )
  const [configSchemaOriginal, setConfigSchemaOriginal] = useState<ConfigSchema>(
    () => initialDraft ? { ...initialDraft.configSchemaOriginal } : { ...DEMO_CONFIG_SCHEMA },
  )
  const [configs, setConfigs] = useState<Record<string, ConfigMap>>(() => {
    if (initialDraft) return initialDraft.configs
    const c = loadConfigOrDefault()
    return buildDemoConfigs(c.files.map(f => f.lang), c.baseLang)
  })
  const [configsOriginal, setConfigsOriginal] = useState<Record<string, ConfigMap>>(() => {
    if (initialDraft) return initialDraft.configsOriginal
    const c = loadConfigOrDefault()
    return buildDemoConfigs(c.files.map(f => f.lang), c.baseLang)
  })
  const [configShas, setConfigShas] = useState<Record<string, string>>(
    () => initialDraft?.configShas ?? {},
  )
  const [schemaSha, setSchemaSha] = useState(() => initialDraft?.schemaSha ?? '')
  const [activeLang, setActiveLang] = useState(() => {
    if (initialDraft?.activeLang) return initialDraft.activeLang
    const c = loadConfigOrDefault()
    return c.files.find(f => f.lang !== c.baseLang)?.lang ?? c.baseLang
  })
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState<number>(() => {
    const stored = Number(localStorage.getItem(PAGE_SIZE_KEY))
    return (PAGE_SIZE_OPTIONS as readonly number[]).includes(stored) ? stored : DEFAULT_PAGE_SIZE
  })
  const [showSettings, setShowSettings] = useState(false)
  const [showLoad, setShowLoad] = useState(false)
  const [showCommit, setShowCommit] = useState(false)
  const [commitMsg, setCommitMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(() => initialDraft?.isDemoMode ?? true)
  const [addingKey, setAddingKey] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newConfigType, setNewConfigType] = useState<ConfigValueType>('text')
  const [showHistory, setShowHistory] = useState(false)
  const [fileHistory, setFileHistory] = useState<Record<string, CommitRecord[]>>({})
  const [historyStatus, setHistoryStatus] = useState<Record<string, 'idle' | 'loading' | 'loaded' | 'error'>>({})
  const historyRequestRef = useRef<Record<string, number>>({})
  const historyStatusRef = useRef(historyStatus)
  historyStatusRef.current = historyStatus
  const [keyHistoryFilter, setKeyHistoryFilter] = useState<string | null>(null)
  const [keyLastModified, setKeyLastModified] = useState<Record<string, KeyLastModifiedMap>>({})
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [staleConflicts, setStaleConflicts] = useState<StaleLangConflict[]>([])
  const [showStaleConflict, setShowStaleConflict] = useState(false)
  const [duplicateKeysDismissed, setDuplicateKeysDismissed] = useState(false)
  const [sessionLostReason, setSessionLostReason] = useState<string | null>(null)
  const [githubReady, setGithubReady] = useState(false)
  const pendingSessionLostRef = useRef<string | null>(null)
  const oauthHandledRef = useRef(false)
  const staleDismissedRef = useRef<Set<string>>(new Set())
  const staleLangs = useMemo(() => staleConflicts.map(c => c.lang), [staleConflicts])
  const [varValidation, setVarValidation] = useState(true)
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [searchMode, setSearchMode] = useState<SearchMode>('locale')
  const [columnWidths, setColumnWidths] = useState<TranslationColumnWidths>(loadColumnWidths)
  const [isDark, setIsDark] = useState(loadStoredIsDark)
  const [uiLocale, setUiLocaleState] = useState<UiLocale>(detectUiLocale)
  const [draftRestored] = useState(() => {
    if (!initialDraft) return false
    const modifiedTx = getModifiedKeys(
      initialDraft.translations,
      initialDraft.original,
      config.baseLang,
    )
    const modifiedCfg = getModifiedConfigKeys(
      initialDraft.configs,
      initialDraft.configsOriginal,
      initialDraft.configSchema,
      config.baseLang,
    )
    const schemaChanged = !schemasEqual(
      initialDraft.configSchema,
      initialDraft.configSchemaOriginal,
    )
    return modifiedTx.length > 0 || modifiedCfg.length > 0 || schemaChanged
  })

  // Encrypted token storage decrypts asynchronously; once ready, refresh config
  // and proactively rotate OAuth access tokens that are about to expire.
  useEffect(() => {
    void waitForTokenReady().then(async () => {
      const fresh = await ensureFreshAccessToken()
      const c = loadConfigOrDefault()
      if (fresh) {
        setConfig(prev => ({ ...prev, ...c, token: fresh }))
      } else if (c.token) {
        setConfig(prev => (prev.token ? prev : c))
      }
      setGithubReady(true)
    })
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    try { localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light') } catch { /* ignore */ }
  }, [isDark])

  useEffect(() => {
    setUiLocale(uiLocale)
  }, [uiLocale])

  const handleUiLocaleChange = (locale: UiLocale) => {
    setUiLocale(locale)
    setUiLocaleState(locale)
  }

  const configPathForLang = useCallback(
    (lang: string) => defaultPath(lang, config.configPathTemplate),
    [config.configPathTemplate],
  )

  const localizedConfig = useMemo(() => ({
    ...config,
    files: config.files.map(f => {
      const meta = deriveLangMeta(f.lang, uiLocale)
      return { ...f, label: meta.label, flag: meta.flag }
    }),
  }), [config, uiLocale])

  const { toasts, showToast } = useToast()
  const isConnected = isGithubConfigured(config)

  // Handle OAuth redirect callback (after GitHub authorizes the app).
  useEffect(() => {
    if (oauthHandledRef.current) return
    const oauthResult = extractOAuthCode()
    if (!oauthResult) return
    oauthHandledRef.current = true

    if (!verifyState(oauthResult.state)) {
      cleanOAuthParams()
      setShowSetup(true)
      showToast(ui.toast.oauthStateInvalid, 'error')
      return
    }

    cleanOAuthParams()
    setOauthConnecting(true)
    setShowSetup(true)

    void exchangeCodeForToken(oauthResult.code)
      .then(tokens => {
        pendingOAuthRef.current = tokens
        setOauthToken(tokens.accessToken)
        showToast(ui.toast.oauthConnected, 'success')
      })
      .catch((e: Error) => {
        oauthHandledRef.current = false
        pendingOAuthRef.current = null
        setOauthToken(undefined)
        showToast(t(ui.toast.oauthFailed, { message: e.message }), 'error')
      })
      .finally(() => setOauthConnecting(false))
  }, [showToast])

  const applyOAuthTokens = useCallback((tokens: GitHubOAuthTokens) => {
    pendingOAuthRef.current = tokens
    setConfig(prev => ({ ...prev, token: tokens.accessToken }))
    setSessionLostReason(null)
  }, [])

  const trySilentRefresh = useCallback(async (): Promise<boolean> => {
    const tokens = await refreshGitHubSession()
    if (!tokens) return false
    applyOAuthTokens(tokens)
    return true
  }, [applyOAuthTokens])

  const withSessionRetry = useCallback(async <T>(fn: (token: string) => Promise<T>): Promise<T> => {
    const run = async () => {
      const token = (await ensureFreshAccessToken()) || loadConfig().token
      if (!token) throw new Error(ui.sessionLost.expired)
      return fn(token)
    }
    try {
      return await run()
    } catch (e) {
      if (!isGitHubSessionError(e)) throw e
      const recovered = await trySilentRefresh()
      if (!recovered) throw e
      return await run()
    }
  }, [trySilentRefresh])

  const promptSessionLost = useCallback((reason: string, userInitiated = false) => {
    if (!userInitiated) return
    const message = reason || ui.sessionLost.expired
    if (loading) {
      pendingSessionLostRef.current = message
      return
    }
    invalidateStoredToken()
    setConfig(prev => ({ ...prev, token: '' }))
    setSessionLostReason(message)
    setShowLoad(false)
    setShowCommit(false)
    setShowSettings(false)
    setLoading(false)
  }, [loading])

  useEffect(() => {
    if (loading || !pendingSessionLostRef.current) return
    const message = pendingSessionLostRef.current
    pendingSessionLostRef.current = null
    invalidateStoredToken()
    setConfig(prev => ({ ...prev, token: '' }))
    setSessionLostReason(message)
    setShowLoad(false)
    setShowCommit(false)
    setShowSettings(false)
  }, [loading])

  const githubApiReady = isConnected && githubReady && !isDemoMode

  // Never leave Load/Commit open without a valid GitHub session.
  useEffect(() => {
    if (isConnected && !sessionLostReason && !isDemoMode) return
    setShowLoad(false)
    setShowCommit(false)
  }, [isConnected, sessionLostReason, isDemoMode])

  useEffect(() => {
    if (!draftRestored) return
    showToast(ui.toast.draftRestored, 'info')
    // once on mount when an uncommitted draft was restored
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist working copy so reload keeps uncommitted edits (per source branch).
  useEffect(() => {
    if (suppressDraftSaveRef.current) return
    saveDraft(config, {
      isDemoMode,
      workspace,
      activeLang,
      translations,
      original,
      configs,
      configsOriginal,
      configSchema,
      configSchemaOriginal,
      shas,
      configShas,
      schemaSha,
      fileSources,
      keyOwners,
    })
  }, [
    config,
    isDemoMode,
    workspace,
    activeLang,
    translations,
    original,
    configs,
    configsOriginal,
    configSchema,
    configSchemaOriginal,
    shas,
    configShas,
    schemaSha,
    fileSources,
    keyOwners,
  ])

  useEffect(() => {
    if (!isDemoMode) return
    const demoCommits = makeDemoHistory()
    const h = config.files.reduce<Record<string, CommitRecord[]>>((acc, f) => {
      acc[f.lang] = f.lang === config.baseLang ? demoCommits : []
      return acc
    }, {})
    const k = Object.entries(h).reduce<Record<string, KeyLastModifiedMap>>((acc, [lang, commits]) => {
      acc[lang] = buildKeyLastModified(commits)
      return acc
    }, {})
    setFileHistory(h)
    setKeyLastModified(k)
    setHistoryStatus({})
  }, [isDemoMode, config.files, config.baseLang])

  const onStale = useCallback((conflicts: StaleLangConflict[]) => {
    setStaleConflicts(prev => {
      const byLang = new Map(prev.map(c => [c.lang, c]))
      for (const c of conflicts) byLang.set(c.lang, c)
      return [...byLang.values()]
    })
  }, [])

  useStalePoll({
    config,
    translations,
    githubApiReady,
    loading,
    fileSources,
    keyOwners,
    dismissedLangsRef: staleDismissedRef,
    onStale,
  })

  const duplicateKeyWarnings = useMemo(
    () => detectDuplicateKeys(fileSources),
    [fileSources],
  )

  const modifiedKeys = useMemo(
    () => getModifiedKeys(translations, original, config.baseLang),
    [translations, original, config.baseLang],
  )

  const modifiedConfigKeys = useMemo(
    () => getModifiedConfigKeys(configs, configsOriginal, configSchema, config.baseLang),
    [configs, configsOriginal, configSchema, config.baseLang],
  )

  const schemaDirty = useMemo(
    () => !schemasEqual(configSchema, configSchemaOriginal),
    [configSchema, configSchemaOriginal],
  )

  const langsNeedingFile = useMemo(() => {
    if (isDemoMode) return []
    return config.files.map(f => f.lang).filter(lang => !shas[lang])
  }, [isDemoMode, config.files, shas])

  const configLangsNeedingFile = useMemo(() => {
    if (isDemoMode) return []
    return config.files.map(f => f.lang).filter(lang => !configShas[lang])
  }, [isDemoMode, config.files, configShas])

  const schemaNeedingFile = !isDemoMode && !schemaSha

  const handleLoad = async (branch?: string) => {
    if (sessionLostReason) { setShowSetup(true); return }
    if (!isConnected) { setShowSettings(true); return }
    if (!githubReady) return
    const sourceBranch = branch ?? config.sourceBranch
    const previousConfig = config

    // Flush current branch draft before switching so edits survive Load.
    saveDraft(previousConfig, {
      isDemoMode,
      workspace,
      activeLang,
      translations,
      original,
      configs,
      configsOriginal,
      configSchema,
      configSchemaOriginal,
      shas,
      configShas,
      schemaSha,
      fileSources,
      keyOwners,
    })

    setLoading(true)
    suppressDraftSaveRef.current = true
    try {
      await withSessionRetry(async token => {
      const loadConfigRef = loadRefConfig({ ...config, token, sourceBranch })
      const tree = await listTree(loadConfigRef.token, loadConfigRef.owner, loadConfigRef.repo, loadConfigRef.branch)
      const folderName = config.translationsFolderName || 'translations'
      const filePaths = getTranslationFilePaths(tree, folderName)

      const { translations: newTrans, shas: newShas, fileSources: newFileSources } =
        await loadTranslationBundle(loadConfigRef, filePaths)

      const discoveredFiles = Object.entries(newFileSources).map(([lang, sources]) => ({
        lang,
        label: lang,
        flag: '🌐',
        path: sources[0]?.path ?? `${folderName}/${lang}.json`,
      }))
      const updatedConfig = { ...config, token, sourceBranch, files: discoveredFiles }
      const draftConfig = loadRefConfig(updatedConfig)

      const { schema, schemaSha: remoteSchemaSha, configs: newConfigs, configShas: newConfigShas } =
        await loadConfigBundle(draftConfig, updatedConfig.files)

      const existingDraft = loadDraft(updatedConfig)
        ?? loadDraft({ ...updatedConfig, files: previousConfig.files })
      const restoreDraft = Boolean(existingDraft && isDraftDirty(existingDraft))

      setConfig(updatedConfig)
      persistSourceBranch(updatedConfig, sourceBranch)
      resetHistoryCache()
      setIsDemoMode(false)
      setStaleConflicts([])
      staleDismissedRef.current.clear()
      setSessionLostReason(null)
      setShowLoad(false)

      if (restoreDraft && existingDraft) {
        setFileSources(existingDraft.fileSources ?? newFileSources)
        setKeyOwners(existingDraft.keyOwners ?? buildKeyOwnersFromSources(existingDraft.fileSources ?? newFileSources))
        setTranslations(existingDraft.translations)
        setOriginal(existingDraft.original)
        setShas(existingDraft.shas)
        setConfigSchema(existingDraft.configSchema)
        setConfigSchemaOriginal(existingDraft.configSchemaOriginal)
        setSchemaSha(existingDraft.schemaSha)
        setConfigs(existingDraft.configs)
        setConfigsOriginal(existingDraft.configsOriginal)
        setConfigShas(existingDraft.configShas)
        if (existingDraft.activeLang) setActiveLang(existingDraft.activeLang)
        showToast(ui.toast.draftRestoredOnBranch, 'info')
      } else {
        setFileSources(newFileSources)
        setKeyOwners(buildKeyOwnersFromSources(newFileSources))
        setTranslations(newTrans)
        setOriginal(cloneTranslations(newTrans))
        setShas(newShas)
        setConfigSchema(schema)
        setConfigSchemaOriginal(cloneSchema(schema))
        setSchemaSha(remoteSchemaSha)
        setConfigs(newConfigs)
        setConfigsOriginal(cloneConfigs(newConfigs))
        setConfigShas(newConfigShas)
        saveDraft(updatedConfig, {
          isDemoMode: false,
          workspace,
          activeLang,
          translations: newTrans,
          original: cloneTranslations(newTrans),
          configs: newConfigs,
          configsOriginal: cloneConfigs(newConfigs),
          configSchema: schema,
          configSchemaOriginal: cloneSchema(schema),
          shas: newShas,
          configShas: newConfigShas,
          schemaSha: remoteSchemaSha,
          fileSources: newFileSources,
          keyOwners: buildKeyOwnersFromSources(newFileSources),
        })
        showToast(
          sourceBranch === previousConfig.branch
            ? ui.toast.loadedFromGithub
            : t(ui.toast.loadedFromBranch, { branch: sourceBranch }),
          'success',
        )
      }
      })
    } catch (e) {
      if (isGitHubSessionError(e)) {
        promptSessionLost(e.message, true)
        return
      }
      showToast(t(ui.toast.error, { message: (e as Error).message }), 'error')
    } finally {
      suppressDraftSaveRef.current = false
      setLoading(false)
    }
  }

  const openLoadDialog = () => {
    if (sessionLostReason) { setShowSetup(true); return }
    if (!isConnected || isDemoMode) {
      setShowLoad(false)
      if (!isConnected) setShowSetup(true)
      else setShowSettings(true)
      return
    }
    setShowLoad(true)
  }

  const handleLoadConfirm = (branch: string) => {
    if (sessionLostReason || !isConnected || isDemoMode) {
      setShowLoad(false)
      if (sessionLostReason || !isConnected) setShowSetup(true)
      return
    }
    void handleLoad(branch)
  }

  const hasUnsavedChanges = modifiedKeys.length > 0
    || modifiedConfigKeys.length > 0
    || schemaDirty
    || langsNeedingFile.length > 0
    || configLangsNeedingFile.length > 0

  const resetHistoryCache = useCallback(() => {
    historyRequestRef.current = {}
    setFileHistory({})
    setHistoryStatus({})
    setKeyLastModified({})
  }, [])

  const handleLoadHistory = useCallback(async (lang: string, options?: { force?: boolean }) => {
    if (isDemoMode || !isConnected) return

    const sources = fileSources[lang]
    if (!sources || sources.length === 0) {
      console.warn(`[handleLoadHistory] No file sources found for language ${lang}`)
      return
    }

    if (!options?.force && historyStatusRef.current[lang] === 'loaded') return

    const requestId = (historyRequestRef.current[lang] ?? 0) + 1
    historyRequestRef.current[lang] = requestId
    setHistoryStatus(prev => ({ ...prev, [lang]: 'loading' }))

    try {
      const loadConfig = loadRefConfig(config)
      const batches: CommitRecord[][] = []
      for (const source of sources) {
        batches.push(await fetchFileCommits(loadConfig, source.path))
      }

      if (historyRequestRef.current[lang] !== requestId) return

      const allCommits = mergeCommitRecords(batches)
      setFileHistory(prev => ({ ...prev, [lang]: allCommits }))
      setKeyLastModified(prev => ({ ...prev, [lang]: buildKeyLastModified(allCommits) }))
      setHistoryStatus(prev => ({ ...prev, [lang]: 'loaded' }))
    } catch (e) {
      if (historyRequestRef.current[lang] !== requestId) return
      setHistoryStatus(prev => ({ ...prev, [lang]: 'error' }))
      if (!isGitHubSessionError(e)) {
        showToast(t(ui.toast.historyError, { message: (e as Error).message }), 'error')
      }
    }
  }, [isDemoMode, isConnected, fileSources, config, showToast])

  // Prefetch history once file sources are known (connected mode).
  const fileSourceLangKey = Object.keys(fileSources).sort().join(',')
  useEffect(() => {
    if (isDemoMode || loading || !githubApiReady || !fileSourceLangKey) return
    const timer = setTimeout(() => {
      for (const lang of fileSourceLangKey.split(',')) {
        const status = historyStatusRef.current[lang]
        if (status !== 'loaded' && status !== 'loading') {
          void handleLoadHistory(lang)
        }
      }
    }, 5_000)
    return () => clearTimeout(timer)
  }, [isDemoMode, loading, githubApiReady, fileSourceLangKey, handleLoadHistory])

  // Filter commits by a specific key
  const filteredHistoryByKey = (lang: string, key: string): CommitRecord[] => {
    const commits = fileHistory[lang] ?? []
    return commits.filter(commit => key in commit.changedKeys)
  }

  const translationCommitLangs = useMemo(
    () => [...new Set([...modifiedKeys.map(m => m.lang), ...langsNeedingFile])],
    [modifiedKeys, langsNeedingFile],
  )

  const configCommitLangs = useMemo(
    () => [...new Set([...modifiedConfigKeys.map(m => m.lang), ...configLangsNeedingFile])],
    [modifiedConfigKeys, configLangsNeedingFile],
  )

  const handleCommit = async () => {
    if (sessionLostReason) { setShowSetup(true); return }
    if (!isConnected) { setShowSettings(true); return }
    if (translationCommitLangs.length === 0) {
      showToast(ui.toast.nothingToCommit, 'info')
      return
    }
    setCommitMsg(t(ui.commit.defaultMessage, { langs: translationCommitLangs.join(', ') }))
    setShowCommit(true)
  }

  // PR-only: LocaleHub never pushes directly to the base branch. Every
  // change always lands on a dedicated branch behind a Pull Request that the
  // user reviews and merges themselves on GitHub — this app can't overwrite
  // or delete anything in the repo on its own.
  const doCommit = async (mode: 'pr' = 'pr', prTitle?: string, branchName?: string) => {
    setLoading(true)
    setShowCommit(false)
    try {
      const message = commitMsg.trim()
      if (!message) {
        showToast(ui.toast.nothingToCommit, 'info')
        return
      }

      if (workspace === 'translations') {
      const langs = translationCommitLangs
        const currentFlats = translations
        const files = langs.flatMap(lang => {
          const sources = fileSources[lang] || []
          
          // CRITICAL: if sources are empty, we cannot commit safely
          // This means the file was never loaded, so we skip to avoid creating files in wrong place
          if (sources.length === 0) {
            console.error(`[doCommit] No file sources tracked for language ${lang}. Skipping commit for this language.`)
            return []
          }
          
          const current = currentFlats[lang] ?? {}
          const perSource = splitFlatByFileSources(sources, current, keyOwners[lang])

          return sources.flatMap((source, idx) => {
            const relevantFlat = perSource[idx]

            const hasChanges =
              Object.keys(relevantFlat).some(k => relevantFlat[k] !== source.originalFlat[k])
              || Object.keys(source.originalFlat).some(k => !(k in relevantFlat))
              || Object.keys(relevantFlat).some(k => !(k in source.originalFlat))

            if (!hasChanges) return []

            const content = prepareCommitContent(
              relevantFlat,
              source.nested,
              source.originalFlat,
              source.rawContent,
            )
            return [{ path: source.path, content }]
          })
        })
        if (files.length === 0) {
          showToast(ui.toast.nothingToCommit, 'info')
          return
        }

        const { prNumber, prUrl, branchName: headBranch } = await withSessionRetry(token =>
          commitJsonFilesAsPR(
            { ...config, token },
            files,
            message,
            prTitle || message,
            branchName,
          ),
        )
        setOriginal(cloneTranslations(translations))
        setFileSources(prev => {
          const next: Record<string, FileSource[]> = {}
          for (const [lang, sources] of Object.entries(prev)) {
            const perSource = splitFlatByFileSources(sources, translations[lang] ?? {}, keyOwners[lang])
            next[lang] = sources.map((source, idx) =>
              refreshFileSourceAfterCommit(source, perSource[idx]),
            )
          }
          return next
        })

        const loadConfigRef = loadRefConfig({ ...config, token: loadConfig().token || config.token, sourceBranch: headBranch })
        const committedPaths = files.map(f => f.path)
        void Promise.all(committedPaths.map(async path => {
          const { sha } = await loadFile(loadConfigRef, path)
          return { path, sha }
        })).then(updates => {
          setFileSources(prev => {
            const next = { ...prev }
            for (const [lang, sources] of Object.entries(next)) {
              next[lang] = sources.map(source => {
                const hit = updates.find(u => u.path === source.path)
                return hit ? { ...source, sha: hit.sha } : source
              })
            }
            return next
          })
        }).catch(() => { /* shas refresh is best-effort */ })
        const updatedConfig = { ...config, token: loadConfig().token || config.token, sourceBranch: headBranch }
        setConfig(updatedConfig)
        persistSourceBranch(updatedConfig, headBranch)
        for (const lang of langs) {
          setHistoryStatus(prev => {
            const next = { ...prev }
            delete next[lang]
            return next
          })
          setFileHistory(prev => {
            const next = { ...prev }
            delete next[lang]
            return next
          })
          void handleLoadHistory(lang, { force: true })
        }
        showToast(t(ui.toast.prCreatedOnBranch, { number: prNumber, branch: headBranch }), 'success')
        window.open(prUrl, '_blank')
      }
    } catch (e) {
      if (isGitHubSessionError(e)) {
        promptSessionLost(e.message, true)
        return
      }
      showToast(t(ui.toast.error, { message: (e as Error).message }), 'error')
    } finally {
      setLoading(false)
    }
  }

  const updateValue = (lang: string, key: string, value: string) => {
    setTranslations(prev => {
      // Check if key exists in all languages
      const keyExistsInAll = Object.values(prev).every(translations => key in translations)
      
      // If key doesn't exist in all languages, add it first
      let updated = keyExistsInAll ? prev : addKeyToAll(prev, key)
      
      // Then update the value for the specific language
      updated = { ...updated, [lang]: { ...updated[lang], [key]: value } }
      return updated
    })
  }

  const updateConfigValue = (lang: string, key: string, value: ConfigValue) =>
    setConfigs(prev => ({ ...prev, [lang]: { ...prev[lang], [key]: value } }))

  const restoreKey = (lang: string, key: string, value: string) => {
    if (workspace === 'configs') {
      try {
        updateConfigValue(lang, key, JSON.parse(value) as ConfigValue)
      } catch {
        updateConfigValue(lang, key, value)
      }
    } else {
      updateValue(lang, key, value)
    }
    showToast(t(ui.toast.keyRestored, { key }), 'info')
  }

  const addKey = () => {
    const k = newKey.trim()
    if (!k) return
    if (workspace === 'configs') {
      if (!isCamelCaseConfigKey(k)) {
        showToast(ui.configs.errorCamelCase, 'error')
        return
      }
      if (configSchema[k]) {
        showToast(ui.configs.errorDuplicate, 'error')
        return
      }
      const langs = config.files.map(f => f.lang)
      const seedConfigs = langs.reduce<Record<string, ConfigMap>>((acc, lang) => {
        acc[lang] = { ...(configs[lang] ?? {}) }
        return acc
      }, {})
      // Seed only the active locale — other locales may omit the key
      const result = addConfigKey(configSchema, seedConfigs, k, newConfigType, [activeLang])
      setConfigSchema(result.schema)
      setConfigs(result.configs)
      setNewKey('')
      setNewConfigType('text')
      setAddingKey(false)
      showToast(t(ui.toast.configKeyAdded, { key: k }), 'info')
      return
    }
    setTranslations(prev => addKeyToAll(prev, k))
    setKeyOwners(prev => {
      const next: KeyOwnerMap = { ...prev }
      for (const f of config.files) {
        const sources = fileSources[f.lang] ?? []
        if (sources.length === 0) continue
        const idx = resolveKeySourceIndex(sources, k, prev[f.lang])
        next[f.lang] = { ...(next[f.lang] ?? {}), [k]: idx }
      }
      return next
    })
    setNewKey('')
    setAddingKey(false)
    showToast(t(ui.toast.keyAdded, { key: k }), 'info')
  }

  const resizeColumn = (col: keyof TranslationColumnWidths, deltaX: number) => {
    setColumnWidths(prev => {
      const next = { ...prev, [col]: clampWidth(col, prev[col] + deltaX) }
      saveColumnWidths(next)
      return next
    })
  }

  const resetColumn = (col: keyof TranslationColumnWidths) => {
    setColumnWidths(prev => {
      const next = { ...prev, [col]: DEFAULT_TRANSLATION_COLUMN_WIDTHS[col] }
      saveColumnWidths(next)
      return next
    })
  }

  const deleteKey = (key: string) => {
    if (workspace === 'configs') {
      const result = removeConfigKey(configSchema, configs, key)
      setConfigSchema(result.schema)
      setConfigs(result.configs)
      return
    }
    setTranslations(prev => removeKeyFromAll(prev, key))
    setKeyOwners(prev => {
      const next: KeyOwnerMap = {}
      for (const [lang, owners] of Object.entries(prev)) {
        const langOwners = { ...owners }
        delete langOwners[key]
        next[lang] = langOwners
      }
      return next
    })
  }

  const exportKey = (key: string, asKey?: string) => {
    const langs = config.files.map(f => f.lang)
    const target = asKey?.trim() || key
    downloadKeyCsv(translations, langs, key, target)
    showToast(
      target === key
        ? t(ui.toast.keyExported, { key })
        : t(ui.toast.keyExportedAs, { key, asKey: target }),
      'success',
    )
  }

  /** Copy all locale values from `sourceKey` to a new key. Returns false if invalid / duplicate. */
  const duplicateKey = (sourceKey: string, rawNewKey: string): boolean => {
    const newKey = rawNewKey.trim()
    if (!newKey || newKey === sourceKey) {
      showToast(ui.table.duplicateKeySame, 'error')
      return false
    }
    if (workspace === 'configs') {
      showToast(ui.table.duplicateKeyTranslationsOnly, 'error')
      return false
    }
    if (baseKeys.includes(newKey)) {
      showToast(ui.configs.errorDuplicate, 'error')
      return false
    }
    setTranslations(prev => duplicateKeyInAll(prev, sourceKey, newKey))
    setKeyOwners(prev => {
      const next: KeyOwnerMap = { ...prev }
      for (const f of config.files) {
        const sources = fileSources[f.lang] ?? []
        if (sources.length === 0) continue
        const langOwners = { ...(next[f.lang] ?? {}) }
        if (sourceKey in langOwners) langOwners[newKey] = langOwners[sourceKey]
        else langOwners[newKey] = resolveKeySourceIndex(sources, newKey, langOwners)
        next[f.lang] = langOwners
      }
      return next
    })
    showToast(t(ui.toast.keyDuplicated, { sourceKey, newKey }), 'success')
    return true
  }

  /** Rename a key across all locales. Returns false (and shows a toast) if the new name is invalid or already used. */
  const renameKey = (oldKey: string, rawNewKey: string): boolean => {
    const newKey = rawNewKey.trim()
    if (!newKey || newKey === oldKey) return false

    if (workspace === 'configs') {
      if (!isCamelCaseConfigKey(newKey)) {
        showToast(ui.configs.errorCamelCase, 'error')
        return false
      }
      if (configSchema[newKey]) {
        showToast(ui.configs.errorDuplicate, 'error')
        return false
      }
      const result = renameConfigKey(configSchema, configs, oldKey, newKey)
      setConfigSchema(result.schema)
      setConfigs(result.configs)
      showToast(t(ui.toast.keyRenamed, { oldKey, newKey }), 'info')
      return true
    }

    if (baseKeys.includes(newKey)) {
      showToast(ui.configs.errorDuplicate, 'error')
      return false
    }
    setTranslations(prev => renameKeyInAll(prev, oldKey, newKey))
    setKeyOwners(prev => {
      const next: KeyOwnerMap = {}
      for (const [lang, owners] of Object.entries(prev)) {
        const langOwners = { ...owners }
        if (oldKey in langOwners) {
          langOwners[newKey] = langOwners[oldKey]
          delete langOwners[oldKey]
        } else {
          const sources = fileSources[lang] ?? []
          if (sources.length > 0) {
            langOwners[newKey] = resolveKeySourceIndex(sources, newKey, langOwners)
          }
        }
        next[lang] = langOwners
      }
      return next
    })
    showToast(t(ui.toast.keyRenamed, { oldKey, newKey }), 'info')
    return true
  }

  /** Remove a config value from one locale only (schema kept). */
  const clearConfigOnLang = (lang: string, key: string) => {
    setConfigs(prev => clearConfigKeyOnLang(prev, lang, key))
  }

  const handleBulkApply = (assignments: Array<{ paragraphIndex: number; key: string }>, parsed: ParsedImport[]) => {
    let count = 0
    setTranslations(prev => {
      const result = applyBulkAssignments(prev, assignments, parsed)
      count = result.count
      return result.next
    })
    setShowBulkImport(false)
    showToast(t(ui.toast.valuesImported, { count }), 'success')
  }

  const handleJsonApply = (data: Record<string, Record<string, string>>) => {
    let count = 0
    setTranslations(prev => {
      const result = mergeTranslationMaps(prev, data)
      count = result.count
      return result.next
    })
    setShowBulkImport(false)
    showToast(t(ui.toast.valuesImportedJson, { count }), 'success')
  }

  const handleConfigImport = (next: {
    schema: ConfigSchema
    configs: Record<string, ConfigMap>
    valueCount: number
    keysAdded: number
    langsTouched: number
  }) => {
    setConfigSchema(next.schema)
    setConfigs(next.configs)
    setShowBulkImport(false)
    showToast(
      t(ui.toast.configsImported, {
        values: next.valueCount,
        langs: next.langsTouched,
      }),
      'success',
    )
  }

  const setWorkspaceMode = (_mode: WorkspaceMode) => {
    // Configs and Schema workspaces are temporarily disabled; workspace stays on 'translations'.
    setSearch('')
    setFilter('all')
    setActiveGroup(null)
    setAddingKey(false)
    setNewKey('')
    setShowBulkImport(false)
    setShowExport(false)
  }

  const w = useWidth()
  const isMobile = w < 640
  const isTablet = w >= 640 && w < 1024

  const allLangs = config.files.map(f => f.lang)
  const baseKeys = useMemo(
    () => collectTranslationKeys(translations, original, allLangs, config.baseLang),
    [translations, original, allLangs, config.baseLang],
  )

  const startAddKey = () => {
    if (workspace === 'translations') {
      setNewKey(groupKeyPrefix(activeGroup, baseKeys))
    } else {
      setNewKey('')
    }
    setAddingKey(true)
  }

  const configKeys = Object.keys(configSchema).sort()
  const activeLangFile = localizedConfig.files.find(f => f.lang === activeLang)

  const searchMatchMap = useMemo(
    () => buildSearchMatchMap(search, baseKeys, allLangs, translations),
    [search, baseKeys, translations, allLangs],
  )
  const varIssuesMap = useMemo(
    () => buildVarIssuesMap(varValidation, baseKeys, translations, config.baseLang, activeLang),
    [varValidation, baseKeys, translations, config.baseLang, activeLang],
  )
  const groups = useMemo(() => buildKeyGroups(baseKeys), [baseKeys])
  const filteredKeys = filterKeys({
    baseKeys, activeGroup, search, searchMode, searchMatchMap,
    filter, translations, original, activeLang, varIssuesMap,
  })
  const filteredConfigKeys = filterConfigKeys(configKeys, {
    search,
    searchMode,
    filter: filter === 'var-issues' ? 'all' : filter,
    schema: configSchema,
    configs,
    original: configsOriginal,
    activeLang,
  })

  const activeFilteredCount = workspace === 'configs' ? filteredConfigKeys.length : filteredKeys.length
  const pageCount = Math.max(1, Math.ceil(activeFilteredCount / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageStart = (currentPage - 1) * pageSize
  const pagedKeys = filteredKeys.slice(pageStart, pageStart + pageSize)
  const pagedConfigKeys = filteredConfigKeys.slice(pageStart, pageStart + pageSize)

  // Reset to page 1 whenever the filtered result set changes shape (new
  // search, filter, group, workspace…) so the user never lands on an
  // out-of-range empty page.
  useEffect(() => {
    setPage(1)
  }, [search, searchMode, filter, activeGroup, workspace, pageSize])

  const setPageSize = (size: number) => {
    setPageSizeState(size)
    try { localStorage.setItem(PAGE_SIZE_KEY, String(size)) } catch { /* ignore */ }
  }

  const translationLangStats = buildLangStats(localizedConfig.files, baseKeys, translations, original)
  const configLangStats = buildConfigLangStats(
    localizedConfig.files,
    configSchema,
    configs,
    configsOriginal,
    configPathForLang,
  )
  const langStatsRaw = workspace === 'configs' ? configLangStats : translationLangStats
  // Always surface the default (base) language first in the sidebar list.
  const langStats = [...langStatsRaw].sort((a, b) => {
    if (a.lang === config.baseLang) return -1
    if (b.lang === config.baseLang) return 1
    return 0
  })
  const { showBase, showLastMod, colTemplate, keyModeColTemplate } = columnLayout(isMobile, isTablet, columnWidths)

  const setSearchAndClearGroup = (value: string) => {
    setSearch(value)
    if (value) setActiveGroup(null)
  }

  const toggleVarValidation = () => {
    setVarValidation(v => !v)
    if (filter === 'var-issues') setFilter('all')
  }

  const modifiedCount = workspace === 'translations'
    ? modifiedKeys.length + langsNeedingFile.length
    : modifiedConfigKeys.length + configLangsNeedingFile.length + (schemaDirty || schemaNeedingFile ? 1 : 0)

  const handleSetupComplete = async (cfg: {
    token: string; owner: string; repo: string; branch: string
    langs: string[]; baseLang: string; translationsFolderName: string
    filePaths?: Record<string, string[]>
  }) => {
    const filePaths = cfg.filePaths ?? getTranslationFilePaths(
      await listTree(cfg.token, cfg.owner, cfg.repo, cfg.branch),
      cfg.translationsFolderName,
    )
    
    // Build LangFile array with all discovered files
    const files = cfg.langs.map(lang => ({
      lang,
      label: lang,
      flag: '🌐',
      path: filePaths[lang]?.[0] ?? `${cfg.translationsFolderName}/${lang}.json`,
    }))
    
    const configPathTemplate = cfg.translationsFolderName ? `${cfg.translationsFolderName}/configs/{lang}.json` : DEFAULT_CONFIG_PATH_TEMPLATE
    const configSchemaPath = cfg.translationsFolderName ? `${cfg.translationsFolderName}/configs/schema.json` : DEFAULT_CONFIG_SCHEMA_PATH
    
    // Save config with translationsFolderName
    const oauth = pendingOAuthRef.current
    saveUiConfig({
      token: cfg.token,
      refreshToken: oauth?.refreshToken,
      tokenExpiresAt: oauth?.expiresAt,
      owner: cfg.owner,
      repo: cfg.repo,
      branch: cfg.branch,
      sourceBranch: cfg.branch,
      baseLang: cfg.baseLang,
      langs: cfg.langs,
      translationsFolderName: cfg.translationsFolderName,
      configPathTemplate,
      configSchemaPath,
    })
    pendingOAuthRef.current = null
    
    const newConfig: typeof config = {
      token: cfg.token,
      owner: cfg.owner,
      repo: cfg.repo,
      branch: cfg.branch,
      sourceBranch: cfg.branch,
      baseLang: cfg.baseLang,
      files,
      configPathTemplate,
      configSchemaPath,
      translationsFolderName: cfg.translationsFolderName,
    }
    
    setConfig(newConfig)
    setShowSetup(false)
    setOauthToken(undefined)
    dismissWelcome()

    setLoading(true)
    try {
      const { translations: newTrans, shas: newShas, fileSources: newFileSources } =
        await loadTranslationBundle(newConfig, filePaths, cfg.langs)

      setFileSources(newFileSources)
      setKeyOwners(buildKeyOwnersFromSources(newFileSources))
      resetHistoryCache()

      const { schema, schemaSha, configs: newConfigs, configShas: newConfigShas } =
        await loadConfigBundle(newConfig, newConfig.files)

      setTranslations(newTrans)
      setOriginal(cloneTranslations(newTrans))
      setShas(newShas)
      setConfigSchema(schema)
      setConfigSchemaOriginal(cloneSchema(schema))
      setSchemaSha(schemaSha)
      setConfigs(newConfigs)
      setConfigsOriginal(cloneConfigs(newConfigs))
      setConfigShas(newConfigShas)
      setIsDemoMode(false)
      setStaleConflicts([])
      staleDismissedRef.current.clear()
      setSessionLostReason(null)
      showToast(ui.toast.loadedFromGithub, 'success')
    } catch (e) {
      if (isGitHubSessionError(e)) {
        promptSessionLost(e.message, true)
        return
      }
      showToast(t(ui.toast.error, { message: (e as Error).message }), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = () => {
    // Keep repo / branch / langs so SetupWizard can offer « Reprendre ».
    invalidateStoredToken()
    setConfig(loadConfigOrDefault())
    setIsDemoMode(true)
    setShowSetup(true)
    setSessionLostReason(null)
  }

  const handleReconnect = () => {
    setShowSetup(true)
  }

  const handleResolveStaleConflict = (lang: string, resolutions: Record<string, 'local' | 'remote'>) => {
    const conflict = staleConflicts.find(c => c.lang === lang)
    if (!conflict) return

    const sources = fileSources[lang] ?? []
    const { translations: nextFlat, sources: nextSources } = applyStaleResolutions(
      conflict,
      sources,
      translations[lang] ?? {},
      keyOwners[lang],
      resolutions,
    )

    setTranslations(prev => ({ ...prev, [lang]: nextFlat }))
    setOriginal(prev => ({ ...prev, [lang]: { ...nextFlat } }))
    setFileSources(prev => ({ ...prev, [lang]: nextSources }))
    setStaleConflicts(prev => prev.filter(c => c.lang !== lang))
    if (staleConflicts.length <= 1) setShowStaleConflict(false)
    showToast(ui.toast.staleResolved, 'success')
  }

  const handleKeepAllStaleLocal = () => {
    for (const c of staleConflicts) staleDismissedRef.current.add(c.lang)
    setStaleConflicts([])
    setShowStaleConflict(false)
    showToast(ui.toast.staleKeptLocal, 'info')
  }

  const handleReloadStale = () => {
    setShowStaleConflict(false)
    void handleLoad()
  }

  return {
    isDark, setIsDark,
    uiLocale, setUiLocale: handleUiLocaleChange,
    workspace, setWorkspace: setWorkspaceMode,
    config: localizedConfig, translations, original, activeLang, activeLangFile,
    configSchema, configs, configsOriginal,
    search, setSearch: setSearchAndClearGroup, filter, setFilter,
    searchMode, setSearchMode, varValidation, toggleVarValidation,
    activeGroup, setActiveGroup, groups,
    showSettings, setShowSettings, showLoad, setShowLoad, showCommit, setShowCommit,
    showSetup, setShowSetup, oauthToken,
    commitMsg, setCommitMsg, loading, oauthConnecting, isDemoMode, isConnected,
    addingKey, setAddingKey, newKey, setNewKey, newConfigType, setNewConfigType, addKey, startAddKey,
    showHistory, setShowHistory, fileHistory,
    historyLoading: historyStatus[activeLang] === 'loading',
    historyError: historyStatus[activeLang] === 'error',
    keyHistoryFilter, setKeyHistoryFilter, filteredHistoryByKey,
    showBulkImport, setShowBulkImport, showExport, setShowExport,
    staleLangs,
    staleConflicts,
    showStaleConflict,
    setShowStaleConflict,
    duplicateKeyWarnings,
    duplicateKeysDismissed,
    setDuplicateKeysDismissed,
    handleResolveStaleConflict,
    handleKeepAllStaleLocal,
    handleReloadStale,
    sessionLostReason,
    handleReconnect,
    toasts, showToast,
    isMobile, isTablet,
    baseKeys, filteredKeys, configKeys, filteredConfigKeys, langStats,
    pagedKeys, pagedConfigKeys, page: currentPage, setPage, pageSize, setPageSize, pageCount, pageSizeOptions: PAGE_SIZE_OPTIONS,
    modifiedKeys, modifiedConfigKeys, modifiedCount,
    varIssuesCount: Object.keys(varIssuesMap).length,
    varIssuesMap, searchMatchMap,
    langsNeedingFile: workspace === 'configs' ? configLangsNeedingFile : langsNeedingFile,
    schemaDirty: schemaDirty || schemaNeedingFile,
    activeLangKeyMap: keyLastModified[activeLang] ?? {},
    showBase, showLastMod, colTemplate, keyModeColTemplate, resizeColumn, resetColumn,
    handleLoad, openLoadDialog, handleLoadConfirm, hasUnsavedChanges,
    fileSources,
    keyOwners,
    handleCommit, doCommit, handleLoadHistory,
    handleSetupComplete, handleDisconnect,
    handleSelectLang: (l: string) => {
      setActiveLang(l)
      if (showHistory && !isDemoMode) void handleLoadHistory(l, { force: true })
    },
    handleToggleHistory: () => {
      setShowHistory(v => {
        const next = !v
        if (next && !isDemoMode) void handleLoadHistory(activeLang, { force: true })
        return next
      })
    },
    reloadHistory: () => { void handleLoadHistory(activeLang, { force: true }) },
    updateValue, updateConfigValue, restoreKey, deleteKey, renameKey, duplicateKey, exportKey, clearConfigOnLang,
    handleBulkApply, handleJsonApply, handleConfigImport,
  }
}

export type TranslationAppState = ReturnType<typeof useTranslationApp>
