async function installDeltaCloud(page) {
  await page.evaluate(async () => {
    await _bookshelf_.setAutoSync(false);
    const cloud = window.deltaCloud = { batches:new Map(),scores:new Map(),generations:new Map(),requests:new Map(),calls:[],failFiles:false,failChanges:false,corrupt:false,reverse:false };
    cloud.transport = {
      id:'mock-cloud',
      async loadSyncState() {
        cloud.calls.push({kind:'list'});
        const snapshots = [...cloud.batches].map(([id,file]) => ({id,file}));
        return {snapshots:cloud.reverse ? snapshots.reverse() : snapshots,expectedState:[...cloud.batches.keys()]};
      },
      reservePublication:() => crypto.randomUUID(),
      async publishSnapshot(file,{publicationId}) {
        cloud.calls.push({kind:'publishSnapshot',id:publicationId,size:file.size});
        if (cloud.failChanges) throw new Error('Upload failed');
        cloud.batches.set(publicationId,file); return true;
      },
      async cleanup() {},
      async listGenerations() { return [...cloud.generations.values()].map(item => item.marker); },
      async generationKey(id) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id)))].map(n=>n.toString(16).padStart(2,'0')).join(''); },
      async generationSnapshot(marker) { return cloud.generations.get(marker.id).file; },
      async publishGeneration(marker,file) { cloud.generations.set(marker.id,{marker,file}); },
      async restoreRequests() { return [...cloud.requests.keys()].map(id => ({id,path:'restore/' + id})); },
      async readPath(path) { const parts=path.split('/'),files=cloud.requests.get(parts[1]); const file=files?.get(parts.slice(2).join('/')); if (!file) throw Object.assign(new Error('Missing file'),{name:'NotFoundError'}); return file; },
      async listScores() { return [...cloud.scores].map(([path,file]) => ({ path,size:file.size })); },
      async readScore(doc) { cloud.calls.push({ kind:'readScore',id:doc.id }); if (cloud.pauseRead) await new Promise(resolve => { cloud.resumeRead = resolve; }); if (!cloud.scores.has(doc.storage_path)) throw new Error('Missing score'); return cloud.corrupt ? new Blob(['corrupt']) : cloud.scores.get(doc.storage_path); },
      async writeScore(doc,file) { cloud.calls.push({ kind:'writeScore',id:doc.id,size:file.size }); if (cloud.failFiles) throw new Error('File upload failed'); if (cloud.scores.has(doc.storage_path)) { if (new Uint8Array(await cloud.scores.get(doc.storage_path).arrayBuffer()).join(',') !== new Uint8Array(await file.arrayBuffer()).join(',')) throw new Error('Score overwritten'); return; } cloud.scores.set(doc.storage_path,file); },
    };
  });
}

async function installProviderCloud(page) {
  await page.evaluate(async () => {
    await _bookshelf_.setAutoSync(false);
    const directories = new Map([['',{ files:new Map(),dirs:new Map() }],['/My library',{ files:new Map(),dirs:new Map() }]]);
    directories.get('').dirs.set('My library',{});
    const cloud = window.providerCloud = { directories,calls:[],failPublish:false };
    cloud.source = {
      source:'pCloud', async auth() { cloud.calls.push({ kind:'auth',background:!!this.backgroundAuth }); },
      async getDir(path) { cloud.calls.push({ kind:'directory',path }); const dir = directories.get(path); if (!dir) throw new Error('No such folder: ' + path); return { files:Object.fromEntries(dir.files),dirs:Object.fromEntries(dir.dirs) }; },
      async putDir(path,name) { const dir = directories.get(path); const child = path + '/' + name; if (directories.has(child)) throw new Error('Folder exists'); directories.set(child,{ files:new Map(),dirs:new Map() }); dir.dirs.set(name,{}); },
      async getFileSrc(path,name) { cloud.calls.push({ kind:'read',path,name }); return directories.get(path).files.get(name).bytes; },
      async putFile(path,name,bytes) { const files = directories.get(path).files; if (files.has(name)) throw new Error('Overwrite'); const copy = new Blob([bytes instanceof Blob ? await bytes.arrayBuffer() : bytes]); files.set(name,{ name,bytes:copy,size:copy.size }); cloud.calls.push({ kind:'put',path,name }); },
      async renameFile(path,name,newName) { if (cloud.failPublish) throw new Error('Publication failed'); const files = directories.get(path).files; if (files.has(newName)) throw new Error('Overwrite'); files.set(newName,files.get(name)); files.delete(name); cloud.calls.push({ kind:'publish',path,name:newName }); },
      async trashFile(path,name) { directories.get(path).files.delete(name); },
    };
    let serial=0; const snapshots=new Map();
    cloud.source.listLibrarySnapshots = async path => {
      const file=directories.get(path).files.get('library.sqlite');
      return file ? [{id:'revision:' + file.revision,token:String(file.revision),size:file.size,current:true}] : [];
    };
    cloud.source.readLibrarySnapshot = async (path,item) => snapshots.get(item.id) || directories.get(path).files.get('library.sqlite').bytes;
    cloud.source.publishLibrarySnapshot = async (path,file) => {
      if(cloud.failPublish)throw new Error('Publication failed');
      const revision=++serial;
      directories.get(path).files.set('library.sqlite',{name:'library.sqlite',bytes:file,size:file.size,revision});
      snapshots.set('revision:' + revision,file);cloud.calls.push({kind:'publish',path,name:'library.sqlite'});return true;
    };
    const original = _FileSrc_.get;
    _FileSrc_.get = ref => ref === 'pCloud' ? cloud.source : original.call(_FileSrc_,ref);
  });
}
module.exports = { installDeltaCloud,installProviderCloud };
