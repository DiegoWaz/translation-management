import { useState, useCallback, useEffect, useMemo } from 'react'
import type {
  CommitRecord,
  FilterMode,
  KeyLastModifiedMap,
  ParsedImport,
  SearchMode,
} from '../types'
import { useWidth } from './useWidth'
import { useToast } from './useToast'
import { useStalePoll } from './useStalePoll'
import { buildDemoTranslations, makeDemoHistory } from '../helpers/defaults'
import { isGithubConfigured, loadConfig } from '../helpers/config'
import { buildKeyLastModified } from '../helpers/history'
import { fetchFileCommits, loadFile, pushFile } from '../helpers/github'
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
import { detectUiLocale, setUiLocale, t, ui, type UiLocale } from '../i18n/ui'
import { deriveLangMeta } from '../helpers/lang'

export const useTranslationApp = () => {
  const [config] = useState(loadConfig)
  const [translations, setTranslations] = useState(() => {
    const c = loadConfig()
    return buildDemoTranslations(c.files.map(f => f.lang), c.baseLang)
  })
  const [original, setOriginal] = useState(() => {
    const c = loadConfig()
    return buildDemoTranslations(c.files.map(f => f.lang), c.baseLang)
  })
  const [shas, setShas] = useState<Record<string, string>>({})
  const [activeLang, setActiveLang] = useState(() => {
    const c = loadConfig()
    return c.files.find(f => f.lang !== c.baseLang)?.lang ?? c.baseLang
  })
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [showSettings, setShowSettings] = useState(false)
  const [showCommit, setShowCommit] = useState(false)
  const [commitMsg, setCommitMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(true)
  const [addingKey, setAddingKey] = useState(false)
  const [newKey, setNewKey] = useState('')
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
      setTranslations(newTrans)
      setOriginal(cloneTranslations(newTrans))
      setShas(newShas)
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
    const file = config.files.find(f => f.lang === lang)
    if (!file) return
    setHistoryLoading(true)
    try {
      const commits = await fetchFileCommits(config, file.path)
      setFileHistory(prev => ({ ...prev, [lang]: commits }))
      setKeyLastModified(prev => ({ ...prev, [lang]: buildKeyLastModified(commits) }))
    } catch (e) {
      showToast(t(ui.toast.historyError, { message: (e as Error).message }), 'error')
    } finally {
      setHistoryLoading(false)
    }
  }

  const langsNeedingFile = useMemo(() => {
    if (isDemoMode) return []
    return config.files.map(f => f.lang).filter(lang => !shas[lang])
  }, [isDemoMode, config.files, shas])

  const handleCommit = async () => {
    if (!isConnected) { setShowSettings(true); return }
    if (modifiedKeys.length === 0 && langsNeedingFile.length === 0) {
      showToast(ui.toast.nothingToCommit, 'info')
      return
    }
    const langs = [...new Set([...modifiedKeys.map(m => m.lang), ...langsNeedingFile])]
    setCommitMsg(t(ui.commit.defaultMessage, { langs: langs.join(', ') }))
    setShowCommit(true)
  }

  const doCommit = async () => {
    setLoading(true)
    setShowCommit(false)
    try {
      const langs = [...new Set([...modifiedKeys.map(m => m.lang), ...langsNeedingFile])]
      const newShas = { ...shas }
      const customMsg = commitMsg.trim()
      for (const lang of langs) {
        const file = config.files.find(f => f.lang === lang)
        if (!file) continue
        // Contents API = one GitHub commit per file → message must name that locale only
        const message =
          langs.length === 1 && customMsg
            ? customMsg
            : t(ui.commit.defaultMessage, { langs: lang })
        newShas[lang] = await pushFile(config, file.path, translations[lang] ?? {}, shas[lang] ?? '', message)
      }
      setShas(newShas)
      setOriginal(cloneTranslations(translations))
      setStaleLangs([])
      showToast(t(ui.toast.commitPushed, { branch: config.branch, count: modifiedKeys.length }), 'success')
      for (const lang of langs) handleLoadHistory(lang)
    } catch (e) {
      showToast(t(ui.toast.error, { message: (e as Error).message }), 'error')
    } finally {
      setLoading(false)
    }
  }

  const updateValue = (lang: string, key: string, value: string) =>
    setTranslations(prev => ({ ...prev, [lang]: { ...prev[lang], [key]: value } }))

  const restoreKey = (lang: string, key: string, value: string) => {
    updateValue(lang, key, value)
    showToast(t(ui.toast.keyRestored, { key }), 'info')
  }

  const addKey = () => {
    const k = newKey.trim()
    if (!k) return
    setTranslations(prev => addKeyToAll(prev, k))
    setOriginal(prev => addKeyToAll(prev, k))
    setNewKey('')
    setAddingKey(false)
    showToast(t(ui.toast.keyAdded, { key: k }), 'info')
  }

  const deleteKey = (key: string) => {
    setTranslations(prev => removeKeyFromAll(prev, key))
    setOriginal(prev => removeKeyFromAll(prev, key))
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

  const w = useWidth()
  const isMobile = w < 640
  const isTablet = w >= 640 && w < 1024

  const baseKeys = Object.keys(translations[config.baseLang] ?? {})
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
  const langStats = buildLangStats(localizedConfig.files, baseKeys, translations, original)
  const { showBase, showLastMod, colTemplate } = columnLayout(isMobile, isTablet)

  const setSearchAndClearGroup = (value: string) => {
    setSearch(value)
    if (value) setActiveGroup(null)
  }

  const toggleVarValidation = () => {
    setVarValidation(v => !v)
    if (filter === 'var-issues') setFilter('all')
  }

  return {
    isDark, setIsDark,
    uiLocale, setUiLocale: handleUiLocaleChange,
    config: localizedConfig, translations, original, activeLang, activeLangFile,
    search, setSearch: setSearchAndClearGroup, filter, setFilter,
    searchMode, setSearchMode, varValidation, toggleVarValidation,
    activeGroup, setActiveGroup, groups,
    showSettings, setShowSettings, showCommit, setShowCommit,
    commitMsg, setCommitMsg, loading, isDemoMode,
    addingKey, setAddingKey, newKey, setNewKey, addKey,
    showHistory, setShowHistory, fileHistory, historyLoading,
    showBulkImport, setShowBulkImport, showExport, setShowExport,
    staleLangs, setStaleLangs,
    toasts, showToast,
    isMobile, isTablet,
    baseKeys, filteredKeys, langStats,
    modifiedKeys, modifiedCount: modifiedKeys.length,
    varIssuesCount: Object.keys(varIssuesMap).length,
    varIssuesMap, searchMatchMap,
    langsNeedingFile,
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
    updateValue, restoreKey, deleteKey,
    handleBulkApply, handleJsonApply,
  }
}

export type TranslationAppState = ReturnType<typeof useTranslationApp>
