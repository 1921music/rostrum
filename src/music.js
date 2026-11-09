// Score-engine integration. The editor remains Fabric; MSCZ contains standard
// SVG Image elements plus versioned metadata for lossless editor restoration.
// +skip
export { MusicDocument, isMusicScore, ROSTRUM_SVG_NS };
// -skip

const ROSTRUM_SVG_NS = "https://1921music.github.io/rostrum/ns";
const isMusicScore = name => /\.(mscz|mxl|musicxml|xml)$/i.test(name || '');
let musicEnginePromise;
async function musicEngine() {
  return musicEnginePromise ??= (async () => {
    const payload = globalThis._scoreEngineAssets_;
    if (!payload) throw new Error('Score engine assets are missing. Build the score engine first.');
    const decode = async s => new Uint8Array(await new Response(new Blob([
      Uint8Array.from(atob(s), c => c.charCodeAt(0))
    ]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    const extension = !!globalThis.chrome?.runtime?.id;
    let api, Playback;
    if (extension) {
      api = await import(new URL('./score-engine/mscz.js', location.href).href);
      ({ Playback } = await import(new URL('./score-engine/playback.js', location.href).href));
    } else {
      const moduleBytes = await decode(payload.module);
      let binary = '';
      for (let i = 0; i < moduleBytes.length; i += 32768)
        binary += String.fromCharCode(...moduleBytes.subarray(i, i + 32768));
      api = await import('data:text/javascript;base64,' + btoa(binary));
      Playback = api.Playback;
    }
    const resources = await Promise.all(payload.resources.map(async r => ({ name: r.name, bytes: await decode(r.data) })));
    const engine = await api.load({ wasmBinary: await decode(payload.wasm), resources,
      playbackAssets: { wasm: await decode(payload.playback.wasm),
        worker: extension ? null : new TextDecoder().decode(await decode(payload.playback.worker)),
        workerURL: extension ? new URL('./score-engine/playback-worker.js', location.href).href : null } });
    return { engine, Playback };
  })().catch(error => { musicEnginePromise = null; throw error; });
}

class MusicDocument {
  static async open(bytes, name) {
    const { engine, Playback } = await musicEngine();
    const document = new MusicDocument();
    document.native = engine.open(new Uint8Array(bytes), name);
    document.name = name;
    document.player = new Playback(engine, 'EAS', () => globalThis.document.dispatchEvent(new Event('musicPlayback')));
    try {
      document.refresh();
      try { document.settings = JSON.parse(document.info.settings || '{}'); } catch { document.settings = {}; }
      document.settings = document.settings?.version === 1 ? document.settings : {};
      document.originalImages = document.info.images;
      document.transpose = 0;
      return document;
    } catch (error) { document.native.close(); throw error; }
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
      const svg = this.native.pageSvg(pn - 1, { dpi: 72 });
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      try {
        const image = new Image(); image.src = url; await image.decode(); return image;
      } finally { URL.revokeObjectURL(url); }
    })());
    return this.svgs.get(pn);
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
  async destroy() { this.player.stop(); await this.player.context?.close(); this.native.close(); this.svgs.clear(); }
}
