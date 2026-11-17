// +skip
import { hashLibraryBytes, validateLibraryGeneration, listStoredScores, scoreStoragePath } from './bookshelf-format.js';
import { LIBRARY_README } from './bookshelf-readme.js';
export { LibraryCloudTransport };
// -skip

class LibraryCloudTransport {
  static backgroundUsers = new WeakMap();
  constructor(source, path = '') {
    this.source = source;
    const relative = path.replace(/^\/+|\/+$/g, '');
    if (relative && relative.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Choose a valid cloud folder path');
    this.path = relative ? '/' + relative : ''; // CachedSrc uses a leading slash below its root.
    this.id = source.source + ':' + this.path;
  }
  async connect() { await this.source.auth(); await this.source.getDir(this.path,true); await this.ensureFormat(); }
  async ensureFormat({create = false} = {}) {
    if (create) {
      const root = await this.directory('');
      if (!root.files['README.md']) await this.publishRaw('README.md',new Blob([LIBRARY_README],{type:'text/markdown'}));
    }
    return true;
  }
  async background(run) {
    const users = LibraryCloudTransport.backgroundUsers;
    let state = users.get(this.source);
    if (!state) { state = { count:0,previous:this.source.backgroundAuth }; users.set(this.source,state); }
    state.count++; this.source.backgroundAuth = true;
    try { return await run(); }
    finally { if (!--state.count) { this.source.backgroundAuth = state.previous; users.delete(this.source); } }
  }
  full(path) { return this.path + (path ? '/' + path : ''); }
  async directory(path, create = false) {
    if (path) {
      const parts = path.split('/'); let parent = '';
      for (const name of parts) {
        const dir = await this.source.getDir(this.full(parent),true);
        if (!Object.hasOwn(dir.dirs,name)) {
          if (!create) return null;
          try { await this.source.putDir(this.full(parent),name); }
          catch (error) { if (!Object.hasOwn((await this.source.getDir(this.full(parent),true)).dirs,name)) throw error; }
        }
        parent += (parent ? '/' : '') + name;
      }
    }
    return this.source.getDir(this.full(path),true);
  }
  scorePath(doc) { return scoreStoragePath(doc.storage_path); }
  async loadSyncState({coveredVersions = []} = {}) {
    if (typeof this.source.listLibrarySnapshots !== 'function') throw new Error('This source does not support library synchronization');
    const expectedState = await this.source.listLibrarySnapshots(this.full(''));
    const snapshots = [], covered = new Set(coveredVersions);
    for (const entry of expectedState) {
      if (this.source.source === 'pCloud' && !entry.current && covered.has(entry.id + ':' + entry.token)) continue;
      if (entry.size > 256 * 1024 * 1024) throw new Error('Cloud SQLite exceeds the supported 256 MiB size');
      snapshots.push({...entry,file:await this.source.readLibrarySnapshot(this.full(''),entry)});
    }
    return {snapshots,expectedState};
  }
  reservePublication() { return this.source.reserveLibrarySnapshot?.() || crypto.randomUUID(); }
  async publishSnapshot(file,{expectedState,publicationId}) {
    return this.source.publishLibrarySnapshot(this.full(''),file,expectedState,publicationId);
  }
  async cleanup(versions) {
    if (!this.source.removeLibrarySnapshot) return;
    for (const item of versions) await this.source.removeLibrarySnapshot(this.full(''),item);
  }
  async listGenerations() {
    const directory = await this.directory('_sync/generations');
    if (!directory) return [];
    const result = [];
    for (const name of Object.keys(directory.files)) if (/^[a-f0-9]{64}\.json$/.test(name)) {
      const file = await this.readPath('_sync/generations/' + name);
      if (file.size > 1024 * 1024) throw new Error('Invalid restore generation');
      const marker = validateLibraryGeneration(JSON.parse(await file.text()));
      if (await this.generationKey(marker.id) + '.json' !== name) throw new Error('Invalid restore generation identity');
      result.push(marker);
    }
    return result;
  }
  generationKey(id) { return hashLibraryBytes(new TextEncoder().encode(id)); }
  async generationSnapshot(marker) { return this.readPath('_sync/generations/' + await this.generationKey(marker.id) + '.sqlite'); }
  async publishGeneration(marker,file) {
    const key = await this.generationKey(marker.id);
    await this.publishRaw('_sync/generations/' + key + '.sqlite',file);
    await this.publishRaw('_sync/generations/' + key + '.json',new Blob([JSON.stringify(marker)],{type:'application/json'}));
  }
  async restoreRequests() {
    const root = await this.directory('restore');
    return root ? Object.keys(root.dirs).map(name => ({id:name,path:'restore/' + name})) : [];
  }
  async listScores() {
    await this.ensureFormat();
    return listStoredScores({directory:path => this.directory(path)});
  }
  async readPath(path) {
    const parts = path.split('/'), name = parts.pop(), parent = parts.join('/');
    const dir = await this.directory(parent), file = dir?.files[name];
    if (!file) throw Object.assign(new Error('Cloud file is missing: ' + path),{name:'NotFoundError'});
    return new Blob([await this.source.getFileSrc(this.full(parent),name,dir,file)]);
  }
  async readScore(doc) { await this.ensureFormat(); return this.readPath(this.scorePath(doc)); }
  async publish(path, file) {
    await this.ensureFormat({create:true});
    return this.publishRaw(path,file,true);
  }
  async publishRaw(path,file,guard = false) {
    const parts = path.split('/'), name = parts.pop(), parent = parts.join('/');
    const directory = await this.directory(parent,true);
    if (Object.hasOwn(directory.files,name)) {
      // An interrupted attempt may have published before its acknowledgement.
      const existing = await this.readPath(path);
      const digest = async blob => [...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].join(',');
      if (existing.size !== file.size || await digest(existing) !== await digest(file)) throw Object.assign(new Error('A different cloud file already exists at ' + path),{retrySync:true});
      return;
    }
    const pending = '.rostrum-' + crypto.randomUUID() + '.pending';
    try {
      await this.source.putFile(this.full(parent),pending,file);
      await this.source.getDir(this.full(parent),true);
      if (guard) await this.ensureFormat();
      await this.source.renameFile(this.full(parent),pending,name);
    } catch (error) {
      try { await this.source.getDir(this.full(parent),true); await this.source.trashFile(this.full(parent),pending); } catch { /* Keep the original failure. */ }
      throw error;
    }
  }
  writeScore(doc,file) { return this.publish(this.scorePath(doc),file); }
}
