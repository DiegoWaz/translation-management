# TranslationHub

Interface de gestion de traductions i18n connectée à GitHub. Permet d'éditer des fichiers JSON de traductions directement depuis le navigateur, avec commit et push automatiques vers votre dépôt.

---

## Table des matières

1. [Fonctionnement général](#fonctionnement-général)
2. [Configuration GitHub](#configuration-github)
3. [Structure des fichiers de traduction](#structure-des-fichiers-de-traduction)
4. [Interface](#interface)
5. [Modes de recherche](#modes-de-recherche)
6. [Filtres](#filtres)
7. [Validation des variables](#validation-des-variables)
8. [Historique des commits](#historique-des-commits)
9. [Import / Export](#import--export)
10. [Mode démo](#mode-démo)
11. [Thème clair / sombre](#thème-clair--sombre)
12. [Stack technique](#stack-technique)

---

## Fonctionnement général

TranslationHub lit et écrit des fichiers JSON stockés dans un dépôt GitHub. Toutes les modifications restent locales jusqu'à ce que vous décidiez de les pousser via le bouton **Committer**. La configuration se fait **uniquement via `.env`** — rien ne transite par un serveur tiers.

```
Navigateur → GitHub API (HTTPS) → Votre dépôt
```

---

## Configuration GitHub

La configuration se fait **uniquement** via un fichier `.env` (gitignored). Pas d'édition dans l'UI.

### Installation équipe

```bash
git clone <repo>
cd translation-management
cp .env.example .env
# renseigner VITE_GH_TOKEN, VITE_GH_OWNER, VITE_GH_REPO, …
pnpm install
pnpm run dev
```

| Variable | Description | Exemple |
|---|---|---|
| `VITE_GH_TOKEN` | PAT (`repo` / `contents:write`) | `ghp_xxxx…` |
| `VITE_GH_OWNER` | Organisation ou utilisateur | `my-org` |
| `VITE_GH_REPO` | Nom du dépôt | `my-app` |
| `VITE_GH_BRANCH` | Branche cible | `main` |
| `VITE_GH_BASE_LANG` | Locale de référence | `fr-FR` |
| `VITE_GH_PATH_TEMPLATE` | Modèle de chemin (`{lang}`) | `locales/{lang}.json` |
| `VITE_GH_LANGS` | Locales actives, séparées par des virgules | `en-UK,fr-FR` |

Redémarrer `pnpm run dev` après chaque modification du `.env`.

> Les variables `VITE_*` sont exposées au navigateur (SPA). Ne committez jamais `.env`.

### Créer un token GitHub

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**
2. Autorisations requises : **Contents** → Read & Write sur le dépôt cible
3. Copiez le token dans `.env` (`VITE_GH_TOKEN`)

### Langues actives

**Source de vérité unique** : `VITE_GH_LANGS` dans `.env` (aucune liste de locales projet dans le code).

Labels et drapeaux sont dérivés automatiquement du code BCP47. L’UI permet d’ajouter / retirer une langue pour la session ; reportez le changement dans `.env` pour l’équipe.

---

## Structure des fichiers de traduction

TranslationHub attend des fichiers JSON à **un niveau d'imbrication** (clé → valeur) ou **multi-niveaux** (clé → objet → valeur). Les objets imbriqués sont aplatis en notation pointée.

```json
{
  "app.title": "Mon application",
  "nav.home": "Accueil",
  "auth": {
    "login": "Se connecter",
    "logout": "Se déconnecter"
  }
}
```

Après aplatissement, les clés `auth.login` et `auth.logout` apparaissent dans l'interface. Lors du commit, les clés sont réexportées dans leur structure originale imbriquée.

### Variables dans les traductions

Les variables sont détectées automatiquement via la syntaxe `{variable}` :

```json
{
  "welcome": "Bonjour {name}, vous avez {count} messages."
}
```

Si une locale cible contient `{name}` mais oublie `{count}`, un badge ⚠️ s'affiche sur la ligne concernée.

---

## Interface

### Barre du haut (TopBar)

- **Charger** — lit tous les fichiers de traduction depuis GitHub
- **Committer** — ouvre le dialogue de commit pour pousser les modifications
- **Historique** — affiche l'historique des commits du fichier actif
- **⚙** — ouvre les paramètres
- **☀/🌙** — bascule entre thème clair et sombre

### Menu de gauche (Sidebar — desktop uniquement)

Deux sections accordéon repliables :

**Langues** — liste toutes les locales configurées avec :
- Taux de complétion en pourcentage
- Barre de progression colorée (vert = 100%, bleu = >70%, orange = <70%)
- Point orange si des traductions sont modifiées localement

**Filtrer** — filtre les clés affichées (voir section [Filtres](#filtres))

En bas du panneau : résumé — nombre total de clés, manquantes, modifiées.

### Bande de langues (mobile)

Sur mobile, les langues sont affichées en défilement horizontal en haut de l'écran avec leur taux de complétion.

### Zone principale

Tableau des clés de traduction avec :
- **Colonne Clé** — identifiant de la traduction (ex. `nav.home`)
- **Colonne Base** — valeur dans la langue de référence (desktop uniquement)
- **Colonne Cible** — champ éditable, clic pour modifier
- **Colonne Dernière modif.** — auteur et date du dernier commit (desktop large uniquement)
- **×** — supprimer la clé de toutes les locales

Cliquez sur une cellule de valeur pour l'éditer inline. Appuyez sur **Entrée** ou cliquez ailleurs pour valider.

---

## Modes de recherche

La barre de recherche propose deux modes accessibles via le toggle **🌐 Locale / 🔑 Clé** :

### Mode Locale (par défaut)

Recherche dans les valeurs de la locale active. Les résultats affichent également dans quelles autres locales le terme est trouvé (badges colorés sous la valeur).

### Mode Clé

Recherche par nom de clé. Chaque résultat affiche **toutes les locales sur une seule ligne** sous forme d'accordéon :

- La ligne est fermée par défaut — cliquez sur le titre pour déplier
- Chaque locale est éditable directement dans le panneau déplié
- Un badge coloré indique l'état de chaque locale (traduit, manquant, modifié)
- Le bouton × en haut à droite de la ligne supprime la clé de toutes les locales

---

## Filtres

| Filtre | Description |
|---|---|
| **Toutes les clés** | Affiche toutes les clés |
| **Manquantes** | Clés sans traduction dans la locale active |
| **Modifiées** | Clés modifiées localement, pas encore commitées |
| **⚠ Variables** | Clés où des variables `{x}` sont présentes dans la base mais absentes de la cible |

---

## Validation des variables

Activez la validation via le bouton `{x}` dans la barre d'outils.

Lorsqu'elle est active, l'outil compare les variables `{nom}` présentes dans la chaîne de la langue de base avec celles de chaque locale cible. Si une variable est oubliée ou mal orthographiée, un badge d'avertissement apparaît sous la valeur et le compteur dans la barre d'outils s'affiche en orange.

---

## Historique des commits

Cliquez sur **Historique** dans la barre du haut pour ouvrir le panneau d'historique (panneau latéral droit sur desktop, tiroir plein écran sur mobile).

L'historique affiche les derniers commits GitHub du fichier de la locale active avec :
- Message de commit et auteur
- Date relative (ex. "il y a 3 jours")
- Liste des clés modifiées avec les valeurs avant/après
- Bouton **Restaurer** pour remettre une valeur à son état avant le commit

---

## Import / Export

### Exporter

Le bouton **↑ Exporter** propose deux formats :

| Format | Usage |
|---|---|
| **JSON** | Fichier prêt à intégrer dans votre projet |
| **TSV** | Tableur (Google Sheets, Excel) — toutes les locales en colonnes |

L'export porte uniquement sur les données actuellement chargées (après filtre éventuel).

### Importer

Le bouton **↓ Importer** ouvre un assistant d'import en masse qui accepte trois formats :

| Format | Description |
|---|---|
| **Texte libre** | Paragraphes séparés, un par locale dans l'ordre configuré |
| **Tableau** | Format `locale: valeur` ligne par ligne |
| **JSON** | `{ "fr": "valeur", "de": "valeur" }` |

L'import détecte automatiquement les locales présentes dans le texte et propose une correspondance avant application.

### Ajouter une clé

Cliquez sur **+ Clé** dans la barre d'outils. Entrez le nom de la clé (notation pointée supportée : `section.sous-section.nom`) et confirmez. La clé est ajoutée à toutes les locales avec une valeur vide.

---

## Mode démo

Si aucune configuration GitHub n'est présente, l'application démarre en **mode démo** avec des données fictives pré-chargées. Toutes les fonctionnalités sont disponibles (édition, filtres, recherche, accordéons, import/export) à l'exception du commit réel vers GitHub.

---

## Thème clair / sombre

Cliquez sur ☀ / 🌙 dans la barre du haut pour basculer entre les deux thèmes. Le thème est appliqué immédiatement sans rechargement. Le navigateur adapte également son interface système (`colorScheme`) au thème sélectionné.

---

## Stack technique

| Technologie | Rôle |
|---|---|
| React 19 | UI et état |
| Vite 8 | Bundler et dev server |
| TypeScript 5.7 | Typage statique |
| Tailwind CSS v4 | Système de styles (utilitaires) |
| GitHub REST API v3 | Lecture / écriture des fichiers JSON |

### Architecture

Toute la logique applicative est dans `src/App.tsx`. L'application est intentionnellement mono-fichier pour faciliter le déploiement et la personnalisation sans infrastructure de build complexe.

**Flux de données :**

```
GitHub API
    ↓ handleLoad()
translations: Record<lang, Record<key, value>>
    ↓ édition en place
modifiedKeys: Set<"lang/key">
    ↓ handleCommit()
GitHub API (PUT /contents)
```

**Stockage local :**

Configuration GitHub : **uniquement** via `.env` (variables `VITE_GH_*`). Aucune donnée de traduction n'est stockée localement — tout est rechargé depuis GitHub à chaque session.

---

## Développement local

```bash
cp .env.example .env
# renseigner VITE_GH_*
pnpm install
pnpm run dev
pnpm format   # optionnel
```

Le serveur démarre sur le port défini par la variable d'environnement `$PORT` (défaut : 8443).
