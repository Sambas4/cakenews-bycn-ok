import { Injectable, inject } from '@angular/core';
import { Article, Tag } from '../types';
import { Logger } from './logger.service';

export type Tone = 'Analytique' | 'Inspirant' | 'Polémique' | 'Divertissant' | 'Factuel';
export type Format = 'LongRead' | 'Snackable' | 'Video' | 'Visual';
export type Complexity = 'Beginner' | 'Mainstream' | 'Expert';

export interface ArticleTagging {
  tone: Tone;
  format: Format;
  complexity: Complexity;
  tags: Tag[];
  /** 0..1 — confidence of the inferred metadata. */
  confidence: number;
  /** Whether the inference came from a remote LLM. */
  aiGenerated: boolean;
}

/**
 * Provider contract. A real deployment plugs a Claude / Gemini / etc.
 * Edge Function here. We deliberately keep the interface minimal so
 * any backend can implement it cheaply.
 */
export abstract class AutoTaggerProvider {
  abstract tag(article: Article): Promise<ArticleTagging>;
}

const TONE_PATTERNS: Array<{ tone: Tone; needles: RegExp }> = [
  { tone: 'Analytique',   needles: /\b(analyse|enquête|décrypt|rapport|étude|chiffres?)\b/i },
  { tone: 'Polémique',    needles: /\b(scandale|polémique|fracas|colère|dénonce|attaque)\b/i },
  { tone: 'Inspirant',    needles: /\b(inspir|réussite|hommage|talent|prouesse|exemplaire)\b/i },
  { tone: 'Divertissant', needles: /\b(buzz|fun|insolite|fou rire|hilarant|drôle)\b/i },
  { tone: 'Factuel',      needles: /\b(officiel|annonce|déclare|confirme|publie)\b/i },
];

/**
 * Auto-tagger service.
 *
 * Why critical: the v2 algorithm computed ~40% of its score from
 * `metadata.tone / format / complexity`. Articles missing that block
 * (most of them, in practice) collapsed into noise. This service
 * guarantees every article exposes a usable tagging triple, falling
 * back to fast heuristics when no AI provider is wired.
 *
 * Two layers:
 *   1. Local heuristics — instant, deterministic, ~70% accurate. Safe
 *      to apply on every read.
 *   2. AI provider (optional) — accuracy boost, opt-in via DI. The
 *      result is cached per article so we never pay twice.
 *
 * The service NEVER mutates the article in place — it returns a
 * tagging snapshot. Mutation belongs to the studio (publish path).
 */
@Injectable({ providedIn: 'root' })
export class AutoTaggerService {
  private logger = inject(Logger);
  private provider = inject(AutoTaggerProvider, { optional: true });

  private cache = new Map<string, ArticleTagging>();

  /**
   * Synchronous tagging. Returns the existing metadata if present,
   * otherwise an inferred fallback. Safe to call on every render.
   */
  syncTag(article: Article): ArticleTagging {
    if (article.metadata) {
      return {
        tone: article.metadata.tone,
        format: article.metadata.format,
        complexity: article.metadata.complexity,
        tags: article.tags ?? article.metadata.tags ?? [],
        confidence: 1,
        aiGenerated: false,
      };
    }
    const cached = this.cache.get(article.id);
    if (cached) return cached;
    const inferred = this.heuristic(article);
    this.cache.set(article.id, inferred);
    return inferred;
  }

  /**
   * Asynchronous tagging — calls the AI provider when wired. Falls
   * back transparently to {@link syncTag} on error or when no provider
   * is bound. Result is cached.
   */
  async tag(article: Article): Promise<ArticleTagging> {
    const snap = this.syncTag(article);
    if (snap.confidence >= 0.95 || !this.provider) return snap;
    try {
      const remote = await this.provider.tag(article);
      this.cache.set(article.id, remote);
      return remote;
    } catch (e) {
      this.logger.warn('auto-tagger remote failed', e);
      return snap;
    }
  }

  // ────────────────────────────────────────────────────────────────

  private heuristic(article: Article): ArticleTagging {
    const tone = this.guessTone(article);
    const format = this.guessFormat(article);
    const complexity = this.guessComplexity(article);
    const tags = this.guessTags(article);
    return { tone, format, complexity, tags, confidence: 0.65, aiGenerated: false };
  }

  private guessTone(article: Article): Tone {
    const haystack = `${article.title} ${article.summary ?? ''}`;
    for (const { tone, needles } of TONE_PATTERNS) {
      if (needles.test(haystack)) return tone;
    }
    // Fall back per category.
    if (['Économie', 'Tech', 'IA', 'Science', 'Politique', 'Justice'].includes(article.category)) return 'Analytique';
    if (['Humour', 'People', 'Manga', 'Gaming'].includes(article.category)) return 'Divertissant';
    if (['Opinion Choc', 'Faits Divers', 'Guerre'].includes(article.category)) return 'Polémique';
    if (['Culture', 'Architecture', 'Voyage', 'Mode'].includes(article.category)) return 'Inspirant';
    return 'Factuel';
  }

  private guessFormat(article: Article): Format {
    if (article.videoUrl) return 'Video';
    const wordCount = (article.content ?? '').split(/\s+/).filter(Boolean).length;
    if (wordCount > 600) return 'LongRead';
    if (wordCount < 80) return 'Snackable';
    if (article.imageUrl && !article.content) return 'Visual';
    return 'Snackable';
  }

  private guessComplexity(article: Article): Complexity {
    const title = article.title || '';
    if (/\b(BCE|FED|géopolitique|macroéconomique|épistémologie|quantique|protocole)\b/i.test(title)) {
      return 'Expert';
    }
    if (/\b(débute|guide|comprendre|expliqu|qu'est-ce|c'est quoi)\b/i.test(title)) {
      return 'Beginner';
    }
    return 'Mainstream';
  }

  /**
   * Pulls a few candidate tags from the title (capitalised tokens of
   * length ≥ 3 that aren't sentence starters). Cheap, conservative,
   * works for proper nouns / brands without polluting search with
   * stopwords.
   */
  private guessTags(article: Article): Tag[] {
    if (article.tags && article.tags.length > 0) return article.tags;
    const out = new Set<Tag>();
    const tokens = (article.title ?? '').split(/[\s,;:!?]+/);
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i] ?? '';
      if (t.length < 3) continue;
      if (i === 0) continue;
      if (/^[A-ZÀ-Ý][A-Za-zÀ-ÿ-]{2,}$/.test(t)) out.add(t);
      if (out.size >= 5) break;
    }
    return [...out];
  }
}
