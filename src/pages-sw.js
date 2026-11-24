// The build supplies immutable asset URLs, plus stable aliases for the guide.
const scope = new URL(self.registration.scope);
const cacheName = `rostrum-pages:${scope.href}:assets-v1`;
const offlinePreference = new URL('.offline-preference', scope).href;
const modules = new URL('assets/modules/', scope).pathname;
const nestedApp = new URL('wink-page-turn/', scope).pathname;
const aliases = new Map(Object.entries(deployment.aliases).map(([path, url]) => [new URL(path, scope).pathname, url]));
const downloads = new Map();

async function asset(path) {
  const url = new URL(path, scope).href;
  const cache = await caches.open(cacheName);
  let pending = downloads.get(url);
  if (!pending) {
    pending = (async () => {
      if (await cache.match(url)) return;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Could not download ${new URL(url).pathname} (${response.status})`);
      await cache.put(url, response);
    })().finally(() => downloads.delete(url));
    downloads.set(url, pending);
  }
  await pending;
  return cache.match(url);
}

async function download(paths) {
  // Bound concurrent downloads, including on a slower mobile connection.
  const queue = paths[Symbol.iterator]();
  const results = await Promise.allSettled(Array.from({ length: 6 }, async () => {
    for (const path of queue) await asset(path);
  }));
  const failure = results.find(result => result.status === 'rejected');
  if (failure) throw failure.reason;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    await download(deployment.core);
    const cache = await caches.open(cacheName);
    if (await cache.match(offlinePreference)) await download(deployment.offline);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('message', event => {
  if (event.data !== 'prepare-offline' || !event.ports[0]) return;
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(cacheName);
      await cache.put(offlinePreference, new Response('enabled'));
      const keys = new Set((await cache.keys()).map(request => request.url));
      const missing = deployment.offline.some(path => !keys.has(new URL(path, scope).href));
      if (missing) event.ports[0].postMessage({ preparing: true });
      await download(deployment.offline);
      event.ports[0].postMessage({ ready: true, downloaded: missing });
    } catch (error) {
      event.ports[0].postMessage({ error: error.message });
    }
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.headers.has('range')) return;
  const url = new URL(event.request.url);
  if (url.origin !== scope.origin || url.pathname.startsWith(nestedApp)) return;
  if (event.request.method === 'HEAD' && !url.search && aliases.has(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(cacheName);
      const saved = await cache.match(new URL(aliases.get(url.pathname), scope));
      return saved ? new Response(null, { headers: saved.headers }) : fetch(event.request);
    })());
    return;
  }
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate' && (url.pathname === scope.pathname || url.pathname === `${scope.pathname}index.html`)) {
    event.respondWith(asset(deployment.entry));
  } else if (!url.search && url.pathname.startsWith(modules)) {
    event.respondWith(asset(url.href));
  } else if (!url.search && aliases.has(url.pathname)) {
    event.respondWith(asset(aliases.get(url.pathname)));
  }
});
