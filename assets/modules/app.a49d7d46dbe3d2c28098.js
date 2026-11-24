await window._rostrumPages_.loadCoreFonts();
// #inclusion src/main.js minified
let exports = {};
// #inclusion src/canvas.js minified
function initFabric() {
fabric.Canvas.prototype._createCacheCanvas = function() {
this.cacheCanvasEl = this._createCanvasElement();
this.cacheCanvasEl.setAttribute("width", this.width);
this.cacheCanvasEl.setAttribute("height", this.height);
this.contextCache = this.cacheCanvasEl.getContext("2d", { willReadFrequently: true });
};
fabric.Text.prototype._measureChar = function (_char, charStyle, previousChar, prevCharStyle) {
let decl = this._getFontDeclaration(charStyle);
let ctx = this.getMeasuringContext();
let family = (charStyle?.fontFamily ?? this.fontFamily ?? "").toLowerCase();
let byFamily = (fabric.charWidthsCache[family] ??= {});
let cache = (byFamily[decl] ??= {});
let measure = (str) => {
if (cache[str] === undefined) {
ctx.font = decl;
cache[str] = ctx.measureText(str).width;
}
return cache[str];
};
let width = measure(_char);
let kernedWidth = width;
if (previousChar && prevCharStyle && decl === this._getFontDeclaration(prevCharStyle))
kernedWidth = measure(previousChar + _char) - measure(previousChar);
return { width, kernedWidth };
};
fabric.Text.prototype.getMeasuringContext = function () {
if (!fabric._measuringContext) {
let elm = helm(`<canvas width="8" height="8" aria-hidden="true"
style="position:absolute;left:-9999px;top:-9999px;pointer-events:none"></canvas>`);
(document.body ?? document.documentElement).append(elm);
fabric._measuringContext = elm.getContext("2d", { willReadFrequently: true });
}
return fabric._measuringContext;
};
let dragThresholds = { touch: 10, pen: 6, mouse: 4 };
let dragThreshold = (e) => {
let type = e.pointerType || (e.touches ? "touch" : _mobile_ ? "touch" : "mouse");
return dragThresholds[type] ?? dragThresholds.mouse;
};
let clientPt = (e) => e.touches?.[0] ?? e.changedTouches?.[0] ?? e;
let setupCurrentTransform = fabric.Canvas.prototype._setupCurrentTransform;
fabric.Canvas.prototype._setupCurrentTransform = function (e, target, alreadySelected) {
setupCurrentTransform.call(this, e, target, alreadySelected);
let transform = this._currentTransform;
if (transform && target) {
let pt = clientPt(e);
transform.downX = pt.clientX;
transform.downY = pt.clientY;
transform.dragThreshold = dragThreshold(e);
}
};
let performTransformAction = fabric.Canvas.prototype._performTransformAction;
fabric.Canvas.prototype._performTransformAction = function (e, transform, pointer) {
if (transform.action == "drag" && !transform.pastThreshold && transform.downX !== undefined) {
let pt = clientPt(e);
if (Math.hypot(pt.clientX - transform.downX, pt.clientY - transform.downY) < transform.dragThreshold) return;
transform.pastThreshold = true;
}
performTransformAction.call(this, e, transform, pointer);
if (transform.action == "drag") transform.target.clampToPage();
};
fabric.Object.prototype.clampToPage = function () {
if (!this.canvas) return;
let { tl, br } = this.canvas.calcViewportBoundaries();
let box = this.getBoundingRect(true, true);
let shift = (pos, size, min, max) =>
(size > max - min ? (min + max - size) / 2 : clamp(pos, min, max - size)) - pos;
let dx = shift(box.left, box.width, tl.x, br.x);
let dy = shift(box.top, box.height, tl.y, br.y);
if (dx == 0 && dy == 0) return;
this.set({ left: this.left + dx, top: this.top + dy });
this.setCoords();
};
fabric.Object.NUM_FRACTION_DIGITS = 8;
fabric.Object.prototype.transparentCorners = false;
fabric.Object.prototype.cornerSize = _mobile_ ? 32:16;
fabric.Object.prototype.cornerStyle = "circle";
fabric.Object.prototype.lockScalingFlip = true;
fabric.Object.prototype.cornerColor = "#00f8";
fabric.Object.prototype.controls.mtr.offsetY = -80;
fabric.Object.prototype.objectCaching = false;
fabric.Object.prototype.strokeWidth = 0;
fabric.ActiveSelection.prototype.controls.groupToggle =
fabric.Group.prototype.controls.groupToggle = new fabric.Control({
x: 0.5,
y: -0.5,
offsetX: 40,
offsetY: -70,
sizeX: 64,
sizeY: 64,
cursorStyle: 'pointer',
mouseDownHandler: function(eventData, transform) {
let target = transform.target;
let canvas = target.canvas;
if (target.type == 'activeSelection') {
let group = target.toGroup();
canvas.requestRenderAll();
canvas.setActiveObject(group);
} else if (target.type == 'group') {
let activeSelection = target.toActiveSelection();
canvas.requestRenderAll();
canvas.setActiveObject(activeSelection);
}
return true;
},
});
let ctrls = fabric.Object.prototype.controls;
for(let ctrl in ctrls) {
if(ctrl.length > 2) continue;
if(ctrl.includes('l')) ctrls[ctrl].offsetX = -20;
else if(ctrl.includes('r')) ctrls[ctrl].offsetX = +20;
if(ctrl.includes('t')) ctrls[ctrl].offsetY = -20;
else if(ctrl.includes('b')) ctrls[ctrl].offsetY = +20;
}
for(let [key, ctrl] of Object.entries(fabric.Object.prototype.controls)) {
ctrl.render = (ctx, left, top, styleOverride, fabricObject) => {
if(key == "groupToggle") {
let locked = true;
if (fabricObject.type == "activeSelection" && fabricObject.size() > 1)  locked = false;
else if(fabricObject.type != "group" || fabricObject.rostrumType == "rastrum") return;
ctx.save();
ctx.translate(left-24, top-24);
ctx.lineWidth = 2;
ctx.lineJoin ="round";
ctx.strokeRect(0, 24, 26, 20);
ctx.beginPath();
if (locked) {
ctx.moveTo(5.5, 24);
ctx.lineTo(5.5, 20);
ctx.arc(13.5, 18, 8, Math.PI, 0);
ctx.moveTo(21.5, 24);
ctx.lineTo(21.5, 17);
} else {
ctx.moveTo(5.5, 24);
ctx.lineTo(5.5, 10);
ctx.arc(13.5, 12, 8, Math.PI, 0);
ctx.lineTo(21.5, 17);
}
ctx.stroke();
ctx.beginPath();
ctx.arc(13, 32, 3, 0, 2 * Math.PI);
ctx.moveTo(13,36);
ctx.lineTo(13,39);
ctx.stroke();
if(locked) ctx.fill();
ctx.restore();
return;
}
ctx.save();
ctx.lineWidth = 6;
ctx.beginPath();
let r = fabricObject.cornerSize / 2;
ctx.arc(left, top, r, 0, 2 * Math.PI);
if(key == "mtr") ctx.stroke(); else ctx.fill();
ctx.restore();
}
let getVisibility = ctrl.getVisibility;
ctrl.getVisibility = function(fabricObject, controlKey) {
if(key == "groupToggle") {
let { type } = fabricObject;
if(!(type == "activeSelection" && fabricObject.size() > 1) &&
!(type == "group" && fabricObject.rostrumType != "rastrum")) return false;
}
if(["text", "textbox", "image"].includes(fabricObject.type) && ["mt","mb"].includes(key)) return false;
if("text" == fabricObject.type && ["ml","mr"].includes(key)) return false;
return getVisibility.call(this, fabricObject, controlKey);
};
}
fabric.Textbox.prototype.controls.ml = new fabric.Control({
x: -0.5,
y: 0,
offsetX: -20,
actionHandler: fabric.controlsUtils.changeWidth,
cursorStyleHandler: () => 'ew-resize',
render: (ctx, left, top, styleOverride, fabricObject) => {
let s = fabricObject.cornerSize;
ctx.fillRect(left - s/2, top - s/2, s, s);
},
});
fabric.Textbox.prototype.controls.mr = new fabric.Control({
x: 0.5,
y: 0,
offsetX: 20,
actionHandler: fabric.controlsUtils.changeWidth,
cursorStyleHandler: () => 'ew-resize',
render: (ctx, left, top, styleOverride, fabricObject) => {
let s = fabricObject.cornerSize;
ctx.fillRect(left - s/2, top - s/2, s, s);
},
});
let tapHold = 250;
let tapDown = (e) => {
let pt = clientPt(e);
return { time: performance.now(), x: pt.clientX, y: pt.clientY, slop: dragThreshold(e), travel: 0 };
};
let tapMove = (down, e) => {
let pt = clientPt(e);
if (down) down.travel = Math.max(down.travel, Math.hypot(pt.clientX - down.x, pt.clientY - down.y));
};
let isQuickTap = (down) => down && down.travel < down.slop && performance.now() - down.time < tapHold;
fabric.PodBrush = fabric.util.createClass(fabric.PencilBrush, {
type: "PodBrush",
rostrumType: 'ink',
initialize: function(canvas, rostrumType, stash) {
this.callSuper('initialize', canvas);
this.rostrumType = rostrumType;
this.rostrumStash = fabric.PodBrush.settings(stash);
},
onMouseDown: function(pointer, options) {
this.down = tapDown(options.e);
this.callSuper('onMouseDown', pointer, options);
},
onMouseMove: function(pointer, options) {
tapMove(this.down, options.e);
this.callSuper('onMouseMove', pointer, options);
},
onMouseUp: function(options) {
if (!this.canvas._isMainEvent(options.e)) return true;
tapMove(this.down, options.e);
if (isQuickTap(this.down)) {
this.oldEnd = undefined;
this._points = [];
this.canvas.clearContext(this.canvas.contextTop);
return false;
}
return this.callSuper('onMouseUp', options);
},
createPath: function(pathData) {
let path = this.callSuper('createPath', pathData);
path.rostrumType = this.rostrumType;
path.rostrumStash = this.rostrumStash;
return path;
}
});
fabric.PodBrush.settings = ({ alpha, rgb, style, width }) => ({ alpha, rgb, style, width });
fabric.RastrumBrush = fabric.util.createClass(fabric.BaseBrush, {
type: "RastrumBrush",
initialize: function (canvas, options, color) {
this.callSuper('initialize', options);
this.canvas = canvas;
Object.assign(this, options);
this.color = color;
this.zoom = canvas.getZoom();
},
onMouseDown: function (ptr, options) {
this.origin = { x: ptr.x, y: ptr.y };
this.down = tapDown(options.e);
},
onMouseMove: function (ptr) {
this.ptr = ptr;
let { canvas, color, gap, lines, width, origin, style, zoom } = this;
let ctx = canvas.contextTop;
canvas.clearContext(ctx);
if (style == "L-R") origin.y = ptr.y;
else origin.x = ptr.x;
if (width == 0) width = .13 * gap;
for (let i = 0, n = gap * lines; i < n; i += gap) {
ctx.beginPath();
ctx.lineWidth = width * zoom;
ctx.lineCap = "butt";
ctx.strokeStyle = color;
if (style == "L-R") {
let y = (origin.y + i + width / 2) * zoom;
ctx.moveTo(origin.x * zoom, y);
ctx.lineTo(ptr.x * zoom, y);
} else {
let x = (origin.x + i + width / 2) * zoom;
ctx.moveTo(x, origin.y * zoom);
ctx.lineTo(x, ptr.y * zoom);
}
ctx.stroke();
}
},
onMouseUp: function (e) {
this.ptr = e.pointer;
this.draw();
},
draw: function () {
let { canvas, gap, origin, ptr, style } = this;
let length = style == "L-R" ? Math.abs(ptr.x - origin.x) : Math.abs(ptr.y - origin.y);
canvas.clearContext(canvas.contextTop);
if (length < gap) return;
let paths = fabric.RastrumBrush.paths({ ...this, length },
Math.min(origin.x, ptr.x), Math.min(origin.y, ptr.y));
canvas.add(new fabric.Group(paths, {
hasControls: false,
rostrumType: "rastrum",
rostrumStash: fabric.RastrumBrush.settings(this),
}));
}
});
fabric.RastrumBrush.settings = ({ alpha, rgb, style, gap, lines, width, bars, barWidth }) =>
({ alpha, rgb, style, gap, lines, width, bars, barWidth });
fabric.RastrumBrush.paths = function ({ style, length, gap, lines, width, bars, barWidth, color }, left = 0, top = 0) {
if (width == 0) width = .13 * gap ;
if (barWidth == 0) barWidth = .16 * gap ;
let d = "";
for (let y = 0, n = gap * lines; y < n; y += gap)
if (style == "L-R") d += `M0 ${y}h${length}v${width}h${-length}Z`;
else d += `M${y} 0v${length}h${width}v${-length} Z`;
let staffPath = new fabric.Path(d, { left, top, fill: color });
d = "";
if(bars > 0) {
let staffHeight = (lines - 1) * gap + width;
let barSpan = (length - barWidth) / bars;
for (let i = 0, at = 0; i <= bars; i++, at += barSpan)
if (style == "L-R") d += `M${at} 0v${staffHeight}h${barWidth}v${-staffHeight}Z`;
else d += `M0 ${at}v${barWidth}h${staffHeight}v${-barWidth}Z`;
}
let barPath = new fabric.Path(d, { left, top, fill: color });
return [staffPath, barPath];
};
fabric.RastrumBrush.redraw = function (group, stash) {
let style = group.rostrumStash?.style ?? (group.width >= group.height ? "L-R" : "T-B");
let length = style == "L-R" ? group.width : group.height;
let color = fabric.Color.fromHex(stash.rgb);
color.setAlpha(stash.alpha);
let fresh = new fabric.Group(fabric.RastrumBrush.paths({ ...stash, color: color.toRgba(), length }));
for (let obj of fresh._objects) obj.group = group;
group._objects = fresh._objects;
group.set({ width: fresh.width, height: fresh.height, rostrumStash: fabric.RastrumBrush.settings(stash), dirty: true });
group.setCoords();
group.canvas?.requestRenderAll();
};
fabric.LineBrush = fabric.util.createClass(fabric.RastrumBrush, {
type: "LineBrush",
rostrumType: "ink",
initialize: function (canvas, options, color, rostrumType) {
this.callSuper("initialize", canvas, options, color);
this.rostrumType = rostrumType ;
},
onMouseMove: function (ptr) {
let { canvas, color, origin, style, width, zoom } = this;
let ctx = canvas.contextTop;
ptr = { x: ptr.x, y: ptr.y };
if (style == "L-R") ptr.y = origin.y;
else if (style == "T-B") ptr.x = origin.x;
canvas.clearContext(ctx);
ctx.beginPath();
ctx.lineWidth = width * zoom;
ctx.strokeStyle = color;
ctx.lineCap = "round";
ctx.moveTo(origin.x * zoom, origin.y * zoom);
ctx.lineTo(ptr.x * zoom, ptr.y * zoom);
ctx.stroke();
},
onMouseUp: function (e) {
tapMove(this.down, e.e);
if (isQuickTap(this.down)) return this.canvas.clearContext(this.canvas.contextTop);
this.ptr = { x: e.pointer.x, y: e.pointer.y };
this.draw();
},
draw: function() {
let { canvas, color, origin, ptr, style, width } = this;
if (style == "L-R") ptr.y = origin.y;
else if (style == "T-B") ptr.x = origin.x;
let dX = ptr.x - origin.x;
let dY = ptr.y - origin.y;
this.path = new fabric.Path(`M0 0 L ${dX} ${dY}`, {
height: dY,
width: dX,
left: Math.min(origin.x, ptr.x) - width / 2,
top: Math.min(origin.y, ptr.y) - width / 2,
fill: false,
stroke: color,
strokeLineCap: "round",
strokeWidth: width,
hasControls: false,
rostrumType: this.rostrumType,
rostrumStash: fabric.PodBrush.settings(this),
});
canvas.clearContext(canvas.contextTop);
canvas.fire("before:path:created", { path: this.path });
canvas.add(this.path);
this.canvas.setActiveObject(this.path);
},
});
}
class Grid {
patterns = [
[1],
[1,.75],
[1,.5,.75,.5],
[1,.35,.5,.35,.75,.35,.5,.35],
[1,.25,.35,.25,.5,.25,.35,.25,.75,.25,.35,.25,.5,.25,.35,.25]];
constructor(pg, stash, options) {
this.pg = pg;
Object.assign(this, stash);
let { width, height } = pg.canvas;
this.zoom = pg.zoom;
width *= this.zoom;
height *= this.zoom;
this.gridCanvas = helm(`<canvas data-tag="grid" width="${width}" height="${height}" style="position:absolute;width:${width / _pxPerEm_}em;height:${height / _pxPerEm_}em;"></canvas>`);
pg.canvas.wrapperEl.insertBefore(this.gridCanvas, pg.canvas.upperCanvasEl);
this.maxStep = this.units == "Inch" ? 72 : (72 / 2.54) * 4;
let maxStep = this.maxStep;
this.dx = maxStep / Math.pow(2, this.xStep);
this.dy = maxStep / Math.pow(2, this.yStep);
this.patternX = this.patterns[this.xStep];
this.patternY = this.patterns[this.yStep];
this.stepsPerLabel = this.units == "Inch" ? 1 : 4;
pg.canvas.upperCanvasEl.setPointerCapture(options.e.pointerId);
let offset = 4 * _pxPerEm_;
let box = getBox(this.gridCanvas);
let startX = options.e.clientX - box.x;
let startY = options.e.clientY - box.y;
let inLeftHalf = startX < box.width / 2;
let inTopHalf = startY < box.height / 2;
this.offsetX = inLeftHalf ? -offset : offset;
this.offsetY = inTopHalf ? -offset : offset;
if(this.numbers == "On") {
this.origin = helm(`<div style="position:absolute;width:.5em;height:.5em;border:1px solid rgb(100,150,255);border-radius:100%;pointer-events:none;"></div>`);
pg.canvas.wrapperEl.append(this.origin);
}
this.draw(options.e);
let mv = listen(pg.canvas.upperCanvasEl, "pointermove", (e) => {
e.preventDefault();
e.stopPropagation();
this.draw(e);
});
let end = listen(pg.canvas.upperCanvasEl, ["pointerup", "pointercancel"], (e) => {
let elm = pg.canvas.upperCanvasEl;
if (elm.hasPointerCapture(e.pointerId)) elm.releasePointerCapture(e.pointerId);
unlisten(mv, end);
});
}
destructor() {
this.origin?.remove();
this.gridCanvas.remove();
}
setZoom(zoom) {
if(this.zoom == zoom) return;
let zoomChange = zoom / this.zoom;
this.zoom = zoom;
let { width, height } = this.pg.canvas;
width *= zoom;
height *= zoom;
this.gridCanvas.remove();
this.gridCanvas = helm(`<canvas data-tag="grid" width="${width}" height="${height}" style="position:absolute;width:${width / _pxPerEm_}em;height:${height / _pxPerEm_}em;"></canvas>`);
this.pg.canvas.wrapperEl.insertBefore(this.gridCanvas, this.pg.canvas.upperCanvasEl);
this.x *= zoomChange;
this.y *= zoomChange;
this.originPosX *= zoomChange;
this.originPosY *= zoomChange;
this.drawGridLines();
}
draw(ptr) {
let box = getBox(this.gridCanvas);
let xx = ptr.x - box.x;
let yy = ptr.y - box.y;
let originX = xx + this.offsetX;
let originY = yy + this.offsetY;
let maxStep = this.maxStep * this.zoom;
this.x = originX - Math.ceil(originX / maxStep) * maxStep;
this.labelX = -((originX - this.x) / maxStep);
this.y = originY - Math.ceil(originY / maxStep) * maxStep;
this.labelY = -((originY - this.y) / maxStep);
this.cursorInBottomHalf = yy > box.height / 2;
this.cursorInRightHalf = xx > box.width / 2;
this.originPosX = originX;
this.originPosY = originY;
this.drawGridLines();
}
drawGridLines() {
let canvas = this.gridCanvas;
let { width, height } = canvas;
let ctx = canvas.getContext("2d");
ctx.clearRect(0, 0, width, height);
let dx = this.dx * this.zoom;
let xLabels = [];
for (let i = 0, x = this.x, labelX = this.labelX; x <= width; x += dx, i++) {
let idx = i % this.patternX.length;
let value = this.patternX[idx];
ctx.beginPath();
ctx.lineWidth = value;
ctx.strokeStyle = `rgba(100,150,255,${value})`;
ctx.moveTo(x, 0);
ctx.lineTo(x, height);
ctx.stroke();
if (this.numbers == "On" && idx == 0) {
let label = Math.round(labelX++) * this.stepsPerLabel;
xLabels.push({ label, x });
}
}
let dy = this.dy * this.zoom;
let yLabels = [];
for (let i = 0, y = this.y, labelY = this.labelY; y <= height; y += dy, i++) {
let idx = i % this.patternY.length;
let value = this.patternY[idx];
ctx.beginPath();
ctx.lineWidth = value;
ctx.strokeStyle = `rgba(100,150,255,${value})`;
ctx.moveTo(0, y);
ctx.lineTo(width, y);
ctx.stroke();
if (this.numbers == "On" && idx == 0) {
let label = Math.round(labelY++) * this.stepsPerLabel;
yLabels.push({ label, y });
}
}
if (this.numbers == "On") {
ctx.fillStyle = "rgb(100,150,255)";
let xLabelY = clamp(this.cursorInBottomHalf ? this.originPosY - 2 : this.originPosY + 12, 12, height - 2);
for (let { label, x } of xLabels) {
if (label != 0) ctx.fillText(label, x + 2, xLabelY);
}
for (let { label, y } of yLabels) {
if (label != 0) {
let textWidth = ctx.measureText(label).width;
let labelX = clamp(this.cursorInRightHalf ? this.originPosX - textWidth - 2 : this.originPosX + 2, 2, width - textWidth - 2);
ctx.fillText(label, labelX, y - 2);
}
}
}
if (this.origin) {
this.origin.style.left = this.originPosX / _pxPerEm_ - .25 + "em";
this.origin.style.top = this.originPosY / _pxPerEm_ - .25 + "em";
}
}
}
// #inclusion src/common.js minified
Element.prototype["replace"] = function(newElm) {
this.replaceWith(newElm);
if(this.dataset.tag) newElm.dataset.tag = this.dataset.tag;
return newElm;
}
window._rostrumVersion_ = "1.0.1";
window._rostrumUpstreamVersion_ = "2.3.1";


window._body_ = document.body;
window._lastTarget_ = null;
window._dvPxRt_ = 1 + (devicePixelRatio - 1) * 0.3;
window._gs_ = 618;
window._gsgs_ = (_gs_ * _gs_) / 1000;
window._sliderPrecision_ = 4;
window._swipeDelta_ = () => Math.min(innerWidth, innerHeight) * 0.15;
window._zTop_ = 300;
window._mobile_ = window.matchMedia('(pointer: coarse)').matches;
window._msPerObj_ = 1;
window._pxPerEm_ = 25;
window._Score_ = null;
window._score_ = null;
window._FileSrc_ = null;
window._CachedSrc_ = null;
window._maxRecent_ = 72;
window._recentSelectPts_ = 1;
window._recentInsertPts_ = 4;
window._voidFunc_ = () => {};
window._curtain_ = null;
window._svgId_ = 0;
let panSvgWarm =
"url('data:image/svg+xml;base64," + btoa(`
<svg width='3em' height='3em' viewBox='0 0 175 175' xmlns='http:/\/www.w3.org/2000/svg'>
<filter id='noiseFilterWarm'>
<feTurbulence type='turbulence' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/>
<feComponentTransfer>
<feFuncA type='linear' slope='0.3'/>
</feComponentTransfer>
</filter>
<g><rect width='100%' height='100%' filter='url(#noiseFilterWarm)'/></g>
</svg>`) +
"')";
let panSvgCool =
"url('data:image/svg+xml;base64," + btoa(`
<svg width='3em' height='3em' viewBox='0 0 175 175' xmlns='http:/\/www.w3.org/2000/svg'>
<filter id='noiseFilter'>
<feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/>
<feColorMatrix type='matrix' values='0.30 0.30 0.30 0 -0.07
0.30 0.30 0.30 0 -0.03
0.30 0.30 0.30 0  0.20
0    0    0    0  0.27'/>
</filter>
<g><rect width='100%' height='100%' filter='url(#noiseFilter)'/></g>
</svg>`) +
"')";
let panSvgDark =
"url('data:image/svg+xml;base64," + btoa(`
<svg width='3em' height='3em' viewBox='0 0 175 175' xmlns='http:/\/www.w3.org/2000/svg'>
<defs>
<filter id='noiseFilterDark'>
<feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/>
<feComponentTransfer>
<feFuncA type='linear' slope='0.3'/>
</feComponentTransfer>
</filter>
<filter id='glowFilter'>
<feGaussianBlur stdDeviation='2' result='blur'/>
<feComponentTransfer in='blur' result='glow'>
<feFuncA type='linear' slope='1.5' intercept='0.2'/>
</feComponentTransfer>
<feMerge>
<feMergeNode in='glow'/>
<feMergeNode in='SourceGraphic'/>
</feMerge>
</filter>
</defs>
<rect width='100%' height='100%' fill='rgba(255,255,255,0.02)' filter='url(#glowFilter)'/>
<rect width='100%' height='100%' filter='url(#noiseFilterDark)'/>
</svg>`) +
"')";
function cssIndex(name = null, selector = null, key = null) {
let sheets = document.styleSheets;
if (!name) return sheets;
for (let sheet of sheets) {
if (sheet.ownerNode.dataset.style == name) {
if (!selector) return sheet;
for (let rule of sheet.rules) {
if (rule.selectorText == selector)
return new RegExp(`${key}: ([^;]*);`).exec(rule.cssText)[1];
}
}
}
}
let css = (name, rules) => {
document.head.insertAdjacentHTML(
"beforeend",
`<style data-style="${name}">` + rules + "</style>"
);
return cssIndex(name);
};
css(
"common", `
:root {
/* Layout & Structure */
--borderRadius: .4em;
--border: .1em solid white;
--panelWidth: 12em;
/* Light theme colors */
--bodyColor: #b8b8b8;
--panTexture: ${panSvgCool};
--bodyVignette: radial-gradient(ellipse at 50% 45%, transparent 30%, rgba(0,0,0,0.13) 100%);
/* Typography */
--body-font-family: Vercetti, sans-serif;
--body-font-weight: 400;
--body-letter-spacing: .02em;
--body-line-height: 1.2;
--body-color: #1f2328;
/* Shadows */
--textShadow: .5px .5px #fff6,-1px -1px #fff6,.5px -1px #fff6,-1px .5px #fff6;
--bodyShadow: drop-shadow(.1em .125em .2em #6668);
--menuShadow: 0 0 0 transparent;
--panelShadow: drop-shadow(.08em .1em .2em #0006);
--layout-shadow: .25em .25em 1.5em #888;
/* Menu colors */
--menu-cell-bg: radial-gradient(rgba(210,215,225,0.88) 0%, rgba(195,205,220,0.80) 50%, rgba(170,178,195,0.78) 100%);
--menu-cell-selected-bg: radial-gradient(rgba(235,238,245,0.92) 0%, rgba(210,218,232,0.88) 100%);
--menu-cell-active-bg: radial-gradient(rgba(250,252,255,0.95) 0%, rgba(225,232,245,0.90) 100%);
--menu-disk-bg: radial-gradient(rgba(205,212,225,0.85) 0%, rgba(190,200,218,0.78) 60%, rgba(165,175,195,0.75) 100%);
--menu-grip-bg: #b8b8b8;
--menu-grip-selected-bg: #b0b0b0;
--menu-panel-indicator: #a8a8a8;
--menu-panel-indicator-highlight: #fff2;
--menu-panel-indicator-shadow: #0001;
--menu-icon-color: #333;
--menu-drawer-front: #e8e8e8;
--menu-cell-box-shadow: none;
--menu-grip-shadow: drop-shadow(-0.08em -0.1em 0.15em rgba(255,255,255,0.4))
drop-shadow(0.1em 0.12em 0.2em #8884);
--menu-grip-box-shadow: -0.2em -0.2em 0.4em #888c inset,
0.2em 0.2em 0.4em #aaa4 inset;
--menu-disk-shadow: none;
/* Panel colors */
--panel-bg: rgba(200, 208, 222, 0.93);
--panel-header-bg: #b8b8b8;
--panel-header-selected-bg: #b0b0b0;
--panel-inset-shadow: 0.15em 0.15em 0.35em rgba(255,255,255,0.55) inset,
-0.15em -0.15em 0.35em rgba(0,0,0,0.14) inset;
/* Slider colors */
--slider-indicator: #666;
--slider-indicator-active: #eef;
--slider-knob-bg: #b8b8b8;
--slider-knob-selected-bg: #b0b0b0;
--slider-knob-shadow: 0.1em 0.1em 0.2em #fff2 inset,
-0.1em -0.1em 0.2em #0001 inset,
0.1em 0.125em 0.2em #6668;
/* Select dropdown colors */
--select-option-bg: #fff;
--select-option-text: #333;
/* Text shadow for contrast */
--text-shadow-contrast: 0 0 0.2em rgba(255, 255, 255, 0.5), 1px 1px 1px rgba(255, 255, 255, 0.3);
/* File list colors */
--file-properties-color: #333;
--file-text-shadow: 1px 1px 1px rgba(255, 255, 255, 0.5);
/* Color palette */
--color-primary: #4a90e2;
--color-primary-active: #3a7bc8;
--color-surface: #f5f5f5;
--color-surface-selected: #e8e8e8;
--color-accent: #aaa;
--color-text: #333333;
--color-text-secondary: #666666;
--color-text-muted: #999999;
--color-border: #dddddd;
--color-border-light: #eeeeee;
--color-shadow: rgba(0, 0, 0, 0.1);
--color-shadow-strong: rgba(0, 0, 0, 0.2);
--color-background-overlay: rgba(255, 255, 255, 0.9);
/* Spacing system */
--spacing-xs: 0.25em;
--spacing-sm: 0.5em;
--spacing-md: 1em;
--spacing-lg: 1.5em;
--spacing-xl: 2em;
/* Typography */
--font-size-xs: 0.75em;
--font-size-sm: 0.875em;
--font-size-base: 1em;
--font-size-lg: 1.125em;
--font-size-xl: 1.25em;
--line-height-tight: 1.25;
--line-height-base: 1.5;
--line-height-loose: 1.75;
/* Transitions */
--transition-fast: 150ms ease;
--transition-normal: 300ms ease;
--transition-slow: 500ms ease;
/* Z-index layers */
--z-base: 1;
--z-dropdown: 10;
--z-sticky: 20;
--z-menu: 100;
--z-modal: 1000;
--z-toast: 9000;
--z-shade: 9001;
--z-curtain: 9002;
--z-topmost: 9003;
mark {
background:black;
color: white;
border-radius: .12em;
}
}
/* Dark theme */
[data-theme="Dark"] {
--bodyColor: #242424;
--panTexture: ${panSvgDark};
--bodyVignette: radial-gradient(ellipse at 50% 45%, transparent 20%, rgba(0,0,0,0.45) 100%);
/* File list colors */
--file-properties-color: #ddd;
--file-text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.9);
/* Typography - dark theme */
--body-font-family: Vercetti, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--body-font-weight: 400;
--body-letter-spacing: .02em;
--body-line-height: 1.2;
--body-color: #e5e5e5;
--color-surface: #2e2e2e;
--color-surface-selected: #4a4a4a;
--color-text: #e5e5e5;
--color-text-secondary: #a8a090;
--color-text-muted: #808080;
--color-accent: #b8a890;
--color-border: #404040;
--color-border-light: #353535;
--color-shadow: rgba(0, 0, 0, 0.3);
--color-shadow-strong: rgba(0, 0, 0, 0.5);
--color-background-overlay: rgba(0, 0, 0, 0.7);
--textShadow: .5px .5px #0006,-1px -1px #0006,.5px -1px #0006,-1px .5px #0006;
--bodyShadow: drop-shadow(.1em .125em .2em #000a);
--panelShadow: drop-shadow(.08em .1em .2em #000c);
--layout-shadow: .25em .25em 1.5em #000;
/* Menu colors - dark theme */
--menu-cell-bg: linear-gradient(135deg, #383838 0%, #2e2e2e 100%);
--menu-cell-selected-bg: #404040;
--menu-cell-active-bg: #484848;
--menu-disk-bg: linear-gradient(135deg, #3a3a3a 0%, #303030 100%);
--menu-grip-bg: #2e2e2e;
--menu-grip-selected-bg: #404040;
--menu-panel-indicator: #a0a0a0;
--menu-panel-indicator-highlight: #fff3;
--menu-panel-indicator-shadow: #0002;
--menu-icon-color: #e5e5e5;
--menu-drawer-front: #404040;
--menu-cell-box-shadow: -0.15em -0.15em 0.3em #0004 inset,
0.15em 0.15em 0.3em #fff1 inset,
2px 2px 3px rgba(255,255,255,0.06),
-3px -3px 6px rgba(0,0,0,0.65);
--menu-grip-shadow: drop-shadow(3px 3px 4px rgba(255,255,255,0.08))
drop-shadow(-4px -4px 8px rgba(0,0,0,0.7));
--menu-grip-box-shadow: -0.2em -0.2em 0.4em #0005 inset,
0.2em 0.2em 0.4em #fff2 inset;
--menu-disk-shadow: drop-shadow(2px 2px 3px rgba(255,255,255,0.06))
drop-shadow(-3px -3px 6px rgba(0,0,0,0.65));
/* Panel colors - dark theme */
--panel-bg: #2e2e2e;
--panel-header-bg: #2c2c2c;
--panel-header-selected-bg: #404040;
--panel-inset-shadow: -0.15em -0.15em 0.3em #0004 inset,
0.15em 0.15em 0.3em #fff1 inset;
/* Slider colors - dark theme */
--slider-indicator: #444;
--slider-indicator-active: #eef;
--slider-knob-bg: #2c2c2c;
--slider-knob-selected-bg: #404040;
--slider-knob-shadow: 0.1em 0.1em 0.2em #fff1 inset,
-0.1em -0.1em 0.2em #0003 inset,
0.1em 0.125em 0.2em #000a;
/* Select dropdown colors - dark theme */
--select-option-bg: #1a1a1a;
--select-option-text: #e5e5e5;
/* Text shadow for contrast - dark theme */
--text-shadow-contrast: 0 0 0.3em rgba(0, 0, 0, 0.8);
}
/* Light theme (original neutral grey/amber) */
[data-theme="Light"] {
--bodyColor: #efefef;
--panTexture: ${panSvgWarm};
/* Menu colors - warm theme */
--menu-cell-bg: radial-gradient(#c9c9c9 45%, #ccc 66%, #b4b4b4 72%);
--menu-cell-selected-bg: radial-gradient(#aaa 25%, #fff 100%);
--menu-cell-active-bg: radial-gradient(#fff 64%, #ccc 73%);
--menu-disk-bg: radial-gradient(#888, #c9c9c9 25%, #ccc 58%, #b4b4b4 75%);
--menu-cell-box-shadow: none;
--menu-grip-shadow: drop-shadow(-0.08em -0.1em 0.15em rgba(255,255,255,0.4))
drop-shadow(0.1em 0.12em 0.2em #8884);
--menu-grip-box-shadow: -0.2em -0.2em 0.4em #888c inset,
0.2em 0.2em 0.4em #aaa4 inset;
--menu-disk-shadow: none;
/* Panel colors - warm theme */
--panel-bg: #c8c8c8;
--panel-inset-shadow: 0.15em 0.15em 0.3em #fff3 inset,
-0.15em -0.15em 0.3em #0002 inset;
--slider-indicator: #888;
--slider-indicator-active: #eef;
}
body {
font-family: var(--body-font-family);
font-weight: var(--body-font-weight);
letter-spacing: var(--body-letter-spacing);
line-height: var(--body-line-height);
color: var(--body-color);
margin: 0;
padding: 0;
background-color: var(--bodyColor);
background-image: var(--bodyVignette);
height: 100svh; /* small (min) viewport height */
width: 100lvw;  /* large (max) viewport width */
position:fixed;
font-size: ${_pxPerEm_}px;
left:0;
top:0;
user-select: none;
touch-action: none;
}
a {
text-decoration-skip-ink: none;
}
*:not(input):not(textarea) {
-webkit-user-select: none;  /* disable selection/Copy of UIWebView */
-webkit-touch-callout: none; /* disable the IOS popup when long-press on a link */
-webkit-tap-highlight-color: transparent; /* iOS tap-flash; set on every element (not just keys) so delegated handlers on a container can't paint it */
}
hr {
border: .12em solid white;
margin-top: 2em;
}
select {
border-radius: var(--borderRadius);
background-color: #0000;
color: var(--color-text);
height:2.5em;
font-size: var(--font-size-sm);
margin-left: var(--spacing-md);
margin-right: var(--spacing-md);
margin-bottom: var(--spacing-md);
padding: 0;
text-align: center;
text-align-last: center;
display: block;
width: calc(100% - 2em);
box-sizing: border-box;
}
select option {
background-color: var(--select-option-bg);
color: var(--select-option-text);
}
input[type=color] {
border-color: #888;
border-radius:var(--borderRadius);
}
.void {
display: none !important;
}
.hidden {
visibility:hidden !important;
}
.pz {
/* class for root-div of elements that can be pan-zoomed by user interaction */
position:absolute;
width:0;
height:0;
display:flex;
justify-content: space-around;
align-items:center;
font-size:1em;
}
.pz-set
/* marker for root-div of elements that *have been* pan-zoomed by user interaction */
{}
a:link,a:visited, a:active {
color:blue;
background:inherit;
}
.taken
/* marker for elements that should not be processed by main.py's Gesture class's long press action */
{}
.dialog {
border: var(--border);
border-radius:var(--borderRadius);
background:#ccc;
font-size:1.2em;
text-align:center;
outline:none;
}
/* text input fields in dialogs: */
.dialog__textInput {
height: 1.2em;
position: relative;
width:100%;
font-size:1.2em;
border:none;
border-radius:var(--borderRadius);
text-align: center;
margin-top: 1em;
outline: none;
}
.fadeLeft {
z-index: 10;
position: absolute;
left: 0px;
display: inline;
width: .5em;
background-image: linear-gradient(to left, transparent, var(--panel-header-bg) 53%, var(--panel-header-bg));
}
.fadeRight {
z-index: 1;
position: absolute;
right: 0px;
display: block;
width: .5em;
background-image: linear-gradient(to right, transparent, var(--panel-header-bg) 53%, var(--panel-header-bg));
}
/* Shared styling for floating messages (toast, ptrMsg) */
.floatingMsg {
border-radius: var(--borderRadius);
filter: var(--panelShadow);
background: var(--bodyColor);
background-image: var(--panTexture);
color: var(--color-text);
font-size: var(--font-size-sm);
padding: 0.5em 0.8em;
display: flex;
align-items: center;
justify-content: center;
text-align: center;
line-height: 1.2;
}
/* Center child(ren) both vert/horz */
.centerChild {
display:flex;
align-items: center;
justify-content: center;
}
}`
);
listen(document, "click", (e) => {
let anchor = e.target.closest("a");
if (anchor && anchor.href && !anchor.download) {
e.preventDefault();
window.open(anchor.href, "_blank");
}
});
class ButtonGroup {
static toggleButtonSvg = `url("data:image/svg+xml;${encodeURIComponent('<svg width="100%" height="100%" viewBox="0 0 24 24" xmlns="http:/\/www.w3.org/2000/svg"><path style="fill:none;stroke:black;stroke-width:0.5px" d="M5 15.5L4 16.5L5 17.5M19 15.4L20 16.5L19 17.5"/></svg>')}")'`;
static css = css(
"ButtonGroup",
`
.ButtonGroup {
display: flex;
justify-content: space-around;
margin-top: var(--spacing-sm);
}
.ButtonGroup__button {
text-align: center;
font-size: var(--font-size-sm);
color: var(--color-text);
width: 3.5em;
height: 3.5em;
padding-top: var(--spacing-xs);
white-space: nowrap;
}
.ButtonGroup__icon {
}
.ButtonGroup__button-active {
box-shadow: 0.1em 0.1em 0.2em var(--color-shadow-strong) inset, -0.1em -0.2em 0.2em var(--color-shadow-strong) inset;
border-radius: calc(var(--borderRadius) / 4);
background: var(--color-surface-selected);
}
.ButtonGroup__button-toggle {
background-image: ${ButtonGroup.toggleButtonSvg};
}
.ButtonGroup__button-disabled {
color: var(--color-text-muted);
left: 0;
}
.ButtonGroup__button-selected {
background: var(--color-surface-selected);
}
`
);
elm = helm(`<div  class="ButtonGroup"></div>`);
dataIndex = null;
handler = null;
constructor(props, defs, handler) {
this.props = props;
this.defs = defs;
this.elms = {};
this.iconElms = {};
this.handler = handler;
for (let tag in defs) {
let def = defs[tag];
let { svg, radio, toggle, disabled } = def;
let property = [radio, toggle].find((key) => key);
let elm = helm(`
<button type="button" data-button="${tag}" data-property="${property}" class="ButtonGroup__button">
${tag}<br>
${iconSvg(svg, { class: "ButtonGroup__icon" })}
</button>`);
elm.setAttribute('aria-label', tag);
listen(elm, 'click', e => { if (e.detail === 0) this.fire(tag, e); });
if (toggle) elm.classList.add("ButtonGroup__button-toggle");
let iconElm = dataIndex("tag", elm)["iconSvg"];
if (disabled) {
elm.classList.add("ButtonGroup__button-disabled");
iconElm.classList.add("ButtonGroup__button-disabled");
}
this.elms[tag] = elm;
this.iconElms[tag] = iconElm;
if (!toggle || !(property in dataIndex("property", this.elm)))
this.elm.append(elm);
}
this.dataIndex = dataIndex("button", this.elm);
listen(this.elm, ["pointerdown", "pointerup"], this.handle.bind(this));
this.refresh();
this.elm.self = this;
}
refresh() {
for (let tag of Object.keys(this.defs)) {
let { onOff, radio, toggle, disabled } = this.defs[tag];
let elm = this.elms[tag];
let iconElm = this.iconElms[tag];
elm.disabled = !!disabled;
const stateKey = this.defs[tag].radio || this.defs[tag].toggle;
if (onOff !== undefined || stateKey) elm.setAttribute('aria-pressed', String(onOff !== undefined ? !!this.props[tag] : this.props[stateKey] === tag));
if (onOff != undefined) {
if (this.props[tag]) elm.classList.add("ButtonGroup__button-active");
else elm.classList.remove("ButtonGroup__button-active");
continue;
}
let property = [onOff, radio, toggle].find((key) => key);
if (property) {
let itemTag = this.props[property];
if (radio) {
if (tag == itemTag) {
elm.classList.add("ButtonGroup__button-active");
} else {
elm.classList.remove("ButtonGroup__button-active");
}
} else if (toggle) {
if (tag == itemTag) {
let currentToggleElm = dataIndex("property", this.elm)[property];
currentToggleElm.replaceWith(elm);
}
}
}
if (disabled) {
elm.classList.add("ButtonGroup__button-disabled");
iconElm.classList.add("ButtonGroup__button-disabled");
} else {
elm.classList.remove("ButtonGroup__button-disabled");
iconElm.classList.remove("ButtonGroup__button-disabled");
}
}
}
handle(e) {
e.taken = true;
let path = e.composedPath();
for (let i = 0; i < path.length; i++) {
let elm = path[i];
if (elm.dataset && elm.dataset["button"]) {
let tag = elm.dataset["button"];
if (this.defs[tag]?.disabled) return;
if (e.type == "pointerdown") {
elm.classList.add("ButtonGroup__button-selected");
return;
} else if (e.type == "pointerup") {
elm.classList.remove("ButtonGroup__button-selected");
let { radio, onOff, toggle, redo } = this.defs[tag];
let property = [radio, toggle].find((key) => key);
let prevTag = property ? this.props[property] : null;
if (onOff != undefined) {
this.props[tag] = this.props[tag] ? false : true;
this.refresh();
} else if (radio) {
if (!redo && tag == prevTag) return;
this.props[property] = tag;
this.refresh();
}
if (this.handler) this.handler(e, property, tag, this.props, prevTag);
return;
}
}
}
}
fire(tag, e) {
if (this.defs[tag]?.disabled) return;
let { radio, toggle, redo, onOff } = this.defs[tag];
let property = [radio, toggle].find((key) => key);
let prevTag = property ? this.props[property] : null;
if (onOff !== undefined) {
this.props[tag] = !this.props[tag];
this.refresh();
} else if (radio) {
if (!redo && tag == prevTag) return;
this.props[property] = tag;
this.refresh();
}
if (this.handler) this.handler(e, property, tag, this.props, prevTag);
}
}
class ColorPicker {
static updateRecentColors() {
let recentColors = _menu_.rings.ink.stash.recentColors;
let elm = _menu_.recentColors;
clearChildren(elm);
for (let hexColor of recentColors)
elm.append(helm(`<option value="${hexColor}"></option>`));
}
static pushRecentColor(color) {
let recentColors = _menu_.rings.ink.stash.recentColors;
let index = recentColors.indexOf(color);
if (index > -1) recentColors.splice(index, 1);
recentColors.unshift(color);
while (recentColors.length > 10) recentColors.pop();
_menu_.rings.ink.stash.colors = recentColors;
ColorPicker.updateRecentColors();
}
static css = css(
"ColorPicker",
`.ColorPicker {
position: relative;
text-align: center;
font-size: var(--font-size-base);
display: flex;
align-items: center;
gap: var(--spacing-md);
box-sizing: border-box;
}
.ColorPicker__colorWrapper {
position: relative;
flex: 1;
height: 2.5em;
border-radius: var(--borderRadius);
border: 0.1em solid #aaa;
background-image:
linear-gradient(45deg, #ccc 25%, transparent 25%),
linear-gradient(-45deg, #ccc 25%, transparent 25%),
linear-gradient(45deg, transparent 75%, #ccc 75%),
linear-gradient(-45deg, transparent 75%, #ccc 75%);
background-size: 0.5em 0.5em;
background-position: 0 0, 0 0.25em, 0.25em -0.25em, -0.25em 0;
box-sizing: border-box;
cursor: pointer;
overflow: hidden;
}
.ColorPicker__color {
position: absolute;
opacity: 0;
width: 100%;
height: 100%;
left: 0;
}
.ColorPicker__colorDisplay {
position: absolute;
inset: 0;
border-radius: var(--borderRadius);
pointer-events: none;
}
.ColorPicker__alpha {
width: 2.5em;
height: 2.5em;
flex-shrink: 0;
cursor: pointer;
border-radius: 50%;
border: 0.1em solid #aaa;
box-sizing: border-box;
}
.ColorPicker__alphaSlider {
z-index: var(--z-modal);
background: #999;
border-radius: var(--borderRadius);
padding: var(--spacing-md);
position: absolute;
width:60%;
}
`
);
elm = helm(`
<div class="Panel__item">
<div data-tag="title"></div>
<div class="ColorPicker">
<div class="ColorPicker__colorWrapper">
<input data-tag="color" class="ColorPicker__color" type="color" colorpick-eyedropper-active="true" list="recentColors"></input>
<div data-tag="colorDisplay" class="ColorPicker__colorDisplay"></div>
</div>
<svg data-tag="alpha" class="ColorPicker__alpha" viewBox="0 0 24 24">
<defs>
<pattern id="checkerboard" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
<rect x="0" y="0" width="2" height="2" fill="#ccc"/>
<rect x="2" y="2" width="2" height="2" fill="#ccc"/>
<rect x="2" y="0" width="2" height="2" fill="#fff"/>
<rect x="0" y="2" width="2" height="2" fill="#fff"/>
</pattern>
</defs>
<circle fill="url(#checkerboard)" cx="12" cy="12" r="11"/>
<circle data-tag="alphaCircle" style="fill:#888;opacity:1;" cx="12" cy="12" r="9"/>
</svg>
<div data-tag="alphaSlider"></div>
</div>
<div>`);
constructor(title, rgb = "#000", alpha = 1, handler = null) {
Object.assign(this, dataIndex("tag", this.elm));
ColorPicker.updateRecentColors();
this.title.innerHTML = title;
let stash = this.stash = { rgb, alpha };
this.color.value = rgb;
this.colorDisplay.style.backgroundColor = rgb;
this.alphaCircle.style.fill = rgb;
this.alphaCircle.style.opacity = alpha;
let alphaSlider = new SliderGroup(
stash,
{
alpha: {
min: 0,
max: 1,
step: 0.01,
value: alpha,
msg: (tag, value) => `Opacity: ${Math.round(value * 100)}%`,
},
},
() => {
this.alphaCircle.style.opacity = stash.alpha;
if (handler) handler(stash.rgb, stash.alpha);
}
);
this.alphaGroup = alphaSlider;
alphaSlider.elm.classList.add("ColorPicker__alphaSlider", "void");
this.alphaSlider.replaceWith(alphaSlider.elm);
listen(this.color, ["input", "change"], (e) => {
this.alphaCircle.style.fill = stash.rgb = this.color.value;
this.colorDisplay.style.backgroundColor = this.color.value;
if (handler) handler(stash.rgb, stash.alpha);
if (e.type == "change") ColorPicker.pushRecentColor(stash.rgb);
});
listen(this.alpha, "pointerup", () => {
if (!alphaSlider.elm.classList.toggle("void"))
delay(1, () =>
listen(
_body_,
"pointerup",
() => alphaSlider.elm.classList.add("void"),
{ once: true }
)
);
alphaSlider.refresh();
});
}
set(rgb, alpha) {
Object.assign(this.stash, { rgb, alpha });
this.color.value = rgb;
this.colorDisplay.style.backgroundColor = rgb;
this.alphaCircle.style.fill = rgb;
this.alphaCircle.style.opacity = alpha;
this.alphaGroup.refresh();
}
}
class Curtain {
on = false ;
level = 60 ;
curtain = helm(`<div data-tag="Curtain" style=
"position:fixed;inset:0;pointer-events:none;opacity:0;transition: opacity 1500ms ease;z-index:var(--z-curtain)">
</div>`) ;
constructor() {
_body_.append(this.curtain);
delay(1, () => {
try {
let json = localStorage.getItem("menu");
if (json) {
let parsed = JSON.parse(json);
let stash = parsed?.app?.cells?.curtain?.stash;
if (stash && stash.on) {
this.on = true;
let { color, alpha } = stash;
let curtain = this.curtain;
curtain.style.transition = "none";
if (color == 'Black') {
curtain.style.background = "#000" ;
curtain.style.opacity = alpha / 100 * .7 ;
curtain.style.mixBlendMode = "normal";
}
else {
curtain.style.background = "#A00000";
curtain.style.opacity = alpha / 100;
curtain.style.mixBlendMode = "multiply";
}
curtain.style.visibility = "visible" ;
curtain.offsetHeight;
curtain.style.transition = "opacity 1500ms ease";
}
}
} catch (err) {}
});
}
toggle() {
this.on = !this.on ;
let cell = window._menu_.rings.app.cells.curtain;
cell.stash.on = this.on;
let cellIcon = dataIndex("tag", cell.elm).cellIcon;
cellIcon.innerHTML = iconPaths[this.on ? "Curtain On" : "Curtain"];
this.update() ;
window._menu_.stash();
}
update (immediate = false) {
let curtain = this.curtain ;
let {color, alpha} = window._menu_.rings.app.cells.curtain.stash;
if (immediate) {
curtain.style.transition = "none" ;
}
if(this.on) {
if(color == 'Black') {
curtain.style.background = "#000" ;
curtain.style.opacity = alpha / 100 * .7 ;
curtain.style.mixBlendMode = "normal";
}
else {
curtain.style.background = "#A00000";
curtain.style.opacity = alpha / 100;
curtain.style.mixBlendMode = "multiply";
}
curtain.style.visibility = "visible" ;
}
else curtain.style.opacity = 0 ;
if (immediate) {
curtain.offsetHeight ;
curtain.style.transition = "opacity 1500ms ease" ;
}
}
}
window._curtain_ = new Curtain() ;
class Drag {
jabMaxDuration     = 150;
jabMaxDisplacement = 10;
jitterThreshold    = 8;
terminalWindow     = 100;
minVelocity        = 0.3;
mvBufMax           = 20;
constructor(edown, opts = {}) {
Object.assign(this, opts);
this.edown    = edown;
this.mvBuf    = [edown];
this.jab      = false;
this.lift     = false;
this.moved    = false;
this.duration = 0;
}
mv(e) {
this.mvBuf.push(e);
if (this.mvBuf.length > this.mvBufMax) this.mvBuf.shift();
if (!this.moved)
this.moved = Math.hypot(e.clientX - this.edown.clientX, e.clientY - this.edown.clientY) > this.jitterThreshold;
}
up(e) {
this.duration = e.timeStamp - this.edown.timeStamp;
let displacement = Math.hypot(e.clientX - this.edown.clientX, e.clientY - this.edown.clientY);
if (this.duration < this.jabMaxDuration && displacement < this.jabMaxDisplacement)
{ this.jab = true; return this; }
if (displacement < this.jitterThreshold)
{ this.lift = true; return this; }
let termBuf = this.mvBuf.filter(ev => e.timeStamp - ev.timeStamp <= this.terminalWindow);
if (termBuf.length < 2) { this.lift = true; return this; }
let first = termBuf[0], last = termBuf[termBuf.length - 1];
if (Math.hypot(last.clientX - first.clientX, last.clientY - first.clientY) < this.jitterThreshold)
{ this.lift = true; return this; }
let dt = last.timeStamp - first.timeStamp;
if (dt == 0) { this.lift = true; return this; }
this.vX = (last.clientX - first.clientX) / dt;
this.vY = (last.clientY - first.clientY) / dt;
this.vXY = Math.hypot(this.vX, this.vY);
let d = Math.atan2(this.vY, this.vX);
this.dXY = d < 0 ? d + 2 * Math.PI : d;
if (this.vXY < this.minVelocity) {
let scale = this.minVelocity / this.vXY;
this.vX *= scale; this.vY *= scale;
this.vXY = this.minVelocity;
}
return this;
}
power(exp = 1.5) {
let apply = v => Math.sign(v) * Math.pow(Math.abs(v), exp);
this.vX  = apply(this.vX);
this.vY  = apply(this.vY);
this.vXY = Math.hypot(this.vX, this.vY);
return this;
}
boost(threshold = 0.5, exp = 1.5) {
let apply = v => {
let a = Math.abs(v);
return a <= threshold ? v : Math.sign(v) * (threshold + Math.pow(a - threshold, exp));
};
this.vX  = apply(this.vX);
this.vY  = apply(this.vY);
this.vXY = Math.hypot(this.vX, this.vY);
return this;
}
static fling(pos, min, max, vel, k = 0.001) {
let dT = clamp(Math.abs(vel) / k, 200, 3000);
let d  = vel * dT / 2;
let to = clamp(pos + d, min, max);
let dt = Math.abs(to - pos) > 1 ? clamp(Math.abs(2 * (to - pos) / vel), 200, 3000) : 0;
return { to, dt };
}
static scrollDur(distance) {
return clamp( 80 * Math.pow(Math.abs(distance), 0.45), 60, 650) ;
}
}
class RostrumSlider extends HTMLElement {
static get observedAttributes() {
return ["min", "max", "value", "step", "curve"];
}
static css = css(
"RostrumSlider",
`.Slider {
position: absolute;
width: calc(100% - 2.5em);
height: 2em;
left: 1.25em;
}
.Slider__track {
position: absolute;
top: calc(50% - .2em);
height: .5em;
width: 100%;
background: var(--color-border);
border-radius: var(--borderRadius);
}
.Slider__knob {
position: absolute;
width: 2.8em;
height: 2.8em;
top: calc(50% - 1.4em);
border-radius: var(--borderRadius); /* was inherited from .raisedEdge */
background: var(--slider-knob-bg);
background-image: var(--panTexture);
box-shadow: var(--slider-knob-shadow); /* drop-shadow is here, not a filter (iOS) */
}
.Slider__knob-selected {
background: var(--slider-knob-selected-bg);
}
.Slider__knob__indicator {
position: relative;
pointer-events: none;
border-radius: 100%;
width: .6em;
height: .6em;
top: calc(50% - .3em);
left: calc(50% - .3em);
background: var(--slider-indicator);
}
.Slider__knob__indicator-active {
position: relative;
background-color: var(--slider-indicator-active);
}
`
);
elm = helm(`
<div data-tag="slider" class="Slider">
<div data-tag="track" class="Slider__track"></div>
<div data-tag="knob" class="Slider__knob">
<div data-tag="indicator" class="Slider__knob__indicator"></div>
</div>
</div>`);
adjusting = false;
pos = 0;
curve = 1;
sliderBox;
knobBox;
constructor() {
super();
let setAttr = (key) =>
(this[key] = this.hasAttribute(key)
? parseFloat(this.getAttribute(key))
: this[key]);
["min", "max", "value", "step", "curve"].forEach((attr) => setAttr(attr));
this.disabled = this.hasAttribute("disabled") ? true : this.disabled;
Object.assign(this, dataIndex("tag", this.elm));
this.append(this.elm);
listen([this.knob, this.track], "pointerdown", (e) => {
e.taken = true;
e.stopImmediatePropagation();
this.adjusting = true;
_menu_.busy = true;
this.knob.classList.add("Slider__knob-selected");
this.indicator.classList.add("Slider__knob__indicator-active");
this.updateGeometry();
let { knobBox, sliderBox } = this;
this.knob.setPointerCapture(e.pointerId);
let prevX = e.clientX;
let frac = this.pos;
let set = (clientX, delta) => {
let dx = clientX - prevX;
prevX = clientX;
let t = Math.max(0, delta / knobBox.height - 0.5);
let unitsPerPx = this.curve * (this.max - this.min) * Math.pow(Math.max(frac, 0.001), this.curve - 1) / sliderBox.width / this.step;
let sensitivity = 1 + t * unitsPerPx * _sliderPrecision_;
frac = clamp(frac + (dx / sliderBox.width) / sensitivity, 0, 1);
this.setPos(frac);
};
set(
e.clientX,
Math.abs(e.clientY - sliderBox.top - sliderBox.height / 2)
);
let mv = listen(this.knob, "pointermove", (emv) => {
e.stopImmediatePropagation();
set(
emv.clientX,
Math.abs(emv.clientY - sliderBox.top - sliderBox.height / 2)
);
let ein = new Event("input", { bubbles: true });
ein.clientX = emv.clientX;
ein.clientY = emv.clientY;
this.dispatchEvent(ein);
});
let done = listen(
this.knob, "pointerup",
(eup) => {
unlisten(done);
e.stopImmediatePropagation();
unlisten(mv);
this.adjusting = false;
_menu_.busy = false;
_menu_.autoOff.run();
this.knob.classList.remove("Slider__knob-selected");
this.indicator.classList.remove("Slider__knob__indicator-active");
this.dispatchEvent(new Event("change", { bubbles: true }));
}
);
});
}
connectedCallback() {
if (this.isConnected) this.setAttribute("value", this.value);
}
updateGeometry() {
this.sliderBox = getBox(this.slider);
this.knobBox = getBox(this.knob);
}
attributeChangedCallback(which, was, is) {
if (this.adjusting) return;
if (which != "value") {
this[which] = parseFloat(is);
} else {
let v = parseFloat(is);
if (!Number.isFinite(v)) return;
let t = clamp((v - this.min) / (this.max - this.min), 0, 1);
let pos = this.curve == 1 ? t : Math.pow(t, 1 / this.curve);
this.setPos(pos);
}
}
setPos(pos) {
if (!Number.isFinite(pos)) return;
this.pos = pos;
let value = (this.max - this.min) * Math.pow(pos, this.curve) + this.min;
let snapped = Math.round(value / this.step) * this.step;
this.value = Number.isInteger(snapped) ? snapped : parseFloat(snapped.toPrecision(6));
this.knob.style.left = `calc(${(pos * 100).toFixed(4)}% - 1.4em)`;
this.track.style.setProperty("--slider-progress", (pos * 100).toFixed(4) + "%");
}
}
customElements.define("pod-slider", RostrumSlider);
class RostrumInput extends HTMLInputElement {
static observedAttributes = ["value"];
constructor(...args) {
super(...args);
}
connectedCallback() {
delay(10, () => this.focus());
delay(10, () => this.select());
}
attributeChangedCallback(name, oldValue, newValue) {
}
}
customElements.define("pod-input", RostrumInput, { extends: "input" });
function schedule(delta, func) {
return new Schedule().run(delta, func);
}
class Schedule {
cancelled = false;
callable = null;
constructor(delta = null, callable = null) {
this.delta = delta;
this.callable = callable;
}
run(delta = null, callable = null) {
cancelAnimationFrame(this.af);
this.delta = delta || this.delta;
this.callable = callable || this.callable;
this.cancelled = false;
this.runTime = performance.now() + this.delta;
let loop = (() => {
if (this.cancelled) return;
if (this.paused || performance.now() < this.runTime)
this.af = requestAnimationFrame(loop);
else this.callable(this);
}).bind(this);
loop();
return this;
}
cancel() {
this.cancelled = true;
}
elapsed() {
return performance.now() - (this.runTime - this.delta);
}
pause() {
this.paused = performance.now();
}
resume() {
if (this.paused) this.runTime += performance.now() - this.paused;
this.paused = 0;
}
}
class Shade {
static css = css(
"Shade",
`.Shade {
backdrop-filter: blur(.3em);
opacity: 0;
background: radial-gradient(circle at center, var(--color-surface) 0, var(--color-surface) 10em, transparent 20em);
width: 100%;
height: 100%;
display: flex;
align-items: center;
justify-content: center;
position: absolute;
z-index: var(--z-shade);
}
.Shade__body {
font-family: Bravura;
font-size: ${60 / _dvPxRt_}px;
line-height: ${60 / _dvPxRt_}px;
animation: colors 3s linear infinite;
text-align: center;
}
@keyframes colors {
0% { color: #88f; }
33% { color: #8f8; }
66% { color: #f88; }
}
`
);
elm = helm(`
<div class="Shade">
<div data-tag="body" class="Shade__body">
\ue4c0<br>
<div data-tag="msg"></div>
<button data-tag="cancel">DISMISS</button>
</div>
</div>`);
scheduler = new Schedule();
msgStack = [];
onCancel = null;
constructor() {
Object.assign(this, dataIndex("tag", this.elm));
listen(this.cancel, "click", () => {
this.hide();
if(this.onCancel) {
let onCancel = this.onCancel;
this.onCancel = null;
onCancel();
}
})
}
show(message = "Loading", fadeIn=1500) {
this.message = message;
this.msgStack.push(message);
this.msg.innerHTML = message;
_body_.append(this.elm);
this.elm.style.opacity = 0;
reflow();
this.elm.style.transition = `opacity ${fadeIn}ms ease-in`;
this.scheduler.run(fadeIn, () => (this.elm.style.opacity = 1));
}
update(message) {
this.msg.innerHTML = message;
}
hide() {
this.msgStack = [];
this.elm.style.transition = "opacity 5500ms ease-in";
this.elm.style.opacity = 0;
this.scheduler.run(500, () => this.elm.remove());
}
pop() {
if (this.msgStack.length == 0) return;
this.msgStack.pop();
this.msgStack.length == 0
? this.hide()
: this.show(this.msgStack[this.msgStack.length - 1]);
}
}
window._shade_ = new Shade();
async function sleep(ms) {
let until = performance.now() + ms;
return new Promise((resolve) => {
let run = () => performance.now() >= until ? resolve() : requestAnimationFrame(run);
requestAnimationFrame(run);
})
}
class SliderGroup {
static css = css(
"SliderGroup",
`.SliderGroup {
font-size: var(--font-size-base);
color: var(--color-text);
text-align: center;
}
.SliderGroup__SliderBlock {
margin-bottom: var(--spacing-md);
}
.SliderGroup__SliderBlock__Slider {
display: block;
position: relative;
width: 100%;
height: 2em;
margin-top: var(--spacing-sm);
}
.SliderGroup__SliderBlock__Slider-disabled {
opacity: 0.35;
pointer-events: none;
}
.SliderGroup--grid {
display: grid;
grid-template-columns: 1fr 1fr;
column-gap: var(--spacing-sm);
font-size: 75%;
}
`
);
elm = helm(`<div data-tag="sliderGroup" class="Panel__item SliderGroup">`);
dataIndex = null;
handler = null;
constructor(props, defs, handler) {
this.props = props;
this.defs = defs;
this.handler = handler;
for (let tag in defs) {
let tagDef = Object.assign(
{
min: 1,
max: 1,
step: 1,
value: 1,
curve: 1,
disabled: false,
throttle: -1,
},
defs[tag]
);
defs[tag] = tagDef;
let elm = helm(
`<div class="SliderGroup__SliderBlock" data-tag="${tag}"><span data-tag="${tag}_msg">${this.formatMsg(
tag
)}</span>
<pod-slider class="SliderGroup__SliderBlock__Slider" data-tag="${tag}_slider"
min="${tagDef.min}" max="${tagDef.max}" step="${tagDef.step}" value="${tagDef.value}" curve="${tagDef.curve}">
</pod-slider></div>`
);
if (tagDef.fullWidth) elm.style.gridColumn = "1 / -1";
else if (tagDef.col != null) elm.style.gridColumn = tagDef.col;
if (tagDef.row != null) elm.style.gridRow = tagDef.row;
this.elm.append(elm);
}
let useGrid = Object.values(defs).some(d => d.col != null || d.row != null || d.fullWidth);
if (useGrid) this.elm.classList.add("SliderGroup--grid");
this.dataIndex = dataIndex("tag", this.elm);
listen(this.elm, ["input", "change"], this.handle.bind(this));
this.refresh();
}
formatMsg(tag) {
let tagDef = this.defs[tag];
let value = this.props[tag];
if (tagDef.msg instanceof Function) return tagDef.msg(tag, value) ;
else if (typeof tagDef.msg == "string")
return tagDef.msg.format({
min: tagDef.min,
max: tagDef.max,
value: value,
});
else return "";
}
handle(e) {
let tag = e.target.parentElement.dataset.tag;
let sliderElm = this.dataIndex[tag + "_slider"];
this.props[tag] = Number(sliderElm.value);
this.refresh();
if (this.defs[tag].throttle > 0) {
let def = this.defs[tag];
if (def.throttler) def.throttler.run();
else
def.throttler = new Schedule(def.throttle, () =>
this.handler(e, tag, sliderElm.value, this)
).run();
} else if (this.handler) this.handler(e, tag, sliderElm.value, this);
if (!this.ptrMsg) this.ptrMsg = ptrMsg(e, () => this.formatMsg(tag));
if (e.type == "change") this.ptrMsg = null;
}
refresh() {
for (let tag in this.defs) {
let tagDef = this.defs[tag];
let elm = this.dataIndex[tag];
let sliderElm = this.dataIndex[tag + "_slider"];
sliderElm.min = tagDef.min;
sliderElm.max = tagDef.max;
sliderElm.step = tagDef.step;
delay(5, () => sliderElm.setAttribute("value", this.props[tag]));
if (tagDef.disabled)
elm.classList.add("SliderGroup__SliderBlock__Slider-disabled");
else elm.classList.remove("SliderGroup__SliderBlock__Slider-disabled");
this.setMsg(tag, this.formatMsg(tag).replace(/(.*?\.\.\.).*/, "$1"));
}
}
progress(tag, value, min = null, max = null) {
let sliderElm = this.dataIndex[tag + "_slider"];
if (min) this.defs[tag].min = sliderElm.min = min;
if (max) this.defs[tag].max = sliderElm.max = max;
sliderElm.setAttribute("value", value);
this.props[tag] = value;
this.setMsg(tag, this.formatMsg(tag));
}
setMsg(tag, html) {
let msgElm = this.dataIndex[tag + "_msg"];
if (msgElm.innerHTML != html) msgElm.innerHTML = html;
}
}
class Spot {
constructor(color, parent) {
this.parent = parent;
this.elm = helm(`<div style=
"z-index:100000;pointer-events:none;position:absolute;width:.5em;height:.5em;background:${color};visibility:hidden;"
></div>`);
if(parent) parent.append(this.elm);
}
go(x, y, parent) {
if (parent) parent.append(this.elm);
this.elm.style.visibility = "visible";
this.elm.style.left = x + "px";
this.elm.style.top = y + "px";
return this;
}
}
class Surface {
static css = css(
"Surface",
`
.Surface {
font-size:1em;
position:absolute;
width:8em;
height:8em;
z-index:100;
}
/* Some Surface subclasses need an outline */
.Surface__outline
{ border: 1px solid #444;
border-radius:var(--borderRadius);
padding:1em;
touch-action:none;
box-sizing:border-box;
background: #4444;
}
[data-theme="Dark"] .Keyboard__outline
{ border: 1px solid #aaa;
}
`);
surface = helm(`<div data-tag="surface" class="Surface"></div>`);
surfaceDragElm = null;
constructor(panel, ScreenPanel) {
this.panel = panel;
let surface = this.surface;
this.surface.dataset.tag = this.panel.elm.dataset.tag;
let longPresser = new Schedule();
panel.listeners.push(listen(surface, "pointerdown", (e) => {
if(surface.style.parentElement === _body_) surface.style.zIndex = ++_zTop_;
e.taken = true;
if(this.constructor.name != "Curtain" && surface.parentElement == _body_) surface.style.zIndex = ++_zTop_;
let box = getBox(surface) ;
let maxLeft = window.innerWidth - box.width;
let maxTop = window.innerHeight - box.height;
if(this.surfaceDragElm) {
box = getBox(this.surfaceDragElm) ;
if (Math.hypot(e.clientX - box.x - box.width / 2, e.clientY - box.y - box.height / 2) > box.width / 2) return;
}
_body_.setPointerCapture(e.pointerId);
longPresser.run(_gs_, () => this.onSurfaceEvent("press")) ;
let dX = e.offsetX, dY = e.offsetY;
let fling = new Drag(e);
let mv = listen(_body_, "pointermove", (emv) => {
if(e.frozen) return ;
fling.mv(emv) ;
if (surface.parentElement == _body_ && !e.noMove) {
surface.style.left = clamp(emv.clientX - dX, 0, maxLeft) + "px";
surface.style.top = clamp(emv.clientY - dY, 0, maxTop) + "px";
}
else if (fling.moved) {
longPresser.cancel();
surface.style.fontSize = panel.elm.style.fontSize;
surface.style.position = "absolute";
surface.classList.add("pz");
surface.style.zIndex = panel.elm.style.zIndex;
_body_.append(surface);
_pzTarget_ = surface;
ScreenPanel.pzTarget = surface ;
hide(this.panel.elm, dataIndex("tag", this.panel.cell.elm).cellIcon);
surface.style.left = emv.clientX - dX + "px";
surface.style.top = emv.clientY - dY + "px";
}
});
listen(_body_, "pointerup", (eup) => {
fling.up(eup) ;
longPresser.cancel();
unlisten(mv);
if (fling.dXY) {
this.hide();
if (this.panel.constructor != ScreenPanel) ScreenPanel.update(null);
}
else if (eup.timeStamp - e.timeStamp < _gs_) this.onSurfaceEvent("click");
}, { once: true });
}));
delay(2, () => this.build());
}
hide() {
let surface = this.surface;
if (surface.parentElement != _body_ || surface.hiding) return;
surface.hiding = true;
let ms = 500;
numb(surface, ms);
let onElmBox = getBox(dataIndex("tag", this.panel.cell.elm).cellIcon);
let elmBox = getBox(surface);
let dx = (onElmBox.x + onElmBox.width / 2) - (elmBox.x + elmBox.width / 2);
let dy = (onElmBox.y + onElmBox.height / 2) - (elmBox.y + elmBox.height / 2);
let saved = {
transform: surface.style.transform,
transition: surface.style.transition,
transformOrigin: surface.style.transformOrigin,
};
surface.style.transformOrigin = "center center";
surface.style.transform = "translate(0px, 0px) scale(1)";
surface.style.transition = `transform ${ms}ms`;
reflow();
surface.style.transform = `translate(${dx}px, ${dy}px) scale(0)`;
schedule(ms, () => {
surface.style.visibility = "hidden";
surface.style.transition = saved.transition;
surface.style.transform = saved.transform;
surface.style.transformOrigin = saved.transformOrigin;
surface.hiding = false;
});
}
destructor() {
this.surface.remove();
}
build() {}
onSurfaceEvent(e, eup, type) {}
show() {
let surface = this.surface;
surface.style.position = "static";
surface.style.fontSize = "1em";
surface.classList.remove("pz");
surface.style.visibility = "unset";
this.panel.body.prepend(surface);
}
}
class TabView {
static css = css(
"TabView",
`.Tab__tag {
display: inline-block;
height: 2.2em;
line-height: 2.2em;
width: 8em;
text-align: center;
margin: 0.4em;
}
.Tab__tag-selected {
border-radius: var(--borderRadius);
background-color: var(--panel-bg);
}
.TabView__frame {
margin-top: var(--spacing-sm);
width: 100%;
height: 3em;
}
.TabView__sash {
position: relative;
display: flex;
width: max-content;
min-width: 100%;
height: 3em;
touch-action: none;
background: var(--panel-header-bg);
background-image: var(--panTexture);
-webkit-mask-image: linear-gradient(to right, transparent, black .8em, black calc(100% - .8em), transparent);
mask-image: linear-gradient(to right, transparent, black .8em, black calc(100% - .8em), transparent);
}
.TabView__sash-edge {
top: 3.5em;
height: 8em;
}
.TabView__faces {
height: calc(100% - 3em);
width: 100%;
top: 3em;
}
.TabView__face {
position: absolute;
width: 100%;
height: 100%;
}
`
);
static Tab = class Tab {
tag = helm(`<div class='Tab__tag'></div>`);
face = helm(`<div data-tag="face" class="TabView__face void"></div>`);
onSelect = null;
onDeselect = null;
constructor(title) {
this.tag.textContent = title;
if (iconPaths[title]) {
this.tag.translate = false;
this.tag.prepend(
helm(
`${iconSvg(title, {
style:
"pointer-events:none;height:1.5em;top:.5em;position:relative;padding-right:.3em;",
})}`
)
);
}
this.face.dataset.tag = title + "_face";
}
select() {
this.tag.classList.add("Tab__tag-selected");
this.face.classList.remove("void");
if (this.onSelect) this.onSelect(this);
}
deselect() {
this.tag.classList.remove("Tab__tag-selected");
this.face.classList.add("void");
if (this.onDeselect) this.onDeselect(this);
}
};
elm = helm(`
<div data-tag="frame" class="TabView__frame">
<div data-tag="sash" class="TabView__sash"></div>
<div data-tag="faces" class="TabView__faces"></div>
</div>`);
tabs = {};
selectedTab = null;
draggable = true;
constructor(panel, ...tabNames) {
this.panel = panel;
Object.assign(this, dataIndex("tag", this.elm));
for (let name of tabNames) {
let tab = new TabView.Tab(name);
this.sash.append(tab.tag);
this.faces.append(tab.face);
this.tabs[name] = tab;
}
let justDragged = false;
let downTarget = null;
listen(this.sash, "pointerup", (e) => {
let target = downTarget ?? e.target;
downTarget = null;
if (justDragged) { justDragged = false; return; }
let tagElm = target.closest?.(".Tab__tag");
if (tagElm) this.selectTab(tagElm);
});
if (this.draggable)
delay(5, () =>
this.panel.listeners.push(
listen(this.sash, "pointerdown", (e) => {
downTarget = e.target;
let fling = new Drag(e);
let offsetX = e.clientX - this.sash.offsetLeft;
let limit = this.sash.offsetWidth - this.frame.offsetWidth;
this.sash.setPointerCapture(e.pointerId);
let mv = listen(this.sash, "pointermove", (emv) => {
fling.mv(emv) ;
if (fling.moved) justDragged = true;
this.sash.style.left =
clamp(emv.clientX - offsetX, -limit, 0) + "px";
e.emv = emv;
});
listen(this.sash,"pointerup",
(eup) => {
unlisten(mv);
},
{ once: true }
);
})
)
);
}
selectTab(tagOrName) {
let select = (tab) => {
tab.select();
this.selectedTab = tab;
};
for (let [name, tab] of Object.entries(this.tabs)) {
tagOrName == tab.tag || tagOrName == tab.tag.textContent
? select(tab)
: tab.deselect();
}
}
}
function animate(elm, from, to, transition, finalize) {
if (Object.keys(to).every((k) => FLY_PROPS.includes(k)) && (!elm.style.transform || elm.flight)
&& fly(elm, from, to, transition, finalize)) return;
animateStop(elm);
if(from)
for (let [k, v] of Object.entries(from)) elm.style[k] = v;
reflow();
elm.style.transition = transition;
for (let [k, v] of Object.entries(to)) elm.style[k] = v;
let listener = listen(elm, "transitionend", (e) => {
if (e.target !== elm) return;
unlisten(listener);
elm.style.transition = "unset";
if (finalize) finalize();
});
}
let FLY_PROPS = ["left", "top", "fontSize"];
function animateStop(elm) {
let flight = elm.flight;
if (!flight) return;
elm.flight = null;
unlisten(flight.listener);
Object.assign(elm.style, { transition: "unset", transform: "", transformOrigin: flight.origin }, flight.shrinkTo);
}
function clamp(num, min, max) {
return Math.min(Math.max(num, min), max);
}
function clearChildren(elm) {
while (elm.firstChild) elm.removeChild(elm.firstChild);
}
function dataIndex(key, elm) {
let index = {};
(function buildIndex(key, elm) {
if (key in elm.dataset) index[elm.dataset[key]] = elm;
Array.from(elm.children).forEach((childElm) => buildIndex(key, childElm));
})(key, elm);
return index;
}
function delay(frameCount, func) {
if (frameCount <= 0) return func();
requestAnimationFrame(() => delay(frameCount - 1, func));
}
function delayMs(msec, func) {
if (!(msec > 0)) return func();
let runTime = performance.now() + msec;
let loop = () => (performance.now() < runTime ? requestAnimationFrame(loop) : func());
loop();
}
function dialog(
innerHtml,
buttonsDef = { Cancel: { svg: "Cancel" } },
handler = (e, _x, _y, args) => args.close()
) {
let elm = helm(`<dialog class="dialog"><div>${innerHtml}</div></dialog>`);
let buttonsElm = new ButtonGroup(
{
close: () => {
elm.close();
elm.remove();
},
elm: elm,
},
buttonsDef,
handler
).elm;
listen(elm, "close", () => elm.remove(), { once: true });
listen(elm, "cancel", (e) => {
if (Object.keys(buttonsDef).length == 0) {
e.preventDefault();
} else if (Object.hasOwn(buttonsDef, "Cancel")) {
e.preventDefault();
buttonsElm.self.fire("Cancel", e);
}
});
const primary = Object.keys(buttonsDef).find(tag => !['Cancel','Close','Dismiss','Back'].includes(tag));
if (primary) buttonsElm.self.elms[primary].classList.add('UiAction--primary');
buttonsElm.style.marginTop = "1em";
elm.append(buttonsElm);
_body_.append(elm);
elm.buttonsElm = buttonsElm;
elm.msg = elm.firstElementChild;
elm.showModal();
if (!elm.querySelector("input,textarea,[autofocus]")) buttonsElm.self.elms.Cancel?.focus();
return elm;
}
let fontMap = {
Courier: { fontFamily: "Courier", fontStyle: "normal", fontWeight: "normal" },
"Courier-Bold": {
fontFamily: "Courier",
fontStyle: "normal",
fontWeight: "bold",
},
"Courier-Oblique": {
fontFamily: "Courier",
fontStyle: "oblique",
fontWeight: "normal",
},
"Courier-BoldOblique": {
fontFamily: "Courier",
fontStyle: "oblique",
fontWeight: "bold",
},
Helvetica: {
fontFamily: "Helvetica",
fontStyle: "normal",
fontWeight: "normal",
},
"Helvetica-Bold": {
fontFamily: "Helvetica",
fontStyle: "normal",
fontWeight: "bold",
},
"Helvetica-Oblique": {
fontFamily: "Helvetica",
fontStyle: "oblique",
fontWeight: "normal",
},
"Helvetica-BoldOblique": {
fontFamily: "Helvetica",
fontStyle: "oblique",
fontWeight: "bold",
},
"Times-Roman": {
fontFamily: "Times Roman",
fontStyle: "normal",
fontWeight: "normal",
},
"Times-Bold": {
fontFamily: "Times Roman",
fontStyle: "normal",
fontWeight: "bold",
},
"Times-Italic": {
fontFamily: "Times Roman",
fontStyle: "italic",
fontWeight: "normal",
},
"Times-BoldItalic": {
fontFamily: "Times Roman",
fontStyle: "italic",
fontWeight: "bold",
},
"Noto Sans JP": { fontFamily: "Noto Sans JP", fontStyle: "normal", fontWeight: "normal" },
Bravura: { fontFamily: "Bravura", fontStyle: "normal", fontWeight: "normal" },
Vercetti: { fontFamily: "Vercetti", fontStyle: "normal", fontWeight: "normal" },
"Patrick Hand": { fontFamily: "Patrick Hand", fontStyle: "normal", fontWeight: "normal" },
};
let fontUnmap =
Object.fromEntries(
Object.entries(fontMap).map(([k, v]) => [
`${v.fontFamily}/${v.fontStyle}/${v.fontWeight}`,
k,
])
);
function fly(elm, from, to, transition, finalize) {
let timing = flyTiming(transition);
if (!timing) return false;
let inFlight = elm.flight ? flyState(elm) : null;
animateStop(elm);
let before = Object.fromEntries(FLY_PROPS.map((k) => [k, elm.style[k]]));
let transition0 = elm.style.transition, origin = elm.style.transformOrigin;
elm.style.transition = "none";
if (from) Object.assign(elm.style, from);
let a = !from && inFlight ? inFlight : flyState(elm);
Object.assign(elm.style, to);
let b = flyState(elm);
let shrink = b.font == 0;
if (shrink) Object.assign(elm.style, before, from ?? {});
let lay = shrink ? flyState(elm) : b;
if (lay.font == 0) {
Object.assign(elm.style, before, { transition: transition0 });
return false;
}
let start = { x: timing.move ? a.x : b.x, y: timing.move ? a.y : b.y, font: timing.scale ? a.font : b.font };
let xform = (s) => `translate(${s.x - lay.x}px, ${s.y - lay.y}px) scale(${s.font / lay.font})`;
elm.style.transformOrigin = "0 0";
elm.style.transform = xform(start);
reflow();
elm.style.transition = `transform ${Math.max(timing.move, timing.scale)}ms ${timing.ease}`;
elm.style.transform = xform(b);
let listener = listen(elm, "transitionend", (e) => {
if (e.target !== elm || e.propertyName != "transform") return;
animateStop(elm);
if (finalize) finalize();
});
elm.flight = { listener, origin, shrinkTo: shrink ? to : null };
return true;
}
function flyState(elm) {
let box = getBox(elm), style = getComputedStyle(elm);
let scale = style.transform == "none" ? 1 : new DOMMatrix(style.transform).a;
return { x: box.x, y: box.y, font: parseFloat(style.fontSize) * scale };
}
function flyTiming(transition) {
let move = 0, scale = 0, ease = "ease";
for (let part of transition.split(",")) {
let tokens = part.trim().split(/\s+/);
let time = tokens.find((t) => /^[\d.]+m?s$/.test(t));
if (!time) continue;
let ms = parseFloat(time) * (time.endsWith("ms") ? 1 : 1000);
let prop = tokens.find((t) => ["left", "top", "font-size", "all"].includes(t)) ?? "all";
if (prop != "font-size") move = Math.max(move, ms);
if (prop != "left" && prop != "top") scale = Math.max(scale, ms);
ease = tokens.find((t) => /^(ease|linear)/.test(t)) ?? ease;
}
return move || scale ? { move, scale, ease } : null;
}
function getBox(elm) {
return elm.getBoundingClientRect();
}
function helm(html) {
let template = document.createElement("template");
template.innerHTML = html;
return template.content.firstElementChild;
}
function hide(elm, onElm) {
if (elm.hiding) return;
else elm.hiding = true;
numb(elm, 500);
animateStop(elm);
let style = getComputedStyle(elm);
let saved = { transform: elm.style.transform, transition: elm.style.transition };
if (style.transform == "none") {
let probe = elm.firstElementChild ?? elm;
let was = getBox(probe);
elm.style.transform = "translate(0px, 0px) scale(1)";
let is = getBox(probe);
if (Math.abs(is.x - was.x) > 0.5 || Math.abs(is.y - was.y) > 0.5) {
elm.style.transform = saved.transform;
return hideByLayout(elm, onElm);
}
}
let box = getBox(elm), onElmBox = getBox(onElm);
let [originX, originY] = style.transformOrigin.split(" ").map(parseFloat);
let dx = onElmBox.x + onElmBox.width / 2 - (box.x + originX);
let dy = onElmBox.y + onElmBox.height / 2 - (box.y + originY);
elm.style.transition = "none";
elm.style.transform = `translate(0px, 0px) scale(${style.transform == "none" ? 1 : new DOMMatrix(style.transform).a})`;
reflow();
elm.style.transition = "transform 500ms";
elm.style.transform = `translate(${dx}px, ${dy}px) scale(0)`;
schedule(500, () => {
elm.style.visibility = "hidden";
elm.style.top = "-9999px";
elm.style.transition = "unset";
elm.style.transform = saved.transform;
elm.hiding = false;
});
}
function hideByLayout(elm, onElm) {
let fontSize = elm.style.fontSize;
let elmBox = getBox(elm);
let onElmBox = getBox(onElm);
let offsetParentBox = elm.offsetParent ? getBox(elm.offsetParent) : { x: 0, y: 0 };
let left = (elmBox.x - offsetParentBox.x) + "px";
let top  = (elmBox.y - offsetParentBox.y) + "px";
elm.style.left = left;
elm.style.top = top;
elm.style.transition = "top 500ms, left 500ms, font-size 500ms, opacity 500ms";
reflow();
elm.style.left = (onElmBox.x + onElmBox.width / 2 - offsetParentBox.x) + "px";
elm.style.top = (onElmBox.y + onElmBox.height / 2 - offsetParentBox.y) + "px";
elm.style.fontSize = 0;
schedule(500, () => {
elm.style.left = left;
elm.style.visibility = "hidden";
elm.style.top = "-9999px";
elm.style.transition = "unset";
elm.style.fontSize = fontSize;
elm.hiding = false;
});
}
function uniqueSvgIds(svgMarkup) {
let ids = new Set();
svgMarkup.replace(/\sid=\x22([^\x22]+)\x22/g, (_, id) => { ids.add(id); return ''; });
if (ids.size === 0) return svgMarkup;
let suffix = "-" + ++_svgId_;
for (let id of ids) {
svgMarkup = svgMarkup.split(`id="${id}"`).join(`id="${id}${suffix}"`);
svgMarkup = svgMarkup.split(`url(#${id})`).join(`url(#${id}${suffix})`);
}
return svgMarkup;
}
function svgWrap(svgMarkup, props = {}) {
props = Object.assign(
{
size: "2em",
viewBox: "0 0 24 24",
class: "",
type: "",
tag: "iconSvg",
style: "",
},
props
);
return `<svg viewBox="${props.viewBox}" width="${props.size}" height="${props.size}" class="${props.class}" style="${props.style}" data-tag="${props.tag}" >
${uniqueSvgIds(svgMarkup)}</svg>`;
}
function iconSvg(iconName, props = {}) {
return svgWrap(iconPaths[iconName] || iconPaths.Void, props);
}
async function inflate(b64GzipString) {
let gzipString = atob(b64GzipString);
let gzipUint8 = new Uint8Array(gzipString.length);
for (let i = 0; i < gzipString.length; i++) {
gzipUint8[i] = gzipString[i].charCodeAt(0);
}
let gzipBlob = new Blob([gzipUint8]);
let decompressor = new DecompressionStream("gzip");
let decompressedStream = gzipBlob.stream().pipeThrough(decompressor);
let chunks = [];
let reader = decompressedStream.getReader();
return new Promise((resolve, reject) => {
reader.read().then(function nextChunk({ done, value }) {
if (done) {
return resolve(new Blob(chunks, { type: "application/javascript" }));
}
chunks.push(value);
reader.read().then(nextChunk);
});
});
}
function listen(elms, events, func, options = {}) {
let listeners = [];
if (Array.isArray(elms))
elms.forEach((elm) =>
listeners.push(...listen(elm, events, func, options))
);
else if (Array.isArray(events))
events.forEach((event) =>
listeners.push(...listen(elms, event, func, options))
);
else {
options.passive = false;
elms.addEventListener(events, func, options);
listeners.push([elms, events, func, options]);
}
return listeners;
}
function unlisten(...listenerArgs) {
for (let listeners of listenerArgs) {
if (listeners)
listeners.forEach((listener) => {
listener[0].removeEventListener(listener[1], listener[2], listener[3]);
});
}
}
function mergeRecent(existing, incoming) {
let merged = (existing && typeof existing === 'object') ? { ...existing } : {};
for (let [cp, count] of Object.entries(incoming))
if ([...cp].length <= 2) merged[cp] = (merged[cp] || 0) + count;
if (Object.values(merged).some(v => v >= _maxRecent_ * 4)) {
for (let k in merged) {
merged[k] = Math.floor(merged[k] / 2);
if (merged[k] === 0) delete merged[k];
}
}
return Object.fromEntries(
Object.entries(merged).sort((a, b) => b[1] - a[1]).slice(0, _maxRecent_)
);
}
let _numb_ = new Map();
function numb(elm, ms) {
if (!(ms > 0)) return;
let until = performance.now() + Math.min(ms, 5000);
_numb_.set(elm, Math.max(until, _numb_.get(elm) ?? 0));
}
function numbed(target) {
let now = performance.now();
for (let [elm, until] of _numb_) {
if (until <= now) _numb_.delete(elm);
else if (elm.contains(target)) return true;
}
return false;
}
function pnToDiv(pn, div, autoSize = true) {
let prelim = _score_?.numbers?.prelim ?? 0;
let roman = pn - prelim <= 0;
div.style.fontFamily = roman ? "Times" : "Bravura";
div.style.fontStyle = roman ? "italic" : "normal";
div.style.letterSpacing = "normal";
if(!roman) div.style.paddingTop = 0 ;
let str = pnToString(pn, true);
div.translate = false;
div.classList.add("notranslate");
if (autoSize && div.offsetWidth > 0) {
let elm = helm(
`<div style="visibility:hidden;position:absolute">${str}</div>`
);
elm.style.fontFamily = div.style.fontFamily;
elm.style.fontStyle = div.style.fontStyle;
elm.style.fontSize = 30 / _dvPxRt_ + "px";
_body_.append(elm);
if (elm.offsetWidth > div.offsetWidth * 0.9) {
let targetWidth = div.offsetWidth * 0.9;
let currentFontSize = parseInt(elm.style.fontSize);
let scaleFactor = targetWidth / elm.offsetWidth;
elm.style.fontSize = Math.floor(currentFontSize * scaleFactor) + "px";
}
div.style.fontSize = elm.style.fontSize;
elm.remove();
}
div.textContent = str;
return div;
}
function pnToHtml(pn) {
return noTranslate(pnToString(pn));
}
function noTranslate(html) {
return `<span translate="no" class="notranslate">${html}</span>`;
}
function pnToString(pn, useSMuFL = false) {
let prelim = _score_?.numbers?.prelim ?? 0;
let first = _score_?.numbers.first ?? 1;
pn = parseInt(pn);
prelim = parseInt(prelim);
first = parseInt(first);
let str = "";
if (pn <= prelim) {
if (pn < 0) pn = 0;
let roman = {
m: 1000,
cm: 900,
d: 500,
cd: 400,
c: 100,
xc: 90,
l: 50,
xl: 40,
x: 10,
ix: 9,
v: 5,
iv: 4,
i: 1,
};
for (let i of Object.keys(roman)) {
let q = Math.floor(pn / roman[i]);
pn -= q * roman[i];
str += i.repeat(q);
}
} else str = "" + (pn + first - prelim - 1);
if (!useSMuFL) return "" + str;
let encoded = "";
for (let i = 0; i < str.length; i++) {
let code = str.charCodeAt(i);
if (code >= 48 && code <= 57)
encoded += String.fromCodePoint(useSMuFL ? code - 48 + 57472 : code);
else encoded += String.fromCodePoint(code);
}
return encoded;
}
css(
"ptrMsg",
`
.ptrMsg {
position: absolute;
width: fit-content;
height: fit-content;
pointer-events: none;
transition: opacity ease-out ${_gsgs_}ms;
z-index: var(--z-topmost);
background-color: var(--bodyColor);
}`
);
function ptrMsg(e, msgFunc, styles) {
let div = helm(`<div class="ptrMsg floatingMsg" style="${styles}"></div>`);
_body_.append(div);
let maxWidth = 0;
let expander = e.pointertype == "mouse" ? 1 : 2;
let put = (ev) => {
let result = msgFunc(ev, div);
if (result) div.innerHTML = result.replace("...","") ;
if (maxWidth > 0) div.style.minWidth = "";
let b = getBox(div);
let contentWidth = b.width;
let hg = b.height;
if (contentWidth > maxWidth) {
maxWidth = contentWidth;
div.style.minWidth = maxWidth + "px";
} else if (maxWidth > 0) {
div.style.minWidth = maxWidth + "px";
}
let wd = maxWidth;
let [left, top] = [ev.clientX - wd / 2, ev.clientY - hg * expander];
left = clamp(left, 0, innerWidth - div.offsetWidth);
top = clamp(top, 0, innerHeight - hg);
if (top < hg) {
if (ev.clientX < innerWidth / 2)
left += ((1 - top / hg) * _pxPerEm_ * 10) / 2;
else left -= ((1 - top / hg) * _pxPerEm_ * 10) / 2;
}
Object.assign(div.style, {
left: left + "px",
top: top + "px",
});
};
put(e);
let mv = listen(_body_, "pointermove", (emv) => put(emv));
let done = listen(
_body_, "pointerup",
(eup) => {
unlisten(done);
put(eup);
div.style.opacity = 0;
delayMs(_gsgs_, () => div.remove());
unlisten(mv);
}
);
return div;
}
function pxToEm(px, elm) {
return parseFloat(px) / parseFloat(getComputedStyle(elm).fontSize) + "em";
}
function reflow() {
void _body_.offsetWidth;
}
function rotatePoint(pX, pY, cX, cY, theta) {
let s = Math.sin(theta);
let c = Math.cos(theta);
pX -= cX;
pY -= cY;
return { x: pX * c - pY * s + cX, y: pX * s + pY * c + cY };
}
String.prototype.format = function () {
let str = this.toString();
if (arguments.length) {
let t = typeof arguments[0];
var args =
"string" == t || "number" == t
? Array.prototype.slice.call(arguments)
: arguments[0];
for (let key in args) {
str = str.replace(new RegExp("\\{" + key + "\\}", "gi"), args[key]);
}
}
return str;
};
function strToHash(str) {
let hash = 0;
for (let i = 0; i < str.length; i++)
hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
return Math.abs(hash);
}
function toast(innerHtml, addClass=null, duration=null,) {
if(document.getElementById("toast")) return ;
let dur = duration ? duration: _gs_ ;
let elm = helm(
`<div id="toast" style="position:absolute;pointer-events:none;display:flex;justify-content:center;align-items:center;height:100vh;width:100vw;pointer-events:none">
<div class="floatingMsg" style="z-index:var(--z-toast);position:absolute;width:fit-content;height:fit-content;opacity:0;transition:opacity ${dur}ms ease-in">${innerHtml}</div>
</div>`
);
if(addClass) elm.firstElementChild.classList.add(addClass) ;
_body_.append(elm);
delay(1, () => elm.firstElementChild.style.opacity = "1");
delayMs(dur * 2.5, () => elm.firstElementChild.style.opacity = "0");
delayMs(dur * 3.5, () => elm.remove());
}
// #inclusion src/menu.js minified
class Menu {
static css = css(
"Menu",
`
.Menu {
position: absolute;
}
.Menu__holder {
position: absolute;
transition: opacity var(--transition-slow);
z-index: 101;
transform: translateZ(0); /* fix for ipad compositing */
will-change: transform; /* fix for ipad compositing */
border-radius: 50%;
overflow: hidden;
/* clip-path (unlike border-radius/overflow) clips hit-testing too, so the
corners — and the cell clip-path triangles, which extend to the bbox
corners — are not hittable outside the circle. */
clip-path: circle(50%);
/* border-radius clips the corners visually but NOT for hit-testing, so a
pointerdown in a rounded-off bbox corner would otherwise land on this
rectangular container (which carries no data-key) and opDown's
dataset.key-or-grip fallback would treat it as a grip. Make the
containers non-hittable; the interactive cells/grip opt back in below. */
pointer-events: none;
}
.Menu__ring {
position: absolute;
visibility: hidden;
z-index: var(--z-menu);
}
.Menu__cell {
text-align: center;
position: absolute;
background: var(--menu-cell-bg);
color: var(--menu-icon-color);
box-shadow: var(--menu-cell-box-shadow);
pointer-events: auto; /* opt back in: the holder above is pointer-events:none */
}
.Menu__cell-contents {
margin-top: var(--spacing-sm);
pointer-events: none;
transform-origin: center;
position: relative;
z-index: 1;
}
.Menu__cell-selected {
background: var(--menu-cell-selected-bg);
}
.Menu__cell-active {
background: var(--menu-cell-active-bg);
}
.Menu__cell-panel {
}
.Menu__cell-panel::after {
content: "";
width: 0.3em;
height: 0.6em;
background: var(--menu-panel-indicator);
clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
left: calc(50% - .075em );
top: 0.13em;
position: absolute;
box-shadow: -0.02em -0.02em 0.04em var(--menu-panel-indicator-highlight) inset,
0.02em 0.02em 0.04em var(--menu-panel-indicator-shadow) inset;
}
.cellIcon {
transform: translateZ(0); /* fix for iOS partial-path SVG rendering glitch */
will-change: transform;
}
.Menu__disk {
position: relative;
border-radius: 50%;
z-index: 103;
transition: opacity var(--transition-slow);
overflow: hidden;
filter: var(--menu-disk-shadow);
}
.Menu__diskCell {
text-align: center;
position: absolute;
background: var(--menu-disk-bg);
color: var(--menu-icon-color);
pointer-events: auto; /* opt back in: the holder above is pointer-events:none */
}
.Menu__cell-disabled {
color: var(--color-text-muted);
}
.Menu__cell-locked::before {
content: "";
width: 0.6em;
height: 0.6em;
background: transparent;
border: 0.1em solid var(--menu-panel-indicator);
border-radius: 50%;
left: calc(50% - 0.3em);
top: 0.055em;
position: absolute;
}
.Menu__diskIcon {
position: absolute;
left: 50%;
top: 50%;
transform: translate(-50%, -50%);
}
.Menu__diskCell-active {
background: var(--menu-cell-active-bg);
}
.Menu__diskCell-selected {
background: var(--menu-cell-selected-bg);
}
.Menu__grip {
position: absolute;
border-radius: 50%;
z-index: 105;
background: var(--menu-grip-bg);
background-image: var(--panTexture);
filter: var(--menu-grip-shadow);
box-shadow: var(--menu-grip-box-shadow);
}
.Menu__grip-selected {
background: var(--menu-grip-selected-bg);
}
`
);
activeRing = null;
collapsed = false;
listeners = {};
rings = {};
scale = 1;
busy = false;
autoOff = new Schedule(4000, () => {
if(this.busy) this.autoOff.run();
else {
for (const key of ['ink', 'page']) {
const ring = this.rings[key];
if (key === 'page' && this.magnifier.active) continue;
if (ring.activeCell && !ring.activeCell.locked) this.activateCell(null, ring);
}
}
});
toggleLock(cell) {
cell.locked = !cell.locked;
cell.elm.classList.toggle("Menu__cell-locked", cell.locked);
if (cell.locked) {
if (cell.ring?.activeCell !== cell) this.activateCell(cell);
this.autoOff.cancel();
} else if (cell.ring?.activeCell === cell) {
this.autoOff.run();
}
}
elm = helm(`
<div data-tag="Menu" class="pz Menu" style="z-index:100">
<div data-tag="menuHolder" class="Menu__holder" >
<div data-tag="diskHolder" class="Menu__holder">
<div data-tag="disk" class="Menu__disk"></div>
</div>
</div>
<div data-tag="grip" class="Menu__grip"></div>
<datalist data-tag="recentColors" id="recentColors"></datalist>
</div>`);
getSizes() {
return {
ringRadius: 11,
diskRadius: 6.5,
gripRadius: 1.75,
cellGap: 0.045,
ringGap: 0.045,
cellIcon: 1.7,
fontSize: 0.78,
};
}
constructor() {
window._menu_ = this;
Object.assign(this, dataIndex("tag", this.elm));
let elm = this.elm;
elm.owner = this ;
_body_.append(elm);
this.sizes = this.getSizes();
this.sizes = {
...this.sizes,
ringDiameter: this.sizes.ringRadius * 2,
diskDiameter: this.sizes.diskRadius * 2,
gripDiameter: this.sizes.gripRadius * 2,
};
let { ringRadius, ringDiameter, diskRadius, diskDiameter,
gripRadius, gripDiameter } = this.sizes;
elm.style.width = elm.style.height = 0;
let menuHolder = this.menuHolder;
menuHolder.style.width = menuHolder.style.height = ringDiameter + "em";
menuHolder.style.left = -ringRadius + "em";
menuHolder.style.top = menuHolder.style.left;
let diskHolder = this.diskHolder;
diskHolder.style.width = diskHolder.style.height = diskDiameter + "em";
diskHolder.style.left = diskHolder.style.top = ringRadius - diskRadius + "em";
let disk = this.disk;
disk.style.width = disk.style.height = diskHolder.style.width;
disk.style.left = disk.style.top = "0em";
let grip = this.grip;
grip.style.width = grip.style.height = gripDiameter + "em";
grip.style.left = grip.style.top = -gripRadius + "em";
this.buildRings();
for (let [ringKey, ringCell] of Object.entries(this.rings)) {
ringCell["key"] = ringKey;
for (let [cellKey, cell] of Object.entries(ringCell.cells)) {
cell["key"] = cellKey;
cell["ring"] = ringCell;
if (cell.stash) cell.stash["name"] = cell.name;
}
}
this.configureNavigation();
this.buildMenu();
this.enableCells(["layout", "ink", "ink/paste", "page", "score/close", "score/save", "score/details", "score/print", "page/import"], false);
this.stashDefaults = this.stashToJson();
try {
let json = localStorage.getItem("menu") ?? this.stashDefaults;
let parsed = JSON.parse(json);
if (parsed.version !== _rostrumVersion_) {
this.stashFromJson(this.stashDefaults, "local");
localStorage.setItem("menu", this.stashToJson("local"));
delay(2, () => dialog(
`Rostrum has been updated to version <strong>${_rostrumVersion_}</strong>.<br><br>
<a href="https://github.com/1921music/rostrum/blob/v${_rostrumVersion_}/CHANGELOG.md" target="_blank" rel="noopener">See what&rsquo;s new</a>`,
{ Close: { svg: "Cancel" } }
));
} else {
this.stashFromJson(json, "local");
}
} catch (Error) {
toast("Clearing invalid local storage stash.");
localStorage.clear();
}
finally {
this.activeRing = this.rings.layout;
let active = this.rings.layout.stash.active;
if(active) this.activateCell(this.rings.layout.cells[active]);
else this.activateCell(this.rings.layout.cells.book);
this.activateRing(this.rings.score);
}
{
let themeCell = this.rings.app.cells.theme;
let theme = themeCell.stash.theme || "Light";
document.documentElement.setAttribute("data-theme", theme);
dataIndex("tag", themeCell.elm).cellIcon.innerHTML = iconPaths[theme];
this.applyGaps(theme);
let wakeLockCell = this.rings.app.cells.wakeLock;
if (wakeLockCell.stash.on) {
(async () => {
try {
wakeLockCell.wakeLock = await navigator.wakeLock.request("screen");
dataIndex("tag", wakeLockCell.elm).cellIcon.innerHTML = iconPaths["Wakelock On"];
} catch {
dataIndex("tag", wakeLockCell.elm).cellIcon.innerHTML = iconPaths["Wakelock On"];
let l = listen(document, "pointerup", async () => {
if (wakeLockCell.stash.on) {
if (wakeLockCell.wakeLock) {
unlisten(l);
return;
}
try {
wakeLockCell.wakeLock = await navigator.wakeLock.request("screen");
unlisten(l);
} catch (err) {
if (err.name !== "NotAllowedError") {
wakeLockCell.stash.on = false;
dataIndex("tag", wakeLockCell.elm).cellIcon.innerHTML = iconPaths["Wakelock Off"];
toast("Couldn't turn on wake lock.");
unlisten(l);
}
}
} else {
unlisten(l);
}
}, { capture: true });
}
})();
}
let curtainCell = this.rings.app.cells.curtain;
if (curtainCell.stash.on) {
window._curtain_.on = true;
let cellIcon = dataIndex("tag", curtainCell.elm).cellIcon;
cellIcon.innerHTML = iconPaths["Curtain On"];
window._curtain_.update(true);
}
}
this.op = {
active: false,
state: null,
ring: this.rings[0],
turn: 0,
turnOffset: 0,
schedule: new Schedule(),
};
this.disk.turn = 0;
listen(elm, "pointerdown", (e) => this.opDown(e));
listen(elm, ["pointercancel", "lostpointercapture"], e => {
if (e.pointerId === this.op.pointerId &&
(e.type === "pointercancel" || !elm.hasPointerCapture(e.pointerId))) this.cancelOperation();
});
listen(window, "blur", () => this.cancelOperation());
listen(document, "visibilitychange", () => { if (document.hidden) this.cancelOperation(); });
listen(window, "resize", () => {
delayMs(100, () => {
const width = this.menuHolder.offsetWidth;
const limit = Math.min(innerWidth, innerHeight) * .9;
if (width > limit) this.elm.style.fontSize = parseFloat(getComputedStyle(this.elm).fontSize) / _pxPerEm_ * limit / width + 'em';
this.elm.style.left = clamp(parseFloat(this.elm.style.left), 0, innerWidth) + "px";
this.elm.style.top = clamp(parseFloat(this.elm.style.top), 0, innerHeight) + "px";
});
});
}
async buildRings() {
let rings = this.rings;
rings.score = {
name: "Score",
cells: {
open: {
name: "Open",
stash: {},
svgPath: iconPaths["Open"],
},
save: {
mode: "save",
name: "Save",
stash: {},
svgPath: iconPaths["Save"],
},
new: {
name: "New",
stash: { pages: 5, size: "A4", Width:595, Height:842, rgb: "#ffffff", alpha:1.0 },
svgPath: iconPaths["New Score"],
},
close: { name: "Close", svgPath: iconPaths["Close"] },
transpose: { name: "Transpose", svgPath: iconPaths["Piano"], enabled: false },
playback: { name: "Playback", svgPath: iconPaths["Metronome"], enabled: false },
print: { name: "Print", svgPath: iconPaths["Print"] },
details: { name: "Details", svgPath: iconPaths["Details"], stash: { quality: 3, pgFit: "Center", bkColorIdx: 0 }, storage: "score" },
},
svgPath: iconPaths["Score"],
};
this.magnifier = {
zoom: 1,
panel: null,
get active() {
return rings.page.activeCell?.key === 'magnify' && !!this.panel &&
this.panel.elm.isConnected && this.panel.elm.style.visibility === 'visible' &&
!this.panel.closing && !this.panel.elm.hiding;
}
};
this.listen("score/up", () => this.activateRing(rings.score));
this.listen('score/transpose/up', cell => {
if (!_score_?.music) return;
const panel = panels.TransposePanel.get(cell);
panel.show(); panel.setPosition(this.grip);
});
this.listen('score/transpose/out', cell => { if (_score_?.music) this.openPanel(cell); });
this.listen('score/playback/up', cell => {
if (!_score_?.music) return;
if (panels.playback) panels.playback.close();
else panels.PlaybackPanel.get(cell).show();
});
this.listen('score/playback/out', cell => {
if (_score_?.music && !panels.playback) panels.PlaybackPanel.get(cell).show();
});
this.listen("score/save/up", async (cell) => {
this.activateCell(cell);
await FileSrc.saveActiveScore(cell);
this.activateCell(null, rings.score);
});
this.listen("score/open/up", async (cell) => {
this.activateCell(cell);
panels.library?.close();
this.showPanel(cell);
this.activateCell(null, rings.score);
});
this.listen(["score/details/out", "score/open/out","score/save/out","score/new/out","score/print/out"], (cell) => this.openPanel(cell));
this.listen("score/new/up", async (cell) => {
if(!await checkUnsaved()) return;
let alpha = parseInt(cell.stash.alpha * 255).toString(16);
while (alpha.length < 2) alpha = "0" + alpha;
await Score.newScore(
cell.stash.pages,
cell.stash.Width,
cell.stash.Height,
cell.stash.rgb + alpha,
);
});
this.listen("score/close/up", async () => {
if(!await(checkUnsaved("Warning: current score has unsaved changes. Close anyway?", true))) return;
_menu_.closePanels();
await _score_?.dispose();
_menu_.enableCells(["ink", "page", "layout", "score/save", "score/close", "score/details", "score/print", "score/transpose", "score/playback"], false);
document.dispatchEvent(new CustomEvent("scoreClosed"));
});
rings.layout = {
cells: {
book: {
name: "Book",
storage: "score",
stash: {
fit: "Auto",
pnShow: "On",
pnBand: { axis: "L-R", place: "Inset" },
pace: 350,
pz: null,
},
svgPath: iconPaths["Book"],
},
horizontal: {
name: "Horizontal",
storage: "score",
stash: {
fit: "Auto",
gap: 0.2,
pnShow: "On",
pnBand: { axis: "L-R", place: "Inset" },
pgShow: 2,
pgSnap: 2,
pace: 350,
pz: null,
},
svgPath: iconPaths["Horizontal Scroll"],
},
vertical: {
name: "Vertical",
storage: "score",
stash: {
fit: "Auto",
gap: 0.2,
pnShow: "On",
pnBand: { axis: "T-B", place: "Inset" },
pgShow: 1,
pgSnap: 0,
pace: 350,
pz: null,
},
svgPath: iconPaths["Vertical Scroll"],
},
table: {
name: "Table",
storage: "score",
stash: {
fit: "Auto",
pages: 15,
horizontalGap: 0,
verticalGap: 0,
pnShow: "On",
pz: null,
},
svgPath: iconPaths["Table"],
},
},
name: "Layout",
stash: { active: "book"},
svgPath: iconPaths["Layout"],
};
this.listen("layout/up", () => this.activateRing(rings.layout));
let paths = Object.keys(rings.layout.cells).map((path) => `layout/${path}/`);
this.listen(paths.map((path) => path + "up"),
async (cell) => {
this.activateCell(cell);
if (Layout.activeLayout?.cell == cell) return void Layout.activeLayout.refit();
await Layout.open(cell);
}
);
this.listen(paths.map((path) => path + "out"), (cell) => this.openPanel(cell));
rings.ink = {
cells: {
edit: {
name: "Edit",
svgPath: iconPaths["Edit"] },
pencil: {
name: "Pencil",
svgPath: iconPaths["Pencil"],
stash: { alpha:"1",  rgb: "#000000", style:"Free", width: 1.5},
},
pen: {
name: "Pen",
svgPath: iconPaths["Pen"],
stash: { alpha:".5",  rgb: "#FFFF00", style:"L-R", width: 10},
},
rastrum: {
name: "Rastrum",
svgPath: iconPaths["Rastrum"],
stash: { alpha:"1", gap:5,  lines: 5, width: 0,
rgb: "#000000", style:"L-R", bars:0, barWidth:0},
},
text: {
name: "Text",
svgPath: iconPaths["Text"],
stash: {alpha:"1", font: "Times-Roman", size: 20, height: 20, rgb: "#000000"},
},
symbols: {
name: "Symbols",
svgPath: iconPaths["Symbols"],
stash: {alpha:"1", rgb:"#000000", font: "Bravura", size: 5, group: "Basic", codePoint: "\ue050", recent: {}},
},
cut: {
name: "Cut",
svgPath: iconPaths["Cut"],
},
copy: {
name: "Copy",
svgPath: iconPaths["Copy"],
},
paste: {
name: "Paste",
svgPath: iconPaths["Paste"],
},
undo: {
name: "Undo",
svgPath: iconPaths["Undo"],
},
grid: {
name: "Grid",
panel: "GridPanel",
svgPath: iconPaths["Grid"],
stash: {units:"Inch", xStep: 2, yStep:2, snap:"Snap", numbers:"On"},
},
},
name: "Ink",
stash: { active: "pencil",
recentColors:["#ff0000","#00ff00","#0000ff","#ffff8f","#ffa500","#000000","#333333","#666666","#999999","#cccccc"] },
svgPath: iconPaths["Ink"],
};
this.listen("ink/up", () => this.activateRing(rings.ink));
paths = Object.keys(rings.ink.cells).map((key) => `ink/${key}/`);
this.listen(paths.map((path) => path + "up"),(cell) => this.activateCell(rings.ink.activeCell === cell ? null :cell, rings.ink));
this.listen(paths.map((path) => path + "long"),(cell) => this.toggleLock(cell));
paths = paths.filter((key) => !["ink/undo/","ink/cut/","ink/paste/"].includes(key));
this.listen(paths.map((path) => path + "out"),(cell) => this.openPanel(cell));
rings.page = {
cells: {
numbers: {
name: "Numbers",
svgPath: iconPaths["Numbers"],
stash: { pn: 1, first: 1, prelim: 0, forward: "Pages", reverse: "Pages" },
storage: "score",
},
add: {
name: "Add",
svgPath: iconPaths["New Page"],
stash: { rgb: "#ffffff", alpha: 1.0, Width: 612, Height: 792, size: "Match Score" },
},
cut: { name: "Cut", svgPath: iconPaths["Cut Page"] },
copy: { name: "Copy", svgPath: iconPaths["Copy Page"] },
paste: { name: "Paste", svgPath: iconPaths["Paste Page"] },
undo: { name: "Undo", svgPath: iconPaths["Undo"] },
export: { name: "Export", svgPath: iconPaths["Export Page"] },
import: { name: "Import", svgPath: iconPaths["Import Page"] },
merge: { name: "Merge", svgPath: iconPaths["Merge"] },
flatten: { name: "Flatten", svgPath: iconPaths["Flatten"] },
magnify: { name: "Magnify", svgPath: iconPaths["Magnify"], stash: { zoom: 2 } },
},
name: "Page",
stash: {},
svgPath: iconPaths["Page"],
};
this.listen("page/up", () => this.activateRing(rings.page));
paths = Object.keys(rings.page.cells).map((path) => `page/${path}/`);
this.listen(paths.map((path) => path + "up"), (cell) => this.activateCell(rings.page.activeCell === cell ? null :cell, rings.page));
this.listen(paths.map((path) => path + "long"), (cell) => this.toggleLock(cell));
this.listen(["page/numbers/","page/import/","page/add/","page/magnify/","page/merge/"].map((path) => path + "out"), (cell) =>  this.openPanel(cell));
this.listen("page/merge/long", (cell) => {
this.toggleLock(cell);
if (cell.locked) this.openPanel(cell);
});
this.listen("page/merge/up", (cell) => {
if (rings.page.activeCell === cell) { this.activateCell(null, rings.page); return; }
if (cell.pdfData) { this.activateCell(cell); return; }
this.openPanel(cell);
});
this.listen("page/undo/up", async () => {
_score_.pgUndo();
await Layout.activeLayout.build(false);
})
rings.app = {
name: "App",
cells: {
about: { name: "About", svgPath: iconPaths["About"], stash: {} },
theme: { name: "Theme", svgPath: iconPaths["Light"], stash: { theme: "Light" }, storage: "local" },
guide: { name: "Guide", svgPath: iconPaths["Guide"], stash: {} },
storage: { name: "Storage", svgPath: iconPaths["Storage"], stash: {} },
curtain: { name: "Curtain", svgPath: iconPaths["Curtain"], stash: { color:"Black", alpha: 60, on: false }, storage: "local" },
wakeLock: { name: "Wakelock", svgPath: iconPaths["Wakelock Off"], stash: { on: false }, storage: "local" },
screen: { name: "Screen", stash: {}, svgPath: iconPaths["Full Screen"], storage: "local" },
},
svgPath: iconPaths["Rostrum"],
}
this.listen("app/up", () => this.activateRing(rings.app));
this.listen("app/about/out", (cell) => this.openPanel(cell));
this.listen("app/curtain/out", (cell) => this.openPanel(cell));
this.listen("app/curtain/up", (cell) => _curtain_.toggle());
this.listen("app/screen/out", (cell) => this.openPanel(cell));
this.listen("app/storage/out", (cell) => this.openPanel(cell));
this.listen("app/guide/out", (cell) => this.openPanel(cell));
this.listen("app/volume/out", (cell) => this.openPanel(cell));
this.listen("app/screen/up", (cell) => {
let cellIcon = dataIndex("tag", rings.app.cells.screen.elm).cellIcon;
if (!document.fullscreenElement) {
document.documentElement.requestFullscreen();
cellIcon.innerHTML = iconPaths["Normal Screen"];
} else if (document.exitFullscreen) {
document.exitFullscreen();
cellIcon.innerHTML = iconPaths["Full Screen"];
}
});
this.listen("app/theme/up", () => this.showPanel(rings.app.cells.theme));
this.listen("app/wakeLock/up", async (cell) => {
let cellIcon = dataIndex("tag", rings.app.cells.wakeLock.elm).cellIcon;
if (cell.stash.on) {
cell.stash.on = false;
cell.wakeLock?.release();
cell.wakeLock = null;
cellIcon.innerHTML = iconPaths["Wakelock Off"];
} else {
try {
cell.wakeLock = await navigator.wakeLock.request("screen");
cell.stash.on = true;
cellIcon.innerHTML = iconPaths["Wakelock On"];
} catch {
toast("Couldn't turn on wake lock.");
}
}
});
listen(document, "visibilitychange", async () => {
let cell = rings.app?.cells?.wakeLock;
if (cell?.stash.on && document.visibilityState == "visible") {
try {
cell.wakeLock = await navigator.wakeLock.request("screen");
} catch {
}
}
});
rings.more = {
cells: {
metronome: {
name: "Metronome",
svgPath: iconPaths["Metronome"],
stash: {
tempo: 60,
state: "Pause",
trace: "Hide",
mute: "Mute",
pattern: "metronome",
latency: 0,
},
},
stopwatch: {
name: "Stopwatch",
svgPath: iconPaths["Stopwatch"],
stash: {},
},
clock: { name: "Clock", svgPath: iconPaths["Clock"], stash: {} },
piano: {
name: "Piano",
svgPath: iconPaths["Piano"],
stash: { a4: 0, temperament: "Equal", timbre: "piano", voices: 4 },
},
review: {
name: "Review",
svgPath: iconPaths["Review"],
stash: {
audioSrc: "Audio 1",
videoSrc: "Video 1",
mode: "Mirror",
mirror: "Mirror",
replay: 15,
},
},
keyboard: {
name: "Keyboard",
svgPath: iconPaths["Keyboard"],
stash: {},
},
volume: { name: "Volume", svgPath: iconPaths["Volume"], stash: { volume:1}, },
},
name: "More",
stash: { active: null },
svgPath: iconPaths["More"],
};
this.listen("more/up", () => this.activateRing(rings.more));
paths = Object.keys(rings.more.cells).map((path) => `more/${path}/`);
this.listen(paths.map((path) => path + "out"),  (cell) => this.openPanel(cell));
this.listen("up", () => this.collapse());
this.listen("long", () => this.park());
for (let [ringKey, ring] of Object.entries(this.rings)) {
for (let [cellKey, cell] of Object.entries(ring.cells)) {
let path = `${ringKey}/${cellKey}/up`;
let panelClass = panels[cell.panel || cell.name + "Panel"];
if (panelClass && !this.listeners[path]) {
this.listen(path, (cell) => panelClass.get(cell).show().setPosition(this.grip));
}
}
}
}
configureNavigation() {
const rings = this.rings;
const add = (ring, key, name, icon, panel) => {
const cell = { key, ring: rings[ring], name, svgPath: iconPaths[icon], panel, stash: {} };
rings[ring].cells[key] = cell;
return cell;
};
add('score', 'library', 'Library', 'Score', 'LibraryPanel');
add('layout', 'display', 'Display settings', 'Details', 'DisplaySettingsPanel');
add('page', 'transfer', 'Between scores', 'Import Page', 'TransferPanel');
add('page', 'advanced', 'Advanced', 'Flatten', 'PageAdvancedPanel');
add('app', 'navigation', 'Page turning', 'Numbers', 'NavigationPanel');
add('app', 'position', 'Position and zoom', 'Full Screen', 'ScreenPanel');
rings.more.svgPath = iconPaths['Metronome'];
rings.app.svgPath = iconPaths['Options'];
rings.app.cells.theme.panel = 'ThemePanel';
const labels = {
'score/new': 'Blank score', 'score/details': 'Score info',
'ink/edit': 'Select / edit', 'ink/rastrum': 'Staff',
'page/numbers': 'Go to page', 'page/add': 'Add blank page',
'page/cut': 'Cut page', 'page/copy': 'Copy page', 'page/paste': 'Paste page',
'page/undo': 'Undo pages', 'page/merge': 'Insert PDF',
'page/export': 'Send page to buffer', 'page/import': 'Insert from buffer',
'page/flatten': 'Flatten page annotations', 'app/screen': 'Fullscreen',
'app/wakeLock': 'Keep screen awake', 'app/storage': 'Data management',
'more/review': 'Record audio / video', 'more/keyboard': 'Text keyboard',
'more/piano': 'Piano / tuning', 'ink/undo': 'Undo annotations',
};
for (const [path, label] of Object.entries(labels)) this.getCell(path).label = label;
const navigation = {
score: ['File', ['score/library', 'score/open', 'score/save', 'score/new', 'score/print', 'score/details', 'score/close']],
layout: ['View', ['layout/book', 'layout/horizontal', 'layout/vertical', 'layout/table', 'page/numbers', 'page/magnify', 'app/screen', 'layout/display']],
ink: ['Annotate', ['ink/pencil', 'ink/pen', 'ink/rastrum', 'ink/text', 'ink/symbols', 'ink/edit', 'ink/undo']],
page: ['Pages', ['page/add', 'page/cut', 'page/copy', 'page/paste', 'page/undo', 'page/merge', 'page/transfer', 'page/advanced']],
more: ['Practice', ['score/playback', 'score/transpose', 'more/metronome', 'more/piano', 'more/review', 'more/stopwatch', 'more/clock', 'more/volume']],
app: ['Settings', ['app/theme', 'app/navigation', 'more/keyboard', 'app/storage', 'app/guide', 'app/about']],
};
this.rings = Object.fromEntries(Object.keys(navigation).map(key => [key, rings[key]]));
for (const [key, [name, paths]] of Object.entries(navigation)) {
const ring = rings[key];
ring.name = name;
ring.displayCells = paths.map(path => this.getCell(path));
for (const cell of ring.displayCells) cell.displayRing = ring;
}
const show = cell => cell.key === 'library' ? this.showLibrary()
: cell.key === 'position' ? this.showPanel(rings.app.cells.screen) : this.showPanel(cell);
for (const path of ['score/library', 'layout/display', 'page/transfer', 'page/advanced', 'app/navigation', 'app/position', 'app/theme']) {
this.listen(path + '/up', show);
this.listen(path + '/out', cell => cell.key === 'position' ? this.openPanel(rings.app.cells.screen) : this.openPanel(cell));
}
this.listen('ink/edit/up', cell => {
this.activateCell(cell.ring.activeCell === cell ? null : cell, cell.ring);
this.showPanel(cell);
});
this.listen('page/numbers/up', cell => {
this.activateCell(cell.ring.activeCell === cell ? null : cell, cell.ring);
this.showPanel(cell);
});
this.listen('page/magnify/up', cell => {
if (this.magnifier.active) panels.magnify.close();
else this.showPanel(cell);
});
}
applyTheme(theme) {
const cell = this.rings.app.cells.theme;
document.documentElement.setAttribute('data-theme', theme);
dataIndex('tag', cell.elm).cellIcon.innerHTML = iconPaths[theme];
cell.stash.theme = theme;
this.applyGaps(theme);
}
getCell(path) {
const [ring, key] = path.split('/');
return this.rings[ring].cells[key];
}
showPanel(cell) {
const panel = panels[cell.panel || cell.name + 'Panel']?.get(cell);
if (!panel) return;
this.hasOpenedPanel = true;
panel.show();
if (cell.key === 'library') return panel;
panel.setPosition(this.grip);
const halfWidth = panel.panel.offsetWidth / 2;
const halfHeight = panel.panel.offsetHeight / 2;
panel.elm.style.left = clamp(parseFloat(panel.elm.style.left), halfWidth + 8, innerWidth - halfWidth - 8) + 'px';
panel.elm.style.top = clamp(parseFloat(panel.elm.style.top), halfHeight + 8, innerHeight - halfHeight - 8) + 'px';
return panel;
}
showLibrary() {
panels.open?.close();
return this.showPanel(this.rings.score.cells.library);
}
buildMenu() {
let { diskDiameter, diskRadius, ringDiameter, ringRadius, ringGap, fontSize, cellGap, cellIcon } = this.sizes;
let clipPath = "circle(50%)";
let diskEntries = Object.entries(this.rings);
let ringKnt = diskEntries.length;
if (ringKnt >= 2) {
let c = diskRadius;
let theta = (2 * Math.PI) / (ringKnt * 2);
let x = Math.sin(theta) * diskDiameter;
let y = Math.cos(theta) * diskDiameter;
clipPath = `polygon(${c - ringGap}em ${c}em,` + `${c + x - ringGap}em ${c - y}em,` + `${c - x + ringGap}em ${c - y}em,` + `${c + ringGap}em ${c}em)`;
}
diskEntries.forEach(([diskKey, ring], index) => {
ring.elm = helm(`<div data-tag="ring" style="width:${ringDiameter}em;height:${ringDiameter}em;" class="Menu__ring"></div>`);
ring.turn = 0;
this.menuHolder.append(ring.elm);
let rotation = index / ringKnt;
let diskCellElm = helm(
`<div data-tag="diskCell" style="width:${diskDiameter}em;height:${diskDiameter}em;clip-path:${clipPath};transform:rotate(${rotation}turn);"
class="Menu__diskCell" data-key="${diskKey}">
<div data-tag="cellContents" class="Menu__cell-contents" style="transform:rotate(${-rotation}turn)">
<div data-tag="cellName" style="font-size:${fontSize}em;pointer-events:none;"><br>${ring.name}</div>
${svgWrap(ring.svgPath, { tag: "cellIcon", class: "cellIcon", size: cellIcon + "em", style: `width:${cellIcon}em;height:${cellIcon}em;pointer-events:none` })}
</div>
</div>`
);
this.disk.append(diskCellElm);
ring.cellElm = diskCellElm;
ring.iconSvg = dataIndex("cellIcon", diskCellElm)["iconSvg"];
{
let clipPath = "circle(50%)";
let cellEntries = ring.displayCells.map(cell => [cell.key, cell]);
let cellKnt = cellEntries.length;
if (cellKnt >= 2) {
let c = ringRadius;
let theta = (2 * Math.PI) / (cellKnt * 2);
let x = Math.sin(theta) * ringDiameter;
let y = Math.cos(theta) * ringDiameter;
clipPath = `polygon(${c - cellGap}em ${c}em,` + `${c + x - cellGap}em ${c - y}em,` + `${c - x + cellGap}em ${c - y}em,` + `${c + cellGap}em ${c}em)`;
}
cellEntries.forEach(([cellKey, cell], index) => {
let rotation = ring.elm.childElementCount / cellKnt;
cell.elm = helm(`<div data-tag="ringCell" style="width:${ringDiameter}em;height:${ringDiameter}em;clip-path:${clipPath};transform:rotate(${rotation}turn);" class="Menu__cell"
data-key="${cell.ring.key + "/" + cellKey}">
<div data-tag="cellContents" class="Menu__cell-contents" style="transform:rotate(${-rotation}turn);">
<div data-tag="cellName" style="font-size:${fontSize}em;"><br>${cell.label || cell.name}</div>
${svgWrap(cell.svgPath, { tag: "cellIcon", class: "cellIcon", size: cellIcon + "em", style: `width:${cellIcon}em;height:${cellIcon}em;` })}
</div>
</div>`);
ring.elm.append(cell.elm);
if(this.listeners[`${cell.ring.key}/${cellKey}/out`])
cell.elm.classList.add("Menu__cell-panel");
});
}
});
this.nestedTools = helm('<div hidden></div>');
this.elm.append(this.nestedTools);
for (const ring of Object.values(this.rings)) for (const cell of Object.values(ring.cells)) {
if (cell.elm) continue;
cell.elm = helm(`<button type="button" class="Menu__action" data-action="${ring.key}/${cell.key}">
${svgWrap(cell.svgPath, { tag: 'cellIcon', size: '1.5em' })}
<span>${cell.label || cell.name}</span></button>`);
cell.elm.addEventListener('click', () => {
if (cell.key === 'grid') return this.showPanel(cell);
if (['ink', 'page'].includes(ring.key)) this.activateRing(ring);
this.notify(`${ring.key}/${cell.key}/up`);
});
this.nestedTools.append(cell.elm);
}
}
applyGaps(theme) {
let gap = theme == "Glass" ? 0 : this.sizes.cellGap;
let { diskDiameter, diskRadius, ringDiameter, ringRadius } = this.sizes;
let diskEntries = Object.entries(this.rings);
let ringKnt = diskEntries.length;
let diskClipPath = "circle(50%)";
if (ringKnt >= 2) {
let c = diskRadius;
let theta = (2 * Math.PI) / (ringKnt * 2);
let x = Math.sin(theta) * diskDiameter;
let y = Math.cos(theta) * diskDiameter;
diskClipPath = `polygon(${c - gap}em ${c}em,${c + x - gap}em ${c - y}em,${c - x + gap}em ${c - y}em,${c + gap}em ${c}em)`;
}
diskEntries.forEach(([, ring]) => {
ring.cellElm.style.clipPath = diskClipPath;
let cellEntries = ring.displayCells.map(cell => [cell.key, cell]);
let cellKnt = cellEntries.length;
let ringClipPath = "circle(50%)";
if (cellKnt >= 2) {
let c = ringRadius;
let theta = (2 * Math.PI) / (cellKnt * 2);
let x = Math.sin(theta) * ringDiameter;
let y = Math.cos(theta) * ringDiameter;
ringClipPath = `polygon(${c - gap}em ${c}em,${c + x - gap}em ${c - y}em,${c - x + gap}em ${c - y}em,${c + gap}em ${c}em)`;
}
cellEntries.forEach(([, cell]) => {
cell.elm.style.clipPath = ringClipPath;
});
});
}
constrain() {
if(this.elm.offsetTop < 0) this.elm.style.top = 0 ;
else if(this.elm.offsetTop > window.innerHeight) this.elm.style.top = window.innerHeight + "px";
if(this.elm.offsetLeft < 0) this.elm.style.left = 0 ;
else if(this.elm.offsetLeft > window.innerWidth) this.elm.style.left = window.innerWidth + "px";
}
opDown(e) {
e.taken = true;
if (e.ctrlKey || e.shiftKey || e.button !== 0 || e.isPrimary === false) return;
this.cancelOperation();
this.elm.style.zIndex = ++_zTop_;
this.clearSpinFling();
let op = this.op;
op.schedule.cancel();
let keys = e.target.dataset.key || "grip";
if (!keys) return;
let box = getBox(this.menuHolder);
let dxdy = [e.clientX - box.x, e.clientY - box.y];
let [ringKey, cellKey] = keys.split("/");
Object.assign(op, {
active: true,
pointerId: e.pointerId,
cellKey: cellKey,
completed: false,
e: e,
emv: e,
drag: new Drag(e, { minVelocity:0.1}),
moved: false,
origin: { x: e.clientX, y: e.clientY },
out: false,
ringKey: ringKey,
ring: this.activeRing,
ringRadiusPx: this.activeRing.elm.offsetWidth / 2,
spun: false,
state: ringKey == "grip" ? "grip" : cellKey ? "ring" : "disk",
turn: null,
turn0: null,
});
this.elm.setPointerCapture(e.pointerId);
op.turn = op.turn0 = Math.atan2(dxdy[1] - op.ringRadiusPx, dxdy[0] - op.ringRadiusPx) / (Math.PI * 2) + 1.25;
this.startAngle = op.turn;
switch (op.state) {
case "ring": {
op.turnOffset = op.turn - op.ring.turn;
op.cell = this.rings[ringKey].cells[cellKey];
let ringTransform = op.ring.elm.style.transform || "rotate(0turn)";
let ringAngle = parseFloat(ringTransform.substring(7,ringTransform.length - 5)) ;
let cellTransform = op.cell.elm.style.transform;
op.cellAngle = parseFloat(cellTransform.split('(')[1]) + ringAngle  ;
if (op.cell.enabled == false) break;
op.cell.elm.classList.add("Menu__cell-selected");
this.notify(`${ringKey}/${cellKey}/down`);
op.schedule.run(
_gs_,
() => {
op.completed = true;
this.notify(`${ringKey}/${cellKey}/long`);
op.cell.elm.classList.remove("Menu__cell-selected");
},
this
);
break;
}
case "disk": {
this.disk.turnOffset = op.turn - this.disk.turn;
op.ring = this.rings[ringKey];
if (op.ring.enabled == false) break;
op.ring.cellElm.classList.add("Menu__diskCell-selected");
this.notify(`${ringKey}/down`);
break;
}
case "grip": {
this.notify("down");
this.grip.classList.add("Menu__grip-selected");
op.schedule.run(
_gs_,
() => {
op.completed = true;
this.notify("long");
this.grip.classList.remove("Menu__grip-selected");
},
this
);
}
}
op.moveListener = listen(this.elm, "pointermove", this.opMove.bind(this));
op.upListener = listen(window, "pointerup", this.opUp.bind(this), { capture:true });
}
opMove(emv) {
let op = this.op;
if (!op.active || emv.pointerId !== op.pointerId) return;
if (emv.buttons === 0) return this.cancelOperation();
if (op.completed) return;
op.emv = emv;
op.drag.mv(emv);
if (op.out)
return this.notify(`${op.ringKey}/${op.cellKey}/out`);
let elm = this.menuHolder;
let box = getBox(elm);
let dxdy = [emv.clientX - box.x, emv.clientY - box.y];
op.turn = Math.atan2(dxdy[1] - op.ringRadiusPx, dxdy[0] - op.ringRadiusPx) / (Math.PI * 2) + 1.25;
if(op.drag.moved) op.schedule.cancel();
if (op.drag.moved && !op.spun && !op.out) {
if (op.state == "disk") {
op.spun = true;
} else if (op.state == "ring") {
let centerX = this.elm.offsetLeft;
let centerY = this.elm.offsetTop;
let dx = emv.clientX - op.e.clientX;
let dy = emv.clientY - op.e.clientY;
let rx = emv.clientX - centerX;
let ry = emv.clientY - centerY;
let r = Math.hypot(rx, ry);
if (r > 0) {
let radialX = rx / r;
let radialY = ry / r;
let tangentX = -radialY;
let tangentY = radialX;
let radialComponent = Math.abs(dx * radialX + dy * radialY);
let tangentComponent = Math.abs(dx * tangentX + dy * tangentY);
if (tangentComponent > radialComponent * 1.5) {
op.spun = true;
}
else if (radialComponent > tangentComponent * 1.5) {
op.out = true;
return this.notify(`${op.ringKey}/${op.cellKey}/out`);
}
}
}
}
switch (op.state) {
case "ring": {
if (op.spun) {
op.ring.turn = op.turn - op.turnOffset;
op.ring.elm.style.transform = `rotate(${op.ring.turn}turn)`;
let rotation = 1 / op.ring.elm.childElementCount;
[...op.ring.elm.children].forEach((elm, i) => (elm.firstElementChild.style.transform =
`rotate(${-rotation * i - op.ring.turn}turn)`));
this.notify(`${op.ringKey}/${op.cellKey}/spin`);
op.cell.elm.classList.remove("Menu__cell-selected");
emv.turn = op.turn;
}
break;
}
case "disk": {
if (op.spun) {
this.disk.turn = op.turn - this.disk.turnOffset;
this.disk.style.transform = `rotate(${this.disk.turn}turn)`;
let rotation = 1 / this.disk.childElementCount;
[...this.disk.children].forEach((elm, i) => (elm.firstElementChild.style.transform =
`rotate(${-rotation * i - this.disk.turn}turn)`));
this.notify(`${op.ringKey}/spin`);
op.ring.cellElm.classList.remove("Menu__diskCell-selected");
emv.turn = op.turn;
}
break;
}
case "grip": {
if (!op.drag.moved) return;
this.elm.style.left = clamp(emv.clientX, 0, innerWidth) + "px";
this.elm.style.top = clamp(emv.clientY, 0, innerHeight) + "px";
this.notify("move");
break;
}
default:
break;
}
}
spinFling(op, eup) {
let buf = op.drag.mvBuf.filter(e => e.turn != undefined);
if (buf.length < 2) return;
let recent = buf.filter(e => eup.timeStamp - e.timeStamp <= op.drag.terminalWindow);
if (recent.length < 2) return;
let dT = recent[recent.length - 1].timeStamp - recent[0].timeStamp;
if (!dT) return;
let vel = (recent[recent.length - 1].turn - recent[0].turn) / dT;
if (Math.abs(vel) < 0.0005) return;
let isRing = op.state == "ring";
let obj = isRing ? op.ring : this.disk;
let spinElm = isRing ? op.ring.elm : this.disk;
let rotation = 1 / spinElm.childElementCount;
let dur   = clamp(Math.abs(vel) / 0.00000067, 500, 1500);
let coast = clamp(vel * dur / 2, -0.75, 0.75);
obj.turn += coast;
spinElm.style.transition = `transform ${dur}ms ease-out`;
spinElm.style.transform  = `rotate(${obj.turn}turn)`;
[...spinElm.children].forEach((child, i) => {
child.firstElementChild.style.transition = `transform ${dur}ms ease-out`;
child.firstElementChild.style.transform  = `rotate(${-rotation * i - obj.turn}turn)`;
});
this.spinElm = spinElm;
}
clearSpinFling() {
if (!this.spinElm) return;
this.spinElm.style.transition = "unset";
[...this.spinElm.children].forEach(child => child.firstElementChild.style.transition = "unset");
this.spinElm = null;
}
cancelOperation() {
const op = this.op;
if (!op) return;
op.schedule.cancel();
unlisten(op.moveListener, op.upListener);
op.cell?.elm.classList.remove("Menu__cell-selected");
op.ring?.cellElm.classList.remove("Menu__diskCell-selected");
this.grip.classList.remove("Menu__grip-selected");
const pointerId = op.pointerId;
Object.assign(op, { active:false, completed:true, out:false, spun:false,
state:null, cell:null, cellKey:null, ringKey:null, pointerId:null,
e:null, emv:null, drag:null, moveListener:null, upListener:null });
if (pointerId != null && this.elm.hasPointerCapture(pointerId)) this.elm.releasePointerCapture(pointerId);
}
opUp(eup) {
if (!this.op.active || eup.pointerId !== this.op.pointerId) return;
const op = { ...this.op };
op.drag.up(eup);
this.cancelOperation();
if (op.spun) { this.spinFling(op, eup); return; }
if(op.out) {
if(op.drag.vXY && op.drag.vXY > 0.75 && eup.timeStamp - op.e.timeStamp > 500) {
let panel = panels[op.cell.panel || op.cell.name + "Panel"]?.get(op.cell);
if (panel) hide(panel.elm, dataIndex("tag", op.cell.elm).cellIcon);
}
return;
}
switch (op.state) {
case "ring":
if (!op.completed) this.notify(`${op.ringKey}/${op.cellKey}/up`);
break;
case "disk":
this.notify(`${op.ringKey}/up`);
break;
case "grip":
if (op.drag.dXY) {
if (!this.collapsed) this.collapse();
let dx = Math.cos(op.drag.dXY), dy = Math.sin(op.drag.dXY);
let iW  = innerWidth,  iH  = innerHeight;
let mx = this.elm.offsetLeft,  my = this.elm.offsetTop;
let tx = dx > 0 ? (iW - mx) / dx : dx < 0 ? -mx / dx : Infinity;
let ty = dy > 0 ? (iH - my) / dy : dy < 0 ? -my / dy : Infinity;
let t  = Math.min(tx, ty);
let corners = [
[iW, 0, Math.PI/4 * 7],
[0,  0, Math.PI/4 * 5],
[0,  iH, Math.PI/4 * 3],
[iW, iH, Math.PI/4 * 1],
];
let pull = Math.PI / 8;
let snapped = corners.find(([,, ca]) => {
let diff = Math.abs(((op.drag.dXY - ca + 3*Math.PI) % (2*Math.PI)) - Math.PI);
return diff < pull;
});
let ex = snapped ? snapped[0] : mx + t*dx;
let ey = snapped ? snapped[1] : my + t*dy;
let dist = Math.hypot(ex - mx, ey - my);
op.drag.power(0.5);
let dur = Math.round(clamp(dist / op.drag.vXY, 100, 3000));
numb(this.elm, dur);
animate(this.elm, null, { left: ex + "px", top: ey + "px" }, `left ${dur}ms, top ${dur}ms`);
}
else if(eup.timeStamp - op.e.timeStamp < 200) this.notify("up");
}
}
activateRing(ring) {
if (ring.key !== "layout" && ring.cellElm.classList.contains("Menu__cell-disabled")) return;
if (this.activeRing == ring) return;
this.checkEditing();
if (this.activeRing) {
this.activeRing.elm.style.visibility = "hidden";
this.activeRing.cellElm.classList.remove("Menu__diskCell-active");
}
ring.elm.style.visibility = "visible";
ring.cellElm.classList.add("Menu__diskCell-active");
this.activeRing = ring;
if(_score_) _score_.setEditable(ring.key == "ink" && ring.activeCell);
}
activateCell(cell, fallbackRing = null) {
this.checkEditing();
let ring = cell?.ring || fallbackRing || this.activeRing;
let editCell = this.rings.ink.cells.edit;
let editToggle = (ring.activeCell !== editCell && cell === editCell) ||
(ring.activeCell === editCell && cell !== editCell);
if (ring?.activeCell) {
ring.activeCell.elm.classList.remove("Menu__cell-active");
if (ring.activeCell.locked) {
ring.activeCell.locked = false;
ring.activeCell.elm.classList.remove("Menu__cell-locked");
}
if (ring.activeCell.key == "merge") {
ring.activeCell.pdfData = null;
this.autoOff.delta = 4000;
}
}
if (cell) {
cell.elm.classList.add("Menu__cell-active");
ring.activeCell = cell;
ring.stash.active = cell.key;
if((ring.key == "page" && cell.key != "numbers") || ring.key == "ink")
this.autoOff.run();
} else ring.activeCell = null;
if(_score_ && ring.key == "ink") {
_score_.setEditable(ring.activeCell);
if(editToggle && cell && (cell.key == "cut" || cell.key == "copy"))
{
for(let pg of _score_.pgs) {
if(!pg.inflated) continue;
let obj = pg.canvas.getActiveObject();
if(obj) {
obj.type == "activeSelection" ? this.pgEvent({selected:obj._objects},pg) : this.pgEvent({target:obj},pg);
return ;
}
}
}
if(editToggle) _score_.setSelectable(cell === editCell);
}
}
enableCells(cellPath, enable = true) {
if (Array.isArray(cellPath)) return cellPath.forEach(path => this.enableCells(path, enable));
const [ringKey, cellKey] = cellPath.split('/');
const ring = this.rings[ringKey];
if (cellKey) {
const cell = ring.cells[cellKey];
cell.enabled = enable;
this.syncCellState(cell);
} else {
ring.enabled = enable;
ring.cellElm.classList.toggle('Menu__cell-disabled', !enable && ringKey !== 'layout');
for (const cell of Object.values(ring.cells)) this.syncCellState(cell);
}
}
syncCellState(cell) {
const requiresScore = ['ink', 'page', 'layout'].includes(cell.ring.key) && cell.key !== 'display';
const enabled = cell.enabled !== false && (!requiresScore || cell.ring.enabled !== false);
cell.elm.classList.toggle('Menu__cell-disabled', !enabled);
if (cell.elm.tagName === 'BUTTON') cell.elm.disabled = !enabled;
}
closePanels(except = ["app", "more"]) {
for (let panel of Object.values(panels)) {
if (panel.cell && !except.includes(panel.cell.ring?.key)) panel.close();
}
}
listen(path, func) {
if (Array.isArray(path)) {
path.forEach((key) => this.listen(key, func));
return;
}
if (this.listeners[path] && !func) delete this.listeners[path];
else this.listeners[path] = func;
}
notify(path) {
if (path in this.listeners) {
let parts = path.split("/");
parts.pop();
let [ringKey, cellKey] = parts;
let cell = this.rings[ringKey];
if (cellKey) cell = cell.cells[cellKey];
let elm = cell?.elm || cell?.cellElm;
if (cellKey && ['ink', 'page'].includes(ringKey) && this.rings[ringKey].enabled === false) return;
if (elm?.classList.contains("Menu__cell-disabled")) return;
return this.listeners[path](cell);
}
}
openPanel(cell) {
if (!this.op.active) return this.showPanel(cell);
if (cell.key === 'library') return this.showLibrary();
let panel = panels[cell.panel || cell.name + "Panel"]?.get(cell);
if (!panel) return;
this.hasOpenedPanel = true;
if (!panel.elm.isConnected) {
panel.elm.style.visibility = "hidden";
_body_.append(panel.elm);
}
Object.assign(panel.elm.style, {
left: this.op.emv.clientX - panel.elm.offsetWidth / 2 + "px",
top: this.op.emv.clientY + panel.panel.offsetHeight / 2 - panel.header.offsetHeight / 2 + "px",
});
if (panel.elm.style.visibility != "visible") panel.show();
else if (panel.constructor.name != "CurtainPanel" && +panel.elm.style.zIndex < +this.elm.style.zIndex)
panel.elm.style.zIndex = ++_zTop_;
cell.elm.classList.remove("Menu__panel");
panel.constrain();
_pzTarget_ = panel.elm ;
}
stashFromJson(stashJson, source) {
this.stashFromJsonObj(JSON.parse(stashJson), source);
}
stashFromJsonObj(stashJsonObj, source) {
let isObject = value => value && typeof value === "object" && !Array.isArray(value);
let sanitize = value => Array.isArray(value) ? value.map(sanitize) : isObject(value) ?
Object.fromEntries(Object.entries(value)
.filter(([key]) => !["__proto__", "constructor", "prototype"].includes(key))
.map(([key, item]) => [key, sanitize(item)])) : value;
if(!isObject(stashJsonObj)) return;
stashJsonObj = sanitize(stashJsonObj);
let version = stashJsonObj.version;
if (!version) return;
if (version != _rostrumVersion_) {
console.warn("Rostrum version mismatch, ignoring stash");
return;
}
for (let [ringKey, ringValue] of Object.entries(stashJsonObj)) {
if(!Object.hasOwn(this.rings, ringKey) || !isObject(ringValue)) continue;
let ring = this.rings[ringKey];
if (!ring) continue;
try {
let { stash, cells } = ringValue;
ring.stash = ring.stash ?? {};
if(isObject(stash)) Object.assign(ring.stash, stash);
if(!isObject(cells)) continue;
for (let [cellKey, cellStash] of Object.entries(cells)) {
if(!Object.hasOwn(ring.cells, cellKey) || !isObject(cellStash)) continue;
let cell = ring.cells[cellKey];
if (!cell) continue;
if (source && cell.storage && cell.storage != source) continue;
cell.stash = cell.stash ?? {};
if (source === 'score' &&
cellStash.recent !== undefined && typeof cellStash.recent === 'object' &&
cell.stash.recent !== undefined && typeof cell.stash.recent === 'object') {
let { recent: incoming, ...rest } = cellStash;
Object.assign(cell.stash, rest);
cell.stash.recent = mergeRecent(cell.stash.recent, incoming);
} else {
Object.assign(cell.stash, cellStash);
}
}
} catch {
}
}
}
stashToJson(source) {
return JSON.stringify(this.stashToJsonObj(source));
}
stashToJsonObj(source) {
try {
let stash = {};
for (let [ringKey, ring] of Object.entries(this.rings)) {
stash[ringKey] = {};
let cells = {};
for (let [cellKey, cell] of Object.entries(ring.cells)) {
if (cell.stash && (!source || !cell.storage || cell.storage == source))
cells[cellKey] = cell.stash;
}
stash[ringKey].stash = ring.stash;
stash[ringKey].cells = cells;
}
stash.version = _rostrumVersion_;
return stash;
} catch (error) {
toast("Stash creation failed, ignoring: " + error);
return {};
}
}
factoryReset() {
let theme = this.rings.app.cells.theme.stash.theme;
let wakeLock = { ...this.rings.app.cells.wakeLock.stash };
let curtain = { ...this.rings.app.cells.curtain.stash };
let screen = { ...this.rings.app.cells.screen.stash };
this.stashFromJson(this.stashDefaults);
this.rings.app.cells.theme.stash.theme = theme;
Object.assign(this.rings.app.cells.wakeLock.stash, wakeLock);
Object.assign(this.rings.app.cells.curtain.stash, curtain);
Object.assign(this.rings.app.cells.screen.stash, screen);
if (window._curtain_ && window._curtain_.on) window._curtain_.toggle();
localStorage.setItem("menu", this.stashToJson("local"));
this.closePanels(["app"]);
if (Layout.activeLayout) {
let layout = Layout.activeLayout;
layout.elm.classList.remove("pz-set");
layout.elm.style.fontSize = "1em";
Object.assign(layout.elm.style, layout.centerLT({ fontSize: "1em" }));
layout.build(false);
}
}
stash() {
localStorage.setItem("menu", this.stashToJson("local"));
}
center(reset = false) {
this.clearSpinFling();
numb(this.elm, _gs_);
animate(this.elm, null, {
left: innerWidth / 2 + "px",
top: innerHeight / 2 + "px",
}, ` ${_gs_}ms`);
if (this.collapsed) this.collapse();
if (reset) {
this.op.turnOffset = 0;
this.disk.turn = 0;
if (this.op.ring) this.op.ring.turn = 0;
this.disk.turnOffset = 0;
let diskEntries = Object.entries(this.rings);
let ringKnt = diskEntries.length;
animate(this.disk, null, { transform: "rotate(0turn)" }, `${_gs_}ms`);
diskEntries.forEach(([diskKey, ring], index) => {
let rotation = index / ringKnt;
ring.cellElm.style.transform = `rotate(${rotation}turn)`;
ring.cellElm.firstElementChild.style.transform = `rotate(${1 - rotation}turn)`;
let cellEntries = ring.displayCells.map(cell => [cell.key, cell]);
let cellKnt = cellEntries.length;
animate(ring.elm, null, { transform: "rotate(0turn)" }, `${_gs_}ms`);
cellEntries.forEach(([cellKey, cell], index) => {
let rotation = index / cellKnt;
cell.elm.style.transform = `rotate(${rotation}turn)`;
cell.elm.firstElementChild.style.transform = `rotate(${1 - rotation}turn)`;
});
});
}
}
collapse() {
this.op.completed = true;
let holder = this.menuHolder;
holder.style.transition = `all ${_gs_}ms ease-in`;
if (this.collapsed) {
this.collapsed = false;
holder.style.scale = "1";
} else {
holder.style.scale = "0";
this.collapsed = true;
}
schedule(_gs_, () => holder.style.transition = "unset");
}
park() {
if(!this.collapsed) this.collapse() ;
numb(this.elm, _gs_);
animate(this.elm, null, { left: 0, top: 0 }, `all ${_gs_}ms ease-in`);
}
reset() {
this.activateCell(null, this.rings.ink);
this.activateCell(null, this.rings.page);
}
async pgEvent(opts, pg) {
let canvas = pg.canvas;
let addObj = (obj) => {
this.newlyCreated = obj;
canvas.add(obj);
obj.clampToPage();
obj.hasControls = false;
canvas._target = obj;
return obj;
};
if (this.activeRing.key != "ink") return;
let activeCell = this.activeRing.activeCell;
if (!activeCell) return;
let target = opts.target;
let key = activeCell.key ;
if (key == "text" && target?.type == "textbox" && target.isEditing) return target;
if (key == "text" && target?.type == "textbox" && !target.isEditing) {
this.checkEditing();
this.newlyCreated = target;
canvas.setActiveObject(target);
target.enterEditing();
target.hiddenTextarea?.focus();
canvas.renderAll();
return target;
}
if(this.checkEditing()) return;
this.newlyCreated = null;
switch (key) {
case "edit":
if(target && !target.flatten && !target.hasControls) target.hasControls = true;
else if (!target && !canvas.getActiveObject()) {
let editable = canvas.getObjects().filter(o => !o.flatten);
if (editable.length) delay(1, () => canvas.setActiveObject(editable.at(-1)));
}
canvas.requestRenderAll();
return;
case "undo":
return await pg.undo();
case "pencil":
case "pen": {
let { alpha, rgb, width, style } = activeCell.stash;
let color = fabric.Color.fromHex(rgb);
color.setAlpha(alpha);
let rgba = color.toRgba();
let brush;
if (style == "Free") {
brush = new fabric.PodBrush(canvas, key, activeCell.stash);
brush.width = width;
brush.color = rgba;
} else brush = new fabric.LineBrush(canvas, activeCell.stash, rgba, key);
canvas.freeDrawingBrush = brush;
canvas.isDrawingMode = true;
return;
}
case "grid": {
if (pg.grid) pg.grid = pg.grid.destructor();
else pg.grid = new Grid(pg, activeCell.stash, opts);
return;
}
case "rastrum": {
let { alpha, rgb } = activeCell.stash;
let color = fabric.Color.fromHex(rgb);
color.setAlpha(alpha);
let rgba = color.toRgba();
this.newlyCreated = new fabric.RastrumBrush(canvas, activeCell.stash, rgba);
canvas.freeDrawingBrush = this.newlyCreated;
return (canvas.isDrawingMode = true);
}
case "text": {
let { font, size, height, rgb, alpha } = activeCell.stash;
if (globalThis._rostrumPages_) {
try { await globalThis._rostrumPages_.font(font); }
catch (error) { toast(error.message); return; }
}
let color = fabric.Color.fromHex(rgb);
color.setAlpha(alpha);
let rgba = color.toRgba();
let config = {
fill: rgba,
fontSize: size,
lineHeight: height / size,
editable: true,
selectable: true,
cursorColor: "black",
left: opts.absolutePointer.x,
top: opts.absolutePointer.y,
objectCaching: false,
hasControls: false,
rostrumStash: { alpha, font, size, height, rgb },
};
Object.assign(config, fontMap[font]);
let textbox = addObj(new fabric.Textbox("Abc", config));
canvas.setActiveObject(textbox);
textbox.enterEditing();
textbox.hiddenTextarea?.focus();
textbox.selectAll();
canvas.renderAll();
return textbox;
}
case "symbols": {
let { alpha, codePoint, height, rgb, size } = activeCell.stash;
if (!codePoint) { toast("No symbol selected."); return; }
let color = fabric.Color.fromHex(rgb);
color.setAlpha(alpha);
let rgba = color.toRgba();
let config = {
rostrumType: "symbols",
rostrumStash: { alpha, rgb, size },
fill: rgba,
fontSize: size * 5,
editable: false,
selectable: true,
left: opts.absolutePointer.x,
top: opts.absolutePointer.y,
hasControls: false,
};
Object.assign(config, fontMap["Bravura"]);
activeCell.stash.recent = mergeRecent(activeCell.stash.recent || {}, { [codePoint]: _recentInsertPts_ });
return addObj(new fabric.Text(codePoint, config));
}
case "cut":
case "copy": {
let targets = opts.selected || (target ? [target] : []);
if (targets.length == 0) return;
let obj = targets.length == 1 ? targets[0] : new fabric.ActiveSelection(targets, { canvas });
this.cutCopyObject(obj, canvas, activeCell.key == "cut");
return;
}
case "paste": {
if (this.pasteObj) {
this.pasteObj.clone((clone) => {
let {x,y} = opts.absolutePointer;
if(clone.type == "activeSelection") {
clone._objects.forEach(obj => {
obj.set({ left: obj.left+x, top:obj.top+y});
canvas.add(obj);
});
let actSel = new fabric.ActiveSelection(clone._objects, { canvas: canvas, hasControls: false});
canvas.setActiveObject(actSel);
actSel.clampToPage();
canvas._target = this.newlyCreated = actSel;
}
else {
clone.set({ left:x, top: y});
addObj(clone);
canvas.requestRenderAll();
if(clone.type == "image") {
canvas.selection = false;
let onMove = (opt) => {
clone.set({ left: opt.pointer.x, top: opt.pointer.y });
clone.clampToPage();
canvas.requestRenderAll();
};
let onUp = () => {
canvas.selection = true;
canvas.off('mouse:move', onMove);
canvas.off('mouse:up', onUp);
canvas.remove(clone);
delay(1, () => {
canvas.add(clone);
clone.set({ hasControls: true});
});
};
canvas.on('mouse:move', onMove);
canvas.on('mouse:up', onUp);
}
}
}, Pg.customProps);
}
return;
}
}
}
cutCopyObject(obj, canvas, isCut) {
if (this.cutting) return;
this.cutting = true;
obj.clone((clone) => { this.pasteObj = this.newlyCreated = clone; }, Pg.customProps);
this.enableCells("ink/paste", true);
let zoom = canvas.pg.zoom ;
let emWidth = obj.getScaledWidth() * zoom / _pxPerEm_;
let objBox = obj.getBoundingRect();
let canvasBox = getBox(canvas.lowerCanvasEl) ;
let left = canvasBox.left + objBox.left * zoom;
let top  = canvasBox.top  + objBox.top * zoom;
let elm = helm(`<img src=${obj.toDataURL()} style=
"border:1px solid red;width:${emWidth}em;height:auto;z-index:1000;left:${left}px;top:${top}px;position:absolute;"></img>`);
_body_.append(elm);
hide(elm, dataIndex("tag", this.rings.ink.cells.paste.elm).cellIcon);
delayMs(500, () => elm.remove());
if (isCut) {
let members = obj.type === 'activeSelection' ? [...obj._objects] : [obj];
let objs = canvas.getObjects();
let idxArr = members.map(o => objs.indexOf(o)).filter(i => i >= 0);
let idx = idxArr.length > 0 ? Math.min(...idxArr) : 0;
delay(1, () => {
members.forEach(o => canvas.remove(o));
let remaining = canvas.getObjects();
if (remaining.length > 0)
canvas.setActiveObject(remaining[Math.min(idx, remaining.length - 1)]);
else
canvas.discardActiveObject();
this.cutting = false;
canvas.requestRenderAll();
_score_.setDirty(true);
});
} else {
this.cutting = false;
canvas.discardActiveObject();
canvas.requestRenderAll();
}
}
pgUpEvent(opts, pg) {
this.autoOff.run();
_score_.setDirty(true);
if (pg) {
if (this.newlyCreated && this.newlyCreated.rostrumType == "text") {
this.newlyCreated.enterEditing();
this.newlyCreated.selectAll();
}
}
for (let pg of _score_.pgs) if (pg.inflated) pg.canvas.isDrawingMode = false;
}
checkEditing() {
if(this.newlyCreated?.isEditing) {
this.newlyCreated.exitEditing();
this.newlyCreated = null;
return true;
}
return false;
}
setPasteObj(dataUrl, type) {
switch (type) {
case "image/jpeg":
case "image/png": {
fabric.Image.fromURL(
dataUrl,
(img) => {
let { maxWidth, maxHeight } = _score_;
if (img.width > img.height && img.width > maxWidth) img.scaleToWidth(maxWidth);
else if (img.height > maxHeight) img.scaleToHeight(maxHeight);
img.set({ minScaleLimit: 1 / Math.min(img.width, img.height) });
this.pasteObj = img;
this.enableCells("ink/paste", true);
},
{ crossOrigin: "anonymous" }
);
break;
}
default:
throw new Error(`menu.setPasteObj: unsupported media type: ${type}`);
}
}
}
// #inclusion src/music.js minified
const ROSTRUM_SVG_NS = "https://1921music.github.io/rostrum/ns";
const isMusicScore = name => /\.(mscz|mxl|musicxml|xml)$/i.test(name || '');
let musicEnginePromise;
let musicSvgSequence = 0;
async function musicEngine() {
return musicEnginePromise ??= (async () => {
const pages = globalThis._rostrumPages_;
if (pages) {
const [api, { Playback, PlaybackView }, wasmBinary, resources] = await Promise.all([
import(pages.url('mscz.js')), import(pages.url('playback.js')),
pages.bytes('mscz-engine.wasm'), pages.scoreResources(),
]);
const engine = await api.load({ wasmBinary, resources, playbackAssets: {
wasmURL: pages.url('mscz-synth.wasm'), workerURL: pages.url('playback-worker.js'),
}});
return { engine, Playback, PlaybackView };
}
const payload = globalThis._scoreEngineAssets_;
if (!payload) throw new Error('Score engine assets are missing. Build the score engine first.');
const decode = async s => new Uint8Array(await new Response(new Blob([
Uint8Array.from(atob(s), c => c.charCodeAt(0))
]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
const extension = !!globalThis.chrome?.runtime?.id;
let api, Playback, PlaybackView;
if (extension) {
api = await import(new URL('./score-engine/mscz.js', location.href).href);
({ Playback, PlaybackView } = await import(new URL('./score-engine/playback.js', location.href).href));
} else {
const moduleBytes = await decode(payload.module);
let binary = '';
for (let i = 0; i < moduleBytes.length; i += 32768)
binary += String.fromCharCode(...moduleBytes.subarray(i, i + 32768));
api = await import('data:text/javascript;base64,' + btoa(binary));
Playback = api.Playback; PlaybackView = api.PlaybackView;
}
const resources = await Promise.all(payload.resources.map(async r => ({ name: r.name, bytes: await decode(r.data) })));
const engine = await api.load({ wasmBinary: await decode(payload.wasm), resources,
playbackAssets: { wasm: await decode(payload.playback.wasm),
worker: extension ? null : new TextDecoder().decode(await decode(payload.playback.worker)),
workerURL: extension ? new URL('./score-engine/playback-worker.js', location.href).href : null } });
return { engine, Playback, PlaybackView };
})().catch(error => { musicEnginePromise = null; throw error; });
}
class MusicDocument {
static async open(bytes, name) {
const { engine, Playback, PlaybackView } = await musicEngine();
const document = new MusicDocument();
document.native = engine.open(new Uint8Array(bytes), name);
document.name = name;
document.player = new Playback(engine, 'EAS', () => globalThis.document.dispatchEvent(new Event('musicPlayback')));
document.autoScroll = true;
document.view = new PlaybackView(document.player, {
getPages: () => document.owner?.pgs?.map(pg => pg.musicSvg).filter(Boolean) || [],
onSystem: (system, { seeking = false } = {}) => {
if (document.autoScroll || seeking) document.follow(system, seeking);
}
});
try {
document.refresh();
try { document.settings = JSON.parse(document.info.settings || '{}'); } catch { document.settings = {}; }
document.settings = document.settings?.version === 1 ? document.settings : {};
document.originalImages = document.info.images;
document.transpose = 0;
return document;
} catch (error) { document.native.close(); throw error; }
}
follow(system, force) {
this.pendingFollow = { system, force };
if (this.following) return;
this.following = true;
(async () => {
try {
while (this.pendingFollow) {
const next = this.pendingFollow; this.pendingFollow = null;
await this.owner?.followMusic(next.system, next.force);
}
} catch (error) { console.error(error); }
finally { this.following = false; }
})();
}
refresh() { this.info = this.native.rostrumInfo(); this.numPages = this.info.pages.length; this.svgs = new Map(); }
async getPage(pn) {
const doc = this, page = this.info.pages[pn - 1];
if (!page) throw new Error('Score page is out of range');
return {
getViewport: ({ scale }) => ({ width: page.width * scale, height: page.height * scale }),
render({ canvasContext, viewport }) {
let cancelled = false;
const task = { cancel: () => { cancelled = true; } };
task.promise = (async () => {
const image = await doc.pageImage(pn);
if (cancelled) throw new DOMException('Render cancelled', 'AbortError');
canvasContext.fillStyle = '#ffffff';
canvasContext.fillRect(0, 0, viewport.width, viewport.height);
canvasContext.drawImage(image, 0, 0, viewport.width, viewport.height);
})();
return task;
}
};
}
async pageImage(pn) {
if (!this.svgs.has(pn)) this.svgs.set(pn, (async () => {
const element = this.pageSvgElement(pn);
if (globalThis._rostrumPages_) await globalThis._rostrumPages_.fontsIn(element.outerHTML);
let css = this.native.mscz.textFonts?.svgFontCss(element.outerHTML) || '';
for (const [family, resource] of Object.entries(globalThis.fontData || {})) {
if (!element.outerHTML.includes(family)) continue;
const bytes = typeof resource === 'function' ? resource() : resource;
let binary = '';
for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
css += `@font-face{font-family:${JSON.stringify(family)};src:url(data:font/otf;base64,${btoa(binary)})}`;
}
const style = document.createElementNS("http://www.w3.org/2000/svg", 'style');
style.textContent = css; element.prepend(style);
const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(element)], { type: 'image/svg+xml' }));
try {
const image = new Image(); image.src = url; await image.decode(); return image;
} finally { URL.revokeObjectURL(url); }
})());
return this.svgs.get(pn);
}
pageSvgElement(pn) {
const xml = new DOMParser().parseFromString(this.native.pageSvg(pn - 1, { dpi: 72, fonts: 0 }), 'image/svg+xml');
const svg = document.importNode(xml.documentElement, true);
const prefix = `rostrum-page-${musicSvgSequence++}-`;
const ids = new Map([...svg.querySelectorAll('[id]')].map(node => [node.id, prefix + node.id]));
for (const node of [svg, ...svg.querySelectorAll('*')]) {
for (const attr of [...node.attributes]) {
if (attr.name === 'id') attr.value = ids.get(attr.value) || attr.value;
else if (attr.localName === 'href' && attr.value.startsWith('#')) attr.value = '#' + (ids.get(attr.value.slice(1)) || attr.value.slice(1));
else attr.value = attr.value.replace(/url\(#([^)]*)\)/g, (match, id) => ids.has(id) ? `url(#${ids.get(id)})` : match);
}
const family = node.getAttribute('font-family');
const backend = this.native.mscz.textFonts;
if (family && backend && !family.includes(backend.prefix)) node.setAttribute('font-family', backend.family(family));
}
const page = this.info.pages[pn - 1];
svg.dataset.playbackPage = pn - 1;
svg.setAttribute('width', page.width); svg.setAttribute('height', page.height);
return svg;
}
releasePage(pn) { this.svgs.delete(pn); }
nearest(page, x, y) {
const anchors = this.info.anchors.filter(a => a.page === page);
if (!anchors.length) throw new Error('This page has no musical anchor for annotations.');
const staff = anchors.reduce((best, a) => Math.abs(a.y + 2 * a.spY - y) < Math.abs(best.y + 2 * best.spY - y) ? a : best);
return anchors.filter(a => a.staff === staff.staff && a.system === staff.system)
.reduce((best, a) => Math.abs(a.x - x) < Math.abs(best.x - x) ? a : best);
}
anchor(key, staff) { return this.info.anchors.find(a => a.key === key && a.staff === staff); }
async destroy() { this.playbackPanel?.close(); this.view.destroy(); this.player.stop(); await this.player.context?.close(); this.native.close(); this.svgs.clear(); }
}
// #inclusion src/icon.js minified
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
Object.assign(iconPaths, {"Drive":"<svg viewBox=\"0 0 32 32\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n  <path d=\"M16.0019 12.4507L12.541 6.34297C12.6559 6.22598 12.7881 6.14924 12.9203 6.09766C11.8998 6.43355 11.4315 7.57961 11.4315 7.57961L5.10895 18.7345C5.01999 19.0843 4.99528 19.4 5.0064 19.6781H11.9072L16.0019 12.4507Z\" fill=\"#34A853\"/>\n  <path d=\"M16.002 12.4507L20.0967 19.6781H26.9975C27.0086 19.4 26.9839 19.0843 26.8949 18.7345L20.5724 7.57961C20.5724 7.57961 20.1029 6.43355 19.0835 6.09766C19.2145 6.14924 19.3479 6.22598 19.4628 6.34297L16.002 12.4507Z\" fill=\"#FBBC05\"/>\n  <path d=\"M16.0019 12.4514L19.4628 6.34371C19.3479 6.22671 19.2144 6.14997 19.0835 6.09839C18.9327 6.04933 18.7709 6.01662 18.5954 6.00781H18.4125H13.5913H13.4084C13.2342 6.01536 13.0711 6.04807 12.9203 6.09839C12.7894 6.14997 12.6559 6.22671 12.541 6.34371L16.0019 12.4514Z\" fill=\"#188038\"/>\n  <path d=\"M11.9082 19.6782L8.48687 25.7168C8.48687 25.7168 8.3732 25.6614 8.21875 25.5469C8.70434 25.9206 9.17633 25.9998 9.17633 25.9998H22.6134C23.3547 25.9998 23.5092 25.7168 23.5092 25.7168C23.5116 25.7155 23.5129 25.7142 23.5153 25.713L20.0965 19.6782H11.9082Z\" fill=\"#4285F4\"/>\n  <path d=\"M11.9086 19.6782H5.00781C5.04241 20.4985 5.39826 20.9778 5.39826 20.9778L5.65773 21.4281C5.67627 21.4546 5.68739 21.4697 5.68739 21.4697L6.25205 22.461L7.51976 24.6676C7.55683 24.7569 7.60008 24.8386 7.6458 24.9166C7.66309 24.9431 7.67915 24.972 7.69769 24.9972C7.70263 25.0047 7.70757 25.0123 7.71252 25.0198C7.86944 25.2412 8.04489 25.4123 8.22034 25.5469C8.37479 25.6627 8.48847 25.7168 8.48847 25.7168L11.9086 19.6782Z\" fill=\"#1967D2\"/>\n  <path d=\"M20.0967 19.6782H26.9974C26.9628 20.4985 26.607 20.9778 26.607 20.9778L26.3475 21.4281C26.329 21.4546 26.3179 21.4697 26.3179 21.4697L25.7532 22.461L24.4855 24.6676C24.4484 24.7569 24.4052 24.8386 24.3595 24.9166C24.3422 24.9431 24.3261 24.972 24.3076 24.9972C24.3026 25.0047 24.2977 25.0123 24.2927 25.0198C24.1358 25.2412 23.9604 25.4123 23.7849 25.5469C23.6305 25.6627 23.5168 25.7168 23.5168 25.7168L20.0967 19.6782Z\" fill=\"#EA4335\"/>\n  </svg>","Dropbox":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-35.3175 -50 306.085 300\"><defs id=\"defs112\"><style id=\"style110\">.cls-1{fill:#0061ff}</style></defs><path id=\"polygon116\" class=\"cls-1\" d=\"M58.86 75l58.87-37.5L58.86 0 0 37.5z\"/><path id=\"polygon118\" class=\"cls-1\" d=\"M176.59 75l58.86-37.5L176.59 0l-58.86 37.5z\"/><path id=\"polygon120\" class=\"cls-1\" d=\"M117.73 112.5L58.86 75 0 112.5 58.86 150z\"/><path id=\"polygon122\" class=\"cls-1\" d=\"M176.59 150l58.86-37.5L176.59 75l-58.86 37.5z\"/><path id=\"polygon124\" class=\"cls-1\" d=\"M176.59 162.5L117.73 125l-58.87 37.5 58.87 37.5z\"/></svg>","OneDrive":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 5.5 32 20.5\"><g id=\"STYLE_COLOR\"><path d=\"M12.20245,11.19292l.00031-.0011,6.71765,4.02379,4.00293-1.68451.00018.00068A6.4768,6.4768,0,0,1,25.5,13c.14764,0,.29358.0067.43878.01639a10.00075,10.00075,0,0,0-18.041-3.01381C7.932,10.00215,7.9657,10,8,10A7.96073,7.96073,0,0,1,12.20245,11.19292Z\" fill=\"#0364b8\"/><path d=\"M12.20276,11.19182l-.00031.0011A7.96073,7.96073,0,0,0,8,10c-.0343,0-.06805.00215-.10223.00258A7.99676,7.99676,0,0,0,1.43732,22.57277l5.924-2.49292,2.63342-1.10819,5.86353-2.46746,3.06213-1.28859Z\" fill=\"#0078d4\"/><path d=\"M25.93878,13.01639C25.79358,13.0067,25.64764,13,25.5,13a6.4768,6.4768,0,0,0-2.57648.53178l-.00018-.00068-4.00293,1.68451,1.16077.69528L23.88611,18.19l1.66009.99438,5.67633,3.40007a6.5002,6.5002,0,0,0-5.28375-9.56805Z\" fill=\"#1490df\"/><path d=\"M25.5462,19.18437,23.88611,18.19l-3.80493-2.2791-1.16077-.69528L15.85828,16.5042,9.99475,18.97166,7.36133,20.07985l-5.924,2.49292A7.98889,7.98889,0,0,0,8,26H25.5a6.49837,6.49837,0,0,0,5.72253-3.41556Z\" fill=\"#28a8ea\"/></g></svg>","pCloud":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 32 24\">\n   <path fill=\"#16bed1\" d=\"M7.2 21.5h17.1a6.4 6.4 0 0 0 .9-12.7A7.9 7.9 0 0 0 11 5.9a6.2 6.2 0 0 0-3.8 15.6Z\"/>\n   <circle cx=\"16\" cy=\"11.5\" r=\"8.3\" fill=\"#16bed1\" stroke=\"#fff\" stroke-width=\"1.45\"/>\n   <path fill=\"#fff\" d=\"M12.5 17V6.2h4.4c2.8 0 4.6 1.5 4.6 4 0 2.6-1.8 4.1-4.6 4.1h-1.8V17h-2.6Zm2.6-5.1h1.6c1.4 0 2.2-.6 2.2-1.7 0-1-.8-1.6-2.2-1.6h-1.6v3.3Z\"/>\n   </svg>","Rostrum":"<g transform=\"translate(1),scale(0.9,0.9)\">\n   <path  fill=\"#aaa\" stroke=\"currentColor\" stroke-width=\".6\" stroke-linejoin=\"round\"\n   d=\"M4 23v-3h16v3h1.5h-19ZM7 20v-14h10v14M7 12h-2l-3-10h20l-3 10h-2\"/>\n   <text x=\"12\" y=\"15.5\" text-anchor=\"middle\" font-family=\"Georgia, Times New Roman, serif\" font-size=\"9\" font-weight=\"bold\" font-style=\"italic\" fill=\"currentColor\">R</text></g>"});
// #inclusion src/score.js minified
{
let sto = window.setTimeout;
window.cancelPdf = false;
window.setTimeout = function(callback, delay, ...args) {
if(window.cancelPdf) {
window.cancelPdf = false;
throw new Error("PDF save cancelled by user", { cause: "cancelled"});
}
return sto(callback, delay, ...args);
}
}
const FALLBACK_PDF_FONT = "Noto Sans JP";
const winAnsiRanges = [
[0x20, 0x7e], [0xa0, 0xff], [0x152, 0x153], [0x160, 0x161], [0x178, 0x178],
[0x17d, 0x17e], [0x192, 0x192], [0x2c6, 0x2c6], [0x2dc, 0x2dc],
[0x2013, 0x2014], [0x2018, 0x201a], [0x201c, 0x201e], [0x2020, 0x2022],
[0x2026, 0x2026], [0x2030, 0x2030], [0x2039, 0x203a], [0x20ac, 0x20ac],
[0x2122, 0x2122],
];
let fontkitFonts = {};
function fontCanShow(pdfFontName, codePoint) {
if (codePoint == 0x0a || codePoint == 0x0d) return true;
let fontData = window.fontData[pdfFontName];
if (!fontData)
return winAnsiRanges.some(([lo, hi]) => codePoint >= lo && codePoint <= hi);
if (!fontkitFonts[pdfFontName]) {
if (typeof fontData == "function") fontData = fontData();
fontkitFonts[pdfFontName] = window.fontkit.create(fontData);
}
return fontkitFonts[pdfFontName].hasGlyphForCodePoint(codePoint);
}
function resolveTextFont(text, requested) {
let points = [...text].map(c => c.codePointAt(0));
let missingIn = name => points.filter(cp => !fontCanShow(name, cp));
let requestedMissing = missingIn(requested);
if (!requestedMissing.length) return { pdfFontName: requested, missing: [] };
let fallbackMissing = missingIn(FALLBACK_PDF_FONT);
let standard = !window.fontData[requested];
if (standard || fallbackMissing.length < requestedMissing.length)
return { pdfFontName: FALLBACK_PDF_FONT, missing: fallbackMissing };
return { pdfFontName: requested, missing: requestedMissing };
}
function confirmMissingGlyphs(characters) {
let shown = [...characters].map(c =>
c.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")).join(" ");
return new Promise((accept, reject) =>
dialog(
`These characters are not in any font Rostrum carries, so they would be
saved as blanks:<br><br><strong style="font-size:1.4em">${shown}</strong><br><br>
Your annotations are kept either way, so they will still be here when
Rostrum reopens this score. It is the PDF's own text that loses them.
<br><br>Save anyway?`,
{ Save: { svg: "Save" }, Cancel: { svg: "Cancel" } },
(_event, _prop, tag, args) => {
args.close();
if (tag == "Cancel") reject(new Error("Save cancelled.", { cause: "cancelled" }));
else accept();
}
).addEventListener("cancel", () =>
reject(new Error("Save cancelled.", { cause: "cancelled" })), { once: true })
);
}
class Pg {
static customProps = ["flatten", "rostrumType", "rostrumStash", "rostrumAnchor", "rostrumId"];
static paddingColor = "#fff";
static thumbSize = 192;
constructor(score, width, height, json, mozPn = null, background = null) {
this.background = background;
this.canvas = null;
this.isCut = false;
this.bookmark = null;
this.deferred = false;
this.editable = false;
this.elm = null;
this.grid = null;
this.inflated = false;
this.inflatePromise = null;
this.inflateCtrl = null;
this.renderPromise = null;
this.inUse = false;
this.showing = false;
this.score = score;
this.height = height;
this.json = json;
this.mozCanvas = null;
this.mozPn = mozPn;
this.stretch = 1;
this.thumbUrl = null;
this.thumbVersion = 0;
this.tempHolds = 0;
this.suppressStateChange = false;
this.width = width;
this.undoStack = [];
this.zoom = 1;
return this;
}
async ensureDimensions() {
if (this.width != null && this.height != null) return;
const page = await this.score.mozDoc.getPage(this.mozPn);
const { width, height } = page.getViewport({ scale: 1 });
this.width = width;
this.height = height;
}
async renderPdf(canvas, signal = this.inflateCtrl?.signal) {
if(this.score.disposed) throw new DOMException("Score disposed", "AbortError");
if(!this.score.mozDoc) return;
let release = await this.score.renderGate(this);
if(!release) throw new DOMException("Render cancelled", "AbortError");
try {
await this.renderPdfAux(canvas, signal);
} finally {
release();
}
}
async renderPdfAux(canvas, signal) {
if (this.score.music) {
if (this.score.disposed || signal?.aborted) throw new DOMException('Render cancelled', 'AbortError');
const svg = this.score.music.pageSvgElement(this.mozPn);
Object.assign(svg.style, { display: 'block', background: 'white', pointerEvents: 'none', fontSize: '1em',
width: this.width / _pxPerEm_ + 'em', height: this.height / _pxPerEm_ + 'em' });
if (this.musicSvg) this.musicSvg.replaceWith(svg); else canvas.wrapperEl.append(svg);
this.musicSvg = svg;
this.score.music.view.update();
this.rendering = false; this.setZoom(this.zoom);
return;
}
let mozPg = await this.score.mozDoc.getPage(this.mozPn);
if(this.score.disposed || signal?.aborted)
throw new DOMException("Inflation aborted", "AbortError");
let viewport = mozPg.getViewport({ scale: this.score.quality});
let w = viewport.width / this.score.quality;
let h = viewport.height / this.score.quality;
let mozCanvas = helm(`<canvas width="${viewport.width}" height="${viewport.height}"
style="width:${w / _pxPerEm_}em;height:${h / _pxPerEm_}em;font-size:1em"></canvas>`);
if (this.mozCanvas) this.mozCanvas.replaceWith(mozCanvas);
else canvas.wrapperEl.append(mozCanvas);
this.mozCanvas = mozCanvas;
let ctx = mozCanvas.getContext("2d", { willReadFrequently: true });
let renderTask = this.renderTask = mozPg.render({
annotationMode: this.score.music ? 0 : pdfjsLib.AnnotationMode.DISABLE,
canvasContext: ctx,
viewport: viewport,
});
renderTask.onContinue = resume => {
const proceed = () => {
if (signal?.aborted || this.score.disposed) return;
if (!this.showing && this.score.backgroundPaused)
requestAnimationFrame(proceed);
else resume();
};
proceed();
};
try {
await renderTask.promise;
} catch(err) {
if(err?.name == "RenderingCancelledException") throw new DOMException("Render cancelled", "AbortError");
throw err;
} finally {
if(this.renderTask === renderTask) this.renderTask = null;
}
if (this.mozPn == 1 && !this.score.brokenPDFWarned && this.score.unsupportedFeatures?.size > 0) {
let unsupported = window.pdfjsLib.UNSUPPORTED_FEATURES;
let fatal = [unsupported?.font, unsupported?.jbig2, unsupported?.jpeg2000].filter(v => v !== undefined);
if (Array.from(this.score.unsupportedFeatures).some(f => fatal.includes(f))) {
this.score.brokenPDFWarned = true;
dialog("Warning: This PDF uses advanced features (e.g. non-native compression or fonts) that may not be fully supported in a web browser and may not render correctly.", { OK: { svg: "OK" } });
}
}
this.rendering = false;
this.setZoom(this.zoom);
}
async inflate(render = true, nonblocking = true) {
if(this.score.disposed) return this;
if(this.inflatePromise) {
if(nonblocking) {
if(!this.elm) this.setPlaceholder();
if(render) this.inflatePromise.then(() => this.renderIfNeeded());
return this;
}
await this.inflatePromise;
if(this.score.disposed) return this;
}
if (this.inflated) {
if(render) {
let rendered = this.renderIfNeeded();
if(!nonblocking) await rendered;
}
return this;
}
this.inflateCtrl = new AbortController();
if(this.mozPn && nonblocking) {
this.setPlaceholder();
}
let pending = this.inflateAux(render).catch(err => {
if(err.name == 'AbortError') return;
if(nonblocking) console.warn(`Failed to background load/render page ${this.mozPn}:`, err);
else throw err;
}).finally(() => {
if(this.inflatePromise === pending) this.inflatePromise = null;
});
this.inflatePromise = pending;
if(!nonblocking) await pending;
}
setPlaceholder() {
this.deferred = true;
this.canvas = helm(`<div style="text-align:center;color:#eee;background:white;font-family:Bravura"><div style="font-size:5em;"><div></div>`);
this.elm = this.canvas;
this.elm.pg = this;
this.style = this.elm.style;
}
renderIfNeeded() {
if(!this.inflated || !this.mozPn || this.mozCanvas || this.musicSvg) return Promise.resolve();
this.renderPromise ??= this.renderPdf(this.canvas).catch(err => {
if(err.name != 'AbortError') console.warn(`Failed to render page ${this.mozPn}:`, err);
}).finally(() => this.renderPromise = null);
return this.renderPromise;
}
async inflateAux(render) {
let pending = this.inflateTracked(render);
this.score.pendingInflates.add(pending);
try {
return await pending;
} finally {
this.score.pendingInflates.delete(pending);
}
}
async inflateTracked(render) {
let canvas;
let signal = this.inflateCtrl?.signal;
try {
let checkAbort = () => { if(signal?.aborted || this.score.disposed)
throw new DOMException("Inflation aborted","AbortError");}
checkAbort();
if(!this.inUse) {
await new Promise(resolve => delay(1, resolve));
checkAbort();
}
await this.ensureDimensions();
checkAbort();
this.stretch = this.score.details?.pgFit == "Expand" ? Math.min(
this.score.maxWidth / this.width,this.score.maxHeight / this.height) : 1;
let domCanvas = document.createElement("canvas");
canvas = new fabric.Canvas(domCanvas, {
enablePointerEvents: true,
allowTouchScrolling: false,
imageSmoothingEnabled: false,
moveCursor: 'none',
perPixelTargetFind: true,
});
checkAbort();
canvas.setDimensions({
width: this.width,
height: this.height,
});
canvas.setDimensions( {
width: this.width / _pxPerEm_ + "em",
height: this.height / _pxPerEm_ + "em",
}, { cssOnly: true } );
if (this.json) {
if (globalThis._rostrumPages_) await globalThis._rostrumPages_.fontsIn(JSON.stringify(this.json));
await new Promise((resolve, reject) =>
canvas.loadFromJSON(this.json, () => resolve()));
Pg.applyFlatten(canvas);
}
checkAbort();
if (render && this.mozPn) {
await this.renderPdf(canvas);
if(signal?.aborted) {
this.mozCanvas?.remove();
this.musicSvg?.remove();
throw new DOMException("Inflation aborted","AbortError");
}
}
else if (this.background) canvas.setBackgroundColor(this.background);
canvas.requestRenderAll();
this.json = null;
this.elm = canvas.wrapperEl;
this.elm.pg = this;
this.style = this.elm.style;
if(this.deferred) {
["left","right", "top","bottom","position","clipPath"].forEach((style) =>
this.elm.style[style] = this.canvas.style[style]);
this.canvas.replaceWith(this.elm);
this.deferred = false;
}
this.canvas = canvas;
this.canvas.pg = this;
let stateChanged = false;
canvas.on("mouse:down:before", async (opts) => {
opts.e.taken = true ;
if(_menu_.activeRing.key == "ink" && _menu_.activeRing.activeCell)
_menu_.pgEvent(opts, this);
});
canvas.on("mouse:up", opts => {
if(stateChanged) { pushState(); this.score.setDirty(true); }
stateChanged = false;
if (_menu_.activeRing.key == "ink" && _menu_.activeRing.activeCell) _menu_.pgUpEvent(opts, this);
});
let onSelection = opts => {
canvas.perPixelTargetFind = false;
for (let pg of this.score.pgs) {
if (pg !== this && pg.inflated && pg.canvas.getActiveObject()) {
pg.canvas.discardActiveObject();
pg.canvas.requestRenderAll();
}
}
if (_menu_.activeRing.key == "ink" && _menu_.activeRing.activeCell && ["cut","copy","edit"].includes(_menu_.activeRing.activeCell.key))
_menu_.pgEvent(opts, this);
EditPanel.update(this.canvas.getActiveObject()) ;
Panel.load(this.canvas.getActiveObject());
};
canvas.on("selection:created", onSelection);
canvas.on("selection:updated", onSelection);
canvas.on('text:editing:entered', (e) => {
if(e.target && e.target.type == 'textbox') {
fabric.charWidthsCache = {} ;
e.target.initDimensions() ;
e.target.setCoords();
e.target.selectionStart = e.target.selectionStart;
}
});
canvas.on("selection:cleared", () => {
canvas.perPixelTargetFind = true;
EditPanel.update(null) ;
});
if(this.undoStack.length == 0)
this.undoStack.push(canvas.toDatalessObject(Pg.customProps));
let pushState = () => {
let stack = this.undoStack;
stack.push(this.canvas.toDatalessObject(Pg.customProps));
while (stack.length > 10) stack.shift();
_menu_.enableCells("ink/undo");
this.thumbDirty = true;
};
canvas.on("object:added", (opts) => {
if(!this.suppressStateChange)
stateChanged = true;
});
canvas.on("object:removed", (opts) => {
if(!this.suppressStateChange) stateChanged = true;
});
canvas.on("object:modified", (opts) => {
if(!this.suppressStateChange)  stateChanged = true;
});
canvas.on('text:changed', () => {
if (!this.suppressStateChange) this.score.setDirty(true);
});
this.inflated = true;
this.setEditable(this.editable);
this.setZoom(this.zoom);
}
catch(error) {
if(signal?.aborted || this.score.disposed)
throw new DOMException("Inflation aborted", "AbortError");
throw error;
}
finally {
if(canvas && this.canvas !== canvas) canvas.dispose();
}
}
deflate(full = false) {
if(this.inflateCtrl) {
this.inflateCtrl.abort();
this.inflateCtrl = null;
}
this.score.renderUngate(this);
this.inflatePromise = null ;
this.renderTask?.cancel();
if (this.deferred) {
this.elm?.remove();
this.canvas = this.elm = null;
this.deferred = false;
}
if(full) this.clearThumb();
if (this.inflated) {
if(full) this.json = null;
else this.json = this.toJson();
this.canvas.clear();
this.canvas.dispose();
this.elm?.remove();
this.canvas = null;
this.mozCanvas?.remove();
this.mozCanvas = null;
this.musicSvg?.remove(); this.musicSvg = null;
this.score.music?.releasePage(this.mozPn);
this.elm = null;
this.grid = null;
this.inflated = false;
}
return this;
}
clearThumb() {
++this.thumbVersion;
if(this.fabUrl) URL.revokeObjectURL(this.fabUrl);
if(this.pdfUrl) URL.revokeObjectURL(this.pdfUrl);
this.fabUrl = this.pdfUrl = null;
this.thumbElm?.remove();
this.thumbElm = null;
}
async getThumbElm(force = false, isCancelled = () => false) {
if(this.score.disposed || isCancelled()) return null;
if (!this.thumbElm || force || this.thumbDirty) {
this.thumbDirty = true;
let version = ++this.thumbVersion;
let cancelled = () => this.score.disposed || version !== this.thumbVersion || isCancelled();
let deflated = !this.inflated;
++this.tempHolds;
try {
if (deflated) await this.inflate(true, false);
return await this.makeThumbElm(cancelled);
} finally {
--this.tempHolds;
if (deflated) this.tempDeflate();
}
}
return this.thumbElm;
}
tempDeflate() {
if (!this.inUse && !this.magnifierHold && this.tempHolds == 0) this.deflate();
}
async makeThumbElm(cancelled) {
let score = this.score;
if(cancelled() || !this.inflated) return null;
let scale = Pg.thumbSize / Math.max(score.maxWidth, score.maxHeight);
let maxW = score.maxWidth * scale, maxH = score.maxHeight * scale;
let thumbElm = helm(
`<div class="TableLayout__pg" style="width:${maxW / _pxPerEm_}em;height:${maxH / _pxPerEm_}em;"></div>`);
thumbElm.style.backgroundColor = Pg.paddingColor;
if(score.details?.pgFit == "Center")
thumbElm.style.backgroundSize = this.width * 100 / score.maxWidth + "%";
let fabCanvas = this.canvas.toCanvasElement(scale * this.stretch);
let fabBlob = await new Promise(res => fabCanvas.toBlob(res));
if(cancelled() || !fabBlob) return null;
let pdfBlob = null;
if(this.mozCanvas || this.musicSvg) {
let pdfCanvas = helm(`<canvas width="${maxW}" height="${maxH}"></canvas>`);
const ctx = pdfCanvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, maxW, maxH);
const background = this.mozCanvas || await score.music.pageImage(this.mozPn);
if(cancelled()) return null;
ctx.drawImage(background, 0, 0, maxW, maxH);
pdfBlob = await new Promise(res => pdfCanvas.toBlob(res));
if(cancelled() || !pdfBlob) return null;
}
if(this.fabUrl) URL.revokeObjectURL(this.fabUrl);
if(this.pdfUrl) URL.revokeObjectURL(this.pdfUrl);
this.fabUrl = URL.createObjectURL(fabBlob);
this.pdfUrl = pdfBlob ? URL.createObjectURL(pdfBlob) : null;
thumbElm.style.backgroundImage = `url('${this.fabUrl}')` +
(this.pdfUrl ? `, url('${this.pdfUrl}')` : "");
this.thumbElm = thumbElm;
this.thumbDirty = false;
return thumbElm;
}
async clone(inflate = false) {
let theClone = new Pg(this.score, this.width, this.height, this.toJson() || this.json, this.mozPn, null);
if (this.thumbElm) {
theClone.thumbElm = this.thumbElm.cloneNode();
}
if (inflate) await theClone.inflate(true, false);
return theClone;
}
setEditable(bool) {
this.editable = bool;
if (this.inflated) {
this.canvas.upperCanvasEl.style.pointerEvents = bool ? "auto" : "none";
}
}
setZoom(zoom) {
this.zoom = zoom;
if(this.deferred) {
this.canvas.style.width = (this.width ?? this.score.maxWidth) * zoom * this.stretch / _pxPerEm_ + "em";
this.canvas.style.height = (this.height ?? this.score.maxHeight) * zoom * this.stretch / _pxPerEm_ + "em";
this.canvas.style.lineHeight = this.canvas.style.height;
}
else if(this.inflated) {
let emWidth = this.width * zoom  * this.stretch / _pxPerEm_ + "em";
let emHeight = this.height * zoom * this.stretch / _pxPerEm_ + "em";
this.canvas.setDimensions({ width: emWidth, height: emHeight}, { cssOnly: true });
if (this.grid) this.grid.setZoom(zoom);
const background = this.mozCanvas || this.musicSvg;
if (background) {
background.style.width = emWidth;
background.style.height = emHeight;
}
return this.canvas.requestRenderAll();
}
}
toJson() {
if (!this.inflated) return null;
let oldPrecision = fabric.Object.NUM_FRACTION_DIGITS;
fabric.Object.NUM_FRACTION_DIGITS = 2;
let json = this.canvas.toJSON(Pg.customProps);
fabric.Object.NUM_FRACTION_DIGITS = oldPrecision;
return json;
}
async undo( ) {
this.score.setDirty(true);
let stack = this.undoStack;
if (stack.length > 1) {
this.suppressStateChange = true;
stack.pop();
let canvas = this.canvas;
let forgetRemoved = () => {
let gone = (obj) => obj && !canvas.contains(obj);
if (gone(canvas._target)) canvas._target = null;
if (gone(canvas._hoveredTarget)) canvas._hoveredTarget = null;
if (gone(canvas._currentTransform?.target)) canvas._currentTransform = null;
if (gone(canvas._activeObject)) canvas.discardActiveObject();
};
await new Promise((resolve, reject) => canvas.loadFromJSON(stack[stack.length - 1], () => {
forgetRemoved();
resolve();
}));
forgetRemoved();
Pg.applyFlatten(this.canvas);
this.canvas.requestRenderAll();
this.suppressStateChange = false;
}
for(let pg of this.score.pgs) {
if(pg.undoStack?.length > 1)
return;
}
delay(2, () => {
_menu_.enableCells("ink/undo", false);
_menu_.activateCell(null);
});
}
flattenObjects() {
if (!this.canvas) return;
for (let obj of this.canvas.getObjects()) Pg.freeze(obj);
this.canvas.discardActiveObject();
this.canvas.requestRenderAll();
this.score.setDirty(true);
}
static freeze(obj) {
obj.flatten = true;
obj.selectable = false;
obj.evented = false;
obj.hasControls = false;
obj.hasBorders = false;
obj.lockMovementX = true;
obj.lockMovementY = true;
obj.lockScalingX = true;
obj.lockScalingY = true;
obj.lockRotation = true;
obj.lockSkewingX = true;
obj.lockSkewingY = true;
obj.editable = false;
}
static applyFlatten(canvas) {
for (let obj of canvas.getObjects()) if (obj.flatten) Pg.freeze(obj);
}
async toPdf(ink, pLibPg) {
let wasInflated = this.inflated;
++this.tempHolds;
try {
if (!wasInflated) await this.inflate(false, false);
return await this.toPdfAux(ink, pLibPg);
} finally {
--this.tempHolds;
if (!wasInflated) this.tempDeflate();
}
}
async toPdfAux(ink, pLibPg) {
let toPDFColor = (fabricColor) => {
let c = new fabric.Color(fabricColor).toRgba().split("(")[1].split(")")[0].split(",");
return PDFLib.rgb(c[0] / 255, c[1] / 255, c[2] / 255);
};
let toPDFOpacity = (fabricColor) => {
let rgba = new fabric.Color(fabricColor).toRgba();
if (rgba.startsWith("rgb(")) return 1;
let c = rgba.split("(")[1].split(")")[0].split(",");
return parseFloat(c[3]);
};
let PDFName = PDFLib.PDFName;
let context = pLibPg.doc.context;
let rot = ((pLibPg.getRotation().angle % 360) + 360) % 360;
let box = pLibPg.getCropBox();
let xform = {
width: rot % 180 == 90 ? box.height : box.width,
height: rot % 180 == 90 ? box.width : box.height,
rect: [box.x, box.y, box.x + box.width, box.y + box.height],
matrix: rot == 90 ? [0, 1, -1, 0, box.x + box.width, box.y]
: rot == 180 ? [-1, 0, 0, -1, box.x + box.width, box.y + box.height]
: rot == 270 ? [0, -1, 1, 0, box.x, box.y + box.height]
: [1, 0, 0, 1, box.x, box.y],
identity: rot == 0 && box.x == 0 && box.y == 0,
};
let pageHeight = xform.height;
let annots = pLibPg.node.Annots();
if (annots) {
for (let i = annots.size() - 1; i >= 0; i--) {
let ref = annots.get(i);
let annot = context.lookup(ref);
if (annot?.get?.(PDFName.of("Subtype")) === PDFName.of("Stamp")) {
let apN = annot.lookup(PDFName.of("AP"))?.get?.(PDFName.of("N"));
if (apN instanceof PDFLib.PDFRef) context.delete(apN);
if (ref instanceof PDFLib.PDFRef) context.delete(ref);
annots.remove(i);
}
}
}
let processObj = async(obj, absoluteTransform = null) => {
if(absoluteTransform) {
obj = fabric.util.object.clone(obj);
obj.group = null;
obj.set({
left: absoluteTransform.left,
top: absoluteTransform.top,
scaleX : absoluteTransform.scaleX,
scaleY: absoluteTransform.scaleY,
angle: absoluteTransform.angle,
skewX: absoluteTransform.skewX ?? 0,
skewY: absoluteTransform.skewY ?? 0,
flatten: absoluteTransform.flatten });
}
switch (obj.type) {
case "text":
case "textbox": {
let requestedFont = fontUnmap[`${obj.fontFamily}/${obj.fontStyle}/${obj.fontWeight}`];
if (!requestedFont) requestedFont = "Times-Roman";
let drawnText = obj.textLines ? obj.textLines.join("\n") : obj.text;
if (globalThis._rostrumPages_) {
await globalThis._rostrumPages_.font(requestedFont);
if (/[^\x00-\x7f]/.test(drawnText ?? '')) await globalThis._rostrumPages_.font(FALLBACK_PDF_FONT);
}
let { pdfFontName, missing } = resolveTextFont(drawnText ?? "", requestedFont);
for (let codePoint of missing)
this.score.missingGlyphs?.add(String.fromCodePoint(codePoint));
let pdfFont = this.score.embeddedFonts[pdfFontName];
if (!pdfFont) {
let fontData = window.fontData[pdfFontName];
if (typeof fontData == 'function') fontData = fontData();
pdfFont = await pLibPg.doc.embedFont(fontData ?? pdfFontName,
fontData ? { subset: true } : undefined);
this.score.embeddedFonts[pdfFontName] = pdfFont;
}
let drop = obj.fontSize * 0.9 * obj.scaleY;
let angle = (obj.angle / 360) * (Math.PI * 2);
let pp = rotatePoint(obj.left, obj.top + drop, obj.left, obj.top, angle);
await this.objToPdf(obj, ink, pLibPg, pLibPg.drawText, [
drawnText,
{
x: pp.x,
y: pageHeight - pp.y,
font: pdfFont,
rotate: PDFLib.degrees(360 - obj.angle),
size: obj.fontSize * obj.scaleY,
color: toPDFColor(obj.fill),
opacity: toPDFOpacity(obj.fill),
lineHeight: obj.lineHeight * obj.fontSize * (fabric.Text.prototype._fontSizeMult || 1.13) * obj.scaleY,
},
], xform);
break;
}
case "path": {
if (!obj.path || obj.path.length == 0) {
console.warn("Path object has empty path, skipping", obj);
break;
}
let matrix = obj.calcTransformMatrix();
let po = obj.pathOffset || { x: 0, y: 0 };
let pathStr = "";
let last, start;
obj.path.forEach((pathlet) => {
let op = pathlet[0], pts = [];
for (let i = 1; i < pathlet.length; )
pts.push(fabric.util.transformPoint({ x: pathlet[i++] - po.x, y: pathlet[i++] - po.y }, matrix));
if (op == "Q") {
let [c, end] = pts;
let toward = (p, f) => ({ x: p.x + (c.x - p.x) * f, y: p.y + (c.y - p.y) * f });
op = "C";
pts = [toward(last, 2 / 3), toward(end, 2 / 3), end];
}
pathStr += op + pts.map((p) => " " + p.x.toFixed(2) + " " + p.y.toFixed(2)).join("") + " ";
if (op == "M") start = pts[0];
last = op == "Z" ? start : pts[pts.length - 1];
});
if(obj.fill) {
await this.objToPdf(obj, ink, pLibPg, pLibPg.drawSvgPath, [
pathStr,
{ y: pageHeight,
color: toPDFColor(obj.fill),
opacity: toPDFOpacity(obj.fill),
},
], xform);
}
else await this.objToPdf(obj, ink, pLibPg, pLibPg.drawSvgPath, [
pathStr,
{ y: pageHeight,
borderWidth: obj.strokeWidth * (Math.abs(obj.scaleX) + Math.abs(obj.scaleY)) / 2,
borderColor: toPDFColor(obj.stroke),
borderOpacity: toPDFOpacity(obj.stroke),
borderLineCap: PDFLib.LineCapStyle.Round,
},
], xform);
break;
}
case "image": {
let src = obj.src ?? (obj.getSrc && obj.getSrc());
let binary = atob(src.split(",")[1]);
let bytes = new Uint8Array(binary.length);
for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
let image = src.startsWith("data:image/jpeg;") ? await pLibPg.doc.embedJpg(bytes) :
src.startsWith("data:image/png;") ? await pLibPg.doc.embedPng(bytes): null;
if(!image) throw new Error("Unknown image type in data url:" + src.substring(20) + "...");
let bl = fabric.util.transformPoint({ x: -obj.width / 2, y: obj.height / 2 }, obj.calcTransformMatrix());
await this.objToPdf(obj, ink, pLibPg, pLibPg.drawImage, [
image,
{ x: bl.x,
y: pageHeight - bl.y,
rotate: PDFLib.degrees(360 - obj.angle),
height: obj.height * obj.scaleY,
width: obj.width * obj.scaleX,
},
], xform);
break;
}
case "group": {
let groupMatrix = obj.calcOwnMatrix();
for (let groupObj of obj._objects) {
if (groupObj.type === 'group') {
let clonedGroup = fabric.util.object.clone(groupObj);
fabric.util.addTransformToObject(clonedGroup, groupMatrix);
clonedGroup.flatten = obj.flatten;
await processObj(clonedGroup, null);
} else {
let tmpObj = fabric.util.object.clone(groupObj);
fabric.util.addTransformToObject(tmpObj, groupMatrix);
await processObj(groupObj, {
left: tmpObj.left,
top: tmpObj.top,
scaleX: tmpObj.scaleX,
scaleY: tmpObj.scaleY,
angle: tmpObj.angle,
skewX: tmpObj.skewX,
skewY: tmpObj.skewY,
flatten: obj.flatten,
});
}
}
break;
}
default: {
console.warn("Unsupported fabric obj:", obj.type);
}
}
};
this.canvas.discardActiveObject();
this.canvas.requestRenderAll();
for (let obj of this.canvas.getObjects()) {
await processObj(obj);
}
let json = this.toJson();
json.objects = ink == "pdf" ? [] : json.objects.filter((obj) => !obj.flatten);
json.bookmark = this.bookmark;
return json;
}
async objToPdf(obj, ink, pLibPg, func, funcArgs, xform) {
let pLibDoc = pLibPg.doc;
let context = pLibDoc.context;
let PDFName = PDFLib.PDFName;
if (ink == "none") return;
if (ink == "pdf" || obj.flatten) {
if (xform.identity) func.apply(pLibPg, funcArgs);
else {
pLibPg.pushOperators(PDFLib.pushGraphicsState(), PDFLib.concatTransformationMatrix(...xform.matrix));
func.apply(pLibPg, funcArgs);
pLibPg.pushOperators(PDFLib.popGraphicsState());
}
return;
}
let tmpPage = pLibDoc.addPage([xform.width, xform.height]);
try {
func.apply(tmpPage, funcArgs);
let content = tmpPage.contentStream.clone();
let stamp = new PDFLib.PDFAnnotation(
context.obj({
Type: "Annot",
Subtype: "Stamp",
Rect: xform.rect,
F: 4,
})
);
content.dict.context = context;
content.dict.set(PDFName.of("Type"), PDFName.of("XObject"));
content.dict.set(PDFName.of("Subtype"), PDFName.of("Form"));
content.dict.set(PDFName.of("BBox"), context.obj([0, 0, xform.width, xform.height]));
if (!xform.identity) content.dict.set(PDFName.of("Matrix"), context.obj(xform.matrix));
content.dict.set(PDFName.of("Resources"), tmpPage.node.dict.get(PDFName.of("Resources")));
stamp.setNormalAppearance(context.register(content));
let stampRef = context.register(stamp.dict);
if (pLibPg.node.has(PDFName.Annots) && pLibPg.node.Annots()) pLibPg.node.Annots().push(stampRef);
else pLibPg.node.set(PDFName.Annots, context.obj([stampRef]));
} finally {
pLibDoc.removePage(pLibDoc.getPageCount() - 1);
if (tmpPage.contentStreamRef) context.delete(tmpPage.contentStreamRef);
context.delete(tmpPage.ref);
}
}
}
class Score {
static activeScore = null;
static pdfWorker = null;
static MAX_INFLATED = (navigator.deviceMemory >= 8) ? 8 : 6;
static MAX_UNDO = (navigator.deviceMemory >= 8) ? 8 : 6;
static sources = Object.freeze({
local: "Local",
gdrive: "Drive",
dbx: "Dropbox",
odrive: "OneDrive",
pcloud: "pCloud",
url: "WWW",
});
static async newScore(pgKnt, width, height, color) {
let score = new Score();
for (let i = 1; i <= pgKnt; i++) {
let pg = new Pg(score, width, height, null, null, color);
await score.pgAdd(pg, i, false);
}
await score.init(null, null, `Opus ${Math.floor(Math.random() * 100) + 1}.pdf`);
score.setDirty(false);
return score;
}
static visit(score, updates = null, path = null) {
let recent = JSON.parse(localStorage.getItem("recent") || "[]");
if (path) {
for (let i = 0; i < recent.length; i++) {
let entry = recent[i];
if (entry.source == score.source && entry.path == score.path) entry.path = path;
}
localStorage.setItem("recent", JSON.stringify(recent));
return;
}
let prev;
for (let i = 0; i < recent.length; i++) {
let entry = recent[i];
if (entry.source == score.source && (
(entry.path == score.path && (entry.name == score.name || (score.source === Score.sources.local && score.path))) ||
(score.source === Score.sources.local && score.path && !entry.path && entry.name == score.name))) {
prev = recent.splice(i, 1)[0];
break;
}
}
if (updates) {
recent.unshift({
name: score.name,
source: score.source,
path: score.path,
size: updates.size || prev?.size || "?",
created: "created" in updates ? updates.created : prev?.size || "?",
modified: "modified" in updates ? updates.modified : prev?.modified || "?",
});
}
if(recent.length > 20) recent.length = 20;
localStorage.setItem("recent", JSON.stringify(recent));
}
name = null;
path = null;
source = null;
size = null;
now = Date.now();
created = this.now;
modified = this.now;
pdfInfo = null;
encrypted = false;
permissions = null;
embeddedFonts = null;
missingGlyphs = null;
maxHeight = -1;
maxWidth = -1;
pgs = [];
undoStack = [];
mozDoc = null;
loadingTask = null;
disposed = false;
disposePromise = null;
pendingExports = new Set();
pendingInflates = new Set();
quality = 2;
dirty = false;
numbers = null ;
details = null ;
layout = null ;
_unsupportedFeatures = null;
_brokenPDFWarned = false;
constructor() {
}
async init(source, path, name, pdfData=null, activate=true, libraryState=null) {
const view = activate ? window._viewState_ : null;
await view?.beginLoad();
try {
return await this.initAux(source, path, name, pdfData, activate, libraryState);
} catch(error) {
await this.dispose();
view?.apply();
throw error;
} finally {
view?.endLoad();
}
}
async initAux(source, path, name, pdfData, activate, libraryState) {
Object.assign(this, { source, path, name });
const lazyPdf = pdfData instanceof Blob && libraryState;
this.quality = 2;
this.undoStack = [];
this.maxUndo = 10;
if (activate)
for (let c of Object.values(_menu_.rings.layout.cells)) c.stash.pz = null;
if (pdfData && isMusicScore(name)) {
this.size = pdfData.byteLength;
this.music = this.mozDoc = await MusicDocument.open(pdfData, name);
this.music.owner = this;
if (libraryState?.settings?.music) this.music.settings = libraryState.settings.music;
if (activate) {
const defaults = JSON.parse(_menu_.stashDefaults);
Object.assign(_menu_.rings.page.cells.numbers.stash, defaults.page?.cells?.numbers);
Object.assign(_menu_.rings.score.cells.details.stash, defaults.score?.cells?.details);
}
await this.initMusic(activate);
} else if (pdfData) {
this.size = pdfData.size ?? pdfData.byteLength;
if (globalThis._rostrumPages_) await globalThis._rostrumPages_.pdfReader();
else if (!window.pdfjsLib) {
let pdfUrl = URL.createObjectURL(await inflate(mozSrc));
mozSrc = null;
window.pdfjsLib = await import(pdfUrl);
URL.revokeObjectURL(pdfUrl);
const workerScript = await inflate(mozWorkerSrc);
const localFile = location.protocol === 'file:';
let mozWorkerUrl = localFile
? await bytesToBase64DataUrl(await workerScript.arrayBuffer(), 'application/javascript')
: URL.createObjectURL(workerScript);
let mozWorker = new Worker(mozWorkerUrl, { type: "module" });
let revokeListeners = listen(mozWorker, ["message", "error"], () => {
if (!localFile) URL.revokeObjectURL(mozWorkerUrl);
unlisten(revokeListeners);
});
window.pdfjsLib.GlobalWorkerOptions.workerPort = mozWorker;
mozWorkerSrc = null;
}
Score.pdfWorker ||= window.pdfjsLib.PDFWorker.fromPort({
port: window.pdfjsLib.GlobalWorkerOptions.workerPort,
});
let loadingTask;
let readFailure;
let input = { data: pdfData };
if (lazyPdf) {
let rejectRead;
readFailure = new Promise((resolve,reject) => { rejectRead = reject; });
const range = new class extends window.pdfjsLib.PDFDataRangeTransport {
constructor() { super(pdfData.size, new Uint8Array(), true); }
requestDataRange(begin, end) {
pdfData.slice(begin,end).arrayBuffer().then(bytes => {
if (!this.aborted) this.onDataRange(begin,new Uint8Array(bytes));
}).catch(error => {
if (this.aborted) return;
rejectRead(error);
loadingTask.destroy().catch(() => {});
});
}
abort() { this.aborted = true; }
}();
input = { range, length:pdfData.size, disableAutoFetch:true, disableStream:true };
}
this.loadingTask = loadingTask = window.pdfjsLib.getDocument({ ...input, worker: Score.pdfWorker });
loadingTask.onUnsupportedFeature = (featureId) => {
if (!this.unsupportedFeatures) this.unsupportedFeatures = new Set();
this.unsupportedFeatures.add(featureId);
};
loadingTask.onPassword = async (callback, reason) => {
let password = await new Promise(resolve => {
let msg = reason == 1
? "Incorrect password. Please try again.<br><br><input type='password' style='width:100%' placeholder='Password'>"
: "This PDF is password-protected.<br><br><input type='password' style='width:100%' placeholder='Password'>";
let dlg = dialog(msg, { Open: { svg: "Open" }, Cancel: { svg: "Cancel" } }, (e, prop, tag, args) => {
let pw = args.elm.querySelector('input').value;
args.close();
resolve(tag == "Open" && pw ? pw : "");
});
listen(dlg, 'cancel', () => resolve(""));
setTimeout(() => dlg.querySelector('input')?.focus(), 50);
});
if (password) { callback(password); return; }
loadingTask.destroy();
};
this.mozDoc = await (readFailure ? Promise.race([loadingTask.promise,readFailure]) : loadingTask.promise);
if (this.mozDoc.numPages == 0) {
toast("This PDF has no pages.");
let err = new Error("PDF has no pages");
err.handled = true;
throw err;
}
let meta = await this.mozDoc.getMetadata();
this.pdfInfo = meta ? meta.info : null;
let perms = await this.mozDoc.getPermissions();
this.permissions = perms;
if (perms) {
this.encrypted = true;
if (!perms.includes(8) || !perms.includes(32))
dialog("This PDF restricts modifications — saving annotations or other changes may not be possible.", { OK: { svg: "OK" } });
}
let scoreJson = null;
let rostrumAttachment = (await this.mozDoc.getAttachments())?.rostrum;
if (rostrumAttachment) {
scoreJson = JSON.parse(new TextDecoder().decode(rostrumAttachment.content));
this.created = scoreJson.created || this.created;
this.modified = scoreJson.modified || this.modified;
this.quality = scoreJson.quality ?? this.quality;
if(activate)
_menu_.stashFromJsonObj(scoreJson.menu, "score");
} else if(activate) {
let defaults = JSON.parse(_menu_.stashDefaults);
let { page, score } = _menu_.rings;
Object.assign(page.cells.numbers.stash, defaults.page?.cells?.numbers);
Object.assign(score.cells.details.stash, defaults.score?.cells?.details);
this.quality = score.cells.details.stash.quality ?? this.quality;
}
if (lazyPdf) {
this.maxWidth = libraryState.settings.maxWidth;
this.maxHeight = libraryState.settings.maxHeight;
if (!(this.maxWidth > 0 && this.maxHeight > 0)) throw new Error('PDF maximum dimensions are missing. Reimport this score.');
}
for (let i = 1; i <= this.mozDoc.numPages; i++) {
let width = null, height = null;
if (!lazyPdf) {
const mozPage = await this.mozDoc.getPage(i);
({ width, height } = mozPage.getViewport({ scale: 1 }));
}
let pgJson = scoreJson?.pages ? scoreJson.pages[i]:null;
this.pgs.push(new Pg(this, width, height, pgJson, i));
if(pgJson?.bookmark)
this.pgs[this.pgs.length -1].bookmark =
typeof pgJson.bookmark == "string" && CSS.supports("color", pgJson.bookmark)
? pgJson.bookmark : "#ff0000";
if (!lazyPdf) {
this.maxWidth = Math.max(width, this.maxWidth);
this.maxHeight = Math.max(height, this.maxHeight);
}
}
}
else if(activate) {
let defaults = JSON.parse(_menu_.stashDefaults);
Object.assign(_menu_.rings.page.cells.numbers.stash, defaults.page?.cells?.numbers);
Object.assign(_menu_.rings.score.cells.details.stash, defaults.score?.cells?.details);
this.quality = _menu_.rings.score.cells.details.stash.quality ?? this.quality;
}
if (libraryState) await this.restoreLibraryState(libraryState, activate);
if (activate) await this.goToLibraryAnchor(libraryState?.anchor);
if(activate) await this.activate();
return this;
}
async goToLibraryAnchor(anchor) {
if (!anchor || !Number.isInteger(anchor.pageIndex)) return;
const index = anchor.type === 'pdf' ? this.pgs.findIndex(pg => pg.mozPn === anchor.pageIndex + 1) : anchor.pageIndex;
if (index < 0 || index >= this.pgs.length) throw new Error('The indexed page is not present in this score view');
if (Layout.activeLayout?.score === this) await Layout.activeLayout.pgGoTo(index + 1,false);
else _menu_.rings.page.cells.numbers.stash.pn = index + 1;
}
dispose() {
if(this.disposePromise) return this.disposePromise;
this.disposePromise = this.disposeAux().catch(error => {
this.disposePromise = null;
throw error;
});
return this.disposePromise;
}
async initMusic(activate = true) {
const records = [];
for (const image of this.music.originalImages) {
const xml = new DOMParser().parseFromString(image.svg, 'image/svg+xml');
const metadata = xml.getElementsByTagNameNS(ROSTRUM_SVG_NS, 'annotation')[0];
if (!metadata) throw new Error('Unsupported Rostrum annotation; original file remains unchanged.');
const data = JSON.parse(metadata.textContent);
if (data.version !== 1 || !data.object || !data.bounds) throw new Error('Unsupported annotation version.');
const a = this.music.anchor(image.key, image.staff) || this.music.nearest(image.page, image.x, image.y);
const scale = image.width / data.bounds.width;
data.object.rostrumId = crypto.randomUUID();
records.push({ ...data, key: a.key, staff: a.staff, sp: a.sp / scale,
spY: a.spY / (image.height / data.bounds.height),
dx: (image.x - a.x) / a.sp, dy: (image.y - a.y) / a.spY });
}
const settings = this.music.settings;
if (activate && settings.menu) _menu_.stashFromJsonObj(settings.menu, 'score');
this.music.bookmarks = Array.isArray(settings.bookmarks) ? settings.bookmarks.filter(b =>
typeof b.key === 'string' && Number.isInteger(b.staff) && typeof b.color === 'string' && CSS.supports('color', b.color)) : [];
if (activate) this.quality = _menu_.rings.score.cells.details.stash.quality ?? this.quality;
if (Number.isInteger(settings.transpose) && settings.transpose >= -12 && settings.transpose <= 12) {
this.music.native.setViewTransposeSemitones(settings.transpose, settings.spelling === 'preserve' ? 'preserve' : 'readable', settings.preserveSystemBreaks !== false);
this.music.transpose = settings.transpose;
this.music.refresh();
}
await this.buildMusicPages(records);
if (this.music.info.anchors.length) {
const player = this.music.player;
player.setScore(this.music.native);
if (Number.isFinite(settings.volume)) player.setVolume(settings.volume);
if (Array.isArray(settings.mixer)) settings.mixer.slice(0, player.mixer.length).forEach((m, i) => {
if (Number.isInteger(m.volume) && m.volume >= 0 && m.volume <= 127 && Number.isInteger(m.pan) && m.pan >= 0 && m.pan <= 127)
player.setMixer(i, { volume: m.volume, pan: m.pan, mute: !!m.mute, solo: !!m.solo });
});
}
}
musicStartPosition(top = 0) {
const systems = this.music.player.timeline?.visual?.systems || [];
const pages = [...this.pgs].sort((a,b) => Number(this.pnOf(b)===Number(this.numbers.pn))-Number(this.pnOf(a)===Number(this.numbers.pn)));
for (const pg of pages) {
let fallback = null;
if (!pg.musicSvg?.isConnected) continue;
const rect=pg.musicSvg.getBoundingClientRect();
if (rect.right<=0 || rect.left>=innerWidth || rect.bottom<=top || rect.top>=innerHeight) continue;
const seen=new Set();
for (const system of systems.filter(s=>s.page===pg.mozPn-1)) {
if(seen.has(system.id)) continue; seen.add(system.id);
const y=rect.top+system.bounds[1]*rect.height, bottom=y+system.bounds[3]*rect.height;
if(bottom<=top || y>=innerHeight) continue;
const anchors=system.anchors || [];
let time=system.start;
const left=(Math.max(0,rect.left)+8-rect.left)/rect.width;
for(let i=0;i<anchors.length;i++) {
if(anchors[i][1]>=left) {
const a=anchors[Math.max(0,i-1)], b=anchors[i];
time=b[1]>a[1] && a[1]<left ? a[0]+(b[0]-a[0])*(left-a[1])/(b[1]-a[1]) : b[0];
break;
}
}
if(y>=top && y<innerHeight-24) return time;
if(fallback==null) fallback=time;
}
if(fallback!=null) return fallback;
}
return systems.find(s=>s.page===Number(this.numbers.pn)-1)?.start ?? 0;
}
async followMusic(system, force = false) {
const music = this.music, layout = Layout.activeLayout;
const serial = this.musicFollowSerial = (this.musicFollowSerial || 0) + 1;
if ((!music?.autoScroll && !force) || this !== _score_ || layout?.score !== this) return;
const pn = system.page + 1;
let pg = this.pgs.find(pg => pg.mozPn === pn);
if (!pg) return;
const pageNumber = this.pnOf(pg);
const visible = pg.musicSvg?.isConnected && pg.musicSvg.getBoundingClientRect();
if (Number(this.numbers.pn) !== pageNumber || !visible || visible.right < 24 || visible.left > innerWidth - 24 || visible.bottom < 24 || visible.top > innerHeight - 24)
await layout.pgGoTo(pageNumber, false);
if (this.disposed || layout !== Layout.activeLayout || serial !== this.musicFollowSerial || (music.player.state !== 'playing' && !(force && music.player.canSeek)) || (!music.autoScroll && !force)) return;
const rect = pg.musicSvg?.getBoundingClientRect();
if (!rect?.width || !rect.height) return;
const [x, y, w, h] = system.bounds;
const safeTop = Math.max(24, (music.playbackPanel?.elm.getBoundingClientRect().bottom || 0) + 8);
const top = rect.top + y * rect.height, bottom = top + h * rect.height;
const left = rect.left + x * rect.width, right = left + w * rect.width;
const dy = top < safeTop || bottom > innerHeight - 24 ? safeTop - top : 0;
const dx = left < 24 || right > innerWidth - 24 ? 24 - left : 0;
if (dy) layout.elm.style.top = layout.elm.offsetTop + dy + 'px';
if (dx) layout.elm.style.left = layout.elm.offsetLeft + dx + 'px';
}
async buildMusicPages(records) {
const pages = this.music.info.pages;
this.pgs = pages.map((p, i) => new Pg(this, p.width, p.height, { objects: [] }, i + 1));
for (const bookmark of this.music.bookmarks || []) {
const a = this.music.anchor(bookmark.key, bookmark.staff);
if (a) this.pgs[a.page].bookmark = bookmark.color;
}
for (const r of records) {
const a = this.music.anchor(r.key, r.staff);
if (!a) throw new Error('An annotation anchor is missing; annotations were not discarded.');
const objects = await new Promise(resolve => fabric.util.enlivenObjects([r.object], resolve));
const obj = objects[0];
if (!obj) throw new Error('Could not restore an annotation.');
const sx = a.sp / r.sp, sy = a.spY / (r.spY ?? r.sp);
const matrix = fabric.util.multiplyTransformMatrices([sx, 0, 0, sy,
a.x + r.dx * a.sp - r.bounds.left * sx, a.y + r.dy * a.spY - r.bounds.top * sy], obj.calcTransformMatrix());
const transform = fabric.util.qrDecompose(matrix);
obj.set({ flipX: false, flipY: false, scaleX: transform.scaleX, scaleY: transform.scaleY,
angle: transform.angle, skewX: transform.skewX, skewY: 0, rostrumAnchor: { key: a.key, staff: a.staff } });
obj.setPositionByOrigin({ x: transform.translateX, y: transform.translateY }, 'center', 'center');
this.pgs[a.page].json.objects.push(obj.toObject(Pg.customProps));
}
this.pgRefresh();
}
async musicRecords({ preserveSelection = false } = {}) {
const records = [];
this.music.bookmarks = this.pgs.flatMap((pg, page) => {
const a = pg.bookmark && this.music.info.anchors.find(a => a.page === page);
return a ? [{ key: a.key, staff: a.staff, color: pg.bookmark }] : [];
});
for (let page = 0; page < this.pgs.length; ++page) {
const pg = this.pgs[page];
const inflated = pg.inflated;
++pg.tempHolds;
try {
await pg.inflate(false, false);
if (!preserveSelection) pg.canvas.discardActiveObject();
for (const obj of pg.canvas.getObjects()) obj.rostrumId ||= crypto.randomUUID();
const objects = preserveSelection
? await new Promise(resolve => fabric.util.enlivenObjects(pg.toJson().objects, resolve))
: pg.canvas.getObjects();
for (const obj of objects) {
const bounds = obj.getBoundingRect(true, true);
const previous = obj.rostrumAnchor && this.music.anchor(obj.rostrumAnchor.key, obj.rostrumAnchor.staff);
const a = previous?.page === page ? previous : this.music.nearest(page, bounds.left, bounds.top);
obj.rostrumAnchor = { key: a.key, staff: a.staff };
obj.rostrumId ||= crypto.randomUUID();
records.push({ version: 1, id: obj.rostrumId, object: obj.toObject(Pg.customProps), bounds,
sp: a.sp, spY: a.spY, key: a.key, staff: a.staff,
dx: (bounds.left - a.x) / a.sp, dy: (bounds.top - a.y) / a.spY,
drawing: obj.toSVG() });
}
} finally {
--pg.tempHolds;
if (!inflated) pg.tempDeflate();
}
}
return records;
}
async transposeMusic(semitones, spelling = this.music.native.viewTransposeSpelling,
preserveSystemBreaks = this.music.native.viewPreserveSystemBreaks) {
if (this.musicBusy) return;
this.musicBusy = true;
const music = this.music;
try {
const records = await this.musicRecords();
music.player.stop();
music.native.setViewTransposeSemitones(semitones, spelling, preserveSystemBreaks);
music.transpose = semitones;
music.refresh();
Layout.activeLayout?.destructor(); Layout.activeLayout = null;
for (const pg of this.pgs) pg.deflate(true);
await this.buildMusicPages(records);
music.player.setScore(music.native, true);
await Layout.open(_menu_.rings.layout.cells[_menu_.rings.layout.stash.active || 'book']);
this.setDirty();
} finally { this.musicBusy = false; document.dispatchEvent(new Event('musicPlayback')); }
}
get saveName() { return this.music ? this.name.replace(/\.(mscz|mxl|musicxml|xml)$/i, '') + '.mscz' : this.name; }
async toFile() {
if (!this.music) return this.toPdf();
if (this.disposePromise) throw new Error('Cannot save a disposed score');
if (this.musicBusy) throw new Error('Wait for transposition to finish before saving.');
const pending = this.toMusicFile();
this.pendingExports.add(pending);
try { return await pending; } finally { this.pendingExports.delete(pending); }
}
async toMusicFile() {
const records = await this.musicRecords();
const annotations = records.map(r => {
const xml = document.implementation.createDocument("http://www.w3.org/2000/svg", 'svg');
const svg = xml.documentElement;
svg.setAttributeNS("http://www.w3.org/2000/xmlns/", 'xmlns:xlink', "http://www.w3.org/1999/xlink");
svg.setAttribute('viewBox', `${r.bounds.left} ${r.bounds.top} ${r.bounds.width} ${r.bounds.height}`);
svg.setAttribute('width', r.bounds.width); svg.setAttribute('height', r.bounds.height);
const metadata = xml.createElementNS("http://www.w3.org/2000/svg", 'metadata');
const annotation = xml.createElementNS(ROSTRUM_SVG_NS, 'rostrum:annotation');
const { drawing, ...data } = r;
annotation.textContent = JSON.stringify(data);
metadata.append(annotation); svg.append(metadata);
const drawingDoc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${drawing}</svg>`, 'image/svg+xml');
if (drawingDoc.querySelector('parsererror')) throw new Error('Could not serialize an annotation as SVG.');
for (const node of [...drawingDoc.documentElement.childNodes]) svg.append(xml.importNode(node, true));
return { key: r.key, staff: r.staff, dx: r.dx, dy: r.dy,
width: r.bounds.width / r.sp, height: r.bounds.height / (r.spY ?? r.sp),
svg: new XMLSerializer().serializeToString(xml) };
});
if (this === _score_) Layout.activeLayout?.capturePz();
return this.music.native.saveRostrum({ annotations, settings: JSON.stringify({ version: 1,
transpose: this.music.transpose, spelling: this.music.native.viewTransposeSpelling,
preserveSystemBreaks: this.music.native.viewPreserveSystemBreaks,
volume: this.music.player.volume, mixer: this.music.player.mixer,
bookmarks: this.music.bookmarks,
menu: _menu_.stashToJsonObj('score') }) });
}
async disposeAux() {
if (this.libraryDocumentId && !this.libraryRestoring) await window._bookshelf_.flush(this);
await Promise.allSettled([...this.pendingExports]);
this.disposed = true;
if(Layout.activeLayout?.score === this) {
Layout.activeLayout.destructor();
Layout.activeLayout = null;
}
if(Score.activeScore === this) Score.activeScore = null;
if(_score_ === this) _score_ = null;
let paste = _menu_.rings.page.cells.paste;
if(paste.pg?.score === this) paste.pg = null;
let pages = new Set([...this.pgs, ...this.undoStack]);
for(let pg of pages) pg.deflate(true);
await Promise.allSettled([...this.pendingInflates]);
for(let pg of pages) pg.clearThumb();
try {
if(this.mozDoc) await this.mozDoc.destroy();
else if(this.loadingTask) await this.loadingTask.destroy();
} finally {
this.mozDoc = this.loadingTask = null;
this.pgs = [];
this.undoStack = [];
}
}
async activate() {
const view = window._viewState_;
await view?.ready;
if (view) view.loading++;
try {
if(this.disposePromise) throw new Error("Cannot activate a disposed score");
if(Score.activeScore && Score.activeScore !== this)
await Score.activeScore.dispose();
Score.activeScore = this;
_score_ = this;
view?.apply(this);
this.numbers = _menu_.rings.page.cells.numbers.stash;
this.details = _menu_.rings.score.cells.details.stash;
this.setTitle();
_menu_.enableCells(["ink", "page", "layout", "score/save", "score/close", "score/details", "score/print"]);
_menu_.enableCells("ink/undo", false);
_menu_.closePanels();
document.dispatchEvent(new CustomEvent("scoreOpened"));
_menu_.enableCells("page/undo", this.undoStack.length > 0);
_menu_.rings.page.cells.paste.pg = null ;
_menu_.enableCells("page/paste", false);
this.updateMusicMenu();
this.pgRefresh();
_menu_.rings.score.cells.details.stash.quality = this.quality;
panels.DetailsPanel.get(_menu_.rings.score.cells.details).refresh();
_menu_.reset();
_menu_.activateRing(_menu_.rings.layout);
let layoutKey = _menu_.rings.layout.stash.active || "book" ;
let cell = _menu_.rings.layout.cells[layoutKey];
_menu_.activateCell(cell);
_menu_.activateRing(_menu_.rings.score) ;
await Layout.open(cell);
view?.restoreMenu();
return this;
} finally { view?.endLoad(); }
}
updateMusicMenu() {
const menu = _menu_;
menu.enableCells(['score/transpose', 'score/playback'], !!this.music);
menu.enableCells(['page/copy', 'page/merge', 'page/add', 'page/import', 'page/flatten'], !this.music);
if (this.music) menu.enableCells(['page/cut', 'page/paste', 'page/undo'], false);
}
async bindScore(pdfData, pn = null) {
if (globalThis._rostrumPages_) await globalThis._rostrumPages_.pdfWriter();
pn = clamp(pn, 1, this.pgs.length + 1) -1;
let { PDFArray, PDFDict, PDFDocument, PDFName, PDFStream } = PDFLib;
let pgCount = this.pgs.length;
let docA = await this.toPdf("stamp", true);
let docB = await PDFDocument.load(pdfData);
let copiedPages = await docA.copyPages(docB, docB.getPageIndices());
copiedPages.forEach((page,idx) => docA.insertPage(pn + idx, page));
let mergedPdfData = await docA.save();
let mergedScore = await new Score().init(this.source, this.path, this.name, mergedPdfData, false);
let json = null;
do {
if (!docB.catalog.has(PDFName.of("Names"))) break;
let Names = docB.catalog.lookup(PDFName.of("Names"), PDFDict);
if (!Names.has(PDFName.of("EmbeddedFiles"))) break;
let EmbeddedFiles = Names.lookup(PDFName.of("EmbeddedFiles"), PDFDict);
if (!EmbeddedFiles.has(PDFName.of("Names"))) break;
let EFNames = EmbeddedFiles.lookup(PDFName.of("Names"), PDFArray);
for (let idx = 0, len = EFNames.size(); idx < len; idx += 2) {
let fileName = EFNames.lookup(idx);
if (fileName.decodeText() == "rostrum") {
let fileSpec = EFNames.lookup(idx + 1, PDFDict);
let stream = fileSpec.lookup(PDFName.of("EF"), PDFDict).lookup(PDFName.of("F"), PDFStream);
json = new TextDecoder().decode(PDFLib.decodePDFRawStream(stream).decode());
break;
}
}
} while(false);
let copyKnt = copiedPages.length;
for (let i = pgCount - 1; i >= pn; i--)
mergedScore.pgs[i + copyKnt].json = mergedScore.pgs[i].json;
for (let i = pn; i < pn + copyKnt; i++) mergedScore.pgs[i].json = null;
if(json) {
let pageJson = JSON.parse(json).pages;
for (let i = pn, j = 1; j <= copyKnt; i++, j++) {
mergedScore.pgs[i].json = pageJson[j];
}
}
mergedScore.pgRefresh();
mergedScore.setDirty();
return mergedScore;
}
getActiveObject() {
for (let pg of this.pgs) if (pg.inflated && pg.inUse && pg.canvas.getActiveObject())
return pg.canvas.getActiveObject();
return null;
}
pgAdd(pg, pn, push=true) {
this.pgs.splice(pn - 1, 0, pg);
this.setDirty();
pg.undoPn = pn;
if(push) {
this.undoStack.push(pg);
while(this.undoStack.length > this.maxUndo) this.undoStack.shift();
}
this.pgRefresh();
return pg;
}
pgCut(pn, push=true) {
let cutPg = this.pgs.splice(pn - 1, 1)[0];
this.pgRefresh(false);
this.setDirty();
cutPg.undoPn = -pn;
if(push) {
this.undoStack.push(cutPg);
while(this.undoStack.length > this.maxUndo) this.undoStack.shift();
_menu_.enableCells("page/undo");
}
return cutPg;
}
pgMv(fromPn, toPn) {
fromPn = clamp(fromPn, 1, this.pgs.length);
toPn = clamp(toPn, 1, this.pgs.length);
if(fromPn != toPn) {
this.setDirty();
let pg = this.pgs.splice(fromPn - 1, 1)[0];
this.pgs.splice(toPn - 1, 0, pg);
}
}
pnOf(pg) {
return this.pgs.indexOf(pg) + 1;
}
pgRefresh(resetMax = true) {
if (resetMax && this.pgs.length) {
if (this.pgs.every(pg => pg.width != null && pg.height != null)) this.maxWidth = this.maxHeight = -1;
this.pgs.forEach((pg, index) => {
this.maxWidth = Math.max(pg.width, this.maxWidth);
this.maxHeight = Math.max(pg.height, this.maxHeight);
});
}
if(Score.activeScore === this) {
_menu_.enableCells("page/undo", this.undoStack.length > 0);
_menu_.enableCells("page/cut", this.pgs.length > 1);
if (this.music) this.updateMusicMenu();
let detailsCell = _menu_.rings.score?.cells.details;
if (detailsCell && panels[detailsCell.key]) panels[detailsCell.key].refresh();
}
}
pgUndo() {
if(this.undoStack.length) {
let pg = this.undoStack.pop();
if(pg.undoPn > 0) this.pgCut(pg.undoPn, false);
else this.pgAdd(pg, -pg.undoPn, false);
}
_menu_.enableCells("page/undo", this.undoStack.length);
}
async pgUse(pn, nonblocking=true) {
pn = parseInt(pn);
if (pn > this.pgs.length || pn < 1) return null;
let pg = this.pgs[pn - 1];
pg.inUse = true;
if (pg.showing) {
let waiting = this.bgWaiting.find(w => w.pg === pg);
if (waiting) {
this.bgWaiting.splice(this.bgWaiting.indexOf(waiting), 1);
waiting.go(true);
}
}
await pg.inflate(true, nonblocking);
pg.lastUsed = performance.now();
return pg;
}
showRenders = 0;
bgRenders = 0;
bgWaiting = [];
get backgroundPaused() {
let layout = Layout.activeLayout;
return layout?.score === this && layout.inOp;
}
async renderGate(pg) {
if (this.disposed) return null;
let release = (counter) => {
let spent = false;
return () => {
if (spent) return;
spent = true;
--this[counter];
requestAnimationFrame(() => requestAnimationFrame(() => this.renderNext()));
};
};
if (pg.showing) {
++this.showRenders;
return release("showRenders");
}
if (this.showRenders || this.bgRenders || this.backgroundPaused) {
let waiter = { pg };
let go = await new Promise((resolve) => {
waiter.go = resolve;
this.bgWaiting.push(waiter);
requestAnimationFrame(() => this.renderNext());
});
if (!go) return null;
}
let counter = pg.showing ? "showRenders" : "bgRenders";
++this[counter];
return release(counter);
}
renderNext() {
if (this.disposed || this.showRenders || this.bgRenders || !this.bgWaiting.length) return;
if (this.backgroundPaused) {
requestAnimationFrame(() => this.renderNext());
return;
}
let pn = this.numbers?.pn || 1;
let dist = (w) => Math.abs(this.pnOf(w.pg) - pn);
let near = this.bgWaiting.reduce((best, w) => (dist(w) < dist(best) ? w : best));
this.bgWaiting.splice(this.bgWaiting.indexOf(near), 1);
near.go(true);
}
renderUngate(pg = null) {
this.bgWaiting = this.bgWaiting.filter((w) => {
if (pg && w.pg !== pg) return true;
w.go(false);
return false;
});
}
pgUnuse(pg) {
if (!pg.inUse) return;
pg.inUse = false;
pg.showing = false;
if (!pg.magnifierHold && !pg.tempHolds &&
(pg.inflatePromise || pg.renderTask || pg.renderPromise)) {
pg.deflate();
return;
}
let deflatable = this.pgs.filter((pg) => pg.inflated && !pg.inUse && !pg.magnifierHold && pg.tempHolds == 0);
deflatable.sort((a, b) => b.lastUsed - a.lastUsed);
while (deflatable.length > Score.MAX_INFLATED) {
deflatable.pop().deflate();
}
}
async captureLibraryState() {
const annotations = [];
const identities = this.libraryAnnotationIds ||= Object.create(null);
const identity = async key => {
if (Object.hasOwn(identities, key)) return identities[key];
const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(this.libraryDocumentId + ':' + key)));
bytes[6] = (bytes[6] & 15) | 128; bytes[8] = (bytes[8] & 63) | 128;
const hex = [...bytes.slice(0,16)].map(byte => byte.toString(16).padStart(2,'0')).join('');
return identities[key] = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};
const settings = { version: 1,
menu: sharedViewSettings(_menu_.stashToJsonObj('score')) };
if (this.music) {
const records = await this.musicRecords({ preserveSelection: true });
settings.music = { version: 1, transpose: this.music.transpose,
spelling: this.music.native.viewTransposeSpelling,
preserveSystemBreaks: this.music.native.viewPreserveSystemBreaks,
volume: this.music.player.volume, mixer: this.music.player.mixer,
bookmarks: this.music.bookmarks, menu: settings.menu };
for (const record of records) annotations.push({
id: await identity(record.id),
anchor: { type: 'music', key: record.key, staff: record.staff }, content: record });
} else {
settings.maxWidth = this.maxWidth;
settings.maxHeight = this.maxHeight;
const seen = new Set();
const pageIds = new Set();
settings.pages = this.pgs.map(pg => {
pg.libraryPageId ||= pg.mozPn ? this.libraryDocumentId + ':page:' + pg.mozPn : crypto.randomUUID();
if (pageIds.has(pg.libraryPageId)) pg.libraryPageId = crypto.randomUUID();
pageIds.add(pg.libraryPageId);
const objects = pg.inflated ? pg.canvas.getObjects() : pg.json?.objects || [];
for (const object of objects) {
if (!object.rostrumId || seen.has(object.rostrumId)) object.rostrumId = crypto.randomUUID();
seen.add(object.rostrumId);
}
const json = pg.toJson() || pg.json || { objects: [] };
for (const object of json.objects || []) {
annotations.push({ objectKey: object.rostrumId,
anchor: { type: 'pdf', pageId: pg.libraryPageId },
content: object });
}
const { objects: ignored, ...canvas } = json;
return { id: pg.libraryPageId, mozPn: pg.mozPn,
...(!pg.mozPn ? {width:pg.width,height:pg.height} : {}),
bookmark: pg.bookmark, background: pg.background, canvas };
});
for (const annotation of annotations) { annotation.id = await identity(annotation.objectKey); delete annotation.objectKey; }
}
return { settings, annotations };
}
async restoreLibraryState({ document: doc, settings, annotations }, activate) {
if (settings.version === 1) {
this.libraryRestoring = true;
try {
this.libraryAnnotationIds = Object.assign(Object.create(null), settings.annotationIds || {});
for (const annotation of annotations) {
const content = JSON.parse(annotation.content_json);
const key = this.music ? content.id : content.rostrumId;
if (key) this.libraryAnnotationIds[key] = annotation.id;
}
if (activate && settings.menu) _menu_.stashFromJsonObj(settings.menu, 'score');
this.quality = settings.quality ?? this.quality;
if (this.music) {
for (const pg of this.pgs) pg.deflate(true);
await this.buildMusicPages(annotations.map(a => JSON.parse(a.content_json)));
} else if (settings.pages?.length) {
for (const pg of this.pgs) pg.deflate(true);
this.pgs = settings.pages.map(page => {
const objects = annotations.filter(a => JSON.parse(a.anchor_json).pageId === page.id).map(a => JSON.parse(a.content_json));
const pg = new Pg(this, page.width ?? null, page.height ?? null, { ...page.canvas, objects }, page.mozPn, page.background);
pg.libraryPageId = page.id; pg.bookmark = page.bookmark;
return pg;
});
this.pgRefresh();
}
} finally { this.libraryRestoring = false; }
}
this.libraryDocumentId = doc.id;
this.librarySaveGeneration = this.librarySavedGeneration = 0;
this.dirty = false;
}
setDirty(dirty=true) {
this.dirty = dirty;
if (dirty && this.libraryDocumentId && !this.libraryRestoring) window._bookshelf_.scheduleSave(this);
}
setEditable(bool) {
for (let pg of this.pgs) pg.setEditable(bool);
}
setSelectable(bool) {
for(let pg of this.pgs) {
if(!pg.inflated) continue;
if(!bool) pg.canvas.discardActiveObject();
for (let obj of pg.canvas.getObjects()) {
obj.hasControls = bool && !obj.flatten;
pg.canvas.requestRenderAll();
}}
}
setTitle() {
if (!this.name) { document.title = `Rostrum (${_podId_})`; return; }
let name = this.name.replace(/\.pdf$/i, "");
let maxLen = 30;
if (name.length > maxLen) {
let half = (maxLen - 1) >> 1;
name = name.slice(0, half) + "…" + name.slice(-half);
}
document.title = name;
}
async toPdf(ink = "stamp", doc = false, pns = null) {
if(this.disposePromise) throw new Error("Cannot export a disposed score");
let pending = this.toPdfAux(ink, doc, pns);
this.pendingExports.add(pending);
try {
return await pending;
} finally {
this.pendingExports.delete(pending);
}
}
async toPdfAux(ink, doc, pns) {
try {
if (globalThis._rostrumPages_) await globalThis._rostrumPages_.pdfWriter();
_shade_.onCancel = () => { window.cancelPdf = true; };
let srcPLibDoc = null;
if (this.mozDoc && !this.music) {
try {
srcPLibDoc = await PDFLib.PDFDocument.load(await this.mozDoc.getData());
} catch (err) {
if (err.message?.includes('encrypted') || err.message?.includes('Encrypt')) {
try {
srcPLibDoc = await PDFLib.PDFDocument.load(
await this.mozDoc.getData(), { ignoreEncryption: true }
);
srcPLibDoc.getPages();
} catch (err2) {
let msg = pns ? "Due to copy protection, page can't be copied." : "Due to copy protection, score can't be saved.";
let err = new Error(msg, { cause: "fileSrc" });
if (pns == null) err.originalData = await this.mozDoc.getData();
throw err;
}
} else {
throw err;
}
}
}
if (srcPLibDoc && (!srcPLibDoc.catalog || typeof srcPLibDoc.catalog.Pages !== 'function'))
throw new Error("PDF catalog corrupted.\nFile too large?\nTry splitting into sections.", { cause: "fileSrc"})
let dstPLibDoc = await PDFLib.PDFDocument.create();
dstPLibDoc.registerFontkit(window.fontkit);
this.embeddedFonts = [];
this.missingGlyphs = new Set();
let now = new Date();
if (this == _score_) Layout.activeLayout?.capturePz();
let attachment = {
created: this.created,
modified: now,
maxWidth: this.maxWidth,
maxHeight: this.maxHeight,
quality: this.quality,
pages: {},
menu: _menu_.stashToJsonObj("score"),
};
let pLibPg;
pns = pns || Array.from({length: this.pgs.length}, (_, i) => i + 1);
for(let j = 0; j < pns.length; j++) {
let pn = pns[j];
let percent = Math.trunc((j / pns.length) * 100);
_shade_.update(`Building page ${j + 1} of ${pns.length} (${percent}%)`);
let pg = this.pgs[pn-1];
if (pg.mozPn && !this.music) {
pLibPg = dstPLibDoc.addPage((await dstPLibDoc.copyPages(srcPLibDoc, [pg.mozPn-1]))[0]);
} else {
pLibPg = dstPLibDoc.addPage([pg.width, pg.height]);
if (this.music) {
const canvas = document.createElement('canvas');
canvas.width = pg.width * this.quality; canvas.height = pg.height * this.quality;
const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.drawImage(await this.music.pageImage(pg.mozPn), 0, 0, canvas.width, canvas.height);
const png = await dstPLibDoc.embedPng(canvas.toDataURL('image/png'));
pLibPg.drawImage(png, { x: 0, y: 0, width: pg.width, height: pg.height });
}
if (pg.background) {
let hex = pg.background.replace("#", "");
let r = parseInt(hex.slice(0, 2), 16) / 255;
let g = parseInt(hex.slice(2, 4), 16) / 255;
let b = parseInt(hex.slice(4, 6), 16) / 255;
let a = hex.length > 6 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
pLibPg.drawRectangle({
x: 0, y: 0,
width: pg.width, height: pg.height,
color: PDFLib.rgb(r, g, b),
opacity: a,
});
}
}
setTimeout(_voidFunc_, 0);
let pgJson = await pg.toPdf(ink, pLibPg);
attachment.pages[j+1] = pgJson;
if(window.gc) window.gc();
}
if (this.missingGlyphs.size) await confirmMissingGlyphs(this.missingGlyphs);
let jsonString = JSON.stringify(attachment);
await dstPLibDoc.attach(new TextEncoder().encode(jsonString), "rostrum", {
mimeType: "application/json",
description: "rostrum json metadata",
creationDate: now,
modificationDate: now,
});
dstPLibDoc.setModificationDate(now);
if (this.pdfInfo) {
if (this.pdfInfo.Title) dstPLibDoc.setTitle(this.pdfInfo.Title);
if (this.pdfInfo.Author) dstPLibDoc.setAuthor(this.pdfInfo.Author);
if (this.pdfInfo.Subject) dstPLibDoc.setSubject(this.pdfInfo.Subject);
if (this.pdfInfo.Keywords) dstPLibDoc.setKeywords(
Array.isArray(this.pdfInfo.Keywords) ? this.pdfInfo.Keywords : this.pdfInfo.Keywords.split(/[,;]\s*/));
if (this.pdfInfo.Producer) dstPLibDoc.setProducer(this.pdfInfo.Producer);
if (this.pdfInfo.Creator) dstPLibDoc.setCreator(this.pdfInfo.Creator);
if (this.pdfInfo.CreationDate) dstPLibDoc.setCreationDate(new Date(this.pdfInfo.CreationDate));
} else {
dstPLibDoc.setCreationDate(now);
dstPLibDoc.setCreator("Rostrum vers." + _rostrumVersion_);
dstPLibDoc.setProducer("pdf-lib v1.17.1");
}
if (doc) return dstPLibDoc;
_shade_.update("Generating Pdf document");
let bytes = await dstPLibDoc.save({objectsPerTick: 250});
_shade_.update("PDF Generated");
return bytes;
}
finally {
_shade_.onCancel = null;
}
}
update(props) {
Object.assign(this, props);
if ('name' in props) this.setTitle();
}
}
window._Score_ = Score;
window._resolveTextFont_ = resolveTextFont; window._fontCanShow_ = fontCanShow;
// #inclusion src/layout.js minified
let bkColors = [
"#e58322", "#163799", "#e5e522", "#1a1a1a",
"#22e5e5", "#991637", "#22e522", "#8322e5",
"#808080", "#379916", "#e522e5", "#167899",
"#e52222", "#83e522", "#371699", "#2283e5",
];
function nextBkColor(pg) {
let stash = _menu_.rings.score.cells.details.stash;
let pgs = _score_.pgs, i = pgs.indexOf(pg);
let before = pgs.slice(0, i).findLast((p) => p.bookmark)?.bookmark;
let after = pgs.slice(i + 1).find((p) => p.bookmark)?.bookmark;
let color;
do color = bkColors[stash.bkColorIdx++ % bkColors.length];
while (color == before || color == after);
return color;
}
function contrastColor(hex) {
let r, g, b;
if (hex.length == 4) {
r = parseInt(hex[1], 16) * 17;
g = parseInt(hex[2], 16) * 17;
b = parseInt(hex[3], 16) * 17;
} else {
r = parseInt(hex.slice(1, 3), 16);
g = parseInt(hex.slice(3, 5), 16);
b = parseInt(hex.slice(5, 7), 16);
}
return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.179 ? "#000" : "#fff";
}
let NORMAL_PROPS = {
WIDTH: "width",
HEIGHT: "height",
LEFT: "left",
RIGHT: "right",
TOP: "top",
BOTTOM: "bottom",
BORDERTOP: "borderTop",
BORDERBOTTOM: "borderBottom",
MINWIDTH: "minWidth",
MINHEIGHT: "minHeight",
MAXWIDTH: "maxWidth",
MAXHEIGHT: "maxHeight",
OFFSETLEFT: "offsetLeft",
OFFSETTOP: "offsetTop",
OFFSETWIDTH: "offsetWidth",
OFFSETHEIGHT: "offsetHeight",
CLIENTX: "clientX",
CLIENTY: "clientY",
INNERWIDTH: "innerWidth",
INNERHEIGHT: "innerHeight",
VX: "vX",
VY: "vY",
X: "x",
Y: "y",
};
let ORTHO_PROPS = {
WIDTH: "height",
HEIGHT: "width",
LEFT: "top",
RIGHT: "bottom",
TOP: "left",
BOTTOM: "right",
BORDERTOP: "borderLeft",
BORDERBOTTOM: "borderRight",
MINWIDTH: "minHeight",
MINHEIGHT: "minWidth",
MAXWIDTH: "maxHeight",
MAXHEIGHT: "maxWidth",
OFFSETLEFT: "offsetTop",
OFFSETTOP: "offsetLeft",
OFFSETWIDTH: "offsetHeight",
OFFSETHEIGHT: "offsetWidth",
CLIENTX: "clientY",
CLIENTY: "clientX",
INNERWIDTH: "innerHeight",
INNERHEIGHT: "innerWidth",
VX: "vY",
VY: "vX",
X: "y",
Y: "x",
};
let toEm = (px) => px / _pxPerEm_ + "em";
class LayoutDestroyed extends Error {
name = "LayoutDestroyed";
}
listen(window, "unhandledrejection", (e) => {
if (e.reason instanceof LayoutDestroyed) e.preventDefault();
});
class Layout {
static borderSize = 0.1;
static margin = 1.5 / _dvPxRt_;
static activeLayout = null;
pasting = false;
destroyed = false;
static recto =
"url('data:image/svg+xml;base64," + btoa(`
<svg width='3em' height='3em' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'>
<filter id='paperFilter'>
<feTurbulence type="fractalNoise" baseFrequency='0.5'
result='noise' numOctaves="4" stitchTiles='stitch' seed='42'/>
<feColorMatrix in='noise' type='saturate' values='0'/>
<feComponentTransfer>
<feFuncA type='linear' slope='0.3' intercept='0.5'/>
</feComponentTransfer>
<feComposite in2='SourceGraphic' operator='multiply' result='textured'/>
</filter>
<rect width='100%' height='100%' fill='#383838' filter='url(#paperFilter)'/>
</svg>`) +
"')";
static css = css("Layout", `
.Layout {
position: absolute;
box-shadow: var(--layout-shadow);
border-radius: calc(var(--borderRadius) / 2);
border: 0.025em solid var(--layout-border-color, #222);
box-sizing: border-box;
background-image:
var(--layout-gradient),
var(--recto)
}
.Layout__alert {
height: 60px !important;
width: 60px !important;
}
`);
static pgAlert(which) {
let staff = (top, left, width) =>
`<div style="position:absolute;top:${top}px;left:${left}px;width:${width}px;height:36.5px;
background:repeating-linear-gradient(to bottom,currentColor 0 1.5px,transparent 1.5px 8.43px);"></div>`;
toast(which == "start"
? `${staff(23.5, 33, 30)}
<div style="position:absolute;font:2em/.2 Bravura;top:42px;left:33px;">\ue033</div>`
: `<div translate="no" style="position:absolute;top:5px;left:28px;font:italic bold 0.9em/1 'Times New Roman',serif";>Fine</div>
${staff(36.5, 34.5, 24)}
<div style="position:absolute;font:2em/.4 Bravura;left:55px;top:50px;">\ue032</div>`,
"Layout__alert", 300) ;
}
static async open(cell) {
if (!_score_ || !cell) return;
_shade_.show("Formatting");
try {
Layout.activeLayout?.destructor();
_score_.layout = cell.stash;
if (cell.key == "book") await new BookLayout(_score_, cell).build();
else if (cell.key == "horizontal" || cell.key == "vertical") await new ScrollLayout(_score_, cell).build();
else if (cell.key == "table") await new TableLayout(_score_, cell).build();
_menu_.rings.layout.stash.active = cell.key;
} finally {
_shade_.hide();
}
if (Layout.activeLayout) ScreenPanel.update(Layout.activeLayout.elm);
_score_?.music?.view.resetFollow();
window._viewState_?.schedule();
}
constructor(score, cell) {
Layout.activeLayout = this;
this.score = score;
this.cell = cell;
this.pnListener = listen(_body_, "NUMBERS", (e) => {
if (e.detail.sender instanceof Layout) return;
if(e.detail.tag == "pn") this.pgGoTo(_score_.numbers.pn);
else this.renumber();
});
delay(1, () => {
this.elm.dataset.tag = this.constructor.name;
this.elm.owner = this ;
}) ;
}
renumber() {
this.pagerLeft.build();
this.pagerRight.build();
}
destructor() {
this.destroyed = true;
if(!this.score.disposed) this.capturePz();
for(let pg of this.score.pgs) pg.deflate();
unlisten(this.pnListener);
this.elm.remove();
}
capturePz() {
if (this.score == _score_ && this.elm.classList.contains("pz-set")) {
let styles = getComputedStyle(this.elm);
this.cell.stash.pz = { left: styles.left, top: styles.top, fontSize: (parseFloat(styles.fontSize) / _pxPerEm_) + "em", w: innerWidth, h: innerHeight };
}
}
constrain() {
let offset = Math.max(window.innerHeight, window.innerWidth) * .1 ;
let layout = this.elm.firstElementChild ;
let x = layout.offsetWidth / 2  - offset;
let y = layout.offsetHeight / 2 - offset;
if(this.elm.offsetTop < -y)
this.elm.style.top = -y + "px" ;
else if(this.elm.offsetTop > y + window.innerHeight)
this.elm.style.top = y + window.innerHeight + "px" ;
if(this.elm.offsetLeft < -x)
this.elm.style.left = -x + "px" ;
else if(this.elm.offsetLeft > x + window.innerWidth)
this.elm.style.left = x + window.innerWidth + "px" ;
}
async refit() {
this.cell.stash.pz = null;
this.elm.classList.remove("pz-set");
await this.build(false);
this.place();
window._viewState_?.schedule();
}
place() {
this.elm.style.transition = "unset";
this.elm.style.fontSize = "1em";
reflow();
Object.assign(this.elm.style, this.centerLT());
}
static pnDefaultAxes = { book: "L-R", horizontal: "L-R", vertical: "T-B" };
get pnDefaultAxis() { return Layout.pnDefaultAxes[this.cell.key] ?? "L-R"; }
static normalizePn(cell) {
let axis = Layout.pnDefaultAxes[cell.key];
if (!axis) return cell.stash;
let band = cell.stash.pnBand;
if (!band || typeof band != "object") band = cell.stash.pnBand = {};
if (band.axis != "L-R" && band.axis != "T-B") band.axis = axis;
if (band.place != "Inset" && band.place != "Over") band.place = "Inset";
return cell.stash;
}
pnAxis() {
if (this.pnShow != "On") return null;
return this.pnBand?.axis ?? this.pnDefaultAxis;
}
pnOver() {
return this.pnAxis() != null && this.pnBand?.place == "Over";
}
pnGirth(axis) {
return this.pnAxis() == axis && !this.pnOver() ? Pager.width : Layout.margin;
}
userPz() {
let pz = this.cell.stash.pz;
return pz && pz.w == innerWidth && pz.h == innerHeight
? { left: pz.left, top: pz.top, fontSize: pz.fontSize }
: null;
}
async whileAlive(promise) {
let result = await promise;
if (this.destroyed) throw new LayoutDestroyed();
return result;
}
async build(...args) {
if(this.destroyed) return;
try {
Layout.normalizePn(this.cell);
return await this.doBuild(...args);
} catch (err) {
if (!(err instanceof LayoutDestroyed)) throw err;
} finally {
this.pasting = false;
}
}
pgCutBuild(cutPn) {
return this.build(false);
}
doBuild() {
}
static pgSnapshot(pg, box) {
let dpr = window.devicePixelRatio || 1;
let w = Math.max(1, Math.round(box.width * dpr)), h = Math.max(1, Math.round(box.height * dpr));
let snap = helm(`<canvas width="${w}" height="${h}"></canvas>`);
let ctx = snap.getContext("2d");
ctx.fillStyle = "white";
ctx.fillRect(0, 0, w, h);
if(pg.mozCanvas) ctx.drawImage(pg.mozCanvas, 0, 0, w, h);
if(pg.inflated)
ctx.drawImage(pg.canvas.toCanvasElement(w / pg.canvas.getWidth()), 0, 0, w, h);
return snap;
}
async animateToCell(pg, srcBox, clone, cell, layoutKey, after=null, onStart=null) {
if(!srcBox) {
if(onStart) onStart();
if(after) after();
return;
}
let dstBox = getBox(dataIndex("tag", cell.elm).cellIcon);
if(clone && layoutKey != "table") {
let snap = Layout.pgSnapshot(pg, srcBox);
Object.assign(snap.style, { position: "fixed", pointerEvents: "none", zIndex: _zTop_ + 1,
left: srcBox.x + "px", top: srcBox.y + "px", width: srcBox.width + "px", height: srcBox.height + "px",
transformOrigin: "0 0" });
_body_.append(snap);
await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
let dx = dstBox.x + dstBox.width/2 - srcBox.x, dy = dstBox.y + dstBox.height/2 - srcBox.y;
numb(snap, _gsgs_);
animate(snap, null, { transform: `translate(${dx}px, ${dy}px) scale(0)` },
`transform ${_gsgs_}ms cubic-bezier(0.55, 0, 0.75, 0.2)`, () => {
snap.remove();
if(after) after();
});
if(onStart) onStart();
return;
}
let elm = pg.elm;
if(layoutKey == "table") {
elm = pg.thumbElm;
if(clone) {
let tmp = elm.cloneNode(false);
elm.parentElement.append(tmp);
elm = tmp;
}
}
_body_.append(elm);
let css = elm.style.cssText;
numb(elm, _gsgs_);
animate(elm,
{ left: srcBox.x + "px", top: srcBox.y + "px", zIndex:_zTop_+ 1 },
{ left: dstBox.x + dstBox.width/2 + "px", top: dstBox.y + dstBox.height/2 +  "px", fontSize: 0},
`all ${_gsgs_}ms`, () => {
elm.remove();
elm.style.cssText = css;
if(after) after();
});
if(onStart) onStart();
};
async onDown(e) {
if (this.pasting) return true;
let ae = document.activeElement;
if(ae && (ae.tagName == "INPUT" || ae.tagName == "TEXTAREA")) ae.blur();
if (e.ctrlKey || !e.isPrimary) return true;
if (_menu_.magnifier?.active) {
let pg = e.target.pg || e.target.closest(".canvas-container")?.pg;
if (pg) {
e.taken = true ;
const magnifier = _menu_.magnifier;
magnifier.cancelTracking?.();
const target = this.elm, listeners = [];
const finish = () => {
unlisten(listeners);
if (magnifier.cancelTracking === finish) magnifier.cancelTracking = null;
if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId);
};
let updateMag = (ev) => {
if (ev.pointerId !== e.pointerId) return;
if (!magnifier.active || ev.buttons === 0) return finish();
if (!pg.elm) return;
let box = pg.elm.getBoundingClientRect();
let fracX = (ev.clientX - box.left) / box.width;
let fracY = (ev.clientY - box.top) / box.height;
_menu_.magnifier.panel?.updateMagnifier(fracX, fracY, pg);
};
magnifier.cancelTracking = finish;
target.setPointerCapture(e.pointerId);
updateMag(e);
const endPointer = ev => { if (ev.pointerId === e.pointerId) finish(); };
listeners.push(...listen(target, "pointermove", updateMag),
...listen(window, "pointerup", endPointer, {capture:true}),
...listen(target, ["pointercancel", "lostpointercapture"], endPointer),
...listen(window, "blur", finish));
}
return true;
}
if (_menu_.activeRing?.key == "ink" && _menu_.activeRing?.activeCell) return true;
if (_menu_.activeRing?.key == "page" ||
(_menu_.activeRing?.key == "layout" && ['numbers', 'magnify'].includes(_menu_.rings.page.activeCell?.key))) {
let pageCell = _menu_.rings.page.activeCell;
if (!pageCell) return false;
e.taken = true;
let pageKey = pageCell.key;
let layoutKey = Layout.activeLayout.cell.key;
let pasteCell = _menu_.rings.page.cells.paste;
let pg, pn;
let score = this.score;
pg = e.target.pg || e.target.closest(".canvas-container")?.pg;
if (!pg) return true;
let srcBox = layoutKey == "table" ? (pg.thumbElm ? getBox(pg.thumbElm) : null)
: pg.elm ? getBox(pg.elm) : null ;
pn = score.pnOf(pg);
if (["add", "paste", "import", "merge"].includes(pageKey)) {
let box = getBox(e.target);
if (layoutKey == "vertical" && e.clientY - box.top > box.height / 2) pn++;
else if (e.clientX - box.x > box.width / 2) pn++;
}
_menu_.autoOff.run();
switch (pageKey) {
case "add": {
let stash = _menu_.rings.page.cells.add.stash;
let alpha = parseInt(stash.alpha * 255).toString(16);
while (alpha.length < 2) alpha = "0" + alpha;
let pg = new Pg(score, stash.Width, stash.Height, null, null, stash.rgb + alpha);
await score.pgAdd(pg, pn);
_score_.numbers.pn = pn;
_body_.dispatchEvent(new CustomEvent("NUMBERS", { detail: {sender:this} }));
if(layoutKey == "table") {
await pg.inflate() ;
await pg.getThumbElm() ;
}
this.build(false);
break;
}
case "cut": {
if(this.score.pgs.length == 1) {
toast("Can't cut last page.");
break;
}
score.pgCut(pn);
if(pn == _score_.numbers.pn)
_score_.numbers.pn = Math.max(1, _score_.numbers.pn - 1)
else if(pn < _score_.numbers.pn)
--_score_.numbers.pn;
this.pasting = true;
let cloning = pg.clone(true);
if(layoutKey == "table")
await this.animateToCell(pg, srcBox, false, pasteCell, layoutKey, () => this.build(false));
else
await this.animateToCell(pg, srcBox, true, pasteCell, layoutKey, null, () => this.pgCutBuild(pn));
if (pasteCell.pg) pasteCell.pg.deflate(true);
pasteCell.pg = await cloning;
_menu_.enableCells("page/paste") ;
break;
}
case "copy": {
let cloning = pg.clone(true);
await this.animateToCell(pg, srcBox, true, _menu_.rings.page.cells.paste, layoutKey);
if (pasteCell.pg) pasteCell.pg.deflate(true);
pasteCell.pg = await cloning;
_menu_.enableCells("page/paste") ;
break;
}
case "paste": {
let pastePg = score.pgAdd(pasteCell.pg, pn);
Object.assign(pastePg.thumbElm?.style || pastePg.elm.style, { opacity: 0 });
pasteCell.pg = await pastePg.clone(true);
animate(pastePg.thumbElm || pastePg.elm, null, { opacity: 1 },
`opacity cubic-bezier( 0.99, 0.05, 0.82, 0.35 ) ${_gs_}ms`);
await this.build(false);
await this.pgGoTo(pn);;
break;
}
case "export": {
_shade_.show("Copying...", 250);
await _podPb_.pgCopy(pn);
_shade_.hide();
await this.animateToCell(pg, srcBox, true, _menu_.rings.page.cells.import,layoutKey);
break;
}
case "import": {
dialog(`Confirm: Import pages from shared buffer?<br>(clears undo history)`,
{ Import: { svg: "Import Page" }, Cancel: { svg: "Cancel" } },
async (_e, _prop, tag, args) => {
if (tag == "Import") {
_shade_.show("Importing...", 50);
_menu_.activateCell(null);
await _podPb_.pgPaste(pn);
_shade_.hide();
_menu_.activateRing(_menu_.rings.page);
_menu_.activateCell(_menu_.rings.page.cells.import);
}
args.close();
});
break;
}
case "merge": {
let mergeCell = _menu_.rings.page.cells.merge;
if (!mergeCell.pdfData) break;
let pdfData = mergeCell.pdfData;
let wasLocked = mergeCell.locked;
dialog(`Confirm: Merge entire PDF into score?<br>(clears undo history)`,
{ Merge: { svg: "Merge" }, Cancel: { svg: "Cancel" } },
async (_e, _prop, tag, args) => {
if (tag == "Merge") {
_shade_.show("Merging...", 50);
_menu_.busy = true;
_menu_.activateCell(null);
try {
let mergedScore = await _score_.bindScore(pdfData, pn);
await mergedScore.activate();
} finally {
_shade_.hide();
}
_menu_.activateRing(_menu_.rings.page);
mergeCell.pdfData = pdfData;
_menu_.activateCell(mergeCell);
_menu_.busy = false;
if (wasLocked) {
mergeCell.locked = true;
mergeCell.elm.classList.add("Menu__cell-locked");
_menu_.autoOff.cancel();
} else {
_menu_.autoOff.run(4000 + _gs_ * 3.5);
}
}
args.close();
});
break;
}
case "flatten": {
dialog(`Confirm: Flatten all annotations on this page?<br>(cannot be undone)`,
{ Flatten: { svg: "Flatten" }, Cancel: { svg: "Cancel" } },
(_e, _prop, tag, args) => {
if(tag == "Flatten") pg.flattenObjects();
args.close();
});
break;
}
}
if (score.pgs.length == 1) {
_menu_.activateCell(null);
_menu_.enableCells("page/cut", false);
}
return true;
}
return false;
}
navGen = 0;
cancelNav() {
this.navGen++;
let navigating = !!this.navMv;
unlisten(this.navMv, this.navUp);
this.navMv = this.navUp = null;
return navigating;
}
async pgOpen(how) {
if (this.inOp) return;
let bookmarks = [];
this.score.pgs.forEach((pg, i) => {
if (pg.bookmark) bookmarks.push(i + 1);
});
let current = _score_.numbers.pn, pn;
switch (how) {
case "next":  pn = bookmarks.find((x) => x > current); break;
case "prev":  pn = bookmarks.findLast((x) => x < current); break;
case "first": pn = bookmarks[0]; break;
case "last":  pn = bookmarks.at(-1); break;
}
if (!pn) return;
await this.pgGoTo(pn);
}
pgPad(pg) {
if(pg.deferred)
return delay(5, () => this.pgPad(pg));
if (!pg.inflated || (pg.width == this.score.maxWidth && pg.height == this.score.maxHeight)) return;
let horz = Math.max(0, ((this.score.maxHeight - pg.height * pg.stretch) * pg.zoom) / 2);
let vert = Math.max(0, ((this.score.maxWidth - pg.width * pg.stretch) * pg.zoom) / 2);
Object.assign(pg.elm.style, {
borderWidth: toEm(horz) + " " + toEm(vert),
borderStyle: "solid",
borderColor: Pg.paddingColor,
});
}
pgGoTo(pn) {
}
pnPost(pn, force = false) {
if (!_score_?.numbers) return;
if (_score_.numbers.pn != pn || force) {
_score_.numbers.pn = pn;
_body_.dispatchEvent(new CustomEvent("NUMBERS", { detail: {sender:this} }));
}
}
pagerClaim(e) {
return !!(this.pagerLeft?.tryClaim(e) || this.pagerRight?.tryClaim(e));
}
centerLT(otherStyles = {}) {
let box = getBox(this.elm.firstElementChild);
let winMid = { x: innerWidth / 2, y: innerHeight / 2 };
return Object.assign(
{ left: (winMid.x - box.width / 2 < Layout.margin ? box.width / 2 + Layout.margin : winMid.x) + "px",
top: (winMid.y - box.height / 2 < Layout.margin ? box.height / 2 + Layout.margin : winMid.y) + "px" },
otherStyles);
}
toCenter() {
let elm = this.elm;
let layout = elm.firstElementChild;
let icon = dataIndex("tag", this.cell.elm).cellIcon;
let iconBox = getBox(icon);
let layoutBox = getBox(layout);
numb(elm, _gs_);
animate(elm,
{ left: iconBox.x + iconBox.width / 2 + "px",
top: iconBox.y + iconBox.height / 2 + "px",
fontSize: 0,
},
{ left: layoutBox.width > innerWidth + Layout.margin * 2 ? Layout.margin + "px" : innerWidth / 2 + "px",
top: layoutBox.height > innerWidth + Layout.margin * 2 ? Layout.margin + "px" : innerHeight / 2 + "px",
fontSize:elm.style.fontSize,
},
`all ${_gs_}ms`);
}
}
class BookLayout extends Layout {
static bindingColor =  "#8B4513";
static css = css(
"BookLayout",
`
.BookLayout__spine {
position:absolute;
left:50%;
width: 0;
height:0;
z-index: 1;
}
.BookLayout__spine::before, .BookLayout__spine::after {
content: '';
position: absolute;
left: 50%;
transform: translateX(-50%);
width: var(--stitch-w, 0.8em);
height: 0.1em;
background: radial-gradient(circle, #fff8 45%, transparent 45%);
background-size: 0.12em 0.1em;
background-repeat: repeat-x;
}
.BookLayout__spine::before { top: -0.2em; }
.BookLayout__spine::after  { top: calc(var(--pg-h) + 0.1em); }
.BookLayout__binding {
height:100%;
width:1em;
left:calc(50% - .5em);
position:absolute;
pointer-events: none;
background: linear-gradient(to right,
#fff  0%,
#6004  4%,
#6008  8%,
#6224  47%,
#6114  50%,
#6224  53%,
#5008  90%,
#0004  93%,
#eee4  100%
),linear-gradient(160deg,
#fff0 0%,
#6444 100%
);
mix-blend-mode: multiply;
opacity: 0.4;
}
.BookLayout__slot {
position:absolute;
overflow: hidden;
}
/* iOS/WebKit drops the paint of a page revealed by a flip until
pointerup. The slot's transform is churned by the flip animation, so
promote the page bitmap itself (which the flip never touches) to a
stable own compositing layer so it stays rasterized. Bounded: only a
handful of slots are mounted at once. */
.BookLayout__slot .canvas-container {
transform: translateZ(0);
}
.BookLayout__shadow {
position:absolute;
height: 125%; /* extra is clipped off */
pointer-events: none;
}
.BookLayout__castShadow {
position:absolute;
pointer-events: none;
overflow: hidden; /* clip the path to the page box (the curl can overhang) like the slot does; the CSS drop-shadow still spills past */
}
`
);
elm = helm(`
<div data-tag="BookLayout" class="pz">
<div data-tag="layout" class="Layout" style="overflow:visible">
<div data-tag="binding" class="BookLayout__binding"></div>
<div data-tag="spine" class="BookLayout__spine">
<div data-slot="A" class="BookLayout__slot"></div>
<div data-slot="B" class="BookLayout__slot"></div>
<div data-slot="C" class="BookLayout__slot"></div>
<div data-slot="D" class="BookLayout__slot"></div>
<div data-slot="E" class="BookLayout__slot"></div>
<div data-slot="F" class="BookLayout__slot"></div>
<div data-tag="shadow" class="BookLayout__shadow"></div>
<svg data-tag="castShadow" class="BookLayout__castShadow"><path fill="#fff"></path></svg>
</div>
</div>
</div>
`);
pn0 = -2;
inOp = false;
animId = 0;
flipFrame = null;
constructor(score, cell) {
super(score, cell);
Object.assign(this, dataIndex("tag", this.elm));
this.elm.cell = cell;
_body_.append(this.elm);
this.pointerListener = listen(this.elm, "pointerdown", this.onDown.bind(this));
let s = {};
Object.assign(s, dataIndex("slot", this.layout));
this.slotArrays = [
[s.A, s.B, s.C, s.D, s.E, s.F],
[s.C, s.D, s.E, s.F, s.A, s.B],
[s.E, s.F, s.A, s.B, s.C, s.D],
];
this.slotArraysIndex = 0;
this.slots = this.slotArrays[this.slotArraysIndex];
this.pagerLeft = new Pager("left", (stash, adjusting, cursor) => {
let pn = stash.pn;
if (!adjusting && pn == 1) return (cursor.textContent = "\u2219");
else if (!adjusting && pn & 1) pn--;
return pnToDiv(pn, cursor);
});
this.layout.append(this.pagerLeft.elm);
this.pagerRight = new Pager("right", (stash, adjusting, cursor) => {
let pn = stash.pn;
let pgCount = this.score.pgs.length;
pn = Math.min(pn, pgCount);
if (!adjusting && !(pn & 1)) pn++;
if (!adjusting && pn > pgCount) return (cursor.textContent = "\u2219");
return pnToDiv(pn, cursor);
});
}
destructor() {
this.animId++;
cancelAnimationFrame(this.flipFrame);
this.flipFrame = null;
this.closeFunc = null;
this.inOp = false;
unlisten(this.navMv, this.navUp);
this.navMv = this.navUp = null;
super.destructor();
this.pagerLeft?.destructor();
this.pagerRight?.destructor();
unlisten(this.pointerListener);
}
async doBuild(animated=true) {
Object.assign(this, this.cell.stash);
this.pn0 = -2;
let { fit, score } = this;
fit = fit.toLowerCase();
let g = this.cell.geo = (this.cell.geo || {});
g.tbGap = .2 * _pxPerEm_;
g.borderPx = 0.025 * _pxPerEm_ * 2;
g.pagerWidth = this.pnGirth("L-R");
g.lrGap = g.pagerWidth > Layout.margin ? 0 : g.tbGap;
g.pagerHeight = Math.max(this.pnGirth("T-B"), g.tbGap);
g.pagerHeightPx = this.pnAxis() == "T-B" && !this.pnOver() ? g.pagerHeight : 0;
g.pgCount = this.score.pgs.length;
let spineT = Math.min(g.pgCount / 100, 1);
g.bindingWidth = (0.5 + spineT) * _pxPerEm_;
if (fit == "none") {
g.pgWidth = score.maxWidth;
g.pgHeight = score.maxHeight;
g.bookWidth = g.lrGap + g.pagerWidth + g.pgWidth + g.pgWidth + g.pagerWidth + g.lrGap;
g.bookHeight = g.pagerHeight + g.pgHeight + g.pagerHeight + g.borderPx;
}
if (fit == "auto" || fit == "width") {
g.bookWidth = innerWidth - Layout.margin - Layout.margin;
g.pgWidth = (g.bookWidth - g.pagerWidth - g.lrGap - g.lrGap - g.pagerWidth) / 2;
g.pgHeight = Math.floor(g.pgWidth * (score.maxHeight / score.maxWidth));
g.bookHeight = g.pagerHeight + g.pgHeight + g.pagerHeight + g.borderPx;
if(fit == "auto") {
fit = "width";
let layoutWidth = Math.round(Layout.margin * 2 + (g.pgWidth + g.lrGap) * 2 + g.pagerWidth * 2);
if(layoutWidth > innerWidth)
fit = "height";
else {
let layoutHeight = Math.round(Layout.margin * 2 + g.pgHeight + g.pagerHeight * 2 + g.borderPx);
if(layoutHeight > innerHeight) fit = "height";
}
}
}
if (fit == "height") {
g.bookHeight = innerHeight - Layout.margin - Layout.margin;
g.pgHeight = g.bookHeight - g.pagerHeight - g.pagerHeight - g.borderPx;
g.pgWidth = Math.floor(g.pgHeight * (score.maxWidth / score.maxHeight));
g.bookWidth = g.lrGap + g.pagerWidth + g.pgWidth + g.pgWidth + g.pagerWidth + g.lrGap;
}
g.zoom = g.pgWidth / score.maxWidth;
if (animated || !this.elm.style.fontSize.endsWith("em")) this.elm.style.fontSize = "1em";
Object.assign(this.layout.style, {
height: `calc(${toEm(g.bookHeight)} + ${g.pagerHeightPx * 2}px - ${toEm(g.pagerHeightPx * 2)})`,
width: `calc(${toEm(g.bookWidth)} + ${g.pagerWidth * 2}px - ${toEm(g.pagerWidth * 2)})`,
});
this.binding.style.width = toEm(g.bindingWidth);
this.binding.style.left = `calc(50% - ${toEm(g.bindingWidth / 2)})`;
this.spine.style.top = toEm(g.pagerHeight);
this.spine.style.setProperty('--stitch-w', toEm(g.bindingWidth * 0.8));
this.spine.style.setProperty('--pg-h', toEm(g.pgHeight));
g.shadowWidth = g.pgWidth / _pxPerEm_;
this.shadow.style.width = toEm(g.shadowWidth);
this.shadow.remove();
this.castShadow.remove();
for (let slot of this.slots) {
slot.style.width = toEm(g.pgWidth);
slot.style.height = toEm(g.pgHeight);
}
this.layoutSlots();
this.pagerLeft.elm.style.zIndex = this.pagerRight.elm.style.zIndex = 20;
let ends = (this.pnAxis() ?? this.pnDefaultAxis) == "T-B";
this.pagerLeft.setPosition(ends ? "top" : "left");
this.pagerRight.setPosition(ends ? "bottom" : "right");
this.layout.append(this.pagerLeft.elm);
this.layout.append(this.pagerRight.elm);
let pagerHidden = this.pnAxis() == null;
this.pagerLeft.setHidden(pagerHidden, Layout.margin);
this.pagerRight.setHidden(pagerHidden, Layout.margin);
this.pagerLeft.build();
this.pagerRight.build();
await this.pgGoTo(_score_.numbers.pn, !animated);
if(!animated) return;
let iconBox = getBox(dataIndex("tag", this.cell.elm).cellIcon);
let pz = this.userPz();
numb(this.elm, _gs_);
if(pz)
animate(this.elm, { left:iconBox.x + iconBox.width / 2 + "px", top:iconBox.y + iconBox.height / 2 + "px", fontSize: 0}, pz, `all ${_gs_}ms`);
else animate(this.elm,
{left:iconBox.x + iconBox.width / 2 + "px", top:iconBox.y + iconBox.height / 2 + "px", fontSize: 0},
this.centerLT({ fontSize: "1em"}),
`all ${_gs_}ms`);
}
async onDown(e) {
if (this.pagerClaim(e)) return;
let gen = this.navGen;
if (this.inOp && this.closeFunc) {
this.animId++;
await this.whileAlive(this.closeFunc());
this.closeFunc = null;
this.inOp = false;
let target = document.elementFromPoint(e.clientX, e.clientY);
if (!target) return;
return this.onDown({
isPrimary: true,
target,
clientX: e.clientX,
clientY: e.clientY,
pointerId: e.pointerId,
timeStamp: performance.now(),
});
}
if (await this.whileAlive(super.onDown(e))) return;
if (gen != this.navGen) return;
if (e.target.dataset.slot) return;
if (e.target.closest(".Pager")) return;
let { pgWidth, pgHeight } = this.cell.geo;
let advancing;
let slot = e.target.closest(".BookLayout__slot");
if (slot === this.slots[3] && this.slots[4].children.length > 0) advancing = true;
else if (slot === this.slots[2]) advancing = false;
else
{ e.taken = true ;
return Layout.pgAlert("end");
}
this.inOp = true;
this.elm.setPointerCapture(e.pointerId);
let spineBox = getBox(this.spine);
this.navX = e.clientX - spineBox.x;
this.navY = e.clientY - spineBox.y;
this.navAdvancing = advancing;
this.pgFlip(advancing ? pgWidth : -pgWidth, pgHeight / 2, this.navX, this.navY, advancing);
let drag = new Drag(e, { minVelocity:0.75 });
this.navMv = listen(this.elm, "pointermove", (emv) => {
this.navX = emv.clientX - spineBox.x;
this.navY = emv.clientY - spineBox.y;
this.pgMove(this.navX, this.navY, advancing);
drag.mv(emv) ;
});
this.navUp = listen(
this.elm,
"pointerup",
async (eup) =>  {
this.navUp = null;
unlisten(this.navMv);
this.navMv = null;
let x = eup.clientX - spineBox.x;
let y = eup.clientY - spineBox.y;
let flipping = (advancing && x <= 0) || (!advancing && x > 0);
drag.up(eup) ;
if(drag.jab || drag.vX) flipping = true ;
if(drag.vX) drag.boost(1.5, 2) ;
let toX = flipping ? (advancing ? -pgWidth : pgWidth) : advancing ? pgWidth : -pgWidth;
this.closeFunc = async () => {
if (flipping) await this.pgShift(advancing);
else this.layoutSlots();
};
this.pgFlip(x, y, toX, pgHeight / 2, advancing, this.closeFunc, drag.vX);
},
{ once: true }
);
}
cancelNav() {
if (!super.cancelNav()) return;
let { pgWidth, pgHeight } = this.cell.geo;
let toX = this.navAdvancing ? pgWidth : -pgWidth;
this.closeFunc = () => this.layoutSlots();
this.pgFlip(this.navX, this.navY, toX, pgHeight / 2, this.navAdvancing, this.closeFunc, null);
}
pgFlip(x, y, toX, toY, advancing, func=null, pace=null) {
cancelAnimationFrame(this.flipFrame);
let pgWidth = this.cell.geo.pgWidth;
let pxPerFlip = pgWidth * 2;
let msecPerFlip = pace == null ? this.cell.stash.pace : pxPerFlip * (1/ Math.abs(pace)) ;
let startFlip  = advancing ? (pgWidth - x)   / pxPerFlip : (x   + pgWidth) / pxPerFlip;
let targetFlip = advancing ? (pgWidth - toX)  / pxPerFlip : (toX + pgWidth) / pxPerFlip;
let duration = Math.abs(targetFlip - startFlip) * msecPerFlip;
this.inOp = true;
let start = performance.now();
let easedStart  = startFlip  * startFlip  * (3 - 2 * startFlip);
let easedTarget = targetFlip * targetFlip  * (3 - 2 * targetFlip);
let animId = ++this.animId;
let animate = (now) => {
if (animId != this.animId) return;
this.flipFrame = null;
let t = Math.min((now - start) / duration, 1);
let flip = startFlip + (targetFlip - startFlip) * t;
let easedFlip = flip * flip * (3 - 2 * flip);
let progress = t >= 1 ? 1 : (easedFlip - easedStart) / (easedTarget - easedStart);
this.pgMove(x + (toX - x) * progress, y + (toY - y) * progress, advancing);
if (t >= 1) { if (func) func(); this.inOp = false; }
else this.flipFrame = requestAnimationFrame(animate);
}
animate(start);
}
async pgMount(pn, slot, nonblocking=true) {
for (let child of [...this.slots[slot].children]) {
child.remove();
if (child.pg) this.score.pgUnuse(child.pg);
}
let known = this.score.pgs[pn - 1];
if (known) known.showing = !nonblocking;
let pg = await this.whileAlive(this.score.pgUse(pn, nonblocking));
if (pg) {
pg.setZoom(this.cell.geo.zoom);
this.pgPad(pg);
this.slots[slot].append(pg.elm);
}
}
pgResetSlots() {
for (let slot of this.slots) {
slot.style.transform = "";
slot.style.transformOrigin = "";
slot.style.left = "";
slot.style.zIndex = "";
slot.style.filter = "";
for (let child of slot.children) {
if (child.firstChild) child.firstChild.style.clipPath = "";
}
}
}
pgMove(x, y, advancing) {
let { shadow, castShadow } = this;
let { pgWidth, pgHeight, shadowWidth } = this.cell.geo;
let zoom = parseFloat(this.elm.style.fontSize);
pgWidth *= zoom;
pgHeight *= zoom;
shadowWidth *= zoom;
x = clamp(x, -pgWidth, pgWidth);
y = clamp(y, 0, pgHeight);
if (advancing) {
let leader = this.slots[3];
let follower = this.slots[4];
follower.style.zIndex = 2;
shadow.style.background = "radial-gradient(ellipse at right, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 50%, transparent 70%)";
let xFactor = (x + pgWidth) / (pgWidth + pgWidth);
let yFactor = (y / pgHeight - 0.5) * 2;
let pullingAngle = (Math.PI / 2) * xFactor * yFactor;
let pullingEdgeWidth = (pgWidth - x) / 2;
let pulledAngle;
let pulledEdgeWidth;
if (pullingAngle <= 0) {
let ll = rotatePoint(x, pgHeight, x + pullingEdgeWidth, 0, pullingAngle);
pulledEdgeWidth = pullingAngle ? (pgHeight - ll.y) / Math.sin(pullingAngle) : pullingEdgeWidth;
pulledAngle = -Math.atan((pullingEdgeWidth - pulledEdgeWidth) / pgHeight);
if (leader.firstChild) leader.firstChild.style.clipPath = `path("M${pgWidth - pullingEdgeWidth} 0H0V${pgHeight}H${pgWidth - pulledEdgeWidth}Z")`;
follower.style.transformOrigin = `${pullingEdgeWidth}px 0`;
if (follower.firstChild) follower.firstChild.style.clipPath = `path("M${pullingEdgeWidth} 0H0V${pgHeight}H${pulledEdgeWidth}Z")`;
shadow.style.bottom = "unset";
shadow.style.top = "0";
shadow.style.transformOrigin = "top right";
} else {
let ul = rotatePoint(x, 0, x + pullingEdgeWidth, pgHeight, pullingAngle);
pulledEdgeWidth = -ul.y / Math.sin(pullingAngle);
pulledAngle = Math.atan((pullingEdgeWidth - pulledEdgeWidth) / pgHeight);
if (leader.firstChild) leader.firstChild.style.clipPath = `path("M${pgWidth - pulledEdgeWidth} 0H0V${pgHeight}H${pgWidth - pullingEdgeWidth}Z")`;
follower.style.transformOrigin = `${pullingEdgeWidth}px ${pgHeight}px`;
if (follower.firstChild) follower.firstChild.style.clipPath = `path("M${pulledEdgeWidth} 0H0V${pgHeight}H${pullingEdgeWidth}Z")`;
shadow.style.top = "unset";
shadow.style.bottom = "0";
shadow.style.transformOrigin = "bottom right";
}
follower.style.left = x + "px";
follower.style.transform = `rotate(${pullingAngle}rad)`;
follower.append(shadow);
shadow.style.left = "unset";
let alpha = Math.min((x + pgWidth) / shadowWidth, 1);
this.spine.append(castShadow);
Object.assign(castShadow.style, {
width: pgWidth + "px",
height: pgHeight + "px",
top: "0",
right: "unset",
left: follower.style.left,
transformOrigin: follower.style.transformOrigin,
transform: follower.style.transform,
zIndex: 1,
filter: `drop-shadow(rgba(0, 0, 0, ${alpha * 0.08}) 2.4em 1.2em 0.45em)
drop-shadow(rgba(0, 0, 0, ${alpha * 0.10}) 1.6em 0.8em 0.4em)
drop-shadow(rgba(0, 0, 0, ${alpha * 0.12}) 0.9em 0.45em 0.4em)
drop-shadow(rgba(0, 0, 0, ${alpha * 0.13}) 0.35em 0.18em 0.3em)
drop-shadow(rgba(0, 0, 0, ${alpha * 0.07}) 0 0 0.5em)`,
});
castShadow.setAttribute("viewBox", `0 0 ${pgWidth} ${pgHeight}`);
castShadow.firstElementChild.setAttribute("d", follower.firstChild ? follower.firstChild.style.clipPath.replace(/^path\(["']?|["']?\)$/g, "") : "");
shadow.style.opacity = alpha;
shadow.style.right = pgWidth - pullingEdgeWidth + "px";
shadow.style.transform = `rotate(${pulledAngle - pullingAngle}rad)`;
} else {
let leader = this.slots[2];
let follower = this.slots[1];
follower.style.zIndex = 1;
shadow.style.background = "radial-gradient(ellipse at left, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.05) 50%, transparent 70%)";
let xFactor = 1 - (x + pgWidth) / (pgWidth + pgWidth);
let yFactor = (y / pgHeight - 0.5) * 2;
let pullingAngle = -(Math.PI / 2) * xFactor * yFactor;
let pullingEdgeWidth = (pgWidth + x) / 2;
let pulledEdgeWidth;
let pulledAngle;
if (pullingAngle >= 0) {
let lr = rotatePoint(x, pgHeight, x - pullingEdgeWidth, 0, pullingAngle);
pulledEdgeWidth = pullingAngle ? (lr.y - pgHeight) / Math.sin(pullingAngle) : pullingEdgeWidth;
pulledAngle = Math.atan((pullingEdgeWidth - pulledEdgeWidth) / pgHeight);
if (leader.firstChild) leader.firstChild.style.clipPath = `path("M${pullingEdgeWidth} 0H${pgWidth}V${pgHeight}H${pulledEdgeWidth}Z")`;
follower.style.transformOrigin = `${pgWidth - pullingEdgeWidth}px 0`;
if (follower.firstChild) follower.firstChild.style.clipPath = `path("M${pgWidth - pullingEdgeWidth} 0H${pgWidth + 1}V${pgHeight}h${-pulledEdgeWidth}Z")`;
shadow.style.bottom = "unset";
shadow.style.top = "0";
shadow.style.transformOrigin = "top left";
} else {
follower.style.zIndex = 2;
let ur = rotatePoint(x, 0, x - pullingEdgeWidth, pgHeight, pullingAngle);
pulledEdgeWidth = ur.y / Math.sin(pullingAngle);
pulledAngle = -Math.atan((pullingEdgeWidth - pulledEdgeWidth) / pgHeight);
if (leader.firstChild) leader.firstChild.style.clipPath = `path("M${pulledEdgeWidth} 0H${pgWidth}V${pgHeight}H${pullingEdgeWidth}Z")`;
follower.style.transformOrigin = `${pgWidth - pullingEdgeWidth}px ${pgHeight}px`;
if (follower.firstChild) follower.firstChild.style.clipPath = `path("M${pgWidth - pulledEdgeWidth} 0H${pgWidth}V${pgHeight}h${-pullingEdgeWidth}Z")`;
shadow.style.top = "unset";
shadow.style.bottom = "0";
shadow.style.transformOrigin = "bottom left";
}
follower.style.left = x - pgWidth + "px";
follower.style.transform = `rotate(${pullingAngle}rad)`;
follower.append(shadow);
shadow.style.right = "unset";
let alpha = Math.min((pgWidth - x) / shadowWidth, 1);
this.spine.append(castShadow);
Object.assign(castShadow.style, {
width: pgWidth + "px",
height: pgHeight + "px",
top: "0",
right: "unset",
left: follower.style.left,
transformOrigin: follower.style.transformOrigin,
transform: follower.style.transform,
zIndex: 0,
filter: `drop-shadow(rgba(0, 0, 0, ${alpha * 0.08}) 2.4em 1.2em 0.45em)
drop-shadow(rgba(0, 0, 0, ${alpha * 0.10}) 1.6em 0.8em 0.4em)
drop-shadow(rgba(0, 0, 0, ${alpha * 0.12}) 0.9em 0.45em 0.4em)
drop-shadow(rgba(0, 0, 0, ${alpha * 0.13}) 0.35em 0.18em 0.3em)
drop-shadow(rgba(0, 0, 0, ${alpha * 0.07}) 0 0 0.5em)`,
});
castShadow.setAttribute("viewBox", `0 0 ${pgWidth} ${pgHeight}`);
castShadow.firstElementChild.setAttribute("d", follower.firstChild ? follower.firstChild.style.clipPath.replace(/^path\(["']?|["']?\)$/g, "") : "");
shadow.style.opacity = alpha;
shadow.style.left = pgWidth - pullingEdgeWidth + "px";
shadow.style.transform = `rotate(${pulledAngle - pullingAngle}rad)`;
}
}
async pgOpen(how, bookMarks) {
if (bookMarks) return super.pgOpen(how);
if (this.inOp) return;
let pn = parseInt(_score_.numbers.pn);
let inc = 2;
let pgCount = this.score.pgs.length;
switch (how) {
case "next":
if (pn + inc > pgCount) return;
pn += inc;
break;
case "prev":
if (pn - inc <= 0) return;
pn -= inc;
break;
case "first":
pn = 1;
break;
case "last":
pn = Number.MAX_SAFE_INTEGER;
break;
}
pn = clamp(pn, 1, pgCount);
await this.pgGoTo(pn);
}
async pgShift(advancing, post = true) {
if (advancing) {
this.pn0 += 2;
this.slotArraysIndex = (this.slotArraysIndex + 1) % 3;
this.slots = this.slotArrays[this.slotArraysIndex];
await this.pgMount(this.pn0 + 4, 4);
await this.pgMount(this.pn0 + 5, 5);
} else {
this.pn0 -= 2;
this.slotArraysIndex = (this.slotArraysIndex + 2) % 3;
this.slots = this.slotArrays[this.slotArraysIndex];
await this.pgMount(this.pn0, 0);
await this.pgMount(this.pn0 + 1, 1);
}
this.layoutSlots();
if (post) this.pnPost(Math.min(this.pn0 + 3, this.score.pgs.length));
}
async pgGoTo(pn, animated = true) {
pn = clamp(pn, 1, this.score.pgs.length);
let pn0 = pn - (pn & 0x01 ? 3 : 2);
this.pgResetSlots();
if (!animated) {
cancelAnimationFrame(this.flipFrame);
this.animId++;
this.inOp = false;
this.pn0 = pn0;
let spread = [this.slots[2], this.slots[3]];
for (let slot of spread) Object.assign(slot.style, { transition: "none", opacity: 0 });
let fadeMs = 250, fade = "";
try {
const visible = pn === pn0 + 3 ? [3,2] : [2,3];
for (let [slot, nonblocking] of [...visible.map(slot => [slot,false]), [0, true], [1, true], [4, true], [5, true]])
await this.pgMount(pn0 + slot, slot, nonblocking);
this.layoutSlots();
reflow();
fade = `opacity ${fadeMs}ms ease-out`;
} finally {
for (let slot of spread) Object.assign(slot.style, { transition: fade, opacity: "" });
}
delayMs(fadeMs + 50, () => { for (let slot of spread) slot.style.transition = ""; });
this.pnPost(pn, true);
return;
}
let advancing = pn - 2 > this.pn0;
if(pn == 1) advancing = false;
let mounts = advancing
? [[pn0+2, 4, false], [pn0+3, 5, false], [pn0,   2, true], [pn0+1, 3, true]]
: [[pn0+2, 0, false], [pn0+3, 1, false], [pn0+4, 2, true], [pn0+5, 3, true]];
for (let [mountPn, slot, nonblocking] of mounts) await this.pgMount(mountPn, slot, nonblocking);
this.pn0 = advancing ? pn0 - 2 : pn0 + 2;
let {pgWidth, pgHeight} = this.cell.geo;
if (advancing) this.pgFlip(pgWidth, 0, -pgWidth, pgHeight / 2, true,
async () => await this.pgShift(true, false));
else this.pgFlip(-pgWidth, pgHeight, pgWidth, pgHeight / 2, false,
async() => await this.pgShift(false, false));
this.pnPost(pn, true);
}
layoutSlots() {
for (let i of [0, 1, 2]) this.slots[i].style.left = "unset";
for (let i of [0, 1, 2]) this.slots[i].style.right = ".5px";
for (let i of [5, 4, 3]) this.slots[i].style.right = "unset";
for (let i of [5, 4, 3]) this.slots[i].style.left = ".5px";
for (let i of [0, 1, 2, 5, 4, 3]) {
let slot = this.slots[i];
slot.style.transformOrigin = "unset";
slot.style.transform = "unset";
slot.style.zIndex = 0;
slot.style.filter = "unset";
if (slot.firstChild) slot.firstChild.style.clipPath = "unset";
this.spine.append(slot);
}
this.shadow.remove();
this.castShadow.remove();
}
}
class ScrollLayout extends Layout {
static verso = "url('data:image/svg+xml;base64," + btoa(`
<!-- leather-worn-amber.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
<defs>
<filter id="leatherWear" color-interpolation-filters="sRGB">
<!-- large organic grain pattern -->
<feTurbulence type="fractalNoise"
baseFrequency="0.23" numOctaves="3" seed="8"
stitchTiles="stitch" result="noise"/>
<feColorMatrix in="noise" type="matrix"
values="1.7 0 0 0 0
0 1.7 0 0 0
0 0 1.7 0 0
0 0 0 1 0" result="contrast"/>
<feDiffuseLighting in="contrast"
surfaceScale="2.8" diffuseConstant="1.15"
lighting-color="#f0f0f0" result="lit">
<feDistantLight azimuth="230" elevation="55"/>
</feDiffuseLighting>
<feBlend in="contrast" in2="lit" mode="multiply" result="grain"/>
</filter>
</defs>
<rect width="128" height="128" fill="#585858"/>
<!-- texture overlay -->
<rect width="128" height="128" filter="url(#leatherWear)" opacity="0.32"/>
</svg>
`) +  "')";
static css = css(
"ScrollLayout",
`   .ScrollLayout__frame {
position:absolute;
overflow: hidden;
}
.ScrollLayout__sash {
position: relative;
pointer-events: auto;
}
/* iOS/WebKit drops the paint of a page scrolled/snapped into view until
pointerup. Promote each page bitmap to its own stable compositing layer
so it stays rasterized. Bounded: the sash only holds a window of
2*pgShow+1 (min 4) pages. (Same fix as BookLayout.) */
.ScrollLayout__sash .canvas-container {
transform: translateZ(0);
}
.ScrollLayout__roll {
position:absolute;
z-index:10;
filter:drop-shadow(0 .2em .35em #0005);
overflow:hidden;
}
.ScrollLayout__roll-shadow {
position:relative;
height:100%;
}
.ScrollLayout__roll::after {
content:"";
position:absolute;
}
.ScrollLayout-texture {
position:absolute;
height:100%;
background-image:
linear-gradient(to right, #0000 35% , #ccc2 50%, #0000 65% ),
var(--verso)
}
`
);
elm = helm(`
<div data-tag="ScrollLayout" class="pz">
<div data-tag="layout" class="Layout" style="border:none;">
<div data-tag="leftRoll" class="ScrollLayout__roll">
<div data-tag="leftRollPattern" class="ScrollLayout-texture"></div>
<div data-tag="leftRollShadow" class="ScrollLayout__roll-shadow"></div>
</div>
<div data-tag="frame" class="ScrollLayout__frame">
<div data-tag="sash" class="ScrollLayout__sash"></div>
</div>
<div data-tag="rightRoll" class="ScrollLayout__roll">
<div data-tag="rightRollPattern" class="ScrollLayout-texture"></div>
<div data-tag="rightRollShadow" class="ScrollLayout__roll-shadow"><div>
</div>
</div>
</div>`);
sashStart = 0;
sashLimit = 0;
frameWidth = 0;
currentX = 0;
currentY = 0;
snapIndex = 0;
snapStep = 1;
constructor(score, cell) {
super(score, cell);
Object.assign(this, dataIndex("tag", this.elm));
this.elm.cell = cell;
_body_.append(this.elm);
this.pointerListener = listen(this.elm, ["pointerdown"], this.onDown.bind(this));
this.props = cell.key == "horizontal" ? NORMAL_PROPS : ORTHO_PROPS;
this.elm.dataset.scrollOrient = cell.key == "horizontal" ? "h" : "v";
this.pagerLeft = new Pager(this.props.LEFT, (stash, adjusting, cursor) => {
if (adjusting) return pnToDiv(stash.pn, cursor);
let [left] = this.snapPns();
return pnToDiv(left, cursor);
});
this.pagerLeft.elm.style.zIndex = 20;
this.pagerRight = new Pager(this.props.RIGHT, (stash, adjusting, cursor) => {
if (adjusting) return pnToDiv(Math.min(stash.pn + this.cell.geo.pgShow - 1, this.cell.geo.pgCount), cursor);
let [, right] = this.snapPns();
return pnToDiv(right, cursor);
});
this.pagerRight.elm.style.zIndex = 20;
this.leftRollShadow.style.background = this.rightRollShadow.style.background =
`linear-gradient(to ${this.cell.key == "horizontal" ? "right" : "bottom"}, #666b 0, #0000 50%, #8888 100%)`;
}
destructor() {
super.destructor();
this.pagerLeft.destructor();
this.pagerRight.destructor();
unlisten(this.pointerListener);
}
async doBuild(animated=true) {
this.animated = animated;
Object.assign(this, this.cell.stash);
let { fit, gap, pgSnap, sash, score, pgShow } = this;
let { LEFT, RIGHT, TOP, BOTTOM, WIDTH, HEIGHT, MAXWIDTH, MAXHEIGHT, INNERWIDTH, INNERHEIGHT } = this.props;
fit = fit.toLowerCase();
clearChildren(sash);
let g = (this.cell.geo = this.cell.geo || {scroll: {},sash: {},pg: {}});
gap /= 100;
let pnAxis = this.pnAxis();
let pnAlong = ((pnAxis ?? this.pnDefaultAxis) == "L-R") == (this.cell.key == "horizontal");
g.rollGirth = pnAxis != null && pnAlong && !this.pnOver() ? Pager.width : Layout.margin;
g.pnGirth = pnAxis != null && !pnAlong && !this.pnOver() ? Pager.width : 0;
g.pgCount = this.score.pgs.length;
g.pgShow = Math.min(pgShow, g.pgCount);
g.pgSnap = Math.min(pgSnap, g.pgCount);
if (fit == "none") {
g.pg[WIDTH] = score[MAXWIDTH];
g.gap = gap * g.pg[WIDTH];
g.pg[HEIGHT] = score[MAXHEIGHT];
g.scroll[WIDTH] = g.rollGirth + g.gap + (g.pg[WIDTH] + g.gap) * g.pgShow + g.rollGirth;
g.scroll[HEIGHT] = g.pnGirth + g.gap + g.pg[HEIGHT] + g.gap + g.pnGirth;
}
if (fit == "auto" || fit == WIDTH) {
g.scroll[WIDTH] = window[INNERWIDTH] - Layout.margin - Layout.margin;
g.pg[WIDTH] = ((g.scroll[WIDTH] - g.rollGirth - g.rollGirth) / g.pgShow) / (1 + gap + gap/g.pgShow);
g.gap = gap * g.pg[WIDTH];
g.pg[HEIGHT] = Math.floor(g.pg[WIDTH] * (score[MAXHEIGHT] / score[MAXWIDTH]));
g.scroll[HEIGHT] = g.pnGirth + g.gap + g.pg[HEIGHT] + g.gap + g.pnGirth;
if(fit == "auto") {
fit = WIDTH;
let layoutWidth = Math.round(Layout.margin * 2 + (g.pg[WIDTH] + g.gap) * g.pgShow + g.gap + g.rollGirth * 2);
if(layoutWidth > window[INNERWIDTH])
fit = HEIGHT;
else {
let layoutHeight = Math.round(Layout.margin * 2 + g.pg[HEIGHT] + g.gap * 2 + g.pnGirth * 2);
if(layoutHeight > window[INNERHEIGHT]) fit = HEIGHT;
}
}
}
if (fit == HEIGHT) {
g.scroll[HEIGHT] = window[INNERHEIGHT] - Layout.margin - Layout.margin;
g.pg[HEIGHT] = (g.scroll[HEIGHT] - g.pnGirth - g.pnGirth) / (1 + gap + gap);
g.gap = gap * g.pg[HEIGHT];
g.pg[WIDTH] = g.pg[HEIGHT] * score[MAXWIDTH] / score[MAXHEIGHT];
g.scroll[WIDTH] = g.rollGirth + g.gap + (g.gap + g.pg[WIDTH]) * g.pgShow + g.rollGirth;
}
g.sash[WIDTH] = (g.pg[WIDTH] + g.gap) * g.pgCount + g.gap;
g.sashLimit = Math.round(-g.sash[WIDTH] + g.pgShow * (g.pg[WIDTH] + g.gap) + g.gap);
g.zoom = g.pg[WIDTH] / score[MAXWIDTH];
if (animated || !this.elm.style.fontSize.endsWith("em")) this.elm.style.fontSize = "1em";
Object.assign(this.layout.style, {
[HEIGHT]: `calc(${toEm(g.scroll[HEIGHT])} + ${g.pnGirth * 2}px - ${toEm(g.pnGirth * 2)})`,
[WIDTH]: `calc(${toEm(g.scroll[WIDTH])} + ${g.rollGirth * 2}px - ${toEm(g.rollGirth * 2)})`,
});
Object.assign(this.frame.style, {
[HEIGHT]: `calc(100% - ${g.pnGirth * 2}px)`,
[WIDTH]: `calc(100% - ${g.rollGirth * 2}px`,
[LEFT]: g.rollGirth + "px",
[TOP]: g.pnGirth + "px",
});
this.sash.style.transition = "unset";
Object.assign(this.sash.style, {
[HEIGHT]: "100%",
[WIDTH]: toEm(g.sash[WIDTH]),
[TOP]: 0,
});
for (let roll of [this.leftRoll, this.rightRoll])
Object.assign(roll.style, {
[HEIGHT]: `calc(100% - ${g.pnGirth * 2}px)`,
[WIDTH]: g.rollGirth + "px",
[roll === this.leftRoll ? LEFT : RIGHT]: 0,
[TOP]: g.pnGirth + "px",
});
for (let style of [this.leftRollPattern.style, this.rightRollPattern.style])
Object.assign(style, {
[HEIGHT]: "100%",
[WIDTH]: "200%",
});
let [pnA, pnB] = pnAlong ? [LEFT, RIGHT] : [TOP, BOTTOM];
this.pagerLeft.setPosition(pnA);
this.pagerRight.setPosition(pnB);
let pnHome = this.pnOver() ? this.frame : pnAlong ? null : this.layout;
(pnHome ?? this.leftRoll).append(this.pagerLeft.elm);
(pnHome ?? this.rightRoll).append(this.pagerRight.elm);
let pagerHidden = pnAxis == null;
this.pagerLeft.setHidden(pagerHidden, Layout.margin);
this.pagerRight.setHidden(pagerHidden, Layout.margin);
this.pagerLeft.build();
this.pagerRight.build();
let pn = parseInt(_score_.numbers.pn);
if (animated && score.pgs.length > 1) {
let startPn = (pn > 1) ? (pn - 1) : 2;
let pgSpan = g.pg[this.props.WIDTH] + g.gap;
let startSashStart = -(startPn - 1) * pgSpan;
this.sash.style[this.props.LEFT] = (startSashStart / _pxPerEm_) + "em";
let iconBox = getBox(dataIndex("tag", this.cell.elm).cellIcon);
numb(this.elm, _gs_);
animate(this.elm,
{ left:iconBox.x + iconBox.width / 2 + "px", top:iconBox.y + iconBox.height / 2 + "px", fontSize: 0},
this.userPz() ?? this.centerLT({ fontSize: "1em"}),
`all ${_gs_}ms`
);
this.pgGoTo(pn, true);
} else {
if (animated) {
const pz = this.userPz();
if (pz) Object.assign(this.elm.style, pz);
else this.place();
}
await this.pgGoTo(pn, false);
}
}
async pgCutBuild(cutPn) {
let before = new Map();
for (let elm of this.sash.children) if (elm.pg) before.set(elm.pg, getBox(elm));
await this.whileAlive(this.build(false));
let shift = {}, moves = [];
for (let elm of this.sash.children) {
if (!elm.pg) continue;
let side = this.score.pnOf(elm.pg) >= cutPn ? "after" : "before";
let old = before.get(elm.pg), now = getBox(elm);
let d = old ? { x: old.x - now.x, y: old.y - now.y } : null;
if (d) shift[side] ??= d;
moves.push({ elm, side, d });
}
moves = moves.map(m => ({ ...m, d: m.d ?? shift[m.side] }))
.filter(({ d }) => d && (Math.abs(d.x) >= 0.5 || Math.abs(d.y) >= 0.5));
for (let { elm, d } of moves)
Object.assign(elm.style, { transition: "none", transform: `translate(${d.x}px, ${d.y}px)` });
reflow();
for (let { elm } of moves)
Object.assign(elm.style, { transition: `transform ${_gsgs_}ms ease-in-out`, transform: "" });
delayMs(_gsgs_ + 50, () => { for (let { elm } of moves) elm.style.transition = ""; });
}
async onDown(e) {
if (this.pagerClaim(e)) return;
let gen = this.navGen;
if (this.inOp) {
this.commitAnimId++;
this.inOp = false;
}
if (await this.whileAlive(super.onDown(e))) return;
if (gen != this.navGen) return;
let { LEFT, CLIENTX, WIDTH, X, VX } = this.props;
let sashLimit = this.cell.geo.sashLimit;
this.sash.setPointerCapture(e.pointerId);
let frameBox = getBox(this.frame);
let drag = new Drag(e, { minvelocity: 0.01 });
this.navMv = listen(
this.frame,
["pointermove"],
((emv) => {
let clientX = emv[CLIENTX];
if (clientX < frameBox[X] || clientX > frameBox[X] + frameBox[WIDTH]) return;
let prevSash = this.sashStart ;
this.sashStart = clamp(this.sashStart + clientX - drag.mvBuf.at(-1)[CLIENTX], sashLimit, 0);
if(this.sashStart == prevSash && drag.moved)
{ Layout.pgAlert(drag.mvBuf.at(-1)[CLIENTX] < clientX ? "start" : "end");
e.taken = true ;
}
this.sash.style[LEFT] = toEm(this.sashStart);
this.spinRollers();
drag.mv(emv) ;
}).bind(this)
);
this.navUp = listen(
this.frame,
"pointerup",
(async (eup) => {
this.navUp = null;
unlisten(this.navMv);
this.navMv = null;
drag.up(eup) ;
if(drag.jab) {
let visStart = Math.max(frameBox[X], 0);
let visEnd = Math.min(frameBox[X] + frameBox[WIDTH], window[this.props.INNERWIDTH]);
let mid = (visStart + visEnd) / 2;
let snap = this.cell.geo.pgSnap;
let step = snap < 1 ? (this.snapMap[snap] ?? 0) : snap;
if (step === "visible") step = 0;
let pace = (step || 1) * _score_[this.props.MAXWIDTH] / _score_.layout.pace ;
return this.pgSnapTo(eup[CLIENTX] > mid ? -pace : pace) ;
}
else if(drag.lift) return this.pgSnapTo(0);
else  return this.pgSnapTo(drag[VX], drag);
}).bind(this),
{ once: true }
);
}
cancelNav() {
if (!super.cancelNav()) return;
this.pgSnapTo(0);
}
async pgGoTo(pn, animated = true) {
pn = parseInt(pn);
let { pg, gap, sashLimit } = this.cell.geo;
let pgSpan = pg[this.props.WIDTH] + gap;
this.sashStart = clamp(-(pn - 1) * pgSpan, sashLimit, 0);
this.snapStep = 1;
this.snapIndex = pn - 1;
let pace = _score_[this.props.MAXWIDTH] / _score_.layout.pace;
await this.pgCommit(pn, pace, animated);
}
async pgMount(pn) {
pn = parseInt(pn);
let { LEFT, RIGHT, TOP, BOTTOM, WIDTH } = this.props;
let { gap, pgShow } = this.cell.geo;
let visibleCount = pgShow;
pgShow = Math.max(pgShow, 4);
let pgWidth = this.cell.geo.pg[WIDTH];
for (let pgElm of Array.from(this.sash.children)) {
let pg = pgElm.pg;
let sashPn = this.score.pnOf(pg);
if (sashPn < pn - pgShow || sashPn > pn + pgShow + 1) {
pgElm.remove();
this.score.pgUnuse(pg);
}
}
let last = pn + visibleCount - 1;
let out = (sashPn) => Math.max(pn - sashPn, sashPn - last, 0);
let order = [];
for (let sashPn = pn - pgShow; sashPn <= pn + pgShow + 1; sashPn++) order.push(sashPn);
order.sort((a, b) => out(a) - out(b));
for (let sashPn of order) {
let known = this.score.pgs[sashPn - 1];
if (known) known.showing = out(sashPn) == 0;
let pg = await this.whileAlive(this.score.pgUse(sashPn));
if (!pg || pg.elm.isConnected) continue;
pg.setZoom(this.cell.geo.zoom);
this.pgPad(pg);
Object.assign(pg.elm.style, {
position: "absolute",
[TOP]: toEm(gap),
[LEFT]: toEm(gap + (pgWidth + gap) * (sashPn - 1)),
[RIGHT]: "unset",
[BOTTOM]: "unset",
});
this.sash.append(pg.elm);
}
}
commitAnimId = 0;
async pgCommit(pn, pace, animated = true) {
let { LEFT, MAXWIDTH } = this.props;
const animId = ++this.commitAnimId;
this.inOp = true;
this.pnPost(pn);
this.pagerLeft.build();
this.pagerRight.build();
await this.pgMount(pn);
if (animId !== this.commitAnimId || this.destroyed) return;
let target = this.sashStart / _pxPerEm_;
let duration = ((this.snapStep || 1) * _score_[MAXWIDTH]) / pace;
if (!animated || duration <= 0) {
this.sash.style[LEFT] = target + "em";
this.inOp = false;
return;
}
let startLeft = parseFloat(this.sash.style[LEFT]) || 0;
this.spinRollers(duration);
let start = performance.now();
let step = (now) => {
if (animId !== this.commitAnimId || this.destroyed) return;
let t = Math.min((now - start) / duration, 1);
let eased = 1 - Math.pow(1 - t, 3);
this.sash.style[LEFT] = (startLeft + (target - startLeft) * eased) + "em";
if (t < 1) requestAnimationFrame(step);
else this.inOp = false;
};
requestAnimationFrame(step);
}
async pgOpen(how, bookMarks) {
if (bookMarks) return super.pgOpen(how);
if (this.inOp) return;
let pn = parseInt(_score_.numbers.pn);
let pgSnap = this.cell.geo.pgSnap;
let pgSnapStep = pgSnap < 1 ? (this.snapMap[pgSnap] ?? 0) : pgSnap;
if (pgSnapStep === "visible") pgSnapStep = 0;
let pxPerMsec = (pgSnapStep || 1) * _score_[this.props.MAXWIDTH] / _score_.layout.pace ;
switch (how) {
case "next": return this.pgSnapTo(-pxPerMsec) ;
case "prev": return this.pgSnapTo(pxPerMsec) ;
case "first": return this.pgGoTo(1) ;
case "last": return this.pgGoTo(this.score.pgs.length) ;
}
await this.pgGoTo(pn) ;
}
snapMap = {"-4":0, "-3":"visible", "-2":1/4, "-1":1/3, "0":1/2};
snapPns() {
let {gap, pgShow, pgCount} = this.cell.geo ;
let ss = this.snapStep, si = this.snapIndex;
if (ss <= 0) {
let pgWidth = this.cell.geo.pg[this.props.WIDTH];
let offset = (-this.sashStart) / (pgWidth + gap);
return [Math.floor(offset) + 1, Math.min(Math.ceil(offset + pgShow), pgCount)];
}
if (ss >= 1) {
let left = si * ss + 1;
left = Math.min(left, pgCount - pgShow + 1) ;
return [left, Math.min(left + pgShow - 1, pgCount)];
}
let q = Math.round(1 / ss);
let left  = Math.min(Math.trunc(si / q) + 1, pgCount);
let right = Math.min(Math.trunc((si + q * pgShow - 1) / q) + 1, pgCount);
return [left, right];
}
async pgSnapTo(vel, drag = null) {
let pace = Math.abs(vel) || _score_[this.props.MAXWIDTH] / _score_.layout.pace;
let { WIDTH, X, INNERWIDTH } = this.props;
let { gap, pgSnap, sashLimit } = this.cell.geo;
let pgWidth = this.cell.geo.pg[WIDTH];
let pgSpan = pgWidth + gap;
let frameBox = getBox(this.frame);
let visSize = Math.min(frameBox[X] + frameBox[WIDTH], window[INNERWIDTH]) - Math.max(frameBox[X], 0);
let snap = pgSnap < 1 ? (this.snapMap[pgSnap] ?? 0) : pgSnap;
let snapWidth;
if (snap == "visible") {
snapWidth = visSize;
this.snapStep = 0;
} else {
this.snapStep = snap;
snapWidth = pgSpan * snap;
}
if (snapWidth > 0) {
let snapIndex = Math.round(-this.sashStart / snapWidth);
if (vel > 0) snapIndex--;
else if (vel < 0) snapIndex++;
this.sashStart = -snapIndex * snapWidth;
this.snapIndex = snapIndex;
} else if(drag) {
let { to, dt } = Drag.fling(this.sashStart, sashLimit, 0, vel);
this.sashStart = to;
pace = _score_[this.props.MAXWIDTH] / dt;
}
let targetSash = this.sashStart;
this.sashStart = clamp(this.sashStart, sashLimit, 0);
if (targetSash != this.sashStart)
Layout.pgAlert(targetSash > 0 ? "start" : "end");
if (snapWidth > 0)
this.snapIndex = Math.round(-this.sashStart / snapWidth);
let [newPn] = this.snapPns();
await this.pgCommit(newPn, pace);
}
spinRollers(dur = 0) {
let until = performance.now() + dur;
let { LEFT, RIGHT, OFFSETLEFT, OFFSETWIDTH } = this.props;
let rollGirth = this.leftRoll[OFFSETWIDTH];
let leftStyle = this.leftRollPattern.style;
let rightStyle = this.rightRollPattern.style;
leftStyle[LEFT] = rightStyle[RIGHT] = "unset";
let track = () => {
let rollPos = this.sash[OFFSETLEFT] % rollGirth;
leftStyle[RIGHT] = rollPos + "px";
rightStyle[LEFT] = -rollPos - rollGirth + "px";
if (performance.now() < until) delay(3, () => track());
else this.sash.style.transition = "unset";
};
track();
}
}
class TableLayout extends Layout {
static gridMargin = `${1.25 / _dvPxRt_}em`;
static css = css(
"TableLayout",
`
.TableLayout__table {
position: absolute;
touch-action:none;
overflow:hidden;
}
.TableLayout__grid {
margin: ${TableLayout.gridMargin};
position:relative;
}
.TableLayout__pg {
box-shadow: -.05em .05em 0.5em #8888, .25em .25em 1.5em #8888;
background-size: contain;
z-index: 1;
background-repeat: no-repeat;
background-position: center center;
}
.TableLayout__pg-active {
/* active page is larger than others, and on top in z-order */
transform: scale(1.15);
z-index: 3;
}
.TableLayout__pn {
position:absolute;
font-size:${1 / _dvPxRt_}em;
line-height:${1 / _dvPxRt_}em;
text-shadow: .075em 0 .2em #bbb, -.075em 0 .2em #bbb, 0 .075em .2em #bbb, 0 -.075em .2em #bbb;
pointer-events: none;
z-index: 2;
}
`
);
bMarkTimer = new Schedule();
active = null;
elm = helm(`
<div data-tag="TableLayout" class="pz">
<div data-tag="layout" class="Layout TableLayout__table">
<div data-tag="grid" class="TableLayout__grid">
</div>
<div>
</div>
`);
constructor(score, cell) {
super(score, cell);
Object.assign(this, dataIndex("tag", this.elm));
_body_.append(this.elm);
this.pointerListener = listen(this.layout, ["pointerdown"], this.onDown.bind(this));
}
destructor() {
this.buildDialog?.remove();
this.buildDialog = null;
super.destructor();
unlisten(this.pointerListener);
}
async doBuild(animated=true) {
this.animated = animated;
if(this.active) {
this.active.classList.remove("TableLayout__pg-active");
this.active.querySelector(".canvas-container")?.remove();
this.active = null;
}
Object.assign(this, this.cell.stash);
let { grid, pages, score, layout } = this;
clearChildren(grid);
this.elm.style.fontSize = "1em";
let gridMargin = parseFloat(TableLayout.gridMargin) * _pxPerEm_;
let tableWidth = innerWidth - Layout.margin * 2 ;
let gridWidth = tableWidth - gridMargin * 2;
let hStep = this.horizontalGap * 0.01 + 1;
let vStep = this.verticalGap * 0.01 + 1;
let pgWidth = gridWidth / ((pages - 1) * hStep + 1);
let pgHeight = (score.maxHeight / score.maxWidth) * pgWidth;
layout.style.width = toEm(tableWidth);
grid.style.width = `calc(${toEm(tableWidth)} - ${gridMargin * 2}px)`;
this.pgWidth = pgWidth;
this.pgHeight = pgHeight;
this.gridMargin = gridMargin;
this.gridCoords = [];
let xStep = pgWidth * hStep;
let yStep = pgHeight * vStep;
let pgCount = score.pgs.length;
for (let pn = 1, top = 0; pn <= pgCount; top += yStep) {
for (let col = 0, left = 0; col < pages && pn <= pgCount; pn++, col++, left += xStep)
this.gridCoords.push({pn, top,  left});
}
this.toXY(Layout.margin, Layout.margin + gridMargin + pgHeight / 2);
if(this.score.pgs.find((pg) => pg.thumbElm == null)) {
let cancelled = false;
let dialogElm = this.buildDialog = dialog("",{ Cancel: { svg: "Cancel" } }, (e,_x,_y,args) => {
cancelled = true;
args.close();
});
let gen = async(i) => {
if(this.destroyed) return;
dialogElm.firstChild.innerHTML = `Building: ${Math.round((i/pgCount)* 100)}%<hr>`;
let {pn, top} = this.gridCoords[i];
let gridHeight = top + pgHeight;
grid.style.height = toEm(gridHeight);
let nextTop = innerHeight - gridHeight - Layout.margin;
if (nextTop < Layout.margin) this.toXY(Layout.margin, nextTop);
let elm = await this.buildPg(pn);
if(!elm) return;
grid.append(elm);
if(++i < this.gridCoords.length && !cancelled)  {
this.animated ? delay(1, async () => await gen(i)): await(gen(i));
}
else {
dialogElm.buttonsElm.self.fire("Cancel");
this.buildDialog = null;
this.buildAux();
}
}
await gen(0);
}
else {
for(let {pn, top} of this.gridCoords) {
let gridHeight = top + pgHeight ;
grid.style.height = toEm(gridHeight);
let nextTop = innerHeight - gridHeight - Layout.margin;
if (nextTop < Layout.margin) this.toXY(Layout.margin, nextTop);
let elm = await this.buildPg(pn);
if(!elm) return;
grid.append(elm);
}
this.buildAux() ;
}
}
place() {
this.elm.style.transition = "unset";
reflow();
Object.assign(this.elm.style, this.centerLT());
}
buildAux() {
let iconBox = getBox(dataIndex("tag", this.cell.elm).cellIcon);
let pz = this.userPz();
if (pz || this.animated) numb(this.elm, _gs_);
if(pz)
animate(this.elm, { left:iconBox.x + iconBox.width / 2 + "px", top:iconBox.y + iconBox.height / 2 + "px", fontSize: 0},
pz, `all ${_gs_}ms`);
else {
if(this.fit == "Height") {
let h = this.layout.offsetHeight;
if (h > 0) this.elm.style.fontSize = (innerHeight - Layout.margin * 2) / h + "em";
}
if(this.animated)
animate(this.elm, { left:iconBox.x + iconBox.width / 2 + "px", top:iconBox.y + iconBox.height / 2 + "px", fontSize: 0},
this.centerLT({ fontSize: this.elm.style.fontSize}), `all ${_gs_}ms`);
}
}
async buildPg(pn)
{
let {left, top} = this.gridCoords[pn-1];
let pg = this.score.pgs[pn - 1];
let elm = await this.whileAlive(pg.getThumbElm(false, () => this.destroyed));
if(!elm) return;
elm.classList.remove("TableLayout__pg-active");
elm.pn = pn;
elm.pg = pg;
Object.assign(elm.style,{
position:"absolute",
height:toEm(this.pgHeight),
width:toEm(this.pgWidth),
left:toEm(left),
top:toEm(top),
});
if(this.pnAxis() != null) {
let pnElm = elm.getElementsByClassName("TableLayout__pn").item(0) || helm(`<div class="TableLayout__pn"></div>`);
pnElm.pg = pg;
pnElm.pn = pn;
Object.assign(pnElm.style, {
background: this.score.pgs[pn -1].bookmark  || "unset",
top: 0,
left: 0,
});
elm.append(pnElm);
pnToDiv(pn, pnElm, false);
}
else
clearChildren(elm);
if (pn == _score_.numbers.pn)
await this.buildPgActive(pn, elm)
else this.score.pgUnuse(pg);
return elm;
}
async buildPgActive(pn, elm) {
if (this.active) {
let inactive = await this.whileAlive(this.active.pg.getThumbElm(true, () => this.destroyed));
if(!inactive) return;
inactive.pg = this.active.pg;
inactive.pn = this.active.pn;
let pnElm = this.active.querySelector(".TableLayout__pn");
if(pnElm) inactive.append(pnElm);
this.score.pgUnuse(inactive.pg);
let {left, top} = this.gridCoords[inactive.pn-1];
Object.assign(inactive.style,{
position:"absolute",
height:toEm(this.pgHeight),
width:toEm(this.pgWidth),
left:toEm(left),
top:toEm(top),
});
this.active.replaceWith(inactive);
}
let known = this.score.pgs[pn - 1];
if (known) known.showing = true;
let pg = elm.pg = await this.whileAlive(this.score.pgUse(pn, false));
if (!pg || !pg.elm) return;
elm.pn = pn;
pg.elm.style.display = "block";
pg.setZoom(this.pgHeight / pg.score.maxHeight);
this.pgPad(pg);
elm.append(pg.elm);
elm.classList.add("TableLayout__pg-active");
this.active = elm;
}
Organizer = class {
splits = [null, null, null, null];
splitsStyle = ['', '', '', ''];
constructor(e, layout) {
this.e = e;
this.layout = layout;
this.gridMargin = parseInt(this.layout.gridMargin);
this.active = this.layout.active;
let actBox = getBox(this.active);
Object.assign(this.active.style, {
pointerEvents: "none",
position: "absolute",
opacity: ".75",
zIndex: 99,
fontSize: this.layout.elm.style.fontSize
});
this.offset = { x: actBox.width / 2, y:actBox.height / 2};
_body_.append(this.active);
let box = getBox(e.target);
this.splitsTransform = [-4, -2, 2, 4].map(d => `translateX(${box.width/d}px)`);
}
mv(emv) {
let {splits, splitsStyle} = this;
this.active.style.left = emv.clientX - this.offset.x + "px";
this.active.style.top = emv.clientY - this.offset.y + "px";
let target = document.elementFromPoint(emv.clientX, emv.clientY);
if(target?.classList.contains("TableLayout__pg")) {
let box = getBox(target);
let newSplits = emv.clientX < box.x + box.width / 2
? [target.previousSibling?.previousSibling,target.previousSibling,
target, target?.nextSibling]
: [target?.previousSibling,target,
target.nextSibling, target.nextSibling?.nextSibling];
if(newSplits[1] != splits[1] || newSplits[2] != splits[2]) {
splits.forEach((elm, i) => elm && (elm.style.cssText = splitsStyle[i]));
newSplits.forEach((elm, i) => {
if(elm) {
splitsStyle[i] = elm.style.cssText;
elm.style.transform = this.splitsTransform[i];
elm.style.transition = "250ms ease-in-out";
}
});
this.splits = newSplits;
}
this.toPn = this.splits[1]?.pn || 0;
}
else if(!target?.closest(".TableLayout__table")) {
this.splits.forEach((elm, i) => elm && (elm.style.cssText = this.splitsStyle[i]));
this.toPn = null;
}
else if(this.toPn == null)
this.toPn = this.active.pn;
}
async up() {
this.splits.forEach((elm, i) => elm && (elm.style.cssText = this.splitsStyle[i]));
let score = this.layout.score;
if(this.toPn == null) {
this.layout.pasting = true ;
let active = this.active;
score.pgCut(active.pn);
let pasteCell = _menu_.rings.page.cells.paste ;
if (pasteCell.pg) pasteCell.pg.deflate(true);
pasteCell.pg = await active.pg.clone(true);
Object.assign(active.style, { pointerEvents: "auto", opacity: "1", zIndex: 2, fontSize: ""});
this.layout.animateToCell(active.pg, getBox(active.pg.elm), false, _menu_.rings.page.cells.paste, "table",
() => this.layout.build(false));
_menu_.enableCells("page/paste") ;
return;
}
if(this.active.pn > this.toPn) this.toPn++;
score.pgMv(this.active.pn, this.toPn);
if(this.toPn == 1) this.layout.grid.prepend(this.active);
else {
let sibling = this.layout.grid.children.item(this.toPn-2);
if (sibling) sibling.after(this.active);
else this.layout.grid.append(this.active);
}
Object.assign(this.active.style, { pointerEvents: "auto", opacity: "1", zIndex: 2, fontSize: ""});
for(let {left, pn, top} of this.layout.gridCoords) {
let elm = score.pgs[pn-1]?.thumbElm;
if (!elm) continue;
let pnElm = elm.querySelector(".TableLayout__pn");
if(pnElm) pnToDiv(pn, pnElm, false);
elm.pn = pn;
elm.pg = score.pgs[pn-1];
Object.assign(elm.style, { left:toEm(left), top:toEm(top) });
}
this.layout.pnPost(this.toPn);
}
}
async onDown(e) {
let gen = this.navGen;
if (await this.whileAlive(super.onDown(e))) return;
if (gen != this.navGen) return;
this.layout.setPointerCapture(e.pointerId);
let elm = e.target.closest(".TableLayout__pg");
if(!elm) return;
e.taken = true ;
let {pg, pn} = elm;
let pnElm = elm.querySelector(".TableLayout__pn");
if(pnElm) {
this.bMarkTimer.run(_gs_, () => {
if(pg.bookmark) {
pg.bookmark = null;
pnElm.style.background = "unset";
} else pnElm.style.background = pg.bookmark = nextBkColor(pg);
_body_.dispatchEvent(new CustomEvent("BOOKMARK"));
});
};
let drag = new Drag(e) ;
let cursor = null;
this.navMv = null;
let built = false;
this.navUp = listen(this.layout, "pointerup", async (eup) => {
this.navUp = null;
this.bMarkTimer.cancel();
let finale = () => {
if(!built) delay(1, () => finale());
else {
unlisten(this.navMv);
this.navMv = null;
if(cursor) cursor.up(eup);
}
}
finale();
},
{ once: true }
);
try {
await this.pgGoTo(pn);
} finally {
built = true;
}
this.navMv = listen(this.layout, "pointermove", (emv) => {
drag.mv(emv) ;
if(drag.moved) {
if(this.score.pgs.length == 1) {
toast("Can't cut last page.");
return;
}
this.bMarkTimer.cancel();
if(!cursor && !this.active) return;
if(this.score.music) return;
if(!cursor) cursor = new this.Organizer(e, this);
cursor.mv(emv);
}
});
}
cancelNav() {
this.bMarkTimer.cancel();
super.cancelNav();
}
async pgGoTo(pn) {
if (this.active?.pn == pn) return;
let elm = this.grid.children.item(pn - 1);
if (!elm) return;
this.inOp = true;
this.pnPost(pn);
await this.buildPgActive(pn, elm);
this.inOp = false;
}
async pgOpen(how, bookMarks) {
if (bookMarks) return super.pgOpen(how);
if (this.inOp) return;
let pn = _score_.numbers.pn;
let pgCount = this.score.pgs.length;
switch (how) {
case "next":
if (pn + 1 > pgCount) return;
++pn;
break;
case "prev":
if (pn - 1 <= 0) return;
--pn;
break;
case "first":
pn = 1;
break;
case "last":
pn = pgCount;
break;
}
await this.pgGoTo(pn);
}
renumber() {
for (let pnElm of [...document.getElementsByClassName("TableLayout__pn")])
pnToDiv(pnElm.pn, pnElm, false);
}
toXY(x = null, y = null) {
if (this.animated) {
let box = getBox(this.elm.firstElementChild);
if (x) this.elm.style.left = x + box.width / 2 + "px";
if (y) this.elm.style.top = y + box.height / 2 + "px";
}
}
}
class Pager {
static css = css(
"Pager", `
.Pager {
position:absolute;
top:0;
font-size: ${50 / _dvPxRt_}px;
line-height: ${50 / _dvPxRt_}px;
text-align:center;
transition: opacity 350ms ease-in-out;
}
.Pager__cursor {
position:absolute;
color: #1f2328;
text-shadow: .5px .5px #fff6,-1px -1px #fff6,.5px -1px #fff6,-1px .5px #fff6;
z-Index:1;
border-radius: .4em;
background-color: #0000;
width:100%;
}
.Pager__cursor-active {
background: #8884;
}
.Pager__bookmark {
position:absolute;
opacity:.75;
border-radius:.5em;
}
.Pager--hidden .Pager__cursor,
.Pager--hidden .Pager__bookmark { visibility: hidden; }`);
static id = 0;
static width = 45 / _dvPxRt_;
static tabMin = 10 / _dvPxRt_;
static tabReach = 20 / _dvPxRt_;
static reach = 15 / _dvPxRt_;
elm = helm(
`<div data-tag="pager" class="Pager notranslate" translate="no">
<div data-tag="cursor" class="Pager__cursor"></div>
</div>`
);
constructor(position, formatFunc) {
Object.assign(this, dataIndex("tag", this.elm));
this.formatFunc = formatFunc;
this.setPosition(position);
this.bMarkTimer = new Schedule();
this.cursorBackground = cssIndex("Pager", ".Pager__cursor", "background-color");
this.ptrMsgBackground = cssIndex("ptrMsg", ".ptrMsg", "background-color");
this.pnListener = listen(_body_, "NUMBERS", (e) => {
if (e.detail.sender === this) return;
this.buildCursor();
});
this.bookmarkListener = listen(_body_, ["BOOKMARK"], (e) => this.buildBookmarks());
this.pointerListener = listen(this.elm, "pointerdown", (e) => this.onDown(e));
this.resizeObserver = new ResizeObserver(() => this.buildCursor());
this.resizeObserver.observe(this.pager);
this.buildBookmarks();
}
destructor() {
this.resizeObserver.disconnect();
unlisten(this.pnListener, this.bookmarkListener, this.pointerListener);
}
setPosition(position) {
this.position = position;
this.props = ["left", "right"].includes(position) ? NORMAL_PROPS : ORTHO_PROPS;
let { WIDTH, HEIGHT, TOP } = this.props;
Object.assign(this.pager.style, { top: "auto", bottom: "auto", left: "auto", right: "auto" });
Object.assign(this.cursor.style, { width: "", height: "", top: "", left: "" });
this.pager.style[WIDTH] = this.cursor.style[WIDTH] = this.cursor.style[HEIGHT] = Pager.width + "px";
this.pager.style[HEIGHT] = "100%";
this.pager.style[TOP] = 0;
this.pager.style[position] = 0;
}
setHidden(hidden, narrowWidthPx) {
let { WIDTH } = this.props;
this.pager.style[WIDTH] = (hidden ? narrowWidthPx : Pager.width) + "px";
this.pager.classList.toggle("Pager--hidden", hidden);
}
build() {
this.buildCursor();
this.buildBookmarks();
}
buildCursor() {
let { HEIGHT, WIDTH, TOP } = this.props;
let pagerBox = getBox(this.pager);
let cursorHeight = pagerBox[WIDTH];
this.cursor.style[HEIGHT] = cursorHeight + "px";
this.cursor.style.lineHeight = this.cursor.style.fontSize ;
let topPx = (_score_.numbers.pn -1) * (pagerBox[HEIGHT] - cursorHeight) / (_score_.pgs.length - 1);
this.cursor.style[TOP] = 100 * topPx / pagerBox[HEIGHT] + "%";
let bkCl = _score_.pgs[_score_.numbers.pn - 1]?.bookmark;
this.cursor.style.color = bkCl || "";
this.formatFunc(_score_.numbers, false, this.cursor);
}
buildBookmarks() {
let { LEFT, HEIGHT, TOP, WIDTH } = this.props;
for (let elm of [...this.elm.children]) if (elm.dataset.tag == "bookmark") elm.remove();
let pgCount = _score_.pgs.length;
let span = `(100% - ${Pager.width}px)`;
let length = `max(${span} / ${pgCount}, ${Pager.tabMin}px)`;
let leftPercent = ["left", "top"].includes(this.position) ? 70 : -10;
_score_.pgs.forEach((pg, i) => {
if(!pg.bookmark) return;
let elm = helm(
`<div data-tag="bookmark" class="Pager__bookmark"
style="${TOP}:calc(${Pager.width / 2}px + ${span} * ${(i + 0.5) / pgCount} - ${length} / 2);
${HEIGHT}:${length};${WIDTH}:40%;${LEFT}:${leftPercent}%"></div>`
);
elm.pn = i + 1;
elm.style.backgroundColor =
typeof pg.bookmark == "string" && CSS.supports("color", pg.bookmark)
? pg.bookmark : "#ff0000";
this.elm.append(elm);
});
}
tabClaims(box) {
let { HEIGHT, Y } = this.props;
let pgCount = _score_.pgs.length;
let travel = box[HEIGHT] - Pager.width;
let marks = [];
_score_.pgs.forEach((pg, i) => {
if (pg.bookmark) marks.push({ pn: i + 1, at: box[Y] + Pager.width / 2 + (travel * (i + 0.5)) / pgCount });
});
let reach = Math.max(travel / pgCount, Pager.tabReach) / 2;
return marks.map(({ pn, at }, i) => ({
pn,
from: Math.max(at - reach, i > 0 ? (marks[i - 1].at + at) / 2 : -Infinity),
to: Math.min(at + reach, i + 1 < marks.length ? (at + marks[i + 1].at) / 2 : Infinity),
}));
}
claim(e) {
if (!_score_ || this.pager.classList.contains("Pager--hidden")) return null;
let { WIDTH, HEIGHT, X, Y, CLIENTX, CLIENTY, INNERWIDTH } = this.props;
let box = getBox(this.pager);
let [along, across] = [e[CLIENTY], e[CLIENTX]];
if (along < box[Y] || along > box[Y] + box[HEIGHT]) return null;
let inward = ["left", "top"].includes(this.position) ? 1 : -1;
let beyond = (dir) => (across - box[X] - (dir > 0 ? box[WIDTH] : 0)) * dir;
if (beyond(inward) <= Pager.reach && (across - box[X] - box[WIDTH] / 2) * inward > 0) {
let tab = this.tabClaims(box).find((claim) => along >= claim.from && along <= claim.to);
if (tab) return tab;
}
let spare = inward > 0 ? box[X] : window[INNERWIDTH] - box[X] - box[WIDTH];
if (beyond(inward) <= 0 && beyond(-inward) <= Math.min(Pager.reach, spare)) return "scrub";
return null;
}
tryClaim(e) {
if (e.taken || !this.claim(e)) return false;
this.onDown(e, true);
return true;
}
onDown(e, outside = false) {
e.taken = true ;
if (outside && this.props === NORMAL_PROPS) e.swipeTaken = true;
e.stopImmediatePropagation();
let drag = new Drag(e) ;
let { TOP, WIDTH, HEIGHT, CLIENTX, CLIENTY, X, Y } = this.props;
let { cursor, pager } = this;
let pgCount = _score_.pgs.length;
let cursorBox = getBox(cursor);
let pagerBox = getBox(pager);
if (!outside) pager.setPointerCapture(e.pointerId);
cursor.classList.add("Pager__cursor-active");
let claimed = this.claim(e);
let tab = claimed && claimed != "scrub" ? claimed : null;
let pnAtDown = _score_.numbers.pn;
let travel = pagerBox[HEIGHT] - cursorBox[HEIGHT];
let bMark =
!pager.classList.contains("Pager--hidden") &&
(!!tab ||
Math.abs(e[CLIENTY] - cursorBox[Y] - cursorBox[HEIGHT] / 2) <= Pager.width * 1.5);
let bMarked = false;
let ptrDiv = ptrMsg(e, (e,div) => this.formatFunc(_score_.numbers, true, div) && false, `width: ${cursor.style.width};display:block;text-align:center;`);
let prevPos = e[CLIENTY];
let cursorTop = tab
? ((tab.pn - 0.5) * travel) / pgCount
: clamp(e[CLIENTY] - pagerBox[Y] - cursorBox[HEIGHT] / 2, 0, travel);
let cursorOffset = pagerBox[Y] + cursorBox.height ;
let setCursor = (clientPos, delta) => {
let dPos = clientPos - prevPos ;
prevPos = clientPos;
let t = Math.max(0, delta / pagerBox[WIDTH] - 0.5);
let unitsPerPx = pgCount / pagerBox[HEIGHT];
let sensitivity = 1 + t * unitsPerPx * _sliderPrecision_;
cursorTop = clamp(cursorTop + dPos / sensitivity, 0, travel);
cursor.style[TOP] = cursorTop + "px";
_score_.numbers.pn = Math.min(Math.floor(pgCount * cursorTop / travel) + 1, pgCount);
let bkCl = _score_.pgs[_score_.numbers.pn -1].bookmark;
cursor.style.color = bkCl || "";
ptrDiv.style.backgroundColor = bkCl || "";
ptrDiv.style.color = bkCl ? contrastColor(bkCl) : "";
clearChildren(cursor);
clearChildren(this.cursor);
this.formatFunc(_score_.numbers, true, this.cursor);
};
setCursor(e[CLIENTY], 0) ;
this.formatFunc(_score_.numbers, true, ptrDiv);
if (bMark) this.bMarkTimer.run(_gs_, () => {
let pg = _score_.pgs[(tab ? tab.pn : pnAtDown) - 1];
let bkCl = (pg.bookmark = pg.bookmark ? null : nextBkColor(pg));
ptrDiv.style.backgroundColor = bkCl || "";
ptrDiv.style.color = bkCl ? contrastColor(bkCl) : "";
bMarked = true;
this.give(pnAtDown);
this.formatFunc(_score_.numbers, true, ptrDiv);
_body_.dispatchEvent(new CustomEvent("BOOKMARK"));
});
let mine = (ev) => ev.pointerId == e.pointerId;
let mv = listen(_body_, "pointermove", (emv) => {
if (!mine(emv)) return;
drag.mv(emv) ;
if(drag.moved) this.bMarkTimer.cancel();
setCursor(emv[CLIENTY], Math.abs(emv[CLIENTX] - cursorBox[X] - cursorBox[WIDTH]/2));
}, { capture: true });
let up = listen(_body_, "pointerup", (eup) => {
if (!mine(eup)) return;
unlisten(mv, up);
this.cursor.classList.remove("Pager__cursor-active");
this.bMarkTimer.cancel();
if (bMarked) return;
if (outside && !e.swipeTaken && Math.abs(eup.clientY - e.clientY) > _swipeDelta_())
return this.give(pnAtDown);
setCursor(eup[CLIENTY], Math.abs(eup[CLIENTX] - cursorBox[X] - cursorBox[WIDTH]/2));
this.buildCursor();
_body_.dispatchEvent(new CustomEvent("NUMBERS", { detail: {sender:this, tag:"pn" }}));
},
{ capture: true }
);
}
give(pn) {
_score_.numbers.pn = pn;
this.buildCursor();
}
}
window._Layout_ = Layout;
let rectoWarm = "url('data:image/svg+xml;base64,ICAgICAgPHN2ZyB3aWR0aD0nM2VtJyBoZWlnaHQ9JzNlbScgdmlld0JveD0nMCAwIDEwMCAxMDAnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zyc+CiAgICAgICAgPGZpbHRlciBpZD0ncGFwZXJGaWx0ZXInPgogICAgICAgICAgPGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9JzAuNScgCiAgICAgICAgICAgcmVzdWx0PSdub2lzZScgbnVtT2N0YXZlcz0iNCIgc3RpdGNoVGlsZXM9J3N0aXRjaCcgc2VlZD0nNDInLz4KICAgICAgICAgIDxmZUNvbG9yTWF0cml4IGluPSdub2lzZScgdHlwZT0nc2F0dXJhdGUnIHZhbHVlcz0nMCcvPgogICAgICAgICAgPGZlQ29tcG9uZW50VHJhbnNmZXI+CiAgICAgICAgICAgIDxmZUZ1bmNBIHR5cGU9J2xpbmVhcicgc2xvcGU9JzAuMycgaW50ZXJjZXB0PScwLjUnLz4KICAgICAgICAgICAgPC9mZUNvbXBvbmVudFRyYW5zZmVyPgogICAgICAgICAgICA8ZmVDb21wb3NpdGUgaW4yPSdTb3VyY2VHcmFwaGljJyBvcGVyYXRvcj0nbXVsdGlwbHknIHJlc3VsdD0ndGV4dHVyZWQnLz4KICAgICAgICAgIDwvZmlsdGVyPiAgCiAgICAgICAgICA8cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjQ0Q4NTNGJyBmaWx0ZXI9J3VybCgjcGFwZXJGaWx0ZXIpJy8+CiAgICAgICAgPC9zdmc+')";
let versoWarm = "url('data:image/svg+xml;base64,ICA8IS0tIGxlYXRoZXItd29ybi1hbWJlci5zdmcgLS0+CiAgPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTI4Ij4KICAgIDxkZWZzPgogICAgICA8ZmlsdGVyIGlkPSJsZWF0aGVyV2VhciIgY29sb3ItaW50ZXJwb2xhdGlvbi1maWx0ZXJzPSJzUkdCIj4KICAgICAgICA8IS0tIGxhcmdlIG9yZ2FuaWMgZ3JhaW4gcGF0dGVybiAtLT4KICAgICAgICA8ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIKICAgICAgICAgIGJhc2VGcmVxdWVuY3k9IjAuMjMiIG51bU9jdGF2ZXM9IjMiIHNlZWQ9IjgiCiAgICAgICAgICBzdGl0Y2hUaWxlcz0ic3RpdGNoIiByZXN1bHQ9Im5vaXNlIi8+CiAgICAgICAgPGZlQ29sb3JNYXRyaXggaW49Im5vaXNlIiB0eXBlPSJtYXRyaXgiCiAgICAgICAgICB2YWx1ZXM9IjEuNyAwIDAgMCAwCiAgICAgICAgICAgICAgICAgIDAgMS43IDAgMCAwCiAgICAgICAgICAgICAgICAgIDAgMCAxLjcgMCAwCiAgICAgICAgICAgICAgICAgIDAgMCAwIDEgMCIgcmVzdWx0PSJjb250cmFzdCIvPgogICAgICAgIDxmZURpZmZ1c2VMaWdodGluZyBpbj0iY29udHJhc3QiCiAgICAgICAgICBzdXJmYWNlU2NhbGU9IjIuOCIgZGlmZnVzZUNvbnN0YW50PSIxLjE1IgogICAgICAgICAgbGlnaHRpbmctY29sb3I9IiNmZmY5ZTAiIHJlc3VsdD0ibGl0Ij4KICAgICAgICAgIDxmZURpc3RhbnRMaWdodCBhemltdXRoPSIyMzAiIGVsZXZhdGlvbj0iNTUiLz4KICAgICAgICA8L2ZlRGlmZnVzZUxpZ2h0aW5nPgogICAgICAgIDxmZUJsZW5kIGluPSJjb250cmFzdCIgaW4yPSJsaXQiIG1vZGU9Im11bHRpcGx5IiByZXN1bHQ9ImdyYWluIi8+CiAgICAgIDwvZmlsdGVyPgogICAgPC9kZWZzPgogICAgPHJlY3Qgd2lkdGg9IjEyOCIgaGVpZ2h0PSIxMjgiIGZpbGw9IiNmODhhMmQiLz4KICAgIDwhLS0gdGV4dHVyZSBvdmVybGF5IC0tPgogICAgPHJlY3Qgd2lkdGg9IjEyOCIgaGVpZ2h0PSIxMjgiIGZpbHRlcj0idXJsKCNsZWF0aGVyV2VhcikiIG9wYWNpdHk9IjAuMjgiLz4KICA8L3N2Zz4KICA=')";
css("layout-themes", `
:root {
--recto: ${Layout.recto};
--verso: ${ScrollLayout.verso};
--layout-gradient: linear-gradient(145deg, #ffffff0a 0%, #00000055 100%);
--layout-border-color: #222;
--roll-cap-color: #181818;
}
[data-theme="Light"] {
--recto: ${rectoWarm};
--verso: ${versoWarm};
--layout-gradient: linear-gradient(145deg, #f958 0%, #A748 100%);
--layout-border-color: #8B4513;
--roll-cap-color: #8B4513;
}
[data-scroll-orient="h"] .ScrollLayout__roll {
box-shadow: 0 -3px 0 var(--roll-cap-color), 0 3px 0 var(--roll-cap-color);
}
[data-scroll-orient="v"] .ScrollLayout__roll {
box-shadow: -3px 0 0 var(--roll-cap-color), 3px 0 0 var(--roll-cap-color);
}
`);
// #inclusion src/smufl.js minified
export { smuflTable };
let smuflTable = {
"Recent": "",
"Basic": "",
"Signatures": "",
"4.1. Staff brackets and dividers": "",
"4.2. Staves": "",
"4.3. Barlines": "",
"4.4. Repeats": "",
"4.5. Clefs": "",
"4.6. Time signatures": "",
"4.7. Noteheads": "",
"4.8. Slash noteheads": "",
"4.9. Round and square noteheads": "",
"4.10. Note clusters": "",
"4.11. Note name noteheads": "",
"4.12. Shape note noteheads": "",
"4.13. Individual notes": "",
"4.14. Beamed groups of notes": "",
"4.15. Stems": "",
"4.16. Tremolos": "",
"4.17. Flags": "",
"4.18. Standard accidentals (12-EDO)": "",
"4.19. Gould arrow quartertone accidentals (24-EDO)": "",
"4.20. Stein-Zimmermann accidentals (24-EDO)": "",
"4.21. Extended Stein-Zimmermann accidentals": "",
"4.22. Sims accidentals (72-EDO)": "",
"4.23. Johnston accidentals (just intonation)": "",
"4.24. Extended Helmholtz-Ellis accidentals (just intonation)": "",
"4.25. Spartan Sagittal single-shaft accidentals": "",
"4.26. Spartan Sagittal multi-shaft accidentals": "",
"4.27. Athenian Sagittal extension (medium precision) accidentals": "",
"4.28. Trojan Sagittal extension (12-EDO relative) accidentals": "",
"4.29. Promethean Sagittal extension (high precision) single-shaft accidentals": "",
"4.30. Promethean Sagittal extension (high precision) multi-shaft accidentals": "",
"4.31. Herculean Sagittal extension (very high precision) accidental diacritics": "",
"4.32. Olympian Sagittal extension (extreme precision) accidental diacritics": "",
"4.33. Magrathean Sagittal extension (insane precision) accidental diacritics": "",
"4.34. Wyschnegradsky accidentals (72-EDO)": "",
"4.35. Arel-Ezgi-Uzdilek (AEU) accidentals": "",
"4.36. Turkish folk music accidentals": "",
"4.37. Persian accidentals": "",
"4.38. Other accidentals": "",
"4.39. Articulation": "",
"4.40. Holds and pauses": "",
"4.41. Rests": "",
"4.42. Bar repeats": "",
"4.43. Octaves": "",
"4.44. Dynamics": "",
"4.45. Lyrics": "",
"4.46. Common ornaments": "",
"4.47. Other baroque ornaments": "",
"4.48. Combining strokes for trills and mordents": "",
"4.49. Precomposed trills and mordents": "",
"4.50. Brass techniques": "",
"4.51. Wind techniques": "",
"4.52. String techniques": "",
"4.53. Plucked techniques": "",
"4.54. Vocal techniques": "",
"4.55. Keyboard techniques": "",
"4.56. Harp techniques": "",
"4.57. Tuned mallet percussion pictograms": "",
"4.58. Chimes pictograms": "",
"4.59. Drums pictograms": "",
"4.60. Wooden struck or scraped percussion pictograms": "",
"4.61. Metallic struck percussion pictograms": "",
"4.62. Bells pictograms": "",
"4.63. Cymbals pictograms": "",
"4.64. Gongs pictograms": "",
"4.65. Shakers or rattles pictograms": "",
"4.66. Whistles and aerophones pictograms": "",
"4.67. Miscellaneous percussion instrument pictograms": "",
"4.68. Beaters pictograms": "",
"4.69. Percussion playing technique pictograms": "",
"4.70. Handbells": "",
"4.71. Guitar": "",
"4.72. Chord diagrams": "",
"4.73. Analytics": "",
"4.74. Chord symbols": "",
"4.75. Tuplets": "",
"4.76. Conductor symbols": "",
"4.77. Accordion": "",
"4.79. Medieval and Renaissance staves": "",
"4.80. Medieval and Renaissance clefs": "",
"4.81. Medieval and Renaissance prolations": "",
"4.82. Medieval and Renaissance noteheads and stems": "",
"4.83. Medieval and Renaissance individual notes": "",
"4.84. Medieval and Renaissance oblique forms": "",
"4.85. Medieval and Renaissance plainchant single-note forms": "",
"4.86. Medieval and Renaissance plainchant multiple-note forms": "",
"4.87. Medieval and Renaissance plainchant articulations": "",
"4.88. Medieval and Renaissance accidentals": "",
"4.89. Medieval and Renaissance rests": "",
"4.90. Medieval and Renaissance miscellany": "",
"4.91. Medieval and Renaissance symbols in CMN": "",
"4.92. Daseian notation": "",
"4.93. Figured bass": "",
"4.94. Function theory symbols": "",
"4.95. Multi-segment lines": "",
"4.96. Electronic music pictograms": "",
"4.97. Arrows and arrowheads": "",
"4.99. Renaissance lute tablature": "",
"4.100. French and English Renaissance lute tablature": "",
"4.101. Italian and Spanish Renaissance lute tablature": "",
"4.102. German Renaissance lute tablature": "",
"4.103. Kievan square notation": "",
"4.104. Kodály hand signs": "",
"4.105. Simplified Music Notation": "",
"4.106. Miscellaneous symbols": "",
"4.107. Time signatures supplement": "",
"4.108. Octaves supplement": "",
"4.109. Metronome marks": "",
"4.110. Figured bass supplement": "",
"4.111. Shape note noteheads supplement": "",
"4.112. Turned time signatures": "",
"4.113. Reversed time signatures": "",
"4.114. Function theory symbols supplement": "",
"4.115. Fingering": "",
"4.116. Arabic accidentals": "",
"4.117. Articulation supplement": "",
"4.118. Stockhausen accidentals (24-EDO)": "",
"4.119. Standard accidentals for chord symbols": "",
"4.120. Clefs supplement": "",
"4.121. Fingering supplement": "",
"4.122. Kahnotation": "",
"4.123. German organ tablature": "",
"4.124. Extended Helmholtz-Ellis accidentals (just intonation) supplement": "",
"4.125. Other accidentals supplement": "",
"4.126. Techniques noteheads": "",
"4.127. Chop (percussive bowing) notation": "",
"4.128. Medieval and Renaissance prolations supplement": "",
"4.129. Noteheads supplement": "",
"4.130. Note name noteheads supplement": "",
"4.131. Scale degrees": "",
};
// #inclusion src/panel.js minified
class Select {
static css = css(
"Select", `
mark {
background-color: #aaa;
}
.Select__toggle {
border:2px solid black;
border-radius:var(--borderRadius);
font-family:Bravura;
display:flex;
align-items:center;
justify-content:center;
position:relative;
padding-right:1.5em;
height:3em;
box-sizing: border-box;
}
.Select__toggle:after {
content: "\ueb7c";
position:absolute;
right:.2em;
font-size:3em;
top: calc(50% - .2em);
line-height:0;
}
.Select__toggle:focus {
background-color: #fff;
outline: none;
}
[data-theme="Dark"] .Select__toggle:focus {
background-color: #555;
}
.Select__frame {
border-radius:var(--borderRadius);
position:absolute;
overflow:hidden;
z-index: var(--z-modal);
}
.Select__sash {
color:black;
text-align:left;
background:var(--panel-bg);
font-family:Bravura;
position:absolute;
}
.Select__option {
padding: .25em;
}
/* for older Safari and Firefox */
.Select__list::-webkit-scrollbar {
display: none;
}
`) ;
elm = helm(`
<div>
<div data-tag="toggle" class="Select__toggle"></div>
<div data-tag="frame" class="Select__frame" style="visibility:hidden;">
<div class="Select__sash" data-tag="sash"></div>
</div>
</div>`) ;
constructor(options, option=null, panel, translatable=() => true) {
Object.assign(this, dataIndex("tag", this.elm));
Object.assign(this, {options, option, panel, translatable}) ;
delayMs(_gs_ + 1, () => this.build()) ;
}
build() {
let {frame, options, option, panel, sash, toggle, translatable} = this ;
toggle.tabIndex = 0 ;
let keyBuf = "" ;
let toggleStyle = getComputedStyle(toggle);
let emPerPx = parseFloat(toggleStyle.fontSize) ;
toggle.style.width = frame.style.width = sash.style.width = parseFloat(toggleStyle.width) / emPerPx + "em";
let frameHeight = frame.style.height = ((getBox(panel.panel).bottom - getBox(frame).top) / emPerPx) -.5 + "em" ;
for(let option of options) {
let elm = helm(`<div class="Select__option">${escapeHtml(option)}</div>`) ;
elm.dataset.option = option ;
elm.translate = translatable(option) ;
sash.append(elm) ;
}
let selectOption = (option, matched=null) => {
if(matched && matched.length > 0) {
let re =  new RegExp(matched.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");
let m = option.match(re) ;
let inner = m
? escapeHtml(option.slice(0, m.index)) + `<mark>${escapeHtml(m[0])}</mark>` + escapeHtml(option.slice(m.index + m[0].length))
: escapeHtml(option) ;
toggle.innerHTML = "<div>" + inner + "</div>";
}
else toggle.textContent = option;
toggle.translate = translatable(option) ;
toggle.dispatchEvent(new CustomEvent('SELECTED', { detail:option}));
}
let closeFrame = () => {
if(frame.style.visibility == "hidden") return;
animate(frame, null, {height:0}, "height 350ms", () => frame.style.visibility = "hidden");
keyBuf = "";
};
let l1 = listen(this.toggle,"pointerdown", (e) => {
e.taken = true ;
if(frame.style.visibility == "hidden") {
frame.style.visibility = "visible" ;
animate(frame, {height:0}, {height:frameHeight}, "height 350ms");
}
else closeFrame() ;
});
let l2 = listen(sash,"pointerdown", (e) => {
e.taken = true;
let drag = new Drag(e) ;
sash.setPointerCapture(e.pointerId);
let top = sash.offsetTop;
let sashLimit = frame.offsetHeight - sash.offsetHeight ;
let mv = listen(sash, "pointermove", (emv) => {
drag.mv(emv) ;
sash.style.top = clamp(top + emv.clientY - e.clientY, sashLimit, 0) + "px" ;
});
listen(sash, "pointerup", (eup) => {
unlisten(mv);
drag.up(eup) ;
if(!drag.moved) {
let target = e.target.closest(".Select__option") ;
if(!target) return closeFrame() ;
if(this.target) this.target.style.background = "none" ;
this.target = target ;
this.target.style.background = "var(--ui-selected)" ;
closeFrame();
return selectOption(target.dataset.option) ;
}
else if (drag.vY) {
let { to, dt } = Drag.fling(sash.offsetTop, frame.offsetHeight - sash.offsetHeight, 0, drag.vY);
animate(sash, null, { top: to + "px" }, `top ${dt}ms ease-out`);
}
}, { once:true}) ;
});
let opt = null ;
let l3 = listen(toggle, "keydown", (e) => {
e.stopPropagation();
let sashTop = null;
switch(e.key) {
case "Home": sashTop = "0" ; break ;
case "End": sashTop = frame.offsetHeight - sash.offsetHeight ; break;
case "ArrowDown":
if(this.frame.style.visibility == "hidden") return this.frame.style.visibility = "visible" ;
case "ArrowUp":
let optionHeight = sash.scrollHeight / options.length;
sashTop = sash.offsetTop + (e.key == "ArrowDown" ? optionHeight : -optionHeight);
break;
case "Backspace":
case "Delete":
keyBuf = keyBuf.slice(0,-1) ;
case "Enter":
if(e.key == "Enter") {
keyBuf = "" ;
selectOption(opt);
return;
}
default:
if (e.key != "Backspace" && e.key != "Delete") {
if(/^[a-zA-Z0-9 .]$/.test(e.key)) keyBuf += e.key;
else return;
}
let lineNumber = 0 ;
opt = options.find((str) => { ++lineNumber ; return new RegExp(keyBuf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i").test(str);}) ;
if(opt) {
selectOption(opt, keyBuf) ;
sashTop = frame.offsetHeight/2 - sash.offsetHeight * (lineNumber / options.length) ;
if(this.target) this.target.style.background = "none" ;
this.target = sash.children[lineNumber-1] ;
this.target.style.background = "var(--ui-selected)" ;
}
else if (e.key != "Backspace" && e.key != "Delete") keyBuf = keyBuf.slice(0,-1) ;
}
if(sashTop != null) {
sashTop = clamp(sashTop, frame.offsetHeight - sash.offsetHeight, 0) ;
animate(sash, null, { top: sashTop + "px"}, `top ${Drag.scrollDur(sash.offsetTop -sashTop)}ms ease-out`) ;
}
})
let l4 = listen(frame, "wheel", (e) => {
if (frame.style.visibility != "hidden")
sash.style.top = clamp(sash.offsetTop - e.deltaY, frame.offsetHeight - sash.offsetHeight, 0) + "px";
});
panel.listeners.push(l1, l2, l3, l4) ;
if(option) {
let lineNumber = 0 ;
let opt = options.find((str) => { ++lineNumber ; return option == str;}) ;
if(opt) {
selectOption(opt, keyBuf) ;
sash.style.top = clamp(frame.offsetHeight/2 - sash.offsetHeight * (lineNumber / options.length), frame.offsetHeight - sash.offsetHeight, 0) + "px" ;
if(this.target) this.target.style.background = "none" ;
this.target = sash.children[lineNumber-1] ;
this.target.style.background = "var(--ui-selected)" ;
}
}
this.toggle.focus();
}
set(option) {
this.option = option;
let elm = [...this.sash.children].find(elm => elm.dataset.option == option);
if (!elm) return;
this.toggle.textContent = option;
this.toggle.translate = this.translatable(option);
if (this.target) this.target.style.background = "none";
this.target = elm;
elm.style.background = "var(--ui-selected)";
}
}
class Panel {
static get(cell) {
const panel = panels[cell.key];
if (panel?.closing) panel.finishClose();
return panel && !panel.closing ? panel : (panels[cell.key] = new this(cell));
}
static stashKeys = ["pencil", "pen", "rastrum", "text", "symbols"];
static load(target) {
if (!target || target.flatten) return;
let key = target.type == "textbox" ? "text" : target.rostrumType;
if (!Panel.stashKeys.includes(key)) return;
let stash = target.rostrumStash ?? Panel.deriveStash(key, target);
if (!stash) return;
Object.assign(_menu_.rings.ink.cells[key].stash, stash);
_panels_[key]?.sync();
}
static deriveStash(key, target) {
let paint = key == "pencil" || key == "pen" ? target.stroke : target.fill;
if (key == "rastrum" || !paint) return null;
let color = new fabric.Color(paint);
let stash = { rgb: "#" + color.toHex(), alpha: color.getAlpha() };
switch (key) {
case "text": {
let font = fontUnmap[`${target.fontFamily}/${target.fontStyle}/${target.fontWeight}`];
if (font) stash.font = font;
stash.size = target.fontSize;
stash.height = Math.round(target.fontSize * target.lineHeight);
break;
}
case "symbols": stash.size = target.fontSize / 5; break;
default: stash.width = target.strokeWidth;
}
return stash;
}
changed(keys = Object.keys(this.cell.stash)) {
let settings = JSON.stringify(keys.map(key => this.cell.stash[key]));
let changed = this.settings !== undefined && this.settings != settings;
this.settings = settings;
return changed;
}
static css = css(
"Panel",
`
.Panel { /* marker only */
}
.Panel__elm {
position: fixed;
overflow: hidden;
border-radius: var(--borderRadius);
border: 0.05em solid rgba(100,115,148,0.22);
/* No drop-shadow filter on panels: a filter promotes a GPU compositing
layer whose blurred drop-shadow leaves trails when a panel is dragged on
iOS/iPad (the compositor fails to invalidate the shadow overhang). Border
+ inset box-shadow read fine without it. Don't re-add a filter. */
box-shadow: var(--panel-inset-shadow);
background: var(--panel-bg);
z-index: 90;
/* Never let a panel exceed the viewport (dvh/dvw track the iOS URL bar).
Oversized panels are capped here; ones that want their overflow to
scroll (e.g. AboutPanel) cap their body to the viewport too. */
max-width: calc(100vw - 1em);
max-height: calc(100dvh - 1em);
}
.Panel__header {
background: var(--panel-header-bg);
background-image: var(--panTexture);
height: 3em;
width: 100%;
color: var(--color-text);
}
.Panel__header-selected {
background: var(--panel-header-selected-bg);
}
.Panel__icon {
position: absolute;
width: 2em;
height: 2em;
top: var(--spacing-sm);
left: var(--spacing-sm);
pointer-events: none;
transform: translateZ(0); /* fix for iOS partial-path SVG rendering glitch */
will-change: transform;
}
.Panel__title {
position: absolute;
height: 3em;
width: 100%;
text-align: center;
vertical-align: middle;
line-height: 3em;
font-weight: bold;
color: var(--color-text);
pointer-events: none;
}
.Panel__closer {
position: absolute;
width: 3em;
height: 3em;
top: 0;
right: 0;
}
.Panel__body {
font-size: var(--font-size-base);
margin: var(--spacing-sm);
min-width: 13em;
text-align: center;
color: var(--color-text);
}
.Panel__fader {
transition: opacity var(--transition-normal);
}
.Panel__item {
/* used to seperate logical items in a panel body */
margin-top: var(--spacing-sm);
}
`
);
elm = helm(`
<div class="pz Panel" style="z-index:200">
<div data-tag="panel" class="Panel__elm">
<div data-tag="header" class="Panel__header">
${iconSvg("Close", { tag: "icon", class: "Panel__icon" })}
<div class="Panel__title" data-tag="title">
</div>
<button type="button" data-tag="closer" class="Panel__closer">
${iconSvg("Close Panel", { size:"1.35em" })}
</button>
</div>
<div data-tag="body" class="Panel__body">
</div>
</div>
</div>`);
cell = null;
listeners = [];
lastTapTime = 0;
constructor(cell) {
Object.assign(this, dataIndex("tag", this.elm));
this.elm.style.fontSize = 15 / _pxPerEm_ + "em";
this.cell = cell;
this.elm.dataset.tag = this.constructor.name;
this.elm.panel = this;
this.setIcon(cell.svgPath);
this.setTitle(cell.label || cell.name);
this.closer.setAttribute("aria-label", "Close " + (cell.label || cell.name));
this.listeners.push(listen(this.closer, "click", e => { if (e.detail === 0) this.close(); }));
this.listeners.push(listen(this.panel, 'pointerdown', e => { e.taken = true; }, { capture: true }));
this.listeners.push(
listen(this.closer, "pointerdown", (e) => {
e.stopPropagation();
e.taken = true ;
this.close();
})
);
this.listeners.push(
listen(this.header, "pointerdown", (e) => {
e.taken = true;
let now = performance.now();
if (now - this.lastTapTime < 300) {
let path = this.cell.ring?.key + "/" + this.cell.key;
_menu_.notify(path + "/up");
let longPressTimer = setTimeout(() => _menu_.notify(path + "/long"), 500);
listen(this.header, "pointerup", () => clearTimeout(longPressTimer), { once: true });
}
this.lastTapTime = now;
let drag = new Drag(e) ;
let { header, elm } = this;
if(!(this instanceof CurtainPanel))
elm.style.zIndex = ++_zTop_;
this.header.classList.add("Panel__header-selected");
header.setPointerCapture(e.pointerId);
let middleX = this.panel.offsetWidth / 2;
let middleY = this.panel.offsetHeight / 2;
let offsetX = e.offsetX, offsetY = e.offsetY;
let mv = listen(header, "pointermove", (emv) => {
if (e.pointerId != emv.pointerId) return;
drag.mv(emv) ;
elm.style.left = emv.clientX - offsetX + middleX + "px";
elm.style.top = emv.clientY - offsetY + middleY + "px";
this.constrain();
});
listen(header,"pointerup",
(eup) => {
drag.up(eup) ;
header.classList.remove("Panel__header-selected");
unlisten(mv);
if (drag.vXY) {
this.hide();
if(this.elm.dataset.tag != "ScreenPanel") ScreenPanel.update(null) ;
}
},
{ once: true }
);
})
);
this.listeners.push(
listen(window, "resize", () => {
if (this.elm.style.visibility == "visible") {
this.constrain();
}
}));
delay(1, () => this.elm.owner = this) ;
}
hidden() {
}
close() {
_menu_.cancelOperation();
if (this.closing) return;
this.closing = true;
this.hide();
if (this.elm.dataset.tag != "ScreenPanel" && ScreenPanel.pzTarget == this.elm) ScreenPanel.update(null) ;
schedule(510, () => this.finishClose());
}
finishClose() {
if (this.closed) return;
this.closed = true;
this.elm.remove();
this.destructor();
if (panels[this.cell.key] === this) delete panels[this.cell.key];
}
destructor() {
for (const action of this.elm.querySelectorAll('.Menu__action[data-action]')) {
_menu_.nestedTools.append(action);
}
unlisten(...this.listeners);
}
constrain() {
let y = this.panel.offsetHeight / 2 ;
if(this.elm.offsetTop < y) this.elm.style.top = y + "px" ;
else {
y += window.innerHeight - this.header.offsetHeight ;
if(this.elm.offsetTop > y)
this.elm.style.top = y + "px" ;
}
let range = document.createRange();
range.selectNodeContents(this.title) ;
let box = range.getBoundingClientRect();
let x = this.elm.offsetLeft - box.x ;
if(this.elm.offsetLeft < x) this.elm.style.left = x + "px" ;
else {
x = window.innerWidth - box.width / 2 ;
if(this.elm.offsetLeft > x) this.elm.style.left = x + "px" ;
}
return ;
}
setIcon(svgPath) {
let newIcon = helm(svgWrap(svgPath, { tag: "icon", class: "Panel__icon" }));
this.icon.replaceWith(newIcon);
this.icon = newIcon;
}
setTitle(title) {
this.title.innerText = title;
}
show(onShown = null) {
ScreenPanel.update(this.elm) ;
let elm = this.elm;
this.setIcon(this.cell.svgPath);
this.setTitle(this.cell.label || this.cell.name);
elm.style.visibility = "visible";
if (!elm.isConnected) _body_.append(elm);
let dy = this.header.offsetHeight / 2 - this.panel.offsetHeight / 2;
elm.style.transformOrigin = `0px ${dy}px`;
elm.style.transform = "scale(0)";
reflow();
elm.style.transition = `transform ${_gs_}ms`;
numb(elm, _gs_);
if(onShown) delayMs(_gs_, () => onShown()) ;
elm.style.transform = "scale(1)";
_pzTarget_ = elm;
let clazz = this.constructor.name ;
if (this != _panels_.screen && clazz != "ScreenPanel") {
_lastTarget_ = elm;
_panels_.screen?.refreshTargets();
}
if(clazz != "CurtainPanel") elm.style.zIndex = ++_zTop_;
return this;
}
hide() {
hide(this.elm, dataIndex("tag", this.cell.elm).cellIcon);
this.hidden();
}
setPosition(otherElm) {
let elm = this.elm;
let box = getBox(otherElm);
let mid = box.x + box.width / 2;
mid > innerWidth / 2
? (elm.style.left = mid - elm.offsetWidth + "px")
: (elm.style.left = mid + "px");
mid = box.y - box.height / 2;
mid > innerHeight / 2
? (elm.style.top = mid - elm.offsetHeight / 2 + "px")
: (elm.style.top = mid + "px");
box = getBox(elm);
if (box.top < 0 || box.bottom > innerHeight)
elm.style.top =
Math.max(innerHeight / 2 - box.height / 2, 0) + "px";
if (box.left < 0 || box.right > innerWidth)
elm.style.left =
Math.max(innerWidth / 2 - box.width / 2, 0) + "px";
this.constrain();
}
}
class AboutPanel extends Panel {
static css = css(
"AboutPanel",
`.Credit {
font-size: var(--font-size-xs);
margin: var(--spacing-lg);
}
.AboutPanel__scroll {
overflow-y: auto;
-webkit-overflow-scrolling: touch;
scrollbar-width: none;
height: 100%;
box-sizing: border-box;
cursor: grab;
}
.AboutPanel__scroll::-webkit-scrollbar {
display: none;
}
`
);
licenseFace = helm(`<p style="padding:2em;overflow:auto;text-align:center;">
<br><b translate="no">ROSTRUM: Sheet Music Studio</b><br><br>
<span translate="no">Based on Podium by Glendon Diener<br>Copyright 2026 Glendon Diener</span><br><br>
Rostrum is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.<br><br>
Rostrum is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
<a rel="noopener noreferrer" translate="no" href="https://www.gnu.org/licenses/agpl-3.0-standalone.html">GNU Affero Public License</a>
for more details.</p>
`);
creditsFace = helm(`<div translate="no">
<div class="Credit">
<a href="https://github.com/steinbergmedia/bravura">Bravura</a> Version 1.1<br>
© 2019, Steinberg Media Technologies GmbH<br>
SIL OPEN FONT LICENSE Version 1.1
</div><div class="Credit">
<a href="https://codepen.io/zastrow/details/kxdYdk">CSS Piano</a><br>
© 2026 Philip Zastrow
</div><div class="Credit">
<a href="https://github.com/fabricjs">fabric.js</a> Version 5.3.0 (2023)<br>
© 2008-2015 Printio (Juriy Zaytsev, Maxim Chernyak)<br>
MIT LICENSE
</div><div class="Credit">
<a href="https://github.com/foliojs/fontkit">fontkit.js</a> Version 1.1.1<br>
Author: Devon Govett<br>
MIT LICENSE
</div><div class="Credit">
<a href="https://fonts.google.com/specimen/Patrick+Hand">Patrick Hand Regular</a> Version 1.1.1<br>
© 2010-2012 Patrick Wagesreiter<br>
SIL OPEN FONT LICENSE Version 1.1
</div><div class="Credit">
<a href="https://github.com/mozilla/pdf.js">pdf.js</a> Version 4.10.38<br>
© 2024 Mozilla Foundation<br>
APACHE LICENSE Version 2.0<br>
</div><div class="Credit">
<a href="https://github.com/Hopding/pdf-lib">pdf-lib.js</a> Version 1.17.1<br>
© 2019 Andrew Dillon<br>
MIT LICENSE
</div><div class="Credit">
<a href="https://github.com/sfzinstruments/SalamanderGrandPiano">Salamander Grand Piano</a>  V2 Yamaha C5<br>
Author: Alexander Holm<br>
Creative Commons 3.0
</div><div class="Credit">
<a href="https://filipposfragkogiannis.com/fonts/vercetti-regular">Vercetti Regular</a> Version 1.1<br>
Designer: Filippos Fragkogiannis<br>
LICENSE AMICALE V. 0.2
</div></div>
`);
versionFace = helm(
`<div style="display:flex;flex-direction:column;align-items:center;justify-content:space-between;min-height:100%;width:100%;box-sizing:border-box;padding:2em 1em;text-align:center;">
<div style="font-size:1.5em;display:flex;flex-direction:column;align-items:center;gap:0.2em;">
<div style="white-space:nowrap;">ROSTRUM: Sheet Music Studio</div>
${iconSvg("Rostrum", { size: "8em" })}
<div>Version ${_rostrumVersion_}</div>
<div style="font-size:.6em;">Based on Podium ${_rostrumUpstreamVersion_}</div>
<a style="font-size:.6em;" href="https://github.com/1921music/rostrum/blob/v${_rostrumVersion_}/CHANGELOG.md">Release Notes</a>
<div style="font-size:.6em;color:#888;margin-top:0.5em;">${typeof chrome !== "undefined" && chrome.runtime?.id ? "Browser Extension" : window.matchMedia("(display-mode: standalone)").matches ? "Progressive Web App" : location.protocol + "//" + location.host}</div>
<div style="font-size:.6em;color:#888;" translate="no">Build ${_rostrumBuild_}</div>
${this.commitLines()}
</div>
<div style="font-size:1.2em;text-align:center;font-variant-emoji:text;margin-top:2em;line-height:1.6em;">
<a href="https://studiop5.org/privacy.html">Upstream Privacy</a>&nbsp;
<a href="https://studiop5.org/terms.html">Upstream Terms</a><br>
<a href="https://github.com/1921music/rostrum">&lt;&sol;&gt; Source</a>&nbsp;
<a href="https://github.com/1921music/rostrum/issues">\u2709\uFE0E Issues</a>
</div>
</div>`
);
commitLines() {
let dirty = _rostrumCommit_.endsWith("-dirty");
let hash = dirty ? _rostrumCommit_.slice(0, -"-dirty".length) : _rostrumCommit_;
let line = (text, style = "") =>
`<div style="font-size:.6em;color:#888;${style}" translate="no">${text}</div>`;
if (!/^[0-9a-f]{7,}$/.test(hash)) return line(`Commit ${_rostrumCommit_}`);
return (
line(`Commit ${hash.slice(0, 8)}${dirty ? "-dirty" : ""}`) +
line(hash, "user-select:text;-webkit-user-select:text;word-break:break-all;")
);
}
constructor(cell) {
super(cell);
let tabView = new TabView(this, "Version", "Credits", "License");
Object.assign(this.body.style, {
margin: 0,
width: "32em",
height: "38em",
maxWidth: "calc(100vw - 2em)",
maxHeight: "calc(100dvh - 4.5em)",
});
tabView.frame.style.height = "100%";
tabView.faces.style.position = "relative";
tabView.faces.style.top = "0";
tabView.tabs["Version"].face.append(this.versionFace);
tabView.tabs["Credits"].face.append(this.creditsFace);
tabView.tabs["License"].face.append(this.licenseFace);
for (let t of ["Version", "Credits", "License"])
tabView.tabs[t].face.classList.add("AboutPanel__scroll");
this.body.append(tabView.elm);
tabView.tabs["Version"].select();
}
}
class AddPanel extends Panel {
options = {
"Match Score":"score",
"Custom":"custom",
"A3":"mm/279/420",
"A4":"mm/210/297",
"B4":"mm/250/353",
"Octavo":"in/6.5/10.5",
"Letter":"in/8.5/11",
"Folio":"in/9/12",
"Hand Copy (Trad)":"in/9.5/12.5",
"Orchestral Parts (MOLA)":"in/11/14",
"Ledger":"in/17/11",
"Legal":"in/8.5/14.0",
"Tabloid":"in/11/17",
}
content = helm(`
<div>
<div data-tag="colorPickerProxy"></div>
<div class="Panel__item">Size</div>
<div data-tag="selectProxy"></div>
<div data-tag="customProxy"></div>
</div>
`)
constructor(cell) {
super(cell);
Object.assign(this, dataIndex("tag", this.content));
this.body.append(this.content);
let stash = cell.stash;
this.colorPicker = new ColorPicker(
"Color", stash.rgb, stash.alpha,
(rgb, alpha) => {
stash.rgb = rgb;
stash.alpha = alpha;
}
);
this.colorPickerProxy.replaceWith(this.colorPicker.elm);
this.select = new Select(Object.keys(this.options), stash.size, this, (size) => size == "Custom" || size == "Match Score") ;
this.selectProxy.replaceWith(this.select.elm) ;
this.setupSizeSelection(stash);
}
setupSizeSelection(stash) {
let sizeMsg = (tag, val) => {
let pt = val.toFixed(0);
let mm = (val * (1 / 2.8346456693)).toFixed(0);
let inch = (val * (1 / 72)).toFixed(2);
return `${tag}: ${noTranslate(`${pt}pt,... ${mm}mm, ${inch}in`)}`;
};
let disable = stash.size != "Custom";
this.customGroup = new SliderGroup(stash,
{ Width: { min: 100, max: 2000, msg: sizeMsg, step: 1, disabled: disable},
Height: { min: 100, max: 2000, msg: sizeMsg, step: 1, disabled: disable},
}, null);
this.customProxy.replaceWith(this.customGroup.elm);
listen(this.select.toggle, "SELECTED", (e) => {
stash.size = e.detail;
let detail = this.options[e.detail] ;
if (detail == "score") {
let score = _score_;
stash.Width = score.maxWidth;
stash.Height = score.maxHeight;
this.customGroup.defs.Height.disabled = true;
this.customGroup.defs.Width.disabled = true;
}
else if (detail == "custom") {
this.customGroup.defs.Height.disabled = false;
this.customGroup.defs.Width.disabled = false;
} else {
let [unit, width, height] = detail.split("/");
let toPts = unit == "in" ? 72 : unit == "mm" ? 2.8346456693 : 1;
stash.Width = width * toPts;
stash.Height = height * toPts;
this.customGroup.defs.Height.disabled = true;
this.customGroup.defs.Width.disabled = true;
}
this.customGroup.refresh();
});
this.customGroup.refresh();
}
}
class NewPanel extends AddPanel {
constructor(cell) {
super(cell);
this.select.options.shift() ;
this.pagesGroup = new SliderGroup( cell.stash,
{  pages: { min: 1, max: 100, value: 5,
msg: (tag, val) => `${val.toFixed(0)} page${val > 1 ? "s":""}`, step: 1 }, }, null );
this.body.prepend(this.pagesGroup.elm);
this.pagesGroup.refresh();
}
}
class DetailsPanel extends Panel {
content = helm(`<div style="margin:1em;width:20em;"></div>`);
constructor(cell) {
super(cell);
Object.assign(this, dataIndex("tag", this.content));
this.body.replaceWith(this.content);
this.refresh();
}
parseTs(ts) {
try {
let l = ts.length;
let j = "";
if (l > 5) j += ts.substring(2, 6);
if (l > 7) j += "-" + ts.substring(6, 8);
if (l > 9) j += "-" + ts.substring(8, 10);
if (l > 11) j += "T" + ts.substring(10, 12);
if (l > 13) j += ":" + ts.substring(12, 14);
if (l > 15) j += ":" + ts.substring(14, 16);
if (l > 16) j += ".000" + ts.substring(16, 17);
if (l > 18) j += ts.substring(17, 19);
if (l > 21) j += ":" + ts.substring(20, 22);
return Date.parse(j);
} catch (error) {
return null;
}
}
refresh() {
clearChildren(this.content);
if (_score_) {
let score = _score_;
let nameInput = helm(
`<input type="text" style="font-size:1.5em;text-align:center;margin-bottom:.5em;width:100%;box-sizing:border-box;border:none;border-radius:var(--borderRadius);background:var(--panel-bg);">`
);
nameInput.value = score.name.replace(/\.(pdf|mscz|mxl|musicxml|xml)$/i, "");
listen(nameInput, "change", () => {
let newName = nameInput.value.trim();
const extension = score.music ? '.mscz' : '.pdf';
if (!newName.toLowerCase().endsWith(extension)) newName += extension;
score.name = newName;
score.setTitle();
});
this.content.append(nameInput);
let source = score.source
? `<div style="text-align:right;">Source:&nbsp;</div><div>${noTranslate(escapeHtml(score.source))}</div>`
: "";
let path = score.path
? `<div style="text-align:right;">Path:&nbsp;</div><div>${noTranslate(escapeHtml(score.path))} </div>`
: "";
let size = score.size
? `<div style="text-align:right;">Size:&nbsp;</div><div>${noTranslate(`${Number(
score.size
).toLocaleString()} B`)}</div>`
: "";
let PERM_FLAGS = [
[4,    "Print"],
[16,   "Copy"],
[8,    "Modify"],
[32,   "Annotate"],
[1024, "Assemble"],
];
let permVal;
if (score.permissions === null) {
permVal = "No restrictions";
} else {
let denied = PERM_FLAGS
.filter(([f]) => !score.permissions.includes(f))
.map(([, n]) => n);
permVal = denied.length == 0
? "All allowed"
: `<span style="color:#c44">Restricted: ${denied.join(", ")}</span>`;
}
let permHtml = `<div style="text-align:right;">Permissions:&nbsp;</div><div>${permVal}</div>`;
this.content.append(
helm(`<div style="display:grid;grid-template-columns:40% 60%;font-size:.8em;">
${source} ${path} ${size}
<div style="text-align:right;">Pages:&nbsp;</div><div>${
score.pgs.length
}</div>
${permHtml}
<div style="text-align:right;">Created:&nbsp;</div><div>${
score.created ? noTranslate(new Date(score.created).toLocaleString()) : "?"
}</div>
<div style="text-align:right;">Modified:&nbsp;</div><div>${
score.modified ? noTranslate(new Date(score.modified).toLocaleString()) : "?"
}</div>
<div style="text-align:right;">Width:&nbsp;</div><div>${noTranslate(`${score.maxWidth.toFixed(0)} pt, ${(score.maxWidth / 2.8346456693).toFixed(0)} mm, ${(score.maxWidth / 72).toFixed(2)} in`)}</div>
<div style="text-align:right;">Height:&nbsp;</div><div>${noTranslate(`${score.maxHeight.toFixed(0)} pt, ${(score.maxHeight / 2.8346456693).toFixed(0)} mm, ${(score.maxHeight / 72).toFixed(2)} in`)}</div>
</div>`)
);
if (score.pdfInfo) {
this.content.append(
helm(
`<div style="font-size:1em;text-align:center;padding:.5em;">PDF Metadata:</div>`
)
);
let detailsHtml = "";
for (let [k, v] of Object.entries(score.pdfInfo)) {
if (!k) continue;
if (k == "PDFFormatVersion" || k == "Language" || k == "EncryptFilterType" || k == "EncryptFilterName") continue;
if (k.startsWith("Is") || k.startsWith("is")) continue;
if (typeof v == "string" && v.startsWith("D:")) {
v = new Date(this.parseTs(v)).toLocaleString();
}
detailsHtml += `<div style="text-align:right">${escapeHtml(k)}:&nbsp;&nbsp;</div><div>${noTranslate(escapeHtml(String(v)))}</div>`;
}
this.content.append(
helm(
`<div style="display:grid;grid-template-columns:40% 60%;font-size:.8em;">${detailsHtml}</div>`
)
);
}
}
}
show() {
super.show();
this.refresh();
return this;
}
}
class FilePanel extends Panel {
tabView = null;
constructor(cell) {
super(cell);
Object.assign(this.body.style, {
margin: 0,
width: "90vw",
maxWidth: "30em",
height: "90vh",
maxHeight: "min(30em, calc(100dvh - 4em))",
});
this.listeners.push(
listen(this.panel, "scroll", () => this.panel.scrollTop = 0)
);
FileSrc.get(Score.sources.gdrive).preloadGIS();
}
show() {
super.show();
if (this.tabView.selectedTab) this.tabView.selectedTab.select();
return this;
}
}
class OpenPanel extends FilePanel {
constructor(cell) {
super(cell);
this.mode = "open";
let fileSources = Object.entries(Score.sources)
.filter(([key]) => key !== "url")
.map(([, value]) => value);
this.tabView = new TabView(this, "Recent", ...fileSources);
this.body.append(this.tabView.elm);
for (let title in this.tabView.tabs) {
let tab = this.tabView.tabs[title];
tab.onSelect = async (tab) => {
if (!tab.view) {
try {
if (title == "Recent") tab.view = new FileListView(this);
else if (title == "Local") tab.view = new LocalFileView(this);
else
tab.view = new FileSystemView(
title,
await FileSrc.get(title),
this
);
tab.face.append(tab.view.elm);
} catch (err) {
tab.view = null;
return;
}
}
tab.view.select(this.tabView, tab);
};
}
}
}
class CopyPanel extends OpenPanel {
constructor(cell) {
super(cell);
this.mode = "copy";
}
}
class MergePanel extends OpenPanel {
mode = "merge";
hidden() {
if (!this.cell.pdfData) _menu_.activateCell(null, _menu_.rings.page);
}
}
class SavePanel extends FilePanel {
mode = "save";
constructor(cell) {
super(cell);
this.mode = "save";
let fileSources = Object.entries(Score.sources)
.filter(([key]) => key !== "url")
.map(([, value]) => value);
this.tabView = new TabView(this, ...fileSources);
this.body.append(this.tabView.elm);
for (let title in this.tabView.tabs) {
let tab = this.tabView.tabs[title];
tab.onSelect = async (tab) => {
if (!tab.view) {
try {
if (title == "Local") tab.view = new LocalFileView(this);
else
tab.view = new FileSystemView(
title,
await FileSrc.get(title),
this
);
tab.face.append(tab.view.elm);
} catch (err) {
tab.view = null;
return;
}
}
tab.view.select(this.tabView, tab);
};
}
}
}
class GridPanel extends Panel {
content = helm(`
<div class="Panel__body">
<div data-tag="options"></div>
<div data-tag="sliders"></div>
Numbers<br>
<div data-tag="numbers"></div>
</div>`);
constructor(cell) {
super(cell);
this.body.replaceWith(this.content);
Object.assign(this, dataIndex("tag", this.content));
let setUnits = (units) => {
let currentSliders = this.sliders;
this.sliders = {
Inch: this.inchSliders.elm,
Metric: this.metricSliders.elm,
}[units];
currentSliders.replaceWith(this.sliders);
};
let options = new ButtonGroup(
this.cell.stash,
{
Inch: { svg: "Inch", radio: "units" },
Metric: { svg: "Metric", radio: "units" },
},
(e, tag, value) => (tag == "units" ? setUnits(value) : null)
);
this.options.replaceWith(options.elm);
{
let steps = ["1", "1/2", "1/4", "1/8", "1/16"];
let xStepMsg = (tag, value) => "X Step: " + steps[value] + " inch";
let yStepMsg = (tab, value) => "Y Step: " + steps[value] + " inch";
this.inchSliders = new SliderGroup(
this.cell.stash,
{
xStep: { min: 0, max: 4, step: 1, value: 0, msg: xStepMsg, row:1, col:1 },
yStep: { min: 0, max: 4, step: 1, value: 0, msg: yStepMsg, row:1, col:2 },
},
() => {}
);
this.inchSliders.elm.classList.add("GridPanel__sliders");
}
{
let steps = [4, 2, 1, 0.5, 0.25];
let xStepMsg = (tag, value) => "X Step: " + steps[value] + " cm";
let yStepMsg = (tab, value) => "Y Step: " + steps[value] + " cm";
this.metricSliders = new SliderGroup(
this.cell.stash,
{
xStep: { min: 0, max: 4, step: 1, value: 0, msg: xStepMsg },
yStep: { min: 0, max: 4, step: 1, value: 0, msg: yStepMsg },
},
() => {}
);
this.metricSliders.elm.classList.add("GridPanel__sliders");
}
let numbers = new ButtonGroup(this.cell.stash, {
On: { svg: "Numbers", radio: "numbers" },
Off: { svg: "Close", radio: "numbers" },
});
this.numbers.replaceWith(numbers.elm);
setUnits(this.cell.stash.units);
}
}
class GuidePanel extends Panel {
static localNames = { ja: "Guidebook.ja.html", en: "Guidebook.html" };
static publishedUrl = `https://studiop5.org/Guidebook.html`;
static isExtension = typeof chrome !== "undefined" && !!chrome.runtime?.id;
static labels = { ja: "日本語", en: "EN" };
static preference = "rostrum-guide-language";
static urls = null;
static css = css(
"GuidePanel",
`.GuidePanel__switcher {
position: absolute;
top: 0;
right: 3em;      /* the closer has the corner */
width: 3.4em;
/* The containing block is the panel, not the header (which is not
positioned), so the header's own 3em has to be repeated here -- as the
icon, title and closer all do. A percentage would take the height of
the whole panel and centre the label in the middle of the guidebook. */
height: 3em;     /* the full header, so the tap target is a finger wide */
display: flex;
align-items: center;
justify-content: center;
color: var(--color-text);
}
.GuidePanel__switcher > span {
font-size: 0.7em;
font-weight: bold;
white-space: nowrap;
padding: 0.3em 0.5em;
border: 0.1em solid currentColor;
border-radius: 0.3em;
opacity: 0.7;
}
.GuidePanel__switcher:hover > span { opacity: 1; }
`
);
static async resolveUrls() {
if (this.urls) return this.urls;
if (window._rostrumGuideJa_) return this.urls = { ja: new URL(window._rostrumGuideJa_, location.href).href };
if (this.isExtension) return this.urls = { en: this.publishedUrl };
let urls = {};
let offline = false;
for (let [language, name] of Object.entries(this.localNames)) {
let url = new URL(name, location.href).href;
let found = await fetch(url, { method: "HEAD" }).then(r => r.ok, () => null);
if (found === null) offline = true;
if (found) urls[language] = url;
}
urls.en ??= this.publishedUrl;
return offline ? urls : (this.urls = urls);
}
content = helm(
`<div style="padding:0;width:100%;height:100%;box-sizing:border-box;overflow:hidden;position:relative;">
<iframe style="width:100%;height:100%;border:none;display:none;"></iframe>
<div class="guide-msg" style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;color:#888;font-size:1.2em;"></div>
</div>`
);
constructor(cell) {
super(cell);
Object.assign(this.body.style, {
margin: 0,
padding: 0,
width: "90vw",
maxWidth: "60em",
height: "90vh",
maxHeight: "50em",
});
this.body.append(this.content);
this.iframe = this.content.querySelector("iframe");
this.msg = this.content.querySelector(".guide-msg");
this.fetched = false;
this.switcher = helm(`<div class="GuidePanel__switcher" style="display:none"><span></span></div>`);
this.switcherLabel = this.switcher.querySelector("span");
this.closer.before(this.switcher);
this.listeners.push(
listen(this.switcher, "pointerdown", (e) => {
e.stopPropagation();
e.taken = true;
this.setLanguage(this.other());
})
);
}
other() {
return Object.keys(this.urls ?? {}).find(language => language != this.language);
}
setLanguage(language) {
let url = this.urls?.[language];
if (!url) return;
this.language = language;
localStorage.setItem(GuidePanel.preference, language);
let other = this.other();
this.switcher.style.display = other ? "" : "none";
if (other) {
this.switcherLabel.textContent = GuidePanel.labels[other];
this.switcher.title = `Read the guidebook in ${other == "ja" ? "Japanese" : "English"}`;
}
if (this.iframe.src == url) return;
if (url == GuidePanel.publishedUrl && !navigator.onLine) {
this.iframe.style.display = "none";
this.msg.style.display = "flex";
this.msg.textContent = "That guidebook is not available offline.";
return;
}
this.iframe.style.display = "none";
this.msg.style.display = "flex";
this.msg.textContent = "Fetching Guidebook...";
listen(this.iframe, "load", () => {
this.iframe.style.display = "block";
this.msg.style.display = "none";
}, { once: true });
this.iframe.src = url;
}
show() {
if (GuidePanel.isExtension) {
if (this.guideWin && !this.guideWin.closed) this.guideWin.focus();
else this.guideWin = window.open(window._rostrumGuideJa_
? new URL(window._rostrumGuideJa_, location.href).href : GuidePanel.publishedUrl, "rostrum-guidebook");
return this;
}
super.show();
if (this.fetched) return this;
this.fetched = true;
this.msg.textContent = "Fetching Guidebook...";
GuidePanel.resolveUrls().then((urls) => {
this.urls = urls;
let language = localStorage.getItem(GuidePanel.preference);
if (!urls[language]) language = Object.keys(urls)[0];
this.setLanguage(language);
if (this.iframe.src) return;
this.fetched = false;
});
return this;
}
}
class ImportPanel extends Panel {
static css = css(
"ImportPanel",
`.ImportPanel__frame {
background-image: var(--panTexture);
height: 6em;
width: 100%;
padding:.8em 0;
box-sizing: border-box;
margin-bottom: 0.2em;
overflow: hidden;
border-radius: var(--borderRadius);
}
.ImportPanel__sash {
position: relative;
height:100%;
width: max-content;
min-width: 100%;
padding: 0 0.8em;
box-sizing: border-box;
display: flex;
gap: 0.8em;
align-items: flex-start;
}
`);
content = helm(`
<div data-tag="body" class="Panel__body">
<div class="ImportPanel__frame" data-tag="frame">
<div class="ImportPanel__sash" data-tag="sash"></div>
</div>
<div data-tag="buttons" style="border-top: 1px solid var(--color-border);"></div>
</div>
`);
constructor(cell) {
super(cell);
this.body.replaceWith(this.content);
Object.assign(this, dataIndex("tag", this.content));
listen(this.sash, "pointerdown", (e) => {
this.sash.setPointerCapture(e.pointerId);
let fs = parseFloat(getComputedStyle(this.sash).fontSize);
let offsetX = e.clientX - this.sash.offsetLeft;
let limit = this.sash.offsetWidth - this.frame.offsetWidth;
let mv = listen(this.sash, "pointermove", (emv) => {
let leftPx = clamp(emv.clientX - offsetX, -limit, 0);
this.sash.style.left = leftPx / fs + "em";
});
listen(this.sash, "pointerup", (eup) => {
unlisten(mv);
}, { once: true });
});
let buttons = new ButtonGroup({}, {
Clear: { svg: "Cancel" },
Undo: { svg: "Undo" },
},
async (e, tag, value) => {
if(value == "Clear") await _podPb_.pgClear();
else if(value == "Undo") await _podPb_.pgPop();
delay(10, () => {
delete buttons.props[value];
buttons.refresh();
});
}
);
buttons.elm.style.borderTop = ".02em solid var(--color-border)";
this.buttons.replaceWith(buttons.elm);
let build = 0;
this.listeners.push(listen(_body_, "SHAREDBUFFER", async (e) => {
let myBuild = ++build;
let superseded = () => myBuild != build;
_shade_.show("Building...");
let thumbs = [];
try {
let score = await _podPb_.getScore();
for(let pg of score.pgs) {
if(superseded()) break;
let thumb = await pg.getThumbElm(true, superseded);
if(thumb) thumbs.push(thumb);
}
} finally {
_shade_.hide();
}
if(superseded()) return;
clearChildren(this.sash);
if(thumbs.length > 0) {
this.sash.style.fontSize = "1em";
reflow();
thumbs.forEach((thumb) => this.sash.append(thumb));
this.sash.style.fontSize = this.sash.offsetHeight / thumbs[0].offsetHeight   + "em";
let frameWidth = pxToEm(this.frame.offsetWidth, this.sash);
let sashWidth = pxToEm(this.sash.offsetWidth, this.sash);
this.sash.style.left = frameWidth;
reflow();
this.sash.style.transition = `left ${_gs_}ms`;
this.sash.style.left = parseFloat(frameWidth) - parseFloat(sashWidth) - .8 + "em";
delayMs(_gs_, () => this.sash.style.transition = "unset");
buttons.defs.Undo.disabled = false;
buttons.defs.Clear.disabled = false;
}
else {
if (_menu_.activeRing?.activeCell === _menu_.rings.page.cells.paste)
_menu_.activateCell(null);
buttons.defs.Undo.disabled = true;
buttons.defs.Clear.disabled = true;
this.close();
if (_menu_.activeRing?.activeCell === this.cell)
_menu_.activateCell(null);
}
buttons.refresh() ;
}));
}
show() {
super.show(() => _podPb_.announce());
return this;
}
}
class LayoutPanel extends Panel {
content = helm(`
<div>
<div data-tag="bookFace" class="Panel__body">
Page Fit<br>
<div data-tag="fitBook"></div>
<div data-tag="bookSliders"></div>
Numbers<br>
<div data-tag="pnBook"></div>
<div data-tag="pnBookPlace"></div>
</div>
<div data-tag="horizontalFace" class="Panel__body">
Page Fit<br>
<div data-tag="fitHorizontal"></div>
<div data-tag="fitHorizontalSliders"></div>
Numbers<br>
<div data-tag="pnHorizontal"></div>
<div data-tag="pnHorizontalPlace"></div>
</div>
<div data-tag="verticalFace" class="Panel__body">
Page Fit<br>
<div data-tag="fitVertical"></div>
<div data-tag="fitVerticalSliders"></div>
Numbers<br>
<div data-tag="pnVertical"></div>
<div data-tag="pnVerticalPlace"></div>
</div>
<div data-tag="tableFace" class="Panel__body">
Page Fit<br>
<div data-tag="fitTable"></div>
<div data-tag="tableFlowSliders"></div>
Numbers<br>
<div data-tag="pnTable"></div>
</div>
</div>
`);
constructor(cell) {
super(cell);
Object.assign(this, dataIndex("tag", this.content));
this.body.replaceWith(this.content);
this.schedule = new Schedule();
let tags = dataIndex("tag", this.content);
this.faces = {
book: tags.bookFace,
horizontal: tags.horizontalFace,
vertical: tags.verticalFace,
table: tags.tableFace,
};
for (let [key, face] of Object.entries(this.faces)) if (key != cell.key) face.remove();
let handler = (e, tag, value, props) => {
if (tag == "fit" && _score_ && this.cell == Layout.activeLayout?.cell)
return void Layout.activeLayout.refit();
if (tag == "fit") this.cell.stash.pz = null;
if (tag == "band") this.syncPn();
if (tag == "pace") return;
if (_score_ && this.cell == Layout.activeLayout.cell) {
if(tag == "pgSnap")
Layout.activeLayout.cell.geo.pgSnap = value ;
else
Layout.activeLayout.build();
}
};
let msgCallback = (tag, value) => {
if(tag == "pgShow") {
if(cell.stash.pgSnap > value) cell.stash.pgSnap = value;
return "Show: " + value + (value == 1 ? " page" : " pages");
} else if(tag == "pgSnap") {
if (value == -4) return "Snap: none";
if (value == -3) return "Snap: visible";
if (value == -2) return "Snap: 1/4 page";
if (value == -1) return "Snap: 1/3 page";
if (value == 0) return "Snap: 1/2 page";
return "Snap: " + value + (value == 1 ? " page." : " pages");
} else if(tag == "gap") return `Gap: ${value}%`;
else if(tag == "pace") return `Pace: ${(value/1000).toFixed(2)} sec/snap`
};
let fitGroupDef = {
Auto:   { svg: "Fit Auto",   radio: "fit", redo: true},
None:   { svg: "Fit None",   radio: "fit", redo: true},
Width:  { svg: "Fit Width",  radio: "fit", redo: true},
Height: { svg: "Fit Height", radio: "fit", redo: true},
};
let bookSlidersGroupDef = {
pace: { min: 0, max: 1500, step: 10, curve:2, msg: (tag,value) =>
`Pace: ${(value/1000).toFixed(2)} sec/flip`}}
let horzSlidersGroupDef = {
pgShow: { min: 1, max: 8, step: 1, throttle: 750, row:1, col:1, msg: msgCallback},
pgSnap: { min: -4, max: 8,     step: 1,                  row:1, col:2, msg: msgCallback},
gap:    { min: 0,  max: 100,   step: 0.5, throttle: 750, row:2, col:1, msg: msgCallback},
pace:   { min: 0,  max: 10000, step: 1,   curve: 2,      row:2, col:2, msg: msgCallback},
};
let vertSlidersGroupDef = {
pgShow: { min: 1,  max: 8,     step: 1,   throttle: 750, col: 1, row: 1, msg: msgCallback},
pgSnap: { min: -4, max: 8,     step: 1,                  col: 2, row: 1, msg: msgCallback},
gap:    { min: 0,  max: 100,   step: 0.5, throttle: 750, col: 1, row: 2, msg: msgCallback},
pace:   { min: 0,  max: 10000, step: 1,   curve: 2,      col: 2, row: 2, msg: msgCallback},
};
let pnGroupDef = {
On:  { svg: "Numbers", radio: "pnShow" },
Off: { svg: "Close",   radio: "pnShow" },
};
let pnAxisGroupDef = {
Off:   { svg: "Close",       radio: "band" },
"L-R": { svg: "Numbers L-R", radio: "band" },
"T-B": { svg: "Numbers T-B", radio: "band" },
};
let pnPlaceGroupDef = {
Inset: { svg: "Numbers Inset", radio: "place" },
Over:  { svg: "Numbers Over",  radio: "place" },
};
let bandView = (cell) => {
let stash = Layout.normalizePn(cell);
return {
get band() { return stash.pnShow == "Off" ? "Off" : stash.pnBand.axis; },
set band(tag) {
if (tag == "Off") return void (stash.pnShow = "Off");
stash.pnShow = "On";
stash.pnBand.axis = tag;
},
get place() { return stash.pnBand.place; },
set place(tag) { stash.pnBand.place = tag; },
};
};
let copyDef = (def) =>
Object.fromEntries(Object.entries(def).map(([tag, d]) => [tag, { ...d }]));
this.pnBandGroups = {};
this.pnPlaceGroups = {};
this.syncPn = () => {
for (let [key, group] of Object.entries(this.pnPlaceGroups)) {
let off = Layout.normalizePn(_menu_.rings.layout.cells[key]).pnShow == "Off";
for (let d of Object.values(group.defs)) d.disabled = off;
group.refresh();
this.pnBandGroups[key].refresh();
}
};
let tableSlidersGroupDef = {
pages:         { min: 1,    max: 50,  step: 1, throttle: 750, fullWidth:true, msg: "Pages per row: {value}"},
horizontalGap: { min: -100, max: 100, step: 1, throttle: 750, row:2, col:1, msg: "Horizontal Gap: {value} %"},
verticalGap:   { min: -100, max: 100, step: 1, throttle: 750, row:2, col:2, msg: "Vertical Gap: {value} %"},
};
let stash = _menu_.rings.layout.cells.book.stash;
tags.fitBook.replaceWith(new ButtonGroup(stash, fitGroupDef, handler).elm);
tags.bookSliders.replaceWith(
new SliderGroup(stash, bookSlidersGroupDef, handler).elm,
);
let view = bandView(_menu_.rings.layout.cells.book);
this.pnBandGroups.book = new ButtonGroup(view, copyDef(pnAxisGroupDef), handler);
tags.pnBook.replaceWith(this.pnBandGroups.book.elm);
this.pnPlaceGroups.book = new ButtonGroup(view, copyDef(pnPlaceGroupDef), handler);
tags.pnBookPlace.replaceWith(this.pnPlaceGroups.book.elm);
stash = _menu_.rings.layout.cells.horizontal.stash;
tags.fitHorizontal.replaceWith(
new ButtonGroup(stash, fitGroupDef, handler).elm
);
tags.fitHorizontalSliders.replaceWith(
new SliderGroup(stash, horzSlidersGroupDef, handler).elm,
);
view = bandView(_menu_.rings.layout.cells.horizontal);
this.pnBandGroups.horizontal = new ButtonGroup(view, copyDef(pnAxisGroupDef), handler);
tags.pnHorizontal.replaceWith(this.pnBandGroups.horizontal.elm);
this.pnPlaceGroups.horizontal = new ButtonGroup(view, copyDef(pnPlaceGroupDef), handler);
tags.pnHorizontalPlace.replaceWith(this.pnPlaceGroups.horizontal.elm);
stash = _menu_.rings.layout.cells.vertical.stash;
tags.fitVertical.replaceWith(
new ButtonGroup(stash, fitGroupDef, handler).elm
);
tags.fitVerticalSliders.replaceWith(
new SliderGroup(stash, vertSlidersGroupDef, handler).elm
);
view = bandView(_menu_.rings.layout.cells.vertical);
this.pnBandGroups.vertical = new ButtonGroup(view, copyDef(pnAxisGroupDef), handler);
tags.pnVertical.replaceWith(this.pnBandGroups.vertical.elm);
this.pnPlaceGroups.vertical = new ButtonGroup(view, copyDef(pnPlaceGroupDef), handler);
tags.pnVerticalPlace.replaceWith(this.pnPlaceGroups.vertical.elm);
stash = _menu_.rings.layout.cells.table.stash;
let def = { Width: fitGroupDef.Width, Height: fitGroupDef.Height };
tags.fitTable.replaceWith(new ButtonGroup(stash, def, handler).elm);
tags.tableFlowSliders.replaceWith(
new SliderGroup(stash, tableSlidersGroupDef, handler).elm
);
tags.pnTable.replaceWith(new ButtonGroup(stash, copyDef(pnGroupDef), handler).elm);
this.syncPn();
}
show() {
super.show();
this.syncPn();
Object.values(this.faces).forEach((face) => face.remove());
this.content.append(this.faces[this.cell.key]);
return this;
}
}
class BookPanel extends LayoutPanel {}
class HorizontalPanel extends LayoutPanel {}
class VerticalPanel extends LayoutPanel {}
class TablePanel extends LayoutPanel {}
class StoragePanel extends Panel {
constructor(cell) {
super(cell);
Object.assign(this.body.style, {
margin: 0,
padding: "1em",
minWidth: "20em",
});
let content = helm(`
<div style="text-align:center;">
<div style="margin-bottom:1.5em;">
<div style="font-size:1.2em;margin-bottom:0.5em;">Reset and clear</div>
<div data-tag="buttons"></div>
</div>
<div>
<div style="font-size:1.2em;margin-bottom:0.5em;">Storage usage</div>
<div data-tag="stats" style="display:grid;grid-template-columns:auto auto;font-size:.8em;text-align:left;width:fit-content;margin:0 auto;"></div>
<div data-tag="refresh" style="margin-top:0.5em;"></div>
</div>
</div>
`);
let { buttons, stats, refresh } = dataIndex("tag", content);
buttons.replaceWith(
new ButtonGroup(
cell,
{ 'Reset menu settings': { svg:'Menu' }, 'Clear recent files': { svg:'Score' },
'Clear shared page buffer': { svg:'Import Page' }, 'Reload app': { svg:'Reload' } },
async (e, prop, tag) => {
tag = { 'Reset menu settings':'Menu', 'Clear recent files':'Recent',
'Clear shared page buffer':'Import', 'Reload app':'Reload' }[tag];
if (tag == "Menu") {
dialog("Reset all menu settings to defaults? Open panels will be closed.",
{ Reset: { svg: "Menu" }, Cancel: { svg: "Cancel" } },
(e, prop, tag, args) => {
args.close();
if (tag == "Reset") {
_menu_.closePanels();
_menu_.factoryReset();
toast("Menu reset");
}
});
} else if (tag == "Recent") {
localStorage.setItem("recent", []);
await FileSrc.clearLocalRecent();
for (let src of Object.values(Score.sources))
localStorage.setItem(src, "");
toast("Recent list cleared");
} else if (tag == "Import") {
await _podPb_.pgClear();
toast("Import buffer cleared");
} else if (tag == "Reload") {
let url = `${location.origin}${location.pathname}`;
dialog(`Confirm: restart Rostrum?<br><span style="font-size:0.8em;color:var(--color-text-secondary)">(${escapeHtml(url)})</span><br>Any unsaved changes will be lost`,
{ Restart: { svg: "Reload" }, Cancel: { svg: "Cancel" } },
(e, prop, tag, args) => {
args.close();
if (tag == "Restart") {
if (globalThis._rostrumPages_) {
globalThis._rostrumPages_.reload();
return;
}
let url = new URL(location.href);
url.searchParams.set("t", Date.now());
location.replace(url.href);
}
});
}
this.updateStats();
}
).elm
);
refresh.replaceWith(
new ButtonGroup(
cell,
{ Refresh: { svg: "Refresh" } },
() => this.updateStats()
).elm
);
this.listeners.push(listen(document, "scoreOpened", () => this.updateStats()));
this.listeners.push(listen(document, "scoreClosed", () => this.updateStats()));
content.append(content.firstElementChild);
for (const group of content.querySelectorAll('.ButtonGroup')) {
group.style.cssText = 'flex-wrap:wrap;gap:.5em;';
}
for (const action of content.querySelectorAll('.ButtonGroup__button')) {
action.style.cssText = 'width:auto;height:auto;min-height:3em;padding:.5em;white-space:normal;';
}
this.statsElm = stats;
this.body.append(content);
}
show() {
super.show();
this.updateStats();
return this;
}
async updateStats() {
let statsElm = this.statsElm;
let rows = [];
let localStorageSize = 0;
for (let key in localStorage) {
if (localStorage.hasOwnProperty(key)) {
localStorageSize += localStorage[key].length * 2;
}
}
rows.push(`<div style="text-align:right;">localStorage:&nbsp;</div><div>${this.formatBytes(localStorageSize)}</div>`);
if (navigator.storage && navigator.storage.estimate) {
try {
let estimate = await navigator.storage.estimate();
rows.push(`<div style="text-align:right;">IndexedDB:&nbsp;</div><div>${this.formatBytes(estimate.usage || 0)}</div>`);
rows.push(`<div style="text-align:right;">Quota:&nbsp;</div><div>${this.formatBytes(estimate.quota || 0)}</div>`);
} catch (e) {
rows.push(`<div style="text-align:right;">IndexedDB:&nbsp;</div><div>unavailable</div>`);
}
}
if (performance.memory) {
rows.push(`<div style="text-align:right;">JS Heap:&nbsp;</div><div>${this.formatBytes(performance.memory.usedJSHeapSize)}</div>`);
rows.push(`<div style="text-align:right;">Heap Limit:&nbsp;</div><div>${this.formatBytes(performance.memory.jsHeapSizeLimit)}</div>`);
}
statsElm.innerHTML = rows.join("");
}
formatBytes(bytes) {
if (bytes === 0) return "0 B";
let k = 1024;
let sizes = ["B", "KB", "MB", "GB"];
let i = Math.floor(Math.log(bytes) / Math.log(k));
return (bytes / Math.pow(k, i)).toFixed(1) + " " + sizes[i];
}
}
class MetronomePanel extends Panel {
static css = css(
"MetronomePanel",
`.Metronome
{ flex-flow:column;
}
.Metronome__patterns
{ width: 12em;
padding-top:1em;
}
}
`
);
options = {
"Metronome":"metronome",
"One":"one",
"Two":"two",
"Three":"three",
"Four":"four",
"Five (3+2)":"five",
"Six (3+3)":"six",
} ;
content = helm(
`<div data-tag="body" class="Panel__body Metronome centerChild"></div>`
);
constructor(cell) {
super(cell);
this.body.replaceWith(this.content);
Object.assign(this, dataIndex("tag", this.content));
let stash = cell.stash ;
stash.state = "Play";
let metronome = (this.metronome = new Metronome(this));
metronome.tempo = stash.tempo;
metronome.latency = stash.latency;
metronome.mute = (stash.mute == "Unmute");
metronome.beatPattern = metronome.beatPatterns.find(p => p.name == stash.pattern);
let stashed = Object.keys(this.options).find(key => this.options[key] == stash.pattern);
let patterns = new Select(Object.keys(this.options), stashed, this, () => false) ;
this.content.append(patterns.elm) ;
patterns.elm.classList.add("Metronome__patterns") ;
listen(patterns.toggle, "SELECTED",
(e) => metronome.setPattern(stash.pattern = this.options[e.detail]));
this.mediaGroup = new ButtonGroup(
stash,
{
Play: { svg: "Play", redo: true, toggle: "state" },
Pause: { svg: "Pause", redo: true, toggle: "state" },
Show: { svg: "ShowTrace", toggle: "trace" },
Hide: { svg: "HideTrace", toggle: "trace" } ,
Mute: { svg: "Mute", toggle: "mute" } ,
Unmute: { svg: "Unmute", toggle: "mute" } ,
},
(e, prop, tag) => {
if(prop == "trace") {
stash.trace = (tag == "Show") ? "Hide":"Show" ;
metronome.showTrace(tag == "Show") ;
}
else if(prop == "state") {
stash.state = (tag == "Play") ? "Pause":"Play" ;
metronome.play(tag == "Play") ;
}
else if(prop == "mute") {
stash.mute = (tag == "Mute") ? "Unmute":"Mute" ;
metronome.setMute(tag == "Mute") ;
}
this.mediaGroup.refresh() ;
});
this.content.append(this.mediaGroup.elm);
this.mediaGroup.refresh();
this.adjuster = new Schedule(100, () => metronome.play(true)) ;
this.tempoGroup = new SliderGroup(
stash,
{
tempo: { min: 1, max: 220, step: 1, msg: `Tempo: {value} ${noTranslate("bpm")}`, value: 60, },
latency: { min: -300, max: 300, step: 10, msg: "Latency: {value}ms", value: 0},
},
(e, prop, value) => {
metronome.tempo = stash.tempo;
metronome.latency = stash.latency;
if (prop == "tempo" && metronome.bpm)
metronome.bpm.textContent = Math.round(stash.tempo);
if (stash.state == "Pause") {
metronome.play(false);
this.adjuster.run(Math.max(500, metronome.tempo * 1.5)) ;
}
}
);
this.tempoGroup.elm.style.width = "14em";
this.content.append(this.tempoGroup.elm);
this.tempoGroup.refresh();
this.metronome.showTrace(stash.trace != "Show");
}
destructor() {
super.destructor();
this.metronome.destructor();
}
show() {
super.show();
this.metronome.show();
return this;
}
}
class NumbersPanel extends Panel {
content = helm(`
<div data-tag="body" style="width:15em;" class="Panel__body">
<div data-tag="sliders"></div>
</div>
`);
constructor(cell) {
super(cell);
this.body.replaceWith(this.content);
Object.assign(this, dataIndex("tag", this.content));
this.schedule = new Schedule();
let score = _score_;
let formatPn = () => {
return `Page: ${pnToHtml(_score_.numbers.pn)}
${noTranslate(`(${~~_score_.numbers.pn} / ${score.pgs.length})`)}`;
};
let defs = {
pn: { min: 1, max: score.pgs.length, value: score.numbers.pn, step: 1,
msg: formatPn, throttle: 500, fullWidth:true},
prelim: {min: 0, max: 100,value: _score_.numbers.prelim,step: 1,
msg: () => `Roman: ${noTranslate(_score_.numbers.prelim)}`,throttle: 500, row:2, col:1 },
first: { min: 1, max: 1000, value: _score_.numbers.first, step: 1,
msg: () => `First: ${noTranslate(_score_.numbers.first)}`,throttle: 500, row:2, col:2},
};
this.pnSliderGroup = new SliderGroup(
_score_.numbers,
defs,
(e, tag, value) =>
_body_.dispatchEvent(new CustomEvent("NUMBERS", { detail: { sender:this, tag: tag, value: value} }))
);
this.sliders.replaceWith(this.pnSliderGroup.elm);
this.listeners.push(listen(_body_, "NUMBERS", (e) => {
if (e.detail.sender === this) return;
this.refresh();
}));
}
refresh() {
let defs = this.pnSliderGroup.defs;
defs.pn.max = _score_.pgs.length;
this.pnSliderGroup.refresh();
}
}
class PencilPanel extends Panel {
static css = css(
"PencilPanel",
`.PencilPanel__preview {
overflow: hidden;
height: 6em;
border: 1px solid var(--color-border);
border-radius: var(--borderRadius);
background-color: #fff;
background-image:
linear-gradient(45deg, #e8e8e8 25%, transparent 25%),
linear-gradient(-45deg, #e8e8e8 25%, transparent 25%),
linear-gradient(45deg, transparent 75%, #e8e8e8 75%),
linear-gradient(-45deg, transparent 75%, #e8e8e8 75%);
background-size: 0.5em 0.5em;
background-position: 0 0, 0 0.25em, 0.25em -0.25em, -0.25em 0;
}
`
);
slidersDef = {
width: { min: 0.2, max: 60, step: 0.1, value: 1, throttle: 250,
msg: "Line Width: {value} px",
},
};
buttonsDef = {
Free: { svg: "Free", radio: "style" },
"L-R": { svg: "L-R", radio: "style" },
"T-B": { svg: "T-B", radio: "style" },
Slope: { svg: "Slope", radio: "style" },
};
content = helm(`
<div data-tag="body" class="Panel__body">
<div data-tag="preview" class="PencilPanel__preview"></div>
<div data-tag="picker"></div>
<div data-tag="sliders"></div>
<div data-tag="buttons"></div>
</div>`);
constructor(cell) {
super(cell);
this.body.replaceWith(this.content);
Object.assign(this, dataIndex("tag", this.content));
let stash = cell.stash;
delay(1, () => {
if (this.buttonsDef)
this.sliders.after(helm(`<div>Style</div>`));
let picker = new ColorPicker(
"Color",
stash.rgb,
stash.alpha,
(rgb, alpha) => {
stash.rgb = rgb;
stash.alpha = alpha;
this.update();
}
);
this.picker.replaceWith(picker.elm);
this.picker = picker.elm;
this.colorPicker = picker;
if (this.slidersDef) {
let sliders = new SliderGroup(
this.cell.stash,
this.slidersDef,
(e, tag, value) => {
this.update();
}
);
this.sliders.replaceWith(sliders.elm);
this.sliders = sliders;
}
if (this.buttonsDef) {
let buttons = new ButtonGroup(
this.cell.stash,
this.buttonsDef,
(e, tag, value) => {
this.update();
}
);
this.buttons.replaceWith(buttons.elm);
this.buttons = buttons;
}
this.update();
});
}
sync() {
let { rgb, alpha } = this.cell.stash;
this.colorPicker?.set(rgb, alpha);
this.sliders.refresh?.();
this.buttons.refresh?.();
this.settings = undefined;
this.update();
}
update() {
let { alpha, rgb, style, width } = this.cell.stash;
let changed = this.changed();
clearChildren(this.preview);
let path =
style == "Free"
? "M10 50C66 -50 132 150 190 50"
: style == "L-R"
? "M10 50h180"
: style == "T-B"
? "M100 10v80"
: "M10 10L180 90";
this.preview.append(
helm(
`<svg viewBox="0 0 200 100">
<path style="fill:none;stroke:${rgb};stroke-width:${width}px;stroke-linecap:round;opacity:${alpha}" d="${path}"/></svg>`
)
);
let active = _score_?.getActiveObject();
if (!changed || active?.rostrumType != this.cell.key || active.type != "path" || active.flatten) return;
let color = fabric.Color.fromHex(rgb);
color.setAlpha(alpha);
let center = active.getCenterPoint();
active.set({ stroke: color.toRgba(), strokeWidth: width, dirty: true });
active.rostrumStash = { ...active.rostrumStash, alpha, rgb, width };
active.setPositionByOrigin(center, "center", "center");
active.setCoords();
active.canvas.fire("object:modified", { target: active });
active.canvas.requestRenderAll();
_score_.setDirty(true);
}
show() {
super.show();
this.update();
return this;
}
}
class PenPanel extends PencilPanel {}
class RastrumPanel extends PencilPanel {
slidersDef = {
gap: {
throttle: 250, min: 1, max: 40, step: .5, value: 8, fullWidth:true, msg: "Staff Space: {value}px" },
lines: {
throttle: 250, min: 1, max: 60, step: 1, value: 5, row:2, col:1, msg: "Lines: {value}"},
width: {
throttle: 250, min: 0, max: 20, step: 0.1, value: 1, row:2, col:2, msg: (tag, value) =>
`Width: ${value == 0 ? "Auto":value + "px"}` },
bars: {
throttle: 250, min: 0, max: 60, step: 1, value: 4, row:3, col:1, msg: "Bars: {value}" },
barWidth: {
throttle: 250, min: 0, max: 30, step: 0.1, value: 4, row:3, col:2, msg: (tag, value) =>
`Width: ${value == 0 ? "Auto":value + "px"}` },
};
buttonsDef = {
"L-R": { svg: "L-R", radio: "style" },
"T-B": { svg: "T-B", radio: "style" },
};
constructor(cell) {
super(cell);
}
update() {
let { alpha, rgb, style, lines, width, gap, bars, barWidth} =
this.cell.stash;
let changed = this.changed();
clearChildren(this.preview);
let linePath = "";
let barPath = "";
if (width == 0) width = .13 * gap ;
if (barWidth == 0) barWidth = .16 * gap ;
let staffHeight = (lines - 1) * gap + width;
let offset = (50 - staffHeight) / 2;
for (let i = 0, y = offset; ++i <= lines; y += gap)
if (style == "L-R") linePath += `M5 ${y}h90v${width}h-90Z`;
else linePath += `M${y} 5v90h${width}v-90Z`;
if(bars > 0) {
let barSpan = (90 - barWidth) / bars;
if (style == "L-R")
for (let i = 0, x = 5; i++ <= bars; x += barSpan)
barPath += `M${x} ${offset}5v${staffHeight}h${barWidth}v${-staffHeight}Z`;
else
for (let i = 0, y = 5; i <= bars; i++, y += barSpan)
barPath += `M${offset} ${y}v${barWidth}h${staffHeight}v${-barWidth}Z`;
}
this.preview.append(
helm(
`<svg viewBox="0 0 100 100">
<path style="fill:${rgb};opacity:${alpha}" d="${linePath}"/>
<path style="fill:${rgb};opacity:${alpha}" d="${barPath}"/>
</svg>`
)
);
let active = _score_?.getActiveObject();
if (!changed || active?.rostrumType != this.cell.key || active.flatten) return;
fabric.RastrumBrush.redraw(active, this.cell.stash);
active.canvas.fire("object:modified", { target: active });
_score_.setDirty(true);
}
}
class TextPanel extends PencilPanel {
slidersDef = {
size: { min: 1, max: 100, step: 1, value: 1, row:1, col:1, msg: "Size: {value} px"},
height: { min: 1, max: 100, step: 1, value: 1, row:1, col:2, msg: "Spacing: {value} px"},
};
buttonsDef = null;
fonts = [
"Courier",
"Courier-Bold",
"Courier-Oblique",
"Courier-BoldOblique",
"Helvetica",
"Helvetica-Bold",
"Helvetica-Oblique",
"Helvetica-BoldOblique",
"Times-Roman",
"Times-Bold",
"Times-Italic",
"Times-BoldItalic",
"Bravura",
"Vercetti",
"Patrick Hand",
"Noto Sans JP",
] ;
text = helm(`<div>Abc<br>123<br></div>`);
constructor(cell) {
super(cell);
let fontLabel = helm(`<div class="Panel__item">Font</div>`);
this.picker.after(fontLabel);
let select = new Select(this.fonts, cell.stash.font, this, () => false) ;
this.fontSelect = select;
fontLabel.after(select.elm) ;
this.preview.append(this.text);
this.listeners.push(listen(select.toggle, "SELECTED", (e) => this.update(e.detail)));
this.preview.append(this.text);
this.fonts.value = cell.stash.font ;
this.update();
}
sync() {
this.fontSelect?.set(this.cell.stash.font);
super.sync();
}
async update(fontName) {
if (fontName) this.cell.stash.font = fontName;
let { font, size, height, rgb, alpha } = this.cell.stash;
if (globalThis._rostrumPages_) {
try { await globalThis._rostrumPages_.font(font); }
catch (error) { toast(error.message); return; }
if (this.cell.stash.font !== font) return;
}
let changed = this.changed();
this.text.style.fontSize = size / _pxPerEm_ + "em";
this.text.style.lineHeight = height / _pxPerEm_ + "em";
this.text.style.color = rgb + Math.round(alpha * 255).toString(16).padStart(2, "0");
Object.assign(this.preview.style, fontMap[font]);
let active = _score_?.getActiveObject();
if (!changed || active?.type != "textbox" || active.flatten) return;
let color = fabric.Color.fromHex(rgb);
color.setAlpha(alpha);
active.fill = color.toRgba();
active.fontSize = size - 1;
active.lineHeight = height / size;
Object.assign(active, fontMap[font]);
active.rostrumStash = { alpha, font, size, height, rgb };
active.initDimensions();
active.setCoords();
active.canvas.requestRenderAll();
delay(1, () => {
active.fontSize = size;
active.initDimensions();
active.setCoords();
active.canvas?.fire("object:modified", { target: active });
active.canvas?.requestRenderAll();
});
_score_.setDirty(true);
}
}
class ReviewPanel extends Panel {
constructor(cell) {
super(cell);
this.review = new Review(this);
this.body.replaceWith(this.review.elm);
delay(2, () => this.review.build());
}
close() {
this.review.closed = true;
this.review.stopAnimations();
super.close();
}
destructor() {
super.destructor();
this.review.destructor();
}
}
class VolumePanel extends Panel {
constructor(cell) {
super(cell);
this.volume = new Volume(this);
}
destructor() {
super.destructor();
this.volume.destructor();
}
show() {
super.show();
this.volume.show();
return this;
}
hide() {
super.hide();
this.volume.hide();
}
}
class Pzr extends Surface {
static css = css(
"Pz",
`
.Pz {
display:grid;
grid-template-columns:repeat(5, 1.6em);
grid-template-rows:repeat(5, 1.6em);
justify-items:center;
align-items:center;
}
.Pz__control {
/* Explicit size: an inline <svg viewBox=...> with no width/height falls
back to the 300x150 replaced-element default on WebKit/iOS (Blink and
Gecko shrink it to the grid cell), which blew the controls up ~10x.
Pin it to the 1.6em grid cell. */
width: 1.6em;
height: 1.6em;
fill: none;
stroke: #444;
stroke-width: 8;
stroke-linecap: round;
stroke-linejoin: round;
}
[data-theme="Dark"] .Pz__control {
stroke: #888 ;
}
.Pz__control-active {
color: #6c6;
transform: scale(1.2);
}
`) ;
grid = helm(`
<div class="Pz Surface__outline">
<!-- translate up, right, down, left: pos 2,14,22,10-->
<svg class="Pz__control" style="grid-row:1;grid-column:3;" viewBox="0 0 100 100"><path d="M10 60L50 10L90 60Q50 40 10 60"/></svg>
<svg class="Pz__control" style="grid-row:3;grid-column:5;" viewBox="0 0 100 100"><path d="M40 10L90 50L40 90Q 60 40 40 10"/></svg>
<svg class="Pz__control" style="grid-row:5;grid-column:3;" viewBox="0 0 100 100"><path d="M10 40L50 90L90 40Q 50 60 10 40"/></svg>
<svg class="Pz__control" style="grid-row:3;grid-column:1;" viewBox="0 0 100 100"><path d="M60 10L10 50L60 90Q 40 50 60 10"/></svg>
<!-- rotate conterclockwise, clockwise: pos 6,8-->
<svg class="Pz__control" style="grid-row:2;grid-column:2;"data-tag="ccw"  viewBox="0 0 100 100">
<path d="M50 22 A28 28 0 1 1 30.2 70 M50 14 L50 30 L34 22 Z"/></svg>
<svg class="Pz__control" style="grid-row:2;grid-column:4;" data-tag="cw"  viewBox="0 0 100 100">
<path  d="M50 22 A28 28 0 1 1 30.2 70 M50 14 L50 30 L34 22 Z" transform="translate(100,0) scale(-1, 1)"/></svg>
<!-- edit prev, next: pos 16,18-->
<svg class="Pz__control" style="grid-row:4;grid-column:2;", data-tag="left" viewBox="0 0 100 100">
<path d="M25,18A8,8 0 1,0 25,17.9M32,26L58,60M40,33L25,48L8,48M40,33L55,20L72,33M58,60L38,75L50,94M58,60L76,67L92,64"/></svg>
<svg class="Pz__control" style="grid-row:4;grid-column:4;", data-tag="right" viewBox="0 0 100 100">
<path d="M75,18A8,8 0 1,1 75,17.9M68,26L42,60M60,33L75,48L92,48M60,33L45,20L28,33M42,60L62,75L50,94M42,60L24,67L8,64"/></svg>
<!-- scale down, up: pos 11,13 -->
<svg class="Pz__control" style="overflow:visible;grid-row:3;grid-column:4;" viewBox="0 0 100 100"><path d="M10 20L120 50L10 80"/></svg>
<svg class="Pz__control" style="overflow:visible;grid-row:3;grid-column:2;" viewBox="0 0 100 100"><path d="M90 20L-20 50L90 80"/></svg>
<!-- active object, pos 12 -->
${iconSvg("Void", {class:"Pz__control", style:"grid-row:3;grid-column:3;pointer-events:none;opacity:0.5;"})}
<!-- cut, pos 4 -->
${iconSvg("Cut", {class:"Pz__control", style:"transform:translateY(-3px);grid-row:1;grid-column:5;fill:currentColor;stroke:none;", tag:"cutBtn"})}
</div>
`);
slots = [2,4,6,8,10,11,12,13,14,16,18,22] ;
targets = [] ;
constructor(panel) {
super(panel, ScreenPanel);
Object.assign(this, dataIndex("tag", this.grid)) ;
this.surface.append(this.grid) ;
panel.body.style.minWidth = panel.body.style.padding = "unset";
this.surface.style.width = this.surface.style.height = "10em" ;
this.grid.style.width = this.grid.style.height = "10em" ;
this.repeater = new Schedule();
this.update();
this.panel.listeners.push(listen(this.grid, "pointerdown", (e) => {
let box  = getBox(this.surface) ;
let row = parseInt((e.clientY - box.y) / box.height * 5) ;
let col = parseInt((e.clientX - box.x) / box.width * 5) ;
let pos = row * 5 + col ;
if(!this.slots.includes(pos)) return ;
e.taken = true;
_menu_.busy = true ;
let target = e.target.tagName == "path" ? e.target.parentElement : e.target;
if(this.getTargets()) {
target.classList.add("Pz__control-active") ;
e.stopPropagation();
e.target.setPointerCapture(e.pointerId);
this.opStartTime = performance.now();
this.opStartValues = this.targets.map(item => item[1]);
this.doStep(pos);
let loopSpeed = (pos == 16 || pos == 18) ? 350 : 50 ;
this.repeater.run(250, () => {
let loop = () => {
this.doStep(pos);
this.repeater.run(loopSpeed, loop);
};
loop();
});
}
listen(this.grid, "pointerup", () => {
target.classList.remove("Pz__control-active") ;
this.repeater.cancel();
_menu_.busy = false;
_menu_.autoOff.run();
}, { once: true });
}));
}
update() {
let getIconPath = () => {
let type = EditPanel.pzrTarget?.rostrumType || EditPanel.pzrTarget?.type ;
this.grid.classList.remove("Pz__noTarget") ;
switch(type) {
case undefined: return iconPaths["Void"];
case "pencil": return iconPaths["Pencil"] ;
case "pen": return iconPaths["Pen"] ;
case "rastrum": return iconPaths["Rastrum"] ;
case "symbols": return iconPaths["Symbols"] ;
case "textbox": return iconPaths["Text"] ;
case "text": return iconPaths["Symbols"] ;
default: return iconPaths["Edit"] ;
}
}
let tmp = helm(`<svg viewBox="0 0 24 24" width="1.6em" height="1.6em"
style="grid-column:3;grid-row:3;stroke:none;fill:currentColor;">
${getIconPath()}</svg>`) ;
this.iconSvg.replaceWith(tmp) ;
this.iconSvg = tmp ;
}
doStep(pos) {
let obj = EditPanel.pzrTarget;
if(!obj) return;
let elapsed = performance.now() - this.opStartTime;
if (pos == 4) {
this.repeater.cancel();
_menu_.cutCopyObject(obj, obj.canvas, true);
return;
}
let step = 1;
switch(pos) {
case 16: step = -1;
case 18:
let objs = obj.canvas.getObjects();
let knt = objs.length;
let i = (objs.indexOf(obj) + knt + step) % knt;
obj.canvas.setActiveObject(objs[i]) ;
break;
default: {
let a = Object.assign({},
(elapsed > 2000) ? { rotate:20.0, scale:0.10, translate:50} :
(elapsed > 1200) ? { rotate: 5.0, scale:0.05, translate:20} :
(elapsed >  600) ? { rotate: 1.0, scale:0.02, translate: 5} :
{ rotate: 0.2, scale:0.01, translate: 1});
let center = obj.getCenterPoint();
let p = { originX: "center", originY: "center", left: center.x, top: center.y };
let moved = false;
switch(pos) {
case 6: a.rotate = -a.rotate;
case 8: p.angle = (obj.angle + a.rotate) % 360;
break ;
default: {
let scale = 1 - a.scale;
switch(pos) {
case 11: scale = 1 + a.scale;
case 13: p.scaleX = Math.max(0.01, obj.scaleX * scale);
p.scaleY = Math.max(0.01, obj.scaleY * scale);
break ;
default: {
let dx = 0, dy = 0 ;
switch(pos) {
case 2:  dy = -a.translate; break;
case 10: dx = -a.translate; break;
case 14: dx =  a.translate; break;
case 22: dy =  a.translate; break;
}
let minTrans = 1 / (obj.canvas.getZoom() * window.devicePixelRatio);
p.left = center.x + dx * minTrans;
p.top  = center.y + dy * minTrans;
moved = true;
}}}}
obj.set(p);
if (moved) obj.clampToPage();
}}
obj.canvas?.requestRenderAll();
_menu_.magnifier?.panel?.updateMagnifier();
}
getTargets()
{
let obj = EditPanel.pzrTarget ;
if (obj) {
this.targets[0] = [obj, {
left: obj.left,
top: obj.top,
scaleX: obj.scaleX,
scaleY: obj.scaleY,
angle: obj.angle,
originX: obj.originX,
originY: obj.originY
}];
return true ;
}
this.grid.classList.add("Pz__noTarget") ;
return false ;
}
}
class SurfacePanel extends Panel {
constructor(cell) {
super(cell);
this.body.classList.add("centerChild");
this.body.style.padding = "1em";
}
destructor() {
super.destructor();
this.surface?.destructor();
}
show() {
super.show();
this.surface?.show();
return this;
}
hide() {
super.hide();
this.surface?.hide();
return this;
}
}
class ClockPanel extends SurfacePanel {
surface = new Clock(this);
constructor(cell) {
super(cell);
this.body.style.minWidth = "unset" ;
this.body.style.padding = "unset" ;
}
}
class EditPanel extends SurfacePanel {
static pzrTarget = null ;
static update(target) {
EditPanel.pzrTarget = target;
_panels_.edit?.surface.update();
}
surface = new Pzr(this);
constructor(cell) {
super(cell);
this.body.append(menuActionList(this, ['ink/cut', 'ink/copy', 'ink/paste', 'ink/grid']));
}
}
class Keyboard extends Surface {
static css = css(
"Keyboard", `
.Keyboard__rows {
display:flex;
flex-direction:column;
gap:0.25em;
padding:0.25em;
touch-action:none;
user-select:none;
width:20em;
-webkit-user-select:none;
}
.Keyboard__row {
display:flex;
gap:0.25em;
}
.Keyboard__key
{ flex:1 1 0;
border-radius:100vmax;
border:1px solid #444;
background:#fffa;
display:flex;
align-items:center;
justify-content:center;
font-size:.8em;
font-family:system-ui,sans-serif;
}
.Keyboard__key.mod {
background:#aaaa;
}
.Keyboard__key.pressed {
background:#8888;
}
[data-theme="Dark"] .Keyboard__key {
background:#444a;
border-color:#aaa;
}
[data-theme="Dark"] .Keyboard__key.mod {
background:#555a;
}
[data-theme="Dark"] .Keyboard__key.pressed {
background:#999a;
}
`) ;
mods = new Set(['⇧','⌫','↵','⋯','Aa','←','↑','↓','→','Home','End']);
spaceBar = '       ';
layers = {
lower:  [['`','1','2','3','4','5','6','7','8','9','0','-','='],
['q','w','e','r','t','y','u','i','o','p','[',']','\\'],
['a','s','d','f','g','h','j','k','l',';',"'"],
['⇧','z','x','c','v','b','n','m',',','.','/','⌫'],
['⋯',this.spaceBar,'↵']],
upper:   [['~','!','@','#','$','%','^','&','*','(',')','_','+'],
['Q','W','E','R','T','Y','U','I','O','P','{','}','|'],
['A','S','D','F','G','H','J','K','L',':','"'],
['⇧','Z','X','C','V','B','N','M','<','>','?','⌫'],
['⋯',this.spaceBar,'↵']],
sym:     [['á','é','í','ó','ú','à','è','ù','â','ê','î'],
['ô','û','ä','ö','↑','ñ','ç','ß','Home'],
['ã','õ','ü','←','↓','→','å','ø','End'],
['æ','œ','ð','¿','¡','«','»','⌫'],
['Aa',this.spaceBar,'↵']],
};
keyWidths = {'⇧':1.5,'⌫':1.5,'↵':1.5,'⋯':1.5,'Aa':1.5,'↑':1.5,'↓':1.5,'←':1.5,'→':1.5,'Home':2,'End':2.2,[this.spaceBar]:3};
navKeys = {'↑':'ArrowUp','↓':'ArrowDown','←':'ArrowLeft','→':'ArrowRight','Home':'Home','End':'End'};
repeater = new Schedule(); // implement auto-repeat on long press
content = helm(`<div class="Surface__outline"><div data-tag="plate" class="Keyboard__rows"></div></div>`) ;
constructor(panel) {
super(panel, ScreenPanel) ;
Object.assign(this, dataIndex("tag", this.content));
this.layer = 'lower';
this.surface.style.width = this.surface.style.height = "unset" ;
this.surface.append(this.content) ;
this.panel.listeners.push(
listen(this.surface, "pointerdown", (e) => {
e.stopPropagation();
e.preventDefault();
let key = e.target.closest('.Keyboard__key');
if (!key) return;
e.frozen = true ; // disallow dragging if a key is pressed
// add a sentinel so that touch users will see the chosen key.
// well use it's dom-connectedness to terminate a repeat
let sentinel = key.cloneNode(true) ;
let style = getComputedStyle(e.target);
Object.assign(sentinel.style, {
transform: "scale(1.5)",
width: style.width,
height: style.height,
left: e.clientX + "px",
top: e.clientY - 50 + "px",
zIndex:_zTop_ + 1,
fontSize: style.fontSize,
position: "absolute",
filter: "invert(1)",
});
_body_.append(sentinel);
key.classList.add('pressed');
this.handle(key.dataset.label, e.clientX, e.clientY);
if (!['⇧','⋯','Aa'].includes(key.dataset.label)) {
let repeat = () => {
if (!sentinel.isConnected) return;
this.handle(key.dataset.label, e.clientX, e.clientY);
this.repeater.run(80);
};
this.repeater.run(500, repeat);
}
listen(document, "pointerup", () => { // must be on document, not surface
sentinel.remove();
key.classList.remove('pressed');
}, {once:true});
})
);
this.build();
}
build() {
let esc = (s) => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
let html = '';
this.layers[this.layer].forEach(row => {
html += '<div class="Keyboard__row">';
row.forEach(label => {
let grow = this.keyWidths[label] || 1;
let mod  = this.mods.has(label) ? ' mod' : '';
html += `<div class="Keyboard__key${mod}" data-label="${esc(label)}" style="flex:${grow} 1 0">${esc(label.trim())}</div>`;
});
html += '</div>';
});
this.plate.innerHTML = html;
}
handle(label, x, y) {
switch (label) {
case '⇧':  this.layer = this.layer == 'upper' ? 'lower' : 'upper'; this.build(); return;
case '⋯': this.layer = 'sym';    this.build(); return;
case 'Aa': this.layer = 'lower'; this.build(); return;
}
let ch = label.trim() == '' ? ' ' : label;
this.emitKey(ch);
if (this.layer == 'upper') { this.layer = 'lower'; this.build(); }
}
emitKey(ch) {
let elm = this.target || document.activeElement;
if (!elm) return;
let isText = elm.tagName == 'INPUT' || elm.tagName == 'TEXTAREA';
let dispatch = (event,key) => elm.dispatchEvent(new KeyboardEvent(event,{key:key,code:key,bubbles:true})) ;
switch (ch) {
case '↑': case '↓': case '←': case '→': {
let k = this.navKeys[ch];
dispatch('keydown', k);
if (isText && (ch == '←' || ch == '→')) {
let s = elm.selectionStart, e = elm.selectionEnd;
let pos = (s == e) ? (ch == '←' ? Math.max(0, s-1) : Math.min(elm.value.length, s+1))
: (ch == '←' ? s : e);
elm.selectionStart = elm.selectionEnd = pos;
}
dispatch('keyup', k);
break;
}
case 'Home': case 'End': {
let k = this.navKeys[ch];
dispatch('keydown', k);
if (isText) elm.selectionStart = elm.selectionEnd = (ch == 'Home') ? 0 : elm.value.length;
dispatch('keyup', k);
break;
}
case '⌫':
dispatch('keydown','Backspace') ;
if (isText) {
let s = elm.selectionStart, e = elm.selectionEnd;
if (s == e && s > 0) { elm.value = elm.value.slice(0,s-1) + elm.value.slice(s); elm.selectionStart = elm.selectionEnd = s-1; }
else if (s != e)     { elm.value = elm.value.slice(0,s)   + elm.value.slice(e); elm.selectionStart = elm.selectionEnd = s; }
elm.dispatchEvent(new InputEvent('input', {bubbles:true}));
}
dispatch('keyup','Backspace') ;
break;
case '↵':
dispatch('keydown','Enter') ;
if (isText && elm.tagName == 'TEXTAREA') {
let s = elm.selectionStart, e = elm.selectionEnd;
elm.value = elm.value.slice(0,s) + '\n' + elm.value.slice(e);
elm.selectionStart = elm.selectionEnd = s + 1;
elm.dispatchEvent(new InputEvent('input', {inputType:'insertLineBreak', bubbles:true}));
}
dispatch('keyup','Enter');
break;
default:
dispatch('keydown', ch);
if (isText) {
let s = elm.selectionStart, e = elm.selectionEnd;
elm.value = elm.value.slice(0,s) + ch + elm.value.slice(e);
elm.selectionStart = elm.selectionEnd = s + ch.length;
elm.dispatchEvent(new InputEvent('input', {inputType:'insertText', data:ch, bubbles:true}));
}
dispatch('keyup', ch) ;
}
}
}
class KeyboardPanel extends SurfacePanel {
constructor(cell) {
super(cell);
// defeat this.body's stylings: we want the this.surface to add padding/margin so
// that it has something to grab for detaching/moving
this.body.style.padding = "unset" ;
this.panel.translate = false ; // the keyboard panel is never translated
this.surface = new Keyboard(this);
this.kbFocusListener = null;
}
suppressBrowserKb(elm) {
if(!elm?.matches('input,textarea')) return;
if(elm.dataset.kbSaved != undefined) return;
elm.dataset.kbSaved = elm.getAttribute('inputmode') ?? '';
elm.setAttribute('inputmode', 'none');
}
show() {
document.querySelectorAll('input,textarea').forEach(elm => this.suppressBrowserKb(elm));
this.kbFocusListener = listen(document, 'focus', (e) => this.suppressBrowserKb(e.target), {capture:true});
return super.show();
}
hidden() {
unlisten(this.kbFocusListener);
this.kbFocusListener = null;
document.querySelectorAll('[data-kb-saved]').forEach(elm => {
let saved = elm.dataset.kbSaved;
if(saved) elm.setAttribute('inputmode', saved);
else elm.removeAttribute('inputmode');
delete elm.dataset.kbSaved;
});
}
}
class ScreenPanel extends Panel {
static pzTarget = null;
static css = css('PositionPanel', `
.PositionPanel .Panel__body { width:21em; min-width:0; max-width:calc(100vw - 32px); padding:1em; box-sizing:border-box; text-align:left; }
.PositionPanel label, .PositionPanel h3 { display:block; font-size:1em; font-weight:600; margin:0 0 .6em; }
.PositionPanel select { width:100%; margin:0; }
.PositionPanel p { color:var(--color-text-secondary); font-size:.85em; line-height:1.5; margin:.6em 0 0; }
.PositionPanel section { border-top:1px solid var(--color-border); margin-top:1.2em; padding-top:1.2em; }
.PositionPanel__zoom { display:grid; grid-template-columns:1fr 1fr; gap:.6em; }
.PositionPanel .PositionPanel__zoom button { display:flex; gap:.4em; align-items:center; justify-content:center; }
.PositionPanel__move { display:grid; grid-template-columns:repeat(3,1fr); gap:.5em; }
.PositionPanel__move [data-adjust=up] { grid-column:2; }
.PositionPanel__move [data-adjust=left] { grid-column:1; grid-row:2; }
.PositionPanel__move [data-adjust=right] { grid-column:3; grid-row:2; }
.PositionPanel__move [data-adjust=down] { grid-column:2; grid-row:3; }
.PositionPanel .PositionPanel__move button { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:.5em .2em; gap:.2em; min-height:3.5em; }
.PositionPanel [data-adjust=restore] { width:100%; }
.PositionPanel svg { flex:none; pointer-events:none; }
`);
static update(target) {
const panel = _panels_.screen;
// Operating the controls must not change their target to the controls themselves.
if (target === panel?.elm || target && panel?.elm.contains(target)) return;
ScreenPanel.pzTarget = target || Layout.activeLayout?.elm || _menu_.elm;
panel?.refreshTargets();
}
constructor(cell) {
super(cell);
this.elm.classList.add('PositionPanel');
this.closer.setAttribute('aria-label', 'Close Position and zoom');
this.initial = new Map();
this.repeater = new Schedule();
this.body.innerHTML = `
<label for="position-target">Adjust</label>
<select id="position-target" data-tag="targetSelect" aria-label="Adjust item"></select>
<section aria-label="Size"><h3>Size</h3><div class="PositionPanel__zoom">
<button type="button" data-adjust="smaller"><span aria-hidden="true">−</span> Smaller</button>
<button type="button" data-adjust="larger"><span aria-hidden="true">＋</span> Larger</button>
</div></section>
<section aria-label="Position"><h3>Position</h3><div class="PositionPanel__move">
<button type="button" data-adjust="up"><span aria-hidden="true">↑</span> Up</button>
<button type="button" data-adjust="left"><span aria-hidden="true">←</span> Left</button>
<button type="button" data-adjust="right"><span aria-hidden="true">→</span> Right</button>
<button type="button" data-adjust="down"><span aria-hidden="true">↓</span> Down</button>
</div><p data-tag="moveHint">Hold a button to adjust continuously.</p></section>
<section><button type="button" data-adjust="restore">Restore size and position</button>
<p>Restore the settings from when this panel was opened.</p></section>`;
this.targetSelect = this.body.querySelector('[data-tag=targetSelect]');
this.moveHint = this.body.querySelector('[data-tag=moveHint]');
this.listeners.push(listen(this.targetSelect, 'focus', () => this.refreshTargets()));
this.listeners.push(listen(this.targetSelect, 'change', () => {
this.stopRepeat?.();
ScreenPanel.pzTarget = this.items[Number(this.targetSelect.value)];
this.refreshTargets();
}));
for (const button of this.body.querySelectorAll('[data-adjust]')) {
const action = button.dataset.adjust;
this.listeners.push(listen(button, 'click', e => {
if (e.detail === 0) this.adjust(action);
}));
this.listeners.push(listen(button, 'pointerdown', e => {
if (e.button !== 0 || !e.isPrimary) return;
e.taken = true; e.preventDefault(); e.stopPropagation();
this.stopRepeat?.(); button.focus({preventScroll:true});
if (!this.adjust(action) || action === 'restore') return;
button.setPointerCapture(e.pointerId);
const listeners = [];
const stop = () => {
this.repeater.cancel(); unlisten(listeners);
if (this.stopRepeat === stop) this.stopRepeat = null;
if (button.hasPointerCapture(e.pointerId)) button.releasePointerCapture(e.pointerId);
};
this.stopRepeat = stop;
const end = ev => { if (ev.pointerId === e.pointerId) stop(); };
listeners.push(...listen(window, 'pointerup', end, {capture:true}),
...listen(button, ['pointercancel','lostpointercapture'], end),
...listen(button, 'pointermove', ev => { if (ev.pointerId === e.pointerId && !ev.buttons) stop(); }),
...listen(window, 'blur', stop));
const repeat = () => {
if (!this.adjust(action)) return stop();
this.repeater.run(100, repeat);
};
this.repeater.run(400, repeat);
}));
}
}
targetName(target) {
if (target === _body_) return 'All visible items';
if (target === _menu_.elm) return 'Circular menu';
if (target === Layout.activeLayout?.elm) return 'Score';
const owner = target.panel || target.owner?.panel || target.owner;
return owner?.cell?.label || owner?.cell?.name ||
(target.dataset.tag || 'Panel').replace(/Panel$/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
}
refreshTargets() {
const targets = [...document.querySelectorAll('.pz')].filter(target =>
target !== this.elm && target !== _body_ && target.isConnected &&
getComputedStyle(target).visibility !== 'hidden' && getComputedStyle(target).display !== 'none' &&
!target.hiding && !target.panel?.closing && !target.owner?.closing);
// Put the most useful choices first; the controller never resizes itself.
this.items = [...new Set([Layout.activeLayout?.elm, _menu_.elm, ...targets].filter(target => targets.includes(target))), _body_];
if (!this.items.includes(ScreenPanel.pzTarget)) ScreenPanel.pzTarget = this.items[0];
for (const target of targets) if (!this.initial.has(target)) {
this.initial.set(target, {left:target.style.left, top:target.style.top, fontSize:target.style.fontSize,
adjusted:target.classList.contains('pz-set'),
pz:target === Layout.activeLayout?.elm ? JSON.parse(JSON.stringify(Layout.activeLayout.cell.stash.pz ?? null)) : null});
}
this.targetSelect.replaceChildren(...this.items.map((target, index) => {
const option = document.createElement('option'); option.value = index;
option.textContent = this.targetName(target); return option;
}));
this.targetSelect.value = this.items.indexOf(ScreenPanel.pzTarget);
const all = ScreenPanel.pzTarget === _body_;
for (const button of this.body.querySelectorAll('.PositionPanel__move button')) button.disabled = all;
this.moveHint.textContent = all ? 'Choose a single item to move it.' : 'Hold a button to adjust continuously.';
return ScreenPanel.pzTarget;
}
adjust(action) {
if (this.closing || this.closed) return false;
const selected = this.refreshTargets();
const targets = selected === _body_ ? this.items.filter(target => target !== _body_) : [selected];
if (!targets.length || selected === _body_ && ['up','down','left','right'].includes(action)) return false;
for (const target of targets) {
if (action === 'restore') {
const initial = this.initial.get(target);
if (!initial) continue;
Object.assign(target.style, {left:initial.left, top:initial.top, fontSize:initial.fontSize});
if (target === Layout.activeLayout?.elm) Layout.activeLayout.cell.stash.pz = initial.pz ? {...initial.pz} : null;
target.classList.toggle('pz-set', initial.adjusted);
} else if (action === 'larger' || action === 'smaller') {
const size = target.style.fontSize.endsWith('em') ? parseFloat(target.style.fontSize)
: parseFloat(getComputedStyle(target).fontSize) / _pxPerEm_;
target.style.fontSize = Math.max(.1, size * (action === 'larger' ? 1.1 : 1/1.1)) + 'em';
target.classList.add('pz-set');
} else {
const dx = action === 'left' ? -5 : action === 'right' ? 5 : 0;
const dy = action === 'up' ? -5 : action === 'down' ? 5 : 0;
target.style.left = target.offsetLeft + dx + 'px';
target.style.top = target.offsetTop + dy + 'px';
target.classList.add('pz-set');
}
target.owner?.constrain?.();
}
return true;
}
show() {
const alreadyOpen = this.elm.isConnected && this.elm.style.visibility === 'visible' && !this.elm.hiding;
if (!alreadyOpen) {
this.initial.clear();
ScreenPanel.pzTarget = Layout.activeLayout?.elm || _menu_.elm;
}
super.show(); this.setTitle('Position and zoom'); this.refreshTargets();
return this;
}
hide() { this.stopRepeat?.(); super.hide(); }
destructor() { this.stopRepeat?.(); this.repeater.cancel(); super.destructor(); }
}
class SymbolsPanel extends Panel {
static css = css(
"SymbolsPanel",
`
.SymbolsPanel__frame {
background-color: #fff;
background-image:
linear-gradient(45deg, #e8e8e8 25%, transparent 25%),
linear-gradient(-45deg, #e8e8e8 25%, transparent 25%),
linear-gradient(45deg, transparent 75%, #e8e8e8 75%),
linear-gradient(-45deg, transparent 75%, #e8e8e8 75%);
background-size: 0.5em 0.5em;
background-position: 0 0, 0 0.25em, 0.25em -0.25em, -0.25em 0;
width: fit-content;
padding: 0.25em;
box-sizing: border-box;
margin-bottom: 0.2em;
height: 16em;
overflow-y: auto;
scrollbar-width: none;
border-radius: var(--borderRadius);
touch-action: none;
}
.SymbolsPanel__frame::-webkit-scrollbar {
display: none;
}
.SymbolsPanel__grid {
font-family: Bravura;
font-size: 2em;
display: grid;
color: black;
grid-template-columns: repeat(6, 1.55em);
gap: 2px;
}
.SymbolsPanel__symbol {
width: 1.55em;
height: 2em;
line-height: 0;
padding-top: 1em;
box-sizing: border-box;
text-align: center;
border-radius: calc(var(--borderRadius) / 4);
border: 0.02em solid #d0d0d0;
overflow: hidden;
}
.SymbolsPanel__symbol-active {
background-color: #e0e8fff0;
}
`);
content = helm(`
<div data-tag="body" class="Panel__body">
<div class="SymbolsPanel__frame" data-tag="gridFrame">
<div class="SymbolsPanel__grid" data-tag="grid"></div>
</div>
<div style="padding-top: var(--spacing-sm)">Group<div>
<div data-tag="select"></div>
<div data-tag="picker"></div>
<div data-tag="staffSpace"></div>
<div style="margin: var(--spacing-md); height: 2.5em; display: flex; align-items: center; justify-content: center;"><a href="https://www.w3.org/2021/03/smufl14/" rel="noopener noreferrer">SMuFL</a></div>
</div>
`);
constructor(cell) {
super(cell);
this.body.replaceWith(this.content);
Object.assign(this, dataIndex("tag", this.content));
let stash = cell.stash;
// Create a Select (similar to an html <select>)
// Only Rostrum's own groups are translatable: the rest are SMuFL spec section titles,
// which are English-only and stay that way so they can be looked up in the spec.
let select = new Select(Object.keys(smuflTable), stash.group, this, (group) => group == "Recent" || group == "Basic") ;
this.select.replaceWith(select.elm) ;
this.select = select ;
listen(select.toggle, "SELECTED", (e) => {
let key = stash.group = e.detail;
let glyphs = (key == "Recent")
? Object.entries(stash.recent).sort((a, b) => b[1] - a[1]).map(([glyph]) => glyph)
: smuflTable[key];
clearChildren(this.grid) ;
for (let codePoint of glyphs) {
this.grid.append(helm(
`<div class="SymbolsPanel__symbol ${codePoint == stash?.codePoint ? "SymbolsPanel__symbol-active" : ""}">${codePoint}</div>`
));
}
}) ;
let l1 = listen(this.gridFrame, "pointerdown", (e) => {
e.taken = true;
this.gridFrame.setPointerCapture(e.pointerId);
let startY = e.clientY;
let startScrollTop = this.gridFrame.scrollTop;
let moved = false;
let mv = listen(this.gridFrame, "pointermove", (emv) => {
let dy = emv.clientY - startY;
if (!moved && Math.abs(dy) > 4) moved = true;
if (moved) this.gridFrame.scrollTop = startScrollTop - dy;
});
let l2 = listen(this.gridFrame, "pointerup", (eup) => {
unlisten(mv);
if (!moved) {
let target = document.elementFromPoint(eup.clientX, eup.clientY)
?.closest(".SymbolsPanel__symbol");
if (target) {
if (target.classList.contains("SymbolsPanel__symbol-active")) {
target.classList.remove("SymbolsPanel__symbol-active");
target.style.transform = '';
target.style.color = '';
target.style.opacity = '';
stash.codePoint = null;
} else {
Array.from(this.grid.children).forEach(c => { c.classList.remove("SymbolsPanel__symbol-active"); c.style.transform = ''; c.style.color = ''; c.style.opacity = ''; });
target.classList.add("SymbolsPanel__symbol-active");
stash.codePoint = target.textContent;
stash.recent = mergeRecent(stash.recent || {}, { [stash.codePoint]: _recentSelectPts_ });
_menu_.activateCell(cell);
this.update();
}
}
}
}, {once: true});
});
this.listeners.push(l1);
let picker = new ColorPicker(
"Color",
stash.rgb,
stash.alpha,
(rgb, alpha) => {
stash.rgb = rgb;
stash.alpha = alpha;
this.update();
}
);
this.picker.replaceWith(picker.elm);
this.colorPicker = picker;
let staffSpace = new SliderGroup(
stash,  { size: { min: 1, max: 40, step: .5, value: 8, msg: "Staff Space: {value}px" }},
(e, tag, value) => {
stash[tag] = value;
this.update();
});
this.staffSpace.replaceWith(staffSpace.elm);
this.staffSpace = staffSpace;
this.update();
}
sync() {
// The stash has been changed from outside: bring the controls up to date.
let { rgb, alpha } = this.cell.stash;
this.colorPicker.set(rgb, alpha);
this.staffSpace.refresh();
this.settings = undefined; // these aren't changes made in the panel
this.update();
}
update() {
let {alpha = 1, rgb = '#000000', size = 8 } = this.cell.stash;
// (which symbol is chosen is not one of these: it's what gets inserted
// next, and choosing one doesn't alter a symbol already on the page)
let changed = this.changed(["alpha", "rgb", "size"]);
let activeCell = this.grid.querySelector('.SymbolsPanel__symbol-active');
if (activeCell) {
activeCell.style.transform = `scale(${size / 8})`;
activeCell.style.color = rgb;
activeCell.style.opacity = parseFloat(alpha);
}
let active = _score_?.getActiveObject(); // (the panel can outlive its score)
// A change to color, opacity or size immediately applies to the currently
// selected symbol (and never to one that has been flattened).
if (!changed || active?.rostrumType != "symbols" || active.flatten) return;
let color = fabric.Color.fromHex(rgb);
color.setAlpha(parseFloat(alpha));
// Bravura Text has five staff spaces per em, matching symbol insertion.
active.set({ fill: color.toRgba(), fontSize: size * 5 });
active.rostrumStash = { alpha, rgb, size };
active.setCoords();
active.canvas.fire("object:modified", { target: active }); // so undo records it
active.canvas.requestRenderAll();
_score_.setDirty(true);
}
show() {
super.show();
this.select.toggle.focus();
}
}
class PianoPanel extends Panel {
constructor(cell) {
super(cell);
this.panel.style.maxWidth = "none";
this.panel.style.maxHeight = "none";
this.piano = new Piano(this, cell);
this.body.replaceWith(this.piano.elm);
this.panel.style.width = "95vw";
}
close() {
this.piano.closed = true;
this.piano.yin?.release();
super.close();
}
destructor() {
super.destructor();
this.piano.destructor();
}
show() {
super.show();
this.piano.show();
// Never reveal the options view while it is parked offscreen. A fling-hide
// animates for 500ms and then parks the element at top:-9999px; the saved
// visibility can be a stale "visible" captured mid-hide. Restoring it onto
// the still-parked element strands it offscreen (the monkey's offscreen
// invariant catches this). -9999px is exclusively the park sentinel, so an
// element sitting there must stay hidden until something repositions it.
let o = this.piano.options;
o.style.visibility = o.style.top == "-9999px" ? "hidden" : this.optionsVisibility ;
return this;
}
hidden() {
this.optionsVisibility = this.piano.options.style.visibility ;
this.piano.options.style.visibility = "hidden" ;
}
constrain() {
super.constrain();
if (this.piano && this.piano.keyboard) {
let W = this.panel.clientWidth;
let K = this.piano.keyboard.offsetWidth;
if (this.piano.keyboardLeft !== undefined && this.piano.keyboardLeft !== null) {
if (K > W) {
this.piano.keyboardLeft = clamp(this.piano.keyboardLeft, W - K, 0);
} else {
this.piano.keyboardLeft = (W - K) / 2;
}
this.piano.keyboard.style.left = this.piano.keyboardLeft + "px";
}
}
}
}
class PrintPanel extends Panel {
content = helm(`
<div data-tag="body" class="Panel__body">
<div data-tag="buttons"></div>
<b>Note:</b><br>Print larger scores<br>in small sections
<div data-tag="first"></div>
<div data-tag="last"></div>
</div>`);
constructor(cell) {
super(cell);
this.body.replaceWith(this.content);
Object.assign(this, dataIndex("tag", this.content));
// PrintPanel settings are not permanent, and are reset everytime the
// PrintPanel is constructed, which should be the first time
// its opened on a new score.  BUG, todo: should also reset when
// pg's are added or removed
let scoreLength = _score_.pgs.length;
let props = { first: 1, last: scoreLength };
cell = _menu_.rings.page.cells.numbers; // for pnToString
let buttons = new ButtonGroup(
props,
{
Ink: { svg: "Ink" },
"No Ink": { svg: "No Ink" },
},
async (e, prop, tag) => {
let printWin = null;
let dataUrl = null;
let closeWatcher = null;
let releaseUrl = () => {
if(dataUrl) URL.revokeObjectURL(dataUrl);
dataUrl = null;
clearInterval(closeWatcher);
closeWatcher = null;
};
// The PDF tab outlives this panel. Keep its URL until that tab closes.
let watchPrintWindow = () => {
closeWatcher = setInterval(() => {
if(printWin.closed) releaseUrl();
}, 1000);
};
try {
_shade_.show("Preparing to print");
let pns = [];
for (let i = props.first; i <= props.last; i++)
pns.push(i);
let data = await _score_.toPdf(tag == "Ink" ? "pdf" : "none", false, pns);
if (!data || data.byteLength == 0) throw new Error("PDF data empty");
dataUrl = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
// Try to open the print window automatically. This usually works on
// desktop if the PDF generation was fast enough.
try {
printWin = window.open(dataUrl, "_blank");
} catch (e) {
console.warn("window.open blocked/failed:", e);
}
if (!printWin || printWin.closed || typeof printWin.closed == 'undefined') {
// Popup blocked (especially possible on iOS Safari after await).
// Show a dialog to provide a fresh user gesture.
_shade_.hide();
printWin = null;
let readyDialog = dialog("Your PDF is ready to print.", {
"Open PDF": { svg: "Ink" }, Cancel: { svg: "Cancel" },
}, (e, prop, tag, args) => {
if(tag == "Cancel") {
releaseUrl();
args.close();
return;
}
try { printWin = window.open(dataUrl, "_blank"); }
catch(error) { console.warn("window.open blocked/failed:", error); }
if(!printWin || printWin.closed || typeof printWin.closed == "undefined") {
printWin = null;
toast("Please allow popups to open the PDF.");
return;
}
watchPrintWindow();
args.close();
});
listen(readyDialog, "close", () => {
if(!printWin) releaseUrl();
readyDialog.remove();
}, { once: true });
} else {
// Success! PDF opened in new tab, attempt to trigger print.
// Note: iOS Safari ignores window.print(); users must print via the share button.
watchPrintWindow();
delayMs(1000, () => { if (!printWin.closed) printWin.print(); });
}
}
catch (error) {
releaseUrl();
printWin?.close();
if (window.cancelPdf) toast("Print cancelled");
else {
console.error("Print failed:", error);
dialog(`<em>Print Failed</em><br><br><strong>${escapeHtml(error.message)}</strong>`);
}
}
finally {
_shade_.onCancel = null;
_shade_.hide();
this.close();
}
}
);
buttons.elm.style = "margin:.5em;width:12em";
this.buttons.replaceWith(buttons.elm);
let msgCallback = (tag, value) => {
// don't allow first to be > last, or last to be < first
if(tag == "first") {
if(value > props.last) value = props.last;
props.first = value;
return "First page: " + pnToHtml(value);
} else if(tag == "last") {
if(value < props.first) value = props.first;
props.last = value;
return "Last page: " +  pnToHtml(value);
}
}
// Can't combine these two sliders because of the way msgCallback works, sigh.
this.firstSlider = new SliderGroup(props, {
first: {min:1, max:props.last, step:1, value:1, msg: msgCallback},
});
this.first.replaceWith(this.firstSlider.elm);
this.lastSlider = new SliderGroup(props, {
last: {min:1, max:props.last, step:1, value:props.last,  msg: msgCallback},
});
this.last.replaceWith(this.lastSlider.elm);
this.listeners.push(listen(_body_, "NUMBERS", (e) => {
this.firstSlider.defs.first.max = this.lastSlider.defs.last.max = _score_.pgs.length;
props.last  = Math.min(_score_.pgs.length, props.last);
props.first  = Math.min(_score_.pgs.length, props.first);
this.firstSlider.refresh();
this.lastSlider.refresh();
}));
}
}
class StopwatchPanel extends Panel {
static css = css(
"StopwatchPanel",
`.Stopwatch__splits {
width: 100%;
overflow: hidden;
font-family: 'Courier New', Courier, monospace;
font-size: 0.9em;
border-radius: var(--borderRadius);
padding: 0.5em;
box-sizing: border-box;
border: 0.1em solid #aaa;
background: #fff;
}
`
);
content = helm(
`<div data-tag="body" style="display:flex;flex-flow:column;align-items:center;margin:1em;text-align:center;">
<div data-tag="options"></div>
Splits:
<textarea data-tag="splits" class="Stopwatch__splits"></textarea>
</div>`
);
constructor(cell) {
super(cell);
this.body.replaceWith(this.content);
Object.assign(this, dataIndex("tag", this.content));
this.cell.stash.state == "Start";
let stopWatch = (this.stopWatch = new Stopwatch(this));
this.optionsGroup = new ButtonGroup(
this.cell.stash,
{
Reset: { svg: "Reset" },
Start: { svg: "Start", toggle: "state" },
Stop: { svg: "Stop", toggle: "state" },
Split: { svg: "Split" },
},
(e, prop, tag) => {
if (tag == "Start") stopWatch.start();
else if (tag == "Stop") stopWatch.stop();
else if (tag == "Split") stopWatch.split();
else if (tag == "Reset") stopWatch.reset();
}
);
this.options.replaceWith(this.optionsGroup.elm);
this.optionsGroup.refresh();
return this;
}
destructor() {
super.destructor();
this.stopWatch.destructor();
}
show() {
super.show();
this.stopWatch.show();
return this;
}
}
class MagnifyPanel extends Panel {
content = helm(`
<div data-tag="body" class="Panel__body" style="min-width: 18em;">
<div class="PencilPanel__preview" style="height:18em; margin:0; padding:0;">
<canvas data-tag="magCanvas" width="300" height="300"
style="width:100%; height:100%; display:block;"></canvas>
</div>
<p style="font-size:.85em; color:var(--color-text-secondary); margin:.6em 0;">Click or touch the score to magnify. Drag to move.</p>
<div data-tag="slidersContainer" style="margin-top:0.5em;"></div>
</div>`);
constructor(cell) {
super(cell);
this.body.replaceWith(this.content);
Object.assign(this, dataIndex("tag", this.content));
this.sliderGroup = new SliderGroup(
cell.stash,
{ zoom: { throttle: 100, min: 0.25, max: 5, step: 0.05, value: 1, msg: "Zoom: {value}x" },
},
(e, tag, value) => {
_menu_.magnifier.zoom = Number(value);
this.updateMagnifier();
}
);
this.slidersContainer.append(this.sliderGroup.elm);
// Store reference for magnifier updates
_menu_.magnifier.panel = this;
_menu_.magnifier.zoom = Number(cell.stash.zoom) || 2;
}
show() {
super.show();
_menu_.activateCell(this.cell);
this.cell.stash.zoom = _menu_.magnifier.zoom;
this.sliderGroup.refresh();
return this;
}
async updateMagnifier(fracX, fracY, pg) {
const request = this.magRequest = (this.magRequest || 0) + 1;
// @fracX, @fracY are fractional coordinates (0 to 1) relative to displayed page
// Store coordinates if provided
if (fracX !== undefined) {
this.lastFracX = fracX;
this.lastFracY = fracY;
// Manage magnifier hold to prevent deflation
if (pg !== this.lastPg) {
if (this.lastPg) this.lastPg.magnifierHold = false;
if (pg) pg.magnifierHold = true;
}
this.lastPg = pg;
}
// Use stored coordinates
fracX = this.lastFracX;
fracY = this.lastFracY;
pg = this.lastPg;
if (!pg?.canvas) return;
const background = pg.mozCanvas || (pg.musicSvg ? await pg.score.music.pageImage(pg.mozPn) : null);
if (request !== this.magRequest || !pg.canvas || pg.score.disposed) return;
let canvas = pg.canvas;
let zoom = window._menu_.magnifier.zoom;
let destW = 300, destH = 300;
let destCSSW = this.magCanvas.clientWidth || 450;
let destCSSH = this.magCanvas.clientHeight || 450;
let ctx = this.magCanvas.getContext("2d", { willReadFrequently: true });
ctx.clearRect(0, 0, destW, destH);
// Draw from mozCanvas (PDF rendering) first as background
if (background) {
let srcW = background.width;
let srcH = background.height;
let srcX = fracX * srcW;
let srcY = fracY * srcH;
let sourceW = (destCSSW / zoom) * (srcW / pg.width);
let sourceH = (destCSSH / zoom) * (srcH / pg.height);
ctx.drawImage(
background,
srcX - sourceW/2, srcY - sourceH/2,
sourceW, sourceH,
0, 0, destW, destH
);
}
// Draw from Fabric lower canvas (rendered objects/annotations)
let fabW = canvas.lowerCanvasEl.width;
let fabH = canvas.lowerCanvasEl.height;
let fabX = fracX * fabW;
let fabY = fracY * fabH;
let fabSourceW = (destCSSW / zoom) * (fabW / pg.width);
let fabSourceH = (destCSSH / zoom) * (fabH / pg.height);
ctx.drawImage(
canvas.lowerCanvasEl,
fabX - fabSourceW/2, fabY - fabSourceH/2,
fabSourceW, fabSourceH,
0, 0, destW, destH
);
// Draw from upper canvas (selections, active drawing)
ctx.drawImage(
canvas.upperCanvasEl,
fabX - fabSourceW/2, fabY - fabSourceH/2,
fabSourceW, fabSourceH,
0, 0, destW, destH
);
// Draw touch point indicator (crosshair at center of panel)
ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(destW / 2 - 10, destH / 2);
ctx.lineTo(destW / 2 + 10, destH / 2);
ctx.moveTo(destW / 2, destH / 2 - 10);
ctx.lineTo(destW / 2, destH / 2 + 10);
ctx.stroke();
}
hide() {
this.magRequest = (this.magRequest || 0) + 1;
_menu_.magnifier.cancelTracking?.();
if (this.cell.ring.activeCell === this.cell) _menu_.activateCell(null, this.cell.ring);
if (this.lastPg) this.lastPg.magnifierHold = false;
this.lastPg = null;
super.hide();
}
destructor() {
super.destructor();
if (this.lastPg) this.lastPg.magnifierHold = false;
if (_menu_.magnifier.panel === this) _menu_.magnifier.panel = null;
}
}
class CurtainSurface extends Surface {
content = helm(`
<div data-tag="surfaceContent" class="Surface__outline">
<div data-tag="sliderProxy"></div>
<div data-tag="buttonProxy"></div>
</div>`) ;
constructor(panel) {
super(panel, ScreenPanel);
Object.assign(this, dataIndex("tag", this.content)) ;
let stash = panel.cell.stash;
this.colorGroup = new ButtonGroup(stash, {
Black: { svg: "Curtain Black", radio: "color" },
Red:   { svg: "Curtain Red",   radio: "color" },
},
(e, prop, val) => {
if(!_curtain_.on) _curtain_.toggle();
_curtain_.update();
}
);
listen(this.colorGroup.elm, 'pointerdown', e => e.stopPropagation());
this.buttonProxy.replaceWith(this.colorGroup.elm) ;
this.slider = new SliderGroup(stash,
{ alpha: { min: 0, max: 100, step: 1, throttle: 50, value: 60, msg: (tag, value) =>
`Curtain: ${Math.trunc(value)}%`
}},
(e, tag, value) => {
if(!_curtain_.on) _curtain_.toggle();
_curtain_.update();
}
);
this.sliderProxy.replaceWith(this.slider.elm) ;
panel.body.style.minWidth = panel.body.style.padding = "unset"; // defeat default body styles
this.surface.style.width = this.content.style.width = "10em";
this.surface.style.height = this.content.style.height = "10em";
this.surface.append(this.content) ;
panel.elm.style.zIndex = this.surface.style.zIndex = getComputedStyle(_curtain_.curtain).zIndex ;
delay(2, () => this.slider.refresh());
}
}
class CurtainPanel extends Panel {
constructor(cell) {
super(cell);
this.surface = new CurtainSurface(this) ;
}
destructor() {
super.destructor();
this.surface.destructor();
}
show() {
super.show();
this.surface.show();
return this;
}
hide() {
super.hide();
this.surface.hide();
}
}
class MusicPanel extends Panel {
static css = css('MusicPanels', `
.MusicPanel { min-width:0; box-sizing:border-box; max-width:calc(100vw - 3em); padding:.5em; }
.TransposePanel { width:22em; }
.PlaybackPanel { width:28em; }
.MusicPanel button, .MusicPanel select { font:inherit; }
.MusicPanel button { padding:.25em .5em; white-space:nowrap; }
.MusicPanel p { margin:.75em 0; }
.MusicPanel [role=status]:empty { display:none; }
.TransposePanel__steps { display:grid; grid-template-columns:1fr auto 1fr; gap:.5em; align-items:center; }
.TransposePanel output { white-space:nowrap; min-width:6em; }
.TransposePanel__spelling, .PlaybackPanel__master { display:flex; gap:.75em; align-items:center; }
.TransposePanel select { flex:1; min-width:0; }
.PlaybackPanel__transport { display:flex; align-items:center; justify-content:center; gap:.5em; }
.PlaybackPanel__master input { flex:1; min-width:0; }
.PlaybackPanel__part { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,.6fr) auto auto;
gap:.5em .75em; padding:.75em 0; border-top:1px solid #8886; align-items:center; text-align:left; }
.PlaybackPanel__part-name { grid-column:1 / -1; overflow-wrap:anywhere; }
.PlaybackPanel__part label { display:flex; align-items:center; gap:.25em; white-space:nowrap; }
.PlaybackPanel__part label:has(input[type=range]) { display:grid; gap:.25em; }
.PlaybackPanel__part input[type=range] { width:100%; min-width:0; margin:0; }
`);
show() {
super.show(() => { if (this.elm.isConnected) this.constrain(); });
return this;
}
constrain() {
super.constrain();
const box = this.panel.getBoundingClientRect();
const dx = box.left < 8 ? 8 - box.left : box.right > innerWidth - 8 ? innerWidth - 8 - box.right : 0;
const dy = box.top < 8 ? 8 - box.top : box.bottom > innerHeight - 8 ? innerHeight - 8 - box.bottom : 0;
this.elm.style.left = this.elm.offsetLeft + dx + 'px';
this.elm.style.top = this.elm.offsetTop + dy + 'px';
}
}
class TransposePanel extends MusicPanel {
constructor(cell) {
super(cell);
this.body.classList.add('MusicPanel', 'TransposePanel');
this.body.innerHTML = `<div class="TransposePanel__steps"><button data-step="-1">- semitone</button> <output></output> <button data-step="1">+ semitone</button></div>
<p><button data-reset>Original key</button></p><label class="TransposePanel__spelling">Spelling <select><option value="readable">Readable</option><option value="preserve">Preserve</option></select></label>
<p><label><input type="checkbox" data-preserve-system-breaks checked> Keep layout</label></p><p role="status"></p>`;
this.body.addEventListener('click', e => {
if (!e.target.matches('button')) return;
const music = _score_?.music;
if (!music) return;
this.change(e.target.hasAttribute('data-reset') ? 0 : music.transpose + Number(e.target.dataset.step));
});
this.body.querySelector('select').addEventListener('change', () => this.change(_score_?.music?.transpose));
this.body.querySelector('[data-preserve-system-breaks]').addEventListener('change', () => this.change(_score_?.music?.transpose));
}
async change(value) {
const status = this.body.querySelector('[role=status]');
status.textContent = 'Transposing...';
const spelling = this.body.querySelector('select').value;
const preserveSystemBreaks = this.body.querySelector('[data-preserve-system-breaks]').checked;
const pending = _score_.transposeMusic(value, spelling, preserveSystemBreaks);
this.sync();
try { await pending; status.textContent = ''; }
catch (error) { status.textContent = error.message; }
this.sync();
}
sync() {
const music = _score_?.music;
if (!music) return;
this.body.querySelector('output').textContent = music.transpose ? `${music.transpose > 0 ? '+' : ''}${music.transpose}` : 'Original key';
if (!_score_.musicBusy) this.body.querySelector('select').value = music.native.viewTransposeSpelling;
this.body.querySelector('select').disabled = _score_.musicBusy;
if (!_score_.musicBusy) this.body.querySelector('[data-preserve-system-breaks]').checked = music.native.viewPreserveSystemBreaks;
this.body.querySelector('[data-preserve-system-breaks]').disabled = _score_.musicBusy;
this.body.querySelector('[data-reset]').disabled = _score_.musicBusy;
for (const button of this.body.querySelectorAll('[data-step]'))
button.disabled = _score_.musicBusy || Math.abs(music.transpose + Number(button.dataset.step)) > 12;
}
show() { super.show(); this.sync(); return this; }
}
class PlaybackPanel extends MusicPanel {
static barCss = css('PlaybackBar', `
.PlaybackBar { position:fixed;top:4px;left:50%;transform:translateX(-50%);z-index:500;
width:min(calc(100% - 16px),max(66.666vw,760px));box-sizing:border-box;
padding:8px 46px 8px 8px;background:var(--panel-bg,#fff);color:var(--color-text,#222);
border:1px solid #aaa;border-radius:8px;box-shadow:0 2px 8px #0002;font:13px system-ui,sans-serif;
display:flex;flex-wrap:wrap;align-items:center;gap:8px; }
.PlaybackBar button { font:inherit;min-height:32px;white-space:nowrap;padding:3px 7px; }
.PlaybackBar label { display:flex;align-items:center;gap:4px;white-space:nowrap; }
.PlaybackBar [data-master] { width:82px;min-width:0; }
.PlaybackBar__seek { display:flex;align-items:center;gap:6px;flex:1 1 250px;min-width:210px; }
.PlaybackBar [data-seek] { width:100%;min-width:50px;flex:1; }
.PlaybackBar output { white-space:nowrap;font-variant-numeric:tabular-nums; }
.PlaybackBar [data-close] { position:absolute;right:6px;top:7px;width:32px; }
.PlaybackBar [role=status]:empty { display:none; }
.PlaybackMixer { position:fixed;top:100px;left:auto;right:12px;margin:0;z-index:510;
width:min(420px,calc(100vw - 28px));max-height:65dvh;overflow:auto;border:1px solid #aaa;
border-radius:8px;background:var(--panel-bg,#fff);color:var(--color-text,#222);font:14px system-ui,sans-serif; }
.PlaybackMixer__header { display:flex;justify-content:space-between;align-items:center; }
@media(max-width:500px) {
.PlaybackBar { font-size:12px;gap:6px; }
.PlaybackBar [data-master] { width:60px; }
.PlaybackBar__master span { font-size:11px; }
.PlaybackBar__seek { flex-basis:210px; }
}
`);
constructor(cell) {
super(cell);
this.music = _score_.music;
this.elm = helm(`<section class="PlaybackBar" data-tag="PlaybackPanel" aria-label="Playback controls">
<button data-play>Play</button>
<label><input data-follow type="checkbox" checked> Auto-scroll</label>
<label class="PlaybackBar__master"><span>Volume</span><input data-master type="range" min="0" max="100" value="80" aria-label="Volume"></label>
<button data-mixer-button aria-expanded="false">Mixer</button>
<div class="PlaybackBar__seek"><button data-rewind aria-label="Go to beginning">|&lt;</button>
<input data-seek type="range" min="0" max="0" step="0.001" value="0" aria-label="Playback position"><output>0:00 / 0:00</output></div>
<button data-close aria-label="Exit playback mode">×</button><span role="status"></span></section>`);
this.body = this.panel = this.elm;
this.mixerDialog = helm(`<dialog class="MusicPanel PlaybackMixer" data-tag="PlaybackMixer" aria-label="Mixer"><div class="PlaybackMixer__header">Mixer <button data-mixer-close aria-label="Close mixer">×</button></div><div data-mixer></div></dialog>`);
this.elm.addEventListener('pointerdown', e => { e.taken = true; e.stopPropagation(); });
this.mixerDialog.addEventListener('pointerdown', e => { e.taken = true; e.stopPropagation(); });
const player = this.music.player;
this.body.querySelector('[data-play]').onclick = () => {
(player.state === 'playing' ? player.pause() : player.play()).catch(error => player.fail(error));
};
this.body.querySelector('[data-follow]').onchange = e => {
this.music.autoScroll = e.target.checked; this.music.view.resetFollow();
};
this.body.querySelector('[data-master]').oninput = e => {
player.setVolume(Number(e.target.value) / 100); this.music.owner.setDirty();
};
this.unbindSeek = this.music.view.bindSeek(this.body.querySelector('[data-seek]'), this.body.querySelector('[data-rewind]'));
this.body.querySelector('[data-close]').onclick = () => this.close();
this.body.querySelector('[data-mixer-button]').onclick = () => {
if (this.mixerDialog.open) this.mixerDialog.close();
else { this.mixerDialog.style.top = this.elm.getBoundingClientRect().bottom + 8 + 'px'; this.mixerDialog.show(); }
this.sync();
};
this.mixerDialog.querySelector('[data-mixer-close]').onclick = () => { this.mixerDialog.close(); this.sync(); };
this.listeners.push(listen(document, 'musicPlayback', () => this.sync()));
this.listeners.push(listen(document, 'pointerdown', e => this.noteDown(e), { capture:true }));
this.listeners.push(listen(document, ['pointerup','pointercancel'], e => this.noteUp(e), { capture:true }));
this.listeners.push(listen(document, 'pointermove', e => {
if (this.tap && e.pointerId === this.tap.pointerId && Math.hypot(e.clientX-this.tap.x,e.clientY-this.tap.y)>8) this.tap.moved = true;
}, { capture:true }));
}
noteDown(e) {
if (!e.isPrimary) { this.tap = null; return; }
if (e.button !== 0 || !this.music.playbackMode || !this.music.player.canSeek || _score_?.music !== this.music) return;
const pg = e.target.pg || e.target.closest('.canvas-container')?.pg;
if (!pg || pg.score.music !== this.music) return;
const id = this.music.view.noteAt(e.clientX,e.clientY,pg.musicSvg);
if (!id) return;
this.tap = { id, pointerId:e.pointerId, x:e.clientX, y:e.clientY };
e.taken = true; e.preventDefault(); e.stopImmediatePropagation();
}
noteUp(e) {
if (!this.tap || this.tap.pointerId !== e.pointerId) return;
const tap = this.tap; this.tap = null;
e.taken = true; e.preventDefault(); e.stopImmediatePropagation();
if (e.type === 'pointerup' && !tap.moved && Math.hypot(e.clientX-tap.x,e.clientY-tap.y)<8) this.music.player.seekNote(tap.id);
}
sync() {
if (this.closed) return;
const player = this.music.player;
if (this.music.playbackMode && player.state === 'stopped') { this.close(); return; }
const clock = t => `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
this.body.querySelector('[data-play]').textContent = player.state === 'playing' ? 'Pause' : player.state === 'loading' ? 'Loading…' : 'Play';
this.body.querySelector('[data-play]').disabled = this.music.owner.musicBusy || player.state === 'loading' || !player.timeline || !!player.scrub;
this.body.querySelector('[data-follow]').checked = this.music.autoScroll;
this.body.querySelector('[data-master]').value = player.volume*100;
const seek = this.body.querySelector('[data-seek]'); seek.max = player.timeline?.duration || 0; seek.value = player.position;
seek.disabled = this.body.querySelector('[data-rewind]').disabled = !player.canSeek;
this.body.querySelector('output').textContent = `${clock(player.position)} / ${clock(player.timeline?.duration || 0)}`;
this.body.querySelector('[role=status]').textContent = player.error || '';
this.body.querySelector('[data-mixer-button]').setAttribute('aria-expanded',String(this.mixerDialog.open));
}
show() {
if (!this.music.player.timeline || this.music.owner.musicBusy) { this.close(); return this; }
_menu_.activateCell(null,_menu_.rings.ink); _menu_.activateCell(null,_menu_.rings.page);
this.music.player.stop();
_body_.append(this.elm,this.mixerDialog);
this.music.playbackPanel = this; this.music.playbackMode = true;
this.music.player.cue(this.music.owner.musicStartPosition(this.elm.getBoundingClientRect().bottom));
const rows = this.mixerDialog.querySelector('[data-mixer]');
this.music.player.timeline.parts.forEach((part,i) => {
const row = document.createElement('div'), name = document.createElement('span');
row.className = 'PlaybackPanel__part'; name.className = 'PlaybackPanel__part-name'; name.textContent = part.name; row.append(name);
for (const [key,label] of [['volume','Volume'],['pan','Pan'],['mute','Mute'],['solo','Solo']]) {
const title=document.createElement('label'), input=document.createElement('input'), toggle=key==='mute'||key==='solo';
input.type=toggle?'checkbox':'range'; input.min=0; input.max=127; input.setAttribute('aria-label',`${part.name} ${label}`);
if(toggle) input.checked=this.music.player.mixer[i][key]; else input.value=this.music.player.mixer[i][key];
input.oninput=()=>{this.music.player.setMixer(i,{[key]:toggle?input.checked:Number(input.value)});this.music.owner.setDirty();};
title.append(label,input); row.append(title);
}
rows.append(row);
});
this.sync(); return this;
}
constrain() {}
setPosition() {}
hide() { this.close(); }
close() {
if (this.closed) return;
this.closed = true; this.music.pendingFollow = null; this.music.playbackMode = false; this.music.playbackPanel = null;
this.music.player.stop(); this.unbindSeek?.(); this.mixerDialog.close(); this.mixerDialog.remove(); this.elm.remove();
this.destructor(); if (panels[this.cell.key] === this) delete panels[this.cell.key];
}
}
// Nested actions reuse the canonical tool element: enabled/active/locked states
// stay in sync with the circular menu and existing score operations.
function menuActionList(panel, paths) {
const list = helm('<div class="MenuActions"></div>');
for (const path of paths) {
const cell = _menu_.getCell(path);
list.append(cell.elm);
}
return list;
}
class MenuGroupPanel extends Panel {
static css = css('MenuActions', `
.MenuActions { display:flex; flex-wrap:wrap; gap:.5em; padding:.5em; }
.Menu__action { display:flex; align-items:center; justify-content:center;
gap:.4em; min-height:2.75em; padding:.5em .75em; font:inherit;
color:var(--color-text); background:var(--menu-cell-bg);
border:1px solid var(--menu-panel-indicator); border-radius:var(--borderRadius); }
.Menu__action svg { flex-shrink:0; width:1.5em; height:1.5em; }
.Menu__action.Menu__cell-active { background:var(--menu-cell-active-bg); }
.Menu__action:disabled, .Menu__action.Menu__cell-disabled { opacity:.45; }
.MenuGroup__body { width:25em; max-width:85vw; max-height:65dvh; overflow:auto; padding:.5em; }
.MenuGroup__section { border-top:1px solid var(--menu-panel-indicator); margin-top:.6em; padding-top:.6em; }
.MenuGroup__section h3 { margin:.25em 0; font-size:1em; }
`);
constructor(cell) {
super(cell);
this.body.classList.add('MenuGroup__body');
}
section(title) {
const section = helm('<section class="MenuGroup__section"></section>');
const heading = document.createElement('h3'); heading.textContent = title;
section.append(heading); this.body.append(section); return section;
}
action(container, label, callback) {
const button = document.createElement('button'); button.type = 'button';
button.className = 'Menu__action'; button.textContent = label;
this.listeners.push(listen(button, 'click', callback)); container.append(button); return button;
}
}
class LibraryPanel extends Panel {
constructor(cell) {
super(cell);
// This workspace deliberately has no .pz root or legacy panel header: its
// typography, layout and focus behavior are independent of the circular menu.
this.elm = helm(`<div class="LibraryWindow" data-tag="LibraryPanel" hidden>
<section class="Panel__elm LibraryWindow__panel" data-tag="panel" role="dialog" aria-label="Library" tabindex="-1">
<header class="LibraryWindow__header" data-tag="header">
<div class="LibraryWindow__brand"><span class="LibraryWindow__mark" aria-hidden="true">${iconSvg('Score', {size:'28px'})}</span><h1>Library</h1></div>
<div class="LibraryWindow__actions"><div data-tag="addSlot"></div><div data-tag="settingsSlot"></div>
<button type="button" data-tag="expand" class="LibraryWindow__icon" aria-label="Expand library" title="Expand library">${iconSvg('Full Screen', {size:'20px'})}</button>
<button type="button" data-tag="closer" class="LibraryWindow__icon" aria-label="Close library" title="Close library">${iconSvg('Close', {size:'20px'})}</button>
</div>
</header>
<div class="LibraryWindow__body" data-tag="body"></div>
</section>
</div>`);
Object.assign(this, dataIndex('tag', this.elm));
this.view = new BookshelfView(this);
this.body.append(this.view.elm);
this.listeners.push(listen(this.panel, 'pointerdown', event => { event.taken = true; }, { capture:true }));
this.listeners.push(listen(this.closer, 'click', () => this.hide()));
this.listeners.push(listen(this.expand, 'click', () => this.setMode(this.mode === 'full' ? 'side' : 'full')));
this.listeners.push(listen(window, 'resize', () => this.updateMode()));
this.listeners.push(listen(document, 'keydown', event => {
if (!this.open || document.querySelector('dialog[open]')) return;
if (event.key === 'Escape') {
event.preventDefault(); event.stopImmediatePropagation();
if (!this.view.dismissLayer()) this.hide();
} else if (event.key === 'Tab' && this.fullView) {
const focusable = [...this.panel.querySelectorAll('button,input,select,summary,[tabindex="0"]')]
.filter(elm => {
if (elm.tabIndex < 0 || elm.disabled || elm.closest('[inert]')) return false;
// Closed details can still expose descendant geometry. Only their
// own summary is focusable, not controls or nested summaries inside.
for (let parent = elm.parentElement; parent && parent !== this.panel; parent = parent.parentElement) {
if (parent.tagName === 'DETAILS' && !parent.open &&
!parent.querySelector(':scope > summary')?.contains(elm)) return false;
}
return elm.getClientRects().length && getComputedStyle(elm).visibility !== 'hidden';
});
const first = focusable[0], last = focusable.at(-1);
if (event.shiftKey && (document.activeElement === first || document.activeElement === this.panel)) { event.preventDefault(); last?.focus(); }
else if (!event.shiftKey && (document.activeElement === last || document.activeElement === this.panel)) { event.preventDefault(); first?.focus(); }
}
}, { capture:true }));
}
get fullView() { return this.mode === 'full' || innerWidth <= 720; }
setMode(mode) {
this.mode = mode;
this.updateMode();
}
updateMode() {
this.elm.dataset.mode = this.mode;
this.elm.dataset.full = String(this.fullView);
this.panel.setAttribute('aria-modal', String(this.fullView));
this.expand.hidden = !_score_ || innerWidth <= 720;
const label = this.mode === 'full' ? 'Use library side panel' : 'Expand library';
this.expand.setAttribute('aria-label', label); this.expand.title = label;
this.view?.updatePresentation();
}
show() {
if (!this.open) {
this.returnFocus = document.activeElement;
this.setMode(_score_ ? 'side' : 'full');
}
this.open = true;
this.elm.hidden = false;
this.elm.style.zIndex = ++_zTop_;
if (!this.elm.isConnected) _body_.append(this.elm);
this.view.select();
requestAnimationFrame(() => { if (this.open) this.panel.focus({ preventScroll:true }); });
return this;
}
hide() {
this.open = false;
this.elm.hidden = true;
if (this.returnFocus?.isConnected) this.returnFocus.focus?.({ preventScroll:true });
return this;
}
close() {
if (this.closing) return;
this.closing = true;
this.hide();
this.finishClose();
}
setPosition() {}
constrain() {}
destructor() {
this.view.resizeObserver.disconnect();
this.view.cloudFolderPicker?.close();
super.destructor();
}
}
class ScoreDisplayControls {
constructor(cell) {
this.cell = cell;
this.fitGroup = new ButtonGroup(
this.cell.stash, {
Expand: { svg: "Expand", radio: "pgFit" },
Center: { svg: "Center", radio: "pgFit" },
},
async (e,tag,value) => {
let score = _score_;
if (!score) return; // (the panel can stay open after its score was closed)
score.details.pgFit = value;
// Re-open the current layout to apply the new fit. Use the canonical
// stash.active key (always valid, kept current by Layout.open) — the
// layout ring's activeCell object is not reliably maintained and can
// be null/stale (cf. score.js score-load path).
let layout = _menu_.rings.layout;
await Layout.open(layout.cells[layout.stash.active || "book"]);
}
);
this.qualityGroup = new SliderGroup(
this.cell.stash,
{
quality: {
min: 0.5,
max: 6,
step: 0.1,
value: 2,
throttle: 750,
msg: () => {
let q = cell.stash.quality;
let desc =
q < 1.1
? "Low"
: q < 2.1
? "Medium"
: q < 3.1
? "High"
: q < 4.1
? "Very High"
: "Extreme";
return "Display Quality: " + desc + ` (${parseInt(q * 100)}%)`;
},
},
},
async (e, tag, value) => {
let score = _score_;
if (score) {
score.quality = value;
for (let pg of score.pgs)
// rerender un-rendered pg's iff they are backed by pdf:
if (pg.inflated && pg.mozPn) await pg.renderPdf().catch(err => {
// AbortError: pg was deflated meanwhile (e.g. the layout was rebuilt)
if (err.name != "AbortError") console.warn(`Failed to render page ${pg.mozPn}:`, err);
});
}
}
);
}
}
class DisplaySettingsPanel extends MenuGroupPanel {
constructor(cell) {
super(cell);
const score = this.section('Score display');
if (_score_) {
this.controls = new ScoreDisplayControls(_menu_.rings.score.cells.details);
score.append(helm('<div>Page Fit</div>'), this.controls.fitGroup.elm, this.controls.qualityGroup.elm);
this.action(score, 'Layout, margins and page-number bands', () => {
const ring = _menu_.rings.layout;
_menu_.showPanel(ring.cells[ring.stash.active || 'book']);
});
} else score.append(document.createTextNode('Open a score to adjust its display.'));
const screen = this.section('Screen');
screen.append(menuActionList(this, ['app/position', 'app/wakeLock']));
const curtain = this.section('Curtain');
curtain.append(menuActionList(this, ['app/curtain']));
this.action(curtain, 'Curtain color and opacity', () => _menu_.showPanel(_menu_.rings.app.cells.curtain));
this.listeners.push(listen(document, 'scoreOpened', () => this.close()));
this.listeners.push(listen(document, 'scoreClosed', () => this.close()));
}
show() {
this.controls?.qualityGroup.refresh();
return super.show();
}
}
class TransferPanel extends MenuGroupPanel {
constructor(cell) {
super(cell);
this.body.append(helm('<p>Copy pages between scores using the shared page buffer. Select an action, then tap the page.</p>'));
this.body.append(menuActionList(this, ['page/export', 'page/import']));
this.action(this.body, 'Review and organize buffer', () => _menu_.showPanel(_menu_.rings.page.cells.import));
}
}
class PageAdvancedPanel extends MenuGroupPanel {
constructor(cell) {
super(cell);
this.body.append(helm('<p>Flatten makes the annotations on a page read-only. Select the action, then tap a page. Confirmation is required.</p>'));
this.body.append(menuActionList(this, ['page/flatten']));
}
}
class ThemePanel extends MenuGroupPanel {
constructor(cell) {
super(cell);
this.choices = new ButtonGroup(cell.stash, {
Light: { svg:'Light', radio:'theme' },
Glass: { svg:'Glass', radio:'theme' },
Dark: { svg:'Dark', radio:'theme' },
}, (_e, _tag, value) => _menu_.applyTheme(value));
this.body.append(this.choices.elm);
}
show() {
this.choices.refresh();
return super.show();
}
}
class NavigationPanel extends MenuGroupPanel {
constructor(cell) {
super(cell);
this.listeners.push(listen(document, 'scoreOpened', () => this.close()));
this.listeners.push(listen(document, 'scoreClosed', () => this.close()));
if (!_score_) {
this.body.append(helm('<p>Open a score to configure its page-turning controls.</p>'));
return;
}
const stash = _menu_.rings.page.cells.numbers.stash;
for (const [key, label] of [['forward', 'Next page / mark'], ['reverse', 'Previous page / mark']]) {
const section = this.section(label);
section.append(new ButtonGroup(stash, {
Pages: { svg:'Page', radio:key }, Marks: { svg:'Mark', radio:key },
}, () => {}).elm);
}
}
}
let panels = window._panels_ = {
LibraryPanel,
DisplaySettingsPanel,
TransferPanel,
PageAdvancedPanel,
NavigationPanel,
ThemePanel,
// This structure maps every Panel to its class.
// Panels are instantiated on demand, and the
// singletons are stored here as well, keyed by
// their cell's key: its the name of the class,
// minus the "Panel" portion, and starting with
// lowercase. ex: GridPanel -> grid: instance
Panel,
TransposePanel,
PlaybackPanel,
AboutPanel,
AddPanel,
BookPanel,
ClockPanel,
CopyPanel,
GuidePanel,
DetailsPanel,
GridPanel,
HorizontalPanel,
MagnifyPanel,
MergePanel,
MetronomePanel,
NewPanel,
NumbersPanel,
OpenPanel,
ImportPanel,
KeyboardPanel,
PencilPanel,
PenPanel,
PianoPanel,
PrintPanel,
RastrumPanel,
ReviewPanel,
SavePanel,
ScreenPanel,
StoragePanel,
StopwatchPanel,
TextPanel,
EditPanel,
SymbolsPanel,
TablePanel,
VerticalPanel,
CurtainPanel,
VolumePanel,
};
// #inclusion src/file.js minified
let scoreFileMimeType = name => name.toLowerCase().endsWith('.sqlite') ? 'application/vnd.sqlite3'
: name.toLowerCase().endsWith('.md') ? 'text/markdown'
: name.toLowerCase().endsWith('.json') ? 'application/json'
: name.toLowerCase().endsWith('.zip') ? 'application/zip'
: name.toLowerCase().endsWith('.mscz') ? 'application/x-musescore' : 'application/pdf';
let bytesToBase64DataUrl = async (bytes, type = "application/octet-stream") => {
return await new Promise((resolve, reject) => {
let reader = Object.assign(new FileReader(), {
onload: () => resolve(reader.result),
onerror: () => reject(reader.error),
});
reader.readAsDataURL(new File([bytes], "", { type }));
});
};
let err = (call, msg) => {
console.warn(`**** Rostrum FileSrc error in call: ${call}`, msg);
console.trace();
throw new Error(msg ?? call, { cause: "fileSrc" });
};
let srcErr = (msg, details) => {
console.warn(`**** Rostrum FileSrc error: ${msg}`);
throw Object.assign(new Error(msg, { cause: "fileSrc" }), details);
};
let errDialog = (error, msg) => {
let message = () => escapeHtml(error.message).replace(/\n/g, "<br>");
if (error.name == "AbortError") return;
else if (error.cause == "cancelled") return toast("Cancelled");
else if (error.cause == "timeout") dialog("Timed out waiting for authentication");
else if (error.cause == "security") dialog(`<em>Security Error</em><br><br><strong>${message()}</strong>`);
else if (error.cause == "fileSrc") dialog(`<em>${msg}</em><br><br><strong>${message()}</strong>`);
else {
console.error(`*** Unexpected Rostrum Error:`, error);
dialog(`<em>Unexpected Error</em><br><br><strong>${msg}</strong><br><br>` +
`<span style="font-size:.8em">${escapeHtml(error.name)}: ${message()}</span>`);
}
};
let checkMergePdf = async (data) => {
if (globalThis._rostrumPages_) await globalThis._rostrumPages_.pdfWriter();
let { PDFDocument } = PDFLib;
try {
await PDFDocument.load(data);
return data;
} catch (err) {
if (!(err.message?.includes('encrypted') || err.message?.includes('Encrypt'))) throw err;
let readable = false;
try { let doc = await PDFDocument.load(data, { ignoreEncryption: true }); doc.getPages(); readable = true; } catch {}
if (!readable) {
dialog("This PDF is write-protected and cannot be merged.",
{ OK: { svg: "Cancel" } }, (e, prop, tag, args) => args.close());
return null;
}
return await new Promise(resolve => {
let dlg = dialog(
"This PDF has copy protection. Merging may not preserve all content.",
{ Merge: { svg: "Merge" }, Cancel: { svg: "Cancel" } },
(e, prop, tag, args) => { args.close(); resolve(tag == "Merge" ? data : null); }
);
listen(dlg, 'cancel', () => resolve(null));
});
}
};
let activateMerge = (pdfData) => {
let mergeCell = _menu_.rings.page.cells.merge;
mergeCell.pdfData = pdfData;
if (_menu_.rings.page.activeCell !== mergeCell) _menu_.activateCell(mergeCell);
_menu_.autoOff.run(4000 + _gs_ * 3.5);
toast("Tap score to merge");
};
let checkUnsaved = async (msg = "Warning: current score has unsaved changes. Open anyway?", close = false) => {
if (_score_?.libraryDocumentId) {
try { await window._bookshelf_.flush(_score_); }
catch (error) { toast('Library save failed: ' + error.message); return false; }
}
return new Promise(async (accept, reject) => {
if(_score_ && _score_.dirty) {
dialog(msg,
close ?  { Close: { svg: "Close"}, Cancel: { svg: "Cancel" } }:
{ Open: { svg: "Open" }, Cancel: { svg: "Cancel" } },
(e, prop, tag, args) => {
args.close();
accept(tag == "Open" || tag == "Close");
}
)}
else accept(true);
})
}
let checkFileSize = async (name, size) => {
let mem = navigator.deviceMemory;
let cores = navigator.hardwareConcurrency || 4;
let MAX_FILE_SIZE = (mem >= 8 || (!mem && cores >= 8)) ? 120 : 40;
MAX_FILE_SIZE *= 1024 * 1024;
checkPath(name);
if (size == 0)
throw new Error('File is empty', { cause: "security" });
if (size > MAX_FILE_SIZE) {
return new Promise((resolve, reject) => {
dialog(
`Large File Warning<br><br>
File: <i translate="no">${escapeHtml(name)}</i><br>
Size: <strong>${(size / 1024 / 1024).toFixed(1)}MB</strong><br><br>
This file exceeds the recommended size limit of ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB.<br>
Loading will work, but saving may be slow or fail on large files.<br><br>
Continue anyway?`,
{ Continue: { svg: "Open" }, Cancel: { svg: "Cancel" } },
(e, prop, tag, args) => {
args.close();
if (tag == "Continue") {
resolve();
} else {
reject(new Error("File loading cancelled by user", { cause: "cancelled" }));
}
}
);
});
}
};
let checkPath = (...args) => {
for(let arg of args)
if(arg && (arg.includes('../') || arg.includes('..\\') || arg.includes('\0')))
throw new Error('Invalid path', { cause: 'security' });
}
let pathJoin = (path, name) => path + "/" + name.replaceAll("/", "\u2215");
let escapeHtml = (str) => {
if (!str) return '';
return str.toString()
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;') //" <- keep double quotes balanced for build.py
.replace(/'/g, '&#x27;');
}
let getPlainChallenge = (bytes = 32) => {
let randomBytes = new Uint8Array(bytes);
crypto.getRandomValues(randomBytes);
return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
};
class FileSrc {
static refs = null;
static clearLocalRecent() { return FileSrc.get(Score.sources.local).clearRecent(); }
static get(ref) {
if (!FileSrc.refs) FileSrc.refs = new Map();
let refs = FileSrc.refs;
if (refs.has(ref)) return refs.get(ref);
let src;
if (ref == Score.sources.local) src = new LocalSrc();
else if (ref == Score.sources.gdrive) src = new GDriveSrc();
else if (ref == Score.sources.dbx) src = new DbxSrc();
else if (ref == Score.sources.odrive) src = new ODriveSrc();
else if (ref == Score.sources.pcloud) src = new PCloudSrc();
else if (ref == Score.sources.url) src = new UrlSrc();
FileSrc.refs.set(ref, src);
FileSrc.refs.set(src, ref);
return src;
}
static async offerLibraryImport(score, file) {
const library = window._bookshelf_;
if (!library) return;
const importFile = await new Promise(resolve => {
const prompt = dialog(`Import <span translate="no">${escapeHtml(file.name)}</span> to Library?<br><br>You can also view it without importing.`,
{ 'Import to Library': { svg:'Open' }, 'View only': { svg:'Open' } }, (_e,_prop,tag,args) => {
resolve(tag === 'Import to Library'); args.close();
});
prompt.setAttribute('aria-label','Import opened score to Library');
listen(prompt,'close',() => resolve(false),{once:true});
prompt.buttonsElm.self.elms['View only'].focus();
});
if (!importFile) return;
try {
const imported = await library.importReviewed(file,{originalLocation:{
source:score.source,path:score.source === Score.sources.local ? null : score.path ?? null,name:file.name,
}},score);
if (!imported) return;
if (imported.deleted_at || imported.replaced_by_id) {
toast('Score already exists in Library history.'); return;
}
await library.openDocument(imported.id);
toast(imported.alreadyImported ? 'Opened existing Library score.' : 'Score imported to Library.');
} catch (error) { errDialog(error,'Could not import or open the Library copy.'); }
}
static async openActiveScore(cell) {
let score = _score_;
let src = score ? FileSrc.get(score.source) : null;
if (!src) {
let panel = panels[cell.name + "Panel"].get(cell);
if (panel.elm.style.visibility != "visible") {
let box = getBox(_menu_.grip);
panel.elm.style.left = box.x + box.width / 2 + "px";
panel.elm.style.top = box.y + box.height / 2 + "px";
panel.show();
delay(10, () => panel.setPosition(_menu_.grip));
}
return;
}
return new Promise(async (accept, reject) => {
dialog("Confirm. Revert To Saved?", { Revert: { svg: "Open" }, Cancel: { svg: "Cancel" } }, async (e, prop, tag, args) => {
try {
args.close();
if (tag == "Cancel") return;
let picking = !score.fileHandle && src.source == Score.sources.local;
if (!picking) _shade_.show("Downloading file");
let data, size, created, modified, name = score.name, path = score.path, fileHandle = score.fileHandle;
if (score.fileHandle) {
let file = await score.fileHandle.getFile();
data = await file.arrayBuffer();
size = data.byteLength;
modified = file.lastModified;
name = file.name;
} else {
({ data, size, created, modified, name = score.name, path = score.path, fileHandle } = await src.getFile(picking ? null : score.path, picking ? null : score.name));
}
if (picking) _shade_.show("Opening file");
score = await new Score().init(score.source, path, name, data);
if (fileHandle) score.fileHandle = fileHandle;
Score.visit(score, { size, created, modified });
toast("File reverted.");
} catch (error) {
if (!error.handled) errDialog(error, "Error: failed to download file from cloud server.<br>Details in Console.");
} finally {
_shade_.hide();
accept();
}
});
});
}
static async saveActiveScore(cell) {
let score = _score_;
if (score.libraryDocumentId) {
try { await window._bookshelf_.flush(score); toast('Library changes saved.'); }
catch (error) { toast('Library save failed: ' + error.message); }
return;
}
let src = FileSrc.get(score.source);
if (!src || typeof src.putFile != 'function' || (score.music && !score.music.savedAsMscz
&& !/\.mscz$/i.test(score.music.name) && !(src instanceof LocalSrc))) {
let panel = panels[cell.name + "Panel"].get(cell);
if (panel.elm.style.visibility != "visible") {
panel.show();
panel.setPosition(_menu_.grip);
}
return;
}
const nativeHandle = !score.music || /\.mscz$/i.test(score.music.name) || score.music.savedAsMscz;
let handle = score.name === score.saveName && nativeHandle
&& (!score.fileHandle?.name || score.fileHandle.name === score.saveName) ? score.fileHandle || null : null;
_shade_.show("Saving file");
return new Promise(async (accept, reject) => {
try {
const pendingData = score.toFile();
const saved = await src.putFile(score.path, score.saveName, src instanceof LocalSrc ? pendingData : await pendingData, handle);
const data = await pendingData;
if (src instanceof LocalSrc) {
score.fileHandle = saved.fileHandle;
score.path = saved.path;
}
score.update({ name: saved?.name || score.saveName });
if (score.music) score.music.savedAsMscz = true;
Score.visit(score, { size: data.length, modified: Date.now() });
score.setDirty(false);
toast("File saved.");
} catch (error) {
if (error.originalData) {
dialog(`${escapeHtml(error.message)}<br><br>Save original PDF instead (without Rostrum modifications)?`,
{ Save: { svg: "Save" }, Cancel: { svg: "Cancel" } }, async (e, prop, tag, args) => {
args.close();
if (tag == "Save") {
try {
_shade_.show("Saving original file");
let data = error.originalData;
await src.putFile(score.path, score.name, data, handle);
Score.visit(score, { size: data.length, modified: Date.now() });
score.setDirty(false);
toast("Original file saved.");
} catch (err) {
errDialog(err, "Failed to save original file");
} finally {
_shade_.hide();
}
}
}
);
} else if (error.name != 'AbortError') {
errDialog(error, "Error: failed to save file.<br>Details in Console.");
}
} finally {
_shade_.hide();
accept();
}
});
}
}
class LocalSrc extends FileSrc {
source = Score.sources.local;
handles = new Map();
nativeUnavailable = false;
get supported() { return window._localFs_.supported && !this.nativeUnavailable; }
async recentStore(mode, run) {
const open = indexedDB.open('rostrum-local-recent', 2);
open.onupgradeneeded = () => {
if (open.result.objectStoreNames.contains('files')) open.result.deleteObjectStore('files');
if (!open.result.objectStoreNames.contains('handles')) open.result.createObjectStore('handles', { keyPath: 'id' });
};
const db = await idbRequest(open);
try {
const transaction = db.transaction('handles', mode);
const done = new Promise((resolve, reject) => {
transaction.oncomplete = resolve;
transaction.onabort = () => reject(transaction.error || new Error('Recent storage failed'));
transaction.onerror = () => reject(transaction.error);
});
const [result] = await Promise.all([run(transaction.objectStore('handles')), done]);
return result;
} finally { db.close(); }
}
async records() {
const records = await this.recentStore('readonly', store => idbRequest(store.getAll()));
for (const record of records) if (!this.handles.has(record.id)) this.handles.set(record.id, record.handle);
return records;
}
async getHandle(id) {
if (this.supported && id && this.handles.has(id)) return this.handles.get(id);
await this.records().catch(() => {});
return this.supported && id ? this.handles.get(id) || null : null;
}
async remember(file, handle = file.handle) {
try { await this.records(); } catch {  }
if (!handle) return null;
let id;
for (const [key, saved] of this.handles) {
try { if (saved === handle || await saved.isSameEntry(handle)) { id = key; break; } } catch {}
}
id ||= crypto.randomUUID();
this.handles.set(id, handle);
try {
await this.recentStore('readwrite', async store => {
await idbRequest(store.put({ id, name: file.name, handle, visited: Date.now() }));
const entries = await idbRequest(store.getAll());
for (const entry of entries.sort((a, b) => b.visited - a.visited).slice(20)) {
store.delete(entry.id); this.handles.delete(entry.id);
}
});
} catch (error) {
console.warn('Could not persist local file handle', error);
toast('Recent file access is available only until this tab is closed.');
}
return id;
}
async clearRecent() {
this.handles.clear();
await this.recentStore('readwrite', store => idbRequest(store.clear()));
}
async verifyPermission(handle, mode = 'read') {
if (!handle.queryPermission) return;
if (await handle.queryPermission({ mode }) === 'granted') return;
if (await handle.requestPermission({ mode }) !== 'granted')
throw new Error('Access to this file was not granted. Open it again from Local.', { cause: 'fileSrc' });
}
options(mode) {
return mode === 'copy'
? [{ description: 'Images', mimeTypes: ['image/jpeg', 'image/png'], extensions: ['.jpg', '.jpeg', '.png'] }]
: mode === 'merge' ? [{ description: 'PDF scores', mimeTypes: ['application/pdf'], extensions: ['.pdf'] }]
: [{ description: 'Scores', mimeTypes: ['application/pdf', 'application/octet-stream'], extensions: ['.pdf', '.mscz', '.mxl', '.musicxml', '.xml'] }];
}
async pickFile(mode) {
try {
return await (this.supported ? window._localFs_.fileOpen : window._localFs_.fileOpenLegacy)(this.options(mode));
} catch (error) {
if (error.name !== 'SecurityError') throw error;
this.nativeUnavailable = true;
return window._localFs_.fileOpenLegacy(this.options(mode));
}
}
async getFile(path, name, mode) {
let file, handle;
if (name) {
handle = await this.getHandle(path);
if (!handle) throw new Error('This file has no reusable access. Open it again from Local.', { cause: 'fileSrc' });
await this.verifyPermission(handle);
try { file = await handle.getFile(); }
catch (error) {
if (error.name !== 'NotFoundError') throw error;
throw new Error('The original file is no longer available. Open it again from Local.', { cause: 'fileSrc' });
}
} else {
file = await this.pickFile(mode);
handle = file.handle;
}
await checkFileSize(file.name, file.size);
const id = await this.remember(file, handle);
return { path: id, name: file.name, data: await file.arrayBuffer(), size: file.size,
modified: file.lastModified, fileHandle: handle || null };
}
async putFile(path, name, data, handle = null) {
const options = { fileName: name, mimeTypes: [name.toLowerCase().endsWith('.mscz') ? 'application/x-musescore' : 'application/pdf'],
extensions: [name.toLowerCase().endsWith('.mscz') ? '.mscz' : '.pdf'], description: 'Scores' };
const blob = Promise.resolve(data).then(bytes => new Blob([bytes], {
type: name.toLowerCase().endsWith('.mscz') ? 'application/x-musescore' : 'application/pdf',
}));
blob.catch(() => {});
let savedHandle;
try {
savedHandle = await (this.supported ? window._localFs_.fileSave : window._localFs_.fileSaveLegacy)(blob, options, handle, true);
} catch (error) {
if (error.name !== 'SecurityError') throw error;
this.nativeUnavailable = true;
savedHandle = await window._localFs_.fileSaveLegacy(blob, options);
}
const file = savedHandle ? await savedHandle.getFile() : new File([], name);
return { name: file.name, modified: file.lastModified,
path: await this.remember(file, savedHandle), fileHandle: savedHandle || null };
}
}
class CachedSrc extends FileSrc {
cache = {
"": { id: "root", name: "", ts: 0, dirs: {}, files: {} },
};
maxCacheAge = 2 * 60 * 1000;
extraAuthParams = "";
getQuery(url, key) {
let i = url.indexOf(key);
if (i == -1) return null;
let value = url.substring(i + key.length);
i = value.indexOf("&");
value = i == -1 ? value : value.substring(0, i);
try { return decodeURIComponent(value); } catch(e) { return value; }
}
clientId = null;
scopes = null;
authUrl = null;
tokenUrl = null;
redirectUri = new URL("podauth.html", location.href).href;
tokens = null;
refreshExpiry = 90 * 24 * 60 * 60;
authTimeout = 180;
authPopupOpen(url) {
let h = Math.min(screen.height, 1000);
let w = Math.min(screen.width, 750);
let x = top.outerWidth / 2 + top.screenX - w / 2;
let y = top.outerHeight / 2 + top.screenY - h / 2;
let popup = open(url, "", `popup,height=${h},width=${w},top=${y},left=${x}`);
let focusInterval = setInterval(() => {
if (popup && !popup.closed) popup.focus();
else clearInterval(focusInterval);
}, 500);
return popup;
}
authPopupClose(popup) {
_shade_.pop();
popup?.close();
}
async auth() {
let refreshAccessToken = async () => {
let params = new URLSearchParams();
params.append('client_id', this.clientId);
params.append('refresh_token', this.tokens.refresh_token);
params.append('grant_type', 'refresh_token');
let response = await fetch(this.tokenUrl, {
method: "POST",
headers: { "Content-Type": "application/x-www-form-urlencoded" },
body: params.toString(),
});
if (response.ok) {
let now = performance.now() / 1000;
let newTokens = await response.json();
if (!newTokens.refresh_token) {
newTokens.refresh_token = this.tokens.refresh_token;
newTokens.refresh_expiry = this.tokens.refresh_expiry;
} else {
newTokens.refresh_expiry = now + (newTokens.refresh_token_expires_in || this.refreshExpiry);
}
this.tokens = newTokens;
this.tokens.expiry = now + this.tokens.expires_in;
} else {
throw new Error(await response.text());
}
}
if(this.tokens) {
let now = performance.now() / 1000;
if(this.tokens.expiry > now) return Promise.resolve();
}
if (this.backgroundAuth) {
if (this.tokens?.refresh_token && this.tokens.refresh_expiry > performance.now() / 1000) return refreshAccessToken();
throw Object.assign(new Error('Connect to the cloud with Sync library now to continue.'), { name:'AuthRequiredError' });
}
let isExtension = window.chrome && chrome.identity && chrome.runtime?.id;
let popup = isExtension ? null : this.authPopupOpen('about:blank');
if(this.tokens?.refresh_token) {
let now = performance.now() / 1000;
if(this.tokens.refresh_expiry > now) {
try {
await refreshAccessToken();
popup?.close();
return Promise.resolve();
} catch(error) {
console.warn("Token refresh failed, using full auth.");
}
}
}
if(!isExtension && !popup)
throw new Error("Authentication popup was blocked. Allow popups for this site and try again.", { cause: "fileSrc" });
let base64UrlEncode = (str) =>
btoa(String.fromCharCode.apply(null, new Uint8Array(str)))
.replace(/\+/g, "-")
.replaceAll("/", "_")
.replace(/=+$/, "");
let plainChallenge = getPlainChallenge();
let challenge = base64UrlEncode(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(plainChallenge)));
let state = getPlainChallenge();
let timeout = (performance.now() / 1000) + this.authTimeout;
_shade_.show("Authorizing");
let fullUrl = `${this.authUrl}?client_id=${this.clientId}&scope=${encodeURIComponent(this.scopes)}&response_type=code&redirect_uri=${encodeURIComponent(this.redirectUri)}&code_challenge_method=S256&code_challenge=${challenge}&state=${state}${this.extraAuthParams}`;
if (popup) popup.location.href = fullUrl;
return new Promise((resolve, reject) => {
let exchange = async (code, redirectUri) => {
let params = new URLSearchParams();
params.append('client_id', this.clientId);
params.append('redirect_uri', redirectUri);
params.append('code', code);
params.append('code_verifier', plainChallenge);
params.append('grant_type', 'authorization_code');
let response = await fetch(this.tokenUrl, {
method: "POST",
headers: { "Content-Type": "application/x-www-form-urlencoded" },
body: params.toString(),
});
if (response.ok) return await response.json();
else {
throw new Error(await response.text());
}
};
if (isExtension) {
let extRedirectUri = chrome.identity.getRedirectURL();
let extFullUrl = fullUrl.replace(encodeURIComponent(this.redirectUri), encodeURIComponent(extRedirectUri));
chrome.identity.launchWebAuthFlow({ url: extFullUrl, interactive: true }, async (responseUrl) => {
_shade_.pop();
if (chrome.runtime.lastError || !responseUrl) {
return reject(new Error(chrome.runtime.lastError?.message || "Authentication failed or was cancelled.", { cause: "cancelled" }));
}
try {
let url = new URL(responseUrl);
let code = url.searchParams.get("code");
let respState = url.searchParams.get("state");
if (respState != state) throw new Error("CSRF attempt blocked.");
this.tokens = await exchange(code, extRedirectUri);
let now = performance.now() / 1000;
this.tokens.expiry = now + this.tokens.expires_in;
if(this.tokens.refresh_token)
this.tokens.refresh_expiry = now  + (this.tokens.refresh_token_expires_in || this.refreshExpiry);
resolve();
} catch (e) {
reject(e);
}
});
return;
}
let exchanging = false;
let poll = async () => {
try {
if (popup.closed) throw new Error("Authentication aborted", { cause: "cancelled" });
let href = popup.location.href;
let params = new URL(href).searchParams;
let error = params.get("error");
if (error) {
let errorMsg = params.get("error_description") || error;
throw new Error(`Authentication failed: ${errorMsg}`, { cause: "fileSrc" });
}
let code = this.getQuery(href, "code=");
if (code) {
if (exchanging) return;
exchanging = true;
if(this.getQuery(href, "state=") != state)
throw new Error("Possible Cross Site Request Forgery attempt blocked.", {cause:"security"});
this.tokens = await exchange(code, this.redirectUri);
let now = performance.now() / 1000;
this.tokens.expiry = now + this.tokens.expires_in;
if(this.tokens.refresh_token)
this.tokens.refresh_expiry = now  + (this.tokens.refresh_token_expires_in || this.refreshExpiry);
this.authPopupClose(popup);
return resolve();
}
} catch (e) {
if (e.name != "SecurityError") {
this.authPopupClose(popup);
return reject(e);
}
}
if ((performance.now() / 1000) > timeout) {
this.authPopupClose(popup);
return reject(new Error("Timed out waiting for user's authorization.", { cause: "timeout" }));
}
setTimeout(() => poll(), 20);
};
setTimeout(() => poll(), 50);
});
}
putCache(path, data) {
let cache = this.cache;
try {
let purgeCache = (path) => {
let entry = cache[path] || {};
for (let key of Object.keys(entry.dirs)) purgeCache(pathJoin(path, key));
delete cache[path];
};
let current = cache[path];
purgeCache(path);
cache[path] = {
id: current.id,
name: current.name,
ts: Date.now(),
dirs: {},
files: {},
};
} catch (error) {
err(`putCache(${path},...)`, error.message);
}
return cache[path];
}
async getDir(path, force = false, retry = true) {
checkPath(path);
await this.auth();
let dir;
if (this.cache.hasOwnProperty(path)) {
dir = this.cache[path];
if (!force && Date.now() - dir.ts <= this.maxCacheAge) return dir;
if (dir.name == "") return this.putCache(path, await this.getDirSrc(path, dir));
}
let lastSlashIndex = path.lastIndexOf("/");
if (lastSlashIndex == -1) {
Score.visit({ source: this.source, name: dir.name, path: path });
err(`getDir(${path})`, "Path not found.");
}
let parentPath = path.substring(0, lastSlashIndex);
await this.getDir(parentPath, force);
dir = this.cache[path];
if (!dir) err(`getDir(${path})`, "Cloud folder not found: " + path);
const data = await this.getDirSrc(path, dir);
if (this.cache[path]?.id === dir.id) return this.putCache(path, data);
if (retry) return this.getDir(path, true, false);
err(`getDir(${path})`, "Cloud folder changed while checking it. Try again: " + path);
}
async putDir(path, name) {
checkPath(path, name);
await this.auth();
let srcDir = await this.getDir(path);
if (!srcDir) {
err(`putDir(${path},${name})`, "Path not found.");
Score.visit({ source: this.source, name: name, path: path });
}
let newDir = srcDir.dirs[name];
let file = srcDir.files[name];
if (newDir || file) err(`putDir(${path},${name})`, "Name in use.");
await this.putDirSrc(path, name, srcDir);
}
async renameDir(path, name, newName) {
checkPath(path, name, newName);
await this.auth();
let srcDir = await this.getDir(path);
if (!srcDir) {
Score.visit(null, null, path);
err(`renameDir(${path},${name},${newName})`, "Path not found.");
}
let srcSubDir = srcDir?.dirs[name];
if (!srcSubDir) {
Score.visit(null, null, pathJoin(path, name));
err(`renameDir(${path},${name},${newName})`, "Path not found.");
}
if (!srcDir || !srcSubDir) {
err(`renameDir(${path},${name},${newName})`, "Path not found.");
Score.visit(null, null, path);
}
let dstName = srcDir.files[newName] || srcDir.dirs[newName];
if (dstName) err(`renameDir(${path},${name},${newName})`, "Name in use.");
await this.renameDirSrc(path, name, newName, srcDir, srcSubDir);
}
async trashDir(path, name) {
checkPath(path, name);
await this.auth();
let parentDir = await this.getDir(path);
let dir = parentDir.dirs[name];
if (!dir) {
Score.visit(null, null, pathJoin(path, name));
err(`trashDir(${path},${name})`, "Path/Name not found.");
}
await this.trashDirSrc(path, name, parentDir, dir);
}
async getFile(path, name) {
checkPath(path,name);
await this.auth();
let dir = await this.getDir(path);
let file = dir.files[name];
if (!file) {
Score.visit({ source: this.source, path, name });
err(`getFile(${path},${name})`, "Path/Name not found.");
}
await checkFileSize(name, file.size);
return { path: path, name: name, data: await this.getFileSrc(path, name, dir, file), size: file.size, created: file.created, modified: file.modified };
}
async putFile(path, name, data) {
checkPath(path, name);
let dir = await this.getDir(path);
if (dir.dirs[name]) return err(`putFile(${path},${name},...)`, "Path not found.");
await this.putFileSrc(path, name, await data, dir, dir.files[name]);
}
async renameFile(path, name, newName) {
checkPath(path, name, newName);
await this.auth();
let srcDir = await this.getDir(path);
if (!srcDir) {
Score.visit({ source: this.source }, null, path);
err(`renameFile(${path},${name},${newName})`, "Path/Name not found.");
}
let srcFile = srcDir?.files[name];
if (!srcFile) {
Score.visit({ source: this.source, path, name });
err(`renameFile(${path},${name},${newName})`, "Path/Name not found.");
}
let dstFile = srcDir.files[newName] || srcDir.dirs[newName];
if (dstFile) err(`renameFile(${path},${name},${newName})`, "Name in use.");
await this.renameFileSrc(path, name, newName, srcDir, srcFile);
}
async trashFile(path, name) {
checkPath(path, name);
await this.auth();
let dir = await this.getDir(path);
let file = dir.files[name];
if (!file) {
Score.visit({ source: this.source, path, name });
err(`trashFile(${path},${name})`, "Path/Name not found");
}
await this.trashFileSrc(path, name, dir, file);
}
}
class GDriveSrc extends CachedSrc {
source = Score.sources.gdrive;
clientId = "1049752786050-72rqerj64c1l1vqk26r28qtcahfd6i3v.apps.googleusercontent.com";
filesUrl = "https://www.googleapis.com/drive/v3/files/";
uploadUrl = "https://www.googleapis.com/upload/drive/v3/files/";
folderMimeType = "application/vnd.google-apps.folder";
constructor() {
super();
this.tokens = null;
this.gisClient = null;
}
async loadGIS () {
if (window.google && window.google.accounts && window.google.accounts.oauth2) return window.google;
return new Promise((resolve, reject) => {
let  script = document.createElement("script");
script.src = "https://accounts.google.com/gsi/client";
script.async = true;
script.defer = true;
script.onload = () => resolve(window.google);
script.onerror = () => reject(new Error("Failed to load Google Identity Services SDK"));
document.head.append(script);
});
}
preloadGIS() {
if (window.chrome && chrome.identity && chrome.runtime?.id) return;
this.loadGIS().catch(() => {});
}
async auth() {
if (this.tokens && this.tokens.expiry > Date.now() / 1000) return;
if (this.backgroundAuth) throw Object.assign(new Error('Connect to Google Drive with Sync library now to continue.'), { name:'AuthRequiredError' });
if (window.chrome && chrome.identity && chrome.runtime?.id) {
return new Promise((resolve, reject) => {
let redirectUri = chrome.identity.getRedirectURL();
let authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
`client_id=${this.clientId}&` +
`response_type=token&` +
`redirect_uri=${encodeURIComponent(redirectUri)}&` +
`scope=${encodeURIComponent("https://www.googleapis.com/auth/drive")}`;
_shade_.show("Authorizing");
chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (responseUrl) => {
_shade_.pop();
if (chrome.runtime.lastError || !responseUrl) {
reject(new Error(chrome.runtime.lastError?.message || "Authentication failed or was cancelled.", {cause:"cancelled"}));
} else {
let url = new URL(responseUrl);
let params = new URLSearchParams(url.hash.substring(1));
let token = params.get("access_token");
if (token) {
this.tokens = {
access_token: token,
expiry: Date.now() / 1000 + parseInt(params.get("expires_in") || "3600"),
};
resolve();
} else {
reject(new Error("No access token returned from Google."));
}
}
});
});
}
let google = await this.loadGIS();
if (!this.gisClient) {
this.gisClient = google.accounts.oauth2.initTokenClient({
client_id: this.clientId,
scope: "https://www.googleapis.com/auth/drive",
prompt: '',
callback: (response) => {
_shade_.pop();
if (response.error) {
this.pendingReject?.(new Error(response.error, { cause: "auth" }));
} else {
let now = Date.now() / 1000;
this.tokens = {
access_token: response.access_token,
expiry: now + (response.expires_in || 3600),
};
this.pendingResolve?.();
}
this.pendingResolve = null;
this.pendingReject = null;
},
error_callback: (error) => {
_shade_.pop();
this.pendingReject?.(new Error("Authentication cancelled by user.", { cause: "cancelled" }));
this.pendingResolve = null;
this.pendingReject = null;
},
});
}
return new Promise((resolve, reject) => {
this.pendingResolve = resolve;
this.pendingReject = reject;
_shade_.show("Authorizing");
this.gisClient.requestAccessToken();
});
}
putCache(path, data) {
super.putCache(path, data);
let cache = this.cache;
for(let obj of data) {
if (obj.mimeType == this.folderMimeType) {
let subPath = pathJoin(path, obj.name);
cache[subPath] = {
isDir: true,
name: obj.name,
id: obj.id,
created: Date.parse(obj.createdTime),
modified: Date.parse(obj.modifiedTime),
ts: 0,
dirs: {},
files: {},
};
cache[path].dirs[obj.name] = cache[subPath];
} else
cache[path].files[obj.name] = {
isDir: false,
name: obj.name,
id: obj.id,
created: Date.parse(obj.createdTime),
modified: Date.parse(obj.modifiedTime),
size: obj.size,
};
};
return cache[path];
}
async getDirSrc(path, dir) {
let query = "?pageSize=1000&spaces=drive&orderBy=folder desc, name&fields=nextPageToken,files(id,name,mimeType,createdTime,modifiedTime,size)&" + `q='${dir.id}' in parents and trashed=false`;
let url = this.filesUrl + encodeURI(query);
let entries = [];
let loadPage = async (nextPageToken) => {
let fullUrl = nextPageToken ? url + `&pageToken=${nextPageToken}` : url;
let fetchPromise = await fetch(fullUrl, {
method: "GET",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
},
});
let response = await fetchPromise;
if (response.ok) {
let responseJson = await response.json();
entries.push(...responseJson.files);
if ("nextPageToken" in responseJson) await loadPage(responseJson.nextPageToken);
} else err(`getDirSrc(${path},${dir}})`, await response.text());
};
await loadPage(null);
return entries;
}
async putDirSrc(path, name, srcDir) {
let url = this.filesUrl;
let fetchPromise = await fetch(url, {
method: "POST",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
"Content-Type": "application/json",
},
body: JSON.stringify({
mimeType: "application/vnd.google-apps.folder",
name: name,
parents: [srcDir.id],
}),
});
let response = await fetchPromise;
if (!response.ok) return err(`putDirSrc(${path},${name},${srcDir}) failed: ${await response.text()}`);
}
async renameDirSrc(path, name, newName, srcDir, srcSubDir) {
let url = this.filesUrl + srcSubDir.id;
let fetchPromise = await fetch(url, {
method: "PATCH",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
Accept: "application/json",
"Content-Type": "application/json",
},
body: JSON.stringify({ name: newName }),
});
let response = await fetchPromise;
if (response.ok) return true;
err(`renameDirSrc("${path},${name},${newName},...") failed: ${await response.text()}`);
}
async trashDirSrc(path, name, parentDir, dir) {
let url = this.filesUrl + dir.id;
let fetchPromise = await fetch(url, {
method: "PATCH",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
"Content-Type": "application/json",
},
body: JSON.stringify({ trashed: true }),
});
let response = await fetchPromise;
if (!response.ok) err(`trashDirSrc(${path},${name},...)) failed: ${await response.text()}`);
}
async listLibrarySnapshots(path) {
const dir = await this.getDir(path,true), entries = []; let pageToken;
do {
const query = new URLSearchParams({q:`'${dir.id}' in parents and name = 'library.sqlite' and trashed = false`,fields:'nextPageToken,files(id,size,version)',pageSize:'1000'});
if (pageToken) query.set('pageToken',pageToken);
const response = await fetch(this.filesUrl.replace(/\/$/,'') + '?' + query,{headers:{Authorization:'Bearer ' + this.tokens.access_token}});
if (!response.ok) throw new Error('Could not list Drive library versions');
const result = await response.json(); entries.push(...result.files.map(file => ({id:file.id,token:String(file.version),size:Number(file.size)}))); pageToken = result.nextPageToken;
} while (pageToken);
return entries;
}
async reserveLibrarySnapshot() {
const response = await fetch(this.filesUrl + 'generateIds?count=1&space=drive',{headers:{Authorization:'Bearer ' + this.tokens.access_token}});
if (!response.ok) throw new Error('Could not allocate Drive library version');
return (await response.json()).ids[0];
}
async readLibrarySnapshot(path,item) {
const response = await fetch(this.filesUrl + item.id + '?alt=media',{headers:{Authorization:'Bearer ' + this.tokens.access_token}});
if (response.status === 404) throw Object.assign(new Error('Drive version was removed; retry sync'),{retrySync:true});
if (!response.ok) throw new Error('Could not read Drive library version');
const file = await response.blob();
if (item.token) {
const metadata = await fetch(this.filesUrl + item.id + '?fields=version',{headers:{Authorization:'Bearer ' + this.tokens.access_token}});
if (metadata.status === 404) throw Object.assign(new Error('Drive version was removed'),{retrySync:true});
if (!metadata.ok) throw new Error('Could not verify Drive library version');
if (String((await metadata.json()).version) !== item.token) throw Object.assign(new Error('Drive version changed while reading'),{retrySync:true});
}
return file;
}
async publishLibrarySnapshot(path,file,expected,id) {
const dir = await this.getDir(path,true), boundary = 'rostrum-' + crypto.randomUUID();
const body = new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,JSON.stringify({id,name:'library.sqlite',parents:[dir.id]}),`\r\n--${boundary}\r\nContent-Type: application/vnd.sqlite3\r\n\r\n`,file,`\r\n--${boundary}--\r\n`]);
try {
const response = await fetch(this.uploadUrl.replace(/\/$/,'') + '?uploadType=multipart',{method:'POST',headers:{Authorization:'Bearer ' + this.tokens.access_token,'Content-Type':'multipart/related; boundary=' + boundary},body});
if (response.ok) return true;
if (response.status !== 409 && response.status < 500) throw new Error('Drive library publication failed: HTTP ' + response.status);
} catch (error) {
if (!(error instanceof TypeError)) throw error;
}
const existing = await this.readLibrarySnapshot(path,{id});
if (await hashLibraryBytes(await existing.arrayBuffer()) !== await hashLibraryBytes(await file.arrayBuffer())) throw new Error('Drive publication identity has different contents');
return true;
}
async removeLibrarySnapshot(path,item) {
const response = await fetch(this.filesUrl + item.id,{method:'PATCH',headers:{Authorization:'Bearer ' + this.tokens.access_token,'Content-Type':'application/json'},body:JSON.stringify({trashed:true})});
if (!response.ok && response.status !== 404) throw new Error('Could not remove an old Drive library version');
}
async getFileSrc(path, name, dir, file) {
let url = this.filesUrl + file.id + "?q=trashed=false&alt=media";
let fetchPromise = await fetch(url, {
method: "GET",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
},
});
let response = await fetchPromise;
if (response.ok) return await response.arrayBuffer();
if (!response.ok) err(`getFileSrc(${path},${name},...) failed: ${await response.text()}`);
}
async renameFileSrc(path, name, newName, srcDir, srcFile) {
let url = this.filesUrl + srcFile.id;
let fetchPromise = await fetch(url, {
method: "PATCH",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
Accept: "application/json",
"Content-Type": "application/json",
},
body: JSON.stringify({name: newName}),
});
let response = await fetchPromise;
if (!response.ok) err(`renameFileSrc(${path},${name},${newName},...) failed: ${await response.text()}`);
}
async putFileSrc(path, name, data, dir, file) {
let CHUNK_SIZE = 5 * 1024 * 1024;
const dataSize = data instanceof Blob ? data.size : data.byteLength;
if (!file) {
let response = await fetch(this.filesUrl, {
method: "POST",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
"Content-Type": "application/json",
},
body: JSON.stringify({
name: name,
parents: [`${dir.id}`],
}),
});
if (!response.ok) err(`GDrive putFileSrc(${path},${name},...)`, await response.text());
file = await response.json();
}
let response;
if (dataSize > CHUNK_SIZE) {
let sessionResponse = await fetch(this.uploadUrl + file.id + "?uploadType=resumable", {
method: "PATCH",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
"Content-Length": "0",
},
});
let uploadUrl = sessionResponse.ok && sessionResponse.headers.get("Location");
if (!uploadUrl) err(`GDrive putFileSrc(${path},${name},...)`, `upload session: ${await sessionResponse.text()}`);
for (let offset = 0; offset < dataSize; offset += CHUNK_SIZE) {
let chunk = data.slice(offset, Math.min(offset + CHUNK_SIZE, dataSize));
const chunkSize = chunk instanceof Blob ? chunk.size : chunk.byteLength;
let endByte = offset + chunkSize - 1;
response = await fetch(uploadUrl, {
method: "PUT",
headers: {
"Content-Length": chunkSize,
"Content-Range": `bytes ${offset}-${endByte}/${dataSize}`,
},
body: chunk,
});
let last = endByte + 1 >= dataSize;
if (last ? !response.ok : response.status != 308)
err(`GDrive putFileSrc(${path},${name},...)`, `chunk at ${offset}: ${response.status} ${await response.text()}`);
}
} else {
response = await fetch(this.uploadUrl + file.id + "?uploadType=media", {
method: "PATCH",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
"Content-Type": "application/octet-stream",
},
body: data,
});
if (!response.ok) err(`GDrive putFileSrc(${path},${name},...)`, await response.text());
}
let updatedFile = await response.json();
if (dir && dir.files && dir.files[file.name]) {
dir.files[file.name] = {
id: updatedFile.id,
name: updatedFile.name,
size: updatedFile.size || dataSize,
created: updatedFile.createdTime,
modified: updatedFile.modifiedTime
};
}
}
async trashFileSrc(path, name, dir, file) {
let url = this.filesUrl + file.id;
let fetchPromise = await fetch(url, {
method: "PATCH",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
"Content-Type": "application/json",
},
body: JSON.stringify({ trashed: true}),
});
let response = await fetchPromise;
if (!response.ok) err(`trashFileSrc(${path},${name},...) failed: ${await response.text()}`);
}
}
const dropboxApiArg = value => JSON.stringify(value).replace(/[\u007f-\uffff]/g,char => '\\u' + char.charCodeAt(0).toString(16).padStart(4,'0'));
class DbxSrc extends CachedSrc {
source = Score.sources.dbx;
authUrl = "https://www.dropbox.com/oauth2/authorize";
extraAuthParams = "&token_access_type=offline";
clientId = "erqcrdytyixn6h7";
scopes = "files.content.write files.content.read";
tokenUrl = "https://api.dropbox.com/oauth2/token/";
filesUrl = "https:/\/api.dropboxapi.com/2/files/";
contentUrl = "https:/\/content.dropboxapi.com/2/files/";
constructor() {
super();
}
putCache(path, data) {
super.putCache(path, data);
let cache = this.cache;
for (let obj of data) {
if (obj[".tag"] == "folder") {
let subPath = pathJoin(path, obj.name);
cache[subPath] = {
isDir: true,
name: obj.name,
id: obj.id,
created: 0,
modified: 0,
ts: 0,
dirs: {},
files: {},
};
cache[path].dirs[obj.name] = cache[subPath];
} else
cache[path].files[obj.name] = {
isDir: false,
name: obj.name,
id: obj.id,
created: Date.parse(obj.client_modified),
modified: Date.parse(obj.server_modified),
size: obj.size,
};
}
return cache[path];
}
async getDirSrc(path, dir) {
let uri = this.filesUrl + "list_folder";
let entries = [];
let cursor = null;
for (;;) {
let fetchPromise = await fetch(uri, {
method: "POST",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
"Content-Type": "application/json",
},
body: cursor ? JSON.stringify({cursor: cursor}) : JSON.stringify({path: path}),
});
let response = await fetchPromise;
if (!response.ok) err(`getDirSrc(${path},${dir}})`, await response.text());
let responseJson = await response.json();
entries.push(...responseJson.entries);
if (!responseJson.has_more) return entries;
if (!cursor) uri += "/continue";
cursor = responseJson.cursor;
}
}
async putDirSrc(path, name, srcDir) {
let uri = this.filesUrl + "create_folder_v2";
let fetchPromise = await fetch(uri, {
method: "POST",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
"Content-Type": "application/json",
},
body: JSON.stringify({path: path + "/" + name}),
});
let response = await fetchPromise;
if (!response.ok) err(`putDirSrc(${path},${name},...})`, await response.text());
}
async renameDirSrc(path, name, newName, srcDir, srcSubDir) {
let uri = this.filesUrl + "move_v2";
let fetchPromise = await fetch(uri, {
method: "POST",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
"Content-Type": "application/json",
},
body: JSON.stringify({
from_path: `${path}/${name}`,
to_path: `${path}/${newName}`,
}),
});
let response = await fetchPromise;
if (!response.ok) err(`renameDirSrc(${path},${name},${newName})`, await response.text());
}
async trashDirSrc(path, name, parentDir, dir) {
let url = this.filesUrl + "delete_v2";
let fetchPromise = await fetch(url, {
method: "POST",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
"Content-Type": "application/json",
},
body: JSON.stringify({path: path + "/" + name}),
});
let response = await fetchPromise;
if (!response.ok) err(`trashDirSrc(${path},${name},...)`, await response.text());
}
async listLibrarySnapshots(path) {
const response = await fetch(this.filesUrl + 'get_metadata',{method:'POST',headers:{Authorization:'Bearer ' + this.tokens.access_token,'Content-Type':'application/json'},body:JSON.stringify({path:path + '/library.sqlite'})});
if (response.status === 409) {
const result = await response.json();
if (result.error_summary?.startsWith('path/not_found')) return [];
throw new Error('Could not inspect Dropbox library');
}
if (!response.ok) throw new Error('Could not inspect Dropbox library');
const file = await response.json(); return [{id:file.id,token:file.rev,size:file.size}];
}
async readLibrarySnapshot(path,item) {
const response = await fetch(this.contentUrl + 'download',{method:'POST',headers:{Authorization:'Bearer ' + this.tokens.access_token,'Dropbox-API-Arg':JSON.stringify({path:'rev:' + item.token})}});
if (!response.ok) throw Object.assign(new Error('Dropbox version is no longer available'),{retrySync:response.status === 409});
return response.blob();
}
async publishLibrarySnapshot(path,file,expected) {
try { await this.putFileSrc(path,'library.sqlite',file,null,null,{expected:expected[0]?.token || null}); return true; }
catch (error) { if (error.retrySync) return false; throw error; }
}
async getFileSrc(path, name, dir, file) {
let url = this.contentUrl + "download";
let fetchPromise = await fetch(url, {
method: "POST",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
"Dropbox-API-Arg": dropboxApiArg({ path: file.id }),
},
});
let response = await fetchPromise;
if (!response.ok) err(`GetFileSrc(${path},${name},...)`, await response.text());
return await response.arrayBuffer();
}
async putFileSrc(path, name, data, dir, file, condition = null) {
let url = this.contentUrl + "upload_session/start";
let fetchPromise = await fetch(url, {
method: "POST",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
"Content-Type": "application/octet-stream",
},
});
let response = await fetchPromise;
if (!response.ok) err(`putFileSrc(${path},${name},...)`, await response.text());
let session_id = (await response.json()).session_id;
let bytes = data instanceof Blob ? { byteLength: data.size, subarray: (start, end) => data.slice(start, end) }
: data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
let maxSliceLen = 5 * 1024 * 1024;
let remaining = bytes.byteLength;
let sliceLen = Math.min(remaining, maxSliceLen);
url = this.contentUrl + "upload_session/append_v2";
let cursor = 0;
while (remaining > sliceLen) {
fetchPromise = await fetch(url, {
method: "POST",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
"Content-Type": "application/octet-stream",
"Dropbox-API-Arg": dropboxApiArg({cursor: {offset:cursor, session_id:session_id}}),
},
body: bytes.subarray(cursor, cursor + sliceLen),
});
response = await fetchPromise;
if (!response.ok) err(`putFileSrc(${path},${name},...)`, await response.text());
remaining -= sliceLen;
cursor += sliceLen;
sliceLen = Math.min(remaining, maxSliceLen);
}
url = this.contentUrl + "upload_session/finish";
fetchPromise = await fetch(url, {
method: "POST",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
"Content-Type": "application/octet-stream",
"Dropbox-API-Arg": dropboxApiArg({
commit: {
mode: condition ? (condition.expected ? {".tag":"update",update:condition.expected} : {".tag":"add"}) : "overwrite",
...(condition ? {autorename:false,strict_conflict:true} : {}),
path: path + "/" + name,
},
cursor: {
offset: cursor,
session_id: session_id,
},
}),
},
body: bytes.subarray(cursor, cursor + sliceLen),
});
response = await fetchPromise;
if (condition && response.status === 409) throw Object.assign(new Error("Dropbox library changed"),{retrySync:true});
if (!response.ok) err(`putFileSrc(${path},${name},...)`, await response.text());
}
async renameFileSrc(path, name, newName, srcDir, srcFile) {
let uri = this.filesUrl + "move_v2";
let fetchPromise = await fetch(uri, {
method: "POST",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
"Content-Type": "application/json",
},
body: JSON.stringify({ from_path: `${path}/${name}`, to_path: `${path}/${newName}` }),
});
let response = await fetchPromise;
if (!response.ok) err(`renameFileSrc(${path},${name},${newName})`, await response.text());
}
async trashFileSrc(path, name, dir, file) {
let url = this.filesUrl + "delete_v2";
let fetchPromise = await fetch(url, {
method: "POST",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
"Content-Type": "application/json",
},
body: JSON.stringify({ path: `${path}/${name}` }),
});
let response = await fetchPromise;
if (!response.ok) err(`trashFileSrc(${path},${name},...)`, await response.text());
}
}
class ODriveSrc extends CachedSrc {
source = Score.sources.odrive;
clientId = "b81faf82-539b-4759-bcc9-8fdac6c7ceba";
authUrl = "https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize";
tokenUrl = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";
scopes = "Files.ReadWrite.All offline_access";
filesUrl = "https://graph.microsoft.com/v1.0/me/drive/";
constructor() {
super();
this.tokens = null;
}
putCache(path, data) {
super.putCache(path, data);
let cache = this.cache;
for(let obj of data) {
if (obj.folder) {
let subPath = pathJoin(path, obj.name);
cache[subPath] = {
isDir: true,
name: obj.name,
id: obj.id,
created: Date.parse(obj.createdDateTime),
modified: Date.parse(obj.lastModifiedDateTime),
ts: 0,
dirs: {},
files: {},
};
cache[path].dirs[obj.name] = cache[subPath];
} else
cache[path].files[obj.name] = {
isDir: false,
name: obj.name,
id: obj.id,
created: Date.parse(obj.createdDateTime),
modified: Date.parse(obj.lastModifiedDateTime),
size: obj.size,
};
};
return cache[path];
}
async getDirSrc(path, dir) {
let url = this.filesUrl + `${path == "" ? "root" : "items/" + dir.id}/children`;
let entries = [];
while (url) {
let response = await fetch(url, {
method: "GET",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
},
});
if (!response.ok) err(`getDirSrc(${path},${dir}) failed: ${await response.text()}`);
let json = await response.json();
entries.push(...json.value);
url = json["@odata.nextLink"];
}
return entries;
}
async putDirSrc(path, name, srcDir) {
let url = this.filesUrl + (srcDir.id == "root" ? "root" : "items/" + srcDir.id) + "/children";
let fetchPromise = await fetch(url, {
method: "POST",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
"Content-Type": "application/json",
},
body: JSON.stringify({
name: name,
folder: {},
"@microsoft.graph.conflictBehavior": "fail",
}),
});
let response = await fetchPromise;
if (!response.ok) err(`putDirSrc(${path},${name},...) failed: ${await response.text()}`);
}
async renameDirSrc(path, name, newName, srcDir, srcSubDir) {
let url = this.filesUrl + "items/" + srcSubDir.id;
let fetchPromise = await fetch(url, {
method: "PATCH",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
"Content-Type": "application/json",
},
body: JSON.stringify({ name: newName }),
});
let response = await fetchPromise;
if (!response.ok) err(`renameDirSrc(${path},${name},${newName},...) failed: ${await response.text()}`);
}
async trashDirSrc(path, name, parentDir, dir) {
let url = this.filesUrl + "items/" + dir.id;
let fetchPromise = await fetch(url, {
method: "DELETE",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
},
});
let response = await fetchPromise;
if (!response.ok) err(`trashDirSrc(${path},${name},...) failed: ${await response.text()}`);
}
async listLibrarySnapshots(path) {
const dir = await this.getDir(path,true), parent = dir.id === 'root' ? 'root' : 'items/' + dir.id;
const response = await fetch(this.filesUrl + parent + ':/library.sqlite',{headers:{Authorization:'Bearer ' + this.tokens.access_token}});
if (response.status === 404) return [];
if (!response.ok) throw new Error('Could not inspect OneDrive library');
const file = await response.json(); return [{id:file.id,token:file.eTag,size:file.size}];
}
async readLibrarySnapshot(path,item) {
const bytes = await this.getFileSrc(path,'library.sqlite',null,item);
const current = await this.listLibrarySnapshots(path);
if (current[0]?.token !== item.token || current[0]?.id !== item.id) throw Object.assign(new Error('OneDrive library changed while reading'),{retrySync:true});
return new Blob([bytes]);
}
async publishLibrarySnapshot(path,file,expected) {
const dir = await this.getDir(path,true), previous = expected[0], parent = dir.id === 'root' ? 'root' : 'items/' + dir.id;
const headers = {Authorization:'Bearer ' + this.tokens.access_token,'Content-Type':'application/json'};
const response = await fetch(this.filesUrl + parent + ':/library.sqlite:/createUploadSession',{method:'POST',headers,body:JSON.stringify({deferCommit:true,item:{name:'library.sqlite','@microsoft.graph.conflictBehavior':previous ? 'replace' : 'fail'}})});
if (response.status === 409 || response.status === 412) return false;
if (!response.ok) throw new Error('Could not start OneDrive library upload');
const uploadUrl = (await response.json()).uploadUrl;
try {
const chunkSize = 5 * 1024 * 1024;
for (let offset = 0; offset < file.size; offset += chunkSize) {
const end = Math.min(offset + chunkSize,file.size);
const chunk = await fetch(uploadUrl,{method:'PUT',headers:{'Content-Range':`bytes ${offset}-${end-1}/${file.size}`},body:file.slice(offset,end)});
if (!chunk.ok) throw new Error('OneDrive library chunk upload failed');
}
const committed = await fetch(this.filesUrl + parent,{method:'PUT',headers:{...headers,...(previous ? {'If-Match':previous.token} : {})},body:JSON.stringify({name:'library.sqlite','@microsoft.graph.conflictBehavior':previous ? 'replace' : 'fail','@microsoft.graph.sourceUrl':uploadUrl})});
if (committed.status === 409 || committed.status === 412) return false;
if (!committed.ok) throw new Error('OneDrive library commit failed: HTTP ' + committed.status);
return true;
} finally { await fetch(uploadUrl,{method:'DELETE'}).catch(() => {}); }
}
async getFileSrc(path, name, dir, file) {
let url = this.filesUrl + "items/" + file.id + "/content";
let fetchPromise = await fetch(url, {
method: "GET",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
},
});
let response = await fetchPromise;
if (response.ok) return await response.arrayBuffer();
err(`getFileSrc(${path},${name},...) failed: ${await response.text()}`);
}
async putFileSrc(path, name, data, dir, file) {
let url = file?.id
? this.filesUrl + "items/" + file.id + "/createUploadSession"
: this.filesUrl + (dir.id === "root" ? "root" : "items/" + dir.id) + ":/" + encodeURIComponent(name) + ":/createUploadSession";
let fetchPromise = await fetch(url, {
method: "POST",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
"Content-Type": "application/json",
},
body: JSON.stringify({"name": name, "item":{"@microsoft.graph.conflictBehavior":"replace"}}),
});
let response = await fetchPromise;
if (!response.ok) err(`putFileSrc(${path},${name},...)`, await response.text());
let uploadUrl = (await response.json()).uploadUrl;
let bytes = data instanceof Blob ? { byteLength: data.size, subarray: (start, end) => data.slice(start, end) }
: data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
let maxSliceLen = 5 * 1024 * 1024;
let dataLen = bytes.byteLength;
let remaining = dataLen;
let sliceLen = Math.min(remaining, maxSliceLen);
for (let cursor = 0; remaining > 0; ) {
let slice = bytes.subarray(cursor, cursor + sliceLen);
let fetchPromise = await fetch(uploadUrl, {
method: "PUT",
headers: {
"Content-Length": sliceLen,
"Content-Range": `bytes ${cursor}-${cursor + sliceLen - 1}/${dataLen}`,
"Content-Type": data instanceof Blob && data.type || scoreFileMimeType(name),
},
body: slice,
});
let response = await fetchPromise;
if (!response.ok) err(`putFileSrc(${path},${name},...) failed: ${await response.text()}`);
remaining -= sliceLen;
cursor += sliceLen;
sliceLen = Math.min(remaining, maxSliceLen);
}
}
async renameFileSrc(path, name, newName, srcDir, srcFile) {
let url = this.filesUrl + "items/" + srcFile.id;
let fetchPromise = await fetch(url, {
method: "PATCH",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
"Content-Type": "application/json",
},
body: JSON.stringify({ name: newName }),
});
let response = await fetchPromise;
if (!response.ok) err(`renameFileSrc(${path},${name},${newName},...) failed: ${await response.text()}`);
}
async trashFileSrc(path, name, dir, file) {
let url = this.filesUrl + "items/" + file.id;
let fetchPromise = await fetch(url, {
method: "DELETE",
headers: {
Authorization: "Bearer " + this.tokens.access_token,
},
});
let response = await fetchPromise;
if (!response.ok) err(`trashFileSrc(${path},${name},...) failed: ${await response.text()}`);
}
}
const PCLOUD_CLIENT_ID = "W569fmzwKBQ";
const PCLOUD_API_HOSTS = new Set(["api.pcloud.com", "eapi.pcloud.com"]);
function stylePCloudDialog(elm) {
elm.style.fontSize = "clamp(14px, 2vmin, 20px)";
elm.style.width = "min(28em, calc(100vw - 3em))";
elm.style.maxHeight = "calc(100vh - 3em)";
elm.style.overflowX = "hidden";
}
class PCloudOAuthAuth {
apiHost = null;
accessToken = null;
sessionRestored = false;
contentAccess = "link";
static get available() {
return Boolean(window.chrome && chrome.runtime?.id && chrome.identity?.launchWebAuthFlow);
}
async restoreSession() {
if (this.sessionRestored || !PCloudOAuthAuth.available) return;
this.sessionRestored = true;
let saved = (await chrome.storage.session.get("pcloud-oauth"))["pcloud-oauth"];
if (saved?.accessToken && PCLOUD_API_HOSTS.has(saved.apiHost)) {
this.accessToken = saved.accessToken;
this.apiHost = saved.apiHost;
}
}
async authenticate() {
if (!(window.chrome && chrome.runtime?.id && chrome.identity?.launchWebAuthFlow))
throw new Error("pCloud OAuth is available only in the Rostrum browser extension.");
await this.restoreSession();
if (this.accessToken && this.apiHost) return;
if (this.backgroundAuth) throw Object.assign(new Error('Connect to pCloud with Sync library now to continue.'), { name:'AuthRequiredError' });
let redirectUri = chrome.identity.getRedirectURL();
let state = getPlainChallenge();
let authorizeUrl = new URL("https://my.pcloud.com/oauth2/authorize");
authorizeUrl.searchParams.set("client_id", PCLOUD_CLIENT_ID);
authorizeUrl.searchParams.set("response_type", "token");
authorizeUrl.searchParams.set("redirect_uri", redirectUri);
authorizeUrl.searchParams.set("state", state);
let responseUrl = await chrome.identity.launchWebAuthFlow({
url: authorizeUrl.href,
interactive: true,
});
if (!responseUrl || !responseUrl.startsWith(redirectUri))
throw new Error("pCloud OAuth returned an invalid redirect URI.");
let response = new URL(responseUrl);
let params = new URLSearchParams(response.hash.slice(1));
if (params.get("state") !== state)
throw new Error("pCloud OAuth state validation failed.");
let accessToken = params.get("access_token");
let apiHost = params.get("hostname");
if (!accessToken || !PCLOUD_API_HOSTS.has(apiHost))
throw new Error(params.get("error_description") || params.get("error") ||
"pCloud OAuth returned no access token or API host.");
this.accessToken = accessToken;
this.apiHost = apiHost;
await chrome.storage.session.set({
"pcloud-oauth": { accessToken, apiHost },
});
}
async requestAuth() {
await this.authenticate();
return {
apiHost: this.apiHost,
params: {},
headers: { Authorization: `Bearer ${this.accessToken}` },
};
}
async forget() {
this.apiHost = this.accessToken = null;
await chrome.storage.session.remove("pcloud-oauth");
}
}
function idbRequest(request) {
return new Promise((resolve, reject) => {
request.onsuccess = () => resolve(request.result);
request.onerror = () => reject(request.error);
});
}
class ExtensionPasswordStore {
expiry = "until Chrome exits";
async get() {
return (await chrome.storage.session.get("pcloud-password"))["pcloud-password"] || null;
}
async set(password) {
await chrome.storage.session.set({ "pcloud-password": password });
}
async clear() {
await chrome.storage.session.remove("pcloud-password");
}
}
class WebPasswordStore {
static dbName = "rostrum-pcloud";
static storeName = "session-keys";
static itemName = "pcloud-password";
static keyLifetime = 24 * 60 * 60 * 1000;
expiry = "until this tab is closed";
async withStore(mode, run) {
let open = indexedDB.open(WebPasswordStore.dbName, 1);
open.onupgradeneeded = () => open.result.createObjectStore(WebPasswordStore.storeName);
let db = await idbRequest(open);
try {
return await run(db.transaction(WebPasswordStore.storeName, mode).objectStore(WebPasswordStore.storeName));
} finally {
db.close();
}
}
async sweep() {
await this.withStore("readwrite", async store => {
for (let id of await idbRequest(store.getAllKeys())) {
let record = await idbRequest(store.get(id));
if (!record || Date.now() - record.created > WebPasswordStore.keyLifetime)
await idbRequest(store.delete(id));
}
});
}
async get() {
let saved = sessionStorage.getItem(WebPasswordStore.itemName);
if (!saved) {
await this.sweep();
return null;
}
let { id, iv, data } = JSON.parse(saved);
let record = await this.withStore("readonly", store => idbRequest(store.get(id)));
if (!record) {
sessionStorage.removeItem(WebPasswordStore.itemName);
return null;
}
try {
let plain = await crypto.subtle.decrypt(
{ name: "AES-GCM", iv: Uint8Array.from(iv) }, record.key, Uint8Array.from(data));
return new TextDecoder().decode(plain);
} catch (_error) {
await this.clear();
return null;
}
}
async set(password) {
await this.clear();
let key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
let iv = crypto.getRandomValues(new Uint8Array(12));
let data = new Uint8Array(await crypto.subtle.encrypt(
{ name: "AES-GCM", iv }, key, new TextEncoder().encode(password)));
let id = crypto.randomUUID();
await this.withStore("readwrite", store => idbRequest(store.put({ key, created: Date.now() }, id)));
sessionStorage.setItem(WebPasswordStore.itemName,
JSON.stringify({ id, iv: [...iv], data: [...data] }));
}
async clear() {
let saved = sessionStorage.getItem(WebPasswordStore.itemName);
sessionStorage.removeItem(WebPasswordStore.itemName);
if (!saved) return;
let { id } = JSON.parse(saved);
await this.withStore("readwrite", store => idbRequest(store.delete(id)));
}
}
class PCloudDirectAuth {
apiHost = localStorage.getItem("pcloud-api-host") || "api.pcloud.com";
email = null;
password = null;
sessionRestored = false;
contentAccess = "zip";
store = window.chrome && chrome.runtime?.id && chrome.storage?.session
? new ExtensionPasswordStore() : new WebPasswordStore();
static digestMargin = 10000;
digest = null;
librarySession = null;
async requestLibrarySession() {
await this.authenticate();
const {apiHost,email,password} = this;
if (!PCLOUD_API_HOSTS.has(apiHost)) throw new Error("Invalid pCloud API host.");
if (this.librarySession?.apiHost === apiHost && this.librarySession.expires > Date.now()) return this.librarySession.request;
const lifetime = 900;
const response = await fetch(`https://${apiHost}/login`, {
method:"POST", credentials:"omit", redirect:"error", referrerPolicy:"no-referrer",
body:new URLSearchParams({getauth:"1",logout:"1",username:email,password,
device:"Rostrum library",deviceid:crypto.randomUUID(),os:"4",
authexpire:String(lifetime),authinactiveexpire:String(lifetime)}),
});
const payload = await response.json();
if (!response.ok || payload.result !== 0 || typeof payload.auth !== "string" || !payload.auth) throw new Error("pCloud did not issue a session for library cleanup.");
if (this.apiHost !== apiHost || this.email !== email || this.password !== password) throw new Error("pCloud sign-in changed.");
const request = {apiHost,params:{auth:payload.auth},headers:{}};
this.librarySession = {apiHost,request,expires:Date.now() + (lifetime - 60) * 1000};
return request;
}
async sha1Hex(value) {
let bytes = typeof value == "string" ? new TextEncoder().encode(value) : value;
let digest = new Uint8Array(await crypto.subtle.digest("SHA-1", bytes));
return Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("");
}
async currentDigest() {
if (this.digest?.apiHost == this.apiHost &&
this.digest.expires - Date.now() > PCloudDirectAuth.digestMargin)
return this.digest.value;
let response = await fetch(`https://${this.apiHost}/getdigest`, { referrerPolicy: "no-referrer" });
let payload = await response.json();
if (!response.ok || payload.result !== 0 || !payload.digest)
srcErr(`pCloud getdigest failed: ${payload.error || response.status}`);
let expires = Date.parse(payload.expires);
this.digest = {
apiHost: this.apiHost,
value: payload.digest,
expires: Number.isFinite(expires) ? expires : Date.now(),
};
return payload.digest;
}
async authenticate() {
if (!this.sessionRestored) {
this.sessionRestored = true;
this.email = localStorage.getItem("pcloud-email") || null;
this.password = await this.store.get();
}
if (this.email && this.password) return;
if (this.backgroundAuth) throw Object.assign(new Error('Connect to pCloud with Sync library now to continue.'), { name:'AuthRequiredError' });
return new Promise((resolve, reject) => {
let elm = dialog(
`Connect to pCloud<br><br>
<select data-tag="region" class="dialog__textInput">
<option value="api.pcloud.com">United States</option>
<option value="eapi.pcloud.com">Europe</option>
</select><br><br>
<input is="pod-input" type="email" autocomplete="username" class="dialog__textInput" data-tag="email" placeholder="pCloud email"><br><br>
<input is="pod-input" type="password" autocomplete="current-password" class="dialog__textInput" data-tag="password" placeholder="pCloud password"><br><br>
<label><input type="checkbox" data-tag="remember" checked>
Remember password ${this.store.expiry}</label><br><br>
<small>The email address is remembered on this device. The password is kept in memory only, encrypted with a key that cannot be read back out.</small>`,
{ Connect: { svg: "pCloud" }, Cancel: { svg: "Cancel" } },
async (_event, _prop, tag, args) => {
if (tag == "Cancel") {
args.close();
return reject(new Error("pCloud login cancelled.", { cause: "cancelled" }));
}
let inputs = dataIndex("tag", args.elm);
let email = inputs.email.value.trim().toLowerCase();
let password = inputs.password.value;
let apiHost = inputs.region.value;
if (!email || !password || !PCLOUD_API_HOSTS.has(apiHost)) return;
inputs.password.value = "";
this.email = email;
this.password = password;
this.apiHost = apiHost;
localStorage.setItem("pcloud-api-host", apiHost);
localStorage.setItem("pcloud-email", email);
if (inputs.remember.checked) await this.store.set(password);
else await this.store.clear();
args.close();
resolve();
}
);
stylePCloudDialog(elm);
let inputs = dataIndex("tag", elm);
inputs.region.value = this.apiHost;
inputs.email.value = this.email || "";
elm.addEventListener("cancel", () => reject(new Error("pCloud login cancelled.", { cause: "cancelled" })), { once: true });
setTimeout(() => dataIndex("tag", elm).email.focus(), 50);
});
}
async requestAuth() {
await this.authenticate();
let digest = await this.currentDigest();
let usernameHash = await this.sha1Hex(this.email);
let material = new TextEncoder().encode(this.password + usernameHash + digest);
return {
apiHost: this.apiHost,
params: {
username: this.email,
digest,
passworddigest: await this.sha1Hex(material),
},
headers: {},
};
}
async forget() {
this.email = this.password = null;
this.digest = null;
this.librarySession = null;
localStorage.removeItem("pcloud-email");
await this.store.clear();
}
}
class PCloudAuth {
oauth = new PCloudOAuthAuth();
direct = new PCloudDirectAuth();
active = null;
async authenticate() {
this.oauth.backgroundAuth = this.direct.backgroundAuth = !!this.backgroundAuth;
if (this.backgroundAuth && !this.active) {
for (const candidate of PCloudOAuthAuth.available ? [this.oauth,this.direct] : [this.direct]) {
try { await candidate.authenticate(); this.active = candidate; return; }
catch (error) { if (error.name !== 'AuthRequiredError') throw error; }
}
throw Object.assign(new Error('Connect to pCloud with Sync library now to continue.'), { name:'AuthRequiredError' });
}
if (this.active) return this.active.authenticate();
if (!PCloudOAuthAuth.available) {
this.active = this.direct;
return this.active.authenticate();
}
await this.oauth.restoreSession();
if (this.oauth.accessToken) {
this.active = this.oauth;
return;
}
return new Promise((resolve, reject) => {
let elm = dialog(
`Connect to pCloud<br><br>
<small>OAuth is recommended. Rostrum will not receive your pCloud password.</small>`,
{
"Sign in with pCloud": { svg: "pCloud" },
"Direct login": { svg: "pCloud" },
Cancel: { svg: "Cancel" },
},
async (_event, _prop, tag, args) => {
if (tag == "Cancel") {
args.close();
return reject(new Error("pCloud login cancelled.", { cause: "cancelled" }));
}
args.close();
this.active = tag == "Direct login" ? this.direct : this.oauth;
try {
await this.active.authenticate();
resolve();
} catch (error) {
this.active = null;
reject(error);
}
}
);
stylePCloudDialog(elm);
elm.addEventListener("cancel", () =>
reject(new Error("pCloud login cancelled.", { cause: "cancelled" })), { once: true });
});
}
async requestAuth() {
await this.authenticate();
return this.active.requestAuth();
}
async requestLibrarySession() {
await this.authenticate();
return this.active === this.direct ? this.direct.requestLibrarySession() : null;
}
get contentAccess() {
return this.active?.contentAccess;
}
async forget() {
this.active = null;
await Promise.all([
PCloudOAuthAuth.available ? this.oauth.forget() : null,
this.direct.forget(),
]);
}
}
function zipEndOfCentralDirectory(view) {
let limit = Math.max(0, view.byteLength - 22 - 0xffff);
for (let offset = view.byteLength - 22; offset >= limit; offset--)
if (view.getUint32(offset, true) === 0x06054b50) return offset;
srcErr("The pCloud archive has no end-of-central-directory record.");
}
async function unzipSingleEntry(archive) {
if (archive[0] !== 0x50 || archive[1] !== 0x4b)
srcErr(`pCloud returned ${archive.length} bytes without a zip signature.`);
let view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
let end = zipEndOfCentralDirectory(view);
if (!view.getUint16(end + 10, true)) srcErr("The pCloud archive is empty.");
let directory = view.getUint32(end + 16, true);
if (view.getUint32(directory, true) !== 0x02014b50)
srcErr("The pCloud archive's central directory is malformed.");
let method = view.getUint16(directory + 10, true);
let compressedSize = view.getUint32(directory + 20, true);
let local = view.getUint32(directory + 42, true);
if (compressedSize === 0xffffffff || local === 0xffffffff)
srcErr("The pCloud archive uses Zip64 fields Rostrum does not read.");
if (view.getUint32(local, true) !== 0x04034b50)
srcErr("The pCloud archive's local file header is malformed.");
if (method !== 0 && method !== 8)
srcErr(`The pCloud archive uses compression method ${method}, which Rostrum does not read.`);
let data = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
let stored = archive.subarray(data, data + compressedSize);
if (method === 0) {
return stored.slice().buffer;
}
let stream = new Blob([stored]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
return await new Response(stream).arrayBuffer();
}
class PCloudSrc extends CachedSrc {
source = Score.sources.pcloud;
constructor(authProvider = new PCloudAuth()) {
super();
this.authProvider = authProvider;
this.cache[""].id = 0;
}
async auth() {
this.authProvider.backgroundAuth = !!this.backgroundAuth;
await this.authProvider.authenticate();
}
async signed(method, params, options) {
let auth = options.auth || await this.authProvider.requestAuth();
let url = new URL(`https://${auth.apiHost}/${method}`);
for (let [name, value] of Object.entries({ ...params, ...auth.params }))
url.searchParams.set(name, String(value));
return [url, {
method: options.method || "GET",
headers: { ...auth.headers, ...(options.headers || {}) },
body: options.body,
referrerPolicy: "no-referrer",
}];
}
async request(method, params = {}, options = {}) {
let response = await fetch(...await this.signed(method, params, options));
let payload;
try { payload = await response.json(); }
catch (_error) { srcErr(`pCloud ${method} returned HTTP ${response.status}.`); }
if (!response.ok || payload.result !== 0)
srcErr(`pCloud ${method} failed: ${payload.error || response.status} (result ${payload.result ?? "n/a"}).`, {pcloudResult:payload.result});
return payload;
}
putCache(path, data) {
super.putCache(path, data);
for (let obj of data) {
if (obj.isfolder) {
let subPath = path + "/" + obj.name;
this.cache[subPath] = {
isDir: true, name: obj.name, id: obj.folderid,
created: Date.parse(obj.created), modified: Date.parse(obj.modified),
ts: 0, dirs: {}, files: {},
};
this.cache[path].dirs[obj.name] = this.cache[subPath];
} else {
this.cache[path].files[obj.name] = {
isDir: false, name: obj.name, id: obj.fileid,
created: Date.parse(obj.created), modified: Date.parse(obj.modified), size: obj.size, hash: obj.hash,
};
}
}
return this.cache[path];
}
async getDirSrc(_path, dir) {
return (await this.request("listfolder", { folderid: dir.id })).metadata.contents || [];
}
async putDirSrc(_path, name, srcDir) {
await this.request("createfolder", { folderid: srcDir.id, name });
srcDir.ts = 0;
}
async renameDirSrc(_path, _name, newName, srcDir, srcSubDir) {
await this.request("renamefolder", { folderid: srcSubDir.id, toname: newName });
srcDir.ts = 0;
}
async trashDirSrc(_path, _name, parentDir, dir) {
await this.request("deletefolder", { folderid: dir.id });
parentDir.ts = 0;
}
async requestBytes(method, params = {}, options = {}) {
let response = await fetch(...await this.signed(method, params, options));
if (!response.ok) srcErr(`pCloud ${method} returned HTTP ${response.status}.`);
let buffer = await response.arrayBuffer();
if ((response.headers.get("content-type") || "").includes("json")) {
let payload;
try { payload = JSON.parse(new TextDecoder().decode(buffer)); }
catch (_error) { srcErr(`pCloud ${method} returned unreadable data.`); }
srcErr(`pCloud ${method} failed: ${payload.error || response.status} (result ${payload.result ?? "n/a"}).`, {pcloudResult:payload.result});
}
return new Uint8Array(buffer);
}
async listLibrarySnapshots(path) {
const dir = await this.getDir(path,true);
return Object.values(dir.files).filter(file => file.name === 'library.sqlite' || isVersionedLibraryName(file.name))
.map(file => ({id:file.id,name:file.name,token:String(file.hash),size:file.size}));
}
async readLibrarySnapshot(path,item) {
try {
const bytes = await this.getFileSrc(path,item.name,null,item);
const {metadata} = await this.request('stat',{fileid:item.id});
if (String(metadata.hash) !== item.token || metadata.size !== item.size || bytes.byteLength !== item.size) {
throw Object.assign(new Error('pCloud library changed while reading'),{retrySync:true});
}
return new Blob([bytes]);
} catch (error) {
if (error.pcloudResult === 2009) error.retrySync = true;
throw error;
}
}
async publishLibrarySnapshot(path,file,expected,id) {
const dir = await this.getDir(path,true);
await this.putFileSrc(path,'library-' + id + '.sqlite',file,dir);
return true;
}
async removeLibrarySnapshot(path,item) {
try { await this.request('deletefile',{fileid:item.id}); }
catch (error) { if (error.pcloudResult !== 2009) throw error; }
}
async compactLibrarySnapshots(path,head) {
const versions = await this.listLibrarySnapshots(path);
const numbered = versions.filter(file => isVersionedLibraryName(file.name));
const version = numbered.find(file => file.id === head.id);
if (numbered.length !== 1 || !version || version.token !== head.token || version.size !== head.size) return;
let canonical = versions.find(file => file.name === 'library.sqlite');
if (!canonical) {
const dir = await this.getDir(path);
try {
const {metadata} = await this.copyLibrarySnapshot(dir.id,version.id);
canonical = {id:metadata.fileid,name:metadata.name,token:String(metadata.hash),size:metadata.size};
} catch (error) {
if (error.pcloudResult === 2004 || error.pcloudResult === 2009) return;
throw error;
}
}
if (canonical.token !== version.token || canonical.size !== version.size) return;
const copy = await this.readLibrarySnapshot(path,canonical);
if (await hashLibraryBytes(await copy.arrayBuffer()) !== await hashLibraryBytes(await head.file.arrayBuffer())) return;
await this.removeLibrarySnapshot(path,version);
}
async copyLibrarySnapshot(folderId,fileId) {
const params = {fileid:fileId,tofolderid:folderId,toname:'library.sqlite',noover:1};
try { return await this.request('copyfile',params); }
catch (error) {
if (![1000,7010].includes(error.pcloudResult)) throw error;
const auth = await this.authProvider.requestLibrarySession?.();
if (!auth) throw error;
return this.request('copyfile',params,{auth});
}
}
async getFileSrc(_path, _name, _dir, file) {
await this.authProvider.authenticate();
return this.authProvider.contentAccess == "zip"
? unzipSingleEntry(await this.requestBytes("getzip", { fileids: file.id }))
: await this.getFileFromContentHost(file);
}
async getFileFromContentHost(file) {
let link = await this.request("getfilelink", { fileid: file.id, contenttype: 'application/octet-stream' });
if (!link.hosts?.length || !link.path) srcErr("pCloud returned no download location.");
let response = await fetch(`https://${link.hosts[0]}${link.path}`, { referrerPolicy: "no-referrer" });
if (!response.ok) srcErr(`pCloud download failed with HTTP ${response.status}.`);
return await response.arrayBuffer();
}
async putFileSrc(_path, name, data, dir, _file) {
let form = new FormData();
form.append("file", new Blob([data], { type: data instanceof Blob && data.type || scoreFileMimeType(name) }), name);
await this.request("uploadfile", { folderid: dir.id, nopartial: 1 }, {
method: "POST",
body: form,
});
dir.ts = 0;
}
async renameFileSrc(_path, _name, newName, srcDir, srcFile) {
await this.request("renamefile", { fileid: srcFile.id, toname: newName });
srcDir.ts = 0;
}
async trashFileSrc(_path, _name, dir, file) {
await this.request("deletefile", { fileid: file.id });
dir.ts = 0;
}
}
class UrlSrc extends FileSrc {
source = Score.sources.url;
async getFile(path, name) {
if (window.fetchPdfFromUrl) {
await window.fetchPdfFromUrl(path);
throw { handled: true };
} else {
throw new Error("URL source is only available in the browser extension");
}
}
}
class LocalFileView {
static css = css(
"LocalFileView",
`
.Local {
display:flex;
flex-direction: column;
align-items:center;
}
.Local__line {
margin-top:2em;
}
`
);
constructor(panel) {
this.panel = panel;
this.mode = panel.mode;
this.source = Score.sources.local;
this.src = FileSrc.get("Local");
if (this.mode == "save") {
this.elm = helm(`
<div class="Local">
<div class="Local__line"> ${iconSvg("Save", { style: "width:3em;height:3em;" })}</div>
<div  class="Local__line"><b>Tap To Show Save File Picker</b></div>
</div>`);
listen(this.elm, "pointerup", async (e) => this.putFile());
return;
}
this.elm = helm(`
<div data-tag="local" class="Local" >
<div class="Local__line"> ${iconSvg("Open", { style: "width:3em;height:3em;" })}</div>
<div  class="Local__line"><b>Click to Show Open File Picker</b></div>
<div class="Local__line">${_mobile_ ? "" : "<b>&mdash; or &mdash;<b>"}</div>
<div class="Local__line">${_mobile_ ? "" : "<b>Drop Score File</b>"}</div>
</div>`);
Object.assign(this, dataIndex('tag', this.elm));
listen(this.local, 'dragover', e => e.preventDefault());
listen(this.local, 'click', () => this.showPicker());
listen(this.local, 'drop', async e => {
e.preventDefault();
try {
const item = e.dataTransfer.items[0];
const handle = item.getAsFileSystemHandle ? await item.getAsFileSystemHandle().catch(() => null) : null;
const file = handle?.kind === 'file' ? await handle.getFile() : item.getAsFile();
if (file) { file.handle = handle?.kind === 'file' ? handle : null; await this.openFile(file); }
} catch (error) { errDialog(error, 'Error opening dropped file.'); }
});
}
select() {}
async showPicker() {
try { await this.openFile(await this.src.pickFile(this.mode)); }
catch (error) { if (error.name !== 'AbortError') errDialog(error, 'Error opening local file.'); }
}
async openFile(file) {
await checkFileSize(file.name, file.size);
const visitUpdate = { size: file.size, created: 0, modified: file.lastModified };
if (this.mode === 'copy') {
await _menu_.setPasteObj(await bytesToBase64DataUrl(await file.arrayBuffer(), file.type), file.type);
Score.visit({ source: this.source, name: file.name, path: await this.src.remember(file) }, visitUpdate);
} else if (this.mode === 'merge') {
const data = await checkMergePdf(await file.arrayBuffer());
if (!data) return;
activateMerge(data);
} else {
if (!await checkUnsaved()) return;
const path = await this.src.remember(file);
const score = await new Score().init(this.source, path, file.name, await file.arrayBuffer());
score.fileHandle = file.handle || null;
Score.visit(score, visitUpdate);
toast('File opened');
this.panel.hide();
await FileSrc.offerLibraryImport(score,file);
return;
}
this.panel.hide();
}
async putFile() {
let score = _score_;
try {
_shade_.show("Saving file");
_shade_.onCancel = () => { throw new Error() };
const pendingData = score.toFile();
const { name, modified, fileHandle, path } = await this.src.putFile(null, score.saveName, pendingData);
const data = await pendingData;
score.fileHandle = fileHandle;
score.update({ source: this.source, name, path });
if (score.music) score.music.savedAsMscz = true;
Score.visit(score, { size: data.length, modified: modified });
score.setDirty(false);
toast("File saved");
} catch (error) {
if (error.originalData) {
dialog(`${escapeHtml(error.message)}<br><br>Save original PDF instead (without Rostrum modifications)?`,
{ Save: { svg: "Save" }, Cancel: { svg: "Cancel" } }, async (e, prop, tag, args) => {
args.close();
if (tag == "Save") {
try {
_shade_.show("Saving original file");
let data = error.originalData;
const { name, modified, fileHandle, path } = await this.src.putFile(null, score.name, data);
score.fileHandle = fileHandle;
score.update({ source: this.source, name, path });
Score.visit(score, { size: data.length, modified: modified });
score.setDirty(false);
toast("Original file saved");
} catch (err) {
errDialog(err, "Failed to save original file to local storage");
} finally {
_shade_.hide();
}
}
}
);
} else if (error.name != 'AbortError') {
errDialog(error, "Failed to save file to local storage");
}
} finally {
_shade_.hide();
this.panel.hide();
_shade_.onCancel = null;
}
}
}
class FileListView {
static css = css(
"FileListView",
`
.Flv {
position: absolute;
height:100%;
width:100%;
color: var(--color-text);
-webkit-mask-image: linear-gradient(to right, transparent, black .8em, black calc(100% - .8em), transparent);
mask-image: linear-gradient(to right, transparent, black .8em, black calc(100% - .8em), transparent);
}
.Flv:focus {
outline: none;
background-color: #fff;
}
.Flv-list {
position:relative;
top:0px;
display:flex;
flex-flow:column;
}
.Flv-list__frame {
position:relative;
overflow:hidden;
height: calc(100% - 6.5em);
-webkit-mask-image: linear-gradient(to bottom, transparent, black .8em, black calc(100% - .8em), transparent);
mask-image: linear-gradient(to bottom, transparent, black .8em, black calc(100% - .8em), transparent);
}
.Fsv-list__frame {
height: calc(100% - 10em);
}
.Flv-list__frame--save-mode {
height: calc(100% - 16em); /* frame in save mode: allows room for FlvSave */
}
.Flv-list__item-selected {
background: var(--panel-header-selected-bg) !important;
}
.Flv-list__file {
width: calc(100% - 2em);
font-size:1em;
margin:.5em;
padding:.5em;
border-radius: var(--borderRadius);
}
.Flv-list__file[aria-disabled="true"] {
opacity:.45;
filter:grayscale(1);
cursor:default;
}
.Flv-list__file-header {
display:flex;
align-items:center;
column-gap:.5em;
color: var(--color-text);
text-shadow: var(--file-text-shadow);
}
.Flv-list__file-details {
display:flex;
justify-content: space-between;
align-items:center;
color: var(--color-text);
text-shadow: var(--file-text-shadow);
}
.Flv-list__file-properties {
font-size:.75em;
color: var(--file-properties-color);
margin:.5em;
text-shadow: var(--file-text-shadow);
}
.Flv-path__sash {
display: flex;
position:relative;
width: max-content;
min-width: 100%;
height: 3em;
background-image: var(--panTexture);
margin-top: .5em;
}
.Flv-path {
position:relative;
width: max-content;
left:0px;
display:flex;
align-items:center;
column-gap:.5em;
font-size:1em;
margin-left:1em;
}
.Flv-path__dir {
display:flex;
align-items:center;
padding:.5em;
margin: 0 0.25em;
border-radius: var(--borderRadius);
color: var(--color-text);
text-shadow: var(--file-text-shadow);
}
/* file name input element */
.Flv-save__file
{ height: 2em;
position: relative;
width:100%;
font-size:1.5em;
border:none;
border-radius:var(--borderRadius);
text-align: center;
padding: 0em 4em 0em 1em;
margin:1em 2em 1em 2em;
outline:none;
}
}
`
);
iconsByExtension = { ".pdf": "Pdf", ".png": "Png", ".jpg": "Jpg" };
listOp = {
deltaY: 0,
didMove: false,
elm: null,
flingTimeout: null,
lowerBounds: 0,
moveListener: null,
offsetY: null,
schedule: new Schedule(),
target: null,
upListener: null,
};
elm = helm(`
<div class="Flv">
<div data-tag="flvList__frame" class="Flv-list__frame">
<div data-tag="flvList" class="Flv-list"></div>
</div>
</div>`);
keyBuf = "" ;
constructor(panel) {
this.panel = panel;
this.mode = panel.mode;
Object.assign(this, dataIndex("tag", this.elm));
panel.listeners.push(listen(this.elm, "pointerdown", this.onListDown.bind(this)));
delay(1, () => {
this.elm.tabIndex = 0 ;
this.elm.focus({preventScroll:true}) ;
let l1 = listen(this.elm, "keydown", this.onKeyDown.bind(this)) ;
let l2 = listen(this.elm, "wheel", (e) => {
this.flvList.style.top =
clamp(this.flvList.offsetTop + e.deltaY, this.flvList__frame.offsetHeight - this.flvList.offsetHeight, 0) + "px";}) ;
panel.listeners.push(l1, l2) ;
});
}
extensionRegex = /(?:\.([^.]+))?$/;
mimeTypes = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };
acceptExt(name) {
let ext = this.extensionRegex.exec(name)[1];
if (ext) {
ext = ext.toLowerCase();
let exts = this.mode == "copy" ? { jpeg: 1, jpg: 1, png: 1 } : this.mode === 'merge' ? { pdf: 1 } : { pdf: 1, mscz: 1, mxl: 1, musicxml: 1, xml: 1 };
if (exts[ext]) return ext;
}
return null;
}
async checkExt(name, ext = ".pdf") {
if (this.mode === 'save' && _score_?.music) return name.replace(/\.(mscz|mxl|musicxml|xml|pdf)$/i, '') + '.mscz';
checkPath(name);
if (name.toLowerCase().endsWith(ext)) return name;
return new Promise((accept, reject) => {
dialog(`Add extension <i>.pdf</i> to <i translate="no">${escapeHtml(name)}</i> ?`, { Yes: { svg: "Pdf" }, No: { svg: "Not Pdf" }, Cancel: { svg: "Cancel" } }, async (e, prop, tag, args) => {
args.close();
if (tag == "Yes") accept(name + ext);
else if (tag == "No") accept(name);
else accept(null);
});
});
}
async select() {
const epoch = this.selectEpoch = (this.selectEpoch || 0) + 1;
clearChildren(this.flvList);
const items = await Promise.all(JSON.parse(localStorage.getItem('recent') || '[]')
.filter(obj => this.acceptExt(obj.name)).map(obj => this.makeFileElm(obj)));
if (this.selectEpoch === epoch) this.flvList.append(...items);
}
refresh() {}
enterDialog(tag, dialog) {
let input = dataIndex("tag", dialog).input;
listen(input, "keyup", (e) => {
if (e.key == "Enter") dialog.buttonsElm.self.fire(tag);
});
};
async makeFileElm(properties) {
let name = properties.name;
let path = properties.path;
checkPath(name, path);
let isDir = properties.isDir ?? false;
let source = properties.source || FileSrc.get(this.src) || "?";
let size = properties.size || null;
let created = properties.created ? new Date(properties.created).toLocaleString() : null;
let modified = properties.modified ? new Date(properties.modified).toLocaleString() : null;
let iconName = isDir ? "Folder" : (this.iconsByExtension[name.slice(name.lastIndexOf(".")).toLowerCase()] || "File");
let color = this.colorFromText(name);
let elm = helm(`
<div ${isDir ? "data-dir='true'":""} data-name="${escapeHtml(name)}" data-path="${escapeHtml(path)}" data-source="${escapeHtml(source)}" class="Flv-list__file">
<div class="Flv-list__file-header" translate="no">
${iconSvg(iconName, {style: "width:3.5em;height:2.5em" })}
${escapeHtml(name)}
</div>
<div class="Flv-list__file-details">
<div class="Flv-list__file-properties">
Source: ${noTranslate(escapeHtml(source))}<br>
${source == "Local" ? "" : "Path: " + noTranslate(escapeHtml(path) || "/") + "<br>"}
${size ? "Size: "+ noTranslate(Number(size).toLocaleString()) + "<br>" : ""}
${created ? "Created: "+ noTranslate(created) + "<br>" : ""}
${modified ? "Modified: "+ noTranslate(modified) + "<br>" : ""}
</div>
<div>
${source == "Local" ? "" : this.mode == "copy" ? "" : iconSvg("Pencil", {tag: "rename", size: "2.75em", style: "padding:.5em;"})}
${source == "Local" ? "" : this.mode == "copy" ? "" : iconSvg("Trash", {tag: "trash", size: "3em", style: "padding:.5em;"})} </div>
</div>
</div>`);
elm.style.background = color;
if (!isDir && source === Score.sources.local && !await FileSrc.get(source).getHandle(path)) {
elm.setAttribute('aria-disabled', 'true');
elm.title = 'No reusable file access. Open this file again from Local.';
}
return elm;
}
colorFromText(text) {
let hex = strToHash(text).toString(16);
let r = parseInt(hex.substring(0, 2), 16);
let g = parseInt(hex.substring(2, 4), 16);
let b = parseInt(hex.substring(4, 6), 16);
r = Math.round(r / 3 + 170);
g = Math.round(g / 3 + 170);
b = Math.round(b / 3 + 170);
return "#" + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
}
keyState = { keys: "",
fileElm: null,
span: null,
txt: null
} ;
markSelected(fileElm) {
if(this.keyState.span)
this.keyState.span.replaceWith(this.keyState.txt) ;
if(!fileElm) {
this.keyState.keys = "" ;
this.keyState.fileElm = this.keyState.span = this.keyState.txt = null ;
return ;
}
this.keyState.fileElm = fileElm ;
let txt = fileElm.querySelector(".Flv-list__file-header")?.querySelector("svg")?.nextSibling ;
if(txt) {
this.keyState.txt = txt;
let tc = txt.textContent ;
let re = new RegExp(this.keyState.keys.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");
let m = tc.match(re) ;
let marked = m
? escapeHtml(tc.slice(0, m.index)) + `<mark>${escapeHtml(m[0])}</mark>` + escapeHtml(tc.slice(m.index + m[0].length))
: escapeHtml(tc) ;
this.keyState.span = helm(`<span>${marked}</span>`) ;
txt.replaceWith(this.keyState.span) ;
}
}
onKeyDown(e) {
let frame = this.flvList.parentElement ;
let sash = this.flvList ;
let sashTop = null ;
switch(e.key) {
case "Home": sashTop = "0" ; break ;
case "End": sashTop = frame.offsetHeight - sash.offsetHeight ; break;
case "ArrowDown":
sashTop = sash.children[0].offsetHeight + sash.offsetTop ; break ;
case "ArrowUp":
sashTop = -sash.children[0].offsetHeight + sash.offsetTop ; break ;
case "ArrowLeft":
if(this.constructor.name != "FileSystemView") return ;
let pathLen = this.fsvPath.children.length ;
if(pathLen > 2) {
let target = this.fsvPath.children[pathLen - 3] ;
this.setPath(target.dataset.path);
}
return ;
case "Enter":
if(this.keyState.fileElm) {
if (this.keyState.fileElm.getAttribute('aria-disabled') === 'true') return;
let { source, name, path, dir } = this.keyState.fileElm.dataset;
if (dir && path !=null && name) this.getDir(path, name);
else if(source && path !=null && name) this.getFile(source, path, name) ;
this.markSelected(null) ;
}
return ;
case "Backspace":
case "Delete":
this.keyState.keys = this.keyState.keys.slice(0,-1) ;
default:
let isNormal = /^[a-zA-Z0-9 .]$/.test(e.key) ;
if(isNormal) this.keyState.keys += e.key;
let names = {};
Array.from(sash.children).filter(child => child.getAttribute('aria-disabled') !== 'true')
.forEach((child) => names[child.dataset.name] = child) ;
let match = Object.keys(names).find((str) => { return new RegExp(this.keyState.keys.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i").test(str);}) ;
if(match) {
let fileElm = names[match] ;
sashTop =  frame.offsetHeight / 2 - fileElm.offsetTop - fileElm.offsetHeight / 2 ;
this.markSelected(this.keyState.keys.length > 0 ? fileElm:null) ;
}
else {
if(isNormal) this.keyState.keys = this.keyState.keys.slice(0,-1) ;
}
}
if(sashTop != null) sash.style.top = clamp(sashTop, frame.offsetHeight - sash.offsetHeight, 0) + "px" ;
}
onListDown(e) {
e.taken = true;
this.elm.focus({ preventScroll: true}) ;
let elm = this.flvList;
elm.style.transition = "unset";
let origin = elm.offsetTop;
let minTop = this.flvList__frame.offsetHeight - elm.offsetHeight;
if (this.panel.mode == "save") minTop -= this.fsvSave.offsetHeight;
elm.setPointerCapture(e.pointerId);
let drag = new Drag(e);
let mv = listen(elm, "pointermove", (emv) => {
drag.mv(emv) ;
if (drag.moved) elm.style.top = clamp(origin + emv.clientY - e.clientY, minTop, 0) + "px";
});
listen(
elm,
"pointerup",
async (eup) => {
drag.up(eup);
unlisten(mv);
if (drag.moved) {
elm.style.transition = "1000ms top ease-out";
return (elm.style.top = clamp(elm.offsetTop + drag.vY * 1000, minTop, 0) + "px");
}
let fileElm = e.target.closest(".Flv-list__file");
if (!fileElm) return;
if (fileElm.getAttribute('aria-disabled') === 'true') return;
fileElm.classList.add("Flv-list__item-selected");
let { source, name, path, dir } = fileElm.dataset;
let tag = e.target.dataset.tag;
if (tag == "trash") dir ? this.trashDir(path, name) : this.trashFile(source, path, name);
else if (tag == "rename") dir ? await this.renameDir(path, name) : await this.renameFile(source, path, name);
else if (dir) await this.getDir(path, name);
else if (this.panel.mode == "save") this.fsvSave__file.value = name;
else await this.getFile(source, path, name);
fileElm.classList.remove("Flv-list__item-selected");
},
{ once: true }
);
}
async getFile(source, requestedPath, requestedName) {
if(this.mode != "copy" && this.mode != "merge" && !await checkUnsaved())
return;
_shade_.show("Downloading file");
return new Promise(async (accept, reject) => {
try {
let src = FileSrc.get(source);
let { path, name, data, size, created, modified, fileHandle } = await src.getFile(requestedPath, requestedName, this.panel.mode);
let visitUpdate = { path, size, created, modified };
if (this.panel.mode == "copy") {
let ext = this.acceptExt(requestedName);
if (ext) {
_menu_.setPasteObj(await bytesToBase64DataUrl(data, this.mimeTypes[ext]), this.mimeTypes[ext]);
Score.visit({ source, name, path }, visitUpdate);
toast("File downloaded");
}
} else if (this.panel.mode == "merge") {
let checked = await checkMergePdf(data);
if (checked) {
Score.visit({ source, name, path }, visitUpdate);
activateMerge(checked);
}
} else {
const file = new File([data],name);
let score = await new Score().init(source, path, name, data);
if (fileHandle) score.fileHandle = fileHandle;
Score.visit(score, visitUpdate);
toast("File downloaded");
_shade_.hide();
this.panel.hide();
await FileSrc.offerLibraryImport(score,file);
}
} catch (error) {
if (!error.handled) errDialog(error, source === Score.sources.local ? 'Error opening local Recent file.' : 'Error: failed to download file from cloud server.');
} finally {
_shade_.hide();
this.panel.hide();
accept();
}
});
}
async renameFile(source, path, name) {
checkPath(path, name);
_shade_.show("Renaming file");
return new Promise((accept, reject) => {
let dialogElm = dialog(
`Confirm. Rename File:<br><br>
<i translate="no">${escapeHtml(name)}</i><br>
<br>To:<br>
<input is="pod-input" type=text class="dialog__textInput" data-tag="input" value="${escapeHtml(name)}"></input>
<hr>`,
{ Rename: { svg: "Pencil" }, Cancel: { svg: "Cancel" } },
async (e, prop, tag, args) => {
try {
if (tag == "Cancel") return args.close();
let input = dataIndex("tag", args.elm).input;
let newName = input.value;
if (newName.length == 0) return dialog("Error: 0-length filename.");
newName = await this.checkExt(newName);
if (!newName) return;
if (newName == name) return dialog("Name unchanged.");
args.close();
let src = FileSrc.get(source);
await src.renameFile(path, name, newName);
if (this.setPath) {
await this.setPath(path, true);
let cached = src.cache[path];
Score.visit({ source, path, name, size: cached.size, created: cached.created, modified: cached.modified }, { name: newName });
} else if (src.cache && src.cache[path]) {
let cached = src.cache[path];
Score.visit({ source, path, name, size: cached.size, created: cached.created, modified: cached.modified }, { name: newName });
src.cache[path.ts] = 0;
this.select();
}
toast("File renamed");
} catch (error) {
errDialog(error, "Error: failed to rename file on cloud server.");
} finally {
_shade_.hide();
accept();
}
}
);
let input = dataIndex("tag", dialogElm).input;
listen(input, "keyup", (e) => {
if (e.key == "Enter") dialogElm.buttonsElm.self.fire("Rename");
});
});
}
async trashFile(source, path, name) {
_shade_.show("Trashing file");
return new Promise((accept, reject) => {
dialog(`Confirm. Trash File:<br><br><i translate="no">${escapeHtml(name)}</i><hr>`, { Trash: { svg: "Trash" }, Cancel: { svg: "Close" } }, async (e, prop, tag, args) => {
try {
args.close();
if (tag == "Cancel") return;
let src = FileSrc.get(source);
await src.trashFile(path, name);
Score.visit({ source, path, name });
if (this.setPath) await this.setPath(path, true);
else this.select();
toast("File trashed");
} catch (error) {
errDialog(error, "Error: failed to trash file on cloud server.");
} finally {
_shade_.hide();
accept();
}
});
});
}
}
class FileSystemView extends FileListView {
src = null;
isSave = false;
path = "";
posForPath = {};
pathOp = {
elm: null,
target: null,
moveListener: null,
upListener: null,
offsetX: null,
deltaX: 0,
didMove: false,
leftBounds: 0,
};
elm = helm(`
<div data-tag="fsv" class="Flv">
<![CDATA[currently selected file path, left-to-right]]>
<div data-tag="fsvPath" class="Flv-path__sash"></div>
<![CDATA[text input for save filename (plus button), void for save panel]]>
<div data-tag="fsvSave" class="void" style="display:flex;width:100%";justify-content:center>
<input is="pod-input" type="text" data-tag="fsvSave__file" class="Flv-save__file"/>
<div data-tag="uploadButton"></div>
</div>
<![CDATA[list of files, top-to-bottom]]>
<div data-tag="flvList__frame" class="Flv-list__frame Fsv-list__frame">
<div data-tag="flvList" class="Flv-list"></div>
</div>
</div>`);
constructor(source, src, panel) {
super(panel);
this.source = source;
this.src = src;
Object.assign(this, dataIndex("tag", this.elm));
listen(this.flvList, "pointerdown", this.onListDown.bind(this));
listen(this.fsvPath, "pointerdown", this.onPathDown.bind(this));
listen(this.fsvSave__file, "change", async () => await this.putFile(this.fsvSave__file.value));
}
select(tabView, tab) {
if (this.panel.mode == "save") {
if (!_score_) return;
this.fsvSave.classList.remove("void");
this.flvList__frame.classList.add("Flv-list__frame--save-mode");
this.fsvSave__file.value = _score_.saveName;
let uploadButton = new ButtonGroup({}, { Upload: { svg: "Upload" } }, async () => await this.putFile(this.fsvSave__file.value));
uploadButton.elm.style = "position:absolute;right:4em;top:4.5em;";
this.uploadButton.replaceWith(uploadButton.elm);
} else {
this.fsvSave.classList.add("void");
this.flvList__frame.classList.remove("Flv-list__frame--save-mode");
}
let storedPath = localStorage.getItem(this.source) || "";
this.setPath(this.path ||
(_score_?.source == this.source ?
_score_?.path : null) || storedPath, true);
}
populateFsvPath() {
let elm = this.fsvPath;
clearChildren(elm);
let dirs = this.path.split("/");
let dirElm = null;
let path = "";
dirs.forEach((dir) => {
let icon = "Folder";
let background = this.colorFromText(dir);
if (dir == "") {
background = "#fff0";
dir = icon = this.source;
} else path = path + "/" + dir;
dirElm = helm(
`<div dir-source="${escapeHtml(this.source)}" data-path="${escapeHtml(path)}" style="background:${background}" class="Flv-path__dir" translate="no">
${iconSvg(icon, { size: "1.5em" })}&nbsp${escapeHtml(dir)}&nbsp/</div>`
);
elm.append(dirElm);
});
if (true)
elm.append(
helm(
`<div data-tag="newDir" data-path="${escapeHtml(path)}" data-source="${escapeHtml(this.source)}" class="Flv-path__dir">
${iconSvg("New Folder", { style: "pointer-events:none;width:2em;padding-left:3em;" })}&nbspNew</div>`
)
);
elm.style.left = Math.min(getBox(elm.parentElement).width - getBox(elm).width, 0) + "px";
}
onPathDown(e) {
let drag = new Drag(e);
let elm = this.fsvPath;
let origin = elm.offsetLeft;
let minLeft = this.fsv.offsetWidth - elm.offsetWidth;
elm.setPointerCapture(e.pointerId);
let mv = listen(elm, "pointermove", (emv) => {
drag.mv(emv) ;
if(drag.moved) elm.style.left = clamp(origin + emv.clientX - e.clientX, minLeft, 0) + "px";
});
listen(elm, "pointerup", async (eup) => {
drag.up(eup) ;
unlisten(mv);
if (drag.jab) {
if(e.target.dataset.tag == "newDir") return await this.putDir(this.path);
let target = e.target.closest(".Flv-path__dir");
if (target) {
let refresh = target.dataset.path == this.path;
await this.setPath(target.dataset.path, refresh);
if (refresh) toast("Refreshed");
}
}
},
{ once: true });
}
async getDir(path, name) {
this.posForPath[this.path] = this.flvList.style.top;
this.path = pathJoin(this.path, name);
await this.setPath(this.path, false, true);
}
async putDir(path) {
_shade_.show("Creating folder");
return new Promise((accept, reject) => {
this.enterDialog(
"Create",
dialog(
`Confirm. Create New Folder:<br><br>
<input is="pod-input" type=text class="dialog__textInput" data-tag="input" value="unnamed"></input><hr>`,
{ Create: { svg: "New Folder" }, Cancel: { svg: "Close" } },
(e, prop, tag, args) => {
args.close();
if (tag == "Cancel") return _shade_.hide();
delay(1, async () => {
try {
let name = dataIndex("tag", args.elm).input.value;
if (name.length == 0) return dialog("Error: 0-length folder name.");
await this.src.putDir(path, name);
await this.setPath(pathJoin(path, name), true);
toast("Folder created");
} catch (error) {
errDialog(error, "Error: failed to create folder on cloud server.");
} finally {
_shade_.hide();
accept();
}
});
}
)
);
});
}
async renameDir(path, name) {
checkPath(path, name);
_shade_.show("Renaming folder");
return new Promise((accept, reject) => {
let dialogElm = dialog(
`Confirm. Rename Folder:<br><br>
<i translate="no">${escapeHtml(name)}</i><br>
<br>To:<br>
<input is="pod-input" type=text class="dialog__textInput" data-tag="input" value="${escapeHtml(name)}"></input>
<hr>`,
{ Rename: { svg: "Pencil" }, Cancel: { svg: "Cancel" } },
async (e, prop, tag, args) => {
try {
if (tag == "Cancel") return args.close();
let input = dataIndex("tag", args.elm).input;
_shade_.show();
let newName = input.value;
if (newName.length == 0) return dialog("Error: 0-length folder name.");
if (newName == name) return dialog("Folder name unchanged.");
args.close();
await this.src.renameDir(path, name, newName);
await this.setPath(path, true);
Score.visit({ source: this.source }, null, this.path);
this.setPath(path, true);
} catch (error) {
errDialog(error, "Error: failed to rename folder on cloud server.");
} finally {
_shade_.hide();
return accept();
}
}
);
let input = dataIndex("tag", dialogElm).input;
listen(input, "keyup", (e) => {
if (e.key == "Enter") dialogElm.buttonsElm.self.fire("Rename");
});
});
}
async trashDir(path, name) {
_shade_.show("Trashing folder");
return new Promise((accept, reject) => {
dialog(`Confirm. Trash Folder:<br><br><i translate="no">${escapeHtml(name)}</i><hr>`, { Trash: { svg: "Trash" }, Cancel: { svg: "Close" } }, async (e, prop, tag, args) => {
try {
args.close();
if (tag == "Cancel") return;
_shade_.show("Trashing folder");
await this.src.trashDir(path, name);
await this.setPath(path, true);
toast("Folder trashed");
} catch (error) {
errDialog(error, "Error: Failed to trash folder on cloud server.");
} finally {
_shade_.hide();
accept();
}
});
});
}
async putFile() {
let name = this.fsvSave__file.value;
name = await this.checkExt(name);
if (!name) return;
try {
_shade_.show("Checking path");
let listing = await this.src.getDir(this.path, true);
if (listing.files[name])
await new Promise((accept, reject) =>
dialog(`Confirm. Replace <i translate="no">${escapeHtml(name)}</i> ?`,
{ Replace: { svg: "Replace" }, Cancel: { svg: "Cancel" } }, async (e, prop, tag, args) => {
args.close();
if (tag == "Cancel") reject(new Error("", { cause: "cancelled" }));
accept();
})
);
_shade_.show("Uploading file");
let score = _score_;
let data = await _score_.toFile();
await this.src.putFile(this.path, name, data);
score.update({ source: this.source, name: name, path: this.path });
if (score.music) score.music.savedAsMscz = true;
Score.visit(score, { size: data.length, modified: Date.now() });
score.setDirty(false);
await this.setPath(this.path, true);
toast("File uploaded");
} catch (error) {
if (error.originalData) {
dialog(`${escapeHtml(error.message)}<br><br>Upload original PDF instead (without Rostrum modifications)?`,
{ Upload: { svg: "Upload" }, Cancel: { svg: "Cancel" } }, async (e, prop, tag, args) => {
args.close();
if (tag == "Upload") {
try {
_shade_.show("Uploading original file");
let data = error.originalData;
await this.src.putFile(this.path, name, data);
let score = _score_;
score.update({ source: this.source, name: name, path: this.path });
Score.visit(score, { size: data.length, modified: Date.now() });
score.setDirty(false);
await this.setPath(this.path, true);
toast("Original file uploaded");
} catch (err) {
errDialog(err, "Failed to upload original file to cloud server");
} finally {
_shade_.hide();
}
}
}
);
} else {
errDialog(error, "Error: failed to upload file to cloud server.<br>Details in Console.");
}
} finally {
_shade_.hide();
this.panel.hide();
}
}
async setPath(path, force = false) {
if (this.source == "Local") return;
_shade_.show("Reading folder");
return new Promise(async (accept, reject) => {
try {
this.path = path;
let listing;
try {
listing = await this.src.getDir(path, force);
localStorage.setItem(this.source, path);
}
catch(error) {
if(error.cause == "cancelled") throw error ;
localStorage.setItem(this.source, "");
listing = await this.src.getDir("", force);
}
this.populateFsvPath();
clearChildren(this.flvList);
for (let properties of Object.values(listing.files)) {
if (this.acceptExt(properties.name)) {
properties.path = path;
this.flvList.append(await this.makeFileElm(properties));
}
}
for (let properties of Object.values(listing.dirs)) {
properties.path = path;
this.flvList.append(await this.makeFileElm(properties));
}
if (path in this.posForPath) this.flvList.style.top = this.posForPath[path];
else this.flvList.style.top = "0px";
} catch (error) {
errDialog(error, "Error: Failed to read folder from cloud server.<br>Details in Console.");
} finally {
_shade_.hide();
return accept();
}
});
}
}
window._FileSrc_ = FileSrc; window._CachedSrc_ = CachedSrc; window._PCloudSrc_ = PCloudSrc;
window._PCloudOAuthAuth_ = PCloudOAuthAuth; window._PCloudDirectAuth_ = PCloudDirectAuth;
window._WebPasswordStore_ = WebPasswordStore;
// #inclusion src/cloud-folder-picker.js minified
css('CloudFolderPicker', `
:root dialog.CloudFolderPicker { width:min(640px,calc(100vw - 24px)); height:min(700px,calc(100dvh - 24px)); max-height:calc(100dvh - 24px); box-sizing:border-box; padding:0; border:1px solid var(--ui-line); border-radius:16px; background:var(--ui-bg); color:var(--ui-text); font:15px/1.5 var(--ui-font); box-shadow:0 12px 44px #172b4d30; touch-action:auto; }
:root dialog.CloudFolderPicker[open] { display:flex; flex-direction:column; }
.CloudFolderPicker *, .CloudFolderPicker *::before, .CloudFolderPicker *::after { box-sizing:border-box; }
.CloudFolderPicker [hidden] { display:none !important; }
.CloudFolderPicker header { display:flex; align-items:center; gap:16px; padding:16px 20px; border-bottom:1px solid var(--ui-line); flex:none; }
.CloudFolderPicker h2 { font-size:20px; font-weight:600; margin:0; flex:1; }
:root dialog.CloudFolderPicker .CloudFolderPicker__close { width:40px; height:40px; padding:0; border:0; background:transparent; }
.CloudFolderPicker__toolbar { display:flex; align-items:center; gap:8px; padding:12px 20px; flex:none; flex-wrap:wrap; }
.CloudFolderPicker__path { display:flex; gap:4px; align-items:center; overflow-x:auto; padding:0 20px 12px; flex:none; }
:root dialog.CloudFolderPicker .CloudFolderPicker__path button { border:0; white-space:nowrap; flex:none; }
.CloudFolderPicker__notice { padding:0 20px; flex:none; }
.CloudFolderPicker__notice p { margin:4px 0 12px; }
.CloudFolderPicker__error { color:var(--ui-text); background:var(--ui-selected); padding:12px; border-radius:8px; margin-bottom:12px; }
.CloudFolderPicker__create { display:flex; gap:8px; align-items:end; flex-wrap:wrap; padding:0 20px 12px; }
.CloudFolderPicker__create label { flex:1 1 180px; font-size:13px; }
.CloudFolderPicker__create input { display:block; width:100%; margin:4px 0 0; font-size:15px; }
.CloudFolderPicker__list { flex:1; min-height:80px; overflow:auto; overscroll-behavior:contain; touch-action:pan-y; padding:0 12px; border-top:1px solid var(--ui-line); }
:root dialog.CloudFolderPicker .CloudFolderPicker__folder { display:flex; width:100%; gap:12px; align-items:center; text-align:left; border:0; border-bottom:1px solid var(--ui-line); border-radius:0; padding:14px 12px; min-height:52px; }
:root dialog.CloudFolderPicker .CloudFolderPicker__file { display:flex; gap:12px; align-items:center; padding:14px 12px; min-height:52px; border-bottom:1px solid var(--ui-line); cursor:pointer; overflow-wrap:anywhere; }
.CloudFolderPicker__file:has(input:checked) { background:var(--ui-selected); }
.CloudFolderPicker__file input { flex:none; width:18px; height:18px; accent-color:var(--ui-primary); }
.CloudFolderPicker__folder span { overflow-wrap:anywhere; }
.CloudFolderPicker__folder svg { flex:none; }
.CloudFolderPicker__empty { color:var(--ui-muted); padding:24px 12px; }
.CloudFolderPicker footer { flex:none; border-top:1px solid var(--ui-line); padding:16px 20px; }
.CloudFolderPicker__selected { display:block; overflow-wrap:anywhere; font-weight:600; margin:6px 0 16px; }
.CloudFolderPicker__actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; }
:root dialog.CloudFolderPicker button[data-confirm] { background:var(--ui-primary); color:var(--ui-on-primary); border-color:transparent; }
.CloudFolderPicker svg { vertical-align:middle; pointer-events:none; }
@media(max-width:480px) { .CloudFolderPicker header, .CloudFolderPicker footer { padding:12px 16px; } .CloudFolderPicker__toolbar { padding:12px 16px; } .CloudFolderPicker h2 { font-size:18px; } }
`);
class CloudFolderPicker {
constructor(service, initialPath = '', {files = false} = {}) {
this.pickFiles = files; this.selectedFiles = new Map();
this.service = service; this.source = FileSrc.get(service);
const relative = initialPath.replace(/^\/+|\/+$/g,'');
this.path = relative ? '/' + relative : ''; this.valid = false; this.epoch = 0;
this.elm = document.createElement('dialog'); this.elm.className = 'CloudFolderPicker';
this.elm.setAttribute('aria-label',files ? 'Choose cloud scores' : 'Choose library sync folder');
this.elm.innerHTML = `<header><h2 tabindex="-1"></h2><button type="button" class="CloudFolderPicker__close" aria-label="Close folder picker">${iconSvg('Close',{size:'20px'})}</button></header>
<div class="CloudFolderPicker__toolbar"><button type="button" data-up>Up</button><button type="button" data-refresh>Refresh</button><button type="button" data-new>New folder</button></div>
<nav class="CloudFolderPicker__path" aria-label="Cloud folder path"></nav>
<div class="CloudFolderPicker__notice"><p>Choose a dedicated folder for this library.</p><p data-status role="status"></p><div class="CloudFolderPicker__error" role="alert" hidden><p data-error></p><button type="button" data-retry>Retry</button></div></div>
<form class="CloudFolderPicker__create" hidden><label>Folder name<input aria-label="New cloud folder name" autocomplete="off" required></label><button type="submit">Create folder</button><button type="button" data-cancel-create>Cancel creation</button></form>
<div class="CloudFolderPicker__list" role="group" aria-label="Cloud folders" tabindex="-1"></div>
<footer>Current folder<output class="CloudFolderPicker__selected" aria-label="Current cloud folder" translate="no"></output><div class="CloudFolderPicker__actions"><button type="button" data-cancel>Cancel</button><button type="button" data-confirm>Use this folder</button></div></footer>`;
const find = selector => this.elm.querySelector(selector);
this.title = find('h2'); this.title.textContent = (files ? 'Choose scores — ' : 'Choose sync folder — ') + service;
if (files) {
find('.CloudFolderPicker__notice > p').textContent = 'Select scores, then import them. Selections are kept when you open another folder.';
find('[data-new]').hidden = true;
}
this.up = find('[data-up]'); this.refresh = find('[data-refresh]'); this.newFolder = find('[data-new]');
this.crumbs = find('nav'); this.status = find('[data-status]'); this.error = find('[role=alert]'); this.errorText = find('[data-error]');
this.retry = find('[data-retry]'); this.form = find('form'); this.name = find('input'); this.list = find('[aria-label="Cloud folders"]'); this.current = find('output'); this.confirm = find('[data-confirm]');
find('[data-cancel]').onclick = find('.CloudFolderPicker__close').onclick = () => this.close();
this.up.onclick = () => this.navigate(this.path.slice(0,this.path.lastIndexOf('/')));
this.refresh.onclick = () => this.navigate(this.path);
this.retry.onclick = () => this.navigate(this.failedPath);
this.newFolder.onclick = () => { this.form.hidden = false; this.name.value = ''; this.name.focus(); };
find('[data-cancel-create]').onclick = () => { this.form.hidden = true; this.newFolder.focus(); };
this.form.onsubmit = event => { event.preventDefault(); this.createFolder(); };
this.confirm.onclick = () => { if (!this.confirm.disabled) { this.result = this.pickFiles ? [...this.selectedFiles.values()] : this.path; this.close(); } };
this.elm.addEventListener('pointerdown',e => { e.taken = true; },{capture:true});
this.renderPath();
}
renderPath() {
this.crumbs.replaceChildren();
const parts = this.path ? this.path.slice(1).split('/') : [];
let path = '';
for (const [index,name] of [this.service,...parts].entries()) {
if (index) path += '/' + name;
const destination = path, button = document.createElement('button'); button.type = 'button';
button.textContent = name; button.translate = false;
if (index === parts.length) button.setAttribute('aria-current','location');
button.onclick = () => this.navigate(destination); this.crumbs.append(button);
if (index < parts.length) { const separator = document.createElement('span'); separator.textContent = '/'; separator.setAttribute('aria-hidden','true'); this.crumbs.append(separator); }
}
this.current.textContent = this.service + (this.path || ' /');
}
setBusy(busy) {
this.busy = busy; this.list.setAttribute('aria-busy',String(busy));
if (busy) this.title.focus({preventScroll:true});
for (const button of [...this.crumbs.querySelectorAll('button'),...this.list.querySelectorAll('button'),...this.form.querySelectorAll('button')]) button.disabled = busy;
this.name.disabled = busy;
this.up.disabled = busy || !this.path; this.refresh.disabled = this.newFolder.disabled = busy;
this.confirm.disabled = busy || !this.valid || this.pickFiles && !this.selectedFiles.size;
if (this.pickFiles) this.confirm.textContent = `Import selected (${this.selectedFiles.size})`;
for (const input of this.list.querySelectorAll('input')) input.disabled = busy;
}
showError(error, path) {
this.errorText.textContent = error?.message || 'Could not open this cloud folder.';
this.failedPath = path; this.error.hidden = false;
}
async navigate(path) {
const epoch = ++this.epoch;
if (path !== this.path) this.form.hidden = true;
this.error.hidden = true; this.retry.hidden = false; this.status.textContent = 'Loading folders…'; this.setBusy(true);
try {
await this.source.auth();
if (!this.elm.open || epoch !== this.epoch) return;
const directory = await this.source.getDir(path,true);
if (!this.elm.open || epoch !== this.epoch) return;
this.path = path; this.valid = true; this.renderPath(); this.list.replaceChildren();
const names = Object.keys(directory.dirs || {}).filter(name => name && name !== '.' && name !== '..').sort((a,b) => a.localeCompare(b));
for (const name of names) {
const button = document.createElement('button'); button.type = 'button'; button.className = 'CloudFolderPicker__folder';
button.innerHTML = iconSvg('Folder',{size:'22px'}); const label = document.createElement('span'); label.textContent = name; label.translate = false; button.append(label);
button.onclick = () => this.navigate(pathJoin(path,name)); this.list.append(button);
}
const files = this.pickFiles ? Object.keys(directory.files || {}).filter(name => /\.(pdf|mscz|mxl|musicxml|xml)$/i.test(name)).sort((a,b) => a.localeCompare(b)) : [];
for (const name of files) {
const key = JSON.stringify([path,name]), row = document.createElement('label'); row.className = 'CloudFolderPicker__file';
const input = document.createElement('input'); input.type = 'checkbox'; input.checked = this.selectedFiles.has(key);
const label = document.createElement('span'); label.textContent = name; label.translate = false; row.append(input,label);
input.onchange = () => {
if (input.checked) this.selectedFiles.set(key,{source:this.service,path,name}); else this.selectedFiles.delete(key);
this.setBusy(false);
};
this.list.append(row);
}
if (!names.length && !files.length) { const empty = document.createElement('p'); empty.className = 'CloudFolderPicker__empty'; empty.textContent = this.pickFiles ? 'No scores or subfolders in this folder.' : 'No subfolders in this folder.'; this.list.append(empty); }
this.status.textContent = ''; this.list.focus({preventScroll:true});
} catch (error) {
if (this.elm.open && epoch === this.epoch) { this.status.textContent = ''; this.showError(error,path); }
} finally {
if (this.elm.open && epoch === this.epoch) this.setBusy(false);
}
}
async createFolder() {
if (this.busy) return;
const name = this.name.value.trim();
if (!name || name === '.' || name === '..' || name.includes('\0')) { this.showError(new Error('Enter a valid folder name.'),this.path); this.retry.hidden = true; return; }
this.error.hidden = true; this.retry.hidden = false; this.setBusy(true);
const epoch = ++this.epoch, parent = this.path;
this.status.textContent = 'Creating folder…';
try {
await this.source.putDir(parent,name);
if (!this.elm.open || epoch !== this.epoch) return;
this.form.hidden = true; await this.navigate(pathJoin(parent,name));
} catch (error) {
if (this.elm.open && epoch === this.epoch) { this.status.textContent = ''; this.showError(error,parent); this.retry.hidden = true; this.setBusy(false); }
}
}
close() { if (this.elm.open) this.elm.close(); }
show() {
document.body.append(this.elm);
const closed = new Promise(resolve => this.elm.addEventListener('close',() => {
++this.epoch; this.elm.remove(); resolve(this.result ?? null);
},{once:true}));
this.elm.showModal(); this.title.focus(); this.navigate(this.path);
return closed;
}
}
// #inclusion src/bookshelf-format.js minified
const LIBRARY_APPLICATION_ID = 0x5253544d;
const LIBRARY_SCHEMA_VERSION = 7;
const LIBRARY_STORAGE_VERSION = 3;
const LIBRARY_RECORD_VERSION = 4;
const LIBRARY_BACKUP_VERSION = 2;
class LibraryFormatError extends Error {
constructor(message) { super(message); this.name = 'LibraryFormatError'; }
}
const hashLibraryBytes = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n => n.toString(16).padStart(2,'0')).join('');
const isVersionedLibraryName = name => /^library-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.sqlite$/.test(name);
function scorePath(path) {
if (typeof path !== 'string' || !/^scores\/[^/\\\x00]+$/.test(path) || path.split('/').some(p => p === '.' || p === '..')) throw new Error('Invalid score path in library package');
return path;
}
async function libraryEntityId(...parts) {
return hashLibraryBytes(new TextEncoder().encode(JSON.stringify(parts)));
}
function createScorePath(id, name, otherIds = []) {
if (!/^[a-f0-9]{64}$/.test(id)) throw new Error('Invalid score identity');
let length = 8;
const others = [...otherIds].filter(other => other !== id);
while (length < 64 && others.some(other => other.startsWith(id.slice(0,length)))) length++;
const clean = String(name || 'score').normalize('NFC').replace(/[<>\u0022:/\\|?*\x00-\x1f]/g,'_').replace(/[ .]+$/,'') || 'score';
const extension = clean.match(/\.[a-z0-9]{1,12}$/i)?.[0] || '';
let stem = extension ? clean.slice(0,-extension.length) : clean;
while (new TextEncoder().encode(stem).length > 160) stem = [...stem].slice(0,-1).join('');
return scorePath(`scores/${id.slice(0,length)}_${stem || 'score'}${extension}`);
}
function scoreStoragePath(path,version = LIBRARY_STORAGE_VERSION) {
if (version !== LIBRARY_STORAGE_VERSION) throw new LibraryFormatError('Unsupported score storage version. Update Rostrum.');
return scorePath(path);
}
function isManagedScoreName(name) { return /^[a-f0-9]{8,64}_[^/\\\x00]+$/.test(name); }
async function listStoredScores({directory},version = LIBRARY_STORAGE_VERSION) {
if (version !== LIBRARY_STORAGE_VERSION) throw new LibraryFormatError('Unsupported score storage version. Update Rostrum.');
const dir = await directory('scores');
return dir ? Object.keys(dir.files).filter(isManagedScoreName).map(name => ({path:'scores/' + name,size:dir.files[name].size})) : [];
}
function validateLibraryGeneration(marker) {
if (!marker || marker.format !== 'rostrum-library-generation' || marker.version !== 1 ||
typeof marker.id !== 'string' || !marker.id || marker.id === 'initial' ||
!Array.isArray(marker.ancestors) || marker.ancestors.some(id => typeof id !== 'string' || id === marker.id) ||
new Set(marker.ancestors).size !== marker.ancestors.length || !marker.ancestors.includes('initial') ||
!/^[a-f0-9]{64}$/.test(marker.snapshotHash) || !/^[a-f0-9]{64}$/.test(marker.sourceHash))
throw new LibraryFormatError('Invalid library replacement metadata');
return marker;
}
function checkLibraryEnvelope(value,kind,version) {
if (!value || value.format !== kind || value.version !== version) throw new LibraryFormatError('Unsupported library package or sync version. Update Rostrum; pre-versioned data is not imported.');
return value;
}
function checkRecordVersion(version) {
if (version !== LIBRARY_RECORD_VERSION) throw new LibraryFormatError('Unsupported library record version. Update Rostrum.');
}
// #inclusion src/bookshelf-transfers.js minified
class LibraryTransferQueue extends EventTarget {
constructor() { super(); this.jobs = new Map(); this.active = null; this.back = 0; this.front = 0; this.completed = 0; this.failed = 0; this.cancelled = 0; this.batches = 0; }
resetProgress() { this.completed = this.failed = this.cancelled = 0; }
beginBatch() { if (!this.batches && !this.size) this.resetProgress(); this.batches++; this.changed(); }
endBatch() { this.batches--; this.changed(); }
get waiting() { return [...this.jobs.values()].filter(job => job.state === 'queued').sort((a,b) => b.priority - a.priority || a.order - b.order); }
get size() { return this.jobs.size; }
changed() { this.dispatchEvent(new Event('change')); }
enqueue(key, run, {priority = 0,front = false,label = '',direction = 'download',group = ''} = {}) {
if (this.jobs.has(key)) { this.promote(key,{priority,front}); return this.jobs.get(key).promise; }
if (!this.jobs.size && !this.batches) this.resetProgress();
let resolve,reject;
const promise = new Promise((yes,no) => { resolve = yes; reject = no; });
promise.catch(() => {});
this.jobs.set(key,{key,run,priority,order:front ? --this.front : ++this.back,label,direction,group,resolve,reject,promise,state:'queued'});
this.changed(); queueMicrotask(() => this.pump()); return promise;
}
promote(key,{priority = 0,front = true} = {}) {
const job = this.jobs.get(key); if (!job || job.state !== 'queued') return;
job.priority = Math.max(priority,job.priority); if (front) job.order = --this.front;
this.changed();
}
cancelWaiting(group) {
for (const [key,job] of this.jobs) if (job.state === 'queued' && job.group === group && job.priority === 0) {
this.jobs.delete(key); this.cancelled++; job.reject(new DOMException('Download cancelled','AbortError'));
}
this.changed();
}
async pump() {
if (this.active) return;
const job = this.waiting[0];
if (!job) return;
this.active = job; job.state = 'running'; this.changed();
try { const value = await job.run(); this.completed++; job.resolve(value); }
catch (error) { this.failed++; job.reject(error); }
finally { this.jobs.delete(job.key); this.active = null; job.run = null; this.changed(); queueMicrotask(() => this.pump()); }
}
}
// #inclusion src/bookshelf-model.js minified
class BookshelfStore extends EventTarget {
constructor(services) {
super(); this.services = services; this.scores = services.scores; this.pending = new Map(); this.sequence = 0; this.localSaving = 0; this.cloudFacts = null; this.downloads = new Map(); this.releases = new Set(); this.fileErrors = new Map();
this.transfers = new LibraryTransferQueue();
this.libraryGeneration = 0; this.pendingUploads = new Map();
this.transfers.addEventListener('change',() => this.notifyStatus());
this.ready = Promise.resolve().then(() => this.initializeSync()).catch(error => { this.syncError = error; this.notifyStatus(); });
}
warn(message) { this.dispatchEvent(new CustomEvent('warning',{detail:{message}})); }
notifyContent() { this.dispatchEvent(new Event('contentchange')); }
notifyStatus() { this.dispatchEvent(new Event('statuschange')); }
notifyData() { this.dispatchEvent(new Event('datachange')); this.notifyStatus(); }
hasSyncDestination() { return !!(this.transport || this.cloudSelection?.source); }
destinationId() {
if (this.transport) return this.transport.id;
if (!this.cloudSelection?.source) return '';
const path = (this.cloudSelection.path || '').replace(/^\/+|\/+$/g,'');
return this.cloudSelection.source + ':' + (path ? '/' + path : '');
}
async initializeSync() {
const [selection, settings, storage] = await Promise.all([this.services.host.loadCloudSelection(),this.services.host.loadSyncSettings(),this.services.host.loadSelection()]);
if (this.storage === undefined) this.storage = storage || {};
this.cloudSelection ||= selection; this.autoSettings ||= settings || { enabled:true };
this.autoSync = new LibraryAutoSync(this); this.autoSync.setEnabled(this.autoSettings.enabled !== false); this.notifyStatus();
}
async setAutoSync(enabled) {
this.autoSettings = { enabled:!!enabled };
this.autoSync?.setEnabled(enabled); this.notifyStatus();
await this.services.host.saveSyncSettings(this.autoSettings);
}
async syncAutomatically() {
const transport = this.transport || this.makeCloudTransport(this.cloudSelection.source,this.cloudSelection.path);
const run = async () => { await transport.connect?.(); return this.sync(transport,{ automatic:true }); };
try { return await (transport.background ? transport.background(run) : run()); }
catch (error) { this.syncError = error; this.notifyStatus(); throw error; }
}
deviceStatus() {
if (this.deletingStorage) return 'Device: deleting library data';
const score = this.scores.active;
if (this.localError || score?.librarySaveError) return 'Device: save failed';
if (this.localSaving || score?.libraryDocumentId && score.librarySavedGeneration !== score.librarySaveGeneration) return 'Device: saving';
if (this.downloads.size) return 'Device: downloading scores';
if (this.fileErrors.size) return 'Device: score download failed';
if (this.opening) return 'Device: opening score';
return 'Device: saved';
}
cloudStatus() {
if (!this.hasSyncDestination()) return 'Cloud: not configured';
if (navigator.onLine === false) return 'Cloud: offline; changes kept on this device';
if (this.cloudConnecting) return 'Cloud: connecting';
if (this.syncPending) return 'Cloud: syncing';
if (this.syncError?.name === 'AuthRequiredError') return 'Cloud: sign-in required; use Sync library now';
if (this.syncError) return 'Cloud: sync failed — ' + this.syncError.message;
const score = this.scores.active;
return this.cloudPending || this.localSaving || score?.libraryDocumentId && score.librarySavedGeneration !== score.librarySaveGeneration
? 'Cloud: changes waiting to sync' : 'Cloud: synced';
}
setPermissionRequired(required) {
this.permissionRequired = required;
this.dispatchEvent(new Event('permissionchange'));
}
async reauthorizeStorage() {
await this.services.host.requestStoragePermission(this.storage);
this.setPermissionRequired(false);
await this.call('open');
if (this.scores.active?.libraryDocumentId) await this.flush(this.scores.active);
}
operationBlock(operation, {internal = false} = {}) {
if (this.deletingStorage) return 'Wait for library data deletion.';
if (this.storageDeleted && operation !== 'storage') return 'Choose the library storage location again.';
if (this.syncPending || !internal && this.cloudConnecting || this.checkingCloud || !internal && this.autoSync?.running)
return 'Wait for the current library sync.';
if (this.opening || this.reviewPending) return 'Finish the current score operation.';
if (operation === 'storage' && (this.transfers.size || this.fullSyncRunning || this.releases.size || this.downloads.size))
return 'Wait for library transfers.';
if (operation !== 'storage' && this.fullSyncRunning && !internal) return 'Wait for the full library sync.';
return null;
}
requireOperation(operation, options) {
const reason = this.operationBlock(operation, options); if (reason) throw new Error(reason);
}
async deletionSummary() {
if (this.scores.active?.libraryDocumentId) await this.flush(this.scores.active);
const data = await this.call('syncData');
const status = await this.call('syncStatus',{destination:this.destinationId()});
const states = await this.call('availability',{destination:this.destinationId()});
return {scores:data.documents.length,pending:status.pending,unverified:!status.verified,
localOnly:states.filter(state => state.present && !state.remote).length};
}
async deleteStorage() {
this.requireOperation('storage');
this.deletingStorage = true; this.notifyStatus();
try { if (this.scores.active?.libraryDocumentId) { await this.flush(this.scores.active); await this.scores.active.dispose(); } }
catch (error) { this.deletingStorage = false; this.notifyStatus(); throw error; }
let deleted = false;
try { await this.call('destroyStorage'); deleted = true; }
finally {
this.worker?.terminate(); this.worker = this.workerStarting = null;
this.hostStorage?.close(); this.hostStorage = null;
this.storageDeleted = !deleted;
this.fileErrors.clear();
if (!deleted) { this.deletingStorage = false; this.notifyData(); }
}
this.syncNeeds = null; this.fullSyncState = null;
try { await this.call('open'); this.cloudFacts = null; }
finally { this.deletingStorage = false; this.notifyData(); }
if (this.hasSyncDestination() && this.autoSettings?.enabled !== false) this.autoSync?.request(0);
else if (this.hasSyncDestination()) {
const transport = this.transport || this.makeCloudTransport(this.cloudSelection.source,this.cloudSelection.path);
this.checkSyncNeeds(transport).catch(() => {});
}
}
async configure(storage) {
this.requireOperation('storage');
if (this.scores.active?.libraryDocumentId) {
await this.flush(this.scores.active); await this.scores.active.dispose();
}
if (this.workerStarting) await this.workerStarting.catch(() => {});
if (this.worker) { await this.call('close'); this.worker.terminate(); }
this.worker = this.workerStarting = null; this.storage = storage; this.storageDeleted = false; this.syncNeeds = null; this.fullSyncState = null; this.localError = null; this.cloudFacts = null; this.fileErrors.clear();
const result = await this.call('open');
try { await this.services.host.saveSelection(storage); }
catch { this.warn('Library opened, but its location could not be remembered. Choose it again next time.'); }
this.autoSync?.request(); this.notifyContent(); this.notifyData();
return result;
}
async sync(transport, { automatic = false } = {}) {
this.requireOperation('sync',{internal:true});
if (navigator.onLine === false) throw new Error('Cloud sync needs a connection; changes remain saved on this device.');
const previous = this.scores.active;
const documentId = previous?.libraryDocumentId;
const index = Math.max(0, Number(previous?.numbers?.pn || 1) - 1);
const anchor = previous && { type: previous.music ? 'music' : 'pdf', pageIndex: previous.pgs[index]?.mozPn ? previous.pgs[index].mozPn - 1 : index };
this.transfers.beginBatch();
this.syncPending = true; this.manualSync = !automatic; this.transport = transport; this.syncError = null; this.notifyStatus();
try {
if (previous?.libraryDocumentId) await this.flush(previous);
const result = await exchangeLibraryChanges(this,transport);
this.syncNeeds = null;
await this.refreshSyncNeeds(transport);
this.lastSyncedAt = Date.now(); this.notifyData(); return result;
} catch (error) { this.syncError = error; throw error; }
finally {
if (!automatic && documentId && !this.scores.active) {
try { await this.openDocument(documentId, anchor, true); }
catch (error) { this.warn('Review the synced library before reopening this score: ' + error.message); }
}
this.transfers.cancelled += this.pendingUploads.size; this.pendingUploads.clear();
this.syncPending = false; this.manualSync = false; this.transfers.endBatch();
this.notifyStatus();
if (!automatic) this.autoSync?.request(this.autoSync.interval);
}
}
makeCloudTransport(source, path) {
return this.services.createCloudTransport(source,path || '');
}
async syncCloud(source, path, {background = false} = {}) {
this.requireOperation('sync',{internal:background});
const transport = this.makeCloudTransport(source,path);
this.cloudConnecting = true; this.notifyStatus();
try {
await transport.connect();
this.cloudSelection = { source,path }; this.transport = transport;
await this.services.host.saveCloudSelection(this.cloudSelection);
return await this.sync(transport,{automatic:background});
} catch (error) { this.syncError = error; throw error; }
finally { this.cloudConnecting = false; this.notifyStatus(); this.autoSync?.request(this.autoSync.interval); }
}
async applyRemoteChanges(changes) {
if (this.opening) throw new Error('Wait for the score to open before receiving changes.');
if (this.reviewPending) throw new Error('Finish the current score review before receiving library changes.');
const previous = this.scores.active, id = previous?.libraryDocumentId;
const affectsOpen = id && changes.some(change => {
const row = JSON.parse(change.payload_json);
return change.entity_type === 'documents' && row.id === id || change.entity_type === 'annotations' && row.document_id === id;
});
if (!affectsOpen) return this.call('mergeDelta',{ changes });
const index = Math.max(0,Number(previous.numbers?.pn || 1) - 1);
const anchor = { type:previous.music ? 'music' : 'pdf',pageIndex:previous.pgs[index]?.mozPn ? previous.pgs[index].mozPn - 1 : index };
this.applyingChanges = true; this.notifyStatus();
try {
await this.flush(previous); await previous.dispose();
return await this.call('mergeDelta',{ changes });
} finally {
try { if (!this.scores.active) await this.openDocument(id,anchor,true); }
catch (error) { this.warn('Review this score before reopening it: ' + error.message); }
this.applyingChanges = false; this.notifyStatus();
}
}
async chooseRestoreGeneration(id) {
this.requireOperation('sync');
const transport = this.transport || this.makeCloudTransport(this.cloudSelection.source,this.cloudSelection.path);
this.cloudConnecting = true; this.notifyStatus();
try { await transport.connect?.(); await resolveLibraryGeneration(this,transport,id); return await this.sync(transport); }
finally { this.cloudConnecting = false; this.notifyStatus(); }
}
async replaceLibrarySnapshot(file,generation) {
const previous = this.scores.active;
if (previous?.libraryDocumentId) { await this.flush(previous); await previous.dispose(); }
await this.call('replaceSnapshot',{file,generation});
this.libraryGeneration++; this.cloudFacts = null; this.notifyContent(); this.notifyData();
}
transferKey(id,direction = 'download',transport = this.transport) { return direction + ':' + (transport?.id || this.destinationId()) + ':' + id; }
planUploads(documents) {
this.pendingUploads = new Map(documents.map(doc => [doc.id,JSON.parse(doc.metadata_json).originalFilename])); this.notifyStatus();
}
uploadFile(document,file,transport) {
this.pendingUploads.delete(document.id);
return this.transfers.enqueue(this.transferKey(document.id,'upload',transport),async () => {
if (!file) file = (await this.call('fileInfo',{id:document.id,verify:true})).file;
if (!file) throw new Error('A score is missing from both this device and the cloud: ' + document.storage_path);
return transport.writeScore(document,file);
},{label:JSON.parse(document.metadata_json).originalFilename,direction:'upload'});
}
async refreshSyncNeeds(transport = this.transport) {
if (!transport) return;
const status = await this.call('syncSummary',{destination:transport.id});
this.syncNeeds = {...status,destination:transport.id,pending:!!status.unknown || status.pending > 0 || !status.verified,checkedAt:Date.now()};
this.updateCloudPending(status,transport.id);
this.notifyStatus();
}
async checkSyncNeeds(transport = this.transport,{interactive = false} = {}) {
if (!transport) throw new Error('Choose a library cloud destination first.');
if (this.syncPending || this.deletingStorage) return;
if (this.checkingCloud) return this.checkingCloud;
this.checkingCloud = (async () => {
const check = async () => {
await transport.connect?.();
const data = await this.call('syncData',{destination:transport.id}), remoteIds = new Set();
const state = await transport.loadSyncState();
const scores = await transport.listScores();
const generations = await transport.listGenerations();
const requests = await transport.restoreRequests();
const localRequests = await this.call('listManaged',{path:'restore'});
const generation = JSON.parse(data.info.generation_json);
let unknown = [...requests,...localRequests.filter(item => item.kind === 'directory').map(item => ({id:item.name}))].some(request => !generations.some(marker => marker.id === request.id));
unknown ||= generation.id !== 'initial' && !generations.some(marker => marker.id === generation.id);
for (const item of state.snapshots) {
const snapshot = await this.call('inspectSnapshot',{file:item.file});
if (snapshot.generation.id !== generation.id) continue;
for (const change of snapshot.changes) remoteIds.add(change.id);
}
if (state.snapshots.length && !remoteIds.size && data.changes.length) unknown = true;
if (generations.some(marker => marker.id !== generation.id && !generation.ancestors.includes(marker.id))) unknown = true;
if (transport.source?.compactLibrarySnapshots && state.snapshots.some(item => item.name !== 'library.sqlite')) unknown = true;
const known = new Set(data.changes.map(change => change.id));
unknown ||= [...remoteIds].some(id => !known.has(id));
await this.call('remoteInventory',{destination:transport.id,changeIds:[...remoteIds],paths:scores.map(file => file.path),unknown});
this.syncNeeds = null;
await this.refreshSyncNeeds(transport);
};
try { await (!interactive && transport.background ? transport.background(check) : check()); }
catch (error) { this.syncNeeds = {destination:transport.id,error:error.message}; throw error; }
})();
this.notifyStatus();
try { await this.checkingCloud; }
finally { this.checkingCloud = null; this.notifyStatus(); }
}
async ensureFile(id, transport = this.transport, {priority = 0,front = false,group = '',document = null} = {}) {
if (this.releases.has(id)) throw new Error('Wait for this download to be released.');
const key = this.transferKey(id,'download',transport);
if (this.downloads.has(id)) { this.transfers.promote(key,{priority,front}); return this.downloads.get(id); }
const local = document ? {document} : await this.call('fileInfo',{id});
if (local.file) return local.file;
if (group === 'full-library' && this.fullSyncCancelled) throw new DOMException('Download cancelled','AbortError');
if (this.downloads.has(id)) { this.transfers.promote(key,{priority,front}); return this.downloads.get(id); }
const job = this.transfers.enqueue(key,async () => {
const info = await this.call('fileInfo',{ id }); if (info.file) return info.file;
const task = this.transfers.jobs.get(key);
if (task) { task.label = JSON.parse(info.document.metadata_json).originalFilename; this.transfers.changed(); }
if (navigator.onLine === false) throw new Error('This score is cloud-only. Connect to download it, or keep it offline in advance.');
if (!transport) {
if (!this.cloudSelection?.source) throw new Error('Connect the library cloud to download this score.');
transport = this.makeCloudTransport(this.cloudSelection.source,this.cloudSelection.path);
}
const transfer = async () => { await transport.connect?.(); return transport.readScore(info.document); };
const file = await (transport.background ? transport.background(transfer) : transfer());
this.transport = transport;
await this.call('installFile',{ id,file }); this.fileErrors.delete(id);
if (this.syncNeeds?.destination === transport.id) await this.refreshSyncNeeds(transport);
return file;
},{priority,front,group,label:JSON.parse(local.document.metadata_json).originalFilename});
this.downloads.set(id,job); this.notifyData();
try { return await job; }
catch (error) { if (error.name !== 'AbortError') this.fileErrors.set(id,error.message); throw error; }
finally { this.downloads.delete(id); this.notifyData(); }
}
async keepOffline(ids) {
for (const id of ids) await this.call('pinFile',{ id,pinned:true });
let failed;
await Promise.all(ids.map(async id => { try { await this.ensureFile(id); } catch (error) { failed ||= error; } }));
this.autoSync?.request(); if (failed) throw failed;
}
async syncAllScores(source,path) {
if (this.fullSyncRunning) throw new Error('A full library transfer is already running.');
this.fullSyncRunning = true; this.fullSyncCancelled = false;
const state = this.fullSyncState = {phase:'sync',total:0,completed:0,failed:0,cancelled:0}; this.notifyStatus();
try {
if (source) await this.syncCloud(source,path,{background:true});
else if (this.transport) await this.sync(this.transport,{automatic:true});
else throw new Error('Configure library cloud sync first.');
const docs = (await this.call('syncData')).documents.filter(doc => !doc.deleted_at && !doc.replaced_by_id);
const states = new Map((await this.call('availability',{destination:this.destinationId()})).map(item => [item.id,item]));
const missing = docs.filter(doc => !states.get(doc.id)?.present);
state.phase = 'download'; state.total = missing.length; this.notifyStatus();
await Promise.all(missing.map(async doc => {
if (this.fullSyncCancelled) { state.cancelled++; return; }
try { await this.ensureFile(doc.id,this.transport,{group:'full-library',document:doc}); state.completed++; }
catch (error) { if (error.name === 'AbortError') state.cancelled++; else state.failed++; }
finally { this.notifyStatus(); }
}));
state.phase = this.fullSyncCancelled ? 'cancelled' : state.failed ? 'failed' : 'done';
return {...state};
} catch (error) { state.phase = 'failed'; state.error = error.message; throw error; }
finally { this.fullSyncRunning = false; this.notifyData(); }
}
cancelFullSync() { this.fullSyncCancelled = true; this.transfers.cancelWaiting('full-library'); this.notifyStatus(); }
async downloadPinned(transport) {
const states = await this.call('availability',{ destination:transport.id });
const docs = (await this.call('syncData')).documents;
let downloadFailures = 0;
await Promise.all(states.filter(state => state.pinned && !state.present && docs.some(doc => doc.id === state.id && !doc.deleted_at)).map(async state => {
try { await this.ensureFile(state.id,transport); }
catch { downloadFailures++; }
}));
return downloadFailures;
}
async releaseDownload(id) {
if (this.releases.has(id) || this.downloads.has(id) || this.opening?.id === id) throw new Error('Wait for the current score operation.');
if (this.scores.active?.libraryDocumentId === id) throw new Error('Close this score before releasing its download.');
if (!this.transport || navigator.onLine === false) throw new Error('Connect and sync before releasing a download.');
const transport = this.transport;
this.releases.add(id);
const release = async () => {
const info = await this.call('fileInfo',{ id });
const remote = await transport.listScores();
if (!remote.some(file => file.path === info.document.storage_path)) throw new Error('This score is not uploaded. Keep its local copy and sync first.');
await this.call('verifyFile',{ id,file:await transport.readScore(info.document) });
return this.call('releaseFile',{ id,destination:transport.id });
};
try { return await (transport.background ? transport.background(release) : release()); }
finally { this.releases.delete(id); if (this.syncNeeds) await this.refreshSyncNeeds(); this.notifyData(); }
}
scheduleSave(score) {
score.librarySaveGeneration = (score.librarySaveGeneration || 0) + 1;
clearTimeout(score.librarySaveTimer);
this.notifyStatus();
score.librarySaveTimer = setTimeout(() => this.flush(score).catch(error => {
score.librarySaveError = error;
this.warn('Library save failed: ' + error.message);
}), 300);
}
async flush(score) {
clearTimeout(score.librarySaveTimer);
if (score.librarySavePromise) await score.librarySavePromise;
if (!score.libraryDocumentId || score.librarySavedGeneration === score.librarySaveGeneration) return;
const save = async () => {
while (score.librarySavedGeneration !== score.librarySaveGeneration) {
const generation = score.librarySaveGeneration;
const state = await score.captureLibraryState();
await this.call('saveState', { documentId: score.libraryDocumentId, ...state });
score.librarySavedGeneration = generation;
}
score.librarySaveError = null;
score.setDirty(false);
};
score.librarySavePromise = save();
try { await score.librarySavePromise; } finally { score.librarySavePromise = null; this.notifyStatus(); }
}
async openDocument(id, anchor, afterSync = false) {
if (this.opening) {
if (this.opening.id === id) return this.opening.promise;
throw new Error('Wait for the current score to open.');
}
const promise = this.openDocumentAux(id,anchor,afterSync); this.opening = { id,promise }; this.notifyStatus();
try { return await promise; } finally { this.opening = null; this.notifyData(); }
}
async openDocumentAux(id, anchor, afterSync) {
if (this.syncPending && this.manualSync && !afterSync) throw new Error('Wait for library sync before opening another score.');
if (this.scores.active?.libraryDocumentId) await this.flush(this.scores.active);
const conflicts = await this.call('conflicts');
if (conflicts.some(conflict => conflict.table === 'documents' && conflict.id === id
|| conflict.table === 'annotations' && conflict.alternatives.some(change => JSON.parse(change.payload_json).document_id === id))) {
throw new Error('Resolve this score’s conflicting edits before opening it.');
}
const active = this.scores.active;
if (active?.libraryDocumentId === id && !active.disposed && this.scores.navigate) {
await this.scores.navigate(active,anchor);
return active;
}
await this.ensureFile(id,undefined,{priority:100,front:true});
const state = await this.call('read', { id });
return this.scores.open(state,anchor);
}
async ensureWorker() {
if (this.workerStarting) return this.workerStarting;
this.workerStarting = (async () => {
if (this.storage === undefined) this.storage = await this.services.host.loadSelection() || {};
if (await this.services.host.queryStoragePermission(this.storage) !== 'granted') {
this.setPermissionRequired(true);
throw new DOMException('Allow access to the remembered library folder to continue.', 'NotAllowedError');
}
this.setPermissionRequired(false);
const deviceStateKey = await this.services.host.deviceStateKey(this.storage || {});
const deviceState = await this.services.host.loadDeviceState(deviceStateKey) || {};
let url = globalThis._rostrumPages_?.url('bookshelf-worker.js') ?? new URL('bookshelf-worker.js', location.href).href;
if (location.protocol === 'file:') {
this.hostStorage = await this.services.host.openHostStorage(this.storage || {});
const runtime = this.services.runtime;
if (!runtime) throw new Error('This build does not contain the library runtime.');
const decode = value => new Uint8Array([...atob(value)].map(char => char.charCodeAt(0)));
const workerText = await new Response(new Blob([decode(runtime.worker)]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
const script = `globalThis.rostrumLibraryWasm = new Uint8Array(await new Response(new Blob([Uint8Array.from(atob(${JSON.stringify(runtime.wasm)}), c=>c.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());\n` + workerText;
const bytes = new TextEncoder().encode(script);
let binary = ''; for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
url = 'data:text/javascript;base64,' + btoa(binary);
}
this.worker = new Worker(url, { type: 'module' });
let readyResolve, readyReject;
const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
const startupTimeout = setTimeout(() => readyReject(new Error('Library worker did not finish starting.')), 20000);
this.worker.onmessage = async ({ data }) => {
if (data.hostRequest) {
const methods = {
list: path => this.hostStorage.files.list(path),
saveDeviceState: state => this.services.host.saveDeviceState(deviceStateKey,state),
readDatabase: () => this.hostStorage.readDatabase(), writeDatabase: bytes => this.hostStorage.writeDatabase(bytes), close: () => this.hostStorage.close(), clear: () => this.hostStorage.clear(),
read: path => this.hostStorage.files.read(path), write: (path, bytes) => this.hostStorage.files.write(path, bytes), remove: path => this.hostStorage.files.remove(path),
};
try {
if (!Object.hasOwn(methods, data.method)) throw new Error('Unknown storage operation');
const value = await methods[data.method](...data.args);
this.worker?.postMessage({ hostReply: data.hostRequest, value });
} catch (error) { this.worker?.postMessage({ hostReply: data.hostRequest, error: error.message, errorName: error.name }); }
return;
}
if (data.ready) { clearTimeout(startupTimeout); readyResolve(); return; }
const pending = this.pending.get(data.id);
if (!pending) return;
this.pending.delete(data.id);
data.error ? pending.reject(Object.assign(new Error(data.error), { name: data.errorName || 'Error', persistenceFailed: data.persistenceFailed,
committedValue:data.committedValue })) : pending.resolve(data.value);
};
this.worker.onerror = () => {
clearTimeout(startupTimeout); readyReject(new Error('Could not start library storage.'));
for (const pending of this.pending.values()) pending.reject(new Error('Could not start library storage.'));
this.pending.clear(); this.worker.terminate(); this.worker = null;
this.hostStorage?.close(); this.hostStorage = null;
this.workerStarting = null;
};
await ready;
await this.send('open', { deviceState, storage: location.protocol === 'file:' ? { kind: 'host' } : this.storage || {} });
return this.worker;
})().catch(error => {
this.worker?.terminate(); this.hostStorage?.close(); this.hostStorage = null;
this.worker = this.workerStarting = null; throw error;
});
return this.workerStarting;
}
send(action, args) {
return new Promise((resolve, reject) => {
const id = ++this.sequence;
this.pending.set(id, { resolve, reject });
try { this.worker.postMessage({ id, action, args }); }
catch (error) { this.pending.delete(id); reject(error); }
});
}
async call(action, args = {}) {
if (this.storageDeleted) throw new Error('Library deletion was incomplete. Choose its storage location again before continuing.');
if (this.deletingStorage && !['destroyStorage','open','saveState'].includes(action)) throw new Error('Wait for library data deletion.');
const shared = ['importFile','rememberOriginalLocation','update','link','moveItem','reindex','editSongs','saveState','resolveConflict','useVersion','importBackup','relocateFile'].includes(action);
const writing = shared || ['mergeDelta','replaceSnapshot','installFile','releaseFile','pinFile'].includes(action);
if (writing) { this.localSaving++; this.notifyStatus(); }
try {
await this.ensureWorker(); const value = await this.send(action,args);
if (!['backup','export'].includes(action)) this.localError = null;
if (shared) {
this.libraryGeneration++;
this.cloudFacts = null;
if (this.syncNeeds?.checkedAt) await this.refreshSyncNeeds({id:this.syncNeeds.destination});
this.autoSync?.request();
}
if (shared && action !== 'saveState' || action === 'mergeDelta' && value.addedChanges > 0 || action === 'destroyStorage') this.notifyContent();
if (writing || action === 'remoteInventory') this.notifyData();
return value;
}
catch (error) {
if (this.storage?.kind === 'directory' && ['NotAllowedError', 'SecurityError'].includes(error.name)) this.setPermissionRequired(true);
if (error.persistenceFailed) this.localError = error;
throw error;
} finally { if (writing) { this.localSaving--; this.notifyStatus(); } }
}
records(table, parent, id) { return this.call('records',{table,parent,id}); }
update(table, values, expectedRevisionId) {
if (table === 'documents' && values.deleted_at && this.scores.active?.libraryDocumentId === values.id) throw new Error('Close this score before deleting it');
return this.call('update',{table,values,expectedRevisionId});
}
rename(table, row, name) {
const metadata = JSON.parse(row.metadata_json);
const field = table === 'documents' ? 'displayName' : table === 'entries' ? 'title' : 'name';
const values = table === 'tags' ? {name:name.trim()} : {metadata_json:JSON.stringify({...metadata,[field]:name,
...(['documents','entries'].includes(table) ? {userEditedFields:[...new Set([...(metadata.userEditedFields || []),field])]} : {})})};
return this.update(table,{id:row.id,...values},row.revision_id);
}
remove(table, row) { return this.update(table,{id:row.id,deleted_at:new Date().toISOString()},row.revision_id); }
createCollection(table, name) {
name = name.trim(); if (!name) return;
return this.update(table,{id:crypto.randomUUID(),...(table === 'tags' ? {name} : {metadata_json:JSON.stringify({name})})});
}
addTag(table, id, tagId) {
const entry = table === 'entries';
return this.call('link',{table:entry ? 'entry_tags' : 'document_tags',values:{[entry ? 'entry_id' : 'document_id']:id,tag_id:tagId}});
}
addToCollection(table, id, collectionId) {
const entry = table === 'entries';
return this.call('link',{table:entry ? 'playlist_items' : 'bookshelf_documents',values:{
[entry ? 'playlist_id' : 'bookshelf_id']:collectionId,[entry ? 'entry_id' : 'document_id']:id,order_key:String(Date.now())}});
}
saveItemNote(table, row, note) {
return this.update(table,{id:row.id,metadata_json:JSON.stringify({note})},row.revision_id);
}
saveSong(row, {composer, aliases, pageIndex}) {
if (!Number.isInteger(pageIndex) || pageIndex < 0) throw new Error('Enter a valid start page');
const metadata = JSON.parse(row.metadata_json);
return this.update('entries',{id:row.id,anchor_json:JSON.stringify({...JSON.parse(row.anchor_json),pageIndex}),
metadata_json:JSON.stringify({...metadata,composer,aliases:aliases.split(';').map(value => value.trim()).filter(Boolean),
userEditedFields:[...new Set([...(metadata.userEditedFields || []),'composer','aliases','anchor'])]})},row.revision_id);
}
addSong(document, title, pageIndex) {
if (!title.trim() || !Number.isInteger(pageIndex) || pageIndex < 0) throw new Error('Enter a title and valid start page');
const metadata = JSON.parse(document.metadata_json);
return this.update('entries',{id:crypto.randomUUID(),document_id:document.id,
anchor_json:JSON.stringify({type:/\.pdf$/i.test(metadata.originalFilename) ? 'pdf' : 'music',pageIndex}),
metadata_json:JSON.stringify({title:title.trim(),source:{type:'manual'},userEditedFields:['title','anchor']})});
}
moveItem(table, id, direction) { return this.call('moveItem',{table,id,direction}); }
conflicts() { return this.call('conflicts'); }
resolveConflict(options) { return this.call('resolveConflict',options); }
useVersion(id) { return this.call('useVersion',{id}); }
pinFile(id, pinned) { return this.call('pinFile',{id,pinned}); }
collectionDocuments(table, id) { return this.call('collectionDocuments',{table,id}); }
checkCloudSelection(source, path, options) { return this.checkSyncNeeds(this.makeCloudTransport(source,path),options); }
storageCapabilities() { return this.services.host.storageCapabilities(); }
async savedCloudSelection() { await this.ready; return this.cloudSelection; }
get transferState() {
const queue = this.transfers;
const waitingFiles = {upload:[],download:[]};
for (const job of queue.waiting) waitingFiles[job.direction].push(job.label);
waitingFiles.upload.push(...this.pendingUploads.values());
const waiting = {upload:waitingFiles.upload.length,download:waitingFiles.download.length};
return {size:queue.size,completed:queue.completed,failed:queue.failed,cancelled:queue.cancelled,
total:queue.completed + queue.failed + queue.cancelled + queue.size + this.pendingUploads.size,waiting,waitingFiles,
active:queue.active && {direction:queue.active.direction,label:queue.active.label}};
}
downloadState(id) {
const job = this.transfers.jobs.get(this.transferKey(id));
return {state:job?.state,error:this.fileErrors.get(id)};
}
download(id) { return this.ensureFile(id,undefined,{priority:50,front:true}); }
get cloudPending() {
const facts = this.cloudFacts;
return !facts || facts.destination !== this.destinationId() || facts.pending > 0 || !facts.verified || facts.unknown ||
!!(this.syncNeeds?.destination === facts.destination && this.syncNeeds.uploads > 0);
}
updateCloudPending(status, destination) {
if (destination === this.destinationId()) this.cloudFacts = {...status,destination};
}
async availability() {
const destination = this.destinationId();
const [states,status] = await Promise.all([this.call('availability',{destination}),this.call('syncStatus',{destination})]);
if (destination === this.destinationId()) {
this.updateCloudPending(status,destination);
this.notifyStatus();
}
return new Map(states.map(state => [state.id,state]));
}
async query({mode, collection, filters}) {
if (['bookshelves','playlists'].includes(mode) && !collection) return [];
if (mode === 'history') return this.call('history');
if (mode === 'bookshelves') {
const memberships = await this.records('bookshelf_documents','bookshelf_id',collection);
const documents = await this.call('list',filters);
return memberships.sort((a,b) => a.order_key.localeCompare(b.order_key) || a.id.localeCompare(b.id)).flatMap(link => {
const doc = documents.find(doc => doc.id === link.document_id);
return doc ? [{...doc,membership:link}] : [];
});
}
if (mode === 'playlists') {
const memberships = await this.records('playlist_items','playlist_id',collection);
const entries = await this.records('entries'), documents = await this.records('documents');
return memberships.sort((a,b) => a.order_key.localeCompare(b.order_key) || a.id.localeCompare(b.id)).map(link => {
const entry = entries.find(entry => entry.id === link.entry_id);
const doc = entry && documents.find(doc => doc.id === entry.document_id);
return entry ? {...entry,membership:link,unavailable:!doc,document_metadata:doc?.metadata_json,previousVersion:!!doc?.replaced_by_id}
: {id:link.entry_id,metadata_json:'{"title":"Unavailable song"}',membership:link,unavailable:true};
});
}
if (mode === 'entries' || mode === 'tags') return this.call('search',{
...filters,tagIds:[...new Set([...filters.tagIds,...(mode === 'tags' && collection ? [collection] : [])])]});
return this.call('list',filters);
}
async analyze(file, previewScore = null) {
if (!/\.(pdf|mscz|mxl|musicxml|xml)$/i.test(file.name)) throw new Error('Unsupported score format');
const entries = [];
const fileHash = await hashLibraryBytes(await file.arrayBuffer());
if (/\.pdf$/i.test(file.name)) {
const analysis = previewScore || await this.scores.preview(file);
const pdf = analysis.mozDoc;
try {
const walk = async (items, parent_id = null, path = []) => {
for (const [index,item] of (items || []).entries()) {
const position = [...path,index];
let dest = item.dest;
if (typeof dest === 'string') dest = await pdf.getDestination(dest);
let pageIndex = null;
if (Array.isArray(dest)) pageIndex = typeof dest[0] === 'number' ? dest[0] : await pdf.getPageIndex(dest[0]);
const id = await libraryEntityId(fileHash,'pdf-outline',position);
const validPage = Number.isInteger(pageIndex) && pageIndex >= 0 && pageIndex < pdf.numPages;
if (validPage) entries.push({ id, parent_id, anchor: { type: 'pdf', pageIndex }, metadata: { title: item.title,
source: { type: 'pdf-outline', key: JSON.stringify(position) } } });
await walk(item.items, validPage ? id : parent_id,position);
}
};
await walk(await pdf.getOutline());
if (!entries.length) entries.push({ id: await libraryEntityId(fileHash,'root'), anchor: { type: 'pdf', pageIndex: 0 }, metadata: {
title: analysis.pdfInfo?.Title || file.name.replace(/\.[^.]+$/, ''), composer: '',
source: { type: 'file-title', key: 'root' } } });
} finally { if (!previewScore) await analysis.dispose(); }
}
if (!entries.length) {
let title = file.name.replace(/\.[^.]+$/, ''), composer = '', source = 'filename';
if (!/\.pdf$/i.test(file.name)) {
const files = await this.call('musicMetadataFiles', { file });
let names = Object.keys(files).filter(name => !name.startsWith('META-INF/'));
if (files['META-INF/container.xml']) {
const container = new DOMParser().parseFromString(files['META-INF/container.xml'], 'application/xml');
const main = container.querySelector('rootfile')?.getAttribute('full-path');
if (main && files[main]) names = [main];
}
names.sort((a,b) => a.split('/').length - b.split('/').length);
for (const name of names) {
const xml = new DOMParser().parseFromString(files[name], 'application/xml');
if (xml.querySelector('parsererror')) continue;
if (xml.documentElement.tagName === 'museScore') {
const tags = Object.fromEntries([...xml.querySelectorAll('Score > metaTag')].map(tag => [tag.getAttribute('name'), tag.textContent]));
const titleText = [...xml.querySelectorAll('Text')].find(text => text.querySelector('style')?.textContent === 'title');
const workTitle = ['無題のスコア','Untitled score'].includes(tags.workTitle) ? '' : tags.workTitle;
title = workTitle || titleText?.querySelector('text')?.textContent || title;
composer = tags.composer || ''; source = 'music-metadata'; break;
}
if (/^score-(partwise|timewise)$/.test(xml.documentElement.tagName)) {
title = xml.querySelector('work-title')?.textContent || xml.querySelector('movement-title')?.textContent || title;
composer = xml.querySelector('creator[type="composer"]')?.textContent || ''; source = 'music-metadata'; break;
}
}
}
entries.push({ id: await libraryEntityId(fileHash,'root'), anchor: { type: /\.pdf$/i.test(file.name) ? 'pdf' : 'music', pageIndex: 0 },
metadata: { title, composer, source: { type: source, key: 'root' } } });
}
return entries;
}
async readOriginalFile(location) {
const result = await this.services.readOriginalFile(location);
return new File([result.data],location.name);
}
async import(file, options = {}) {
const existing = await this.call('findImportedFile', { file });
if (existing) return this.call('importFile',{file,entries:[],...options});
return this.call('importFile', { file, ...await this.prepareImport(file), ...options });
}
async prepareImport(file, preview = null) {
if (!/\.pdf$/i.test(file.name)) return { entries: await this.analyze(file,preview) };
const score = preview || await this.scores.preview(file);
try {
return { entries: await this.analyze(file,score), maxWidth:score.maxWidth, maxHeight:score.maxHeight };
} finally { if (!preview) await score.dispose(); }
}
async importReviewed(file, options = {}, previewScore = null) {
if (this.reviewPending) throw new Error('Finish the current score import review first.');
this.reviewPending = true;
let preview = previewScore;
try {
const existing = await this.call('findImportedFile', { file });
if (existing) return this.call('importFile',{file,entries:[],...options});
preview ||= await this.scores.preview(file);
const analysis = await this.prepareImport(file, preview);
return await this.scores.review(file, analysis.entries, preview, draft => this.call('importFile', { file, ...analysis, ...draft, ...options }),
this.storage?.kind === 'directory' ? () => this.reauthorizeStorage() : null);
} finally { try { if (!previewScore) await preview?.dispose(); } finally { this.reviewPending = false; } }
}
async reindex(id) {
await this.ensureFile(id);
const { document: doc, file } = await this.call('read', { id });
const named = new File([file], JSON.parse(doc.metadata_json).originalFilename);
return this.call('reindex', { documentId: id, entries: await this.analyze(named) });
}
async editSongs(id) {
if (this.reviewPending || this.syncPending) throw new Error('Finish the current library operation before editing songs.');
this.reviewPending = true;
let preview;
try {
if (this.scores.active?.libraryDocumentId) await this.flush(this.scores.active);
await this.ensureFile(id);
const state = await this.call('songState', { id });
let expectedRevisionId = state.document.revision_id;
let expectedEntries = state.entries.map(row => ({ id:row.id, revision_id:row.revision_id }));
const records = state.entries.filter(row => !row.deleted_at);
const metadata = JSON.parse(state.document.metadata_json);
const file = new File([state.file], metadata.originalFilename);
preview = await this.scores.preview(file);
const entries = records.map(row => ({ id:row.id, parent_id:row.parent_id,
anchor:JSON.parse(row.anchor_json), metadata:JSON.parse(row.metadata_json) }));
const byId = new Map(entries.map(entry => [entry.id,entry])), seen = new Set(), ordered = [];
const visit = entry => {
if (seen.has(entry.id)) return;
seen.add(entry.id);
if (byId.has(entry.parent_id)) visit(byId.get(entry.parent_id));
ordered.push(entry);
};
entries.sort((a,b) => a.anchor.pageIndex - b.anchor.pageIndex || a.id.localeCompare(b.id)).forEach(visit);
const commit = async draft => {
try {
const result = await this.call('editSongs', { documentId:id, expectedRevisionId, expectedEntries, ...draft });
return result.document;
} catch (error) {
if (error.persistenceFailed && error.committedValue?.document) {
expectedRevisionId = error.committedValue.document.revision_id;
expectedEntries = error.committedValue.entries;
}
throw error;
}
};
return await this.scores.review(file, ordered, preview, commit, this.storage?.kind === 'directory' ? () => this.reauthorizeStorage() : null,
{ editing:true, displayName:metadata.displayName });
} finally { try { await preview?.dispose(); } finally { this.reviewPending = false; } }
}
async exportBackup() {
this.emergencyBackup = false;
if (this.scores.active?.libraryDocumentId) {
try { await this.flush(this.scores.active); }
catch (error) {
if (!error.persistenceFailed) throw error;
this.emergencyBackup = true;
}
}
if (!this.emergencyBackup) for (const doc of (await this.call('syncData')).documents) await this.ensureFile(doc.id);
return this.call('backup');
}
async importBackup(file) {
if (this.scores.active?.libraryDocumentId) {
await this.flush(this.scores.active); await this.scores.active.dispose();
}
return this.call('importBackup', { file });
}
}
// #inclusion src/bookshelf.js minified
const librarySearchKey = 'rostrum-library-search';
const bookshelfStore = new BookshelfStore({
get host() { return window.RostrumLibraryHost; },
get runtime() { return window._bookshelfRuntime_; },
createCloudTransport(source,path) {
if (![Score.sources.gdrive,Score.sources.dbx,Score.sources.odrive,Score.sources.pcloud].includes(source)) throw new Error('Choose a cloud service');
return new LibraryCloudTransport(FileSrc.get(source),path);
},
readOriginalFile: location => FileSrc.get(location.source).getFile(location.path,location.name),
scores: {
get active() { return Score.activeScore; },
preview: async file => new Score().init(null,null,file.name,await file.arrayBuffer(),false),
review: reviewScoreImport,
navigate: (score,anchor) => score.goToLibraryAnchor(anchor),
async open(state,anchor) {
const settings = JSON.parse(state.document.settings_json);
const name = JSON.parse(state.document.metadata_json).originalFilename;
const score = await new Score().init(null,null,name,
/\.pdf$/i.test(name) ? state.file : await state.file.arrayBuffer(),true,{...state,settings,anchor});
return score;
},
},
});
bookshelfStore.addEventListener('warning',event => toast(event.detail.message));
bookshelfStore.addEventListener('contentchange',() => {
try { localStorage.removeItem(librarySearchKey); } catch {  }
});
let syncCancelDisplay;
bookshelfStore.addEventListener('statuschange',() => {
const message = bookshelfStore.applyingChanges ? 'Applying score changes' : null;
if (message && syncCancelDisplay === undefined) {
syncCancelDisplay = _shade_.cancel.style.display;
_shade_.cancel.style.display = 'none'; _shade_.show(message,0);
} else if (!message && syncCancelDisplay !== undefined) {
_shade_.cancel.style.display = syncCancelDisplay; syncCancelDisplay = undefined; _shade_.hide();
}
});
bookshelfStore.inBackground = document.hidden;
window.addEventListener('online',() => bookshelfStore.autoSync?.request(0));
window.addEventListener('offline',() => bookshelfStore.notifyStatus());
window._bookshelf_ = bookshelfStore;
document.addEventListener('visibilitychange', () => {
bookshelfStore.inBackground = document.hidden;
if (!document.hidden) bookshelfStore.autoSync?.request(0);
const score = Score.activeScore;
if (document.visibilityState === 'hidden' && score?.libraryDocumentId) bookshelfStore.flush(score).catch(error => {
score.librarySaveError = error; toast('Library save failed: ' + error.message);
});
});
window.addEventListener('beforeunload', event => {
const score = Score.activeScore;
if (score?.libraryDocumentId && (score.dirty || score.librarySaveGeneration !== score.librarySavedGeneration)) { event.preventDefault(); event.returnValue = ''; }
});
class BookshelfView {
static css = css('Bookshelf', `
.LibraryWindow {
--library-bg:var(--ui-bg); --library-surface:var(--ui-surface); --library-line:var(--ui-line);
--library-text:var(--ui-text); --library-muted:var(--ui-muted); --library-brand:var(--ui-primary);
--library-selected:var(--ui-selected); --library-hover:var(--ui-hover);
position:fixed; inset:0; pointer-events:none; font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;
color:var(--library-text); text-align:left; color-scheme:light;
}
[data-theme=Dark] .LibraryWindow {
--library-bg:var(--ui-bg); --library-surface:var(--ui-surface); --library-line:var(--ui-line);
--library-text:var(--ui-text); --library-muted:var(--ui-muted); --library-brand:var(--ui-primary);
--library-selected:var(--ui-selected); --library-hover:var(--ui-hover); color-scheme:dark;
}
.LibraryWindow[hidden], .LibraryWindow [hidden] { display:none !important; }
.LibraryWindow *, .LibraryWindow *::before, .LibraryWindow *::after { box-sizing:border-box; }
.LibraryWindow .LibraryWindow__panel, .LibraryWindow .LibraryWindow__panel * { user-select:text; -webkit-user-select:text; }
.LibraryWindow .LibraryWindow__panel * { -webkit-touch-callout:default; }
.LibraryWindow button, .LibraryWindow summary, .LibraryWindow select { user-select:none; -webkit-user-select:none; }
.LibraryWindow .LibraryWindow__panel {
pointer-events:auto; position:absolute; inset:0; display:flex; flex-direction:column;
width:100%; height:100%; max-width:none; max-height:none; margin:0;
border:0; border-radius:0; box-shadow:none; background:var(--library-bg); color:var(--library-text);
}
.LibraryWindow[data-full=false] .LibraryWindow__panel {
right:auto; width:min(460px,100vw); border-right:1px solid var(--library-line);
box-shadow:12px 0 32px #172b4d14;
}
.LibraryWindow__header {
display:flex; align-items:center; justify-content:space-between; gap:16px;
flex:none; height:72px; padding:0 24px; border-bottom:1px solid var(--library-line); background:var(--library-bg);
}
.LibraryWindow__brand { display:flex; gap:12px; align-items:center; }
.LibraryWindow__mark { color:var(--library-brand); font-size:28px; line-height:1; }
.LibraryWindow h1 { margin:0; font-size:22px; font-weight:650; letter-spacing:-.5px; }
.LibraryWindow__actions { display:flex; align-items:center; gap:8px; }
.LibraryWindow__body { flex:1; min-height:0; }
.LibraryWindow button, .LibraryWindow input, .LibraryWindow select { font:inherit; color:inherit; margin:0; }
.LibraryWindow button, .LibraryWindow summary { -webkit-tap-highlight-color:transparent; }
.LibraryWindow button {
border:1px solid var(--library-line); border-radius:8px; background:var(--library-bg);
padding:9px 14px; min-height:40px; cursor:pointer; line-height:1.4; transition:background .12s;
}
.LibraryWindow button:hover { background:var(--library-hover); }
.LibraryWindow button:disabled { cursor:default; opacity:.45; }
.LibraryWindow :is(button,input,select,summary):focus-visible { outline:2px solid var(--library-brand); outline-offset:3px; }
.LibraryWindow input:not([type=checkbox]), .LibraryWindow select {
width:100%; min-width:0; max-width:100%; min-height:42px; padding:9px 12px;
border:1px solid var(--library-line); border-radius:8px; background:var(--library-bg);
}
.LibraryWindow input[type=checkbox] { accent-color:var(--library-brand); width:18px; height:18px; vertical-align:middle; }
.LibraryWindow input::placeholder { color:var(--library-muted); opacity:1; }
.LibraryWindow__icon { width:40px; height:40px; padding:0 !important; border:0 !important; font-size:24px !important; }
.LibraryWindow .LibraryWindow__primary { background:var(--library-brand); color:var(--library-bg); border-color:transparent; font-weight:600; }
.LibraryWindow .LibraryWindow__primary:hover { filter:brightness(.95); }
.Bookshelf { display:flex; flex-direction:column; height:100%; min-height:0; }
.Bookshelf__workspace { display:grid; grid-template-columns:208px minmax(0,1fr); min-height:0; flex:1; position:relative; }
.Bookshelf__sidebar { background:var(--library-surface); padding:28px 12px; overflow:auto; border-right:1px solid var(--library-line); }
.Bookshelf__nav-title { margin:0 12px 12px; color:var(--library-muted); font-size:11px; font-weight:700; letter-spacing:1.4px; text-transform:uppercase; }
.Bookshelf__nav { display:flex; flex-direction:column; gap:4px; }
.LibraryWindow .Bookshelf__nav button { border:0; text-align:left; border-radius:8px; padding:12px; background:transparent; }
.LibraryWindow .Bookshelf__nav button[aria-pressed=true] { background:var(--library-selected); color:var(--library-brand); font-weight:600; }
.Bookshelf__nav button span { display:inline-block; width:26px; opacity:.7; }
.Bookshelf__main { display:flex; flex-direction:column; min-width:0; min-height:0; }
.Bookshelf__toolbar { display:flex; gap:12px; align-items:center; padding:24px 32px 16px; flex:none; }
.LibraryWindow .Bookshelf__search { border:0 !important; background:var(--library-surface) !important; border-radius:12px !important; height:46px; }
.Bookshelf__heading { display:flex; justify-content:space-between; align-items:baseline; gap:16px; padding:0 32px 16px; }
.Bookshelf__heading h2 { font-size:20px; font-weight:600; margin:0; letter-spacing:-.3px; }
.Bookshelf__count { color:var(--library-muted); font-size:13px; white-space:nowrap; }
.Bookshelf__context { display:flex; gap:8px; flex-wrap:wrap; padding:0 32px 16px; }
.Bookshelf__context:has(select[hidden]) { display:none; }
.Bookshelf__context select { flex:1 1 180px; }
.Bookshelf__context input { flex:1 1 180px; }
.Bookshelf__results { overflow:auto; overscroll-behavior:contain; min-height:0; flex:1; padding:0 32px 24px; }
.Bookshelf__row { display:grid; grid-template-columns:44px minmax(0,1fr) 40px; column-gap:14px; padding:16px 0; border-bottom:1px solid var(--library-line); align-items:center; cursor:pointer; }
.Bookshelf__row[data-selected=true] { background:var(--library-selected); border-radius:10px; padding-left:12px; padding-right:12px; }
.Bookshelf__type { grid-row:1 / span 4; width:42px; height:50px; display:grid; place-items:center; border:1px solid var(--library-line); border-radius:7px; background:var(--library-surface); font-size:10px; font-weight:700; color:var(--library-muted); letter-spacing:.5px; }
.LibraryWindow .Bookshelf__open { grid-column:2; padding:0; border:0; border-radius:3px; min-height:26px; background:none; text-align:left; font-weight:600; overflow-wrap:anywhere; }
.LibraryWindow .Bookshelf__open:hover { color:var(--library-brand); }
.Bookshelf__row > div:not(.Bookshelf__type) { grid-column:2; color:var(--library-muted); font-size:12px; overflow-wrap:anywhere; }
.Bookshelf__row > details { grid-column:3; grid-row:1; align-self:start; }
.Bookshelf__row > details > summary { cursor:pointer; width:36px; height:36px; display:grid; place-items:center; font-size:22px; border-radius:50%; list-style:none; }
.Bookshelf__row > details > summary:hover { background:var(--library-hover); }
.LibraryWindow summary::-webkit-details-marker { display:none; }
.Bookshelf__footer { display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:56px; padding:10px 24px; border-top:1px solid var(--library-line); background:var(--library-bg); flex:none; }
.Bookshelf__footer { flex-wrap:wrap; }
.Bookshelf__transfer-progress { width:100%; font-size:13px; overflow-wrap:anywhere; }
.Bookshelf__waiting-files { margin-top:8px; padding:12px; border:1px solid var(--library-line); border-radius:8px; }
.Bookshelf__waiting-files h3 { margin:0 0 8px; font-size:14px; }
.Bookshelf__waiting-files ol { max-height:22dvh; overflow:auto; margin:8px 0; padding-left:24px; }
.Bookshelf__waiting-files li { padding:4px; overflow-wrap:anywhere; }
.Bookshelf__transfer-progress progress { display:block; width:100%; height:8px; margin:8px 0; accent-color:var(--library-brand); }
.Bookshelf__download { grid-column:2; justify-self:start; }
.Bookshelf__save-state { display:flex; gap:16px; flex-wrap:wrap; color:var(--library-muted); font-size:12px; }
.LibraryWindow .Bookshelf__sync { border:0; color:var(--library-brand); padding:6px 10px; white-space:nowrap; min-height:36px; }
.Bookshelf__message:empty { display:none; }
.Bookshelf__message { padding:10px 24px; background:var(--library-selected); font-size:13px; flex:none; overflow-wrap:anywhere; }
.Bookshelf__permission { padding:12px 24px; background:var(--library-selected); font-size:13px; flex:none; }
.Bookshelf__permission button { margin-top:8px; }
.LibraryWindow details.Bookshelf__popover > summary { display:flex; align-items:center; justify-content:center; gap:8px; min-height:40px; padding:8px 12px; list-style:none; border-radius:8px; cursor:pointer; white-space:nowrap; }
.LibraryWindow svg { flex:none; vertical-align:middle; pointer-events:none; }
.Bookshelf__popover[open] > summary { background:var(--library-selected); color:var(--library-brand); }
.Bookshelf__add { position:relative; }
.LibraryWindow .Bookshelf__add > summary { background:var(--library-brand); color:var(--library-bg); font-weight:600; }
.Bookshelf__add-content, .Bookshelf__filter-content { position:absolute; z-index:3; padding:16px; width:300px; max-width:calc(100vw - 32px); background:var(--library-bg); border:1px solid var(--library-line); border-radius:12px; box-shadow:0 8px 28px #172b4d20; }
.Bookshelf__add-content { top:48px; right:0; display:flex; flex-direction:column; gap:8px; }
.Bookshelf__file-input { position:absolute; width:1px !important; height:1px; min-height:0 !important; padding:0 !important; clip-path:inset(50%); overflow:hidden; }
.Bookshelf__filters { position:relative; }
.Bookshelf__filter-content { top:48px; right:0; display:flex; flex-direction:column; gap:12px; }
.Bookshelf__filter-content select[multiple] { min-height:120px; }
.Bookshelf__settings-content { position:absolute; z-index:6; inset:72px 0 var(--library-footer-height,56px); padding:24px max(24px,calc((100% - 800px)/2)); overflow:auto; background:var(--library-bg); }
.Bookshelf__settings-content h2 { margin:16px 0 24px; font-size:24px; }
.Bookshelf__settings-content > details { border-bottom:1px solid var(--library-line); padding:16px 0; }
.Bookshelf__settings-content > details > summary { font-weight:600; list-style:none; cursor:pointer; padding:8px 0; }
.Bookshelf__settings-content > details[open] > :not(summary) { display:block; margin:12px 0; max-width:100%; }
.Bookshelf__settings-content label:has(input[type=checkbox]) { display:flex !important; gap:8px; align-items:center; }
.Bookshelf__settings-content :is(p,div) { overflow-wrap:anywhere; }
.Bookshelf__storage-option { padding:16px; border:1px solid var(--library-line); border-radius:12px; background:var(--library-surface); }
.Bookshelf__storage-option[data-active=true] { border-color:var(--library-brand); background:var(--library-selected); }
.Bookshelf__storage-heading { display:flex; align-items:center; flex-wrap:wrap; gap:10px; margin:0; }
.Bookshelf__storage-badge { padding:2px 9px; border-radius:999px; background:var(--library-bg); color:var(--library-brand); font-size:12px; font-weight:600; white-space:nowrap; }
.Bookshelf__storage-option p { margin:8px 0; }
.Bookshelf__storage-option button { margin:8px 8px 0 0; }
.Bookshelf__settings-content pre { font-size:12px; }
.Bookshelf__inspector { min-width:0; min-height:0; overflow:auto; padding:24px; background:var(--library-bg); border-left:1px solid var(--library-line); }
.Bookshelf__inspector h2 { font-size:20px; line-height:1.4; margin:20px 0 8px; overflow-wrap:anywhere; }
.Bookshelf__inspector p { color:var(--library-muted); font-size:13px; overflow-wrap:anywhere; }
.Bookshelf__inspector > button { margin:8px 0 20px; }
.Bookshelf__inspector details > summary { cursor:pointer; list-style:none; font-weight:600; color:var(--library-brand); padding:12px 0; }
.Bookshelf__record-section { width:100%; display:flex; flex-wrap:wrap; gap:8px; border-top:1px solid var(--library-line); padding:16px 0; }
.Bookshelf__record-section h4 { width:100%; margin:0 0 8px; font-size:13px; font-weight:600; }
.Bookshelf__record-section > input { flex:1 1 100%; }
.Bookshelf__record-section button { font-size:13px; }
.Bookshelf__record-section:last-child button { color:#b42332; }
.Bookshelf__empty { padding:64px 16px; text-align:center; color:var(--library-muted); }
.Bookshelf__empty-mark { font-size:40px; color:var(--library-line); margin-bottom:16px; }
.Bookshelf__empty h3 { color:var(--library-text); font-size:18px; font-weight:600; margin:0 0 8px; }
.Bookshelf__empty p { font-size:13px; margin:0; }
.Bookshelf__compact-mode { display:none; }
.LibraryWindow[data-full=false] .Bookshelf__workspace { grid-template-columns:minmax(0,1fr); }
.LibraryWindow[data-full=false] .Bookshelf__sidebar { display:none; }
.LibraryWindow[data-full=false] .Bookshelf__compact-mode { display:block; }
.LibraryWindow[data-full=false] .Bookshelf__toolbar { padding:20px 20px 12px; }
.LibraryWindow[data-full=false] .Bookshelf__heading, .LibraryWindow[data-full=false] .Bookshelf__context { padding-left:20px; padding-right:20px; }
.LibraryWindow[data-full=false] .Bookshelf__results { padding-left:20px; padding-right:20px; }
.LibraryWindow[data-full=false] .LibraryWindow__header { padding:0 16px; gap:8px; }
.LibraryWindow[data-full=false] .LibraryWindow__brand { gap:8px; }
.LibraryWindow[data-full=false] .Bookshelf__add-content { position:fixed; top:80px; left:16px; right:auto; }
.LibraryWindow[data-full=false] .Bookshelf__settings > summary { font-size:0; width:40px; padding:0; }
.LibraryWindow[data-full=false] .Bookshelf__settings > summary { gap:0; }
.Bookshelf[data-detail-open=true] .Bookshelf__inspector { position:absolute; z-index:4; inset:0; }
@media(min-width:1100px) {
.LibraryWindow[data-mode=full] .Bookshelf[data-detail-open=true] .Bookshelf__workspace { grid-template-columns:208px minmax(0,1fr) 360px; }
.LibraryWindow[data-mode=full] .Bookshelf[data-detail-open=true] .Bookshelf__inspector { position:static; }
}
@media(max-width:720px) {
.LibraryWindow__header { height:64px; padding:0 16px; gap:8px; }
.LibraryWindow h1 { font-size:20px; }
.LibraryWindow__brand { gap:8px; }
.LibraryWindow__mark { font-size:24px; }
.LibraryWindow__actions { gap:2px; }
.LibraryWindow__actions > .LibraryWindow__icon { width:40px; }
.LibraryWindow .Bookshelf__settings > summary { font-size:0; width:36px; padding:0; }
.LibraryWindow .Bookshelf__settings > summary { gap:0; }
.Bookshelf__workspace { grid-template-columns:minmax(0,1fr); }
.Bookshelf__sidebar { display:none; }
.Bookshelf__compact-mode { display:block; }
.Bookshelf__toolbar { padding:16px 16px 12px; }
.Bookshelf__heading, .Bookshelf__context { padding-left:16px; padding-right:16px; }
.Bookshelf__results { padding-left:16px; padding-right:16px; }
.Bookshelf__footer { padding:8px 16px; }
.Bookshelf__save-state { gap:2px; flex-direction:column; font-size:11px; }
.Bookshelf__settings-content { top:64px; padding:20px; }
.LibraryWindow .Bookshelf__add-content { position:fixed; top:72px; left:16px; right:16px; width:auto; max-width:none; }
}
@media(prefers-reduced-motion:no-preference) {
.LibraryWindow:not([hidden]) .LibraryWindow__panel { animation:library-enter .16s ease-out; }
@keyframes library-enter { from { opacity:0; translate:-12px 0; } to { opacity:1; translate:0 0; } }
}
`);
constructor(panel, model = bookshelfStore) {
this.model = model;
this.panel = panel;
this.elm = document.createElement('div');
this.elm.className = 'Bookshelf';
this.elm.dataset.detailOpen = 'false';
this.resize = () => this.updatePresentation();
this.resizeObserver = new ResizeObserver(this.resize);
this.resizeObserver.observe(panel.panel);
const input = document.createElement('input');
input.type = 'file'; input.multiple = true; input.accept = '.pdf,.mscz,.mxl,.musicxml,.xml';
input.setAttribute('aria-label', 'Import scores');
const search = document.createElement('input');
search.type = 'search'; search.placeholder = 'Search songs'; search.setAttribute('aria-label', 'Search songs');
panel.listeners.push(listen(this.model,'contentchange',() => {
search.value = ''; this.refresh?.();
}));
const status = document.createElement('div'); status.setAttribute('role', 'status');
const deviceStatus = document.createElement('div'); deviceStatus.setAttribute('aria-label','Device save status');
const cloudStatus = document.createElement('div'); cloudStatus.setAttribute('aria-label','Cloud sync status');
const updateStatus = () => { deviceStatus.textContent = this.model.deviceStatus(); cloudStatus.textContent = this.model.cloudStatus() + (this.model.autoSettings?.enabled === false ? ' · Automatic sync off' : ''); };
const permission = document.createElement('div'); permission.hidden = true;
const permissionMessage = document.createElement('div');
const allowAccess = document.createElement('button'); allowAccess.textContent = 'Allow library folder access';
permission.append(permissionMessage, allowAccess);
const results = document.createElement('div');
const tagFilter = document.createElement('select'); tagFilter.multiple = true; tagFilter.setAttribute('aria-label', 'Filter by tags');
const tagMatch = document.createElement('select'); tagMatch.setAttribute('aria-label', 'Tag matching');
tagMatch.add(new Option('Any selected tag', 'any')); tagMatch.add(new Option('All selected tags', 'all'));
this.elm.append(input, search, status, deviceStatus, cloudStatus, permission, results);
panel.listeners.push(listen(this.model,'statuschange',updateStatus)); updateStatus();
let refreshTimer;
const refreshAfterChange = () => {
if (!this.elm.isConnected || !this.elm.getClientRects().length) return;
clearTimeout(refreshTimer);
refreshTimer = setTimeout(() => {
if (!this.elm.isConnected || !this.elm.getClientRects().length) return;
const selection = window.getSelection();
if (!selection.isCollapsed && this.elm.contains(selection.anchorNode)) { this.refreshNeeded = true; return; }
if (this.elm.contains(document.activeElement) && document.activeElement.matches('input,select,textarea')) { this.refreshNeeded = true; return; }
this.refresh?.();
},50);
};
panel.listeners.push(listen(this.model,'datachange',refreshAfterChange));
panel.listeners.push(listen(this.elm,'focusout',() => { if (this.refreshNeeded) { this.refreshNeeded = false; refreshAfterChange(); } }));
panel.listeners.push(listen(document,'selectionchange',() => {
if (this.refreshNeeded && window.getSelection().isCollapsed) { this.refreshNeeded = false; refreshAfterChange(); }
}));
const updatePermission = () => {
permission.hidden = !this.model.permissionRequired;
permissionMessage.textContent = 'Access is required for library folder: ' + (this.model.storage?.directory?.name || '');
};
panel.listeners.push(listen(this.model, 'permissionchange', updatePermission));
updatePermission();
const importCurrent = document.createElement('button'); importCurrent.textContent = 'Import current score';
this.elm.insertBefore(importCurrent, results);
this.elm.insertBefore(tagFilter, results); this.elm.insertBefore(tagMatch, results);
const mode = document.createElement('select');
mode.setAttribute('aria-label', 'Library view');
for (const [value, label] of [['documents', 'All scores'], ['entries', 'Songs'], ['bookshelves', 'Bookshelves'], ['playlists', 'Playlists'], ['tags', 'Tags'], ['history', 'Previous and deleted scores']]) {
const option = new Option(label, value); option.hidden = value === 'history'; mode.add(option);
}
const categoryKey = 'rostrum-library-category';
const searchKey = librarySearchKey;
try {
search.value = localStorage.getItem(searchKey) || '';
const saved = localStorage.getItem(categoryKey);
if ([...mode.options].some(option => option.value === saved)) mode.value = saved;
} catch {  }
const collection = document.createElement('select'); collection.setAttribute('aria-label', 'Collection');
this.changeCategory = value => {
if (![...mode.options].some(option => option.value === value)) return;
this.closeRecord(); mode.value = value; collection.value = '';
try { localStorage.setItem(categoryKey,value); } catch {  }
this.refresh();
};
const createName = document.createElement('input'); createName.placeholder = 'New collection name'; createName.setAttribute('aria-label', 'New collection name');
const create = document.createElement('button'); create.textContent = 'Create';
this.elm.insertBefore(mode, results); this.elm.insertBefore(collection, results);
this.elm.insertBefore(createName, results); this.elm.insertBefore(create, results);
const run = async (task, clearStatus = true) => {
try { if (clearStatus) status.textContent = ''; await task(); }
catch (error) { status.textContent = error.message; }
};
allowAccess.onclick = () => run(async () => {
allowAccess.disabled = true;
try { await this.model.reauthorizeStorage(); await this.refresh(); status.textContent = 'Library folder access restored'; }
finally { allowAccess.disabled = false; }
});
const transfers = document.createElement('details');
const transferTitle = document.createElement('summary'); transferTitle.textContent = 'Library settings'; transfers.append(transferTitle);
const settingsSection = title => {
const section = document.createElement('details');
const summary = document.createElement('summary'); summary.textContent = title;
section.append(summary); transfers.append(section); return section;
};
const storageSettings = settingsSection('Storage location');
const syncSettings = settingsSection('Cloud sync');
const backupSettings = settingsSection('Backup and restore');
const historySettings = settingsSection('History and conflicts');
const backup = document.createElement('button'); backup.textContent = 'Export library';
const restore = document.createElement('input'); restore.type = 'file'; restore.accept = '.zip,application/zip'; restore.setAttribute('aria-label', 'Import library backup');
const explanation = document.createElement('div'); explanation.textContent = 'Import adds the saved library and keeps conflicting edits for review.';
const review = document.createElement('button'); review.textContent = 'Review conflicting edits';
const conflictResults = document.createElement('div');
const folder = document.createElement('button'); folder.textContent = 'Choose local folder…';
const defaultLibrary = document.createElement('button'); defaultLibrary.textContent = 'Use OPFS';
const browserLibrary = document.createElement('button'); browserLibrary.textContent = 'Use IndexedDB';
const location = document.createElement('p'); location.translate = false; location.setAttribute('aria-label','Library folder'); location.hidden = true;
backupSettings.append(backup, explanation, restore);
historySettings.append(review, conflictResults);
const history = document.createElement('button'); history.textContent = 'Previous and deleted scores';
history.onclick = () => this.changeCategory('history');
historySettings.prepend(history);
this.elm.insertBefore(transfers, results);
const storageBlocked = document.createElement('p');
storageBlocked.setAttribute('role','status'); storageBlocked.setAttribute('aria-label','Storage location unavailable reason');
storageBlocked.hidden = true; storageSettings.append(storageBlocked);
const storageRows = new Map();
for (const [kind,title,description,choose] of [
['directory','Local directory','A folder you choose on this device.',folder],
['opfs','OPFS','Files stored privately inside this browser.',defaultLibrary],
['indexeddb','IndexedDB','Library records and files stored in this browser’s database.',browserLibrary]
]) {
const row = document.createElement('section'); row.dataset.storageKind = kind; row.className = 'Bookshelf__storage-option';
const heading = document.createElement('h4'); heading.className = 'Bookshelf__storage-heading'; heading.textContent = title;
const badge = document.createElement('span'); badge.className = 'Bookshelf__storage-badge'; badge.textContent = 'In use'; badge.hidden = true; heading.append(badge);
const info = document.createElement('p'); info.textContent = description;
const unavailable = document.createElement('p'); unavailable.setAttribute('role','status');
const remove = document.createElement('button'); remove.textContent = 'Delete library data'; remove.setAttribute('aria-label','Delete ' + title + ' library data'); remove.disabled = true;
row.append(heading,info,choose,remove,unavailable); storageSettings.append(row);
if (kind === 'directory') row.insertBefore(location,choose);
storageRows.set(kind,{row,badge,choose,remove,unavailable});
}
let storageCapabilities = {};
const updateStorageControls = () => {
const active = this.model.storage?.kind || 'opfs';
const busy = this.model.operationBlock('storage');
storageBlocked.textContent = busy ? 'Storage location cannot be changed right now. ' + busy : '';
storageBlocked.hidden = !busy;
for (const [kind,row] of storageRows) {
row.row.dataset.active = String(active === kind);
if (active === kind) row.row.setAttribute('aria-current','true'); else row.row.removeAttribute('aria-current');
row.badge.hidden = active !== kind;
row.choose.disabled = !storageCapabilities[kind] || !!busy;
row.unavailable.textContent = !storageCapabilities[kind] ? 'Unavailable in this browser or context.' : '';
row.unavailable.hidden = !!storageCapabilities[kind];
row.remove.disabled = active !== kind || !!busy || !!this.model.storageDeleted;
}
location.textContent = active === 'directory' ? this.model.storage?.directory?.name || '' : '';
location.hidden = !location.textContent;
};
this.model.storageCapabilities().then(capabilities => { storageCapabilities = capabilities; updateStorageControls(); });
panel.listeners.push(listen(this.model,'statuschange',updateStorageControls));
updateStorageControls();
for (const [kind,row] of storageRows) row.remove.onclick = () => run(async () => {
if ((this.model.storage?.kind || 'opfs') !== kind) return;
const info = await this.model.deletionSummary();
const target = kind === 'directory' ? 'Local directory: ' + this.model.storage.directory.name : kind === 'opfs' ? 'OPFS' : 'IndexedDB';
const message = `Delete library data from ${target}?\n\n${info.scores} score records and all managed local files will be removed. Other files and the folder itself remain. Cloud data, original files and sync settings will not be deleted.\n\n` +
(!this.model.hasSyncDestination() ? 'Warning: cloud sync is not configured. This data cannot be restored from library cloud sync.\n\n' : info.pending || info.localOnly || info.unverified ? `Warning: ${info.pending} changes not confirmed as synced; ${info.localOnly} local files not confirmed in the cloud. Unsynced data will be lost.\n\n` : 'The last sync confirmed the cloud copy. Restore requires access to that cloud.\n\n') +
(this.model.hasSyncDestination() && this.model.autoSettings?.enabled !== false ? 'This storage location stays selected. Automatic sync will restore the cloud library; score files download when opened.' : 'This storage location stays selected with an empty library. Automatic restore is off. Use Apply and sync to restore when a cloud destination is configured.');
if (!window.confirm(message)) return;
await this.model.deleteStorage(); await this.refresh();
status.textContent = 'Library data deleted from ' + target + '. ' + (this.model.hasSyncDestination() && this.model.autoSettings?.enabled !== false ? 'Automatic cloud restore requested.' : 'The library is empty. Automatic restore is off.');
});
const cloud = document.createElement('select'); cloud.setAttribute('aria-label', 'Library cloud service'); cloud.add(new Option('Choose cloud service', ''));
for (const source of [Score.sources.gdrive, Score.sources.dbx, Score.sources.odrive, Score.sources.pcloud]) cloud.add(new Option(source, source));
const cloudPath = document.createElement('output'); cloudPath.setAttribute('aria-label', 'Library cloud folder'); cloudPath.translate = false;
cloudPath.style.cssText = 'display:block;overflow-wrap:anywhere;padding:12px;border:1px solid var(--library-line);border-radius:8px;background:var(--library-surface);';
const chooseCloudFolder = document.createElement('button'); chooseCloudFolder.type = 'button'; chooseCloudFolder.textContent = 'Choose sync folder…'; chooseCloudFolder.setAttribute('aria-label','Choose sync folder');
const cloudInfo = document.createElement('div'); cloudInfo.textContent = 'Choose a dedicated cloud folder, then Apply and sync. Use the same folder on each device. Changes sync automatically; scores download when opened or kept offline.';
const autoLabel = document.createElement('label'); autoLabel.textContent = 'Automatic library sync';
const auto = document.createElement('input'); auto.type = 'checkbox'; auto.setAttribute('aria-label','Automatic library sync'); auto.checked = this.model.autoSettings?.enabled !== false; autoLabel.append(auto);
auto.onchange = () => run(async () => { await this.model.setAutoSync(auto.checked); });
panel.listeners.push(listen(this.model,'statuschange',() => { auto.checked = this.model.autoSettings?.enabled !== false; }));
const sync = document.createElement('button'); sync.textContent = 'Sync library now';
const applySync = document.createElement('button'); applySync.textContent = 'Apply and sync'; applySync.onclick = () => sync.click();
const checkSync = document.createElement('button'); checkSync.textContent = 'Check sync status';
const allSync = document.createElement('button'); allSync.textContent = 'Sync and download all scores';
const syncCounts = document.createElement('p'); syncCounts.setAttribute('aria-label','File sync counts');
const restoreChoices = document.createElement('div'); restoreChoices.setAttribute('aria-label','Conflicting library replacements');
syncSettings.append(cloud,cloudPath,chooseCloudFolder,cloudInfo,autoLabel,checkSync,applySync,syncCounts,allSync,restoreChoices);
this.elm.insertBefore(sync, transfers);
const backupInfo = document.createElement('div'); backupInfo.textContent = 'A complete ZIP backup downloads any missing score files first.'; backupSettings.append(backupInfo);
let cloudTouched = false, draftCloud = null, pickingCloudFolder = false, applyingCloud = false;
const updateCloudControls = () => {
restoreChoices.replaceChildren();
const choices = this.model.syncError?.restoreChoices || [];
restoreChoices.hidden = !choices.length;
if (choices.length) {
const message = document.createElement('p'); message.textContent = 'Choose the replacement to keep. Other generations and their unsynced edits will be discarded.'; restoreChoices.append(message);
for (const id of choices) {
const choose = document.createElement('button'); choose.textContent = 'Keep replacement: ' + id;
choose.style.cssText = 'max-width:100%;overflow-wrap:anywhere;margin:4px 4px 4px 0;';
choose.disabled = !!this.model.operationBlock('sync');
choose.onclick = () => run(async () => {
if (!window.confirm('Use replacement ' + id + '? Edits from the other generations will be discarded.')) return;
await this.model.chooseRestoreGeneration(id); await this.refresh();
}); restoreChoices.append(choose);
}
}
const chosen = draftCloud && draftCloud.source === cloud.value;
const path = chosen ? draftCloud.path.replace(/^\/+|\/+$/g,'') : '';
const destination = chosen ? draftCloud.source + ':' + (path ? '/' + path : '') : '';
const applied = chosen && this.model.cloudSelection?.source === draftCloud.source && this.model.cloudSelection?.path === draftCloud.path;
const needs = this.model.syncNeeds?.destination === destination ? this.model.syncNeeds : null;
const known = needs?.checkedAt && !needs.error;
const busy = pickingCloudFolder || applyingCloud || this.model.operationBlock('sync');
cloudPath.textContent = chosen ? draftCloud.path || '/' : 'No folder selected';
chooseCloudFolder.disabled = !cloud.value || busy || !!this.model.transferState.size;
sync.disabled = applySync.disabled = !chosen || busy || !!this.model.checkingCloud || applied && (!known || !needs.pending && !needs.uploads);
allSync.disabled = !chosen || busy || !!this.model.checkingCloud || applied && (!known || !needs.pending && !needs.uploads && !needs.downloads);
checkSync.disabled = !chosen || busy || !!this.model.checkingCloud;
syncCounts.textContent = this.model.checkingCloud ? 'Checking cloud status…' : known
? `Upload pending: ${needs.uploads} files · Download pending: ${needs.downloads} files` + (needs.pending ? ' · Library changes pending; file counts update after sync.' : '')
: needs?.error ? 'Could not check cloud status: ' + needs.error : chosen ? 'Check sync status to count pending files.' : 'Choose a sync folder first.';
cloud.disabled = busy || !!this.model.transferState.size;
};
const checkCloudStatus = async (interactive = false) => {
if (!draftCloud || this.model.syncPending || this.model.deletingStorage) return;
try { await this.model.checkCloudSelection(draftCloud.source,draftCloud.path,{interactive}); }
catch {  }
updateCloudControls();
};
checkSync.onclick = () => checkCloudStatus(true);
syncSettings.addEventListener('toggle',() => { if (syncSettings.open) checkCloudStatus(); });
const preloadCloud = () => { if (cloud.value === Score.sources.gdrive) FileSrc.get(cloud.value).preloadGIS?.(); };
cloud.onchange = () => { cloudTouched = true; draftCloud = null; preloadCloud(); updateCloudControls(); };
this.model.savedCloudSelection().then(saved => {
if (!cloudTouched && saved && typeof saved.path === 'string') {
cloud.value = saved.source;
if (cloud.value) draftCloud = {source:saved.source,path:saved.path};
preloadCloud(); updateCloudControls();
if (transfers.open) checkCloudStatus();
}
}).catch(() => {});
chooseCloudFolder.onclick = () => run(async () => {
const service = cloud.value;
if (!service) return;
cloudTouched = true; pickingCloudFolder = true; updateCloudControls();
try {
const picker = this.cloudFolderPicker = new CloudFolderPicker(service,draftCloud?.source === service ? draftCloud.path : '');
const path = await picker.show();
if (path !== null && cloud.value === service && !panel.closing) {
draftCloud = {source:service,path}; status.textContent = 'Folder selected. Use Apply and sync to change the sync destination.';
}
} finally {
this.cloudFolderPicker = null; pickingCloudFolder = false; updateCloudControls();
if (chooseCloudFolder.isConnected && !chooseCloudFolder.disabled) chooseCloudFolder.focus({preventScroll:true});
}
});
sync.onclick = () => run(async () => {
if (!draftCloud || draftCloud.source !== cloud.value) throw new Error('Choose a cloud folder first.');
const selected = {...draftCloud}; applyingCloud = true; updateCloudControls(); status.textContent = 'Syncing library';
try {
const result = await this.model.syncCloud(selected.source,selected.path); await this.refresh();
status.textContent = `Synced library; ${result.conflicts} conflicting items to review.`;
} finally { applyingCloud = false; updateCloudControls(); }
});
allSync.onclick = () => run(async () => {
if (!draftCloud) return;
const selected = {...draftCloud};
const result = await this.model.syncAllScores(selected.source,selected.path);
await this.refresh();
status.textContent = result.failed ? `Full sync finished with ${result.failed} failed files. Retry to download the remaining files.`
: result.phase === 'cancelled' ? 'Full sync stopped. Finished files remain on this device.' : 'All current library scores are on this device.';
});
updateCloudControls();
panel.listeners.push(listen(this.model,'statuschange',updateCloudControls));
folder.onclick = () => run(async () => {
const directory = await window.showDirectoryPicker({ mode: 'readwrite' });
await this.model.configure({ kind: 'directory', directory });
await this.refresh();
});
defaultLibrary.onclick = () => run(async () => {
await this.model.configure({}); await this.refresh();
});
browserLibrary.onclick = () => run(async () => {
await this.model.configure({ kind: 'indexeddb' }); await this.refresh();
});
backup.onclick = () => run(async () => {
const bytes = await this.model.exportBackup();
await window._localFs_.fileSaveLegacy(new Blob([bytes], { type: 'application/zip' }), { fileName: 'rostrum-library-' + new Date().toISOString().slice(0,10) + '.zip' });
status.textContent = this.model.emergencyBackup ? 'Emergency backup exported; library storage could not be updated.' : 'Library exported';
});
restore.onchange = () => run(async () => {
if (!restore.files[0]) return;
restore.disabled = true;
try {
const result = await this.model.importBackup(restore.files[0]);
await this.refresh();
status.textContent = `Imported ${result.importedFiles} scores; ${result.conflicts} conflicting items to review.`;
} finally { restore.disabled = false; restore.value = ''; }
});
review.onclick = () => run(async () => {
const conflicts = await this.model.conflicts(); conflictResults.replaceChildren();
if (!conflicts.length) { conflictResults.textContent = 'No conflicting edits'; return; }
for (const conflict of conflicts) {
const section = document.createElement('div');
for (const change of conflict.alternatives) {
const row = JSON.parse(change.payload_json), metadata = JSON.parse(row.metadata_json || '{}');
const title = document.createElement('div');
title.textContent = [metadata.title || metadata.displayName || metadata.name || row.name || 'Saved item', row.deleted_at ? 'Deleted' : 'Kept', change.created_at].join(' · ');
const details = document.createElement('details'), summary = document.createElement('summary'); summary.textContent = 'Compare saved values';
const values = document.createElement('pre'); values.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;text-align:left';
values.textContent = JSON.stringify({ ...metadata, ...(row.content_json ? { writing: JSON.parse(row.content_json) } : {}), ...(row.settings_json ? { settings: JSON.parse(row.settings_json) } : {}) }, null, 2);
details.append(summary, values);
const choose = document.createElement('button'); choose.textContent = 'Use this version';
choose.onclick = () => run(async () => {
await this.model.resolveConflict({ table: conflict.table, id: conflict.id, revisionId: change.id,
expectedRevisionIds: conflict.alternatives.map(option => option.id) });
conflictResults.replaceChildren(); await this.refresh(); review.click();
});
section.append(title, details, choose);
}
conflictResults.append(section);
}
});
const records = (table, parent, id) => this.model.records(table,parent,id);
const label = row => row.name || JSON.parse(row.metadata_json).title || JSON.parse(row.metadata_json).displayName || JSON.parse(row.metadata_json).name;
const button = (container, text, task) => {
const b = document.createElement('button'); b.textContent = text;
b.onclick = () => run(async () => { await task(); await this.refresh(); }); container.append(b); return b;
};
let references = {};
const choose = (container, table, title, task) => {
const options = references[table] || [];
const select = document.createElement('select'); select.setAttribute('aria-label', title);
select.add(new Option(title, ''));
for (const option of options) select.add(new Option(label(option), option.id));
select.onchange = () => run(async () => { if (select.value) await task(select.value); await this.refresh(); });
container.append(select);
};
let generation = 0;
this.refresh = () => run(async () => {
if (this.model.storageDeleted) {
results.replaceChildren(); const message = document.createElement('p');
message.textContent = 'Library deletion was incomplete. Choose its storage location again in Library settings.'; results.append(message);
this.rowViews?.clear(); this.closeRecord(); updateStatus(); return;
}
const current = ++generation;
const referenceTables = ['tags', 'entry_tags', 'document_tags', 'bookshelves', 'playlists'];
const referenceRows = await Promise.all(referenceTables.map(table => records(table)));
if (current !== generation) return;
references = Object.fromEntries(referenceTables.map((table, i) => [table, referenceRows[i]]));
updateStorageControls();
const selectedTags = [...tagFilter.selectedOptions].map(option => option.value);
tagFilter.replaceChildren();
for (const tag of references.tags) { const option = new Option(tag.name, tag.id); option.selected = selectedTags.includes(tag.id); tagFilter.add(option); }
tagFilter.hidden = tagMatch.hidden = !references.tags.length;
const grouped = ['bookshelves', 'playlists', 'tags'].includes(mode.value);
collection.hidden = createName.hidden = create.hidden = !grouped;
const selected = collection.value;
const groups = grouped ? references[mode.value] : [];
if (current !== generation) return;
collection.replaceChildren(); collection.add(new Option('Choose collection', ''));
for (const group of groups) collection.add(new Option(label(group), group.id));
collection.value = groups.some(g => g.id === selected) ? selected : '';
const filters = {query:search.value,tagIds:selectedTags,matchAll:tagMatch.value === 'all'};
search.placeholder = ['documents','bookshelves'].includes(mode.value) ? 'Search scores' : 'Search songs';
const rows = await this.model.query({mode:mode.value,collection:collection.value,filters});
if (current !== generation) return;
const availability = await this.model.availability();
updateStatus();
if (current !== generation) return;
const expanded = new Set([...this.elm.querySelectorAll('details[open][data-record]')].map(elm => elm.dataset.record));
const selection = window.getSelection();
if (!selection.isCollapsed && results.contains(selection.anchorNode)) { this.refreshNeeded = true; return; }
results.replaceChildren();
this.rowViews = new Map();
this.updateNavigation(mode.value, collection, rows.length, selectedTags.length);
if (grouped && collection.value) {
const group = groups.find(g => g.id === collection.value);
const edit = document.createElement('input'); edit.value = label(group); edit.setAttribute('aria-label', 'Collection name'); results.append(edit);
button(results, 'Rename collection', () => this.model.rename(mode.value,group,edit.value.trim()));
button(results, 'Delete collection', () => this.model.remove(mode.value,group));
if (['bookshelves','playlists'].includes(mode.value)) button(results,'Keep collection offline',async () => {
const ids = await this.model.collectionDocuments(mode.value,collection.value);
await this.model.keepOffline(ids);
});
}
for (const row of rows) {
let card = document.createElement('div'); card.className = 'Bookshelf__row'; results.append(card);
const rowCard = card;
const kind = document.createElement('div'); kind.className = 'Bookshelf__type'; kind.setAttribute('aria-hidden','true');
kind.textContent = /\.pdf$/i.test(JSON.parse(row.metadata_json).originalFilename || JSON.parse(row.metadata_json).displayName || '') ? 'PDF' : row.document_id ? 'SONG' : 'SCORE';
card.append(kind);
const openButton = document.createElement('button');
const metadata = JSON.parse(row.metadata_json);
const documentMetadata = row.document_id ? JSON.parse(row.document_metadata || '{}') : metadata;
const cloudLocations = (documentMetadata.originalLocations || []).filter(location =>
[Score.sources.gdrive,Score.sources.dbx,Score.sources.odrive,Score.sources.pcloud].includes(location.source) && typeof location.path === 'string');
const fileLabel = cloudLocations.length
? cloudLocations.map(location => location.source + ' · ' + (location.path.replace(/\/+$/,'') || '') + '/' + location.name).join('\n')
: documentMetadata.originalFilename || '';
openButton.textContent = metadata.title || metadata.displayName;
openButton.className = 'Bookshelf__open';
openButton.disabled = !!row.unavailable || this.model.opening?.id === (row.document_id || row.id);
if (row.deleted_at) openButton.disabled = true;
const openRecord = () => run(async () => {
if (!await checkUnsaved()) return;
await this.model.openDocument(row.document_id || row.id, row.anchor_json && JSON.parse(row.anchor_json));
panel.hide();
});
const recordKey = (row.document_id ? 'entries:' : 'documents:') + row.id;
openButton.onclick = () => { if (!window.getSelection().isCollapsed) return; return panel.fullView ? this.showRecord(recordKey, false) : openRecord(); };
card.append(openButton);
if (fileLabel) {
const fileLocation = document.createElement('div'); fileLocation.setAttribute('aria-label','Score file location');
fileLocation.translate = false; fileLocation.style.whiteSpace = 'pre-wrap'; fileLocation.textContent = fileLabel;
card.append(fileLocation);
}
rowCard.addEventListener('click', event => {
if (!window.getSelection().isCollapsed) return;
if (!event.target.closest('button,summary,details,input,select')) openButton.click();
});
let downloadButton = null;
const local = availability.get(row.document_id || row.id);
if (local) {
const id = row.document_id || row.id;
const transfer = this.model.downloadState(id);
const state = document.createElement('div');
state.setAttribute('aria-label','Local file status');
state.textContent = [transfer.state ? transfer.state === 'running' ? 'Downloading' : 'Download queued' : local.present ? 'On this device' : local.remote ? 'Cloud only' : 'Not on this device',
local.pinned && (local.present ? 'Kept offline' : 'Offline download requested'),
this.model.hasSyncDestination() ? local.remote ? local.pending ? 'Cloud changes pending' : 'File uploaded' : 'File upload pending' : '', transfer.error].filter(Boolean).join(' · ');
card.append(state);
if (!local.present && !row.unavailable) {
const download = document.createElement('button'); download.type = 'button'; download.className = 'Bookshelf__download';
download.textContent = transfer?.state === 'running' ? 'Downloading…' : transfer?.state ? 'Download next' : transfer.error ? 'Retry download' : 'Download to this device';
download.disabled = transfer?.state === 'running' || navigator.onLine === false || !this.model.hasSyncDestination();
download.onclick = () => run(async () => { await this.model.download(id); });
downloadButton = download;
card.append(download);
}
}
if (mode.value === 'history') {
const info = document.createElement('div'); info.textContent = row.deleted_at ? 'Deleted score' : row.replaced_by_id ? 'Previous version' : 'Current version'; card.append(info);
if (row.deleted_at || row.replaced_by_id) button(card, 'Use this version', () => this.model.useVersion(row.id));
if (row.deleted_at) continue;
}
if (row.unavailable) {
const unavailable = document.createElement('div'); unavailable.textContent = 'This song or score was deleted.'; card.append(unavailable);
if (row.membership) button(card, 'Remove from collection', () => this.model.remove('playlist_items',row.membership));
continue;
}
const isEntry = !!row.document_id;
if (metadata.composer && !isEntry) {
const composer = document.createElement('div'); composer.textContent = metadata.composer; card.append(composer);
}
if (isEntry) {
const description = document.createElement('div');
description.textContent = [metadata.composer,
row.anchor_json && 'Page ' + (JSON.parse(row.anchor_json).pageIndex + 1), row.previousVersion && 'Previous version'].filter(Boolean).join(' · ');
card.append(description);
}
const details = document.createElement('details');
details.dataset.record = (isEntry ? 'entries:' : 'documents:') + row.id; details.open = expanded.has(details.dataset.record);
const summary = document.createElement('summary'); summary.textContent = '⋯'; summary.setAttribute('aria-label', 'Edit and organize');
details.append(summary); card.append(details);
this.rowViews.set(recordKey, { row:rowCard, details, summary, title:openButton.textContent,
downloadButton,
description:[metadata.composer,fileLabel].filter(Boolean).join('\n'),
open:openRecord });
summary.addEventListener('click', event => {
if (details.parentElement === this.inspector) return;
event.preventDefault(); this.showRecord(recordKey, true);
});
const controls = document.createElement('div'); controls.style.cssText = 'display:flex;flex-wrap:wrap;gap:.4em;padding:.5em 0';
details.append(controls); card = controls;
const recordSection = title => {
const section = document.createElement('section'); section.className = 'Bookshelf__record-section';
const heading = document.createElement('h4'); heading.textContent = title; section.append(heading);
controls.append(section); card = section; return section;
};
recordSection('Name and song details');
const originalLocations = documentMetadata.originalLocations || [];
if (originalLocations.length) {
const origin = document.createElement('div'); origin.setAttribute('aria-label','Original file locations');
for (const location of originalLocations) {
const line = document.createElement('div'); line.translate = false; line.style.overflowWrap = 'anywhere';
line.textContent = location.source + ' · ' + (location.path === null ? location.name + ' (folder unavailable)' : (location.path || '') + '/' + location.name);
origin.append(line);
}
const heading = document.createElement('div'); heading.textContent = 'Original file location'; card.append(heading,origin);
}
const table = isEntry ? 'entries' : 'documents';
const title = document.createElement('input'); title.value = label(row); title.setAttribute('aria-label', isEntry ? 'Song title' : 'Score name'); card.append(title);
button(card, 'Rename', () => this.model.rename(table,row,title.value));
button(card, 'Delete', () => this.model.remove(table,row));
const deleteButton = card.lastElementChild;
recordSection('Tags and collections');
choose(card, 'tags', 'Add tag', tag_id => this.model.addTag(table,row.id,tag_id));
const tagLinks = references[isEntry ? 'entry_tags' : 'document_tags'].filter(link => link[isEntry ? 'entry_id' : 'document_id'] === row.id);
const tags = references.tags;
for (const link of tagLinks) {
const tag = tags.find(t => t.id === link.tag_id);
if (tag) button(card, 'Remove tag: ' + tag.name, () => this.model.remove(isEntry ? 'entry_tags' : 'document_tags',link));
}
if (isEntry) {
const inherited = references.document_tags.filter(link => link.document_id === row.document_id)
.map(link => tags.find(tag => tag.id === link.tag_id)?.name).filter(Boolean);
if (inherited.length) { const info = document.createElement('div'); info.textContent = 'Tags from score: ' + inherited.join(', '); card.append(info); }
}
choose(card, isEntry ? 'playlists' : 'bookshelves', isEntry ? 'Add to playlist' : 'Add to bookshelf', id => this.model.addToCollection(table,row.id,id));
if (row.membership) {
const membershipTable = isEntry ? 'playlist_items' : 'bookshelf_documents';
button(card, 'Remove from collection', () => this.model.remove(membershipTable,row.membership));
const note = document.createElement('input'); note.placeholder = 'Item note'; note.value = JSON.parse(row.membership.metadata_json).note || ''; card.append(note);
button(card, 'Save note', () => this.model.saveItemNote(membershipTable,row.membership,note.value));
button(card, 'Move up', () => this.model.moveItem(membershipTable,row.membership.id,-1));
button(card, 'Move down', () => this.model.moveItem(membershipTable,row.membership.id,1));
}
if (isEntry) {
card = controls.firstElementChild;
const composer = document.createElement('input'); composer.value = metadata.composer || ''; composer.setAttribute('aria-label', 'Composer');
const aliases = document.createElement('input'); aliases.value = (metadata.aliases || []).join('; '); aliases.setAttribute('aria-label', 'Aliases');
const page = document.createElement('input'); page.type = 'number'; page.min = '1'; page.value = JSON.parse(row.anchor_json).pageIndex + 1; page.setAttribute('aria-label', 'Start page');
card.append(composer, aliases, page);
button(card, 'Save song details', () => this.model.saveSong(row,{composer:composer.value,aliases:aliases.value,pageIndex:Number(page.value) - 1}));
} else {
recordSection('Offline storage');
if (local?.pinned) button(card,'Stop keeping offline',() => this.model.pinFile(row.id,false));
else button(card,'Keep offline',() => this.model.keepOffline([row.id]));
if (local?.present) button(card,'Release download',() => this.model.releaseDownload(row.id)).disabled = !!local.pinned;
recordSection('Songs');
button(card, 'Edit songs', () => this.model.editSongs(row.id));
button(card, 'Rebuild song index', () => this.model.reindex(row.id));
const songTitle = document.createElement('input'); songTitle.placeholder = 'New song title'; songTitle.setAttribute('aria-label', 'New song title');
const startPage = document.createElement('input'); startPage.type = 'number'; startPage.min = '1'; startPage.value = '1'; startPage.setAttribute('aria-label', 'New song start page');
card.append(songTitle, startPage);
button(card, 'Add song', () => this.model.addSong(row,songTitle.value,Number(startPage.value) - 1));
recordSection('Replace file');
const replacement = document.createElement('input'); replacement.type = 'file'; replacement.accept = input.accept; replacement.setAttribute('aria-label', 'Replace score file');
replacement.onchange = () => run(async () => {
if (!replacement.files[0]) return;
try {
if (!await checkUnsaved()) return;
replacement.disabled = true;
const imported = await this.model.importReviewed(replacement.files[0], { replacesId: row.id }); await this.refresh();
if (imported?.alreadyImported) status.textContent = 'Score already imported; replacement skipped. Previous or deleted scores remain in history.';
} finally { replacement.value = ''; replacement.disabled = false; }
});
card.append(replacement);
}
recordSection('Delete').append(deleteButton);
}
if (!rows.length) {
const empty = document.createElement('div'); empty.className = 'Bookshelf__empty';
empty.textContent = ['bookshelves', 'playlists'].includes(mode.value) && !collection.value ? 'Choose or create a collection' : 'No scores found';
const mark = document.createElement('div'); mark.className = 'Bookshelf__empty-mark'; mark.textContent = '▥'; mark.setAttribute('aria-hidden','true');
const message = document.createElement('h3'); message.textContent = empty.textContent;
const hint = document.createElement('p'); hint.textContent = search.value ? 'Try a different title or filter.' : 'Add a score to start building your library.';
empty.replaceChildren(mark, message, hint); results.append(empty);
}
if (this.selectedRecord && this.rowViews.has(this.selectedRecord)) this.showRecord(this.selectedRecord, expanded.has(this.selectedRecord));
else this.closeRecord();
}, false);
input.onchange = () => run(async () => {
input.disabled = true;
let imported = 0, skipped = 0, cancelled = 0;
try { for (const file of input.files) {
status.textContent = 'Importing ' + file.name;
const result = await this.model.importReviewed(file,{originalLocation:{source:Score.sources.local,path:null,name:file.name}});
if (!result) cancelled++;
else if (result.alreadyImported) skipped++;
else imported++;
} }
finally { input.disabled = false; input.value = ''; }
await this.refresh();
status.textContent = `Imported ${imported} scores; skipped ${skipped} already imported scores; cancelled ${cancelled} scores.`;
if (skipped) status.textContent += ' Previous or deleted scores remain in history.';
});
search.oninput = () => {
try { localStorage.setItem(searchKey,search.value); } catch {  }
this.refresh();
};
tagFilter.onchange = tagMatch.onchange = () => this.refresh();
mode.onchange = () => this.changeCategory(mode.value);
collection.onchange = () => this.refresh();
create.onclick = () => run(async () => {
const name = createName.value.trim(); if (!name) return;
await this.model.createCollection(mode.value,name);
createName.value = ''; await this.refresh();
});
const updateCurrent = () => { importCurrent.disabled = !window._score_; };
panel.listeners.push(listen(document, 'scoreOpened', updateCurrent), listen(document, 'scoreClosed', updateCurrent));
updateCurrent();
importCurrent.onclick = () => run(async () => {
if (!_score_) throw new Error('Open a score first');
importCurrent.disabled = true;
try {
const name = _score_.saveName;
const originalLocation = _score_.libraryDocumentId ? null : {source:_score_.source || Score.sources.local,path:_score_.source === Score.sources.local ? null : _score_.path ?? null,name:_score_.name || name};
const bytes = await _score_.toFile();
const imported = await this.model.importReviewed(new File([bytes], name),{originalLocation});
await this.refresh();
if (imported?.alreadyImported) status.textContent = 'Score already imported; skipped. Previous or deleted scores remain in history.';
} finally { importCurrent.disabled = false; }
});
this.buildWorkspace({ input, search, status, deviceStatus, cloudStatus, permission, results, importCurrent,
tagFilter, tagMatch, mode, collection, createName, create, transfers, sync });
}
buildWorkspace(controls) {
Object.assign(this, controls);
this.rowViews = new Map();
const element = (tag, className, text) => {
const elm = document.createElement(tag); if (className) elm.className = className;
if (text) elm.textContent = text; return elm;
};
this.workspace = element('div','Bookshelf__workspace');
const sidebar = element('nav','Bookshelf__sidebar'); sidebar.setAttribute('aria-label','Library categories');
sidebar.append(element('div','Bookshelf__nav-title','Browse'));
const navigation = element('div','Bookshelf__nav'); this.navigationButtons = new Map();
const categories = [['documents','All scores','▥'],['entries','Songs','♪'],['bookshelves','Bookshelves','▤'],['playlists','Playlists','≡'],['tags','Tags','#']];
for (const [value,title,icon] of categories) {
const button = element('button',''); button.type = 'button'; button.setAttribute('aria-label',title);
const glyph = element('span','',icon); glyph.setAttribute('aria-hidden','true'); button.append(glyph,document.createTextNode(title));
button.onclick = () => this.changeCategory(value);
this.navigationButtons.set(value,button); navigation.append(button);
}
sidebar.append(navigation);
const main = element('main','Bookshelf__main');
const toolbar = element('div','Bookshelf__toolbar');
this.search.className = 'Bookshelf__search';
const filters = this.filters = element('details','Bookshelf__popover Bookshelf__filters');
this.filterSummary = element('summary','','Filters'); this.filterSummary.setAttribute('aria-label','Filter library');
const filterContent = element('div','Bookshelf__filter-content');
filterContent.append(element('strong','','Filter by tags'),this.tagFilter,this.tagMatch);
const clear = element('button','','Clear filters'); clear.type = 'button';
clear.onclick = () => { for (const option of this.tagFilter.options) option.selected = false; this.refresh(); };
filterContent.append(clear); filters.append(this.filterSummary,filterContent); toolbar.append(this.search,filters);
const heading = element('div','Bookshelf__heading');
this.viewTitle = element('h2','','All scores'); this.count = element('span','Bookshelf__count');
heading.append(this.viewTitle,this.count);
this.mode.classList.add('Bookshelf__compact-mode');
const compact = element('div','Bookshelf__context Bookshelf__compact-mode'); compact.append(this.mode);
const context = element('div','Bookshelf__context'); context.append(this.collection,this.createName,this.create);
this.results.className = 'Bookshelf__results'; this.results.setAttribute('aria-label','Library results');
main.append(toolbar,compact,heading,context,this.results);
this.inspector = element('aside','Bookshelf__inspector'); this.inspector.hidden = true;
this.inspector.setAttribute('aria-label','Score details');
this.workspace.append(sidebar,main,this.inspector);
const footer = element('footer','Bookshelf__footer');
const saveState = element('div','Bookshelf__save-state'); saveState.append(this.deviceStatus,this.cloudStatus);
const transferProgress = element('div','Bookshelf__transfer-progress'); transferProgress.setAttribute('aria-label','Library transfer progress');
const transferText = element('div'); transferText.setAttribute('role','status');
const progress = document.createElement('progress'); progress.setAttribute('aria-label','File transfer progress');
const stop = element('button','','Stop remaining downloads'); stop.type = 'button'; stop.onclick = () => this.model.cancelFullSync();
const waitingText = element('div'); waitingText.setAttribute('aria-label','Pending file transfers');
let waitingDirection = null;
const waitingButtons = {};
const waitingFiles = element('section','Bookshelf__waiting-files'); waitingFiles.hidden = true;
waitingFiles.setAttribute('role','region');
const waitingHeading = element('h3'), waitingList = element('ol'), waitingEmpty = element('p');
const closeWaiting = element('button','','Close waiting files'); closeWaiting.type = 'button';
closeWaiting.onclick = () => {
const previous = waitingDirection; waitingDirection = null; updateProgress(); waitingButtons[previous]?.focus();
};
waitingFiles.append(waitingHeading,waitingList,waitingEmpty,closeWaiting);
for (const direction of ['upload','download']) {
const button = waitingButtons[direction] = element('button'); button.type = 'button';
button.onclick = () => { waitingDirection = waitingDirection === direction ? null : direction; updateProgress(); };
if (direction === 'download') waitingText.append(document.createTextNode(' · '));
waitingText.append(button);
}
transferProgress.append(transferText,progress,waitingText,stop,waitingFiles);
const updateProgress = () => {
const queue = this.model.transferState, full = this.model.fullSyncState;
const checking = this.model.syncPending || this.model.cloudConnecting || this.model.checkingCloud || this.model.autoSync?.running;
transferProgress.hidden = !queue.total && !full && !checking;
for (const direction of ['upload','download']) {
waitingButtons[direction].textContent = `${direction === 'upload' ? 'Upload' : 'Download'} waiting: ${queue.waiting[direction]} files`;
waitingButtons[direction].setAttribute('aria-expanded',String(waitingDirection === direction));
}
waitingFiles.hidden = !waitingDirection;
if (waitingDirection) {
const title = `Files waiting to ${waitingDirection}`;
waitingFiles.setAttribute('aria-label',title); waitingHeading.textContent = title;
const labels = queue.waitingFiles[waitingDirection];
waitingList.replaceChildren(...labels.map(label => element('li','',label)));
waitingEmpty.textContent = `No files waiting to ${waitingDirection}.`;
waitingEmpty.hidden = !!labels.length; waitingList.hidden = !labels.length;
}
const current = queue.active ? (queue.active.direction === 'upload' ? 'Uploading: ' : 'Downloading: ') + queue.active.label : '';
if (queue.active || queue.size || queue.waiting.upload) {
progress.max = Math.max(1,queue.total); progress.value = queue.completed;
transferText.textContent = `${current || 'Preparing file transfers'} · ${queue.completed} / ${queue.total} files completed` +
(queue.failed ? ` · ${queue.failed} failed` : '') + (queue.cancelled ? ` · ${queue.cancelled} stopped` : '');
} else if (checking) {
transferText.textContent = this.model.syncError ? 'Sync failed: ' + this.model.syncError.message : 'Checking and syncing library information…';
progress.removeAttribute('value');
} else if (full && (this.model.fullSyncRunning || !queue.total)) {
progress.max = Math.max(1,full.total); progress.value = full.completed;
transferText.textContent = `${full.phase === 'done' ? 'Complete' : full.phase === 'cancelled' ? 'Stopped' : full.phase === 'failed' ? 'Some transfers failed' : 'Downloading scores'}: ${full.completed} / ${full.total} files` + (full.failed ? ` · ${full.failed} failed` : '') + (full.error ? ' · ' + full.error : '');
if (full.phase === 'done' && !full.total) { progress.value = progress.max; transferText.textContent = 'All current library scores are on this device.'; }
} else {
progress.max = Math.max(1,queue.total); progress.value = queue.completed;
transferText.textContent = `${queue.failed ? 'Some transfers failed' : queue.cancelled ? 'Stopped' : 'Transfer complete'}: ${queue.completed} / ${queue.total} files completed` +
(queue.failed ? ` · ${queue.failed} failed` : '') + (queue.cancelled ? ` · ${queue.cancelled} stopped` : '');
}
stop.hidden = !this.model.fullSyncRunning; stop.disabled = !!this.model.fullSyncCancelled;
};
this.panel.listeners.push(listen(this.model,'statuschange',updateProgress)); updateProgress();
this.sync.className = 'Bookshelf__sync'; this.sync.setAttribute('aria-label','Sync library now'); this.sync.textContent = '↻ Sync';
footer.append(saveState,this.sync,transferProgress);
this.footer = footer; this.resizeObserver.observe(footer);
this.status.className = 'Bookshelf__message'; this.permission.className = 'Bookshelf__permission';
this.elm.replaceChildren(this.permission,this.workspace,this.status,footer);
const add = this.addMenu = element('details','Bookshelf__popover Bookshelf__add');
const addSummary = element('summary'); addSummary.innerHTML = iconSvg('Add', {size:'18px'}) + '<span>Add</span>'; addSummary.setAttribute('aria-label','Add scores');
const addContent = element('div','Bookshelf__add-content');
this.input.className = 'Bookshelf__file-input'; this.input.tabIndex = -1;
const chooseFiles = element('button','','Choose files…'); chooseFiles.type = 'button'; chooseFiles.onclick = () => { add.open = false; this.input.click(); };
const cloudLabel = element('label','','Cloud service');
const cloudService = element('select'); cloudService.setAttribute('aria-label','Add from cloud service');
cloudService.add(new Option('Choose cloud service',''));
for (const source of [Score.sources.gdrive,Score.sources.dbx,Score.sources.odrive,Score.sources.pcloud]) cloudService.add(new Option(source,source));
cloudLabel.append(cloudService);
const preload = () => { if (cloudService.value === Score.sources.gdrive) FileSrc.get(cloudService.value).preloadGIS?.(); };
const chooseCloud = element('button','','Choose cloud files…'); chooseCloud.type = 'button';
chooseCloud.disabled = true;
cloudService.onchange = () => { chooseCloud.disabled = !cloudService.value; preload(); };
chooseCloud.onclick = async () => {
add.open = false; chooseCloud.disabled = true;
try {
const picker = this.cloudFolderPicker = new CloudFolderPicker(cloudService.value,'',{files:true});
const locations = await picker.show(); this.cloudFolderPicker = null;
if (!locations || this.panel.closing) return;
let imported = 0, skipped = 0, cancelled = 0; const failures = [];
for (const location of locations) {
if (this.panel.closing) break;
try {
this.status.textContent = 'Downloading ' + location.name;
const file = await this.model.readOriginalFile(location);
if (this.panel.closing) break;
const result = await this.model.importReviewed(file,{originalLocation:location});
if (!result) cancelled++;
else if (result.alreadyImported) skipped++;
else imported++;
if (locations.length === 1) this.status.textContent = result ? result.alreadyImported ? 'Score already imported; original file location recorded.' : 'Imported ' + location.name : 'Import cancelled.';
} catch (error) { failures.push(location.name + ': ' + error.message); if (locations.length === 1) this.status.textContent = error.message; }
}
await this.refresh();
if (locations.length > 1) this.status.textContent = `Imported ${imported} scores; skipped ${skipped} already imported scores; cancelled ${cancelled} scores; failed ${failures.length} scores.` + (failures.length ? ' ' + failures.join(' · ') : '');
} catch (error) { this.status.textContent = error.message; }
finally {
this.cloudFolderPicker = null; chooseCloud.disabled = false;
if (addSummary.isConnected && !this.panel.closing) addSummary.focus({preventScroll:true});
}
};
const importCurrent = this.importCurrent.onclick;
this.importCurrent.onclick = event => { add.open = false; return importCurrent(event); };
addContent.append(chooseFiles,this.input,this.importCurrent,cloudLabel,chooseCloud); add.append(addSummary,addContent);
this.panel.addSlot.append(add);
const settings = this.transfers; settings.className = 'Bookshelf__popover Bookshelf__settings';
const settingsSummary = settings.querySelector('summary'); settingsSummary.setAttribute('aria-label','Library settings');
settingsSummary.innerHTML = iconSvg('Options', {size:'20px'}) + '<span>Library settings</span>';
const settingsContent = element('section','Bookshelf__settings-content'); settingsContent.setAttribute('aria-label','Library settings content');
const back = element('button','','← Back to library'); back.type = 'button'; back.onclick = () => { settings.open = false; };
settingsContent.append(back,element('h2','','Library settings'));
for (const child of [...settings.children]) if (child !== settingsSummary) settingsContent.append(child);
settings.append(settingsContent); this.panel.settingsSlot.append(settings);
settings.addEventListener('toggle', () => {
this.workspace.inert = settings.open;
if (settings.open) { add.open = false; back.focus({preventScroll:true}); }
else if (this.panel.open) settingsSummary.focus({preventScroll:true});
});
this.panel.listeners.push(listen(document,'click', event => {
if (!add.contains(event.target)) add.open = false;
if (!filters.contains(event.target)) filters.open = false;
}));
}
updateNavigation(value, collection, count, filterCount) {
for (const [key,button] of this.navigationButtons) button.setAttribute('aria-pressed',String(key === value));
const title = this.mode.selectedOptions[0]?.textContent || 'Library';
this.viewTitle.textContent = collection.value ? collection.selectedOptions[0]?.textContent || title : title;
this.count.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
this.filterSummary.textContent = filterCount ? `Filters · ${filterCount}` : 'Filters';
}
updatePresentation() {
if (this.footer) this.panel.panel.style.setProperty('--library-footer-height',this.footer.offsetHeight + 'px');
if (this.selectedRecord && this.rowViews.has(this.selectedRecord)) {
this.elm.dataset.detailOpen = 'true';
}
}
showRecord(key, edit = false) {
const selected = this.rowViews.get(key);
if (!selected) return;
const previous = this.selectedRecord && this.rowViews.get(this.selectedRecord);
if (previous && previous !== selected) {
previous.details.open = false; previous.summary.textContent = '⋯'; previous.row.append(previous.details);
if (previous.downloadButton) previous.row.append(previous.downloadButton);
}
this.selectedRecord = key;
for (const [id,view] of this.rowViews) view.row.dataset.selected = String(id === key);
const back = document.createElement('button'); back.type = 'button'; back.textContent = '← Back to list';
back.onclick = () => this.closeRecord(true);
const title = document.createElement('h2'); title.textContent = selected.title;
const description = document.createElement('p'); description.textContent = selected.description;
description.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere';
const open = document.createElement('button'); open.type = 'button'; open.textContent = 'Open score'; open.className = 'LibraryWindow__primary';
open.onclick = selected.open;
selected.summary.textContent = 'Edit details'; selected.details.open = edit;
this.inspector.replaceChildren(back,title,description,open,...(selected.downloadButton ? [selected.downloadButton] : []),selected.details);
this.inspector.hidden = false; this.elm.dataset.detailOpen = 'true';
}
closeRecord(focus = false) {
const selected = this.selectedRecord && this.rowViews.get(this.selectedRecord);
if (selected) {
selected.details.open = false; selected.summary.textContent = '⋯'; selected.row.dataset.selected = 'false';
selected.row.append(selected.details);
if (selected.downloadButton) selected.row.append(selected.downloadButton);
if (focus) selected.row.querySelector('button')?.focus({preventScroll:true});
}
this.selectedRecord = null;
this.inspector.hidden = true; this.inspector.replaceChildren(); this.elm.dataset.detailOpen = 'false';
}
dismissLayer() {
if (this.transfers.open) { this.transfers.open = false; return true; }
if (this.addMenu.open) { this.addMenu.open = false; return true; }
if (this.filters.open) { this.filters.open = false; return true; }
if (this.selectedRecord) { this.closeRecord(true); return true; }
return false;
}
select() { this.refresh(); requestAnimationFrame(this.resize); }
}
// #inclusion src/bookshelf-import.js minified
class ScoreImportReview {
static css = css('ScoreImportReview', `
.ScoreImportReview { color:var(--color-text); background:var(--panel-bg); border:var(--border);
border-radius:var(--borderRadius); width:min(66em,94vw); max-width:94vw; max-height:92dvh;
box-sizing:border-box; padding:1em; text-align:left; font-size:clamp(16px,1rem,18px); }
.ScoreImportReview[open] { display:flex; flex-direction:column; }
.ScoreImportReview__content { min-height:0; overflow:auto; }
.ScoreImportReview::backdrop { background:#0008; }
.ScoreImportReview * { box-sizing:border-box; }
.ScoreImportReview [hidden] { display:none !important; }
.ScoreImportReview__heading { margin:0 0 .5em; font-size:1.2em; }
.ScoreImportReview__filename { overflow-wrap:anywhere; margin-bottom:.5em; }
.ScoreImportReview label { display:block; }
.ScoreImportReview input { font:inherit; max-width:100%; }
.ScoreImportReview input:not([type=checkbox]) { width:100%; }
.ScoreImportReview button { font:inherit; padding:.3em .6em; }
.ScoreImportReview__columns { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:1em; }
.ScoreImportReview__songs { max-height:52dvh; overflow:auto; padding:.2em; }
.ScoreImportReview fieldset { min-width:0; margin:.4em 0; border:2px solid #888; padding:.6em; }
.ScoreImportReview fieldset[data-current=true] { border-color:var(--color-text); }
.ScoreImportReview__fields { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr) 5em; gap:.5em; }
.ScoreImportReview__rowButtons, .ScoreImportReview__navigation, .ScoreImportReview__actions {
display:flex; flex-wrap:wrap; align-items:center; gap:.5em; margin:.5em 0; }
.ScoreImportReview__navigation label { width:5em; }
.ScoreImportReview__page { max-height:48dvh; overflow:auto; background:#7773; text-align:center; }
.ScoreImportReview canvas { display:block; max-width:100%; height:auto; margin:auto; background:white; }
.ScoreImportReview__actions { justify-content:flex-end; flex-shrink:0; background:var(--panel-bg); }
@media(max-width:650px) {
.ScoreImportReview__columns { grid-template-columns:minmax(0,1fr); }
.ScoreImportReview__songs { max-height:32dvh; }
.ScoreImportReview__page { max-height:24dvh; }
.ScoreImportReview__fields { grid-template-columns:minmax(0,1fr); }
}
`);
constructor(file, entries, score, commit, reauthorize, options = {}) {
this.file = file; this.score = score; this.commit = commit;
this.editing = !!options.editing;
this.rows = []; this.pageIndex = 0; this.generation = 0; this.renderJobs = new Set();
const element = (tag, parent, text) => {
const node = document.createElement(tag); if (text !== undefined) node.textContent = text;
parent?.append(node); return node;
};
this.element = element;
const elm = this.elm = element('dialog'); elm.className = 'ScoreImportReview';
const heading = this.editing ? 'Edit score songs' : 'Review score import';
elm.setAttribute('aria-label', heading);
elm.addEventListener('pointerdown', e => { e.taken = true; }, { capture:true });
element('h2', elm, heading).className = 'ScoreImportReview__heading';
const content = element('div', elm); content.className = 'ScoreImportReview__content';
element('div', content, file.name).className = 'ScoreImportReview__filename';
this.displayName = this.input(content, 'Library score name', options.displayName ?? file.name);
element('p', content, this.editing
? 'Edit songs in this score. Uncheck a song or use Delete song to remove it when you save. The original file and writing stay unchanged.'
: 'Review songs before importing. Uncheck all to keep only the file. Bookmarks in the original file stay unchanged.');
const columns = element('div', content); columns.className = 'ScoreImportReview__columns';
const left = element('div', columns);
this.count = element('div', left); this.count.setAttribute('aria-live', 'polite');
this.songs = element('div', left); this.songs.className = 'ScoreImportReview__songs';
this.button(left, 'Add song', () => {
const row = this.addRow({ id:crypto.randomUUID(), anchor:{ type:score.music ? 'music' : 'pdf', pageIndex:this.pageIndex },
metadata:{ title:'', composer:'', source:{ type:'manual' }, userEditedFields:['title','composer','anchor'] } });
row.elm.scrollIntoView({ block:'nearest' }); row.title.focus();
});
const right = element('div', columns);
const navigation = element('div', right); navigation.className = 'ScoreImportReview__navigation';
this.previous = this.button(navigation, 'Previous page', () => this.showPage(this.pageIndex - 1));
this.page = this.input(navigation, 'Preview page', 1, 'number'); this.page.min = '1'; this.page.max = score.mozDoc.numPages;
this.page.onchange = () => this.showPage(Number(this.page.value) - 1);
this.next = this.button(navigation, 'Next page', () => this.showPage(this.pageIndex + 1));
this.previewStatus = element('div', right); this.previewStatus.setAttribute('aria-live','polite');
this.preview = element('div', right); this.preview.className = 'ScoreImportReview__page';
this.preview.setAttribute('aria-label', 'Score page preview');
this.error = element('div', elm); this.error.setAttribute('role','alert');
this.permissionRetry = this.button(elm, 'Allow library folder access', async () => {
this.permissionRetry.disabled = true;
try {
await reauthorize(); this.permissionRetry.hidden = true;
this.error.textContent = 'Folder access restored. You can save this draft now.';
} catch (error) { this.error.textContent = error.message; }
finally { this.permissionRetry.disabled = false; }
});
this.permissionRetry.hidden = true; this.reauthorize = reauthorize;
const actions = element('div', elm); actions.className = 'ScoreImportReview__actions';
this.button(actions, this.editing ? 'Cancel changes' : 'Cancel import', () => { if (!this.busy) elm.close(); });
this.button(actions, this.editing ? 'Save changes' : 'Import into library', () => this.submit());
elm.addEventListener('cancel', e => { if (this.busy) e.preventDefault(); });
for (const entry of entries) this.addRow(entry);
}
input(parent, label, value, type = 'text') {
const wrapper = this.element('label', parent, label);
const input = this.element('input', wrapper); input.type = type; input.value = value;
input.setAttribute('aria-label',label); return input;
}
button(parent, text, handler) {
const button = this.element('button', parent, text); button.type = 'button'; button.onclick = handler; return button;
}
addRow(entry) {
const row = { original:structuredClone(entry) };
const elm = row.elm = this.element('fieldset', this.songs);
this.element('legend', elm, 'Song ' + (this.rows.length + 1));
const byId = new Map(this.rows.map(r => [r.original.id,r.original]));
let ancestor = entry.parent_id, depth = 0;
while (ancestor && byId.has(ancestor) && depth < 10) { depth++; ancestor = byId.get(ancestor).parent_id; }
elm.style.marginLeft = Math.min(depth,3) * .8 + 'em';
row.include = this.input(elm, 'Include song', '', 'checkbox'); row.include.checked = true;
row.include.onchange = () => this.updateCount();
const fields = this.element('div', elm); fields.className = 'ScoreImportReview__fields';
row.title = this.input(fields, 'Song title', entry.metadata.title || '');
row.composer = this.input(fields, 'Composer', entry.metadata.composer || '');
row.page = this.input(fields, 'Start page', entry.anchor.pageIndex + 1, 'number');
row.page.min = '1'; row.page.max = this.score.mozDoc.numPages;
row.page.onchange = () => this.showPage(Number(row.page.value) - 1);
const buttons = this.element('div',elm); buttons.className = 'ScoreImportReview__rowButtons';
this.button(buttons, 'Use filename as title', () => { row.title.value = this.file.name.replace(/\.[^.]+$/, ''); });
this.button(buttons, 'Preview song page', () => this.showPage(Number(row.page.value) - 1));
if (this.editing) this.button(buttons, 'Delete song', () => { row.include.checked = false; this.updateCount(); });
const select = () => {
for (const other of this.rows) other.elm.dataset.current = String(other === row);
};
elm.addEventListener('focusin', select);
elm.addEventListener('click', () => { select(); this.showPage(Number(row.page.value) - 1); });
this.rows.push(row); this.updateCount(); return row;
}
updateCount() { this.count.textContent = this.rows.filter(row => row.include.checked).length + ' songs selected'; }
showPage(pageIndex) {
if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= this.score.mozDoc.numPages || this.closed) return;
this.pageIndex = pageIndex; this.page.value = pageIndex + 1;
this.previous.disabled = pageIndex === 0; this.next.disabled = pageIndex + 1 === this.score.mozDoc.numPages;
const generation = ++this.generation;
this.renderTask?.cancel();
this.previewStatus.textContent = 'Loading page ' + (pageIndex + 1);
const job = (async () => {
try {
const page = await this.score.mozDoc.getPage(pageIndex + 1);
if (generation !== this.generation || this.closed) return;
const base = page.getViewport({ scale:1 });
const viewport = page.getViewport({ scale:Math.min(600/base.width, 800/base.height) * Math.min(devicePixelRatio || 1,2) });
const canvas = document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
const task = this.renderTask = page.render({ canvasContext:canvas.getContext('2d'), viewport });
await task.promise;
if (generation !== this.generation || this.closed) return;
this.preview.replaceChildren(canvas);
this.previewStatus.textContent = `Page ${pageIndex + 1} of ${this.score.mozDoc.numPages}`;
} catch (error) {
if (generation === this.generation && !this.closed) this.previewStatus.textContent = 'Preview unavailable: ' + error.message;
}
})();
this.renderJobs.add(job); job.finally(() => this.renderJobs.delete(job));
}
draft() {
const displayName = this.displayName.value.trim();
if (!displayName) { this.displayName.focus(); throw new Error('Enter a library score name'); }
const byId = new Map(this.rows.map(row => [row.original.id,row]));
const entries = this.rows.map(row => {
const entry = structuredClone(row.original);
if (!row.include.checked) return { ...entry, deleted_at:new Date().toISOString() };
const pageIndex = Number(row.page.value) - 1;
if (!row.title.value.trim() || !Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= this.score.mozDoc.numPages) {
row.elm.scrollIntoView({ block:'nearest' });
(!row.title.value.trim() ? row.title : row.page).focus();
throw new Error('Each included song needs a title and a start page within this score');
}
const changed = new Set(entry.metadata.userEditedFields || []);
for (const [field, value] of [['title',row.title.value.trim()],['composer',row.composer.value.trim()]]) {
if ((entry.metadata[field] || '') !== value) { changed.add(field); entry.metadata[field] = value; }
}
if (entry.anchor.pageIndex !== pageIndex) changed.add('anchor');
entry.anchor.pageIndex = pageIndex;
const originalParent = entry.parent_id || null;
while (entry.parent_id && !byId.get(entry.parent_id)?.include.checked) entry.parent_id = byId.get(entry.parent_id)?.original.parent_id || null;
if ((entry.parent_id || null) !== originalParent) changed.add('parent');
if (changed.size || entry.metadata.userEditedFields) entry.metadata.userEditedFields = [...changed];
return entry;
});
return { displayName, entries };
}
async submit() {
if (this.busy) return;
this.error.textContent = '';
let draft;
try { draft = this.draft(); } catch (error) { this.error.textContent = error.message; return; }
this.busy = true;
const controls = [...this.elm.querySelectorAll('input,button')].map(node => [node,node.disabled]);
for (const [node] of controls) node.disabled = true;
try { this.result = await this.commit(draft); this.elm.close(); }
catch (error) {
this.error.textContent = error.message;
this.permissionRetry.hidden = !this.reauthorize || !['NotAllowedError','SecurityError'].includes(error.name);
}
finally { this.busy = false; for (const [node,disabled] of controls) node.disabled = disabled; }
}
async show() {
document.body.append(this.elm);
const closed = new Promise(resolve => this.elm.addEventListener('close',resolve,{ once:true }));
this.elm.showModal(); this.showPage(this.rows[0]?.original.anchor.pageIndex || 0);
await closed;
this.closed = true; ++this.generation; this.renderTask?.cancel();
await Promise.allSettled([...this.renderJobs]);
this.elm.remove(); return this.result || null;
}
}
async function reviewScoreImport(file, entries, score, commit, reauthorize, options) {
return new ScoreImportReview(file, entries, score, commit, reauthorize, options).show();
}
// #inclusion src/bookshelf-sync.js minified
const initialLibraryGeneration = {id:'initial',ancestors:[]};
const snapshotGeneration = info => JSON.parse(info.generation_json);
function generationHead(markers) {
const ancestors = new Set(markers.flatMap(marker => marker.ancestors));
const heads = markers.filter(marker => !ancestors.has(marker.id));
if (heads.length > 1) throw Object.assign(new Error('Competing library replacements: ' + heads.map(marker => marker.id).join(', ') + '. Choose the replacement to keep in Library settings.'),{restoreChoices:heads.map(marker => marker.id)});
return heads[0] || initialLibraryGeneration;
}
function snapshotHeads(snapshots,generation) {
const eligible = snapshots.filter(item => item.data.generation.id === generation.id);
const ancestors = new Set(eligible.flatMap(item => item.data.ancestors));
return [...new Map(eligible.filter(item => !ancestors.has(item.data.id)).map(item => [item.data.id,item])).values()];
}
async function inspectedState(store,transport) {
const state = await transport.loadSyncState();
for (const item of state.snapshots) {
item.data = await store.call('inspectSnapshot',{file:item.file});
item.data.id ||= 'copy:' + await hashLibraryBytes(await item.file.arrayBuffer());
}
return state;
}
async function cleanupSnapshots(transport, snapshots, head) {
const covered = snapshots.filter(item => head.data.ancestors.includes(item.data.id) ||
head.data.generation.ancestors.includes(item.data.generation.id));
const copies = snapshots.filter(item => item.data.id === head.data.id);
try { await transport.cleanup?.(covered,copies); } catch {  }
}
async function localGenerationMarkers(store) {
const result = [];
for (const entry of await store.call('listManaged',{path:'_sync/generations'})) if (entry.kind === 'file' && /^[a-f0-9]{64}\.json$/.test(entry.name)) {
const blob = await store.call('readManaged',{path:'_sync/generations/' + entry.name});
if (blob.size > 1024 * 1024) throw new Error('Invalid local generation marker');
const marker = validateLibraryGeneration(JSON.parse(await blob.text()));
if (await hashLibraryBytes(new TextEncoder().encode(marker.id)) + '.json' !== entry.name) throw new Error('Invalid local generation identity');
result.push(marker);
}
return result;
}
async function mirrorGeneration(store,transport,marker,file) {
const key = await transport.generationKey(marker.id);
await store.call('writeManaged',{path:'_sync/generations/' + key + '.sqlite',file});
await store.call('writeManaged',{path:'_sync/generations/' + key + '.json',file:new Blob([JSON.stringify(marker)])});
}
async function syncGeneration(store,transport) {
let markers = await transport.listGenerations();
for (const marker of await localGenerationMarkers(store)) if (!markers.some(item => item.id === marker.id)) {
const key = await transport.generationKey(marker.id), file = await store.call('readManaged',{path:'_sync/generations/' + key + '.sqlite'});
if (await hashLibraryBytes(await file.arrayBuffer()) !== marker.snapshotHash) throw new Error('Damaged local generation recovery snapshot');
await store.call('inspectSnapshot',{file});
await transport.publishGeneration(marker,file); markers.push(marker);
}
let generation = generationHead(markers);
const requests = new Map();
const add = (id,read) => { if (!requests.has(id)) requests.set(id,[]); requests.get(id).push(read); };
for (const request of await transport.restoreRequests()) add(request.id,path => transport.readPath(request.path + '/' + path));
for (const entry of await store.call('listManaged',{path:'restore'})) if (entry.kind === 'directory') add(entry.name,path => store.call('readManaged',{path:'restore/' + entry.name + '/' + path}));
const pending = [...requests].filter(([id]) => !markers.some(marker => marker.id === id));
if (pending.length > 1) throw new Error('More than one restore request is waiting: ' + pending.map(([id]) => id).join(', ') + '. Keep only the request you want to publish.');
for (const [id,readers] of requests) {
const processed = markers.find(marker => marker.id === id);
if (!processed) continue;
for (const read of readers) {
let file;
try { file = await read('library.sqlite'); } catch (error) { if (error.name === 'NotFoundError') continue; throw error; }
if (await hashLibraryBytes(await file.arrayBuffer()) !== processed.sourceHash) throw new Error('Restore name was already used: ' + id + '. Use a new directory name.');
}
}
if (pending.length) {
const [id,readers] = pending[0];
if (id === 'initial' || !id || new TextEncoder().encode(id).length > 180 || /[<>\u0022:/\\|?*\x00-\x1f]/.test(id)) throw new Error('Choose a valid, new restore request directory name');
let file;
try { file = await readers[0]('library.sqlite'); }
catch (error) { throw new Error('Restore ' + id + ' is waiting for library.sqlite: ' + error.message); }
const sourceHash = await hashLibraryBytes(await file.arrayBuffer());
for (const read of readers.slice(1)) if (await hashLibraryBytes(await (await read('library.sqlite')).arrayBuffer()) !== sourceHash) throw new Error('Different restore requests share the name ' + id);
const data = await store.call('inspectSnapshot',{file});
for (const doc of data.documents) if (!doc.deleted_at && !doc.replaced_by_id) {
let score;
try { score = await readers[0](doc.storage_path); }
catch (error) { throw new Error('Restore ' + id + ' is waiting for ' + doc.storage_path); }
if (score.size !== doc.size_bytes || await hashLibraryBytes(await score.arrayBuffer()) !== doc.content_hash) throw new Error('Restore ' + id + ' has a damaged score: ' + doc.storage_path);
await store.uploadFile(doc,score,transport);
await store.call('writeManaged',{path:doc.storage_path,file:score});
}
generation = {id,ancestors:[...new Set([...generation.ancestors,generation.id])].sort()};
file = await store.call('prepareSnapshot',{file,id:'restore:' + id,generation});
const marker = {...generation,format:'rostrum-library-generation',version:1,sourceHash,snapshotHash:await hashLibraryBytes(await file.arrayBuffer())};
await transport.publishGeneration(marker,file);
await mirrorGeneration(store,transport,marker,file);
markers = await transport.listGenerations(); generation = generationHead(markers);
store.warn('Replacement published to the cloud: ' + id + '. You may now delete restore/' + id + '/. Do not reuse this name.');
}
const local = await store.call('syncData',{destination:transport.id});
const localGeneration = snapshotGeneration(local.info);
if (generation.id !== localGeneration.id) {
if (generation.id === 'initial' || !generation.ancestors.includes(localGeneration.id)) throw new Error('The local library and cloud have competing restore generations.');
const marker = markers.find(marker => marker.id === generation.id), file = await transport.generationSnapshot(marker);
if (await hashLibraryBytes(await file.arrayBuffer()) !== marker.snapshotHash) throw new Error('Damaged replacement recovery snapshot');
await store.replaceLibrarySnapshot(file,generation);
}
for (const marker of markers) {
const file = await transport.generationSnapshot(marker);
if (await hashLibraryBytes(await file.arrayBuffer()) !== marker.snapshotHash) throw new Error('Damaged generation recovery snapshot');
await mirrorGeneration(store,transport,marker,file);
}
return generation;
}
async function resolveLibraryGeneration(store,transport,id) {
const markers = await transport.listGenerations(), marker = markers.find(item => item.id === id);
if (!marker) throw new Error('That replacement is no longer available. Check sync again.');
const source = await transport.generationSnapshot(marker);
if (await hashLibraryBytes(await source.arrayBuffer()) !== marker.snapshotHash) throw new Error('Damaged replacement recovery snapshot');
const data = await store.call('inspectSnapshot',{file:source});
for (const doc of data.documents) if (!doc.deleted_at && !doc.replaced_by_id) {
const file = await transport.readScore(doc);
if (file.size !== doc.size_bytes || await hashLibraryBytes(await file.arrayBuffer()) !== doc.content_hash) throw new Error('Missing or damaged replacement score: ' + doc.storage_path);
}
const generation = {id:'choice-' + crypto.randomUUID(),ancestors:[...new Set(markers.flatMap(item => [item.id,...item.ancestors]))].sort()};
const file = await store.call('prepareSnapshot',{file:source,id:'restore:' + generation.id,generation});
const next = {...generation,format:'rostrum-library-generation',version:1,sourceHash:marker.snapshotHash,snapshotHash:await hashLibraryBytes(await file.arrayBuffer())};
await transport.publishGeneration(next,file);
await mirrorGeneration(store,transport,next,file);
}
async function exchangeLibraryChanges(store,transport) {
if (!transport?.id || !['loadSyncState','publishSnapshot','listScores','readScore','writeScore'].every(method => typeof transport[method] === 'function')) throw new Error('Invalid SQLite library sync transport');
let uploadedFiles = 0, receivedBatches = 0, uploadedBatches = 0, uploadedChanges = 0;
for (let attempt = 0; attempt < 8; attempt++) {
try {
const generation = await syncGeneration(store,transport);
const local = await store.call('syncData',{destination:transport.id});
const localIds = new Set(local.changes.map(change => change.id));
if (local.base?.file && local.base.changeIds.some(id => !localIds.has(id))) {
const base = await store.call('inspectSnapshot',{file:local.base.file});
if (base.generation.id === generation.id) await store.applyRemoteChanges(base.changes);
}
const state = await inspectedState(store,transport);
const unknownGeneration = state.snapshots.find(item => item.data.generation.id !== generation.id && !generation.ancestors.includes(item.data.generation.id));
if (unknownGeneration) {
const markers = await transport.listGenerations();
if (markers.some(marker => marker.id === unknownGeneration.data.generation.id)) continue;
throw new Error('A cloud SQLite refers to missing replacement metadata. Copy _sync/ together with library.sqlite and scores/.');
}
const heads = snapshotHeads(state.snapshots,generation);
await transport.ensureFormat?.({create:true});
const remoteIds = new Set(heads.flatMap(item => item.data.changes.map(change => change.id)));
for (const head of heads) {
const result = await store.applyRemoteChanges(head.data.changes); if (result.addedChanges) receivedBatches++;
}
let snapshot = await store.call('syncData',{destination:transport.id});
const paths = new Set((await transport.listScores()).map(item => item.path));
for (const doc of snapshot.documents) if (!doc.deleted_at && !doc.replaced_by_id && paths.has(doc.storage_path) && !heads.some(head => head.data.documents.some(remote => remote.id === doc.id && remote.storage_path === doc.storage_path))) {
const file = await transport.readScore(doc), hash = await hashLibraryBytes(await file.arrayBuffer());
if (hash !== doc.content_hash) await store.call('relocateFile',{id:doc.id,otherIds:[hash]});
}
snapshot = await store.call('syncData',{destination:transport.id});
const required = snapshot.documents.filter(doc => !doc.deleted_at && !doc.replaced_by_id && !paths.has(doc.storage_path));
store.planUploads?.(required);
for (const doc of required) { await store.uploadFile(doc,null,transport); paths.add(doc.storage_path); uploadedFiles++; }
const pending = snapshot.changes.filter(change => !remoteIds.has(change.id));
if (heads.length !== 1 || pending.length) {
const publicationId = await transport.reservePublication();
snapshot = await store.call('captureSnapshot',{id:publicationId,ancestors:[...new Set(heads.flatMap(item => [item.data.id,...item.data.ancestors]))],generation});
for (const doc of snapshot.documents) if (!doc.deleted_at && !doc.replaced_by_id && !paths.has(doc.storage_path)) { await store.uploadFile(doc,null,transport); paths.add(doc.storage_path); uploadedFiles++; }
if (!await transport.publishSnapshot(snapshot.file,{expectedState:state.expectedState,publicationId})) continue;
uploadedBatches++; uploadedChanges += pending.length;
const after = await inspectedState(store,transport), afterHeads = snapshotHeads(after.snapshots,generation);
const known = new Set(snapshot.changes.map(change => change.id));
const [head] = afterHeads;
if (afterHeads.length !== 1) continue;
const persisted = new Set(head.data.changes.map(change => change.id));
if (persisted.size !== known.size || [...known].some(id => !persisted.has(id))) continue;
const generations = await transport.listGenerations();
if (generationHead(generations).id !== generation.id) continue;
await cleanupSnapshots(transport,after.snapshots,head);
await store.call('rememberSnapshot',{destination:transport.id,file:head.file,versions:[head.data.id],changeIds:[...known]});
const status = await store.call('remoteInventory',{destination:transport.id,changeIds:[...known],paths:[...paths]});
return {uploadedBatches,receivedBatches,uploadedChanges,uploadedFiles,downloadFailures:await store.downloadPinned(transport),...status};
}
const head = heads[0];
await store.call('rememberSnapshot',{destination:transport.id,file:head.file,versions:[head.data.id],changeIds:[...remoteIds]});
const status = await store.call('remoteInventory',{destination:transport.id,changeIds:[...remoteIds],paths:[...paths]});
await cleanupSnapshots(transport,state.snapshots,head);
return {uploadedBatches,receivedBatches,uploadedChanges,uploadedFiles,downloadFailures:await store.downloadPinned(transport),...status};
} catch (error) { if (!error.retrySync) throw error; }
}
throw new Error('The library is still changing on another device. Your changes are saved; sync again.');
}
class LibraryAutoSync {
constructor(store, { delay = 3000, interval = 30000 } = {}) {
this.store = store; this.delay = delay; this.interval = interval; this.enabled = true;
}
setEnabled(enabled) {
this.enabled = !!enabled; clearTimeout(this.timer); this.timer = null;
if (this.enabled) this.request(0);
}
request(delay = this.delay) {
if (!this.enabled || !this.store.hasSyncDestination()) return;
if (this.running) { this.again = true; return; }
clearTimeout(this.timer); this.timer = setTimeout(() => this.run(),delay);
}
async run() {
if (!this.enabled || this.running || !this.store.hasSyncDestination()) return;
if (this.store.inBackground || navigator.onLine === false || this.store.operationBlock('sync') || this.store.fullSyncRunning) { this.request(this.interval); return; }
this.running = true; this.again = false; this.store.notifyStatus();
try { await this.store.syncAutomatically(); }
catch {  }
finally {
this.running = false; this.store.notifyStatus();
if (this.enabled) this.request(this.again ? this.delay : this.interval);
}
}
}
// #inclusion src/bookshelf-readme.js minified
const LIBRARY_README = `# Rostrum Library
- library.sqlite: Shared library records, edit history and format versions.
- library-<version-id>.sqlite: Temporary pCloud sync versions. Keep them when copying.
- scores/: Managed score files (hash prefix and original filename).
- _sync/: Restore generations and their recovery snapshots. Keep this directory.
- restore/<unique-name>/: Optional manual replacement requests.
- README.md: This guide. Device settings and sync caches stay in browser storage.
Normal copy: Copy all library SQLite versions, scores/ and _sync/ into the library folder.
Other devices may merge their edits later; this does not force a replacement.
Replace the library: Create restore/<unique-name>/ and copy library.sqlite and
all its scores/ there. Use a NEW name every time, even after deleting a request.
An already processed request with identical SQLite is ignored. Reusing its name
with different SQLite is rejected; use a new name for another replacement.
At the next sync, Rostrum validates the files and publishes a new generation.
Other devices then discard edits from the previous generation when they sync.
Incomplete requests wait without replacing the library. Competing requests are
reported for review; submit only one replacement at a time.
After Rostrum confirms the replacement was published to the cloud, you may
manually delete that request directory. Other devices need not have synced yet.
Rostrum never deletes your restore request directories automatically.
`;
// #inclusion src/bookshelf-cloud.js minified
class LibraryCloudTransport {
static backgroundUsers = new WeakMap();
constructor(source, path = '') {
this.source = source;
const relative = path.replace(/^\/+|\/+$/g, '');
if (relative && relative.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Choose a valid cloud folder path');
this.path = relative ? '/' + relative : '';
this.id = source.source + ':' + this.path;
}
async connect() { await this.source.auth(); await this.source.getDir(this.path,true); await this.ensureFormat(); }
async ensureFormat({create = false} = {}) {
if (create) {
const root = await this.directory('');
if (!root.files['README.md']) await this.publishRaw('README.md',new Blob([LIBRARY_README],{type:'text/markdown'}));
}
return true;
}
async background(run) {
const users = LibraryCloudTransport.backgroundUsers;
let state = users.get(this.source);
if (!state) { state = { count:0,previous:this.source.backgroundAuth }; users.set(this.source,state); }
state.count++; this.source.backgroundAuth = true;
try { return await run(); }
finally { if (!--state.count) { this.source.backgroundAuth = state.previous; users.delete(this.source); } }
}
full(path) { return this.path + (path ? '/' + path : ''); }
async directory(path, create = false) {
if (path) {
const parts = path.split('/'); let parent = '';
for (const name of parts) {
const dir = await this.source.getDir(this.full(parent),true);
if (!Object.hasOwn(dir.dirs,name)) {
if (!create) return null;
try { await this.source.putDir(this.full(parent),name); }
catch (error) { if (!Object.hasOwn((await this.source.getDir(this.full(parent),true)).dirs,name)) throw error; }
}
parent += (parent ? '/' : '') + name;
}
}
return this.source.getDir(this.full(path),true);
}
scorePath(doc) { return scoreStoragePath(doc.storage_path); }
async loadSyncState() {
if (typeof this.source.listLibrarySnapshots !== 'function') throw new Error('This source does not support library synchronization');
const expectedState = await this.source.listLibrarySnapshots(this.full(''));
const snapshots = [];
for (const entry of expectedState) {
if (entry.size > 256 * 1024 * 1024) throw new Error('Cloud SQLite exceeds the supported 256 MiB size');
snapshots.push({...entry,file:await this.source.readLibrarySnapshot(this.full(''),entry)});
}
return {snapshots,expectedState};
}
reservePublication() { return this.source.reserveLibrarySnapshot?.() || crypto.randomUUID(); }
async publishSnapshot(file,{expectedState,publicationId}) {
return this.source.publishLibrarySnapshot(this.full(''),file,expectedState,publicationId);
}
async cleanup(versions,headCopies = []) {
if (!this.source.removeLibrarySnapshot) return;
for (const item of versions) await this.source.removeLibrarySnapshot(this.full(''),item);
if (this.source.compactLibrarySnapshots) {
const numbered = headCopies.find(item => item.name !== 'library.sqlite');
if (numbered) await this.source.compactLibrarySnapshots(this.full(''),numbered);
}
}
async listGenerations() {
const directory = await this.directory('_sync/generations');
if (!directory) return [];
const result = [];
for (const name of Object.keys(directory.files)) if (/^[a-f0-9]{64}\.json$/.test(name)) {
const file = await this.readPath('_sync/generations/' + name);
if (file.size > 1024 * 1024) throw new Error('Invalid restore generation');
const marker = validateLibraryGeneration(JSON.parse(await file.text()));
if (await this.generationKey(marker.id) + '.json' !== name) throw new Error('Invalid restore generation identity');
result.push(marker);
}
return result;
}
generationKey(id) { return hashLibraryBytes(new TextEncoder().encode(id)); }
async generationSnapshot(marker) { return this.readPath('_sync/generations/' + await this.generationKey(marker.id) + '.sqlite'); }
async publishGeneration(marker,file) {
const key = await this.generationKey(marker.id);
await this.publishRaw('_sync/generations/' + key + '.sqlite',file);
await this.publishRaw('_sync/generations/' + key + '.json',new Blob([JSON.stringify(marker)],{type:'application/json'}));
}
async restoreRequests() {
const root = await this.directory('restore');
return root ? Object.keys(root.dirs).map(name => ({id:name,path:'restore/' + name})) : [];
}
async listScores() {
await this.ensureFormat();
return listStoredScores({directory:path => this.directory(path)});
}
async readPath(path) {
const parts = path.split('/'), name = parts.pop(), parent = parts.join('/');
const dir = await this.directory(parent), file = dir?.files[name];
if (!file) throw Object.assign(new Error('Cloud file is missing: ' + path),{name:'NotFoundError'});
return new Blob([await this.source.getFileSrc(this.full(parent),name,dir,file)]);
}
async readScore(doc) { await this.ensureFormat(); return this.readPath(this.scorePath(doc)); }
async publish(path, file) {
await this.ensureFormat({create:true});
return this.publishRaw(path,file,true);
}
async publishRaw(path,file,guard = false) {
const parts = path.split('/'), name = parts.pop(), parent = parts.join('/');
const directory = await this.directory(parent,true);
if (Object.hasOwn(directory.files,name)) {
const existing = await this.readPath(path);
const digest = async blob => [...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].join(',');
if (existing.size !== file.size || await digest(existing) !== await digest(file)) throw Object.assign(new Error('A different cloud file already exists at ' + path),{retrySync:true});
return;
}
const pending = '.rostrum-' + crypto.randomUUID() + '.pending';
try {
await this.source.putFile(this.full(parent),pending,file);
await this.source.getDir(this.full(parent),true);
if (guard) await this.ensureFormat();
await this.source.renameFile(this.full(parent),pending,name);
} catch (error) {
try { await this.source.getDir(this.full(parent),true); await this.source.trashFile(this.full(parent),pending); } catch {  }
throw error;
}
}
writeScore(doc,file) { return this.publish(this.scorePath(doc),file); }
}
// #inclusion src/yin.js minified
class Yin {
audioContext = null;
a4Freq = 440;
currentStream = null;
currentSource = null;
highPassFilter = null;
lastValidFreq = null;
recentConfidences = [];
recentFrequencies = [];
smoothingWindow = 7;
workletNode = null;
released = false;
startId = 0;
constructor(callback) {
this.callback = callback;
}
init(audioContext) {
return this.initPromise ||= this.initAux(audioContext);
}
async initAux(audioContext) {
if(this.released) return;
let sharedContext = audioContext;
audioContext = this.audioContext = new AudioContext({ sampleRate: sharedContext.sampleRate });
this.sharedContext = sharedContext;
this.contextStateListener = () => {
if(this.released) return;
let change = sharedContext.state === 'running' ? audioContext.resume() : audioContext.suspend();
change.catch(error => console.warn("YIN audio state change failed", error));
};
sharedContext.addEventListener('statechange', this.contextStateListener);
this.contextStateListener();
this.highPassFilter = this.audioContext.createBiquadFilter();
this.highPassFilter.type = 'highpass';
this.highPassFilter.frequency.value = 40;
this.highPassFilter.Q.value = 0.7;
if (!this.audioContext.audioWorklet.yinModulePromise) {
this.audioContext.audioWorklet.yinModulePromise = (async () => {
let workletCode;
// #inclusion build/yin-worklet.js as workletCode
workletCode = `let WASM_BASE64;
// #inclusion build/yin-wasm.b64 as WASM_BASE64
WASM_BASE64 = \`AGFzbQEAAAABFwRgBX9/f31/AX1gAX8AYAABf2ACf38AAwUEAAECAwQFAXABAQEFBgEBggKCAgYIAX8BQZCIBAsHdAYGbWVtb3J5AgAFeWluZjAAABlfX2luZGlyZWN0X2Z1bmN0aW9uX3RhYmxlAQAIc2V0VGhyZXcAAxlfZW1zY3JpcHRlbl9zdGFja19yZXN0b3JlAAEcZW1zY3JpcHRlbl9zdGFja19nZXRfY3VycmVudAACCqUMBPkLAwx/BH0BfCMAIQwgBEGAgID8AzYCAAJAIAFBBEgNACACQQBMDQAgAkEobiIFIAFBAXYiByAFIAdJGyILQQEgAkHcC24gAkHcC0kbIgdJDQAgAkEUbiIFIAEgC2siBiAFIAZJGyINRQ0AIAFBA3EhCEEAIQUCQCABQQFrIg5BA08EQCABQfz///8HcSEPA0AgACAFQQJ0aiIGKgIMIhIgEpQgBioCCCISIBKUIAYqAgQiEiASlCAGKgIAIhIgEpQgEZKSkpIhESAFQQRqIQUgCUEEaiIJIA9HDQALIAhFDQELA0AgACAFQQJ0aioCACISIBKUIBGSIREgBUEBaiEFIApBAWoiCiAIRw0ACwtDAAAAACESIAMgESABsyIDlSIRkSITXg0AIBFDAAAAAFsNACATvEEBdEH///93Sw0AIAFBA3EhCEEAIQpDAAAAACERQQAhBQJAIA5BA08EQCABQfz///8HcSEPQQAhCQNAIBEgACAFQQJ0aiIGKgIAkiAGKgIEkiAGKgIIkiAGKgIMkiERIAVBBGohBSAJQQRqIgkgD0cNAAsgCEUNAQsDQCARIAAgBUECdGoqAgCSIREgBUEBaiEFIApBAWoiCiAIRw0ACwsgAUEDcSEFIBEgA5UhA0EAIQpBACEGAkAgDkEDTwRAIAFB/P///wdxIQhBACEJA0AgACAGQQJ0aiIBIAEqAgAgA5M4AgAgASABKgIEIAOTOAIEIAEgASoCCCADkzgCCCABIAEqAgwgA5M4AgwgBkEEaiEGIAlBBGoiCSAIRw0ACyAFRQ0BCwNAIAAgBkECdGoiASABKgIAIAOTOAIAIAZBAWohBiAKQQFqIgogBUcNAAsLIA1B/v//P3EhDyANQQFxIRAgDCALQQJ0QRNqQXBxIgFrIg4gAWshCEEAIQEDQEMAAAAAIREgASEFQQAhBkEAIQpBACEJAkAgDUEBRwRAA0AgACAGQQJ0aiIJKgIEIAAgBUECdGoiDCoCBJMiAyADlCAJKgIAIAwqAgCTIgMgA5QgEZKSIREgBUECaiEFIAZBAmohBiAKQQJqIgogD0cNAAsgBiEJIBBFDQELIAAgCUECdGoqAgAgACAFQQJ0aioCAJMiAyADlCARkiERCyAOIAFBAnRqIBE4AgAgASALRyEFIAFBAWohASAFDQALIAhBgICA/AM2AgAgByEFIAsEQEEBIQVDAAAAACERA0BDAACAPyESIBEgDiAFQQJ0IgBqKgIAIgOSIhFDAAAAAF4EQCADIBEgBbOVlSESCyAAIAhqIBI4AgAgBSALRiEAIAVBAWohBSAARQ0ACyAHIQULAkACQANAAkAgBUEBaiEGIAggBUECdGoqAgAiEUPNzMw9XQ0AIAUgC0YhACAGIQUgAEUNAQwCCwsgBiALTwRAIAUhBwwCCyAFIQcDQCARIAggBkECdGoqAgAiEV5FDQIgCyAGIgdBAWoiBksNAAsMAQsgCCAHQQJ0aioCACERAkAgCyAHayIAQQFqQQNxIgFFBEAgByEFDAELQQAhBiAHIQUDQCAIIAVBAnRqKgIAIgMgESADIBFdIgkbIREgBSAHIAkbIQcgBUEBaiEFIAZBAWoiBiABRw0ACwsgAEEDSQ0AA0AgCCAFQQNqIgBBAnRqKgIAIgMgCCAFQQJqIgFBAnRqKgIAIhIgCCAFQQFqIgZBAnRqKgIAIhMgCCAFQQJ0aioCACIUIBEgESAUXiIJGyIRIBEgE14iDBsiESARIBJeIgobIhEgAyARXSINGyERIAAgASAGIAUgByAJGyAMGyAKGyANGyEHIAVBBGohBSAAIAtHDQALCyAEIAggB0ECdGoiACoCACIDOAIAIAKzAn0CQCAHQQBMDQAgByALTg0AQwAAAAAhESADuyIVIBWgIAAqAgQiA7uhIABBBGsqAgAiEruhIhUgFaC2IhNDAAAAAFwEQCADIBKTIBOVIRELQwAAAAAgESARi0MAAAA/XhtDAAAAACARvEEBdEGAgIB4SRsgB7OSDAELIAeyC5UhEgsgEgsGACAAJAALBAAjAAscAEGACCgCAEUEQEGECCABNgIAQYAIIAA2AgALCw==\`;
class PitchDetectorWorklet extends AudioWorkletProcessor {
constructor() {
super();
this.wasmModule = null;
this.stopped = false;
this.bufferSize = 4096;
this.buffer = new Float32Array(this.bufferSize);
this.bufferIndex = 0;
this.minSignalThreshold = 0.005;
this.sampleRate = 44100;
let atob_polyfill = (b64) => {
let B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
let o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
ac = 0,
dec = "",
tmp_arr = [];
if (!b64) {
return b64;
}
b64 += '';
do {
h1 = B64.indexOf(b64.charAt(i++));
h2 = B64.indexOf(b64.charAt(i++));
h3 = B64.indexOf(b64.charAt(i++));
h4 = B64.indexOf(b64.charAt(i++));
bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;
o1 = bits >> 16 & 0xff;
o2 = bits >> 8 & 0xff;
o3 = bits & 0xff;
if (h3 == 64) {
tmp_arr[ac++] = String.fromCharCode(o1);
} else if (h4 == 64) {
tmp_arr[ac++] = String.fromCharCode(o1, o2);
} else {
tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
}
} while (i < b64.length);
dec = tmp_arr.join('');
return dec;
};
let wasmBytes = Uint8Array.from(atob_polyfill(WASM_BASE64), c => c.charCodeAt(0));
WebAssembly.instantiate(wasmBytes, {}).then(wasm => {
if(!this.stopped) this.wasmModule = wasm.instance;
});
this.port.onmessage = (e) => {
if(e.data.stop) {
this.stopped = true;
this.wasmModule = this.buffer = null;
this.port.onmessage = null;
return;
}
if (e.data.sampleRate) {
this.sampleRate = e.data.sampleRate;
}
};
}
process(inputs) {
if(this.stopped) {
this.port.postMessage({ stopped: true });
return false;
}
if (!this.wasmModule) return true;
let input = inputs[0][0];
if (!input) return true;
for (let i = 0; i < input.length; i++) {
this.buffer[this.bufferIndex++] = input[i];
if (this.bufferIndex >= this.bufferSize) {
let wasmMemory = new Float32Array(this.wasmModule.exports.memory.buffer);
wasmMemory.set(this.buffer, 0);
let confidenceOffset = this.bufferSize;
let freq = this.wasmModule.exports.yinf0(
0,
this.bufferSize,
this.sampleRate,
this.minSignalThreshold,
confidenceOffset * 4
);
let confidence = wasmMemory[confidenceOffset];
if (freq === 0) {
this.port.postMessage({ silence: true });
} else if (freq > 40 && freq < 2000 && confidence < 0.3) {
this.port.postMessage({ frequency: freq, confidence: confidence });
} else if (confidence >= 0.3) {
this.port.postMessage({ silence: true });
}
this.buffer.copyWithin(0, this.bufferSize / 2);
this.bufferIndex = this.bufferSize / 2;
}
}
return true;
}
}
registerProcessor('yin', PitchDetectorWorklet);
`;
      let workletUrl = URL.createObjectURL(new Blob([workletCode], { 'type': 'application/javascript' }));
try {
await audioContext.audioWorklet.addModule(workletUrl);
} finally {
if(workletUrl.startsWith("blob:")) URL.revokeObjectURL(workletUrl);
}
})().catch((err) => {
audioContext.audioWorklet.yinModulePromise = null;
throw err;
});
}
await audioContext.audioWorklet.yinModulePromise;
if(this.released) return;
this.workletNode = new AudioWorkletNode(this.audioContext, 'yin');
this.workletNode.port.postMessage({ sampleRate: this.audioContext.sampleRate });
this.workletNode.port.onmessage = (e) => {
if(this.released) return;
if (e.data.silence) {
this.recentFrequencies.length = 0;
this.recentConfidences.length = 0;
this.lastValidFreq = null;
this.callback({
freq: '0.00',
cents: '--',
confidence: 0,
});
return;
}
if (e.data.frequency) {
let confidence = e.data.confidence || 0.15;
let smoothedFreq = this.smoothFrequency(e.data.frequency, confidence);
let { cents, midi } = this.freqToMidi(smoothedFreq, this.a4Freq);
this.callback({
freq: smoothedFreq.toFixed(2),
cents: cents > 0 ? `+${cents}` : `${cents}`,
midi: midi,
confidence: confidence,
});
}
};
this.silentGain = this.audioContext.createGain();
this.silentGain.gain.value = 0;
this.workletNode.connect(this.silentGain);
this.silentGain.connect(this.audioContext.destination);
}
async start() {
if(this.released) return;
this.stop();
let startId = this.startId;
await this.initPromise;
if(this.released || startId !== this.startId) return;
if (this.audioContext.state === 'suspended') await this.audioContext.resume();
if(this.released || startId !== this.startId) return;
if (this.keepaliveStream) {
this.keepaliveStream.getTracks().forEach(t => t.stop());
this.keepaliveStream = null;
}
let stream = await navigator.mediaDevices.getUserMedia({ audio: true });
if(this.released || startId !== this.startId) {
stream.getTracks().forEach(track => track.stop());
return;
}
this.currentStream = stream;
this.currentSource = this.audioContext.createMediaStreamSource(this.currentStream);
this.currentSource.connect(this.highPassFilter);
this.highPassFilter.connect(this.workletNode);
}
stop() {
++this.startId;
if (this.currentSource) {
this.currentSource.disconnect();
this.currentSource = null;
}
if (this.currentStream) {
if (/AppleWebKit/.test(navigator.userAgent) && !/Android/.test(navigator.userAgent) && navigator.maxTouchPoints > 1) {
this.keepaliveStream = this.currentStream;
} else {
this.currentStream.getTracks().forEach(track => track.stop());
}
this.currentStream = null;
}
}
release() {
if(this.released) return;
this.released = true;
this.stop();
if (this.keepaliveStream) {
this.keepaliveStream.getTracks().forEach(t => t.stop());
this.keepaliveStream = null;
}
this.sharedContext?.removeEventListener('statechange', this.contextStateListener);
this.sharedContext = this.contextStateListener = null;
let context = this.audioContext, node = this.workletNode, gain = this.silentGain;
this.releasePromise = new Promise(resolve => {
let finished = false, timeout;
let finish = () => {
if(finished) return;
finished = true;
clearTimeout(timeout);
if(node) {
node.port.onmessage = null;
node.port.close();
node.disconnect();
}
gain?.disconnect();
let closing = context && context.state !== 'closed' ? context.close() : Promise.resolve();
closing.catch(error => console.warn("YIN audio cleanup failed", error)).finally(resolve);
};
if(!node || context.state === 'closed') return finish();
timeout = setTimeout(finish, 1000);
node.port.onmessage = e => { if(e.data.stopped) finish(); };
node.port.postMessage({ stop: true });
context.resume().catch(finish);
});
this.highPassFilter?.disconnect();
this.workletNode = this.highPassFilter = this.silentGain = null;
this.callback = null;
this.audioContext = null;
this.recentFrequencies.length = this.recentConfidences.length = 0;
this.lastValidFreq = null;
}
setA4Frequency(freq) {
if (freq > 0) {
this.a4Freq = freq;
}
}
smoothFrequency(freq, confidence) {
if (this.recentFrequencies.length > 0) {
let lastWeightedAvg = this.getWeightedAverage(this.recentFrequencies, this.recentConfidences);
let semitoneDiff = Math.abs(12 * Math.log2(freq / lastWeightedAvg));
if (semitoneDiff > 1.0) {
this.recentFrequencies.length = 0;
this.recentConfidences.length = 0;
}
}
this.recentFrequencies.push(freq);
this.recentConfidences.push(confidence);
if (this.recentFrequencies.length > this.smoothingWindow) {
this.recentFrequencies.shift();
this.recentConfidences.shift();
}
return this.getWeightedAverage(this.recentFrequencies, this.recentConfidences);
}
getWeightedAverage(freqs, confidences) {
let weightedSum = 0;
let weightSum = 0;
for (let i = 0; i < freqs.length; i++) {
let weight = 1.0 - confidences[i];
weightedSum += freqs[i] * weight;
weightSum += weight;
}
return weightSum > 0 ? weightedSum / weightSum : freqs[freqs.length - 1];
}
freqToMidi(freq, a4Freq = 440) {
let halfSteps = 12 * Math.log2(freq / a4Freq);
let noteNum = Math.round(halfSteps) + 69;
let targetFreq = a4Freq * Math.pow(2, (noteNum - 69) / 12);
let cents = Math.round(1200 * Math.log2(freq / targetFreq));
return { cents, midi: noteNum };
}
}
// #inclusion src/tool.js minified
class Actx {
static instance = null;
static get() {
if(Actx.instance == null) Actx.instance = new Actx();
return [Actx.instance.actx, Actx.instance.bus];
}
constructor() {
this.actx = new AudioContext();
let volume = new GainNode(this.actx);
volume.gain.setValueAtTime(_menu_.rings.more.cells.volume.stash.volume, this.actx.currentTime);
volume.connect(this.actx.destination);
listen(_body_, "VOLUME", (e) => volume.gain.setValueAtTime(e.detail, this.actx.currentTime));
this.bus = new DynamicsCompressorNode(this.actx, {
threshold: -50, knee: 40, ratio: 12, attack: 0, release: 0.25,
});
this.bus.connect(volume);
listen(document, 'visibilitychange', () => {
if(!document.hidden) {
if(this.actx.state == "suspended") this.actx.resume().catch(() => {
dialog(`Audio resources are currently in use by another tab or window.<br><br>To restore audio:
<br>• Close other tabs using audio
<br>• Or switch to those tabs and stop their audio
<br>Then click retry`,
{ Retry: { svg: "Undo" }, Cancel: { svg: "Cancel" } },
(e, prop, tag, args) => {
args.close();
if (tag == "Retry") document.dispatchEvent(new Event("visibilitychange"));
else {
let msg = "";
if(panels.metronome) { panels.metronome.close(); msg += "Closed Metronome. ";}
if(panels.piano) { panels.piano.close(); msg += "Closed Piano. "; }
if(panels.review) { panels.review.close(); msg += "Closed Review. ";}
if(msg.length > 0) toast("Note: " + msg);
}
}
);
});
}
else if(this.actx.state == "running") this.actx.suspend();
});
listen(window, 'beforeunload', () => {
if(this.actx && this.actx.state != 'closed') this.actx.close();
});
}
}
let centsToHz = (cents) => Math.pow(2, cents / 1200) * 440;
let hzToCents = (hz) => 1200 * Math.log2(hz / 440);
class Piano {
closed = false;
static css = css(
"Piano",
`
.Piano__keyboard {
display:flex;
position:relative;
width:max-content;
flex-shrink:0; /* keep full width; otherwise the body's flexbox shrinks
this element to the panel width, so offsetWidth (used as
the range button's bounds) collapses and scroll offset calculation fails */
}
.Piano__key-white {
flex-shrink:0;
height:16em;
width:4em;
z-index:1;
box-sizing: border-box;
border-top:.06em solid transparent;
border-left:.06em solid #bbb;
border-bottom:.06em solid #bbb;
border-radius:0 0 .3em .3em;
box-shadow:-.06em 0 0 rgba(255,255,255,0.8) inset,0 0 .3em #ccc inset,0 0 .18em rgba(0,0,0,0.2);
background:linear-gradient(to bottom,#eee 0%,#fff 100%);
touch-action: manipulation;
user-select: none;
}
.Piano__key-white:active, .Piano__key-white.pressed {
border-top:.06em solid #777;
border-left:.06em solid #999;
border-bottom:.06em solid #999;
box-shadow:.18em 0 .18em rgba(0,0,0,0.1) inset,-.3em .3em 1.2em rgba(0,0,0,0.2) inset,0 0 .18em rgba(0,0,0,0.2);
background:linear-gradient(to bottom,#fff 0%,#e9e9e9 100%);
touch-action: manipulation; /* removes 300ms delay  browsers add for touch interactions (waiting to see if it's a double-tap) */
}
.Piano__key-black {
flex-shrink:0;
height:8em;
width:2em;
margin:0 0 0 -1em;
z-index:2;
box-sizing: border-box;
border:.06em solid #000;
border-radius:0 0 .18em .18em;
box-shadow:-.06em -.06em .18em rgba(255,255,255,0.2) inset,0 -.3em .18em 3px rgba(0,0,0,0.6) inset,0 .18em .24em rgba(0,0,0,0.5);
background:linear-gradient(45deg,#222 0%,#555 100%);
touch-action: manipulation;
user-select: none;
}
.Piano__key-black:active, .Piano__key-black.pressed {
box-shadow:-.06em -.06em .18em rgba(255,255,255,0.2) inset,0 -.18em .18em 3px rgba(0,0,0,0.6) inset,0 .06em .18em rgba(0,0,0,0.5);
background:linear-gradient(to right,#444 0%,#222 100%)
touch-action: manipulation;
}
.a,.b,.d,.e,.g {
margin:0 0 0 -1.16em
}
/* piano buttons (pedaldown/up, resize, pitch, options, repeat) are surrounded by a larger "holder" button that makes their
touch area bigger: this helps on  small screens where they are otherwise hard to touch */
.Piano__button-holder {
position: absolute;
font-family: Bravura;
height: 4em;
width: 5em;
top: -.5em;
}
.Piano__button {
position: absolute;
font-family: Bravura;
height: 2em;
width: 2em;
top: calc(50% - 1em);
left:calc(50% - 1em);
border-radius: 100%;
background: #eee6;
color: #000;
}
.Piano__button-active {
background: #3336;
}
.Piano__options-face {
font-size:.75em;
}
.Piano__options {
position:absolute;
width:27em;
height:15.5em;
top:3.125em;
z-index:150;
background: var(--panel-bg);
border-radius: var(--borderRadius);
overflow:hidden;
left: calc(50% - 13.5em);
filter: var(--bodyShadow);
visibility:hidden;
text-align:center;
box-shadow: var(--panel-inset-shadow);
color: var(--body-color);
}
.Piano__options__options {
margin: .6em 2.5em .6em 2.5em;
padding: 1em;
font-size: .93em;
line-height: 1.45em;
text-align:left;
background: var(--color-surface-selected);
border-radius:var(--borderRadius);
}
.Piano__options__option {
/* marker only */
}
.Piano__options__option-active {
background: var(--color-accent);
border-radius: .2em;
}
`
);
temperaments = {
Equal: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200],
};
tunings = {
Meanquar: { description: "1/4-comma meantone scale. Pietro Aaron's temp. (1523). 6/5 beats twice 3/2", frequencies: [261.6255653006, 273.37431312998, 292.50627485027, 312.977175335, 327.03195662575, 349.91912034749, 365.63284274659, 391.22147055517, 408.78994578219, 437.39890198442, 468.01003810189, 489.02683710225, 523.2511306012], name: "Meanquar" },
Werck3: { description: "Andreas Werckmeister's temperament III (the most famous one, 1691)", frequencies: [261.6255653006, 275.62199471997, 292.34127285051, 310.07474405997, 327.77163799145, 348.83408706747, 367.49599295996, 391.11111150212, 413.43299207996, 437.02884834934, 465.11211608996, 491.65745674141, 523.2511306012], name: "Werck3" },
Kirnberger: { description: "Kirnberger's well-temperament, also called Kirnberger III, letter to Forkel 1779", frequencies: [261.6255653006, 275.62199471997, 292.50627485027, 310.07474405997, 327.03195662575, 348.83408706747, 367.91095120397, 391.22147055517, 413.43299207996, 437.39890198442, 465.11211608996, 490.54793493862, 523.2511306012], name: "Kirnberger" },
Young: { description: "Thomas Young well temperament (1807), also Luigi Malerbi nr.2 (1794)", frequencies: [261.6255653006, 275.62199471997, 293.00227310437, 310.07474405997, 328.14198392915, 348.83408706747, 367.49599295996, 391.5530240856, 413.43299207996, 438.51190905657, 465.11211608996, 491.10256480205, 523.2511306012], name: "Young" },
};
elm = helm(`<div style="justify-content:flex-start;display:flex;" data-tag="body">
<div data-tag="keyboard" class="Piano__keyboard">${this.buildKeyboard()}</div>
<div data-tag="options" class="Piano__options"></div>
</div>`);
sustaining = false;
tuning = false;
repeater = new Schedule();
damper = new Schedule();
looper = new Schedule();
horizontalDragConstraint = {
min: 0,
max: 0,
};
constructor(panel, cell) {
this.panel = panel;
this.cell = cell;
this.keyboardLeft = null;
this.userWidth = null;
this.pointerKeys = new Map();
Object.assign(this, dataIndex("tag", this.elm));
this.c4Elm = dataIndex("sample", this.elm)["60/0"];
let toCents = (num, den) => 1200 * Math.log2(num / den);
for (let [key, val] of Object.entries(this.tunings)) {
let cents = [0];
for (let i = 0; i < 12; i++) {
cents.push(toCents(val.frequencies[i + 1], val.frequencies[i]) + cents[i]);
}
this.temperaments[key] = cents;
}
let pedalDownButton = helm(
`<div class="Piano__button-holder" style="right: calc(50% + 10em)">
${iconSvg("Pedal", { tag: "pedal", class: "Piano__button" })}</div>`);
let pedalUpButton = helm(
`<div class="Piano__button-holder" style="right: calc(50% + 10em)">
${iconSvg("Pedal Up", {tag: "pedalup", class: "Piano__button" })}</div>`);
this.panel.header.append(pedalDownButton);
this.panel.listeners.push(
listen(pedalDownButton, ["pointerdown", "spacebar"], (e) => {
e.stopPropagation();
e.taken = true ;
this.sustaining = true;
pedalDownButton.replace(pedalUpButton);
})
);
this.panel.listeners.push(
listen(pedalUpButton, ["pointerdown", "spacebar"], (e) => {
e.stopPropagation();
e.taken = true ;
this.sustaining = false;
pedalUpButton.replace(pedalDownButton);
})
);
Object.assign(this, { pedalDownButton, pedalUpButton });
this.panel.listeners.push(
listen(document, ["keydown", "keyup"], (e) => {
if (e.code == "Space" && !e.repeat) {
let e2 = new PointerEvent("spacebar");
if (e.type == "keydown") pedalDownButton.dispatchEvent(e2);
else pedalUpButton.dispatchEvent(e2);
}
})
);
let stretcherButton = helm(
`<div class="Piano__button-holder" style="right: calc(50% + 5.5em)">
${iconSvg("Stretcher", { tag: "tune", class: "Piano__button" })}</div>`);
this.panel.header.append(stretcherButton);
this.panel.listeners.push(
listen(stretcherButton, "pointerdown", (e) => {
e.stopPropagation();
e.taken = true ;
let W = this.panel.panel.clientWidth;
let K = this.keyboard.offsetWidth;
let emSize = parseFloat(getComputedStyle(this.panel.elm).fontSize);
let minDrag = -5 * emSize;
let maxDrag = 16 * emSize;
let labelWidth = this.panel.title ? this.panel.title.offsetWidth : 100;
let minWidth = this.c4Elm.offsetWidth * 10;
let maxWidth = Math.min(K, 2 * window.innerWidth - labelWidth / 2);
e.startWidth = W;
e.target.setPointerCapture(e.pointerId);
stretcherButton.firstElementChild.classList.add("Piano__button-active");
this.panel.header.classList.add("Panel__header-selected");
let mv = listen(e.target, "pointermove", (emv) => {
let delta = emv.clientX - e.clientX;
let factor = (maxWidth - minWidth) / (maxDrag - minDrag);
let newWidth = clamp(e.startWidth + delta * factor, minWidth, maxWidth);
this.panel.panel.style.width = pxToEm(newWidth, this.panel.elm);
this.userWidth = newWidth;
if (K > newWidth) {
this.keyboardLeft = clamp(this.keyboardLeft, newWidth - K, 0);
} else {
this.keyboardLeft = (newWidth - K) / 2;
}
this.keyboard.style.left = this.keyboardLeft + "px";
});
listen(e.target, "pointerup",
() => {
unlisten(mv);
stretcherButton.firstElementChild.classList.remove("Piano__button-active");
this.panel.header.classList.remove("Panel__header-selected");
},
{ once: true }
);
})
);
let rangeButton = helm(
`<div class="Piano__button-holder" style="right: calc(50% + 1em)">
${iconSvg("Range", { tag: "tune", class: "Piano__button" })}</div>`);
this.panel.header.append(rangeButton);
this.panel.listeners.push(
listen(rangeButton, "pointerdown", (e) => {
e.stopPropagation();
e.taken = true ;
let W = this.panel.panel.clientWidth;
let K = this.keyboard.offsetWidth;
if (K <= W) return;
e.startLeft = parseFloat(this.keyboard.style.left) || 0;
e.target.setPointerCapture(e.pointerId);
rangeButton.firstElementChild.classList.add("Piano__button-active");
this.panel.header.classList.add("Panel__header-selected");
let mv = listen(e.target, "pointermove", (emv) => {
let delta = emv.clientX - e.clientX;
let shiftDelta = delta * 4 * (K - W) / K;
let newLeft = clamp(e.startLeft + shiftDelta, W - K, 0);
this.keyboard.style.left = newLeft + "px";
this.keyboardLeft = newLeft;
});
listen(e.target, "pointerup",
() => {
unlisten(mv);
rangeButton.firstElementChild.classList.remove("Piano__button-active");
this.panel.header.classList.remove("Panel__header-selected");
},
{ once: true }
);
})
);
this.optionsButton = helm(
`<div class="Piano__button-holder" style="left: calc(50% + 1em)">
${iconSvg("Options", { tag: "options", class: "Piano__button",
style: "transform:scale(.9) translate(0px,2px);"})}` );
this.panel.header.append(this.optionsButton);
this.panel.listeners.push(
listen(this.optionsButton, "pointerdown", (e) => {
e.stopPropagation();
e.taken = true ;
if (this.optionsButton.firstElementChild.classList.contains("Piano__button-active")) {
this.optionsButton.firstElementChild.classList.remove("Piano__button-active");
this.optionsView.elm.style.visibility = "hidden";
} else {
this.optionsButton.firstElementChild.classList.add("Piano__button-active");
this.optionsView.elm.style.top = "" ;
this.optionsView.elm.style.left = "calc(50% - 13.5em);";
this.optionsView.elm.style.visibility = "visible";
}
})
);
this.repeatButton = helm(
`<div class="Piano__button-holder" style="left: calc(50% + 5.5em)">
${iconSvg("Repeat", { tag: "tune", class: "Piano__button" })}</div`);
this.panel.header.append(this.repeatButton);
this.panel.listeners.push(
listen(this.repeatButton, "pointerdown", (e) => {
e.stopPropagation();
e.taken = true ;
this.repeatButton.firstElementChild.classList.toggle("Piano__button-active");
this.tuning = this.repeatButton.firstElementChild.classList.contains("Piano__button-active");
if (this.repeatScheduler) {
this.repeatScheduler.cancel();
this.repeatScheduler = null;
}
})
);
this.pitchButton = helm(
`<div class="Piano__button-holder" style="left: calc(50% + 10em)">
${iconSvg("TuningFork", { tag: "pitch", class: "Piano__button",
style: "transform:scale(.9) translate(0px,2px);"})}` );
this.panel.header.append(this.pitchButton);
this.panel.listeners.push(
listen(this.pitchButton, "pointerdown", (e) => {
e.stopPropagation();
e.taken = true ;
this.marker.remove();
if (this.pitchButton.firstElementChild.classList.contains("Piano__button-active")) {
this.pitchButton.firstElementChild.classList.remove("Piano__button-active");
this.yin.stop();
} else {
this.pitchButton.firstElementChild.classList.add("Piano__button-active");
this.yin.start(this.cell.stash.a4).catch((err) => {
if(this.closed) return;
this.pitchButton.firstElementChild.classList.remove("Piano__button-active");
toast(err.name == "NotAllowedError"
? "Microphone access denied"
: "No usable microphone found");
});
}
})
);
let updateMicAvailability = async () => {
let hasMic = false;
try {
let devices = await navigator.mediaDevices.enumerateDevices();
hasMic = devices.some((d) => d.kind == "audioinput");
} catch (e) {}
if(this.closed) return;
this.pitchButton.style.opacity = hasMic ? "" : "0.35";
this.pitchButton.style.pointerEvents = hasMic ? "" : "none";
if (!hasMic && this.pitchButton.firstElementChild.classList.contains("Piano__button-active")) {
this.pitchButton.firstElementChild.classList.remove("Piano__button-active");
this.marker.remove();
this.yin?.stop();
}
};
updateMicAvailability();
if (navigator.mediaDevices?.addEventListener)
this.panel.listeners.push(listen(navigator.mediaDevices, "devicechange", updateMicAvailability));
this.marker = helm(`<div style="z-index:1000;position:relative;top:50%;left:calc(50% - 1.75em);width:3.5em;
display:flex;flex-direction:column;align-items:center;pointer-events:none;">
<div style="font-family:Bravura;font-size:3.5em;line-height:1;">\uE0A2</div>
<div style="font-size:0.8em;font-weight:bold;margin-top:-0.3em;"></div>
</div>`);
delay(1, async() => {
if(this.closed) return;
let self = this;
let [actx] = Actx.get();
this.yin = new Yin((arg) => {
if (!self.pitchButton.firstElementChild.classList.contains("Piano__button-active")) {
self.marker.remove();
return;
}
let key = arg.freq > 0 ? dataIndex("midi",self.elm)["" + arg.midi] : null;
if(key) {
let isBlack = [1,3,6,8,10].includes(arg.midi % 12);
this.marker.style.color = isBlack ? "#ffffff" : "#000000";
this.marker.style.textShadow = isBlack ? "0 0 2px #000000, 0 0 4px #000000" : "none";
this.marker.style.top = isBlack ? "30%" : "50%";
this.marker.style.opacity = 0.5 + (arg.confidence || 0.3) * 0.5;
this.marker.children[1].innerText = arg.cents;
key.append(self.marker);
} else {
this.marker.style.color = "#808080";
this.marker.style.opacity = "0.3";
}
});
try {
await this.yin.init(actx);
} catch(error) {
this.yin.release();
if(!this.closed) {
this.pitchButton.style.pointerEvents = "none";
this.pitchButton.style.opacity = "0.35";
console.error("Pitch detector initialization failed:", error);
}
}
});
this.buildAudio().catch(error => toast(error.message));
this.buildOptions();
}
destructor() {
this.closed = true;
if(this.activeNotes) {
this.activeNotes.forEach((note, tag) => {
if(note.source) {
note.source.stop();
note.source.disconnect();
}
if(note.envelope) note.envelope.disconnect();
});
this.activeNotes.clear();
}
this.repeater.cancel();
this.damper.cancel();
this.looper.cancel();
if (this.yin) this.yin.release();
}
async buildAudio() {
this.activeNotes = new Map();
let [actx, bus] = Actx.get();
if (actx.state === 'suspended') actx.resume().catch(() => {});
const pages = globalThis._rostrumPages_;
const samples = pages ? await pages.piano(actx) : pianoSamples;
if(!pages && !(samples[60] instanceof AudioBuffer)) Object.keys(samples).forEach(async (key) => {
let noteSamples = samples[key];
let len = noteSamples.length;
let bytes = new Uint8Array(len);
for (let i = 0; i < len; i++) bytes[i] = noteSamples.charCodeAt(i);
actx.decodeAudioData(bytes.buffer, (res) => (samples[key] = res));
});
let noteOff = (tag, force=false) => {
let keyElm = this.keyboard.querySelector(`[data-sample="${tag}"]`);
if (keyElm) keyElm.classList.remove("pressed");
let note = this.activeNotes.get(tag);
if(note && (force || !(this.sustaining || this.tuning)))  {
note.envelope.gain.setTargetAtTime(0, actx.currentTime, 0.015);
this.activeNotes.delete(tag);
schedule(100, () => note.source.stop());
}
}
listen([this.pedalUpButton, this.repeatButton], ["pointerdown","spacebar"], (e)=> {
this.activeNotes.forEach((note, tag) => noteOff(tag, true));
this.repeater.cancel();
this.damper.cancel();
this.looper.cancel();
});
let noteOn = (midiOffset) => {
let [midiNum, centsOffset] = midiOffset.split("/");
let piano = this.cell.stash.timbre == "piano";
let now = actx.currentTime;
let source;
let envelope = new GainNode(actx);
if (piano) {
source = new AudioBufferSourceNode(actx);
source.buffer = samples[midiNum];
}
else
source = new OscillatorNode(actx, {
frequency: 440 * (2 ** ((midiNum - 69) / 12)),
type: "sine",
});
let midi0 = midiNum % 12;
source.detune.value = parseInt(centsOffset) + this.cell.stash.a4
+ this.temperaments[this.cell.stash.temperament][midi0] - midi0 * 100;
source.connect(envelope);
envelope.connect(bus);
if (this.tuning) {
let repeatMs = piano ? 2500:4000;
this.repeater.run(repeatMs, () => noteOn(midiOffset));
this.repeatButton.firstElementChild.animate([{ color: "black" }, { color: "white" }], repeatMs);
this.damper.run(piano ? 2200:7500, () => envelope.gain.setTargetAtTime(0.0, now, 0.015));
}
else {
if (!piano) {
envelope.gain.setValueAtTime(0, now);
envelope.gain.setTargetAtTime(1.0, now, 0.005);
envelope.gain.setTargetAtTime(0.0, now + 1.0, 3.0);
let noteSource = source;
schedule(12000, () => {
let currentNote = this.activeNotes.get(midiOffset);
if (currentNote && currentNote.source === noteSource) {
noteOff(midiOffset, true);
}
});
} else {
envelope.gain.setTargetAtTime(1.0, now, 0.005);
}
}
if(this.activeNotes.has(midiOffset))
noteOff(midiOffset, true);
while(this.activeNotes.size > this.cell.stash["voices"] - 1) noteOff(this.activeNotes.keys().next().value, true);
let keyElm = this.keyboard.querySelector(`[data-sample="${midiOffset}"]`);
if (keyElm) keyElm.classList.add("pressed");
source.start(0);
this.activeNotes.set(midiOffset, { midiOffset, envelope, source});
};
this.panel.listeners.push(listen(this.keyboard, "pointerdown", (e) => {
let key = e.target.closest('[data-sample]');
if (!key) return;
e.stopPropagation();
this.keyboard.setPointerCapture(e.pointerId);
let midiOffset = key.dataset.sample;
this.pointerKeys.set(e.pointerId, midiOffset);
noteOn(midiOffset);
}));
this.panel.listeners.push(listen(this.keyboard, "pointermove", (e) => {
if (!this.pointerKeys.has(e.pointerId)) return;
let target = document.elementFromPoint(e.clientX, e.clientY);
let key = target ? target.closest('[data-sample]') : null;
let currentMidiOffset = this.pointerKeys.get(e.pointerId);
if (key) {
let newMidiOffset = key.dataset.sample;
if (newMidiOffset !== currentMidiOffset) {
if (currentMidiOffset) noteOff(currentMidiOffset);
this.pointerKeys.set(e.pointerId, newMidiOffset);
noteOn(newMidiOffset);
}
} else {
if (currentMidiOffset) {
noteOff(currentMidiOffset);
this.pointerKeys.set(e.pointerId, null);
}
}
}));
this.panel.listeners.push(listen(this.keyboard, ["pointerup", "pointercancel"], (e) => {
let currentMidiOffset = this.pointerKeys.get(e.pointerId);
if (currentMidiOffset) noteOff(currentMidiOffset);
this.pointerKeys.delete(e.pointerId);
}));
}
buildKeyboard() {
let keyHtml = "";
let noteNames = ["c", "cs", "d", "ds", "e", "f", "fs", "g", "gs", "a", "as", "b"];
let midiTable = {
0: [0, 0],
1: [0, 100],
2: [3, -100],
3: [3, 0],
4: [3, 100],
5: [6, -100],
6: [6, 0],
7: [6, 100],
8: [9, -100],
9: [9, 0],
10: [9, 100],
11: [12, -100],
};
for (let midi = 29; midi < 89; midi++) {
let midi0 = midi % 12;
let octave = Math.floor(midi / 12) * 12;
let noteName = noteNames[midi0];
let clazz = noteName.includes("s") ? "Piano__key-black" : "Piano__key-white" + " " + noteName;
let realMidiNumber = midiTable[midi0][0] + octave;
let midiOffset = realMidiNumber + "/" + midiTable[midi0][1];
keyHtml += `<div data-sample="${midiOffset}" data-midi=${"" + midi} class="${clazz}"></div>\n`;
}
keyHtml += `<div data-sample="87/200" class="Piano__key-white f"></div>`;
return keyHtml;
}
buildOptions() {
let optionsView = new TabView(this.panel, "Pitch", "Temperament", "Timbre");
let elm = optionsView.elm;
elm.classList.add("Piano__options");
this.options.replace(elm);
this.options = elm;
optionsView.frame.style.marginTop = 0;
optionsView.draggable = false;
this.panel.listeners.push(
listen(optionsView.sash, "pointerdown", (e) => {
optionsView.sash.classList.add("Panel__header-selected");
let offsetX = e.clientX - optionsView.frame.offsetLeft;
let limit = this.body.offsetWidth - optionsView.frame.offsetWidth;
let drag = new Drag(e) ;
let mv = listen(optionsView.frame, "pointermove", (emv) => {
drag.mv(emv) ;
if(drag.moved) {
if(emv.movementX) optionsView.sash.setPointerCapture(e.pointerId);
optionsView.frame.style.left = clamp(emv.clientX - offsetX, 0, limit) + "px";
e.emv = emv;
}
});
listen(optionsView.sash, "pointerup", (eup) => {
drag.up(eup) ;
if(!drag.lift && !drag.jab && drag.vXY > 0.75) {
hide(elm, this.optionsButton);
delay(10, () => this.optionsButton.firstElementChild.classList.remove("Piano__button-active"));
}
optionsView.sash.classList.remove("Panel__header-selected");
unlisten(mv)},
{once:true});
}));
let option = (tag, optText, prefix=" ", url=null, urlText="") => {
let txt1 =`<div ${tag} class="Piano__options__option">&nbsp;${optText}<span style="position:absolute;left:18em;">${prefix}`;
let txt2 = url ? noTranslate(`<a href="https:/\/${url}">${urlText}</a>`) + "</span></div>"
: "</span></div>";
return txt1 + txt2
};
{
let tags = dataIndex("tag", helm(`
<div data-tag="pitch" class="Piano__options-face">
<div data-tag="a4" style="width:50em;margin-top:.4em;"></div>
<div data-tag="options" class="Piano__options__options">
${option("data-hz=\"415\"", noTranslate("A = 415 Hz"),  "",
"en.wiktionary.org/wiki/baroque_pitch", "Baroque Pitch")}
${option("data-hz=\"430.54\"", noTranslate("A = 430.54 Hz"), "",
"en.wikipedia.org/wiki/Scientific_pitch","Scientific Pitch")}
${option("data-hz=\"432\"", noTranslate("A = 432 Hz"), "",
"www.youtube.com/watch?v=LjR0WpWwLrE","Verdi's A")}
${option("data-hz=\"440\"", noTranslate("A = 440 Hz"), "International Standard ",
"www.iso.org/standard/3601.html", "ISO 16:1975")}
${option("data-hz=\"442\"", noTranslate("A = 442 Hz"), noTranslate("New York Philharmonic"))}
${option("data-hz=\"443\"", noTranslate("A = 443 Hz"), noTranslate("Berliner Philharmoniker"))}
${option("data-hz=\"466\"", noTranslate("A = 466 Hz"), "",
"boulderbachbeat.wordpress.com/tag/chorton/","Chorton")}
</div>
</div>`)
);
optionsView.tabs.Pitch.face.append(tags.pitch);
let a4msg = (tag, cents) => {
let hz = centsToHz(cents).toFixed(2);
cents = Math.round(cents);
hz = parseInt(hz * 100) / 100;
let inHz = `A4 = ${hz} Hz `;
let inCents = cents == 0 ? "" :
cents > 0 ? `(440 Hz + ${cents} cents)`:
`(440 Hz - ${-cents} cents)`;
return noTranslate(inHz + inCents);
};
let optionElms = Object.values(dataIndex("hz", tags.options));
let a4Group = new SliderGroup(this.cell.stash,
{ a4:
{
slope: 0.2,
min: -1200,
max: 1200,
msg: a4msg,
step: 1,
},
},
(e, tag, value) => {
optionElms.forEach((elm) => elm.classList.remove("Piano__options__option-active"));
}
);
tags.a4.replace(a4Group.elm);
this.panel.listeners.push(listen(tags.options, "pointerup", (e) => {
let active = e.target.closest(".Piano__options__option");
if (!active) return;
optionElms.forEach((elm) => elm.classList.remove("Piano__options__option-active"));
active.classList.add("Piano__options__option-active");
this.cell.stash.a4 = hzToCents(active.dataset.hz);
a4Group.refresh();
}));
for(let elm of optionElms)
if (elm.dataset.hz == centsToHz(this.cell.stash.a4)) {
elm.classList.add("Piano__options__option-active");
break;
};
}
{
let tags = dataIndex("tag", helm(
`<div data-tag="temperament" style="padding-top:2.5em" class="Piano__options-face">
<div data-tag="options" class="Piano__options__options">
${option("data-temper=\"Equal\"", noTranslate("Equal"),  noTranslate("<sup>12</sup>\u221A2, "), // a formula: translator <font> wrappers inherit the <sup>'s vertical-align and shift the line
"en.wikipedia.org/wiki/12_equal_temperament", "12-ET")}
${option("data-temper=\"Meanquar\"", noTranslate("\u00bc Comma Meantone"), "1523, ",
"en.wikipedia.org/wiki/Pietro_Aron", "Pietro Aron")}
${option("data-temper=\"Werck3\"", noTranslate("Werckmeister III"), "1691, ",
"www.hpschd.nu/index.html?nav/nav-4.html&t/welcome.html&https:/\/www.hpschd.nu/tech/tmp/werckmeister.html",
"Werckmeister III")}
${option("data-temper=\"Kirnberger\"", noTranslate("Kirnberger III"), "1779, ",
"en.wikipedia.org/wiki/Kirnberger_temperament", "Kirnberger Temperament")}
${option("data-temper=\"Young\"", noTranslate("Vallotti Young"),"1799, ","en.wikipedia.org/wiki/Young_temperament", "Young Temperament")}
</div>
</div>`)
);
optionsView.tabs.Temperament.face.append(tags.temperament);
let optionElms = Object.values(dataIndex("temper", tags.options));
this.panel.listeners.push(listen(tags.options, "pointerup", (e) => {
let active = e.target.closest(".Piano__options__option");
if (!active) return;
optionElms.forEach((elm) => elm.classList.remove("Piano__options__option-active"));
active.classList.add("Piano__options__option-active");
this.cell.stash.temperament = active.dataset.temper;
}));
for(let elm of optionElms)
if (elm.dataset.temper == this.cell.stash.temperament) {
elm.classList.add("Piano__options__option-active");
break;
};
}
{
let tags = dataIndex("tag", helm(
`<div data-tag="timbre" class="Piano__options-face">
<div data-tag="voices" style="width:50em;padding-bottom:1.5em;"></div>
<div data-tag="options" class="Piano__options__options">
${option("data-timbre=piano","Piano",noTranslate("Yamaha C5") + ", ", "archive.org/details/SalamanderGrandPianoV3","Salamander V3")}
${option("data-timbre=sine","Tuning Fork", "Pure Sine Wave, ",
"www.whipplemuseum.cam.ac.uk/explore-whipple-collections/acoustics/historical-notes-brief-chronicle-tuning-fork",
"Brief Chronicle")}
</div>
</div>`));
let voicesGroup = new SliderGroup(this.cell.stash,
{ voices:
{ slope: 0.5,
min: 1,
max: 16,
msg: (tag, value) => value == 1 ? "Monophonic": value + " Voices",
step: 1,
value: 1,
} }, (e, tag, value) => {}
);
voicesGroup.elm = tags.voices.replace(voicesGroup.elm);
voicesGroup.elm.style.paddingBottom = "1em";
optionsView.tabs.Timbre.face.append(tags.timbre);
let optionElms = Object.values(dataIndex("timbre", tags.options));
this.panel.listeners.push(listen(tags.options, "pointerup", (e) => {
optionElms.forEach((elm) => elm.classList.remove("Piano__options__option-active"));
let active = e.target.closest(".Piano__options__option");
if(active) {
active.classList.add("Piano__options__option-active");
this.cell.stash.timbre = active.dataset.timbre;
}
}));
for(let elm of optionElms)
if (elm.dataset.timbre == this.cell.stash.timbre) {
elm.classList.add("Piano__options__option-active");
break;
};
}
optionsView.tabs.Pitch.select();
this.optionsView = optionsView;
}
show() {
this.c4Elm.offsetWidth;
delay(4, () => {
let labelWidth = this.panel.title ? this.panel.title.offsetWidth : 100;
let maxWidth = Math.min(this.keyboard.offsetWidth, 2 * window.innerWidth - labelWidth / 2);
if (this.userWidth !== null && this.userWidth !== undefined) {
this.userWidth = Math.min(this.userWidth, maxWidth);
this.panel.panel.style.width = pxToEm(this.userWidth, this.panel.elm);
}
let W = this.panel.panel.clientWidth;
let K = this.keyboard.offsetWidth;
if (this.keyboardLeft === undefined || this.keyboardLeft === null) {
let c4Center = this.c4Elm.offsetLeft + this.c4Elm.offsetWidth / 2;
if (K > W) {
this.keyboardLeft = clamp(W / 2 - c4Center, W - K, 0);
} else {
this.keyboardLeft = (W - K) / 2;
}
} else {
if (K > W) {
this.keyboardLeft = clamp(this.keyboardLeft, W - K, 0);
} else {
this.keyboardLeft = (W - K) / 2;
}
}
this.keyboard.style.left = this.keyboardLeft + "px";
});
}
}
class Volume extends Surface {
constructor(panel) {
super(panel, ScreenPanel);
this.volumeSlider = new SliderGroup(panel.cell.stash,
{ volume: { min: 0, max: 1, step: 0.01, value: 1, msg: (tag, value) => `Volume: ${Math.round(value * 100)}%` } },
(e, tag, value) => {
_body_.dispatchEvent(new CustomEvent("VOLUME", { detail: value }));
});
this.surface.style.height = "4em" ;
this.surface.style.width = "13em" ;
this.volumeSlider.elm.style.width = "13em" ;
this.surface.prepend(this.volumeSlider.elm);
this.surfaceDragElm = this.volumeSlider.elm;
delay(2, () => this.volumeSlider.refresh());
}
}
class Clock extends Surface {
clockSchedule = new Schedule(0, () => this.refreshClock());
constructor(panel) {
super(panel, ScreenPanel);
}
destructor() {
super.destructor();
this.clockSchedule.cancel();
}
build() {
let clock = helm(`
<svg data-tag="clock"
style="position:relative;width:100%;height:100%;pointer-events:none;transform:translateZ(0);filter:drop-shadow(0 0.2em 0.5em rgba(0,0,0,0.22))"
viewBox="0 0 1200 1200">
<defs>
<path id="face" d="M 600,250 A 350,350 0 0 1 600 950 A 350,350 0 1 1 600,250"/>
<radialGradient id="clockBezel" cx="40%" cy="35%" r="60%">
<stop offset="0%" stop-color="#ddd"/>
<stop offset="70%" stop-color="#bbb"/>
<stop offset="100%" stop-color="#777"/>
</radialGradient>
<radialGradient id="clockDome" cx="38%" cy="32%" r="75%">
<stop offset="0%"   stop-color="white" stop-opacity="0.55"/>
<stop offset="50%"  stop-color="white" stop-opacity="0.06"/>
<stop offset="70%"  stop-color="black" stop-opacity="0.02"/>
<stop offset="100%" stop-color="black" stop-opacity="0.18"/>
</radialGradient>
</defs>
// Circular outline of clock
<circle data-tag="surfaceDragElm" cx="600" cy="600" r="480" fill="url(#clockBezel)"/>
<circle cx="600" cy="600" r="450" fill="white"/>
// Major ticks on outer face: every 5 seconds
<circle pathLength="120" fill="none" stroke="currentColor" cx="600" cy="600" r="300"
transform="rotate(-1.75,600,600) "stroke-width="20" stroke-dashArray="1 9"/>
// clock face
<text style="font-size:90px;font-family:Luminari">
<textPath startOffset="0%" href="#face"><tspan  text-anchor="middle">XII</tspan></textPath>
<textPath startOffset="8.33%" href="#face"><tspan  text-anchor="middle">I</tspan></textPath>
<textPath startOffset="16.67%" href="#face"><tspan  text-anchor="middle">II</tspan></textPath>
<textPath startOffset="25%" href="#face"><tspan  text-anchor="middle">III</tspan></textPath>
<textPath startOffset="33.33%" href="#face"><tspan  text-anchor="middle">IIII</tspan></textPath>
<textPath startOffset="41.67%" href="#face"><tspan  text-anchor="middle">V</tspan></textPath>
<textPath startOffset="50%" href="#face"><tspan  text-anchor="middle">VI</tspan></textPath>
<textPath startOffset="58.33%" href="#face"><tspan  text-anchor="middle">VII</tspan></textPath>
<textPath startOffset="66.67%" href="#face"><tspan  text-anchor="middle">VIII</tspan></textPath>
<textPath startOffset="75%" href="#face"><tspan  text-anchor="middle">IX</tspan></textPath>
<textPath startOffset="83.33%" href="#face"><tspan  text-anchor="middle">X</tspan></textPath>
<textPath startOffset="91.67%" href="#face"><tspan  text-anchor="middle">XI</tspan></textPath>
<textPath startOffset="100%" href="#face"><tspan  text-anchor="middle">XII</tspan></textPath>
</text>
// clock logo
<text x="510" y="500" style="font-size:45px;font-family:Liminari;font-style:italic;">ROSTRUM</text>
// hands
<path data-tag="hourHand" fill="black" id="hourHand" d="M585,640 L600,400 L615,640,Z"/>
<path data-tag="minuteHand" fill="black" id="minuteHand" d="M590,640 L600,300 L610,640,Z"/>
// hands axis
<circle cx="600" cy="600" r="10" fill="white"/>
// date (dynamically assigned)
<text x="600" y="730" text-anchor="middle" data-tag="date" style="font-size:65px;font-family:Liminari;font-style:italic;">1/1/2024</text>
// dome overlay: curved glass effect
<circle cx="600" cy="600" r="450" fill="url(#clockDome)" pointer-events="none"/>
</svg>`);
Object.assign(this, dataIndex("tag", clock));
this.surface.prepend(clock);
this.refreshClock();
}
refreshClock() {
if (this.clockSchedule.cancelled) return;
let date = new Date();
let minutes = date.getMinutes();
let hours = (date.getHours() % 12) + minutes / 60;
this.hourHand.setAttribute("transform", `rotate(${hours * 30} 600 600)`);
this.minuteHand.setAttribute("transform", `rotate(${minutes * 6} 600 600)`);
this.date.textContent = date.toLocaleDateString(undefined,
{ weekday: "short", month: "short", day: "numeric", year: "numeric" });
this.clockSchedule.run((60 - date.getSeconds()) * 1000);
}
hide() {
this.clockSchedule.cancel();
super.hide();
}
}
class Stopwatch extends Surface {
started = false;
running = false;
timeBasis = 0;
stopTimeBasis = 0;
splitCount = 0;
constructor(panel) {
super(panel, ScreenPanel);
}
destructor() {
this.stop();
}
build() {
let tspan = (text, turn) => {
let x = 300 * Math.sin(2 * Math.PI * turn) + 600 - 55;
let y = 300 * Math.cos(2 * Math.PI * turn) + 600 + 40;
return `<tspan x="${x}" y="${y}" font-size="100px" fill="black">${text}</tspan>`;
};
let watch = helm(`
<svg data-tag="watch"
style="position:relative;width:100%;height:100%;transform:translateZ(0);filter:drop-shadow(0 0.2em 0.5em rgba(0,0,0,0.22))"
viewBox="0 0 1200 1200">
<defs>
<path id="hourPointer" d="M585,640 L600,210 L615,640,Z"/>
<path id="minutePointer" d="M590,640 L600,210 L610,640,Z"/>
<path id="secondPointer" d="M590,640 L600,390 L610,640,Z"/>
<circle id="outerFace" pathLength="600" fill="none" stroke="black" cx="600" cy="600" r="400"/>
<circle id="innerFace"  pathLength="600" fill="none" stroke="black" cx="600" cy="600" r="200"/>
<radialGradient id="casingGradient" cx="40%" cy="35%" r="60%">
<stop offset="0%"   stop-color="#ddd"/>
<stop offset="70%"  stop-color="#bbb"/>
<stop offset="100%" stop-color="#777"/>
</radialGradient>
<radialGradient id="watchDome" cx="38%" cy="32%" r="75%">
<stop offset="0%"   stop-color="white" stop-opacity="0.55"/>
<stop offset="50%"  stop-color="white" stop-opacity="0.06"/>
<stop offset="70%"  stop-color="black" stop-opacity="0.02"/>
<stop offset="100%" stop-color="black" stop-opacity="0.18"/>
</radialGradient>
<linearGradient id="stemGradient" >
<stop offset="0" stop-color="darkgrey" />
<stop offset="1" stop-color="grey" />
<linearGradient id="crownGradient" spreadMethod="repeat" x1="0" x2="0.05">
<stop offset="0" stop-color="darkgrey" />
<stop offset="1" stop-color="grey" />
<stop offset="100%" stop-color="Grey" />
</linearGradient>
</defs>
// Crown
<rect x="550" y="80" width="100" height="100" rx="40" fill="url('#stemGradient')"/>
<rect data-tag="crownPusher" x="475" y="0" rx="20" width="250" height="100" fill="url('#crownGradient')"/>
// Split
<rect data-tag="splitPusher" x="550" y="60" rx="20" width="100" height="140" transform="rotate(45,600,600)"
fill="url('#stemGradient')"/>
// Reset
<rect data-tag="resetPusher" x="550" y="60" rx="20" width="100" height="140" transform="rotate(-45,600,600)"
fill="url('#stemGradient')"/>
// Circular outline of watch
<circle data-tag = "surfaceDragElm" cx="600" cy="600" r="480" fill="url('#casingGradient')"/>
<circle cx="600" cy="600" r="450" fill="white"/>
// Major ticks on outer face: every 5 seconds
<use href="#outerFace" stroke-width="20" stroke-dashArray="1 9"/>
// Minor ticks on outer face: every second
<use href="#outerFace" stroke-width="80" stroke-dashArray="1 49"/>
// Ticks on inner face: every 1/10th of a second.
<use href="#innerFace" stroke-width="20" stroke-dashArray="2 58"/>
// Text for out face: every 15 seconds
<text x="0" y="0" font-size=100px>
${tspan("60", 0.5)}
${tspan("15", 0.25)}
${tspan("30", 40)}
${tspan("45", 0.75)}
</text>
// hands
<use href="#hourPointer" fill="black">
<animateTransform data-tag="hourPointerRotation" begin="indefinite" attributeName="transform"
from="0 600 600" to="360 600 600" repeatCount="indefinite" type="rotate" dur="3600s" />
</use>
<use href="#minutePointer" fill="#BA0021">
<animateTransform data-tag="minutePointerRotation" attributeName="transform"
from="0 600 600" to="360 600 600" begin="indefinite" repeatCount="indefinite" type="rotate" dur="60s" />
</use>
<use  href="#secondPointer" fill="#ccc" tag="hand">
<animateTransform data-tag="secondPointerRotation" attributeName="transform"
from="0 600 600" to="360 600 600" begin="indefinite" repeatCount="indefinite" type="rotate" dur="1s" />
</use>
// Pointer axis
<circle cx="600" cy="600" r="10" fill="black"/>
// Invisible Paths for start/stop, split event handlers
<rect data-tag="resetArea" x="100" y="75" width="300" height="300" fill="#0000"/>
<rect data-tag="crownArea" x="450" y="0" width="300" height="300" fill="#0000"/>
<rect data-tag="splitArea" x="800" y="75" width="300" height="300" fill="#0000"/>
// logo
<text x="510" y="500" style="font-size:45px;font-family:Liminari;font-style:italic;">ROSTRUM</text>
// dome overlay: curved glass effect
<circle cx="600" cy="600" r="450" fill="url(#watchDome)" pointer-events="none"/>
</svg>`);
this.surface.prepend(watch);
Object.assign(this, dataIndex("tag", watch));
this.panel.listeners.push(
listen(this.resetArea, ["pointerdown"], () => this.reset()),
listen(this.crownArea, ["pointerdown"], () => (this.running ? this.stop() : this.start())),
listen(this.splitArea, ["pointerdown"], () => this.split()));
}
animatePusher(pusher) {
let y = pusher.getAttribute("y");
pusher.setAttribute("y", `${parseInt(y) + 25}`);
schedule(500, () => pusher.setAttribute("y", y));
}
reset() {
clearChildren(this.surface);
this.panel.splits.value = "";
this.build();
this.started = false;
this.running = false;
this.stopTimeBasis = 0;
this.splitCount = 0;
this.panel.cell.stash.state = "Pause";
this.animatePusher(this.resetPusher);
}
split() {
if (!this.watch) return;
this.animatePusher(this.splitPusher);
let split = this.started ? (performance.now() - this.timeBasis) / 1000 : 0;
let formatNumber = (num) =>
num.toLocaleString("en-US", {
minimumIntegerDigits: 2,
useGrouping: false,
});
let hours = formatNumber(Math.floor(split / (60 * 60)));
let minutes = formatNumber(Math.floor(split / 60));
let seconds = formatNumber(split % 60);
this.panel.splits.value = `${++this.splitCount}. ${hours}:${minutes}:${seconds}\r\n` + this.panel.splits.value;
}
start() {
if (!this.watch) return;
this.animatePusher(this.crownPusher);
let now = performance.now();
if (this.started == false) {
this.timeBasis = now;
this.stopTimeBasis = now;
this.hourPointerRotation.beginElement();
this.minutePointerRotation.beginElement();
this.secondPointerRotation.beginElement();
this.started = true;
}
this.timeBasis += now - this.stopTimeBasis;
this.watch.unpauseAnimations();
this.running = true;
this.panel.cell.stash.state = "Stop";
this.panel.optionsGroup.refresh();
}
stop() {
if (!this.watch) return;
this.animatePusher(this.crownPusher);
this.stopTimeBasis = performance.now();
this.running = false;
this.panel.cell.stash.state = "Start";
this.panel.optionsGroup.refresh();
this.watch.pauseAnimations();
}
}
class Metronome extends Surface {
conductor = `<defs>
<g transform="scale(3.5 3.5) translate(-25 -25)" id="marker" fill="#eb9" stroke="#aaa" strokeWidth="0.2px" strokeLinecap="butt" strokeLinejoin="miter" strokeOpacity="1"> <path d="M 25.5,20.4 c 0.3,1.1 1.0,2.1 1.7,3.0 m -0.3,-0.4 z m -1.0,-2.4 z m -1.0,-0.6 c 0.1,0.0 1.2,0.3 0.6,0.1 m 2.1,2.9 c 0.9,0.4 1.7,-0.2 2.4,-0.6 m -1.4,2.4 c 1.1,-1.7 3.0,-3.0 5.1,-2.6 m -7.1,1.7 c -1.6,0.5 -3.1,1.0 -4.7,1.5 -1.8,-2.5 4.1,-3.7 4.6,-1.8 l 0.1,0.2 z m 7.1,-1.4 c -0.3,1.1 -0.6,2.3 -0.9,3.4 M 10.1,18.5 9.4,18.8 8.8,19.1 m 12.3,6.5 c -1.1,2.7 -3.4,3.4 -5.9,4.0 m 12.6,1.2 c -2.5,0.4 -3.9,2.8 -5.2,4.7 m 6.9,-5.3 c -1.7,-1.9 1.2,-6.0 -2.4,-6.3 m -6.2,-4.8 c 0.3,2.4 3.4,3.6 4.5,1.3 l -0.2,-0.5 m -4.8,0.7 c -1.1,3.2 -6.0,0.3 -6.0,0.2 0.3,0.6 0.6,1.2 1.0,1.8 M 27.7,21.3 c 0.4,-0.5 1.2,-1.0 1.7,-0.3 m -7.4,-1.5 c 0.6,-0.1 1.1,-0.3 1.7,-0.4 m -2.2,0.1 c 0.5,-0.6 1.3,-1.0 2.1,-1.0 m -5.9,0.2 c -1.7,0.0 -0.6,2.5 0.3,0.7 l 0.3,0.0 0.7,0.0 m 2.0,0.2 c -1.7,-2.7 -6.0,-5.2 -8.0,-1.7 -0.1,1.4 -0.5,5.7 -1.7,2.2 -1.2,-1.8 0.1,-7.4 -3.6,-5.4 -1.9,3.9 1.7,7.9 1.2,11.9 0.5,5.4 3.9,10.2 3.6,15.8 -0.5,2.9 2.2,6.0 4.5,3.0 3.2,-1.9 7.6,-0.9 10.1,-4.0 3.7,-2.1 7.8,-4.9 8.2,-9.5 0.8,-3.6 -2.9,-6.0 -0.7,-9.5 m -16.3,-5.4 c 1.4,-3.3 6.2,-1.8 6.2,1.6 1.2,2.0 1.1,3.9 -1.6,3.5 -1.6,-1.6 -3.0,-3.5 -4.6,-5.1 z m 7.0,1.3 c 0.2,-4.7 6.6,-3.0 5.9,0.9 0.5,2.3 0.7,7.1 -3.0,5.2 -2.2,-1.2 -2.5,-3.8 -2.9,-6.0 "/>
<!-- wand -->
<path stroke="#fff" stroke-width=".2px" fill="#333" d="M 93.2,5.7 C 69.4,11.7 45.5,17.7 21.8,23.8 c 0.0,2.6 3.0,0.5 4.4,0.4 C 48.6,18.2 71.0,12.3 93.4,6.3 93.4,6.1 93.3,5.9 93.2,5.7 Z" />
<!-- overlay index finger so it appears on top of the wand-->
<path d="M 25.3,18.0 c 0.2,-4.7 6.6,-3.0 5.9,0.9 0.5,2.3 0.7,7.1 -3.0,5.2 -2.2,-1.2 -2.5,-3.8 -2.9,-6.0"/>
<!-- add index fingernail -->
<path  d="M 27.75, 22 Q 29 21 31 22 M 27.75, 22 Q 28.5 25 31 22 "/>
</g>
</defs>`;
beatPatterns = [
{
name: "metronome",
background: `
<g transform="translate(0 -10)">
<path  style="display:inline;fill:#966f33;stroke:#000000;stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;"
d="m 361,814 32,-131 225,0 35,131 z"/>
<path style="display:inline;fill:#966f33;stroke:#000000;stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;"
d="m 467,375 0,-7 39,-18 42,17 0,8 z"/>
<path style="display:inline;fill:#000000;stroke:#000000;stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;"
d="m 393,682 74,-306 81,0 69,306 z" />
<path style="display:inline;fill:#c0c0c0;stroke:#000000;stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;"
d="m 492,684 32,0 0,-276 -32,0 c 0,0 -1,276 0,276 z"/>
<path style="display:inline;fill:#000000;stroke:#000000;stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;"
d="m 388,814 30,0 -5,16 -21,0 z" />
<path style="fill:none;stroke:#808080;stroke-width:20;stroke-linecap:round;stroke-dasharray:2,20;stroke-dashoffset:0;"
d="M 510,659 507,426"/>
<path  style="display:inline;fill:#000000;stroke:#000000;stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;"
d="m 592,814 3,15 22,0 4,-15 z"/>
</g>`,
markerCenter: "508 674",
marker: `<defs><g id="marker">
<path style="display:inline;fill:#909090;stroke:#808080;stroke-width:15;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none;"
d="m 508,719 0,-325"/>
<path style="display:inline;fill:#808080;stroke:#404040;stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;"
d="m 485,465 44,0 -7,25 -31,0 z"/>
<circle style="display:inline;fill:#966f33ff;" cx="508" cy="674" r="30.0" />
<circle fill="#c0c0c0" cx="508" cy="674" r="14" />
</g></defs>`,
paths: [""],
ticks: [600],
},
{
name: "one",
background: "",
marker: this.conductor,
paths: ["m 507,600 c 7,-38 11,-81 0,-119 -11,38 -6,83 -1,120"],
ticks: [600],
},
{
name: "two",
background: "",
marker: this.conductor,
paths: ["m 381,601 c 53,-2 91,-126 123,-266 7,140 68,326 -58,325", "m 406,660 c -65,-7 -83,-42 -112,-81 20,28 33,23 47,22"],
ticks: [900, 600],
},
{
name: "three",
background: "",
marker: this.conductor,
paths: ["m 342,582 c 94,5 116,-142 164,-234 l 4,351", "m 510,698 c -37,-65 -155,-31 -177,-81", "m 333,617 c -13,-17 -22,-34 -31,-51 7,11 22,16 40,16"],
ticks: [900, 600, 600],
},
{
name: "four",
background: "",
marker: this.conductor,
paths: ["m 376,604 c 84,-4 100,-149 131,-265 l -1,354", "m 506,693 c 6,-105 158,33 152,-17", "M 658,677 C 607,487 427,750 354,643", "m 354,643 c -15,-12 -25,-36 -36,-57 18,10 37,19 58,18"],
ticks: [900, 600, 800, 600],
},
{
name: "five",
background: "",
marker: this.conductor,
paths: ["m 320,588 c 12,19 33,18 53,16 135,-11 97,-212 134,-263 l 0,344", "m 507,685 c 26,-50 69,-18 73,0", "m 580,685 c 19,-42 54,-30 74,-2", "M 654,683 C 632,495 424,743 361,640", "M 361,640 C 332,608 350,629 320,588"],
ticks: [900, 600, 600, 800, 600],
},
{
name: "six",
background: "",
marker: this.conductor,
paths: ["m 267,582 c 14,6 28,14 42,2 134,-68 194,-206 197,-261 l -3,318", "m 503,671 c 17,-35 53,-45 80,-1", "m 584,670 c 22,-45 37,-45 78,5", "M 662,675 C 737,527 483,534 442,663", "M 442,663 C 388,619 335,626 303,665", "m 303,665 c 15,-30 -1,-38 -35,-83"],
ticks: [900, 600, 600, 800, 600, 600],
},
];
accent1 = 1;
accent2 = 0;
tempo = 90;
delta = 0.5;
gain = 1;
latency = 0;
mute = false;
ticker = new Schedule();
tickCount = 0;
tickTime = 0;
beatPattern = null;
beatPatternIndex = 0;
motionPaths = [];
pathTransforms = [];
animationDur = 0;
secondsPerTick = 1;
constructor(panel) {
super(panel, ScreenPanel);
this.beatPattern = this.beatPatterns[0];
this.volumeStash = _menu_.rings.more.cells.volume.stash;
[this.actx, this.bus] = Actx.get();
this.oscillator = null;
this.gainNode = new GainNode(this.actx);
this.gainNode.connect(this.bus);
}
destructor() {
if(this.oscillator) {
this.oscillator.stop();
this.oscillator.disconnect();
}
this.gainNode.disconnect();
this.ticker.cancel();
}
build() {
this.pendulumDur = null;
this.motionPaths.forEach((motionPath) => motionPath.endElement());
Object.values(this.pathTransforms).forEach((pathTransform) => pathTransform.endElement());
clearChildren(this.surface);
let beatPattern = this.beatPattern || this.beatPatterns[0];
let svg = `<svg style="width:100%;height:100%;transform:scale(1.75, 1.75);position:relative;pointer-events:none;" viewBox="0 0 1024 1024">`;
svg += beatPattern.background;
svg += `<text data-tag="pause" width="4em" style="font-family:Bravura;font-size:100px;fill:var(--body-color);" x="505" y="280" text-anchor="middle">\ue4c0</text>`;
svg += `<text data-tag="bpm" width="4em" style="font-family:Bravura;font-size:60px;fill:var(--body-color);" x="505" y="780" text-anchor="middle">${Math.round(this.tempo)}</text>`;
svg += beatPattern.marker;
beatPattern.paths.forEach((path, i) => (svg += `<path data-trace="${i}" style="fill:none;stroke:#88f8;stroke-width:4" d="${path}"/>`));
svg += `<svg><use href="#marker">`;
let cxy = beatPattern.markerCenter ? beatPattern.markerCenter : "";
if (beatPattern.name == "metronome") {
svg += `
<animateMotion data-path="0" calcMode="paced" fill="freeze" path="" dur="0" />
<animateTransform data-transform="pendulum"
begin="indefinite"
calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
fill="freeze" attributeName="transform" type="rotate"
values="-45 ${cxy}; 45 ${cxy}; -45 ${cxy}"
repeatCount="indefinite" dur="2" />`;
} else {
beatPattern.paths.forEach((path, index) => {
svg += `
<animateMotion
data-path="${index}"
calcMode="paced"
fill="freeze"
path="${path}" dur="0" />
<animateTransform
data-transform="${index}"
calcMode="paced"
fill="freeze"
attributeName="transform"
type="rotate" from="15 ${cxy}" to="-15 ${cxy}" dur=".1" />`;
});
}
svg += "</use></svg>";
let svgElm = helm(svg);
Object.assign(this, dataIndex("tag", svgElm));
this.surfaceDragElm = svgElm;
this.surface.prepend(svgElm);
this.motionPaths = Object.values(dataIndex("path", svgElm));
let transforms = dataIndex("transform", svgElm);
this.pathTransforms = beatPattern.name == "metronome" ? transforms : Object.values(transforms);
this.tracePaths = [...svgElm.querySelectorAll("[data-trace]")];
if (this.traceVisible === false) this.tracePaths.forEach(p => p.style.stroke = "none");
}
play(bool) {
this.ticker.cancel();
if (this.pause) this.pause.textContent = bool ? "" : "\ue4c0";
this.playGen = (this.playGen | 0) + 1;
if (bool) {
this.pathTransforms?.["pendulum"]?.endElement();
this.pendulumDur = null;
this.tickTime = this.actx.currentTime + 0.05;
this.secondsPerTick = 60 / this.tempo;
this.tick();
this.ticker.run(60000 / this.tempo, () => {
this.tickTime = this.actx.currentTime + 0.05;
this.tick();
this.ticker.run(60000 / this.tempo);
this.bpm.textContent = Math.floor(this.tempo);
});
} else {
this.pathTransforms?.["pendulum"]?.endElement();
this.gainNode.gain.cancelScheduledValues(this.actx.currentTime);
this.gainNode.gain.setValueAtTime(0.0001, this.actx.currentTime);
}
}
showTrace(bool) {
this.traceVisible = bool;
this.tracePaths?.forEach(p => p.style.stroke = bool ? "#88f8" : "none");
}
setMute(bool) {
this.mute = bool;
}
setPattern(name) {
this.beatPattern = this.beatPatterns.find((pattern) => pattern.name == name) || this.beatPatterns[0];
this.build();
this.panel.cell.stash.pattern = this.beatPattern.name;
this.panel.mediaGroup.refresh();
this.animDur = 0;
}
tick() {
let tickCount = this.tickCount++;
if (this.gain == 0) return;
let tickPattern = this.beatPattern.ticks;
let time = this.tickTime;
time += 0.16 + (this.latency / 1000);
this.tock(tickPattern[tickCount % tickPattern.length], time) ;
let gen = this.playGen;
schedule((this.tickTime - this.actx.currentTime) * 1000, () => {
if (this.playGen != gen) return;
if (this.secondsPerTick != this.animDur) {
this.animDur = this.secondsPerTick;
this.motionPaths.forEach((path) => path.setAttribute("dur", this.animDur));
this.tickCount = 0;
}
if (this.beatPattern.name == "metronome") {
let dur = 2 * this.secondsPerTick;
if (dur != this.pendulumDur) {
this.pendulumDur = dur;
let old = this.pathTransforms["pendulum"];
let fresh = old.cloneNode(true);
fresh.setAttribute("dur", dur);
old.replaceWith(fresh);
this.pathTransforms["pendulum"] = fresh;
fresh.beginElement();
} else {
this.pathTransforms["pendulum"].beginElementAt((this.tickCount & 0x01) ? -this.secondsPerTick : 0);
}
return;
}
let beatNumber = this.tickCount % this.beatPattern.paths.length;
this.motionPaths[beatNumber].beginElement();
this.pathTransforms[beatNumber].beginElement();
});
}
tock(freq, time) {
if(this.mute) return ;
this.oscillator = new OscillatorNode(this.actx, { frequency: freq });
this.gainNode.gain.exponentialRampToValueAtTime(Math.max(this.volumeStash.volume, 0.0000001), time + 0.001);
this.gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
this.oscillator.connect(this.gainNode);
this.oscillator.start(time);
this.oscillator.stop(time + 0.03);
}
onSurfaceEvent(type) {
let stash = this.panel.cell.stash ;
if (type == "press")
this.panel.mediaGroup.fire(stash.state) ;
else if (type == "click") {
let now = performance.now();
if(stash.state == "Pause")  this.play(false) ;
let prevClick = this.prevClick || now -1;
let dur = now - prevClick ;
let tempo = 1 / (dur / 60000);
tempo = clamp(tempo, 20, 220) ;
this.panel.cell.stash.tempo = Math.round(tempo);
if (this.bpm) this.bpm.textContent = Math.round(tempo);
this.panel.tempoGroup.refresh();
this.tempo = tempo;
this.tock(1200,this.actx.currentTime) ;
if(stash.state == "Pause") this.panel.adjuster.run(dur * 1.5) ;
this.prevClick = now;
}
}
}
class Clip {
resolve = null;
constructor() {}
destructor() {
unlisten(this.listener);
if(this.recorder && this.recorder.state != "inactive") this.recorder.stop();
this.resolve?.(null);
this.resolve = null;
}
record(mediaStream) {
unlisten(this.listener);
if(this.recorder && this.recorder.state != "inactive") this.recorder.stop();
this.recorder = new MediaRecorder(mediaStream);
this.recorder.start();
this.listener = listen(this.recorder, "dataavailable", (e) => {
if(this.resolve)
this.resolve(new Blob([e.data], { type: this.recorder.mimeType})), {once:true};
});
}
async stop() {
if(!this.recorder || this.recorder.state == "inactive") return null;
return new Promise(resolve => {
this.resolve = resolve;
this.recorder.stop();
});
}
}
class Recorder {
cycle = 0;
recording = false;
userPaused = false;
paused = false;
visibilityListener = null;
clip1 = new Clip();
clip2 = new Clip();
constructor() {}
record(mediaStream, period, scrubber) {
this.destructor();
this.recording = true;
this.userPaused = this.paused = false;
this.cycle = 0;
this.period = period;
this.start = performance.now();
this.cycler = new Schedule(period, () => {
if(++this.cycle & 1) this.clip2.record(mediaStream);
else this.clip1.record(mediaStream);
this.cycler.run();
});
this.progress = new Schedule(1000, () => {
let p = this.cycler.elapsed() + ((this.cycle == 0? 0: this.period));
scrubber.progress("time", p, 0, p);
this.progress.run();
});
this.clip1.record(mediaStream);
this.cycler.run();
this.progress.run();
this.visibilityListener = listen(document, "visibilitychange", () => this.syncPause());
this.syncPause();
}
stopSchedules() {
for(let task of [this.cycler, this.progress]) {
task?.cancel();
if(task) cancelAnimationFrame(task.af);
}
}
destructor() {
this.recording = false;
unlisten(this.visibilityListener);
this.visibilityListener = null;
this.stopSchedules();
if(this.clip1) this.clip1.destructor();
if(this.clip2) this.clip2.destructor();
};
pause() {
this.userPaused = true;
this.syncPause();
}
resume() {
this.userPaused = false;
this.syncPause();
}
syncPause() {
if(!this.recording) return;
let paused = this.userPaused || document.hidden;
if(paused == this.paused) return;
this.paused = paused;
for(let clip of [this.clip1, this.clip2]) {
let recorder = clip.recorder;
if(paused && recorder?.state == "recording") recorder.pause();
else if(!paused && recorder?.state == "paused") recorder.resume();
}
for(let task of [this.cycler, this.progress]) {
if(paused) task.pause();
else task.resume();
}
}
async stop() {
this.recording = false;
unlisten(this.visibilityListener);
this.visibilityListener = null;
this.stopSchedules();
if(this.cycle == 0)
return await this.clip1.stop();
else if(this.cycle & 1) {
await this.clip2.stop();
return await this.clip1.stop();
} else {
await this.clip1.stop();
return await this.clip2.stop();
}
}
}
class Review {
static css = css(
"Review",
`
.Review {
width: 22em;
height: 22em;
text-align:center;
padding: .5em;
}
.Review__viewer {
width: calc(100% - 1em);
position:absolute;
}
.Review__video {
top: 0;
width: 100%;
border-radius: var(--borderRadius);
}
.Review__waveview {
top: 0;
width: 100%;
position:absolute;
background-color:#ccc;
border-radius: var(--borderRadius);
}
.Review__spectrogram {
position:absolute;
width:100%;
height:100%;
}
.Review__waveform {
position:absolute;
width:100%;
height:100%;
top: 0;
left:0;
}
.Review__video__reflect {
transform: rotateY(180deg);
-webkit-transform:rotateY(180deg); /* Safari and Chrome */
-moz-transform:rotateY(180deg); /* Firefox */
}
.Review__videoControls
{ height: 5.5em; /* tall enough for scrubber, including time readout */
}
.Review__mediaControls
{ width:30%;
padding: 1em 0em 0em 1em;
position:absolute;
left: 0;
bottom: .8em;
}
.Review__scrubber
{ width:65%;
position: absolute;
bottom:0;
right:0;
}
.Review__options {
width: calc(100% - 1em);
position:absolute;
}
.Review__options__details {
margin-top:.2em;
width:100%;
display:grid;
grid-template-columns:1fr 1fr;
justify-items:center;
font-size: .65em;
}
.Review__controls {
position:absolute;
width:calc(100% - 1em);
bottom:0em;
height:3em;
padding: 1em 0em 1em 0em;
border-top: 1px solid #aaa;
}
`
);
mediaDevicesSpec = {};
mediaStream = null;
closed = false;
waveFrame = null;
blinkSchedule = new Schedule();
restartId = 0;
recorder = new Recorder();
state = "Live";
listeners = [];
audioBuf = new Uint8Array(2048);
actx = null;
elm = helm(`
<div class="Review">
<div data-tag="viewer" class="Review__viewer">
<video crossorigin="anonymous" data-tag="video" class="Review__video Review__video__reflect" autoplay playsinline webkit-playsinline></video>
<div data-tag="waveview" class="Review__waveview hidden">
<div data-tag="spectrogram" class="Review__spectrogram"></div>
<canvas height="256" width="${this.bufSize}" data-tag="waveform" class="Review__waveform"></canvas>
</div>
<div data-tag="videoControls" class="Review__videoControls">
<div data-tag="mediaControlsElm"></div>
<div data-tag="scrubberElm"></div>
</div>
</div>
<!--  Options Panel -->
<div data-tag="options" class="Review__options hidden">
<br>Video Direction:
<div data-tag="videoMirrorGroupElm"></div>
<br>Recording Length:
<div data-tag="videoReplayGroupElm"></div>
<br>Input Devices:
<div data-tag="mediaDevicesGroupElm"></div>
<div class="Review__options__details" translate="no"> <!-- device names come from the hardware -->
<div data-tag="audioSrc"></div>
<div data-tag="videoSrc"></div>
</div>
</div>
<!--  Controls Panel -->
<div data-tag="controlsElm" class="Review__controls"></div>
</div>
</div>`);
constructor(panel) {
Object.assign(this, dataIndex("tag", this.elm));
this.panel = panel;
this.stash = panel.cell.stash;
panel.body.style.width = "unset";
}
stopAnimations() {
cancelAnimationFrame(this.waveFrame);
this.waveFrame = null;
this.blinkSchedule.cancel();
cancelAnimationFrame(this.blinkSchedule.af);
this.blinkSchedule.callable = null;
this.blinking = false;
}
destructor() {
this.closed = true;
this.stopAnimations();
if(this.mediaStream) this.mediaStream.getTracks().forEach(track => track.stop());
if(this.liveSrc) this.liveSrc.disconnect();
this.recordedSrc?.disconnect();
this.analyser?.disconnect();
this.mediaStream = this.liveSrc = this.recordedSrc = this.analyser = null;
if(this.video) {
this.video.pause();
this.video.srcObject = null;
this.video.removeAttribute("src");
this.video.load();
}
if(this.videoUrl) URL.revokeObjectURL(this.videoUrl);
this.videoUrl = null;
this.recorder.destructor();
}
async build() {
if(this.closed) return;
let ready = await this.buildOptions();
if(this.closed) return;
if(!ready) return this.panel.close();
let mediaStream = await navigator.mediaDevices.getUserMedia({
video: { deviceId: {exact: this.mediaDevicesSpec[this.stash.videoSrc].deviceId}},
audio: { deviceId: {exact: this.mediaDevicesSpec[this.stash.audioSrc].deviceId}},
});
if(this.closed) {
mediaStream.getTracks().forEach(track => track.stop());
return;
}
this.mediaStream = mediaStream;
[this.actx, this.bus] = Actx.get();
this.analyser = this.actx.createAnalyser();
this.analyser.fftSize = this.audioBuf.length;
this.analyser.minDecibels = -90;
this.analyser.minDecibels = -120;
this.analyser.maxDecibels = -10;
this.recordedSrc = this.actx.createMediaElementSource(this.video);
this.liveSrc = this.actx.createMediaStreamSource(this.mediaStream);
this.buildControls();
this.buildViewer();
try {
this.live();
} catch(error) {
dialog(`Can't record video because:<br>"${error}"<br>
<br>Disabling this tool.`);
_menu_.enableCells(["more/review"], false);
return this.panel.close();
}
}
buildControls() {
this.controls = new ButtonGroup(Object.assign(this.stash, { mode: "Video"}),
{ Video: { svg: "Replay", radio: "mode" },
Wave: { svg: "Wave", radio: "mode" },
Options: { svg: "Options", radio: "mode" }
}, (e, prop, tag) => {
if (tag == "Video") {
this.viewer.classList.remove("hidden");
this.video.classList.remove("hidden");
this.waveview.classList.add("hidden");
this.options.classList.add("hidden");
}
else if (tag == "Wave") {
this.waveview.classList.remove("hidden");
this.viewer.classList.remove("hidden");
this.video.classList.add("hidden");
this.options.classList.add("hidden");
this.wave();
}
else {
this.options.classList.remove("hidden");
this.viewer.classList.add("hidden");
}
});
this.controlsElm.replaceWith(this.controls.elm);
this.controls.elm.classList.add("Review__controls");
this.controls.refresh();
}
async buildOptions() {
let permissionStream;
try {
permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
if(this.closed) return false;
this.devices = await navigator.mediaDevices.enumerateDevices();
} catch (error) {
if(this.closed) return false;
console.error("Review getUserMedia failed:", error.name, error.message);
let detail =
error.name == "NotAllowedError"  ? "Permission to use the camera/microphone was denied or dismissed." :
error.name == "NotReadableError" ? "The camera/microphone is unavailable — it's in use by another app, or the system audio/video stack was reset. <strong>Reloading Rostrum usually fixes this.</strong>" :
error.name == "NotFoundError"    ? "No camera or microphone was found on this device." :
error.name == "OverconstrainedError" ? "No device matches the requested audio+video constraints." :
`${error.name}: ${error.message}`;
dialog(`<strong>Can't access the audio/video device.</strong><br><br>
<div style="text-align:left">${detail}</div><br>
Also worth checking: the device is plugged in and not held by another app, and this site's browser permissions.<br>
<a href="http://www.google.com/search?q=How+to+set+browser+permissions">How to set browser permissions</a>`);
return false;
} finally {
permissionStream?.getTracks().forEach(track => track.stop());
}
if(this.closed) return false;
let mediaDevicesSpec = this.mediaDevicesSpec;
this.stash.mirror ??= "Mirror";
this.stash.replay ??= 15;
this.videoMirrorGroup = new ButtonGroup(this.stash,
{ Front: { svg: "Flute Flipped", radio: "mirror" },
Mirror: { svg: "Flute Mirrored", radio: "mirror" },
}, (e, prop, tag) => {
if (tag == "Front") this.video.classList.remove("Review__video__reflect");
else this.video.classList.add("Review__video__reflect");
});
this.videoMirrorGroupElm.replace(this.videoMirrorGroup.elm);
this.videoMirrorGroup.elm.style.justifyContent = "space-evenly";
if (this.stash.mirror == "Front") this.video.classList.remove("Review__video__reflect");
this.videoReplayGroup = new SliderGroup(this.stash, {
replay: { min: 5, max: 120, value: 15, msg: (tag, value) => `${value}s to ${value * 2}s` }
}, async () => {
await this.restart();
});
this.videoReplayGroupElm.replace(this.videoReplayGroup.elm);
let audioSrcIdx = 0;
let videoSrcIdx = 0;
this.devices.forEach((device) => {
if (device.kind == "audioinput")
mediaDevicesSpec[`Audio ${++audioSrcIdx}`] = Object.assign(device, {
svg: "Mike",
toggle: "audioSrc",
});
else if (device.kind == "videoinput")
mediaDevicesSpec[`Video ${++videoSrcIdx}`] = Object.assign(device, {
svg: "Video",
toggle: "videoSrc",
});
});
this.stash.audioSrc ??= "Audio 1";
this.stash.videoSrc ??= "Video 1";
this.mediaDevicesGroup = new ButtonGroup(this.stash, mediaDevicesSpec, async (e, prop, tag) => {
let index = parseInt(tag.split(" ")[1]) + 1;
if (prop == "audioSrc") {
if (index > audioSrcIdx) index = 1;
this.stash.audioSrc = "Audio " + index;
} else if (prop == "videoSrc") {
if (index > videoSrcIdx) index = 1;
this.stash.videoSrc = "Video " + index;
}
this.audioSrc.textContent = this.mediaDevicesSpec[this.stash.audioSrc]?.label ?? "";
this.videoSrc.textContent = this.mediaDevicesSpec[this.stash.videoSrc]?.label ?? "";
this.mediaDevicesGroup.refresh();
this.mediaStream.getTracks().forEach(track => track.stop());
await this.restart();
});
this.mediaDevicesGroupElm.replace(this.mediaDevicesGroup.elm);
this.mediaDevicesGroup.elm.style.marginTop = "1em";
this.audioSrc.textContent = this.mediaDevicesSpec[this.stash.audioSrc]?.label ?? "";
this.videoSrc.textContent = this.mediaDevicesSpec[this.stash.videoSrc]?.label ?? "";
return true;
}
buildViewer() {
this.mediaControls = new ButtonGroup(
{ state: "Live" },
{ Replay: { svg: "Play", redo: true, radio: "state" },
Pause: { svg: "Pause", redo: true, radio: "state" },
}, (e, prop, tag) => {
if(this.state == "Replay") {
if(tag == "Replay") {
if(this.scrubber.dataIndex["time_slider"].pos == 1) this.live();
else this.video.play();
}
else this.video.pause();
}
else {
if(tag == "Replay") {
this.recorder.resume();
this.video.play();
}
else {
this.recorder.pause();
this.video.pause();
}
}
});
this.mediaControlsElm.replace(this.mediaControls.elm);
this.mediaControls.elm.classList.add("Review__mediaControls");
this.scrubber = new SliderGroup({time:1}, {
time: {min:0, max:0, step:1, value:0,
msg: (tag, value) => Math.floor(value / 60000) + ":" +
String(Math.floor((value % 60000) / 1000)).padStart(2,0) }},
(e, tag, value, scrubber) => {
if (e.type == "change") {
if(this.state == "Live") this.replay(value);
else {
if(scrubber.dataIndex["time_slider"].pos == 1)
{
this.setPlayButton("Live");
this.mediaControls.props.state = "Pause";
this.mediaControls.refresh();
}
else {
this.setPlayButton("Replay");
this.video.currentTime = value / 1000;
}
}
}
});
this.scrubberElm.replace(this.scrubber.elm);
this.scrubber.elm.classList.add("Review__scrubber");
listen(this.video, ["loadedmetadata"],() => {
let controlsHeight = this.controls.elm.offsetHeight;
let videoControlsHeight = this.videoControls.offsetHeight ;
let videoHeight = this.video.offsetHeight;
this.waveview.style.height = pxToEm(videoHeight, this.panel.elm);
this.viewer.style.height = this.options.style.height = pxToEm(videoControlsHeight + videoHeight, this.panel.elm);
this.elm.style.height = pxToEm(videoHeight + videoControlsHeight + controlsHeight, this.panel.elm);
this.buildWave();
}, { once: true }
);
this.panel.listeners.push(
listen(this.video, "timeupdate", () => {
if(this.state == "Replay")
this.scrubber.progress("time", this.video.currentTime * 1000);
})
);
this.panel.listeners.push(
listen(this.video, "ended", () => {
this.setPlayButton("Live");
this.mediaControls.props.state = "Pause";
this.mediaControls.refresh();
this.scrubber.dataIndex["time_slider"].setPos(1);
})
);
}
buildWave() {
let lineCount = 60;
let lineHeight = parseFloat(this.waveview.style.height) / lineCount;
for (let i = 0; i < lineCount; i++) this.spectrogram.append(helm(`<div style="height:${lineHeight}em;"></div>`));
this.waveformCtx = this.waveform.getContext("2d");
let gradient = this.waveformCtx.createLinearGradient(0, 0, 0, 256);
gradient.addColorStop(0, "#f00");
gradient.addColorStop(0.495, "#008");
gradient.addColorStop(0.5, "#fff");
gradient.addColorStop(0.505, "#008");
gradient.addColorStop(0.5, "#f00");
gradient.addColorStop(1, "red");
this.waveformCtx.fillStyle = gradient;
}
async live() {
this.setPlayButton("Live");
this.state = "Live";
this.video.muted = true;
this.video.srcObject = this.mediaStream;
this.recorder.record(this.mediaStream, this.stash.replay * 1000, this.scrubber);
this.recordedSrc.disconnect();
this.liveSrc.connect(this.analyser);
this.analyser.disconnect();
this.blink(this.mediaControls.elms.Replay);
this.scrubber.progress("time", 0, 0, this.stash.replay * 1000);
}
async replay(progress = 0) {
if(this.closed) return;
this.video.muted = false;
this.setPlayButton("Replay");
this.state = "Replay";
let restartId = this.restartId;
let recordedData = await this.recorder.stop();
if(this.closed || restartId !== this.restartId) return;
if(!recordedData) {
toast("Nothing recorded to replay");
return;
}
this.video.srcObject = null;
this.video.src = this.createVideoUrl(recordedData);
this.liveSrc.disconnect();
this.recordedSrc.connect(this.analyser);
this.analyser.connect(this.bus);
this.video.currentTime = progress / 1000;
}
async restart() {
if(this.closed) return;
let restartId = ++this.restartId;
this.mediaStream.getTracks().forEach(track => track.stop());
let mediaStream = await navigator.mediaDevices.getUserMedia({
video: { deviceId: {exact: this.mediaDevicesSpec[this.stash.videoSrc].deviceId}},
audio: { deviceId: {exact: this.mediaDevicesSpec[this.stash.audioSrc].deviceId}},
});
if(this.closed || restartId !== this.restartId) {
mediaStream.getTracks().forEach(track => track.stop());
return;
}
this.liveSrc?.disconnect();
this.mediaStream = mediaStream;
this.recorder.destructor();
this.recorder = new Recorder();
this.liveSrc = this.actx.createMediaStreamSource(this.mediaStream);
this.state = "live";
this.live();
}
wave() {
if(this.closed || this.waveFrame !== null || this.stash.mode != "Wave") return;
if(this.stash.mode == "Wave" && !this.video.paused) {
let buf = this.audioBuf;
let bufLen = buf.length;
let width = this.analyser.frequencyBinCount / 4;
this.analyser.getByteFrequencyData(buf);
let line = this.spectrogram.lastElementChild;
line.remove();
let grad = "linear-gradient(to right," + this.h2rgba(buf[0] * buf[0]) + " 0%";
for (let i = 0; i < width; i++) grad += "," + this.h2rgba(buf[i + i] * buf[i + i]) + (i / width) * 100 + "%";
line.style.background = grad;
this.spectrogram.prepend(line);
this.analyser.getByteTimeDomainData(buf);
let ctx = this.waveformCtx;
ctx.clearRect(0, 0, bufLen, 256);
ctx.beginPath();
ctx.moveTo(0, buf[0]);
for (let i = 1; i < bufLen; i++) ctx.lineTo(i, buf[i]);
ctx.closePath();
ctx.fill();
}
this.waveFrame = requestAnimationFrame(() => {
this.waveFrame = requestAnimationFrame(() => {
this.waveFrame = null;
this.wave();
});
});
}
createVideoUrl(media) {
if(this.closed) return null;
if (this.videoUrl) URL.revokeObjectURL(this.videoUrl);
this.videoUrl = URL.createObjectURL(media);
return this.videoUrl;
}
setPlayButton(text) {
this.mediaControls.elms.Replay.firstChild.replaceWith(document.createTextNode(text));
}
h2rgba(h) {
let r, b, g, a;
r = b = g = a = 0;
let step = 65536 / 3;
if (h < step) {
a = h / step;
b = 256 * a;
} else {
a = 1;
h -= step;
if (h < step) {
g = (h / step) * 256;
b = 256 - g;
} else {
h -= step;
r = (h / step) * 256;
g = 256 - r;
}
}
return `rgba(${r},${g},${b},${a})`;
}
show() {
schedule(1, () => this.build());
}
blink(elm, color= null) {
if(this.closed) return;
if(!color && this.blinking) return;
if (this.state == "Live") {
elm.style.color = color;
this.blinkSchedule.run(_gs_, () => this.blink(elm, color == "red" ? "black" : "red"));
this.blinking = true;
}
else {
elm.style.color = "black";
this.blinking = false;
}
}
}
// #inclusion src/sharedBuffer.js minified
class SharedBuffer {
podIds = ["sf","pp","mp","mf","ff","ti","la","so","fa","mi","re","do"];
constructor() {
this.db = null;
this.dbName = 'Rostrum';
this.storeName = 'rostrum';
this.dbKey = "pod-pb-pdf";
this.version = 1;
this.score = null;
}
async init() {
return new Promise((resolve, reject) => {
let request = indexedDB.open(this.dbName, this.version);
request.onerror = () => reject(request.error);
request.onupgradeneeded = (event) => {
let db = event.target.result;
if (!db.objectStoreNames.contains(this.storeName)) {
db.createObjectStore(this.storeName, { keyPath: 'id' });
}
};
request.onsuccess = async () => {
this.db = request.result;
window._podPb_ = this;
let ids = [...this.podIds];
window._podId_ = ids.pop();
let podTitle = (window.chrome && chrome.runtime?.id) ? id => `Rostrum [${id}]` : id => `Rostrum (${id})`;
listen(window, 'storage', async (e) => {
if (!e.newValue) return;
if (!["pod-id-taken", "pod-pgs-changed", "pod-pgs-clear", "pod-pgs-pop", "pod-id-check"].includes(e.key)) return;
let data = JSON.parse(e.newValue);
switch(e.key) {
case "pod-id-taken":
if(data.podId != _podId_) break;
if(ids.length == 0)
dialog(`<em>Error: only ${this.podIds.length} Rostrum tabs can be open at the same time.<em><br>`, {});
else {
window._podId_ = ids.pop();
this.signal("pod-id-check");
document.title = podTitle(_podId_);
}
break;
case "pod-pgs-changed":
await this.score?.dispose();
this.score = null;
await this.announce();
break;
case "pod-pgs-clear":
this.pgClear();
break;
case "pod-pgs-pop":
this.pgPop();
break;
case "pod-id-check":
if(data.podId == _podId_)
this.signal("pod-id-taken");
break;
}
});
this.signal("pod-id-check");
document.title = podTitle(_podId_);
_menu_.enableCells("page/import", (await this.getScore()).pgs.length > 0);
resolve(_podId_);
}
});
}
async announce() {
_menu_.enableCells("page/import", (await this.getScore()).pgs.length > 0);
_body_.dispatchEvent(new CustomEvent("SHAREDBUFFER"));
}
signal(msg, data={}) {
let payload = Object.assign({podId: _podId_, score: _score_?.name || '?', ts: Date.now()}, data);
localStorage.setItem(msg, JSON.stringify(payload));
}
async getScore() {
if(this.score) return this.score;
let pdfData = (await this.get(this.dbKey))?.data;
if(pdfData) this.score = await new Score().init("podPb",_podId_,_podId_,pdfData, false);
else this.score = new Score();
return this.score;
}
async pgClear() {
await this.clear(this.dbKey);
await this.score?.dispose();
this.score = null;
this.signal("pod-pgs-changed");
await this.announce();
}
async pgCopy(pn) {
try {
let pgPdf = await _score_.toPdf("stamp", false, [pn]);
let pbScore = await this.getScore();
this.score = await pbScore.bindScore(pgPdf, pbScore.pgs.length + 1);
await pbScore.dispose();
await this.put(this.dbKey, await this.score.toPdf());
this.signal("pod-pgs-changed");
this.announce();
_menu_.enableCells("page/import", true);
} catch (err) {
if (err.cause === 'fileSrc' || err.message?.includes('catalog') || err.message?.includes('Invalid object')) {
dialog("Unable to copy page:<br>" + escapeHtml(err.message).replace(/\n/g, "<br>"));
} else throw err;
}
}
async pgPop() {
this.score = await this.getScore();
let len = this.score.pgs.length;
if(len == 0) return;
this.score.pgCut(len, false);
await this.put(this.dbKey, await this.score.toPdf());
this.signal("pod-pgs-changed");
this.announce();
}
async pgPaste(pn) {
let pbScore = await this.getScore();
let pbPdf = await pbScore.toPdf();
let mergedScore = await _score_.bindScore(pbPdf, pn);
await mergedScore.activate();
}
async clear(id = 'pages') {
return new Promise((resolve, reject) => {
let tx = this.db.transaction([this.storeName], 'readwrite');
let store = tx.objectStore(this.storeName);
let request = store.delete(id);
request.onsuccess = () => resolve();
request.onerror = () => reject(request.error);
});
}
async delete() {
await indexedDB.deleteDatabase(this.dbName);
}
async get(id) {
return new Promise((resolve, reject) => {
let tx = this.db.transaction([this.storeName], 'readonly');
let store = tx.objectStore(this.storeName);
let request = store.get(id);
request.onsuccess = () => resolve(request.result)
request.onerror = () => reject(request.error);
});
}
async put(id, data) {
return new Promise((resolve, reject) => {
let tx = this.db.transaction([this.storeName], 'readwrite');
let store = tx.objectStore(this.storeName);
let request = store.put({ id:id, data:data});
request.onsuccess = () => resolve();
request.onerror = () => {
if (request.error.name === 'QuotaExceededError')
dialog("Paste buffer full. Clear some pages first.");
reject(request.error);
};
});
}
}
// #inclusion src/view-state.js minified
function sharedViewSettings(menu) {
const shared = JSON.parse(JSON.stringify(menu));
delete shared.layout;
if (shared.page?.cells) delete shared.page.cells.magnify;
if (shared.page?.stash) delete shared.page.stash.active;
const details = shared.score?.cells?.details;
if (details) for (const key of ['pgFit','quality','bkColorIdx']) delete details[key];
return shared;
}
class DeviceViewState {
constructor(menu) {
this.menu = menu; this.state = null; this.loading = 0; this.writes = Promise.resolve();
this.journalKey = 'rostrum-device-view-pending';
this.viewport = {w:innerWidth,h:innerHeight};
this.defaults = JSON.parse(menu.stashDefaults);
this.ready = this.load();
}
async database(mode, run) {
const db = this.db || await new Promise((resolve,reject) => {
const request = indexedDB.open('rostrum-device-view',1);
request.onupgradeneeded = () => request.result.createObjectStore('settings');
request.onsuccess = () => resolve(request.result);
request.onerror = () => reject(request.error);
request.onblocked = () => reject(new Error('View settings database is blocked'));
});
this.db = db;
db.onversionchange = () => { db.close(); if (this.db === db) this.db = null; };
return await new Promise((resolve,reject) => {
const tx = db.transaction('settings',mode), request = run(tx.objectStore('settings'));
tx.oncomplete = () => resolve(request.result);
tx.onerror = tx.onabort = () => reject(tx.error || request.error);
});
}
normalize(raw) {
if (!raw || raw.version !== 1) return null;
const number = (value,min,max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const choice = (value,options,fallback) => options.includes(value) ? value : fallback;
const geometry = value => {
if (!value || !number(value.w,1,100000) || !number(value.h,1,100000) ||
!/^(?:\d+(?:\.\d*)?|\.\d+)em$/.test(value.fontSize) || !number(parseFloat(value.fontSize),.1,20) ||
!/^-?\d+(?:\.\d+)?px$/.test(value.left) || !/^-?\d+(?:\.\d+)?px$/.test(value.top) ||
Math.abs(parseFloat(value.left)) > 100000 || Math.abs(parseFloat(value.top)) > 100000) return null;
return {left:value.left,top:value.top,fontSize:value.fontSize,w:value.w,h:value.h};
};
const state = {version:1,active:choice(raw.active,['book','horizontal','vertical','table'],'book'),layouts:{},display:{},magnify:{},menu:geometry(raw.menu)};
for (const key of ['book','horizontal','vertical','table']) {
const fallback = this.defaults.layout.cells[key], source = raw.layouts?.[key] || {};
const value = state.layouts[key] = {fit:choice(source.fit,['Auto','Width','Height',...(key === 'table' ? [] : ['None'])],fallback.fit),
pnShow:choice(source.pnShow,['On','Off'],fallback.pnShow),pz:geometry(source.pz)};
const ranges = key === 'table' ? {pages:[1,50],horizontalGap:[-100,100],verticalGap:[-100,100]} :
key === 'book' ? {pace:[0,1500]} : {gap:[0,100],pgShow:[1,8],pgSnap:[-4,8],pace:[0,10000]};
for (const [name,[min,max]] of Object.entries(ranges)) {
const valid = number(source[name],min,max) && (!['pgShow','pgSnap','pages'].includes(name) || Number.isInteger(source[name]));
value[name] = valid ? source[name] : fallback[name];
}
if (key !== 'table') value.pnBand = {
axis:choice(source.pnBand?.axis,['L-R','T-B'],fallback.pnBand.axis),
place:choice(source.pnBand?.place,['Inset','Over'],fallback.pnBand.place)};
}
const display = this.defaults.score.cells.details, source = raw.display || {};
state.display = {pgFit:choice(source.pgFit,['Center','Expand'],display.pgFit),
quality:number(source.quality,.5,6) ? source.quality : display.quality,
bkColorIdx:Number.isInteger(source.bkColorIdx) && number(source.bkColorIdx,0,63) ? source.bkColorIdx : display.bkColorIdx};
state.magnify.zoom = number(raw.magnify?.zoom,.25,5) ? raw.magnify.zoom : 2;
return state;
}
async load() {
try { this.state = this.normalize(await this.database('readonly',s => s.get('current'))); }
catch (error) { console.warn('Could not load device view settings',error); }
let pending;
try { pending = this.normalize(JSON.parse(localStorage.getItem(this.journalKey) || 'null')); }
catch {  }
if (pending) this.state = pending;
this.apply();
for (const event of ['pointerup','keyup','change']) window.addEventListener(event,()=>this.schedule(0),{capture:true,passive:true});
for (const event of ['input','wheel']) window.addEventListener(event,()=>this.schedule(),{capture:true,passive:true});
window.addEventListener('resize',() => {
this.checkViewport();
this.schedule();
});
document.addEventListener('visibilitychange',() => { if (document.hidden) this.save(); });
window.addEventListener('pagehide',() => this.save());
if (pending) this.save();
}
apply(score) {
const state = this.state;
if (!state) return false;
const rings = this.menu.rings;
rings.layout.stash.active = state.active;
for (const key of Object.keys(state.layouts)) Object.assign(rings.layout.cells[key].stash,JSON.parse(JSON.stringify(state.layouts[key])));
Object.assign(rings.score.cells.details.stash,state.display);
Object.assign(rings.page.cells.magnify.stash,state.magnify);
this.menu.magnifier.zoom = state.magnify.zoom;
if (score) score.quality = state.display.quality;
return true;
}
checkViewport() {
if (this.viewport.w === innerWidth && this.viewport.h === innerHeight) return;
this.viewport = {w:innerWidth,h:innerHeight};
const layout = Layout.activeLayout;
if (layout?.cell?.stash) {
layout.cell.stash.pz = null;
layout.elm.classList.remove('pz-set');
}
this.menu.elm.classList.remove('pz-set');
}
capture() {
this.checkViewport();
const layout = Layout.activeLayout;
if (layout && layout.score === window._score_ && !layout.score.disposed && !layout.destroyed &&
layout.elm.classList.contains('pz-set')) {
const elm = layout.elm;
layout.cell.stash.pz = {left:elm.style.left,top:elm.style.top,fontSize:elm.style.fontSize,w:innerWidth,h:innerHeight};
}
const rings = this.menu.rings;
let menu = this.state?.menu || null;
if (window._score_ && !window._score_.disposed) {
const elm = this.menu.elm;
menu = elm.classList.contains('pz-set') ?
{left:elm.style.left,top:elm.style.top,fontSize:elm.style.fontSize,w:innerWidth,h:innerHeight} : null;
}
return this.normalize({version:1,active:rings.layout.stash.active,
layouts:Object.fromEntries(Object.entries(rings.layout.cells).filter(([key])=>['book','horizontal','vertical','table'].includes(key)).map(([key,cell])=>[key,cell.stash])),
display:rings.score.cells.details.stash,magnify:rings.page.cells.magnify.stash,menu});
}
schedule(delay = 100) {
if (this.loading) return;
clearTimeout(this.timer); this.timer = setTimeout(()=>this.save(),delay);
}
save() {
clearTimeout(this.timer);
if (this.loading) return this.writes;
this.state = this.capture();
const snapshot = this.state, json = JSON.stringify(snapshot);
if (json === this.lastQueued) return this.writes;
this.lastQueued = json;
let journalSaved = false;
try { localStorage.setItem(this.journalKey,json); journalSaved = true; } catch {  }
const write = this.database('readwrite',s=>s.put(snapshot,'current'))
.then(() => {
this.lastWritten = json;
try { if (localStorage.getItem(this.journalKey) === json) localStorage.removeItem(this.journalKey); }
catch {  }
})
.catch(error => {
if (this.lastQueued === json) this.lastQueued = null;
console.warn('Could not save device view settings',error);
if (!journalSaved && !this.warned) { this.warned = true; toast('View settings could not be saved on this device.'); }
});
this.writes = Promise.all([this.writes,write]).then(()=>{});
return this.writes;
}
async beginLoad() {
await this.ready;
if (!this.loading && window._score_ && !window._score_.disposed) await this.save();
clearTimeout(this.timer); this.loading++;
}
endLoad() { this.loading = Math.max(0,this.loading-1); if (!this.loading) this.schedule(); }
restoreMenu() {
const value = this.state?.menu;
if (!value || value.w !== innerWidth || value.h !== innerHeight) return;
this.menu.elm.style.fontSize = value.fontSize;
this.menu.elm.classList.add('pz-set');
if (value.w === innerWidth && value.h === innerHeight) {
this.menu.elm.style.left = value.left; this.menu.elm.style.top = value.top;
}
this.menu.constrain();
}
}
// #inclusion src/appearance.js minified
css('Appearance', `
:root, :root[data-theme=Light], :root[data-theme=Glass] {
--ui-bg:#fff; --ui-surface:#f5f7fa; --ui-line:#e5e9f0;
--ui-text:#202938; --ui-muted:#687488; --ui-primary:#245cce;
--ui-selected:#eaf1ff; --ui-hover:#f0f3f8; --ui-on-primary:#fff;
--ui-font:system-ui,-apple-system,"Segoe UI",sans-serif;
--body-font-family:var(--ui-font); --body-letter-spacing:0; --body-line-height:1.4;
--body-color:var(--ui-text); --bodyColor:var(--ui-surface); --bodyVignette:none;
--panTexture:none; --textShadow:none; --text-shadow-contrast:none; --file-text-shadow:none;
--color-primary:var(--ui-primary); --color-primary-active:#1748ac;
--color-surface:var(--ui-surface); --color-surface-selected:var(--ui-selected);
--color-accent:var(--ui-primary); --color-text:var(--ui-text);
--color-text-secondary:var(--ui-muted); --color-text-muted:#768198;
--color-border:var(--ui-line); --color-border-light:var(--ui-line);
--color-background-overlay:#ffffffed; --file-properties-color:var(--ui-muted);
--borderRadius:.55em; --border:1px solid var(--ui-line);
--panel-bg:var(--ui-bg); --panel-header-bg:var(--ui-bg);
--panel-header-selected-bg:var(--ui-selected); --panel-inset-shadow:none;
--panelShadow:none; --bodyShadow:none;
--menu-cell-bg:var(--ui-bg); --menu-cell-selected-bg:var(--ui-hover);
--menu-cell-active-bg:var(--ui-selected); --menu-disk-bg:var(--ui-surface);
--menu-grip-bg:var(--ui-primary); --menu-grip-selected-bg:#1748ac;
--menu-icon-color:var(--ui-text); --menu-panel-indicator:var(--ui-muted);
--menu-panel-indicator-highlight:transparent; --menu-panel-indicator-shadow:transparent;
--menu-cell-box-shadow:none; --menu-grip-box-shadow:none; --menu-disk-shadow:none;
--menu-grip-shadow:none; --menu-drawer-front:var(--ui-bg);
--slider-indicator:var(--ui-on-primary); --slider-indicator-active:var(--ui-on-primary);
--slider-knob-bg:var(--ui-primary); --slider-knob-selected-bg:var(--ui-primary); --slider-knob-shadow:none;
--select-option-bg:var(--ui-bg); --select-option-text:var(--ui-text);
}
:root[data-theme=Dark] {
--ui-bg:#151c28; --ui-surface:#1c2533; --ui-line:#303b4e;
--ui-text:#e7edf7; --ui-muted:#a2aec2; --ui-primary:#a4c2ff;
--ui-selected:#263b5e; --ui-hover:#243044; --ui-on-primary:#152642;
--body-font-family:var(--ui-font); --body-letter-spacing:0; --body-line-height:1.4;
--body-color:var(--ui-text); --bodyColor:#111722; --bodyVignette:none;
--panTexture:none; --textShadow:none; --text-shadow-contrast:none; --file-text-shadow:none;
--color-primary:var(--ui-primary); --color-primary-active:#c3d7ff;
--color-surface:var(--ui-surface); --color-surface-selected:var(--ui-selected);
--color-accent:var(--ui-primary); --color-text:var(--ui-text);
--color-text-secondary:var(--ui-muted); --color-text-muted:#8d9bb2;
--color-border:var(--ui-line); --color-border-light:var(--ui-line);
--color-background-overlay:#151c28ed; --file-properties-color:var(--ui-muted);
--panel-bg:var(--ui-bg); --panel-header-bg:var(--ui-bg);
--panel-header-selected-bg:var(--ui-selected); --panel-inset-shadow:none;
--panelShadow:none; --bodyShadow:none;
--menu-cell-bg:var(--ui-bg); --menu-cell-selected-bg:var(--ui-hover);
--menu-cell-active-bg:var(--ui-selected); --menu-disk-bg:var(--ui-surface);
--menu-grip-bg:var(--ui-primary); --menu-grip-selected-bg:#c3d7ff;
--menu-icon-color:var(--ui-text); --menu-panel-indicator:var(--ui-muted);
--menu-panel-indicator-highlight:transparent; --menu-panel-indicator-shadow:transparent;
--menu-cell-box-shadow:none; --menu-grip-box-shadow:none; --menu-disk-shadow:none; --menu-grip-shadow:none;
--menu-drawer-front:var(--ui-bg); --slider-indicator:var(--ui-on-primary);
--slider-indicator-active:var(--ui-on-primary); --slider-knob-bg:var(--ui-primary);
--slider-knob-selected-bg:var(--ui-primary); --slider-knob-shadow:none;
--select-option-bg:var(--ui-bg); --select-option-text:var(--ui-text);
color-scheme:dark;
}
:root[data-theme=Glass] { --menu-cell-bg:#ffffffeb; --menu-disk-bg:#f5f7fae8; --panel-bg:#fffffff5; }
:root .Menu { font-family:var(--ui-font); line-height:1.2; letter-spacing:0; }
:root .Menu__holder { background:var(--ui-line); box-shadow:0 4px 24px #172b4d26; }
:root .Menu__disk { background:var(--ui-line); }
:root .Menu__cell-active, :root .Menu__diskCell-active { color:var(--ui-primary); }
:root .Menu__cell-disabled { color:var(--color-text-muted); }
:root .Menu__cell-contents > [data-tag=cellName] { max-width:8em; margin-inline:auto; line-height:1.1; }
:root .Menu__grip { border:2px solid var(--ui-bg); }
:root .Menu__grip::after { content:'⠿'; display:grid; place-items:center; position:absolute; inset:0; color:var(--ui-on-primary); pointer-events:none; font-size:1em; }
:root .Menu__cell-panel::after { box-shadow:none; }
:root .Panel { font-family:var(--ui-font); letter-spacing:0; line-height:1.4; }
:root .Panel .Panel__elm { border:1px solid var(--ui-line); border-radius:12px; background:var(--panel-bg); box-shadow:0 3px 14px #172b4d14; }
:root .Panel .Panel__header { background-image:none; border-bottom:1px solid var(--ui-line); cursor:grab; }
:root .Panel .Panel__header-selected { cursor:grabbing; }
:root .Panel .Panel__title { font-weight:600; padding:0 3em; box-sizing:border-box; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
:root .Panel .Panel__body { max-height:calc(100dvh - 5em); overflow:auto; scrollbar-width:thin; }
:root .Panel .Panel__item { margin-top:1em; }
:root .Panel .MenuGroup__section { border-color:var(--ui-line); padding-top:16px; margin-top:16px; }
:root .Panel .MenuGroup__section h3 { font-weight:600; margin-bottom:12px; }
:root .Panel :is(input:not([type=checkbox]):not([type=range]):not([type=color]),select),
:root dialog:not(.LibraryWindow) :is(input:not([type=checkbox]):not([type=range]):not([type=color]),select) {
font-family:var(--ui-font); color:var(--ui-text); background:var(--ui-bg);
border:1px solid var(--ui-line); border-radius:8px; padding:.5em .65em; min-height:2.6em; box-sizing:border-box;
}
:root .Panel input[type=checkbox], :root dialog input[type=checkbox], :root .PlaybackBar input { accent-color:var(--ui-primary); }
:root .Panel :is(button,input,select):focus-visible, :root dialog :is(button,input,select):focus-visible {
outline:2px solid var(--ui-primary); outline-offset:3px;
}
:root .Panel button:not(.ButtonGroup__button), :root dialog button:not(.ButtonGroup__button), :root .PlaybackBar button {
font:inherit; border:1px solid var(--ui-line); border-radius:8px;
color:var(--ui-text); background:var(--ui-bg); padding:.5em .8em; min-height:2.6em; cursor:pointer;
}
:root .Panel button:hover, :root dialog button:hover, :root .PlaybackBar button:hover { background:var(--ui-hover); }
:root .Panel button:disabled, :root dialog button:disabled { opacity:.45; cursor:default; }
:root .Panel button.Panel__closer { border:0; padding:0; min-height:0; font:inherit; background:transparent; display:grid; place-items:center; border-radius:50%; cursor:pointer; }
:root .Panel .Panel__closer svg { pointer-events:none; }
:root .Panel .Panel__closer:hover { background:var(--ui-hover); }
:root .ButtonGroup { gap:.45em; flex-wrap:wrap; align-items:stretch; }
:root .ButtonGroup__button {
font-family:var(--ui-font); font-weight:500; font-size:.875em; line-height:1.25;
width:auto; min-width:3.8em; max-width:10em; height:auto; min-height:3.8em;
padding:.55em .6em; border:1px solid var(--ui-line); border-radius:8px;
background:var(--ui-bg); color:var(--ui-text); white-space:normal; cursor:pointer;
}
:root .ButtonGroup__button:hover { background:var(--ui-hover); }
:root .ButtonGroup__button-active, :root .ButtonGroup__button-selected { box-shadow:none; border-color:var(--ui-primary); color:var(--ui-primary); background:var(--ui-selected); }
:root .ButtonGroup__button:disabled { opacity:.4; cursor:default; }
:root .ButtonGroup__button:focus-visible { outline:2px solid var(--ui-primary); outline-offset:3px; }
:root .ButtonGroup__button-toggle { background-image:none; }
:root .ButtonGroup__icon { margin-top:.25em; }
:root .Slider__track { height:.3em; top:calc(50% - .15em); border-radius:1em; background:linear-gradient(to right,var(--ui-primary) var(--slider-progress,0%),var(--ui-line) var(--slider-progress,0%)); }
:root .Slider__knob { background:transparent; background-image:none; box-shadow:none; border-radius:50%; }
:root .Slider__knob::before { content:''; position:absolute; inset:.6em; border-radius:50%; background:var(--ui-primary); box-shadow:0 1px 3px #172b4d30; }
:root .Slider__knob-selected::before { box-shadow:0 0 0 .35em var(--ui-selected); }
:root .Slider__knob__indicator { z-index:1; width:.3em; height:.3em; top:calc(50% - .15em); left:calc(50% - .15em); background:var(--ui-on-primary); }
:root .SliderGroup__SliderBlock { padding:.2em 0; }
:root .Select__toggle { font-family:var(--ui-font); border:1px solid var(--ui-line); border-radius:8px; background:var(--ui-bg); color:var(--ui-text); padding:0 2em 0 .6em; }
:root .Select__toggle:focus { background:var(--ui-bg); outline:2px solid var(--ui-primary); outline-offset:2px; }
:root .Select__toggle::after { content:''; width:.4em; height:.4em; border-right:2px solid var(--ui-muted); border-bottom:2px solid var(--ui-muted); background:none; clip-path:none; rotate:45deg; top:calc(50% - .3em); left:auto; right:.8em; box-shadow:none; }
:root .Select__frame { background:var(--ui-bg); border:1px solid var(--ui-line); border-radius:8px; box-shadow:0 8px 24px #172b4d20; color:var(--ui-text); }
:root .Select__sash { color:var(--ui-text); font-family:var(--ui-font),Bravura; }
:root .Tab__tag { border-radius:8px; color:var(--ui-muted); cursor:pointer; }
:root .Tab__tag-selected { background:var(--ui-selected); color:var(--ui-primary); font-weight:600; }
:root .TabView__sash { background:var(--ui-bg); background-image:none; border-bottom:1px solid var(--ui-line); }
:root .Flv:focus { background:var(--ui-bg); }
:root .Flv-list__file { border-bottom:1px solid var(--ui-line); border-radius:6px; }
:root .Flv-path__sash { background:var(--ui-surface); background-image:none; }
:root .Local { margin:1em; padding:1em; border:1px dashed var(--ui-line); border-radius:12px; background:var(--ui-surface); cursor:pointer; }
:root .Local__line { margin-top:1em; }
:root .Surface__outline { border:1px solid var(--ui-line); background:var(--ui-surface); border-radius:10px; }
:root .Keyboard__key { background:var(--ui-bg); border-color:var(--ui-line); color:var(--ui-text); border-radius:6px; }
:root .Keyboard__key.mod { background:var(--ui-surface); }
:root .Keyboard__key.pressed { background:var(--ui-selected); color:var(--ui-primary); }
:root .Pz__control { stroke:var(--ui-muted); }
:root .Pz__control-active { color:var(--ui-primary); }
:root .Piano__key-white { background:#fff; border-color:#d8dee9; box-shadow:0 2px 2px #172b4d14; }
:root .Piano__key-black { background:#202938; border-color:#151c28; box-shadow:0 2px 3px #172b4d30; }
:root .Piano__key-white.pressed, :root .Piano__key-white:active { background:#d8e7ff; box-shadow:none; }
:root .Piano__key-black.pressed, :root .Piano__key-black:active { background:#245cce; box-shadow:none; }
:root [data-tag=PianoPanel] .Panel__header { height:6em; }
:root .Piano__button-holder { top:2.5em; }
:root .Piano__options { top:6.125em; }
:root .Piano__button { fill:currentColor; color:var(--ui-text); background:var(--ui-surface); }
:root .Piano__button-active { color:var(--ui-primary); background:var(--ui-selected); }
:root .Piano__options { filter:none; border:1px solid var(--ui-line); box-shadow:0 4px 16px #172b4d20; }
:root .PlaybackBar, :root .PlaybackMixer { border:1px solid var(--ui-line); border-radius:12px; box-shadow:0 3px 12px #172b4d14; font-family:var(--ui-font); }
:root .PlaybackMixer { padding:16px; }
:root .ScoreImportReview { font-family:var(--ui-font); border:1px solid var(--ui-line); border-radius:16px; padding:24px; background:var(--ui-bg); color:var(--ui-text); }
:root .ScoreImportReview fieldset { border:1px solid var(--ui-line); border-radius:10px; padding:16px; }
:root .ScoreImportReview fieldset[data-current=true] { border-color:var(--ui-primary); background:var(--ui-selected); }
:root .ScoreImportReview__page { background:var(--ui-surface); border-radius:10px; }
:root dialog.dialog { font:15px/1.5 var(--ui-font); color:var(--ui-text); background:var(--ui-bg); border:1px solid var(--ui-line); border-radius:16px; width:min(460px,calc(100vw - 32px)); max-height:calc(100dvh - 32px); box-sizing:border-box; padding:24px; text-align:left; box-shadow:0 12px 44px #172b4d30; }
:root dialog::backdrop { background:#15264266; backdrop-filter:blur(2px); }
:root dialog.dialog .ButtonGroup { justify-content:flex-end; margin-top:24px; }
:root dialog.dialog .ButtonGroup__button { min-height:40px; min-width:80px; max-width:none; padding:10px 16px; font-size:14px; }
:root dialog.dialog .ButtonGroup__icon { display:none; }
:root dialog.dialog .UiAction--primary { background:var(--ui-primary); color:var(--ui-on-primary); border-color:transparent; }
:root .dialog__textInput { font-size:15px; min-height:42px; padding:10px 12px; border:1px solid var(--ui-line); border-radius:8px; background:var(--ui-bg); color:var(--ui-text); }
:root .floatingMsg { font:14px/1.4 var(--ui-font); filter:none; background:var(--ui-bg); background-image:none; color:var(--ui-text); border:1px solid var(--ui-line); border-radius:10px; padding:12px 18px; box-shadow:0 3px 14px #172b4d14; max-width:calc(100vw - 32px); box-sizing:border-box; overflow-wrap:anywhere; }
:root #toast .floatingMsg { color:#fff; background:#202938; border:0; }
:root .Shade { background:#15264233; backdrop-filter:blur(2px); }
:root .Shade__body { animation:none; color:var(--ui-primary); background:var(--ui-bg); border:1px solid var(--ui-line); border-radius:16px; padding:24px; }
:root .Shade__body [data-tag=msg] { font:15px/1.5 var(--ui-font); color:var(--ui-text); margin:12px 0; }
:root .Shade__body button { font:14px var(--ui-font); padding:10px 16px; border:1px solid var(--ui-line); background:var(--ui-bg); color:var(--ui-text); border-radius:8px; }
@media(prefers-reduced-motion:reduce) { :root .Menu__holder, :root .Panel__elm { transition-duration:0ms; } }
`);
class Gestures {
tr1 = null;
tr2 = null;
timer = new Schedule();
minEmSize = 0.1;
constructor() {
window._pzTarget_ = _body_;
listen(_body_, "wheel", e => this.onWheel(e), { passive: false });
listen(_body_, "pointerdown", e => this.onDown(e), { capture: true });
}
pzTargets() {
return _pzTarget_ === _body_
? [..._body_.getElementsByClassName("pz")]
: [_pzTarget_];
}
toggleFullscreen() {
document.fullscreenElement
? document.exitFullscreen()
: document.documentElement.requestFullscreen().catch(() => {});
}
onWheel(e) {
if (e.target.closest?.('.LibraryWindow, .CloudFolderPicker')) return;
e.preventDefault();
if (!e.ctrlKey) return;
let dXY = -Math.sign(e.deltaY) / 100;
if (e.shiftKey) dXY /= 10;
for (let target of this.pzTargets()) {
target.style.fontSize = Math.max((parseFloat(target.style.fontSize) || 1) + dXY, this.minEmSize) + "em";
target.classList.add("pz-set");
}
}
onDown(e) {
if (e.target.closest?.('.LibraryWindow, .CloudFolderPicker')) return;
if (numbed(e.target)) { e.preventDefault(); e.stopImmediatePropagation(); return; }
if (e.target.dataset.midi) return;
if (e.button != 0) return;
if (e.target.closest("input, textarea, [contenteditable]")) return;
if (e.isPrimary) {
this.tr2 = null;
this.tr1 = { e, pz: e.target.closest(".pz") || _body_ };
this.tr1.dX = e.clientX - this.tr1.pz.offsetLeft;
this.tr1.dY = e.clientY - this.tr1.pz.offsetTop;
window._pzTarget_ = this.tr1.pz;
if (!(e.target.closest(".Panel__closer") || e.target.closest(".Pz__control")))
ScreenPanel.update(this.tr1.pz);
if (e.ctrlKey) { this.startCtrlPan(e); return; }
if (e.target === _body_) _body_.setPointerCapture(e.pointerId);
if (e.target === _body_) Layout.activeLayout?.pagerClaim(e);
this.watch(e);
return;
}
if (this.tr2) return;
if (!this.tr1) return;
_menu_.op.schedule.cancel();
this.timer.cancel();
e.stopImmediatePropagation();
Layout.activeLayout?.cancelNav();
this.startPinch(e);
}
watch(e) {
let onBody = e.target === _body_;
let gestureDelta = _swipeDelta_();
let cancelDelta = 16;
this.timer.run(_gs_, () => {
if(e.taken) return;
if (!onBody) Layout.activeLayout?.cancelNav();
numb(_menu_.elm, _gsgs_);
animate(_menu_.elm, null, { left: e.clientX + "px", top: e.clientY + "px" }, `${_gsgs_}ms`);
if (_menu_.collapsed) _menu_.collapse();
_menu_.opDown(e);
_menu_.op.schedule.cancel();
_menu_.op.moved = true;
});
let mv = listen(_body_, "pointermove", emv => {
if (Math.hypot(emv.clientX - e.clientX, emv.clientY - e.clientY) > cancelDelta)
this.timer.cancel();
}, { capture: true });
listen(_body_, "pointerup", eup => {
unlisten(mv);
this.timer.cancel();
if (!onBody || e.swipeTaken) return;
let dY = eup.clientY - e.clientY;
if (Math.abs(dY) > gestureDelta) {
if (dY < 0)
delay(1, () => _menu_.collapsed ? _menu_.center(true) : _menu_.park());
else
this.toggleFullscreen();
}
}, { once: true, capture: true });
}
startCtrlPan(e) {
_menu_.op.schedule.cancel();
this.timer.cancel();
e.stopImmediatePropagation();
let startX = e.clientX, startY = e.clientY;
let starts = new Map();
for (let target of this.pzTargets())
if (target !== _body_)
starts.set(target, { left: parseFloat(target.style.left) || 0, top: parseFloat(target.style.top) || 0 });
let mv = listen(_body_, "pointermove", emv => {
emv.stopImmediatePropagation();
let dx = emv.clientX - startX, dy = emv.clientY - startY;
for (let [target, { left, top }] of starts) {
target.style.left = left + dx + "px";
target.style.top = top + dy + "px";
target.owner.constrain() ;
target.classList.add("pz-set");
}
}, { capture: true });
listen(_body_, "pointerup", eup => {
eup.captured = true;
unlisten(mv);
}, { capture: true, once: true });
}
twoFingerTap(target) {
let layout = Layout.activeLayout;
if (!layout || target !== layout.elm) return void (this.tap2 = null);
let now = performance.now();
if (this.tap2 && now - this.tap2 < _gs_) {
this.tap2 = null;
layout.refit();
} else this.tap2 = now;
}
startPinch(e) {
this.pinchEnd?.();
this.tr2 = { e, pz: e.target.closest(".pz") || _body_ };
let tapTarget = this.tr1.pz;
let tapBy = performance.now() + _gs_;
let still = true;
let mid0X = (this.tr1.e.clientX + this.tr2.e.clientX) / 2;
let mid0Y = (this.tr1.e.clientY + this.tr2.e.clientY) / 2;
let hypot = Math.hypot(this.tr1.e.clientX - this.tr2.e.clientX, this.tr1.e.clientY - this.tr2.e.clientY);
let targets = new Map();
for (let target of this.pzTargets())
targets.set(target, {
fontSize: parseFloat(target.style.fontSize) || 1,
left: parseFloat(target.style.left) || 0,
top:  parseFloat(target.style.top)  || 0,
});
let mv = listen(_body_, "pointermove", emv => {
if (!this.tr1 || !this.tr2) return;
emv.stopImmediatePropagation();
if (emv.pointerId === this.tr1.e.pointerId) this.tr1.e = emv;
else this.tr2.e = emv;
let ratio = Math.hypot(this.tr1.e.clientX - this.tr2.e.clientX, this.tr1.e.clientY - this.tr2.e.clientY) / hypot;
ratio = 1 + (ratio - 1) / 3;
let midX = (this.tr1.e.clientX + this.tr2.e.clientX) / 2;
let midY = (this.tr1.e.clientY + this.tr2.e.clientY) / 2;
if (Math.abs(ratio - 1) > 0.02 || Math.hypot(midX - mid0X, midY - mid0Y) > 10)
still = false;
for (let [target, { fontSize, left, top }] of targets) {
target.style.fontSize = Math.max(fontSize * ratio, this.minEmSize) + "em";
if (target !== _body_) {
target.style.left = clamp(midX - (mid0X - left) * ratio, 0, innerWidth) + "px";
target.style.top  = clamp(midY - (mid0Y - top)  * ratio, 0, innerHeight) + "px";
}
target.classList.add("pz-set");
}
}, { capture: true });
let up = listen(_body_, "pointerup", eup => {
if (!eup.isTrusted) return;
eup.stopImmediatePropagation();
if (still && performance.now() < tapBy) this.twoFingerTap(tapTarget);
else this.tap2 = null;
this.pinchEnd();
}, { capture: true });
this.pinchEnd = () => {
unlisten(mv);
unlisten(up);
this.pinchEnd = null;
this.tr1 = this.tr2 = null;
};
}
}
async function main() {
initFabric();
schedule(500, async () => {
window._menu_ = new Menu();
const narrow = Math.min(innerWidth, innerHeight);
const diameter = Math.min(narrow * .9, Math.max(320, narrow * (_mobile_ ? .72 : .5)));
let dim = diameter / _menu_.menuHolder.offsetWidth;
numb(_menu_.elm, 1000000 / _gs_);
animate(_menu_.elm, { left: innerWidth/2+"px", top: innerHeight/2+"px", fontSize: 0 },
{ fontSize: dim + "em" }, `font-size ${1000000 / _gs_}ms`);
animate(_menu_.menuHolder, { transform: "rotate(-1turn)" },
{ transform: "rotate(0)" }, `transform ${1000000 / _gs_}ms`);
animate(_menu_.disk, { transform: "rotate(2turn)" }, { transform: "rotate(0)" }, `transform ${1000000 / _gs_}ms`);
window._viewState_ = new DeviceViewState(_menu_);
await _viewState_.ready;
await new SharedBuffer().init() ;
if (typeof chrome !== "undefined" && chrome.runtime?.id &&
new URLSearchParams(location.search).has("url")) {
let { loadPdfFromUrl } = await import("./ext.js");
await loadPdfFromUrl();
}
if (!_score_ && !_menu_.hasOpenedPanel) {
_menu_.showLibrary();
_menu_.park();
if (_viewState_.state?.menu?.w === innerWidth && _viewState_.state.menu.h === innerHeight)
_menu_.elm.style.fontSize = _viewState_.state.menu.fontSize;
}
}) ;
new Gestures();
{
let pedalKeys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'];
let lastPedalTime = 0;
listen(document, "keydown", (e) => {
if (e.target.nodeName === 'TEXTAREA' || e.target.nodeName === 'INPUT') {
_menu_.autoOff.run() ;
return ;
}
if(document.activeElement != _body_) return ;
if ((e.key == "Delete" || e.key == "Backspace") && _score_) {
let active = _score_.getActiveObject();
if (active) {
e.preventDefault();
_menu_.cutCopyObject(active, active.canvas, true);
return;
}
}
if (Layout.activeLayout && pedalKeys.includes(e.key)) {
if (e.repeat) return;
let now = performance.now();
if (now - lastPedalTime < 200) {
e.preventDefault();
e.stopPropagation();
return;
}
lastPedalTime = now;
e.preventDefault();
e.stopPropagation();
let layout = Layout.activeLayout;
if (!layout || !_score_) return;
let forward = _score_.numbers.forward ;
let reverse = _score_?.numbers?.reverse
let forwardBookMarks = e.ctrlKey || forward == "Marks";
let reverseBookMarks = e.ctrlKey || reverse == "Marks";
switch (e.code) {
case "ArrowLeft":
case "ArrowUp":
case "PageUp":
layout.pgOpen("prev", reverseBookMarks);
break;
case "ArrowRight":
case "ArrowDown":
case "PageDown":
layout.pgOpen("next", forwardBookMarks);
break;
case "Home":
layout.pgOpen("first", e.ctrlKey);
break;
case "End":
layout.pgOpen("last", e.ctrlKey);
break;
default:
return;
}
}
},
{ capture:true});
}
let rebuildThrottle = new Schedule();
delay(8, () => {
window.iW = innerWidth ;
window.iH = innerHeight ;
}) ;
listen(screen.orientation, "change", (e) => {
delay(8, () => {
let iW = innerWidth ;
let iH = innerHeight ;
for(let child of _body_.children) {
if(child.classList.contains("pz")) {
child.style.left = (parseFloat(child.style.left) / window.iW) * iW + "px" ;
child.style.top = (parseFloat(child.style.top) / window.iH) * iH + "px" ;
}
}
window.iW = iW ;
window.iH = iH ;
}) ;
}) ;
listen(window, ["resize", "fullscreenchange"], (e) => {
delay(10, () => {
let layout = Layout.activeLayout;
if (layout) {
rebuildThrottle.cancel();
rebuildThrottle.run(500, () => {
layout.cell.pz = null;
layout.build();
});
}
}) ;
});
{
let stasher = new Schedule();
let busyGuard = new Schedule();
listen(window, "pointerdown", (e) => {
_menu_.busy = true;
busyGuard.run(20000, () => _menu_.busy = false);
}) ;
listen(window, ["pointerup","keydown"], (e) => {
_menu_.busy = false;
busyGuard.cancel();
if(_menu_.activeRing?.activeCell) _menu_.autoOff.run() ;
stasher.cancel();
stasher.run(3500, () => localStorage.setItem("menu", _menu_.stashToJson("local"))) ;;
})
}
{
let msgs = [];
let x = helm(`<div data-tag="dbg"></div>`);
_body_.append(x);
window.dbg = (...args) => {
if (args.length == 0) msgs = [];
let msg = args.join(" ");
msgs.push(`${msg}`);
while (msgs.length > 5) msgs.shift();
x.innerHTML = msgs.join("<br>");
};
}
}
{
let period = 7000;
let activePointers = new Map();
let upEvent = (id, p) => new PointerEvent("pointerup", {
pointerId: id,
pointerType: p.pointerType,
isPrimary: p.isPrimary,
clientX: p.clientX,
clientY: p.clientY,
bubbles: true,
cancelable: true
});
let cancel = (id, p) => {
p.target.dispatchEvent(upEvent(id, p));
if (!p.target.isConnected) document.dispatchEvent(upEvent(id, p));
};
let cancelAll = () => {
for (let [id, p] of activePointers) cancel(id, p);
activePointers.clear();
};
let cancelOne = (e) => {
let p = activePointers.get(e.pointerId);
if (p) { cancel(e.pointerId, p); activePointers.delete(e.pointerId); }
};
let track = (e) => {
let p = activePointers.get(e.pointerId);
if (p) { p.lastMove = performance.now(); p.clientX = e.clientX; p.clientY = e.clientY; }
};
listen(document, "pointerdown", (e) => activePointers.set(e.pointerId, {
target: e.target, lastMove: performance.now(),
clientX: e.clientX, clientY: e.clientY,
pointerType: e.pointerType, isPrimary: e.isPrimary
}), { capture: true });
listen(document, "pointermove", track, { capture: true });
listen(document, "pointerup",   (e) => activePointers.delete(e.pointerId), { capture: true });
listen(document, "pointercancel",      cancelOne, { capture: true });
listen(document, "lostpointercapture", cancelOne, { capture: true });
listen(document, "visibilitychange",   cancelAll, { capture: true });
listen(window,   "blur", cancelAll);
let watchdogLoop = () => {
let now = performance.now();
for (let [id, p] of [...activePointers])
if (now - p.lastMove > period) { cancel(id, p); activePointers.delete(id); }
delayMs(period, watchdogLoop);
};
delayMs(period, watchdogLoop);
}
listen(document, "contextmenu", (e) => {
if (e.target.closest('.LibraryWindow, .CloudFolderPicker')) return;
if (e.target.closest("input, textarea, [contenteditable]")) return;
if (e.pointerType === "touch" || e.pointerType === "pen")
e.preventDefault();
});
main();
    
window.addEventListener("rostrum-offline-status", event => toast(event.detail));
