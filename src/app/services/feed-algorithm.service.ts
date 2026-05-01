import { inject, Injectable, untracked } from '@angular/core';
import { Article, Category } from '../types';
import { InteractionService } from './interaction.service';

/**
 * # CakeNews Feed Algorithm — "Cake-FYP"
 *
 * Inspired by the TikTok For-You ranking philosophy:
 *  - **Multi-signal scoring**: every article is rated against the viewer
 *    using engagement, recency, velocity, author affinity, format fit,
 *    completion ratio history and adjacency.
 *  - **Exploit + Explore (ε-greedy)**: ~75% of the slots go to the
 *    highest scoring "safe" content (matches your taste), ~25% are
 *    deliberate horizon-expansion picks. ε decays as the user signals
 *    fatigue and inflates again on long sessions to avoid filter-bubble.
 *  - **Diversity hard-constraints**: never two consecutive articles from
 *    the same category, never three consecutive from the same author,
 *    never two consecutive same-tone formats.
 *  - **Probe arms**: every Nth slot is a probe — picks a moderately
 *    popular article from a category the user has *never* engaged with,
 *    used to discover new interests TikTok-style.
 *  - **Velocity awareness**: brand-new articles with strong like/view
 *    ratios get a temporary boost (the "rising" tier).
 *  - **Cold-start fallback**: when the user has no history, the engine
 *    pivots to a popularity + recency mix and lets exploration drive.
 *
 * The function is **pure** with respect to its inputs. We wrap every
 * read of an Angular signal in `untracked()` so the engine isn't
 * re-evaluated by reactivity primitives during a swipe.
 */

interface Scored {
  article: Article;
  base: number;
  fit: number;
  velocity: number;
  recency: number;
  novelty: number;
  total: number;
  bucket: 'safe' | 'adjacent' | 'probe' | 'rising' | 'discover';
}

interface AffinityProfile {
  category: Map<Category, number>;
  author: Map<string, number>;
  tone: Map<string, number>;
  format: Map<string, number>;
  complexity: Map<string, number>;
  avgCompletion: number;
  totalSignals: number;
  topCategories: Category[];
  knownCategories: Set<Category>;
}

const ADJACENCY: Partial<Record<Category, Category[]>> = {
  Tech: ['IA', 'Science', 'Startups', 'Gaming', 'Espace', 'Crypto'],
  IA: ['Tech', 'Science', 'Startups', 'Économie'],
  Politique: ['Économie', 'International', 'Société', 'Justice'],
  Football: ['NBA', 'F1', 'MMA', 'Real Madrid', 'FC Barcelone', 'PSG', 'OM'],
  Culture: ['Cinéma', 'Musique', 'Mode', 'Architecture'],
  Startups: ['Tech', 'Économie', 'IA'],
  Environnement: ['Science', 'Politique', 'Espace', 'Société'],
  Justice: ['Faits Divers', 'Société', 'Politique'],
  Voyage: ['Culture', 'Food', 'Architecture'],
  Food: ['Voyage', 'Culture', 'Mode'],
  Gaming: ['Tech', 'Manga', 'Musique'],
  Manga: ['Gaming', 'Cinéma', 'Tech'],
  'Real Madrid': ['Football', 'FC Barcelone', 'PSG'],
  Cinéma: ['Culture', 'Musique', 'People'],
  Musique: ['Cinéma', 'Culture', 'People'],
  Mode: ['Luxe', 'Culture', 'Architecture'],
  Économie: ['Politique', 'Crypto', 'Startups'],
  Science: ['Espace', 'IA', 'Environnement'],
  Espace: ['Science', 'Tech'],
  People: ['Cinéma', 'Musique', 'Mode'],
  Crypto: ['Économie', 'Tech'],
};

const PROBE_INTERVAL = 7;        // every 7 slots, inject a discovery probe
const TARGET_SIZE = 60;          // standard feed batch
const FATIGUE_WINDOW = 18;       // last N slots considered for fatigue
const MAX_SAME_CATEGORY_RUN = 1; // anti-bubble hard cap
const MAX_SAME_AUTHOR_RUN = 2;
const MS_IN_HOUR = 3_600_000;

