// +skip
export { LIBRARY_NAMESPACE, LIBRARY_APPLICATION_ID, LIBRARY_SCHEMA_VERSION, LIBRARY_STORAGE_VERSION,
  LIBRARY_RECORD_VERSION, LIBRARY_SYNC_VERSION, LIBRARY_BACKUP_VERSION, LibraryFormatError,
  libraryFormat, validateLibraryFormat, scorePath, createScorePath, scoreStoragePath,
  listStoredScores, isManagedScoreName, checkRecordVersion, hashLibraryBytes, libraryEntityId, checkLibraryEnvelope };
// -skip

// This namespace is a permanent generation boundary, NOT a schema version.
// Future in-place migrations must keep it unchanged. Pre-versioned clients use
// the parent directory and cannot damage files or batches inside this namespace.
const LIBRARY_NAMESPACE = 'rostrum-library-v3';
const LIBRARY_APPLICATION_ID = 0x5253544d;
const LIBRARY_SCHEMA_VERSION = 4;
const LIBRARY_STORAGE_VERSION = 2;
const LIBRARY_RECORD_VERSION = 3;
const LIBRARY_SYNC_VERSION = 2;
const LIBRARY_BACKUP_VERSION = 2;
class LibraryFormatError extends Error {
  constructor(message) { super(message); this.name = 'LibraryFormatError'; }
}
const hashLibraryBytes = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n => n.toString(16).padStart(2,'0')).join('');
function libraryFormat() {
  return {format:'rostrum-library',version:LIBRARY_SYNC_VERSION,recordFormatVersion:LIBRARY_RECORD_VERSION,storageFormatVersion:LIBRARY_STORAGE_VERSION};
}
function validateLibraryFormat(value) {
  if (!value || value.format !== 'rostrum-library' || value.version !== LIBRARY_SYNC_VERSION ||
      value.recordFormatVersion !== LIBRARY_RECORD_VERSION || value.storageFormatVersion !== LIBRARY_STORAGE_VERSION)
    throw new LibraryFormatError('Unsupported library format. Update Rostrum before opening or syncing this library.');
  if (value.migration) throw new LibraryFormatError('Library storage migration is in progress. Resume it with the version that started the migration.');
  return value;
}
// storage_path is an immutable logical key, including in historical revisions.
// Only the layout resolver decides its physical location. Renaming stored files
// must never rewrite change IDs, payloads, song IDs or annotation references.
function scorePath(path) {
  if (typeof path !== 'string' || !/^scores\/[^/\\\x00]+$/.test(path) || path.split('/').some(p => p === '.' || p === '..')) throw new Error('Invalid score path in library package');
  return path;
}
async function libraryEntityId(...parts) {
  return hashLibraryBytes(new TextEncoder().encode(JSON.stringify(parts)));
}
function createScorePath(id) {
  if (!/^[a-f0-9]{64}$/.test(id)) throw new Error('Invalid score identity');
  return scorePath(`scores/${id}`);
}
function scoreStoragePath(path,version = LIBRARY_STORAGE_VERSION) {
  if (version !== LIBRARY_STORAGE_VERSION) throw new LibraryFormatError('Unsupported score storage version. Update Rostrum.');
  return scorePath(path);
}
function isManagedScoreName(name) { return /^[a-f0-9]{64}$/.test(name); }
async function listStoredScores({directory},version = LIBRARY_STORAGE_VERSION) {
  if (version !== LIBRARY_STORAGE_VERSION) throw new LibraryFormatError('Unsupported score storage version. Update Rostrum.');
  const dir = await directory('scores');
  return dir ? Object.keys(dir.files).filter(isManagedScoreName).map(name => ({path:'scores/' + name,size:dir.files[name].size})) : [];
}
function checkLibraryEnvelope(value,kind,version) {
  if (!value || value.format !== kind || value.version !== version) throw new LibraryFormatError('Unsupported library package or sync version. Update Rostrum; pre-versioned data is not imported.');
  return value;
}
function checkRecordVersion(version) {
  if (version !== LIBRARY_RECORD_VERSION) throw new LibraryFormatError('Unsupported library record version. Update Rostrum.');
}
