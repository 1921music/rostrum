const { test, expect } = require('@playwright/test');
const { unzipSync, strFromU8 } = require('fflate');
const { createHash } = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { openBookCatalogUrl } = require('./library-ui-helpers');

const template = [
  '{#', 'default_version = "Fake"', '[attributes]', 'title = "Practice Tune"',
  'composer = "A Composer"', '[versions.Fake]', 'doVoice = true', 'doChords = true', 'doLyrics = true', '#}',
  '{% if part == "VoiceFake" %}{ c4 d e f | }{% endif %}',
  '{% if part == "ChordsFake" %}\\chordmode { c1 | }{% endif %}',
  '{% if part == "LyricsFake" %}\\lyricmode { one two three four }{% endif %}',
].join('\n');
const songPath = 'src/pop/practice_tune.ly.tera';
function blobHash(source) {
  return createHash('sha1').update('blob ' + Buffer.byteLength(source) + '\0').update(source).digest('hex');
}

async function mockOpenBook(context, url) {
  const mock = { source: template, catalogs: 0, blobs: 0, external: [] };
  await context.route('**/*', async route => {
    const target = route.request().url();
    if (target === openBookCatalogUrl) {
      mock.catalogs++;
      return route.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: {
        truncated: false, tree: [
          { path: songPath, sha: blobHash(mock.source), type: 'blob' },
          { path: 'src/test/test_score.ly.tera', sha: blobHash(mock.source), type: 'blob' },
          { path: 'src/include/helpers.ly.tera', sha: blobHash(mock.source), type: 'blob' },
        ],
      } });
    }
    if (target === 'https://api.github.com/repos/veltzer/book-openbook/git/blobs/' + blobHash(mock.source)) {
      mock.blobs++;
      return route.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: {
        sha: blobHash(mock.source), encoding: 'base64', content: Buffer.from(mock.source).toString('base64'),
      } });
    }
    if (target.startsWith('http://127.0.0.1:9876/') || target === url) return route.continue();
    if (target === 'https://accounts.google.com/gsi/client')
      return route.fulfill({ contentType: 'application/javascript', body: 'window.google={accounts:{oauth2:{}}};' });
    mock.external.push(target);
    return route.abort();
  });
  return mock;
}

const openSongs = async page => {
  await page.evaluate(() => _menu_.showLibrary());
  await expect(page.locator('.LibraryWindow')).toBeVisible();
  const view = page.getByLabel('Library view', { exact: true });
  if (await view.isVisible()) await view.selectOption('entries');
  else await page.getByRole('button', { name: 'Songs', exact: true }).click();
};

