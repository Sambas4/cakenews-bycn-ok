/**
 * Locks the {@link InMemoryArticleApi} contract. Because this adapter
 * is the test double for everything else, regressions here would
 * silently corrupt every downstream suite — we test it directly.
 *
 * Side-effect: these specs also document the expected behaviour of
 * the production {@link SupabaseArticleApi} since both must satisfy
 * {@link IArticleApi}.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { InMemoryArticleApi } from './in-memory-article-api';
import { Article, Category } from '../../types';

declare const ensureTestBed: () => void;

function setup() {
  ensureTestBed();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [InMemoryArticleApi] });
  return { api: TestBed.inject(InMemoryArticleApi) };
}

function article(id: string, overrides: Partial<Article> = {}): Article {
  return {
    id,
    title: `Article ${id}`,
    summary: '',
    content: '',
    imageUrl: '',
    author: 'Author',
    category: 'Tech' as Category,
    timestamp: new Date(2026, 0, parseInt(id, 36) % 28 || 1).toISOString(),
    likes: 0,
    comments: 0,
    status: 'published',
    ...overrides,
  };
}

describe('InMemoryArticleApi — reads', () => {
  let env = setup();
  beforeEach(() => { env = setup(); });

  it('seeds and lists published articles in reverse chronological order', async () => {
    env.api.seed([
      article('a', { timestamp: '2026-01-10T00:00:00Z' }),
      article('b', { timestamp: '2026-01-12T00:00:00Z' }),
      article('c', { timestamp: '2026-01-11T00:00:00Z' }),
    ]);
    const all = await env.api.listAllPublished();
    expect(all.map(a => a.id)).toEqual(['b', 'c', 'a']);
  });

  it('omits drafts from listAllPublished', async () => {
    env.api.seed([
      article('pub', { status: 'published' }),
      article('draft', { status: 'draft' }),
    ]);
    const all = await env.api.listAllPublished();
    expect(all.map(a => a.id)).toEqual(['pub']);
  });

  it('paginates with a stable cursor', async () => {
    const items = Array.from({ length: 25 }, (_, i) =>
      article(String(i).padStart(3, '0'), { timestamp: new Date(2026, 0, 25 - i).toISOString() }));
    env.api.seed(items);

    const page1 = await env.api.listFeedPage({ limit: 10 });
    expect(page1.articles).toHaveLength(10);
    expect(page1.next).toBeTruthy();

    const page2 = await env.api.listFeedPage({ cursor: page1.next, limit: 10 });
    expect(page2.articles).toHaveLength(10);
    expect(page1.articles[0]?.id).not.toBe(page2.articles[0]?.id);

    const page3 = await env.api.listFeedPage({ cursor: page2.next, limit: 10 });
    // 25 items, 10 + 10 + 5 — the third page must close the cursor.
    expect(page3.articles).toHaveLength(5);
    expect(page3.next).toBeNull();
  });
});

describe('InMemoryArticleApi — engagement', () => {
  let env = setup();
  beforeEach(() => { env = setup(); });

  it('atomically increments and decrements likes with a 0 floor', async () => {
    env.api.seed([article('a', { likes: 5 })]);
    expect(await env.api.adjustLikes('a', 3)).toBe(8);
    expect(await env.api.adjustLikes('a', -1)).toBe(7);
    expect(await env.api.adjustLikes('a', -100)).toBe(0); // floored
  });

  it('records a single vibe per user and recomputes the aggregate', async () => {
    env.api.seed([article('a')]);
    env.api.setCurrentUser('alice');
    let agg = await env.api.voteVibe('a', 'choque');
    expect(agg).toEqual({ choque: 1, sceptique: 0, bullish: 0, valide: 0 });

    // Same user changes their mind — total stays at 1.
    agg = await env.api.voteVibe('a', 'valide');
    expect(agg).toEqual({ choque: 0, sceptique: 0, bullish: 0, valide: 1 });

    // Second user adds their vote.
    env.api.setCurrentUser('bob');
    agg = await env.api.voteVibe('a', 'valide');
    expect(agg).toEqual({ choque: 0, sceptique: 0, bullish: 0, valide: 2 });

    // Bob retracts.
    agg = await env.api.voteVibe('a', null);
    expect(agg).toEqual({ choque: 0, sceptique: 0, bullish: 0, valide: 1 });
  });

  it('appends comments and bumps the per-article counter', async () => {
    env.api.seed([article('a')]);
    await env.api.postComment('a', 'first!');
    await env.api.postComment('a', 'second');
    const comments = await env.api.listComments('a');
    expect(comments.map(c => c.content)).toEqual(['first!', 'second']);

    const refreshed = await env.api.findById('a');
    expect(refreshed?.comments).toBe(2);
  });

  it('rejects empty comments', async () => {
    env.api.seed([article('a')]);
    await expect(env.api.postComment('a', '   ')).rejects.toThrow('empty_content');
  });
});

describe('InMemoryArticleApi — search', () => {
  let env = setup();
  beforeEach(() => { env = setup(); });

  it('returns [] for an empty query', async () => {
    env.api.seed([article('a')]);
    expect(await env.api.searchArticles('   ')).toEqual([]);
    expect(await env.api.searchArticles('')).toEqual([]);
  });

  it('matches by title with the heaviest weight', async () => {
    env.api.seed([
      article('match', { title: 'Macron annonce une réforme' }),
      article('decoy', { title: 'Lakers domptent les Mavs', summary: 'macron mentionné en passant' }),
    ]);
    const out = await env.api.searchArticles('macron');
    expect(out[0]?.id).toBe('match');
  });

  it('matches by category exact', async () => {
    env.api.seed([
      article('a', { title: 'Kaamelott débarque', category: 'Cinéma' as Category }),
      article('b', { title: 'BCE relève les taux', category: 'Économie' as Category }),
    ]);
    const out = await env.api.searchArticles('cinéma');
    expect(out.find(a => a.id === 'a')).toBeTruthy();
  });

  it('matches by tag substring', async () => {
    env.api.seed([
      article('lkr', { title: 'Match du soir', category: 'Football' as Category, tags: ['election2026', 'campaign'] }),
      article('zzz', { title: 'Sans tag pertinent', category: 'Football' as Category }),
    ]);
    const out = await env.api.searchArticles('election');
    expect(out[0]?.id).toBe('lkr');
  });

  it('skips drafts', async () => {
    env.api.seed([
      article('pub', { title: 'Test query target', status: 'published' }),
      article('drf', { title: 'Test query target', status: 'draft' }),
    ]);
    const out = await env.api.searchArticles('test query target');
    expect(out.map(a => a.id)).toEqual(['pub']);
  });

  it('respects the limit', async () => {
    const items = Array.from({ length: 10 }, (_, i) => article(`a${i}`, {
      title: `Macron numéro ${i}`,
    }));
    env.api.seed(items);
    const out = await env.api.searchArticles('macron', 3);
    expect(out).toHaveLength(3);
  });
});

describe('InMemoryArticleApi — realtime', () => {
  let env = setup();
  beforeEach(() => { env = setup(); });

  it('notifies subscribers on mutations', async () => {
    env.api.seed([article('a')]);
    const events: number[] = [];
    const unsub = env.api.subscribeToArticles(list => events.push(list.length));

    // Microtask flush — first emit happens via Promise.resolve.
    await new Promise(r => setTimeout(r, 0));
    expect(events.at(-1)).toBe(1);

    await env.api.upsert(article('b'));
    await new Promise(r => setTimeout(r, 0));
    expect(events.at(-1)).toBe(2);

    unsub();
    await env.api.upsert(article('c'));
    await new Promise(r => setTimeout(r, 0));
    // No event after unsubscribe.
    expect(events.at(-1)).toBe(2);
  });
});
