import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BookshelfStore} from '../../src/bookshelf-model.js';

// No window, document, reader, OAuth, or real cloud APIs. The model owns the
// operation; only its storage and external services are replaced here.
async function library() {
  const model = new BookshelfStore({
    host: {
      loadCloudSelection:async () => null,
      loadSyncSettings:async () => ({enabled:false}),
      loadSelection:async () => ({}),
    },
    scores:{active:null},
  });
  await model.ready;
  assert.equal(model.syncError,undefined);
  const data = {deviceId:'device',changes:[],documents:[],batches:{}};
  let observation = {pending:0,verified:true,conflicts:0};
  model.call = async (action,args) => {
    switch (action) {
      case 'syncData': return data;
      case 'availability': return [];
      case 'syncSummary': return {...observation,uploads:0,downloads:0};
      case 'syncStatus': return observation;
      case 'remoteInventory': observation = {...observation,unknown:!!args.unknown}; return observation;
      default: throw new Error('Unexpected storage operation: ' + action);
    }
  };
  const transport = {id:'test:library',listChanges:async () => [],listScores:async () => [],
    readChanges:async () => {throw new Error('Unexpected batch read');},
    writeChanges:async () => {throw new Error('Unexpected batch write');},
    readScore:async () => {throw new Error('Unexpected score download');},
    writeScore:async () => {throw new Error('Unexpected score upload');}};
  model.transport = transport;
  return {model,transport};
}

test('manual and automatic sync work without a view and notify their lifecycle',async () => {
  const {model,transport} = await library();
  const states = [];
  model.addEventListener('statuschange',() => states.push({running:model.syncPending,manual:model.manualSync}));
  for (const automatic of [false,true]) {
    const result = await model.sync(transport,{automatic});
    assert.equal(result.pending,0);
    assert.equal(model.syncNeeds.pending,false);
    assert.equal(model.cloudPending,false);
    assert.equal(model.syncPending,false);
    assert.equal(model.manualSync,false);
    assert.ok(states.some(state => state.running && state.manual === !automatic));
  }
});

test('sync errors remain observable and release the running state for retry',async () => {
  const {model,transport} = await library();
  const failure = new Error('Cloud unavailable');
  transport.listChanges = async () => {throw failure;};
  await assert.rejects(model.sync(transport),error => error === failure);
  assert.equal(model.syncError,failure);
  assert.equal(model.syncPending,false);
  assert.equal(model.manualSync,false);
  transport.listChanges = async () => [];
  await model.sync(transport);
  assert.equal(model.syncError,null);
});

test('refreshing local availability cannot hide unknown cloud changes',async () => {
  const {model,transport} = await library();
  transport.listChanges = async () => [{id:'other-device/new-batch'}];
  await model.checkSyncNeeds();
  assert.equal(model.cloudPending,true);
  assert.equal(model.syncNeeds.unknown,true);
  await model.availability();
  assert.equal(model.cloudPending,true);
  transport.listChanges = async () => [];
  await model.checkSyncNeeds();
  assert.equal(model.cloudPending,false);
});

test('playlist data retains repeated songs and unavailable items independently of rendering',async () => {
  const {model} = await library();
  const memberships = [
    {id:'last',entry_id:'song',order_key:'3'},
    {id:'missing',entry_id:'deleted-song',order_key:'2'},
    {id:'first',entry_id:'song',order_key:'1'},
  ];
  model.records = async table => ({playlist_items:memberships,
    entries:[{id:'song',document_id:'score'}],documents:[{id:'score',metadata_json:'{}'}]})[table];
  const rows = await model.query({mode:'playlists',collection:'set',filters:{tagIds:[]}});
  assert.deepEqual(rows.map(row => row.membership.id),['first','missing','last']);
  assert.deepEqual(rows.map(row => row.id),['song','deleted-song','song']);
  assert.equal(rows[1].unavailable,true);
});

test('the model prevents deletion of the open score before touching storage',async () => {
  const {model} = await library();
  model.scores.active = {libraryDocumentId:'open-score'};
  assert.throws(() => model.update('documents',{id:'open-score',deleted_at:'now'}),/Close this score/);
});


test('song changes keep unrelated metadata and stale forms cannot overwrite a newer revision',async () => {
  const {model} = await library();
  const row = {id:'song',revision_id:'original',anchor_json:'{"type":"pdf","pageIndex":0}',
    metadata_json:'{"title":"Study","source":{"type":"pdf-outline"},"userEditedFields":["title"]}'};
  let saved, revision = row.revision_id;
  model.call = async (action,args) => {
    assert.equal(action,'update');
    if (args.expectedRevisionId !== revision) throw new Error('Changed on another device');
    saved = args.values; revision = 'newer'; return saved;
  };
  await model.saveSong(row,{composer:'Composer',aliases:' First ; Second ',pageIndex:2});
  assert.deepEqual(JSON.parse(saved.metadata_json),{title:'Study',source:{type:'pdf-outline'},
    userEditedFields:['title','composer','aliases','anchor'],composer:'Composer',aliases:['First','Second']});
  assert.deepEqual(JSON.parse(saved.anchor_json),{type:'pdf',pageIndex:2});
  await assert.rejects(model.rename('entries',row,'Old draft'),/Changed on another device/);
});


test('PDF outline identities use tree positions and survive title/page edits',async () => {
 const {model} = await library();
 const file = new File(['same bytes'],'score.pdf');
 const outline = [{title:'A',dest:[0],items:[{title:'B',dest:[0]}]},{title:'C',dest:[0]}];
 const preview = {mozDoc:{numPages:2,getOutline:async()=>outline}};
 const first = await model.analyze(file,preview);
 outline[0].title = 'Renamed'; outline[0].dest = [1];
 const second = await model.analyze(file,preview);
 assert.equal(new Set(first.map(row=>row.id)).size,3);
 assert.deepEqual(first.map(row=>row.id),second.map(row=>row.id));
 assert.equal(second[1].parent_id,second[0].id);
});

test('operation policy gives UI and callers the same blocking reason',async () => {
 const {model} = await library(); model.opening = {id:'score'};
 const reason = model.operationBlock('storage');
 assert.match(reason,/score operation/);
 await assert.rejects(model.configure({kind:'indexeddb'}),{message:reason});
 model.opening = null; assert.equal(model.operationBlock('storage'),null);
});


test('search-affecting content changes are distinct from file status and reader autosave',async()=>{
 const {model}=await library();
 model.call=BookshelfStore.prototype.call;
 model.ensureWorker=async()=>{};
 model.send=async(action,args)=>action==='mergeDelta'?{addedChanges:args.count}:{};
 let changes=0;model.addEventListener('contentchange',()=>changes++);
 for(const action of ['installFile','releaseFile','pinFile','saveState','remoteInventory'])await model.call(action);
 await model.call('mergeDelta',{count:0});assert.equal(changes,0);
 await model.call('mergeDelta',{count:1});assert.equal(changes,1);
 await model.call('update');assert.equal(changes,2);
 await model.call('destroyStorage');assert.equal(changes,3);
});
