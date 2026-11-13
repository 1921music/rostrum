const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { zipSync, unzipSync, strToU8, strFromU8 } = require('fflate');

async function blockExternal(context, external) {
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:9876/')) return route.continue();
    if (url.startsWith(pathToFileURL(path.resolve('build')).href + '/')) return route.continue();
    if (url === 'https://accounts.google.com/gsi/client') return route.fulfill({ contentType: 'application/javascript', body: 'window.google = { accounts: { oauth2: {} } };' });
    external.push(url); return route.abort();
  });
}
test.beforeEach(async ({ page }) => {
  page.external = [];
  await blockExternal(page.context(), page.external);
});
test.afterEach(async ({ page }) => expect(page.external).toEqual([]));

test('imports an owned copy with outline entries, persists across reload, and exports SQLite', async ({ page }) => {
  await page.goto('/pod.html');
  await page.waitForFunction(() => !!window._bookshelf_ && !!window.PDFLib && !!window._menu_);
  const result = await page.evaluate(async () => {
    const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300, 400]);
    const file = new File([await pdf.save()], '曲集.pdf', { type: 'application/pdf' });
    const document = await _bookshelf_.import(file);
    const read = await _bookshelf_.call('read', { id: document.id });
    const found = await _bookshelf_.call('search', { query: '曲集' });
    const backup = await _bookshelf_.call('export');
    return { id: document.id, size: read.file.size, expected: file.size, entries: found.length,
      header: new TextDecoder().decode(backup.slice(0, 15)) };
  });
  expect(result.size).toBe(result.expected);
  expect(result.entries).toBe(1);
  expect(result.header).toBe('SQLite format 3');
  await page.reload();
  await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  const documents = await page.evaluate(() => _bookshelf_.call('list'));
  expect(documents.map(d => d.id)).toEqual([result.id]);
});

test('Library imports through the UI and opens the owned PDF', async ({ page }) => {
  await page.goto('/pod.html');
  await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  await page.evaluate(() => _menu_.notify('score/open/up'));
  await page.getByText('Library', { exact: true }).click();
  const bytes = await page.evaluate(async () => {
    const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300, 400]); return [...await pdf.save()];
  });
  await page.getByLabel('Import scores').setInputFiles({ name: 'Owned.pdf', mimeType: 'application/pdf', buffer: Buffer.from(bytes) });
  await page.getByRole('dialog', { name:'Review score import' }).getByRole('button', { name:'Import into library', exact:true }).click();
  await page.getByRole('button', { name: 'Owned.pdf', exact: true }).click();
  await expect.poll(() => page.evaluate(() => _score_?.name)).toBe('Owned.pdf');
  expect(await page.evaluate(() => !!_score_.libraryDocumentId)).toBe(true);
});

