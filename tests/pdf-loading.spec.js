const {test,expect} = require('@playwright/test');
const {installDeltaCloud} = require('./library-sync-helpers');

test.beforeEach(async ({page}) => {
  page.external = [];
  page.errors = [];
  page.on('pageerror', error => page.errors.push(error.message));
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:9876/')) return route.continue();
    if (url === 'https://accounts.google.com/gsi/client') {
      return route.fulfill({contentType:'application/javascript',body:'window.google={accounts:{oauth2:{}}};'});
    }
    page.external.push(url);
    return route.abort();
  });
  await page.goto('/pod.html');
  await page.waitForFunction(() => window._viewState_ && window._FileSrc_ && window.PDFLib);
  await page.evaluate(() => _viewState_.ready);
});

test.afterEach(({page}) => {
  expect(page.external).toEqual([]);
  expect(page.errors).toEqual([]);
});

async function createPdf(page) {
  return await page.evaluate(async () => {
    const doc = await PDFLib.PDFDocument.create();
    for (let i=0; i<5; i++) {
      doc.addPage([300,400]).drawText('Page ' + (i+1));
      doc.context.register(doc.context.stream(new Uint8Array(300 * 1024)));
    }
    return [...await doc.save({useObjectStreams:false})];
  });
}

test('cloud Open and Recent use the device page and apply per-service loading settings', async ({page}) => {
  const bytes = Buffer.from(await createPdf(page));
  const requests = [];
  await page.route('https://www.googleapis.com/drive/v3/files/pdf-id?*', route => {
    const range = route.request().headers().range;
    requests.push(range || null);
    if (!range) return route.fulfill({contentType:'application/pdf',body:bytes});
    const [,begin,end] = range.match(/^bytes=(\d+)-(\d+)$/).map(Number);
    return route.fulfill({status:206,contentType:'application/pdf',body:bytes.subarray(begin,end+1),
      headers:{'Content-Range':`bytes ${begin}-${end}/${bytes.length}`,ETag:'"pdf-version"',
        'Access-Control-Expose-Headers':'Content-Range, ETag'}});
  });
  const setupDrive = () => page.evaluate(size => {
    _panels_.library?.close();
    const drive = _FileSrc_.get('Drive');
    drive.tokens = {access_token:'test'};
    drive.auth = async () => {};
    drive.getDir = async () => ({id:'root',dirs:{},files:{
      'Resume.pdf':{name:'Resume.pdf',id:'pdf-id',size},
    }});
  },bytes.length);
  const open = async (tab, expectedPage) => {
    await page.evaluate(() => _menu_.notify('score/open/up'));
    const panel = page.locator('[data-tag="OpenPanel"]');
    await panel.getByText(tab,{exact:true}).click();
    await panel.locator('.Flv-list__file[data-name="Resume.pdf"]').click();
    await page.getByRole('button',{name:'View only',exact:true}).click();
    await expect.poll(() => page.evaluate(pn => _score_.numbers.pn === pn &&
      !!_score_.pgs[pn-1].mozCanvas && !_score_.pgs[pn-1].renderTask,expectedPage)).toBe(true);
  };
  const settings = async () => {
    await page.evaluate(() => _menu_.notify('app/pdfLoading/up'));
    return page.locator('[data-tag="PdfLoadingPanel"]');
  };
  await setupDrive();
  const first = await settings();
  await expect(first.getByLabel('Open at the last-read page')).toBeChecked();
  await expect(first.getByLabel('Local PDF loading',{exact:true})).toHaveValue('whole');
  await expect(first.getByLabel('Cloud default PDF read size',{exact:true})).toHaveValue('256');
  await first.getByLabel('Google Drive PDF loading',{exact:true}).selectOption('page');
  await first.getByLabel('Google Drive PDF read size',{exact:true}).selectOption('128');
  await page.evaluate(() => {_panels_.pdfLoading.close();});
  await open('Drive',1);
  expect(requests[0]).toBe('bytes=0-131071');
  expect(await page.evaluate(() => _score_.mozDoc.rostrumPageFirst)).toBe(true);
  await page.evaluate(() => _Layout_.activeLayout.pgGoTo(4,false));
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.recent).find(row => row.fileId==='pdf-id')?.pageIndex)).toBe(3);

  await page.reload();
  await page.waitForFunction(() => !!window._FileSrc_ && !!window._viewState_);
  await page.evaluate(() => _viewState_.ready);
  await setupDrive();
  await open('Drive',4);
  await open('Recent',4);
  const second = await settings();
  await expect(second.getByLabel('Google Drive PDF read size',{exact:true})).toHaveValue('128');
  await second.getByLabel('Open at the last-read page').uncheck();
  await second.getByLabel('Google Drive PDF loading',{exact:true}).selectOption('whole');
  await page.evaluate(() => {_panels_.pdfLoading.close();});
  await open('Recent',1);
  expect(requests.at(-1)).toBeNull();
});

for (const [layout,resumePage] of [['book',true],['table',false]]) test(
  `a cloud-only library song starts at its anchor and caches after rendering (${layout})`, async ({page}) => {
  await installDeltaCloud(page);
  const bytes = await createPdf(page);
  const id = await page.evaluate(async ({raw,layout,resumePage}) => {
    const bytes = new Uint8Array(raw);
    await _bookshelf_.configure({kind:'indexeddb',name:'pdf-source'});
    const doc = await _bookshelf_.import(new File([bytes],'Remote.pdf'));
    await _bookshelf_.sync(deltaCloud.transport);
    await _bookshelf_.configure({kind:'indexeddb',name:'pdf-destination'});
    await _bookshelf_.sync(deltaCloud.transport);
    const {PdfRangeSource} = await import('/pdf-loading.js');
    deltaCloud.transport.source = {source:'Drive'};
    deltaCloud.transport.readScoreRange = () => PdfRangeSource.local(new Blob([bytes]),256);
    window.cacheStartedAfterPaint = false;
    const fromDocument = _bookshelf_.scores.readRemotePdf;
    _bookshelf_.scores.readRemotePdf = score => {
      window.cacheStartedAfterPaint = !!score.pgs[3].mozCanvas && !score.pgs[3].renderTask;
      return fromDocument(score);
    };
    _viewState_.pdfLoading.resumePage = resumePage;
    _menu_.rings.layout.stash.active = layout;
    await _viewState_.save();
    await _bookshelf_.openDocument(doc.id,{type:'pdf',pageIndex:3});
    return doc.id;
  },{raw:bytes,layout,resumePage});
  await expect.poll(() => page.evaluate(() => Number(_score_.numbers.pn))).toBe(4);
  await expect.poll(() => page.evaluate(async id => !!(await _bookshelf_.call('fileInfo',{id})).file,id)).toBe(true);
  expect(await page.evaluate(() => window.cacheStartedAfterPaint)).toBe(true);
  expect(await page.evaluate(() => deltaCloud.calls.filter(call=>call.kind==='readScore'))).toEqual([]);
});
