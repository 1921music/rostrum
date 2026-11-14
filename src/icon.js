// +skip
/**
 * Copyright 2025 Glendon Diener
 * This file is part of Rostrum, distributed under the GNU Affero General
 * Public License, version 3 or later. See <https://www.gnu.org/licenses/>.
 */
export { iconPaths };
// -skip

// UI icons share a 24 x 24 grid, 1.6-unit strokes and rounded ends. Fragments
// are self-contained because menus also insert them directly into existing SVGs.
const lineIcon = body => `<g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
const iconPath = d => `<path d="${d}"/>`;
const iconRect = (x,y,w,h,r=1.5) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`;
const iconCircle = (x,y,r) => `<circle cx="${x}" cy="${y}" r="${r}"/>`;
const sheetIcon = 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Zm0 0v5h5';
const pageLines = 'M8 12h8M8 16h8';
const copyIcon = iconRect(8,8,12,13) + iconPath('M16 5V3H4v14h1');
const pasteIcon = iconRect(8,3,8,4) + iconPath('M8 5H5v16h14V5h-3M9 12h6M9 16h6');
const speakerIcon = 'M10 5 5 9H2v6h3l5 4Z';
const refreshIcon = 'M20 7v5h-5M4 17v-5h5M5.3 7a8 8 0 0 1 13.2-1L20 8M4 16l1.5 2A8 8 0 0 0 18.7 17';
const mirrorIcon = 'M12 3v18M8 6 3 18h5Zm8 0 5 12h-5Z';
const pianoIcon = iconRect(3,5,18,14) + iconPath('M7.5 5v14M12 5v14M16.5 5v14M6 5v7h3V5M15 5v7h3V5');
const clockFace = iconCircle(12,13,8) + iconPath('M9 2h6M12 2v3M18 6l2-2');
const bandPage = iconRect(7,7,10,10,0);
const imageIcon = iconRect(3,3,18,18) + iconCircle(8,8,1.5) + iconPath('m3 17 6-6 5 5 3-3 4 4');

