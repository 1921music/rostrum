const {test,expect}=require('@playwright/test');
const {createHash}=require('node:crypto');
const {installDeltaCloud,installProviderCloud}=require('./library-sync-helpers');
test.beforeEach(async({page})=>{
 page.external=[];
 await page.route('**/*',r=>{if(r.request().url().startsWith('http://127.0.0.1:9876/'))return r.continue();page.external.push(r.request().url());return r.abort();});
 await page.goto('/pod.html');await page.waitForFunction(()=>!!window._bookshelf_&&!!window._menu_);
 await installDeltaCloud(page);
 await page.evaluate(async()=>{
  window.a={kind:'indexeddb',name:'snapshot-a'};window.b={kind:'indexeddb',name:'snapshot-b'};
  await _bookshelf_.configure(a);
  const pdf=await PDFLib.PDFDocument.create();pdf.setTitle('Original');pdf.addPage([300,400]);
  window.doc=await _bookshelf_.import(new File([await pdf.save()],'Original.pdf'));
  await _bookshelf_.sync(deltaCloud.transport);
  window.seed=(await _bookshelf_.call('captureSnapshot')).file;
 });
});
test.afterEach(async({page})=>expect(page.external).toEqual([]));

test('shared SQLite excludes device state and a no-op does not publish',async({page})=>{
 const result=await page.evaluate(async()=>{
  await _bookshelf_.call('pinFile',{id:doc.id,pinned:true});
  const file=[...deltaCloud.batches.values()].at(-1), data=await _bookshelf_.call('inspectSnapshot',{file});
  const before=deltaCloud.batches.size;await _bookshelf_.sync(deltaCloud.transport);
  await _bookshelf_.configure(b);await _bookshelf_.sync(deltaCloud.transport);
  return {header:await file.slice(0,15).text(),tables:data.tableNames,before,after:deltaCloud.batches.size,pinned:(await _bookshelf_.call('availability'))[0].pinned};
 });
 expect(result.header).toBe('SQLite format 3');expect(result.tables).toHaveLength(12);expect(result.tables).not.toContain('local_state');expect(result.after).toBe(result.before);expect(result.pinned).toBe(false);
});

test('edits made during publication remain pending and are sent next time',async({page})=>{
 expect(await page.evaluate(async()=>{
  const original=deltaCloud.transport.publishSnapshot;
  await _bookshelf_.call('update',{table:'tags',values:{id:'before',name:'Before'}});
  deltaCloud.transport.publishSnapshot=async(...args)=>{const result=await original(...args);await _bookshelf_.call('update',{table:'tags',values:{id:'during',name:'During'}});deltaCloud.transport.publishSnapshot=original;return result;};
  const first=await _bookshelf_.sync(deltaCloud.transport);await _bookshelf_.sync(deltaCloud.transport);
  await _bookshelf_.configure(b);await _bookshelf_.sync(deltaCloud.transport);
  return {pending:first.pending,names:(await _bookshelf_.records('tags')).map(row=>row.name).sort()};
 })).toEqual({pending:1,names:['Before','During']});
});

test('a failed conditional write merges the new remote state before retrying',async({page})=>{
 const result=await page.evaluate(async()=>{
  await _bookshelf_.configure(b);await _bookshelf_.sync(deltaCloud.transport);
  await _bookshelf_.call('update',{table:'tags',values:{id:'other',name:'Other'}});
  const other=await _bookshelf_.call('captureSnapshot',{id:'other-publication',ancestors:[],generation:{id:'initial',ancestors:[]}});
  await _bookshelf_.configure(a);await _bookshelf_.call('update',{table:'tags',values:{id:'own',name:'Own'}});
  const original=deltaCloud.transport.publishSnapshot;let attempts=0;
  deltaCloud.transport.publishSnapshot=async(...args)=>{if(!attempts++){deltaCloud.batches.set('other-publication',other.file);return false;}return original(...args);};
  const synced=await _bookshelf_.sync(deltaCloud.transport);
  return {attempts,pending:synced.pending,names:(await _bookshelf_.records('tags')).map(row=>row.name).sort()};
 });expect(result).toEqual({attempts:2,pending:0,names:['Other','Own']});
});

