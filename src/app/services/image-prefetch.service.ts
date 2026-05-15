import { Injectable, inject } from '@angular/core';
import { Logger } from './logger.service';

const RECENT_TTL_MS = 5 * 60_000;

/**
 * Sends a `PRECACHE_IMAGES` request to the service worker so a small
 * batch of cover images is fetched-and-cached eagerly. The next time
 * the user opens the app — even offline — the SW returns those covers
 * cache-first and the feed renders with imagery, not placeholder boxes.
 *
 * Design choices:
 *  - We dedupe URLs against an in-memory set with a short TTL so the
 *    same article-list snapshot doesn't trigger redundant precache
 *    cycles on each realtime tick.
 *  - The SW handler we expect is `PRECACHE_IMAGES`; if no SW is
 *    registered (dev mode, unsupported browser) we no-op silently.
 *  - We never await the SW: the operation is best-effort, the user
 *    must not wait on it.
 */
@Injectable({ providedIn: 'root' })
export class ImagePrefetchService {
  private logger = inject(Logger);
  private recentlyRequested = new Map<string, number>();

  precache(urls: ReadonlyArray<string | undefined>): void {
    const fresh = this.dedupe(urls);
    if (fresh.length === 0) return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    void navigator.serviceWorker.ready
      .then(reg => {
        const target = reg.active ?? navigator.serviceWorker.controller;
        if (!target) return;
        target.postMessage({ type: 'PRECACHE_IMAGES', urls: fresh });
      })
      .catch(e => this.logger.warn('precache postMessage failed', e));
  }

  private dedupe(urls: ReadonlyArray<string | undefined>): string[] {
    const now = Date.now();
    // GC stale entries opportunistically.
    for (const [url, ts] of this.recentlyRequested) {
      if (now - ts > RECENT_TTL_MS) this.recentlyRequested.delete(url);
    }
    const out: string[] = [];
    for (const u of urls) {
      if (!u || typeof u !== 'string') continue;
      if (this.recentlyRequested.has(u)) continue;
      this.recentlyRequested.set(u, now);
      out.push(u);
    }
    return out;
  }
}
