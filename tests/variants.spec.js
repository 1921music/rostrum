const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

test.skip(!fs.existsSync(path.join(__dirname, '../build/variants/wink-page-turn/index.html')),
  'assemble both builds under build/variants/ to verify coexistence');

test('stable and wink deployments keep separate workers and offline caches', async ({ context }) => {
  const stable = await context.newPage();
  const wink = await context.newPage();
  const errors = [];
  for (const page of [stable, wink]) page.on('pageerror', error => errors.push(error.message));
  await stable.goto('/variants/index.html');
  await stable.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.endsWith('/variants/sw.js'));
  const root = await stable.evaluate(() => new URL('.', location.href).href);
  // A foreign app's cache must survive installation of the other variant.
  await stable.evaluate(async () => {
    const cache = await caches.open('another-app');
    await cache.put('/sentinel', new Response('keep'));
  });
  await wink.goto('/variants/wink-page-turn/index.html');
  await wink.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.endsWith('/wink-page-turn/sw.js'));
  const verify = async () => {
    await expect.poll(() => stable.evaluate(async () => (await caches.keys()).filter(name => name.startsWith('rostrum-scope:')))).toEqual(
      expect.arrayContaining([
        expect.stringMatching(new RegExp('^rostrum-scope:' + root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':rostrum-v1\\.0\\.0-')),
        expect.stringMatching(new RegExp('^rostrum-scope:' + (root + 'wink-page-turn/').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':rostrum-v1\\.0\\.0-')),
      ]));
    expect(await stable.evaluate(async () => (await caches.open('another-app')).match('/sentinel').then(r => r.text()))).toBe('keep');
  };
  await verify();
  await context.setOffline(true);
  try {
    await stable.reload();
    await wink.reload();
    await stable.waitForFunction(() => typeof window._FileSrc_ === 'function');
    await wink.waitForFunction(() => typeof window._WinkJudge_ === 'function');
    expect(await stable.evaluate(() => window._podiumVersion_)).toBe('1.0.0');
    expect(await wink.evaluate(() => window._podiumVersion_)).toBe('1.0.0');
    expect(await stable.evaluate(() => typeof window._WinkJudge_)).toBe('undefined');
    await verify();
    expect(errors).toEqual([]);
  } finally {
    await context.setOffline(false);
  }
});
