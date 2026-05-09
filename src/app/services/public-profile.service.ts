import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Logger } from './logger.service';
import { PublicProfile } from '../types';

const TTL_MS = 60_000;

interface CacheEntry {
  profile: PublicProfile | null;
  fetchedAt: number;
}

/**
 * Read-only access to the `public_profiles` table.
 *
 * Why a dedicated service:
 *   * `UserService` already manages the *current* viewer's profile.
 *     A second user (the one a viewer is looking up via `/u/:username`)
 *     has different lifecycle requirements: no realtime, no
 *     persistence, just a fast lookup with a short TTL cache so the
 *     same handle isn't re-fetched twice in a row.
 *   * Two indexes on `public_profiles` exist for this — `uid` and
 *     `username` — and we want a single source for both lookup paths.
 *
 * Cache strategy: in-memory map keyed by `username` and `uid`,
 * 60-second TTL. Cleared on logout via the LocalStorageCleaner is
 * not necessary since this cache lives only in memory.
 */
@Injectable({ providedIn: 'root' })
export class PublicProfileService {
  private supabase = inject(SupabaseService);
  private logger = inject(Logger);

  private byUsername = new Map<string, CacheEntry>();
  private byUid = new Map<string, CacheEntry>();

  /** Resolve a public profile by `@username`. Returns null when missing. */
  async fetchByUsername(username: string): Promise<PublicProfile | null> {
    const key = username.trim().toLowerCase();
    if (!key) return null;

    const cached = this.byUsername.get(key);
    if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.profile;

    try {
      const { data, error } = await this.supabase.client
        .from('public_profiles')
        .select('*')
        .ilike('username', key)
        .maybeSingle();
      if (error) throw error;
      const profile = (data as PublicProfile | null) ?? null;
      this.byUsername.set(key, { profile, fetchedAt: Date.now() });
      if (profile) this.byUid.set(profile.uid, { profile, fetchedAt: Date.now() });
      return profile;
    } catch (e) {
      this.logger.warn('fetchByUsername failed', { username, e });
      return null;
    }
  }

  async fetchByUid(uid: string): Promise<PublicProfile | null> {
    const cached = this.byUid.get(uid);
    if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.profile;

    try {
      const { data, error } = await this.supabase.client
        .from('public_profiles')
        .select('*')
        .eq('uid', uid)
        .maybeSingle();
      if (error) throw error;
      const profile = (data as PublicProfile | null) ?? null;
      this.byUid.set(uid, { profile, fetchedAt: Date.now() });
      if (profile?.username) {
        this.byUsername.set(profile.username.toLowerCase(), { profile, fetchedAt: Date.now() });
      }
      return profile;
    } catch (e) {
      this.logger.warn('fetchByUid failed', { uid, e });
      return null;
    }
  }

  /**
   * Light-weight server-side search over `public_profiles`. Used by
   * the search view to surface user results alongside articles.
   */
  async search(query: string, limit = 10): Promise<PublicProfile[]> {
    const q = query.trim();
    if (!q) return [];
    try {
      const { data, error } = await this.supabase.client
        .from('public_profiles')
        .select('*')
        .or(`username.ilike.%${q}%,displayName.ilike.%${q}%`)
        .limit(Math.min(Math.max(limit, 1), 50));
      if (error) throw error;
      return (data as PublicProfile[] | null) ?? [];
    } catch (e) {
      this.logger.warn('public profile search failed', { query, e });
      return [];
    }
  }

  /** Clear the cache — useful in tests, or after a profile update. */
  invalidate(): void {
    this.byUsername.clear();
    this.byUid.clear();
  }
}
