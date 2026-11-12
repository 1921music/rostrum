const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

test.beforeEach(async ({ page }) => {
  page.external = [];
  await page.context().route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:9876/')) return route.continue();
    if (url === 'https://accounts.google.com/gsi/client') return route.fulfill({ contentType: 'application/javascript', body: 'window.google = { accounts: { oauth2: {} } };' });
    page.external.push(url); return route.abort();
  });
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
  await page.getByRole('button', { name: 'Owned.pdf', exact: true }).click();
  await expect.poll(() => page.evaluate(() => _score_?.name)).toBe('Owned.pdf');
  expect(await page.evaluate(() => !!_score_.libraryDocumentId)).toBe(true);
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
    const second = await _bookshelf_.import(new File([bytes], 'New.pdf'), { replacesId: first.id });
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
