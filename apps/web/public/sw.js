// QRGuard service worker.
// Keeps it simple and safe:
//  - Pages always come from the network (scan results must be live).
//    If the phone is offline, show the /offline page instead.
//  - Next.js build files (/_next/static) never change, so they are cached.
//  - API calls and anything else are not touched.

const VERSION = 'v1';
const PAGES_CACHE = `qrguard-pages-${VERSION}`;
const STATIC_CACHE = `qrguard-static-${VERSION}`;
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, '/icons/icon-192.png']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  // Delete caches from older versions.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith('qrguard-') && key !== PAGES_CACHE && key !== STATIC_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Page loads: network first, offline page as a fallback.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Build files have a hash in the name, so a cached copy is always correct.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
  }
});
