import { openIndexedDbBytes } from './bookshelf-storage-bytes-indexeddb.js';
import { openDirectoryBytes } from './bookshelf-storage-bytes-directory.js';

// Permission prompts must run on the host page from an explicit user gesture,
// even when the selected directory is otherwise used by a Worker.
export async function queryStoragePermission(options) {
  if (options?.kind !== 'directory') return 'granted';
  return options.directory.queryPermission({ mode: 'readwrite' });
}
export async function requestStoragePermission(options) {
  if (options?.kind !== 'directory') return;
  const result = await options.directory.requestPermission({ mode: 'readwrite' });
  if (result !== 'granted') throw new DOMException('Library folder access was not allowed. You can try again or choose another folder.', 'NotAllowedError');
}

// file:// workers have an opaque origin. Keep origin-bound storage APIs on
// the host page and pass only file bytes/Blobs to the SQLite worker.
export async function openHostStorage(options) {
  if (options.kind === 'indexeddb') return openIndexedDbBytes(options);
  if (options.kind === 'directory') return openDirectoryBytes(options);
  throw new Error('Choose a supported storage backend for the standalone library.');
}

async function selectionStore(mode, run) {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('rostrum-library-selection', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('selection');
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('selection', mode), request = run(transaction.objectStore('selection'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = transaction.onerror = () => reject(transaction.error || request.error);
    });
  } finally { db.close(); }
}
export function loadSelection() { return selectionStore('readonly', store => store.get('current')); }
export function saveSelection(options) {
  return selectionStore('readwrite', store => options?.kind ? store.put(options, 'current') : store.delete('current'));
}
export function loadCloudSelection() { return selectionStore('readonly', store => store.get('cloud')); }
export function saveCloudSelection(options) { return selectionStore('readwrite', store => store.put(options, 'cloud')); }
export function loadSyncSettings() { return selectionStore('readonly', store => store.get('sync-settings')); }
export function saveSyncSettings(options) { return selectionStore('readwrite', store => store.put(options, 'sync-settings')); }
