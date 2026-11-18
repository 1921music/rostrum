const {createHash} = require('node:crypto');
const {zipSync} = require('fflate');

let sqliteRuntime;
const sqlite = () => sqliteRuntime ||= import('@sqlite.org/sqlite-wasm').then(module => module.default());
const deferred = () => { let resolve; const promise = new Promise(done => resolve = done); return {promise,resolve}; };
class Reply { constructor(status,json) { Object.assign(this,{status,json}); } }
class ResponseError extends Error {
  constructor(status,body = {},abort = false) { super('Mock HTTP ' + status); Object.assign(this,{status,body,abort}); }
}
function multipart(request) {
  const boundary = request.headers()['content-type'].match(/boundary=(?:"([^"]+)"|([^;]+))/);
  if (!boundary) throw new Error('Missing multipart boundary');
  const body = request.postDataBuffer(), delimiter = Buffer.from('--' + (boundary[1] || boundary[2]));
  const parts = []; let start = body.indexOf(delimiter);
  while (start >= 0) {
    const headers = start + delimiter.length + 2, split = body.indexOf('\r\n\r\n',headers);
    const end = body.indexOf(delimiter,headers);
    if (split < 0 || end < 0) break;
    parts.push({headers:body.subarray(headers,split).toString(),bytes:body.subarray(split+4,end-2)});
    start = end;
  }
  return parts;
}

