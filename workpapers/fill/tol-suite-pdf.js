/*
  tol-suite-pdf.js — The Objective Ledger (TOL-OS)
  Makes the Workpaper Suite PDFs, and reads a filled-in one back.

  - fillable(): every workpaper on your road as a real form. Tap a box and type
    in any PDF app, or print it and write by hand. Whatever is already filled
    in on the website is in the boxes.
  - report(): a keepsake of what you've written, grouped the way your road is,
    with an at-a-glance read, changes over time and the kind words worth keeping.
  - readFilled(): opens a fillable PDF from this site after it has been filled
    in, and hands back what was typed, so the website can pick up from there.

  All of it runs on this device. Nothing is sent anywhere or stored.
*/
(function (global) {
  'use strict';

  var PDF = global.TOLPDF, WPK = global.TOLWorkpaper;
  var C = {
    ink: '#211D17', soft: '#6A6152', line: '#D9CBA3', brass: '#A8792F', head: '#F3ECD9',
    credit: '#3E6B4C', creditSoft: '#EAF1E9', box: '#FFFDF7', paper: '#FFFCF5',
    pink: '#F7CAD4', rose: '#E88BA2', lav: '#EBDDF6', mint: '#CFE6D2', butter: '#F8E7AE', sky: '#D8E4F4', peach: '#F9D9B8'
  };
  var PASTELS = [C.pink, C.lav, C.mint, C.butter, C.sky, C.peach];
  var L = 48, R = 564, W = R - L, TOP = 50, BOTTOM = 738;
  var FIELD_PREFIX = 'TOL~';
  var METRICS = {
    'WP-01': { label: 'Workload balance score', say: 'Balance', max: 1, good: 'up' },
    'WP-02': { label: 'Battery score', say: 'Battery load', max: 1, good: 'down' },
    'WP-03': { label: 'Ownership clarity score', say: 'Clarity', max: 1, good: 'up' },
    'WP-04': { label: 'Structural gaps found', say: 'Gaps', max: 0, good: 'down' },
    'WP-11': { label: 'Latest reading', say: 'After settling', max: 1, good: 'down' }
  };

  function schemaFor(code) { return (global.TOL_WORKPAPERS || {})[String(code || '').toLowerCase()]; }
  function nameOf(code) { var n = global.TOL_SUITE_PATHS && global.TOL_SUITE_PATHS.names[code]; return n || (schemaFor(code) || {}).title || code; }
  function enc(t) { return PDF.encode(t); }
  function wrap(t, f, s, w) { return PDF.wrap(t, f, s, w); }
  function tw(t, f, s) { return PDF.textWidth(enc(t), f, s); }
  function niceDate(d) { return (d || new Date()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }

  /* ------------------------------------------------------------ a page writer */

  function Pen(doc, running) {
    this.doc = doc; this.running = running || ''; this.y = TOP;
  }
  Pen.prototype.page = function (running) {
    if (running != null) this.running = running;
    this.doc.addPage();
    this.y = TOP;
    if (this.running) {
      this.doc.text(L, this.y + 6, enc(this.running), 'Helvetica', 7.5, C.soft);
      this.doc.line(L, this.y + 12, R, this.y + 12, C.line, 0.5);
      this.y += 26;
    }
  };
  Pen.prototype.room = function (h, onBreak) {
    if (this.y + h > BOTTOM) { this.page(); if (onBreak) onBreak(); return true; }
    return false;
  };
  Pen.prototype.para = function (text, o) {
    o = o || {};
    var font = o.font || 'Helvetica', size = o.size || 9.5, lh = size * 1.4, x = L + (o.indent || 0), self = this;
    wrap(text, font, size, (o.width || W) - (o.indent || 0)).forEach(function (ln) {
      self.room(lh);
      self.doc.text(x, self.y + size, ln, font, size, o.color || C.ink);
      self.y += lh;
    });
    this.y += o.after == null ? 6 : o.after;
  };
  Pen.prototype.heading = function (text, keep, color) {
    this.room(28 + (keep || 20));
    this.y += 6;
    this.doc.heart(L + 5, this.y + 8.5, 9, color || C.pink);
    this.doc.text(L + 16, this.y + 13, enc(text), 'Times-Bold', 13.5, C.ink);
    this.y += 22;
  };
  Pen.prototype.kicker = function (text, color) {
    this.doc.text(L, this.y + 8, enc(text), 'Helvetica-Bold', 7.5, color || C.brass);
    this.y += 14;
  };

  // A few soft bubbles and hearts in the margins of a cover or divider.
  function sprinkle(doc, seed, dense) {
    var n = dense ? 16 : 7, s = seed || 1;
    function rnd() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    for (var i = 0; i < n; i++) {
      var edge = rnd(), x, y;
      if (edge < 0.5) { x = rnd() < 0.5 ? 14 + rnd() * 30 : R + 4 + rnd() * 30; y = 30 + rnd() * 720; }
      else { x = 20 + rnd() * 570; y = 12 + rnd() * 26; }
      var col = PASTELS[Math.floor(rnd() * PASTELS.length)], size = 5 + rnd() * (dense ? 14 : 9);
      if (rnd() < 0.35) doc.heart(x, y, size * 1.3, col);
      else { doc.circle(x, y, size, null, col, 1.1); doc.circle(x - size * 0.35, y - size * 0.35, size * 0.18, '#FFFFFF'); }
    }
  }

  function footers(doc, opts) {
    var n = doc.pages.length, made = niceDate();
    for (var i = 0; i < n; i++) {
      doc.setPage(i);
      doc.line(L, 750, R, 750, C.line, 0.5);
      doc.text(L, 761, enc(opts.fillable
        ? 'Tap any box to type, in any PDF app. Or print it and write by hand. Made on your device ' + made + '; nothing was sent anywhere.'
        : 'Made on your device ' + made + '. Nothing entered was sent to or stored by the website. Keep this file somewhere private.'), 'Helvetica', 6.8, C.soft);
      doc.text(L, 770, enc('A self-reflection worksheet, not a clinical instrument. It describes the arrangement, never either person.'), 'Helvetica', 6.8, C.soft);
      var pg = enc('Page ' + (i + 1) + ' of ' + n);
      doc.text(R - PDF.textWidth(pg, 'Helvetica', 6.8), 770, pg, 'Helvetica', 6.8, C.soft);
    }
  }

  /* ------------------------------------------------------------ reading an entry */

  function ctxOf(entry) { var s = schemaFor(entry.workpaper); return s ? WPK.makeCtx(s, entry.state) : null; }
  function answers(entry) { var s = schemaFor(entry.workpaper); return s ? WPK.answered(s, entry.state) : 0; }
  function isPrompt(v) { return /^(Add|Answer|Record) /.test(v || ''); }
  function results(entry) {
    var s = schemaFor(entry.workpaper), ctx = ctxOf(entry), out = [];
    if (!s) return out;
    s.sections.forEach(function (sec) {
      if (sec.type !== 'computed') return;
      sec.compute(ctx).forEach(function (it) { if (!isPrompt(it.value)) out.push(it); });
    });
    return out;
  }
  function metric(entry) {
    var m = METRICS[entry.workpaper];
    if (!m) return null;
    var hit = results(entry).filter(function (it) { return it.label === m.label; })[0];
    var v = hit ? parseFloat(hit.value) : NaN;
    return isNaN(v) ? null : v;
  }
  function labelOf(entry, i) {
    if (entry.label) return entry.label;
    var v = entry.state.values, d = v.weekOf || v.date || v.reviewDate || v.month;
    if (d) return (v.weekOf ? 'Week of ' : '') + WPK.formatDate(d);
    return 'Sheet ' + (i + 1);
  }

  function shortLabel(entry, i) {
    var v = entry.state.values, d = v.weekOf || v.date || v.reviewDate;
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) { var p = d.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }); }
    return entry.label || v.month || ('#' + (i + 1));
  }

  /* ------------------------------------------------------------ fillable sheets */

  function fname() { return FIELD_PREFIX + Array.prototype.join.call(arguments, '~'); }
  function key(k) { return String(k).replace(/\./g, '!'); }

  function choiceOptions(def, ctx) {
    if (def.type === 'person') return [['', '']].concat(['A', 'B'].concat(def.both ? ['Both'] : []).map(function (p) { return [p, ctx.name(p)]; }));
    return [['', '']].concat(def.options.map(function (o) { return [o, o]; }));
  }

  // Draw a box on the page (so paper copies show it) and a field over it.
  function box(pen, x, y, w, h, fld) {
    pen.doc.roundRect(x, y, w, h, 3, C.box, C.line, 0.6);
    fld.x = x + 0.5; fld.y = y + 0.5; fld.w = w - 1; fld.h = h - 1;
    pen.doc.field(fld);
  }

  function fieldFor(def, name, value, ctx) {
    if (def.type === 'select' || def.type === 'person') return { name: name, kind: 'choice', value: value || '', options: choiceOptions(def, ctx) };
    if (def.type === 'check') return { name: name, kind: 'check', value: !!value };
    return { name: name, kind: 'text', value: value == null ? '' : String(value), multiline: def.type === 'textarea' };
  }

  function sheetTitle(pen, entry, e, schema, opts) {
    pen.kicker(('The Objective Ledger  ·  ' + schema.code + (entry.group ? '  ·  ' + entry.group : '')).toUpperCase());
    var title = schema.title, name = nameOf(schema.code);
    pen.doc.text(L, pen.y + 20, enc(title), 'Times-Bold', 21, C.ink);
    pen.y += 28;
    if (name && name !== title) { pen.doc.text(L, pen.y + 9, enc(name), 'Times-Italic', 11, C.soft); pen.y += 16; }
    pen.doc.line(L, pen.y, R, pen.y, C.brass, 1.2);
    pen.y += 10;
    if (entry.why) pen.para(entry.why, { font: 'Times-Italic', size: 10.5, color: C.credit, after: 4 });
    pen.para(schema.purpose, { size: 9, color: C.soft, after: 8 });
    if (!opts.single) {
      pen.doc.text(L, pen.y + 8, enc('THIS SHEET IS FOR (A WEEK, A DAY, A MONTH)'), 'Helvetica-Bold', 6.8, C.soft);
      box(pen, L + 190, pen.y, 180, 16, { name: fname(e, schema.code, 'label'), kind: 'text', value: entry.label || '', size: 8.5 });
      pen.y += 24;
    }
  }

  function sheetMeta(pen, entry, e, schema, ctx, opts) {
    var defs = [];
    var people = opts.people || ['Partner A', 'Partner B'];
    if (schema.people) defs.push({ id: 'partnerA', label: people[0] + ' (name)', type: 'text' }, { id: 'partnerB', label: people[1] + ' (name)', type: 'text' });
    defs = defs.concat(schema.meta || []);
    var colW = (W - 16) / 2;
    for (var i = 0; i < defs.length; i += 2) {
      pen.room(38);
      defs.slice(i, i + 2).forEach(function (d, j) {
        var x = L + j * (colW + 16);
        pen.doc.text(x, pen.y + 8, enc(d.label.toUpperCase() + (d.type === 'date' ? ' (YYYY-MM-DD)' : '')), 'Helvetica-Bold', 6.8, C.soft);
        box(pen, x, pen.y + 12, colW, 20, fieldFor(d, fname(e, schema.code, 'v', key(d.id)), entry.state.values[d.id], ctx));
      });
      pen.y += 40;
    }
  }

  function sheetTable(pen, entry, e, sec, schema, ctx, opts) {
    var rows = (entry.state.tables[sec.id] || []).slice(), fixed = !!sec.fixedRows;
    if (!fixed) {
      var filled = rows.filter(function (r) { return !WPK.rowIsEmpty(sec, r); }).length;
      var min = Math.max((sec.defaultRows || [{}]).length, filled + (opts.blankRows == null ? 3 : opts.blankRows), 3);
      while (rows.length < min) rows.push(sec.defaultRows && sec.defaultRows[rows.length] ? JSON.parse(JSON.stringify(sec.defaultRows[rows.length])) : {});
      if (rows.length > 60) rows = rows.slice(0, 60);
    }
    var cols = (fixed ? [{ id: '__label', label: '', w: 1.4, type: 'label' }] : []).concat(sec.columns);
    var total = cols.reduce(function (a, c) { return a + (c.w || 1); }, 0);
    var widths = cols.map(function (c) { return W * (c.w || 1) / total; });
    var tall = sec.columns.some(function (c) { return c.type === 'textarea'; });
    var rowH = tall ? 40 : 22;
    var heads = cols.map(function (c, i) { return wrap(c.label, 'Helvetica-Bold', 7, widths[i] - 6); });
    var headH = Math.max.apply(null, heads.map(function (h) { return h.length; })) * 8.5 + 8;

    var introH = sec.intro ? wrap(sec.intro, 'Helvetica', 8.5, W).length * 11.9 + 6 : 0;
    pen.heading(sec.title, introH + headH + rowH * 2);
    if (sec.intro) pen.para(sec.intro, { size: 8.5, color: C.soft, after: 6 });
    function head() {
      pen.doc.rect(L, pen.y, W, headH, C.head);
      var x = L;
      heads.forEach(function (lines, i) {
        lines.forEach(function (ln, k) { pen.doc.text(x + 3, pen.y + 10 + k * 8.5, ln, 'Helvetica-Bold', 7, C.soft); });
        x += widths[i];
      });
      pen.y += headH + 3;
    }
    head();
    rows.forEach(function (r, ri) {
      pen.room(rowH + 3, head);
      var x = L;
      cols.forEach(function (c, ci) {
        var w = widths[ci] - 3;
        if (c.type === 'label') {
          var lab = WPK.rowLabel(sec.fixedRows[ri], ctx);
          if (sec.fixedRows[ri] === '@A' && !(entry.state.values.partnerA || '').trim()) lab = (opts.people || [])[0] || lab;
          if (sec.fixedRows[ri] === '@B' && !(entry.state.values.partnerB || '').trim()) lab = (opts.people || [])[1] || lab;
          pen.doc.text(x + 2, pen.y + 14, enc(lab), 'Helvetica-Bold', 9, C.ink);
        } else if (c.type === 'computed') {
          var v = c.compute(r);
          pen.doc.roundRect(x, pen.y, w, rowH, 3, C.creditSoft);
          if (v) pen.doc.text(x + 4, pen.y + 14, enc(v), 'Helvetica-Bold', 9, C.credit);
        } else if (c.type === 'check') {
          var s = Math.min(16, rowH - 4), cx = x + (w - s) / 2;
          box(pen, cx, pen.y + (rowH - s) / 2, s, s, fieldFor(c, fname(e, schema.code, 't', sec.id, ri, c.id), r[c.id], ctx));
        } else {
          var f = fieldFor(c, fname(e, schema.code, 't', sec.id, ri, c.id), r[c.id], ctx);
          f.size = 8.5; f.tip = c.label + ', row ' + (ri + 1);
          box(pen, x, pen.y, w, rowH, f);
        }
        x += widths[ci];
      });
      pen.y += rowH + 3;
    });
    pen.y += 8;
  }

  function sheetScale(pen, entry, e, sec, schema, ctx, kind) {
    var items = sec.items, labW = W - 110;
    var hint = kind === 'scale' ? sec.min + ' = ' + sec.anchors[0].toLowerCase() + ', ' + sec.max + ' = ' + sec.anchors[1].toLowerCase() + '. Pick or write a number.' : 'Pick one answer for each.';
    pen.heading(sec.title, 60);
    pen.para((sec.intro ? sec.intro + ' ' : '') + hint, { size: 8.5, color: C.soft, after: 6 });
    items.forEach(function (it) {
      var lines = wrap(it.label, 'Helvetica', 9.5, labW - 10);
      var opts = kind === 'scale' ? (function () { var o = []; for (var v = sec.min; v <= sec.max; v++) o.push(String(v)); return o; })() : it.options;
      var h = Math.max(lines.length * 12.5 + 14, 30);
      pen.room(h);
      lines.forEach(function (ln, k) { pen.doc.text(L, pen.y + 11 + k * 12.5, ln, 'Helvetica', 9.5, C.ink); });
      pen.doc.text(L, pen.y + 11 + lines.length * 12.5, enc(opts.join('  ·  ')), 'Helvetica', 7, C.soft);
      box(pen, R - 100, pen.y + 2, 100, 20, { name: fname(e, schema.code, 'v', key(sec.id + '.' + it.id)), kind: 'choice', value: entry.state.values[sec.id + '.' + it.id] == null ? '' : String(entry.state.values[sec.id + '.' + it.id]), options: [['', '']].concat(opts.map(function (o) { return [o, o]; })) });
      pen.doc.line(L, pen.y + h - 3, R, pen.y + h - 3, C.line, 0.4);
      pen.y += h;
    });
    pen.y += 8;
  }

  function sheetFields(pen, entry, e, sec, schema, ctx) {
    pen.heading(sec.title, 60);
    if (sec.intro) pen.para(sec.intro, { size: 8.5, color: C.soft, after: 6 });
    sec.fields.forEach(function (f) {
      var h = f.type === 'textarea' ? 62 : 22, label = wrap(f.label, 'Helvetica-Bold', 8, W);
      var need = label.length * 10 + h + (f.help ? 12 : 0) + 12;
      pen.room(need);
      label.forEach(function (ln, k) { pen.doc.text(L, pen.y + 8 + k * 10, ln, 'Helvetica-Bold', 8, C.soft); });
      pen.y += label.length * 10 + 3;
      var val = entry.state.values[f.id];
      if (f.privateOptIn && !entry.state.values[f.id + '__include']) val = '';
      box(pen, L, pen.y, f.privateOptIn ? W - 150 : W, h, fieldFor(f, fname(e, schema.code, 'v', key(f.id)), val, ctx));
      if (f.privateOptIn) {
        box(pen, R - 140, pen.y + 2, 14, 14, { name: fname(e, schema.code, 'v', key(f.id + '__include')), kind: 'check', value: !!entry.state.values[f.id + '__include'] });
        wrap('Include it in the report (it stays just for you otherwise)', 'Helvetica', 7.5, 118).forEach(function (ln, k) { pen.doc.text(R - 120, pen.y + 9 + k * 9.5, ln, 'Helvetica', 7.5, C.soft); });
      }
      pen.y += h + 4;
      if (f.help) { pen.doc.text(L, pen.y + 7, enc(f.help), 'Times-Italic', 8, C.soft); pen.y += 12; }
      pen.y += 6;
    });
  }

  function sheetComputed(pen, entry, sec, ctx) {
    var items = sec.compute(ctx), live = items.filter(function (it) { return !isPrompt(it.value); });
    pen.heading(sec.title, 60, C.mint);
    var lines = [];
    if (live.length) live.forEach(function (it) { lines.push(['b', it.label + ': ']); lines.push(['v', it.value]); if (it.note) lines.push(['n', it.note]); });
    else lines.push(['n', items[0] ? items[0].value : '']);
    lines.push(['n', 'Worked out for you on the website. After filling in this PDF, open it in the Workpaper Suite and this updates.']);
    var blocks = lines.map(function (l) { return { k: l[0], t: wrap(l[1], l[0] === 'b' ? 'Helvetica-Bold' : (l[0] === 'n' ? 'Times-Italic' : 'Helvetica'), l[0] === 'n' ? 8.5 : 9.5, W - 24) }; });
    var h = blocks.reduce(function (a, b) { return a + b.t.length * 12 + (b.k === 'v' ? 4 : 0); }, 0) + 16;
    pen.room(Math.min(h, 300));
    pen.doc.roundRect(L, pen.y, W, h, 8, C.creditSoft);
    var y = pen.y + 12;
    blocks.forEach(function (b) {
      b.t.forEach(function (ln) {
        pen.doc.text(L + 12, y + 3, ln, b.k === 'b' ? 'Helvetica-Bold' : (b.k === 'n' ? 'Times-Italic' : 'Helvetica'), b.k === 'n' ? 8.5 : 9.5, b.k === 'b' ? C.credit : (b.k === 'n' ? C.soft : C.ink));
        y += 12;
      });
      if (b.k === 'v') y += 4;
    });
    pen.y += h + 10;
  }

  function fillSheet(pen, entry, e, opts) {
    var schema = schemaFor(entry.workpaper), ctx = WPK.makeCtx(schema, entry.state);
    pen.page(schema.code + '  ·  ' + schema.title + (entry.label ? '  ·  ' + entry.label : ''));
    pen.y = TOP;
    // the first page of a sheet has no running header
    pen.doc.page.ops.length = 0;
    entry.page = pen.doc.pages.length - 1;
    sheetTitle(pen, entry, e, schema, opts);
    sheetMeta(pen, entry, e, schema, ctx, opts);
    schema.sections.forEach(function (sec) {
      if (sec.type === 'note') { pen.para(sec.text, { font: 'Times-Italic', size: 9.5, color: C.soft, after: 8 }); return; }
      if (sec.type === 'table') sheetTable(pen, entry, e, sec, schema, ctx, opts);
      else if (sec.type === 'scale' || sec.type === 'checks') sheetScale(pen, entry, e, sec, schema, ctx, sec.type);
      else if (sec.type === 'fields') sheetFields(pen, entry, e, sec, schema, ctx);
      else if (sec.type === 'computed') sheetComputed(pen, entry, sec, ctx);
    });
  }

  /* ------------------------------------------------------------ keepsake sheets */

  function keepSheet(doc, entry) {
    var schema = schemaFor(entry.workpaper);
    var rep = new WPK.Report(schema, entry.state, doc);
    rep.running = schema.code + '  ·  ' + schema.title + (entry.label ? '  ·  ' + entry.label : '');
    doc.page.ops.length = 0; // no running header on a sheet's first page
    rep.y = rep.top;
    entry.page = doc.pages.length - 1;
    if (entry.group) { doc.text(rep.L, rep.y + 8, enc('The Objective Ledger  ·  ' + schema.code + '  ·  ' + entry.group), 'Helvetica', 8, C.brass); rep.y += 16; }
    else { doc.text(rep.L, rep.y + 8, enc('The Objective Ledger  ·  ' + schema.code), 'Helvetica', 8, C.brass); rep.y += 16; }
    doc.text(rep.L, rep.y + 20, enc(schema.title), 'Times-Bold', 21, C.ink);
    rep.y += 30;
    if (entry.label) { doc.text(rep.L, rep.y + 8, enc(entry.label), 'Times-Italic', 11, C.soft); rep.y += 16; }
    doc.line(rep.L, rep.y, rep.R, rep.y, C.brass, 1.2);
    rep.y += 12;
    WPK.renderBody(rep, schema, entry.state);
  }

  /* ------------------------------------------------------------ the front: cover, at a glance, keep close */

  // A link from the front pages to a sheet; its page number is fixed up once the front is assembled.
  function sheetLink(doc, x, y, w, h, page) {
    doc.link(x, y, w, h, page, 0);
    doc.page.links[doc.page.links.length - 1].sheet = true;
  }

  function cover(pen, plan, opts) {
    var d = pen.doc;
    pen.page('');
    d.rect(0, 0, 612, 792, C.paper);
    sprinkle(d, 7, true);
    var path = plan.path;
    d.roundRect(L, 56, W, 120, 18, path ? path.color || C.pink : C.pink);
    d.heart(R - 44, 92, 34, '#FFFFFF');
    d.circle(R - 86, 138, 13, null, '#FFFFFF', 1.6);
    d.circle(R - 90, 134, 2.5, '#FFFFFF');
    d.text(L + 22, 84, enc('THE OBJECTIVE LEDGER  ·  WORKPAPER SUITE'), 'Helvetica-Bold', 8, C.ink);
    d.text(L + 22, 118, enc(opts.fillable ? 'My workpapers, ready to fill in' : 'My workpaper report'), 'Times-Bold', 25, C.ink);
    var sub = (path ? path.label + '. ' + path.blurb : 'Your workpapers, in order.');
    wrap(sub, 'Times-Italic', 11.5, W - 130).slice(0, 2).forEach(function (ln, k) { d.text(L + 22, 140 + k * 14, ln, 'Times-Italic', 11.5, C.ink); });
    pen.y = 196;
    var who = [plan.names && plan.names[0], plan.names && plan.names[1]].filter(Boolean).join(' & ');
    d.text(L, pen.y, enc((who ? 'For ' + who + '  ·  ' : '') + niceDate()), 'Helvetica', 9.5, C.soft);
    pen.y += 22;

    // The road: a winding dashed line with a stop for each sheet.
    var stops = [];
    plan.groups.forEach(function (g) { g.entries.forEach(function (en, i) { stops.push({ g: g, en: en, first: i === 0 }); }); });
    var top = pen.y + 18, avail = 560 - top + 150, gap = Math.max(26, Math.min(48, avail / Math.max(stops.length, 1)));
    var pts = stops.map(function (s, i) { return [L + 60 + (i % 2 ? 26 : 0), top + i * gap]; });
    if (pts.length > 1) d.curve(pts, C.brass, 1.6, [2, 5]);
    stops.forEach(function (s, i) {
      var p = pts[i], n = answers(s.en), done = n > 0;
      d.circle(p[0], p[1], 11, done ? PASTELS[i % PASTELS.length] : '#FFFFFF', C.brass, 1);
      if (done) d.heart(p[0], p[1] + 0.5, 11, C.rose);
      else d.text(p[0] - tw(String(i + 1), 'Helvetica-Bold', 8) / 2, p[1] + 3, enc(String(i + 1)), 'Helvetica-Bold', 8, C.brass);
      if (s.first) d.text(L - 4, p[1] - 14, enc(s.g.title.toUpperCase()), 'Helvetica-Bold', 6.8, C.credit);
      var tx = L + 118, title = s.en.workpaper + '  ' + nameOf(s.en.workpaper) + (s.en.label ? '  ·  ' + s.en.label : '');
      d.text(tx, p[1] - 1, enc(title), 'Helvetica-Bold', 10, C.ink);
      var sub2 = done ? n + (n === 1 ? ' answer so far' : ' answers so far') : (opts.fillable ? 'Ready to fill in' : 'Not started yet');
      d.text(tx, p[1] + 10, enc(sub2 + (s.en.page != null ? '  ·  page ' + (s.en.page + 1 + opts.offset) : '')), 'Helvetica', 8, done ? C.credit : C.soft);
      if (s.en.page != null) sheetLink(d, tx - 4, p[1] - 12, 330, 26, s.en.page);
    });
    pen.y = Math.max(top + stops.length * gap, 600);

    var how = opts.fillable
      ? ['How to use it', 'Tap any box to type, in Adobe Acrobat Reader, your phone\'s Files app, Preview or a browser. Or print it and write by hand.', 'To pick up later, save the PDF, then open it in the Workpaper Suite on the website. Everything you typed comes back in, and the report works itself out.']
      : ['What this is', 'A keepsake of what you\'ve written, grouped the way your road goes. Page 2 has the at-a-glance read.', 'It came from files on your own device and was never sent anywhere.'];
    pen.room(90);
    d.roundRect(L, pen.y, W, 78, 12, '#FFFFFF', C.line, 0.6);
    d.text(L + 14, pen.y + 18, enc(how[0]), 'Times-Bold', 12, C.ink);
    var yy = pen.y + 32;
    [how[1], how[2]].forEach(function (t) { wrap(t, 'Helvetica', 8.8, W - 28).forEach(function (ln) { d.text(L + 14, yy, ln, 'Helvetica', 8.8, C.ink); yy += 11.5; }); yy += 2; });
    if (path && path.care) { pen.y += 86; d.text(L, pen.y + 4, enc(path.care), 'Times-Italic', 9.5, C.soft); }
  }

  function glance(pen, plan, entries, opts) {
    var started = entries.filter(function (en) { return answers(en) > 0; });
    if (!started.length) return;
    pen.page('Your report, at a glance');
    pen.doc.bookmark('At a glance', 0);
    sprinkle(pen.doc, 3, false);
    pen.kicker('YOUR REPORT, AT A GLANCE');
    pen.doc.text(L, pen.y + 18, enc(plan.path ? plan.path.label + ': where things stand' : 'Where things stand'), 'Times-Bold', 20, C.ink);
    pen.y += 30;
    var total = entries.length, doneN = started.length;
    // progress bubbles
    for (var i = 0; i < total; i++) pen.doc.circle(L + 7 + i * 17, pen.y + 7, 6.5, i < doneN ? PASTELS[i % PASTELS.length] : '#FFFFFF', C.brass, 0.7);
    pen.doc.text(L + total * 17 + 8, pen.y + 10, enc(doneN + ' of ' + total + ' sheets started'), 'Helvetica', 9, C.soft);
    pen.y += 26;
    pen.para('Each read describes how things are set up and shared, never either person. Use it to start a conversation, not to end one.', { font: 'Times-Italic', size: 9.5, color: C.soft, after: 8 });

    plan.groups.forEach(function (g, gi) {
      pen.heading(g.title, 50, PASTELS[gi % PASTELS.length]);
      if (g.note) pen.para(g.note, { size: 8.5, color: C.soft, after: 4 });
      if (g.along && g.along.length) pen.para('Read and try alongside: ' + g.along.map(function (a) { return a[0]; }).join('  \u00B7  '), { size: 8.5, color: C.credit, after: 4 });
      g.entries.forEach(function (en) {
        var n = answers(en), res = n ? results(en).slice(0, 4) : [];
        var title = en.workpaper + '  ' + nameOf(en.workpaper) + (en.label ? '  ·  ' + en.label : '');
        pen.room(30 + res.length * 14);
        pen.doc.text(L + 14, pen.y + 10, enc(title), 'Helvetica-Bold', 9.5, C.ink);
        var st = n ? n + (n === 1 ? ' answer' : ' answers') : 'Not started';
        pen.doc.roundRect(R - tw(st, 'Helvetica', 7.5) - 14, pen.y + 1, tw(st, 'Helvetica', 7.5) + 12, 13, 6.5, n ? C.mint : C.head);
        pen.doc.text(R - tw(st, 'Helvetica', 7.5) - 8, pen.y + 10.5, enc(st), 'Helvetica', 7.5, C.ink);
        if (en.page != null) sheetLink(pen.doc, L + 10, pen.y, W - 100, 16, en.page);
        pen.y += 17;
        res.forEach(function (it) {
          var lines = wrap(it.label + ':  ' + String(it.value).replace(/\n/g, '  ·  '), 'Helvetica', 8.5, W - 40).slice(0, 3);
          lines.forEach(function (ln) { pen.room(12); pen.doc.text(L + 26, pen.y + 8, ln, 'Helvetica', 8.5, C.soft); pen.y += 11.5; });
        });
        pen.y += 6;
      });
    });

    // Over time: the same sheet filled in more than once.
    var byWp = {};
    entries.forEach(function (en) { var v = metric(en); if (v != null) (byWp[en.workpaper] = byWp[en.workpaper] || []).push({ en: en, v: v }); });
    var trends = Object.keys(byWp).filter(function (k) { return byWp[k].length > 1; });
    if (trends.length) {
      pen.heading('Over time', 80, C.sky);
      pen.para('The same sheet, filled in more than once. A change is worth a conversation; it isn\'t a grade.', { size: 8.5, color: C.soft, after: 6 });
      trends.forEach(function (k) {
        var m = METRICS[k], list = byWp[k].slice(-8), max = m.max || Math.max.apply(null, list.map(function (x) { return x.v; })) || 1;
        pen.room(86);
        pen.doc.text(L + 14, pen.y + 10, enc(k + '  ' + nameOf(k) + '  ·  ' + m.say), 'Helvetica-Bold', 9.5, C.ink);
        pen.y += 18;
        var bw = Math.min(54, (W - 40) / list.length - 8), base = pen.y + 42;
        list.forEach(function (x, i) {
          var h = Math.max(2, 38 * x.v / max), bx = L + 20 + i * (bw + 8);
          pen.doc.roundRect(bx, base - h, bw, h, Math.min(4, h / 2), PASTELS[i % PASTELS.length], C.brass, 0.4);
          var val = String(Math.round(x.v * 100) / 100);
          pen.doc.text(bx + bw / 2 - tw(val, 'Helvetica-Bold', 7.5) / 2, base - h - 3, enc(val), 'Helvetica-Bold', 7.5, C.ink);
          var lab = wrap(shortLabel(x.en, i), 'Helvetica', 6.5, bw + 6)[0] || '';
          pen.doc.text(bx, base + 9, lab, 'Helvetica', 6.5, C.soft);
        });
        var first = list[0].v, last = list[list.length - 1].v, diff = last - first;
        var better = m.good === 'up' ? diff > 0 : diff < 0;
        var say = Math.abs(diff) < 0.005 ? 'Holding steady.' : (better ? 'Moving in a kinder direction.' : 'Worth a gentle look together.');
        pen.doc.text(L + 20 + list.length * (bw + 8) + 6, base - 14, enc(say), 'Times-Italic', 9, better ? C.credit : C.soft);
        pen.y = base + 20;
      });
    }
  }

  // The kind words worth keeping close: appreciations, pause lines, gentle no's, messages.
  function keepClose(pen, plan, entries) {
    var items = { thanks: [], lines: [], refusals: [], messages: [], defaults: [] };
    entries.forEach(function (en) {
      var s = en.state, ctx = ctxOf(en);
      if (!ctx) return;
      if (en.workpaper === 'WP-13') ctx.rows('daily').forEach(function (r) { if (r.thanks) items.thanks.push([r.thanks, [r.day, ctx.name(r.who)].filter(Boolean).join(', ')]); });
      if (en.workpaper === 'WP-11') {
        (s.tables.lines || []).forEach(function (r, i) { if (r.line) items.lines.push([r.line, ctx.name(i ? 'B' : 'A')]); });
        [s.values.first, s.values.second].forEach(function (d) { if (d) items.defaults.push([d, '']); });
      }
      if (en.workpaper === 'WP-01') ctx.rows('refusals').forEach(function (r) { var t = [r.ack, r.cap, r.alt].filter(Boolean).join(' '); if (t) items.refusals.push([t, r.kind || '']); });
      if (en.workpaper === 'WP-09') { var t = [s.values.fact, s.values.feeling, s.values.ask].filter(Boolean).join(' '); if (t) items.messages.push([t, en.label || '']); }
    });
    var groups = [
      ['Kind words you said', 'From your daily check-ins. Worth reading again on a hard day.', items.thanks, C.pink],
      ['Your pause lines', 'Said before a break, so it is never mistaken for walking out.', items.lines, C.lav],
      ['What settles you', 'Your two defaults, decided on a calm day.', items.defaults, C.mint],
      ['Gentle ways to say no', 'Acknowledge, state your capacity, offer an alternative.', items.refusals, C.butter],
      ['Said so it lands', 'Fact, feeling and a clear ask.', items.messages, C.sky]
    ].filter(function (g) {
      var seen = {};
      g[2] = g[2].filter(function (it) { var k = it[0].trim().toLowerCase(); if (seen[k]) return false; seen[k] = true; return true; });
      return g[2].length;
    });
    if (!groups.length) return;
    pen.page('Worth keeping close');
    pen.doc.bookmark('Worth keeping close', 0);
    sprinkle(pen.doc, 11, false);
    pen.kicker('WORTH KEEPING CLOSE');
    pen.doc.text(L, pen.y + 18, enc('The kind words, in one place'), 'Times-Bold', 20, C.ink);
    pen.y += 34;
    groups.forEach(function (g) {
      pen.heading(g[0], 40, g[3]);
      pen.para(g[1], { size: 8.5, color: C.soft, after: 4 });
      g[2].slice(0, 30).forEach(function (it) {
        var lines = wrap('“' + it[0] + '”', 'Times-Italic', 10.5, W - 60), h = lines.length * 13.5 + (it[1] ? 11 : 0) + 12;
        pen.room(h);
        pen.doc.roundRect(L + 12, pen.y, W - 12, h - 4, 8, '#FFFFFF', g[3], 0.8);
        lines.forEach(function (ln, k) { pen.doc.text(L + 24, pen.y + 14 + k * 13.5, ln, 'Times-Italic', 10.5, C.ink); });
        if (it[1]) pen.doc.text(L + 24, pen.y + 14 + lines.length * 13.5, enc(it[1]), 'Helvetica', 7.5, C.soft);
        pen.y += h;
      });
      pen.y += 4;
    });
  }

  function closing(pen, plan) {
    if (!plan.path) return;
    pen.room(130);
    pen.y += 10;
    var tip = plan.tip, h = 64 + (tip ? 50 : 0);
    pen.doc.roundRect(L, pen.y, W, h, 14, C.butter);
    pen.doc.heart(L + 22, pen.y + 22, 16, C.rose);
    pen.doc.text(L + 38, pen.y + 26, enc('Your next small step'), 'Times-Bold', 13, C.ink);
    var y = pen.y + 42;
    wrap(plan.path.next, 'Helvetica', 9.5, W - 50).forEach(function (ln) { pen.doc.text(L + 38, y, ln, 'Helvetica', 9.5, C.ink); y += 12.5; });
    if (tip) {
      y += 6;
      pen.doc.text(L + 38, y, enc('A little tip: ' + tip[1]), 'Helvetica-Bold', 8.5, C.ink); y += 12;
      wrap(tip[2], 'Helvetica', 8.5, W - 50).slice(0, 2).forEach(function (ln) { pen.doc.text(L + 38, y, ln, 'Helvetica', 8.5, C.soft); y += 11; });
    }
    pen.y += h + 8;
  }

  /* ------------------------------------------------------------ assembling a whole PDF */

  // plan: { path, names, groups: [{ title, note, entries: [entry] }] }; entry: { workpaper, state, label, why }
  function assemble(plan, opts) {
    var sheets = new PDF.Doc({}), pen = new Pen(sheets), entries = [];
    plan.groups.forEach(function (g) { g.entries.forEach(function (en) { en.group = g.title; entries.push(en); }); });
    var keep = entries.filter(function (en) { return schemaFor(en.workpaper) && (opts.fillable || answers(en) > 0); });
    var lastGroup = null;
    keep.forEach(function (en, i) {
      if (opts.fillable) fillSheet(pen, en, entries.indexOf(en), { people: plan.people, single: opts.single, blankRows: opts.blankRows });
      else keepSheet(sheets, en);
      if (!opts.single) {
        if (en.group !== lastGroup) { sheets.marks = sheets.marks || []; sheets.marks.push({ title: en.group, level: 0, page: en.page }); lastGroup = en.group; }
        sheets.marks.push({ title: en.workpaper + ' ' + nameOf(en.workpaper) + (en.label ? ' · ' + en.label : ''), level: 1, page: en.page });
      }
    });
    entries.forEach(function (en) { if (keep.indexOf(en) < 0) en.page = null; });

    var front = null;
    if (!opts.single) {
      // Two passes, so the front pages can name the page each sheet starts on.
      var offset = 0;
      for (var pass = 0; pass < 2; pass++) {
        front = new PDF.Doc({});
        var fp = new Pen(front);
        cover(fp, plan, { fillable: opts.fillable, offset: offset });
        front.bookmark('Cover and your road', 0);
        glance(fp, plan, entries, opts);
        keepClose(fp, plan, entries);
        closing(fp, plan);
        offset = front.pages.length;
      }
    }
    var out = new PDF.Doc({ title: opts.title, producer: 'The Objective Ledger (TOL-OS) Workpaper Suite, made on this device', subject: 'tol-workpaper-suite' + (plan.path ? ' path=' + plan.path.id : '') });
    var F = front ? front.pages.length : 0;
    out.pages = (front ? front.pages : []).concat(sheets.pages);
    out.pages.forEach(function (p, i) {
      (p.links || []).forEach(function (l) { if (i >= F || l.sheet) l.page += F; });
    });
    out.marks = (front && front.marks || []).concat((sheets.marks || []).map(function (m) { return { title: m.title, level: m.level, page: m.page + F }; }));
    if (!out.marks.length) out.marks = null;
    if (opts.fillable && plan.path) {
      out.setPage(0);
      out.field({ name: FIELD_PREFIX + 'path', kind: 'text', value: plan.path.id, x: 0, y: 0, w: 1, h: 1, hidden: true });
    }
    footers(out, opts);
    return out.output();
  }

  function fillable(entries, opts) {
    opts = opts || {};
    if (opts.plan) return assemble(opts.plan, { fillable: true, title: opts.title || 'My Workpaper Suite (fillable)', blankRows: opts.blankRows });
    var plan = { groups: [{ title: '', entries: entries }] };
    return assemble(plan, { fillable: true, single: true, title: (schemaFor(entries[0].workpaper) || {}).title + ' (fillable)' });
  }
  function report(plan, opts) {
    opts = opts || {};
    return assemble(plan, { fillable: false, title: opts.title || 'My Workpaper Report' });
  }

  /* ------------------------------------------------------------ reading a filled-in PDF back */

  function toLatin1(u8) {
    var out = '', CH = 0x8000;
    for (var i = 0; i < u8.length; i += CH) out += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
    return out;
  }
  function inflate(latin) {
    if (typeof DecompressionStream === 'undefined') return Promise.resolve('');
    var u8 = new Uint8Array(latin.length);
    for (var i = 0; i < latin.length; i++) u8[i] = latin.charCodeAt(i);
    var ds = new DecompressionStream('deflate');
    return new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer()
      .then(function (b) { return toLatin1(new Uint8Array(b)); }, function () { return ''; });
  }

  function pdfString(tok) {
    var bytes = '';
    if (tok.charAt(0) === '<') {
      var hex = tok.slice(1, -1).replace(/\s+/g, '');
      if (hex.length % 2) hex += '0';
      for (var i = 0; i < hex.length; i += 2) bytes += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    } else {
      var s = tok.slice(1, -1);
      for (var j = 0; j < s.length; j++) {
        var c = s.charAt(j);
        if (c !== '\\') { bytes += c; continue; }
        var n = s.charAt(++j);
        if (n === 'n') bytes += '\n'; else if (n === 'r') bytes += '\r'; else if (n === 't') bytes += '\t';
        else if (n === 'b') bytes += '\b'; else if (n === 'f') bytes += '\f';
        else if (n === '\r') { if (s.charAt(j + 1) === '\n') j++; }
        else if (n === '\n') { /* line continuation */ }
        else if (/[0-7]/.test(n)) { var oct = n; while (oct.length < 3 && /[0-7]/.test(s.charAt(j + 1))) oct += s.charAt(++j); bytes += String.fromCharCode(parseInt(oct, 8) & 0xFF); }
        else bytes += n;
      }
    }
    if (bytes.charCodeAt(0) === 0xFE && bytes.charCodeAt(1) === 0xFF) {
      var out = '';
      for (var k = 2; k + 1 < bytes.length; k += 2) out += String.fromCharCode((bytes.charCodeAt(k) << 8) | bytes.charCodeAt(k + 1));
      return out;
    }
    if (bytes.charCodeAt(0) === 0xEF && bytes.charCodeAt(1) === 0xBB && bytes.charCodeAt(2) === 0xBF) {
      try { return decodeURIComponent(escape(bytes.slice(3))); } catch (e) { return bytes.slice(3); }
    }
    return bytes;
  }

  // Walk every dictionary in a chunk of PDF text; report the direct /T and /V of each.
  function scanDicts(str, found) {
    var stack = [], i = 0, n = str.length;
    while (i < n) {
      var c = str.charAt(i);
      if (c === '(') {
        var depth = 1; i++;
        while (i < n && depth) { var d = str.charAt(i); if (d === '\\') i++; else if (d === '(') depth++; else if (d === ')') depth--; i++; }
        continue;
      }
      if (c === '%') { while (i < n && str.charAt(i) !== '\n' && str.charAt(i) !== '\r') i++; continue; }
      if (c === '<') {
        if (str.charAt(i + 1) === '<') { stack.push(i); i += 2; continue; }
        var e = str.indexOf('>', i); i = e < 0 ? n : e + 1; continue;
      }
      if (c === '>' && str.charAt(i + 1) === '>') {
        var start = stack.pop();
        if (start != null) topEntries(str.slice(start + 2, i), found);
        i += 2; continue;
      }
      i++;
    }
  }
  function topEntries(body, found) {
    var i = 0, n = body.length, keyName = null, entries = {};
    function skipWs() { while (i < n && /\s/.test(body.charAt(i))) i++; }
    function readValue() {
      var c = body.charAt(i), s = i;
      if (c === '(') { var depth = 1; i++; while (i < n && depth) { var d = body.charAt(i); if (d === '\\') i++; else if (d === '(') depth++; else if (d === ')') depth--; i++; } return body.slice(s, i); }
      if (c === '<' && body.charAt(i + 1) === '<') { var dd = 1; i += 2; while (i < n && dd) { if (body.charAt(i) === '(') { readValue(); continue; } if (body.substr(i, 2) === '<<') { dd++; i += 2; } else if (body.substr(i, 2) === '>>') { dd--; i += 2; } else i++; } return '<<>>'; }
      if (c === '<') { var e = body.indexOf('>', i); i = e < 0 ? n : e + 1; return body.slice(s, i); }
      if (c === '[') { var ad = 1; i++; while (i < n && ad) { var a = body.charAt(i); if (a === '(') { readValue(); continue; } if (a === '[') ad++; else if (a === ']') ad--; i++; } return '[]'; }
      if (c === '/') { i++; while (i < n && !/[\s\/\[\]<>()]/.test(body.charAt(i))) i++; return body.slice(s, i); }
      while (i < n && !/[\/\[\]<>()]/.test(body.charAt(i))) i++;
      return body.slice(s, i).trim();
    }
    while (i < n) {
      skipWs();
      if (i >= n) break;
      if (body.charAt(i) === '/') {
        i++; var ks = i; while (i < n && !/[\s\/\[\]<>()]/.test(body.charAt(i))) i++;
        keyName = body.slice(ks, i); skipWs();
        if (i < n) entries[keyName] = readValue();
      } else i++;
    }
    if (!entries.T || !/^[(<]/.test(entries.T)) return;
    var t = pdfString(entries.T);
    if (t.indexOf(FIELD_PREFIX) !== 0) return;
    var v = entries.V, val;
    if (v == null) v = entries.AS;
    if (v == null) return;
    if (v.charAt(0) === '/') val = { name: v.slice(1) };
    else if (/^[(<]/.test(v) && v.substr(0, 2) !== '<<') val = pdfString(v);
    else return;
    found[t] = val;
  }

  function isoDate(v) {
    v = String(v || '').trim();
    if (!v || /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    var m = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
    if (m) { var y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return y + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2); }
    var t = Date.parse(v);
    if (!isNaN(t)) { var d = new Date(t); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    return v;
  }

  function rebuild(found) {
    var byE = {}, path = null;
    Object.keys(found).forEach(function (name) {
      var parts = name.slice(FIELD_PREFIX.length).split('~');
      if (parts[0] === 'path') { path = found[name]; return; }
      var e = parts[0], code = parts[1];
      if (!schemaFor(code)) return;
      var en = byE[e] || (byE[e] = { workpaper: code, raw: { values: {}, tables: {} }, label: '', order: +e });
      var v = found[name];
      if (parts[2] === 'label') { en.label = typeof v === 'string' ? v.trim() : ''; return; }
      if (parts[2] === 'v') en.raw.values[parts[3].replace(/!/g, '.')] = v;
      if (parts[2] === 't') {
        var rows = en.raw.tables[parts[3]] || (en.raw.tables[parts[3]] = []);
        var r = +parts[4];
        while (rows.length <= r) rows.push({});
        rows[r][parts[5]] = v;
      }
    });
    var entries = Object.keys(byE).map(function (k) { return byE[k]; }).sort(function (a, b) { return a.order - b.order; }).map(function (en) {
      var schema = schemaFor(en.workpaper), raw = en.raw, names = { A: raw.values.partnerA, B: raw.values.partnerB };
      function plain(def, v) {
        if (v && typeof v === 'object') v = v.name;
        if (def.type === 'check') return !!v && v !== 'Off';
        if (v == null) return '';
        v = String(v);
        if (def.type === 'person' && v) { if (v === names.A) return 'A'; if (v === names.B) return 'B'; }
        if (def.type === 'date') return isoDate(v);
        return v;
      }
      var defs = {};
      (schema.meta || []).forEach(function (f) { defs[f.id] = f; });
      schema.sections.forEach(function (s) {
        if (s.type === 'fields') s.fields.forEach(function (f) { defs[f.id] = f; if (f.privateOptIn) defs[f.id + '__include'] = { type: 'check' }; });
        if (s.type === 'scale' || s.type === 'checks') s.items.forEach(function (it) { defs[s.id + '.' + it.id] = { type: 'text' }; });
        if (s.type === 'table') (raw.tables[s.id] || []).forEach(function (row) {
          s.columns.forEach(function (c) { if (row.hasOwnProperty(c.id)) row[c.id] = plain(c, row[c.id]); });
        });
      });
      Object.keys(raw.values).forEach(function (k) { raw.values[k] = plain(defs[k] || { type: 'text' }, raw.values[k]); });
      var state = WPK.sanitize(schema, raw);
      // Keep only a single trailing blank row on growable tables.
      schema.sections.forEach(function (s) {
        if (s.type !== 'table' || s.fixedRows) return;
        var rows = state.tables[s.id], min = (s.defaultRows || []).length;
        while (rows.length > Math.max(min, 1) && WPK.rowIsEmpty(s, rows[rows.length - 1])) rows.pop();
      });
      return { workpaper: en.workpaper, label: en.label, state: state };
    });
    entries.path = typeof path === 'string' ? path : null;
    return entries;
  }

  function readFilled(file) {
    if (file.size > 40 * 1024 * 1024) return Promise.reject(new Error('too large'));
    return file.arrayBuffer().then(function (buf) {
      var latin = toLatin1(new Uint8Array(buf));
      if (latin.slice(0, 1024).indexOf('%PDF') < 0) throw new Error('not a pdf');
      // Split into plain parts and stream bodies, in file order; open compressed object streams.
      var parts = [], re = /stream\r?\n/g, last = 0, m;
      while ((m = re.exec(latin))) {
        var s = m.index + m[0].length, e = latin.indexOf('endstream', s);
        if (e < 0) break;
        var before = latin.slice(Math.max(last, m.index - 600), m.index);
        parts.push({ text: latin.slice(last, m.index) });
        var objStart = before.lastIndexOf(' obj');
        var dict = objStart >= 0 ? before.slice(objStart) : before;
        if (/\/ObjStm/.test(dict) && /\/FlateDecode/.test(dict)) {
          var data = latin.slice(s, e).replace(/\r?\n$/, '');
          parts.push({ z: data });
        }
        last = e + 9; re.lastIndex = last;
      }
      parts.push({ text: latin.slice(last) });
      return Promise.all(parts.map(function (p) { return p.z != null ? inflate(p.z) : p.text; }));
    }).then(function (texts) {
      var found = {};
      texts.forEach(function (t) { if (t && t.indexOf('/T') >= 0) scanDicts(t, found); });
      return rebuild(found);
    });
  }

  global.TOLSuitePDF = { fillable: fillable, report: report, readFilled: readFilled, answers: answers, results: results, metric: metric, labelOf: labelOf, nameOf: nameOf, schemaFor: schemaFor, METRICS: METRICS };
})(typeof window !== 'undefined' ? window : globalThis);
