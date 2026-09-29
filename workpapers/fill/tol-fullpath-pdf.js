/*
  tol-fullpath-pdf.js — The Objective Ledger (TOL-OS)
  The Full path package as PDFs, all made and read on this device:

    packagePdf(data)  One fillable PDF for a whole road: cover and how-to,
                      contents, who's on this road, every workpaper, the
                      CALC-01 inputs, optional self-notes and "Ready for your
                      report". Plain AcroForm text boxes, check boxes and
                      radio groups, no JavaScript inside, page numbers on
                      every page, and a hidden version field.
    reportPdf(model)  The comprehensive report (see TOLFullPath.report): cover, contents,
                      summary, findings with tables and bars, connections, data
                      checks, recommendations and plan, people, pillars, guide.
    readPdf(bytes)    Reads the boxes of a filled-in package back out, from
                      any PDF app's save (Acrobat, Preview, Chrome, pdf-lib),
                      including compressed object streams.

  Nothing is sent anywhere or stored.
*/
(function (global) {
  'use strict';

  var PDF = global.TOLPDF, FP = global.TOLFullPath;
  if (!PDF || !FP) return;

  var C = {
    ink: '#211D17', soft: '#5A5346', line: '#D9CBA3', brass: '#A8792F', head: '#F3ECD9',
    credit: '#3E6B4C', creditSoft: '#EAF1E9', box: '#FFFDF7', paper: '#FFFCF5', debit: '#96412B',
    pink: '#F7CAD4', rose: '#E88BA2', lav: '#EBDDF6', mint: '#CFE6D2', butter: '#F8E7AE', sky: '#D8E4F4', peach: '#F9D9B8'
  };
  var PASTELS = [C.pink, C.lav, C.mint, C.butter, C.sky, C.peach];
  var ROAD_COLOR = { self: C.butter, partners: C.pink, family: C.mint, coparents: C.sky, friends: C.lav, roommates: C.peach, coworkers: '#D6EEF0', caregivers: '#E3EEC9' };
  var L = 44, R = 568, W = R - L, TOP = 46, BOTTOM = 738;

  function enc(t) { return PDF.encode(t); }
  function wrap(t, f, s, w) { return PDF.wrap(t, f, s, w); }
  function tw(t, f, s) { return PDF.textWidth(enc(t), f, s); }
  function niceDate(d) { return (d || new Date()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }

  /* ------------------------------------------------------------ a page writer */

  function Lay(doc, running) { this.doc = doc; this.running = running || ''; this.y = TOP; }
  Lay.prototype.page = function (running) {
    if (running != null) this.running = running;
    this.doc.addPage();
    this.y = TOP;
    if (this.running) {
      this.doc.text(L, this.y + 4, enc(this.running), 'Helvetica', 7.5, C.soft);
      this.doc.line(L, this.y + 10, R, this.y + 10, C.line, 0.5);
      this.y += 22;
    }
  };
  Lay.prototype.room = function (h) { if (this.y + h > BOTTOM) { this.page(); return true; } return false; };
  Lay.prototype.para = function (text, o) {
    o = o || {};
    var font = o.font || 'Helvetica', size = o.size || 9.5, lh = size * 1.38, x = L + (o.indent || 0), self = this;
    wrap(text, font, size, (o.width || W) - (o.indent || 0)).forEach(function (ln) {
      self.room(lh);
      self.doc.text(x, self.y + size, ln, font, size, o.color || C.ink);
      self.y += lh;
    });
    this.y += o.after == null ? 5 : o.after;
  };
  Lay.prototype.kicker = function (text, color) {
    this.doc.text(L, this.y + 8, enc(text.toUpperCase()), 'Helvetica-Bold', 7.5, color || C.brass);
    this.y += 14;
  };
  Lay.prototype.h1 = function (text, sub) {
    var self = this;
    wrap(text, 'Times-Bold', 20, W).forEach(function (ln) { self.doc.text(L, self.y + 18, ln, 'Times-Bold', 20, C.ink); self.y += 24; });
    if (sub) { wrap(sub, 'Times-Italic', 11, W).forEach(function (ln) { self.doc.text(L, self.y + 10, ln, 'Times-Italic', 11, C.soft); self.y += 14; }); }
    this.doc.line(L, this.y + 3, R, this.y + 3, C.brass, 1.1);
    this.y += 12;
  };
  Lay.prototype.h2 = function (text, keep, color) {
    this.room(24 + (keep || 30));
    this.y += 5;
    this.doc.heart(L + 5, this.y + 7.5, 9, color || C.pink);
    var self = this;
    wrap(text, 'Times-Bold', 12.5, W - 18).forEach(function (ln, i) { self.doc.text(L + 16, self.y + 12, ln, 'Times-Bold', 12.5, C.ink); if (i) self.y += 15; });
    this.y += 20;
  };
  Lay.prototype.label = function (text, x, w, color) {
    var self = this, lines = wrap(text, 'Helvetica-Bold', 7.6, w);
    lines.forEach(function (ln) { self.doc.text(x, self.y + 8, ln, 'Helvetica-Bold', 7.6, color || C.soft); self.y += 9.6; });
    return lines.length;
  };
  Lay.prototype.bullets = function (items, o) {
    o = o || {};
    var self = this, size = o.size || 9.5, lh = size * 1.36;
    items.forEach(function (t) {
      var lines = wrap(t, o.font || 'Helvetica', size, W - 26);
      self.room(Math.min(lines.length, 3) * lh + 3);
      self.doc.circle(L + 9, self.y + size * 0.62, 2.2, o.dot || C.brass);
      lines.forEach(function (ln) { self.room(lh); self.doc.text(L + 18, self.y + size, ln, o.font || 'Helvetica', size, o.color || C.ink); self.y += lh; });
      self.y += 3;
    });
    this.y += 3;
  };
  // A soft box with a title and lines; measured first so it can keep together.
  Lay.prototype.callout = function (title, lines, fill, o) {
    o = o || {};
    var self = this, size = o.size || 9, lh = size * 1.36;
    var body = []; (lines || []).forEach(function (t) { body = body.concat(wrap(t, o.font || 'Helvetica', size, W - 28)); body.push(null); });
    if (body.length) body.pop();
    var h = (title ? 18 : 6) + body.reduce(function (a, b) { return a + (b == null ? 4 : lh); }, 0) + 10;
    if (h < BOTTOM - TOP - 40) this.room(h + 4);
    this.doc.roundRect(L, this.y, W, Math.min(h, BOTTOM - this.y), 9, fill || C.creditSoft);
    var y = this.y + (title ? 15 : 6);
    if (title) this.doc.text(L + 12, y, enc(title), 'Helvetica-Bold', 9, o.titleColor || C.credit);
    y += title ? 5 : 0;
    body.forEach(function (ln) {
      if (ln == null) { y += 4; return; }
      if (y + lh > BOTTOM) { self.page(); y = self.y + 4; }
      self.doc.text(L + 12, y + size, ln, o.font || 'Helvetica', size, o.color || C.ink); y += lh;
    });
    this.y = y + 12;
  };

  function footers(doc, left, fine) {
    var n = doc.pages.length;
    for (var i = 0; i < n; i++) {
      doc.setPage(i);
      doc.line(L, 750, R, 750, C.line, 0.5);
      doc.text(L, 760, enc(left), 'Helvetica', 6.8, C.soft);
      doc.text(L, 769, enc(fine), 'Helvetica', 6.8, C.soft);
      var pg = enc('Page ' + (i + 1) + ' of ' + n);
      doc.text(R - PDF.textWidth(pg, 'Helvetica-Bold', 7.5), 764, pg, 'Helvetica-Bold', 7.5, C.ink);
    }
  }

  function sprinkle(doc, seed) {
    var s = seed || 1;
    function rnd() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    for (var i = 0; i < 12; i++) {
      var x = rnd() < 0.5 ? 12 + rnd() * 24 : R + 8 + rnd() * 26, y = 60 + rnd() * 660;
      var col = PASTELS[Math.floor(rnd() * PASTELS.length)], size = 5 + rnd() * 10;
      if (rnd() < 0.35) doc.heart(x, y, size * 1.3, col);
      else { doc.circle(x, y, size, null, col, 1.1); doc.circle(x - size * 0.35, y - size * 0.35, size * 0.18, '#FFFFFF'); }
    }
  }

  /* ------------------------------------------------------------ form controls */

  function exportOf(fl, label) {
    var hit = fl.options.filter(function (o) { return o.label === label; })[0];
    return hit ? hit.v : '';
  }
  function tip(fl, page) { return (page && page.code && /^WP|CALC/.test(page.code) ? page.code + ': ' : '') + fl.label; }

  // A text box, drawn on the page (so paper copies show it) with a field over it.
  function textBox(lay, x, y, w, h, fl, value, page, o) {
    o = o || {};
    lay.doc.roundRect(x, y, w, h, 3, C.box, C.line, 0.6);
    lay.doc.field({ name: fl.name, kind: 'text', x: x + 0.5, y: y + 0.5, w: w - 1, h: h - 1, value: value == null ? '' : String(value), multiline: fl.type === 'textarea', size: o.size || (fl.type === 'textarea' ? 9 : 9), tip: tip(fl, page) });
  }
  function checkBox(lay, x, y, s, fl, value, page) {
    lay.doc.roundRect(x, y, s, s, 2, '#FFFFFF', C.brass, 0.7);
    lay.doc.field({ name: fl.name, kind: 'check', x: x + 0.5, y: y + 0.5, w: s - 1, h: s - 1, value: value === true, tip: tip(fl, page) });
  }
  var RS = 11; // radio button size
  function radioLayout(fl, w, size, useShort) {
    var items = fl.options.map(function (o) { var t = useShort ? o.short : o.label; return { o: o, t: t, w: RS + 3 + tw(t, 'Helvetica', size) + (useShort ? 6 : 9) }; });
    var total = items.reduce(function (a, b) { return a + b.w; }, 0);
    if (!fl.stack && total <= w) return { lines: [items], h: RS + 2 };
    if (fl.stack) return { lines: items.map(function (i) { return [i]; }), h: items.length * (RS + 4) };
    var lines = [[]], cur = 0;
    items.forEach(function (it) { if (cur + it.w > w && lines[lines.length - 1].length) { lines.push([]); cur = 0; } lines[lines.length - 1].push(it); cur += it.w; });
    return { lines: lines, h: lines.length * (RS + 4) - 2 };
  }
  function radioGroup(lay, x, y, w, fl, value, page, o) {
    o = o || {};
    var size = o.size || 8, lay2 = radioLayout(fl, w, size, o.short), opts = [];
    lay2.lines.forEach(function (line, li) {
      var cx = x, cy = y + li * (RS + 4);
      line.forEach(function (it) {
        lay.doc.circle(cx + RS / 2, cy + RS / 2, RS / 2 - 0.5, '#FFFFFF', C.brass, 0.7);
        opts.push({ v: it.o.v, x: cx, y: cy, w: RS, h: RS });
        lay.doc.text(cx + RS + 3, cy + RS / 2 + size * 0.36, enc(it.t), 'Helvetica', size, C.ink);
        cx += it.w;
      });
    });
    lay.doc.field({ name: fl.name, kind: 'radio', value: exportOf(fl, value), options: opts, tip: tip(fl, page) });
    return lay2.h;
  }

  function fieldHeight(fl, w) {
    var lab = wrap(fl.label, 'Helvetica-Bold', 7.6, w).length * 9.6 + 3;
    if (fl.type === 'check') return 16;
    if (fl.type === 'radio') return lab + radioLayout(fl, w, 8.5).h + 8;
    if (fl.type === 'textarea') return lab + (fl.small ? 40 : 58) + 8;
    return lab + 20 + 8;
  }

  // One field with its label, at the pen's y, in a column of width w starting at x.
  function drawField(lay, fl, value, x, w, page) {
    if (fl.type === 'check') {
      checkBox(lay, x, lay.y + 1, 11, fl, value, page);
      var lines = wrap(fl.label, 'Helvetica', 8.8, w - 18);
      lines.forEach(function (ln, k) { lay.doc.text(x + 17, lay.y + 9.5 + k * 11, ln, 'Helvetica', 8.8, C.ink); });
      return Math.max(16, lines.length * 11 + 5);
    }
    var y0 = lay.y;
    var label = fl.label + (fl.type === 'date' ? ' (YYYY-MM-DD)' : '') + (fl.type === 'number' && fl.max === 1 ? '' : '');
    lay.label(label.toUpperCase().length > 60 ? label : label.toUpperCase(), x, w);
    lay.y += 2;
    var h;
    if (fl.type === 'radio') h = radioGroup(lay, x, lay.y, w, fl, value, page, { size: 8.5 });
    else { h = fl.type === 'textarea' ? (fl.small ? 40 : 58) : 20; textBox(lay, x, lay.y, w, h, fl, value, page); }
    var total = lay.y + h - y0 + 8;
    lay.y = y0;
    return total;
  }

  /* ------------------------------------------------------------ package blocks */

  function blockFields(lay, b, data, page) {
    if (b.title) lay.h2(b.title, 40, C.lav);
    if (b.intro) lay.para(b.intro, { size: 8.5, color: C.soft, after: 6 });
    var fl = b.fields, i = 0;
    while (i < fl.length) {
      var per = fl[i].third ? 3 : fl[i].half ? 2 : 1, row = [fl[i]];
      while (row.length < per && fl[i + row.length] && (fl[i + row.length].half || fl[i + row.length].third)) row.push(fl[i + row.length]);
      var gap = 14, cw = (W - gap * (per - 1)) / per;
      var need = Math.max.apply(null, row.map(function (f) { return fieldHeight(f, cw); }));
      lay.room(need);
      var hs = row.map(function (f, k) { return drawField(lay, f, data.values[f.name], L + k * (cw + gap), cw, page); });
      lay.y += Math.max.apply(null, hs);
      i += row.length;
    }
  }

  function blockGrid(lay, b, data, page) {
    var first = b.rows[0], cols = first.fields, labels = !!b.rowLabels;
    var ws = cols.map(function (c) { return c.w || 1; }), labW = labels ? 1.3 : 0;
    var tot = ws.reduce(function (a, c) { return a + c; }, 0) + labW, unit = W / tot;
    var widths = ws.map(function (c) { return c * unit; }), lw = labW * unit;
    var size = b.small ? 7.6 : 8.2;
    var heads = cols.map(function (c, i) { return wrap(c.label, 'Helvetica-Bold', 6.9, widths[i] - 5); });
    var headH = Math.max.apply(null, heads.map(function (h) { return h.length; })) * 8.2 + 7;
    var rowHs = b.rows.map(function (r) {
      var h = b.small ? 17 : 19;
      r.fields.forEach(function (c, i) { if (c.type === 'radio') h = Math.max(h, radioLayout(c, widths[i] - 6, 7.2, true).h + 6); });
      return h;
    });
    var introLines = b.intro ? wrap(b.intro, 'Helvetica', 8.3, W).length * 11.5 + 6 : 0;
    lay.h2(b.title, introLines + headH + rowHs[0] * 2, C.mint);
    if (b.intro) lay.para(b.intro, { size: 8.3, color: C.soft, after: 6 });
    function head() {
      lay.doc.rect(L, lay.y, W, headH, C.head);
      var x = L + lw;
      heads.forEach(function (lines, i) {
        lines.forEach(function (ln, k) { lay.doc.text(x + 2.5, lay.y + 9 + k * 8.2, ln, 'Helvetica-Bold', 6.9, C.soft); });
        x += widths[i];
      });
      lay.y += headH + 3;
    }
    head();
    b.rows.forEach(function (r, ri) {
      if (lay.room(rowHs[ri] + 3)) head();
      var x = L;
      if (labels) {
        wrap(r.label || '', 'Helvetica-Bold', 8.5, lw - 6).slice(0, 2).forEach(function (ln, k) { lay.doc.text(x + 2, lay.y + 12 + k * 9.5, ln, 'Helvetica-Bold', 8.5, C.ink); });
        x += lw;
      }
      r.fields.forEach(function (c, ci) {
        var w = widths[ci] - 3, v = data.values[c.name];
        if (c.type === 'check') { var s = 12; checkBox(lay, x + (w - s) / 2, lay.y + (rowHs[ri] - s) / 2, s, c, v, page); }
        else if (c.type === 'radio') { lay.doc.roundRect(x, lay.y, w, rowHs[ri], 3, '#FFFFFF', C.line, 0.4); radioGroup(lay, x + 3, lay.y + 3, w - 6, c, v, page, { size: 7.2, short: true }); }
        else textBox(lay, x, lay.y, w, rowHs[ri], c, v, page, { size: size });
        x += widths[ci];
      });
      lay.y += rowHs[ri] + 3;
    });
    lay.y += 6;
  }

  function cardRows(card) {
    var rows = [], i = 0;
    while (i < card.fields.length) {
      var f0 = card.fields[i], row = [f0];
      if (f0.half && card.fields[i + 1] && card.fields[i + 1].half) row.push(card.fields[i + 1]);
      rows.push(row); i += row.length;
    }
    return rows;
  }
  function cardNeed(card) {
    var inner = W - 16, need = 18;
    cardRows(card).forEach(function (row) { need += Math.max.apply(null, row.map(function (f) { return fieldHeight(f, row.length > 1 ? (inner - 12) / 2 : inner); })); });
    return need;
  }
  function blockCards(lay, b, data, page) {
    var introH = b.intro ? wrap(b.intro, 'Helvetica', 8.3, W).length * 11.5 + 6 : 0;
    lay.h2(b.title, introH + Math.min(cardNeed(b.rows[0]), 420), C.butter);
    if (b.intro) lay.para(b.intro, { size: 8.3, color: C.soft, after: 6 });
    b.rows.forEach(function (card) {
      var inner = W - 16, need = cardNeed(card), rows = cardRows(card);
      lay.room(Math.min(need, 420));
      var top = lay.y;
      lay.doc.text(L + 12, lay.y + 9, enc(card.label || ''), 'Helvetica-Bold', 8.8, C.credit);
      lay.y += 15;
      rows.forEach(function (row) {
        var cw = row.length > 1 ? (inner - 12) / 2 : inner;
        var need2 = Math.max.apply(null, row.map(function (f) { return fieldHeight(f, cw); }));
        if (lay.room(need2)) top = lay.y;
        var hs = row.map(function (f, k) { return drawField(lay, f, data.values[f.name], L + 12 + k * (cw + 12), cw, page); });
        lay.y += Math.max.apply(null, hs);
      });
      lay.doc.line(L + 3, top + 2, L + 3, lay.y - 6, C.brass, 1.4);
      lay.y += 6;
    });
  }

  function blockScale(lay, b, data, page) {
    var date = b.fields.filter(function (f) { return f.type === 'date'; })[0];
    var qs = b.fields.filter(function (f) { return f.type === 'radio'; });
    var rest = b.fields.filter(function (f) { return f.type !== 'radio' && f.type !== 'date'; });
    lay.room(Math.min(52 + qs.length * 20 + rest.reduce(function (a, f) { return a + fieldHeight(f, W); }, 0), BOTTOM - TOP - 30));
    lay.y += 4;
    lay.doc.roundRect(L, lay.y, W, 22, 8, PASTELS[(b.person || 0) % PASTELS.length]);
    lay.doc.text(L + 10, lay.y + 15, enc(b.title), 'Times-Bold', 12, C.ink);
    if (date) {
      lay.doc.text(R - 196, lay.y + 14, enc('DATE (YYYY-MM-DD)'), 'Helvetica-Bold', 6.8, C.soft);
      textBox(lay, R - 118, lay.y + 3, 112, 16, date, data.values[date.name], page, { size: 8.5 });
    }
    lay.y += 28;
    var scW = 5 * (RS + 3 + tw('0', 'Helvetica', 8.5) + 9);
    lay.doc.text(R - scW, lay.y + 7, enc('0 = not at all   4 = very true'), 'Helvetica', 6.8, C.soft);
    lay.y += 10;
    qs.forEach(function (q) {
      var lines = wrap(q.label, 'Helvetica', 9, W - scW - 16), h = Math.max(lines.length * 11.5 + 6, 19);
      lay.room(h);
      lines.forEach(function (ln, k) { lay.doc.text(L + 4, lay.y + 10 + k * 11.5, ln, 'Helvetica', 9, C.ink); });
      radioGroup(lay, R - scW, lay.y + 2, scW, q, data.values[q.name], page, { size: 8.5 });
      lay.doc.line(L, lay.y + h - 2, R, lay.y + h - 2, C.line, 0.35);
      lay.y += h;
    });
    lay.y += 4;
    rest.forEach(function (f) {
      var h = fieldHeight(f, W);
      lay.room(h);
      lay.y += drawField(lay, f, data.values[f.name], L, W, page);
    });
    lay.y += 4;
  }

  function blockChecks(lay, b, data, page) {
    lay.h2(b.title, 80, C.sky);
    if (b.intro) lay.para(b.intro, { size: 8.3, color: C.soft, after: 4 });
    b.groups.forEach(function (g) {
      var checks = g.fields.filter(function (f) { return f.type === 'check'; }), own = g.fields.filter(function (f) { return f.type !== 'check'; })[0];
      // lay the ticks out in rows
      var items = checks.map(function (f) { return { f: f, w: 14 + tw(f.label, 'Helvetica', 8.2) + 12 }; }), rows = [[]], cur = 0;
      items.forEach(function (it) { if (cur + it.w > W && rows[rows.length - 1].length) { rows.push([]); cur = 0; } rows[rows.length - 1].push(it); cur += it.w; });
      lay.room(14 + rows.length * 16 + 26);
      lay.doc.text(L, lay.y + 9, enc(g.label), 'Helvetica-Bold', 8.8, C.ink);
      lay.y += 14;
      rows.forEach(function (row) {
        var x = L;
        row.forEach(function (it) {
          checkBox(lay, x, lay.y + 1, 10, it.f, data.values[it.f.name], page);
          lay.doc.text(x + 14, lay.y + 9, enc(it.f.label), 'Helvetica', 8.2, C.ink);
          x += it.w;
        });
        lay.y += 15;
      });
      if (own) {
        lay.doc.text(L, lay.y + 11, enc('In my own words:'), 'Helvetica', 7.8, C.soft);
        textBox(lay, L + 72, lay.y + 1, W - 72, 16, own, data.values[own.name], page, { size: 8.5 });
        lay.y += 22;
      }
      lay.y += 3;
    });
  }

  function blockDerived(lay, b) {
    lay.callout(b.title || 'Worked out for you', b.lines, C.creditSoft, { size: 8.5 });
  }
  function blockSteps(lay, b) {
    lay.h2('How to bring it back', 60, C.butter);
    b.lines.forEach(function (t, i) {
      var lines = wrap(t, 'Helvetica', 9.2, W - 30);
      lay.room(lines.length * 12.5 + 6);
      lay.doc.circle(L + 9, lay.y + 7, 8, C.butter, C.brass, 0.6);
      lay.doc.text(L + 9 - tw(String(i + 1), 'Helvetica-Bold', 8.5) / 2, lay.y + 10, enc(String(i + 1)), 'Helvetica-Bold', 8.5, C.ink);
      lines.forEach(function (ln, k) { lay.doc.text(L + 24, lay.y + 10 + k * 12.5, ln, 'Helvetica', 9.2, C.ink); });
      lay.y += lines.length * 12.5 + 8;
    });
  }

  /* ------------------------------------------------------------ the package */

  function packagePdf(data) {
    var reg = FP.regOf(data), road = FP.ROADS[data.road];
    var doc = new PDF.Doc({ title: 'Full path package: ' + road.label, producer: 'The Objective Ledger (TOL-OS) Full path package ' + FP.VERSION + ', made on this device', subject: 'tol-fullpath road=' + data.road + ' people=' + data.people });
    var lay = new Lay(doc), toc = [];
    var roadName = road.label;

    // 1. Cover and how to use it
    lay.page('');
    doc.rect(0, 0, 612, 792, C.paper);
    sprinkle(doc, 5);
    doc.roundRect(L, 50, W, 118, 18, ROAD_COLOR[data.road] || C.pink);
    doc.heart(R - 42, 86, 32, '#FFFFFF');
    doc.text(L + 20, 78, enc('THE OBJECTIVE LEDGER  ·  FULL PATH PACKAGE  ·  VERSION ' + FP.VERSION), 'Helvetica-Bold', 7.8, C.ink);
    doc.text(L + 20, 112, enc('My full path: ' + roadName), 'Times-Bold', 24, C.ink);
    wrap(road.solo ? 'Every page for understanding yourself, in one place: your battery, your calm-down kit, how words reach you, and kind ways to say no.'
      : 'Every workpaper for this road, in one place, plus the CALC-01 inputs and a page to get ready for your report.', 'Times-Italic', 11, W - 110).slice(0, 3).forEach(function (ln, k) { doc.text(L + 20, 134 + k * 13.5, ln, 'Times-Italic', 11, C.ink); });
    var names = FP.namesOf(data).filter(Boolean);
    doc.text(L, 190, enc((names.length ? 'For ' + (names.length > 1 ? names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1] : names[0]) + '  ·  ' : '') + (road.solo ? 'Just me' : data.people + ' people') + '  ·  made ' + niceDate()), 'Helvetica', 9.5, C.soft);
    lay.y = 210;
    lay.h2('How to use this package', 120, C.butter);
    lay.bullets([
      'Tap any box to type, in Adobe Acrobat Reader, Apple Preview or Files, Chrome, Edge or another PDF app. Round buttons pick one answer; square boxes are ticks. Or print it and write by hand.',
      'Go in order, or start anywhere. Each page says what it is for. Blank pages are fine: the report says "not filled in" rather than guessing.',
      road.solo ? 'Everything is about you, written by you.' : 'Wherever a page asks "who", write a name from page 3, an initial, or "Everyone". Pages about one person (the battery, the pause line) are filled in by that person, about themselves.',
      'When you’re done, save the PDF and bring it back to the Workpaper Suite on the website. It reads your answers on your own device, shows you what it found, lets you fix anything, and makes your report.'
    ], { size: 9.2 });
    lay.callout('Private by design', ['Nothing you type in this PDF is sent anywhere. The website reads it in your browser, on your device, and never uploads it. Keep the file somewhere private, like any personal notes.'], C.creditSoft, { size: 9 });
    lay.callout('A fair read, never a verdict', [road.solo ? 'These pages describe your conditions and your setup, never your worth. They are not a diagnosis and not a health tool.' : 'These pages describe the setup between you, never any one person. They are not a diagnosis, not a health tool, and never evidence or a performance record.'], C.lav, { size: 9, titleColor: C.ink });
    // hidden fields: which package this is
    doc.field({ name: reg.meta.version, kind: 'text', value: FP.VERSION, x: 1, y: 1, w: 1, h: 1, hidden: true });
    doc.field({ name: reg.meta.road, kind: 'text', value: data.road, x: 2, y: 1, w: 1, h: 1, hidden: true });
    doc.field({ name: reg.meta.people, kind: 'text', value: String(data.people), x: 3, y: 1, w: 1, h: 1, hidden: true });
    doc.field({ name: reg.meta.kind, kind: 'text', value: 'fullpath', x: 4, y: 1, w: 1, h: 1, hidden: true });
    doc.marks = [{ title: 'Cover and how to use it', level: 0, page: 0 }];

    // 2. Contents (drawn once every page number is known)
    lay.page('Full path package  ·  ' + roadName + '  ·  Contents');
    var tocPage = doc.pages.length - 1;
    doc.marks.push({ title: 'Contents', level: 0, page: tocPage });

    // 3. The pages
    reg.pages.forEach(function (p, pi) {
      var running = 'Full path package  ·  ' + roadName + '  ·  ' + (p.code && /^WP|CALC/.test(p.code) ? p.code + '  ' : '') + (p.name || p.title);
      lay.page(running);
      toc.push({ p: p, page: doc.pages.length - 1 });
      doc.marks.push({ title: (p.code && /^WP|CALC/.test(p.code) ? p.code + ' ' : '') + (p.name || p.title), level: 0, page: doc.pages.length - 1 });
      lay.kicker('Section ' + (pi + 1) + ' of ' + reg.pages.length + (p.code && /^WP|CALC/.test(p.code) ? '  ·  ' + p.code : ''));
      lay.h1(p.name && p.name !== p.title ? p.name : p.title, p.name && p.name !== p.title ? p.title : null);
      if (p.why) lay.para(p.why, { font: 'Times-Italic', size: 10.5, color: C.credit, after: 4 });
      if (p.intro) lay.para(p.intro, { size: 9, color: C.soft, after: 6 });
      p.blocks.forEach(function (b) {
        if (b.kind === 'note') lay.para(b.text, { font: 'Times-Italic', size: 9.5, color: C.soft, after: 6 });
        else if (b.kind === 'fields') blockFields(lay, b, data, p);
        else if (b.kind === 'grid') blockGrid(lay, b, data, p);
        else if (b.kind === 'cards') blockCards(lay, b, data, p);
        else if (b.kind === 'scale') blockScale(lay, b, data, p);
        else if (b.kind === 'checks') blockChecks(lay, b, data, p);
        else if (b.kind === 'derived') blockDerived(lay, b);
        else if (b.kind === 'steps') blockSteps(lay, b);
      });
      if (p.id === 'ready') {
        lay.y += 6;
        lay.callout('You made it', [road.solo ? 'Whatever you filled in is enough to start. Be as kind to yourself reading it as you would be to a friend.' : 'Whatever you filled in is enough to start one conversation. One topic per sitting is plenty.'], C.butter, { font: 'Times-Italic', size: 10, titleColor: C.ink });
      }
    });

    // Contents, now that every section has a page
    doc.setPage(tocPage);
    var y = TOP + 22;
    doc.text(L, y + 18, enc('Contents'), 'Times-Bold', 20, C.ink);
    y += 32;
    doc.text(L, y + 6, enc('Tap a line to jump to it. Page numbers are at the bottom right of every page.'), 'Helvetica', 8.5, C.soft);
    y += 20;
    [{ t: 'Cover and how to use it', page: 0 }, { t: 'Contents', page: tocPage }].concat(toc.map(function (e) {
      return { t: (e.p.code && /^WP|CALC/.test(e.p.code) ? e.p.code + '   ' : '') + (e.p.name || e.p.title) + (e.p.name && e.p.name !== e.p.title ? '  (' + e.p.title + ')' : ''), page: e.page, sub: e.p.why };
    })).forEach(function (e, i) {
      var num = String(e.page + 1), label = wrap(e.t, 'Helvetica-Bold', 10, W - 60)[0];
      doc.circle(L + 6, y + 6, 4, PASTELS[i % PASTELS.length]);
      doc.text(L + 16, y + 10, label, 'Helvetica-Bold', 10, C.ink);
      var lx = L + 16 + PDF.textWidth(label, 'Helvetica-Bold', 10) + 6, rx = R - PDF.textWidth(enc(num), 'Helvetica-Bold', 10) - 6;
      if (rx > lx) doc.line(lx, y + 9, rx, y + 9, C.line, 0.5);
      doc.text(R - PDF.textWidth(enc(num), 'Helvetica-Bold', 10), y + 10, enc(num), 'Helvetica-Bold', 10, C.ink);
      doc.link(L, y - 2, W, 16, e.page, 0);
      y += 16;
      if (e.sub) { wrap(e.sub, 'Times-Italic', 8.8, W - 70).slice(0, 2).forEach(function (ln) { doc.text(L + 16, y + 7, ln, 'Times-Italic', 8.8, C.soft); y += 10.5; }); }
      y += 6;
    });
    footers(doc, 'The Objective Ledger  ·  Full path package  ·  ' + roadName + '  ·  version ' + FP.VERSION,
      'Made on your device; nothing you type is sent anywhere. A self-reflection worksheet, not a clinical tool. It describes the setup, never a person.');
    return doc.output();
  }

  /* ------------------------------------------------------------ the report */

  var TONE = { good: C.mint, drift: C.butter, low: C.lav, none: C.head };
  var BAR = ['#E88BA2', '#B49AD6', '#7FB98A', '#E9C95E', '#8EAEDB', '#EBA56B'];

  function tiles(lay, list) {
    var cols = 3, gap = 10, w = (W - gap * (cols - 1)) / cols;
    for (var i = 0; i < list.length; i += cols) {
      var row = list.slice(i, i + cols);
      var hs = row.map(function (t) {
        var band = wrap(t.band || '', 'Helvetica', 7.8, w - 16).slice(0, 4), note = t.note ? wrap(t.note, 'Times-Italic', 7.4, w - 16).slice(0, 3) : [];
        // Tile values are words now, so they may take two lines at the smaller size.
        var vs = tw(t.v, 'Helvetica-Bold', 16) > w - 16 ? 12 : 16, vl = wrap(t.v, 'Helvetica-Bold', vs, w - 16).slice(0, 2);
        return { band: band, note: note, vs: vs, vl: vl, h: 20 + vs + (vl.length - 1) * (vs + 3) + 6 + band.length * 10 + note.length * 9 + 8 };
      });
      var h = Math.max.apply(null, hs.map(function (x) { return x.h; }));
      lay.room(h + 8);
      row.forEach(function (t, k) {
        var x = L + k * (w + gap), m = hs[k];
        lay.doc.roundRect(x, lay.y, w, h, 10, TONE[t.tone] || C.head);
        lay.doc.text(x + 8, lay.y + 13, wrap(t.k.toUpperCase(), 'Helvetica-Bold', 6.8, w - 16)[0], 'Helvetica-Bold', 6.8, C.soft);
        m.vl.forEach(function (ln, j) { lay.doc.text(x + 8, lay.y + 18 + m.vs + j * (m.vs + 3), ln, 'Helvetica-Bold', m.vs, C.ink); });
        var yy = lay.y + 24 + m.vs + (m.vl.length - 1) * (m.vs + 3) + 6;
        m.band.forEach(function (ln) { lay.doc.text(x + 8, yy, ln, 'Helvetica', 7.8, C.ink); yy += 10; });
        m.note.forEach(function (ln) { lay.doc.text(x + 8, yy, ln, 'Times-Italic', 7.4, C.soft); yy += 9; });
      });
      lay.y += h + gap;
    }
  }
  function kv(lay, rows, o) {
    o = o || {};
    var kw = o.kw || 150, cols3 = rows.some(function (r) { return r.length > 2; });
    rows.forEach(function (r) {
      var k = wrap(r[0], 'Helvetica-Bold', 8.6, kw - 8), v = wrap(r[1] || '', 'Helvetica', 8.8, cols3 ? (W - kw) * 0.45 : W - kw), n = cols3 ? wrap(r[2] || '', 'Times-Italic', 8.4, (W - kw) * 0.55 - 8) : [];
      var lines = Math.max(k.length, v.length, n.length);
      // a long answer breaks across pages line by line rather than running off the bottom
      for (var i = 0; i < lines; i++) {
        if (lay.room(11.2 + (i === lines - 1 ? 5 : 0)) && i === 0) { /* started on a new page */ }
        if (k[i]) lay.doc.text(L, lay.y + 9, k[i], 'Helvetica-Bold', 8.6, C.soft);
        if (v[i]) lay.doc.text(L + kw, lay.y + 9, v[i], 'Helvetica', 8.8, C.ink);
        if (n[i]) lay.doc.text(L + kw + (W - kw) * 0.45 + 8, lay.y + 9, n[i], 'Times-Italic', 8.4, C.soft);
        lay.y += 11.2;
      }
      lay.y += 5;
      lay.doc.line(L, lay.y - 2, R, lay.y - 2, C.line, 0.3);
    });
    lay.y += 6;
  }
  function sub(lay, t, color) {
    lay.room(48);
    lay.doc.text(L, lay.y + 9, wrap(t.toUpperCase(), 'Helvetica-Bold', 7.4, W)[0], 'Helvetica-Bold', 7.4, color || C.credit);
    lay.y += 14;
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function siteLink(l) { return l ? l[0] + ' (spreadloveandacceptance.com' + l[1] + ')' : ''; }

  // A table with a header row, wrapped cells and a repeated header after a page break.
  function table(lay, t) {
    var size = 8.1, lh = size * 1.3, pad = 4;
    var ws = t.widths || t.head.map(function () { return 1; }), tot = ws.reduce(function (a, b) { return a + b; }, 0);
    var cw = ws.map(function (w) { return w / tot * W; });
    var headL = t.head.map(function (h, i) { return wrap(h, 'Helvetica-Bold', 7.4, cw[i] - pad * 2); });
    var headH = Math.max.apply(null, headL.map(function (l) { return l.length; })) * 9.4 + pad * 2;
    var rowsL = t.rows.map(function (r) { return r.map(function (cell, i) { return wrap(String(cell == null ? '' : cell), 'Helvetica', size, cw[i] - pad * 2).slice(0, 30); }); });
    var rowH = rowsL.map(function (r) { return Math.max.apply(null, [1].concat(r.map(function (l) { return l.length; }))) * lh + pad * 2 - 1; });
    if (t.title) { lay.room(16 + headH + (rowH[0] || 0) + 4); sub(lay, t.title, C.brass); }
    function head() {
      lay.doc.rect(L, lay.y, W, headH, C.head);
      var x = L;
      headL.forEach(function (lines, i) { lines.forEach(function (ln, k) { lay.doc.text(x + pad, lay.y + pad + 7 + k * 9.4, ln, 'Helvetica-Bold', 7.4, C.soft); }); x += cw[i]; });
      lay.y += headH;
    }
    lay.room(headH + (rowH[0] || 0));
    head();
    rowsL.forEach(function (r, ri) {
      if (lay.room(rowH[ri])) head();
      if (ri % 2) lay.doc.rect(L, lay.y, W, rowH[ri], '#FBF7EC');
      var x = L;
      r.forEach(function (lines, i) {
        lines.forEach(function (ln, k) { lay.doc.text(x + pad, lay.y + pad + size + k * lh - 1, ln, i === 0 ? 'Helvetica-Bold' : 'Helvetica', size, C.ink); });
        x += cw[i];
      });
      lay.y += rowH[ri];
      lay.doc.line(L, lay.y, R, lay.y, C.line, 0.3);
    });
    lay.y += 4;
    if (t.note) lay.para(t.note, { size: 7.8, color: C.soft, font: 'Times-Italic', after: 4 });
    lay.y += 4;
  }

  // Small horizontal bars: a label, a track with a filled part, and the value in words.
  function barChart(lay, b) {
    var labW = 112, valW = 132, tx = L + labW + 8, tWidth = W - labW - valW - 16;
    lay.room(16 + 18 * Math.min(b.items.length, 3));
    sub(lay, b.title, C.brass);
    b.items.forEach(function (it, i) {
      var ll = wrap(it.label, 'Helvetica-Bold', 8.2, labW).slice(0, 2), vl = wrap(it.text, 'Helvetica', 8, valW).slice(0, 2);
      var h = Math.max(ll.length, vl.length, 1) * 10 + 5;
      lay.room(h);
      ll.forEach(function (ln, k) { lay.doc.text(L, lay.y + 9 + k * 10, ln, 'Helvetica-Bold', 8.2, C.ink); });
      lay.doc.roundRect(tx, lay.y + 2, tWidth, 9, 4, C.head);
      var frac = it.max > 0 ? Math.max(0, Math.min(1, it.value / it.max)) : 0;
      if (frac > 0) lay.doc.roundRect(tx, lay.y + 2, Math.max(6, tWidth * frac), 9, 4, BAR[i % BAR.length]);
      vl.forEach(function (ln, k) { lay.doc.text(tx + tWidth + 8, lay.y + 9 + k * 10, ln, 'Helvetica', 8, C.ink); });
      lay.y += h;
    });
    if (b.note) lay.para(b.note, { size: 7.8, color: C.soft, font: 'Times-Italic', after: 4 });
    lay.y += 6;
  }

  // A small labelled block used for insights, recommendations and people.
  function labelled(lay, rows, o) {
    o = o || {};
    var kw = o.kw || 104, size = o.size || 8.9, lh = size * 1.34;
    rows.forEach(function (r) {
      if (!r[1]) return;
      var k = wrap(r[0], 'Helvetica-Bold', 7.8, kw - 8), v = wrap(r[1], r[2] || 'Helvetica', size, W - kw - (o.indent || 0));
      var lines = Math.max(k.length, v.length);
      for (var i = 0; i < lines; i++) {
        lay.room(lh);
        if (k[i]) lay.doc.text(L + (o.indent || 0), lay.y + size, k[i], 'Helvetica-Bold', 7.8, C.soft);
        if (v[i]) lay.doc.text(L + (o.indent || 0) + kw, lay.y + size, v[i], r[2] || 'Helvetica', size, C.ink);
        lay.y += lh;
      }
      lay.y += 3;
    });
  }
  function itemHead(lay, title, tag, color, need) {
    var lines = wrap(title, 'Helvetica-Bold', 10, W - 20);
    lay.room(lines.length * 13 + 14 + (need || 40));
    lay.doc.circle(L + 5, lay.y + 7, 4.2, color || C.pink);
    lines.forEach(function (ln) { lay.doc.text(L + 14, lay.y + 10, ln, 'Helvetica-Bold', 10, C.ink); lay.y += 13; });
    if (tag) { lay.doc.text(L + 14, lay.y + 7, wrap(tag, 'Helvetica', 7.6, W - 20)[0], 'Helvetica', 7.6, C.brass); lay.y += 12; }
    lay.y += 2;
  }

  // One section of detailed findings, the same shape for every workpaper and page.
  function detail(lay, s, m) {
    lay.kicker(s.code + (s.status === 'blank' ? '  ·  not filled in' : ''));
    lay.h1(s.name, s.title);
    sub(lay, 'What was entered');
    if (s.entered.length) kv(lay, s.entered, { kw: 160 });
    else lay.para('Not filled in. Nothing here is guessed.', { color: C.soft, font: 'Times-Italic' });
    (s.bars || []).forEach(function (b) { barChart(lay, b); });
    (s.tables || []).forEach(function (t) { table(lay, t); });
    var shows = (s.shows || []).concat(s.more || []);
    if (shows.length) { sub(lay, 'What it shows'); lay.bullets(shows, { size: 9.1 }); }
    if (s.suggests && s.suggests.length) { sub(lay, 'What it suggests'); lay.bullets(s.suggests, { size: 9.1, dot: C.credit }); }
    sub(lay, 'What it can’t tell you', C.soft);
    lay.para(s.doesnt, { size: 9, color: C.soft, font: 'Times-Italic' });
    if (s.card) lay.callout('A note you could share', [s.card], C.lav, { font: 'Times-Italic', size: 10, titleColor: C.ink });
    lay.callout('One next step', [s.next], C.butter, { size: 9.2, titleColor: C.ink });
    if (s.ask) lay.para((m.road === 'self' ? 'Ask yourself: ' : 'Talk about: ') + s.ask, { font: 'Times-Italic', size: 9.5, color: C.credit });
    if (s.link) lay.para('On the website: ' + siteLink(s.link), { size: 8.2, color: C.soft });
  }

  function fitLine(text, font, size, width) { return wrap(text, font, size, width)[0]; }

  function reportPdf(m) {
    var doc = new PDF.Doc({ title: m.title, producer: 'The Objective Ledger (TOL-OS) Full path report, made on this device', subject: 'tol-fullpath-report road=' + m.road });
    var lay = new Lay(doc), toc = [];
    function section(title, bookmark, level) {
      lay.page('Full path report  ·  ' + m.roadLabel + '  ·  ' + title);
      toc.push({ t: bookmark || title, page: doc.pages.length - 1, level: level || 0 });
    }
    function mark(t, level) { toc.push({ t: t, page: doc.pages.length - 1, level: level || 1 }); }

    // 1. Cover
    lay.page('');
    sprinkle(doc, 9);
    doc.roundRect(L, 44, W, 112, 16, ROAD_COLOR[m.road] || C.pink);
    doc.heart(R - 38, 74, 28, '#FFFFFF');
    doc.text(L + 18, 68, enc('THE OBJECTIVE LEDGER  ·  FULL PATH REPORT'), 'Helvetica-Bold', 7.8, C.ink);
    var tl = wrap(m.title, 'Times-Bold', 21, W - 90);
    tl.slice(0, 2).forEach(function (ln, k) { doc.text(L + 18, 96 + k * 23, ln, 'Times-Bold', 21, C.ink); });
    var yy0 = 96 + Math.min(tl.length, 2) * 23 + 2;
    wrap('For ' + m.forWho, 'Helvetica', 9.2, W - 40).slice(0, 2).forEach(function (ln) { doc.text(L + 18, yy0, ln, 'Helvetica', 9.2, C.ink); yy0 += 12; });
    doc.text(L + 18, yy0, fitLine(m.roadLabel + (m.n > 1 ? '  ·  ' + m.n + ' people' : '') + '  ·  ' + niceDate(m.date), 'Helvetica', 9.2, W - 40), 'Helvetica', 9.2, C.ink);
    lay.y = 170;
    lay.para('Not a verdict. ' + (m.lens || 'Each read describes the setup, never a person.'), { font: 'Times-Italic', size: 10.5, color: C.soft, after: 8 });
    lay.callout('Everything stays on your device', ['This report was made in your browser from what you entered. Nothing was sent anywhere or stored. Keep the file somewhere private, like any personal notes.'], C.creditSoft, { size: 9 });
    lay.callout('A fair read, never a verdict', [m.road === 'self' ? 'It describes your conditions and your setup, never your worth. It is not a diagnosis and makes no health claims.' : 'It describes the setup between you, never any one person. It is not a diagnosis, makes no health claims, and is never evidence or a performance record.'], C.lav, { size: 9, titleColor: C.ink });
    if (m.stateNote) lay.callout('Before you read on', [m.stateNote], C.butter, { size: 9, titleColor: C.ink });
    lay.h2('How to read this report', 90, C.butter);
    lay.bullets([
      'Start with the summary: the headline numbers, what is working, and the top three things to work on.',
      'Then read only the sections you need. Each one says what was entered, what it shows, what it suggests and what it can’t tell you.',
      '"Connections" links the pages together; "Worth a second look" flags numbers that may be typos; "Recommendations" turns it all into steps for now, this week and this month.',
      m.persons ? 'Each person has a short page of their own. They are not scorecards, and they are never a ranking.' : 'There is a section on your wiring, your patterns and your conditions, and on putting yourself into words, if you ever want to share it.',
      'The discussion guide at the end has questions and ground rules for ' + (m.road === 'self' ? 'reading it on your own.' : 'reading it together.')
    ], { size: 9 });
    lay.callout('How much weight to give it: ' + m.confidence.level, [m.confidence.text, m.confidence.weight], C.head, { size: 8.8, titleColor: C.ink });

    // 2. Contents (drawn at the end, once page numbers are known)
    var persons = m.persons || [];
    var entries = 12 + m.sections.length + m.extra.length + persons.length;
    var tocPages = entries * 17 > 600 ? 2 : 1, contentsPage;
    lay.page('Full path report  ·  ' + m.roadLabel + '  ·  Contents');
    contentsPage = doc.pages.length - 1;
    for (var tp = 1; tp < tocPages; tp++) lay.page('Full path report  ·  ' + m.roadLabel + '  ·  Contents');

    // 3. Executive summary
    section('Executive summary', '1  Executive summary');
    lay.kicker('Executive summary');
    lay.h1('The whole picture, in plain words');
    lay.para(m.summary.para, { size: 10, after: 8 });
    sub(lay, 'The headline numbers');
    tiles(lay, m.tiles);
    lay.bullets(m.summary.bands, { size: 8.2, color: C.soft, dot: C.line });
    lay.h2('Key findings', 60, C.pink);
    m.findings.forEach(function (t, i) {
      var lines = wrap(t, 'Helvetica', 9.6, W - 30), h = lines.length * 13 + 8;
      lay.room(h);
      doc.circle(L + 9, lay.y + 7, 8.5, PASTELS[i % PASTELS.length], C.brass, 0.5);
      doc.text(L + 9 - tw(String(i + 1), 'Helvetica-Bold', 8.5) / 2, lay.y + 10, enc(String(i + 1)), 'Helvetica-Bold', 8.5, C.ink);
      lines.forEach(function (ln, k) { doc.text(L + 26, lay.y + 10 + k * 13, ln, 'Helvetica', 9.6, C.ink); });
      lay.y += h;
    });
    lay.h2('Strengths to protect', 50, C.mint);
    lay.bullets(m.summary.strengths.map(function (s) { return s.title + '. ' + s.text; }), { size: 9.2, dot: C.credit });
    lay.h2('Top 3 things to work on', 120, C.peach);
    m.summary.top.forEach(function (t, i) {
      itemHead(lay, (i + 1) + '. ' + t.title, '', PASTELS[i % PASTELS.length], 30);
      labelled(lay, [['What we see', t.text], ['First step', t.step]], { indent: 14, kw: 84 });
    });
    lay.callout('Confidence: ' + m.confidence.level, [m.confidence.text, m.confidence.weight], C.head, { size: 8.8, titleColor: C.ink });
    if (m.ready && (m.ready.going || m.ready.focus)) {
      var rl = [];
      if (m.ready.going) rl.push('Going well: ' + m.ready.going);
      if (m.ready.focus) rl.push('What you most want help with: ' + m.ready.focus);
      if (m.ready.when) rl.push('When you’ll read it: ' + m.ready.when);
      lay.callout('In your words', rl, C.creditSoft, { size: 9 });
    }

    // 4. Detailed findings, section by section
    m.sections.forEach(function (s, i) {
      section(s.code + '  ' + s.name, (i === 0 ? '2  Detailed findings: ' : '') + s.code + ' ' + s.name, i === 0 ? 0 : 1);
      detail(lay, s, m);
    });
    var cs = m.calcSection;
    section(cs.applies ? 'CALC-01  Is the setup working for everyone?' : 'CALC-01  Your state and retuning count', 'CALC-01 ' + (cs.applies ? 'Is the setup working?' : 'State and retuning'), 1);
    lay.kicker('CALC-01');
    lay.h1(cs.applies ? 'Is the setup working?' : 'Your state and your retuning count', 'The inputs, where each came from, and the read');
    if (cs.state) lay.para('Step zero, your state: ' + cs.state + '.', { size: 9.2, color: C.soft });
    kv(lay, [['Input', 'Value', 'Where it came from']].concat(cs.rows), { kw: 150 });
    lay.bullets(cs.lines, { size: 9.2 });
    if (cs.moves && cs.moves.length) { sub(lay, 'What would move the score'); lay.bullets(cs.moves, { size: 9, dot: C.credit }); }
    if (cs.link) lay.para('On the website: ' + siteLink(cs.link), { size: 8.2, color: C.soft });
    m.extra.forEach(function (s) {
      section(s.name, s.code === 'NOTES' ? 'Self-notes: wiring and weather' : 'Ready page: in your words', 1);
      detail(lay, s, m);
    });

    // 5. Connections across workpapers
    section('Connections across workpapers', '3  Connections across workpapers');
    lay.kicker('Connections');
    lay.h1('Connecting the dots', 'What the pages say when you read them together');
    var work = m.insights.filter(function (r) { return !r.strength; }), good = m.insights.filter(function (r) { return r.strength; });
    lay.para(m.insights.length ? m.insights.length + ' of the report’s ' + m.counts.rules + ' insight rules fired for your answers. Each one says what it found, why it matters, and one thing to try. They describe the setup, not anyone’s character.' : 'None of the ' + m.counts.rules + ' insight rules fired yet. Most of them need two or more pages filled in, so this section grows as you do.', { size: 9.3, color: C.soft });
    work.forEach(function (r) {
      itemHead(lay, r.title, 'Pillar ' + r.pillar + '  ·  ' + r.src.join(', '), C.peach, 40);
      labelled(lay, [['What we see', r.finding], ['Why it matters', r.why], ['What to try', r.rec ? r.rec.first : '']], { indent: 14 });
      lay.y += 4;
    });
    if (good.length) {
      lay.h2('Strengths the pages show', 50, C.mint);
      good.forEach(function (r) {
        itemHead(lay, r.title, 'Pillar ' + r.pillar + '  ·  ' + r.src.join(', '), C.mint, 30);
        labelled(lay, [['What we see', r.finding], ['Why it matters', r.why]], { indent: 14 });
        lay.y += 4;
      });
    }

    // 6. Worth a second look
    section('Worth a second look', '4  Worth a second look (data checks)');
    lay.kicker('Anomalies and data checks');
    lay.h1('Worth a second look', 'It may be a typo, or it may be real');
    lay.para('We ran ' + m.counts.checks + ' gentle checks on the numbers and answers: things that don’t add up, answers that seem to disagree, and gaps. ' + (m.anomalies.length ? plural(m.anomalies.length, 'thing') + ' came up.' : 'Nothing stood out: the numbers hang together.'), { size: 9.3, color: C.soft });
    m.anomalies.forEach(function (a) {
      itemHead(lay, a.where, a.level === 'check' ? 'Worth fixing if it is a typo' : 'Worth knowing', a.level === 'check' ? C.peach : C.sky, 30);
      labelled(lay, [['What we noticed', a.text], ['What to do', a.fix]], { indent: 14 });
      lay.y += 4;
    });

    // 7. Recommendations and the plan
    section('Recommendations', '5  Recommendations and your plan');
    lay.kicker('Recommendations');
    lay.h1('What to do, in order', 'Now, this week and this month, each tied to a finding');
    [['now', 'Now', C.peach], ['week', 'This week', C.butter], ['month', 'This month', C.mint]].forEach(function (h) {
      var list2 = m.recs[h[0]];
      lay.h2(h[1], 60, h[2]);
      if (!list2.length) { lay.para('Nothing extra for ' + h[1].toLowerCase() + '.', { size: 9, color: C.soft, font: 'Times-Italic' }); return; }
      list2.forEach(function (r, i) {
        itemHead(lay, r.title, r.pillar ? 'Pillar ' + r.pillar : '', h[2], 50);
        labelled(lay, [['Why', r.why], ['First step', r.first], ['Try saying', r.script, 'Times-Italic'], ['Tool', siteLink(r.link)], ['It’s working when', r.working]], { indent: 14 });
        lay.y += 4;
      });
    });
    lay.page();
    mark('Your ' + m.plan.length + '-week plan');
    lay.kicker('Your plan');
    lay.h1('Your next ' + m.plan.length + ' weeks', 'Built from the recommendations above, one small step a week');
    m.plan.forEach(function (w, i) {
      var lines = wrap(w.do, 'Helvetica', 9.2, W - 40), h = 28 + lines.length * 12;
      lay.room(h);
      doc.circle(L + 12, lay.y + 11, 11, PASTELS[i % PASTELS.length], C.brass, 0.6);
      doc.text(L + 12 - tw(String(w.week), 'Helvetica-Bold', 9) / 2, lay.y + 14, enc(String(w.week)), 'Helvetica-Bold', 9, C.ink);
      doc.text(L + 32, lay.y + 10, fitLine('Week ' + w.week + ': ' + w.title, 'Helvetica-Bold', 10, W - 34), 'Helvetica-Bold', 10, C.ink);
      doc.text(L + 32, lay.y + 21, fitLine(w.wp + (w.pillar ? '  ·  Pillar ' + w.pillar : ''), 'Helvetica', 7.8, W - 34), 'Helvetica', 7.8, C.brass);
      lines.forEach(function (ln, k) { doc.text(L + 32, lay.y + 33 + k * 12, ln, 'Helvetica', 9.2, C.ink); });
      lay.y += h + 8;
    });

    // 8. A page for each person, or the Individual road's deeper look
    if (persons.length) {
      section('A page for each person', '6  A page for each person');
      lay.kicker('Each person');
      lay.h1('A page for each person', 'Their load, their battery, what they bring and what might help');
      lay.para('These are not scorecards and not a ranking. Each one is written to that person about their own week, and it only knows what was entered. Read your own first; share it if you want to.', { size: 9.3, color: C.soft, font: 'Times-Italic' });
      persons.forEach(function (p, i) {
        if (i) lay.room(260);
        mark(p.label, 1);
        lay.h2(p.label, 120, PASTELS[i % PASTELS.length]);
        kv(lay, p.rows, { kw: 140 });
        sub(lay, 'What they bring');
        lay.bullets(p.strengths, { size: 9, dot: C.credit });
        sub(lay, 'What might help');
        lay.bullets(p.help, { size: 9 });
        lay.callout('A conversation starter for ' + p.label, ['“' + p.starter + '”'], C.lav, { font: 'Times-Italic', size: 10, titleColor: C.ink });
      });
    }
    if (m.self) {
      var sd = m.self;
      section('Understanding yourself', '6  Understanding yourself');
      lay.kicker('Self-discovery');
      lay.h1('Wiring, patterns and conditions', 'Three layers, and how to tell them apart');
      lay.para(sd.intro, { size: 9.4 });
      sd.layers.forEach(function (ly) { sub(lay, ly[0]); lay.bullets(ly[1], { size: 9 }); });
      lay.h2('Which layer is it?', 50, C.sky);
      lay.bullets(sd.sorting, { size: 9 });
      lay.h2('Putting yourself into words', 60, C.lav);
      if (sd.explain.to) lay.para('You named: ' + sd.explain.to + '.', { size: 9, color: C.soft });
      if (sd.explain.card) lay.callout('A note you could share, in your own words', [sd.explain.card], C.lav, { font: 'Times-Italic', size: 10, titleColor: C.ink });
      else lay.para('Once your Wiring Card has a few lines, this becomes a short note you can share.', { size: 9, color: C.soft, font: 'Times-Italic' });
      sub(lay, 'Lines you could use');
      lay.bullets(sd.explain.scripts, { size: 9.4, font: 'Times-Italic' });
      lay.para('Read more: ' + sd.links.filter(Boolean).map(siteLink).join('  ·  '), { size: 8.2, color: C.soft });
    }

    // 9. For your road
    var rp = m.roadPart;
    section(rp.heading, '7  For your road');
    lay.kicker('For your road  ·  ' + m.roadLabel);
    lay.h1(rp.heading);
    rp.paras.forEach(function (t) { lay.para(t, { size: 9.4 }); });
    if (rp.blocks) rp.blocks.forEach(function (b) { sub(lay, b[0]); lay.para(b[1], { size: 9.4 }); });
    if (rp.suggestions.length) { lay.h2('Suggestions', 50, C.mint); lay.bullets(rp.suggestions, { size: 9.3 }); }
    if (rp.look && rp.look.length) { lay.h2('What to look for', 50, C.sky); lay.bullets(rp.look, { size: 9 }); }
    if (rp.together) lay.callout(rp.together[0], [rp.together[1]], C.creditSoft, { size: 9 });
    if (rp.links.length) lay.para('On the website: ' + rp.links.map(function (l) { return l[0] + ' (spreadloveandacceptance.com' + l[1] + ')'; }).join('  ·  '), { size: 8.4, color: C.soft });

    // 10. The Five Pillars
    section('The Five Pillars', '8  The Five Pillars view');
    lay.kicker('The Five Pillars');
    var solo = m.road === 'self', withLbl = solo ? 'With others, if you like: ' : 'Between you and others: ';
    lay.h1('Where you’re strong, and what needs care', solo ? 'Each pillar starts inside you, and can show up with the people around you' : 'Each pillar starts inside you, then shows up between you and others');
    var pv = m.pillars;
    if (pv.strongest && !pv.note) lay.callout('Looks strongest: Pillar ' + pv.strongest.n + ', ' + pv.strongest.name, ['In you: ' + pv.strongest.inYouI, withLbl + pv.strongest.betweenI], C.mint, { size: 9, titleColor: C.ink });
    if (pv.care && pv.care !== pv.strongest && !pv.note) lay.callout('Needs the most care: Pillar ' + pv.care.n + ', ' + pv.care.name, ['In you: ' + pv.care.inYouI, withLbl + pv.care.betweenI], C.peach, { size: 9, titleColor: C.ink });
    if (pv.note) lay.para(pv.note, { font: 'Times-Italic', size: 9.4, color: C.soft });
    barChart(lay, { title: 'Rough readings, 0 to 1 (higher is steadier)', items: pv.rows.map(function (r) { return { label: 'Pillar ' + r.n + ' ' + r.name, value: r.value || 0, max: 1, text: r.value != null ? FP.fmt(r.value) : 'not filled in' }; }) });
    pv.rows.forEach(function (r, i) {
      lay.h2('Pillar ' + r.n + '  ' + r.name, 90, PASTELS[i % PASTELS.length]);
      lay.para((r.value != null ? 'Reads ' + FP.fmt(r.value) + ', from ' : 'Not filled in yet (') + r.from + (r.value != null ? '.' : ').'), { size: 8.2, color: C.soft, after: 3 });
      labelled(lay, [['The data shows', r.shows], ['In you', r.inYouI], [solo ? 'With others' : 'Between you', r.betweenI], ['A practice', r.practice]], { kw: 96 });
    });
    lay.para('Rough readings from what you entered, not scores on anyone. Read more at spreadloveandacceptance.com/five-pillars.html.', { size: 8.2, color: C.soft, font: 'Times-Italic' });

    // 11. Discussion guide
    var g = m.guide;
    section('Discussion guide', '9  Discussion guide');
    lay.kicker('Discussion guide');
    lay.h1(m.road === 'self' ? 'Questions to sit with' : 'Talking it through', m.road === 'self' ? 'For reading on your own, at your own pace' : 'For reading together, or alone first');
    lay.h2('Questions', 60, C.lav);
    g.questions.forEach(function (t, i) {
      var lines = wrap((i + 1) + '.  ' + t, 'Times-Italic', 10, W - 16);
      lay.room(lines.length * 13 + 4);
      lines.forEach(function (ln) { doc.text(L + 8, lay.y + 10, ln, 'Times-Italic', 10, C.ink); lay.y += 13; });
      lay.y += 4;
    });
    lay.h2('Ground rules', 60, C.mint);
    lay.bullets(g.rules, { size: 9.2 });
    lay.callout('If it lands hard', g.hard, C.butter, { size: 9, titleColor: C.ink });
    if (m.roadPart.talk && m.roadPart.talk.length) { lay.h2(m.roadPart.talkTitle, 50, C.lav); lay.bullets(m.roadPart.talk.map(function (t) { return '“' + t + '”'; }), { size: 9.6, font: 'Times-Italic' }); }

    // 12. Glossary and method
    section('Glossary and method', '10  Glossary and method');
    lay.kicker('Appendix');
    lay.h1('How this report works');
    lay.bullets(m.method, { size: 8.9 });
    lay.h2('How complete the data is', 70, C.sky);
    lay.para(m.confidence.text + ' ' + m.confidence.weight, { size: 9 });
    table(lay, { title: 'Page by page', head: ['Page', 'Status', 'Boxes filled in'], rows: m.completeness, widths: [2.6, 1, 1] });
    lay.h2('Glossary', 60, C.butter);
    kv(lay, m.glossary, { kw: 140 });

    // Keep it fair
    lay.h2('Keep it fair', 80, C.lav);
    lay.bullets(m.fair, { size: 9 });
    if (m.care) lay.para(m.care, { font: 'Times-Italic', size: 9.4, color: C.credit });
    if (m.close) lay.callout('', [m.close], C.butter, { font: 'Times-Italic', size: 10.5 });

    // Contents, now that every section has a page
    var all = [{ t: 'Cover and how to read this report', page: 0, level: 0 }].concat(toc), step = all.length > 34 ? 15 : 17;
    doc.setPage(contentsPage);
    var y = TOP + 22, pg = contentsPage;
    doc.text(L, y + 18, enc('In this report'), 'Times-Bold', 20, C.ink);
    y += 36;
    doc.text(L, y + 4, enc('Tap a line to jump to it. Page numbers are at the bottom right of every page.'), 'Helvetica', 8.5, C.soft);
    y += 16;
    all.forEach(function (e, i) {
      if (y + step > BOTTOM && pg < contentsPage + tocPages - 1) { pg++; doc.setPage(pg); y = TOP + 26; }
      var ind = e.level ? 16 : 0, size = e.level ? 9 : 10, font = e.level ? 'Helvetica' : 'Helvetica-Bold';
      var num = String(e.page + 1), label = fitLine(e.t, font, size, W - 60 - ind);
      doc.circle(L + 6 + ind, y + 6, e.level ? 2.6 : 4, PASTELS[i % PASTELS.length]);
      doc.text(L + 16 + ind, y + 10, label, font, size, C.ink);
      var lx = L + 16 + ind + PDF.textWidth(label, font, size) + 6, rx = R - PDF.textWidth(enc(num), font, size) - 6;
      if (rx > lx) doc.line(lx, y + 9, rx, y + 9, C.line, 0.5);
      doc.text(R - PDF.textWidth(enc(num), font, size), y + 10, enc(num), font, size, C.ink);
      doc.link(L, y - 2, W, step - 2, e.page, 0);
      y += step;
    });
    doc.marks = [{ title: 'Cover', level: 0, page: 0 }, { title: 'Contents', level: 0, page: contentsPage }].concat(toc.map(function (e) { return { title: e.t, level: 0, page: e.page }; }));
    footers(doc, fitLine('The Objective Ledger  ·  Full path report  ·  ' + m.roadLabel + '  ·  made on your device ' + niceDate(m.date), 'Helvetica', 6.8, W - 80),
      fitLine('Everything stays on your device. Not a verdict, not a diagnosis, no health claims. It describes the setup, never a person.', 'Helvetica', 6.8, W - 80));
    return doc.output();
  }

  /* ------------------------------------------------------------ reading a filled-in PDF */

  // A tiny PDF object parser: enough to find every form field, its full name and its value,
  // whichever app saved the file (plain objects, incremental updates, compressed object streams).
  var WS = { 0: 1, 9: 1, 10: 1, 12: 1, 13: 1, 32: 1 };
  var DELIM = '()<>[]{}/%';
  function isWs(s, i) { return WS[s.charCodeAt(i)] === 1; }
  function skip(s, i) {
    for (;;) {
      while (i < s.length && isWs(s, i)) i++;
      if (s.charAt(i) === '%') { while (i < s.length && s.charAt(i) !== '\n' && s.charAt(i) !== '\r') i++; continue; }
      return i;
    }
  }
  function isDelim(c) { return c === '' || DELIM.indexOf(c) >= 0 || /\s/.test(c); }
  function parse(s, i) {
    i = skip(s, i);
    var c = s.charAt(i);
    if (c === '<' && s.charAt(i + 1) === '<') {
      var d = {}; i += 2;
      for (;;) {
        i = skip(s, i);
        if (s.charAt(i) === '>' && s.charAt(i + 1) === '>') return { v: { dict: d }, i: i + 2 };
        if (i >= s.length) throw new Error('eof');
        var k = parse(s, i);
        if (!k.v || k.v.name == null) throw new Error('bad key');
        var val = parse(s, k.i);
        d[k.v.name] = val.v; i = val.i;
      }
    }
    if (c === '<') { var e = s.indexOf('>', i); if (e < 0) throw new Error('eof'); var hex = s.slice(i + 1, e).replace(/[^0-9A-Fa-f]/g, ''); if (hex.length % 2) hex += '0'; var b = ''; for (var h = 0; h < hex.length; h += 2) b += String.fromCharCode(parseInt(hex.substr(h, 2), 16)); return { v: { str: b }, i: e + 1 }; }
    if (c === '(') {
      var depth = 1, out = ''; i++;
      while (i < s.length && depth) {
        var ch = s.charAt(i);
        if (ch === '\\') {
          var n = s.charAt(++i);
          if (n === 'n') out += '\n'; else if (n === 'r') out += '\r'; else if (n === 't') out += '\t'; else if (n === 'b') out += '\b'; else if (n === 'f') out += '\f';
          else if (n === '\r') { if (s.charAt(i + 1) === '\n') i++; }
          else if (n === '\n') { /* continuation */ }
          else if (/[0-7]/.test(n)) { var oct = n; while (oct.length < 3 && /[0-7]/.test(s.charAt(i + 1))) oct += s.charAt(++i); out += String.fromCharCode(parseInt(oct, 8) & 0xFF); }
          else out += n;
          i++; continue;
        }
        if (ch === '(') depth++;
        else if (ch === ')') { depth--; if (!depth) { i++; break; } }
        out += ch; i++;
      }
      return { v: { str: out }, i: i };
    }
    if (c === '[') {
      var arr = []; i++;
      for (;;) { i = skip(s, i); if (s.charAt(i) === ']') return { v: arr, i: i + 1 }; if (i >= s.length) throw new Error('eof'); var it = parse(s, i); arr.push(it.v); i = it.i; }
    }
    if (c === '/') {
      var j = i + 1; while (j < s.length && !isDelim(s.charAt(j))) j++;
      return { v: { name: s.slice(i + 1, j).replace(/#([0-9A-Fa-f]{2})/g, function (m, x) { return String.fromCharCode(parseInt(x, 16)); }) }, i: j };
    }
    var m = /^[+\-]?(\d+\.?\d*|\.\d+)/.exec(s.substr(i, 32));
    if (m) {
      var after = i + m[0].length;
      if (/^\d+$/.test(m[0])) { // maybe "n g R"
        var r = /^\s+(\d+)\s+R(?=[\s\/\[\]<>()%]|$)/.exec(s.substr(after, 24));
        if (r) return { v: { ref: +m[0] }, i: after + r[0].length };
      }
      return { v: parseFloat(m[0]), i: after };
    }
    var w = /^[A-Za-z]+/.exec(s.substr(i, 16));
    if (w) { if (w[0] === 'true') return { v: true, i: i + 4 }; if (w[0] === 'false') return { v: false, i: i + 5 }; if (w[0] === 'null') return { v: null, i: i + 4 }; return { v: { kw: w[0] }, i: i + w[0].length }; }
    throw new Error('unexpected ' + c);
  }

  function toLatin1(u8) { var out = '', CH = 0x8000; for (var i = 0; i < u8.length; i += CH) out += String.fromCharCode.apply(null, u8.subarray(i, i + CH)); return out; }
  function fromLatin1(str) { var u8 = new Uint8Array(str.length); for (var i = 0; i < str.length; i++) u8[i] = str.charCodeAt(i) & 0xFF; return u8; }
  function inflate(bytes) {
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('no DecompressionStream'));
    function run(fmt, data) { return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream(fmt))).arrayBuffer().then(function (b) { return toLatin1(new Uint8Array(b)); }); }
    var u8 = fromLatin1(bytes);
    return run('deflate', u8).catch(function () { return run('deflate-raw', u8.subarray(2)); });
  }
  function filters(dict) { var f = dict.Filter; if (!f) return []; return (Array.isArray(f) ? f : [f]).map(function (x) { return x && x.name; }); }

  // PDFDocEncoding for the few bytes that differ from Latin-1.
  var PDFDOC = { 0x18: 0x02D8, 0x19: 0x02C7, 0x1A: 0x02C6, 0x1B: 0x02D9, 0x1C: 0x02DD, 0x1D: 0x02DB, 0x1E: 0x02DA, 0x1F: 0x02DC, 0x80: 0x2022, 0x81: 0x2020, 0x82: 0x2021, 0x83: 0x2026, 0x84: 0x2014, 0x85: 0x2013, 0x86: 0x0192, 0x87: 0x2044, 0x88: 0x2039, 0x89: 0x203A, 0x8A: 0x2212, 0x8B: 0x2030, 0x8C: 0x201E, 0x8D: 0x201C, 0x8E: 0x201D, 0x8F: 0x2018, 0x90: 0x2019, 0x91: 0x201A, 0x92: 0x2122, 0x93: 0xFB01, 0x94: 0xFB02, 0x95: 0x0141, 0x96: 0x0152, 0x97: 0x0160, 0x98: 0x0178, 0x99: 0x017D, 0x9A: 0x0131, 0x9B: 0x0142, 0x9C: 0x0153, 0x9D: 0x0161, 0x9E: 0x017E, 0xA0: 0x20AC };
  function textOf(b) {
    if (b.charCodeAt(0) === 0xFE && b.charCodeAt(1) === 0xFF) { var o = ''; for (var k = 2; k + 1 < b.length; k += 2) o += String.fromCharCode((b.charCodeAt(k) << 8) | b.charCodeAt(k + 1)); return o; }
    if (b.charCodeAt(0) === 0xFF && b.charCodeAt(1) === 0xFE) { var o2 = ''; for (var k2 = 2; k2 + 1 < b.length; k2 += 2) o2 += String.fromCharCode(b.charCodeAt(k2) | (b.charCodeAt(k2 + 1) << 8)); return o2; }
    if (b.charCodeAt(0) === 0xEF && b.charCodeAt(1) === 0xBB && b.charCodeAt(2) === 0xBF) { try { return decodeURIComponent(escape(b.slice(3))); } catch (e) { return b.slice(3); } }
    var out = ''; for (var i = 0; i < b.length; i++) { var c = b.charCodeAt(i); out += String.fromCharCode(PDFDOC[c] || c); }
    return out;
  }

  // Every field in the file: { 'tol.v1.wp02.p1.q3': '3', 'tol.v1.wp04.raw.r1.w2': true, ... }
  function readFields(bytes) {
    var s = typeof bytes === 'string' ? bytes : toLatin1(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
    if (s.slice(0, 1024).indexOf('%PDF') < 0) return Promise.reject(Object.assign(new Error('not a pdf'), { code: 'not-pdf' }));
    var seq = [], re = /(\d+)\s+(\d+)\s+obj\b/g, m, encrypted = /\/Encrypt\s/.test(s.slice(-4096)) || /trailer[\s\S]{0,400}\/Encrypt/.test(s);
    while ((m = re.exec(s))) {
      var at = re.lastIndex, r;
      try { r = parse(s, at); } catch (e) { continue; }
      var j = skip(s, r.i), entry = { num: +m[1], v: r.v };
      if (s.substr(j, 6) === 'stream') {
        var st = j + 6; if (s.charAt(st) === '\r') st++; if (s.charAt(st) === '\n') st++;
        var len = r.v && r.v.dict && typeof r.v.dict.Length === 'number' ? r.v.dict.Length : -1, end;
        if (len >= 0 && s.substr(st + len, 40).indexOf('endstream') >= 0) end = st + len;
        else { end = s.indexOf('endstream', st); if (end < 0) break; while (end > st && (s.charAt(end - 1) === '\n' || s.charAt(end - 1) === '\r')) end--; }
        entry.data = s.slice(st, end);
        re.lastIndex = s.indexOf('endstream', end) + 9;
      } else re.lastIndex = Math.max(j, at);
      seq.push(entry);
    }
    // open the compressed object streams
    var jobs = seq.map(function (e) {
      var d = e.v && e.v.dict;
      if (!d || !d.Type || d.Type.name !== 'ObjStm' || e.data == null) return Promise.resolve(null);
      var fl = filters(d);
      if (fl.length > 1 || (fl.length === 1 && fl[0] !== 'FlateDecode')) return Promise.resolve(null);
      return (fl.length ? inflate(e.data) : Promise.resolve(e.data)).then(function (txt) {
        var n = d.N, first = d.First, head = txt.slice(0, first).trim().split(/\s+/).map(Number), out = [];
        for (var k = 0; k + 1 < head.length && k / 2 < n; k += 2) {
          try { out.push({ num: head[k], v: parse(txt, first + head[k + 1]).v }); } catch (err) { /* skip a broken one */ }
        }
        return out;
      }, function () { return null; });
    });
    return Promise.all(jobs).then(function (inner) {
      var objs = {};
      seq.forEach(function (e, k) {
        if (inner[k]) inner[k].forEach(function (x) { objs[x.num] = x.v; });
        else objs[e.num] = e.v;
      });
      function res(v) { var guard = 0; while (v && v.ref != null && guard++ < 32) v = objs[v.ref]; return v; }
      function dictOf(v) { v = res(v); return v && v.dict ? v.dict : null; }
      function strOf(v) { v = res(v); return v && v.str != null ? textOf(v.str) : null; }
      var found = {};
      Object.keys(objs).forEach(function (num) {
        var d = dictOf(objs[num]);
        if (!d || !d.T) return;
        var t = strOf(d.T);
        if (t == null) return;
        var parts = [t], p = dictOf(d.Parent), guard = 0, ft = d.FT && d.FT.name, ff = typeof d.Ff === 'number' ? d.Ff : null;
        while (p && guard++ < 32) {
          if (p.T) { var pt = strOf(p.T); if (pt != null) parts.unshift(pt); }
          if (!ft && p.FT) ft = p.FT.name;
          if (ff == null && typeof p.Ff === 'number') ff = p.Ff;
          p = dictOf(p.Parent);
        }
        var name = parts.join('.');
        if (name.indexOf('tol.') !== 0) return;
        var v = res(d.V), val;
        if (Array.isArray(v)) v = res(v[0]);
        if (v && v.str != null) val = textOf(v.str);
        else if (v && v.name != null) val = v.name;
        else if (d.Kids) {
          (res(d.Kids) || []).forEach(function (kid) { var kd = dictOf(kid); if (kd && !kd.T && kd.AS && kd.AS.name && kd.AS.name !== 'Off') val = kd.AS.name; });
        }
        if (val === undefined && d.AS && d.AS.name) val = d.AS.name;
        if (val === undefined) return;
        if (ft === 'Btn' && !(ff != null && (ff & 32768))) val = val !== 'Off' && val !== '';
        else if (ft === 'Btn' && val === 'Off') val = '';
        found[name] = val;
      });
      found.__encrypted = encrypted && !Object.keys(found).length;
      return found;
    });
  }

  // Read a filled package: { data, read } (see TOLFullPath.fromFields), or a clear error.
  function readPackage(bytes) {
    return readFields(bytes).then(function (found) {
      var enc2 = found.__encrypted; delete found.__encrypted;
      var keys = Object.keys(found);
      if (!keys.length) {
        var err = new Error(enc2 ? 'protected' : 'no-fields');
        err.code = enc2 ? 'protected' : 'no-fields';
        throw err;
      }
      return FP.fromFields(found);
    });
  }

  global.TOLFullPathPDF = { packagePdf: packagePdf, reportPdf: reportPdf, readFields: readFields, readPackage: readPackage };
})(typeof window !== 'undefined' ? window : globalThis);
