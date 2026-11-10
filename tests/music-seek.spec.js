const fs=require('node:fs'),path=require('node:path');
const {test,expect}=require('@playwright/test');
const baseXml=fs.readFileSync(path.join(__dirname,'../engine/test/playback.musicxml'),'utf8');
const xml=baseXml.replaceAll('<measure number="2">','<measure number="2"><print new-page="yes"/>')
 .replaceAll('</part>','<measure number="3"><print new-page="yes"/><note><rest/><duration>4</duration><type>whole</type></note></measure><measure number="4"><print new-page="yes"/><note><rest/><duration>4</duration><type>whole</type></note></measure></part>');
test.beforeEach(async({page})=>{
 const external=[];page.__external=external;page.__errors=[];page.on('pageerror',e=>page.__errors.push(e.message));
 await page.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:9876/'))return r.continue();if(u==='https://accounts.google.com/gsi/client')return r.fulfill({contentType:'application/javascript',body:'window.google={accounts:{oauth2:{}}};'});external.push(u);return r.abort();});
 await page.goto('/podium.html');await page.waitForFunction(()=>!!window._Score_&&!!window._menu_);
});
test.afterEach(async({page})=>{expect(page.__external).toEqual([]);expect(page.__errors).toEqual([]);});
for(const layoutKey of ['book','horizontal','vertical'])test(`${layoutKey}: mode starts on visible page; paused seek follows pages and note taps`,async({page})=>{
 test.setTimeout(60000);
 await page.evaluate(async({xml,layoutKey})=>{
  _menu_.rings.layout.stash.active=layoutKey;
  if(layoutKey!=='book')_menu_.rings.layout.cells[layoutKey].stash.pgShow=1;
  await new _Score_().init('Local',null,'seek.musicxml',new TextEncoder().encode(xml));
  await _Layout_.activeLayout.pgGoTo(2,false);
 },{xml,layoutKey});
 await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
 const before=await page.evaluate(()=>{const r=_score_.pgs[1].musicSvg.getBoundingClientRect();return {left:r.left,top:r.top};});
 await page.evaluate(()=>_menu_.notify('score/playback/up'));
 const bar=page.locator('[data-tag="PlaybackPanel"]');
 await expect(bar).toBeVisible();
 const initial=await page.evaluate(()=>{const p=_score_.music.player,r=_score_.pgs[1].musicSvg.getBoundingClientRect();return {state:p.state,page:p.tracking.system.page,worker:p.worker||null,left:r.left,top:r.top};});
 expect(initial.state).toBe('paused');expect(initial.page).toBe(1);expect(initial.worker).toBe(null);
 expect(initial.left).toBeCloseTo(before.left,0);expect(initial.top).toBeCloseTo(before.top,0);
 await expect(page.locator('[data-tag="PlaybackMixer"]')).not.toBeVisible();
 await bar.locator('[data-mixer-button]').click();expect(await page.locator('[data-tag="PlaybackMixer"]').evaluate(n=>n.matches(':modal'))).toBe(false);
 await page.locator('[data-mixer-close]').click();
 await bar.locator('[data-follow]').uncheck();
 await bar.locator('[data-rewind]').click();
 await expect.poll(()=>page.evaluate(()=>Number(_score_.numbers.pn))).toBe(1);
 await expect.poll(()=>page.evaluate(()=>_score_.music.player.position)).toBe(0);
 const note=await page.evaluate(()=>_score_.music.player.timeline.visual.notes.find(n=>n.start===0.5&&n.visit===0));
 const box=await page.locator(`[data-note-id="${note.id}"]`).first().boundingBox();
 await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 expect(await page.evaluate(()=>_score_.music.player.position)).toBe(0.5);
 expect(await page.evaluate(()=>Number(_score_.numbers.pn))).toBe(1); // the note tap must not turn a page
 await bar.locator('[data-seek]').evaluate(n=>{for(const t of [8.1,0.1,8.2,0.2,8.3]){n.value=t;n.dispatchEvent(new Event('input',{bubbles:true}));}});
 await expect.poll(()=>page.evaluate(()=>Number(_score_.numbers.pn))).toBe(2);
 expect(await page.evaluate(()=>_score_.music.player.position)).toBe(8.3);
 await bar.locator('[data-play]').click();await expect.poll(()=>page.evaluate(()=>_score_.music.player.state)).toBe('playing');
 await expect(bar.locator('[data-seek]')).toBeEnabled();await expect(bar.locator('[data-rewind]')).toBeEnabled();
 expect(await page.evaluate(()=>_score_.music.player.seek(8.5))).toBe(true);
 await expect.poll(()=>page.evaluate(()=>_score_.music.player.state)).toBe('playing');
 await bar.locator('[data-play]').click();await expect(bar.locator('[data-seek]')).toBeEnabled();
 await bar.locator('[data-close]').click();await expect(bar).toHaveCount(0);
 expect(await page.evaluate(()=>_score_.music.player.state)).toBe('stopped');
 await page.evaluate(()=>_menu_.notify('score/playback/up'));await expect(bar).toBeVisible();
 await page.evaluate(()=>_menu_.notify('score/playback/up'));await expect(bar).toHaveCount(0);
});

