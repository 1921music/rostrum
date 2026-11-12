// +skip
import { Score } from './score.js';
import { checkUnsaved } from './file.js';
import { toast, css } from './common.js';
// -skip

class BookshelfStore {
  constructor() { this.pending = new Map(); this.sequence = 0; }
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
  async openDocument(id, anchor) {
    if (Score.activeScore?.libraryDocumentId) await this.flush(Score.activeScore);
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
  call(action, args = {}) {
    if (!this.worker) {
      this.worker = new Worker(new URL('bookshelf-worker.js', location.href), { type: 'module' });
      this.worker.onmessage = ({ data }) => {
        const pending = this.pending.get(data.id);
        if (!pending) return;
        this.pending.delete(data.id);
        data.error ? pending.reject(new Error(data.error)) : pending.resolve(data.value);
      };
      this.worker.onerror = () => {
        for (const pending of this.pending.values()) pending.reject(new Error('Could not start library storage.'));
        this.pending.clear(); this.worker.terminate(); this.worker = null;
      };
    }
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, action, args });
    });
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
    return this.call('importFile', { file, entries: await this.analyze(file), ...options });
  }
  async reindex(id) {
    const { document: doc, file } = await this.call('read', { id });
    const named = new File([file], JSON.parse(doc.metadata_json).originalFilename);
    return this.call('reindex', { documentId: id, entries: await this.analyze(named) });
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
    const results = document.createElement('div');
    const tagFilter = document.createElement('select'); tagFilter.multiple = true; tagFilter.setAttribute('aria-label', 'Filter by tags');
    const tagMatch = document.createElement('select'); tagMatch.setAttribute('aria-label', 'Tag matching');
    tagMatch.add(new Option('Any selected tag', 'any')); tagMatch.add(new Option('All selected tags', 'all'));
    this.elm.append(input, search, status, results);
    const importCurrent = document.createElement('button'); importCurrent.textContent = 'Import current score';
    this.elm.insertBefore(importCurrent, results);
    this.elm.insertBefore(tagFilter, results); this.elm.insertBefore(tagMatch, results);
    const mode = document.createElement('select');
    mode.setAttribute('aria-label', 'Library view');
    for (const [value, label] of [['documents', 'All scores'], ['entries', 'Songs'], ['bookshelves', 'Bookshelves'], ['playlists', 'Playlists'], ['tags', 'Tags']]) mode.add(new Option(label, value));
    const collection = document.createElement('select'); collection.setAttribute('aria-label', 'Collection');
    const createName = document.createElement('input'); createName.placeholder = 'New collection name'; createName.setAttribute('aria-label', 'New collection name');
    const create = document.createElement('button'); create.textContent = 'Create';
    this.elm.insertBefore(mode, results); this.elm.insertBefore(collection, results);
    this.elm.insertBefore(createName, results); this.elm.insertBefore(create, results);
    const run = async task => {
      try { status.textContent = ''; await task(); }
      catch (error) { status.textContent = error.message; }
    };
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
      if (mode.value === 'bookshelves' && collection.value) {
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
        openButton.onclick = () => run(async () => {
          if (!await checkUnsaved()) return;
          await bookshelfStore.openDocument(row.document_id || row.id, row.anchor_json && JSON.parse(row.anchor_json));
          panel.hide();
        });
        card.append(openButton);
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
            await bookshelfStore.import(replacement.files[0], { replacesId: row.id }); await this.refresh();
          });
          card.append(replacement);
        }
      }
      if (!rows.length) { const empty = document.createElement('div'); empty.textContent = 'No scores found'; results.append(empty); }
    });
    input.onchange = () => run(async () => {
      input.disabled = true;
      try { for (const file of input.files) { status.textContent = 'Importing ' + file.name; await bookshelfStore.import(file); } }
      finally { input.disabled = false; input.value = ''; }
      await this.refresh();
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
      await bookshelfStore.import(new File([bytes], name));
      await this.refresh();
    });
  }
  select() { this.refresh(); requestAnimationFrame(this.resize); }
}
// +skip
export { BookshelfView };
// -skip
