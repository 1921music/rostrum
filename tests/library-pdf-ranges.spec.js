const { test, expect } = require('@playwright/test');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const {selectLibraryView} = require('./library-ui-helpers');

test.beforeEach(async ({ page }) => {
  page.external = [];
  await page.context().route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:9876/') || url.startsWith(pathToFileURL(path.resolve('build')).href + '/')) return route.continue();
    if (url === 'https://accounts.google.com/gsi/client') return route.fulfill({contentType:'application/javascript',body:'window.google={accounts:{oauth2:{}}};'});
    page.external.push(url); return route.abort();
  });
});
test.afterEach(async ({ page }) => expect(page.external).toEqual([]));

for(const url of ['/pod.html','/rostrum.html',pathToFileURL(path.resolve('build/rostrum.html')).href])test(`Songs navigates the open PDF without reopening it (${url})`,async({page})=>{
  test.setTimeout(60000);
  await page.goto(url);await page.waitForFunction(()=>window._bookshelf_&&window._menu_&&window.PDFLib);
  await page.evaluate(async()=>{
    await _bookshelf_.configure({kind:'indexeddb'});
    const pdf=await PDFLib.PDFDocument.create();for(let i=0;i<5;i++)pdf.addPage([300,400]);
    const doc=await _bookshelf_.import(new File([await pdf.save()],'Songs.pdf'));
    await _bookshelf_.addSong(doc,'Later song',2);await _bookshelf_.addSong(doc,'First song',0);
    const score=await _bookshelf_.openDocument(doc.id,{type:'pdf',pageIndex:0});
    const pg=await score.pgUse(1,false);pg.canvas.add(new fabric.Circle({left:30,top:40,radius:8,fill:'red'}));
    score.pgAdd(new pg.constructor(score,300,400,{objects:[]}),1);score.setDirty(true);
    window.songNav={score,pdf:score.mozDoc,undos:score.undoStack.length,loads:0,opened:0};
    const lib=window.pdfjsLib;window.pdfjsLib={...lib,getDocument(...args){songNav.loads++;return lib.getDocument(...args);}};
    document.addEventListener('scoreOpened',()=>songNav.opened++);
  });
  for(const [title,pn]of [['Later song',4],['First song',2]]){
    await page.evaluate(()=>_menu_.notify('score/library/up'));
    await selectLibraryView(page,'entries');await page.getByRole('button',{name:title,exact:true}).click();
    const open=page.getByRole('button',{name:'Open score',exact:true});if(await open.isVisible())await open.click();
    await expect.poll(()=>page.evaluate(()=>Number(_score_?.numbers.pn))).toBe(pn);
    expect(await page.evaluate(()=>({same:_score_===songNav.score,pdf:_score_.mozDoc===songNav.pdf,loads:songNav.loads,opened:songNav.opened,undoSame:_score_.undoStack.length===songNav.undos})))
      .toEqual({same:true,pdf:true,loads:0,opened:0,undoSame:true});
  }
  expect(await page.evaluate(async()=>{
    const state=await _bookshelf_.call('read',{id:_score_.libraryDocumentId});
    return {ink:state.annotations.length,originalPage:_score_.pgs[Number(_score_.numbers.pn)-1].mozPn};
  })).toEqual({ink:1,originalPage:1});
  const missing=await page.evaluate(async()=>{try{await _bookshelf_.openDocument(_score_.libraryDocumentId,{type:'pdf',pageIndex:99});}catch(error){return error.message;}});
  expect(missing).toContain('indexed page is not present');
  expect(await page.evaluate(()=>_score_===songNav.score&&!_score_.disposed&&!_bookshelf_.opening)).toBe(true);
});

