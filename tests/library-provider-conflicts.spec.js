const {test,expect} = require('@playwright/test');
const {ProviderCloudServer} = require('./provider-cloud-server');
test.describe.configure({mode:'parallel'});

async function device(browser,cloud,id,url='/pod.html') {
  const context=await browser.newContext({serviceWorkers:'block'}); await cloud.install(context,id);
  const page=await context.newPage(),errors=[]; page.on('pageerror',error=>errors.push(error.message));
  const initialize=async()=>{
    await page.goto(url); await page.waitForFunction(()=>!!window._bookshelf_&&!!window._menu_);
    await page.evaluate(async({provider,id})=>{
      await _bookshelf_.setAutoSync(false);
      await _bookshelf_.configure({kind:'indexeddb',name:'provider-test-'+id});
      const source=_FileSrc_.get(provider);
      // Authentication is the only adapter behavior replaced. No real login,
      // token refresh, provider SDK, FileSrc operation or transport is mocked.
      source.auth=async()=>{}; source.tokens={access_token:'mock-'+id,expiry:Infinity};
      if(provider==='pCloud')source.authProvider={contentAccess:'zip',authenticate:async()=>{},requestAuth:async()=>({apiHost:'api.pcloud.com',params:{auth:'mock'},headers:{}})};
      window.realTransport=_bookshelf_.makeCloudTransport(provider,'');
    },{provider:cloud.provider,id});
  };
  await initialize();
  return {
    id,page,context,errors,reload:initialize,
    tag:(id,name,deleted_at)=>page.evaluate(({id,name,deleted_at})=>_bookshelf_.call('update',{table:'tags',values:{id,...(name===undefined?{}:{name}),...(deleted_at===undefined?{}:{deleted_at})}}),{id,name,deleted_at}),
    import:(text='same score',name='曲集.musicxml')=>page.evaluate(({text,name})=>_bookshelf_.call('importFile',{file:new File([text],name),entries:[]}),{text,name}),
    sync:()=>page.evaluate(async()=>{try{return {result:await _bookshelf_.sync(realTransport)};}catch(error){return {error:error.message};}}),
    start:()=>page.evaluate(()=>{window.pendingSync=_bookshelf_.sync(realTransport).then(result=>({result}),error=>({error:error.message}));}),
    finish:()=>page.evaluate(()=>pendingSync),
    dump:()=>page.evaluate(async()=>{
      const snapshot=await _bookshelf_.call('captureSnapshot');
      const data=await _bookshelf_.call('inspectSnapshot',{file:snapshot.file});
      for(const rows of Object.values(data.records))rows.sort((a,b)=>a.id.localeCompare(b.id));
      return {records:data.records,changes:data.changes.sort((a,b)=>a.id.localeCompare(b.id)),generation:data.generation};
    }),
  };
}
async function synced(client) { const result=await client.sync(); expect(result.error).toBeUndefined(); return result.result; }
async function snapshotBytes(client) {
  return client.page.evaluate(async()=>[...new Uint8Array(await (await _bookshelf_.call('captureSnapshot')).file.arrayBuffer())]);
}
function generationFiles(cloud) {
  const directory=cloud.at('_sync/generations');
  return directory?cloud.children(directory.id).filter(node=>/^[a-f0-9]{64}\.(json|sqlite)$/.test(node.name)):[];
}
async function converge(clients) {
  for(let pass=0;pass<2;pass++)for(const client of clients)await synced(client);
  const states=await Promise.all(clients.map(client=>client.dump()));
  for(const state of states.slice(1))expect(state).toEqual(states[0]);
  return states[0];
}
async function remoteChanges(client) {
  return client.page.evaluate(async()=>{
    let versions;
    if(realTransport.source.source==='pCloud'){
      const path=realTransport.full(''),current=(await realTransport.source.listLibrarySnapshots(path)).find(item=>item.current);
      versions={snapshots:current?[{...current,file:await realTransport.source.readLibrarySnapshot(path,current)}]:[]};
    }else versions=await realTransport.loadSyncState();
    const markers=await realTransport.listGenerations(),parents=new Set(markers.flatMap(marker=>marker.ancestors));
    const generation=markers.find(marker=>!parents.has(marker.id))?.id || 'initial';
    const ids=new Set();
    for(const item of versions.snapshots){
      if(realTransport.source.source==='pCloud'&&!item.current)continue;
      const data=await _bookshelf_.call('inspectSnapshot',{file:item.file});
      if(data.generation.id===generation)for(const change of data.changes)ids.add(change.id);
    }
    return [...ids];
  });
}
async function assertRemoteContains(client,ids) {
  const actual=new Set(await remoteChanges(client));
  for(const id of ids)expect(actual.has(id),'acknowledged revision missing from cloud: '+id).toBe(true);
}
async function race(cloud,a,b) {
  const gate=cloud.pause(a.id,'beforeCommit');
  await a.start(); await gate.arrived;
  await synced(b); gate.release();
  expect((await a.finish()).error).toBeUndefined();
}

