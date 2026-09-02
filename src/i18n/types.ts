export type UiMessages = {
  app: { name: string; logo: string }
  common: {
    close: string; cancel: string; save: string; add: string; all: string
    base: string; baseBadge: string; emptyDash: string; check: string
    moreCount: string; moreOthers: string; characters: string
  }
  theme: { toLight: string; toDark: string; lightIcon: string; darkIcon: string }
  topBar: {
    disconnected: string; demo: string; loadGithub: string; loadGithubTitle: string; loading: string
    history: string; historyTitle: string; commit: string; commitTitle: string; settings: string
    uiLang: string
    workspaceTranslations: string; workspaceConfigs: string; workspaceSchema: string; workspaceDisabled: string
    sourceBranchTitle: string; prBaseSuffix: string
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
    searchByKey: string; searchAllLocales: string; searchConfigs: string
    modeLocale: string; modeKey: string
    varsOk: string; varsIssues: string; varsIssuesPlural: string; varsOff: string
    varsDisableTitle: string; varsEnableTitle: string
    export: string; exportTitle: string; import: string; importTitle: string
    addKey: string; addKeyTitle: string; addConfigKey: string; addConfigKeyTitle: string
  }
  pagination: {
    perPage: string; page: string; of: string
    previous: string; next: string
    showingRange: string
  }
  table: {
    key: string; allLanguages: string; lastModified: string; empty: string
    clickToTranslate: string; clickToTranslateEllipsis: string
    missingVar: string; missingVarsTitle: string; missingVarsTitlePlural: string
    foundInLang: string; missingInLang: string
    missingShortBadge: string; modifiedShortBadge: string
    editKeyTitle: string; deleteKeyTitle: string; renameKeyPlaceholder: string
    renameKeyConfirmTitle: string; renameKeyCancelTitle: string
    deleteKeyConfirm: string; deleteKeyConfirmShort: string
  }
  empty: {
    noMissing: string; noModified: string; noResult: string; noKey: string
    iconMissing: string; iconSearch: string
  }
  addKey: { placeholder: string }
  stale: {
    icon: string; changedSingular: string; changedPlural: string
    bySomeoneElse: string; reload: string; review: string
  }
  sessionLost: {
    icon: string; title: string; message: string; draftHint: string
    reconnect: string; expired: string
  }
  staleConflict: {
    title: string; subtitle: string; keyCount: string
    yours: string; theirs: string; choice: string
    keepLocal: string; takeRemote: string
    keepAllLocal: string; takeAllRemote: string
    dismissKeepMine: string; apply: string
  }
  duplicates: {
    icon: string; summary: string; more: string
  }
  history: {
    title: string; demoBanner: string; loading: string; empty: string
    reload: string; error: string; noKeyChanges: string
    keysCount: string; keysCountPlural: string
    typeAdded: string; typeDeleted: string; typeModified: string
    restore: string; restored: string
  }
  commit: {
    title: string; messageLabel: string; messagePlaceholder: string
    defaultMessage: string; configDefaultMessage: string; configSchemaMessage: string
    newFile: string; schemaFile: string
    modePr: string; prOnlyHint: string; securityLink: string; type: string; branchNameLabel: string
    branchModeLabel: string; branchModeNew: string; branchModeExisting: string; branchModeExistingHint: string
    branchesLoading: string; noOtherBranches: string
    prTitleLabel: string; prTitlePlaceholder: string; createPr: string; updatePr: string
  }
  load: {
    title: string; subtitle: string; branchLabel: string; baseBranchSuffix: string
    prTargetHint: string; draftWarning: string; confirm: string; loading: string
    branchesLoading: string; noBranches: string
  }
  settings: {
    title: string; envConfigured: string; envMissing: string; envOnlyHint: string
    envInstallCommands: string; missingValue: string
    tokenPermRepo: string; tokenPermWrite: string
    fields: { token: string; owner: string; repo: string; branch: string; sourceBranch: string; baseLang: string }
    placeholders: { pathTemplate: string }
    pathTemplateLabel: string
    activeLanguages: string; done: string
  }
  import: {
    title: string; subtitle: string
    formatText: string; formatTable: string; formatJson: string
    hintText: string; hintTable: string; hintJson: string
    placeholderText: string; placeholderTable: string; placeholderJson: string
    jsonInvalid: string; emptyHint: string; emptyArrow: string
    assignmentSummary: string; column: string; targetKey: string; choose: string
    searchKey: string; noMatchingKeys: string
    newKeyPlaceholder: string
    localesAssigned: string; localesAssignedPlural: string
    valuesToImport: string; valuesToImportPlural: string
    assignAtLeastOne: string; applyJson: string; apply: string; applyWithCount: string
    detected: string; keysInLang: string
    configsTitle: string; configsSubtitle: string
    configsModeFiles: string; configsModePaste: string
    configsPickFiles: string; configsFilesHint: string
    configsPlaceholderJson: string; configsPasteHint: string
    configsAddKeys: string; configsEmpty: string
    configsInvalid: string; configsNoLocales: string; configsParseError: string
    configsPreview: string; configsSkippedKeys: string
    configsUnmatchedFiles: string; configsUnknownLangs: string
    configsApply: string; configsApplyDisabled: string
  }
  export: {
    title: string; titleConfigs: string; summary: string; summaryWithFiles: string; format: string
    formatJson: string; formatJsonHint: string
    formatJsonFiles: string; formatJsonFilesHint: string
    formatJsonNs: string; formatJsonNsHint: string
    formatCsv: string; formatCsvHint: string
    formatTsv: string; formatTsvHint: string
    tableView: string; rawView: string
    keys: string; keysAll: string; keysFiltered: string; languages: string
    preview: string; close: string; copy: string; copied: string; download: string
  }
  toast: {
    loadedFromGithub: string; loadedFromBranch: string; draftRestored: string; error: string; historyError: string
    nothingToCommit: string; prCreated: string; prCreatedOnBranch: string
    keyRestored: string; keyAdded: string; configKeyAdded: string; keyRenamed: string
    valuesImported: string; valuesImportedJson: string; configsImported: string
    copiedClipboard: string; fileDownloaded: string
    staleResolved: string; staleKeptLocal: string
    oauthConnected: string; oauthFailed: string; oauthStateInvalid: string
  }
  configs: {
    empty: string; clickToEdit: string; deleteKey: string; keyPlaceholder: string
    invalidNumber: string; errorDuplicate: string; errorCamelCase: string
    notSet: string; clearOnLocale: string; unsetInLang: string
    openModal: string; modalEdit: string; modalViewOnly: string; sheets: string
    fieldsCount: string
    useBaseStructure: string; formatJson: string
    excelView: string; jsonView: string; excelEmpty: string; excelHint: string
    excelFieldColumn: string; excelValueColumn: string; excelBaseColumn: string
    excelDiffHint: string; excelMissingInLocale: string; excelOnlyInLocale: string
    excelDiffBadge: string; excelDiffCount: string
    shapeMismatch: string; jsonHint: string
    types: { text: string; number: string; json: string }
  }
  time: {
    justNow: string; minutesAgo: string; hoursAgo: string; daysAgo: string
  }
  schema: {
    title: string; subtitle: string
    targetSchema: string; autoValidate: string; validate: string; loadExample: string
    valid: string; issueCount: string
    dtoPane: string; jsonPane: string; results: string
    schemasFound: string; dtoEmpty: string; dtoNoSchema: string; dtoCompileError: string
    dtoPlaceholder: string; dtoHint: string
    jsonValid: string; jsonEmpty: string; jsonError: string
    waiting: string; validMessage: string
    colPath: string; colMessage: string; colCode: string
  }
  setup: {
    title: string; subtitle: string
    stepToken: string; stepRepo: string; stepFolder: string; stepLangs: string
    signInGithub: string; usePatInstead: string; orPat: string
    tokenLabel: string; tokenHint: string
    connect: string; connecting: string
    loggedAs: string; searchRepo: string; noRepos: string
    langsDetected: string; emptyFolder: string
    foldersSelected: string
    langsSummary: string; langsSummaryMulti: string
    baseLangLabel: string; selectLangs: string; branchLabel: string
    useFolder: string; finish: string
    skip: string; back: string; loading: string
    disconnect: string; connectedTo: string
    resumeLast: string; resumeLastHint: string; prefsRestored: string; resumeNotFound: string
  }
}

export type UiLocale = 'en-UK' | 'fr-FR' | 'es-ES'

export const UI_LOCALES: Array<{ code: UiLocale; label: string; flag: string }> = [
  { code: 'en-UK', label: 'English', flag: '🇬🇧' },
  { code: 'fr-FR', label: 'Français', flag: '🇫🇷' },
  { code: 'es-ES', label: 'Español', flag: '🇪🇸' },
]
