const {test,expect}=require('@playwright/test');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
test.beforeEach(async({page})=>{
 page.external=[];await page.route('**/*',route=>{
  const u=route.request().url();if(u.startsWith('http://127.0.0.1:9876/')||u.startsWith(pathToFileURL(path.resolve('build')).href+'/')||u.startsWith('data:')||u.startsWith('blob:'))return route.continue();
  page.external.push(u);return route.abort();
 });
});
test.afterEach(async({page})=>expect(page.external).toEqual([]));
async function start(page,url='/pod.html'){
 await page.goto(url);await page.waitForFunction(()=>!!window._bookshelf_ && !!window._menu_ && !!window._panels_?.library);
 await page.evaluate(()=>_bookshelf_.setAutoSync(false));
}
async function settings(page){await page.getByLabel('Library settings',{exact:true}).click();await page.getByText('Storage location',{exact:true}).click();}
for(const kind of ['opfs','directory','indexeddb'])test(`delete managed data in active ${kind}, retain selection and keep auto-sync off`,async({page})=>{
 await start(page);
 await page.evaluate(async kind=>{
  const root=await navigator.storage.getDirectory();window.testStorageRoot=root;
  let storage={kind};
  if(kind==='directory'){window.testStorageRoot=await root.getDirectoryHandle('deletion-test',{create:true});storage.directory=testStorageRoot;}
  if(kind==='indexeddb')storage.name='deletion-test';
  await _bookshelf_.configure(storage);
  const pdf=await PDFLib.PDFDocument.create();pdf.addPage([300,400]);await _bookshelf_.import(new File([await pdf.save()],'Owned.pdf'));
  if(kind!=='indexeddb'){
   const foreign=await testStorageRoot.getFileHandle('My own file.txt',{create:true});const writer=await foreign.createWritable();await writer.write('keep');await writer.close();
   const managed=await testStorageRoot.getDirectoryHandle('rostrum-library-v3');const scores=await managed.getDirectoryHandle('scores');const orphan=await scores.getFileHandle('0000000000000000000000000000000000000000000000000000000000000000',{create:true});await(await orphan.createWritable()).close();
  }
  await RostrumLibraryHost.saveCloudSelection({source:'pCloud',path:'/Saved sync'});
  await _panels_.library.view.refresh();
 },kind);
 await settings(page);
 for(const other of ['opfs','directory','indexeddb'])await expect(page.locator(`[data-storage-kind="${other}"]`).getByRole('button',{name:/Delete/}))[other===kind?'toBeEnabled':'toBeDisabled']();
 const cancelledDialog=page.waitForEvent('dialog');
 await page.locator(`[data-storage-kind="${kind}"]`).getByRole('button',{name:/Delete/}).click();
 await(await cancelledDialog).dismiss();
 expect(await page.evaluate(async()=>(await _bookshelf_.call('list')).length)).toBe(1);
 const confirmedDialog=page.waitForEvent('dialog');
 await page.locator(`[data-storage-kind="${kind}"]`).getByRole('button',{name:/Delete/}).click();
 const confirmation=await confirmedDialog;expect(confirmation.message()).toContain('cloud sync is not configured');await confirmation.accept();
 await expect(page.locator('.Bookshelf__message')).toContainText('Automatic restore is off');
 expect(await page.evaluate(()=>_bookshelf_.storage?.kind)).toBe(kind);
 expect(await page.evaluate(()=>_bookshelf_.call('list'))).toEqual([]);
 expect(await page.evaluate(()=>RostrumLibraryHost.loadCloudSelection())).toEqual({source:'pCloud',path:'/Saved sync'});
 const physical=await page.evaluate(async kind=>{
  if(kind==='indexeddb')return new Promise((resolve,reject)=>{const r=indexedDB.open('deletion-test');r.onsuccess=()=>{const db=r.result;const t=db.transaction('files');const q=t.objectStore('files').count();t.oncomplete=()=>{resolve(q.result);db.close();};};r.onerror=()=>reject(r.error);});
  const names=[],managed=await testStorageRoot.getDirectoryHandle('rostrum-library-v3');try{const scores=await managed.getDirectoryHandle('scores');for await(const name of scores.keys())names.push(name);}catch(e){if(e.name!=='NotFoundError')throw e;}
  const keep=await(await testStorageRoot.getFileHandle('My own file.txt')).getFile();
  let database=false;try{kind==='opfs'?await managed.getDirectoryHandle('.rostrum-library-db'):await managed.getFileHandle('library.sqlite');database=true;}catch(e){if(e.name!=='NotFoundError')throw e;}
  return{names,keep:await keep.text(),database};
 },kind);
 expect(physical).toEqual(kind==='indexeddb'?1:{names:[],keep:'keep',database:true});
 await page.reload();await expect.poll(()=>page.evaluate(()=>_bookshelf_.storage?.kind)).toBe(kind);
 await settings(page);
 await page.getByRole('button',{name:'Use IndexedDB',exact:true}).click();await expect.poll(()=>page.evaluate(()=>_bookshelf_.storage?.kind)).toBe('indexeddb');
 expect(await page.evaluate(()=>_bookshelf_.call('list'))).toEqual([]);
});
test('standalone disables OPFS, retains IndexedDB and supports deletion through host bridge',async({page})=>{
 await start(page,pathToFileURL(path.resolve('build/rostrum.html')).href);
 await page.evaluate(()=>_bookshelf_.configure({kind:'indexeddb',name:'standalone-delete'}));
 await settings(page);await expect(page.getByRole('button',{name:'Use OPFS',exact:true})).toBeDisabled();
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Delete IndexedDB library data',exact:true}).click();
 await expect(page.locator('.Bookshelf__message')).toContainText('Automatic restore is off');
 expect(await page.evaluate(()=>_bookshelf_.storage?.kind)).toBe('indexeddb');
});
test('library text can be selected and selecting a path does not open the row',async({page})=>{
 await start(page);await page.evaluate(async()=>{
  const pdf=await PDFLib.PDFDocument.create();pdf.addPage([300,400]);await _bookshelf_.import(new File([await pdf.save()],'Copy me.pdf'));await _panels_.library.view.refresh();
 });
 const label=page.getByLabel('Score file location',{exact:true});
 await expect(async()=>{
  expect(await label.evaluate(el=>getComputedStyle(el).userSelect)).toBe('text');
  const selected=await label.evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);getSelection().removeAllRanges();getSelection().addRange(range);if(getSelection().toString())el.click();return getSelection().toString();});
  expect(selected).toBe('Copy me.pdf');expect(await page.evaluate(()=>getSelection().toString())).toBe('Copy me.pdf');
 }).toPass({timeout:5000});
 await expect(page.getByRole('complementary',{name:'Score details'})).not.toBeVisible();
 expect(await label.evaluate(el=>el.dispatchEvent(new PointerEvent('contextmenu',{pointerType:'touch',bubbles:true,cancelable:true})))).toBe(true);
 await settings(page);expect(await page.getByText('A folder you choose on this device.',{exact:true}).evaluate(el=>getComputedStyle(el).userSelect)).toBe('text');
});
test('a failed delete unlocks the UI and requires explicit storage reopen',async({page})=>{
 await start(page);await page.evaluate(async()=>{
  await _bookshelf_.configure({kind:'indexeddb'});
  const pdf=await PDFLib.PDFDocument.create();pdf.addPage([300,400]);await _bookshelf_.import(new File([await pdf.save()],'Keep after failure.pdf'));await _panels_.library.view.refresh();
 });
 await page.evaluate(()=>{
  const worker=_bookshelf_.worker,post=worker.postMessage;
  worker.postMessage=function(message){
   if(message.action!=='destroyStorage')return post.call(this,message);
   queueMicrotask(()=>worker.dispatchEvent(new MessageEvent('message',{data:{id:message.id,error:'Deletion failed',errorName:'Error'}})));
  };
 });
 await settings(page);page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Delete IndexedDB library data',exact:true}).click();
 await expect(page.locator('.Bookshelf__message')).toContainText('Deletion failed');
 await expect(page.getByRole('button',{name:'Use IndexedDB',exact:true})).toBeEnabled();
 expect(await page.evaluate(()=>_bookshelf_.deletingStorage)).toBe(false);
 await page.getByRole('button',{name:'Use IndexedDB',exact:true}).click();
 expect(await page.evaluate(async()=>(await _bookshelf_.call('list')).length)).toBe(1);
});
test('directory deletion refuses a database replaced outside this session',async({page})=>{
 await start(page);
 const result=await page.evaluate(async()=>{
  const root=await(await navigator.storage.getDirectory()).getDirectoryHandle('external-delete',{create:true});
  await _bookshelf_.configure({kind:'directory',directory:root});
  const handle=await(await root.getDirectoryHandle('rostrum-library-v3')).getFileHandle('library.sqlite'),writer=await handle.createWritable();await writer.write('external database');await writer.close();
  let error='';try{await _bookshelf_.deleteStorage();}catch(e){error=e.message;}
  return {error,contents:await(await handle.getFile()).text()};
 });
 expect(result.error).toContain('changed outside this session');expect(result.contents).toBe('external database');
});
