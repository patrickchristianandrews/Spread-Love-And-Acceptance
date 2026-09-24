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
  var SUBS = { 0x2192: '->', 0x2190: '<-', 0x2212: '-', 0x2011: '-', 0x2010: '-', 0x00A0: ' ', 0x2009: ' ', 0x202F: ' ', 0x2264: '<=', 0x2265: '>=' };

  // Encode any string as a Windows-1252 byte string (one char per byte).
  function encode(str) {
    var out = '';
    str = String(str == null ? '' : str).replace(/\r\n?/g, '\n');
    for (var ch of str) {
      var c = ch.codePointAt(0);
      if (c === 9) { out += ' '; continue; }
      if (c === 10) { out += '\n'; continue; }
      if (SUBS[c]) { out += SUBS[c]; continue; }
      if ((c >= 32 && c < 127) || (c >= 0xA1 && c <= 0xFF)) { out += String.fromCharCode(c); continue; }
      if (CP1252[c]) { out += String.fromCharCode(CP1252[c]); continue; }
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

  // Serialize to PDF bytes.
  Doc.prototype.output = function () {
    var objs = [];
    function add(body) { objs.push(body); return objs.length; }
    var catalogId = add(null), pagesId = add(null);
    var fontIds = FONT_NAMES.map(function (name) {
      return add('<< /Type /Font /Subtype /Type1 /BaseFont /' + name + ' /Encoding /WinAnsiEncoding >>');
    });
    var fontDict = '<< ' + fontIds.map(function (id, i) { return '/F' + (i + 1) + ' ' + id + ' 0 R'; }).join(' ') + ' >>';
    var self = this, kids = [];
    this.pages.forEach(function (p) {
      var stream = p.ops.join('\n');
      var contentId = add('<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream');
      kids.push(add('<< /Type /Page /Parent ' + pagesId + ' 0 R /MediaBox [0 0 ' + self.width + ' ' + self.height +
        '] /Resources << /Font ' + fontDict + ' >> /Contents ' + contentId + ' 0 R >>'));
    });
    objs[catalogId - 1] = '<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>';
    objs[pagesId - 1] = '<< /Type /Pages /Kids [' + kids.map(function (k) { return k + ' 0 R'; }).join(' ') + '] /Count ' + kids.length + ' >>';
    var infoId = add('<< /Title (' + escapeText(encode(this.info.title || '')) + ') /Producer (' +
      escapeText(encode(this.info.producer || '')) + ') /CreationDate (' + pdfDate(new Date()) + ') >>');

    var out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
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
