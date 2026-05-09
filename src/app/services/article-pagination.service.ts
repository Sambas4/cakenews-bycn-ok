import { Injectable, signal, inject, computed } from '@angular/core';
import { Article } from '../types';
import { ARTICLE_API, IArticleApi, FeedPageCursor } from './api/article-api';
import { Logger } from './logger.service';

const PAGE_SIZE = 20;

interface PaginationState {
  cursor: FeedPageCursor | null;
  /** True when at least one page has been fetched. */
  hasFetched: boolean;
  /** True when the server says there is nothing more to load. */
  exhausted: boolean;
  /** True while a network round-trip is in flight. */
  loading: boolean;
}

/**
 * Cursor-based pagination cursor for the feed.
 *
 * The {@link DataService} loads the first batch on boot for the
 * realtime live feed; this service is the *append* mechanism the UI
 * triggers when the user scrolls to the bottom of the buffer or
 * pulls-to-refresh.
 *
 * Why a separate service:
 *   * The realtime subscription owns the order and the freshness; it
 *     must not be entangled with the "give me the next 20" call.
 *   * Pagination state is concentrated here so we can dedupe in-flight
 *     requests, expose a single `exhausted` signal to the UI, and
 *     reset the cursor on lane changes.
 *   * Tests can drive the pagination from the InMemory adapter
 *     without touching the realtime channel at all.
 */
@Injectable({ providedIn: 'root' })
export class ArticlePaginationService {
  private api = inject<IArticleApi>(ARTICLE_API);
  private logger = inject(Logger);

  private state = signal<PaginationState>({
    cursor: null,
    hasFetched: false,
    exhausted: false,
    loading: false,
  });

  readonly loading   = computed(() => this.state().loading);
  readonly exhausted = computed(() => this.state().exhausted);
  readonly hasFetched = computed(() => this.state().hasFetched);

  /**
   * Fetches the next page from the API and returns the new articles.
   * Idempotent while a request is in flight; returns `[]` once the
   * cursor is exhausted.
   */
  async loadMore(): Promise<Article[]> {
    const s = this.state();
    if (s.loading || s.exhausted) return [];
    this.state.set({ ...s, loading: true });

    try {
      const page = await this.api.listFeedPage({ cursor: s.cursor, limit: PAGE_SIZE });
      this.state.set({
        cursor: page.next,
        hasFetched: true,
        exhausted: page.next === null,
        loading: false,
      });
      return page.articles;
    } catch (e) {
      this.logger.warn('pagination loadMore failed', e);
      this.state.set({ ...s, loading: false });
      return [];
    }
  }

  /**
   * Reset the cursor — used when the lane changes or the user
   * pulls-to-refresh. The realtime subscription is the source of
   * truth for the "first page", so callers typically reset and then
   * defer to the live signal.
   */
  reset(): void {
    this.state.set({ cursor: null, hasFetched: false, exhausted: false, loading: false });
  }

  /**
   * Pre-position the cursor from a known head — useful when the
   * realtime subscription has already filled the first batch and we
   * want subsequent `loadMore()` calls to continue from there.
   */
  primeFromHead(head: Article[]): void {
    if (head.length === 0) return;
    const last = head[head.length - 1]!;
    this.state.set({
      cursor: { publishedAt: last.timestamp, id: last.id },
      hasFetched: true,
      exhausted: false,
      loading: false,
    });
  }
}
