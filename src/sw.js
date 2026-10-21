// Rostrum Service Worker
// Enables offline functionality and PWA installation

let CACHE_NAME = 'rostrum-v1.0.0';
// Cache Storage is shared by every app on this origin; isolate each deployment.
const CACHE_SCOPE = 'rostrum-scope:' + self.registration.scope + ':';
// The face-landmark model and runtime that Wink page turning reads a wink
// with: 17 MB that is only ever fetched once the reader turns the feature on,
// and that never changes unless the pinned version does. It gets a cache of
// its own because CACHE_NAME carries the digest of the app, so every
// deployment of Podium renames it -- and the activate handler below drops
// every cache but the current one. Kept together with the app, the model would
// be thrown away and downloaded again on each release, which is the one thing
// a player on a phone at a rehearsal cannot afford. The static-host build
// stamps this name with the digest of the files themselves, so a new pinned
// version does replace them.
const ASSET_CACHE_NAME = 'rostrum-assets-v1';
// Where those files live, relative to the deployment.
const assetPath = /(^|\/)mediapipe\//;
// Relative to this script, so Podium works when served from a subdirectory.
// The packaged page is podium.html where Podium is deployed alongside the rest
// of the site, and index.html where the deployment is Podium alone, so try both
// and keep whichever exists: addAll would reject the whole install if either
// were missing.
let urlsToCache = [
  './',
  './podium.html',
  './index.html',
];
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
        console.log('Podium: Cache opened');
        return Promise.all([...urlsToCache, ...docToCache]
          .map((url) => cache.add(url).catch(() => {})));
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
          if (cacheName.startsWith(CACHE_SCOPE) && cacheName !== CACHE_SCOPE + CACHE_NAME && cacheName !== CACHE_SCOPE + ASSET_CACHE_NAME) {
            console.log('Podium: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Only handle GET requests — never intercept POST/PUT/etc. (e.g. OAuth token exchanges)
  if (event.request.method !== 'GET') return;
  // A nested experimental deployment has its own worker and cache.
  if (new URL(event.request.url).pathname.startsWith(
      new URL('wink-page-turn/', self.registration.scope).pathname)) return;

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
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.open(CACHE_SCOPE + (assetPath.test(new URL(event.request.url).pathname) ? ASSET_CACHE_NAME : CACHE_NAME)).then(cache => cache.match(event.request))
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

          // Only cache same-origin requests (not external PDFs), and never a
          // request carrying a query string (e.g. the "?t=" cache-buster the
          // in-app restart button appends): caching those would accumulate a
          // new, never-reused entry in Cache Storage on every restart. Skipping
          // them keeps the canonical (no-query) entry set only at install time,
          // so it stays pinned until a real service worker update ships.
          if (event.request.url.startsWith(self.location.origin) && !new URL(event.request.url).search) {
            const url = new URL(event.request.url);
            caches.open(CACHE_SCOPE + (assetPath.test(url.pathname) ? ASSET_CACHE_NAME : CACHE_NAME))
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }

          return response;
        });
      })
  );
});
