import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for CakeNews end-to-end tests.
 *
 * Strategy:
 *   * The dev server is started automatically by Playwright when CI
 *     is set; locally you can keep `npm run dev` open in another
 *     terminal and Playwright reuses the existing port.
 *   * One mobile viewport is the default — CakeNews is a mobile-first
 *     PWA and most of the layout is designed at 390×844. Desktop
 *     coverage is opt-in via the `--project` flag.
 *   * Tracing kicks in on the first retry so we don't drown CI in
 *     trace files for green runs.
 *
 * Run locally:
 *   npm run e2e               # all specs, headless
 *   npm run e2e:ui            # interactive UI mode
 *   npx playwright test --project=desktop   # opt into desktop
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: process.env['CI'] ? [['github'], ['list']] : 'list',

  use: {
    baseURL: process.env['CAKE_BASE_URL'] ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'mobile',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Spawn the dev server on demand. We deliberately do NOT auto-start
  // when the env var `CAKE_BASE_URL` points at a remote — handy for
  // running the suite against staging.
  webServer: process.env['CAKE_BASE_URL'] ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
