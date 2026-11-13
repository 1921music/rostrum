# Development

### Bookshelf development

The Open panel's **Library** tab imports owned copies, lists scores and songs,
and manages tags, bookshelves and playlists. PDF outlines produce song entries;
MusicXML/MSCZ metadata provides an initial title. Song details and start pages
can be edited. **Import current score** imports an exported copy of the score
currently open, including a score opened through the existing cloud tabs.
File selection, **Import current score** and replacement all open **Review score
import** before registration. Each file is reviewed separately. Edit the library
display name, song titles, composers and 1-based start pages; choose songs, use a
filename as a title, or browse the preview and add a missing song. PDF and music
scores share the preview. Unchecking all songs imports only the file. Cancel or
Escape skips that file; a failed commit keeps the editable draft for retry.
Unselected extracted entries are kept as tombstones so rebuilding the index
does not bring them back. Included children can outlive an excluded heading;
the adjusted parent and edited fields survive reindex. Original files stay intact.
For an existing score, use **All scores → Edit and organize → Edit songs**.
The same dialog opens with saved song records, **Delete song**, **Save changes**
and **Cancel changes**. It also supports files with no songs. Saving applies the
whole draft in one transaction, retaining existing song IDs, metadata, tags,
playlist links, writing and original bytes. Deletions are tombstones. A revision
check rejects drafts made stale by another update. Snapshot persistence failures
keep the draft and committed revisions so retrying can include further edits.
Imports skip an already registered SHA-256 hash, even under another filename.
Previous/deleted documents also count as registered; use the history view to
restore them. Skipping does not create songs, copies, revisions or replacement
relationships. It does not remove duplicates registered by older app versions.

Library scores autosave annotations and per-score settings to SQLite without
rewriting their imported PDF/MSCZ. Save As remains the explicit file export path.
Replacing a file creates a new document and marks the previous document as
replaced; old song/playlist references are retained. Rebuilding the song index
preserves identified entries and manual edits/deletions.

Storage access goes through `src/bookshelf-storage.js`. Environment-specific
selection belongs in `src/bookshelf-storage-policy.js`; its current OPFS wiring
is for development, not a final support matrix. Only backend adapters may call
OPFS or filesystem APIs. File backends use logical relative paths, and database
backends must flush committed changes before an operation reports success.
The OPFS SQLite VFS uses internal pool files: `database.export()` produces the
logical `library.sqlite` image; do not back up the physical pool files directly.
The policy accepts explicit `opfs`, `directory` and `indexeddb` adapters. The
latter two persist a SQLite image after each operation; OPFS uses its native
SQLite VFS. Selection is remembered separately from the shared library, and no
backend silently falls back to temporary storage. A second tab receives a lock
error rather than opening another writer. Directory locking is conservative
for folders with the same name; external database changes are detected before
writing. Use a dedicated folder, not a database shared with another application.
When the remembered folder needs permission, Library displays its name and an
**Allow library folder access** button. The read/write permission request runs
on the host page in that button's user gesture, including for file-URL builds.
Denial keeps the selection and permits retrying. Runtime permission failures
also expose the button; granting access retries persistence and any dirty score.

Standalone file-URL builds embed a Worker and WASM runtime. Origin-bound file
and IndexedDB operations run in the host-page adapter and are bridged to the
SQLite Worker as bytes/Blobs. This avoids giving an opaque data-URL Worker
filesystem handles. Browser support and Safari/iPhone still require device
validation; the environment-to-default-backend mapping remains undecided.

**Backups and conflicting edits** exports a ZIP containing `library.sqlite`,
portable `library.json` records/change history, and the owned `scores/` files.
Import validates paths, file hashes, schema fields, change ancestry and
references before merging. It does not execute the supplied SQLite image and
does not import credentials, storage selection or per-device sync progress.
Unchanged old backups do not undo newer deletions; previous/deleted scores can
be recovered in the history view. Conflicts retain all versions until an
explicit resolution records all parent revisions. Independent ink additions
merge by stable document/page/object identities.

