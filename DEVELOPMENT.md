# Development


### Prerequisites

- [mise](https://mise.jdx.dev/)
- openssl (for SSL certificate generation)
- ffmpeg (optional, for piano sample processing)
- emcc (Emscripten compiler, for YIN pitch detector worklet)
- cairosvg or ImageMagick (optional, for PWA icon generation)

Install the pinned core toolchain and development dependencies without activating
mise in the shell:

```bash
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
mise exec -- python serve.py
```

The server starts on port 9876 with a self-signed certificate. Generate the certificate first if needed:

```bash
mise exec -- python build.py --cert
```

Navigate to `https://localhost:9876/pod.html` to use the application.

### Build System

This project uses a custom Python-based build system.

### Personal Chrome extension

Build the self-contained application, then load `build/extension` as an
unpacked extension from `chrome://extensions`:

```bash
mise exec -- npm run build:extension
```

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
a no-op, and the message records the source commit (marked `+dirty` when the
build may not match it). GitHub Pages then builds it, which takes a few minutes
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
`tests/variants.spec.js` verifies both apps together when `build/variants/`
contains the stable deployment with the wink deployment under `wink-page-turn/`.
