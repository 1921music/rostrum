# MSCZ and MusicXML support

Rostrum reads `.mscz`, `.musicxml`, `.xml` (score-partwise) and `.mxl` in
the same page layouts as PDF. Scores are processed locally. The score ring has
Transpose and Playback panels; PDF keeps its existing controls.

On-screen score backgrounds are inline SVG. All pages share the score engine's
registered FontFace objects, including the bundled music/text fonts; pages do
not embed or register their own font copies. This keeps browser text measurement
and visible text rendering on the same fonts. Thumbnails, the magnifier and PDF
export create a temporary self-contained SVG image only when a raster image is
needed, then release it with the page cache.

The score panels use English labels. UTF-8 is declared at the start of the HTML,
before the embedded license, including standalone and extension builds.

## Saving

All notation-score saves produce MSCZ. A MusicXML/MXL source is saved under a
new `.mscz` name and its original file handle is never reused. The MSCZ contains
the original-key notation, `rostrum:settings` metadata for display transposition
and viewing/mixer settings, and standard SVG Image elements for annotations.

Each annotation attaches to a ChordRest Segment at exact rational musical time
and a staff, with position and size expressed in staff-space units. The SVG's
`metadata` contains a versioned Rostrum annotation, its editable Fabric object,
and its original bounds. Text is initially stored as SVG, with the original
string and formatting retained in the metadata.

MuseScore displays these standard images in the original key. Rostrum extracts
their edit data and current image placements, suppresses their native image
rendering, and restores the objects into its annotation canvas. Image movement
and scaling in MSCX are reflected on reopening. Copied image occurrences are
independent even when they share a single image resource.

Display transposition rebuilds the notation from the original source. Rostrum
keeps annotations outside this temporary model, resolves their anchors again,
and translates/scales their placements. It does not reshape a mark around
transposed noteheads or split a long stroke across new system breaks.

Unsupported annotation metadata currently stops opening rather than discarding
editable data. Changed/missing anchors stop saving. Page insertion, removal,
reordering, PDF merging/import and flattening are disabled for notation scores.
Ordinary image drawing inherited from the Qt-free engine is incomplete; this
first integration does not add support for arbitrary pre-existing score images.
Playback supports play/pause/stop and part mixing, but not seek or a play cursor.

The web/PWA, standalone HTML and browser extension contain the engine, fonts
and EAS GM audio bank. They do not require an audio service. The MV3 extension
imports JavaScript and its audio Worker from packaged files under
`build/score-engine/`. Its CSP adds only `'wasm-unsafe-eval'` to allow the bundled
WASM to run. It adds no permission for JavaScript evaluation, inline scripts,
data: script modules or Blob script workers. No additional host permissions are needed.

## Building the engine

`engine/` is an independent fork of mscz_webviewer, including its original
licenses and vendored source. Its own `.mise.toml` declares Emscripten, CMake,
Ninja, Python and Node. The normal Rostrum build uses the checked-in generated
`lib/score-engine-data.js` and generated modules under `lib/score-engine/`; it
does not require WSL or a C++ compiler.

After changing engine sources, run in a WSL environment with the pinned tools:

```sh
cd engine
mise install
BUILD_DIR=/absolute/path/to/rostrum-wasm mise exec -- bash scripts/build-wasm.sh
mise exec -- python ../build_score_engine.py --web /absolute/path/to/rostrum-wasm/web
cd ..
mise exec -- python build.py --podium
mise exec -- npx playwright test tests/music-score.spec.js
```

Commit both the regenerated payload and extension modules with engine changes.
The browser tests
block unexpected external requests and cover MusicXML/MXL conversion, SVG and
text restoration, original-key saving, transposition, playback, mixer settings,
and simulated MSCX image movement/scaling.
They also cover shared font registrations, rehearsal text/frame bounds, English
panel labels and PDF opening through both the Local tab and the active-score
Open action. Selecting a different file uses its actual name, format and handle.
The extension test suite also opens a PDF first, then opens one through Recent,
in source HTTP, packaged HTTP, standalone `file://` HTML and the MV3 extension.
It checks rendered PDF pixels. Standalone HTML uses a data-URL PDF module worker
because Chromium rejects a blob-URL module worker from an opaque file origin.

## Verifying the extension

```sh
mise exec -- npm run test:extension
```

This builds `build/extension/` and loads it as an actual unpacked Manifest V3
extension in Playwright's full Chromium using an isolated temporary profile.
The test blocks all HTTP(S) requests, then verifies score rendering,
transposition, synthesized playback, pause/stop, original-key MSCZ saves,
editable annotation restoration, and existing PDF rendering while offline.
It also asserts that no CSP violations occur and that audio Workers come from
the extension's own files. The usual web/PWA tests remain separate.

For a project-local browser installation, without changing an existing cache,
PowerShell can use:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $PWD 'build/playwright-browsers'
mise exec -- npx playwright install chromium
mise exec -- npm run test:extension
```

To use the build, open the browser's extension manager, enable developer mode,
and load `build/extension/` as an unpacked extension. Reload an already loaded
copy after rebuilding to apply its updated CSP and scripts.
