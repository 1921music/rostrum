// +skip
import { css } from './common.js';
export { reviewScoreImport };
// -skip

class ScoreImportReview {
  static css = css('ScoreImportReview', `
    .ScoreImportReview { color:var(--color-text); background:var(--panel-bg); border:var(--border);
      border-radius:var(--borderRadius); width:min(66em,94vw); max-width:94vw; max-height:92dvh;
      box-sizing:border-box; padding:1em; text-align:left; font-size:clamp(16px,1rem,18px); }
    .ScoreImportReview[open] { display:flex; flex-direction:column; }
    .ScoreImportReview__content { min-height:0; overflow:auto; }
    .ScoreImportReview::backdrop { background:#0008; }
    .ScoreImportReview * { box-sizing:border-box; }
    .ScoreImportReview [hidden] { display:none !important; }
    .ScoreImportReview__heading { margin:0 0 .5em; font-size:1.2em; }
    .ScoreImportReview__filename { overflow-wrap:anywhere; margin-bottom:.5em; }
    .ScoreImportReview label { display:block; }
    .ScoreImportReview input { font:inherit; max-width:100%; }
    .ScoreImportReview input:not([type=checkbox]) { width:100%; }
    .ScoreImportReview button { font:inherit; padding:.3em .6em; }
    .ScoreImportReview__columns { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:1em; }
    .ScoreImportReview__songs { max-height:52dvh; overflow:auto; padding:.2em; }
    .ScoreImportReview fieldset { min-width:0; margin:.4em 0; border:1px solid #888; padding:.6em; }
    .ScoreImportReview fieldset[data-current=true] { border:2px solid var(--color-text); }
    .ScoreImportReview__fields { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr) 5em; gap:.5em; }
    .ScoreImportReview__rowButtons, .ScoreImportReview__navigation, .ScoreImportReview__actions {
      display:flex; flex-wrap:wrap; align-items:center; gap:.5em; margin:.5em 0; }
    .ScoreImportReview__navigation label { width:5em; }
    .ScoreImportReview__page { max-height:48dvh; overflow:auto; background:#7773; text-align:center; }
    .ScoreImportReview canvas { display:block; max-width:100%; height:auto; margin:auto; background:white; }
    .ScoreImportReview__actions { justify-content:flex-end; flex-shrink:0; background:var(--panel-bg); }
    @media(max-width:650px) {
      .ScoreImportReview__columns { grid-template-columns:minmax(0,1fr); }
      .ScoreImportReview__songs { max-height:32dvh; }
      .ScoreImportReview__page { max-height:24dvh; }
      .ScoreImportReview__fields { grid-template-columns:minmax(0,1fr); }
    }
  `);

