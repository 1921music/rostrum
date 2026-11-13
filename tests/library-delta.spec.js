const { test,expect } = require('@playwright/test');
const { unzipSync } = require('fflate');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { installDeltaCloud,installProviderCloud } = require('./library-sync-helpers');

test.beforeEach(async ({ page }) => {
  page.external = [];
  await page.route('**/*',route => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:9876/')) return route.continue();
    if (url.startsWith(pathToFileURL(path.resolve('build')).href + '/')) return route.continue();
    if (url === 'https://accounts.google.com/gsi/client') return route.fulfill({ contentType:'application/javascript',body:'window.google = { accounts: { oauth2: {} } };' });
    page.external.push(url); return route.abort();
  });
  await page.goto('/pod.html'); await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
});
test.afterEach(async ({ page }) => expect(page.external).toEqual([]));

async function devices(page,count = 1) {
  await installDeltaCloud(page);
  return page.evaluate(async count => {
    window.deviceA = { kind:'indexeddb',name:'delta-a' }; window.deviceB = { kind:'indexeddb',name:'delta-b' };
    await _bookshelf_.configure(deviceA);
    const ids = [];
    for (let i = 0; i < count; i++) {
      const pdf = await PDFLib.PDFDocument.create(); pdf.setTitle('Song ' + i); pdf.addPage([300+i,400]);
      ids.push((await _bookshelf_.import(new File([await pdf.save()],'Score ' + i + '.pdf'))).id);
    }
    await _bookshelf_.sync(deltaCloud.transport); return ids;
  },count);
}

test('sync receives searchable metadata only, sends one changed record and opens a score on demand', async ({ page }) => {
  const [id] = await devices(page);
  const result = await page.evaluate(async id => {
    const transport = deltaCloud.transport;
    await _bookshelf_.configure(deviceB); const received = await _bookshelf_.sync(transport);
    const before = (await _bookshelf_.call('availability',{ destination:transport.id })).find(row => row.id === id);
    const readsBefore = deltaCloud.calls.filter(call => call.kind === 'readScore').length;
    const entry = (await _bookshelf_.call('search'))[0];
    await _bookshelf_.configure(deviceA);
    await _bookshelf_.call('update',{ table:'entries',values:{ id:entry.id,metadata_json:JSON.stringify({ ...JSON.parse(entry.metadata_json),title:'Updated song' }) } });
    const sent = await _bookshelf_.sync(transport);
    const packet = JSON.parse(await [...deltaCloud.batches.values()].at(-1).text());
    await _bookshelf_.configure(deviceB); await _bookshelf_.sync(transport);
    const found = await _bookshelf_.call('search',{ query:'Updated song' });
    const score = await _bookshelf_.openDocument(id);
    const status = await _bookshelf_.call('syncStatus',{ destination:transport.id });
    return { before,readsBefore,received:received.uploadedChanges,sent:sent.uploadedChanges,found:found.length,
      changes:packet.changes.map(row => row.entity_type),fileUploads:deltaCloud.calls.filter(call => call.kind === 'writeScore').length,
      fileReads:deltaCloud.calls.filter(call => call.kind === 'readScore').length,pages:score.pgs.length,pending:status.pending };
  },id);
  expect(result).toMatchObject({ before:{ present:false,remote:true,pinned:false },readsBefore:0,received:0,sent:1,found:1,
    changes:['entries'],fileUploads:1,fileReads:1,pages:1,pending:0 });
});

