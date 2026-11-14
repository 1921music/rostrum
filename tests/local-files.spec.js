const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

test.beforeEach(async ({ page }) => {
  const external = [];
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:9876/')) return route.continue();
    if (url === 'https://accounts.google.com/gsi/client') return route.fulfill({
      contentType: 'application/javascript', body: 'window.google = { accounts: { oauth2: {} } };',
    });
    external.push(url); return route.abort();
  });
  page.__external = external;
});
test.afterEach(async ({ page }) => expect(page.__external).toEqual([]));

async function start(page) {
  await page.goto('/rostrum.html');
  await page.waitForFunction(() => !!window._FileSrc_ && !!window._localFs_ && !!window._menu_);
}

test('native Save overwrites the opened handle; Save As keeps the original and returns the new handle', async ({ page }) => {
  await start(page);
  const result = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    const first = await root.getFileHandle('original.pdf', { create: true });
    let writer = await first.createWritable(); await writer.write('before'); await writer.close();
    const src = _FileSrc_.get('Local');
    let pickers = 0;
    const second = await root.getFileHandle('other.pdf', { create: true });
    window.showSaveFilePicker = async () => { ++pickers; return second; };
    const saved = await src.putFile(null, 'original.pdf', Promise.resolve(new TextEncoder().encode('saved')), first);
    const beforeSecond = await (await first.getFile()).text();
    let resolveExport;
    const pending = new Promise(resolve => resolveExport = resolve);
    const saving = src.putFile(null, 'other.pdf', pending);
    // The save picker must open while export is still pending.
    await new Promise(resolve => setTimeout(resolve, 20));
    const pickedBeforeExport = pickers;
    resolveExport(new TextEncoder().encode('separate'));
    const other = await saving;
    return { beforeSecond, first: await (await first.getFile()).text(), second: await (await second.getFile()).text(),
      pickers, pickedBeforeExport, same: await saved.fileHandle.isSameEntry(first), different: !await other.fileHandle.isSameEntry(first),
      idsDiffer: saved.path !== other.path };
  });
  expect(result).toEqual({ beforeSecond: 'saved', first: 'saved', second: 'separate', pickers: 1,
    pickedBeforeExport: 1, same: true, different: true, idsDiffer: true });
});

test('same-named native files keep distinct identities and permissions are requested without a picker', async ({ page }) => {
  await start(page);
  const result = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory(), src = _FileSrc_.get('Local');
    const a = await root.getDirectoryHandle('a', { create: true }), b = await root.getDirectoryHandle('b', { create: true });
    const handles = await Promise.all([a.getFileHandle('same.pdf', { create: true }), b.getFileHandle('same.pdf', { create: true })]);
    for (let i = 0; i < 2; ++i) {
      const w = await handles[i].createWritable(); await w.write('file-' + i); await w.close();
    }
    const ids = await Promise.all(handles.map(async h => src.remember(await h.getFile(), h)));
    const idAgain = await src.remember(await handles[0].getFile(), handles[0]);
    let requests = 0;
    handles[0].queryPermission = async () => 'prompt';
    handles[0].requestPermission = async () => { ++requests; return 'granted'; };
    const first = await src.getFile(ids[0], 'same.pdf');
    handles[0].requestPermission = async () => 'denied';
    let denied;
    try { await src.getFile(ids[0], 'same.pdf'); } catch (e) { denied = e.cause; }
    const other = await src.getFile(ids[1], 'same.pdf');
    localStorage.setItem('recent', JSON.stringify([{ source: 'Local', path: null, name: 'same.pdf' }]));
    _Score_.visit({ source: 'Local', path: ids[0], name: 'same.pdf' }, {});
    _Score_.visit({ source: 'Local', path: ids[1], name: 'same.pdf' }, {});
    const entries = JSON.parse(localStorage.getItem('recent')).length;
    await b.removeEntry('same.pdf');
    let missing;
    try { await src.getFile(ids[1], 'same.pdf'); } catch (e) { missing = e.cause; }
    return { distinct: ids[0] !== ids[1], reused: idAgain === ids[0], requests, denied,
      first: new TextDecoder().decode(first.data), other: new TextDecoder().decode(other.data), entries, missing };
  });
  expect(result).toEqual({ distinct: true, reused: true, requests: 1, denied: 'fileSrc', first: 'file-0', other: 'file-1', entries: 2, missing: 'fileSrc' });
});

