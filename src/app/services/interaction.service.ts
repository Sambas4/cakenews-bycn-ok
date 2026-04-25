import { Injectable, signal, inject } from '@angular/core';
import { Category, UserLocation, UserStats } from '../types';
import { DataService } from './data.service';

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

  sessionHistory = signal<{
    articleId: string;
    category: string;
    author: string;
    durationMs: number;
    expectedDurationMs?: number;
    completionRatio?: number;
    timestamp: number;
  }[]>([]);

  private dataService = inject(DataService);

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
      const isLiking = !likes.includes(articleId);
      const newLikes = isLiking
        ? [...likes, articleId]
        : likes.filter(id => id !== articleId);
        
      localStorage.setItem('cake_likes', JSON.stringify(newLikes));
      
      // Tell dataService to increment/decrement in DB directly!
      if (isLiking) {
        this.dataService.likeArticle(articleId);
      } else {
        // Technically not implemented yet in DataService (decrement), but for now we skip decrement or implement later
      }

      // Update user stats
      this.userStats.update(stats => {
        const newStats = {
          ...stats,
          likesGiven: stats.likesGiven + (isLiking ? 1 : -1)
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
    const article = this.dataService.articles().find(a => a.id === articleId);
    if (!article) return;

    // L'attention réelle se base sur la complétion, pas le temps absolu
    const wordCount = article.content ? article.content.split(/\s+/).length : 50;
    const expectedDurationMs = Math.max(wordCount * 330, 3000); // ~3 mots/sec, min 3s
    const completionRatio = durationMs / expectedDurationMs;

    this.sessionHistory.update(history => {
       const newEvent = {
         articleId,
         category: article.category,
         author: article.author,
         durationMs,
         expectedDurationMs,
         completionRatio,
         timestamp: Date.now()
       };
       return [...history, newEvent];
    });
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
