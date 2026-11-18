// +skip
import { hashLibraryBytes, validateLibraryGeneration } from './bookshelf-format.js';
export { exchangeLibraryChanges, resolveLibraryGeneration, LibraryAutoSync };
// -skip

const initialLibraryGeneration = {id:'initial',ancestors:[]};
const snapshotGeneration = info => JSON.parse(info.generation_json);
function generationHead(markers) {
  const ancestors = new Set(markers.flatMap(marker => marker.ancestors));
  const heads = markers.filter(marker => !ancestors.has(marker.id));
  if (heads.length > 1) throw Object.assign(new Error('Competing library replacements: ' + heads.map(marker => marker.id).join(', ') + '. Choose the replacement to keep in Library settings.'),{restoreChoices:heads.map(marker => marker.id)});
  return heads[0] || initialLibraryGeneration;
}
function snapshotHeads(snapshots,generation) {
  const eligible = snapshots.filter(item => item.data.generation.id === generation.id);
  const ancestors = new Set(eligible.flatMap(item => item.data.ancestors));
  return [...new Map(eligible.filter(item => !ancestors.has(item.data.id)).map(item => [item.data.id,item])).values()];
}
async function inspectedState(store,transport) {
  const state = await transport.loadSyncState();
  for (const item of state.snapshots) {
    item.data = await store.call('inspectSnapshot',{file:item.file});
    item.data.id ||= 'copy:' + await hashLibraryBytes(await item.file.arrayBuffer());
  }
  return state;
}
async function cleanupSnapshots(transport, snapshots, head) {
  const covered = snapshots.filter(item => head.data.ancestors.includes(item.data.id) ||
    head.data.generation.ancestors.includes(item.data.generation.id));
  const copies = snapshots.filter(item => item.data.id === head.data.id);
  try { await transport.cleanup?.(covered,copies); } catch { /* Retry cleanup on the next sync. */ }
}
async function localGenerationMarkers(store) {
  const result = [];
  for (const entry of await store.call('listManaged',{path:'_sync/generations'})) if (entry.kind === 'file' && /^[a-f0-9]{64}\.json$/.test(entry.name)) {
    const blob = await store.call('readManaged',{path:'_sync/generations/' + entry.name});
    if (blob.size > 1024 * 1024) throw new Error('Invalid local generation marker');
    const marker = validateLibraryGeneration(JSON.parse(await blob.text()));
    if (await hashLibraryBytes(new TextEncoder().encode(marker.id)) + '.json' !== entry.name) throw new Error('Invalid local generation identity');
    result.push(marker);
  }
  return result;
}
async function mirrorGeneration(store,transport,marker,file) {
  const key = await transport.generationKey(marker.id);
  await store.call('writeManaged',{path:'_sync/generations/' + key + '.sqlite',file});
  await store.call('writeManaged',{path:'_sync/generations/' + key + '.json',file:new Blob([JSON.stringify(marker)])});
}
async function syncGeneration(store,transport) {
  let markers = await transport.listGenerations();
  for (const marker of await localGenerationMarkers(store)) if (!markers.some(item => item.id === marker.id)) {
    const key = await transport.generationKey(marker.id), file = await store.call('readManaged',{path:'_sync/generations/' + key + '.sqlite'});
    if (await hashLibraryBytes(await file.arrayBuffer()) !== marker.snapshotHash) throw new Error('Damaged local generation recovery snapshot');
    await store.call('inspectSnapshot',{file});
    await transport.publishGeneration(marker,file); markers.push(marker);
  }
  let generation = generationHead(markers);
  const requests = new Map();
  const add = (id,read) => { if (!requests.has(id)) requests.set(id,[]); requests.get(id).push(read); };
  for (const request of await transport.restoreRequests()) add(request.id,path => transport.readPath(request.path + '/' + path));
  for (const entry of await store.call('listManaged',{path:'restore'})) if (entry.kind === 'directory') add(entry.name,path => store.call('readManaged',{path:'restore/' + entry.name + '/' + path}));
  const pending = [...requests].filter(([id]) => !markers.some(marker => marker.id === id));
  if (pending.length > 1) throw new Error('More than one restore request is waiting: ' + pending.map(([id]) => id).join(', ') + '. Keep only the request you want to publish.');
  for (const [id,readers] of requests) {
    const processed = markers.find(marker => marker.id === id);
    if (!processed) continue;
    for (const read of readers) {
      let file;
      try { file = await read('library.sqlite'); } catch (error) { if (error.name === 'NotFoundError') continue; throw error; }
      if (await hashLibraryBytes(await file.arrayBuffer()) !== processed.sourceHash) throw new Error('Restore name was already used: ' + id + '. Use a new directory name.');
    }
  }
  if (pending.length) {
    const [id,readers] = pending[0];
    if (id === 'initial' || !id || new TextEncoder().encode(id).length > 180 || /[<>\u0022:/\\|?*\x00-\x1f]/.test(id)) throw new Error('Choose a valid, new restore request directory name');
    let file;
    try { file = await readers[0]('library.sqlite'); }
    catch (error) { throw new Error('Restore ' + id + ' is waiting for library.sqlite: ' + error.message); }
    const sourceHash = await hashLibraryBytes(await file.arrayBuffer());
    for (const read of readers.slice(1)) if (await hashLibraryBytes(await (await read('library.sqlite')).arrayBuffer()) !== sourceHash) throw new Error('Different restore requests share the name ' + id);
    const data = await store.call('inspectSnapshot',{file});
    // Stage and verify ALL files before publishing the activation marker.
    // No changes to the active local library occur in this phase.
    for (const doc of data.documents) if (!doc.deleted_at && !doc.replaced_by_id) {
      let score;
      try { score = await readers[0](doc.storage_path); }
      catch (error) { throw new Error('Restore ' + id + ' is waiting for ' + doc.storage_path); }
      if (score.size !== doc.size_bytes || await hashLibraryBytes(await score.arrayBuffer()) !== doc.content_hash) throw new Error('Restore ' + id + ' has a damaged score: ' + doc.storage_path);
      await store.uploadFile(doc,score,transport);
      await store.call('writeManaged',{path:doc.storage_path,file:score});
    }
    generation = {id,ancestors:[...new Set([...generation.ancestors,generation.id])].sort()};
    file = await store.call('prepareSnapshot',{file,id:'restore:' + id,generation});
    const marker = {...generation,format:'rostrum-library-generation',version:1,sourceHash,snapshotHash:await hashLibraryBytes(await file.arrayBuffer())};
    await transport.publishGeneration(marker,file); // activation, last and durable
    await mirrorGeneration(store,transport,marker,file);
    markers = await transport.listGenerations(); generation = generationHead(markers);
    store.warn('Replacement published to the cloud: ' + id + '. You may now delete restore/' + id + '/. Do not reuse this name.');
  }
  // A durable generation marker remains after the external request is removed.
  // It also prevents a late old-generation upload from reviving discarded edits.
  const local = await store.call('syncData',{destination:transport.id});
  const localGeneration = snapshotGeneration(local.info);
  if (generation.id !== localGeneration.id) {
    if (generation.id === 'initial' || !generation.ancestors.includes(localGeneration.id)) throw new Error('The local library and cloud have competing restore generations.');
    const marker = markers.find(marker => marker.id === generation.id), file = await transport.generationSnapshot(marker);
    if (await hashLibraryBytes(await file.arrayBuffer()) !== marker.snapshotHash) throw new Error('Damaged replacement recovery snapshot');
    await store.replaceLibrarySnapshot(file,generation);
  }
  for (const marker of markers) {
    const file = await transport.generationSnapshot(marker);
    if (await hashLibraryBytes(await file.arrayBuffer()) !== marker.snapshotHash) throw new Error('Damaged generation recovery snapshot');
    await mirrorGeneration(store,transport,marker,file);
  }
  return generation;
}

