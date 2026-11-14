// Relative paths are identical for OPFS and user-selected directories. This
// adapter never discovers a root itself: the storage backend supplies it.
export class DirectoryLibraryFiles {
  constructor(root) { this.root = root; }
  async parent(path, create = false) {
    const parts = path.split('/');
    if (parts.some(part => !part || part === '.' || part === '..' || /[\\\x00]/.test(part))) {
      throw new Error('Invalid library path');
    }
    const name = parts.pop();
    let directory = this.root;
    for (const part of parts) directory = await directory.getDirectoryHandle(part, { create });
    return { directory, name };
  }
  async read(path) {
    const { directory, name } = await this.parent(path);
    return (await directory.getFileHandle(name)).getFile();
  }
  async write(path, bytes) {
    const { directory, name } = await this.parent(path, true);
    const handle = await directory.getFileHandle(name, { create: true });
    const writer = await handle.createWritable();
    try { await writer.write(bytes); await writer.close(); }
    catch (error) { await writer.abort().catch(() => {}); throw error; }
  }
  async remove(path) {
    const { directory, name } = await this.parent(path);
    await directory.removeEntry(name);
  }
}