test('single-song PDF without outlines and MSCZ imports appear in Songs', async ({ page }) => {
  await page.goto('/pod.html');
  await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  const pdf = await page.evaluate(async () => {
    const file = await PDFLib.PDFDocument.create(); file.addPage([300, 400]);
    file.setTitle('PDF internal title'); return [...await file.save()];
  });
  const mscz = zipSync({ 'score.mscx': fs.readFileSync(path.join(__dirname, 'fixtures/font-score.mscx')) });
  await page.evaluate(() => _menu_.notify('score/open/up'));
  await page.getByText('Library', { exact: true }).click();
  await page.getByLabel('Import scores').setInputFiles([
    { name: 'Single.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf) },
    { name: 'Single.mscz', mimeType: 'application/octet-stream', buffer: Buffer.from(mscz) },
  ]);
  await page.getByRole('dialog', { name:'Review score import' }).getByRole('button', { name:'Import into library', exact:true }).click();
  await expect(page.getByRole('dialog', { name:'Review score import' }).getByText('Single.mscz', { exact:true })).toBeVisible();
  await page.getByRole('dialog', { name:'Review score import' }).getByRole('button', { name:'Import into library', exact:true }).click();
  await expect(page.getByRole('button', { name: 'Single.mscz', exact: true })).toBeVisible();
  await page.getByLabel('Library view').selectOption('entries');
  await expect(page.getByRole('button', { name: 'PDF internal title', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Shared fonts', exact: true })).toBeVisible();
  expect(await page.evaluate(async () => (await _bookshelf_.call('search')).length)).toBe(2);
});

test('reimport skips identical bytes without new files, songs or changes, including deleted scores', async ({ page }) => {
  await page.goto('/pod.html'); await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  const result = await page.evaluate(async () => {
    const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300, 400]); const bytes = await pdf.save();
    const first = await _bookshelf_.import(new File([bytes], 'First.pdf'));
    const changesBefore = await _bookshelf_.call('changeIds');
    const [second, third] = await Promise.all([
      _bookshelf_.import(new File([bytes], 'First.pdf')),
      _bookshelf_.import(new File([bytes], 'Renamed.pdf')),
    ]);
    // A duplicate must skip parsing too, even if its extension was changed.
    const renamedType = await _bookshelf_.import(new File([bytes], 'Renamed.mscz'));
    const unchanged = JSON.stringify(changesBefore) === JSON.stringify(await _bookshelf_.call('changeIds'));
    const entries = await _bookshelf_.call('search');
    const directory = await (await navigator.storage.getDirectory()).getDirectoryHandle('scores');
    const names = []; for await (const name of directory.keys()) names.push(name);
    await _bookshelf_.call('update', { table: 'documents', values: { id: first.id, deleted_at: new Date().toISOString() } });
    const deleted = await _bookshelf_.import(new File([bytes], 'First.pdf'));
    return { same: first.id === second.id && first.id === third.id && first.id === deleted.id,
      skipped: second.alreadyImported && third.alreadyImported && deleted.alreadyImported && renamedType.alreadyImported,
      unchanged, songs: entries.length, files: names.length, visible: (await _bookshelf_.call('list')).length };
  });
  expect(result).toEqual({ same: true, skipped: true, unchanged: true, songs: 1, files: 1, visible: 0 });
});

for (const url of ['/pod.html', '/podium.html']) test(`remembered folder prompts for permission and retries without a picker (${url})`, async ({ page }) => {
  await page.goto(url); await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  const id = await page.evaluate(async () => {
    const directory = await (await navigator.storage.getDirectory()).getDirectoryHandle('Remembered scores', { create: true });
    await _bookshelf_.configure({ kind: 'directory', directory });
    const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300, 400]);
    return (await _bookshelf_.import(new File([await pdf.save()], 'Remembered.pdf'))).id;
  });
  await page.reload(); await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  await page.evaluate(() => {
    window.permissionState = 'prompt'; window.permissionRequests = [];
    FileSystemHandle.prototype.queryPermission = async options => {
      if (options.mode !== 'readwrite') throw new Error('Wrong permission mode');
      return permissionState;
    };
    FileSystemHandle.prototype.requestPermission = async options => {
      permissionRequests.push({ mode: options.mode, userGesture: navigator.userActivation.isActive });
      return permissionState;
    };
    window.showDirectoryPicker = () => { throw new Error('Must use the remembered handle'); };
    _menu_.notify('score/open/up');
  });
  await page.getByText('Library', { exact: true }).click();
  const allow = page.getByRole('button', { name: 'Allow library folder access', exact: true });
  await expect(allow).toBeVisible();
  await expect(page.getByText('Access is required for library folder: Remembered scores', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => permissionRequests.length)).toBe(0);
  await page.evaluate(() => { permissionState = 'denied'; });
  await allow.click();
  await expect(page.getByRole('status')).toContainText('was not allowed');
  await expect(allow).toBeEnabled();
  expect(await page.evaluate(() => _bookshelf_.storage.directory.name)).toBe('Remembered scores');
  await page.evaluate(() => { permissionState = 'granted'; });
  await allow.click();
  await expect(allow).toBeHidden();
  await expect(page.getByRole('button', { name: 'Remembered.pdf', exact: true })).toBeVisible();
  expect(await page.evaluate(() => permissionRequests)).toEqual([
    { mode: 'readwrite', userGesture: true }, { mode: 'readwrite', userGesture: true },
  ]);
  expect(await page.evaluate(async () => (await _bookshelf_.call('list'))[0].id)).toBe(id);
  // Revoke access after the Worker is already connected. A typed error from
  // its storage adapter must expose the same recovery UI without discarding it.
  const errorName = await page.evaluate(async () => {
    const worker = _bookshelf_.worker, original = worker.postMessage;
    worker.postMessage = message => queueMicrotask(() => worker.dispatchEvent(new MessageEvent('message', {
      data: { id: message.id, error: 'Folder access revoked', errorName: 'NotAllowedError' },
    })));
    try { await _bookshelf_.call('list'); }
    catch (error) { return error.name; }
    finally { worker.postMessage = original; }
  });
  expect(errorName).toBe('NotAllowedError');
  await expect(allow).toBeVisible();
  await allow.click();
  await expect(allow).toBeHidden();
  expect(await page.evaluate(async () => (await _bookshelf_.call('list'))[0].id)).toBe(id);
});

test('file adapter uses the supplied directory and rejects escaping paths', async ({ page }) => {
  await page.goto('/pod.html');
  const result = await page.evaluate(async () => {
    const { DirectoryLibraryFiles } = await import('/bookshelf-files.js');
    const root = await navigator.storage.getDirectory();
    const selected = await root.getDirectoryHandle('selected-library-test', { create: true });
    const files = new DirectoryLibraryFiles(selected);
    await files.write('scores/example.pdf', new TextEncoder().encode('owned copy'));
    const contents = await (await files.read('scores/example.pdf')).text();
    const rejected = [];
    for (const path of ['../escape', '/absolute', 'scores/../escape', 'scores\\escape']) {
      try { await files.write(path, new Uint8Array()); } catch { rejected.push(path); }
    }
    await files.remove('scores/example.pdf');
    let removed = false;
    try { await files.read('scores/example.pdf'); } catch (error) { removed = error.name === 'NotFoundError'; }
    await root.removeEntry('selected-library-test', { recursive: true });
    return { contents, rejected: rejected.length, removed };
  });
  expect(result).toEqual({ contents: 'owned copy', rejected: 4, removed: true });
});

