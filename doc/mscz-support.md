# MSCZ and MusicXML support

Rostrum reads `.mscz`, `.musicxml`, `.xml` (score-partwise) and `.mxl` in
the same page layouts as PDF. Scores are processed locally. The score ring has
Transpose and Playback panels; PDF keeps its existing controls.

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

The web/PWA and standalone HTML contain the engine, fonts and EAS GM audio bank.
They do not require an audio service. The browser extension currently retains
PDF support only: enabling the score engine requires a separately approved CSP
change. No extension CSP changes are included in this implementation.

## Building the engine

`engine/` is an independent fork of mscz_webviewer, including its original
licenses and vendored source. Its own `.mise.toml` declares Emscripten, CMake,
Ninja, Python and Node. The normal Rostrum build uses the checked-in generated
`lib/score-engine-data.js`; it does not require WSL or a C++ compiler.

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

Commit the regenerated payload together with engine changes. The browser tests
block unexpected external requests and cover MusicXML/MXL conversion, SVG and
text restoration, original-key saving, transposition, playback, mixer settings,
and simulated MSCX image movement/scaling.
