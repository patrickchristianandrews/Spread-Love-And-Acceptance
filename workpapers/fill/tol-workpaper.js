/*
  tol-workpaper.js — The Objective Ledger (TOL-OS)
  Renders a fill-in workpaper from tol-workpaper-schemas.js and turns the
  entries into a PDF with tol-pdf.js.

  Privacy by design:
  - Nothing is sent anywhere. There are no network requests in this file,
    and the page's Content-Security-Policy blocks them (connect-src 'none').
  - Nothing is stored in the browser unless the person ticks "Keep a draft on
    this device". Then one draft per worksheet is kept in localStorage, on this
    device only, until they press "Erase". No cookies, no IndexedDB.
  - Inputs have autocomplete off, so the browser doesn't remember entries.
  - The other copies are the files the person chooses to download: the PDF,
    and an optional draft file (.json) they can reopen later to keep working.

  People: a worksheet with people:true holds 2 to 8 people, coded A to H
  (1 to 8 on the Workpaper Suite's "Just me" road, see setMinPeople).
  Their names live in values.partnerA … values.partnerH (so drafts saved when
  there were only "Partner A" and "Partner B" still open), and
  values.peopleCount says how many there are. Tables whose fixed rows are
  ['@A', '@B'] get one row per person.
*/
(function (global) {
  'use strict';

  var COLORS = {
    ink: '#211D17', soft: '#524B3E', line: '#D9CBA3', brass: '#A8792F',
    head: '#F3ECD9', credit: '#3E6B4C', creditSoft: '#EAF1E9'
  };
  var DRAFT_FORMAT = 'tol-workpaper-draft';
  var DRAFT_VERSION = 1;
  var CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  var MIN_PEOPLE = 2, MAX_PEOPLE = CODES.length;
  // The fewest people a sheet holds. The Workpaper Suite lowers it to 1 on the "Just me" road.
  var minPeople = MIN_PEOPLE;
  function setMinPeople(n) { minPeople = n === 1 ? 1 : MIN_PEOPLE; }
  var KEEP_PREFIX = 'tol-wpf-keep:';

  /* ------------------------------------------------------------ people */

  // What an unnamed person is called. The Workpaper Suite swaps in its road's words ("You", "Teammate 2").
  var labelFor = function (i) { return 'Person ' + CODES[i]; };
  function setDefaultLabels(fn) { labelFor = typeof fn === 'function' ? fn : function (i) { return 'Person ' + CODES[i]; }; }

  function peopleCount(values) {
    values = values || {};
    var n = Math.max(minPeople, Math.min(MAX_PEOPLE, parseInt(values.peopleCount, 10) || 0));
    CODES.forEach(function (c, i) { if (String(values['partner' + c] || '').trim()) n = Math.max(n, i + 1); });
    return n;
  }
  function isPersonRows(fr) { return !!fr && fr[0] === '@A' && fr[1] === '@B'; }
  // The fixed row labels a table shows for this state: one per person for ['@A', '@B'] tables.
  function fixedRowsFor(sec, state) {
    if (!sec.fixedRows) return null;
    if (!isPersonRows(sec.fixedRows)) return sec.fixedRows;
    return CODES.slice(0, peopleCount(state && state.values)).map(function (c) { return '@' + c; });
  }
  // Give every per-person table a row for each person.
  function syncPeople(schema, state) {
    schema.sections.forEach(function (s) {
      if (s.type === 'table' && s.personDays) { fitDays(s, state); return; }
      if (s.type !== 'table' || !s.fixedRows) return;
      var fr = fixedRowsFor(s, state), rows = state.tables[s.id] || (state.tables[s.id] = []);
      while (rows.length < fr.length) rows.push({});
    });
  }
  // A day-by-day table (WP-13) gets one row for each person on each day, in order, however many
  // people there are. Anything already written stays; empty rows for someone taken off go.
  function fitDays(s, state) {
    var codes = CODES.slice(0, peopleCount(state.values)), rows = state.tables[s.id] || [], used = rows.map(function () { return false; }), out = [];
    s.personDays.forEach(function (d) {
      codes.forEach(function (c) {
        var hit = -1;
        rows.forEach(function (r, i) { if (hit < 0 && !used[i] && r && r.day === d && r.who === c) hit = i; });
        if (hit >= 0) { used[hit] = true; out.push(rows[hit]); } else out.push({ day: d, who: c });
      });
    });
    rows.forEach(function (r, i) { if (!used[i] && r && !rowIsEmpty(s, r)) out.push(r); });
    state.tables[s.id] = out;
  }
  function addPerson(schema, state) {
    var n = peopleCount(state.values);
    if (n >= MAX_PEOPLE) return false;
    state.values.peopleCount = n + 1;
    if (state.values['partner' + CODES[n]] == null) state.values['partner' + CODES[n]] = '';
    syncPeople(schema, state);
    return true;
  }
  // Take person i out, and move everyone after them up one place, everywhere in the sheet.
  function removePerson(schema, state, idx) {
    var n = peopleCount(state.values);
    if (n <= minPeople || idx < 0 || idx >= n) return false;
    for (var k = idx; k < n - 1; k++) state.values['partner' + CODES[k]] = state.values['partner' + CODES[k + 1]] || '';
    delete state.values['partner' + CODES[n - 1]];
    state.values.peopleCount = n - 1;
    function remap(v) {
      var j = CODES.indexOf(v);
      if (j < 0) return v;
      return j === idx ? '' : j > idx ? CODES[j - 1] : v;
    }
    schema.sections.forEach(function (s) {
      if (s.type !== 'table') return;
      var rows = state.tables[s.id] || [];
      if (s.fixedRows && isPersonRows(s.fixedRows)) { if (rows.length > idx) rows.splice(idx, 1); }
      var cols = s.columns.filter(function (c) { return c.type === 'person'; });
      if (cols.length) rows.forEach(function (r) { cols.forEach(function (c) { if (r[c.id]) r[c.id] = remap(r[c.id]); }); });
    });
    syncPeople(schema, state);
    return true;
  }
  // Everyone who can be picked in a person drop-down, in alphabetical order, then "Both"/"Everyone"
  // (left off when there is only one person).
  function personOptions(ctx, def) {
    var list = ctx.people().map(function (c) { return { v: c, l: ctx.name(c), person: c }; });
    list.sort(function (a, b) { return a.l.localeCompare(b.l, undefined, { sensitivity: 'base', numeric: true }); });
    if (def && def.both && list.length > 1) list.push({ v: 'Both', l: ctx.name('Both'), person: 'Both' });
    return list;
  }

  /* ------------------------------------------------------------ state + ctx */

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function blankState(schema) {
    var st = { values: { partnerA: '', partnerB: '' }, tables: {} };
    schema.sections.forEach(function (s) {
      if (s.type === 'table') {
        st.tables[s.id] = s.fixedRows ? s.fixedRows.map(function () { return {}; }) : clone(s.defaultRows || [{}]);
      }
    });
    return st;
  }

  // A clean copy of a saved state: only this workpaper's fields, only plain values.
  function sanitize(schema, raw) {
    var fresh = blankState(schema);
    raw = raw && typeof raw === 'object' ? raw : {};
    var values = raw.values && typeof raw.values === 'object' ? raw.values : {}, tables = raw.tables && typeof raw.tables === 'object' ? raw.tables : {};
    Object.keys(values).forEach(function (k) { if (values[k] != null && typeof values[k] !== 'object') fresh.values[k] = values[k]; });
    schema.sections.forEach(function (s) {
      if (s.type !== 'table' || !Array.isArray(tables[s.id])) return;
      var rows = tables[s.id].filter(function (r) { return r && typeof r === 'object'; }).map(function (r) {
        var clean = {};
        s.columns.forEach(function (c) { if (r[c.id] != null && typeof r[c.id] !== 'object') clean[c.id] = r[c.id]; });
        return clean;
      });
      if (s.fixedRows) rows = fixedRowsFor(s, fresh).map(function (_, i) { return rows[i] || {}; });
      fresh.tables[s.id] = rows.length ? rows : [{}];
    });
    return fresh;
  }

  // How much of a sheet has been filled in: the number of answers given. Boxes the page fills in
  // for you (a day, a person's row, how many people are on the road) don't count as answers.
  function answered(schema, state) {
    var n = 0, blank = blankState(schema);
    schema.sections.forEach(function (s) {
      if (s.type === 'table') (state.tables[s.id] || []).forEach(function (r, i) {
        var d = (blank.tables[s.id] || [])[i] || {};
        if (s.columns.some(function (c) { return c.type !== 'computed' && !c.prefill && !isBlank(r[c.id]) && r[c.id] !== d[c.id]; })) n++;
      });
      else if (s.type === 'scale' || s.type === 'checks') s.items.forEach(function (it) { if (!isBlank(state.values[s.id + '.' + it.id])) n++; });
      else if (s.type === 'fields') s.fields.forEach(function (f) { if (!f.prefill && !isBlank(state.values[f.id])) n++; });
    });
    return n;
  }
  // A number outside the range its box allows (a 7 in a 0 to 1 box, a negative minute) is left out
  // of every sum and flagged on the page. Returns a short message, or '' when the value is fine or blank.
  function rangeProblem(def, v) {
    if (!def || def.type !== 'number' || isBlank(v)) return '';
    var n = parseFloat(v), lo = def.min, hi = def.max;
    if (!isFinite(n)) return '“' + v + '” isn’t a number, so it is left out.';
    if ((lo != null && n < lo) || (hi != null && n > hi)) return v + ' is outside ' + (lo != null ? lo : '') + ' to ' + (hi != null ? String(hi).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '') + ', so it is left out. ' + (def.rangeNote || '');
    return '';
  }

  // A choice can show different words from the value it stores (item.labels), so saved answers still open.
  function optionLabel(item, v) { return item && item.labels && item.labels[v] ? item.labels[v] : v; }

  function isBlank(v) { return v === undefined || v === null || v === '' || v === false; }

  function rowIsEmpty(section, row) {
    return section.columns.every(function (c) {
      return c.prefill || c.type === 'computed' || isBlank(row[c.id]);
    });
  }

  function makeCtx(schema, state) {
    var byId = {};
    schema.sections.forEach(function (s) { if (s.id) byId[s.id] = s; });
    return {
      value: function (id) { var v = state.values[id]; return v == null ? '' : v; },
      rows: function (tableId) {
        var s = byId[tableId];
        return (state.tables[tableId] || []).filter(function (r) { return !rowIsEmpty(s, r); });
      },
      name: function name(p) {
        var i = CODES.indexOf(p);
        if (i >= 0) return String(state.values['partner' + p] || '').trim() || labelFor(i);
        if (p === 'Both') { var pc = peopleCount(state.values); return pc > 2 ? 'Everyone' : pc === 1 ? name('A') : 'Both'; }
        return '';
      },
      count: function () { return peopleCount(state.values); },
      people: function () { return CODES.slice(0, peopleCount(state.values)); }
    };
  }

  function rowLabel(label, ctx) {
    return typeof label === 'string' && /^@[A-H]$/.test(label) ? ctx.name(label.slice(1)) : label;
  }

  function formatDate(v) {
    if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return v || '';
    var p = v.split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  }

  function displayCell(col, row, ctx) {
    var v = row[col.id];
    if (col.type === 'computed') return col.compute(row);
    if (col.type === 'person') return ctx.name(v);
    if (col.type === 'select' && col.labels && col.labels[v]) return col.labels[v];
    if (col.type === 'check') return v ? (col.pdfTrue || 'Yes') : '';
    if (col.type === 'date') return formatDate(v);
    return v == null ? '' : String(v);
  }

  function today() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  /* ------------------------------------------------------------ PDF layout */

  // doc is optional: pass one to add this workpaper to a larger PDF (the Workpaper Suite).
  function Report(schema, state, doc) {
    this.schema = schema;
    this.ctx = makeCtx(schema, state);
    this.doc = doc || new global.TOLPDF.Doc({ title: schema.code + ' ' + schema.title, producer: 'The Objective Ledger (TOL-OS) worksheet, generated on this device' });
    this.L = 54; this.R = 558; this.W = this.R - this.L;
    this.top = 54; this.bottom = 730;
    this.newPage();
  }
  var P = Report.prototype;
  P.wrap = function (t, f, s, w) { return global.TOLPDF.wrap(t, f, s, w); };
  P.enc = function (t) { return global.TOLPDF.encode(t); };

  P.newPage = function () {
    this.doc.addPage();
    this.y = this.top;
    if (this.doc.pages.length > 1) {
      this.doc.text(this.L, this.y + 6, this.enc(this.running || (this.schema.code + '  ·  ' + this.schema.title)), 'Helvetica', 7.5, COLORS.soft);
      this.doc.line(this.L, this.y + 12, this.R, this.y + 12, COLORS.line, 0.5);
      this.y += 26;
    }
  };
  P.ensure = function (h, onBreak) {
    if (this.y + h > this.bottom) { this.newPage(); if (onBreak) onBreak(); return true; }
    return false;
  };
  P.paragraph = function (text, opt) {
    opt = opt || {};
    var font = opt.font || 'Helvetica', size = opt.size || 9.5, lh = size * 1.4, x = this.L + (opt.indent || 0);
    var lines = this.wrap(text, font, size, this.W - (opt.indent || 0));
    var self = this;
    lines.forEach(function (ln) {
      self.ensure(lh);
      self.doc.text(x, self.y + size, ln, font, size, opt.color || COLORS.ink);
      self.y += lh;
    });
    this.y += opt.after == null ? 6 : opt.after;
  };

  P.titleBlock = function () {
    var d = this.doc, s = this.schema;
    d.text(this.L, this.y + 8, this.enc('The Objective Ledger  ·  ' + s.code + (s.plain && s.plain !== s.title ? '  ·  ' + s.title : '')), 'Helvetica', 8, COLORS.brass);
    this.y += 16;
    d.text(this.L, this.y + 20, this.enc(s.plain || s.title), 'Times-Bold', 21, COLORS.ink);
    this.y += 30;
    d.line(this.L, this.y, this.R, this.y, COLORS.brass, 1.2);
    this.y += 12;
    this.paragraph(s.purpose, { size: 9.5, color: COLORS.soft, after: 10 });
  };

  // keep = extra space that must fit with the heading, so it isn't stranded at a page end.
  P.heading = function (text, keep) {
    this.ensure(30 + (keep || 16));
    this.y += 8;
    this.doc.text(this.L, this.y + 13, this.enc(text), 'Times-Bold', 13.5, COLORS.ink);
    this.y += 22;
  };

  // Label/value pairs in two columns.
  P.pairs = function (pairs) {
    var colW = (this.W - 18) / 2, self = this;
    for (var i = 0; i < pairs.length; i += 2) {
      var row = pairs.slice(i, i + 2);
      var blocks = row.map(function (p) { return self.wrap(p[1] || ' ', 'Helvetica', 10, colW); });
      var h = 12 + Math.max.apply(null, blocks.map(function (b) { return b.length; })) * 13 + 8;
      this.ensure(h);
      row.forEach(function (p, j) {
        var x = self.L + j * (colW + 18);
        self.doc.text(x, self.y + 8, self.enc(p[0]), 'Helvetica-Bold', 7.5, COLORS.soft);
        blocks[j].forEach(function (ln, k) { self.doc.text(x, self.y + 21 + k * 13, ln, 'Helvetica', 10, COLORS.ink); });
        self.doc.line(x, self.y + h - 4, x + colW, self.y + h - 4, COLORS.line, 0.5);
      });
      this.y += h + 2;
    }
    this.y += 4;
  };

  P.longField = function (label, value) {
    this.ensure(34);
    this.doc.text(this.L, this.y + 8, this.enc(label), 'Helvetica-Bold', 7.5, COLORS.soft);
    this.y += 13;
    this.paragraph(value || '—', { size: 10, after: 8 });
  };

  // A table with wrapped cells; the header repeats after a page break.
  P.table = function (columns, rows) {
    var self = this, pad = 4, fs = 9, lh = 11.5;
    var totalW = columns.reduce(function (a, c) { return a + (c.w || 1); }, 0);
    var widths = columns.map(function (c) { return self.W * (c.w || 1) / totalW; });
    var headLines = columns.map(function (c, i) { return self.wrap(c.label, 'Helvetica-Bold', 7.5, widths[i] - pad * 2); });
    var headH = Math.max.apply(null, headLines.map(function (l) { return l.length; })) * 9.5 + pad * 2 + 2;

    function drawHead() {
      var x = self.L;
      self.doc.rect(self.L, self.y, self.W, headH, COLORS.head);
      headLines.forEach(function (lines, i) {
        lines.forEach(function (ln, k) { self.doc.text(x + pad, self.y + pad + 7 + k * 9.5, ln, 'Helvetica-Bold', 7.5, COLORS.soft); });
        x += widths[i];
      });
      self.doc.line(self.L, self.y + headH, self.R, self.y + headH, COLORS.brass, 0.75);
      self.y += headH;
    }

    this.ensure(headH + lh + pad * 2);
    drawHead();
    rows.forEach(function (cells) {
      var wrapped = cells.map(function (t, i) { return self.wrap(t || '', 'Helvetica', fs, widths[i] - pad * 2); });
      var h = Math.max.apply(null, wrapped.map(function (l) { return l.length; })) * lh + pad * 2;
      self.ensure(h, drawHead);
      var x = self.L;
      wrapped.forEach(function (lines, i) {
        lines.forEach(function (ln, k) { self.doc.text(x + pad, self.y + pad + 8.5 + k * lh, ln, 'Helvetica', fs, COLORS.ink); });
        x += widths[i];
      });
      self.y += h;
      self.doc.line(self.L, self.y, self.R, self.y, COLORS.line, 0.5);
    });
    this.y += 12;
  };

  // Calculated results, in a tinted box.
  P.box = function (items) {
    var self = this, pad = 10, labelW = 150, valW = this.W - labelW - pad * 3;
    var blocks = items.map(function (it) {
      var v = self.wrap(it.value || '', 'Helvetica', 9.5, valW);
      var n = it.note ? self.wrap(it.note, 'Times-Italic', 9, valW) : [];
      var l = self.wrap(it.label || '', 'Helvetica-Bold', 8.5, labelW);
      return { v: v, n: n, l: l, h: Math.max(l.length * 11, v.length * 12.5 + n.length * 11.5) + 8 };
    });
    var total = blocks.reduce(function (a, b) { return a + b.h; }, 0) + pad * 2 - 8;
    if (total < this.bottom - this.top - 40) this.ensure(total);
    var startY = this.y, startPage = this.doc.pages.length;
    this.doc.rect(this.L, this.y, this.W, Math.min(total, this.bottom - this.y), COLORS.creditSoft);
    this.doc.line(this.L, this.y, this.L, this.y + Math.min(total, this.bottom - this.y), COLORS.credit, 2);
    this.y += pad;
    blocks.forEach(function (b) {
      self.ensure(b.h);
      var x = self.L + pad;
      b.l.forEach(function (ln, k) { self.doc.text(x, self.y + 9 + k * 11, ln, 'Helvetica-Bold', 8.5, COLORS.credit); });
      var vx = self.L + labelW + pad * 2, yy = self.y;
      b.v.forEach(function (ln) { self.doc.text(vx, yy + 9.5, ln, 'Helvetica', 9.5, COLORS.ink); yy += 12.5; });
      b.n.forEach(function (ln) { self.doc.text(vx, yy + 9, ln, 'Times-Italic', 9, COLORS.soft); yy += 11.5; });
      self.y += b.h;
    });
    this.y += pad + 4;
    void startY; void startPage;
  };

  P.footers = function () {
    var d = this.doc, n = d.pages.length, self = this;
    var created = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    for (var i = 0; i < n; i++) {
      d.setPage(i);
      d.line(self.L, 744, self.R, 744, COLORS.line, 0.5);
      d.text(self.L, 756, self.enc('Created on this device, ' + created + '. Nothing entered was sent to or stored by the website. Keep this file somewhere private.'), 'Helvetica', 7, COLORS.soft);
      d.text(self.L, 766, self.enc('A self-reflection worksheet, not a clinical tool. It describes the arrangement, never either person.'), 'Helvetica', 7, COLORS.soft);
      var pg = self.enc('Page ' + (i + 1) + ' of ' + n);
      d.text(self.R - global.TOLPDF.textWidth(pg, 'Helvetica', 7), 766, pg, 'Helvetica', 7, COLORS.soft);
    }
  };

  function buildPdf(schema, state) {
    var R = new Report(schema, state);
    R.titleBlock();
    renderBody(R, schema, state);
    R.footers();
    return R.doc.output();
  }

  // Everything after the title: names, sections, tables and results.
  function renderBody(R, schema, state) {
    var ctx = R.ctx;

    var meta = [];
    if (schema.people) ctx.people().forEach(function (c, i) { meta.push([labelFor(i), ctx.name(c)]); });
    (schema.meta || []).forEach(function (f) {
      meta.push([f.label, f.type === 'date' ? formatDate(state.values[f.id]) : (state.values[f.id] || '')]);
    });
    if (meta.length) R.pairs(meta);

    schema.sections.forEach(function (s) {
      if (s.type === 'note') { if (s.pdf) R.paragraph(s.text, { font: 'Times-Italic', size: 10, color: COLORS.soft, after: 10 }); return; }

      if (s.type === 'table') {
        var rows = state.tables[s.id] || [];
        var cells;
        if (s.fixedRows) {
          var cols = [{ label: '', w: 1.6 }].concat(s.columns), fr = fixedRowsFor(s, state);
          cells = fr.map(function (lab, i) {
            var r = rows[i] || {};
            return [rowLabel(lab, ctx)].concat(s.columns.map(function (c) { return displayCell(c, r, ctx); }));
          });
          R.heading(s.title, 30 + cells.length * 20);
          R.table(cols, cells);
          return;
        }
        var filled = rows.filter(function (r) { return !rowIsEmpty(s, r); });
        if (!filled.length && s.optional) return;
        var introH = s.intro ? R.wrap(s.intro, 'Helvetica', 8.5, R.W).length * 11.9 + 6 : 0;
        R.heading(s.title, introH + 70);
        if (s.intro) R.paragraph(s.intro, { size: 8.5, color: COLORS.soft, after: 6 });
        if (!filled.length) { R.paragraph('No entries recorded.', { font: 'Times-Italic', color: COLORS.soft }); return; }
        cells = filled.map(function (r) { return s.columns.map(function (c) { return displayCell(c, r, ctx); }); });
        R.table(s.columns, cells);
        return;
      }

      if (s.type === 'scale') {
        R.heading(s.title, 90);
        if (s.intro) R.paragraph(s.intro + ' ' + s.min + ' = ' + s.anchors[0].toLowerCase() + ', ' + s.max + ' = ' + s.anchors[1].toLowerCase() + '.', { size: 8.5, color: COLORS.soft, after: 6 });
        R.table([{ label: 'Factor', w: 4 }, { label: 'Score (' + s.min + '–' + s.max + ')', w: 1 }],
          s.items.map(function (it) { var v = state.values[s.id + '.' + it.id]; return [it.label, isBlank(v) ? '—' : String(v)]; }));
        return;
      }

      if (s.type === 'checks') {
        R.heading(s.title, 60);
        R.table([{ label: 'Check', w: 4 }, { label: 'Answer', w: 1.2 }],
          s.items.map(function (it) { return [it.label, optionLabel(it, state.values[s.id + '.' + it.id]) || '—']; }));
        return;
      }

      if (s.type === 'fields') {
        var shown = s.fields.filter(function (f) {
          if (f.privateOptIn && !state.values[f.id + '__include']) return false;
          return !isBlank(state.values[f.id]);
        });
        if (!shown.length) return;
        R.heading(s.title, 40);
        shown.forEach(function (f) { R.longField(f.label, String(state.values[f.id])); });
        return;
      }

      if (s.type === 'computed') {
        R.heading(s.title, 50);
        R.box(s.compute(ctx));
      }
    });
  }

  /* ------------------------------------------------------------ the form (browser only) */

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'text') el.textContent = v;
      else if (k === 'className') el.className = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }

  // opts (optional): { state, statusEl, onChange } — used when the Workpaper Suite hosts a sheet.
  function App(root, schema, opts) {
    this.root = root;
    this.schema = schema;
    this.opts = opts || {};
    this.state = this.opts.state || blankState(schema);
    this.dirty = false;
    this.uid = 0;
  }
  var A = App.prototype;

  A.ctx = function () { return makeCtx(this.schema, this.state); };

  A.control = function (def, value, data) {
    var self = this, id = 'f' + (++this.uid), el;
    var base = { id: id, autocomplete: 'off', 'data-key': data.key, 'data-table': data.table, 'data-row': data.row, 'data-col': data.col };
    if (def.type === 'textarea') {
      el = h('textarea', Object.assign(base, { rows: data.table ? 2 : 3, spellcheck: 'true' }));
      el.value = value || '';
    } else if (def.type === 'select' || def.type === 'person') {
      el = h('select', Object.assign(base, { 'data-person-select': def.type === 'person' ? (def.both ? 'both' : 'one') : null }));
      el.appendChild(h('option', { value: '', text: '—' }));
      var opts = def.type === 'person'
        ? personOptions(self.ctx(), def)
        : def.options.map(function (o) { return { v: o, l: def.labels && def.labels[o] ? def.labels[o] : o }; });
      opts.forEach(function (o) {
        var op = h('option', { value: o.v, text: o.l, 'data-person': o.person });
        if (String(value) === o.v) op.selected = true;
        el.appendChild(op);
      });
    } else if (def.type === 'check') {
      el = h('input', Object.assign(base, { type: 'checkbox' }));
      el.checked = !!value;
    } else {
      el = h('input', Object.assign(base, {
        type: def.type === 'number' ? 'number' : def.type === 'date' ? 'date' : 'text',
        inputmode: def.type === 'number' ? 'decimal' : null,
        min: def.min, max: def.max, step: def.step || (def.type === 'number' ? 'any' : null),
        placeholder: def.placeholder
      }));
      el.value = value == null ? '' : value;
      if (def.type === 'number' && rangeProblem(def, value)) el.setAttribute('aria-invalid', 'true');
    }
    return { el: el, id: id };
  };
  // Where a box's definition lives, so a typed number can be checked against its range.
  A.defFor = function (t) {
    var tbl = t.getAttribute('data-table'), col = t.getAttribute('data-col'), key = t.getAttribute('data-key');
    var found = null;
    this.schema.sections.forEach(function (s) {
      if (tbl && s.id === tbl && s.columns) s.columns.forEach(function (c) { if (c.id === col) found = c; });
      if (!tbl && key && s.fields) s.fields.forEach(function (f) { if (f.id === key) found = f; });
    });
    if (!found && key) (this.schema.meta || []).forEach(function (f) { if (f.id === key) found = f; });
    return found;
  };
  // Mark a number that is out of range, with a short note right under it (and nothing when it is fine).
  A.flagRange = function (t) {
    var def = this.defFor(t), msg = rangeProblem(def, t.value), holder = t.parentNode, note = holder && holder.querySelector('.wpf-range');
    if (msg) {
      t.setAttribute('aria-invalid', 'true');
      if (!note) { note = h('span', { className: 'wpf-range', role: 'note' }); holder.appendChild(note); }
      note.textContent = msg;
      if (!t.id) return msg;
      note.id = t.id + '-range'; t.setAttribute('aria-describedby', note.id);
    } else {
      t.removeAttribute('aria-invalid');
      if (note) note.remove();
      if (t.getAttribute('aria-describedby') === t.id + '-range') t.removeAttribute('aria-describedby');
    }
    return msg;
  };

  A.road = function () { return this.opts.road || this.schema.road || (this.schema.solo ? 'self' : ''); };

  A.render = function () {
    var self = this, s = this.schema, st = this.state;
    this.root.innerHTML = '';
    this.uid = 0;

    // A filled-in example for this sheet and road, folded away until someone wants it
    var ex = global.TOL_WORKPAPER_EXAMPLE ? global.TOL_WORKPAPER_EXAMPLE(s.code, this.road()) : null;
    if (ex) {
      var det = h('details', { className: 'wpf-example' }, [h('summary', { text: 'See a filled-in example' })]);
      if (ex.intro) det.appendChild(h('p', { className: 'wpf-help', text: ex.intro }));
      (ex.parts || []).forEach(function (part) {
        if (part.title) det.appendChild(h('p', { className: 'wpf-example-h', text: part.title }));
        if (part.rows) {
          var tb = h('table', { className: 'wpf-example-table' });
          if (part.head) tb.appendChild(h('thead', null, [h('tr', null, part.head.map(function (x) { return h('th', { scope: 'col', text: x }); }))]));
          tb.appendChild(h('tbody', null, part.rows.map(function (r) { return h('tr', null, r.map(function (x) { return h('td', { text: x }); })); })));
          det.appendChild(h('div', { className: 'wpf-table-box' }, [tb]));
        }
        if (part.lines) det.appendChild(h('ul', { className: 'wpf-example-lines' }, part.lines.map(function (x) { return h('li', { text: x }); })));
      });
      if (ex.note) det.appendChild(h('p', { className: 'wpf-help', text: ex.note }));
      this.root.appendChild(det);
    }

    // Names and meta fields
    var metaDefs = [];
    if (s.people) {
      syncPeople(s, st);
      var n = peopleCount(st.values);
      CODES.slice(0, n).forEach(function (c, i) {
        metaDefs.push({ id: 'partner' + c, label: self.opts.personLabel ? self.opts.personLabel(i) : labelFor(i), type: 'text', placeholder: 'First name or initial', person: i });
      });
    }
    metaDefs = metaDefs.concat(s.meta || []);
    if (metaDefs.length) {
      var grid = h('div', { className: 'wpf-meta' });
      var canEdit = s.people && !this.opts.fixedPeople;
      metaDefs.forEach(function (f) {
        var c = self.control(f, st.values[f.id], { key: f.id });
        var kids = [h('label', { for: c.id, text: f.label, 'data-person-label': f.person != null ? String(f.person) : null }), c.el];
        if (canEdit && f.person != null && peopleCount(st.values) > minPeople) {
          kids = [kids[0], h('div', { className: 'wpf-person-row' }, [c.el,
            h('button', { type: 'button', className: 'wpf-person-x', 'data-action': 'remove-person', 'data-person': String(f.person), 'aria-label': 'Remove ' + (String(st.values[f.id] || '').trim() || f.label), text: '×' })])];
        }
        grid.appendChild(h('div', { className: 'wpf-field' + (f.person != null ? ' wpf-person' : '') }, kids));
      });
      this.root.appendChild(grid);
      if (canEdit) {
        var more = h('div', { className: 'wpf-people-actions' });
        if (peopleCount(st.values) < MAX_PEOPLE) more.appendChild(h('button', { type: 'button', className: 'wpf-add', 'data-action': 'add-person', text: '+ Add a person' }));
        more.appendChild(h('span', { className: 'wpf-help', text: 'Two to eight people. Every name shows up in the drop-downs below.' }));
        this.root.appendChild(more);
      }
    }

    s.sections.forEach(function (sec) { self.root.appendChild(self.renderSection(sec)); });
    this.refresh();
  };

  A.renderSection = function (sec) {
    var self = this, st = this.state;
    if (sec.type === 'note') return h('p', { className: 'wpf-note', text: sec.text });

    var wrap = h('section', { className: 'wpf-section', 'aria-labelledby': 'h-' + sec.id });
    wrap.appendChild(h('h2', { id: 'h-' + sec.id, text: sec.title }));
    if (sec.intro) wrap.appendChild(h('p', { className: 'wpf-intro', text: sec.intro }));

    if (sec.type === 'fields') {
      sec.fields.forEach(function (f) {
        var c = self.control(f, st.values[f.id], { key: f.id });
        var field = h('div', { className: 'wpf-field wpf-wide' }, [h('label', { for: c.id, text: f.label }), c.el]);
        if (f.chips) {
          var chips = h('div', { className: 'wpf-chips', role: 'group', 'aria-label': (f.chipsLabel || 'Words to add') + ': ' + f.label });
          if (f.chipsLabel) chips.appendChild(h('span', { className: 'wpf-chips-k', text: f.chipsLabel }));
          f.chips.forEach(function (w) { chips.appendChild(h('button', { type: 'button', className: 'wpf-chip', 'data-action': 'chip', 'data-key': f.id, 'data-word': w, text: w })); });
          field.appendChild(chips);
        }
        if (f.help) field.appendChild(h('p', { className: 'wpf-help', text: f.help }));
        if (f.privateOptIn) {
          var t = self.control({ type: 'check' }, st.values[f.id + '__include'], { key: f.id + '__include' });
          field.appendChild(h('label', { className: 'wpf-optin', for: t.id }, [t.el, ' ' + f.privateOptIn]));
        }
        wrap.appendChild(field);
      });
    }

    if (sec.type === 'scale') {
      var anchors = h('p', { className: 'wpf-help', text: sec.min + ' = ' + sec.anchors[0] + '   ·   ' + sec.max + ' = ' + sec.anchors[1] });
      wrap.appendChild(anchors);
      sec.items.forEach(function (it) {
        var key = sec.id + '.' + it.id;
        var fs = h('fieldset', { className: 'wpf-scale' }, [h('legend', { text: it.label })]);
        var opts = h('div', { className: 'wpf-scale-opts' });
        for (var v = sec.min; v <= sec.max; v++) {
          var id = 'f' + (++self.uid);
          var r = h('input', { type: 'radio', id: id, name: key, value: String(v), 'data-key': key, autocomplete: 'off' });
          if (String(st.values[key]) === String(v)) r.checked = true;
          opts.appendChild(h('label', { for: id }, [r, h('span', { text: String(v) })]));
        }
        fs.appendChild(opts);
        wrap.appendChild(fs);
      });
    }

    if (sec.type === 'checks') {
      sec.items.forEach(function (it) {
        var key = sec.id + '.' + it.id;
        var fs = h('fieldset', { className: 'wpf-check' }, [h('legend', { text: it.label })]);
        var opts = h('div', { className: 'wpf-choice' });
        it.options.forEach(function (o) {
          var id = 'f' + (++self.uid);
          var r = h('input', { type: 'radio', id: id, name: key, value: o, 'data-key': key, autocomplete: 'off' });
          if (st.values[key] === o) r.checked = true;
          opts.appendChild(h('label', { for: id }, [r, h('span', { text: optionLabel(it, o) })]));
        });
        fs.appendChild(opts);
        wrap.appendChild(fs);
      });
    }

    if (sec.type === 'computed') {
      wrap.className += ' wpf-computed';
      wrap.appendChild(h('dl', { id: 'cmp-' + sec.id, 'aria-live': 'polite' }));
    }

    if (sec.type === 'table') wrap.appendChild(this.renderTable(sec));
    return wrap;
  };

  A.renderTable = function (sec) {
    var self = this, ctx = this.ctx(), fixed = fixedRowsFor(sec, this.state);
    var rows = fixed ? this.state.tables[sec.id].slice(0, fixed.length) : this.state.tables[sec.id];
    var box = h('div', { className: 'wpf-table-box' });
    var table = h('table', { className: 'wpf-table' + (sec.fixedRows ? ' wpf-fixed' : '') });
    var headRow = h('tr');
    if (sec.fixedRows) headRow.appendChild(h('th', { scope: 'col' }, [h('span', { className: 'visually-hidden', text: 'Person' })]));
    var totalW = sec.columns.reduce(function (a, c) { return a + (c.w || 1); }, 0) + (sec.fixedRows ? 1.6 : 0);
    sec.columns.forEach(function (c) {
      var th = h('th', { scope: 'col', text: c.label });
      th.style.width = ((c.w || 1) / totalW * 94).toFixed(1) + '%'; // set through CSSOM so the page's CSP allows it
      headRow.appendChild(th);
    });
    if (!sec.fixedRows) headRow.appendChild(h('th', { scope: 'col' }, [h('span', { className: 'visually-hidden', text: 'Remove' })]));
    table.appendChild(h('thead', null, [headRow]));

    var body = h('tbody');
    rows.forEach(function (r, i) {
      var tr = h('tr');
      if (sec.fixedRows) tr.appendChild(h('th', { scope: 'row', className: 'wpf-rowlabel', 'data-fixed': fixed[i], text: rowLabel(fixed[i], ctx) }));
      sec.columns.forEach(function (c) {
        var td = h('td', { 'data-label': c.label });
        if (c.type === 'computed') {
          td.appendChild(h('output', { 'data-computed': sec.id + ':' + i + ':' + c.id, text: c.compute(r) }));
        } else {
          var ctl = self.control(c, r[c.id], { table: sec.id, row: String(i), col: c.id });
          ctl.el.setAttribute('aria-label', c.label + ', row ' + (i + 1));
          td.appendChild(ctl.el);
        }
        tr.appendChild(td);
      });
      if (!sec.fixedRows) {
        tr.appendChild(h('td', { className: 'wpf-remove' }, [
          h('button', { type: 'button', 'data-action': 'remove', 'data-table': sec.id, 'data-row': String(i), 'aria-label': 'Remove row ' + (i + 1), text: '×' })
        ]));
      }
      body.appendChild(tr);
    });
    table.appendChild(body);
    box.appendChild(table);

    if (!sec.fixedRows) {
      var actions = h('div', { className: 'wpf-table-actions' });
      actions.appendChild(h('button', { type: 'button', className: 'wpf-add', 'data-action': 'add', 'data-table': sec.id, text: sec.addLabel || 'Add a row' }));
      if (sec.pull) actions.appendChild(h('button', { type: 'button', className: 'wpf-add', 'data-action': 'pull', 'data-table': sec.id, text: sec.pull.label }));
      box.appendChild(actions);
    }
    // The task library: common jobs for this road, including the invisible ones, one tap to add
    var lib = sec.library && global.TOL_TASK_LIBRARY ? global.TOL_TASK_LIBRARY(this.road(), sec.library) : null;
    if (lib && lib.groups && lib.groups.length) {
      var have = {};
      rows.forEach(function (r) { if (r && r.task) have[String(r.task).trim().toLowerCase()] = true; });
      this.libOpen = this.libOpen || {};
      var det = h('details', { className: 'wpf-lib', 'data-lib': sec.id, open: this.libOpen[sec.id] ? 'open' : null }, [
        h('summary', { text: 'Add from the task library (' + lib.count + ' common jobs, including the ones nobody sees)' })]);
      if (lib.intro) det.appendChild(h('p', { className: 'wpf-help', text: lib.intro }));
      lib.groups.forEach(function (g) {
        var grp = h('div', { className: 'wpf-lib-group', role: 'group', 'aria-label': g.name }, [h('p', { className: 'wpf-lib-h', text: g.name + (g.hidden ? ' · often unseen' : '') })]);
        g.items.forEach(function (it) {
          var on = !!have[it[0].toLowerCase()];
          grp.appendChild(h('button', { type: 'button', className: 'wpf-chip' + (on ? ' is-on' : ''), 'data-action': 'lib', 'data-table': sec.id, 'data-task': it[0], 'data-freq': it[1] || '', 'aria-pressed': on ? 'true' : 'false', text: (on ? '✓ ' : '+ ') + it[0] }));
        });
        det.appendChild(grp);
      });
      box.appendChild(det);
    }
    return box;
  };

  // Update calculated values, and person labels, without rebuilding inputs.
  A.refresh = function () {
    var self = this, ctx = this.ctx();
    this.schema.sections.forEach(function (sec) {
      if (sec.type !== 'computed') return;
      var dl = document.getElementById('cmp-' + sec.id);
      if (!dl) return;
      dl.innerHTML = '';
      sec.compute(ctx).forEach(function (it) {
        dl.appendChild(h('dt', { text: it.label }));
        var dd = h('dd', { text: it.value });
        if (it.note) dd.appendChild(h('span', { className: 'wpf-help', text: it.note }));
        dl.appendChild(dd);
      });
    });
    Array.prototype.forEach.call(this.root.querySelectorAll('output[data-computed]'), function (o) {
      var p = o.getAttribute('data-computed').split(':');
      var sec = self.schema.sections.filter(function (s) { return s.id === p[0]; })[0];
      var col = sec.columns.filter(function (c) { return c.id === p[2]; })[0];
      o.textContent = col.compute(self.state.tables[p[0]][+p[1]] || {});
    });
    // Person drop-downs: fresh names, still in alphabetical order
    Array.prototype.forEach.call(this.root.querySelectorAll('select[data-person-select]'), function (sel) {
      var val = sel.value;
      var opts = Array.prototype.slice.call(sel.querySelectorAll('option[data-person]'));
      opts.forEach(function (o) { o.textContent = ctx.name(o.getAttribute('data-person')); });
      opts.sort(function (a, b) {
        var ab = a.getAttribute('data-person') === 'Both', bb = b.getAttribute('data-person') === 'Both';
        if (ab !== bb) return ab ? 1 : -1;
        return a.textContent.localeCompare(b.textContent, undefined, { sensitivity: 'base', numeric: true });
      });
      opts.forEach(function (o) { sel.appendChild(o); });
      sel.value = val;
    });
    Array.prototype.forEach.call(this.root.querySelectorAll('.wpf-person-x'), function (b) {
      var i = +b.getAttribute('data-person');
      b.setAttribute('aria-label', 'Remove ' + ctx.name(CODES[i]));
    });
    Array.prototype.forEach.call(this.root.querySelectorAll('[data-fixed]'), function (t) { t.textContent = rowLabel(t.getAttribute('data-fixed'), ctx); });
    Array.prototype.forEach.call(this.root.querySelectorAll('input[type="number"]'), function (t) { self.flagRange(t); });
  };

  A.onInput = function (e) {
    var t = e.target;
    var val = t.type === 'checkbox' ? t.checked : t.value;
    var tbl = t.getAttribute('data-table');
    if (tbl && t.getAttribute('data-col')) {
      this.state.tables[tbl][+t.getAttribute('data-row')][t.getAttribute('data-col')] = val;
    } else if (t.getAttribute('data-key')) {
      if (t.type === 'radio' && !t.checked) return;
      this.state.values[t.getAttribute('data-key')] = val;
    } else return;
    this.changed();
    this.refresh();
    if (t.type === 'number' && e.type === 'change') { var msg = rangeProblem(this.defFor(t), t.value); if (msg) this.status(msg); }
  };

  A.changed = function () {
    this.dirty = true;
    if (this.opts.onChange) this.opts.onChange(this.state);
    if (this.keep) this.keepSoon();
  };

  /* ---------- "Keep a draft on this device": opt-in, one draft per worksheet ---------- */
  A.keepKey = function () { return KEEP_PREFIX + this.schema.code + (this.schema.road ? ':' + this.schema.road : ''); };
  A.keepSoon = function () {
    var self = this;
    clearTimeout(this.keepTimer);
    this.keepTimer = setTimeout(function () { self.keepNow(); }, 400);
  };
  A.keepNow = function () {
    if (!this.keep) return false;
    try {
      global.localStorage.setItem(this.keepKey(), JSON.stringify({ format: DRAFT_FORMAT, version: DRAFT_VERSION, workpaper: this.schema.code, saved: new Date().toISOString(), state: this.state }));
      this.dirty = false;
      return true;
    } catch (e) {
      this.status('This browser won’t keep a draft (storage is off or full). Save a draft file instead.');
      return false;
    }
  };
  A.readKept = function () {
    try {
      var raw = global.localStorage.getItem(this.keepKey());
      var d = raw ? JSON.parse(raw) : null;
      return d && d.format === DRAFT_FORMAT && d.workpaper === this.schema.code && d.state ? d : null;
    } catch (e) { return null; }
  };
  A.setKeep = function (on) {
    this.keep = !!on;
    if (on) {
      if (this.keepNow()) this.status('Kept on this device. It will be here next time you open this page. Press “Erase” to remove it.');
    } else {
      clearTimeout(this.keepTimer);
      try { global.localStorage.removeItem(this.keepKey()); } catch (e) {}
      this.dirty = answered(this.schema, this.state) > 0;
      this.status('Not kept any more. Nothing from this worksheet is stored on this device.');
    }
  };
  A.eraseKept = function () {
    clearTimeout(this.keepTimer);
    try { global.localStorage.removeItem(this.keepKey()); } catch (e) {}
    this.keep = false;
    this.dirty = answered(this.schema, this.state) > 0;
    this.status('Erased. Nothing from this worksheet is stored on this device. What is on the page stays until you close it.');
    var n = document.getElementById('wpf-erase-note');
    if (n) { n.textContent = ''; setTimeout(function () { n.textContent = 'Erased from this device.'; }, 30); }
  };

  A.onClick = function (e) {
    var b = e.target.closest('button[data-action]');
    if (!b) return;
    var act = b.getAttribute('data-action');
    if (act === 'chip') {
      var key = b.getAttribute('data-key'), word = b.getAttribute('data-word'), cur = String(this.state.values[key] || '').replace(/\s+$/, '');
      if (new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(cur)) { this.status('“' + word + '” is already there.'); return; }
      this.state.values[key] = cur ? cur.replace(/[.]$/, '') + (/(^|\s)(and|or|,)$/.test(cur) ? ' ' : ', ') + word : 'I feel ' + word;
      var ta = this.root.querySelector('[data-key="' + key + '"]');
      if (ta) ta.value = this.state.values[key];
      this.changed(); this.refresh();
      this.status('Added “' + word + '”. Change the words any way you like.');
      return;
    }
    if (act === 'lib') {
      var tid = b.getAttribute('data-table'), task = b.getAttribute('data-task'), freq = b.getAttribute('data-freq'), trows = this.state.tables[tid];
      var lsec = this.schema.sections.filter(function (s) { return s.id === tid; })[0];
      if (trows.some(function (r) { return r.task && String(r.task).trim().toLowerCase() === task.toLowerCase(); })) { this.status('“' + task + '” is already on the list.'); return; }
      var hasFreq = lsec.columns.some(function (c) { return c.id === 'freq'; }), freqOk = hasFreq && freq && lsec.columns.filter(function (c) { return c.id === 'freq'; })[0].options.indexOf(freq) >= 0;
      var slot = -1;
      trows.forEach(function (r, i) { if (slot < 0 && !r.task && lsec.columns.every(function (c) { return c.prefill || c.type === 'computed' || isBlank(r[c.id]) || c.id === 'day'; })) slot = i; });
      var row = slot >= 0 ? trows[slot] : {};
      row.task = task;
      if (freqOk && !row.freq) row.freq = freq;
      if (slot < 0) trows.push(row);
      this.libOpen = this.libOpen || {}; this.libOpen[tid] = true;
      this.changed(); this.render();
      var again = this.root.querySelector('[data-lib="' + tid + '"] [data-task="' + task.replace(/"/g, '\\"') + '"]');
      if (again) again.focus();
      this.status('Added “' + task + '” to the list. Fill in ' + (hasFreq ? 'who owns it' : 'who did it and rough minutes') + ' next to it.');
      return;
    }
    if (act === 'add-person') {
      if (!addPerson(this.schema, this.state)) return;
      this.changed();
      this.render();
      var n = peopleCount(this.state.values), inp = this.root.querySelector('[data-key="partner' + CODES[n - 1] + '"]');
      if (inp) inp.focus();
      this.status('Added a person. There are ' + n + ' on this sheet now.');
      return;
    }
    if (act === 'remove-person') {
      var pi = +b.getAttribute('data-person'), who = this.ctx().name(CODES[pi]);
      if (!window.confirm('Take ' + who + ' off this sheet? Rows they own will go back to "—".')) return;
      removePerson(this.schema, this.state, pi);
      this.changed();
      this.render();
      this.status(who + ' is off this sheet.');
      var add = this.root.querySelector('[data-action="add-person"]');
      if (add) add.focus();
      return;
    }
    var tbl = b.getAttribute('data-table'), rows = this.state.tables[tbl];
    var sec = this.schema.sections.filter(function (s) { return s.id === tbl; })[0];
    var action = b.getAttribute('data-action');
    if (action === 'add') {
      rows.push({});
      this.changed();
      this.render();
      var inputs = this.root.querySelectorAll('[data-table="' + tbl + '"][data-row="' + (rows.length - 1) + '"]');
      if (inputs[0]) inputs[0].focus();
    } else if (action === 'remove') {
      var i = +b.getAttribute('data-row');
      if (!rowIsEmpty(sec, rows[i]) && !window.confirm('Remove this row and what is written in it?')) return;
      rows.splice(i, 1);
      if (!rows.length) rows.push({});
      this.changed();
      this.render();
    } else if (action === 'pull') {
      var have = {}, key = sec.pull.key, added = 0;
      rows.forEach(function (r) { if (r[key]) have[r[key].trim().toLowerCase()] = true; });
      var fresh = sec.pull.from(this.ctx()).filter(function (r) { return !have[String(r[key]).trim().toLowerCase()]; });
      var kept = rows.filter(function (r) { return !rowIsEmpty(sec, r); });
      this.state.tables[tbl] = kept.concat(fresh);
      if (!this.state.tables[tbl].length) this.state.tables[tbl].push({});
      added = fresh.length;
      this.changed();
      this.render();
      this.status(added ? 'Added ' + added + (added === 1 ? ' task.' : ' tasks.') : 'No new tasks flagged twice or more in Part A.');
    }
  };

  A.status = function (msg) {
    var el = this.opts.statusEl || document.getElementById('wpf-status');
    if (!el) return;
    el.textContent = '';
    setTimeout(function () { el.textContent = msg; }, 30);
  };

  function download(bytesOrText, filename, type) {
    var blob = new Blob([bytesOrText], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  A.fileBase = function () { return 'TOL-' + this.schema.code + '-' + this.schema.slug + '-' + today(); };

  A.savePdf = function () {
    try {
      var bytes = buildPdf(this.schema, this.state);
      download(bytes, this.fileBase() + '.pdf', 'application/pdf');
      this.dirty = false;
      this.status('PDF downloaded to this device. Check your Downloads folder.');
    } catch (err) {
      this.status('The PDF could not be created. Save a draft file so nothing is lost, then try again.');
      if (window.console) console.error(err);
    }
  };

  A.saveDraft = function () {
    var draft = { format: DRAFT_FORMAT, version: DRAFT_VERSION, workpaper: this.schema.code, saved: new Date().toISOString(), state: this.state };
    download(JSON.stringify(draft, null, 2), this.fileBase() + '-draft.json', 'application/json');
    this.dirty = false;
    this.status('Draft file downloaded. Open it here later to keep working.');
  };

  // A fillable PDF from this site, filled in on a phone or computer, opens back into the form.
  A.openPdf = function (file) {
    var self = this, reader = global.TOLSuitePDF && global.TOLSuitePDF.readFilled;
    if (!reader) { this.status('Open this PDF in the Workpaper Suite.'); return; }
    reader(file).then(function (entries) {
      var mine = entries.filter(function (e) { return e.workpaper === self.schema.code; });
      if (!entries.length) { self.status("That PDF doesn't have fill-in boxes from this site. Choose a fillable PDF made here."); return; }
      if (!mine.length) { self.status('That PDF is for ' + entries[0].workpaper + '. Open it on the ' + entries[0].workpaper + ' page, or in the Workpaper Suite.'); return; }
      self.load(mine[mine.length - 1].state, 'Opened what you filled in on the PDF.');
    }, function () { self.status('That PDF could not be read. If it was saved from a phone app, try "Save a copy" or "Print to PDF" first.'); });
  };

  A.fillablePdf = function () {
    try {
      var bytes = global.TOLSuitePDF.fillable([{ workpaper: this.schema.code, state: this.state, label: '' }], { single: true });
      download(bytes, this.fileBase() + '-fillable.pdf', 'application/pdf');
      this.status('Fillable PDF downloaded. Type into it in any PDF app, or print it and write by hand.');
    } catch (err) {
      this.status('The fillable PDF could not be created. Save a draft file so nothing is lost, then try again.');
      if (window.console) console.error(err);
    }
  };

  A.openDraft = function (file) {
    var self = this;
    if (!file) return;
    if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') { this.openPdf(file); return; }
    if (file.size > 2 * 1024 * 1024) { this.status('That file is too large to be a workpaper draft.'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var d;
      try { d = JSON.parse(reader.result); } catch (e) { self.status("That file isn't a workpaper draft. Choose a .json file saved from this page."); return; }
      if (d && d.format === 'tol-workpaper-suite' && Array.isArray(d.entries)) {
        var mine = d.entries.filter(function (e) { return e && e.workpaper === self.schema.code; }).pop();
        if (!mine) { self.status('That suite file has no ' + self.schema.code + ' in it yet.'); return; }
        d = { format: DRAFT_FORMAT, workpaper: mine.workpaper, state: mine.state };
      }
      if (!d || d.format !== DRAFT_FORMAT || !d.state) { self.status("That file isn't a workpaper draft. Choose a .json file saved from this page."); return; }
      if (d.workpaper !== self.schema.code) { self.status('That draft is for ' + d.workpaper + '. Open it on the ' + d.workpaper + ' page.'); return; }
      if (self.dirty && !window.confirm('Replace what is on this page with the draft?')) return;
      self.state = sanitize(self.schema, d.state);
      self.dirty = false;
      self.render();
      if (self.keep) self.keepSoon();
      self.status('Draft opened.');
    };
    reader.onerror = function () { self.status('That file could not be read.'); };
    reader.readAsText(file);
  };

  // Take in a whole state from a draft file or a filled-in PDF, keeping only what this workpaper has.
  A.load = function (state, msg) {
    if (this.dirty && !window.confirm('Replace what is on this page with the one you opened?')) return;
    this.state = sanitize(this.schema, state);
    this.dirty = false;
    this.render();
    if (this.keep) this.keepSoon();
    this.status(msg || 'Opened.');
  };

  A.clear = function () {
    if (!window.confirm('Clear everything on this page? Anything you haven\'t saved as a PDF or draft file will be gone.')) return;
    this.state = blankState(this.schema);
    this.dirty = false;
    this.render();
    if (this.keep) { this.eraseKept(); var k = document.getElementById('wpf-keep'); if (k) k.checked = false; }
    this.status('Cleared. Nothing from this worksheet remains on the page' + (this.keep ? '.' : ', and nothing is kept on this device.'));
  };

  function boot() {
    var wp = document.body.getAttribute('data-wp');
    var schema = global.TOL_WORKPAPERS && global.TOL_WORKPAPERS[wp];
    var root = document.getElementById('wpf-root');
    if (!schema || !root) return;
    // ?road=coworkers (or roommates, caregivers) shows a worksheet worded for that road
    var road = (global.location && (global.location.search.match(/[?&]road=([a-z]+)/) || [])[1]) || '';
    if (road && global.TOL_WORKPAPER_VARIANT) schema = global.TOL_WORKPAPER_VARIANT(wp, road) || schema;
    var app = new App(root, schema, { road: road });

    // "Keep a draft on this device": off unless the person turns it on
    var keepBox = document.getElementById('wpf-keep'), eraseBtn = document.getElementById('wpf-erase');
    // a quiet word right next to "Erase", so pressing it always shows that something happened
    if (eraseBtn && !document.getElementById('wpf-erase-note')) eraseBtn.parentNode.insertBefore(h('span', { className: 'wpf-erase-note', id: 'wpf-erase-note', role: 'status', 'aria-live': 'polite' }), eraseBtn.nextSibling);
    var kept = app.readKept();
    if (kept) {
      app.state = sanitize(schema, kept.state);
      app.keep = true;
      if (keepBox) keepBox.checked = true;
    }
    app.render();
    if (kept) app.status('Picked up the draft kept on this device. Press “Erase” to remove it.');
    if (keepBox) keepBox.addEventListener('change', function () { app.setKeep(keepBox.checked); });
    if (eraseBtn) eraseBtn.addEventListener('click', function () { app.eraseKept(); if (keepBox) keepBox.checked = false; });

    root.addEventListener('input', function (e) { app.onInput(e); });
    root.addEventListener('change', function (e) { app.onInput(e); });
    root.addEventListener('click', function (e) { app.onClick(e); });

    var fileInput = document.getElementById('wpf-file');
    document.getElementById('wpf-pdf').addEventListener('click', function () { app.savePdf(); });
    document.getElementById('wpf-save').addEventListener('click', function () { app.saveDraft(); });
    document.getElementById('wpf-open').addEventListener('click', function () { fileInput.click(); });
    document.getElementById('wpf-clear').addEventListener('click', function () { app.clear(); });
    var fill = document.getElementById('wpf-fillable');
    if (fill) fill.addEventListener('click', function () { app.fillablePdf(); });
    fileInput.addEventListener('change', function () { app.openDraft(fileInput.files[0]); fileInput.value = ''; });

    window.addEventListener('beforeunload', function (e) {
      if (app.keep) app.keepNow();
      if (!app.dirty) return;
      e.preventDefault();
      e.returnValue = 'You have unsaved entries.';
      return 'You have unsaved entries.';
    });
  }

  global.TOLWorkpaper = {
    buildPdf: buildPdf, blankState: blankState, makeCtx: makeCtx, sanitize: sanitize, answered: answered,
    Report: Report, renderBody: renderBody, App: App, download: download, today: today, formatDate: formatDate,
    displayCell: displayCell, rowIsEmpty: rowIsEmpty, rowLabel: rowLabel, isBlank: isBlank, COLORS: COLORS, DRAFT_FORMAT: DRAFT_FORMAT,
    CODES: CODES, MAX_PEOPLE: MAX_PEOPLE, peopleCount: peopleCount, fixedRowsFor: fixedRowsFor, syncPeople: syncPeople, rangeProblem: rangeProblem,
    addPerson: addPerson, removePerson: removePerson, personOptions: personOptions, setDefaultLabels: setDefaultLabels,
    setMinPeople: setMinPeople, optionLabel: optionLabel,
    labelFor: function (i) { return labelFor(i); }
  };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
