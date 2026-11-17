const {test,expect}=require('@playwright/test');
const {installDeltaCloud}=require('./library-sync-helpers');
const {selectLibraryView}=require('./library-ui-helpers');
test.beforeEach(async({page})=>{
 page.external=[];page.errors=[];page.on('pageerror',error=>page.errors.push(error.message));
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin==='http://127.0.0.1:9876'||['data:','blob:'].includes(url.protocol))return route.continue();
  page.external.push(url.href);return route.abort();
 });
});
test.afterEach(async({page})=>{expect(page.external).toEqual([]);expect(page.errors).toEqual([]);});
async function setup(page,url='/pod.html'){
 if(url==='/rostrum.html')await page.setViewportSize({width:390,height:844});
 await page.goto(url);await expect(page.locator('.LibraryWindow')).toBeVisible();
 await page.evaluate(async()=>{
  await _bookshelf_.setAutoSync(false);
  const pdf=await PDFLib.PDFDocument.create();pdf.addPage([300,400]);window.cloudScoreBytes=await pdf.save();
  window.cloudCalls=[];const original=_FileSrc_.get;
  _FileSrc_.get=source=>['Drive','Dropbox','OneDrive','pCloud'].includes(source)?{
   preloadGIS(){},async auth(){},
   async getDir(path){cloudCalls.push(['list',source,path]);return path===''?{dirs:{'A/B':{}},files:{'Ignore.txt':{}}}:{dirs:{},files:{'Cloud score.pdf':{},'Ignore.txt':{}}};},
   async getFile(path,name){cloudCalls.push(['read',source,path,name]);if(window.failCloudRead)throw new Error('Download failed');return{data:cloudScoreBytes.buffer,path,name};}
  }:original.call(_FileSrc_,source);
 });
}
async function choose(page,source='pCloud'){
 await page.getByLabel('Add scores',{exact:true}).click();
 await page.getByLabel('Add from cloud service').selectOption(source);
 await page.getByRole('button',{name:'Choose cloud files…',exact:true}).click();
 const picker=page.getByRole('dialog',{name:'Choose cloud scores',exact:true});
 await picker.getByRole('button',{name:'A/B',exact:true}).click();
 await expect(picker.getByText('Ignore.txt',{exact:true})).toHaveCount(0);
 return picker;
}
for(const url of ['/pod.html','/rostrum.html'])for(const source of ['Drive','Dropbox','OneDrive','pCloud'])test(`cloud import retains ${source} location through review and reload (${url})`,async({page})=>{
 await setup(page,url);const picker=await choose(page,source);
 await picker.getByRole('checkbox',{name:'Cloud score.pdf',exact:true}).check();await picker.getByRole('button',{name:'Import selected (1)',exact:true}).click();
 const review=page.getByRole('dialog',{name:'Review score import',exact:true});await expect(review).toBeVisible();
 await review.getByLabel('Library score name').fill('My cloud score');
 await review.getByRole('button',{name:'Import into library',exact:true}).click();await expect(review).toHaveCount(0);
 await expect.poll(()=>page.evaluate(async()=>JSON.parse((await _bookshelf_.call('list'))[0].metadata_json).originalLocations)).toEqual([{source,path:'/A∕B',name:'Cloud score.pdf'}]);
 await page.reload();await expect(page.getByRole('button',{name:'My cloud score',exact:true})).toBeVisible();
 await page.getByLabel('Edit and organize',{exact:true}).click();
 await expect(page.getByLabel('Original file locations')).toHaveText(source+' · /A∕B/Cloud score.pdf');
});
test('cancelled picker, cancelled review and failed download leave no document',async({page})=>{
 await setup(page);let picker=await choose(page);await picker.getByRole('button',{name:'Cancel',exact:true}).click();
 await expect(page.getByLabel('Add scores',{exact:true})).toBeFocused();
 expect(await page.evaluate(()=>cloudCalls.some(call=>call[0]==='read'))).toBe(false);
 picker=await choose(page);await picker.getByRole('checkbox',{name:'Cloud score.pdf',exact:true}).check();await picker.getByRole('button',{name:'Import selected (1)',exact:true}).click();
 await page.getByRole('dialog',{name:'Review score import'}).getByRole('button',{name:'Cancel import',exact:true}).click();
 await page.evaluate(()=>window.failCloudRead=true);picker=await choose(page);await picker.getByRole('checkbox',{name:'Cloud score.pdf',exact:true}).check();await picker.getByRole('button',{name:'Import selected (1)',exact:true}).click();
 await expect(page.locator('.Bookshelf__message')).toHaveText('Download failed');
 expect(await page.evaluate(()=>_bookshelf_.call('list'))).toEqual([]);
});
test('duplicate content retains all origins without duplicating score or changing songs; backup retains origins',async({page})=>{
 await setup(page);
 const result=await page.evaluate(async()=>{
  const file=new File([cloudScoreBytes],'Local.pdf');
  const first=await _bookshelf_.import(file,{originalLocation:{source:'Local',path:null,name:'Local.pdf'}});
  const originalLocation={source:'pCloud',path:'/Scores',name:'Remote.pdf'};
  const second=await _bookshelf_.importReviewed(file,{originalLocation});
  await _bookshelf_.import(file,{originalLocation});
  const entries=(await _bookshelf_.call('songState',{id:first.id})).entries;
  const rows=await _bookshelf_.call('list');
  const backup=await _bookshelf_.exportBackup();
  await _bookshelf_.configure({kind:'indexeddb',name:'origin-backup'});
  await _bookshelf_.importBackup(new File([backup],'library.zip'));
  return {count:rows.length,same:first.id===second.id,skipped:second.alreadyImported,entries:entries.length,
   origins:JSON.parse(rows[0].metadata_json).originalLocations,restored:JSON.parse((await _bookshelf_.call('list'))[0].metadata_json).originalLocations};
 });
 expect(result.count).toBe(1);expect(result.same).toBe(true);expect(result.skipped).toBe(true);expect(result.entries).toBe(1);
 expect(result.origins).toEqual([{source:'Local',path:null,name:'Local.pdf'},{source:'pCloud',path:'/Scores',name:'Remote.pdf'}]);expect(result.restored).toEqual(result.origins);
});
test('original cloud location syncs to a second device as metadata',async({page})=>{
 await setup(page);await installDeltaCloud(page);
 const locations=await page.evaluate(async()=>{
  await _bookshelf_.configure({kind:'indexeddb',name:'origin-device-a'});
  const originalLocation={source:'Dropbox',path:'/Scores',name:'Waltz.pdf'};
  await _bookshelf_.import(new File([cloudScoreBytes],'Waltz.pdf'),{originalLocation});
  await _bookshelf_.sync(deltaCloud.transport);
  await _bookshelf_.configure({kind:'indexeddb',name:'origin-device-b'});
  await _bookshelf_.sync(deltaCloud.transport);
  return JSON.parse((await _bookshelf_.call('list'))[0].metadata_json).originalLocations;
 });
 expect(locations).toEqual([{source:'Dropbox',path:'/Scores',name:'Waltz.pdf'}]);
});
for(const url of ['/pod.html','/rostrum.html'])test(`cloud service and full file path appear in every library category (${url})`,async({page})=>{
 await setup(page,url);
 const ids=await page.evaluate(async()=>{
  const doc=await _bookshelf_.import(new File([cloudScoreBytes],'Cloud score.pdf'),{originalLocation:{source:'pCloud',path:'/Very long folder name/Ensemble scores/Season 2026',name:'Original score.pdf'}});
  await _bookshelf_.call('rememberOriginalLocation',{id:doc.id,location:{source:'Drive',path:'',name:'Shared score.pdf'}});
  const entry=(await _bookshelf_.call('songState',{id:doc.id})).entries[0];
  const ids={};
  for(const table of ['bookshelves','playlists','tags']){
   const id=ids[table]=crypto.randomUUID();
   await _bookshelf_.call('update',{table,values:{id,...(table==='tags'?{name:'Concert'}:{metadata_json:'{"name":"Concert"}'})}});
   await _bookshelf_.call('link',{table:table==='bookshelves'?'bookshelf_documents':table==='playlists'?'playlist_items':'document_tags',values:table==='bookshelves'?{bookshelf_id:id,document_id:doc.id,order_key:'1'}:table==='playlists'?{playlist_id:id,entry_id:entry.id,order_key:'1'}:{tag_id:id,document_id:doc.id}});
  }
  await _panels_.library.view.refresh();return ids;
 });
 const expected='pCloud · /Very long folder name/Ensemble scores/Season 2026/Original score.pdf\nDrive · /Shared score.pdf';
 for(const mode of ['documents','entries','bookshelves','playlists','tags']){
  await selectLibraryView(page,mode);
  if(ids[mode])await page.getByLabel('Collection',{exact:true}).selectOption(ids[mode]);
  const location=page.getByLabel('Score file location',{exact:true});await expect(location).toHaveText(expected);
  await expect(async()=>{
   const box=await location.boundingBox();expect(box).not.toBeNull();
   expect(box.x+box.width).toBeLessThanOrEqual(page.viewportSize().width);
  }).toPass({timeout:5000});
  await page.locator('.Bookshelf__open').click();
  await expect(page.getByRole('complementary',{name:'Score details'})).toContainText('Drive · /Shared score.pdf');
 }
});

