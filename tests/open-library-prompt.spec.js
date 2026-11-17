const {test,expect} = require('@playwright/test');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
const fs = require('node:fs');

test.beforeEach(async ({page}) => {
  page.external = []; page.errors = [];
  page.on('pageerror',error => page.errors.push(error.message));
  await page.context().route('**/*',route => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:9876/') || url.startsWith(pathToFileURL(path.resolve('build')).href + '/')) return route.continue();
    if (url === 'https://accounts.google.com/gsi/client') return route.fulfill({contentType:'application/javascript',body:'window.google={accounts:{oauth2:{}}};'});
    page.external.push(url); return route.abort();
  });
});
test.afterEach(async ({page}) => {expect(page.external).toEqual([]);expect(page.errors).toEqual([]);});
const prompt = page => page.getByRole('dialog',{name:'Import opened score to Library',exact:true});
const review = page => page.getByRole('dialog',{name:'Review score import',exact:true});
async function start(page,url='/pod.html') {
  await page.goto(url);
  await page.waitForFunction(() => window._bookshelf_ && window._menu_ && window._localFs_);
  if (url.startsWith('file:')) await page.evaluate(() => _bookshelf_.configure({kind:'indexeddb'}));
  await page.evaluate(() => {_panels_.library?.close();_FileSrc_.get('Local').nativeUnavailable = true;});
}
async function pdf(page) {
  return Buffer.from(await page.evaluate(async () => {
    const doc = await PDFLib.PDFDocument.create();
    doc.addPage([300,400]).drawText('Original file'); doc.addPage([500,600]);
    return [...await doc.save()];
  }));
}
async function openLocal(page,bytes,name='Opened.pdf') {
  await page.evaluate(() => _menu_.notify('score/open/up'));
  const panel = page.locator('[data-tag="OpenPanel"]');
  await panel.getByText('Local',{exact:true}).click();
  const choosing = page.waitForEvent('filechooser');
  await panel.locator('.Local').click();
  await (await choosing).setFiles({name,mimeType:'application/octet-stream',buffer:bytes});
  await expect(prompt(page)).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!_score_?.pgs[0].inflated)).toBe(true);
}
for (const url of ['/pod.html','/rostrum.html',pathToFileURL(path.resolve('build/rostrum.html')).href]) {
  test(`Open offers view-only and importing the original file (${url})`,async ({page}) => {
    await start(page,url); const bytes = await pdf(page);
    await openLocal(page,bytes);
    await page.evaluate(() => {_bookshelf_.scores.preview = () => {throw new Error('Do not reparse the displayed file');};});
    await prompt(page).getByRole('button',{name:'Import to Library',exact:true}).click();
    await expect(review(page)).toBeVisible();
    await review(page).getByLabel('Song title',{exact:true}).fill('My opened song');
    await review(page).getByRole('button',{name:'Import into library',exact:true}).click();
    await expect(review(page)).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => !!_score_?.libraryDocumentId)).toBe(true);
    const result = await page.evaluate(async () => {
      const state = await _bookshelf_.call('read',{id:_score_.libraryDocumentId});
      return {bytes:[...new Uint8Array(await state.file.arrayBuffer())],
        location:JSON.parse(state.document.metadata_json).originalLocations,
        title:JSON.parse((await _bookshelf_.call('search'))[0].metadata_json).title,
        maximum:JSON.parse(state.document.settings_json)};
    });
    expect(Buffer.from(result.bytes)).toEqual(bytes);
    expect(result.location).toEqual([{source:'Local',path:null,name:'Opened.pdf'}]);
    expect(result.title).toBe('My opened song');
    expect(result.maximum).toMatchObject({maxWidth:500,maxHeight:600});
  });
}
for (const choice of ['View only','Escape','Cancel import']) {
  test(`${choice} keeps the opened file usable without library records`,async ({page}) => {
    await page.setViewportSize({width:390,height:844});
    await start(page); await openLocal(page,await pdf(page),'<Opened>.pdf');
    await expect(prompt(page).getByRole('button',{name:'View only',exact:true})).toBeFocused();
    if (choice === 'Escape') await prompt(page).press('Escape');
    else if (choice === 'View only') await prompt(page).getByRole('button',{name:choice,exact:true}).click();
    else {
      await prompt(page).getByRole('button',{name:'Import to Library',exact:true}).click();
      await review(page).getByRole('button',{name:choice,exact:true}).click();
    }
    await expect(prompt(page)).toHaveCount(0); await expect(review(page)).toHaveCount(0);
    expect(await page.evaluate(async () => ({name:_score_.name,disposed:_score_.disposed,library:!!_score_.libraryDocumentId,
      count:(await _bookshelf_.call('list')).length,rendered:!!_score_.pgs[0].mozCanvas}))).toEqual({
      name:'<Opened>.pdf',disposed:false,library:false,count:0,rendered:true});
    await page.evaluate(() => _Layout_.activeLayout.pgGoTo(2,false));
    await expect.poll(() => page.evaluate(() => _score_.numbers.pn)).toBe(2);
  });
}
test('Open can import a notation score and keep its original bytes',async ({page}) => {
  await start(page);
  const bytes = fs.readFileSync(path.resolve('tests/fixtures/anchor-score.musicxml'));
  await openLocal(page,bytes,'Opened.musicxml');
  await prompt(page).getByRole('button',{name:'Import to Library',exact:true}).click();
  await review(page).getByRole('button',{name:'Import into library',exact:true}).click();
  await expect.poll(() => page.evaluate(() => !!_score_?.libraryDocumentId && !!_score_?.music)).toBe(true);
  expect(Buffer.from(await page.evaluate(async () => [...new Uint8Array(await (await _bookshelf_.call('read',{id:_score_.libraryDocumentId})).file.arrayBuffer())]))).toEqual(bytes);
});
test('Recent can import cloud bytes once and records their original location',async ({page}) => {
  await start(page); const bytes = await pdf(page);
  await page.evaluate(bytes => {
    window.cloudReads = 0;
    const original = _FileSrc_.get;
    _FileSrc_.get = source => source === 'pCloud' ? {async getFile(path,name) {
      cloudReads++; return {path,name,data:new Uint8Array(bytes).buffer,size:bytes.length};
    }} : original.call(_FileSrc_,source);
    localStorage.setItem('recent',JSON.stringify([{source:'pCloud',path:'/Scores',name:'Cloud.pdf'}]));
    _menu_.notify('score/open/up');
  },[...bytes]);
  const panel = page.locator('[data-tag="OpenPanel"]');
  await panel.getByText('Recent',{exact:true}).click();
  await panel.locator('.Flv-list__file[data-name="Cloud.pdf"]').click();
  await expect(prompt(page)).toBeVisible();
  await prompt(page).getByRole('button',{name:'Import to Library',exact:true}).click();
  await review(page).getByRole('button',{name:'Import into library',exact:true}).click();
  await expect.poll(() => page.evaluate(() => !!_score_?.libraryDocumentId)).toBe(true);
  const result = await page.evaluate(async () => {
    const state = await _bookshelf_.call('read',{id:_score_.libraryDocumentId});
    return {reads:cloudReads,locations:JSON.parse(state.document.metadata_json).originalLocations,
      bytes:[...new Uint8Array(await state.file.arrayBuffer())]};
  });
  expect(result.reads).toBe(1);
  expect(result.locations).toEqual([{source:'pCloud',path:'/Scores',name:'Cloud.pdf'}]);
  expect(Buffer.from(result.bytes)).toEqual(bytes);
});

