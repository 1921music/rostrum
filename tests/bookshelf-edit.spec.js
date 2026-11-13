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
const editor = page => page.getByRole('dialog', { name:'Edit score songs' });
async function start(page, url = '/pod.html') {
  await page.goto(url); await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  if (url.startsWith('file:')) await page.evaluate(() => _bookshelf_.configure({ kind:'indexeddb' }));
}
async function pdf(page) {
  return page.evaluate(async () => {
    const pdf = await PDFLib.PDFDocument.create(); pdf.setTitle('Original song');
    for (let i = 0; i < 3; i++) pdf.addPage([300,400]);
    return (await _bookshelf_.import(new File([await pdf.save()],'Original.pdf'))).id;
  });
}
async function openEditor(page) {
  if (!await page.getByText('Library', { exact:true }).isVisible()) await page.evaluate(() => _menu_.notify('score/open/up'));
  await page.getByText('Library', { exact:true }).click();
  await page.getByText('Edit and organize', { exact:true }).click();
  await page.getByRole('button', { name:'Edit songs', exact:true }).click();
  await expect(editor(page)).toBeVisible();
}
async function finish(page, action = 'Save changes') {
  await editor(page).getByRole('button', { name:action, exact:true }).click();
  await expect(editor(page)).toHaveCount(0);
  await page.waitForFunction(() => !window._bookshelf_.reviewPending);
}

test('saved-song editor keeps identities, classifications, writing and original file while editing and deleting songs', async ({ page }) => {
  await start(page); const id = await pdf(page);
  const baseline = await page.evaluate(async id => {
    const root = (await _bookshelf_.call('search'))[0];
    await _bookshelf_.call('update', { table:'entries', values:{ id:root.id, metadata_json:JSON.stringify({ ...JSON.parse(root.metadata_json), aliases:['Keep alias'], custom:{ note:'Keep metadata' } }) } });
    const second = crypto.randomUUID();
    await _bookshelf_.call('update', { table:'entries', values:{ id:second, document_id:id, parent_id:null,
      anchor_json:'{"type":"pdf","pageIndex":1}',metadata_json:'{"title":"Delete me","source":{"type":"manual"}}' } });
    const tag = crypto.randomUUID(), playlist = crypto.randomUUID();
    await _bookshelf_.call('update', { table:'tags', values:{ id:tag,name:'Practice' } });
    await _bookshelf_.call('update', { table:'playlists', values:{ id:playlist,metadata_json:'{"name":"Concert"}' } });
    for (const entry_id of [root.id,second]) {
      await _bookshelf_.call('link', { table:'entry_tags', values:{ entry_id,tag_id:tag } });
      await _bookshelf_.call('link', { table:'playlist_items', values:{ entry_id,playlist_id:playlist,order_key:entry_id } });
    }
    const score = await _bookshelf_.openDocument(id), pg = await score.pgUse(1,false);
    pg.canvas.add(new fabric.Circle({ left:30,top:40,radius:8,fill:'red' })); score.setDirty(true); await _bookshelf_.flush(score);
    window.editOriginalScore = score;
    const state = await _bookshelf_.call('read',{ id });
    return { root:root.id, second, hash:state.document.content_hash, settings:state.document.settings_json,
      annotations:state.annotations, tags:await _bookshelf_.call('records',{ table:'entry_tags' }), playlists:await _bookshelf_.call('records',{ table:'playlist_items' }) };
  },id);
  await openEditor(page); await expect(editor(page).locator('canvas')).toBeVisible();
  const first = editor(page).getByRole('group',{ name:'Song 1',exact:true });
  await editor(page).getByLabel('Library score name').fill('Renamed score');
  await first.getByLabel('Song title',{ exact:true }).fill('Edited song');
  await first.getByLabel('Composer',{ exact:true }).fill('Edited composer');
  await first.getByLabel('Start page',{ exact:true }).fill('2');
  await editor(page).getByRole('group',{ name:'Song 2',exact:true }).getByRole('button',{ name:'Delete song',exact:true }).click();
  await expect(editor(page).getByRole('group',{ name:'Song 2',exact:true }).getByLabel('Include song')).not.toBeChecked();
  await editor(page).getByLabel('Preview page').fill('3'); await editor(page).getByLabel('Preview page').press('Tab');
  await editor(page).getByRole('button',{ name:'Add song',exact:true }).click();
  await editor(page).getByRole('group',{ name:'Song 3',exact:true }).getByLabel('Song title',{ exact:true }).fill('Added song');
  await finish(page);
  const result = await page.evaluate(async id => {
    await _bookshelf_.reindex(id);
    const state = await _bookshelf_.call('songState',{ id });
    return { document:state.document, annotations:state.annotations,
      rows:state.entries.map(row => ({ ...row,metadata:JSON.parse(row.metadata_json),anchor:JSON.parse(row.anchor_json) })),
      tags:await _bookshelf_.call('records',{ table:'entry_tags' }), playlists:await _bookshelf_.call('records',{ table:'playlist_items' }), sameScore:_score_ === editOriginalScore };
  },id);
  expect(result.document).toMatchObject({ id,content_hash:baseline.hash,settings_json:baseline.settings });
  expect(JSON.parse(result.document.metadata_json).displayName).toBe('Renamed score');
  expect(result.rows.find(row => row.id === baseline.root)).toMatchObject({ metadata:{ title:'Edited song',composer:'Edited composer',aliases:['Keep alias'],custom:{ note:'Keep metadata' } },anchor:{ pageIndex:1 } });
  expect(result.rows.find(row => row.id === baseline.second).deleted_at).toBeTruthy();
  expect(result.rows.filter(row => !row.deleted_at)).toHaveLength(2);
  expect(result.rows.find(row => row.metadata.title === 'Added song').anchor.pageIndex).toBe(2);
  expect(result.annotations).toEqual(baseline.annotations); expect(result.tags).toEqual(baseline.tags); expect(result.playlists).toEqual(baseline.playlists); expect(result.sameScore).toBe(true);
});

