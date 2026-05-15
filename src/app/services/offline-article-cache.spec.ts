import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { OfflineArticleCacheService } from './offline-article-cache.service';
import { Article } from '../types';

declare const ensureTestBed: () => void;

function setup() {
  ensureTestBed();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [OfflineArticleCacheService] });
  return { svc: TestBed.inject(OfflineArticleCacheService) };
}

function article(id: string): Article {
  return {
    id,
    title: `T-${id}`,
    summary: '',
    content: '',
    imageUrl: '',
    author: 'Author',
    category: 'Tech',
    timestamp: new Date().toISOString(),
    likes: 0,
    comments: 0,
  };
}

describe('OfflineArticleCacheService', () => {
  let env = setup();
  beforeEach(() => { env = setup(); });

  it('starts empty when localStorage has nothing', () => {
    expect(env.svc.articles()).toEqual([]);
    expect(env.svc.storedAt()).toBeNull();
  });

  it('persists and reloads articles', () => {
    env.svc.store([article('a'), article('b')]);
    expect(env.svc.articles().map(a => a.id)).toEqual(['a', 'b']);
    expect(env.svc.storedAt()).not.toBeNull();

    // Re-instantiate to simulate a page reload — load() should read
    // back what was persisted.
    const env2 = setup();
    expect(env2.svc.articles().map(a => a.id)).toEqual(['a', 'b']);
  });

  it('caps storage at the configured capacity', () => {
    const items = Array.from({ length: 30 }, (_, i) => article(`a${i}`));
    env.svc.store(items, 5);
    expect(env.svc.articles()).toHaveLength(5);
    expect(env.svc.articles().map(a => a.id)).toEqual(['a0', 'a1', 'a2', 'a3', 'a4']);
  });

  it('rejects junk envelopes silently', () => {
    localStorage.setItem('cake_offline_articles_v1', '{not json');
    const env2 = setup();
    expect(env2.svc.articles()).toEqual([]);
  });

  it('ignores future-version envelopes (forward compatibility)', () => {
    localStorage.setItem('cake_offline_articles_v1', JSON.stringify({
      v: 99,
      storedAt: Date.now(),
      articles: [article('z')],
    }));
    const env2 = setup();
    expect(env2.svc.articles()).toEqual([]);
  });

  it('clear() empties the persisted state', () => {
    env.svc.store([article('a')]);
    env.svc.clear();
    expect(env.svc.articles()).toEqual([]);
    expect(localStorage.getItem('cake_offline_articles_v1')).toBeNull();
  });
});