for(const provider of ['Drive','Dropbox','OneDrive','pCloud'])test.describe(provider,()=>{
  test.setTimeout(90000);
  let cloud,a,b,clients;
  test.beforeEach(async({browser})=>{
    cloud=new ProviderCloudServer(provider); clients=[];
    a=await device(browser,cloud,'a');clients.push(a);
    b=await device(browser,cloud,'b');clients.push(b);
  });
  test.afterEach(async()=>{
    cloud.releases.forEach(release=>release());
    for(const client of clients)await client.context.close();
    expect(cloud.unexpected).toEqual([]);
    for(const client of clients)expect(client.errors).toEqual([]);
  });
  for(const url of ['/pod.html','/rostrum.html'])test(`empty cloud initializes README, scores and SQLite (${url})`,async({browser})=>{
    cloud.removeTree('scores');cloud.remove(cloud.at('README.md'));
    const fresh=await device(browser,cloud,'fresh',url);clients.push(fresh);
    const doc=await fresh.import();await fresh.tag('seed','Base');await synced(fresh);
    expect(cloud.at('README.md').bytes.toString()).toContain('restore/<unique-name>/');
    expect(cloud.at(doc.storage_path).bytes.toString()).toBe('same score');
    expect(cloud.sqlite()).toHaveLength(1);
    const before=cloud.commits.length;await synced(fresh);expect(cloud.commits).toHaveLength(before);
    await synced(b);expect((await b.dump()).records.documents[0].id).toBe(doc.id);
  });
  test('real adapters sync SQLite and score bytes, then perform a no-op',async()=>{
    const doc=await a.import(); await a.tag('seed','Base'); await synced(a); await synced(b);
    const state=await converge([a,b]);expect(state.records.documents).toHaveLength(1);expect(state.records.tags[0].name).toBe('Base');
    await b.page.evaluate(id=>_bookshelf_.ensureFile(id,realTransport),doc.id);
    expect(await b.page.evaluate(id=>_bookshelf_.call('fileInfo',{id,verify:true}).then(info=>info.file.text()),doc.id)).toBe('same score');
    const before=cloud.commits.filter(item=>item.path==='library.sqlite').length;await synced(a);
    expect(cloud.commits.filter(item=>item.path==='library.sqlite')).toHaveLength(before);
  });
  test('stale simultaneous publications preserve both independent edits',async()=>{
    await a.tag('seed','Base');await synced(a);await synced(b);
    await a.tag('a','From A');await b.tag('b','From B');
    const expected=[...(await a.dump()).changes,...(await b.dump()).changes].map(change=>change.id);
    await race(cloud,a,b);await assertRemoteContains(a,expected);
    const state=await converge([a,b]);expect(state.records.tags.map(row=>row.name).sort()).toEqual(['Base','From A','From B']);
    if(['Dropbox','OneDrive'].includes(provider))expect(cloud.conflicts).toBeGreaterThan(0);
  });
  test('the other publication order also preserves both writers',async()=>{
    await a.tag('seed','Base');await synced(a);await synced(b);
    await a.tag('a','A');await b.tag('b','B');
    const expected=[...(await a.dump()).changes,...(await b.dump()).changes].map(change=>change.id);
    await race(cloud,b,a);await assertRemoteContains(a,expected);await converge([a,b]);
  });
  test('two initial creators race safely without an existing SQLite',async()=>{
    await a.tag('a','A');await b.tag('b','B');
    const expected=[...(await a.dump()).changes,...(await b.dump()).changes].map(change=>change.id);
    await race(cloud,a,b);await assertRemoteContains(a,expected);await converge([a,b]);
  });
  test('three independently edited devices survive two stale publications',async({browser})=>{
    const c=await device(browser,cloud,'c');clients.push(c);
    await a.tag('seed','Base');for(const client of clients)await synced(client);
    for(const client of clients)await client.tag(client.id,client.id.toUpperCase());
    const expected=(await Promise.all(clients.map(client=>client.dump()))).flatMap(state=>state.changes.map(change=>change.id));
    const ga=cloud.pause('a','beforeCommit'),gb=cloud.pause('b','beforeCommit');
    await a.start();await ga.arrived;await b.start();await gb.arrived;await synced(c);
    gb.release();expect((await b.finish()).error).toBeUndefined();ga.release();expect((await a.finish()).error).toBeUndefined();
    await assertRemoteContains(a,expected);const state=await converge(clients);
    expect(state.records.tags.map(row=>row.name).sort()).toEqual(['A','B','Base','C']);
  });
  test('same-record edits remain a conflict until explicitly resolved, including after restart',async()=>{
    await a.tag('shared','Base');await synced(a);await synced(b);
    await a.tag('shared','A');await b.tag('shared','B');await race(cloud,a,b);await converge([a,b]);
    const values=await a.page.evaluate(async()=>{
      const [conflict]=await _bookshelf_.call('conflicts');
      const names=conflict.alternatives.map(change=>JSON.parse(change.payload_json).name).sort();
      const chosen=conflict.alternatives.find(change=>JSON.parse(change.payload_json).name==='A');
      await _bookshelf_.call('resolveConflict',{table:'tags',id:'shared',revisionId:chosen.id,expectedRevisionIds:conflict.alternatives.map(change=>change.id)});return names;
    });expect(values).toEqual(['A','B']);await synced(a);await b.reload();
    const state=await converge([a,b]);expect(state.records.tags[0].name).toBe('A');
    expect(await b.page.evaluate(()=>_bookshelf_.call('conflicts'))).toEqual([]);
  });
  test('delete versus edit retains both alternatives and an explicit delete does not resurrect',async()=>{
    await a.tag('shared','Base');await synced(a);await synced(b);
    await a.tag('shared','Edited');await b.tag('shared',undefined,'2026-11-18T00:00:00.000Z');await race(cloud,a,b);await converge([a,b]);
    const alternatives=await a.page.evaluate(async()=>{
      const [conflict]=await _bookshelf_.call('conflicts'),rows=conflict.alternatives.map(change=>JSON.parse(change.payload_json));
      const chosen=conflict.alternatives.find(change=>JSON.parse(change.payload_json).deleted_at);
      await _bookshelf_.call('resolveConflict',{table:'tags',id:'shared',revisionId:chosen.id,expectedRevisionIds:conflict.alternatives.map(change=>change.id)});
      return rows.map(row=>!!row.deleted_at).sort();
    });expect(alternatives).toEqual([false,true]);await synced(a);await b.reload();await converge([a,b]);
    expect(await b.page.evaluate(()=>_bookshelf_.records('tags'))).toEqual([]);
  });
  test('identical concurrent tombstones are idempotent',async()=>{
    await a.tag('shared','Base');await synced(a);await synced(b);
    for(const client of clients)await client.tag('shared',undefined,'2026-11-18T00:00:00.000Z');
    const expected=[...(await a.dump()).changes,...(await b.dump()).changes].map(change=>change.id);
    await race(cloud,a,b);await assertRemoteContains(a,expected);await converge([a,b]);
    expect(await a.page.evaluate(()=>_bookshelf_.records('tags'))).toEqual([]);
    expect(await a.page.evaluate(()=>_bookshelf_.call('conflicts'))).toEqual([]);
  });
  test('identical independently imported bytes keep one document and a valid cloud score',async()=>{
    const da=await a.import(),db=await b.import();expect(db.id).toBe(da.id);
    await race(cloud,a,b);const state=await converge([a,b]);expect(state.records.documents).toHaveLength(1);
    await b.page.evaluate(id=>_bookshelf_.call('fileInfo',{id,verify:true}),db.id);
    expect(await a.page.evaluate(()=>_bookshelf_.call('conflicts'))).toEqual([]);
  });
  test('different score imports publish all bytes before referencing either document',async()=>{
    await a.import('score A','A.musicxml');await b.import('score B','B.musicxml');
    await race(cloud,a,b);const state=await converge([a,b]);expect(state.records.documents).toHaveLength(2);
    for(const doc of state.records.documents)expect(cloud.at(doc.storage_path)).toBeTruthy();
  });
  test('edits made while uploading remain pending rather than being acknowledged prematurely',async()=>{
    await a.tag('seed','Base');await synced(a);await synced(b);await a.tag('before','Before');
    const gate=cloud.pause('a','beforeCommit');await a.start();await gate.arrived;
    await a.tag('during','During');gate.release();const first=await a.finish();expect(first.error).toBeUndefined();expect(first.result.pending).toBe(1);
    const before=new Set(await remoteChanges(a)),late=(await a.dump()).changes.find(change=>change.entity_id==='during');expect(before.has(late.id)).toBe(false);
    await synced(a);await assertRemoteContains(a,[late.id]);await converge([a,b]);
  });
  test('a rejected write leaves local edits durable across a page reload',async()=>{
    await a.tag('seed','Base');await synced(a);await a.tag('a','A');
    const before=cloud.commits.filter(item=>item.path==='library.sqlite').length;
    cloud.fault('a','beforeCommit','sqlite',403);expect((await a.sync()).error).toBeTruthy();
    expect(cloud.commits.filter(item=>item.path==='library.sqlite')).toHaveLength(before);
    await a.reload();expect((await a.dump()).records.tags.map(row=>row.name).sort()).toEqual(['A','Base']);
    await synced(a);await converge([a,b]);
  });
  test('lost success responses recover without duplicating the publication',async()=>{
    await a.tag('seed','Base');await synced(a);await a.tag('a','A');
    const expected=(await a.dump()).changes.map(change=>change.id);
    cloud.fault('a','afterCommit','sqlite','abort');const first=await a.sync();
    if(provider==='Drive')expect(first.error).toBeUndefined();else expect(first.error).toBeTruthy();
    const commits=cloud.commits.filter(item=>item.path==='library.sqlite').length;
    await assertRemoteContains(a,expected);await a.reload();await synced(a);
    expect(cloud.commits.filter(item=>item.path==='library.sqlite')).toHaveLength(commits);await converge([a,b]);
  });
  test('failed score transfers never publish dangling SQLite and retry succeeds',async()=>{
    await a.tag('seed','Base');await synced(a);const doc=await a.import();
    const commits=cloud.commits.filter(item=>item.path==='library.sqlite').length;
    cloud.fault('a','beforeCommit','score',503);const failure=await a.sync();expect(failure.error).toBeTruthy();
    if(provider==='OneDrive')expect(failure.error).toContain('putFileSrc');
    expect(cloud.commits.filter(item=>item.path==='library.sqlite')).toHaveLength(commits);
    await a.reload();await synced(a);await converge([a,b]);expect(cloud.at(doc.storage_path).bytes.toString()).toBe('same score');
  });
  test('a corrupt download stays unavailable and a subsequent verified download succeeds',async()=>{
    const doc=await a.import();await synced(a);await synced(b);
    cloud.once('b','afterRead','score',({bytes})=>bytes.fill(0));
    const error=await b.page.evaluate(async id=>{try{await _bookshelf_.ensureFile(id,realTransport);}catch(error){return error.message;}},doc.id);
    expect(error).toContain('hash');expect(await b.page.evaluate(async()=> (await _bookshelf_.call('availability'))[0].present)).toBe(false);
    await b.page.evaluate(id=>_bookshelf_.ensureFile(id,realTransport),doc.id);
    expect(await b.page.evaluate(async()=> (await _bookshelf_.call('availability'))[0].present)).toBe(true);
  });
  test('late old-generation publication cannot revive edits after a manual replacement',async()=>{
    const doc=await a.import();await a.tag('seed','Base');await synced(a);await synced(b);
    const archive=await a.page.evaluate(async id=>{
      const file=(await _bookshelf_.call('captureSnapshot')).file,score=(await _bookshelf_.call('fileInfo',{id})).file;
      return {sqlite:[...new Uint8Array(await file.arrayBuffer())],score:[...new Uint8Array(await score.arrayBuffer())]};
    },doc.id);
    await b.tag('discard','Old pending edit');const gate=cloud.pause('b','beforeCommit');await b.start();await gate.arrived;
    cloud.put('restore/new-generation/library.sqlite',archive.sqlite);cloud.put('restore/new-generation/'+doc.storage_path,archive.score);
    await synced(a);gate.release();expect((await b.finish()).error).toBeUndefined();
    cloud.removeTree('restore');
    const state=await converge([a,b]);expect(state.generation.id).toBe('new-generation');expect(state.records.tags.map(row=>row.name)).toEqual(['Base']);
    await b.reload();await synced(b);expect((await b.dump()).generation.id).toBe('new-generation');
  });

  test('remote changes during a snapshot download do not produce a stale successful sync',async()=>{
    await a.tag('seed','Base');await synced(a);await synced(b);await a.tag('a','A');await b.tag('b','B');
    const expected=[...(await a.dump()).changes,...(await b.dump()).changes].map(change=>change.id);
    const gate=cloud.pause('a','afterRead');await a.start();await gate.arrived;await synced(b);gate.release();
    expect((await a.finish()).error).toBeUndefined();await assertRemoteContains(a,expected);await converge([a,b]);
  });
  test('a concurrent publication after upload but before acknowledgment remains merged',async()=>{
    await a.tag('seed','Base');await synced(a);await synced(b);await a.tag('a','A');await b.tag('b','B');
    const expected=[...(await a.dump()).changes,...(await b.dump()).changes].map(change=>change.id);
    const gate=cloud.pause('a','afterCommit');await a.start();await gate.arrived;await synced(b);gate.release();
    expect((await a.finish()).error).toBeUndefined();await assertRemoteContains(a,expected);await converge([a,b]);
  });
  for(const phase of ['beforeList','beforeRead'])test(`failed remote ${phase==='beforeList'?'listing':'download'} is not acknowledged and retries cleanly`,async()=>{
    await a.tag('seed','Base');await synced(a);await a.tag('a','A');
    const commits=cloud.commits.filter(item=>item.path==='library.sqlite').length;
    cloud.fault('a',phase,'sqlite',403);const failure=await a.sync();expect(failure.error).toBeTruthy();
    if(provider==='OneDrive'&&phase==='beforeRead')expect(failure.error).toContain('getFileSrc');
    expect(cloud.commits.filter(item=>item.path==='library.sqlite')).toHaveLength(commits);
    const status=await a.page.evaluate(()=>_bookshelf_.call('syncStatus',{destination:realTransport.id}));expect(status.pending).toBeGreaterThan(0);
    await synced(a);await converge([a,b]);
  });
  test('incomplete restore never switches generations or discards pending edits',async()=>{
    const doc=await a.import();await a.tag('seed','Base');await synced(a);
    const bytes=await a.page.evaluate(async()=>[...new Uint8Array(await (await _bookshelf_.call('captureSnapshot')).file.arrayBuffer())]);
    cloud.put('restore/incomplete/library.sqlite',bytes);await a.tag('keep','Keep');
    expect((await a.sync()).error).toContain('waiting');expect((await a.dump()).generation.id).toBe('initial');
    expect((await a.dump()).records.tags.map(row=>row.name).sort()).toEqual(['Base','Keep']);
    const score=cloud.at(doc.storage_path).bytes;cloud.put('restore/incomplete/'+doc.storage_path,score);
    await synced(a);await synced(b);const state=await converge([a,b]);expect(state.generation.id).toBe('incomplete');expect(state.records.tags.map(row=>row.name)).toEqual(['Base']);
  });
  test('multiple replacement requests require a choice instead of silently discarding data',async()=>{
    await a.tag('seed','Base');await synced(a);
    const bytes=await a.page.evaluate(async()=>[...new Uint8Array(await (await _bookshelf_.call('captureSnapshot')).file.arrayBuffer())]);
    cloud.put('restore/one/library.sqlite',bytes);cloud.put('restore/two/library.sqlite',bytes);
    const before=cloud.commits.filter(item=>item.path==='library.sqlite').length;
    expect((await a.sync()).error).toContain('More than one');expect((await a.dump()).generation.id).toBe('initial');
    expect(cloud.commits.filter(item=>item.path==='library.sqlite')).toHaveLength(before);
    cloud.removeTree('restore/two');
    await synced(a);expect((await a.dump()).generation.id).toBe('one');
  });
  test('restore: identical leftovers and an identical recreated directory never roll back later edits',async()=>{
    await a.tag('seed','Base');await synced(a);const backup=await snapshotBytes(a);
    cloud.put('restore/repeated/library.sqlite',backup);await synced(a);
    await a.tag('later','After restore');await synced(a);
    const markers=generationFiles(cloud).map(node=>[node.name,node.hash]);
    const before=cloud.commits.length;await synced(a);expect(cloud.commits).toHaveLength(before);
    cloud.removeTree('restore/repeated');cloud.put('restore/repeated/library.sqlite',backup);
    await a.reload();const state=await converge([a,b]);
    expect(state.generation.id).toBe('repeated');expect(state.records.tags.map(row=>row.name).sort()).toEqual(['After restore','Base']);
    expect(generationFiles(cloud).map(node=>[node.name,node.hash])).toEqual(markers);
    expect(cloud.commits).toHaveLength(before);
  });
  for(const location of ['cloud','local'])test(`restore: changed content cannot reuse a processed name in ${location}, even after reload`,async()=>{
    await a.tag('seed','Base');await synced(a);const original=await snapshotBytes(a);
    cloud.put('restore/reused/library.sqlite',original);await synced(a);
    await a.tag('later','Keep this');await synced(a);const changed=await snapshotBytes(a);
    cloud.removeTree('restore/reused');
    if(location==='cloud')cloud.put('restore/reused/library.sqlite',changed);
    else await a.page.evaluate(bytes=>_bookshelf_.call('writeManaged',{path:'restore/reused/library.sqlite',file:new Blob([new Uint8Array(bytes)])}),changed);
    const before=cloud.commits.length,markers=generationFiles(cloud).map(node=>[node.name,node.hash]);
    await a.reload();const state=await a.dump();expect((await a.sync()).error).toContain('already used');
    expect(await a.dump()).toEqual(state);expect(cloud.commits).toHaveLength(before);
    expect(generationFiles(cloud).map(node=>[node.name,node.hash])).toEqual(markers);
    if(location==='cloud'){
      await b.tag('offline','Retain offline edit');const offline=await b.dump();
      expect((await b.sync()).error).toContain('already used');expect(await b.dump()).toEqual(offline);
      cloud.removeTree('restore/reused');cloud.put('restore/new-name/library.sqlite',changed);
      const restored=await converge([a,b]);expect(restored.generation.id).toBe('new-name');
      expect(restored.records.tags.map(row=>row.name).sort()).toEqual(['Base','Keep this']);
    }else{
      await a.page.evaluate(bytes=>_bookshelf_.call('writeManaged',{path:'restore/reused/library.sqlite',file:new Blob([new Uint8Array(bytes)])}),original);
      await converge([a,b]);
    }
  });
  test('restore: a new name can restore identical bytes again; recreating an ancestor name is ignored',async()=>{
    await a.tag('seed','Base');await synced(a);const backup=await snapshotBytes(a);
    cloud.put('restore/first/library.sqlite',backup);await synced(a);cloud.removeTree('restore/first');
    await a.tag('discard','Discard on second restore');await synced(a);
    cloud.put('restore/second/library.sqlite',backup);await synced(a);cloud.removeTree('restore/second');
    await a.tag('keep','Keep after second restore');await synced(a);
    cloud.put('restore/first/library.sqlite',backup);
    const state=await converge([a,b]);expect(state.generation).toMatchObject({id:'second',ancestors:['first','initial']});
    expect(state.records.tags.map(row=>row.name).sort()).toEqual(['Base','Keep after second restore']);
    expect(generationFiles(cloud).filter(node=>node.name.endsWith('.json'))).toHaveLength(2);
  });
  test('restore: same-name local and cloud requests must contain the same SQLite',async()=>{
    await a.tag('seed','Base');await synced(a);const backup=await snapshotBytes(a);
    await a.tag('keep','Keep until validated');const changed=await snapshotBytes(a),before=await a.dump();
    cloud.put('restore/shared-name/library.sqlite',backup);
    await a.page.evaluate(bytes=>_bookshelf_.call('writeManaged',{path:'restore/shared-name/library.sqlite',file:new Blob([new Uint8Array(bytes)])}),changed);
    expect((await a.sync()).error).toContain('Different restore requests share');
    expect(await a.dump()).toEqual(before);expect(generationFiles(cloud)).toHaveLength(0);
    await a.page.evaluate(bytes=>_bookshelf_.call('writeManaged',{path:'restore/shared-name/library.sqlite',file:new Blob([new Uint8Array(bytes)])}),backup);
    const state=await converge([a,b]);expect(state.generation.id).toBe('shared-name');expect(state.records.tags.map(row=>row.name)).toEqual(['Base']);
    expect(generationFiles(cloud).filter(node=>node.name.endsWith('.json'))).toHaveLength(1);
  });
  for(const damaged of ['SQLite','score'])test(`restore: corrupt ${damaged} leaves current data intact and a corrected copy retries`,async()=>{
    const doc=await a.import();await a.tag('seed','Base');await synced(a);const backup=await snapshotBytes(a);
    const score=Buffer.from(cloud.at(doc.storage_path).bytes);
    await a.tag('keep','Keep until validated');const before=await a.dump();
    cloud.put('restore/damaged/library.sqlite',damaged==='SQLite'?Buffer.from('not a database'):backup);
    cloud.put('restore/damaged/'+doc.storage_path,damaged==='score'?Buffer.alloc(score.length):score);
    const commits=cloud.commits.length;expect((await a.sync()).error).toBeTruthy();
    expect(await a.dump()).toEqual(before);expect(generationFiles(cloud)).toHaveLength(0);expect(cloud.commits).toHaveLength(commits);
    cloud.put('restore/damaged/library.sqlite',backup);cloud.put('restore/damaged/'+doc.storage_path,score);
    const state=await converge([a,b]);expect(state.generation.id).toBe('damaged');expect(state.records.tags.map(row=>row.name)).toEqual(['Base']);
  });
  test('restore: an incomplete directory waits for SQLite and reserved names are rejected',async()=>{
    await a.tag('keep','Keep');await synced(a);const backup=await snapshotBytes(a);
    cloud.mkdir(cloud.mkdir(cloud.root,'restore').id,'missing');const before=await a.dump();
    expect((await a.sync()).error).toContain('waiting for library.sqlite');expect(await a.dump()).toEqual(before);
    cloud.removeTree('restore/missing');cloud.put('restore/initial/library.sqlite',backup);
    expect((await a.sync()).error).toContain('valid, new');expect(await a.dump()).toEqual(before);
    expect(generationFiles(cloud)).toHaveLength(0);
    cloud.removeTree('restore/initial');cloud.put('restore/valid/library.sqlite',backup);
    await synced(a);expect((await a.dump()).generation.id).toBe('valid');
  });
  for(const kind of ['recovery','marker'])test(`restore: failed ${kind} publication never activates replacement and retries after reload`,async()=>{
    await a.tag('seed','Base');await synced(a);const backup=await snapshotBytes(a);
    await a.tag('keep','Keep until activation');await synced(a);await synced(b);
    cloud.put('restore/retry/library.sqlite',backup);const before=await a.dump();
    cloud.fault('a','beforeRename',kind,503);expect((await a.sync()).error).toBeTruthy();
    expect(await a.dump()).toEqual(before);expect(generationFiles(cloud).filter(node=>node.name.endsWith('.json'))).toHaveLength(0);
    if(kind==='marker')expect(generationFiles(cloud).filter(node=>node.name.endsWith('.sqlite'))).toHaveLength(1);
    await a.reload();const state=await converge([a,b]);expect(state.generation.id).toBe('retry');
    expect(state.records.tags.map(row=>row.name)).toEqual(['Base']);
    expect(generationFiles(cloud).filter(node=>node.name.endsWith('.json'))).toHaveLength(1);
  });
  test('restore: lost activation response is recoverable from another device after request deletion',async()=>{
    await a.tag('seed','Base');await synced(a);const backup=await snapshotBytes(a);
    await a.tag('discard','Old edits');await synced(a);await synced(b);
    cloud.put('restore/lost-response/library.sqlite',backup);
    cloud.fault('a','afterRename','marker','abort');expect((await a.sync()).error).toBeTruthy();
    expect(generationFiles(cloud).filter(node=>node.name.endsWith('.json'))).toHaveLength(1);
    cloud.removeTree('restore/lost-response');await synced(b);await a.reload();
    const state=await converge([a,b]);expect(state.generation.id).toBe('lost-response');expect(state.records.tags.map(row=>row.name)).toEqual(['Base']);
  });
  if(provider==='Drive'){
    test('paginated same-name versions and failed cleanup converge and cleanup is retried',async()=>{
      cloud.pageSize=1;cloud.reverseListing=true;await a.tag('seed','Base');await synced(a);await synced(b);
      await a.tag('a','A');await b.tag('b','B');cloud.fault('b','beforeDelete','sqlite',503);
      await race(cloud,a,b);const state=await converge([a,b]);expect(state.records.tags).toHaveLength(3);expect(cloud.sqlite()).toHaveLength(1);
      expect(cloud.requests.some(item=>item.url.includes('pageToken='))).toBe(true);
    });
    test('a version deleted between list and download restarts discovery without losing a branch',async()=>{
      await a.tag('seed','Base');await synced(a);await synced(b);await a.tag('a','A');await b.tag('b','B');
      const gate=cloud.pause('a','beforeRead');await a.start();await gate.arrived;await synced(b);gate.release();
      expect((await a.finish()).error).toBeUndefined();const state=await converge([a,b]);expect(state.records.tags).toHaveLength(3);
    });
    test('a publication created while old versions are being cleaned up is not deleted',async()=>{
      await a.tag('seed','Base');await synced(a);await synced(b);await a.tag('a','A');await b.tag('b','B');
      const gate=cloud.pause('a','beforeDelete');await a.start();await gate.arrived;await synced(b);gate.release();
      expect((await a.finish()).error).toBeUndefined();const state=await converge([a,b]);expect(state.records.tags).toHaveLength(3);
    });
  }
  if(['Dropbox','OneDrive'].includes(provider)){
    test('repeated conditional conflicts are bounded and a later retry preserves local edits',async()=>{
      await a.tag('seed','Base');await synced(a);await a.tag('a','A');const before=cloud.commits.filter(item=>item.path==='library.sqlite').length;
      for(let i=0;i<8;i++)cloud.fault('a','beforeCommit','sqlite',provider==='Dropbox'?409:412);
      expect((await a.sync()).error).toContain('still changing');expect(cloud.commits.filter(item=>item.path==='library.sqlite')).toHaveLength(before);
      await a.reload();await synced(a);const state=await converge([a,b]);expect(state.records.tags.map(row=>row.name).sort()).toEqual(['A','Base']);
    });
  }
  if(provider==='pCloud'){
    test('an old known upload finishing last is republished to the current file, not left only in revisions',async()=>{
      await a.tag('seed','Base');await synced(a);await synced(b);
      const old=Buffer.from(cloud.sqlite()[0].bytes);await a.tag('a','A');
      cloud.once('a','afterCommit','sqlite',()=>cloud.write(cloud.root,'library.sqlite',old));
      await synced(a);await assertRemoteContains(a,(await a.dump()).changes.map(change=>change.id));
      const state=await converge([a,b]);expect(state.records.tags.map(row=>row.name).sort()).toEqual(['A','Base']);
    });
    test('expired revision download fails without acknowledging unsent edits and can be retried',async()=>{
      await a.tag('seed','Base');await synced(a);await synced(b);await b.tag('b','B');await synced(b);await a.tag('a','A');
      const copy=cloud.pcloud.bind(cloud);let failed=false;
      cloud.pcloud=async(device,request,url)=>{
        if(device==='a'&&url.pathname==='/copyfile'&&!failed){failed=true;const node=cloud.nodes.get(Number(url.searchParams.get('fileid')));node.history=node.history.filter(item=>item.revision!==Number(url.searchParams.get('revisionid')));return {result:2009,error:'Revision expired during download'};}
        return copy(device,request,url);
      };
      expect((await a.sync()).error).toContain('Revision expired');
      await synced(a);const state=await converge([a,b]);expect(state.records.tags).toHaveLength(3);
    });
  }

  test('concurrent memberships, repeated playlist items and independent annotations preserve references',async()=>{
    const doc=await a.import();
    const song=await a.page.evaluate(async doc=>{
      const song=await _bookshelf_.addSong(doc,'Song',0);
      for(const [table,id]of [['bookshelves','shelf'],['playlists','playlist']])await _bookshelf_.call('update',{table,values:{id,metadata_json:JSON.stringify({name:id})}});
      return song;
    },doc);
    await a.tag('tag','Tag');await synced(a);await synced(b);
    for(const client of clients)await client.page.evaluate(async({doc,song,id})=>{
      await _bookshelf_.addToCollection('documents',doc.id,'shelf');await _bookshelf_.addTag('documents',doc.id,'tag');
      await _bookshelf_.addToCollection('entries',song.id,'playlist');
      await _bookshelf_.call('update',{table:'annotations',values:{id:'ink-'+id,document_id:doc.id,anchor_json:JSON.stringify({type:'pdf',pageIndex:0}),content_json:JSON.stringify({note:id})}});
    },{doc,song,id:client.id});
    await race(cloud,a,b);const state=await converge([a,b]);
    expect(state.records.bookshelf_documents).toHaveLength(1);expect(state.records.document_tags).toHaveLength(1);
    expect(state.records.playlist_items).toHaveLength(2);expect(state.records.annotations).toHaveLength(2);
    expect(await a.page.evaluate(()=>_bookshelf_.call('conflicts'))).toEqual([]);
  });
  test('published replacement branches stay explicit until a selected branch supersedes both',async()=>{
    await a.tag('seed','Base');await synced(a);
    const snapshot=await a.page.evaluate(async()=>[...new Uint8Array(await (await _bookshelf_.call('captureSnapshot')).file.arrayBuffer())]);
    const hash=bytes=>require('node:crypto').createHash('sha256').update(Buffer.from(bytes)).digest('hex');
    for(const id of ['left','right']){
      const generation={id,ancestors:['initial']};
      const bytes=await a.page.evaluate(async({snapshot,generation})=>[...new Uint8Array(await (await _bookshelf_.call('prepareSnapshot',{file:new Blob([new Uint8Array(snapshot)]),id:'restore:'+generation.id,generation})).arrayBuffer())],{snapshot,generation});
      const key=hash(Buffer.from(id)),marker={...generation,format:'rostrum-library-generation',version:1,sourceHash:hash(snapshot),snapshotHash:hash(bytes)};
      cloud.put('_sync/generations/'+key+'.sqlite',bytes);cloud.put('_sync/generations/'+key+'.json',Buffer.from(JSON.stringify(marker)));
    }
    expect((await a.sync()).error).toContain('Competing');
    await a.page.evaluate(()=>_bookshelf_.chooseRestoreGeneration('left'));
    const state=await converge([a,b]);expect(state.generation.id).toMatch(/^choice-/);expect(state.generation.ancestors).toEqual(['initial','left','right']);
  });

});
