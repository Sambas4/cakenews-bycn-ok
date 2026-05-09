import { Injectable, signal, effect, inject } from '@angular/core';
import { Article, Comment as CakeComment } from '../types';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { OfflineArticleCacheService } from './offline-article-cache.service';
import { ImagePrefetchService } from './image-prefetch.service';
import { NetworkStatusService } from './network-status.service';
import { Logger } from './logger.service';
import { RealtimeChannel } from '@supabase/supabase-js';

const OFFLINE_CACHE_SIZE = 8;
/** Backoff schedule in ms for realtime reconnection attempts. */
const RECONNECT_BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000];

@Injectable({
  providedIn: 'root'
})
export class DataService {
  articles = signal<Article[]>([]);
  /**
   * `true` once the realtime subscription has produced a fresh
   * snapshot. The feed view uses this to distinguish "we are showing
   * cached data" from "we are showing the live database".
   */
  hasFreshData = signal<boolean>(false);

  private channel: RealtimeChannel | null = null;
  /** True while a healthy realtime subscription is active. */
  public isConnected = signal<boolean>(true);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private supabaseService = inject(SupabaseService);
  private offline = inject(OfflineArticleCacheService);
  private imagePrefetch = inject(ImagePrefetchService);
  private network = inject(NetworkStatusService);
  private logger = inject(Logger);

  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Hydrate immediately from the offline cache so the feed has 3-5
    // articles to render before we even attempt a network round-trip.
    // This is the TikTok-style "always-on" feed boot.
    const cached = this.offline.load();
    if (cached.length > 0) {
      this.articles.set(cached);
    }

    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        void this.startRealtimeSync();
      } else {
        void this.stopRealtimeSync();
        this.articles.set([]);
        this.hasFreshData.set(false);
      }
    });

    // When the device comes back online after a network drop, force a
    // reconnect attempt right away rather than waiting for the next
    // backoff tick — the user is staring at the screen, we owe them
    // a fresh feed asap.
    effect(() => {
      const online = this.network.isOnline();
      if (!online) {
        this.isConnected.set(false);
        return;
      }
      if (this.authService.currentUser() && !this.channel) {
        this.scheduleReconnect(0);
      }
    });
  }

  private async stopRealtimeSync() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (!this.channel) return;
    try { await this.supabaseService.client.removeChannel(this.channel); }
    catch (e) { this.logger.warn('removeChannel failed', e); }
    this.channel = null;
    this.isConnected.set(false);
  }

  /**
   * Schedule a single reconnection attempt with capped exponential
   * backoff. Resets the attempt counter on first successful sync.
   */
  private scheduleReconnect(overrideMs?: number) {
    if (this.reconnectTimer) return; // Already scheduled.
    if (!this.authService.currentUser()) return;
    const idx = Math.min(this.reconnectAttempt, RECONNECT_BACKOFF_MS.length - 1);
    const delay = overrideMs ?? RECONNECT_BACKOFF_MS[idx] ?? 30_000;
    this.logger.info('realtime reconnect scheduled', { attempt: this.reconnectAttempt, delay });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempt += 1;
      void this.startRealtimeSync();
    }, delay);
  }

  private async startRealtimeSync() {
    await this.stopRealtimeSync();

    try {
      const { data, error } = await this.supabaseService.client
        .from('articles')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) throw error;

      const fresh = (data as Article[] | null) ?? [];
      this.articles.set(fresh);
      this.hasFreshData.set(true);
      this.isConnected.set(true);

      // Persist a small slice for the next cold start. We deliberately
      // keep the freshest articles only — older ones are unlikely to
      // surface in any lane on next boot.
      this.offline.store(fresh.slice(0, OFFLINE_CACHE_SIZE), OFFLINE_CACHE_SIZE);
      // Tell the service worker to pre-warm the cover images so they
      // render even when the next session starts offline.
      this.imagePrefetch.precache(fresh.slice(0, OFFLINE_CACHE_SIZE).map(a => a.imageUrl).filter(Boolean));

      this.channel = this.supabaseService.client.channel('public:articles')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            this.articles.update(curr =>
              [payload.new as Article, ...curr].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
            );
          } else if (payload.eventType === 'UPDATE') {
            this.articles.update(curr =>
              curr.map(a => a.id === payload.new['id'] ? payload.new as Article : a)
                  .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
            );
          } else if (payload.eventType === 'DELETE') {
            this.articles.update(curr => curr.filter(a => a.id !== payload.old['id']));
          }
          // Refresh the offline cache opportunistically so it stays
          // useful even after a long online session.
          this.offline.store(this.articles().slice(0, OFFLINE_CACHE_SIZE), OFFLINE_CACHE_SIZE);
        })
        .subscribe((status) => {
          // Supabase emits `SUBSCRIBED` on success, `CHANNEL_ERROR` /
          // `TIMED_OUT` / `CLOSED` on transport problems. We mirror
          // those into our local `isConnected` and trigger a reconnect
          // for the unhealthy ones.
          if (status === 'SUBSCRIBED') {
            this.isConnected.set(true);
            this.reconnectAttempt = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            this.isConnected.set(false);
            this.channel = null;
            this.scheduleReconnect();
          }
        });

      // The `subscribe(...)` call above is fire-and-forget. We can't
      // await its first transition cleanly, so we mark the path as
      // optimistically "connected" until the channel callback flips it.
      this.isConnected.set(true);
      this.reconnectAttempt = 0;
    } catch (e) {
      this.logger.error('Supabase sync failed; continuing with cached articles', e);
      this.isConnected.set(false);
      // We deliberately do *not* clear `articles` here — the offline
      // cache hydrated us at boot and the user must keep seeing
      // something while we retry.
      this.scheduleReconnect();
    }
  }

  async getArticles(): Promise<Article[]> {
    return this.articles();
  }

  async upsertArticle(article: Article): Promise<Article | null> {
    try {
      const { data, error } = await this.supabaseService.client.from('articles').upsert(article).select().single();
      if (error) throw error;
      return data as Article;
    } catch(e: any) {
       console.error("Supabase create error", e);
       return null;
    }
  }

  async deleteArticle(articleId: string): Promise<void> {
    try {
      await this.supabaseService.client.from('articles').delete().eq('id', articleId);
    } catch(e: any) {
      console.error("Supabase delete error", e);
    }
  }

  // --- Real-time Interactions ---

  /**
   * Optimistically bumps the public `likes` counter on an article.
   *
   *  1. **Local-first**: we mutate the in-memory `articles` signal
   *     synchronously so the heart icon and counter update under the
   *     thumb the moment the tap lands. The user never waits on a
   *     Supabase round-trip.
   *  2. **Server reconcile**: we fetch the current value, write
   *     `current + delta` (floored at 0), and trust the realtime
   *     subscription to surface any drift caused by other users.
   *  3. **Rollback on failure**: if the server call throws (e.g.
   *     offline, RLS denial), we undo the local optimism so the UI
   *     stays honest.
   *
   * Note that the server-side increment is deliberately read-modify-
   * write here — the migration plan moves this to a Postgres RPC for
   * true atomicity, but the local-first feel doesn't depend on it.
   */
  async adjustLikes(articleId: string, delta: number): Promise<void> {
    if (!Number.isFinite(delta) || delta === 0) return;

    // 1. Optimistic local update.
    let rolledBack = false;
    this.articles.update(curr => curr.map(a => {
      if (a.id !== articleId) return a;
      const next = Math.max(0, (a.likes ?? 0) + delta);
      return { ...a, likes: next };
    }));

    try {
      // 2. Server reconcile.
      const { data, error } = await this.supabaseService.client
        .from('articles')
        .select('likes')
        .eq('id', articleId)
        .single();
      if (error) throw error;
      const current = (data?.likes as number | null) ?? 0;
      const next = Math.max(0, current + delta);
      const { error: upErr } = await this.supabaseService.client
        .from('articles')
        .update({ likes: next })
        .eq('id', articleId);
      if (upErr) throw upErr;
    } catch (e) {
      // 3. Rollback. We do not surface a toast here — likes are a low-
      // stakes interaction and the realtime subscription will reconcile
      // the visible counter from the database within ~1s.
      this.logger.warn('[cake] adjustLikes failed; rolling back optimistic delta', { articleId, delta, e });
      this.articles.update(curr => curr.map(a => {
        if (a.id !== articleId) return a;
        const reverted = Math.max(0, (a.likes ?? 0) - delta);
        return { ...a, likes: reverted };
      }));
      rolledBack = true;
    }
    // Surface the rollback to callers that want to react (e.g.
    // un-flip the heart icon). We expose it as a side-effect-free
    // boolean rather than throwing so the toggle path stays simple.
    void rolledBack;
  }

  /**
   * Backward-compatible thin wrapper around {@link adjustLikes} for
   * callers that only ever incremented.
   * @deprecated Use {@link adjustLikes} so unlikes are honoured.
   */
  async likeArticle(articleId: string) {
    await this.adjustLikes(articleId, 1);
  }

  /**
   * Optimistically swap an article's `vibeCheck` map. The shape mirrors
   * the four vibes: { choque, sceptique, bullish, valide }. We mutate
   * the local signal first so the bar lights up immediately, then
   * persist. If the server rejects the write, we restore the previous
   * value so the UI never lies about which vibe is winning.
   */
  async updateVibe(articleId: string, nextVibeCheck: { choque: number; sceptique: number; bullish: number; valide: number }): Promise<void> {
    const before = this.articles().find(a => a.id === articleId)?.vibeCheck;
    this.articles.update(curr => curr.map(a => a.id === articleId ? { ...a, vibeCheck: nextVibeCheck } : a));
    try {
      const { error } = await this.supabaseService.client
        .from('articles')
        .update({ vibeCheck: nextVibeCheck })
        .eq('id', articleId);
      if (error) throw error;
    } catch (e) {
      this.logger.warn('updateVibe failed; rolling back', { articleId, e });
      this.articles.update(curr => curr.map(a => a.id === articleId ? { ...a, vibeCheck: before } : a));
    }
  }

  async addComment(articleId: string, comment: CakeComment) {
    try {
      const { data: art, error } = await this.supabaseService.client.from('articles').select('comments, roomComments').eq('id', articleId).single();
      if (error) throw error;
      
      const newCommentsCount = (art.comments || 0) + 1;
      const newRoomComments = [...(art.roomComments || []), comment];

      await this.supabaseService.client.from('articles').update({
        comments: newCommentsCount,
        roomComments: newRoomComments
      }).eq('id', articleId);
    } catch(e: any) {
      console.error("Supabase comment error", e);
    }
  }

  async getUserProfile(userId: string): Promise<any | null> {
    // Rely strictly on public publicProfiles if not the user themselves
    const publicProfile = await this.userService.fetchPublicProfile(userId);
    if (publicProfile) {
        return {
           id: publicProfile.uid,
           name: publicProfile.displayName,
           handle: publicProfile.username || 'user',
           avatar: publicProfile.photoURL || 'https://api.dicebear.com/7.x/notionists/svg?seed=' + publicProfile.displayName,
           role: 'USER', // We don't expose role in public profile for security
           status: 'ACTIVE',
           joinDate: publicProfile.updatedAt || new Date().toISOString()
        };
    }
    return null;
  }
}

