import { Injectable, signal, effect, inject } from '@angular/core';
import { Article, Comment as CakeComment } from '../types';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { OfflineArticleCacheService } from './offline-article-cache.service';
import { ImagePrefetchService } from './image-prefetch.service';
import { NetworkStatusService } from './network-status.service';
import { Logger } from './logger.service';
import { ARTICLE_API, IArticleApi, VibeKind } from './api/article-api';
import { ArticlePaginationService } from './article-pagination.service';
import { AuditLogService } from './audit-log.service';

const OFFLINE_CACHE_SIZE = 8;
/** Backoff schedule in ms for realtime reconnection attempts. */
const RECONNECT_BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000];

/**
 * Article store + orchestrator.
 *
 * Responsibilities (the only ones — everything else is delegated):
 *   * Hold the in-memory `articles` signal that the rest of the app
 *     reads.
 *   * Hydrate from the offline cache on boot, write through on
 *     realtime updates.
 *   * Subscribe to the {@link IArticleApi} realtime channel with
 *     exponential-backoff reconnection.
 *   * Apply optimistic mutations (likes, vibes, comments) and roll
 *     them back if the underlying API rejects.
 *
 * The actual database / network is hidden behind {@link IArticleApi}
 * so this service is identical whether we run against Supabase, an
 * in-memory mock, or a future read-only offline replica.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  articles = signal<Article[]>([]);
  /**
   * `true` once a network sync has produced a fresh snapshot. The
   * feed view uses this to distinguish "we are showing cached data"
   * from "we are showing the live database".
   */
  hasFreshData = signal<boolean>(false);

  /** True while a healthy realtime subscription is active. */
  public isConnected = signal<boolean>(true);

  private authService = inject(AuthService);
  private userService = inject(UserService);
  private offline = inject(OfflineArticleCacheService);
  private imagePrefetch = inject(ImagePrefetchService);
  private network = inject(NetworkStatusService);
  private logger = inject(Logger);
  private api = inject<IArticleApi>(ARTICLE_API);
  private pagination = inject(ArticlePaginationService);
  private audit = inject(AuditLogService);

  private unsubscribe: (() => void) | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private syncInFlight = false;

  constructor() {
    // Hydrate immediately from the offline cache so the feed has 3-5
    // articles to render before we even attempt a network round-trip.
    const cached = this.offline.load();
    if (cached.length > 0) this.articles.set(cached);

    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        void this.startSync();
      } else {
        this.stopSync();
        this.articles.set([]);
        this.hasFreshData.set(false);
      }
    });

    // When the device comes back online after a network drop, force a
    // reconnect attempt right away rather than waiting for the next
    // backoff tick — the user is staring at the screen.
    effect(() => {
      const online = this.network.isOnline();
      if (!online) {
        this.isConnected.set(false);
        return;
      }
      if (this.authService.currentUser() && !this.unsubscribe) {
        this.scheduleReconnect(0);
      }
    });
  }

  // ---------------------------------------------------------------
  // Sync lifecycle
  // ---------------------------------------------------------------

  private stopSync() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.unsubscribe) {
      try { this.unsubscribe(); }
      catch (e) { this.logger.warn('unsubscribe failed', e); }
      this.unsubscribe = null;
    }
    this.isConnected.set(false);
  }

  private scheduleReconnect(overrideMs?: number) {
    if (this.reconnectTimer) return;
    if (!this.authService.currentUser()) return;
    const idx = Math.min(this.reconnectAttempt, RECONNECT_BACKOFF_MS.length - 1);
    const delay = overrideMs ?? RECONNECT_BACKOFF_MS[idx] ?? 30_000;
    this.logger.info('realtime reconnect scheduled', { attempt: this.reconnectAttempt, delay });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempt += 1;
      void this.startSync();
    }, delay);
  }

  private async startSync() {
    if (this.syncInFlight) return;
    this.syncInFlight = true;
    this.stopSync();

    try {
      const fresh = await this.api.listAllPublished();
      this.applyFreshList(fresh);

      this.unsubscribe = this.api.subscribeToArticles((next) => {
        this.applyFreshList(next);
      });

      this.isConnected.set(true);
      this.reconnectAttempt = 0;
    } catch (e) {
      this.logger.error('article sync failed; continuing with cached articles', e);
      this.isConnected.set(false);
      // Do not clear `articles`: the offline cache hydrated us, and we
      // owe the user something to look at while we retry.
      this.scheduleReconnect();
    } finally {
      this.syncInFlight = false;
    }
  }

  private applyFreshList(list: Article[]) {
    const sorted = [...list].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
    this.articles.set(sorted);
    this.hasFreshData.set(true);
    this.offline.store(sorted.slice(0, OFFLINE_CACHE_SIZE), OFFLINE_CACHE_SIZE);
    this.imagePrefetch.precache(sorted.slice(0, OFFLINE_CACHE_SIZE).map(a => a.imageUrl).filter(Boolean));
    // Position the pagination cursor so subsequent `loadMore()` calls
    // pick up where the realtime head left off, without loading the
    // first batch twice.
    this.pagination.primeFromHead(sorted);
  }

  /**
   * Append the next page of older articles to the in-memory list.
   * No-op while a request is already in flight or the cursor is
   * exhausted. Useful for the feed view's "scroll to load older
   * stories" behaviour and the search view's deep browse.
   */
  async loadMore(): Promise<number> {
    const more = await this.pagination.loadMore();
    if (more.length === 0) return 0;
    // Dedupe — the realtime subscription may have already inserted
    // some of these rows.
    this.articles.update(curr => {
      const known = new Set(curr.map(a => a.id));
      const additions = more.filter(a => !known.has(a.id));
      return [...curr, ...additions]
        .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
    });
    return more.length;
  }

  /** Pagination state surface for the UI. */
  paginationLoading   = this.pagination.loading;
  paginationExhausted = this.pagination.exhausted;

  // ---------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------

  async getArticles(): Promise<Article[]> {
    return this.articles();
  }

  // ---------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------

  async upsertArticle(article: Article): Promise<Article | null> {
    try { return await this.api.upsert(article); }
    catch (e) { this.logger.error('upsertArticle failed', e); return null; }
  }

  async deleteArticle(articleId: string): Promise<void> {
    try {
      await this.api.delete(articleId);
      // Privileged action — leave a trail so we can answer "who
      // killed that article and when?" months later.
      await this.audit.record({
        action: 'article.delete',
        targetType: 'ARTICLE',
        targetId: articleId,
      });
    } catch (e) {
      this.logger.error('deleteArticle failed', e);
    }
  }

  /**
   * Optimistically bumps the public `likes` counter on an article.
   *
   *  1. Mutate the local signal so the heart updates under the thumb.
   *  2. Call the API (atomic RPC in the Supabase impl).
   *  3. Reconcile to the server's authoritative value, or roll back
   *     if the call rejected.
   */
  async adjustLikes(articleId: string, delta: number): Promise<void> {
    if (!Number.isFinite(delta) || delta === 0) return;

    this.articles.update(curr => curr.map(a => {
      if (a.id !== articleId) return a;
      return { ...a, likes: Math.max(0, (a.likes ?? 0) + delta) };
    }));

    try {
      const next = await this.api.adjustLikes(articleId, delta);
      // Authoritative reconcile — useful when other users were also
      // liking concurrently; the local optimistic value would otherwise
      // drift slightly until the next realtime tick.
      this.articles.update(curr => curr.map(a =>
        a.id === articleId ? { ...a, likes: next } : a
      ));
    } catch (e) {
      this.logger.warn('adjustLikes failed; rolling back', { articleId, delta, e });
      this.articles.update(curr => curr.map(a => {
        if (a.id !== articleId) return a;
        return { ...a, likes: Math.max(0, (a.likes ?? 0) - delta) };
      }));
    }
  }

  /** @deprecated kept for callers that only ever incremented. */
  async likeArticle(articleId: string): Promise<void> {
    await this.adjustLikes(articleId, 1);
  }

  /**
   * Optimistically vote a vibe on an article. `vibe = null` retracts.
   * The local `vibeCheck` aggregate is patched immediately, then
   * reconciled with the server's source-of-truth value.
   */
  async voteVibe(articleId: string, vibe: VibeKind | null): Promise<void> {
    const article = this.articles().find(a => a.id === articleId);
    const before = article?.vibeCheck;

    // Optimistic patch — bump or decrement the chosen vibe locally.
    if (article && before) {
      const aggregate = { ...before };
      if (vibe) aggregate[vibe] = (aggregate[vibe] ?? 0) + 1;
      this.articles.update(curr => curr.map(a => a.id === articleId ? { ...a, vibeCheck: aggregate } : a));
    }

    try {
      const fresh = await this.api.voteVibe(articleId, vibe);
      this.articles.update(curr => curr.map(a => a.id === articleId ? { ...a, vibeCheck: fresh } : a));
    } catch (e) {
      this.logger.warn('voteVibe failed; rolling back', { articleId, vibe, e });
      if (before) {
        this.articles.update(curr => curr.map(a => a.id === articleId ? { ...a, vibeCheck: before } : a));
      }
    }
  }

  /**
   * @deprecated Pre-RPC API. Prefer {@link voteVibe}. The legacy
   *   signature stays for the `interaction.service` toggle helper
   *   until it's migrated.
   */
  async updateVibe(articleId: string, nextVibeCheck: { choque: number; sceptique: number; bullish: number; valide: number }): Promise<void> {
    const before = this.articles().find(a => a.id === articleId)?.vibeCheck;
    this.articles.update(curr => curr.map(a => a.id === articleId ? { ...a, vibeCheck: nextVibeCheck } : a));
    // We can't atomically replicate the legacy "set the entire map"
    // pattern through the new RPC (it expects a single vibe). Best
    // effort: trust the local mutation; the realtime subscription
    // will overwrite us with the server truth on the next tick.
  }

  async addComment(articleId: string, comment: CakeComment): Promise<void> {
    try {
      await this.api.postComment(articleId, comment.content);
      // Bump the local counter optimistically; realtime will reconcile.
      this.articles.update(curr => curr.map(a =>
        a.id === articleId ? { ...a, comments: (a.comments ?? 0) + 1 } : a
      ));
    } catch (e) {
      this.logger.error('addComment failed', e);
    }
  }

  // ---------------------------------------------------------------
  // Profile shortcut (kept for backward compat with existing callers)
  // ---------------------------------------------------------------

  async getUserProfile(userId: string): Promise<unknown> {
    const publicProfile = await this.userService.fetchPublicProfile(userId);
    if (!publicProfile) return null;
    return {
      id: publicProfile.uid,
      name: publicProfile.displayName,
      handle: publicProfile.username || 'user',
      avatar: publicProfile.photoURL
        || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(publicProfile.displayName)}`,
      role: 'USER',
      status: 'ACTIVE',
      joinDate: publicProfile.updatedAt || new Date().toISOString(),
    };
  }
}
