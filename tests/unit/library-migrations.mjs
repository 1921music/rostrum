import {test} from 'node:test';
import assert from 'node:assert/strict';
import sqliteInit from '@sqlite.org/sqlite-wasm';
import {migrateLibrarySchema,migrateLibraryRecords,migrateLibraryStorage} from '../../src/bookshelf-migrations.js';
import {hashLibraryBytes,storageLayouts,decodeLibraryRecord,upgradeLibraryEnvelope,validateLibraryFormat,libraryFormat,createScorePath} from '../../src/bookshelf-format.js';
import {createLibrarySchemaV2} from '../../src/bookshelf-schema.js';

const sqlite=await sqliteInit();let sequence=0;
function database(bytes){
 const name='/migration-test-'+(++sequence)+'.sqlite';if(bytes)sqlite.capi.sqlite3_js_posix_create_file(name,bytes);
 const handle=new sqlite.oo1.DB(name);let durable=bytes;
 return{exec:(sql,bind=[])=>handle.exec({sql,bind,rowMode:'object',returnValue:'resultRows'}),
  async flush(){if(this.beforeFlush)await this.beforeFlush();durable=sqlite.capi.sqlite3_js_db_export(handle);},
  snapshot:()=>durable,close:()=>handle.close()};
}
async function fresh(){
 const db=database();db.exec('PRAGMA foreign_keys=ON');
 await migrateLibrarySchema(db,{create:()=>{
  db.exec('CREATE TABLE documents(id TEXT PRIMARY KEY,storage_path TEXT UNIQUE,content_hash TEXT,size_bytes INTEGER)');
  db.exec('CREATE TABLE entries(id TEXT PRIMARY KEY,document_id TEXT REFERENCES documents(id),title TEXT)');
  db.exec('CREATE TABLE annotations(id TEXT PRIMARY KEY,document_id TEXT REFERENCES documents(id),ink TEXT)');
  db.exec('CREATE TABLE changes(id TEXT PRIMARY KEY,payload_json TEXT)');db.exec('CREATE TABLE local_state(key TEXT PRIMARY KEY,value TEXT)');
 }});return db;
}
function filesystem(){
 const map=new Map();return{map,writes:[],removals:[],
  async read(path){if(!map.has(path))throw new DOMException('Missing','NotFoundError');return map.get(path);},
  async write(path,bytes){map.set(path,new Blob([bytes instanceof Blob?await bytes.arrayBuffer():bytes]));this.writes.push(path);if(this.afterWrite)await this.afterWrite(path);},
  async remove(path){if(!map.has(path))throw new DOMException('Missing','NotFoundError');map.delete(path);this.removals.push(path);if(this.afterRemove)await this.afterRemove(path);}
 };
}
async function fixture(){
 const db=await fresh(),files=filesystem();const id='00000000-0000-0000-0000-000000000001',path=createScorePath(id,'Original.pdf'),blob=new Blob(['unchanged score bytes']);
 db.exec('INSERT INTO documents VALUES(?,?,?,?)',[id,path,await hashLibraryBytes(await blob.arrayBuffer()),blob.size]);
 db.exec('INSERT INTO entries VALUES(?,?,?)',['song',id,'My song']);db.exec('INSERT INTO annotations VALUES(?,?,?)',['ink',id,'writing']);
 db.exec('INSERT INTO changes VALUES(?,?)',['revision',JSON.stringify({id,storage_path:path})]);
 db.exec('INSERT INTO local_state VALUES(?,?)',['file:'+id,JSON.stringify({present:true,pinned:true})]);await db.flush();files.map.set(path,blob);
 return{db,files,id,path};
}
const layouts=new Map([...storageLayouts,[2,path=>'scores/moved/'+path.slice(7)],[3,path=>'scores/final/'+path.slice(7)]]);
const steps=new Map([[1,()=>{}],[2,()=>{}]]);
const migrate=(db,files,target=2)=>migrateLibraryStorage(db,files,{target,layouts,steps});
function identities(db){return{docs:db.exec('SELECT * FROM documents'),entries:db.exec('SELECT * FROM entries'),ink:db.exec('SELECT * FROM annotations'),history:db.exec('SELECT * FROM changes')};}

