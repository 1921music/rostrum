// +skip
import { Score } from './score.js';
import { checkUnsaved, FileSrc } from './file.js';
import { toast, css, listen, iconSvg } from './common.js';
import { BookshelfStore } from './bookshelf-model.js';
import { LibraryCloudTransport } from './bookshelf-cloud.js';
import { reviewScoreImport } from './bookshelf-import.js';
import { CloudFolderPicker } from './cloud-folder-picker.js';
// -skip

const bookshelfStore = new BookshelfStore({
  get host() { return window.RostrumLibraryHost; },
  get runtime() { return window._bookshelfRuntime_; },
  createCloudTransport(source,path) {
    if (![Score.sources.gdrive,Score.sources.dbx,Score.sources.odrive,Score.sources.pcloud].includes(source)) throw new Error('Choose a cloud service');
    return new LibraryCloudTransport(FileSrc.get(source),path);
  },
  readOriginalFile: location => FileSrc.get(location.source).getFile(location.path,location.name),
  scores: {
    get active() { return Score.activeScore; },
    preview: async file => new Score().init(null,null,file.name,await file.arrayBuffer(),false),
    review: reviewScoreImport,
    async open(state,anchor) {
      const settings = JSON.parse(state.document.settings_json);
      const name = JSON.parse(state.document.metadata_json).originalFilename;
      const score = await new Score().init(null,null,name,
        /\.pdf$/i.test(name) ? state.file : await state.file.arrayBuffer(),true,{...state,settings,anchor});
      return score;
    },
  },
});
// Application integration: reader lifecycle and presentation, never storage decisions.
bookshelfStore.addEventListener('warning',event => toast(event.detail.message));
let syncCancelDisplay;
bookshelfStore.addEventListener('statuschange',() => {
  const message = bookshelfStore.syncPending && bookshelfStore.manualSync ? 'Syncing library'
    : bookshelfStore.applyingChanges ? 'Applying score changes' : null;
  if (message && syncCancelDisplay === undefined) {
    syncCancelDisplay = _shade_.cancel.style.display;
    _shade_.cancel.style.display = 'none'; _shade_.show(message,0);
  } else if (!message && syncCancelDisplay !== undefined) {
    _shade_.cancel.style.display = syncCancelDisplay; syncCancelDisplay = undefined; _shade_.hide();
  }
});
bookshelfStore.inBackground = document.hidden;
window.addEventListener('online',() => bookshelfStore.autoSync?.request(0));
window.addEventListener('offline',() => bookshelfStore.notifyStatus());
window._bookshelf_ = bookshelfStore;
document.addEventListener('visibilitychange', () => {
  bookshelfStore.inBackground = document.hidden;
  if (!document.hidden) bookshelfStore.autoSync?.request(0);
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
    .LibraryWindow {
      --library-bg:var(--ui-bg); --library-surface:var(--ui-surface); --library-line:var(--ui-line);
      --library-text:var(--ui-text); --library-muted:var(--ui-muted); --library-brand:var(--ui-primary);
      --library-selected:var(--ui-selected); --library-hover:var(--ui-hover);
      position:fixed; inset:0; pointer-events:none; font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;
      color:var(--library-text); text-align:left; color-scheme:light;
    }
    [data-theme=Dark] .LibraryWindow {
      --library-bg:var(--ui-bg); --library-surface:var(--ui-surface); --library-line:var(--ui-line);
      --library-text:var(--ui-text); --library-muted:var(--ui-muted); --library-brand:var(--ui-primary);
      --library-selected:var(--ui-selected); --library-hover:var(--ui-hover); color-scheme:dark;
    }
    .LibraryWindow[hidden], .LibraryWindow [hidden] { display:none !important; }
    .LibraryWindow *, .LibraryWindow *::before, .LibraryWindow *::after { box-sizing:border-box; }
    .LibraryWindow .LibraryWindow__panel, .LibraryWindow .LibraryWindow__panel * { user-select:text; -webkit-user-select:text; }
    .LibraryWindow .LibraryWindow__panel * { -webkit-touch-callout:default; }
    .LibraryWindow button, .LibraryWindow summary, .LibraryWindow select { user-select:none; -webkit-user-select:none; }
    .LibraryWindow .LibraryWindow__panel {
      pointer-events:auto; position:absolute; inset:0; display:flex; flex-direction:column;
      width:100%; height:100%; max-width:none; max-height:none; margin:0;
      border:0; border-radius:0; box-shadow:none; background:var(--library-bg); color:var(--library-text);
    }
    .LibraryWindow[data-full=false] .LibraryWindow__panel {
      right:auto; width:min(460px,100vw); border-right:1px solid var(--library-line);
      box-shadow:12px 0 32px #172b4d14;
    }
    .LibraryWindow__header {
      display:flex; align-items:center; justify-content:space-between; gap:16px;
      flex:none; height:72px; padding:0 24px; border-bottom:1px solid var(--library-line); background:var(--library-bg);
    }
    .LibraryWindow__brand { display:flex; gap:12px; align-items:center; }
    .LibraryWindow__mark { color:var(--library-brand); font-size:28px; line-height:1; }
    .LibraryWindow h1 { margin:0; font-size:22px; font-weight:650; letter-spacing:-.5px; }
    .LibraryWindow__actions { display:flex; align-items:center; gap:8px; }
    .LibraryWindow__body { flex:1; min-height:0; }
    .LibraryWindow button, .LibraryWindow input, .LibraryWindow select { font:inherit; color:inherit; margin:0; }
    .LibraryWindow button, .LibraryWindow summary { -webkit-tap-highlight-color:transparent; }
    .LibraryWindow button {
      border:1px solid var(--library-line); border-radius:8px; background:var(--library-bg);
      padding:9px 14px; min-height:40px; cursor:pointer; line-height:1.4; transition:background .12s;
    }
    .LibraryWindow button:hover { background:var(--library-hover); }
    .LibraryWindow button:disabled { cursor:default; opacity:.45; }
    .LibraryWindow :is(button,input,select,summary):focus-visible { outline:2px solid var(--library-brand); outline-offset:3px; }
    .LibraryWindow input:not([type=checkbox]), .LibraryWindow select {
      width:100%; min-width:0; max-width:100%; min-height:42px; padding:9px 12px;
      border:1px solid var(--library-line); border-radius:8px; background:var(--library-bg);
    }
    .LibraryWindow input[type=checkbox] { accent-color:var(--library-brand); width:18px; height:18px; vertical-align:middle; }
    .LibraryWindow input::placeholder { color:var(--library-muted); opacity:1; }
    .LibraryWindow__icon { width:40px; height:40px; padding:0 !important; border:0 !important; font-size:24px !important; }
    .LibraryWindow .LibraryWindow__primary { background:var(--library-brand); color:var(--library-bg); border-color:transparent; font-weight:600; }
    .LibraryWindow .LibraryWindow__primary:hover { filter:brightness(.95); }
    .Bookshelf { display:flex; flex-direction:column; height:100%; min-height:0; }
    .Bookshelf__workspace { display:grid; grid-template-columns:208px minmax(0,1fr); min-height:0; flex:1; position:relative; }
    .Bookshelf__sidebar { background:var(--library-surface); padding:28px 12px; overflow:auto; border-right:1px solid var(--library-line); }
    .Bookshelf__nav-title { margin:0 12px 12px; color:var(--library-muted); font-size:11px; font-weight:700; letter-spacing:1.4px; text-transform:uppercase; }
    .Bookshelf__nav { display:flex; flex-direction:column; gap:4px; }
    .LibraryWindow .Bookshelf__nav button { border:0; text-align:left; border-radius:8px; padding:12px; background:transparent; }
    .LibraryWindow .Bookshelf__nav button[aria-pressed=true] { background:var(--library-selected); color:var(--library-brand); font-weight:600; }
    .Bookshelf__nav button span { display:inline-block; width:26px; opacity:.7; }
    .Bookshelf__main { display:flex; flex-direction:column; min-width:0; min-height:0; }
    .Bookshelf__toolbar { display:flex; gap:12px; align-items:center; padding:24px 32px 16px; flex:none; }
    .LibraryWindow .Bookshelf__search { border:0 !important; background:var(--library-surface) !important; border-radius:12px !important; height:46px; }
    .Bookshelf__heading { display:flex; justify-content:space-between; align-items:baseline; gap:16px; padding:0 32px 16px; }
    .Bookshelf__heading h2 { font-size:20px; font-weight:600; margin:0; letter-spacing:-.3px; }
    .Bookshelf__count { color:var(--library-muted); font-size:13px; white-space:nowrap; }
    .Bookshelf__context { display:flex; gap:8px; flex-wrap:wrap; padding:0 32px 16px; }
    .Bookshelf__context:has(select[hidden]) { display:none; }
    .Bookshelf__context select { flex:1 1 180px; }
    .Bookshelf__context input { flex:1 1 180px; }
    .Bookshelf__results { overflow:auto; overscroll-behavior:contain; min-height:0; flex:1; padding:0 32px 24px; }
    .Bookshelf__row { display:grid; grid-template-columns:44px minmax(0,1fr) 40px; column-gap:14px; padding:16px 0; border-bottom:1px solid var(--library-line); align-items:center; cursor:pointer; }
    .Bookshelf__row[data-selected=true] { background:var(--library-selected); border-radius:10px; padding-left:12px; padding-right:12px; }
    .Bookshelf__type { grid-row:1 / span 4; width:42px; height:50px; display:grid; place-items:center; border:1px solid var(--library-line); border-radius:7px; background:var(--library-surface); font-size:10px; font-weight:700; color:var(--library-muted); letter-spacing:.5px; }
    .LibraryWindow .Bookshelf__open { grid-column:2; padding:0; border:0; border-radius:3px; min-height:26px; background:none; text-align:left; font-weight:600; overflow-wrap:anywhere; }
    .LibraryWindow .Bookshelf__open:hover { color:var(--library-brand); }
    .Bookshelf__row > div:not(.Bookshelf__type) { grid-column:2; color:var(--library-muted); font-size:12px; overflow-wrap:anywhere; }
    .Bookshelf__row > details { grid-column:3; grid-row:1; align-self:start; }
    .Bookshelf__row > details > summary { cursor:pointer; width:36px; height:36px; display:grid; place-items:center; font-size:22px; border-radius:50%; list-style:none; }
    .Bookshelf__row > details > summary:hover { background:var(--library-hover); }
    .LibraryWindow summary::-webkit-details-marker { display:none; }
    .Bookshelf__footer { display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:56px; padding:10px 24px; border-top:1px solid var(--library-line); background:var(--library-bg); flex:none; }
    .Bookshelf__footer { flex-wrap:wrap; }
    .Bookshelf__transfer-progress { width:100%; font-size:13px; overflow-wrap:anywhere; }
    .Bookshelf__waiting-files { margin-top:8px; padding:12px; border:1px solid var(--library-line); border-radius:8px; }
    .Bookshelf__waiting-files h3 { margin:0 0 8px; font-size:14px; }
    .Bookshelf__waiting-files ol { max-height:22dvh; overflow:auto; margin:8px 0; padding-left:24px; }
    .Bookshelf__waiting-files li { padding:4px; overflow-wrap:anywhere; }
    .Bookshelf__transfer-progress progress { display:block; width:100%; height:8px; margin:8px 0; accent-color:var(--library-brand); }
    .Bookshelf__download { grid-column:2; justify-self:start; }
    .Bookshelf__save-state { display:flex; gap:16px; flex-wrap:wrap; color:var(--library-muted); font-size:12px; }
    .LibraryWindow .Bookshelf__sync { border:0; color:var(--library-brand); padding:6px 10px; white-space:nowrap; min-height:36px; }
    .Bookshelf__message:empty { display:none; }
    .Bookshelf__message { padding:10px 24px; background:var(--library-selected); font-size:13px; flex:none; overflow-wrap:anywhere; }
    .Bookshelf__permission { padding:12px 24px; background:var(--library-selected); font-size:13px; flex:none; }
    .Bookshelf__permission button { margin-top:8px; }
    .LibraryWindow details.Bookshelf__popover > summary { display:flex; align-items:center; justify-content:center; gap:8px; min-height:40px; padding:8px 12px; list-style:none; border-radius:8px; cursor:pointer; white-space:nowrap; }
    .LibraryWindow svg { flex:none; vertical-align:middle; pointer-events:none; }
    .Bookshelf__popover[open] > summary { background:var(--library-selected); color:var(--library-brand); }
    .Bookshelf__add { position:relative; }
    .LibraryWindow .Bookshelf__add > summary { background:var(--library-brand); color:var(--library-bg); font-weight:600; }
    .Bookshelf__add-content, .Bookshelf__filter-content { position:absolute; z-index:3; padding:16px; width:300px; max-width:calc(100vw - 32px); background:var(--library-bg); border:1px solid var(--library-line); border-radius:12px; box-shadow:0 8px 28px #172b4d20; }
    .Bookshelf__add-content { top:48px; right:0; display:flex; flex-direction:column; gap:8px; }
    .Bookshelf__file-input { position:absolute; width:1px !important; height:1px; min-height:0 !important; padding:0 !important; clip-path:inset(50%); overflow:hidden; }
    .Bookshelf__filters { position:relative; }
    .Bookshelf__filter-content { top:48px; right:0; display:flex; flex-direction:column; gap:12px; }
    .Bookshelf__filter-content select[multiple] { min-height:120px; }
    .Bookshelf__settings-content { position:absolute; z-index:6; inset:72px 0 var(--library-footer-height,56px); padding:24px max(24px,calc((100% - 800px)/2)); overflow:auto; background:var(--library-bg); }
    .Bookshelf__settings-content h2 { margin:16px 0 24px; font-size:24px; }
    .Bookshelf__settings-content > details { border-bottom:1px solid var(--library-line); padding:16px 0; }
    .Bookshelf__settings-content > details > summary { font-weight:600; list-style:none; cursor:pointer; padding:8px 0; }
    .Bookshelf__settings-content > details[open] > :not(summary) { display:block; margin:12px 0; max-width:100%; }
    .Bookshelf__settings-content label:has(input[type=checkbox]) { display:flex !important; gap:8px; align-items:center; }
    .Bookshelf__settings-content :is(p,div) { overflow-wrap:anywhere; }
    .Bookshelf__storage-option { padding:16px; border:1px solid var(--library-line); border-radius:12px; background:var(--library-surface); }
    .Bookshelf__storage-option[data-active=true] { border-color:var(--library-brand); background:var(--library-selected); }
    .Bookshelf__storage-heading { display:flex; align-items:center; flex-wrap:wrap; gap:10px; margin:0; }
    .Bookshelf__storage-badge { padding:2px 9px; border-radius:999px; background:var(--library-bg); color:var(--library-brand); font-size:12px; font-weight:600; white-space:nowrap; }
    .Bookshelf__storage-option p { margin:8px 0; }
    .Bookshelf__storage-option button { margin:8px 8px 0 0; }
    .Bookshelf__settings-content pre { font-size:12px; }
    .Bookshelf__inspector { min-width:0; min-height:0; overflow:auto; padding:24px; background:var(--library-bg); border-left:1px solid var(--library-line); }
    .Bookshelf__inspector h2 { font-size:20px; line-height:1.4; margin:20px 0 8px; overflow-wrap:anywhere; }
    .Bookshelf__inspector p { color:var(--library-muted); font-size:13px; overflow-wrap:anywhere; }
    .Bookshelf__inspector > button { margin:8px 0 20px; }
    .Bookshelf__inspector details > summary { cursor:pointer; list-style:none; font-weight:600; color:var(--library-brand); padding:12px 0; }
    .Bookshelf__record-section { width:100%; display:flex; flex-wrap:wrap; gap:8px; border-top:1px solid var(--library-line); padding:16px 0; }
    .Bookshelf__record-section h4 { width:100%; margin:0 0 8px; font-size:13px; font-weight:600; }
    .Bookshelf__record-section > input { flex:1 1 100%; }
    .Bookshelf__record-section button { font-size:13px; }
    .Bookshelf__record-section:last-child button { color:#b42332; }
    .Bookshelf__empty { padding:64px 16px; text-align:center; color:var(--library-muted); }
    .Bookshelf__empty-mark { font-size:40px; color:var(--library-line); margin-bottom:16px; }
    .Bookshelf__empty h3 { color:var(--library-text); font-size:18px; font-weight:600; margin:0 0 8px; }
    .Bookshelf__empty p { font-size:13px; margin:0; }
    .Bookshelf__compact-mode { display:none; }
    .LibraryWindow[data-full=false] .Bookshelf__workspace { grid-template-columns:minmax(0,1fr); }
    .LibraryWindow[data-full=false] .Bookshelf__sidebar { display:none; }
    .LibraryWindow[data-full=false] .Bookshelf__compact-mode { display:block; }
    .LibraryWindow[data-full=false] .Bookshelf__toolbar { padding:20px 20px 12px; }
    .LibraryWindow[data-full=false] .Bookshelf__heading, .LibraryWindow[data-full=false] .Bookshelf__context { padding-left:20px; padding-right:20px; }
    .LibraryWindow[data-full=false] .Bookshelf__results { padding-left:20px; padding-right:20px; }
    .LibraryWindow[data-full=false] .LibraryWindow__header { padding:0 16px; gap:8px; }
    .LibraryWindow[data-full=false] .LibraryWindow__brand { gap:8px; }
    .LibraryWindow[data-full=false] .Bookshelf__add-content { position:fixed; top:80px; left:16px; right:auto; }
    .LibraryWindow[data-full=false] .Bookshelf__settings > summary { font-size:0; width:40px; padding:0; }
    .LibraryWindow[data-full=false] .Bookshelf__settings > summary { gap:0; }
    .Bookshelf[data-detail-open=true] .Bookshelf__inspector { position:absolute; z-index:4; inset:0; }
    @media(min-width:1100px) {
      .LibraryWindow[data-mode=full] .Bookshelf[data-detail-open=true] .Bookshelf__workspace { grid-template-columns:208px minmax(0,1fr) 360px; }
      .LibraryWindow[data-mode=full] .Bookshelf[data-detail-open=true] .Bookshelf__inspector { position:static; }
    }
    @media(max-width:720px) {
      .LibraryWindow__header { height:64px; padding:0 16px; gap:8px; }
      .LibraryWindow h1 { font-size:20px; }
      .LibraryWindow__brand { gap:8px; }
      .LibraryWindow__mark { font-size:24px; }
      .LibraryWindow__actions { gap:2px; }
      .LibraryWindow__actions > .LibraryWindow__icon { width:40px; }
      .LibraryWindow .Bookshelf__settings > summary { font-size:0; width:36px; padding:0; }
      .LibraryWindow .Bookshelf__settings > summary { gap:0; }
      .Bookshelf__workspace { grid-template-columns:minmax(0,1fr); }
      .Bookshelf__sidebar { display:none; }
      .Bookshelf__compact-mode { display:block; }
      .Bookshelf__toolbar { padding:16px 16px 12px; }
      .Bookshelf__heading, .Bookshelf__context { padding-left:16px; padding-right:16px; }
      .Bookshelf__results { padding-left:16px; padding-right:16px; }
      .Bookshelf__footer { padding:8px 16px; }
      .Bookshelf__save-state { gap:2px; flex-direction:column; font-size:11px; }
      .Bookshelf__settings-content { top:64px; padding:20px; }
      .LibraryWindow .Bookshelf__add-content { position:fixed; top:72px; left:16px; right:16px; width:auto; max-width:none; }
    }
    @media(prefers-reduced-motion:no-preference) {
      .LibraryWindow:not([hidden]) .LibraryWindow__panel { animation:library-enter .16s ease-out; }
      @keyframes library-enter { from { opacity:0; translate:-12px 0; } to { opacity:1; translate:0 0; } }
    }
  `);

  constructor(panel, model = bookshelfStore) {
    this.model = model;
    this.panel = panel;
    this.elm = document.createElement('div');
    this.elm.className = 'Bookshelf';
    this.elm.dataset.detailOpen = 'false';
    this.resize = () => this.updatePresentation();
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(panel.panel);
    const input = document.createElement('input');
    input.type = 'file'; input.multiple = true; input.accept = '.pdf,.mscz,.mxl,.musicxml,.xml';
    input.setAttribute('aria-label', 'Import scores');
    const search = document.createElement('input');
    search.type = 'search'; search.placeholder = 'Search songs'; search.setAttribute('aria-label', 'Search songs');
    const status = document.createElement('div'); status.setAttribute('role', 'status');
    const deviceStatus = document.createElement('div'); deviceStatus.setAttribute('aria-label','Device save status');
    const cloudStatus = document.createElement('div'); cloudStatus.setAttribute('aria-label','Cloud sync status');
    const updateStatus = () => { deviceStatus.textContent = this.model.deviceStatus(); cloudStatus.textContent = this.model.cloudStatus() + (this.model.autoSettings?.enabled === false ? ' · Automatic sync off' : ''); };
    const permission = document.createElement('div'); permission.hidden = true;
    const permissionMessage = document.createElement('div');
    const allowAccess = document.createElement('button'); allowAccess.textContent = 'Allow library folder access';
    permission.append(permissionMessage, allowAccess);
    const results = document.createElement('div');
    const tagFilter = document.createElement('select'); tagFilter.multiple = true; tagFilter.setAttribute('aria-label', 'Filter by tags');
    const tagMatch = document.createElement('select'); tagMatch.setAttribute('aria-label', 'Tag matching');
    tagMatch.add(new Option('Any selected tag', 'any')); tagMatch.add(new Option('All selected tags', 'all'));
    this.elm.append(input, search, status, deviceStatus, cloudStatus, permission, results);
    panel.listeners.push(listen(this.model,'statuschange',updateStatus)); updateStatus();
    let refreshTimer;
    const refreshAfterChange = () => {
      if (!this.elm.isConnected || !this.elm.getClientRects().length) return;
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        if (!this.elm.isConnected || !this.elm.getClientRects().length) return;
        const selection = window.getSelection();
        if (!selection.isCollapsed && this.elm.contains(selection.anchorNode)) { this.refreshNeeded = true; return; }
        if (this.elm.contains(document.activeElement) && document.activeElement.matches('input,select,textarea')) { this.refreshNeeded = true; return; }
        this.refresh?.();
      },50);
    };
    panel.listeners.push(listen(this.model,'datachange',refreshAfterChange));
    panel.listeners.push(listen(this.elm,'focusout',() => { if (this.refreshNeeded) { this.refreshNeeded = false; refreshAfterChange(); } }));
    panel.listeners.push(listen(document,'selectionchange',() => {
      if (this.refreshNeeded && window.getSelection().isCollapsed) { this.refreshNeeded = false; refreshAfterChange(); }
    }));
    const updatePermission = () => {
      permission.hidden = !this.model.permissionRequired;
      permissionMessage.textContent = 'Access is required for library folder: ' + (this.model.storage?.directory?.name || '');
    };
    panel.listeners.push(listen(this.model, 'permissionchange', updatePermission));
    updatePermission();
    const importCurrent = document.createElement('button'); importCurrent.textContent = 'Import current score';
    this.elm.insertBefore(importCurrent, results);
    this.elm.insertBefore(tagFilter, results); this.elm.insertBefore(tagMatch, results);
    const mode = document.createElement('select');
    mode.setAttribute('aria-label', 'Library view');
    for (const [value, label] of [['documents', 'All scores'], ['entries', 'Songs'], ['bookshelves', 'Bookshelves'], ['playlists', 'Playlists'], ['tags', 'Tags'], ['history', 'Previous and deleted scores']]) {
      const option = new Option(label, value); option.hidden = value === 'history'; mode.add(option);
    }
    // This is a device preference, separate from library records and backups.
    const categoryKey = 'rostrum-library-category';
    try {
      const saved = localStorage.getItem(categoryKey);
      if ([...mode.options].some(option => option.value === saved)) mode.value = saved;
    } catch { /* The library remains usable when device storage is unavailable. */ }
    const collection = document.createElement('select'); collection.setAttribute('aria-label', 'Collection');
    this.changeCategory = value => {
      if (![...mode.options].some(option => option.value === value)) return;
      this.closeRecord(); mode.value = value; collection.value = '';
      try { localStorage.setItem(categoryKey,value); } catch { /* Keep the current selection in memory. */ }
      this.refresh();
    };
    const createName = document.createElement('input'); createName.placeholder = 'New collection name'; createName.setAttribute('aria-label', 'New collection name');
    const create = document.createElement('button'); create.textContent = 'Create';
    this.elm.insertBefore(mode, results); this.elm.insertBefore(collection, results);
    this.elm.insertBefore(createName, results); this.elm.insertBefore(create, results);
    const run = async (task, clearStatus = true) => {
      try { if (clearStatus) status.textContent = ''; await task(); }
      catch (error) { status.textContent = error.message; }
    };
    allowAccess.onclick = () => run(async () => {
      allowAccess.disabled = true;
      try { await this.model.reauthorizeStorage(); await this.refresh(); status.textContent = 'Library folder access restored'; }
      finally { allowAccess.disabled = false; }
    });
    const transfers = document.createElement('details');
    const transferTitle = document.createElement('summary'); transferTitle.textContent = 'Library settings'; transfers.append(transferTitle);
    const settingsSection = title => {
      const section = document.createElement('details');
      const summary = document.createElement('summary'); summary.textContent = title;
      section.append(summary); transfers.append(section); return section;
    };
    const storageSettings = settingsSection('Storage location');
    const syncSettings = settingsSection('Cloud sync');
    const backupSettings = settingsSection('Backup and restore');
    const historySettings = settingsSection('History and conflicts');
    const backup = document.createElement('button'); backup.textContent = 'Export library';
    const restore = document.createElement('input'); restore.type = 'file'; restore.accept = '.zip,application/zip'; restore.setAttribute('aria-label', 'Import library backup');
    const explanation = document.createElement('div'); explanation.textContent = 'Import adds the saved library and keeps conflicting edits for review.';
    const review = document.createElement('button'); review.textContent = 'Review conflicting edits';
    const conflictResults = document.createElement('div');
    const folder = document.createElement('button'); folder.textContent = 'Choose local folder…';
    const defaultLibrary = document.createElement('button'); defaultLibrary.textContent = 'Use OPFS';
    const browserLibrary = document.createElement('button'); browserLibrary.textContent = 'Use IndexedDB';
    const location = document.createElement('p'); location.translate = false; location.setAttribute('aria-label','Library folder'); location.hidden = true;
    backupSettings.append(backup, explanation, restore);
    historySettings.append(review, conflictResults);
    const history = document.createElement('button'); history.textContent = 'Previous and deleted scores';
    history.onclick = () => this.changeCategory('history');
    historySettings.prepend(history);
    this.elm.insertBefore(transfers, results);
    const storageBlocked = document.createElement('p');
    storageBlocked.setAttribute('role','status'); storageBlocked.setAttribute('aria-label','Storage location unavailable reason');
    storageBlocked.hidden = true; storageSettings.append(storageBlocked);
    const storageRows = new Map();
    for (const [kind,title,description,choose] of [
      ['directory','Local directory','A folder you choose on this device.',folder],
      ['opfs','OPFS','Files stored privately inside this browser.',defaultLibrary],
      ['indexeddb','IndexedDB','Library records and files stored in this browser’s database.',browserLibrary]
    ]) {
      const row = document.createElement('section'); row.dataset.storageKind = kind; row.className = 'Bookshelf__storage-option';
      const heading = document.createElement('h4'); heading.className = 'Bookshelf__storage-heading'; heading.textContent = title;
      const badge = document.createElement('span'); badge.className = 'Bookshelf__storage-badge'; badge.textContent = 'In use'; badge.hidden = true; heading.append(badge);
      const info = document.createElement('p'); info.textContent = description;
      const unavailable = document.createElement('p'); unavailable.setAttribute('role','status');
      const remove = document.createElement('button'); remove.textContent = 'Delete library data'; remove.setAttribute('aria-label','Delete ' + title + ' library data'); remove.disabled = true;
      row.append(heading,info,choose,remove,unavailable); storageSettings.append(row);
      if (kind === 'directory') row.insertBefore(location,choose);
      storageRows.set(kind,{row,badge,choose,remove,unavailable});
    }
    let storageCapabilities = {};
    const updateStorageControls = () => {
      const active = this.model.storage?.kind || 'opfs';
      const busy = this.model.operationBlock('storage');
      storageBlocked.textContent = busy ? 'Storage location cannot be changed right now. ' + busy : '';
      storageBlocked.hidden = !busy;
      for (const [kind,row] of storageRows) {
        row.row.dataset.active = String(active === kind);
        if (active === kind) row.row.setAttribute('aria-current','true'); else row.row.removeAttribute('aria-current');
        row.badge.hidden = active !== kind;
        row.choose.disabled = !storageCapabilities[kind] || !!busy;
        row.unavailable.textContent = !storageCapabilities[kind] ? 'Unavailable in this browser or context.' : '';
        row.unavailable.hidden = !!storageCapabilities[kind];
        row.remove.disabled = active !== kind || !!busy || !!this.model.storageDeleted;
      }
      location.textContent = active === 'directory' ? this.model.storage?.directory?.name || '' : '';
      location.hidden = !location.textContent;
    };
    this.model.storageCapabilities().then(capabilities => { storageCapabilities = capabilities; updateStorageControls(); });
    panel.listeners.push(listen(this.model,'statuschange',updateStorageControls));
    updateStorageControls();
    for (const [kind,row] of storageRows) row.remove.onclick = () => run(async () => {
      if ((this.model.storage?.kind || 'opfs') !== kind) return;
      const info = await this.model.deletionSummary();
      const target = kind === 'directory' ? 'Local directory: ' + this.model.storage.directory.name : kind === 'opfs' ? 'OPFS' : 'IndexedDB';
      const message = `Delete library data from ${target}?\n\n${info.scores} score records and all managed local files will be removed. Other files and the folder itself remain. Cloud data, original files and sync settings will not be deleted.\n\n` +
        (!this.model.hasSyncDestination() ? 'Warning: cloud sync is not configured. This data cannot be restored from library cloud sync.\n\n' : info.pending || info.localOnly || info.unverified ? `Warning: ${info.pending} changes not confirmed as synced; ${info.localOnly} local files not confirmed in the cloud. Unsynced data will be lost.\n\n` : 'The last sync confirmed the cloud copy. Restore requires access to that cloud.\n\n') +
        (this.model.hasSyncDestination() && this.model.autoSettings?.enabled !== false ? 'This storage location stays selected. Automatic sync will restore the cloud library; score files download when opened.' : 'This storage location stays selected with an empty library. Automatic restore is off. Use Apply and sync to restore when a cloud destination is configured.');
      if (!window.confirm(message)) return;
      await this.model.deleteStorage(); await this.refresh();
      status.textContent = 'Library data deleted from ' + target + '. ' + (this.model.hasSyncDestination() && this.model.autoSettings?.enabled !== false ? 'Automatic cloud restore requested.' : 'The library is empty. Automatic restore is off.');
    });
    const cloud = document.createElement('select'); cloud.setAttribute('aria-label', 'Library cloud service'); cloud.add(new Option('Choose cloud service', ''));
    for (const source of [Score.sources.gdrive, Score.sources.dbx, Score.sources.odrive, Score.sources.pcloud]) cloud.add(new Option(source, source));
    const cloudPath = document.createElement('output'); cloudPath.setAttribute('aria-label', 'Library cloud folder'); cloudPath.translate = false;
    cloudPath.style.cssText = 'display:block;overflow-wrap:anywhere;padding:12px;border:1px solid var(--library-line);border-radius:8px;background:var(--library-surface);';
    const chooseCloudFolder = document.createElement('button'); chooseCloudFolder.type = 'button'; chooseCloudFolder.textContent = 'Choose sync folder…'; chooseCloudFolder.setAttribute('aria-label','Choose sync folder');
    const cloudInfo = document.createElement('div'); cloudInfo.textContent = 'Choose a dedicated cloud folder, then Apply and sync. Use the same folder on each device. Changes sync automatically; scores download when opened or kept offline.';
    const autoLabel = document.createElement('label'); autoLabel.textContent = 'Automatic library sync';
    const auto = document.createElement('input'); auto.type = 'checkbox'; auto.setAttribute('aria-label','Automatic library sync'); auto.checked = this.model.autoSettings?.enabled !== false; autoLabel.append(auto);
    auto.onchange = () => run(async () => { await this.model.setAutoSync(auto.checked); });
    panel.listeners.push(listen(this.model,'statuschange',() => { auto.checked = this.model.autoSettings?.enabled !== false; }));
    const sync = document.createElement('button'); sync.textContent = 'Sync library now';
    const applySync = document.createElement('button'); applySync.textContent = 'Apply and sync'; applySync.onclick = () => sync.click();
    const checkSync = document.createElement('button'); checkSync.textContent = 'Check sync status';
    const allSync = document.createElement('button'); allSync.textContent = 'Sync and download all scores';
    const syncCounts = document.createElement('p'); syncCounts.setAttribute('aria-label','File sync counts');
    syncSettings.append(cloud,cloudPath,chooseCloudFolder,cloudInfo,autoLabel,checkSync,applySync,syncCounts,allSync);
    this.elm.insertBefore(sync, transfers);
    const backupInfo = document.createElement('div'); backupInfo.textContent = 'A complete ZIP backup downloads any missing score files first.'; backupSettings.append(backupInfo);
    let cloudTouched = false, draftCloud = null, pickingCloudFolder = false, applyingCloud = false;
    const updateCloudControls = () => {
      const chosen = draftCloud && draftCloud.source === cloud.value;
      const path = chosen ? draftCloud.path.replace(/^\/+|\/+$/g,'') : '';
      const destination = chosen ? draftCloud.source + ':' + (path ? '/' + path : '') : '';
      const applied = chosen && this.model.cloudSelection?.source === draftCloud.source && this.model.cloudSelection?.path === draftCloud.path;
      const needs = this.model.syncNeeds?.destination === destination ? this.model.syncNeeds : null;
      const known = needs?.checkedAt && !needs.error;
      const busy = pickingCloudFolder || applyingCloud || this.model.operationBlock('sync');
      cloudPath.textContent = chosen ? draftCloud.path || '/' : 'No folder selected';
      chooseCloudFolder.disabled = !cloud.value || busy || !!this.model.transferState.size;
      sync.disabled = applySync.disabled = !chosen || busy || !!this.model.checkingCloud || applied && (!known || !needs.pending && !needs.uploads);
      allSync.disabled = !chosen || busy || !!this.model.checkingCloud || applied && (!known || !needs.pending && !needs.uploads && !needs.downloads);
      checkSync.disabled = !chosen || busy || !!this.model.checkingCloud;
      syncCounts.textContent = this.model.checkingCloud ? 'Checking cloud status…' : known
        ? `Upload pending: ${needs.uploads} files · Download pending: ${needs.downloads} files` + (needs.pending ? ' · Library changes pending; file counts update after sync.' : '')
        : needs?.error ? 'Could not check cloud status: ' + needs.error : chosen ? 'Check sync status to count pending files.' : 'Choose a sync folder first.';
      cloud.disabled = busy || !!this.model.transferState.size;
    };
    const checkCloudStatus = async (interactive = false) => {
      if (!draftCloud || this.model.syncPending || this.model.deletingStorage) return;
      try { await this.model.checkCloudSelection(draftCloud.source,draftCloud.path,{interactive}); }
      catch { /* The state and retry button remain visible in this panel. */ }
      updateCloudControls();
    };
    checkSync.onclick = () => checkCloudStatus(true);
    syncSettings.addEventListener('toggle',() => { if (syncSettings.open) checkCloudStatus(); });
    const preloadCloud = () => { if (cloud.value === Score.sources.gdrive) FileSrc.get(cloud.value).preloadGIS?.(); };
    cloud.onchange = () => { cloudTouched = true; draftCloud = null; preloadCloud(); updateCloudControls(); };
    this.model.savedCloudSelection().then(saved => {
      if (!cloudTouched && saved && typeof saved.path === 'string') {
        cloud.value = saved.source;
        if (cloud.value) draftCloud = {source:saved.source,path:saved.path};
        preloadCloud(); updateCloudControls();
        if (transfers.open) checkCloudStatus();
      }
    }).catch(() => {});
    chooseCloudFolder.onclick = () => run(async () => {
      const service = cloud.value;
      if (!service) return;
      cloudTouched = true; pickingCloudFolder = true; updateCloudControls();
      try {
        const picker = this.cloudFolderPicker = new CloudFolderPicker(service,draftCloud?.source === service ? draftCloud.path : '');
        const path = await picker.show();
        if (path !== null && cloud.value === service && !panel.closing) {
          draftCloud = {source:service,path}; status.textContent = 'Folder selected. Use Apply and sync to change the sync destination.';
        }
      } finally {
        this.cloudFolderPicker = null; pickingCloudFolder = false; updateCloudControls();
        if (chooseCloudFolder.isConnected && !chooseCloudFolder.disabled) chooseCloudFolder.focus({preventScroll:true});
      }
    });
    sync.onclick = () => run(async () => {
      if (!draftCloud || draftCloud.source !== cloud.value) throw new Error('Choose a cloud folder first.');
      const selected = {...draftCloud}; applyingCloud = true; updateCloudControls(); status.textContent = 'Syncing library';
      try {
        const result = await this.model.syncCloud(selected.source,selected.path); await this.refresh();
        status.textContent = `Synced library; ${result.conflicts} conflicting items to review.`;
      } finally { applyingCloud = false; updateCloudControls(); }
    });
    allSync.onclick = () => run(async () => {
      if (!draftCloud) return;
      const selected = {...draftCloud};
      const result = await this.model.syncAllScores(selected.source,selected.path);
      await this.refresh();
      status.textContent = result.failed ? `Full sync finished with ${result.failed} failed files. Retry to download the remaining files.`
        : result.phase === 'cancelled' ? 'Full sync stopped. Finished files remain on this device.' : 'All current library scores are on this device.';
    });
    updateCloudControls();
    panel.listeners.push(listen(this.model,'statuschange',updateCloudControls));
    folder.onclick = () => run(async () => {
      const directory = await window.showDirectoryPicker({ mode: 'readwrite' });
      await this.model.configure({ kind: 'directory', directory });
      await this.refresh();
    });
    defaultLibrary.onclick = () => run(async () => {
      await this.model.configure({}); await this.refresh();
    });
    browserLibrary.onclick = () => run(async () => {
      await this.model.configure({ kind: 'indexeddb' }); await this.refresh();
    });
    backup.onclick = () => run(async () => {
      const bytes = await this.model.exportBackup();
      await window._localFs_.fileSaveLegacy(new Blob([bytes], { type: 'application/zip' }), { fileName: 'rostrum-library-' + new Date().toISOString().slice(0,10) + '.zip' });
      status.textContent = this.model.emergencyBackup ? 'Emergency backup exported; library storage could not be updated.' : 'Library exported';
    });
    restore.onchange = () => run(async () => {
      if (!restore.files[0]) return;
      restore.disabled = true;
      try {
        const result = await this.model.importBackup(restore.files[0]);
        await this.refresh();
        status.textContent = `Imported ${result.importedFiles} scores; ${result.conflicts} conflicting items to review.`;
      } finally { restore.disabled = false; restore.value = ''; }
    });
    review.onclick = () => run(async () => {
      const conflicts = await this.model.conflicts(); conflictResults.replaceChildren();
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
            await this.model.resolveConflict({ table: conflict.table, id: conflict.id, revisionId: change.id,
              expectedRevisionIds: conflict.alternatives.map(option => option.id) });
            conflictResults.replaceChildren(); await this.refresh(); review.click();
          });
          section.append(title, details, choose);
        }
        conflictResults.append(section);
      }
    });
    const records = (table, parent, id) => this.model.records(table,parent,id);
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
      if (this.model.storageDeleted) {
        results.replaceChildren(); const message = document.createElement('p');
        message.textContent = 'Library deletion was incomplete. Choose its storage location again in Library settings.'; results.append(message);
        this.rowViews?.clear(); this.closeRecord(); updateStatus(); return;
      }
      const current = ++generation;
      const referenceTables = ['tags', 'entry_tags', 'document_tags', 'bookshelves', 'playlists'];
      const referenceRows = await Promise.all(referenceTables.map(table => records(table)));
      if (current !== generation) return;
      references = Object.fromEntries(referenceTables.map((table, i) => [table, referenceRows[i]]));
      updateStorageControls();
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
      const filters = {query:search.value,tagIds:selectedTags,matchAll:tagMatch.value === 'all'};
      search.placeholder = ['documents','bookshelves'].includes(mode.value) ? 'Search scores' : 'Search songs';
      const rows = await this.model.query({mode:mode.value,collection:collection.value,filters});
      if (current !== generation) return;
      const availability = await this.model.availability();
      updateStatus();
      if (current !== generation) return;
      const expanded = new Set([...this.elm.querySelectorAll('details[open][data-record]')].map(elm => elm.dataset.record));
      const selection = window.getSelection();
      if (!selection.isCollapsed && results.contains(selection.anchorNode)) { this.refreshNeeded = true; return; }
      results.replaceChildren();
      this.rowViews = new Map();
      this.updateNavigation(mode.value, collection, rows.length, selectedTags.length);
      if (grouped && collection.value) {
        const group = groups.find(g => g.id === collection.value);
        const edit = document.createElement('input'); edit.value = label(group); edit.setAttribute('aria-label', 'Collection name'); results.append(edit);
        button(results, 'Rename collection', () => this.model.rename(mode.value,group,edit.value.trim()));
        button(results, 'Delete collection', () => this.model.remove(mode.value,group));
        if (['bookshelves','playlists'].includes(mode.value)) button(results,'Keep collection offline',async () => {
          const ids = await this.model.collectionDocuments(mode.value,collection.value);
          await this.model.keepOffline(ids);
        });
      }
      for (const row of rows) {
        let card = document.createElement('div'); card.className = 'Bookshelf__row'; results.append(card);
        const rowCard = card;
        const kind = document.createElement('div'); kind.className = 'Bookshelf__type'; kind.setAttribute('aria-hidden','true');
        kind.textContent = /\.pdf$/i.test(JSON.parse(row.metadata_json).originalFilename || JSON.parse(row.metadata_json).displayName || '') ? 'PDF' : row.document_id ? 'SONG' : 'SCORE';
        card.append(kind);
        const openButton = document.createElement('button');
        const metadata = JSON.parse(row.metadata_json);
        const documentMetadata = row.document_id ? JSON.parse(row.document_metadata || '{}') : metadata;
        const cloudLocations = (documentMetadata.originalLocations || []).filter(location =>
          [Score.sources.gdrive,Score.sources.dbx,Score.sources.odrive,Score.sources.pcloud].includes(location.source) && typeof location.path === 'string');
        const fileLabel = cloudLocations.length
          ? cloudLocations.map(location => location.source + ' · ' + (location.path.replace(/\/+$/,'') || '') + '/' + location.name).join('\n')
          : documentMetadata.originalFilename || '';
        openButton.textContent = metadata.title || metadata.displayName;
        openButton.className = 'Bookshelf__open';
        openButton.disabled = !!row.unavailable || this.model.opening?.id === (row.document_id || row.id);
        if (row.deleted_at) openButton.disabled = true;
        const openRecord = () => run(async () => {
          if (!await checkUnsaved()) return;
          await this.model.openDocument(row.document_id || row.id, row.anchor_json && JSON.parse(row.anchor_json));
          panel.hide();
        });
        const recordKey = (row.document_id ? 'entries:' : 'documents:') + row.id;
        openButton.onclick = () => { if (!window.getSelection().isCollapsed) return; return panel.fullView ? this.showRecord(recordKey, false) : openRecord(); };
        card.append(openButton);
        if (fileLabel) {
          const fileLocation = document.createElement('div'); fileLocation.setAttribute('aria-label','Score file location');
          fileLocation.translate = false; fileLocation.style.whiteSpace = 'pre-wrap'; fileLocation.textContent = fileLabel;
          card.append(fileLocation);
        }
        rowCard.addEventListener('click', event => {
          if (!window.getSelection().isCollapsed) return;
          if (!event.target.closest('button,summary,details,input,select')) openButton.click();
        });
        let downloadButton = null;
        const local = availability.get(row.document_id || row.id);
        if (local) {
          const id = row.document_id || row.id;
          const transfer = this.model.downloadState(id);
          const state = document.createElement('div');
          state.setAttribute('aria-label','Local file status');
          state.textContent = [transfer.state ? transfer.state === 'running' ? 'Downloading' : 'Download queued' : local.present ? 'On this device' : local.remote ? 'Cloud only' : 'Not on this device',
            local.pinned && (local.present ? 'Kept offline' : 'Offline download requested'),
            this.model.hasSyncDestination() ? local.remote ? local.pending ? 'Cloud changes pending' : 'File uploaded' : 'File upload pending' : '', transfer.error].filter(Boolean).join(' · ');
          card.append(state);
          if (!local.present && !row.unavailable) {
            const download = document.createElement('button'); download.type = 'button'; download.className = 'Bookshelf__download';
            download.textContent = transfer?.state === 'running' ? 'Downloading…' : transfer?.state ? 'Download next' : transfer.error ? 'Retry download' : 'Download to this device';
            download.disabled = transfer?.state === 'running' || navigator.onLine === false || !this.model.hasSyncDestination();
            download.onclick = () => run(async () => { await this.model.download(id); });
            downloadButton = download;
            card.append(download);
          }
        }
        if (mode.value === 'history') {
          const info = document.createElement('div'); info.textContent = row.deleted_at ? 'Deleted score' : row.replaced_by_id ? 'Previous version' : 'Current version'; card.append(info);
          if (row.deleted_at || row.replaced_by_id) button(card, 'Use this version', () => this.model.useVersion(row.id));
          if (row.deleted_at) continue;
        }
        if (row.unavailable) {
          const unavailable = document.createElement('div'); unavailable.textContent = 'This song or score was deleted.'; card.append(unavailable);
          if (row.membership) button(card, 'Remove from collection', () => this.model.remove('playlist_items',row.membership));
          continue;
        }
        const isEntry = !!row.document_id;
        if (metadata.composer && !isEntry) {
          const composer = document.createElement('div'); composer.textContent = metadata.composer; card.append(composer);
        }
        if (isEntry) {
          const description = document.createElement('div');
          description.textContent = [metadata.composer,
            row.anchor_json && 'Page ' + (JSON.parse(row.anchor_json).pageIndex + 1), row.previousVersion && 'Previous version'].filter(Boolean).join(' · ');
          card.append(description);
        }
        const details = document.createElement('details');
        details.dataset.record = (isEntry ? 'entries:' : 'documents:') + row.id; details.open = expanded.has(details.dataset.record);
        const summary = document.createElement('summary'); summary.textContent = '⋯'; summary.setAttribute('aria-label', 'Edit and organize');
        details.append(summary); card.append(details);
        this.rowViews.set(recordKey, { row:rowCard, details, summary, title:openButton.textContent,
          downloadButton,
          description:[metadata.composer,fileLabel].filter(Boolean).join('\n'),
          open:openRecord });
        summary.addEventListener('click', event => {
          if (details.parentElement === this.inspector) return;
          event.preventDefault(); this.showRecord(recordKey, true);
        });
        const controls = document.createElement('div'); controls.style.cssText = 'display:flex;flex-wrap:wrap;gap:.4em;padding:.5em 0';
        details.append(controls); card = controls;
        const recordSection = title => {
          const section = document.createElement('section'); section.className = 'Bookshelf__record-section';
          const heading = document.createElement('h4'); heading.textContent = title; section.append(heading);
          controls.append(section); card = section; return section;
        };
        recordSection('Name and song details');
        const originalLocations = documentMetadata.originalLocations || [];
        if (originalLocations.length) {
          const origin = document.createElement('div'); origin.setAttribute('aria-label','Original file locations');
          for (const location of originalLocations) {
            const line = document.createElement('div'); line.translate = false; line.style.overflowWrap = 'anywhere';
            line.textContent = location.source + ' · ' + (location.path === null ? location.name + ' (folder unavailable)' : (location.path || '') + '/' + location.name);
            origin.append(line);
          }
          const heading = document.createElement('div'); heading.textContent = 'Original file location'; card.append(heading,origin);
        }
        const table = isEntry ? 'entries' : 'documents';
        const title = document.createElement('input'); title.value = label(row); title.setAttribute('aria-label', isEntry ? 'Song title' : 'Score name'); card.append(title);
        button(card, 'Rename', () => this.model.rename(table,row,title.value));
        button(card, 'Delete', () => this.model.remove(table,row));
        const deleteButton = card.lastElementChild;
        recordSection('Tags and collections');
        choose(card, 'tags', 'Add tag', tag_id => this.model.addTag(table,row.id,tag_id));
        const tagLinks = references[isEntry ? 'entry_tags' : 'document_tags'].filter(link => link[isEntry ? 'entry_id' : 'document_id'] === row.id);
        const tags = references.tags;
        for (const link of tagLinks) {
          const tag = tags.find(t => t.id === link.tag_id);
          if (tag) button(card, 'Remove tag: ' + tag.name, () => this.model.remove(isEntry ? 'entry_tags' : 'document_tags',link));
        }
        if (isEntry) {
          const inherited = references.document_tags.filter(link => link.document_id === row.document_id)
            .map(link => tags.find(tag => tag.id === link.tag_id)?.name).filter(Boolean);
          if (inherited.length) { const info = document.createElement('div'); info.textContent = 'Tags from score: ' + inherited.join(', '); card.append(info); }
        }
        choose(card, isEntry ? 'playlists' : 'bookshelves', isEntry ? 'Add to playlist' : 'Add to bookshelf', id => this.model.addToCollection(table,row.id,id));
        if (row.membership) {
          const membershipTable = isEntry ? 'playlist_items' : 'bookshelf_documents';
          button(card, 'Remove from collection', () => this.model.remove(membershipTable,row.membership));
          const note = document.createElement('input'); note.placeholder = 'Item note'; note.value = JSON.parse(row.membership.metadata_json).note || ''; card.append(note);
          button(card, 'Save note', () => this.model.saveItemNote(membershipTable,row.membership,note.value));
          button(card, 'Move up', () => this.model.moveItem(membershipTable,row.membership.id,-1));
          button(card, 'Move down', () => this.model.moveItem(membershipTable,row.membership.id,1));
        }
        if (isEntry) {
          card = controls.firstElementChild;
          const composer = document.createElement('input'); composer.value = metadata.composer || ''; composer.setAttribute('aria-label', 'Composer');
          const aliases = document.createElement('input'); aliases.value = (metadata.aliases || []).join('; '); aliases.setAttribute('aria-label', 'Aliases');
          const page = document.createElement('input'); page.type = 'number'; page.min = '1'; page.value = JSON.parse(row.anchor_json).pageIndex + 1; page.setAttribute('aria-label', 'Start page');
          card.append(composer, aliases, page);
          button(card, 'Save song details', () => this.model.saveSong(row,{composer:composer.value,aliases:aliases.value,pageIndex:Number(page.value) - 1}));
        } else {
          recordSection('Offline storage');
          if (local?.pinned) button(card,'Stop keeping offline',() => this.model.pinFile(row.id,false));
          else button(card,'Keep offline',() => this.model.keepOffline([row.id]));
          if (local?.present) button(card,'Release download',() => this.model.releaseDownload(row.id)).disabled = !!local.pinned;
          recordSection('Songs');
          button(card, 'Edit songs', () => this.model.editSongs(row.id));
          button(card, 'Rebuild song index', () => this.model.reindex(row.id));
          const songTitle = document.createElement('input'); songTitle.placeholder = 'New song title'; songTitle.setAttribute('aria-label', 'New song title');
          const startPage = document.createElement('input'); startPage.type = 'number'; startPage.min = '1'; startPage.value = '1'; startPage.setAttribute('aria-label', 'New song start page');
          card.append(songTitle, startPage);
          button(card, 'Add song', () => this.model.addSong(row,songTitle.value,Number(startPage.value) - 1));
          recordSection('Replace file');
          const replacement = document.createElement('input'); replacement.type = 'file'; replacement.accept = input.accept; replacement.setAttribute('aria-label', 'Replace score file');
          replacement.onchange = () => run(async () => {
            if (!replacement.files[0]) return;
            try {
              if (!await checkUnsaved()) return;
              replacement.disabled = true;
              const imported = await this.model.importReviewed(replacement.files[0], { replacesId: row.id }); await this.refresh();
              if (imported?.alreadyImported) status.textContent = 'Score already imported; replacement skipped. Previous or deleted scores remain in history.';
            } finally { replacement.value = ''; replacement.disabled = false; }
          });
          card.append(replacement);
        }
        recordSection('Delete').append(deleteButton);
      }
      if (!rows.length) {
        const empty = document.createElement('div'); empty.className = 'Bookshelf__empty';
        empty.textContent = ['bookshelves', 'playlists'].includes(mode.value) && !collection.value ? 'Choose or create a collection' : 'No scores found';
        const mark = document.createElement('div'); mark.className = 'Bookshelf__empty-mark'; mark.textContent = '▥'; mark.setAttribute('aria-hidden','true');
        const message = document.createElement('h3'); message.textContent = empty.textContent;
        const hint = document.createElement('p'); hint.textContent = search.value ? 'Try a different title or filter.' : 'Add a score to start building your library.';
        empty.replaceChildren(mark, message, hint); results.append(empty);
      }
      if (this.selectedRecord && this.rowViews.has(this.selectedRecord)) this.showRecord(this.selectedRecord, expanded.has(this.selectedRecord));
      else this.closeRecord();
    }, false);
    input.onchange = () => run(async () => {
      input.disabled = true;
      let imported = 0, skipped = 0, cancelled = 0;
      try { for (const file of input.files) {
        status.textContent = 'Importing ' + file.name;
        const result = await this.model.importReviewed(file,{originalLocation:{source:Score.sources.local,path:null,name:file.name}});
        if (!result) cancelled++;
        else if (result.alreadyImported) skipped++;
        else imported++;
      } }
      finally { input.disabled = false; input.value = ''; }
      await this.refresh();
      status.textContent = `Imported ${imported} scores; skipped ${skipped} already imported scores; cancelled ${cancelled} scores.`;
      if (skipped) status.textContent += ' Previous or deleted scores remain in history.';
    });
    search.oninput = () => this.refresh();
    tagFilter.onchange = tagMatch.onchange = () => this.refresh();
    mode.onchange = () => this.changeCategory(mode.value);
    collection.onchange = () => this.refresh();
    create.onclick = () => run(async () => {
      const name = createName.value.trim(); if (!name) return;
      await this.model.createCollection(mode.value,name);
      createName.value = ''; await this.refresh();
    });
    const updateCurrent = () => { importCurrent.disabled = !window._score_; };
    panel.listeners.push(listen(document, 'scoreOpened', updateCurrent), listen(document, 'scoreClosed', updateCurrent));
    updateCurrent();
    importCurrent.onclick = () => run(async () => {
      if (!_score_) throw new Error('Open a score first');
      importCurrent.disabled = true;
      try {
        const name = _score_.saveName;
        const originalLocation = _score_.libraryDocumentId ? null : {source:_score_.source || Score.sources.local,path:_score_.source === Score.sources.local ? null : _score_.path ?? null,name:_score_.name || name};
        const bytes = await _score_.toFile();
        const imported = await this.model.importReviewed(new File([bytes], name),{originalLocation});
        await this.refresh();
        if (imported?.alreadyImported) status.textContent = 'Score already imported; skipped. Previous or deleted scores remain in history.';
      } finally { importCurrent.disabled = false; }
    });
    this.buildWorkspace({ input, search, status, deviceStatus, cloudStatus, permission, results, importCurrent,
      tagFilter, tagMatch, mode, collection, createName, create, transfers, sync });
  }
  buildWorkspace(controls) {
    Object.assign(this, controls);
    this.rowViews = new Map();
    const element = (tag, className, text) => {
      const elm = document.createElement(tag); if (className) elm.className = className;
      if (text) elm.textContent = text; return elm;
    };
    this.workspace = element('div','Bookshelf__workspace');
    const sidebar = element('nav','Bookshelf__sidebar'); sidebar.setAttribute('aria-label','Library categories');
    sidebar.append(element('div','Bookshelf__nav-title','Browse'));
    const navigation = element('div','Bookshelf__nav'); this.navigationButtons = new Map();
    const categories = [['documents','All scores','▥'],['entries','Songs','♪'],['bookshelves','Bookshelves','▤'],['playlists','Playlists','≡'],['tags','Tags','#']];
    for (const [value,title,icon] of categories) {
      const button = element('button',''); button.type = 'button'; button.setAttribute('aria-label',title);
      const glyph = element('span','',icon); glyph.setAttribute('aria-hidden','true'); button.append(glyph,document.createTextNode(title));
      button.onclick = () => this.changeCategory(value);
      this.navigationButtons.set(value,button); navigation.append(button);
    }
    sidebar.append(navigation);
    const main = element('main','Bookshelf__main');
    const toolbar = element('div','Bookshelf__toolbar');
    this.search.className = 'Bookshelf__search';
    const filters = this.filters = element('details','Bookshelf__popover Bookshelf__filters');
    this.filterSummary = element('summary','','Filters'); this.filterSummary.setAttribute('aria-label','Filter library');
    const filterContent = element('div','Bookshelf__filter-content');
    filterContent.append(element('strong','','Filter by tags'),this.tagFilter,this.tagMatch);
    const clear = element('button','','Clear filters'); clear.type = 'button';
    clear.onclick = () => { for (const option of this.tagFilter.options) option.selected = false; this.refresh(); };
    filterContent.append(clear); filters.append(this.filterSummary,filterContent); toolbar.append(this.search,filters);
    const heading = element('div','Bookshelf__heading');
    this.viewTitle = element('h2','','All scores'); this.count = element('span','Bookshelf__count');
    heading.append(this.viewTitle,this.count);
    this.mode.classList.add('Bookshelf__compact-mode');
    const compact = element('div','Bookshelf__context Bookshelf__compact-mode'); compact.append(this.mode);
    const context = element('div','Bookshelf__context'); context.append(this.collection,this.createName,this.create);
    this.results.className = 'Bookshelf__results'; this.results.setAttribute('aria-label','Library results');
    main.append(toolbar,compact,heading,context,this.results);
    this.inspector = element('aside','Bookshelf__inspector'); this.inspector.hidden = true;
    this.inspector.setAttribute('aria-label','Score details');
    this.workspace.append(sidebar,main,this.inspector);
    const footer = element('footer','Bookshelf__footer');
    const saveState = element('div','Bookshelf__save-state'); saveState.append(this.deviceStatus,this.cloudStatus);
    const transferProgress = element('div','Bookshelf__transfer-progress'); transferProgress.setAttribute('aria-label','Library transfer progress');
    const transferText = element('div'); transferText.setAttribute('role','status');
    const progress = document.createElement('progress'); progress.setAttribute('aria-label','File transfer progress');
    const stop = element('button','','Stop remaining downloads'); stop.type = 'button'; stop.onclick = () => this.model.cancelFullSync();
    const waitingText = element('div'); waitingText.setAttribute('aria-label','Pending file transfers');
    let waitingDirection = null;
    const waitingButtons = {};
    const waitingFiles = element('section','Bookshelf__waiting-files'); waitingFiles.hidden = true;
    waitingFiles.setAttribute('role','region');
    const waitingHeading = element('h3'), waitingList = element('ol'), waitingEmpty = element('p');
    const closeWaiting = element('button','','Close waiting files'); closeWaiting.type = 'button';
    closeWaiting.onclick = () => {
      const previous = waitingDirection; waitingDirection = null; updateProgress(); waitingButtons[previous]?.focus();
    };
    waitingFiles.append(waitingHeading,waitingList,waitingEmpty,closeWaiting);
    for (const direction of ['upload','download']) {
      const button = waitingButtons[direction] = element('button'); button.type = 'button';
      button.onclick = () => { waitingDirection = waitingDirection === direction ? null : direction; updateProgress(); };
      if (direction === 'download') waitingText.append(document.createTextNode(' · '));
      waitingText.append(button);
    }
    transferProgress.append(transferText,progress,waitingText,stop,waitingFiles);
    const updateProgress = () => {
      const queue = this.model.transferState, full = this.model.fullSyncState;
      const checking = this.model.syncPending || this.model.cloudConnecting || this.model.checkingCloud || this.model.autoSync?.running;
      transferProgress.hidden = !queue.total && !full && !checking;
      for (const direction of ['upload','download']) {
        waitingButtons[direction].textContent = `${direction === 'upload' ? 'Upload' : 'Download'} waiting: ${queue.waiting[direction]} files`;
        waitingButtons[direction].setAttribute('aria-expanded',String(waitingDirection === direction));
      }
      waitingFiles.hidden = !waitingDirection;
      if (waitingDirection) {
        const title = `Files waiting to ${waitingDirection}`;
        waitingFiles.setAttribute('aria-label',title); waitingHeading.textContent = title;
        const labels = queue.waitingFiles[waitingDirection];
        waitingList.replaceChildren(...labels.map(label => element('li','',label)));
        waitingEmpty.textContent = `No files waiting to ${waitingDirection}.`;
        waitingEmpty.hidden = !!labels.length; waitingList.hidden = !labels.length;
      }
      const current = queue.active ? (queue.active.direction === 'upload' ? 'Uploading: ' : 'Downloading: ') + queue.active.label : '';
      if (queue.active || queue.size || queue.waiting.upload) {
        progress.max = Math.max(1,queue.total); progress.value = queue.completed;
        transferText.textContent = `${current || 'Preparing file transfers'} · ${queue.completed} / ${queue.total} files completed` +
          (queue.failed ? ` · ${queue.failed} failed` : '') + (queue.cancelled ? ` · ${queue.cancelled} stopped` : '');
      } else if (checking) {
        transferText.textContent = this.model.syncError ? 'Sync failed: ' + this.model.syncError.message : 'Checking and syncing library information…';
        progress.removeAttribute('value');
      } else if (full && (this.model.fullSyncRunning || !queue.total)) {
        progress.max = Math.max(1,full.total); progress.value = full.completed;
        transferText.textContent = `${full.phase === 'done' ? 'Complete' : full.phase === 'cancelled' ? 'Stopped' : full.phase === 'failed' ? 'Some transfers failed' : 'Downloading scores'}: ${full.completed} / ${full.total} files` + (full.failed ? ` · ${full.failed} failed` : '') + (full.error ? ' · ' + full.error : '');
        if (full.phase === 'done' && !full.total) { progress.value = progress.max; transferText.textContent = 'All current library scores are on this device.'; }
      } else {
        progress.max = Math.max(1,queue.total); progress.value = queue.completed;
        transferText.textContent = `${queue.failed ? 'Some transfers failed' : queue.cancelled ? 'Stopped' : 'Transfer complete'}: ${queue.completed} / ${queue.total} files completed` +
          (queue.failed ? ` · ${queue.failed} failed` : '') + (queue.cancelled ? ` · ${queue.cancelled} stopped` : '');
      }
      stop.hidden = !this.model.fullSyncRunning; stop.disabled = !!this.model.fullSyncCancelled;
    };
    this.panel.listeners.push(listen(this.model,'statuschange',updateProgress)); updateProgress();
    this.sync.className = 'Bookshelf__sync'; this.sync.setAttribute('aria-label','Sync library now'); this.sync.textContent = '↻ Sync';
    footer.append(saveState,this.sync,transferProgress);
    this.footer = footer; this.resizeObserver.observe(footer);
    this.status.className = 'Bookshelf__message'; this.permission.className = 'Bookshelf__permission';
    this.elm.replaceChildren(this.permission,this.workspace,this.status,footer);

    const add = this.addMenu = element('details','Bookshelf__popover Bookshelf__add');
    const addSummary = element('summary'); addSummary.innerHTML = iconSvg('Add', {size:'18px'}) + '<span>Add</span>'; addSummary.setAttribute('aria-label','Add scores');
    const addContent = element('div','Bookshelf__add-content');
    this.input.className = 'Bookshelf__file-input'; this.input.tabIndex = -1;
    const chooseFiles = element('button','','Choose files…'); chooseFiles.type = 'button'; chooseFiles.onclick = () => { add.open = false; this.input.click(); };
    const cloudLabel = element('label','','Cloud service');
    const cloudService = element('select'); cloudService.setAttribute('aria-label','Add from cloud service');
    cloudService.add(new Option('Choose cloud service',''));
    for (const source of [Score.sources.gdrive,Score.sources.dbx,Score.sources.odrive,Score.sources.pcloud]) cloudService.add(new Option(source,source));
    cloudLabel.append(cloudService);
    const preload = () => { if (cloudService.value === Score.sources.gdrive) FileSrc.get(cloudService.value).preloadGIS?.(); };
    const chooseCloud = element('button','','Choose cloud file…'); chooseCloud.type = 'button';
    chooseCloud.disabled = true;
    cloudService.onchange = () => { chooseCloud.disabled = !cloudService.value; preload(); };
    chooseCloud.onclick = async () => {
      add.open = false; chooseCloud.disabled = true;
      try {
        const picker = this.cloudFolderPicker = new CloudFolderPicker(cloudService.value,'',{files:true});
        const location = await picker.show(); this.cloudFolderPicker = null;
        if (!location || this.panel.closing) return;
        this.status.textContent = 'Downloading ' + location.name;
        const file = await this.model.readOriginalFile(location);
        if (this.panel.closing) return;
        const imported = await this.model.importReviewed(file,{originalLocation:location});
        await this.refresh();
        this.status.textContent = imported ? imported.alreadyImported ? 'Score already imported; original file location recorded.' : 'Imported ' + location.name : 'Import cancelled.';
      } catch (error) { this.status.textContent = error.message; }
      finally {
        this.cloudFolderPicker = null; chooseCloud.disabled = false;
        if (addSummary.isConnected && !this.panel.closing) addSummary.focus({preventScroll:true});
      }
    };
    const importCurrent = this.importCurrent.onclick;
    this.importCurrent.onclick = event => { add.open = false; return importCurrent(event); };
    addContent.append(chooseFiles,this.input,this.importCurrent,cloudLabel,chooseCloud); add.append(addSummary,addContent);
    this.panel.addSlot.append(add);
    const settings = this.transfers; settings.className = 'Bookshelf__popover Bookshelf__settings';
    const settingsSummary = settings.querySelector('summary'); settingsSummary.setAttribute('aria-label','Library settings');
    settingsSummary.innerHTML = iconSvg('Options', {size:'20px'}) + '<span>Library settings</span>';
    const settingsContent = element('section','Bookshelf__settings-content'); settingsContent.setAttribute('aria-label','Library settings content');
    const back = element('button','','← Back to library'); back.type = 'button'; back.onclick = () => { settings.open = false; };
    settingsContent.append(back,element('h2','','Library settings'));
    for (const child of [...settings.children]) if (child !== settingsSummary) settingsContent.append(child);
    settings.append(settingsContent); this.panel.settingsSlot.append(settings);
    settings.addEventListener('toggle', () => {
      this.workspace.inert = settings.open;
      if (settings.open) { add.open = false; back.focus({preventScroll:true}); }
      else if (this.panel.open) settingsSummary.focus({preventScroll:true});
    });
    this.panel.listeners.push(listen(document,'click', event => {
      if (!add.contains(event.target)) add.open = false;
      if (!filters.contains(event.target)) filters.open = false;
    }));
  }

  updateNavigation(value, collection, count, filterCount) {
    for (const [key,button] of this.navigationButtons) button.setAttribute('aria-pressed',String(key === value));
    const title = this.mode.selectedOptions[0]?.textContent || 'Library';
    this.viewTitle.textContent = collection.value ? collection.selectedOptions[0]?.textContent || title : title;
    this.count.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
    this.filterSummary.textContent = filterCount ? `Filters · ${filterCount}` : 'Filters';
  }

  updatePresentation() {
    if (this.footer) this.panel.panel.style.setProperty('--library-footer-height',this.footer.offsetHeight + 'px');
    // CSS handles size changes. The same controls retain query, selection and scroll.
    if (this.selectedRecord && this.rowViews.has(this.selectedRecord)) {
      this.elm.dataset.detailOpen = 'true';
    }
  }

  showRecord(key, edit = false) {
    const selected = this.rowViews.get(key);
    if (!selected) return;
    const previous = this.selectedRecord && this.rowViews.get(this.selectedRecord);
    if (previous && previous !== selected) {
      previous.details.open = false; previous.summary.textContent = '⋯'; previous.row.append(previous.details);
      if (previous.downloadButton) previous.row.append(previous.downloadButton);
    }
    this.selectedRecord = key;
    for (const [id,view] of this.rowViews) view.row.dataset.selected = String(id === key);
    const back = document.createElement('button'); back.type = 'button'; back.textContent = '← Back to list';
    back.onclick = () => this.closeRecord(true);
    const title = document.createElement('h2'); title.textContent = selected.title;
    const description = document.createElement('p'); description.textContent = selected.description;
    description.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere';
    const open = document.createElement('button'); open.type = 'button'; open.textContent = 'Open score'; open.className = 'LibraryWindow__primary';
    open.onclick = selected.open;
    selected.summary.textContent = 'Edit details'; selected.details.open = edit;
    this.inspector.replaceChildren(back,title,description,open,...(selected.downloadButton ? [selected.downloadButton] : []),selected.details);
    this.inspector.hidden = false; this.elm.dataset.detailOpen = 'true';
  }

  closeRecord(focus = false) {
    const selected = this.selectedRecord && this.rowViews.get(this.selectedRecord);
    if (selected) {
      selected.details.open = false; selected.summary.textContent = '⋯'; selected.row.dataset.selected = 'false';
      selected.row.append(selected.details);
      if (selected.downloadButton) selected.row.append(selected.downloadButton);
      if (focus) selected.row.querySelector('button')?.focus({preventScroll:true});
    }
    this.selectedRecord = null;
    this.inspector.hidden = true; this.inspector.replaceChildren(); this.elm.dataset.detailOpen = 'false';
  }

  dismissLayer() {
    if (this.transfers.open) { this.transfers.open = false; return true; }
    if (this.addMenu.open) { this.addMenu.open = false; return true; }
    if (this.filters.open) { this.filters.open = false; return true; }
    if (this.selectedRecord) { this.closeRecord(true); return true; }
    return false;
  }

  select() { this.refresh(); requestAnimationFrame(this.resize); }
}
// +skip
export { BookshelfView };
// -skip
