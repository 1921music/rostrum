// Tera 2.4.0 (https://github.com/Keats/tera)
//
// The MIT License (MIT)
//
// Copyright (c) 2025 Vincent Prouillet
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
//
//
// Serde and serde_core 1.0.229 (https://github.com/serde-rs/serde)
//
// Permission is hereby granted, free of charge, to any
// person obtaining a copy of this software and associated
// documentation files (the "Software"), to deal in the
// Software without restriction, including without
// limitation the rights to use, copy, modify, merge,
// publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software
// is furnished to do so, subject to the following
// conditions:
//
// The above copyright notice and this permission notice
// shall be included in all copies or substantial portions
// of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF
// ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
// TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT
// SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
// CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
// IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
// DEALINGS IN THE SOFTWARE.
//
//
// OpenBook shared LilyPond Tera macro (src/include/defs.ly.tera at 2295e2c)
// https://github.com/veltzer/book-openbook
//
// MIT License
//
// Copyright (c) 2026 Mark Veltzer <mark.veltzer@gmail.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
//
// LilyPond predefined guitar fretboard data
// https://github.com/lilypond/lilypond/tree/stable/2.24/ly
// Derived from predefined-guitar-fretboards.ly and predefined-guitar-ninth-fretboards.ly.
// Copyright (C) 2008-2022 Carl D. Sorensen.
// Licensed under GNU GPL version 3 or later.
// SPDX-License-Identifier: GPL-3.0-only
async function loadWasm (binary) {
  if (!binary) {
    const response = await fetch(new URL('./lilypond.wasm', import.meta.url))
    if (!response.ok) throw new Error('Could not load lilypond.wasm')
    binary = await response.arrayBuffer()
  }
  const { instance } = await WebAssembly.instantiate(await binary)
  return instance.exports
}

function render (wasm, operation) {
  const { memory, lilypond_input } = wasm
  const decoder = new TextDecoder()
  return (source, ...args) => {
    const input = lilypond_input(source.byteLength)
    new Uint8Array(memory.buffer, input, source.byteLength).set(source)
    const output = operation(...args)
    const header = new DataView(memory.buffer, output, 5)
    const length = header.getUint32(0, true)
    const bytes = new Uint8Array(memory.buffer, output + 5, length - 5)
    if (header.getUint8(4)) throw new Error(decoder.decode(bytes))
    return bytes.slice()
  }
}

export async function loadLilyPond (binary) {
  const wasm = await loadWasm(binary)
  const convert = render(wasm, wasm.lilypond_convert)
  return {
    toMusicXml (source, { measureNumbers } = {}) {
      const numbering = measureNumbers === 'system' ? 1 : measureNumbers === 'none' ? 2 : 0
      return convert(source, numbering)
    },
    expandTemplate: render(wasm, wasm.lilypond_render_template)
  }
}

// Book and entry boundaries match the native CLI and the OpenBook source
// exporter. Single scores go straight to the converter.
export function openBookEntries (source) {
  const parts = [...source.matchAll(/^[ \t]*\\bookpart[ \t]*\{/gm)].map(m => m.index)
  if (parts.length <= 1) return []
  parts.push(source.length)
  const entries = []
  let part = 0
  for (const toc of source.matchAll(/^\\tocItem\s+\\markup\s+"((?:[^"\\]|\\.)*)"/gm)) {
    while (parts[part + 1] <= toc.index) ++part
    if (parts[part] <= toc.index) {
      const start = parts[part]
      const end = parts[part + 1]
      entries.push({ title: toc[1], start, end })
    }
  }
  return entries
}
