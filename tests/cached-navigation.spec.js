const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

test.skip(!fs.existsSync(path.join(__dirname, '../build/podium.html')),
  'Build with mise exec -- python build.py --podium');
test.use({ viewport: { width: 1280, height: 720 } });
test.setTimeout(60_000);

async function open(page, key) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['http:', 'https:'].includes(url.protocol) && url.hostname !== '127.0.0.1')
      throw new Error(`Unexpected external request: ${url.origin}`);
    return route.continue();
  });
  await page.goto('/podium.html');
  await page.waitForFunction(() => !!window._menu_?.rings?.layout?.cells?.vertical);
  await page.evaluate(async key => {
    _menu_.rings.layout.stash.active = key;
    Object.assign(_menu_.rings.layout.cells[key].stash, { pgShow: 2, pgSnap: 1, pace: 500, pz: null });
    const pdf = await PDFLib.PDFDocument.create();
    for (let n = 0; n < 16; n++) {
      const pg = pdf.addPage([400, 600]);
      pg.drawText(`Score page ${n + 1}`, { x: 30, y: 500, size: 24 });
    }
    await new _Score_().init(_Score_.sources.local, null, 'cached.pdf', await pdf.save());
    await new Promise(done => setTimeout(done, _gs_ * 2));
    await Promise.allSettled([..._score_.pendingInflates]);
  }, key);
}

for (const key of ['horizontal', 'vertical']) {
  test(`${key}: cached pages respect the configured animation and preserve quality`, async ({ page }) => {
    await open(page, key);
    const result = await page.evaluate(async () => {
      const layout = _Layout_.activeLayout;
      const pg = _score_.pgs[1];
      const canvas = pg.mozCanvas;
      const size = [canvas.width, canvas.height];
      await layout.pgGoTo(2);
      const jumpAnimated = layout.inOp;
      while (layout.inOp) await new Promise(requestAnimationFrame);
      await layout.pgOpen('next');
      const nextAnimated = layout.inOp;
      while (layout.inOp) await new Promise(requestAnimationFrame);
      await layout.pgOpen('prev');
      const prevAnimated = layout.inOp;
      while (layout.inOp) await new Promise(requestAnimationFrame);
      return { jumpAnimated, nextAnimated, prevAnimated,
        sameCanvas: pg.mozCanvas === canvas, sameSize: canvas.width === size[0] && canvas.height === size[1],
        atTarget: Math.abs(parseFloat(layout.sash.style[layout.props.LEFT]) * _pxPerEm_ - layout.sashStart) < 0.1,
        page: _score_.numbers.pn };
    });
    expect(result).toEqual({ jumpAnimated: true, nextAnimated: true, prevAnimated: true,
      sameCanvas: true, sameSize: true, atTarget: true, page: 2 });
  });

  test(`${key}: Pace zero displays cached pages without a delayed animation`, async ({ page }) => {
    await open(page, key);
    const state = await page.evaluate(async () => {
      _score_.layout.pace = 0;
      const layout = _Layout_.activeLayout;
      const canvas = _score_.pgs[1].mozCanvas;
      await layout.pgGoTo(2);
      await layout.pgOpen('next');
      await layout.pgOpen('prev');
      return { moving: layout.inOp, sameCanvas: _score_.pgs[1].mozCanvas === canvas,
        page: _score_.numbers.pn, pace: _score_.layout.pace };
    });
    expect(state).toEqual({ moving: false, sameCanvas: true, page: 2, pace: 0 });
  });

  test(`${key}: partially ready spreads and drag settling still animate`, async ({ page }) => {
    await open(page, key);
    const state = await page.evaluate(async () => {
      const layout = _Layout_.activeLayout;
      // A half-page move shows the tail of one page and the next two pages.
      layout.cell.geo.pgSnap = 0;
      _score_.pgs[2].deflate();
      await layout.pgOpen('next');
      const incompleteAnimated = layout.inOp;
      await layout.pgGoTo(1, false);
      await Promise.allSettled([..._score_.pendingInflates]);
      // Direct snap settling is the path used after a drag, not a page tap.
      await layout.pgSnapTo(-_score_[layout.props.MAXWIDTH] / 500);
      return { incompleteAnimated, dragAnimated: layout.inOp };
    });
    expect(state).toEqual({ incompleteAnimated: true, dragAnimated: true });
  });

  test(`${key}: an instant jump supersedes an older animation`, async ({ page }) => {
    await open(page, key);
    await page.evaluate(async () => {
      const layout = _Layout_.activeLayout;
      await layout.pgSnapTo(-_score_[layout.props.MAXWIDTH] / 500);
      _score_.layout.pace = 0;
      await layout.pgGoTo(1);
    });
    await page.waitForTimeout(650);
    expect(await page.evaluate(() => {
      const layout = _Layout_.activeLayout;
      return { position: parseFloat(layout.sash.style[layout.props.LEFT]), moving: layout.inOp, page: _score_.numbers.pn };
    })).toEqual({ position: 0, moving: false, page: 1 });
  });
}
