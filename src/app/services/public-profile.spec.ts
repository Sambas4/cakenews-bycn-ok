import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PublicProfileService } from './public-profile.service';
import { SupabaseService } from './supabase.service';
import { PublicProfile } from '../types';

declare const ensureTestBed: () => void;

/**
 * Hand-rolled query builder mock. We only care about the surface the
 * service uses: `from(...).select(...).ilike(...).maybeSingle()` and
 * `from(...).select(...).or(...).limit(...)`. Everything else falls
 * through to a no-op so missed call sites surface as visible
 * "undefined is not a function" errors.
 */
class FakeQueryBuilder {
  private rows: PublicProfile[];
  private singleByDefault = false;
  private filters: Array<{ kind: 'ilike' | 'eq' | 'or'; col?: string; value: string }> = [];
  private limitVal: number | null = null;
  /** Visible counter so the cache test can verify dedup. */
  static fetchCount = 0;

  constructor(rows: PublicProfile[]) { this.rows = rows; }

  select(_cols: string) { return this; }
  ilike(col: string, value: string) { this.filters.push({ kind: 'ilike', col, value }); return this; }
  eq(col: string, value: string) { this.filters.push({ kind: 'eq', col, value }); return this; }
  or(value: string) { this.filters.push({ kind: 'or', value }); return this; }
  limit(n: number) { this.limitVal = n; return this; }

  maybeSingle() {
    FakeQueryBuilder.fetchCount += 1;
    return Promise.resolve({ data: this.applyFilters()[0] ?? null, error: null });
  }

  // Direct await on the query — used by `.or(...).limit(...)`.
  then<T>(resolve: (v: { data: PublicProfile[] | null; error: null }) => T) {
    FakeQueryBuilder.fetchCount += 1;
    let out = this.applyFilters();
    if (this.limitVal !== null) out = out.slice(0, this.limitVal);
    return Promise.resolve({ data: out, error: null }).then(resolve);
  }

  private applyFilters(): PublicProfile[] {
    return this.rows.filter(row => {
      for (const f of this.filters) {
        if (f.kind === 'ilike' && f.col) {
          const value = (row as unknown as Record<string, string | undefined>)[f.col];
          if (!value || value.toLowerCase() !== f.value.toLowerCase()) return false;
        }
        if (f.kind === 'eq' && f.col) {
          const value = (row as unknown as Record<string, string | undefined>)[f.col];
          if (value !== f.value) return false;
        }
        if (f.kind === 'or') {
          // pattern: "username.ilike.%q%,displayName.ilike.%q%"
          const m = /ilike\.%(.+?)%/.exec(f.value);
          if (!m) return true;
          const needle = m[1]!.toLowerCase();
          const usernameMatch = row.username?.toLowerCase().includes(needle);
          const dnMatch = row.displayName?.toLowerCase().includes(needle);
          if (!usernameMatch && !dnMatch) return false;
        }
      }
      return true;
    });
  }
}

class FakeSupabaseService {
  rows: PublicProfile[] = [];
  client = { from: (_table: string) => new FakeQueryBuilder(this.rows) };
}

function setup() {
  ensureTestBed();
  FakeQueryBuilder.fetchCount = 0;
  const supabase = new FakeSupabaseService();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      PublicProfileService,
      { provide: SupabaseService, useValue: supabase },
    ],
  });
  return {
    svc: TestBed.inject(PublicProfileService),
    supabase,
  };
}

function profile(uid: string, username: string, displayName: string): PublicProfile {
  return { uid, username, displayName, bio: '', photoURL: '', updatedAt: new Date().toISOString() };
}

describe('PublicProfileService', () => {
  let env = setup();
  beforeEach(() => { env = setup(); });

  it('returns null when the username is missing or empty', async () => {
    expect(await env.svc.fetchByUsername('')).toBeNull();
    expect(await env.svc.fetchByUsername('   ')).toBeNull();
  });

  it('returns null for unknown handles without throwing', async () => {
    env.supabase.rows = [profile('u1', 'marie', 'Marie Dupont')];
    const out = await env.svc.fetchByUsername('ghost');
    expect(out).toBeNull();
  });

  it('caches results within the TTL window', async () => {
    env.supabase.rows = [profile('u1', 'marie', 'Marie Dupont')];

    expect(await env.svc.fetchByUsername('marie')).toMatchObject({ uid: 'u1' });
    expect(await env.svc.fetchByUsername('marie')).toMatchObject({ uid: 'u1' });
    // The query builder counts each `maybeSingle()` invocation.
    expect(FakeQueryBuilder.fetchCount).toBe(1);
  });

  it('caches across the username/uid lookup pair', async () => {
    env.supabase.rows = [profile('u1', 'marie', 'Marie Dupont')];

    await env.svc.fetchByUsername('marie');
    const byUid = await env.svc.fetchByUid('u1');
    // Second lookup must come from the cache populated by the first.
    expect(byUid?.username).toBe('marie');
    expect(FakeQueryBuilder.fetchCount).toBe(1);
  });

  it('search returns matches filtered by ilike on username/displayName', async () => {
    env.supabase.rows = [
      profile('u1', 'marie',  'Marie Dupont'),
      profile('u2', 'maxime', 'Maxime Durand'),
      profile('u3', 'paul',   'Paul Martin'),
    ];

    const out = await env.svc.search('mar');
    // "mar" matches "Marie" (username + displayName) and "Paul Martin"
    // (displayName via "Martin"). It does NOT match "Maxime" — that's
    // "max" + "ime", no "mar" substring.
    expect(out.map(p => p.uid).sort()).toEqual(['u1', 'u3']);
  });

  it('search excludes rows that do not contain the query in username or displayName', async () => {
    env.supabase.rows = [
      profile('u1', 'marie',  'Marie Dupont'),
      profile('u2', 'paul',   'Paul Martin'),
    ];
    const out = await env.svc.search('zzz');
    expect(out).toEqual([]);
  });

  it('invalidate() clears the cache', async () => {
    env.supabase.rows = [profile('u1', 'marie', 'Marie Dupont')];
    await env.svc.fetchByUsername('marie');
    env.svc.invalidate();
    await env.svc.fetchByUsername('marie');
    expect(FakeQueryBuilder.fetchCount).toBe(2);
  });
});
