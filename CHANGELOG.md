# Changelog / 変更履歴

## 1.2.0 — Score engine update

- Update the bundled score engine and LilyPond converter. The engine can
  render additional percussion and rhythm notation, voices on the same
  staff, and guitar fretboard diagrams.
- Separate imported LilyPond headings from nearby notation based on the
  laid-out text and staff shapes.
- Verify byte-identical MusicXML conversion for all 1,635 OpenBook songs.

## 1.1.0 — OpenBook

- Search OpenBook song titles and categories from Library → Songs. OpenBook is
  included by default, and the checkbox is remembered on each device.
- Preview and play a song from GitHub before adding it to the Library. Adding a
  score saves the original LilyPond template and converted MusicXML together.
  Annotations require a Library copy, and newer upstream versions can be added
  separately.
- Set the OpenBook lyrics and score font in View → Display settings. The defaults
  are visible lyrics and MuseJazz. Each device remembers its choices.
- Bundle the conversion code in the standalone HTML and installed PWA. Live
  catalog searches and previews require an internet connection. Library copies
  on the device open offline.

## 1.0.1 — MSCZ support

- Treat MSCZ work titles `無題のスコア` and `Untitled score` as unset when
  importing songs, falling back to the visible title and then the filename.
- Offer Library import after File → Open, with a View only option. Reuse the
  displayed score for import review, preserve the original file bytes, and open
  the Library copy after import. Cancelling keeps the original score open.
- Open local library PDFs with partial reads and start at the selected song's
  page. Store maximum page dimensions on import to keep existing layout sizing;
  fetch individual dimensions only as pages are used. Library schema 5 / record
  format 4 starts fresh without migrating earlier libraries.
- Use bundled browser-fs-access for local Open/Save. Store reusable file handles
  for Recent, read externally edited files afresh, and distinguish same-name files.
  Disable Recent entries without a usable handle; remove the old stored copies.
- Publish a modular Pages build that loads the notation engine, synthesizer and
  other optional assets on demand. Installed PWAs prepare all offline features
  and fetch only changed files on update. Keep the standalone HTML on Releases.
- Bundle the Japanese guide, media and music font beside local HTML and in the
  extension. App → Guide reads the bundled copy offline without file-URL probes
  or falling back to the external English guide.
- Give Transpose and Playback responsive panel layouts, separate mixer track
  names from controls, and shorten the Pan sliders.
- Skip PWA manifest loading and service-worker registration in standalone
  `file://` HTML. Center single-page Horizontal/Vertical layouts on opening,
  including when the layout is configured to show two pages.
- Fix PDF worker startup from standalone `file://` HTML, including PDFs opened
  through Recent. Test Local and Recent opening in source, packaged web, local
  HTML and the actual MV3 extension, checking rendered PDF content.
- Share bundled fonts across inline SVG score pages so chord symbols and framed
  rehearsal text use the same fonts as layout. Rasterize only for thumbnails,
  magnification and export.
- Use English score panels and declare UTF-8 before embedded license text.
- Fix Open retaining the previous score's extension when a different file type
  is selected, including opening a PDF after a notation score.

- Open MSCZ, MusicXML and MXL in the existing score layouts.
- Add score-ring transposition and offline GM playback/mixing panels.
- Save notation scores as original-key MSCZ with display settings and editable,
  Segment-anchored SVG annotations, including text and transparent images.
- Restore image placement changes made in MSCX and preserve annotations through
  display transposition. Keep source MusicXML/MXL files intact on conversion.
- Vendor an independently maintained score engine; see
  [implementation notes and current limits](doc/mscz-support.md).
- Enable the same score features in the MV3 browser extension using packaged
  JavaScript modules and audio Workers, with WASM-only CSP permission. Add an
  actual offline extension round-trip test with external requests blocked.

## 1.0.0 — 2026-11-03

The first Rostrum release, based on Podium v2.3.1.

- Publish the 1921music fork under the Rostrum name.
- Add browser pCloud support, static-host/PWA deployment and offline guidebook access.
- Support Japanese PDF annotations and provide a Japanese guidebook.
- Improve tablet page-number bands, bookmarks, Fit gestures and rendering order.
- Publish the unfinished wink page-turner separately under `/wink-page-turn/`.
- Keep stable and experimental deployments and their offline caches independent.

Podium v2.3.1 を基にした Rostrum の最初のリリースです。
日本語注釈・ガイド、pCloud 対応、PWA・オフライン表示、タブレットでのページ操作の改善を含みます。
ウィンク版は未完成の別ブランチとして公開し、通常版には含めていません。

Tag: `v1.0.0` (stable `main`). Upstream's `v2.*` tags describe Podium, not Rostrum releases.
