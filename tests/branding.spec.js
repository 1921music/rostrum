const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

test.beforeEach(async ({ page }) => {
  page.external = [];
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:9876/')) return route.continue();
    page.external.push(url); return route.abort();
  });
});
test.afterEach(async ({ page }) => expect(page.external).toEqual([]));

test('standalone and extension entry points use the Rostrum filename', () => {
  const root = path.join(__dirname,'..');
  for (const name of ['build/rostrum.html','build/extension/build/rostrum.html']) expect(fs.existsSync(path.join(root,name))).toBe(true);
  expect(fs.existsSync(path.join(root,'build/podium.html'))).toBe(false);
  expect(fs.existsSync(path.join(root,'build/extension/build/podium.html'))).toBe(false);
  const launcher = fs.readFileSync(path.join(root,'build/extension/extension-background.js'),'utf8');
  expect(launcher).toContain('build/rostrum.html');
  const html = fs.readFileSync(path.join(root,'build/rostrum.html'),'utf8');
  expect(html).toContain('_rostrumVersion_');
  expect(html).not.toMatch(/_podium|podiumType|podiumStash/);
});

for (const url of ['/pod.html','/rostrum.html']) test(`Rostrum names survive PDF export and reopen (${url})`, async ({ page }) => {
  await page.goto(url);
  await page.waitForFunction(() => !!window._Score_ && !!window._podPb_?.db);
  await expect(page).toHaveTitle(/^Rostrum \(/);
  const result = await page.evaluate(async () => {
    const score = await _Score_.newScore(1,300,400,'#ffffff');
    const pg = await score.pgUse(1,false);
    pg.canvas.add(new fabric.Path('M 10 10 L 60 60',{ stroke:'red',strokeWidth:3,fill:null,
      rostrumType:'pen',rostrumStash:{ rgb:'red',alpha:1,width:3 } }));
    const exported = await score.toFile();
    const reopened = await new _Score_().init(null,null,'Reopened.pdf',exported,false);
    try {
      const attachments = await reopened.mozDoc.getAttachments();
      const restored = await reopened.pgUse(1,false);
      const object = restored.canvas.getObjects()[0];
      return { db:_podPb_.dbName,store:_podPb_.storeName,metadata:Object.keys(attachments),
        json:new TextDecoder().decode(attachments.rostrum.content),type:object.rostrumType,stash:object.rostrumStash,
        version:window._rostrumVersion_,oldVersion:typeof window._podiumVersion_ };
    } finally { await reopened.dispose(); }
  });
  expect(result).toMatchObject({ db:'Rostrum',store:'rostrum',metadata:['rostrum'],type:'pen',stash:{ rgb:'red',alpha:1,width:3 },version:'1.0.0',oldVersion:'undefined' });
  expect(result.json).toContain('rostrumType');
  expect(result.json).not.toMatch(/podiumType|podiumStash/);
});