test('cancel discards list edits, and an empty song list can be populated and cleared', async ({ page }) => {
  await start(page); const id = await pdf(page);
  const revisions = await page.evaluate(() => _bookshelf_.call('changeIds'));
  await openEditor(page);
  await editor(page).getByLabel('Song title',{ exact:true }).fill('Cancelled title');
  await editor(page).getByRole('button',{ name:'Delete song',exact:true }).click();
  await editor(page).getByRole('button',{ name:'Add song',exact:true }).click();
  await finish(page,'Cancel changes');
  expect(await page.evaluate(() => _bookshelf_.call('changeIds'))).toEqual(revisions);
  await openEditor(page); await finish(page);
  expect(await page.evaluate(() => _bookshelf_.call('changeIds'))).toEqual(revisions);
  await openEditor(page); await expect(editor(page).getByLabel('Song title',{ exact:true })).toHaveValue('Original song');
  await editor(page).getByRole('button',{ name:'Delete song',exact:true }).click();
  await expect(editor(page).getByLabel('Include song')).not.toBeChecked();
  await finish(page);
  expect(await page.evaluate(() => _bookshelf_.call('search'))).toHaveLength(0);
  await openEditor(page); await expect(editor(page).getByRole('group')).toHaveCount(0);
  await editor(page).getByRole('button',{ name:'Add song',exact:true }).click();
  await editor(page).getByLabel('Song title',{ exact:true }).fill('New index');
  await finish(page);
  expect(await page.evaluate(async id => {
    await _bookshelf_.reindex(id); return (await _bookshelf_.call('search')).map(row => JSON.parse(row.metadata_json).title);
  },id)).toEqual(['New index']);
});

for (const url of ['/rostrum.html',pathToFileURL(path.resolve('build/rostrum.html')).href]) test(`existing MSCZ uses the shared editor and retains songs after reload (${url.startsWith('file:') ? 'file URL' : 'mobile'})`, async ({ page }) => {
  if (!url.startsWith('file:')) await page.setViewportSize({ width:390,height:844 });
  await start(page,url);
  const bytes = zipSync({ 'score.mscx':fs.readFileSync(path.join(__dirname,'fixtures/font-score.mscx')) });
  const original = await page.evaluate(async bytes => {
    const doc = await _bookshelf_.import(new File([new Uint8Array(bytes)],'Music.mscz'));
    return { id:doc.id,entry:(await _bookshelf_.call('search'))[0].id };
  },[...bytes]);
  await openEditor(page);
  await expect(editor(page).getByLabel('Song title',{ exact:true })).toHaveValue('Shared fonts');
  await editor(page).getByRole('button',{ name:'Use filename as title' }).click();
  await editor(page).getByLabel('Composer',{ exact:true }).fill('Composer edited later');
  await expect(editor(page).locator('canvas')).toBeVisible();
  await page.screenshot({ path:test.info().outputPath('existing-song-editor.png') });
  await finish(page); await page.reload(); await page.waitForFunction(() => !!window._bookshelf_);
  const result = await page.evaluate(async () => {
    const rows = await _bookshelf_.call('search');
    return rows.map(row => ({ id:row.id,document_id:row.document_id,metadata:JSON.parse(row.metadata_json) }));
  });
  expect(result).toEqual([expect.objectContaining({ id:original.entry,document_id:original.id,metadata:expect.objectContaining({ title:'Music',composer:'Composer edited later' }) })]);
});

