import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CommentService } from './comment.service';
import { ARTICLE_API } from './api/article-api';
import { InMemoryArticleApi } from './api/in-memory-article-api';
import { Article, Comment as CakeComment } from '../types';
import { UserService } from './user.service';
import { AuthService } from './auth.service';
import { signal } from '@angular/core';

declare const ensureTestBed: () => void;

class StubUserService {
  currentUserProfile = signal({
    uid: 'me', displayName: 'Test User', username: 'tester', photoURL: '',
  });
  currentPublicProfile = signal(null);
}

class StubAuthService {
  currentUser = signal({ id: 'me', email: 'me@test' });
}

function setup() {
  ensureTestBed();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      InMemoryArticleApi,
      { provide: ARTICLE_API, useExisting: InMemoryArticleApi },
      { provide: UserService, useValue: new StubUserService() },
      { provide: AuthService, useValue: new StubAuthService() },
      CommentService,
    ],
  });
  const api = TestBed.inject(InMemoryArticleApi);
  api.setCurrentUser('me');
  api.seed([article('a'), article('b')]);
  return {
    svc: TestBed.inject(CommentService),
    api,
  };
}

function article(id: string): Article {
  return {
    id,
    title: `Article ${id}`,
    summary: '',
    content: '',
    imageUrl: '',
    author: 'Author',
    category: 'Tech',
    timestamp: new Date().toISOString(),
    likes: 0,
    comments: 0,
    status: 'published',
  };
}

function flush(): Promise<void> {
  // Two microtasks: one for the state.update, one for the swap.
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('CommentService — list', () => {
  let env = setup();
  beforeEach(() => { env = setup(); });

  it('returns the empty list for an article that has no comments', async () => {
    const list = await env.svc.list('a');
    expect(list).toEqual([]);
    expect(env.svc.isLoaded('a')).toBe(true);
  });

  it('caches the result — second call does not refetch', async () => {
    await env.svc.list('a');
    // Simulate a backend mutation that wasn't observed by our cache.
    await env.api.postComment('a', 'race condition');
    // The cache must still serve the original (empty) list.
    const cached = await env.svc.list('a');
    expect(cached).toEqual([]);
  });

  it('invalidate forces a refetch on the next list', async () => {
    await env.svc.list('a');
    await env.api.postComment('a', 'first');
    env.svc.invalidate('a');
    const next = await env.svc.list('a');
    expect(next).toHaveLength(1);
  });
});

describe('CommentService — post optimistic', () => {
  let env = setup();
  beforeEach(() => { env = setup(); });

  it('inserts a placeholder synchronously, then reconciles', async () => {
    const before = env.svc.commentsFor('a')();
    expect(before).toHaveLength(0);

    const promise = env.svc.post('a', 'Hello world');
    // Microtask boundary not crossed yet — placeholder must be visible.
    const intermediate = env.svc.commentsFor('a')();
    expect(intermediate).toHaveLength(1);
    expect(intermediate[0]?.id.startsWith('pending-')).toBe(true);
    expect(intermediate[0]?.content).toBe('Hello world');

    const final = await promise;
    expect(final).not.toBeNull();
    expect(final?.id.startsWith('pending-')).toBe(false);

    const after = env.svc.commentsFor('a')();
    expect(after).toHaveLength(1);
    expect(after[0]?.id).toBe(final?.id);
  });

  it('rejects empty content', async () => {
    const ret = await env.svc.post('a', '   ');
    expect(ret).toBeNull();
    expect(env.svc.commentsFor('a')()).toHaveLength(0);
  });

  it('preserves replyTo on the optimistic placeholder', async () => {
    const target: CakeComment = {
      id: 'parent', author: 'Marie', avatar: '', time: '12:00',
      content: 'Original',
    };
    const promise = env.svc.post('a', 'Réponse', target);
    const intermediate = env.svc.commentsFor('a')();
    expect(intermediate[0]?.replyTo?.author).toBe('Marie');
    await promise;
  });

  it('clearAll wipes every per-article cache', async () => {
    await env.svc.list('a');
    await env.svc.list('b');
    env.svc.clearAll();
    expect(env.svc.isLoaded('a')).toBe(false);
    expect(env.svc.isLoaded('b')).toBe(false);
    expect(env.svc.commentsFor('a')()).toEqual([]);
  });

  it('list converges with a previously posted comment', async () => {
    await env.svc.post('a', 'first');
    await flush();
    env.svc.invalidate('a');
    const fresh = await env.svc.list('a');
    expect(fresh.map(c => c.content)).toEqual(['first']);
  });
});
