# LocaleHub — contexte produit

Fichier court pour briefings / agents. Détail : [features.md](../features.md).

## Quoi

**LocaleHub** : éditeur i18n **pour les développeurs** — fichiers JSON (traductions + configs) versionnés sur GitHub, sans backend applicatif.

## Qui

**Développeurs** qui maintiennent les locales dans le repo (`VITE_GH_LANGS` ou détection auto). Pas de PO, QA ou traducteurs métier dans le produit.

## Promesses

1. Éditer hors IDE, depuis le navigateur
2. Ne pas perdre le travail non commité au refresh (brouillon navigateur)
3. Un commit Git propre listant les locales touchées, **toujours via PR**
4. Reconnexion **obligatoire** si la session GitHub expire (brouillon conservé)

## Hors scope

- Workflow PO / QA / traduction métier (rôles, assignation, relecture)
- Machine translation, glossaire, mémoire de traduction
- Auth multi-comptes / RBAC dans l’app
- Formats non JSON (sauf export TSV/CSV)
- Push direct sur la branche de base

## Vocabulaire

| Terme | Sens |
|---|---|
| LocaleHub | Nom produit |
| Base lang | Locale de référence (`VITE_GH_BASE_LANG`) |
| Brouillon | État localStorage non aligné sur un commit |
| Workspace | `translations` ou `configs` |
| sourceBranch | Branche lue / chargée |
| branch | Branche cible des Pull Requests |
