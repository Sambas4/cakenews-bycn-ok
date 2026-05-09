import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TrustService } from './trust.service';

declare const ensureTestBed: () => void;

function setup() {
  ensureTestBed();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [TrustService] });
  return { svc: TestBed.inject(TrustService) };
}

describe('TrustService', () => {
  let env = setup();
  beforeEach(() => { env = setup(); });

  it('starts at the neutral baseline of 100', () => {
    expect(env.svc.score()).toBe(100);
    expect(env.svc.tier()).toBe('Confirmé');
  });

  it('applies the default delta for known event kinds', () => {
    env.svc.record('IDENTITY_VERIFIED');
    expect(env.svc.score()).toBe(120);

    env.svc.record('GOOD_REPORT');
    expect(env.svc.score()).toBe(125);

    env.svc.record('BAD_REPORT');
    expect(env.svc.score()).toBe(122);
  });

  it('floors at 0 and ceils at 200', () => {
    for (let i = 0; i < 30; i++) env.svc.record('IDENTITY_VERIFIED');
    expect(env.svc.score()).toBe(200);

    env.svc.clear();
    for (let i = 0; i < 30; i++) env.svc.record('COMMENT_REPORTED');
    expect(env.svc.score()).toBe(0);
  });

  it('tier label tracks the aggregated score', () => {
    env.svc.clear();
    for (let i = 0; i < 8; i++) env.svc.record('IDENTITY_VERIFIED');
    expect(env.svc.tier()).toBe('Veilleur');

    env.svc.clear();
    for (let i = 0; i < 5; i++) env.svc.record('COMMENT_REPORTED');
    expect(env.svc.tier()).toBe('Probation');
  });

  it('honours a per-event delta override', () => {
    env.svc.record('DEEP_READ', { delta: 10, reason: 'longread' });
    expect(env.svc.score()).toBe(110);
    expect(env.svc.events()[0]?.reason).toBe('longread');
  });

  it('persists the ledger across reloads', () => {
    env.svc.record('GOOD_REPORT');
    const env2 = setup();
    expect(env2.svc.events()).toHaveLength(1);
    expect(env2.svc.score()).toBe(105);
  });
});