test('offline keeping works for playlists, release removes only the local file, and offline search survives reload', async ({ page,context }) => {
  const ids = await devices(page,2);
  await page.evaluate(async ids => {
    const entries = await _bookshelf_.call('search');
    const playlist = crypto.randomUUID(); window.offlinePlaylist = playlist;
    await _bookshelf_.call('update',{ table:'playlists',values:{ id:playlist,metadata_json:'{"name":"Offline concert"}' } });
    await _bookshelf_.call('link',{ table:'playlist_items',values:{ playlist_id:playlist,entry_id:entries.find(row => row.document_id === ids[0]).id,order_key:'1' } });
    await _bookshelf_.sync(deltaCloud.transport);
    await _bookshelf_.configure(deviceB); await _bookshelf_.sync(deltaCloud.transport);
    const selected = await _bookshelf_.call('collectionDocuments',{ table:'playlists',id:playlist });
    await _bookshelf_.keepOffline(selected);
  },ids);
  let states = await page.evaluate(() => _bookshelf_.call('availability',{ destination:deltaCloud.transport.id }));
  expect(states.find(row => row.id === ids[0])).toMatchObject({ present:true,pinned:true });
  expect(states.find(row => row.id === ids[1])).toMatchObject({ present:false,pinned:false });
  expect(await page.evaluate(async id => { try { await _bookshelf_.releaseDownload(id); } catch (error) { return error.message; } },ids[0])).toContain('offline');
  await page.evaluate(async id => { await _bookshelf_.call('pinFile',{ id,pinned:false }); await _bookshelf_.releaseDownload(id); },ids[0]);
  states = await page.evaluate(() => _bookshelf_.call('availability',{ destination:deltaCloud.transport.id }));
  expect(states.find(row => row.id === ids[0])).toMatchObject({ present:false,remote:true });
  await context.setOffline(true);
  expect(await page.evaluate(async id => { try { await _bookshelf_.ensureFile(id); } catch (error) { return error.message; } },ids[0])).toContain('cloud-only');
  expect(await page.evaluate(async () => (await _bookshelf_.call('search')).length)).toBe(2);
  await context.setOffline(false);
  await page.evaluate(async id => _bookshelf_.keepOffline([id]),ids[0]);
  await page.reload(); await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  await page.evaluate(() => _bookshelf_.call('open'));
  await context.setOffline(true);
  expect(await page.evaluate(async id => (await _bookshelf_.openDocument(id)).pgs.length,ids[0])).toBe(1);
  await context.setOffline(false);
});

test('unuploaded files cannot be released and interrupted uploads never publish dangling metadata', async ({ page }) => {
  await installDeltaCloud(page);
  const result = await page.evaluate(async () => {
    const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300,400]);
    const doc = await _bookshelf_.import(new File([await pdf.save()],'Pending.pdf'));
    let releaseError = ''; try { await _bookshelf_.releaseDownload(doc.id); } catch (error) { releaseError = error.message; }
    deltaCloud.failFiles = true; let fileFailed = false;
    try { await _bookshelf_.sync(deltaCloud.transport); } catch { fileFailed = true; }
    const batchesAfterFileFailure = deltaCloud.batches.size;
    deltaCloud.failFiles = false; deltaCloud.failChanges = true; let metadataFailed = false;
    try { await _bookshelf_.sync(deltaCloud.transport); } catch { metadataFailed = true; }
    const filesBeforeRetry = deltaCloud.scores.size;
    deltaCloud.failChanges = false; await _bookshelf_.sync(deltaCloud.transport);
    return { releaseError,fileFailed,metadataFailed,batchesAfterFileFailure,filesBeforeRetry,files:deltaCloud.scores.size,batches:deltaCloud.batches.size };
  });
  expect(result).toMatchObject({ fileFailed:true,metadataFailed:true,batchesAfterFileFailure:0,filesBeforeRetry:1,files:1,batches:1 });
  expect(result.releaseError).toMatch(/Connect|Upload/);
});

test('bad downloads stay unavailable and can be retried without changing metadata', async ({ page }) => {
  const [id] = await devices(page);
  const result = await page.evaluate(async id => {
    await _bookshelf_.configure(deviceB); await _bookshelf_.sync(deltaCloud.transport);
    const before = await _bookshelf_.call('changeIds'); deltaCloud.corrupt = true;
    let failed = false; try { await _bookshelf_.ensureFile(id); } catch { failed = true; }
    const missing = (await _bookshelf_.call('availability',{ destination:deltaCloud.transport.id }))[0].present;
    deltaCloud.corrupt = false; await _bookshelf_.ensureFile(id);
    return { failed,missing,present:(await _bookshelf_.call('availability',{ destination:deltaCloud.transport.id }))[0].present,
      unchanged:JSON.stringify(before) === JSON.stringify(await _bookshelf_.call('changeIds')) };
  },id);
  expect(result).toEqual({ failed:true,missing:false,present:true,unchanged:true });
});

