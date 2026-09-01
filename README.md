# LocaleHub

Interface web pour gérer les **traductions i18n** et les **configs JSON** stockées dans un dépôt GitHub. Édition dans le navigateur, brouillon local, commit unique vers la branche configurée.

```
Navigateur  →  GitHub API (HTTPS)  →  votre dépôt
     ↕
 localStorage (brouillon non commité)
```

## Démarrage rapide

```bash
cp .env.example .env
# renseigner VITE_GH_TOKEN, VITE_GH_OWNER, VITE_GH_REPO, VITE_GH_LANGS, …
pnpm install
pnpm run dev
```

Le serveur écoute sur `$PORT` (défaut **8443**). Redémarrer après toute modification du `.env`.

Sans token / dépôt, l’app démarre en **mode démo** avec des données fictives.

## Documentation

| Document | Contenu |
|---|---|
| [docs/setup.md](docs/setup.md) | `.env`, token GitHub, locales, chemins |
| [docs/translations.md](docs/translations.md) | Workspace Traductions |
| [docs/configs.md](docs/configs.md) | Workspace Configs (Excel / JSON) |
| [docs/workflow.md](docs/workflow.md) | Brouillon local, commit unique, historique |
| [docs/security.md](docs/security.md) | Confiance & sécurité : rien conservé, tout passe par une PR |
| [docs/architecture.md](docs/architecture.md) | Structure du code, flux de données |
| [docs/context/product.md](docs/context/product.md) | Brief produit compact |

Contexte agents / IA : [AGENTS.md](AGENTS.md) · règles Cursor : [`.cursor/rules/`](.cursor/rules/).

## Fonctionnalités (aperçu)

- **Deux workspaces** : Traductions ↔ Configs + **DTO** (validation Zod)
- **Édition** : inline, mode clé (toutes locales), import / export
- **Configs** : schéma camelCase, valeurs optionnelles par locale, vues Excel (arbre) et JSON
- **DTO** : coller un schéma Zod + JSON → liste des erreurs de format
- **Brouillon** : persistance `localStorage` tant qu’il n’y a pas de commit / rechargement GitHub
- **Commit** : **un seul** commit Git listant uniquement les locales modifiées
- Thème clair / sombre, UI fr / en / es

## Configuration (résumé)

| Variable | Rôle |
|---|---|
| `VITE_GH_TOKEN` | PAT (`contents:write`) |
| `VITE_GH_OWNER` / `VITE_GH_REPO` / `VITE_GH_BRANCH` | Dépôt cible |
| `VITE_GH_BASE_LANG` | Locale de référence |
| `VITE_GH_LANGS` | Locales actives (`en-UK,fr-FR`) |
| `VITE_GH_PATH_TEMPLATE` | Chemins traductions (`locales/{lang}.json`) |
| `VITE_GH_CONFIG_PATH_TEMPLATE` | Chemins configs (`configs/{lang}.json`) |
| `VITE_GH_CONFIG_SCHEMA_PATH` | Schéma configs |

Détail : [docs/setup.md](docs/setup.md). Ne jamais committer `.env`.

## Stack

React 19 · Vite 8 · TypeScript 5.7 · Tailwind CSS v4 · GitHub REST / Git Data API · CodeMirror (JSON)

```bash
pnpm run build    # build production
pnpm run preview  # prévisualiser le build
pnpm format       # oxfmt
```

Package npm : `locale-hub`.
