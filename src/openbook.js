const openBookRepository = "https://github.com/veltzer/book-openbook";
const openBookCatalogUrl = "https://api.github.com/repos/veltzer/book-openbook/git/trees/master?recursive=1";
const openBookSearchKey = text => text.normalize('NFKC').toLocaleLowerCase().replace(/[_-]+/g, ' ');
let openBookCatalogRequest, openBookCatalogExpires = 0;

function openBookPathUrl(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function openBookSourceUrl(song) {
  return `${openBookRepository}/blob/master/${openBookPathUrl(song.path)}`;
}

function openBookSongPath(path) {
  return typeof path === 'string' && /^src\/(?!include\/|test\/)[^/]+\/.+\.ly\.tera$/.test(path)
    && !path.includes('\\') && path.split('/').every(part => part && part !== '.' && part !== '..');
}

async function openBookFetch(url, type) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`OpenBook ${type} is unavailable (HTTP ${response.status}).`);
  return response;
}

function openBookCatalog(retry = false) {
  if (navigator.onLine === false) return Promise.reject(new Error('OpenBook needs an internet connection.'));
  if (!retry && openBookCatalogRequest && Date.now() < openBookCatalogExpires) return openBookCatalogRequest;
  openBookCatalogExpires = Date.now() + 5 * 60 * 1000;
  openBookCatalogRequest = (async () => {
    const response = await openBookFetch(openBookCatalogUrl, 'catalog');
    const catalog = await response.json();
    if (catalog.truncated || !Array.isArray(catalog.tree)) throw new Error('OpenBook returned an incomplete catalog.');
    return catalog.tree.filter(song => song.type === 'blob' && openBookSongPath(song.path) && /^[a-f0-9]{40}$/.test(song.sha))
      .map(({ path, sha }) => {
        const filename = path.split('/').at(-1);
        const title = filename.slice(0, -8).replace(/_/g, ' ').replace(/\b[a-z]/g, letter => letter.toUpperCase());
        const category = path.split('/')[1];
        return { path, sha, filename, title, category, search: openBookSearchKey(`${title} ${category}`) };
      }).sort((left, right) => left.title.localeCompare(right.title) || left.path.localeCompare(right.path));
  })().catch(error => { openBookCatalogExpires = Date.now() + 15000; throw error; });
  return openBookCatalogRequest;
}

async function openBookLoadSong(song) {
  const blobUrl = `https://api.github.com/repos/veltzer/book-openbook/git/blobs/${song.sha}`;
  const source = openBookFetch(blobUrl, 'score').then(async reply => {
    const blob = await reply.json();
    if (blob.sha !== song.sha || blob.encoding !== 'base64' || typeof blob.content !== 'string')
      throw new Error('OpenBook returned the wrong score revision.');
    return Uint8Array.from(atob(blob.content), character => character.charCodeAt(0));
  });
  const musicXml = await convertLilyPond(source, { template: true });
  return { song, source: await source, musicXml };
}
// +skip
export { openBookCatalog, openBookLoadSong, openBookSearchKey, openBookSourceUrl };
// -skip
// +skip
import { convertLilyPond } from './lilypond.js';
// -skip
