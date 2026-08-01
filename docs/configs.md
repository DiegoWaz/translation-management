# Workspace Configs

Même dépôt GitHub, fichiers séparés (schéma + un JSON par locale).

## Schéma

Fichier pointé par `VITE_GH_CONFIG_SCHEMA_PATH` (ex. `configs/schema.json`).

- Les **clés doivent être en camelCase** (`maxRetryCount`, pas `max_retry_count`)
- Chaque clé a un type : `text` | `number` | `json`
- Les valeurs sont **optionnelles par locale** : une locale peut ne pas définir une clé (effacer sur une locale sans supprimer la clé du schéma)

## Fichiers par locale

Template `VITE_GH_CONFIG_PATH_TEMPLATE` → ex. `configs/fr-FR.json` : map `clé → valeur` alignée sur le schéma.

## Édition

| Vue | Usage |
|---|---|
| **Excel** | Arbre champ / valeur (groupes imbriqués). Sur une locale non-base : colonne **base** + surlignage des différences |
| **JSON** | Éditeur CodeMirror (highlight + fold). Commit toujours en JSON |
| **Modal** | Édition plein écran pour contenus longs |

En mode clé (recherche), édition multi-locales comme pour les traductions.

### Ajout / suppression de clé

- **+ Clé** : nom camelCase + type → mise à jour du schéma et des maps
- Suppression : retire du schéma et de toutes les locales
- **Effacer sur la locale** : retire la valeur locale sans toucher au schéma

## Commit configs

Un **seul** commit peut inclure :

- le fichier schéma (si modifié)
- uniquement les fichiers de locales réellement modifiées

Message par défaut du type `feat(config): update fr-FR, en-UK` (ou message schéma seul si aucune locale touchée).
