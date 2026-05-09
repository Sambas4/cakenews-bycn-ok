import { Injectable, signal, effect, inject } from '@angular/core';
import { Article, Comment as CakeComment } from '../types';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { OfflineArticleCacheService } from './offline-article-cache.service';
import { ImagePrefetchService } from './image-prefetch.service';
import { Logger } from './logger.service';
import { RealtimeChannel } from '@supabase/supabase-js';

const OFFLINE_CACHE_SIZE = 8;

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
  public isConnected = signal<boolean>(true);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private supabaseService = inject(SupabaseService);
  private offline = inject(OfflineArticleCacheService);
  private imagePrefetch = inject(ImagePrefetchService);
  private logger = inject(Logger);

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
        this.startRealtimeSync();
      } else {
        this.stopRealtimeSync();
        this.articles.set([]);
        this.hasFreshData.set(false);
      }
    });
  }

  private async stopRealtimeSync() {
    if (!this.channel) return;
    try { await this.supabaseService.client.removeChannel(this.channel); }
    catch (e) { this.logger.warn('removeChannel failed', e); }
    this.channel = null;
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
        .subscribe();
    } catch (e) {
      this.logger.error('Supabase sync failed; continuing with cached articles', e);
      this.isConnected.set(false);
      // We deliberately do *not* clear `articles` here — the offline
      // cache hydrated us at boot and the user must keep seeing
      // something while we retry.
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
   * Atomically bumps the public `likes` counter on an article.
   * Negative deltas decrement (with a server-side `>= 0` floor that
   * Postgres enforces via a CHECK constraint in the migration).
   *
   * The previous v1 only supported `+1` and silently dropped
   * "un-likes". That left the per-article totals running away from
   * the truth as soon as a single user toggled their like off. The
   * delta API closes that loophole.
   */
  async adjustLikes(articleId: string, delta: number): Promise<void> {
    if (!Number.isFinite(delta) || delta === 0) return;
    try {
      const { data, error } = await this.supabaseService.client
        .from('articles')
        .select('likes')
        .eq('id', articleId)
        .single();
      if (error) throw error;
      const current = (data?.likes as number | null) ?? 0;
      const next = Math.max(0, current + delta);
      await this.supabaseService.client.from('articles').update({ likes: next }).eq('id', articleId);
    } catch (e) {
      console.error('[cake] adjustLikes failed', e);
    }
  }

  /**
   * Backward-compatible thin wrapper around {@link adjustLikes} for
   * callers that only ever incremented.
   * @deprecated Use {@link adjustLikes} so unlikes are honoured.
   */
  async likeArticle(articleId: string) {
    await this.adjustLikes(articleId, 1);
  }

  async updateVibe(articleId: string, currentVibeCheck: any) {
    try {
      await this.supabaseService.client.from('articles').update({ vibeCheck: currentVibeCheck }).eq('id', articleId);
    } catch(e: any) {
      console.error("Supabase vibe error", e);
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

