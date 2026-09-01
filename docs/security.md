# Sécurité & confiance

Ce document résume, en clair, ce que LocaleHub fait — et ne fait **jamais** — avec votre dépôt et vos données.

## Aucune donnée conservée côté serveur

- LocaleHub n'a **pas de backend applicatif ni de base de données**. Le seul « serveur » est une fonction serverless (Vercel) qui relaie l'échange OAuth `code` → `access_token` avec GitHub, sans jamais stocker ni logger le token.
- Toutes les données (traductions, configs, brouillon en cours) restent **dans le navigateur** : `localStorage` (préfixe `localehub:draft:v1`) et rien d'autre. Rien n'est envoyé vers un serveur tiers.
- Fermer l'onglet ou vider le cache du navigateur suffit à tout effacer côté client — aucune copie n'existe ailleurs.

## Le token GitHub reste local et chiffré

- Le Personal Access Token (PAT) ou le token OAuth est **chiffré au repos** (AES-GCM, clé non extractible générée dans le navigateur via IndexedDB) — voir `src/helpers/secureStorage.ts`.
- Il n'est jamais transmis à un service autre que l'API GitHub officielle (`api.github.com`).
- Il n'est jamais visible en clair dans le stockage du navigateur, ni committé dans le dépôt.

## Toutes les modifications passent par une Pull Request

- LocaleHub **ne pousse jamais directement** sur la branche de base (ex. `main`). Il n'existe plus de mode « push direct ».
- Chaque commit crée une **nouvelle branche** dédiée, puis ouvre une **Pull Request** que vous relisez et mergez (ou rejetez) vous-même sur GitHub.
- Techniquement, cela rend impossible pour l'app d'écraser ou de supprimer du contenu existant sur la branche de base sans validation humaine explicite via l'interface GitHub.

## Ce que LocaleHub ne peut jamais faire

- ❌ Supprimer un dépôt, une branche, ou un fichier de manière définitive
- ❌ Pousser un commit sans passer par une PR ouverte à la revue
- ❌ Accéder à d'autres dépôts que ceux explicitement configurés (scopes du token limités par vous, côté GitHub)
- ❌ Conserver vos traductions, configs ou token sur un serveur

## Permissions minimales requises

Le token GitHub n'a besoin que du scope **`contents` (lecture/écriture)** sur le(s) dépôt(s) ciblé(s) — voir [setup.md](setup.md) pour la configuration précise (PAT classique ou GitHub App / OAuth App).

## En résumé

> Vos données restent dans votre navigateur. Votre token reste chiffré localement. Chaque changement passe par une Pull Request que vous seul validez. LocaleHub ne peut rien supprimer ni pousser dans votre dos.
