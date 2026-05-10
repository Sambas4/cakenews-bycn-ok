# E2E tests — Playwright

End-to-end coverage on top of the 73 unit specs. Where Vitest locks
the algorithm and the service contracts in isolation, Playwright
verifies the user journey end-to-end against a real browser engine.

## What's covered today

`tests/e2e/smoke.spec.ts` — minimum-viable suite that runs on every
PR through GitHub Actions:

- App shell loads without console errors and reaches a stable post-
  bootstrap URL (`/auth`, `/feed` or `/onboarding`).
- The CakeNews wordmark appears on the auth screen.
- The three legal pages (`/legal/terms`, `/legal/privacy`,
  `/legal/mentions`) render their canonical headings.
- A non-existent public profile shows the "introuvable" empty state.
- The cookie banner appears on first visit and persists the user's
  choice across reloads.

## What's intentionally *not* covered

Auth-gated journeys (feed swipe, comment post, like persistence,
admin moderation) require either a seeded Supabase project or a
mocked auth backend. They live in `authenticated.spec.ts` once
those preconditions are wired — the placeholder file is on
purposefully kept TODO so the suite stays green in environments
without test credentials.

## Running locally

```bash
# 1) One-time browser install. Chromium only by default — add
#    `firefox` and `webkit` if you need cross-browser coverage.
npm run e2e:install

# 2) Run the suite. Playwright spins up `npm run dev` if no server is
#    already listening on :3000. Re-uses an existing server if you
#    keep `npm run dev` open in another terminal.
npm run e2e

# 3) Interactive UI mode — pick individual tests, debug with the
#    inspector, view trace files inline.
npm run e2e:ui
```

By default the mobile viewport (`iPhone 14`) project runs first.
Add `--project=desktop` to also exercise the 1280×800 layout:

```bash
npx playwright test --project=desktop
```

## Running against a remote environment

Set `CAKE_BASE_URL` to your staging URL. Playwright will skip the
auto-start of the dev server.

```bash
CAKE_BASE_URL=https://staging.cakenews.app npm run e2e
```

## CI integration

Add a job to `.github/workflows/ci.yml` once the suite is wider than
the smoke set — see PR description. The intermediate step requires
caching the Playwright browser binaries:

```yaml
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: E2E
  run: npm run e2e
  env:
    CI: 'true'
```

## Why these boundaries

- **`fullyParallel: true`** — every spec is independent so we can
  saturate CI cores.
- **`retries: 2` on CI** — flaky network calls get a second chance
  but green-on-retry is logged in the GitHub annotations so we can
  hunt root causes.
- **`trace: 'on-first-retry'`** — green runs stay cheap; the trace
  zip lands in the artifacts only when something actually misfired.
- **No screenshots-as-baseline** — visual regression is its own
  beast; we keep this suite about behaviour, not pixels.