test('common storage API accepts an injected backend without filesystem APIs', async ({ page }) => {
  await page.goto('/pod.html');
  const result = await page.evaluate(async () => {
    const { openLibraryStorage } = await import('/bookshelf-storage.js');
    const blobs = new Map();
    const storage = await openLibraryStorage(async () => ({
      files: {
        async write(path, bytes) { blobs.set(path, new Blob([bytes])); },
        async read(path) { return blobs.get(path); },
        async remove(path) { blobs.delete(path); },
      },
      database: { exec() { return []; }, async flush() {}, export() { return new Uint8Array(); }, close() {} },
    }));
    await storage.files.write('scores/id__name.pdf', 'test');
    const contents = await (await storage.files.read('scores/id__name.pdf')).text();
    await storage.files.remove('scores/id__name.pdf');
    let invalid = false;
    try { await openLibraryStorage(async () => ({})); } catch { invalid = true; }
    return { contents, empty: blobs.size === 0, invalid };
  });
  expect(result).toEqual({ contents: 'test', empty: true, invalid: true });
});

test('PDF ink and page settings autosave without changing the imported file', async ({ page }) => {
  await page.goto('/pod.html');
  await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  const result = await page.evaluate(async () => {
    const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300, 400]);
    const original = await pdf.save();
    const doc = await _bookshelf_.import(new File([original], 'Ink.pdf'));
    const score = await _bookshelf_.openDocument(doc.id);
    const pg = score.pgs[0]; await pg.inflate(false, false);
    pg.canvas.add(new fabric.Rect({ left: 10, top: 20, width: 30, height: 40, fill: 'red' }));
    pg.bookmark = '#ff0000'; score.setDirty(true);
    await _bookshelf_.flush(score);
    const state = await _bookshelf_.call('read', { id: doc.id });
    return { id: doc.id, dirty: score.dirty, annotations: state.annotations.length,
      originalUnchanged: [...new Uint8Array(await state.file.arrayBuffer())].join() === [...original].join(),
      annotationId: state.annotations[0].id };
  });
  expect(result).toMatchObject({ dirty: false, annotations: 1, originalUnchanged: true });
  await page.reload();
  await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  const restored = await page.evaluate(async ({ id, annotationId }) => {
    const score = await _bookshelf_.openDocument(id);
    const pg = score.pgs[0]; await pg.inflate(false, false);
    const objects = pg.canvas.getObjects().map(o => ({ type: o.type, fill: o.fill }));
    const bookmark = pg.bookmark;
    pg.canvas.remove(pg.canvas.getObjects()[0]); score.setDirty(true); await _bookshelf_.flush(score);
    // Undo-like restoration must revive the same annotation, not create a new one.
    const savedObject = new fabric.Rect({ left: 10, top: 20, width: 30, height: 40, fill: 'red' });
    const identities = score.libraryAnnotationIds;
    savedObject.rostrumId = Object.keys(identities).find(key => identities[key] === annotationId);
    pg.canvas.add(savedObject); score.setDirty(true); await _bookshelf_.flush(score);
    const state = await _bookshelf_.call('read', { id });
    return { objects, bookmark, count: state.annotations.length, sameId: state.annotations[0].id === annotationId };
  }, result);
  expect(restored).toEqual({ objects: [{ type: 'rect', fill: 'red' }], bookmark: '#ff0000', count: 1, sameId: true });
});

