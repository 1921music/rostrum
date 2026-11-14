import { openSnapshotDatabase } from './bookshelf-storage-snapshot.js';
import { openDirectoryBytes } from './bookshelf-storage-bytes-directory.js';

export async function openDirectoryLibraryStorage({ directory }) {
  const storage = await openDirectoryBytes({ directory });
  try {
    const database = await openSnapshotDatabase({ read: storage.readDatabase, write: storage.writeDatabase, release: storage.close });
    return { files: storage.files, database };
  } catch (error) { storage.close(); throw error; }
}