for (const [url,storage] of [['/pod.html',null],['/rostrum.html','indexeddb'],[pathToFileURL(path.resolve('build/rostrum.html')).href,'indexeddb']]) {
  test(`local library PDF opens selected page using partial reads (${url})`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await page.goto(url);
    await page.waitForFunction(() => window._bookshelf_ && window._menu_ && window.PDFLib);
    if (storage) await page.evaluate(storage => _bookshelf_.configure({kind:storage}),storage);
    const imported = await page.evaluate(async () => {
      const pdf = await PDFLib.PDFDocument.create();
      for (let i = 0; i < 40; i++) {
        const pg = pdf.addPage(i === 35 ? [900,1100] : [300,400]);
        if (i === 28) pg.setRotation(PDFLib.degrees(90));
        pg.drawRectangle({x:0,y:0,width:pg.getWidth(),height:pg.getHeight(),color:PDFLib.rgb(0.2,0.4,0.6)});
        pdf.context.register(pdf.context.stream(new Uint8Array(256 * 1024)));
      }
      // An unused, uncompressed stream makes full reads visible without costly
      // image rendering. The ordinary xref PDF is deliberately not linearized.
      pdf.context.register(pdf.context.stream(new Uint8Array(2 * 1024 * 1024)));
      const file = new File([await pdf.save({useObjectStreams:false})],'Large.pdf');
      const doc = await _bookshelf_.import(file);
      const settings = JSON.parse(doc.settings_json);
      return {id:doc.id,size:file.size,settings};
    });
    expect(imported.settings).toEqual({maxWidth:900,maxHeight:1100});
    // Reopen storage from disk; no preview document or byte cache survives.
    await page.reload();
    await page.waitForFunction(() => window._bookshelf_ && window._menu_);
    await page.evaluate(() => {
      window.pdfProbe = {reads:[],pages:[],renders:[]};
      const read = Blob.prototype.arrayBuffer;
      Blob.prototype.arrayBuffer = function (...args) {
        pdfProbe.reads.push(this.size); return read.apply(this,args);
      };
      const wrap = lib => ({...lib,getDocument(options) {
        pdfProbe.range = !!options.range; pdfProbe.buffer = !!options.data;
        const task = lib.getDocument(options);
        task.promise.then(doc => {
          const getPage = doc.getPage.bind(doc);
          doc.getPage = async pn => {
            pdfProbe.pages.push(pn);
            const pg = await getPage(pn);
            if (!pg.probed) {
              pg.probed = true;
              const render = pg.render.bind(pg);
              pg.render = options => {pdfProbe.renders.push(pn); return render(options);};
            }
            return pg;
          };
        });
        return task;
      }});
      let lib = window.pdfjsLib && wrap(window.pdfjsLib);
      Object.defineProperty(window,'pdfjsLib',{configurable:true,get:() => lib,set:value => {lib = wrap(value);}});
    });
    await page.evaluate(id => _bookshelf_.openDocument(id,{type:'pdf',pageIndex:28}),imported.id);
    await page.waitForFunction(() => _score_?.pgs[28].mozCanvas && !_score_.pgs[28].renderTask);
    const opened = await page.evaluate(async () => {
      await Promise.allSettled([..._score_.pendingInflates]);
      return {probe:pdfProbe,max:[_score_.maxWidth,_score_.maxHeight],
        pixel:[..._score_.pgs[28].mozCanvas.getContext('2d').getImageData(100,100,1,1).data],
        dimensions:[_score_.pgs[28].width,_score_.pgs[28].height],
        unknown:_score_.pgs.filter(pg => pg.width == null).length,
        frame:[_menu_.rings.layout.cells.book.geo.pgWidth,_menu_.rings.layout.cells.book.geo.pgHeight]};
    });
    expect(opened.probe.range).toBe(true);
    expect(opened.probe.buffer).toBe(false);
    expect(opened.probe.renders[0]).toBe(29);
    expect(opened.probe.pages).not.toContain(1);
    expect(new Set(opened.probe.pages).size).toBeLessThan(12);
    expect(opened.probe.reads.reduce((a,b) => a+b,0)).toBeLessThan(imported.size / 2);
    await testInfo.attach('range-reads.json',{contentType:'application/json',body:JSON.stringify({
      fileBytes:imported.size,readBytes:opened.probe.reads.reduce((a,b) => a+b,0),
      readCount:opened.probe.reads.length,firstRenderedPage:opened.probe.renders[0],unknownPages:opened.unknown})});
    expect(opened.max).toEqual([900,1100]);
    expect(opened.dimensions).toEqual([400,300]);
    expect(opened.pixel).toEqual([51,102,153,255]);
    expect(opened.unknown).toBeGreaterThan(25);
    expect(opened.frame[1] / opened.frame[0]).toBeCloseTo(1100/900,2);

    const saved = await page.evaluate(async () => {
      _score_.pgs[28].bookmark = '#ff0000'; _score_.setDirty();
      await _bookshelf_.flush(_score_);
      return JSON.parse((await _bookshelf_.call('read',{id:_score_.libraryDocumentId})).document.settings_json);
    });
    expect(saved.maxWidth).toBe(900); expect(saved.maxHeight).toBe(1100);
    expect(saved.pages.every(pg => !('width' in pg) && !('height' in pg))).toBe(true);
    await page.evaluate(async id => {
      await _score_.dispose();
      await _bookshelf_.openDocument(id,{type:'pdf',pageIndex:35});
    },imported.id);
    await page.waitForFunction(() => _score_?.pgs[35].mozCanvas);
    expect(await page.evaluate(() => [_score_.pgs[35].width,_score_.pgs[35].height,_score_.pgs[28].bookmark])).toEqual([900,1100,'#ff0000']);
    const exported = await page.evaluate(async () => {
      const file = await _score_.toPdf();
      const pdf = await PDFLib.PDFDocument.load(file);
      return {count:pdf.getPageCount(),rotation:pdf.getPage(28).getRotation().angle};
    });
    expect(exported).toEqual({count:40,rotation:90});
  });
}

