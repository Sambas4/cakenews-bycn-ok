import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ConsentService, CURRENT_POLICY_VERSION } from './consent.service';

declare const ensureTestBed: () => void;

function setup() {
  ensureTestBed();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [ConsentService] });
  return { svc: TestBed.inject(ConsentService) };
}

describe('ConsentService', () => {
  let env = setup();
  beforeEach(() => { env = setup(); });

  it('starts in pending state for a fresh visitor', () => {
    expect(env.svc.decision()).toBe('pending');
    expect(env.svc.needsDecision()).toBe(true);
    expect(env.svc.analyticsAllowed()).toBe(false);
  });

  it('accept() opens analytics + persists the decision', () => {
    env.svc.accept();
    expect(env.svc.decision()).toBe('accepted');
    expect(env.svc.analyticsAllowed()).toBe(true);
    expect(env.svc.needsDecision()).toBe(false);

    // Reload — decision should survive.
    const env2 = setup();
    expect(env2.svc.decision()).toBe('accepted');
  });

  it('reject() closes analytics but persists', () => {
    env.svc.reject();
    expect(env.svc.decision()).toBe('rejected');
    expect(env.svc.analyticsAllowed()).toBe(false);
    expect(env.svc.needsDecision()).toBe(false);
  });

  it('re-prompts when the policy version is bumped', () => {
    // Simulate an older policy version saved in storage.
    localStorage.setItem('cake_consent_v1', JSON.stringify({
      decision: 'accepted',
      decidedAt: Date.now() - 1_000_000,
      policyVersion: 0,
    }));
    const env2 = setup();
    expect(CURRENT_POLICY_VERSION).toBeGreaterThan(0);
    expect(env2.svc.needsDecision()).toBe(true);
  });

  it('revoke() resets the state for a fresh prompt', () => {
    env.svc.accept();
    env.svc.revoke();
    expect(env.svc.decision()).toBe('pending');
    expect(env.svc.needsDecision()).toBe(true);
  });
});
