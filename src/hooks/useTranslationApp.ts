import { useState, useCallback, useEffect, useMemo } from 'react'
import type {
  CommitRecord,
  ConfigMap,
  ConfigSchema,
  ConfigValue,
  ConfigValueType,
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
  DEMO_CONFIG_SCHEMA,
  makeDemoHistory,
} from '../helpers/defaults'
import { isGithubConfigured, loadConfig } from '../helpers/config'
import { buildKeyLastModified } from '../helpers/history'
import { commitJsonFiles, fetchFileCommits, loadFile, loadJsonFile } from '../helpers/github'
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

export const useTranslationApp = () => {
  const [config] = useState(loadConfig)
  const [initialDraft] = useState(() => loadDraft(loadConfig()))

  const [workspace, setWorkspace] = useState<WorkspaceMode>(
    () => {
      const w = initialDraft?.workspace
      if (w === 'configs' || w === 'schema' || w === 'translations') return w
      return 'translations'
    },
  )
  const [translations, setTranslations] = useState(() => {
    if (initialDraft) return initialDraft.translations
    const c = loadConfig()
    return buildDemoTranslations(c.files.map(f => f.lang), c.baseLang)
  })
  const [original, setOriginal] = useState(() => {
    if (initialDraft) return initialDraft.original
    const c = loadConfig()
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
    const c = loadConfig()
    return buildDemoConfigs(c.files.map(f => f.lang), c.baseLang)
  })
  const [configsOriginal, setConfigsOriginal] = useState<Record<string, ConfigMap>>(() => {
    if (initialDraft) return initialDraft.configsOriginal
    const c = loadConfig()
    return buildDemoConfigs(c.files.map(f => f.lang), c.baseLang)
  })
  const [configShas, setConfigShas] = useState<Record<string, string>>(
    () => initialDraft?.configShas ?? {},
  )
  const [schemaSha, setSchemaSha] = useState(() => initialDraft?.schemaSha ?? '')
  const [activeLang, setActiveLang] = useState(() => {
    if (initialDraft?.activeLang) return initialDraft.activeLang
    const c = loadConfig()
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

  useStalePoll({ config, shas, isConnected, isDemoMode, onStale })

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
      for (const f of config.files) {
        const { content, sha } = await loadFile(config, f.path)
        newTrans[f.lang] = content
        newShas[f.lang] = sha
      }

      const schemaResult = await loadJsonFile<unknown>(config, config.configSchemaPath, {})
      const schema = normalizeSchema(schemaResult.content)
      const newConfigs: Record<string, ConfigMap> = {}
      const newConfigShas: Record<string, string> = {}
      for (const f of config.files) {
        const { content, sha } = await loadJsonFile<unknown>(config, configPathForLang(f.lang), {})
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

  const handleLoadHistory = async (lang: string) => {
    if (isDemoMode) return
    const path = workspace === 'configs'
      ? configPathForLang(lang)
      : config.files.find(f => f.lang === lang)?.path
    if (!path) return
    setHistoryLoading(true)
    try {
      const commits = await fetchFileCommits(config, path)
      setFileHistory(prev => ({ ...prev, [lang]: commits }))
      setKeyLastModified(prev => ({ ...prev, [lang]: buildKeyLastModified(commits) }))
    } catch (e) {
      showToast(t(ui.toast.historyError, { message: (e as Error).message }), 'error')
    } finally {
      setHistoryLoading(false)
    }
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
    if (workspace === 'translations') {
      if (translationCommitLangs.length === 0) {
        showToast(ui.toast.nothingToCommit, 'info')
        return
      }
      setCommitMsg(t(ui.commit.defaultMessage, { langs: translationCommitLangs.join(', ') }))
      setShowCommit(true)
      return
    }
    if (configCommitLangs.length === 0 && !schemaDirty && !schemaNeedingFile) {
      showToast(ui.toast.nothingToCommit, 'info')
      return
    }
    if (configCommitLangs.length === 0) {
      setCommitMsg(ui.commit.configSchemaMessage)
    } else {
      setCommitMsg(t(ui.commit.configDefaultMessage, { langs: configCommitLangs.join(', ') }))
    }
    setShowCommit(true)
  }

  const doCommit = async () => {
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
        const files = langs.flatMap(lang => {
          const file = config.files.find(f => f.lang === lang)
          if (!file) return []
          // Missing remote file (empty sha) → create `{}` (or current edits) at file.path
          return [{ path: file.path, content: translations[lang] ?? {} }]
        })
        if (files.length === 0) {
          showToast(ui.toast.nothingToCommit, 'info')
          return
        }
        const pathShas = await commitJsonFiles(config, files, message)
        const newShas = { ...shas }
        for (const lang of langs) {
          const file = config.files.find(f => f.lang === lang)
          if (file && pathShas[file.path]) newShas[lang] = pathShas[file.path]
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
      } else {
        const langs = configCommitLangs
        const files = [
          ...(schemaDirty || schemaNeedingFile
            ? [{ path: config.configSchemaPath, content: configSchema }]
            : []),
          ...langs.map(lang => ({
            path: configPathForLang(lang),
            // Missing remote config file → create at template path
            content: configs[lang] ?? {},
          })),
        ]
        if (files.length === 0) {
          showToast(ui.toast.nothingToCommit, 'info')
          return
        }
        const pathShas = await commitJsonFiles(config, files, message)
        if (schemaDirty || schemaNeedingFile) {
          const nextSha = pathShas[config.configSchemaPath]
          if (nextSha) setSchemaSha(nextSha)
          setConfigSchemaOriginal(cloneSchema(configSchema))
        }
        const newConfigShas = { ...configShas }
        for (const lang of langs) {
          const path = configPathForLang(lang)
          if (pathShas[path]) newConfigShas[lang] = pathShas[path]
        }
        setConfigShas(newConfigShas)
        setConfigsOriginal(cloneConfigs(configs))
        showToast(t(ui.toast.commitPushed, { branch: config.branch, count: files.length }), 'success')
        for (const lang of langs) handleLoadHistory(lang)
      }
    } catch (e) {
      showToast(t(ui.toast.error, { message: (e as Error).message }), 'error')
    } finally {
      setLoading(false)
    }
  }

  const updateValue = (lang: string, key: string, value: string) =>
    setTranslations(prev => ({ ...prev, [lang]: { ...prev[lang], [key]: value } }))

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
    commitMsg, setCommitMsg, loading, isDemoMode,
    addingKey, setAddingKey, newKey, setNewKey, newConfigType, setNewConfigType, addKey,
    showHistory, setShowHistory, fileHistory, historyLoading,
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
