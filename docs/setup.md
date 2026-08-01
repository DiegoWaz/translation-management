# Configuration & installation

## Prérequis

- Node.js (voir [`.mise.toml`](../.mise.toml) si présent)
- [pnpm](https://pnpm.io)

## Installation

```bash
git clone <repo>
cd locale-hub
# ou le dossier du clone, ex. translation-management
cp .env.example .env
# éditer les variables VITE_GH_*
pnpm install
pnpm run dev
```

Redémarrer le serveur Vite après **chaque** changement de `.env` (les `VITE_*` sont injectées au build / démarrage).

## Variables d’environnement

La config équipe passe **uniquement** par `.env` (gitignored). Pas d’édition persistante dans l’UI Settings (affichage / diagnostic seulement).

| Variable | Obligatoire* | Description | Exemple |
|---|---|---|---|
| `VITE_GH_TOKEN` | oui (prod) | Fine-grained ou classic PAT | `ghp_…` |
| `VITE_GH_OWNER` | oui | Org ou user | `my-org` |
| `VITE_GH_REPO` | oui | Nom du dépôt | `my-app` |
| `VITE_GH_BRANCH` | non | Branche (défaut `main`) | `main` |
| `VITE_GH_BASE_LANG` | recommandé | Locale de référence | `fr-FR` |
| `VITE_GH_LANGS` | oui | Locales actives, séparées par des virgules | `en-UK,fr-FR` |
| `VITE_GH_PATH_TEMPLATE` | non | Chemin traductions (`{lang}`) | `locales/{lang}.json` |
| `VITE_GH_CONFIG_PATH_TEMPLATE` | non | Chemin configs | `configs/{lang}.json` |
| `VITE_GH_CONFIG_SCHEMA_PATH` | non | Fichier schéma | `configs/schema.json` |

\*Sans token + owner + repo → **mode démo**.

> Les variables `VITE_*` sont exposées au **navigateur**. Ne committez jamais un token.

### Token GitHub

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens**
2. Fine-grained : permission **Contents** → Read and write sur le dépôt
3. Copier dans `VITE_GH_TOKEN`

## Locales

**Source de vérité** : `VITE_GH_LANGS`. Aucune liste de langues codée en dur dans le projet.

Labels et drapeaux sont dérivés du code BCP47 (`src/helpers/lang.ts`, `countries.ts`).

## Fichiers attendus dans le dépôt distant

Exemple avec les templates par défaut :

```
locales/fr-FR.json
locales/en-UK.json
configs/schema.json
configs/fr-FR.json
configs/en-UK.json
```

Les fichiers absents peuvent être créés au premier commit (nouveaux blobs).