test('failed offline downloads are device failures while metadata stays synced, and retry clears the failure', async ({ page }) => {
  const [id] = await devices(page);
  expect(await page.evaluate(async id => {
    await _bookshelf_.configure(deviceB); await _bookshelf_.sync(deltaCloud.transport);
    await _bookshelf_.call('pinFile',{ id,pinned:true }); deltaCloud.corrupt = true;
    const failed = await _bookshelf_.sync(deltaCloud.transport);
    const device = _bookshelf_.deviceStatus(), cloud = _bookshelf_.cloudStatus();
    deltaCloud.corrupt = false; const retry = await _bookshelf_.sync(deltaCloud.transport);
    return { failures:failed.downloadFailures,pending:failed.pending,device,cloud,retried:retry.downloadFailures,
      saved:_bookshelf_.deviceStatus(),present:(await _bookshelf_.call('availability'))[0].present };
  },id)).toEqual({ failures:1,pending:0,device:'Device: score download failed',cloud:'Cloud: synced',retried:0,saved:'Device: saved',present:true });
});

test('cloud-only rows show download progress, offline keeping and local-only release on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width:390,height:844 });
  await devices(page);
  await page.evaluate(async () => {
    await _bookshelf_.configure(deviceB); await _bookshelf_.sync(deltaCloud.transport);
    deltaCloud.pauseRead = true; _menu_.notify('score/open/up');
  });
  await page.getByText('Library',{ exact:true }).click();
  await expect(page.getByText(/Cloud only.*File uploaded/)).toBeVisible();
  await page.getByText('Edit and organize',{ exact:true }).click();
  await page.getByRole('button',{ name:'Download to this device',exact:true }).click();
  await page.waitForFunction(() => typeof deltaCloud.resumeRead === 'function');
  await expect(page.getByLabel('Device save status')).toHaveText('Device: downloading scores');
  await expect(page.getByLabel('Cloud sync status')).toContainText('Cloud: synced');
  await page.screenshot({ path:test.info().outputPath('cloud-only-downloading.png') });
  await page.evaluate(() => { deltaCloud.pauseRead = false; deltaCloud.resumeRead(); });
  await expect(page.getByText(/On this device.*File uploaded/)).toBeVisible();
  await page.getByRole('button',{ name:'Keep offline',exact:true }).click();
  await expect(page.getByText(/On this device.*Kept offline/)).toBeVisible();
  await expect(page.getByRole('button',{ name:'Release download',exact:true })).toBeDisabled();
  await page.getByRole('button',{ name:'Stop keeping offline',exact:true }).click();
  await page.getByRole('button',{ name:'Release download',exact:true }).click();
  await expect(page.getByText(/Cloud only.*File uploaded/)).toBeVisible();
  expect(await page.evaluate(async () => (await _bookshelf_.call('search')).length)).toBe(1);
});

test('out-of-order changes merge and offline competing edits remain conflicts until explicitly resolved', async ({ page }) => {
  await devices(page);
  const result = await page.evaluate(async () => {
    const transport = deltaCloud.transport;
    await _bookshelf_.configure(deviceB); await _bookshelf_.sync(transport);
    const entry = (await _bookshelf_.call('search'))[0];
    await _bookshelf_.configure(deviceA);
    await _bookshelf_.call('update',{ table:'entries',values:{ id:entry.id,metadata_json:JSON.stringify({ ...JSON.parse(entry.metadata_json),title:'From A' }) } });
    await _bookshelf_.configure(deviceB);
    await _bookshelf_.call('update',{ table:'entries',values:{ id:entry.id,metadata_json:JSON.stringify({ ...JSON.parse(entry.metadata_json),title:'From B' }) } });
    await _bookshelf_.sync(transport); await _bookshelf_.configure(deviceA); deltaCloud.reverse = true; await _bookshelf_.sync(transport);
    const conflict = (await _bookshelf_.call('conflicts'))[0];
    const chosen = conflict.alternatives.find(change => JSON.parse(JSON.parse(change.payload_json).metadata_json).title === 'From A');
    await _bookshelf_.call('resolveConflict',{ table:'entries',id:entry.id,revisionId:chosen.id,expectedRevisionIds:conflict.alternatives.map(change => change.id) });
    await _bookshelf_.sync(transport); await _bookshelf_.configure(deviceB); await _bookshelf_.sync(transport);
    return { alternatives:conflict.alternatives.length,title:JSON.parse((await _bookshelf_.call('search'))[0].metadata_json).title,
      conflicts:(await _bookshelf_.call('conflicts')).length,fileUploads:deltaCloud.calls.filter(call => call.kind === 'writeScore').length };
  });
  expect(result).toEqual({ alternatives:2,title:'From A',conflicts:0,fileUploads:1 });
});

