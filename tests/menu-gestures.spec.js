const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  page.external = [];
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
    if (url.href === 'https://accounts.google.com/gsi/client') return route.fulfill({ contentType: 'application/javascript', body: 'window.google = { accounts: { oauth2: {} } };' });
    page.external.push(url.href); return route.abort();
  });
});
test.afterEach(async ({ page }) => expect(page.external).toEqual([]));

for (const url of ['/pod.html', '/rostrum.html']) for (const surface of ['background', 'score']) test(`long press releases the menu before mouse hover (${url}, ${surface})`, async ({ page }) => {
  await page.goto(url);
  await page.waitForFunction(() => !!window._menu_);
  if (surface === 'score') {
    await page.evaluate(async () => {
      _menu_.rings.score.cells.new.stash.pgCount = 2;
      await _menu_.notify('score/new/up');
    });
    await page.waitForFunction(() => !!window._score_?.pgs?.length);
  }
  await page.waitForTimeout(1600);
  await page.mouse.move(850, 550);
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  await page.waitForTimeout(800);
  const position = () => page.evaluate(() => ({ left: _menu_.elm.style.left, top: _menu_.elm.style.top }));
  const released = await position();
  expect(released).toEqual({ left: '850px', top: '550px' });
  await page.mouse.move(650, 350, { steps: 5 });
  expect(await position()).toEqual(released);
});

for (const url of ['/pod.html', '/rostrum.html']) for (const panel of ['library', 'about']) test(`panel content does not summon the ring menu (${url}, ${panel})`, async ({ page }) => {
  await page.goto(url);
  await page.waitForFunction(() => !!window._menu_);
  await page.evaluate(panel => _menu_.notify(panel === 'library' ? 'score/open/up' : 'app/about/up'), panel);
  if (panel === 'library') await page.getByText('Library', { exact: true }).click();
  const content = panel === 'library' ? page.getByText('No scores found', { exact: true }) : page.getByText('ROSTRUM: Sheet Music Studio', { exact: true }).first();
  await expect(content).toBeVisible();
  await page.waitForTimeout(1600);
  const position = () => page.evaluate(() => ({ left: _menu_.elm.style.left, top: _menu_.elm.style.top }));
  const before = await position();
  const box = await content.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1500);
  expect(await position()).toEqual(before);
  await page.mouse.up();
  if (panel === 'library') {
    await page.getByLabel('Library view').selectOption('entries');
    await expect(page.getByLabel('Library view')).toHaveValue('entries');
  }
});
