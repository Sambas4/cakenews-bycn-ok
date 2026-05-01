import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'cake_private_mode';

/**
 * Privacy switch. When ON, the app pretends to be amnesic: no session
 * history is logged, no engagement signal feeds the algorithm, no
 * trust event is recorded. The viewer reads, that's it.
 *
 * This is a *real* privacy feature for journalists handling sources.
 * It is **not** a "do not track" header proxy — it's an enforcement
 * boundary: every recorder service consults `enabled()` and bails when
 * it's true.
 *
 * Surfaced in the messaging settings + an explicit toggle on the
 * profile so it's never hidden behind three menus.
 */
@Injectable({ providedIn: 'root' })
export class PrivacyService {
  readonly enabled = signal<boolean>(this.load());

  toggle() {
    this.enabled.update(v => {
      const next = !v;
      try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  }

  set(v: boolean) {
    this.enabled.set(v);
    try { localStorage.setItem(STORAGE_KEY, v ? '1' : '0'); } catch { /* ignore */ }
  }

  private load(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }
}
