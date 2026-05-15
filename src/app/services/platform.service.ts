import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

export type RuntimePlatform = 'web' | 'ios' | 'android';

/**
 * Detects whether the app is running inside a Capacitor native
 * WebView or as a regular browser PWA.
 *
 * Why a dedicated service:
 *   * `Capacitor.isNativePlatform()` is the source of truth, but
 *     calling it directly from every consumer scatters the import.
 *     A single seam means `Platform` can be stubbed in tests and
 *     replaced if we ever move off Capacitor.
 *   * The runtime detection happens once at module load. Subsequent
 *     reads are signal-free constants — no listeners, no reactivity
 *     needed since the platform cannot change mid-session.
 */
@Injectable({ providedIn: 'root' })
export class PlatformService {
  /** Current runtime: `'ios'`, `'android'` or `'web'`. */
  readonly runtime: RuntimePlatform = this.detect();

  readonly isNative: boolean = this.runtime !== 'web';
  readonly isWeb: boolean = this.runtime === 'web';
  readonly isIOS: boolean = this.runtime === 'ios';
  readonly isAndroid: boolean = this.runtime === 'android';

  /** True when we have access to system-level navigation APIs. */
  readonly hasNativeShareSheet: boolean = this.isNative;

  /** True when Web Push (VAPID) is the correct registration path. */
  readonly usesWebPush: boolean = this.isWeb && typeof window !== 'undefined' && 'PushManager' in window;

  /** True when FCM/APNs is the correct registration path. */
  readonly usesNativePush: boolean = this.isNative;

  private detect(): RuntimePlatform {
    try {
      if (!Capacitor.isNativePlatform()) return 'web';
      const platform = Capacitor.getPlatform();
      if (platform === 'ios') return 'ios';
      if (platform === 'android') return 'android';
      return 'web';
    } catch {
      // Capacitor not available — running in a test/jsdom environment.
      return 'web';
    }
  }
}