test('blank page taps still turn pages while paused',async({page})=>{
 await page.evaluate(async xml=>{_menu_.rings.layout.stash.active='horizontal';_menu_.rings.layout.cells.horizontal.stash.pgShow=1;await new _Score_().init('Local',null,'pages.musicxml',new TextEncoder().encode(xml));_menu_.notify('score/playback/up');},xml);
 await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
 const p=await page.evaluate(()=>{const r=_score_.pgs[0].elm.getBoundingClientRect();return {x:r.left+r.width*.85,y:r.top+r.height*.65};});
 await page.mouse.click(p.x,p.y,{delay:80});
 await expect.poll(()=>page.evaluate(()=>Number(_score_.numbers.pn))).toBeGreaterThan(1);
 expect(await page.evaluate(()=>_score_.music.player.state)).toBe('paused');
});


test('dragging the toolbar slider scrubs silently and reveals the destination',async({page})=>{
 await page.evaluate(async xml=>{_menu_.rings.layout.stash.active='horizontal';await new _Score_().init('Local',null,'drag.musicxml',new TextEncoder().encode(xml));_menu_.notify('score/playback/up');},xml);
 const seek=page.locator('[data-tag="PlaybackPanel"] [data-seek]');
 await expect(seek).toBeEnabled();
 await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
 const r=await seek.boundingBox();
 await page.mouse.move(r.x+8,r.y+r.height/2);await page.mouse.down();
 await page.mouse.move(r.x+r.width*.55,r.y+r.height/2,{steps:10});await page.mouse.up();
 await expect.poll(()=>page.evaluate(()=>Number(_score_.numbers.pn))).toBe(2);
 const state=await page.evaluate(()=>{const p=_score_.music.player;return{position:p.position,state:p.state,worker:p.worker||null};});
 expect(state.state).toBe('paused');expect(state.worker).toBe(null);
 expect(state.position).toBeGreaterThan(10);expect(state.position).toBeLessThan(12);
});


for(const layoutKey of ['book','horizontal','vertical'])test(`${layoutKey}: playing seek controls and note taps preserve playback`,async({page})=>{
 test.setTimeout(60000);
 await page.evaluate(async({xml,layoutKey})=>{
  _menu_.rings.layout.stash.active=layoutKey;
  if(layoutKey!=='book')_menu_.rings.layout.cells[layoutKey].stash.pgShow=1;
  await new _Score_().init('Local',null,'playing-seek.musicxml',new TextEncoder().encode(xml));
  _menu_.notify('score/playback/up');
 },{xml,layoutKey});
 await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
 const bar=page.locator('[data-tag="PlaybackPanel"]'),seek=bar.locator('[data-seek]');
 await bar.locator('[data-play]').click();await expect.poll(()=>page.evaluate(()=>_score_.music.player.state)).toBe('playing');
 await expect(seek).toBeEnabled();await expect(bar.locator('[data-rewind]')).toBeEnabled();
 await expect(bar.getByLabel('Volume',{exact:true})).toBeVisible();
 const note=await page.evaluate(()=>_score_.music.player.timeline.visual.notes.find(n=>n.start===1&&n.visit===0));
 const head=page.locator(`[data-note-id="${note.id}"]`).first(),box=await head.boundingBox();
 await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 await expect.poll(()=>page.evaluate(()=>_score_.music.player.state)).toBe('playing');
 const tapped=await page.evaluate(()=>({position:_score_.music.player.position,page:Number(_score_.numbers.pn)}));
 expect(tapped.position).toBeGreaterThan(0.8);expect(tapped.position).toBeLessThan(1.5);expect(tapped.page).toBe(1);
 await bar.locator('[data-rewind]').click();await expect.poll(()=>page.evaluate(()=>_score_.music.player.state)).toBe('playing');
 expect(await page.evaluate(()=>_score_.music.player.position)).toBeLessThan(0.6);
 const r=await seek.boundingBox();
 await page.mouse.move(r.x+8,r.y+r.height/2);await page.mouse.down();
 await page.mouse.move(r.x+r.width*.4,r.y+r.height/2,{steps:4});
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.mouse.up();
 await expect.poll(()=>page.evaluate(()=>_score_.music.player.state)).toBe('playing');
 expect(await page.evaluate(()=>_score_.music.player.position)).toBeLessThan(0.8);
 await page.mouse.move(r.x+8,r.y+r.height/2);await page.mouse.down();
 await page.mouse.move(r.x+r.width*.55,r.y+r.height/2,{steps:8});
 const held=await page.evaluate(()=>{const p=_score_.music.player;return{state:p.state,time:p.position,sources:p.sources.size,worker:p.worker||null};});
 expect(held.state).toBe('paused');expect(held.sources).toBe(0);expect(held.worker).toBe(null);
 await page.waitForTimeout(100);expect(await page.evaluate(()=>_score_.music.player.position)).toBe(held.time);
 await page.mouse.up();await expect.poll(()=>page.evaluate(()=>_score_.music.player.state)).toBe('playing');
 await expect.poll(()=>page.evaluate(()=>Number(_score_.numbers.pn))).toBe(2);
 expect(await page.evaluate(()=>_score_.music.player.position)).toBeGreaterThan(10);
 await page.screenshot({path:`build/playing-seek-${layoutKey}.png`});
 // Closing while a drag is held must cancel automatic resume.
 await page.mouse.move(r.x+r.width*.55,r.y+r.height/2);await page.mouse.down();
 await page.evaluate(()=>_panels_.playback.close());await page.mouse.up();await page.waitForTimeout(150);
 expect(await page.evaluate(()=>_score_.music.player.state)).toBe('stopped');await expect(bar).toHaveCount(0);
});
