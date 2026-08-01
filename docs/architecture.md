# Architecture — LocaleHub

## Vue d’ensemble

SPA React (**LocaleHub**). Pas de backend : le navigateur parle à `api.github.com` avec le token `VITE_GH_*`.

```
src/main.tsx
  └─ App.tsx                 # composition UI
       └─ useTranslationApp  # état métier unique
            ├─ helpers/*     # GitHub, draft, filtering, configs…
            ├─ components/*  # UI
            └─ i18n/*        # chaînes UI (fr / en / es)
```

## Fichiers d’entrée

| Chemin | Rôle |
|---|---|
| `src/App.tsx` | Shell : TopBar, sidebar, tables, modales |
| `src/hooks/useTranslationApp.ts` | État, load / commit, brouillon |
| `src/helpers/config.ts` | Lecture `.env` → `GitHubConfig` |
| `src/helpers/github.ts` | Load JSON, `commitJsonFiles`, historique |
| `src/helpers/draftStorage.ts` | Persist / restore `localStorage` |
| `src/helpers/configValues.ts` | Schéma, camelCase, diffs configs |
| `src/helpers/filtering.ts` | Filtres, clés modifiées (traductions) |
| `src/index.css` | Tailwind v4 + tokens thème |
| `src/styles/tokens.css` | Variables CSS (thème, CodeMirror) |

Alias Vite : `@` → `src`.

## Flux de données

```
.env  →  loadConfig()
           ↓
     handleLoad()  →  loadJsonFile × N
           ↓
  translations / configs / schema + shas
           ↓  (éditions)
      saveDraft()  ↔  localStorage
           ↓
  doCommit()  →  commitJsonFiles()  →  1 commit Git
           ↓
     originals alignés + shas mis à jour
```

## Conventions

- Exports de composants : **default** pour les pages/entrées documentées dans AGENTS ; les composants métier actuels utilisent surtout des **named exports** — rester cohérent avec le fichier voisin.
- Chaînes UI : `src/i18n/locales/*.ts` + `t()` / `ui` — pas de texte utilisateur en dur dans les composants.
- Clés config : camelCase validé côté helper.
- Styles : utilitaires Tailwind ; tokens sémantiques (`bg-page`, `text-fg`, `border-brand`, …).

## Stack

| Techno | Usage |
|---|---|
| React 19 | UI |
| Vite 8 | Dev / build |
| TypeScript 5.7 | Typage |
| Tailwind CSS v4 | Styles (`@tailwindcss/vite`) |
| CodeMirror | Éditeur JSON configs |
| GitHub REST + Git Data | Lecture contenus, commit multi-fichiers |

## Mode démo

Si `isGithubConfigured` est faux : données `helpers/defaults.ts`, pas d’appel API de push. Utile pour UI / QA sans token.
