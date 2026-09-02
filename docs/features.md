# Fonctionnalités — LocaleHub

LocaleHub est un **éditeur i18n Git-native pour les développeurs**. Les devs modifient les fichiers JSON de traduction (et configs) **depuis le navigateur** ; la source de vérité reste **le dépôt GitHub**. Pas de TMS, pas de workflow PO/QA/traducteur métier.

```
Navigateur  →  GitHub API  →  votre dépôt
     ↕
 localStorage (brouillon non commité)
```

## Pour qui / pas pour qui

| Public | Rôle |
|---|---|
| **Développeurs** | Ajout de clés, traductions, commit via PR, résolution de conflits Git |
| **Hors scope** | PO, QA, traducteurs externes, relecture métier, assignation de tâches |

| Volontairement absent |
|---|
| Rôles et permissions dans l’app |
| Machine translation, mémoire de traduction, glossaire |
| États « à valider / approuvé », commentaires par clé |
| Screenshots, contexte Figma, formats PO/XLIFF/YAML |
| Backend ou base de données (données = navigateur + GitHub) |
| Push direct sur `main` — **toujours une Pull Request** |

---

## Connexion & configuration

- Mode **démo** sans token (données fictives)
- Assistant **Se connecter** : OAuth GitHub ou PAT, repo, branche, langues auto-détectées
- Config équipe via **`.env`** (`VITE_GH_*`)
- Token **chiffré** localement (AES-GCM + IndexedDB)
- **Reconnexion obligatoire** si le token expire ou est révoqué (modal bloquante — le brouillon local est conservé)
- Settings en lecture seule · déconnexion · UI fr / en / es · thème clair / sombre

## GitHub & branches

- API REST + **Git Data** (commit multi-fichiers)
- `sourceBranch` (lu) vs `branch` (cible PR), persistés
- **Charger** depuis une branche (dialogue + loader plein écran)
- Découverte de tous les dossiers `translations/` du mono-repo
- Commit sur **nouvelle branche** ou **branche existante** (PR de suivi)
- Bascule sur la branche de la PR après création

## Workspace Traductions *(actif)*

### Édition

- Tableau clé · base · cible · dernière modif.
- Inline, **mode clé** (toutes les langues), + clé / renommer / supprimer
- Recherche, groupes par namespace, pagination, **virtualisation** (> 40 lignes)
- Indicateurs : modifié ◆, manquant ⊘, variables `{x}` ⚠️

### Filtres

- Toutes · manquantes · modifiées · variables manquantes
- Stats par langue (complétion %, compteurs)

### Multi-fichiers & JSON

- JSON plat ou imbriqué ; structure préservée au commit (`rawContent`)
- Plusieurs `translations/` par langue ; routage `keyOwners`
- Alerte **clés dupliquées** entre fichiers

### Import / export

- Import : texte, tableau `locale:`, JSON multi-locales
- Export : CSV, TSV, JSON, ZIP par namespace, **ZIP fichiers d’origine**

### Collab légère (via Git)

- Poll **stale** (30 s) + résolution clé par clé ou rechargement
- **Historique** Git par locale + restauration d’une valeur

## Workflow dev

- Brouillon auto `localStorage` (traductions, `fileSources`, `keyOwners`, …)
- Compteur de modifications · **commit unique** multi-fichiers
- Message listant uniquement les locales modifiées · feat/fix auto
- Overlay plein écran pendant chargement / commit

## Workspaces Configs & DTO *(codés, onglets désactivés)*

- **Configs** : schéma camelCase, Excel/JSON, import — non accessible depuis la TopBar
- **DTO** : validation Zod + JSON — idem

---

Voir aussi : [workflow.md](workflow.md) · [translations.md](translations.md) · [security.md](security.md)
