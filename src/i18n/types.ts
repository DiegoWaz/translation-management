export type UiMessages = {
  app: { name: string; logo: string }
  common: {
    close: string; cancel: string; save: string; add: string; all: string
    base: string; baseBadge: string; emptyDash: string; check: string
    moreCount: string; moreOthers: string; characters: string
  }
  theme: { toLight: string; toDark: string; lightIcon: string; darkIcon: string }
  topBar: {
    disconnected: string; demo: string; loadGithub: string; loadGithubTitle: string
    history: string; historyTitle: string; commit: string; commitTitle: string; settings: string
    uiLang: string
  }
  filters: {
    all: string; allKeys: string; missing: string; missingShort: string
    modified: string; modifiedShort: string
    varIssues: string; varIssuesLong: string; varIssuesShort: string
  }
  sidebar: {
    languages: string; filter: string; keysCount: string
    missingCount: string; missingCountPlural: string
    modifiedCount: string; modifiedCountPlural: string
  }
  toolbar: {
    searchByKey: string; searchAllLocales: string
    modeLocale: string; modeKey: string
    varsOk: string; varsIssues: string; varsIssuesPlural: string; varsOff: string
    varsDisableTitle: string; varsEnableTitle: string
    export: string; exportTitle: string; import: string; importTitle: string
    addKey: string; addKeyTitle: string
  }
  table: {
    key: string; allLanguages: string; lastModified: string; empty: string
    clickToTranslate: string; clickToTranslateEllipsis: string
    missingVar: string; missingVarsTitle: string; missingVarsTitlePlural: string
    foundInLang: string; missingInLang: string
    missingShortBadge: string; modifiedShortBadge: string
  }
  empty: {
    noMissing: string; noModified: string; noResult: string; noKey: string
    iconMissing: string; iconSearch: string
  }
  addKey: { placeholder: string }
  stale: {
    icon: string; changedSingular: string; changedPlural: string
    bySomeoneElse: string; reload: string
  }
  history: {
    title: string; demoBanner: string; loading: string; empty: string
    keysCount: string; keysCountPlural: string
    typeAdded: string; typeDeleted: string; typeModified: string
    restore: string; restored: string
  }
  commit: {
    title: string; messageLabel: string; messagePlaceholder: string
    pushTo: string; defaultMessage: string; newFile: string
  }
  settings: {
    title: string; envConfigured: string; envMissing: string; envOnlyHint: string
    envInstallCommands: string; missingValue: string
    tokenPermRepo: string; tokenPermWrite: string
    fields: { token: string; owner: string; repo: string; branch: string; baseLang: string }
    placeholders: { pathTemplate: string }
    pathTemplateLabel: string; activeLanguages: string; done: string
  }
  import: {
    title: string; subtitle: string
    formatText: string; formatTable: string; formatJson: string
    hintText: string; hintTable: string; hintJson: string
    placeholderText: string; placeholderTable: string; placeholderJson: string
    jsonInvalid: string; emptyHint: string; emptyArrow: string
    assignmentSummary: string; column: string; targetKey: string; choose: string
    newKeyPlaceholder: string
    localesAssigned: string; localesAssignedPlural: string
    valuesToImport: string; valuesToImportPlural: string
    assignAtLeastOne: string; applyJson: string; apply: string; applyWithCount: string
    detected: string; keysInLang: string
  }
  export: {
    title: string; summary: string; format: string
    formatJson: string; formatJsonHint: string; formatTsv: string; formatTsvHint: string
    keys: string; keysAll: string; keysFiltered: string; languages: string
    preview: string; close: string; copy: string; copied: string; download: string
  }
  toast: {
    loadedFromGithub: string; error: string; historyError: string
    nothingToCommit: string; commitPushed: string
    keyRestored: string; keyAdded: string
    valuesImported: string; valuesImportedJson: string
    copiedClipboard: string; fileDownloaded: string
  }
  time: {
    justNow: string; minutesAgo: string; hoursAgo: string; daysAgo: string
  }
}

export type UiLocale = 'en-UK' | 'fr-FR' | 'es-ES'

export const UI_LOCALES: Array<{ code: UiLocale; label: string; flag: string }> = [
  { code: 'en-UK', label: 'English', flag: '🇬🇧' },
  { code: 'fr-FR', label: 'Français', flag: '🇫🇷' },
  { code: 'es-ES', label: 'Español', flag: '🇪🇸' },
]
