import { Injectable } from '@angular/core';
import { Article, Comment as CakeComment } from '../../types';
import {
  IArticleApi,
  FeedPage,
  ListFeedOptions,
  VibeKind,
  VibeAggregate,
} from './article-api';

/**
 * In-memory implementation of {@link IArticleApi}.
 *
 * Use cases:
 *   * **Tests** — services that depend on the API can be exercised
 *     without spinning up Supabase. The harness is deterministic.
 *   * **Storybook / design** — preview the UI against a curated mock
 *     dataset, no auth, no network.
 *   * **Offline mode** — a future "read-only / cached" lane could
 *     point the app at this implementation hydrated from the
 *     `OfflineArticleCacheService`.
 *
 * The implementation is intentionally simple: no full-text search,
 * no realtime, no transactions. It does enforce the same return-shape
 * contract as the production adapter so consumers can swap freely.
 */
@Injectable({ providedIn: 'root' })
export class InMemoryArticleApi extends IArticleApi {
  private articles = new Map<string, Article>();
  private commentsByArticle = new Map<string, CakeComment[]>();
  /** comment id → set of user IDs who have liked the comment. */
  private commentLikes = new Map<string, Set<string>>();
  private votes = new Map<string, Map<string, VibeKind>>();
  private listeners = new Set<(articles: Article[]) => void>();
  private currentUserId = 'in-memory-user';

  /** Test helper — seed the store. Replaces existing articles. */
  seed(articles: Article[]): void {
    this.articles.clear();
    for (const a of articles) this.articles.set(a.id, { ...a });
    this.broadcast();
  }

  /** Test helper — change the simulated current user. */
  setCurrentUser(uid: string): void {
    this.currentUserId = uid;
  }

  override async listAllPublished(): Promise<Article[]> {
    return [...this.articles.values()]
      .filter(a => (a.status ?? 'published') === 'published')
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  }

  override async listFeedPage(opts: ListFeedOptions = {}): Promise<FeedPage> {
    const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
    const all = await this.listAllPublished();
    const cursor = opts.cursor;
    const remaining = cursor
      ? all.filter(a => {
          const ats = Date.parse(a.timestamp);
          const cts = Date.parse(cursor.publishedAt);
          if (ats < cts) return true;
          if (ats > cts) return false;
          return a.id < cursor.id;
        })
      : all;
    const page = remaining.slice(0, limit);
    const last = page[page.length - 1];
    const next = page.length === limit && last
      ? { publishedAt: last.timestamp, id: last.id }
      : null;
    return { articles: page, next };
  }

  override async findById(id: string): Promise<Article | null> {
    return this.articles.get(id) ?? null;
  }

  override async upsert(article: Article): Promise<Article> {
    this.articles.set(article.id, { ...article });
    this.broadcast();
    return { ...article };
  }

  override async delete(id: string): Promise<void> {
    this.articles.delete(id);
    this.commentsByArticle.delete(id);
    this.votes.delete(id);
    this.broadcast();
  }

  override async adjustLikes(articleId: string, delta: number): Promise<number> {
    const a = this.articles.get(articleId);
    if (!a) throw new Error('article_not_found');
    const next = Math.max(0, (a.likes ?? 0) + delta);
    a.likes = next;
    this.broadcast();
    return next;
  }

  override async voteVibe(articleId: string, vibe: VibeKind | null): Promise<VibeAggregate> {
    if (!this.articles.get(articleId)) throw new Error('article_not_found');
    let perUser = this.votes.get(articleId);
    if (!perUser) {
      perUser = new Map();
      this.votes.set(articleId, perUser);
    }
    if (vibe === null) perUser.delete(this.currentUserId);
    else perUser.set(this.currentUserId, vibe);

    const aggregate: VibeAggregate = { choque: 0, sceptique: 0, bullish: 0, valide: 0 };
    for (const v of perUser.values()) aggregate[v] += 1;

    const a = this.articles.get(articleId);
    if (a) a.vibeCheck = { ...aggregate };
    this.broadcast();
    return aggregate;
  }

  override async postComment(articleId: string, content: string, _replyToId?: string): Promise<CakeComment> {
    if (!this.articles.get(articleId)) throw new Error('article_not_found');
    const trimmed = content.trim();
    if (!trimmed) throw new Error('empty_content');
    const comment: CakeComment = {
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author: this.currentUserId,
      avatar: '',
      time: new Date().toISOString(),
      content: trimmed,
      likes: 0,
    };
    const list = this.commentsByArticle.get(articleId) ?? [];
    list.push(comment);
    this.commentsByArticle.set(articleId, list);
    const a = this.articles.get(articleId);
    if (a) a.comments = (a.comments ?? 0) + 1;
    this.broadcast();
    return { ...comment };
  }

  override async listComments(articleId: string): Promise<CakeComment[]> {
    return [...(this.commentsByArticle.get(articleId) ?? [])];
  }

  override async toggleCommentLike(commentId: string): Promise<{ liked: boolean; totalLikes: number }> {
    let likers = this.commentLikes.get(commentId);
    if (!likers) {
      likers = new Set();
      this.commentLikes.set(commentId, likers);
    }
    const wasLiked = likers.has(this.currentUserId);
    if (wasLiked) likers.delete(this.currentUserId);
    else likers.add(this.currentUserId);

    // Mirror the count onto the comment row to mirror the SQL RPC.
    for (const list of this.commentsByArticle.values()) {
      const target = list.find(c => c.id === commentId);
      if (target) {
        target.likes = likers.size;
        break;
      }
    }
    return { liked: !wasLiked, totalLikes: likers.size };
  }

  override async listLikedCommentIds(articleId: string): Promise<string[]> {
    const ids: string[] = [];
    const comments = this.commentsByArticle.get(articleId) ?? [];
    for (const c of comments) {
      if (this.commentLikes.get(c.id)?.has(this.currentUserId)) ids.push(c.id);
    }
    return ids;
  }

  override subscribeToArticles(onChange: (articles: Article[]) => void): () => void {
    this.listeners.add(onChange);
    // Fire once immediately so the subscriber gets the current state
    // without waiting for the next mutation.
    void this.listAllPublished().then(onChange);
    return () => { this.listeners.delete(onChange); };
  }

  private broadcast(): void {
    if (this.listeners.size === 0) return;
    void this.listAllPublished().then(list => {
      for (const fn of this.listeners) fn(list);
    });
  }
}
