import { describe, it, expect, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CohortEngineService, CohortBucket } from './cohort-engine.service';
import { AuthService } from './auth.service';

declare const ensureTestBed: () => void;

class StubAuth {
  user = signal<{ id: string } | null>(null);
  currentUser() { return this.user(); }
}

function setup() {
  ensureTestBed();
  const auth = new StubAuth();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      CohortEngineService,
      { provide: AuthService, useValue: auth },
    ],
  });
  const svc = TestBed.inject(CohortEngineService);
  return { svc, auth };
}

describe('CohortEngineService — bucketing', () => {
  let env = setup();
  beforeEach(() => { env = setup(); });

  it('produces a stable bucket for the same UID', () => {
    const a = env.svc.bucketFor('user-123');
    const b = env.svc.bucketFor('user-123');
    expect(a).toBe(b);
  });

  it('distributes UIDs across multiple buckets in a small sample', () => {
    const seen = new Set<CohortBucket>();
    for (let i = 0; i < 200; i++) seen.add(env.svc.bucketFor(`user-${i}`));
    expect(seen.size).toBeGreaterThan(1);
  });

  it('weights match the bucket variant table', () => {
    // We cycle through deterministic UIDs to reach each bucket. We
    // assert the weight invariants per bucket without binding to a
    // specific UID-to-bucket mapping.
    const seenWeights: Record<CohortBucket, ReturnType<typeof env.svc.weights>> = {} as never;
    for (let i = 0; i < 50; i++) {
      env.auth.user.set({ id: `seed-${i}` });
      const b = env.svc.bucket();
      seenWeights[b] = env.svc.weights();
    }
    if (seenWeights.A) {
      expect(seenWeights.A.fit).toBe(1);
      expect(seenWeights.A.recency).toBe(1);
    }
    if (seenWeights.B) {
      expect(seenWeights.B.velocity).toBeGreaterThan(1);
      expect(seenWeights.B.exploreEpsilon).toBeLessThan(0.22);
    }
    if (seenWeights.C) {
      expect(seenWeights.C.novelty).toBeGreaterThan(1);
      expect(seenWeights.C.exploreEpsilon).toBeGreaterThan(0.22);
    }
    if (seenWeights.D) {
      expect(seenWeights.D.recency).toBeGreaterThan(1);
      expect(seenWeights.D.fit).toBeLessThan(1);
    }
  });

  it('viralBoostFor is deterministic and bounded in [0, 0.25]', () => {
    env.auth.user.set({ id: 'a-uid' });
    const boost = env.svc.viralBoostFor('article-xyz');
    expect(boost).toBeGreaterThanOrEqual(0);
    expect(boost).toBeLessThanOrEqual(0.25);
    expect(env.svc.viralBoostFor('article-xyz')).toBe(boost);
  });
});
