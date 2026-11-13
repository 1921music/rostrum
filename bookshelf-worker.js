// src/bookshelf-storage.js
async function openLibraryStorage(opener) {
  if (typeof opener !== "function") throw new Error("A library storage backend must be configured.");
  const storage = await opener();
  for (const [component, methods] of Object.entries({ files: ["read", "write", "remove"], database: ["exec", "flush", "export", "close"] })) {
    for (const method of methods) {
      if (typeof storage?.[component]?.[method] !== "function") {
        throw new Error(`Invalid library storage backend: ${component}.${method}`);
      }
    }
  }
  return storage;
}

// node_modules/@sqlite.org/sqlite-wasm/dist/index.mjs
async function sqlite3InitModule$1(moduleArg = {}) {
  var moduleRtn;
  var Module = moduleArg;
  var ENVIRONMENT_IS_WEB = !!globalThis.window;
  var ENVIRONMENT_IS_WORKER = !!globalThis.WorkerGlobalScope;
  globalThis.process?.versions?.node && globalThis.process?.type;
  var thisProgram = "./this.program";
  var _scriptName = import.meta.url;
  var scriptDirectory = "";
  function locateFile(path) {
    if (Module["locateFile"]) return Module["locateFile"](path, scriptDirectory);
    return scriptDirectory + path;
  }
  var readAsync, readBinary;
  if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    try {
      scriptDirectory = new URL(".", _scriptName).href;
    } catch {
    }
    if (ENVIRONMENT_IS_WORKER) readBinary = (url) => {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, false);
      xhr.responseType = "arraybuffer";
      xhr.send(null);
      return new Uint8Array(xhr.response);
    };
    readAsync = async (url) => {
      var response = await fetch(url, { credentials: "same-origin" });
      if (response.ok) return response.arrayBuffer();
      throw new Error(response.status + " : " + response.url);
    };
  }
  var out = console.log.bind(console);
  var err2 = console.error.bind(console);
  var wasmBinary;
  var ABORT = false;
  var readyPromiseResolve, readyPromiseReject;
  var runtimeInitialized = false;
  function updateMemoryViews() {
    var b = wasmMemory.buffer;
    HEAP8 = new Int8Array(b);
    HEAP16 = new Int16Array(b);
    HEAPU8 = new Uint8Array(b);
    HEAPU16 = new Uint16Array(b);
    HEAP32 = new Int32Array(b);
    HEAPU32 = new Uint32Array(b);
    HEAPF32 = new Float32Array(b);
    HEAPF64 = new Float64Array(b);
    HEAP64 = new BigInt64Array(b);
    HEAPU64 = new BigUint64Array(b);
  }
  function initMemory() {
    if (Module["wasmMemory"]) wasmMemory = Module["wasmMemory"];
    else {
      var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 8388608;
      wasmMemory = new WebAssembly.Memory({
        "initial": INITIAL_MEMORY / 65536,
        "maximum": 32768
      });
    }
    updateMemoryViews();
  }
  function preRun() {
    if (Module["preRun"]) {
      if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
      while (Module["preRun"].length) addOnPreRun(Module["preRun"].shift());
    }
    callRuntimeCallbacks(onPreRuns);
  }
  function initRuntime() {
    runtimeInitialized = true;
    if (!Module["noFSInit"] && !FS.initialized) FS.init();
    TTY.init();
    wasmExports["__wasm_call_ctors"]();
    FS.ignorePermissions = false;
  }
  function postRun() {
    if (Module["postRun"]) {
      if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
      while (Module["postRun"].length) addOnPostRun(Module["postRun"].shift());
    }
    callRuntimeCallbacks(onPostRuns);
  }
  function abort(what) {
    Module["onAbort"]?.(what);
    what = `Aborted(${what})`;
    err2(what);
    ABORT = true;
    what += ". Build with -sASSERTIONS for more info.";
    var e = new WebAssembly.RuntimeError(what);
    readyPromiseReject?.(e);
    throw e;
  }
  var wasmBinaryFile;
  function findWasmBinary() {
    if (Module["locateFile"]) return locateFile("sqlite3.wasm");
    return new URL("sqlite3.wasm", import.meta.url).href;
  }
  function getBinarySync(file) {
    if (file == wasmBinaryFile && wasmBinary) return new Uint8Array(wasmBinary);
    if (readBinary) return readBinary(file);
    throw "both async and sync fetching of the wasm failed";
  }
  async function getWasmBinary(binaryFile) {
    if (!wasmBinary) try {
      var response = await readAsync(binaryFile);
      return new Uint8Array(response);
    } catch {
    }
    return getBinarySync(binaryFile);
  }
  async function instantiateArrayBuffer(binaryFile, imports) {
    try {
      var binary = await getWasmBinary(binaryFile);
      return await WebAssembly.instantiate(binary, imports);
    } catch (reason) {
      err2(`failed to asynchronously prepare wasm: ${reason}`);
      abort(reason);
    }
  }
  async function instantiateAsync(binary, binaryFile, imports) {
    if (!binary) try {
      var response = fetch(binaryFile, { credentials: "same-origin" });
      return await WebAssembly.instantiateStreaming(response, imports);
    } catch (reason) {
      err2(`wasm streaming compile failed: ${reason}`);
      err2("falling back to ArrayBuffer instantiation");
    }
    return instantiateArrayBuffer(binaryFile, imports);
  }
  function getWasmImports() {
    return {
      "env": wasmImports,
      "wasi_snapshot_preview1": wasmImports
    };
  }
  async function createWasm() {
    function receiveInstance(instance, module) {
      wasmExports = instance.exports;
      assignWasmExports(wasmExports);
      return wasmExports;
    }
    function receiveInstantiationResult(result) {
      return receiveInstance(result["instance"]);
    }
    var info = getWasmImports();
    if (Module["instantiateWasm"]) return new Promise((resolve, reject) => {
      Module["instantiateWasm"](info, (inst, mod) => {
        resolve(receiveInstance(inst, mod));
      });
    });
    wasmBinaryFile ??= findWasmBinary();
    return receiveInstantiationResult(await instantiateAsync(wasmBinary, wasmBinaryFile, info));
  }
  var HEAP16;
  var HEAP32;
  var HEAP64;
  var HEAP8;
  var HEAPF32;
  var HEAPF64;
  var HEAPU16;
  var HEAPU32;
  var HEAPU64;
  var HEAPU8;
  var callRuntimeCallbacks = (callbacks) => {
    while (callbacks.length > 0) callbacks.shift()(Module);
  };
  var onPostRuns = [];
  var addOnPostRun = (cb) => onPostRuns.push(cb);
  var onPreRuns = [];
  var addOnPreRun = (cb) => onPreRuns.push(cb);
  var wasmMemory;
  var PATH = {
    isAbs: (path) => path.charAt(0) === "/",
    splitPath: (filename) => {
      return /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/.exec(filename).slice(1);
    },
    normalizeArray: (parts, allowAboveRoot) => {
      var up = 0;
      for (var i2 = parts.length - 1; i2 >= 0; i2--) {
        var last = parts[i2];
        if (last === ".") parts.splice(i2, 1);
        else if (last === "..") {
          parts.splice(i2, 1);
          up++;
        } else if (up) {
          parts.splice(i2, 1);
          up--;
        }
      }
      if (allowAboveRoot) for (; up; up--) parts.unshift("..");
      return parts;
    },
    normalize: (path) => {
      var isAbsolute = PATH.isAbs(path), trailingSlash = path.slice(-1) === "/";
      path = PATH.normalizeArray(path.split("/").filter((p) => !!p), !isAbsolute).join("/");
      if (!path && !isAbsolute) path = ".";
      if (path && trailingSlash) path += "/";
      return (isAbsolute ? "/" : "") + path;
    },
    dirname: (path) => {
      var result = PATH.splitPath(path), root = result[0], dir = result[1];
      if (!root && !dir) return ".";
      if (dir) dir = dir.slice(0, -1);
      return root + dir;
    },
    basename: (path) => path && path.match(/([^\/]+|\/)\/*$/)[1],
    join: (...paths) => PATH.normalize(paths.join("/")),
    join2: (l, r) => PATH.normalize(l + "/" + r)
  };
  var initRandomFill = () => {
    return (view) => (crypto.getRandomValues(view), 0);
  };
  var randomFill = (view) => (randomFill = initRandomFill())(view);
  var PATH_FS = {
    resolve: (...args) => {
      var resolvedPath = "", resolvedAbsolute = false;
      for (var i2 = args.length - 1; i2 >= -1 && !resolvedAbsolute; i2--) {
        var path = i2 >= 0 ? args[i2] : FS.cwd();
        if (typeof path != "string") throw new TypeError("Arguments to path.resolve must be strings");
        else if (!path) return "";
        resolvedPath = path + "/" + resolvedPath;
        resolvedAbsolute = PATH.isAbs(path);
      }
      resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter((p) => !!p), !resolvedAbsolute).join("/");
      return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
    },
    relative: (from, to) => {
      from = PATH_FS.resolve(from).slice(1);
      to = PATH_FS.resolve(to).slice(1);
      function trim(arr) {
        var start = 0;
        for (; start < arr.length; start++) if (arr[start] !== "") break;
        var end = arr.length - 1;
        for (; end >= 0; end--) if (arr[end] !== "") break;
        if (start > end) return [];
        return arr.slice(start, end - start + 1);
      }
      var fromParts = trim(from.split("/"));
      var toParts = trim(to.split("/"));
      var length = Math.min(fromParts.length, toParts.length);
      var samePartsLength = length;
      for (var i2 = 0; i2 < length; i2++) if (fromParts[i2] !== toParts[i2]) {
        samePartsLength = i2;
        break;
      }
      var outputParts = [];
      for (var i2 = samePartsLength; i2 < fromParts.length; i2++) outputParts.push("..");
      outputParts = outputParts.concat(toParts.slice(samePartsLength));
      return outputParts.join("/");
    }
  };
  var UTF8Decoder = new TextDecoder();
  var findStringEnd = (heapOrArray, idx, maxBytesToRead, ignoreNul) => {
    var maxIdx = idx + maxBytesToRead;
    if (ignoreNul) return maxIdx;
    while (heapOrArray[idx] && !(idx >= maxIdx)) ++idx;
    return idx;
  };
  var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead, ignoreNul) => {
    var endPtr = findStringEnd(heapOrArray, idx, maxBytesToRead, ignoreNul);
    return UTF8Decoder.decode(heapOrArray.buffer ? heapOrArray.subarray(idx, endPtr) : new Uint8Array(heapOrArray.slice(idx, endPtr)));
  };
  var FS_stdin_getChar_buffer = [];
  var lengthBytesUTF8 = (str) => {
    var len = 0;
    for (var i2 = 0; i2 < str.length; ++i2) {
      var c = str.charCodeAt(i2);
      if (c <= 127) len++;
      else if (c <= 2047) len += 2;
      else if (c >= 55296 && c <= 57343) {
        len += 4;
        ++i2;
      } else len += 3;
    }
    return len;
  };
  var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
    if (!(maxBytesToWrite > 0)) return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i2 = 0; i2 < str.length; ++i2) {
      var u = str.codePointAt(i2);
      if (u <= 127) {
        if (outIdx >= endIdx) break;
        heap[outIdx++] = u;
      } else if (u <= 2047) {
        if (outIdx + 1 >= endIdx) break;
        heap[outIdx++] = 192 | u >> 6;
        heap[outIdx++] = 128 | u & 63;
      } else if (u <= 65535) {
        if (outIdx + 2 >= endIdx) break;
        heap[outIdx++] = 224 | u >> 12;
        heap[outIdx++] = 128 | u >> 6 & 63;
        heap[outIdx++] = 128 | u & 63;
      } else {
        if (outIdx + 3 >= endIdx) break;
        heap[outIdx++] = 240 | u >> 18;
        heap[outIdx++] = 128 | u >> 12 & 63;
        heap[outIdx++] = 128 | u >> 6 & 63;
        heap[outIdx++] = 128 | u & 63;
        i2++;
      }
    }
    heap[outIdx] = 0;
    return outIdx - startIdx;
  };
  var intArrayFromString = (stringy, dontAddNull, length) => {
    var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull) u8array.length = numBytesWritten;
    return u8array;
  };
  var FS_stdin_getChar = () => {
    if (!FS_stdin_getChar_buffer.length) {
      var result = null;
      if (globalThis.window?.prompt) {
        result = window.prompt("Input: ");
        if (result !== null) result += "\n";
      }
      if (!result) return null;
      FS_stdin_getChar_buffer = intArrayFromString(result, true);
    }
    return FS_stdin_getChar_buffer.shift();
  };
  var TTY = {
    ttys: [],
    init() {
    },
    shutdown() {
    },
    register(dev, ops) {
      TTY.ttys[dev] = {
        input: [],
        output: [],
        ops
      };
      FS.registerDevice(dev, TTY.stream_ops);
    },
    stream_ops: {
      open(stream) {
        var tty = TTY.ttys[stream.node.rdev];
        if (!tty) throw new FS.ErrnoError(43);
        stream.tty = tty;
        stream.seekable = false;
      },
      close(stream) {
        stream.tty.ops.fsync(stream.tty);
      },
      fsync(stream) {
        stream.tty.ops.fsync(stream.tty);
      },
      read(stream, buffer, offset, length, pos) {
        if (!stream.tty || !stream.tty.ops.get_char) throw new FS.ErrnoError(60);
        var bytesRead = 0;
        for (var i2 = 0; i2 < length; i2++) {
          var result;
          try {
            result = stream.tty.ops.get_char(stream.tty);
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (result === void 0 && bytesRead === 0) throw new FS.ErrnoError(6);
          if (result === null || result === void 0) break;
          bytesRead++;
          buffer[offset + i2] = result;
        }
        if (bytesRead) stream.node.atime = Date.now();
        return bytesRead;
      },
      write(stream, buffer, offset, length, pos) {
        if (!stream.tty || !stream.tty.ops.put_char) throw new FS.ErrnoError(60);
        try {
          for (var i2 = 0; i2 < length; i2++) stream.tty.ops.put_char(stream.tty, buffer[offset + i2]);
        } catch (e) {
          throw new FS.ErrnoError(29);
        }
        if (length) stream.node.mtime = stream.node.ctime = Date.now();
        return i2;
      }
    },
    default_tty_ops: {
      get_char(tty) {
        return FS_stdin_getChar();
      },
      put_char(tty, val) {
        if (val === null || val === 10) {
          out(UTF8ArrayToString(tty.output));
          tty.output = [];
        } else if (val != 0) tty.output.push(val);
      },
      fsync(tty) {
        if (tty.output?.length > 0) {
          out(UTF8ArrayToString(tty.output));
          tty.output = [];
        }
      },
      ioctl_tcgets(tty) {
        return {
          c_iflag: 25856,
          c_oflag: 5,
          c_cflag: 191,
          c_lflag: 35387,
          c_cc: [
            3,
            28,
            127,
            21,
            4,
            0,
            1,
            0,
            17,
            19,
            26,
            0,
            18,
            15,
            23,
            22,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0
          ]
        };
      },
      ioctl_tcsets(tty, optional_actions, data) {
        return 0;
      },
      ioctl_tiocgwinsz(tty) {
        return [24, 80];
      }
    },
    default_tty1_ops: {
      put_char(tty, val) {
        if (val === null || val === 10) {
          err2(UTF8ArrayToString(tty.output));
          tty.output = [];
        } else if (val != 0) tty.output.push(val);
      },
      fsync(tty) {
        if (tty.output?.length > 0) {
          err2(UTF8ArrayToString(tty.output));
          tty.output = [];
        }
      }
    }
  };
  var zeroMemory = (ptr, size) => HEAPU8.fill(0, ptr, ptr + size);
  var alignMemory = (size, alignment) => {
    return Math.ceil(size / alignment) * alignment;
  };
  var mmapAlloc = (size) => {
    size = alignMemory(size, 65536);
    var ptr = _emscripten_builtin_memalign(65536, size);
    if (ptr) zeroMemory(ptr, size);
    return ptr;
  };
  var MEMFS = {
    ops_table: null,
    mount(mount) {
      return MEMFS.createNode(null, "/", 16895, 0);
    },
    createNode(parent, name, mode, dev) {
      if (FS.isBlkdev(mode) || FS.isFIFO(mode)) throw new FS.ErrnoError(63);
      MEMFS.ops_table ||= {
        dir: {
          node: {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr,
            lookup: MEMFS.node_ops.lookup,
            mknod: MEMFS.node_ops.mknod,
            rename: MEMFS.node_ops.rename,
            unlink: MEMFS.node_ops.unlink,
            rmdir: MEMFS.node_ops.rmdir,
            readdir: MEMFS.node_ops.readdir,
            symlink: MEMFS.node_ops.symlink
          },
          stream: { llseek: MEMFS.stream_ops.llseek }
        },
        file: {
          node: {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr
          },
          stream: {
            llseek: MEMFS.stream_ops.llseek,
            read: MEMFS.stream_ops.read,
            write: MEMFS.stream_ops.write,
            mmap: MEMFS.stream_ops.mmap,
            msync: MEMFS.stream_ops.msync
          }
        },
        link: {
          node: {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr,
            readlink: MEMFS.node_ops.readlink
          },
          stream: {}
        },
        chrdev: {
          node: {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr
          },
          stream: FS.chrdev_stream_ops
        }
      };
      var node = FS.createNode(parent, name, mode, dev);
      if (FS.isDir(node.mode)) {
        node.node_ops = MEMFS.ops_table.dir.node;
        node.stream_ops = MEMFS.ops_table.dir.stream;
        node.contents = {};
      } else if (FS.isFile(node.mode)) {
        node.node_ops = MEMFS.ops_table.file.node;
        node.stream_ops = MEMFS.ops_table.file.stream;
        node.usedBytes = 0;
        node.contents = MEMFS.emptyFileContents ??= /* @__PURE__ */ new Uint8Array(0);
      } else if (FS.isLink(node.mode)) {
        node.node_ops = MEMFS.ops_table.link.node;
        node.stream_ops = MEMFS.ops_table.link.stream;
      } else if (FS.isChrdev(node.mode)) {
        node.node_ops = MEMFS.ops_table.chrdev.node;
        node.stream_ops = MEMFS.ops_table.chrdev.stream;
      }
      node.atime = node.mtime = node.ctime = Date.now();
      if (parent) {
        parent.contents[name] = node;
        parent.atime = parent.mtime = parent.ctime = node.atime;
      }
      return node;
    },
    getFileDataAsTypedArray(node) {
      return node.contents.subarray(0, node.usedBytes);
    },
    expandFileStorage(node, newCapacity) {
      var prevCapacity = node.contents.length;
      if (prevCapacity >= newCapacity) return;
      newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < 1048576 ? 2 : 1.125) >>> 0);
      if (prevCapacity) newCapacity = Math.max(newCapacity, 256);
      var oldContents = MEMFS.getFileDataAsTypedArray(node);
      node.contents = new Uint8Array(newCapacity);
      node.contents.set(oldContents);
    },
    resizeFileStorage(node, newSize) {
      if (node.usedBytes == newSize) return;
      var oldContents = node.contents;
      node.contents = new Uint8Array(newSize);
      node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
      node.usedBytes = newSize;
    },
    node_ops: {
      getattr(node) {
        var attr = {};
        attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
        attr.ino = node.id;
        attr.mode = node.mode;
        attr.nlink = 1;
        attr.uid = 0;
        attr.gid = 0;
        attr.rdev = node.rdev;
        if (FS.isDir(node.mode)) attr.size = 4096;
        else if (FS.isFile(node.mode)) attr.size = node.usedBytes;
        else if (FS.isLink(node.mode)) attr.size = node.link.length;
        else attr.size = 0;
        attr.atime = new Date(node.atime);
        attr.mtime = new Date(node.mtime);
        attr.ctime = new Date(node.ctime);
        attr.blksize = 4096;
        attr.blocks = Math.ceil(attr.size / attr.blksize);
        return attr;
      },
      setattr(node, attr) {
        for (const key of [
          "mode",
          "atime",
          "mtime",
          "ctime"
        ]) if (attr[key] != null) node[key] = attr[key];
        if (attr.size !== void 0) MEMFS.resizeFileStorage(node, attr.size);
      },
      lookup(parent, name) {
        if (!MEMFS.doesNotExistError) {
          MEMFS.doesNotExistError = new FS.ErrnoError(44);
          MEMFS.doesNotExistError.stack = "<generic error, no stack>";
        }
        throw MEMFS.doesNotExistError;
      },
      mknod(parent, name, mode, dev) {
        return MEMFS.createNode(parent, name, mode, dev);
      },
      rename(old_node, new_dir, new_name) {
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
        }
        if (new_node) {
          if (FS.isDir(old_node.mode)) for (var i2 in new_node.contents) throw new FS.ErrnoError(55);
          FS.hashRemoveNode(new_node);
        }
        delete old_node.parent.contents[old_node.name];
        new_dir.contents[new_name] = old_node;
        old_node.name = new_name;
        new_dir.ctime = new_dir.mtime = old_node.parent.ctime = old_node.parent.mtime = Date.now();
      },
      unlink(parent, name) {
        delete parent.contents[name];
        parent.ctime = parent.mtime = Date.now();
      },
      rmdir(parent, name) {
        for (var i2 in FS.lookupNode(parent, name).contents) throw new FS.ErrnoError(55);
        delete parent.contents[name];
        parent.ctime = parent.mtime = Date.now();
      },
      readdir(node) {
        return [
          ".",
          "..",
          ...Object.keys(node.contents)
        ];
      },
      symlink(parent, newname, oldpath) {
        var node = MEMFS.createNode(parent, newname, 41471, 0);
        node.link = oldpath;
        return node;
      },
      readlink(node) {
        if (!FS.isLink(node.mode)) throw new FS.ErrnoError(28);
        return node.link;
      }
    },
    stream_ops: {
      read(stream, buffer, offset, length, position) {
        var contents = stream.node.contents;
        if (position >= stream.node.usedBytes) return 0;
        var size = Math.min(stream.node.usedBytes - position, length);
        buffer.set(contents.subarray(position, position + size), offset);
        return size;
      },
      write(stream, buffer, offset, length, position, canOwn) {
        if (buffer.buffer === HEAP8.buffer) canOwn = false;
        if (!length) return 0;
        var node = stream.node;
        node.mtime = node.ctime = Date.now();
        if (canOwn) {
          node.contents = buffer.subarray(offset, offset + length);
          node.usedBytes = length;
        } else if (node.usedBytes === 0 && position === 0) {
          node.contents = buffer.slice(offset, offset + length);
          node.usedBytes = length;
        } else {
          MEMFS.expandFileStorage(node, position + length);
          node.contents.set(buffer.subarray(offset, offset + length), position);
          node.usedBytes = Math.max(node.usedBytes, position + length);
        }
        return length;
      },
      llseek(stream, offset, whence) {
        var position = offset;
        if (whence === 1) position += stream.position;
        else if (whence === 2) {
          if (FS.isFile(stream.node.mode)) position += stream.node.usedBytes;
        }
        if (position < 0) throw new FS.ErrnoError(28);
        return position;
      },
      mmap(stream, length, position, prot, flags) {
        if (!FS.isFile(stream.node.mode)) throw new FS.ErrnoError(43);
        var ptr;
        var allocated;
        var contents = stream.node.contents;
        if (!(flags & 2) && contents.buffer === HEAP8.buffer) {
          allocated = false;
          ptr = contents.byteOffset;
        } else {
          allocated = true;
          ptr = mmapAlloc(length);
          if (!ptr) throw new FS.ErrnoError(48);
          if (contents) {
            if (position > 0 || position + length < contents.length) {
              if (contents.subarray) contents = contents.subarray(position, position + length);
              else contents = Array.prototype.slice.call(contents, position, position + length);
            }
            HEAP8.set(contents, ptr);
          }
        }
        return {
          ptr,
          allocated
        };
      },
      msync(stream, buffer, offset, length, mmapFlags) {
        MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
        return 0;
      }
    }
  };
  var FS_modeStringToFlags = (str) => {
    if (typeof str != "string") return str;
    var flags = {
      "r": 0,
      "r+": 2,
      "w": 577,
      "w+": 578,
      "a": 1089,
      "a+": 1090
    }[str];
    if (typeof flags == "undefined") throw new Error(`Unknown file open mode: ${str}`);
    return flags;
  };
  var FS_fileDataToTypedArray = (data) => {
    if (typeof data == "string") data = intArrayFromString(data, true);
    if (!data.subarray) data = new Uint8Array(data);
    return data;
  };
  var FS_getMode = (canRead, canWrite) => {
    var mode = 0;
    if (canRead) mode |= 365;
    if (canWrite) mode |= 146;
    return mode;
  };
  var asyncLoad = async (url) => {
    var arrayBuffer = await readAsync(url);
    return new Uint8Array(arrayBuffer);
  };
  var FS_createDataFile = (...args) => FS.createDataFile(...args);
  var getUniqueRunDependency = (id) => {
    return id;
  };
  var runDependencies = 0;
  var dependenciesFulfilled = null;
  var removeRunDependency = (id) => {
    runDependencies--;
    Module["monitorRunDependencies"]?.(runDependencies);
    if (runDependencies == 0) {
      if (dependenciesFulfilled) {
        var callback = dependenciesFulfilled;
        dependenciesFulfilled = null;
        callback();
      }
    }
  };
  var addRunDependency = (id) => {
    runDependencies++;
    Module["monitorRunDependencies"]?.(runDependencies);
  };
  var preloadPlugins = [];
  var FS_handledByPreloadPlugin = async (byteArray, fullname) => {
    if (typeof Browser != "undefined") Browser.init();
    for (var plugin of preloadPlugins) if (plugin["canHandle"](fullname)) return plugin["handle"](byteArray, fullname);
    return byteArray;
  };
  var FS_preloadFile = async (parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish) => {
    var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
    var dep = getUniqueRunDependency(`cp ${fullname}`);
    addRunDependency(dep);
    try {
      var byteArray = url;
      if (typeof url == "string") byteArray = await asyncLoad(url);
      byteArray = await FS_handledByPreloadPlugin(byteArray, fullname);
      preFinish?.();
      if (!dontCreateFile) FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
    } finally {
      removeRunDependency(dep);
    }
  };
  var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
    FS_preloadFile(parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish).then(onload).catch(onerror);
  };
  var FS = {
    root: null,
    mounts: [],
    devices: {},
    streams: [],
    nextInode: 1,
    nameTable: null,
    currentPath: "/",
    initialized: false,
    ignorePermissions: true,
    filesystems: null,
    syncFSRequests: 0,
    ErrnoError: class {
      name = "ErrnoError";
      constructor(errno) {
        this.errno = errno;
      }
    },
    FSStream: class {
      shared = {};
      get object() {
        return this.node;
      }
      set object(val) {
        this.node = val;
      }
      get isRead() {
        return (this.flags & 2097155) !== 1;
      }
      get isWrite() {
        return (this.flags & 2097155) !== 0;
      }
      get isAppend() {
        return this.flags & 1024;
      }
      get flags() {
        return this.shared.flags;
      }
      set flags(val) {
        this.shared.flags = val;
      }
      get position() {
        return this.shared.position;
      }
      set position(val) {
        this.shared.position = val;
      }
    },
    FSNode: class {
      node_ops = {};
      stream_ops = {};
      readMode = 365;
      writeMode = 146;
      mounted = null;
      constructor(parent, name, mode, rdev) {
        if (!parent) parent = this;
        this.parent = parent;
        this.mount = parent.mount;
        this.id = FS.nextInode++;
        this.name = name;
        this.mode = mode;
        this.rdev = rdev;
        this.atime = this.mtime = this.ctime = Date.now();
      }
      get read() {
        return (this.mode & this.readMode) === this.readMode;
      }
      set read(val) {
        val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
      }
      get write() {
        return (this.mode & this.writeMode) === this.writeMode;
      }
      set write(val) {
        val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
      }
      get isFolder() {
        return FS.isDir(this.mode);
      }
      get isDevice() {
        return FS.isChrdev(this.mode);
      }
    },
    lookupPath(path, opts = {}) {
      if (!path) throw new FS.ErrnoError(44);
      opts.follow_mount ??= true;
      if (!PATH.isAbs(path)) path = FS.cwd() + "/" + path;
      linkloop: for (var nlinks = 0; nlinks < 40; nlinks++) {
        var parts = path.split("/").filter((p) => !!p);
        var current = FS.root;
        var current_path = "/";
        for (var i2 = 0; i2 < parts.length; i2++) {
          var islast = i2 === parts.length - 1;
          if (islast && opts.parent) break;
          if (parts[i2] === ".") continue;
          if (parts[i2] === "..") {
            current_path = PATH.dirname(current_path);
            if (FS.isRoot(current)) {
              path = current_path + "/" + parts.slice(i2 + 1).join("/");
              nlinks--;
              continue linkloop;
            } else current = current.parent;
            continue;
          }
          current_path = PATH.join2(current_path, parts[i2]);
          try {
            current = FS.lookupNode(current, parts[i2]);
          } catch (e) {
            if (e?.errno === 44 && islast && opts.noent_okay) return { path: current_path };
            throw e;
          }
          if (FS.isMountpoint(current) && (!islast || opts.follow_mount)) current = current.mounted.root;
          if (FS.isLink(current.mode) && (!islast || opts.follow)) {
            if (!current.node_ops.readlink) throw new FS.ErrnoError(52);
            var link = current.node_ops.readlink(current);
            if (!PATH.isAbs(link)) link = PATH.dirname(current_path) + "/" + link;
            path = link + "/" + parts.slice(i2 + 1).join("/");
            continue linkloop;
          }
        }
        return {
          path: current_path,
          node: current
        };
      }
      throw new FS.ErrnoError(32);
    },
    getPath(node) {
      var path;
      while (true) {
        if (FS.isRoot(node)) {
          var mount = node.mount.mountpoint;
          if (!path) return mount;
          return mount[mount.length - 1] !== "/" ? `${mount}/${path}` : mount + path;
        }
        path = path ? `${node.name}/${path}` : node.name;
        node = node.parent;
      }
    },
    hashName(parentid, name) {
      var hash = 0;
      for (var i2 = 0; i2 < name.length; i2++) hash = (hash << 5) - hash + name.charCodeAt(i2) | 0;
      return (parentid + hash >>> 0) % FS.nameTable.length;
    },
    hashAddNode(node) {
      var hash = FS.hashName(node.parent.id, node.name);
      node.name_next = FS.nameTable[hash];
      FS.nameTable[hash] = node;
    },
    hashRemoveNode(node) {
      var hash = FS.hashName(node.parent.id, node.name);
      if (FS.nameTable[hash] === node) FS.nameTable[hash] = node.name_next;
      else {
        var current = FS.nameTable[hash];
        while (current) {
          if (current.name_next === node) {
            current.name_next = node.name_next;
            break;
          }
          current = current.name_next;
        }
      }
    },
    lookupNode(parent, name) {
      var errCode = FS.mayLookup(parent);
      if (errCode) throw new FS.ErrnoError(errCode);
      var hash = FS.hashName(parent.id, name);
      for (var node = FS.nameTable[hash]; node; node = node.name_next) {
        var nodeName = node.name;
        if (node.parent.id === parent.id && nodeName === name) return node;
      }
      return FS.lookup(parent, name);
    },
    createNode(parent, name, mode, rdev) {
      var node = new FS.FSNode(parent, name, mode, rdev);
      FS.hashAddNode(node);
      return node;
    },
    destroyNode(node) {
      FS.hashRemoveNode(node);
    },
    isRoot(node) {
      return node === node.parent;
    },
    isMountpoint(node) {
      return !!node.mounted;
    },
    isFile(mode) {
      return (mode & 61440) === 32768;
    },
    isDir(mode) {
      return (mode & 61440) === 16384;
    },
    isLink(mode) {
      return (mode & 61440) === 40960;
    },
    isChrdev(mode) {
      return (mode & 61440) === 8192;
    },
    isBlkdev(mode) {
      return (mode & 61440) === 24576;
    },
    isFIFO(mode) {
      return (mode & 61440) === 4096;
    },
    isSocket(mode) {
      return (mode & 49152) === 49152;
    },
    flagsToPermissionString(flag) {
      var perms = [
        "r",
        "w",
        "rw"
      ][flag & 3];
      if (flag & 512) perms += "w";
      return perms;
    },
    nodePermissions(node, perms) {
      if (FS.ignorePermissions) return 0;
      if (perms.includes("r") && !(node.mode & 292)) return 2;
      if (perms.includes("w") && !(node.mode & 146)) return 2;
      if (perms.includes("x") && !(node.mode & 73)) return 2;
      return 0;
    },
    mayLookup(dir) {
      if (!FS.isDir(dir.mode)) return 54;
      var errCode = FS.nodePermissions(dir, "x");
      if (errCode) return errCode;
      if (!dir.node_ops.lookup) return 2;
      return 0;
    },
    mayCreate(dir, name) {
      if (!FS.isDir(dir.mode)) return 54;
      try {
        FS.lookupNode(dir, name);
        return 20;
      } catch (e) {
      }
      return FS.nodePermissions(dir, "wx");
    },
    mayDelete(dir, name, isdir) {
      var node;
      try {
        node = FS.lookupNode(dir, name);
      } catch (e) {
        return e.errno;
      }
      var errCode = FS.nodePermissions(dir, "wx");
      if (errCode) return errCode;
      if (isdir) {
        if (!FS.isDir(node.mode)) return 54;
        if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) return 10;
      } else if (FS.isDir(node.mode)) return 31;
      return 0;
    },
    mayOpen(node, flags) {
      if (!node) return 44;
      if (FS.isLink(node.mode)) return 32;
      var mode = FS.flagsToPermissionString(flags);
      if (FS.isDir(node.mode)) {
        if (mode !== "r" || flags & 576) return 31;
      }
      return FS.nodePermissions(node, mode);
    },
    checkOpExists(op, err3) {
      if (!op) throw new FS.ErrnoError(err3);
      return op;
    },
    MAX_OPEN_FDS: 4096,
    nextfd() {
      for (var fd2 = 0; fd2 <= FS.MAX_OPEN_FDS; fd2++) if (!FS.streams[fd2]) return fd2;
      throw new FS.ErrnoError(33);
    },
    getStreamChecked(fd2) {
      var stream = FS.getStream(fd2);
      if (!stream) throw new FS.ErrnoError(8);
      return stream;
    },
    getStream: (fd2) => FS.streams[fd2],
    createStream(stream, fd2 = -1) {
      stream = Object.assign(new FS.FSStream(), stream);
      if (fd2 == -1) fd2 = FS.nextfd();
      stream.fd = fd2;
      FS.streams[fd2] = stream;
      return stream;
    },
    closeStream(fd2) {
      FS.streams[fd2] = null;
    },
    dupStream(origStream, fd2 = -1) {
      var stream = FS.createStream(origStream, fd2);
      stream.stream_ops?.dup?.(stream);
      return stream;
    },
    doSetAttr(stream, node, attr) {
      var setattr = stream?.stream_ops.setattr;
      var arg = setattr ? stream : node;
      setattr ??= node.node_ops.setattr;
      FS.checkOpExists(setattr, 63);
      setattr(arg, attr);
    },
    chrdev_stream_ops: {
      open(stream) {
        stream.stream_ops = FS.getDevice(stream.node.rdev).stream_ops;
        stream.stream_ops.open?.(stream);
      },
      llseek() {
        throw new FS.ErrnoError(70);
      }
    },
    major: (dev) => dev >> 8,
    minor: (dev) => dev & 255,
    makedev: (ma, mi) => ma << 8 | mi,
    registerDevice(dev, ops) {
      FS.devices[dev] = { stream_ops: ops };
    },
    getDevice: (dev) => FS.devices[dev],
    getMounts(mount) {
      var mounts = [];
      var check = [mount];
      while (check.length) {
        var m = check.pop();
        mounts.push(m);
        check.push(...m.mounts);
      }
      return mounts;
    },
    syncfs(populate, callback) {
      if (typeof populate == "function") {
        callback = populate;
        populate = false;
      }
      FS.syncFSRequests++;
      if (FS.syncFSRequests > 1) err2(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
      var mounts = FS.getMounts(FS.root.mount);
      var completed = 0;
      function doCallback(errCode) {
        FS.syncFSRequests--;
        return callback(errCode);
      }
      function done(errCode) {
        if (errCode) {
          if (!done.errored) {
            done.errored = true;
            return doCallback(errCode);
          }
          return;
        }
        if (++completed >= mounts.length) doCallback(null);
      }
      for (var mount of mounts) if (mount.type.syncfs) mount.type.syncfs(mount, populate, done);
      else done(null);
    },
    mount(type, opts, mountpoint) {
      var root = mountpoint === "/";
      var pseudo = !mountpoint;
      var node;
      if (root && FS.root) throw new FS.ErrnoError(10);
      else if (!root && !pseudo) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
        mountpoint = lookup.path;
        node = lookup.node;
        if (FS.isMountpoint(node)) throw new FS.ErrnoError(10);
        if (!FS.isDir(node.mode)) throw new FS.ErrnoError(54);
      }
      var mount = {
        type,
        opts,
        mountpoint,
        mounts: []
      };
      var mountRoot = type.mount(mount);
      mountRoot.mount = mount;
      mount.root = mountRoot;
      if (root) FS.root = mountRoot;
      else if (node) {
        node.mounted = mount;
        if (node.mount) node.mount.mounts.push(mount);
      }
      return mountRoot;
    },
    unmount(mountpoint) {
      var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
      if (!FS.isMountpoint(lookup.node)) throw new FS.ErrnoError(28);
      var node = lookup.node;
      var mount = node.mounted;
      var mounts = FS.getMounts(mount);
      for (var [hash, current] of Object.entries(FS.nameTable)) while (current) {
        var next = current.name_next;
        if (mounts.includes(current.mount)) FS.destroyNode(current);
        current = next;
      }
      node.mounted = null;
      var idx = node.mount.mounts.indexOf(mount);
      node.mount.mounts.splice(idx, 1);
    },
    lookup(parent, name) {
      return parent.node_ops.lookup(parent, name);
    },
    mknod(path, mode, dev) {
      var parent = FS.lookupPath(path, { parent: true }).node;
      var name = PATH.basename(path);
      if (!name) throw new FS.ErrnoError(28);
      if (name === "." || name === "..") throw new FS.ErrnoError(20);
      var errCode = FS.mayCreate(parent, name);
      if (errCode) throw new FS.ErrnoError(errCode);
      if (!parent.node_ops.mknod) throw new FS.ErrnoError(63);
      return parent.node_ops.mknod(parent, name, mode, dev);
    },
    statfs(path) {
      return FS.statfsNode(FS.lookupPath(path, { follow: true }).node);
    },
    statfsStream(stream) {
      return FS.statfsNode(stream.node);
    },
    statfsNode(node) {
      var rtn = {
        bsize: 4096,
        frsize: 4096,
        blocks: 1e6,
        bfree: 5e5,
        bavail: 5e5,
        files: FS.nextInode,
        ffree: FS.nextInode - 1,
        fsid: 42,
        flags: 2,
        namelen: 255
      };
      if (node.node_ops.statfs) Object.assign(rtn, node.node_ops.statfs(node.mount.opts.root));
      return rtn;
    },
    create(path, mode = 438) {
      mode &= 4095;
      mode |= 32768;
      return FS.mknod(path, mode, 0);
    },
    mkdir(path, mode = 511) {
      mode &= 1023;
      mode |= 16384;
      return FS.mknod(path, mode, 0);
    },
    mkdirTree(path, mode) {
      var dirs = path.split("/");
      var d = "";
      for (var dir of dirs) {
        if (!dir) continue;
        if (d || PATH.isAbs(path)) d += "/";
        d += dir;
        try {
          FS.mkdir(d, mode);
        } catch (e) {
          if (e.errno != 20) throw e;
        }
      }
    },
    mkdev(path, mode, dev) {
      if (typeof dev == "undefined") {
        dev = mode;
        mode = 438;
      }
      mode |= 8192;
      return FS.mknod(path, mode, dev);
    },
    symlink(oldpath, newpath) {
      if (!PATH_FS.resolve(oldpath)) throw new FS.ErrnoError(44);
      var parent = FS.lookupPath(newpath, { parent: true }).node;
      if (!parent) throw new FS.ErrnoError(44);
      var newname = PATH.basename(newpath);
      var errCode = FS.mayCreate(parent, newname);
      if (errCode) throw new FS.ErrnoError(errCode);
      if (!parent.node_ops.symlink) throw new FS.ErrnoError(63);
      return parent.node_ops.symlink(parent, newname, oldpath);
    },
    rename(old_path, new_path) {
      var old_dirname = PATH.dirname(old_path);
      var new_dirname = PATH.dirname(new_path);
      var old_name = PATH.basename(old_path);
      var new_name = PATH.basename(new_path);
      var lookup = FS.lookupPath(old_path, { parent: true }), old_dir = lookup.node, new_dir;
      lookup = FS.lookupPath(new_path, { parent: true });
      new_dir = lookup.node;
      if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
      if (old_dir.mount !== new_dir.mount) throw new FS.ErrnoError(75);
      var old_node = FS.lookupNode(old_dir, old_name);
      var relative = PATH_FS.relative(old_path, new_dirname);
      if (relative.charAt(0) !== ".") throw new FS.ErrnoError(28);
      relative = PATH_FS.relative(new_path, old_dirname);
      if (relative.charAt(0) !== ".") throw new FS.ErrnoError(55);
      var new_node;
      try {
        new_node = FS.lookupNode(new_dir, new_name);
      } catch (e) {
      }
      if (old_node === new_node) return;
      var isdir = FS.isDir(old_node.mode);
      var errCode = FS.mayDelete(old_dir, old_name, isdir);
      if (errCode) throw new FS.ErrnoError(errCode);
      errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
      if (errCode) throw new FS.ErrnoError(errCode);
      if (!old_dir.node_ops.rename) throw new FS.ErrnoError(63);
      if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) throw new FS.ErrnoError(10);
      if (new_dir !== old_dir) {
        errCode = FS.nodePermissions(old_dir, "w");
        if (errCode) throw new FS.ErrnoError(errCode);
      }
      FS.hashRemoveNode(old_node);
      try {
        old_dir.node_ops.rename(old_node, new_dir, new_name);
        old_node.parent = new_dir;
      } catch (e) {
        throw e;
      } finally {
        FS.hashAddNode(old_node);
      }
    },
    rmdir(path) {
      var parent = FS.lookupPath(path, { parent: true }).node;
      var name = PATH.basename(path);
      var node = FS.lookupNode(parent, name);
      var errCode = FS.mayDelete(parent, name, true);
      if (errCode) throw new FS.ErrnoError(errCode);
      if (!parent.node_ops.rmdir) throw new FS.ErrnoError(63);
      if (FS.isMountpoint(node)) throw new FS.ErrnoError(10);
      parent.node_ops.rmdir(parent, name);
      FS.destroyNode(node);
    },
    readdir(path) {
      var node = FS.lookupPath(path, { follow: true }).node;
      return FS.checkOpExists(node.node_ops.readdir, 54)(node);
    },
    unlink(path) {
      var parent = FS.lookupPath(path, { parent: true }).node;
      if (!parent) throw new FS.ErrnoError(44);
      var name = PATH.basename(path);
      var node = FS.lookupNode(parent, name);
      var errCode = FS.mayDelete(parent, name, false);
      if (errCode) throw new FS.ErrnoError(errCode);
      if (!parent.node_ops.unlink) throw new FS.ErrnoError(63);
      if (FS.isMountpoint(node)) throw new FS.ErrnoError(10);
      parent.node_ops.unlink(parent, name);
      FS.destroyNode(node);
    },
    readlink(path) {
      var link = FS.lookupPath(path).node;
      if (!link) throw new FS.ErrnoError(44);
      if (!link.node_ops.readlink) throw new FS.ErrnoError(28);
      return link.node_ops.readlink(link);
    },
    stat(path, dontFollow) {
      var node = FS.lookupPath(path, { follow: !dontFollow }).node;
      return FS.checkOpExists(node.node_ops.getattr, 63)(node);
    },
    fstat(fd2) {
      var stream = FS.getStreamChecked(fd2);
      var node = stream.node;
      var getattr = stream.stream_ops.getattr;
      var arg = getattr ? stream : node;
      getattr ??= node.node_ops.getattr;
      FS.checkOpExists(getattr, 63);
      return getattr(arg);
    },
    lstat(path) {
      return FS.stat(path, true);
    },
    doChmod(stream, node, mode, dontFollow) {
      FS.doSetAttr(stream, node, {
        mode: mode & 4095 | node.mode & -4096,
        ctime: Date.now(),
        dontFollow
      });
    },
    chmod(path, mode, dontFollow) {
      var node;
      if (typeof path == "string") node = FS.lookupPath(path, { follow: !dontFollow }).node;
      else node = path;
      FS.doChmod(null, node, mode, dontFollow);
    },
    lchmod(path, mode) {
      FS.chmod(path, mode, true);
    },
    fchmod(fd2, mode) {
      var stream = FS.getStreamChecked(fd2);
      FS.doChmod(stream, stream.node, mode, false);
    },
    doChown(stream, node, dontFollow) {
      FS.doSetAttr(stream, node, {
        timestamp: Date.now(),
        dontFollow
      });
    },
    chown(path, uid, gid, dontFollow) {
      var node;
      if (typeof path == "string") node = FS.lookupPath(path, { follow: !dontFollow }).node;
      else node = path;
      FS.doChown(null, node, dontFollow);
    },
    lchown(path, uid, gid) {
      FS.chown(path, uid, gid, true);
    },
    fchown(fd2, uid, gid) {
      var stream = FS.getStreamChecked(fd2);
      FS.doChown(stream, stream.node, false);
    },
    doTruncate(stream, node, len) {
      if (FS.isDir(node.mode)) throw new FS.ErrnoError(31);
      if (!FS.isFile(node.mode)) throw new FS.ErrnoError(28);
      var errCode = FS.nodePermissions(node, "w");
      if (errCode) throw new FS.ErrnoError(errCode);
      FS.doSetAttr(stream, node, {
        size: len,
        timestamp: Date.now()
      });
    },
    truncate(path, len) {
      if (len < 0) throw new FS.ErrnoError(28);
      var node;
      if (typeof path == "string") node = FS.lookupPath(path, { follow: true }).node;
      else node = path;
      FS.doTruncate(null, node, len);
    },
    ftruncate(fd2, len) {
      var stream = FS.getStreamChecked(fd2);
      if (len < 0 || (stream.flags & 2097155) === 0) throw new FS.ErrnoError(28);
      FS.doTruncate(stream, stream.node, len);
    },
    utime(path, atime, mtime) {
      var node = FS.lookupPath(path, { follow: true }).node;
      FS.checkOpExists(node.node_ops.setattr, 63)(node, {
        atime,
        mtime
      });
    },
    open(path, flags, mode = 438) {
      if (path === "") throw new FS.ErrnoError(44);
      flags = FS_modeStringToFlags(flags);
      if (flags & 64) mode = mode & 4095 | 32768;
      else mode = 0;
      var node;
      var isDirPath;
      if (typeof path == "object") node = path;
      else {
        isDirPath = path.endsWith("/");
        var lookup = FS.lookupPath(path, {
          follow: !(flags & 131072),
          noent_okay: true
        });
        node = lookup.node;
        path = lookup.path;
      }
      var created = false;
      if (flags & 64) {
        if (node) {
          if (flags & 128) throw new FS.ErrnoError(20);
        } else if (isDirPath) throw new FS.ErrnoError(31);
        else {
          node = FS.mknod(path, mode | 511, 0);
          created = true;
        }
      }
      if (!node) throw new FS.ErrnoError(44);
      if (FS.isChrdev(node.mode)) flags &= -513;
      if (flags & 65536 && !FS.isDir(node.mode)) throw new FS.ErrnoError(54);
      if (!created) {
        var errCode = FS.mayOpen(node, flags);
        if (errCode) throw new FS.ErrnoError(errCode);
      }
      if (flags & 512 && !created) FS.truncate(node, 0);
      flags &= -131713;
      var stream = FS.createStream({
        node,
        path: FS.getPath(node),
        flags,
        seekable: true,
        position: 0,
        stream_ops: node.stream_ops,
        ungotten: [],
        error: false
      });
      if (stream.stream_ops.open) stream.stream_ops.open(stream);
      if (created) FS.chmod(node, mode & 511);
      return stream;
    },
    close(stream) {
      if (FS.isClosed(stream)) throw new FS.ErrnoError(8);
      if (stream.getdents) stream.getdents = null;
      try {
        if (stream.stream_ops.close) stream.stream_ops.close(stream);
      } catch (e) {
        throw e;
      } finally {
        FS.closeStream(stream.fd);
      }
      stream.fd = null;
    },
    isClosed(stream) {
      return stream.fd === null;
    },
    llseek(stream, offset, whence) {
      if (FS.isClosed(stream)) throw new FS.ErrnoError(8);
      if (!stream.seekable || !stream.stream_ops.llseek) throw new FS.ErrnoError(70);
      if (whence != 0 && whence != 1 && whence != 2) throw new FS.ErrnoError(28);
      stream.position = stream.stream_ops.llseek(stream, offset, whence);
      stream.ungotten = [];
      return stream.position;
    },
    read(stream, buffer, offset, length, position) {
      if (length < 0 || position < 0) throw new FS.ErrnoError(28);
      if (FS.isClosed(stream)) throw new FS.ErrnoError(8);
      if ((stream.flags & 2097155) === 1) throw new FS.ErrnoError(8);
      if (FS.isDir(stream.node.mode)) throw new FS.ErrnoError(31);
      if (!stream.stream_ops.read) throw new FS.ErrnoError(28);
      var seeking = typeof position != "undefined";
      if (!seeking) position = stream.position;
      else if (!stream.seekable) throw new FS.ErrnoError(70);
      var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
      if (!seeking) stream.position += bytesRead;
      return bytesRead;
    },
    write(stream, buffer, offset, length, position, canOwn) {
      if (length < 0 || position < 0) throw new FS.ErrnoError(28);
      if (FS.isClosed(stream)) throw new FS.ErrnoError(8);
      if ((stream.flags & 2097155) === 0) throw new FS.ErrnoError(8);
      if (FS.isDir(stream.node.mode)) throw new FS.ErrnoError(31);
      if (!stream.stream_ops.write) throw new FS.ErrnoError(28);
      if (stream.seekable && stream.flags & 1024) FS.llseek(stream, 0, 2);
      var seeking = typeof position != "undefined";
      if (!seeking) position = stream.position;
      else if (!stream.seekable) throw new FS.ErrnoError(70);
      var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
      if (!seeking) stream.position += bytesWritten;
      return bytesWritten;
    },
    mmap(stream, length, position, prot, flags) {
      if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) throw new FS.ErrnoError(2);
      if ((stream.flags & 2097155) === 1) throw new FS.ErrnoError(2);
      if (!stream.stream_ops.mmap) throw new FS.ErrnoError(43);
      if (!length) throw new FS.ErrnoError(28);
      return stream.stream_ops.mmap(stream, length, position, prot, flags);
    },
    msync(stream, buffer, offset, length, mmapFlags) {
      if (!stream.stream_ops.msync) return 0;
      return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
    },
    ioctl(stream, cmd, arg) {
      if (!stream.stream_ops.ioctl) throw new FS.ErrnoError(59);
      return stream.stream_ops.ioctl(stream, cmd, arg);
    },
    readFile(path, opts = {}) {
      opts.flags = opts.flags || 0;
      opts.encoding = opts.encoding || "binary";
      if (opts.encoding !== "utf8" && opts.encoding !== "binary") abort(`Invalid encoding type "${opts.encoding}"`);
      var stream = FS.open(path, opts.flags);
      var length = FS.stat(path).size;
      var buf = new Uint8Array(length);
      FS.read(stream, buf, 0, length, 0);
      if (opts.encoding === "utf8") buf = UTF8ArrayToString(buf);
      FS.close(stream);
      return buf;
    },
    writeFile(path, data, opts = {}) {
      opts.flags = opts.flags || 577;
      var stream = FS.open(path, opts.flags, opts.mode);
      data = FS_fileDataToTypedArray(data);
      FS.write(stream, data, 0, data.byteLength, void 0, opts.canOwn);
      FS.close(stream);
    },
    cwd: () => FS.currentPath,
    chdir(path) {
      var lookup = FS.lookupPath(path, { follow: true });
      if (lookup.node === null) throw new FS.ErrnoError(44);
      if (!FS.isDir(lookup.node.mode)) throw new FS.ErrnoError(54);
      var errCode = FS.nodePermissions(lookup.node, "x");
      if (errCode) throw new FS.ErrnoError(errCode);
      FS.currentPath = lookup.path;
    },
    createDefaultDirectories() {
      FS.mkdir("/tmp");
      FS.mkdir("/home");
      FS.mkdir("/home/web_user");
    },
    createDefaultDevices() {
      FS.mkdir("/dev");
      FS.registerDevice(FS.makedev(1, 3), {
        read: () => 0,
        write: (stream, buffer, offset, length, pos) => length,
        llseek: () => 0
      });
      FS.mkdev("/dev/null", FS.makedev(1, 3));
      TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
      TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
      FS.mkdev("/dev/tty", FS.makedev(5, 0));
      FS.mkdev("/dev/tty1", FS.makedev(6, 0));
      var randomBuffer = /* @__PURE__ */ new Uint8Array(1024), randomLeft = 0;
      var randomByte = () => {
        if (randomLeft === 0) {
          randomFill(randomBuffer);
          randomLeft = randomBuffer.byteLength;
        }
        return randomBuffer[--randomLeft];
      };
      FS.createDevice("/dev", "random", randomByte);
      FS.createDevice("/dev", "urandom", randomByte);
      FS.mkdir("/dev/shm");
      FS.mkdir("/dev/shm/tmp");
    },
    createSpecialDirectories() {
      FS.mkdir("/proc");
      var proc_self = FS.mkdir("/proc/self");
      FS.mkdir("/proc/self/fd");
      FS.mount({ mount() {
        var node = FS.createNode(proc_self, "fd", 16895, 73);
        node.stream_ops = { llseek: MEMFS.stream_ops.llseek };
        node.node_ops = {
          lookup(parent, name) {
            var fd2 = +name;
            var stream = FS.getStreamChecked(fd2);
            var ret = {
              parent: null,
              mount: { mountpoint: "fake" },
              node_ops: { readlink: () => stream.path },
              id: fd2 + 1
            };
            ret.parent = ret;
            return ret;
          },
          readdir() {
            return Array.from(FS.streams.entries()).filter(([k2, v2]) => v2).map(([k2, v2]) => k2.toString());
          }
        };
        return node;
      } }, {}, "/proc/self/fd");
    },
    createStandardStreams(input, output, error) {
      if (input) FS.createDevice("/dev", "stdin", input);
      else FS.symlink("/dev/tty", "/dev/stdin");
      if (output) FS.createDevice("/dev", "stdout", null, output);
      else FS.symlink("/dev/tty", "/dev/stdout");
      if (error) FS.createDevice("/dev", "stderr", null, error);
      else FS.symlink("/dev/tty1", "/dev/stderr");
      FS.open("/dev/stdin", 0);
      FS.open("/dev/stdout", 1);
      FS.open("/dev/stderr", 1);
    },
    staticInit() {
      FS.nameTable = new Array(4096);
      FS.mount(MEMFS, {}, "/");
      FS.createDefaultDirectories();
      FS.createDefaultDevices();
      FS.createSpecialDirectories();
      FS.filesystems = { "MEMFS": MEMFS };
    },
    init(input, output, error) {
      FS.initialized = true;
      input ??= Module["stdin"];
      output ??= Module["stdout"];
      error ??= Module["stderr"];
      FS.createStandardStreams(input, output, error);
    },
    quit() {
      FS.initialized = false;
      for (var stream of FS.streams) if (stream) FS.close(stream);
    },
    findObject(path, dontResolveLastLink) {
      var ret = FS.analyzePath(path, dontResolveLastLink);
      if (!ret.exists) return null;
      return ret.object;
    },
    analyzePath(path, dontResolveLastLink) {
      try {
        var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
        path = lookup.path;
      } catch (e) {
      }
      var ret = {
        isRoot: false,
        exists: false,
        error: 0,
        name: null,
        path: null,
        object: null,
        parentExists: false,
        parentPath: null,
        parentObject: null
      };
      try {
        var lookup = FS.lookupPath(path, { parent: true });
        ret.parentExists = true;
        ret.parentPath = lookup.path;
        ret.parentObject = lookup.node;
        ret.name = PATH.basename(path);
        lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
        ret.exists = true;
        ret.path = lookup.path;
        ret.object = lookup.node;
        ret.name = lookup.node.name;
        ret.isRoot = lookup.path === "/";
      } catch (e) {
        ret.error = e.errno;
      }
      return ret;
    },
    createPath(parent, path, canRead, canWrite) {
      parent = typeof parent == "string" ? parent : FS.getPath(parent);
      var parts = path.split("/").reverse();
      while (parts.length) {
        var part = parts.pop();
        if (!part) continue;
        var current = PATH.join2(parent, part);
        try {
          FS.mkdir(current);
        } catch (e) {
          if (e.errno != 20) throw e;
        }
        parent = current;
      }
      return current;
    },
    createFile(parent, name, properties, canRead, canWrite) {
      var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
      var mode = FS_getMode(canRead, canWrite);
      return FS.create(path, mode);
    },
    createDataFile(parent, name, data, canRead, canWrite, canOwn) {
      var path = name;
      if (parent) {
        parent = typeof parent == "string" ? parent : FS.getPath(parent);
        path = name ? PATH.join2(parent, name) : parent;
      }
      var mode = FS_getMode(canRead, canWrite);
      var node = FS.create(path, mode);
      if (data) {
        data = FS_fileDataToTypedArray(data);
        FS.chmod(node, mode | 146);
        var stream = FS.open(node, 577);
        FS.write(stream, data, 0, data.length, 0, canOwn);
        FS.close(stream);
        FS.chmod(node, mode);
      }
    },
    createDevice(parent, name, input, output) {
      var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
      var mode = FS_getMode(!!input, !!output);
      FS.createDevice.major ??= 64;
      var dev = FS.makedev(FS.createDevice.major++, 0);
      FS.registerDevice(dev, {
        open(stream) {
          stream.seekable = false;
        },
        close(stream) {
          if (output?.buffer?.length) output(10);
        },
        read(stream, buffer, offset, length, pos) {
          var bytesRead = 0;
          for (var i2 = 0; i2 < length; i2++) {
            var result;
            try {
              result = input();
            } catch (e) {
              throw new FS.ErrnoError(29);
            }
            if (result === void 0 && bytesRead === 0) throw new FS.ErrnoError(6);
            if (result === null || result === void 0) break;
            bytesRead++;
            buffer[offset + i2] = result;
          }
          if (bytesRead) stream.node.atime = Date.now();
          return bytesRead;
        },
        write(stream, buffer, offset, length, pos) {
          for (var i2 = 0; i2 < length; i2++) try {
            output(buffer[offset + i2]);
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (length) stream.node.mtime = stream.node.ctime = Date.now();
          return i2;
        }
      });
      return FS.mkdev(path, mode, dev);
    },
    forceLoadFile(obj) {
      if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
      if (globalThis.XMLHttpRequest) abort("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
      else try {
        obj.contents = readBinary(obj.url);
      } catch (e) {
        throw new FS.ErrnoError(29);
      }
    },
    createLazyFile(parent, name, url, canRead, canWrite) {
      class LazyUint8Array {
        lengthKnown = false;
        chunks = [];
        get(idx) {
          if (idx > this.length - 1 || idx < 0) return;
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = idx / this.chunkSize | 0;
          return this.getter(chunkNum)[chunkOffset];
        }
        setDataGetter(getter) {
          this.getter = getter;
        }
        cacheLength() {
          var xhr = new XMLHttpRequest();
          xhr.open("HEAD", url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) abort("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
          var chunkSize = 1048576;
          if (!hasByteServing) chunkSize = datalength;
          var doXHR = (from, to) => {
            if (from > to) abort("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength - 1) abort("only " + datalength + " bytes available! programmer error!");
            var xhr2 = new XMLHttpRequest();
            xhr2.open("GET", url, false);
            if (datalength !== chunkSize) xhr2.setRequestHeader("Range", "bytes=" + from + "-" + to);
            xhr2.responseType = "arraybuffer";
            if (xhr2.overrideMimeType) xhr2.overrideMimeType("text/plain; charset=x-user-defined");
            xhr2.send(null);
            if (!(xhr2.status >= 200 && xhr2.status < 300 || xhr2.status === 304)) abort("Couldn't load " + url + ". Status: " + xhr2.status);
            if (xhr2.response !== void 0) return new Uint8Array(xhr2.response || []);
            return intArrayFromString(xhr2.responseText || "", true);
          };
          var lazyArray = this;
          lazyArray.setDataGetter((chunkNum) => {
            var start = chunkNum * chunkSize;
            var end = (chunkNum + 1) * chunkSize - 1;
            end = Math.min(end, datalength - 1);
            if (typeof lazyArray.chunks[chunkNum] == "undefined") lazyArray.chunks[chunkNum] = doXHR(start, end);
            if (typeof lazyArray.chunks[chunkNum] == "undefined") abort("doXHR failed!");
            return lazyArray.chunks[chunkNum];
          });
          if (usesGzip || !datalength) {
            chunkSize = datalength = 1;
            datalength = this.getter(0).length;
            chunkSize = datalength;
            out("LazyFiles on gzip forces download of the whole file when length is accessed");
          }
          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        }
        get length() {
          if (!this.lengthKnown) this.cacheLength();
          return this._length;
        }
        get chunkSize() {
          if (!this.lengthKnown) this.cacheLength();
          return this._chunkSize;
        }
      }
      if (globalThis.XMLHttpRequest) {
        if (!ENVIRONMENT_IS_WORKER) abort("Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc");
        var properties = {
          isDevice: false,
          contents: new LazyUint8Array()
        };
      } else var properties = {
        isDevice: false,
        url
      };
      var node = FS.createFile(parent, name, properties, canRead, canWrite);
      if (properties.contents) node.contents = properties.contents;
      else if (properties.url) {
        node.contents = null;
        node.url = properties.url;
      }
      Object.defineProperties(node, { usedBytes: { get: function() {
        return this.contents.length;
      } } });
      var stream_ops = {};
      for (const [key, fn] of Object.entries(node.stream_ops)) stream_ops[key] = (...args) => {
        FS.forceLoadFile(node);
        return fn(...args);
      };
      function writeChunks(stream, buffer, offset, length, position) {
        var contents = stream.node.contents;
        if (position >= contents.length) return 0;
        var size = Math.min(contents.length - position, length);
        if (contents.slice) for (var i2 = 0; i2 < size; i2++) buffer[offset + i2] = contents[position + i2];
        else for (var i2 = 0; i2 < size; i2++) buffer[offset + i2] = contents.get(position + i2);
        return size;
      }
      stream_ops.read = (stream, buffer, offset, length, position) => {
        FS.forceLoadFile(node);
        return writeChunks(stream, buffer, offset, length, position);
      };
      stream_ops.mmap = (stream, length, position, prot, flags) => {
        FS.forceLoadFile(node);
        var ptr = mmapAlloc(length);
        if (!ptr) throw new FS.ErrnoError(48);
        writeChunks(stream, HEAP8, ptr, length, position);
        return {
          ptr,
          allocated: true
        };
      };
      node.stream_ops = stream_ops;
      return node;
    }
  };
  var UTF8ToString = (ptr, maxBytesToRead, ignoreNul) => {
    if (!ptr) return "";
    var end = findStringEnd(HEAPU8, ptr, maxBytesToRead, ignoreNul);
    return UTF8Decoder.decode(HEAPU8.subarray(ptr, end));
  };
  var SYSCALLS = {
    calculateAt(dirfd, path, allowEmpty) {
      if (PATH.isAbs(path)) return path;
      var dir;
      if (dirfd === -100) dir = FS.cwd();
      else dir = SYSCALLS.getStreamFromFD(dirfd).path;
      if (path.length == 0) {
        if (!allowEmpty) throw new FS.ErrnoError(44);
        return dir;
      }
      return dir + "/" + path;
    },
    writeStat(buf, stat) {
      HEAPU32[buf >> 2] = stat.dev;
      HEAPU32[buf + 4 >> 2] = stat.mode;
      HEAPU32[buf + 8 >> 2] = stat.nlink;
      HEAPU32[buf + 12 >> 2] = stat.uid;
      HEAPU32[buf + 16 >> 2] = stat.gid;
      HEAPU32[buf + 20 >> 2] = stat.rdev;
      HEAP64[buf + 24 >> 3] = BigInt(stat.size);
      HEAP32[buf + 32 >> 2] = 4096;
      HEAP32[buf + 36 >> 2] = stat.blocks;
      var atime = stat.atime.getTime();
      var mtime = stat.mtime.getTime();
      var ctime = stat.ctime.getTime();
      HEAP64[buf + 40 >> 3] = BigInt(Math.floor(atime / 1e3));
      HEAPU32[buf + 48 >> 2] = atime % 1e3 * 1e3 * 1e3;
      HEAP64[buf + 56 >> 3] = BigInt(Math.floor(mtime / 1e3));
      HEAPU32[buf + 64 >> 2] = mtime % 1e3 * 1e3 * 1e3;
      HEAP64[buf + 72 >> 3] = BigInt(Math.floor(ctime / 1e3));
      HEAPU32[buf + 80 >> 2] = ctime % 1e3 * 1e3 * 1e3;
      HEAP64[buf + 88 >> 3] = BigInt(stat.ino);
      return 0;
    },
    writeStatFs(buf, stats) {
      HEAPU32[buf + 4 >> 2] = stats.bsize;
      HEAPU32[buf + 60 >> 2] = stats.bsize;
      HEAP64[buf + 8 >> 3] = BigInt(stats.blocks);
      HEAP64[buf + 16 >> 3] = BigInt(stats.bfree);
      HEAP64[buf + 24 >> 3] = BigInt(stats.bavail);
      HEAP64[buf + 32 >> 3] = BigInt(stats.files);
      HEAP64[buf + 40 >> 3] = BigInt(stats.ffree);
      HEAPU32[buf + 48 >> 2] = stats.fsid;
      HEAPU32[buf + 64 >> 2] = stats.flags;
      HEAPU32[buf + 56 >> 2] = stats.namelen;
    },
    doMsync(addr, stream, len, flags, offset) {
      if (!FS.isFile(stream.node.mode)) throw new FS.ErrnoError(43);
      if (flags & 2) return 0;
      var buffer = HEAPU8.slice(addr, addr + len);
      FS.msync(stream, buffer, offset, len, flags);
    },
    getStreamFromFD(fd2) {
      return FS.getStreamChecked(fd2);
    },
    varargs: void 0,
    getStr(ptr) {
      return UTF8ToString(ptr);
    }
  };
  function ___syscall_chmod(path, mode) {
    try {
      path = SYSCALLS.getStr(path);
      FS.chmod(path, mode);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_faccessat(dirfd, path, amode, flags) {
    try {
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      if (amode & -8) return -28;
      var node = FS.lookupPath(path, { follow: true }).node;
      if (!node) return -44;
      var perms = "";
      if (amode & 4) perms += "r";
      if (amode & 2) perms += "w";
      if (amode & 1) perms += "x";
      if (perms && FS.nodePermissions(node, perms)) return -2;
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_fchmod(fd2, mode) {
    try {
      FS.fchmod(fd2, mode);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_fchown32(fd2, owner, group) {
    try {
      FS.fchown(fd2, owner, group);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  var syscallGetVarargI = () => {
    var ret = HEAP32[+SYSCALLS.varargs >> 2];
    SYSCALLS.varargs += 4;
    return ret;
  };
  var syscallGetVarargP = syscallGetVarargI;
  function ___syscall_fcntl64(fd2, cmd, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(fd2);
      switch (cmd) {
        case 0:
          var arg = syscallGetVarargI();
          if (arg < 0) return -28;
          while (FS.streams[arg]) arg++;
          return FS.dupStream(stream, arg).fd;
        case 1:
        case 2:
          return 0;
        case 3:
          return stream.flags;
        case 4:
          var arg = syscallGetVarargI();
          stream.flags |= arg;
          return 0;
        case 12:
          var arg = syscallGetVarargP();
          var offset = 0;
          HEAP16[arg + offset >> 1] = 2;
          return 0;
        case 13:
        case 14:
          return 0;
      }
      return -28;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_fstat64(fd2, buf) {
    try {
      return SYSCALLS.writeStat(buf, FS.fstat(fd2));
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  var INT53_MAX = 9007199254740992;
  var INT53_MIN = -9007199254740992;
  var bigintToI53Checked = (num) => num < INT53_MIN || num > INT53_MAX ? NaN : Number(num);
  function ___syscall_ftruncate64(fd2, length) {
    length = bigintToI53Checked(length);
    try {
      if (isNaN(length)) return -61;
      FS.ftruncate(fd2, length);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
    return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
  };
  function ___syscall_getcwd(buf, size) {
    try {
      if (size === 0) return -28;
      var cwd = FS.cwd();
      var cwdLengthInBytes = lengthBytesUTF8(cwd) + 1;
      if (size < cwdLengthInBytes) return -68;
      stringToUTF8(cwd, buf, size);
      return cwdLengthInBytes;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_ioctl(fd2, op, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(fd2);
      switch (op) {
        case 21509:
          if (!stream.tty) return -59;
          return 0;
        case 21505:
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcgets) {
            var termios = stream.tty.ops.ioctl_tcgets(stream);
            var argp = syscallGetVarargP();
            HEAP32[argp >> 2] = termios.c_iflag || 0;
            HEAP32[argp + 4 >> 2] = termios.c_oflag || 0;
            HEAP32[argp + 8 >> 2] = termios.c_cflag || 0;
            HEAP32[argp + 12 >> 2] = termios.c_lflag || 0;
            for (var i2 = 0; i2 < 32; i2++) HEAP8[argp + i2 + 17] = termios.c_cc[i2] || 0;
            return 0;
          }
          return 0;
        case 21510:
        case 21511:
        case 21512:
          if (!stream.tty) return -59;
          return 0;
        case 21506:
        case 21507:
        case 21508:
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcsets) {
            var argp = syscallGetVarargP();
            var c_iflag = HEAP32[argp >> 2];
            var c_oflag = HEAP32[argp + 4 >> 2];
            var c_cflag = HEAP32[argp + 8 >> 2];
            var c_lflag = HEAP32[argp + 12 >> 2];
            var c_cc = [];
            for (var i2 = 0; i2 < 32; i2++) c_cc.push(HEAP8[argp + i2 + 17]);
            return stream.tty.ops.ioctl_tcsets(stream.tty, op, {
              c_iflag,
              c_oflag,
              c_cflag,
              c_lflag,
              c_cc
            });
          }
          return 0;
        case 21519:
          if (!stream.tty) return -59;
          var argp = syscallGetVarargP();
          HEAP32[argp >> 2] = 0;
          return 0;
        case 21520:
          if (!stream.tty) return -59;
          return -28;
        case 21537:
        case 21531:
          var argp = syscallGetVarargP();
          return FS.ioctl(stream, op, argp);
        case 21523:
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tiocgwinsz) {
            var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
            var argp = syscallGetVarargP();
            HEAP16[argp >> 1] = winsize[0];
            HEAP16[argp + 2 >> 1] = winsize[1];
          }
          return 0;
        case 21524:
          if (!stream.tty) return -59;
          return 0;
        case 21515:
          if (!stream.tty) return -59;
          return 0;
        default:
          return -28;
      }
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_lstat64(path, buf) {
    try {
      path = SYSCALLS.getStr(path);
      return SYSCALLS.writeStat(buf, FS.lstat(path));
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_mkdirat(dirfd, path, mode) {
    try {
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      FS.mkdir(path, mode, 0);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_newfstatat(dirfd, path, buf, flags) {
    try {
      path = SYSCALLS.getStr(path);
      var nofollow = flags & 256;
      var allowEmpty = flags & 4096;
      flags = flags & -6401;
      path = SYSCALLS.calculateAt(dirfd, path, allowEmpty);
      return SYSCALLS.writeStat(buf, nofollow ? FS.lstat(path) : FS.stat(path));
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_openat(dirfd, path, flags, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      var mode = varargs ? syscallGetVarargI() : 0;
      return FS.open(path, flags, mode).fd;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_readlinkat(dirfd, path, buf, bufsize) {
    try {
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      if (bufsize <= 0) return -28;
      var ret = FS.readlink(path);
      var len = Math.min(bufsize, lengthBytesUTF8(ret));
      var endChar = HEAP8[buf + len];
      stringToUTF8(ret, buf, bufsize + 1);
      HEAP8[buf + len] = endChar;
      return len;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_rmdir(path) {
    try {
      path = SYSCALLS.getStr(path);
      FS.rmdir(path);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_stat64(path, buf) {
    try {
      path = SYSCALLS.getStr(path);
      return SYSCALLS.writeStat(buf, FS.stat(path));
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_unlinkat(dirfd, path, flags) {
    try {
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      if (!flags) FS.unlink(path);
      else if (flags === 512) FS.rmdir(path);
      else return -28;
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  var readI53FromI64 = (ptr) => {
    return HEAPU32[ptr >> 2] + HEAP32[ptr + 4 >> 2] * 4294967296;
  };
  function ___syscall_utimensat(dirfd, path, times, flags) {
    try {
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path, true);
      var now = Date.now(), atime, mtime;
      if (!times) {
        atime = now;
        mtime = now;
      } else {
        var seconds = readI53FromI64(times);
        var nanoseconds = HEAP32[times + 8 >> 2];
        if (nanoseconds == 1073741823) atime = now;
        else if (nanoseconds == 1073741822) atime = null;
        else atime = seconds * 1e3 + nanoseconds / 1e6;
        times += 16;
        seconds = readI53FromI64(times);
        nanoseconds = HEAP32[times + 8 >> 2];
        if (nanoseconds == 1073741823) mtime = now;
        else if (nanoseconds == 1073741822) mtime = null;
        else mtime = seconds * 1e3 + nanoseconds / 1e6;
      }
      if ((mtime ?? atime) !== null) FS.utime(path, atime, mtime);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  var isLeapYear = (year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  var MONTH_DAYS_LEAP_CUMULATIVE = [
    0,
    31,
    60,
    91,
    121,
    152,
    182,
    213,
    244,
    274,
    305,
    335
  ];
  var MONTH_DAYS_REGULAR_CUMULATIVE = [
    0,
    31,
    59,
    90,
    120,
    151,
    181,
    212,
    243,
    273,
    304,
    334
  ];
  var ydayFromDate = (date) => {
    return (isLeapYear(date.getFullYear()) ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE)[date.getMonth()] + date.getDate() - 1;
  };
  function __localtime_js(time, tmPtr) {
    time = bigintToI53Checked(time);
    var date = /* @__PURE__ */ new Date(time * 1e3);
    HEAP32[tmPtr >> 2] = date.getSeconds();
    HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
    HEAP32[tmPtr + 8 >> 2] = date.getHours();
    HEAP32[tmPtr + 12 >> 2] = date.getDate();
    HEAP32[tmPtr + 16 >> 2] = date.getMonth();
    HEAP32[tmPtr + 20 >> 2] = date.getFullYear() - 1900;
    HEAP32[tmPtr + 24 >> 2] = date.getDay();
    var yday = ydayFromDate(date) | 0;
    HEAP32[tmPtr + 28 >> 2] = yday;
    HEAP32[tmPtr + 36 >> 2] = -(date.getTimezoneOffset() * 60);
    var start = new Date(date.getFullYear(), 0, 1);
    var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
    var winterOffset = start.getTimezoneOffset();
    var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
    HEAP32[tmPtr + 32 >> 2] = dst;
  }
  function __mmap_js(len, prot, flags, fd2, offset, allocated, addr) {
    offset = bigintToI53Checked(offset);
    try {
      var stream = SYSCALLS.getStreamFromFD(fd2);
      var res = FS.mmap(stream, len, offset, prot, flags);
      var ptr = res.ptr;
      HEAP32[allocated >> 2] = res.allocated;
      HEAPU32[addr >> 2] = ptr;
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function __munmap_js(addr, len, prot, flags, fd2, offset) {
    offset = bigintToI53Checked(offset);
    try {
      var stream = SYSCALLS.getStreamFromFD(fd2);
      if (prot & 2) SYSCALLS.doMsync(addr, stream, len, flags, offset);
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  var __tzset_js = (timezone, daylight, std_name, dst_name) => {
    var currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    var winter = new Date(currentYear, 0, 1);
    var summer = new Date(currentYear, 6, 1);
    var winterOffset = winter.getTimezoneOffset();
    var summerOffset = summer.getTimezoneOffset();
    var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
    HEAPU32[timezone >> 2] = stdTimezoneOffset * 60;
    HEAP32[daylight >> 2] = Number(winterOffset != summerOffset);
    var extractZone = (timezoneOffset) => {
      var sign = timezoneOffset >= 0 ? "-" : "+";
      var absOffset = Math.abs(timezoneOffset);
      return `UTC${sign}${String(Math.floor(absOffset / 60)).padStart(2, "0")}${String(absOffset % 60).padStart(2, "0")}`;
    };
    var winterName = extractZone(winterOffset);
    var summerName = extractZone(summerOffset);
    if (summerOffset < winterOffset) {
      stringToUTF8(winterName, std_name, 17);
      stringToUTF8(summerName, dst_name, 17);
    } else {
      stringToUTF8(winterName, dst_name, 17);
      stringToUTF8(summerName, std_name, 17);
    }
  };
  var _emscripten_get_now = () => performance.now();
  var _emscripten_date_now = () => Date.now();
  var nowIsMonotonic = 1;
  var checkWasiClock = (clock_id) => clock_id >= 0 && clock_id <= 3;
  function _clock_time_get(clk_id, ignored_precision, ptime) {
    ignored_precision = bigintToI53Checked(ignored_precision);
    if (!checkWasiClock(clk_id)) return 28;
    var now;
    if (clk_id === 0) now = _emscripten_date_now();
    else if (nowIsMonotonic) now = _emscripten_get_now();
    else return 52;
    var nsec = Math.round(now * 1e3 * 1e3);
    HEAP64[ptime >> 3] = BigInt(nsec);
    return 0;
  }
  var getHeapMax = () => 2147483648;
  var _emscripten_get_heap_max = () => getHeapMax();
  var growMemory = (size) => {
    var pages = (size - wasmMemory.buffer.byteLength + 65535) / 65536 | 0;
    try {
      wasmMemory.grow(pages);
      updateMemoryViews();
      return 1;
    } catch (e) {
    }
  };
  var _emscripten_resize_heap = (requestedSize) => {
    var oldSize = HEAPU8.length;
    requestedSize >>>= 0;
    var maxHeapSize = getHeapMax();
    if (requestedSize > maxHeapSize) return false;
    for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
      var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
      overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
      if (growMemory(Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536)))) return true;
    }
    return false;
  };
  var ENV = {};
  var getExecutableName = () => thisProgram || "./this.program";
  var getEnvStrings = () => {
    if (!getEnvStrings.strings) {
      var env = {
        "USER": "web_user",
        "LOGNAME": "web_user",
        "PATH": "/",
        "PWD": "/",
        "HOME": "/home/web_user",
        "LANG": (globalThis.navigator?.language ?? "C").replace("-", "_") + ".UTF-8",
        "_": getExecutableName()
      };
      for (var x2 in ENV) if (ENV[x2] === void 0) delete env[x2];
      else env[x2] = ENV[x2];
      var strings = [];
      for (var x2 in env) strings.push(`${x2}=${env[x2]}`);
      getEnvStrings.strings = strings;
    }
    return getEnvStrings.strings;
  };
  var _environ_get = (__environ, environ_buf) => {
    var bufSize = 0;
    var envp = 0;
    for (var string of getEnvStrings()) {
      var ptr = environ_buf + bufSize;
      HEAPU32[__environ + envp >> 2] = ptr;
      bufSize += stringToUTF8(string, ptr, Infinity) + 1;
      envp += 4;
    }
    return 0;
  };
  var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
    var strings = getEnvStrings();
    HEAPU32[penviron_count >> 2] = strings.length;
    var bufSize = 0;
    for (var string of strings) bufSize += lengthBytesUTF8(string) + 1;
    HEAPU32[penviron_buf_size >> 2] = bufSize;
    return 0;
  };
  function _fd_close(fd2) {
    try {
      var stream = SYSCALLS.getStreamFromFD(fd2);
      FS.close(stream);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  function _fd_fdstat_get(fd2, pbuf) {
    try {
      var rightsBase = 0;
      var rightsInheriting = 0;
      var flags = 0;
      var stream = SYSCALLS.getStreamFromFD(fd2);
      var type = stream.tty ? 2 : FS.isDir(stream.mode) ? 3 : FS.isLink(stream.mode) ? 7 : 4;
      HEAP8[pbuf] = type;
      HEAP16[pbuf + 2 >> 1] = flags;
      HEAP64[pbuf + 8 >> 3] = BigInt(rightsBase);
      HEAP64[pbuf + 16 >> 3] = BigInt(rightsInheriting);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  var doReadv = (stream, iov, iovcnt, offset) => {
    var ret = 0;
    for (var i2 = 0; i2 < iovcnt; i2++) {
      var ptr = HEAPU32[iov >> 2];
      var len = HEAPU32[iov + 4 >> 2];
      iov += 8;
      var curr = FS.read(stream, HEAP8, ptr, len, offset);
      if (curr < 0) return -1;
      ret += curr;
      if (curr < len) break;
      if (typeof offset != "undefined") offset += curr;
    }
    return ret;
  };
  function _fd_read(fd2, iov, iovcnt, pnum) {
    try {
      var num = doReadv(SYSCALLS.getStreamFromFD(fd2), iov, iovcnt);
      HEAPU32[pnum >> 2] = num;
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  function _fd_seek(fd2, offset, whence, newOffset) {
    offset = bigintToI53Checked(offset);
    try {
      if (isNaN(offset)) return 61;
      var stream = SYSCALLS.getStreamFromFD(fd2);
      FS.llseek(stream, offset, whence);
      HEAP64[newOffset >> 3] = BigInt(stream.position);
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  function _fd_sync(fd2) {
    try {
      var stream = SYSCALLS.getStreamFromFD(fd2);
      return stream.stream_ops?.fsync?.(stream);
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  var doWritev = (stream, iov, iovcnt, offset) => {
    var ret = 0;
    for (var i2 = 0; i2 < iovcnt; i2++) {
      var ptr = HEAPU32[iov >> 2];
      var len = HEAPU32[iov + 4 >> 2];
      iov += 8;
      var curr = FS.write(stream, HEAP8, ptr, len, offset);
      if (curr < 0) return -1;
      ret += curr;
      if (curr < len) break;
      if (typeof offset != "undefined") offset += curr;
    }
    return ret;
  };
  function _fd_write(fd2, iov, iovcnt, pnum) {
    try {
      var num = doWritev(SYSCALLS.getStreamFromFD(fd2), iov, iovcnt);
      HEAPU32[pnum >> 2] = num;
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  FS.createPreloadedFile = FS_createPreloadedFile;
  FS.preloadFile = FS_preloadFile;
  FS.staticInit();
  initMemory();
  if (Module["noExitRuntime"]) Module["noExitRuntime"];
  if (Module["preloadPlugins"]) preloadPlugins = Module["preloadPlugins"];
  if (Module["print"]) out = Module["print"];
  if (Module["printErr"]) err2 = Module["printErr"];
  if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
  if (Module["arguments"]) Module["arguments"];
  if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
  if (Module["preInit"]) {
    if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
    while (Module["preInit"].length > 0) Module["preInit"].shift()();
  }
  Module["wasmMemory"] = wasmMemory;
  var _emscripten_builtin_memalign;
  function assignWasmExports(wasmExports2) {
    Module["_sqlite3_status64"] = wasmExports2["sqlite3_status64"];
    Module["_sqlite3_status"] = wasmExports2["sqlite3_status"];
    Module["_sqlite3_db_status64"] = wasmExports2["sqlite3_db_status64"];
    Module["_sqlite3_msize"] = wasmExports2["sqlite3_msize"];
    Module["_sqlite3_db_status"] = wasmExports2["sqlite3_db_status"];
    Module["_sqlite3_vfs_find"] = wasmExports2["sqlite3_vfs_find"];
    Module["_sqlite3_initialize"] = wasmExports2["sqlite3_initialize"];
    Module["_sqlite3_vfs_register"] = wasmExports2["sqlite3_vfs_register"];
    Module["_sqlite3_vfs_unregister"] = wasmExports2["sqlite3_vfs_unregister"];
    Module["_sqlite3_malloc"] = wasmExports2["sqlite3_malloc"];
    Module["_sqlite3_malloc64"] = wasmExports2["sqlite3_malloc64"];
    Module["_sqlite3_free"] = wasmExports2["sqlite3_free"];
    Module["_sqlite3_realloc"] = wasmExports2["sqlite3_realloc"];
    Module["_sqlite3_realloc64"] = wasmExports2["sqlite3_realloc64"];
    Module["_sqlite3_value_text"] = wasmExports2["sqlite3_value_text"];
    Module["_sqlite3_randomness"] = wasmExports2["sqlite3_randomness"];
    Module["_sqlite3_stricmp"] = wasmExports2["sqlite3_stricmp"];
    Module["_sqlite3_strnicmp"] = wasmExports2["sqlite3_strnicmp"];
    Module["_sqlite3_uri_parameter"] = wasmExports2["sqlite3_uri_parameter"];
    Module["_sqlite3_uri_boolean"] = wasmExports2["sqlite3_uri_boolean"];
    Module["_sqlite3_serialize"] = wasmExports2["sqlite3_serialize"];
    Module["_sqlite3_prepare_v2"] = wasmExports2["sqlite3_prepare_v2"];
    Module["_sqlite3_step"] = wasmExports2["sqlite3_step"];
    Module["_sqlite3_column_int64"] = wasmExports2["sqlite3_column_int64"];
    Module["_sqlite3_reset"] = wasmExports2["sqlite3_reset"];
    Module["_sqlite3_exec"] = wasmExports2["sqlite3_exec"];
    Module["_sqlite3_column_int"] = wasmExports2["sqlite3_column_int"];
    Module["_sqlite3_finalize"] = wasmExports2["sqlite3_finalize"];
    Module["_sqlite3_file_control"] = wasmExports2["sqlite3_file_control"];
    Module["_sqlite3_column_name"] = wasmExports2["sqlite3_column_name"];
    Module["_sqlite3_column_text"] = wasmExports2["sqlite3_column_text"];
    Module["_sqlite3_column_type"] = wasmExports2["sqlite3_column_type"];
    Module["_sqlite3_errmsg"] = wasmExports2["sqlite3_errmsg"];
    Module["_sqlite3_deserialize"] = wasmExports2["sqlite3_deserialize"];
    Module["_sqlite3_backup_init"] = wasmExports2["sqlite3_backup_init"];
    Module["_sqlite3_backup_step"] = wasmExports2["sqlite3_backup_step"];
    Module["_sqlite3_backup_finish"] = wasmExports2["sqlite3_backup_finish"];
    Module["_sqlite3_backup_remaining"] = wasmExports2["sqlite3_backup_remaining"];
    Module["_sqlite3_backup_pagecount"] = wasmExports2["sqlite3_backup_pagecount"];
    Module["_sqlite3_clear_bindings"] = wasmExports2["sqlite3_clear_bindings"];
    Module["_sqlite3_value_blob"] = wasmExports2["sqlite3_value_blob"];
    Module["_sqlite3_value_bytes"] = wasmExports2["sqlite3_value_bytes"];
    Module["_sqlite3_value_double"] = wasmExports2["sqlite3_value_double"];
    Module["_sqlite3_value_int"] = wasmExports2["sqlite3_value_int"];
    Module["_sqlite3_value_int64"] = wasmExports2["sqlite3_value_int64"];
    Module["_sqlite3_value_subtype"] = wasmExports2["sqlite3_value_subtype"];
    Module["_sqlite3_value_pointer"] = wasmExports2["sqlite3_value_pointer"];
    Module["_sqlite3_value_type"] = wasmExports2["sqlite3_value_type"];
    Module["_sqlite3_value_nochange"] = wasmExports2["sqlite3_value_nochange"];
    Module["_sqlite3_value_frombind"] = wasmExports2["sqlite3_value_frombind"];
    Module["_sqlite3_value_dup"] = wasmExports2["sqlite3_value_dup"];
    Module["_sqlite3_value_free"] = wasmExports2["sqlite3_value_free"];
    Module["_sqlite3_result_blob"] = wasmExports2["sqlite3_result_blob"];
    Module["_sqlite3_result_error_toobig"] = wasmExports2["sqlite3_result_error_toobig"];
    Module["_sqlite3_result_error_nomem"] = wasmExports2["sqlite3_result_error_nomem"];
    Module["_sqlite3_result_double"] = wasmExports2["sqlite3_result_double"];
    Module["_sqlite3_result_error"] = wasmExports2["sqlite3_result_error"];
    Module["_sqlite3_result_int"] = wasmExports2["sqlite3_result_int"];
    Module["_sqlite3_result_int64"] = wasmExports2["sqlite3_result_int64"];
    Module["_sqlite3_result_null"] = wasmExports2["sqlite3_result_null"];
    Module["_sqlite3_result_pointer"] = wasmExports2["sqlite3_result_pointer"];
    Module["_sqlite3_result_subtype"] = wasmExports2["sqlite3_result_subtype"];
    Module["_sqlite3_result_text"] = wasmExports2["sqlite3_result_text"];
    Module["_sqlite3_result_zeroblob"] = wasmExports2["sqlite3_result_zeroblob"];
    Module["_sqlite3_result_zeroblob64"] = wasmExports2["sqlite3_result_zeroblob64"];
    Module["_sqlite3_result_error_code"] = wasmExports2["sqlite3_result_error_code"];
    Module["_sqlite3_user_data"] = wasmExports2["sqlite3_user_data"];
    Module["_sqlite3_context_db_handle"] = wasmExports2["sqlite3_context_db_handle"];
    Module["_sqlite3_vtab_nochange"] = wasmExports2["sqlite3_vtab_nochange"];
    Module["_sqlite3_vtab_in_first"] = wasmExports2["sqlite3_vtab_in_first"];
    Module["_sqlite3_vtab_in_next"] = wasmExports2["sqlite3_vtab_in_next"];
    Module["_sqlite3_aggregate_context"] = wasmExports2["sqlite3_aggregate_context"];
    Module["_sqlite3_get_auxdata"] = wasmExports2["sqlite3_get_auxdata"];
    Module["_sqlite3_set_auxdata"] = wasmExports2["sqlite3_set_auxdata"];
    Module["_sqlite3_column_count"] = wasmExports2["sqlite3_column_count"];
    Module["_sqlite3_data_count"] = wasmExports2["sqlite3_data_count"];
    Module["_sqlite3_column_blob"] = wasmExports2["sqlite3_column_blob"];
    Module["_sqlite3_column_bytes"] = wasmExports2["sqlite3_column_bytes"];
    Module["_sqlite3_column_double"] = wasmExports2["sqlite3_column_double"];
    Module["_sqlite3_column_value"] = wasmExports2["sqlite3_column_value"];
    Module["_sqlite3_column_decltype"] = wasmExports2["sqlite3_column_decltype"];
    Module["_sqlite3_column_database_name"] = wasmExports2["sqlite3_column_database_name"];
    Module["_sqlite3_column_table_name"] = wasmExports2["sqlite3_column_table_name"];
    Module["_sqlite3_column_origin_name"] = wasmExports2["sqlite3_column_origin_name"];
    Module["_sqlite3_bind_blob"] = wasmExports2["sqlite3_bind_blob"];
    Module["_sqlite3_bind_double"] = wasmExports2["sqlite3_bind_double"];
    Module["_sqlite3_bind_int"] = wasmExports2["sqlite3_bind_int"];
    Module["_sqlite3_bind_int64"] = wasmExports2["sqlite3_bind_int64"];
    Module["_sqlite3_bind_null"] = wasmExports2["sqlite3_bind_null"];
    Module["_sqlite3_bind_pointer"] = wasmExports2["sqlite3_bind_pointer"];
    Module["_sqlite3_bind_text"] = wasmExports2["sqlite3_bind_text"];
    Module["_sqlite3_bind_zeroblob"] = wasmExports2["sqlite3_bind_zeroblob"];
    Module["_sqlite3_bind_parameter_count"] = wasmExports2["sqlite3_bind_parameter_count"];
    Module["_sqlite3_bind_parameter_name"] = wasmExports2["sqlite3_bind_parameter_name"];
    Module["_sqlite3_bind_parameter_index"] = wasmExports2["sqlite3_bind_parameter_index"];
    Module["_sqlite3_db_handle"] = wasmExports2["sqlite3_db_handle"];
    Module["_sqlite3_stmt_readonly"] = wasmExports2["sqlite3_stmt_readonly"];
    Module["_sqlite3_stmt_isexplain"] = wasmExports2["sqlite3_stmt_isexplain"];
    Module["_sqlite3_stmt_explain"] = wasmExports2["sqlite3_stmt_explain"];
    Module["_sqlite3_stmt_busy"] = wasmExports2["sqlite3_stmt_busy"];
    Module["_sqlite3_next_stmt"] = wasmExports2["sqlite3_next_stmt"];
    Module["_sqlite3_stmt_status"] = wasmExports2["sqlite3_stmt_status"];
    Module["_sqlite3_sql"] = wasmExports2["sqlite3_sql"];
    Module["_sqlite3_expanded_sql"] = wasmExports2["sqlite3_expanded_sql"];
    Module["_sqlite3_preupdate_old"] = wasmExports2["sqlite3_preupdate_old"];
    Module["_sqlite3_preupdate_count"] = wasmExports2["sqlite3_preupdate_count"];
    Module["_sqlite3_preupdate_depth"] = wasmExports2["sqlite3_preupdate_depth"];
    Module["_sqlite3_preupdate_blobwrite"] = wasmExports2["sqlite3_preupdate_blobwrite"];
    Module["_sqlite3_preupdate_new"] = wasmExports2["sqlite3_preupdate_new"];
    Module["_sqlite3_value_numeric_type"] = wasmExports2["sqlite3_value_numeric_type"];
    Module["_sqlite3_set_authorizer"] = wasmExports2["sqlite3_set_authorizer"];
    Module["_sqlite3_strglob"] = wasmExports2["sqlite3_strglob"];
    Module["_sqlite3_strlike"] = wasmExports2["sqlite3_strlike"];
    Module["_sqlite3_auto_extension"] = wasmExports2["sqlite3_auto_extension"];
    Module["_sqlite3_cancel_auto_extension"] = wasmExports2["sqlite3_cancel_auto_extension"];
    Module["_sqlite3_reset_auto_extension"] = wasmExports2["sqlite3_reset_auto_extension"];
    Module["_sqlite3_prepare_v3"] = wasmExports2["sqlite3_prepare_v3"];
    Module["_sqlite3_create_module"] = wasmExports2["sqlite3_create_module"];
    Module["_sqlite3_create_module_v2"] = wasmExports2["sqlite3_create_module_v2"];
    Module["_sqlite3_drop_modules"] = wasmExports2["sqlite3_drop_modules"];
    Module["_sqlite3_declare_vtab"] = wasmExports2["sqlite3_declare_vtab"];
    Module["_sqlite3_vtab_on_conflict"] = wasmExports2["sqlite3_vtab_on_conflict"];
    Module["_sqlite3_vtab_collation"] = wasmExports2["sqlite3_vtab_collation"];
    Module["_sqlite3_vtab_in"] = wasmExports2["sqlite3_vtab_in"];
    Module["_sqlite3_vtab_rhs_value"] = wasmExports2["sqlite3_vtab_rhs_value"];
    Module["_sqlite3_vtab_distinct"] = wasmExports2["sqlite3_vtab_distinct"];
    Module["_sqlite3_keyword_name"] = wasmExports2["sqlite3_keyword_name"];
    Module["_sqlite3_keyword_count"] = wasmExports2["sqlite3_keyword_count"];
    Module["_sqlite3_keyword_check"] = wasmExports2["sqlite3_keyword_check"];
    Module["_sqlite3_complete"] = wasmExports2["sqlite3_complete"];
    Module["_sqlite3_libversion"] = wasmExports2["sqlite3_libversion"];
    Module["_sqlite3_libversion_number"] = wasmExports2["sqlite3_libversion_number"];
    Module["_sqlite3_shutdown"] = wasmExports2["sqlite3_shutdown"];
    Module["_sqlite3_last_insert_rowid"] = wasmExports2["sqlite3_last_insert_rowid"];
    Module["_sqlite3_set_last_insert_rowid"] = wasmExports2["sqlite3_set_last_insert_rowid"];
    Module["_sqlite3_changes64"] = wasmExports2["sqlite3_changes64"];
    Module["_sqlite3_changes"] = wasmExports2["sqlite3_changes"];
    Module["_sqlite3_total_changes64"] = wasmExports2["sqlite3_total_changes64"];
    Module["_sqlite3_total_changes"] = wasmExports2["sqlite3_total_changes"];
    Module["_sqlite3_txn_state"] = wasmExports2["sqlite3_txn_state"];
    Module["_sqlite3_close_v2"] = wasmExports2["sqlite3_close_v2"];
    Module["_sqlite3_busy_handler"] = wasmExports2["sqlite3_busy_handler"];
    Module["_sqlite3_progress_handler"] = wasmExports2["sqlite3_progress_handler"];
    Module["_sqlite3_busy_timeout"] = wasmExports2["sqlite3_busy_timeout"];
    Module["_sqlite3_interrupt"] = wasmExports2["sqlite3_interrupt"];
    Module["_sqlite3_is_interrupted"] = wasmExports2["sqlite3_is_interrupted"];
    Module["_sqlite3_create_function"] = wasmExports2["sqlite3_create_function"];
    Module["_sqlite3_create_function_v2"] = wasmExports2["sqlite3_create_function_v2"];
    Module["_sqlite3_create_window_function"] = wasmExports2["sqlite3_create_window_function"];
    Module["_sqlite3_overload_function"] = wasmExports2["sqlite3_overload_function"];
    Module["_sqlite3_trace_v2"] = wasmExports2["sqlite3_trace_v2"];
    Module["_sqlite3_commit_hook"] = wasmExports2["sqlite3_commit_hook"];
    Module["_sqlite3_update_hook"] = wasmExports2["sqlite3_update_hook"];
    Module["_sqlite3_rollback_hook"] = wasmExports2["sqlite3_rollback_hook"];
    Module["_sqlite3_preupdate_hook"] = wasmExports2["sqlite3_preupdate_hook"];
    Module["_sqlite3_set_errmsg"] = wasmExports2["sqlite3_set_errmsg"];
    Module["_sqlite3_error_offset"] = wasmExports2["sqlite3_error_offset"];
    Module["_sqlite3_errcode"] = wasmExports2["sqlite3_errcode"];
    Module["_sqlite3_extended_errcode"] = wasmExports2["sqlite3_extended_errcode"];
    Module["_sqlite3_errstr"] = wasmExports2["sqlite3_errstr"];
    Module["_sqlite3_limit"] = wasmExports2["sqlite3_limit"];
    Module["_sqlite3_open"] = wasmExports2["sqlite3_open"];
    Module["_sqlite3_open_v2"] = wasmExports2["sqlite3_open_v2"];
    Module["_sqlite3_create_collation"] = wasmExports2["sqlite3_create_collation"];
    Module["_sqlite3_create_collation_v2"] = wasmExports2["sqlite3_create_collation_v2"];
    Module["_sqlite3_collation_needed"] = wasmExports2["sqlite3_collation_needed"];
    Module["_sqlite3_get_autocommit"] = wasmExports2["sqlite3_get_autocommit"];
    Module["_sqlite3_table_column_metadata"] = wasmExports2["sqlite3_table_column_metadata"];
    Module["_sqlite3_extended_result_codes"] = wasmExports2["sqlite3_extended_result_codes"];
    Module["_sqlite3_uri_key"] = wasmExports2["sqlite3_uri_key"];
    Module["_sqlite3_uri_int64"] = wasmExports2["sqlite3_uri_int64"];
    Module["_sqlite3_db_name"] = wasmExports2["sqlite3_db_name"];
    Module["_sqlite3_db_filename"] = wasmExports2["sqlite3_db_filename"];
    Module["_sqlite3_db_readonly"] = wasmExports2["sqlite3_db_readonly"];
    Module["_sqlite3_compileoption_used"] = wasmExports2["sqlite3_compileoption_used"];
    Module["_sqlite3_compileoption_get"] = wasmExports2["sqlite3_compileoption_get"];
    Module["_sqlite3session_diff"] = wasmExports2["sqlite3session_diff"];
    Module["_sqlite3session_attach"] = wasmExports2["sqlite3session_attach"];
    Module["_sqlite3session_create"] = wasmExports2["sqlite3session_create"];
    Module["_sqlite3session_delete"] = wasmExports2["sqlite3session_delete"];
    Module["_sqlite3session_table_filter"] = wasmExports2["sqlite3session_table_filter"];
    Module["_sqlite3session_changeset"] = wasmExports2["sqlite3session_changeset"];
    Module["_sqlite3session_changeset_strm"] = wasmExports2["sqlite3session_changeset_strm"];
    Module["_sqlite3session_patchset_strm"] = wasmExports2["sqlite3session_patchset_strm"];
    Module["_sqlite3session_patchset"] = wasmExports2["sqlite3session_patchset"];
    Module["_sqlite3session_enable"] = wasmExports2["sqlite3session_enable"];
    Module["_sqlite3session_indirect"] = wasmExports2["sqlite3session_indirect"];
    Module["_sqlite3session_isempty"] = wasmExports2["sqlite3session_isempty"];
    Module["_sqlite3session_memory_used"] = wasmExports2["sqlite3session_memory_used"];
    Module["_sqlite3session_object_config"] = wasmExports2["sqlite3session_object_config"];
    Module["_sqlite3session_changeset_size"] = wasmExports2["sqlite3session_changeset_size"];
    Module["_sqlite3changeset_start"] = wasmExports2["sqlite3changeset_start"];
    Module["_sqlite3changeset_start_v2"] = wasmExports2["sqlite3changeset_start_v2"];
    Module["_sqlite3changeset_start_strm"] = wasmExports2["sqlite3changeset_start_strm"];
    Module["_sqlite3changeset_start_v2_strm"] = wasmExports2["sqlite3changeset_start_v2_strm"];
    Module["_sqlite3changeset_next"] = wasmExports2["sqlite3changeset_next"];
    Module["_sqlite3changeset_op"] = wasmExports2["sqlite3changeset_op"];
    Module["_sqlite3changeset_pk"] = wasmExports2["sqlite3changeset_pk"];
    Module["_sqlite3changeset_old"] = wasmExports2["sqlite3changeset_old"];
    Module["_sqlite3changeset_new"] = wasmExports2["sqlite3changeset_new"];
    Module["_sqlite3changeset_conflict"] = wasmExports2["sqlite3changeset_conflict"];
    Module["_sqlite3changeset_fk_conflicts"] = wasmExports2["sqlite3changeset_fk_conflicts"];
    Module["_sqlite3changeset_finalize"] = wasmExports2["sqlite3changeset_finalize"];
    Module["_sqlite3changeset_invert"] = wasmExports2["sqlite3changeset_invert"];
    Module["_sqlite3changeset_invert_strm"] = wasmExports2["sqlite3changeset_invert_strm"];
    Module["_sqlite3changeset_apply_v2"] = wasmExports2["sqlite3changeset_apply_v2"];
    Module["_sqlite3changeset_apply_v3"] = wasmExports2["sqlite3changeset_apply_v3"];
    Module["_sqlite3changeset_apply"] = wasmExports2["sqlite3changeset_apply"];
    Module["_sqlite3changeset_apply_v3_strm"] = wasmExports2["sqlite3changeset_apply_v3_strm"];
    Module["_sqlite3changeset_apply_v2_strm"] = wasmExports2["sqlite3changeset_apply_v2_strm"];
    Module["_sqlite3changeset_apply_strm"] = wasmExports2["sqlite3changeset_apply_strm"];
    Module["_sqlite3changegroup_new"] = wasmExports2["sqlite3changegroup_new"];
    Module["_sqlite3changegroup_add"] = wasmExports2["sqlite3changegroup_add"];
    Module["_sqlite3changegroup_output"] = wasmExports2["sqlite3changegroup_output"];
    Module["_sqlite3changegroup_add_strm"] = wasmExports2["sqlite3changegroup_add_strm"];
    Module["_sqlite3changegroup_output_strm"] = wasmExports2["sqlite3changegroup_output_strm"];
    Module["_sqlite3changegroup_delete"] = wasmExports2["sqlite3changegroup_delete"];
    Module["_sqlite3changeset_concat"] = wasmExports2["sqlite3changeset_concat"];
    Module["_sqlite3changeset_concat_strm"] = wasmExports2["sqlite3changeset_concat_strm"];
    Module["_sqlite3session_config"] = wasmExports2["sqlite3session_config"];
    Module["_sqlite3_sourceid"] = wasmExports2["sqlite3_sourceid"];
    Module["_sqlite3__wasm_pstack_ptr"] = wasmExports2["sqlite3__wasm_pstack_ptr"];
    Module["_sqlite3__wasm_pstack_restore"] = wasmExports2["sqlite3__wasm_pstack_restore"];
    Module["_sqlite3__wasm_pstack_alloc"] = wasmExports2["sqlite3__wasm_pstack_alloc"];
    Module["_sqlite3__wasm_pstack_remaining"] = wasmExports2["sqlite3__wasm_pstack_remaining"];
    Module["_sqlite3__wasm_pstack_quota"] = wasmExports2["sqlite3__wasm_pstack_quota"];
    Module["_sqlite3__wasm_test_struct"] = wasmExports2["sqlite3__wasm_test_struct"];
    Module["_sqlite3__wasm_enum_json"] = wasmExports2["sqlite3__wasm_enum_json"];
    Module["_sqlite3__wasm_vfs_unlink"] = wasmExports2["sqlite3__wasm_vfs_unlink"];
    Module["_sqlite3__wasm_db_vfs"] = wasmExports2["sqlite3__wasm_db_vfs"];
    Module["_sqlite3__wasm_db_reset"] = wasmExports2["sqlite3__wasm_db_reset"];
    Module["_sqlite3__wasm_db_export_chunked"] = wasmExports2["sqlite3__wasm_db_export_chunked"];
    Module["_sqlite3__wasm_db_serialize"] = wasmExports2["sqlite3__wasm_db_serialize"];
    Module["_sqlite3__wasm_vfs_create_file"] = wasmExports2["sqlite3__wasm_vfs_create_file"];
    Module["_sqlite3__wasm_posix_create_file"] = wasmExports2["sqlite3__wasm_posix_create_file"];
    Module["_sqlite3__wasm_kvvfsMakeKey"] = wasmExports2["sqlite3__wasm_kvvfsMakeKey"];
    Module["_sqlite3__wasm_kvvfs_methods"] = wasmExports2["sqlite3__wasm_kvvfs_methods"];
    Module["_sqlite3__wasm_vtab_config"] = wasmExports2["sqlite3__wasm_vtab_config"];
    Module["_sqlite3__wasm_db_config_ip"] = wasmExports2["sqlite3__wasm_db_config_ip"];
    Module["_sqlite3__wasm_db_config_pii"] = wasmExports2["sqlite3__wasm_db_config_pii"];
    Module["_sqlite3__wasm_db_config_s"] = wasmExports2["sqlite3__wasm_db_config_s"];
    Module["_sqlite3__wasm_config_i"] = wasmExports2["sqlite3__wasm_config_i"];
    Module["_sqlite3__wasm_config_ii"] = wasmExports2["sqlite3__wasm_config_ii"];
    Module["_sqlite3__wasm_config_j"] = wasmExports2["sqlite3__wasm_config_j"];
    Module["_sqlite3__wasm_qfmt_token"] = wasmExports2["sqlite3__wasm_qfmt_token"];
    Module["_sqlite3__wasm_kvvfs_decode"] = wasmExports2["sqlite3__wasm_kvvfs_decode"];
    Module["_sqlite3__wasm_kvvfs_encode"] = wasmExports2["sqlite3__wasm_kvvfs_encode"];
    Module["_sqlite3__wasm_init_wasmfs"] = wasmExports2["sqlite3__wasm_init_wasmfs"];
    Module["_sqlite3__wasm_test_intptr"] = wasmExports2["sqlite3__wasm_test_intptr"];
    Module["_sqlite3__wasm_test_voidptr"] = wasmExports2["sqlite3__wasm_test_voidptr"];
    Module["_sqlite3__wasm_test_int64_max"] = wasmExports2["sqlite3__wasm_test_int64_max"];
    Module["_sqlite3__wasm_test_int64_min"] = wasmExports2["sqlite3__wasm_test_int64_min"];
    Module["_sqlite3__wasm_test_int64_times2"] = wasmExports2["sqlite3__wasm_test_int64_times2"];
    Module["_sqlite3__wasm_test_int64_minmax"] = wasmExports2["sqlite3__wasm_test_int64_minmax"];
    Module["_sqlite3__wasm_test_int64ptr"] = wasmExports2["sqlite3__wasm_test_int64ptr"];
    Module["_sqlite3__wasm_test_stack_overflow"] = wasmExports2["sqlite3__wasm_test_stack_overflow"];
    Module["_sqlite3__wasm_test_str_hello"] = wasmExports2["sqlite3__wasm_test_str_hello"];
    Module["_sqlite3__wasm_SQLTester_strglob"] = wasmExports2["sqlite3__wasm_SQLTester_strglob"];
    Module["_malloc"] = wasmExports2["malloc"];
    Module["_free"] = wasmExports2["free"];
    Module["_realloc"] = wasmExports2["realloc"];
    _emscripten_builtin_memalign = wasmExports2["emscripten_builtin_memalign"];
    wasmExports2["_emscripten_stack_restore"];
    wasmExports2["_emscripten_stack_alloc"];
    wasmExports2["emscripten_stack_get_current"];
    wasmExports2["__indirect_function_table"];
  }
  var wasmImports = {
    /** @export */
    __syscall_chmod: ___syscall_chmod,
    /** @export */
    __syscall_faccessat: ___syscall_faccessat,
    /** @export */
    __syscall_fchmod: ___syscall_fchmod,
    /** @export */
    __syscall_fchown32: ___syscall_fchown32,
    /** @export */
    __syscall_fcntl64: ___syscall_fcntl64,
    /** @export */
    __syscall_fstat64: ___syscall_fstat64,
    /** @export */
    __syscall_ftruncate64: ___syscall_ftruncate64,
    /** @export */
    __syscall_getcwd: ___syscall_getcwd,
    /** @export */
    __syscall_ioctl: ___syscall_ioctl,
    /** @export */
    __syscall_lstat64: ___syscall_lstat64,
    /** @export */
    __syscall_mkdirat: ___syscall_mkdirat,
    /** @export */
    __syscall_newfstatat: ___syscall_newfstatat,
    /** @export */
    __syscall_openat: ___syscall_openat,
    /** @export */
    __syscall_readlinkat: ___syscall_readlinkat,
    /** @export */
    __syscall_rmdir: ___syscall_rmdir,
    /** @export */
    __syscall_stat64: ___syscall_stat64,
    /** @export */
    __syscall_unlinkat: ___syscall_unlinkat,
    /** @export */
    __syscall_utimensat: ___syscall_utimensat,
    /** @export */
    _localtime_js: __localtime_js,
    /** @export */
    _mmap_js: __mmap_js,
    /** @export */
    _munmap_js: __munmap_js,
    /** @export */
    _tzset_js: __tzset_js,
    /** @export */
    clock_time_get: _clock_time_get,
    /** @export */
    emscripten_date_now: _emscripten_date_now,
    /** @export */
    emscripten_get_heap_max: _emscripten_get_heap_max,
    /** @export */
    emscripten_get_now: _emscripten_get_now,
    /** @export */
    emscripten_resize_heap: _emscripten_resize_heap,
    /** @export */
    environ_get: _environ_get,
    /** @export */
    environ_sizes_get: _environ_sizes_get,
    /** @export */
    fd_close: _fd_close,
    /** @export */
    fd_fdstat_get: _fd_fdstat_get,
    /** @export */
    fd_read: _fd_read,
    /** @export */
    fd_seek: _fd_seek,
    /** @export */
    fd_sync: _fd_sync,
    /** @export */
    fd_write: _fd_write,
    /** @export */
    memory: wasmMemory
  };
  function run() {
    if (runDependencies > 0) {
      dependenciesFulfilled = run;
      return;
    }
    preRun();
    if (runDependencies > 0) {
      dependenciesFulfilled = run;
      return;
    }
    function doRun() {
      Module["calledRun"] = true;
      if (ABORT) return;
      initRuntime();
      readyPromiseResolve?.(Module);
      Module["onRuntimeInitialized"]?.();
      postRun();
    }
    if (Module["setStatus"]) {
      Module["setStatus"]("Running...");
      setTimeout(() => {
        setTimeout(() => Module["setStatus"](""), 1);
        doRun();
      }, 1);
    } else doRun();
  }
  var wasmExports = await createWasm();
  run();
  Module.runSQLite3PostLoadInit = async function(sqlite3InitScriptInfo, EmscriptenModule, sqlite3IsUnderTest) {
    "use strict";
    delete EmscriptenModule.runSQLite3PostLoadInit;
    globalThis.sqlite3ApiBootstrap = async function sqlite3ApiBootstrap(apiConfig = globalThis.sqlite3ApiConfig || sqlite3ApiBootstrap.defaultConfig) {
      if (sqlite3ApiBootstrap.sqlite3) {
        (sqlite3ApiBootstrap.sqlite3.config || console).warn("sqlite3ApiBootstrap() called multiple times.", "Config and external initializers are ignored on calls after the first.");
        return sqlite3ApiBootstrap.sqlite3;
      }
      const nu = (...obj) => Object.assign(/* @__PURE__ */ Object.create(null), ...obj);
      const config = nu({
        exports: void 0,
        memory: void 0,
        bigIntEnabled: !!globalThis.BigInt64Array,
        debug: console.debug.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        log: console.log.bind(console),
        wasmfsOpfsDir: "/opfs",
        /**
        useStdAlloc is just for testing allocator discrepancies. The
        docs guarantee that this is false in the canonical builds. For
        99% of purposes it doesn't matter which allocators we use, but
        it becomes significant with, e.g., sqlite3_deserialize() and
        certain wasm.xWrap.resultAdapter()s.
        */
        useStdAlloc: false
      }, apiConfig);
      Object.assign(config, {
        allocExportName: config.useStdAlloc ? "malloc" : "sqlite3_malloc",
        deallocExportName: config.useStdAlloc ? "free" : "sqlite3_free",
        reallocExportName: config.useStdAlloc ? "realloc" : "sqlite3_realloc"
      });
      [
        "exports",
        "memory",
        "functionTable",
        "wasmfsOpfsDir"
      ].forEach((k2) => {
        if ("function" === typeof config[k2]) config[k2] = config[k2]();
      });
      const capi = nu();
      const wasm = nu();
      const __rcStr = (rc) => {
        return capi.sqlite3_js_rc_str && capi.sqlite3_js_rc_str(rc) || "Unknown result code #" + rc;
      };
      const isInt32 = (n) => "number" === typeof n && n === (n | 0) && n <= 2147483647 && n >= -2147483648;
      class SQLite3Error extends Error {
        /**
        Constructs this object with a message depending on its arguments:
        
        If its first argument is an integer, it is assumed to be
        an SQLITE_... result code and it is passed to
        sqlite3.capi.sqlite3_js_rc_str() to stringify it.
        
        If called with exactly 2 arguments and the 2nd is an object,
        that object is treated as the 2nd argument to the parent
        constructor.
        
        The exception's message is created by concatenating its
        arguments with a space between each, except for the
        two-args-with-an-object form and that the first argument will
        get coerced to a string, as described above, if it's an
        integer.
        
        If passed an integer first argument, the error object's
        `resultCode` member will be set to the given integer value,
        else it will be set to capi.SQLITE_ERROR.
        */
        constructor(...args) {
          let rc;
          if (args.length) {
            if (isInt32(args[0])) {
              rc = args[0];
              if (1 === args.length) super(__rcStr(args[0]));
              else {
                const rcStr = __rcStr(rc);
                if ("object" === typeof args[1]) super(rcStr, args[1]);
                else {
                  args[0] = rcStr + ":";
                  super(args.join(" "));
                }
              }
            } else if (2 === args.length && "object" === typeof args[1]) super(...args);
            else super(args.join(" "));
          }
          this.resultCode = rc || capi.SQLITE_ERROR;
          this.name = "SQLite3Error";
        }
      }
      SQLite3Error.toss = (...args) => {
        throw new SQLite3Error(...args);
      };
      const toss3 = SQLite3Error.toss;
      if (config.wasmfsOpfsDir && !/^\/[^/]+$/.test(config.wasmfsOpfsDir)) toss3("config.wasmfsOpfsDir must be falsy or in the form '/dir-name'.");
      const bigIntFits64 = function f(b) {
        if (!f._max) {
          f._max = BigInt("0x7fffffffffffffff");
          f._min = ~f._max;
        }
        return b >= f._min && b <= f._max;
      };
      const bigIntFits32 = (b) => b >= -2147483647n - 1n && b <= 2147483647n;
      const bigIntFitsDouble = function f(b) {
        if (!f._min) {
          f._min = Number.MIN_SAFE_INTEGER;
          f._max = Number.MAX_SAFE_INTEGER;
        }
        return b >= f._min && b <= f._max;
      };
      const isTypedArray = (v2) => {
        return v2 && v2.constructor && isInt32(v2.constructor.BYTES_PER_ELEMENT) ? v2 : false;
      };
      const isBindableTypedArray = (v2) => v2 && (v2 instanceof Uint8Array || v2 instanceof Int8Array || v2 instanceof ArrayBuffer);
      const isSQLableTypedArray = (v2) => v2 && (v2 instanceof Uint8Array || v2 instanceof Int8Array || v2 instanceof ArrayBuffer);
      const affirmBindableTypedArray = (v2) => isBindableTypedArray(v2) || toss3("Value is not of a supported TypedArray type.");
      const flexibleString = function(v2) {
        if (isSQLableTypedArray(v2)) return wasm.typedArrayToString(v2 instanceof ArrayBuffer ? new Uint8Array(v2) : v2, 0, v2.length);
        else if (Array.isArray(v2)) return v2.join("");
        else if (wasm.isPtr(v2)) v2 = wasm.cstrToJs(v2);
        return v2;
      };
      class WasmAllocError extends Error {
        /**
        If called with 2 arguments and the 2nd one is an object, it
        behaves like the Error constructor, else it concatenates all
        arguments together with a single space between each to
        construct an error message string. As a special case, if
        called with no arguments then it uses a default error
        message.
        */
        constructor(...args) {
          if (2 === args.length && "object" === typeof args[1]) super(...args);
          else if (args.length) super(args.join(" "));
          else super("Allocation failed.");
          this.resultCode = capi.SQLITE_NOMEM;
          this.name = "WasmAllocError";
        }
      }
      WasmAllocError.toss = (...args) => {
        throw new WasmAllocError(...args);
      };
      Object.assign(capi, {
        /**
        sqlite3_bind_blob() works exactly like its C counterpart unless
        its 3rd argument is one of:
        
        - JS string: the 3rd argument is converted to a C string, the
        4th argument is ignored, and the C-string's length is used
        in its place.
        
        - Array: converted to a string as defined for "flexible
        strings" and then it's treated as a JS string.
        
        - Int8Array or Uint8Array: wasm.allocFromTypedArray() is used to
        conver the memory to the WASM heap. If the 4th argument is
        0 or greater, it is used as-is, otherwise the array's byteLength
        value is used. This is an exception to the C API's undefined
        behavior for a negative 4th argument, but results are undefined
        if the given 4th argument value is greater than the byteLength
        of the input array.
        
        - If it's an ArrayBuffer, it gets wrapped in a Uint8Array and
        treated as that type.
        
        In all of those cases, the final argument (destructor) is
        ignored and capi.SQLITE_WASM_DEALLOC is assumed.
        
        A 3rd argument of `null` is treated as if it were a WASM pointer
        of 0.
        
        If the 3rd argument is neither a WASM pointer nor one of the
        above-described types, capi.SQLITE_MISUSE is returned.
        
        The first argument may be either an `sqlite3_stmt*` WASM
        pointer or an sqlite3.oo1.Stmt instance.
        
        For consistency with the C API, it requires the same number of
        arguments. It returns capi.SQLITE_MISUSE if passed any other
        argument count.
        */
        sqlite3_bind_blob: void 0,
        /**
        sqlite3_bind_text() works exactly like its C counterpart unless
        its 3rd argument is one of:
        
        - JS string: the 3rd argument is converted to a C string, the
        4th argument is ignored, and the C-string's length is used
        in its place.
        
        - Array: converted to a string as defined for "flexible
        strings". The 4th argument is ignored and a value of -1
        is assumed.
        
        - Int8Array or Uint8Array: is assumed to contain UTF-8 text, is
        converted to a string. The 4th argument is ignored, replaced
        by the array's byteLength value.
        
        - If it's an ArrayBuffer, it gets wrapped in a Uint8Array and
        treated as that type.
        
        In each of those cases, the final argument (text destructor) is
        ignored and capi.SQLITE_WASM_DEALLOC is assumed.
        
        A 3rd argument of `null` is treated as if it were a WASM pointer
        of 0.
        
        If the 3rd argument is neither a WASM pointer nor one of the
        above-described types, capi.SQLITE_MISUSE is returned.
        
        The first argument may be either an `sqlite3_stmt*` WASM
        pointer or an sqlite3.oo1.Stmt instance.
        
        For consistency with the C API, it requires the same number of
        arguments. It returns capi.SQLITE_MISUSE if passed any other
        argument count.
        
        If client code needs to bind partial strings, it needs to
        either parcel the string up before passing it in here or it
        must pass in a WASM pointer for the 3rd argument and a valid
        4th-argument value, taking care not to pass a value which
        truncates a multi-byte UTF-8 character. When passing
        WASM-format strings, it is important that the final argument be
        valid or unexpected content can result, or WASM may crash if
        the application reads past the WASM heap bounds.
        */
        sqlite3_bind_text: void 0,
        /**
        sqlite3_create_function_v2() differs from its native
        counterpart only in the following ways:
        
        1) The fourth argument (`eTextRep`) argument must not specify
        any encoding other than sqlite3.SQLITE_UTF8. The JS API does not
        currently support any other encoding and likely never
        will. This function does not replace that argument on its own
        because it may contain other flags. As a special case, if
        the bottom 4 bits of that argument are 0, SQLITE_UTF8 is
        assumed.
        
        2) Any of the four final arguments may be either WASM pointers
        (assumed to be function pointers) or JS Functions. In the
        latter case, each gets bound to WASM using
        sqlite3.capi.wasm.installFunction() and that wrapper is passed
        on to the native implementation.
        
        For consistency with the C API, it requires the same number of
        arguments. It returns capi.SQLITE_MISUSE if passed any other
        argument count.
        
        The semantics of JS functions are:
        
        xFunc: is passed `(pCtx, ...values)`. Its return value becomes
        the new SQL function's result.
        
        xStep: is passed `(pCtx, ...values)`. Its return value is
        ignored.
        
        xFinal: is passed `(pCtx)`. Its return value becomes the new
        aggregate SQL function's result.
        
        xDestroy: is passed `(void*)`. Its return value is ignored. The
        pointer passed to it is the one from the 5th argument to
        sqlite3_create_function_v2().
        
        Note that:
        
        - `pCtx` in the above descriptions is a `sqlite3_context*`. At
        least 99 times out of a hundred, that initial argument will
        be irrelevant for JS UDF bindings, but it needs to be there
        so that the cases where it _is_ relevant, in particular with
        window and aggregate functions, have full access to the
        lower-level sqlite3 APIs.
        
        - When wrapping JS functions, the remaining arguments are passd
        to them as positional arguments, not as an array of
        arguments, because that allows callback definitions to be
        more JS-idiomatic than C-like. For example `(pCtx,a,b)=>a+b`
        is more intuitive and legible than
        `(pCtx,args)=>args[0]+args[1]`. For cases where an array of
        arguments would be more convenient, the callbacks simply need
        to be declared like `(pCtx,...args)=>{...}`, in which case
        `args` will be an array.
        
        - If a JS wrapper throws, it gets translated to
        sqlite3_result_error() or sqlite3_result_error_nomem(),
        depending on whether the exception is an
        sqlite3.WasmAllocError object or not.
        
        - When passing on WASM function pointers, arguments are _not_
        converted or reformulated. They are passed on as-is in raw
        pointer form using their native C signatures. Only JS
        functions passed in to this routine, and thus wrapped by this
        routine, get automatic conversions of arguments and result
        values. The routines which perform those conversions are
        exposed for client-side use as sqlite3_values_to_js(),
        sqlite3_result_js(), and sqlite3_result_error_js().
        
        For xFunc(), xStep(), and xFinal():
        
        - When called from SQL, arguments to the UDF, and its result,
        will be converted between JS and SQL with as much fidelity as
        is feasible, triggering an exception if a type conversion
        cannot be determined. Some freedom is afforded to numeric
        conversions due to friction between the JS and C worlds:
        integers which are larger than 32 bits may be treated as
        doubles or BigInts.
        
        If any JS-side bound functions throw, those exceptions are
        intercepted and converted to database-side errors with the
        exception of xDestroy(): any exception from it is ignored,
        possibly generating a console.error() message.  Destructors
        must not throw.
        
        Automatically-converted JS-to-WASM functions will be cleaned up
        either when (A) this function is called again with the same
        name, arity, and encoding, but null/0 values for the functions,
        or (B) when pDb is passed to sqlite3_close_v2(). If this factor
        is relevant for a given client, they can create WASM-bound JS
        functions themselves, hold on to their pointers, and pass the
        pointers in to here. Later on, they can free those pointers
        (using `wasm.uninstallFunction()` or equivalent).
        
        C reference: https://sqlite.org/c3ref/create_function.html
        
        Maintenance reminder: the ability to add new
        WASM-accessible functions to the runtime requires that the
        WASM build is compiled with emcc's `-sALLOW_TABLE_GROWTH`
        flag.
        */
        sqlite3_create_function_v2: (pDb2, funcName, nArg, eTextRep, pApp, xFunc, xStep, xFinal, xDestroy) => {
        },
        /**
        Equivalent to passing the same arguments to
        sqlite3_create_function_v2(), with 0 as the final argument.
        */
        sqlite3_create_function: (pDb2, funcName, nArg, eTextRep, pApp, xFunc, xStep, xFinal) => {
        },
        /**
        The sqlite3_create_window_function() JS wrapper differs from
        its native implementation in the exact same way that
        sqlite3_create_function_v2() does. The additional function,
        xInverse(), is treated identically to xStep() by the wrapping
        layer.
        */
        sqlite3_create_window_function: (pDb2, funcName, nArg, eTextRep, pApp, xStep, xFinal, xValue, xInverse, xDestroy) => {
        },
        /**
        The sqlite3_prepare_v3() binding handles two different uses
        with differing JS/WASM semantics:
        
        1) sqlite3_prepare_v3(pDb, sqlString, -1, prepFlags, ppStmt , null)
        
        2) sqlite3_prepare_v3(pDb, sqlPointer, sqlByteLen, prepFlags, ppStmt, sqlPointerToPointer)
        
        The SQL length argument (the 3rd argument) must, for usage (1),
        always be negative because it must be a byte length and that
        value is expensive to calculate from JS (where only the
        character length of strings is readily available). It is
        retained in this API's interface for code/documentation
        compatibility reasons but is currently _always_ ignored. With
        usage (2), the 3rd argument is used as-is but is is still
        critical that the C-style input string (2nd argument) be
        terminated with a 0 byte.
        
        In usage (1), the 2nd argument must be of type string,
        Uint8Array, Int8Array, or ArrayBuffer (all of which are assumed
        to hold SQL). If it is, this function assumes case (1) and
        calls the underyling C function with the equivalent of:
        
        (pDb, sqlAsString, -1, prepFlags, ppStmt, null)
        
        The `pzTail` argument is ignored in this case because its
        result is meaningless when a string-type value is passed
        through: the string goes through another level of internal
        conversion for WASM's sake and the result pointer would refer
        to that transient conversion's memory, not the passed-in
        string.
        
        If the sql argument is not a string, it must be a _pointer_ to
        a NUL-terminated string which was allocated in the WASM memory
        (e.g. using capi.wasm.alloc() or equivalent). In that case,
        the final argument may be 0/null/undefined or must be a pointer
        to which the "tail" of the compiled SQL is written, as
        documented for the C-side sqlite3_prepare_v3().
        
        In case (2), the underlying C function is called with the
        equivalent of:
        
        (pDb, sqlAsPointer, sqlByteLen, prepFlags, ppStmt, pzTail)
        
        It returns its result and compiled statement as documented in
        the C API. Fetching the output pointers (5th and 6th
        parameters) requires using `capi.wasm.peek()` (or
        equivalent) and the `pzTail` will point to an address relative to
        the `sqlAsPointer` value.
        
        If passed an invalid 2nd argument type, this function will
        return SQLITE_MISUSE and sqlite3_errmsg() will contain a string
        describing the problem.
        
        Side-note: if given an empty string, or one which contains only
        comments or an empty SQL expression, 0 is returned but the result
        output pointer will be NULL.
        */
        sqlite3_prepare_v3: (dbPtr, sql2, sqlByteLen, prepFlags, stmtPtrPtr, strPtrPtr) => {
        },
        /**
        Equivalent to calling sqlite3_prapare_v3() with 0 as its 4th argument.
        */
        sqlite3_prepare_v2: (dbPtr, sql2, sqlByteLen, stmtPtrPtr, strPtrPtr) => {
        },
        /**
        This binding enables the callback argument to be a JavaScript.
        
        If the callback is a function, then for the duration of the
        sqlite3_exec() call, it installs a WASM-bound function which
        acts as a proxy for the given callback. That proxy will also
        perform a conversion of the callback's arguments from
        `(char**)` to JS arrays of strings. However, for API
        consistency's sake it will still honor the C-level callback
        parameter order and will call it like:
        
        `callback(pVoid, colCount, listOfValues, listOfColNames)`
        
        If the callback is not a JS function then this binding performs
        no translation of the callback, but the sql argument is still
        converted to a WASM string for the call using the
        "string:flexible" argument converter.
        */
        sqlite3_exec: (pDb2, sql2, callback, pVoid, pErrMsg) => {
        },
        /**
        If passed a single argument which appears to be a byte-oriented
        TypedArray (Int8Array or Uint8Array), this function treats that
        TypedArray as an output target, fetches `theArray.byteLength`
        bytes of randomness, and populates the whole array with it. As
        a special case, if the array's length is 0, this function
        behaves as if it were passed (0,0). When called this way, it
        returns its argument, else it returns the `undefined` value.
        
        If called with any other arguments, they are passed on as-is
        to the C API. Results are undefined if passed any incompatible
        values.
        */
        sqlite3_randomness: (n, outPtr) => {
        }
      });
      const util = {
        affirmBindableTypedArray,
        flexibleString,
        bigIntFits32,
        bigIntFits64,
        bigIntFitsDouble,
        isBindableTypedArray,
        isInt32,
        isSQLableTypedArray,
        isTypedArray,
        isUIThread: () => globalThis.window === globalThis && !!globalThis.document,
        toss: function(...args) {
          throw new Error(args.join(" "));
        },
        toss3,
        typedArrayPart: wasm.typedArrayPart,
        nu,
        assert: function(arg, msg) {
          if (!arg) util.toss("Assertion failed:", msg);
        },
        /**
        Given a byte array or ArrayBuffer, this function throws if the
        lead bytes of that buffer do not hold a SQLite3 database header,
        else it returns without side effects.
        
        Added in 3.44. As of 3.54 in SEE builds it performs only a
        rudimentary length check and does not fail for invalid header
        bytes, under the assumption that the input may be an encrypted
        db. We cannot unambiguously distinguish an encrypted db from
        garbage bytes.
        */
        affirmDbHeader: function(bytes) {
          if (bytes instanceof ArrayBuffer) bytes = new Uint8Array(bytes);
          const header = "SQLite format 3";
          if (15 > bytes.byteLength) toss3("Input does not contain an SQLite3 database header.");
          for (let i2 = 0; i2 < 15; ++i2) if (header.charCodeAt(i2) !== bytes[i2]) toss3("Input does not contain an SQLite3 database header.");
        },
        /**
        Given a byte array or ArrayBuffer, this function throws if the
        database does not, at a cursory glance, appear to be an SQLite3
        database. It only examines the size and header, but further
        checks may be added in the future.
        
        Added in 3.44. See notes in affirmDbHeader() regarding SEE
        builds.
        */
        affirmIsDb: function(bytes) {
          if (bytes instanceof ArrayBuffer) bytes = new Uint8Array(bytes);
          const n = bytes.byteLength;
          if (n < 512 || n % 512 !== 0) toss3("Byte array size", n, "is invalid for an SQLite3 db.");
          util.affirmDbHeader(bytes);
        }
      };
      Object.assign(wasm, {
        /**
        The symbols exported by the WASM environment.
        */
        exports: config.exports || toss3("Missing API config.exports (WASM module exports)."),
        /**
        When Emscripten compiles with `-sIMPORTED_MEMORY`, it
        initializes the heap and imports it into wasm, as opposed to
        the other way around. In this case, the memory is not available
        via this.exports.memory so the client must pass it in via
        config.memory.
        */
        memory: config.memory || config.exports["memory"] || toss3("API config object requires a WebAssembly.Memory object", "in either config.exports.memory (exported)", "or config.memory (imported)."),
        /**
        The WASM pointer size. If set then it MUST be one of 4 or 8 and
        it MUST correspond to the WASM environment's pointer size. We
        figure out the size by calling some un-JS-wrapped WASM function
        which returns a pointer-type value. If that value is a BigInt,
        it's 64-bit, else it's 32-bit. The pieces which populate
        sqlite3.wasm (whwasmutil.js) can figure this out _if_ they can
        allocate, but we have a chicken/egg situation there which makes
        it illegal for that code to invoke wasm.dealloc() at the time
        it would be needed. So we need to configure it ahead of time
        (here) instead.
        */
        pointerSize: "number" === typeof config.exports.sqlite3_libversion() ? 4 : 8,
        /**
        True if BigInt support was enabled via (e.g.) the
        Emscripten -sWASM_BIGINT flag, else false. When
        enabled, certain 64-bit sqlite3 APIs are enabled which
        are not otherwise enabled due to JS/WASM int64
        impedance mismatches.
        */
        bigIntEnabled: !!config.bigIntEnabled,
        /**
        WebAssembly.Table object holding the indirect function call
        table. Defaults to exports.__indirect_function_table.
        */
        functionTable: config.functionTable,
        /**
        The API's primary point of access to the WASM-side memory
        allocator.  Works like sqlite3_malloc() but throws a
        WasmAllocError if allocation fails. It is important that any
        code which might pass through the sqlite3 C API NOT throw and
        must instead return SQLITE_NOMEM (or equivalent, depending on
        the context).
        
        Very few cases in the sqlite3 JS APIs can result in
        client-defined functions propagating exceptions via the C-style
        API. Most notably, this applies to WASM-bound JS functions
        which are created directly by clients and passed on _as WASM
        function pointers_ to functions such as
        sqlite3_create_function_v2(). Such bindings created
        transparently by this API will automatically use wrappers which
        catch exceptions and convert them to appropriate error codes.
        
        For cases where non-throwing allocation is required, use
        this.alloc.impl(), which is the unadulterated WASM-exported
        counterpart of this wrapper.
        
        Design note: this function is not named "malloc" primarily
        because Emscripten uses that name and we wanted to avoid any
        confusion early on in this code's development, when it still
        had close ties to Emscripten's glue code.
        */
        alloc: void 0,
        /**
        Rarely necessary in JS code, this routine works like
        sqlite3_realloc(M,N), where M is either NULL or a pointer
        obtained from this function or this.alloc() and N is the number
        of bytes to reallocate the block to. Returns a pointer to the
        reallocated block or 0 if allocation fails.
        
        If M is NULL and N is positive, this behaves like
        this.alloc(N). If N is 0, it behaves like this.dealloc().
        Results are undefined if N is negative (sqlite3_realloc()
        treats that as 0, but if this code is built with a different
        allocator it may misbehave with negative values).
        
        Like this.alloc.impl(), this.realloc.impl() is a direct binding
        to the underlying realloc() implementation which does not throw
        exceptions, instead returning 0 (or 0n) on allocation error.
        */
        realloc: void 0,
        /**
        The API's primary point of access to the WASM-side memory
        deallocator. Works like sqlite3_free().
        
        Design note: this function is not named "free" for the same
        reason that this.alloc() is not called this.malloc().
        */
        dealloc: void 0
      });
      wasm.allocFromTypedArray = function(srcTypedArray) {
        if (srcTypedArray instanceof ArrayBuffer) srcTypedArray = new Uint8Array(srcTypedArray);
        affirmBindableTypedArray(srcTypedArray);
        const pRet = wasm.alloc(srcTypedArray.byteLength || 1);
        wasm.heapForSize(srcTypedArray.constructor).set(srcTypedArray.byteLength ? srcTypedArray : [0], Number(pRet));
        return pRet;
      };
      {
        const keyAlloc = config.allocExportName, keyDealloc = config.deallocExportName, keyRealloc = config.reallocExportName;
        for (const key of [
          keyAlloc,
          keyDealloc,
          keyRealloc
        ]) if (!(wasm.exports[key] instanceof Function)) toss3("Missing required exports[", key, "] function.");
        wasm.alloc = function f(n) {
          return f.impl(n) || WasmAllocError.toss("Failed to allocate", n, " bytes.");
        };
        wasm.alloc.impl = wasm.exports[keyAlloc];
        wasm.realloc = function f(m, n) {
          const m2 = f.impl(wasm.ptr.coerce(m), n);
          return n ? m2 || WasmAllocError.toss("Failed to reallocate", n, " bytes.") : wasm.ptr.null;
        };
        wasm.realloc.impl = wasm.exports[keyRealloc];
        wasm.dealloc = function f(m) {
          f.impl(wasm.ptr.coerce(m));
        };
        wasm.dealloc.impl = wasm.exports[keyDealloc];
      }
      wasm.compileOptionUsed = function f(optName) {
        if (!arguments.length) {
          if (f._result) return f._result;
          else if (!f._opt) {
            f._rx = /^([^=]+)=(.+)/;
            f._rxInt = /^-?\d+$/;
            f._opt = function(opt, rv) {
              const m = f._rx.exec(opt);
              rv[0] = m ? m[1] : opt;
              rv[1] = m ? f._rxInt.test(m[2]) ? +m[2] : m[2] : true;
            };
          }
          const rc = nu(), ov = [0, 0];
          let i2 = 0, k2;
          while (k2 = capi.sqlite3_compileoption_get(i2++)) {
            f._opt(k2, ov);
            rc[ov[0]] = ov[1];
          }
          return f._result = rc;
        } else if (Array.isArray(optName)) {
          const rc = nu();
          optName.forEach((v2) => {
            rc[v2] = capi.sqlite3_compileoption_used(v2);
          });
          return rc;
        } else if ("object" === typeof optName) {
          Object.keys(optName).forEach((k2) => {
            optName[k2] = capi.sqlite3_compileoption_used(k2);
          });
          return optName;
        }
        return "string" === typeof optName ? !!capi.sqlite3_compileoption_used(optName) : false;
      };
      wasm.pstack = nu({
        /**
        Sets the current pstack position to the given pointer. Results
        are undefined if the passed-in value did not come from
        this.pointer.
        
        In debug builds this may trigger an assert() in the WASM
        environment if passed an illegal value.
        */
        restore: wasm.exports.sqlite3__wasm_pstack_restore,
        /**
        Attempts to allocate the given number of bytes from the
        pstack. On success, it zeroes out a block of memory of the
        given size, adjusts the pstack pointer, and returns a pointer
        to the memory. On error, throws a WasmAllocError. The
        memory must eventually be released using restore().
        
        If n is a string, it must be a WASM "IR" value in the set
        accepted by wasm.sizeofIR(), which is mapped to the size of
        that data type. If passed a string not in that set, it throws a
        WasmAllocError.
        
        This method always adjusts the given value to be a multiple
        of 8 bytes because failing to do so can lead to incorrect
        results when reading and writing 64-bit values from/to the WASM
        heap. Similarly, the returned address is always 8-byte aligned.
        */
        alloc: function(n) {
          if ("string" === typeof n && !(n = wasm.sizeofIR(n))) WasmAllocError.toss("Invalid value for pstack.alloc(", arguments[0], ")");
          return wasm.exports.sqlite3__wasm_pstack_alloc(n) || WasmAllocError.toss("Could not allocate", n, "bytes from the pstack.");
        },
        /**
        alloc()'s n chunks, each sz bytes, as a single memory block and
        returns the addresses as an array of n element, each holding
        the address of one chunk.
        
        sz may optionally be an IR string accepted by wasm.sizeofIR().
        
        Throws a WasmAllocError if allocation fails.
        
        Example:
        
        ```
        const [p1, p2, p3] = wasm.pstack.allocChunks(3, wasm.ptr.size);
        ```
        */
        allocChunks: function(n, sz) {
          if ("string" === typeof sz && !(sz = wasm.sizeofIR(sz))) WasmAllocError.toss("Invalid size value for allocChunks(", arguments[1], ")");
          const mem = wasm.pstack.alloc(n * sz);
          const rc = [mem];
          let i2 = 1, offset = sz;
          for (; i2 < n; ++i2, offset += sz) rc.push(wasm.ptr.add(mem, offset));
          return rc;
        },
        /**
        A convenience wrapper for allocChunks() which sizes each chunk
        as either 8 bytes (safePtrSize is truthy) or wasm.ptr.size (if
        safePtrSize is falsy).
        
        How it returns its result differs depending on its first
        argument: if it's 1, it returns a single pointer value. If it's
        more than 1, it returns the same as allocChunks().
        
        When a returned pointer will refer to a 64-bit value, e.g. a
        double or int64, and that value must be written or fetched,
        e.g. using wasm.poke() or wasm.peek(), it is
        important that the pointer in question be aligned to an 8-byte
        boundary or else it will not be fetched or written properly and
        will corrupt or read neighboring memory.
        
        However, when all pointers involved point to "small" data, it
        is safe to pass a falsy value to save a tiny bit of memory.
        */
        allocPtr: (n = 1, safePtrSize = true) => {
          return 1 === n ? wasm.pstack.alloc(safePtrSize ? 8 : wasm.ptr.size) : wasm.pstack.allocChunks(n, safePtrSize ? 8 : wasm.ptr.size);
        },
        /**
        Records the current pstack position, calls the given function,
        passing it the sqlite3 object, then restores the pstack
        regardless of whether the function throws. Returns the result
        of the call or propagates an exception on error.
        
        Added in 3.44.
        */
        call: function(f) {
          const stackPos = wasm.pstack.pointer;
          try {
            return f(sqlite3);
          } finally {
            wasm.pstack.restore(stackPos);
          }
        }
      });
      Object.defineProperties(wasm.pstack, {
        /**
        Resolves to the current pstack position pointer either as a
        Number (32-bit WASM) or BigInt (64-bit WASM). This value is
        intended _only_ to be saved for passing to restore(). Writing
        to this memory, without first reserving it via
        wasm.pstack.alloc() and friends, leads to undefined results.
        */
        pointer: {
          configurable: false,
          iterable: true,
          writeable: false,
          get: wasm.exports.sqlite3__wasm_pstack_ptr
        },
        /**
        Resolves to the total number of bytes available in the pstack
        allocator, including any space which is currently
        allocated. This value is a compile-time constant.
        */
        quota: {
          configurable: false,
          iterable: true,
          writeable: false,
          get: wasm.exports.sqlite3__wasm_pstack_quota
        },
        /**
        Resolves to the number of bytes remaining in the pstack
        allocator.
        */
        remaining: {
          configurable: false,
          iterable: true,
          writeable: false,
          get: wasm.exports.sqlite3__wasm_pstack_remaining
        }
      });
      capi.sqlite3_randomness = (...args) => {
        if (1 === args.length && util.isTypedArray(args[0]) && 1 === args[0].BYTES_PER_ELEMENT) {
          const ta = args[0];
          if (0 === ta.byteLength) {
            wasm.exports.sqlite3_randomness(0, wasm.ptr.null);
            return ta;
          }
          const stack = wasm.pstack.pointer;
          try {
            let n = ta.byteLength, offset = 0;
            const r = wasm.exports.sqlite3_randomness;
            const heap = wasm.heap8u();
            const nAlloc = n < 512 ? n : 512;
            const ptr = wasm.pstack.alloc(nAlloc);
            do {
              const j = n > nAlloc ? nAlloc : n;
              r(j, ptr);
              ta.set(wasm.typedArrayPart(heap, ptr, wasm.ptr.add(ptr, j)), offset);
              n -= j;
              offset += j;
            } while (n > 0);
          } catch (e) {
            config.error("Highly unexpected (and ignored!) exception in sqlite3_randomness():", e);
          } finally {
            wasm.pstack.restore(stack);
          }
          return ta;
        }
        wasm.exports.sqlite3_randomness(...args);
      };
      capi.sqlite3_wasmfs_opfs_dir = function() {
        if (void 0 !== this.dir) return this.dir;
        const pdir = config.wasmfsOpfsDir;
        if (!pdir || !globalThis.FileSystemHandle || !globalThis.FileSystemDirectoryHandle || !globalThis.FileSystemFileHandle || !wasm.exports.sqlite3__wasm_init_wasmfs) return this.dir = "";
        try {
          if (pdir && 0 === wasm.xCallWrapped("sqlite3__wasm_init_wasmfs", "i32", ["string"], pdir)) return this.dir = pdir;
          else return this.dir = "";
        } catch (e) {
          return this.dir = "";
        }
      }.bind(nu());
      capi.sqlite3_wasmfs_filename_is_persistent = function(name) {
        const p = capi.sqlite3_wasmfs_opfs_dir();
        return p && name ? name.startsWith(p + "/") : false;
      };
      capi.sqlite3_js_db_uses_vfs = function(pDb2, vfsName, dbName = 0) {
        try {
          const pK = capi.sqlite3_vfs_find(vfsName);
          if (!pK) return false;
          else if (!pDb2) return pK === capi.sqlite3_vfs_find(0) ? pK : false;
          else return pK === capi.sqlite3_js_db_vfs(pDb2, dbName) ? pK : false;
        } catch (e) {
          return false;
        }
      };
      capi.sqlite3_js_vfs_list = function() {
        const rc = [];
        let pVfs = capi.sqlite3_vfs_find(wasm.ptr.null);
        while (pVfs) {
          const oVfs = new capi.sqlite3_vfs(pVfs);
          rc.push(wasm.cstrToJs(oVfs.$zName));
          pVfs = oVfs.$pNext;
          oVfs.dispose();
        }
        return rc;
      };
      capi.sqlite3_js_db_export = function(pDb2, schema = 0) {
        pDb2 = wasm.xWrap.testConvertArg("sqlite3*", pDb2);
        if (!pDb2) toss3("Invalid sqlite3* argument.");
        if (!wasm.bigIntEnabled) toss3("BigInt support is not enabled.");
        const scope = wasm.scopedAllocPush();
        let pOut;
        try {
          const pSize = wasm.scopedAlloc(8 + wasm.ptr.size);
          const ppOut = wasm.ptr.add(pSize, 8);
          const zSchema = schema ? wasm.isPtr(schema) ? schema : wasm.scopedAllocCString("" + schema) : wasm.ptr.null;
          let rc = wasm.exports.sqlite3__wasm_db_serialize(pDb2, zSchema, ppOut, pSize, 0);
          if (rc) toss3("Database serialization failed with code", sqlite3.capi.sqlite3_js_rc_str(rc));
          pOut = wasm.peekPtr(ppOut);
          const nOut = wasm.peek(pSize, "i64");
          rc = nOut ? wasm.heap8u().slice(Number(pOut), Number(pOut) + Number(nOut)) : /* @__PURE__ */ new Uint8Array();
          return rc;
        } finally {
          if (pOut) wasm.exports.sqlite3_free(pOut);
          wasm.scopedAllocPop(scope);
        }
      };
      capi.sqlite3_js_db_vfs = (dbPointer, dbName = wasm.ptr.null) => util.sqlite3__wasm_db_vfs(dbPointer, dbName);
      capi.sqlite3_js_aggregate_context = (pCtx, n) => {
        return capi.sqlite3_aggregate_context(pCtx, n) || (n ? WasmAllocError.toss("Cannot allocate", n, "bytes for sqlite3_aggregate_context()") : 0);
      };
      capi.sqlite3_js_posix_create_file = function(filename, data, dataLen) {
        let pData;
        if (data && wasm.isPtr(data)) pData = data;
        else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
          pData = wasm.allocFromTypedArray(data);
          if (arguments.length < 3 || !util.isInt32(dataLen) || dataLen < 0) dataLen = data.byteLength;
        } else SQLite3Error.toss("Invalid 2nd argument for sqlite3_js_posix_create_file().");
        try {
          if (!util.isInt32(dataLen) || dataLen < 0) SQLite3Error.toss("Invalid 3rd argument for sqlite3_js_posix_create_file().");
          const rc = util.sqlite3__wasm_posix_create_file(filename, pData, dataLen);
          if (rc) SQLite3Error.toss("Creation of file failed with sqlite3 result code", capi.sqlite3_js_rc_str(rc));
        } finally {
          if (pData && pData !== data) wasm.dealloc(pData);
        }
      };
      capi.sqlite3_js_vfs_create_file = function(vfs, filename, data, dataLen) {
        config.warn("sqlite3_js_vfs_create_file() is deprecated and", "should be avoided because it can lead to C-level crashes.", "See its documentation for alternatives.");
        let pData;
        if (data) {
          if (wasm.isPtr(data)) pData = data;
          else {
            if (data instanceof ArrayBuffer) data = new Uint8Array(data);
            if (data instanceof Uint8Array) {
              pData = wasm.allocFromTypedArray(data);
              if (arguments.length < 4 || !util.isInt32(dataLen) || dataLen < 0) dataLen = data.byteLength;
            } else SQLite3Error.toss("Invalid 3rd argument type for sqlite3_js_vfs_create_file().");
          }
        } else pData = 0;
        if (!util.isInt32(dataLen) || dataLen < 0) {
          if (pData && pData !== data) wasm.dealloc(pData);
          SQLite3Error.toss("Invalid 4th argument for sqlite3_js_vfs_create_file().");
        }
        try {
          const rc = util.sqlite3__wasm_vfs_create_file(vfs, filename, pData, dataLen);
          if (rc) SQLite3Error.toss("Creation of file failed with sqlite3 result code", capi.sqlite3_js_rc_str(rc));
        } finally {
          if (pData && pData !== data) wasm.dealloc(pData);
        }
      };
      capi.sqlite3_js_sql_to_string = (sql2) => {
        if ("string" === typeof sql2) return sql2;
        const x2 = flexibleString(v);
        return x2 === v ? void 0 : x2;
      };
      capi.sqlite3_db_config = function(pDb2, op, ...args) {
        switch (op) {
          case capi.SQLITE_DBCONFIG_ENABLE_FKEY:
          case capi.SQLITE_DBCONFIG_ENABLE_TRIGGER:
          case capi.SQLITE_DBCONFIG_ENABLE_FTS3_TOKENIZER:
          case capi.SQLITE_DBCONFIG_ENABLE_LOAD_EXTENSION:
          case capi.SQLITE_DBCONFIG_NO_CKPT_ON_CLOSE:
          case capi.SQLITE_DBCONFIG_ENABLE_QPSG:
          case capi.SQLITE_DBCONFIG_TRIGGER_EQP:
          case capi.SQLITE_DBCONFIG_RESET_DATABASE:
          case capi.SQLITE_DBCONFIG_DEFENSIVE:
          case capi.SQLITE_DBCONFIG_WRITABLE_SCHEMA:
          case capi.SQLITE_DBCONFIG_LEGACY_ALTER_TABLE:
          case capi.SQLITE_DBCONFIG_DQS_DML:
          case capi.SQLITE_DBCONFIG_DQS_DDL:
          case capi.SQLITE_DBCONFIG_ENABLE_VIEW:
          case capi.SQLITE_DBCONFIG_LEGACY_FILE_FORMAT:
          case capi.SQLITE_DBCONFIG_TRUSTED_SCHEMA:
          case capi.SQLITE_DBCONFIG_STMT_SCANSTATUS:
          case capi.SQLITE_DBCONFIG_REVERSE_SCANORDER:
          case capi.SQLITE_DBCONFIG_ENABLE_ATTACH_CREATE:
          case capi.SQLITE_DBCONFIG_ENABLE_ATTACH_WRITE:
          case capi.SQLITE_DBCONFIG_ENABLE_COMMENTS:
          case capi.SQLITE_DBCONFIG_FP_DIGITS:
            if (!this.ip) this.ip = wasm.xWrap("sqlite3__wasm_db_config_ip", "int", [
              "sqlite3*",
              "int",
              "int",
              "*"
            ]);
            return this.ip(pDb2, op, args[0], args[1] || 0);
          case capi.SQLITE_DBCONFIG_LOOKASIDE:
            if (!this.pii) this.pii = wasm.xWrap("sqlite3__wasm_db_config_pii", "int", [
              "sqlite3*",
              "int",
              "*",
              "int",
              "int"
            ]);
            return this.pii(pDb2, op, args[0], args[1], args[2]);
          case capi.SQLITE_DBCONFIG_MAINDBNAME:
            if (!this.s) this.s = wasm.xWrap("sqlite3__wasm_db_config_s", "int", [
              "sqlite3*",
              "int",
              "string:static"
            ]);
            return this.s(pDb2, op, args[0]);
          default:
            return capi.SQLITE_MISUSE;
        }
      }.bind(nu());
      capi.sqlite3_value_to_js = function(pVal, throwIfCannotConvert = true) {
        let arg;
        const valType = capi.sqlite3_value_type(pVal);
        switch (valType) {
          case capi.SQLITE_INTEGER:
            if (wasm.bigIntEnabled) {
              arg = capi.sqlite3_value_int64(pVal);
              if (util.bigIntFitsDouble(arg)) arg = Number(arg);
            } else arg = capi.sqlite3_value_double(pVal);
            break;
          case capi.SQLITE_FLOAT:
            arg = capi.sqlite3_value_double(pVal);
            break;
          case capi.SQLITE_TEXT:
            arg = capi.sqlite3_value_text(pVal);
            break;
          case capi.SQLITE_BLOB: {
            const n = capi.sqlite3_value_bytes(pVal);
            const pBlob = capi.sqlite3_value_blob(pVal);
            if (n && !pBlob) sqlite3.WasmAllocError.toss("Cannot allocate memory for blob argument of", n, "byte(s)");
            arg = n ? wasm.heap8u().slice(Number(pBlob), Number(pBlob) + Number(n)) : null;
            break;
          }
          case capi.SQLITE_NULL:
            arg = null;
            break;
          default:
            if (throwIfCannotConvert) toss3(capi.SQLITE_MISMATCH, "Unhandled sqlite3_value_type():", valType);
            arg = void 0;
        }
        return arg;
      };
      capi.sqlite3_values_to_js = function(argc, pArgv, throwIfCannotConvert = true) {
        let i2;
        const tgt = [];
        for (i2 = 0; i2 < argc; ++i2)
          tgt.push(capi.sqlite3_value_to_js(wasm.peekPtr(wasm.ptr.add(pArgv, wasm.ptr.size * i2)), throwIfCannotConvert));
        return tgt;
      };
      capi.sqlite3_result_error_js = function(pCtx, e) {
        if (e instanceof WasmAllocError) capi.sqlite3_result_error_nomem(pCtx);
        else capi.sqlite3_result_error(pCtx, "" + e, -1);
      };
      capi.sqlite3_result_js = function(pCtx, val) {
        if (val instanceof Error) {
          capi.sqlite3_result_error_js(pCtx, val);
          return;
        }
        try {
          switch (typeof val) {
            case "undefined":
              break;
            case "boolean":
              capi.sqlite3_result_int(pCtx, val ? 1 : 0);
              break;
            case "bigint":
              if (util.bigIntFits32(val)) capi.sqlite3_result_int(pCtx, Number(val));
              else if (util.bigIntFitsDouble(val)) capi.sqlite3_result_double(pCtx, Number(val));
              else if (wasm.bigIntEnabled) {
                if (util.bigIntFits64(val)) capi.sqlite3_result_int64(pCtx, val);
                else toss3("BigInt value", val.toString(), "is too BigInt for int64.");
              } else toss3("BigInt value", val.toString(), "is too BigInt.");
              break;
            case "number": {
              let f;
              if (util.isInt32(val)) f = capi.sqlite3_result_int;
              else if (wasm.bigIntEnabled && Number.isInteger(val) && util.bigIntFits64(BigInt(val))) f = capi.sqlite3_result_int64;
              else f = capi.sqlite3_result_double;
              f(pCtx, val);
              break;
            }
            case "string": {
              const [p, n] = wasm.allocCString(val, true);
              capi.sqlite3_result_text(pCtx, p, n, capi.SQLITE_WASM_DEALLOC);
              break;
            }
            case "object":
              if (null === val) {
                capi.sqlite3_result_null(pCtx);
                break;
              } else if (util.isBindableTypedArray(val)) {
                const pBlob = wasm.allocFromTypedArray(val);
                capi.sqlite3_result_blob(pCtx, pBlob, val.byteLength, capi.SQLITE_WASM_DEALLOC);
                break;
              }
            default:
              toss3("Don't not how to handle this UDF result value:", typeof val, val);
          }
        } catch (e) {
          capi.sqlite3_result_error_js(pCtx, e);
        }
      };
      capi.sqlite3_column_js = function(pStmt, iCol, throwIfCannotConvert = true) {
        const v2 = capi.sqlite3_column_value(pStmt, iCol);
        return 0 === v2 ? void 0 : capi.sqlite3_value_to_js(v2, throwIfCannotConvert);
      };
      {
        const __newOldValue = function(pObj, iCol, impl) {
          impl = capi[impl];
          if (!this.ptr) this.ptr = wasm.allocPtr();
          else wasm.pokePtr(this.ptr, 0);
          const rc = impl(pObj, iCol, this.ptr);
          if (rc) return SQLite3Error.toss(rc, arguments[2] + "() failed with code " + rc);
          const pv = wasm.peekPtr(this.ptr);
          return pv ? capi.sqlite3_value_to_js(pv, true) : void 0;
        }.bind(nu());
        capi.sqlite3_preupdate_new_js = (pDb2, iCol) => __newOldValue(pDb2, iCol, "sqlite3_preupdate_new");
        capi.sqlite3_preupdate_old_js = (pDb2, iCol) => __newOldValue(pDb2, iCol, "sqlite3_preupdate_old");
        capi.sqlite3changeset_new_js = (pChangesetIter, iCol) => __newOldValue(pChangesetIter, iCol, "sqlite3changeset_new");
        capi.sqlite3changeset_old_js = (pChangesetIter, iCol) => __newOldValue(pChangesetIter, iCol, "sqlite3changeset_old");
      }
      capi.sqlite3_js_retry_busy = function(maxTimes, callback, beforeRetry) {
        for (let n = 1; n <= maxTimes; ++n) try {
          if (beforeRetry && n > 1) beforeRetry(n);
          const rc = callback();
          if (capi.SQLITE_BUSY === rc) {
            if (n === maxTimes) throw new SQLite3Error(rc, [
              "sqlite3_js_retry_busy() max retry attempts (",
              maxTimes,
              ") reached."
            ].join(""));
            continue;
          }
          return rc;
        } catch (e) {
          if (n < maxTimes && e instanceof SQLite3Error && e.resultCode === capi.SQLITE_BUSY) continue;
          throw e;
        }
      };
      const sqlite3 = {
        WasmAllocError,
        SQLite3Error,
        capi,
        util,
        wasm,
        config,
        /**
        Holds the version info of the sqlite3 source tree from which
        the generated sqlite3-api.js gets built. Its version may well
        differ from that reported by sqlite3_libversion(), but that
        should be considered a source file mismatch, as the JS and WASM
        files are intended to be built and distributed together.
        
        This object is initially a placeholder which gets replaced by a
        build-generated object.
        */
        version: nu(),
        /**
        The library reserves the 'client' property for client-side use
        and promises to never define a property with this name nor to
        ever rely on specific contents of it. It makes no such guarantees
        for other properties.
        */
        client: void 0,
        /**
        This function is not part of the public interface, but a
        piece of internal bootstrapping infrastructure.
        
        Performs any optional asynchronous library-level initialization
        which might be required. This function returns a Promise which
        resolves to the sqlite3 namespace object. Any error in the
        async init will be fatal to the init as a whole, but init
        routines are themselves welcome to install dummy catch()
        handlers which are not fatal if their failure should be
        considered non-fatal.
        
        Ideally this function is called as part of the Promise chain
        which handles the loading and bootstrapping of the API.  If not
        then it must be called by client-level code, which must not use
        the library until the returned Promise resolves.
        
        If called multiple times it will return the same Promise on
        subsequent calls. The current build setup precludes that
        possibility, so it's only a hypothetical problem if/when this
        function ever needs to be invoked by clients.
        
        In Emscripten-based builds, this function is called
        automatically and deleted from this object.
        */
        asyncPostInit: async function ff() {
          if (ff.isReady instanceof Promise) return ff.isReady;
          let lia = this.initializersAsync;
          delete this.initializersAsync;
          const postInit = async () => {
            if (!sqlite3.__isUnderTest) {
              delete sqlite3.util;
              delete sqlite3.StructBinder;
              delete sqlite3.opfs;
            }
            return sqlite3;
          };
          const catcher = (e) => {
            config.error("an async sqlite3 initializer failed:", e);
            throw e;
          };
          if (!lia || !lia.length) return ff.isReady = postInit().catch(catcher);
          lia = lia.map((f) => {
            return f instanceof Function ? async (x2) => f(sqlite3) : f;
          });
          lia.push(postInit);
          let p = Promise.resolve(sqlite3);
          while (lia.length) p = p.then(lia.shift());
          return ff.isReady = p.catch(catcher);
        }.bind(sqlite3ApiBootstrap),
        /**
        scriptInfo holds information about the currenty-loading script
        so that we can locate the WASM file if it's somewhere other
        than the build-time-defined directory. It ideally gets injected
        into this object by the infrastructure which assembles the
        JS/WASM module. It contains state which must be collected
        before sqlite3ApiBootstrap() can be declared. It is not
        necessarily available to any sqlite3ApiBootstrap.initializers
        but "should" be in place (if it's added at all) by the time
        that sqlite3ApiBootstrap.initializersAsync is processed.
        
        This state is not part of the public API, only intended for use
        with the sqlite3 API bootstrapping and wasm-loading process.
        */
        scriptInfo: void 0
      };
      if ("undefined" !== typeof sqlite3IsUnderTest) sqlite3.__isUnderTest = !!sqlite3IsUnderTest;
      try {
        sqlite3ApiBootstrap.initializers.forEach((f) => {
          f(sqlite3);
        });
      } catch (e) {
        console.error("sqlite3 bootstrap initializer threw:", e);
        throw e;
      }
      delete sqlite3ApiBootstrap.initializers;
      sqlite3ApiBootstrap.sqlite3 = sqlite3;
      if ("undefined" !== typeof sqlite3InitScriptInfo) {
        sqlite3InitScriptInfo.debugModule("sqlite3ApiBootstrap() complete", sqlite3);
        sqlite3.scriptInfo = sqlite3InitScriptInfo;
      }
      if (sqlite3.__isUnderTest) {
        if ("undefined" !== typeof EmscriptenModule) sqlite3.config.emscripten = EmscriptenModule;
        const iw = sqlite3.scriptInfo?.instantiateWasm;
        if (iw) {
          sqlite3.wasm.module = iw.module;
          sqlite3.wasm.instance = iw.instance;
          sqlite3.wasm.imports = iw.imports;
        }
      }
      delete globalThis.sqlite3ApiConfig;
      delete globalThis.sqlite3ApiBootstrap;
      delete sqlite3ApiBootstrap.defaultConfig;
      return sqlite3.asyncPostInit().then((s) => {
        if ("undefined" !== typeof sqlite3InitScriptInfo) sqlite3InitScriptInfo.debugModule("sqlite3.asyncPostInit() complete", s);
        delete s.asyncPostInit;
        delete s.scriptInfo;
        delete s.emscripten;
        return s;
      });
    };
    globalThis.sqlite3ApiBootstrap.initializers = [];
    globalThis.sqlite3ApiBootstrap.initializersAsync = [];
    globalThis.sqlite3ApiBootstrap.defaultConfig = /* @__PURE__ */ Object.create(null);
    globalThis.sqlite3ApiBootstrap.sqlite3 = void 0;
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      sqlite3.version = {
        "libVersion": "3.54.1",
        "libVersionNumber": 3054001,
        "sourceId": "2026-10-16 14:45:20 555e07ef33f69a0957d24d8e555b702464a131d6f1607f4c3c1e4551e8e6ca76",
        "downloadVersion": 3540100,
        "scm": {
          "sha3-256": "555e07ef33f69a0957d24d8e555b702464a131d6f1607f4c3c1e4551e8e6ca76",
          "branch": "branch-3.54",
          "tags": "release version-3.54.1",
          "datetime": "2026-10-16T14:45:20.546Z"
        }
      };
    });
    globalThis.WhWasmUtilInstaller = function WhWasmUtilInstaller(target) {
      "use strict";
      if (void 0 === target.bigIntEnabled) target.bigIntEnabled = !!globalThis["BigInt64Array"];
      const toss = (...args) => {
        throw new Error(args.join(" "));
      };
      if (!target.pointerSize && !target.pointerIR && target.alloc && target.dealloc) {
        const ptr = target.alloc(1);
        target.pointerSize = "bigint" === typeof ptr ? 8 : 4;
        target.dealloc(ptr);
      }
      if (target.pointerSize && !target.pointerIR) target.pointerIR = 4 === target.pointerSize ? "i32" : "i64";
      const __ptrIR = target.pointerIR ??= "i32";
      const __ptrSize = target.pointerSize ??= "i32" === __ptrIR ? 4 : "i64" === __ptrIR ? 8 : 0;
      delete target.pointerSize;
      delete target.pointerIR;
      if ("i32" !== __ptrIR && "i64" !== __ptrIR) toss("Invalid pointerIR:", __ptrIR);
      else if (8 !== __ptrSize && 4 !== __ptrSize) toss("Invalid pointerSize:", __ptrSize);
      const __BigInt = target.bigIntEnabled ? (v2) => BigInt(v2 || 0) : (v2) => toss("BigInt support is disabled in this build.");
      const __Number = (v2) => Number(v2 || 0);
      const __asPtrType = 4 === __ptrSize ? __Number : __BigInt;
      const __NullPtr = __asPtrType(0);
      const __ptrAdd = function(...args) {
        let rc = __asPtrType(0);
        for (const v2 of args) rc += __asPtrType(v2);
        return rc;
      };
      {
        const __ptr = /* @__PURE__ */ Object.create(null);
        Object.defineProperty(target, "ptr", {
          enumerable: true,
          get: () => __ptr,
          set: () => toss("The ptr property is read-only.")
        });
        (function f(name, val) {
          Object.defineProperty(__ptr, name, {
            enumerable: true,
            get: () => val,
            set: () => toss("ptr[" + name + "] is read-only.")
          });
          return f;
        })("null", __NullPtr)("size", __ptrSize)("ir", __ptrIR)("coerce", __asPtrType)("add", __ptrAdd)("addn", 4 === __ptrIR ? __ptrAdd : (...args) => Number(__ptrAdd(...args)));
      }
      if (!target.exports) Object.defineProperty(target, "exports", {
        enumerable: true,
        configurable: true,
        get: () => target.instance?.exports
      });
      const cache = /* @__PURE__ */ Object.create(null);
      cache.heapSize = 0;
      cache.memory = null;
      cache.freeFuncIndexes = [];
      cache.scopedAlloc = [];
      cache.scopedAlloc.pushPtr = (ptr) => {
        cache.scopedAlloc[cache.scopedAlloc.length - 1].push(ptr);
        return ptr;
      };
      cache.utf8Decoder = new TextDecoder();
      cache.utf8Encoder = new TextEncoder("utf-8");
      target.sizeofIR = (n) => {
        switch (n) {
          case "i8":
            return 1;
          case "i16":
            return 2;
          case "i32":
          case "f32":
          case "float":
            return 4;
          case "i64":
          case "f64":
          case "double":
            return 8;
          case "*":
            return __ptrSize;
          default:
            return ("" + n).endsWith("*") ? __ptrSize : void 0;
        }
      };
      const heapWrappers = function() {
        if (!cache.memory) cache.memory = target.memory instanceof WebAssembly.Memory ? target.memory : target.exports.memory;
        else if (cache.heapSize === cache.memory.buffer.byteLength) return cache;
        const b = cache.memory.buffer;
        cache.HEAP8 = new Int8Array(b);
        cache.HEAP8U = new Uint8Array(b);
        cache.HEAP16 = new Int16Array(b);
        cache.HEAP16U = new Uint16Array(b);
        cache.HEAP32 = new Int32Array(b);
        cache.HEAP32U = new Uint32Array(b);
        cache.HEAP32F = new Float32Array(b);
        cache.HEAP64F = new Float64Array(b);
        if (target.bigIntEnabled) {
          if ("undefined" !== typeof BigInt64Array) {
            cache.HEAP64 = new BigInt64Array(b);
            cache.HEAP64U = new BigUint64Array(b);
          } else toss("BigInt support is enabled, but the BigInt64Array type is missing.");
        }
        cache.heapSize = b.byteLength;
        return cache;
      };
      target.heap8 = () => heapWrappers().HEAP8;
      target.heap8u = () => heapWrappers().HEAP8U;
      target.heap16 = () => heapWrappers().HEAP16;
      target.heap16u = () => heapWrappers().HEAP16U;
      target.heap32 = () => heapWrappers().HEAP32;
      target.heap32u = () => heapWrappers().HEAP32U;
      target.heapForSize = function(n, unsigned = true) {
        const c = cache.memory && cache.heapSize === cache.memory.buffer.byteLength ? cache : heapWrappers();
        switch (n) {
          case Int8Array:
            return c.HEAP8;
          case Uint8Array:
            return c.HEAP8U;
          case Int16Array:
            return c.HEAP16;
          case Uint16Array:
            return c.HEAP16U;
          case Int32Array:
            return c.HEAP32;
          case Uint32Array:
            return c.HEAP32U;
          case 8:
            return unsigned ? c.HEAP8U : c.HEAP8;
          case 16:
            return unsigned ? c.HEAP16U : c.HEAP16;
          case 32:
            return unsigned ? c.HEAP32U : c.HEAP32;
          case 64:
            if (c.HEAP64) return unsigned ? c.HEAP64U : c.HEAP64;
            break;
          default:
            if (target.bigIntEnabled) {
              if (n === globalThis["BigUint64Array"]) return c.HEAP64U;
              else if (n === globalThis["BigInt64Array"]) return c.HEAP64;
              break;
            }
        }
        toss("Invalid heapForSize() size: expecting 8, 16, 32,", "or (if BigInt is enabled) 64.");
      };
      const __funcTable = target.functionTable;
      delete target.functionTable;
      target.functionTable = __funcTable ? () => __funcTable : () => target.exports.__indirect_function_table;
      target.functionEntry = function(fptr) {
        const ft = target.functionTable();
        return fptr < ft.length ? ft.get(__asPtrType(fptr)) : void 0;
      };
      target.jsFuncToWasm = function f(func, sig) {
        if (!f._) f._ = {
          sigTypes: Object.assign(/* @__PURE__ */ Object.create(null), {
            i: "i32",
            p: __ptrIR,
            P: __ptrIR,
            s: __ptrIR,
            j: "i64",
            f: "f32",
            d: "f64"
          }),
          typeCodes: Object.assign(/* @__PURE__ */ Object.create(null), {
            f64: 124,
            f32: 125,
            i64: 126,
            i32: 127
          }),
          /** Encodes n, which must be <2^14 (16384), into target array
          tgt, as a little-endian value, using the given method
          ('push' or 'unshift'). */
          uleb128Encode: (tgt, method, n) => {
            if (n < 128) tgt[method](n);
            else tgt[method](n % 128 | 128, n >> 7);
          },
          /** Intentionally-lax pattern for Jaccwabyt-format function
          pointer signatures, the intent of which is simply to
          distinguish them from Emscripten-format signatures. The
          downstream checks are less lax. */
          rxJSig: /^(\w)\((\w*)\)$/,
          /** Returns the parameter-value part of the given signature
          string. */
          sigParams: (sig2) => {
            const m = f._.rxJSig.exec(sig2);
            return m ? m[2] : sig2.substr(1);
          },
          /** Returns the IR value for the given letter or throws
          if the letter is invalid. */
          letterType: (x2) => f._.sigTypes[x2] || toss("Invalid signature letter:", x2),
          /** Pushes the WASM data type code for the given signature
          letter to the given target array. Throws if letter is
          invalid. */
          pushSigType: (dest, letter) => dest.push(f._.typeCodes[f._.letterType(letter)])
        };
        if ("string" === typeof func) {
          const x2 = sig;
          sig = func;
          func = x2;
        }
        const _ = f._;
        const sigParams = _.sigParams(sig);
        const wasmCode = [1, 96];
        _.uleb128Encode(wasmCode, "push", sigParams.length);
        for (const x2 of sigParams) _.pushSigType(wasmCode, x2);
        if ("v" === sig[0]) wasmCode.push(0);
        else {
          wasmCode.push(1);
          _.pushSigType(wasmCode, sig[0]);
        }
        _.uleb128Encode(wasmCode, "unshift", wasmCode.length);
        wasmCode.unshift(0, 97, 115, 109, 1, 0, 0, 0, 1);
        wasmCode.push(2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0);
        return new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array(wasmCode)), { e: { f: func } }).exports["f"];
      };
      const __installFunction = function f(func, sig, scoped) {
        if (scoped && !cache.scopedAlloc.length) toss("No scopedAllocPush() scope is active.");
        if ("string" === typeof func) {
          const x2 = sig;
          sig = func;
          func = x2;
        }
        if ("string" !== typeof sig || !(func instanceof Function)) toss("Invalid arguments: expecting (function,signature) or (signature,function).");
        const ft = target.functionTable();
        const oldLen = __asPtrType(ft.length);
        let ptr;
        while (ptr = cache.freeFuncIndexes.pop()) if (ft.get(ptr)) {
          ptr = null;
          continue;
        } else break;
        if (!ptr) {
          ptr = __asPtrType(oldLen);
          ft.grow(__asPtrType(1));
        }
        try {
          ft.set(ptr, func);
          if (scoped) cache.scopedAlloc.pushPtr(ptr);
          return ptr;
        } catch (e) {
          if (!(e instanceof TypeError)) {
            if (ptr === oldLen) cache.freeFuncIndexes.push(oldLen);
            throw e;
          }
        }
        try {
          const fptr = target.jsFuncToWasm(func, sig);
          ft.set(ptr, fptr);
          if (scoped) cache.scopedAlloc.pushPtr(ptr);
        } catch (e) {
          if (ptr === oldLen) cache.freeFuncIndexes.push(oldLen);
          throw e;
        }
        return ptr;
      };
      target.installFunction = (func, sig) => __installFunction(func, sig, false);
      target.scopedInstallFunction = (func, sig) => __installFunction(func, sig, true);
      target.uninstallFunction = function(ptr) {
        if (!ptr && __NullPtr !== ptr) return void 0;
        const ft = target.functionTable();
        cache.freeFuncIndexes.push(ptr);
        const rc = ft.get(ptr);
        ft.set(ptr, null);
        return rc;
      };
      target.peek = function f(ptr, type = "i8") {
        if (type.endsWith("*")) type = __ptrIR;
        const c = cache.memory && cache.heapSize === cache.memory.buffer.byteLength ? cache : heapWrappers();
        const list = Array.isArray(ptr) ? [] : void 0;
        let rc;
        do {
          if (list) ptr = arguments[0].shift();
          switch (type) {
            case "i1":
            case "i8":
              rc = c.HEAP8[Number(ptr) >> 0];
              break;
            case "i16":
              rc = c.HEAP16[Number(ptr) >> 1];
              break;
            case "i32":
              rc = c.HEAP32[Number(ptr) >> 2];
              break;
            case "float":
            case "f32":
              rc = c.HEAP32F[Number(ptr) >> 2];
              break;
            case "double":
            case "f64":
              rc = Number(c.HEAP64F[Number(ptr) >> 3]);
              break;
            case "i64":
              if (c.HEAP64) {
                rc = __BigInt(c.HEAP64[Number(ptr) >> 3]);
                break;
              }
            default:
              toss("Invalid type for peek():", type);
          }
          if (list) list.push(rc);
        } while (list && arguments[0].length);
        return list || rc;
      };
      target.poke = function(ptr, value, type = "i8") {
        if (type.endsWith("*")) type = __ptrIR;
        const c = cache.memory && cache.heapSize === cache.memory.buffer.byteLength ? cache : heapWrappers();
        for (const p of Array.isArray(ptr) ? ptr : [ptr]) switch (type) {
          case "i1":
          case "i8":
            c.HEAP8[Number(p) >> 0] = value;
            continue;
          case "i16":
            c.HEAP16[Number(p) >> 1] = value;
            continue;
          case "i32":
            c.HEAP32[Number(p) >> 2] = value;
            continue;
          case "float":
          case "f32":
            c.HEAP32F[Number(p) >> 2] = value;
            continue;
          case "double":
          case "f64":
            c.HEAP64F[Number(p) >> 3] = value;
            continue;
          case "i64":
            if (c.HEAP64) {
              c.HEAP64[Number(p) >> 3] = __BigInt(value);
              continue;
            }
          default:
            toss("Invalid type for poke(): " + type);
        }
        return this;
      };
      target.peekPtr = (...ptr) => target.peek(1 === ptr.length ? ptr[0] : ptr, __ptrIR);
      target.pokePtr = (ptr, value = 0) => target.poke(ptr, value, __ptrIR);
      target.peek8 = (...ptr) => target.peek(1 === ptr.length ? ptr[0] : ptr, "i8");
      target.poke8 = (ptr, value) => target.poke(ptr, value, "i8");
      target.peek16 = (...ptr) => target.peek(1 === ptr.length ? ptr[0] : ptr, "i16");
      target.poke16 = (ptr, value) => target.poke(ptr, value, "i16");
      target.peek32 = (...ptr) => target.peek(1 === ptr.length ? ptr[0] : ptr, "i32");
      target.poke32 = (ptr, value) => target.poke(ptr, value, "i32");
      target.peek64 = (...ptr) => target.peek(1 === ptr.length ? ptr[0] : ptr, "i64");
      target.poke64 = (ptr, value) => target.poke(ptr, value, "i64");
      target.peek32f = (...ptr) => target.peek(1 === ptr.length ? ptr[0] : ptr, "f32");
      target.poke32f = (ptr, value) => target.poke(ptr, value, "f32");
      target.peek64f = (...ptr) => target.peek(1 === ptr.length ? ptr[0] : ptr, "f64");
      target.poke64f = (ptr, value) => target.poke(ptr, value, "f64");
      target.getMemValue = target.peek;
      target.getPtrValue = target.peekPtr;
      target.setMemValue = target.poke;
      target.setPtrValue = target.pokePtr;
      target.isPtr32 = (ptr) => "number" === typeof ptr && ptr >= 0 && ptr === (ptr | 0);
      target.isPtr64 = (ptr) => "bigint" === typeof ptr ? ptr >= 0 : target.isPtr32(ptr);
      target.isPtr = 4 === __ptrSize ? target.isPtr32 : target.isPtr64;
      target.cstrlen = function(ptr) {
        if (!ptr || !target.isPtr(ptr)) return null;
        ptr = Number(ptr);
        const h = heapWrappers().HEAP8U;
        let pos = ptr;
        for (; h[pos] !== 0; ++pos) ;
        return pos - ptr;
      };
      const __SAB = "undefined" === typeof SharedArrayBuffer ? function() {
      } : SharedArrayBuffer;
      const isSharedTypedArray = (aTypedArray) => aTypedArray.buffer instanceof __SAB;
      target.isSharedTypedArray = isSharedTypedArray;
      const typedArrayPart = (aTypedArray, begin, end) => {
        if (8 === __ptrSize) {
          if ("bigint" === typeof begin) begin = Number(begin);
          if ("bigint" === typeof end) end = Number(end);
        }
        return isSharedTypedArray(aTypedArray) ? aTypedArray.slice(begin, end) : aTypedArray.subarray(begin, end);
      };
      target.typedArrayPart = typedArrayPart;
      const typedArrayToString = (typedArray, begin, end) => cache.utf8Decoder.decode(typedArrayPart(typedArray, begin, end));
      target.typedArrayToString = typedArrayToString;
      target.cstrToJs = function(ptr) {
        const n = target.cstrlen(ptr);
        return n ? typedArrayToString(heapWrappers().HEAP8U, Number(ptr), Number(ptr) + n) : null === n ? n : "";
      };
      target.jstrlen = function(str) {
        if ("string" !== typeof str) return null;
        const n = str.length;
        let len = 0;
        for (let i2 = 0; i2 < n; ++i2) {
          let u = str.charCodeAt(i2);
          if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i2) & 1023;
          if (u <= 127) ++len;
          else if (u <= 2047) len += 2;
          else if (u <= 65535) len += 3;
          else len += 4;
        }
        return len;
      };
      target.jstrcpy = function(jstr, tgt, offset = 0, maxBytes = -1, addNul = true) {
        if (!tgt || !(tgt instanceof Int8Array) && !(tgt instanceof Uint8Array)) toss("jstrcpy() target must be an Int8Array or Uint8Array.");
        maxBytes = Number(maxBytes);
        offset = Number(offset);
        if (maxBytes < 0) maxBytes = tgt.length - offset;
        if (!(maxBytes > 0) || !(offset >= 0)) return 0;
        let i2 = 0, max2 = jstr.length;
        const begin = offset, end = offset + maxBytes - (addNul ? 1 : 0);
        for (; i2 < max2 && offset < end; ++i2) {
          let u = jstr.charCodeAt(i2);
          if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | jstr.charCodeAt(++i2) & 1023;
          if (u <= 127) {
            if (offset >= end) break;
            tgt[offset++] = u;
          } else if (u <= 2047) {
            if (offset + 1 >= end) break;
            tgt[offset++] = 192 | u >> 6;
            tgt[offset++] = 128 | u & 63;
          } else if (u <= 65535) {
            if (offset + 2 >= end) break;
            tgt[offset++] = 224 | u >> 12;
            tgt[offset++] = 128 | u >> 6 & 63;
            tgt[offset++] = 128 | u & 63;
          } else {
            if (offset + 3 >= end) break;
            tgt[offset++] = 240 | u >> 18;
            tgt[offset++] = 128 | u >> 12 & 63;
            tgt[offset++] = 128 | u >> 6 & 63;
            tgt[offset++] = 128 | u & 63;
          }
        }
        if (addNul) tgt[offset++] = 0;
        return offset - begin;
      };
      target.cstrncpy = function(tgtPtr, srcPtr, n) {
        if (!tgtPtr || !srcPtr) toss("cstrncpy() does not accept NULL strings.");
        if (n < 0) n = target.cstrlen(strPtr) + 1;
        else if (!(n > 0)) return 0;
        const heap = target.heap8u();
        let i2 = 0, ch;
        const tgtNumber = Number(tgtPtr), srcNumber = Number(srcPtr);
        for (; i2 < n && (ch = heap[srcNumber + i2]); ++i2) heap[tgtNumber + i2] = ch;
        if (i2 < n) heap[tgtNumber + i2++] = 0;
        return i2;
      };
      target.jstrToUintArray = (str, addNul = false) => {
        return cache.utf8Encoder.encode(addNul ? str + "\0" : str);
      };
      const __affirmAlloc = (obj, funcName) => {
        if (!(obj.alloc instanceof Function) || !(obj.dealloc instanceof Function)) toss("Object is missing alloc() and/or dealloc() function(s)", "required by", funcName + "().");
      };
      const __allocCStr = function(jstr, returnWithLength, allocator, funcName) {
        __affirmAlloc(target, funcName);
        if ("string" !== typeof jstr) return null;
        const u = cache.utf8Encoder.encode(jstr), ptr = allocator(u.length + 1);
        let toFree = ptr;
        try {
          const heap = heapWrappers().HEAP8U;
          heap.set(u, Number(ptr));
          heap[__ptrAdd(ptr, u.length)] = 0;
          toFree = __NullPtr;
          return returnWithLength ? [ptr, u.length] : ptr;
        } finally {
          if (toFree) target.dealloc(toFree);
        }
      };
      target.allocCString = (jstr, returnWithLength = false) => __allocCStr(jstr, returnWithLength, target.alloc, "allocCString()");
      target.scopedAllocPush = function() {
        __affirmAlloc(target, "scopedAllocPush");
        const a = [];
        cache.scopedAlloc.push(a);
        return a;
      };
      target.scopedAllocPop = function(state) {
        __affirmAlloc(target, "scopedAllocPop");
        const n = arguments.length ? cache.scopedAlloc.indexOf(state) : cache.scopedAlloc.length - 1;
        if (n < 0) toss("Invalid state object for scopedAllocPop().");
        if (0 === arguments.length) state = cache.scopedAlloc[n];
        cache.scopedAlloc.splice(n, 1);
        for (let p; p = state.pop(); ) if (target.functionEntry(p)) target.uninstallFunction(p);
        else target.dealloc(p);
      };
      target.scopedAlloc = function(n) {
        if (!cache.scopedAlloc.length) toss("No scopedAllocPush() scope is active.");
        const p = __asPtrType(target.alloc(n));
        return cache.scopedAlloc.pushPtr(p);
      };
      Object.defineProperty(target.scopedAlloc, "level", {
        configurable: false,
        enumerable: false,
        get: () => cache.scopedAlloc.length,
        set: () => toss("The 'active' property is read-only.")
      });
      target.scopedAllocCString = (jstr, returnWithLength = false) => __allocCStr(jstr, returnWithLength, target.scopedAlloc, "scopedAllocCString()");
      const __allocMainArgv = function(isScoped, list) {
        const pList = target[isScoped ? "scopedAlloc" : "alloc"]((list.length + 1) * target.ptr.size);
        let i2 = 0;
        list.forEach((e) => {
          target.pokePtr(__ptrAdd(pList, target.ptr.size * i2++), target[isScoped ? "scopedAllocCString" : "allocCString"]("" + e));
        });
        target.pokePtr(__ptrAdd(pList, target.ptr.size * i2), 0);
        return pList;
      };
      target.scopedAllocMainArgv = (list) => __allocMainArgv(true, list);
      target.allocMainArgv = (list) => __allocMainArgv(false, list);
      target.cArgvToJs = (argc, pArgv) => {
        const list = [];
        for (let i2 = 0; i2 < argc; ++i2) {
          const arg = target.peekPtr(__ptrAdd(pArgv, target.ptr.size * i2));
          list.push(arg ? target.cstrToJs(arg) : null);
        }
        return list;
      };
      target.scopedAllocCall = function(func) {
        target.scopedAllocPush();
        try {
          return func();
        } finally {
          target.scopedAllocPop();
        }
      };
      const __allocPtr = function(howMany, safePtrSize, method) {
        __affirmAlloc(target, method);
        const pIr = safePtrSize ? "i64" : __ptrIR;
        let m = target[method](howMany * (safePtrSize ? 8 : __ptrSize));
        target.poke(m, 0, pIr);
        if (1 === howMany) return m;
        const a = [m];
        for (let i2 = 1; i2 < howMany; ++i2) {
          m = __ptrAdd(m, safePtrSize ? 8 : __ptrSize);
          a[i2] = m;
          target.poke(m, 0, pIr);
        }
        return a;
      };
      target.allocPtr = (howMany = 1, safePtrSize = true) => __allocPtr(howMany, safePtrSize, "alloc");
      target.scopedAllocPtr = (howMany = 1, safePtrSize = true) => __allocPtr(howMany, safePtrSize, "scopedAlloc");
      target.xGet = function(name) {
        return target.exports[name] || toss("Cannot find exported symbol:", name);
      };
      const __argcMismatch = (f, n) => toss(f + "() requires", n, "argument(s).");
      target.xCall = function(fname, ...args) {
        const f = fname instanceof Function ? fname : target.xGet(fname);
        if (!(f instanceof Function)) toss("Exported symbol", fname, "is not a function.");
        if (f.length !== args.length) __argcMismatch(f === fname ? f.name : fname, f.length);
        return 2 === arguments.length && Array.isArray(arguments[1]) ? f.apply(null, arguments[1]) : f.apply(null, args);
      };
      cache.xWrap = /* @__PURE__ */ Object.create(null);
      cache.xWrap.convert = /* @__PURE__ */ Object.create(null);
      cache.xWrap.convert.arg = /* @__PURE__ */ new Map();
      cache.xWrap.convert.result = /* @__PURE__ */ new Map();
      const xArg = cache.xWrap.convert.arg, xResult = cache.xWrap.convert.result;
      const __xArgPtr = __asPtrType;
      xArg.set("i64", __BigInt).set("i32", (i2) => i2 | 0).set("i16", (i2) => (i2 | 0) & 65535).set("i8", (i2) => (i2 | 0) & 255).set("f32", (i2) => Number(i2).valueOf()).set("float", xArg.get("f32")).set("f64", xArg.get("f32")).set("double", xArg.get("f64")).set("int", xArg.get("i32")).set("null", (i2) => i2).set(null, xArg.get("null")).set("**", __xArgPtr).set("*", __xArgPtr);
      xResult.set("*", __xArgPtr).set("pointer", __xArgPtr).set("number", (v2) => Number(v2)).set("void", (v2) => void 0).set(void 0, xResult.get("void")).set("null", (v2) => v2).set(null, xResult.get("null"));
      for (const t of [
        "i8",
        "i16",
        "i32",
        "i64",
        "int",
        "f32",
        "float",
        "f64",
        "double"
      ]) {
        xArg.set(t + "*", __xArgPtr);
        xResult.set(t + "*", __xArgPtr);
        xResult.set(t, xArg.get(t) || toss("Maintenance required: missing arg converter for", t));
      }
      const __xArgString = (v2) => {
        return "string" === typeof v2 ? target.scopedAllocCString(v2) : __asPtrType(v2);
      };
      xArg.set("string", __xArgString).set("utf8", __xArgString);
      xResult.set("string", (i2) => target.cstrToJs(i2)).set("utf8", xResult.get("string")).set("string:dealloc", (i2) => {
        try {
          return i2 ? target.cstrToJs(i2) : null;
        } finally {
          target.dealloc(i2);
        }
      }).set("utf8:dealloc", xResult.get("string:dealloc")).set("json", (i2) => JSON.parse(target.cstrToJs(i2))).set("json:dealloc", (i2) => {
        try {
          return i2 ? JSON.parse(target.cstrToJs(i2)) : null;
        } finally {
          target.dealloc(i2);
        }
      });
      const AbstractArgAdapter = class {
        constructor(opt) {
          this.name = opt.name || "unnamed adapter";
        }
        /**
        Gets called via xWrap() to "convert" v to whatever type
        this specific class supports.
        
        argIndex is the argv index of _this_ argument in the
        being-xWrap()'d call. argv is the current argument list
        undergoing xWrap() argument conversion. argv entries to the
        left of argIndex will have already undergone transformation and
        those to the right will not have (they will have the values the
        client-level code passed in, awaiting conversion). The RHS
        indexes must never be relied upon for anything because their
        types are indeterminate, whereas the LHS values will be
        WASM-compatible values by the time this is called.
        
        The reason for the argv and argIndex arguments is that we
        frequently need more context than v for a specific conversion,
        and that context invariably lies in the LHS arguments of v.
        Examples of how this is useful can be found in FuncPtrAdapter.
        */
        convertArg(v2, argv, argIndex) {
          toss("AbstractArgAdapter must be subclassed.");
        }
      };
      xArg.FuncPtrAdapter = class FuncPtrAdapter extends AbstractArgAdapter {
        constructor(opt) {
          super(opt);
          if (xArg.FuncPtrAdapter.warnOnUse) console.warn("xArg.FuncPtrAdapter is an internal-only API", "and is not intended to be invoked from", "client-level code. Invoked with:", opt);
          this.name = opt.name || "unnamed";
          this.signature = opt.signature;
          if (opt.contextKey instanceof Function) {
            this.contextKey = opt.contextKey;
            if (!opt.bindScope) opt.bindScope = "context";
          }
          this.bindScope = opt.bindScope || toss("FuncPtrAdapter options requires a bindScope (explicit or implied).");
          if (FuncPtrAdapter.bindScopes.indexOf(opt.bindScope) < 0) toss("Invalid options.bindScope (" + opt.bindMod + ") for FuncPtrAdapter. Expecting one of: (" + FuncPtrAdapter.bindScopes.join(", ") + ")");
          this.isTransient = "transient" === this.bindScope;
          this.isContext = "context" === this.bindScope;
          this.isPermanent = "permanent" === this.bindScope;
          this.singleton = "singleton" === this.bindScope ? [] : void 0;
          this.callProxy = opt.callProxy instanceof Function ? opt.callProxy : void 0;
        }
        /**
        The static class members are defined outside of the class to
        work around an emcc toolchain build problem: one of the tools
        in emsdk v3.1.42 does not support the static keyword.
        */
        contextKey(argv, argIndex) {
          return this;
        }
        /**
        Returns this object's mapping for the given context key, in the
        form of an an array, creating the mapping if needed. The key
        may be anything suitable for use in a Map.
        
        The returned array is intended to be used as a pair of
        [JSValue, WasmFuncPtr], where the first element is one passed
        to this.convertArg() and the second is its WASM form.
        */
        contextMap(key) {
          const cm = this.__cmap || (this.__cmap = /* @__PURE__ */ new Map());
          let rc = cm.get(key);
          if (void 0 === rc) cm.set(key, rc = []);
          return rc;
        }
        /**
        Gets called via xWrap() to "convert" v to a WASM-bound function
        pointer. If v is one of (a WASM pointer, null, undefined) then
        (v||0) is returned and any earlier function installed by this
        mapping _might_, depending on how it's bound, be uninstalled.
        If v is not one of those types, it must be a Function, for
        which this method creates (if needed) a WASM function binding
        and returns the WASM pointer to that binding.
        
        If this instance is not in 'transient' mode, it will remember
        the binding for at least the next call, to avoid recreating the
        function binding unnecessarily.
        
        If it's passed a pointer(ish) value for v, it assumes it's a
        WASM function pointer and does _not_ perform any function
        binding, so this object's bindMode is irrelevant/ignored for
        such cases.
        
        See the parent class's convertArg() docs for details on what
        exactly the 2nd and 3rd arguments are.
        */
        convertArg(v2, argv, argIndex) {
          let pair = this.singleton;
          if (!pair && this.isContext) pair = this.contextMap(this.contextKey(argv, argIndex));
          if (pair && 2 === pair.length && pair[0] === v2) return pair[1];
          if (v2 instanceof Function) {
            if (this.callProxy) v2 = this.callProxy(v2);
            const fp = __installFunction(v2, this.signature, this.isTransient);
            if (FuncPtrAdapter.debugFuncInstall) FuncPtrAdapter.debugOut("FuncPtrAdapter installed", this, this.contextKey(argv, argIndex), "@" + fp, v2);
            if (pair) {
              if (pair[1]) {
                if (FuncPtrAdapter.debugFuncInstall) FuncPtrAdapter.debugOut("FuncPtrAdapter uninstalling", this, this.contextKey(argv, argIndex), "@" + pair[1], v2);
                try {
                  cache.scopedAlloc.pushPtr(pair[1]);
                } catch (e) {
                }
              }
              pair[0] = arguments[0] || __NullPtr;
              pair[1] = fp;
            }
            return fp;
          } else if (target.isPtr(v2) || null === v2 || void 0 === v2) {
            if (pair && pair[1] && pair[1] !== v2) {
              if (FuncPtrAdapter.debugFuncInstall) FuncPtrAdapter.debugOut("FuncPtrAdapter uninstalling", this, this.contextKey(argv, argIndex), "@" + pair[1], v2);
              try {
                cache.scopedAlloc.pushPtr(pair[1]);
              } catch (e) {
              }
              pair[0] = pair[1] = v2 || __NullPtr;
            }
            return v2 || __NullPtr;
          } else throw new TypeError("Invalid FuncPtrAdapter argument type. Expecting a function pointer or a " + (this.name ? this.name + " " : "") + "function matching signature " + this.signature + ".");
        }
      };
      xArg.FuncPtrAdapter.warnOnUse = false;
      xArg.FuncPtrAdapter.debugFuncInstall = false;
      xArg.FuncPtrAdapter.debugOut = console.debug.bind(console);
      xArg.FuncPtrAdapter.bindScopes = [
        "transient",
        "context",
        "singleton",
        "permanent"
      ];
      const __xArgAdapterCheck = (t) => xArg.get(t) || toss("Argument adapter not found:", t);
      const __xResultAdapterCheck = (t) => xResult.get(t) || toss("Result adapter not found:", t);
      cache.xWrap.convertArg = (t, ...args) => __xArgAdapterCheck(t)(...args);
      cache.xWrap.convertArgNoCheck = (t, ...args) => xArg.get(t)(...args);
      cache.xWrap.convertResult = (t, v2) => null === t ? v2 : t ? __xResultAdapterCheck(t)(v2) : void 0;
      cache.xWrap.convertResultNoCheck = (t, v2) => null === t ? v2 : t ? xResult.get(t)(v2) : void 0;
      target.xWrap = function callee3(fArg, resultType, ...argTypes) {
        if (3 === arguments.length && Array.isArray(arguments[2])) argTypes = arguments[2];
        if (target.isPtr(fArg)) fArg = target.functionEntry(fArg) || toss("Function pointer not found in WASM function table.");
        const fIsFunc = fArg instanceof Function;
        const xf = fIsFunc ? fArg : target.xGet(fArg);
        if (fIsFunc) fArg = xf.name || "unnamed function";
        if (argTypes.length !== xf.length) __argcMismatch(fArg, xf.length);
        if (0 === xf.length && (null === resultType || "null" === resultType)) return xf;
        __xResultAdapterCheck(resultType);
        for (const t of argTypes) if (t instanceof AbstractArgAdapter) xArg.set(t, (...args) => t.convertArg(...args));
        else __xArgAdapterCheck(t);
        const cxw = cache.xWrap;
        if (0 === xf.length) return (...args) => args.length ? __argcMismatch(fArg, xf.length) : cxw.convertResult(resultType, xf.call(null));
        return function(...args) {
          if (args.length !== xf.length) __argcMismatch(fArg, xf.length);
          const scope = target.scopedAllocPush();
          try {
            let i2 = 0;
            if (callee3.debug) console.debug("xWrap() preparing: resultType ", resultType, "xf", xf, "argTypes", argTypes, "args", args);
            for (; i2 < args.length; ++i2) args[i2] = cxw.convertArgNoCheck(argTypes[i2], args[i2], args, i2);
            if (callee3.debug) console.debug("xWrap() calling: resultType ", resultType, "xf", xf, "argTypes", argTypes, "args", args);
            return cxw.convertResultNoCheck(resultType, xf.apply(null, args));
          } finally {
            target.scopedAllocPop(scope);
          }
        };
      };
      const __xAdapter = function(func, argc, typeName, adapter, modeName, xcvPart) {
        if ("string" === typeof typeName) {
          if (1 === argc) return xcvPart.get(typeName);
          else if (2 === argc) {
            if (!adapter) {
              xcvPart.delete(typeName);
              return func;
            } else if (!(adapter instanceof Function)) toss(modeName, "requires a function argument.");
            xcvPart.set(typeName, adapter);
            return func;
          }
        }
        toss("Invalid arguments to", modeName);
      };
      target.xWrap.resultAdapter = function f(typeName, adapter) {
        return __xAdapter(f, arguments.length, typeName, adapter, "resultAdapter()", xResult);
      };
      target.xWrap.argAdapter = function f(typeName, adapter) {
        return __xAdapter(f, arguments.length, typeName, adapter, "argAdapter()", xArg);
      };
      target.xWrap.FuncPtrAdapter = xArg.FuncPtrAdapter;
      target.xCallWrapped = function(fArg, resultType, argTypes, ...args) {
        if (Array.isArray(arguments[3])) args = arguments[3];
        return target.xWrap(fArg, resultType, argTypes || []).apply(null, args || []);
      };
      target.xWrap.testConvertArg = cache.xWrap.convertArg;
      target.xWrap.testConvertResult = cache.xWrap.convertResult;
      return target;
    };
    globalThis.WhWasmUtilInstaller.yawl = function yawl(config) {
      "use strict";
      const wfetch = () => fetch(config.uri, { credentials: "same-origin" });
      const wui = this;
      const finalThen = function(arg) {
        if (config.wasmUtilTarget) {
          const toss = (...args) => {
            throw new Error(args.join(" "));
          };
          const tgt = config.wasmUtilTarget;
          tgt.module = arg.module;
          tgt.instance = arg.instance;
          if (!tgt.instance.exports.memory)
            tgt.memory = config?.imports?.env?.memory || toss("Missing 'memory' object!");
          if (!tgt.alloc && arg.instance.exports.malloc) {
            const exports = arg.instance.exports;
            tgt.alloc = function(n) {
              return exports.malloc(n) || toss("Allocation of", n, "bytes failed.");
            };
            tgt.dealloc = function(m) {
              m && exports.free(m);
            };
          }
          wui(tgt);
        }
        arg.config = config;
        if (config.onload) config.onload(arg);
        return arg;
      };
      return WebAssembly.instantiateStreaming ? () => WebAssembly.instantiateStreaming(wfetch(), config.imports || {}).then(finalThen) : () => wfetch().then((response) => response.arrayBuffer()).then((bytes) => WebAssembly.instantiate(bytes, config.imports || {})).then(finalThen);
    }.bind(globalThis.WhWasmUtilInstaller);
    globalThis.Jaccwabyt = function StructBinderFactory(config) {
      "use strict";
      const toss = (...args) => {
        throw new Error(args.join(" "));
      };
      {
        let h = config.heap;
        if (h instanceof WebAssembly.Memory) h = function() {
          return new Uint8Array(this.buffer);
        }.bind(h);
        else if (!(h instanceof Function)) toss("config.heap must be WebAssembly.Memory instance or", "a function which returns one.");
        config.heap = h;
      }
      ["alloc", "dealloc"].forEach(function(k2) {
        config[k2] instanceof Function || toss("Config option '" + k2 + "' must be a function.");
      });
      const SBF = StructBinderFactory, heap = config.heap, alloc = config.alloc, dealloc = config.dealloc;
      config.realloc;
      const log = config.log || console.debug.bind(console), memberPrefix = config.memberPrefix || "", memberSuffix = config.memberSuffix || "", BigInt2 = globalThis["BigInt"], BigInt64Array2 = globalThis["BigInt64Array"], bigIntEnabled = config.bigIntEnabled ?? !!BigInt64Array2;
      let ptr;
      const ptrSize = config.pointerSize || config.ptrSize || ("bigint" === typeof (ptr = alloc(1)) ? 8 : 4);
      const ptrIR = config.pointerIR || config.ptrIR || (4 === ptrSize ? "i32" : "i64");
      if (ptr) {
        dealloc(ptr);
        ptr = void 0;
      }
      if (ptrSize !== 4 && ptrSize !== 8) toss("Invalid pointer size:", ptrSize);
      if (ptrIR !== "i32" && ptrIR !== "i64") toss("Invalid pointer representation:", ptrIR);
      const __BigInt = bigIntEnabled && BigInt2 ? (v2) => BigInt2(v2 || 0) : (v2) => toss("BigInt support is disabled in this build.");
      const __asPtrType = "i32" == ptrIR ? Number : __BigInt;
      const __NullPtr = __asPtrType(0);
      const __ptrAdd = function(...args) {
        let rc = __NullPtr;
        for (let i2 = 0; i2 < args.length; ++i2) rc += __asPtrType(args[i2]);
        return rc;
      };
      const __ptrAddSelf = function(...args) {
        return __ptrAdd(this.pointer, ...args);
      };
      if (!SBF.debugFlags) {
        SBF.__makeDebugFlags = function(deriveFrom = null) {
          if (deriveFrom && deriveFrom.__flags) deriveFrom = deriveFrom.__flags;
          const f = function f2(flags) {
            if (0 === arguments.length) return f2.__flags;
            if (flags < 0) {
              delete f2.__flags.getter;
              delete f2.__flags.setter;
              delete f2.__flags.alloc;
              delete f2.__flags.dealloc;
            } else {
              f2.__flags.getter = 0 !== (1 & flags);
              f2.__flags.setter = 0 !== (2 & flags);
              f2.__flags.alloc = 0 !== (4 & flags);
              f2.__flags.dealloc = 0 !== (8 & flags);
            }
            return f2._flags;
          };
          Object.defineProperty(f, "__flags", {
            iterable: false,
            writable: false,
            value: Object.create(deriveFrom)
          });
          if (!deriveFrom) f(0);
          return f;
        };
        SBF.debugFlags = SBF.__makeDebugFlags();
      }
      const isLittleEndian = true;
      const isFuncSig = (s) => "(" === s[1];
      const isPtrSig = (s) => "p" === s || "P" === s || "s" === s;
      const isAutoPtrSig = (s) => "P" === s;
      const sigLetter = (s) => s ? isFuncSig(s) ? "p" : s[0] : void 0;
      const sigIR = function(s) {
        switch (sigLetter(s)) {
          case "c":
          case "C":
            return "i8";
          case "i":
            return "i32";
          case "p":
          case "P":
          case "s":
            return ptrIR;
          case "j":
            return "i64";
          case "f":
            return "float";
          case "d":
            return "double";
        }
        toss("Unhandled signature IR:", s);
      };
      const sigSize = function(s) {
        switch (sigLetter(s)) {
          case "c":
          case "C":
            return 1;
          case "i":
            return 4;
          case "p":
          case "P":
          case "s":
            return ptrSize;
          case "j":
            return 8;
          case "f":
            return 4;
          case "d":
            return 8;
        }
        toss("Unhandled signature sizeof:", s);
      };
      const affirmBigIntArray = BigInt64Array2 ? () => true : () => toss("BigInt64Array is not available.");
      const sigDVGetter = function(s) {
        switch (sigLetter(s)) {
          case "p":
          case "P":
          case "s":
            switch (ptrSize) {
              case 4:
                return "getInt32";
              case 8:
                return affirmBigIntArray() && "getBigInt64";
            }
            break;
          case "i":
            return "getInt32";
          case "c":
            return "getInt8";
          case "C":
            return "getUint8";
          case "j":
            return affirmBigIntArray() && "getBigInt64";
          case "f":
            return "getFloat32";
          case "d":
            return "getFloat64";
        }
        toss("Unhandled DataView getter for signature:", s);
      };
      const sigDVSetter = function(s) {
        switch (sigLetter(s)) {
          case "p":
          case "P":
          case "s":
            switch (ptrSize) {
              case 4:
                return "setInt32";
              case 8:
                return affirmBigIntArray() && "setBigInt64";
            }
            break;
          case "i":
            return "setInt32";
          case "c":
            return "setInt8";
          case "C":
            return "setUint8";
          case "j":
            return affirmBigIntArray() && "setBigInt64";
          case "f":
            return "setFloat32";
          case "d":
            return "setFloat64";
        }
        toss("Unhandled DataView setter for signature:", s);
      };
      const sigDVSetWrapper = function(s) {
        switch (sigLetter(s)) {
          case "i":
          case "f":
          case "c":
          case "C":
          case "d":
            return Number;
          case "j":
            return __BigInt;
          case "p":
          case "P":
          case "s":
            switch (ptrSize) {
              case 4:
                return Number;
              case 8:
                return __BigInt;
            }
        }
        toss("Unhandled DataView set wrapper for signature:", s);
      };
      const sPropName = (s, k2) => s + "::" + k2;
      const __propThrowOnSet = function(structName, propName) {
        return () => toss(sPropName(structName, propName), "is read-only.");
      };
      const getInstanceHandle = function f(obj, create = true) {
        let ii = f.map.get(obj);
        if (!ii && create) f.map.set(obj, ii = f.create(obj));
        return ii;
      };
      getInstanceHandle.map = /* @__PURE__ */ new WeakMap();
      getInstanceHandle.create = (forObj) => {
        return Object.assign(/* @__PURE__ */ Object.create(null), {
          o: forObj,
          p: void 0,
          ownsPointer: false,
          zod: false,
          xb: 0
        });
      };
      const rmInstanceHandle = (obj) => getInstanceHandle.map.delete(obj);
      const __isPtr32 = (ptr2) => "number" === typeof ptr2 && ptr2 === (ptr2 | 0) && ptr2 >= 0;
      const __isPtr64 = (ptr2) => "bigint" === typeof ptr2 && ptr2 >= 0 || __isPtr32(ptr2);
      const __isPtr = 4 === ptrSize ? __isPtr32 : __isPtr64;
      const __isNonNullPtr = (v2) => __isPtr(v2) && v2 > 0;
      const __freeStruct = function(ctor, obj, m) {
        const ii = getInstanceHandle(obj, false);
        if (!ii || ii.isDisposing) return;
        ii.isDisposing = true;
        if (!m && !(m = ii.p)) {
          console.warn("Cannot(?) happen: __freeStruct() found no instanceInfo");
          return;
        }
        if (Array.isArray(obj.ondispose)) {
          let x2;
          while (x2 = obj.ondispose.pop()) try {
            if (x2 instanceof Function) x2.call(obj);
            else if (x2 instanceof StructType) x2.dispose();
            else if (__isPtr(x2)) dealloc(x2);
          } catch (e) {
            console.warn("ondispose() for", ctor.structName, "@", m, "threw. NOT propagating it.", e);
          }
        } else if (obj.ondispose instanceof Function) try {
          obj.ondispose();
        } catch (e) {
          console.warn("ondispose() for", ctor.structName, "@", m, "threw. NOT propagating it.", e);
        }
        rmInstanceHandle(obj);
        delete obj.ondispose;
        if (ctor.debugFlags.__flags.dealloc) log("debug.dealloc:", ii.ownsPointer ? "" : "EXTERNAL", ctor.structName, "instance:", ctor.structInfo.sizeof, "bytes @" + m);
        if (ii.ownsPointer) {
          if (ii.zod || ctor.structInfo.zeroOnDispose) heap().fill(0, Number(m), Number(m) + ctor.structInfo.sizeof + ii.xb);
          dealloc(m);
        }
      };
      const rop0 = () => {
        return {
          configurable: false,
          writable: false,
          iterable: false
        };
      };
      const rop = (v2) => {
        return {
          ...rop0(),
          value: v2
        };
      };
      const __allocStruct = function f(ctor, obj, xm) {
        let opt;
        const checkPtr = (ptr2) => {
          __isNonNullPtr(ptr2) || toss("Invalid pointer value", arguments[0], "for", ctor.structName, "constructor.");
        };
        if (arguments.length >= 3) {
          if (xm && "object" === typeof xm) {
            opt = xm;
            xm = opt?.wrap;
          } else {
            checkPtr(xm);
            opt = { wrap: xm };
          }
        } else opt = {};
        const fill = !xm;
        let nAlloc = 0;
        let ownsPointer = false;
        if (xm) {
          checkPtr(xm);
          ownsPointer = !!opt?.takeOwnership;
        } else {
          const nX = opt?.extraBytes ?? 0;
          if (nX < 0 || nX !== (nX | 0)) toss("Invalid extraBytes value:", opt?.extraBytes);
          nAlloc = ctor.structInfo.sizeof + nX;
          xm = alloc(nAlloc) || toss("Allocation of", ctor.structName, "structure failed.");
          ownsPointer = true;
        }
        try {
          if (opt?.debugFlags) obj.debugFlags(opt.debugFlags);
          if (ctor.debugFlags.__flags.alloc) log("debug.alloc:", fill ? "" : "EXTERNAL", ctor.structName, "instance:", ctor.structInfo.sizeof, "bytes @" + xm);
          if (fill) heap().fill(0, Number(xm), Number(xm) + nAlloc);
          const ii = getInstanceHandle(obj);
          ii.p = xm;
          ii.ownsPointer = ownsPointer;
          ii.xb = nAlloc ? nAlloc - ctor.structInfo.sizeof : 0;
          ii.zod = !!opt?.zeroOnDispose;
          if (opt?.ondispose && opt.ondispose !== xm) obj.addOnDispose(opt.ondispose);
        } catch (e) {
          __freeStruct(ctor, obj, xm);
          throw e;
        }
      };
      const looksLikeASig = function f(sig) {
        f.rxSig1 ??= /^[ipPsjfdcC]$/;
        f.rxSig2 ??= /^[vipPsjfdcC]\([ipPsjfdcC]*\)$/;
        return f.rxSig1.test(sig) || f.rxSig2.test(sig);
      };
      const __adaptorsFor = function(who) {
        let x2 = this.get(who);
        if (!x2) {
          x2 = [
            /* @__PURE__ */ Object.create(null),
            /* @__PURE__ */ Object.create(null),
            /* @__PURE__ */ Object.create(null)
          ];
          this.set(who, x2);
        }
        return x2;
      }.bind(/* @__PURE__ */ new WeakMap());
      const __adaptor = function(who, which, key, proxy) {
        const a = __adaptorsFor(who)[which];
        if (3 === arguments.length) return a[key];
        if (proxy) return a[key] = proxy;
        return delete a[key];
      };
      const __adaptGet = function(key, ...args) {
        return __adaptor(this, 0, key, ...args);
      };
      const __affirmNotASig = function(ctx, key) {
        looksLikeASig(key) && toss(ctx, "(", key, ") collides with a data type signature.");
      };
      const __adaptSet = function(key, ...args) {
        __affirmNotASig("Setter adaptor", key);
        return __adaptor(this, 1, key, ...args);
      };
      const __adaptStruct = function(key, ...args) {
        __affirmNotASig("Struct adaptor", key);
        return __adaptor(this, 2, key, ...args);
      };
      const __adaptStruct2 = function(who, key) {
        const si = "string" === typeof key ? __adaptor(who, 2, key) : key;
        if ("object" !== typeof si) toss("Invalid struct mapping object. Arg =", key, JSON.stringify(si));
        return si;
      };
      const __memberKey = (k2) => memberPrefix + k2 + memberSuffix;
      const __memberKeyProp = rop(__memberKey);
      const __lookupMember = function(structInfo, memberName, tossIfNotFound = true) {
        let m = structInfo.members[memberName];
        if (!m && (memberPrefix || memberSuffix)) {
          for (const v2 of Object.values(structInfo.members)) if (v2.key === memberName) {
            m = v2;
            break;
          }
          if (!m && tossIfNotFound) toss(sPropName(structInfo.name || structInfo.structName, memberName), "is not a mapped struct member.");
        }
        return m;
      };
      const __memberSignature = function f(obj, memberName, emscriptenFormat = false) {
        if (!f._) f._ = (x2) => x2.replace(/[^vipPsjrdcC]/g, "").replace(/[pPscC]/g, "i");
        const m = __lookupMember(obj.structInfo, memberName, true);
        return emscriptenFormat ? f._(m.signature) : m.signature;
      };
      const __structMemberKeys = rop(function() {
        const a = [];
        for (const k2 of Object.keys(this.structInfo.members)) a.push(this.memberKey(k2));
        return a;
      });
      const __utf8Decoder = new TextDecoder("utf-8");
      const __utf8Encoder = new TextEncoder();
      const __SAB = "undefined" === typeof SharedArrayBuffer ? function() {
      } : SharedArrayBuffer;
      const __utf8Decode = function(arrayBuffer, begin, end) {
        if (8 === ptrSize) {
          begin = Number(begin);
          end = Number(end);
        }
        return __utf8Decoder.decode(arrayBuffer.buffer instanceof __SAB ? arrayBuffer.slice(begin, end) : arrayBuffer.subarray(begin, end));
      };
      const __memberIsString = function(obj, memberName, tossIfNotFound = false) {
        const m = __lookupMember(obj.structInfo, memberName, tossIfNotFound);
        return m && 1 === m.signature.length && "s" === m.signature[0] ? m : false;
      };
      const __affirmCStringSignature = function(member) {
        if ("s" === member.signature) return;
        toss("Invalid member type signature for C-string value:", JSON.stringify(member));
      };
      const __memberToJsString = function f(obj, memberName) {
        const m = __lookupMember(obj.structInfo, memberName, true);
        __affirmCStringSignature(m);
        const addr = obj[m.key];
        if (!addr) return null;
        let pos = addr;
        const mem = heap();
        for (; mem[pos] !== 0; ++pos) ;
        return addr === pos ? "" : __utf8Decode(mem, addr, pos);
      };
      const __addOnDispose = function(obj, ...v2) {
        if (obj.ondispose) {
          if (!Array.isArray(obj.ondispose)) obj.ondispose = [obj.ondispose];
        } else obj.ondispose = [];
        obj.ondispose.push(...v2);
      };
      const __allocCString = function(str) {
        const u = __utf8Encoder.encode(str);
        const mem = alloc(u.length + 1);
        if (!mem) toss("Allocation error while duplicating string:", str);
        const h = heap();
        h.set(u, Number(mem));
        h[__ptrAdd(mem, u.length)] = 0;
        return mem;
      };
      const __setMemberCString = function(obj, memberName, str) {
        const m = __lookupMember(obj.structInfo, memberName, true);
        __affirmCStringSignature(m);
        const mem = __allocCString(str);
        obj[m.key] = mem;
        __addOnDispose(obj, mem);
        return obj;
      };
      const StructType = function StructType2(structName, structInfo) {
        if (arguments[2] !== rop) toss("Do not call the StructType constructor", "from client-level code.");
        Object.defineProperties(this, {
          structName: rop(structName),
          structInfo: rop(structInfo)
        });
      };
      StructType.prototype = Object.create(null, {
        dispose: rop(function() {
          __freeStruct(this.constructor, this);
        }),
        lookupMember: rop(function(memberName, tossIfNotFound = true) {
          return __lookupMember(this.structInfo, memberName, tossIfNotFound);
        }),
        memberToJsString: rop(function(memberName) {
          return __memberToJsString(this, memberName);
        }),
        memberIsString: rop(function(memberName, tossIfNotFound = true) {
          return __memberIsString(this, memberName, tossIfNotFound);
        }),
        memberKey: __memberKeyProp,
        memberKeys: __structMemberKeys,
        memberSignature: rop(function(memberName, emscriptenFormat = false) {
          return __memberSignature(this, memberName, emscriptenFormat);
        }),
        memoryDump: rop(function() {
          const p = this.pointer;
          return p ? new Uint8Array(heap().slice(Number(p), Number(p) + this.structInfo.sizeof)) : null;
        }),
        extraBytes: {
          configurable: false,
          enumerable: false,
          get: function() {
            return getInstanceHandle(this, false)?.xb ?? 0;
          }
        },
        zeroOnDispose: {
          configurable: false,
          enumerable: false,
          get: function() {
            return getInstanceHandle(this, false)?.zod ?? !!this.structInfo.zeroOnDispose;
          }
        },
        pointer: {
          configurable: false,
          enumerable: false,
          get: function() {
            return getInstanceHandle(this, false)?.p;
          },
          set: () => toss("Cannot assign the 'pointer' property of a struct.")
        },
        setMemberCString: rop(function(memberName, str) {
          return __setMemberCString(this, memberName, str);
        })
      });
      Object.assign(StructType.prototype, { addOnDispose: function(...v2) {
        __addOnDispose(this, ...v2);
        return this;
      } });
      Object.defineProperties(StructType, {
        allocCString: rop(__allocCString),
        isA: rop((v2) => v2 instanceof StructType),
        hasExternalPointer: rop((v2) => {
          const ii = getInstanceHandle(v2, false);
          return !!(ii?.p && !ii?.ownsPointer);
        }),
        memberKey: __memberKeyProp
      });
      const memberGetterProxy = function(si) {
        return si.get || (si.adaptGet ? StructBinder.adaptGet(si.adaptGet) : void 0);
      };
      const memberSetterProxy = function(si) {
        return si.set || (si.adaptSet ? StructBinder.adaptSet(si.adaptSet) : void 0);
      };
      const makeMemberStructWrapper = function callee3(ctor, name, si) {
        const __innerStructs = callee3.innerStructs ??= /* @__PURE__ */ new Map();
        const key = ctor.memberKey(name);
        if (void 0 !== si.signature) toss("'signature' cannot be used on an embedded struct (", ctor.structName, ".", key, ").");
        if (memberSetterProxy(si)) toss("'set' and 'adaptSet' are not permitted for nested struct members.");
        si.structName ??= ctor.structName + "::" + name;
        si.key = key;
        si.name = name;
        si.constructor = this.call(this, si.structName, si);
        const getterProxy = memberGetterProxy(si);
        const prop = Object.assign(/* @__PURE__ */ Object.create(null), {
          configurable: false,
          enumerable: false,
          set: __propThrowOnSet(ctor.structName, key),
          get: function() {
            const dbg = this.debugFlags.__flags;
            const p = this.pointer;
            const k2 = p + "." + key;
            let s = __innerStructs.get(k2);
            if (dbg.getter) log("debug.getter: k =", k2);
            if (!s) {
              s = new si.constructor(__ptrAdd(p, si.offset));
              __innerStructs.set(k2, s);
              this.addOnDispose(() => s.dispose());
              s.addOnDispose(() => __innerStructs.delete(k2));
            }
            if (getterProxy) s = getterProxy.apply(this, [s, key]);
            if (dbg.getter) log("debug.getter: result =", s);
            return s;
          }
        });
        Object.defineProperty(ctor.prototype, key, prop);
      };
      const makeMemberWrapper = function f(ctor, name, si) {
        si = __adaptStruct2(this, si);
        if (si.members) return makeMemberStructWrapper.call(this, ctor, name, si);
        if (!f.cache) {
          f.cache = {
            getters: {},
            setters: {},
            sw: {}
          };
          const a = [
            "i",
            "c",
            "C",
            "p",
            "P",
            "s",
            "f",
            "d",
            "v()"
          ];
          if (bigIntEnabled) a.push("j");
          a.forEach(function(v2) {
            f.cache.getters[v2] = sigDVGetter(v2);
            f.cache.setters[v2] = sigDVSetter(v2);
            f.cache.sw[v2] = sigDVSetWrapper(v2);
          });
          f.sigCheck = function(obj, name2, key2, sig) {
            if (Object.prototype.hasOwnProperty.call(obj, key2)) toss(obj.structName, "already has a property named", key2 + ".");
            looksLikeASig(sig) || toss("Malformed signature for", sPropName(obj.structName, name2) + ":", sig);
          };
        }
        const key = ctor.memberKey(name);
        f.sigCheck(ctor.prototype, name, key, si.signature);
        si.key = key;
        si.name = name;
        const sigGlyph = sigLetter(si.signature);
        const xPropName = sPropName(ctor.structName, key);
        const dbg = ctor.debugFlags.__flags;
        const getterProxy = memberGetterProxy(si);
        const prop = /* @__PURE__ */ Object.create(null);
        prop.configurable = false;
        prop.enumerable = false;
        prop.get = function() {
          if (dbg.getter) log("debug.getter:", f.cache.getters[sigGlyph], "for", sigIR(sigGlyph), xPropName, "@", this.pointer, "+", si.offset, "sz", si.sizeof);
          let rc = new DataView(heap().buffer, Number(this.pointer) + si.offset, si.sizeof)[f.cache.getters[sigGlyph]](0, isLittleEndian);
          if (getterProxy) rc = getterProxy.apply(this, [key, rc]);
          if (dbg.getter) log("debug.getter:", xPropName, "result =", rc);
          return rc;
        };
        if (si.readOnly) prop.set = __propThrowOnSet(ctor.prototype.structName, key);
        else {
          const setterProxy = memberSetterProxy(si);
          prop.set = function(v2) {
            if (dbg.setter) log("debug.setter:", f.cache.setters[sigGlyph], "for", sigIR(sigGlyph), xPropName, "@", this.pointer, "+", si.offset, "sz", si.sizeof, v2);
            if (!this.pointer) toss("Cannot set native property on a disposed", this.structName, "instance.");
            if (setterProxy) v2 = setterProxy.apply(this, [key, v2]);
            if (null === v2 || void 0 === v2) v2 = __NullPtr;
            else if (isPtrSig(si.signature) && !__isPtr(v2)) {
              if (isAutoPtrSig(si.signature) && v2 instanceof StructType) {
                v2 = v2.pointer || __NullPtr;
                if (dbg.setter) log("debug.setter:", xPropName, "resolved to", v2);
              } else toss("Invalid value for pointer-type", xPropName + ".");
            }
            new DataView(heap().buffer, Number(this.pointer) + si.offset, si.sizeof)[f.cache.setters[sigGlyph]](0, f.cache.sw[sigGlyph](v2), isLittleEndian);
          };
        }
        Object.defineProperty(ctor.prototype, key, prop);
      };
      const StructBinderImpl = function StructBinderImpl2(structName, si, opt = /* @__PURE__ */ Object.create(null)) {
        const StructCtor = function StructCtor2(arg) {
          if (!(this instanceof StructCtor2)) toss("The", structName, "constructor may only be called via 'new'.");
          __allocStruct(StructCtor2, this, ...arguments);
        };
        const self2 = this;
        const ads = (x2) => {
          return "string" === typeof x2 && looksLikeASig(x2) ? { signature: x2 } : __adaptStruct2(self2, x2);
        };
        if (1 === arguments.length) {
          si = ads(structName);
          structName = si.structName || si.name;
        } else if (2 === arguments.length) {
          si = ads(si);
          si.name ??= structName;
        } else si = ads(si);
        structName ??= si.structName;
        structName ??= opt.structName;
        if (!structName) toss("One of 'name' or 'structName' are required.");
        if (si.adapt) {
          Object.keys(si.adapt.struct || {}).forEach((k2) => {
            __adaptStruct.call(StructBinderImpl2, k2, si.adapt.struct[k2]);
          });
          Object.keys(si.adapt.set || {}).forEach((k2) => {
            __adaptSet.call(StructBinderImpl2, k2, si.adapt.set[k2]);
          });
          Object.keys(si.adapt.get || {}).forEach((k2) => {
            __adaptGet.call(StructBinderImpl2, k2, si.adapt.get[k2]);
          });
        }
        if (!si.members && !si.sizeof) si.sizeof = sigSize(si.signature);
        const debugFlags = rop(SBF.__makeDebugFlags(StructBinder.debugFlags));
        Object.defineProperties(StructCtor, {
          debugFlags,
          isA: rop((v2) => v2 instanceof StructCtor),
          memberKey: __memberKeyProp,
          memberKeys: __structMemberKeys,
          structInfo: rop(si),
          structName: rop(structName),
          ptrAdd: rop(__ptrAdd)
        });
        StructCtor.prototype = new StructType(structName, si, rop);
        Object.defineProperties(StructCtor.prototype, {
          debugFlags,
          constructor: rop(StructCtor),
          ptrAdd: rop(__ptrAddSelf)
        });
        let lastMember = false;
        let offset = 0;
        const autoCalc = !!si.autoCalcSizeOffset;
        if (!autoCalc) {
          if (!si.sizeof) toss(structName, "description is missing its sizeof property.");
          si.offset ??= 0;
        } else si.offset ??= 0;
        Object.keys(si.members || {}).forEach((k2) => {
          let m = ads(si.members[k2]);
          if (!m.members && !m.sizeof) {
            m.sizeof = sigSize(m.signature);
            if (!m.sizeof) toss(sPropName(structName, k2), "is missing a sizeof property.", m);
          }
          if (void 0 === m.offset) {
            if (autoCalc) m.offset = offset;
            else toss(sPropName(structName, k2), "is missing its offset.", JSON.stringify(m));
          }
          si.members[k2] = m;
          if (!lastMember || lastMember.offset < m.offset) lastMember = m;
          const oldAutoCalc = !!m.autoCalc;
          if (autoCalc) m.autoCalcSizeOffset = true;
          makeMemberWrapper.call(self2, StructCtor, k2, m);
          if (oldAutoCalc) m.autoCalcSizeOffset = true;
          else delete m.autoCalcSizeOffset;
          offset += m.sizeof;
        });
        if (!lastMember) toss("No member property descriptions found.");
        if (!si.sizeof) si.sizeof = offset;
        if (si.sizeof === 1) si.signature === "c" || si.signature === "C" || toss("Unexpected sizeof==1 member", sPropName(structName, k), "with signature", si.signature);
        else {
          if (0 !== si.sizeof % 4) {
            console.warn("Invalid struct member description", si);
            toss(structName, "sizeof is not aligned. sizeof=" + si.sizeof);
          }
          if (0 !== si.offset % 4) {
            console.warn("Invalid struct member description", si);
            toss(structName, "offset is not aligned. offset=" + si.offset);
          }
        }
        if (si.sizeof < offset) {
          console.warn("Suspect struct description:", si, "offset =", offset);
          toss("Mismatch in the calculated vs. the provided sizeof/offset info.", "Expected sizeof", offset, "but got", si.sizeof, "for", si);
        }
        delete si.autoCalcSizeOffset;
        return StructCtor;
      };
      const StructBinder = function StructBinder2(structName, structInfo) {
        return 1 == arguments.length ? StructBinderImpl.call(StructBinder2, structName) : StructBinderImpl.call(StructBinder2, structName, structInfo);
      };
      StructBinder.StructType = StructType;
      StructBinder.config = config;
      StructBinder.allocCString = __allocCString;
      StructBinder.adaptGet = __adaptGet;
      StructBinder.adaptSet = __adaptSet;
      StructBinder.adaptStruct = __adaptStruct;
      StructBinder.ptrAdd = __ptrAdd;
      if (!StructBinder.debugFlags) StructBinder.debugFlags = SBF.__makeDebugFlags(SBF.debugFlags);
      return StructBinder;
    };
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      "use strict";
      const toss = (...args) => {
        throw new Error(args.join(" "));
      };
      const capi = sqlite3.capi, wasm = sqlite3.wasm, util = sqlite3.util;
      globalThis.WhWasmUtilInstaller(wasm);
      delete globalThis.WhWasmUtilInstaller;
      const bindingSignatures = {
        core: [
          [
            "sqlite3_aggregate_context",
            "void*",
            "sqlite3_context*",
            "int"
          ],
          [
            "sqlite3_backup_init",
            "sqlite3_backup*",
            "sqlite3*",
            "string",
            "sqlite3*",
            "string"
          ],
          [
            "sqlite3_backup_step",
            "int",
            "sqlite3_backup*",
            "int"
          ],
          [
            "sqlite3_backup_finish",
            "int",
            "sqlite3_backup*"
          ],
          [
            "sqlite3_backup_remaining",
            "int",
            "sqlite3_backup*"
          ],
          [
            "sqlite3_backup_pagecount",
            "int",
            "sqlite3_backup*"
          ],
          [
            "sqlite3_bind_double",
            "int",
            "sqlite3_stmt*",
            "int",
            "f64"
          ],
          [
            "sqlite3_bind_int",
            "int",
            "sqlite3_stmt*",
            "int",
            "int"
          ],
          [
            "sqlite3_bind_null",
            void 0,
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_bind_parameter_count",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_bind_parameter_index",
            "int",
            "sqlite3_stmt*",
            "string"
          ],
          [
            "sqlite3_bind_parameter_name",
            "string",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_bind_pointer",
            "int",
            "sqlite3_stmt*",
            "int",
            "*",
            "string:static",
            "*"
          ],
          [
            "sqlite3_bind_zeroblob",
            "int",
            "sqlite3_stmt*",
            "int",
            "int"
          ],
          [
            "sqlite3_busy_handler",
            "int",
            [
              "sqlite3*",
              new wasm.xWrap.FuncPtrAdapter({
                signature: "i(pi)",
                contextKey: (argv, argIndex) => argv[0]
              }),
              "*"
            ]
          ],
          [
            "sqlite3_busy_timeout",
            "int",
            "sqlite3*",
            "int"
          ],
          [
            "sqlite3_changes",
            "int",
            "sqlite3*"
          ],
          [
            "sqlite3_clear_bindings",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_collation_needed",
            "int",
            "sqlite3*",
            "*",
            "*"
          ],
          [
            "sqlite3_column_blob",
            "*",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_column_bytes",
            "int",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_column_count",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_column_decltype",
            "string",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_column_double",
            "f64",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_column_int",
            "int",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_column_name",
            "string",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_column_type",
            "int",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_column_value",
            "sqlite3_value*",
            "sqlite3_stmt*",
            "int"
          ],
          [
            "sqlite3_commit_hook",
            "void*",
            [
              "sqlite3*",
              new wasm.xWrap.FuncPtrAdapter({
                name: "sqlite3_commit_hook",
                signature: "i(p)",
                contextKey: (argv) => argv[0]
              }),
              "*"
            ]
          ],
          [
            "sqlite3_compileoption_get",
            "string",
            "int"
          ],
          [
            "sqlite3_compileoption_used",
            "int",
            "string"
          ],
          [
            "sqlite3_complete",
            "int",
            "string:flexible"
          ],
          [
            "sqlite3_context_db_handle",
            "sqlite3*",
            "sqlite3_context*"
          ],
          [
            "sqlite3_data_count",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_db_filename",
            "string",
            "sqlite3*",
            "string"
          ],
          [
            "sqlite3_db_handle",
            "sqlite3*",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_db_name",
            "string",
            "sqlite3*",
            "int"
          ],
          [
            "sqlite3_db_readonly",
            "int",
            "sqlite3*",
            "string"
          ],
          [
            "sqlite3_db_status",
            "int",
            "sqlite3*",
            "int",
            "*",
            "*",
            "int"
          ],
          [
            "sqlite3_errcode",
            "int",
            "sqlite3*"
          ],
          [
            "sqlite3_errmsg",
            "string",
            "sqlite3*"
          ],
          [
            "sqlite3_error_offset",
            "int",
            "sqlite3*"
          ],
          [
            "sqlite3_errstr",
            "string",
            "int"
          ],
          [
            "sqlite3_exec",
            "int",
            [
              "sqlite3*",
              "string:flexible",
              new wasm.xWrap.FuncPtrAdapter({
                signature: "i(pipp)",
                bindScope: "transient",
                callProxy: (callback) => {
                  let aNames;
                  return (pVoid, nCols, pColVals, pColNames) => {
                    try {
                      const aVals = wasm.cArgvToJs(nCols, pColVals);
                      if (!aNames) aNames = wasm.cArgvToJs(nCols, pColNames);
                      return callback(aVals, aNames) | 0;
                    } catch (e) {
                      return e.resultCode || capi.SQLITE_ERROR;
                    }
                  };
                }
              }),
              "*",
              "**"
            ]
          ],
          [
            "sqlite3_expanded_sql",
            "string",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_extended_errcode",
            "int",
            "sqlite3*"
          ],
          [
            "sqlite3_extended_result_codes",
            "int",
            "sqlite3*",
            "int"
          ],
          [
            "sqlite3_file_control",
            "int",
            "sqlite3*",
            "string",
            "int",
            "*"
          ],
          [
            "sqlite3_finalize",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_free",
            void 0,
            "*"
          ],
          [
            "sqlite3_get_autocommit",
            "int",
            "sqlite3*"
          ],
          [
            "sqlite3_get_auxdata",
            "*",
            "sqlite3_context*",
            "int"
          ],
          ["sqlite3_initialize", void 0],
          [
            "sqlite3_interrupt",
            void 0,
            "sqlite3*"
          ],
          [
            "sqlite3_is_interrupted",
            "int",
            "sqlite3*"
          ],
          ["sqlite3_keyword_count", "int"],
          [
            "sqlite3_keyword_name",
            "int",
            [
              "int",
              "**",
              "*"
            ]
          ],
          [
            "sqlite3_keyword_check",
            "int",
            ["string", "int"]
          ],
          ["sqlite3_libversion", "string"],
          ["sqlite3_libversion_number", "int"],
          [
            "sqlite3_limit",
            "int",
            [
              "sqlite3*",
              "int",
              "int"
            ]
          ],
          [
            "sqlite3_malloc",
            "*",
            "int"
          ],
          [
            "sqlite3_next_stmt",
            "sqlite3_stmt*",
            ["sqlite3*", "sqlite3_stmt*"]
          ],
          [
            "sqlite3_open",
            "int",
            "string",
            "*"
          ],
          [
            "sqlite3_open_v2",
            "int",
            "string",
            "*",
            "int",
            "string"
          ],
          [
            "sqlite3_realloc",
            "*",
            "*",
            "int"
          ],
          [
            "sqlite3_reset",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_result_blob",
            void 0,
            "sqlite3_context*",
            "*",
            "int",
            "*"
          ],
          [
            "sqlite3_result_double",
            void 0,
            "sqlite3_context*",
            "f64"
          ],
          [
            "sqlite3_result_error",
            void 0,
            "sqlite3_context*",
            "string",
            "int"
          ],
          [
            "sqlite3_result_error_code",
            void 0,
            "sqlite3_context*",
            "int"
          ],
          [
            "sqlite3_result_error_nomem",
            void 0,
            "sqlite3_context*"
          ],
          [
            "sqlite3_result_error_toobig",
            void 0,
            "sqlite3_context*"
          ],
          [
            "sqlite3_result_int",
            void 0,
            "sqlite3_context*",
            "int"
          ],
          [
            "sqlite3_result_null",
            void 0,
            "sqlite3_context*"
          ],
          [
            "sqlite3_result_pointer",
            void 0,
            "sqlite3_context*",
            "*",
            "string:static",
            "*"
          ],
          [
            "sqlite3_result_subtype",
            void 0,
            "sqlite3_value*",
            "int"
          ],
          [
            "sqlite3_result_text",
            void 0,
            "sqlite3_context*",
            "string",
            "int",
            "*"
          ],
          [
            "sqlite3_result_zeroblob",
            void 0,
            "sqlite3_context*",
            "int"
          ],
          [
            "sqlite3_rollback_hook",
            "void*",
            [
              "sqlite3*",
              new wasm.xWrap.FuncPtrAdapter({
                name: "sqlite3_rollback_hook",
                signature: "v(p)",
                contextKey: (argv) => argv[0]
              }),
              "*"
            ]
          ],
          [
            "sqlite3_set_auxdata",
            void 0,
            [
              "sqlite3_context*",
              "int",
              "*",
              "*"
            ]
          ],
          [
            "sqlite3_set_errmsg",
            "int",
            "sqlite3*",
            "int",
            "string"
          ],
          ["sqlite3_shutdown", void 0],
          ["sqlite3_sourceid", "string"],
          [
            "sqlite3_sql",
            "string",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_status",
            "int",
            "int",
            "*",
            "*",
            "int"
          ],
          [
            "sqlite3_step",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_stmt_busy",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_stmt_readonly",
            "int",
            "sqlite3_stmt*"
          ],
          [
            "sqlite3_stmt_status",
            "int",
            "sqlite3_stmt*",
            "int",
            "int"
          ],
          [
            "sqlite3_strglob",
            "int",
            "string",
            "string"
          ],
          [
            "sqlite3_stricmp",
            "int",
            "string",
            "string"
          ],
          [
            "sqlite3_strlike",
            "int",
            "string",
            "string",
            "int"
          ],
          [
            "sqlite3_strnicmp",
            "int",
            "string",
            "string",
            "int"
          ],
          [
            "sqlite3_table_column_metadata",
            "int",
            "sqlite3*",
            "string",
            "string",
            "string",
            "**",
            "**",
            "*",
            "*",
            "*"
          ],
          [
            "sqlite3_total_changes",
            "int",
            "sqlite3*"
          ],
          [
            "sqlite3_trace_v2",
            "int",
            [
              "sqlite3*",
              "int",
              new wasm.xWrap.FuncPtrAdapter({
                name: "sqlite3_trace_v2::callback",
                signature: "i(ippp)",
                contextKey: (argv, argIndex) => argv[0]
              }),
              "*"
            ]
          ],
          [
            "sqlite3_txn_state",
            "int",
            ["sqlite3*", "string"]
          ],
          [
            "sqlite3_uri_boolean",
            "int",
            "sqlite3_filename",
            "string",
            "int"
          ],
          [
            "sqlite3_uri_key",
            "string",
            "sqlite3_filename",
            "int"
          ],
          [
            "sqlite3_uri_parameter",
            "string",
            "sqlite3_filename",
            "string"
          ],
          [
            "sqlite3_user_data",
            "void*",
            "sqlite3_context*"
          ],
          [
            "sqlite3_value_blob",
            "*",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_bytes",
            "int",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_double",
            "f64",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_dup",
            "sqlite3_value*",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_free",
            void 0,
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_frombind",
            "int",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_int",
            "int",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_nochange",
            "int",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_numeric_type",
            "int",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_pointer",
            "*",
            "sqlite3_value*",
            "string:static"
          ],
          [
            "sqlite3_value_subtype",
            "int",
            "sqlite3_value*"
          ],
          [
            "sqlite3_value_type",
            "int",
            "sqlite3_value*"
          ],
          [
            "sqlite3_vfs_find",
            "*",
            "string"
          ],
          [
            "sqlite3_vfs_register",
            "int",
            "sqlite3_vfs*",
            "int"
          ],
          [
            "sqlite3_vfs_unregister",
            "int",
            "sqlite3_vfs*"
          ]
        ],
        /**
        Functions which require BigInt (int64) support are separated
        from the others because we need to conditionally bind them or
        apply dummy impls, depending on the capabilities of the
        environment.  (That said: we never actually build without
        BigInt support, and such builds are untested.)
        
        Not all of these functions directly require int64 but are only
        for use with APIs which require int64. For example, the
        vtab-related functions.
        */
        int64: [
          [
            "sqlite3_bind_int64",
            "int",
            [
              "sqlite3_stmt*",
              "int",
              "i64"
            ]
          ],
          [
            "sqlite3_changes64",
            "i64",
            ["sqlite3*"]
          ],
          [
            "sqlite3_column_int64",
            "i64",
            ["sqlite3_stmt*", "int"]
          ],
          [
            "sqlite3_deserialize",
            "int",
            "sqlite3*",
            "string",
            "*",
            "i64",
            "i64",
            "int"
          ],
          [
            "sqlite3_last_insert_rowid",
            "i64",
            ["sqlite3*"]
          ],
          [
            "sqlite3_malloc64",
            "*",
            "i64"
          ],
          [
            "sqlite3_msize",
            "i64",
            "*"
          ],
          [
            "sqlite3_overload_function",
            "int",
            [
              "sqlite3*",
              "string",
              "int"
            ]
          ],
          [
            "sqlite3_realloc64",
            "*",
            "*",
            "i64"
          ],
          [
            "sqlite3_result_int64",
            void 0,
            "*",
            "i64"
          ],
          [
            "sqlite3_result_zeroblob64",
            "int",
            "*",
            "i64"
          ],
          [
            "sqlite3_serialize",
            "*",
            "sqlite3*",
            "string",
            "*",
            "int"
          ],
          [
            "sqlite3_set_last_insert_rowid",
            void 0,
            ["sqlite3*", "i64"]
          ],
          [
            "sqlite3_status64",
            "int",
            "int",
            "*",
            "*",
            "int"
          ],
          [
            "sqlite3_db_status64",
            "int",
            "sqlite3*",
            "int",
            "*",
            "*",
            "int"
          ],
          [
            "sqlite3_total_changes64",
            "i64",
            ["sqlite3*"]
          ],
          [
            "sqlite3_update_hook",
            "*",
            [
              "sqlite3*",
              new wasm.xWrap.FuncPtrAdapter({
                name: "sqlite3_update_hook::callback",
                signature: "v(pippj)",
                contextKey: (argv) => argv[0],
                callProxy: (callback) => {
                  return (p, op, z0, z1, rowid) => {
                    callback(p, op, wasm.cstrToJs(z0), wasm.cstrToJs(z1), rowid);
                  };
                }
              }),
              "*"
            ]
          ],
          [
            "sqlite3_uri_int64",
            "i64",
            [
              "sqlite3_filename",
              "string",
              "i64"
            ]
          ],
          [
            "sqlite3_value_int64",
            "i64",
            "sqlite3_value*"
          ]
        ],
        /**
        Functions which are intended solely for API-internal use by the
        WASM components, not client code. These get installed into
        sqlite3.util. Some of them get exposed to clients via variants
        in sqlite3_js_...().
        
        2024-01-11: these were renamed, with two underscores in the
        prefix, to ensure that clients do not accidentally depend on
        them.  They have always been documented as internal-use-only,
        so no clients "should" be depending on the old names.
        */
        wasmInternal: [
          [
            "sqlite3__wasm_db_reset",
            "int",
            "sqlite3*"
          ],
          [
            "sqlite3__wasm_db_vfs",
            "sqlite3_vfs*",
            "sqlite3*",
            "string"
          ],
          [
            "sqlite3__wasm_vfs_create_file",
            "int",
            "sqlite3_vfs*",
            "string",
            "*",
            "int"
          ],
          [
            "sqlite3__wasm_posix_create_file",
            "int",
            "string",
            "*",
            "int"
          ],
          [
            "sqlite3__wasm_vfs_unlink",
            "int",
            "sqlite3_vfs*",
            "string"
          ],
          [
            "sqlite3__wasm_qfmt_token",
            "string:dealloc",
            "string",
            "int"
          ]
        ]
      };
      if (!!wasm.exports.sqlite3_progress_handler) bindingSignatures.core.push([
        "sqlite3_progress_handler",
        void 0,
        [
          "sqlite3*",
          "int",
          new wasm.xWrap.FuncPtrAdapter({
            name: "xProgressHandler",
            signature: "i(p)",
            bindScope: "context",
            contextKey: (argv, argIndex) => argv[0]
          }),
          "*"
        ]
      ]);
      if (!!wasm.exports.sqlite3_stmt_explain) bindingSignatures.core.push([
        "sqlite3_stmt_explain",
        "int",
        "sqlite3_stmt*",
        "int"
      ], [
        "sqlite3_stmt_isexplain",
        "int",
        "sqlite3_stmt*"
      ]);
      if (!!wasm.exports.sqlite3_set_authorizer) bindingSignatures.core.push([
        "sqlite3_set_authorizer",
        "int",
        [
          "sqlite3*",
          new wasm.xWrap.FuncPtrAdapter({
            name: "sqlite3_set_authorizer::xAuth",
            signature: "i(pissss)",
            contextKey: (argv, argIndex) => argv[0],
            /**
            We use callProxy here to ensure (A) that exceptions
            thrown from callback() have well-defined behavior and (B)
            that its result is coerced to an integer.
            */
            callProxy: (callback) => {
              return (pV, iCode, s0, s1, s2, s3) => {
                try {
                  s0 = s0 && wasm.cstrToJs(s0);
                  s1 = s1 && wasm.cstrToJs(s1);
                  s2 = s2 && wasm.cstrToJs(s2);
                  s3 = s3 && wasm.cstrToJs(s3);
                  return callback(pV, iCode, s0, s1, s2, s3) | 0;
                } catch (e) {
                  return e.resultCode || capi.SQLITE_ERROR;
                }
              };
            }
          }),
          "*"
        ]
      ]);
      if (!!wasm.exports.sqlite3_column_origin_name) bindingSignatures.core.push([
        "sqlite3_column_database_name",
        "string",
        "sqlite3_stmt*",
        "int"
      ], [
        "sqlite3_column_origin_name",
        "string",
        "sqlite3_stmt*",
        "int"
      ], [
        "sqlite3_column_table_name",
        "string",
        "sqlite3_stmt*",
        "int"
      ]);
      if (wasm.bigIntEnabled && !!wasm.exports.sqlite3_declare_vtab) bindingSignatures.int64.push([
        "sqlite3_create_module",
        "int",
        [
          "sqlite3*",
          "string",
          "sqlite3_module*",
          "*"
        ]
      ], [
        "sqlite3_create_module_v2",
        "int",
        [
          "sqlite3*",
          "string",
          "sqlite3_module*",
          "*",
          "*"
        ]
      ], [
        "sqlite3_declare_vtab",
        "int",
        ["sqlite3*", "string:flexible"]
      ], [
        "sqlite3_drop_modules",
        "int",
        ["sqlite3*", "**"]
      ], [
        "sqlite3_vtab_collation",
        "string",
        "sqlite3_index_info*",
        "int"
      ], [
        "sqlite3_vtab_distinct",
        "int",
        "sqlite3_index_info*"
      ], [
        "sqlite3_vtab_in",
        "int",
        "sqlite3_index_info*",
        "int",
        "int"
      ], [
        "sqlite3_vtab_in_first",
        "int",
        "sqlite3_value*",
        "**"
      ], [
        "sqlite3_vtab_in_next",
        "int",
        "sqlite3_value*",
        "**"
      ], [
        "sqlite3_vtab_nochange",
        "int",
        "sqlite3_context*"
      ], [
        "sqlite3_vtab_on_conflict",
        "int",
        "sqlite3*"
      ], [
        "sqlite3_vtab_rhs_value",
        "int",
        "sqlite3_index_info*",
        "int",
        "**"
      ]);
      if (wasm.bigIntEnabled && !!wasm.exports.sqlite3_preupdate_hook) bindingSignatures.int64.push([
        "sqlite3_preupdate_blobwrite",
        "int",
        "sqlite3*"
      ], [
        "sqlite3_preupdate_count",
        "int",
        "sqlite3*"
      ], [
        "sqlite3_preupdate_depth",
        "int",
        "sqlite3*"
      ], [
        "sqlite3_preupdate_hook",
        "*",
        [
          "sqlite3*",
          new wasm.xWrap.FuncPtrAdapter({
            name: "sqlite3_preupdate_hook",
            signature: "v(ppippjj)",
            contextKey: (argv) => argv[0],
            callProxy: (callback) => {
              return (p, db2, op, zDb, zTbl, iKey1, iKey2) => {
                callback(p, db2, op, wasm.cstrToJs(zDb), wasm.cstrToJs(zTbl), iKey1, iKey2);
              };
            }
          }),
          "*"
        ]
      ], [
        "sqlite3_preupdate_new",
        "int",
        [
          "sqlite3*",
          "int",
          "**"
        ]
      ], [
        "sqlite3_preupdate_old",
        "int",
        [
          "sqlite3*",
          "int",
          "**"
        ]
      ]);
      if (wasm.bigIntEnabled && !!wasm.exports.sqlite3changegroup_add && !!wasm.exports.sqlite3session_create && !!wasm.exports.sqlite3_preupdate_hook) {
        const __ipsProxy = {
          signature: "i(ps)",
          callProxy: (callback) => {
            return (p, s) => {
              try {
                return callback(p, wasm.cstrToJs(s)) | 0;
              } catch (e) {
                return e.resultCode || capi.SQLITE_ERROR;
              }
            };
          }
        };
        bindingSignatures.int64.push([
          "sqlite3changegroup_add",
          "int",
          [
            "sqlite3_changegroup*",
            "int",
            "void*"
          ]
        ], [
          "sqlite3changegroup_add_strm",
          "int",
          [
            "sqlite3_changegroup*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xInput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3changegroup_delete",
          void 0,
          ["sqlite3_changegroup*"]
        ], [
          "sqlite3changegroup_new",
          "int",
          ["**"]
        ], [
          "sqlite3changegroup_output",
          "int",
          [
            "sqlite3_changegroup*",
            "int*",
            "**"
          ]
        ], [
          "sqlite3changegroup_output_strm",
          "int",
          [
            "sqlite3_changegroup*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xOutput",
              signature: "i(ppi)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3changeset_apply",
          "int",
          [
            "sqlite3*",
            "int",
            "void*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xFilter",
              bindScope: "transient",
              ...__ipsProxy
            }),
            new wasm.xWrap.FuncPtrAdapter({
              name: "xConflict",
              signature: "i(pip)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3changeset_apply_strm",
          "int",
          [
            "sqlite3*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xInput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xFilter",
              bindScope: "transient",
              ...__ipsProxy
            }),
            new wasm.xWrap.FuncPtrAdapter({
              name: "xConflict",
              signature: "i(pip)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3changeset_apply_v2",
          "int",
          [
            "sqlite3*",
            "int",
            "void*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xFilter",
              bindScope: "transient",
              ...__ipsProxy
            }),
            new wasm.xWrap.FuncPtrAdapter({
              name: "xConflict",
              signature: "i(pip)",
              bindScope: "transient"
            }),
            "void*",
            "**",
            "int*",
            "int"
          ]
        ], [
          "sqlite3changeset_apply_v2_strm",
          "int",
          [
            "sqlite3*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xInput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xFilter",
              bindScope: "transient",
              ...__ipsProxy
            }),
            new wasm.xWrap.FuncPtrAdapter({
              name: "xConflict",
              signature: "i(pip)",
              bindScope: "transient"
            }),
            "void*",
            "**",
            "int*",
            "int"
          ]
        ], [
          "sqlite3changeset_apply_v3",
          "int",
          [
            "sqlite3*",
            "int",
            "void*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xFilter",
              signature: "i(pp)",
              bindScope: "transient"
            }),
            new wasm.xWrap.FuncPtrAdapter({
              name: "xConflict",
              signature: "i(pip)",
              bindScope: "transient"
            }),
            "void*",
            "**",
            "int*",
            "int"
          ]
        ], [
          "sqlite3changeset_apply_v3_strm",
          "int",
          [
            "sqlite3*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xInput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xFilter",
              signature: "i(pp)",
              bindScope: "transient"
            }),
            new wasm.xWrap.FuncPtrAdapter({
              name: "xConflict",
              signature: "i(pip)",
              bindScope: "transient"
            }),
            "void*",
            "**",
            "int*",
            "int"
          ]
        ], [
          "sqlite3changeset_concat",
          "int",
          [
            "int",
            "void*",
            "int",
            "void*",
            "int*",
            "**"
          ]
        ], [
          "sqlite3changeset_concat_strm",
          "int",
          [
            new wasm.xWrap.FuncPtrAdapter({
              name: "xInputA",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xInputB",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xOutput",
              signature: "i(ppi)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3changeset_conflict",
          "int",
          [
            "sqlite3_changeset_iter*",
            "int",
            "**"
          ]
        ], [
          "sqlite3changeset_finalize",
          "int",
          ["sqlite3_changeset_iter*"]
        ], [
          "sqlite3changeset_fk_conflicts",
          "int",
          ["sqlite3_changeset_iter*", "int*"]
        ], [
          "sqlite3changeset_invert",
          "int",
          [
            "int",
            "void*",
            "int*",
            "**"
          ]
        ], [
          "sqlite3changeset_invert_strm",
          "int",
          [
            new wasm.xWrap.FuncPtrAdapter({
              name: "xInput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xOutput",
              signature: "i(ppi)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3changeset_new",
          "int",
          [
            "sqlite3_changeset_iter*",
            "int",
            "**"
          ]
        ], [
          "sqlite3changeset_next",
          "int",
          ["sqlite3_changeset_iter*"]
        ], [
          "sqlite3changeset_old",
          "int",
          [
            "sqlite3_changeset_iter*",
            "int",
            "**"
          ]
        ], [
          "sqlite3changeset_op",
          "int",
          [
            "sqlite3_changeset_iter*",
            "**",
            "int*",
            "int*",
            "int*"
          ]
        ], [
          "sqlite3changeset_pk",
          "int",
          [
            "sqlite3_changeset_iter*",
            "**",
            "int*"
          ]
        ], [
          "sqlite3changeset_start",
          "int",
          [
            "**",
            "int",
            "*"
          ]
        ], [
          "sqlite3changeset_start_strm",
          "int",
          [
            "**",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xInput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3changeset_start_v2",
          "int",
          [
            "**",
            "int",
            "*",
            "int"
          ]
        ], [
          "sqlite3changeset_start_v2_strm",
          "int",
          [
            "**",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xInput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*",
            "int"
          ]
        ], [
          "sqlite3session_attach",
          "int",
          ["sqlite3_session*", "string"]
        ], [
          "sqlite3session_changeset",
          "int",
          [
            "sqlite3_session*",
            "int*",
            "**"
          ]
        ], [
          "sqlite3session_changeset_size",
          "i64",
          ["sqlite3_session*"]
        ], [
          "sqlite3session_changeset_strm",
          "int",
          [
            "sqlite3_session*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xOutput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3session_config",
          "int",
          ["int", "void*"]
        ], [
          "sqlite3session_create",
          "int",
          [
            "sqlite3*",
            "string",
            "**"
          ]
        ], [
          "sqlite3session_diff",
          "int",
          [
            "sqlite3_session*",
            "string",
            "string",
            "**"
          ]
        ], [
          "sqlite3session_enable",
          "int",
          ["sqlite3_session*", "int"]
        ], [
          "sqlite3session_indirect",
          "int",
          ["sqlite3_session*", "int"]
        ], [
          "sqlite3session_isempty",
          "int",
          ["sqlite3_session*"]
        ], [
          "sqlite3session_memory_used",
          "i64",
          ["sqlite3_session*"]
        ], [
          "sqlite3session_object_config",
          "int",
          [
            "sqlite3_session*",
            "int",
            "void*"
          ]
        ], [
          "sqlite3session_patchset",
          "int",
          [
            "sqlite3_session*",
            "*",
            "**"
          ]
        ], [
          "sqlite3session_patchset_strm",
          "int",
          [
            "sqlite3_session*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xOutput",
              signature: "i(ppp)",
              bindScope: "transient"
            }),
            "void*"
          ]
        ], [
          "sqlite3session_table_filter",
          void 0,
          [
            "sqlite3_session*",
            new wasm.xWrap.FuncPtrAdapter({
              name: "xFilter",
              ...__ipsProxy,
              contextKey: (argv, argIndex) => argv[0]
            }),
            "*"
          ]
        ]);
      }
      sqlite3.StructBinder = globalThis.Jaccwabyt({
        heap: wasm.heap8u,
        alloc: wasm.alloc,
        dealloc: wasm.dealloc,
        bigIntEnabled: wasm.bigIntEnabled,
        pointerIR: wasm.ptr.ir,
        memberPrefix: "$"
      });
      delete globalThis.Jaccwabyt;
      {
        const __xString = wasm.xWrap.argAdapter("string");
        wasm.xWrap.argAdapter("string:flexible", (v2) => __xString(util.flexibleString(v2)));
        wasm.xWrap.argAdapter("string:static", function(v2) {
          if (wasm.isPtr(v2)) return v2;
          v2 = "" + v2;
          return this[v2] || (this[v2] = wasm.allocCString(v2));
        }.bind(/* @__PURE__ */ Object.create(null)));
        const __xArgPtr = wasm.xWrap.argAdapter("*");
        const nilType = function() {
        };
        wasm.xWrap.argAdapter("sqlite3_filename", __xArgPtr)("sqlite3_backup*", __xArgPtr)("sqlite3_context*", __xArgPtr)("sqlite3_value*", __xArgPtr)("void*", __xArgPtr)("sqlite3_changegroup*", __xArgPtr)("sqlite3_changeset_iter*", __xArgPtr)("sqlite3_session*", __xArgPtr)("sqlite3_stmt*", (v2) => __xArgPtr(v2 instanceof (sqlite3?.oo1?.Stmt || nilType) ? v2.pointer : v2))("sqlite3*", (v2) => __xArgPtr(v2 instanceof (sqlite3?.oo1?.DB || nilType) ? v2.pointer : v2))("sqlite3_vfs*", (v2) => {
          if ("string" === typeof v2) return capi.sqlite3_vfs_find(v2) || sqlite3.SQLite3Error.toss(capi.SQLITE_NOTFOUND, "Unknown sqlite3_vfs name:", v2);
          return __xArgPtr(v2 instanceof (capi.sqlite3_vfs || nilType) ? v2.pointer : v2);
        });
        if (wasm.exports.sqlite3_declare_vtab) wasm.xWrap.argAdapter("sqlite3_index_info*", (v2) => __xArgPtr(v2 instanceof (capi.sqlite3_index_info || nilType) ? v2.pointer : v2))("sqlite3_module*", (v2) => __xArgPtr(v2 instanceof (capi.sqlite3_module || nilType) ? v2.pointer : v2));
        const __xRcPtr = wasm.xWrap.resultAdapter("*");
        wasm.xWrap.resultAdapter("sqlite3*", __xRcPtr)("sqlite3_backup*", __xRcPtr)("sqlite3_context*", __xRcPtr)("sqlite3_stmt*", __xRcPtr)("sqlite3_value*", __xRcPtr)("sqlite3_vfs*", __xRcPtr)("void*", __xRcPtr);
        for (const e of bindingSignatures.core) capi[e[0]] = wasm.xWrap.apply(null, e);
        for (const e of bindingSignatures.wasmInternal) util[e[0]] = wasm.xWrap.apply(null, e);
        for (const e of bindingSignatures.int64) capi[e[0]] = wasm.bigIntEnabled ? wasm.xWrap.apply(null, e) : () => toss(e[0] + "() is unavailable due to lack", "of BigInt support in this build.");
        delete bindingSignatures.core;
        delete bindingSignatures.int64;
        delete bindingSignatures.wasmInternal;
        util.sqlite3__wasm_db_error = function(pDb2, resultCode, message) {
          if (!pDb2) return capi.SQLITE_MISUSE;
          if (resultCode instanceof sqlite3.WasmAllocError) {
            resultCode = capi.SQLITE_NOMEM;
            message = 0;
          } else if (resultCode instanceof Error) {
            message = message || "" + resultCode;
            resultCode = resultCode.resultCode || capi.SQLITE_ERROR;
          }
          return capi.sqlite3_set_errmsg(pDb2, resultCode, message) || resultCode;
        };
      }
      {
        const cJson = wasm.xCall("sqlite3__wasm_enum_json");
        if (!cJson) toss("Maintenance required: increase sqlite3__wasm_enum_json()'s", "static buffer size!");
        wasm.ctype = JSON.parse(wasm.cstrToJs(cJson));
        const defineGroups = [
          "access",
          "authorizer",
          "blobFinalizers",
          "changeset",
          "config",
          "dataTypes",
          "dbConfig",
          "dbStatus",
          "encodings",
          "fcntl",
          "flock",
          "ioCap",
          "limits",
          "openFlags",
          "prepareFlags",
          "resultCodes",
          "sqlite3Status",
          "stmtStatus",
          "syncFlags",
          "trace",
          "txnState",
          "udfFlags",
          "version"
        ];
        if (wasm.bigIntEnabled) defineGroups.push("serialize", "session", "vtab");
        for (const t of defineGroups) for (const e of Object.entries(wasm.ctype[t])) capi[e[0]] = e[1];
        if (!wasm.functionEntry(capi.SQLITE_WASM_DEALLOC)) toss("Internal error: cannot resolve exported function", "entry SQLITE_WASM_DEALLOC (==" + capi.SQLITE_WASM_DEALLOC + ").");
        const __rcMap = /* @__PURE__ */ Object.create(null);
        for (const e of Object.entries(wasm.ctype["resultCodes"])) __rcMap[e[1]] = e[0];
        capi.sqlite3_js_rc_str = (rc) => __rcMap[rc];
        const notThese = Object.assign(/* @__PURE__ */ Object.create(null), {
          WasmTestStruct: true,
          sqlite3_index_info: !wasm.bigIntEnabled,
          sqlite3_index_constraint: !wasm.bigIntEnabled,
          sqlite3_index_orderby: !wasm.bigIntEnabled,
          sqlite3_index_constraint_usage: !wasm.bigIntEnabled
        });
        for (const s of wasm.ctype.structs) if (!notThese[s.name]) capi[s.name] = sqlite3.StructBinder(s);
        if (capi.sqlite3_index_info) {
          for (const k2 of [
            "sqlite3_index_constraint",
            "sqlite3_index_orderby",
            "sqlite3_index_constraint_usage"
          ]) {
            capi.sqlite3_index_info[k2] = capi[k2];
            delete capi[k2];
          }
          capi.sqlite3_vtab_config = wasm.xWrap("sqlite3__wasm_vtab_config", "int", [
            "sqlite3*",
            "int",
            "int"
          ]);
        }
      }
      const __dbArgcMismatch = (pDb2, f, n) => {
        return util.sqlite3__wasm_db_error(pDb2, capi.SQLITE_MISUSE, f + "() requires " + n + " argument" + (1 === n ? "" : "s") + ".");
      };
      const __errEncoding = (pDb2) => {
        return util.sqlite3__wasm_db_error(pDb2, capi.SQLITE_FORMAT, "SQLITE_UTF8 is the only supported encoding.");
      };
      const __argPDb = (pDb2) => wasm.xWrap.argAdapter("sqlite3*")(pDb2);
      const __argStr = (str) => wasm.isPtr(str) ? wasm.cstrToJs(str) : str;
      const __dbCleanupMap = function(pDb2, mode) {
        pDb2 = __argPDb(pDb2);
        let m = this.dbMap.get(pDb2);
        if (!mode) {
          this.dbMap.delete(pDb2);
          return m;
        } else if (!m && mode > 0) this.dbMap.set(pDb2, m = /* @__PURE__ */ Object.create(null));
        return m;
      }.bind(Object.assign(/* @__PURE__ */ Object.create(null), { dbMap: /* @__PURE__ */ new Map() }));
      __dbCleanupMap.addCollation = function(pDb2, name) {
        const m = __dbCleanupMap(pDb2, 1);
        if (!m.collation) m.collation = /* @__PURE__ */ new Set();
        m.collation.add(__argStr(name).toLowerCase());
      };
      __dbCleanupMap._addUDF = function(pDb2, name, arity, map) {
        name = __argStr(name).toLowerCase();
        let u = map.get(name);
        if (!u) map.set(name, u = /* @__PURE__ */ new Set());
        u.add(arity < 0 ? -1 : arity);
      };
      __dbCleanupMap.addFunction = function(pDb2, name, arity) {
        const m = __dbCleanupMap(pDb2, 1);
        if (!m.udf) m.udf = /* @__PURE__ */ new Map();
        this._addUDF(pDb2, name, arity, m.udf);
      };
      if (wasm.exports.sqlite3_create_window_function) __dbCleanupMap.addWindowFunc = function(pDb2, name, arity) {
        const m = __dbCleanupMap(pDb2, 1);
        if (!m.wudf) m.wudf = /* @__PURE__ */ new Map();
        this._addUDF(pDb2, name, arity, m.wudf);
      };
      __dbCleanupMap.cleanup = function(pDb2) {
        pDb2 = __argPDb(pDb2);
        for (const obj of [
          ["sqlite3_busy_handler", 3],
          ["sqlite3_commit_hook", 3],
          ["sqlite3_preupdate_hook", 3],
          ["sqlite3_progress_handler", 4],
          ["sqlite3_rollback_hook", 3],
          ["sqlite3_set_authorizer", 3],
          ["sqlite3_trace_v2", 4],
          ["sqlite3_update_hook", 3]
        ]) {
          const [name, arity] = obj;
          if (!wasm.exports[name]) continue;
          const closeArgs = [pDb2];
          closeArgs.length = arity;
          try {
            capi[name](...closeArgs);
          } catch (e) {
            sqlite3.config.warn("close-time call of", name + "(", closeArgs, ") threw:", e);
          }
        }
        const m = __dbCleanupMap(pDb2, 0);
        if (!m) return;
        if (m.collation) {
          for (const name of m.collation) try {
            capi.sqlite3_create_collation_v2(pDb2, name, capi.SQLITE_UTF8, 0, 0, 0);
          } catch (e) {
          }
          delete m.collation;
        }
        let i2 = 0;
        for (; i2 < 2; ++i2) {
          const fmap = i2 ? m.wudf : m.udf;
          if (!fmap) continue;
          const func = i2 ? capi.sqlite3_create_window_function : capi.sqlite3_create_function_v2;
          for (const e of fmap) {
            const name = e[0], arities = e[1];
            const fargs = [
              pDb2,
              name,
              0,
              capi.SQLITE_UTF8,
              0,
              0,
              0,
              0,
              0
            ];
            if (i2) fargs.push(0);
            for (const arity of arities) try {
              fargs[2] = arity;
              func.apply(null, fargs);
            } catch (e2) {
            }
            arities.clear();
          }
          fmap.clear();
        }
        delete m.udf;
        delete m.wudf;
      };
      {
        const __sqlite3CloseV2 = wasm.xWrap("sqlite3_close_v2", "int", "sqlite3*");
        capi.sqlite3_close_v2 = function(pDb2) {
          if (1 !== arguments.length) return __dbArgcMismatch(pDb2, "sqlite3_close_v2", 1);
          if (pDb2) try {
            __dbCleanupMap.cleanup(pDb2);
          } catch (e) {
          }
          return __sqlite3CloseV2(pDb2);
        };
      }
      if (capi.sqlite3session_create) {
        const __sqlite3SessionDelete = wasm.xWrap("sqlite3session_delete", void 0, ["sqlite3_session*"]);
        capi.sqlite3session_delete = function(pSession) {
          if (1 !== arguments.length) return __dbArgcMismatch(pDb, "sqlite3session_delete", 1);
          else if (pSession) capi.sqlite3session_table_filter(pSession, 0, 0);
          __sqlite3SessionDelete(pSession);
        };
      }
      {
        const contextKey = (argv, argIndex) => {
          return "argv[" + argIndex + "]:" + argv[0] + ":" + wasm.cstrToJs(argv[1]).toLowerCase();
        };
        const __sqlite3CreateCollationV2 = wasm.xWrap("sqlite3_create_collation_v2", "int", [
          "sqlite3*",
          "string",
          "int",
          "*",
          new wasm.xWrap.FuncPtrAdapter({
            name: "xCompare",
            signature: "i(pipip)",
            contextKey
          }),
          new wasm.xWrap.FuncPtrAdapter({
            name: "xDestroy",
            signature: "v(p)",
            contextKey
          })
        ]);
        capi.sqlite3_create_collation_v2 = function(pDb2, zName, eTextRep, pArg, xCompare, xDestroy) {
          if (6 !== arguments.length) return __dbArgcMismatch(pDb2, "sqlite3_create_collation_v2", 6);
          else if (0 === (eTextRep & 15)) eTextRep |= capi.SQLITE_UTF8;
          else if (capi.SQLITE_UTF8 !== (eTextRep & 15)) return __errEncoding(pDb2);
          try {
            const rc = __sqlite3CreateCollationV2(pDb2, zName, eTextRep, pArg, xCompare, xDestroy);
            if (0 === rc && xCompare instanceof Function) __dbCleanupMap.addCollation(pDb2, zName);
            return rc;
          } catch (e) {
            return util.sqlite3__wasm_db_error(pDb2, e);
          }
        };
        capi.sqlite3_create_collation = (pDb2, zName, eTextRep, pArg, xCompare) => {
          return 5 === arguments.length ? capi.sqlite3_create_collation_v2(pDb2, zName, eTextRep, pArg, xCompare, 0) : __dbArgcMismatch(pDb2, "sqlite3_create_collation", 5);
        };
      }
      {
        const contextKey = function(argv, argIndex) {
          return argv[0] + ":" + (argv[2] < 0 ? -1 : argv[2]) + ":" + argIndex + ":" + wasm.cstrToJs(argv[1]).toLowerCase();
        };
        const __cfProxy = Object.assign(/* @__PURE__ */ Object.create(null), {
          xInverseAndStep: {
            signature: "v(pip)",
            contextKey,
            callProxy: (callback) => {
              return (pCtx, argc, pArgv) => {
                try {
                  callback(pCtx, ...capi.sqlite3_values_to_js(argc, pArgv));
                } catch (e) {
                  capi.sqlite3_result_error_js(pCtx, e);
                }
              };
            }
          },
          xFinalAndValue: {
            signature: "v(p)",
            contextKey,
            callProxy: (callback) => {
              return (pCtx) => {
                try {
                  capi.sqlite3_result_js(pCtx, callback(pCtx));
                } catch (e) {
                  capi.sqlite3_result_error_js(pCtx, e);
                }
              };
            }
          },
          xFunc: {
            signature: "v(pip)",
            contextKey,
            callProxy: (callback) => {
              return (pCtx, argc, pArgv) => {
                try {
                  capi.sqlite3_result_js(pCtx, callback(pCtx, ...capi.sqlite3_values_to_js(argc, pArgv)));
                } catch (e) {
                  capi.sqlite3_result_error_js(pCtx, e);
                }
              };
            }
          },
          xDestroy: {
            signature: "v(p)",
            contextKey,
            callProxy: (callback) => {
              return (pVoid) => {
                try {
                  callback(pVoid);
                } catch (e) {
                  console.error("UDF xDestroy method threw:", e);
                }
              };
            }
          }
        });
        const __sqlite3CreateFunction = wasm.xWrap("sqlite3_create_function_v2", "int", [
          "sqlite3*",
          "string",
          "int",
          "int",
          "*",
          new wasm.xWrap.FuncPtrAdapter({
            name: "xFunc",
            ...__cfProxy.xFunc
          }),
          new wasm.xWrap.FuncPtrAdapter({
            name: "xStep",
            ...__cfProxy.xInverseAndStep
          }),
          new wasm.xWrap.FuncPtrAdapter({
            name: "xFinal",
            ...__cfProxy.xFinalAndValue
          }),
          new wasm.xWrap.FuncPtrAdapter({
            name: "xDestroy",
            ...__cfProxy.xDestroy
          })
        ]);
        const __sqlite3CreateWindowFunction = wasm.exports.sqlite3_create_window_function ? wasm.xWrap("sqlite3_create_window_function", "int", [
          "sqlite3*",
          "string",
          "int",
          "int",
          "*",
          new wasm.xWrap.FuncPtrAdapter({
            name: "xStep",
            ...__cfProxy.xInverseAndStep
          }),
          new wasm.xWrap.FuncPtrAdapter({
            name: "xFinal",
            ...__cfProxy.xFinalAndValue
          }),
          new wasm.xWrap.FuncPtrAdapter({
            name: "xValue",
            ...__cfProxy.xFinalAndValue
          }),
          new wasm.xWrap.FuncPtrAdapter({
            name: "xInverse",
            ...__cfProxy.xInverseAndStep
          }),
          new wasm.xWrap.FuncPtrAdapter({
            name: "xDestroy",
            ...__cfProxy.xDestroy
          })
        ]) : void 0;
        capi.sqlite3_create_function_v2 = function f(pDb2, funcName, nArg, eTextRep, pApp, xFunc, xStep, xFinal, xDestroy) {
          if (f.length !== arguments.length) return __dbArgcMismatch(pDb2, "sqlite3_create_function_v2", f.length);
          else if (0 === (eTextRep & 15)) eTextRep |= capi.SQLITE_UTF8;
          else if (capi.SQLITE_UTF8 !== (eTextRep & 15)) return __errEncoding(pDb2);
          try {
            const rc = __sqlite3CreateFunction(pDb2, funcName, nArg, eTextRep, pApp, xFunc, xStep, xFinal, xDestroy);
            if (0 === rc && (xFunc instanceof Function || xStep instanceof Function || xFinal instanceof Function || xDestroy instanceof Function)) __dbCleanupMap.addFunction(pDb2, funcName, nArg);
            return rc;
          } catch (e) {
            console.error("sqlite3_create_function_v2() setup threw:", e);
            return util.sqlite3__wasm_db_error(pDb2, e, "Creation of UDF threw: " + e);
          }
        };
        capi.sqlite3_create_function = function f(pDb2, funcName, nArg, eTextRep, pApp, xFunc, xStep, xFinal) {
          return f.length === arguments.length ? capi.sqlite3_create_function_v2(pDb2, funcName, nArg, eTextRep, pApp, xFunc, xStep, xFinal, 0) : __dbArgcMismatch(pDb2, "sqlite3_create_function", f.length);
        };
        if (__sqlite3CreateWindowFunction) capi.sqlite3_create_window_function = function f(pDb2, funcName, nArg, eTextRep, pApp, xStep, xFinal, xValue, xInverse, xDestroy) {
          if (f.length !== arguments.length) return __dbArgcMismatch(pDb2, "sqlite3_create_window_function", f.length);
          else if (0 === (eTextRep & 15)) eTextRep |= capi.SQLITE_UTF8;
          else if (capi.SQLITE_UTF8 !== (eTextRep & 15)) return __errEncoding(pDb2);
          try {
            const rc = __sqlite3CreateWindowFunction(pDb2, funcName, nArg, eTextRep, pApp, xStep, xFinal, xValue, xInverse, xDestroy);
            if (0 === rc && (xStep instanceof Function || xFinal instanceof Function || xValue instanceof Function || xInverse instanceof Function || xDestroy instanceof Function)) __dbCleanupMap.addWindowFunc(pDb2, funcName, nArg);
            return rc;
          } catch (e) {
            console.error("sqlite3_create_window_function() setup threw:", e);
            return util.sqlite3__wasm_db_error(pDb2, e, "Creation of UDF threw: " + e);
          }
        };
        else delete capi.sqlite3_create_window_function;
        capi.sqlite3_create_function_v2.udfSetResult = capi.sqlite3_create_function.udfSetResult = capi.sqlite3_result_js;
        if (capi.sqlite3_create_window_function) capi.sqlite3_create_window_function.udfSetResult = capi.sqlite3_result_js;
        capi.sqlite3_create_function_v2.udfConvertArgs = capi.sqlite3_create_function.udfConvertArgs = capi.sqlite3_values_to_js;
        if (capi.sqlite3_create_window_function) capi.sqlite3_create_window_function.udfConvertArgs = capi.sqlite3_values_to_js;
        capi.sqlite3_create_function_v2.udfSetError = capi.sqlite3_create_function.udfSetError = capi.sqlite3_result_error_js;
        if (capi.sqlite3_create_window_function) capi.sqlite3_create_window_function.udfSetError = capi.sqlite3_result_error_js;
      }
      {
        const __flexiString = (v2, n) => {
          if ("string" === typeof v2) n = -1;
          else if (util.isSQLableTypedArray(v2)) {
            n = v2.byteLength;
            v2 = wasm.typedArrayToString(v2 instanceof ArrayBuffer ? new Uint8Array(v2) : v2);
          } else if (Array.isArray(v2)) {
            v2 = v2.join("");
            n = -1;
          }
          return [v2, n];
        };
        const __prepare = {
          /**
          This binding expects a JS string as its 2nd argument and
          null as its final argument. In order to compile multiple
          statements from a single string, the "full" impl (see
          below) must be used.
          */
          basic: wasm.xWrap("sqlite3_prepare_v3", "int", [
            "sqlite3*",
            "string",
            "int",
            "int",
            "**",
            "**"
          ]),
          /**
          Impl which requires that the 2nd argument be a pointer to the
          SQL string, instead of being converted to a JS string. This
          variant is necessary for cases where we require a non-NULL
          value for the final argument (prepare/step of multiple
          statements from one input string). For simpler cases, where
          only the first statement in the SQL string is required, the
          wrapper named sqlite3_prepare_v2() is sufficient and easier
          to use because it doesn't require dealing with pointers.
          */
          full: wasm.xWrap("sqlite3_prepare_v3", "int", [
            "sqlite3*",
            "*",
            "int",
            "int",
            "**",
            "**"
          ])
        };
        capi.sqlite3_prepare_v3 = function f(pDb2, sql2, sqlLen, prepFlags, ppStmt, pzTail) {
          if (f.length !== arguments.length) return __dbArgcMismatch(pDb2, "sqlite3_prepare_v3", f.length);
          const [xSql, xSqlLen] = __flexiString(sql2, Number(sqlLen));
          switch (typeof xSql) {
            case "string":
              return __prepare.basic(pDb2, xSql, xSqlLen, prepFlags, ppStmt, null);
            case typeof wasm.ptr.null:
              return __prepare.full(pDb2, wasm.ptr.coerce(xSql), xSqlLen, prepFlags, ppStmt, pzTail);
            default:
              return util.sqlite3__wasm_db_error(pDb2, capi.SQLITE_MISUSE, "Invalid SQL argument type for sqlite3_prepare_v2/v3(). typeof=" + typeof xSql);
          }
        };
        capi.sqlite3_prepare_v2 = function f(pDb2, sql2, sqlLen, ppStmt, pzTail) {
          return f.length === arguments.length ? capi.sqlite3_prepare_v3(pDb2, sql2, sqlLen, 0, ppStmt, pzTail) : __dbArgcMismatch(pDb2, "sqlite3_prepare_v2", f.length);
        };
      }
      {
        const __bindText = wasm.xWrap("sqlite3_bind_text", "int", [
          "sqlite3_stmt*",
          "int",
          "string",
          "int",
          "*"
        ]);
        const __bindBlob = wasm.xWrap("sqlite3_bind_blob", "int", [
          "sqlite3_stmt*",
          "int",
          "*",
          "int",
          "*"
        ]);
        capi.sqlite3_bind_text = function f(pStmt, iCol, text, nText, xDestroy) {
          if (f.length !== arguments.length) return __dbArgcMismatch(capi.sqlite3_db_handle(pStmt), "sqlite3_bind_text", f.length);
          else if (wasm.isPtr(text) || null === text) return __bindText(pStmt, iCol, text, nText, xDestroy);
          else if (text instanceof ArrayBuffer) text = new Uint8Array(text);
          else if (Array.isArray(pMem)) text = pMem.join("");
          let p, n;
          try {
            if (util.isSQLableTypedArray(text)) {
              p = wasm.allocFromTypedArray(text);
              n = text.byteLength;
            } else if ("string" === typeof text) [p, n] = wasm.allocCString(text);
            else return util.sqlite3__wasm_db_error(capi.sqlite3_db_handle(pStmt), capi.SQLITE_MISUSE, "Invalid 3rd argument type for sqlite3_bind_text().");
            return __bindText(pStmt, iCol, p, n, capi.SQLITE_WASM_DEALLOC);
          } catch (e) {
            wasm.dealloc(p);
            return util.sqlite3__wasm_db_error(capi.sqlite3_db_handle(pStmt), e);
          }
        };
        capi.sqlite3_bind_blob = function f(pStmt, iCol, pMem2, nMem, xDestroy) {
          if (f.length !== arguments.length) return __dbArgcMismatch(capi.sqlite3_db_handle(pStmt), "sqlite3_bind_blob", f.length);
          else if (wasm.isPtr(pMem2) || null === pMem2) return __bindBlob(pStmt, iCol, pMem2, nMem, xDestroy);
          else if (pMem2 instanceof ArrayBuffer) pMem2 = new Uint8Array(pMem2);
          else if (Array.isArray(pMem2)) pMem2 = pMem2.join("");
          let p, n;
          try {
            if (util.isBindableTypedArray(pMem2)) {
              p = wasm.allocFromTypedArray(pMem2);
              n = nMem >= 0 ? nMem : pMem2.byteLength;
            } else if ("string" === typeof pMem2) [p, n] = wasm.allocCString(pMem2);
            else return util.sqlite3__wasm_db_error(capi.sqlite3_db_handle(pStmt), capi.SQLITE_MISUSE, "Invalid 3rd argument type for sqlite3_bind_blob().");
            return __bindBlob(pStmt, iCol, p, n, capi.SQLITE_WASM_DEALLOC);
          } catch (e) {
            wasm.dealloc(p);
            return util.sqlite3__wasm_db_error(capi.sqlite3_db_handle(pStmt), e);
          }
        };
      }
      if (!capi.sqlite3_column_text) {
        const argStmt = wasm.xWrap.argAdapter("sqlite3_stmt*"), argInt = wasm.xWrap.argAdapter("int"), argValue = wasm.xWrap.argAdapter("sqlite3_value*"), newStr = (cstr, n) => wasm.typedArrayToString(wasm.heap8u(), Number(cstr), Number(cstr) + n);
        capi.sqlite3_column_text = function(stmt, colIndex) {
          const a0 = argStmt(stmt), a1 = argInt(colIndex);
          const cstr = wasm.exports.sqlite3_column_text(a0, a1);
          return cstr ? newStr(cstr, wasm.exports.sqlite3_column_bytes(a0, a1)) : null;
        };
        capi.sqlite3_value_text = function(val) {
          const a0 = argValue(val);
          const cstr = wasm.exports.sqlite3_value_text(a0);
          return cstr ? newStr(cstr, wasm.exports.sqlite3_value_bytes(a0)) : null;
        };
      }
      capi.sqlite3_config = function(op, ...args) {
        if (arguments.length < 2) return capi.SQLITE_MISUSE;
        switch (op) {
          case capi.SQLITE_CONFIG_COVERING_INDEX_SCAN:
          case capi.SQLITE_CONFIG_MEMSTATUS:
          case capi.SQLITE_CONFIG_SMALL_MALLOC:
          case capi.SQLITE_CONFIG_SORTERREF_SIZE:
          case capi.SQLITE_CONFIG_STMTJRNL_SPILL:
          case capi.SQLITE_CONFIG_URI:
            return wasm.exports.sqlite3__wasm_config_i(op, args[0]);
          case capi.SQLITE_CONFIG_LOOKASIDE:
            return wasm.exports.sqlite3__wasm_config_ii(op, args[0], args[1]);
          case capi.SQLITE_CONFIG_MEMDB_MAXSIZE:
            return wasm.exports.sqlite3__wasm_config_j(op, args[0]);
          case capi.SQLITE_CONFIG_GETMALLOC:
          case capi.SQLITE_CONFIG_GETMUTEX:
          case capi.SQLITE_CONFIG_GETPCACHE2:
          case capi.SQLITE_CONFIG_GETPCACHE:
          case capi.SQLITE_CONFIG_HEAP:
          case capi.SQLITE_CONFIG_LOG:
          case capi.SQLITE_CONFIG_MALLOC:
          case capi.SQLITE_CONFIG_MMAP_SIZE:
          case capi.SQLITE_CONFIG_MULTITHREAD:
          case capi.SQLITE_CONFIG_MUTEX:
          case capi.SQLITE_CONFIG_PAGECACHE:
          case capi.SQLITE_CONFIG_PCACHE2:
          case capi.SQLITE_CONFIG_PCACHE:
          case capi.SQLITE_CONFIG_PCACHE_HDRSZ:
          case capi.SQLITE_CONFIG_PMASZ:
          case capi.SQLITE_CONFIG_SERIALIZED:
          case capi.SQLITE_CONFIG_SINGLETHREAD:
          case capi.SQLITE_CONFIG_SQLLOG:
          case capi.SQLITE_CONFIG_WIN32_HEAPSIZE:
          default:
            return capi.SQLITE_NOTFOUND;
        }
      };
      {
        const __autoExtFptr = /* @__PURE__ */ new Set();
        capi.sqlite3_auto_extension = function(fPtr) {
          if (fPtr instanceof Function) fPtr = wasm.installFunction("i(ppp)", fPtr);
          else if (1 !== arguments.length || !wasm.isPtr(fPtr)) return capi.SQLITE_MISUSE;
          const rc = wasm.exports.sqlite3_auto_extension(fPtr);
          if (fPtr !== arguments[0]) {
            if (0 === rc) __autoExtFptr.add(fPtr);
            else wasm.uninstallFunction(fPtr);
          }
          return rc;
        };
        capi.sqlite3_cancel_auto_extension = function(fPtr) {
          if (!fPtr || 1 !== arguments.length || !wasm.isPtr(fPtr)) return 0;
          return wasm.exports.sqlite3_cancel_auto_extension(fPtr);
        };
        capi.sqlite3_reset_auto_extension = function() {
          wasm.exports.sqlite3_reset_auto_extension();
          for (const fp of __autoExtFptr) wasm.uninstallFunction(fp);
          __autoExtFptr.clear();
        };
      }
      wasm.xWrap.FuncPtrAdapter.warnOnUse = true;
      const StructBinder = sqlite3.StructBinder;
      const installMethod = function callee3(tgt, name, func, applyArgcCheck = callee3.installMethodArgcCheck) {
        if (!(tgt instanceof StructBinder.StructType)) toss("Usage error: target object is-not-a StructType.");
        else if (!(func instanceof Function) && !wasm.isPtr(func)) toss("Usage error: expecting a Function or WASM pointer to one.");
        if (1 === arguments.length) return (n, f) => callee3(tgt, n, f, applyArgcCheck);
        if (!callee3.argcProxy) {
          callee3.argcProxy = function(tgt2, funcName, func2, sig) {
            return function(...args) {
              if (func2.length !== arguments.length) toss("Argument mismatch for", tgt2.structInfo.name + "::" + funcName + ": Native signature is:", sig);
              return func2.apply(this, args);
            };
          };
          callee3.removeFuncList = function() {
            if (this.ondispose.__removeFuncList) {
              this.ondispose.__removeFuncList.forEach((v2, ndx) => {
                if (wasm.isPtr(v2)) try {
                  wasm.uninstallFunction(v2);
                } catch (e) {
                }
              });
              delete this.ondispose.__removeFuncList;
            }
          };
        }
        const sigN = tgt.memberSignature(name);
        if (sigN.length < 2) toss("Member", name, "does not have a function pointer signature:", sigN);
        const memKey = tgt.memberKey(name);
        const fProxy = applyArgcCheck && !wasm.isPtr(func) ? callee3.argcProxy(tgt, memKey, func, sigN) : func;
        if (wasm.isPtr(fProxy)) {
          if (fProxy && !wasm.functionEntry(fProxy)) toss("Pointer", fProxy, "is not a WASM function table entry.");
          tgt[memKey] = fProxy;
        } else {
          const pFunc = wasm.installFunction(fProxy, sigN);
          tgt[memKey] = pFunc;
          if (!tgt.ondispose || !tgt.ondispose.__removeFuncList) {
            tgt.addOnDispose("ondispose.__removeFuncList handler", callee3.removeFuncList);
            tgt.ondispose.__removeFuncList = [];
          }
          tgt.ondispose.__removeFuncList.push(memKey, pFunc);
        }
        return (n, f) => callee3(tgt, n, f, applyArgcCheck);
      };
      installMethod.installMethodArgcCheck = false;
      const installMethods = function(structInstance, methods, applyArgcCheck = installMethod.installMethodArgcCheck) {
        const seen = /* @__PURE__ */ new Map();
        for (const k2 of Object.keys(methods)) {
          const m = methods[k2];
          const prior = seen.get(m);
          if (prior) {
            const mkey = structInstance.memberKey(k2);
            structInstance[mkey] = structInstance[structInstance.memberKey(prior)];
          } else {
            installMethod(structInstance, k2, m, applyArgcCheck);
            seen.set(m, k2);
          }
        }
        return structInstance;
      };
      StructBinder.StructType.prototype.installMethod = function callee3(name, func, applyArgcCheck = installMethod.installMethodArgcCheck) {
        return arguments.length < 3 && name && "object" === typeof name ? installMethods(this, ...arguments) : installMethod(this, ...arguments);
      };
      StructBinder.StructType.prototype.installMethods = function(methods, applyArgcCheck = installMethod.installMethodArgcCheck) {
        return installMethods(this, methods, applyArgcCheck);
      };
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      const toss3 = (...args) => {
        throw new sqlite3.SQLite3Error(...args);
      };
      const capi = sqlite3.capi, wasm = sqlite3.wasm, util = sqlite3.util;
      sqlite3.__isUnderTest ? console.debug.bind(console) : sqlite3.config.debug;
      sqlite3.__isUnderTest ? console.warn.bind(console) : sqlite3.config.warn;
      sqlite3.__isUnderTest ? console.error.bind(console) : sqlite3.config.error;
      const __ptrMap = /* @__PURE__ */ new WeakMap();
      const __doesNotOwnHandle = /* @__PURE__ */ new Set();
      const __stmtMap = /* @__PURE__ */ new WeakMap();
      const getOwnOption = (opts, p, dflt2) => {
        const d = Object.getOwnPropertyDescriptor(opts, p);
        return d ? d.value : dflt2;
      };
      const checkSqlite3Rc = function(dbPtr, sqliteResultCode) {
        if (sqliteResultCode) {
          if (dbPtr instanceof DB) dbPtr = dbPtr.pointer;
          toss3(sqliteResultCode, "sqlite3 result code", sqliteResultCode + ":", dbPtr ? capi.sqlite3_errmsg(dbPtr) : capi.sqlite3_errstr(sqliteResultCode));
        }
        return arguments[0];
      };
      const __dbTraceToConsole = wasm.installFunction("i(ippp)", function(t, c, p, x2) {
        if (capi.SQLITE_TRACE_STMT === t) console.log("SQL TRACE #" + ++this.counter, "via sqlite3@" + c + "[" + capi.sqlite3_db_filename(c, null) + "]", wasm.cstrToJs(x2));
      }.bind({ counter: 0 }));
      const __vfsPostOpenCallback = /* @__PURE__ */ Object.create(null);
      const dbCtorHelper = function ctor(...args) {
        const opt = ctor.normalizeArgs(...args);
        let pDb2;
        if (pDb2 = opt["sqlite3*"]) {
          if (!opt["sqlite3*:takeOwnership"]) __doesNotOwnHandle.add(this);
          this.filename = capi.sqlite3_db_filename(pDb2, "main");
        } else {
          let fn = opt.filename, vfsName = opt.vfs, flagsStr = opt.flags;
          if ("string" !== typeof fn && !wasm.isPtr(fn) || "string" !== typeof flagsStr || vfsName && "string" !== typeof vfsName && !wasm.isPtr(vfsName)) {
            sqlite3.config.error("Invalid DB ctor args", opt, arguments);
            toss3("Invalid arguments for DB constructor:", arguments, "opts:", opt);
          }
          let oflags = 0;
          if (flagsStr.indexOf("c") >= 0) oflags |= capi.SQLITE_OPEN_CREATE | capi.SQLITE_OPEN_READWRITE;
          if (flagsStr.indexOf("w") >= 0) oflags |= capi.SQLITE_OPEN_READWRITE;
          if (0 === oflags) oflags |= capi.SQLITE_OPEN_READONLY;
          oflags |= capi.SQLITE_OPEN_EXRESCODE;
          const stack = wasm.pstack.pointer;
          try {
            const pPtr = wasm.pstack.allocPtr();
            let rc = capi.sqlite3_open_v2(fn, pPtr, oflags, vfsName || wasm.ptr.null);
            pDb2 = wasm.peekPtr(pPtr);
            checkSqlite3Rc(pDb2, rc);
            capi.sqlite3_extended_result_codes(pDb2, 1);
            if (flagsStr.indexOf("t") >= 0) capi.sqlite3_trace_v2(pDb2, capi.SQLITE_TRACE_STMT, __dbTraceToConsole, pDb2);
          } catch (e) {
            if (pDb2) capi.sqlite3_close_v2(pDb2);
            throw e;
          } finally {
            wasm.pstack.restore(stack);
          }
          this.filename = wasm.isPtr(fn) ? wasm.cstrToJs(fn) : fn;
        }
        __ptrMap.set(this, pDb2);
        __stmtMap.set(this, /* @__PURE__ */ Object.create(null));
        if (!opt["sqlite3*"]) try {
          const pVfs = capi.sqlite3_js_db_vfs(pDb2) || toss3("Internal error: cannot get VFS for new db handle.");
          const postInitSql = __vfsPostOpenCallback[pVfs];
          if (postInitSql) {
            if (postInitSql instanceof Function) postInitSql(this, sqlite3);
            else checkSqlite3Rc(pDb2, capi.sqlite3_exec(pDb2, postInitSql, 0, 0, 0));
          }
        } catch (e) {
          this.close();
          throw e;
        }
      };
      dbCtorHelper.setVfsPostOpenCallback = function(pVfs, callback) {
        if (!(callback instanceof Function)) toss3("dbCtorHelper.setVfsPostOpenCallback() should not be used with a non-function argument.", arguments);
        __vfsPostOpenCallback[pVfs] = callback;
      };
      dbCtorHelper.normalizeArgs = function(filename = ":memory:", flags = "c", vfs = null) {
        const arg = {};
        if (1 === arguments.length && arguments[0] && "object" === typeof arguments[0]) {
          Object.assign(arg, arguments[0]);
          if (void 0 === arg.flags) arg.flags = "c";
          if (void 0 === arg.vfs) arg.vfs = null;
          if (void 0 === arg.filename) arg.filename = ":memory:";
        } else {
          arg.filename = filename;
          arg.flags = flags;
          arg.vfs = vfs;
        }
        return arg;
      };
      const DB = function(...args) {
        dbCtorHelper.apply(this, args);
      };
      DB.dbCtorHelper = dbCtorHelper;
      const BindTypes = {
        null: 1,
        number: 2,
        string: 3,
        boolean: 4,
        blob: 5
      };
      if (wasm.bigIntEnabled) BindTypes.bigint = BindTypes.number;
      const Stmt = function() {
        if (BindTypes !== arguments[2]) toss3(capi.SQLITE_MISUSE, "Do not call the Stmt constructor directly. Use DB.prepare().");
        this.db = arguments[0];
        __ptrMap.set(this, arguments[1]);
        if (arguments.length > 3 && !arguments[3]) __doesNotOwnHandle.add(this);
      };
      const affirmDbOpen = function(db2) {
        if (!db2.pointer) toss3("DB has been closed.");
        return db2;
      };
      const affirmColIndex = function(stmt, ndx) {
        if (ndx !== (ndx | 0) || ndx < 0 || ndx >= stmt.columnCount) toss3("Column index", ndx, "is out of range.");
        return stmt;
      };
      const parseExecArgs = function(db2, args) {
        const out2 = /* @__PURE__ */ Object.create(null);
        out2.opt = /* @__PURE__ */ Object.create(null);
        switch (args.length) {
          case 1:
            if ("string" === typeof args[0] || util.isSQLableTypedArray(args[0])) out2.sql = args[0];
            else if (Array.isArray(args[0])) out2.sql = args[0];
            else if (args[0] && "object" === typeof args[0]) {
              out2.opt = args[0];
              out2.sql = out2.opt.sql;
            }
            break;
          case 2:
            out2.sql = args[0];
            out2.opt = args[1];
            break;
          default:
            toss3("Invalid argument count for exec().");
        }
        out2.sql = util.flexibleString(out2.sql);
        if ("string" !== typeof out2.sql) toss3("Missing SQL argument or unsupported SQL value type.");
        const opt = out2.opt;
        switch (opt.returnValue) {
          case "resultRows":
            if (!opt.resultRows) opt.resultRows = [];
            out2.returnVal = () => opt.resultRows;
            break;
          case "saveSql":
            if (!opt.saveSql) opt.saveSql = [];
            out2.returnVal = () => opt.saveSql;
            break;
          case void 0:
          case "this":
            out2.returnVal = () => db2;
            break;
          default:
            toss3("Invalid returnValue value:", opt.returnValue);
        }
        if (!opt.callback && !opt.returnValue && void 0 !== opt.rowMode) {
          if (!opt.resultRows) opt.resultRows = [];
          out2.returnVal = () => opt.resultRows;
        }
        if (opt.callback || opt.resultRows) switch (void 0 === opt.rowMode ? "array" : opt.rowMode) {
          case "object":
            out2.cbArg = (stmt, cache) => {
              if (!cache.columnNames) cache.columnNames = stmt.getColumnNames([]);
              const row = stmt.get([]);
              const rv = /* @__PURE__ */ Object.create(null);
              for (const i2 in cache.columnNames) rv[cache.columnNames[i2]] = row[i2];
              return rv;
            };
            break;
          case "array":
            out2.cbArg = (stmt) => stmt.get([]);
            break;
          case "stmt":
            if (Array.isArray(opt.resultRows)) toss3("exec(): invalid rowMode for a resultRows array: must", "be one of 'array', 'object',", "a result column number, or column name reference.");
            out2.cbArg = (stmt) => stmt;
            break;
          default:
            if (util.isInt32(opt.rowMode)) {
              out2.cbArg = (stmt) => stmt.get(opt.rowMode);
              break;
            } else if ("string" === typeof opt.rowMode && opt.rowMode.length > 1 && "$" === opt.rowMode[0]) {
              const $colName = opt.rowMode.substr(1);
              out2.cbArg = (stmt) => {
                const rc = stmt.get(/* @__PURE__ */ Object.create(null))[$colName];
                return void 0 === rc ? toss3(capi.SQLITE_NOTFOUND, "exec(): unknown result column:", $colName) : rc;
              };
              break;
            }
            toss3("Invalid rowMode:", opt.rowMode);
        }
        return out2;
      };
      const __selectFirstRow = (db2, sql2, bind, ...getArgs) => {
        const stmt = db2.prepare(sql2);
        try {
          const rc = stmt.bind(bind).step() ? stmt.get(...getArgs) : void 0;
          stmt.reset();
          return rc;
        } finally {
          stmt.finalize();
        }
      };
      const __selectAll = (db2, sql2, bind, rowMode) => db2.exec({
        sql: sql2,
        bind,
        rowMode,
        returnValue: "resultRows"
      });
      const __stmtGetColumn = (stmt, ndx, asType) => {
        switch (void 0 === asType ? capi.sqlite3_column_type(stmt.pointer, ndx) : asType) {
          case capi.SQLITE_NULL:
            return null;
          case capi.SQLITE_INTEGER:
            if (wasm.bigIntEnabled) {
              const rc = capi.sqlite3_column_int64(stmt.pointer, ndx);
              if (rc >= Number.MIN_SAFE_INTEGER && rc <= Number.MAX_SAFE_INTEGER) return Number(rc).valueOf();
              return rc;
            } else {
              const rc = capi.sqlite3_column_double(stmt.pointer, ndx);
              if (rc > Number.MAX_SAFE_INTEGER || rc < Number.MIN_SAFE_INTEGER) toss3("Integer is out of range for JS integer range: " + rc);
              return util.isInt32(rc) ? rc | 0 : rc;
            }
          case capi.SQLITE_FLOAT:
            return capi.sqlite3_column_double(stmt.pointer, ndx);
          case capi.SQLITE_TEXT:
            return capi.sqlite3_column_text(stmt.pointer, ndx);
          case capi.SQLITE_BLOB: {
            const n = capi.sqlite3_column_bytes(stmt.pointer, ndx), ptr = capi.sqlite3_column_blob(stmt.pointer, ndx), rc = new Uint8Array(n);
            if (n) {
              rc.set(wasm.heap8u().slice(Number(ptr), Number(ptr) + n), 0);
              if (stmt.db._blobXfer instanceof Array) stmt.db._blobXfer.push(rc.buffer);
            }
            return rc;
          }
          default:
            toss3("Don't know how to translate", "type of result column #" + ndx + ".");
        }
        toss3("Not reached.");
      };
      DB.checkRc = (db2, resultCode) => checkSqlite3Rc(db2, resultCode);
      DB.prototype = {
        /** Returns true if this db handle is open, else false. */
        isOpen: function() {
          return !!this.pointer;
        },
        /** Throws if this given DB has been closed, else returns `this`. */
        affirmOpen: function() {
          return affirmDbOpen(this);
        },
        /**
        Finalizes all open statements and closes this database
        connection (with one exception noted below). This is a no-op if
        the db has already been closed. After calling close(),
        `this.pointer` will resolve to `undefined`, and that can be
        used to check whether the db instance is still opened.
        
        If this.onclose.before is a function then it is called before
        any close-related cleanup.
        
        If this.onclose.after is a function then it is called after the
        db is closed but before auxiliary state like this.filename is
        cleared.
        
        Both onclose handlers are passed this object, with the onclose
        object as their "this," noting that the db will have been
        closed when onclose.after is called. If this db is not opened
        when close() is called, neither of the handlers are called. Any
        exceptions the handlers throw are ignored because "destructors
        must not throw".
        
        Garbage collection of a db handle, if it happens at all, will
        never trigger close(), so onclose handlers are not a reliable
        way to implement close-time cleanup or maintenance of a db.
        
        If this instance was created using DB.wrapHandle() and does not
        own this.pointer then it does not close the db handle but it
        does perform all other work, such as calling onclose callbacks
        and disassociating this object from this.pointer.
        */
        close: function() {
          const pDb2 = this.pointer;
          if (pDb2) {
            if (this.onclose?.before instanceof Function) try {
              this.onclose.before(this);
            } catch (e) {
            }
            for (const s of Object.values(__stmtMap.get(this))) if (s?.pointer) try {
              s.finalize();
            } catch (ex) {
            }
            __ptrMap.delete(this);
            __stmtMap.delete(this);
            if (!__doesNotOwnHandle.delete(this)) capi.sqlite3_close_v2(pDb2);
            if (this.onclose?.after instanceof Function) try {
              this.onclose.after(this);
            } catch (e) {
            }
            delete this.filename;
          }
        },
        /**
        Returns the number of changes, as per sqlite3_changes()
        (if the first argument is false) or sqlite3_total_changes()
        (if it's true). If the 2nd argument is true, it uses
        sqlite3_changes64() or sqlite3_total_changes64(), which
        will trigger an exception if this build does not have
        BigInt support enabled.
        */
        changes: function(total = false, sixtyFour = false) {
          const p = affirmDbOpen(this).pointer;
          if (total) return sixtyFour ? capi.sqlite3_total_changes64(p) : capi.sqlite3_total_changes(p);
          else return sixtyFour ? capi.sqlite3_changes64(p) : capi.sqlite3_changes(p);
        },
        /**
        Similar to the this.filename but returns the
        sqlite3_db_filename() value for the given database name,
        defaulting to "main".  The argument may be either a JS string
        or a pointer to a WASM-allocated C-string.
        
        this.filename may be in the form of a URI-style string, whereas
        the returned string contains only the filename part.
        */
        dbFilename: function(dbName = "main") {
          return capi.sqlite3_db_filename(affirmDbOpen(this).pointer, dbName);
        },
        /**
        Returns the name of the given 0-based db number, as documented
        for sqlite3_db_name().
        */
        dbName: function(dbNumber = 0) {
          return capi.sqlite3_db_name(affirmDbOpen(this).pointer, dbNumber);
        },
        /**
        Returns the name of the sqlite3_vfs used by the given database
        of this connection (defaulting to 'main'). The argument may be
        either a JS string or a WASM C-string. Returns undefined if the
        given db name is invalid. Throws if this object has been
        close()d.
        */
        dbVfsName: function(dbName = 0) {
          let rc;
          const pVfs = capi.sqlite3_js_db_vfs(affirmDbOpen(this).pointer, dbName);
          if (pVfs) {
            const v2 = new capi.sqlite3_vfs(pVfs);
            try {
              rc = wasm.cstrToJs(v2.$zName);
            } finally {
              v2.dispose();
            }
          }
          return rc;
        },
        /**
        Compiles the given SQL and returns a prepared Stmt. This is
        the only way to create new Stmt objects. Throws on error.
        
        The given SQL must be a string, a Uint8Array holding SQL, a
        WASM pointer to memory holding the NUL-terminated SQL string,
        or an array of strings. In the latter case, the array is
        concatenated together, with no separators, to form the SQL
        string (arrays are often a convenient way to formulate long
        statements).  If the SQL contains no statements, an
        SQLite3Error is thrown.
        
        Design note: the C API permits empty SQL, reporting it as a 0
        result code and a NULL stmt pointer. Supporting that case here
        would cause extra work for all clients: any use of the Stmt API
        on such a statement will necessarily throw, so clients would be
        required to check `stmt.pointer` after calling `prepare()` in
        order to determine whether the Stmt instance is empty or not.
        Long-time practice (with other sqlite3 script bindings)
        suggests that the empty-prepare case is sufficiently rare that
        supporting it here would simply hurt overall usability.
        */
        prepare: function(sql2) {
          affirmDbOpen(this);
          const stack = wasm.pstack.pointer;
          let ppStmt, pStmt;
          try {
            ppStmt = wasm.pstack.alloc(8);
            DB.checkRc(this, capi.sqlite3_prepare_v2(this.pointer, sql2, -1, ppStmt, null));
            pStmt = wasm.peekPtr(ppStmt);
          } finally {
            wasm.pstack.restore(stack);
          }
          if (!pStmt) toss3("Cannot prepare empty SQL.");
          const stmt = new Stmt(this, pStmt, BindTypes);
          __stmtMap.get(this)[pStmt] = stmt;
          return stmt;
        },
        /**
        Executes one or more SQL statements in the form of a single
        string. Its arguments must be either (sql,optionsObject) or
        (optionsObject). In the latter case, optionsObject.sql must
        contain the SQL to execute. By default it returns this object
        but that can be changed via the `returnValue` option as
        described below. Throws on error.
        
        If no SQL is provided, or a non-string is provided, an
        exception is triggered. Empty SQL, on the other hand, is
        simply a no-op.
        
        The optional options object may contain any of the following
        properties:
        
        - `sql` = the SQL to run (unless it's provided as the first
        argument). This must be of type string, Uint8Array, or an array
        of strings. In the latter case they're concatenated together
        as-is, _with no separator_ between elements, before evaluation.
        The array form is often simpler for long hand-written queries.
        
        - `bind` = a single value valid as an argument for
        Stmt.bind(). This is _only_ applied to the _first_ non-empty
        statement in the SQL which has any bindable parameters. (Empty
        statements are skipped entirely.)
        
        - `saveSql` = an optional array. If set, the SQL of each
        executed statement is appended to this array before the
        statement is executed (but after it is prepared - we don't have
        the string until after that). Empty SQL statements are elided
        but can have odd effects in the output. e.g. SQL of: `"select
        1; -- empty\n; select 2"` will result in an array containing
        `["select 1;", "--empty \n; select 2"]`. That's simply how
        sqlite3 records the SQL for the 2nd statement.
        
        ==================================================================
        The following options apply _only_ to the _first_ statement
        which has a non-zero result column count, regardless of whether
        the statement actually produces any result rows.
        ==================================================================
        
        - `columnNames`: if this is an array, the column names of the
        result set are stored in this array before the callback (if
        any) is triggered (regardless of whether the query produces any
        result rows). If no statement has result columns, this value is
        unchanged. Achtung: an SQL result may have multiple columns
        with identical names.
        
        - `callback` = a function which gets called for each row of the
        result set, but only if that statement has any result rows. The
        callback's "this" is the options object, noting that this
        function synthesizes one if the caller does not pass one to
        exec(). The first argument passed to the callback is described
        below. The second argument is always the current Stmt object,
        as it's needed if the caller wants to fetch the column names or
        some such (noting that they could also be fetched via
        `this.columnNames`, if the client provides the `columnNames`
        option). If the callback returns a literal `false` (as opposed
        to any other falsy value, e.g. an implicit `undefined` return),
        any ongoing statement-`step()` iteration stops without an
        error. The return value of the callback is otherwise ignored.
        
        ACHTUNG: The callback MUST NOT modify the Stmt object. Calling
        any of the Stmt.get() variants, Stmt.getColumnName(), or
        similar, is legal, but calling step() or finalize() is
        not. Member methods which are illegal in this context will
        trigger an exception, but clients must also refrain from using
        any lower-level (C-style) APIs which might modify the
        statement.
        
        The first argument passed to the callback defaults to an array of
        values from the current result row but may be changed with ...
        
        - `rowMode` = specifies the type of he callback's first argument.
        It may be any of...
        
        A) A string describing what type of argument should be passed
        as the first argument to the callback:
        
        A.1) `'array'` (the default) causes the results of
        `stmt.get([])` to be passed to the `callback` and/or appended
        to `resultRows`.
        
        A.2) `'object'` causes the results of
        `stmt.get(Object.create(null))` to be passed to the
        `callback` and/or appended to `resultRows`.  Achtung: an SQL
        result may have multiple columns with identical names. In
        that case, the right-most column will be the one set in this
        object!
        
        A.3) `'stmt'` causes the current Stmt to be passed to the
        callback, but this mode will trigger an exception if
        `resultRows` is an array because appending the transient
        statement to the array would be downright unhelpful.  This
        option is a legacy feature, retained for backwards
        compatibility.  The statement object is passed as the second
        argument to the callback, as described above.
        
        B) An integer, indicating a zero-based column in the result
        row. Only that one single value, in JS form, will be passed on.
        
        C) A string with a minimum length of 2 and leading character of
        '$' will fetch the row as an object, extract that one field,
        and pass that field's value to the callback. These keys are
        case-sensitive so must match the case used in the
        SQL. e.g. `"select a A from t"` with a `rowMode` of `'$A'`
        would work but `'$a'` would not. A reference to a column not in
        the result set will trigger an exception on the first row (as
        the check is not performed until rows are fetched).  Note that
        `$` is a legal identifier character in JS so need not be
        quoted.
        
        Any other `rowMode` value triggers an exception.
        
        - `resultRows`: if this is an array, it functions similarly to
        the `callback` option: each row of the result set (if any),
        with the exception that the `rowMode` 'stmt' is not legal. It
        is legal to use both `resultRows` and `callback`, but
        `resultRows` is likely much simpler to use for small data sets
        and can be used over a WebWorker-style message interface.
        exec() throws if `resultRows` is set and `rowMode` is 'stmt'.
        
        - `returnValue`: is a string specifying what this function
        should return:
        
        A) The default value is (usually) `"this"`, meaning that the
        DB object itself should be returned. The exception is if
        the caller passes neither of `callback` nor `returnValue`
        but does pass an explicit `rowMode` then the default
        `returnValue` is `"resultRows"`, described below.
        
        B) `"resultRows"` means to return the value of the
        `resultRows` option. If `resultRows` is not set, this
        function behaves as if it were set to an empty array.
        
        C) `"saveSql"` means to return the value of the
        `saveSql` option. If `saveSql` is not set, this
        function behaves as if it were set to an empty array.
        
        Potential TODOs:
        
        - `bind`: permit an array of arrays/objects to bind. The first
        sub-array would act on the first statement which has bindable
        parameters (as it does now). The 2nd would act on the next such
        statement, etc.
        
        - `callback` and `resultRows`: permit an array entries with
        semantics similar to those described for `bind` above.
        
        OTOH, this function already does too much.
        */
        exec: function() {
          affirmDbOpen(this);
          const arg = parseExecArgs(this, arguments);
          if (!arg.sql) return toss3("exec() requires an SQL string.");
          const opt = arg.opt;
          const callback = opt.callback;
          const resultRows = Array.isArray(opt.resultRows) ? opt.resultRows : void 0;
          let stmt;
          let bind = opt.bind;
          let evalFirstResult = !!(arg.cbArg || opt.columnNames || resultRows);
          const stack = wasm.scopedAllocPush();
          const saveSql = Array.isArray(opt.saveSql) ? opt.saveSql : void 0;
          try {
            const isTA = util.isSQLableTypedArray(arg.sql);
            let sqlByteLen = isTA ? arg.sql.byteLength : wasm.jstrlen(arg.sql);
            const ppStmt = wasm.scopedAlloc(2 * wasm.ptr.size + (sqlByteLen + 1));
            const pzTail = wasm.ptr.add(ppStmt, wasm.ptr.size);
            let pSql = wasm.ptr.add(pzTail, wasm.ptr.size);
            const pSqlEnd = wasm.ptr.add(pSql, sqlByteLen);
            if (isTA) wasm.heap8().set(arg.sql, pSql);
            else wasm.jstrcpy(arg.sql, wasm.heap8(), pSql, sqlByteLen, false);
            wasm.poke8(wasm.ptr.add(pSql, sqlByteLen), 0);
            while (pSql && wasm.peek8(pSql)) {
              wasm.pokePtr([ppStmt, pzTail], 0);
              DB.checkRc(this, capi.sqlite3_prepare_v3(this.pointer, pSql, sqlByteLen, 0, ppStmt, pzTail));
              const pStmt = wasm.peekPtr(ppStmt);
              pSql = wasm.peekPtr(pzTail);
              sqlByteLen = Number(wasm.ptr.add(pSqlEnd, -pSql));
              if (!pStmt) continue;
              if (saveSql) saveSql.push(capi.sqlite3_sql(pStmt).trim());
              stmt = new Stmt(this, pStmt, BindTypes);
              if (bind && stmt.parameterCount) {
                stmt.bind(bind);
                bind = null;
              }
              if (evalFirstResult && stmt.columnCount) {
                let gotColNames = Array.isArray(opt.columnNames) ? 0 : 1;
                evalFirstResult = false;
                if (arg.cbArg || resultRows) {
                  const cbArgCache = /* @__PURE__ */ Object.create(null);
                  for (; stmt.step(); __execLock.delete(stmt)) {
                    if (0 === gotColNames++) stmt.getColumnNames(cbArgCache.columnNames = opt.columnNames || []);
                    __execLock.add(stmt);
                    const row = arg.cbArg(stmt, cbArgCache);
                    if (resultRows) resultRows.push(row);
                    if (callback && false === callback.call(opt, row, stmt)) break;
                  }
                  __execLock.delete(stmt);
                }
                if (0 === gotColNames) stmt.getColumnNames(opt.columnNames);
              } else stmt.step();
              stmt.reset().finalize();
              stmt = null;
            }
          } finally {
            if (stmt) {
              __execLock.delete(stmt);
              stmt.finalize();
            }
            wasm.scopedAllocPop(stack);
          }
          return arg.returnVal();
        },
        /**
        Creates a new UDF (User-Defined Function) which is accessible
        via SQL code. This function may be called in any of the
        following forms:
        
        - (name, function)
        - (name, function, optionsObject)
        - (name, optionsObject)
        - (optionsObject)
        
        In the final two cases, the function must be defined as the
        `callback` property of the options object (optionally called
        `xFunc` to align with the C API documentation). In the final
        case, the function's name must be the 'name' property.
        
        The first two call forms can only be used for creating scalar
        functions. Creating an aggregate or window function requires
        the options-object form (see below for details).
        
        UDFs can be removed as documented for
        sqlite3_create_function_v2() and
        sqlite3_create_window_function(), but doing so will "leak" the
        JS-created WASM binding of those functions (meaning that their
        entries in the WASM indirect function table still
        exist). Eliminating that potential leak is a pending TODO.
        
        On success, returns this object. Throws on error.
        
        When called from SQL arguments to the UDF, and its result,
        will be converted between JS and SQL with as much fidelity as
        is feasible, triggering an exception if a type conversion
        cannot be determined. The docs for sqlite3_create_function_v2()
        describe the conversions in more detail.
        
        The values set in the options object differ for scalar and
        aggregate functions:
        
        - Scalar: set the `xFunc` function-type property to the UDF
        function.
        
        - Aggregate: set the `xStep` and `xFinal` function-type
        properties to the "step" and "final" callbacks for the
        aggregate. Do not set the `xFunc` property.
        
        - Window: set the `xStep`, `xFinal`, `xValue`, and `xInverse`
        function-type properties. Do not set the `xFunc` property.
        
        The options object may optionally have an `xDestroy`
        function-type property, as per sqlite3_create_function_v2().
        Its argument will be the WASM-pointer-type value of the `pApp`
        property, and this function will throw if `pApp` is defined but
        is not null, undefined, or a numeric (WASM pointer)
        value. i.e. `pApp`, if set, must be value suitable for use as a
        WASM pointer argument, noting that `null` or `undefined` will
        translate to 0 for that purpose.
        
        The options object may contain flags to modify how
        the function is defined:
        
        - `arity`: the number of arguments which SQL calls to this
        function expect or require. The default value is `xFunc.length`
        or `xStep.length` (i.e. the number of declared parameters it
        has) **MINUS 1** (see below for why). As a special case, if the
        `length` is 0, its arity is also 0 instead of -1. A negative
        arity value means that the function is variadic and may accept
        any number of arguments, up to sqlite3's compile-time
        limits. sqlite3 will enforce the argument count if is zero or
        greater. The callback always receives a pointer to an
        `sqlite3_context` object as its first argument. Any arguments
        after that are from SQL code. The leading context argument does
        _not_ count towards the function's arity. See the docs for
        sqlite3.capi.sqlite3_create_function_v2() for why that argument
        is needed in the interface.
        
        The following options-object properties correspond to flags
        documented at:
        
        https://sqlite.org/c3ref/create_function.html
        
        - `deterministic` = sqlite3.capi.SQLITE_DETERMINISTIC
        - `directOnly` = sqlite3.capi.SQLITE_DIRECTONLY
        - `innocuous` = sqlite3.capi.SQLITE_INNOCUOUS
        
        Sidebar: the ability to add new WASM-accessible functions to
        the runtime requires that the WASM build is compiled with the
        equivalent functionality as that provided by Emscripten's
        `-sALLOW_TABLE_GROWTH` flag.
        */
        createFunction: function f(name, xFunc, opt) {
          const isFunc = (f2) => f2 instanceof Function;
          switch (arguments.length) {
            case 1:
              opt = name;
              name = opt.name;
              xFunc = opt.xFunc || 0;
              break;
            case 2:
              if (!isFunc(xFunc)) {
                opt = xFunc;
                xFunc = opt.xFunc || 0;
              }
          }
          if (!opt) opt = {};
          if ("string" !== typeof name) toss3("Invalid arguments: missing function name.");
          let xStep = opt.xStep || 0;
          let xFinal = opt.xFinal || 0;
          const xValue = opt.xValue || 0;
          const xInverse = opt.xInverse || 0;
          let isWindow = void 0;
          if (isFunc(xFunc)) {
            isWindow = false;
            if (isFunc(xStep) || isFunc(xFinal)) toss3("Ambiguous arguments: scalar or aggregate?");
            xStep = xFinal = null;
          } else if (isFunc(xStep)) {
            if (!isFunc(xFinal)) toss3("Missing xFinal() callback for aggregate or window UDF.");
            xFunc = null;
          } else if (isFunc(xFinal)) toss3("Missing xStep() callback for aggregate or window UDF.");
          else toss3("Missing function-type properties.");
          if (false === isWindow) {
            if (isFunc(xValue) || isFunc(xInverse)) toss3("xValue and xInverse are not permitted for non-window UDFs.");
          } else if (isFunc(xValue)) {
            if (!isFunc(xInverse)) toss3("xInverse must be provided if xValue is.");
            isWindow = true;
          } else if (isFunc(xInverse)) toss3("xValue must be provided if xInverse is.");
          const pApp = opt.pApp;
          if (void 0 !== pApp && null !== pApp && !wasm.isPtr(pApp)) toss3("Invalid value for pApp property. Must be a legal WASM pointer value.");
          const xDestroy = opt.xDestroy || 0;
          if (xDestroy && !isFunc(xDestroy)) toss3("xDestroy property must be a function.");
          let fFlags = 0;
          if (getOwnOption(opt, "deterministic")) fFlags |= capi.SQLITE_DETERMINISTIC;
          if (getOwnOption(opt, "directOnly")) fFlags |= capi.SQLITE_DIRECTONLY;
          if (getOwnOption(opt, "innocuous")) fFlags |= capi.SQLITE_INNOCUOUS;
          name = name.toLowerCase();
          const xArity = xFunc || xStep;
          const arity = getOwnOption(opt, "arity");
          const arityArg = "number" === typeof arity ? arity : xArity.length ? xArity.length - 1 : 0;
          let rc;
          if (isWindow) rc = capi.sqlite3_create_window_function(this.pointer, name, arityArg, capi.SQLITE_UTF8 | fFlags, pApp || 0, xStep, xFinal, xValue, xInverse, xDestroy);
          else rc = capi.sqlite3_create_function_v2(this.pointer, name, arityArg, capi.SQLITE_UTF8 | fFlags, pApp || 0, xFunc, xStep, xFinal, xDestroy);
          DB.checkRc(this, rc);
          return this;
        },
        /**
        Prepares the given SQL, step()s it one time, and returns
        the value of the first result column. If it has no results,
        undefined is returned.
        
        If passed a second argument, it is treated like an argument
        to Stmt.bind(), so may be any type supported by that
        function. Passing the undefined value is the same as passing
        no value, which is useful when...
        
        If passed a 3rd argument, it is expected to be one of the
        SQLITE_{typename} constants. Passing the undefined value is
        the same as not passing a value.
        
        Throws on error (e.g. malformed SQL).
        */
        selectValue: function(sql2, bind, asType) {
          return __selectFirstRow(this, sql2, bind, 0, asType);
        },
        /**
        Runs the given query and returns an array of the values from
        the first result column of each row of the result set. The 2nd
        argument is an optional value for use in a single-argument call
        to Stmt.bind(). The 3rd argument may be any value suitable for
        use as the 2nd argument to Stmt.get(). If a 3rd argument is
        desired but no bind data are needed, pass `undefined` for the 2nd
        argument.
        
        If there are no result rows, an empty array is returned.
        */
        selectValues: function(sql2, bind, asType) {
          const stmt = this.prepare(sql2), rc = [];
          try {
            affirmColIndex(stmt, 0);
            stmt.bind(bind);
            while (stmt.step()) rc.push(__stmtGetColumn(stmt, 0, asType));
            stmt.reset();
          } finally {
            stmt.finalize();
          }
          return rc;
        },
        /**
        Prepares the given SQL, step()s it one time, and returns an
        array containing the values of the first result row. If it has
        no results, `undefined` is returned.
        
        If passed a second argument other than `undefined`, it is
        treated like an argument to Stmt.bind(), so may be any type
        supported by that function.
        
        Throws on error (e.g. malformed SQL).
        */
        selectArray: function(sql2, bind) {
          return __selectFirstRow(this, sql2, bind, []);
        },
        /**
        Prepares the given SQL, step()s it one time, and returns an
        object containing the key/value pairs of the first result
        row. If it has no results, `undefined` is returned.
        
        Note that the order of returned object's keys is not guaranteed
        to be the same as the order of the fields in the query string.
        
        If passed a second argument other than `undefined`, it is
        treated like an argument to Stmt.bind(), so may be any type
        supported by that function.
        
        Throws on error (e.g. malformed SQL).
        */
        selectObject: function(sql2, bind) {
          return __selectFirstRow(this, sql2, bind, {});
        },
        /**
        Runs the given SQL and returns an array of all results, with
        each row represented as an array, as per the 'array' `rowMode`
        option to `exec()`. An empty result set resolves
        to an empty array. The second argument, if any, is treated as
        the 'bind' option to a call to exec().
        */
        selectArrays: function(sql2, bind) {
          return __selectAll(this, sql2, bind, "array");
        },
        /**
        Works identically to selectArrays() except that each value
        in the returned array is an object, as per the 'object' `rowMode`
        option to `exec()`.
        */
        selectObjects: function(sql2, bind) {
          return __selectAll(this, sql2, bind, "object");
        },
        /**
        Returns the number of currently-opened Stmt handles for this db
        handle, or 0 if this DB instance is closed. Note that only
        handles prepared via this.prepare() are counted, and not
        handles prepared using capi.sqlite3_prepare_v3() (or
        equivalent).
        */
        openStatementCount: function() {
          return this.pointer ? Object.keys(__stmtMap.get(this)).length : 0;
        },
        /**
        Starts a transaction, calls the given callback, and then either
        rolls back or commits the transaction, depending on whether the
        callback throws. The callback is passed this db object as its
        only argument. On success, returns the result of the
        callback. Throws on error.
        
        Transactions may not be nested, so this will throw if it is
        called recursively. For nested transactions, use the
        savepoint() method or manually manage SAVEPOINTs using exec().
        
        If called with 2 arguments, the first must be a keyword which
        is legal immediately after a BEGIN statement, e.g. one of
        "DEFERRED", "IMMEDIATE", or "EXCLUSIVE", though the exact list
        of supported keywords is not hard-coded here, in order to be
        future-compatible, if the argument does not look like a single
        keyword then an exception is triggered with a description of
        the problem.
        */
        transaction: function(callback) {
          let opener = "BEGIN";
          if (arguments.length > 1) {
            if (/[^a-zA-Z]/.test(arguments[0])) toss3(capi.SQLITE_MISUSE, "Invalid argument for BEGIN qualifier.");
            opener += " " + arguments[0];
            callback = arguments[1];
          }
          affirmDbOpen(this).exec(opener);
          try {
            const rc = callback(this);
            this.exec("COMMIT");
            return rc;
          } catch (e) {
            this.exec("ROLLBACK");
            throw e;
          }
        },
        /**
        This works similarly to transaction() but uses sqlite3's SAVEPOINT
        feature. This function starts a savepoint (with an unspecified name)
        and calls the given callback function, passing it this db object.
        If the callback returns, the savepoint is released (committed). If
        the callback throws, the savepoint is rolled back. If it does not
        throw, it returns the result of the callback.
        */
        savepoint: function(callback) {
          affirmDbOpen(this).exec("SAVEPOINT oo1");
          try {
            const rc = callback(this);
            this.exec("RELEASE oo1");
            return rc;
          } catch (e) {
            this.exec("ROLLBACK to SAVEPOINT oo1; RELEASE SAVEPOINT oo1");
            throw e;
          }
        },
        /**
        A convenience form of DB.checkRc(this,resultCode). If it does
        not throw, it returns this object.
        */
        checkRc: function(resultCode) {
          return checkSqlite3Rc(this, resultCode);
        }
      };
      DB.wrapHandle = function(pDb2, takeOwnership = false) {
        if (!pDb2 || !wasm.isPtr(pDb2)) throw new sqlite3.SQLite3Error(capi.SQLITE_MISUSE, "Argument must be a WASM sqlite3 pointer");
        return new DB({
          "sqlite3*": pDb2,
          "sqlite3*:takeOwnership": !!takeOwnership
        });
      };
      const affirmStmtOpen = function(stmt) {
        if (!stmt.pointer) toss3("Stmt has been closed.");
        return stmt;
      };
      const isSupportedBindType = function(v2) {
        let t = BindTypes[null === v2 || void 0 === v2 ? "null" : typeof v2];
        switch (t) {
          case BindTypes.boolean:
          case BindTypes.null:
          case BindTypes.number:
          case BindTypes.string:
            return t;
          case BindTypes.bigint:
            return wasm.bigIntEnabled ? t : void 0;
          default:
            return util.isBindableTypedArray(v2) ? BindTypes.blob : void 0;
        }
      };
      const affirmSupportedBindType = function(v2) {
        return isSupportedBindType(v2) || toss3("Unsupported bind() argument type:", typeof v2);
      };
      const affirmParamIndex = function(stmt, key) {
        const n = "number" === typeof key ? key : capi.sqlite3_bind_parameter_index(stmt.pointer, key);
        if (0 === n || !util.isInt32(n)) toss3("Invalid bind() parameter name: " + key);
        else if (n < 1 || n > stmt.parameterCount) toss3("Bind index", key, "is out of range.");
        return n;
      };
      const __execLock = /* @__PURE__ */ new Set();
      const __stmtMayGet = /* @__PURE__ */ new Set();
      const affirmNotLockedByExec = function(stmt, currentOpName) {
        if (__execLock.has(stmt)) toss3("Operation is illegal when statement is locked:", currentOpName);
        return stmt;
      };
      const bindOne = function f(stmt, ndx, bindType, val) {
        affirmNotLockedByExec(affirmStmtOpen(stmt), "bind()");
        if (!f._) {
          f._tooBigInt = (v2) => toss3("BigInt value is too big to store without precision loss:", v2);
          f._ = { string: function(stmt2, ndx2, val2, asBlob) {
            const [pStr, n] = wasm.allocCString(val2, true);
            return (asBlob ? capi.sqlite3_bind_blob : capi.sqlite3_bind_text)(stmt2.pointer, ndx2, pStr, n, capi.SQLITE_WASM_DEALLOC);
          } };
        }
        affirmSupportedBindType(val);
        ndx = affirmParamIndex(stmt, ndx);
        let rc = 0;
        switch (null === val || void 0 === val ? BindTypes.null : bindType) {
          case BindTypes.null:
            rc = capi.sqlite3_bind_null(stmt.pointer, ndx);
            break;
          case BindTypes.string:
            rc = f._.string(stmt, ndx, val, false);
            break;
          case BindTypes.number: {
            let m;
            if (util.isInt32(val)) m = capi.sqlite3_bind_int;
            else if ("bigint" === typeof val) {
              if (!util.bigIntFits64(val)) f._tooBigInt(val);
              else if (wasm.bigIntEnabled) m = capi.sqlite3_bind_int64;
              else if (util.bigIntFitsDouble(val)) {
                val = Number(val);
                m = capi.sqlite3_bind_double;
              } else f._tooBigInt(val);
            } else {
              val = Number(val);
              if (wasm.bigIntEnabled && Number.isInteger(val)) m = capi.sqlite3_bind_int64;
              else m = capi.sqlite3_bind_double;
            }
            rc = m(stmt.pointer, ndx, val);
            break;
          }
          case BindTypes.boolean:
            rc = capi.sqlite3_bind_int(stmt.pointer, ndx, val ? 1 : 0);
            break;
          case BindTypes.blob: {
            if ("string" === typeof val) {
              rc = f._.string(stmt, ndx, val, true);
              break;
            } else if (val instanceof ArrayBuffer) val = new Uint8Array(val);
            else if (!util.isBindableTypedArray(val)) toss3("Binding a value as a blob requires", "that it be a string, Uint8Array, Int8Array, or ArrayBuffer.");
            const pBlob = wasm.alloc(val.byteLength || 1);
            wasm.heap8().set(val.byteLength ? val : [0], Number(pBlob));
            rc = capi.sqlite3_bind_blob(stmt.pointer, ndx, pBlob, val.byteLength, capi.SQLITE_WASM_DEALLOC);
            break;
          }
          default:
            sqlite3.config.warn("Unsupported bind() argument type:", val);
            toss3("Unsupported bind() argument type: " + typeof val);
        }
        if (rc) DB.checkRc(stmt.db.pointer, rc);
        return stmt;
      };
      Stmt.prototype = {
        /**
        "Finalizes" this statement. This is a no-op if the statement
        has already been finalized. Returns the result of
        sqlite3_finalize() (0 on success, non-0 on error), or the
        undefined value if the statement has already been
        finalized. Regardless of success or failure, most methods in
        this class will throw if called after this is.
        
        This method always throws if called when it is illegal to do
        so. Namely, when triggered via a per-row callback handler of a
        DB.exec() call.
        
        If Stmt does not own its underlying (sqlite3_stmt*) (see
        Stmt.wrapHandle()) then this function will not pass it to
        sqlite3_finalize().
        */
        finalize: function() {
          const ptr = this.pointer;
          if (ptr) {
            affirmNotLockedByExec(this, "finalize()");
            const rc = __doesNotOwnHandle.delete(this) ? 0 : capi.sqlite3_finalize(ptr);
            delete __stmtMap.get(this.db)[ptr];
            __ptrMap.delete(this);
            __execLock.delete(this);
            __stmtMayGet.delete(this);
            delete this.parameterCount;
            delete this.db;
            return rc;
          }
        },
        /**
        Clears all bound values. Returns this object.  Throws if this
        statement has been finalized or if modification of the
        statement is currently illegal (e.g. in the per-row callback of
        a DB.exec() call).
        */
        clearBindings: function() {
          affirmNotLockedByExec(affirmStmtOpen(this), "clearBindings()");
          capi.sqlite3_clear_bindings(this.pointer);
          __stmtMayGet.delete(this);
          return this;
        },
        /**
        Resets this statement so that it may be step()ed again from the
        beginning. Returns this object. Throws if this statement has
        been finalized, if it may not legally be reset because it is
        currently being used from a DB.exec() callback, or if the
        underlying call to sqlite3_reset() returns non-0.
        
        If passed a truthy argument then this.clearBindings() is
        also called, otherwise any existing bindings, along with
        any memory allocated for them, are retained.
        
        Clients must not use capi.sqlite3_reset() with this object
        because this method does book-keeping specific to this class,
        e.g. the pieces which ensure that the column-fetching methods
        throw when called without a corresponding step().
        
        In versions 3.42.0 and earlier, this function did not throw if
        sqlite3_reset() returns non-0, but it was discovered that
        throwing (or significant extra client-side code) is necessary
        in order to avoid certain silent failure scenarios, as
        discussed at:
        
        https://sqlite.org/forum/forumpost/36f7a2e7494897df
        */
        reset: function(alsoClearBinds) {
          affirmNotLockedByExec(this, "reset()");
          if (alsoClearBinds) this.clearBindings();
          const rc = capi.sqlite3_reset(affirmStmtOpen(this).pointer);
          __stmtMayGet.delete(this);
          checkSqlite3Rc(this.db, rc);
          return this;
        },
        /**
        Works like reset() except that it returns the underlying
        C-level result code instead of throwing if that code represents
        an error.
        
        Clients must not use capi.sqlite3_reset() for this purpose
        because this method (like reset()) does book-keeping specific
        to this class.
        
        Throws if an exec() is underway.
        
        The use case this addresses is when a step() fails due to,
        e.g., a locking error: a following reset() will report that
        locking error by throwing and that's sometimes inconvenient.
        
        Added in 3.54.
        */
        resetNoThrow: function(alsoClearBinds) {
          affirmNotLockedByExec(this, "reset()");
          if (alsoClearBinds) this.clearBindings();
          const rc = capi.sqlite3_reset(affirmStmtOpen(this).pointer);
          __stmtMayGet.delete(this);
          return rc;
        },
        /**
        Binds one or more values to its bindable parameters. It
        accepts 1 or 2 arguments:
        
        If passed a single argument, it must be either an array, an
        object, or a value of a bindable type (see below).
        
        If passed 2 arguments, the first one is the 1-based bind
        index or bindable parameter name and the second one must be
        a value of a bindable type.
        
        Bindable value types:
        
        - null is bound as NULL.
        
        - undefined as a standalone value is a no-op intended to
        simplify certain client-side use cases: passing undefined as
        a value to this function will not actually bind anything and
        this function will skip confirmation that binding is even
        legal. (Those semantics simplify certain client-side uses.)
        Conversely, a value of undefined as an array or object
        property when binding an array/object (see below) is treated
        the same as null.
        
        - Numbers are bound as either doubles or integers: doubles if
        they are larger than 32 bits, else double or int32, depending
        on whether they have a fractional part. Booleans are bound as
        integer 0 or 1. It is not expected the distinction of binding
        doubles which have no fractional parts and integers is
        significant for the majority of clients due to sqlite3's data
        typing model. If BigInt support is enabled then this routine
        will bind BigInt values as 64-bit integers if they'll fit in
        64 bits. If that support disabled, it will store the BigInt
        as an int32 or a double if it can do so without loss of
        precision. If the BigInt is _too BigInt_ then it will throw.
        
        - Strings are bound as strings (use bindAsBlob() to force
        blob binding).
        
        - Uint8Array, Int8Array, and ArrayBuffer instances are bound as
        blobs.
        
        If passed an array, each element of the array is bound at
        the parameter index equal to the array index plus 1
        (because arrays are 0-based but binding is 1-based).
        
        If passed an object, each object key is treated as a
        bindable parameter name. The object keys _must_ match any
        bindable parameter names, including any `$`, `@`, or `:`
        prefix. Because `$` is a legal identifier chararacter in
        JavaScript, that is the suggested prefix for bindable
        parameters: `stmt.bind({$a: 1, $b: 2})`.
        
        It returns this object on success and throws on
        error. Errors include:
        
        - Any bind index is out of range, a named bind parameter
        does not match, or this statement has no bindable
        parameters.
        
        - Any value to bind is of an unsupported type.
        
        - Passed no arguments or more than two.
        
        - The statement has been finalized.
        */
        bind: function() {
          affirmStmtOpen(this);
          let ndx, arg;
          switch (arguments.length) {
            case 1:
              ndx = 1;
              arg = arguments[0];
              break;
            case 2:
              ndx = arguments[0];
              arg = arguments[1];
              break;
            default:
              toss3("Invalid bind() arguments.");
          }
          if (void 0 === arg) return this;
          else if (!this.parameterCount) toss3("This statement has no bindable parameters.");
          __stmtMayGet.delete(this);
          if (null === arg) return bindOne(this, ndx, BindTypes.null, arg);
          else if (Array.isArray(arg)) {
            if (1 !== arguments.length) toss3("When binding an array, an index argument is not permitted.");
            arg.forEach((v2, i2) => bindOne(this, i2 + 1, affirmSupportedBindType(v2), v2));
            return this;
          } else if (arg instanceof ArrayBuffer) arg = new Uint8Array(arg);
          if ("object" === typeof arg && !util.isBindableTypedArray(arg)) {
            if (1 !== arguments.length) toss3("When binding an object, an index argument is not permitted.");
            Object.keys(arg).forEach((k2) => bindOne(this, k2, affirmSupportedBindType(arg[k2]), arg[k2]));
            return this;
          } else return bindOne(this, ndx, affirmSupportedBindType(arg), arg);
        },
        /**
        Special case of bind() which binds the given value using the
        BLOB binding mechanism instead of the default selected one for
        the value. The ndx may be a numbered or named bind index. The
        value must be of type string, null/undefined (both get treated
        as null), or a TypedArray of a type supported by the bind()
        API. This API cannot bind numbers as blobs.
        
        If passed a single argument, a bind index of 1 is assumed and
        the first argument is the value.
        */
        bindAsBlob: function(ndx, arg) {
          affirmStmtOpen(this);
          if (1 === arguments.length) {
            arg = ndx;
            ndx = 1;
          }
          const t = affirmSupportedBindType(arg);
          if (BindTypes.string !== t && BindTypes.blob !== t && BindTypes.null !== t) toss3("Invalid value type for bindAsBlob()");
          return bindOne(this, ndx, BindTypes.blob, arg);
        },
        /**
        Steps the statement one time. If the result indicates that a
        row of data is available, a truthy value is returned.  If no
        row of data is available, a falsy value is returned.  Throws on
        error.
        */
        step: function() {
          affirmNotLockedByExec(this, "step()");
          const rc = capi.sqlite3_step(affirmStmtOpen(this).pointer);
          switch (rc) {
            case capi.SQLITE_DONE:
              __stmtMayGet.delete(this);
              return false;
            case capi.SQLITE_ROW:
              __stmtMayGet.add(this);
              return true;
            default:
              __stmtMayGet.delete(this);
              sqlite3.config.warn("sqlite3_step() rc=", rc, capi.sqlite3_js_rc_str(rc), "SQL =", capi.sqlite3_sql(this.pointer));
              DB.checkRc(this.db.pointer, rc);
          }
        },
        /**
        Functions exactly like step() except that...
        
        1) On success, it calls this.reset() and returns this object.
        
        2) On error, it throws and does not call reset().
        
        This is intended to simplify constructs like:
        
        ```
        for(...) {
        stmt.bind(...).stepReset();
        }
        ```
        
        Note that the reset() call makes it illegal to call this.get()
        after the step.
        */
        stepReset: function() {
          this.step();
          return this.reset();
        },
        /**
        Functions like step() except that it calls finalize() on this
        statement immediately after stepping, even if the step() call
        throws.
        
        On success, it returns true if the step indicated that a row of
        data was available, else it returns a falsy value.
        
        This is intended to simplify use cases such as:
        
        ```
        aDb.prepare("insert into foo(a) values(?)").bind(123).stepFinalize();
        ```
        */
        stepFinalize: function() {
          try {
            const rc = this.step();
            this.reset();
            return rc;
          } finally {
            try {
              this.finalize();
            } catch (e) {
            }
          }
        },
        /**
        Fetches the value from the given 0-based column index of
        the current data row, throwing if index is out of range.
        
        Requires that step() has just returned a truthy value, else
        an exception is thrown.
        
        By default it will determine the data type of the result
        automatically. If passed a second argument, it must be one of
        the enumeration values for sqlite3 types, which are defined as
        members of the sqlite3.capi namespace: SQLITE_INTEGER,
        SQLITE_FLOAT, SQLITE_TEXT, SQLITE_BLOB. Any other value, except
        for undefined, will trigger an exception. Passing undefined is
        the same as not passing a value. It is legal to, e.g., fetch an
        integer value as a string, in which case sqlite3 will convert
        the value to a string.
        
        Blobs are returned as Uint8Array instances.
        
        If ndx is an array, this function behaves a differently: it
        assigns the indexes of the array, from 0 to the number of
        result columns, to the values of the corresponding column,
        and returns that array.
        
        If ndx is a plain object, this function behaves even
        differentlier: it assigns the properties of the object to
        the values of their corresponding result columns and returns
        that object.
        
        Performance note: this class does not cache its column names
        because a reprepare may change them and we have(?) no(?) way of
        hooking into that to invalidate the cache. A side effect of
        that is that this function, when ndx is an object, has to copy
        those names from the WASM side on each call. When fetching many
        objects, DB.exec() can do so more efficiently by caching those
        names for the duration of the query. In large result sets the
        runtime difference is human-perceivable.
        
        Behavior change notice: prior to 3.54, the asType argument was
        ignored when ndx is an array or object, the justification being
        that we're generally fetching rows of mixed data types. As of
        3.54, it still behaves that way when passed the undefined value
        resp. is not passed a value, but will coerce each column to the
        request type of it is not the undefined value. It is not
        believed that this change adversely affects any existing
        client-level code because this argument was ignored and
        applications passing a non-undefined value were not necessarily
        getting back what they had specified (or did so only because
        all of the data was of that type, in which case the new
        behavior is identical for those queries).
        
        Potential TODO: add type ID SQLITE_JSON, which fetches the
        result as a string and passes it (if it's not null) to
        JSON.parse(), returning the result of that. Until then,
        getJSON() can be used for that.
        */
        get: function(ndx, asType) {
          if (!__stmtMayGet.has(affirmStmtOpen(this))) toss3("Stmt.step() has not (recently) returned true.");
          if (Array.isArray(ndx)) {
            let i2 = 0;
            const n = this.columnCount;
            while (i2 < n) {
              ndx[i2] = __stmtGetColumn(this, i2, asType);
              ++i2;
            }
            return ndx;
          } else if (ndx && "object" === typeof ndx) {
            let i2 = 0;
            const n = this.columnCount;
            while (i2 < n) {
              ndx[capi.sqlite3_column_name(this.pointer, i2)] = __stmtGetColumn(this, i2, asType);
              ++i2;
            }
            return ndx;
          }
          affirmColIndex(this, ndx);
          return __stmtGetColumn(this, ndx, asType);
        },
        /** Equivalent to get(ndx) but coerces the result to an
        integer. */
        getInt: function(ndx) {
          return this.get(ndx, capi.SQLITE_INTEGER);
        },
        /** Equivalent to get(ndx) but coerces the result to a
        float. */
        getFloat: function(ndx) {
          return this.get(ndx, capi.SQLITE_FLOAT);
        },
        /** Equivalent to get(ndx) but coerces the result to a
        string. */
        getString: function(ndx) {
          return this.get(ndx, capi.SQLITE_TEXT);
        },
        /** Equivalent to get(ndx) but coerces the result to a
        Uint8Array. */
        getBlob: function(ndx) {
          return this.get(ndx, capi.SQLITE_BLOB);
        },
        /**
        A convenience wrapper around get() which fetches the value
        as a string and then, if it is not null, passes it to
        JSON.parse(), returning that result. Throws if parsing
        fails. If the result is null, null is returned. An empty
        string, on the other hand, will trigger an exception.
        */
        getJSON: function(ndx) {
          const s = this.get(ndx, capi.SQLITE_STRING);
          return null === s ? s : JSON.parse(s);
        },
        /**
        Returns the result column name of the given index, or
        throws if index is out of bounds or this statement has been
        finalized. This can be used without having run step()
        first.
        */
        getColumnName: function(ndx) {
          return capi.sqlite3_column_name(affirmColIndex(affirmStmtOpen(this), ndx).pointer, ndx);
        },
        /**
        If this statement potentially has result columns, this function
        returns an array of all such names. If passed an array, it is
        used as the target and all names are appended to it. Returns
        the target array. Throws if this statement cannot have result
        columns. This object's columnCount property holds the number of
        columns.
        */
        getColumnNames: function(tgt = []) {
          affirmColIndex(affirmStmtOpen(this), 0);
          const n = this.columnCount;
          for (let i2 = 0; i2 < n; ++i2) tgt.push(capi.sqlite3_column_name(this.pointer, i2));
          return tgt;
        },
        /**
        If this statement has named bindable parameters and the
        given name matches one, its 1-based bind index is
        returned. If no match is found, 0 is returned. If it has no
        bindable parameters, the undefined value is returned.
        */
        getParamIndex: function(name) {
          return affirmStmtOpen(this).parameterCount ? capi.sqlite3_bind_parameter_index(this.pointer, name) : void 0;
        },
        /**
        If this statement has named bindable parameters and the given
        index refers to one, its name is returned, else null is
        returned. If this statement has no bound parameters, undefined
        is returned.
        
        Added in 3.47.
        */
        getParamName: function(ndx) {
          return affirmStmtOpen(this).parameterCount ? capi.sqlite3_bind_parameter_name(this.pointer, ndx) : void 0;
        },
        /**
        Behaves like sqlite3_stmt_busy() but throws if this statement
        is closed and returns a value of type boolean instead of integer.
        
        Added in 3.47.
        */
        isBusy: function() {
          return 0 !== capi.sqlite3_stmt_busy(affirmStmtOpen(this));
        },
        /**
        Behaves like sqlite3_stmt_readonly() but throws if this statement
        is closed and returns a value of type boolean instead of integer.
        
        Added in 3.47.
        */
        isReadOnly: function() {
          return 0 !== capi.sqlite3_stmt_readonly(affirmStmtOpen(this));
        }
      };
      {
        const prop = {
          enumerable: true,
          get: function() {
            return __ptrMap.get(this);
          },
          set: () => toss3("The pointer property is read-only.")
        };
        Object.defineProperty(Stmt.prototype, "pointer", prop);
        Object.defineProperty(DB.prototype, "pointer", prop);
      }
      Object.defineProperty(Stmt.prototype, "columnCount", {
        enumerable: false,
        get: function() {
          return capi.sqlite3_column_count(this.pointer);
        },
        set: () => toss3("The columnCount property is read-only.")
      });
      Object.defineProperty(Stmt.prototype, "parameterCount", {
        enumerable: false,
        get: function() {
          return capi.sqlite3_bind_parameter_count(this.pointer);
        },
        set: () => toss3("The parameterCount property is read-only.")
      });
      Stmt.wrapHandle = function(oo1db, pStmt, takeOwnership = false) {
        if (!(oo1db instanceof DB) || !oo1db.pointer) throw new sqlite3.SQLite3Error(sqlite3.SQLITE_MISUSE, "First argument must be an opened sqlite3.oo1.DB instance");
        if (!pStmt || !wasm.isPtr(pStmt)) throw new sqlite3.SQLite3Error(sqlite3.SQLITE_MISUSE, "Second argument must be a WASM sqlite3_stmt pointer");
        return new Stmt(oo1db, pStmt, BindTypes, !!takeOwnership);
      };
      sqlite3.oo1 = {
        DB,
        Stmt
      };
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      const util = sqlite3.util;
      sqlite3.initWorker1API = function() {
        "use strict";
        const toss = (...args) => {
          throw new Error(args.join(" "));
        };
        if (!(globalThis.WorkerGlobalScope instanceof Function)) toss("initWorker1API() must be run from a Worker thread.");
        const sqlite32 = this.sqlite3 || toss("Missing this.sqlite3 object.");
        const DB = sqlite32.oo1.DB;
        const getDbId = function(db2) {
          let id = wState.idMap.get(db2);
          if (id) return id;
          id = "db#" + ++wState.idSeq + ":" + Math.floor(Math.random() * 1e8) + ":" + Math.floor(Math.random() * 1e8);
          wState.idMap.set(db2, id);
          return id;
        };
        const wState = {
          /**
          Each opened DB is added to this.dbList, and the first entry in
          that list is the default db. As each db is closed, its entry is
          removed from the list.
          */
          dbList: [],
          /** Sequence number of dbId generation. */
          idSeq: 0,
          /** Map of DB instances to dbId. */
          idMap: /* @__PURE__ */ new WeakMap(),
          /** Temp holder for "transferable" postMessage() state. */
          xfer: [],
          open: function(opt) {
            const db2 = new DB(opt);
            this.dbs[getDbId(db2)] = db2;
            if (this.dbList.indexOf(db2) < 0) this.dbList.push(db2);
            return db2;
          },
          close: function(db2, alsoUnlink) {
            if (db2) {
              delete this.dbs[getDbId(db2)];
              const filename = db2.filename;
              const pVfs = util.sqlite3__wasm_db_vfs(db2.pointer, 0);
              db2.close();
              const ddNdx = this.dbList.indexOf(db2);
              if (ddNdx >= 0) this.dbList.splice(ddNdx, 1);
              if (alsoUnlink && filename && pVfs) util.sqlite3__wasm_vfs_unlink(pVfs, filename);
            }
          },
          /**
          Posts the given worker message value. If xferList is provided,
          it must be an array, in which case a copy of it passed as
          postMessage()'s second argument and xferList.length is set to
          0.
          */
          post: function(msg, xferList) {
            if (xferList && xferList.length) {
              globalThis.postMessage(msg, Array.from(xferList));
              xferList.length = 0;
            } else globalThis.postMessage(msg);
          },
          /** Map of DB IDs to DBs. */
          dbs: /* @__PURE__ */ Object.create(null),
          /** Fetch the DB for the given id. Throw if require=true and the
          id is not valid, else return the db or undefined. */
          getDb: function(id, require2 = true) {
            return this.dbs[id] || (require2 ? toss("Unknown (or closed) DB ID:", id) : void 0);
          }
        };
        const affirmDbOpen = function(db2 = wState.dbList[0]) {
          return db2 && db2.pointer ? db2 : toss("DB is not opened.");
        };
        const getMsgDb = function(msgData, affirmExists = true) {
          const db2 = wState.getDb(msgData.dbId, false) || wState.dbList[0];
          return affirmExists ? affirmDbOpen(db2) : db2;
        };
        const getDefaultDbId = function() {
          return wState.dbList[0] && getDbId(wState.dbList[0]);
        };
        const wMsgHandler = {
          open: function(ev) {
            const oargs = /* @__PURE__ */ Object.create(null), args = ev.args || /* @__PURE__ */ Object.create(null);
            if (args.simulateError) toss("Throwing because of simulateError flag.");
            const rc = /* @__PURE__ */ Object.create(null);
            oargs.vfs = args.vfs;
            oargs.filename = args.filename || "";
            const db2 = wState.open(oargs);
            rc.filename = db2.filename;
            rc.persistent = !!sqlite32.capi.sqlite3_js_db_uses_vfs(db2.pointer, "opfs");
            rc.dbId = getDbId(db2);
            rc.vfs = db2.dbVfsName();
            return rc;
          },
          close: function(ev) {
            const db2 = getMsgDb(ev, false);
            const response = { filename: db2 && db2.filename };
            if (db2) {
              const doUnlink = ev.args && "object" === typeof ev.args ? !!ev.args.unlink : false;
              wState.close(db2, doUnlink);
            }
            return response;
          },
          exec: function(ev) {
            const rc = "string" === typeof ev.args ? { sql: ev.args } : ev.args || /* @__PURE__ */ Object.create(null);
            if ("stmt" === rc.rowMode) toss("Invalid rowMode for 'exec': stmt mode", "does not work in the Worker API.");
            else if (!rc.sql) toss("'exec' requires input SQL.");
            const db2 = getMsgDb(ev);
            if (rc.callback || Array.isArray(rc.resultRows)) db2._blobXfer = wState.xfer;
            const theCallback = rc.callback;
            let rowNumber = 0;
            const hadColNames = !!rc.columnNames;
            if ("string" === typeof theCallback) {
              if (!hadColNames) rc.columnNames = [];
              rc.callback = function(row, stmt) {
                wState.post({
                  type: theCallback,
                  columnNames: rc.columnNames,
                  rowNumber: ++rowNumber,
                  row
                }, wState.xfer);
              };
            }
            try {
              const changeCount = !!rc.countChanges ? db2.changes(true, 64 === rc.countChanges) : void 0;
              db2.exec(rc);
              if (void 0 !== changeCount) rc.changeCount = db2.changes(true, 64 === rc.countChanges) - changeCount;
              const lastInsertRowId = !!rc.lastInsertRowId ? sqlite32.capi.sqlite3_last_insert_rowid(db2) : void 0;
              if (void 0 !== lastInsertRowId) rc.lastInsertRowId = lastInsertRowId;
              if (rc.callback instanceof Function) {
                rc.callback = theCallback;
                wState.post({
                  type: theCallback,
                  columnNames: rc.columnNames,
                  rowNumber: null,
                  row: void 0
                });
              }
            } finally {
              delete db2._blobXfer;
              if (rc.callback) rc.callback = theCallback;
            }
            return rc;
          },
          "config-get": function() {
            const rc = /* @__PURE__ */ Object.create(null), src = sqlite32.config;
            ["bigIntEnabled"].forEach(function(k2) {
              if (Object.getOwnPropertyDescriptor(src, k2)) rc[k2] = src[k2];
            });
            rc.version = sqlite32.version;
            rc.vfsList = sqlite32.capi.sqlite3_js_vfs_list();
            return rc;
          },
          /**
          Exports the database to a byte array, as per
          sqlite3_serialize(). Response is an object:
          
          {
          byteArray:  Uint8Array (db file contents),
          filename: the current db filename,
          mimetype: 'application/x-sqlite3'
          }
          */
          export: function(ev) {
            const db2 = getMsgDb(ev);
            const response = {
              byteArray: sqlite32.capi.sqlite3_js_db_export(db2.pointer),
              filename: db2.filename,
              mimetype: "application/x-sqlite3"
            };
            wState.xfer.push(response.byteArray.buffer);
            return response;
          },
          toss: function(ev) {
            toss("Testing worker exception");
          }
        };
        globalThis.onmessage = async function(ev) {
          ev = ev.data;
          let result, dbId = ev.dbId, evType = ev.type;
          const arrivalTime = performance.now();
          try {
            if (wMsgHandler.hasOwnProperty(evType) && wMsgHandler[evType] instanceof Function) result = await wMsgHandler[evType](ev);
            else toss("Unknown db worker message type:", ev.type);
          } catch (err3) {
            evType = "error";
            result = {
              operation: ev.type,
              message: err3.message,
              errorClass: err3.name,
              input: ev
            };
            if (err3.stack) result.stack = "string" === typeof err3.stack ? err3.stack.split(/\n\s*/) : err3.stack;
          }
          if (!dbId) dbId = result.dbId || getDefaultDbId();
          wState.post({
            type: evType,
            dbId,
            messageId: ev.messageId,
            workerReceivedTime: arrivalTime,
            workerRespondTime: performance.now(),
            departureTime: ev.departureTime,
            result
          }, wState.xfer);
        };
        globalThis.postMessage({
          type: "sqlite3-api",
          result: "worker1-ready"
        });
      }.bind({ sqlite3 });
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      const wasm = sqlite3.wasm, capi = sqlite3.capi, toss = sqlite3.util.toss3;
      const vfs = /* @__PURE__ */ Object.create(null);
      sqlite3.vfs = vfs;
      capi.sqlite3_vfs.prototype.registerVfs = function(asDefault = false) {
        if (!(this instanceof sqlite3.capi.sqlite3_vfs)) toss("Expecting a sqlite3_vfs-type argument.");
        const rc = capi.sqlite3_vfs_register(this, asDefault ? 1 : 0);
        if (rc) toss("sqlite3_vfs_register(", this, ") failed with rc", rc);
        if (this.pointer !== capi.sqlite3_vfs_find(this.$zName)) toss("BUG: sqlite3_vfs_find(vfs.$zName) failed for just-installed VFS", this);
        return this;
      };
      vfs.installVfs = function(opt) {
        let count = 0;
        const propList = ["io", "vfs"];
        for (const key of propList) {
          const o = opt[key];
          if (o) {
            ++count;
            o.struct.installMethods(o.methods, !!o.applyArgcCheck);
            if ("vfs" === key) {
              if (!o.struct.$zName && "string" === typeof o.name) o.struct.addOnDispose(o.struct.$zName = wasm.allocCString(o.name));
              o.struct.registerVfs(!!o.asDefault);
            }
          }
        }
        if (!count) toss("Misuse: installVfs() options object requires at least", "one of:", propList);
        return this;
      };
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      if (!sqlite3.wasm.exports.sqlite3_declare_vtab) return;
      const wasm = sqlite3.wasm, capi = sqlite3.capi, toss = sqlite3.util.toss3;
      const vtab = /* @__PURE__ */ Object.create(null);
      sqlite3.vtab = vtab;
      const sii = capi.sqlite3_index_info;
      sii.prototype.nthConstraint = function(n, asPtr = false) {
        if (n < 0 || n >= this.$nConstraint) return false;
        const ptr = wasm.ptr.add(this.$aConstraint, sii.sqlite3_index_constraint.structInfo.sizeof * n);
        return asPtr ? ptr : new sii.sqlite3_index_constraint(ptr);
      };
      sii.prototype.nthConstraintUsage = function(n, asPtr = false) {
        if (n < 0 || n >= this.$nConstraint) return false;
        const ptr = wasm.ptr.add(this.$aConstraintUsage, sii.sqlite3_index_constraint_usage.structInfo.sizeof * n);
        return asPtr ? ptr : new sii.sqlite3_index_constraint_usage(ptr);
      };
      sii.prototype.nthOrderBy = function(n, asPtr = false) {
        if (n < 0 || n >= this.$nOrderBy) return false;
        const ptr = wasm.ptr.add(this.$aOrderBy, sii.sqlite3_index_orderby.structInfo.sizeof * n);
        return asPtr ? ptr : new sii.sqlite3_index_orderby(ptr);
      };
      const __xWrapFactory = function(methodName, StructType) {
        return function(ptr, removeMapping = false) {
          if (0 === arguments.length) ptr = new StructType();
          if (ptr instanceof StructType) {
            this.set(ptr.pointer, ptr);
            return ptr;
          } else if (!wasm.isPtr(ptr)) sqlite3.SQLite3Error.toss("Invalid argument to", methodName + "()");
          let rc = this.get(ptr);
          if (removeMapping) this.delete(ptr);
          return rc;
        }.bind(/* @__PURE__ */ new Map());
      };
      const StructPtrMapper = function(name, StructType) {
        const __xWrap = __xWrapFactory(name, StructType);
        return Object.assign(/* @__PURE__ */ Object.create(null), {
          /** The StructType object for this object's API. */
          StructType,
          /**
          Creates a new StructType object, writes its `pointer`
          value to the given output pointer, and returns that
          object. Its intended usage depends on StructType:
          
          sqlite3_vtab: to be called from sqlite3_module::xConnect()
          or xCreate() implementations.
          
          sqlite3_vtab_cursor: to be called from xOpen().
          
          This will throw if allocation of the StructType instance
          fails or if ppOut is not a pointer-type value.
          */
          create: (ppOut) => {
            const rc = __xWrap();
            wasm.pokePtr(ppOut, rc.pointer);
            return rc;
          },
          /**
          Returns the StructType object previously mapped to the
          given pointer using create(). Its intended usage depends
          on StructType:
          
          sqlite3_vtab: to be called from sqlite3_module methods which
          take a (sqlite3_vtab*) pointer _except_ for
          xDestroy()/xDisconnect(), which should use unget() or dispose().
          
          sqlite3_vtab_cursor: to be called from any sqlite3_module methods
          which take a `sqlite3_vtab_cursor*` argument except xClose(),
          which should use unget() or dispose().
          
          Rule to remember: _never_ call dispose() on an instance
          returned by this function.
          */
          get: (pCObj) => __xWrap(pCObj),
          /**
          Identical to get() but also disconnects the mapping between the
          given pointer and the returned StructType object, such that
          future calls to this function or get() with the same pointer
          will return the undefined value. Its intended usage depends
          on StructType:
          
          sqlite3_vtab: to be called from sqlite3_module::xDisconnect() or
          xDestroy() implementations or in error handling of a failed
          xCreate() or xConnect().
          
          sqlite3_vtab_cursor: to be called from xClose() or during
          cleanup in a failed xOpen().
          
          Calling this method obligates the caller to call dispose() on
          the returned object when they're done with it.
          */
          unget: (pCObj) => __xWrap(pCObj, true),
          /**
          Works like unget() plus it calls dispose() on the
          StructType object.
          */
          dispose: (pCObj) => __xWrap(pCObj, true)?.dispose?.()
        });
      };
      vtab.xVtab = StructPtrMapper("xVtab", capi.sqlite3_vtab);
      vtab.xCursor = StructPtrMapper("xCursor", capi.sqlite3_vtab_cursor);
      vtab.xIndexInfo = (pIdxInfo) => new capi.sqlite3_index_info(pIdxInfo);
      vtab.xError = function f(methodName, err3, defaultRc) {
        if (f.errorReporter instanceof Function) try {
          f.errorReporter("sqlite3_module::" + methodName + "(): " + err3.message);
        } catch (e) {
        }
        let rc;
        if (err3 instanceof sqlite3.WasmAllocError) rc = capi.SQLITE_NOMEM;
        else if (arguments.length > 2) rc = defaultRc;
        else if (err3 instanceof sqlite3.SQLite3Error) rc = err3.resultCode;
        return rc || capi.SQLITE_ERROR;
      };
      vtab.xError.errorReporter = sqlite3.config.error.bind(sqlite3.config);
      vtab.xRowid = (ppRowid64, value) => wasm.poke(ppRowid64, value, "i64");
      vtab.setupModule = function(opt) {
        let createdMod = false;
        const mod = this instanceof capi.sqlite3_module ? this : opt.struct || (createdMod = new capi.sqlite3_module());
        try {
          const methods = opt.methods || toss("Missing 'methods' object.");
          for (const e of Object.entries({
            xConnect: "xCreate",
            xDisconnect: "xDestroy"
          })) {
            const k2 = e[0], v2 = e[1];
            if (true === methods[k2]) methods[k2] = methods[v2];
            else if (true === methods[v2]) methods[v2] = methods[k2];
          }
          if (opt.catchExceptions) {
            const fwrap = function(methodName, func) {
              if (["xConnect", "xCreate"].indexOf(methodName) >= 0) return function(pDb2, pAux, argc, argv, ppVtab, pzErr) {
                try {
                  return func(...arguments) || 0;
                } catch (e) {
                  if (!(e instanceof sqlite3.WasmAllocError)) {
                    wasm.dealloc(wasm.peekPtr(pzErr));
                    wasm.pokePtr(pzErr, wasm.allocCString(e.message));
                  }
                  return vtab.xError(methodName, e);
                }
              };
              else return function(...args) {
                try {
                  return func(...args) || 0;
                } catch (e) {
                  return vtab.xError(methodName, e);
                }
              };
            };
            const mnames = [
              "xCreate",
              "xConnect",
              "xBestIndex",
              "xDisconnect",
              "xDestroy",
              "xOpen",
              "xClose",
              "xFilter",
              "xNext",
              "xEof",
              "xColumn",
              "xRowid",
              "xUpdate",
              "xBegin",
              "xSync",
              "xCommit",
              "xRollback",
              "xFindFunction",
              "xRename",
              "xSavepoint",
              "xRelease",
              "xRollbackTo",
              "xShadowName"
            ];
            const remethods = /* @__PURE__ */ Object.create(null);
            for (const k2 of mnames) {
              const m = methods[k2];
              if (!(m instanceof Function)) continue;
              else if ("xConnect" === k2 && methods.xCreate === m) remethods[k2] = methods.xCreate;
              else if ("xCreate" === k2 && methods.xConnect === m) remethods[k2] = methods.xConnect;
              else remethods[k2] = fwrap(k2, m);
            }
            mod.installMethods(remethods, false);
          } else mod.installMethods(methods, !!opt.applyArgcCheck);
          if (0 === mod.$iVersion) {
            let v2;
            if ("number" === typeof opt.iVersion) v2 = opt.iVersion;
            else if (mod.$xIntegrity) v2 = 4;
            else if (mod.$xShadowName) v2 = 3;
            else if (mod.$xSavePoint || mod.$xRelease || mod.$xRollbackTo) v2 = 2;
            else v2 = 1;
            mod.$iVersion = v2;
          }
        } catch (e) {
          if (createdMod) createdMod.dispose();
          throw e;
        }
        return mod;
      };
      capi.sqlite3_module.prototype.setupModule = function(opt) {
        return vtab.setupModule.call(this, opt);
      };
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      if (sqlite3.config.disable?.vfs?.kvvfs) return;
      const capi = sqlite3.capi, sqlite3_kvvfs_methods = capi.sqlite3_kvvfs_methods, KVVfsFile = capi.KVVfsFile, pKvvfs = sqlite3.capi.sqlite3_vfs_find("kvvfs");
      delete capi.sqlite3_kvvfs_methods;
      delete capi.KVVfsFile;
      if (!pKvvfs) return;
      const util = sqlite3.util, wasm = sqlite3.wasm, toss3 = util.toss3;
      const kvvfsMethods = new sqlite3_kvvfs_methods(wasm.exports.sqlite3__wasm_kvvfs_methods());
      util.assert(32 <= kvvfsMethods.$nKeySize, "unexpected kvvfsMethods.$nKeySize: " + kvvfsMethods.$nKeySize);
      const cache = Object.assign(/* @__PURE__ */ Object.create(null), {
        /** Regex matching journal file names. */
        rxJournalSuffix: /-journal$/,
        /** Frequently-used C-string. */
        zKeyJrnl: wasm.allocCString("jrnl"),
        /** Frequently-used C-string. */
        zKeySz: wasm.allocCString("sz"),
        /**
        The maximum size of a kvvfs record key. It is historically only
        32, a limitation currently retained only because it's convenient to
        do so (the underlying code has outgrown the need for the artifically
        low limit).
        
        We cache this value here because the end of this init code will
        dispose of kvvfsMethods, invalidating it.
        */
        keySize: kvvfsMethods.$nKeySize,
        /**
        WASM heap memory buffers to optimize out some frequent
        allocations.
        */
        buffer: Object.assign(/* @__PURE__ */ Object.create(null), {
          /**
          The size of each buffer in this.pool.
          
          kvvfsMethods.$nBufferSize is slightly larger than the output
          space needed for a kvvfs-encoded 64kb db page in a worse-cast
          encoding (128kb). It is not suitable for arbitrary buffer
          use, only page de/encoding.
          */
          n: kvvfsMethods.$nBufferSize,
          /**
          Map of buffer ids to wasm.alloc()'d pointers of size
          this.n. (Re)used by various internals.
          
          Buffer ids 0 and 1 are used in the API internals.  Other
          names are used in higher-level APIs.
          
          See memBuffer() and memBufferFree().
          */
          pool: /* @__PURE__ */ Object.create(null)
        })
      });
      cache.memBuffer = (id = 0) => cache.buffer.pool[id] ??= wasm.alloc(cache.buffer.n);
      cache.memBufferFree = (id) => {
        const b = cache.buffer.pool[id];
        if (b) {
          wasm.dealloc(b);
          delete cache.buffer.pool[id];
        }
      };
      const noop = () => {
      };
      const debug = sqlite3.__isUnderTest ? (...args) => sqlite3.config.debug?.("kvvfs:", ...args) : noop;
      const warn = (...args) => sqlite3.config.warn?.("kvvfs:", ...args);
      const error = (...args) => sqlite3.config.error?.("kvvfs:", ...args);
      class KVVfsStorage {
        #map = /* @__PURE__ */ Object.create(null);
        #keys = null;
        #size = 0;
        constructor() {
          this.clear();
        }
        #getKeys() {
          return this.#keys ??= Object.keys(this.#map);
        }
        key(n) {
          if (n < 0 || n >= this.#size) return null;
          return this.#getKeys()[n];
        }
        getItem(k2) {
          return this.#map[k2] ?? null;
        }
        setItem(k2, v2) {
          if (!(k2 in this.#map)) {
            ++this.#size;
            this.#keys = null;
          }
          this.#map[k2] = "" + v2;
        }
        removeItem(k2) {
          if (k2 in this.#map) {
            delete this.#map[k2];
            --this.#size;
            this.#keys = null;
          }
        }
        clear() {
          this.#map = /* @__PURE__ */ Object.create(null);
          this.#keys = null;
          this.#size = 0;
        }
        get length() {
          return this.#size;
        }
      }
      const kvvfsIsPersistentName = (v2) => "local" === v2 || "session" === v2;
      const kvvfsKeyPrefix = (v2) => kvvfsIsPersistentName(v2) ? "kvvfs-" + v2 + "-" : "";
      const validateStorageName = function(n, mayBeJournal = false) {
        if (kvvfsIsPersistentName(n)) return;
        const len = new Blob([n]).size;
        if (!len) toss3(capi.SQLITE_MISUSE, "Empty name is not permitted.");
        let maxLen = cache.keySize - 1;
        if (cache.rxJournalSuffix.test(n)) {
          if (!mayBeJournal) toss3(capi.SQLITE_MISUSE, "Storage names may not have a '-journal' suffix.");
        } else if (["-wal", "-shm"].filter((v2) => n.endsWith(v2)).length) toss3(capi.SQLITE_MISUSE, "Storage names may not have a -wal or -shm suffix.");
        else maxLen -= 8;
        if (len > maxLen) toss3(capi.SQLITE_RANGE, "Storage name is too long. Limit =", maxLen);
        let i2 = 0;
        for (; i2 < len; ++i2) {
          const ch = n.codePointAt(i2);
          if (ch < 32) toss3(capi.SQLITE_RANGE, "Illegal character (" + ch + "d) in storage name:", n);
        }
      };
      const newStorageObj = (name, storage = void 0) => Object.assign(/* @__PURE__ */ Object.create(null), {
        /**
        JS string value of this KVVfsFile::$zClass. i.e. the storage's
        name.
        */
        jzClass: name,
        /**
        Refcount. This keeps dbs and journals pointing to the same
        storage for the life of both and enables kvvfs to behave more
        like a conventional filesystem (a stepping stone towards
        downstream API goals). Managed by xOpen() and xClose().
        */
        refc: 1,
        /**
        If true, this storage will be removed by xClose() or
        sqlite3_js_kvvfs_unlink() when refc reaches 0. The others will
        persist when refc==0, to give the illusion of real back-end
        storage. Managed by xOpen() and sqlite3_js_kvvfs_reserve(). By
        default this is false but the delete-on-close=1 flag can be
        used to set this to true.
        */
        deleteAtRefc0: false,
        /**
        The backing store. Must implement the Storage interface.
        */
        storage: storage || new KVVfsStorage(),
        /**
        The storage prefix used for kvvfs keys.  It is
        "kvvfs-STORAGENAME-" for local/session storage and an empty
        string for other storage. local/session storage must use the
        long form (A) for backwards compatibility and (B) so that kvvfs
        can coexist with non-db client data in those backends.  Neither
        (A) nor (B) are concerns for KVVfsStorage objects.
        
        This prefix mirrors the one generated by os_kv.c's
        kvrecordMakeKey() and must stay in sync with that one.
        */
        keyPrefix: kvvfsKeyPrefix(name),
        /**
        KVVfsFile instances currently using this storage. Managed by
        xOpen() and xClose().
        */
        files: [],
        /**
        If set, it's an array of objects with various event
        callbacks. See sqlite3_js_kvvfs_listen(). When there are no
        listeners, this member is set to undefined (instead of an empty
        array) to allow us to more easily optimize out calls to
        notifyListeners() for the common case of no listeners.
        */
        listeners: void 0
      });
      const kvvfs = sqlite3.kvvfs = /* @__PURE__ */ Object.create(null);
      if (sqlite3.__isUnderTest) kvvfs.log = Object.assign(/* @__PURE__ */ Object.create(null), {
        xOpen: false,
        xClose: false,
        xWrite: false,
        xRead: false,
        xSync: false,
        xAccess: false,
        xFileControl: false,
        xRcrdRead: false,
        xRcrdWrite: false,
        xRcrdDelete: false
      });
      const deleteStorage = function(store) {
        const other = cache.rxJournalSuffix.test(store.jzClass) ? store.jzClass.replace(cache.rxJournalSuffix, "") : store.jzClass + "-journal";
        kvvfs?.log?.xClose && debug("cleaning up storage handles [", store.jzClass, other, "]", store);
        delete cache.storagePool[store.jzClass];
        delete cache.storagePool[other];
        if (!sqlite3.__isUnderTest) {
          delete store.storage;
          delete store.refc;
        }
      };
      const installStorageAndJournal = (store) => cache.storagePool[store.jzClass] = cache.storagePool[store.jzClass + "-journal"] = store;
      const nameOfThisThreadStorage = ".";
      cache.storagePool = Object.assign(/* @__PURE__ */ Object.create(null), { [nameOfThisThreadStorage]: newStorageObj(nameOfThisThreadStorage) });
      if (globalThis.Storage) {
        if (globalThis.localStorage instanceof globalThis.Storage) cache.storagePool.local = newStorageObj("local", globalThis.localStorage);
        if (globalThis.sessionStorage instanceof globalThis.Storage) cache.storagePool.session = newStorageObj("session", globalThis.sessionStorage);
      }
      cache.builtinStorageNames = Object.keys(cache.storagePool);
      const isBuiltinName = (n) => cache.builtinStorageNames.indexOf(n) > -1;
      for (const k2 of Object.keys(cache.storagePool)) {
        const orig = cache.storagePool[k2];
        cache.storagePool[k2 + "-journal"] = orig;
      }
      cache.setError = (e = void 0, dfltErrCode = capi.SQLITE_ERROR) => {
        if (e) {
          cache.lastError = e;
          return e.resultCode | 0 || dfltErrCode;
        }
        delete cache.lastError;
        return 0;
      };
      cache.popError = () => {
        const e = cache.lastError;
        delete cache.lastError;
        return e;
      };
      const catchForNotify = (e) => {
        warn("kvvfs.listener handler threw:", e);
      };
      const kvvfsDecode = wasm.exports.sqlite3__wasm_kvvfs_decode;
      const kvvfsEncode = wasm.exports.sqlite3__wasm_kvvfs_encode;
      const notifyListeners = async function(eventName, store, ...args) {
        try {
          if (store.keyPrefix && args[0]) args[0] = args[0].replace(store.keyPrefix, "");
          let u8enc, z0, z1, wcache;
          for (const ear of store.listeners) {
            const ev = /* @__PURE__ */ Object.create(null);
            ev.storageName = store.jzClass;
            ev.type = eventName;
            ear.decodePages;
            const f = ear.events[eventName];
            if (f) {
              if (!ear.includeJournal && args[0] === "jrnl") continue;
              if ("write" === eventName && ear.decodePages && +args[0] > 0) {
                ev.data = [args[0]];
                if (wcache?.[args[0]]) {
                  ev.data[1] = wcache[args[0]];
                  continue;
                }
                u8enc ??= new TextEncoder("utf-8");
                z0 ??= cache.memBuffer(10);
                z1 ??= cache.memBuffer(11);
                const u = u8enc.encode(args[1]);
                const heap = wasm.heap8u();
                heap.set(u, Number(z0));
                heap[wasm.ptr.addn(z0, u.length)] = 0;
                const rc = kvvfsDecode(z0, z1, cache.buffer.n);
                if (rc > 0) {
                  wcache ??= /* @__PURE__ */ Object.create(null);
                  wcache[args[0]] = ev.data[1] = heap.slice(Number(z1), wasm.ptr.addn(z1, rc));
                } else continue;
              } else ev.data = args.length ? args.length === 1 ? args[0] : args : void 0;
              try {
                f(ev)?.catch?.(catchForNotify);
              } catch (e) {
                warn("notifyListeners [", store.jzClass, "]", eventName, e);
              }
            }
          }
        } catch (e) {
          catchForNotify(e);
        }
      };
      const storageForZClass = (zClass) => "string" === typeof zClass ? cache.storagePool[zClass] : cache.storagePool[wasm.cstrToJs(zClass)];
      const kvvfsMakeKey = wasm.exports.sqlite3__wasm_kvvfsMakeKey;
      const zKeyForStorage = (store, zClass, zKey) => {
        return zClass && store.keyPrefix ? kvvfsMakeKey(zClass, zKey) : zKey;
      };
      const jsKeyForStorage = (store, zClass, zKey) => wasm.cstrToJs(zKeyForStorage(store, zClass, zKey));
      const storageGetDbSize = (store) => +store.storage.getItem(store.keyPrefix + "sz");
      const pFileHandles = /* @__PURE__ */ new Map();
      const mapPathToLocks = /* @__PURE__ */ new Map();
      const unlockFile = function(fh, lockType) {
        if (fh.lockType <= lockType) return;
        const lk = mapPathToLocks.get(fh.jzClass);
        if (fh.lockType > capi.SQLITE_LOCK_SHARED) lk.lockType = capi.SQLITE_LOCK_SHARED;
        if (lockType === capi.SQLITE_LOCK_NONE && 0 === --lk.nShared) mapPathToLocks.delete(fh.jzClass);
        fh.lockType = lockType;
      };
      const originalMethods = {
        vfs: /* @__PURE__ */ Object.create(null),
        ioDb: /* @__PURE__ */ Object.create(null),
        ioJrnl: /* @__PURE__ */ Object.create(null)
      };
      const pVfs = new capi.sqlite3_vfs(kvvfsMethods.$pVfs);
      const pIoDb = new capi.sqlite3_io_methods(kvvfsMethods.$pIoDb);
      const pIoJrnl = new capi.sqlite3_io_methods(kvvfsMethods.$pIoJrnl);
      const recordHandler = /* @__PURE__ */ Object.create(null);
      const kvvfsInternal = Object.assign(/* @__PURE__ */ Object.create(null), {
        pFileHandles,
        cache,
        storageForZClass,
        KVVfsStorage,
        /**
        BUG: changing to a page size other than the default,
        then vacuuming, corrupts the db. As a workaround,
        until this is resolved, we forcibly disable
        (pragma page_size=...) changes.
        */
        disablePageSizeChange: true
      });
      if (kvvfs.log) kvvfs.internal = kvvfsInternal;
      const methodOverrides = {
        /**
        sqlite3_kvvfs_methods's member methods.  These perform the
        fetching, setting, and removal of storage keys on behalf of
        kvvfs. In the native impl these write each db page to a
        separate file. This impl stores each db page as a single
        record in a Storage object which is mapped to zClass.
        
        A db's size is stored in a record named kvvfs[-storagename]-sz
        and the journal is stored in kvvfs[-storagename]-jrnl. The
        [-storagename] part is a remnant of the native impl (so that
        it has unique filenames per db) and is only used for
        localStorage and sessionStorage. We elide that part (to save
        space) from other storage objects but retain it on those two
        to avoid invalidating pre-version-2 session/localStorage dbs.
        
        The interface docs for these methods are in src/os_kv.c's
        kvrecordRead(), kvrecordWrite(), and kvrecordDelete().
        */
        recordHandler: {
          xRcrdRead: (zClass, zKey, zBuf, nBuf) => {
            try {
              const jzClass = wasm.cstrToJs(zClass);
              const store = storageForZClass(jzClass);
              if (!store) return -1;
              const jXKey = jsKeyForStorage(store, zClass, zKey);
              kvvfs?.log?.xRcrdRead && warn("xRcrdRead", jzClass, jXKey, nBuf, store);
              const jV = store.storage.getItem(jXKey);
              if (null === jV) return -1;
              const nV = jV.length;
              if (nBuf <= 0) return nV;
              else if (1 === nBuf) {
                wasm.poke(zBuf, 0);
                return nV;
              } else if (nBuf < nV) toss3(capi.SQLITE_RANGE, "xRcrdRead()", jzClass, jXKey, "input buffer is too small: need", nV, "but have", nBuf);
              else if (nBuf > nV + 1) nBuf = nV + 1;
              const nCopy = nV < nBuf ? nV : nBuf - 1;
              const heap = wasm.heap8();
              for (let i2 = 0; i2 < nCopy; ++i2) heap[wasm.ptr.add(zBuf, i2)] = jV.codePointAt(i2) & 255;
              heap[wasm.ptr.add(zBuf, nCopy)] = 0;
              return nCopy;
            } catch (e) {
              error("kvrecordRead()", e);
              cache.setError(e);
              return -2;
            }
          },
          xRcrdWrite: (zClass, zKey, zData) => {
            try {
              const store = storageForZClass(zClass);
              const jxKey = jsKeyForStorage(store, zClass, zKey);
              const jData = wasm.cstrToJs(zData);
              kvvfs?.log?.xRcrdWrite && warn("xRcrdWrite", jxKey, store);
              store.storage.setItem(jxKey, jData);
              store.listeners && notifyListeners("write", store, jxKey, jData);
              return 0;
            } catch (e) {
              error("kvrecordWrite()", e);
              return cache.setError(e, capi.SQLITE_IOERR);
            }
          },
          xRcrdDelete: (zClass, zKey) => {
            try {
              const store = storageForZClass(zClass);
              const jxKey = jsKeyForStorage(store, zClass, zKey);
              kvvfs?.log?.xRcrdDelete && warn("xRcrdDelete", jxKey, store);
              store.storage.removeItem(jxKey);
              store.listeners && notifyListeners("delete", store, jxKey);
              return 0;
            } catch (e) {
              error("kvrecordDelete()", e);
              return cache.setError(e, capi.SQLITE_IOERR);
            }
          }
        },
        /**
        Override certain operations of the underlying sqlite3_vfs and
        the two sqlite3_io_methods instances so that we can tie
        Storage objects to db names.
        */
        vfs: {
          xOpen: function(pProtoVfs, zName, pProtoFile, flags, pOutFlags) {
            cache.popError();
            let zToFree;
            try {
              if (!zName) {
                zToFree = wasm.allocCString("" + pProtoFile + "." + (Math.random() * 1e5 | 0));
                zName = zToFree;
              }
              const jzClass = wasm.cstrToJs(zName);
              kvvfs?.log?.xOpen && debug("xOpen", jzClass, "flags =", flags);
              validateStorageName(jzClass, true);
              if (flags & (capi.SQLITE_OPEN_MAIN_DB | capi.SQLITE_OPEN_TEMP_DB | capi.SQLITE_OPEN_TRANSIENT_DB) && cache.rxJournalSuffix.test(jzClass)) toss3(capi.SQLITE_ERROR, "DB files may not have a '-journal' suffix.");
              let s = storageForZClass(jzClass);
              if (!s && !(flags & capi.SQLITE_OPEN_CREATE)) toss3(capi.SQLITE_ERROR, "Storage not found:", jzClass);
              const rc = originalMethods.vfs.xOpen(pProtoVfs, zName, pProtoFile, flags, pOutFlags);
              if (rc) return rc;
              let deleteAt0 = !!(capi.SQLITE_OPEN_DELETEONCLOSE & flags);
              if (wasm.isPtr(arguments[1])) {
                if (capi.sqlite3_uri_boolean(zName, "delete-on-close", 0)) deleteAt0 = true;
              }
              const f = new KVVfsFile(pProtoFile);
              util.assert(f.$zClass, "Missing f.$zClass");
              f.addOnDispose(zToFree);
              zToFree = void 0;
              if (s) {
                ++s.refc;
                s.files.push(f);
                wasm.poke32(pOutFlags, flags);
              } else {
                wasm.poke32(pOutFlags, flags | capi.SQLITE_OPEN_CREATE);
                util.assert(!f.$isJournal, "Opening a journal before its db? " + jzClass);
                const nm = jzClass.replace(cache.rxJournalSuffix, "");
                s = newStorageObj(nm);
                installStorageAndJournal(s);
                s.files.push(f);
                s.deleteAtRefc0 = deleteAt0;
                kvvfs?.log?.xOpen && debug("xOpen installed storage handle [", nm, nm + "-journal", "]", s);
              }
              pFileHandles.set(pProtoFile, Object.assign(/* @__PURE__ */ Object.create(null), {
                store: s,
                file: f,
                jzClass,
                lockType: 0
              }));
              s.listeners && notifyListeners("open", s, s.files.length);
              return 0;
            } catch (e) {
              warn("xOpen:", e);
              return cache.setError(e);
            } finally {
              zToFree && wasm.dealloc(zToFree);
            }
          },
          xDelete: function(pVfs2, zName, iSyncFlag) {
            cache.popError();
            try {
              const jzName = wasm.cstrToJs(zName);
              if (cache.rxJournalSuffix.test(jzName)) recordHandler.xRcrdDelete(zName, cache.zKeyJrnl);
              return 0;
            } catch (e) {
              warn("xDelete", e);
              return cache.setError(e);
            }
          },
          xAccess: function(pProtoVfs, zPath, flags, pResOut) {
            cache.popError();
            try {
              const s = storageForZClass(zPath);
              const jzPath = s?.jzClass || wasm.cstrToJs(zPath);
              if (kvvfs?.log?.xAccess) debug("xAccess", jzPath, "flags =", flags, "*pResOut =", wasm.peek32(pResOut), "store =", s);
              if (!s)
                try {
                  validateStorageName(jzPath);
                } catch (e) {
                  wasm.poke32(pResOut, 0);
                  return 0;
                }
              if (s) {
                const key = s.keyPrefix + (cache.rxJournalSuffix.test(jzPath) ? "jrnl" : "1");
                const res = s.storage.getItem(key) ? 0 : 1;
                wasm.poke32(pResOut, res);
              } else wasm.poke32(pResOut, 0);
              return 0;
            } catch (e) {
              error("xAccess", e);
              return cache.setError(e);
            }
          },
          xRandomness: function(pVfs2, nOut, pOut) {
            const heap = wasm.heap8u();
            let i2 = 0;
            const npOut = Number(pOut);
            for (; i2 < nOut; ++i2) heap[npOut + i2] = Math.random() * 255e3 & 255;
            return nOut;
          },
          xGetLastError: function(pVfs2, nOut, pOut) {
            const e = cache.popError();
            debug("xGetLastError", e);
            if (e) {
              const scope = wasm.scopedAllocPush();
              try {
                const [cMsg, n] = wasm.scopedAllocCString(e.message, true);
                wasm.cstrncpy(pOut, cMsg, nOut);
                if (n > nOut) wasm.poke8(wasm.ptr.add(pOut, nOut, -1), 0);
                debug("set xGetLastError", e.message);
                return e.resultCode | 0 || capi.SQLITE_IOERR;
              } catch (e2) {
                return capi.SQLITE_NOMEM;
              } finally {
                wasm.scopedAllocPop(scope);
              }
            }
            return 0;
          },
          /**
          This VFS's xSleep() must be a no-op. In this environment,
          only db handles within the same thread can ever come into
          contention, and that contention cannot be resolved if
          one of the handles sleeps in that same thread.
          See also: forum:3f0794c5d8
          */
          xSleep: (pVfs2, ms) => 0
        },
        /**
        kvvfs has separate sqlite3_api_methods impls for some of the
        methods depending on whether it's a db or journal file. Some
        of the methods use shared impls but others are specific to
        either db or journal files.
        */
        ioDb: {
          xClose: function(pFile) {
            cache.popError();
            try {
              const h = pFileHandles.get(pFile);
              kvvfs?.log?.xClose && debug("xClose", pFile, h);
              if (h) {
                pFileHandles.delete(pFile);
                unlockFile(h, capi.SQLITE_LOCK_NONE);
                const s = h.store;
                s.files = s.files.filter((v2) => v2 !== h.file);
                if (--s.refc <= 0 && s.deleteAtRefc0) deleteStorage(s);
                originalMethods.ioDb.xClose(pFile);
                h.file.dispose();
                s.listeners && notifyListeners("close", s, s.files.length);
              }
              return 0;
            } catch (e) {
              error("xClose", e);
              return cache.setError(e);
            }
          },
          xFileControl: function(pFile, opId, pArg) {
            cache.popError();
            try {
              const h = pFileHandles.get(pFile);
              util.assert(h, "Missing KVVfsFile handle");
              kvvfs?.log?.xFileControl && debug("xFileControl", h, "op =", opId);
              if (opId === capi.SQLITE_FCNTL_PRAGMA && kvvfsInternal.disablePageSizeChange) {
                const zName = wasm.peekPtr(wasm.ptr.add(pArg, wasm.ptr.size));
                if ("page_size" === wasm.cstrToJs(zName)) {
                  kvvfs?.log?.xFileControl && debug("xFileControl pragma", wasm.cstrToJs(zName));
                  const zVal = wasm.peekPtr(wasm.ptr.add(pArg, 2 * wasm.ptr.size));
                  if (zVal) {
                    kvvfs?.log?.xFileControl && warn("xFileControl pragma", h, "NOT setting page size to", wasm.cstrToJs(zVal));
                    h.file.$szPage = -1;
                    return 0;
                  } else if (h.file.$szPage > 0) {
                    kvvfs?.log?.xFileControl && warn("xFileControl", h, "getting page size", h.file.$szPage);
                    wasm.pokePtr(pArg, wasm.allocCString("" + h.file.$szPage));
                    return 0;
                  }
                }
              }
              const rc = originalMethods.ioDb.xFileControl(pFile, opId, pArg);
              if (0 == rc && capi.SQLITE_FCNTL_SYNC === opId) h.store.listeners && notifyListeners("sync", h.store, false);
              return rc;
            } catch (e) {
              error("xFileControl", e);
              return cache.setError(e);
            }
          },
          xSync: function(pFile, flags) {
            cache.popError();
            try {
              const h = pFileHandles.get(pFile);
              kvvfs?.log?.xSync && debug("xSync", h);
              util.assert(h, "Missing KVVfsFile handle");
              const rc = originalMethods.ioDb.xSync(pFile, flags);
              if (0 == rc && h.store.listeners) notifyListeners("sync", h.store, true);
              return rc;
            } catch (e) {
              error("xSync", e);
              return cache.setError(e);
            }
          },
          xLock: function(pFile, iLock) {
            cache.popError();
            try {
              const h = pFileHandles.get(pFile);
              if (capi.SQLITE_LOCK_NONE !== iLock) originalMethods.ioDb.xLock(pFile, iLock);
              if (h.lockType >= iLock) return 0;
              let lk = mapPathToLocks.get(h.jzClass);
              if (!lk) {
                lk = Object.assign(/* @__PURE__ */ Object.create(null), {
                  nShared: 0,
                  lockType: capi.SQLITE_LOCK_NONE
                });
                mapPathToLocks.set(h.jzClass, lk);
              }
              if (h.lockType !== lk.lockType && (lk.lockType >= capi.SQLITE_LOCK_PENDING || iLock > capi.SQLITE_LOCK_SHARED)) return capi.SQLITE_BUSY;
              if (iLock === capi.SQLITE_LOCK_SHARED) {
                ++lk.nShared;
                if (lk.lockType === capi.SQLITE_LOCK_NONE) lk.lockType = iLock;
              } else if (iLock === capi.SQLITE_LOCK_EXCLUSIVE && lk.nShared > 1) {
                if (h.lockType === capi.SQLITE_LOCK_RESERVED) h.lockType = lk.lockType = capi.SQLITE_LOCK_PENDING;
                return capi.SQLITE_BUSY;
              } else lk.lockType = iLock;
              h.lockType = iLock;
              return 0;
            } catch (e) {
              error("xLock", e);
              return cache.setError(e);
            }
          },
          xUnlock: function(pFile, iLock) {
            cache.popError();
            try {
              if (capi.SQLITE_LOCK_NONE === iLock) originalMethods.ioDb.xUnlock(pFile, iLock);
              const h = pFileHandles.get(pFile);
              unlockFile(h, iLock);
              return 0;
            } catch (e) {
              error("xUnlock", e);
              return cache.setError(e);
            }
          },
          xCheckReservedLock: function(pFile, pOut) {
            cache.popError();
            try {
              const h = pFileHandles.get(pFile);
              const lk = mapPathToLocks.get(h.jzClass);
              wasm.poke32(pOut, !!lk && lk.lockType > capi.SQLITE_LOCK_SHARED ? 1 : 0);
              return 0;
            } catch (e) {
              error("xCheckReservedLock", e);
              return cache.setError(e);
            }
          }
        },
        ioJrnl: {
          xClose: true,
          xLock: true,
          xUnlock: true,
          xCheckReservedLock: true
        }
      };
      try {
        util.assert(cache.buffer.n > 132096, "Heap buffer is not large enough");
        for (const e of Object.entries(methodOverrides.recordHandler)) {
          const k2 = e[0], f = e[1];
          recordHandler[k2] = f;
          kvvfsMethods[kvvfsMethods.memberKey(k2)] = wasm.installFunction(kvvfsMethods.memberSignature(k2), f);
        }
        for (const e of Object.entries(methodOverrides.vfs)) {
          const k2 = e[0], f = e[1], km = pVfs.memberKey(k2), member = pVfs.structInfo.members[k2] || util.toss("Missing pVfs.structInfo[", k2, "]");
          originalMethods.vfs[k2] = wasm.functionEntry(pVfs[km]);
          pVfs[km] = wasm.installFunction(member.signature, f);
        }
        for (const e of Object.entries(methodOverrides.ioDb)) {
          const k2 = e[0], f = e[1], km = pIoDb.memberKey(k2);
          originalMethods.ioDb[k2] = wasm.functionEntry(pIoDb[km]) || util.toss("Missing native pIoDb[", km, "]");
          pIoDb[km] = wasm.installFunction(pIoDb.memberSignature(k2), f);
        }
        for (const e of Object.entries(methodOverrides.ioJrnl)) {
          const k2 = e[0], f = e[1], km = pIoJrnl.memberKey(k2);
          originalMethods.ioJrnl[k2] = wasm.functionEntry(pIoJrnl[km]) || util.toss("Missing native pIoJrnl[", km, "]");
          if (true === f) pIoJrnl[km] = pIoDb[km] || util.toss("Missing copied pIoDb[", km, "]");
          else pIoJrnl[km] = wasm.installFunction(pIoJrnl.memberSignature(k2), f);
        }
      } finally {
        kvvfsMethods.dispose();
        pVfs.dispose();
        pIoDb.dispose();
        pIoJrnl.dispose();
      }
      const sqlite3_js_kvvfs_clear = function callee3(which) {
        if ("" === which) return callee3("local") + callee3("session");
        const store = storageForZClass(which);
        if (!store) return 0;
        if (store.files.length) {
          if (globalThis.localStorage === store.storage || globalThis.sessionStorage === store.storage) {
          } else toss3(capi.SQLITE_ACCESS, "Cannot clear in-use database storage.");
        }
        const s = store.storage;
        const toRm = [];
        let i2, n = s.length;
        for (i2 = 0; i2 < n; ++i2) {
          const k2 = s.key(i2);
          if (!store.keyPrefix || k2.startsWith(store.keyPrefix)) toRm.push(k2);
        }
        toRm.forEach((kk) => s.removeItem(kk));
        return toRm.length;
      };
      const sqlite3_js_kvvfs_size = function callee3(which) {
        if ("" === which) return callee3("local") + callee3("session");
        const store = storageForZClass(which);
        if (!store) return 0;
        const s = store.storage;
        let i2, sz = 0;
        for (i2 = 0; i2 < s.length; ++i2) {
          const k2 = s.key(i2);
          if (!store.keyPrefix || k2.startsWith(store.keyPrefix)) {
            sz += k2.length;
            sz += s.getItem(k2).length;
          }
        }
        return sz * 2;
      };
      const sqlite3_js_kvvfs_export = function callee3(...args) {
        let opt;
        if (1 === args.length && "object" === typeof args[0]) opt = args[0];
        else if (args.length) opt = Object.assign(/* @__PURE__ */ Object.create(null), { name: args[0] });
        const store = opt ? storageForZClass(opt.name) : null;
        if (!store) toss3(capi.SQLITE_NOTFOUND, "There is no kvvfs storage named", opt?.name);
        const s = store.storage;
        const rc = Object.assign(/* @__PURE__ */ Object.create(null), {
          name: store.jzClass,
          timestamp: Date.now(),
          pages: []
        });
        const pages = /* @__PURE__ */ Object.create(null);
        const keyPrefix = store.keyPrefix;
        const rxTail = keyPrefix ? /^kvvfs-[^-]+-(\w+)/ : void 0;
        let i2 = 0, n = s.length;
        for (; i2 < n; ++i2) {
          const k2 = s.key(i2);
          if (!keyPrefix || k2.startsWith(keyPrefix)) {
            let kk = (keyPrefix ? rxTail.exec(k2) : void 0)?.[1] ?? k2;
            switch (kk) {
              case "jrnl":
                if (opt.includeJournal) rc.journal = s.getItem(k2);
                break;
              case "sz":
                rc.size = +s.getItem(k2);
                break;
              default:
                kk = +kk;
                if (!util.isInt32(kk) || kk <= 0) toss3(capi.SQLITE_RANGE, "Malformed kvvfs key: " + k2);
                if (opt.decodePages) {
                  const spg = s.getItem(k2), n2 = spg.length, z = cache.memBuffer(0), zDec = cache.memBuffer(1), heap = wasm.heap8u();
                  let i3 = 0;
                  for (; i3 < n2; ++i3) heap[wasm.ptr.add(z, i3)] = spg.codePointAt(i3) & 255;
                  heap[wasm.ptr.add(z, i3)] = 0;
                  const nDec = kvvfsDecode(z, zDec, cache.buffer.n);
                  pages[kk] = heap.slice(Number(zDec), wasm.ptr.addn(zDec, nDec));
                } else pages[kk] = s.getItem(k2);
            }
          }
        }
        if (opt.decodePages) cache.memBufferFree(1);
        Object.keys(pages).map((v2) => +v2).sort().forEach((v2) => rc.pages.push(pages[v2]));
        return rc;
      };
      const sqlite3_js_kvvfs_import = function(exp, overwrite = false) {
        if (!exp?.timestamp || !exp.name || void 0 === exp.size || !Array.isArray(exp.pages)) toss3(capi.SQLITE_MISUSE, "Malformed export object.");
        else if (!exp.size || exp.size !== (exp.size | 0) || exp.size >= 2147483647) toss3(capi.SQLITE_RANGE, "Invalid db size: " + exp.size);
        validateStorageName(exp.name);
        let store = storageForZClass(exp.name);
        const isNew = !store;
        if (store) {
          if (!overwrite) toss3(capi.SQLITE_ACCESS, "Storage '" + exp.name + "' already exists and", "overwrite was not specified.");
          else if (!store.files || !store.jzClass) toss3(capi.SQLITE_ERROR, "Internal storage object", exp.name, "seems to be malformed.");
          else if (store.files.length) toss3(capi.SQLITE_IOERR_ACCESS, "Cannot import db storage while it is in use.");
          sqlite3_js_kvvfs_clear(exp.name);
        } else store = newStorageObj(exp.name);
        const keyPrefix = kvvfsKeyPrefix(exp.name);
        let zEnc;
        try {
          const s = store.storage;
          s.setItem(keyPrefix + "sz", exp.size);
          if (exp.journal) s.setItem(keyPrefix + "jrnl", exp.journal);
          if (exp.pages[0] instanceof Uint8Array) exp.pages.forEach((u, ndx) => {
            const n = u.length;
            zEnc ??= cache.memBuffer(1);
            const zBin = cache.memBuffer(0), heap = wasm.heap8u();
            heap.set(u, Number(zBin));
            heap[wasm.ptr.addn(zBin, n)] = 0;
            const rc = kvvfsEncode(zBin, n, zEnc);
            util.assert(rc < cache.buffer.n, "Impossibly long output - possibly smashed the heap");
            util.assert(0 === wasm.peek8(wasm.ptr.add(zEnc, rc)), "Expecting NUL-terminated encoded output");
            const jenc = wasm.cstrToJs(zEnc);
            s.setItem(keyPrefix + (ndx + 1), jenc);
          });
          else if (exp.pages[0]) exp.pages.forEach((v2, ndx) => s.setItem(keyPrefix + (ndx + 1), v2));
          if (isNew) installStorageAndJournal(store);
        } catch {
          if (!isNew) try {
            sqlite3_js_kvvfs_clear(exp.name);
          } catch (ee) {
          }
        } finally {
          if (zEnc) cache.memBufferFree(1);
        }
        return this;
      };
      const sqlite3_js_kvvfs_reserve = function(name) {
        let store = storageForZClass(name);
        if (store) {
          ++store.refc;
          return;
        }
        validateStorageName(name);
        installStorageAndJournal(newStorageObj(name));
      };
      const sqlite3_js_kvvfs_unlink = function(name) {
        const store = storageForZClass(name);
        if (!store || kvvfsIsPersistentName(store.jzClass) || isBuiltinName(store.jzClass) || cache.rxJournalSuffix.test(name)) return false;
        if (store.refc > store.files.length || 0 === store.files.length) {
          if (--store.refc <= 0) deleteStorage(store);
          return true;
        }
        return false;
      };
      const sqlite3_js_kvvfs_listen = function(opt) {
        if (!opt || "object" !== typeof opt) toss3(capi.SQLITE_MISUSE, "Expecting a listener object.");
        let store = storageForZClass(opt.storage);
        if (!store) {
          if (opt.storage && opt.reserve) {
            sqlite3_js_kvvfs_reserve(opt.storage);
            store = storageForZClass(opt.storage);
            util.assert(store, "Unexpectedly cannot fetch reserved storage " + opt.storage);
          } else toss3(capi.SQLITE_NOTFOUND, "No such storage:", opt.storage);
        }
        if (opt.events) (store.listeners ??= []).push(opt);
      };
      const sqlite3_js_kvvfs_unlisten = function(opt) {
        const store = storageForZClass(opt?.storage);
        if (store?.listeners && opt.events) {
          const n = store.listeners.length;
          store.listeners = store.listeners.filter((v2) => v2 !== opt);
          const rc = n > store.listeners.length;
          if (!store.listeners.length) store.listeners = void 0;
          return rc;
        }
        return false;
      };
      sqlite3.kvvfs.reserve = sqlite3_js_kvvfs_reserve;
      sqlite3.kvvfs.import = sqlite3_js_kvvfs_import;
      sqlite3.kvvfs.export = sqlite3_js_kvvfs_export;
      sqlite3.kvvfs.unlink = sqlite3_js_kvvfs_unlink;
      sqlite3.kvvfs.listen = sqlite3_js_kvvfs_listen;
      sqlite3.kvvfs.unlisten = sqlite3_js_kvvfs_unlisten;
      sqlite3.kvvfs.exists = (name) => !!storageForZClass(name);
      sqlite3.kvvfs.estimateSize = sqlite3_js_kvvfs_size;
      sqlite3.kvvfs.clear = sqlite3_js_kvvfs_clear;
      if (globalThis.Storage) {
        capi.sqlite3_js_kvvfs_size = (which = "") => sqlite3_js_kvvfs_size(which);
        capi.sqlite3_js_kvvfs_clear = (which = "") => sqlite3_js_kvvfs_clear(which);
      }
      if (sqlite3.oo1?.DB) {
        const DB = sqlite3.oo1.DB;
        sqlite3.oo1.JsStorageDb = function(storageName = sqlite3.oo1.JsStorageDb.defaultStorageName) {
          const opt = DB.dbCtorHelper.normalizeArgs(...arguments);
          opt.vfs = "kvvfs";
          switch (opt.filename) {
            case ":sessionStorage:":
              opt.filename = "session";
              break;
            case ":localStorage:":
              opt.filename = "local";
          }
          const m = /(file:(\/\/)?)([^?]+)/.exec(opt.filename);
          validateStorageName(m ? m[3] : opt.filename);
          DB.dbCtorHelper.call(this, opt);
        };
        sqlite3.oo1.JsStorageDb.defaultStorageName = cache.storagePool.session ? "session" : nameOfThisThreadStorage;
        const jdb = sqlite3.oo1.JsStorageDb;
        jdb.prototype = Object.create(DB.prototype);
        jdb.clearStorage = sqlite3_js_kvvfs_clear;
        jdb.prototype.clearStorage = function() {
          return jdb.clearStorage(this.affirmOpen().dbFilename(), true);
        };
        jdb.storageSize = sqlite3_js_kvvfs_size;
        jdb.prototype.storageSize = function() {
          return jdb.storageSize(this.affirmOpen().dbFilename(), true);
        };
      }
      if (sqlite3.__isUnderTest && sqlite3.vtab) {
        const cols = Object.assign(/* @__PURE__ */ Object.create(null), {
          rowid: { type: "INTEGER" },
          name: { type: "TEXT" },
          nRef: { type: "INTEGER" },
          nOpen: { type: "INTEGER" },
          isTransient: { type: "INTEGER" },
          dbSize: { type: "INTEGER" }
        });
        Object.keys(cols).forEach((v2, i2) => cols[v2].colId = i2);
        const VT = sqlite3.vtab;
        const ProtoCursor = Object.assign(/* @__PURE__ */ Object.create(null), { row: function() {
          return cache.storagePool[this.names[this.rowid]];
        } });
        Object.assign(Object.create(ProtoCursor), {
          rowid: 0,
          names: Object.keys(cache.storagePool).filter((v2) => !cache.rxJournalSuffix.test(v2))
        });
        const cursorState = function(cursor, reset) {
          const o = cursor instanceof capi.sqlite3_vtab_cursor ? cursor : VT.xCursor.get(cursor);
          if (reset || !o.vTabState) o.vTabState = Object.assign(Object.create(ProtoCursor), {
            rowid: 0,
            names: Object.keys(cache.storagePool).filter((v2) => !cache.rxJournalSuffix.test(v2))
          });
          return o.vTabState;
        };
        const theModule = function f() {
          return f.mod ??= new sqlite3.capi.sqlite3_module().setupModule({
            catchExceptions: true,
            methods: {
              xConnect: function(pDb2, pAux, argc, argv, ppVtab, pzErr) {
                try {
                  const xcol = [];
                  Object.keys(cols).forEach((k2) => {
                    xcol.push(k2 + " " + cols[k2].type);
                  });
                  const rc = capi.sqlite3_declare_vtab(pDb2, "CREATE TABLE ignored(" + xcol.join(",") + ")");
                  if (0 === rc) {
                    const t = VT.xVtab.create(ppVtab);
                    util.assert(t === VT.xVtab.get(wasm.peekPtr(ppVtab)), "output pointer check failed");
                  }
                  return rc;
                } catch (e) {
                  return VT.xError("xConnect", e, capi.SQLITE_ERROR);
                }
              },
              xCreate: wasm.ptr.null,
              xDisconnect: function(pVtab) {
                VT.xVtab.dispose(pVtab);
                return 0;
              },
              xOpen: function(pVtab, ppCursor) {
                VT.xCursor.create(ppCursor);
                return 0;
              },
              xClose: function(pCursor) {
                const c = VT.xCursor.unget(pCursor);
                delete c.vTabState;
                c.dispose();
                return 0;
              },
              xNext: function(pCursor) {
                const c = VT.xCursor.get(pCursor);
                ++cursorState(c).rowid;
                return 0;
              },
              xColumn: function(pCursor, pCtx, iCol) {
                const st = cursorState(pCursor);
                const store = st.row();
                util.assert(store, "Unexpected xColumn call");
                switch (iCol) {
                  case cols.rowid.colId:
                    capi.sqlite3_result_int(pCtx, st.rowid);
                    break;
                  case cols.name.colId:
                    capi.sqlite3_result_text(pCtx, store.jzClass, -1, capi.SQLITE_TRANSIENT);
                    break;
                  case cols.nRef.colId:
                    capi.sqlite3_result_int(pCtx, store.refc);
                    break;
                  case cols.nOpen.colId:
                    capi.sqlite3_result_int(pCtx, store.files.length);
                    break;
                  case cols.isTransient.colId:
                    capi.sqlite3_result_int(pCtx, !!store.deleteAtRefc0);
                    break;
                  case cols.dbSize.colId:
                    capi.sqlite3_result_int(pCtx, storageGetDbSize(store));
                    break;
                  default:
                    capi.sqlite3_result_error(pCtx, "Invalid column id: " + iCol);
                    return capi.SQLITE_RANGE;
                }
                return 0;
              },
              xRowid: function(pCursor, ppRowid64) {
                const st = cursorState(pCursor);
                VT.xRowid(ppRowid64, st.rowid);
                return 0;
              },
              xEof: function(pCursor) {
                const st = cursorState(pCursor);
                "" + !st.row();
                return !st.row();
              },
              xFilter: function(pCursor, idxNum, idxCStr, argc, argv) {
                cursorState(pCursor, true);
                return 0;
              },
              xBestIndex: function(pVtab, pIdxInfo) {
                const pii = new capi.sqlite3_index_info(pIdxInfo);
                pii.$estimatedRows = cache.storagePool.size;
                pii.$estimatedCost = 1;
                pii.dispose();
                return 0;
              }
            }
          });
        };
        sqlite3.kvvfs.create_module = function(pDb2, name = "sqlite_kvvfs") {
          return capi.sqlite3_create_module(pDb2, name, theModule(), wasm.ptr.null);
        };
      }
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      "use strict";
      if (sqlite3.config.disable?.vfs?.opfs && sqlite3.config.disable.vfs["opfs-vfs"]) return;
      const toss = sqlite3.util.toss;
      sqlite3.capi;
      const util = sqlite3.util;
      sqlite3.wasm;
      const opfsUtil = sqlite3.opfs = /* @__PURE__ */ Object.create(null);
      opfsUtil.thisThreadHasOPFS = () => {
        return globalThis.FileSystemHandle && globalThis.FileSystemDirectoryHandle && globalThis.FileSystemFileHandle && globalThis.FileSystemFileHandle.prototype.createSyncAccessHandle && navigator?.storage?.getDirectory;
      };
      opfsUtil.getRootDir = async function f() {
        return f.promise ??= navigator.storage.getDirectory().then((d) => {
          opfsUtil.rootDirectory = d;
          return d;
        }).catch((e) => {
          delete f.promise;
          throw e;
        });
      };
      opfsUtil.getResolvedPath = function(filename, splitIt) {
        const p = new URL(filename, "file://irrelevant").pathname;
        return splitIt ? p.split("/").filter((v2) => !!v2) : p;
      };
      opfsUtil.getDirForFilename = async function f(absFilename, createDirs = false) {
        const path = opfsUtil.getResolvedPath(absFilename, true);
        const filename = path.pop();
        let dh = await opfsUtil.getRootDir();
        for (const dirName of path) if (dirName) dh = await dh.getDirectoryHandle(dirName, { create: !!createDirs });
        return [dh, filename];
      };
      opfsUtil.mkdir = async function(absDirName) {
        try {
          await opfsUtil.getDirForFilename(absDirName + "/filepart", true);
          return true;
        } catch (e) {
          return false;
        }
      };
      opfsUtil.entryExists = async function(fsEntryName) {
        try {
          const [dh, fn] = await opfsUtil.getDirForFilename(fsEntryName);
          await dh.getFileHandle(fn);
          return true;
        } catch (e) {
          return false;
        }
      };
      opfsUtil.randomFilename = function f(len = 16) {
        if (!f._chars) {
          f._chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ012346789";
          f._n = f._chars.length;
        }
        const a = [];
        let i2 = 0;
        for (; i2 < len; ++i2) {
          const ndx = Math.random() * (f._n * 64) % f._n | 0;
          a[i2] = f._chars[ndx];
        }
        return a.join("");
      };
      opfsUtil.treeList = async function() {
        const doDir = async function callee3(dirHandle, tgt) {
          tgt.name = dirHandle.name;
          tgt.dirs = [];
          tgt.files = [];
          for await (const handle of dirHandle.values()) if ("directory" === handle.kind) {
            const subDir = /* @__PURE__ */ Object.create(null);
            tgt.dirs.push(subDir);
            await callee3(handle, subDir);
          } else tgt.files.push(handle.name);
        };
        const root = /* @__PURE__ */ Object.create(null);
        await doDir(await opfsUtil.getRootDir(), root);
        return root;
      };
      opfsUtil.rmfr = async function() {
        const dir = await opfsUtil.getRootDir(), opt = { recurse: true };
        for await (const handle of dir.values()) dir.removeEntry(handle.name, opt);
      };
      opfsUtil.unlink = async function(fsEntryName, recursive = false, throwOnError = false) {
        try {
          const [hDir, filenamePart] = await opfsUtil.getDirForFilename(fsEntryName, false);
          await hDir.removeEntry(filenamePart, { recursive });
          return true;
        } catch (e) {
          if (throwOnError) throw new Error("unlink(", arguments[0], ") failed: " + e.message, { cause: e });
          return false;
        }
      };
      opfsUtil.traverse = async function(opt) {
        const defaultOpt = {
          recursive: true,
          directory: await opfsUtil.getRootDir()
        };
        if ("function" === typeof opt) opt = { callback: opt };
        opt = Object.assign(defaultOpt, opt || {});
        (async function callee3(dirHandle, depth) {
          for await (const handle of dirHandle.values()) if (false === opt.callback(handle, dirHandle, depth)) return false;
          else if (opt.recursive && "directory" === handle.kind) {
            if (false === await callee3(handle, depth + 1)) break;
          }
        })(opt.directory, 0);
      };
      const importDbChunked = async function(filename, callback) {
        const [hDir, fnamePart] = await opfsUtil.getDirForFilename(filename, true);
        let sah = await (await hDir.getFileHandle(fnamePart, { create: true })).createSyncAccessHandle(), nWrote = 0, chunk, checkedHeader = false;
        try {
          sah.truncate(0);
          while (void 0 !== (chunk = await callback())) {
            if (chunk instanceof ArrayBuffer) chunk = new Uint8Array(chunk);
            if (!checkedHeader && 0 === nWrote && chunk.byteLength >= 15) {
              util.affirmDbHeader(chunk);
              checkedHeader = true;
            }
            sah.write(chunk, { at: nWrote });
            nWrote += chunk.byteLength;
          }
          if (nWrote < 512 || 0 !== nWrote % 512) toss("Input size", nWrote, "is not correct for an SQLite database.");
          if (!checkedHeader) {
            const header = /* @__PURE__ */ new Uint8Array(20);
            sah.read(header, { at: 0 });
            util.affirmDbHeader(header);
          }
          sah.write(new Uint8Array([1, 1]), { at: 18 });
          return nWrote;
        } catch (e) {
          await sah.close();
          sah = void 0;
          await hDir.removeEntry(fnamePart).catch(() => {
          });
          throw e;
        } finally {
          if (sah) await sah.close();
        }
      };
      opfsUtil.importDb = async function(filename, bytes) {
        if (bytes instanceof Function) return importDbChunked(filename, bytes);
        if (bytes instanceof ArrayBuffer) bytes = new Uint8Array(bytes);
        util.affirmIsDb(bytes);
        const n = bytes.byteLength;
        const [hDir, fnamePart] = await opfsUtil.getDirForFilename(filename, true);
        let sah, nWrote = 0;
        try {
          sah = await (await hDir.getFileHandle(fnamePart, { create: true })).createSyncAccessHandle();
          sah.truncate(0);
          nWrote = sah.write(bytes, { at: 0 });
          if (nWrote != n) toss("Expected to write " + n + " bytes but wrote " + nWrote + ".");
          sah.write(new Uint8Array([1, 1]), { at: 18 });
          return nWrote;
        } catch (e) {
          if (sah) {
            await sah.close();
            sah = void 0;
          }
          await hDir.removeEntry(fnamePart).catch(() => {
          });
          throw e;
        } finally {
          if (sah) await sah.close();
        }
      };
      opfsUtil.vfsInstallationFeatureCheck = function(vfsName) {
        if (!globalThis.SharedArrayBuffer || !globalThis.Atomics) toss("Cannot install OPFS: Missing SharedArrayBuffer and/or Atomics.", "The server must emit the COOP/COEP response headers to enable those.", "See https://sqlite.org/wasm/doc/trunk/persistence.md#coop-coep");
        else if ("undefined" === typeof WorkerGlobalScope) toss("The OPFS sqlite3_vfs cannot run in the main thread", "because it requires Atomics.wait().");
        else if (!globalThis.FileSystemHandle || !globalThis.FileSystemDirectoryHandle || !globalThis.FileSystemFileHandle?.prototype?.createSyncAccessHandle || !navigator?.storage?.getDirectory) toss("Missing required OPFS APIs.");
        else if ("opfs-wl" === vfsName && !globalThis.Atomics.waitAsync) toss("The", vfsName, "VFS requires Atomics.waitAsync(), which is not available.");
      };
      opfsUtil.initOptions = function callee3(vfsName, options) {
        const urlParams = new URL(globalThis.location.href).searchParams;
        if (urlParams.has(vfsName + "-disable")) return;
        try {
          opfsUtil.vfsInstallationFeatureCheck(vfsName);
        } catch (e) {
          return;
        }
        options = util.nu(options);
        options.vfsName = vfsName;
        options.verbose ??= urlParams.has("opfs-verbose") ? +urlParams.get("opfs-verbose") : 1;
        options.sanityChecks ??= urlParams.has("opfs-sanity-check");
        if (!opfsUtil.proxyUri) {
          opfsUtil.proxyUri = "sqlite3-opfs-async-proxy.js";
          if (sqlite3.scriptInfo?.sqlite3Dir) opfsUtil.proxyUri = sqlite3.scriptInfo.sqlite3Dir + opfsUtil.proxyUri;
        }
        options.proxyUri ??= opfsUtil.proxyUri;
        if ("function" === typeof options.proxyUri) options.proxyUri = options.proxyUri();
        return opfsUtil.options = options;
      };
      opfsUtil.createVfsState = function() {
        const state = util.nu();
        const options = opfsUtil.options;
        state.verbose = options.verbose;
        const loggers = [
          sqlite3.config.error,
          sqlite3.config.warn,
          sqlite3.config.log
        ];
        const vfsName = options.vfsName || toss("Maintenance required: missing VFS name");
        const logImpl = (level, ...args) => {
          if (state.verbose > level) loggers[level](vfsName + ":", ...args);
        };
        const log = (...args) => logImpl(2, ...args), warn = (...args) => logImpl(1, ...args), error = (...args) => logImpl(0, ...args), capi = sqlite3.capi, wasm = sqlite3.wasm;
        const opfsVfs = state.vfs = new capi.sqlite3_vfs();
        const opfsIoMethods = opfsVfs.ioMethods = new capi.sqlite3_io_methods();
        opfsIoMethods.$iVersion = 1;
        opfsVfs.$iVersion = 2;
        opfsVfs.$szOsFile = capi.sqlite3_file.structInfo.sizeof;
        opfsVfs.$mxPathname = 1024;
        opfsVfs.$zName = wasm.allocCString(vfsName);
        opfsVfs.addOnDispose(
          "$zName",
          opfsVfs.$zName,
          opfsIoMethods
          /**
          Pedantic sidebar: the entries in this array are items to
          clean up when opfsVfs.dispose() is called, but in this
          environment it will never be called. The VFS instance simply
          hangs around until the WASM module instance is cleaned up. We
          "could" _hypothetically_ clean it up by "importing" an
          sqlite3_os_end() impl into the wasm build, but the shutdown
          order of the wasm engine and the JS one are undefined so
          there is no guaranty that the opfsVfs instance would be
          available in one environment or the other when
          sqlite3_os_end() is called (_if_ it gets called at all in a
          wasm build, which is undefined). i.e. addOnDispose() here is
          a matter of "correctness", not necessity. It just wouldn't do
          to leave the impression that we're blindly leaking memory.
          */
        );
        opfsVfs.metrics = util.nu({
          counters: util.nu(),
          dump: function() {
            let k2, n = 0, t = 0, w = 0;
            for (k2 in state.opIds) {
              const m = metrics[k2];
              n += m.count;
              t += m.time;
              w += m.wait;
              m.avgTime = m.count && m.time ? m.time / m.count : 0;
              m.avgWait = m.count && m.wait ? m.wait / m.count : 0;
            }
            sqlite3.config.log(globalThis.location.href, "metrics for", globalThis.location.href, ":", metrics, "\nTotal of", n, "op(s) for", t, "ms (incl. " + w + " ms of waiting on the async side)");
            sqlite3.config.log("Serialization metrics:", opfsVfs.metrics.counters.s11n);
            opfsVfs.worker?.postMessage?.({ type: "opfs-async-metrics" });
          },
          reset: function() {
            let k2;
            const r = (m2) => m2.count = m2.time = m2.wait = 0;
            const m = opfsVfs.metrics.counters;
            for (k2 in state.opIds) r(m[k2] = /* @__PURE__ */ Object.create(null));
            let s = m.s11n = /* @__PURE__ */ Object.create(null);
            s = s.serialize = /* @__PURE__ */ Object.create(null);
            s.count = s.time = 0;
            s = m.s11n.deserialize = /* @__PURE__ */ Object.create(null);
            s.count = s.time = 0;
          }
        });
        state.asyncIdleWaitTime = 150;
        state.asyncS11nExceptions = 1;
        state.fileBufferSize = 65536;
        state.sabS11nOffset = state.fileBufferSize;
        state.sabS11nSize = opfsVfs.$mxPathname * 2;
        state.sabIO = new SharedArrayBuffer(state.fileBufferSize + state.sabS11nSize);
        state.opIds = /* @__PURE__ */ Object.create(null);
        {
          let i2 = 0;
          state.opIds.whichOp = i2++;
          state.opIds.rc = i2++;
          state.opIds.xAccess = i2++;
          state.opIds.xClose = i2++;
          state.opIds.xDelete = i2++;
          state.opIds.xDeleteNoWait = i2++;
          state.opIds.xFileSize = i2++;
          state.opIds.xLock = i2++;
          state.opIds.xOpen = i2++;
          state.opIds.xRead = i2++;
          state.opIds.xSleep = i2++;
          state.opIds.xSync = i2++;
          state.opIds.xTruncate = i2++;
          state.opIds.xUnlock = i2++;
          state.opIds.xWrite = i2++;
          state.opIds.mkdir = i2++;
          state.opIds["opfs-async-metrics"] = i2++;
          state.opIds["opfs-async-shutdown"] = i2++;
          state.opIds.retry = i2++;
          state.sabOP = new SharedArrayBuffer(i2 * 4);
        }
        state.sq3Codes = /* @__PURE__ */ Object.create(null);
        for (const k2 of [
          "SQLITE_ACCESS_EXISTS",
          "SQLITE_ACCESS_READWRITE",
          "SQLITE_BUSY",
          "SQLITE_CANTOPEN",
          "SQLITE_ERROR",
          "SQLITE_IOERR",
          "SQLITE_IOERR_ACCESS",
          "SQLITE_IOERR_CLOSE",
          "SQLITE_IOERR_DELETE",
          "SQLITE_IOERR_FSYNC",
          "SQLITE_IOERR_LOCK",
          "SQLITE_IOERR_READ",
          "SQLITE_IOERR_SHORT_READ",
          "SQLITE_IOERR_TRUNCATE",
          "SQLITE_IOERR_UNLOCK",
          "SQLITE_IOERR_WRITE",
          "SQLITE_LOCK_EXCLUSIVE",
          "SQLITE_LOCK_NONE",
          "SQLITE_LOCK_PENDING",
          "SQLITE_LOCK_RESERVED",
          "SQLITE_LOCK_SHARED",
          "SQLITE_LOCKED",
          "SQLITE_MISUSE",
          "SQLITE_NOTFOUND",
          "SQLITE_OPEN_CREATE",
          "SQLITE_OPEN_DELETEONCLOSE",
          "SQLITE_OPEN_MAIN_DB",
          "SQLITE_OPEN_READONLY",
          "SQLITE_LOCK_NONE",
          "SQLITE_LOCK_SHARED",
          "SQLITE_LOCK_RESERVED",
          "SQLITE_LOCK_PENDING",
          "SQLITE_LOCK_EXCLUSIVE"
        ]) state.sq3Codes[k2] = capi[k2] ?? toss("Maintenance required: not found:", k2);
        state.opfsFlags = Object.assign(/* @__PURE__ */ Object.create(null), {
          /**
          Flag for use with xOpen(). URI flag "opfs-unlock-asap=1"
          enables this. See defaultUnlockAsap, below.
          */
          OPFS_UNLOCK_ASAP: 1,
          /**
          Flag for use with xOpen(). URI flag "delete-before-open=1"
          tells the VFS to delete the db file before attempting to open
          it. This can be used, e.g., to replace a db which has been
          corrupted (without forcing us to expose a delete/unlink()
          function in the public API).
          
          Failure to unlink the file is ignored but may lead to
          downstream errors.  An unlink can fail if, e.g., another tab
          has the handle open.
          
          It goes without saying that deleting a file out from under
          another instance results in Undefined Behavior.
          */
          OPFS_UNLINK_BEFORE_OPEN: 2,
          /**
          If true, any async routine which must implicitly acquire a
          sync access handle (i.e. an OPFS lock), without an active
          xLock(), will release that lock at the end of the call which
          acquires it. If false, such implicit locks are not released
          until the VFS is idle for some brief amount of time, as
          defined by state.asyncIdleWaitTime.
          
          The benefit of enabling this is higher concurrency. The
          down-side is much-reduced performance (as much as a 4x
          decrease in speedtest1).
          */
          defaultUnlockAsap: false
        });
        opfsVfs.metrics.reset();
        const metrics = opfsVfs.metrics.counters;
        const opRun = opfsVfs.opRun = (op, ...args) => {
          const opNdx = state.opIds[op] || toss(opfsVfs.vfsName + ": Invalid op ID:", op);
          state.s11n.serialize(...args);
          Atomics.store(state.sabOPView, state.opIds.rc, -1);
          Atomics.store(state.sabOPView, state.opIds.whichOp, opNdx);
          Atomics.notify(state.sabOPView, state.opIds.whichOp);
          const t = performance.now();
          while ("not-equal" !== Atomics.wait(state.sabOPView, state.opIds.rc, -1)) ;
          const rc = Atomics.load(state.sabOPView, state.opIds.rc);
          metrics[op].wait += performance.now() - t;
          if (rc && state.asyncS11nExceptions) {
            const err3 = state.s11n.deserialize();
            if (err3) error(op + "() async error:", ...err3);
          }
          return rc;
        };
        const opTimer = /* @__PURE__ */ Object.create(null);
        opTimer.op = void 0;
        opTimer.start = void 0;
        const mTimeStart = opfsVfs.mTimeStart = (op) => {
          opTimer.start = performance.now();
          opTimer.op = op;
          ++metrics[op].count;
        };
        const mTimeEnd = opfsVfs.mTimeEnd = () => metrics[opTimer.op].time += performance.now() - opTimer.start;
        const __openFiles = opfsVfs.__openFiles = /* @__PURE__ */ Object.create(null);
        opfsVfs.ioSyncWrappers = util.nu({
          xCheckReservedLock: function(pFile, pOut) {
            wasm.poke(pOut, 0, "i32");
            return 0;
          },
          xClose: function(pFile) {
            mTimeStart("xClose");
            let rc = 0;
            const f = __openFiles[pFile];
            if (f) {
              delete __openFiles[pFile];
              rc = opRun("xClose", pFile);
              if (f.sq3File) f.sq3File.dispose();
            }
            mTimeEnd();
            return rc;
          },
          xDeviceCharacteristics: function(pFile) {
            return capi.SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN;
          },
          xFileControl: function(pFile, opId, pArg) {
            return capi.SQLITE_NOTFOUND;
          },
          xFileSize: function(pFile, pSz64) {
            mTimeStart("xFileSize");
            let rc = opRun("xFileSize", pFile);
            if (0 == rc) try {
              const sz = state.s11n.deserialize()[0];
              wasm.poke(pSz64, sz, "i64");
            } catch (e) {
              error("Unexpected error reading xFileSize() result:", e);
              rc = state.sq3Codes.SQLITE_IOERR;
            }
            mTimeEnd();
            return rc;
          },
          xRead: function(pFile, pDest, n, offset64) {
            mTimeStart("xRead");
            const f = __openFiles[pFile];
            let rc;
            try {
              rc = opRun("xRead", pFile, n, Number(offset64));
              if (0 === rc || capi.SQLITE_IOERR_SHORT_READ === rc)
                wasm.heap8u().set(f.sabView.subarray(0, n), Number(pDest));
            } catch (e) {
              error("xRead(", arguments, ") failed:", e, f);
              rc = capi.SQLITE_IOERR_READ;
            }
            mTimeEnd();
            return rc;
          },
          xSync: function(pFile, flags) {
            mTimeStart("xSync");
            const rc = opRun("xSync", pFile, flags);
            mTimeEnd();
            return rc;
          },
          xTruncate: function(pFile, sz64) {
            mTimeStart("xTruncate");
            const rc = opRun("xTruncate", pFile, Number(sz64));
            mTimeEnd();
            return rc;
          },
          xWrite: function(pFile, pSrc, n, offset64) {
            mTimeStart("xWrite");
            const f = __openFiles[pFile];
            let rc;
            try {
              f.sabView.set(wasm.heap8u().subarray(Number(pSrc), Number(pSrc) + n));
              rc = opRun("xWrite", pFile, n, Number(offset64));
            } catch (e) {
              error("xWrite(", arguments, ") failed:", e, f);
              rc = capi.SQLITE_IOERR_WRITE;
            }
            mTimeEnd();
            return rc;
          }
        });
        opfsVfs.vfsSyncWrappers = {
          xAccess: function(pVfs, zName, flags, pOut) {
            mTimeStart("xAccess");
            const rc = opRun("xAccess", wasm.cstrToJs(zName));
            wasm.poke(pOut, rc ? 0 : 1, "i32");
            mTimeEnd();
            return 0;
          },
          xCurrentTime: function(pVfs, pOut) {
            wasm.poke(pOut, 24405875e-1 + (/* @__PURE__ */ new Date()).getTime() / 864e5, "double");
            return 0;
          },
          xCurrentTimeInt64: function(pVfs, pOut) {
            wasm.poke(pOut, 21086676e7 + (/* @__PURE__ */ new Date()).getTime(), "i64");
            return 0;
          },
          xDelete: function(pVfs, zName, doSyncDir) {
            mTimeStart("xDelete");
            const rc = opRun("xDelete", wasm.cstrToJs(zName), doSyncDir, false);
            mTimeEnd();
            return rc;
          },
          xFullPathname: function(pVfs, zName, nOut, pOut) {
            return wasm.cstrncpy(pOut, zName, nOut) < nOut ? 0 : capi.SQLITE_CANTOPEN;
          },
          xGetLastError: function(pVfs, nOut, pOut) {
            sqlite3.config.warn("OPFS xGetLastError() has nothing sensible to return.");
            return 0;
          },
          xOpen: function f(pVfs, zName, pFile, flags, pOutFlags) {
            mTimeStart("xOpen");
            let opfsFlags = 0;
            let jzName, zToFree;
            if (!zName) {
              jzName = opfsUtil.randomFilename();
              zName = zToFree = wasm.allocCString(jzName);
            } else if (wasm.isPtr(zName)) {
              if (capi.sqlite3_uri_boolean(zName, "opfs-unlock-asap", 0)) opfsFlags |= state.opfsFlags.OPFS_UNLOCK_ASAP;
              if (capi.sqlite3_uri_boolean(zName, "delete-before-open", 0)) opfsFlags |= state.opfsFlags.OPFS_UNLINK_BEFORE_OPEN;
              jzName = wasm.cstrToJs(zName);
            } else {
              sqlite3.config.error("Impossible zName value in xOpen?", zName);
              return capi.SQLITE_CANTOPEN;
            }
            const fh = util.nu({
              fid: pFile,
              filename: jzName,
              sab: new SharedArrayBuffer(state.fileBufferSize),
              flags,
              readOnly: !(capi.SQLITE_OPEN_CREATE & flags) && !!(flags & capi.SQLITE_OPEN_READONLY)
            });
            const rc = opRun("xOpen", pFile, jzName, flags, opfsFlags);
            if (rc) {
              if (zToFree) wasm.dealloc(zToFree);
            } else {
              if (fh.readOnly) wasm.poke(pOutFlags, capi.SQLITE_OPEN_READONLY, "i32");
              __openFiles[pFile] = fh;
              fh.sabView = state.sabFileBufView;
              fh.sq3File = new capi.sqlite3_file(pFile);
              if (zToFree) fh.sq3File.addOnDispose(zToFree);
              fh.sq3File.$pMethods = opfsIoMethods.pointer;
              fh.lockType = capi.SQLITE_LOCK_NONE;
            }
            mTimeEnd();
            return rc;
          }
        };
        const pDVfs = capi.sqlite3_vfs_find(null);
        if (pDVfs) {
          const dVfs = new capi.sqlite3_vfs(pDVfs);
          opfsVfs.$xRandomness = dVfs.$xRandomness;
          opfsVfs.$xSleep = dVfs.$xSleep;
          dVfs.dispose();
        }
        if (!opfsVfs.$xRandomness) opfsVfs.vfsSyncWrappers.xRandomness = function(pVfs, nOut, pOut) {
          const heap = wasm.heap8u();
          let i2 = 0;
          const npOut = Number(pOut);
          for (; i2 < nOut; ++i2) heap[npOut + i2] = Math.random() * 255e3 & 255;
          return i2;
        };
        if (!opfsVfs.$xSleep) opfsVfs.vfsSyncWrappers.xSleep = function(pVfs, ms) {
          mTimeStart("xSleep");
          Atomics.wait(state.sabOPView, state.opIds.xSleep, 0, ms);
          mTimeEnd();
          return 0;
        };
        const initS11n = function() {
          if (state.s11n) return state.s11n;
          const textDecoder = new TextDecoder(), textEncoder = new TextEncoder("utf-8"), viewU8 = new Uint8Array(state.sabIO, state.sabS11nOffset, state.sabS11nSize), viewDV = new DataView(state.sabIO, state.sabS11nOffset, state.sabS11nSize);
          state.s11n = /* @__PURE__ */ Object.create(null);
          const TypeIds = /* @__PURE__ */ Object.create(null);
          TypeIds.number = {
            id: 1,
            size: 8,
            getter: "getFloat64",
            setter: "setFloat64"
          };
          TypeIds.bigint = {
            id: 2,
            size: 8,
            getter: "getBigInt64",
            setter: "setBigInt64"
          };
          TypeIds.boolean = {
            id: 3,
            size: 4,
            getter: "getInt32",
            setter: "setInt32"
          };
          TypeIds.string = { id: 4 };
          const getTypeId = (v2) => TypeIds[typeof v2] || toss("Maintenance required: this value type cannot be serialized.", v2);
          const getTypeIdById = (tid) => {
            switch (tid) {
              case TypeIds.number.id:
                return TypeIds.number;
              case TypeIds.bigint.id:
                return TypeIds.bigint;
              case TypeIds.boolean.id:
                return TypeIds.boolean;
              case TypeIds.string.id:
                return TypeIds.string;
              default:
                toss("Invalid type ID:", tid);
            }
          };
          state.s11n.deserialize = function(clear = false) {
            performance.now();
            const argc = viewU8[0];
            const rc = argc ? [] : null;
            if (argc) {
              const typeIds = [];
              let offset = 1, i2, n, v2;
              for (i2 = 0; i2 < argc; ++i2, ++offset) typeIds.push(getTypeIdById(viewU8[offset]));
              for (i2 = 0; i2 < argc; ++i2) {
                const t = typeIds[i2];
                if (t.getter) {
                  v2 = viewDV[t.getter](offset, state.littleEndian);
                  offset += t.size;
                } else {
                  n = viewDV.getInt32(offset, state.littleEndian);
                  offset += 4;
                  v2 = textDecoder.decode(viewU8.slice(offset, offset + n));
                  offset += n;
                }
                rc.push(v2);
              }
            }
            if (clear) viewU8[0] = 0;
            return rc;
          };
          state.s11n.serialize = function(...args) {
            performance.now();
            if (args.length) {
              const typeIds = [];
              let i2 = 0, offset = 1;
              viewU8[0] = args.length & 255;
              for (; i2 < args.length; ++i2, ++offset) {
                typeIds.push(getTypeId(args[i2]));
                viewU8[offset] = typeIds[i2].id;
              }
              for (i2 = 0; i2 < args.length; ++i2) {
                const t = typeIds[i2];
                if (t.setter) {
                  viewDV[t.setter](offset, args[i2], state.littleEndian);
                  offset += t.size;
                } else {
                  const s = textEncoder.encode(args[i2]);
                  viewDV.setInt32(offset, s.byteLength, state.littleEndian);
                  offset += 4;
                  viewU8.set(s, offset);
                  offset += s.byteLength;
                }
              }
            } else viewU8[0] = 0;
          };
          return state.s11n;
        };
        opfsVfs.initS11n = initS11n;
        opfsVfs.bindVfs = function(ioMethods, callback) {
          Object.assign(opfsVfs.ioSyncWrappers, ioMethods);
          return new Promise(function(promiseResolve_, promiseReject_) {
            let promiseWasRejected = void 0;
            const promiseReject = (err3) => {
              promiseWasRejected = true;
              opfsVfs.dispose();
              return promiseReject_(err3);
            };
            const promiseResolve = () => {
              try {
                callback(sqlite3, opfsVfs);
              } catch (e) {
                return promiseReject(e);
              }
              promiseWasRejected = false;
              return promiseResolve_(sqlite3);
            };
            const options2 = opfsUtil.options;
            const W = opfsVfs.worker = (() => {
              const url = new URL("sqlite3-opfs-async-proxy.js", import.meta.url);
              url.searchParams.set("vfs", vfsName);
              return new Worker(url.toString());
            })();
            let zombieTimer = setTimeout(() => {
              if (void 0 === promiseWasRejected) promiseReject(/* @__PURE__ */ new Error("Timeout while waiting for OPFS async proxy worker."));
            }, 4e3);
            W._originalOnError = W.onerror;
            W.onerror = function(err3) {
              error("Error initializing OPFS asyncer:", err3);
              promiseReject(/* @__PURE__ */ new Error("Loading OPFS async Worker failed for unknown reasons."));
            };
            opfsVfs.opRun;
            const sanityCheck = function() {
              const scope = wasm.scopedAllocPush();
              const sq3File = new capi.sqlite3_file();
              try {
                const fid = sq3File.pointer;
                const openFlags = capi.SQLITE_OPEN_CREATE | capi.SQLITE_OPEN_READWRITE | capi.SQLITE_OPEN_MAIN_DB;
                const pOut = wasm.scopedAlloc(8);
                const dbFile = "/sanity/check/file" + opfsUtil.randomFilename(8);
                const zDbFile = wasm.scopedAllocCString(dbFile);
                let rc;
                state.s11n.serialize("This is \xE4 string.");
                rc = state.s11n.deserialize();
                log("deserialize() says:", rc);
                if ("This is \xE4 string." !== rc[0]) toss("String d13n error.");
                opfsVfs.vfsSyncWrappers.xAccess(opfsVfs.pointer, zDbFile, 0, pOut);
                rc = wasm.peek(pOut, "i32");
                log("xAccess(", dbFile, ") exists ?=", rc);
                rc = opfsVfs.vfsSyncWrappers.xOpen(opfsVfs.pointer, zDbFile, fid, openFlags, pOut);
                log("open rc =", rc, "state.sabOPView[xOpen] =", state.sabOPView[state.opIds.xOpen]);
                if (0 !== rc) {
                  error("open failed with code", rc);
                  return;
                }
                opfsVfs.vfsSyncWrappers.xAccess(opfsVfs.pointer, zDbFile, 0, pOut);
                rc = wasm.peek(pOut, "i32");
                if (!rc) toss("xAccess() failed to detect file.");
                rc = opfsVfs.ioSyncWrappers.xSync(sq3File.pointer, 0);
                if (rc) toss("sync failed w/ rc", rc);
                rc = opfsVfs.ioSyncWrappers.xTruncate(sq3File.pointer, 1024);
                if (rc) toss("truncate failed w/ rc", rc);
                wasm.poke(pOut, 0, "i64");
                rc = opfsVfs.ioSyncWrappers.xFileSize(sq3File.pointer, pOut);
                if (rc) toss("xFileSize failed w/ rc", rc);
                log("xFileSize says:", wasm.peek(pOut, "i64"));
                rc = opfsVfs.ioSyncWrappers.xWrite(sq3File.pointer, zDbFile, 10, 1);
                if (rc) toss("xWrite() failed!");
                const readBuf = wasm.scopedAlloc(16);
                rc = opfsVfs.ioSyncWrappers.xRead(sq3File.pointer, readBuf, 6, 2);
                wasm.poke(readBuf + 6, 0);
                let jRead = wasm.cstrToJs(readBuf);
                log("xRead() got:", jRead);
                if ("sanity" !== jRead) toss("Unexpected xRead() value.");
                if (opfsVfs.vfsSyncWrappers.xSleep) {
                  log("xSleep()ing before close()ing...");
                  opfsVfs.vfsSyncWrappers.xSleep(opfsVfs.pointer, 2e3);
                  log("waking up from xSleep()");
                }
                rc = opfsVfs.ioSyncWrappers.xClose(fid);
                log("xClose rc =", rc, "sabOPView =", state.sabOPView);
                log("Deleting file:", dbFile);
                opfsVfs.vfsSyncWrappers.xDelete(opfsVfs.pointer, zDbFile, 4660);
                opfsVfs.vfsSyncWrappers.xAccess(opfsVfs.pointer, zDbFile, 0, pOut);
                rc = wasm.peek(pOut, "i32");
                if (rc) toss("Expecting 0 from xAccess(", dbFile, ") after xDelete().");
                warn("End of OPFS sanity checks.");
              } finally {
                sq3File.dispose();
                wasm.scopedAllocPop(scope);
              }
            };
            W.onmessage = function({ data }) {
              switch (data.type) {
                case "opfs-unavailable":
                  promiseReject(new Error(data.payload.join(" ")));
                  break;
                case "opfs-async-loaded":
                  delete state.vfs;
                  W.postMessage({
                    type: "opfs-async-init",
                    args: util.nu(state)
                  });
                  break;
                case "opfs-async-inited":
                  if (true === promiseWasRejected) break;
                  clearTimeout(zombieTimer);
                  zombieTimer = null;
                  try {
                    sqlite3.vfs.installVfs({
                      io: {
                        struct: opfsVfs.ioMethods,
                        methods: opfsVfs.ioSyncWrappers
                      },
                      vfs: {
                        struct: opfsVfs,
                        methods: opfsVfs.vfsSyncWrappers
                      }
                    });
                    state.sabOPView = new Int32Array(state.sabOP);
                    state.sabFileBufView = new Uint8Array(state.sabIO, 0, state.fileBufferSize);
                    state.sabS11nView = new Uint8Array(state.sabIO, state.sabS11nOffset, state.sabS11nSize);
                    opfsVfs.initS11n();
                    opfsVfs.initS11n = null;
                    if (options2.sanityChecks) {
                      warn("Running sanity checks because of opfs-sanity-check URL arg...");
                      sanityCheck();
                    }
                    if (opfsUtil.thisThreadHasOPFS()) opfsUtil.getRootDir().then((d) => {
                      W.onerror = W._originalOnError;
                      delete W._originalOnError;
                      log("End of OPFS sqlite3_vfs setup.", opfsVfs);
                      promiseResolve();
                    }).catch(promiseReject);
                    else promiseResolve();
                  } catch (e) {
                    error(e);
                    promiseReject(e);
                  }
                  break;
                case "debug":
                  warn("debug message from worker:", data);
                  break;
                default: {
                  const errMsg = "Unexpected message from the OPFS async worker: " + JSON.stringify(data);
                  error(errMsg);
                  promiseReject(new Error(errMsg));
                  break;
                }
              }
            };
          });
        };
        return state;
      };
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      if (!sqlite3.opfs || sqlite3.config.disable?.vfs?.opfs) return;
      const util = sqlite3.util, opfsUtil = sqlite3.opfs || sqlite3.util.toss("Missing sqlite3.opfs");
      const installOpfsVfs = async function(options) {
        options = opfsUtil.initOptions("opfs", options);
        if (!options) return sqlite3;
        const capi = sqlite3.capi, opfsVfs = opfsUtil.createVfsState().vfs, metrics = opfsVfs.metrics.counters, mTimeStart = opfsVfs.mTimeStart, mTimeEnd = opfsVfs.mTimeEnd, opRun = opfsVfs.opRun, __openFiles = opfsVfs.__openFiles;
        return opfsVfs.bindVfs(util.nu({
          xLock: function(pFile, lockType) {
            mTimeStart("xLock");
            ++metrics.xLock.count;
            const f = __openFiles[pFile];
            let rc = 0;
            if (f.lockType) f.lockType = lockType;
            else {
              rc = opRun("xLock", pFile, lockType);
              if (0 === rc) f.lockType = lockType;
            }
            mTimeEnd();
            return rc;
          },
          xUnlock: function(pFile, lockType) {
            mTimeStart("xUnlock");
            ++metrics.xUnlock.count;
            const f = __openFiles[pFile];
            let rc = 0;
            if (capi.SQLITE_LOCK_NONE === lockType && f.lockType) rc = opRun("xUnlock", pFile, lockType);
            if (0 === rc) f.lockType = lockType;
            mTimeEnd();
            return rc;
          }
        }), function(sqlite32, vfs) {
          if (sqlite32.oo1) {
            const OpfsDb = function(...args) {
              const opt = sqlite32.oo1.DB.dbCtorHelper.normalizeArgs(...args);
              opt.vfs = vfs.$zName;
              sqlite32.oo1.DB.dbCtorHelper.call(this, opt);
            };
            OpfsDb.prototype = Object.create(sqlite32.oo1.DB.prototype);
            sqlite32.oo1.OpfsDb = OpfsDb;
            OpfsDb.importDb = opfsUtil.importDb;
            sqlite32.oo1.DB.dbCtorHelper.setVfsPostOpenCallback(opfsVfs.pointer, function(oo1Db, sqlite33) {
              sqlite33.capi.sqlite3_busy_timeout(oo1Db, 1e4);
            });
          }
        });
      };
      globalThis.sqlite3ApiBootstrap.initializersAsync.push(async (sqlite32) => {
        return installOpfsVfs().catch((e) => {
          sqlite32.config.warn("Ignoring inability to install 'opfs' sqlite3_vfs:", e);
        });
      });
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      "use strict";
      if (sqlite3.config.disable?.vfs?.["opfs-sahpool"]) return;
      const toss = sqlite3.util.toss;
      const toss3 = sqlite3.util.toss3;
      const initPromises = /* @__PURE__ */ Object.create(null);
      const capi = sqlite3.capi;
      const util = sqlite3.util;
      const wasm = sqlite3.wasm;
      const SECTOR_SIZE = 4096;
      const HEADER_MAX_PATH_SIZE = 512;
      const HEADER_DIGEST_SIZE = 8;
      const HEADER_CORPUS_SIZE = 516;
      const HEADER_OFFSET_FLAGS = HEADER_MAX_PATH_SIZE;
      const HEADER_OFFSET_DIGEST = HEADER_CORPUS_SIZE;
      const HEADER_OFFSET_DATA = SECTOR_SIZE;
      const PERSISTENT_FILE_TYPES = capi.SQLITE_OPEN_MAIN_DB | capi.SQLITE_OPEN_MAIN_JOURNAL | capi.SQLITE_OPEN_SUPER_JOURNAL | capi.SQLITE_OPEN_WAL;
      const FLAG_COMPUTE_DIGEST_V2 = capi.SQLITE_OPEN_MEMORY;
      const OPAQUE_DIR_NAME = ".opaque";
      const getRandomName = () => Math.random().toString(36).slice(2);
      const textDecoder = new TextDecoder();
      const textEncoder = new TextEncoder();
      const optionDefaults = Object.assign(/* @__PURE__ */ Object.create(null), {
        name: "opfs-sahpool",
        directory: void 0,
        initialCapacity: 6,
        clearOnInit: false,
        verbosity: 2,
        forceReinitIfPreviouslyFailed: false,
        preserveOnInitFailure: false
      });
      const loggers = [
        sqlite3.config.error,
        sqlite3.config.warn,
        sqlite3.config.log
      ];
      sqlite3.config.log;
      const warn = sqlite3.config.warn;
      sqlite3.config.error;
      const __mapVfsToPool = /* @__PURE__ */ new Map();
      const getPoolForVfs = (pVfs) => __mapVfsToPool.get(pVfs);
      const setPoolForVfs = (pVfs, pool) => {
        if (pool) __mapVfsToPool.set(pVfs, pool);
        else __mapVfsToPool.delete(pVfs);
      };
      const __mapSqlite3File = /* @__PURE__ */ new Map();
      const getPoolForPFile = (pFile) => __mapSqlite3File.get(pFile);
      const setPoolForPFile = (pFile, pool) => {
        if (pool) __mapSqlite3File.set(pFile, pool);
        else __mapSqlite3File.delete(pFile);
      };
      const ioMethods = {
        xCheckReservedLock: function(pFile, pOut) {
          const pool = getPoolForPFile(pFile);
          pool.log("xCheckReservedLock");
          pool.storeErr();
          const file = pool.getOFileForS3File(pFile);
          wasm.poke32(pOut, pool.hasReservedLock(file.path) ? 1 : 0);
          return 0;
        },
        xClose: function(pFile) {
          const pool = getPoolForPFile(pFile);
          pool.storeErr();
          const file = pool.getOFileForS3File(pFile);
          if (file) try {
            pool.log(`xClose ${file.path}`);
            pool.unlockFile(file, capi.SQLITE_LOCK_NONE);
            pool.mapS3FileToOFile(pFile, false);
            file.sah.flush();
            if (file.flags & capi.SQLITE_OPEN_DELETEONCLOSE) pool.deletePath(file.path);
          } catch (e) {
            return pool.storeErr(e, capi.SQLITE_IOERR);
          }
          return 0;
        },
        xDeviceCharacteristics: function(pFile) {
          return capi.SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN;
        },
        xFileControl: function(pFile, opId, pArg) {
          return capi.SQLITE_NOTFOUND;
        },
        xFileSize: function(pFile, pSz64) {
          const pool = getPoolForPFile(pFile);
          pool.log(`xFileSize`);
          const size = pool.getOFileForS3File(pFile).sah.getSize() - HEADER_OFFSET_DATA;
          wasm.poke64(pSz64, BigInt(size));
          return 0;
        },
        xLock: function(pFile, lockType) {
          const pool = getPoolForPFile(pFile);
          pool.log(`xLock ${lockType}`);
          pool.storeErr();
          const file = pool.getOFileForS3File(pFile);
          return pool.lockFile(file, lockType);
        },
        xRead: function(pFile, pDest, n, offset64) {
          const pool = getPoolForPFile(pFile);
          pool.storeErr();
          const file = pool.getOFileForS3File(pFile);
          pool.log(`xRead ${file.path} ${n} @ ${offset64}`);
          try {
            const nRead = file.sah.read(wasm.heap8u().subarray(Number(pDest), Number(pDest) + n), { at: HEADER_OFFSET_DATA + Number(offset64) });
            if (nRead < n) {
              wasm.heap8u().fill(0, Number(pDest) + nRead, Number(pDest) + n);
              return capi.SQLITE_IOERR_SHORT_READ;
            }
            return 0;
          } catch (e) {
            return pool.storeErr(e, capi.SQLITE_IOERR);
          }
        },
        xSectorSize: function(pFile) {
          return SECTOR_SIZE;
        },
        xSync: function(pFile, flags) {
          const pool = getPoolForPFile(pFile);
          pool.log(`xSync ${flags}`);
          pool.storeErr();
          const file = pool.getOFileForS3File(pFile);
          try {
            file.sah.flush();
            return 0;
          } catch (e) {
            return pool.storeErr(e, capi.SQLITE_IOERR);
          }
        },
        xTruncate: function(pFile, sz64) {
          const pool = getPoolForPFile(pFile);
          pool.log(`xTruncate ${sz64}`);
          pool.storeErr();
          const file = pool.getOFileForS3File(pFile);
          try {
            file.sah.truncate(HEADER_OFFSET_DATA + Number(sz64));
            return 0;
          } catch (e) {
            return pool.storeErr(e, capi.SQLITE_IOERR);
          }
        },
        xUnlock: function(pFile, lockType) {
          const pool = getPoolForPFile(pFile);
          pool.log("xUnlock");
          const file = pool.getOFileForS3File(pFile);
          pool.unlockFile(file, lockType);
          return 0;
        },
        xWrite: function(pFile, pSrc, n, offset64) {
          const pool = getPoolForPFile(pFile);
          pool.storeErr();
          const file = pool.getOFileForS3File(pFile);
          pool.log(`xWrite ${file.path} ${n} ${offset64}`);
          try {
            return n === file.sah.write(wasm.heap8u().subarray(Number(pSrc), Number(pSrc) + n), { at: HEADER_OFFSET_DATA + Number(offset64) }) ? 0 : toss("Unknown write() failure.");
          } catch (e) {
            return pool.storeErr(e, capi.SQLITE_IOERR);
          }
        }
      };
      const opfsIoMethods = new capi.sqlite3_io_methods();
      opfsIoMethods.$iVersion = 1;
      sqlite3.vfs.installVfs({ io: {
        struct: opfsIoMethods,
        methods: ioMethods
      } });
      const vfsMethods = {
        xAccess: function(pVfs, zName, flags, pOut) {
          const pool = getPoolForVfs(pVfs);
          pool.storeErr();
          try {
            const name = pool.getPath(zName);
            wasm.poke32(pOut, pool.hasFilename(name) ? 1 : 0);
          } catch (e) {
            wasm.poke32(pOut, 0);
          }
          return 0;
        },
        xCurrentTime: function(pVfs, pOut) {
          wasm.poke(pOut, 24405875e-1 + (/* @__PURE__ */ new Date()).getTime() / 864e5, "double");
          return 0;
        },
        xCurrentTimeInt64: function(pVfs, pOut) {
          wasm.poke(pOut, 21086676e7 + (/* @__PURE__ */ new Date()).getTime(), "i64");
          return 0;
        },
        xDelete: function(pVfs, zName, doSyncDir) {
          const pool = getPoolForVfs(pVfs);
          pool.log(`xDelete ${wasm.cstrToJs(zName)}`);
          pool.storeErr();
          try {
            pool.deletePath(pool.getPath(zName));
            return 0;
          } catch (e) {
            pool.storeErr(e);
            return capi.SQLITE_IOERR_DELETE;
          }
        },
        xFullPathname: function(pVfs, zName, nOut, pOut) {
          return wasm.cstrncpy(pOut, zName, nOut) < nOut ? 0 : capi.SQLITE_CANTOPEN;
        },
        xGetLastError: function(pVfs, nOut, pOut) {
          const pool = getPoolForVfs(pVfs);
          const e = pool.popErr();
          pool.log(`xGetLastError ${nOut} e =`, e);
          if (e) {
            const scope = wasm.scopedAllocPush();
            try {
              const [cMsg, n] = wasm.scopedAllocCString(e.message, true);
              wasm.cstrncpy(pOut, cMsg, nOut);
              if (n > nOut) wasm.poke8(wasm.ptr.add(pOut, nOut, -1), 0);
            } catch (e2) {
              return capi.SQLITE_NOMEM;
            } finally {
              wasm.scopedAllocPop(scope);
            }
          }
          return e ? e.sqlite3Rc || capi.SQLITE_IOERR : 0;
        },
        xOpen: function f(pVfs, zName, pFile, flags, pOutFlags) {
          const pool = getPoolForVfs(pVfs);
          try {
            flags &= ~FLAG_COMPUTE_DIGEST_V2;
            pool.log(`xOpen ${wasm.cstrToJs(zName)} ${flags}`);
            const path = zName && wasm.peek8(zName) ? pool.getPath(zName) : getRandomName();
            let sah = pool.getSAHForPath(path);
            if (sah && flags & capi.SQLITE_OPEN_CREATE && flags & capi.SQLITE_OPEN_EXCLUSIVE) toss("file already exists:", path);
            if (!sah && flags & capi.SQLITE_OPEN_CREATE) {
              if (pool.getFileCount() < pool.getCapacity()) {
                sah = pool.nextAvailableSAH();
                pool.setAssociatedPath(sah, path, flags);
              } else toss("SAH pool is full. Cannot create file", path);
            }
            if (!sah) toss("file not found:", path);
            const file = {
              path,
              flags,
              sah
            };
            pool.mapS3FileToOFile(pFile, file);
            file.lockType = capi.SQLITE_LOCK_NONE;
            const sq3File = new capi.sqlite3_file(pFile);
            sq3File.$pMethods = opfsIoMethods.pointer;
            sq3File.dispose();
            wasm.poke32(pOutFlags, flags);
            return 0;
          } catch (e) {
            pool.storeErr(e);
            return capi.SQLITE_CANTOPEN;
          }
        }
      };
      const createOpfsVfs = function(vfsName) {
        if (sqlite3.capi.sqlite3_vfs_find(vfsName)) toss3("VFS name is already registered:", vfsName);
        const opfsVfs = new capi.sqlite3_vfs();
        const pDVfs = capi.sqlite3_vfs_find(null);
        const dVfs = pDVfs ? new capi.sqlite3_vfs(pDVfs) : null;
        opfsVfs.$iVersion = 2;
        opfsVfs.$szOsFile = capi.sqlite3_file.structInfo.sizeof;
        opfsVfs.$mxPathname = HEADER_MAX_PATH_SIZE;
        opfsVfs.addOnDispose(opfsVfs.$zName = wasm.allocCString(vfsName), () => setPoolForVfs(opfsVfs.pointer, 0));
        if (dVfs) {
          opfsVfs.$xRandomness = dVfs.$xRandomness;
          dVfs.dispose();
        }
        if (!opfsVfs.$xRandomness && !vfsMethods.xRandomness) vfsMethods.xRandomness = function(pVfs, nOut, pOut) {
          const heap = wasm.heap8u();
          let i2 = 0;
          const npOut = Number(pOut);
          for (; i2 < nOut; ++i2) heap[npOut + i2] = Math.random() * 255e3 & 255;
          return i2;
        };
        vfsMethods.xSleep = (pVfs, ms) => 0;
        sqlite3.vfs.installVfs({ vfs: {
          struct: opfsVfs,
          methods: vfsMethods
        } });
        return opfsVfs;
      };
      class OpfsSAHPool {
        vfsDir;
        #dhVfsRoot;
        #dhOpaque;
        #dhVfsParent;
        #mapSAHToName = /* @__PURE__ */ new Map();
        #mapFilenameToSAH = /* @__PURE__ */ new Map();
        #availableSAH = /* @__PURE__ */ new Set();
        #mapS3FileToOFile = /* @__PURE__ */ new Map();
        #mapPathToLock = /* @__PURE__ */ new Map();
        /** Buffer used by [sg]etAssociatedPath(). */
        #apBody = new Uint8Array(HEADER_CORPUS_SIZE);
        #dvBody;
        #cVfs;
        #verbosity;
        /**
        Options are documented in installOpfsSAHPoolVfs().
        */
        constructor(options = /* @__PURE__ */ Object.create(null)) {
          this.#verbosity = options.verbosity ?? optionDefaults.verbosity;
          this.vfsName = options.name || optionDefaults.name;
          this.#cVfs = createOpfsVfs(this.vfsName);
          setPoolForVfs(this.#cVfs.pointer, this);
          this.vfsDir = options.directory || "." + this.vfsName;
          this.#dvBody = new DataView(this.#apBody.buffer, this.#apBody.byteOffset);
          this.isReady = this.reset(!!(options.clearOnInit ?? optionDefaults.clearOnInit)).then(() => {
            if (this.$error) throw this.$error;
            return this.getCapacity() ? Promise.resolve(void 0) : this.addCapacity(options.initialCapacity || optionDefaults.initialCapacity);
          });
        }
        #logImpl(level, ...args) {
          if (this.#verbosity > level) loggers[level](this.vfsName + ":", ...args);
        }
        log(...args) {
          this.#logImpl(2, ...args);
        }
        warn(...args) {
          this.#logImpl(1, ...args);
        }
        error(...args) {
          this.#logImpl(0, ...args);
        }
        getVfs() {
          return this.#cVfs;
        }
        getCapacity() {
          return this.#mapSAHToName.size;
        }
        getFileCount() {
          return this.#mapFilenameToSAH.size;
        }
        getFileNames() {
          const rc = [];
          for (const n of this.#mapFilenameToSAH.keys()) rc.push(n);
          return rc;
        }
        /**
        Adds n files to the pool's capacity. This change is
        persistent across settings. Returns a Promise which resolves
        to the new capacity.
        */
        async addCapacity(n) {
          for (let i2 = 0; i2 < n; ++i2) {
            const name = getRandomName();
            const ah = await (await this.#dhOpaque.getFileHandle(name, { create: true })).createSyncAccessHandle();
            this.#mapSAHToName.set(ah, name);
            this.setAssociatedPath(ah, "", 0);
          }
          return this.getCapacity();
        }
        /**
        Reduce capacity by n, but can only reduce up to the limit of
        currently-available SAHs. Returns a Promise which resolves to
        the number of slots really removed. Throws if removal of an
        OPFS filesystem entry fails for any reason, in which case the
        VFS itself is left in a well-defined state, possibly partially
        reduced in capacity compared to before this call, but the file
        which was unable to be removed is in an undefined state. It may
        be orphaned and/or later recycled.
        
        As of 3.54, throws if n is an invalid value. Prior to that
        an invalid value could cause it to remove all entries.
        */
        async reduceCapacity(n) {
          if (!Number.isSafeInteger(n) || n < 0) toss("Invalid capacity reduction:", n);
          let nRm = 0;
          for (const ah of Array.from(this.#availableSAH)) {
            if (nRm === n || this.getFileCount() === this.getCapacity()) break;
            const name = this.#mapSAHToName.get(ah);
            ah.close();
            this.#mapSAHToName.delete(ah);
            this.#availableSAH.delete(ah);
            await this.#dhOpaque.removeEntry(name);
            ++nRm;
          }
          return nRm;
        }
        /**
        Releases all currently-opened SAHs. The only legal operation
        after this is acquireAccessHandles() or (if this is called from
        pauseVfs()) either of isPaused() or unpauseVfs().
        */
        releaseAccessHandles() {
          for (const ah of this.#mapSAHToName.keys()) ah.close();
          this.#mapSAHToName.clear();
          this.#mapFilenameToSAH.clear();
          this.#availableSAH.clear();
          this.#mapS3FileToOFile.clear();
          this.#mapPathToLock.clear();
        }
        /**
        Opens all files under this.vfsDir/this.#dhOpaque and acquires a
        SAH for each. Returns a Promise which resolves to no value but
        completes once all SAHs are acquired. If acquiring an SAH
        throws, this.$error will contain the corresponding Error
        object.
        
        If it throws, it waits for every pending acquisition to settle,
        then releases all SAHs it acquired, leaving the VFS in a
        well-defined but unusable state.
        
        If clearFiles is true, the client-stored state of each file is
        cleared when its handle is acquired, including its name, flags,
        and any data stored after the metadata block.
        */
        async acquireAccessHandles(clearFiles = false) {
          const files2 = [];
          for await (const [name, h] of this.#dhOpaque) if ("file" === h.kind) files2.push([name, h]);
          const failure = (await Promise.allSettled(files2.map(async ([name, h]) => {
            const ah = await h.createSyncAccessHandle();
            this.#mapSAHToName.set(ah, name);
            if (clearFiles) {
              ah.truncate(HEADER_OFFSET_DATA);
              this.setAssociatedPath(ah, "", 0);
            } else {
              const path = this.getAssociatedPath(ah);
              if (path) this.#mapFilenameToSAH.set(path, ah);
              else this.#availableSAH.add(ah);
            }
          }))).find((r) => "rejected" === r.status);
          if (failure) {
            this.storeErr(failure.reason);
            this.releaseAccessHandles();
            throw failure.reason;
          }
        }
        /**
        Given an SAH, returns the client-specified name of
        that file by extracting it from the SAH's header.
        
        On error, it disassociates SAH from the pool and
        returns an empty string.
        */
        getAssociatedPath(sah) {
          sah.read(this.#apBody, { at: 0 });
          const flags = this.#dvBody.getUint32(HEADER_OFFSET_FLAGS);
          if (this.#apBody[0] && (flags & capi.SQLITE_OPEN_DELETEONCLOSE || (flags & PERSISTENT_FILE_TYPES) === 0)) {
            warn(`Removing file with unexpected flags ${flags.toString(16)}`, this.#apBody);
            this.setAssociatedPath(sah, "", 0);
            return "";
          }
          const fileDigest = new Uint32Array(HEADER_DIGEST_SIZE / 4);
          sah.read(fileDigest, { at: HEADER_OFFSET_DIGEST });
          const compDigest = this.computeDigest(this.#apBody, flags);
          if (fileDigest.every((v2, i2) => v2 === compDigest[i2])) {
            const pathBytes = this.#apBody.findIndex((v2) => 0 === v2);
            if (0 === pathBytes) sah.truncate(HEADER_OFFSET_DATA);
            return pathBytes ? textDecoder.decode(this.#apBody.subarray(0, pathBytes)) : "";
          } else {
            warn("Disassociating file with bad digest.");
            this.setAssociatedPath(sah, "", 0);
            return "";
          }
        }
        /**
        Stores the given client-defined path and SQLITE_OPEN_xyz flags
        into the given SAH. If path is an empty string then the file is
        disassociated from the pool but its previous name is preserved
        in the metadata.
        
        If nameToRemove is truthy then it must be the "old" name when path
        is falsy. This function removes the mapping of that name to an
        SAH.
        */
        setAssociatedPath(sah, path, flags, nameToRemove) {
          const enc = textEncoder.encodeInto(path, this.#apBody);
          if (HEADER_MAX_PATH_SIZE <= enc.written + 1) toss("Path too long:", path);
          if (path && flags) flags |= FLAG_COMPUTE_DIGEST_V2;
          this.#apBody.fill(0, enc.written, HEADER_MAX_PATH_SIZE);
          this.#dvBody.setUint32(HEADER_OFFSET_FLAGS, flags);
          const digest = this.computeDigest(this.#apBody, flags);
          sah.write(this.#apBody, { at: 0 });
          if (nameToRemove) this.#mapFilenameToSAH.delete(nameToRemove);
          sah.write(digest, { at: HEADER_OFFSET_DIGEST });
          sah.flush();
          if (path) {
            this.#mapFilenameToSAH.set(path, sah);
            this.#availableSAH.delete(sah);
          } else {
            sah.truncate(HEADER_OFFSET_DATA);
            this.#availableSAH.add(sah);
          }
        }
        /**
        Computes a digest for the given byte array and returns it as a
        two-element Uint32Array. This digest gets stored in the
        metadata for each file as a validation check. Changing this
        algorithm invalidates all existing databases for this VFS, so
        don't do that.
        
        See the docs for FLAG_COMPUTE_DIGEST_V2 for more details.
        */
        computeDigest(byteArray, fileFlags) {
          if (fileFlags & FLAG_COMPUTE_DIGEST_V2) {
            let h1 = 3735928559;
            let h2 = 1103547991;
            for (const v2 of byteArray) {
              h1 = Math.imul(h1 ^ v2, 2654435761);
              h2 = Math.imul(h2 ^ v2, 104729);
            }
            return new Uint32Array([h1 >>> 0, h2 >>> 0]);
          } else return new Uint32Array([0, 0]);
        }
        /**
        Re-initializes the state of the SAH pool, releasing and
        re-acquiring all handles.
        
        See acquireAccessHandles() for the specifics of the clearFiles
        argument.
        */
        async reset(clearFiles) {
          await this.isReady;
          let h = await navigator.storage.getDirectory(), prev;
          for (const d of this.vfsDir.split("/")) if (d) {
            prev = h;
            h = await h.getDirectoryHandle(d, { create: true });
          }
          this.#dhVfsRoot = h;
          this.#dhVfsParent = prev;
          this.#dhOpaque = await this.#dhVfsRoot.getDirectoryHandle(OPAQUE_DIR_NAME, { create: true });
          this.releaseAccessHandles();
          return this.acquireAccessHandles(clearFiles);
        }
        /**
        Returns the pathname part of the given argument,
        which may be any of:
        
        - a URL object
        - A JS string representing a file name
        - Wasm C-string representing a file name
        
        All "../" parts and duplicate slashes are resolve/removed from
        the returned result.
        */
        getPath(arg) {
          if (wasm.isPtr(arg)) arg = wasm.cstrToJs(arg);
          return (arg instanceof URL ? arg : new URL(arg, "file://localhost/")).pathname;
        }
        /**
        Removes the association of the given client-specified file
        name (JS string) from the pool. Returns true if a mapping
        is found, else false.
        */
        deletePath(path) {
          const sah = this.#mapFilenameToSAH.get(path);
          if (sah) this.setAssociatedPath(sah, "", 0, path);
          return !!sah;
        }
        /**
        Sets e (an Error object) as this object's current error. Pass a
        falsy (or no) value to clear it. If code is truthy it is
        assumed to be an SQLITE_xxx result code, defaulting to
        SQLITE_IOERR if code is falsy.
        
        Returns the 2nd argument.
        */
        storeErr(e, code) {
          if (e) {
            e.sqlite3Rc = code || capi.SQLITE_IOERR;
            this.error(e);
          }
          this.$error = e;
          return code;
        }
        /**
        Pops this object's Error object and returns
        it (a falsy value if no error is set).
        */
        popErr() {
          const rc = this.$error;
          this.$error = void 0;
          return rc;
        }
        /**
        Returns the next available SAH without removing
        it from the set.
        */
        nextAvailableSAH() {
          const [rc] = this.#availableSAH.keys();
          return rc;
        }
        /**
        Given an (sqlite3_file*), returns the mapped
        xOpen file object.
        */
        getOFileForS3File(pFile) {
          return this.#mapS3FileToOFile.get(pFile);
        }
        /**
        Maps or unmaps (if file is falsy) the given (sqlite3_file*)
        to an xOpen file object and to this pool object.
        */
        mapS3FileToOFile(pFile, file) {
          if (file) {
            this.#mapS3FileToOFile.set(pFile, file);
            setPoolForPFile(pFile, this);
          } else {
            this.#mapS3FileToOFile.delete(pFile);
            setPoolForPFile(pFile, false);
          }
        }
        /**
        Returns true if the given client-defined file name is in this
        object's name-to-SAH map.
        */
        hasFilename(name) {
          return this.#mapFilenameToSAH.has(name);
        }
        /**
        Returns the SAH associated with the given
        client-defined file name.
        */
        getSAHForPath(path) {
          return this.#mapFilenameToSAH.get(path);
        }
        /**
        Removes this object's sqlite3_vfs registration and shuts down
        this object, releasing all handles, mappings, and whatnot,
        including deleting its data directory. There is currently no
        way to "revive" the object and reaquire its
        resources. Similarly, there is no recovery strategy if removal
        of any given SAH fails, so such errors are ignored by this
        function.
        
        This function is intended primarily for testing.
        
        Resolves to true if it did its job, false if the
        VFS has already been shut down.
        
        @see pauseVfs()
        @see unpauseVfs()
        */
        async removeVfs() {
          if (!this.#cVfs.pointer || !this.#dhOpaque) return false;
          capi.sqlite3_vfs_unregister(this.#cVfs.pointer);
          this.#cVfs.dispose();
          delete initPromises[this.vfsName];
          try {
            this.releaseAccessHandles();
            await this.#dhVfsRoot.removeEntry(OPAQUE_DIR_NAME, { recursive: true });
            this.#dhOpaque = void 0;
            await this.#dhVfsParent.removeEntry(this.#dhVfsRoot.name, { recursive: true });
            this.#dhVfsRoot = this.#dhVfsParent = void 0;
          } catch (e) {
            sqlite3.config.error(this.vfsName, "removeVfs() failed with no recovery strategy:", e);
          }
          return true;
        }
        /**
        "Pauses" this VFS by unregistering it from SQLite and
        relinquishing all open SAHs, leaving the associated files
        intact. If this object is already paused, this is a
        no-op. Returns this object.
        
        This function throws if SQLite has any opened file handles
        hosted by this VFS, as the alternative would be to invoke
        Undefined Behavior by closing file handles out from under the
        library. Similarly, automatically closing any database handles
        opened by this VFS would invoke Undefined Behavior in
        downstream code which is holding those pointers.
        
        If this function throws due to open file handles then it has
        no side effects. If the OPFS API throws while closing handles
        then the VFS is left in an undefined state.
        
        @see isPaused()
        @see unpauseVfs()
        */
        pauseVfs() {
          if (this.#mapS3FileToOFile.size > 0) sqlite3.SQLite3Error.toss(capi.SQLITE_MISUSE, "Cannot pause VFS", this.vfsName, "because it has opened files.");
          if (this.#mapSAHToName.size > 0) {
            capi.sqlite3_vfs_unregister(this.vfsName);
            this.releaseAccessHandles();
          }
          return this;
        }
        /**
        Returns true if this pool is currently paused else false.
        
        @see pauseVfs()
        @see unpauseVfs()
        */
        isPaused() {
          return 0 === this.#mapSAHToName.size;
        }
        /**
        "Unpauses" this VFS, reacquiring all SAH's and (if successful)
        re-registering it with SQLite. This is a no-op if the VFS is
        not currently paused.
        
        The returned Promise resolves to this object. See
        acquireAccessHandles() for how it behaves if it throws due to
        SAH acquisition failure.
        
        @see isPaused()
        @see pauseVfs()
        */
        async unpauseVfs() {
          if (0 === this.#mapSAHToName.size) return this.acquireAccessHandles(false).then(() => capi.sqlite3_vfs_register(this.#cVfs, 0), this);
          return this;
        }
        //! Documented elsewhere in this file.
        exportFile(name) {
          const sah = this.#mapFilenameToSAH.get(name) || toss("File not found:", name);
          const n = sah.getSize() - HEADER_OFFSET_DATA;
          const b = new Uint8Array(n > 0 ? n : 0);
          if (n > 0) {
            const nRead = sah.read(b, { at: HEADER_OFFSET_DATA });
            if (nRead != n) toss("Expected to read " + n + " bytes but read " + nRead + ".");
          }
          return b;
        }
        //! Impl for importDb() when its 2nd arg is a function.
        async importDbChunked(name, callback) {
          const sah = this.#mapFilenameToSAH.get(name) || this.nextAvailableSAH() || toss("No available handles to import to.");
          sah.truncate(0);
          let nWrote = 0, chunk, checkedHeader = false;
          try {
            while (void 0 !== (chunk = await callback())) {
              if (chunk instanceof ArrayBuffer) chunk = new Uint8Array(chunk);
              if (!checkedHeader && 0 === nWrote && chunk.byteLength >= 15) {
                util.affirmDbHeader(chunk);
                checkedHeader = true;
              }
              const n = sah.write(chunk, { at: HEADER_OFFSET_DATA + nWrote });
              if (n !== chunk.byteLength) toss("Expected to write " + chunk.byteLength + "bytes but wrote" + n + ".");
              nWrote += chunk.byteLength;
            }
            if (nWrote < 512 || 0 !== nWrote % 512) toss("Input size", nWrote, "is not correct for an SQLite database.");
            if (!checkedHeader) {
              const header = /* @__PURE__ */ new Uint8Array(20);
              sah.read(header, { at: HEADER_OFFSET_DATA });
              util.affirmDbHeader(header);
            }
            sah.write(new Uint8Array([1, 1]), { at: 4114 });
          } catch (e) {
            this.setAssociatedPath(sah, "", 0);
            throw e;
          }
          this.setAssociatedPath(sah, name, capi.SQLITE_OPEN_MAIN_DB);
          return nWrote;
        }
        //! Documented elsewhere in this file.
        importDb(name, bytes) {
          if (bytes instanceof ArrayBuffer) bytes = new Uint8Array(bytes);
          else if (bytes instanceof Function) return this.importDbChunked(name, bytes);
          util.affirmIsDb(bytes);
          const sah = this.#mapFilenameToSAH.get(name) || this.nextAvailableSAH() || toss("No available handles to import to.");
          const n = bytes.byteLength;
          const nWrote = sah.write(bytes, { at: HEADER_OFFSET_DATA });
          if (nWrote != n) {
            this.setAssociatedPath(sah, "", 0);
            toss("Expected to write " + n + " bytes but wrote " + nWrote + ".");
          } else {
            sah.truncate(HEADER_OFFSET_DATA + n);
            sah.write(new Uint8Array([1, 1]), { at: 4114 });
            this.setAssociatedPath(sah, name, capi.SQLITE_OPEN_MAIN_DB);
          }
          return nWrote;
        }
        /**
        Returns true if any (sqlite3_file*) currently opened by this
        pool using the given client-provided file name (as distinct from
        its opaque name) holds a RESERVED or greater lock, else false.
        */
        hasReservedLock(filename) {
          const lk = this.#mapPathToLock.get(filename);
          return !!lk && lk.lockType > capi.SQLITE_LOCK_SHARED;
        }
        /**
        Implements xLock() for the given xOpen-generated file object.
        This pool holds its SAHs exclusively, so its xOpen() represent
        the only connections to a given file. The locks are held
        separately from their file object in the same thread the same
        way in which os_unix.c:unixLock() distinguishes multiple
        connections of a single process which share an inode: a lock
        which conflicts with another connection's lock fails with
        SQLITE_BUSY, and a failed attempt to get from RESERVED to
        EXCLUSIVE leaves a PENDING lock, which admits no new SHARED
        locks.
        */
        lockFile(file, lockType) {
          if (file.lockType >= lockType) return 0;
          let lk = this.#mapPathToLock.get(file.path);
          if (!lk) {
            lk = Object.assign(/* @__PURE__ */ Object.create(null), {
              nShared: 0,
              lockType: capi.SQLITE_LOCK_NONE
            });
            this.#mapPathToLock.set(file.path, lk);
          }
          if (file.lockType !== lk.lockType && (lk.lockType >= capi.SQLITE_LOCK_PENDING || lockType > capi.SQLITE_LOCK_SHARED)) return capi.SQLITE_BUSY;
          if (lockType === capi.SQLITE_LOCK_SHARED) {
            ++lk.nShared;
            if (lk.lockType === capi.SQLITE_LOCK_NONE) lk.lockType = lockType;
          } else if (lockType === capi.SQLITE_LOCK_EXCLUSIVE && lk.nShared > 1) {
            if (file.lockType === capi.SQLITE_LOCK_RESERVED) file.lockType = lk.lockType = capi.SQLITE_LOCK_PENDING;
            return capi.SQLITE_BUSY;
          } else lk.lockType = lockType;
          file.lockType = lockType;
          return 0;
        }
        /** Implements xUnlock() for the given xOpen file object. */
        unlockFile(file, lockType) {
          if (file.lockType <= lockType) return;
          const lk = this.#mapPathToLock.get(file.path);
          if (file.lockType > capi.SQLITE_LOCK_SHARED) lk.lockType = capi.SQLITE_LOCK_SHARED;
          if (lockType === capi.SQLITE_LOCK_NONE && 0 === --lk.nShared) this.#mapPathToLock.delete(file.path);
          file.lockType = lockType;
        }
      }
      class OpfsSAHPoolUtil {
        #p;
        constructor(sahPool) {
          this.#p = sahPool;
          this.vfsName = sahPool.vfsName;
        }
        async addCapacity(n) {
          return this.#p.addCapacity(n);
        }
        async reduceCapacity(n) {
          return this.#p.reduceCapacity(n);
        }
        getCapacity() {
          return this.#p.getCapacity(this.#p);
        }
        getFileCount() {
          return this.#p.getFileCount();
        }
        getFileNames() {
          return this.#p.getFileNames();
        }
        async reserveMinimumCapacity(min) {
          const c = this.#p.getCapacity();
          return c < min ? this.#p.addCapacity(min - c) : c;
        }
        exportFile(name) {
          return this.#p.exportFile(name);
        }
        importDb(name, bytes) {
          return this.#p.importDb(name, bytes);
        }
        async wipeFiles() {
          return this.#p.reset(true);
        }
        unlink(filename) {
          return this.#p.deletePath(filename);
        }
        async removeVfs() {
          return this.#p.removeVfs();
        }
        pauseVfs() {
          this.#p.pauseVfs();
          return this;
        }
        async unpauseVfs() {
          return this.#p.unpauseVfs().then(() => this);
        }
        isPaused() {
          return this.#p.isPaused();
        }
      }
      const apiVersionCheck = async () => {
        const dh = await navigator.storage.getDirectory();
        const fn = ".opfs-sahpool-sync-check-" + getRandomName();
        const close = (await (await dh.getFileHandle(fn, { create: true })).createSyncAccessHandle()).close();
        await close;
        await dh.removeEntry(fn);
        if (close?.then) toss("The local OPFS API is too old for opfs-sahpool:", "it has an async FileSystemSyncAccessHandle.close() method.");
        return true;
      };
      sqlite3.installOpfsSAHPoolVfs = async function(options = /* @__PURE__ */ Object.create(null)) {
        options = Object.assign(/* @__PURE__ */ Object.create(null), optionDefaults, options || {});
        const vfsName = options.name;
        if (options.$testThrowPhase1) throw options.$testThrowPhase1;
        if (initPromises[vfsName]) try {
          return await initPromises[vfsName];
        } catch (e) {
          if (options.forceReinitIfPreviouslyFailed) delete initPromises[vfsName];
          else throw e;
        }
        if (!globalThis.FileSystemHandle || !globalThis.FileSystemDirectoryHandle || !globalThis.FileSystemFileHandle || !globalThis.FileSystemFileHandle.prototype.createSyncAccessHandle || !navigator?.storage?.getDirectory) return initPromises[vfsName] = Promise.reject(/* @__PURE__ */ new Error("Missing required OPFS APIs."));
        const unregisterVfs = (thePool) => {
          const cVfs = thePool.getVfs();
          if (cVfs?.pointer) {
            capi.sqlite3_vfs_unregister(cVfs.pointer);
            cVfs.dispose();
            thePool.releaseAccessHandles();
          }
        };
        return initPromises[vfsName] = apiVersionCheck().then(async function() {
          if (options.$testThrowPhase2) throw options.$testThrowPhase2;
          const thePool = new OpfsSAHPool(options);
          return thePool.isReady.then(async () => {
            const poolUtil = new OpfsSAHPoolUtil(thePool);
            if (sqlite3.oo1) {
              const oo1 = sqlite3.oo1;
              const theVfs = thePool.getVfs();
              const OpfsSAHPoolDb = function(...args) {
                const opt = oo1.DB.dbCtorHelper.normalizeArgs(...args);
                opt.vfs = theVfs.$zName;
                oo1.DB.dbCtorHelper.call(this, opt);
              };
              OpfsSAHPoolDb.prototype = Object.create(oo1.DB.prototype);
              poolUtil.OpfsSAHPoolDb = OpfsSAHPoolDb;
            }
            thePool.log("VFS initialized.");
            return poolUtil;
          }).catch(async (e) => {
            if (options.preserveOnInitFailure) unregisterVfs(thePool);
            else await thePool.removeVfs().catch(() => {
            });
            throw e;
          });
        }).catch((err3) => {
          return initPromises[vfsName] = Promise.reject(err3);
        });
      };
    });
    globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3) {
      if (!sqlite3.opfs || sqlite3.config.disable?.vfs?.["opfs-wl"]) return;
      const util = sqlite3.util;
      sqlite3.util.toss;
      const opfsUtil = sqlite3.opfs;
      const vfsName = "opfs-wl";
      const installOpfsWlVfs = async function(options) {
        options = opfsUtil.initOptions(vfsName, options);
        if (!options) return sqlite3;
        sqlite3.capi;
        const opfsVfs = opfsUtil.createVfsState().vfs;
        opfsVfs.metrics.counters;
        const mTimeStart = opfsVfs.mTimeStart, mTimeEnd = opfsVfs.mTimeEnd, opRun = opfsVfs.opRun, __openFiles = opfsVfs.__openFiles;
        return opfsVfs.bindVfs(util.nu({
          xLock: function(pFile, lockType) {
            mTimeStart("xLock");
            const f = __openFiles[pFile];
            const rc = opRun("xLock", pFile, lockType);
            if (!rc) f.lockType = lockType;
            mTimeEnd();
            return rc;
          },
          xUnlock: function(pFile, lockType) {
            mTimeStart("xUnlock");
            const f = __openFiles[pFile];
            const rc = opRun("xUnlock", pFile, lockType);
            if (!rc) f.lockType = lockType;
            mTimeEnd();
            return rc;
          }
        }), function(sqlite32, vfs) {
          if (sqlite32.oo1) {
            const OpfsWlDb = function(...args) {
              const opt = sqlite32.oo1.DB.dbCtorHelper.normalizeArgs(...args);
              opt.vfs = vfs.$zName;
              sqlite32.oo1.DB.dbCtorHelper.call(this, opt);
            };
            OpfsWlDb.prototype = Object.create(sqlite32.oo1.DB.prototype);
            sqlite32.oo1.OpfsWlDb = OpfsWlDb;
            OpfsWlDb.importDb = opfsUtil.importDb;
          }
        });
      };
      globalThis.sqlite3ApiBootstrap.initializersAsync.push(async (sqlite32) => {
        return installOpfsWlVfs().catch((e) => {
          sqlite32.config.warn("Ignoring inability to install the", vfsName, "sqlite3_vfs:", e);
        });
      });
    });
    try {
      const bootstrapConfig = Object.assign(
        /* @__PURE__ */ Object.create(null),
        /** The WASM-environment-dependent configuration for sqlite3ApiBootstrap() */
        {
          memory: "undefined" !== typeof wasmMemory ? wasmMemory : EmscriptenModule["wasmMemory"],
          exports: "undefined" !== typeof wasmExports ? wasmExports : Object.prototype.hasOwnProperty.call(EmscriptenModule, "wasmExports") ? EmscriptenModule["wasmExports"] : EmscriptenModule["asm"]
        },
        globalThis.sqlite3ApiBootstrap.defaultConfig,
        globalThis.sqlite3ApiConfig || {}
      );
      sqlite3InitScriptInfo.debugModule("Bootstrapping lib config", bootstrapConfig);
      const p = globalThis.sqlite3ApiBootstrap(bootstrapConfig);
      delete globalThis.sqlite3ApiBootstrap;
      return p;
    } catch (e) {
      console.error("sqlite3ApiBootstrap() error:", e);
      throw e;
    }
  };
  if (runtimeInitialized) moduleRtn = Module;
  else moduleRtn = new Promise((resolve, reject) => {
    readyPromiseResolve = resolve;
    readyPromiseReject = reject;
  });
  return moduleRtn;
}
sqlite3InitModule$1 = (function() {
  const originalInit = sqlite3InitModule$1;
  if (!originalInit) throw new Error("Expecting sqlite3InitModule to be defined by the Emscripten build.");
  const sIMS = globalThis.sqlite3InitModuleState = Object.assign(/* @__PURE__ */ Object.create(null), {
    moduleScript: globalThis?.document?.currentScript,
    isWorker: "undefined" !== typeof WorkerGlobalScope,
    location: globalThis.location,
    urlParams: globalThis?.location?.href ? new URL(globalThis.location.href).searchParams : new URLSearchParams(),
    wasmFilename: "sqlite3.wasm"
  });
  sIMS.debugModule = sIMS.urlParams.has("sqlite3.debugModule") ? (...args) => console.warn("sqlite3.debugModule:", ...args) : () => {
  };
  if (sIMS.urlParams.has("sqlite3.dir")) sIMS.sqlite3Dir = sIMS.urlParams.get("sqlite3.dir") + "/";
  else if (sIMS.moduleScript) {
    const li = sIMS.moduleScript.src.split("/");
    li.pop();
    sIMS.sqlite3Dir = li.join("/") + "/";
  }
  const sIM = globalThis.sqlite3InitModule = function ff(...args) {
    sIMS.emscriptenLocateFile = args[0]?.locateFile;
    sIMS.emscriptenInstantiateWasm = args[0]?.instantiateWasm;
    return originalInit(...args).then((EmscriptenModule) => {
      sIMS.debugModule("sqlite3InitModule() sIMS =", sIMS);
      sIMS.debugModule("sqlite3InitModule() EmscriptenModule =", EmscriptenModule);
      const s = EmscriptenModule.runSQLite3PostLoadInit(sIMS, EmscriptenModule, !!ff.__isUnderTest);
      sIMS.debugModule("sqlite3InitModule() sqlite3 =", s);
      return s;
    }).catch((e) => {
      console.error("Exception loading sqlite3 module:", e);
      throw e;
    });
  };
  sIM.ready = originalInit.ready;
  if (sIMS.moduleScript) {
    let src = sIMS.moduleScript.src.split("/");
    src.pop();
    sIMS.scriptDir = src.join("/") + "/";
  }
  sIMS.debugModule("extern-post-js.c-pp.js sqlite3InitModuleState =", sIMS);
  return sIM;
})();
var sqlite3_bundler_friendly_default = sqlite3InitModule$1;
globalThis.sqlite3Worker1Promiser = function callee(config = callee.defaultConfig) {
  if (1 === arguments.length && "function" === typeof arguments[0]) {
    const f = config;
    config = Object.assign(/* @__PURE__ */ Object.create(null), callee.defaultConfig);
    config.onready = f;
  } else config = Object.assign(/* @__PURE__ */ Object.create(null), callee.defaultConfig, config);
  const handlerMap = /* @__PURE__ */ Object.create(null);
  const noop = function() {
  };
  const err2 = config.onerror || noop;
  const debug = config.debug || noop;
  const idTypeMap = config.generateMessageId ? void 0 : /* @__PURE__ */ Object.create(null);
  const genMsgId = config.generateMessageId || function(msg) {
    return msg.type + "#" + (idTypeMap[msg.type] = (idTypeMap[msg.type] || 0) + 1);
  };
  const toss = (...args) => {
    throw new Error(args.join(" "));
  };
  if (!config.worker) config.worker = callee.defaultConfig.worker;
  if ("function" === typeof config.worker) config.worker = config.worker();
  let dbId;
  let promiserFunc;
  config.worker.onmessage = function(ev) {
    ev = ev.data;
    debug("worker1.onmessage", ev);
    let msgHandler = handlerMap[ev.messageId];
    if (!msgHandler) {
      if (ev && "sqlite3-api" === ev.type && "worker1-ready" === ev.result) {
        if (config.onready) config.onready(promiserFunc);
        return;
      }
      msgHandler = handlerMap[ev.type];
      if (msgHandler && msgHandler.onrow) {
        msgHandler.onrow(ev);
        return;
      }
      if (config.onunhandled) config.onunhandled(arguments[0]);
      else err2("sqlite3Worker1Promiser() unhandled worker message:", ev);
      return;
    }
    delete handlerMap[ev.messageId];
    switch (ev.type) {
      case "error":
        msgHandler.reject(ev);
        return;
      case "open":
        if (!dbId) dbId = ev.dbId;
        break;
      case "close":
        if (ev.dbId === dbId) dbId = void 0;
    }
    try {
      msgHandler.resolve(ev);
    } catch (e) {
      msgHandler.reject(e);
    }
  };
  return promiserFunc = function() {
    let msg;
    if (1 === arguments.length) msg = arguments[0];
    else if (2 === arguments.length) {
      msg = /* @__PURE__ */ Object.create(null);
      msg.type = arguments[0];
      msg.args = arguments[1];
      msg.dbId = msg.args.dbId;
    } else toss("Invalid arguments for sqlite3Worker1Promiser()-created factory.");
    if (!msg.dbId && msg.type !== "open") msg.dbId = dbId;
    msg.messageId = genMsgId(msg);
    msg.departureTime = performance.now();
    const proxy = /* @__PURE__ */ Object.create(null);
    proxy.message = msg;
    let rowCallbackId;
    if ("exec" === msg.type && msg.args) {
      if ("function" === typeof msg.args.callback) {
        rowCallbackId = msg.messageId + ":row";
        proxy.onrow = msg.args.callback;
        msg.args.callback = rowCallbackId;
        handlerMap[rowCallbackId] = proxy;
      } else if ("string" === typeof msg.args.callback) toss("exec callback may not be a string when using the Promise interface.");
    }
    let p = new Promise(function(resolve, reject) {
      proxy.resolve = resolve;
      proxy.reject = reject;
      handlerMap[msg.messageId] = proxy;
      debug("Posting", msg.type, "message to Worker dbId=" + (dbId || "default") + ":", msg);
      config.worker.postMessage(msg);
    });
    if (rowCallbackId) p = p.finally(() => delete handlerMap[rowCallbackId]);
    return p;
  };
};
globalThis.sqlite3Worker1Promiser.defaultConfig = {
  worker: function() {
    return new Worker(new URL("sqlite3-worker1.mjs", import.meta.url), { type: "module" });
  },
  onerror: (...args) => console.error("sqlite3Worker1Promiser():", ...args)
};
globalThis.sqlite3Worker1Promiser.v2 = function callee2(config = callee2.defaultConfig) {
  let oldFunc;
  if ("function" == typeof config) {
    oldFunc = config;
    config = {};
  } else if ("function" === typeof config?.onready) {
    oldFunc = config.onready;
    delete config.onready;
  }
  const promiseProxy = /* @__PURE__ */ Object.create(null);
  config = Object.assign(config || /* @__PURE__ */ Object.create(null), { onready: async function(func) {
    try {
      if (oldFunc) await oldFunc(func);
      promiseProxy.resolve(func);
    } catch (e) {
      promiseProxy.reject(e);
    }
  } });
  const p = new Promise(function(resolve, reject) {
    promiseProxy.resolve = resolve;
    promiseProxy.reject = reject;
  });
  try {
    this.original(config);
  } catch (e) {
    promiseProxy.reject(e);
  }
  return p;
}.bind({ original: sqlite3Worker1Promiser });
globalThis.sqlite3Worker1Promiser.v2.defaultConfig = globalThis.sqlite3Worker1Promiser.defaultConfig;
var sqlite3_worker1_promiser_default = sqlite3Worker1Promiser.v2;
delete globalThis.sqlite3Worker1Promiser;
var sqlite3InitModule = sqlite3_bundler_friendly_default;

// src/bookshelf-sqlite.js
function initializeLibrarySqlite() {
  const binary = globalThis.rostrumLibraryWasm;
  return sqlite3InitModule({
    wasmBinary: binary,
    locateFile: (name) => binary ? name : new URL(name, import.meta.url).href
  });
}

// src/bookshelf-files.js
var DirectoryLibraryFiles = class {
  constructor(root) {
    this.root = root;
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

// src/bookshelf-storage-opfs.js
async function openOpfsLibraryStorage() {
  const root = await navigator.storage.getDirectory();
  const sqlite = await initializeLibrarySqlite();
  const pool = await sqlite.installOpfsSAHPoolVfs({ directory: ".rostrum-library-db" });
  const db2 = new pool.OpfsSAHPoolDb("/library.sqlite");
  return {
    files: new DirectoryLibraryFiles(root),
    database: {
      exec(statement, bind = []) {
        return db2.exec({ sql: statement, bind, rowMode: "object", returnValue: "resultRows" });
      },
      export() {
        return pool.exportFile("/library.sqlite");
      },
      async flush() {
      },
      close() {
        db2.close();
      }
    }
  };
}

// src/bookshelf-storage-snapshot.js
async function openSnapshotDatabase({ read, write, release = () => {
} }) {
  const sqlite = await initializeLibrarySqlite();
  const bytes = await read();
  const filename = "/library-" + crypto.randomUUID() + ".sqlite";
  if (bytes) sqlite.capi.sqlite3_js_posix_create_file(filename, new Uint8Array(bytes));
  const db2 = new sqlite.oo1.DB(filename, "c");
  let dirty = false;
  return {
    exec(statement, bind = []) {
      const rows = db2.exec({ sql: statement, bind, rowMode: "object", returnValue: "resultRows" });
      if (!/^\s*(SELECT|PRAGMA table_info|PRAGMA user_version$)/i.test(statement)) dirty = true;
      return rows;
    },
    export() {
      return sqlite.capi.sqlite3_js_db_export(db2);
    },
    async flush() {
      if (!dirty) return;
      await write(sqlite.capi.sqlite3_js_db_export(db2));
      dirty = false;
    },
    async close() {
      try {
        db2.close();
      } finally {
        await release();
      }
    }
  };
}

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
async function openIndexedDbBytes({ name = "rostrum-bookshelf" } = {}) {
  const release = await holdLibraryLock("rostrum-library-idb:" + name);
  let connection;
  try {
    connection = await new Promise((resolve, reject) => {
      const request2 = indexedDB.open(name, 1);
      request2.onupgradeneeded = () => request2.result.createObjectStore("files");
      request2.onsuccess = () => resolve(request2.result);
      request2.onerror = () => reject(request2.error);
    });
    const access = (mode, run) => new Promise((resolve, reject) => {
      const transaction2 = connection.transaction("files", mode);
      const request2 = run(transaction2.objectStore("files"));
      transaction2.oncomplete = () => resolve(request2.result);
      transaction2.onabort = transaction2.onerror = () => reject(transaction2.error || request2.error);
    });
    const validate = (path) => {
      if (typeof path !== "string" || path.split("/").some((p) => !p || p === "." || p === ".." || /[\\\x00]/.test(p))) throw new Error("Invalid library path");
      return path;
    };
    const files2 = {
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
      files: files2,
      async readDatabase() {
        const blob = await access("readonly", (store) => store.get("library.sqlite"));
        return blob && blob.arrayBuffer();
      },
      writeDatabase: (bytes) => files2.write("library.sqlite", bytes),
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

// src/bookshelf-storage-indexeddb.js
async function openIndexedDbLibraryStorage({ name = "rostrum-bookshelf" } = {}) {
  const storage = await openIndexedDbBytes({ name });
  try {
    const database = await openSnapshotDatabase({ read: storage.readDatabase, write: storage.writeDatabase, release: storage.close });
    return { files: storage.files, database };
  } catch (error) {
    storage.close();
    throw error;
  }
}

// src/bookshelf-storage-bytes-directory.js
async function openDirectoryBytes({ directory }) {
  if (!directory || directory.kind !== "directory") throw new Error("Choose a library folder first.");
  const release = await holdLibraryLock("rostrum-library-folder:" + directory.name);
  const files2 = new DirectoryLibraryFiles(directory);
  let persisted;
  const digest = async (bytes) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].join(",");
  const read = async () => {
    try {
      return await (await files2.read("library.sqlite")).arrayBuffer();
    } catch (error) {
      if (error.name === "NotFoundError") return null;
      throw error;
    }
  };
  try {
    const original = await read();
    persisted = original && await digest(original);
    return {
      files: files2,
      readDatabase: async () => original,
      async writeDatabase(bytes) {
        const current = await read();
        if ((current && await digest(current)) !== persisted) throw new Error("The library database was changed outside this session. Reopen it before saving.");
        await files2.write("library.sqlite", bytes);
        persisted = await digest(bytes);
      },
      close: release
    };
  } catch (error) {
    release();
    throw error;
  }
}

// src/bookshelf-storage-directory.js
async function openDirectoryLibraryStorage({ directory }) {
  const storage = await openDirectoryBytes({ directory });
  try {
    const database = await openSnapshotDatabase({ read: storage.readDatabase, write: storage.writeDatabase, release: storage.close });
    return { files: storage.files, database };
  } catch (error) {
    storage.close();
    throw error;
  }
}

// src/bookshelf-storage-bridge.js
var sequence = 0;
var pending = /* @__PURE__ */ new Map();
self.addEventListener("message", ({ data }) => {
  if (!data.hostReply) return;
  const request2 = pending.get(data.hostReply);
  if (!request2) return;
  pending.delete(data.hostReply);
  if (data.error) request2.reject(Object.assign(new Error(data.error), { name: data.errorName }));
  else request2.resolve(data.value);
});
function request(method, args = []) {
  return new Promise((resolve, reject) => {
    const hostRequest = ++sequence;
    pending.set(hostRequest, { resolve, reject });
    self.postMessage({ hostRequest, method, args });
  });
}
async function openBridgedLibraryStorage() {
  const database = await openSnapshotDatabase({ read: () => request("readDatabase"), write: (bytes) => request("writeDatabase", [bytes]), release: () => request("close") });
  return { database, files: {
    read: (path) => request("read", [path]),
    write: (path, bytes) => request("write", [path, bytes]),
    remove: (path) => request("remove", [path])
  } };
}

// src/bookshelf-storage-policy.js
function openConfiguredLibraryStorage(options = {}) {
  if (options.kind === "host") return openBridgedLibraryStorage();
  if (options.kind === "indexeddb") return openIndexedDbLibraryStorage(options);
  if (options.kind === "directory") return openDirectoryLibraryStorage(options);
  if (!options.kind || options.kind === "opfs") return openOpfsLibraryStorage();
  throw new Error("Unknown library storage backend");
}

// node_modules/fflate/esm/browser.js
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function(eb, start) {
  var b = new u16(31);
  for (var i2 = 0; i2 < 31; ++i2) {
    b[i2] = start += 1 << eb[i2 - 1];
  }
  var r = new i32(b[30]);
  for (var i2 = 1; i2 < 30; ++i2) {
    for (var j = b[i2]; j < b[i2 + 1]; ++j) {
      r[j] = j - b[i2] << 5 | i2;
    }
  }
  return { b, r };
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var x;
var i;
var hMap = (function(cd, mb, r) {
  var s = cd.length;
  var i2 = 0;
  var l = new u16(mb);
  for (; i2 < s; ++i2) {
    if (cd[i2])
      ++l[cd[i2] - 1];
  }
  var le = new u16(mb);
  for (i2 = 1; i2 < mb; ++i2) {
    le[i2] = le[i2 - 1] + l[i2 - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        var sv = i2 << 4 | cd[i2];
        var r_1 = mb - cd[i2];
        var v2 = le[cd[i2] - 1]++ << r_1;
        for (var m = v2 | (1 << r_1) - 1; v2 <= m; ++v2) {
          co[rev[v2] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        co[i2] = rev[le[cd[i2] - 1]++] >> 15 - cd[i2];
      }
    }
  }
  return co;
});
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flm = /* @__PURE__ */ hMap(flt, 9, 0);
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdm = /* @__PURE__ */ hMap(fdt, 5, 0);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = function(a) {
  var m = a[0];
  for (var i2 = 1; i2 < a.length; ++i2) {
    if (a[i2] > m)
      m = a[i2];
  }
  return m;
};
var bits = function(d, p, m) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
  return (p + 7) / 8 | 0;
};
var slc = function(v2, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v2.length)
    e = v2.length;
  return new u8(v2.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
};
var inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i2 = 0; i2 < hcLen; ++i2) {
          clt[clim[i2]] = bits(dat, pos + i2 * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i2 = 0; i2 < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i2++] = s;
          } else {
            var c = 0, n = 0;
            if (s == 16)
              n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i2 - 1];
            else if (s == 17)
              n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i2++] = c;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i2 = sym - 257, b = fleb[i2];
          add = bits(dat, pos, (1 << b) - 1) + fl[i2];
          pos += b;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var wbits = function(d, p, v2) {
  v2 <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v2;
  d[o + 1] |= v2 >> 8;
};
var wbits16 = function(d, p, v2) {
  v2 <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v2;
  d[o + 1] |= v2 >> 8;
  d[o + 2] |= v2 >> 16;
};
var hTree = function(d, mb) {
  var t = [];
  for (var i2 = 0; i2 < d.length; ++i2) {
    if (d[i2])
      t.push({ s: i2, f: d[i2] });
  }
  var s = t.length;
  var t2 = t.slice();
  if (!s)
    return { t: et, l: 0 };
  if (s == 1) {
    var v2 = new u8(t[0].s + 1);
    v2[t[0].s] = 1;
    return { t: v2, l: 1 };
  }
  t.sort(function(a, b) {
    return a.f - b.f;
  });
  t.push({ s: -1, f: 25001 });
  var l = t[0], r = t[1], i0 = 0, i1 = 1, i22 = 2;
  t[0] = { s: -1, f: l.f + r.f, l, r };
  while (i1 != s - 1) {
    l = t[t[i0].f < t[i22].f ? i0++ : i22++];
    r = t[i0 != i1 && t[i0].f < t[i22].f ? i0++ : i22++];
    t[i1++] = { s: -1, f: l.f + r.f, l, r };
  }
  var maxSym = t2[0].s;
  for (var i2 = 1; i2 < s; ++i2) {
    if (t2[i2].s > maxSym)
      maxSym = t2[i2].s;
  }
  var tr = new u16(maxSym + 1);
  var mbt = ln(t[i1 - 1], tr, 0);
  if (mbt > mb) {
    var i2 = 0, dt = 0;
    var lft = mbt - mb, cst = 1 << lft;
    t2.sort(function(a, b) {
      return tr[b.s] - tr[a.s] || a.f - b.f;
    });
    for (; i2 < s; ++i2) {
      var i2_1 = t2[i2].s;
      if (tr[i2_1] > mb) {
        dt += cst - (1 << mbt - tr[i2_1]);
        tr[i2_1] = mb;
      } else
        break;
    }
    dt >>= lft;
    while (dt > 0) {
      var i2_2 = t2[i2].s;
      if (tr[i2_2] < mb)
        dt -= 1 << mb - tr[i2_2]++ - 1;
      else
        ++i2;
    }
    for (; i2 >= 0 && dt; --i2) {
      var i2_3 = t2[i2].s;
      if (tr[i2_3] == mb) {
        --tr[i2_3];
        ++dt;
      }
    }
    mbt = mb;
  }
  return { t: new u8(tr), l: mbt };
};
var ln = function(n, l, d) {
  return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
};
var lc = function(c) {
  var s = c.length;
  while (s && !c[--s])
    ;
  var cl = new u16(++s);
  var cli = 0, cln = c[0], cls = 1;
  var w = function(v2) {
    cl[cli++] = v2;
  };
  for (var i2 = 1; i2 <= s; ++i2) {
    if (c[i2] == cln && i2 != s)
      ++cls;
    else {
      if (!cln && cls > 2) {
        for (; cls > 138; cls -= 138)
          w(32754);
        if (cls > 2) {
          w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
          cls = 0;
        }
      } else if (cls > 3) {
        w(cln), --cls;
        for (; cls > 6; cls -= 6)
          w(8304);
        if (cls > 2)
          w(cls - 3 << 5 | 8208), cls = 0;
      }
      while (cls--)
        w(cln);
      cls = 1;
      cln = c[i2];
    }
  }
  return { c: cl.subarray(0, cli), n: s };
};
var clen = function(cf, cl) {
  var l = 0;
  for (var i2 = 0; i2 < cl.length; ++i2)
    l += cf[i2] * cl[i2];
  return l;
};
var wfblk = function(out, pos, dat) {
  var s = dat.length;
  var o = shft(pos + 2);
  out[o] = s & 255;
  out[o + 1] = s >> 8;
  out[o + 2] = out[o] ^ 255;
  out[o + 3] = out[o + 1] ^ 255;
  for (var i2 = 0; i2 < s; ++i2)
    out[o + i2 + 4] = dat[i2];
  return (o + 4 + s) * 8;
};
var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
  wbits(out, p++, final);
  ++lf[256];
  var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
  var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
  var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
  var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
  var lcfreq = new u16(19);
  for (var i2 = 0; i2 < lclt.length; ++i2)
    ++lcfreq[lclt[i2] & 31];
  for (var i2 = 0; i2 < lcdt.length; ++i2)
    ++lcfreq[lcdt[i2] & 31];
  var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
  var nlcc = 19;
  for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
    ;
  var flen = bl + 5 << 3;
  var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
  var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
  if (bs >= 0 && flen <= ftlen && flen <= dtlen)
    return wfblk(out, p, dat.subarray(bs, bs + bl));
  var lm, ll, dm, dl;
  wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
  if (dtlen < ftlen) {
    lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
    var llm = hMap(lct, mlcb, 0);
    wbits(out, p, nlc - 257);
    wbits(out, p + 5, ndc - 1);
    wbits(out, p + 10, nlcc - 4);
    p += 14;
    for (var i2 = 0; i2 < nlcc; ++i2)
      wbits(out, p + 3 * i2, lct[clim[i2]]);
    p += 3 * nlcc;
    var lcts = [lclt, lcdt];
    for (var it = 0; it < 2; ++it) {
      var clct = lcts[it];
      for (var i2 = 0; i2 < clct.length; ++i2) {
        var len = clct[i2] & 31;
        wbits(out, p, llm[len]), p += lct[len];
        if (len > 15)
          wbits(out, p, clct[i2] >> 5 & 127), p += clct[i2] >> 12;
      }
    }
  } else {
    lm = flm, ll = flt, dm = fdm, dl = fdt;
  }
  for (var i2 = 0; i2 < li; ++i2) {
    var sym = syms[i2];
    if (sym > 255) {
      var len = sym >> 18 & 31;
      wbits16(out, p, lm[len + 257]), p += ll[len + 257];
      if (len > 7)
        wbits(out, p, sym >> 23 & 31), p += fleb[len];
      var dst = sym & 31;
      wbits16(out, p, dm[dst]), p += dl[dst];
      if (dst > 3)
        wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
    } else {
      wbits16(out, p, lm[sym]), p += ll[sym];
    }
  }
  wbits16(out, p, lm[256]);
  return p + ll[256];
};
var deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
var et = /* @__PURE__ */ new u8(0);
var dflt = function(dat, lvl, plvl, pre, post, st) {
  var s = st.z || dat.length;
  var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
  var w = o.subarray(pre, o.length - post);
  var lst = st.l;
  var pos = (st.r || 0) & 7;
  if (lvl) {
    if (pos)
      w[0] = st.r >> 3;
    var opt = deo[lvl - 1];
    var n = opt >> 13, c = opt & 8191;
    var msk_1 = (1 << plvl) - 1;
    var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
    var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
    var hsh = function(i3) {
      return (dat[i3] ^ dat[i3 + 1] << bs1_1 ^ dat[i3 + 2] << bs2_1) & msk_1;
    };
    var syms = new i32(25e3);
    var lf = new u16(288), df = new u16(32);
    var lc_1 = 0, eb = 0, i2 = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
    for (; i2 + 2 < s; ++i2) {
      var hv = hsh(i2);
      var imod = i2 & 32767, pimod = head[hv];
      prev[imod] = pimod;
      head[hv] = imod;
      if (wi <= i2) {
        var rem = s - i2;
        if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
          pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i2 - bs, pos);
          li = lc_1 = eb = 0, bs = i2;
          for (var j = 0; j < 286; ++j)
            lf[j] = 0;
          for (var j = 0; j < 30; ++j)
            df[j] = 0;
        }
        var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
        if (rem > 2 && hv == hsh(i2 - dif)) {
          var maxn = Math.min(n, rem) - 1;
          var maxd = Math.min(32767, i2);
          var ml = Math.min(258, rem);
          while (dif <= maxd && --ch_1 && imod != pimod) {
            if (dat[i2 + l] == dat[i2 + l - dif]) {
              var nl = 0;
              for (; nl < ml && dat[i2 + nl] == dat[i2 + nl - dif]; ++nl)
                ;
              if (nl > l) {
                l = nl, d = dif;
                if (nl > maxn)
                  break;
                var mmd = Math.min(dif, nl - 2);
                var md = 0;
                for (var j = 0; j < mmd; ++j) {
                  var ti = i2 - dif + j & 32767;
                  var pti = prev[ti];
                  var cd = ti - pti & 32767;
                  if (cd > md)
                    md = cd, pimod = ti;
                }
              }
            }
            imod = pimod, pimod = prev[imod];
            dif += imod - pimod & 32767;
          }
        }
        if (d) {
          syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
          var lin = revfl[l] & 31, din = revfd[d] & 31;
          eb += fleb[lin] + fdeb[din];
          ++lf[257 + lin];
          ++df[din];
          wi = i2 + l;
          ++lc_1;
        } else {
          syms[li++] = dat[i2];
          ++lf[dat[i2]];
        }
      }
    }
    for (i2 = Math.max(i2, wi); i2 < s; ++i2) {
      syms[li++] = dat[i2];
      ++lf[dat[i2]];
    }
    pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i2 - bs, pos);
    if (!lst) {
      st.r = pos & 7 | w[pos / 8 | 0] << 3;
      pos -= 7;
      st.h = head, st.p = prev, st.i = i2, st.w = wi;
    }
  } else {
    for (var i2 = st.w || 0; i2 < s + lst; i2 += 65535) {
      var e = i2 + 65535;
      if (e >= s) {
        w[pos / 8 | 0] = lst;
        e = s;
      }
      pos = wfblk(w, pos + 1, dat.subarray(i2, e));
    }
    st.i = s;
  }
  return slc(o, 0, pre + shft(pos) + post);
};
var crct = /* @__PURE__ */ (function() {
  var t = new Int32Array(256);
  for (var i2 = 0; i2 < 256; ++i2) {
    var c = i2, k2 = 9;
    while (--k2)
      c = (c & 1 && -306674912) ^ c >>> 1;
    t[i2] = c;
  }
  return t;
})();
var crc = function() {
  var c = -1;
  return {
    p: function(d) {
      var cr = c;
      for (var i2 = 0; i2 < d.length; ++i2)
        cr = crct[cr & 255 ^ d[i2]] ^ cr >>> 8;
      c = cr;
    },
    d: function() {
      return ~c;
    }
  };
};
var dopt = function(dat, opt, pre, post, st) {
  if (!st) {
    st = { l: 1 };
    if (opt.dictionary) {
      var dict = opt.dictionary.subarray(-32768);
      var newDat = new u8(dict.length + dat.length);
      newDat.set(dict);
      newDat.set(dat, dict.length);
      dat = newDat;
      st.w = dict.length;
    }
  }
  return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
};
var mrg = function(a, b) {
  var o = {};
  for (var k2 in a)
    o[k2] = a[k2];
  for (var k2 in b)
    o[k2] = b[k2];
  return o;
};
var b2 = function(d, b) {
  return d[b] | d[b + 1] << 8;
};
var b4 = function(d, b) {
  return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
};
var b8 = function(d, b) {
  return b4(d, b) + b4(d, b + 4) * 4294967296;
};
var wbytes = function(d, b, v2) {
  for (; v2; ++b)
    d[b] = v2, v2 >>>= 8;
};
var Deflate = /* @__PURE__ */ (function() {
  function Deflate2(opts, cb) {
    if (typeof opts == "function")
      cb = opts, opts = {};
    this.ondata = cb;
    this.o = opts || {};
    this.s = { l: 0, i: 32768, w: 32768, z: 32768 };
    this.b = new u8(98304);
    if (this.o.dictionary) {
      var dict = this.o.dictionary.subarray(-32768);
      this.b.set(dict, 32768 - dict.length);
      this.s.i = 32768 - dict.length;
    }
  }
  Deflate2.prototype.p = function(c, f) {
    this.ondata(dopt(c, this.o, 0, 0, this.s), f);
  };
  Deflate2.prototype.push = function(chunk, final) {
    if (!this.ondata)
      err(5);
    if (this.s.l)
      err(4);
    var endLen = chunk.length + this.s.z;
    if (endLen > this.b.length) {
      if (endLen > 2 * this.b.length - 32768) {
        var newBuf = new u8(endLen & -32768);
        newBuf.set(this.b.subarray(0, this.s.z));
        this.b = newBuf;
      }
      var split = this.b.length - this.s.z;
      this.b.set(chunk.subarray(0, split), this.s.z);
      this.s.z = this.b.length;
      this.p(this.b, false);
      this.b.set(this.b.subarray(-32768));
      this.b.set(chunk.subarray(split), 32768);
      this.s.z = chunk.length - split + 32768;
      this.s.i = 32766, this.s.w = 32768;
    } else {
      this.b.set(chunk, this.s.z);
      this.s.z += chunk.length;
    }
    this.s.l = final & 1;
    if (this.s.z > this.s.w + 8191 || final) {
      this.p(this.b, final || false);
      this.s.w = this.s.i, this.s.i -= 2;
    }
    if (final) {
      this.s = this.o = {};
      this.b = et;
    }
  };
  Deflate2.prototype.flush = function(sync) {
    if (!this.ondata)
      err(5);
    if (this.s.l)
      err(4);
    this.p(this.b, false);
    this.s.w = this.s.i, this.s.i -= 2;
    if (sync) {
      var c = new u8(6);
      c[0] = this.s.r >> 3;
      var ep = wfblk(c, this.s.r, et);
      this.s.r = 0;
      this.ondata(c.subarray(0, ep >> 3), false);
    }
  };
  return Deflate2;
})();
var Inflate = /* @__PURE__ */ (function() {
  function Inflate2(opts, cb) {
    if (typeof opts == "function")
      cb = opts, opts = {};
    this.ondata = cb;
    var dict = opts && opts.dictionary && opts.dictionary.subarray(-32768);
    this.s = { i: 0, b: dict ? dict.length : 0 };
    this.o = new u8(32768);
    this.p = new u8(0);
    if (dict)
      this.o.set(dict);
  }
  Inflate2.prototype.e = function(c) {
    if (!this.ondata)
      err(5);
    if (this.d)
      err(4);
    if (!this.p.length)
      this.p = c;
    else if (c.length) {
      var n = new u8(this.p.length + c.length);
      n.set(this.p), n.set(c, this.p.length), this.p = n;
    }
  };
  Inflate2.prototype.c = function(final) {
    this.s.i = +(this.d = final || false);
    var bts = this.s.b;
    var dt = inflt(this.p, this.s, this.o);
    this.ondata(slc(dt, bts, this.s.b), this.d);
    this.o = slc(dt, this.s.b - 32768), this.s.b = this.o.length;
    this.p = slc(this.p, this.s.p / 8 | 0), this.s.p &= 7;
  };
  Inflate2.prototype.push = function(chunk, final) {
    this.e(chunk), this.c(final);
  };
  return Inflate2;
})();
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var te = typeof TextEncoder != "undefined" && /* @__PURE__ */ new TextEncoder();
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}
var dutf8 = function(d) {
  for (var r = "", i2 = 0; ; ) {
    var c = d[i2++];
    var eb = (c > 127) + (c > 223) + (c > 239);
    if (i2 + eb > d.length)
      return { s: r, r: slc(d, i2 - 1) };
    if (!eb)
      r += String.fromCharCode(c);
    else if (eb == 3) {
      c = ((c & 15) << 18 | (d[i2++] & 63) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63) - 65536, r += String.fromCharCode(55296 | c >> 10, 56320 | c & 1023);
    } else if (eb & 1)
      r += String.fromCharCode((c & 31) << 6 | d[i2++] & 63);
    else
      r += String.fromCharCode((c & 15) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63);
  }
};
function strToU8(str, latin1) {
  if (latin1) {
    var ar_1 = new u8(str.length);
    for (var i2 = 0; i2 < str.length; ++i2)
      ar_1[i2] = str.charCodeAt(i2);
    return ar_1;
  }
  if (te)
    return te.encode(str);
  var l = str.length;
  var ar = new u8(str.length + (str.length >> 1));
  var ai = 0;
  var w = function(v2) {
    ar[ai++] = v2;
  };
  for (var i2 = 0; i2 < l; ++i2) {
    if (ai + 5 > ar.length) {
      var n = new u8(ai + 8 + (l - i2 << 1));
      n.set(ar);
      ar = n;
    }
    var c = str.charCodeAt(i2);
    if (c < 128 || latin1)
      w(c);
    else if (c < 2048)
      w(192 | c >> 6), w(128 | c & 63);
    else if (c > 55295 && c < 57344)
      c = 65536 + (c & 1023 << 10) | str.charCodeAt(++i2) & 1023, w(240 | c >> 18), w(128 | c >> 12 & 63), w(128 | c >> 6 & 63), w(128 | c & 63);
    else
      w(224 | c >> 12), w(128 | c >> 6 & 63), w(128 | c & 63);
  }
  return slc(ar, 0, ai);
}
function strFromU8(dat, latin1) {
  if (latin1) {
    var r = "";
    for (var i2 = 0; i2 < dat.length; i2 += 16384)
      r += String.fromCharCode.apply(null, dat.subarray(i2, i2 + 16384));
    return r;
  } else if (td) {
    return td.decode(dat);
  } else {
    var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
    if (r.length)
      err(8);
    return s;
  }
}
var dbf = function(l) {
  return l == 1 ? 3 : l < 6 ? 2 : l == 9 ? 1 : 0;
};
var slzh = function(d, b) {
  return b + 30 + b2(d, b + 26) + b2(d, b + 28);
};
var zh = function(d, b, z) {
  var fnl = b2(d, b + 28), efl = b2(d, b + 30), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl;
  var _a2 = z64hs(d, es, efl, z, b4(d, b + 20), b4(d, b + 24), b4(d, b + 42)), sc = _a2[0], su = _a2[1], off = _a2[2];
  return [b2(d, b + 10), sc, su, fn, es + efl + b2(d, b + 32), off];
};
var z64hs = function(d, b, l, z, sc, su, off) {
  var nsc = sc == 4294967295, nsu = su == 4294967295, noff = off == 4294967295, e = b + l;
  var nf = nsc + nsu + noff;
  if (z && nf) {
    for (; b + 4 < e; b += 4 + b2(d, b + 2)) {
      if (b2(d, b) == 1) {
        return [
          nsc ? b8(d, b + 4 + 8 * nsu) : sc,
          nsu ? b8(d, b + 4) : su,
          noff ? b8(d, b + 4 + 8 * (nsu + nsc)) : off,
          1
        ];
      }
    }
    if (z < 2)
      err(13);
  }
  return [sc, su, off, 0];
};
var exfl = function(ex) {
  var le = 0;
  if (ex) {
    for (var k2 in ex) {
      var l = ex[k2].length;
      if (l > 65535)
        err(9);
      le += l + 4;
    }
  }
  return le;
};
var wzh = function(d, b, f, fn, u, c, ce, co) {
  var fl2 = fn.length, ex = f.extra, col = co && co.length;
  var exl = exfl(ex);
  wbytes(d, b, ce != null ? 33639248 : 67324752), b += 4;
  if (ce != null)
    d[b++] = 20, d[b++] = f.os;
  d[b] = 20, b += 2;
  d[b++] = f.flag << 1 | (c < 0 && 8), d[b++] = u && 8;
  d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
  var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
  if (y < 0 || y > 119)
    err(10);
  wbytes(d, b, y << 25 | dt.getMonth() + 1 << 21 | dt.getDate() << 16 | dt.getHours() << 11 | dt.getMinutes() << 5 | dt.getSeconds() >> 1), b += 4;
  if (c != -1) {
    wbytes(d, b, f.crc);
    wbytes(d, b + 4, c < 0 ? -c - 2 : c);
    wbytes(d, b + 8, f.size);
  }
  wbytes(d, b + 12, fl2);
  wbytes(d, b + 14, exl), b += 16;
  if (ce != null) {
    wbytes(d, b, col);
    wbytes(d, b + 6, f.attrs);
    wbytes(d, b + 10, ce), b += 14;
  }
  d.set(fn, b);
  b += fl2;
  if (exl) {
    for (var k2 in ex) {
      var exf = ex[k2], l = exf.length;
      wbytes(d, b, +k2);
      wbytes(d, b + 2, l);
      d.set(exf, b + 4), b += 4 + l;
    }
  }
  if (col)
    d.set(co, b), b += col;
  return b;
};
var wzf = function(o, b, c, d, e) {
  wbytes(o, b, 101010256);
  wbytes(o, b + 8, c);
  wbytes(o, b + 10, c);
  wbytes(o, b + 12, d);
  wbytes(o, b + 16, e);
};
var ZipPassThrough = /* @__PURE__ */ (function() {
  function ZipPassThrough2(filename) {
    this.filename = filename;
    this.c = crc();
    this.size = 0;
    this.compression = 0;
  }
  ZipPassThrough2.prototype.process = function(chunk, final) {
    this.ondata(null, chunk, final);
  };
  ZipPassThrough2.prototype.push = function(chunk, final) {
    if (!this.ondata)
      err(5);
    this.c.p(chunk);
    this.size += chunk.length;
    if (final)
      this.crc = this.c.d();
    this.process(chunk, final || false);
  };
  return ZipPassThrough2;
})();
var ZipDeflate = /* @__PURE__ */ (function() {
  function ZipDeflate2(filename, opts) {
    var _this = this;
    if (!opts)
      opts = {};
    ZipPassThrough.call(this, filename);
    this.d = new Deflate(opts, function(dat, final) {
      _this.ondata(null, dat, final);
    });
    this.compression = 8;
    this.flag = dbf(opts.level);
  }
  ZipDeflate2.prototype.process = function(chunk, final) {
    try {
      this.d.push(chunk, final);
    } catch (e) {
      this.ondata(e, null, final);
    }
  };
  ZipDeflate2.prototype.push = function(chunk, final) {
    ZipPassThrough.prototype.push.call(this, chunk, final);
  };
  return ZipDeflate2;
})();
var Zip = /* @__PURE__ */ (function() {
  function Zip2(cb) {
    this.ondata = cb;
    this.u = [];
    this.d = 1;
  }
  Zip2.prototype.add = function(file) {
    var _this = this;
    if (!this.ondata)
      err(5);
    if (this.d & 2)
      this.ondata(err(4 + (this.d & 1) * 8, 0, 1), null, false);
    else {
      var f = strToU8(file.filename), fl_1 = f.length;
      var com = file.comment, o = com && strToU8(com);
      var u = fl_1 != file.filename.length || o && com.length != o.length;
      var hl_1 = fl_1 + exfl(file.extra) + 30;
      if (fl_1 > 65535)
        this.ondata(err(11, 0, 1), null, false);
      var header = new u8(hl_1);
      wzh(header, 0, file, f, u, -1);
      var chks_1 = [header];
      var pAll_1 = function() {
        for (var _i = 0, chks_2 = chks_1; _i < chks_2.length; _i++) {
          var chk = chks_2[_i];
          _this.ondata(null, chk, false);
        }
        chks_1 = [];
      };
      var tr_1 = this.d;
      this.d = 0;
      var ind_1 = this.u.length;
      var uf_1 = mrg(file, {
        f,
        u,
        o,
        t: function() {
          if (file.terminate)
            file.terminate();
        },
        r: function() {
          pAll_1();
          if (tr_1) {
            var nxt = _this.u[ind_1 + 1];
            if (nxt)
              nxt.r();
            else
              _this.d = 1;
          }
          tr_1 = 1;
        }
      });
      var cl_1 = 0;
      file.ondata = function(err2, dat, final) {
        if (err2) {
          _this.ondata(err2, dat, final);
          _this.terminate();
        } else {
          cl_1 += dat.length;
          chks_1.push(dat);
          if (final) {
            var dd = new u8(16);
            wbytes(dd, 0, 134695760);
            wbytes(dd, 4, file.crc);
            wbytes(dd, 8, cl_1);
            wbytes(dd, 12, file.size);
            chks_1.push(dd);
            uf_1.c = cl_1, uf_1.b = hl_1 + cl_1 + 16, uf_1.crc = file.crc, uf_1.size = file.size;
            if (tr_1)
              uf_1.r();
            tr_1 = 1;
          } else if (tr_1)
            pAll_1();
        }
      };
      this.u.push(uf_1);
    }
  };
  Zip2.prototype.end = function() {
    var _this = this;
    if (this.d & 2) {
      this.ondata(err(4 + (this.d & 1) * 8, 0, 1), null, true);
      return;
    }
    if (this.d)
      this.e();
    else
      this.u.push({
        r: function() {
          if (!(_this.d & 1))
            return;
          _this.u.splice(-1, 1);
          _this.e();
        },
        t: function() {
        }
      });
    this.d = 3;
  };
  Zip2.prototype.e = function() {
    var bt = 0, l = 0, tl = 0;
    for (var _i = 0, _a2 = this.u; _i < _a2.length; _i++) {
      var f = _a2[_i];
      tl += 46 + f.f.length + exfl(f.extra) + (f.o ? f.o.length : 0);
    }
    var out = new u8(tl + 22);
    for (var _b2 = 0, _c = this.u; _b2 < _c.length; _b2++) {
      var f = _c[_b2];
      wzh(out, bt, f, f.f, f.u, -f.c - 2, l, f.o);
      bt += 46 + f.f.length + exfl(f.extra) + (f.o ? f.o.length : 0), l += f.b;
    }
    wzf(out, bt, this.u.length, tl, l);
    this.ondata(null, out, true);
    this.d = 2;
  };
  Zip2.prototype.terminate = function() {
    for (var _i = 0, _a2 = this.u; _i < _a2.length; _i++) {
      var f = _a2[_i];
      f.t();
    }
    this.d = 2;
  };
  return Zip2;
})();
var UnzipPassThrough = /* @__PURE__ */ (function() {
  function UnzipPassThrough2() {
  }
  UnzipPassThrough2.prototype.push = function(chunk, final) {
    this.ondata(null, chunk, final);
  };
  UnzipPassThrough2.compression = 0;
  return UnzipPassThrough2;
})();
var UnzipInflate = /* @__PURE__ */ (function() {
  function UnzipInflate2() {
    var _this = this;
    this.i = new Inflate(function(dat, final) {
      _this.ondata(null, dat, final);
    });
  }
  UnzipInflate2.prototype.push = function(chunk, final) {
    try {
      this.i.push(chunk, final);
    } catch (e) {
      this.ondata(e, null, final);
    }
  };
  UnzipInflate2.compression = 8;
  return UnzipInflate2;
})();
var Unzip = /* @__PURE__ */ (function() {
  function Unzip2(cb) {
    this.onfile = cb;
    this.k = [];
    this.o = {
      0: UnzipPassThrough
    };
    this.p = et;
  }
  Unzip2.prototype.push = function(chunk, final) {
    var _this = this;
    if (!this.onfile)
      err(5);
    if (!this.p)
      err(4);
    if (this.c > 0) {
      var len = Math.min(this.c, chunk.length);
      var toAdd = chunk.subarray(0, len);
      this.c -= len;
      if (this.d)
        this.d.push(toAdd, !this.c);
      else
        this.k[0].push(toAdd);
      chunk = chunk.subarray(len);
      if (chunk.length)
        return this.push(chunk, final);
    } else {
      var f = 0, i2 = 0, is = void 0, buf = void 0;
      if (!this.p.length)
        buf = chunk;
      else if (!chunk.length)
        buf = this.p;
      else {
        buf = new u8(this.p.length + chunk.length);
        buf.set(this.p), buf.set(chunk, this.p.length);
      }
      var l = buf.length, oc = this.c, add = oc && this.d;
      var _loop_2 = function() {
        var sig = b4(buf, i2);
        if (sig == 67324752) {
          f = 1, is = i2;
          this_1.d = null;
          this_1.c = 0;
          var bf = b2(buf, i2 + 6), cmp_1 = b2(buf, i2 + 8), u = bf & 2048, dd = bf & 8, fnl = b2(buf, i2 + 26), es = b2(buf, i2 + 28);
          if (l > i2 + 30 + fnl + es) {
            var chks_3 = [];
            this_1.k.unshift(chks_3);
            f = 2;
            var lsc = b4(buf, i2 + 18), lsu = b4(buf, i2 + 22);
            var fn_1 = strFromU8(buf.subarray(i2 + 30, i2 += 30 + fnl), !u);
            var _a2 = z64hs(buf, i2, es, 2, lsc, lsu, 0), sc_1 = _a2[0], su_1 = _a2[1], z64 = _a2[3];
            if (dd)
              sc_1 = -1 - z64;
            i2 += es;
            this_1.c = sc_1;
            var d_1;
            var file_1 = {
              name: fn_1,
              compression: cmp_1,
              start: function() {
                if (!file_1.ondata)
                  err(5);
                if (!sc_1)
                  file_1.ondata(null, et, true);
                else {
                  var ctr = _this.o[cmp_1];
                  if (!ctr)
                    file_1.ondata(err(14, "unknown compression type " + cmp_1, 1), null, false);
                  d_1 = sc_1 < 0 ? new ctr(fn_1) : new ctr(fn_1, sc_1, su_1);
                  d_1.ondata = function(err2, dat3, final2) {
                    file_1.ondata(err2, dat3, final2);
                  };
                  for (var _i = 0, chks_4 = chks_3; _i < chks_4.length; _i++) {
                    var dat2 = chks_4[_i];
                    d_1.push(dat2, false);
                  }
                  if (_this.k[0] == chks_3 && _this.c)
                    _this.d = d_1;
                  else
                    d_1.push(et, true);
                }
              },
              terminate: function() {
                if (d_1 && d_1.terminate)
                  d_1.terminate();
              }
            };
            if (sc_1 >= 0)
              file_1.size = sc_1, file_1.originalSize = su_1;
            this_1.onfile(file_1);
          }
          return "break";
        } else if (oc) {
          if (sig == 134695760) {
            is = i2 += 12 + (oc == -2 && 8), f = 3, this_1.c = 0;
            return "break";
          } else if (sig == 33639248) {
            is = i2 -= 4, f = 3, this_1.c = 0;
            return "break";
          }
        }
      };
      var this_1 = this;
      for (; i2 < l - 4; ++i2) {
        var state_1 = _loop_2();
        if (state_1 === "break")
          break;
      }
      this.p = et;
      if (oc < 0) {
        var dat = f ? buf.subarray(0, is - 12 - (oc == -2 && 8) - (b4(buf, is - 16) == 134695760 && 4)) : buf.subarray(0, i2);
        if (add)
          add.push(dat, !!f);
        else
          this.k[+(f == 2)].push(dat);
      }
      if (f & 2)
        return this.push(buf.subarray(i2), final);
      this.p = buf.subarray(i2);
    }
    if (final) {
      if (this.c)
        err(13);
      this.p = null;
    }
  };
  Unzip2.prototype.register = function(decoder) {
    this.o[decoder.compression] = decoder;
  };
  return Unzip2;
})();
function unzipSync(data, opts) {
  var files2 = {};
  var e = data.length - 22;
  for (; b4(data, e) != 101010256; --e) {
    if (!e || data.length - e > 65558)
      err(13);
  }
  ;
  var c = b2(data, e + 8);
  if (!c)
    return {};
  var o = b4(data, e + 16);
  var z = b4(data, e - 20) == 117853008;
  if (z) {
    var ze = b4(data, e - 12);
    z = b4(data, ze) == 101075792;
    if (z) {
      c = b4(data, ze + 32);
      o = b4(data, ze + 48);
    }
  }
  var fltr = opts && opts.filter;
  for (var i2 = 0; i2 < c; ++i2) {
    var _a2 = zh(data, o, z), c_2 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b = slzh(data, off);
    o = no;
    if (!fltr || fltr({
      name: fn,
      size: sc,
      originalSize: su,
      compression: c_2
    })) {
      if (!c_2)
        files2[fn] = slc(data, b, b + sc);
      else if (c_2 == 8)
        files2[fn] = inflateSync(data.subarray(b, b + sc), { out: new u8(su) });
      else
        err(14, "unknown compression type " + c_2);
    }
  }
  return files2;
}

// src/bookshelf-transfer.js
var hashBytes = async (bytes) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((value) => value.toString(16).padStart(2, "0")).join("");
function scorePath(path) {
  if (typeof path !== "string" || !/^scores\/[^/\\\x00]+$/.test(path) || path.split("/").some((p) => p === "." || p === "..")) throw new Error("Invalid score path in library package");
  return path;
}
async function exportLibraryPackage({ db: db2, files: files2, tables: tables2 }) {
  const records = Object.fromEntries(Object.keys(tables2).map((table) => [table, db2.exec(`SELECT * FROM ${table}`)]));
  const changes = db2.exec("SELECT * FROM changes");
  const chunks = [];
  let zipError;
  const zip = new Zip((error, data) => {
    if (error) zipError = error;
    else if (data?.length) chunks.push(new Blob([data]));
  });
  const addBytes = (name, bytes) => {
    const entry = new ZipDeflate(name, { level: 6 });
    zip.add(entry);
    entry.push(bytes, true);
    if (zipError) throw zipError;
  };
  const manifest = strToU8(JSON.stringify({ format: "rostrum-library", version: 1, records, changes }));
  if (manifest.length > 64 * 1024 * 1024) throw new Error("Library metadata exceeds the supported 64 MiB package size");
  addBytes("library.json", manifest);
  addBytes("library.sqlite", await db2.export());
  for (const doc of records.documents) {
    const file = await files2.read(scorePath(doc.storage_path));
    if (file.size > 512 * 1024 * 1024) throw new Error("A score exceeds the supported 512 MiB package member size");
    if (file.size !== doc.size_bytes || await hashBytes(await file.arrayBuffer()) !== doc.content_hash) throw new Error("Cannot back up damaged or missing score: " + doc.storage_path);
    const entry = new ZipPassThrough(doc.storage_path);
    zip.add(entry);
    const reader = file.stream().getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        entry.push(value || new Uint8Array(), done);
        if (zipError) throw zipError;
        if (done) break;
      }
    } finally {
      reader.releaseLock();
    }
  }
  zip.end();
  if (zipError) throw zipError;
  return new Blob(chunks, { type: "application/zip" });
}
async function readLibraryPackage(input, tables2) {
  const source = input instanceof Blob ? input : new Blob([input]);
  const archive = /* @__PURE__ */ Object.create(null), names = /* @__PURE__ */ new Set();
  let extracted = 0;
  let unzipError;
  const unzip = new Unzip((file) => {
    if (names.has(file.name) || names.size >= 1e5) throw new Error("Duplicate or excessive package members");
    names.add(file.name);
    if (file.name === "library.sqlite") return;
    if (file.name !== "library.json") scorePath(file.name);
    const limit = (file.name === "library.json" ? 64 : 512) * 1024 * 1024;
    if (file.originalSize > limit) throw new Error("Library package member is too large");
    let size = 0;
    const chunks = [];
    file.ondata = (error, bytes, final) => {
      if (error) {
        unzipError = error;
        return;
      }
      size += bytes.length;
      extracted += bytes.length;
      if (size > limit) throw new Error("Library package member is too large");
      if (extracted > source.size * 20 + 64 * 1024 * 1024) throw new Error("Library package is excessively compressed");
      if (bytes.length) chunks.push(new Blob([bytes]));
      if (final) archive[file.name] = new Blob(chunks);
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  const reader = source.stream().getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      unzip.push(value || new Uint8Array(), done);
      if (unzipError) throw unzipError;
      if (done) break;
    }
  } catch (error) {
    await reader.cancel().catch(() => {
    });
    throw error;
  } finally {
    reader.releaseLock();
  }
  if (!archive["library.json"]) throw new Error("Invalid library package");
  const manifest = JSON.parse(await archive["library.json"].text());
  if (manifest.format !== "rostrum-library" || manifest.version !== 1 || !Array.isArray(manifest.changes)) throw new Error("Unsupported library package version");
  if (!manifest.records || Object.keys(manifest.records).some((table) => !Object.hasOwn(tables2, table))) throw new Error("Unknown library record type");
  for (const table of Object.keys(tables2)) if (!Array.isArray(manifest.records[table])) throw new Error("Incomplete library package");
  const paths = /* @__PURE__ */ new Set();
  for (const doc of manifest.records.documents) {
    const path = scorePath(doc.storage_path);
    if (paths.has(path)) throw new Error("Duplicate score path");
    paths.add(path);
    const data = archive[path];
    if (!data || data.size !== doc.size_bytes || await hashBytes(await data.arrayBuffer()) !== doc.content_hash) throw new Error("Invalid or missing score in package: " + path);
  }
  if (Object.keys(archive).some((path) => path !== "library.json" && !paths.has(path))) throw new Error("Package contains unreferenced score files");
  return { ...manifest, archive };
}

// src/bookshelf-worker.js
var db;
var files;
var initialized = false;
var storageOptions = {};
var tables = {
  documents: "content_hash TEXT NOT NULL, storage_path TEXT NOT NULL UNIQUE, size_bytes INTEGER NOT NULL, derived_from_id TEXT REFERENCES documents(id), replaced_by_id TEXT REFERENCES documents(id), settings_json TEXT NOT NULL DEFAULT '{}'",
  entries: "document_id TEXT NOT NULL REFERENCES documents(id), parent_id TEXT REFERENCES entries(id), anchor_json TEXT NOT NULL",
  annotations: "document_id TEXT NOT NULL REFERENCES documents(id), anchor_json TEXT NOT NULL, content_json TEXT NOT NULL",
  tags: "name TEXT NOT NULL",
  document_tags: "document_id TEXT NOT NULL REFERENCES documents(id), tag_id TEXT NOT NULL REFERENCES tags(id)",
  entry_tags: "entry_id TEXT NOT NULL REFERENCES entries(id), tag_id TEXT NOT NULL REFERENCES tags(id)",
  bookshelves: "",
  bookshelf_documents: "bookshelf_id TEXT NOT NULL REFERENCES bookshelves(id), document_id TEXT NOT NULL REFERENCES documents(id), order_key TEXT NOT NULL",
  playlists: "",
  playlist_items: "playlist_id TEXT NOT NULL REFERENCES playlists(id), entry_id TEXT NOT NULL REFERENCES entries(id), order_key TEXT NOT NULL"
};
function validateJsonField(value) {
  if (typeof value !== "string") throw new Error("Library JSON fields must be text");
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Library JSON fields must contain objects");
}
function sql(statement, bind = []) {
  return db.exec(statement, bind);
}
function transaction(run) {
  sql("BEGIN IMMEDIATE");
  try {
    const value = run();
    sql("COMMIT");
    return value;
  } catch (error) {
    sql("ROLLBACK");
    throw error;
  }
}
function heads(table, id) {
  const changes = sql("SELECT * FROM changes WHERE entity_type=? AND entity_id=?", [table, id]);
  const parents = new Set(changes.flatMap((change) => JSON.parse(change.parent_revision_ids_json)));
  return changes.filter((change) => !parents.has(change.id));
}
function writeRow(table, row) {
  const keys = Object.keys(row);
  sql(`INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?")})
    ON CONFLICT(id) DO UPDATE SET ${keys.filter((key) => key !== "id").map((key) => `${key}=excluded.${key}`).join(",")}`, Object.values(row));
}
function validateRelations() {
  for (const [table, keys] of [["documents", ["derived_from_id", "replaced_by_id"]], ["entries", ["parent_id"]]]) {
    const rows = new Map(sql(`SELECT * FROM ${table}`).map((row) => [row.id, row]));
    for (const key of keys) {
      const done = /* @__PURE__ */ new Set();
      for (const id of rows.keys()) {
        const path = /* @__PURE__ */ new Set();
        let current = id;
        while (current && !done.has(current)) {
          if (path.has(current)) throw new Error("The library contains a cyclic relationship");
          path.add(current);
          const row = rows.get(current);
          if (!row) break;
          if (table === "entries" && row.parent_id && rows.get(row.parent_id)?.document_id !== row.document_id) throw new Error("A song parent belongs to another score");
          current = row[key];
        }
        for (const item of path) done.add(item);
      }
    }
  }
}
function save(table, values, parents = null) {
  if (!Object.hasOwn(tables, table)) throw new Error("Unknown library record type");
  if (typeof values.id !== "string" || !values.id) throw new Error("Record identity is required");
  const previous = sql(`SELECT * FROM ${table} WHERE id = ?`, [values.id])[0];
  if (!parents && heads(table, values.id).length > 1) throw new Error("Resolve the conflicting edits before changing this item.");
  if (previous && table === "documents") {
    for (const key of ["storage_path", "content_hash", "size_bytes"]) {
      if (Object.hasOwn(values, key) && values[key] !== previous[key]) throw new Error("Import a new document to replace score contents");
    }
  }
  if (previous && !parents && Object.entries(values).every(([key, value]) => previous[key] === value)) return previous;
  const columns = new Set(sql(`PRAGMA table_info(${table})`).map((column) => column.name));
  for (const key of Object.keys(values)) if (!columns.has(key)) throw new Error("Unknown field: " + key);
  const revision = crypto.randomUUID();
  const row = {
    metadata_json: "{}",
    ...previous,
    ...values,
    revision_id: revision,
    deleted_at: Object.hasOwn(values, "deleted_at") ? values.deleted_at : previous?.deleted_at ?? null
  };
  for (const [key, value] of Object.entries(row)) {
    if (key.endsWith("_json")) validateJsonField(value);
  }
  writeRow(table, row);
  sql("INSERT INTO changes VALUES (?,?,?,?,?,?,?)", [
    revision,
    deviceId,
    table,
    row.id,
    JSON.stringify(parents || (previous ? [previous.revision_id] : [])),
    JSON.stringify(row),
    (/* @__PURE__ */ new Date()).toISOString()
  ]);
  return row;
}
var deviceId;
function validateTransfer(manifest) {
  const schemas = Object.fromEntries(Object.keys(tables).map((table) => [table, sql(`PRAGMA table_info(${table})`)]));
  const normalize = (table, row) => {
    if (!Object.hasOwn(schemas, table) || !row || typeof row !== "object" || Array.isArray(row)) throw new Error("Invalid library record");
    const schema = schemas[table];
    if (Object.keys(row).some((key) => !schema.some((column) => column.name === key))) throw new Error("Unknown field in library package");
    const result = {};
    for (const column of schema) {
      const value = Object.hasOwn(row, column.name) ? row[column.name] : column.dflt_value === "'{}'" ? "{}" : null;
      if (value === null && column.notnull || !["string", "number"].includes(typeof value) && value !== null) throw new Error("Invalid value in library record");
      if (column.name.endsWith("_json")) validateJsonField(value);
      result[column.name] = value;
    }
    if (typeof result.id !== "string" || !result.id || typeof result.revision_id !== "string" || !result.revision_id) throw new Error("Invalid record identity");
    return result;
  };
  const known = new Map(sql("SELECT * FROM changes").map((change) => [change.id, change]));
  const incoming = /* @__PURE__ */ new Map();
  const sameChange = (a, b) => ["id", "entity_type", "entity_id", "parent_revision_ids_json", "payload_json", "created_at", "device_id"].every((key) => a[key] === b[key]);
  for (const change of manifest.changes) {
    if (!change || ["id", "device_id", "entity_type", "entity_id", "parent_revision_ids_json", "payload_json", "created_at"].some((key) => typeof change[key] !== "string")) throw new Error("Invalid change record");
    if (incoming.has(change.id)) throw new Error("Duplicate change identity");
    const row = normalize(change.entity_type, JSON.parse(change.payload_json));
    if (row.id !== change.entity_id || row.revision_id !== change.id) throw new Error("Change identity does not match its record");
    const parents = JSON.parse(change.parent_revision_ids_json);
    if (!Array.isArray(parents) || parents.some((id) => typeof id !== "string" || id === change.id) || new Set(parents).size !== parents.length) throw new Error("Invalid change ancestry");
    if (known.has(change.id) && !sameChange(known.get(change.id), change)) throw new Error("Conflicting data for the same change identity");
    incoming.set(change.id, change);
  }
  const combined = new Map([...known, ...incoming]);
  const children = /* @__PURE__ */ new Map(), remaining = /* @__PURE__ */ new Map();
  for (const change of incoming.values()) {
    let count = 0;
    for (const parentId of JSON.parse(change.parent_revision_ids_json)) {
      const parent = combined.get(parentId);
      if (!parent || parent.entity_type !== change.entity_type || parent.entity_id !== change.entity_id) throw new Error("Missing or invalid change ancestry");
      if (incoming.has(parentId)) {
        count++;
        const list = children.get(parentId) || [];
        list.push(change.id);
        children.set(parentId, list);
      }
    }
    remaining.set(change.id, count);
  }
  const queue2 = [...remaining].filter(([, count]) => !count).map(([id]) => id);
  let visited = 0;
  for (let i2 = 0; i2 < queue2.length; i2++) {
    visited++;
    for (const child of children.get(queue2[i2]) || []) {
      const count = remaining.get(child) - 1;
      remaining.set(child, count);
      if (!count) queue2.push(child);
    }
  }
  if (visited !== incoming.size) throw new Error("Cyclic change ancestry");
  for (const table of Object.keys(tables)) {
    const ids = /* @__PURE__ */ new Set();
    for (const item of manifest.records[table]) {
      const row = normalize(table, item);
      if (ids.has(row.id)) throw new Error("Duplicate library record identity");
      ids.add(row.id);
      const change = combined.get(row.revision_id);
      if (!change || change.entity_type !== table || change.entity_id !== row.id || JSON.stringify(normalize(table, JSON.parse(change.payload_json))) !== JSON.stringify(row)) throw new Error("Library record does not match its change history");
    }
  }
  const documents = new Map(manifest.records.documents.map((doc) => [doc.id, doc]));
  for (const doc of documents.values()) {
    scorePath(doc.storage_path);
    if (!/^[a-f0-9]{64}$/.test(doc.content_hash) || !Number.isSafeInteger(doc.size_bytes) || doc.size_bytes < 0) throw new Error("Invalid score identity");
  }
  for (const change of incoming.values()) if (change.entity_type === "documents") {
    const row = JSON.parse(change.payload_json), doc = documents.get(row.id);
    if (!doc || ["storage_path", "content_hash", "size_bytes"].some((key) => row[key] !== doc[key])) throw new Error("A document identity has different file contents");
    const local = sql("SELECT * FROM documents WHERE id=? OR storage_path=?", [doc.id, doc.storage_path])[0];
    if (local && (local.id !== doc.id || ["storage_path", "content_hash", "size_bytes"].some((key) => local[key] !== doc[key]))) throw new Error("The package would overwrite a different score");
  }
  return { incoming, normalize, known };
}
function mergeRecords(manifest) {
  const { incoming, normalize, known } = validateTransfer(manifest);
  transaction(() => {
    sql("PRAGMA defer_foreign_keys=ON");
    for (const change of incoming.values()) if (!known.has(change.id)) sql(
      "INSERT INTO changes VALUES (?,?,?,?,?,?,?)",
      [change.id, change.device_id, change.entity_type, change.entity_id, change.parent_revision_ids_json, change.payload_json, change.created_at]
    );
    const entities = new Map([...incoming.values()].map((change) => [change.entity_type + ":" + change.entity_id, change]));
    for (const { entity_type: table, entity_id: id } of entities.values()) {
      const chosen = heads(table, id).sort((a, b) => a.id.localeCompare(b.id)).at(-1);
      writeRow(table, normalize(table, JSON.parse(chosen.payload_json)));
    }
    validateRelations();
    if (sql("PRAGMA foreign_key_check").length) throw new Error("The changes contain broken library references");
  });
  return { addedChanges: [...incoming.keys()].filter((id) => !known.has(id)).length, conflicts: actions.conflicts().length };
}
function getLocal(key, fallback = null) {
  const row = sql("SELECT value FROM local_state WHERE key=?", [key])[0];
  return row ? JSON.parse(row.value) : fallback;
}
function setLocal(key, value) {
  const text = JSON.stringify(value);
  if (sql("SELECT value FROM local_state WHERE key=?", [key])[0]?.value !== text) sql("INSERT INTO local_state VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [key, text]);
}
function fileState(id) {
  return getLocal("file:" + id);
}
function setFileState(id, values) {
  const state = { present: false, pinned: false, ...fileState(id), ...values };
  setLocal("file:" + id, state);
  return state;
}
async function localFile(doc) {
  try {
    const file = await files.read(doc.storage_path);
    setFileState(doc.id, { present: true });
    return file;
  } catch (error) {
    if (error.name !== "NotFoundError") throw error;
    setFileState(doc.id, { present: false });
    return null;
  }
}
function associatedDocument(change) {
  const row = JSON.parse(change.payload_json);
  if (change.entity_type === "documents") return row.id;
  if (row.document_id) return row.document_id;
  if (row.entry_id) return sql("SELECT document_id FROM entries WHERE id=?", [row.entry_id])[0]?.document_id;
}
async function open() {
  if (initialized) return;
  if (!db) ({ database: db, files } = await openLibraryStorage(() => openConfiguredLibraryStorage(storageOptions)));
  sql("PRAGMA foreign_keys=ON");
  sql("PRAGMA trusted_schema=OFF");
  const applicationId = sql("PRAGMA application_id")[0].application_id;
  const existingTables = sql("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").map((row) => row.name);
  if (applicationId && applicationId !== 1381192781 || !applicationId && existingTables.length && !["documents", "entries", "changes"].every((name) => existingTables.includes(name))) {
    throw new Error("The selected database is not a Rostrum library.");
  }
  const version = sql("PRAGMA user_version")[0].user_version;
  if (version > 1) throw new Error("This library requires a newer Rostrum version.");
  transaction(() => {
    for (const [name, extra] of Object.entries(tables)) sql(`CREATE TABLE IF NOT EXISTS ${name} (
      id TEXT PRIMARY KEY NOT NULL, revision_id TEXT NOT NULL, deleted_at TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(metadata_json))${extra ? "," + extra : ""})`);
    sql("CREATE TABLE IF NOT EXISTS changes (id TEXT PRIMARY KEY, device_id TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, parent_revision_ids_json TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL)");
    sql("CREATE TABLE IF NOT EXISTS local_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    sql("CREATE INDEX IF NOT EXISTS changes_entity ON changes(entity_type, entity_id)");
    sql("CREATE INDEX IF NOT EXISTS entries_document ON entries(document_id)");
    sql("CREATE INDEX IF NOT EXISTS documents_hash ON documents(content_hash)");
    sql("CREATE INDEX IF NOT EXISTS entries_title ON entries(json_extract(metadata_json, '$.title'))");
    sql("PRAGMA user_version=1");
    sql("PRAGMA application_id=1381192781");
  });
  deviceId = sql("SELECT value FROM local_state WHERE key='device'")[0]?.value || crypto.randomUUID();
  sql("INSERT OR IGNORE INTO local_state VALUES ('device', ?)", [deviceId]);
  initialized = true;
}
var importedDocument = (hash) => sql("SELECT * FROM documents WHERE content_hash=? ORDER BY deleted_at IS NOT NULL, replaced_by_id IS NOT NULL, id LIMIT 1", [hash])[0];
var actions = {
  close() {
  },
  async availability({ destination = "" } = {}) {
    const inventory = getLocal("remote:" + destination, { changeIds: [], paths: [] });
    const remoteIds = new Set(inventory.changeIds), paths = new Set(inventory.paths);
    const pending2 = new Set(sql("SELECT * FROM changes").filter((change) => !remoteIds.has(change.id)).map(associatedDocument));
    const result = [];
    for (const doc of sql("SELECT * FROM documents")) {
      if (!fileState(doc.id)) await localFile(doc);
      result.push({ id: doc.id, ...fileState(doc.id), remote: paths.has(doc.storage_path), pending: pending2.has(doc.id) });
    }
    return result;
  },
  async fileInfo({ id, verify = false }) {
    const document = sql("SELECT * FROM documents WHERE id=?", [id])[0];
    if (!document) throw new Error("Score not found");
    const file = await localFile(document);
    if (file && verify && (file.size !== document.size_bytes || await hashBytes(await file.arrayBuffer()) !== document.content_hash)) throw new Error("Local score contents do not match the imported file");
    return { document, file };
  },
  async installFile({ id, file }) {
    await actions.verifyFile({ id, file });
    const doc = sql("SELECT * FROM documents WHERE id=?", [id])[0];
    await files.write(doc.storage_path, file);
    return setFileState(id, { present: true });
  },
  async verifyFile({ id, file }) {
    const doc = sql("SELECT * FROM documents WHERE id=?", [id])[0];
    if (!doc || !(file instanceof Blob) || file.size !== doc.size_bytes || await hashBytes(await file.arrayBuffer()) !== doc.content_hash) throw new Error("Downloaded score is damaged or does not match its hash");
    return true;
  },
  pinFile({ id, pinned }) {
    if (!sql("SELECT id FROM documents WHERE id=?", [id]).length) throw new Error("Score not found");
    return setFileState(id, { pinned: !!pinned });
  },
  async releaseFile({ id, destination }) {
    const doc = sql("SELECT * FROM documents WHERE id=?", [id])[0];
    if (!doc || !getLocal("remote:" + destination, { paths: [] }).paths.includes(doc.storage_path)) throw new Error("Upload this score before releasing its download");
    if (fileState(id)?.pinned) throw new Error("Turn off offline keeping before releasing this download");
    await files.remove(doc.storage_path);
    return setFileState(id, { present: false });
  },
  collectionDocuments({ table, id }) {
    if (table === "bookshelves") return sql("SELECT DISTINCT d.id FROM bookshelf_documents m JOIN documents d ON d.id=m.document_id WHERE m.bookshelf_id=? AND m.deleted_at IS NULL AND d.deleted_at IS NULL AND d.replaced_by_id IS NULL", [id]).map((row) => row.id);
    if (table === "playlists") return sql("SELECT DISTINCT d.id FROM playlist_items m JOIN entries e ON e.id=m.entry_id JOIN documents d ON d.id=e.document_id WHERE m.playlist_id=? AND m.deleted_at IS NULL AND e.deleted_at IS NULL AND d.deleted_at IS NULL", [id]).map((row) => row.id);
    throw new Error("Choose a bookshelf or playlist");
  },
  syncData() {
    return { deviceId, changes: sql("SELECT * FROM changes"), documents: sql("SELECT * FROM documents"), batches: getLocal("delta-batches", {}) };
  },
  mergeDelta({ changes }) {
    if (!Array.isArray(changes)) throw new Error("Invalid changes");
    const records = Object.fromEntries(Object.keys(tables).map((table) => [table, []]));
    const selected = /* @__PURE__ */ new Map();
    for (const change of changes) {
      if (!change || !Object.hasOwn(tables, change.entity_type)) throw new Error("Invalid change entity");
      selected.set(change.entity_type + ":" + change.entity_id, change);
    }
    for (const change of selected.values()) records[change.entity_type].push(JSON.parse(change.payload_json));
    const existing = new Set(sql("SELECT id FROM documents").map((doc) => doc.id));
    const result = mergeRecords({ records, changes });
    for (const doc of records.documents) if (!existing.has(doc.id)) setFileState(doc.id, { present: false });
    return result;
  },
  rememberBatch({ destination, id, changeIds }) {
    const batches = getLocal("delta-batches", {});
    if (!Object.hasOwn(batches, destination)) Object.defineProperty(batches, destination, { value: {}, enumerable: true, configurable: true, writable: true });
    Object.defineProperty(batches[destination], id, { value: changeIds, enumerable: true, configurable: true, writable: true });
    setLocal("delta-batches", batches);
  },
  remoteInventory({ destination, changeIds, paths }) {
    if (!Array.isArray(changeIds) || !Array.isArray(paths) || [...changeIds, ...paths].some((value) => typeof value !== "string")) throw new Error("Invalid remote inventory");
    for (const path of paths) scorePath(path);
    setLocal("remote:" + destination, { changeIds: [...new Set(changeIds)].sort(), paths: [...new Set(paths)].sort() });
    return actions.syncStatus({ destination });
  },
  syncStatus({ destination = "" } = {}) {
    const inventory = getLocal("remote:" + destination, { changeIds: [], paths: [] });
    const known = new Set(inventory.changeIds);
    return { pending: sql("SELECT id FROM changes").filter((row) => !known.has(row.id)).length, verified: !!getLocal("remote:" + destination), conflicts: actions.conflicts().length };
  },
  async findImportedFile({ file }) {
    const existing = importedDocument(await hashBytes(await file.arrayBuffer()));
    return existing ? { ...existing, alreadyImported: true } : null;
  },
  changeIds() {
    return sql("SELECT id FROM changes ORDER BY id").map((row) => row.id);
  },
  localState(args) {
    if (typeof args.key !== "string" || !["sync-packages:", "sync-published:"].some((prefix) => args.key.startsWith(prefix))) throw new Error("Invalid sync state key");
    if (Object.hasOwn(args, "value")) {
      if (!Array.isArray(args.value) || args.value.some((value) => typeof value !== "string")) throw new Error("Invalid sync state");
      sql("INSERT INTO local_state VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [args.key, JSON.stringify(args.value)]);
    }
    const row = sql("SELECT value FROM local_state WHERE key=?", [args.key])[0];
    return row ? JSON.parse(row.value) : null;
  },
  backup() {
    return exportLibraryPackage({ db, files, tables });
  },
  async importBackup({ bytes, file }) {
    const manifest = await readLibraryPackage(file || bytes, tables);
    const { incoming, normalize, known } = validateTransfer(manifest);
    const created = [];
    try {
      for (const doc of manifest.records.documents) {
        let existing;
        try {
          existing = await files.read(doc.storage_path);
        } catch (error) {
          if (error.name !== "NotFoundError") throw error;
        }
        if (existing) {
          if (await hashBytes(await existing.arrayBuffer()) !== doc.content_hash) throw new Error("A different file already exists at " + doc.storage_path);
        } else {
          await files.write(doc.storage_path, manifest.archive[doc.storage_path]);
          created.push(doc.storage_path);
        }
      }
      mergeRecords(manifest);
      for (const doc of manifest.records.documents) setFileState(doc.id, { present: true });
      return {
        addedChanges: [...incoming.keys()].filter((id) => !known.has(id)).length,
        conflicts: actions.conflicts().length,
        importedFiles: created.length
      };
    } catch (error) {
      for (const path of created) await files.remove(path).catch(() => {
      });
      throw error;
    }
  },
  conflicts() {
    const entities = sql("SELECT DISTINCT entity_type, entity_id FROM changes");
    return entities.flatMap((entity) => {
      const alternatives = heads(entity.entity_type, entity.entity_id);
      return alternatives.length > 1 ? [{ table: entity.entity_type, id: entity.entity_id, alternatives }] : [];
    });
  },
  resolveConflict({ table, id, revisionId, expectedRevisionIds }) {
    if (!Object.hasOwn(tables, table)) throw new Error("Unknown library record type");
    return transaction(() => {
      const alternatives = heads(table, id);
      if (!Array.isArray(expectedRevisionIds) || [...expectedRevisionIds].sort().join() !== alternatives.map((change) => change.id).sort().join()) throw new Error("This conflict changed. Refresh before resolving it.");
      const chosen = alternatives.find((change) => change.id === revisionId);
      if (!chosen || alternatives.length < 2) throw new Error("This conflict has already changed. Refresh before resolving it.");
      const row = JSON.parse(chosen.payload_json);
      delete row.revision_id;
      return save(table, row, alternatives.map((change) => change.id));
    });
  },
  async musicMetadataFiles({ file }) {
    if (/\.(musicxml|xml)$/i.test(file.name)) return { [file.name]: await file.text() };
    let total = 0;
    const selected = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: (entry) => {
      if (!/\.(mscx|musicxml|xml)$/i.test(entry.name) || entry.originalSize > 32 * 1024 * 1024) return false;
      total += entry.originalSize;
      return total <= 32 * 1024 * 1024;
    } });
    return Object.fromEntries(Object.entries(selected).map(([name, bytes]) => [name, new TextDecoder().decode(bytes)]));
  },
  async open() {
    await open();
    return { version: 1 };
  },
  async importFile({ file, entries, displayName = file.name, replacesId = null, derivedFromId = null }) {
    const id = crypto.randomUUID();
    const bytes = await file.arrayBuffer();
    const hash = await hashBytes(bytes);
    const existing = importedDocument(hash);
    if (existing) return { ...existing, alreadyImported: true };
    const normalized = file.name.normalize("NFC").replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").replace(/[ .]+$/, "");
    const extension = normalized.match(/\.[a-z0-9]{1,12}$/i)?.[0] || "";
    const stem = extension ? normalized.slice(0, -extension.length) : normalized;
    const safeName = ([...stem].slice(0, 100).join("").replace(/[ .]+$/, "") || "score") + extension;
    const path = `scores/${id}__${safeName}`;
    try {
      await files.write(path, bytes);
      return transaction(() => {
        const document = save("documents", {
          id,
          content_hash: hash,
          storage_path: path,
          size_bytes: file.size,
          settings_json: "{}",
          metadata_json: JSON.stringify({ displayName, originalFilename: file.name, format: file.name.split(".").pop().toLowerCase() })
        });
        setFileState(id, { present: true });
        for (const entry of entries) save("entries", {
          id: entry.id,
          document_id: id,
          parent_id: entry.parent_id || null,
          anchor_json: JSON.stringify(entry.anchor),
          metadata_json: JSON.stringify(entry.metadata),
          deleted_at: entry.deleted_at || null
        });
        if (derivedFromId) save("documents", { id, derived_from_id: derivedFromId });
        if (replacesId) {
          if (!sql("SELECT id FROM documents WHERE id=? AND deleted_at IS NULL", [replacesId]).length) throw new Error("Original score not found");
          save("documents", { id: replacesId, replaced_by_id: id });
          for (const link of sql("SELECT * FROM bookshelf_documents WHERE document_id=? AND deleted_at IS NULL", [replacesId])) {
            save("bookshelf_documents", {
              id: crypto.randomUUID(),
              bookshelf_id: link.bookshelf_id,
              document_id: id,
              order_key: link.order_key,
              metadata_json: link.metadata_json
            });
          }
          for (const link of sql("SELECT tag_id FROM document_tags WHERE document_id=? AND deleted_at IS NULL", [replacesId])) {
            save("document_tags", { id: crypto.randomUUID(), document_id: id, tag_id: link.tag_id });
          }
        }
        return document;
      });
    } catch (error) {
      await files.remove(path).catch(() => {
      });
      throw error;
    }
  },
  list({ query = "", tagIds = [], matchAll = false } = {}) {
    const rows = sql("SELECT * FROM documents WHERE deleted_at IS NULL AND replaced_by_id IS NULL");
    const needle = query.normalize("NFKC").toLocaleLowerCase();
    const links = sql("SELECT dt.document_id, dt.tag_id FROM document_tags dt JOIN tags t ON t.id=dt.tag_id WHERE dt.deleted_at IS NULL AND t.deleted_at IS NULL");
    return rows.filter((row) => {
      const metadata = JSON.parse(row.metadata_json);
      const tags = new Set(links.filter((link) => link.document_id === row.id).map((link) => link.tag_id));
      return [metadata.displayName, metadata.originalFilename].some((value) => String(value || "").normalize("NFKC").toLocaleLowerCase().includes(needle)) && (!tagIds.length || (matchAll ? tagIds.every((tag) => tags.has(tag)) : tagIds.some((tag) => tags.has(tag))));
    });
  },
  history() {
    return sql("SELECT * FROM documents");
  },
  useVersion({ id }) {
    return transaction(() => {
      let row = sql("SELECT * FROM documents WHERE id=?", [id])[0];
      if (!row) throw new Error("Score not found");
      const visited = /* @__PURE__ */ new Set([id]);
      while (row.replaced_by_id) {
        if (visited.has(row.replaced_by_id)) throw new Error("Cyclic replacement history");
        visited.add(row.replaced_by_id);
        row = sql("SELECT * FROM documents WHERE id=?", [row.replaced_by_id])[0];
        if (!row) throw new Error("Replacement score not found");
      }
      save("documents", { id, replaced_by_id: null, deleted_at: null });
      if (row.id !== id) save("documents", { id: row.id, replaced_by_id: id });
      return true;
    });
  },
  reindex({ documentId, entries }) {
    return transaction(() => {
      if (!sql("SELECT id FROM documents WHERE id=? AND deleted_at IS NULL", [documentId]).length) throw new Error("Score not found");
      const previous = sql("SELECT * FROM entries WHERE document_id=?", [documentId]);
      const mapping = /* @__PURE__ */ new Map();
      for (const entry of entries) {
        const matches = previous.filter((row) => {
          const metadata2 = JSON.parse(row.metadata_json);
          return entry.metadata.source?.key && metadata2.source?.key === entry.metadata.source.key && metadata2.source?.type === entry.metadata.source.type;
        });
        if (matches.length > 1) continue;
        const match = matches[0];
        const id = match?.id || entry.id;
        mapping.set(entry.id, id);
        if (match?.deleted_at) continue;
        const metadata = { ...entry.metadata };
        if (match) {
          const old = JSON.parse(match.metadata_json);
          Object.assign(metadata, old);
          for (const [key, value] of Object.entries(entry.metadata)) if (!(old.userEditedFields || []).includes(key)) metadata[key] = value;
        }
        save("entries", {
          id,
          document_id: documentId,
          parent_id: match && (metadata.userEditedFields || []).includes("parent") ? match.parent_id : entry.parent_id ? mapping.get(entry.parent_id) || null : null,
          anchor_json: match && (metadata.userEditedFields || []).includes("anchor") ? match.anchor_json : JSON.stringify(entry.anchor),
          metadata_json: JSON.stringify(metadata)
        });
      }
      return { count: entries.length };
    });
  },
  async songState({ id }) {
    const state = await actions.read({ id });
    return { ...state, entries: sql("SELECT * FROM entries WHERE document_id=?", [id]) };
  },
  editSongs({ documentId, expectedRevisionId, expectedEntries, displayName, entries }) {
    return transaction(() => {
      const document = sql("SELECT * FROM documents WHERE id=? AND deleted_at IS NULL", [documentId])[0];
      if (!document) throw new Error("Score not found");
      const current = sql("SELECT id, revision_id, deleted_at FROM entries WHERE document_id=?", [documentId]);
      const expected = new Map(expectedEntries.map((row) => [row.id, row.revision_id]));
      if (document.revision_id !== expectedRevisionId || current.length !== expected.size || current.some((row) => expected.get(row.id) !== row.revision_id)) {
        throw new Error("This score or its songs changed while the dialog was open. Cancel and reopen it before saving.");
      }
      const ids = new Set(entries.map((entry) => entry.id));
      if (ids.size !== entries.length || current.some((row) => !row.deleted_at && !ids.has(row.id))) throw new Error("Invalid song list");
      if (typeof displayName !== "string" || !displayName.trim()) throw new Error("Enter a library score name");
      for (const entry of entries) {
        const owner = sql("SELECT document_id FROM entries WHERE id=?", [entry.id])[0];
        if (owner && (owner.document_id !== documentId || !expected.has(entry.id))) throw new Error("A song identity belongs to another score or changed since opening");
        if (!entry.deleted_at && (!entry.metadata?.title?.trim() || !Number.isInteger(entry.anchor?.pageIndex) || entry.anchor.pageIndex < 0)) throw new Error("Enter a song title and valid start page");
        save("entries", {
          id: entry.id,
          document_id: documentId,
          parent_id: entry.parent_id || null,
          anchor_json: JSON.stringify(entry.anchor),
          metadata_json: JSON.stringify(entry.metadata),
          deleted_at: entry.deleted_at || null
        });
      }
      validateRelations();
      const updated = save("documents", { id: documentId, metadata_json: JSON.stringify({ ...JSON.parse(document.metadata_json), displayName: displayName.trim() }) });
      return { document: updated, entries: sql("SELECT id, revision_id FROM entries WHERE document_id=?", [documentId]) };
    });
  },
  search({ query = "", tagIds = [], matchAll = false }) {
    const rows = sql(`SELECT e.*, d.metadata_json AS document_metadata FROM entries e JOIN documents d ON d.id=e.document_id
      WHERE e.deleted_at IS NULL AND d.deleted_at IS NULL AND d.replaced_by_id IS NULL`);
    const needle = query.normalize("NFKC").toLocaleLowerCase();
    const links = [
      ...sql("SELECT entry_id, tag_id FROM entry_tags WHERE deleted_at IS NULL"),
      ...sql("SELECT document_id, tag_id FROM document_tags WHERE deleted_at IS NULL")
    ];
    const activeTags = new Set(sql("SELECT id FROM tags WHERE deleted_at IS NULL").map((t) => t.id));
    return rows.filter((row) => {
      const m = JSON.parse(row.metadata_json);
      const textMatch = [m.title, m.composer, ...m.aliases || []].some((v2) => String(v2 || "").normalize("NFKC").toLocaleLowerCase().includes(needle));
      const tags = new Set(links.filter((l) => l.entry_id === row.id || l.document_id === row.document_id).map((l) => l.tag_id).filter((t) => activeTags.has(t)));
      return textMatch && (!tagIds.length || (matchAll ? tagIds.every((t) => tags.has(t)) : tagIds.some((t) => tags.has(t))));
    });
  },
  async read({ id }) {
    const document = sql("SELECT * FROM documents WHERE id=? AND deleted_at IS NULL", [id])[0];
    if (!document) throw new Error("Score not found");
    return { document, file: await files.read(document.storage_path), annotations: sql("SELECT * FROM annotations WHERE document_id=? AND deleted_at IS NULL", [id]) };
  },
  saveState({ documentId, settings, annotations }) {
    return transaction(() => {
      if (!sql("SELECT id FROM documents WHERE id=? AND deleted_at IS NULL", [documentId]).length) throw new Error("Score not found");
      const existing = sql("SELECT * FROM annotations WHERE document_id=? AND deleted_at IS NULL", [documentId]);
      const ids = /* @__PURE__ */ new Set();
      for (const annotation of annotations) {
        if (ids.has(annotation.id)) throw new Error("Duplicate annotation identity");
        ids.add(annotation.id);
        const owner = sql("SELECT document_id FROM annotations WHERE id=?", [annotation.id])[0];
        if (owner && owner.document_id !== documentId) throw new Error("Annotation belongs to a different score");
        save("annotations", {
          id: annotation.id,
          document_id: documentId,
          deleted_at: null,
          anchor_json: JSON.stringify(annotation.anchor),
          content_json: JSON.stringify(annotation.content)
        });
      }
      for (const previous of existing) if (!ids.has(previous.id)) save("annotations", { id: previous.id, deleted_at: (/* @__PURE__ */ new Date()).toISOString() });
      return save("documents", { id: documentId, settings_json: JSON.stringify(settings) });
    });
  },
  update({ table, values, expectedRevisionId }) {
    return transaction(() => {
      if (expectedRevisionId && sql(`SELECT revision_id FROM ${Object.hasOwn(tables, table) ? table : "documents"} WHERE id=?`, [values.id])[0]?.revision_id !== expectedRevisionId) throw new Error("This item changed. Refresh the list before editing it.");
      return save(table, values);
    });
  },
  link({ table, values }) {
    if (!["document_tags", "entry_tags", "bookshelf_documents", "playlist_items"].includes(table)) throw new Error("Invalid membership");
    return transaction(() => {
      if (table !== "playlist_items") {
        const rows = sql(`SELECT * FROM ${table} WHERE deleted_at IS NULL`);
        const existing = rows.find((row) => Object.entries(values).filter(([key]) => key !== "order_key").every(([key, value]) => row[key] === value));
        if (existing) return existing;
      }
      return save(table, { id: crypto.randomUUID(), ...values });
    });
  },
  records({ table, parent, id }) {
    if (!Object.hasOwn(tables, table)) throw new Error("Unknown library record type");
    const columns = new Set(sql(`PRAGMA table_info(${table})`).map((c) => c.name));
    if (parent && !columns.has(parent)) throw new Error("Unknown parent field");
    return sql(`SELECT * FROM ${table} WHERE deleted_at IS NULL${parent ? ` AND ${parent}=?` : ""}`, parent ? [id] : []);
  },
  moveItem({ table, id, direction }) {
    if (!["playlist_items", "bookshelf_documents"].includes(table) || ![-1, 1].includes(direction)) throw new Error("Invalid move");
    return transaction(() => {
      const parent = table === "playlist_items" ? "playlist_id" : "bookshelf_id";
      const item = sql(`SELECT * FROM ${table} WHERE id=? AND deleted_at IS NULL`, [id])[0];
      if (!item) throw new Error("Item not found");
      const rows = sql(`SELECT * FROM ${table} WHERE ${parent}=? AND deleted_at IS NULL ORDER BY order_key, id`, [item[parent]]);
      const index = rows.findIndex((row) => row.id === id);
      const target = index + direction;
      if (target < 0 || target >= rows.length) return;
      rows.splice(target, 0, rows.splice(index, 1)[0]);
      rows.forEach((row, i2) => save(table, { id: row.id, order_key: String(i2 + 1).padStart(16, "0") }));
    });
  },
  export() {
    return db.export();
  }
};
var queue = Promise.resolve();
self.onmessage = ({ data }) => {
  if (data.hostReply) return;
  const { id, action, args } = data;
  queue = queue.then(async () => {
    let actionCompleted = false, value;
    try {
      if (!Object.hasOwn(actions, action)) throw new Error("Unknown library operation");
      if (action === "open" && args?.storage) {
        if (db) throw new Error("Close the current library before changing storage");
        storageOptions = args.storage;
      }
      if (action === "close") {
        if (db) {
          await db.flush();
          await db.close();
        }
        db = files = null;
        initialized = false;
        self.postMessage({ id, value: true });
        return;
      }
      await open();
      value = await actions[action](args || {});
      actionCompleted = true;
      if (!["backup", "export"].includes(action)) await db.flush();
      self.postMessage({ id, value });
    } catch (error) {
      self.postMessage({
        id,
        error: error.message,
        errorName: error.name,
        persistenceFailed: actionCompleted,
        committedValue: actionCompleted ? value : void 0
      });
    }
  });
};
self.postMessage({ ready: true });
/*! Bundled license information:

@sqlite.org/sqlite-wasm/dist/index.mjs:
  (* @preserve
  **
  ** LICENSE for the sqlite3 WebAssembly/JavaScript APIs.
  **
  ** This bundle (typically released as sqlite3.js or sqlite3.mjs)
  ** is an amalgamation of JavaScript source code from two projects:
  **
  ** 1) https://emscripten.org: the Emscripten "glue code" is covered by
  **    the terms of the MIT license and University of Illinois/NCSA
  **    Open Source License, as described at:
  **
  **    https://emscripten.org/docs/introducing_emscripten/emscripten_license.html
  **
  ** 2) https://sqlite.org: all code and documentation labeled as being
  **    from this source are released under the same terms as the sqlite3
  **    C library:
  **
  ** 2022-10-16
  **
  ** The author disclaims copyright to this source code.  In place of a
  ** legal notice, here is a blessing:
  **
  ** *   May you do good and not evil.
  ** *   May you find forgiveness for yourself and forgive others.
  ** *   May you share freely, never taking more than you give.
  *)
  (* @preserve
  ** This code was built from sqlite3 version...
  **
  ** SQLITE_VERSION "3.54.1"
  ** SQLITE_VERSION_NUMBER 3054001
  ** SQLITE_SOURCE_ID "2026-10-16 14:45:20 555e07ef33f69a0957d24d8e555b702464a131d6f1607f4c3c1e4551e8e6ca76"
  **
  ** Emscripten SDK: 5.0.5
  *)
*/
