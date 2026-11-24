// Rostrum Service Worker
// Enables offline functionality and PWA installation

let CACHE_NAME = 'rostrum-v1.0.0';
// Cache Storage is shared by every app on this origin; isolate each deployment.
const CACHE_SCOPE = 'rostrum-scope:' + self.registration.scope + ':';
// Relative to this script, so Rostrum works when served from a subdirectory.
// The packaged page is rostrum.html where Rostrum is deployed alongside the rest
// of the site, and index.html where the deployment is Rostrum alone, so try both
// and keep whichever exists: addAll would reject the whole install if either
// were missing.
let urlsToCache = [
  './',
  './rostrum.html',
  './index.html',
];
// The Pages build sets a single, versioned file for both app entry URLs.
const appEntry = null;
// The static-host build replaces this with the guidebook and its images, which
// that deployment carries, so the guidebook reads offline like the rest of the
// app. The videos are deliberately absent: they are 11.5 MB against 2.5 MB for
// every image, they are already preload="none" in the guidebook, and the fetch
// handler below leaves media to the network entirely.
const docToCache = [];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SCOPE + CACHE_NAME)
      .then((cache) => {
        console.log('Rostrum: Cache opened');
        return Promise.all([...(appEntry ? [appEntry] : urlsToCache), ...docToCache]
          .map(async (url) => {
            try {
              const response = await fetch(new Request(url, { cache: 'reload' }));
              if (!response.ok) throw new Error(`Could not precache ${url}: ${response.status}`);
              await cache.put(url, response);
            } catch (error) {
              // Keep the active offline copy if the new app failed to download.
              if (url === appEntry) throw error;
            }
          }));
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith(CACHE_SCOPE) && cacheName !== CACHE_SCOPE + CACHE_NAME) {
            console.log('Rostrum: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

// Fetch event - start the versioned app from cache; allow explicit refreshes.
self.addEventListener('fetch', (event) => {
  // Only handle GET requests — never intercept POST/PUT/etc. (e.g. OAuth token exchanges)
  if (event.request.method !== 'GET') return;
  // A nested experimental deployment has its own worker and cache.
  if (new URL(event.request.url).pathname.startsWith(
      new URL('wink-page-turn/', self.registration.scope).pathname)) return;

  if (event.request.mode === 'navigate' && new URL(event.request.url).origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_SCOPE + CACHE_NAME);
      const url = new URL(event.request.url);
      const entry = urlsToCache.some(path => new URL(path, self.registration.scope).pathname === url.pathname);
      const key = entry && appEntry ? new URL(appEntry, self.registration.scope) : new URL(url);
      if (entry) key.search = '';
      const refresh = url.searchParams.has('t') || ['reload', 'no-cache'].includes(event.request.cache);
      if (entry && appEntry && !refresh) {
        const saved = await cache.match(key.href);
        if (saved) return saved;
      }
      // Explicit reloads can fetch newer HTML even before a new worker activates.
      try {
        const response = await fetch(event.request, { cache: 'no-store' });
        if (response.ok) {
          if (!url.search || entry) await cache.put(key.href, response.clone());
          return response;
        }
        return await cache.match(key.href) || response;
      } catch (error) {
        const saved = await cache.match(key.href);
        if (saved) return saved;
        throw error;
      }
    })());
    return;
  }

  // Leave media alone: do not answer it, do not cache it. A <video> is fetched
  // with Range requests, which arrive as 206 responses, and the Cache API
  // rejects those outright in cache.put(); worse, caches.match() ignores the
  // Range header, so a whole-file entry would be handed back as the answer to a
  // request for one byte range. Returning without respondWith() leaves the
  // browser's own media stack to do it, which is the only thing here that
  // understands partial content. The guidebook's videos are online-only by
  // design -- see docToCache above.
  if (event.request.destination === 'video' || event.request.destination === 'audio' ||
      /\.(webm|mp4|m4a|ogg|mp3|wav)$/i.test(new URL(event.request.url).pathname)) return;

  // Never cache the manifest - always fetch fresh
  if (event.request.url.endsWith('manifest.json') || event.request.url.endsWith('manifest.webmanifest')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  event.respondWith(
    caches.open(CACHE_SCOPE + CACHE_NAME).then(cache => cache.match(event.request))
      .then((response) => {
        // Cache hit - return response from cache
        if (response) {
          return response;
        }
        // Clone the request
        let fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          let responseToCache = response.clone();

          // Cache only same-origin assets without a query string. App navigations
          // use the canonical entry above, including the in-app restart URL.
          if (event.request.url.startsWith(self.location.origin) && !new URL(event.request.url).search) {
            caches.open(CACHE_SCOPE + CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }

          return response;
        });
      })
  );
});
