async function installDeltaCloud(page) {
  await page.evaluate(async () => {
    await _bookshelf_.setAutoSync(false);
    const cloud = window.deltaCloud = { batches:new Map(),scores:new Map(),calls:[],failFiles:false,failChanges:false,corrupt:false,reverse:false };
    cloud.transport = {
      id:'mock-cloud',
      async listChanges() { cloud.calls.push({ kind:'list' }); const list = [...cloud.batches.keys()].map(id => ({ id })); return cloud.reverse ? list.reverse() : list; },
      async readChanges(id) { cloud.calls.push({ kind:'readChanges',id }); return cloud.batches.get(id); },
      async writeChanges(id,file) { cloud.calls.push({ kind:'writeChanges',id,size:file.size }); if (cloud.failChanges) throw new Error('Upload failed'); if (cloud.batches.has(id)) throw new Error('Batch overwritten'); cloud.batches.set(id,file); },
      async listScores() { return [...cloud.scores].map(([path,file]) => ({ path,size:file.size })); },
      async readScore(doc) { cloud.calls.push({ kind:'readScore',id:doc.id }); if (cloud.pauseRead) await new Promise(resolve => { cloud.resumeRead = resolve; }); if (!cloud.scores.has(doc.storage_path)) throw new Error('Missing score'); return cloud.corrupt ? new Blob(['corrupt']) : cloud.scores.get(doc.storage_path); },
      async writeScore(doc,file) { cloud.calls.push({ kind:'writeScore',id:doc.id,size:file.size }); if (cloud.failFiles) throw new Error('File upload failed'); if (cloud.scores.has(doc.storage_path)) throw new Error('Score overwritten'); cloud.scores.set(doc.storage_path,file); },
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
      async putFile(path,name,bytes) { const files = directories.get(path).files; if (files.has(name)) throw new Error('Overwrite'); files.set(name,{ name,bytes,size:bytes.size }); cloud.calls.push({ kind:'put',path,name }); },
      async renameFile(path,name,newName) { if (cloud.failPublish) throw new Error('Publication failed'); const files = directories.get(path).files; if (files.has(newName)) throw new Error('Overwrite'); files.set(newName,files.get(name)); files.delete(name); cloud.calls.push({ kind:'publish',path,name:newName }); },
      async trashFile(path,name) { directories.get(path).files.delete(name); },
    };
    const original = _FileSrc_.get;
    _FileSrc_.get = ref => ref === 'pCloud' ? cloud.source : original.call(_FileSrc_,ref);
  });
}
module.exports = { installDeltaCloud,installProviderCloud };