test('outline search jumps to its page; reindex preserves edits, tags and playlist identities', async ({ page }) => {
  await page.goto('/pod.html');
  await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  const result = await page.evaluate(async () => {
    const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300,400]); const second = pdf.addPage([300,400]);
    const outlines = pdf.context.obj({ Type: 'Outlines', Count: 1 }); const ref = pdf.context.register(outlines);
    const item = pdf.context.obj({ Title: PDFLib.PDFHexString.fromText('曲集の二曲目'), Parent: ref, Dest: [second.ref, 'Fit'] });
    const itemRef = pdf.context.register(item); outlines.set(PDFLib.PDFName.of('First'), itemRef); outlines.set(PDFLib.PDFName.of('Last'), itemRef);
    pdf.catalog.set(PDFLib.PDFName.of('Outlines'), ref);
    const doc = await _bookshelf_.import(new File([await pdf.save()], 'Collection.pdf'));
    const entry = (await _bookshelf_.call('search', { query: '二曲目' }))[0];
    await _bookshelf_.call('update', { table: 'entries', values: { id: entry.id,
      metadata_json: JSON.stringify({ ...JSON.parse(entry.metadata_json), title: 'Edited title', userEditedFields: ['title'] }) } });
    const tag = crypto.randomUUID(), playlist = crypto.randomUUID();
    await _bookshelf_.call('update', { table: 'tags', values: { id: tag, name: 'Practice' } });
    await _bookshelf_.call('link', { table: 'document_tags', values: { document_id: doc.id, tag_id: tag } });
    await _bookshelf_.call('update', { table: 'playlists', values: { id: playlist, metadata_json: '{"name":"Concert"}' } });
    const a = await _bookshelf_.call('link', { table: 'playlist_items', values: { playlist_id: playlist, entry_id: entry.id, order_key: '1' } });
    const b = await _bookshelf_.call('link', { table: 'playlist_items', values: { playlist_id: playlist, entry_id: entry.id, order_key: '2' } });
    await _bookshelf_.call('moveItem', { table: 'playlist_items', id: b.id, direction: -1 });
    await _bookshelf_.reindex(doc.id);
    const found = await _bookshelf_.call('search', { query: 'Edited', tagIds: [tag], matchAll: true });
    const score = await _bookshelf_.openDocument(doc.id, JSON.parse(entry.anchor_json));
    const items = await _bookshelf_.call('records', { table: 'playlist_items', parent: 'playlist_id', id: playlist });
    await _bookshelf_.call('update', { table: 'entries', values: { id: entry.id, deleted_at: new Date().toISOString() } });
    await _bookshelf_.reindex(doc.id);
    return { matched: found.map(e => e.id), expected: entry.id, page: Number(score.numbers.pn),
      count: items.length, independent: a.id !== b.id,
      moved: items.sort((a,b) => a.order_key.localeCompare(b.order_key))[0].id === b.id,
      afterDelete: (await _bookshelf_.call('search', {})).length };
  });
  expect(result).toMatchObject({ matched: [result.expected], page: 2, count: 2, independent: true, moved: true, afterDelete: 0 });
});

test('MusicXML title and anchored ink survive library reload and transposition', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/pod.html');
  await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  const result = await page.evaluate(async xml => {
    const doc = await _bookshelf_.import(new File([xml], 'music.musicxml'));
    const found = await _bookshelf_.call('search', { query: 'Rostrum anchor test' });
    const score = await _bookshelf_.openDocument(doc.id);
    const pg = await score.pgUse(1, false); const anchor = score.music.info.anchors[1];
    pg.canvas.add(new fabric.Circle({ left: anchor.x + 3, top: anchor.y - 12, radius: 8, fill: 'red' }));
    score.setDirty(true); await _bookshelf_.flush(score);
    await score.transposeMusic(2); await _bookshelf_.flush(score);
    const reopened = await _bookshelf_.openDocument(doc.id);
    const records = await reopened.musicRecords();
    return { matches: found.length, transpose: reopened.music.transpose, records: records.length, fill: records[0].object.fill };
  }, fs.readFileSync(path.join(__dirname, 'fixtures/anchor-score.musicxml'), 'utf8'));
  expect(result).toEqual({ matches: 1, transpose: 2, records: 1, fill: 'red' });
});

test('save failures retain dirty state and selection, and can be retried', async ({ page }) => {
  await page.goto('/pod.html');
  await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  const result = await page.evaluate(async () => {
    const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300,400]);
    const doc = await _bookshelf_.import(new File([await pdf.save()], 'Retry.pdf'));
    const score = await _bookshelf_.openDocument(doc.id); const pg = await score.pgUse(1, false);
    const a = new fabric.Rect({ left: 10, top: 20, width: 30, height: 40, fill: 'red' });
    const b = new fabric.Rect({ left: 60, top: 70, width: 20, height: 30, fill: 'blue' });
    const before = a.getBoundingRect(true, true);
    pg.canvas.add(a, b); pg.canvas.setActiveObject(new fabric.ActiveSelection([a,b], { canvas: pg.canvas }));
    const call = _bookshelf_.call.bind(_bookshelf_);
    _bookshelf_.call = (action, args) => action === 'saveState' ? Promise.reject(new Error('Disk full')) : call(action, args);
    score.setDirty(true);
    let error;
    try { await _bookshelf_.flush(score); } catch (e) { error = e.message; }
    const dirty = score.dirty;
    _bookshelf_.call = call; await _bookshelf_.flush(score);
    const selected = pg.canvas.getActiveObject()?.type;
    const reopened = await _bookshelf_.openDocument(doc.id); const restoredPg = await reopened.pgUse(1, false);
    const after = restoredPg.canvas.getObjects()[0].getBoundingRect(true, true);
    return { error, dirty, selected, saved: !score.dirty, before: [before.left,before.top], after: [after.left,after.top] };
  });
  expect(result).toMatchObject({ error: 'Disk full', dirty: true, selected: 'activeSelection', saved: true });
  expect(result.after[0]).toBeCloseTo(result.before[0], 1);
  expect(result.after[1]).toBeCloseTo(result.before[1], 1);
});

