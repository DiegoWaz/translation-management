# Workspace Traductions

Basculer via le toggle **Translations / Configs** dans la barre du haut.

## Format des fichiers

JSON à un ou plusieurs niveaux. Les objets imbriqués sont aplatis en notation pointée dans l’UI, puis réécrits en JSON indenté au commit.

```json
{
  "app.title": "Mon application",
  "auth": {
    "login": "Se connecter",
    "logout": "Se déconnecter"
  }
}
```

→ clés `app.title`, `auth.login`, `auth.logout`.

### Format au commit

Les fichiers sont **toujours écrits en JSON imbriqué** (`common.action.label.open` → `common → action → label → open`), en préservant la structure d’origine quand elle existe déjà sur GitHub.

### Variables `{name}`

Syntaxe `{variable}` détectée automatiquement. Si la locale de base contient `{count}` et la cible non, un avertissement s’affiche (filtre **Variables**, bouton `{x}`).

## Interface

| Zone | Rôle |
|---|---|
| **Charger** | Relit tous les JSON depuis la branche source choisie (écrase le brouillon local par les données distantes) |
| **Committer** | Ouvre le dialogue ; un seul commit pour les locales modifiées |
| **Historique** | Commits du fichier de la locale active |
| Sidebar / bande mobile | Locales, complétion, filtres |

### Tableau

- **Clé** · **Base** (desktop) · **Cible** éditable · dernière modif. (large) · supprimer
- Édition inline : Entrée ou blur pour valider
- **Mode clé** (toggle recherche) : une ligne = toutes les locales en accordéon
- **Colonnes** : glisser le bord droit d’un en-tête pour agrandir / rétrécir ; double-clic pour réinitialiser (largeurs mémorisées)
- **Recherche** : filtre sur le nom de clé **et** les valeurs de toutes les locales
- **+ Clé** dans un groupe (ex. `common`) : préremplit `common.`

### Filtres

| Filtre | Effet |
|---|---|
| Toutes | Toutes les clés |
| Manquantes | Valeur vide sur la locale active |
| Modifiées | Diff vs. dernière version chargée / commitée |
| Variables | Écart de placeholders `{…}` vs. base |

### Import / export

- **Exporter** : JSON ou TSV (locales en colonnes), ou **Fichiers d'origine (ZIP)** — mêmes chemins et arborescence JSON que sur GitHub (`fileSources` / `rawContent`). Si le dépôt contient **plusieurs dossiers `translations/`** (ex. `apps/web/translations/` et `packages/ui/translations/`), tous les fichiers découverts sont chargés, commités et exportés séparément ; les clés sont réparties via `keyOwners` (fichier d’origine + routage namespace/chemin pour les nouvelles clés).
- **Clés dupliquées** : bannière d’avertissement si la même clé existe dans plusieurs fichiers d’une même locale.
- **Conflits distants** : détection stale (poll 30 s) → bouton **Voir les différences** → résolution clé par clé (garder la mienne / prendre la distante) ou rechargement complet.
- **Performance** : virtualisation du tableau (mode locale, > 40 lignes visibles sur la page courante).
- **Importer** : texte libre, tableau `locale: valeur`, ou JSON
- **+ Clé** : ajoute la clé sur toutes les locales

Voir aussi [workflow.md](workflow.md) pour brouillon et commit.