test('pCloud checks overwritten revisions even when its own upload was latest',async({page})=>{
 const result=await page.evaluate(async()=>{
  await _bookshelf_.configure(b);await _bookshelf_.sync(deltaCloud.transport);
  await _bookshelf_.call('update',{table:'tags',values:{id:'other',name:'Other'}});
  const other=await _bookshelf_.call('captureSnapshot',{id:'other-publication',ancestors:[],generation:{id:'initial',ancestors:[]}});
  await _bookshelf_.configure(a);await _bookshelf_.call('update',{table:'tags',values:{id:'own',name:'Own'}});
  const transport=deltaCloud.transport,load=transport.loadSyncState,publish=transport.publishSnapshot;let current=[...deltaCloud.batches.keys()].at(-1),attempts=0;
  transport.source={source:'pCloud'};
  transport.loadSyncState=async()=>{const state=await load();state.snapshots.forEach(item=>item.current=item.id===current);return state;};
  transport.publishSnapshot=async(file,options)=>{if(!attempts++)deltaCloud.batches.set('other-publication',other.file);await publish(file,options);current=options.publicationId;return true;};
  await _bookshelf_.sync(transport);
  return {attempts,names:(await _bookshelf_.records('tags')).map(row=>row.name).sort()};
 });expect(result).toEqual({attempts:2,names:['Other','Own']});
});

test('published restore survives request deletion and discards an offline device’s old edits',async({page})=>{
 const result=await page.evaluate(async()=>{
  await _bookshelf_.configure(b);await _bookshelf_.sync(deltaCloud.transport);
  await _bookshelf_.call('update',{table:'tags',values:{id:'old-offline',name:'Discard me'}});
  await _bookshelf_.configure(a);
  const score=(await _bookshelf_.call('fileInfo',{id:doc.id})).file;
  deltaCloud.requests.set('2026-restore-1',new Map([['library.sqlite',seed],[doc.storage_path,score]]));
  await _bookshelf_.sync(deltaCloud.transport);
  const first=(await _bookshelf_.call('syncData')).info;
  deltaCloud.requests.clear();
  await _bookshelf_.configure(b);await _bookshelf_.sync(deltaCloud.transport);
  const after=await _bookshelf_.call('syncData');
  return {generation:JSON.parse(after.info.generation_json).id,tags:(await _bookshelf_.records('tags')).length,documents:after.documents.length,markers:deltaCloud.generations.size,first:JSON.parse(first.generation_json).id};
 });expect(result).toEqual({generation:'2026-restore-1',tags:0,documents:1,markers:1,first:'2026-restore-1'});
});

test('incomplete or corrupt restore leaves the active generation unchanged',async({page})=>{
 const result=await page.evaluate(async()=>{
  await _bookshelf_.call('update',{table:'tags',values:{id:'keep',name:'Keep'}});
  const files=new Map([['library.sqlite',seed]]);deltaCloud.requests.set('incomplete',files);
  let missing,damaged;
  try{await _bookshelf_.sync(deltaCloud.transport);}catch(e){missing=e.message;}
  files.set(doc.storage_path,new Blob(['bad']));
  try{await _bookshelf_.sync(deltaCloud.transport);}catch(e){damaged=e.message;}
  return {missing,damaged,markers:deltaCloud.generations.size,tags:(await _bookshelf_.records('tags')).map(row=>row.name),generation:JSON.parse((await _bookshelf_.call('syncData')).info.generation_json).id};
 });expect(result.missing).toContain('waiting');expect(result.damaged).toContain('damaged');expect(result.markers).toBe(0);expect(result.tags).toEqual(['Keep']);expect(result.generation).toBe('initial');
});

