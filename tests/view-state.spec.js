const {test,expect}=require('@playwright/test');
test.use({viewport:{width:1280,height:900}});
test.beforeEach(async({page})=>{
 page.external=[];page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin==='http://127.0.0.1:9876'||['data:','blob:'].includes(u.protocol))return r.continue();page.external.push(u.href);return r.abort();});
});
test.afterEach(async({page})=>{expect(page.external).toEqual([]);expect(page.errors).toEqual([]);});
async function start(page,url){await page.goto(url);await page.waitForFunction(()=>!!window._viewState_);await page.evaluate(()=>_viewState_.ready);await expect(page.locator('.LibraryWindow')).toBeVisible();}
async function openScore(page){await page.evaluate(async()=>{_menu_.rings.score.cells.new.stash.pages=3;await _menu_.notify('score/new/up');});}
async function stored(page){return page.evaluate(async()=>{
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('rostrum-device-view',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 try{return await new Promise((resolve,reject)=>{const r=db.transaction('settings').objectStore('settings').get('current');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}
});}
async function chooseView(page){
 await page.evaluate(async()=>{
  const c=_menu_.rings.layout.cells.vertical;
  Object.assign(c.stash,{fit:'Height',gap:7,pgShow:2,pgSnap:1,pnShow:'On',pnBand:{axis:'L-R',place:'Over'}});
  await _menu_.notify('layout/vertical/up');
  _menu_.showPanel(_menu_.rings.layout.cells.display);
 });
 await page.getByRole('button',{name:'Expand',exact:true}).click();
 await page.evaluate(()=>{
  const s=_menu_.rings.score.cells.details.stash;s.quality=2.7;
  _score_.quality=2.7;window.dispatchEvent(new Event('change'));
  _menu_.showPanel(_menu_.rings.app.cells.screen);
 });
 const panel=page.locator('[data-tag=ScreenPanel] .Panel__elm');
 await panel.getByRole('button',{name:'Larger',exact:true}).click();
 await panel.getByRole('button',{name:'Right',exact:true}).click();
 const expected=await page.evaluate(()=>({left:_Layout_.activeLayout.elm.style.left,top:_Layout_.activeLayout.elm.style.top,fontSize:_Layout_.activeLayout.elm.style.fontSize,w:innerWidth,h:innerHeight}));
 await expect.poll(async()=>(await stored(page))?.layouts.vertical.pz).toEqual(expected);
}
for(const url of ['/pod.html','/rostrum.html']){
 test(`device View survives reload, score defaults and legacy file settings (${url})`,async({page})=>{
  await start(page,url);await openScore(page);
  // Export before changing View: reopening this file must not overwrite local preferences.
  const legacy=await page.evaluate(async()=>Array.from(new Uint8Array(await _score_.toFile())));
  await chooseView(page);const saved=await stored(page);
  expect(saved).toMatchObject({active:'vertical',display:{pgFit:'Expand',quality:2.7},layouts:{vertical:{fit:'Height',gap:7,pgShow:2,pnBand:{axis:'L-R',place:'Over'}}}});
  await page.reload();await page.waitForFunction(()=>!!window._viewState_);await page.evaluate(()=>_viewState_.ready);await expect(page.locator('.LibraryWindow')).toBeVisible();
  await page.evaluate(async bytes=>{await new _Score_().init(null,null,'legacy.pdf',new Uint8Array(bytes));},legacy);
  const restored=await page.evaluate(()=>({active:_Layout_.activeLayout.cell.key,fit:_score_.details.pgFit,quality:_score_.quality,
   gap:_menu_.rings.layout.cells.vertical.stash.gap,pz:{fontSize:_Layout_.activeLayout.elm.style.fontSize,left:_Layout_.activeLayout.elm.style.left,top:_Layout_.activeLayout.elm.style.top}}));
  expect(restored).toMatchObject({active:'vertical',fit:'Expand',quality:2.7,gap:7,pz:{fontSize:saved.layouts.vertical.pz.fontSize,left:saved.layouts.vertical.pz.left,top:saved.layouts.vertical.pz.top}});
  // Restoring an already remembered view must replace the intermediate autosave.
  await page.evaluate(()=>_menu_.showPanel(_menu_.rings.app.cells.screen));
  const panel=page.locator('[data-tag=ScreenPanel] .Panel__elm');
  await panel.getByRole('button',{name:'Larger',exact:true}).click();
  await expect.poll(async()=>(await stored(page))?.layouts.vertical.pz?.fontSize).not.toBe(saved.layouts.vertical.pz.fontSize);
  await panel.getByRole('button',{name:'Restore size and position',exact:true}).click();
  await expect.poll(async()=>(await stored(page))?.layouts.vertical.pz).toEqual(saved.layouts.vertical.pz);
 });
 test(`View settings stay outside library sync and a fresh device starts independently (${url})`,async({page,browser})=>{
  await start(page,url);await openScore(page);
  const before=await page.evaluate(async()=>{_score_.libraryDocumentId='view-test';return(await _score_.captureLibraryState()).settings;});
  await chooseView(page);
  const after=await page.evaluate(async()=>{_menu_.showPanel(_menu_.rings.page.cells.magnify);return(await _score_.captureLibraryState()).settings;});
  expect(after.menu.layout).toBeUndefined();expect(after.quality).toBeUndefined();expect(after.menu.score.cells.details.pgFit).toBeUndefined();expect(after.menu.score.cells.details.quality).toBeUndefined();expect(after.menu.page.cells.magnify).toBeUndefined();
  expect(after).toEqual(before);
  await page.evaluate(()=>{_score_.libraryDocumentId=null;});
  const context=await browser.newContext({viewport:{width:1280,height:900}}),other=await context.newPage();
  const external=[];await context.route('**/*',r=>{if(r.request().url().startsWith('http://127.0.0.1:9876/'))return r.continue();external.push(r.request().url());return r.abort();});
  try{await other.goto('http://127.0.0.1:9876'+url);await other.waitForFunction(()=>!!window._viewState_);await other.evaluate(()=>_viewState_.ready);expect(await other.evaluate(()=>_menu_.rings.layout.stash.active)).toBe('book');expect(external).toEqual([]);}finally{await context.close();}
 });
 test(`different viewport keeps preferences but refits absolute pan and zoom (${url})`,async({page})=>{
  await start(page,url);await openScore(page);await chooseView(page);
  await page.setViewportSize({width:900,height:700});await page.reload();await page.waitForFunction(()=>!!window._viewState_);await page.evaluate(()=>_viewState_.ready);await openScore(page);
  expect(await page.evaluate(()=>({layout:_Layout_.activeLayout.cell.key,font:_Layout_.activeLayout.elm.style.fontSize,quality:_score_.quality}))).toEqual({layout:'vertical',font:'1em',quality:2.7});
 });
 test(`the last keyboard adjustment persists on immediate reload (${url})`,async({page})=>{
  await start(page,url);await openScore(page);await page.evaluate(()=>_menu_.showPanel(_menu_.rings.app.cells.screen));
  const p=page.locator('[data-tag=ScreenPanel] .Panel__elm');await p.getByRole('button',{name:'Larger',exact:true}).focus();await page.keyboard.press('Enter');
  await page.reload();await page.waitForFunction(()=>!!window._viewState_);await page.evaluate(()=>_viewState_.ready);await openScore(page);
  expect(await page.evaluate(()=>_Layout_.activeLayout.elm.style.fontSize)).toBe('1.1em');
 });
 test(`circular-menu adjustments survive while startup keeps the library visible (${url})`,async({page})=>{
  await start(page,url);await openScore(page);await page.evaluate(()=>_menu_.showPanel(_menu_.rings.app.cells.screen));
  const p=page.locator('[data-tag=ScreenPanel] .Panel__elm');await p.getByRole('combobox',{name:'Adjust item'}).selectOption({label:'Circular menu'});
  await p.getByRole('button',{name:'Smaller',exact:true}).click();await p.getByRole('button',{name:'Left',exact:true}).click();
  const expected=await page.evaluate(()=>({fontSize:_menu_.elm.style.fontSize,left:_menu_.elm.style.left,top:_menu_.elm.style.top,w:innerWidth,h:innerHeight}));
  await expect.poll(async()=>(await stored(page))?.menu).toEqual(expected);
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('rostrum-device-view-pending'))).toBe(null);
  await page.reload();await page.waitForFunction(()=>!!window._viewState_);await page.evaluate(()=>_viewState_.ready);await expect(page.locator('.LibraryWindow')).toBeVisible();
  expect(await page.evaluate(()=>_menu_.elm.style.fontSize)).toBe(expected.fontSize);
  await openScore(page);expect(await page.evaluate(()=>({fontSize:_menu_.elm.style.fontSize,left:_menu_.elm.style.left,top:_menu_.elm.style.top,w:innerWidth,h:innerHeight}))).toEqual(expected);
 });
 test(`Restore also clears autosaved adjustments when the initial view was fitted (${url})`,async({page})=>{
  await start(page,url);await openScore(page);await page.evaluate(()=>_menu_.showPanel(_menu_.rings.app.cells.screen));
  const p=page.locator('[data-tag=ScreenPanel] .Panel__elm');await p.getByRole('button',{name:'Larger',exact:true}).click();
  await expect.poll(async()=>!!(await stored(page))?.layouts.book.pz).toBe(true);
  await p.getByRole('combobox',{name:'Adjust item'}).selectOption({label:'Circular menu'});await p.getByRole('button',{name:'Larger',exact:true}).click();
  await expect.poll(async()=>!!(await stored(page))?.menu).toBe(true);
  await p.getByRole('combobox',{name:'Adjust item'}).selectOption({label:'All visible items'});await p.getByRole('button',{name:'Restore size and position',exact:true}).click();
  await expect.poll(async()=>{const s=await stored(page);return {pz:s?.layouts.book.pz,menu:s?.menu};}).toEqual({pz:null,menu:null});
 });
}
test('invalid or future device data is ignored without breaking score loading',async({page})=>{
 await page.goto('/device-view-seed');
 await page.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('rostrum-device-view',1);r.onupgradeneeded=()=>r.result.createObjectStore('settings');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});await new Promise((resolve,reject)=>{const tx=db.transaction('settings','readwrite');tx.objectStore('settings').put({version:99,active:'broken',layouts:{book:{pz:{fontSize:'999999em'}}}},'current');tx.oncomplete=resolve;tx.onerror=reject;});db.close();});
 await start(page,'/pod.html');await openScore(page);expect(await page.evaluate(()=>_Layout_.activeLayout.cell.key)).toBe('book');
});
test('unavailable device storage does not prevent opening and using a score',async({page})=>{
 await page.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,...args){if(name==='rostrum-device-view')throw new DOMException('Storage unavailable','SecurityError');return open.call(this,name,...args);};});
 await start(page,'/pod.html');await openScore(page);await page.evaluate(()=>_menu_.notify('layout/vertical/up'));expect(await page.evaluate(()=>_Layout_.activeLayout.cell.key)).toBe('vertical');
});
