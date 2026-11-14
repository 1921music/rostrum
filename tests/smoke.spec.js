const { test, expect } = require("@playwright/test");

test("Rostrum starts without page errors", async ({ page }) => {
  const errors = [];
  const external = [];
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:9876/')) return route.continue();
    if (url === 'https://accounts.google.com/gsi/client') return route.fulfill({ contentType:'application/javascript',body:'window.google = { accounts: { oauth2: {} } };' });
    external.push(url); return route.abort();
  });
  page.on("pageerror", error => errors.push(error.message));

  await page.goto("/pod.html");
  await expect(page).toHaveTitle(/^Rostrum/);
  await expect.poll(() => page.evaluate(() => typeof window._FileSrc_)).toBe("function");

  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