test('concurrent song edits cannot be overwritten by an older editor draft', async ({ page }) => {
  await start(page); await pdf(page); await openEditor(page);
  await editor(page).getByLabel('Song title',{ exact:true }).fill('Stale draft');
  await editor(page).getByLabel('Library score name').fill('Must not be saved');
  await page.evaluate(async () => {
    const row = (await _bookshelf_.call('search'))[0];
    await _bookshelf_.call('update',{ table:'entries',values:{ id:row.id,metadata_json:JSON.stringify({ ...JSON.parse(row.metadata_json),title:'Newer edit' }) } });
  });
  await editor(page).getByRole('button',{ name:'Save changes',exact:true }).click();
  await expect(editor(page).getByRole('alert')).toContainText('changed while the dialog was open');
  expect(await page.evaluate(async () => JSON.parse((await _bookshelf_.call('list'))[0].metadata_json).displayName)).toBe('Original.pdf');
  await finish(page,'Cancel changes'); await openEditor(page);
  await expect(editor(page).getByLabel('Song title',{ exact:true })).toHaveValue('Newer edit');
  await finish(page,'Cancel changes');
});

test('failed persistence after a committed batch can be retried with additional draft edits', async ({ page }) => {
  await start(page); await pdf(page); await openEditor(page);
  await editor(page).getByLabel('Library score name').fill('Renamed during retry');
  await editor(page).getByRole('button',{ name:'Delete song',exact:true }).click();
  await editor(page).getByRole('button',{ name:'Add song',exact:true }).click();
  const added = editor(page).getByRole('group',{ name:'Song 2',exact:true });
  await added.getByLabel('Song title',{ exact:true }).fill('Before failed persistence');
  await page.evaluate(() => {
    const worker = _bookshelf_.worker, send = worker.postMessage, receive = worker.onmessage;
    let requestId;
    worker.postMessage = function(message) { if (message.action === 'editSongs') requestId = message.id; return send.call(this,message); };
    worker.onmessage = event => {
      if (event.data.id !== requestId) return receive(event);
      worker.postMessage = send; worker.onmessage = receive;
      return receive({ data:{ id:requestId,error:'Simulated persistence failure after commit',errorName:'Error',persistenceFailed:true,committedValue:event.data.value } });
    };
  });
  await editor(page).getByRole('button',{ name:'Save changes',exact:true }).click();
  await expect(editor(page).getByRole('alert')).toContainText('after commit');
  await added.getByLabel('Song title',{ exact:true }).fill('After retry');
  await finish(page);
  const result = await page.evaluate(async () => ({ docs:(await _bookshelf_.call('list')).length, songs:(await _bookshelf_.call('search')).map(row => JSON.parse(row.metadata_json).title) }));
  expect(result).toEqual({ docs:1,songs:['After retry'] });
});

test('batch updates reject another score identity and roll back all preceding edits', async ({ page }) => {
  await start(page); const id = await pdf(page);
  const result = await page.evaluate(async id => {
    const otherPdf = await PDFLib.PDFDocument.create(); otherPdf.addPage([500,600]);
    const other = await _bookshelf_.import(new File([await otherPdf.save()],'Other.pdf'));
    const foreign = (await _bookshelf_.call('records',{ table:'entries',parent:'document_id',id:other.id }))[0];
    const state = await _bookshelf_.call('songState',{ id });
    const before = await _bookshelf_.call('changeIds'); let error = '';
    const entries = state.entries.map(row => ({ id:row.id,parent_id:row.parent_id,anchor:JSON.parse(row.anchor_json),metadata:{ ...JSON.parse(row.metadata_json),title:'Must roll back' } }));
    entries.push({ id:foreign.id,anchor:JSON.parse(foreign.anchor_json),metadata:{ title:'Invalid owner' } });
    try { await _bookshelf_.call('editSongs',{ documentId:id,expectedRevisionId:state.document.revision_id,
      expectedEntries:state.entries.map(row => ({ id:row.id,revision_id:row.revision_id })),displayName:'Must roll back',entries }); } catch (e) { error = e.message; }
    return { error,unchanged:JSON.stringify(before) === JSON.stringify(await _bookshelf_.call('changeIds')),
      title:JSON.parse((await _bookshelf_.call('records',{ table:'entries',parent:'document_id',id }))[0].metadata_json).title };
  },id);
  expect(result.error).toContain('another score'); expect(result.unchanged).toBe(true); expect(result.title).toBe('Original song');
});
