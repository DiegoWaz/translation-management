# Context for agents — LocaleHub

This repo is **LocaleHub**: a SPA to manage **i18n translations** and **per-locale JSON configs** on GitHub (not a generic Figma Make demo). Prefer `docs/` over outdated assumptions.

## Product facts (do not contradict)

- Product name: **LocaleHub** (`package.json` → `locale-hub`)
- Two workspaces: **translations** and **configs**
- GitHub config is **env-only** (`.env` / `VITE_GH_*`) — see `docs/setup.md`
- Uncommitted work is persisted in **localStorage** (`src/helpers/draftStorage.ts`, prefix `localehub:draft:v1`)
- Commits are **one Git commit** for all changed locale files via Git Data API (`commitJsonFiles` in `src/helpers/github.ts`)
- Config keys must be **camelCase**; values may be unset per locale
- UI strings live in `src/i18n/` (en-UK, fr-FR, es-ES); brand strings `ui.app.name` / `ui.app.logo`

## Read first by task

| Task | Start here |
|---|---|
| Setup / env | `docs/setup.md`, `src/helpers/config.ts`, `.env.example` |
| Translations UX | `docs/translations.md`, `src/components/TranslationTable.tsx` |
| Configs UX | `docs/configs.md`, `src/helpers/configValues.ts`, `ConfigTable.tsx` |
| Load / commit / draft | `docs/workflow.md`, `src/hooks/useTranslationApp.ts`, `src/helpers/github.ts` |
| Architecture | `docs/architecture.md` |
| UI entry | `src/App.tsx` |

## Development server

Vite may already be running on `$PORT` (default **8443**). Hot reload applies to `src/` edits. Do not assume you must start the server unless it is down.

## Stack & styling

- React 19, Vite 8, TypeScript 5.7, Tailwind CSS v4 (`@import 'tailwindcss'` in `src/index.css`)
- `@` alias → `src`
- Theme tokens in CSS variables — prefer existing semantic classes (`bg-page`, `text-fg`, …)
- No Tailwind config / PostCSS file required

## Code quality

- Prefer matching existing patterns in the touched folder (named vs default exports).
- Escape apostrophes in single-quoted strings or use double quotes.
- Do not invent a backend; all persistence is GitHub API + `localStorage`.
- Do not commit `.env` or tokens.
- Keep changes scoped; update `docs/` when behavior users rely on changes.
- Keep product naming **LocaleHub** in user-facing copy and docs.

## Doc map

- Human entry: `README.md`
- Doc index: `docs/README.md`
- Cursor rules: `.cursor/rules/`
