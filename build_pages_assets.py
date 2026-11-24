"""Write independently cacheable assets for the static-host build."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import re


def digest(data):
    return hashlib.sha256(data).hexdigest()[:20]


class PagesAssets:
    external = {
        'build/font.js', 'build/sample.js', 'lib/fabric.min.js',
        'build/browser-fs-access.js', 'lib/pdf.min.mjs', 'lib/pdf.worker.min.mjs',
        'lib/pdf-lib.min.js', 'lib/fontkit.umd.min.js', 'lib/score-engine-data.js',
        'build/bookshelf-runtime.js', 'build/bookshelf-host.js',
    }

    def __init__(self, directory):
        self.directory = Path(directory)
        self.modules = self.directory / 'assets' / 'modules'
        self.modules.mkdir(parents=True)
        self.urls = {}
        self.core = []

    def add(self, name, data, *, core=False):
        if isinstance(data, str):
            data = data.encode()
        filename = Path(name)
        path = self.modules / f'{filename.stem}.{digest(data)}{filename.suffix}'
        path.write_bytes(data)
        url = './' + path.relative_to(self.directory).as_posix()
        self.urls[name] = url
        if core:
            self.core.append(url)
        return url

    def copy(self, source, *, core=False):
        path = Path(source)
        return self.add(path.name, path.read_bytes(), core=core)

    def score(self):
        source = Path('lib/score-engine-data.js').read_text(encoding='utf-8')
        payload, _ = json.JSONDecoder().raw_decode(source.split('globalThis._scoreEngineAssets_ = ', 1)[1])

        def emit(name, module, replacements):
            source = Path('lib/score-engine', module).read_text(encoding='utf-8')
            for old, new in replacements.items():
                if source.count(old) != 1:
                    raise ValueError(f'{module}: expected one reference to {old}')
                source = source.replace(old, new)
            return self.add(name, source)

        engine = self.copy('lib/score-engine/mscz-engine.js')
        fonts = self.copy('lib/score-engine/text-fonts.js')
        emit('mscz.js', 'mscz.js', {
            './mscz-engine.js': './' + Path(engine).name,
            './text-fonts.js': './' + Path(fonts).name,
        })
        self.add('mscz-engine.wasm', gzip.decompress(base64.b64decode(payload['wasm'])))
        synth = self.copy('lib/score-engine/mscz-synth.js')
        emit('playback-worker.js', 'playback-worker.js', {
            './mscz-synth.js': './' + Path(synth).name,
        })
        emit('playback.js', 'playback.js', {
            "await bytes('mscz-synth.wasm')": "await bytes(assets?.wasmURL || 'mscz-synth.wasm')",
        })
        self.add('mscz-synth.wasm', gzip.decompress(base64.b64decode(payload['playback']['wasm'])))
        resources = []
        for index, item in enumerate(payload['resources']):
            name = f'score-{index:02d}-{Path(item["name"]).name}'
            url = self.add(name + '.gz', base64.b64decode(item['data']))
            resources.append({'name': item['name'], 'url': url})
        self.add('score-resources.json', json.dumps(resources, separators=(',', ':')))

    def split(self, html):
        self.score()
        for source in ('lib/pdf.min.mjs', 'lib/pdf.worker.min.mjs', 'lib/pdf-lib.min.js', 'lib/fontkit.umd.min.js'):
            self.copy(source)
        sqlite = self.copy('build/sqlite3.wasm')
        worker = Path('build/bookshelf-worker.js').read_text(encoding='utf-8')
        self.add('bookshelf-worker.js', worker.replace('"sqlite3.wasm"', json.dumps(Path(sqlite).name)))
        # The small host reads saved preferences without starting the SQLite worker.
        host = self.copy('build/bookshelf-host.js', core=True)
        fabric = self.copy('lib/fabric.min.js', core=True)
        browser_fs = self.copy('build/browser-fs-access.js', core=True)
        for source, core in (('build/BravuraText.otf', True), ('lib/Vercetti-Regular.otf', True),
                             ('lib/PatrickHand-Regular.ttf', False), ('build/NotoSansJP-subset.otf', False)):
            path = Path(source)
            self.add(path.name + '.gz', gzip.compress(path.read_bytes(), mtime=0), core=core)
        samples = {}
        source = Path('build/sample.js').read_text(encoding='utf-8')
        for note, payload in re.findall(r'(\d+):atob\("([A-Za-z0-9+/=]+)"\)', source):
            samples[note] = self.add(f'piano-{note}.mp3', base64.b64decode(payload))
        if not samples:
            raise ValueError('No piano samples found in build/sample.js')
        self.add('piano-samples.json', json.dumps(samples, separators=(',', ':')))

        app = re.search(r'    <script type="module">\s*(// #inclusion src/main.js.*?</script>)', html, re.S)
        if not app:
            raise ValueError('Packaged application script not found')
        script = app[1].removesuffix('</script>')
        stamps = re.findall(r'window\._rostrum(?:Build|Commit)_\s*=\s*"[^"]+"\s*;', script)
        if len(stamps) != 2:
            raise ValueError('Packaged build stamps not found')
        for stamp in stamps:
            script = script.replace(stamp, '')
        app_url = self.add('app.js', 'await window._rostrumPages_.loadCoreFonts();\n' + script +
                           '\nwindow.addEventListener("rostrum-offline-status", event => toast(event.detail));\n', core=True)
        runtime = self.copy('src/pages-runtime.js', core=True)
        manifest = self.add('asset-manifest.js', 'window._rostrumAssetURLs_ = ' + json.dumps(self.urls, separators=(',', ':')) + ';\n', core=True)
        scripts = [f'<script src="{url}"></script>' for url in (manifest, runtime, fabric, browser_fs, host)]
        scripts.append('<script>' + ''.join(stamps) + '</script>')
        scripts.append(f'<script type="module" src="{app_url}"></script>')
        html = html[:app.start()] + '\n'.join(scripts) + html[app.end():]
        html, count = re.subn(r'    <script>\n      // PWA resources.*?    </script>\n', '', html, count=1, flags=re.S)
        if count != 1:
            raise ValueError('Standalone service worker registration script not found')
        return html.replace('data-href="manifest.webmanifest"', 'href="manifest.webmanifest"')

    def worker(self, guide):
        # Aliases stay available at their documented paths. Version their cache
        # keys so unchanged assets can be reused across worker versions.
        aliases = {}
        for name in ('manifest.webmanifest', 'icon192.png', 'icon512.png', 'podauth.html', *guide):
            path = name.removeprefix('./')
            file = self.directory / path
            if file.is_file():
                aliases['./' + path] = f'./{path}?v={digest(file.read_bytes())}'
        entry = self.add('index.html', (self.directory / 'index.html').read_bytes(), core=True)
        core = self.core + [url for name, url in aliases.items() if name in {
            './manifest.webmanifest', './icon192.png', './icon512.png', './podauth.html'}]
        offline = list(dict.fromkeys([*self.urls.values(), *aliases.values()]))
        manifest = json.dumps(dict(entry=entry, core=core, offline=offline, aliases=aliases), separators=(',', ':'))
        source = Path('src/pages-sw.js').read_text(encoding='utf-8')
        (self.directory / 'sw.js').write_text(f'const deployment = {manifest};\n' + source, encoding='utf-8', newline='\n')
