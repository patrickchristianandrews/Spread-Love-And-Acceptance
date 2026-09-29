/*
  tol-pdf.js — The Objective Ledger (TOL-OS)
  A small, dependency-free PDF writer used by the fill-in workpapers.
  Runs entirely in the browser. It makes no network requests and stores nothing.
  Uses the 14 standard PDF fonts (Helvetica, Times), so no font files are embedded.
*/
(function (global) {
  'use strict';

  var WIDTHS = {"Helvetica":[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,761,556,556,222,556,333,1000,556,556,333,1000,667,333,1000,556,611,556,556,222,222,333,333,350,556,1000,333,1000,500,333,944,556,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500],"Helvetica-Bold":[278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,761,556,611,278,556,500,1000,556,556,333,1000,667,333,1000,611,611,611,611,278,278,500,500,350,556,1000,333,1000,556,333,944,611,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556],"Times-Roman":[250,333,408,500,500,833,778,180,333,333,500,564,250,333,250,278,500,500,500,500,500,500,500,500,500,500,278,278,564,564,564,444,921,722,667,667,722,611,556,722,722,333,389,722,611,889,722,722,556,722,667,556,611,722,722,944,722,722,611,333,278,333,469,500,333,444,500,444,500,444,333,500,500,278,278,500,278,778,500,500,500,500,333,389,278,500,500,722,500,500,444,480,200,480,541,761,500,444,333,500,444,1000,500,500,333,1000,556,333,889,444,611,444,444,333,333,444,444,350,500,1000,333,980,389,333,722,444,444,722,250,333,500,500,500,500,200,500,333,760,276,500,564,333,760,333,400,564,300,300,333,500,453,250,333,300,310,500,750,750,750,444,722,722,722,722,722,722,889,667,611,611,611,611,333,333,333,333,722,722,722,722,722,722,722,564,722,722,722,722,722,722,556,500,444,444,444,444,444,444,667,444,444,444,444,444,278,278,278,278,500,500,500,500,500,500,500,564,500,500,500,500,500,500,500,500],"Times-Bold":[250,333,555,500,500,1000,833,278,333,333,500,570,250,333,250,278,500,500,500,500,500,500,500,500,500,500,333,333,570,570,570,500,930,722,667,722,722,667,611,778,778,389,500,778,667,944,722,778,611,778,722,556,667,722,722,1000,722,722,667,333,278,333,581,500,333,500,556,444,556,444,333,500,556,278,333,556,278,833,556,500,556,556,444,389,333,556,500,722,500,500,444,394,220,394,520,761,500,500,333,500,500,1000,500,500,333,1000,556,333,1000,500,667,500,500,333,333,500,500,350,500,1000,333,1000,389,333,722,500,444,722,250,333,500,500,500,500,220,500,333,747,300,500,570,333,747,333,400,570,300,300,333,556,540,250,333,300,330,500,750,750,750,500,722,722,722,722,722,722,1000,722,667,667,667,667,389,389,389,389,722,722,778,778,778,778,778,570,778,722,722,722,722,722,611,556,500,500,500,500,500,500,722,444,444,444,444,444,278,278,278,278,500,556,500,500,500,500,500,570,500,556,556,556,556,500,556,500],"Times-Italic":[250,333,420,500,500,833,778,214,333,333,500,675,250,333,250,278,500,500,500,500,500,500,500,500,500,500,333,333,675,675,675,500,920,611,611,667,722,611,611,722,722,333,444,667,556,833,667,722,611,722,611,500,556,722,611,833,611,556,556,389,278,389,422,500,333,500,500,444,500,444,278,500,500,278,278,444,278,722,500,500,500,500,389,389,278,500,444,667,444,444,389,400,275,400,541,761,500,500,333,500,556,889,500,500,333,1000,500,333,944,500,556,500,500,333,333,556,556,350,500,889,333,980,389,333,667,500,389,556,250,389,500,500,500,500,275,500,333,760,276,500,675,333,760,333,400,675,300,300,333,500,523,250,333,300,310,500,750,750,750,500,611,611,611,611,611,611,889,667,611,611,611,611,333,333,333,333,722,667,722,722,722,722,722,675,722,722,722,722,722,556,611,500,500,500,500,500,500,500,667,444,444,444,444,444,278,278,278,278,500,500,500,500,500,500,500,675,500,500,500,500,500,444,500,444]};
  var FONT_NAMES = ['Helvetica', 'Helvetica-Bold', 'Times-Roman', 'Times-Bold', 'Times-Italic'];

  // Unicode -> Windows-1252 for the characters outside Latin-1.
  var CP1252 = {
    0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86,
    0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C,
    0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95,
    0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B,
    0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F
  };
  // Curly apostrophes become plain ones, so "Who’s" reads as "Who's" in every PDF app, screen reader
  // and copy-and-paste (some drop the Windows-1252 byte for ’ and show "Whos").
  var SUBS = { 0x2019: "'", 0x2018: "'", 0x02BC: "'", 0x2192: '->',0x2190: '<-', 0x2212: '-', 0x2011: '-', 0x2010: '-', 0x00A0: ' ', 0x2009: ' ', 0x202F: ' ', 0x2264: '<=', 0x2265: '>=' };

  // The standard PDF fonts can't draw emoji, so each one becomes a short word in brackets
  // instead of quietly disappearing from what someone wrote.
  var EMOJI = {};
  [['heart', [0x2764, 0x2665, 0x1F495, 0x1F496, 0x1F497, 0x1F493, 0x1F49B, 0x1F49A, 0x1F499, 0x1F49C, 0x1F9E1, 0x1F90D, 0x1F90E, 0x1F5A4, 0x1F498, 0x1F49D, 0x1F49E]],
    ['smile', [0x1F60A, 0x263A, 0x1F642, 0x1F600, 0x1F603, 0x1F604, 0x1F601, 0x1F607, 0x1F60C]], ['laughing', [0x1F602, 0x1F923, 0x1F606]], ['wink', [0x1F609]],
    ['love', [0x1F60D, 0x1F970, 0x1F618]], ['hug', [0x1F917, 0x1FAC2]], ['tears', [0x1F622, 0x1F62D, 0x1F97A]], ['sad', [0x1F614, 0x1F61E, 0x1F641, 0x2639, 0x1F625]],
    ['angry', [0x1F620, 0x1F621, 0x1F624]], ['tired', [0x1F634, 0x1F62A, 0x1F971, 0x1F62B, 0x1F629]], ['phew', [0x1F605, 0x1F62E]], ['awkward', [0x1F62C]], ['thinking', [0x1F914]],
    ['thumbs up', [0x1F44D]], ['thanks', [0x1F64F]], ['clapping', [0x1F44F]], ['wave', [0x1F44B]], ['strong', [0x1F4AA]], ['celebrate', [0x1F389, 0x1F973, 0x1F38A]],
    ['star', [0x2B50, 0x1F31F, 0x2728]], ['fire', [0x1F525]], ['done', [0x2705, 0x2714, 0x2611]], ['sun', [0x2600, 0x1F31E]], ['flower', [0x1F338, 0x1F337, 0x1F33B, 0x1F339, 0x1F33C]],
    ['coffee', [0x2615]], ['dog', [0x1F436, 0x1F415]], ['cat', [0x1F431, 0x1F408]], ['home', [0x1F3E0, 0x1F3E1]], ['gift', [0x1F381]], ['cake', [0x1F382, 0x1F370]],
    ['sleep', [0x1F4A4]], ['plant', [0x1F331, 0x1FAB4]], ['lemon', [0x1F34B]], ['laptop', [0x1F4BB]], ['calendar', [0x1F4C5, 0x1F4C6]]
  ].forEach(function (g) { g[1].forEach(function (c) { EMOJI[c] = '(' + g[0] + ')'; }); });
  function isEmoji(c) { return (c >= 0x1F000 && c <= 0x1FAFF) || (c >= 0x2600 && c <= 0x27BF) || (c >= 0x2B00 && c <= 0x2BFF); }

  // Encode any string as a Windows-1252 byte string (one char per byte).
  function encode(str) {
    var out = '', afterJoin = false;
    str = String(str == null ? '' : str).replace(/\r\n?/g, '\n');
    for (var ch of str) {
      var c = ch.codePointAt(0);
      if (c === 9) { out += ' '; continue; }
      if (c === 10) { out += '\n'; continue; }
      if (SUBS[c]) { out += SUBS[c]; continue; }
      if ((c >= 32 && c < 127) || (c >= 0xA1 && c <= 0xFF)) { out += String.fromCharCode(c); continue; }
      if (CP1252[c]) { out += String.fromCharCode(CP1252[c]); continue; }
      if (c === 0x200D) { afterJoin = true; continue; } // a joined emoji (a family, a flag) reads as one word
      if ((c >= 0xFE00 && c <= 0xFE0F) || (c >= 0x1F3FB && c <= 0x1F3FF) || (c >= 0xE0020 && c <= 0xE007F)) continue; // style and skin-tone marks
      if (EMOJI[c] || isEmoji(c)) {
        if (!afterJoin) out += (out && !/[\s(\n]$/.test(out) ? ' ' : '') + (EMOJI[c] || '(emoji)');
        afterJoin = false;
        continue;
      }
      afterJoin = false;
      if (c >= 0x2600) continue; // other symbols the standard fonts can't draw
      var base = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      var b = base.codePointAt(0);
      out += (b >= 32 && b < 127) ? base.charAt(0) : '?';
    }
    return out;
  }

  function textWidth(enc, font, size) {
    var w = WIDTHS[font], t = 0;
    for (var i = 0; i < enc.length; i++) {
      var c = enc.charCodeAt(i);
      t += (c >= 32 && c <= 255) ? w[c - 32] : 500;
    }
    return t * size / 1000;
  }

  // Wrap text to a width. Returns an array of encoded lines.
  function wrap(text, font, size, maxWidth) {
    var lines = [];
    var paras = encode(text).split('\n');
    paras.forEach(function (para) {
      var words = para.split(' ');
      var line = '';
      words.forEach(function (word) {
        var candidate = line ? line + ' ' + word : word;
        if (textWidth(candidate, font, size) <= maxWidth) { line = candidate; return; }
        if (line) { lines.push(line); line = ''; }
        // Break a single word that is too long for the column.
        while (textWidth(word, font, size) > maxWidth && word.length > 1) {
          var cut = word.length - 1;
          while (cut > 1 && textWidth(word.slice(0, cut), font, size) > maxWidth) cut--;
          lines.push(word.slice(0, cut));
          word = word.slice(cut);
        }
        line = word;
      });
      lines.push(line);
    });
    return lines;
  }

  function num(n) { return String(Math.round(n * 100) / 100); }
  function rgb(hex) {
    hex = hex.replace('#', '');
    return [0, 2, 4].map(function (i) { return num(parseInt(hex.substr(i, 2), 16) / 255); }).join(' ');
  }
  function escapeText(s) { return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
  function pdfDate(d) {
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return 'D:' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }

  // A document measured in points, with y measured from the TOP of the page.
  function Doc(info) {
    this.width = 612;   // US Letter
    this.height = 792;
    this.pages = [];
    this.info = info || {};
  }
  Doc.prototype.addPage = function () {
    this.page = { ops: [] };
    this.pages.push(this.page);
    return this.page;
  };
  Doc.prototype.setPage = function (i) { this.page = this.pages[i]; };
  Doc.prototype._op = function (s) { this.page.ops.push(s); };
  Doc.prototype.text = function (x, y, enc, font, size, color) {
    var f = FONT_NAMES.indexOf(font) + 1;
    this._op(rgb(color || '#211D17') + ' rg BT /F' + f + ' ' + num(size) + ' Tf 1 0 0 1 ' +
      num(x) + ' ' + num(this.height - y) + ' Tm (' + escapeText(enc) + ') Tj ET');
  };
  Doc.prototype.line = function (x1, y1, x2, y2, color, lw) {
    this._op(rgb(color || '#D9CBA3') + ' RG ' + num(lw || 0.5) + ' w ' +
      num(x1) + ' ' + num(this.height - y1) + ' m ' + num(x2) + ' ' + num(this.height - y2) + ' l S');
  };
  Doc.prototype.rect = function (x, y, w, h, fill, stroke, lw) {
    var s = '';
    if (fill) s += rgb(fill) + ' rg ';
    if (stroke) s += rgb(stroke) + ' RG ' + num(lw || 0.5) + ' w ';
    s += num(x) + ' ' + num(this.height - y - h) + ' ' + num(w) + ' ' + num(h) + ' re ';
    s += fill && stroke ? 'B' : (fill ? 'f' : 'S');
    this._op(s);
  };

  // Soft shapes for covers and dividers: rounded boxes, bubbles and hearts.
  function paint(fill, stroke, lw) {
    var s = '';
    if (fill) s += rgb(fill) + ' rg ';
    if (stroke) s += rgb(stroke) + ' RG ' + num(lw || 0.5) + ' w ';
    return { pre: s, op: fill && stroke ? 'B' : (fill ? 'f' : 'S') };
  }
  Doc.prototype.roundRect = function (x, y, w, h, r, fill, stroke, lw) {
    var H = this.height, k = 0.5523 * r, p = paint(fill, stroke, lw);
    var x2 = x + w, yt = H - y, yb = H - y - h;
    this._op(p.pre + num(x + r) + ' ' + num(yt) + ' m ' + num(x2 - r) + ' ' + num(yt) + ' l ' +
      num(x2 - r + k) + ' ' + num(yt) + ' ' + num(x2) + ' ' + num(yt - r + k) + ' ' + num(x2) + ' ' + num(yt - r) + ' c ' +
      num(x2) + ' ' + num(yb + r) + ' l ' +
      num(x2) + ' ' + num(yb + r - k) + ' ' + num(x2 - r + k) + ' ' + num(yb) + ' ' + num(x2 - r) + ' ' + num(yb) + ' c ' +
      num(x + r) + ' ' + num(yb) + ' l ' +
      num(x + r - k) + ' ' + num(yb) + ' ' + num(x) + ' ' + num(yb + r - k) + ' ' + num(x) + ' ' + num(yb + r) + ' c ' +
      num(x) + ' ' + num(yt - r) + ' l ' +
      num(x) + ' ' + num(yt - r + k) + ' ' + num(x + r - k) + ' ' + num(yt) + ' ' + num(x + r) + ' ' + num(yt) + ' c h ' + p.op);
  };
  Doc.prototype.circle = function (cx, cy, r, fill, stroke, lw) {
    var y = this.height - cy, k = 0.5523 * r, p = paint(fill, stroke, lw);
    this._op(p.pre + num(cx + r) + ' ' + num(y) + ' m ' +
      num(cx + r) + ' ' + num(y + k) + ' ' + num(cx + k) + ' ' + num(y + r) + ' ' + num(cx) + ' ' + num(y + r) + ' c ' +
      num(cx - k) + ' ' + num(y + r) + ' ' + num(cx - r) + ' ' + num(y + k) + ' ' + num(cx - r) + ' ' + num(y) + ' c ' +
      num(cx - r) + ' ' + num(y - k) + ' ' + num(cx - k) + ' ' + num(y - r) + ' ' + num(cx) + ' ' + num(y - r) + ' c ' +
      num(cx + k) + ' ' + num(y - r) + ' ' + num(cx + r) + ' ' + num(y - k) + ' ' + num(cx + r) + ' ' + num(y) + ' c h ' + p.op);
  };
  // A heart centred on (cx, cy), s wide.
  Doc.prototype.heart = function (cx, cy, s, fill, stroke, lw) {
    var y = this.height - cy, u = s / 2, p = paint(fill, stroke, lw);
    function P(dx, dy) { return num(cx + dx * u) + ' ' + num(y - dy * u); }
    this._op(p.pre + P(0, 0.95) + ' m ' +
      P(-0.25, 0.7) + ' ' + P(-1, 0.25) + ' ' + P(-1, -0.25) + ' c ' +
      P(-1, -0.72) + ' ' + P(-0.45, -0.95) + ' ' + P(0, -0.5) + ' c ' +
      P(0.45, -0.95) + ' ' + P(1, -0.72) + ' ' + P(1, -0.25) + ' c ' +
      P(1, 0.25) + ' ' + P(0.25, 0.7) + ' ' + P(0, 0.95) + ' c h ' + p.op);
  };
  // A smooth curve through points, for the road on the cover.
  Doc.prototype.curve = function (pts, color, lw, dash) {
    var H = this.height, s = rgb(color || '#D9CBA3') + ' RG ' + num(lw || 1) + ' w 1 J ' + (dash ? '[' + dash.join(' ') + '] 0 d ' : '');
    s += num(pts[0][0]) + ' ' + num(H - pts[0][1]) + ' m ';
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], my = (a[1] + b[1]) / 2;
      s += num(a[0]) + ' ' + num(H - my) + ' ' + num(b[0]) + ' ' + num(H - my) + ' ' + num(b[0]) + ' ' + num(H - b[1]) + ' c ';
    }
    this._op(s + 'S [] 0 d 0 J');
  };

  /* Interactive parts: form fields people can type into in any PDF app,
     links, and bookmarks. Field boxes are drawn on the page as well, so a
     printed copy can be filled in by hand. */
  // opts: { name, x, y, w, h, kind: 'text'|'choice'|'check', value, multiline, size, options: [[value, label]] }
  Doc.prototype.field = function (opts) {
    (this.page.fields || (this.page.fields = [])).push(opts);
  };
  Doc.prototype.link = function (x, y, w, h, toPage, toY) {
    (this.page.links || (this.page.links = [])).push({ x: x, y: y, w: w, h: h, page: toPage, top: toY || 0 });
  };
  // Bookmarks: level 0 or 1, in reading order.
  Doc.prototype.bookmark = function (title, level) {
    (this.marks || (this.marks = [])).push({ title: title, level: level || 0, page: this.pages.length - 1 });
  };

  // Text strings for field values: UTF-16 with a byte-order mark, so any character survives.
  function utf16(str) {
    var hex = 'FEFF';
    str = String(str == null ? '' : str);
    for (var i = 0; i < str.length; i++) hex += ('000' + str.charCodeAt(i).toString(16).toUpperCase()).slice(-4);
    return '<' + hex + '>';
  }
  function lit(str) { return '(' + escapeText(encode(str)) + ')'; }

  // Serialize to PDF bytes.
  Doc.prototype.output = function () {
    var objs = [];
    function add(body) { objs.push(body); return objs.length; }
    function reserve() { objs.push(null); return objs.length; }
    function set(id, body) { objs[id - 1] = body; }
    function stream(dict, data) { return '<< ' + (dict ? dict + ' ' : '') + '/Length ' + data.length + ' >>\nstream\n' + data + '\nendstream'; }
    var catalogId = reserve(), pagesId = reserve();
    var fontIds = FONT_NAMES.map(function (name) {
      return add('<< /Type /Font /Subtype /Type1 /BaseFont /' + name + ' /Encoding /WinAnsiEncoding >>');
    });
    var helv = fontIds[0];
    var fontDict = '<< ' + fontIds.map(function (id, i) { return '/F' + (i + 1) + ' ' + id + ' 0 R'; }).join(' ') + ' >>';
    var self = this, H = this.height, kids = [], allFields = [];
    var pageIds = this.pages.map(function () { return reserve(); });

    var blanks = {};
    function textAppearance(f) {
      var w = f.w, h = f.h, size = f.size || 9, lines;
      if (f.value == null || f.value === '') {
        var bk = num(w) + 'x' + num(h);
        if (!blanks[bk]) blanks[bk] = add(stream('/Type /XObject /Subtype /Form /BBox [0 0 ' + num(w) + ' ' + num(h) + ']', '/Tx BMC EMC'));
        return blanks[bk];
      }
      var shown = f.kind === 'choice' ? labelFor(f, f.value) : f.value;
      if (f.multiline) lines = wrap(shown || '', 'Helvetica', size, w - 6);
      else lines = [encode(String(shown == null ? '' : shown).replace(/\n/g, ' '))];
      var ops = '/Tx BMC q BT /Helv ' + num(size) + ' Tf 0.13 0.11 0.09 rg ';
      var lh = size * 1.18, y0 = f.multiline ? h - 3 - size : (h - size * 0.72) / 2;
      lines.forEach(function (ln, i) {
        var y = y0 - i * lh;
        if (y < 1) return;
        ops += '1 0 0 1 3 ' + num(y) + ' Tm (' + escapeText(ln) + ') Tj ';
      });
      ops += 'ET Q EMC';
      return add(stream('/Type /XObject /Subtype /Form /BBox [0 0 ' + num(w) + ' ' + num(h) + '] /Resources << /Font << /Helv ' + helv + ' 0 R >> >>', ops));
    }
    function labelFor(f, v) {
      var hit = (f.options || []).filter(function (o) { return o[0] === v; })[0];
      return hit ? hit[1] : (v || '');
    }
    var checks = {};
    function checkAppearance(f, on) {
      var w = f.w, h = f.h, ops = '', ck = num(w) + 'x' + num(h) + on;
      if (checks[ck]) return checks[ck];
      if (on) {
        var s = Math.min(w, h);
        ops = '0.24 0.42 0.3 RG 1.6 w 1 J 1 j ' + num(w / 2 - s * 0.28) + ' ' + num(h / 2) + ' m ' + num(w / 2 - s * 0.08) + ' ' + num(h / 2 - s * 0.22) + ' l ' + num(w / 2 + s * 0.3) + ' ' + num(h / 2 + s * 0.24) + ' l S';
      }
      return (checks[ck] = add(stream('/Type /XObject /Subtype /Form /BBox [0 0 ' + num(w) + ' ' + num(h) + ']', ops)));
    }

    // Radio buttons: a filled dot when on, nothing when off (the ring is drawn on the page itself).
    var radios = {};
    function radioAppearance(w, h, on) {
      var ck = num(w) + 'x' + num(h) + on;
      if (radios[ck]) return radios[ck];
      var ops = '';
      if (on) {
        var r = Math.min(w, h) * 0.26, cx = w / 2, cy = h / 2, k = 0.5523 * r;
        ops = '0.24 0.42 0.3 rg ' + num(cx + r) + ' ' + num(cy) + ' m ' +
          num(cx + r) + ' ' + num(cy + k) + ' ' + num(cx + k) + ' ' + num(cy + r) + ' ' + num(cx) + ' ' + num(cy + r) + ' c ' +
          num(cx - k) + ' ' + num(cy + r) + ' ' + num(cx - r) + ' ' + num(cy + k) + ' ' + num(cx - r) + ' ' + num(cy) + ' c ' +
          num(cx - r) + ' ' + num(cy - k) + ' ' + num(cx - k) + ' ' + num(cy - r) + ' ' + num(cx) + ' ' + num(cy - r) + ' c ' +
          num(cx + k) + ' ' + num(cy - r) + ' ' + num(cx + r) + ' ' + num(cy - k) + ' ' + num(cx + r) + ' ' + num(cy) + ' c f';
      }
      return (radios[ck] = add(stream('/Type /XObject /Subtype /Form /BBox [0 0 ' + num(w) + ' ' + num(h) + ']', ops)));
    }
    // A PDF name for an export value (radio options): plain letters and digits, anything else escaped.
    function pdfName(v) {
      return '/' + String(v).replace(/[^A-Za-z0-9_.\-]/g, function (c) { return '#' + ('0' + (c.charCodeAt(0) & 0xFF).toString(16)).slice(-2); });
    }

    // Names with dots ("tol.v1.wp02.p1.q3") become a real field tree: one parent node per part,
    // so every PDF app sees the same fully qualified name. Names without dots stay flat.
    var nodes = {}, roots = [];
    function nodeFor(parts) {
      var key = parts.join('.');
      if (nodes[key]) return nodes[key].id;
      var parentKey = parts.length > 1 ? parts.slice(0, -1).join('.') : null;
      var parentId = parentKey ? nodeFor(parts.slice(0, -1)) : null;
      var id = reserve();
      nodes[key] = { id: id, t: parts[parts.length - 1], parent: parentId, kids: [] };
      if (parentKey) nodes[parentKey].kids.push(id); else roots.push(id);
      return id;
    }
    // The /T (and /Parent) entries for a field, and where to list it.
    function naming(name) {
      var parts = String(name).split('.');
      if (parts.length < 2) return { t: ' /T ' + lit(name), attach: function (id) { allFields.push(id); } };
      var parentKey = parts.slice(0, -1).join('.'), parentId = nodeFor(parts.slice(0, -1));
      return { t: ' /T ' + lit(parts[parts.length - 1]) + ' /Parent ' + parentId + ' 0 R', attach: function (id) { nodes[parentKey].kids.push(id); } };
    }

    this.pages.forEach(function (p, pi) {
      var s = p.ops.join('\n');
      var contentId = add(stream('', s));
      var annots = [];
      (p.fields || []).forEach(function (f) {
        var nm = naming(f.name);
        if (f.kind === 'radio') {
          // opts.options: [{ v: export value, x, y, w, h }], all on this page
          var groupId = reserve(), kidIds = [], chosen = null;
          (f.options || []).forEach(function (o) {
            var on = f.value != null && f.value !== '' && String(f.value) === String(o.v);
            if (on) chosen = o.v;
            var rr = '[' + num(o.x) + ' ' + num(H - o.y - o.h) + ' ' + num(o.x + o.w) + ' ' + num(H - o.y) + ']';
            var kid = add('<< /Type /Annot /Subtype /Widget /F 4 /P ' + pageIds[pi] + ' 0 R /Parent ' + groupId + ' 0 R /Rect ' + rr +
              ' /AS ' + (on ? pdfName(o.v) : '/Off') + ' /MK << /CA (l) >> /DA (/ZaDb 0 Tf 0.24 0.42 0.3 rg)' +
              ' /AP << /N << ' + pdfName(o.v) + ' ' + radioAppearance(o.w, o.h, true) + ' 0 R /Off ' + radioAppearance(o.w, o.h, false) + ' 0 R >> >> >>');
            kidIds.push(kid); annots.push(kid);
          });
          set(groupId, '<< /FT /Btn /Ff 49152' + nm.t + (f.tip ? ' /TU ' + utf16(f.tip) : '') + ' /V ' + (chosen != null ? pdfName(chosen) : '/Off') +
            ' /Kids [' + kidIds.map(function (k) { return k + ' 0 R'; }).join(' ') + '] >>');
          nm.attach(groupId);
          return;
        }
        var rect = '[' + num(f.x) + ' ' + num(H - f.y - f.h) + ' ' + num(f.x + f.w) + ' ' + num(H - f.y) + ']';
        var common = '/Type /Annot /Subtype /Widget /F ' + (f.hidden ? 2 : 4) + ' /P ' + pageIds[pi] + ' 0 R /Rect ' + rect + nm.t + (f.tip ? ' /TU ' + utf16(f.tip) : '');
        var body;
        if (f.kind === 'check') {
          var on = !!f.value, yes = checkAppearance(f, true), off = checkAppearance(f, false);
          body = '<< ' + common + ' /FT /Btn /V /' + (on ? 'Yes' : 'Off') + ' /AS /' + (on ? 'Yes' : 'Off') +
            ' /MK << /CA (4) >> /DA (/ZaDb 0 Tf 0.24 0.42 0.3 rg) /AP << /N << /Yes ' + yes + ' 0 R /Off ' + off + ' 0 R >> >> >>';
        } else if (f.kind === 'choice') {
          var opts = (f.options || []).map(function (o) { return '[' + utf16(o[0]) + ' ' + utf16(o[1]) + ']'; }).join(' ');
          body = '<< ' + common + ' /FT /Ch /Ff 131072 /Opt [' + opts + '] /V ' + utf16(f.value || '') +
            ' /DA (/Helv ' + num(f.size || 9) + ' Tf 0.13 0.11 0.09 rg) /AP << /N ' + textAppearance(f) + ' 0 R >> >>';
        } else {
          body = '<< ' + common + ' /FT /Tx' + (f.multiline ? ' /Ff 4096' : '') + ' /V ' + utf16(f.value || '') +
            ' /DA (/Helv ' + num(f.size || 9) + ' Tf 0.13 0.11 0.09 rg) /AP << /N ' + textAppearance(f) + ' 0 R >> >>';
        }
        var id = add(body);
        annots.push(id); nm.attach(id);
      });
      (p.links || []).forEach(function (l) {
        if (!pageIds[l.page]) return;
        annots.push(add('<< /Type /Annot /Subtype /Link /Border [0 0 0] /Rect [' + num(l.x) + ' ' + num(H - l.y - l.h) + ' ' + num(l.x + l.w) + ' ' + num(H - l.y) +
          '] /Dest [' + pageIds[l.page] + ' 0 R /XYZ null ' + num(H - l.top) + ' null] >>'));
      });
      set(pageIds[pi], '<< /Type /Page /Parent ' + pagesId + ' 0 R /MediaBox [0 0 ' + self.width + ' ' + self.height +
        '] /Resources << /Font ' + fontDict + ' >> /Contents ' + contentId + ' 0 R' +
        (annots.length ? ' /Annots [' + annots.map(function (a) { return a + ' 0 R'; }).join(' ') + ']' : '') + ' >>');
      kids.push(pageIds[pi]);
    });

    // Bookmarks, two levels deep.
    var outlinesRef = '';
    if (this.marks && this.marks.length) {
      var rootId = reserve(), tops = [];
      this.marks.forEach(function (m) {
        m.id = reserve();
        if (m.level === 0 || !tops.length) { m.kids = []; tops.push(m); } else tops[tops.length - 1].kids.push(m);
      });
      var link = function (list, parent) {
        list.forEach(function (m, i) {
          var d = '<< /Title ' + utf16(m.title) + ' /Parent ' + parent + ' 0 R /Dest [' + pageIds[m.page] + ' 0 R /XYZ null ' + H + ' null]';
          if (i > 0) d += ' /Prev ' + list[i - 1].id + ' 0 R';
          if (i < list.length - 1) d += ' /Next ' + list[i + 1].id + ' 0 R';
          if (m.kids && m.kids.length) { d += ' /First ' + m.kids[0].id + ' 0 R /Last ' + m.kids[m.kids.length - 1].id + ' 0 R /Count ' + m.kids.length; link(m.kids, m.id); }
          set(m.id, d + ' >>');
        });
      };
      link(tops, rootId);
      set(rootId, '<< /Type /Outlines /First ' + tops[0].id + ' 0 R /Last ' + tops[tops.length - 1].id + ' 0 R /Count ' + tops.length + ' >>');
      outlinesRef = ' /Outlines ' + rootId + ' 0 R /PageMode /UseOutlines';
    }

    // the field tree's parent nodes
    Object.keys(nodes).forEach(function (k) {
      var n = nodes[k];
      set(n.id, '<< /T ' + lit(n.t) + (n.parent ? ' /Parent ' + n.parent + ' 0 R' : '') + ' /Kids [' + n.kids.map(function (c) { return c + ' 0 R'; }).join(' ') + '] >>');
    });
    allFields = allFields.concat(roots);

    var acro = '';
    if (allFields.length) {
      var zadb = add('<< /Type /Font /Subtype /Type1 /BaseFont /ZapfDingbats >>');
      acro = ' /AcroForm << /Fields [' + allFields.map(function (a) { return a + ' 0 R'; }).join(' ') + '] /NeedAppearances true /DA (/Helv 0 Tf 0 g) /DR << /Font << /Helv ' + helv + ' 0 R /ZaDb ' + zadb + ' 0 R >> >> >>';
    }
    set(catalogId, '<< /Type /Catalog /Pages ' + pagesId + ' 0 R' + outlinesRef + acro + ' /ViewerPreferences << /DisplayDocTitle true >> >>');
    set(pagesId, '<< /Type /Pages /Kids [' + kids.map(function (k) { return k + ' 0 R'; }).join(' ') + '] /Count ' + kids.length + ' >>');
    var infoId = add('<< /Title ' + utf16(this.info.title || '') + ' /Producer ' + lit(this.info.producer || '') +
      (this.info.subject ? ' /Subject ' + lit(this.info.subject) : '') + ' /CreationDate (' + pdfDate(new Date()) + ') >>');

    var out = '%PDF-1.5\n%\xE2\xE3\xCF\xD3\n';
    var offsets = [];
    objs.forEach(function (body, i) {
      offsets.push(out.length);
      out += (i + 1) + ' 0 obj\n' + body + '\nendobj\n';
    });
    var xref = out.length;
    out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    offsets.forEach(function (o) { out += ('0000000000' + o).slice(-10) + ' 00000 n \n'; });
    out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + catalogId + ' 0 R /Info ' + infoId + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';

    var bytes = new Uint8Array(out.length);
    for (var i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xFF;
    return bytes;
  };

  global.TOLPDF = { Doc: Doc, encode: encode, wrap: wrap, textWidth: textWidth };
})(typeof window !== 'undefined' ? window : globalThis);
