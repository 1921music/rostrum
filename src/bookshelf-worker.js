import { openLibraryStorage } from './bookshelf-storage.js';
import { openConfiguredLibraryStorage } from './bookshelf-storage-policy.js';
import { unzipSync } from 'fflate';
import { exportLibraryPackage, readLibraryPackage, hashBytes } from './bookshelf-transfer.js';

// All database and file mutations run serially in this worker. A second tab
// must fail explicitly rather than silently switching to temporary storage.
let db, files;
let initialized = false;
let storageOptions = {};
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
function heads(table, id) {
  const changes = sql('SELECT * FROM changes WHERE entity_type=? AND entity_id=?', [table, id]);
  const parents = new Set(changes.flatMap(change => JSON.parse(change.parent_revision_ids_json)));
  return changes.filter(change => !parents.has(change.id));
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
function save(table, values, parents = null) {
  if (!Object.hasOwn(tables, table)) throw new Error('Unknown library record type');
  if (typeof values.id !== 'string' || !values.id) throw new Error('Record identity is required');
  const previous = sql(`SELECT * FROM ${table} WHERE id = ?`, [values.id])[0];
  if (!parents && heads(table, values.id).length > 1) throw new Error('Resolve the conflicting edits before changing this item.');
  if (previous && table === 'documents') {
    for (const key of ['storage_path', 'content_hash', 'size_bytes']) {
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
  writeRow(table, row);
  sql('INSERT INTO changes VALUES (?,?,?,?,?,?,?)', [revision, deviceId, table, row.id,
    JSON.stringify(parents || (previous ? [previous.revision_id] : [])), JSON.stringify(row), new Date().toISOString()]);
  return row;
}
let deviceId;
function validateTransfer(manifest) {
  const schemas = Object.fromEntries(Object.keys(tables).map(table => [table, sql(`PRAGMA table_info(${table})`)]));
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
  const sameChange = (a, b) => ['id', 'entity_type', 'entity_id', 'parent_revision_ids_json', 'payload_json', 'created_at', 'device_id'].every(key => a[key] === b[key]);
  for (const change of manifest.changes) {
    if (!change || ['id', 'device_id', 'entity_type', 'entity_id', 'parent_revision_ids_json', 'payload_json', 'created_at'].some(key => typeof change[key] !== 'string')) throw new Error('Invalid change record');
    if (incoming.has(change.id)) throw new Error('Duplicate change identity');
    const row = normalize(change.entity_type, JSON.parse(change.payload_json));
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
      if (!change || change.entity_type !== table || change.entity_id !== row.id || JSON.stringify(normalize(table, JSON.parse(change.payload_json))) !== JSON.stringify(row)) throw new Error('Library record does not match its change history');
    }
  }
  const documents = new Map(manifest.records.documents.map(doc => [doc.id, doc]));
  for (const change of incoming.values()) if (change.entity_type === 'documents') {
    const row = JSON.parse(change.payload_json), doc = documents.get(row.id);
    if (!doc || ['storage_path', 'content_hash', 'size_bytes'].some(key => row[key] !== doc[key])) throw new Error('A document identity has different file contents');
    const local = sql('SELECT * FROM documents WHERE id=? OR storage_path=?', [doc.id, doc.storage_path])[0];
    if (local && (local.id !== doc.id || ['storage_path', 'content_hash', 'size_bytes'].some(key => local[key] !== doc[key]))) throw new Error('The package would overwrite a different score');
  }
  return { incoming, normalize, known };
}
async function open() {
  if (initialized) return;
  if (!db) ({ database: db, files } = await openLibraryStorage(() => openConfiguredLibraryStorage(storageOptions)));
  sql('PRAGMA foreign_keys=ON');
  sql('PRAGMA trusted_schema=OFF');
  const applicationId = sql('PRAGMA application_id')[0].application_id;
  const existingTables = sql("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").map(row => row.name);
  if (applicationId && applicationId !== 0x5253544d || !applicationId && existingTables.length && !['documents', 'entries', 'changes'].every(name => existingTables.includes(name))) {
    throw new Error('The selected database is not a Rostrum library.');
  }
  const version = sql('PRAGMA user_version')[0].user_version;
  if (version > 1) throw new Error('This library requires a newer Rostrum version.');
  transaction(() => {
    for (const [name, extra] of Object.entries(tables)) sql(`CREATE TABLE IF NOT EXISTS ${name} (
      id TEXT PRIMARY KEY NOT NULL, revision_id TEXT NOT NULL, deleted_at TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(metadata_json))${extra ? ',' + extra : ''})`);
    sql('CREATE TABLE IF NOT EXISTS changes (id TEXT PRIMARY KEY, device_id TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, parent_revision_ids_json TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL)');
    sql('CREATE TABLE IF NOT EXISTS local_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    sql('CREATE INDEX IF NOT EXISTS changes_entity ON changes(entity_type, entity_id)');
    sql("CREATE INDEX IF NOT EXISTS entries_document ON entries(document_id)");
    sql("CREATE INDEX IF NOT EXISTS entries_title ON entries(json_extract(metadata_json, '$.title'))");
    sql('PRAGMA user_version=1');
    sql('PRAGMA application_id=1381192781');
  });
  deviceId = sql("SELECT value FROM local_state WHERE key='device'")[0]?.value || crypto.randomUUID();
  sql("INSERT OR IGNORE INTO local_state VALUES ('device', ?)", [deviceId]);
  initialized = true;
}
const actions = {
  close() {},
  changeIds() { return sql('SELECT id FROM changes ORDER BY id').map(row => row.id); },
  localState(args) {
    if (typeof args.key !== 'string' || !['sync-packages:', 'sync-published:'].some(prefix => args.key.startsWith(prefix))) throw new Error('Invalid sync state key');
    if (Object.hasOwn(args, 'value')) {
      if (!Array.isArray(args.value) || args.value.some(value => typeof value !== 'string')) throw new Error('Invalid sync state');
      sql('INSERT INTO local_state VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [args.key, JSON.stringify(args.value)]);
    }
    const row = sql('SELECT value FROM local_state WHERE key=?', [args.key])[0];
    return row ? JSON.parse(row.value) : null;
  },
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
          await files.write(doc.storage_path, manifest.archive[doc.storage_path]); created.push(doc.storage_path);
        }
      }
      transaction(() => {
        sql('PRAGMA defer_foreign_keys=ON');
        for (const change of incoming.values()) if (!known.has(change.id)) {
          sql('INSERT INTO changes VALUES (?,?,?,?,?,?,?)', [change.id, change.device_id, change.entity_type,
            change.entity_id, change.parent_revision_ids_json, change.payload_json, change.created_at]);
        }
        const entities = new Map([...incoming.values()].map(change => [change.entity_type + ':' + change.entity_id, change]));
        for (const { entity_type: table, entity_id: id } of entities.values()) {
          const alternatives = heads(table, id).sort((a,b) => a.id.localeCompare(b.id));
          const chosen = alternatives.at(-1);
          writeRow(table, normalize(table, JSON.parse(chosen.payload_json)));
        }
        validateRelations();
        if (sql('PRAGMA foreign_key_check').length) throw new Error('The package contains broken library references');
      });
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
      const row = JSON.parse(chosen.payload_json);
      delete row.revision_id;
      // Always record the explicit resolution, even when the chosen payload
      // matches the currently displayed branch.
      return save(table, row, alternatives.map(change => change.id));
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
self.onmessage = ({ data }) => {
  if (data.hostReply) return;
  const { id, action, args } = data;
  queue = queue.then(async () => {
    let actionCompleted = false;
    try {
      if (!Object.hasOwn(actions, action)) throw new Error('Unknown library operation');
      if (action === 'open' && args?.storage) {
        if (db) throw new Error('Close the current library before changing storage');
        storageOptions = args.storage;
      }
      if (action === 'close') {
        if (db) { await db.flush(); await db.close(); }
        db = files = null; initialized = false;
        self.postMessage({ id, value: true }); return;
      }
      await open();
      const value = await actions[action](args || {});
      actionCompleted = true;
      // An emergency export must remain possible if persistence is failing.
      // SQLite has already committed the in-memory state at this point.
      if (!['backup', 'export'].includes(action)) await db.flush();
      self.postMessage({ id, value });
    } catch (error) { self.postMessage({ id, error: error.message, persistenceFailed: actionCompleted }); }
  });
};
self.postMessage({ ready: true });
