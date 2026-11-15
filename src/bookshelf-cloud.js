// +skip
import { LIBRARY_NAMESPACE, libraryFormat, validateLibraryFormat, LibraryFormatError, listStoredScores, scoreStoragePath } from './bookshelf-format.js';
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
    const parent = await this.source.getDir(this.path,true);
    if (!Object.hasOwn(parent.dirs,LIBRARY_NAMESPACE)) {
      if (!create) return null;
      try { await this.source.putDir(this.path,LIBRARY_NAMESPACE); }
      catch (error) { if (!Object.hasOwn((await this.source.getDir(this.path,true)).dirs,LIBRARY_NAMESPACE)) throw error; }
    }
    const root = await this.source.getDir(this.full(''),true);
    if (Object.hasOwn(root.files,'library-format.json')) {
      const file = new Blob([await this.source.getFileSrc(this.full(''),'library-format.json',root,root.files['library-format.json'])]);
      if (file.size > 4096) throw new LibraryFormatError('Invalid library format manifest.');
      return validateLibraryFormat(JSON.parse(await file.text()));
    }
    if (Object.keys(root.dirs).length || Object.keys(root.files).some(name => !/^\.rostrum-[0-9a-f-]{36}\.pending$/i.test(name))) throw new LibraryFormatError('Missing format manifest in a non-empty library. No data was changed.');
    if (!create) return null;
    const format = libraryFormat();
    await this.publishRaw('library-format.json',new Blob([JSON.stringify(format)],{type:'application/json'}));
    return format;
  }
  async background(run) {
    const users = LibraryCloudTransport.backgroundUsers;
    let state = users.get(this.source);
    if (!state) { state = { count:0,previous:this.source.backgroundAuth }; users.set(this.source,state); }
    state.count++; this.source.backgroundAuth = true;
    try { return await run(); }
    finally { if (!--state.count) { this.source.backgroundAuth = state.previous; users.delete(this.source); } }
  }
  full(path) { return this.path + '/' + LIBRARY_NAMESPACE + (path ? '/' + path : ''); }
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
  batchPath(id) {
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid batch identity');
    return 'changes/' + id + '.json';
  }
  scorePath(doc) {
    return scoreStoragePath(doc.storage_path);
  }
  async listChanges() {
    if (!await this.ensureFormat()) return [];
    const root = await this.directory('changes'); if (!root) return [];
    const result = [];
    for (const deviceId of Object.keys(root.dirs)) if (/^[0-9a-f-]{36}$/i.test(deviceId)) {
      const dir = await this.directory('changes/' + deviceId);
      for (const name of Object.keys(dir.files)) if (/^[0-9a-f-]{36}\.json$/i.test(name)) result.push({ id:deviceId + '/' + name.slice(0,-5) });
    }
    return result;
  }
  async listScores() {
    const format = await this.ensureFormat();
    return format ? listStoredScores({directory:path => this.directory(path)},format.storageFormatVersion) : [];
  }
  async readPath(path) {
    const parts = path.split('/'), name = parts.pop(), parent = parts.join('/');
    const dir = await this.directory(parent), file = dir?.files[name];
    if (!file) throw new Error('Cloud file is missing: ' + path);
    return new Blob([await this.source.getFileSrc(this.full(parent),name,dir,file)]);
  }
  async readChanges(id) { await this.ensureFormat(); return this.readPath(this.batchPath(id)); }
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
      if (existing.size !== file.size || await digest(existing) !== await digest(file)) throw new Error('A different cloud file already exists at ' + path);
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
  writeChanges(id,file) { return this.publish(this.batchPath(id),file); }
  writeScore(doc,file) { return this.publish(this.scorePath(doc),file); }
}
