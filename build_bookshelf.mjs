import { build } from 'esbuild';
import { copyFile } from 'node:fs/promises';

await build({ entryPoints: ['src/bookshelf-worker.js'], bundle: true, format: 'esm',
  platform: 'browser', outfile: 'build/bookshelf-worker.js' });
await copyFile('node_modules/@sqlite.org/sqlite-wasm/dist/sqlite3.wasm', 'build/sqlite3.wasm');
