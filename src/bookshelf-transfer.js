import { Zip, ZipDeflate, ZipPassThrough, Unzip, UnzipInflate, strToU8 } from 'fflate';
import { LIBRARY_BACKUP_VERSION, LIBRARY_SCHEMA_VERSION, LIBRARY_STORAGE_VERSION, LIBRARY_RECORD_VERSION, scorePath, hashLibraryBytes as hashBytes, LibraryFormatError, checkLibraryEnvelope } from './bookshelf-format.js';
export { scorePath, hashBytes };

export async function exportLibraryPackage({ db, files, tables }) {
  const records = Object.fromEntries(Object.keys(tables).map(table => [table, db.exec(`SELECT * FROM ${table}`)]));
  const changes = db.exec('SELECT * FROM changes');
  const chunks = [];
  let zipError;
  const zip = new Zip((error, data) => {
    if (error) zipError = error;
    else if (data?.length) chunks.push(new Blob([data]));
  });
  const addBytes = (name, bytes) => {
    const entry = new ZipDeflate(name, { level: 6 }); zip.add(entry); entry.push(bytes, true);
    if (zipError) throw zipError;
  };
  const manifest = strToU8(JSON.stringify({ format:'rostrum-library',version:LIBRARY_BACKUP_VERSION,schemaVersion:LIBRARY_SCHEMA_VERSION,storageFormatVersion:LIBRARY_STORAGE_VERSION,recordFormatVersion:LIBRARY_RECORD_VERSION,records,changes }));
  if (manifest.length > 64 * 1024 * 1024) throw new Error('Library metadata exceeds the supported 64 MiB package size');
  addBytes('library.json', manifest);
  addBytes('library.sqlite', await db.export());
  for (const doc of records.documents) {
    const file = await files.read(scorePath(doc.storage_path));
    if (file.size > 512 * 1024 * 1024) throw new Error('A score exceeds the supported 512 MiB package member size');
    if (file.size !== doc.size_bytes || await hashBytes(await file.arrayBuffer()) !== doc.content_hash) throw new Error('Cannot back up damaged or missing score: ' + doc.storage_path);
    const entry = new ZipPassThrough(doc.storage_path); zip.add(entry);
    const reader = file.stream().getReader();
    try {
      while (true) {
        const { value, done } = await reader.read(); entry.push(value || new Uint8Array(), done);
        if (zipError) throw zipError;
        if (done) break;
      }
    } finally { reader.releaseLock(); }
  }
  zip.end(); if (zipError) throw zipError;
  return new Blob(chunks, { type: 'application/zip' });
}

// Parse portable records, not SQL from an untrusted SQLite image. The SQLite
// file is included for independent inspection/recovery, not executed on import.
export async function readLibraryPackage(input, tables) {
  const source = input instanceof Blob ? input : new Blob([input]);
  const archive = Object.create(null), names = new Set();
  let extracted = 0;
  let unzipError;
  const unzip = new Unzip(file => {
    if (names.has(file.name) || names.size >= 100000) throw new Error('Duplicate or excessive package members');
    names.add(file.name);
    if (file.name === 'library.sqlite') return; // Never execute the supplied DB.
    if (file.name !== 'library.json') scorePath(file.name);
    const limit = (file.name === 'library.json' ? 64 : 512) * 1024 * 1024;
    if (file.originalSize > limit) throw new Error('Library package member is too large');
    let size = 0; const chunks = [];
    file.ondata = (error, bytes, final) => {
      if (error) { unzipError = error; return; }
      size += bytes.length;
      extracted += bytes.length;
      if (size > limit) throw new Error('Library package member is too large');
      if (extracted > source.size * 20 + 64 * 1024 * 1024) throw new Error('Library package is excessively compressed');
      if (bytes.length) chunks.push(new Blob([bytes]));
      if (final) archive[file.name] = new Blob(chunks);
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  const reader = source.stream().getReader();
  try {
    while (true) {
      const { value, done } = await reader.read(); unzip.push(value || new Uint8Array(), done);
      if (unzipError) throw unzipError;
      if (done) break;
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  if (!archive['library.json']) throw new Error('Invalid library package');
  const manifest = checkLibraryEnvelope(JSON.parse(await archive['library.json'].text()),'rostrum-library',LIBRARY_BACKUP_VERSION);
  // Only portable records are imported, so an index/local-table schema change
  // does not invalidate backups with the same record and storage formats.
  if (manifest.storageFormatVersion !== LIBRARY_STORAGE_VERSION || manifest.recordFormatVersion !== LIBRARY_RECORD_VERSION || !Array.isArray(manifest.changes)) throw new LibraryFormatError('Unsupported library package version. Update Rostrum; pre-versioned backups are not imported.');
  if (!manifest.records || Object.keys(manifest.records).some(table => !Object.hasOwn(tables, table))) throw new Error('Unknown library record type');
  for (const table of Object.keys(tables)) if (!Array.isArray(manifest.records[table])) throw new Error('Incomplete library package');
  const paths = new Set();
  for (const doc of manifest.records.documents) {
    const path = scorePath(doc.storage_path);
    if (paths.has(path)) throw new Error('Duplicate score path');
    paths.add(path);
    const data = archive[path];
    if (!data || data.size !== doc.size_bytes || await hashBytes(await data.arrayBuffer()) !== doc.content_hash) throw new Error('Invalid or missing score in package: ' + path);
  }
  if (Object.keys(archive).some(path => path !== 'library.json' && !paths.has(path))) throw new Error('Package contains unreferenced score files');
  return { ...manifest, archive };
}
