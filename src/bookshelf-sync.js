// +skip
export { exchangeLibraryChanges, LibraryAutoSync };
// -skip

// Immutable metadata batches and separately stored scores. Only unpublished
// revisions are sent; imported revisions are never echoed in a full snapshot.
async function exchangeLibraryChanges(store, transport) {
  if (!transport?.id || !['listChanges','readChanges','writeChanges','listScores','readScore','writeScore'].every(method => typeof transport[method] === 'function')) throw new Error('Invalid library sync transport');
  const initial = await store.call('syncData');
  const cache = Object.hasOwn(initial.batches,transport.id) ? initial.batches[transport.id] : {};
  const remote = await transport.listChanges(), remoteIds = new Set(), fetched = [], changes = new Map();
  const ids = new Set();
  for (const item of remote) {
    if (typeof item.id !== 'string' || ids.has(item.id)) throw new Error('Invalid or duplicate remote batch identity');
    ids.add(item.id);
    if (Object.hasOwn(cache,item.id)) { for (const id of cache[item.id]) remoteIds.add(id); continue; }
    const blob = await transport.readChanges(item.id);
    if (!(blob instanceof Blob) || blob.size > 64 * 1024 * 1024) throw new Error('Change batch exceeds the supported 64 MiB size');
    const batch = JSON.parse(await blob.text());
    if (batch.format !== 'rostrum-library-changes' || batch.version !== 1 || !Array.isArray(batch.changes)
      || item.id !== batch.deviceId + '/' + batch.batchId) throw new Error('Invalid change batch');
    const changeIds = [];
    for (const change of batch.changes) {
      if (!change || typeof change.id !== 'string') throw new Error('Invalid change record');
      if (changes.has(change.id) && JSON.stringify(changes.get(change.id)) !== JSON.stringify(change)) throw new Error('Conflicting copies of a change');
      changes.set(change.id,change); remoteIds.add(change.id); changeIds.push(change.id);
    }
    fetched.push({ id:item.id, changeIds });
  }
  if (changes.size) await store.applyRemoteChanges([...changes.values()]);
  for (const item of fetched) await store.call('rememberBatch',{ destination:transport.id, ...item });
  const paths = new Set((await transport.listScores()).map(item => item.path));
  await store.call('remoteInventory',{ destination:transport.id, changeIds:[...remoteIds], paths:[...paths] });
  const snapshot = await store.call('syncData');
  const pending = snapshot.changes.filter(change => !remoteIds.has(change.id));
  let uploadedFiles = 0;
  // Publish files before any metadata that references them, including parents
  // retained for history. Never publish a dangling new document revision.
  const documents = new Map(snapshot.documents.map(doc => [doc.id,doc]));
  const required = new Set(pending.filter(change => change.entity_type === 'documents').map(change => change.entity_id));
  // Repair externally removed score files when a local copy is available.
  for (const doc of snapshot.documents) if (!paths.has(doc.storage_path)) required.add(doc.id);
  for (const id of required) {
    const doc = documents.get(id); if (!doc) throw new Error('Missing score identity');
    if (paths.has(doc.storage_path)) continue;
    const info = await store.call('fileInfo',{ id,verify:true });
    if (!info.file) throw new Error('A score is missing from both this device and the cloud: ' + doc.storage_path);
    await transport.writeScore(doc,info.file); paths.add(doc.storage_path); uploadedFiles++;
  }
  const batches = []; let group = [], size = 0;
  for (const change of pending) {
    const length = new TextEncoder().encode(JSON.stringify(change)).length;
    if (length > 32 * 1024 * 1024) throw new Error('A single change exceeds the supported 32 MiB size');
    if (size + length > 4 * 1024 * 1024 && group.length) { batches.push(group); group = []; size = 0; }
    group.push(change); size += length;
  }
  if (group.length) batches.push(group);
  for (const changes of batches) {
    const batchId = crypto.randomUUID(), id = snapshot.deviceId + '/' + batchId;
    const packet = new Blob([JSON.stringify({ format:'rostrum-library-changes',version:1,deviceId:snapshot.deviceId,batchId,changes })],{ type:'application/json' });
    await transport.writeChanges(id,packet);
    const changeIds = changes.map(change => change.id);
    for (const id of changeIds) remoteIds.add(id);
    await store.call('rememberBatch',{ destination:transport.id,id,changeIds });
  }
  const status = await store.call('remoteInventory',{ destination:transport.id,changeIds:[...remoteIds],paths:[...paths] });
  const downloadFailures = await store.downloadPinned(transport);
  return { receivedBatches:fetched.length,uploadedBatches:batches.length,uploadedChanges:pending.length,uploadedFiles,downloadFailures,...status };
}

class LibraryAutoSync {
  constructor(store, { delay = 3000, interval = 30000 } = {}) {
    this.store = store; this.delay = delay; this.interval = interval; this.enabled = true;
    window.addEventListener('online',() => this.request(0));
    window.addEventListener('offline',() => store.notifyStatus());
    document.addEventListener('visibilitychange',() => { if (!document.hidden) this.request(0); });
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
    if (document.hidden || navigator.onLine === false || this.store.reviewPending || this.store.syncPending || this.store.cloudConnecting) { this.request(this.interval); return; }
    this.running = true; this.again = false;
    try { await this.store.syncAutomatically(); }
    catch { /* Store exposes a persistent, non-modal sync error. */ }
    finally {
      this.running = false;
      if (this.enabled) this.request(this.again ? this.delay : this.interval);
    }
  }
}
