# Backend — Supabase

Production data layer for CakeNews. This folder is the source of
truth for the database schema, the row-level security model, the
atomic stored procedures and the Edge Functions.

## Layout

```
supabase/
├── migrations/
│   ├── 0001_initial_schema.sql      Tables, ENUMs, triggers
│   ├── 0002_row_level_security.sql  RLS policies
│   └── 0003_atomic_rpc.sql          Like / vibe / comment RPCs
├── functions/
│   ├── delete-account/index.ts      Hard-delete the auth row + cascade
│   └── send-push/index.ts           Web Push fan-out (VAPID)
└── README.md
```

## First-time setup

You need the **Supabase CLI** (`brew install supabase/tap/supabase`
or [other install methods](https://supabase.com/docs/guides/cli)).

```bash
# 1) Link the local repo to the remote project. The project ref is
#    the slug visible in the dashboard URL.
supabase link --project-ref <PROJECT_REF>

# 2) Apply migrations + functions in one shot.
supabase db push
supabase functions deploy delete-account
supabase functions deploy export-user-data
supabase functions deploy healthcheck
supabase functions deploy send-push

# 3) Wire VAPID keys for web push (one-time).
#    Generate with `npx web-push generate-vapid-keys`.
supabase secrets set \
  VAPID_PUBLIC_KEY='BPub...' \
  VAPID_PRIVATE_KEY='priv...' \
  VAPID_SUBJECT='mailto:ops@cakenews.app'

# 4) Mirror the public VAPID key on the client so it can subscribe.
echo 'VITE_VAPID_PUBLIC_KEY=BPub...' >> .env.local

# 5) (Optional) Apple Push Notification service for the iOS native app.
#    Create a .p8 key in the Apple Developer portal (Certificates,
#    Identifiers & Profiles → Keys → APNs). The `APNS_PRIVATE_KEY` value
#    is the full PEM content of that .p8 file.
supabase secrets set \
  APNS_TEAM_ID='ABCDE12345' \
  APNS_KEY_ID='FGHIJ67890' \
  APNS_PRIVATE_KEY="$(cat AuthKey_FGHIJ67890.p8)" \
  APNS_BUNDLE_ID='app.cakenews.app'
#    Add APNS_USE_SANDBOX='1' for TestFlight builds.

# 6) (Optional) Firebase Cloud Messaging for the Android native app.
#    Generate a service-account JSON in the Firebase console
#    (Project settings → Service accounts → Generate new private key).
supabase secrets set \
  FCM_PROJECT_ID='cakenews-prod' \
  FCM_SERVICE_ACCOUNT="$(cat firebase-admin.json)"

# 7) Wire the healthcheck self-poll URL. Migration 0006 schedules a
#    `pg_cron` job at 1-minute cadence that calls this URL and writes
#    the response into `health_snapshots`. Without this GUC the cron
#    silently no-ops, which is fine in dev.
psql "$DATABASE_URL" -c "alter database postgres set app.healthcheck_url = 'https://<PROJECT_REF>.supabase.co/functions/v1/healthcheck';"
```

The migrations are idempotent on a clean database; if you run them
against an existing one, drop the dev branch first
(`supabase db reset` in a sandbox) — or open a follow-up migration
that ALTERs into the new shape.

## What lives where

| Concern                | Location                                     |
|------------------------|----------------------------------------------|
| Tables, enums, triggers| `migrations/0001_initial_schema.sql`         |
| Row-level security     | `migrations/0002_row_level_security.sql`     |
| Atomic counters & RPCs | `migrations/0003_atomic_rpc.sql`             |
| Push fan-out           | `functions/send-push/index.ts`               |
| Hard-delete account    | `functions/delete-account/index.ts`          |

## Role JWT custom claim

`public.users.role` is mirrored into `auth.users.raw_app_meta_data.role`
by the `tg_users_role_to_jwt` trigger declared at the bottom of
`0001_initial_schema.sql`. RLS policies in `0002` read that claim via
`fn_jwt_role()` so the database never has to join when checking
permissions. Sessions pick up the change on next refresh — call
`supabase.auth.refreshSession()` from the client after a role
update if you need it immediately.

## Why every counter goes through an RPC

The v2 client did `select likes; update set likes = likes + 1`. Under
two concurrent requests this loses one increment — visibly so on a
breaking news that pushes hundreds of likes per second. Postgres can
serialise the operation for us, **but only if the increment lives in
a single statement.** That is what `adjust_article_likes`,
`vote_article_vibe` and `post_article_comment` give you.

The Angular `DataService.adjustLikes(...)` / `updateVibe(...)` are
wired to expose the same shape to the rest of the app, but should
be migrated to call these RPCs once the database is in place. See
the `IArticleApi` adapter in the Phase-2.4 follow-up.

## Audit log

Every privileged action that goes through an Edge Function should
end with:

```sql
select public.audit_log(
  p_actor       => current_setting('request.jwt.claims', true)::jsonb->>'sub',
  p_action      => 'whatever_you_just_did',
  p_target_type => 'ARTICLE',
  p_target_id   => some_uuid,
  p_payload     => jsonb_build_object(...)
);
```

The function is `security definer` and grant-restricted, so client
code cannot tamper with the log.
