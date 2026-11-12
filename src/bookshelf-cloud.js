// +skip
export { LibraryCloudTransport };
// -skip

class LibraryCloudTransport {
  constructor(source, path = '') {
    this.source = source;
    const relative = path.replace(/^\/+|\/+$/g, '');
    if (relative && relative.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Choose a valid cloud folder path');
    this.path = relative ? '/' + relative : ''; // CachedSrc uses a leading slash below its root.
    this.id = source.source + ':' + this.path;
  }
  async connect() { await this.source.auth(); await this.source.getDir(this.path, true); }
  name(id) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid remote package identity');
    return 'rostrum-library-' + id + '.zip';
  }
  async list() {
    const directory = await this.source.getDir(this.path, true);
    return Object.keys(directory.files).flatMap(name => {
      const match = /^rostrum-library-([0-9a-f-]{36})\.zip$/i.exec(name);
      return match ? [{ id: match[1] }] : [];
    });
  }
  async read(id) {
    const directory = await this.source.getDir(this.path, true), name = this.name(id);
    const file = directory.files[name]; if (!file) throw new Error('Cloud package is no longer available');
    const bytes = await this.source.getFileSrc(this.path, name, directory, file);
    return new Blob([bytes], { type: 'application/zip' });
  }
  async write(id, file) {
    const name = this.name(id), pending = '.rostrum-library-' + id + '.pending.zip';
    const directory = await this.source.getDir(this.path, true);
    if (directory.files[name] || directory.files[pending]) throw new Error('A package with this identity already exists');
    try {
      await this.source.putFile(this.path, pending, file);
      await this.source.getDir(this.path, true);
      await this.source.renameFile(this.path, pending, name);
    } catch (error) {
      try { await this.source.getDir(this.path, true); await this.source.trashFile(this.path, pending); } catch { /* Retain the original transfer failure. */ }
      throw error;
    }
  }
}
