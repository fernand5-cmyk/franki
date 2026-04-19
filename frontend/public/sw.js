// Franki Service Worker — PWA + Push Notifications
const CACHE_NAME = 'franki-v1'
const STATIC_ASSETS = ['/', '/index.html']

// ── Install: cache shell ───────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// ── Activate: clean old caches ─────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── Fetch: network-first for API, cache-first for assets ──────────────────
self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/')) return  // never cache API calls
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})

// ── Push: show notification ────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    '/icons/icon-192.png',
      badge:   '/icons/icon-192.png',
      tag:     data.tag || 'franki-notif',
      data:    { url: data.url || '/' },
      vibrate: [200, 100, 200],
      actions: data.actions || [],
    })
  )
})

// ── Notification click: open app ───────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin))
      if (existing) { existing.focus(); return existing.navigate(url) }
      return clients.openWindow(url)
    })
  )
})