for (const url of ['/pod.html', '/rostrum.html', pathToFileURL(path.resolve('build/rostrum.html')).href]) {
  test('OpenBook preview, device preferences and saved score (' + url + ')', async ({ page, context }) => {
    test.setTimeout(60000);
    const mock = await mockOpenBook(context, url);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.waitForFunction(() => !!window._viewState_?.ready);
    await page.evaluate(() => _bookshelf_.configure({ kind: 'indexeddb' }));
    await openSongs(page);
    const include = page.getByRole('checkbox', { name: 'Include OpenBook' });
    await expect(include).toBeChecked();
    const external = page.getByRole('region', { name: 'OpenBook results' });
    await expect(external.getByRole('button', { name: 'Practice Tune' })).toBeVisible();
    await expect(external.getByRole('button', { name: 'Test Score' })).toHaveCount(0);
    await page.getByLabel('Search songs', { exact: true }).fill('pop');
    await expect(external.getByRole('button', { name: 'Practice Tune' })).toBeVisible();
    expect(mock.catalogs).toBe(1);
    expect(mock.blobs).toBe(0);
    await external.getByRole('button', { name: 'Practice Tune' }).click();
    await expect.poll(() => page.evaluate(() => _score_?.music?.native.viewScoreFont)).toBe('musejazz');
    expect(await page.evaluate(() => _score_.music.native.viewShowLyrics)).toBe(true);
    expect(await page.evaluate(async () => (await _bookshelf_.call('list')).length)).toBe(0);

    await page.evaluate(() => _menu_.showPanel(_menu_.rings.layout.cells.display));
    await page.getByRole('checkbox', { name: 'Show lyrics' }).uncheck();
    await expect.poll(() => page.evaluate(() => _score_.music.native.viewShowLyrics)).toBe(false);
    await page.getByRole('combobox', { name: 'Score font' }).selectOption('original');
    await expect.poll(() => page.evaluate(() => _score_.music.native.viewScoreFont)).toBe('original');

    await page.evaluate(() => _menu_.activateCell(_menu_.rings.ink.cells.pencil));
    const confirm = page.getByRole('dialog').filter({ hasText: 'Add this OpenBook score' });
    await confirm.getByRole('button', { name: 'Add to Library' }).click();
    await expect.poll(() => page.evaluate(() => !!_score_?.libraryDocumentId)).toBe(true);
    const saved = await page.evaluate(async () => {
      const { file, document } = await _bookshelf_.call('read', { id: _score_.libraryDocumentId });
      return { id: document.id, metadata: JSON.parse(document.metadata_json), bytes: Array.from(new Uint8Array(await file.arrayBuffer())) };
    });
    const archive = unzipSync(Uint8Array.from(saved.bytes));
    expect(strFromU8(archive['source/practice_tune.ly.tera'])).toBe(template);
    expect(strFromU8(archive['score.musicxml'])).toContain('Practice Tune');
    expect(saved.metadata.openBook).toEqual({ path: songPath, sha: blobHash(template) });
    expect(JSON.parse(strFromU8(archive['META-INF/rostrum-openbook.json']))).toEqual(saved.metadata.openBook);
    await page.evaluate(async () => {
      const score = _score_;
      const page = await score.pgUse(1, false);
      page.canvas.add(new fabric.Circle({ left: 40, top: 55, radius: 8, fill: 'red' }));
      score.setDirty(true);
      await _bookshelf_.flush(score);
    });

    await openSongs(page);
    await page.getByLabel('Search songs', { exact: true }).fill('Practice Tune');
    await expect(page.getByRole('button', { name: 'Practice Tune', exact: true })).toHaveCount(1);
    await expect(page.getByText('OpenBook · Saved to Library', { exact: true })).toBeVisible();
    await include.uncheck();
    await page.evaluate(() => _viewState_.save());
    await page.reload();
    await page.waitForFunction(() => !!window._viewState_?.ready);
    await openSongs(page);
    await expect(include).not.toBeChecked();
    expect(await page.evaluate(() => _viewState_.openBook)).toEqual({ include: false, showLyrics: false, font: 'original' });
    await page.evaluate(id => _bookshelf_.openDocument(id), saved.id);
    expect(await page.evaluate(() => [_score_.music.native.viewShowLyrics, _score_.music.native.viewScoreFont])).toEqual([false, 'original']);
    expect(await page.evaluate(async () => (await _bookshelf_.call('read', { id: _score_.libraryDocumentId })).annotations.length)).toBe(1);
    expect(mock.blobs).toBe(1);

    mock.source = 'This template cannot be expanded.';
    await openSongs(page);
    await include.check();
    const updated = page.getByRole('region', { name: 'OpenBook results' });
    await expect(updated.getByText('New version on GitHub', { exact: false })).toBeVisible();
    await updated.getByRole('button', { name: 'Practice Tune', exact: true }).click();
    await expect(updated.getByRole('link', { name: 'Open on GitHub' })).toHaveAttribute('href',
      'https://github.com/veltzer/book-openbook/blob/master/' + songPath);
    expect(await page.evaluate(async () => (await _bookshelf_.call('list')).map(document => document.id))).toEqual([saved.id]);
    expect(mock.external).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('installed PWA can run both OpenBook WASMs offline', async ({ page, context }) => {
  test.skip(!fs.existsSync(path.resolve('build/pages/index.html')), 'Build the Pages edition first');
  test.setTimeout(60000);
  const mock = await mockOpenBook(context, '/pages/index.html');
  await page.goto('/pages/index.html');
  await page.waitForFunction(() => !!window._rostrumPages_);
  await page.evaluate(() => window._rostrumPages_.prepareOffline());
  await context.setOffline(true);
  const xml = await page.evaluate(async source => {
    const pages = window._rostrumPages_;
    const api = await import(pages.url('lilypond.mjs'));
    const convert = await api.loadLilyPond(await pages.bytes('lilypond.wasm.gz'));
    const expand = await api.loadLilyPondTera(await pages.bytes('lilypond-tera.wasm.gz'));
    return new TextDecoder().decode(convert(expand(new TextEncoder().encode(source))));
  }, template);
  expect(xml).toContain('Practice Tune');
  expect(mock.catalogs).toBe(0);
  expect(mock.blobs).toBe(0);
  expect(mock.external).toEqual([]);
});
