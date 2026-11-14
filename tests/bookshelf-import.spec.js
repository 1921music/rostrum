const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { zipSync } = require('fflate');

test.beforeEach(async ({ page }) => {
  page.external = [];
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:9876/') || url.startsWith(pathToFileURL(path.resolve('build')).href + '/')) return route.continue();
    if (url === 'https://accounts.google.com/gsi/client') return route.fulfill({ contentType:'application/javascript', body:'window.google = { accounts: { oauth2: {} } };' });
    page.external.push(url); return route.abort();
  });
});
test.afterEach(async ({ page }) => expect(page.external).toEqual([]));

const review = page => page.getByRole('dialog', { name:'Review score import' });
async function start(page, url = '/pod.html') {
  await page.goto(url); await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  if (url.startsWith('file:')) await page.evaluate(() => _bookshelf_.configure({ kind:'indexeddb' }));
  await page.evaluate(() => _menu_.notify('score/open/up'));
  await page.getByText('Library', { exact:true }).click();
}
async function pdfBytes(page, outline = false) {
  return Buffer.from(await page.evaluate(async outline => {
    const pdf = await PDFLib.PDFDocument.create(); pdf.setTitle('Internal title');
    for (let i = 0; i < 3; i++) pdf.addPage([300,400]);
    if (outline) {
      const dict = values => pdf.context.obj(values), register = values => pdf.context.register(dict(values));
      const root = register({ Type:'Outlines', Count:3 });
      const parent = register({ Title:PDFLib.PDFHexString.fromText('Collection heading'), Parent:root, Dest:[pdf.getPage(0).ref,'Fit'], Count:1 });
      const child = register({ Title:PDFLib.PDFHexString.fromText('Waltz'), Parent:parent, Dest:[pdf.getPage(1).ref,'Fit'] });
      const unwanted = register({ Title:PDFLib.PDFHexString.fromText('Contents'), Parent:root, Dest:[pdf.getPage(2).ref,'Fit'], Prev:parent });
      pdf.context.lookup(parent).set(PDFLib.PDFName.of('First'),child); pdf.context.lookup(parent).set(PDFLib.PDFName.of('Last'),child);
      pdf.context.lookup(parent).set(PDFLib.PDFName.of('Next'),unwanted);
      pdf.context.lookup(root).set(PDFLib.PDFName.of('First'),parent); pdf.context.lookup(root).set(PDFLib.PDFName.of('Last'),unwanted);
      pdf.catalog.set(PDFLib.PDFName.of('Outlines'),root);
    }
    return [...await pdf.save()];
  }, outline));
}
async function choose(page, bytes, name = 'Single.pdf') {
  await page.getByLabel('Import scores').setInputFiles({ name, mimeType:'application/octet-stream', buffer:bytes });
  await expect(review(page)).toBeVisible();
}