test('baseline records both versions and schema upgrades preserve IDs, links and history',async()=>{
 const {db}=await fixture(),before=identities(db);
 await migrateLibrarySchema(db,{target:4,steps:new Map([[2,d=>d.exec('ALTER TABLE entries ADD COLUMN composer TEXT')],[3,d=>d.exec('CREATE INDEX song_title ON entries(title)')]])});
 assert.equal(db.exec('PRAGMA user_version')[0].user_version,4);assert.equal(db.exec('SELECT * FROM library_info')[0].storage_format_version,1);
 assert.deepEqual(db.exec('SELECT id,document_id,title FROM entries'),before.entries);assert.deepEqual(db.exec('SELECT * FROM changes'),before.history);
 assert.equal(db.exec("SELECT * FROM library_migrations WHERE kind='schema'").length,3);db.close();
});
test('fresh installations run the frozen production baseline then the same future schema steps',async()=>{
 const db=database();await migrateLibrarySchema(db,{create:()=>createLibrarySchemaV2(db),target:3,steps:new Map([[2,d=>d.exec('ALTER TABLE entries ADD COLUMN composer TEXT')]])});
 assert.equal(db.exec('PRAGMA user_version')[0].user_version,3);assert.equal(db.exec('PRAGMA table_info(entries)').filter(c=>c.name==='composer').length,1);
 assert.ok(db.exec('PRAGMA table_info(changes)').some(c=>c.name==='record_version'));db.close();
});
test('a failed schema step rolls back its DDL and version; retry applies only that step',async()=>{
 const db=await fresh();let fails=true;
 const chain=new Map([[2,d=>{d.exec('ALTER TABLE entries ADD COLUMN composer TEXT');if(fails)throw new Error('interrupted');}]]);
 await assert.rejects(migrateLibrarySchema(db,{target:3,steps:chain}),/interrupted/);
 assert.equal(db.exec('PRAGMA user_version')[0].user_version,2);assert.equal(db.exec('PRAGMA table_info(entries)').some(c=>c.name==='composer'),false);
 fails=false;await migrateLibrarySchema(db,{target:3,steps:chain});assert.equal(db.exec('PRAGMA user_version')[0].user_version,3);db.close();
});
test('future schema, storage and record versions stop before any DB changes',async()=>{
 for(const sql of ['PRAGMA user_version=99','UPDATE library_info SET storage_format_version=99','UPDATE library_info SET record_format_version=99']){
  const db=await fresh();db.exec(sql);const before=db.exec('SELECT * FROM library_migrations');
  await assert.rejects(migrateLibrarySchema(db),/Unsupported/);assert.deepEqual(db.exec('SELECT * FROM library_migrations'),before);db.close();
 }
});
test('missing schema steps are rejected before modifying a populated library',async()=>{
 const db=await fresh();await assert.rejects(migrateLibrarySchema(db,{target:4,steps:new Map([[2,d=>d.exec('DROP TABLE entries')]])}),/Missing/);
 assert.ok(db.exec('PRAGMA table_info(entries)').length);assert.equal(db.exec('PRAGMA user_version')[0].user_version,2);db.close();
});
test('file layout changes preserve records, annotations and raw revision payloads',async()=>{
 const {db,files,path}=await fixture(),before=identities(db);await migrate(db,files,3);
 assert.deepEqual(identities(db),before);assert.equal(files.map.has(path),false);assert.equal(await files.map.get('scores/final/'+path.slice(7)).text(),'unchanged score bytes');
 assert.equal(db.exec('SELECT storage_format_version FROM library_info')[0].storage_format_version,3);db.close();
});
test('interruption after copy resumes from the durable journal without duplicate writes',async()=>{
 let {db,files,path}=await fixture();files.afterWrite=()=>{throw new Error('power loss');};
 await assert.rejects(migrate(db,files),/power loss/);assert.ok(files.map.has(path));const bytes=db.snapshot();db.close();db=database(bytes);
 files.afterWrite=null;await migrate(db,files);assert.equal(files.writes.length,1);assert.equal(files.map.has(path),false);db.close();
});
test('failed DB persistence never deletes the source; reopening safely resumes',async()=>{
 let {db,files,path}=await fixture();db.beforeFlush=()=>{if(db.exec('SELECT storage_format_version FROM library_info')[0].storage_format_version===2)throw new Error('disk full');};
 await assert.rejects(migrate(db,files),/disk full/);assert.ok(files.map.has(path));const bytes=db.snapshot();db.close();db=database(bytes);
 assert.equal(db.exec('SELECT storage_format_version FROM library_info')[0].storage_format_version,1);await migrate(db,files);assert.equal(files.map.has(path),false);db.close();
});
test('interruption after source removal resumes cleanup with the verified destination',async()=>{
 let {db,files,path}=await fixture();files.afterRemove=()=>{throw new Error('power loss');};await assert.rejects(migrate(db,files),/power loss/);
 const bytes=db.snapshot();db.close();db=database(bytes);files.afterRemove=null;await migrate(db,files);
 assert.equal(files.map.has(path),false);assert.equal(db.exec("SELECT phase FROM library_migrations WHERE kind='storage'")[0].phase,'done');db.close();
});
test('corrupt destination and missing local source leave the format and original intact',async()=>{
 const {db,files,path}=await fixture();files.map.set('scores/moved/'+path.slice(7),new Blob(['wrong']));
 await assert.rejects(migrate(db,files),/verification failed/);assert.ok(files.map.has(path));assert.equal(db.exec('SELECT storage_format_version FROM library_info')[0].storage_format_version,1);db.close();
 const next=await fixture();next.files.map.delete(next.path);await assert.rejects(migrate(next.db,next.files),/local score is missing/);next.db.close();
});
test('cloud-only files migrate metadata without downloading or inventing local copies',async()=>{
 const {db,files,id,path}=await fixture();files.map.delete(path);db.exec('UPDATE local_state SET value=? WHERE key=?',[JSON.stringify({present:false,pinned:false}),'file:'+id]);await db.flush();
 await migrate(db,files);assert.equal(files.writes.length,0);assert.equal(files.map.size,0);assert.equal(db.exec('SELECT storage_format_version FROM library_info')[0].storage_format_version,2);db.close();
});
test('tampered checkpoint paths cannot overwrite unrelated files',async()=>{
 const {db,files}=await fixture();files.afterWrite=()=>{throw new Error('stop');};await assert.rejects(migrate(db,files),/stop/);files.afterWrite=null;
 db.exec("UPDATE library_file_moves SET to_path='library.sqlite'");files.map.set('library.sqlite',new Blob(['keep']));
 await assert.rejects(migrate(db,files),/checkpoint identity/);assert.equal(await files.map.get('library.sqlite').text(),'keep');db.close();
});
test('record and backup upgrades are explicit pure adapters preserving original history',()=>{
 const row={id:'score',storage_path:'scores/key.pdf'},raw=JSON.stringify(row);
 const decoded=decodeLibraryRecord('documents',row,2,3,new Map([[2,(_table,r)=>({...r,newField:'default'})]]));
 assert.equal(decoded.newField,'default');assert.equal(JSON.stringify(row),raw);
 const packet={format:'rostrum-library',version:2,changes:[{id:'revision',payload_json:raw}]};
 const updated=upgradeLibraryEnvelope(packet,'rostrum-library',3,new Map([[2,p=>({...p,version:3})]]));
 assert.equal(packet.version,2);assert.deepEqual(updated.changes,packet.changes);
 assert.throws(()=>decodeLibraryRecord('documents',row,99),/Unsupported/);assert.throws(()=>upgradeLibraryEnvelope(packet,'rostrum-library',3,new Map()),/Missing/);
 assert.throws(()=>validateLibraryFormat({...libraryFormat(),migration:{to:2}}),/in progress/);
});
test('record migration rebuilds current rows from revisions while preserving raw history and identities',async()=>{
 const db=database();await migrateLibrarySchema(db,{create:()=>{
  db.exec('CREATE TABLE documents(id TEXT PRIMARY KEY,revision_id TEXT,storage_path TEXT,content_hash TEXT,size_bytes INTEGER,label TEXT,composer TEXT)');
  db.exec('CREATE TABLE changes(id TEXT PRIMARY KEY,entity_type TEXT,entity_id TEXT,payload_json TEXT,record_version INTEGER)');
 }});
 const row={id:'score',revision_id:'revision',storage_path:'scores/key.pdf',content_hash:'hash',size_bytes:3,label:'Old title'};
 db.exec('INSERT INTO documents VALUES(?,?,?,?,?,?,NULL)',[row.id,row.revision_id,row.storage_path,row.content_hash,row.size_bytes,row.label]);
 db.exec('INSERT INTO changes VALUES(?,?,?,?,?)',['revision','documents','score',JSON.stringify(row),2]);
 const history=db.exec('SELECT * FROM changes');
 const upgrades=new Map([[2,(_table,value)=>({...value,composer:'Composer'})]]);
 await migrateLibraryRecords(db,['documents'],{target:3,upgrades});
 assert.deepEqual(db.exec('SELECT * FROM changes'),history);assert.equal(db.exec('SELECT * FROM documents')[0].composer,'Composer');
 assert.equal(db.exec('SELECT * FROM library_info')[0].record_format_version,3);db.close();
});
test('record decoder failure rolls back materialized rows and format version',async()=>{
 const db=database();await migrateLibrarySchema(db,{create:()=>{
  db.exec('CREATE TABLE tags(id TEXT PRIMARY KEY,revision_id TEXT,name TEXT)');db.exec('CREATE TABLE changes(id TEXT PRIMARY KEY,entity_type TEXT,entity_id TEXT,payload_json TEXT,record_version INTEGER)');
 }});
 for(const id of ['a','b']){const row={id,revision_id:id,name:id};db.exec('INSERT INTO tags VALUES(?,?,?)',[id,id,id]);db.exec('INSERT INTO changes VALUES(?,?,?,?,?)',[id,'tags',id,JSON.stringify(row),2]);}
 await assert.rejects(migrateLibraryRecords(db,['tags'],{target:3,upgrades:new Map([[2,(_table,row)=>{if(row.id==='b')throw new Error('failed');return{...row,name:'changed'};}]])}),/failed/);
 assert.deepEqual(db.exec('SELECT name FROM tags').map(row=>row.name),['a','b']);assert.equal(db.exec('SELECT record_format_version FROM library_info')[0].record_format_version,2);db.close();
});
