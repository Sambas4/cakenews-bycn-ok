import { Injectable, inject } from '@angular/core';
import { Share } from '@capacitor/share';
import { PlatformService } from './platform.service';
import { Logger } from './logger.service';

export interface SharePayload {
  title: string;
  text?: string;
  url?: string;
  /** Localised label for the system share sheet on iOS / Android. */
  dialogTitle?: string;
}

export interface ShareOutcome {
  ok: boolean;
  /** True when the user explicitly dismissed the share sheet. */
  cancelled?: boolean;
  /** Filled in when the underlying API surfaced an error. */
  error?: string;
}

/**
 * Universal sharing surface.
 *
 *   * Native (iOS / Android via Capacitor) → opens the OS share sheet
 *     through `@capacitor/share`. Lets the user pick AirDrop, Signal,
 *     iMessage, photo album, etc. — the kind of native polish a PWA
 *     can never approximate.
 *   * Web → falls back to `navigator.share` when available (modern
 *     mobile browsers) and to a copy-to-clipboard otherwise. Either
 *     way the caller gets a single `ShareOutcome` to react on.
 *
 * Errors are normalised so the article card doesn't need to know
 * which underlying API was used. Cancellations are returned as a
 * non-error `ok: false, cancelled: true` so the caller can stay
 * silent instead of toasting "share failed".
 */
@Injectable({ providedIn: 'root' })
export class NativeShareService {
  private platform = inject(PlatformService);
  private logger = inject(Logger);

  async share(payload: SharePayload): Promise<ShareOutcome> {
    // Native first — the OS sheet always wins when it's available.
    if (this.platform.isNative) {
      try {
        await Share.share({
          title: payload.title,
          text: payload.text,
          url: payload.url,
          dialogTitle: payload.dialogTitle,
        });
        return { ok: true };
      } catch (err) {
        return this.handleNativeError(err);
      }
    }

    // Web Share API on supporting browsers.
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: payload.title,
          text: payload.text,
          url: payload.url,
        });
        return { ok: true };
      } catch (err) {
        return this.handleWebShareError(err);
      }
    }

    // Last-resort fallback: copy the URL to the clipboard so the user
    // still gets *something* useful out of the gesture.
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(payload.url ?? payload.text ?? payload.title);
        return { ok: true };
      } catch (err) {
        this.logger.warn('clipboard fallback failed', err);
        return { ok: false, error: 'clipboard_failed' };
      }
    }

    return { ok: false, error: 'unsupported' };
  }

  // ────────────────────────────────────────────────────────────────

  private handleNativeError(err: unknown): ShareOutcome {
    const message = this.errorMessage(err);
    // Capacitor surfaces a generic 'Share canceled' / 'cancelled'
    // message when the user dismisses the sheet. Don't treat as
    // an error — just signal the cancel.
    if (/cancel/i.test(message)) return { ok: false, cancelled: true };
    this.logger.warn('native share failed', err);
    return { ok: false, error: message };
  }

  private handleWebShareError(err: unknown): ShareOutcome {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, cancelled: true };
    }
    const message = this.errorMessage(err);
    if (/cancel|abort/i.test(message)) return { ok: false, cancelled: true };
    this.logger.warn('navigator.share failed', err);
    return { ok: false, error: message };
  }

  private errorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return 'unknown_error';
  }
}
