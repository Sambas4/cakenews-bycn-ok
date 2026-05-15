import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration for CakeNews.
 *
 * Scope: pure-logic services only — algorithm, buffer, breaker,
 * cohort, vibe-signal, etc. We deliberately do **not** mount any
 * Angular component or call `TestBed`: those services are pure data
 * functions and the cheapest way to get high signal is to test them
 * as plain TypeScript modules.
 *
 * `jsdom` is enabled so services that touch `localStorage` / `window`
 * keep working without ad-hoc mocks. `globals: true` exposes the
 * `describe / it / expect / vi` helpers without per-file imports.
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    // The Angular Vite plugin compiles decorators we don't need for
    // these tests; skipping it keeps the harness fast.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/app/services/**/*.ts'],
      exclude: ['src/app/services/**/*.spec.ts'],
    },
    setupFiles: ['src/test-setup.ts'],
  },
});