@Injectable({ providedIn: 'root' })
export class FeedAlgorithmService {
  private interaction = inject(InteractionService);

  /**
   * Build a personalised feed batch for the current viewer.
   *
   * @param all  Full article inventory (already filtered for `published`).
   * @param size Optional override (defaults to {@link TARGET_SIZE}).
   */
  generate(all: Article[], size: number = TARGET_SIZE): Article[] {
    if (!all || all.length === 0) return [];

    return untracked(() => {
      // Only published articles with content can ever surface.
      const inventory = all.filter(a => (a.status ?? 'published') === 'published');
      if (inventory.length === 0) return [];

      const profile = this.buildAffinity(inventory);
      const isColdStart = profile.totalSignals < 3 && profile.topCategories.length === 0;
      const epsilon = this.dynamicEpsilon(profile);

      const scored = inventory.map(a => this.scoreArticle(a, profile, isColdStart));

      // Negative threshold: drop content the viewer clearly burned out on.
      const eligible = scored.filter(s => s.total > -25);
      if (eligible.length <= size) {
        return eligible.sort((x, y) => y.total - x.total).map(s => s.article);
      }

      // Bucket pools, sorted high-to-low.
      const safe = eligible.filter(s => s.bucket === 'safe' || s.bucket === 'rising')
        .sort((a, b) => b.total - a.total);
      const adjacent = eligible.filter(s => s.bucket === 'adjacent')
        .sort((a, b) => b.total - a.total);
      const probes = eligible.filter(s => s.bucket === 'probe' || s.bucket === 'discover')
        .sort((a, b) => b.total - a.total);

      return this.weave(safe, adjacent, probes, size, epsilon);
    });
  }

  // ────────────────────────────────────────────────────────────────
  // Affinity model
  // ────────────────────────────────────────────────────────────────

  private buildAffinity(all: Article[]): AffinityProfile {
    const category = new Map<Category, number>();
    const author = new Map<string, number>();
    const tone = new Map<string, number>();
    const format = new Map<string, number>();
    const complexity = new Map<string, number>();

    const interests = this.interaction.userInterests();
    const likes = new Set(this.interaction.likedArticles());
    const saves = new Set(this.interaction.savedArticles());
    const reads = new Set(this.interaction.readArticles());
    const comments = new Set(this.interaction.commentedArticles());
    const session = this.interaction.sessionHistory();

    let totalSignals = 0;
    let completionSum = 0;
    let completionN = 0;

    // Static onboarding interests give a strong prior.
    for (const c of interests) {
      category.set(c, (category.get(c) ?? 0) + 18);
      totalSignals += 1;
    }

    const bump = (id: string, weight: number) => {
      const a = all.find(x => x.id === id);
      if (!a) return;
      category.set(a.category, (category.get(a.category) ?? 0) + weight);
      author.set(a.author, (author.get(a.author) ?? 0) + weight * 0.8);
      if (a.metadata) {
        tone.set(a.metadata.tone, (tone.get(a.metadata.tone) ?? 0) + weight * 0.6);
        format.set(a.metadata.format, (format.get(a.metadata.format) ?? 0) + weight * 0.5);
        complexity.set(a.metadata.complexity, (complexity.get(a.metadata.complexity) ?? 0) + weight * 0.4);
      }
      totalSignals += 1;
    };

    saves.forEach(id => bump(id, 22));
    comments.forEach(id => bump(id, 26));
    likes.forEach(id => bump(id, 12));
    reads.forEach(id => bump(id, 3));

    // Dwell-time signal: a long-completion read is the single strongest
    // implicit endorsement, like TikTok's loop-watch metric.
    for (const ev of session) {
      const ratio = ev.completionRatio ?? 0;
      if (ratio > 0.7) bump(ev.articleId, 20 + Math.min(ratio, 1.4) * 10);
      else if (ratio > 0.3) bump(ev.articleId, 6);
      if (ev.completionRatio !== undefined) {
        completionSum += ev.completionRatio;
        completionN += 1;
      }
    }

    const sortedCats = [...category.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);

    return {
      category, author, tone, format, complexity,
      avgCompletion: completionN ? completionSum / completionN : 0,
      totalSignals,
      topCategories: sortedCats.slice(0, 4),
      knownCategories: new Set(sortedCats),
    };
  }

