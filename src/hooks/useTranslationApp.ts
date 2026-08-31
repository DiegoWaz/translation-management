import { useState, useCallback, useEffect, useMemo } from 'react'
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
import { isGithubConfigured, loadConfig, saveUiConfig, clearUiConfig, loadUiConfig } from '../helpers/config'
import { buildKeyLastModified } from '../helpers/history'
import { commitJsonFiles, commitJsonFilesAsPR, fetchFileCommits, loadFile, loadJsonFile, prepareCommitContent } from '../helpers/github'
import { listTree, getTranslationFilePaths } from '../helpers/githubBrowser'
import {
  buildKeyGroups,
  buildLangStats,
  buildSearchMatchMap,
  buildVarIssuesMap,
  columnLayout,
  filterKeys,
  getModifiedKeys,
} from '../helpers/filtering'
import {
  addKeyToAll,
  applyBulkAssignments,
  cloneTranslations,
  mergeTranslationMaps,
  removeKeyFromAll,
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
  schemasEqual,
} from '../helpers/configValues'
import { defaultPath, deriveLangMeta } from '../helpers/lang'
import { loadDraft, saveDraft } from '../helpers/draftStorage'
import { detectUiLocale, setUiLocale, t, ui, type UiLocale } from '../i18n/ui'
import {
  cleanOAuthParams,
  exchangeCodeForToken,
  extractOAuthCode,
  verifyState,
} from '../helpers/githubOAuth'

// Load config with fallback to demo config if empty
const loadConfigOrDefault = () => {
  const c = loadConfig()
  return c.files.length > 0 ? c : DEFAULT_DEMO_CONFIG
}

