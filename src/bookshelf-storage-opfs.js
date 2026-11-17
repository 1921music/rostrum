import { openDirectoryLibraryStorage } from './bookshelf-storage-directory.js';

// A plain SQLite image makes the OPFS layout identical to a selected folder.
export async function openOpfsLibraryStorage() {
  return openDirectoryLibraryStorage({directory:await navigator.storage.getDirectory()});
}
