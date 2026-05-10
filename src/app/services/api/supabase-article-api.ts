import { Injectable, inject } from '@angular/core';
import { Article, Comment as CakeComment } from '../../types';
import { SupabaseService } from '../supabase.service';
import { Logger } from '../logger.service';
import {
  IArticleApi,
  FeedPage,
  FeedPageCursor,
  ListFeedOptions,
  VibeKind,
  VibeAggregate,
} from './article-api';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Concrete `IArticleApi` backed by Supabase + the atomic RPCs declared
 * in `supabase/migrations/0003_atomic_rpc.sql`.
 *
 * Implementation notes:
 *  * Engagement methods route through RPC functions
 *    (`adjust_article_likes`, `vote_article_vibe`,
 *    `post_article_comment`) so concurrent updates don't lose
 *    increments — the v2 read-modify-write loop is gone.
 *  * `listFeedPage` calls `list_feed_page(...)` for cursor pagination.
 *  * `subscribeToArticles` reuses Supabase's postgres_changes channel
 *    and re-emits the *full* list to subscribers, which keeps the
 *    upstream consumers (DataService) trivially correct.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseArticleApi extends IArticleApi {
  private supabase = inject(SupabaseService);
  private logger = inject(Logger);

  override async listAllPublished(): Promise<Article[]> {
    const { data, error } = await this.supabase.client
      .from('articles')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false });
    if (error) throw error;
    return (data as Article[] | null) ?? [];
  }

  override async listFeedPage(opts: ListFeedOptions = {}): Promise<FeedPage> {
    const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
    const { data, error } = await this.supabase.client
      .rpc('list_feed_page', {
        p_after_published: opts.cursor?.publishedAt ?? null,
        p_after_id: opts.cursor?.id ?? null,
        p_limit: limit,
      });
    if (error) throw error;

    const articles = (data as Article[] | null) ?? [];
    const last = articles[articles.length - 1];
    const next: FeedPageCursor | null = articles.length === limit && last
      ? { publishedAt: this.publishedAtOf(last), id: last.id }
      : null;
    return { articles, next };
  }

  override async findById(id: string): Promise<Article | null> {
    const { data, error } = await this.supabase.client
      .from('articles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as Article | null) ?? null;
  }

  override async upsert(article: Article): Promise<Article> {
    const { data, error } = await this.supabase.client
      .from('articles')
      .upsert(article)
      .select()
      .single();
    if (error) throw error;
    return data as Article;
  }

  override async delete(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('articles').delete().eq('id', id);
    if (error) throw error;
  }

  override async adjustLikes(articleId: string, delta: number): Promise<number> {
    const { data, error } = await this.supabase.client.rpc('adjust_article_likes', {
      p_article_id: articleId,
      p_delta: delta,
    });
    if (error) throw error;
    return (data as number | null) ?? 0;
  }

  override async voteVibe(articleId: string, vibe: VibeKind | null): Promise<VibeAggregate> {
    const { data, error } = await this.supabase.client.rpc('vote_article_vibe', {
      p_article_id: articleId,
      p_vibe: vibe,
    });
    if (error) throw error;
    const out = (data as Partial<VibeAggregate> | null) ?? {};
    return {
      choque:    out.choque    ?? 0,
      sceptique: out.sceptique ?? 0,
      bullish:   out.bullish   ?? 0,
      valide:    out.valide    ?? 0,
    };
  }

  override async postComment(articleId: string, content: string, replyToId?: string): Promise<CakeComment> {
    const { data, error } = await this.supabase.client.rpc('post_article_comment', {
      p_article_id: articleId,
      p_content: content,
      p_reply_to: replyToId ?? null,
    });
    if (error) throw error;
    const id = data as string;
    // Re-read so we get the canonical timestamp + author info populated
    // by the RPC's SECURITY DEFINER context.
    const { data: row, error: readErr } = await this.supabase.client
      .from('article_comments')
      .select('id, author_uid, content, created_at, likes, reply_to_id')
      .eq('id', id)
      .single();
    if (readErr) throw readErr;
    return this.toCakeComment(row);
  }

  override async toggleCommentLike(commentId: string): Promise<{ liked: boolean; totalLikes: number }> {
    const { data, error } = await this.supabase.client.rpc('toggle_comment_like', {
      p_comment_id: commentId,
    });
    if (error) throw error;
    // The RPC returns a single-row table; supabase-js surfaces it as
    // an array of objects when `returns table(...)` is used.
    const row = Array.isArray(data) ? data[0] : data;
    return {
      liked: Boolean((row as { liked?: boolean })?.liked),
      totalLikes: Number((row as { total_likes?: number })?.total_likes ?? 0),
    };
  }

  override async listLikedCommentIds(articleId: string): Promise<string[]> {
    const { data, error } = await this.supabase.client.rpc('list_liked_comments', {
      p_article_id: articleId,
    });
    if (error) throw error;
    const rows = (data as Array<{ comment_id?: string } | string> | null) ?? [];
    return rows.map(r => (typeof r === 'string' ? r : r?.comment_id ?? '')).filter(Boolean);
  }

  override async listComments(articleId: string): Promise<CakeComment[]> {
    const { data, error } = await this.supabase.client
      .from('article_comments')
      .select('id, author_uid, content, created_at, likes, reply_to_id')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return ((data as unknown[] | null) ?? []).map(r => this.toCakeComment(r));
  }

  override subscribeToArticles(onChange: (articles: Article[]) => void): () => void {
    const channelName = `articles-${Math.random().toString(36).slice(2)}`;
    let channel: RealtimeChannel | null = null;

    const refetchAndEmit = async () => {
      try { onChange(await this.listAllPublished()); }
      catch (e) { this.logger.warn('subscribeToArticles refetch failed', e); }
    };

    channel = this.supabase.client
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, () => {
        void refetchAndEmit();
      })
      .subscribe();

    return () => {
      if (channel) {
        try { void this.supabase.client.removeChannel(channel); }
        catch (e) { this.logger.warn('subscribeToArticles cleanup failed', e); }
      }
    };
  }

  // --------------------------------------------------------------

  private publishedAtOf(a: Article): string {
    // Fall back to `timestamp` if the migration column hasn't backfilled
    // `published_at` yet on legacy rows.
    return ((a as unknown as { published_at?: string }).published_at) ?? a.timestamp;
  }

  private toCakeComment(row: unknown): CakeComment {
    const r = row as {
      id: string;
      author_uid: string;
      content: string;
      created_at: string;
      likes?: number;
      reply_to_id?: string | null;
    };
    return {
      id: r.id,
      author: r.author_uid,
      avatar: '',
      time: r.created_at,
      content: r.content,
      likes: r.likes ?? 0,
    };
  }
}
