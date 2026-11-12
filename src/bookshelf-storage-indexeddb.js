import { openSnapshotDatabase } from './bookshelf-storage-snapshot.js';
import { openIndexedDbBytes } from './bookshelf-storage-bytes-indexeddb.js';

export async function openIndexedDbLibraryStorage({ name = 'rostrum-bookshelf' } = {}) {
  const storage = await openIndexedDbBytes({ name });
  try {
    const database = await openSnapshotDatabase({ read: storage.readDatabase, write: storage.writeDatabase, release: storage.close });
    return { files: storage.files, database };
  } catch (error) { storage.close(); throw error; }
}
