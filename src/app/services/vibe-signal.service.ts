import { Injectable, computed, inject } from '@angular/core';
import { Article } from '../types';
import { DataService } from './data.service';

export type VibeKind = 'choque' | 'sceptique' | 'bullish' | 'valide';

export interface ArticleVibePulse {
  articleId: string;
  total: number;
  ratios: Record<VibeKind, number>;       // 0..1
  dominant: VibeKind | null;
  intensity: number;                       // 0..1, share of dominant
  signals: VibeSignal[];
}

export type VibeSignal =
  | { kind: 'BREAKING_SHOCK'; weight: number }       // mass "choqué" → ticker boost
  | { kind: 'COUNTER_BRIEF'; weight: number }        // mass "sceptique" → counter-brief candidate
  | { kind: 'OPPORTUNITY'; weight: number }          // mass "bullish" → opportunity feed (eco/crypto/sport)
  | { kind: 'EDITORIAL_QUALITY'; weight: number };   // mass "validé" → boost the author/editor

const MIN_VOTES = 25;          // statistical floor before a signal can fire
const COUNTER_BRIEF_RATIO = 0.45;
const SHOCK_RATIO = 0.50;
const OPPORTUNITY_RATIO = 0.50;
const QUALITY_RATIO = 0.55;

/**
 * Turns the lightweight 4-emoji "VibeCheck" into actual editorial signals
 * that downstream features (algorithm, ticker, studio inbox) can consume.
 *
 * Why it matters:
 *  - The 4 vibes were decorative in the prototype. They stored votes,
 *    nothing else looked at them.
 *  - Here every article exposes a `pulse` and a list of zero or more
 *    `signals`. The studio can subscribe to "any article reaching the
 *    Counter-Brief threshold" and immediately commission a follow-up.
 *  - The feed algorithm uses `EDITORIAL_QUALITY` as a small boost
 *    on top of the raw scoring.
 *
 * Pure, side-effect free, derived state. Reads are cheap because we
 * only re-evaluate when articles change.
 */
@Injectable({ providedIn: 'root' })
export class VibeSignalService {
  private data = inject(DataService);

  /** All articles with at least one signal. Sorted by strongest signal. */
  readonly hotPulses = computed<ArticleVibePulse[]>(() => {
    const out: ArticleVibePulse[] = [];
    for (const a of this.data.articles()) {
      const pulse = this.pulseFor(a);
      if (pulse.signals.length > 0) out.push(pulse);
    }
    return out.sort((a, b) =>
      this.maxWeight(b.signals) - this.maxWeight(a.signals)
    );
  });

  /** Articles flagged as Counter-Brief candidates (studio inbox). */
  readonly counterBriefCandidates = computed<ArticleVibePulse[]>(() =>
    this.hotPulses().filter(p => p.signals.some(s => s.kind === 'COUNTER_BRIEF'))
  );

  /** Quick lookup table — used by FeedAlgorithm to apply a small boost. */
  readonly qualityBoostByArticle = computed<ReadonlyMap<string, number>>(() => {
    const map = new Map<string, number>();
    for (const p of this.hotPulses()) {
      const q = p.signals.find(s => s.kind === 'EDITORIAL_QUALITY');
      if (q) map.set(p.articleId, q.weight);
    }
    return map;
  });

  /**
   * Compute the pulse for a single article. Public so admin tools can
   * preview the signals an article would emit before publishing edits.
   */
  pulseFor(article: Article): ArticleVibePulse {
    const v = article.vibeCheck ?? { choque: 0, sceptique: 0, bullish: 0, valide: 0 };
    const total = v.choque + v.sceptique + v.bullish + v.valide;

    if (total === 0) {
      return {
        articleId: article.id,
        total: 0,
        ratios: { choque: 0, sceptique: 0, bullish: 0, valide: 0 },
        dominant: null,
        intensity: 0,
        signals: [],
      };
    }

    const ratios: Record<VibeKind, number> = {
      choque: v.choque / total,
      sceptique: v.sceptique / total,
      bullish: v.bullish / total,
      valide: v.valide / total,
    };

    let dominant: VibeKind = 'choque';
    let max = ratios.choque;
    (Object.keys(ratios) as VibeKind[]).forEach(k => {
      if (ratios[k] > max) { max = ratios[k]; dominant = k; }
    });

    const signals: VibeSignal[] = [];
    if (total >= MIN_VOTES) {
      if (ratios.sceptique >= COUNTER_BRIEF_RATIO) {
        signals.push({ kind: 'COUNTER_BRIEF', weight: ratios.sceptique * Math.log10(total) });
      }
      if (ratios.choque >= SHOCK_RATIO) {
        signals.push({ kind: 'BREAKING_SHOCK', weight: ratios.choque * Math.log10(total) });
      }
      if (ratios.bullish >= OPPORTUNITY_RATIO) {
        signals.push({ kind: 'OPPORTUNITY', weight: ratios.bullish * Math.log10(total) });
      }
      if (ratios.valide >= QUALITY_RATIO) {
        signals.push({ kind: 'EDITORIAL_QUALITY', weight: ratios.valide * Math.log10(total) });
      }
    }

    return { articleId: article.id, total, ratios, dominant, intensity: max, signals };
  }

  private maxWeight(signals: VibeSignal[]): number {
    return signals.reduce((m, s) => Math.max(m, s.weight), 0);
  }
}