let iconPaths = {
  Add: lineIcon(iconPath('M12 5v14M5 12h14')),
  About: lineIcon(iconCircle(12,12,9) + iconPath('M12 11v6M12 7h.01')),
  Alpha: lineIcon(iconCircle(9,12,6) + iconCircle(15,12,6)),
  'Blank Page': lineIcon(iconRect(5,3,14,18)),
  Book: lineIcon(iconPath('M12 5C8 3 5 3 2 4v15c3-1 6-1 10 1 4-2 7-2 10-1V4c-3-1-6-1-10 1Zm0 0v15')),
  Brush: lineIcon(iconPath('m14 6 4-3a2 2 0 0 1 3 3l-9 9-3-3ZM9 12l3 3M9 14c-5-1-3 5-7 6 5 2 9-1 8-5')),
  Cancel: lineIcon(iconCircle(12,12,9) + iconPath('M8 12h8')),
  Center: lineIcon(iconRect(3,3,18,18) + iconRect(8,8,8,8,0)),
  Clock: lineIcon(iconCircle(12,12,9) + iconPath('M12 7v5l3 2')),
  Clone: lineIcon(copyIcon),
  Close: lineIcon(iconPath('m6 6 12 12M6 18 18 6')),
  'Close Panel': lineIcon(iconPath('m6 6 12 12M6 18 18 6')),
  Curtain: lineIcon(iconPath('M2 4h20M3 4v16h4L9 4M21 4v16h-4L15 4M5 9l2 1M19 9l-2 1')),
  'Curtain On': lineIcon(iconPath('M2 4h20M3 4v16h9V4M21 4v16h-9M6 7v10M18 7v10')),
  'Curtain Black': lineIcon(iconRect(3,5,18,14) + '<path d="M7 9h10v6H7Z" fill="#202938" stroke="none"/>'),
  'Curtain Red': lineIcon(iconRect(3,5,18,14) + '<path d="M7 9h10v6H7Z" fill="#a00000" stroke="none"/>'),
  Edit: lineIcon(iconRect(5,5,14,14,0) + iconRect(3,3,4,4,0) + iconRect(17,17,4,4,0)),
  'Export Page': lineIcon(iconPath('M11 3H5v18h14v-7M12 12l9-9M15 3h6v6')),
  'Import Page': lineIcon(iconPath('M13 3H5v18h14v-7M21 3l-9 9M12 6v6h6')),
  'Copy Page': lineIcon(copyIcon),
  Cut: lineIcon(iconCircle(6,6,3) + iconCircle(6,18,3) + iconPath('m8.1 8.1 12 12M8.1 15.9 20 4')),
  'Cut Page': lineIcon(iconPath('M5 7V3h14v18H5v-4M12 9l9 6M12 15l9-6') + iconCircle(9,8,2) + iconCircle(9,16,2)),
  Copy: lineIcon(copyIcon),
  'Delete Page': lineIcon(iconPath(sheetIcon + 'M9 12l6 6M9 18l6-6')),
  Details: lineIcon(iconPath('M3 6h4M11 6h10M3 12h10M17 12h4M3 18h4M11 18h10') + iconCircle(9,6,2) + iconCircle(15,12,2) + iconCircle(9,18,2)),
  Dark: lineIcon(iconPath('M20.5 13.5A9 9 0 0 1 10.5 3a9 9 0 1 0 10 10.5Z')),
  Glass: lineIcon(iconRect(3,3,18,18) + iconPath('M3 9h18M9 9v12M14 14l4 4')),
  Expand: lineIcon(iconPath('M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6M3 3l5 5M21 3l-5 5M3 21l5-5M21 21l-5-5')),
  File: lineIcon(iconPath(sheetIcon)),
  'Fit Auto': lineIcon(iconPath('M4 8V4h4M16 4h4v4M4 16v4h4M20 16v4h-4M8 12h8M12 8v8')),
  'Fit Height': lineIcon(iconPath('M5 3h14M5 21h14M12 6v12M9 9l3-3 3 3M9 15l3 3 3-3')),
  'Fit None': lineIcon('<rect x="4" y="4" width="16" height="16" rx="1" stroke-dasharray="2 4"/>'),
  'Fit Width': lineIcon(iconPath('M3 5v14M21 5v14M6 12h12M9 9l-3 3 3 3M15 9l3 3-3 3')),
  Flatten: lineIcon(iconPath('m3 8 9-5 9 5-9 5ZM3 12l9 5 9-5M3 16l9 5 9-5')),
  'Flute Mirrored': lineIcon(iconPath(mirrorIcon + 'M3 5h5')),
  'Flute Flipped': lineIcon(iconPath(mirrorIcon + 'M16 5h5')),
  Folder: lineIcon(iconPath('M3 7V5h6l2 2h10v13H3ZM3 10h18')),
  Free: lineIcon(iconPath('M3 13c3-10 6-10 9 0s6 10 9-2')),
  'Full Screen': lineIcon(iconPath('M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5')),
  Grid: lineIcon(iconRect(3,3,18,18) + iconPath('M9 3v18M15 3v18M3 9h18M3 15h18')),
  Guide: lineIcon(iconPath('m4 20 4-1L20 7l-3-3L5 16ZM14 7l3 3M4 20h16')),
  'Horizontal Scroll': lineIcon(iconRect(7,5,10,14) + iconPath('M2 5v14M22 5v14M10 10h4M10 14h4')),
  Inch: lineIcon(iconRect(3,5,18,14) + iconPath('M7 5v6M12 5v9M17 5v6')),
  Ink: lineIcon(iconPath('M4 20 7 9l8-6 6 6-6 8ZM4 20l7-7M11 13h.01M7 9l8 8')),
  Jpg: lineIcon(imageIcon),
  Keyboard: lineIcon(iconRect(2,5,20,14) + iconPath('M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10')),
  Layout: lineIcon(iconRect(3,3,18,18) + iconPath('M3 9h18M9 9v12')),
  Light: lineIcon(iconCircle(12,12,4) + iconPath('M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5')),
  Local: lineIcon(iconRect(3,4,18,13) + iconPath('M8 21h8M12 17v4')),
  'L-R': lineIcon(iconPath('M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4')),
  Magnify: lineIcon(iconCircle(10.5,10.5,6.5) + iconPath('m15.5 15.5 5 5')),
  Mark: lineIcon(iconPath('M6 3h12v18l-6-4-6 4Z')),
  Menu: lineIcon(iconCircle(12,12,9) + iconCircle(12,12,3) + iconPath('M12 3v6M12 15v6M3 12h6M15 12h6')),
  Merge: lineIcon(iconPath('M5 3v4c0 4 7 4 7 8v6M19 3v4c0 4-7 4-7 8M8 17l4 4 4-4')),
  Metric: lineIcon(iconRect(3,5,18,14) + iconPath('M6 5v4M9 5v7M12 5v4M15 5v7M18 5v4')),
  Metronome: lineIcon(iconPath('M9 3h6l5 18H4ZM7 17h10M12 17 6 6') + iconRect(6,7,3,3,.5)),
  Mike: lineIcon(iconRect(9,3,6,12,3) + iconPath('M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8')),
  Mirror: lineIcon(iconPath(mirrorIcon)),
  More: lineIcon(iconCircle(5,12,1) + iconCircle(12,12,1) + iconCircle(19,12,1)),
  'New Folder': lineIcon(iconPath('M3 8V5h6l2 2h10v13H3ZM12 11v6M9 14h6')),
  'New Page': lineIcon(iconPath(sheetIcon + 'M12 10v8M8 14h8')),
  'New Score': lineIcon(iconPath('M4 21V4h12M8 21V8h12v13ZM14 11v7M11 14.5h6')),
  'Next Mark': lineIcon(iconPath('M4 3h10v18l-5-4-5 4ZM17 9l4 3-4 3')),
  'Next Page': lineIcon(iconPath('M11 3H4v18h14v-5M13 10h8M18 7l3 3-3 3')),
  'No Ink': lineIcon(iconPath('M6 15 8 9l7-6 6 6-5 5M4 20l4-1M3 3l18 18')),
  'Normal Screen': lineIcon(iconPath('M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5')),
  'Not Pdf': lineIcon(iconPath(sheetIcon + 'M3 3l18 18')),
  Mute: lineIcon(iconPath(speakerIcon + 'M15 9l6 6M15 15l6-6')),
  Numbers: lineIcon(iconPath(sheetIcon + 'M10 12l2-1v7M10 18h4')),
  'Numbers L-R': lineIcon(bandPage + iconPath('M3 7v10M21 7v10')),
  'Numbers T-B': lineIcon(bandPage + iconPath('M7 3h10M7 21h10')),
  'Numbers Inset': lineIcon(bandPage + iconPath('M21 7v10')),
  'Numbers Over': lineIcon(bandPage + iconPath('M15 8v8')),
  OK: lineIcon(iconCircle(12,12,9) + iconPath('m7 12 3 3 7-7')),
  Open: lineIcon(iconPath('M3 10V5h6l2 2h9v3M3 10h19l-3 10H2Z')),
  Options: lineIcon(iconPath('M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z') + iconCircle(12,12,3)),
  Page: lineIcon(iconPath('M4 17V3h12v14ZM8 21h12V7M7 7h6M7 11h6')),
  Paste: lineIcon(pasteIcon),
  'Paste Page': lineIcon(pasteIcon),
  Pause: lineIcon(iconRect(6,4,4,16,.5) + iconRect(14,4,4,16,.5)),
  Pdf: lineIcon(iconPath(sheetIcon + pageLines)),
  Pedal: lineIcon(iconPath('M3 17h18v4H3ZM6 16l3-9h9l-3 9M10 10h6')),
  'Pedal Up': lineIcon(iconPath('M3 17h18v4H3ZM6 14l3-8h9l-2 5M12 9V2M9 5l3-3 3 3')),
  Pen: lineIcon(iconPath('M3 21 7 8l8-5 6 6-5 8ZM3 21l9-9M7 8l9 9') + iconCircle(12,12,1.5)),
  Pencil: lineIcon(iconPath('m4 15 12-12 5 5L9 20l-6 1ZM13 6l5 5M4 15l5 5')),
  Piano: lineIcon(pianoIcon),
  Play: lineIcon(iconPath('m7 4 14 8-14 8Z')),
  Png: lineIcon(imageIcon),
  Print: lineIcon(iconPath('M7 8V3h10v5M7 17H3V8h18v9h-4M7 14h10v7H7ZM17 11h1')),
  Range: lineIcon(iconPath('M3 5v14M21 5v14M6 12h12M9 9l-3 3 3 3M15 9l3 3-3 3')),
  Rastrum: lineIcon(iconPath('M3 5h18M3 8.5h18M3 12h18M3 15.5h18M3 19h18')),
  Refresh: lineIcon(iconPath(refreshIcon)),
  Replace: lineIcon(iconPath('M3 7h18M17 3l4 4-4 4M21 17H3M7 13l-4 4 4 4')),
  Reload: lineIcon(iconPath('M20 10a8 8 0 1 0 0 5M20 3v7h-7')),
  Repeat: lineIcon(iconPath('M4 4v16M7 4v16M17 4v16M20 4v16') + iconCircle(10,9,.5) + iconCircle(10,15,.5) + iconCircle(14,9,.5) + iconCircle(14,15,.5)),
  Replay: lineIcon(iconPath('M3 10a9 9 0 1 1 1 7M3 3v7h7M11 9l5 3-5 3Z')),
  Reset: lineIcon(clockFace + iconPath('M12 13V8M4 3v5h5')),
  Review: lineIcon(iconRect(3,4,18,16) + iconPath('m10 8 6 4-6 4Z')),
  Row: lineIcon(iconRect(3,3,18,18) + iconPath('M3 9h18M3 15h18')),
  Save: lineIcon(iconPath('M5 3h12l4 4v14H3V3ZM7 3v6h9V3M7 21v-7h10v7')),
  Score: lineIcon(iconPath('M3 21V5h4v16M8 21V3h4v18M14 5l4-1 4 16-4 1Z')),
  ShowTrace: lineIcon(iconPath('M2 12c5-9 15-9 20 0-5 9-15 9-20 0Z') + iconCircle(12,12,3)),
  HideTrace: lineIcon(iconPath('M3 3l18 18M6 6C4 7 3 9 2 12c5 9 15 9 20 0-1-3-3-5-5-6M10 4h3M9 10a3 3 0 0 0 4 4')),
  Slope: lineIcon(iconPath('m4 4 16 16M4 10V4h6M14 20h6v-6')),
  Speaker: lineIcon(iconRect(5,3,14,18) + iconCircle(12,15,3.5) + iconCircle(12,7,1)),
  Split: lineIcon(clockFace + iconPath('M12 8v5l4 2')),
  Start: lineIcon(iconCircle(12,12,9) + iconPath('m10 8 6 4-6 4Z')),
  Stop: lineIcon(iconRect(5,5,14,14)),
  Stopwatch: lineIcon(clockFace + iconPath('M12 8v5l-3 2')),
  Storage: lineIcon(iconRect(3,4,18,16) + iconPath('M3 14h18M7 17h.01M11 17h.01')),
  Stretcher: lineIcon('<ellipse cx="12" cy="12" rx="7" ry="4" transform="rotate(-25 12 12)"/>'),
  Symbols: lineIcon(iconPath('M9 17V5l11-2v12M9 8l11-2') + '<ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>'),
  Table: lineIcon(iconRect(3,3,7,7,1) + iconRect(14,3,7,7,1) + iconRect(3,14,7,7,1) + iconRect(14,14,7,7,1)),
  Text: lineIcon(iconPath('M4 5h16M12 5v15M8 20h8M4 5v3M20 5v3')),
  Trash: lineIcon(iconPath('M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7')),
  TuningFork: lineIcon(iconPath('M7 3v7a5 5 0 0 0 10 0V3M12 15v7M10 22h4')),
  'T-B': lineIcon(iconPath('M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4')),
  Undo: lineIcon(iconPath('M4 4v6h6M4 10a8 8 0 1 1 2 9')),
  Unmute: lineIcon(iconPath(speakerIcon + 'M14 8a5 5 0 0 1 0 8M17 5a9 9 0 0 1 0 14')),
  Upload: lineIcon(iconPath('M12 16V3M7 8l5-5 5 5M3 15v6h18v-6')),
  'Vertical Scroll': lineIcon(iconRect(5,7,14,10) + iconPath('M5 2h14M5 22h14M9 10h6M9 14h6')),
  Void: '<path d=""/>',
  Volume: lineIcon(iconPath(speakerIcon + 'M14 8a5 5 0 0 1 0 8M17 5a9 9 0 0 1 0 14')),
  Video: lineIcon(iconRect(3,6,12,12) + iconPath('m15 10 6-4v12l-6-4')),
  'Wakelock Off': lineIcon(iconRect(3,5,14,12) + iconPath('M7 21h6M10 17v4M19 5h3M20 2v6')),
  'Wakelock On': lineIcon(iconRect(3,5,14,12) + iconPath('M7 21h6M10 17v4M18 5l2 2 3-4')),
  Wave: lineIcon(iconPath('M2 12h3l3-8 4 16 4-12 3 4h3')),
  Webcam: lineIcon(iconCircle(12,10,7) + iconCircle(12,10,3) + iconPath('M9 17v4M15 17v4M6 21h12')),
};

