// +skip
import { Score } from './score.js';
import { checkUnsaved, FileSrc } from './file.js';
import { toast, css, listen } from './common.js';
import { exchangeLibraryPackages } from './bookshelf-sync.js';
import { LibraryCloudTransport } from './bookshelf-cloud.js';
// -skip

class BookshelfStore extends EventTarget {
  constructor() { super(); this.pending = new Map(); this.sequence = 0; }
  setPermissionRequired(required) {
    this.permissionRequired = required;
    this.dispatchEvent(new Event('permissionchange'));
  }
  async reauthorizeStorage() {
    // Call requestPermission before any other await to retain user activation.
    await window.RostrumLibraryHost.requestStoragePermission(this.storage);
    this.setPermissionRequired(false);
    await this.call('open');
    if (Score.activeScore?.libraryDocumentId) await this.flush(Score.activeScore);
  }
  async configure(storage) {
    if (this.syncPending) throw new Error('Wait for library sync before changing its location.');
    if (Score.activeScore?.libraryDocumentId) {
      await this.flush(Score.activeScore); await Score.activeScore.dispose();
    }
    if (this.worker) { await this.call('close'); this.worker.terminate(); }
    this.worker = this.workerStarting = null; this.storage = storage;
    const result = await this.call('open');
    try { await window.RostrumLibraryHost.saveSelection(storage); }
    catch { toast('Library opened, but its location could not be remembered. Choose it again next time.'); }
    return result;
  }
  async sync(transport) {
    if (this.syncPending) throw new Error('Library sync is already running.');
    const previous = Score.activeScore;
    const documentId = previous?.libraryDocumentId;
    const index = Math.max(0, Number(previous?.numbers?.pn || 1) - 1);
    const anchor = previous && { type: previous.music ? 'music' : 'pdf', pageIndex: previous.pgs[index]?.mozPn ? previous.pgs[index].mozPn - 1 : index };
    this.syncPending = true;
    const cancelDisplay = _shade_.cancel.style.display;
    _shade_.cancel.style.display = 'none';
    _shade_.show('Syncing library', 0);
    try { return await exchangeLibraryPackages(this, transport); }
    finally {
      if (documentId && !Score.activeScore) {
        try { await this.openDocument(documentId, anchor, true); }
        catch (error) { toast('Review the synced library before reopening this score: ' + error.message); }
      }
      this.syncPending = false;
      _shade_.cancel.style.display = cancelDisplay;
      _shade_.hide();
    }
  }
  async syncCloud(source, path) {
    if (![Score.sources.gdrive, Score.sources.dbx, Score.sources.odrive, Score.sources.pcloud].includes(source)) throw new Error('Choose a cloud service');
    const transport = new LibraryCloudTransport(FileSrc.get(source), path);
    await transport.connect();
    return this.sync(transport);
  }
  scheduleSave(score) {
    score.librarySaveGeneration = (score.librarySaveGeneration || 0) + 1;
    clearTimeout(score.librarySaveTimer);
    score.librarySaveTimer = setTimeout(() => this.flush(score).catch(error => {
      score.librarySaveError = error;
      toast('Library save failed: ' + error.message);
    }), 300);
  }
  async flush(score) {
    clearTimeout(score.librarySaveTimer);
    if (score.librarySavePromise) await score.librarySavePromise;
    if (!score.libraryDocumentId || score.librarySavedGeneration === score.librarySaveGeneration) return;
    const save = async () => {
      while (score.librarySavedGeneration !== score.librarySaveGeneration) {
        const generation = score.librarySaveGeneration;
        const state = await score.captureLibraryState();
        await this.call('saveState', { documentId: score.libraryDocumentId, ...state });
        score.librarySavedGeneration = generation;
      }
      score.librarySaveError = null;
      score.setDirty(false);
    };
    score.librarySavePromise = save();
    try { await score.librarySavePromise; } finally { score.librarySavePromise = null; }
  }
  async openDocument(id, anchor, afterSync = false) {
    if (this.syncPending && !afterSync) throw new Error('Wait for library sync before opening another score.');
    if (Score.activeScore?.libraryDocumentId) await this.flush(Score.activeScore);
    const conflicts = await this.call('conflicts');
    if (conflicts.some(conflict => conflict.table === 'documents' && conflict.id === id
      || conflict.table === 'annotations' && conflict.alternatives.some(change => JSON.parse(change.payload_json).document_id === id))) {
      throw new Error('Resolve this score’s conflicting edits before opening it.');
    }
    const state = await this.call('read', { id });
    const settings = JSON.parse(state.document.settings_json);
    const score = await new Score().init(null, null, JSON.parse(state.document.metadata_json).originalFilename,
      await state.file.arrayBuffer(), true, { ...state, settings });
    if (anchor) {
      let page = Number(anchor.pageIndex);
      if (anchor.type === 'pdf' && Number.isInteger(page)) {
        const actual = score.pgs.findIndex(pg => pg.mozPn === page + 1);
        if (actual < 0) throw new Error('The indexed page is not present in this score view');
        page = actual;
      }
      if (Number.isInteger(page) && page >= 0 && page < score.pgs.length) await window._Layout_.activeLayout.pgGoTo(page + 1);
    }
    return score;
  }
  async ensureWorker() {
    if (this.workerStarting) return this.workerStarting;
    this.workerStarting = (async () => {
      if (this.storage === undefined) this.storage = await window.RostrumLibraryHost.loadSelection() || {};
      if (await window.RostrumLibraryHost.queryStoragePermission(this.storage) !== 'granted') {
        this.setPermissionRequired(true);
        throw new DOMException('Allow access to the remembered library folder to continue.', 'NotAllowedError');
      }
      this.setPermissionRequired(false);
      let url = new URL('bookshelf-worker.js', location.href).href;
      if (location.protocol === 'file:') {
        this.hostStorage = await window.RostrumLibraryHost.openHostStorage(this.storage || {});
        const runtime = window._bookshelfRuntime_;
        if (!runtime) throw new Error('This build does not contain the library runtime.');
        const decode = value => new Uint8Array([...atob(value)].map(char => char.charCodeAt(0)));
        const workerText = await new Response(new Blob([decode(runtime.worker)]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
        const script = `globalThis.rostrumLibraryWasm = new Uint8Array(await new Response(new Blob([Uint8Array.from(atob(${JSON.stringify(runtime.wasm)}), c=>c.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());\n` + workerText;
        const bytes = new TextEncoder().encode(script);
        let binary = ''; for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
        url = 'data:text/javascript;base64,' + btoa(binary);
      }
      this.worker = new Worker(url, { type: 'module' });
      let readyResolve, readyReject;
      const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
      const startupTimeout = setTimeout(() => readyReject(new Error('Library worker did not finish starting.')), 20000);
      this.worker.onmessage = async ({ data }) => {
        if (data.hostRequest) {
          const methods = {
            readDatabase: () => this.hostStorage.readDatabase(), writeDatabase: bytes => this.hostStorage.writeDatabase(bytes), close: () => this.hostStorage.close(),
            read: path => this.hostStorage.files.read(path), write: (path, bytes) => this.hostStorage.files.write(path, bytes), remove: path => this.hostStorage.files.remove(path),
          };
          try {
            if (!Object.hasOwn(methods, data.method)) throw new Error('Unknown storage operation');
            const value = await methods[data.method](...data.args);
            this.worker?.postMessage({ hostReply: data.hostRequest, value });
          } catch (error) { this.worker?.postMessage({ hostReply: data.hostRequest, error: error.message, errorName: error.name }); }
          return;
        }
        if (data.ready) { clearTimeout(startupTimeout); readyResolve(); return; }
        const pending = this.pending.get(data.id);
        if (!pending) return;
        this.pending.delete(data.id);
        data.error ? pending.reject(Object.assign(new Error(data.error), { name: data.errorName || 'Error', persistenceFailed: data.persistenceFailed })) : pending.resolve(data.value);
      };
      this.worker.onerror = () => {
        clearTimeout(startupTimeout); readyReject(new Error('Could not start library storage.'));
        for (const pending of this.pending.values()) pending.reject(new Error('Could not start library storage.'));
        this.pending.clear(); this.worker.terminate(); this.worker = null;
        this.hostStorage?.close(); this.hostStorage = null;
        this.workerStarting = null;
      };
      await ready;
      await this.send('open', { storage: location.protocol === 'file:' ? { kind: 'host' } : this.storage || {} });
      return this.worker;
    })().catch(error => {
      this.worker?.terminate(); this.hostStorage?.close(); this.hostStorage = null;
      this.worker = this.workerStarting = null; throw error;
    });
    return this.workerStarting;
  }
  send(action, args) {
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      this.pending.set(id, { resolve, reject });
      try { this.worker.postMessage({ id, action, args }); }
      catch (error) { this.pending.delete(id); reject(error); }
    });
  }
  async call(action, args = {}) {
    try { await this.ensureWorker(); return await this.send(action, args); }
    catch (error) {
      if (this.storage?.kind === 'directory' && ['NotAllowedError', 'SecurityError'].includes(error.name)) this.setPermissionRequired(true);
      throw error;
    }
  }
  async analyze(file) {
    if (!/\.(pdf|mscz|mxl|musicxml|xml)$/i.test(file.name)) throw new Error('Unsupported score format');
    const entries = [];
    if (/\.pdf$/i.test(file.name)) {
      const analysis = await new Score().init(null, null, file.name, await file.arrayBuffer(), false);
      const pdf = analysis.mozDoc;
      try {
        const walk = async (items, parent_id = null) => {
          for (const item of items || []) {
            let dest = item.dest;
            if (typeof dest === 'string') dest = await pdf.getDestination(dest);
            let pageIndex = null;
            if (Array.isArray(dest)) pageIndex = typeof dest[0] === 'number' ? dest[0] : await pdf.getPageIndex(dest[0]);
            const id = crypto.randomUUID();
            if (Number.isInteger(pageIndex) && pageIndex >= 0 && pageIndex < pdf.numPages) entries.push({ id, parent_id, anchor: { type: 'pdf', pageIndex }, metadata: { title: item.title,
              source: { type: 'pdf-outline', key: JSON.stringify([item.title, pageIndex]) } } });
            await walk(item.items, pageIndex !== null ? id : parent_id);
          }
        };
        await walk(await pdf.getOutline());
        if (!entries.length) entries.push({ id: crypto.randomUUID(), anchor: { type: 'pdf', pageIndex: 0 }, metadata: {
          title: analysis.pdfInfo?.Title || file.name.replace(/\.[^.]+$/, ''), composer: '',
          source: { type: 'file-title', key: 'root' } } });
      } finally { await analysis.dispose(); }
    }
    if (!entries.length) {
      let title = file.name.replace(/\.[^.]+$/, ''), composer = '', source = 'filename';
      if (!/\.pdf$/i.test(file.name)) {
        const files = await this.call('musicMetadataFiles', { file });
        let names = Object.keys(files).filter(name => !name.startsWith('META-INF/'));
        if (files['META-INF/container.xml']) {
          const container = new DOMParser().parseFromString(files['META-INF/container.xml'], 'application/xml');
          const main = container.querySelector('rootfile')?.getAttribute('full-path');
          if (main && files[main]) names = [main];
        }
        names.sort((a,b) => a.split('/').length - b.split('/').length);
        for (const name of names) {
          const xml = new DOMParser().parseFromString(files[name], 'application/xml');
          if (xml.querySelector('parsererror')) continue;
          if (xml.documentElement.tagName === 'museScore') {
            const tags = Object.fromEntries([...xml.querySelectorAll('Score > metaTag')].map(tag => [tag.getAttribute('name'), tag.textContent]));
            const titleText = [...xml.querySelectorAll('Text')].find(text => text.querySelector('style')?.textContent === 'title');
            title = tags.workTitle || titleText?.querySelector('text')?.textContent || title;
            composer = tags.composer || ''; source = 'music-metadata'; break;
          }
          if (/^score-(partwise|timewise)$/.test(xml.documentElement.tagName)) {
            title = xml.querySelector('work-title')?.textContent || xml.querySelector('movement-title')?.textContent || title;
            composer = xml.querySelector('creator[type="composer"]')?.textContent || ''; source = 'music-metadata'; break;
          }
        }
      }
      entries.push({ id: crypto.randomUUID(), anchor: { type: /\.pdf$/i.test(file.name) ? 'pdf' : 'music', pageIndex: 0 },
        metadata: { title, composer, source: { type: source, key: 'root' } } });
    }
    return entries;
  }
  async import(file, options = {}) {
    const existing = await this.call('findImportedFile', { file });
    if (existing) return existing;
    // importFile checks again in the serial Worker queue for concurrent imports.
    return this.call('importFile', { file, entries: await this.analyze(file), ...options });
  }
  async reindex(id) {
    const { document: doc, file } = await this.call('read', { id });
    const named = new File([file], JSON.parse(doc.metadata_json).originalFilename);
    return this.call('reindex', { documentId: id, entries: await this.analyze(named) });
  }
  async exportBackup() {
    this.emergencyBackup = false;
    if (Score.activeScore?.libraryDocumentId) {
      try { await this.flush(Score.activeScore); }
      catch (error) {
        if (!error.persistenceFailed) throw error;
        this.emergencyBackup = true;
      }
    }
    return this.call('backup');
  }
  async importBackup(file) {
    if (Score.activeScore?.libraryDocumentId) {
      await this.flush(Score.activeScore); await Score.activeScore.dispose();
    }
    return this.call('importBackup', { file });
  }
}
const bookshelfStore = new BookshelfStore();
window._bookshelf_ = bookshelfStore;
document.addEventListener('visibilitychange', () => {
  const score = Score.activeScore;
  if (document.visibilityState === 'hidden' && score?.libraryDocumentId) bookshelfStore.flush(score).catch(error => {
    score.librarySaveError = error; toast('Library save failed: ' + error.message);
  });
});
window.addEventListener('beforeunload', event => {
  const score = Score.activeScore;
  if (score?.libraryDocumentId && (score.dirty || score.librarySaveGeneration !== score.librarySavedGeneration)) { event.preventDefault(); event.returnValue = ''; }
});

