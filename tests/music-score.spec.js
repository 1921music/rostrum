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

function zip(files) {
  const chunks = [], directory = []; let offset = 0;
  for (const [name, value] of Object.entries(files)) {
    const bytes = Buffer.from(value), filename = Buffer.from(name);
    let crc = 0xffffffff;
    for (const byte of bytes) { crc ^= byte; for (let i = 0; i < 8; ++i) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
    crc = (crc ^ 0xffffffff) >>> 0;
    const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50);
    header.writeUInt16LE(20, 4); header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(bytes.length, 18); header.writeUInt32LE(bytes.length, 22); header.writeUInt16LE(filename.length, 26);
    chunks.push(header, filename, bytes);
    const entry = Buffer.alloc(46); entry.writeUInt32LE(0x02014b50); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6);
    entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(bytes.length, 20); entry.writeUInt32LE(bytes.length, 24);
    entry.writeUInt16LE(filename.length, 28); entry.writeUInt32LE(offset, 42); directory.push(entry, filename);
    offset += header.length + filename.length + bytes.length;
  }
  const central = Buffer.concat(directory), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(central.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, central, end]);
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
  await page.screenshot({ path: 'build/mscz-support.png' });
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

test('MXL converts to MSCZ on save without reusing the source handle', async ({ page }) => {
  test.setTimeout(90000);
  const mxl = zip({ 'META-INF/container.xml': '<container><rootfiles><rootfile full-path="score.musicxml" media-type="application/vnd.recordare.musicxml+xml"/></rootfiles></container>', 'score.musicxml': xml });
  const saved = await page.evaluate(async bytes => {
    const score = await new _Score_().init('Local', null, 'original.mxl', new Uint8Array(bytes));
    let picked, savedBytes, originalWrites = 0;
    score.fileHandle = { createWritable: () => { ++originalWrites; throw new Error('Original file must not be overwritten'); } };
    window.showSaveFilePicker = async options => {
      picked = options;
      return { createWritable: async () => ({ write: async bytes => { savedBytes = bytes; }, close: async () => {} }),
        getFile: async () => ({ name: options.suggestedName, lastModified: Date.now() }) };
    };
    await _FileSrc_.saveActiveScore(_menu_.rings.score.cells.save);
    return { suggested: picked.suggestedName, name: score.name, originalWrites, signature: [...savedBytes.slice(0, 4)] };
  }, [...mxl]);
  expect(saved).toEqual({ suggested: 'original.mscz', name: 'original.mscz', originalWrites: 0, signature: [80, 75, 3, 4] });
});

test('image placement changes in MSCX survive restoration and SVG metadata stays editable', async ({ page }) => {
  test.setTimeout(90000);
  const saved = await page.evaluate(async xml => {
    const score = await new _Score_().init('Local', null, 'original.musicxml', new TextEncoder().encode(xml));
    const pg = await score.pgUse(1, false), a = score.music.info.anchors[0];
    const imageCanvas = document.createElement('canvas'); imageCanvas.width = 20; imageCanvas.height = 20;
    const ctx = imageCanvas.getContext('2d'); ctx.fillStyle = 'rgba(255,0,0,0.5)'; ctx.fillRect(3, 3, 14, 14);
    const image = await new Promise(resolve => fabric.Image.fromURL(imageCanvas.toDataURL(), resolve));
    image.set({ left: a.x + 3 * a.sp, top: a.y - 6 * a.sp }); pg.canvas.add(image);
    score.music.player.setVolume(0.4); score.music.player.setMixer(0, { volume: 64, pan: 20, mute: true });
    return { bytes: [...await score.toFile()], before: (await score.musicRecords())[0] };
  }, xml);
  const files = unzip(Buffer.from(saved.bytes));
  // Mimic MuseScore changing the image offset and scaling its width and height.
  files['score.mscx'] = Buffer.from(files['score.mscx'].toString().replace(/<Image>[\s\S]*?<\/Image>/, image =>
    image.replace(/<offset x="[^"]*" y="[^"]*"\s*\/>/, '<offset x="10" y="-8"/>')
      .replace(/<size w="([^"]*)" h="([^"]*)"\s*\/>/, (_, w, h) => `<size w="${Number(w) * 2}" h="${Number(h) * 3}"/>`)));
  const result = await page.evaluate(async bytes => {
    const score = await new _Score_().init('Local', null, 'changed.mscz', new Uint8Array(bytes));
    const first = (await score.musicRecords())[0];
    await score.transposeMusic(-3); await score.transposeMusic(0);
    const after = (await score.musicRecords())[0];
    const image = new DOMParser().parseFromString(score.music.originalImages[0].svg, 'image/svg+xml');
    return { first, after, parserErrors: image.querySelectorAll('parsererror').length,
      volume: score.music.player.volume, mixer: score.music.player.mixer[0] };
  }, [...zip(files)]);
  expect(result.parserErrors).toBe(0);
  expect(result.first.object.type).toBe('image');
  expect(result.first.dx).toBeCloseTo(10, 2);
  expect(result.first.dy).toBeCloseTo(-8, 2);
  expect(result.first.bounds.width).toBeCloseTo(saved.before.bounds.width * 2, 2);
  expect(result.first.bounds.height).toBeCloseTo(saved.before.bounds.height * 3, 2);
  expect(result.after.dx).toBeCloseTo(result.first.dx, 3);
  expect(result.after.bounds.width).toBeCloseTo(result.first.bounds.width, 2);
  expect(result.volume).toBe(0.4);
  expect(result.mixer).toMatchObject({ volume: 64, pan: 20, mute: true });
});

test('packaged scores render and export a PDF while offline', async ({ page, context }) => {
  test.setTimeout(90000);
  await context.setOffline(true);
  try {
    const result = await page.evaluate(async xml => {
      const score = await new _Score_().init('Local', null, 'offline.musicxml', new TextEncoder().encode(xml));
      const pg = await score.pgUse(1, false);
      const pixels = pg.mozCanvas.getContext('2d').getImageData(0, 0, pg.mozCanvas.width, pg.mozCanvas.height).data;
      let ink = 0;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] > 0 && pixels[i] < 128) ++ink;
      const pdf = await score.toPdf('pdf');
      return { ink, header: new TextDecoder().decode(pdf.slice(0, 5)) };
    }, xml);
    expect(result.ink).toBeGreaterThan(100);
    expect(result.header).toBe('%PDF-');
  } finally { await context.setOffline(false); }
});
