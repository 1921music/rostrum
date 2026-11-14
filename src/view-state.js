// +skip
import { toast } from './common.js';
import { Layout } from './layout.js';
export { DeviceViewState, sharedViewSettings };
// -skip

// Device preferences never enter the library's settings/change log. Explicit PDF
// exports keep their existing embedded settings for backwards compatibility.
function sharedViewSettings(menu) {
  const shared = JSON.parse(JSON.stringify(menu));
  delete shared.layout;
  if (shared.page?.cells) delete shared.page.cells.magnify;
  if (shared.page?.stash) delete shared.page.stash.active;
  const details = shared.score?.cells?.details;
  if (details) for (const key of ['pgFit','quality','bkColorIdx']) delete details[key];
  return shared;
}

class DeviceViewState {
  constructor(menu) {
    this.menu = menu; this.state = null; this.loading = 0; this.writes = Promise.resolve();
    this.journalKey = 'rostrum-device-view-pending';
    this.viewport = {w:innerWidth,h:innerHeight};
    this.defaults = JSON.parse(menu.stashDefaults);
    this.ready = this.load();
  }
  async database(mode, run) {
    const db = this.db || await new Promise((resolve,reject) => {
      const request = indexedDB.open('rostrum-device-view',1);
      request.onupgradeneeded = () => request.result.createObjectStore('settings');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('View settings database is blocked'));
    });
    this.db = db;
    db.onversionchange = () => { db.close(); if (this.db === db) this.db = null; };
    return await new Promise((resolve,reject) => {
        const tx = db.transaction('settings',mode), request = run(tx.objectStore('settings'));
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = tx.onabort = () => reject(tx.error || request.error);
      });
  }
  normalize(raw) {
    if (!raw || raw.version !== 1) return null;
    const number = (value,min,max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
    const choice = (value,options,fallback) => options.includes(value) ? value : fallback;
    const geometry = value => {
      if (!value || !number(value.w,1,100000) || !number(value.h,1,100000) ||
          !/^(?:\d+(?:\.\d*)?|\.\d+)em$/.test(value.fontSize) || !number(parseFloat(value.fontSize),.1,20) ||
          !/^-?\d+(?:\.\d+)?px$/.test(value.left) || !/^-?\d+(?:\.\d+)?px$/.test(value.top) ||
          Math.abs(parseFloat(value.left)) > 100000 || Math.abs(parseFloat(value.top)) > 100000) return null;
      return {left:value.left,top:value.top,fontSize:value.fontSize,w:value.w,h:value.h};
    };
    const state = {version:1,active:choice(raw.active,['book','horizontal','vertical','table'],'book'),layouts:{},display:{},magnify:{},menu:geometry(raw.menu)};
    for (const key of ['book','horizontal','vertical','table']) {
      const fallback = this.defaults.layout.cells[key], source = raw.layouts?.[key] || {};
      const value = state.layouts[key] = {fit:choice(source.fit,['Auto','Width','Height',...(key === 'table' ? [] : ['None'])],fallback.fit),
        pnShow:choice(source.pnShow,['On','Off'],fallback.pnShow),pz:geometry(source.pz)};
      const ranges = key === 'table' ? {pages:[1,50],horizontalGap:[-100,100],verticalGap:[-100,100]} :
        key === 'book' ? {pace:[0,1500]} : {gap:[0,100],pgShow:[1,8],pgSnap:[-4,8],pace:[0,10000]};
      for (const [name,[min,max]] of Object.entries(ranges)) {
        const valid = number(source[name],min,max) && (!['pgShow','pgSnap','pages'].includes(name) || Number.isInteger(source[name]));
        value[name] = valid ? source[name] : fallback[name];
      }
      if (key !== 'table') value.pnBand = {
        axis:choice(source.pnBand?.axis,['L-R','T-B'],fallback.pnBand.axis),
        place:choice(source.pnBand?.place,['Inset','Over'],fallback.pnBand.place)};
    }
    const display = this.defaults.score.cells.details, source = raw.display || {};
    state.display = {pgFit:choice(source.pgFit,['Center','Expand'],display.pgFit),
      quality:number(source.quality,.5,6) ? source.quality : display.quality,
      bkColorIdx:Number.isInteger(source.bkColorIdx) && number(source.bkColorIdx,0,63) ? source.bkColorIdx : display.bkColorIdx};
    state.magnify.zoom = number(raw.magnify?.zoom,.25,5) ? raw.magnify.zoom : 2;
    return state;
  }
  async load() {
    try { this.state = this.normalize(await this.database('readonly',s => s.get('current'))); }
    catch (error) { console.warn('Could not load device view settings',error); }
    // A navigation can abort even an already-started IndexedDB transaction.
    // Recover the last uncommitted snapshot from a small synchronous journal.
    let pending;
    try { pending = this.normalize(JSON.parse(localStorage.getItem(this.journalKey) || 'null')); }
    catch { /* IndexedDB still works if localStorage is unavailable. */ }
    if (pending) this.state = pending;
    this.apply();
    // Final interactions commit on the next task, after click/change handlers;
    // continuous slider/wheel input is coalesced. Keep the DB open so pagehide
    // can start a final transaction without another asynchronous open request.
    for (const event of ['pointerup','keyup','change']) window.addEventListener(event,()=>this.schedule(0),{capture:true,passive:true});
    for (const event of ['input','wheel']) window.addEventListener(event,()=>this.schedule(),{capture:true,passive:true});
    window.addEventListener('resize',() => {
      this.checkViewport();
      this.schedule();
    });
    document.addEventListener('visibilitychange',() => { if (document.hidden) this.save(); });
    window.addEventListener('pagehide',() => this.save());
    if (pending) this.save();
  }
  apply(score) {
    const state = this.state;
    if (!state) return false;
    const rings = this.menu.rings;
    rings.layout.stash.active = state.active;
    for (const key of Object.keys(state.layouts)) Object.assign(rings.layout.cells[key].stash,JSON.parse(JSON.stringify(state.layouts[key])));
    Object.assign(rings.score.cells.details.stash,state.display);
    Object.assign(rings.page.cells.magnify.stash,state.magnify);
    this.menu.magnifier.zoom = state.magnify.zoom;
    if (score) score.quality = state.display.quality;
    return true;
  }
  checkViewport() {
    if (this.viewport.w === innerWidth && this.viewport.h === innerHeight) return;
    this.viewport = {w:innerWidth,h:innerHeight};
    // Resize events/rebuilds may not arrive before pagehide. Old absolute
    // geometry must never be stamped with the new viewport's dimensions.
    const layout = Layout.activeLayout;
    if (layout?.cell?.stash) {
      layout.cell.stash.pz = null;
      layout.elm.classList.remove('pz-set');
    }
    this.menu.elm.classList.remove('pz-set');
  }
  capture() {
    this.checkViewport();
    const layout = Layout.activeLayout;
    if (layout && layout.score === window._score_ && !layout.score.disposed && !layout.destroyed &&
        layout.elm.classList.contains('pz-set')) {
      // Read final inline values: computed styles may be midway through a transition.
      const elm = layout.elm;
      layout.cell.stash.pz = {left:elm.style.left,top:elm.style.top,fontSize:elm.style.fontSize,w:innerWidth,h:innerHeight};
    }
    const rings = this.menu.rings;
    let menu = this.state?.menu || null;
    if (window._score_ && !window._score_.disposed) {
      const elm = this.menu.elm;
      menu = elm.classList.contains('pz-set') ?
        {left:elm.style.left,top:elm.style.top,fontSize:elm.style.fontSize,w:innerWidth,h:innerHeight} : null;
    }
    return this.normalize({version:1,active:rings.layout.stash.active,
      layouts:Object.fromEntries(Object.entries(rings.layout.cells).filter(([key])=>['book','horizontal','vertical','table'].includes(key)).map(([key,cell])=>[key,cell.stash])),
      display:rings.score.cells.details.stash,magnify:rings.page.cells.magnify.stash,menu});
  }
  schedule(delay = 100) {
    if (this.loading) return;
    clearTimeout(this.timer); this.timer = setTimeout(()=>this.save(),delay);
  }
  save() {
    clearTimeout(this.timer);
    if (this.loading) return this.writes;
    this.state = this.capture();
    const snapshot = this.state, json = JSON.stringify(snapshot);
    if (json === this.lastQueued) return this.writes;
    this.lastQueued = json;
    let journalSaved = false;
    try { localStorage.setItem(this.journalKey,json); journalSaved = true; } catch { /* Use IndexedDB alone. */ }
    // Start now, including on pagehide. IndexedDB orders these transactions;
    // waiting for a previous promise would strand the last write on navigation.
    const write = this.database('readwrite',s=>s.put(snapshot,'current'))
      .then(() => {
        this.lastWritten = json;
        try { if (localStorage.getItem(this.journalKey) === json) localStorage.removeItem(this.journalKey); }
        catch { /* The IndexedDB transaction has committed. */ }
      })
      .catch(error => {
        if (this.lastQueued === json) this.lastQueued = null;
        console.warn('Could not save device view settings',error);
        if (!journalSaved && !this.warned) { this.warned = true; toast('View settings could not be saved on this device.'); }
      });
    this.writes = Promise.all([this.writes,write]).then(()=>{});
    return this.writes;
  }
  async beginLoad() {
    await this.ready;
    if (!this.loading && window._score_ && !window._score_.disposed) await this.save();
    clearTimeout(this.timer); this.loading++;
  }
  endLoad() { this.loading = Math.max(0,this.loading-1); if (!this.loading) this.schedule(); }
  restoreMenu() {
    const value = this.state?.menu;
    if (!value || value.w !== innerWidth || value.h !== innerHeight) return;
    this.menu.elm.style.fontSize = value.fontSize;
    this.menu.elm.classList.add('pz-set');
    if (value.w === innerWidth && value.h === innerHeight) {
      this.menu.elm.style.left = value.left; this.menu.elm.style.top = value.top;
    }
    this.menu.constrain();
  }
}