test('a missing ancestor is not acknowledged, and a later complete inventory can be retried', async ({ page }) => {
  await devices(page);
  const result = await page.evaluate(async () => {
    const parent = [...deltaCloud.batches.entries()][0];
    const entry = (await _bookshelf_.call('search'))[0];
    await _bookshelf_.call('update',{ table:'entries',values:{ id:entry.id,metadata_json:JSON.stringify({ ...JSON.parse(entry.metadata_json),title:'Child revision' }) } });
    await _bookshelf_.sync(deltaCloud.transport);
    deltaCloud.batches.delete(parent[0]); await _bookshelf_.configure(deviceB);
    let failed = false; try { await _bookshelf_.sync(deltaCloud.transport); } catch { failed = true; }
    const empty = (await _bookshelf_.call('list')).length;
    deltaCloud.batches.set(...parent); deltaCloud.reverse = true; await _bookshelf_.sync(deltaCloud.transport);
    return { failed,empty,title:JSON.parse((await _bookshelf_.call('search'))[0].metadata_json).title };
  });
  expect(result).toEqual({ failed:true,empty:0,title:'Child revision' });
});

test('complete backup explicitly fetches cloud-only files while normal sync does not', async ({ page }) => {
  await devices(page,2);
  const bytes = await page.evaluate(async () => {
    await _bookshelf_.configure(deviceB); await _bookshelf_.sync(deltaCloud.transport);
    if (deltaCloud.calls.some(call => call.kind === 'readScore')) throw new Error('Normal sync downloaded score bytes');
    return [...new Uint8Array(await (await _bookshelf_.exportBackup()).arrayBuffer())];
  });
  const archive = unzipSync(new Uint8Array(bytes));
  expect(Object.keys(archive).filter(path => path.startsWith('scores/'))).toHaveLength(2);
});

test('automatic sync publishes after local saving, displays separate states and can be disabled persistently', async ({ page }) => {
  await installDeltaCloud(page);
  await page.evaluate(async () => {
    _bookshelf_.transport = deltaCloud.transport; _bookshelf_.autoSync.delay = 150; _bookshelf_.autoSync.interval = 1000;
    const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300,400]);
    await _bookshelf_.import(new File([await pdf.save()],'Automatic.pdf'));
    _menu_.notify('score/open/up');
  });
  await page.getByText('Library',{ exact:true }).click();
  await page.getByText('Backups and conflicting edits',{ exact:true }).click();
  await page.getByLabel('Automatic library sync').check();
  await expect.poll(() => page.evaluate(() => deltaCloud.batches.size)).toBe(1);
  await expect(page.getByLabel('Device save status')).toHaveText('Device: saved');
  await expect(page.getByLabel('Cloud sync status')).toContainText('Cloud: synced');
  await page.evaluate(async () => {
    _bookshelf_.autoSync.delay = 600;
    const entry = (await _bookshelf_.call('search'))[0];
    await _bookshelf_.call('update',{ table:'entries',values:{ id:entry.id,metadata_json:JSON.stringify({ ...JSON.parse(entry.metadata_json),title:'Saved locally first' }) } });
  });
  await expect(page.getByLabel('Device save status')).toHaveText('Device: saved');
  await expect(page.getByLabel('Cloud sync status')).toContainText('waiting to sync');
  await expect.poll(() => page.evaluate(() => deltaCloud.batches.size)).toBe(2);
  expect(await page.evaluate(() => deltaCloud.calls.filter(call => call.kind === 'writeScore').length)).toBe(1);
  await page.getByLabel('Automatic library sync').uncheck();
  await page.evaluate(async () => { await _bookshelf_.call('update',{ table:'tags',values:{ id:crypto.randomUUID(),name:'Do not auto send' } }); });
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => deltaCloud.batches.size)).toBe(2);
  await page.reload(); await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  await page.evaluate(() => _menu_.notify('score/open/up')); await page.getByText('Library',{ exact:true }).click();
  await page.getByText('Backups and conflicting edits',{ exact:true }).click();
  await expect(page.getByLabel('Automatic library sync')).not.toBeChecked();
});

