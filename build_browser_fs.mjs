import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import './build_bookshelf.mjs';

const oauthConfigPath = 'cloud-oauth.json';
const oauthFields = ['dropboxAppKey', 'oneDriveClientId', 'googleDriveClientId'];
const oauthJson = await readFile(oauthConfigPath, 'utf8');
let oauthConfig;
try {
  oauthConfig = JSON.parse(oauthJson.replace(/^\uFEFF/, ''));
} catch {
  throw new Error(`${oauthConfigPath} must contain valid JSON.`);
}
if (!oauthConfig || typeof oauthConfig !== 'object' || Array.isArray(oauthConfig)) {
  throw new Error(`${oauthConfigPath} must contain a JSON object.`);
}
if (Object.keys(oauthConfig).some(field => !oauthFields.includes(field))) {
  throw new Error(`${oauthConfigPath} accepts only these public OAuth identifiers: ${oauthFields.join(', ')}.`);
}
for (const field of oauthFields) {
  const value = oauthConfig[field];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${oauthConfigPath}: ${field} must be a non-empty string.`);
  }
  oauthConfig[field] = value.trim();
}
// The generated script is also embedded in the standalone HTML.
const publicOAuthJson = JSON.stringify(oauthConfig).replaceAll('<', '\\u003c');
await writeFile('build/oauth-config.js', `globalThis._rostrumOAuthConfig_ = ${publicOAuthJson};\n`);

// One local script for source development, standalone HTML, PWA and MV3.
// Bundle both native and fallback paths; never load library code from a CDN.
await build({
  stdin: { contents: "export { fileOpen, fileOpenLegacy, fileSave, fileSaveLegacy, supported } from 'browser-fs-access';", resolveDir: process.cwd() },
  bundle: true, format: 'iife', globalName: 'RostrumFsAccess',
  outfile: 'build/browser-fs-access.js', minify: true, legalComments: 'inline',
  banner: { js: `/*! Browser-FS-Access 0.38.0\n${await readFile('node_modules/browser-fs-access/LICENSE', 'utf8')}\n*/` },
  footer: { js: 'window._localFs_ = RostrumFsAccess;' },
});
