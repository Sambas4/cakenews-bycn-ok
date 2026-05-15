import { Injectable, signal, inject } from '@angular/core';
import { Category, UserLocation, UserStats } from '../types';
import { DataService } from './data.service';
import { PrivacyService } from './privacy.service';
import { ReadTimeEstimatorService } from './read-time-estimator.service';
import { Logger } from './logger.service';

/**
 * localStorage may be unavailable (private browsing, disabled by the
 * user, quota exceeded). Wrap every access so a single failure doesn't
 * cascade into a runtime error that breaks the feed.
 */
function safeRead<T>(key: string, fallback: T, logger: Logger): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.warn('interaction.localStorage.read', { key, err });
    return fallback;
  }
}

function safeWrite(key: string, value: unknown, logger: Logger): void {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch (err) {
    logger.warn('interaction.localStorage.write', { key, err });
  }
}

/**
 * Discrete reaction intensity for a forward navigation. Mapping:
 *  - `flick`  : the user dismissed the card before they could have
 *               read anything (≤ 800ms). Treat as violent rejection.
 *  - `fast`   : skimmed the headline/cover (≤ 2 000ms). Mild rejection.
 *  - `normal` : engaged but moved on. Neutral signal.
 *  - `deep`   : substantial dwell relative to expected time.
 *               Strong endorsement.
 */
export type SignalIntensity = 'flick' | 'fast' | 'normal' | 'deep';

const FLICK_MAX_MS = 800;
const FAST_MAX_MS = 2_000;

@Injectable({
  providedIn: 'root'
})
export class InteractionService {
  likedArticles = signal<string[]>([]);
  savedArticles = signal<string[]>([]);
  readArticles = signal<string[]>([]);
  commentedArticles = signal<string[]>([]);
  userInterests = signal<Category[]>([]);
  hasCompletedOnboarding = signal<boolean>(false);
  votedVibes = signal<Record<string, string[]>>({});

  /**
   * Intensity bucket for a forward navigation. The algorithm reacts
   * differently to each — a `flick` is a violent rejection that should
   * push us to flush our buffer, while a `deep` is a strong endorsement.
   */
  // signal-intensity moved to a typed enum for clarity at call-sites.

  sessionHistory = signal<{
    articleId: string;
    category: string;
    author: string;
    durationMs: number;
    expectedDurationMs?: number;
    completionRatio?: number;
    /** Discrete intensity bucket — see {@link SignalIntensity}. */
    intensity?: SignalIntensity;
    timestamp: number;
  }[]>([]);

  private dataService = inject(DataService);
  private privacy = inject(PrivacyService);
  private readEstimator = inject(ReadTimeEstimatorService);
  private logger = inject(Logger);

  userLocation = signal<UserLocation>({
    neighborhood: '',
    city: '',
    country: '',
    isSet: false
  });

  userStats = signal<UserStats>({
    likesGiven: 0,
    likesReceived: 0,
    commentsPosted: 0,
    reportsReceived: 0,
    trustScore: 100
  });

  constructor() {
    this.likedArticles.set(safeRead<string[]>('cake_likes', [], this.logger));
    this.savedArticles.set(safeRead<string[]>('cake_saves', [], this.logger));
    this.readArticles.set(safeRead<string[]>('cake_reads', [], this.logger));
    this.commentedArticles.set(safeRead<string[]>('cake_comments', [], this.logger));
    this.userInterests.set(safeRead<Category[]>('cake_interests', [], this.logger));
    this.hasCompletedOnboarding.set(safeRead<boolean>('cake_onboarding', false, this.logger));
    this.votedVibes.set(safeRead<Record<string, string[]>>('cake_vibes', {}, this.logger));
    this.userLocation.set(safeRead<UserLocation>('cake_location', this.userLocation(), this.logger));
    this.userStats.set(safeRead<UserStats>('cake_stats', this.userStats(), this.logger));
  }

  toggleLike(articleId: string) {
    this.likedArticles.update(likes => {
      const wasLiked = likes.includes(articleId);
      const isLiking = !wasLiked;
      const newLikes = isLiking
        ? [...likes, articleId]
        : likes.filter(id => id !== articleId);

      safeWrite('cake_likes', newLikes, this.logger);

      // Honour both directions: +1 on like, -1 on unlike. The DB layer
      // floors at 0 so a stale unlike can never push the public total
      // negative.
      this.dataService.adjustLikes(articleId, isLiking ? 1 : -1);

      this.userStats.update(stats => {
        const newStats = {
          ...stats,
          likesGiven: Math.max(0, stats.likesGiven + (isLiking ? 1 : -1)),
        };
        safeWrite('cake_stats', newStats, this.logger);
        return newStats;
      });

      return newLikes;
    });
  }

  isLiked(articleId: string): boolean {
    return this.likedArticles().includes(articleId);
  }

