/**
 * Common library persistence contract. No environment detection or concrete
 * backend imports belong here. The composition layer supplies an opener.
 *
 * files.read(relativePath) -> Promise<Blob>
 * files.write(relativePath, bytes) -> Promise<void> (durable on success)
 * files.remove(relativePath) -> Promise<void>
 * database.exec(sql, parameters) -> object[] (SQLite connection semantics)
 * database.flush() -> Promise<void> (all committed changes durable on success)
 * database.export() -> Uint8Array | Promise<Uint8Array> (consistent SQLite image)
 * database.close() -> void | Promise<void>
 *
 * Backends surface permission, quota and persistence failures; they must not
 * silently fall back to temporary storage. Selected-folder and IndexedDB
 * backends must implement database persistence as well as score storage.
 */
export async function openLibraryStorage(opener) {
  if (typeof opener !== 'function') throw new Error('A library storage backend must be configured.');
  const storage = await opener();
  for (const [component, methods] of Object.entries({ files: ['read', 'write', 'remove'], database: ['exec', 'flush', 'export', 'close'] })) {
    for (const method of methods) {
      if (typeof storage?.[component]?.[method] !== 'function') {
        throw new Error(`Invalid library storage backend: ${component}.${method}`);
      }
    }
  }
  return storage;
}
