const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");

// Rasterising a pdf page costs the cpu hundreds of milliseconds, and a jump
// mounts a window of about ten pages at once. Measured on an 82 page score whose
// pages cost ~0.5s each, a jump landed in 7s because the page being read
// rasterised alongside nine pages nobody was looking at yet; with those nine held
// back it landed in 0.2s. So the page being read goes first and alone.
const pageFile = path.join(__dirname, "..", "build", "rostrum.html");
test.skip(!fs.existsSync(pageFile), "build/rostrum.html is missing; run build.py --rostrum");

test.use({ viewport: { width: 1280, height: 720 } });
test.setTimeout(120_000);

const PAGES = 40;

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['http:', 'https:'].includes(url.protocol) && url.hostname !== '127.0.0.1')
      throw new Error(`Unexpected external request: ${url.origin}`);
    return route.continue();
  });
  await page.goto("/rostrum.html");
  await page.waitForFunction(() => !!window._menu_?.rings?.layout?.cells?.vertical);
});

test('a visible page overtakes background work already queued', async ({ page }) => {
  await openPdf(page);
  await page.evaluate(async () => {
    await Promise.allSettled([..._score_.pendingInflates]);
    window.__releaseBackground = await _score_.renderGate({ showing: false });
    await _score_.pgUse(30);
  });
  await expect.poll(() => page.evaluate(() => _score_.bgWaiting.some(w => w.pg.mozPn === 30))).toBe(true);
  await page.evaluate(() => {
    _score_.pgs[29].showing = true;
    _score_.pgUse(30);
  });
  await expect.poll(() => page.evaluate(() => _score_.pgs[29].inflated)).toBe(true);
  expect(await page.evaluate(() => _score_.bgRenders)).toBe(1);
  await page.evaluate(() => __releaseBackground());
});

test('leaving a queued page cancels it instead of rendering it later', async ({ page }) => {
  await openPdf(page);
  await page.evaluate(async () => {
    await Promise.allSettled([..._score_.pendingInflates]);
    window.__releaseBackground = await _score_.renderGate({ showing: false });
    await _score_.pgUse(30);
  });
  await expect.poll(() => page.evaluate(() => _score_.bgWaiting.some(w => w.pg.mozPn === 30))).toBe(true);
  const state = await page.evaluate(async () => {
    _score_.pgUnuse(_score_.pgs[29]);
    __releaseBackground();
    await Promise.allSettled([..._score_.pendingInflates]);
    return { inflated: _score_.pgs[29].inflated, queued: _score_.bgWaiting.length,
      drawn: __drawn.includes(30), renders: _score_.showRenders + _score_.bgRenders };
  });
  expect(state).toEqual({ inflated: false, queued: 0, drawn: true, renders: 0 });
  // __drawn observes the cancelled attempt as well; no PDF canvas was completed.
  expect(await page.evaluate(() => _score_.pgs[29].mozCanvas)).toBeNull();
});

test('background pages wait for page movement to finish', async ({ page }) => {
  await openPdf(page);
  await page.evaluate(async () => {
    await Promise.allSettled([..._score_.pendingInflates]);
    _Layout_.activeLayout.inOp = true;
    await _score_.pgUse(30);
  });
  await expect.poll(() => page.evaluate(() => _score_.bgWaiting.some(w => w.pg.mozPn === 30))).toBe(true);
  expect(await page.evaluate(() => _score_.pgs[29].mozCanvas)).toBeNull();
  await page.evaluate(() => { _Layout_.activeLayout.inOp = false; });
  await expect.poll(() => page.evaluate(() => _score_.pgs[29].inflated)).toBe(true);
});

// Only a pdf-backed page rasterises, so these tests need a real pdf rather than
// the new score the other suites use.
async function openPdf(page) {
  await page.evaluate(async (PAGES) => {
    const { PDFDocument, StandardFonts } = PDFLib;
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    for (let i = 0; i < PAGES; i++) {
      const pg = doc.addPage([595, 842]);
      for (let s = 0; s < 10; s++) {
        for (let l = 0; l < 5; l++) {
          const y = 780 - s * 76 - l * 6;
          pg.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.8 });
        }
        for (let n = 0; n < 20; n++)
          pg.drawText("f", { x: 50 + n * 25, y: 760 - s * 76, size: 9, font });
      }
      pg.drawText(`page ${i + 1}`, { x: 40, y: 20, size: 10, font });
    }
    const bytes = await doc.save();

    // Watch every rasterisation, from before the first one.
    window.__drawn = [];
    const Score = window._Score_;
    const score = await new Score().init(Score.sources.local, null, "probe.pdf", bytes);
    const Pg = Object.getPrototypeOf(score.pgs[0]).constructor;
    const render = Pg.prototype.renderPdf;
    Pg.prototype.renderPdf = async function (...a) {
      try {
        return await render.apply(this, a);
      } finally {
        window.__drawn.push(this.mozPn);
      }
    };
    await score.activate();
    const cell = _menu_.rings.layout.cells.vertical;
    Object.assign(cell.stash, { pnShow: "On", pz: null });
    await _Layout_.open(cell);
    await new Promise((done) => setTimeout(done, _gs_ * 4));
  }, PAGES);
}

// Jump to @pn and resolve once its pdf is on a real canvas, with the pages drawn
// between the two moments, oldest first.
function jump(page, pn) {
  return page.evaluate(
    (pn) =>
      new Promise((done) => {
        window.__drawn.length = 0;
        _Layout_.activeLayout.pgGoTo(pn);
        const tick = () => {
          const pg = _score_.pgs[pn - 1];
          if (pg.inflated && pg.mozCanvas && !pg.deferred)
            return done({ drawn: [...window.__drawn], waiting: _score_.bgWaiting.length });
          requestAnimationFrame(tick);
        };
        tick();
      }),
    pn,
  );
}

test("a jump draws the page being read before the pages around it", async ({ page }) => {
  await openPdf(page);
  const landed = await jump(page, 30);
  // The page asked for is the first page drawn, and nothing else is drawn before
  // it: the rest of its window is still parked, waiting for the cpu.
  expect(landed.drawn[0]).toBe(30);
  expect(landed.waiting).toBeGreaterThan(0);

  // And the neighbours do arrive, once the page being read has.
  await expect
    .poll(() => page.evaluate(() => window.__drawn.length), { timeout: 60_000 })
    .toBeGreaterThan(8);
  const all = await page.evaluate(() => window.__drawn);
  expect(all.indexOf(30)).toBe(0);
  expect(all).toContain(29);
  expect(all).toContain(31);
});

test("a page the reader has left does not sit in the queue forever", async ({ page }) => {
  await openPdf(page);
  // Jump away before the first window can drain: the pages it left parked are
  // deflated out from under their own renders, which must still let go of the
  // queue (see Pg.deflate, Score.renderUngate).
  await jump(page, 30);
  await jump(page, 5);
  await jump(page, 38);
  await expect
    .poll(() => page.evaluate(() => _score_.bgWaiting.length), { timeout: 60_000 })
    .toBe(0);
  const settled = await page.evaluate(async () => {
    await Promise.allSettled([..._score_.pendingInflates]);
    return {
      inflates: _score_.pendingInflates.size,
      showRenders: _score_.showRenders,
      bgRenders: _score_.bgRenders,
      shown: _score_.pgs.filter((pg) => pg.showing).map((pg) => pg.mozPn),
    };
  });
  // No render is still counted as running, and the only page claiming the cpu
  // without waiting is the one on screen.
  expect(settled).toEqual({ inflates: 0, showRenders: 0, bgRenders: 0, shown: [38] });
});
