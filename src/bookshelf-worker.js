import { request as hostRequest } from './bookshelf-storage-bridge.js';
import { openSnapshotDatabase } from './bookshelf-storage-snapshot.js';
import { LIBRARY_README } from './bookshelf-readme.js';
import { openLibraryStorage } from './bookshelf-storage.js';
import { openConfiguredLibraryStorage } from './bookshelf-storage-policy.js';
import { strToU8, unzipSync, zipSync } from 'fflate';
import { exportLibraryPackage, readLibraryPackage, hashBytes, scorePath } from './bookshelf-transfer.js';
import { LIBRARY_SCHEMA_VERSION, LIBRARY_RECORD_VERSION, createScorePath, checkRecordVersion, libraryEntityId, isVersionedLibraryName, hashLibraryBytes } from './bookshelf-format.js';
import { initializeLibrarySchema, libraryTables } from './bookshelf-schema.js';

// All database and file mutations run serially in this worker. A second tab
// must fail explicitly rather than silently switching to temporary storage.
let db, files, rawFiles;
let initialized = false;
let storageOptions = {};
const tables = Object.fromEntries(libraryTables.map(name => [name,true]));
function validateJsonField(value) {
  if (typeof value !== 'string') throw new Error('Library JSON fields must be text');
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Library JSON fields must contain objects');
}
function sql(statement, bind = []) {
  return db.exec(statement, bind);
}
function transaction(run) {
  sql('BEGIN IMMEDIATE');
  try { const value = run(); sql('COMMIT'); return value; }
  catch (error) { sql('ROLLBACK'); throw error; }
}
function revisionHeads(table, id) {
  const changes = sql('SELECT * FROM changes WHERE entity_type=? AND entity_id=?', [table, id]);
  const parents = new Set(changes.flatMap(change => JSON.parse(change.parent_revision_ids_json)));
  return changes.filter(change => !parents.has(change.id));
}
function heads(table,id) {
  const unique = new Map();
  for (const change of revisionHeads(table,id).sort((a,b) => a.id.localeCompare(b.id))) {
    const row = JSON.parse(change.payload_json); delete row.revision_id;
    if (table === 'bookshelf_documents' && !JSON.parse(change.parent_revision_ids_json).length) delete row.order_key;
    const key = JSON.stringify(Object.keys(row).sort().map(key => [key,row[key]]));
    unique.set(key,change);
  }
  return [...unique.values()];
}
function writeRow(table, row) {
  const keys = Object.keys(row);
  sql(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?')})
    ON CONFLICT(id) DO UPDATE SET ${keys.filter(key => key !== 'id').map(key => `${key}=excluded.${key}`).join(',')}`, Object.values(row));
}
function validateRelations() {
  for (const [table, keys] of [['documents', ['derived_from_id', 'replaced_by_id']], ['entries', ['parent_id']]]) {
    const rows = new Map(sql(`SELECT * FROM ${table}`).map(row => [row.id, row]));
    for (const key of keys) {
      const done = new Set();
      for (const id of rows.keys()) {
        const path = new Set(); let current = id;
        while (current && !done.has(current)) {
          if (path.has(current)) throw new Error('The library contains a cyclic relationship');
          path.add(current);
          const row = rows.get(current);
          if (!row) break; // The foreign-key check reports a missing target.
          if (table === 'entries' && row.parent_id && rows.get(row.parent_id)?.document_id !== row.document_id) throw new Error('A song parent belongs to another score');
          current = row[key];
        }
        for (const item of path) done.add(item);
      }
    }
  }
}
function invalidateSnapshot() {
  const info = sql('SELECT snapshot_id,ancestors_json FROM library_info')[0];
  if (info.snapshot_id) sql('UPDATE library_info SET snapshot_id=NULL,ancestors_json=? WHERE id=1',[JSON.stringify([...new Set([...JSON.parse(info.ancestors_json),info.snapshot_id])].sort())]);
}
function save(table, values, parents = null) {
  if (!Object.hasOwn(tables, table)) throw new Error('Unknown library record type');
  if (typeof values.id !== 'string' || !values.id) throw new Error('Record identity is required');
  const previous = sql(`SELECT * FROM ${table} WHERE id = ?`, [values.id])[0];
  if (!parents && heads(table, values.id).length > 1) throw new Error('Resolve the conflicting edits before changing this item.');
  if (previous && table === 'documents') {
    for (const key of ['content_hash', 'size_bytes']) {
      if (Object.hasOwn(values, key) && values[key] !== previous[key]) throw new Error('Import a new document to replace score contents');
    }
  }
  if (previous && !parents && Object.entries(values).every(([key, value]) => previous[key] === value)) return previous;
  const columns = new Set(sql(`PRAGMA table_info(${table})`).map(column => column.name));
  for (const key of Object.keys(values)) if (!columns.has(key)) throw new Error('Unknown field: ' + key);
  const revision = crypto.randomUUID();
  const row = { metadata_json: '{}', ...previous, ...values, revision_id: revision,
    deleted_at: Object.hasOwn(values, 'deleted_at') ? values.deleted_at : previous?.deleted_at ?? null };
  for (const [key, value] of Object.entries(row)) {
    if (key.endsWith('_json')) validateJsonField(value);
  }
  invalidateSnapshot();
  writeRow(table, row);
  sql('INSERT INTO changes VALUES (?,?,?,?,?,?,?,?)', [revision, deviceId, table, row.id,
    JSON.stringify(parents || revisionHeads(table,row.id).map(change => change.id)), JSON.stringify(row), new Date().toISOString(),LIBRARY_RECORD_VERSION]);
  return row;
}
let deviceId;
const decodeChange = change => { checkRecordVersion(change.record_version); return JSON.parse(change.payload_json); };
function validateTransfer(manifest, schemas = Object.fromEntries(Object.keys(tables).map(table => [table, sql(`PRAGMA table_info(${table})`)]))) {
  const normalize = (table, row) => {
    if (!Object.hasOwn(schemas, table) || !row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Invalid library record');
    const schema = schemas[table];
    if (Object.keys(row).some(key => !schema.some(column => column.name === key))) throw new Error('Unknown field in library package');
    const result = {};
    for (const column of schema) {
      const value = Object.hasOwn(row, column.name) ? row[column.name]
        : column.dflt_value === "'{}'" ? '{}' : null;
      if ((value === null && column.notnull) || !['string', 'number'].includes(typeof value) && value !== null) throw new Error('Invalid value in library record');
      if (column.name.endsWith('_json')) validateJsonField(value);
      result[column.name] = value;
    }
    if (typeof result.id !== 'string' || !result.id || typeof result.revision_id !== 'string' || !result.revision_id) throw new Error('Invalid record identity');
    return result;
  };
  const known = new Map(sql('SELECT * FROM changes').map(change => [change.id, change]));
  const incoming = new Map();
  const sameChange = (a, b) => ['id', 'entity_type', 'entity_id', 'parent_revision_ids_json', 'payload_json', 'created_at', 'device_id','record_version'].every(key => a[key] === b[key]);
  for (const change of manifest.changes) {
    if (!change || ['id', 'device_id', 'entity_type', 'entity_id', 'parent_revision_ids_json', 'payload_json', 'created_at'].some(key => typeof change[key] !== 'string')) throw new Error('Invalid change record');
    if (incoming.has(change.id)) throw new Error('Duplicate change identity');
    const row = normalize(change.entity_type, decodeChange(change));
    if (row.id !== change.entity_id || row.revision_id !== change.id) throw new Error('Change identity does not match its record');
    const parents = JSON.parse(change.parent_revision_ids_json);
    if (!Array.isArray(parents) || parents.some(id => typeof id !== 'string' || id === change.id) || new Set(parents).size !== parents.length) throw new Error('Invalid change ancestry');
    if (known.has(change.id) && !sameChange(known.get(change.id), change)) throw new Error('Conflicting data for the same change identity');
    incoming.set(change.id, change);
  }
  const combined = new Map([...known, ...incoming]);
  const children = new Map(), remaining = new Map();
  for (const change of incoming.values()) {
    let count = 0;
    for (const parentId of JSON.parse(change.parent_revision_ids_json)) {
      const parent = combined.get(parentId);
      if (!parent || parent.entity_type !== change.entity_type || parent.entity_id !== change.entity_id) throw new Error('Missing or invalid change ancestry');
      if (incoming.has(parentId)) { count++; const list = children.get(parentId) || []; list.push(change.id); children.set(parentId, list); }
    }
    remaining.set(change.id, count);
  }
  const queue = [...remaining].filter(([, count]) => !count).map(([id]) => id);
  let visited = 0;
  for (let i = 0; i < queue.length; i++) {
    visited++;
    for (const child of children.get(queue[i]) || []) { const count = remaining.get(child) - 1; remaining.set(child, count); if (!count) queue.push(child); }
  }
  if (visited !== incoming.size) throw new Error('Cyclic change ancestry');
  for (const table of Object.keys(tables)) {
    const ids = new Set();
    for (const item of manifest.records[table]) {
      const row = normalize(table, item);
      if (ids.has(row.id)) throw new Error('Duplicate library record identity');
      ids.add(row.id);
      const change = combined.get(row.revision_id);
      if (!change || change.entity_type !== table || change.entity_id !== row.id || JSON.stringify(normalize(table, decodeChange(change))) !== JSON.stringify(row)) throw new Error('Library record does not match its change history');
    }
  }
  const documents = new Map(manifest.records.documents.map(doc => [doc.id, doc]));
  for (const doc of documents.values()) {
    scorePath(doc.storage_path);
    const prefix = doc.storage_path.match(/^scores\/([a-f0-9]{8,64})_/)?.[1];
    if (!prefix || typeof doc.id !== 'string' || !doc.id.startsWith(prefix) || doc.id !== doc.content_hash || !/^[a-f0-9]{64}$/.test(doc.content_hash) || !Number.isSafeInteger(doc.size_bytes) || doc.size_bytes < 0) throw new Error('Invalid score identity');
  }
  for (const change of incoming.values()) if (change.entity_type === 'documents') {
    const row = decodeChange(change), doc = documents.get(row.id);
    if (!doc || ['content_hash', 'size_bytes'].some(key => row[key] !== doc[key])) throw new Error('A document identity has different file contents');
    const local = sql('SELECT * FROM documents WHERE id=?', [doc.id])[0];
    if (local && (local.id !== doc.id || ['content_hash', 'size_bytes'].some(key => local[key] !== doc[key]))) throw new Error('The package would overwrite a different score');
  }
  return { incoming, normalize, known };
}
function mergeOriginalLocations(row, rows) {
  const locations = new Map();
  for (const item of rows) for (const location of JSON.parse(item.metadata_json).originalLocations || [])
    locations.set(JSON.stringify([location.source,location.path,location.name]),location);
  if (!locations.size) return row;
  return {...row,metadata_json:JSON.stringify({...JSON.parse(row.metadata_json),
    originalLocations:[...locations].sort(([a],[b]) => a.localeCompare(b)).map(([,value]) => value)})};
}
function mergeRecords(manifest) {
  const { incoming, normalize, known } = validateTransfer(manifest);
  transaction(() => {
    sql('PRAGMA defer_foreign_keys=ON');
    for (const change of incoming.values()) if (!known.has(change.id)) sql('INSERT INTO changes VALUES (?,?,?,?,?,?,?,?)',
      [change.id, change.device_id, change.entity_type, change.entity_id, change.parent_revision_ids_json, change.payload_json, change.created_at,change.record_version]);
    const entities = new Map([...incoming.values()].map(change => [change.entity_type + ':' + change.entity_id, change]));
    for (const { entity_type:table, entity_id:id } of entities.values()) {
      const chosen = heads(table,id).sort((a,b) => a.id.localeCompare(b.id)).at(-1);
      const alternatives = heads(table,id);
      const rows = alternatives.map(change => normalize(table,decodeChange(change)));
      const withoutOrigins = row => {
        const value = {...row}; delete value.revision_id;
        const metadata = JSON.parse(value.metadata_json); delete metadata.originalLocations;
        value.metadata_json = JSON.stringify(metadata);
        return JSON.stringify(value);
      };
      if (table === 'documents' && rows.length > 1 && rows.every(row => withoutOrigins(row) === withoutOrigins(rows[0]))) {
        const revisions = revisionHeads(table,id);
        const row = mergeOriginalLocations(normalize(table,decodeChange(chosen)),revisions.map(decodeChange));
        save(table,row,revisions.map(change => change.id));
      } else writeRow(table,normalize(table,decodeChange(chosen)));
    }
    if ([...incoming.keys()].some(id => !known.has(id))) invalidateSnapshot();
    validateRelations();
    if (sql('PRAGMA foreign_key_check').length) throw new Error('The changes contain broken library references');
  });
  return { addedChanges:[...incoming.keys()].filter(id => !known.has(id)).length, conflicts:actions.conflicts().length };
}
let deviceState = {};
function getLocal(key, fallback = null) { return Object.hasOwn(deviceState,key) ? deviceState[key] : fallback; }
function setLocal(key,value) { Object.defineProperty(deviceState,key,{value,enumerable:true,writable:true,configurable:true}); }
async function flushDeviceState() { await hostRequest('saveDeviceState',[deviceState]); }
function fileState(id) { return getLocal('file:' + id); }
function setFileState(id, values) { const state = { present:false, pinned:false, ...fileState(id), ...values }; setLocal('file:' + id,state); return state; }
async function localFile(doc) {
  try { const file = await files.read(doc.storage_path); setFileState(doc.id,{ present:true }); return file; }
  catch (error) { if (error.name !== 'NotFoundError') throw error; setFileState(doc.id,{ present:false }); return null; }
}
function associatedDocument(change) {
  const row = decodeChange(change);
  if (change.entity_type === 'documents') return row.id;
  if (row.document_id) return row.document_id;
  if (row.entry_id) return sql('SELECT document_id FROM entries WHERE id=?',[row.entry_id])[0]?.document_id;
}
async function open() {
  if (initialized) return;
  if (!db) ({ database: db, files:rawFiles } = await openLibraryStorage(() => openConfiguredLibraryStorage(storageOptions)));
  sql('PRAGMA foreign_keys=ON');
  sql('PRAGMA trusted_schema=OFF');
  await initializeLibrarySchema(db);
  const documentAt = path => sql('SELECT * FROM documents WHERE storage_path=?',[path])[0];
  files = {
    async read(path) {
      path = scorePath(path);
      try { return await rawFiles.read(path); }
      catch (error) {
        if (error.name !== 'NotFoundError') throw error;
        const doc = documentAt(path), previous = doc && fileState(doc.id)?.localPath;
        if (!previous || previous === path) throw error;
        const file = await rawFiles.read(scorePath(previous));
        await rawFiles.write(path,file); setFileState(doc.id,{localPath:path});
        return file;
      }
    },
    write:(path,bytes) => rawFiles.write(scorePath(path),bytes),
    remove:path => rawFiles.remove(scorePath(path)),
  };
  deviceId = getLocal('device') || crypto.randomUUID();
  setLocal('device',deviceId);
  if (['directory','opfs'].includes(storageOptions.kind || 'opfs')) await mergeCopiedLibrarySnapshots();
  await rawFiles.write('README.md',new Blob([LIBRARY_README],{type:'text/markdown'}));
  initialized = true;
}
async function mergeCopiedLibrarySnapshots() {
  const copies = [];
  for (const {name,kind} of await rawFiles.list('')) {
    if (kind !== 'file' || !isVersionedLibraryName(name)) continue;
    const file = await rawFiles.read(name);
    copies.push({name,file,data:await readSnapshot(file)});
  }
  if (!copies.length) return;
  const info = sql('SELECT * FROM library_info')[0], local = JSON.parse(info.generation_json);
  const generations = [local,...copies.map(copy => copy.data.generation)];
  const superseded = new Set(generations.flatMap(generation => generation.ancestors));
  const active = new Set(generations.map(generation => generation.id).filter(id => !superseded.has(id)));
  if (active.size !== 1) throw new Error('The copied library contains competing replacements.');
  const [id] = active;
  const heads = copies.filter(copy => copy.data.generation.id === id);
  if (local.id !== id) await actions.replaceSnapshot({file:heads[0].file});
  for (const {data} of heads) await actions.mergeDelta({changes:data.changes});
  const updated = sql('SELECT * FROM library_info')[0];
  const ancestors = new Set([updated.snapshot_id,...JSON.parse(updated.ancestors_json),
    ...heads.flatMap(({data}) => [data.id,...data.ancestors])].filter(Boolean));
  sql('UPDATE library_info SET snapshot_id=NULL,ancestors_json=? WHERE id=1',[JSON.stringify([...ancestors].sort())]);
  await db.flush();
  for (const {name,file} of copies) {
    try {
      const current = await rawFiles.read(name);
      if (await hashLibraryBytes(await current.arrayBuffer()) === await hashLibraryBytes(await file.arrayBuffer())) await rawFiles.remove(name);
    } catch (error) { if (error.name !== 'NotFoundError') throw error; }
  }
}
const importedDocument = hash => sql('SELECT * FROM documents WHERE content_hash=? ORDER BY deleted_at IS NOT NULL, replaced_by_id IS NOT NULL, id LIMIT 1', [hash])[0];
const withOriginalLocation = (metadata, location) => {
  if (!location) return metadata;
  if (![location.source,location.name].every(value => typeof value === 'string' && value) ||
      (location.path !== null && typeof location.path !== 'string')) throw new Error('Invalid original file location');
  const clean = {source:location.source,path:location.path,name:location.name};
  const locations = metadata.originalLocations || [];
  if (locations.some(item => item.source === clean.source && item.path === clean.path && item.name === clean.name)) return metadata;
  return {...metadata,originalLocations:[...locations,clean]};
};
const relationId = (table,values) => libraryEntityId(table,Object.entries(values).filter(([key]) => !['order_key','id','revision_id','deleted_at','metadata_json'].includes(key)).sort());
async function readSnapshot(file) {
  if (!(file instanceof Blob) || file.size > 256 * 1024 * 1024) throw new Error('Invalid or excessive SQLite snapshot');
  const reader = await openSnapshotDatabase({read:() => file.arrayBuffer(),write:() => { throw new Error('A remote snapshot is read-only'); }});
  const current = db;
  const schemas = Object.fromEntries(Object.keys(tables).map(table => [table,sql(`PRAGMA table_info(${table})`)]));
  try {
    reader.exec('PRAGMA trusted_schema=OFF'); reader.exec('PRAGMA query_only=ON');
    if (reader.exec('PRAGMA user_version')[0].user_version !== LIBRARY_SCHEMA_VERSION) throw new Error('Unsupported library snapshot version');
    await initializeLibrarySchema(reader);
    if (reader.exec('PRAGMA quick_check')[0].quick_check !== 'ok' || reader.exec('PRAGMA foreign_key_check').length) throw new Error('Damaged library snapshot');
    const records = Object.fromEntries(Object.keys(tables).map(table => [table,reader.exec(`SELECT * FROM ${table}`)]));
    const changes = reader.exec('SELECT * FROM changes'), info = reader.exec('SELECT * FROM library_info WHERE id=1')[0];
    const names = reader.exec("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").map(row => row.name);
    if (names.length !== libraryTables.length + 2 || names.some(name => ![...libraryTables,'changes','library_info'].includes(name))) throw new Error('Unexpected tables in a shared library snapshot');
    db = reader; validateTransfer({records,changes},schemas); validateRelations();
    for (const change of changes) if (!records[change.entity_type].some(row => row.id === change.entity_id)) throw new Error('A snapshot record is missing from its history');
    for (const [table,rows] of Object.entries(records)) for (const row of rows) if (!revisionHeads(table,row.id).some(change => change.id === row.revision_id)) throw new Error('A snapshot record is not a current revision');
    const generation = JSON.parse(info.generation_json), ancestors = JSON.parse(info.ancestors_json);
    if (typeof generation.id !== 'string' || !generation.id || !Array.isArray(generation.ancestors) || generation.ancestors.some(id => typeof id !== 'string' || id === generation.id) || !Array.isArray(ancestors) || ancestors.some(id => typeof id !== 'string' || id === info.snapshot_id) || info.snapshot_id !== null && typeof info.snapshot_id !== 'string') throw new Error('Invalid snapshot ancestry');
    return {records,changes,documents:records.documents,info,generation,ancestors,id:info.snapshot_id,tableNames:reader.exec("SELECT name FROM sqlite_schema WHERE type='table'").map(row => row.name)};
  } finally { db = current; await reader.close(); }
}
const actions = {
  listManaged:({path}) => rawFiles.list(path),
  async prepareSnapshot({file,id,generation}) {
    await readSnapshot(file);
    const editor = await openSnapshotDatabase({read:() => file.arrayBuffer(),write:() => {}});
    try {
      editor.exec('UPDATE library_info SET snapshot_id=?,ancestors_json=?,generation_json=? WHERE id=1',[id,'[]',JSON.stringify(generation)]);
      return new Blob([await editor.export()],{type:'application/vnd.sqlite3'});
    } finally { await editor.close(); }
  },
  inspectSnapshot:({file}) => readSnapshot(file),
  async captureSnapshot({id,ancestors,generation} = {}) {
    if (id) sql('UPDATE library_info SET snapshot_id=?, ancestors_json=?, generation_json=? WHERE id=1',[id,JSON.stringify([...new Set(ancestors)].sort()),JSON.stringify(generation)]);
    return {file:new Blob([await db.export()],{type:'application/vnd.sqlite3'}),...actions.syncData(),info:sql('SELECT * FROM library_info')[0]};
  },
  async replaceSnapshot({file,generation}) {
    const snapshot = await readSnapshot(file);
    transaction(() => {
      sql('PRAGMA defer_foreign_keys=ON');
      for (const table of Object.keys(tables).reverse()) sql(`DELETE FROM ${table}`);
      sql('DELETE FROM changes');
      for (const [table,rows] of Object.entries(snapshot.records)) for (const row of rows) writeRow(table,row);
      for (const change of snapshot.changes) sql('INSERT INTO changes VALUES (?,?,?,?,?,?,?,?)',[change.id,change.device_id,change.entity_type,change.entity_id,change.parent_revision_ids_json,change.payload_json,change.created_at,change.record_version]);
      sql('UPDATE library_info SET snapshot_id=?,ancestors_json=?,generation_json=? WHERE id=1',[snapshot.id,JSON.stringify(snapshot.ancestors),JSON.stringify(generation || snapshot.generation)]);
    });
    deviceState = {device:deviceId};
    for (const doc of snapshot.documents) await localFile(doc);
    return true;
  },
  rememberSnapshot({destination,file,versions,changeIds}) {
    setLocal('base:' + destination,{file,versions,changeIds});
  },
  readManaged:({path}) => rawFiles.read(path),
  writeManaged:({path,file}) => rawFiles.write(path,file),
  formatInfo() { return {schemaVersion:sql('PRAGMA user_version')[0].user_version,...sql('SELECT * FROM library_info WHERE id=1')[0]}; },
  destroyStorage() {},
  rememberOriginalLocation({id,location}) {
    return transaction(() => {
      const document = sql('SELECT * FROM documents WHERE id=?',[id])[0];
      if (!document) throw new Error('Score not found');
      const metadata = JSON.parse(document.metadata_json), updated = withOriginalLocation(metadata,location);
      return updated === metadata ? document : save('documents',{id,metadata_json:JSON.stringify(updated)});
    });
  },
  close() {},
  async availability({ destination = '' } = {}) {
    const inventory = getLocal('remote:' + destination,{ changeIds:[],paths:[] });
    const remoteIds = new Set(inventory.changeIds), paths = new Set(inventory.paths);
    const pending = new Set(sql('SELECT * FROM changes').filter(change => !remoteIds.has(change.id)).map(associatedDocument));
    const result = [];
    for (const doc of sql('SELECT * FROM documents')) {
      if (!fileState(doc.id)) await localFile(doc);
      result.push({ id:doc.id, ...fileState(doc.id), remote:paths.has(doc.storage_path), pending:pending.has(doc.id) });
    }
    return result;
  },
  async fileInfo({ id, verify = false }) {
    const document = sql('SELECT * FROM documents WHERE id=?',[id])[0];
    if (!document) throw new Error('Score not found');
    const file = await localFile(document);
    if (file && verify && (file.size !== document.size_bytes || await hashBytes(await file.arrayBuffer()) !== document.content_hash)) throw new Error('Local score contents do not match the imported file');
    return { document, file };
  },
  async relocateFile({id,otherIds}) {
    const doc = sql('SELECT * FROM documents WHERE id=?',[id])[0];
    if (!doc) throw new Error('Score not found');
    const path = createScorePath(id,JSON.parse(doc.metadata_json).originalFilename,[...sql('SELECT id FROM documents').map(row => row.id),...otherIds]);
    if (path === doc.storage_path) throw new Error('Could not resolve a stored filename collision');
    const {file} = await actions.fileInfo({id,verify:true});
    if (file) await rawFiles.write(path,file);
    const updated = transaction(() => save('documents',{id,storage_path:path}));
    setFileState(id,{present:!!file,localPath:path});
    if (file) try { await rawFiles.remove(doc.storage_path); } catch (error) { if (error.name !== 'NotFoundError') throw error; }
    return updated;
  },
  async installFile({ id, file }) {
    await actions.verifyFile({ id,file });
    const doc = sql('SELECT * FROM documents WHERE id=?',[id])[0];
    await files.write(doc.storage_path,file); return setFileState(id,{ present:true });
  },
  async verifyFile({ id, file }) {
    const doc = sql('SELECT * FROM documents WHERE id=?',[id])[0];
    if (!doc || !(file instanceof Blob) || file.size !== doc.size_bytes || await hashBytes(await file.arrayBuffer()) !== doc.content_hash) throw new Error('Downloaded score is damaged or does not match its hash');
    return true;
  },
  pinFile({ id, pinned }) {
    if (!sql('SELECT id FROM documents WHERE id=?',[id]).length) throw new Error('Score not found');
    return setFileState(id,{ pinned:!!pinned });
  },
  async releaseFile({ id, destination }) {
    const doc = sql('SELECT * FROM documents WHERE id=?',[id])[0];
    if (!doc || !getLocal('remote:' + destination,{ paths:[] }).paths.includes(doc.storage_path)) throw new Error('Upload this score before releasing its download');
    if (fileState(id)?.pinned) throw new Error('Turn off offline keeping before releasing this download');
    await files.remove(doc.storage_path); return setFileState(id,{ present:false });
  },
  collectionDocuments({ table, id }) {
    if (table === 'bookshelves') return sql('SELECT DISTINCT d.id FROM bookshelf_documents m JOIN documents d ON d.id=m.document_id WHERE m.bookshelf_id=? AND m.deleted_at IS NULL AND d.deleted_at IS NULL AND d.replaced_by_id IS NULL',[id]).map(row => row.id);
    if (table === 'playlists') return sql('SELECT DISTINCT d.id FROM playlist_items m JOIN entries e ON e.id=m.entry_id JOIN documents d ON d.id=e.document_id WHERE m.playlist_id=? AND m.deleted_at IS NULL AND e.deleted_at IS NULL AND d.deleted_at IS NULL',[id]).map(row => row.id);
    throw new Error('Choose a bookshelf or playlist');
  },
  syncData({destination = ''} = {}) { return { deviceId, changes:sql('SELECT * FROM changes'), documents:sql('SELECT * FROM documents'), base:getLocal('base:' + destination), info:sql('SELECT * FROM library_info')[0] }; },
  async mergeDelta({ changes }) {
    if (!Array.isArray(changes)) throw new Error('Invalid changes');
    const records = Object.fromEntries(Object.keys(tables).map(table => [table,[]]));
    const selected = new Map();
    for (const change of changes) {
      if (!change || !Object.hasOwn(tables,change.entity_type)) throw new Error('Invalid change entity');
      selected.set(change.entity_type + ':' + change.entity_id,change);
    }
    for (const change of selected.values()) records[change.entity_type].push(decodeChange(change));
    validateTransfer({records,changes});
    for (const doc of records.documents) {
      const collision = sql('SELECT id FROM documents WHERE storage_path=? AND id<>?',[doc.storage_path,doc.id])[0];
      if (collision) await actions.relocateFile({id:collision.id,otherIds:[doc.id]});
    }
    const existing = new Set(sql('SELECT id FROM documents').map(doc => doc.id));
    const result = mergeRecords({ records, changes });
    // Remote-only documents must not be mistaken for locally imported files.
    for (const doc of records.documents) if (!existing.has(doc.id)) setFileState(doc.id,{ present:false });
    return result;
  },
  remoteInventory({ destination, changeIds, paths, unknown = false }) {
    if (!Array.isArray(changeIds) || !Array.isArray(paths) || [...changeIds,...paths].some(value => typeof value !== 'string')) throw new Error('Invalid remote inventory');
    for (const path of paths) scorePath(path);
    setLocal('remote:' + destination,{ changeIds:[...new Set(changeIds)].sort(), paths:[...new Set(paths)].sort(),unknown,checkedAt:Date.now() });
    return actions.syncStatus({ destination });
  },
  syncStatus({ destination = '' } = {}) {
    const inventory = getLocal('remote:' + destination,{ changeIds:[],paths:[] });
    const known = new Set(inventory.changeIds);
    return { unknown:!!inventory.unknown, pending:sql('SELECT id FROM changes').filter(row => !known.has(row.id)).length, verified:!!getLocal('remote:' + destination), conflicts:actions.conflicts().length };
  },
  async syncSummary({destination}) {
    const states = await actions.availability({destination}), status = actions.syncStatus({destination});
    const active = new Set(sql('SELECT id FROM documents WHERE deleted_at IS NULL AND replaced_by_id IS NULL').map(row => row.id));
    return {...status,uploads:states.filter(state => active.has(state.id) && !state.remote).length,
      downloads:states.filter(state => active.has(state.id) && !state.present).length};
  },
  async findImportedFile({ file }) {
    const existing = importedDocument(await hashBytes(await file.arrayBuffer()));
    return existing ? { ...existing, alreadyImported: true } : null;
  },
  changeIds() { return sql('SELECT id FROM changes ORDER BY id').map(row => row.id); },
  backup() { return exportLibraryPackage({ db, files, tables }); },
  async importBackup({ bytes, file }) {
    const manifest = await readLibraryPackage(file || bytes, tables);
    const { incoming, normalize, known } = validateTransfer(manifest);
    const created = [];
    try {
      for (const doc of manifest.records.documents) {
        let existing;
        try { existing = await files.read(doc.storage_path); }
        catch (error) { if (error.name !== 'NotFoundError') throw error; }
        if (existing) {
          if (await hashBytes(await existing.arrayBuffer()) !== doc.content_hash) throw new Error('A different file already exists at ' + doc.storage_path);
        } else {
          await files.write(doc.storage_path, manifest.archive[doc.storage_path],JSON.parse(doc.metadata_json).originalFilename); created.push(doc.storage_path);
        }
      }
      mergeRecords(manifest);
      for (const doc of manifest.records.documents) setFileState(doc.id,{ present:true });
      return { addedChanges: [...incoming.keys()].filter(id => !known.has(id)).length,
        conflicts: actions.conflicts().length, importedFiles: created.length };
    } catch (error) {
      for (const path of created) await files.remove(path).catch(() => {});
      throw error;
    }
  },
  conflicts() {
    const entities = sql('SELECT DISTINCT entity_type, entity_id FROM changes');
    return entities.flatMap(entity => {
      const alternatives = heads(entity.entity_type, entity.entity_id);
      return alternatives.length > 1 ? [{ table: entity.entity_type, id: entity.entity_id, alternatives }] : [];
    });
  },
  resolveConflict({ table, id, revisionId, expectedRevisionIds }) {
    if (!Object.hasOwn(tables, table)) throw new Error('Unknown library record type');
    return transaction(() => {
      const alternatives = heads(table, id);
      if (!Array.isArray(expectedRevisionIds) || [...expectedRevisionIds].sort().join() !== alternatives.map(change => change.id).sort().join()) throw new Error('This conflict changed. Refresh before resolving it.');
      const chosen = alternatives.find(change => change.id === revisionId);
      if (!chosen || alternatives.length < 2) throw new Error('This conflict has already changed. Refresh before resolving it.');
      // Displayed alternatives may represent several equal revisions. Resolve
      // every actual branch, including those hidden by display deduplication.
      const revisions = revisionHeads(table,id);
      const row = table === 'documents' ? mergeOriginalLocations(decodeChange(chosen),revisions.map(decodeChange)) : decodeChange(chosen);
      delete row.revision_id;
      // Always record the explicit resolution, even when the chosen payload
      // matches the currently displayed branch.
      return save(table, row, revisions.map(change => change.id));
    });
  },
  async musicMetadataFiles({ file }) {
    if (/\.(musicxml|xml)$/i.test(file.name)) return { [file.name]: await file.text() };
    let total = 0;
    const selected = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: entry => {
      if (!/\.(mscx|musicxml|xml)$/i.test(entry.name) || entry.originalSize > 32 * 1024 * 1024) return false;
      total += entry.originalSize;
      return total <= 32 * 1024 * 1024;
    } });
    return Object.fromEntries(Object.entries(selected).map(([name, bytes]) => [name, new TextDecoder().decode(bytes)]));
  },
  async open() { await open(); return { version: LIBRARY_SCHEMA_VERSION }; },
  openBookVersions() {
    return sql("SELECT id, metadata_json FROM documents WHERE deleted_at IS NULL AND replaced_by_id IS NULL AND json_type(metadata_json, '$.openBook') = 'object'")
      .map(({ id, metadata_json }) => ({ id, ...JSON.parse(metadata_json).openBook }));
  },
  packOpenBook({ filename, source, musicXml, openBook }) {
    // The compressed MusicXML container is the library's original file. Keep
    // the exact upstream bytes alongside the frozen conversion in that file.
    const container = '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="score.musicxml" media-type="application/vnd.recordare.musicxml+xml"/></rootfiles></container>';
    return zipSync({
      mimetype: [strToU8('application/vnd.recordare.musicxml'), { level: 0 }],
      'META-INF/container.xml': strToU8(container),
      'META-INF/rostrum-openbook.json': strToU8(JSON.stringify(openBook)),
      'score.musicxml': musicXml,
      ['source/' + filename]: source,
    }, { mtime: new Date(2000, 0, 1) });
  },
  async importFile({ file, entries, maxWidth, maxHeight, displayName = file.name, replacesId = null, derivedFromId = null, originalLocation = null, openBook = null }) {
    const bytes = await file.arrayBuffer();
    const hash = await hashBytes(bytes);
    const id = hash;
    // Keep old/deleted documents intact too: reimporting must not silently
    // restore a tombstone or change replacement/annotation relationships.
    const existing = importedDocument(hash);
    if (existing) {
      await files.write(existing.storage_path,bytes); setFileState(existing.id,{present:true});
      return { ...actions.rememberOriginalLocation({id:existing.id,location:originalLocation}), alreadyImported:true };
    }
    if (/\.pdf$/i.test(file.name) && ![maxWidth,maxHeight].every(value => Number.isFinite(value) && value > 0))
      throw new Error('PDF maximum dimensions are required for import');
    const path = createScorePath(id,file.name,sql('SELECT id FROM documents').map(row => row.id));
    const inherited = [];
    if (replacesId) for (const [table,key] of [['bookshelf_documents','bookshelf_id'],['document_tags','tag_id']]) {
      for (const previous of sql(`SELECT * FROM ${table} WHERE document_id=? AND deleted_at IS NULL`,[replacesId])) {
        const values = {[key]:previous[key],document_id:id};
        inherited.push({table,values:{...values,id:await relationId(table,values),metadata_json:previous.metadata_json,
          ...(table === 'bookshelf_documents' ? {order_key:previous.order_key} : {})}});
      }
    }
    try {
      await files.write(path, bytes,file.name);
      return transaction(() => {
        const document = save('documents', { id, content_hash: hash, storage_path: path, size_bytes: file.size,
          settings_json: JSON.stringify({ maxWidth, maxHeight }), metadata_json: JSON.stringify(withOriginalLocation({
            displayName, originalFilename: file.name, format: file.name.split('.').pop().toLowerCase(), ...(openBook && { openBook }),
          },originalLocation)) });
        setFileState(id,{ present:true,localPath:path });
        for (const entry of entries) save('entries', { id: entry.id, document_id: id, parent_id: entry.parent_id || null,
          anchor_json: JSON.stringify(entry.anchor), metadata_json: JSON.stringify(entry.metadata), deleted_at: entry.deleted_at || null });
        if (derivedFromId) save('documents', { id, derived_from_id: derivedFromId });
        if (replacesId) {
          if (!sql('SELECT id FROM documents WHERE id=? AND deleted_at IS NULL', [replacesId]).length) throw new Error('Original score not found');
          save('documents', { id: replacesId, replaced_by_id: id });
          for (const item of inherited) save(item.table,item.values);
        }
        return document;
      });
    } catch (error) { await files.remove(path).catch(() => {}); throw error; }
  },
  list({ query = '', tagIds = [], matchAll = false } = {}) {
    const rows = sql('SELECT * FROM documents WHERE deleted_at IS NULL AND replaced_by_id IS NULL');
    const needle = query.normalize('NFKC').toLocaleLowerCase();
    const links = sql('SELECT dt.document_id, dt.tag_id FROM document_tags dt JOIN tags t ON t.id=dt.tag_id WHERE dt.deleted_at IS NULL AND t.deleted_at IS NULL');
    return rows.filter(row => {
      const metadata = JSON.parse(row.metadata_json);
      const tags = new Set(links.filter(link => link.document_id === row.id).map(link => link.tag_id));
      return [metadata.displayName, metadata.originalFilename].some(value => String(value || '').normalize('NFKC').toLocaleLowerCase().includes(needle))
        && (!tagIds.length || (matchAll ? tagIds.every(tag => tags.has(tag)) : tagIds.some(tag => tags.has(tag))));
    });
  },
  history() { return sql('SELECT * FROM documents'); },
  useVersion({ id }) {
    return transaction(() => {
      let row = sql('SELECT * FROM documents WHERE id=?', [id])[0];
      if (!row) throw new Error('Score not found');
      const visited = new Set([id]);
      while (row.replaced_by_id) {
        if (visited.has(row.replaced_by_id)) throw new Error('Cyclic replacement history');
        visited.add(row.replaced_by_id);
        row = sql('SELECT * FROM documents WHERE id=?', [row.replaced_by_id])[0];
        if (!row) throw new Error('Replacement score not found');
      }
      save('documents', { id, replaced_by_id: null, deleted_at: null });
      if (row.id !== id) save('documents', { id: row.id, replaced_by_id: id });
      return true;
    });
  },
  reindex({ documentId, entries }) {
    return transaction(() => {
      if (!sql('SELECT id FROM documents WHERE id=? AND deleted_at IS NULL', [documentId]).length) throw new Error('Score not found');
      const previous = sql('SELECT * FROM entries WHERE document_id=?', [documentId]);
      const mapping = new Map();
      for (const entry of entries) {
        const matches = previous.filter(row => {
          const metadata = JSON.parse(row.metadata_json);
          return entry.metadata.source?.key && metadata.source?.key === entry.metadata.source.key && metadata.source?.type === entry.metadata.source.type;
        });
        if (matches.length > 1) continue; // Ambiguous identities require manual review.
        const match = matches[0];
        const id = match?.id || entry.id;
        mapping.set(entry.id, id);
        if (match?.deleted_at) continue; // Do not resurrect a manually removed entry.
        const metadata = { ...entry.metadata };
        if (match) {
          const old = JSON.parse(match.metadata_json);
          Object.assign(metadata, old);
          for (const [key, value] of Object.entries(entry.metadata)) if (!(old.userEditedFields || []).includes(key)) metadata[key] = value;
        }
        save('entries', { id, document_id: documentId, parent_id: match && (metadata.userEditedFields || []).includes('parent') ? match.parent_id : entry.parent_id ? mapping.get(entry.parent_id) || null : null,
          anchor_json: match && (metadata.userEditedFields || []).includes('anchor') ? match.anchor_json : JSON.stringify(entry.anchor),
          metadata_json: JSON.stringify(metadata) });
      }
      // Unmatched existing records and their references intentionally survive.
      return { count: entries.length };
    });
  },
  async songState({ id }) {
    const state = await actions.read({ id });
    return { ...state, entries:sql('SELECT * FROM entries WHERE document_id=?', [id]) };
  },
  editSongs({ documentId, expectedRevisionId, expectedEntries, displayName, entries }) {
    return transaction(() => {
      const document = sql('SELECT * FROM documents WHERE id=? AND deleted_at IS NULL', [documentId])[0];
      if (!document) throw new Error('Score not found');
      const current = sql('SELECT id, revision_id, deleted_at FROM entries WHERE document_id=?', [documentId]);
      const expected = new Map(expectedEntries.map(row => [row.id,row.revision_id]));
      if (document.revision_id !== expectedRevisionId || current.length !== expected.size
        || current.some(row => expected.get(row.id) !== row.revision_id)) {
        throw new Error('This score or its songs changed while the dialog was open. Cancel and reopen it before saving.');
      }
      const ids = new Set(entries.map(entry => entry.id));
      if (ids.size !== entries.length || current.some(row => !row.deleted_at && !ids.has(row.id))) throw new Error('Invalid song list');
      if (typeof displayName !== 'string' || !displayName.trim()) throw new Error('Enter a library score name');
      for (const entry of entries) {
        const owner = sql('SELECT document_id FROM entries WHERE id=?', [entry.id])[0];
        if (owner && (owner.document_id !== documentId || !expected.has(entry.id))) throw new Error('A song identity belongs to another score or changed since opening');
        if (!entry.deleted_at && (!entry.metadata?.title?.trim() || !Number.isInteger(entry.anchor?.pageIndex) || entry.anchor.pageIndex < 0)) throw new Error('Enter a song title and valid start page');
        save('entries', { id:entry.id, document_id:documentId, parent_id:entry.parent_id || null,
          anchor_json:JSON.stringify(entry.anchor), metadata_json:JSON.stringify(entry.metadata), deleted_at:entry.deleted_at || null });
      }
      validateRelations();
      const updated = save('documents', { id:documentId, metadata_json:JSON.stringify({ ...JSON.parse(document.metadata_json), displayName:displayName.trim() }) });
      return { document:updated, entries:sql('SELECT id, revision_id FROM entries WHERE document_id=?', [documentId]) };
    });
  },
  search({ query = '', tagIds = [], matchAll = false }) {
    // Literal substring search initially; the index can be replaced without
    // changing the persistent entry identities or user edits.
    const rows = sql(`SELECT e.*, d.metadata_json AS document_metadata FROM entries e JOIN documents d ON d.id=e.document_id
      WHERE e.deleted_at IS NULL AND d.deleted_at IS NULL AND d.replaced_by_id IS NULL`);
    const needle = query.normalize('NFKC').toLocaleLowerCase();
    const links = [...sql('SELECT entry_id, tag_id FROM entry_tags WHERE deleted_at IS NULL'),
      ...sql('SELECT document_id, tag_id FROM document_tags WHERE deleted_at IS NULL')];
    const activeTags = new Set(sql('SELECT id FROM tags WHERE deleted_at IS NULL').map(t => t.id));
    return rows.filter(row => {
      const m = JSON.parse(row.metadata_json);
      const textMatch = [m.title, m.composer, ...(m.aliases || [])].some(v => String(v || '').normalize('NFKC').toLocaleLowerCase().includes(needle));
      const tags = new Set(links.filter(l => l.entry_id === row.id || l.document_id === row.document_id).map(l => l.tag_id).filter(t => activeTags.has(t)));
      return textMatch && (!tagIds.length || (matchAll ? tagIds.every(t => tags.has(t)) : tagIds.some(t => tags.has(t))));
    });
  },
  async read({ id, allowMissing = false }) {
    const document = sql('SELECT * FROM documents WHERE id=? AND deleted_at IS NULL', [id])[0];
    if (!document) throw new Error('Score not found');
    return { document, file: allowMissing ? await localFile(document) : await files.read(document.storage_path), annotations:
      sql('SELECT * FROM annotations WHERE document_id=? AND deleted_at IS NULL', [id]) };
  },
  saveState({ documentId, settings, annotations }) {
    return transaction(() => {
      if (!sql('SELECT id FROM documents WHERE id=? AND deleted_at IS NULL', [documentId]).length) throw new Error('Score not found');
      const existing = sql('SELECT * FROM annotations WHERE document_id=? AND deleted_at IS NULL', [documentId]);
      const ids = new Set();
      for (const annotation of annotations) {
        if (ids.has(annotation.id)) throw new Error('Duplicate annotation identity');
        ids.add(annotation.id);
        const owner = sql('SELECT document_id FROM annotations WHERE id=?', [annotation.id])[0];
        if (owner && owner.document_id !== documentId) throw new Error('Annotation belongs to a different score');
        save('annotations', { id: annotation.id, document_id: documentId, deleted_at: null,
          anchor_json: JSON.stringify(annotation.anchor), content_json: JSON.stringify(annotation.content) });
      }
      for (const previous of existing) if (!ids.has(previous.id)) save('annotations', { id: previous.id, deleted_at: new Date().toISOString() });
      return save('documents', { id: documentId, settings_json: JSON.stringify(settings) });
    });
  },
  update({ table, values, expectedRevisionId }) {
    return transaction(() => {
      if (expectedRevisionId && sql(`SELECT revision_id FROM ${Object.hasOwn(tables,table) ? table : 'documents'} WHERE id=?`,[values.id])[0]?.revision_id !== expectedRevisionId) throw new Error('This item changed. Refresh the list before editing it.');
      return save(table,values);
    });
  },
  async link({ table, values }) {
    if (!['document_tags', 'entry_tags', 'bookshelf_documents', 'playlist_items'].includes(table)) throw new Error('Invalid membership');
    const identity = table === 'playlist_items' ? crypto.randomUUID() : await relationId(table,values);
    return transaction(() => {
      if (table !== 'playlist_items') {
        const rows = sql(`SELECT * FROM ${table} WHERE deleted_at IS NULL`);
        const existing = rows.find(row => Object.entries(values).filter(([key]) => key !== 'order_key').every(([key, value]) => row[key] === value));
        if (existing) return existing;
      }
      return save(table, { id:identity, ...values,deleted_at:null });
    });
  },
  records({ table, parent, id }) {
    if (!Object.hasOwn(tables, table)) throw new Error('Unknown library record type');
    const columns = new Set(sql(`PRAGMA table_info(${table})`).map(c => c.name));
    if (parent && !columns.has(parent)) throw new Error('Unknown parent field');
    return sql(`SELECT * FROM ${table} WHERE deleted_at IS NULL${parent ? ` AND ${parent}=?` : ''}`, parent ? [id] : []);
  },
  moveItem({ table, id, direction }) {
    if (!['playlist_items', 'bookshelf_documents'].includes(table) || ![-1, 1].includes(direction)) throw new Error('Invalid move');
    return transaction(() => {
      const parent = table === 'playlist_items' ? 'playlist_id' : 'bookshelf_id';
      const item = sql(`SELECT * FROM ${table} WHERE id=? AND deleted_at IS NULL`, [id])[0];
      if (!item) throw new Error('Item not found');
      const rows = sql(`SELECT * FROM ${table} WHERE ${parent}=? AND deleted_at IS NULL ORDER BY order_key, id`, [item[parent]]);
      const index = rows.findIndex(row => row.id === id);
      const target = index + direction;
      if (target < 0 || target >= rows.length) return;
      rows.splice(target, 0, rows.splice(index, 1)[0]);
      rows.forEach((row, i) => save(table, { id: row.id, order_key: String(i + 1).padStart(16, '0') }));
    });
  },
  export() { return db.export(); },
};
let queue = Promise.resolve();
self.onmessage = ({ data }) => {
  if (data.hostReply) return;
  const { id, action, args } = data;
  queue = queue.then(async () => {
    let actionCompleted = false, value;
    try {
      if (!Object.hasOwn(actions, action)) throw new Error('Unknown library operation');
      if (action === 'open' && args?.storage) {
        if (db) throw new Error('Close the current library before changing storage');
        storageOptions = args.storage; deviceState = args.deviceState || {};
      }
      if (action === 'close') {
        if (db) { await db.flush(); await flushDeviceState(); await db.close(); }
        db = files = rawFiles = null; initialized = false;
        self.postMessage({ id, value: true }); return;
      }
      if (!initialized) {
        const priorState = {...deviceState};
        try { await open(); }
        catch (error) {
          try { await db?.close(); } catch { /* Keep the opening error. */ }
          db = files = rawFiles = null;
          deviceState = priorState;
          throw error;
        }
      }
      if (action === 'destroyStorage') {
        await db.destroy(); deviceState = {device:deviceId}; await flushDeviceState(); db = files = rawFiles = null; initialized = false;
        self.postMessage({id,value:true}); return;
      }
      value = await actions[action](args || {});
      actionCompleted = true;
      // An emergency export must remain possible if persistence is failing.
      // SQLite has already committed the in-memory state at this point.
      if (!['backup', 'export'].includes(action)) { await db.flush(); await flushDeviceState(); }
      self.postMessage({ id, value });
    } catch (error) { self.postMessage({ id, error: error.message, errorName: error.name, persistenceFailed: actionCompleted,
      committedValue:actionCompleted ? value : undefined }); }
  });
};
self.postMessage({ ready: true });
