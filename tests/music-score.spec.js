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
  // Opening the source tabs loads the GIS script; mock that UI dependency too.
  await page.route('https://accounts.google.com/gsi/client', route => route.fulfill({
    contentType: 'application/javascript', body: 'window.google = { accounts: { oauth2: {} } };',
  }));
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:9876/')
      && request.url() !== 'https://accounts.google.com/gsi/client') external.push(request.url());
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
  await page.locator('[data-tag="PlaybackPanel"] [data-close]').click();
  await expect.poll(() => page.evaluate(() => _score_.music.player.state)).toBe('stopped');
  await page.evaluate(async () => {
    const doc = await PDFLib.PDFDocument.create(); doc.addPage([300, 400]);
    await new _Score_().init('Local', null, 'test.pdf', await doc.save());
  });
  expect(await page.evaluate(() => ({ transpose: _menu_.rings.score.cells.transpose.enabled,
    save: _score_.saveName, pages: _score_.pgs.length }))).toEqual({ transpose: false, save: 'test.pdf', pages: 1 });
});

test('transpose panel and playback toolbar fit desktop and narrow screens', async ({ page }) => {
  await page.evaluate(async xml => { await new _Score_().init('Local',null,'panels.musicxml',new TextEncoder().encode(xml)); },xml);
  for (const width of [1600,795,375]) {
    await page.setViewportSize({width,height:900});
    await page.evaluate(()=>_menu_.closePanels());
    await expect(page.locator('[data-tag="TransposePanel"]')).toHaveCount(0);
    await page.evaluate(()=>_menu_.notify('score/playback/up'));
    const bar=page.locator('[data-tag="PlaybackPanel"]');
    await expect(bar).toBeVisible();
    await expect(page.locator('[data-tag="PlaybackMixer"]')).not.toBeVisible();
    const bounds=await bar.evaluate(elm=>{
      const b=elm.getBoundingClientRect();
      return { fits:b.left>=0&&b.right<=innerWidth&&b.top>=0,
        overflow:elm.scrollWidth-elm.clientWidth,
        controls:[...elm.querySelectorAll('button,input,output')].every(n=>{const r=n.getBoundingClientRect();return r.left>=b.left&&r.right<=b.right;}) };
    });
    expect(bounds).toEqual({fits:true,overflow:0,controls:true});
    await bar.locator('[data-mixer-button]').click();
    await expect(page.locator('[data-tag="PlaybackMixer"]')).toBeVisible();
    await page.screenshot({path:`build/playback-toolbar-${width}.png`});
    await page.locator('[data-mixer-close]').click();
    await bar.locator('[data-close]').click();
    await expect(bar).toHaveCount(0);
    await page.evaluate(()=>_menu_.notify('score/transpose/up'));
    const transpose=page.locator('[data-tag="TransposePanel"] .Panel__elm');
    await expect(transpose).toBeVisible();
    await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
    expect(await transpose.evaluate(elm=>{const r=elm.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})).toBe(true);
  }
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
      return { createWritable: async () => ({ write: async bytes => { savedBytes = bytes instanceof Blob ? new Uint8Array(await bytes.arrayBuffer()) : bytes; }, close: async () => {} }),
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
      const canvas = document.createElement('canvas'); canvas.width = pg.width * 2; canvas.height = pg.height * 2;
      const ctx = canvas.getContext('2d'); ctx.drawImage(await score.music.pageImage(1), 0, 0, canvas.width, canvas.height);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let ink = 0;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] > 0 && pixels[i] < 128) ++ink;
      const pdf = await score.toPdf('pdf');
      return { ink, header: new TextDecoder().decode(pdf.slice(0, 5)) };
    }, xml);
    expect(result.ink).toBeGreaterThan(100);
    expect(result.header).toBe('%PDF-');
  } finally { await context.setOffline(false); }
});

