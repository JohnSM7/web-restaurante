// Tane Booking — Service Worker v1
// Caches static assets for offline access to the admin panel shell

const CACHE_NAME = 'tane-v1';
const SHELL_URLS = [
  '/admin/dashboard',
  '/manifest.json',
];

// ── Install: pre-cache shell ──────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first, fallback to cache ───────────────
self.addEventListener('fetch', (e) => {
  // Skip non-GET requests and Firebase / CDN calls
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.hostname !== self.location.hostname) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache successful responses for static assets
        if (res.ok && (url.pathname.match(/\.(js|css|woff2?|png|svg|ico)$/) || SHELL_URLS.includes(url.pathname))) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── Push notifications ────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return;
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title || 'Tane Booking', {
      body:    data.body  || 'Nueva notificación',
      icon:    '/favicon.svg',
      badge:   '/favicon.svg',
      data:    data.url   || '/admin/dashboard',
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data));
});
