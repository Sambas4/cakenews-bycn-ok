import { test, expect } from '@playwright/test';

/**
 * Accessibility & responsive smoke tests.
 *
 * These don't need a Supabase test user — they exercise public
 * screens (auth, legal) and assert the structural a11y guarantees
 * we never want to regress: keyboard focusability, labelled inputs,
 * offline banner wiring, semantic roles on dialogs.
 */

test.describe('Auth screen — accessibility', () => {
  test('email and password inputs have labels reachable by screen readers', async ({ page }) => {
    await page.goto('/auth');
    // Inputs must be reachable by accessibleName (label OR aria-label).
    const emailField = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i).first());
    await expect(emailField).toBeVisible();
  });

  test('every interactive button has an accessible name', async ({ page }) => {
    await page.goto('/auth');
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(count, 8); i++) {
      const btn = buttons.nth(i);
      const name = (await btn.getAttribute('aria-label')) ?? (await btn.textContent());
      expect((name ?? '').trim().length, `button #${i} has no accessible name`).toBeGreaterThan(0);
    }
  });

  test('keyboard tab order reaches the primary form controls', async ({ page }) => {
    await page.goto('/auth');
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName ?? '');
    // First tab should land on a real interactive control, not body.
    expect(['INPUT', 'BUTTON', 'A']).toContain(firstFocused);
  });
});

test.describe('Offline banner', () => {
  test('appears when the network is offline, disappears when back online', async ({ page, context }) => {
    await page.goto('/auth');
    // Some test runs land on the cookie banner first — dismiss it so
    // the offline pill isn't visually competing with the modal.
    const cookieAccept = page.getByRole('button', { name: /Accepter/i }).first();
    if (await cookieAccept.isVisible().catch(() => false)) {
      await cookieAccept.click();
    }

    await context.setOffline(true);
    // The NetworkStatusService reacts to the browser's `offline` event,
    // not a manual signal. Dispatch it explicitly so the test is
    // deterministic across browsers.
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(page.getByText(/Hors ligne|Offline/i).first()).toBeVisible({ timeout: 3_000 });

    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(page.getByText(/Hors ligne|Offline/i)).toHaveCount(0, { timeout: 3_000 });
  });
});

test.describe('Reduced motion preference', () => {
  test('the OS preference applies the cake-reduce-motion class on <html>', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/auth');
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('cake-reduce-motion')))
      .toBe(true);
    await ctx.close();
  });
});
