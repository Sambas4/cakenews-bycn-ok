# Runbook — exploitation CakeNews

Ce runbook décrit les procédures à exécuter en réponse aux incidents
les plus probables. Toutes les opérations destructrices exigent un
double pair-review et un horodatage dans le journal d'astreinte.

## Pré-requis opérateur

| Outil          | Pourquoi                                          |
|----------------|---------------------------------------------------|
| `gh` CLI       | Revert d'une release / réouverture d'une PR       |
| `supabase` CLI | Inspection migrations, rollback DB, push secrets  |
| `psql`         | Audit ad-hoc, repair manuel hors migration        |
| Accès Vercel   | Promotion / rollback d'un build statique         |
| Accès Sentry   | Triage erreurs en live                            |

## 1. Détection d'incident

* Sentry → alertes P0 → channel Slack `#cakenews-ops`.
* `/admin → Audit → Santé` affiche les snapshots `health_snapshots` du
  cron `cake-healthcheck-poll`. Une régression > 5 min sans retour à
  `ok` déclenche l'incident.
* `audit_log` sur Postgres : `select * from admin_audit_log order by
  created_at desc limit 50;` pour comprendre la dernière action
  privilégiée avant le crash.

## 2. Rollback web (Vercel)

1. Identifier le dernier déploiement sain :
   `vercel list cakenews --prod | head -10`.
2. Promouvoir le précédent :
   `vercel promote <deployment-id> --scope cakenews`.
3. Vérifier que le bundle servi a bien changé :
   `curl -sI https://cakenews.app | grep x-vercel-id`.
4. Annoncer la promotion dans `#cakenews-ops` avec le SHA git du build
   précédent (visible dans le footer admin et dans Sentry).

Temps cible : < 5 minutes.

## 3. Rollback DB (migration cassante)

Les migrations sont numérotées et idempotentes (toutes commencent par
`drop constraint if exists`, `create or replace function`, etc.). Le
plus souvent il suffit de pousser une migration descendante :

1. Identifier la migration fautive :
   `select * from supabase_migrations.schema_migrations order by version desc limit 5;`
2. Préparer une migration `00XX_rollback_YYYY.sql` qui annule la
   modification (ex. `alter table … drop constraint`).
3. Exécuter `supabase db push --linked` (ou via le pipeline release).
4. Si la migration a effacé des données : restaurer depuis le PITR
   Supabase (`Dashboard → Database → Point-in-time Recovery`). Le PITR
   couvre 7 jours par défaut sur l'offre Pro.

⚠ Ne JAMAIS `drop table` en production. Toujours `rename to xxx_old`
puis vérifier sous 24h avant suppression.

## 4. Incident sévère (compromission ou fuite)

1. **Couper les accès** :
   * `supabase secrets unset SUPABASE_SERVICE_ROLE_KEY` puis régénérer
     depuis le dashboard.
   * Forcer le logout global :
     `update auth.users set updated_at = now();` (invalide les JWT
     avec un `iat` antérieur — le SDK redemande l'auth).
2. **Bloquer les utilisateurs suspects** :
   `update public.users set status = 'BANNED' where uid in (…);`
3. **Auditer** : exporter `admin_audit_log` et `rate_limits` sur la
   fenêtre concernée, archiver en bucket privé.
4. **Communiquer** : préparer une notification CNIL si > 72 h, sinon
   un email transactionnel via la fonction `send-push` audience
   `'all'` une fois la fuite confinée.

## 5. Vidage du `BOOTSTRAP_SUPER_ADMIN_UIDS`

À effectuer **J+1** après le premier déploiement production :

1. `supabase dashboard → Project Settings → Environment Variables` (côté
   Vercel pour le bundle Vite) : retirer la valeur de
   `VITE_BOOTSTRAP_SUPER_ADMIN_UIDS`.
2. Re-build et redeploy : `vercel --prod`.
3. Vérifier que le SHA git en footer admin a changé.
4. Confirmer que les SUPER_ADMIN existent toujours en DB :
   `select uid, email, role from public.users where role = 'SUPER_ADMIN';`

## 6. Cron en panne

`select * from cron.job;` doit lister :

* `cake-healthcheck-poll` (* * * * *)
* `rate-limit-gc`        (17 * * * *)
* `audit-log-gc`         (23 3 1 * *)

Pour ré-activer un job retiré :
```sql
select cron.schedule('cake-healthcheck-poll', '* * * * *',
                     $$select public.cron_record_health()$$);
```

## 7. Suite à un rate-limit en masse

Si Sentry alerte sur un pic de 429 légitime (lancement viral) :

1. Augmenter temporairement le budget dans la table `rate_limits` ou,
   plus propre, redéployer `send-push`/`export-user-data` avec un
   `max` plus élevé.
2. Communiquer aux utilisateurs via le ticker (broadcast type `INFO`).

## 8. Recommandations permanentes

* Tagger chaque release en Git (`v1.x.y`) et synchroniser avec le
  champ `release` Sentry.
* Tester ce runbook en blanc à chaque trimestre — un runbook non
  testé est un placebo.
* Mettre à jour ce fichier dès qu'une nouvelle procédure est apprise
  en post-mortem.
