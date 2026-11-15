// +skip
import { FileSrc, pathJoin } from './file.js';
import { css, iconSvg } from './common.js';
export { CloudFolderPicker };
// -skip

css('CloudFolderPicker', `
  :root dialog.CloudFolderPicker { width:min(640px,calc(100vw - 24px)); height:min(700px,calc(100dvh - 24px)); max-height:calc(100dvh - 24px); box-sizing:border-box; padding:0; border:1px solid var(--ui-line); border-radius:16px; background:var(--ui-bg); color:var(--ui-text); font:15px/1.5 var(--ui-font); box-shadow:0 12px 44px #172b4d30; touch-action:auto; }
  :root dialog.CloudFolderPicker[open] { display:flex; flex-direction:column; }
  .CloudFolderPicker *, .CloudFolderPicker *::before, .CloudFolderPicker *::after { box-sizing:border-box; }
  .CloudFolderPicker [hidden] { display:none !important; }
  .CloudFolderPicker header { display:flex; align-items:center; gap:16px; padding:16px 20px; border-bottom:1px solid var(--ui-line); flex:none; }
  .CloudFolderPicker h2 { font-size:20px; font-weight:600; margin:0; flex:1; }
  :root dialog.CloudFolderPicker .CloudFolderPicker__close { width:40px; height:40px; padding:0; border:0; background:transparent; }
  .CloudFolderPicker__toolbar { display:flex; align-items:center; gap:8px; padding:12px 20px; flex:none; flex-wrap:wrap; }
  .CloudFolderPicker__path { display:flex; gap:4px; align-items:center; overflow-x:auto; padding:0 20px 12px; flex:none; }
  :root dialog.CloudFolderPicker .CloudFolderPicker__path button { border:0; white-space:nowrap; flex:none; }
  .CloudFolderPicker__notice { padding:0 20px; flex:none; }
  .CloudFolderPicker__notice p { margin:4px 0 12px; }
  .CloudFolderPicker__error { color:var(--ui-text); background:var(--ui-selected); padding:12px; border-radius:8px; margin-bottom:12px; }
  .CloudFolderPicker__create { display:flex; gap:8px; align-items:end; flex-wrap:wrap; padding:0 20px 12px; }
  .CloudFolderPicker__create label { flex:1 1 180px; font-size:13px; }
  .CloudFolderPicker__create input { display:block; width:100%; margin:4px 0 0; font-size:15px; }
  .CloudFolderPicker__list { flex:1; min-height:80px; overflow:auto; overscroll-behavior:contain; touch-action:pan-y; padding:0 12px; border-top:1px solid var(--ui-line); }
  :root dialog.CloudFolderPicker .CloudFolderPicker__folder { display:flex; width:100%; gap:12px; align-items:center; text-align:left; border:0; border-bottom:1px solid var(--ui-line); border-radius:0; padding:14px 12px; min-height:52px; }
  .CloudFolderPicker__folder span { overflow-wrap:anywhere; }
  .CloudFolderPicker__folder svg { flex:none; }
  .CloudFolderPicker__empty { color:var(--ui-muted); padding:24px 12px; }
  .CloudFolderPicker footer { flex:none; border-top:1px solid var(--ui-line); padding:16px 20px; }
  .CloudFolderPicker__selected { display:block; overflow-wrap:anywhere; font-weight:600; margin:6px 0 16px; }
  .CloudFolderPicker__actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; }
  :root dialog.CloudFolderPicker button[data-confirm] { background:var(--ui-primary); color:var(--ui-on-primary); border-color:transparent; }
  .CloudFolderPicker svg { vertical-align:middle; pointer-events:none; }
  @media(max-width:480px) { .CloudFolderPicker header, .CloudFolderPicker footer { padding:12px 16px; } .CloudFolderPicker__toolbar { padding:12px 16px; } .CloudFolderPicker h2 { font-size:18px; } }
`);

