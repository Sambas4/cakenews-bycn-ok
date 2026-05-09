import { Injectable, computed, signal } from '@angular/core';

const STORAGE_KEY = 'cake_prefs';

interface PrefsShape {
  reduceMotion?: boolean;
}

/**
 * Reads the resolved animation preference from two sources:
 *
 *   1. The OS-level `prefers-reduced-motion` media query (W3C signal,
 *      already widely adopted on iOS/Android/macOS).
 *   2. The in-app override saved by the profile settings under
 *      `cake_prefs.reduceMotion`.
 *
 * Whichever is true wins — we err on the side of *less* motion. The
 * resolved boolean is published as a signal so any component or
 * directive can react without a manual subscription.
 *
 * The CSS-side counterpart toggles the `cake-reduce-motion` class on
 * `<html>`; styles in `styles.css` honour that to suspend animations.
 */
@Injectable({ providedIn: 'root' })
export class MotionPreferenceService {
  private readonly osPref = signal<boolean>(this.detectMediaQuery());
  private readonly userPref = signal<boolean>(this.detectUserPref());

  /** Resolved: true when the user OR the OS asks for reduced motion. */
  readonly reduceMotion = computed(() => this.osPref() || this.userPref());

  constructor() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      mql.addEventListener?.('change', (e) => this.osPref.set(e.matches));
    }
    // Mirror the resolved value onto the document root so CSS can hook
    // into a single class for global suspension of animations.
    if (typeof document !== 'undefined') {
      const apply = () => {
        document.documentElement.classList.toggle('cake-reduce-motion', this.reduceMotion());
      };
      apply();
      // Microtask so the initial classList reflects the right value
      // before paint.
      queueMicrotask(apply);
      // React to in-app preference changes — settings call refresh().
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          this.userPref.set(this.detectUserPref());
          apply();
        }
      });
    }
  }

  /** Re-read the in-app preference. Call after writing to settings. */
  refresh(): void {
    this.userPref.set(this.detectUserPref());
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('cake-reduce-motion', this.reduceMotion());
    }
  }

  private detectMediaQuery(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private detectUserPref(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as PrefsShape;
      return parsed?.reduceMotion === true;
    } catch { return false; }
  }
}
