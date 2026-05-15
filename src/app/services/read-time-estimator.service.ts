import { Injectable } from '@angular/core';
import { Article, Category } from '../types';

export interface ReadEstimate {
  /** Approximate word count derived from the article content. */
  wordCount: number;
  /** Words-per-minute rate the algorithm should plan for. */
  wpm: number;
  /** Expected read duration in milliseconds. */
  expectedMs: number;
  /** Confidence in the estimate, 0..1. Drives downstream weighting. */
  confidence: number;
}

const BASE_WPM = 220;

const FORMAT_WPM: Record<string, number> = {
  Snackable: 260,
  LongRead: 200,
  Video: 0,
  Visual: 240,
};

const COMPLEXITY_PENALTY: Record<string, number> = {
  Beginner: 1.05,
  Mainstream: 1.0,
  Expert: 0.85,
};

/**
 * Per-category baseline word count when an article has no usable
 * `content` field. Saves us from the v2 bug where `wordCount` collapsed
 * to a constant `50` for every short article and turned every dwell
 * into the same `completionRatio`.
 */
const CATEGORY_FALLBACK_WORDS: Partial<Record<Category, number>> = {
  Politique: 700, International: 700, Économie: 750, Justice: 650,
  Environnement: 650, Société: 600,
  Tech: 650, IA: 700, Crypto: 600, Science: 750, Espace: 650, Startups: 600,
  Culture: 550, Mode: 400, Luxe: 500, Food: 350, Voyage: 500, Architecture: 500,
  Cinéma: 500, Musique: 400, People: 350, Gaming: 450, Manga: 400, Humour: 250,
  Football: 450, NBA: 450, F1: 450, MMA: 400, Tennis: 400,
  Guerre: 800, 'Faits Divers': 500, Paranormal: 500, 'Opinion Choc': 600,
  Mature: 400, Nudité: 250, Charme: 250,
};

const VIDEO_DEFAULT_MS = 60_000; // 60s if no metadata

/**
 * Computes an honest expected read time for an article.
 *
 * The v2 algorithm's biggest bug — a single circular wordCount
 * default of 250 across every article — collapsed `completionRatio`
 * into noise. Skip detection became unreliable; the engine could not
 * tell a 1.2s flick from a thoughtful 18s pause on a 60-word flash.
 *
 * Strategy:
 *   1. Use the actual `content` field when available — split on word
 *      boundaries, ignore HTML, never silently fall back.
 *   2. Otherwise honour `metadata.format` (Snackable / Video / Visual).
 *   3. Otherwise pick a category-aware floor — political longreads do
 *      not read at the same pace as a People flash.
 *   4. Compute expected duration from words / wpm with a complexity
 *      multiplier; bound below 2s and above 10 minutes so a glitchy
 *      timestamp can never produce nonsense.
 */
@Injectable({ providedIn: 'root' })
export class ReadTimeEstimatorService {
  estimate(article: Article): ReadEstimate {
    const fmt = article.metadata?.format;

    // Pure video posts: budget on the video's natural duration.
    if (fmt === 'Video' && !article.content) {
      return { wordCount: 0, wpm: 0, expectedMs: VIDEO_DEFAULT_MS, confidence: 0.55 };
    }

    let wordCount = this.countWords(article.content);
    let confidence = 0.9;

    if (wordCount < 30) {
      // Use format hint or category fallback when content is missing.
      const fallback = (fmt && CATEGORY_FALLBACK_WORDS[article.category])
        ?? CATEGORY_FALLBACK_WORDS[article.category]
        ?? 350;
      wordCount = Math.max(wordCount, fallback);
      confidence = 0.55;
    }

    const wpm = (fmt && FORMAT_WPM[fmt]) ?? BASE_WPM;
    const complexity = (article.metadata?.complexity && COMPLEXITY_PENALTY[article.metadata.complexity]) ?? 1.0;
    const expectedMs = Math.min(
      Math.max((wordCount / Math.max(wpm, 60)) * 60_000 * (1 / complexity), 2_500),
      10 * 60 * 1000,
    );

    return { wordCount, wpm, expectedMs: Math.round(expectedMs), confidence };
  }

  private countWords(content: string | undefined): number {
    if (!content) return 0;
    // Strip simple HTML tags, collapse whitespace, count Unicode words.
    const stripped = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!stripped) return 0;
    return stripped.split(' ').filter(w => w.length > 0).length;
  }
}