// Uses the same authenticated FileSrc adapters and path encoding as File → Open.
// Folder browsing never changes the sync destination; the caller applies the result.
class CloudFolderPicker {
  constructor(service, initialPath = '', {files = false} = {}) {
    this.pickFiles = files;
    this.service = service; this.source = FileSrc.get(service);
    const relative = initialPath.replace(/^\/+|\/+$/g,'');
    this.path = relative ? '/' + relative : ''; this.valid = false; this.epoch = 0;
    this.elm = document.createElement('dialog'); this.elm.className = 'CloudFolderPicker';
    this.elm.setAttribute('aria-label',files ? 'Choose cloud score' : 'Choose library sync folder');
    this.elm.innerHTML = `<header><h2 tabindex="-1"></h2><button type="button" class="CloudFolderPicker__close" aria-label="Close folder picker">${iconSvg('Close',{size:'20px'})}</button></header>
      <div class="CloudFolderPicker__toolbar"><button type="button" data-up>Up</button><button type="button" data-refresh>Refresh</button><button type="button" data-new>New folder</button></div>
      <nav class="CloudFolderPicker__path" aria-label="Cloud folder path"></nav>
      <div class="CloudFolderPicker__notice"><p>Choose a dedicated folder for this library.</p><p data-status role="status"></p><div class="CloudFolderPicker__error" role="alert" hidden><p data-error></p><button type="button" data-retry>Retry</button></div></div>
      <form class="CloudFolderPicker__create" hidden><label>Folder name<input aria-label="New cloud folder name" autocomplete="off" required></label><button type="submit">Create folder</button><button type="button" data-cancel-create>Cancel creation</button></form>
      <div class="CloudFolderPicker__list" role="group" aria-label="Cloud folders" tabindex="-1"></div>
      <footer>Current folder<output class="CloudFolderPicker__selected" aria-label="Current cloud folder" translate="no"></output><div class="CloudFolderPicker__actions"><button type="button" data-cancel>Cancel</button><button type="button" data-confirm>Use this folder</button></div></footer>`;
    const find = selector => this.elm.querySelector(selector);
    this.title = find('h2'); this.title.textContent = (files ? 'Choose score — ' : 'Choose sync folder — ') + service;
    if (files) {
      find('.CloudFolderPicker__notice > p').textContent = 'Open a folder, then choose a score to import into your library.';
      find('[data-confirm]').hidden = true; find('[data-new]').hidden = true;
    }
    this.up = find('[data-up]'); this.refresh = find('[data-refresh]'); this.newFolder = find('[data-new]');
    this.crumbs = find('nav'); this.status = find('[data-status]'); this.error = find('[role=alert]'); this.errorText = find('[data-error]');
    this.retry = find('[data-retry]'); this.form = find('form'); this.name = find('input'); this.list = find('[aria-label="Cloud folders"]'); this.current = find('output'); this.confirm = find('[data-confirm]');
    find('[data-cancel]').onclick = find('.CloudFolderPicker__close').onclick = () => this.close();
    this.up.onclick = () => this.navigate(this.path.slice(0,this.path.lastIndexOf('/')));
    this.refresh.onclick = () => this.navigate(this.path);
    this.retry.onclick = () => this.navigate(this.failedPath);
    this.newFolder.onclick = () => { this.form.hidden = false; this.name.value = ''; this.name.focus(); };
    find('[data-cancel-create]').onclick = () => { this.form.hidden = true; this.newFolder.focus(); };
    this.form.onsubmit = event => { event.preventDefault(); this.createFolder(); };
    this.confirm.onclick = () => { if (this.valid && !this.busy) { this.result = this.path; this.close(); } };
    this.elm.addEventListener('pointerdown',e => { e.taken = true; },{capture:true});
    this.renderPath();
  }
  renderPath() {
    this.crumbs.replaceChildren();
    const parts = this.path ? this.path.slice(1).split('/') : [];
    let path = '';
    for (const [index,name] of [this.service,...parts].entries()) {
      if (index) path += '/' + name;
      const destination = path, button = document.createElement('button'); button.type = 'button';
      button.textContent = name; button.translate = false;
      if (index === parts.length) button.setAttribute('aria-current','location');
      button.onclick = () => this.navigate(destination); this.crumbs.append(button);
      if (index < parts.length) { const separator = document.createElement('span'); separator.textContent = '/'; separator.setAttribute('aria-hidden','true'); this.crumbs.append(separator); }
    }
    this.current.textContent = this.service + (this.path || ' /');
  }
  setBusy(busy) {
    this.busy = busy; this.list.setAttribute('aria-busy',String(busy));
    if (busy) this.title.focus({preventScroll:true});
    for (const button of [...this.crumbs.querySelectorAll('button'),...this.list.querySelectorAll('button'),...this.form.querySelectorAll('button')]) button.disabled = busy;
    this.name.disabled = busy;
    this.up.disabled = busy || !this.path; this.refresh.disabled = this.newFolder.disabled = busy;
    this.confirm.disabled = busy || !this.valid;
  }
  showError(error, path) {
    this.errorText.textContent = error?.message || 'Could not open this cloud folder.';
    this.failedPath = path; this.error.hidden = false;
  }
  async navigate(path) {
    const epoch = ++this.epoch;
    if (path !== this.path) this.form.hidden = true;
    this.error.hidden = true; this.retry.hidden = false; this.status.textContent = 'Loading folders…'; this.setBusy(true);
    try {
      await this.source.auth();
      if (!this.elm.open || epoch !== this.epoch) return;
      const directory = await this.source.getDir(path,true);
      if (!this.elm.open || epoch !== this.epoch) return;
      this.path = path; this.valid = true; this.renderPath(); this.list.replaceChildren();
      const names = Object.keys(directory.dirs || {}).filter(name => name && name !== '.' && name !== '..').sort((a,b) => a.localeCompare(b));
      for (const name of names) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'CloudFolderPicker__folder';
        button.innerHTML = iconSvg('Folder',{size:'22px'}); const label = document.createElement('span'); label.textContent = name; label.translate = false; button.append(label);
        button.onclick = () => this.navigate(pathJoin(path,name)); this.list.append(button);
      }
      const files = this.pickFiles ? Object.keys(directory.files || {}).filter(name => /\.(pdf|mscz|mxl|musicxml|xml)$/i.test(name)).sort((a,b) => a.localeCompare(b)) : [];
      for (const name of files) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'CloudFolderPicker__folder';
        button.innerHTML = iconSvg('File',{size:'22px'}); const label = document.createElement('span'); label.textContent = name; label.translate = false; button.append(label);
        button.onclick = () => { this.result = {source:this.service,path,name}; this.close(); }; this.list.append(button);
      }
      if (!names.length && !files.length) { const empty = document.createElement('p'); empty.className = 'CloudFolderPicker__empty'; empty.textContent = this.pickFiles ? 'No scores or subfolders in this folder.' : 'No subfolders in this folder.'; this.list.append(empty); }
      this.status.textContent = ''; this.list.focus({preventScroll:true});
    } catch (error) {
      if (this.elm.open && epoch === this.epoch) { this.status.textContent = ''; this.showError(error,path); }
    } finally {
      if (this.elm.open && epoch === this.epoch) this.setBusy(false);
    }
  }
  async createFolder() {
    if (this.busy) return;
    const name = this.name.value.trim();
    if (!name || name === '.' || name === '..' || name.includes('\0')) { this.showError(new Error('Enter a valid folder name.'),this.path); this.retry.hidden = true; return; }
    this.error.hidden = true; this.retry.hidden = false; this.setBusy(true);
    const epoch = ++this.epoch, parent = this.path;
    this.status.textContent = 'Creating folder…';
    try {
      await this.source.putDir(parent,name);
      if (!this.elm.open || epoch !== this.epoch) return;
      this.form.hidden = true; await this.navigate(pathJoin(parent,name));
    } catch (error) {
      if (this.elm.open && epoch === this.epoch) { this.status.textContent = ''; this.showError(error,parent); this.retry.hidden = true; this.setBusy(false); }
    }
  }
  close() { if (this.elm.open) this.elm.close(); }
  show() {
    document.body.append(this.elm);
    const closed = new Promise(resolve => this.elm.addEventListener('close',() => {
      ++this.epoch; this.elm.remove(); resolve(this.result ?? null);
    },{once:true}));
    this.elm.showModal(); this.title.focus(); this.navigate(this.path);
    return closed;
  }
}
