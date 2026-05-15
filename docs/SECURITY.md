# Security Posture

This document captures the security stance for the production deployment of
CakeNews. Treat it as the source of truth when configuring the staging /
production Supabase projects, the static-site CDN and the Capacitor mobile
shells.

## CORS allowlist

Every Edge Function under `supabase/functions/*` builds its CORS headers
through the shared helper in `supabase/functions/_shared/cors.ts`. The helper
reads the `ALLOWED_ORIGINS` secret — a comma-separated list of
fully-qualified origins (no trailing slash) — and echoes the request's
`Origin` back when it matches the list.

* When the secret is empty (local `supabase functions serve`), the helper
  falls back to `*` and logs a warning to the function log so the slip is
  visible in CI.
* In production, set the allowlist before exposing the function. Example:

  ```bash
  supabase secrets set \
    ALLOWED_ORIGINS=https://cakenews.app,https://staging.cakenews.app
  ```

* Every response carries `Vary: Origin` so CDNs cache per-origin and a
  cross-origin browser cannot reuse a cached response from another tenant.
* Unknown origins receive `Access-Control-Allow-Origin: null`, which fails
  the browser CORS check cleanly without leaking which origins are allowed.

The four Edge Functions audited under Sprint K:

| Function          | Methods       | Auth                             |
|-------------------|---------------|----------------------------------|
| `delete-account`  | `POST`        | Authenticated user (bearer JWT)  |
| `export-user-data`| `POST`        | Authenticated user (bearer JWT)  |
| `healthcheck`     | `GET`         | Public                           |
| `send-push`       | `POST`        | Service role **or** staff role   |

## Rate limiting

Privileged Edge Functions throttle calls through the Postgres RPC
`public.rate_limit_consume(key, max, window_seconds)` introduced in
migration `0007_rate_limits.sql`. The RPC is fixed-window, fails open
(returns `allowed = true`) if Postgres is unreachable, and self-prunes
hourly via `pg_cron`.

| Function          | Key                       | Budget              |
|-------------------|---------------------------|---------------------|
| `delete-account`  | `delete-account:<uid>`    | 3 per hour          |
| `export-user-data`| `export-user-data:<uid>`  | 3 per day           |
| `send-push`       | `send-push:<uid>`         | 30 per hour (staff) |

The `send-push` service-role path is *not* rate-limited — scheduled
cron jobs and the digest mailer need unbounded access. Editor abuse via
an admin session is the realistic threat we're guarding against.

Denied requests return `429 Too Many Requests` with a `Retry-After`
header (seconds) so the client can back off without polling.

## Content Security Policy

The SPA ships with a strict CSP (see `index.html` / `vercel.json`). Key
directives:

* `default-src 'self'` — no inline scripts or styles by default.
* `img-src 'self' data: https://api.dicebear.com https://*.supabase.co` —
  avatars come from DiceBear, article media from Supabase Storage.
* `connect-src 'self' https://*.supabase.co wss://*.supabase.co
  https://*.sentry.io` — required for REST, realtime channels and Sentry.
* `frame-ancestors 'none'` — clickjacking protection.

When integrating a new third-party domain, update both `index.html` and the
Vercel header config in a single commit so the policy stays in sync between
preview and prod.

## Headers shipped with the SPA

Configured in `vercel.json`:

* `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
* `X-Content-Type-Options: nosniff`
* `Referrer-Policy: strict-origin-when-cross-origin`
* `Permissions-Policy: camera=(), microphone=(), geolocation=()`
* `X-Frame-Options: DENY`

## Auth & RLS

* All client traffic uses the **anon** key. RLS policies are the only thing
  separating tenants.
* Service-role usage is restricted to Edge Functions and never shipped to
  the browser.
* Role membership is read from `auth.users.app_metadata.role` (server-side
  only) so a compromised client cannot self-promote.

## Secret rotation

| Secret                       | Rotate every | Owner       |
|------------------------------|--------------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY`  | 180 days     | Platform    |
| `VAPID_PRIVATE_KEY`          | 365 days     | Platform    |
| `APNS_PRIVATE_KEY` (.p8)     | 365 days     | iOS owner   |
| `FCM_SERVICE_ACCOUNT`        | 180 days     | Android     |
| `GEMINI_API_KEY`             | 90 days      | Editorial   |

Document each rotation in the engineering log with timestamp and operator.

## Incident response

* `audit_log` captures every privileged action with actor, target, payload.
* `health_snapshots` is populated by `pg_cron` and surfaced in the admin
  AUDIT tab for retro-incident analysis.
* Sentry (or compatible) DSN is wired via `SENTRY_DSN` — when set, the SPA
  reports JS exceptions and unhandled promise rejections.