test('replacing a file preserves the old references and keeps replacement separate from derivation', async ({ page }) => {
  await page.goto('/pod.html');
  await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  const result = await page.evaluate(async () => {
    const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300,400]); const bytes = await pdf.save();
    const first = await _bookshelf_.import(new File([bytes], 'Old.pdf'));
    const entry = (await _bookshelf_.call('search', {}))[0];
    const shelf = crypto.randomUUID(); await _bookshelf_.call('update', { table: 'bookshelves', values: { id: shelf } });
    await _bookshelf_.call('link', { table: 'bookshelf_documents', values: { bookshelf_id: shelf, document_id: first.id, order_key: '1' } });
    pdf.setTitle('Updated edition');
    const second = await _bookshelf_.import(new File([await pdf.save()], 'New.pdf'), { replacesId: first.id });
    const old = await _bookshelf_.call('read', { id: first.id });
    const visible = await _bookshelf_.call('list');
    const links = await _bookshelf_.call('records', { table: 'bookshelf_documents', parent: 'bookshelf_id', id: shelf });
    const oldEntries = await _bookshelf_.call('records', { table: 'entries', parent: 'document_id', id: first.id });
    return { visible: visible.map(d => d.id), expected: second.id, replaced: old.document.replaced_by_id === second.id,
      derived: second.derived_from_id, oldDeleted: old.document.deleted_at,
      oldEntry: oldEntries.some(e => e.id === entry.id), bothMemberships: links.length === 2 };
  });
  expect(result).toMatchObject({ visible: [result.expected], replaced: true, oldDeleted: null, oldEntry: true, bothMemberships: true });
  expect(result.derived == null).toBe(true);
});

test('collection and song editing UI works on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pod.html');
  await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  const ids = await page.evaluate(async () => {
    const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300,400]);
    const doc = await _bookshelf_.import(new File([await pdf.save()], 'UI.pdf'));
    return { doc: doc.id, entry: (await _bookshelf_.call('search', {}))[0].id };
  });
  await page.evaluate(() => _menu_.notify('score/open/up'));
  await page.getByText('Library', { exact: true }).click();
  await page.getByLabel('Library view').selectOption('bookshelves');
  await expect(page.getByText('Choose or create a collection', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'UI.pdf', exact: true })).toHaveCount(0);
  await page.getByLabel('New collection name').fill('My shelf');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByLabel('Collection', { exact: true }).locator('option', { hasText: 'My shelf' })).toHaveCount(1);
  await page.getByLabel('Library view').selectOption('documents');
  await page.getByText('Edit and organize', { exact: true }).click();
  const shelf = await page.getByLabel('Add to bookshelf').locator('option', { hasText: 'My shelf' }).getAttribute('value');
  await page.getByLabel('Add to bookshelf').selectOption(shelf);
  await page.getByLabel('Library view').selectOption('bookshelves');
  await page.getByLabel('Collection', { exact: true }).selectOption(shelf);
  await expect(page.getByRole('button', { name: 'UI.pdf', exact: true })).toBeVisible();
  await page.getByLabel('Library view').selectOption('entries');
  await page.getByText('Edit and organize', { exact: true }).click();
  await page.getByLabel('Song title', { exact: true }).fill('Renamed song');
  await page.getByRole('button', { name: 'Rename', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Renamed song', exact: true })).toBeVisible();
  const saved = await page.evaluate(async id => (await _bookshelf_.call('records', { table: 'entries' })).find(e => e.id === id), ids.entry);
  expect(JSON.parse(saved.metadata_json).title).toBe('Renamed song');
  await page.screenshot({ path: test.info().outputPath('library-mobile.png') });
});

test('a failed import rolls back metadata and removes the copied file', async ({ page }) => {
  await page.goto('/pod.html');
  await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  const result = await page.evaluate(async () => {
    let failed = false;
    try {
      await _bookshelf_.call('importFile', { file: new File(['not committed'], 'Failed.pdf'), entries: [
        { id: crypto.randomUUID(), parent_id: crypto.randomUUID(), anchor: { type: 'pdf', pageIndex: 0 }, metadata: { title: 'Invalid parent' } },
      ] });
    } catch { failed = true; }
    const documents = await _bookshelf_.call('list');
    const root = await navigator.storage.getDirectory(); const folder = await root.getDirectoryHandle('scores');
    const files = []; for await (const name of folder.keys()) files.push(name);
    return { failed, documents: documents.length, files: files.length };
  });
  expect(result).toEqual({ failed: true, documents: 0, files: 0 });
});

test('a second tab reports exclusive database access instead of using temporary storage', async ({ page }) => {
  await page.goto('/pod.html');
  await page.waitForFunction(() => !!window._bookshelf_);
  await page.evaluate(() => _bookshelf_.call('open'));
  const second = await page.context().newPage();
  await second.goto('/pod.html');
  await second.waitForFunction(() => !!window._bookshelf_);
  const error = await second.evaluate(async () => {
    try { await _bookshelf_.call('open'); return null; } catch (e) { return e.message; }
  });
  expect(error).toBeTruthy();
  await second.close();
});