test('fallback and legacy-copy history are disabled, old copies are deleted, and fallback Save downloads', async ({ page }) => {
  await page.addInitScript(() => { delete window.showOpenFilePicker; delete window.showSaveFilePicker; });
  await start(page);
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      const open = indexedDB.open('rostrum-local-recent', 1);
      open.onupgradeneeded = () => open.result.createObjectStore('files', { keyPath: 'name' });
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result, tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').put({ name: 'old.pdf', file: new File(['stale-copy'], 'old.pdf') });
        tx.oncomplete = () => { db.close(); resolve(); };
      };
    });
    localStorage.setItem('recent', JSON.stringify([{ source: 'Local', path: null, name: 'old.pdf' }]));
    _menu_.notify('score/open/up');
  });
  const panel = page.locator('[data-tag="OpenPanel"]');
  await panel.getByText('Recent', { exact: true }).click();
  const entry = panel.locator('[data-name="old.pdf"]');
  await expect(entry).toHaveAttribute('aria-disabled', 'true');
  let pickers = 0; page.on('filechooser', () => ++pickers);
  await entry.click();
  await entry.press('o'); await entry.press('Enter');
  expect(pickers).toBe(0);
  expect(await page.evaluate(() => _score_?.name || null)).toBe(null);
  const stores = await page.evaluate(() => new Promise(resolve => {
    const open = indexedDB.open('rostrum-local-recent', 2);
    open.onsuccess = () => { const db = open.result; resolve([...db.objectStoreNames]); db.close(); };
  }));
  expect(stores).toEqual(['handles']);
  const download = page.waitForEvent('download');
  await page.evaluate(() => _FileSrc_.get('Local').putFile(null, 'download.pdf', new TextEncoder().encode('download')));
  const saved = await download;
  expect(saved.suggestedFilename()).toBe('download.pdf');
  expect(fs.readFileSync(await saved.path(), 'utf8')).toBe('download');
});

test('a blocked native API falls back to normal selection without keeping a copy', async ({ page }) => {
  await page.addInitScript(() => {
    window.__nativeAttempts = 0;
    window.showOpenFilePicker = async () => {
      ++window.__nativeAttempts;
      throw new DOMException('Opaque origin', 'SecurityError');
    };
  });
  await start(page);
  const bytes = await page.evaluate(async () => {
    const doc = await PDFLib.PDFDocument.create(); doc.addPage([300, 400]); return [...await doc.save()];
  });
  await page.evaluate(() => _menu_.notify('score/open/up'));
  const panel = page.locator('[data-tag="OpenPanel"]');
  await panel.getByText('Local', { exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await panel.locator('.Local').click();
  await (await chooser).setFiles({ name: 'blocked.pdf', mimeType: 'application/pdf', buffer: Buffer.from(bytes) });
  await expect.poll(() => page.evaluate(() => _score_?.name)).toBe('blocked.pdf');
  expect(await page.evaluate(() => ({ attempts: window.__nativeAttempts, supported: _FileSrc_.get('Local').supported,
    path: _score_.path, handle: !!_score_.fileHandle }))).toEqual({ attempts: 1, supported: false, path: null, handle: false });
});

test('canceling the native picker does not create a history entry or switch to fallback', async ({ page }) => {
  await start(page);
  const result = await page.evaluate(async () => {
    const src = _FileSrc_.get('Local');
    window.showOpenFilePicker = async () => { throw new DOMException('Canceled', 'AbortError'); };
    let error;
    try { await src.getFile(null, null); } catch (e) { error = e.name; }
    return { error, supported: src.supported, recent: localStorage.getItem('recent') };
  });
  expect(result).toEqual({ error: 'AbortError', supported: true, recent: null });
});
