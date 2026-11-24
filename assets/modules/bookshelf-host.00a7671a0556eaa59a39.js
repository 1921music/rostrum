var RostrumLibraryHost = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/bookshelf-storage-host.js
  var bookshelf_storage_host_exports = {};
  __export(bookshelf_storage_host_exports, {
    deviceStateKey: () => deviceStateKey,
    loadCloudSelection: () => loadCloudSelection,
    loadDeviceState: () => loadDeviceState,
    loadSelection: () => loadSelection,
    loadSyncSettings: () => loadSyncSettings,
    openHostStorage: () => openHostStorage,
    queryStoragePermission: () => queryStoragePermission,
    requestStoragePermission: () => requestStoragePermission,
    saveCloudSelection: () => saveCloudSelection,
    saveDeviceState: () => saveDeviceState,
    saveSelection: () => saveSelection,
    saveSyncSettings: () => saveSyncSettings,
    storageCapabilities: () => storageCapabilities
  });

  // src/bookshelf-storage-lock.js
  async function holdLibraryLock(name) {
    if (!navigator.locks) throw new Error("This storage backend requires browser locking support.");
    let release;
    const held = new Promise((resolve) => {
      release = resolve;
    });
    await new Promise((resolve, reject) => {
      navigator.locks.request(name, { ifAvailable: true }, async (lock) => {
        if (!lock) {
          reject(new Error("This library is already open in another tab."));
          return;
        }
        resolve();
        await held;
      }).catch(reject);
    });
    return release;
  }

  // src/bookshelf-storage-bytes-indexeddb.js
  async function openIndexedDbBytes({ name = "rostrum-bookshelf-v4" } = {}) {
    const release = await holdLibraryLock("rostrum-library-idb:" + name);
    let connection;
    try {
      connection = await new Promise((resolve, reject) => {
        const request = indexedDB.open(name, 1);
        request.onupgradeneeded = () => request.result.createObjectStore("files");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const access = (mode, run) => new Promise((resolve, reject) => {
        const transaction = connection.transaction("files", mode);
        const request = run(transaction.objectStore("files"));
        transaction.oncomplete = () => resolve(request.result);
        transaction.onabort = transaction.onerror = () => reject(transaction.error || request.error);
      });
      const validate = (path) => {
        if (typeof path !== "string" || path.split("/").some((p) => !p || p === "." || p === ".." || /[\\\x00]/.test(p))) throw new Error("Invalid library path");
        return path;
      };
      const files = {
        async list(path = "") {
          const prefix = path ? validate(path) + "/" : "", keys = await access("readonly", (store) => store.getAllKeys());
          const entries = /* @__PURE__ */ new Map();
          for (const key of keys) if (typeof key === "string" && key.startsWith(prefix)) {
            const parts = key.slice(prefix.length).split("/");
            entries.set(parts[0], { name: parts[0], kind: parts.length > 1 ? "directory" : "file" });
          }
          return [...entries.values()];
        },
        async read(path) {
          const value = await access("readonly", (store) => store.get(validate(path)));
          if (!value) throw new DOMException("Library file not found", "NotFoundError");
          return value;
        },
        async write(path, bytes) {
          await access("readwrite", (store) => store.put(new Blob([bytes]), validate(path)));
        },
        async remove(path) {
          await access("readwrite", (store) => store.delete(validate(path)));
        }
      };
      return {
        files,
        async readDatabase() {
          const blob = await access("readonly", (store) => store.get("library.sqlite"));
          return blob && blob.arrayBuffer();
        },
        writeDatabase: (bytes) => files.write("library.sqlite", bytes),
        clear: () => access("readwrite", (store) => store.clear()),
        close() {
          connection.close();
          release();
        }
      };
    } catch (error) {
      connection?.close();
      release();
      throw error;
    }
  }

  // src/bookshelf-files.js
  var libraryDirectory = async (root) => root;
  var DirectoryLibraryFiles = class {
    constructor(root) {
      this.root = root;
    }
    async clearLibrary({ database = true } = {}) {
      for (const name of ["scores", "_sync"]) try {
        await this.root.removeEntry(name, { recursive: true });
      } catch (error) {
        if (error.name !== "NotFoundError") throw error;
      }
      for (const name of database ? ["library.sqlite", "README.md"] : ["README.md"]) try {
        await this.root.removeEntry(name);
      } catch (error) {
        if (error.name !== "NotFoundError") throw error;
      }
    }
    async parent(path, create = false) {
      const parts = path.split("/");
      if (parts.some((part) => !part || part === "." || part === ".." || /[\\\x00]/.test(part))) {
        throw new Error("Invalid library path");
      }
      const name = parts.pop();
      let directory = this.root;
      for (const part of parts) directory = await directory.getDirectoryHandle(part, { create });
      return { directory, name };
    }
    async list(path = "") {
      let directory = this.root;
      if (path) {
        const parts = path.split("/");
        if (parts.some((part) => !part || part === "." || part === ".." || /[\\\x00]/.test(part))) throw new Error("Invalid library path");
        try {
          for (const part of parts) directory = await directory.getDirectoryHandle(part);
        } catch (error) {
          if (error.name === "NotFoundError") return [];
          throw error;
        }
      }
      const result = [];
      for await (const [name, handle] of directory.entries()) result.push({ name, kind: handle.kind });
      return result;
    }
    async read(path) {
      const { directory, name } = await this.parent(path);
      return (await directory.getFileHandle(name)).getFile();
    }
    async write(path, bytes) {
      const { directory, name } = await this.parent(path, true);
      const handle = await directory.getFileHandle(name, { create: true });
      const writer = await handle.createWritable();
      try {
        await writer.write(bytes);
        await writer.close();
      } catch (error) {
        await writer.abort().catch(() => {
        });
        throw error;
      }
    }
    async remove(path) {
      const { directory, name } = await this.parent(path);
      await directory.removeEntry(name);
    }
  };

  // src/bookshelf-format.js
  var isVersionedLibraryName = (name) => /^library-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.sqlite$/.test(name);

  // src/bookshelf-storage-bytes-directory.js
  async function openDirectoryBytes({ directory }) {
    if (!directory || directory.kind !== "directory") throw new Error("Choose a library folder first.");
    const release = await holdLibraryLock("rostrum-library-folder:" + directory.name);
    const files = new DirectoryLibraryFiles(await libraryDirectory(directory));
    let persisted;
    const digest = async (bytes) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].join(",");
    const read = async () => {
      try {
        return await (await files.read("library.sqlite")).arrayBuffer();
      } catch (error) {
        if (error.name === "NotFoundError") return null;
        throw error;
      }
    };
    try {
      const original = await read();
      persisted = original && await digest(original);
      return {
        files,
        readDatabase: async () => original,
        async writeDatabase(bytes) {
          const current = await read();
          if ((current && await digest(current)) !== persisted) throw new Error("The library database was changed outside this session. Reopen it before saving.");
          await files.write("library.sqlite", bytes);
          persisted = await digest(bytes);
        },
        async clear() {
          const current = await read();
          if ((current && await digest(current)) !== persisted) throw new Error("The library database was changed outside this session. Reopen it before deleting data.");
          await files.clearLibrary();
          for (const { name, kind } of await files.list("")) if (kind === "file" && isVersionedLibraryName(name)) await files.remove(name);
        },
        close: release
      };
    } catch (error) {
      release();
      throw error;
    }
  }

  // src/bookshelf-storage-host.js
  async function storageCapabilities() {
    let opfs = false;
    if (location.protocol !== "file:" && navigator.storage?.getDirectory && navigator.locks) {
      try {
        await navigator.storage.getDirectory();
        opfs = true;
      } catch {
      }
    }
    return {
      directory: typeof window.showDirectoryPicker === "function" && !!navigator.locks,
      opfs,
      indexeddb: !!globalThis.indexedDB && !!navigator.locks
    };
  }
  async function queryStoragePermission(options) {
    if (options?.kind !== "directory") return "granted";
    return options.directory.queryPermission({ mode: "readwrite" });
  }
  async function requestStoragePermission(options) {
    if (options?.kind !== "directory") return;
    const result = await options.directory.requestPermission({ mode: "readwrite" });
    if (result !== "granted") throw new DOMException("Library folder access was not allowed. You can try again or choose another folder.", "NotAllowedError");
  }
  async function openHostStorage(options) {
    if (options.kind === "indexeddb") return openIndexedDbBytes(options);
    if (options.kind === "directory") return openDirectoryBytes(options);
    throw new Error("Choose a supported storage backend for the standalone library.");
  }
  async function selectionStore(mode, run) {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("rostrum-library-selection", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("selection");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction("selection", mode), request = run(transaction.objectStore("selection"));
        transaction.oncomplete = () => resolve(request.result);
        transaction.onabort = transaction.onerror = () => reject(transaction.error || request.error);
      });
    } finally {
      db.close();
    }
  }
  function loadSelection() {
    return selectionStore("readonly", (store) => store.get("current"));
  }
  function saveSelection(options) {
    return selectionStore("readwrite", (store) => options?.kind ? store.put(options, "current") : store.delete("current"));
  }
  function loadCloudSelection() {
    return selectionStore("readonly", (store) => store.get("cloud"));
  }
  function saveCloudSelection(options) {
    return selectionStore("readwrite", (store) => store.put(options, "cloud"));
  }
  function loadSyncSettings() {
    return selectionStore("readonly", (store) => store.get("sync-settings"));
  }
  function saveSyncSettings(options) {
    return selectionStore("readwrite", (store) => store.put(options, "sync-settings"));
  }
  async function deviceStateKey(options = {}) {
    if (options.kind !== "directory") return "device:" + (options.kind || "opfs") + ":" + (options.name || "default");
    const folders = await selectionStore("readonly", (store) => store.get("device-folders")) || [];
    for (const item of folders) if (await options.directory.isSameEntry(item.directory)) return item.key;
    const key = "device:folder:" + crypto.randomUUID();
    folders.push({ key, directory: options.directory });
    await selectionStore("readwrite", (store) => store.put(folders, "device-folders"));
    return key;
  }
  function loadDeviceState(key) {
    return selectionStore("readonly", (store) => store.get(key));
  }
  function saveDeviceState(key, state) {
    return selectionStore("readwrite", (store) => store.put(state, key));
  }
  return __toCommonJS(bookshelf_storage_host_exports);
})();
window.RostrumLibraryHost = RostrumLibraryHost;
