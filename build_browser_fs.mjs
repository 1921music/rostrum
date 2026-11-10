import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

// One local script for source development, standalone HTML, PWA and MV3.
// Bundle both native and fallback paths; never load library code from a CDN.
await build({
  stdin: { contents: "export { fileOpen, fileOpenLegacy, fileSave, fileSaveLegacy, supported } from 'browser-fs-access';", resolveDir: process.cwd() },
  bundle: true, format: 'iife', globalName: 'RostrumFsAccess',
  outfile: 'build/browser-fs-access.js', minify: true, legalComments: 'inline',
  banner: { js: `/*! Browser-FS-Access 0.38.0\n${await readFile('node_modules/browser-fs-access/LICENSE', 'utf8')}\n*/` },
  footer: { js: 'window._localFs_ = RostrumFsAccess;' },
});