class BookshelfView {
  static css = css('Bookshelf', `
    .Bookshelf [hidden] { display:none !important; }
    .Bookshelf > * { flex-shrink:0; }
    .Bookshelf input, .Bookshelf select, .Bookshelf button {
      box-sizing:border-box; max-width:100%; min-width:0;
    }
    .Bookshelf select { margin:.2em 0; width:100%; font-size:inherit; }
    .Bookshelf select[multiple] { height:5em; }
    .Bookshelf input { font-size:inherit; }
    .Bookshelf button { font-size:inherit; }
  `);
  constructor(panel) {
    this.panel = panel;
    this.elm = document.createElement('div');
    this.elm.className = 'Bookshelf';
    this.elm.style.cssText = 'padding:1em;display:flex;flex-direction:column;gap:.6em;max-height:65vh;overflow:auto';
    this.resize = () => {
      if (!this.elm.isConnected || !this.elm.getClientRects().length) return;
      const available = panel.panel.getBoundingClientRect().bottom - this.elm.getBoundingClientRect().top - 8;
      this.elm.style.maxHeight = Math.max(60, available - 2 * parseFloat(getComputedStyle(this.elm).paddingTop)) + 'px';
    };
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(panel.panel);
    const input = document.createElement('input');
    input.type = 'file'; input.multiple = true; input.accept = '.pdf,.mscz,.mxl,.musicxml,.xml';
    input.setAttribute('aria-label', 'Import scores');
    const search = document.createElement('input');
    search.type = 'search'; search.placeholder = 'Search songs'; search.setAttribute('aria-label', 'Search songs');
    const status = document.createElement('div'); status.setAttribute('role', 'status');
    const permission = document.createElement('div'); permission.hidden = true;
    const permissionMessage = document.createElement('div');
    const allowAccess = document.createElement('button'); allowAccess.textContent = 'Allow library folder access';
    permission.append(permissionMessage, allowAccess);
    const results = document.createElement('div');
    const tagFilter = document.createElement('select'); tagFilter.multiple = true; tagFilter.setAttribute('aria-label', 'Filter by tags');
    const tagMatch = document.createElement('select'); tagMatch.setAttribute('aria-label', 'Tag matching');
    tagMatch.add(new Option('Any selected tag', 'any')); tagMatch.add(new Option('All selected tags', 'all'));
    this.elm.append(input, search, status, permission, results);
    const updatePermission = () => {
      permission.hidden = !bookshelfStore.permissionRequired;
      permissionMessage.textContent = 'Access is required for library folder: ' + (bookshelfStore.storage?.directory?.name || '');
    };
    panel.listeners.push(listen(bookshelfStore, 'permissionchange', updatePermission));
    updatePermission();
    const importCurrent = document.createElement('button'); importCurrent.textContent = 'Import current score';
    this.elm.insertBefore(importCurrent, results);
    this.elm.insertBefore(tagFilter, results); this.elm.insertBefore(tagMatch, results);
    const mode = document.createElement('select');
    mode.setAttribute('aria-label', 'Library view');
    for (const [value, label] of [['documents', 'All scores'], ['entries', 'Songs'], ['bookshelves', 'Bookshelves'], ['playlists', 'Playlists'], ['tags', 'Tags'], ['history', 'Previous and deleted scores']]) mode.add(new Option(label, value));
    const collection = document.createElement('select'); collection.setAttribute('aria-label', 'Collection');
    const createName = document.createElement('input'); createName.placeholder = 'New collection name'; createName.setAttribute('aria-label', 'New collection name');
    const create = document.createElement('button'); create.textContent = 'Create';
    this.elm.insertBefore(mode, results); this.elm.insertBefore(collection, results);
    this.elm.insertBefore(createName, results); this.elm.insertBefore(create, results);
    const run = async task => {
      try { status.textContent = ''; await task(); }
      catch (error) { status.textContent = error.message; }
    };
    allowAccess.onclick = () => run(async () => {
      allowAccess.disabled = true;
      try { await bookshelfStore.reauthorizeStorage(); await this.refresh(); status.textContent = 'Library folder access restored'; }
      finally { allowAccess.disabled = false; }
    });
    const transfers = document.createElement('details');
    const transferTitle = document.createElement('summary'); transferTitle.textContent = 'Backups and conflicting edits'; transfers.append(transferTitle);
    const backup = document.createElement('button'); backup.textContent = 'Export library';
    const restore = document.createElement('input'); restore.type = 'file'; restore.accept = '.zip,application/zip'; restore.setAttribute('aria-label', 'Import library backup');
    const explanation = document.createElement('div'); explanation.textContent = 'Import adds the saved library and keeps conflicting edits for review.';
    const review = document.createElement('button'); review.textContent = 'Review conflicting edits';
    const conflictResults = document.createElement('div');
    const folder = document.createElement('button'); folder.textContent = 'Choose library folder'; folder.hidden = typeof window.showDirectoryPicker !== 'function';
    const defaultLibrary = document.createElement('button'); defaultLibrary.textContent = 'Use default library';
    const browserLibrary = document.createElement('button'); browserLibrary.textContent = 'Use browser compatibility library';
    const location = document.createElement('div'); location.textContent = 'Library location: default';
    transfers.append(backup, explanation, restore, review, conflictResults); this.elm.insertBefore(transfers, results);
    transfers.append(folder, defaultLibrary, browserLibrary, location);
    const cloud = document.createElement('select'); cloud.setAttribute('aria-label', 'Library cloud service'); cloud.add(new Option('Choose cloud service', ''));
    for (const source of [Score.sources.gdrive, Score.sources.dbx, Score.sources.odrive, Score.sources.pcloud]) cloud.add(new Option(source, source));
    const cloudPath = document.createElement('input'); cloudPath.setAttribute('aria-label', 'Library cloud folder'); cloudPath.placeholder = 'Folder path (blank is root)';
    const cloudInfo = document.createElement('div'); cloudInfo.textContent = 'Use a dedicated folder with the connected account. Each upload is a full library package; earlier packages are kept.';
    const sync = document.createElement('button'); sync.textContent = 'Sync library now';
    transfers.append(cloud, cloudPath, cloudInfo, sync);
    let cloudTouched = false;
    cloud.onchange = cloudPath.oninput = () => { cloudTouched = true; };
    window.RostrumLibraryHost.loadCloudSelection().then(saved => {
      if (!cloudTouched && saved) { cloud.value = saved.source; cloudPath.value = saved.path; }
    }).catch(() => {});
    sync.onclick = () => run(async () => {
      sync.disabled = true; status.textContent = 'Syncing library';
      try {
        const result = await bookshelfStore.syncCloud(cloud.value, cloudPath.value.trim()); await this.refresh();
        await window.RostrumLibraryHost.saveCloudSelection({ source: cloud.value, path: cloudPath.value.trim() }).catch(() => {});
        status.textContent = `Synced library; ${result.conflicts} conflicting items to review.`;
      } finally { sync.disabled = false; }
    });
    folder.onclick = () => run(async () => {
      const directory = await window.showDirectoryPicker({ mode: 'readwrite' });
      await bookshelfStore.configure({ kind: 'directory', directory });
      location.textContent = 'Library folder: ' + directory.name; await this.refresh();
    });
    defaultLibrary.onclick = () => run(async () => {
      await bookshelfStore.configure({}); location.textContent = 'Library location: default'; await this.refresh();
    });
    browserLibrary.onclick = () => run(async () => {
      await bookshelfStore.configure({ kind: 'indexeddb' }); location.textContent = 'Library location: browser compatibility storage'; await this.refresh();
    });
    backup.onclick = () => run(async () => {
      const bytes = await bookshelfStore.exportBackup();
      await window._localFs_.fileSaveLegacy(new Blob([bytes], { type: 'application/zip' }), { fileName: 'rostrum-library-' + new Date().toISOString().slice(0,10) + '.zip' });
      status.textContent = bookshelfStore.emergencyBackup ? 'Emergency backup exported; library storage could not be updated.' : 'Library exported';
    });
    restore.onchange = () => run(async () => {
      if (!restore.files[0]) return;
      restore.disabled = true;
      try {
        const result = await bookshelfStore.importBackup(restore.files[0]);
        await this.refresh();
        status.textContent = `Imported ${result.importedFiles} scores; ${result.conflicts} conflicting items to review.`;
      } finally { restore.disabled = false; restore.value = ''; }
    });
    review.onclick = () => run(async () => {
      const conflicts = await bookshelfStore.call('conflicts'); conflictResults.replaceChildren();
      if (!conflicts.length) { conflictResults.textContent = 'No conflicting edits'; return; }
      for (const conflict of conflicts) {
        const section = document.createElement('div');
        for (const change of conflict.alternatives) {
          const row = JSON.parse(change.payload_json), metadata = JSON.parse(row.metadata_json || '{}');
          const title = document.createElement('div');
          title.textContent = [metadata.title || metadata.displayName || metadata.name || row.name || 'Saved item', row.deleted_at ? 'Deleted' : 'Kept', change.created_at].join(' · ');
          const details = document.createElement('details'), summary = document.createElement('summary'); summary.textContent = 'Compare saved values';
          const values = document.createElement('pre'); values.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;text-align:left';
          values.textContent = JSON.stringify({ ...metadata, ...(row.content_json ? { writing: JSON.parse(row.content_json) } : {}), ...(row.settings_json ? { settings: JSON.parse(row.settings_json) } : {}) }, null, 2);
          details.append(summary, values);
          const choose = document.createElement('button'); choose.textContent = 'Use this version';
          choose.onclick = () => run(async () => {
            await bookshelfStore.call('resolveConflict', { table: conflict.table, id: conflict.id, revisionId: change.id,
              expectedRevisionIds: conflict.alternatives.map(option => option.id) });
            conflictResults.replaceChildren(); await this.refresh(); review.click();
          });
          section.append(title, details, choose);
        }
        conflictResults.append(section);
      }
    });
    const records = (table, parent, id) => bookshelfStore.call('records', { table, parent, id });
    const update = (table, values) => bookshelfStore.call('update', { table, values });
    const label = row => row.name || JSON.parse(row.metadata_json).title || JSON.parse(row.metadata_json).displayName || JSON.parse(row.metadata_json).name;
    const button = (container, text, task) => {
      const b = document.createElement('button'); b.textContent = text;
      b.onclick = () => run(async () => { await task(); await this.refresh(); }); container.append(b); return b;
    };
    let references = {};
    const choose = (container, table, title, task) => {
      const options = references[table] || [];
      const select = document.createElement('select'); select.setAttribute('aria-label', title);
      select.add(new Option(title, ''));
      for (const option of options) select.add(new Option(label(option), option.id));
      select.onchange = () => run(async () => { if (select.value) await task(select.value); await this.refresh(); });
      container.append(select);
    };
    let generation = 0;
    this.refresh = () => run(async () => {
      const current = ++generation;
      const referenceTables = ['tags', 'entry_tags', 'document_tags', 'bookshelves', 'playlists'];
      const referenceRows = await Promise.all(referenceTables.map(table => records(table)));
      if (current !== generation) return;
      references = Object.fromEntries(referenceTables.map((table, i) => [table, referenceRows[i]]));
      location.textContent = bookshelfStore.storage?.kind === 'directory' ? 'Library folder: ' + bookshelfStore.storage.directory.name
        : bookshelfStore.storage?.kind === 'indexeddb' ? 'Library location: browser compatibility storage' : 'Library location: default';
      const selectedTags = [...tagFilter.selectedOptions].map(option => option.value);
      tagFilter.replaceChildren();
      for (const tag of references.tags) { const option = new Option(tag.name, tag.id); option.selected = selectedTags.includes(tag.id); tagFilter.add(option); }
      tagFilter.hidden = tagMatch.hidden = !references.tags.length;
      const grouped = ['bookshelves', 'playlists', 'tags'].includes(mode.value);
      collection.hidden = createName.hidden = create.hidden = !grouped;
      const selected = collection.value;
      const groups = grouped ? references[mode.value] : [];
      if (current !== generation) return;
      collection.replaceChildren(); collection.add(new Option('Choose collection', ''));
      for (const group of groups) collection.add(new Option(label(group), group.id));
      collection.value = groups.some(g => g.id === selected) ? selected : '';
      let rows;
      let memberships = [];
      const filters = { query: search.value, tagIds: selectedTags, matchAll: tagMatch.value === 'all' };
      search.placeholder = ['documents', 'bookshelves'].includes(mode.value) ? 'Search scores' : 'Search songs';
      if (['bookshelves', 'playlists'].includes(mode.value) && !collection.value) {
        rows = [];
      } else if (mode.value === 'history') {
        rows = await bookshelfStore.call('history');
      } else if (mode.value === 'bookshelves' && collection.value) {
        memberships = await records('bookshelf_documents', 'bookshelf_id', collection.value);
        const documents = await bookshelfStore.call('list', filters);
        rows = memberships.sort((a,b) => a.order_key.localeCompare(b.order_key) || a.id.localeCompare(b.id)).flatMap(link => {
          const doc = documents.find(d => d.id === link.document_id); return doc ? [{ ...doc, membership: link }] : [];
        });
      } else if (mode.value === 'playlists' && collection.value) {
        memberships = await records('playlist_items', 'playlist_id', collection.value);
        const entries = await records('entries');
        const documents = await records('documents');
        rows = memberships.sort((a,b) => a.order_key.localeCompare(b.order_key) || a.id.localeCompare(b.id)).map(link => {
          const entry = entries.find(e => e.id === link.entry_id);
          const doc = entry && documents.find(d => d.id === entry.document_id);
          return entry ? { ...entry, membership: link, unavailable: !doc, document_metadata: doc?.metadata_json, previousVersion: !!doc?.replaced_by_id }
            : { id: link.entry_id, metadata_json: '{"title":"Unavailable song"}', membership: link, unavailable: true };
        });
      } else if (mode.value === 'entries' || mode.value === 'tags') {
        rows = await bookshelfStore.call('search', { query: search.value,
          tagIds: [...new Set([...selectedTags, ...(mode.value === 'tags' && collection.value ? [collection.value] : [])])], matchAll: tagMatch.value === 'all' });
      } else rows = await bookshelfStore.call('list', filters);
      if (current !== generation) return;
      results.replaceChildren();
      if (grouped && collection.value) {
        const group = groups.find(g => g.id === collection.value);
        const edit = document.createElement('input'); edit.value = label(group); edit.setAttribute('aria-label', 'Collection name'); results.append(edit);
        button(results, 'Rename collection', () => update(mode.value, { id: group.id, ...(mode.value === 'tags' ? { name: edit.value.trim() } : { metadata_json: JSON.stringify({ ...JSON.parse(group.metadata_json), name: edit.value.trim() }) }) }));
        button(results, 'Delete collection', () => update(mode.value, { id: group.id, deleted_at: new Date().toISOString() }));
      }
      for (const row of rows) {
        let card = document.createElement('div'); card.style.cssText = 'border-top:1px solid #888;padding:.5em 0'; results.append(card);
        const openButton = document.createElement('button');
        const metadata = JSON.parse(row.metadata_json);
        openButton.textContent = metadata.title || metadata.displayName;
        openButton.style.cssText = 'display:block;margin:.5em 0';
        openButton.disabled = !!row.unavailable;
        if (row.deleted_at) openButton.disabled = true;
        openButton.onclick = () => run(async () => {
          if (!await checkUnsaved()) return;
          await bookshelfStore.openDocument(row.document_id || row.id, row.anchor_json && JSON.parse(row.anchor_json));
          panel.hide();
        });
        card.append(openButton);
        if (mode.value === 'history') {
          const info = document.createElement('div'); info.textContent = row.deleted_at ? 'Deleted score' : row.replaced_by_id ? 'Previous version' : 'Current version'; card.append(info);
          if (row.deleted_at || row.replaced_by_id) button(card, 'Use this version', () => bookshelfStore.call('useVersion', { id: row.id }));
          if (row.deleted_at) continue;
        }
        if (row.unavailable) {
          const unavailable = document.createElement('div'); unavailable.textContent = 'This song or score was deleted.'; card.append(unavailable);
          if (row.membership) button(card, 'Remove from collection', () => update('playlist_items', { id: row.membership.id, deleted_at: new Date().toISOString() }));
          continue;
        }
        const isEntry = !!row.document_id;
        if (isEntry) {
          const description = document.createElement('div');
          description.textContent = [metadata.composer, row.document_metadata && JSON.parse(row.document_metadata).displayName,
            row.anchor_json && 'Page ' + (JSON.parse(row.anchor_json).pageIndex + 1), row.previousVersion && 'Previous version'].filter(Boolean).join(' · ');
          card.append(description);
        }
        const details = document.createElement('details');
        const summary = document.createElement('summary'); summary.textContent = 'Edit and organize';
        details.append(summary); card.append(details);
        const controls = document.createElement('div'); controls.style.cssText = 'display:flex;flex-wrap:wrap;gap:.4em;padding:.5em 0';
        details.append(controls); card = controls;
        const table = isEntry ? 'entries' : 'documents';
        const title = document.createElement('input'); title.value = label(row); title.setAttribute('aria-label', isEntry ? 'Song title' : 'Score name'); card.append(title);
        button(card, 'Rename', () => update(table, { id: row.id, metadata_json: JSON.stringify({ ...metadata, [isEntry ? 'title' : 'displayName']: title.value, userEditedFields: [...new Set([...(metadata.userEditedFields || []), isEntry ? 'title' : 'displayName'])] }) }));
        button(card, 'Delete', () => {
          if (!isEntry && Score.activeScore?.libraryDocumentId === row.id) throw new Error('Close this score before deleting it');
          return update(table, { id: row.id, deleted_at: new Date().toISOString() });
        });
        choose(card, 'tags', 'Add tag', tag_id => bookshelfStore.call('link', { table: isEntry ? 'entry_tags' : 'document_tags', values: { [isEntry ? 'entry_id' : 'document_id']: row.id, tag_id } }));
        const tagLinks = references[isEntry ? 'entry_tags' : 'document_tags'].filter(link => link[isEntry ? 'entry_id' : 'document_id'] === row.id);
        const tags = references.tags;
        for (const link of tagLinks) {
          const tag = tags.find(t => t.id === link.tag_id);
          if (tag) button(card, 'Remove tag: ' + tag.name, () => update(isEntry ? 'entry_tags' : 'document_tags', { id: link.id, deleted_at: new Date().toISOString() }));
        }
        if (isEntry) {
          const inherited = references.document_tags.filter(link => link.document_id === row.document_id)
            .map(link => tags.find(tag => tag.id === link.tag_id)?.name).filter(Boolean);
          if (inherited.length) { const info = document.createElement('div'); info.textContent = 'Tags from score: ' + inherited.join(', '); card.append(info); }
        }
        choose(card, isEntry ? 'playlists' : 'bookshelves', isEntry ? 'Add to playlist' : 'Add to bookshelf', id => bookshelfStore.call('link', {
          table: isEntry ? 'playlist_items' : 'bookshelf_documents', values: { [isEntry ? 'playlist_id' : 'bookshelf_id']: id, [isEntry ? 'entry_id' : 'document_id']: row.id, order_key: String(Date.now()) } }));
        if (row.membership) {
          const membershipTable = isEntry ? 'playlist_items' : 'bookshelf_documents';
          button(card, 'Remove from collection', () => update(membershipTable, { id: row.membership.id, deleted_at: new Date().toISOString() }));
          const note = document.createElement('input'); note.placeholder = 'Item note'; note.value = JSON.parse(row.membership.metadata_json).note || ''; card.append(note);
          button(card, 'Save note', () => update(membershipTable, { id: row.membership.id, metadata_json: JSON.stringify({ note: note.value }) }));
          button(card, 'Move up', () => bookshelfStore.call('moveItem', { table: membershipTable, id: row.membership.id, direction: -1 }));
          button(card, 'Move down', () => bookshelfStore.call('moveItem', { table: membershipTable, id: row.membership.id, direction: 1 }));
        }
        if (isEntry) {
          const composer = document.createElement('input'); composer.value = metadata.composer || ''; composer.setAttribute('aria-label', 'Composer');
          const aliases = document.createElement('input'); aliases.value = (metadata.aliases || []).join('; '); aliases.setAttribute('aria-label', 'Aliases');
          const page = document.createElement('input'); page.type = 'number'; page.min = '1'; page.value = JSON.parse(row.anchor_json).pageIndex + 1; page.setAttribute('aria-label', 'Start page');
          card.append(composer, aliases, page);
          button(card, 'Save song details', () => {
            const pageIndex = Number(page.value) - 1;
            if (!Number.isInteger(pageIndex) || pageIndex < 0) throw new Error('Enter a valid start page');
            return update('entries', { id: row.id, anchor_json: JSON.stringify({ ...JSON.parse(row.anchor_json), pageIndex }),
              metadata_json: JSON.stringify({ ...metadata, composer: composer.value, aliases: aliases.value.split(';').map(s => s.trim()).filter(Boolean),
                userEditedFields: [...new Set([...(metadata.userEditedFields || []), 'composer', 'aliases', 'anchor'])] }) });
          });
        } else {
          button(card, 'Rebuild song index', () => bookshelfStore.reindex(row.id));
          const songTitle = document.createElement('input'); songTitle.placeholder = 'New song title'; songTitle.setAttribute('aria-label', 'New song title');
          const startPage = document.createElement('input'); startPage.type = 'number'; startPage.min = '1'; startPage.value = '1'; startPage.setAttribute('aria-label', 'New song start page');
          card.append(songTitle, startPage);
          button(card, 'Add song', () => {
            const pageIndex = Number(startPage.value) - 1;
            if (!songTitle.value.trim() || !Number.isInteger(pageIndex) || pageIndex < 0) throw new Error('Enter a title and valid start page');
            return update('entries', { id: crypto.randomUUID(), document_id: row.id, anchor_json: JSON.stringify({ type: /\.pdf$/i.test(metadata.originalFilename) ? 'pdf' : 'music', pageIndex }),
              metadata_json: JSON.stringify({ title: songTitle.value.trim(), source: { type: 'manual' }, userEditedFields: ['title', 'anchor'] }) });
          });
          const replacement = document.createElement('input'); replacement.type = 'file'; replacement.accept = input.accept; replacement.setAttribute('aria-label', 'Replace score file');
          replacement.onchange = () => run(async () => {
            if (!replacement.files[0] || !await checkUnsaved()) return;
            const imported = await bookshelfStore.import(replacement.files[0], { replacesId: row.id }); await this.refresh();
            if (imported.alreadyImported) status.textContent = 'Score already imported; replacement skipped. Previous or deleted scores remain in history.';
          });
          card.append(replacement);
        }
      }
      if (!rows.length) {
        const empty = document.createElement('div');
        empty.textContent = ['bookshelves', 'playlists'].includes(mode.value) && !collection.value ? 'Choose or create a collection' : 'No scores found';
        results.append(empty);
      }
    });
    input.onchange = () => run(async () => {
      input.disabled = true;
      let imported = 0, skipped = 0;
      try { for (const file of input.files) {
        status.textContent = 'Importing ' + file.name;
        const result = await bookshelfStore.import(file);
        result.alreadyImported ? skipped++ : imported++;
      } }
      finally { input.disabled = false; input.value = ''; }
      await this.refresh();
      status.textContent = `Imported ${imported} scores; skipped ${skipped} already imported scores.`;
      if (skipped) status.textContent += ' Previous or deleted scores remain in history.';
    });
    search.oninput = () => this.refresh();
    tagFilter.onchange = tagMatch.onchange = () => this.refresh();
    mode.onchange = () => { collection.value = ''; this.refresh(); };
    collection.onchange = () => this.refresh();
    create.onclick = () => run(async () => {
      const name = createName.value.trim(); if (!name) return;
      await update(mode.value, { id: crypto.randomUUID(), ...(mode.value === 'tags' ? { name } : { metadata_json: JSON.stringify({ name }) }) });
      createName.value = ''; await this.refresh();
    });
    importCurrent.onclick = () => run(async () => {
      if (!_score_) throw new Error('Open a score first');
      const name = _score_.saveName;
      const bytes = await _score_.toFile();
      const imported = await bookshelfStore.import(new File([bytes], name));
      await this.refresh();
      if (imported.alreadyImported) status.textContent = 'Score already imported; skipped. Previous or deleted scores remain in history.';
    });
  }
  select() { this.refresh(); requestAnimationFrame(this.resize); }
}
// +skip
export { BookshelfView };
// -skip