test('choosing import for an existing file opens its library copy without duplicates',async ({page}) => {
  await start(page); const bytes = await pdf(page);
  const id = await page.evaluate(async bytes => (await _bookshelf_.import(new File([new Uint8Array(bytes)],'Opened.pdf'))).id,[...bytes]);
  await openLocal(page,bytes);
  await prompt(page).getByRole('button',{name:'Import to Library',exact:true}).click();
  await expect.poll(() => page.evaluate(() => _score_?.libraryDocumentId)).toBe(id);
  await expect(review(page)).toHaveCount(0);
  expect(await page.evaluate(async () => (await _bookshelf_.call('list')).length)).toBe(1);
});

test('a failed import can be cancelled while the original stays open',async ({page}) => {
  await start(page); await openLocal(page,await pdf(page));
  await page.evaluate(() => {
    const call = _bookshelf_.call.bind(_bookshelf_);
    _bookshelf_.call = (action,args) => {
      if (action === 'importFile') throw new Error('Simulated import failure');
      return call(action,args);
    };
  });
  await prompt(page).getByRole('button',{name:'Import to Library',exact:true}).click();
  await review(page).getByRole('button',{name:'Import into library',exact:true}).click();
  await expect(review(page).getByRole('alert')).toHaveText('Simulated import failure');
  await review(page).getByRole('button',{name:'Cancel import',exact:true}).click();
  expect(await page.evaluate(() => ({name:_score_.name,disposed:_score_.disposed,library:!!_score_.libraryDocumentId}))).toEqual({
    name:'Opened.pdf',disposed:false,library:false});
});
