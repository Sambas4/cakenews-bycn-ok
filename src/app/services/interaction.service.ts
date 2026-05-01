import { Injectable, signal, inject } from '@angular/core';
import { Category, UserLocation, UserStats } from '../types';
import { DataService } from './data.service';
import { PrivacyService } from './privacy.service';
import { ReadTimeEstimatorService } from './read-time-estimator.service';

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
    const savedLikes = localStorage.getItem('cake_likes');
    if (savedLikes) this.likedArticles.set(JSON.parse(savedLikes));

    const savedSaves = localStorage.getItem('cake_saves');
    if (savedSaves) this.savedArticles.set(JSON.parse(savedSaves));

    const savedReads = localStorage.getItem('cake_reads');
    if (savedReads) this.readArticles.set(JSON.parse(savedReads));

    const savedComments = localStorage.getItem('cake_comments');
    if (savedComments) this.commentedArticles.set(JSON.parse(savedComments));

    const savedInterests = localStorage.getItem('cake_interests');
    if (savedInterests) this.userInterests.set(JSON.parse(savedInterests));

    const savedOnboarding = localStorage.getItem('cake_onboarding');
    if (savedOnboarding) this.hasCompletedOnboarding.set(JSON.parse(savedOnboarding));
    
    const savedVibes = localStorage.getItem('cake_vibes');
    if (savedVibes) this.votedVibes.set(JSON.parse(savedVibes));

    const savedLocation = localStorage.getItem('cake_location');
    if (savedLocation) this.userLocation.set(JSON.parse(savedLocation));

    const savedStats = localStorage.getItem('cake_stats');
    if (savedStats) this.userStats.set(JSON.parse(savedStats));
  }

  toggleLike(articleId: string) {
    this.likedArticles.update(likes => {
      const wasLiked = likes.includes(articleId);
      const isLiking = !wasLiked;
      const newLikes = isLiking
        ? [...likes, articleId]
        : likes.filter(id => id !== articleId);

      localStorage.setItem('cake_likes', JSON.stringify(newLikes));

      // Honour both directions: +1 on like, -1 on unlike. The DB layer
      // floors at 0 so a stale unlike can never push the public total
      // negative.
      this.dataService.adjustLikes(articleId, isLiking ? 1 : -1);

      this.userStats.update(stats => {
        const newStats = {
          ...stats,
          likesGiven: Math.max(0, stats.likesGiven + (isLiking ? 1 : -1)),
        };
        localStorage.setItem('cake_stats', JSON.stringify(newStats));
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
      localStorage.setItem('cake_saves', JSON.stringify(newSaves));
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
      localStorage.setItem('cake_vibes', JSON.stringify(newVibes));

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
      localStorage.setItem('cake_reads', JSON.stringify(newReads));
      return newReads;
    });
  }

  toggleUserInterest(category: Category) {
    this.userInterests.update(interests => {
      const newInterests = interests.includes(category)
        ? interests.filter(c => c !== category)
        : [...interests, category];
      localStorage.setItem('cake_interests', JSON.stringify(newInterests));
      return newInterests;
    });
  }

  updateUserLocation(location: Partial<UserLocation>) {
    this.userLocation.update(current => {
      const newLocation = { ...current, ...location, isSet: true };
      localStorage.setItem('cake_location', JSON.stringify(newLocation));
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
      localStorage.setItem('cake_comments', JSON.stringify(newComments));
      return newComments;
    });
    
    // Increment external user stats as well
    this.userStats.update(stats => {
      const newStats = { ...stats, commentsPosted: stats.commentsPosted + 1 };
      localStorage.setItem('cake_stats', JSON.stringify(newStats));
      return newStats;
    });
  }

  completeOnboarding() {
    this.hasCompletedOnboarding.set(true);
    localStorage.setItem('cake_onboarding', 'true');
  }
}