// Provider and product logos retain their identities rather than acting as UI glyphs.
Object.assign(iconPaths, {"Drive":"<svg viewBox=\"0 0 32 32\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n  <path d=\"M16.0019 12.4507L12.541 6.34297C12.6559 6.22598 12.7881 6.14924 12.9203 6.09766C11.8998 6.43355 11.4315 7.57961 11.4315 7.57961L5.10895 18.7345C5.01999 19.0843 4.99528 19.4 5.0064 19.6781H11.9072L16.0019 12.4507Z\" fill=\"#34A853\"/>\n  <path d=\"M16.002 12.4507L20.0967 19.6781H26.9975C27.0086 19.4 26.9839 19.0843 26.8949 18.7345L20.5724 7.57961C20.5724 7.57961 20.1029 6.43355 19.0835 6.09766C19.2145 6.14924 19.3479 6.22598 19.4628 6.34297L16.002 12.4507Z\" fill=\"#FBBC05\"/>\n  <path d=\"M16.0019 12.4514L19.4628 6.34371C19.3479 6.22671 19.2144 6.14997 19.0835 6.09839C18.9327 6.04933 18.7709 6.01662 18.5954 6.00781H18.4125H13.5913H13.4084C13.2342 6.01536 13.0711 6.04807 12.9203 6.09839C12.7894 6.14997 12.6559 6.22671 12.541 6.34371L16.0019 12.4514Z\" fill=\"#188038\"/>\n  <path d=\"M11.9082 19.6782L8.48687 25.7168C8.48687 25.7168 8.3732 25.6614 8.21875 25.5469C8.70434 25.9206 9.17633 25.9998 9.17633 25.9998H22.6134C23.3547 25.9998 23.5092 25.7168 23.5092 25.7168C23.5116 25.7155 23.5129 25.7142 23.5153 25.713L20.0965 19.6782H11.9082Z\" fill=\"#4285F4\"/>\n  <path d=\"M11.9086 19.6782H5.00781C5.04241 20.4985 5.39826 20.9778 5.39826 20.9778L5.65773 21.4281C5.67627 21.4546 5.68739 21.4697 5.68739 21.4697L6.25205 22.461L7.51976 24.6676C7.55683 24.7569 7.60008 24.8386 7.6458 24.9166C7.66309 24.9431 7.67915 24.972 7.69769 24.9972C7.70263 25.0047 7.70757 25.0123 7.71252 25.0198C7.86944 25.2412 8.04489 25.4123 8.22034 25.5469C8.37479 25.6627 8.48847 25.7168 8.48847 25.7168L11.9086 19.6782Z\" fill=\"#1967D2\"/>\n  <path d=\"M20.0967 19.6782H26.9974C26.9628 20.4985 26.607 20.9778 26.607 20.9778L26.3475 21.4281C26.329 21.4546 26.3179 21.4697 26.3179 21.4697L25.7532 22.461L24.4855 24.6676C24.4484 24.7569 24.4052 24.8386 24.3595 24.9166C24.3422 24.9431 24.3261 24.972 24.3076 24.9972C24.3026 25.0047 24.2977 25.0123 24.2927 25.0198C24.1358 25.2412 23.9604 25.4123 23.7849 25.5469C23.6305 25.6627 23.5168 25.7168 23.5168 25.7168L20.0967 19.6782Z\" fill=\"#EA4335\"/>\n  </svg>","Dropbox":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-35.3175 -50 306.085 300\"><defs id=\"defs112\"><style id=\"style110\">.cls-1{fill:#0061ff}</style></defs><path id=\"polygon116\" class=\"cls-1\" d=\"M58.86 75l58.87-37.5L58.86 0 0 37.5z\"/><path id=\"polygon118\" class=\"cls-1\" d=\"M176.59 75l58.86-37.5L176.59 0l-58.86 37.5z\"/><path id=\"polygon120\" class=\"cls-1\" d=\"M117.73 112.5L58.86 75 0 112.5 58.86 150z\"/><path id=\"polygon122\" class=\"cls-1\" d=\"M176.59 150l58.86-37.5L176.59 75l-58.86 37.5z\"/><path id=\"polygon124\" class=\"cls-1\" d=\"M176.59 162.5L117.73 125l-58.87 37.5 58.87 37.5z\"/></svg>","OneDrive":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 5.5 32 20.5\"><g id=\"STYLE_COLOR\"><path d=\"M12.20245,11.19292l.00031-.0011,6.71765,4.02379,4.00293-1.68451.00018.00068A6.4768,6.4768,0,0,1,25.5,13c.14764,0,.29358.0067.43878.01639a10.00075,10.00075,0,0,0-18.041-3.01381C7.932,10.00215,7.9657,10,8,10A7.96073,7.96073,0,0,1,12.20245,11.19292Z\" fill=\"#0364b8\"/><path d=\"M12.20276,11.19182l-.00031.0011A7.96073,7.96073,0,0,0,8,10c-.0343,0-.06805.00215-.10223.00258A7.99676,7.99676,0,0,0,1.43732,22.57277l5.924-2.49292,2.63342-1.10819,5.86353-2.46746,3.06213-1.28859Z\" fill=\"#0078d4\"/><path d=\"M25.93878,13.01639C25.79358,13.0067,25.64764,13,25.5,13a6.4768,6.4768,0,0,0-2.57648.53178l-.00018-.00068-4.00293,1.68451,1.16077.69528L23.88611,18.19l1.66009.99438,5.67633,3.40007a6.5002,6.5002,0,0,0-5.28375-9.56805Z\" fill=\"#1490df\"/><path d=\"M25.5462,19.18437,23.88611,18.19l-3.80493-2.2791-1.16077-.69528L15.85828,16.5042,9.99475,18.97166,7.36133,20.07985l-5.924,2.49292A7.98889,7.98889,0,0,0,8,26H25.5a6.49837,6.49837,0,0,0,5.72253-3.41556Z\" fill=\"#28a8ea\"/></g></svg>","pCloud":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 32 24\">\n   <path fill=\"#16bed1\" d=\"M7.2 21.5h17.1a6.4 6.4 0 0 0 .9-12.7A7.9 7.9 0 0 0 11 5.9a6.2 6.2 0 0 0-3.8 15.6Z\"/>\n   <circle cx=\"16\" cy=\"11.5\" r=\"8.3\" fill=\"#16bed1\" stroke=\"#fff\" stroke-width=\"1.45\"/>\n   <path fill=\"#fff\" d=\"M12.5 17V6.2h4.4c2.8 0 4.6 1.5 4.6 4 0 2.6-1.8 4.1-4.6 4.1h-1.8V17h-2.6Zm2.6-5.1h1.6c1.4 0 2.2-.6 2.2-1.7 0-1-.8-1.6-2.2-1.6h-1.6v3.3Z\"/>\n   </svg>","Rostrum":"<g transform=\"translate(1),scale(0.9,0.9)\">\n   <path  fill=\"#aaa\" stroke=\"currentColor\" stroke-width=\".6\" stroke-linejoin=\"round\"\n   d=\"M4 23v-3h16v3h1.5h-19ZM7 20v-14h10v14M7 12h-2l-3-10h20l-3 10h-2\"/>\n   <text x=\"12\" y=\"15.5\" text-anchor=\"middle\" font-family=\"Georgia, Times New Roman, serif\" font-size=\"9\" font-weight=\"bold\" font-style=\"italic\" fill=\"currentColor\">R</text></g>"});