// A stateful HTTP fake, not a replacement for FileSrc or LibraryCloudTransport.
// Hooks are one-shot deterministic barriers/faults at the server boundary.
class ProviderCloudServer {
  constructor(provider) {
    this.provider = provider; this.serial = 0; this.version = 0;
    this.nodes = new Map(); this.sessions = new Map(); this.revisions = new Map();
    this.hooks = []; this.releases = []; this.requests = []; this.commits = []; this.unexpected = [];
    this.conflicts = 0; this.pageSize = 1000;
    this.root = provider === 'pCloud' ? 0 : 'root';
    this.nodes.set(this.root,{id:this.root,name:'',parent:null,folder:true});
    this.mkdir(this.root,'scores'); this.write(this.root,'README.md',Buffer.from('# Rostrum Library\n'));
  }
  id() { return this.provider === 'pCloud' ? ++this.serial : 'id' + ++this.serial; }
  children(id) { const nodes=[...this.nodes.values()].filter(node => node.parent === id);return this.reverseListing?nodes.reverse():nodes; }
  find(parent,name) { return this.children(parent).find(node => node.name === name); }
  path(node) { return node.parent === null ? '' : (this.path(this.nodes.get(node.parent)) + '/' + node.name).replace(/^\//,''); }
  at(path) {
    let node = this.nodes.get(this.root);
    for (const name of path.replace(/^\/+|\/+$/g,'').split('/').filter(Boolean)) node = node && this.find(node.id,name);
    return node;
  }
  mkdir(parent,name) {
    const previous = this.find(parent,name); if (previous) return previous;
    const node = {id:this.id(),parent,name,folder:true}; this.nodes.set(node.id,node); return node;
  }
  put(path,bytes) {
    const names = path.split('/'); const name = names.pop(); let parent = this.nodes.get(this.root);
    for (const part of names.filter(Boolean)) parent = this.mkdir(parent.id,part);
    return this.write(parent.id,name,Buffer.from(bytes));
  }
  write(parent,name,bytes,{id,independent = false} = {}) {
    let node = !independent && this.find(parent,name);
    if (!node) { node = {id:id ?? this.id(),parent,name,folder:false,history:[]}; this.nodes.set(node.id,node); }
    if (node.bytes) node.history.push({bytes:node.bytes,revision:node.revision,hash:node.hash});
    node.bytes = Buffer.from(bytes); node.revision = ++this.version;
    node.hash = createHash('sha256').update(node.bytes).digest('hex');
    this.revisions.set('r' + node.revision,{node,bytes:node.bytes,revision:node.revision,hash:node.hash});
    return node;
  }
  remove(node) { if (node) this.nodes.delete(node.id); }
  removeTree(prefix) { const nodes=[...this.nodes.values()].filter(node=>{const path=this.path(node);return path===prefix||path.startsWith(prefix+'/');});for(const node of nodes)this.remove(node); }
  sqlite() { return this.children(this.root).filter(node => this.kind(node.name) === 'sqlite'); }
  kind(path) {
    if (/^library(?:-[a-f0-9-]{36})?\.sqlite$/.test(path)) return 'sqlite';
    if (/^_sync\/generations\/[a-f0-9]{64}\.json$/.test(path)) return 'marker';
    if (/^_sync\/generations\/[a-f0-9]{64}\.sqlite$/.test(path)) return 'recovery';
    return path.startsWith('scores/') ? 'score' : 'other';
  }
  pause(device,phase,kind = 'sqlite') {
    const arrived = deferred(), released = deferred();
    this.releases.push(() => released.resolve());
    this.hooks.push({device,phase,kind,run:async event => { arrived.resolve(event); await released.promise; }});
    return {arrived:arrived.promise,release:() => released.resolve()};
  }
  fault(device,phase,kind = 'sqlite',status = 503) {
    this.hooks.push({device,phase,kind,run:() => { throw new ResponseError(status,{error:'injected failure'},status === 'abort'); }});
  }
  once(device,phase,kind,run) { this.hooks.push({device,phase,kind,run}); }
  async event(device,phase,path,extra = {}) {
    const event = {device,phase,path,kind:this.kind(path),...extra};
    const index = this.hooks.findIndex(hook => hook.device === device && hook.phase === phase && hook.kind === event.kind);
    if (index >= 0) { const [hook] = this.hooks.splice(index,1); await hook.run(event); }
  }
  async commit(device,parent,name,bytes,options = {}) {
    const path = (this.path(this.nodes.get(parent)) + '/' + name).replace(/^\//,'');
    await this.event(device,'beforeCommit',path,{bytes});
    if (this.kind(path) === 'sqlite') await this.auditSnapshot(bytes);
    // Token comparison and mutation are one uninterrupted server operation.
    const previous = this.find(parent,name);
    if (options.condition !== undefined && (options.condition === null ? !!previous : !previous || 'r' + previous.revision !== options.condition)) {
      this.conflicts++; throw new ResponseError(this.provider === 'Dropbox' ? 409 : 412,{error_summary:'path/conflict/',error:{code:'preconditionFailed'}});
    }
    if (options.independent && this.nodes.has(options.id)) throw new ResponseError(409);
    const node = this.write(parent,name,bytes,options);
    this.commits.push({device,path,id:node.id,revision:node.revision,bytes:Buffer.from(bytes)});
    const committed={...node};
    await this.event(device,'afterCommit',path,{node,bytes});
    return committed;
  }
  async auditSnapshot(bytes) {
    const runtime=await sqlite(),filename='/provider-audit-'+this.id()+'.sqlite';
    runtime.capi.sqlite3_js_posix_create_file(filename,new Uint8Array(bytes));
    const db=new runtime.oo1.DB(filename,'r');
    try {
      const rows=sql=>db.exec({sql,rowMode:'object',returnValue:'resultRows'});
      if(rows("SELECT name FROM sqlite_schema WHERE name='local_state'").length)throw new Error('Device state was published');
      if(rows('PRAGMA foreign_key_check').length)throw new Error('Broken foreign keys were published');
      for(const doc of rows('SELECT * FROM documents WHERE deleted_at IS NULL AND replaced_by_id IS NULL')){
        const file=this.at(doc.storage_path);
        if(!file || file.bytes.length!==doc.size_bytes || createHash('sha256').update(file.bytes).digest('hex')!==doc.content_hash)throw new Error('SQLite was published before its score: '+doc.storage_path);
      }
    }finally{db.close();runtime.wasm.xWrap('sqlite3__wasm_vfs_unlink','int',['sqlite3_vfs*','string'])(runtime.capi.sqlite3_vfs_find(0),filename);}
  }
  async read(device,node,version) {
    if (!node || !this.nodes.has(node.id)) throw new ResponseError(404);
    const path = node.originPath || this.path(node);
    await this.event(device,'beforeRead',path,{node});
    if (!this.nodes.has(node.id)) throw new ResponseError(404);
    const bytes = Buffer.from(version?.bytes || node.bytes);
    await this.event(device,'afterRead',path,{node,bytes}); return bytes;
  }
  async removeVersion(device,node) {
    if (!node) throw new ResponseError(404);
    await this.event(device,'beforeDelete',this.path(node),{node}); this.remove(node);
  }
  async rename(device,node,parent,name) {
    if (!node) throw new ResponseError(404);
    const path=(this.path(this.nodes.get(parent))+'/'+name).replace(/^\//,'');
    await this.event(device,'beforeRename',path,{node});
    node.parent=parent;node.name=name;
    await this.event(device,'afterRename',path,{node});
    return node;
  }
  metadata(node) {
    if (!node) throw new ResponseError(404);
    const shared = {id:String(node.id),name:node.name,size:node.bytes?.length || 0};
    if (this.provider === 'Drive') return {...shared,mimeType:node.folder ? 'application/vnd.google-apps.folder' : 'application/octet-stream',version:String(node.revision || 1)};
    if (this.provider === 'Dropbox') return {...shared,'.tag':node.folder ? 'folder' : 'file',rev:'r' + node.revision,path_display:'/' + this.path(node)};
    if (this.provider === 'OneDrive') return {...shared,...(node.folder ? {folder:{}} : {file:{}}),eTag:'r' + node.revision};
    return {...shared,id:(node.folder?'d':'f')+node.id,isfolder:node.folder,...(node.folder ? {folderid:node.id} : {fileid:node.id,hash:node.hash})};
  }
  paginate(items,offset = 0) { return items.slice(offset,offset + this.pageSize); }
  async install(context,device) {
    await context.route('**/*',async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === 'http://127.0.0.1:9876') return route.continue();
      const allowed = {Drive:['www.googleapis.com'],Dropbox:['api.dropboxapi.com','content.dropboxapi.com'],OneDrive:['graph.microsoft.com','upload.mock.invalid'],pCloud:['api.pcloud.com']};
      if (!allowed[this.provider].includes(url.hostname)) { this.unexpected.push(request.url()); return route.abort(); }
      if (request.method() === 'OPTIONS') return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}});
      this.requests.push({device,url:request.url(),method:request.method()});
      try {
        const value = await this[this.provider === 'Drive' ? 'drive' : this.provider === 'Dropbox' ? 'dropbox' : this.provider === 'OneDrive' ? 'onedrive' : 'pcloud'](device,request,url);
        if(value instanceof Reply)return value.status===204?route.fulfill({status:204,body:''}):route.fulfill({status:value.status,json:value.json});
        return Buffer.isBuffer(value) ? route.fulfill({body:value,contentType:'application/octet-stream'}) : route.fulfill({json:value ?? {}});
      } catch (error) {
        if (error instanceof ResponseError) {
          if (error.abort) return route.abort('failed');
          return route.fulfill({status:error.status,json:error.body});
        }
        this.unexpected.push(request.method() + ' ' + url.pathname + ': ' + error.message);
        return route.fulfill({status:500,json:{error:error.message}});
      }
    });
  }
  async drive(device,request,url) {
    const method = request.method(), path = url.pathname.replace(/\/$/,'');
    const id = path.split('/').at(-1), node = this.nodes.get(id), body = request.postDataBuffer();
    if (id === 'generateIds') return {ids:[this.id()]};
    if (method === 'GET' && id === 'files') {
      const query = url.searchParams.get('q'), parent = query.match(/'([^']+)' in parents/)[1];
      let nodes = this.children(parent); if (query.includes("name = 'library.sqlite'")) nodes = nodes.filter(node => node.name === 'library.sqlite');
      await this.event(device,'beforeList',query.includes('library.sqlite') ? 'library.sqlite' : this.path(this.nodes.get(parent)));
      const offset = Number(url.searchParams.get('pageToken') || 0), page = this.paginate(nodes,offset);
      return {files:page.map(node => this.metadata(node)),...(offset+page.length<nodes.length ? {nextPageToken:String(offset+page.length)} : {})};
    }
    if (method === 'GET' && url.searchParams.get('alt') === 'media') return this.read(device,node);
    if (method === 'GET') { if (!node) throw new ResponseError(404);return this.metadata(node); }
    if (method === 'POST' && id === 'files' && url.searchParams.get('uploadType') === 'multipart') {
      const parts = multipart(request), metadata = JSON.parse(parts[0].bytes.toString());
      return this.metadata(await this.commit(device,metadata.parents[0],metadata.name,parts[1].bytes,{id:metadata.id,independent:true}));
    }
    if (method === 'POST' && id === 'files') {
      const metadata = JSON.parse(body.toString());
      return this.metadata(metadata.mimeType?.endsWith('.folder') ? this.mkdir(metadata.parents[0],metadata.name) : this.write(metadata.parents[0],metadata.name,Buffer.alloc(0)));
    }
    if (method === 'PATCH' && url.searchParams.get('uploadType') === 'media') return this.metadata(await this.commit(device,node.parent,node.name,body));
    if (method === 'PATCH') {
      if (!node) throw new ResponseError(404);
      const metadata = JSON.parse(body.toString());
      if (metadata.trashed) { await this.removeVersion(device,node); return {}; }
      if (metadata.name) await this.rename(device,node,node.parent,metadata.name);
      return this.metadata(node);
    }
    throw new Error('Unsupported Drive request');
  }
  async dropbox(device,request,url) {
    const api = url.pathname.split('/files/')[1], buffer = request.postDataBuffer() || Buffer.alloc(0);
    const args = request.headers()['dropbox-api-arg'] ? JSON.parse(request.headers()['dropbox-api-arg']) : buffer.length ? JSON.parse(buffer.toString()) : {};
    if (api === 'list_folder' || api === 'list_folder/continue') {
      const [path,offset] = api.endsWith('/continue') ? JSON.parse(args.cursor) : [args.path,0];
      const folder = this.at(path); if (!folder) throw new ResponseError(409,{error_summary:'path/not_found/'});
      const children = this.children(folder.id), page = this.paginate(children,offset);
      return {entries:page.map(node => this.metadata(node)),has_more:offset+page.length<children.length,cursor:JSON.stringify([path,offset+page.length])};
    }
    if (api === 'get_metadata') {
      const node = this.at(args.path); if (!node) throw new ResponseError(409,{error_summary:'path/not_found/'});
      await this.event(device,'beforeList',this.path(node),{node});return this.metadata(node);
    }
    if (api === 'download') {
      const revision = args.path.startsWith('rev:') && this.revisions.get(args.path.slice(4));
      const node = revision?.node || this.nodes.get(args.path) || this.at(args.path);
      if (!node) throw new ResponseError(409,{error_summary:'path/not_found/'});
      return this.read(device,node,revision);
    }
    if (api === 'upload_session/start') { const id = this.id(); this.sessions.set(id,{chunks:[]}); return {session_id:id}; }
    if (api.startsWith('upload_session/')) {
      const session = this.sessions.get(args.cursor.session_id);
      if (args.cursor.offset !== Buffer.concat(session.chunks).length) throw new Error('Noncontiguous Dropbox chunks');
      session.chunks.push(buffer);
      if (api.endsWith('append_v2')) return {};
      const names = args.commit.path.split('/'), name = names.pop(), parent = this.at(names.join('/'));
      const mode = args.commit.mode, condition = mode?.['.tag'] === 'update' ? mode.update : mode?.['.tag'] === 'add' ? null : undefined;
      return this.metadata(await this.commit(device,parent.id,name,Buffer.concat(session.chunks),{condition}));
    }
    if (api === 'create_folder_v2') { const names=args.path.split('/'),name=names.pop(); return {metadata:this.metadata(this.mkdir(this.at(names.join('/')).id,name))}; }
    if (api === 'move_v2') { const node=this.at(args.from_path),names=args.to_path.split('/'),name=names.pop();return {metadata:this.metadata(await this.rename(device,node,this.at(names.join('/')).id,name))}; }
    if (api === 'delete_v2') { const node=this.at(args.path); await this.removeVersion(device,node); return {}; }
    throw new Error('Unsupported Dropbox request');
  }
  async onedrive(device,request,url) {
    const method=request.method(), body=request.postDataBuffer() || Buffer.alloc(0);
    if (url.hostname === 'upload.mock.invalid') {
      const session=this.sessions.get(url.pathname.slice(1));
      if (method === 'DELETE') { this.sessions.delete(url.pathname.slice(1)); return new Reply(204); }
      if (!session) throw new ResponseError(404);
      const range=request.headers()['content-range'].match(/bytes (\d+)-(\d+)\/(\d+)/);
      if (Number(range[1]) !== Buffer.concat(session.chunks).length) throw new Error('Noncontiguous OneDrive chunks');
      session.chunks.push(body);
      if (!session.defer && Number(range[2])+1 === Number(range[3])) return this.metadata(await this.commit(device,session.parent,session.name,Buffer.concat(session.chunks)));
      return new Reply(202,{nextExpectedRanges:[String(Number(range[2])+1)]});
    }
    const relative=decodeURIComponent(url.pathname.split('/me/drive/')[1]);
    const parentId=relative.startsWith('root') ? this.root : relative.slice(6).split(/[/:]/)[0];
    const parent=this.nodes.get(parentId);
    if (method === 'GET' && relative.endsWith('/children')) {
      const children=this.children(parentId),offset=Number(url.searchParams.get('offset')||0),page=this.paginate(children,offset);
      return {value:page.map(node=>this.metadata(node)),...(offset+page.length<children.length?{'@odata.nextLink':url.origin+url.pathname+'?offset='+(offset+page.length)}:{})};
    }
    if (method === 'GET' && relative.endsWith('/content')) return this.read(device,parent);
    if (method === 'GET') { const node=relative.includes(':/') ? this.find(parentId,relative.split(':/')[1]) : parent;
      if(node)await this.event(device,'beforeList',this.path(node),{node});return this.metadata(node); }
    if (method === 'DELETE') { await this.removeVersion(device,parent); return {}; }
    const args=JSON.parse(body.toString());
    if (method === 'POST' && relative.endsWith('/createUploadSession')) {
      const id=this.id(),name=relative.includes(':/')?relative.split(':/')[1].split(':/')[0]:parent.name;
      this.sessions.set(id,{parent:relative.includes(':/')?parentId:parent.parent,name,chunks:[],defer:args.deferCommit});
      return {uploadUrl:'https://upload.mock.invalid/'+id};
    }
    if (method === 'PUT' && args['@microsoft.graph.sourceUrl']) {
      const session=this.sessions.get(new URL(args['@microsoft.graph.sourceUrl']).pathname.slice(1));
      if (!session.defer) throw new Error('SQLite session did not defer commit');
      const condition=request.headers()['if-match'] ?? (args['@microsoft.graph.conflictBehavior']==='fail'?null:undefined);
      return this.metadata(await this.commit(device,parentId,args.name,Buffer.concat(session.chunks),{condition}));
    }
    if (method === 'POST' && relative.endsWith('/children')) return this.metadata(this.mkdir(parentId,args.name));
    if (method === 'PATCH') return this.metadata(await this.rename(device,parent,parent.parent,args.name));
    if (method === 'DELETE') { await this.removeVersion(device,parent); return {}; }
    throw new Error('Unsupported OneDrive request');
  }
  async pcloud(device,request,url) {
    const args=Object.fromEntries(url.searchParams), api=url.pathname.slice(1), number=name=>Number(args[name]);
    const node=this.nodes.get(number('fileid'));
    if (api === 'listfolder') {
      const folder=this.nodes.get(number('folderid'));
      if (folder.id === this.root) await this.event(device,'beforeList','library.sqlite');
      return {result:0,metadata:{...this.metadata(folder),contents:this.children(folder.id).map(node=>this.metadata(node))}};
    }
    if (api === 'createfolder') return {result:0,metadata:this.metadata(this.mkdir(number('folderid'),args.name))};
    if (api === 'listrevisions') {
      return {result:7010,error:'Invalid link referer.'};
    }
    if (api === 'stat') return node ? {result:0,metadata:this.metadata(node)} : {result:2009,error:'File not found'};
    if (api === 'copyfile') {
      const parent=number('tofolderid'), path=(this.path(this.nodes.get(parent))+'/'+args.toname).replace(/^\//,'');
      await this.event(device,'beforeCopy',path,{node});
      if (!node || !this.nodes.has(node.id)) return {result:2009,error:'File not found'};
      if (args.noover === '1' && this.find(parent,args.toname)) {
        this.conflicts++;
        return {result:2004,error:'File or folder already exists.'};
      }
      const copy=this.write(parent,args.toname,node.bytes);
      await this.event(device,'afterCopy',path,{node:copy});
      return {result:0,metadata:this.metadata(copy)};
    }
    if (api === 'getzip') {
      const file=this.nodes.get(Number(args.fileids));
      if (!file) return {result:2009,error:'File not found'};
      try { return Buffer.from(zipSync({[file.name]:await this.read(device,file)})); }
      catch (error) { if (error.status !== 404) throw error; return {result:2009,error:'File not found'}; }
    }
    if (api === 'uploadfile') {
      const part=multipart(request).find(part=>part.headers.includes('name="file"'));
      const name=part.headers.match(/filename="([^"]+)"/)[1];
      return {result:0,metadata:[this.metadata(await this.commit(device,number('folderid'),name,part.bytes))]};
    }
    if (api === 'renamefile') { if (!node) return {result:2009,error:'File not found'}; return {result:0,metadata:this.metadata(await this.rename(device,node,node.parent,args.toname))}; }
    if (api === 'deletefile') {
      if (!node) return {result:2009,error:'File not found'};
      await this.removeVersion(device,node); return {result:0};
    }
    throw new Error('Unsupported pCloud request');
  }
}
module.exports = {ProviderCloudServer};