for (const url of ['/pod.html', '/rostrum.html', pathToFileURL(path.resolve('build/rostrum.html')).href]) test(`single PDF review validates, previews and commits edited songs (${url.startsWith('file:') ? 'file URL' : url})`, async ({ page }) => {
  if (url === '/rostrum.html') await page.setViewportSize({ width:390, height:844 });
  await start(page,url); const bytes = await pdfBytes(page);
  await choose(page,bytes);
  const dlg = review(page), song = dlg.getByRole('group', { name:'Song 1', exact:true });
  expect(await page.evaluate(async () => (await _bookshelf_.call('list')).length)).toBe(0);
  await expect(dlg.locator('canvas')).toBeVisible();
  await page.screenshot({ path:test.info().outputPath('import-review.png') });
  await expect(song.getByLabel('Song title', { exact:true })).toHaveValue('Internal title');
  await song.getByRole('button', { name:'Use filename as title' }).click();
  await expect(song.getByLabel('Song title', { exact:true })).toHaveValue('Single');
  await dlg.getByLabel('Library score name').fill('My edited score');
  await song.getByLabel('Composer', { exact:true }).fill('Chopin');
  await song.getByLabel('Start page', { exact:true }).fill('4');
  await dlg.getByRole('button', { name:'Import into library', exact:true }).click();
  await expect(dlg.getByRole('alert')).toContainText('within this score');
  await song.getByLabel('Start page', { exact:true }).fill('2');
  await song.getByRole('button', { name:'Preview song page' }).click();
  await expect(dlg.getByText('Page 2 of 3', { exact:true })).toBeVisible();
  // Native dialog content must not start a background menu drag.
  const position = await page.evaluate(() => [_menu_.elm.style.left,_menu_.elm.style.top]);
  await dlg.getByText('Single.pdf', { exact:true }).scrollIntoViewIfNeeded();
  const box = await dlg.getByText('Single.pdf', { exact:true }).boundingBox();
  await page.mouse.move(box.x + 5,box.y + 5); await page.mouse.down(); await page.waitForTimeout(1300); await page.mouse.up();
  expect(await page.evaluate(() => [_menu_.elm.style.left,_menu_.elm.style.top])).toEqual(position);
  await dlg.getByRole('button', { name:'Import into library', exact:true }).click();
  await expect(dlg).toHaveCount(0);
  await expect(page.getByRole('button', { name:'My edited score', exact:true })).toBeVisible();
  await page.getByLabel('Library view').selectOption('entries');
  await page.getByRole('button', { name:'Single', exact:true }).click();
  await expect.poll(() => page.evaluate(() => Number(window._score_?.numbers.pn))).toBe(2);
  const result = await page.evaluate(async () => {
    const row = (await _bookshelf_.call('search'))[0];
    return { metadata:JSON.parse(row.metadata_json), anchor:JSON.parse(row.anchor_json) };
  });
  expect(result.metadata).toMatchObject({ title:'Single', composer:'Chopin' });
  expect(result.anchor.pageIndex).toBe(1);
});

test('outline choices, hierarchy and added songs survive reindex without modifying the PDF', async ({ page }) => {
  await start(page); const bytes = await pdfBytes(page,true); await choose(page,bytes,'Collection.pdf');
  const dlg = review(page);
  await dlg.getByRole('group', { name:'Song 1', exact:true }).getByLabel('Include song').uncheck();
  await dlg.getByRole('group', { name:'Song 3', exact:true }).getByLabel('Include song').uncheck();
  const child = dlg.getByRole('group', { name:'Song 2', exact:true });
  await child.getByLabel('Song title', { exact:true }).fill('Edited waltz');
  await child.getByLabel('Composer').fill('Composer');
  await dlg.getByLabel('Preview page', { exact:true }).fill('3');
  await dlg.getByLabel('Preview page', { exact:true }).press('Tab');
  await dlg.getByRole('button', { name:'Add song', exact:true }).click();
  const added = dlg.getByRole('group', { name:'Song 4', exact:true });
  await added.getByLabel('Song title', { exact:true }).fill('Unbookmarked song');
  await expect(added.getByLabel('Start page')).toHaveValue('3');
  await dlg.getByRole('button', { name:'Import into library', exact:true }).click(); await expect(dlg).toHaveCount(0);
  const result = await page.evaluate(async () => {
    const doc = (await _bookshelf_.call('list'))[0]; await _bookshelf_.reindex(doc.id);
    const rows = await _bookshelf_.call('search');
    const read = await _bookshelf_.call('read',{ id:doc.id });
    return { rows:rows.map(row => ({ parent:row.parent_id, metadata:JSON.parse(row.metadata_json), anchor:JSON.parse(row.anchor_json) })), bytes:[...new Uint8Array(await read.file.arrayBuffer())] };
  });
  expect(result.rows).toHaveLength(2);
  expect(result.rows.find(row => row.metadata.title === 'Edited waltz')).toMatchObject({ parent:null, metadata:{ composer:'Composer' } });
  expect(result.rows.find(row => row.metadata.title === 'Unbookmarked song').anchor.pageIndex).toBe(2);
  expect(Buffer.from(result.bytes)).toEqual(bytes);
});

