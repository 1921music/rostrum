import {test} from 'node:test';
import assert from 'node:assert/strict';
import sqliteInit from '@sqlite.org/sqlite-wasm';
import {initializeLibrarySchema} from '../../src/bookshelf-schema.js';
const sqlite=await sqliteInit();
function database(){
 const handle=new sqlite.oo1.DB(':memory:');
 return {exec:(sql,bind=[])=>handle.exec({sql,bind,rowMode:'object',returnValue:'resultRows'}),flushes:0,async flush(){this.flushes++;},close:()=>handle.close()};
}
async function previousDatabase(){
 const db=database();await initializeLibrarySchema(db);
 db.exec('CREATE TABLE library_migrations(kind TEXT,phase TEXT)');db.exec("INSERT INTO library_migrations VALUES('schema','done')");
 db.exec('CREATE TABLE library_file_moves(path TEXT)');db.exec('PRAGMA user_version=2');
 db.exec("INSERT INTO documents(id,revision_id,content_hash,storage_path,size_bytes) VALUES('score','revision','hash','scores/key.pdf',3)");
 db.exec("INSERT INTO entries(id,revision_id,document_id,anchor_json) VALUES('song','song-revision','score','{}')");
 db.exec("INSERT INTO annotations(id,revision_id,document_id,anchor_json,content_json) VALUES('ink','ink-revision','score','{}','{}')");
 db.exec("INSERT INTO changes VALUES('revision','device','documents','score','[]','raw history','now',2)");
 return db;
}
test('new databases have version information and no migration-only tables',async()=>{
 const db=database();await initializeLibrarySchema(db);
 assert.equal(db.exec('PRAGMA user_version')[0].user_version,3);
 const names=db.exec("SELECT name FROM sqlite_schema WHERE type='table'").map(row=>row.name);
 assert.equal(names.length,13);assert.ok(!names.includes('library_migrations'));assert.ok(!names.includes('library_file_moves'));
 assert.equal(db.exec('SELECT * FROM library_info')[0].storage_format_version,1);
 await initializeLibrarySchema(db);assert.equal(db.flushes,1);db.close();
});
test('simplifying v2 removes only unused tables and keeps scores, links and history',async()=>{
 const db=await previousDatabase(),before=['documents','entries','annotations','changes'].map(table=>db.exec('SELECT * FROM '+table));
 await initializeLibrarySchema(db);
 assert.deepEqual(['documents','entries','annotations','changes'].map(table=>db.exec('SELECT * FROM '+table)),before);
 assert.equal(db.exec('PRAGMA user_version')[0].user_version,3);
 assert.equal(db.exec("SELECT name FROM sqlite_schema WHERE name IN ('library_migrations','library_file_moves')").length,0);db.close();
});
test('a failed cleanup rolls back both table removal and schema version',async()=>{
 const db=await previousDatabase(),exec=db.exec;
 db.exec=(sql,bind)=>{if(sql.includes('DROP TABLE IF EXISTS library_migrations'))throw new Error('failure');return exec(sql,bind);};
 await assert.rejects(initializeLibrarySchema(db),/failure/);
 assert.equal(exec('PRAGMA user_version')[0].user_version,2);
 assert.equal(exec("SELECT name FROM sqlite_schema WHERE name IN ('library_migrations','library_file_moves')").length,2);
 db.exec=exec;await initializeLibrarySchema(db);assert.equal(db.exec('PRAGMA user_version')[0].user_version,3);db.close();
});
test('unsupported schema, data and storage versions are not modified',async()=>{
 for(const sql of ['PRAGMA user_version=99','UPDATE library_info SET storage_format_version=99','UPDATE library_info SET record_format_version=99']){
  const db=database();await initializeLibrarySchema(db);db.exec(sql);const before=db.exec('SELECT * FROM library_info'),flushes=db.flushes;
  await assert.rejects(initializeLibrarySchema(db),/Unsupported/);assert.deepEqual(db.exec('SELECT * FROM library_info'),before);assert.equal(db.flushes,flushes);db.close();
 }
});
