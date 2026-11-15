const {test,expect}=require('@playwright/test');
const {installDeltaCloud,installProviderCloud}=require('./library-sync-helpers');
const {selectLibraryView}=require('./library-ui-helpers');
test.beforeEach(async({page})=>{
 page.external=[];page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin==='http://127.0.0.1:9876'||['blob:','data:'].includes(u.protocol))return route.continue();page.external.push(u.href);return route.abort();});
 await page.goto('/pod.html');await page.waitForFunction(()=>!!window._menu_&&!!window._panels_?.library);
 await installDeltaCloud(page);
});
test.afterEach(async({page})=>{expect(page.external).toEqual([]);expect(page.errors).toEqual([]);});
async function seed(page,count=4){
 return page.evaluate(async count=>{
  await _bookshelf_.configure({kind:'indexeddb',name:'transfer-a'});const ids=[];
  for(let i=0;i<count;i++){const pdf=await PDFLib.PDFDocument.create();pdf.addPage([300+i,400]);ids.push((await _bookshelf_.import(new File([await pdf.save()],`Score ${i}.pdf`))).id);}
  await _bookshelf_.sync(deltaCloud.transport);
  await _bookshelf_.configure({kind:'indexeddb',name:'transfer-b'});await _bookshelf_.sync(deltaCloud.transport);window.ids=ids;await _panels_.library.view.refresh();return ids;
 },count);
}
test('queue shares requests, promotes manual and open requests, and continues after failure',async({page})=>{
 const order=await page.evaluate(async()=>{
  const {LibraryTransferQueue}=await import('/bookshelf-transfers.js');const q=new LibraryTransferQueue(),order=[];
  const first=q.enqueue('running',async()=>{order.push('running');await new Promise(r=>window.resumeQueue=r);});
  await new Promise(r=>setTimeout(r,0));
  const a=q.enqueue('a',async()=>order.push('a'));
  const b=q.enqueue('b',async()=>order.push('b'));
  const c=q.enqueue('c',async()=>order.push('c'));
  const duplicate=q.enqueue('c',async()=>order.push('duplicate'),{priority:50,front:true});
  const d=q.enqueue('open',async()=>order.push('open'),{priority:100,front:true});
  const failed=q.enqueue('failed',async()=>{throw new Error('expected');});
  const last=q.enqueue('last',async()=>order.push('last'));
  resumeQueue();await Promise.allSettled([first,a,b,c,d,failed,last]);return{order,same:duplicate===c,failed:q.failed};
 });
 expect(order).toEqual({order:['running','open','c','a','b','last'],same:true,failed:1});
});
test('full sync stays usable; list request jumps ahead and full sync excludes deleted and replaced files',async({page})=>{
 const ids=await seed(page,5);
 await page.evaluate(async()=>{
  await _bookshelf_.call('update',{table:'documents',values:{id:ids[4],deleted_at:new Date().toISOString()}});
  await _bookshelf_.call('update',{table:'documents',values:{id:ids[3],replaced_by_id:ids[0]}});
  await _bookshelf_.sync(deltaCloud.transport);
  const read=deltaCloud.transport.readScore;deltaCloud.transport.readScore=async function(doc){if(!window.firstDownload){window.firstDownload=doc.id;await new Promise(r=>window.resumeDownload=r);}return read.call(this,doc);};
  window.fullJob=_bookshelf_.syncAllScores();
 });
 await expect.poll(()=>page.evaluate(()=>!!window.resumeDownload)).toBe(true);
 await expect(page.getByLabel('Library transfer progress',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Search songs',{exact:true})).toBeEnabled();
 await expect(page.locator('.Shade')).not.toBeVisible();
 const first=await page.evaluate(()=>window.firstDownload);const promote=ids.filter(id=>id!==first&&id!==ids[3]&&id!==ids[4]).at(-1);
 const docName=await page.evaluate(async id=>JSON.parse((await _bookshelf_.call('list')).find(d=>d.id===id).metadata_json).displayName,promote);
 const row=page.locator('.Bookshelf__row').filter({has:page.getByRole('button',{name:docName,exact:true})});
 await row.getByRole('button',{name:'Download next',exact:true}).click();
 await page.evaluate(()=>resumeDownload());await page.evaluate(()=>window.fullJob);
 const reads=await page.evaluate(()=>deltaCloud.calls.filter(c=>c.kind==='readScore').map(c=>c.id));
 expect(reads).toEqual([first,promote,...ids.filter(id=>id!==first&&id!==promote&&id!==ids[3]&&id!==ids[4])]);
 const states=await page.evaluate(()=>_bookshelf_.call('availability',{destination:deltaCloud.transport.id}));
 expect(states.filter(s=>s.present).length).toBe(3);await expect(page.getByLabel('Library transfer progress',{exact:true})).toContainText('3 / 3');
});
test('full sync retries failed files',async({page})=>{
 await seed(page,3);
 await page.evaluate(async()=>{
  const read=deltaCloud.transport.readScore;deltaCloud.transport.readScore=async function(doc){if(doc.id===ids[1]&&!window.failedOnce){window.failedOnce=true;throw new Error('Temporary failure');}return read.call(this,doc);};
  await _bookshelf_.syncAllScores();
 });
 expect(await page.evaluate(()=>_bookshelf_.fullSyncState.failed)).toBe(1);
 await page.evaluate(()=>_bookshelf_.syncAllScores());expect(await page.evaluate(()=>_bookshelf_.fullSyncState.phase)).toBe('done');
 expect(await page.evaluate(async()=>(await _bookshelf_.call('availability',{destination:deltaCloud.transport.id})).every(s=>s.present))).toBe(true);
});
test('stopping bulk downloads keeps a promoted manual request and finishes the active file',async({page})=>{
 await seed(page,3);
 await page.evaluate(()=>{
  const read=deltaCloud.transport.readScore;
  deltaCloud.transport.readScore=async function(doc){if(!window.firstDownload){window.firstDownload=doc.id;await new Promise(r=>window.resumeDownload=r);}return read.call(this,doc);};
  window.fullJob=_bookshelf_.syncAllScores();
 });
 await expect.poll(()=>page.evaluate(()=>_bookshelf_.transfers.size)).toBe(3);
 await page.evaluate(()=>{
  window.promoted=ids.find(id=>id!==firstDownload);
  window.manualJob=_bookshelf_.ensureFile(promoted,undefined,{priority:50,front:true});
  _bookshelf_.cancelFullSync();resumeDownload();
 });
 await page.evaluate(()=>Promise.all([window.fullJob,window.manualJob]));
 expect(await page.evaluate(()=>_bookshelf_.fullSyncState)).toMatchObject({phase:'cancelled',completed:2,cancelled:1,failed:0});
 expect(await page.evaluate(()=>deltaCloud.calls.filter(c=>c.kind==='readScore').map(c=>c.id))).toEqual(await page.evaluate(()=>[firstDownload,promoted]));
});
test('sync buttons and exact file counts reflect pending work, with a separate status check',async({page})=>{
 await installProviderCloud(page);
 const id=await page.evaluate(async()=>{const pdf=await PDFLib.PDFDocument.create();pdf.addPage([300,400]);return(await _bookshelf_.import(new File([await pdf.save()],'Pending.pdf'))).id;});
 await page.getByLabel('Library settings',{exact:true}).click();await page.getByText('Cloud sync',{exact:true}).click();
 await page.getByLabel('Library cloud service',{exact:true}).selectOption('pCloud');
 await page.getByRole('button',{name:'Choose sync folder',exact:true}).click();
 const picker=page.getByRole('dialog',{name:'Choose library sync folder',exact:true});
 await picker.getByRole('button',{name:'My library',exact:true}).click();await picker.getByRole('button',{name:'Use this folder',exact:true}).click();
 const apply=page.getByRole('button',{name:'Apply and sync',exact:true}),all=page.getByRole('button',{name:'Sync and download all scores',exact:true}),counts=page.getByLabel('File sync counts',{exact:true});
 await page.getByRole('button',{name:'Check sync status',exact:true}).click();
 await expect(counts).toContainText('Upload pending: 1 files · Download pending: 0 files');await expect(apply).toBeEnabled();
 await apply.click();await expect(apply).toBeDisabled();await expect(all).toBeDisabled();
 await expect(counts).toHaveText('Upload pending: 0 files · Download pending: 0 files');
 await page.evaluate(id=>_bookshelf_.releaseDownload(id),id);
 await expect(all).toBeEnabled();await expect(apply).toBeDisabled();await expect(counts).toContainText('Download pending: 1 files');
 await page.evaluate(()=>{
  const read=providerCloud.source.getFileSrc;
  providerCloud.source.getFileSrc=async function(path,name){if(name.endsWith('Pending.pdf')&&!window.pausedProvider){window.pausedProvider=true;await new Promise(r=>window.resumeProvider=r);}return read.call(this,path,name);};
 });
 await page.setViewportSize({width:390,height:844});
 await all.click();
 await expect.poll(()=>page.evaluate(()=>!!window.resumeProvider)).toBe(true);
 await expect(page.getByLabel('Library transfer progress',{exact:true})).toBeVisible();
 await page.screenshot({path:test.info().outputPath('full-sync-progress-mobile.png')});
 await page.evaluate(()=>resumeProvider());
 await expect.poll(()=>page.evaluate(()=>!!_bookshelf_.fullSyncRunning)).toBe(false);
 await expect(counts).toHaveText('Upload pending: 0 files · Download pending: 0 files');await expect(all).toBeDisabled();
 await expect(page.getByLabel('Library transfer progress',{exact:true})).toContainText('1 / 1');
 await page.evaluate(async()=>{
  await _bookshelf_.configure({kind:'indexeddb',name:'provider-other-device'});await _bookshelf_.syncCloud('pCloud','/My library');
  const entry=(await _bookshelf_.call('search'))[0];await _bookshelf_.call('update',{table:'entries',values:{id:entry.id,metadata_json:JSON.stringify({...JSON.parse(entry.metadata_json),title:'Remote edit'})}});
  await _bookshelf_.syncCloud('pCloud','/My library');await _bookshelf_.configure({});
 });
 await page.getByRole('button',{name:'Check sync status',exact:true}).click();await expect(apply).toBeEnabled();await expect(counts).toContainText('Library changes pending');
 await apply.click();await expect.poll(()=>page.evaluate(async()=>(await _bookshelf_.call('search'))[0].metadata_json)).toContain('Remote edit');await expect(apply).toBeDisabled();
});
test('sync status distinguishes metadata/upload work from files missing only on this device',async({page})=>{
 await seed(page,2);
 await page.evaluate(()=>_bookshelf_.checkSyncNeeds(deltaCloud.transport));
 expect(await page.evaluate(()=>_bookshelf_.syncNeeds)).toMatchObject({pending:false,uploads:0,downloads:2});
 await page.evaluate(()=>_bookshelf_.syncAllScores());
 expect(await page.evaluate(()=>_bookshelf_.syncNeeds)).toMatchObject({pending:false,uploads:0,downloads:0});
 await page.evaluate(async()=>{const entry=(await _bookshelf_.call('search'))[0];await _bookshelf_.call('update',{table:'entries',values:{id:entry.id,metadata_json:JSON.stringify({...JSON.parse(entry.metadata_json),title:'Changed'})}});});
 expect(await page.evaluate(()=>_bookshelf_.syncNeeds.pending)).toBe(true);
});
test('deleting a synced library retains its backend and auto-sync restores metadata without deleting the cloud',async({page})=>{
 await seed(page,1);
 await page.evaluate(async()=>{await _bookshelf_.setAutoSync(true);clearTimeout(_bookshelf_.autoSync.timer);});
 await expect.poll(()=>page.evaluate(()=>!!_bookshelf_.autoSync.running)).toBe(false);
 await page.evaluate(()=>_bookshelf_.deleteStorage());
 await expect.poll(()=>page.evaluate(async()=>(await _bookshelf_.call('list')).length)).toBe(1);
 expect(await page.evaluate(()=>_bookshelf_.storage)).toEqual({kind:'indexeddb',name:'transfer-b'});
 expect(await page.evaluate(()=>deltaCloud.scores.size)).toBe(1);
 expect(await page.evaluate(async()=>(await _bookshelf_.call('availability',{destination:deltaCloud.transport.id}))[0].present)).toBe(false);
});
test('every category shows local availability and can download the shared score file',async({page})=>{
 await seed(page,1);
 const groups=await page.evaluate(async()=>{
  const entry=(await _bookshelf_.call('search'))[0],groups={};
  for(const table of ['bookshelves','playlists','tags']){
   const id=groups[table]=crypto.randomUUID();await _bookshelf_.call('update',{table,values:{id,...(table==='tags'?{name:'Test'}:{metadata_json:'{"name":"Test"}'})}});
   await _bookshelf_.call('link',{table:table==='bookshelves'?'bookshelf_documents':table==='playlists'?'playlist_items':'document_tags',values:table==='bookshelves'?{bookshelf_id:id,document_id:ids[0],order_key:'1'}:table==='playlists'?{playlist_id:id,entry_id:entry.id,order_key:'1'}:{tag_id:id,document_id:ids[0]}});
  }
  await _panels_.library.view.refresh();return groups;
 });
 for(const mode of ['documents','entries','bookshelves','playlists','tags']){
  await selectLibraryView(page,mode);if(groups[mode])await page.getByLabel('Collection',{exact:true}).selectOption(groups[mode]);
  await expect(page.getByLabel('Local file status',{exact:true})).toContainText('Cloud only');
  await expect(page.getByRole('button',{name:'Download to this device',exact:true})).toBeEnabled();
 }
 await page.getByRole('button',{name:'Download to this device',exact:true}).click();
 await expect(page.getByLabel('Local file status',{exact:true})).toContainText('On this device');
 await selectLibraryView(page,'documents');await expect(page.getByLabel('Local file status',{exact:true})).toContainText('On this device');
 expect(await page.evaluate(()=>deltaCloud.calls.filter(c=>c.kind==='readScore').length)).toBe(1);
});
