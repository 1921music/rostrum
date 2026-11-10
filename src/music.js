// Score-engine integration. The editor remains Fabric; MSCZ contains standard
// SVG Image elements plus versioned metadata for lossless editor restoration.
// +skip
export { MusicDocument, isMusicScore, ROSTRUM_SVG_NS };
// -skip

const ROSTRUM_SVG_NS = "https://1921music.github.io/rostrum/ns";
const isMusicScore = name => /\.(mscz|mxl|musicxml|xml)$/i.test(name || '');
let musicEnginePromise;
let musicSvgSequence = 0;
async function musicEngine() {
  return musicEnginePromise ??= (async () => {
    const payload = globalThis._scoreEngineAssets_;
    if (!payload) throw new Error('Score engine assets are missing. Build the score engine first.');
    const decode = async s => new Uint8Array(await new Response(new Blob([
      Uint8Array.from(atob(s), c => c.charCodeAt(0))
    ]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    const extension = !!globalThis.chrome?.runtime?.id;
    let api, Playback, PlaybackView;
    if (extension) {
      api = await import(new URL('./score-engine/mscz.js', location.href).href);
      ({ Playback, PlaybackView } = await import(new URL('./score-engine/playback.js', location.href).href));
    } else {
      const moduleBytes = await decode(payload.module);
      let binary = '';
      for (let i = 0; i < moduleBytes.length; i += 32768)
        binary += String.fromCharCode(...moduleBytes.subarray(i, i + 32768));
      api = await import('data:text/javascript;base64,' + btoa(binary));
      Playback = api.Playback; PlaybackView = api.PlaybackView;
    }
    const resources = await Promise.all(payload.resources.map(async r => ({ name: r.name, bytes: await decode(r.data) })));
    const engine = await api.load({ wasmBinary: await decode(payload.wasm), resources,
      playbackAssets: { wasm: await decode(payload.playback.wasm),
        worker: extension ? null : new TextDecoder().decode(await decode(payload.playback.worker)),
        workerURL: extension ? new URL('./score-engine/playback-worker.js', location.href).href : null } });
    return { engine, Playback, PlaybackView };
  })().catch(error => { musicEnginePromise = null; throw error; });
}

class MusicDocument {
  static async open(bytes, name) {
    const { engine, Playback, PlaybackView } = await musicEngine();
    const document = new MusicDocument();
    document.native = engine.open(new Uint8Array(bytes), name);
    document.name = name;
    document.player = new Playback(engine, 'EAS', () => globalThis.document.dispatchEvent(new Event('musicPlayback')));
    document.autoScroll = true;
    document.view = new PlaybackView(document.player, {
      getPages: () => document.owner?.pgs?.map(pg => pg.musicSvg).filter(Boolean) || [],
      onSystem: (system, { seeking = false } = {}) => {
        if (document.autoScroll || seeking) document.follow(system, seeking);
      }
    });
    try {
      document.refresh();
      try { document.settings = JSON.parse(document.info.settings || '{}'); } catch { document.settings = {}; }
      document.settings = document.settings?.version === 1 ? document.settings : {};
      document.originalImages = document.info.images;
      document.transpose = 0;
      return document;
    } catch (error) { document.native.close(); throw error; }
  }
  follow(system, force) {
    this.pendingFollow = { system, force };
    if (this.following) return;
    this.following = true;
    (async () => {
      try {
        while (this.pendingFollow) {
          const next = this.pendingFollow; this.pendingFollow = null;
          await this.owner?.followMusic(next.system, next.force);
        }
      } catch (error) { console.error(error); }
      finally { this.following = false; }
    })();
  }
  refresh() { this.info = this.native.rostrumInfo(); this.numPages = this.info.pages.length; this.svgs = new Map(); }
  async getPage(pn) {
    const doc = this, page = this.info.pages[pn - 1];
    if (!page) throw new Error('Score page is out of range');
    return {
      getViewport: ({ scale }) => ({ width: page.width * scale, height: page.height * scale }),
      render({ canvasContext, viewport }) {
        let cancelled = false;
        const task = { cancel: () => { cancelled = true; } };
        task.promise = (async () => {
          const image = await doc.pageImage(pn);
          if (cancelled) throw new DOMException('Render cancelled', 'AbortError');
          canvasContext.fillStyle = '#ffffff';
          canvasContext.fillRect(0, 0, viewport.width, viewport.height);
          canvasContext.drawImage(image, 0, 0, viewport.width, viewport.height);
        })();
        return task;
      }
    };
  }
  async pageImage(pn) {
    if (!this.svgs.has(pn)) this.svgs.set(pn, (async () => {
      const element = this.pageSvgElement(pn);
      let css = this.native.mscz.textFonts?.svgFontCss(element.outerHTML) || '';
      // Rostrum's editor fonts may also be explicitly named by a score.
      for (const [family, resource] of Object.entries(globalThis.fontData || {})) {
        if (!element.outerHTML.includes(family)) continue;
        const bytes = typeof resource === 'function' ? resource() : resource;
        let binary = '';
        for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
        css += `@font-face{font-family:${JSON.stringify(family)};src:url(data:font/otf;base64,${btoa(binary)})}`;
      }
      const style = document.createElementNS("http://www.w3.org/2000/svg", 'style');
      style.textContent = css; element.prepend(style);
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(element)], { type: 'image/svg+xml' }));
      try {
        const image = new Image(); image.src = url; await image.decode(); return image;
      } finally { URL.revokeObjectURL(url); }
    })());
    return this.svgs.get(pn);
  }
  pageSvgElement(pn) {
    const xml = new DOMParser().parseFromString(this.native.pageSvg(pn - 1, { dpi: 72, fonts: 0 }), 'image/svg+xml');
    const svg = document.importNode(xml.documentElement, true);
    const prefix = `rostrum-page-${musicSvgSequence++}-`;
    const ids = new Map([...svg.querySelectorAll('[id]')].map(node => [node.id, prefix + node.id]));
    for (const node of [svg, ...svg.querySelectorAll('*')]) {
      for (const attr of [...node.attributes]) {
        if (attr.name === 'id') attr.value = ids.get(attr.value) || attr.value;
        else if (attr.localName === 'href' && attr.value.startsWith('#')) attr.value = '#' + (ids.get(attr.value.slice(1)) || attr.value.slice(1));
        else attr.value = attr.value.replace(/url\(#([^)]*)\)/g, (match, id) => ids.has(id) ? `url(#${ids.get(id)})` : match);
      }
      const family = node.getAttribute('font-family');
      const backend = this.native.mscz.textFonts;
      if (family && backend && !family.includes(backend.prefix)) node.setAttribute('font-family', backend.family(family));
    }
    const page = this.info.pages[pn - 1];
    svg.dataset.playbackPage = pn - 1;
    svg.setAttribute('width', page.width); svg.setAttribute('height', page.height);
    return svg;
  }
  releasePage(pn) { this.svgs.delete(pn); }
  nearest(page, x, y) {
    const anchors = this.info.anchors.filter(a => a.page === page);
    if (!anchors.length) throw new Error('This page has no musical anchor for annotations.');
    // Select the staff/system vertically before searching its timeline.
    const staff = anchors.reduce((best, a) => Math.abs(a.y + 2 * a.spY - y) < Math.abs(best.y + 2 * best.spY - y) ? a : best);
    return anchors.filter(a => a.staff === staff.staff && a.system === staff.system)
      .reduce((best, a) => Math.abs(a.x - x) < Math.abs(best.x - x) ? a : best);
  }
  anchor(key, staff) { return this.info.anchors.find(a => a.key === key && a.staff === staff); }
  async destroy() { this.playbackPanel?.close(); this.view.destroy(); this.player.stop(); await this.player.context?.close(); this.native.close(); this.svgs.clear(); }
}
