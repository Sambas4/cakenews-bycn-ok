import { Injectable, computed, signal } from '@angular/core';

const STORAGE_KEY = 'cake_prefs';

interface PrefsShape {
  reduceMotion?: boolean;
  largerText?: boolean;
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
  private readonly largerTextPref = signal<boolean>(this.detectLargerText());

  /** Resolved: true when the user OR the OS asks for reduced motion. */
  readonly reduceMotion = computed(() => this.osPref() || this.userPref());

  /** True when the user wants oversized text (in-app preference only). */
  readonly largerText = computed(() => this.largerTextPref());

  constructor() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      mql.addEventListener?.('change', (e) => this.osPref.set(e.matches));
    }
    if (typeof document !== 'undefined') {
      const apply = () => {
        const root = document.documentElement;
        root.classList.toggle('cake-reduce-motion', this.reduceMotion());
        root.classList.toggle('cake-larger-text', this.largerText());
      };
      apply();
      queueMicrotask(apply);
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          this.userPref.set(this.detectUserPref());
          this.largerTextPref.set(this.detectLargerText());
          apply();
        }
      });
    }
  }

  /** Re-read the in-app preferences. Call after writing to settings. */
  refresh(): void {
    this.userPref.set(this.detectUserPref());
    this.largerTextPref.set(this.detectLargerText());
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.classList.toggle('cake-reduce-motion', this.reduceMotion());
      root.classList.toggle('cake-larger-text', this.largerText());
    }
  }

  private detectMediaQuery(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private detectUserPref(): boolean {
    return this.readPref('reduceMotion');
  }

  private detectLargerText(): boolean {
    return this.readPref('largerText');
  }

  private readPref(key: keyof PrefsShape): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as PrefsShape;
      return parsed?.[key] === true;
    } catch { return false; }
  }
}
