import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { DirectoryLibraryFiles } from './bookshelf-files.js';

// Storage backend boundary: both scores and SQLite persistence belong here.
// A selected-directory backend must provide its own database persistence;
// swapping the file root does NOT redirect the OPFS SQLite VFS.
export async function openOpfsLibraryStorage() {
  const root = await navigator.storage.getDirectory();
  const sqlite = await sqlite3InitModule({ locateFile: name => new URL(name, import.meta.url).href });
  const pool = await sqlite.installOpfsSAHPoolVfs({ directory: '.rostrum-library-db' });
  const db = new pool.OpfsSAHPoolDb('/library.sqlite');
  return {
    files: new DirectoryLibraryFiles(root),
    database: {
      exec(statement, bind = []) {
        return db.exec({ sql: statement, bind, rowMode: 'object', returnValue: 'resultRows' });
      },
      export() { return pool.exportFile('/library.sqlite'); },
      async flush() { /* The OPFS VFS flushes synchronously on SQLite COMMIT. */ },
      close() { db.close(); },
    },
  };
}
