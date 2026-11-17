const {test,expect}=require('@playwright/test');
const {zipSync}=require('fflate');
test.beforeEach(async({page})=>{
 page.external=[];
 await page.route('**/*',r=>{if(r.request().url().startsWith('http://127.0.0.1:9876/'))return r.continue();page.external.push(r.request().url());return r.abort();});
 await page.goto('/pod.html');await page.waitForFunction(()=>!!window._FileSrc_&&!!window._menu_);
});
test.afterEach(async({page})=>expect(page.external).toEqual([]));

test('Dropbox applies the revision condition at upload_session/finish',async({page})=>{
 const commits=[];
 await page.route('https://content.dropboxapi.com/2/files/**',r=>{
  if(r.request().url().endsWith('/start'))return r.fulfill({json:{session_id:'session'}});
  const args=JSON.parse(r.request().headers()['dropbox-api-arg']);commits.push(args.commit);
  return r.fulfill({status:409,json:{error_summary:'path/conflict/'}});
 });
 const result=await page.evaluate(async()=>{
  const source=_FileSrc_.get('Dropbox');source.tokens={access_token:'mock'};
  return [await source.publishLibrarySnapshot('/Library',new Blob(['sqlite']),[{token:'old-revision'}]),await source.publishLibrarySnapshot('/Library',new Blob(['sqlite']),[])];
 });expect(result).toEqual([false,false]);
 expect(commits).toEqual([{mode:{'.tag':'update',update:'old-revision'},autorename:false,strict_conflict:true,path:'/Library/library.sqlite'},{mode:{'.tag':'add'},autorename:false,strict_conflict:true,path:'/Library/library.sqlite'}]);
});

for(const parent of ['parent','root'])test(`OneDrive defers commit and applies If-Match to the final request (${parent})`,async({page})=>{
 const requests=[];
 await page.route('https://graph.microsoft.com/**',r=>{
  requests.push({url:r.request().url(),method:r.request().method(),headers:r.request().headers(),body:r.request().postDataJSON()});
  if(r.request().url().endsWith('/createUploadSession'))return r.fulfill({json:{uploadUrl:'https://upload.mock.invalid/session'}});
  return r.fulfill({status:412,json:{error:{code:'preconditionFailed'}}});
 });
 await page.route('https://upload.mock.invalid/session',r=>r.fulfill({status:r.request().method()==='DELETE'?204:202,body:''}));
 expect(await page.evaluate(async parent=>{
  const source=_FileSrc_.get('OneDrive');source.tokens={access_token:'mock'};source.getDir=async()=>({id:parent});
  return source.publishLibrarySnapshot('/Library',new Blob(['sqlite']),[{id:'target',token:'"previous-etag"'}]);
 },parent)).toBe(false);
 expect(requests[0].url).toContain((parent==='root'?'/root':'/items/parent')+':/library.sqlite:/createUploadSession');
 expect(requests[1].url).toMatch(parent==='root'?/\/drive\/root$/:/\/items\/parent$/);
 expect(requests[0].body.deferCommit).toBe(true);
 expect(requests[1].method).toBe('PUT');expect(requests[1].headers['if-match']).toBe('"previous-etag"');expect(requests[1].body['@microsoft.graph.sourceUrl']).toBe('https://upload.mock.invalid/session');
});

test('Drive lists every same-name version and verifies an ambiguous create by reserved ID',async({page})=>{
 let pages=0,creates=0;
 await page.route('https://www.googleapis.com/drive/v3/files**',r=>{
  const url=new URL(r.request().url());
  if(url.pathname.endsWith('/generateIds'))return r.fulfill({json:{ids:['reserved']}});
  if(url.searchParams.get('alt')==='media')return r.fulfill({body:'sqlite bytes'});
  expect(url.pathname).toBe('/drive/v3/files');pages++;
  return r.fulfill({json:pages===1?{files:[{id:'one',size:'12',version:'1'}],nextPageToken:'next'}:{files:[{id:'two',size:'12',version:'1'}]}});
 });
 await page.route('https://www.googleapis.com/upload/drive/v3/files**',r=>{creates++;expect(new URL(r.request().url()).pathname).toBe('/upload/drive/v3/files');expect(r.request().postDataBuffer().toString()).toContain('"id":"reserved"');return r.abort('failed');});
 const result=await page.evaluate(async()=>{
  const source=_FileSrc_.get('Drive');source.tokens={access_token:'mock'};source.getDir=async()=>({id:'parent'});
  const list=await source.listLibrarySnapshots('/Library'),id=await source.reserveLibrarySnapshot();
  const success=await source.publishLibrarySnapshot('/Library',new Blob(['sqlite bytes']),list,id);
  return {ids:list.map(item=>item.id),success};
 });expect(result).toEqual({ids:['one','two'],success:true});expect(pages).toBe(2);expect(creates).toBe(1);
});

test('pCloud browser reads a past revision by copying it temporarily and using getzip',async({page})=>{
 const calls=[],archive=zipSync({'snapshot.sqlite':new TextEncoder().encode('sqlite revision')});
 await page.route('https://api.pcloud.com/**',r=>{
  const url=new URL(r.request().url());calls.push({method:url.pathname,revision:url.searchParams.get('revisionid'),file:url.searchParams.get('fileid')});
  if(url.pathname==='/copyfile')return r.fulfill({json:{result:0,metadata:{fileid:99,hash:'revision-hash'}}});
  if(url.pathname==='/getzip')return r.fulfill({contentType:'application/zip',body:Buffer.from(archive)});
  if(url.pathname==='/deletefile')return r.fulfill({json:{result:0}});
  throw new Error('Unexpected pCloud operation');
 });
 expect(await page.evaluate(async()=>{
  const source=_FileSrc_.get('pCloud');source.getDir=async()=>({id:7});
  source.authProvider={contentAccess:'zip',authenticate:async()=>{},requestAuth:async()=>({apiHost:'api.pcloud.com',params:{auth:'mock'},headers:{}})};
  const blob=await source.readLibrarySnapshot('/Library',{fileId:12,revisionId:34,token:'revision-hash'});return blob.text();
 })).toBe('sqlite revision');
 expect(calls.map(call=>call.method)).toEqual(['/copyfile','/getzip','/deletefile']);expect(calls[0]).toMatchObject({revision:'34',file:'12'});
});

for(const url of ['/pod.html','/rostrum.html'])test(`Dropbox encodes Japanese stored names safely in HTTP headers (${url})`,async({page})=>{
 if(url!=='/pod.html'){await page.goto(url);await page.waitForFunction(()=>!!window._FileSrc_&&!!window._menu_);}
 let header;
 await page.route('https://content.dropboxapi.com/2/files/**',r=>{
  if(r.request().url().endsWith('/start'))return r.fulfill({json:{session_id:'session'}});
  header=r.request().headers()['dropbox-api-arg'];return r.fulfill({json:{id:'stored'}});
 });
 await page.evaluate(async()=>{
  const source=_FileSrc_.get('Dropbox');source.tokens={access_token:'mock'};
  await source.putFileSrc('/本棚','楽譜.pdf',new Blob(['score']),null,null);
 });expect(header).toMatch(/^[\x00-\x7f]+$/);expect(JSON.parse(header).commit.path).toBe('/本棚/楽譜.pdf');
});