export const useTranslationApp = () => {
  const [config, setConfig] = useState(loadConfigOrDefault)
  const [initialDraft] = useState(() => loadDraft(loadConfigOrDefault()))
  const [showSetup, setShowSetup] = useState(() => {
    const cfg = loadConfigOrDefault()
    return !isGithubConfigured(cfg) && !loadUiConfig()
  })
  const [oauthToken, setOauthToken] = useState<string | undefined>(undefined)
  const [fileSources, setFileSources] = useState<Record<string, FileSource[]>>({})
  const [workspace, setWorkspace] = useState<WorkspaceMode>(
    () => {
      const w = initialDraft?.workspace
      if (w === 'configs' || w === 'schema' || w === 'translations') return w
      return 'translations'
    },
  )
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
  const [showSettings, setShowSettings] = useState(false)
  const [showCommit, setShowCommit] = useState(false)
  const [commitMsg, setCommitMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(() => initialDraft?.isDemoMode ?? true)
  const [addingKey, setAddingKey] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newConfigType, setNewConfigType] = useState<ConfigValueType>('text')
  const [showHistory, setShowHistory] = useState(false)
  const [fileHistory, setFileHistory] = useState<Record<string, CommitRecord[]>>({})
  const [historyLoading, setHistoryLoading] = useState(false)
  const [keyHistoryFilter, setKeyHistoryFilter] = useState<string | null>(null)
  const [keyLastModified, setKeyLastModified] = useState<Record<string, KeyLastModifiedMap>>({})
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [staleLangs, setStaleLangs] = useState<string[]>([])
  const [varValidation, setVarValidation] = useState(true)
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [searchMode, setSearchMode] = useState<SearchMode>('locale')
  const [isDark, setIsDark] = useState(true)
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

  // Handle OAuth redirect callback
  useEffect(() => {
    const oauthResult = extractOAuthCode()
    if (!oauthResult) return
    if (!verifyState(oauthResult.state)) {
      cleanOAuthParams()
      return
    }
    cleanOAuthParams()
    exchangeCodeForToken(oauthResult.code)
      .then(accessToken => {
        setOauthToken(accessToken)
        setShowSetup(true)
      })
      .catch(() => { setShowSetup(true) })
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
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

  useEffect(() => {
    if (!draftRestored) return
    showToast(ui.toast.draftRestored, 'info')
    // once on mount when an uncommitted draft was restored
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist working copy so reload keeps uncommitted edits
  useEffect(() => {
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
  ])

  useEffect(() => {
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
  }, [])

  const onStale = useCallback((langs: string[]) => {
    setStaleLangs(prev => [...new Set([...prev, ...langs])])
  }, [])

  useStalePoll({ config, shas, isConnected, isDemoMode, fileSources, onStale })

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

  const handleLoad = async () => {
    if (!isConnected) { setShowSettings(true); return }
    setLoading(true)
    try {
      const newTrans: Record<string, Record<string, string>> = {}
      const newShas: Record<string, string> = {}
      const newFileSources: Record<string, FileSource[]> = {}

      // Discover all translation files in the repo
      const tree = await listTree(config.token, config.owner, config.repo, config.branch)
      const folderName = config.translationsFolderName || 'translations'
      const filePaths = getTranslationFilePaths(tree, folderName)
       
      console.log('[handleLoad] Folder name:', folderName)
      console.log('[handleLoad] Discovered translation files:', filePaths)

      // Load all discovered files (not just those in config.files)
      for (const [lang, paths] of Object.entries(filePaths)) {
       if (paths.length === 0) continue
        
       console.log(`[handleLoad] Loading ${lang}:`, paths)
        
       // Load ALL files for this language (don't filter, merge all)
       const sources: FileSource[] = []
       const merged: Record<string, string> = {}
         
       for (const path of paths) {
         const { content, sha, nested, rawContent } = await loadFile(config, path)
         console.log(`[handleLoad] Loaded ${path}: ${Object.keys(content).length} keys`)
         sources.push({ path, rawContent, originalFlat: { ...content }, sha, nested })
         Object.assign(merged, content)
       }
        
       console.log(`[handleLoad] Merged ${lang}: ${Object.keys(merged).length} total keys`)
       const namespaces = new Set(Object.keys(merged).map(k => k.split('.')[0]))
       console.log(`[handleLoad] Namespaces in ${lang}:`, Array.from(namespaces))
         
       newFileSources[lang] = sources
       newTrans[lang] = merged
       newShas[lang] = sources[0]?.sha ?? ''
      }
      setFileSources(newFileSources)

      // Update config.files to match discovered languages & paths
      const discoveredFiles = Object.entries(newFileSources).map(([lang, sources]) => ({
        lang,
        label: lang,
        flag: '🌐',
        path: sources[0]?.path ?? `translations/${lang}.json`,
      }))
      const updatedConfig = { ...config, files: discoveredFiles }
      setConfig(updatedConfig)

      const schemaResult = await loadJsonFile<unknown>(config, config.configSchemaPath, {})
      const schema = normalizeSchema(schemaResult.content)
      const newConfigs: Record<string, ConfigMap> = {}
      const newConfigShas: Record<string, string> = {}
      for (const f of updatedConfig.files) {
        const cfgPath = defaultPath(f.lang, config.configPathTemplate)
        const { content, sha } = await loadJsonFile<unknown>(config, cfgPath, {})
        newConfigs[f.lang] = normalizeConfigMap(content, schema)
        newConfigShas[f.lang] = sha
      }

      setTranslations(newTrans)
      setOriginal(cloneTranslations(newTrans))
      setShas(newShas)
      setConfigSchema(schema)
      setConfigSchemaOriginal(cloneSchema(schema))
      setSchemaSha(schemaResult.sha)
      setConfigs(newConfigs)
      setConfigsOriginal(cloneConfigs(newConfigs))
      setConfigShas(newConfigShas)
      setIsDemoMode(false)
      setStaleLangs([])
      showToast(ui.toast.loadedFromGithub, 'success')
    } catch (e) {
      showToast(t(ui.toast.error, { message: (e as Error).message }), 'error')
    } finally {
      setLoading(false)
    }
  }

  // Load history for a specific language from all its translation files
  const handleLoadHistory = async (lang: string) => {
    if (isDemoMode) return
    
    // Get ALL discovered file sources for this language
    const sources = fileSources[lang]
    if (!sources || sources.length === 0) {
      console.warn(`[handleLoadHistory] No file sources found for language ${lang}`)
      return
    }
    
    setHistoryLoading(true)
    try {
      // Fetch commits for ALL files in this language
      const allCommits: CommitRecord[] = []
      
      for (const source of sources) {
        const commits = await fetchFileCommits(config, source.path)
        allCommits.push(...commits)
      }
      
      // Sort by date (most recent first)
      allCommits.sort((a, b) => b.date.getTime() - a.date.getTime())
      
      setFileHistory(prev => ({ ...prev, [lang]: allCommits }))
      setKeyLastModified(prev => ({ ...prev, [lang]: buildKeyLastModified(allCommits) }))
    } catch (e) {
      showToast(t(ui.toast.historyError, { message: (e as Error).message }), 'error')
    } finally {
      setHistoryLoading(false)
    }
  }

  // Auto-load history for all languages once we exit demo mode
  useEffect(() => {
    if (isDemoMode || loading) return
    
    // Load history for all discovered languages
    const langsToLoad = Object.keys(fileSources)
    console.log('[useEffect] Demo mode off, loading history for:', langsToLoad)
    
    langsToLoad.forEach(lang => {
      handleLoadHistory(lang)
    })
  }, [isDemoMode, loading])

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
    if (!isConnected) { setShowSettings(true); return }
    if (translationCommitLangs.length === 0) {
      showToast(ui.toast.nothingToCommit, 'info')
      return
    }
    setCommitMsg(t(ui.commit.defaultMessage, { langs: translationCommitLangs.join(', ') }))
    setShowCommit(true)
  }

  const doCommit = async (mode: 'pr' | 'direct' = 'direct', prTitle?: string, branchName?: string) => {
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
          
          // Build a map of namespace → source index for all known namespaces
          const nsToSource = new Map<string, number>()
          let commonSourceIdx = 0
          sources.forEach((source, idx) => {
            for (const key of Object.keys(source.originalFlat)) {
              const ns = key.split('.')[0]
              nsToSource.set(ns, idx)
              if (ns.toLowerCase() === 'common') commonSourceIdx = idx
            }
          })
          
          // Assign each current key to its source file
          const perSource: Record<string, string>[] = sources.map(() => ({}))
          for (const [key, value] of Object.entries(current)) {
            const ns = key.split('.')[0]
            const idx = nsToSource.get(ns) ?? commonSourceIdx
            perSource[idx][key] = value
          }
          
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
              config.alwaysNestJson ?? false,
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

        if (mode === 'pr') {
          const { prNumber, prUrl } = await commitJsonFilesAsPR(config, files, message, prTitle || message, branchName)
          setOriginal(cloneTranslations(translations))
          showToast(t(ui.toast.prCreated, { number: prNumber }), 'success')
          window.open(prUrl, '_blank')
          showToast('PR #' + prNumber + ' ouverte dans un nouvel onglet', 'success')
        } else {
          const pathShas = await commitJsonFiles(config, files, message)
          const newShas = { ...shas }
          for (const lang of langs) {
            const sources = fileSources[lang] || []
            for (const source of sources) {
              if (pathShas[source.path]) newShas[lang] = pathShas[source.path]
            }
          }
          setShas(newShas)
          setOriginal(cloneTranslations(translations))
          setStaleLangs([])
          showToast(
            t(ui.toast.commitPushed, {
              branch: config.branch,
              count: Math.max(modifiedKeys.length, files.length),
            }),
            'success',
          )
          for (const lang of langs) handleLoadHistory(lang)
        }
      }
    } catch (e) {
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
    setOriginal(prev => addKeyToAll(prev, k))
    setNewKey('')
    setAddingKey(false)
    showToast(t(ui.toast.keyAdded, { key: k }), 'info')
  }

  const deleteKey = (key: string) => {
    if (workspace === 'configs') {
      const result = removeConfigKey(configSchema, configs, key)
      setConfigSchema(result.schema)
      setConfigs(result.configs)
      return
    }
    setTranslations(prev => removeKeyFromAll(prev, key))
    setOriginal(prev => removeKeyFromAll(prev, key))
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

  const setWorkspaceMode = (mode: WorkspaceMode) => {
    setWorkspace(mode)
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

  const baseKeys = Object.keys(translations[config.baseLang] ?? {})
  const configKeys = Object.keys(configSchema).sort()
  const activeLangFile = localizedConfig.files.find(f => f.lang === activeLang)
  const allLangs = config.files.map(f => f.lang)

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

  const translationLangStats = buildLangStats(localizedConfig.files, baseKeys, translations, original)
  const configLangStats = buildConfigLangStats(
    localizedConfig.files,
    configSchema,
    configs,
    configsOriginal,
    configPathForLang,
  )
  const langStats = workspace === 'configs' ? configLangStats : translationLangStats
  const { showBase, showLastMod, colTemplate } = columnLayout(isMobile, isTablet)

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
  }) => {
    // Load repo tree to discover all translation files
    const tree = await listTree(cfg.token, cfg.owner, cfg.repo, cfg.branch)
    const filePaths = getTranslationFilePaths(tree, cfg.translationsFolderName)
    
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
    saveUiConfig({
      token: cfg.token,
      owner: cfg.owner,
      repo: cfg.repo,
      branch: cfg.branch,
      baseLang: cfg.baseLang,
      langs: cfg.langs,
      translationsFolderName: cfg.translationsFolderName,
      configPathTemplate,
      configSchemaPath,
    })
    
    const newConfig: typeof config = {
      token: cfg.token,
      owner: cfg.owner,
      repo: cfg.repo,
      branch: cfg.branch,
      baseLang: cfg.baseLang,
      files,
      configPathTemplate,
      configSchemaPath,
      translationsFolderName: cfg.translationsFolderName,
    }
    
    setConfig(newConfig)
    setShowSetup(false)
    setOauthToken(undefined)

    setLoading(true)
    try {
      const newTrans: Record<string, Record<string, string>> = {}
      const newShas: Record<string, string> = {}
      const newFileSources: Record<string, FileSource[]> = {}
      
      // Load ALL discovered files (not just cfg.langs)
      for (const [lang, paths] of Object.entries(filePaths)) {
        if (paths.length === 0) continue
        
        // Prefer the deepest (most specific) path when multiple exist
        let selectedPaths = paths
        if (paths.length > 1) {
          const sorted = [...paths].sort((a: string, b: string) => b.split('/').length - a.split('/').length)
          selectedPaths = [sorted[0]]
        }
        
        const sources: FileSource[] = []
        const merged: Record<string, string> = {}
        
        for (const path of selectedPaths) {
          const { content, sha, nested, rawContent } = await loadFile(newConfig, path)
          sources.push({ path, rawContent, originalFlat: { ...content }, sha, nested })
          Object.assign(merged, content)
        }
        
        newFileSources[lang] = sources
        newTrans[lang] = merged
        newShas[lang] = sources[0]?.sha ?? ''
      }
      setFileSources(newFileSources)

      // Configs are optional — don't fail if they don't exist
      const schemaPath = newConfig.configSchemaPath
      const schemaResult = await loadJsonFile<unknown>(newConfig, schemaPath, {})
      const schema = normalizeSchema(schemaResult.content)
      const newConfigs: Record<string, ConfigMap> = {}
      const newConfigShas: Record<string, string> = {}
      
      for (const f of newConfig.files) {
        const configPath = defaultPath(f.lang, newConfig.configPathTemplate)
        const { content, sha } = await loadJsonFile<unknown>(newConfig, configPath, {})
        newConfigs[f.lang] = normalizeConfigMap(content, schema)
        newConfigShas[f.lang] = sha
      }

      setTranslations(newTrans)
      setOriginal(cloneTranslations(newTrans))
      setShas(newShas)
      setConfigSchema(schema)
      setConfigSchemaOriginal(cloneSchema(schema))
      setSchemaSha(schemaResult.sha)
      setConfigs(newConfigs)
      setConfigsOriginal(cloneConfigs(newConfigs))
      setConfigShas(newConfigShas)
      setIsDemoMode(false)
      setStaleLangs([])
      showToast(ui.toast.loadedFromGithub, 'success')
    } catch (e) {
      showToast(t(ui.toast.error, { message: (e as Error).message }), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = () => {
    clearUiConfig()
    setConfig(loadConfigOrDefault())
    setIsDemoMode(true)
    setShowSetup(true)
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
    showSettings, setShowSettings, showCommit, setShowCommit,
    showSetup, setShowSetup, oauthToken,
    commitMsg, setCommitMsg, loading, isDemoMode,
    addingKey, setAddingKey, newKey, setNewKey, newConfigType, setNewConfigType, addKey,
    showHistory, setShowHistory, fileHistory, historyLoading, keyHistoryFilter, setKeyHistoryFilter, filteredHistoryByKey,
    showBulkImport, setShowBulkImport, showExport, setShowExport,
    staleLangs, setStaleLangs,
    toasts, showToast,
    isMobile, isTablet,
    baseKeys, filteredKeys, configKeys, filteredConfigKeys, langStats,
    modifiedKeys, modifiedConfigKeys, modifiedCount,
    varIssuesCount: Object.keys(varIssuesMap).length,
    varIssuesMap, searchMatchMap,
    langsNeedingFile: workspace === 'configs' ? configLangsNeedingFile : langsNeedingFile,
    schemaDirty: schemaDirty || schemaNeedingFile,
    activeLangKeyMap: keyLastModified[activeLang] ?? {},
    showBase, showLastMod, colTemplate,
    handleLoad, handleCommit, doCommit, handleLoadHistory,
    handleSetupComplete, handleDisconnect,
    handleSelectLang: (l: string) => {
      setActiveLang(l)
      if (showHistory && !isDemoMode) handleLoadHistory(l)
    },
    handleToggleHistory: () => {
      setShowHistory(v => !v)
      if (!isDemoMode && !fileHistory[activeLang]?.length) handleLoadHistory(activeLang)
    },
    updateValue, updateConfigValue, restoreKey, deleteKey, clearConfigOnLang,
    handleBulkApply, handleJsonApply, handleConfigImport,
  }
}

export type TranslationAppState = ReturnType<typeof useTranslationApp>