for (const kind of ['indexeddb', 'directory']) test(`${kind} backend saves SQLite and owned files across reload`, async ({ page }) => {
  await page.goto('/pod.html');
  await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  const id = await page.evaluate(async kind => {
    const storage = kind === 'directory' ? { kind, directory: await (await navigator.storage.getDirectory()).getDirectoryHandle('chosen-folder', { create: true }) } : { kind };
    await _bookshelf_.configure(storage);
    const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300,400]);
    return (await _bookshelf_.import(new File([await pdf.save()], 'Persist.pdf'))).id;
  }, kind);
  await page.reload();
  await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  const result = await page.evaluate(async ({ kind, id }) => {
    const docs = await _bookshelf_.call('list');
    const score = await _bookshelf_.openDocument(id);
    return { ids: docs.map(doc => doc.id), pages: score.pgs.length, kind: _bookshelf_.storage.kind };
  }, { kind, id });
  expect(result).toEqual({ ids: [id], pages: 1, kind });
});

test('library packages restore on another device, merge independent edits, and preserve conflicts until resolved', async ({ page, browser }) => {
  await page.goto('/pod.html');
  await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  const initial = await page.evaluate(async () => {
    const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300,400]);
    const doc = await _bookshelf_.import(new File([await pdf.save()], 'Exchange.pdf'));
    const entry = (await _bookshelf_.call('search', {}))[0];
    const score = await _bookshelf_.openDocument(doc.id); score.setDirty(true); await _bookshelf_.flush(score);
    return { docId: doc.id, entryId: entry.id, bytes: [...new Uint8Array(await (await _bookshelf_.exportBackup()).arrayBuffer())] };
  });
  const otherContext = await browser.newContext(); await blockExternal(otherContext, page.external);
  try {
    const other = await otherContext.newPage(); await other.goto('/pod.html');
    await other.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
    const restored = await other.evaluate(async initial => {
      const result = await _bookshelf_.importBackup(new File([new Uint8Array(initial.bytes)], 'library.zip'));
      const score = await _bookshelf_.openDocument(initial.docId);
      const pg = await score.pgUse(1, false); pg.canvas.add(new fabric.Rect({ left: 20, top: 30, width: 40, height: 50, fill: 'blue' }));
      score.setDirty(true); await _bookshelf_.flush(score);
      await _bookshelf_.call('update', { table: 'entries', values: { id: initial.entryId,
        metadata_json: JSON.stringify({ title: 'Remote title', source: { type: 'manual' } }) } });
      return { result, bytes: [...new Uint8Array(await (await _bookshelf_.exportBackup()).arrayBuffer())] };
    }, initial);
    expect(restored.result).toMatchObject({ importedFiles: 1, conflicts: 0 });
    const merged = await page.evaluate(async ({ initial, bytes }) => {
      const score = _score_, pg = await score.pgUse(1, false);
      pg.canvas.add(new fabric.Circle({ left: 70, top: 80, radius: 10, fill: 'red' })); score.setDirty(true); await _bookshelf_.flush(score);
      await _bookshelf_.call('update', { table: 'entries', values: { id: initial.entryId,
        metadata_json: JSON.stringify({ title: 'Local title', source: { type: 'manual' } }) } });
      const result = await _bookshelf_.importBackup(new File([new Uint8Array(bytes)], 'remote.zip'));
      const conflicts = await _bookshelf_.call('conflicts');
      const restoredScore = await _bookshelf_.openDocument(initial.docId);
      const restoredPg = await restoredScore.pgUse(1, false);
      const fills = restoredPg.canvas.getObjects().map(object => object.fill).sort();
      const conflict = conflicts.find(conflict => conflict.id === initial.entryId);
      const chosen = conflict.alternatives.find(change => JSON.parse(JSON.parse(change.payload_json).metadata_json).title === 'Remote title');
      await _bookshelf_.call('resolveConflict', { table: 'entries', id: initial.entryId, revisionId: chosen.id,
        expectedRevisionIds: conflict.alternatives.map(change => change.id) });
      const again = await _bookshelf_.importBackup(new File([new Uint8Array(bytes)], 'remote.zip'));
      return { result, conflictCount: conflicts.length, fills, again, resolved: (await _bookshelf_.call('conflicts')).length,
        bytes: [...new Uint8Array(await (await _bookshelf_.exportBackup()).arrayBuffer())] };
    }, { initial, bytes: restored.bytes });
    expect(merged.fills).toEqual(['blue', 'red']);
    expect(merged.conflictCount).toBe(1);
    expect(merged.resolved).toBe(0);
    expect(merged.again.addedChanges).toBe(0);
    const converged = await other.evaluate(async ({ initial, bytes }) => {
      await _bookshelf_.importBackup(new File([new Uint8Array(bytes)], 'resolved.zip'));
      return { titles: (await _bookshelf_.call('search', {})).map(row => JSON.parse(row.metadata_json).title),
        conflicts: (await _bookshelf_.call('conflicts')).length };
    }, { initial, bytes: merged.bytes });
    expect(converged).toEqual({ titles: ['Remote title'], conflicts: 0 });
  } finally { await otherContext.close(); }
});

