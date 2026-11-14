import { openOpfsLibraryStorage } from './bookshelf-storage-opfs.js';
import { openIndexedDbLibraryStorage } from './bookshelf-storage-indexeddb.js';
import { openDirectoryLibraryStorage } from './bookshelf-storage-directory.js';
import { openBridgedLibraryStorage } from './bookshelf-storage-bridge.js';

// Temporary development wiring, not an environment support policy. Select
// OPFS, selected-directory or IndexedDB implementations here after evaluating
// target environments. Keep this choice out of library business logic.
export function openConfiguredLibraryStorage(options = {}) {
  if (options.kind === 'host') return openBridgedLibraryStorage();
  if (options.kind === 'indexeddb') return openIndexedDbLibraryStorage(options);
  if (options.kind === 'directory') return openDirectoryLibraryStorage(options);
  if (!options.kind || options.kind === 'opfs') return openOpfsLibraryStorage();
  throw new Error('Unknown library storage backend');
}