test('two unpublished restore requests report a conflict before replacement',async({page})=>{
 const result=await page.evaluate(async()=>{
  deltaCloud.requests.set('one',new Map([['library.sqlite',seed]]));deltaCloud.requests.set('two',new Map([['library.sqlite',seed]]));
  let error;try{await _bookshelf_.sync(deltaCloud.transport);}catch(e){error=e.message;}
  return {error,markers:deltaCloud.generations.size,count:(await _bookshelf_.call('list')).length};
 });expect(result.error).toContain('More than one restore request');expect(result.markers).toBe(0);expect(result.count).toBe(1);
});

test('restore publication failure retains the previous library and can retry',async({page})=>{
 const result=await page.evaluate(async()=>{
  await _bookshelf_.call('update',{table:'tags',values:{id:'keep',name:'Keep'}});
  const score=(await _bookshelf_.call('fileInfo',{id:doc.id})).file;
  deltaCloud.requests.set('retry-restore',new Map([['library.sqlite',seed],[doc.storage_path,score]]));
  const publish=deltaCloud.transport.publishGeneration;deltaCloud.transport.publishGeneration=async()=>{throw new Error('Marker publication failed');};
  try{await _bookshelf_.sync(deltaCloud.transport);}catch{}
  const before=(await _bookshelf_.records('tags')).length;
  deltaCloud.transport.publishGeneration=publish;await _bookshelf_.sync(deltaCloud.transport);
  return {before,after:(await _bookshelf_.records('tags')).length,generation:JSON.parse((await _bookshelf_.call('syncData')).info.generation_json).id};
 });expect(result).toEqual({before:1,after:0,generation:'retry-restore'});
});

test('direct folder copy works without provider metadata or a wrapper directory',async({page})=>{
 await installProviderCloud(page);
 const result=await page.evaluate(async()=>{
  const root=await(await navigator.storage.getDirectory()).getDirectoryHandle('portable',{create:true});
  await _bookshelf_.configure({kind:'directory',directory:root});
  const pdf=await PDFLib.PDFDocument.create();pdf.addPage([400,500]);
  const local=await _bookshelf_.import(new File([await pdf.save()],'Portable.pdf'));
  await _bookshelf_.call('close');_bookshelf_.worker.terminate();_bookshelf_.worker=_bookshelf_.workerStarting=null;
  const copy=async(directory,path)=>{for await(const [name,handle]of directory.entries()){
   if(handle.kind==='directory'){await providerCloud.source.putDir(path,name);await copy(handle,path+'/'+name);}
   else await providerCloud.source.putFile(path,name,await handle.getFile());
  }};await copy(root,'/My library');
  await _bookshelf_.configure({kind:'indexeddb',name:'copied-library'});await _bookshelf_.syncCloud('pCloud','My library');
  const found=(await _bookshelf_.call('list'))[0];await _bookshelf_.ensureFile(found.id);
  const names=[...providerCloud.directories.get('/My library').files.keys()].sort();
  return {id:found.id,expected:local.id,path:found.storage_path,names,readme:await providerCloud.directories.get('/My library').files.get('README.md').bytes.text()};
 });expect(result.id).toBe(result.expected);expect(result.path).toMatch(/^scores\/[a-f0-9]{8}_Portable.pdf$/);expect(result.names).toEqual(['README.md','library.sqlite']);expect(result.readme).toContain('restore/<unique-name>/');
});

