import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { NetworkStatusService } from './network-status.service';

declare const ensureTestBed: () => void;

function setup(initialOnline: boolean) {
  ensureTestBed();
  TestBed.resetTestingModule();
  // jsdom defaults `navigator.onLine` to true; we need to override it
  // before instantiation so the constructor reads our value.
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    get: () => initialOnline,
  });
  TestBed.configureTestingModule({ providers: [NetworkStatusService] });
  return { svc: TestBed.inject(NetworkStatusService) };
}

describe('NetworkStatusService', () => {
  let env = setup(true);
  beforeEach(() => { env = setup(true); });

  it('reads navigator.onLine on bootstrap', () => {
    expect(env.svc.isOnline()).toBe(true);
    const offline = setup(false);
    expect(offline.svc.isOnline()).toBe(false);
  });

  it('flips on online / offline events', () => {
    expect(env.svc.isOnline()).toBe(true);
    window.dispatchEvent(new Event('offline'));
    expect(env.svc.isOnline()).toBe(false);
    window.dispatchEvent(new Event('online'));
    expect(env.svc.isOnline()).toBe(true);
  });

  it('updates lastChangeAt on transitions only', () => {
    const t0 = env.svc.lastChangeAt();
    // Same state event — should be ignored.
    window.dispatchEvent(new Event('online'));
    expect(env.svc.lastChangeAt()).toBe(t0);
    // Real transition — should bump.
    window.dispatchEvent(new Event('offline'));
    expect(env.svc.lastChangeAt()).toBeGreaterThanOrEqual(t0);
  });
});
