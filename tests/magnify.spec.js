const {test,expect}=require('@playwright/test');
test.use({viewport:{width:1440,height:960},hasTouch:true});
test.beforeEach(async({page})=>{
 page.external=[];page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin==='http://127.0.0.1:9876'||['data:','blob:'].includes(u.protocol))return r.continue();page.external.push(u.href);return r.abort();});
});
test.afterEach(async({page})=>{expect(page.external).toEqual([]);expect(page.errors).toEqual([]);});
async function setup(page,url,layout){
 await page.goto(url);await page.waitForFunction(()=>!!window._menu_);
 await page.evaluate(async layout=>{
  const doc=await PDFLib.PDFDocument.create(),pdf=doc.addPage([300,400]);
  pdf.drawRectangle({x:0,y:0,width:300,height:400,color:PDFLib.rgb(1,0,0)});
  pdf.drawRectangle({x:150,y:0,width:150,height:400,color:PDFLib.rgb(0,0,1)});
  const score=await new _Score_().init(_Score_.sources.local,null,'Magnify.pdf',await doc.save());await score.activate();
  _panels_.library?.close();await _Layout_.open(_menu_.rings.layout.cells[layout]);
  const pg=await score.pgUse(1,false);
  pg.canvas.add(new fabric.Rect({left:30,top:50,width:60,height:60,fill:'#00ff00',strokeWidth:0}));pg.canvas.renderAll();
 },layout);
 await page.waitForFunction(()=>_score_.pgs[0].mozCanvas && _score_.pgs[0].elm.isConnected);
 await page.evaluate(()=>{_menu_.activateRing(_menu_.rings.layout);});
}
async function placePanel(page){
 await page.evaluate(()=>{_menu_.park();const p=_panels_.magnify;p.elm.style.left='200px';p.elm.style.top='400px';});
 await expect.poll(()=>page.evaluate(()=>!_panels_.magnify.elm.getAnimations({subtree:true}).length)).toBe(true);
}
async function point(page,x,y){return page.evaluate(([x,y])=>{const b=_score_.pgs[0].elm.getBoundingClientRect();return{x:b.x+b.width*x,y:b.y+b.height*y};},[x,y]);}
async function color(page){return page.evaluate(()=>Array.from(_panels_.magnify.magCanvas.getContext('2d').getImageData(175,175,1,1).data));}
for(const url of ['/pod.html','/rostrum.html'])for(const layout of ['book','horizontal','vertical','table'])test(`Magnify remains usable after idle, samples PDF and ink, and stops on close (${url}, ${layout})`,async({page})=>{
 await setup(page,url,layout);await page.evaluate(()=>_menu_.notify('page/magnify/up'));await placePanel(page);
 // This used to silently turn off the tool while leaving an empty panel open.
 await page.waitForTimeout(4500);
 const red=await point(page,.25,.5);await page.mouse.click(red.x,red.y);
 await expect.poll(()=>color(page)).toEqual([255,0,0,255]);
 const blue=await point(page,.75,.5);await page.mouse.move(red.x,red.y);await page.mouse.down();await page.mouse.move(blue.x,blue.y,{steps:6});await page.mouse.up();
 await expect.poll(()=>color(page)).toEqual([0,0,255,255]);
 const green=await point(page,.2,.2);await page.mouse.move(green.x,green.y);
 expect(await color(page)).toEqual([0,0,255,255]);
 await page.touchscreen.tap(green.x,green.y);
 await expect.poll(()=>color(page)).toEqual([0,255,0,255]);
 await page.getByRole('button',{name:'Close Magnify',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>_menu_.magnifier.active)).toBe(false);
 await expect.poll(()=>page.evaluate(()=>!!_score_.pgs[0].magnifierHold)).toBe(false);
 await page.evaluate(()=>_menu_.notify('page/magnify/up'));
 await expect(page.getByRole('button',{name:'Close Magnify',exact:true})).toBeVisible();
 await page.evaluate(()=>_menu_.notify('page/magnify/up'));
 await expect.poll(()=>page.evaluate(()=>_menu_.magnifier.active)).toBe(false);
});
for(const url of ['/pod.html','/rostrum.html'])test(`dragging Magnify out of View also enables sampling (${url})`,async({page})=>{
 await setup(page,url,'book');await page.evaluate(()=>{_menu_.center(true);window.menuReadyAt=performance.now()+_gs_;});
 await expect.poll(()=>page.evaluate(()=>performance.now()>=menuReadyAt&&!_menu_.elm.getAnimations({subtree:true}).length)).toBe(true);
 const points=await page.evaluate(()=>{const c=_menu_.rings.page.cells.magnify,b=_menu_.menuHolder.getBoundingClientRect(),a=parseFloat(c.elm.style.transform.slice(7))*2*Math.PI;const p=r=>({x:b.x+b.width/2+Math.sin(a)*r,y:b.y+b.height/2-Math.cos(a)*r});return{start:p(b.width*.4),end:p(b.width*.65)};});
 await page.mouse.move(points.start.x,points.start.y);await page.mouse.down();await page.mouse.move(points.end.x,points.end.y,{steps:4});await page.mouse.up();
 await expect.poll(()=>page.evaluate(()=>_menu_.magnifier.active)).toBe(true);await placePanel(page);
 const red=await point(page,.25,.5);await page.mouse.click(red.x,red.y);
 await expect.poll(()=>color(page)).toEqual([255,0,0,255]);
});
