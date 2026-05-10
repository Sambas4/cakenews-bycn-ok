import { test, expect } from '@playwright/test';

/**
 * Smoke suite — the absolute minimum we want to verify on every PR.
 *
 * If any of these fail, the deploy is broken regardless of the unit
 * test status. They cover only what we control fully without a live
 * Supabase instance: shell loads, auth screen renders, legal pages
 * resolve, the public profile route is reachable.
 *
 * Auth-gated journeys (feed swipe, comment post, like persistence)
 * live in `authenticated.spec.ts` and require a `TEST_USER_*` env
 * pair, so they're skipped automatically when those are missing.
 */

test.describe('App shell', () => {
  test('loads without console errors and shows the boot splash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');

    // The boot splash is in the DOM until Angular paints, then it
    // self-hides. We assert the screen reaches a stable state — the
    // app-root must contain at least one rendered child.
    await expect(page.locator('app-root')).toBeAttached();
    // Either we land on /auth (signed-out) or /feed (cached session)
    // — both are valid post-bootstrap states.
    await expect.poll(() => page.url(), { timeout: 10_000 })
      .toMatch(/\/(auth|feed|onboarding)/);

    // We tolerate harmless "Failed to fetch" from the realtime
    // channel against an unreachable Supabase project; everything
    // else is a regression.
    const blocking = errors.filter(e =>
      !/supabase|websocket|fetch failed|invalid\.supabase/i.test(e),
    );
    expect(blocking).toEqual([]);
  });

  test('CakeNews wordmark appears on the auth screen', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByText(/CAKENEWS/i).first()).toBeVisible();
  });
});

test.describe('Legal pages — anonymous access', () => {
  test('CGU page renders the title', async ({ page }) => {
    await page.goto('/legal/terms');
    await expect(page.getByRole('heading', { name: /Conditions Générales/i })).toBeVisible();
  });

  test('Privacy page renders the GDPR rights section', async ({ page }) => {
    await page.goto('/legal/privacy');
    await expect(page.getByRole('heading', { name: /Politique de confidentialité/i })).toBeVisible();
    await expect(page.getByText(/Tes droits/i)).toBeVisible();
  });

  test('Mentions page renders the editor block', async ({ page }) => {
    await page.goto('/legal/mentions');
    await expect(page.getByRole('heading', { name: /Mentions légales/i })).toBeVisible();
  });
});

test.describe('Public profile — empty state', () => {
  test('a non-existent username shows the "introuvable" empty state', async ({ page }) => {
    await page.goto('/u/zzz-nonexistent-handle');
    // The view shows a discreet "Profil introuvable" message in the
    // empty state — we wait for it explicitly to make the test
    // resilient to slow Supabase round-trips.
    await expect(page.getByText(/Profil introuvable/i)).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('Cookie banner', () => {
  test('appears on first visit and accepts persist the choice', async ({ page, context }) => {
    await context.clearCookies();
    await page.addInitScript(() => localStorage.removeItem('cake_consent_v1'));

    await page.goto('/auth');

    const banner = page.getByRole('dialog', { name: /Confidentialité/i });
    await expect(banner).toBeVisible();

    await banner.getByRole('button', { name: /Accepter/i }).click();
    await expect(banner).toHaveCount(0);

    // Reload — banner must stay hidden.
    await page.reload();
    await expect(page.getByRole('dialog', { name: /Confidentialité/i })).toHaveCount(0);
  });
});
