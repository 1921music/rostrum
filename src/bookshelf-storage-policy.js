import { openOpfsLibraryStorage } from './bookshelf-storage-opfs.js';

// Temporary development wiring, not an environment support policy. Select
// OPFS, selected-directory or IndexedDB implementations here after evaluating
// target environments. Keep this choice out of library business logic.
export const openConfiguredLibraryStorage = openOpfsLibraryStorage;
