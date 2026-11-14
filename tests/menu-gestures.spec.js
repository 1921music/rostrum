const { selectLibraryView } = require('./library-ui-helpers');
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
  // A clean startup now shows the library; dismiss it before testing the background.
  if (surface === 'background') await page.evaluate(() => _panels_.library?.close());
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
  await page.evaluate(panel => _menu_.notify(panel === 'library' ? 'score/library/up' : 'app/about/up'), panel);
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
    await selectLibraryView(page, 'entries');
    await expect(page.getByLabel('Library view')).toHaveValue('entries');
  }
});

for (const url of ['/pod.html', '/rostrum.html']) for (const interruption of ['capture lost', 'pointer cancelled', 'release missed', 'close before hover', 'hover without buttons', 'window blurred']) test(`interrupted panel drag stops on hover and closing resets it (${url}, ${interruption})`, async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(url); await page.waitForFunction(() => !!window._menu_);
  await page.evaluate(async () => {
    _menu_.rings.score.cells.new.stash.pages = 1; await _menu_.notify('score/new/up');
    _menu_.center(true); _menu_.activateRing(_menu_.rings.layout);
    window.menuReadyAt = performance.now() + _gs_;
  });
  await expect.poll(() => page.evaluate(() => performance.now() >= menuReadyAt && !_menu_.elm.getAnimations({subtree:true}).length)).toBe(true);
  const points = await page.evaluate(() => {
    const cell = _menu_.rings.layout.cells.horizontal;
    const box = _menu_.menuHolder.getBoundingClientRect(), angle = parseFloat(cell.elm.style.transform.slice(7))*2*Math.PI;
    const point = radius => ({x:box.x+box.width/2+Math.sin(angle)*radius,y:box.y+box.height/2-Math.cos(angle)*radius});
    return {start:point(box.width*.4),end:point(box.width*.65),hover:point(box.width*.38)};
  });
  await page.mouse.move(points.start.x,points.start.y); await page.mouse.down();
  await page.mouse.move(points.end.x,points.end.y,{steps:4});
  const panel = page.locator('[data-tag=HorizontalPanel] .Panel__elm');
  await expect(panel).toBeVisible();
  const position = () => page.evaluate(() => ({left:_panels_.horizontal.elm.style.left,top:_panels_.horizontal.elm.style.top}));
  let before = await position();
  expect(await page.evaluate(() => _menu_.op.out)).toBe(true);
  const hover = await page.evaluate(() => {
    const box = _menu_.menuHolder.getBoundingClientRect();
    for (let x=box.left+20;x<box.right;x+=25) for(let y=box.top+20;y<box.bottom;y+=25) {
      if(document.elementFromPoint(x,y)?.closest('.Menu')) return {x,y};
    }
    throw new Error('No exposed menu');
  });
  await page.evaluate(interruption => {
    const menu = _menu_, id = menu.op.e.pointerId;
    if (interruption === 'pointer cancelled') menu.elm.dispatchEvent(new PointerEvent('pointercancel',{pointerId:id,bubbles:true}));
    if (interruption === 'window blurred') window.dispatchEvent(new Event('blur'));
    if (interruption === 'close before hover') _panels_.horizontal.closer.click();
    if (interruption === 'hover without buttons') menu.elm.dispatchEvent(new PointerEvent('pointermove', {
      pointerId:id, pointerType:'mouse', buttons:0, clientX:400, clientY:200, bubbles:true
    }));
    if (interruption === 'release missed' || interruption === 'close before hover') {
      // The watchdog observes release, but a different handler swallows it
      // before it bubbles to the captured element's drag listener.
      document.addEventListener('pointerup', e => e.stopImmediatePropagation(), {capture:true,once:true});
      return;
    }
    // Simulate the browser/OS giving up capture before the release is delivered.
    if (menu.elm.hasPointerCapture(id)) menu.elm.releasePointerCapture(id);
  }, interruption);
  await page.mouse.move(15,15); await page.mouse.up();
  // Until release, that last move is still a legitimate captured drag.
  if (interruption === 'release missed') before = await position();
  if (interruption !== 'close before hover') {
    await page.mouse.move(hover.x,hover.y,{steps:4});
    expect(await position()).toEqual(before);
  }
  if (interruption !== 'close before hover') await page.evaluate(() => _panels_.horizontal.closer.click());
  await expect(panel).toHaveCount(0);
  await page.mouse.move(points.start.x,points.start.y,{steps:4});
  await page.mouse.move(hover.x,hover.y,{steps:4});
  await expect(panel).toHaveCount(0);
  expect(await page.evaluate(() => !!_menu_.op.active)).toBe(false);
  // Recovery must leave the next intentional drag usable.
  await page.mouse.move(points.start.x,points.start.y); await page.mouse.down();
  await page.mouse.move(points.end.x,points.end.y,{steps:4});
  await expect(panel).toBeVisible();
  await page.mouse.up();
  const released = await position();
  await page.mouse.move(hover.x,hover.y,{steps:4});
  expect(await position()).toEqual(released);
  expect(errors).toEqual([]);
});
