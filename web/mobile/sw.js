// Caches the app shell only. API responses are NEVER cached: a stale cache could
// hide a release, or keep showing results after access changes.
const CACHE = 'fx-mobile-v1';
const SHELL = ['/mobile/', '/mobile/index.html', '/mobile/mobile.js', '/mobile/icon.svg', '/mobile/manifest.webmanifest',
  '/shared/fx.css', '/shared/api.js', '/shared/render.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return; // straight to network
  // Network first so demos always show the latest code; fall back to the cached shell offline.
  e.respondWith(
    fetch(e.request)
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('/mobile/index.html'))),
  );
});
