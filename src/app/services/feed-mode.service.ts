import { Injectable, signal, inject, computed } from '@angular/core';
import { Article } from '../types';
import { FeedAlgorithmService } from './feed-algorithm.service';
import { InteractionService } from './interaction.service';
import { DataService } from './data.service';
import { FollowService } from './follow.service';

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
  private follows = inject(FollowService);

  readonly mode = signal<FeedMode>(this.loadInitial());

  setMode(m: FeedMode) {
    this.mode.set(m);
    try { localStorage.setItem('cake_feed_mode', m); } catch { /* ignore */ }
  }

  /**
   * Active lane content. This is the *full* candidate pool for the
   * current lane — for Pulse it's the algorithmic ranking, for Radar
   * the chronological pipeline, for Cercle the trusted-authors slice.
   *
   * The reactive buffer prefers {@link inventory} over this for Pulse
   * (it re-ranks from raw inventory minus served), but for Radar /
   * Cercle this signal *is* the inventory.
   */
  readonly feed = computed<Article[]>(() => {
    const all = this.data.articles();
    switch (this.mode()) {
      case 'radar':  return this.radar(all);
      case 'cercle': return this.cercle(all);
      case 'pulse':
      default:       return this.algorithm.generate(all);
    }
  });

  /**
   * Raw, unranked candidate pool for the current lane. Surfaced so
   * downstream services (the reactive buffer in particular) can pick
   * their own ranking strategy without going through `feed` and
   * paying the cost of an extra ranking pass.
   */
  readonly inventory = computed<Article[]>(() => {
    const all = this.data.articles().filter(a => (a.status ?? 'published') === 'published');
    switch (this.mode()) {
      case 'radar':  return [...all].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
      case 'cercle': return this.cercleSlice(all);
      case 'pulse':
      default:       return all;
    }
  });

  private radar(all: Article[]): Article[] {
    const live = all.filter(a => (a.status ?? 'published') === 'published');
    return [...live].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  }

  private cercle(all: Article[]): Article[] {
    return this.cercleSlice(all.filter(a => (a.status ?? 'published') === 'published'));
  }

  private cercleSlice(pool: Article[]): Article[] {
    // Explicit follows take precedence — that's the user's stated
    // intent, the engagement heuristic only fills gaps.
    const followedAuthors = new Set(this.follows.authors());
    const followedTags = new Set(this.follows.tags().map(t => t.toLowerCase()));
    const followedTopics = new Set(this.follows.topics());

    if (followedAuthors.size + followedTags.size + followedTopics.size === 0) {
      // Fallback heuristic — prevents an empty Cercle for new users.
      const liked = new Set(this.interaction.likedArticles());
      const commented = new Set(this.interaction.commentedArticles());
      const saved = new Set(this.interaction.savedArticles());
      const inferred = new Set<string>();
      for (const a of pool) {
        if (liked.has(a.id) || commented.has(a.id) || saved.has(a.id)) {
          inferred.add(a.author);
        }
      }
      if (inferred.size === 0) return [];
      return pool
        .filter(a => inferred.has(a.author))
        .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
    }

    return pool
      .filter(a => {
        if (followedAuthors.has(a.author)) return true;
        if (followedTopics.has(a.category)) return true;
        if (a.tags?.some(t => followedTags.has(t.toLowerCase()))) return true;
        return false;
      })
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
