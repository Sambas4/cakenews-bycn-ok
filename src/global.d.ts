/**
 * Build-time globals injected by Vite's `define` map.
 *
 * `__CAKE_RELEASE__` is the short git SHA of the commit the bundle was
 * built from (12 chars), or the literal `'dev'` for local dev servers.
 * Used by the Sentry binding to tag every captured event with a
 * release, and by the admin footer for a clickable version pill.
 */
declare const __CAKE_RELEASE__: string;
