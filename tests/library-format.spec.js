const {test,expect}=require('@playwright/test');
const {installProviderCloud}=require('./library-sync-helpers');
const {zipSync,unzipSync,strToU8,strFromU8}=require('fflate');
const {pathToFileURL}=require('node:url');const path=require('node:path');
test.beforeEach(async({page})=>{
 page.external=[];page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 await page.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:9876/')||u.startsWith(pathToFileURL(path.resolve('build')).href+'/')||u.startsWith('blob:')||u.startsWith('data:'))return r.continue();page.external.push(u);return r.abort();});
});
test.afterEach(async({page})=>{expect(page.external).toEqual([]);expect(page.errors).toEqual([]);});
async function start(page,url='/pod.html'){
 await page.goto(url);await page.waitForFunction(()=>!!window._menu_&&!!window._bookshelf_);await page.evaluate(()=>_bookshelf_.setAutoSync(false));
 if(url.startsWith('file:'))await page.evaluate(()=>_bookshelf_.configure({kind:'indexeddb'}));
}
async function score(page){return page.evaluate(async()=>{const pdf=await PDFLib.PDFDocument.create();pdf.addPage([300,400]);return _bookshelf_.import(new File([await pdf.save()],'Keep.pdf'));});}
for(const url of ['/pod.html','/rostrum.html',pathToFileURL(path.resolve('build/rostrum.html')).href])test(`new format persists schema/storage metadata, versioned revisions and backups (${url.startsWith('file:')?'file URL':url})`,async({page})=>{
 await start(page,url);const doc=await score(page);
 const info=await page.evaluate(()=>_bookshelf_.call('formatInfo'));expect(info).toMatchObject({schemaVersion:2,storage_format_version:1,record_format_version:2});
 expect(info.migrations).toContainEqual(expect.objectContaining({kind:'schema',to_version:2,phase:'done'}));
 expect(await page.evaluate(async()=>(await _bookshelf_.call('syncData')).changes.every(c=>c.record_version===2))).toBe(true);
 const bytes=await page.evaluate(async()=>[...new Uint8Array(await(await _bookshelf_.exportBackup()).arrayBuffer())]);
 const archive=unzipSync(new Uint8Array(bytes)),manifest=JSON.parse(strFromU8(archive['library.json']));
 expect(manifest).toMatchObject({version:2,schemaVersion:2,storageFormatVersion:1,recordFormatVersion:2});
 await page.reload();await page.waitForFunction(()=>!!window._menu_&&!!window._bookshelf_);expect((await page.evaluate(()=>_bookshelf_.call('list')))[0].id).toBe(doc.id);
});
test('legacy local files remain untouched and are not treated as a new library',async({page})=>{
 await start(page);const result=await page.evaluate(async()=>{
  const root=await navigator.storage.getDirectory();const handle=await root.getFileHandle('library.sqlite',{create:true});const writer=await handle.createWritable();await writer.write('legacy data');await writer.close();
  const scores=await root.getDirectoryHandle('scores',{create:true});const old=await scores.getFileHandle('Old.pdf',{create:true});const w=await old.createWritable();await w.write('original');await w.close();
  await _bookshelf_.configure({kind:'opfs'});
  return{count:(await _bookshelf_.call('list')).length,legacy:await(await handle.getFile()).text(),score:await(await old.getFile()).text(),namespace:(await root.getDirectoryHandle('rostrum-library-v2')).name};
 });expect(result).toEqual({count:0,legacy:'legacy data',score:'original',namespace:'rostrum-library-v2'});
});
test('cloud manifest isolates legacy content and future formats prevent all publication',async({page})=>{
 await start(page);await installProviderCloud(page);await score(page);
 const result=await page.evaluate(async()=>{
  await providerCloud.source.putDir('/My library','scores');await providerCloud.source.putFile('/My library/scores','Legacy.pdf',new Blob(['keep legacy']));
  await _bookshelf_.syncCloud('pCloud','/My library');
  const root=providerCloud.directories.get('/My library/rostrum-library-v2');const manifest=JSON.parse(await root.files.get('library-format.json').bytes.text());
  const readBefore=providerCloud.calls.filter(c=>c.kind==='read'&&c.path==='/My library/scores').length;
  root.files.set('library-format.json',{bytes:new Blob([JSON.stringify({...manifest,storageFormatVersion:99})])});
  const before=providerCloud.calls.filter(c=>c.kind==='put').length;let error;
  try{await _bookshelf_.syncCloud('pCloud','/My library');}catch(e){error=e.message;}
  return{manifest,before,after:providerCloud.calls.filter(c=>c.kind==='put').length,error,readBefore,legacy:await providerCloud.directories.get('/My library/scores').files.get('Legacy.pdf').bytes.text()};
 });
 expect(result.manifest).toMatchObject({version:2,recordFormatVersion:2,storageFormatVersion:1});expect(result.after).toBe(result.before);expect(result.error).toContain('Unsupported library format');expect(result.readBefore).toBe(0);expect(result.legacy).toBe('keep legacy');
});
test('nonempty cloud namespace with no manifest is never initialized or overwritten',async({page})=>{
 await start(page);await installProviderCloud(page);
 const result=await page.evaluate(async()=>{
  await providerCloud.source.putDir('/My library','rostrum-library-v2');await providerCloud.source.putFile('/My library/rostrum-library-v2','Foreign.txt',new Blob(['foreign']));
  const before=providerCloud.calls.filter(c=>c.kind==='put').length;let error;try{await _bookshelf_.syncCloud('pCloud','/My library');}catch(e){error=e.message;}
  return{error,before,after:providerCloud.calls.filter(c=>c.kind==='put').length};
 });expect(result.error).toContain('Missing format manifest');expect(result.after).toBe(result.before);
});
test('unsupported backup version is rejected without changing documents or raw history',async({page})=>{
 await start(page);await score(page);
 const bytes=await page.evaluate(async()=>[...new Uint8Array(await(await _bookshelf_.exportBackup()).arrayBuffer())]);const archive=unzipSync(new Uint8Array(bytes));const manifest=JSON.parse(strFromU8(archive['library.json']));manifest.version=99;archive['library.json']=strToU8(JSON.stringify(manifest));const bad=zipSync(archive);
 const before=await page.evaluate(()=>_bookshelf_.call('syncData'));
 const error=await page.evaluate(async bytes=>{try{await _bookshelf_.importBackup(new File([new Uint8Array(bytes)],'Future.zip'));}catch(e){return e.message;}},[...bad]);
 expect(error).toContain('Unsupported');expect(await page.evaluate(()=>_bookshelf_.call('syncData'))).toEqual(before);
});
