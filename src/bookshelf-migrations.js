import { LIBRARY_APPLICATION_ID, LIBRARY_SCHEMA_VERSION, LIBRARY_STORAGE_VERSION, LIBRARY_RECORD_VERSION,
  LibraryFormatError, storageLayouts, scoreStoragePath, hashLibraryBytes, recordUpgrades, decodeLibraryRecord } from './bookshelf-format.js';

export const schemaMigrations = new Map();
export const storageMigrations = new Map();
const INITIAL_SCHEMA_VERSION = 2;
function transaction(db,run) {
  db.exec('BEGIN IMMEDIATE');
  try { const result = run(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
export function createMigrationTables(db) {
  db.exec('CREATE TABLE library_info (id INTEGER PRIMARY KEY CHECK(id=1), storage_format_version INTEGER NOT NULL, record_format_version INTEGER NOT NULL)');
  db.exec('INSERT INTO library_info VALUES (1,?,?)',[LIBRARY_STORAGE_VERSION,LIBRARY_RECORD_VERSION]);
  db.exec('CREATE TABLE library_migrations (kind TEXT NOT NULL, from_version INTEGER NOT NULL, to_version INTEGER NOT NULL, phase TEXT NOT NULL, completed_at TEXT, PRIMARY KEY(kind,to_version))');
  db.exec('CREATE TABLE library_file_moves (target_version INTEGER NOT NULL, logical_path TEXT NOT NULL, from_path TEXT NOT NULL, to_path TEXT NOT NULL, content_hash TEXT NOT NULL, size_bytes INTEGER NOT NULL, was_present INTEGER NOT NULL, state TEXT NOT NULL, PRIMARY KEY(target_version,logical_path))');
}
export async function migrateLibrarySchema(db,{create,target = LIBRARY_SCHEMA_VERSION,steps = schemaMigrations} = {}) {
  if (!Number.isSafeInteger(target) || target < INITIAL_SCHEMA_VERSION) throw new LibraryFormatError('Invalid target schema version.');
  const version = db.exec('PRAGMA user_version')[0].user_version;
  const app = db.exec('PRAGMA application_id')[0].application_id;
  const names = db.exec("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  if (app && app !== LIBRARY_APPLICATION_ID || !app && names.length || !version && names.length) throw new LibraryFormatError('The selected database is not a versioned Rostrum library.');
  if (version > target || version && version < INITIAL_SCHEMA_VERSION) throw new LibraryFormatError('Unsupported library schema. Pre-versioned data is not migrated; use a new library. Newer schemas require an updated Rostrum.');
  if (version) {
    const info = db.exec('SELECT * FROM library_info WHERE id=1')[0];
    if (!info || !Number.isSafeInteger(info.record_format_version) || info.record_format_version < 2 || info.record_format_version > LIBRARY_RECORD_VERSION || !Number.isSafeInteger(info.storage_format_version) || info.storage_format_version < 1 || info.storage_format_version > LIBRARY_STORAGE_VERSION) throw new LibraryFormatError('Unsupported library data or storage format. Update Rostrum before modifying this database.');
    for (let v = info.record_format_version; v < LIBRARY_RECORD_VERSION; v++) if (!recordUpgrades.has(v)) throw new LibraryFormatError('Missing library record migration. Update Rostrum.');
  }
  if (!version) {
    if (!create) throw new Error('A new library requires a schema initializer.');
    transaction(db,() => {
      create(); createMigrationTables(db);
      db.exec(`PRAGMA application_id=${LIBRARY_APPLICATION_ID}`);
      db.exec(`PRAGMA user_version=${INITIAL_SCHEMA_VERSION}`);
      db.exec("INSERT INTO library_migrations VALUES ('schema',0,?,'done',?)",[INITIAL_SCHEMA_VERSION,new Date().toISOString()]);
    });
    await db.flush();
  }
  // Require the complete chain before committing even the first step.
  let current = version || INITIAL_SCHEMA_VERSION;
  for (let v = current; v < target; v++) if (!steps.has(v)) throw new LibraryFormatError('Missing database migration step. Update Rostrum.');
  while (current < target) {
    const from = current, to = current + 1;
    transaction(db,() => {
      if (steps.get(from).constructor.name === 'AsyncFunction') throw new Error('Schema migrations must be synchronous transactions.');
      const before = db.exec('SELECT * FROM library_info WHERE id=1')[0];
      const result = steps.get(from)(db);
      if (result?.then) throw new Error('Schema migrations must be synchronous transactions.');
      const after = db.exec('SELECT * FROM library_info WHERE id=1')[0];
      if (after.storage_format_version !== before.storage_format_version || after.record_format_version !== before.record_format_version) throw new Error('Schema steps cannot change file or record formats; use their migration engines.');
      if (db.exec('PRAGMA foreign_key_check').length) throw new Error('Database migration broke a library reference.');
      db.exec(`PRAGMA user_version=${to}`);
      db.exec("INSERT INTO library_migrations VALUES ('schema',?,?,'done',?)",[from,to,new Date().toISOString()]);
    });
    await db.flush(); current = to;
  }
  const info = db.exec('SELECT * FROM library_info WHERE id=1')[0];
  if (!info || info.record_format_version > LIBRARY_RECORD_VERSION) throw new LibraryFormatError('Unsupported library record format. Update Rostrum.');
  return info;
}
export async function migrateLibraryRecords(db,tables,{target = LIBRARY_RECORD_VERSION,upgrades = recordUpgrades} = {}) {
  let current = db.exec('SELECT record_format_version FROM library_info WHERE id=1')[0]?.record_format_version;
  if (!Number.isSafeInteger(target) || !Number.isSafeInteger(current) || current < 2 || current > target) throw new LibraryFormatError('Unsupported library record format. Update Rostrum.');
  for (let v = current; v < target; v++) if (!upgrades.has(v)) throw new LibraryFormatError('Missing library record migration. Update Rostrum.');
  while (current < target) {
    const to = current + 1;
    transaction(db,() => {
      for (const table of tables) {
        if (!/^[a-z_]+$/.test(table)) throw new Error('Invalid library table');
        const columns = db.exec(`PRAGMA table_info(${table})`).map(column => column.name);
        for (const row of db.exec(`SELECT * FROM ${table}`)) {
          const change = db.exec('SELECT * FROM changes WHERE id=?',[row.revision_id])[0];
          if (!change || change.entity_type !== table || change.entity_id !== row.id) throw new Error('Missing migration source revision.');
          const decoded = decodeLibraryRecord(table,JSON.parse(change.payload_json),change.record_version,to,upgrades);
          if (decoded.id !== row.id || decoded.revision_id !== row.revision_id || Object.keys(decoded).some(key => !columns.includes(key))) throw new Error('Record migration changed identity or produced unknown fields.');
          if (table === 'documents' && ['storage_path','content_hash','size_bytes'].some(key => decoded[key] !== row[key])) throw new Error('Record migration cannot change score identity or contents; use a storage layout migration.');
          const keys = columns.filter(key => key !== 'id');
          db.exec(`UPDATE ${table} SET ${keys.map(key => key + '=?').join(',')} WHERE id=?`,[...keys.map(key => Object.hasOwn(decoded,key) ? decoded[key] : row[key]),row.id]);
        }
      }
      if (db.exec('PRAGMA foreign_key_check').length) throw new Error('Record migration broke a library reference.');
      db.exec('UPDATE library_info SET record_format_version=? WHERE id=1',[to]);
      db.exec("INSERT INTO library_migrations VALUES ('records',?,?,'done',?)",[current,to,new Date().toISOString()]);
    });
    await db.flush(); current = to;
  }
}
async function readOptional(files,path) {
  try { return await files.read(path); }
  catch (error) { if (error.name === 'NotFoundError') return null; throw error; }
}
async function verify(file,entry) {
  if (!file || file.size !== entry.size_bytes || await hashLibraryBytes(await file.arrayBuffer()) !== entry.content_hash) throw new Error('Migration file verification failed: ' + entry.logical_path);
}
// Called only while normal library operations are gated and the backend writer
// lock is held. SQL checkpoints must be durable BEFORE any source is removed.
export async function migrateLibraryStorage(db,rawFiles,{target = LIBRARY_STORAGE_VERSION,layouts = storageLayouts,steps = storageMigrations} = {}) {
  if (!Number.isSafeInteger(target) || target < 1) throw new LibraryFormatError('Invalid target storage version.');
  let current = db.exec('SELECT storage_format_version FROM library_info WHERE id=1')[0]?.storage_format_version;
  if (!Number.isSafeInteger(current) || current < 1 || current > target || !layouts.has(current) || !layouts.has(target)) throw new LibraryFormatError('Unsupported library storage version. Update Rostrum.');
  for (let v = current; v < target; v++) if (!steps.has(v) || !layouts.has(v + 1)) throw new LibraryFormatError('Missing file storage migration step. Update Rostrum.');
  for (;;) {
    let run = db.exec("SELECT * FROM library_migrations WHERE kind='storage' AND phase<>'done' ORDER BY to_version LIMIT 1")[0];
    if (!run && current === target) break;
    if (!run) {
      const to = current + 1;
      // The step can validate the transition but cannot mutate history/IDs.
      await steps.get(current)({db,from:current,to});
      const docs = db.exec('SELECT id,storage_path,content_hash,size_bytes FROM documents');
      const entries = [];
      for (const doc of docs) {
        const source = scoreStoragePath(doc.storage_path,current,layouts), destination = scoreStoragePath(doc.storage_path,to,layouts);
        const file = await readOptional(rawFiles,source);
        if (file) await verify(file,{...doc,logical_path:doc.storage_path});
        const local = db.exec('SELECT value FROM local_state WHERE key=?',['file:' + doc.id])[0];
        if (!file && local && JSON.parse(local.value).present) throw new Error('A local score is missing; restore it before migrating: ' + doc.storage_path);
        entries.push({logical:doc.storage_path,source,destination,hash:doc.content_hash,size:doc.size_bytes,present:!!file});
      }
      const destinations = new Set(entries.map(e => e.destination)), sources = new Set(entries.map(e => e.source));
      if (destinations.size !== entries.length || entries.some(e => e.destination !== e.source && sources.has(e.destination))) throw new Error('File migration paths overlap.');
      transaction(db,() => {
        db.exec("INSERT INTO library_migrations VALUES ('storage',?,?,'copying',NULL)",[current,to]);
        for (const e of entries) db.exec('INSERT INTO library_file_moves VALUES (?,?,?,?,?,?,?,?)',[to,e.logical,e.source,e.destination,e.hash,e.size,e.present ? 1 : 0,e.present ? 'planned' : 'absent']);
      });
      await db.flush(); run = {from_version:current,to_version:to,phase:'copying'};
    }
    if (run.to_version > target || !layouts.has(run.from_version) || !layouts.has(run.to_version) || !steps.has(run.from_version)) throw new LibraryFormatError('A newer file migration is pending. Update Rostrum to resume it.');
    const entries = db.exec('SELECT * FROM library_file_moves WHERE target_version=?',[run.to_version]);
    if (run.to_version !== run.from_version + 1 || run.phase === 'copying' && current !== run.from_version || run.phase === 'cleanup' && current !== run.to_version) throw new Error('Invalid file migration checkpoint versions.');
    for (const e of entries) {
      const doc = db.exec('SELECT content_hash,size_bytes FROM documents WHERE storage_path=?',[e.logical_path])[0];
      if (!doc || doc.content_hash !== e.content_hash || doc.size_bytes !== e.size_bytes || e.from_path !== scoreStoragePath(e.logical_path,run.from_version,layouts) || e.to_path !== scoreStoragePath(e.logical_path,run.to_version,layouts)) throw new Error('Invalid file migration checkpoint identity.');
    }
    if (run.phase === 'copying') {
      for (const e of entries.filter(e => e.was_present)) {
        // Never overwrite another file, and re-verify copied targets on resume.
        let destination = await readOptional(rawFiles,e.to_path);
        if (!destination) {
          const source = await readOptional(rawFiles,e.from_path); await verify(source,e);
          await rawFiles.write(e.to_path,source); destination = await rawFiles.read(e.to_path);
        }
        await verify(destination,e);
        transaction(db,() => db.exec("UPDATE library_file_moves SET state='copied' WHERE target_version=? AND logical_path=?",[run.to_version,e.logical_path]));
        await db.flush();
      }
      transaction(db,() => {
        db.exec('UPDATE library_info SET storage_format_version=? WHERE id=1',[run.to_version]);
        db.exec("UPDATE library_migrations SET phase='cleanup' WHERE kind='storage' AND to_version=?",[run.to_version]);
      });
      await db.flush(); run.phase = 'cleanup'; current = run.to_version;
    }
    if (run.phase !== 'cleanup') throw new Error('Invalid file migration checkpoint.');
    for (const e of entries.filter(e => e.was_present)) {
      // Even after switching, keep the old copy if the new copy was damaged.
      await verify(await readOptional(rawFiles,e.to_path),e);
      if (e.from_path !== e.to_path) try { await rawFiles.remove(e.from_path); }
      catch (error) { if (error.name !== 'NotFoundError') throw error; }
      transaction(db,() => db.exec("UPDATE library_file_moves SET state='cleaned' WHERE target_version=? AND logical_path=?",[run.to_version,e.logical_path]));
      await db.flush();
    }
    transaction(db,() => db.exec("UPDATE library_migrations SET phase='done',completed_at=? WHERE kind='storage' AND to_version=?",[new Date().toISOString(),run.to_version]));
    await db.flush(); current = run.to_version;
  }
  return current;
}
export function versionedLibraryFiles(rawFiles,version) {
  return {
    read:path => rawFiles.read(scoreStoragePath(path,version)),
    write:(path,bytes) => rawFiles.write(scoreStoragePath(path,version),bytes),
    remove:path => rawFiles.remove(scoreStoragePath(path,version)),
  };
}
