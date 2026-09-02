# LocaleHub

**Éditeur i18n Git-native pour les développeurs** — modifiez les fichiers JSON de traduction (et configs) **depuis le navigateur**, sans TMS ni workflow PO/QA. La source de vérité reste **votre dépôt GitHub** ; LocaleHub lit, édite en local et pousse via **Pull Request**.

> Par les devs, pour les devs : pas de rôles traducteur/relecteur, pas d’assignation de tâches, pas de machine translation. Voir [docs/features.md](docs/features.md) pour l’inventaire complet et le hors-scope.

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

Sans token / dépôt → **mode démo** (données fictives, pas de push).

## Documentation

| Document | Contenu |
|---|---|
| [docs/features.md](docs/features.md) | **Fonctionnalités & positionnement** (dev-only) |
| [docs/setup.md](docs/setup.md) | `.env`, token GitHub, OAuth, locales |
| [docs/translations.md](docs/translations.md) | Workspace Traductions |
| [docs/configs.md](docs/configs.md) | Workspace Configs (Excel / JSON) |
| [docs/workflow.md](docs/workflow.md) | Brouillon, commit, historique, reconnexion |
| [docs/security.md](docs/security.md) | Confiance : rien conservé côté serveur, tout passe par une PR |
| [docs/architecture.md](docs/architecture.md) | Structure du code |
| [docs/context/product.md](docs/context/product.md) | Brief produit compact |

Contexte agents / IA : [AGENTS.md](AGENTS.md) · règles Cursor : [`.cursor/rules/`](.cursor/rules/).

## En bref

- **Traductions** : édition inline, import/export, multi-dossiers `translations/`, commit unique → PR
- **Brouillon** : persistance navigateur ; reconnexion GitHub obligatoire si le token expire
- **Configs / DTO** : codés, onglets désactivés pour l’instant
- UI **fr / en / es** · thème clair / sombre

## Configuration (résumé)

| Variable | Rôle |
|---|---|
| `VITE_GH_TOKEN` | PAT (`contents:write`) |
| `VITE_GH_OWNER` / `VITE_GH_REPO` / `VITE_GH_BRANCH` | Dépôt cible |
| `VITE_GH_BASE_LANG` | Locale de référence |
| `VITE_GH_LANGS` | Locales actives (`en-UK,fr-FR`) |
| `VITE_GH_PATH_TEMPLATE` | Chemins traductions (`locales/{lang}.json`) |

Détail : [docs/setup.md](docs/setup.md). Ne jamais committer `.env`.

## Stack

React 19 · Vite 8 · TypeScript 5.7 · Tailwind CSS v4 · GitHub REST / Git Data API

```bash
pnpm run build
pnpm run preview
pnpm format
```

Package npm : `locale-hub`.
