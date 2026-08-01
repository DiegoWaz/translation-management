# LocaleHub — contexte produit

Fichier court pour briefings / agents. Détail dans `docs/`.

## Quoi

**LocaleHub** : outil interne d’édition de fichiers JSON (traductions + configs) versionnés sur GitHub, sans backend.

## Qui

Équipes produit / i18n qui maintiennent des locales listées dans `VITE_GH_LANGS`.

## Promesses

1. Éditer hors IDE, depuis le navigateur
2. Ne pas perdre le travail non commité au refresh (brouillon navigateur)
3. Un commit Git propre listant les locales touchées
4. Configs typées (schéma) avec valeurs optionnelles par langue

## Hors scope

- Auth utilisateur multi-comptes (un PAT d’équipe dans `.env`)
- CI / reviews automatiques
- Formats non JSON (sauf export TSV côté traductions)

## Vocabulaire

| Terme | Sens |
|---|---|
| LocaleHub | Nom produit |
| Base lang | Locale de référence (`VITE_GH_BASE_LANG`) |
| Brouillon | État localStorage non aligné sur un commit |
| Workspace | `translations` ou `configs` |
| Schéma | Types des clés config (`configs/schema.json`) |