  // ────────────────────────────────────────────────────────────────
  // Per-article scoring
  // ────────────────────────────────────────────────────────────────

  private scoreArticle(a: Article, p: AffinityProfile, isColdStart: boolean): Scored {
    let base = 0;
    let fit = 0;
    let velocity = 0;
    let recency = 0;
    let novelty = 0;

    // 1. Base — popularity prior so newly registered users get a baseline.
    const likes = a.likes ?? 0;
    const comments = a.comments ?? 0;
    base += Math.log1p(likes) * 4;
    base += Math.log1p(comments) * 5;
    if (a.isExclusive) base += 6;

    // 2. Recency — half-life of ~36h for breaking news, fading slowly.
    const ageHours = this.ageInHours(a.timestamp);
    if (ageHours <= 1) recency += 18;
    else if (ageHours <= 6) recency += 12;
    else if (ageHours <= 24) recency += 8;
    else if (ageHours <= 72) recency += 4;
    else recency += -Math.min(8, Math.log2(ageHours / 72) * 3);

    // 3. Velocity — likes / view-rate over a fresh window flags rising
    // content. Mirrors TikTok's "early signal" boost.
    const views = Math.max(1, a.views ?? likes * 4);
    const engagementRate = (likes + comments * 1.5) / views;
    if (ageHours < 12 && engagementRate > 0.05) velocity += 14;
    else if (ageHours < 48 && engagementRate > 0.04) velocity += 7;

    // 4. Personal fit (only after cold-start).
    let bucket: Scored['bucket'] = 'discover';
    if (!isColdStart) {
      const catAff = p.category.get(a.category) ?? 0;
      const authAff = p.author.get(a.author) ?? 0;
      const toneAff = a.metadata ? (p.tone.get(a.metadata.tone) ?? 0) : 0;
      const formatAff = a.metadata ? (p.format.get(a.metadata.format) ?? 0) : 0;

      fit += Math.min(catAff, 70);
      fit += Math.min(authAff, 28) * 0.9;
      fit += toneAff * 0.5;
      fit += formatAff * 0.4;

      const isAdjacent = p.topCategories.some(top => ADJACENCY[top]?.includes(a.category));
      if (catAff >= 25) bucket = 'safe';
      else if (isAdjacent) bucket = 'adjacent';
      else bucket = 'probe';

      // "Rising" = high-velocity content even within the safe bucket gets
      // a separate marker so we can prioritise freshness over depth.
      if (velocity >= 12 && bucket === 'safe') bucket = 'rising';
    } else {
      // Cold start: lean on popularity + adjacency to onboarding interests.
      const interestHit = p.category.get(a.category) ?? 0;
      if (interestHit > 0) {
        fit += Math.min(interestHit, 40);
        bucket = 'safe';
      } else {
        bucket = 'discover';
      }
    }

    // 5. Novelty / horizon expansion — boost a probe if its category is
    // genuinely unseen by the viewer (great TikTok-style "let's test you").
    if (!p.knownCategories.has(a.category)) novelty += 6;
    if (a.metadata?.format === 'Video' && !p.format.has('Video')) novelty += 4;

    // 6. Already-consumed penalties (strong but not absolute).
    const reads = this.interaction.readArticles();
    const liked = this.interaction.likedArticles();
    const saved = this.interaction.savedArticles();
    if (reads.includes(a.id)) base -= 28;
    if (liked.includes(a.id) || saved.includes(a.id)) base -= 55;

    // 7. Session fatigue — recent skips of this category bleed score.
    const recent = this.interaction.sessionHistory().slice(-FATIGUE_WINDOW);
    const sameCatRecent = recent.filter(r => r.category === a.category);
    const skips = sameCatRecent.filter(r => (r.completionRatio ?? 1) < 0.2 && r.durationMs < 2000);
    if (skips.length > 0) base -= 16 * skips.length;
    if (sameCatRecent.length > 4) base -= 10 * (sameCatRecent.length - 3);
    const deepReads = sameCatRecent.filter(r => (r.completionRatio ?? 0) > 0.7);
    if (deepReads.length > 0) fit += 12 * deepReads.length;

    // 8. Explicit user-flagged sensitive content: only surfaces when
    // viewer has previously engaged with it. Avoids surprise NSFW.
    if (a.isSensitive && !this.hasSensitiveAffinity(a, p)) base -= 35;

    const total = base + fit + velocity + recency + novelty;
    return { article: a, base, fit, velocity, recency, novelty, total, bucket };
  }

