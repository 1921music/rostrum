async function selectLibraryView(page, value) {
  const back = page.getByRole('button', { name:'Back to list', exact:false });
  if (await back.isVisible()) await back.click();
  const select = page.getByLabel('Library view', { exact:true });
  if (await select.isVisible()) await select.selectOption(value);
  else {
    const names = { documents:'All scores', entries:'Songs', bookshelves:'Bookshelves', playlists:'Playlists', tags:'Tags' };
    await page.getByRole('button', { name:names[value], exact:true }).click();
  }
}
module.exports = { selectLibraryView };
