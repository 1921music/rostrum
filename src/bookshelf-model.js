// +skip
import { convertLilyPond, isLilyPond } from './lilypond.js';
import { exchangeLibraryChanges, resolveLibraryGeneration, LibraryAutoSync } from './bookshelf-sync.js';
import { libraryEntityId, hashLibraryBytes } from './bookshelf-format.js';
import { LibraryTransferQueue } from './bookshelf-transfers.js';
export { BookshelfStore };
// -skip

// Owns library data and operations. UI and score presentation are supplied at startup.
class BookshelfStore extends EventTarget {
  constructor(services) {
    super(); this.services = services; this.scores = services.scores; this.pending = new Map(); this.sequence = 0; this.localSaving = 0; this.cloudFacts = null; this.downloads = new Map(); this.releases = new Set(); this.fileErrors = new Map();
    this.transfers = new LibraryTransferQueue();
    this.libraryGeneration = 0; this.pendingUploads = new Map();
    this.transfers.addEventListener('change',() => this.notifyStatus());
    this.ready = Promise.resolve().then(() => this.initializeSync()).catch(error => { this.syncError = error; this.notifyStatus(); });
  }
  warn(message) { this.dispatchEvent(new CustomEvent('warning',{detail:{message}})); }
  notifyContent() { this.dispatchEvent(new Event('contentchange')); }
  notifyStatus() { this.dispatchEvent(new Event('statuschange')); }
  notifyData() { this.dispatchEvent(new Event('datachange')); this.notifyStatus(); }
  hasSyncDestination() { return !!(this.transport || this.cloudSelection?.source); }
  destinationId() {
    if (this.transport) return this.transport.id;
    if (!this.cloudSelection?.source) return '';
    const path = (this.cloudSelection.path || '').replace(/^\/+|\/+$/g,'');
    return this.cloudSelection.source + ':' + (path ? '/' + path : '');
  }
  async initializeSync() {
    const [selection, settings, storage] = await Promise.all([this.services.host.loadCloudSelection(),this.services.host.loadSyncSettings(),this.services.host.loadSelection()]);
    if (this.storage === undefined) this.storage = storage || {};
    this.cloudSelection ||= selection; this.autoSettings ||= settings || { enabled:true };
    this.autoSync = new LibraryAutoSync(this); this.autoSync.setEnabled(this.autoSettings.enabled !== false); this.notifyStatus();
  }
  async setAutoSync(enabled) {
    this.autoSettings = { enabled:!!enabled };
    this.autoSync?.setEnabled(enabled); this.notifyStatus();
    await this.services.host.saveSyncSettings(this.autoSettings);
  }
  async syncAutomatically() {
    const transport = this.transport || this.makeCloudTransport(this.cloudSelection.source,this.cloudSelection.path);
    const run = async () => { await transport.connect?.(); return this.sync(transport,{ automatic:true }); };
    try { return await (transport.background ? transport.background(run) : run()); }
    catch (error) { this.syncError = error; this.notifyStatus(); throw error; }
  }
  deviceStatus() {
    if (this.deletingStorage) return 'Device: deleting library data';
    const score = this.scores.active;
    if (this.localError || score?.librarySaveError) return 'Device: save failed';
    if (this.localSaving || score?.libraryDocumentId && score.librarySavedGeneration !== score.librarySaveGeneration) return 'Device: saving';
    if (this.downloads.size) return 'Device: downloading scores';
    if (this.fileErrors.size) return 'Device: score download failed';
    if (this.opening) return 'Device: opening score';
    return 'Device: saved';
  }
  cloudStatus() {
    if (!this.hasSyncDestination()) return 'Cloud: not configured';
    if (navigator.onLine === false) return 'Cloud: offline; changes kept on this device';
    if (this.cloudConnecting) return 'Cloud: connecting';
    if (this.syncPending) return 'Cloud: syncing';
    if (this.syncError?.name === 'AuthRequiredError') return 'Cloud: sign-in required; use Sync library now';
    if (this.syncError) return 'Cloud: sync failed — ' + this.syncError.message;
    const score = this.scores.active;
    return this.cloudPending || this.localSaving || score?.libraryDocumentId && score.librarySavedGeneration !== score.librarySaveGeneration
      ? 'Cloud: changes waiting to sync' : 'Cloud: synced';
  }
  setPermissionRequired(required) {
    this.permissionRequired = required;
    this.dispatchEvent(new Event('permissionchange'));
  }
  async reauthorizeStorage() {
    // Call requestPermission before any other await to retain user activation.
    await this.services.host.requestStoragePermission(this.storage);
    this.setPermissionRequired(false);
    await this.call('open');
    if (this.scores.active?.libraryDocumentId) await this.flush(this.scores.active);
  }
  operationBlock(operation, {internal = false} = {}) {
    if (this.deletingStorage) return 'Wait for library data deletion.';
    if (this.storageDeleted && operation !== 'storage') return 'Choose the library storage location again.';
    if (this.syncPending || !internal && this.cloudConnecting || this.checkingCloud || !internal && this.autoSync?.running)
      return 'Wait for the current library sync.';
    if (this.opening || this.reviewPending) return 'Finish the current score operation.';
    if (operation === 'storage' && (this.transfers.size || this.fullSyncRunning || this.releases.size || this.downloads.size))
      return 'Wait for library transfers.';
    if (operation !== 'storage' && this.fullSyncRunning && !internal) return 'Wait for the full library sync.';
    return null;
  }
  requireOperation(operation, options) {
    const reason = this.operationBlock(operation, options); if (reason) throw new Error(reason);
  }
  async deletionSummary() {
    if (this.scores.active?.libraryDocumentId) await this.flush(this.scores.active);
    const data = await this.call('syncData');
    const status = await this.call('syncStatus',{destination:this.destinationId()});
    const states = await this.call('availability',{destination:this.destinationId()});
    return {scores:data.documents.length,pending:status.pending,unverified:!status.verified,
      localOnly:states.filter(state => state.present && !state.remote).length};
  }
  async deleteStorage() {
    this.requireOperation('storage');
    this.deletingStorage = true; this.notifyStatus();
    try { if (this.scores.active?.libraryDocumentId) { await this.flush(this.scores.active); await this.scores.active.dispose(); } }
    catch (error) { this.deletingStorage = false; this.notifyStatus(); throw error; }
    let deleted = false;
    try { await this.call('destroyStorage'); deleted = true; }
    finally {
      this.worker?.terminate(); this.worker = this.workerStarting = null;
      this.hostStorage?.close(); this.hostStorage = null;
      this.storageDeleted = !deleted;
      this.fileErrors.clear();
      if (!deleted) { this.deletingStorage = false; this.notifyData(); }
    }
    this.syncNeeds = null; this.fullSyncState = null;
    try { await this.call('open'); this.cloudFacts = null; }
    finally { this.deletingStorage = false; this.notifyData(); }
    // Keep the selected backend and cloud settings. Deletion is never a synced
    // tombstone; an enabled auto-sync restores the remote history into a fresh DB.
    if (this.hasSyncDestination() && this.autoSettings?.enabled !== false) this.autoSync?.request(0);
    else if (this.hasSyncDestination()) {
      const transport = this.transport || this.makeCloudTransport(this.cloudSelection.source,this.cloudSelection.path);
      this.checkSyncNeeds(transport).catch(() => {});
    }
  }
  async configure(storage) {
    this.requireOperation('storage');
    if (this.scores.active?.libraryDocumentId) {
      await this.flush(this.scores.active); await this.scores.active.dispose();
    }
    // The startup library may still be initializing the remembered backend.
    // Finish that attempt before switching, so its failure cannot clear the new worker.
    if (this.workerStarting) await this.workerStarting.catch(() => {});
    if (this.worker) { await this.call('close'); this.worker.terminate(); }
    this.worker = this.workerStarting = null; this.storage = storage; this.storageDeleted = false; this.syncNeeds = null; this.fullSyncState = null; this.localError = null; this.cloudFacts = null; this.fileErrors.clear();
    const result = await this.call('open');
    try { await this.services.host.saveSelection(storage); }
    catch { this.warn('Library opened, but its location could not be remembered. Choose it again next time.'); }
    this.autoSync?.request(); this.notifyContent(); this.notifyData();
    return result;
  }
  async sync(transport, { automatic = false } = {}) {
    this.requireOperation('sync',{internal:true});
    if (navigator.onLine === false) throw new Error('Cloud sync needs a connection; changes remain saved on this device.');
    const previous = this.scores.active;
    const documentId = previous?.libraryDocumentId;
    const index = Math.max(0, Number(previous?.numbers?.pn || 1) - 1);
    const anchor = previous && { type: previous.music ? 'music' : 'pdf', pageIndex: previous.pgs[index]?.mozPn ? previous.pgs[index].mozPn - 1 : index };
    this.transfers.beginBatch();
    this.syncPending = true; this.manualSync = !automatic; this.transport = transport; this.syncError = null; this.notifyStatus();
    try {
      if (previous?.libraryDocumentId) await this.flush(previous);
      const result = await exchangeLibraryChanges(this,transport);
      this.syncNeeds = null;
      await this.refreshSyncNeeds(transport);
      this.lastSyncedAt = Date.now(); this.notifyData(); return result;
    } catch (error) { this.syncError = error; throw error; }
    finally {
      if (!automatic && documentId && !this.scores.active) {
        try { await this.openDocument(documentId, anchor, true); }
        catch (error) { this.warn('Review the synced library before reopening this score: ' + error.message); }
      }
      this.transfers.cancelled += this.pendingUploads.size; this.pendingUploads.clear();
      this.syncPending = false; this.manualSync = false; this.transfers.endBatch();
      this.notifyStatus();
      if (!automatic) this.autoSync?.request(this.autoSync.interval);
    }
  }
  makeCloudTransport(source, path) {
    return this.services.createCloudTransport(source,path || '');
  }
  async syncCloud(source, path, {background = false} = {}) {
    this.requireOperation('sync',{internal:background});
    const transport = this.makeCloudTransport(source,path);
    this.cloudConnecting = true; this.notifyStatus();
    try {
      await transport.connect();
      this.cloudSelection = { source,path }; this.transport = transport;
      await this.services.host.saveCloudSelection(this.cloudSelection);
      return await this.sync(transport,{automatic:background});
    } catch (error) { this.syncError = error; throw error; }
    finally { this.cloudConnecting = false; this.notifyStatus(); this.autoSync?.request(this.autoSync.interval); }
  }
  async applyRemoteChanges(changes) {
    if (this.opening) throw new Error('Wait for the score to open before receiving changes.');
    if (this.reviewPending) throw new Error('Finish the current score review before receiving library changes.');
    const previous = this.scores.active, id = previous?.libraryDocumentId;
    const affectsOpen = id && changes.some(change => {
      const row = JSON.parse(change.payload_json);
      return change.entity_type === 'documents' && row.id === id || change.entity_type === 'annotations' && row.document_id === id;
    });
    if (!affectsOpen) return this.call('mergeDelta',{ changes });
    const index = Math.max(0,Number(previous.numbers?.pn || 1) - 1);
    const anchor = { type:previous.music ? 'music' : 'pdf',pageIndex:previous.pgs[index]?.mozPn ? previous.pgs[index].mozPn - 1 : index };
    this.applyingChanges = true; this.notifyStatus();
    try {
      await this.flush(previous); await previous.dispose();
      return await this.call('mergeDelta',{ changes });
    } finally {
      try { if (!this.scores.active) await this.openDocument(id,anchor,true); }
      catch (error) { this.warn('Review this score before reopening it: ' + error.message); }
      this.applyingChanges = false; this.notifyStatus();
    }
  }
  async chooseRestoreGeneration(id) {
    this.requireOperation('sync');
    const transport = this.transport || this.makeCloudTransport(this.cloudSelection.source,this.cloudSelection.path);
    this.cloudConnecting = true; this.notifyStatus();
    try { await transport.connect?.(); await resolveLibraryGeneration(this,transport,id); return await this.sync(transport); }
    finally { this.cloudConnecting = false; this.notifyStatus(); }
  }
  async replaceLibrarySnapshot(file,generation) {
    const previous = this.scores.active;
    if (previous?.libraryDocumentId) { await this.flush(previous); await previous.dispose(); }
    await this.call('replaceSnapshot',{file,generation});
    this.libraryGeneration++; this.cloudFacts = null; this.notifyContent(); this.notifyData();
  }
  transferKey(id,direction = 'download',transport = this.transport) { return direction + ':' + (transport?.id || this.destinationId()) + ':' + id; }
  planUploads(documents) {
    this.pendingUploads = new Map(documents.map(doc => [doc.id,JSON.parse(doc.metadata_json).originalFilename])); this.notifyStatus();
  }
  uploadFile(document,file,transport) {
    this.pendingUploads.delete(document.id);
    return this.transfers.enqueue(this.transferKey(document.id,'upload',transport),async () => {
      if (!file) file = (await this.call('fileInfo',{id:document.id,verify:true})).file;
      if (!file) throw new Error('A score is missing from both this device and the cloud: ' + document.storage_path);
      return transport.writeScore(document,file);
    },{label:JSON.parse(document.metadata_json).originalFilename,direction:'upload'});
  }
  async refreshSyncNeeds(transport = this.transport) {
    if (!transport) return;
    const status = await this.call('syncSummary',{destination:transport.id});
    this.syncNeeds = {...status,destination:transport.id,pending:!!status.unknown || status.pending > 0 || !status.verified,checkedAt:Date.now()};
    this.updateCloudPending(status,transport.id);
    this.notifyStatus();
  }
  async checkSyncNeeds(transport = this.transport,{interactive = false} = {}) {
    if (!transport) throw new Error('Choose a library cloud destination first.');
    if (this.syncPending || this.deletingStorage) return;
    if (this.checkingCloud) return this.checkingCloud;
    this.checkingCloud = (async () => {
      const check = async () => {
        await transport.connect?.();
        const data = await this.call('syncData',{destination:transport.id}), remoteIds = new Set();
        // Each provider listing refreshes the shared parent folder cache.
        const state = await transport.loadSyncState();
        const scores = await transport.listScores();
        const generations = await transport.listGenerations();
        const requests = await transport.restoreRequests();
        const localRequests = await this.call('listManaged',{path:'restore'});
        const generation = JSON.parse(data.info.generation_json);
        let unknown = [...requests,...localRequests.filter(item => item.kind === 'directory').map(item => ({id:item.name}))].some(request => !generations.some(marker => marker.id === request.id));
        unknown ||= generation.id !== 'initial' && !generations.some(marker => marker.id === generation.id);
        for (const item of state.snapshots) {
          const snapshot = await this.call('inspectSnapshot',{file:item.file});
          if (snapshot.generation.id !== generation.id) continue;
          for (const change of snapshot.changes) remoteIds.add(change.id);
        }
        if (state.snapshots.length && !remoteIds.size && data.changes.length) unknown = true;
        if (generations.some(marker => marker.id !== generation.id && !generation.ancestors.includes(marker.id))) unknown = true;
        if (transport.source?.compactLibrarySnapshots && state.snapshots.some(item => item.name !== 'library.sqlite')) unknown = true;
        const known = new Set(data.changes.map(change => change.id));
        unknown ||= [...remoteIds].some(id => !known.has(id));
        await this.call('remoteInventory',{destination:transport.id,changeIds:[...remoteIds],paths:scores.map(file => file.path),unknown});
        this.syncNeeds = null;
        await this.refreshSyncNeeds(transport);
      };
      try { await (!interactive && transport.background ? transport.background(check) : check()); }
      catch (error) { this.syncNeeds = {destination:transport.id,error:error.message}; throw error; }
    })();
    this.notifyStatus();
    try { await this.checkingCloud; }
    finally { this.checkingCloud = null; this.notifyStatus(); }
  }
  async ensureFile(id, transport = this.transport, {priority = 0,front = false,group = '',document = null} = {}) {
    if (this.releases.has(id)) throw new Error('Wait for this download to be released.');
    const key = this.transferKey(id,'download',transport);
    if (this.downloads.has(id)) { this.transfers.promote(key,{priority,front}); return this.downloads.get(id); }
    const local = document ? {document} : await this.call('fileInfo',{id});
    if (local.file) return local.file;
    if (group === 'full-library' && this.fullSyncCancelled) throw new DOMException('Download cancelled','AbortError');
    if (this.downloads.has(id)) { this.transfers.promote(key,{priority,front}); return this.downloads.get(id); }
    const job = this.transfers.enqueue(key,async () => {
      const info = await this.call('fileInfo',{ id }); if (info.file) return info.file;
      const task = this.transfers.jobs.get(key);
      if (task) { task.label = JSON.parse(info.document.metadata_json).originalFilename; this.transfers.changed(); }
      if (navigator.onLine === false) throw new Error('This score is cloud-only. Connect to download it, or keep it offline in advance.');
      if (!transport) {
        if (!this.cloudSelection?.source) throw new Error('Connect the library cloud to download this score.');
        transport = this.makeCloudTransport(this.cloudSelection.source,this.cloudSelection.path);
      }
      const transfer = async () => { await transport.connect?.(); return transport.readScore(info.document); };
      const file = await (transport.background ? transport.background(transfer) : transfer());
      this.transport = transport;
      await this.call('installFile',{ id,file }); this.fileErrors.delete(id);
      if (this.syncNeeds?.destination === transport.id) await this.refreshSyncNeeds(transport);
      return file;
    },{priority,front,group,label:JSON.parse(local.document.metadata_json).originalFilename});
    this.downloads.set(id,job); this.notifyData();
    try { return await job; }
    catch (error) { if (error.name !== 'AbortError') this.fileErrors.set(id,error.message); throw error; }
    finally { this.downloads.delete(id); this.notifyData(); }
  }
  async keepOffline(ids) {
    for (const id of ids) await this.call('pinFile',{ id,pinned:true });
    let failed;
    await Promise.all(ids.map(async id => { try { await this.ensureFile(id); } catch (error) { failed ||= error; } }));
    this.autoSync?.request(); if (failed) throw failed;
  }
  async syncAllScores(source,path) {
    if (this.fullSyncRunning) throw new Error('A full library transfer is already running.');
    this.fullSyncRunning = true; this.fullSyncCancelled = false;
    const state = this.fullSyncState = {phase:'sync',total:0,completed:0,failed:0,cancelled:0}; this.notifyStatus();
    try {
      if (source) await this.syncCloud(source,path,{background:true});
      else if (this.transport) await this.sync(this.transport,{automatic:true});
      else throw new Error('Configure library cloud sync first.');
      const docs = (await this.call('syncData')).documents.filter(doc => !doc.deleted_at && !doc.replaced_by_id);
      const states = new Map((await this.call('availability',{destination:this.destinationId()})).map(item => [item.id,item]));
      const missing = docs.filter(doc => !states.get(doc.id)?.present);
      state.phase = 'download'; state.total = missing.length; this.notifyStatus();
      await Promise.all(missing.map(async doc => {
        if (this.fullSyncCancelled) { state.cancelled++; return; }
        try { await this.ensureFile(doc.id,this.transport,{group:'full-library',document:doc}); state.completed++; }
        catch (error) { if (error.name === 'AbortError') state.cancelled++; else state.failed++; }
        finally { this.notifyStatus(); }
      }));
      state.phase = this.fullSyncCancelled ? 'cancelled' : state.failed ? 'failed' : 'done';
      return {...state};
    } catch (error) { state.phase = 'failed'; state.error = error.message; throw error; }
    finally { this.fullSyncRunning = false; this.notifyData(); }
  }
  cancelFullSync() { this.fullSyncCancelled = true; this.transfers.cancelWaiting('full-library'); this.notifyStatus(); }
  async downloadPinned(transport) {
    const states = await this.call('availability',{ destination:transport.id });
    const docs = (await this.call('syncData')).documents;
    let downloadFailures = 0;
    await Promise.all(states.filter(state => state.pinned && !state.present && docs.some(doc => doc.id === state.id && !doc.deleted_at)).map(async state => {
      try { await this.ensureFile(state.id,transport); }
      catch { downloadFailures++; } // Metadata remains synced; the file error stays visible.
    }));
    return downloadFailures;
  }
  async releaseDownload(id) {
    if (this.releases.has(id) || this.downloads.has(id) || this.opening?.id === id) throw new Error('Wait for the current score operation.');
    if (this.scores.active?.libraryDocumentId === id) throw new Error('Close this score before releasing its download.');
    if (!this.transport || navigator.onLine === false) throw new Error('Connect and sync before releasing a download.');
    const transport = this.transport;
    this.releases.add(id);
    const release = async () => {
      const info = await this.call('fileInfo',{ id });
      const remote = await transport.listScores();
      if (!remote.some(file => file.path === info.document.storage_path)) throw new Error('This score is not uploaded. Keep its local copy and sync first.');
      await this.call('verifyFile',{ id,file:await transport.readScore(info.document) });
      return this.call('releaseFile',{ id,destination:transport.id });
    };
    try { return await (transport.background ? transport.background(release) : release()); }
    finally { this.releases.delete(id); if (this.syncNeeds) await this.refreshSyncNeeds(); this.notifyData(); }
  }
  scheduleSave(score) {
    score.librarySaveGeneration = (score.librarySaveGeneration || 0) + 1;
    clearTimeout(score.librarySaveTimer);
    this.notifyStatus();
    score.librarySaveTimer = setTimeout(() => this.flush(score).catch(error => {
      score.librarySaveError = error;
      this.warn('Library save failed: ' + error.message);
    }), 300);
  }
  async flush(score) {
    clearTimeout(score.librarySaveTimer);
    if (score.librarySavePromise) await score.librarySavePromise;
    if (!score.libraryDocumentId || score.librarySavedGeneration === score.librarySaveGeneration) return;
    const save = async () => {
      while (score.librarySavedGeneration !== score.librarySaveGeneration) {
        const generation = score.librarySaveGeneration;
        const state = await score.captureLibraryState();
        await this.call('saveState', { documentId: score.libraryDocumentId, ...state });
        score.librarySavedGeneration = generation;
      }
      score.librarySaveError = null;
      score.setDirty(false);
    };
    score.librarySavePromise = save();
    try { await score.librarySavePromise; } finally { score.librarySavePromise = null; this.notifyStatus(); }
  }
  async openDocument(id, anchor, afterSync = false) {
    if (this.opening) {
      if (this.opening.id === id) return this.opening.promise;
      throw new Error('Wait for the current score to open.');
    }
    const promise = this.openDocumentAux(id,anchor,afterSync); this.opening = { id,promise }; this.notifyStatus();
    try { return await promise; } finally { this.opening = null; this.notifyData(); }
  }
  async openDocumentAux(id, anchor, afterSync) {
    if (this.syncPending && this.manualSync && !afterSync) throw new Error('Wait for library sync before opening another score.');
    if (this.scores.active?.libraryDocumentId) await this.flush(this.scores.active);
    const conflicts = await this.call('conflicts');
    if (conflicts.some(conflict => conflict.table === 'documents' && conflict.id === id
      || conflict.table === 'annotations' && conflict.alternatives.some(change => JSON.parse(change.payload_json).document_id === id))) {
      throw new Error('Resolve this score’s conflicting edits before opening it.');
    }
    const active = this.scores.active;
    if (active?.libraryDocumentId === id && !active.disposed && this.scores.navigate) {
      await this.scores.navigate(active,anchor);
      return active;
    }
    await this.ensureFile(id,undefined,{priority:100,front:true});
    const state = await this.call('read', { id });
    return this.scores.open(state,anchor);
  }
  async ensureWorker() {
    if (this.workerStarting) return this.workerStarting;
    this.workerStarting = (async () => {
      if (this.storage === undefined) this.storage = await this.services.host.loadSelection() || {};
      if (await this.services.host.queryStoragePermission(this.storage) !== 'granted') {
        this.setPermissionRequired(true);
        throw new DOMException('Allow access to the remembered library folder to continue.', 'NotAllowedError');
      }
      this.setPermissionRequired(false);
      const deviceStateKey = await this.services.host.deviceStateKey(this.storage || {});
      const deviceState = await this.services.host.loadDeviceState(deviceStateKey) || {};
      let url = globalThis._rostrumPages_?.url('bookshelf-worker.js') ?? new URL('bookshelf-worker.js', location.href).href;
      if (location.protocol === 'file:') {
        this.hostStorage = await this.services.host.openHostStorage(this.storage || {});
        const runtime = this.services.runtime;
        if (!runtime) throw new Error('This build does not contain the library runtime.');
        const decode = value => new Uint8Array([...atob(value)].map(char => char.charCodeAt(0)));
        const workerText = await new Response(new Blob([decode(runtime.worker)]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
        const script = `globalThis.rostrumLibraryWasm = new Uint8Array(await new Response(new Blob([Uint8Array.from(atob(${JSON.stringify(runtime.wasm)}), c=>c.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());\n` + workerText;
        const bytes = new TextEncoder().encode(script);
        let binary = ''; for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
        url = 'data:text/javascript;base64,' + btoa(binary);
      }
      this.worker = new Worker(url, { type: 'module' });
      let readyResolve, readyReject;
      const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
      const startupTimeout = setTimeout(() => readyReject(new Error('Library worker did not finish starting.')), 20000);
      this.worker.onmessage = async ({ data }) => {
        if (data.hostRequest) {
          const methods = {
            list: path => this.hostStorage.files.list(path),
            saveDeviceState: state => this.services.host.saveDeviceState(deviceStateKey,state),
            readDatabase: () => this.hostStorage.readDatabase(), writeDatabase: bytes => this.hostStorage.writeDatabase(bytes), close: () => this.hostStorage.close(), clear: () => this.hostStorage.clear(),
            read: path => this.hostStorage.files.read(path), write: (path, bytes) => this.hostStorage.files.write(path, bytes), remove: path => this.hostStorage.files.remove(path),
          };
          try {
            if (!Object.hasOwn(methods, data.method)) throw new Error('Unknown storage operation');
            const value = await methods[data.method](...data.args);
            this.worker?.postMessage({ hostReply: data.hostRequest, value });
          } catch (error) { this.worker?.postMessage({ hostReply: data.hostRequest, error: error.message, errorName: error.name }); }
          return;
        }
        if (data.ready) { clearTimeout(startupTimeout); readyResolve(); return; }
        const pending = this.pending.get(data.id);
        if (!pending) return;
        this.pending.delete(data.id);
        data.error ? pending.reject(Object.assign(new Error(data.error), { name: data.errorName || 'Error', persistenceFailed: data.persistenceFailed,
          committedValue:data.committedValue })) : pending.resolve(data.value);
      };
      this.worker.onerror = () => {
        clearTimeout(startupTimeout); readyReject(new Error('Could not start library storage.'));
        for (const pending of this.pending.values()) pending.reject(new Error('Could not start library storage.'));
        this.pending.clear(); this.worker.terminate(); this.worker = null;
        this.hostStorage?.close(); this.hostStorage = null;
        this.workerStarting = null;
      };
      await ready;
      await this.send('open', { deviceState, storage: location.protocol === 'file:' ? { kind: 'host' } : this.storage || {} });
      return this.worker;
    })().catch(error => {
      this.worker?.terminate(); this.hostStorage?.close(); this.hostStorage = null;
      this.worker = this.workerStarting = null; throw error;
    });
    return this.workerStarting;
  }
  send(action, args) {
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      this.pending.set(id, { resolve, reject });
      try { this.worker.postMessage({ id, action, args }); }
      catch (error) { this.pending.delete(id); reject(error); }
    });
  }
  async call(action, args = {}) {
    if (this.storageDeleted) throw new Error('Library deletion was incomplete. Choose its storage location again before continuing.');
    if (this.deletingStorage && !['destroyStorage','open','saveState'].includes(action)) throw new Error('Wait for library data deletion.');
    const shared = ['importFile','rememberOriginalLocation','update','link','moveItem','reindex','editSongs','saveState','resolveConflict','useVersion','importBackup','relocateFile'].includes(action);
    const writing = shared || ['mergeDelta','replaceSnapshot','installFile','releaseFile','pinFile'].includes(action);
    if (writing) { this.localSaving++; this.notifyStatus(); }
    try {
      await this.ensureWorker(); const value = await this.send(action,args);
      if (!['backup','export'].includes(action)) this.localError = null;
      if (shared) {
        this.libraryGeneration++;
        this.cloudFacts = null;
        if (this.syncNeeds?.checkedAt) await this.refreshSyncNeeds({id:this.syncNeeds.destination});
        this.autoSync?.request();
      }
      if (shared && action !== 'saveState' || action === 'mergeDelta' && value.addedChanges > 0 || action === 'destroyStorage') this.notifyContent();
      if (writing || action === 'remoteInventory') this.notifyData();
      return value;
    }
    catch (error) {
      if (this.storage?.kind === 'directory' && ['NotAllowedError', 'SecurityError'].includes(error.name)) this.setPermissionRequired(true);
      if (error.persistenceFailed) this.localError = error;
      throw error;
    } finally { if (writing) { this.localSaving--; this.notifyStatus(); } }
  }
  records(table, parent, id) { return this.call('records',{table,parent,id}); }
  update(table, values, expectedRevisionId) {
    if (table === 'documents' && values.deleted_at && this.scores.active?.libraryDocumentId === values.id) throw new Error('Close this score before deleting it');
    return this.call('update',{table,values,expectedRevisionId});
  }
  rename(table, row, name) {
    const metadata = JSON.parse(row.metadata_json);
    const field = table === 'documents' ? 'displayName' : table === 'entries' ? 'title' : 'name';
    const values = table === 'tags' ? {name:name.trim()} : {metadata_json:JSON.stringify({...metadata,[field]:name,
      ...(['documents','entries'].includes(table) ? {userEditedFields:[...new Set([...(metadata.userEditedFields || []),field])]} : {})})};
    return this.update(table,{id:row.id,...values},row.revision_id);
  }
  remove(table, row) { return this.update(table,{id:row.id,deleted_at:new Date().toISOString()},row.revision_id); }
  createCollection(table, name) {
    name = name.trim(); if (!name) return;
    return this.update(table,{id:crypto.randomUUID(),...(table === 'tags' ? {name} : {metadata_json:JSON.stringify({name})})});
  }
  addTag(table, id, tagId) {
    const entry = table === 'entries';
    return this.call('link',{table:entry ? 'entry_tags' : 'document_tags',values:{[entry ? 'entry_id' : 'document_id']:id,tag_id:tagId}});
  }
  addToCollection(table, id, collectionId) {
    const entry = table === 'entries';
    return this.call('link',{table:entry ? 'playlist_items' : 'bookshelf_documents',values:{
      [entry ? 'playlist_id' : 'bookshelf_id']:collectionId,[entry ? 'entry_id' : 'document_id']:id,order_key:String(Date.now())}});
  }
  saveItemNote(table, row, note) {
    return this.update(table,{id:row.id,metadata_json:JSON.stringify({note})},row.revision_id);
  }
  saveSong(row, {composer, aliases, pageIndex}) {
    if (!Number.isInteger(pageIndex) || pageIndex < 0) throw new Error('Enter a valid start page');
    const metadata = JSON.parse(row.metadata_json);
    return this.update('entries',{id:row.id,anchor_json:JSON.stringify({...JSON.parse(row.anchor_json),pageIndex}),
      metadata_json:JSON.stringify({...metadata,composer,aliases:aliases.split(';').map(value => value.trim()).filter(Boolean),
        userEditedFields:[...new Set([...(metadata.userEditedFields || []),'composer','aliases','anchor'])]})},row.revision_id);
  }
  addSong(document, title, pageIndex) {
    if (!title.trim() || !Number.isInteger(pageIndex) || pageIndex < 0) throw new Error('Enter a title and valid start page');
    const metadata = JSON.parse(document.metadata_json);
    return this.update('entries',{id:crypto.randomUUID(),document_id:document.id,
      anchor_json:JSON.stringify({type:/\.pdf$/i.test(metadata.originalFilename) ? 'pdf' : 'music',pageIndex}),
      metadata_json:JSON.stringify({title:title.trim(),source:{type:'manual'},userEditedFields:['title','anchor']})});
  }
  moveItem(table, id, direction) { return this.call('moveItem',{table,id,direction}); }
  conflicts() { return this.call('conflicts'); }
  resolveConflict(options) { return this.call('resolveConflict',options); }
  useVersion(id) { return this.call('useVersion',{id}); }
  pinFile(id, pinned) { return this.call('pinFile',{id,pinned}); }
  collectionDocuments(table, id) { return this.call('collectionDocuments',{table,id}); }
  checkCloudSelection(source, path, options) { return this.checkSyncNeeds(this.makeCloudTransport(source,path),options); }
  storageCapabilities() { return this.services.host.storageCapabilities(); }
  async savedCloudSelection() { await this.ready; return this.cloudSelection; }
  get transferState() {
    const queue = this.transfers;
    const waitingFiles = {upload:[],download:[]};
    for (const job of queue.waiting) waitingFiles[job.direction].push(job.label);
    waitingFiles.upload.push(...this.pendingUploads.values());
    const waiting = {upload:waitingFiles.upload.length,download:waitingFiles.download.length};
    return {size:queue.size,completed:queue.completed,failed:queue.failed,cancelled:queue.cancelled,
      total:queue.completed + queue.failed + queue.cancelled + queue.size + this.pendingUploads.size,waiting,waitingFiles,
      active:queue.active && {direction:queue.active.direction,label:queue.active.label}};
  }