test('score pages share bundled fonts and rehearsal text fits its frame', async ({ page }) => {
  test.setTimeout(90000);
  const mscx = fs.readFileSync(path.join(__dirname, 'fixtures/font-score.mscx'));
  const bytes = zip({ 'score.mscx': mscx, 'META-INF/container.xml': '<container><rootfiles><rootfile full-path="score.mscx"/></rootfiles></container>' });
  await page.evaluate(async bytes => {
    await new _Score_().init('Local', null, 'fonts.mscz', new Uint8Array(bytes));
  }, [...bytes]);
  await expect.poll(() => page.evaluate(() => _score_.pgs[0].musicSvg?.getBoundingClientRect().width || 0)).toBeGreaterThan(100);
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity)
      .map(a => a.finished.catch(() => {})));
  });
  const result = await page.evaluate(async () => {
    const score = _score_;
    const pg = await score.pgUse(1, false), svg = pg.musicSvg;
    const fontsBefore = document.fonts.size;
    const clone = score.music.pageSvgElement(1);
    const fontCountStable = fontsBefore === document.fonts.size;
    const ids = new Set([...svg.querySelectorAll('[id]')].map(n => n.id));
    const uniqueIds = [...clone.querySelectorAll('[id]')].every(n => !ids.has(n.id));
    const measured = [...svg.querySelectorAll('text')].filter(n => ['Intro', 'Bridge 1'].includes(n.textContent)).map(n => {
      const style = getComputedStyle(n), ctx = document.createElement('canvas').getContext('2d');
      ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      return { text: n.textContent, svg: n.getComputedTextLength(), canvas: ctx.measureText(n.textContent).width,
        family: style.fontFamily };
    });
    const rectangles = [...svg.querySelectorAll('rect,polygon,polyline,path')].filter(n => {
      if (n.closest('defs,clipPath')) return false;
      if (n.tagName === 'rect') return true;
      const points = n.getAttribute('points');
      if (points) return [4, 5].includes(points.trim().split(/\s+/).length);
      const d = n.getAttribute('d') || '';
      return !/[CQAS]/i.test(d) && [3, 4].includes((d.match(/L/g) || []).length);
    }).map(n => n.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0);
    const frames = [...svg.querySelectorAll('text')].filter(n => ['Intro', 'Bridge 1'].includes(n.textContent)).map(text => {
      const t = text.getBoundingClientRect();
      const distance = r => Math.hypot(r.x + r.width / 2 - t.x - t.width / 2, r.y + r.height / 2 - t.y - t.height / 2);
      const f = rectangles.sort((a, b) => distance(a) - distance(b))[0];
      return { text: text.textContent, fits: !!f && t.left >= f.left - 1 && t.right <= f.right + 1,
        textBox: { left: t.left, right: t.right, width: t.width }, frameBox: f && { left: f.left, right: f.right, width: f.width } };
    });
    const css = score.music.native.mscz.textFonts.svgFontCss(svg.outerHTML);
    await pg.getThumbElm(true);
    return { measured, frames, fontCountStable, uniqueIds, mounted: svg.isConnected,
      fontDataInPage: svg.outerHTML.includes('data:font/'), exportFonts: css.includes('@font-face'), thumbnail: !!pg.pdfUrl,
      families: [...svg.querySelectorAll('[font-family]')].map(n => n.getAttribute('font-family')) };
  });
  fs.writeFileSync(path.join(__dirname, '../build/font-debug.svg'), await page.evaluate(() => _score_.pgs[0].musicSvg.outerHTML));
  await page.screenshot({ path: 'build/font-debug.png', animations: 'disabled' });
  expect(result.mounted).toBe(true);
  expect(result.fontCountStable).toBe(true);
  expect(result.fontDataInPage).toBe(false);
  expect(result.uniqueIds).toBe(true);
  expect(result.exportFonts).toBe(true);
  expect(result.thumbnail).toBe(true);
  expect(result.measured.map(m => m.text)).toEqual(['Intro', 'Bridge 1']);
  // SVG and Canvas quantize glyph positions slightly differently at the
  // engine's 1200-DPI coordinates; keep the error below 1% (subpixel on screen).
  for (const m of result.measured) {
    expect(m.family).toContain('mscz-text-');
    expect(Math.abs(m.svg - m.canvas)).toBeLessThan(Math.max(1, m.canvas * 0.01));
  }
  expect(result.frames).toHaveLength(2);
  expect(result.frames.every(f => f.fits), JSON.stringify(result.frames)).toBe(true);
  expect(result.families.some(f => f.includes('Leland Text'))).toBe(true);
});

