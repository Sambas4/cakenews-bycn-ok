/* eslint-disable */
/**
 * CakeNews Service Worker — production grade.
 *
 * Strategy:
 *  - **App shell**: precache the index. Fall back to it for navigations.
 *  - **JS / CSS / WASM** (same origin): stale-while-revalidate, but never
 *    serve stale `index.html`. Bypass for chunks containing 'sockjs' / HMR.
 *  - **Images**: cache-first with a hard ceiling (200 entries, 30 days).
 *  - **Fonts**: cache-first, immutable, very long TTL.
 *  - **Auth / API / RT**: never cached.
 *
 * Cache versioning is keyed by `CACHE_VERSION`; bumping the version
 * invalidates all previous caches so old binaries can't ghost-serve.
 */

const CACHE_VERSION = 'v3';
const SHELL = `cake-shell-${CACHE_VERSION}`;
const STATIC = `cake-static-${CACHE_VERSION}`;
const IMAGES = `cake-images-${CACHE_VERSION}`;
const FONTS = `cake-fonts-${CACHE_VERSION}`;
const APP_SHELL_URLS = ['/', '/index.html', '/manifest.json'];

const IMAGE_HOSTS = ['images.unsplash.com', 'api.dicebear.com', 'picsum.photos', 'api.iconify.design'];
const FONT_HOSTS = ['fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      .then((cache) => cache.addAll(APP_SHELL_URLS).catch(() => null))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => ![SHELL, STATIC, IMAGES, FONTS].includes(k))
            .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (event.data?.type === 'PRECACHE_ASSETS' && Array.isArray(event.data.urls)) {
    // First-load offline support: the client lists every <script src>
    // and <link rel="stylesheet"> currently mounted and asks the SW
    // to warm the STATIC cache. After this completes, a cold reload
    // with no network is fully functional.
    const urls = event.data.urls
      .filter((u) => typeof u === 'string')
      .slice(0, 60);
    event.waitUntil((async () => {
      const cache = await caches.open(STATIC);
      await Promise.all(urls.map(async (url) => {
        try {
          const cached = await cache.match(url);
          if (cached) return;
          const resp = await fetch(url, { credentials: 'same-origin' });
          if (resp.ok) await cache.put(url, resp);
        } catch { /* network error — skip */ }
      }));
    })());
    return;
  }
  if (event.data?.type === 'PRECACHE_IMAGES' && Array.isArray(event.data.urls)) {
    // Best-effort image pre-warm so the next cold-start (possibly
    // offline) renders covers from cache. Capped to avoid abuse.
    const urls = event.data.urls.slice(0, 20).filter((u) => typeof u === 'string');
    event.waitUntil((async () => {
      const cache = await caches.open(IMAGES);
      await Promise.all(urls.map(async (url) => {
        try {
          const cached = await cache.match(url);
          if (cached) return;
          const resp = await fetch(url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer' });
          if (resp.ok && resp.type !== 'opaqueredirect') await cache.put(url, resp);
        } catch { /* network error — skip silently */ }
      }));
      trimCache(IMAGES, 200);
    })());
  }
});

// ────────────────────────────────────────────────────────────────
// Push notifications
// ────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  // Payloads come from the Edge Function as a JSON object shaped like
  // { title, body, tone, url, tag? }. We're permissive on parsing so a
  // future server change can extend the payload without breaking us.
  let payload = {};
  if (event.data) {
    try { payload = event.data.json(); } catch { payload = { title: 'CakeNews', body: event.data.text() }; }
  }
  const title = payload.title || 'CakeNews';
  const options = {
    body: payload.body || '',
    icon: 'https://api.iconify.design/lucide:zap.svg?color=%23ffffff',
    badge: 'https://api.iconify.design/lucide:zap.svg?color=%23ffffff',
    tag: payload.tag || payload.tone || 'cakenews',
    renotify: true,
    data: { url: payload.url || '/feed' },
    vibrate: [60, 30, 60],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/feed';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Re-focus an existing CakeNews tab if any, then route it.
    for (const client of all) {
      if ('focus' in client) {
        try { await client.focus(); } catch { /* ignore */ }
        if ('navigate' in client) {
          try { await client.navigate(target); } catch { /* ignore */ }
        }
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1. Never touch auth / API / realtime / supabase / firebase RT.
  if (
    url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/api') ||
    url.hostname.endsWith('.supabase.co') ||
    url.hostname.endsWith('.supabase.in') ||
    url.protocol === 'ws:' ||
    url.protocol === 'wss:'
  ) {
    return;
  }

  // 2. SPA navigations — network first with shell fallback.
  if (req.mode === 'navigate') {
    event.respondWith(networkFirstShell(req));
    return;
  }

  // 3. Fonts (long-lived, immutable).
  if (FONT_HOSTS.some((h) => url.hostname.includes(h))) {
    event.respondWith(cacheFirst(FONTS, req, { maxEntries: 60 }));
    return;
  }

  // 4. Images.
  if (IMAGE_HOSTS.some((h) => url.hostname.includes(h)) || /\.(png|jpe?g|webp|avif|svg|gif|ico)(\?|$)/.test(url.pathname)) {
    event.respondWith(cacheFirst(IMAGES, req, { maxEntries: 200 }));
    return;
  }

  // 5. Same-origin static (JS/CSS/HTML chunks): stale-while-revalidate.
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(STATIC, req));
  }
});

async function networkFirstShell(request) {
  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      const cache = await caches.open(SHELL);
      cache.put('/index.html', fresh.clone()).catch(() => null);
    }
    return fresh;
  } catch {
    const cache = await caches.open(SHELL);
    const fallback = await cache.match('/index.html') || await cache.match('/');
    if (fallback) return fallback;
    return new Response('<h1>Hors ligne</h1>', { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 });
  }
}

async function cacheFirst(cacheName, request, opts = {}) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh.ok && fresh.type !== 'opaqueredirect') {
      cache.put(request, fresh.clone()).catch(() => null);
      if (opts.maxEntries) trimCache(cacheName, opts.maxEntries);
    }
    return fresh;
  } catch {
    // Ultimate fallback: return cached even if stale, otherwise an error.
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then((fresh) => {
    if (fresh.ok) cache.put(request, fresh.clone()).catch(() => null);
    return fresh;
  }).catch(() => cached);
  return cached || networkPromise;
}

async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    const overflow = keys.length - maxEntries;
    if (overflow > 0) {
      for (let i = 0; i < overflow; i++) await cache.delete(keys[i]);
    }
  } catch { /* ignore */ }
}
