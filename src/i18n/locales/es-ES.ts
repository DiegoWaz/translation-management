import type { UiMessages } from '../types'

export const esES: UiMessages = {
  "app": {
    "name": "TranslationHub",
    "logo": "i18n"
  },
  "common": {
    "close": "×",
    "cancel": "Cancelar",
    "save": "Guardar",
    "add": "Añadir",
    "all": "Todos",
    "base": "Base",
    "baseBadge": "BASE",
    "emptyDash": "—",
    "check": "✓",
    "moreCount": "+{count}",
    "moreOthers": "+{count} más",
    "characters": "{count} caracteres"
  },
  "theme": {
    "toLight": "Cambiar a modo claro",
    "toDark": "Cambiar a modo oscuro",
    "lightIcon": "☀",
    "darkIcon": "☾"
  },
  "topBar": {
    "disconnected": "no conectado",
    "demo": "DEMO",
    "loadGithub": "↓ GitHub",
    "loadGithubTitle": "Cargar desde GitHub",
    "history": "Historial",
    "historyTitle": "Historial",
    "commit": "Confirmar",
    "commitTitle": "Confirmar",
    "settings": "⚙",
    "uiLang": "Idioma de la interfaz"
  },
  "filters": {
    "all": "Todas",
    "allKeys": "Todas las claves",
    "missing": "Faltantes",
    "missingShort": "Falt.",
    "modified": "Modificadas",
    "modifiedShort": "Mod.",
    "varIssues": "⚠ Variables",
    "varIssuesLong": "⚠ Variables faltantes",
    "varIssuesShort": "⚠ Vars"
  },
  "sidebar": {
    "languages": "Idiomas",
    "filter": "Filtrar",
    "keysCount": "{count} claves",
    "missingCount": "{count} faltante",
    "missingCountPlural": "{count} faltantes",
    "modifiedCount": "{count} modificada",
    "modifiedCountPlural": "{count} modificadas"
  },
  "toolbar": {
    "searchByKey": "Buscar por clave…",
    "searchAllLocales": "Buscar en todos los idiomas…",
    "modeLocale": "🌐 Locale",
    "modeKey": "🔑 Clave",
    "varsOk": "✓ vars",
    "varsIssues": "⚠ {count} var",
    "varsIssuesPlural": "⚠ {count} vars",
    "varsOff": "{x}",
    "varsDisableTitle": "Desactivar validación de variables",
    "varsEnableTitle": "Activar validación de variables",
    "export": "↑ Exportar",
    "exportTitle": "Exportar",
    "import": "↓ Importar",
    "importTitle": "Importar",
    "addKey": "+ Clave",
    "addKeyTitle": "Añadir una clave"
  },
  "table": {
    "key": "Clave",
    "allLanguages": "Todos los idiomas",
    "lastModified": "Última modificación",
    "empty": "vacío",
    "clickToTranslate": "Clic para traducir...",
    "clickToTranslateEllipsis": "Clic para traducir…",
    "missingVar": "{var} faltante",
    "missingVarsTitle": "Variable faltante: {vars}",
    "missingVarsTitlePlural": "Variables faltantes: {vars}",
    "foundInLang": "{label}: encontrado",
    "missingInLang": "{label}: faltante",
    "missingShortBadge": "{count} falt.",
    "modifiedShortBadge": "{count} mod."
  },
  "empty": {
    "noMissing": "Ninguna clave faltante",
    "noModified": "Ninguna modificación",
    "noResult": "Ningún resultado para \"{query}\"",
    "noKey": "Ninguna clave",
    "iconMissing": "✓",
    "iconSearch": "🔍"
  },
  "addKey": {
    "placeholder": "nueva.clave"
  },
  "stale": {
    "icon": "⚠️",
    "changedSingular": "fue modificado",
    "changedPlural": "fueron modificados",
    "bySomeoneElse": "por otra persona desde su carga.",
    "reload": "Recargar"
  },
  "history": {
    "title": "Historial",
    "demoBanner": "Datos de demostración — conecte GitHub para el historial real",
    "loading": "Cargando...",
    "empty": "No se encontraron commits",
    "keysCount": "{count} clave",
    "keysCountPlural": "{count} claves",
    "typeAdded": "+ AÑADIDO",
    "typeDeleted": "− ELIMINADO",
    "typeModified": "~ MODIFICADO",
    "restore": "↩ Restaurar",
    "restored": "✓ restaurada"
  },
  "commit": {
    "title": "Confirmar",
    "messageLabel": "Mensaje del commit",
    "messagePlaceholder": "feat(i18n): update translations",
    "pushTo": "Enviar a {branch}",
    "defaultMessage": "feat(i18n): update {langs} translations",
    "newFile": "Archivo nuevo"
  },
  "settings": {
    "title": "Configuración",
    "envConfigured": "Configuración cargada desde las variables de entorno.",
    "envMissing": "GitHub no está configurado — copie .env.example a .env, complete los valores y reinicie el servidor.",
    "envOnlyHint": "Toda la configuración del equipo se hace solo mediante el archivo .env (gitignored). No cambie nada en la UI.",
    "envInstallCommands": "cp .env.example .env\n# editar VITE_GH_TOKEN, VITE_GH_OWNER, VITE_GH_REPO, …\npnpm install && pnpm run dev",
    "missingValue": "— no definido —",
    "tokenPermRepo": "repo",
    "tokenPermWrite": "contents:write",
    "fields": {
      "token": "GitHub Token",
      "owner": "Owner",
      "repo": "Repository",
      "branch": "Rama",
      "baseLang": "Idioma base"
    },
    "placeholders": {
      "pathTemplate": "locales/{lang}.json"
    },
    "pathTemplateLabel": "Ruta de archivos (plantilla)",
    "activeLanguages": "Idiomas activos",
    "done": "Cerrar"
  },
  "import": {
    "title": "Importación masiva",
    "subtitle": "Elija el formato, pegue sus datos y asigne cada columna a una clave.",
    "formatText": "Texto libre",
    "formatTable": "Excel / Tabla",
    "formatJson": "JSON",
    "hintText": "EN\n\nHello!\n\nCTA\n\nES\n\n…",
    "hintTable": "EN\tHello!\tCTA\nES\t¡Hola!\tEmpezar",
    "hintJson": "{\"en\":{\"clave\":\"val\"},\"es\":{\"clave\":\"val\"}}",
    "placeholderText": "EN\n\nHello {name}!\n\n10% off\n\nES\n\n¡Hola {name}!\n\n10% de descuento",
    "placeholderTable": "EN\tHello {name}!\t10% off\nES\t¡Hola {name}!\t10% de descuento",
    "placeholderJson": "{\n  \"en\": { \"clave\": \"value\" },\n  \"es\": { \"clave\": \"valor\" }\n}",
    "jsonInvalid": "JSON inválido — esperado: { \"en\": { \"clave\": \"valor\" }, … }",
    "emptyHint": "Pegue sus datos para empezar",
    "emptyArrow": "⬅",
    "assignmentSummary": "{locales} locale{localesSuffix} · {columns} columna{columnsSuffix} — asigne cada columna a una clave",
    "column": "Columna {index}",
    "targetKey": "Clave destino",
    "choose": "— elegir —",
    "newKeyPlaceholder": "mi.nueva.clave",
    "localesAssigned": "{count} locale",
    "localesAssignedPlural": "{count} locales",
    "valuesToImport": "{count} valor a importar",
    "valuesToImportPlural": "{count} valores a importar",
    "assignAtLeastOne": "Asigne al menos una clave",
    "applyJson": "↓ Aplicar JSON",
    "apply": "↓ Aplicar",
    "applyWithCount": "↓ Aplicar ({count})",
    "detected": "{langs} idioma{langsSuffix} · {keys} clave{keysSuffix} detectadas",
    "keysInLang": "({count} claves)"
  },
  "export": {
    "title": "Exportar traducciones",
    "summary": "{langs} idioma{langsSuffix} · {keys} clave{keysSuffix}",
    "format": "Formato",
    "formatJson": "JSON",
    "formatJsonHint": "{\"en\":{…}}",
    "formatTsv": "Tabla (TSV)",
    "formatTsvHint": "EN\\tval1\\tval2",
    "keys": "Claves",
    "keysAll": "Todas ({count})",
    "keysFiltered": "Vista actual ({count})",
    "languages": "Idiomas",
    "preview": "Vista previa",
    "close": "Cerrar",
    "copy": "⎘ Copiar",
    "copied": "✓ ¡Copiado!",
    "download": "↓ Descargar .{ext}"
  },
  "toast": {
    "loadedFromGithub": "Archivos cargados desde GitHub",
    "error": "Error: {message}",
    "historyError": "Error de historial: {message}",
    "nothingToCommit": "Nada que confirmar",
    "commitPushed": "Commit enviado a {branch} — {count} claves modificadas",
    "keyRestored": "Clave \"{key}\" restaurada",
    "keyAdded": "Clave \"{key}\" añadida",
    "valuesImported": "{count} valores importados",
    "valuesImportedJson": "{count} valores importados (JSON)",
    "copiedClipboard": "Copiado al portapapeles",
    "fileDownloaded": "Archivo .{ext} descargado"
  },
  "time": {
    "justNow": "ahora mismo",
    "minutesAgo": "hace {count}min",
    "hoursAgo": "hace {count}h",
    "daysAgo": "hace {count}d"
  }
}
