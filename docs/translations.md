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

### Variables `{name}`

Syntaxe `{variable}` détectée automatiquement. Si la locale de base contient `{count}` et la cible non, un avertissement s’affiche (filtre **Variables**, bouton `{x}`).

## Interface

| Zone | Rôle |
|---|---|
| **Charger** | Relit tous les JSON depuis GitHub (écrase le brouillon local par les données distantes) |
| **Committer** | Ouvre le dialogue ; un seul commit pour les locales modifiées |
| **Historique** | Commits du fichier de la locale active |
| Sidebar / bande mobile | Locales, complétion, filtres |

### Tableau

- **Clé** · **Base** (desktop) · **Cible** éditable · dernière modif. (large) · supprimer
- Édition inline : Entrée ou blur pour valider
- **Mode clé** (toggle recherche) : une ligne = toutes les locales en accordéon

### Filtres

| Filtre | Effet |
|---|---|
| Toutes | Toutes les clés |
| Manquantes | Valeur vide sur la locale active |
| Modifiées | Diff vs. dernière version chargée / commitée |
| Variables | Écart de placeholders `{…}` vs. base |

### Import / export

- **Exporter** : JSON ou TSV (locales en colonnes)
- **Importer** : texte libre, tableau `locale: valeur`, ou JSON
- **+ Clé** : ajoute la clé sur toutes les locales

Voir aussi [workflow.md](workflow.md) pour brouillon et commit.