test('offline auto-sync keeps local changes and resumes after the online event', async ({ page,context }) => {
  await installDeltaCloud(page);
  await page.evaluate(() => _bookshelf_.call('open'));
  await page.evaluate(() => { _bookshelf_.transport = deltaCloud.transport; _bookshelf_.autoSync.delay = 50; _bookshelf_.autoSync.interval = 100; });
  await context.setOffline(true);
  await page.evaluate(async () => {
    await _bookshelf_.setAutoSync(true);
    const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300,400]); await _bookshelf_.import(new File([await pdf.save()],'Offline edit.pdf'));
  });
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => deltaCloud.batches.size)).toBe(0);
  expect(await page.evaluate(() => _bookshelf_.cloudStatus())).toContain('offline');
  await context.setOffline(false);
  await expect.poll(() => page.evaluate(() => deltaCloud.batches.size)).toBe(1);
  await page.evaluate(() => _bookshelf_.setAutoSync(false));
});

test('automatic sync never opens an interactive sign-in dialog', async ({ page }) => {
  await page.evaluate(async () => {
    const source = _FileSrc_.get('Drive'); source.tokens = null;
    source.authPopupOpen = () => { throw new Error('Interactive popup must not be opened'); };
    _bookshelf_.cloudSelection = { source:'Drive',path:'' }; _bookshelf_.autoSync.delay = 50; _bookshelf_.autoSync.interval = 100;
    await _bookshelf_.setAutoSync(true); _menu_.notify('score/open/up');
  });
  await page.getByText('Library',{ exact:true }).click();
  await expect(page.getByLabel('Cloud sync status')).toContainText('sign-in required');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.evaluate(() => _bookshelf_.setAutoSync(false));
});

test('automatic receiving reloads an affected score only, preserving received ink', async ({ page }) => {
  const [id] = await devices(page);
  await page.evaluate(async id => {
    await _bookshelf_.configure(deviceB); await _bookshelf_.sync(deltaCloud.transport);
    const score = await _bookshelf_.openDocument(id), pg = await score.pgUse(1,false);
    pg.canvas.add(new fabric.Circle({ left:20,top:30,radius:8,fill:'green' })); score.setDirty(true); await _bookshelf_.flush(score);
    await _bookshelf_.sync(deltaCloud.transport);
    await _bookshelf_.configure(deviceA); await _bookshelf_.openDocument(id); window.beforeIncoming = _score_;
    _bookshelf_.transport = deltaCloud.transport; _bookshelf_.autoSync.delay = 50; _bookshelf_.autoSync.interval = 100;
    await _bookshelf_.setAutoSync(true);
  },id);
  await expect.poll(() => page.evaluate(async () => {
    if (!_score_ || _score_ === beforeIncoming) return '';
    return (await _score_.pgUse(1,false)).canvas.getObjects()[0]?.fill || '';
  })).toBe('green');
  await page.evaluate(() => _bookshelf_.setAutoSync(false));
});

test('cloud provider publishes readable score files before immutable JSON batches and ignores pending names', async ({ page }) => {
  await installProviderCloud(page);
  const result = await page.evaluate(async () => {
    const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300,400]);
    await _bookshelf_.import(new File([await pdf.save()],'Readable name.pdf'));
    await _bookshelf_.syncCloud('pCloud','My library');
    return providerCloud.calls.filter(call => call.kind === 'publish');
  });
  expect(result[0]).toMatchObject({ path:'/My library/scores' }); expect(result[0].name).toContain('__Readable name.pdf');
  expect(result[1].path).toMatch(/^\/My library\/changes\//); expect(result[1].name).toMatch(/\.json$/);
});

