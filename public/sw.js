// Tane Booking — Service Worker v2
// Bump CACHE_VERSION con cada deploy para limpiar caché obsoleta

const CACHE_VERSION = 'tane-v2';
const SHELL_URLS = [
  '/admin/dashboard/',
  '/manifest.json',
];

// ── Install ───────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

// ── Activate: limpia TODAS las cachés antiguas ────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => {
        console.log('[SW] Eliminando caché antigua:', k);
        return caches.delete(k);
      }))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first, fallback a caché ────────────
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.hostname !== self.location.hostname) return;

  // NO cachear el dashboard HTML para evitar servir versión obsoleta
  if (url.pathname.startsWith('/admin/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && url.pathname.match(/\.(js|css|woff2?|png|svg|ico|webp)$/)) {
          caches.open(CACHE_VERSION).then(c => c.put(e.request, res.clone()));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── Push notifications ────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return;
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title || 'Tane Booking', {
      body:    data.body  || 'Nueva notificación',
      icon:    '/favicon.svg',
      badge:   '/favicon.svg',
      data:    data.url   || '/admin/dashboard/',
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data));
});
