import { openLibraryStorage } from './bookshelf-storage.js';
import { openConfiguredLibraryStorage } from './bookshelf-storage-policy.js';
import { unzipSync } from 'fflate';

// All database and file mutations run serially in this worker. A second tab
// must fail explicitly rather than silently switching to temporary storage.
let db, files;
let initialized = false;
const tables = {
  documents: 'content_hash TEXT NOT NULL, storage_path TEXT NOT NULL UNIQUE, size_bytes INTEGER NOT NULL, derived_from_id TEXT REFERENCES documents(id), replaced_by_id TEXT REFERENCES documents(id), settings_json TEXT NOT NULL DEFAULT \'{}\'',
  entries: 'document_id TEXT NOT NULL REFERENCES documents(id), parent_id TEXT REFERENCES entries(id), anchor_json TEXT NOT NULL',
  annotations: 'document_id TEXT NOT NULL REFERENCES documents(id), anchor_json TEXT NOT NULL, content_json TEXT NOT NULL',
  tags: 'name TEXT NOT NULL',
  document_tags: 'document_id TEXT NOT NULL REFERENCES documents(id), tag_id TEXT NOT NULL REFERENCES tags(id)',
  entry_tags: 'entry_id TEXT NOT NULL REFERENCES entries(id), tag_id TEXT NOT NULL REFERENCES tags(id)',
  bookshelves: '',
  bookshelf_documents: 'bookshelf_id TEXT NOT NULL REFERENCES bookshelves(id), document_id TEXT NOT NULL REFERENCES documents(id), order_key TEXT NOT NULL',
  playlists: '',
  playlist_items: 'playlist_id TEXT NOT NULL REFERENCES playlists(id), entry_id TEXT NOT NULL REFERENCES entries(id), order_key TEXT NOT NULL',
};
function sql(statement, bind = []) {
  return db.exec(statement, bind);
}
function transaction(run) {
  sql('BEGIN IMMEDIATE');
  try { const value = run(); sql('COMMIT'); return value; }
  catch (error) { sql('ROLLBACK'); throw error; }
}
function save(table, values) {
  if (!Object.hasOwn(tables, table)) throw new Error('Unknown library record type');
  if (typeof values.id !== 'string' || !values.id) throw new Error('Record identity is required');
  const previous = sql(`SELECT * FROM ${table} WHERE id = ?`, [values.id])[0];
  if (previous && table === 'documents') {
    for (const key of ['storage_path', 'content_hash', 'size_bytes']) {
      if (Object.hasOwn(values, key) && values[key] !== previous[key]) throw new Error('Import a new document to replace score contents');
    }
  }
  if (previous && Object.entries(values).every(([key, value]) => previous[key] === value)) return previous;
  const columns = new Set(sql(`PRAGMA table_info(${table})`).map(column => column.name));
  for (const key of Object.keys(values)) if (!columns.has(key)) throw new Error('Unknown field: ' + key);
  const revision = crypto.randomUUID();
  const row = { metadata_json: '{}', ...previous, ...values, revision_id: revision,
    deleted_at: Object.hasOwn(values, 'deleted_at') ? values.deleted_at : previous?.deleted_at ?? null };
  for (const [key, value] of Object.entries(row)) {
    if (key.endsWith('_json')) JSON.parse(value);
  }
  const keys = Object.keys(row);
  sql(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?')})
    ON CONFLICT(id) DO UPDATE SET ${keys.filter(k => k !== 'id').map(k => `${k}=excluded.${k}`).join(',')}`, Object.values(row));
  sql('INSERT INTO changes VALUES (?,?,?,?,?,?,?)', [revision, deviceId, table, row.id,
    JSON.stringify(previous ? [previous.revision_id] : []), JSON.stringify(row), new Date().toISOString()]);
  return row;
}
let deviceId;
async function open() {
  if (initialized) return;
  if (!db) ({ database: db, files } = await openLibraryStorage(openConfiguredLibraryStorage));
  sql('PRAGMA foreign_keys=ON');
  const version = sql('PRAGMA user_version')[0].user_version;
  if (version > 1) throw new Error('This library requires a newer Rostrum version.');
  transaction(() => {
    for (const [name, extra] of Object.entries(tables)) sql(`CREATE TABLE IF NOT EXISTS ${name} (
      id TEXT PRIMARY KEY NOT NULL, revision_id TEXT NOT NULL, deleted_at TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(metadata_json))${extra ? ',' + extra : ''})`);
    sql('CREATE TABLE IF NOT EXISTS changes (id TEXT PRIMARY KEY, device_id TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, parent_revision_ids_json TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL)');
    sql('CREATE TABLE IF NOT EXISTS local_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    sql("CREATE INDEX IF NOT EXISTS entries_document ON entries(document_id)");
    sql("CREATE INDEX IF NOT EXISTS entries_title ON entries(json_extract(metadata_json, '$.title'))");
    sql('PRAGMA user_version=1');
  });
  deviceId = sql("SELECT value FROM local_state WHERE key='device'")[0]?.value || crypto.randomUUID();
  sql("INSERT OR IGNORE INTO local_state VALUES ('device', ?)", [deviceId]);
  initialized = true;
}
const actions = {
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
  async open() { await open(); return { version: 1 }; },
  async importFile({ file, entries, replacesId = null, derivedFromId = null }) {
    const id = crypto.randomUUID();
    const bytes = await file.arrayBuffer();
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
    const normalized = file.name.normalize('NFC').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[ .]+$/, '');
    const extension = normalized.match(/\.[a-z0-9]{1,12}$/i)?.[0] || '';
    const stem = extension ? normalized.slice(0, -extension.length) : normalized;
    const safeName = ([...stem].slice(0, 100).join('').replace(/[ .]+$/, '') || 'score') + extension;
    const path = `scores/${id}__${safeName}`;
    try {
      await files.write(path, bytes);
      return transaction(() => {
        const document = save('documents', { id, content_hash: hash, storage_path: path, size_bytes: file.size,
          settings_json: '{}', metadata_json: JSON.stringify({ displayName: file.name, originalFilename: file.name, format: file.name.split('.').pop().toLowerCase() }) });
        for (const entry of entries) save('entries', { id: entry.id, document_id: id, parent_id: entry.parent_id || null,
          anchor_json: JSON.stringify(entry.anchor), metadata_json: JSON.stringify(entry.metadata) });
        if (derivedFromId) save('documents', { id, derived_from_id: derivedFromId });
        if (replacesId) {
          if (!sql('SELECT id FROM documents WHERE id=? AND deleted_at IS NULL', [replacesId]).length) throw new Error('Original score not found');
          save('documents', { id: replacesId, replaced_by_id: id });
          for (const link of sql('SELECT * FROM bookshelf_documents WHERE document_id=? AND deleted_at IS NULL', [replacesId])) {
            save('bookshelf_documents', { id: crypto.randomUUID(), bookshelf_id: link.bookshelf_id,
              document_id: id, order_key: link.order_key, metadata_json: link.metadata_json });
          }
          for (const link of sql('SELECT tag_id FROM document_tags WHERE document_id=? AND deleted_at IS NULL', [replacesId])) {
            save('document_tags', { id: crypto.randomUUID(), document_id: id, tag_id: link.tag_id });
          }
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
        save('entries', { id, document_id: documentId, parent_id: entry.parent_id ? mapping.get(entry.parent_id) || null : null,
          anchor_json: match && (metadata.userEditedFields || []).includes('anchor') ? match.anchor_json : JSON.stringify(entry.anchor),
          metadata_json: JSON.stringify(metadata) });
      }
      // Unmatched existing records and their references intentionally survive.
      return { count: entries.length };
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
  async read({ id }) {
    const document = sql('SELECT * FROM documents WHERE id=? AND deleted_at IS NULL', [id])[0];
    if (!document) throw new Error('Score not found');
    return { document, file: await files.read(document.storage_path), annotations:
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
  update({ table, values }) { return transaction(() => save(table, values)); },
  link({ table, values }) {
    if (!['document_tags', 'entry_tags', 'bookshelf_documents', 'playlist_items'].includes(table)) throw new Error('Invalid membership');
    return transaction(() => {
      if (table !== 'playlist_items') {
        const rows = sql(`SELECT * FROM ${table} WHERE deleted_at IS NULL`);
        const existing = rows.find(row => Object.entries(values).filter(([key]) => key !== 'order_key').every(([key, value]) => row[key] === value));
        if (existing) return existing;
      }
      return save(table, { id: crypto.randomUUID(), ...values });
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
self.onmessage = ({ data: { id, action, args } }) => {
  queue = queue.then(async () => {
    try {
      if (!Object.hasOwn(actions, action)) throw new Error('Unknown library operation');
      await open();
      const value = await actions[action](args || {});
      await db.flush();
      self.postMessage({ id, value });
    } catch (error) { self.postMessage({ id, error: error.message }); }
  });
};