async function resolveLibraryGeneration(store,transport,id) {
  const markers = await transport.listGenerations(), marker = markers.find(item => item.id === id);
  if (!marker) throw new Error('That replacement is no longer available. Check sync again.');
  const source = await transport.generationSnapshot(marker);
  if (await hashLibraryBytes(await source.arrayBuffer()) !== marker.snapshotHash) throw new Error('Damaged replacement recovery snapshot');
  const data = await store.call('inspectSnapshot',{file:source});
  for (const doc of data.documents) if (!doc.deleted_at && !doc.replaced_by_id) {
    const file = await transport.readScore(doc);
    if (file.size !== doc.size_bytes || await hashLibraryBytes(await file.arrayBuffer()) !== doc.content_hash) throw new Error('Missing or damaged replacement score: ' + doc.storage_path);
  }
  const generation = {id:'choice-' + crypto.randomUUID(),ancestors:[...new Set(markers.flatMap(item => [item.id,...item.ancestors]))].sort()};
  const file = await store.call('prepareSnapshot',{file:source,id:'restore:' + generation.id,generation});
  const next = {...generation,format:'rostrum-library-generation',version:1,sourceHash:marker.snapshotHash,snapshotHash:await hashLibraryBytes(await file.arrayBuffer())};
  await transport.publishGeneration(next,file);
  await mirrorGeneration(store,transport,next,file);
}

