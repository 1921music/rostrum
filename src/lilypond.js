// +skip
export { convertLilyPond, isLilyPond };
// -skip

const isLilyPond = name => /\.ly$/i.test(name || '');
let lilyPondToolsRequest;

async function lilyPondTools() {
  return lilyPondToolsRequest ??= (async () => {
    const pages = globalThis._rostrumPages_;
    if (pages) {
      const [api, wasm] = await Promise.all([
        import(pages.url('lilypond.mjs')), pages.bytes('lilypond.wasm.gz'),
      ]);
      return api.loadLilyPond(wasm);
    }
    const payload = globalThis._scoreEngineAssets_?.lilypond;
    if (!payload) throw new Error('LilyPond converter assets are missing.');
    const decode = async data => {
      const compressed = Uint8Array.from(atob(data), character => character.charCodeAt(0));
      return new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    };
    const module = globalThis.chrome?.runtime?.id
      ? import(new URL('./score-engine/lilypond.mjs', location.href).href)
      : decode(payload.module).then(buffer => import('data:text/javascript;base64,' +
        btoa(Array.from(new Uint8Array(buffer), byte => String.fromCharCode(byte)).join(''))));
    const [api, wasm] = await Promise.all([module, decode(payload.wasm)]);
    return api.loadLilyPond(wasm);
  })().catch(error => { lilyPondToolsRequest = null; throw error; });
}

async function convertLilyPond(input, { template = false } = {}) {
  const [tools, bytes] = await Promise.all([lilyPondTools(), input]);
  try {
    const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const lilypond = template ? await tools.expandTemplate(source) : source;
    return await tools.toMusicXml(lilypond, { measureNumbers: 'system' });
  } catch (error) {
    if (error instanceof WebAssembly.RuntimeError) lilyPondToolsRequest = null;
    throw error;
  }
}
