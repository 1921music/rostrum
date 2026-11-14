# Rostrum

**Version 1.0.0** · [Open Rostrum](https://1921music.github.io/rostrum/) · [Experimental wink page-turner](https://1921music.github.io/rostrum/wink-page-turn/)

> This is a fork of [studiop5/podium](https://github.com/studiop5/podium), branched
> at v2.3.0 and rebased onto v2.3.1, for use as a music stand on an Android tablet. What it adds and why —
> pCloud outside the browser extension, a static-host PWA deployment, Japanese text
> and guidebook, movable page-number bands, bookmark targeting, faster page
> jumps — is in [FORK-ja.md](FORK-ja.md) (Japanese).

**Rostrum is:**
- An e-reader for music scores.
- 100% browser-based, 100% open source, 100% free.
- No installation, no registration, no login, no file import. Just use it!
- Works in Chrome, Edge, Firefox, and Safari on desktop, tablet, and smartphone.
- Unique UI featuring a circular menu and multiple layouts.
- Alternative to generic PDF viewers, customized for the layout and annotation of scores in PDF format.
- Not a music library: works with PDF files stored locally or in the cloud.
- Uses PDF annotations and embedded document metadata to store user edits.

Rostrum is maintained by 1921music. `main` contains the stable fork;
`feature/wink-page-turn` holds the unfinished wink page-turner. `gh-pages`
contains generated deployment files and has an independent history.

The upstream copyright and AGPL-3.0 license are retained. Build the standalone
app as `build/rostrum.html` with `mise exec -- python build.py --rostrum`.
Internal identifiers and new PDF metadata use Rostrum names; this naming change
does not migrate data written with the old names.

## Compatibility

**Runs on:**
- Laptops, Chromebooks, tablets, smartphones: anything with a modern browser.

**Input devices:**
- S-Pen, Apple Pencil, USI styli, fingers and thumbs.
- Mouse, track pad, computer keyboard, Bluetooth page turners.

## Practice Tools

- Metronome with animated conducting baton.
- On-screen piano keyboard with assisted tuning and pitch detection.
- Audio/video recorder with instant replay.
- Stopwatch and clock.

## Browser Extension

A Chrome/Edge browser extension is available for opening PDF scores directly from web pages (including IMSLP) into Rostrum via context menu or toolbar popup.

## Links

- **App**: [Open Rostrum](https://1921music.github.io/rostrum/)
- **Experimental wink build**: [Try wink page turning](https://1921music.github.io/rostrum/wink-page-turn/) (unfinished)
- **Guidebook (Japanese)**: https://1921music.github.io/rostrum/Guidebook.ja.html
- **Upstream Podium**: https://github.com/studiop5/podium
- **Upstream Release Notes**: https://studiop5.org/releaseNotes.html
- **Upstream Privacy**: https://studiop5.org/privacy.html
- **Upstream Terms**: https://studiop5.org/terms.html

## Development

Build, test and deployment instructions are in [DEVELOPMENT.md](DEVELOPMENT.md).
See [CHANGELOG.md](CHANGELOG.md) for Rostrum release notes.

MSCZ/MusicXML/MXL viewing, transposition, playback and SVG annotation persistence
use the shared, pinned `mscz_webviewer` engine. Playback highlights noteheads and
can follow the score by system. See [score support](doc/mscz-support.md) for the
save format, engine build and current limits.

## License

[GNU Affero General Public License v3](https://www.gnu.org/licenses/agpl-3.0-standalone.html)

---

## 日本語

### Rostrum 1.0.0

**[Rostrum を開く](https://1921music.github.io/rostrum/)** — インストールせず、ブラウザですぐ使えます。

Rostrum は、[Podium](https://github.com/studiop5/podium) を基にした譜面用の PDF リーダーです。
upstream の v2.3.1 を基準に、1921music が Android タブレットを譜面台として使うための改良を加えています。
Rostrum 独自のバージョンは **1.0.0**（タグ `v1.0.0`）から始まります。

- 無料・オープンソースで、パソコン、タブレット、スマートフォンのブラウザで動きます。
- ローカルやクラウドにある PDF 譜面を開き、書き込みを PDF に保存できます。
- 日本語注釈、日本語ガイド、pCloud のブラウザからの利用、PWA とオフライン表示に対応しています。
- ページ番号帯の配置、ブックマーク操作、ページ移動をタブレット向けに改善しています。
- ペン、指、マウス、キーボード、ページめくりペダルを使えます。
- メトロノーム、ピアノ、音高検出、録音・録画、時計などの練習用ツールがあります。

### 公開版と開発中の機能

- **通常版（main）**：[https://1921music.github.io/rostrum/](https://1921music.github.io/rostrum/)
- **ウィンク版（開発中）**：[https://1921music.github.io/rostrum/wink-page-turn/](https://1921music.github.io/rostrum/wink-page-turn/)
- **[日本語ガイドブック](https://1921music.github.io/rostrum/Guidebook.ja.html)**

ウィンクによるページめくりは `feature/wink-page-turn` ブランチで開発中です。
通常版には含まれません。ウィンク版はカメラへのアクセスが必要です。
両方の公開ページは同じオリジンを使うため、ブラウザに保存した設定や最近使ったファイルなどを共有します。
クラウドの OAuth 認証は、公開先 URL に合わせた各サービス側の設定が必要です。

### 開発・変更内容・ライセンス

- 開発・ビルド・テスト・公開手順：[DEVELOPMENT.md](DEVELOPMENT.md)（英語）
- Rostrum のリリースノート：[CHANGELOG.md](CHANGELOG.md)
- Podium からの変更と背景：[FORK-ja.md](FORK-ja.md)
- ライセンス：[GNU AGPL v3](LICENSE)。元の作者の著作権表記を引き継いでいます。

### 楽譜再生への表示追従

MSCZ / MusicXML の再生中は、現在の音符の符頭を赤色で表示し、
段全体を貫く赤い縦線が再生位置に合わせて滑らかに動きます。
上部バーの `Auto-scroll` は初期状態でONで、段の切り替わりに合わせて
表示位置を調整します。次の段が画面内に収まっている場合は移動しません。
ブック・横スクロール・縦スクロール表示で、ページ送りとリピートにも追従します。
演奏が次のページに移ると、そのページを選択してページ番号も更新します。
一時停止では赤色表示を保持し、停止すると元に戻ります。赤色は表示専用で、
保存する楽譜や書き出すPDFには入りません。

共通エンジンの `playbackTimeline().visual`、`Playback.tracking` / `subscribe()`、
`PlaybackView` を使用しています。エンジンのAPI仕様は
[engine/README.md](engine/README.md#playback-tracking-api) を参照してください。

リングメニューの Playback で、現在見えている段の位置から一時停止状態で
playbackモードに入ります。画面上部には Play/Pause、Auto-scroll、Volume、
Mixer、`|<`、シークバー、現在時刻／総時間、終了の `×` を表示します。
幅が足りない場合は折り返し、Mixer は初期非表示のモードレスダイアログです。
演奏中・一時停止中ともシークバー、音符タップ、`|<` で移動できます。
移動前の再生状態を引き継ぎ、シークバーをドラッグ中だけ無音にします。
演奏中に始めたドラッグは指を離すと再開し、一時停止中ならそのまま維持します。
音符タップは指を離した時点で確定し、指が動いた場合はシークしません。
音符タップによるシークではページ送りを起こさず、それ以外のタップは通常の
ページ送りです。シーク時は Auto-scroll がOFFでも移動先を表示します。
再開時は移動先より前に発音した音を復元しません。`×` または Playback の再押下で
モードを終了します。
