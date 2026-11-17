import { holdLibraryLock } from './bookshelf-storage-lock.js';

export async function openIndexedDbBytes({ name = 'rostrum-bookshelf-v4' } = {}) {
  const release = await holdLibraryLock('rostrum-library-idb:' + name);
  let connection;
  try {
    connection = await new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('files');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const access = (mode, run) => new Promise((resolve, reject) => {
      const transaction = connection.transaction('files', mode);
      const request = run(transaction.objectStore('files'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = transaction.onerror = () => reject(transaction.error || request.error);
    });
    const validate = path => {
      if (typeof path !== 'string' || path.split('/').some(p => !p || p === '.' || p === '..' || /[\\\x00]/.test(p))) throw new Error('Invalid library path');
      return path;
    };
    const files = {
      async list(path = '') {
        const prefix = path ? validate(path) + '/' : '', keys = await access('readonly',store => store.getAllKeys());
        const entries = new Map();
        for (const key of keys) if (typeof key === 'string' && key.startsWith(prefix)) {
          const parts = key.slice(prefix.length).split('/');
          entries.set(parts[0],{name:parts[0],kind:parts.length > 1 ? 'directory' : 'file'});
        }
        return [...entries.values()];
      },
      async read(path) {
        const value = await access('readonly', store => store.get(validate(path)));
        if (!value) throw new DOMException('Library file not found', 'NotFoundError');
        return value;
      },
      async write(path, bytes) { await access('readwrite', store => store.put(new Blob([bytes]), validate(path))); },
      async remove(path) { await access('readwrite', store => store.delete(validate(path))); },
    };
    return { files,
      async readDatabase() { const blob = await access('readonly', store => store.get('library.sqlite')); return blob && blob.arrayBuffer(); },
      writeDatabase: bytes => files.write('library.sqlite', bytes),
      clear: () => access('readwrite', store => store.clear()),
      close() { connection.close(); release(); },
    };
  } catch (error) { connection?.close(); release(); throw error; }
}