test('damaged backup files and forged change records are rejected without altering the library', async ({ page }) => {
  await page.goto('/pod.html');
  await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  const bytes = await page.evaluate(async () => {
    const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300,400]);
    await _bookshelf_.import(new File([await pdf.save()], 'Safe.pdf'));
    return [...new Uint8Array(await (await _bookshelf_.exportBackup()).arrayBuffer())];
  });
  const damaged = unzipSync(new Uint8Array(bytes));
  const scorePath = Object.keys(damaged).find(name => name.startsWith('scores/'));
  damaged[scorePath][0] ^= 1;
  const forged = unzipSync(new Uint8Array(bytes));
  const manifest = JSON.parse(strFromU8(forged['library.json']));
  manifest.changes[0].entity_type = 'documents; DROP TABLE entries';
  forged['library.json'] = strToU8(JSON.stringify(manifest));
  for (const archive of [zipSync(damaged), zipSync(forged)]) {
    const result = await page.evaluate(async bytes => {
      let error;
      try { await _bookshelf_.importBackup(new File([new Uint8Array(bytes)], 'bad.zip')); } catch (e) { error = e.message; }
      return { error, count: (await _bookshelf_.call('list')).length, entries: (await _bookshelf_.call('search', {})).length };
    }, [...archive]);
    expect(result.error).toBeTruthy();
    expect(result).toMatchObject({ count: 1, entries: 1 });
  }
});

test('standalone file URL starts the embedded Worker and persists with an explicit backend', async ({ page }) => {
  await page.goto(pathToFileURL(path.resolve('build/podium.html')).href);
  await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  const result = await page.evaluate(async () => {
    await _bookshelf_.configure({ kind: 'indexeddb', name: 'file-library-test-' + crypto.randomUUID() });
    const tag = await _bookshelf_.call('update', { table: 'tags', values: { id: crypto.randomUUID(), name: 'Offline tag' } });
    const bytes = await _bookshelf_.call('export');
    return { name: tag.name, header: new TextDecoder().decode(bytes.slice(0,15)) };
  });
  expect(result).toEqual({ name: 'Offline tag', header: 'SQLite format 3' });
  await page.reload(); await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  const tags = await page.evaluate(() => _bookshelf_.call('records', { table: 'tags' }));
  expect(tags.map(tag => tag.name)).toEqual(['Offline tag']);
});

test('an external database change blocks overwriting but still permits an emergency backup', async ({ page }) => {
  await page.goto('/pod.html');
  await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  const result = await page.evaluate(async () => {
    const directory = await (await navigator.storage.getDirectory()).getDirectoryHandle('external-change', { create: true });
    await _bookshelf_.configure({ kind: 'directory', directory });
    const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300,400]);
    const doc = await _bookshelf_.import(new File([await pdf.save()], 'Recover.pdf'));
    const score = await _bookshelf_.openDocument(doc.id), pg = await score.pgUse(1, false);
    const handle = await directory.getFileHandle('library.sqlite');
    const changed = new Uint8Array(await (await handle.getFile()).arrayBuffer()); changed[changed.length - 1] ^= 1;
    const writer = await handle.createWritable(); await writer.write(changed); await writer.close();
    pg.canvas.add(new fabric.Rect({ left:10,top:20,width:30,height:40,fill:'red' })); score.setDirty(true);
    let error;
    try { await _bookshelf_.flush(score); } catch (e) { error = e.message; }
    const archive = await _bookshelf_.exportBackup();
    return { error, dirty: score.dirty, emergency: _bookshelf_.emergencyBackup, bytes: [...new Uint8Array(await archive.arrayBuffer())] };
  });
  expect(result.error).toMatch(/changed outside/);
  expect(result).toMatchObject({ dirty: true, emergency: true });
  const backup = unzipSync(new Uint8Array(result.bytes));
  const manifest = JSON.parse(strFromU8(backup['library.json']));
  expect(manifest.records.annotations.filter(row => !row.deleted_at)).toHaveLength(1);
});

