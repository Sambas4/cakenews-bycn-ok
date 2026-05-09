import { Injectable, signal } from '@angular/core';
import { Article } from '../types';

const STORAGE_KEY = 'cake_offline_articles_v1';
const DEFAULT_CAPACITY = 8;

interface CacheEnvelope {
  v: 1;
  storedAt: number;
  articles: Article[];
}

/**
 * Tiny LRU cache of the last few articles the viewer has seen, written
 * to `localStorage` so the app shell can render a meaningful feed in a
 * cold-start / offline boot.
 *
 * Why exists:
 *  - The reactive feed depends on `DataService.articles()` which is
 *    populated by Supabase. On a brand-new tab without network, the
 *    list is empty for several seconds and the user stares at the
 *    archive icon. TikTok solves this by always having locally-staged
 *    media; this service is the data-shaped equivalent.
 *  - Capacity capped (~8 articles) to stay well under the 5MB
 *    localStorage budget even with full bodies and metadata.
 *  - Schema versioned (`v: 1`) so a future shape change can ignore old
 *    payloads instead of crashing on deserialisation.
 *
 * The service is pure I/O around an in-memory signal. The
 * orchestration (when to read, when to write) lives in DataService.
 */
@Injectable({ providedIn: 'root' })
export class OfflineArticleCacheService {
  /** Articles currently held offline. Empty until {@link load} fires. */
  readonly articles = signal<Article[]>([]);

  /** Timestamp (epoch ms) of the last write, useful for staleness UI. */
  readonly storedAt = signal<number | null>(null);

  constructor() {
    this.load();
  }

  /** Persist the supplied articles, keeping at most `capacity`. */
  store(articles: Article[], capacity: number = DEFAULT_CAPACITY): void {
    if (!Array.isArray(articles)) return;
    const slice = articles.slice(0, capacity);
    const envelope: CacheEnvelope = {
      v: 1,
      storedAt: Date.now(),
      articles: slice,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
      this.articles.set(slice);
      this.storedAt.set(envelope.storedAt);
    } catch {
      // Quota exceeded or storage disabled — degrade silently. The app
      // continues to work; only offline boot suffers.
    }
  }

  /** Read what was persisted in a previous session. */
  load(): Article[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const env = JSON.parse(raw) as CacheEnvelope;
      if (env?.v !== 1 || !Array.isArray(env.articles)) return [];
      this.articles.set(env.articles);
      this.storedAt.set(env.storedAt ?? null);
      return env.articles;
    } catch {
      return [];
    }
  }

  /** Wipe the cache. Used by the logout cleaner. */
  clear(): void {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    this.articles.set([]);
    this.storedAt.set(null);
  }
}