test('Open uses the selected PDF filename after a notation score', async ({ page }) => {
  test.setTimeout(90000);
  await page.evaluate(async xml => {
    await new _Score_().init('Local', null, 'previous.musicxml', new TextEncoder().encode(xml));
    const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300, 400]);
    const file = new File([await pdf.save()], 'selected.pdf', { type: 'application/pdf' });
    window.showOpenFilePicker = async () => [{ name: file.name, getFile: async () => file }];
    window.__openPromise = _FileSrc_.openActiveScore(_menu_.rings.score.cells.open);
  }, xml);
  await page.getByText('Revert', { exact: true }).click();
  await page.evaluate(() => window.__openPromise);
  expect(await page.evaluate(() => ({ name: _score_.name, music: !!_score_.music, pages: _score_.pgs.length })))
    .toEqual({ name: 'selected.pdf', music: false, pages: 1 });
});

test('Open panel accepts and renders a PDF selected from Local', async ({ page }) => {
  const bytes = await page.evaluate(async () => {
    const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300, 400]);
    return [...await pdf.save()];
  });
  await page.evaluate(() => _menu_.notify('score/open/up'));
  const panel = page.locator('[data-tag="OpenPanel"]');
  await panel.getByText('Local', { exact: true }).click();
  await page.evaluate(() => { _FileSrc_.get('Local').nativeUnavailable = true; });
  const chooser = page.waitForEvent('filechooser');
  await panel.locator('.Local').click();
  await (await chooser).setFiles({ name: 'local.pdf', mimeType: 'application/pdf', buffer: Buffer.from(bytes) });
  await expect.poll(() => page.evaluate(() => _score_?.name)).toBe('local.pdf');
  await expect.poll(() => page.evaluate(() => !!_score_?.pgs[0].mozCanvas)).toBe(true);
});


