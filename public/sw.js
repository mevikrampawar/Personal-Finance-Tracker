const CACHE_NAME = 'finance-tracker-v3'

const BASE = self.location.pathname.replace(/\/sw\.js$/, '')

const APP_SHELL = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/favicon.svg',
  BASE + '/manifest.json',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.hostname.includes('firestore.googleapis.com')) return
  if (url.hostname.includes('firebaseio.com')) return

  // Navigation requests — network first, cache on success
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).then((response) => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        return response
      }).catch(() => caches.match(request)),
    )
    return
  }

  // Same-origin assets — stale-while-revalidate
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        }).catch(() => cached)
        return cached || fetchPromise
      }),
    )
    return
  }

  // Everything else — network only
  e.respondWith(fetch(request).catch(() => caches.match(request)))
})
