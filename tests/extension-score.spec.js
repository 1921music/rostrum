const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { test, expect, chromium } = require('@playwright/test');

const extensionDir = path.resolve(__dirname, '../build/extension');
const builtManifest = path.join(extensionDir, 'manifest.json');
const sourceDir = path.resolve(__dirname, '..');
const xml = fs.readFileSync(path.join(__dirname, 'fixtures/anchor-score.musicxml'), 'utf8');

test.skip(!fs.existsSync(builtManifest), 'Run mise exec -- npm run test:extension to build the unpacked extension');

test('extension packages local score modules with WASM-only CSP permission', async () => {
  const manifest = JSON.parse(fs.readFileSync(builtManifest, 'utf8'));
  const policy = manifest.content_security_policy.extension_pages;
  expect(policy).toBe("script-src 'self' 'wasm-unsafe-eval'; object-src 'self'");
  expect(policy).not.toMatch(/(?:^|\s)'unsafe-eval'/);
  expect(policy).not.toMatch(/blob:|data:|https?:/);
  const modules = ['mscz.js', 'mscz-engine.js', 'text-fonts.js', 'playback.js', 'playback-worker.js', 'mscz-synth.js'];
  for (const name of modules) {
    const packaged = fs.readFileSync(path.join(extensionDir, 'build/score-engine', name));
    expect(packaged.equals(fs.readFileSync(path.join(sourceDir, 'lib/score-engine', name)))).toBe(true);
    expect(packaged.toString()).not.toMatch(/\beval\s*\(|new Function\s*\(/);
  }
  const html = fs.readFileSync(path.join(extensionDir, 'build/podium.html'), 'utf8');
  expect(html.slice(0, 1024)).toMatch(/<meta charset="utf-8">/i);
  expect(html).not.toMatch(/<script[^>]*>\s*[^<\s]/);
});

test('real MV3 extension renders, transposes, plays and saves scores offline without CSP violations', async ({}, testInfo) => {
  test.setTimeout(120000);
  const manifest = JSON.parse(fs.readFileSync(builtManifest, 'utf8'));
  const extensionId = crypto.createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex').slice(0, 32)
    .replace(/[0-9a-f]/g, c => String.fromCharCode('a'.charCodeAt(0) + parseInt(c, 16)));
  const origin = `chrome-extension://${extensionId}`;
  const context = await chromium.launchPersistentContext(testInfo.outputPath('profile'), {
    channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`],
    viewport: { width: 1280, height: 800 },
  });
  const external = [], errors = [], workers = [];
  try {
    // No real cloud or audio services, including requests made by extension workers.
    await context.route('**/*', route => {
      const url = route.request().url();
      if (/^https?:/.test(url)) { external.push(url); return route.abort(); }
      return route.continue();
    });
    context.on('request', request => {
      if (/^https?:/.test(request.url())) external.push(request.url());
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('worker', worker => workers.push(worker.url()));
    await page.addInitScript(() => {
      window.__cspViolations = [];
      document.addEventListener('securitypolicyviolation', e => window.__cspViolations.push({
        directive: e.effectiveDirective, blocked: e.blockedURI,
      }));
    });
    await page.goto(`${origin}/build/podium.html`);
    await page.waitForFunction(() => !!window._Score_ && !!window._menu_);
    expect(await page.evaluate(() => chrome.runtime.id)).toBe(extensionId);
    expect(await page.evaluate(() => document.characterSet)).toBe('UTF-8');
    await context.setOffline(true);

    const before = await page.evaluate(async xml => {
      const score = await new _Score_().init('Local', null, 'extension.musicxml', new TextEncoder().encode(xml));
      const pg = await score.pgUse(1, false), anchor = score.music.info.anchors[1];
      pg.canvas.add(new fabric.Circle({ left: anchor.x + 3, top: anchor.y - 12,
        radius: 8, fill: 'transparent', stroke: 'red', strokeWidth: 1.5 }));
      pg.canvas.add(new fabric.Textbox('練習', { left: anchor.x + 25, top: anchor.y - 20, width: 60, fontSize: 12 }));
      const originalPitch = score.music.native.playbackTimeline().events
        .filter(e => (e[2] & 0xf0) === 0x90 && e[4] > 0).map(e => e[3]);
      _menu_.notify('score/transpose/up');
      return { originalPitch, records: await score.musicRecords() };
    }, xml);
    await page.locator('[data-tag="TransposePanel"] [data-step="1"]').click();
    await expect(page.locator('[data-tag="TransposePanel"] [data-reset]')).toHaveText('Original key');
    await expect.poll(() => page.evaluate(() => _score_.music.transpose)).toBe(1);
    await expect.poll(() => page.evaluate(() => _score_.musicBusy)).toBe(false);
    await page.evaluate(() => _menu_.notify('score/playback/up'));
    await expect(page.locator('[data-tag="PlaybackPanel"] [data-play]')).toHaveText('Play');
    await expect(page.locator('[data-tag="PlaybackPanel"] [data-stop]')).toHaveText('Stop');
    await page.locator('[data-tag="PlaybackPanel"] [data-play]').click();
    await expect.poll(() => page.evaluate(() => _score_.music.player.state)).toBe('playing');
    await expect.poll(() => page.evaluate(() => _score_.music.player.sources.size)).toBeGreaterThan(0);
    expect(await page.evaluate(() => _score_.music.player.error || '')).toBe('');
    expect(workers).toContain(`${origin}/build/score-engine/playback-worker.js`);
    expect(workers.every(url => url.startsWith(origin + '/'))).toBe(true);
    await page.locator('[data-tag="PlaybackPanel"] [data-play]').click();
    await expect.poll(() => page.evaluate(() => _score_.music.player.state)).toBe('paused');
    await page.locator('[data-tag="PlaybackPanel"] [data-stop]').click();
    await expect.poll(() => page.evaluate(() => _score_.music.player.state)).toBe('stopped');

    const restored = await page.evaluate(async () => {
      const score = _score_, bytes = await score.toFile();
      const native = score.music.native.mscz.open(bytes, 'original-key.mscz');
      const originalPitch = native.playbackTimeline().events
        .filter(e => (e[2] & 0xf0) === 0x90 && e[4] > 0).map(e => e[3]);
      native.close();
      const loaded = await new _Score_().init('Local', null, 'extension.mscz', bytes);
      await loaded.pgUse(1, false);
      return { signature: [...bytes.slice(0, 4)], transpose: loaded.music.transpose,
        records: await loaded.musicRecords(), originalPitch, images: loaded.music.originalImages.length };
    });
    expect(restored.signature).toEqual([80, 75, 3, 4]);
    expect(restored.transpose).toBe(1);
    expect(restored.originalPitch).toEqual(before.originalPitch);
    expect(restored.images).toBe(2);
    expect(restored.records.map(r => r.object.type)).toEqual(['circle', 'textbox']);
    for (let i = 0; i < before.records.length; ++i) {
      expect(restored.records[i].key).toBe(before.records[i].key);
      expect(restored.records[i].dx).toBeCloseTo(before.records[i].dx, 2);
      expect(restored.records[i].dy).toBeCloseTo(before.records[i].dy, 2);
    }
    // A layout can still be flying into place when its data promises resolve.
    // Check the mounted background, not just the in-memory score model.
    await page.evaluate(async () => {
      _menu_.closePanels();
      await Promise.all(document.getAnimations()
        .filter(a => a.effect?.getComputedTiming().iterations !== Infinity)
        .map(a => a.finished.catch(() => {})));
    });
    await expect.poll(() => page.evaluate(() => {
      const svg = _score_.pgs[0].musicSvg;
      return !!svg?.isConnected && getComputedStyle(svg).backgroundColor === 'rgb(255, 255, 255)';
    })).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('extension-score.png'), animations: 'disabled' });

    await page.evaluate(async () => {
      const document = await PDFLib.PDFDocument.create(); document.addPage([300, 400]);
      const file = new File([await document.save()], 'extension.pdf', { type: 'application/pdf' });
      window.showOpenFilePicker = async () => [{ name: file.name, getFile: async () => file }];
      window.__openPromise = _FileSrc_.openActiveScore(_menu_.rings.score.cells.open);
    });
    await page.getByText('Revert', { exact: true }).click();
    await page.evaluate(() => window.__openPromise);
    const pdf = await page.evaluate(async () => {
      await _score_.pgUse(1, false);
      return { name: _score_.saveName, pages: _score_.pgs.length, transpose: _menu_.rings.score.cells.transpose.enabled };
    });
    expect(pdf).toEqual({ name: 'extension.pdf', pages: 1, transpose: false });
    expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
    expect(external).toEqual([]);
  }
});
