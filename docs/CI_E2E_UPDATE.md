# Installation du workflow CI

> **Contrainte connue** — le PAT utilisé par le pipeline de
> développement automatique n'a pas le scope GitHub `workflow`. Les
> fichiers sous `.github/workflows/` doivent donc être créés via
> l'interface GitHub, par un mainteneur qui dispose d'une session
> `workflow`-scoped, ou via un push manuel depuis un autre token.

## Procédure

1. Ouvrir `docs/ci-workflow.yml` dans le dépôt.
2. Copier intégralement son contenu.
3. Sur GitHub : `Actions → set up a workflow yourself`.
4. Renommer le fichier `ci.yml`, coller le contenu, commit `chore(ci):
   install lint+test+e2e workflow` sur `main`.
5. Optionnel : vérifier que le job tourne en ouvrant une PR triviale.

## Une fois installé

Supprimer ce fichier ET `docs/ci-workflow.yml`. La source de vérité
devient `.github/workflows/ci.yml`.

## Contenu attendu (résumé)

* **Job `unit`** : `npm ci`, `tsc --noEmit`, `eslint --max-warnings 200`,
  `vitest run`, `vite build` avec `RELEASE_SHA=${{ github.sha }}` pour
  taguer le bundle Sentry.
* **Job `e2e`** : `playwright install chromium` (caché), `npm run e2e`.
  Le rapport est uploadé en artifact si la suite échoue.
* Concurrence par `github.ref` — un push rapide annule sa propre run
  précédente.
