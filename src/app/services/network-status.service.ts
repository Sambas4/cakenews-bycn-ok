import { Injectable, signal } from '@angular/core';

/**
 * Single source of truth for the browser's online/offline status.
 *
 * Uses `navigator.onLine` as the cheap synchronous answer plus the
 * `online` / `offline` window events for live updates. We intentionally
 * do **not** ping a server here — `navigator.onLine` is good enough for
 * the UX hint, and our realtime + REST layers will surface real network
 * failures via their own error paths.
 *
 * Side-effect free other than the event listeners attached at
 * construction. Single root-level instance is fine because the lifetime
 * of the service matches the app window.
 */
@Injectable({ providedIn: 'root' })
export class NetworkStatusService {
  /** True when the platform reports we have network. */
  readonly isOnline = signal<boolean>(this.detect());

  /** Timestamp of the most recent transition, useful for "back online" UI. */
  readonly lastChangeAt = signal<number>(Date.now());

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => this.set(true));
    window.addEventListener('offline', () => this.set(false));
  }

  private detect(): boolean {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine !== false;
  }

  private set(value: boolean) {
    if (this.isOnline() === value) return;
    this.isOnline.set(value);
    this.lastChangeAt.set(Date.now());
  }
}
