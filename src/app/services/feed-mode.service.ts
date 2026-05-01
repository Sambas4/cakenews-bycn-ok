import { Injectable, signal, inject, computed } from '@angular/core';
import { Article } from '../types';
import { FeedAlgorithmService } from './feed-algorithm.service';
import { InteractionService } from './interaction.service';
import { DataService } from './data.service';

export type FeedMode = 'pulse' | 'radar' | 'cercle';

interface ModeMeta {
  id: FeedMode;
  label: string;
  hint: string;
  icon: string;
  accent: string;
}

export const FEED_MODES: ModeMeta[] = [
  { id: 'pulse', label: 'Pulse', hint: 'L\'algorithme te connaît', icon: 'sparkles', accent: '#7ae25c' },
  { id: 'radar', label: 'Radar', hint: 'Breaking, ordre chronologique', icon: 'radio', accent: '#ff3b30' },
  { id: 'cercle', label: 'Cercle', hint: 'Tes voix, ta bulle assumée', icon: 'compass', accent: '#38bdf8' },
];

/**
 * Feed orchestrator. Owns the active "lane" (Pulse / Radar / Cercle) and
 * exposes one signal per lane so the feed view can swap content without
 * recomputing the whole DOM.
 *
 *  - **Pulse**  : the personalised TikTok-like ranking from
 *    {@link FeedAlgorithmService}. Default lane.
 *  - **Radar**  : strict reverse-chronological pipeline of recent +
 *    breaking content. No ranking. Lifeline for live events.
 *  - **Cercle** : strictly content authored by, liked by, or commented
 *    by accounts the viewer engages with. The user opts into their
 *    own bubble; we never decide it for them.
 */
@Injectable({ providedIn: 'root' })
export class FeedModeService {
  private algorithm = inject(FeedAlgorithmService);
  private interaction = inject(InteractionService);
  private data = inject(DataService);

  readonly mode = signal<FeedMode>(this.loadInitial());

  setMode(m: FeedMode) {
    this.mode.set(m);
    try { localStorage.setItem('cake_feed_mode', m); } catch { /* ignore */ }
  }

  /** Active feed for the current lane. */
  readonly feed = computed<Article[]>(() => {
    const all = this.data.articles();
    switch (this.mode()) {
      case 'radar':  return this.radar(all);
      case 'cercle': return this.cercle(all);
      case 'pulse':
      default:       return this.algorithm.generate(all);
    }
  });

  private radar(all: Article[]): Article[] {
    const live = all.filter(a => (a.status ?? 'published') === 'published');
    return [...live].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  }

  private cercle(all: Article[]): Article[] {
    const liked = new Set(this.interaction.likedArticles());
    const commented = new Set(this.interaction.commentedArticles());
    const saved = new Set(this.interaction.savedArticles());

    // Authors I have engaged with at least once.
    const trustedAuthors = new Set<string>();
    for (const a of all) {
      if (liked.has(a.id) || commented.has(a.id) || saved.has(a.id)) {
        trustedAuthors.add(a.author);
      }
    }

    if (trustedAuthors.size === 0) return [];

    return all
      .filter(a => (a.status ?? 'published') === 'published' && trustedAuthors.has(a.author))
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  }

  private loadInitial(): FeedMode {
    try {
      const v = localStorage.getItem('cake_feed_mode');
      if (v === 'pulse' || v === 'radar' || v === 'cercle') return v;
    } catch { /* ignore */ }
    return 'pulse';
  }
}
