import { Injectable, computed, inject } from '@angular/core';
import { InteractionService, SignalIntensity } from './interaction.service';

export type Verdict =
  | { action: 'CONTINUE' }                                       // strategy is working
  | { action: 'PIVOT'; reason: PivotReason; severity: number };  // flush buffer

export type PivotReason =
  | 'INSTANT_FLICKS'         // 2+ flicks (≤800ms) in the early session
  | 'SUSTAINED_FAST_SKIPS'   // many fast skips in a row
  | 'CATEGORY_SATURATION'    // 3+ same-category cards skipped fast
  | 'COLD_RECOVERY';         // session opened with strong rejection

const EARLY_WINDOW = 5;        // first N events
const RECENT_WINDOW = 4;       // sliding rejection window

/**
 * The Circuit Breaker watches micro-signals coming from the interaction
 * service and emits a verdict that the {@link ReactiveFeedBufferService}
 * acts on:
 *
 *  - `CONTINUE` — the user is engaging, keep serving the planned queue.
 *  - `PIVOT`    — the user is rejecting the current strategy. Flush the
 *                 unrendered tail of the buffer and re-rank from scratch
 *                 with adjusted weights.
 *
 * Why exists: the v2 algorithm waited until article 25 to detect
 * fatigue. By then the user is gone. The breaker is intentionally
 * trigger-happy — it can intervene as early as event #2.
 *
 * Pure derivation. Reading `verdict()` is cheap; the buffer subscribes
 * to it via Angular's reactivity.
 */
@Injectable({ providedIn: 'root' })
export class CircuitBreakerService {
  private interaction = inject(InteractionService);

  readonly verdict = computed<Verdict>(() => this.evaluate());

  private evaluate(): Verdict {
    const session = this.interaction.sessionHistory();
    if (session.length < 2) return { action: 'CONTINUE' };

    const intensities = session.map(e => e.intensity ?? 'normal' as SignalIntensity);
    const recent = intensities.slice(-RECENT_WINDOW);
    const flicks = recent.filter(i => i === 'flick').length;
    const fasts = recent.filter(i => i === 'fast').length;
    const deeps = recent.filter(i => i === 'deep').length;

    // Early session, two violent dismissals: hard pivot.
    if (session.length <= EARLY_WINDOW && flicks >= 2 && deeps === 0) {
      return { action: 'PIVOT', reason: 'INSTANT_FLICKS', severity: 1 };
    }

    // Three consecutive fast/flick rejections at any point.
    if (flicks + fasts >= 3 && deeps === 0) {
      return {
        action: 'PIVOT',
        reason: 'SUSTAINED_FAST_SKIPS',
        severity: Math.min(1, (flicks * 0.6 + fasts * 0.4) / 3),
      };
    }

    // Same category dismissed fast 3 times in a row.
    const recentEvents = session.slice(-RECENT_WINDOW);
    const cats = recentEvents.map(e => e.category);
    const uniqueCats = new Set(cats);
    if (uniqueCats.size === 1 && recentEvents.length >= 3) {
      const allLight = recentEvents.every(e => e.intensity === 'flick' || e.intensity === 'fast');
      if (allLight) return { action: 'PIVOT', reason: 'CATEGORY_SATURATION', severity: 0.7 };
    }

    // Session start with a single but very violent flick on slot 1.
    if (session.length === 1 && intensities[0] === 'flick') {
      return { action: 'PIVOT', reason: 'COLD_RECOVERY', severity: 0.4 };
    }

    return { action: 'CONTINUE' };
  }
}
