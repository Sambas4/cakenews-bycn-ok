# CI workflow — adding the Playwright job

Same constraint as the original CI install: the dev-loop PAT does
not have GitHub's `workflow` scope, so this YAML cannot be pushed
through the normal commit pipeline. Update the file directly via
the GitHub UI or a maintainer push from a workflow-scoped session.

## Action

Replace the existing `.github/workflows/ci.yml` with the content
below. The diff vs. the original install:

- A second job `e2e` runs after the unit job, only on the main
  pipeline (PRs and `main` pushes). Failures don't block the unit
  job — both gate the merge independently so reviewers see exactly
  which layer broke.
- The Playwright browser binaries are cached so subsequent runs
  cost a single `npm ci` step.
- Cancellation concurrency stays scoped to the ref, so a rapid
  push only kills its own run.

## YAML

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  unit:
    name: lint · test · build
    runs-on: ubuntu-latest
    timeout-minutes: 12
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm

      - name: Install
        run: npm ci --prefer-offline --no-audit --no-fund

      - name: Type-check
        run: npm run lint

      - name: ESLint
        run: npm run lint:eslint -- --max-warnings 250

      - name: Unit tests
        run: npm test

      - name: Production build
        run: npm run build

      - name: Bundle report
        if: always()
        run: |
          {
            echo "## Bundle sizes"
            echo
            ls -lh dist/assets/*.js 2>/dev/null | awk '{print "- " $5 " — " $NF}' | sort
          } >> "$GITHUB_STEP_SUMMARY"

  e2e:
    name: playwright smoke
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: unit
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm

      - name: Install
        run: npm ci --prefer-offline --no-audit --no-fund

      # Cache the Playwright browser binaries so re-runs are cheap.
      - name: Cache Playwright browsers
        id: playwright-cache
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

      - name: Install Playwright browsers
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps chromium

      - name: Run E2E smoke tests
        run: npm run e2e
        env:
          CI: 'true'

      - name: Upload Playwright report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

## Once installed

Delete this doc. The CI definition will be the single source of
truth in `.github/workflows/ci.yml`.