ZIP file data streams through Blobs rather than one combined byte array. The
current parser supports members up to 512 MiB and portable metadata up to
64 MiB; these are implementation limits, not a permanent format requirement.
An emergency export remains possible when a committed in-memory snapshot
cannot be persisted. The app retains the unsaved indication in this case.

Manual cloud sync uses the connected Drive/Dropbox/OneDrive/pCloud account and
the folder selected in the Library tab. A folder's Rostrum packages form one
shared library. Each run uploads a complete package with a unique name, first
to a temporary name and then publishes it by rename. Readers ignore unfinished
uploads. Packages are append-only so simultaneous uploads cannot overwrite
each other. This initial transport is snapshot-based, not bandwidth-optimized
delta sync; older packages are retained, with no automatic remote cleanup.
The generic transport exposes `list`, `read`, `write` and a stable destination
ID. Sync progress is local and failed uploads remain retryable. A run with no
new revisions since its previous successful publication skips the upload only
while that package is still present in the destination. Removing packages or
switching accounts therefore does not prevent republishing the local library.
The current score is saved before merging and reopened afterward when its
content is still available and has no unresolved conflicts. Cloud uploads
accept Blobs and use bounded chunks where the existing provider supports them.
Real OAuth/provider checks must use a dedicated test account and the manual
release checklist. Automated tests mock every provider request.

`mise exec -- node build_browser_fs.mjs` builds the bundled library dependencies,
including the bookshelf Worker, host adapter and SQLite WASM. The normal packaged, extension
and Pages builds include those assets; the Pages worker precaches them offline.
No CDN is required. Run focused checks with:

```powershell
mise exec -- npm test -- tests/bookshelf.spec.js
```

The tests use real local SQLite/OPFS and block unexpected external requests.
The schema and product overview remain drafts in `doc/bookshelf-design.md` and
`doc/bookshelf-spec.md`; sync change-record details may evolve with validation.


### Prerequisites

