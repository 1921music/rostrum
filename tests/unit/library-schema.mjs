import {test} from 'node:test';
import assert from 'node:assert/strict';
import sqliteInit from '@sqlite.org/sqlite-wasm';
import {initializeLibrarySchema} from '../../src/bookshelf-schema.js';
const sqlite=await sqliteInit();
function database(){
 const handle=new sqlite.oo1.DB(':memory:');
 return {exec:(sql,bind=[])=>handle.exec({sql,bind,rowMode:'object',returnValue:'resultRows'}),flushes:0,async flush(){this.flushes++;},close:()=>handle.close()};
}
test('new databases have version information and no migration-only tables',async()=>{
 const db=database();await initializeLibrarySchema(db);
 assert.equal(db.exec('PRAGMA user_version')[0].user_version,4);
 const names=db.exec("SELECT name FROM sqlite_schema WHERE type='table'").map(row=>row.name);
 assert.equal(names.length,13);assert.ok(!names.includes('library_migrations'));assert.ok(!names.includes('library_file_moves'));
 assert.equal(db.exec('SELECT * FROM library_info')[0].storage_format_version,2);
 await initializeLibrarySchema(db);assert.equal(db.flushes,1);db.close();
});
test('unsupported schema, data and storage versions are not modified',async()=>{
 for(const sql of ['PRAGMA user_version=99','UPDATE library_info SET storage_format_version=99','UPDATE library_info SET record_format_version=99']){
  const db=database();await initializeLibrarySchema(db);db.exec(sql);const before=db.exec('SELECT * FROM library_info'),flushes=db.flushes;
  await assert.rejects(initializeLibrarySchema(db),/Unsupported/);assert.deepEqual(db.exec('SELECT * FROM library_info'),before);assert.equal(db.flushes,flushes);db.close();
 }
});