  toggleSave(articleId: string) {
    this.savedArticles.update(saves => {
      const newSaves = saves.includes(articleId)
        ? saves.filter(id => id !== articleId)
        : [...saves, articleId];
      safeWrite('cake_saves', newSaves, this.logger);
      return newSaves;
    });
  }

  isSaved(articleId: string): boolean {
    return this.savedArticles().includes(articleId);
  }

  hasVibe(articleId: string, vibe: string): boolean {
    return this.votedVibes()[articleId]?.includes(vibe) || false;
  }

  toggleVibe(articleId: string, vibe: string) {
    this.votedVibes.update(vibes => {
      const articleVibes = vibes[articleId] || [];
      const isAdding = !articleVibes.includes(vibe);
      const newArticleVibes = isAdding ? [vibe] : [];
      
      const newVibes = { ...vibes, [articleId]: newArticleVibes };
      safeWrite('cake_vibes', newVibes, this.logger);

      // Update article stats
      const articles = this.dataService.articles();
      const article = articles.find(a => a.id === articleId);
      if (article) {
        const currentVibeCheck = article.vibeCheck || { choque: 0, sceptique: 0, bullish: 0, valide: 0 };
        const nextVibeCheck = { ...currentVibeCheck };
        
        if (isAdding) {
          // Remove previously voted vibes to enforce 1 vibe per article
          articleVibes.forEach(v => {
            if (v !== vibe) {
              const currentOldVibeCount = nextVibeCheck[v as keyof typeof nextVibeCheck] || 0;
              nextVibeCheck[v as keyof typeof nextVibeCheck] = Math.max(0, currentOldVibeCount - 1);
            }
          });
          const currentCount = nextVibeCheck[vibe as keyof typeof nextVibeCheck] || 0;
          nextVibeCheck[vibe as keyof typeof nextVibeCheck] = currentCount + 1;
        } else {
          const currentCount = nextVibeCheck[vibe as keyof typeof nextVibeCheck] || 0;
          nextVibeCheck[vibe as keyof typeof nextVibeCheck] = Math.max(0, currentCount - 1);
        }

        // Send straight to database
        this.dataService.updateVibe(articleId, nextVibeCheck);
      }

      return newVibes;
    });
  }

  markAsRead(articleId: string) {
    this.readArticles.update(reads => {
      if (reads.includes(articleId)) return reads;
      const newReads = [...reads, articleId];
      safeWrite('cake_reads', newReads, this.logger);
      return newReads;
    });
  }

  toggleUserInterest(category: Category) {
    this.userInterests.update(interests => {
      const newInterests = interests.includes(category)
        ? interests.filter(c => c !== category)
        : [...interests, category];
      safeWrite('cake_interests', newInterests, this.logger);
      return newInterests;
    });
  }

  updateUserLocation(location: Partial<UserLocation>) {
    this.userLocation.update(current => {
      const newLocation = { ...current, ...location, isSet: true };
      safeWrite('cake_location', newLocation, this.logger);
      return newLocation;
    });
  }

  logSessionRead(articleId: string, durationMs: number) {
    // Private mode: no session signal ever leaves the page.
    if (this.privacy.enabled()) return;

    const article = this.dataService.articles().find(a => a.id === articleId);
    if (!article) return;

    const est = this.readEstimator.estimate(article);
    const completionRatio = est.expectedMs > 0 ? durationMs / est.expectedMs : 0;
    const intensity = this.classifyIntensity(durationMs, completionRatio);

    this.sessionHistory.update(history => [
      ...history,
      {
        articleId,
        category: article.category,
        author: article.author,
        durationMs,
        expectedDurationMs: est.expectedMs,
        completionRatio,
        intensity,
        timestamp: Date.now(),
      },
    ]);
  }

  /**
   * Maps a raw dwell time into the intensity bucket downstream services
   * (CircuitBreaker, ReactiveFeedBuffer) consume to decide how violently
   * to re-strategise.
   */
  private classifyIntensity(durationMs: number, completionRatio: number): SignalIntensity {
    if (durationMs <= FLICK_MAX_MS) return 'flick';
    if (durationMs <= FAST_MAX_MS) return 'fast';
    if (completionRatio >= 0.7) return 'deep';
    return 'normal';
  }

  logComment(articleId: string) {
    this.commentedArticles.update(comments => {
      if (comments.includes(articleId)) return comments;
      const newComments = [...comments, articleId];
      safeWrite('cake_comments', newComments, this.logger);
      return newComments;
    });
    
    // Increment external user stats as well
    this.userStats.update(stats => {
      const newStats = { ...stats, commentsPosted: stats.commentsPosted + 1 };
      safeWrite('cake_stats', newStats, this.logger);
      return newStats;
    });
  }

  completeOnboarding() {
    this.hasCompletedOnboarding.set(true);
    safeWrite('cake_onboarding', 'true', this.logger);
  }
}
