const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

test('Pages launches from cache, installs new versions, and keeps manual and offline reloads', async ({ page, context }) => {
  let revision = 'old', unavailable = false;
  let worker = `
    const name = 'rostrum-scope:' + self.registration.scope + ':legacy';
    self.addEventListener('install', e => e.waitUntil(caches.open(name).then(c => c.add('./')).then(() => self.skipWaiting())));
    self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
    self.addEventListener('fetch', e => {
      if (e.request.mode === 'navigate') e.respondWith(caches.open(name).then(c => c.match('./')).then(r => r || fetch(e.request)));
    });`;
  const requests = [], external = [];
  const appRequests = () => requests.filter(path => path === '/app/' || path === '/app/index.html');
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    requests.push(url.pathname);
    if (url.pathname === '/app/sw.js') {
      response.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' });
      response.end(worker);
    } else if (url.pathname === '/app/' || url.pathname === '/app/index.html') {
      response.writeHead(unavailable ? 503 : 200, { 'Content-Type': 'text/html', 'Cache-Control': 'public,max-age=31536000' });
      response.end(`<!DOCTYPE html><title>${revision}</title>`);
    } else { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  // Routing disables Chromium's HTTP cache, which would hide the bug under test.
  // This local fixture contains no external resources or cloud API calls.
  context.on('request', request => {
    if (!request.url().startsWith(origin + '/')) external.push(request.url());
  });
  try {
    await page.goto(origin + '/app/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
      await navigator.serviceWorker.ready;
    });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.evaluate(async () => {
      await (await caches.open('another-app')).put('/sentinel', new Response('keep'));
    });
    revision = 'new';
    await page.reload();
    await expect(page).toHaveTitle('old');
    worker = fs.readFileSync(path.join(__dirname, '../src/sw.js'), 'utf8')
      .replace("let CACHE_NAME = 'rostrum-v1.0.0';", "let CACHE_NAME = 'rostrum-v1.0.0-update-test';")
      .replace(/let urlsToCache = \[[\s\S]*?\];/, "let urlsToCache = ['./', './index.html'];")
      .replace('const appEntry = null;', "const appEntry = './index.html';");
    await page.evaluate(async () => {
      const changed = new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
      await (await navigator.serviceWorker.getRegistration()).update();
      await changed;
    });
    const installed = await page.evaluate(async () => {
      const names = await caches.keys();
      const current = names.find(n => n.endsWith(':rostrum-v1.0.0-update-test'));
      return { html: await (await (await caches.open(current)).match('./index.html')).text(),
        other: await (await (await caches.open('another-app')).match('/sentinel')).text() };
    });
    expect(installed.html).toContain('<title>new</title>');
    await expect.poll(() => page.evaluate(async () => (await caches.keys()).filter(n => n.endsWith(':legacy')))).toEqual([]);
    expect(installed.other).toBe('keep');

    const requestsBeforeLaunch = appRequests().length;
    await page.goto(origin + '/app/index.html');
    await expect(page).toHaveTitle('new');
    await page.goto(origin + '/app/');
    await expect(page).toHaveTitle('new');
    expect(appRequests()).toHaveLength(requestsBeforeLaunch);

    revision = 'background update';
    worker = worker.replace('update-test', 'background-test');
    await page.evaluate(async () => {
      const changed = new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
      await (await navigator.serviceWorker.getRegistration()).update();
      await changed;
    });
    // Installation fetches the common entry once and leaves the open page alone.
    expect(appRequests().slice(requestsBeforeLaunch)).toEqual(['/app/index.html']);
    await expect(page).toHaveTitle('new');
    await page.goto(origin + '/app/index.html');
    await expect(page).toHaveTitle('background update');

    // Both reload paths bypass the caches even when sw.js is unchanged.
    revision = 'browser reload';
    await page.reload();
    await expect(page).toHaveTitle('browser reload');
    revision = 'app reload';
    await page.goto(origin + '/app/?t=123');
    await expect(page).toHaveTitle('app reload');

    // A failed update must leave the previous version available offline.
    unavailable = true;
    worker = worker.replace('background-test', 'failed-test');
    const requestsBeforeFailure = appRequests().length;
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update().then(() => {}));
    await expect.poll(() => appRequests().length).toBeGreaterThan(requestsBeforeFailure);
    await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).installing === null)).toBe(true);
    await context.setOffline(true);
    await page.goto(origin + '/app/');
    await expect(page).toHaveTitle('app reload');
    await page.goto(origin + '/app/index.html?t=456');
    await expect(page).toHaveTitle('app reload');
    await context.setOffline(false);
    await page.reload();
    await expect(page).toHaveTitle('app reload');
    expect(requests).not.toContain('/app/rostrum.html');
    expect(external).toEqual([]);
  } finally {
    await context.setOffline(false);
    await page.evaluate(async () => {
      for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
    }).catch(() => {});
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('split Pages keeps cached modules across updates and manually reloads the complete version', async ({ page, context }) => {
  const root = path.join(__dirname, '../src');
  const worker = fs.readFileSync(path.join(root, 'pages-sw.js'), 'utf8');
  const runtime = fs.readFileSync(path.join(root, 'pages-runtime.js'), 'utf8');
  let version = 1;
  let failFeature = false;
  const downloads = [], external = [];
  function manifest() {
    const entry = `./assets/modules/index.v${version}.html`;
    const core = [entry, './assets/modules/runtime.js'];
    return { entry, core, offline: [...core, './assets/modules/same.wasm', `./assets/modules/feature.v${version}.js`], aliases: {} };
  }
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const name = url.pathname.split('/').at(-1);
    if (name === 'sw.js') {
      response.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' });
      return response.end(`const deployment = ${JSON.stringify(manifest())};\n${worker}`);
    }
    downloads.push(name);
    if (failFeature && name === `feature.v${version}.js`) return response.writeHead(503).end();
    if (!name || /index\.v\d\.html$/.test(name)) {
      const title = name.match(/v(\d)/)?.[1] ?? version;
      return response.writeHead(200, { 'Content-Type': 'text/html' }).end(`<!doctype html><title>${title}</title><script>window._rostrumAssetURLs_={}</script><script src="assets/modules/runtime.js"></script>`);
    }
    response.writeHead(200, { 'Content-Type': 'application/javascript' });
    response.end(name === 'runtime.js' ? runtime : '');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  context.on('request', request => { if (!request.url().startsWith(origin + '/')) external.push(request.url()); });
  try {
    await page.goto(origin + '/app/');
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    expect(downloads).not.toContain('same.wasm');
    await page.evaluate(() => window._rostrumPages_.prepareOffline());
    expect(downloads).toContain('same.wasm');
    downloads.length = 0;
    version = 2;
    failFeature = true;
    await Promise.all([page.waitForEvent('framenavigated'), page.evaluate(() => { void window._rostrumPages_.reload(); })]);
    await expect.poll(() => downloads.includes('feature.v2.js')).toBe(true);
    await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration()).installing === null);
    await expect(page).toHaveTitle('1');
    failFeature = false;
    downloads.length = 0;
    await Promise.all([page.waitForEvent('framenavigated'), page.evaluate(() => { void window._rostrumPages_.reload(); })]);
    await expect(page).toHaveTitle('2');
    expect(downloads).toEqual(['feature.v2.js']);
    await context.setOffline(true);
    await Promise.all([page.waitForEvent('framenavigated'), page.evaluate(() => { void window._rostrumPages_.reload(); })]);
    await page.waitForLoadState('load');
    await expect(page).toHaveTitle('2');
    expect(external).toEqual([]);
  } finally {
    await context.setOffline(false);
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
