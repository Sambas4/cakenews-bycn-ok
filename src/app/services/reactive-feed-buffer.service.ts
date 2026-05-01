import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Article } from '../types';
import { DataService } from './data.service';
import { FeedAlgorithmService } from './feed-algorithm.service';
import { FeedModeService } from './feed-mode.service';
import { CircuitBreakerService, PivotReason } from './circuit-breaker.service';
import { Logger } from './logger.service';

export interface BufferState {
  /** Timeline of articles already pushed to the user. */
  served: Article[];
  /** Articles staged for the next swipes. Sliding window of 5. */
  upcoming: Article[];
  /** Total pivots since the buffer was first hydrated. Useful for UX. */
  pivotCount: number;
  /** Last reason the buffer regenerated. `null` for the initial hydrate. */
  lastPivotReason: PivotReason | null;
}

const WINDOW_SIZE = 5;
const MIN_DEPTH_BEFORE_REFILL = 2;
const MAX_PIVOTS_PER_SESSION = 6;

/**
 * The reactive feed buffer is the heart of CakeEngine v3. It addresses
 * the FATAL flaws of v2:
 *
 *   - **No mid-session adaptation** — v2 produced a 60-article queue
 *     once and never reshuffled. Here we hold a sliding window of 5
 *     and refill from the freshest signal as soon as the user
 *     advances.
 *   - **No early intervention** — v2 only reacted after 25 articles.
 *     Here {@link CircuitBreakerService} can fire a pivot as early as
 *     event #2; we discard the unrendered tail and re-rank against
 *     the current state of fatigue.
 *
 * Public surface kept tight on purpose:
 *   - `current()` — the article currently on screen.
 *   - `upcoming()` — the next few candidates (used for prefetch hints).
 *   - `advance()` — the feed view calls this when the user swipes.
 *   - `pivotsTaken()` — count exposed for telemetry / UI nudges.
 *
 * Mode changes (Pulse / Radar / Cercle) trigger a clean rehydrate so
 * lanes stay isolated.
 */
@Injectable({ providedIn: 'root' })
export class ReactiveFeedBufferService {
  private data = inject(DataService);
  private algorithm = inject(FeedAlgorithmService);
  private mode = inject(FeedModeService);
  private breaker = inject(CircuitBreakerService);
  private logger = inject(Logger);

  private readonly state = signal<BufferState>({
    served: [],
    upcoming: [],
    pivotCount: 0,
    lastPivotReason: null,
  });

  /** Article on screen now (top of the upcoming queue). */
  readonly current = computed<Article | null>(() => this.state().upcoming[0] ?? null);

  /** Sliding window of upcoming candidates (excluding `current()`). */
  readonly upcoming = computed<Article[]>(() => this.state().upcoming.slice(1));

  /**
   * Track exposed to the feed view. We deliberately keep the served
   * history at the head so the horizontal swipe-track stays
   * index-stable. Pivots only ever replace the *tail* (`upcoming`),
   * never the article currently being read or the ones already
   * traversed.
   */
  readonly visible = computed<Article[]>(() => {
    const s = this.state();
    return [...s.served, ...s.upcoming];
  });

  /** Pivots fired so far in this session. */
  readonly pivotsTaken = computed<number>(() => this.state().pivotCount);

  /** Last pivot reason, if any. Useful for a discreet UI hint. */
  readonly lastPivotReason = computed<PivotReason | null>(() => this.state().lastPivotReason);

  constructor() {
    // Hydrate / re-hydrate when articles arrive or the lane changes.
    // We deliberately *do not* depend on session signals here — that
    // would re-rank under the user mid-swipe. The breaker is our
    // designated, throttled trigger for that.
    effect(() => {
      const all = this.data.articles();
      const lane = this.mode.mode();
      void lane;
      if (all.length === 0) return;
      this.hydrate('initial');
    });

    // Watch the breaker. PIVOT verdicts flush the unrendered tail.
    effect(() => {
      const v = this.breaker.verdict();
      if (v.action !== 'PIVOT') return;
      if (this.state().pivotCount >= MAX_PIVOTS_PER_SESSION) {
        // Defence in depth: a misbehaving signal source could oscillate.
        this.logger.warn('CircuitBreaker pivot rate-limited', { reason: v.reason });
        return;
      }
      this.pivot(v.reason);
    });
  }