test('MSCZ review previews, cancels safely, and can edit the single song using its filename', async ({ page }) => {
  await page.goto('/pod.html'); await page.waitForFunction(() => !!window._Score_ && !!window._menu_);
  await page.evaluate(async () => { await _Score_.newScore(1,300,400,'#ffffff'); window.originalScore = _score_; });
  await page.evaluate(() => _menu_.notify('score/open/up'));
  await page.getByText('Library', { exact:true }).click();
  const bytes = Buffer.from(zipSync({ 'score.mscx':fs.readFileSync(path.join(__dirname,'fixtures/font-score.mscx')) }));
  await choose(page,bytes,'My music.mscz');
  await expect(review(page).getByLabel('Song title', { exact:true })).toHaveValue('Shared fonts');
  await expect(review(page).locator('canvas')).toBeVisible();
  await review(page).getByRole('button', { name:'Cancel import' }).click(); await expect(review(page)).toHaveCount(0);
  expect(await page.evaluate(async () => ({ count:(await _bookshelf_.call('list')).length, same:_score_ === originalScore }))).toEqual({ count:0, same:true });
  await choose(page,bytes,'My music.mscz');
  await review(page).getByRole('button', { name:'Use filename as title' }).click();
  await review(page).getByLabel('Composer', { exact:true }).fill('My composer');
  await review(page).getByRole('button', { name:'Import into library', exact:true }).click(); await expect(review(page)).toHaveCount(0);
  expect(await page.evaluate(async () => JSON.parse((await _bookshelf_.call('search'))[0].metadata_json))).toMatchObject({ title:'My music', composer:'My composer' });
});

test('file-only import keeps exclusions across reindex and duplicate imports skip review', async ({ page }) => {
  await start(page); const bytes = await pdfBytes(page); await choose(page,bytes);
  await review(page).getByLabel('Include song').uncheck();
  await review(page).getByRole('button', { name:'Import into library', exact:true }).click(); await expect(review(page)).toHaveCount(0);
  expect(await page.evaluate(async () => {
    const docs = await _bookshelf_.call('list'); await _bookshelf_.reindex(docs[0].id);
    return { files:docs.length, songs:(await _bookshelf_.call('search')).length };
  })).toEqual({ files:1, songs:0 });
  await page.getByLabel('Import scores').setInputFiles({ name:'Renamed.pdf',mimeType:'application/pdf',buffer:bytes });
  await expect(page.getByRole('status')).toContainText('skipped 1 already imported');
  await expect(review(page)).toHaveCount(0);
});

