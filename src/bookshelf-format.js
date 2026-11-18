// +skip
export { LIBRARY_APPLICATION_ID, LIBRARY_SCHEMA_VERSION, LIBRARY_STORAGE_VERSION,
  LIBRARY_RECORD_VERSION, LIBRARY_BACKUP_VERSION, LibraryFormatError,
  scorePath, createScorePath, scoreStoragePath, validateLibraryGeneration,
  listStoredScores, isManagedScoreName, checkRecordVersion, hashLibraryBytes, libraryEntityId, checkLibraryEnvelope, isVersionedLibraryName };
// -skip

const LIBRARY_APPLICATION_ID = 0x5253544d;
const LIBRARY_SCHEMA_VERSION = 7;
const LIBRARY_STORAGE_VERSION = 3;
const LIBRARY_RECORD_VERSION = 4;
const LIBRARY_BACKUP_VERSION = 2;
class LibraryFormatError extends Error {
  constructor(message) { super(message); this.name = 'LibraryFormatError'; }
}
const hashLibraryBytes = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n => n.toString(16).padStart(2,'0')).join('');
const isVersionedLibraryName = name => /^library-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.sqlite$/.test(name);
// Filenames are shared; IDs and history remain independent of presentation names.
function scorePath(path) {
  if (typeof path !== 'string' || !/^scores\/[^/\\\x00]+$/.test(path) || path.split('/').some(p => p === '.' || p === '..')) throw new Error('Invalid score path in library package');
  return path;
}
async function libraryEntityId(...parts) {
  return hashLibraryBytes(new TextEncoder().encode(JSON.stringify(parts)));
}
// Prefixes grow only when another imported document shares the same hash prefix.
function createScorePath(id, name, otherIds = []) {
  if (!/^[a-f0-9]{64}$/.test(id)) throw new Error('Invalid score identity');
  let length = 8;
  const others = [...otherIds].filter(other => other !== id);
  while (length < 64 && others.some(other => other.startsWith(id.slice(0,length)))) length++;
  const clean = String(name || 'score').normalize('NFC').replace(/[<>\u0022:/\\|?*\x00-\x1f]/g,'_').replace(/[ .]+$/,'') || 'score';
  const extension = clean.match(/\.[a-z0-9]{1,12}$/i)?.[0] || '';
  let stem = extension ? clean.slice(0,-extension.length) : clean;
  // Leave room for a full hash and extension on filesystems with 255-byte names.
  while (new TextEncoder().encode(stem).length > 160) stem = [...stem].slice(0,-1).join('');
  return scorePath(`scores/${id.slice(0,length)}_${stem || 'score'}${extension}`);
}
function scoreStoragePath(path,version = LIBRARY_STORAGE_VERSION) {
  if (version !== LIBRARY_STORAGE_VERSION) throw new LibraryFormatError('Unsupported score storage version. Update Rostrum.');
  return scorePath(path);
}
function isManagedScoreName(name) { return /^[a-f0-9]{8,64}_[^/\\\x00]+$/.test(name); }
async function listStoredScores({directory},version = LIBRARY_STORAGE_VERSION) {
  if (version !== LIBRARY_STORAGE_VERSION) throw new LibraryFormatError('Unsupported score storage version. Update Rostrum.');
  const dir = await directory('scores');
  return dir ? Object.keys(dir.files).filter(isManagedScoreName).map(name => ({path:'scores/' + name,size:dir.files[name].size})) : [];
}
function validateLibraryGeneration(marker) {
  if (!marker || marker.format !== 'rostrum-library-generation' || marker.version !== 1 ||
      typeof marker.id !== 'string' || !marker.id || marker.id === 'initial' ||
      !Array.isArray(marker.ancestors) || marker.ancestors.some(id => typeof id !== 'string' || id === marker.id) ||
      new Set(marker.ancestors).size !== marker.ancestors.length || !marker.ancestors.includes('initial') ||
      !/^[a-f0-9]{64}$/.test(marker.snapshotHash) || !/^[a-f0-9]{64}$/.test(marker.sourceHash))
    throw new LibraryFormatError('Invalid library replacement metadata');
  return marker;
}
function checkLibraryEnvelope(value,kind,version) {
  if (!value || value.format !== kind || value.version !== version) throw new LibraryFormatError('Unsupported library package or sync version. Update Rostrum; pre-versioned data is not imported.');
  return value;
}
function checkRecordVersion(version) {
  if (version !== LIBRARY_RECORD_VERSION) throw new LibraryFormatError('Unsupported library record version. Update Rostrum.');
}