  /** Called by the feed view when the user moves to the next article. */
  advance() {
    const s = this.state();
    if (s.upcoming.length === 0) return;
    const [now, ...rest] = s.upcoming;
    const served = now ? [...s.served, now] : s.served;

    // If the queue is getting thin, top it up *without* clearing what
    // is already staged — this is a soft refill, not a pivot.
    if (rest.length <= MIN_DEPTH_BEFORE_REFILL) {
      const refill = this.rank(served, rest);
      this.state.set({
        ...s,
        served,
        upcoming: [...rest, ...refill],
      });
      return;
    }

    this.state.set({ ...s, served, upcoming: rest });
  }

  /** Force a fresh hydrate (used when articles arrive or lane changes). */
  reset() {
    this.hydrate('initial');
  }

  /**
   * Place a specific article at the head of the buffer. Used when the
   * user lands via a deep link (`/article/:id`) — without this the
   * shared link would silently route to whatever the algorithm had
   * ranked first instead of the article the URL pointed to.
   *
   * Returns `true` if the article was found and pinned, `false`
   * otherwise. The caller (the feed view) can fall back to a normal
   * hydrate when we return false.
   */
  pinArticle(id: string): boolean {
    const inventory = this.mode.inventory();
    const target = inventory.find(a => a.id === id);
    if (!target) return false;

    // Build a fresh window around the target — keep the rest of the
    // ranking honest (we ask the regular ranker for context candidates).
    const remaining = inventory.filter(a => a.id !== id);
    const lane = this.mode.mode();
    const context = lane === 'pulse'
      ? this.algorithm.generate(remaining, WINDOW_SIZE * 3).slice(0, WINDOW_SIZE - 1)
      : remaining.slice(0, WINDOW_SIZE - 1);

    this.state.set({
      served: [],
      upcoming: [target, ...context],
      pivotCount: 0,
      lastPivotReason: null,
    });
    return true;
  }

  // ────────────────────────────────────────────────────────────────

  private hydrate(reason: 'initial' | PivotReason) {
    const served = reason === 'initial' ? [] : this.state().served;
    const fresh = this.rank(served, []);
    if (fresh.length === 0) return;

    const isPivot = reason !== 'initial';
    this.state.update(s => ({
      ...s,
      served: isPivot ? s.served : [],
      upcoming: fresh,
      pivotCount: isPivot ? s.pivotCount + 1 : 0,
      lastPivotReason: isPivot ? reason : null,
    }));
  }

  private pivot(reason: PivotReason) {
    // Keep the article currently being read so we don't yank it from
    // the user's screen. We replace only the tail.
    const s = this.state();
    const head = s.upcoming.slice(0, 1);
    const fresh = this.rank(s.served, head);

    this.state.set({
      served: s.served,
      upcoming: [...head, ...fresh],
      pivotCount: s.pivotCount + 1,
      lastPivotReason: reason,
    });
    this.logger.info('CircuitBreaker pivot', { reason, count: s.pivotCount + 1 });
  }

  /**
   * Produces a fresh ranked window. We exclude both the served history
   * and any articles already staged (passed in via `pinned`) so we
   * never duplicate.
   */
  private rank(served: Article[], pinned: Article[]): Article[] {
    const lane = this.mode.mode();
    const inventory = this.mode.inventory();
    const seen = new Set<string>([
      ...served.map(a => a.id),
      ...pinned.map(a => a.id),
    ]);
    const remaining = inventory.filter(a => !seen.has(a.id));
    if (remaining.length === 0) return [];

    if (lane === 'pulse') {
      // The personalised lane re-ranks from raw inventory each time so
      // the freshest engagement signals (likes, dwells, vibes) make it
      // into the next 5 slots. We over-sample then take the head.
      const ranked = this.algorithm.generate(remaining, WINDOW_SIZE * 3);
      return ranked.slice(0, WINDOW_SIZE);
    }

    // Radar / Cercle are deterministic chronological pipelines — no
    // re-ranking needed; just pull the head of the remaining stream.
    return remaining.slice(0, WINDOW_SIZE);
  }
}
