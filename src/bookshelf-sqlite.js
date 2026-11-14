import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

export function initializeLibrarySqlite() {
  const binary = globalThis.rostrumLibraryWasm;
  return sqlite3InitModule({ wasmBinary: binary,
    locateFile: name => binary ? name : new URL(name, import.meta.url).href });
}
