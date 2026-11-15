// This table list describes CURRENT shared entities. New shared entities can be
// added here, but their DDL belongs in a schema migration, never in the baseline.
export const libraryTables = ['documents','entries','annotations','tags','document_tags','entry_tags','bookshelves','bookshelf_documents','playlists','playlist_items'];

// Frozen generation-2 bootstrap. All future installations start here and run
// the same upgrade chain as existing libraries. Do not edit this DDL for v3+.
export function createLibrarySchemaV2(db) {
  const baseline = {
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
  for (const [name,extra] of Object.entries(baseline)) db.exec(`CREATE TABLE ${name} (
    id TEXT PRIMARY KEY NOT NULL, revision_id TEXT NOT NULL, deleted_at TEXT,
    metadata_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(metadata_json))${extra ? ',' + extra : ''})`);
  db.exec('CREATE TABLE changes (id TEXT PRIMARY KEY, device_id TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, parent_revision_ids_json TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL, record_version INTEGER NOT NULL)');
  db.exec('CREATE TABLE local_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  db.exec('CREATE INDEX changes_entity ON changes(entity_type,entity_id)');
  db.exec('CREATE INDEX entries_document ON entries(document_id)');
  db.exec('CREATE INDEX documents_hash ON documents(content_hash)');
  db.exec("CREATE INDEX entries_title ON entries(json_extract(metadata_json,'$.title'))");
}
