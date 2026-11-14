import { initializeLibrarySqlite } from './bookshelf-sqlite.js';

// SQLite runs in memory, but an operation is successful only after flush has
// persisted the complete image. This backend is deliberately explicit: it is
// not a silent fallback if OPFS fails.
export async function openSnapshotDatabase({ read, write, release = () => {} }) {
  const sqlite = await initializeLibrarySqlite();
  const bytes = await read();
  const filename = '/library-' + crypto.randomUUID() + '.sqlite';
  if (bytes) sqlite.capi.sqlite3_js_posix_create_file(filename, new Uint8Array(bytes));
  const db = new sqlite.oo1.DB(filename, 'c');
  let dirty = false;
  return {
    exec(statement, bind = []) {
      const rows = db.exec({ sql: statement, bind, rowMode: 'object', returnValue: 'resultRows' });
      // Reads may conservatively trigger a flush; correctness comes before a
      // dirty-page optimization for these snapshot-based implementations.
      if (!/^\s*(SELECT|PRAGMA table_info|PRAGMA user_version$)/i.test(statement)) dirty = true;
      return rows;
    },
    export() { return sqlite.capi.sqlite3_js_db_export(db); },
    async flush() {
      if (!dirty) return;
      await write(sqlite.capi.sqlite3_js_db_export(db)); dirty = false;
    },
    async close() { try { db.close(); } finally { await release(); } },
  };
}

