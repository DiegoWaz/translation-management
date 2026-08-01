import type { UiMessages } from '../types'

export const enUK: UiMessages = {
  "app": {
    "name": "TranslationHub",
    "logo": "i18n"
  },
  "common": {
    "close": "×",
    "cancel": "Cancel",
    "save": "Save",
    "add": "Add",
    "all": "All",
    "base": "Base",
    "baseBadge": "BASE",
    "emptyDash": "—",
    "check": "✓",
    "moreCount": "+{count}",
    "moreOthers": "+{count} more",
    "characters": "{count} characters"
  },
  "theme": {
    "toLight": "Switch to light mode",
    "toDark": "Switch to dark mode",
    "lightIcon": "☀",
    "darkIcon": "☾"
  },
  "topBar": {
    "disconnected": "not connected",
    "demo": "DEMO",
    "loadGithub": "↓ GitHub",
    "loadGithubTitle": "Load from GitHub",
    "history": "History",
    "historyTitle": "History",
    "commit": "Commit",
    "commitTitle": "Commit",
    "settings": "⚙",
    "uiLang": "Interface language"
  },
  "filters": {
    "all": "All",
    "allKeys": "All keys",
    "missing": "Missing",
    "missingShort": "Miss.",
    "modified": "Modified",
    "modifiedShort": "Mod.",
    "varIssues": "⚠ Variables",
    "varIssuesLong": "⚠ Missing variables",
    "varIssuesShort": "⚠ Vars"
  },
  "sidebar": {
    "languages": "Languages",
    "filter": "Filter",
    "keysCount": "{count} keys",
    "missingCount": "{count} missing",
    "missingCountPlural": "{count} missing",
    "modifiedCount": "{count} modified",
    "modifiedCountPlural": "{count} modified"
  },
  "toolbar": {
    "searchByKey": "Search by key…",
    "searchAllLocales": "Search across all languages…",
    "modeLocale": "🌐 Locale",
    "modeKey": "🔑 Key",
    "varsOk": "✓ vars",
    "varsIssues": "⚠ {count} var",
    "varsIssuesPlural": "⚠ {count} vars",
    "varsOff": "{x}",
    "varsDisableTitle": "Disable variable validation",
    "varsEnableTitle": "Enable variable validation",
    "export": "↑ Export",
    "exportTitle": "Export",
    "import": "↓ Import",
    "importTitle": "Import",
    "addKey": "+ Key",
    "addKeyTitle": "Add a key"
  },
  "table": {
    "key": "Key",
    "allLanguages": "All languages",
    "lastModified": "Last modified",
    "empty": "empty",
    "clickToTranslate": "Click to translate...",
    "clickToTranslateEllipsis": "Click to translate…",
    "missingVar": "{var} missing",
    "missingVarsTitle": "Missing variable: {vars}",
    "missingVarsTitlePlural": "Missing variables: {vars}",
    "foundInLang": "{label}: found",
    "missingInLang": "{label}: missing",
    "missingShortBadge": "{count} miss.",
    "modifiedShortBadge": "{count} mod."
  },
  "empty": {
    "noMissing": "No missing keys",
    "noModified": "No modifications",
    "noResult": "No results for \"{query}\"",
    "noKey": "No keys",
    "iconMissing": "✓",
    "iconSearch": "🔍"
  },
  "addKey": {
    "placeholder": "new.key"
  },
  "stale": {
    "icon": "⚠️",
    "changedSingular": "was changed",
    "changedPlural": "were changed",
    "bySomeoneElse": "by someone else since you loaded.",
    "reload": "Reload"
  },
  "history": {
    "title": "History",
    "demoBanner": "Demo data — connect GitHub for real history",
    "loading": "Loading...",
    "empty": "No commits found",
    "keysCount": "{count} key",
    "keysCountPlural": "{count} keys",
    "typeAdded": "+ ADDED",
    "typeDeleted": "− DELETED",
    "typeModified": "~ MODIFIED",
    "restore": "↩ Restore",
    "restored": "✓ restored"
  },
  "commit": {
    "title": "Commit",
    "messageLabel": "Commit message",
    "messagePlaceholder": "feat(i18n): update translations",
    "pushTo": "Push to {branch}",
    "defaultMessage": "feat(i18n): update {langs} translations",
    "newFile": "New file"
  },
  "settings": {
    "title": "Settings",
    "envConfigured": "Configuration loaded from environment variables.",
    "envMissing": "GitHub is not configured — copy .env.example to .env, fill in the values, then restart the server.",
    "envOnlyHint": "All team configuration is done only via the .env file (gitignored). Do not change anything in the UI.",
    "envInstallCommands": "cp .env.example .env\n# edit VITE_GH_TOKEN, VITE_GH_OWNER, VITE_GH_REPO, …\npnpm install && pnpm run dev",
    "missingValue": "— not set —",
    "tokenPermRepo": "repo",
    "tokenPermWrite": "contents:write",
    "fields": {
      "token": "GitHub Token",
      "owner": "Owner",
      "repo": "Repository",
      "branch": "Branch",
      "baseLang": "Base language"
    },
    "placeholders": {
      "pathTemplate": "locales/{lang}.json"
    },
    "pathTemplateLabel": "File path (template)",
    "activeLanguages": "Active languages",
    "done": "Close"
  },
  "import": {
    "title": "Bulk import",
    "subtitle": "Choose a format, paste your data, then assign each column to a key.",
    "formatText": "Free text",
    "formatTable": "Excel / Table",
    "formatJson": "JSON",
    "hintText": "EN\n\nHello!\n\nCTA\n\nFR\n\n…",
    "hintTable": "EN\tHello!\tCTA\nFR\tBonjour !\tCommencer",
    "hintJson": "{\"en\":{\"key\":\"val\"},\"fr\":{\"key\":\"val\"}}",
    "placeholderText": "EN\n\nHello {name}!\n\n10% off\n\nFR\n\nBonjour {name} !\n\n10% de réduction",
    "placeholderTable": "EN\tHello {name}!\t10% off\nFR\tBonjour {name} !\t10% de réduction",
    "placeholderJson": "{\n  \"en\": { \"key\": \"value\" },\n  \"fr\": { \"key\": \"valeur\" }\n}",
    "jsonInvalid": "Invalid JSON — expected: { \"en\": { \"key\": \"value\" }, … }",
    "emptyHint": "Paste your data to get started",
    "emptyArrow": "⬅",
    "assignmentSummary": "{locales} locale{localesSuffix} · {columns} column{columnsSuffix} — assign each column to a key",
    "column": "Column {index}",
    "targetKey": "Target key",
    "choose": "— choose —",
    "newKeyPlaceholder": "my.new.key",
    "localesAssigned": "{count} locale",
    "localesAssignedPlural": "{count} locales",
    "valuesToImport": "{count} value to import",
    "valuesToImportPlural": "{count} values to import",
    "assignAtLeastOne": "Assign at least one key",
    "applyJson": "↓ Apply JSON",
    "apply": "↓ Apply",
    "applyWithCount": "↓ Apply ({count})",
    "detected": "{langs} language{langsSuffix} · {keys} key{keysSuffix} detected",
    "keysInLang": "({count} keys)"
  },
  "export": {
    "title": "Export translations",
    "summary": "{langs} language{langsSuffix} · {keys} key{keysSuffix}",
    "format": "Format",
    "formatJson": "JSON",
    "formatJsonHint": "{\"en\":{…}}",
    "formatTsv": "Table (TSV)",
    "formatTsvHint": "EN\\tval1\\tval2",
    "keys": "Keys",
    "keysAll": "All ({count})",
    "keysFiltered": "Current view ({count})",
    "languages": "Languages",
    "preview": "Preview",
    "close": "Close",
    "copy": "⎘ Copy",
    "copied": "✓ Copied!",
    "download": "↓ Download .{ext}"
  },
  "toast": {
    "loadedFromGithub": "Files loaded from GitHub",
    "error": "Error: {message}",
    "historyError": "History error: {message}",
    "nothingToCommit": "Nothing to commit",
    "commitPushed": "Commit pushed to {branch} — {count} keys changed",
    "keyRestored": "Key \"{key}\" restored",
    "keyAdded": "Key \"{key}\" added",
    "valuesImported": "{count} values imported",
    "valuesImportedJson": "{count} values imported (JSON)",
    "copiedClipboard": "Copied to clipboard",
    "fileDownloaded": "File .{ext} downloaded"
  },
  "time": {
    "justNow": "just now",
    "minutesAgo": "{count}m ago",
    "hoursAgo": "{count}h ago",
    "daysAgo": "{count}d ago"
  }
}
