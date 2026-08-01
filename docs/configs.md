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

## Validation DTO (Zod)

Workspace **DTO** dans la barre du haut :

1. Collez un snippet Zod **autonome** (sans `import` — `z` est fourni)
2. Incluez les schémas parents (ex. `ExtendedProductDTO`) ou recopiez-les
3. Collez le JSON à contrôler
4. Choisissez le schéma cible dans la liste — les erreurs s’affichent (chemin, message, code)

## Import

Bouton **↓ Importer** dans le workspace Configs :

- **Plusieurs fichiers** `.json` (ex. `en-UK.json`, `fr-FR.json`) — la locale est déduite du nom
- **Coller un JSON** multi-locales : `{ "en-UK": { … }, "fr-FR": { … } }`
- Schéma optionnel dans le JSON : `{ "schema": { "maxRetry": "number" }, … }`
- Option pour **ajouter au schéma** les clés camelCase manquantes (type déduit)

## Commit configs

Un **seul** commit peut inclure :

- le fichier schéma (si modifié)
- uniquement les fichiers de locales réellement modifiées

Message par défaut du type `feat(config): update fr-FR, en-UK` (ou message schéma seul si aucune locale touchée).
