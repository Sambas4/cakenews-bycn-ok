import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FollowService } from './follow.service';

declare const ensureTestBed: () => void;

function setup() {
  ensureTestBed();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [FollowService] });
  return { svc: TestBed.inject(FollowService) };
}

describe('FollowService', () => {
  let env = setup();
  beforeEach(() => { env = setup(); });

  it('starts with no follows', () => {
    expect(env.svc.all()).toEqual([]);
    expect(env.svc.authors()).toEqual([]);
  });

  it('toggle creates and removes the entry idempotently', () => {
    expect(env.svc.toggle('author', 'Marie Dupont')).toBe(true);
    expect(env.svc.isFollowing('author', 'Marie Dupont')).toBe(true);

    expect(env.svc.toggle('author', 'Marie Dupont')).toBe(false);
    expect(env.svc.isFollowing('author', 'Marie Dupont')).toBe(false);
  });

  it('isolates follow kinds (author / topic / tag)', () => {
    env.svc.toggle('author', 'Marie');
    env.svc.toggle('topic', 'Tech');
    env.svc.toggle('tag', 'Election2026');

    expect(env.svc.authors()).toEqual(['Marie']);
    expect(env.svc.topics()).toEqual(['Tech']);
    expect(env.svc.tags()).toEqual(['Election2026']);
  });

  it('persists across reloads', () => {
    env.svc.toggle('author', 'Marie');
    const env2 = setup();
    expect(env2.svc.isFollowing('author', 'Marie')).toBe(true);
  });

  it('rejects empty values', () => {
    expect(env.svc.toggle('author', '   ')).toBe(false);
    expect(env.svc.all()).toEqual([]);
  });

  it('clear() empties the store', () => {
    env.svc.toggle('author', 'Marie');
    env.svc.clear();
    expect(env.svc.all()).toEqual([]);
  });
});
