const { test, expect } = require('@playwright/test');

for (const url of ['/pod.html', '/podium.html']) for (const surface of ['background', 'score']) test(`long press releases the menu before mouse hover (${url}, ${surface})`, async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' || ['data:', 'blob:'].includes(url.protocol)
      ? route.continue() : route.abort();
  });
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
