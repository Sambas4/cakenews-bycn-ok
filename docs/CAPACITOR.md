# Capacitor — iOS & Android targets

CakeNews ships natively on iOS and Android by wrapping the same Vite
PWA bundle in Capacitor. One codebase, two stores, no extra rendering
engine.

## First-time setup (per maintainer machine)

```bash
# 1) Build the web bundle that Capacitor will bundle into the app.
npm run build

# 2) Generate the iOS workspace (Xcode required on macOS).
npx cap add ios

# 3) Generate the Android Gradle project (Android Studio recommended).
npx cap add android

# 4) Add the canonical plugins. They are not pinned in package.json
#    so each maintainer installs only what they need.
npm i @capacitor/share @capacitor/preferences @capacitor/push-notifications
npx cap sync
```

`ios/` and `android/` live in `.gitignore` — every maintainer keeps
their own Xcode / Gradle workspace. The shared bits (Capacitor config,
plugin registrations, native code we ourselves write) live in the
versioned tree.

## Daily flow

| Action                                  | Command                  |
|----------------------------------------|--------------------------|
| Build web → sync into iOS + Android    | `npm run cap:sync`       |
| Open the iOS workspace in Xcode        | `npm run cap:open:ios`   |
| Open the Android project in Studio     | `npm run cap:open:android` |
| Run on a connected iOS device          | `npm run cap:run:ios`    |
| Run on a connected Android device      | `npm run cap:run:android`|

## Plugins and parity matrix

| Web behaviour                  | Capacitor plugin                       | Status        |
|--------------------------------|----------------------------------------|---------------|
| Web Push notifications         | `@capacitor/push-notifications` (FCM/APNs) | Plug-and-play |
| `localStorage` persistence     | `@capacitor/preferences`               | Drop-in       |
| `navigator.share` fallback     | `@capacitor/share`                     | Drop-in       |
| Service worker offline cache   | None — Capacitor has its own cache    | Native handled |
| `prefers-reduced-motion`       | None — OS respects automatically      | Native handled |

## App store metadata checklist

Before the first store submission:

- [ ] Replace `appId: 'app.cakenews.app'` in `capacitor.config.ts`
      with your owned bundle id.
- [ ] Set `appName` and the splash assets (Xcode → Assets.xcassets and
      Android → `res/drawable`).
- [ ] Configure VAPID / FCM keys for `@capacitor/push-notifications`.
- [ ] Update Privacy / Terms URLs to point at the deployed
      `/legal/privacy` and `/legal/terms` routes.
- [ ] Declare the data collection summary required by App Store /
      Google Play (matches `supabase/README.md` plus
      `src/app/views/legal/legal-shell.component.ts`).

## Troubleshooting

`Service Worker` won't run inside `WKWebView` if the app is loaded
from `file://`. Capacitor 7 already routes through the
`capacitor://localhost` virtual origin on iOS and `https://localhost`
on Android — that's the role of the `androidScheme` / `server`
options in `capacitor.config.ts`. Don't change them unless you know
why.

If `npm run cap:sync` complains about a missing `dist/`, run
`npm run build` first; Capacitor expects the Vite output to exist
before sync.
