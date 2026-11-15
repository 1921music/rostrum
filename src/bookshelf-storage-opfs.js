import { initializeLibrarySqlite } from './bookshelf-sqlite.js';
import { DirectoryLibraryFiles } from './bookshelf-files.js';

// Storage backend boundary: both scores and SQLite persistence belong here.
// A selected-directory backend must provide its own database persistence;
// swapping the file root does NOT redirect the OPFS SQLite VFS.
export async function openOpfsLibraryStorage() {
  const root = await navigator.storage.getDirectory();
  const sqlite = await initializeLibrarySqlite();
  const pool = await sqlite.installOpfsSAHPoolVfs({ directory: '.rostrum-library-db' });
  const db = new pool.OpfsSAHPoolDb('/library.sqlite');
  const files = new DirectoryLibraryFiles(root);
  return {
    files,
    database: {
      exec(statement, bind = []) {
        return db.exec({ sql: statement, bind, rowMode: 'object', returnValue: 'resultRows' });
      },
      export() { return pool.exportFile('/library.sqlite'); },
      async flush() { /* The OPFS VFS flushes synchronously on SQLite COMMIT. */ },
      close() { db.close(); },
      async destroy() {
        db.close(); await files.clearLibrary({database:false});
        if (!await pool.removeVfs()) throw new Error('Could not remove the OPFS library database.');
        try {
          await root.getDirectoryHandle('.rostrum-library-db');
          throw new Error('The OPFS library database could not be fully removed.');
        } catch (error) { if (error.name !== 'NotFoundError') throw error; }
      },
    },
  };
}
