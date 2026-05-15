import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ArticlePaginationService } from './article-pagination.service';
import { ARTICLE_API } from './api/article-api';
import { InMemoryArticleApi } from './api/in-memory-article-api';
import { Article } from '../types';

declare const ensureTestBed: () => void;

function setup() {
  ensureTestBed();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      InMemoryArticleApi,
      { provide: ARTICLE_API, useExisting: InMemoryArticleApi },
      ArticlePaginationService,
    ],
  });
  return {
    svc: TestBed.inject(ArticlePaginationService),
    api: TestBed.inject(InMemoryArticleApi),
  };
}

function article(id: string, dayOffset: number): Article {
  return {
    id,
    title: `T-${id}`,
    summary: '',
    content: '',
    imageUrl: '',
    author: 'Author',
    category: 'Tech',
    timestamp: new Date(2026, 0, 28 - dayOffset).toISOString(),
    likes: 0,
    comments: 0,
    status: 'published',
  };
}

describe('ArticlePaginationService', () => {
  let env = setup();
  beforeEach(() => { env = setup(); });

  it('walks the cursor across pages until exhaustion', async () => {
    env.api.seed(Array.from({ length: 25 }, (_, i) => article(`a${i}`, i)));

    const page1 = await env.svc.loadMore();
    expect(page1.length).toBeGreaterThan(0);
    expect(env.svc.exhausted()).toBe(false);

    let total = page1.length;
    while (!env.svc.exhausted()) {
      const more = await env.svc.loadMore();
      total += more.length;
      if (more.length === 0) break;
    }
    expect(total).toBe(25);
    expect(env.svc.exhausted()).toBe(true);
  });

  it('returns [] once exhausted, no more API calls', async () => {
    env.api.seed([article('only', 0)]);
    await env.svc.loadMore();
    while (!env.svc.exhausted()) await env.svc.loadMore();

    const after = await env.svc.loadMore();
    expect(after).toEqual([]);
  });

  it('reset() rewinds the cursor for a fresh walk', async () => {
    env.api.seed(Array.from({ length: 5 }, (_, i) => article(`a${i}`, i)));
    while (!env.svc.exhausted()) await env.svc.loadMore();
    expect(env.svc.exhausted()).toBe(true);

    env.svc.reset();
    expect(env.svc.exhausted()).toBe(false);
    expect(env.svc.hasFetched()).toBe(false);

    const fresh = await env.svc.loadMore();
    expect(fresh.length).toBeGreaterThan(0);
  });

  it('primeFromHead skips the first page', async () => {
    const items = Array.from({ length: 10 }, (_, i) => article(`a${i}`, i));
    env.api.seed(items);

    // Pretend the realtime channel already gave us items 0..2
    env.svc.primeFromHead(items.slice(0, 3));
    expect(env.svc.hasFetched()).toBe(true);

    // Next loadMore should not return any of the first three.
    const next = await env.svc.loadMore();
    const ids = next.map(a => a.id);
    expect(ids.includes('a0')).toBe(false);
    expect(ids.includes('a1')).toBe(false);
    expect(ids.includes('a2')).toBe(false);
  });
});
