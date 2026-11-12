const { test, expect } = require('@playwright/test');

for (const provider of ['Drive', 'Dropbox', 'OneDrive']) test(`${provider} uploads a ZIP Blob in bounded chunks`, async ({ page }) => {
  const external = [], chunks = [];
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:9876/')) return route.continue();
    external.push(url); return route.abort();
  });
  const session = 'https://upload.mock.invalid/' + provider;
  const record = async route => {
    const request = route.request(), body = request.postDataBuffer();
    chunks.push({ length: body.length, first: body[0], last: body.at(-1), type: request.headers()['content-type'] });
    const last = chunks.length === 2;
    await route.fulfill({ status: provider === 'Drive' && !last ? 308 : 200,
      contentType: 'application/json', body: JSON.stringify({ id:'file', name:'library.zip', size:5*1024*1024+17 }) });
  };
  if (provider === 'Drive') {
    await page.route('https://www.googleapis.com/upload/**', route => route.fulfill({ status:200,
      headers: { Location: session, 'Access-Control-Expose-Headers':'Location' }, body:'{}' }));
    await page.route(session, record);
  } else if (provider === 'OneDrive') {
    await page.route('https://graph.microsoft.com/**', route => route.fulfill({ contentType:'application/json', body:JSON.stringify({ uploadUrl: session }) }));
    await page.route(session, record);
  } else {
    await page.route('https://content.dropboxapi.com/2/files/upload_session/start', route => route.fulfill({ contentType:'application/json', body:'{"session_id":"mock"}' }));
    await page.route('https://content.dropboxapi.com/2/files/upload_session/append_v2', record);
    await page.route('https://content.dropboxapi.com/2/files/upload_session/finish', record);
  }
  await page.goto('/pod.html'); await page.waitForFunction(() => !!window._FileSrc_ && !!window._menu_);
  await page.evaluate(async provider => {
    const source = _FileSrc_.get(provider); source.tokens = { access_token:'mock-token' };
    const bytes = new Uint8Array(5*1024*1024+17); bytes[0]=11; bytes[bytes.length-1]=29;
    await source.putFileSrc('', 'library.zip', new Blob([bytes], { type:'application/zip' }), { id:'root', files:{} }, { id:'existing', name:'library.zip' });
  }, provider);
  expect(chunks.map(chunk => chunk.length)).toEqual([5*1024*1024, 17]);
  expect(chunks[0].first).toBe(11); expect(chunks[1].last).toBe(29);
  if (provider === 'OneDrive') expect(chunks.every(chunk => chunk.type === 'application/zip')).toBe(true);
  expect(external).toEqual([]);
});
