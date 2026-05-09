import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for CakeNews.
 *
 * Two targets: iOS and Android. Both consume the same `dist/` Vite
 * bundle as the PWA, so a single `npm run build` feeds the web, the
 * iOS app and the Android app — no double maintenance.
 *
 * Why these settings:
 *   * `webDir: 'dist'`         — Vite's output, matches `vite build`.
 *   * `server.androidScheme: 'https'` — required so `Service Worker`
 *                                 and `Cache Storage` work on Android.
 *                                  The app is loaded over a virtual
 *                                  `https://` origin instead of
 *                                  `file://`.
 *   * `webContentsDebuggingEnabled` is dev-only by default; native
 *                                  builds opt in via the env var.
 *
 * Native folders (`ios/`, `android/`) are NOT committed. Generate
 * them on a developer machine with:
 *
 *     npx cap add ios
 *     npx cap add android
 *
 * They are listed in `.gitignore` so each maintainer keeps their own
 * Xcode / Gradle workspace.
 */
const config: CapacitorConfig = {
  appId: 'app.cakenews.app',
  appName: 'CakeNews',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
  ios: {
    contentInset: 'always',
    scrollEnabled: true,
  },
  // `androidScheme: 'https'` lives under `server` (Capacitor 7);
  // it routes the WebView through a virtual https:// origin so
  // Service Workers and Cache Storage keep working.
  server: {
    androidScheme: 'https',
  },
  // Plugin configuration. The plugins themselves are added on demand
  // by maintainers (`npm i @capacitor/share @capacitor/push-
  // notifications @capacitor/preferences`), so we leave the section
  // empty here and document the canonical set in CAPACITOR.md.
  plugins: {},
};

export default config;
