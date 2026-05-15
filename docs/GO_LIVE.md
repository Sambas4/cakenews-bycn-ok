# Go-Live — checklist opérateur

Actions à exécuter manuellement avant et après la mise en production.
Les sprints R → X ont câblé tout ce qui pouvait l'être en code. Cette
liste recense les opérations qui demandent un humain avec les bons
accès.

## Avant le lancement

### 1. Installer le workflow CI sur GitHub

Le PAT du pipeline de développement n'a pas le scope `workflow`. Le
fichier YAML est livré dans `docs/ci-workflow.yml`.

1. GitHub UI → `Actions` → `set up a workflow yourself`.
2. Renommer en `ci.yml`.
3. Coller le contenu de `docs/ci-workflow.yml`.
4. Commit `chore(ci): install lint+test+build+e2e workflow` sur `main`.
5. Supprimer `docs/ci-workflow.yml` et `docs/CI_E2E_UPDATE.md` du dépôt.

### 2. Configurer les variables d'environnement Vercel

`Project Settings → Environment Variables` (preview + prod) :

* `VITE_SUPABASE_URL` — URL du projet Supabase prod.
* `VITE_SUPABASE_ANON_KEY` — anon key publique correspondante.
* `VITE_VAPID_PUBLIC_KEY` — clé publique VAPID (Web Push).
* `VITE_SENTRY_DSN` — DSN Sentry du projet front.
* `VITE_BOOTSTRAP_SUPER_ADMIN_UIDS` — uniquement le temps du J+1.

### 3. Configurer les secrets Supabase (Edge Functions)

```bash
supabase login
supabase link --project-ref <ref>
supabase secrets set \
  ALLOWED_ORIGINS=https://cakenews.app \
  VAPID_PRIVATE_KEY=… \
  VAPID_SUBJECT=mailto:ops@cakenews.app \
  APNS_TEAM_ID=… APNS_KEY_ID=… APNS_PRIVATE_KEY="$(cat AuthKey.p8)" \
  APNS_BUNDLE_ID=app.cakenews.app \
  FCM_PROJECT_ID=… FCM_SERVICE_ACCOUNT="$(cat sa.json)"
supabase functions deploy delete-account export-user-data healthcheck send-push
```

### 4. Appliquer les migrations DB

```bash
supabase db push
psql "$DATABASE_URL" < supabase/seed.sql   # facultatif : 3 articles d'amorce
```

Vérifier les crons :

```sql
select jobname, schedule from cron.job order by jobname;
-- attendu : audit-log-gc, cake-healthcheck-poll, rate-limit-gc
```

### 5. Wiring Sentry

1. Créer un projet `cakenews-web` sur sentry.io.
2. Copier le DSN dans `VITE_SENTRY_DSN`.
3. Définir des règles d'alerte P0 sur :
   * niveau `error` > 5 / minute pendant 5 min.
   * crashes free rate < 99 %.

### 6. Build natif iOS/Android

Le code Capacitor est prêt mais `ios/` et `android/` sont
gitignorés (générés localement par chaque mainteneur).

```bash
npm install
npm run build
npx cap add ios
npx cap add android
npx cap sync

# iOS
open ios/App/App.xcworkspace
# Xcode : Signing & Capabilities → Team, Push Notifications,
# Background Modes (Remote notifications), Background fetch.
# Archive → Distribute App → TestFlight.

# Android
npx cap open android
# Android Studio : Build → Generate Signed Bundle → AAB → Internal track.
```

Splash + icônes : utiliser `npx @capacitor/assets generate --assetPath
resources` après avoir mis un logo 1024×1024 dans `resources/icon.png`.

## Au moment du lancement (J0)

1. `vercel --prod` (ou push sur `main` si auto-deploy).
2. Vérifier que l'URL prod sert le bon SHA git dans le footer admin.
3. Lancer la suite E2E contre l'URL prod :
   `CAKE_BASE_URL=https://cakenews.app npm run e2e`.
4. Tester un signup, un like, un commentaire, un export GDPR sur un
   compte de test réel.
5. Surveiller Sentry pendant 30 min — aucune nouvelle erreur P0.

## J+1 : durcissement

1. Retirer `VITE_BOOTSTRAP_SUPER_ADMIN_UIDS` des env vars Vercel.
2. Re-deploy : `vercel --prod`.
3. Vérifier en DB que les SUPER_ADMIN existent toujours :
   `select uid, role from public.users where role = 'SUPER_ADMIN';`.
4. Révoquer le PAT GitHub `github_pat_11A5Q4QGY0nciNqG72uCNA_…` (en
   créer un nouveau avec scope `workflow` si futur usage).

## Routine post-go-live

* **Tous les lundis** : vérifier le tableau `health_snapshots` —
  aucune dégradation > 5 min sans alerte triagée.
* **Tous les mois** : exécuter le runbook rollback en blanc sur
  staging pour confirmer que la procédure fonctionne.
* **Tous les 6 mois** : rotation `SUPABASE_SERVICE_ROLE_KEY` +
  vérification que la clé n'apparaît dans aucun bundle JS.

## Statut des sprints

| Sprint | Sujet                                  | Statut    |
|--------|----------------------------------------|-----------|
| Q      | Rate-limit Edge Functions              | ✅ Mergé  |
| R      | Hygiène prod (mocks, console, leaks)   | ✅ Mergé  |
| S      | Sécurité backend (CHECK, send-push)    | ✅ Mergé  |
| T      | Observabilité (Sentry, release SHA)    | ✅ Mergé  |
| U      | CI + runbook                           | ✅ Mergé  |
| V      | Performance + offline                  | ✅ Mergé  |
| W      | A11y (clavier, toggles, tap targets)   | ✅ Mergé  |
| X      | E2E a11y + feed keyboard               | ✅ Mergé  |
| Y      | Capacitor natif (iOS/Android)          | ⏳ Manuel |
| Z      | Stress final + Go-Live                 | ⏳ Manuel |

## Critères Go-Live (12)

| # | Critère                                                  | État    |
|---|----------------------------------------------------------|---------|
| 1 | CI verte (lint+tsc+vitest+playwright+build) sur `main`   | ⏳ après step 1 |
| 2 | Sentry actif staging+prod, alertes P0                    | ⏳ après step 5 |
| 3 | E2E auth-gated (auth, feed, comment, like, RLS reject)   | ⏳ seed |
| 4 | Aucun `console.*` direct, aucun import `mockData` prod   | ✅      |
| 5 | SW précache bundle + cache 8 derniers articles           | ✅      |
| 6 | Toggles a11y, navigation clavier, Lighthouse ≥ 95        | ✅ code · ⏳ audit |
| 7 | CHECK length + send-push validation                      | ✅      |
| 8 | Runbook rollback testé en blanc                          | ⏳ Z    |
| 9 | `BOOTSTRAP_SUPER_ADMIN_UIDS` vidé J+1                    | ⏳ J+1  |
| 10| `audit_log_gc` actif, rétention 13 mois                  | ✅      |
| 11| Builds iOS + Android passent en CI, push réel testé      | ⏳ Y    |
| 12| Tag `v1.0.0`, release notes, page status publique        | ⏳ Z    |