test('a local restore request enables sync and a processed name cannot replace again',async({page})=>{
 const result=await page.evaluate(async()=>{
  const file=(await _bookshelf_.call('fileInfo',{id:doc.id})).file;
  await _bookshelf_.call('writeManaged',{path:'restore/local-request/library.sqlite',file:seed});
  await _bookshelf_.call('writeManaged',{path:'restore/local-request/'+doc.storage_path,file});
  await _bookshelf_.checkSyncNeeds(deltaCloud.transport);const pending=_bookshelf_.syncNeeds.pending;
  await _bookshelf_.sync(deltaCloud.transport);const before=deltaCloud.batches.size;
  await _bookshelf_.sync(deltaCloud.transport);const after=deltaCloud.batches.size;
  await _bookshelf_.call('update',{table:'tags',values:{id:'new',name:'After restore'}});
  await _bookshelf_.call('writeManaged',{path:'restore/local-request/library.sqlite',file:(await _bookshelf_.call('captureSnapshot')).file});
  let error;try{await _bookshelf_.sync(deltaCloud.transport);}catch(e){error=e.message;}
  return {pending,before,after,error,markers:deltaCloud.generations.size};
 });expect(result.pending).toBe(true);expect(result.after).toBe(result.before);expect(result.markers).toBe(1);expect(result.error).toContain('already used');
});

test('published competing generations require an explicit choice and converge afterwards',async({page})=>{
 const result=await page.evaluate(async()=>{
  const digest=async file=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('');
  for(const id of ['left','right']){
    const generation={id,ancestors:['initial']},file=await _bookshelf_.call('prepareSnapshot',{file:seed,id:'restore:'+id,generation});
    await deltaCloud.transport.publishGeneration({...generation,format:'rostrum-library-generation',version:1,sourceHash:await digest(seed),snapshotHash:await digest(file)},file);
  }
  let choices;try{await _bookshelf_.sync(deltaCloud.transport);}catch(e){choices=e.restoreChoices;}
  await _bookshelf_.chooseRestoreGeneration('left');
  const generation=JSON.parse((await _bookshelf_.call('syncData')).info.generation_json);
  await _bookshelf_.configure(b);await _bookshelf_.sync(deltaCloud.transport);
  return {choices,generation,other:JSON.parse((await _bookshelf_.call('syncData')).info.generation_json).id,count:(await _bookshelf_.call('list')).length};
 });expect(result.choices.sort()).toEqual(['left','right']);expect(result.generation.id).toMatch(/^choice-/);expect(result.generation.ancestors).toEqual(['initial','left','right']);expect(result.other).toBe(result.generation.id);expect(result.count).toBe(1);
});

test('snapshot cleanup failure does not fail sync and is retried on the next sync',async({page})=>{
 const result=await page.evaluate(async()=>{
  let attempts=0;deltaCloud.transport.cleanup=async versions=>{attempts++;if(attempts===1)throw new Error('Delete failed');for(const item of versions)deltaCloud.batches.delete(item.id);};
  await _bookshelf_.call('update',{table:'tags',values:{id:'new',name:'Saved'}});
  const first=await _bookshelf_.sync(deltaCloud.transport);const before=deltaCloud.batches.size;
  await _bookshelf_.sync(deltaCloud.transport);
  return {attempts,pending:first.pending,before,after:deltaCloud.batches.size};
 });expect(result).toEqual({attempts:2,pending:0,before:2,after:1});
});

for(const metadataPublished of [false,true])test(`an independent 8-digit collision extends the filename (${metadataPublished?'published SQLite':'score uploaded first'})`,async({page})=>{
 const prefixes=new Map();let pair;
 for(let i=0;!pair;i++){
  const text='Rostrum collision fixture '+i,hash=createHash('sha256').update(text).digest('hex'),prefix=hash.slice(0,8);
  if(prefixes.has(prefix))pair=[prefixes.get(prefix),{text,hash}];else prefixes.set(prefix,{text,hash});
 }
 const result=await page.evaluate(async({pair,metadataPublished})=>{
  deltaCloud.batches.clear();deltaCloud.scores.clear();
  const c={kind:'indexeddb',name:'collision-c'},d={kind:'indexeddb',name:'collision-d'};
  await _bookshelf_.configure(c);
  const first=await _bookshelf_.call('importFile',{file:new File([pair[0].text],'Collision.xml'),entries:[]});
  const info=await _bookshelf_.call('fileInfo',{id:first.id});
  if(metadataPublished)await _bookshelf_.sync(deltaCloud.transport);else await deltaCloud.transport.writeScore(first,info.file);
  await _bookshelf_.configure(d);
  const second=await _bookshelf_.call('importFile',{file:new File([pair[1].text],'Collision.xml'),entries:[]});
  await _bookshelf_.sync(deltaCloud.transport);
  await _bookshelf_.configure(c);await _bookshelf_.sync(deltaCloud.transport);
  await _bookshelf_.ensureFile(second.id);
  const files=[];for(const doc of await _bookshelf_.call('list'))files.push((await _bookshelf_.call('fileInfo',{id:doc.id,verify:true})).document.storage_path);
  return {files:files.sort(),cloud:[...deltaCloud.scores.keys()].sort(),ids:(await _bookshelf_.call('list')).map(doc=>doc.id).sort()};
 },{pair,metadataPublished});
 expect(result.ids).toEqual(pair.map(item=>item.hash).sort());expect(result.files).toEqual(result.cloud);expect(result.files.map(path=>path.split('/')[1].split('_')[0].length).sort()).toEqual([8,9]);
});