test('sync transport exchanges immutable packages and resumes after a failed upload', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/pod.html'); await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  const result = await page.evaluate(async () => {
    const packages = new Map();
    const transport = { id: 'mock-cloud', async list() { return [...packages.keys()].map(id => ({ id })); },
      async read(id) { return packages.get(id); }, async write(id, file) { if (packages.has(id)) throw new Error('Package overwritten'); packages.set(id, file); } };
    const a = { kind: 'indexeddb', name: 'device-a' }, b = { kind: 'indexeddb', name: 'device-b' };
    await _bookshelf_.configure(a);
    const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300,400]);
    await _bookshelf_.import(new File([await pdf.save()], 'Sync.pdf'));
    await _bookshelf_.sync(transport);
    await _bookshelf_.configure(b); await _bookshelf_.sync(transport);
    await _bookshelf_.call('update', { table: 'tags', values: { id: crypto.randomUUID(), name: 'From B' } });
    await _bookshelf_.sync(transport);
    await _bookshelf_.configure(a);
    await _bookshelf_.call('update', { table: 'tags', values: { id: crypto.randomUUID(), name: 'From A' } });
    let failed = false;
    try { await _bookshelf_.sync({ ...transport, async write() { throw new Error('Upload failed'); } }); } catch { failed = true; }
    await _bookshelf_.sync(transport);
    const namesA = (await _bookshelf_.call('records', { table: 'tags' })).map(row => row.name).sort();
    await _bookshelf_.configure(b); await _bookshelf_.sync(transport);
    const namesB = (await _bookshelf_.call('records', { table: 'tags' })).map(row => row.name).sort();
    const count = packages.size;
    const unchanged = await _bookshelf_.sync(transport);
    // Changing accounts can leave the same destination name with no packages.
    packages.clear();
    const republished = await _bookshelf_.sync(transport);
    return { namesA, namesB, failed, packages: count, skipped: unchanged.uploadedPackage === null,
      republished: !!republished.uploadedPackage && packages.size === 1, conflicts: (await _bookshelf_.call('conflicts')).length };
  });
  expect(result).toMatchObject({ namesA: ['From A','From B'], namesB: ['From A','From B'], failed: true, skipped: true, republished: true, conflicts: 0 });
  expect(result.packages).toBe(5);
});

test('backup controls download a complete archive and import it into another library', async ({ page }) => {
  await page.goto('/pod.html'); await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  await page.evaluate(async () => {
    const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300,400]);
    await _bookshelf_.import(new File([await pdf.save()], 'Backup UI.pdf'));
    _menu_.notify('score/open/up');
  });
  await page.getByText('Library', { exact: true }).click();
  await page.getByText('Backups and conflicting edits', { exact: true }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export library', exact: true }).click();
  const download = await downloading;
  const data = fs.readFileSync(await download.path());
  const archive = unzipSync(data);
  expect(Object.keys(archive).filter(name => name.startsWith('scores/'))).toHaveLength(1);
  expect(new TextDecoder().decode(archive['library.sqlite'].slice(0,15))).toBe('SQLite format 3');
  await page.evaluate(() => _bookshelf_.configure({ kind: 'indexeddb', name: 'backup-ui-target' }));
  await page.getByLabel('Import library backup').setInputFiles({ name: 'backup.zip', mimeType: 'application/zip', buffer: data });
  await expect(page.getByRole('status')).toHaveText('Imported 1 scores; 0 conflicting items to review.');
  expect(await page.evaluate(async () => (await _bookshelf_.call('list')).length)).toBe(1);
});

test('cloud sync publishes unique complete packages through the existing provider interface', async ({ page }) => {
  await page.goto('/pod.html'); await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  const result = await page.evaluate(async () => {
    const files = new Map(), folders = []; let failPublish = false;
    const source = { source: 'pCloud', async auth() {},
      async getDir(path) { folders.push(path); return { files: Object.fromEntries(files) }; },
      async getFileSrc(path, name) { return files.get(name).bytes; },
      async putFile(path, name, bytes) { if (files.has(name)) throw new Error('Overwrite'); files.set(name, { name, bytes }); },
      async renameFile(path, name, newName) { if (failPublish) throw new Error('Publication failed'); files.set(newName, files.get(name)); files.delete(name); },
      async trashFile(path, name) { files.delete(name); } };
    const original = _FileSrc_.get;
    _FileSrc_.get = ref => ref === 'pCloud' ? source : original.call(_FileSrc_, ref);
    try {
      const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300,400]);
      await _bookshelf_.import(new File([await pdf.save()], 'Cloud.pdf'));
      await _bookshelf_.syncCloud('pCloud', 'My library');
      await _bookshelf_.syncCloud('pCloud', 'My library');
      await _bookshelf_.call('update', { table: 'tags', values: { id: crypto.randomUUID(), name: 'Pending upload' } });
      failPublish = true; let failed = false;
      try { await _bookshelf_.syncCloud('pCloud', 'My library'); } catch { failed = true; }
      return { names: [...files.keys()], correctFolder: folders.every(path => path === '/My library'), failed };
    } finally { _FileSrc_.get = original; }
  });
  expect(result.names).toHaveLength(1);
  expect(result.names.every(name => /^rostrum-library-[0-9a-f-]+\.zip$/.test(name))).toBe(true);
  expect(result).toMatchObject({ correctFolder: true, failed: true });
});
