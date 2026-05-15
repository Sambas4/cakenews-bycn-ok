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
  /** Set of comment IDs the current viewer has liked. */
  likedIds: Set<string>;
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

  /** Reactive accessor for the current viewer's liked-comment IDs. */
  likedIdsFor(articleId: string) {
    return computed(() => this.state()[articleId]?.likedIds ?? new Set<string>());
  }

  isLoaded(articleId: string): boolean {
    return Boolean(this.state()[articleId]?.loaded);
  }

  /** Fetch the comment list (and the viewer's like graph) once per
   *  article. Returns the cached value on subsequent calls so the
   *  room tab opens instantly. */
  async list(articleId: string): Promise<CakeComment[]> {
    if (!articleId) return [];
    const existing = this.state()[articleId];
    if (existing?.loaded) return existing.comments;

    try {
      const [fresh, liked] = await Promise.all([
        this.api.listComments(articleId),
        this.auth.currentUser() ? this.api.listLikedCommentIds(articleId) : Promise.resolve([] as string[]),
      ]);
      this.state.update(s => ({
        ...s,
        [articleId]: { comments: fresh, loaded: true, likedIds: new Set(liked) },
      }));
      return fresh;
    } catch (e) {
      this.logger.warn('CommentService.list failed', e);
      // Mark as loaded so the UI doesn't infinite-spin; comments stay
      // empty and the user gets to retry by re-entering the room.
      this.state.update(s => ({
        ...s,
        [articleId]: {
          comments: existing?.comments ?? [],
          loaded: true,
          likedIds: existing?.likedIds ?? new Set<string>(),
        },
      }));
      return existing?.comments ?? [];
    }
  }

  /**
   * Optimistically toggle a like on a comment. Bumps/decrements the
   * local counter, fires the RPC, and reconciles with the server's
   * authoritative aggregate. On failure, rolls back the local edit
   * and surfaces a discreet toast.
   */
  async toggleLike(articleId: string, commentId: string): Promise<void> {
    if (!articleId || !commentId) return;
    const before = this.state()[articleId];
    if (!before) return;

    const wasLiked = before.likedIds.has(commentId);
    const optimisticDelta = wasLiked ? -1 : 1;
    const nextLikedIds = new Set(before.likedIds);
    if (wasLiked) nextLikedIds.delete(commentId);
    else nextLikedIds.add(commentId);

    // 1) Optimistic patch.
    this.state.update(s => {
      const curr = s[articleId];
      if (!curr) return s;
      return {
        ...s,
        [articleId]: {
          ...curr,
          likedIds: nextLikedIds,
          comments: curr.comments.map(c =>
            c.id === commentId
              ? { ...c, likes: Math.max(0, (c.likes ?? 0) + optimisticDelta) }
              : c
          ),
        },
      };
    });

    try {
      const { liked, totalLikes } = await this.api.toggleCommentLike(commentId);
      // 2) Reconcile with the server's authoritative state. The set
      // and the counter both come from the RPC.
      this.state.update(s => {
        const curr = s[articleId];
        if (!curr) return s;
        const reconciledLiked = new Set(curr.likedIds);
        if (liked) reconciledLiked.add(commentId);
        else reconciledLiked.delete(commentId);
        return {
          ...s,
          [articleId]: {
            ...curr,
            likedIds: reconciledLiked,
            comments: curr.comments.map(c =>
              c.id === commentId ? { ...c, likes: totalLikes } : c
            ),
          },
        };
      });
    } catch (e) {
      // 3) Rollback to the pre-toggle state.
      this.logger.warn('CommentService.toggleLike failed; rolling back', e);
      this.state.update(s => ({ ...s, [articleId]: before }));
      this.toast.showToast("Le vote n'a pas pu être enregistré", 'warning');
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
      const curr = s[articleId] ?? { comments: [], loaded: true, likedIds: new Set<string>() };
      return {
        ...s,
        [articleId]: {
          ...curr,
          comments: [...curr.comments, placeholder],
          loaded: true,
        },
      };
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
