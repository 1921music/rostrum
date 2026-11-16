import {LIBRARY_APPLICATION_ID,LIBRARY_SCHEMA_VERSION,LIBRARY_STORAGE_VERSION,LIBRARY_RECORD_VERSION,LibraryFormatError} from './bookshelf-format.js';

export const libraryTables = ['documents','entries','annotations','tags','document_tags','entry_tags','bookshelves','bookshelf_documents','playlists','playlist_items'];

function createSchema(db) {
  const definitions = {
    documents:'content_hash TEXT NOT NULL, storage_path TEXT NOT NULL UNIQUE, size_bytes INTEGER NOT NULL, derived_from_id TEXT REFERENCES documents(id), replaced_by_id TEXT REFERENCES documents(id), settings_json TEXT NOT NULL DEFAULT \'{}\'',
    entries:'document_id TEXT NOT NULL REFERENCES documents(id), parent_id TEXT REFERENCES entries(id), anchor_json TEXT NOT NULL',
    annotations:'document_id TEXT NOT NULL REFERENCES documents(id), anchor_json TEXT NOT NULL, content_json TEXT NOT NULL',
    tags:'name TEXT NOT NULL',
    document_tags:'document_id TEXT NOT NULL REFERENCES documents(id), tag_id TEXT NOT NULL REFERENCES tags(id)',
    entry_tags:'entry_id TEXT NOT NULL REFERENCES entries(id), tag_id TEXT NOT NULL REFERENCES tags(id)',
    bookshelves:'',
    bookshelf_documents:'bookshelf_id TEXT NOT NULL REFERENCES bookshelves(id), document_id TEXT NOT NULL REFERENCES documents(id), order_key TEXT NOT NULL',
    playlists:'',
    playlist_items:'playlist_id TEXT NOT NULL REFERENCES playlists(id), entry_id TEXT NOT NULL REFERENCES entries(id), order_key TEXT NOT NULL',
  };
  for (const [name,extra] of Object.entries(definitions)) db.exec(`CREATE TABLE ${name} (
    id TEXT PRIMARY KEY NOT NULL, revision_id TEXT NOT NULL, deleted_at TEXT,
    metadata_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(metadata_json))${extra ? ',' + extra : ''})`);
  db.exec('CREATE TABLE changes (id TEXT PRIMARY KEY, device_id TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, parent_revision_ids_json TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL, record_version INTEGER NOT NULL)');
  db.exec('CREATE TABLE local_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  db.exec('CREATE INDEX changes_entity ON changes(entity_type,entity_id)');
  db.exec('CREATE INDEX entries_document ON entries(document_id)');
  db.exec('CREATE INDEX documents_hash ON documents(content_hash)');
  db.exec("CREATE INDEX entries_title ON entries(json_extract(metadata_json,'$.title'))");
  db.exec('CREATE TABLE library_info (id INTEGER PRIMARY KEY CHECK(id=1), storage_format_version INTEGER NOT NULL, record_format_version INTEGER NOT NULL)');
  db.exec('INSERT INTO library_info VALUES (1,?,?)',[LIBRARY_STORAGE_VERSION,LIBRARY_RECORD_VERSION]);
}

function transaction(db,run) {
  db.exec('BEGIN IMMEDIATE');
  try { run(); db.exec('COMMIT'); }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}

export async function initializeLibrarySchema(db) {
  let version = db.exec('PRAGMA user_version')[0].user_version;
  const app = db.exec('PRAGMA application_id')[0].application_id;
  const tables = db.exec("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  if (app && app !== LIBRARY_APPLICATION_ID || !version && tables.length || version && app !== LIBRARY_APPLICATION_ID) throw new LibraryFormatError('The selected database is not a Rostrum library.');
  if (version && (version !== LIBRARY_SCHEMA_VERSION)) throw new LibraryFormatError('Unsupported library schema. Update Rostrum; pre-versioned data is not migrated.');
  if (version) {
    const info = db.exec('SELECT * FROM library_info WHERE id=1')[0];
    if (!info || info.storage_format_version !== LIBRARY_STORAGE_VERSION || info.record_format_version !== LIBRARY_RECORD_VERSION) throw new LibraryFormatError('Unsupported library data or storage format. Update Rostrum.');
  }
  if (!version) {
    transaction(db,() => {
      createSchema(db);
      db.exec(`PRAGMA application_id=${LIBRARY_APPLICATION_ID}`);
      db.exec(`PRAGMA user_version=${LIBRARY_SCHEMA_VERSION}`);
    });
    await db.flush(); version = LIBRARY_SCHEMA_VERSION;
  }
  if (version !== LIBRARY_SCHEMA_VERSION) throw new LibraryFormatError('Unsupported library schema. Update Rostrum.');
}