test('overlapping silent transfers restore foreground authentication after the last transfer', async ({ page }) => {
  await installProviderCloud(page);
  expect(await page.evaluate(async () => {
    const a = _bookshelf_.makeCloudTransport('pCloud','My library');
    const b = _bookshelf_.makeCloudTransport('pCloud','My library');
    let endA, endB;
    const first = a.background(() => new Promise(resolve => { endA = resolve; }));
    const second = b.background(() => new Promise(resolve => { endB = resolve; }));
    const during = providerCloud.source.backgroundAuth;
    endA(); await first;
    const afterFirst = providerCloud.source.backgroundAuth;
    endB(); await second;
    return { during,afterFirst,afterBoth:!!providerCloud.source.backgroundAuth };
  })).toEqual({ during:true,afterFirst:true,afterBoth:false });
});

test('connecting a destination excludes automatic sync and a second destination change', async ({ page }) => {
  await installProviderCloud(page);
  expect(await page.evaluate(async () => {
    let resume, calls = 0;
    providerCloud.source.auth = async () => { calls++; await new Promise(resolve => { resume = resolve; }); };
    _bookshelf_.cloudSelection = { source:'pCloud',path:'My library' };
    const connecting = _bookshelf_.syncCloud('pCloud','My library');
    _bookshelf_.autoSync.interval = 30; _bookshelf_.autoSync.setEnabled(true);
    let secondBlocked = false, storageBlocked = false;
    try { await _bookshelf_.syncCloud('pCloud','Another library'); } catch { secondBlocked = true; }
    try { await _bookshelf_.configure({ kind:'indexeddb',name:'do-not-switch' }); } catch { storageBlocked = true; }
    await new Promise(resolve => setTimeout(resolve,100));
    const callsWhileConnecting = calls;
    _bookshelf_.autoSync.setEnabled(false); resume(); await connecting;
    return { secondBlocked,storageBlocked,callsWhileConnecting,connecting:!!_bookshelf_.cloudConnecting };
  })).toEqual({ secondBlocked:true,storageBlocked:true,callsWhileConnecting:1,connecting:false });
});

test('release verifies the remote body and blocks concurrent open or library changes', async ({ page }) => {
  const [id] = await devices(page);
  const result = await page.evaluate(async id => {
    deltaCloud.corrupt = true;
    let corrupt = false; try { await _bookshelf_.releaseDownload(id); } catch { corrupt = true; }
    const retained = !!(await _bookshelf_.call('fileInfo',{ id })).file;
    deltaCloud.corrupt = false; deltaCloud.pauseRead = true;
    const release = _bookshelf_.releaseDownload(id);
    while (!deltaCloud.resumeRead) await new Promise(resolve => setTimeout(resolve,10));
    let openBlocked = false, configureBlocked = false;
    try { await _bookshelf_.ensureFile(id); } catch { openBlocked = true; }
    try { await _bookshelf_.configure(deviceB); } catch { configureBlocked = true; }
    deltaCloud.pauseRead = false; deltaCloud.resumeRead(); await release;
    return { corrupt,retained,openBlocked,configureBlocked,released:!(await _bookshelf_.call('fileInfo',{ id })).file };
  },id);
  expect(result).toEqual({ corrupt:true,retained:true,openBlocked:true,configureBlocked:true,released:true });
});

test('standalone file URL sync downloads on demand and cached scores reopen after an offline restart', async ({ page,context }) => {
  await page.goto(pathToFileURL(path.resolve('build/rostrum.html')).href);
  await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  const [id] = await devices(page);
  await page.evaluate(async id => {
    await _bookshelf_.configure(deviceB); await _bookshelf_.sync(deltaCloud.transport);
    if ((await _bookshelf_.call('fileInfo',{ id })).file) throw new Error('Metadata sync downloaded a score');
    await _bookshelf_.keepOffline([id]);
  },id);
  await context.setOffline(true);
  await page.reload(); await page.waitForFunction(() => !!window._bookshelf_ && !!window._menu_);
  expect(await page.evaluate(async id => (await _bookshelf_.openDocument(id)).pgs.length,id)).toBe(1);
  await context.setOffline(false);
});
