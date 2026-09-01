# Workflow : brouillon, commit, historique

## Brouillon local (`localStorage`)

Les données de travail (traductions, configs, schéma, SHAs, workspace, locale active…) sont sauvegardées automatiquement dans le navigateur.

- **Recharger la page** : le brouillon non commité est restauré
- Toast si des modifications non pushées étaient présentes
- Clé de stockage liée à `owner/repo/branch` + liste des langues (préfixe `localehub:draft:v1`, voir `src/helpers/draftStorage.ts`).

### Quand le brouillon est remplacé

| Action | Effet |
|---|---|
| Édition locale | Sauvegarde continue |
| **Charger** depuis GitHub | Remplace l’état local par le distant, puis resauvegarde |
| **Commit** réussi | Les « originaux » sont alignés sur l’état poussé ; brouillon mis à jour |

Changer `VITE_GH_LANGS` / dépôt dans `.env` → autre clé de stockage (brouillon précédent non réutilisé).

## Commit unique — toujours via Pull Request

LocaleHub ne pousse jamais directement sur la branche de base : chaque commit crée une nouvelle branche puis ouvre une Pull Request à valider sur GitHub. Détails et garanties : [security.md](security.md).

Contrairement à un PUT Contents par fichier (1 commit / fichier), l’app utilise l’**API Git Data** (`commitJsonFiles` dans `src/helpers/github.ts`) :

1. Blobs pour chaque fichier modifié
2. Nouvel arbre (`base_tree` + entrées)
3. **Un** commit parenté sur la branche
4. Mise à jour de la ref `heads/{branch}`

### Message

Prérempli avec **uniquement les locales modifiées** :

- Traductions : `feat(i18n): update fr-FR, es-ES translations`
- Configs : `feat(config): update fr-FR, en-UK` (ou message schéma seul)

Modifiable dans le dialogue avant push.

## Historique

Panneau / tiroir **Historique** : derniers commits GitHub du **fichier de la locale active**, avec diff de clés et restauration ponctuelle d’une valeur.

En mode démo : historique fictif, pas de push réel.
