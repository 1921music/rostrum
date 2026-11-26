const { test, expect } = require('@playwright/test');
const { mockEmptyOpenBook } = require('./library-ui-helpers');

test.beforeEach(async ({ page }) => {
  page.external = []; page.errors = [];
  page.on('pageerror', error => page.errors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://127.0.0.1:9876' || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
    page.external.push(url.href); return route.abort();
  });
  await mockEmptyOpenBook(page);
});
test.afterEach(async ({ page }) => { expect(page.external).toEqual([]); expect(page.errors).toEqual([]); });
const surface = page => page.locator('.LibraryWindow');
async function start(page, url = '/pod.html') {
  await page.goto(url);
  await expect(surface(page)).toBeVisible();
  await expect(page.getByText('No scores found', { exact:true })).toBeVisible();
}
async function importScores(page, count = 3) {
  await page.evaluate(async count => {
    for (let i = 1; i <= count; i++) {
      const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300,400]); pdf.setTitle('Study ' + i);
      await _bookshelf_.import(new File([await pdf.save()], `Study ${String(i).padStart(2,'0')}.pdf`));
    }
    await _panels_.library.view.refresh();
  }, count);
}
for (const url of ['/pod.html','/rostrum.html']) {
  test(`library owns the viewport and typography independently of the circular menu (${url})`, async ({ page }) => {
    await page.setViewportSize({ width:1280,height:800 }); await start(page,url);
    await expect(surface(page)).toHaveAttribute('data-full','true');
    const before = await page.locator('.LibraryWindow__panel').evaluate(elm => ({ font:getComputedStyle(elm).fontSize, box:elm.getBoundingClientRect().toJSON() }));
    expect(before.box).toMatchObject({ x:0,y:0,width:1280,height:800 });
    await page.evaluate(() => { _menu_.elm.style.fontSize = '4em'; });
    expect(await page.locator('.LibraryWindow__panel').evaluate(elm => getComputedStyle(elm).fontSize)).toBe(before.font);
    await expect(page.getByRole('navigation',{name:'Library categories'})).toBeVisible();
    await page.getByRole('button',{name:'Songs',exact:true}).click();
    await expect(page.locator('.Bookshelf__heading h2')).toHaveText('Songs');
    await expect(page.getByRole('button',{name:'Songs',exact:true})).toHaveAttribute('aria-pressed','true');
  });

  test(`selection opens a detail view; reading opens a side panel that can expand without losing state (${url})`, async ({ page }) => {
    await page.setViewportSize({ width:1440,height:900 }); await start(page,url); await importScores(page);
    await page.getByRole('button',{name:'Study 01.pdf',exact:true}).click();
    await expect(page.getByRole('complementary',{name:'Score details'})).toBeVisible();
    expect(await page.evaluate(() => !!window._score_)).toBe(false);
    await expect(page.getByRole('complementary',{name:'Score details'}).getByLabel('Score name',{exact:true})).not.toBeVisible();
    await page.getByRole('complementary',{name:'Score details'}).getByLabel('Edit and organize',{exact:true}).click();
    await expect(page.getByRole('complementary',{name:'Score details'}).getByLabel('Score name',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Open score',exact:true}).click();
    await expect.poll(() => page.evaluate(() => _score_?.name)).toBe('Study 01.pdf');
    await expect(surface(page)).not.toBeVisible();
    await page.evaluate(() => _menu_.showLibrary());
    await expect(surface(page)).toHaveAttribute('data-full','false');
    expect(await page.locator('.LibraryWindow__panel').evaluate(elm => elm.getBoundingClientRect().width)).toBe(460);
    await page.getByLabel('Search songs',{exact:true}).fill('Study 02');
    await expect(page.getByRole('button',{name:'Study 01.pdf',exact:true})).toHaveCount(0);
    await page.getByLabel('Edit and organize',{exact:true}).click();
    const selected = await page.evaluate(() => { window.libraryBeforeExpand = _panels_.library; return _panels_.library.view.selectedRecord; });
    await page.getByRole('button',{name:'Expand library',exact:true}).click();
    await expect(surface(page)).toHaveAttribute('data-full','true');
    await expect(page.getByLabel('Search songs',{exact:true})).toHaveValue('Study 02');
    expect(await page.evaluate(() => _panels_.library === libraryBeforeExpand)).toBe(true);
    expect(await page.evaluate(() => _panels_.library.view.selectedRecord)).toBe(selected);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('complementary',{name:'Score details'})).not.toBeVisible();
    await page.keyboard.press('Escape');
    await expect(surface(page)).not.toBeVisible();
    expect(await page.evaluate(() => _score_.name)).toBe('Study 01.pdf');
  });
}

test('native wheel scrolling works inside the library and full-screen focus stays inside it', async ({ page }) => {
  await page.setViewportSize({ width:1200,height:650 }); await start(page); await importScores(page,18);
  const results = page.locator('.Bookshelf__results');
  await results.hover(); await page.mouse.wheel(0,650);
  await expect.poll(() => results.evaluate(elm => elm.scrollTop)).toBeGreaterThan(100);
  await page.locator('.LibraryWindow__panel').focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button',{name:'Sync library now',exact:true})).toBeDisabled();
  await expect(results.getByLabel('Edit and organize',{exact:true}).last()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Add scores',{exact:true})).toBeFocused();
  await page.locator('summary[aria-label="Library settings"]').click();
  await expect(page.getByRole('button',{name:'Back to library',exact:false})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('summary[aria-label="Library settings"]')).toBeFocused();
  await expect(surface(page)).toBeVisible();
});

test('narrow library and settings fit the screen with standard-sized controls', async ({ page }) => {
  await page.setViewportSize({ width:390,height:844 }); await start(page); await importScores(page);
  await expect(page.getByLabel('Library view',{exact:true})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Library categories'})).not.toBeVisible();
  await page.getByLabel('Edit and organize',{exact:true}).first().click();
  await expect(page.getByRole('complementary',{name:'Score details'}).getByLabel('Score name',{exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('summary[aria-label="Library settings"]').click();
  await page.getByText('Cloud sync',{exact:true}).click();
  await expect(page.getByLabel('Library cloud service',{exact:true})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  expect(await page.getByLabel('Library cloud service',{exact:true}).evaluate(elm => elm.getBoundingClientRect().right)).toBeLessThanOrEqual(390);
  await page.screenshot({path:test.info().outputPath('library-settings-mobile.png')});
});

test('Add opens an on-screen menu and the native file chooser on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width:390,height:844 }); await start(page);
  await page.getByLabel('Add scores',{exact:true}).click();
  const choose = page.getByRole('button',{name:'Choose files…',exact:true});
  const box = await page.locator('.Bookshelf__add-content').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(390);
  const bytes = await page.evaluate(async () => { const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300,400]); return [...await pdf.save()]; });
  const picking = page.waitForEvent('filechooser'); await choose.click();
  const chooser=await picking;expect(chooser.isMultiple()).toBe(true);
  await chooser.setFiles({name:'Picked.pdf',mimeType:'application/pdf',buffer:Buffer.from(bytes)});
  const review = page.getByRole('dialog',{name:'Review score import'});
  await expect(review).toBeVisible();
  await review.getByRole('button',{name:'Cancel import',exact:true}).click();
  await expect(choose).not.toBeVisible();
});


for (const [url,width] of [['/pod.html',1280],['/rostrum.html',390]]) test(`library category is a device preference across ring-menu reopen and reload (${url})`,async({page,context})=>{
 await page.setViewportSize({width,height:844});await start(page,url);
 const {selectLibraryView}=require('./library-ui-helpers');
 for(const [value,title] of [['entries','Songs'],['tags','Tags'],['playlists','Playlists'],['bookshelves','Bookshelves'],['documents','All scores']]){
  await selectLibraryView(page,value);
  await expect(page.locator('.Bookshelf__heading h2')).toHaveText(title);
  await page.getByRole('button',{name:'Close library',exact:true}).click();
  await page.evaluate(()=>_menu_.showLibrary());
  await expect(page.locator('.Bookshelf__heading h2')).toHaveText(title);
  await page.reload();await expect(surface(page)).toBeVisible();
  await expect(page.getByLabel('Library view',{exact:true})).toHaveValue(value);
  await expect(page.locator('.Bookshelf__heading h2')).toHaveText(title);
 }
 // Another browser storage context has its own default category.
 const other=await context.browser().newContext();
 try {
  await other.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.origin==='http://127.0.0.1:9876'||['blob:','data:'].includes(url.protocol))return route.continue();
   throw new Error('Unexpected external network access: '+url.href);
  });
  await selectLibraryView(page,'tags');
  const tab=await other.newPage();await tab.goto('http://127.0.0.1:9876/pod.html');
  await expect(tab.getByLabel('Library view',{exact:true})).toHaveValue('documents');
 } finally {await other.close();}
});


for (const [url,width] of [['/pod.html',1280],['/rostrum.html',390]]) test(`library search restores results on reopen and reload, including a cleared query (${url})`,async({page})=>{
 await page.setViewportSize({width,height:844});await start(page,url);await importScores(page,3);
 const {selectLibraryView}=require('./library-ui-helpers');await selectLibraryView(page,'entries');
 const search=page.getByRole('searchbox',{name:'Search songs',exact:true});
 const rows=page.locator('.Bookshelf__row');
 await search.fill('Study 2');await expect(rows).toHaveCount(1);
 await expect(rows).toContainText('Study 2');
 await page.getByRole('button',{name:'Close library',exact:true}).click();
 await page.evaluate(()=>_menu_.showLibrary());
 await expect(search).toHaveValue('Study 2');await expect(rows).toHaveCount(1);await expect(rows).toContainText('Study 2');
 await page.reload();await expect(surface(page)).toBeVisible();
 await expect(page.getByLabel('Library view',{exact:true})).toHaveValue('entries');
 await expect(search).toHaveValue('Study 2');await expect(rows).toHaveCount(1);await expect(rows).toContainText('Study 2');
 await search.fill('');await expect(rows).toHaveCount(3);
 await page.reload();await expect(surface(page)).toBeVisible();
 await expect(search).toHaveValue('');await expect(rows).toHaveCount(3);
});


test('library mutations clear the saved search, while refresh and file status do not',async({page})=>{
 await start(page);await importScores(page,3);
 const {selectLibraryView}=require('./library-ui-helpers');await selectLibraryView(page,'entries');
 const search=page.getByRole('searchbox',{name:'Search songs',exact:true}),rows=page.locator('.Bookshelf__row');
 await search.fill('Study 2');await expect(rows).toHaveCount(1);
 await page.evaluate(async()=>{await _bookshelf_.availability();await _panels_.library.view.refresh();});
 await expect(search).toHaveValue('Study 2');await expect(rows).toHaveCount(1);
 await page.evaluate(async()=>{
  const row=(await _bookshelf_.records('entries')).find(row=>JSON.parse(row.metadata_json).title==='Study 2');
  await _bookshelf_.rename('entries',row,'New title');
 });
 await expect(search).toHaveValue('');await expect(rows).toHaveCount(3);
 await page.reload();await expect(search).toHaveValue('');await expect(rows).toHaveCount(3);
 await search.fill('Study 1');await expect(rows).toHaveCount(1);
 await page.getByRole('button',{name:'Close library',exact:true}).click();
 await page.evaluate(async()=>{
  const row=(await _bookshelf_.records('entries'))[0];await _bookshelf_.rename('entries',row,'Changed while closed');
 });
 await page.evaluate(()=>_menu_.showLibrary());
 await expect(search).toHaveValue('');await expect(rows).toHaveCount(3);
 await page.reload();await expect(search).toHaveValue('');await expect(rows).toHaveCount(3);
});

test('opening a score or song from Library parks the expanded ring menu', async ({ page }) => {
  await page.setViewportSize({ width:390, height:844 });
  await start(page, '/rostrum.html');
  await importScores(page, 1);
  const { selectLibraryView } = require('./library-ui-helpers');
  await page.evaluate(async () => {
    const playlist = await _bookshelf_.createCollection('playlists', 'Set list');
    const [song] = await _bookshelf_.records('entries');
    await _bookshelf_.addToCollection('entries', song.id, playlist.id);
  });

  for (const [view, title] of [['documents', 'Study 01.pdf'], ['entries', 'Study 1'], ['playlists', 'Study 1']]) {
    await page.evaluate(() => { _menu_.center(); _menu_.showLibrary(); });
    expect(await page.evaluate(() => _menu_.collapsed)).toBe(false);
    await selectLibraryView(page, view);
    if (view === 'playlists') await page.getByLabel('Collection', { exact:true }).selectOption({ label:'Set list' });
    await page.getByRole('button', { name:title, exact:true }).click();
    await page.getByRole('button', { name:'Open score', exact:true }).click();
    await expect(surface(page)).toBeHidden();
    await expect.poll(() => page.evaluate(() => {
      const { left, top } = _menu_.elm.getBoundingClientRect();
      return { collapsed:_menu_.collapsed, left, top };
    })).toEqual({ collapsed:true, left:0, top:0 });
  }
});

test('All scores searches use cached status and update existing rows after a library change',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await start(page); await importScores(page,3);
 const {selectLibraryView}=require('./library-ui-helpers');
 await selectLibraryView(page,'documents');
 const search=page.getByPlaceholder('Search scores',{exact:true});
 const rows=page.locator('.Bookshelf__row');
 await expect(rows).toHaveCount(3);
 await expect(rows.first().getByLabel('Local file status')).toContainText('On this device');
 await page.evaluate(async()=>{
  const state=await _bookshelf_.availability();
  const original=_bookshelf_.availability;
  window.stateChecks=0; window.referenceReads=0;
  _bookshelf_.availability=()=>new Promise(resolve=>{
   window.stateChecks++;
   window.completeStateCheck=()=> {
    _bookshelf_.availability=original;
    resolve(new Map([...state].map(([id,file])=>[id,{...file,pinned:true}])));
   };
  });
  const records=_bookshelf_.records.bind(_bookshelf_);
  _bookshelf_.records=(...args)=>{window.referenceReads++; return records(...args);};
 });
 await search.fill('Study 02');
 await expect(rows).toHaveCount(1);
 await expect(rows.first().getByLabel('Local file status')).toContainText('On this device');
 expect(await page.evaluate(()=>[stateChecks,referenceReads])).toEqual([0,0]);
 await page.evaluate(()=>_bookshelf_.notifyData());
 await expect.poll(()=>page.evaluate(()=>stateChecks)).toBe(1);
 await search.fill('Study 03');
 await expect(rows).toHaveCount(1);
 await expect(rows.first()).toContainText('Study 03');
 await expect(rows.first().getByLabel('Local file status')).not.toContainText('Kept offline');
 await page.evaluate(()=>{
  window.searchRow=document.querySelector('.Bookshelf__row');
  completeStateCheck();
 });
 await expect(rows.first().getByLabel('Local file status')).toContainText('Kept offline');
 expect(await page.evaluate(()=>[stateChecks,referenceReads,searchRow===document.querySelector('.Bookshelf__row')])).toEqual([1,0,true]);
});
