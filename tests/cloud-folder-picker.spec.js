const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
 page.external=[];page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin==='http://127.0.0.1:9876'||['data:','blob:'].includes(u.protocol))return r.continue();page.external.push(u.href);return r.abort();});
});
test.afterEach(async({page})=>{expect(page.external).toEqual([]);expect(page.errors).toEqual([]);});
const picker=page=>page.getByRole('dialog',{name:'Choose library sync folder',exact:true});
const folders=page=>picker(page).getByRole('group',{name:'Cloud folders'});
async function setup(page,url='/pod.html'){
 await page.goto(url);await expect(page.locator('.LibraryWindow')).toBeVisible();
 await page.evaluate(async()=>{
  await _bookshelf_.setAutoSync(false);
  const mock=window.folderCloud={calls:[],directories:new Map(),failAuth:false,failPaths:new Set(),pausePath:null};
  const make=path=>{if(!mock.directories.has(path))mock.directories.set(path,{dirs:new Map(),files:new Map()});return mock.directories.get(path);};
  make('').dirs.set('My library',{});make('/My library').dirs.set('Ensemble',{});make('/My library/Ensemble');
  make('').dirs.set('Empty',{});make('/Empty');make('').dirs.set('A/B',{});make('/A∕B');
  make('').files.set('Not a folder.pdf',{bytes:new Blob(['pdf']),size:3});
  const original=_FileSrc_.get;const services={};
  for(const service of ['Drive','Dropbox','OneDrive','pCloud'])services[service]={source:service,
   preloadGIS(){mock.calls.push({kind:'preload',service});},
   async auth(){mock.calls.push({kind:'auth',service});if(mock.failAuth)throw new Error('Sign-in cancelled');},
   async getDir(path){mock.calls.push({kind:'list',service,path});if(mock.pausePath===path)await new Promise(resolve=>mock.resume=resolve);if(mock.failPaths.has(path))throw new Error('Folder unavailable');const d=mock.directories.get(path);if(!d)throw new Error('Folder missing');return{dirs:Object.fromEntries(d.dirs),files:Object.fromEntries(d.files)};},
   async putDir(path,name){mock.calls.push({kind:'create',service,path,name});const child=path+'/'+name.replaceAll('/','∕');if(mock.directories.has(child))throw new Error('Folder already exists');make(path).dirs.set(name,{});make(child);},
   async getFileSrc(path,name){return make(path).files.get(name).bytes;},
   async putFile(path,name,bytes){mock.calls.push({kind:'write',service,path,name});make(path).files.set(name,{bytes,size:bytes.size});},
   async renameFile(path,name,next){const d=make(path);d.files.set(next,d.files.get(name));d.files.delete(name);},
   async trashFile(path,name){make(path).files.delete(name);}
  };
  _FileSrc_.get=ref=>services[ref]||original.call(_FileSrc_,ref);
 });
 await page.getByLabel('Library settings',{exact:true}).click();await page.getByText('Cloud sync',{exact:true}).click();
}
async function browse(page,service='pCloud'){
 await page.getByRole('combobox',{name:'Library cloud service'}).selectOption(service);
 await page.getByRole('button',{name:'Choose sync folder',exact:true}).click();
 await expect(folders(page)).toHaveAttribute('aria-busy','false');
}
for(const url of ['/pod.html','/rostrum.html'])for(const service of ['Drive','Dropbox','OneDrive','pCloud'])test(`choose a nested ${service} sync folder and apply explicitly (${url})`,async({page})=>{
 await setup(page,url);await expect(page.getByRole('button',{name:'Apply and sync',exact:true})).toBeDisabled();await browse(page,service);
 await expect(picker(page).getByRole('button',{name:'Use this folder',exact:true})).toBeEnabled();
 await expect(folders(page).getByText('Not a folder.pdf',{exact:true})).toHaveCount(0);
 await folders(page).getByRole('button',{name:'My library',exact:true}).click();await folders(page).getByRole('button',{name:'Ensemble',exact:true}).click();
 await expect(picker(page).getByLabel('Current cloud folder',{exact:true})).toHaveText(service+'/My library/Ensemble');
 await picker(page).getByRole('button',{name:'Use this folder',exact:true}).click();await expect(picker(page)).toHaveCount(0);
 await expect(page.getByLabel('Library cloud folder',{exact:true})).toHaveText('/My library/Ensemble');
 expect(await page.evaluate(()=>_bookshelf_.cloudSelection||null)).toBe(null);
 expect(await page.evaluate(()=>folderCloud.calls.filter(c=>['write','create'].includes(c.kind)))).toEqual([]);
 await page.getByRole('button',{name:'Apply and sync',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>_bookshelf_.cloudSelection)).toEqual({source:service,path:'/My library/Ensemble'});
 await expect.poll(()=>page.evaluate(()=>_bookshelf_.syncPending)).toBe(false);
 expect(await page.evaluate(()=>RostrumLibraryHost.loadCloudSelection())).toEqual({source:service,path:'/My library/Ensemble'});
});
for(const url of ['/pod.html','/rostrum.html']){
 test(`saved destinations reopen at their selected folder (${url})`,async({page})=>{
  await setup(page,url);await browse(page);await folders(page).getByRole('button',{name:'My library',exact:true}).click();
  await picker(page).getByRole('button',{name:'Use this folder',exact:true}).click();await page.getByRole('button',{name:'Apply and sync',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>_bookshelf_.syncPending)).toBe(false);
  await setup(page,url);await expect(page.getByRole('combobox',{name:'Library cloud service'})).toHaveValue('pCloud');await expect(page.getByLabel('Library cloud folder')).toHaveText('/My library');
  await page.getByRole('button',{name:'Choose sync folder',exact:true}).click();await expect(picker(page).getByLabel('Current cloud folder')).toHaveText('pCloud/My library');
  await expect(folders(page).getByRole('button',{name:'Ensemble',exact:true})).toBeVisible();
 });
 test(`breadcrumbs, parent navigation, root selection and creating a sync folder (${url})`,async({page})=>{
  await setup(page,url);await browse(page);
  await folders(page).getByRole('button',{name:'My library',exact:true}).click();await folders(page).getByRole('button',{name:'Ensemble',exact:true}).click();
  await picker(page).getByRole('button',{name:'Up',exact:true}).click();await expect(picker(page).getByLabel('Current cloud folder')).toHaveText('pCloud/My library');
  await picker(page).getByRole('navigation',{name:'Cloud folder path'}).getByRole('button',{name:'pCloud',exact:true}).click();
  await picker(page).getByRole('button',{name:'New folder',exact:true}).click();await picker(page).getByRole('textbox',{name:'New cloud folder name'}).fill('Rostrum scores');
  await picker(page).getByRole('button',{name:'Create folder',exact:true}).click();await expect(picker(page).getByLabel('Current cloud folder')).toHaveText('pCloud/Rostrum scores');
  await expect(picker(page).getByText('No subfolders in this folder.',{exact:true})).toBeVisible();
  await picker(page).getByRole('button',{name:'Up',exact:true}).click();await picker(page).getByRole('button',{name:'Use this folder',exact:true}).click();
  await expect(page.getByLabel('Library cloud folder',{exact:true})).toHaveText('/');await page.getByRole('button',{name:'Apply and sync',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>_bookshelf_.cloudSelection)).toEqual({source:'pCloud',path:''});
 });
 test(`cancel, Escape and service switching preserve the applied destination (${url})`,async({page})=>{
  await setup(page,url);await browse(page);await folders(page).getByRole('button',{name:'My library',exact:true}).click();await picker(page).getByRole('button',{name:'Use this folder',exact:true}).click();
  await page.getByRole('button',{name:'Apply and sync',exact:true}).click();await expect.poll(()=>page.evaluate(()=>_bookshelf_.syncPending)).toBe(false);
  await page.getByRole('button',{name:'Choose sync folder',exact:true}).click();await expect(folders(page)).toHaveAttribute('aria-busy','false');
  await picker(page).getByRole('button',{name:'Up',exact:true}).click();await picker(page).getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(page.getByLabel('Library cloud folder')).toHaveText('/My library');
  await page.getByRole('combobox',{name:'Library cloud service'}).selectOption('Dropbox');await expect(page.getByRole('button',{name:'Apply and sync',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Choose sync folder',exact:true}).click();await page.keyboard.press('Escape');await expect(picker(page)).toHaveCount(0);
  expect(await page.evaluate(()=>RostrumLibraryHost.loadCloudSelection())).toEqual({source:'pCloud',path:'/My library'});
  await expect(page.getByRole('button',{name:'Choose sync folder',exact:true})).toBeFocused();
 });
}
test('authentication/list errors can be retried, and late results after cancellation are ignored',async({page})=>{
 await setup(page);await page.evaluate(()=>folderCloud.failAuth=true);await browse(page);
 await expect(picker(page).getByRole('alert')).toContainText('Sign-in cancelled');await expect(picker(page).getByRole('button',{name:'Use this folder',exact:true})).toBeDisabled();
 await page.evaluate(()=>folderCloud.failAuth=false);await picker(page).getByRole('button',{name:'Retry',exact:true}).click();await expect(folders(page).getByRole('button',{name:'My library',exact:true})).toBeVisible();
 await page.evaluate(()=>folderCloud.failPaths.add('/My library'));await folders(page).getByRole('button',{name:'My library',exact:true}).click();await expect(picker(page).getByRole('alert')).toContainText('Folder unavailable');
 await page.evaluate(()=>folderCloud.failPaths.clear());await picker(page).getByRole('button',{name:'Retry',exact:true}).click();await expect(picker(page).getByLabel('Current cloud folder')).toHaveText('pCloud/My library');
 await picker(page).getByRole('button',{name:'Up',exact:true}).click();await page.evaluate(()=>folderCloud.pausePath='/My library');await folders(page).getByRole('button',{name:'My library',exact:true}).click();
 await picker(page).getByRole('button',{name:'Cancel',exact:true}).click();await page.evaluate(()=>folderCloud.resume());await expect(picker(page)).toHaveCount(0);await expect(page.getByLabel('Library cloud folder')).toHaveText('No folder selected');
});
test('folder names are text and Drive slash names use the shared path encoding',async({page})=>{
 await setup(page);await page.evaluate(()=>folderCloud.directories.get('').dirs.set('<img src=x onerror=alert(1)>',{}));await browse(page,'Drive');
 await expect(folders(page).getByRole('button',{name:'<img src=x onerror=alert(1)>',exact:true})).toBeVisible();await expect(folders(page).locator('img')).toHaveCount(0);
 await folders(page).getByRole('button',{name:'A/B',exact:true}).click();await expect(picker(page).getByLabel('Current cloud folder')).toHaveText('Drive/A∕B');
 await picker(page).getByRole('button',{name:'Use this folder',exact:true}).click();await expect(page.getByLabel('Library cloud folder')).toHaveText('/A∕B');
});
test('folder creation failures keep the draft editable for retry',async({page})=>{
 await setup(page);await browse(page);await picker(page).getByRole('button',{name:'New folder',exact:true}).click();
 const name=picker(page).getByRole('textbox',{name:'New cloud folder name'});await name.fill('My library');await picker(page).getByRole('button',{name:'Create folder',exact:true}).click();
 await expect(picker(page).getByRole('alert')).toContainText('Folder already exists');await expect(name).toBeEnabled();await expect(name).toHaveValue('My library');
 await name.fill('Library 2026');await picker(page).getByRole('button',{name:'Create folder',exact:true}).click();await expect(picker(page).getByLabel('Current cloud folder')).toHaveText('pCloud/Library 2026');
});
test('picker is scrollable, fits a phone and closes with its library owner',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);await page.evaluate(()=>{for(let i=0;i<35;i++)folderCloud.directories.get('').dirs.set('Folder '+i,{});});await browse(page);
 const box=await picker(page).boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390);expect(box.y+box.height).toBeLessThanOrEqual(844);
 await folders(page).hover();await page.mouse.wheel(0,450);await expect.poll(()=>folders(page).evaluate(elm=>elm.scrollTop)).toBeGreaterThan(0);
 await page.evaluate(()=>_panels_.library.close());await expect(picker(page)).toHaveCount(0);
});