async function exchangeLibraryChanges(store,transport) {
  if (!transport?.id || !['loadSyncState','publishSnapshot','listScores','readScore','writeScore'].every(method => typeof transport[method] === 'function')) throw new Error('Invalid SQLite library sync transport');
  let uploadedFiles = 0, receivedBatches = 0, uploadedBatches = 0, uploadedChanges = 0;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const generation = await syncGeneration(store,transport);
      const local = await store.call('syncData',{destination:transport.id});
      const localIds = new Set(local.changes.map(change => change.id));
      if (local.base?.file && local.base.changeIds.some(id => !localIds.has(id))) {
        const base = await store.call('inspectSnapshot',{file:local.base.file});
        if (base.generation.id === generation.id) await store.applyRemoteChanges(base.changes);
      }
      const state = await inspectedState(store,transport);
      const unknownGeneration = state.snapshots.find(item => item.data.generation.id !== generation.id && !generation.ancestors.includes(item.data.generation.id));
      if (unknownGeneration) {
        const markers = await transport.listGenerations();
        if (markers.some(marker => marker.id === unknownGeneration.data.generation.id)) continue;
        throw new Error('A cloud SQLite refers to missing replacement metadata. Copy _sync/ together with library.sqlite and scores/.');
      }
      const heads = snapshotHeads(state.snapshots,generation);
      await transport.ensureFormat?.({create:true});
      const remoteIds = new Set(heads.flatMap(item => item.data.changes.map(change => change.id)));
      for (const head of heads) {
        const result = await store.applyRemoteChanges(head.data.changes); if (result.addedChanges) receivedBatches++;
      }
      let snapshot = await store.call('syncData',{destination:transport.id});
      const paths = new Set((await transport.listScores()).map(item => item.path));
      // A different device may have uploaded an 8-digit name before publishing
      // its SQLite. Check otherwise-unexplained existing names before referring
      // to them; extend our prefix instead of adopting different score bytes.
      for (const doc of snapshot.documents) if (!doc.deleted_at && !doc.replaced_by_id && paths.has(doc.storage_path) && !heads.some(head => head.data.documents.some(remote => remote.id === doc.id && remote.storage_path === doc.storage_path))) {
        const file = await transport.readScore(doc), hash = await hashLibraryBytes(await file.arrayBuffer());
        if (hash !== doc.content_hash) await store.call('relocateFile',{id:doc.id,otherIds:[hash]});
      }
      snapshot = await store.call('syncData',{destination:transport.id});
      const required = snapshot.documents.filter(doc => !doc.deleted_at && !doc.replaced_by_id && !paths.has(doc.storage_path));
      store.planUploads?.(required);
      for (const doc of required) { await store.uploadFile(doc,null,transport); paths.add(doc.storage_path); uploadedFiles++; }
      const pending = snapshot.changes.filter(change => !remoteIds.has(change.id));
      // One self-contained head already represents all changes: no publication.
      if (heads.length !== 1 || pending.length) {
        const publicationId = await transport.reservePublication();
        snapshot = await store.call('captureSnapshot',{id:publicationId,ancestors:[...new Set(heads.flatMap(item => [item.data.id,...item.data.ancestors]))],generation});
        // Uploads can take time; a newly imported score must also precede SQLite.
        for (const doc of snapshot.documents) if (!doc.deleted_at && !doc.replaced_by_id && !paths.has(doc.storage_path)) { await store.uploadFile(doc,null,transport); paths.add(doc.storage_path); uploadedFiles++; }
        if (!await transport.publishSnapshot(snapshot.file,{expectedState:state.expectedState,publicationId})) continue;
        uploadedBatches++; uploadedChanges += pending.length;
        // Enumerate again before acknowledging. Another client may have
        // published a branch while this snapshot was being uploaded.
        const after = await inspectedState(store,transport), afterHeads = snapshotHeads(after.snapshots,generation);
        const known = new Set(snapshot.changes.map(change => change.id));
        const [head] = afterHeads;
        if (afterHeads.length !== 1) continue;
        const persisted = new Set(head.data.changes.map(change => change.id));
        if (persisted.size !== known.size || [...known].some(id => !persisted.has(id))) continue;
        const generations = await transport.listGenerations();
        if (generationHead(generations).id !== generation.id) continue;
        await cleanupSnapshots(transport,after.snapshots,head);
        await store.call('rememberSnapshot',{destination:transport.id,file:head.file,versions:[head.data.id],changeIds:[...known]});
        const status = await store.call('remoteInventory',{destination:transport.id,changeIds:[...known],paths:[...paths]});
        return {uploadedBatches,receivedBatches,uploadedChanges,uploadedFiles,downloadFailures:await store.downloadPinned(transport),...status};
      }
      const head = heads[0];
      await store.call('rememberSnapshot',{destination:transport.id,file:head.file,versions:[head.data.id],changeIds:[...remoteIds]});
      const status = await store.call('remoteInventory',{destination:transport.id,changeIds:[...remoteIds],paths:[...paths]});
      await cleanupSnapshots(transport,state.snapshots,head);
      return {uploadedBatches,receivedBatches,uploadedChanges,uploadedFiles,downloadFailures:await store.downloadPinned(transport),...status};
    } catch (error) { if (!error.retrySync) throw error; }
  }
  throw new Error('The library is still changing on another device. Your changes are saved; sync again.');
}

class LibraryAutoSync {
  constructor(store, { delay = 3000, interval = 30000 } = {}) {
    this.store = store; this.delay = delay; this.interval = interval; this.enabled = true;
  }
  setEnabled(enabled) {
    this.enabled = !!enabled; clearTimeout(this.timer); this.timer = null;
    if (this.enabled) this.request(0);
  }
  request(delay = this.delay) {
    if (!this.enabled || !this.store.hasSyncDestination()) return;
    if (this.running) { this.again = true; return; }
    clearTimeout(this.timer); this.timer = setTimeout(() => this.run(),delay);
  }
  async run() {
    if (!this.enabled || this.running || !this.store.hasSyncDestination()) return;
    if (this.store.inBackground || navigator.onLine === false || this.store.operationBlock('sync') || this.store.fullSyncRunning) { this.request(this.interval); return; }
    this.running = true; this.again = false; this.store.notifyStatus();
    try { await this.store.syncAutomatically(); }
    catch { /* Store exposes a persistent, non-modal sync error. */ }
    finally {
      this.running = false; this.store.notifyStatus();
      if (this.enabled) this.request(this.again ? this.delay : this.interval);
    }
  }
}