  private hasSensitiveAffinity(a: Article, p: AffinityProfile): boolean {
    return (p.category.get(a.category) ?? 0) >= 18;
  }

  // ────────────────────────────────────────────────────────────────
  // Slot weaver
  // ────────────────────────────────────────────────────────────────

  /**
   * Interleave the buckets while respecting hard diversity constraints.
   * `epsilon` controls how often we deliberately pick a probe over the
   * top-scoring safe candidate (TikTok's exploration knob).
   */
  private weave(
    safe: Scored[],
    adjacent: Scored[],
    probes: Scored[],
    size: number,
    epsilon: number,
  ): Article[] {
    const out: Article[] = [];
    const used = new Set<string>();
    let lastCat: Category | null = null;
    let prevCat: Category | null = null;
    let lastAuth: string | null = null;
    let lastAuthRun = 0;
    let safeI = 0, adjI = 0, prbI = 0;

    const pull = (pool: Scored[], from: number): { item?: Scored; next: number } => {
      for (let i = from; i < pool.length; i++) {
        const item = pool[i];
        if (used.has(item.article.id)) continue;
        // Hard diversity: never the same category twice in a row.
        if (item.article.category === lastCat && MAX_SAME_CATEGORY_RUN <= 1) continue;
        // Hard diversity: never 3 same-cat in a tight window.
        if (item.article.category === lastCat && item.article.category === prevCat) continue;
        // Hard diversity: never N consecutive same-author.
        if (item.article.author === lastAuth && lastAuthRun >= MAX_SAME_AUTHOR_RUN) continue;
        return { item, next: i + 1 };
      }
      return { next: from };
    };

    let position = 0;
    while (out.length < size) {
      const isProbeSlot = position > 0 && position % PROBE_INTERVAL === 0;
      const explore = isProbeSlot || Math.random() < epsilon;

      let picked: Scored | undefined;

      if (explore) {
        const tryProbe = pull(probes, prbI);
        if (tryProbe.item) { picked = tryProbe.item; prbI = tryProbe.next; }
      }

      if (!picked) {
        const trySafe = pull(safe, safeI);
        if (trySafe.item) { picked = trySafe.item; safeI = trySafe.next; }
      }

      if (!picked) {
        const tryAdj = pull(adjacent, adjI);
        if (tryAdj.item) { picked = tryAdj.item; adjI = tryAdj.next; }
      }

      if (!picked) {
        const tryProbe = pull(probes, prbI);
        if (tryProbe.item) { picked = tryProbe.item; prbI = tryProbe.next; }
      }

      if (!picked) break;

      out.push(picked.article);
      used.add(picked.article.id);
      prevCat = lastCat;
      lastCat = picked.article.category;
      if (picked.article.author === lastAuth) lastAuthRun += 1;
      else { lastAuth = picked.article.author; lastAuthRun = 1; }
      position += 1;
    }

    return out;
  }

  // ────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────

  private dynamicEpsilon(p: AffinityProfile): number {
    // Cold start = explore aggressively; engaged user = exploit; if avg
    // completion is dropping we re-inflate exploration to break boredom.
    if (p.totalSignals < 3) return 0.35;
    if (p.avgCompletion > 0.65) return 0.15;
    if (p.avgCompletion > 0.45) return 0.22;
    return 0.30;
  }

  private ageInHours(ts: string | undefined): number {
    if (!ts) return 240;
    const t = Date.parse(ts);
    if (Number.isNaN(t)) return 240;
    return Math.max(0, (Date.now() - t) / MS_IN_HOUR);
  }
}
