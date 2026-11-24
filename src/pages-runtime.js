// Pages loads its optional resources through the immutable URLs in its manifest.
(() => {
  const urls = window._rostrumAssetURLs_;
  const absolute = path => new URL(path, location.href).href;
  const url = name => absolute(urls[name]);
  const requests = new Map();
  const fonts = {
    Bravura: 'BravuraText.otf.gz', Vercetti: 'Vercetti-Regular.otf.gz',
    'Patrick Hand': 'PatrickHand-Regular.ttf.gz', 'Noto Sans JP': 'NotoSansJP-subset.otf.gz',
  };
  window.fontData = {};

  function once(key, load) {
    if (!requests.has(key)) requests.set(key, Promise.resolve().then(load).catch(error => {
      requests.delete(key);
      throw error;
    }));
    return requests.get(key);
  }

  async function response(path) {
    const result = await fetch(absolute(path));
    if (!result.ok) throw new Error(`Could not load ${path} (${result.status})`);
    return result;
  }

  async function bytes(path) {
    const value = await response(path);
    const body = path.endsWith('.gz') ? new Response(value.body.pipeThrough(new DecompressionStream('gzip'))) : value;
    return new Uint8Array(await body.arrayBuffer());
  }

  function classic(name) {
    return once(name, () => new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url(name);
      script.onload = resolve;
      script.onerror = () => { script.remove(); reject(new Error(`Could not load ${name}`)); };
      document.head.append(script);
    }));
  }

  function font(name) {
    if (!Object.hasOwn(fonts, name)) return;
    return once(name, async () => {
      const content = await bytes(urls[fonts[name]]);
      document.fonts.add(await new FontFace(name, content).load());
      window.fontData[name] = content;
    });
  }

  const registration = () => once('service worker', () =>
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }));
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const status = message => window.dispatchEvent(new CustomEvent('rostrum-offline-status', { detail: message }));
  let preparing;

  function prepareOffline() {
    return preparing ??= (async () => {
      await registration();
      const { active } = await navigator.serviceWorker.ready;
      const channel = new MessageChannel();
      try {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Offline preparation timed out')), 180000);
          channel.port1.onmessage = ({ data }) => {
            if (data.preparing) status('Downloading offline features…');
            else {
              clearTimeout(timer);
              if (data.error) return reject(new Error(data.error));
              if (data.downloaded) status('Ready to use offline');
              resolve();
            }
          };
          active.postMessage('prepare-offline', [channel.port2]);
        });
      } finally { channel.port1.close(); }
    })().finally(() => { preparing = null; });
  }

  async function checkUpdate(worker) {
    await worker.update();
    const candidate = worker.installing || worker.waiting || (worker.active?.state === 'activating' ? worker.active : null);
    if (candidate) await new Promise(resolve => {
      const finish = () => {
        clearTimeout(timer);
        candidate.removeEventListener('statechange', changed);
        resolve();
      };
      const changed = () => {
        if (['activated', 'redundant'].includes(candidate.state)) finish();
      };
      const timer = setTimeout(finish, 45000);
      candidate.addEventListener('statechange', changed);
      changed();
    });
  }

  async function reload() {
    try {
      await checkUpdate(await registration());
    } catch { /* Offline or unavailable server: restart the active app. */ }
    const clean = new URL(location.href);
    clean.searchParams.delete('t');
    if (clean.href !== location.href) history.replaceState(history.state, '', clean);
    location.reload();
  }

  window._rostrumPages_ = {
    url, font, reload, prepareOffline,
    loadCoreFonts: () => Promise.all([font('Bravura'), font('Vercetti')]),
    fontsIn: text => Promise.all(Object.keys(fonts).filter(name => text.includes(name)).map(font)),
    pdfWriter: () => Promise.all([classic('pdf-lib.min.js'), classic('fontkit.umd.min.js')]),
    pdfReader: () => once('PDF reader', async () => {
      window.pdfjsLib = await import(url('pdf.min.mjs'));
      window.pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(url('pdf.worker.min.mjs'), { type: 'module' });
    }),
    scoreResources: () => once('score resources', async () => {
      const entries = await (await response(urls['score-resources.json'])).json();
      return Promise.all(entries.map(async ({ name, url }) => ({ name, bytes: await bytes(url) })));
    }),
    bytes: name => bytes(urls[name]),
    piano: context => once('piano samples', async () => {
      const samples = await (await response(urls['piano-samples.json'])).json();
      return Object.fromEntries(await Promise.all(Object.entries(samples).map(async ([note, path]) =>
        [note, await context.decodeAudioData(await (await response(path)).arrayBuffer())])));
    }),
  };

  if ('serviceWorker' in navigator) {
    const prepare = () => prepareOffline().catch(() => status('Offline download incomplete. Reopen Rostrum online to retry.'));
    window.addEventListener('appinstalled', prepare);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (standalone()) preparing ? preparing.then(prepare, prepare) : prepare();
    });
    window.addEventListener('load', async () => {
      try {
        const worker = await registration();
        if (navigator.serviceWorker.controller) await checkUpdate(worker).catch(() => {});
        if (standalone()) prepare();
      } catch { /* The current cached version still works offline. */ }
    }, { once: true });
  }
})();
