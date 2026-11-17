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
 const info=await page.evaluate(()=>_bookshelf_.call('formatInfo'));expect(info).toMatchObject({schemaVersion:7,storage_format_version:3,record_format_version:4});
 expect(await page.evaluate(async()=>(await _bookshelf_.call('syncData')).changes.every(c=>c.record_version===4))).toBe(true);
 const bytes=await page.evaluate(async()=>[...new Uint8Array(await(await _bookshelf_.exportBackup()).arrayBuffer())]);
 const archive=unzipSync(new Uint8Array(bytes)),manifest=JSON.parse(strFromU8(archive['library.json']));
 expect(manifest).toMatchObject({version:2,schemaVersion:7,storageFormatVersion:3,recordFormatVersion:4});
 if(url==='/pod.html'){
  // The published v2 backup has the same portable records; its local SQLite
  // schema number must not force a separate backup conversion.
  manifest.schemaVersion=2;archive['library.json']=strToU8(JSON.stringify(manifest));
  const prior=zipSync(archive);
  await page.evaluate(bytes=>_bookshelf_.importBackup(new File([new Uint8Array(bytes)],'Previous schema.zip')),[...prior]);
 }
 await page.reload();await page.waitForFunction(()=>!!window._menu_&&!!window._bookshelf_);expect((await page.evaluate(()=>_bookshelf_.call('list')))[0].id).toBe(doc.id);
});
test('a foreign database is rejected without changing its files',async({page})=>{
 await start(page);
 const result=await page.evaluate(async()=>{
  const root=await(await navigator.storage.getDirectory()).getDirectoryHandle('foreign',{create:true});
  const handle=await root.getFileHandle('library.sqlite',{create:true}),writer=await handle.createWritable();await writer.write('foreign data');await writer.close();
  let error;try{await _bookshelf_.configure({kind:'directory',directory:root});}catch(e){error=e.message;}
  return {error,text:await(await handle.getFile()).text()};
 });expect(result.error).toBeTruthy();expect(result.text).toBe('foreign data');
});

test('a newer cloud SQLite schema prevents metadata publication',async({page})=>{
 await start(page);await installProviderCloud(page);await score(page);
 const result=await page.evaluate(async()=>{
  await _bookshelf_.syncCloud('pCloud','My library');
  const root=providerCloud.directories.get('/My library'),original=root.files.get('library.sqlite');
  const bytes=new Uint8Array(await original.bytes.arrayBuffer());new DataView(bytes.buffer).setUint32(60,99,false);
  root.files.set('library.sqlite',{...original,bytes:new Blob([bytes]),revision:999});
  const before=providerCloud.calls.filter(c=>c.kind==='publish').length;let error;
  try{await _bookshelf_.syncCloud('pCloud','My library');}catch(e){error=e.message;}
  return {error,before,after:providerCloud.calls.filter(c=>c.kind==='publish').length};
 });expect(result.error).toContain('Unsupported');expect(result.after).toBe(result.before);
});

test('selected root can contain unrelated files and no wrapper is created',async({page})=>{
 await start(page);await installProviderCloud(page);await score(page);
 const result=await page.evaluate(async()=>{
  await providerCloud.source.putFile('/My library','Personal.txt',new Blob(['keep']));
  await _bookshelf_.syncCloud('pCloud','My library');
  return {dirs:[...providerCloud.directories.keys()],text:await providerCloud.directories.get('/My library').files.get('Personal.txt').bytes.text()};
 });expect(result.text).toBe('keep');expect(result.dirs.every(path=>!path.includes('rostrum-library-v3'))).toBe(true);
});

test('unsupported backup version is rejected without changing documents or raw history',async({page})=>{
 await start(page);await score(page);
 const bytes=await page.evaluate(async()=>[...new Uint8Array(await(await _bookshelf_.exportBackup()).arrayBuffer())]);const archive=unzipSync(new Uint8Array(bytes));const manifest=JSON.parse(strFromU8(archive['library.json']));manifest.version=99;archive['library.json']=strToU8(JSON.stringify(manifest));const bad=zipSync(archive);
 const before=await page.evaluate(()=>_bookshelf_.call('syncData'));
 const error=await page.evaluate(async bytes=>{try{await _bookshelf_.importBackup(new File([new Uint8Array(bytes)],'Future.zip'));}catch(e){return e.message;}},[...bad]);
 expect(error).toContain('Unsupported');expect(await page.evaluate(()=>_bookshelf_.call('syncData'))).toEqual(before);
});
