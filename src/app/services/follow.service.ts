import { Injectable, computed, signal } from '@angular/core';

export type FollowKind = 'author' | 'topic' | 'tag';

export interface FollowEntry {
  kind: FollowKind;
  /** Author name, topic slug or tag string. */
  value: string;
  followedAt: number;
}

const STORAGE_KEY = 'cake_follows';

/**
 * Explicit follow store — separate intent from heuristic engagement.
 *
 * The "Cercle" lane previously inferred trusted authors purely from
 * past likes / saves / comments. That made the lane unstable: read a
 * politics article once and a politics writer ends up in your Cercle
 * forever. With explicit follows, the user *says* who matters, the
 * algorithm respects it, and the Cercle becomes deterministic.
 *
 * Local-first: a real deployment will mirror to a `follows` Supabase
 * table with RLS allowing each user only their own row. The shape is
 * stable so that migration won't break the UI.
 */
@Injectable({ providedIn: 'root' })
export class FollowService {
  private readonly entries = signal<FollowEntry[]>(this.load());

  readonly all = computed(() => this.entries());

  readonly authors = computed(() =>
    this.entries().filter(e => e.kind === 'author').map(e => e.value)
  );

  readonly topics = computed(() =>
    this.entries().filter(e => e.kind === 'topic').map(e => e.value)
  );

  readonly tags = computed(() =>
    this.entries().filter(e => e.kind === 'tag').map(e => e.value)
  );

  isFollowing(kind: FollowKind, value: string): boolean {
    return this.entries().some(e => e.kind === kind && e.value === value);
  }

  toggle(kind: FollowKind, value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) return false;
    let nowFollowing = false;
    this.entries.update(curr => {
      const idx = curr.findIndex(e => e.kind === kind && e.value === trimmed);
      if (idx >= 0) {
        const next = [...curr];
        next.splice(idx, 1);
        this.persist(next);
        nowFollowing = false;
        return next;
      }
      const next = [...curr, { kind, value: trimmed, followedAt: Date.now() }];
      this.persist(next);
      nowFollowing = true;
      return next;
    });
    return nowFollowing;
  }

  /** Wipe all follows. Used by the logout cleaner. */
  clear() {
    this.entries.set([]);
    this.persist([]);
  }

  private load(): FollowEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as FollowEntry[];
    } catch { return []; }
  }

  private persist(list: FollowEntry[]) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  }
}
