import { DirectoryLibraryFiles } from './bookshelf-files.js';
import { holdLibraryLock } from './bookshelf-storage-lock.js';

export async function openDirectoryBytes({ directory }) {
  if (!directory || directory.kind !== 'directory') throw new Error('Choose a library folder first.');
  const release = await holdLibraryLock('rostrum-library-folder:' + directory.name);
  const files = new DirectoryLibraryFiles(directory);
  let persisted;
  const digest = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].join(',');
  const read = async () => {
    try { return await (await files.read('library.sqlite')).arrayBuffer(); }
    catch (error) { if (error.name === 'NotFoundError') return null; throw error; }
  };
  try {
    const original = await read(); persisted = original && await digest(original);
    return { files, readDatabase: async () => original,
      async writeDatabase(bytes) {
        const current = await read();
        if ((current && await digest(current)) !== persisted) throw new Error('The library database was changed outside this session. Reopen it before saving.');
        await files.write('library.sqlite', bytes); persisted = await digest(bytes);
      }, close: release };
  } catch (error) { release(); throw error; }
}