test('a failed commit preserves the draft for retry and Escape cancels the next file', async ({ page }) => {
  await start(page); const bytes = await pdfBytes(page);
  await page.getByLabel('Import scores').setInputFiles([
    { name:'First.pdf',mimeType:'application/pdf',buffer:bytes },
    { name:'Second.pdf',mimeType:'application/pdf',buffer:Buffer.from(await page.evaluate(async () => {
      const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([400,500]); return [...await pdf.save()];
    })) },
  ]);
  await expect(review(page)).toBeVisible();
  await review(page).getByLabel('Song title', { exact:true }).fill('Keep my draft');
  await page.evaluate(() => {
    const original = _bookshelf_.call.bind(_bookshelf_);
    _bookshelf_.call = async (action,args) => {
      if (action === 'importFile') { _bookshelf_.call = original; throw new Error('Simulated write failure'); }
      return original(action,args);
    };
  });
  await review(page).getByRole('button', { name:'Import into library', exact:true }).click();
  await expect(review(page).getByRole('alert')).toHaveText('Simulated write failure');
  await expect(review(page).getByLabel('Song title', { exact:true })).toHaveValue('Keep my draft');
  await review(page).getByRole('button', { name:'Import into library', exact:true }).click();
  await expect(review(page).getByText('Second.pdf', { exact:true })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(review(page)).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('cancelled 1 scores');
  expect(await page.evaluate(async () => ({ files:(await _bookshelf_.call('list')).length, title:JSON.parse((await _bookshelf_.call('search'))[0].metadata_json).title }))).toEqual({ files:1,title:'Keep my draft' });
});

test('current-score imports and replacements both require confirmation', async ({ page }) => {
  await page.goto('/pod.html'); await page.waitForFunction(() => !!window._Score_ && !!window._menu_);
  await page.evaluate(async () => { await _Score_.newScore(1,300,400,'#ffffff'); });
  await page.evaluate(() => _menu_.notify('score/open/up'));
  await page.getByText('Library', { exact:true }).click();
  await page.getByRole('button', { name:'Import current score', exact:true }).click();
  await expect(review(page)).toBeVisible();
  await review(page).getByRole('button', { name:'Cancel import' }).click(); await expect(review(page)).toHaveCount(0);
  expect(await page.evaluate(async () => (await _bookshelf_.call('list')).length)).toBe(0);
  await page.getByRole('button', { name:'Import current score', exact:true }).click();
  await review(page).getByLabel('Library score name').fill('Imported current');
  await review(page).getByRole('button', { name:'Import into library', exact:true }).click(); await expect(review(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name:'Imported current', exact:true })).toBeVisible();
  const oldId = await page.evaluate(async () => (await _bookshelf_.call('list'))[0].id);
  await page.getByText('Edit and organize', { exact:true }).click();
  const replacement = { name:'Replacement.pdf', mimeType:'application/pdf', buffer:await pdfBytes(page) };
  await page.getByLabel('Replace score file').setInputFiles(replacement);
  await expect(review(page)).toBeVisible();
  await review(page).getByRole('button', { name:'Cancel import' }).click(); await expect(review(page)).toHaveCount(0);
  expect(await page.evaluate(async id => (await _bookshelf_.call('read', { id })).document.replaced_by_id,oldId)).toBeNull();
  // The same file can be chosen again after cancel, using a freshly rendered row.
  await page.getByText('Edit and organize', { exact:true }).click();
  await page.getByLabel('Replace score file').setInputFiles(replacement);
  await review(page).getByLabel('Song title', { exact:true }).fill('Replacement song');
  await review(page).getByRole('button', { name:'Import into library', exact:true }).click(); await expect(review(page)).toHaveCount(0);
  expect(await page.evaluate(async id => {
    const docs = await _bookshelf_.call('list');
    return (await _bookshelf_.call('read', { id })).document.replaced_by_id === docs[0].id;
  },oldId)).toBe(true);
});

test('folder permission can be restored inside the review without losing edits', async ({ page }) => {
  await start(page);
  await page.evaluate(async () => {
    const directory = await (await navigator.storage.getDirectory()).getDirectoryHandle('review-permission', { create:true });
    await _bookshelf_.configure({ kind:'directory', directory });
    FileSystemHandle.prototype.requestPermission = async () => {
      window.permissionHadGesture = navigator.userActivation.isActive; return 'granted';
    };
  });
  await choose(page,await pdfBytes(page));
  await review(page).getByLabel('Song title', { exact:true }).fill('Retained after permission');
  await page.evaluate(() => {
    const worker = _bookshelf_.worker, original = worker.postMessage;
    worker.postMessage = function(message) {
      if (message.action !== 'importFile') return original.call(this,message);
      worker.postMessage = original;
      queueMicrotask(() => worker.dispatchEvent(new MessageEvent('message', {
        data:{ id:message.id, error:'Permission expired', errorName:'NotAllowedError' },
      })));
    };
  });
  await review(page).getByRole('button', { name:'Import into library', exact:true }).click();
  await expect(review(page).getByRole('alert')).toHaveText('Permission expired');
  await review(page).getByRole('button', { name:'Allow library folder access', exact:true }).click();
  await expect(review(page).getByLabel('Song title', { exact:true })).toHaveValue('Retained after permission');
  expect(await page.evaluate(() => permissionHadGesture)).toBe(true);
  await review(page).getByRole('button', { name:'Import into library', exact:true }).click(); await expect(review(page)).toHaveCount(0);
  expect(await page.evaluate(async () => JSON.parse((await _bookshelf_.call('search'))[0].metadata_json).title)).toBe('Retained after permission');
});