  downloadState(id) {
    const job = this.transfers.jobs.get(this.transferKey(id));
    return {state:job?.state,error:this.fileErrors.get(id)};
  }
  download(id) { return this.ensureFile(id,undefined,{priority:50,front:true}); }
  get cloudPending() {
    const facts = this.cloudFacts;
    return !facts || facts.destination !== this.destinationId() || facts.pending > 0 || !facts.verified || facts.unknown ||
      !!(this.syncNeeds?.destination === facts.destination && this.syncNeeds.uploads > 0);
  }
  updateCloudPending(status, destination) {
    if (destination === this.destinationId()) this.cloudFacts = {...status,destination};
  }
  async availability() {
    const destination = this.destinationId();
    const [states,status] = await Promise.all([this.call('availability',{destination}),this.call('syncStatus',{destination})]);
    if (destination === this.destinationId()) {
      this.updateCloudPending(status,destination);
      this.notifyStatus();
    }
    return new Map(states.map(state => [state.id,state]));
  }
  async query({mode, collection, filters}) {
    if (['bookshelves','playlists'].includes(mode) && !collection) return [];
    if (mode === 'history') return this.call('history');
    if (mode === 'bookshelves') {
      const memberships = await this.records('bookshelf_documents','bookshelf_id',collection);
      const documents = await this.call('list',filters);
      return memberships.sort((a,b) => a.order_key.localeCompare(b.order_key) || a.id.localeCompare(b.id)).flatMap(link => {
        const doc = documents.find(doc => doc.id === link.document_id);
        return doc ? [{...doc,membership:link}] : [];
      });
    }
    if (mode === 'playlists') {
      const memberships = await this.records('playlist_items','playlist_id',collection);
      const entries = await this.records('entries'), documents = await this.records('documents');
      return memberships.sort((a,b) => a.order_key.localeCompare(b.order_key) || a.id.localeCompare(b.id)).map(link => {
        const entry = entries.find(entry => entry.id === link.entry_id);
        const doc = entry && documents.find(doc => doc.id === entry.document_id);
        return entry ? {...entry,membership:link,unavailable:!doc,document_metadata:doc?.metadata_json,previousVersion:!!doc?.replaced_by_id}
          : {id:link.entry_id,metadata_json:'{"title":"Unavailable song"}',membership:link,unavailable:true};
      });
    }
    if (mode === 'entries' || mode === 'tags') return this.call('search',{
      ...filters,tagIds:[...new Set([...filters.tagIds,...(mode === 'tags' && collection ? [collection] : [])])]});
    return this.call('list',filters);
  }
  async analyze(file, previewScore = null) {
    if (!/\.(pdf|mscz|mxl|musicxml|xml|ly)$/i.test(file.name)) throw new Error('Unsupported score format');
    const entries = [];
    const bytes = await file.arrayBuffer();
    const fileHash = await hashLibraryBytes(bytes);
    if (/\.pdf$/i.test(file.name)) {
      const analysis = previewScore || await this.scores.preview(file);
      const pdf = analysis.mozDoc;
      try {
        const walk = async (items, parent_id = null, path = []) => {
          for (const [index,item] of (items || []).entries()) {
            const position = [...path,index];
            let dest = item.dest;
            if (typeof dest === 'string') dest = await pdf.getDestination(dest);
            let pageIndex = null;
            if (Array.isArray(dest)) pageIndex = typeof dest[0] === 'number' ? dest[0] : await pdf.getPageIndex(dest[0]);
            const id = await libraryEntityId(fileHash,'pdf-outline',position);
            const validPage = Number.isInteger(pageIndex) && pageIndex >= 0 && pageIndex < pdf.numPages;
            if (validPage) entries.push({ id, parent_id, anchor: { type: 'pdf', pageIndex }, metadata: { title: item.title,
              source: { type: 'pdf-outline', key: JSON.stringify(position) } } });
            await walk(item.items, validPage ? id : parent_id,position);
          }
        };
        await walk(await pdf.getOutline());
        if (!entries.length) entries.push({ id: await libraryEntityId(fileHash,'root'), anchor: { type: 'pdf', pageIndex: 0 }, metadata: {
          title: analysis.pdfInfo?.Title || file.name.replace(/\.[^.]+$/, ''), composer: '',
          source: { type: 'file-title', key: 'root' } } });
      } finally { if (!previewScore) await analysis.dispose(); }
    }
    if (!entries.length) {
      let title = file.name.replace(/\.[^.]+$/, ''), composer = '', source = 'filename';
      if (!/\.pdf$/i.test(file.name)) {
        const files = isLilyPond(file.name)
          ? { 'score.musicxml': new TextDecoder().decode(previewScore?.music?.lilyPondXml ?? await convertLilyPond(bytes)) }
          : await this.call('musicMetadataFiles', { file });
        let names = Object.keys(files).filter(name => !name.startsWith('META-INF/'));
        if (files['META-INF/container.xml']) {
          const container = new DOMParser().parseFromString(files['META-INF/container.xml'], 'application/xml');
          const main = container.querySelector('rootfile')?.getAttribute('full-path');
          if (main && files[main]) names = [main];
        }
        names.sort((a,b) => a.split('/').length - b.split('/').length);
        for (const name of names) {
          const xml = new DOMParser().parseFromString(files[name], 'application/xml');
          if (xml.querySelector('parsererror')) continue;
          if (xml.documentElement.tagName === 'museScore') {
            const tags = Object.fromEntries([...xml.querySelectorAll('Score > metaTag')].map(tag => [tag.getAttribute('name'), tag.textContent]));
            const titleText = [...xml.querySelectorAll('Text')].find(text => text.querySelector('style')?.textContent === 'title');
            const workTitle = ['無題のスコア','Untitled score'].includes(tags.workTitle) ? '' : tags.workTitle;
            title = workTitle || titleText?.querySelector('text')?.textContent || title;
            composer = tags.composer || ''; source = 'music-metadata'; break;
          }
          if (/^score-(partwise|timewise)$/.test(xml.documentElement.tagName)) {
            title = xml.querySelector('work-title')?.textContent || xml.querySelector('movement-title')?.textContent || title;
            composer = xml.querySelector('creator[type="composer"]')?.textContent || ''; source = 'music-metadata'; break;
          }
        }
      }
      entries.push({ id: await libraryEntityId(fileHash,'root'), anchor: { type: /\.pdf$/i.test(file.name) ? 'pdf' : 'music', pageIndex: 0 },
        metadata: { title, composer, source: { type: source, key: 'root' } } });
    }
    return entries;
  }
  async readOriginalFile(location) {
    const result = await this.services.readOriginalFile(location);
    return new File([result.data],location.name);
  }
  async import(file, options = {}) {
    const existing = await this.call('findImportedFile', { file });
    if (existing) return this.call('importFile',{file,entries:[],...options});
    // importFile checks again in the serial Worker queue for concurrent imports.
    return this.call('importFile', { file, ...await this.prepareImport(file), ...options });
  }
  async prepareImport(file, preview = null) {
    if (!/\.pdf$/i.test(file.name)) return { entries: await this.analyze(file,preview) };
    const score = preview || await this.scores.preview(file);
    try {
      return { entries: await this.analyze(file,score), maxWidth:score.maxWidth, maxHeight:score.maxHeight };
    } finally { if (!preview) await score.dispose(); }
  }
  async importReviewed(file, options = {}, previewScore = null) {
    if (this.reviewPending) throw new Error('Finish the current score import review first.');
    this.reviewPending = true;
    let preview = previewScore;
    try {
      const existing = await this.call('findImportedFile', { file });
      if (existing) return this.call('importFile',{file,entries:[],...options});
      preview ||= await this.scores.preview(file);
      const analysis = await this.prepareImport(file, preview);
      return await this.scores.review(file, analysis.entries, preview, draft => this.call('importFile', { file, ...analysis, ...draft, ...options }),
        this.storage?.kind === 'directory' ? () => this.reauthorizeStorage() : null);
    } finally { try { if (!previewScore) await preview?.dispose(); } finally { this.reviewPending = false; } }
  }
  async reindex(id) {
    await this.ensureFile(id);
    const { document: doc, file } = await this.call('read', { id });
    const named = new File([file], JSON.parse(doc.metadata_json).originalFilename);
    return this.call('reindex', { documentId: id, entries: await this.analyze(named) });
  }
  async editSongs(id) {
    if (this.reviewPending || this.syncPending) throw new Error('Finish the current library operation before editing songs.');
    this.reviewPending = true;
    let preview;
    try {
      if (this.scores.active?.libraryDocumentId) await this.flush(this.scores.active);
      await this.ensureFile(id);
      const state = await this.call('songState', { id });
      let expectedRevisionId = state.document.revision_id;
      let expectedEntries = state.entries.map(row => ({ id:row.id, revision_id:row.revision_id }));
      const records = state.entries.filter(row => !row.deleted_at);
      const metadata = JSON.parse(state.document.metadata_json);
      const file = new File([state.file], metadata.originalFilename);
      preview = await this.scores.preview(file);
      const entries = records.map(row => ({ id:row.id, parent_id:row.parent_id,
        anchor:JSON.parse(row.anchor_json), metadata:JSON.parse(row.metadata_json) }));
      // Keep hierarchy visible even if sync inserted children before parents.
      const byId = new Map(entries.map(entry => [entry.id,entry])), seen = new Set(), ordered = [];
      const visit = entry => {
        if (seen.has(entry.id)) return;
        seen.add(entry.id);
        if (byId.has(entry.parent_id)) visit(byId.get(entry.parent_id));
        ordered.push(entry);
      };
      entries.sort((a,b) => a.anchor.pageIndex - b.anchor.pageIndex || a.id.localeCompare(b.id)).forEach(visit);
      const commit = async draft => {
        try {
          const result = await this.call('editSongs', { documentId:id, expectedRevisionId, expectedEntries, ...draft });
          return result.document;
        } catch (error) {
          // Snapshot backends may commit SQLite before persistence fails. Keep
          // the resulting revisions so a retry can save further draft edits.
          if (error.persistenceFailed && error.committedValue?.document) {
            expectedRevisionId = error.committedValue.document.revision_id;
            expectedEntries = error.committedValue.entries;
          }
          throw error;
        }
      };
      return await this.scores.review(file, ordered, preview, commit, this.storage?.kind === 'directory' ? () => this.reauthorizeStorage() : null,
      { editing:true, displayName:metadata.displayName });
    } finally { try { await preview?.dispose(); } finally { this.reviewPending = false; } }
  }
  async exportBackup() {
    this.emergencyBackup = false;
    if (this.scores.active?.libraryDocumentId) {
      try { await this.flush(this.scores.active); }
      catch (error) {
        if (!error.persistenceFailed) throw error;
        this.emergencyBackup = true;
      }
    }
    if (!this.emergencyBackup) for (const doc of (await this.call('syncData')).documents) await this.ensureFile(doc.id);
    return this.call('backup');
  }
  async importBackup(file) {
    if (this.scores.active?.libraryDocumentId) {
      await this.flush(this.scores.active); await this.scores.active.dispose();
    }
    return this.call('importBackup', { file });
  }
}
