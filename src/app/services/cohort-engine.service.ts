import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

export type CohortBucket = 'A' | 'B' | 'C' | 'D';

/**
 * Tunable knobs the algorithm reads at scoring time. Different cohorts
 * see different weights — this is how we A/B test ranking variants
 * without shipping branches.
 */
export interface RankingWeights {
  /** Weight applied to the `fit` axis (personal affinity). */
  fit: number;
  /** Weight applied to recency. */
  recency: number;
  /** Weight applied to velocity (rising content). */
  velocity: number;
  /** Weight applied to novelty (unseen categories). */
  novelty: number;
  /** Probability of choosing a probe slot during weaving (ε). */
  exploreEpsilon: number;
}

const DEFAULT_WEIGHTS: RankingWeights = {
  fit: 1.0, recency: 1.0, velocity: 1.0, novelty: 1.0, exploreEpsilon: 0.22,
};

const VARIANTS: Record<CohortBucket, Partial<RankingWeights>> = {
  // Control — published baseline.
  A: {},
  // Velocity-heavy: bigger boost on rising content, lower exploration.
  B: { velocity: 1.5, exploreEpsilon: 0.16 },
  // Discovery-heavy: more probe slots, more novelty.
  C: { novelty: 1.6, exploreEpsilon: 0.32 },
  // Recency-heavy: lean on the freshness pipeline. For news-junkie cohort.
  D: { recency: 1.4, fit: 0.85 },
};

const STORAGE_KEY = 'cake_cohort';

/**
 * Stable cohort assignment + A/B variant resolver.
 *
 * Why exists:
 *  - The v2 algorithm was monolithic — every user got the same weights.
 *    We could not run a single experiment without forking the code.
 *  - TikTok's edge is partly its huge experimentation pipeline; we
 *    bake that capacity in from day one even at a small scale.
 *
 * Strategy:
 *  - Each user maps to one of four buckets via a stable FNV-1a hash of
 *    their UID. Anonymous visitors get a per-device random bucket
 *    persisted in localStorage so the experience stays consistent
 *    across reloads.
 *  - Buckets are *not* visible to the user. They influence weights
 *    only.
 *  - A "viral score" is also exposed so the recommender can amplify
 *    items engaged by users whose cohort is similar to the viewer
 *    ("propagation by lookalike cohort").
 */
@Injectable({ providedIn: 'root' })
export class CohortEngineService {
  private auth = inject(AuthService);

  private readonly anonBucket = signal<CohortBucket>(this.loadAnonBucket());

  /** Stable bucket for the current viewer. */
  readonly bucket = computed<CohortBucket>(() => {
    const uid = this.auth.currentUser()?.id;
    if (uid) return this.bucketFor(uid);
    return this.anonBucket();
  });

  /** Effective ranking weights for the current viewer. */
  readonly weights = computed<RankingWeights>(() => {
    const overrides = VARIANTS[this.bucket()];
    return { ...DEFAULT_WEIGHTS, ...overrides };
  });

  /**
   * Lookalike-cohort viral boost: 0..1. The recommender multiplies the
   * `velocity` axis by `1 + viralBoost` so an article that lights up
   * the viewer's cohort first gets a head start on others.
   *
   * Right now we infer this client-side from the (article, bucket)
   * tuple by deterministic bucketed jitter — once we have server-side
   * impressions tagged with cohort, this becomes a real metric.
   */
  viralBoostFor(articleId: string): number {
    const seed = this.fnv1a(`${articleId}|${this.bucket()}`);
    return ((seed % 100) / 100) * 0.25;
  }

  /** Stable bucket from a UID. */
  bucketFor(uid: string): CohortBucket {
    const h = this.fnv1a(uid);
    const buckets: CohortBucket[] = ['A', 'B', 'C', 'D'];
    return buckets[h % buckets.length] ?? 'A';
  }

  // ────────────────────────────────────────────────────────────────

  private loadAnonBucket(): CohortBucket {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === 'A' || v === 'B' || v === 'C' || v === 'D') return v;
    } catch { /* ignore */ }
    const fresh = (['A', 'B', 'C', 'D'] as CohortBucket[])[Math.floor(Math.random() * 4)] ?? 'A';
    try { localStorage.setItem(STORAGE_KEY, fresh); } catch { /* ignore */ }
    return fresh;
  }

  /** FNV-1a 32-bit. Tiny, stable, no dependency. */
  private fnv1a(input: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h >>> 0;
  }
}
