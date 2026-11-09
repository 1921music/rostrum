# Changelog / 変更履歴

## Unreleased — MSCZ support

- Open MSCZ, MusicXML and MXL in the existing score layouts.
- Add score-ring transposition and offline GM playback/mixing panels.
- Save notation scores as original-key MSCZ with display settings and editable,
  Segment-anchored SVG annotations, including text and transparent images.
- Restore image placement changes made in MSCX and preserve annotations through
  display transposition. Keep source MusicXML/MXL files intact on conversion.
- Vendor an independently maintained score engine; see
  [implementation notes and current limits](doc/mscz-support.md).
- Browser-extension score support is pending approval of the required CSP change;
  its existing PDF support remains available.

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
