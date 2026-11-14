const { test, expect } = require('@playwright/test');

// No real cloud API is permitted, including unexpected SDK requests.
test.beforeEach(async ({ page }) => {
  page.external = [];
  page.errors = [];
  page.on('pageerror', error => page.errors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://127.0.0.1:9876' || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
    if (url.href === 'https://accounts.google.com/gsi/client') return route.fulfill({ contentType:'application/javascript', body:'window.google = { accounts: { oauth2: {} } };' });
    page.external.push(url.href); return route.abort();
  });
});
test.afterEach(async ({ page }) => {
  expect(page.external).toEqual([]);
  expect(page.errors).toEqual([]);
});

const library = page => page.locator('[data-tag="LibraryPanel"] .Panel__elm');
async function start(page, url) {
  await page.goto(url);
  await expect(library(page)).toBeVisible();
  await expect(page.getByText('No scores found', { exact:true })).toBeVisible();
}
async function blankScore(page) {
  await page.evaluate(async () => {
    _menu_.rings.score.cells.new.stash.pages = 2;
    await _menu_.notify('score/new/up');
  });
  await expect.poll(() => page.evaluate(() => _score_?.pgs.length)).toBe(2);
}
async function ringClick(page, path) {
  await page.evaluate(path => {
    const cell = _menu_.getCell(path);
    _menu_.activateRing(cell.displayRing);
    _menu_.center(true);
    window.menuReadyAt = performance.now() + _gs_;
    _menu_.elm.style.zIndex = ++_zTop_;
  }, path);
  await expect.poll(() => page.evaluate(() => _menu_.elm.getAnimations({ subtree:true }).length === 0 && performance.now() >= window.menuReadyAt)).toBe(true);
  const point = await page.evaluate(path => {
    const cell = _menu_.getCell(path), box = _menu_.menuHolder.getBoundingClientRect();
    const angle = parseFloat(cell.elm.style.transform.slice(7)) * 2 * Math.PI;
    const radius = box.width * .41;
    return { x:box.x + box.width / 2 + Math.sin(angle) * radius,
      y:box.y + box.height / 2 - Math.cos(angle) * radius };
  }, path);
  expect(await page.evaluate(point => document.elementFromPoint(point.x, point.y)?.dataset.key, point)).toBe(path);
  await page.mouse.click(point.x, point.y);
}

