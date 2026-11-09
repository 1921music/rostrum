# Changelog / 変更履歴

## Unreleased — MSCZ support

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