for (const layoutKey of ['book', 'horizontal', 'vertical']) test(`shared playback tracking colors noteheads and follows systems in ${layoutKey}`, async ({ page }) => {
  const xml = fs.readFileSync(path.join(__dirname, '../engine/test/playback.musicxml'), 'utf8')
    .replaceAll('<measure number="2">', '<measure number="2"><print new-system="yes"/>');
  await page.evaluate(async ({ xml, layoutKey }) => {
    _menu_.rings.layout.stash.active = layoutKey;
    await new _Score_().init('Local', null, 'tracking.musicxml', new TextEncoder().encode(xml));
  }, { xml, layoutKey });
  await page.waitForFunction(() => _Layout_.activeLayout?.elm?.owner);
  await page.evaluate(() => {
    const layout = _Layout_.activeLayout;
    layout.elm.style.transition = 'none';
    layout.elm.style.fontSize = parseFloat(getComputedStyle(layout.elm).fontSize) * 3 + 'px';
  });
  const sample = time => page.evaluate(async time => {
    const music = _score_.music, player = music.player;
    player.context = { currentTime: time }; player.startTime = 0; player.state = 'playing'; player.notify();
    await new Promise(resolve => setTimeout(resolve, 500));
    const pg = _score_.pgs[0];
    const rect = pg.musicSvg.getBoundingClientRect(), bounds = player.tracking.system.bounds;
    const cursorLine = pg.musicSvg.querySelector('[data-playback-cursor]');
    return { cursorShown: getComputedStyle(cursorLine).display !== 'none', ...player.tracking, top: rect.top, systemTop: rect.top + bounds[1] * rect.height,
      systemBottom: rect.top + (bounds[1] + bounds[3]) * rect.height, viewport: innerHeight,
      active: [...pg.musicSvg.querySelectorAll('.mscz-playing')].map(g => g.dataset.noteId) };
  }, time);
  const first = await sample(0.1), next = await sample(2.1);
  expect(first.noteIds).toHaveLength(2);
  expect(first.cursorShown).toBe(true);
  expect(first.cursor.height).toBeGreaterThan(0);
  expect(new Set(first.active)).toEqual(new Set(first.noteIds));
  expect(next.system.id).not.toBe(first.system.id);
  if (Math.abs(next.top - first.top) > 1) expect(next.top).toBeLessThan(first.top - 20);
  else expect(next.systemBottom).toBeLessThanOrEqual(next.viewport - 23);
  expect(next.systemTop).toBeGreaterThanOrEqual(23);
  expect(new Set(next.active)).toEqual(new Set(next.noteIds));
  if (layoutKey === 'book') await page.screenshot({ path: 'build/playback-follow-book.png' });
  const repeated = await sample(6.1);
  expect(repeated.systemTop).toBeGreaterThanOrEqual(23);
  if (next.top < first.top - 20) expect(repeated.top).toBeGreaterThan(next.top + 20);
  expect(repeated.noteIds).toEqual(first.noteIds);
  await page.evaluate(() => _menu_.notify('score/playback/up'));
  await page.locator('[data-tag="PlaybackPanel"] [data-follow]').uncheck();
  const unfollowed = await sample(8.1);
  expect(unfollowed.top).toBe(repeated.top);
  const red = await page.locator('.mscz-playing text,.mscz-playing use,.mscz-playing path').first().evaluate(n => getComputedStyle(n).fill);
  expect(red).toBe('rgb(208, 0, 0)');
  const state = await page.evaluate(async () => {
    const music = _score_.music, pg = _score_.pgs[0];
    music.player.state = 'paused';
    await pg.renderPdfAux(pg.canvas);
    const active = pg.musicSvg.querySelectorAll('.mscz-playing').length;
    const cleanExport = music.pageSvgElement(1).querySelectorAll('.mscz-playing,[data-playback-style],[data-playback-cursor]').length;
    music.player.stop(); music.player.context = null;
    return { active, cleanExport, stopped: pg.musicSvg.querySelectorAll('.mscz-playing').length };
  });
  expect(state.active).toBe(unfollowed.noteIds.length);
  expect(state.cleanExport).toBe(0);
  expect(state.stopped).toBe(0);
});


