const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  page.external = []; page.errors = [];
  page.on('pageerror', error => page.errors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://127.0.0.1:9876' || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
    page.external.push(url.href); return route.abort();
  });
});
test.afterEach(async ({ page }) => {
  expect(page.external).toEqual([]); expect(page.errors).toEqual([]);
});
async function start(page, url) {
  await page.goto(url);
  await expect(page.locator('.LibraryWindow')).toBeVisible();
  await page.evaluate(async () => {
    _menu_.rings.score.cells.new.stash.pages = 1;
    await _menu_.notify('score/new/up');
  });
}

for (const url of ['/pod.html', '/rostrum.html']) {
  test(`annotation controls support keyboard and pointer activation and slider dragging (${url})`, async ({ page }) => {
    await start(page, url);
    await page.evaluate(() => {
      const panel = _menu_.showPanel(_menu_.rings.ink.cells.pencil);
      panel.elm.style.left = '320px'; panel.elm.style.top = '330px';
    });
    const panel = page.locator('[data-tag=PencilPanel] .Panel__elm');
    const horizontal = panel.getByRole('button', { name:'L-R', exact:true });
    await expect(horizontal).toBeVisible();
    await page.evaluate(() => {
      const buttons = _panels_.pencil.buttons, handler = buttons.handler;
      window.activations = 0;
      buttons.handler = (...args) => { window.activations++; handler(...args); };
    });
    await horizontal.focus(); await page.keyboard.press('Enter');
    await expect(horizontal).toHaveAttribute('aria-pressed','true');
    expect(await page.evaluate(() => activations)).toBe(1);
    await panel.getByRole('button', { name:'T-B', exact:true }).click();
    expect(await page.evaluate(() => activations)).toBe(2);
    expect(await page.evaluate(() => _menu_.rings.ink.cells.pencil.stash.style)).toBe('T-B');
    const before = await page.evaluate(() => _menu_.rings.ink.cells.pencil.stash.width);
    const slider = panel.locator('[data-tag=width_slider]');
    const box = await slider.boundingBox();
    await page.mouse.move(box.x + box.width * .3, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .7, box.y + box.height / 2, { steps:8 });
    await page.mouse.up();
    await expect.poll(() => page.evaluate(() => _menu_.rings.ink.cells.pencil.stash.width)).toBeGreaterThan(before);
    await panel.getByRole('button', { name:'Close Pencil', exact:true }).focus();
    await page.keyboard.press('Enter');
    await expect(panel).not.toBeVisible();
  });

  test(`unsaved-score confirmation supports cancellation and keyboard confirmation (${url})`, async ({ page }) => {
    await start(page, url);
    await page.evaluate(() => { _score_.setDirty(true); _menu_.notify('score/close/up'); });
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name:'Cancel', exact:true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    expect(await page.evaluate(() => !!_score_)).toBe(true);
    await page.evaluate(() => { _menu_.notify('score/close/up'); });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name:'Close', exact:true }).focus();
    await page.keyboard.press('Enter');
    await expect(dialog).not.toBeVisible();
    await expect.poll(() => page.evaluate(() => !!_score_)).toBe(false);
  });

  test(`circular menu fits after shrinking the viewport and panel stays readable (${url})`, async ({ page }) => {
    await page.setViewportSize({ width:1440, height:960 }); await start(page,url);
    await page.setViewportSize({ width:390, height:844 });
    await expect.poll(() => page.evaluate(() => _menu_.menuHolder.offsetWidth)).toBeLessThanOrEqual(352);
    await page.evaluate(() => { _menu_.center(true); _menu_.showPanel(_menu_.rings.ink.cells.pencil); });
    const panel = page.locator('[data-tag=PencilPanel] .Panel__elm');
    await expect(panel).toBeVisible();
    await expect.poll(async () => {
      const box = await panel.boundingBox();
      return box.x >= 0 && box.y >= 0 && box.x + box.width <= 391 && box.y + box.height <= 845;
    }).toBe(true);
    expect(await panel.evaluate(elm => parseFloat(getComputedStyle(elm).fontSize))).toBe(15);
  });
}