  constructor(file, entries, score, commit, reauthorize) {
    this.file = file; this.score = score; this.commit = commit;
    this.rows = []; this.pageIndex = 0; this.generation = 0; this.renderJobs = new Set();
    const element = (tag, parent, text) => {
      const node = document.createElement(tag); if (text !== undefined) node.textContent = text;
      parent?.append(node); return node;
    };
    this.element = element;
    const elm = this.elm = element('dialog'); elm.className = 'ScoreImportReview';
    elm.setAttribute('aria-label', 'Review score import');
    // Panel content owns its presses; this native dialog follows the same rule.
    elm.addEventListener('pointerdown', e => { e.taken = true; }, { capture:true });
    element('h2', elm, 'Review score import').className = 'ScoreImportReview__heading';
    const content = element('div', elm); content.className = 'ScoreImportReview__content';
    element('div', content, file.name).className = 'ScoreImportReview__filename';
    this.displayName = this.input(content, 'Library score name', file.name);
    element('p', content, 'Review songs before importing. Uncheck all to keep only the file. Bookmarks in the original file stay unchanged.');
    const columns = element('div', content); columns.className = 'ScoreImportReview__columns';
    const left = element('div', columns);
    this.count = element('div', left); this.count.setAttribute('aria-live', 'polite');
    this.songs = element('div', left); this.songs.className = 'ScoreImportReview__songs';
    this.button(left, 'Add song', () => {
      const row = this.addRow({ id:crypto.randomUUID(), anchor:{ type:score.music ? 'music' : 'pdf', pageIndex:this.pageIndex },
        metadata:{ title:'', composer:'', source:{ type:'manual' }, userEditedFields:['title','composer','anchor'] } });
      row.elm.scrollIntoView({ block:'nearest' }); row.title.focus();
    });
    const right = element('div', columns);
    const navigation = element('div', right); navigation.className = 'ScoreImportReview__navigation';
    this.previous = this.button(navigation, 'Previous page', () => this.showPage(this.pageIndex - 1));
    this.page = this.input(navigation, 'Preview page', 1, 'number'); this.page.min = '1'; this.page.max = score.mozDoc.numPages;
    this.page.onchange = () => this.showPage(Number(this.page.value) - 1);
    this.next = this.button(navigation, 'Next page', () => this.showPage(this.pageIndex + 1));
    this.previewStatus = element('div', right); this.previewStatus.setAttribute('aria-live','polite');
    this.preview = element('div', right); this.preview.className = 'ScoreImportReview__page';
    this.preview.setAttribute('aria-label', 'Score page preview');
    this.error = element('div', elm); this.error.setAttribute('role','alert');
    this.permissionRetry = this.button(elm, 'Allow library folder access', async () => {
      this.permissionRetry.disabled = true;
      try {
        await reauthorize(); this.permissionRetry.hidden = true;
        this.error.textContent = 'Folder access restored. Import to save this draft.';
      } catch (error) { this.error.textContent = error.message; }
      finally { this.permissionRetry.disabled = false; }
    });
    this.permissionRetry.hidden = true; this.reauthorize = reauthorize;
    const actions = element('div', elm); actions.className = 'ScoreImportReview__actions';
    this.button(actions, 'Cancel import', () => { if (!this.busy) elm.close(); });
    this.button(actions, 'Import into library', () => this.submit());
    elm.addEventListener('cancel', e => { if (this.busy) e.preventDefault(); });
    for (const entry of entries) this.addRow(entry);
  }
  input(parent, label, value, type = 'text') {
    const wrapper = this.element('label', parent, label);
    const input = this.element('input', wrapper); input.type = type; input.value = value;
    input.setAttribute('aria-label',label); return input;
  }
  button(parent, text, handler) {
    const button = this.element('button', parent, text); button.type = 'button'; button.onclick = handler; return button;
  }
  addRow(entry) {
    const row = { original:structuredClone(entry) };
    const elm = row.elm = this.element('fieldset', this.songs);
    this.element('legend', elm, 'Song ' + (this.rows.length + 1));
    const byId = new Map(this.rows.map(r => [r.original.id,r.original]));
    let ancestor = entry.parent_id, depth = 0;
    while (ancestor && byId.has(ancestor) && depth < 10) { depth++; ancestor = byId.get(ancestor).parent_id; }
    elm.style.marginLeft = Math.min(depth,3) * .8 + 'em';
    row.include = this.input(elm, 'Include song', '', 'checkbox'); row.include.checked = true;
    row.include.onchange = () => this.updateCount();
    const fields = this.element('div', elm); fields.className = 'ScoreImportReview__fields';
    row.title = this.input(fields, 'Song title', entry.metadata.title || '');
    row.composer = this.input(fields, 'Composer', entry.metadata.composer || '');
    row.page = this.input(fields, 'Start page', entry.anchor.pageIndex + 1, 'number');
    row.page.min = '1'; row.page.max = this.score.mozDoc.numPages;
    row.page.onchange = () => this.showPage(Number(row.page.value) - 1);
    const buttons = this.element('div',elm); buttons.className = 'ScoreImportReview__rowButtons';
    this.button(buttons, 'Use filename as title', () => { row.title.value = this.file.name.replace(/\.[^.]+$/, ''); });
    this.button(buttons, 'Preview song page', () => this.showPage(Number(row.page.value) - 1));
    const select = () => {
      for (const other of this.rows) other.elm.dataset.current = String(other === row);
    };
    elm.addEventListener('focusin', select);
    elm.addEventListener('click', () => { select(); this.showPage(Number(row.page.value) - 1); });
    this.rows.push(row); this.updateCount(); return row;
  }
  updateCount() { this.count.textContent = this.rows.filter(row => row.include.checked).length + ' songs selected'; }
  showPage(pageIndex) {
    if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= this.score.mozDoc.numPages || this.closed) return;
    this.pageIndex = pageIndex; this.page.value = pageIndex + 1;
    this.previous.disabled = pageIndex === 0; this.next.disabled = pageIndex + 1 === this.score.mozDoc.numPages;
    const generation = ++this.generation;
    this.renderTask?.cancel();
    this.previewStatus.textContent = 'Loading page ' + (pageIndex + 1);
    const job = (async () => {
      try {
        const page = await this.score.mozDoc.getPage(pageIndex + 1);
        if (generation !== this.generation || this.closed) return;
        const base = page.getViewport({ scale:1 });
        const viewport = page.getViewport({ scale:Math.min(600/base.width, 800/base.height) * Math.min(devicePixelRatio || 1,2) });
        const canvas = document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        const task = this.renderTask = page.render({ canvasContext:canvas.getContext('2d'), viewport });
        await task.promise;
        if (generation !== this.generation || this.closed) return;
        this.preview.replaceChildren(canvas);
        this.previewStatus.textContent = `Page ${pageIndex + 1} of ${this.score.mozDoc.numPages}`;
      } catch (error) {
        if (generation === this.generation && !this.closed) this.previewStatus.textContent = 'Preview unavailable: ' + error.message;
      }
    })();
    this.renderJobs.add(job); job.finally(() => this.renderJobs.delete(job));
  }
  draft() {
    const displayName = this.displayName.value.trim();
    if (!displayName) { this.displayName.focus(); throw new Error('Enter a library score name'); }
    const byId = new Map(this.rows.map(row => [row.original.id,row]));
    const entries = this.rows.map(row => {
      const entry = structuredClone(row.original);
      if (!row.include.checked) return { ...entry, deleted_at:new Date().toISOString() };
      const pageIndex = Number(row.page.value) - 1;
      if (!row.title.value.trim() || !Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= this.score.mozDoc.numPages) {
        row.elm.scrollIntoView({ block:'nearest' });
        (!row.title.value.trim() ? row.title : row.page).focus();
        throw new Error('Each included song needs a title and a start page within this score');
      }
      const changed = new Set(entry.metadata.userEditedFields || []);
      for (const [field, value] of [['title',row.title.value.trim()],['composer',row.composer.value.trim()]]) {
        if ((entry.metadata[field] || '') !== value) changed.add(field);
        entry.metadata[field] = value;
      }
      if (entry.anchor.pageIndex !== pageIndex) changed.add('anchor');
      entry.anchor.pageIndex = pageIndex;
      const originalParent = entry.parent_id || null;
      while (entry.parent_id && !byId.get(entry.parent_id)?.include.checked) entry.parent_id = byId.get(entry.parent_id)?.original.parent_id || null;
      if ((entry.parent_id || null) !== originalParent) changed.add('parent');
      entry.metadata.userEditedFields = [...changed];
      return entry;
    });
    return { displayName, entries };
  }
  async submit() {
    if (this.busy) return;
    this.error.textContent = '';
    let draft;
    try { draft = this.draft(); } catch (error) { this.error.textContent = error.message; return; }
    this.busy = true;
    const controls = [...this.elm.querySelectorAll('input,button')].map(node => [node,node.disabled]);
    for (const [node] of controls) node.disabled = true;
    try { this.result = await this.commit(draft); this.elm.close(); }
    catch (error) {
      this.error.textContent = error.message;
      this.permissionRetry.hidden = !this.reauthorize || !['NotAllowedError','SecurityError'].includes(error.name);
    }
    finally { this.busy = false; for (const [node,disabled] of controls) node.disabled = disabled; }
  }
  async show() {
    document.body.append(this.elm);
    const closed = new Promise(resolve => this.elm.addEventListener('close',resolve,{ once:true }));
    this.elm.showModal(); this.showPage(this.rows[0]?.original.anchor.pageIndex || 0);
    await closed;
    this.closed = true; ++this.generation; this.renderTask?.cancel();
    await Promise.allSettled([...this.renderJobs]);
    this.elm.remove(); return this.result || null;
  }
}

async function reviewScoreImport(file, entries, score, commit, reauthorize) {
  return new ScoreImportReview(file, entries, score, commit, reauthorize).show();
}
