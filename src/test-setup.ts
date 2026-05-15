/**
 * Global test setup.
 *
 * `@angular/compiler` is imported eagerly so JIT decorators in services
 * we instantiate via `TestBed` work — without this import, any
 * `@Injectable` we touch throws "JIT compilation failed".
 *
 * `localStorage.clear()` runs before each test so cached envelopes
 * from one suite don't leak into the next.
 */
import '@angular/compiler';
import { beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

// One-time: initialise the Angular testing platform. Subsequent calls
// no-op because TestBed is process-wide. We do this lazily so suites
// that don't need TestBed at all (pure functions) don't pay the cost.
let initialised = false;
function ensureTestBed() {
  if (initialised) return;
  TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting(), {
    teardown: { destroyAfterEach: true },
  });
  initialised = true;
}

(globalThis as unknown as { ensureTestBed: () => void }).ensureTestBed = ensureTestBed;

beforeEach(() => {
  try { localStorage.clear(); } catch { /* ignore */ }
});
