const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
 page.external=[];page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin==='http://127.0.0.1:9876'||['data:','blob:'].includes(u.protocol))return r.continue();page.external.push(u.href);return r.abort();});
});
test.afterEach(async({page})=>{expect(page.external).toEqual([]);expect(page.errors).toEqual([]);});
const panel=page=>page.locator('[data-tag=ScreenPanel] .Panel__elm');
async function start(page,url){
 await page.goto(url);await page.waitForFunction(()=>!!window._menu_);
 await page.evaluate(async()=>{_menu_.rings.score.cells.new.stash.pages=2;await _menu_.notify('score/new/up');_menu_.showPanel(_menu_.rings.layout.cells.display);});
 await page.getByRole('button',{name:'Position and zoom',exact:true}).click();
 await expect(panel(page)).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>_panels_.screen.elm.getAnimations({subtree:true}).length)).toBe(0);
}
async function state(page){return page.evaluate(()=>({
 score:{font:parseFloat(getComputedStyle(_Layout_.activeLayout.elm).fontSize),x:_Layout_.activeLayout.elm.offsetLeft,y:_Layout_.activeLayout.elm.offsetTop},
 menu:{font:parseFloat(getComputedStyle(_menu_.elm).fontSize),x:_menu_.elm.offsetLeft,y:_menu_.elm.offsetTop},
 controls:_panels_.screen ? {font:getComputedStyle(_panels_.screen.elm).fontSize,x:_panels_.screen.elm.offsetLeft,y:_panels_.screen.elm.offsetTop} : null
}));}
for(const url of ['/pod.html','/rostrum.html']){
 test(`named target, size and direction controls adjust only the chosen item (${url})`,async({page})=>{
  await start(page,url);const p=panel(page),select=p.getByRole('combobox',{name:'Adjust item'});
  await expect(select.locator('option:checked')).toHaveText('Score');
  const before=await state(page);
  await p.getByRole('button',{name:'Larger',exact:true}).click();
  let after=await state(page);expect(after.score.font).toBeCloseTo(before.score.font*1.1,2);expect(after.menu).toEqual(before.menu);expect(after.controls).toEqual(before.controls);
  await p.getByRole('button',{name:'Right',exact:true}).click();await p.getByRole('button',{name:'Up',exact:true}).click();
  after=await state(page);expect(after.score.x).toBe(before.score.x+5);expect(after.score.y).toBe(before.score.y-5);
  await p.getByRole('button',{name:'Restore size and position',exact:true}).click();expect((await state(page)).score).toEqual(before.score);
  await select.selectOption({label:'Circular menu'});
  const smaller=p.getByRole('button',{name:'Smaller',exact:true});await smaller.focus();await page.keyboard.press('Enter');
  after=await state(page);expect(after.menu.font).toBeCloseTo(before.menu.font/1.1,2);expect(after.score).toEqual(before.score);
  await expect(select.locator('option:checked')).toHaveText('Circular menu');
  await p.getByRole('button',{name:'Restore size and position',exact:true}).click();expect((await state(page)).menu).toEqual(before.menu);
 });
 test(`all-items size control leaves its own panel readable and movement is disabled (${url})`,async({page})=>{
  await start(page,url);const p=panel(page);await p.getByRole('combobox',{name:'Adjust item'}).selectOption({label:'All visible items'});
  for(const name of ['Up','Down','Left','Right'])await expect(p.getByRole('button',{name,exact:true})).toBeDisabled();
  const before=await state(page);await p.getByRole('button',{name:'Larger',exact:true}).click();const after=await state(page);
  expect(after.score.font).toBeCloseTo(before.score.font*1.1,2);expect(after.menu.font).toBeCloseTo(before.menu.font*1.1,2);expect(after.controls).toEqual(before.controls);
  await p.getByRole('button',{name:'Restore size and position',exact:true}).click();expect(await state(page)).toEqual(before);
 });
 test(`hold ends on release or close, and reopening defaults to the score (${url})`,async({page})=>{
  await start(page,url);const p=panel(page);await p.getByRole('combobox',{name:'Adjust item'}).selectOption({label:'Circular menu'});
  const larger=p.getByRole('button',{name:'Larger',exact:true});const box=await larger.boundingBox();const before=await state(page);
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(650);await page.mouse.move(10,10);await page.mouse.up();
  const released=await state(page);expect(released.menu.font).toBeGreaterThan(before.menu.font*1.1);await page.waitForTimeout(350);expect((await state(page)).menu.font).toBe(released.menu.font);
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await page.evaluate(()=>_panels_.screen.closer.click());await page.mouse.up();const closed=await state(page);await page.waitForTimeout(600);expect((await state(page)).menu.font).toBe(closed.menu.font);
  await page.evaluate(()=>_menu_.showPanel(_menu_.rings.app.cells.screen));await expect(panel(page).getByRole('combobox',{name:'Adjust item'}).locator('option:checked')).toHaveText('Score');
 });
 test(`named controls fit a narrow viewport (${url})`,async({page})=>{
  await page.setViewportSize({width:390,height:844});await start(page,url);const p=panel(page);
  await expect(p.getByRole('button',{name:'Restore size and position',exact:true})).toBeVisible();
  await expect.poll(async()=>{const b=await p.boundingBox();return b.x>=0&&b.y>=0&&b.x+b.width<=391&&b.y+b.height<=845;}).toBe(true);
  await p.getByRole('combobox',{name:'Adjust item'}).selectOption({label:'Circular menu'});await expect(p.getByRole('button',{name:'Larger',exact:true})).toBeEnabled();
 });
}
