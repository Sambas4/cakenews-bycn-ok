import { InjectionToken } from '@angular/core';
import { Article, Comment as CakeComment } from '../../types';

/**
 * The `IArticleApi` boundary.
 *
 * Why this exists:
 *   * The v1/v2 client called Supabase directly from every service. As
 *     soon as we want to mock the backend in tests, swap providers,
 *     or move counters to a real RPC, the surface area is everywhere.
 *   * This interface gives the rest of the app a *single* typed door
 *     onto the article domain. Concrete implementations
 *     ({@link SupabaseArticleApi}, {@link InMemoryArticleApi}) plug in
 *     via {@link ARTICLE_API}.
 *
 * Design rules:
 *   * Every mutating method returns the canonical post-mutation shape
 *     (e.g. `adjustLikes` returns the new total) so the caller can
 *     reconcile its optimistic local state without a follow-up read.
 *   * Methods that depend on the caller's identity (likes, votes,
 *     comments) read the user from the underlying auth context — the
 *     interface itself stays auth-agnostic.
 */

export interface FeedPageCursor {
  /** ISO timestamp of the last article in the previous page. */
  publishedAt: string;
  /** UUID of the last article in the previous page (tiebreaker). */
  id: string;
}

export interface FeedPage {
  articles: Article[];
  /** Cursor to pass back for the next page; `null` when the end is reached. */
  next: FeedPageCursor | null;
}

export type VibeKind = 'choque' | 'sceptique' | 'bullish' | 'valide';
export type VibeAggregate = Record<VibeKind, number>;

export interface ListFeedOptions {
  cursor?: FeedPageCursor | null;
  limit?: number;
}

/**
 * Typed contract every storage backend must satisfy.
 *
 * Methods are grouped by concern; all are async even when the backend
 * could answer synchronously (in-memory) so the boundary stays
 * agnostic.
 */
export abstract class IArticleApi {
  // -- Read ----------------------------------------------------------
  abstract listAllPublished(): Promise<Article[]>;
  abstract listFeedPage(opts?: ListFeedOptions): Promise<FeedPage>;
  abstract findById(id: string): Promise<Article | null>;

  // -- Write (admin-ish) ---------------------------------------------
  abstract upsert(article: Article): Promise<Article>;
  abstract delete(id: string): Promise<void>;

  // -- Engagement (atomic where the backend supports it) -------------
  abstract adjustLikes(articleId: string, delta: number): Promise<number>;
  abstract voteVibe(articleId: string, vibe: VibeKind | null): Promise<VibeAggregate>;
  abstract postComment(articleId: string, content: string, replyToId?: string): Promise<CakeComment>;
  abstract listComments(articleId: string): Promise<CakeComment[]>;
  /**
   * Atomically flip the caller's like on a single comment.
   * Returns the AFTER state — `liked` for the current user, plus the
   * recomputed total. Implementations must serialise concurrent calls
   * (the Supabase backend uses the `toggle_comment_like` RPC).
   */
  abstract toggleCommentLike(commentId: string): Promise<{ liked: boolean; totalLikes: number }>;
  /**
   * Returns the comment IDs the current user has liked on the given
   * article — used to hydrate the heart icon state at room mount.
   */
  abstract listLikedCommentIds(articleId: string): Promise<string[]>;

  // -- Realtime ------------------------------------------------------
  /**
   * Subscribe to article changes. The callback is invoked with the
   * full updated list on every relevant DB event. Returns an
   * `unsubscribe` function.
   */
  abstract subscribeToArticles(onChange: (articles: Article[]) => void): () => void;
}

export const ARTICLE_API = new InjectionToken<IArticleApi>('IArticleApi');
