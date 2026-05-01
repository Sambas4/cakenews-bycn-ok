import { Injectable, signal, computed } from '@angular/core';

export type TrustEventKind =
  | 'GOOD_REPORT'        // user signalled bad content that was upheld
  | 'BAD_REPORT'         // user signalled content that was rejected
  | 'DEEP_READ'          // user finished a hard / long article
  | 'COMMENT_LIKED'      // user's comment crossed an upvote threshold
  | 'COMMENT_REPORTED'   // user's comment got removed
  | 'BETA_PROGRAM'       // joined or contributed to a beta
  | 'IDENTITY_VERIFIED'; // press card / ID verification done

export interface TrustEvent {
  id: string;
  kind: TrustEventKind;
  delta: number;       // signed integer applied to the score
  reason: string;      // user-facing label
  at: number;          // epoch ms
}

const STORAGE_KEY = 'cake_trust_log';
const MAX_LOG = 50;

const LABEL_BY_KIND: Record<TrustEventKind, string> = {
  GOOD_REPORT: 'Signalement justifié',
  BAD_REPORT: 'Signalement rejeté',
  DEEP_READ: 'Lecture longue achevée',
  COMMENT_LIKED: 'Commentaire valorisé',
  COMMENT_REPORTED: 'Commentaire supprimé',
  BETA_PROGRAM: 'Contribution beta',
  IDENTITY_VERIFIED: 'Identité vérifiée',
};

const DEFAULT_DELTAS: Record<TrustEventKind, number> = {
  GOOD_REPORT: 5,
  BAD_REPORT: -3,
  DEEP_READ: 1,
  COMMENT_LIKED: 2,
  COMMENT_REPORTED: -8,
  BETA_PROGRAM: 4,
  IDENTITY_VERIFIED: 20,
};

/**
 * Transparent trust ledger. The user can read every event that bumped
 * their score up or down, in plain French. This is a deliberate move
 * away from "score it just appeared and we won't tell you why" patterns
 * common on social platforms.
 *
 * The score is **derived** from the log so we can never desync. Reset
 * any time by clearing the log; the floor at 0 and ceiling at 200 are
 * applied at read time, never written.
 *
 * Local-first: a real deployment will mirror the log into a
 * `trust_events` table with append-only RLS, but the contract is the
 * same.
 */
@Injectable({ providedIn: 'root' })
export class TrustService {
  private readonly log = signal<TrustEvent[]>(this.load());

  readonly events = computed(() => this.log());

  /** Aggregated score, floored at 0 and capped at 200. */
  readonly score = computed(() => {
    const base = 100;
    const sum = this.log().reduce((acc, e) => acc + e.delta, 0);
    return Math.max(0, Math.min(200, base + sum));
  });

  readonly tier = computed(() => {
    const s = this.score();
    if (s >= 160) return 'Veilleur';
    if (s >= 130) return 'Vérifié';
    if (s >= 100) return 'Confirmé';
    if (s >= 70) return 'En croissance';
    return 'Probation';
  });

  /** Record an event. Delta defaults to {@link DEFAULT_DELTAS}. */
  record(kind: TrustEventKind, opts: { delta?: number; reason?: string } = {}) {
    const delta = opts.delta ?? DEFAULT_DELTAS[kind];
    const reason = opts.reason ?? LABEL_BY_KIND[kind];
    const ev: TrustEvent = {
      id: `te-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind, delta, reason,
      at: Date.now(),
    };
    this.log.update(curr => {
      const next = [ev, ...curr].slice(0, MAX_LOG);
      this.persist(next);
      return next;
    });
  }

  clear() {
    this.log.set([]);
    this.persist([]);
  }

  private load(): TrustEvent[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as TrustEvent[];
    } catch {
      return [];
    }
  }

  private persist(list: TrustEvent[]) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  }
}
