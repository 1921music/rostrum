const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

test('a legacy worker upgrades without stale HTTP precaching; the first reload is fresh and still works offline', async ({ page, context }) => {
  let revision = 'old', unavailable = false;
  let worker = `
    const name = 'rostrum-scope:' + self.registration.scope + ':legacy';
    self.addEventListener('install', e => e.waitUntil(caches.open(name).then(c => c.add('./')).then(() => self.skipWaiting())));
    self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
    self.addEventListener('fetch', e => {
      if (e.request.mode === 'navigate') e.respondWith(caches.open(name).then(c => c.match('./')).then(r => r || fetch(e.request)));
    });`;
  const requests = [], external = [];
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
      .replace(/let urlsToCache = \[[\s\S]*?\];/, "let urlsToCache = ['./', './index.html'];");
    await page.evaluate(async () => {
      const changed = new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
      await (await navigator.serviceWorker.getRegistration()).update();
      await changed;
    });
    const installed = await page.evaluate(async () => {
      const names = await caches.keys();
      const current = names.find(n => n.endsWith(':rostrum-v1.0.0-update-test'));
      return { names, html: await (await (await caches.open(current)).match('./')).text(),
        other: await (await (await caches.open('another-app')).match('/sentinel')).text() };
    });
    expect(installed.html).toContain('<title>new</title>');
    await expect.poll(() => page.evaluate(async () => (await caches.keys()).filter(n => n.endsWith(':legacy')))).toEqual([]);
    expect(installed.other).toBe('keep');

    // The worker is unchanged: reload must still bypass both caches.
    revision = 'newer';
    await page.reload();
    await expect(page).toHaveTitle('newer');
    revision = 'newest';
    await page.goto(origin + '/app/?restart=1');
    await expect(page).toHaveTitle('newest');
    await context.setOffline(true);
    await page.goto(origin + '/app/');
    await expect(page).toHaveTitle('newest');
    await context.setOffline(false);
    unavailable = true;
    await page.reload();
    await expect(page).toHaveTitle('newest');
    expect(requests).not.toContain('/app/podium.html');
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
