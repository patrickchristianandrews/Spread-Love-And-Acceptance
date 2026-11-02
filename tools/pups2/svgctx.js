// svgctx.js: a canvas-like context that writes SVG, so the same drawing code makes print-ready vector pages.
// Supports what the pup and scene drawings use: save/restore/translate/scale/rotate, paths (moveTo, lineTo,
// quadraticCurveTo, bezierCurveTo, arc, ellipse, closePath), fill, stroke, fillRect, and the style properties.
function SvgCtx(W, H) {
  this.W = W; this.H = H; this.out = []; this.m = [1, 0, 0, 1, 0, 0]; this.stack = []; this.d = '';
  this.fillStyle = '#000'; this.strokeStyle = '#000'; this.lineWidth = 1; this.lineJoin = 'round'; this.lineCap = 'round'; this.globalAlpha = 1;
}
var f = function (n) { return Math.round(n * 100) / 100; };
SvgCtx.prototype = {
  save: function () { this.stack.push({ m: this.m.slice(), fs: this.fillStyle, ss: this.strokeStyle, lw: this.lineWidth, lj: this.lineJoin, lc: this.lineCap, ga: this.globalAlpha }); },
  restore: function () { var s = this.stack.pop(); if (!s) return; this.m = s.m; this.fillStyle = s.fs; this.strokeStyle = s.ss; this.lineWidth = s.lw; this.lineJoin = s.lj; this.lineCap = s.lc; this.globalAlpha = s.ga; },
  transform: function (a, b, c, d, e, g) { var m = this.m; this.m = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d, m[0] * e + m[2] * g + m[4], m[1] * e + m[3] * g + m[5]]; },
  translate: function (x, y) { this.transform(1, 0, 0, 1, x, y); },
  scale: function (x, y) { this.transform(x, 0, 0, y, 0, 0); },
  rotate: function (t) { var c = Math.cos(t), s = Math.sin(t); this.transform(c, s, -s, c, 0, 0); },
  setTransform: function (a, b, c, d, e, g) { this.m = [a, b, c, d, e, g]; },
  P: function (x, y) { var m = this.m; return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; },
  sc: function () { var m = this.m; return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])); },
  beginPath: function () { this.d = ''; },
  moveTo: function (x, y) { var p = this.P(x, y); this.d += 'M' + f(p[0]) + ' ' + f(p[1]); this.cur = [x, y]; },
  lineTo: function (x, y) { var p = this.P(x, y); this.d += 'L' + f(p[0]) + ' ' + f(p[1]); this.cur = [x, y]; },
  quadraticCurveTo: function (cx, cy, x, y) { var a = this.P(cx, cy), b = this.P(x, y); this.d += 'Q' + f(a[0]) + ' ' + f(a[1]) + ' ' + f(b[0]) + ' ' + f(b[1]); this.cur = [x, y]; },
  bezierCurveTo: function (c1x, c1y, c2x, c2y, x, y) { var a = this.P(c1x, c1y), b = this.P(c2x, c2y), e = this.P(x, y); this.d += 'C' + f(a[0]) + ' ' + f(a[1]) + ' ' + f(b[0]) + ' ' + f(b[1]) + ' ' + f(e[0]) + ' ' + f(e[1]); this.cur = [x, y]; },
  closePath: function () { this.d += 'Z'; },
  rect: function (x, y, w, h) { this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath(); },
  ellipse: function (x, y, rx, ry, rot, a0, a1, ccw) {
    // as cubic beziers in 4 (or fewer) quarter arcs, transformed point by point
    var sweep = a1 - a0; if (ccw) sweep = -(Math.PI * 2 - ((a1 - a0) % (Math.PI * 2))); if (Math.abs(sweep) > Math.PI * 2) sweep = Math.PI * 2 * Math.sign(sweep);
    var n = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2))), da = sweep / n, k = 4 / 3 * Math.tan(da / 4), cr = Math.cos(rot || 0), sr = Math.sin(rot || 0);
    var pt = function (a) { var px = rx * Math.cos(a), py = ry * Math.sin(a); return [x + px * cr - py * sr, y + px * sr + py * cr]; };
    var dv = function (a) { var px = -rx * Math.sin(a), py = ry * Math.cos(a); return [px * cr - py * sr, px * sr + py * cr]; };
    var p0 = pt(a0); if (this.d && !/Z$/.test(this.d) && this.cur) this.lineTo(p0[0], p0[1]); else this.moveTo(p0[0], p0[1]);
    for (var i = 0; i < n; i++) { var s = a0 + i * da, e = s + da, ps = pt(s), pe = pt(e), ds = dv(s), de = dv(e);
      this.bezierCurveTo(ps[0] + ds[0] * k, ps[1] + ds[1] * k, pe[0] - de[0] * k, pe[1] - de[1] * k, pe[0], pe[1]); }
  },
  arc: function (x, y, r, a0, a1, ccw) { this.ellipse(x, y, r, r, 0, a0, a1, ccw); },
  op: function () { return this.globalAlpha < 1 ? ' opacity="' + f(this.globalAlpha) + '"' : ''; },
  fill: function () { if (!this.d) return; this.out.push('<path d="' + this.d + '" fill="' + this.fillStyle + '"' + this.op() + '/>'); },
  stroke: function () { if (!this.d) return; this.out.push('<path d="' + this.d + '" fill="none" stroke="' + this.strokeStyle + '" stroke-width="' + f(this.lineWidth * this.sc()) + '" stroke-linejoin="' + this.lineJoin + '" stroke-linecap="' + this.lineCap + '"' + this.op() + '/>'); },
  fillRect: function (x, y, w, h) { this.beginPath(); this.rect(x, y, w, h); this.fill(); },
  raw: function (s) { this.out.push(s); },
  svg: function (bg) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + this.W + ' ' + this.H + '" width="' + this.W + '" height="' + this.H + '">' + (bg ? '<rect width="100%" height="100%" fill="' + bg + '"/>' : '') + this.out.join('') + '</svg>'; }
};
if (typeof module !== 'undefined') module.exports = SvgCtx;