test('cloud Add keeps multiple selections while browsing and reviews each selected score',async({page})=>{
 await setup(page);await page.setViewportSize({width:390,height:844});
 await page.evaluate(async()=>{
  const pdf=await PDFLib.PDFDocument.create();pdf.setTitle('Second');pdf.addPage([400,500]);window.secondScoreBytes=await pdf.save();
  const get=_FileSrc_.get;const source=get('pCloud'),read=source.getFile;
  source.getDir=async path=>path===''?{dirs:{'A/B':{}},files:{}}:{dirs:{},files:{'Cloud score.pdf':{},'Second.pdf':{}}};
  source.getFile=async(path,name)=>name==='Second.pdf'?{data:secondScoreBytes.buffer,path,name}:read(path,name);
  _FileSrc_.get=ref=>ref==='pCloud'?source:get(ref);
 });
 const picker=await choose(page);const confirm=picker.getByRole('button',{name:/Import selected/});await expect(confirm).toBeDisabled();
 await picker.getByRole('checkbox',{name:'Cloud score.pdf',exact:true}).check();
 await picker.getByRole('button',{name:'Up',exact:true}).click();await picker.getByRole('button',{name:'A/B',exact:true}).click();
 await expect(picker.getByRole('checkbox',{name:'Cloud score.pdf',exact:true})).toBeChecked();
 await picker.getByRole('checkbox',{name:'Second.pdf',exact:true}).check();await expect(confirm).toHaveText('Import selected (2)');
 await confirm.click();
 for(let i=0;i<2;i++)await page.getByRole('dialog',{name:'Review score import',exact:true}).getByRole('button',{name:'Import into library',exact:true}).click();
 await expect.poll(()=>page.evaluate(async()=>(await _bookshelf_.call('list')).length)).toBe(2);
 expect(await page.evaluate(async()=>(await _bookshelf_.call('list')).map(row=>JSON.parse(row.metadata_json).originalLocations[0].name).sort())).toEqual(['Cloud score.pdf','Second.pdf']);
 await expect(page.locator('.Bookshelf__message')).toContainText('Imported 2 scores');
});