- [mise](https://mise.jdx.dev/)
- openssl (for SSL certificate generation)
- ffmpeg (optional, for piano sample processing)
- emcc (Emscripten compiler, for YIN pitch detector worklet)
- cairosvg or ImageMagick (optional, for PWA icon generation)

Install the pinned core toolchain and development dependencies without activating
mise in the shell:

```bash
git submodule update --init --recursive
mise install
mise exec -- python -m pip install -r requirements-dev.txt
mise exec -- npm install
mise exec -- npx playwright install chromium
```

Run project tools with `mise exec --`; this repository does not use
`mise activate`.

### Development Server

Start the HTTPS development server:

```bash
mise exec -- node build_browser_fs.mjs
mise exec -- python serve.py
```

The server starts on port 9876 with a self-signed certificate. Generate the certificate first if needed:

```bash
mise exec -- python build.py --cert
```

Navigate to `https://localhost:9876/pod.html` to use the application.

### Build System

MSCZ/MusicXML integration and rebuilding its submodule-based WASM engine are described
in [doc/mscz-support.md](doc/mscz-support.md). The regular build uses the
checked-in engine payload and requires no C++ toolchain.

This project uses a custom Python-based build system.

### Personal Chrome extension

Build the self-contained application, then load `build/extension` as an
unpacked extension from `chrome://extensions`:

```bash
mise exec -- npm run build:extension
```

The extension also supports MSCZ/MusicXML/MXL scores. It packages its score
modules and audio Worker as local files and permits bundled WebAssembly via
`'wasm-unsafe-eval'`, without allowing JavaScript eval or remote scripts.
Run `mise exec -- npm run test:extension` to verify it in a real MV3 browser
context. See [score support](doc/mscz-support.md) for engine asset regeneration
and an optional project-local Playwright browser installation.

The personal build supports pCloud OAuth in the extension context. The web build supports Direct Login. OAuth is the
recommended sign-in method and its access token is kept in
`chrome.storage.session`, so it is cleared when Chrome exits. Direct Login
remains available as a fallback; its optional remembered password uses the same
session-only storage and is never written to local or sync storage.

If `build/yin-worklet.js` has not already been built with Emscripten, this
command installs a no-op fallback worklet. pCloud Load/Save remains available,
but live pitch detection is disabled until `mise exec -- python build.py --yin`
is run with `emcc` available and the extension is rebuilt/reloaded.

#### Build Commands

| Command | Description |
|---------|-------------|
| `mise exec -- python build.py` | Full build (font, sample, yin, podium, guide) |
| `mise exec -- python build.py --podium` | Build single-file app (`build/podium.html`) |
| `mise exec -- python build.py --doc` | Recompress the guidebook's media for deployment (`build/doc-assets/`, requires ffmpeg) |
| `mise exec -- python build.py --pages` | Build a static-host deployment (`build/pages/`) |
| `mise exec -- python build.py --guide` | Build Guidebook keyword index |
| `mise exec -- python build.py --font` | Build font assets (embeds Bravura.otf as base64) |
| `mise exec -- python build.py --sample` | Build piano samples (requires ffmpeg) |
| `mise exec -- python build.py --yin` | Build pitch detection worklet (requires emcc) |
| `mise exec -- python build.py --cert` | Generate SSL certificate (requires openssl) |
| `mise exec -- python build.py --clean` | Clean build artifacts |

The build system creates a single-file distribution at `build/podium.html` that includes all dependencies, assets, and source code inline.
Packaged builds automatically bundle the pinned browser-fs-access dependency
with esbuild, including both native and fallback paths and its license. No CDN
or dynamic module download is needed. `npm test` also builds this adapter before
running browser tests; direct source development uses the command shown above.

#### Static-host deployment

`--pages` writes `build/pages/`: the packaged page as `index.html`, plus
`manifest.webmanifest`, `sw.js`, `podauth.html` and the two PWA icons. Upload
the directory anywhere static — GitHub Pages, for instance — and Podium
installs as a PWA from it. Everything is referenced relatively, so it works from
any subdirectory and the directory may be renamed.

It also carries the guidebook, where `--doc` has been run first. The web app
publishes the guidebook beside the page, so `App → Guide` can reach it with a
relative URL; a deployment that does not carry it borrows the published copy
from studiop5.org instead, which the panel decides by probing for a local one.
The guidebook uses Rostrum branding and links; upstream references remain labeled.

Only `doc/Guidebook.ja.html`, the Japanese translation, is deployed: it is what
this deployment's readers want, and carrying both would double the precache for
a copy one tap away. The panel leads with whichever translation it finds and
shows a language pill in its title bar; English falls back to the published
copy, so that one needs the network. UI names and the keyword index are left in
English, because that is what the app itself shows, and every `id` is shared
between the two files, so `--guide` writes one index into both and
cross-references work in either language. The translation carries a
`TRANSLATED-FROM:` digest of the English prose (the generated index excluded);
`--pages` reports a mismatch, deploys anyway, and prints the digest to paste in
once the translation has caught up.

`deploy-pages.sh` publishes the directory to this repository's `gh-pages`
branch:

```bash
mise exec -- python build.py --podium --pages
mise exec -- python deploy_pages.py
```

It assembles the commit with git plumbing, so neither the working tree nor the
current branch is touched — there is no `gh-pages` checkout, and the branch you
are working on stays checked out. `gh-pages` holds only the deployment and has
no relation to the source tree, which is why the commit is built by hand. The
remote branch is the parent, a deployment identical to the one already served is
a no-op, and the message records the source commit. The deployer requires committed sources and a build matching HEAD. GitHub Pages then builds it, which takes a few minutes
and occasionally stalls; `gh api repos/1921music/rostrum/pages/builds/latest --jq
.status` reports it and `gh api -X POST repos/1921music/rostrum/pages/builds` prods
it.

`--doc` derives `build/doc-assets/` from `doc/assets/`, which is 42 MB of
capture-resolution screenshots and screen recordings: images become WebP at
1280px wide (13.5 MB → 2.5 MB) and clips become AV1 at 1280px wide (28.7 MB →
11.5 MB). The service worker precaches the guidebook and its images, so it reads
offline; the videos are fetched when played, which is also why `sw.js` leaves
media requests to the browser rather than intercepting them — media arrives as
Range requests, and the Cache API cannot store the 206 responses that answer
them. Encoding all 78 files takes minutes, so each output records the digest of
its input and of the recipe that made it, and is rebuilt only when one changes.

`mise exec -- ffmpeg` cannot be used for this: the mise ffmpeg is a conda-style
package whose bin directory shadows the C runtime for every process started
after it is put on PATH — including mise itself. `build_doc.py` locates the real
executable and runs it directly.

The one exception is OAuth. Each provider's console must list `podauth.html`'s
exact URL as a redirect URI, so moving the directory means re-registering it
there, and a deployment under a different origin needs its own client IDs.
Google Drive is unaffected: its web path uses the GIS token client, which is
authorised by JavaScript origin rather than by redirect URI. pCloud is
unaffected too, because outside the extension it uses password login, which
registers nothing.

The icons need cairosvg, ImageMagick, or node with Playwright — whichever is
present. Note that `convert` on Windows is Windows' own FAT-to-NTFS converter,
not ImageMagick, and the cairosvg wheel installs there without the cairo library
it needs; the Playwright fallback exists for that case.


### Stable and experimental deployments

The stable app is published at <https://1921music.github.io/rostrum/>.
The unfinished wink build is published separately at
<https://1921music.github.io/rostrum/wink-page-turn/>.

Build and deploy from the corresponding branch:

```bash
# main -> the site root; preserves the experimental subdirectory
mise exec -- python build.py --podium --pages
mise exec -- python deploy_pages.py

# feature/wink-page-turn -> the experimental subdirectory; preserves the stable app
mise exec -- sh fetch-wink-assets.sh
mise exec -- python build.py --podium --pages
mise exec -- python deploy_pages.py --path wink-page-turn
```

Run `--font --sample --yin --doc` when their generated assets are not available.
`emcc` is required for `--yin`. Use a clean `build/pages/` when switching variants,
so an optional model from a wink build is not carried into the stable build.
`deploy-pages.sh` is a wrapper for the Python deployer. `--dry-run` prepares the
Git tree without pushing. The deployer verifies that the built source commit is
the checked-out commit and preserves the other published variant.

HTML navigations fetch with `cache: 'no-store'` and refresh the offline copy;
offline/network failures and HTTP errors fall back to the last cached document.
Worker installation also bypasses the HTTP cache. An older cache-first worker
can be migrated by opening the app once with a new query string.

Service worker caches are isolated by registration scope. Installing or updating
one variant does not delete the other's offline cache. The two apps share the
origin's browser storage, including saved UI settings, recent files and the shared
buffer; the experimental build is not a separate account or storage sandbox.
OAuth providers may need both `podauth.html` redirect URLs registered.

### Versioning and tests

Rostrum has its own version, starting at **1.0.0** (`v1.0.0`), and is based on
Podium **2.3.1**. The stable tag points to `main`; the wink branch remains experimental.
See [CHANGELOG.md](CHANGELOG.md) and [README.md](README.md).

```bash
mise exec -- npm test
mise exec -- python -m unittest discover -s tests -p test_deploy_pages.py
```

The browser tests mock cloud APIs. Real provider sign-in is checked manually.
For the bookshelf release, use a dedicated test account and folder to check
each intended provider and target device:

- Import PDF outlines and MSCZ, add ink, restart, and verify the chosen library
  reconnects with the same contents. Check browser storage and a chosen folder
  separately where supported; file-URL picker support must be checked on-device.
- Export a library, restore it into a fresh library, and verify score hashes,
  ink, tags, playlists, previous versions and deletions.
- Sync two devices, edit offline on both, reconnect, resolve a competing edit,
  and verify convergence. Confirm incomplete uploads stay unpublished and a
  failed attempt can be retried without replacing another device's package.
- Check the displayed destination/account, the storage cost of full packages,
  and behavior when permission is revoked or the network/storage is unavailable.
  Automated tests must continue to mock all of these provider requests.

`tests/variants.spec.js` verifies both apps together when `build/variants/`
contains the stable deployment with the wink deployment under `wink-page-turn/`.
