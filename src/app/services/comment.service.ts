import { Injectable, computed, inject, signal } from '@angular/core';
import { Comment as CakeComment } from '../types';
import { ARTICLE_API, IArticleApi } from './api/article-api';
import { Logger } from './logger.service';
import { ToastService } from './toast.service';
import { UserService } from './user.service';
import { AuthService } from './auth.service';

interface PerArticleState {
  comments: CakeComment[];
  loaded: boolean;
}

const PENDING_PREFIX = 'pending-';

/**
 * Article-scoped comment store.
 *
 * Why a service instead of inline component state:
 *   * Comments live in their own Postgres table now
 *     (`article_comments`, see migration 0001) — they no longer
 *     piggyback on the article row. The room module can't read them
 *     from `Article.roomComments` any more.
 *   * The `room` view is mounted once per visible article in the feed
 *     buffer; we want one cache shared across all those instances so
 *     swiping forward and back does not refetch.
 *   * Optimistic posts need a single source of truth for the
 *     pending-vs-confirmed reconciliation.
 *
 * Strategy:
 *   * Per-article cache keyed by articleId, lazily populated by
 *     `list(articleId)`.
 *   * `post(articleId, content, replyTo?)` inserts a `pending-…`
 *     comment immediately (optimism), then calls the IArticleApi
 *     RPC, then swaps the placeholder for the real row.
 *   * On RPC failure, we drop the placeholder and surface a toast.
 */
@Injectable({ providedIn: 'root' })
export class CommentService {
  private api = inject<IArticleApi>(ARTICLE_API);
  private logger = inject(Logger);
  private toast = inject(ToastService);
  private user = inject(UserService);
  private auth = inject(AuthService);

  private state = signal<Record<string, PerArticleState>>({});

  /** Reactive accessor — the room module reads this for live re-render. */
  commentsFor(articleId: string) {
    return computed(() => this.state()[articleId]?.comments ?? []);
  }

  isLoaded(articleId: string): boolean {
    return Boolean(this.state()[articleId]?.loaded);
  }

  /** Fetch the comment list once per article. Returns the cached value
   *  on subsequent calls so the room tab opens instantly. */
  async list(articleId: string): Promise<CakeComment[]> {
    if (!articleId) return [];
    const existing = this.state()[articleId];
    if (existing?.loaded) return existing.comments;

    try {
      const fresh = await this.api.listComments(articleId);
      this.state.update(s => ({
        ...s,
        [articleId]: { comments: fresh, loaded: true },
      }));
      return fresh;
    } catch (e) {
      this.logger.warn('CommentService.list failed', e);
      // Mark as loaded so the UI doesn't infinite-spin; comments stay
      // empty and the user gets to retry by re-entering the room.
      this.state.update(s => ({
        ...s,
        [articleId]: { comments: existing?.comments ?? [], loaded: true },
      }));
      return existing?.comments ?? [];
    }
  }

  /**
   * Post optimistically. Steps:
   *   1. Build a `pending-{ts}` placeholder so the UI flashes the
   *      comment under the composer immediately.
   *   2. Fire the API call.
   *   3. On success, swap the placeholder for the canonical row.
   *   4. On failure, remove the placeholder and toast.
   */
  async post(articleId: string, content: string, replyTo?: CakeComment): Promise<CakeComment | null> {
    const trimmed = content.trim();
    if (!trimmed || !articleId) return null;

    const profile = this.user.currentUserProfile();
    const placeholder: CakeComment = {
      id: `${PENDING_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author: profile?.username || profile?.displayName || 'Toi',
      avatar: profile?.photoURL || profile?.avatarUrl
        || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(profile?.displayName ?? 'You')}`,
      time: this.formatTime(new Date()),
      content: trimmed,
      likes: 0,
      ...(replyTo ? { replyTo: { author: replyTo.author, content: replyTo.content } } : {}),
    };

    // 1) Optimistic insert.
    this.state.update(s => {
      const curr = s[articleId] ?? { comments: [], loaded: true };
      return { ...s, [articleId]: { comments: [...curr.comments, placeholder], loaded: true } };
    });

    try {
      const real = await this.api.postComment(articleId, trimmed, replyTo?.id);
      // 2) Swap placeholder for the canonical row. We also reuse the
      // placeholder's avatar/author since the API returns only the uid;
      // a future Profile-Resolver step will replace these properly.
      const enriched: CakeComment = {
        ...real,
        author: placeholder.author,
        avatar: placeholder.avatar,
        time: this.formatTime(new Date(real.time)),
        ...(replyTo ? { replyTo: { author: replyTo.author, content: replyTo.content } } : {}),
      };
      this.state.update(s => {
        const curr = s[articleId];
        if (!curr) return s;
        return {
          ...s,
          [articleId]: {
            ...curr,
            comments: curr.comments.map(c => c.id === placeholder.id ? enriched : c),
          },
        };
      });
      return enriched;
    } catch (e) {
      // 3) Rollback.
      this.logger.error('CommentService.post', e);
      this.state.update(s => {
        const curr = s[articleId];
        if (!curr) return s;
        return {
          ...s,
          [articleId]: { ...curr, comments: curr.comments.filter(c => c.id !== placeholder.id) },
        };
      });
      this.toast.showToast('Le commentaire n\'a pas été publié', 'error');
      return null;
    }
  }

  /** Drop the cache for an article — used after an admin moderation. */
  invalidate(articleId: string): void {
    this.state.update(s => {
      const next = { ...s };
      delete next[articleId];
      return next;
    });
  }

  /** Wipe everything — called by the LocalStorageCleaner on logout. */
  clearAll(): void { this.state.set({}); }

  // --------------------------------------------------------------

  private formatTime(d: Date): string {
    if (Number.isNaN(d.getTime())) return '';
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }
}
