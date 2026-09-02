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

## Déploiement en production (Vercel)

L'échange OAuth GitHub (`code` → `access_token`) doit se faire **côté serveur**,
car il nécessite `GH_CLIENT_SECRET`, qui ne doit jamais atteindre le navigateur.

- En local (`pnpm run dev`), cet échange est géré par un middleware Vite dev-only
  (`githubOAuthProxy` dans [`vite.config.ts`](../vite.config.ts)) — il n'existe pas
  dans un build statique (`vite build`).
- En production, [`api/github/token.ts`](../api/github/token.ts) est une
  **Vercel Serverless Function** qui fournit le même endpoint
  `POST /api/github/token`. Le frontend (`src/helpers/githubOAuth.ts`) appelle
  toujours ce même chemin, sans distinguer dev/prod.

### Déployer sur Vercel

1. Importer le repo sur [vercel.com](https://vercel.com/new)
2. Renseigner les variables d'environnement du projet Vercel (Project Settings → Environment Variables) :
   - `VITE_GH_CLIENT_ID` — Client ID de l'OAuth App GitHub
   - `GH_CLIENT_SECRET` — Client Secret (jamais préfixé `VITE_`, donc jamais exposé au navigateur)
   - éventuellement `VITE_GH_LANGS`, `VITE_GH_BASE_LANG`, etc. si l'équipe préfère la config par variables plutôt que par l'assistant de configuration OAuth
3. Dans l'OAuth App GitHub (**Settings → Developer settings → OAuth Apps**), mettre à jour :
   - **Homepage URL** : l'URL de prod (ex. `https://mon-app.vercel.app`)
   - **Authorization callback URL** : **exactement** la même URL que celle de l'app (ex. `https://mon-app.vercel.app/` — avec ou sans slash final, mais identique à ce que le navigateur envoie)
4. Déployer. Aucune autre configuration serveur n'est nécessaire — `vercel.json` déclare déjà le build Vite et le dossier `api/`.

Après autorisation GitHub, l'app échange le `code` contre un token via `/api/github/token` (le `redirect_uri` est transmis automatiquement). En cas d'échec, un toast d'erreur s'affiche ; en cas de succès, l'assistant de configuration s'ouvre pour choisir le dépôt.

> Pour un autre hébergeur que Vercel, il faut porter `api/github/token.ts` vers
> l'équivalent (Netlify Function, route Express, etc.) — la logique métier
> (appel à `https://github.com/login/oauth/access_token`) est directement réutilisable.

## Session GitHub & reconnexion

LocaleHub **ne fonctionne pas hors ligne** vis-à-vis de GitHub : charger, committer et synchroniser nécessitent un token valide.

- Le token (PAT ou OAuth) est stocké **chiffré dans le navigateur** — voir [security.md](security.md).
- Si le token **expire ou est révoqué** (réponse API `401`, ou `403` avec message d’auth explicite), une **modal bloquante** s’affiche **uniquement lors d’une action utilisateur** (charger, committer, configuration initiale) — pas pendant les tâches de fond (historique, détection de conflits).
- Le brouillon local non commité est **conservé** tant que vous ne rechargez pas depuis GitHub.
- Les appels API en arrière-plan (historique, synchronisation) n’ouvrent pas la modal : en cas d’échec, réessayez via **Charger** ou **Actualiser** l’historique.

Si vous utilisez uniquement `VITE_GH_TOKEN` dans `.env`, un token expiré impose de **mettre à jour le `.env` et redémarrer Vite**, ou de passer par **Se connecter** (OAuth) qui stocke un token en local.

