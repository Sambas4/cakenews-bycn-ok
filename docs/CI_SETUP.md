# CI setup

Continuous Integration runs on every pull request and on every push to
`main`. The workflow itself lives at `.github/workflows/ci.yml` once
installed — the **template** is in this folder
(`docs/ci-workflow.yml.template`) because the PATs we use during
development do not have GitHub's `workflow` scope, which is required
to create files under `.github/workflows/`.

## One-time installation

A repository maintainer needs to add the workflow once. Three paths,
pick one:

1. **GitHub UI**
   - Open the repo on github.com → **Add file → Create new file**.
   - Name it `.github/workflows/ci.yml` (typing the slashes creates
     the folders for you).
   - Paste the content of `docs/ci-workflow.yml.template`.
   - Commit on `main` (or on the working branch, then merge).

2. **Local push with a `workflow`-scoped token**
   ```bash
   mkdir -p .github/workflows
   cp docs/ci-workflow.yml.template .github/workflows/ci.yml
   git add .github/workflows/ci.yml
   git commit -m "ci: add lint · test · build workflow"
   git push
   ```
   The GitHub PAT (or fine-grained token) needs the `workflow` scope.

3. **Once installed, the template can be deleted.**
   ```bash
   rm docs/ci-workflow.yml.template docs/CI_SETUP.md
   ```

## What the workflow does

- `npm ci` (with the lockfile, prefer-offline, no audit/fund).
- `npm run lint` — `tsc --noEmit`.
- `npm run lint:eslint -- --max-warnings 250` — the warning ceiling
  captures the current legacy debt so PRs cannot raise it.
- `npm test` — vitest run, currently 17 algorithm specs.
- `npm run build` — production Vite build.
- A bundle-size summary is appended to the run output so reviewers
  spot regressions instantly.

Concurrency is configured so a new push to the same ref cancels the
previous CI run automatically.
