const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { test, expect } = require('@playwright/test');
const xml = fs.readFileSync(path.join(__dirname, 'fixtures/anchor-score.musicxml'), 'utf8');

// Read real ZIP central-directory entries, including entries using data descriptors.
function unzip(data) {
  const files = {};
  for (let p = 0; p + 46 <= data.length; ++p) {
    if (data.readUInt32LE(p) !== 0x02014b50) continue;
    const method = data.readUInt16LE(p + 10), size = data.readUInt32LE(p + 20);
    const nl = data.readUInt16LE(p + 28), el = data.readUInt16LE(p + 30), cl = data.readUInt16LE(p + 32);
    const name = data.subarray(p + 46, p + 46 + nl).toString();
    const local = data.readUInt32LE(p + 42);
    const offset = local + 30 + data.readUInt16LE(local + 26) + data.readUInt16LE(local + 28);
    const compressed = data.subarray(offset, offset + size);
    files[name] = method === 8 ? zlib.inflateRawSync(compressed) : compressed;
    p += 45 + nl + el + cl;
  }
  return files;
}

test.beforeEach(async ({ page }) => {
  const external = [];
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:9876/')) return route.continue();
    external.push(url); return route.abort();
  });
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:9876/')) external.push(request.url());
  });
  page.__external = external;
  await page.goto('/podium.html');
  await page.waitForFunction(() => !!window._Score_ && !!window._menu_);
});
test.afterEach(async ({ page }) => { expect(page.__external).toEqual([]); });

test('MusicXML uses the shared viewer and persists anchored SVGs in original-key MSCZ', async ({ page }) => {
  test.setTimeout(120000);
  const result = await page.evaluate(async xml => {
    const score = await new _Score_().init('Local', null, 'anchor.musicxml', new TextEncoder().encode(xml));
    const pg = await score.pgUse(1, false);
    const anchor = score.music.info.anchors[1];
    const circle = new fabric.Circle({ left: anchor.x + 3, top: anchor.y - 12,
      radius: 8, fill: 'transparent', stroke: '#ff0000', strokeWidth: 1.5 });
    pg.canvas.add(circle);
    pg.canvas.add(new fabric.Textbox('練習', { left: anchor.x + 25, top: anchor.y - 20, width: 60, fontSize: 12 }));
    const before = await score.musicRecords();
    const originalTimeline = score.music.native.playbackTimeline();
    await score.transposeMusic(2);
    const transposed = await score.musicRecords();
    const bytes = await score.toFile();
    const restored = await new _Score_().init('Local', null, 'anchor.mscz', bytes);
    const restoredRecords = await restored.musicRecords();
    const native = restored.music.native.mscz.open(bytes, 'verify.mscz');
    const originalPitch = native.playbackTimeline().events.filter(e => (e[2] & 0xf0) === 0x90 && e[4] > 0).map(e => e[3]);
    native.close();
    const expectedPitch = originalTimeline.events.filter(e => (e[2] & 0xf0) === 0x90 && e[4] > 0).map(e => e[3]);
    return { bytes: [...bytes], before, transposed, restoredRecords, originalPitch, expectedPitch,
      transpose: restored.music.transpose, name: restored.saveName,
      images: restored.music.originalImages.length,
      ring: _menu_.rings.score.cells.transpose.enabled,
      background: restored.pgs.some(pg => !!pg.mozCanvas) };
  }, xml);
  expect(result.name).toBe('anchor.mscz');
  expect(result.transpose).toBe(2);
  expect(result.images).toBe(2);
  expect(result.ring).toBe(true);
  expect(result.originalPitch).toEqual(result.expectedPitch);
  expect(result.restoredRecords).toHaveLength(2);
  for (let i = 0; i < 2; ++i) {
    expect(result.transposed[i].key).toBe(result.before[i].key);
    expect(result.transposed[i].dx).toBeCloseTo(result.before[i].dx, 3);
    expect(result.restoredRecords[i].dx).toBeCloseTo(result.transposed[i].dx, 2);
    expect(result.restoredRecords[i].object.type).toBe(result.before[i].object.type);
  }
  const files = unzip(Buffer.from(result.bytes));
  expect(Object.keys(files).filter(n => n.startsWith('Pictures/') && n.endsWith('.svg'))).toHaveLength(2);
  expect(files['score.mscx'].toString()).toContain('rostrum:settings');
  for (const [name, bytes] of Object.entries(files)) if (name.endsWith('.svg')) {
    expect(bytes.toString()).toContain('rostrum:annotation');
    expect(bytes.toString()).toContain('https://1921music.github.io/rostrum/ns');
  }
});

test('playback and transpose ring panels operate on a score; PDF keeps its usual behavior', async ({ page }) => {
  test.setTimeout(90000);
  await page.evaluate(async xml => {
    await new _Score_().init('Local', null, 'score.musicxml', new TextEncoder().encode(xml));
    _menu_.notify('score/transpose/up');
  }, xml);
  await page.locator('[data-tag="TransposePanel"] [data-step="1"]').click();
  await expect.poll(() => page.evaluate(() => _score_.music.transpose)).toBe(1);
  await page.evaluate(() => _menu_.notify('score/playback/up'));
  await page.locator('[data-tag="PlaybackPanel"] [data-play]').click();
  await expect.poll(() => page.evaluate(() => _score_.music.player.state)).toBe('playing');
  await page.locator('[data-tag="PlaybackPanel"] [data-stop]').click();
  await expect.poll(() => page.evaluate(() => _score_.music.player.state)).toBe('stopped');
  await page.evaluate(async () => {
    const doc = await PDFLib.PDFDocument.create(); doc.addPage([300, 400]);
    await new _Score_().init('Local', null, 'test.pdf', await doc.save());
  });
  expect(await page.evaluate(() => ({ transpose: _menu_.rings.score.cells.transpose.enabled,
    save: _score_.saveName, pages: _score_.pgs.length }))).toEqual({ transpose: false, save: 'test.pdf', pages: 1 });
});
