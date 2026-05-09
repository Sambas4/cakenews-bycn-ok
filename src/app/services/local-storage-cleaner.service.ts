import { Injectable } from '@angular/core';

/**
 * Keys that belong to the *currently logged-in viewer* and must be
 * wiped on sign-out so a shared device cannot leak the previous user's
 * preferences, history, trust ledger or counter-brief inbox to the
 * next session.
 *
 * Anything *not* listed here (cohort bucket, supabase auth tokens
 * managed by Supabase itself, accessibility settings) is allowed to
 * survive across logouts.
 */
const USER_SCOPED_KEYS = [
  'cake_likes',
  'cake_saves',
  'cake_reads',
  'cake_comments',
  'cake_interests',
  'cake_onboarding',
  'cake_vibes',
  'cake_location',
  'cake_stats',
  'cake_trust_log',
  'cake_counter_briefs',
  'cake_follows',
  'cake_private_mode',
  'cake_msg_prefs',
  'cake_prefs',
  'cake_offline_articles_v1',
  'cake_email_verify_dismissed_at',
] as const;

/**
 * Owns the lifecycle of user-scoped local storage. Centralised so the
 * AuthService doesn't need to know the full key surface — and so a new
 * persisted feature only needs to register its key here once.
 */
@Injectable({ providedIn: 'root' })
export class LocalStorageCleanerService {
  /** Wipe every user-scoped key. Safe to call multiple times. */
  purgeUserScope(): void {
    for (const key of USER_SCOPED_KEYS) {
      try { localStorage.removeItem(key); } catch { /* ignore */ }
    }
  }
}
