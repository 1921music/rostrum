const fs = require('node:fs');
const { test, expect } = require('@playwright/test');

// Opt-in local benchmark. The score never leaves this machine or enters Git.
// Build with: mise exec -- python build.py --podium
// Set ROSTRUM_BENCH_PDF, then run:
// mise exec -- npx playwright test tests/large-pdf.spec.js --repeat-each=3
// ROSTRUM_BENCH_URL optionally selects a separately built baseline HTML.
// Tracing is disabled because attaching a hundreds-of-MB input distorts timing.
const pdf = process.env.ROSTRUM_BENCH_PDF;
test.skip(!pdf, 'Set ROSTRUM_BENCH_PDF to a local PDF path');
test.use({ viewport: { width: 1280, height: 720 }, trace: 'off' });
test.setTimeout(600_000);

test('large PDF: open, turn, bookmark and distant jump', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const external = [];
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['http:', 'https:'].includes(url.protocol) && url.hostname !== '127.0.0.1') {
      external.push(url.origin);
      return route.abort();
    }
    return route.continue();
  });
  await page.goto(process.env.ROSTRUM_BENCH_URL || '/podium.html');
  await page.waitForFunction(() => !!window._Score_ && !!window._menu_);
  await page.evaluate(() => {
    window.__bench = { stages: {}, renders: [] };
    _menu_.rings.layout.stash.active = 'vertical';
    Object.assign(_menu_.rings.layout.cells.vertical.stash, { pnShow: 'On', pz: null });
    const stages = __bench.stages;
    const read = Blob.prototype.arrayBuffer;
    Blob.prototype.arrayBuffer = async function (...args) {
      const start = performance.now();
      const result = await read.apply(this, args);
      stages.read = (stages.read || 0) + performance.now() - start;
      return result;
    };
    // PDF.js is imported lazily. Copy its namespace to instrument the public API.
    let lib;
    Object.defineProperty(window, 'pdfjsLib', {
      configurable: true,
      get: () => lib,
      set(value) {
        lib = { ...value, getDocument(options) {
          const start = performance.now();
          const task = value.getDocument(options);
          task.promise.then(doc => {
            stages.pdfInit = performance.now() - start;
            const getPage = doc.getPage.bind(doc);
            doc.getPage = async (...args) => {
              const start = performance.now();
              const result = await getPage(...args);
              stages.getPage = (stages.getPage || 0) + performance.now() - start;
              return result;
            };
          });
          return task;
        }};
      },
    });
    const activate = _Score_.prototype.activate;
    _Score_.prototype.activate = async function (...args) {
      stages.beforeActivate = performance.now() - __bench.start;
      const proto = Object.getPrototypeOf(this.pgs[0]);
      for (const name of ['renderPdf', 'renderPdfAux']) {
        const original = proto[name];
        proto[name] = async function (...args) {
          const start = performance.now();
          try { return await original.apply(this, args); }
          finally { __bench.renders.push({ page: this.mozPn, name, ms: performance.now() - start }); }
        };
      }
      return activate.apply(this, args);
    };
    _FileSrc_.openActiveScore(_menu_.rings.score.cells.open);
  });
  await page.getByText('Local', { exact: true }).click();
  const input = page.locator('.Local input[type=file]');
  await input.waitFor({ state: 'attached', timeout: 10_000 });
  await page.evaluate(() => { __bench.start = performance.now(); });
  await input.setInputFiles(pdf);
  console.log('Local file selected');
  await page.waitForFunction(() => window._score_?.pgs?.some(pg => pg.showing && pg.inflated && !pg.deferred && pg.mozCanvas) && !_Layout_.activeLayout.inOp, null, { timeout: 90_000 });
  const result = await page.evaluate(() => ({
    initial: performance.now() - __bench.start,
    stages: { ...__bench.stages }, pages: _score_.pgs.length,
    quality: _score_.quality,
    bookmarks: _score_.pgs.flatMap((pg, i) => pg.bookmark ? [i + 1] : []),
  }));
  console.log('Initial:', JSON.stringify(result));
  async function jump(pn, kind) {
    const move = await page.evaluate(async ({ pn, kind }) => {
      const pg = _score_.pgs[pn - 1];
      const cached = !!(pg.inflated && pg.mozCanvas && !pg.deferred);
      __bench.renders.length = 0;
      const start = performance.now();
      await _Layout_.activeLayout.pgGoTo(pn);
      while (!(pg.inflated && pg.mozCanvas && !pg.deferred && !pg.renderTask && !pg.renderPromise && !_Layout_.activeLayout.inOp)) {
        if (performance.now() - start > 30_000) throw new Error(`Page ${pn} did not finish displaying`);
        await new Promise(requestAnimationFrame);
      }
      await new Promise(requestAnimationFrame);
      return { kind, page: pn, cached, ms: performance.now() - start,
        renders: __bench.renders.filter(r => r.page === pn) };
    }, { pn, kind });
    console.log('Move:', JSON.stringify(move));
    return move;
  }
  result.moves = [];
  for (const pn of [2, 3, 4, 3, 2, 1]) result.moves.push(await jump(pn, 'immediate turn'));
  await page.evaluate(async () => {
    await Promise.allSettled([..._score_.pendingInflates]);
  });
  for (const pn of [2, 3, 4, 3, 2, 1]) result.moves.push(await jump(pn, 'prefetched turn'));
  // If this original PDF has no Rostrum bookmarks, label a pre-existing test
  // bookmark explicitly, rather than claiming the document supplied one.
  const mark = result.bookmarks.find(pn => pn > 10) || Math.floor(result.pages * 0.7);
  result.bookmarkOrigin = result.bookmarks.length ? 'document' : 'benchmark fixture';
  await page.evaluate(pn => { _score_.pgs[pn - 1].bookmark ||= '#ff0000'; }, mark);
  result.moves.push(await jump(mark, 'bookmark'));
  result.moves.push(await jump(Math.floor(result.pages * 0.35), 'distant'));
  result.moves.push(await jump(mark, 'bookmark revisit'));
  result.moves.push(await jump(Math.floor(result.pages * 0.9), 'distant'));
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
  const output = JSON.stringify(result, null, 2);
  console.log(output);
  fs.writeFileSync(testInfo.outputPath('large-pdf.json'), output);
});
