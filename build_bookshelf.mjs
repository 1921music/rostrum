import { build } from 'esbuild';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

await build({ entryPoints: ['src/bookshelf-worker.js'], bundle: true, format: 'esm',
  platform: 'browser', outfile: 'build/bookshelf-worker.js' });
await copyFile('node_modules/@sqlite.org/sqlite-wasm/dist/sqlite3.wasm', 'build/sqlite3.wasm');
await build({ entryPoints: ['src/bookshelf-storage-host.js'], bundle: true, format: 'iife',
  platform: 'browser', globalName: 'RostrumLibraryHost', outfile: 'build/bookshelf-host.js',
  footer: { js: 'window.RostrumLibraryHost = RostrumLibraryHost;' } });
const runtime = {};
for (const [key, path] of Object.entries({ worker: 'build/bookshelf-worker.js', wasm: 'build/sqlite3.wasm' })) {
  runtime[key] = gzipSync(await readFile(path)).toString('base64');
}
await writeFile('build/bookshelf-runtime.js', 'window._bookshelfRuntime_ = ' + JSON.stringify(runtime) + ';\n');
