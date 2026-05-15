/**
 * ReactiveFeedBuffer specs — guarantee the FATAL "feed never adapts
 * mid-session" issue from the v2 audit stays dead. We focus on:
 *   - the pinArticle deep-link entry point,
 *   - the visibility track invariants (monotonic, head-stable).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReactiveFeedBufferService } from './reactive-feed-buffer.service';
import { FeedAlgorithmService } from './feed-algorithm.service';
import { FeedModeService } from './feed-mode.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { DataService } from './data.service';
import { Logger } from './logger.service';
import type { Verdict } from './circuit-breaker.service';
import { Article } from '../types';

declare const ensureTestBed: () => void;

class StubAlgorithm {
  generate(inv: Article[]): Article[] {
    return [...inv].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
  }
}

class StubMode {
  modeSig = signal<'pulse' | 'radar' | 'cercle'>('pulse');
  inventorySig = signal<Article[]>([]);
  feedSig = signal<Article[]>([]);
  mode = () => this.modeSig();
  inventory = () => this.inventorySig();
  feed = () => this.feedSig();
}

class StubBreaker {
  verdictSig = signal<Verdict>({ action: 'CONTINUE' });
  verdict = () => this.verdictSig();
}

class StubData {
  articlesSig = signal<Article[]>([]);
  articles = () => this.articlesSig();
}

function article(id: string, likes = 1): Article {
  return {
    id,
    title: `T-${id}`,
    summary: '',
    content: '',
    imageUrl: '',
    author: 'Author',
    category: 'Tech',
    timestamp: new Date().toISOString(),
    likes,
    comments: 0,
  };
}

function setup() {
  ensureTestBed();
  const algorithm = new StubAlgorithm();
  const mode = new StubMode();
  const breaker = new StubBreaker();
  const data = new StubData();

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      ReactiveFeedBufferService,
      { provide: FeedAlgorithmService, useValue: algorithm },
      { provide: FeedModeService, useValue: mode },
      { provide: CircuitBreakerService, useValue: breaker },
      { provide: DataService, useValue: data },
      { provide: Logger, useValue: { info() {}, warn() {}, error() {}, debug() {} } },
    ],
  });
  const svc = TestBed.inject(ReactiveFeedBufferService);
  return { svc, mode, breaker, data };
}

describe('ReactiveFeedBufferService — pin', () => {
  let env = setup();
  beforeEach(() => { env = setup(); });

  it('places the requested article at the head of the buffer', () => {
    env.mode.inventorySig.set([
      article('a', 100), article('b', 50), article('c', 10),
    ]);
    const ok = env.svc.pinArticle('c');
    expect(ok).toBe(true);
    expect(env.svc.visible()[0]?.id).toBe('c');
  });

  it('returns false when the article is not in the inventory', () => {
    env.mode.inventorySig.set([article('a'), article('b')]);
    const ok = env.svc.pinArticle('nonexistent');
    expect(ok).toBe(false);
  });
});

describe('ReactiveFeedBufferService — visibility', () => {
  let env = setup();
  beforeEach(() => { env = setup(); });

  it('exposes [served, upcoming] as a monotonically growing track', () => {
    env.mode.inventorySig.set([
      article('a', 100), article('b', 90), article('c', 80),
      article('d', 70), article('e', 60), article('f', 50),
    ]);
    env.data.articlesSig.set(env.mode.inventorySig());
    env.svc.reset();
    const before = env.svc.visible().map(a => a.id);
    expect(before.length).toBeGreaterThan(0);

    env.svc.advance();
    const after = env.svc.visible().map(a => a.id);
    expect(after[0]).toBe(before[0]);
    expect(after.length).toBeGreaterThanOrEqual(before.length);
  });
});
