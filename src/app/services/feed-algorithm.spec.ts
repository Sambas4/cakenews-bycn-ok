/**
 * Algorithm-level specs.
 *
 * Strategy: TestBed with stubbed dependencies. We swap out
 * InteractionService, VibeSignalService, CohortEngineService and
 * AutoTaggerService with hand-rolled doubles so we control every
 * signal and assertion is deterministic.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FeedAlgorithmService } from './feed-algorithm.service';
import { InteractionService } from './interaction.service';
import { VibeSignalService } from './vibe-signal.service';
import { CohortEngineService } from './cohort-engine.service';
import { AutoTaggerService } from './auto-tagger.service';
import { Article, Category } from '../types';

declare const ensureTestBed: () => void;

interface SessionEvent {
  articleId: string;
  category: string;
  author: string;
  durationMs: number;
  expectedDurationMs?: number;
  completionRatio?: number;
  intensity?: 'flick' | 'fast' | 'normal' | 'deep';
  timestamp: number;
}

class StubInteraction {
  liked = signal<string[]>([]);
  saved = signal<string[]>([]);
  read = signal<string[]>([]);
  commented = signal<string[]>([]);
  interests = signal<Category[]>([]);
  history = signal<SessionEvent[]>([]);
  likedArticles() { return this.liked(); }
  savedArticles() { return this.saved(); }
  readArticles() { return this.read(); }
  commentedArticles() { return this.commented(); }
  userInterests() { return this.interests(); }
  sessionHistory() { return this.history(); }
}

class StubVibe {
  qualityBoostByArticle = signal<Map<string, number>>(new Map());
}

class StubCohort {
  weights = signal({ fit: 1, recency: 1, velocity: 1, novelty: 1, exploreEpsilon: 0.22 });
  viralBoostFor() { return 0; }
}

class StubTagger {
  syncTag(article: Article) {
    if (article.metadata) {
      return {
        tone: article.metadata.tone,
        format: article.metadata.format,
        complexity: article.metadata.complexity,
        tags: article.tags ?? [],
        confidence: 1,
        aiGenerated: false,
      };
    }
    return {
      tone: 'Factuel' as const,
      format: 'Snackable' as const,
      complexity: 'Mainstream' as const,
      tags: [] as string[],
      confidence: 0.6,
      aiGenerated: false,
    };
  }
}

function setup() {
  ensureTestBed();
  const interaction = new StubInteraction();
  const vibe = new StubVibe();
  const cohort = new StubCohort();
  const tagger = new StubTagger();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      FeedAlgorithmService,
      { provide: InteractionService, useValue: interaction },
      { provide: VibeSignalService, useValue: vibe },
      { provide: CohortEngineService, useValue: cohort },
      { provide: AutoTaggerService, useValue: tagger },
    ],
  });
  const svc = TestBed.inject(FeedAlgorithmService);
  return { svc, interaction, cohort };
}

function article(id: string, overrides: Partial<Article> = {}): Article {
  return {
    id,
    title: `Article ${id}`,
    summary: `Résumé ${id}`,
    content: 'Lorem ipsum dolor sit amet '.repeat(80),
    imageUrl: `https://images.example.com/${id}.jpg`,
    author: 'Default Author',
    category: 'Tech' as Category,
    timestamp: new Date(Date.now() - 2 * 3600_000).toISOString(),
    likes: 50,
    comments: 10,
    ...overrides,
  };
}

describe('FeedAlgorithmService — cold start', () => {
  let env = setup();
  beforeEach(() => { env = setup(); });

  it('returns the inventory when count is below the bucket threshold', () => {
    const inv = [article('a'), article('b'), article('c')];
    const out = env.svc.generate(inv);
    expect(out).toHaveLength(3);
    expect(out.map(a => a.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('uses popularity prior on a fresh viewer with no signals', () => {
    const inv = [
      article('low',  { likes: 1,    comments: 0  }),
      article('mid',  { likes: 50,   comments: 10 }),
      article('star', { likes: 5000, comments: 800 }),
    ];
    for (let i = 0; i < 30; i++) inv.push(article(`f${i}`, { likes: 5, comments: 1, category: 'Société' }));

    const out = env.svc.generate(inv, 8);
    const starIdx = out.findIndex(a => a.id === 'star');
    expect(starIdx).toBeGreaterThanOrEqual(0);
    expect(starIdx).toBeLessThan(4);
  });

  it('honours static onboarding interests on cold start', () => {
    env.interaction.interests.set(['Tech']);
    const inv = [
      article('match',  { category: 'Tech',     likes: 5, comments: 1 }),
      article('nope1',  { category: 'Politique', likes: 5, comments: 1 }),
      article('nope2',  { category: 'Mode',      likes: 5, comments: 1 }),
    ];
    for (let i = 0; i < 20; i++) inv.push(article(`p${i}`, { category: 'Société', likes: 1, comments: 0 }));

    const out = env.svc.generate(inv, 6);
    expect(out[0]?.id).toBe('match');
  });

  it('never produces an empty queue when inventory is non-empty', () => {
    const inv = [article('only')];
    const out = env.svc.generate(inv, 60);
    expect(out.length).toBeGreaterThan(0);
  });
});

describe('FeedAlgorithmService — diversity', () => {
  let env = setup();
  beforeEach(() => { env = setup(); });

  it('does not produce two identical categories back-to-back when there is enough variety', () => {
    const inv: Article[] = [];
    for (let i = 0; i < 6; i++) inv.push(article(`tech-${i}`, { category: 'Tech',      likes: 100, comments: 20 }));
    for (let i = 0; i < 6; i++) inv.push(article(`polit-${i}`, { category: 'Politique', likes: 100, comments: 20 }));
    for (let i = 0; i < 6; i++) inv.push(article(`mode-${i}`,  { category: 'Mode',      likes: 100, comments: 20 }));

    const out = env.svc.generate(inv, 12);
    for (let i = 1; i < out.length; i++) {
      expect(out[i]!.category).not.toBe(out[i - 1]!.category);
    }
  });
});