test('a local range read failure rejects opening and permits retry', async ({page}) => {
  await page.goto('/pod.html');
  await page.waitForFunction(() => window._bookshelf_ && window._menu_ && window.PDFLib);
  const result = await page.evaluate(async () => {
    const pdf = await PDFLib.PDFDocument.create(); pdf.addPage([300,400]);
    const doc = await _bookshelf_.import(new File([await pdf.save()],'Retry.pdf'));
    const read = Blob.prototype.arrayBuffer;
    Blob.prototype.arrayBuffer = async function () {throw new Error('Local read failed');};
    let error;
    try {await _bookshelf_.openDocument(doc.id);}
    catch (failure) {error = failure.message;}
    finally {Blob.prototype.arrayBuffer = read;}
    const released = !_bookshelf_.opening;
    await _bookshelf_.openDocument(doc.id,{type:'pdf',pageIndex:0});
    return {error,released,rendered:!!_score_.pgs[0].mozCanvas};
  });
  expect(result).toEqual({error:'Local read failed',released:true,rendered:true});
});

test('added blank pages retain dimensions while unvisited PDF pages stay lazy', async ({page}) => {
  await page.goto('/pod.html');
  await page.waitForFunction(() => window._bookshelf_ && window._menu_ && window.PDFLib);
  const result = await page.evaluate(async () => {
    const pdf = await PDFLib.PDFDocument.create();
    for (let i = 0; i < 16; i++) pdf.addPage(i === 14 ? [900,1100] : [300,400]);
    const doc = await _bookshelf_.import(new File([await pdf.save()],'Edited.pdf'));
    const score = await _bookshelf_.openDocument(doc.id,{type:'pdf',pageIndex:5});
    score.pgAdd(new score.pgs[0].constructor(score,1200,600,{objects:[]}),1);
    await _bookshelf_.flush(score);
    const settings = JSON.parse((await _bookshelf_.call('read',{id:doc.id})).document.settings_json);
    await score.dispose();
    const restored = await _bookshelf_.openDocument(doc.id,{type:'pdf',pageIndex:5});
    const unknown = restored.pgs.filter(pg => pg.width == null).length;
    const pn = restored.numbers.pn;
    const exported = await PDFLib.PDFDocument.load(await restored.toPdf());
    return {blank:[settings.pages[0].width,settings.pages[0].height],
      lazy:settings.pages.filter(pg => pg.mozPn).every(pg => !('width' in pg) && !('height' in pg)),
      max:[restored.maxWidth,restored.maxHeight],pn,unknown,
      count:exported.getPageCount(),exportedBlank:exported.getPage(0).getSize()};
  });
  expect(result).toMatchObject({blank:[1200,600],lazy:true,max:[1200,1100],pn:7,count:17,exportedBlank:{width:1200,height:600}});
  expect(result.unknown).toBeGreaterThan(5);
});
