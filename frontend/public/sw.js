// Minimal service worker — enables PWA install prompt
// No caching — app always fetches fresh data from server

const CACHE = 'pw-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

// Pass all requests through — no offline caching
self.addEventListener('fetch', e => {
  // Only handle same-origin requests, skip API calls
  if (e.request.url.includes('/api/')) return
  e.respondWith(fetch(e.request))
})