test('copying a restored SQLite without generation metadata never overwrites it with an empty library',async({page})=>{
 const result=await page.evaluate(async()=>{
  const file=await _bookshelf_.call('prepareSnapshot',{file:seed,id:'restored',generation:{id:'missing-marker',ancestors:['initial']}});
  deltaCloud.batches.clear();deltaCloud.batches.set('restored',file);
  await _bookshelf_.configure(b);let error;try{await _bookshelf_.sync(deltaCloud.transport);}catch(e){error=e.message;}
  return {error,versions:[...deltaCloud.batches.keys()],local:(await _bookshelf_.call('list')).length};
 });expect(result.error).toContain('Copy _sync/');expect(result.versions).toEqual(['restored']);expect(result.local).toBe(0);
});

test('an ordinary older directory copy can merge the last synced base instead of forcing a replacement',async({page})=>{
 const result=await page.evaluate(async()=>{
  await _bookshelf_.call('update',{table:'tags',values:{id:'acknowledged',name:'Keep acknowledged edit'}});
  await _bookshelf_.sync(deltaCloud.transport);
  // External replacement of the closed storage image leaves device IndexedDB
  // untouched. No restore request or new generation was supplied.
  await _bookshelf_.call('writeManaged',{path:'library.sqlite',file:seed});
  await _bookshelf_.configure(a);
  const before=(await _bookshelf_.records('tags')).length;
  deltaCloud.batches.clear();deltaCloud.batches.set('older-copy',seed);
  await _bookshelf_.sync(deltaCloud.transport);
  return {before,names:(await _bookshelf_.records('tags')).map(row=>row.name),generation:JSON.parse((await _bookshelf_.call('syncData')).info.generation_json).id};
 });expect(result).toEqual({before:0,names:['Keep acknowledged edit'],generation:'initial'});
});

test('pCloud republishes when a late upload restores an older known version over its result',async({page})=>{
 const result=await page.evaluate(async()=>{
  const transport=deltaCloud.transport,load=transport.loadSyncState,publish=transport.publishSnapshot;
  const older=[...deltaCloud.batches.keys()][0];let current=older,attempts=0;
  transport.source={source:'pCloud'};
  transport.loadSyncState=async()=>{const state=await load();state.snapshots.forEach(item=>item.current=item.id===current);return state;};
  transport.publishSnapshot=async(file,options)=>{await publish(file,options);current=++attempts===1?older:options.publicationId;return true;};
  await _bookshelf_.call('update',{table:'tags',values:{id:'own',name:'Keep current'}});
  const synced=await _bookshelf_.sync(transport);
  const latest=await _bookshelf_.call('inspectSnapshot',{file:deltaCloud.batches.get(current)});
  return {attempts,pending:synced.pending,names:latest.records.tags.map(row=>row.name)};
 });expect(result).toEqual({attempts:2,pending:0,names:['Keep current']});
});
