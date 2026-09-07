# Workflow : brouillon, commit, historique

## Brouillon local (IndexedDB + `localStorage`)

Les données de travail (traductions, configs, schéma, SHAs, chemins source par locale, workspace, locale active…) sont sauvegardées automatiquement dans le navigateur.

- **Stockage principal : IndexedDB** (supporte les gros dépôts multi-locales). `localStorage` reste un miroir best-effort ; s’il est saturé (~5 Mo), le brouillon IDB reste valide.
- **Recharger la page** : le brouillon non commité est restauré (toast)
- Clé de stockage liée à `owner/repo/sourceBranch` (préfixe `localehub:draft:v1`, voir `src/helpers/draftStorage.ts`) — **sans** la liste des langues.
- Les **langues découvertes** au Load sont persistées pour reconstruire la même liste au refresh.
- La **branche chargée** (`sourceBranch`) est persistée entre les sessions. La **branche de base** (`branch`) reste la cible des Pull Requests.
- Si l’enregistrement échoue complètement, un toast d’erreur s’affiche (plus d’échec silencieux).
- Si un brouillon restaure les traductions **sans** `fileSources` (course au boot / miroir LS incomplet), LocaleHub recharge les chemins depuis GitHub et peut synthétiser les sources au commit pour ne pas afficher « Aucune modification ».

### Quand le brouillon est remplacé

| Action | Effet |
|---|---|
| Édition locale | Sauvegarde continue |
| **Charger** depuis GitHub | Remplace l’état local par le distant **sur la branche cible** ; le brouillon de la branche quittée reste en `localStorage`. Si vous rechargez **la même branche** avec des edits non commités, le brouillon en mémoire est **conservé** (toast). Si la branche cible a déjà un brouillon sale, il est **restauré** (toast). |
| **Commit** réussi | Les « originaux » sont alignés sur l’état poussé ; brouillon mis à jour |

Les brouillons sont **par branche** (`sourceBranch`). Changer de branche puis y revenir conserve vos edits non commités de chaque branche. Recharger la page restaure aussi le brouillon de la branche courante.

Changer `VITE_GH_LANGS` / dépôt dans `.env` → autre clé de stockage (brouillon précédent non réutilisé).

## Session GitHub perdue

Si GitHub renvoie **401** (ou **403** avec un message d’auth explicite) lors d’une **action utilisateur** (charger, committer, assistant de configuration) :

1. LocaleHub tente d’abord un **refresh OAuth silencieux** si un `refresh_token` est stocké
2. Seulement si le refresh échoue : une **modal** bloque l’app et demande **Se reconnecter à GitHub**
3. Le **brouillon** dans ce navigateur reste intact
4. Les actions Charger / Committer / sync sont indisponibles jusqu’à reconnexion
5. L’assistant de connexion (OAuth ou PAT) rétablit le token ; le dépôt déjà choisi est conservé si possible

Les tâches de fond (préchargement de l’historique, détection de conflits distant) **n’ouvrent pas** cette modal : un échec temporaire ou un chargement lent ne doit pas être confondu avec une session expirée.

Détail token : [setup.md](setup.md#session-github--reconnexion).

## Commit unique — toujours via Pull Request

LocaleHub ne pousse jamais directement sur la branche de base : chaque commit crée une nouvelle branche puis ouvre une Pull Request à valider sur GitHub. Détails et garanties : [security.md](security.md).

Contrairement à un PUT Contents par fichier (1 commit / fichier), l’app utilise l’**API Git Data** (`commitJsonFiles` dans `src/helpers/github.ts`) pour regrouper **tous les fichiers modifiés dans un seul commit** :

1. Blobs pour chaque fichier modifié
2. Nouvel arbre (`base_tree` + entrées)
3. **Un** commit parenté sur la branche
4. Mise à jour de la ref `heads/{branch}` (nom de branche encodé pour les refs avec `/`, ex. `feat/i18n`)

> En cas d’échec sur plusieurs fichiers, l’app **ne crée plus** une série de commits Contents API (un par fichier). Un message d’erreur explicite est affiché à la place.

Les commits suivants s’ajoutent **automatiquement** sur la **branche chargée** (`sourceBranch`) quand elle diffère de la base — pas de choix « nouvelle branche », seulement le message de commit. Le sélecteur / titre de PR n’apparaît que depuis la branche de base (`main`, etc.), ou via le lien optionnel « Créer une nouvelle branche à la place… ».

### Message

Prérempli avec **uniquement les locales modifiées** :

- Traductions : `feat(i18n): update fr-FR, es-ES translations`
- Configs : `feat(config): update fr-FR, en-UK` (ou message schéma seul)

Modifiable dans le dialogue avant push.

## Historique

Panneau / tiroir **Historique** : commits GitHub des fichiers de la **locale active** sur la branche chargée (`sourceBranch`), avec diff des clés et restauration ponctuelle d’une valeur.

- Rechargement **automatique** dès que les `fileSources` sont connus (après un load GitHub)
- Rechargement **à chaque ouverture** du panneau ou changement de locale
- Bouton **Actualiser** dans le panneau ; message d’erreur explicite si l’API échoue
- Diffs par clé même pour les JSON **imbriqués** (aplats via `flattenJson`)
- Plusieurs fichiers `translations/` par langue : commits fusionnés et dédupliqués par SHA

En mode démo : historique fictif sur la locale de base uniquement.
