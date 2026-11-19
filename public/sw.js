/* M King Reads service worker */
const SHELL = 'mkr-shell-v4';
const OFFLINE_BOOKS = 'mkr-offline-books-v1';
const RUNTIME = 'mkr-runtime-v4';
const APP_SHELL = ['/', '/library', '/offline.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(c => c.addAll(APP_SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  const keep = [SHELL, OFFLINE_BOOKS, RUNTIME];
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k)))));
  self.clients.claim();
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Book covers from Gutenberg: cache-first so shelves look right offline.
  if (url.hostname === 'www.gutenberg.org' && /\.cover\.(medium|small)\.jpg$/.test(url.pathname)) {
    event.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(RUNTIME).then(c => { c.put(req, copy); trim(RUNTIME, 300); });
      return res;
    }).catch(() => hit)));
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

  const isNav = req.mode === 'navigate';
  const isStatic = url.pathname.startsWith('/_next/static/') || /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?)$/.test(url.pathname);

  if (isStatic) {
    event.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(SHELL).then(c => c.put(req, copy)); }
      return res;
    })));
    return;
  }

  if (isNav) {
    event.respondWith(fetch(req).then(res => {
      if (res.ok && !url.pathname.startsWith('/read/')) { const copy = res.clone(); caches.open(RUNTIME).then(c => { c.put(req, copy); trim(RUNTIME, 300); }); }
      return res;
    }).catch(async () => {
      const exact = await caches.match(req, { ignoreSearch: false });
      if (exact) return exact;
      const loose = await caches.match(url.pathname);
      return loose || caches.match('/offline.html');
    }));
  }
});