for (const layoutKey of ['book', 'horizontal', 'vertical']) test(`playback follows page turns and repeat returns in ${layoutKey}`, async ({ page }) => {
  const xml = fs.readFileSync(path.join(__dirname, '../engine/test/playback.musicxml'), 'utf8')
    .replaceAll('<measure number="2">', '<measure number="2"><print new-page="yes"/>');
  await page.evaluate(async ({ xml, layoutKey }) => {
    _menu_.rings.layout.stash.active = layoutKey;
    if (layoutKey !== 'book') _menu_.rings.layout.cells[layoutKey].stash.pgShow = 2;
    await new _Score_().init('Local', null, 'pages.musicxml', new TextEncoder().encode(xml));
  }, { xml, layoutKey });
  const sample = async (time, expectedPage) => {
    await page.evaluate(time => {
      const p = _score_.music.player;
      p.context = { currentTime: time }; p.startTime = 0; p.state = 'playing'; p.notify();
    }, time);
    await expect.poll(() => page.evaluate(() => {
      const music = _score_.music, system = music.player.tracking.system;
      const pg = _score_.pgs.find(pg => pg.mozPn === system.page + 1);
      const rect = pg.musicSvg?.getBoundingClientRect();
      const line = pg.musicSvg?.querySelector('[data-playback-cursor]');
      return { cursorShown: !!line && getComputedStyle(line).display !== 'none', page: system.page, selected: Number(_score_.numbers.pn), highlighted: pg.musicSvg?.querySelectorAll('.mscz-playing').length > 0,
        visible: !!rect && rect.right > 0 && rect.left < innerWidth && rect.bottom > 0 && rect.top < innerHeight };
    })).toEqual({ cursorShown: true, page: expectedPage, selected: expectedPage + 1, highlighted: true, visible: true });
  };
  await sample(0.1, 0); await sample(2.1, 1); await sample(6.1, 0);
  await page.evaluate(() => {
    const m = _score_.music;
    m.autoScroll = false; m.player.context.currentTime = 8.1; m.player.notify();
  });
  expect(await page.evaluate(() => Number(_score_.numbers.pn))).toBe(1);
  await page.evaluate(() => {
    const m = _score_.music;
    m.autoScroll = true; m.player.state = 'paused'; m.view.resetFollow();
  });
  expect(await page.evaluate(() => Number(_score_.numbers.pn))).toBe(1);
  await page.evaluate(() => {
    const m = _score_.music;
    m.player.state = 'playing'; m.view.resetFollow();
  });
  await expect.poll(() => page.evaluate(() => Number(_score_.numbers.pn))).toBe(2);
  await page.evaluate(() => { const p = _score_.music.player; p.stop(); p.context = null });
});


for (const layoutKey of ['book', 'horizontal']) test(`real audio turns the visible page and returns on repeat in ${layoutKey}`, async ({ page }) => {
  const xml = fs.readFileSync(path.join(__dirname, '../engine/test/playback.musicxml'), 'utf8')
    .replaceAll('<measure number="2">', '<measure number="2"><print new-page="yes"/>')
    .replaceAll('</part>', '<measure number="3"><print new-page="yes"/><note><rest/><duration>4</duration><type>whole</type></note></measure><measure number="4"><print new-page="yes"/><note><rest/><duration>4</duration><type>whole</type></note></measure></part>');
  await page.evaluate(async ({ xml, layoutKey }) => {
    _menu_.rings.layout.stash.active = layoutKey;
    if (layoutKey === 'horizontal') _menu_.rings.layout.cells.horizontal.stash.pgShow = 2;
    await new _Score_().init('Local', null, 'audio-pages.musicxml', new TextEncoder().encode(xml));
    await _score_.music.player.play();
  }, { xml, layoutKey });
  const shown = () => page.evaluate(() => {
    const music = _score_.music, layout = _Layout_.activeLayout;
    const pg = _score_.pgs.find(pg => pg.mozPn === music.player.tracking.system?.page + 1);
    const inFront = [...(pg?.musicSvg?.querySelectorAll('.mscz-playing') || [])].some(group => {
      const r = group.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      return x >= 0 && x < innerWidth && y >= 0 && y < innerHeight && pg.elm.contains(document.elementFromPoint(x, y));
    });
    const positioned = layout.cell.key === 'book'
      ? layout.slots.slice(2, 4).some(slot => slot.contains(pg?.elm))
      : layout.snapIndex === Number(_score_.numbers.pn) - 1
        && (Number(_score_.numbers.pn) === 1 || _score_.pgs[0].elm.getBoundingClientRect().right <= layout.frame.getBoundingClientRect().left + 1);
    return { page: Number(_score_.numbers.pn), inFront, positioned };
  });
  await expect.poll(shown, { timeout: 15000 }).toEqual({ page: 2, inFront: true, positioned: true });
  await page.screenshot({ path: `build/playback-page-turn-${layoutKey}.png` });
  await expect.poll(shown, { timeout: 10000 }).toEqual({ page: 1, inFront: true, positioned: true });
  await page.evaluate(() => _score_.music.player.stop());
});