for (const url of ['/pod.html', '/rostrum.html']) {
  test(`starts in the dedicated library and keeps six circular sectors (${url})`, async ({ page }) => {
    await start(page, url);
    expect(await page.evaluate(() => Object.values(_menu_.rings).map(ring => ring.name)))
      .toEqual(['File', 'View', 'Annotate', 'Pages', 'Practice', 'Settings']);
    expect(await page.evaluate(() => _menu_.rings.score.displayCells.map(cell => cell.key)))
      .toEqual(['library', 'open', 'save', 'new', 'print', 'details', 'close']);
    expect(await page.evaluate(() => Object.values(_menu_.rings).every(ring => ring.displayCells.length <= 8))).toBe(true);
    await page.locator('summary[aria-label="Library settings"]').click();
    for (const name of ['Storage location', 'Cloud sync', 'Backup and restore', 'History and conflicts']) {
      await expect(library(page).getByText(name, { exact:true })).toBeVisible();
    }
    await expect(page.getByRole('button', { name:'Sync library now', exact:true })).toBeVisible();
    await expect(page.getByRole('button', { name:'Export library', exact:true })).not.toBeVisible();
    await page.reload();
    await expect(library(page)).toBeVisible();
  });

  test(`library sector opens directly during reading without replacing the score (${url})`, async ({ page }) => {
    await start(page, url); await blankScore(page);
    await expect(library(page)).not.toBeVisible();
    const name = await page.evaluate(() => _score_.name);
    await ringClick(page, 'score/library');
    await expect(library(page)).toBeVisible();
    expect(await page.evaluate(() => _score_.name)).toBe(name);
    await ringClick(page, 'score/open');
    await expect(page.locator('[data-tag="OpenPanel"] .Panel__elm')).toBeVisible();
    await expect(library(page)).not.toBeVisible();
    expect(await page.evaluate(() => Object.keys(_panels_.open.tabView.tabs))).not.toContain('Library');
  });

  test(`moved view tools and annotation clipboard remain usable (${url})`, async ({ page }) => {
    await start(page, url); await blankScore(page);
    await ringClick(page, 'page/numbers');
    await expect(page.locator('[data-tag="NumbersPanel"] .Panel__elm')).toBeVisible();
    await expect(page.getByText('Foot Pedal Keys', { exact:true })).toHaveCount(0);
    await ringClick(page, 'page/magnify');
    await expect(page.locator('[data-tag="MagnifyPanel"] .Panel__elm')).toBeVisible();
    expect(await page.evaluate(() => _menu_.magnifier.active)).toBe(true);
    await ringClick(page, 'ink/edit');
    await expect(page.locator('[data-tag="EditPanel"] .Panel__elm')).toBeVisible();
    await expect(page.locator('[data-action="ink/paste"]')).toBeDisabled();
    await page.locator('[data-action="ink/grid"]').click();
    await expect(page.locator('[data-tag="GridPanel"] .Panel__elm')).toBeVisible();
    await ringClick(page, 'page/transfer');
    await expect(page.locator('[data-action="page/import"]')).toBeVisible();
    await page.locator('[data-action="page/export"]').click();
    expect(await page.evaluate(() => _menu_.rings.page.activeCell.key)).toBe('export');
    expect(await page.evaluate(() => _menu_.activeRing.key)).toBe('page');
  });

  test(`display settings are separate from score info and retain score settings (${url})`, async ({ page }) => {
    await start(page, url); await blankScore(page);
    await page.evaluate(() => {
      _menu_.rings.score.cells.details.stash.pgFit = 'Expand';
      _menu_.rings.score.cells.details.stash.quality = 2.5;
      _menu_.rings.layout.cells.book.stash.pnBand = { axis:'T-B', place:'Over' };
      _menu_.showPanel(_menu_.rings.score.cells.details);
    });
    const info = page.locator('[data-tag="DetailsPanel"] .Panel__elm');
    await expect(info).toBeVisible();
    await expect(info.getByText('Page Fit', { exact:true })).toHaveCount(0);
    await ringClick(page, 'layout/display');
    const display = page.locator('[data-tag="DisplaySettingsPanel"] .Panel__elm');
    await expect(display).toBeVisible();
    await expect(display.getByText('Page Fit', { exact:true })).toBeVisible();
    await expect(display.getByText('Display Quality:', { exact:false })).toContainText('250%');
    await expect(page.locator('[data-action="app/wakeLock"]')).toBeVisible();
    const stash = await page.evaluate(() => _menu_.stashToJsonObj('score'));
    expect(stash.score.cells.details.pgFit).toBe('Expand');
    expect(stash.layout.cells.book.pnBand).toEqual({ axis:'T-B', place:'Over' });
    await page.locator('[data-action="app/position"]').click();
    await expect(page.locator('[data-tag="ScreenPanel"] .Panel__elm')).toBeVisible();
  });
}

test('library settings and record actions fit a narrow tablet/phone viewport', async ({ page }) => {
  await page.setViewportSize({ width:390, height:844 });
  await start(page, '/pod.html');
  await page.evaluate(async () => {
    const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300,400]);
    await _bookshelf_.import(new File([await pdf.save()], 'Small.pdf'));
    _menu_.showLibrary();
  });
  await page.getByLabel('Edit and organize', { exact:true }).click();
  await expect(page.getByText('Offline storage', { exact:true })).toBeVisible();
  await page.locator('summary[aria-label="Library settings"]').click();
  await page.getByText('Cloud sync', { exact:true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path:'test-results/menu-library-mobile.png' });
});

for (const url of ['/pod.html', '/rostrum.html']) test('settings expose theme choices and explicit maintenance actions (' + url + ')', async ({ page }) => {
  await start(page, url);
  await ringClick(page, 'app/theme');
  const theme = page.locator('[data-tag="ThemePanel"] .Panel__elm');
  await expect(theme).toBeVisible();
  await theme.locator('[data-button="Dark"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'Dark');
  await ringClick(page, 'app/storage');
  const storage = page.locator('[data-tag="StoragePanel"] .Panel__elm');
  await expect(storage).toBeVisible();
  for (const name of ['Reset menu settings', 'Clear recent files', 'Clear shared page buffer', 'Reload app']) {
    const action = storage.locator(`[data-button="${name}"]`);
    await expect(action).toBeVisible();
    await expect(action).toContainText(name);
  }
  await ringClick(page, 'layout/display');
  const display = page.locator('[data-tag="DisplaySettingsPanel"] .Panel__elm');
  await expect(display).toBeVisible();
  await expect(display).toContainText('Open a score to adjust its display.');
  expect(await page.evaluate(() => _menu_.rings.layout.cells.book.elm.classList.contains('Menu__cell-disabled'))).toBe(true);
});
