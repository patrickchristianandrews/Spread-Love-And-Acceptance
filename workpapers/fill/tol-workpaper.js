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
  - The one exception is a tick the person makes themselves: "Use these names in
    the other tools" keeps just the names (and, on One owner per job, the jobs
    and their owners) in localStorage ('tol-household-v1', see
    /assets/js/household.js), so the other tools can offer them. Unticking it
    forgets them. A sheet that starts with no names offers that household
    ("Use your household from before?"), and never overwrites a typed name.
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
  var KEEP_PREFIX = 'tol-wpf-keep:', TAB_PREFIX = 'tol-wpf-tab:';

  /* ------------------------------------------------------------ people */

  // What an unnamed person is called. The Workpaper Suite swaps in its road's words ("You", "Teammate 2").
  var labelFor = function (i) { return 'Person ' + CODES[i]; };
  function setDefaultLabels(fn) { labelFor = typeof fn === 'function' ? fn : function (i) { return 'Person ' + CODES[i]; }; }
  // What a page that knows the household can add (the Workpaper Suite): who is a child, and the split a
  // week is compared with (the one agreed on the Lemonade Stand, or each person counted for the nights
  // they're here). fn(names) returns { kids: [true/false by place], target: { t: [fractions], mode, label } }.
  var household = null;
  function setHousehold(fn) { household = typeof fn === 'function' ? fn : null; }

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
  // Everyone who can be picked in a person drop-down, in the order their names were typed at the
  // top of the sheet, then "Both"/"Everyone" (left off when there is only one person).
  function personOptions(ctx, def) {
    var list = ctx.people().map(function (c) { return { v: c, l: ctx.name(c), person: c }; });
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

  // A starter row on a table marked examples:true (WP-03's list of common jobs) that nobody has
  // touched yet: the same job and how-often as the starter, and nothing else filled in. It is shown
  // as an example and never counted, for or against anyone, until someone edits it.
  function isExampleRow(section, row) {
    if (!section || !section.examples || !row || !row.task) return false;
    var keys = { task: 1, freq: 1 };
    return (section.defaultRows || []).some(function (d) {
      if (!d.task || d.task !== row.task || (row.freq || '') !== (d.freq || '')) return false;
      return section.columns.every(function (c) { return keys[c.id] || c.prefill || c.type === 'computed' || isBlank(row[c.id]) || row[c.id] === d[c.id]; });
    });
  }

  // A short name for a row, for "Removed “Groceries”": its job or task, or the first thing written in it
  function rowName(section, row) {
    if (!row) return '';
    var c = section.columns.filter(function (x) { return !x.prefill && x.type !== 'computed' && !isBlank(row[x.id]) && typeof row[x.id] === 'string'; })[0];
    var t = String(row.task || row.item || row.job || (c ? row[c.id] : '') || '').replace(/\s+/g, ' ').trim();
    if (!t && row.day && section.personDays) return row.day;
    return t.length > 40 ? t.slice(0, 39) + '\u2026' : t;
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
      isExample: function (tableId, row) { return isExampleRow(byId[tableId], row); },
      name: function name(p) {
        var i = CODES.indexOf(p);
        if (i >= 0) return String(state.values['partner' + p] || '').trim() || labelFor(i);
        if (p === 'Both') { var pc = peopleCount(state.values); return pc > 2 ? 'Everyone' : pc === 1 ? name('A') : 'Both'; }
        return '';
      },
      count: function () { return peopleCount(state.values); },
      people: function () { return CODES.slice(0, peopleCount(state.values)); },
      // a child on a family road is never waited for, and never handed hours
      isChild: function (p) { var hh = household ? household() : null, i = CODES.indexOf(p); return !!(hh && hh.kids && i >= 0 && hh.kids[i]); },
      // the share each person is compared with, when it isn't an even one; null means even
      target: function () {
        var hh = household ? household() : null, n = peopleCount(state.values), tg = hh && hh.target;
        if (!tg || !Array.isArray(tg.t) || tg.t.length !== n || tg.mode === 'even') return null;
        return tg;
      }
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

  // "Agreed by Sam and Jordan on September 29, 2026." (or "Chosen on …" on a personal sheet)
  function agreedLine(sec, values) {
    var d = values.agreedOn ? formatDate(values.agreedOn) : '', who = String(values.agreedBy || '').trim();
    if (sec.solo) return 'Chosen' + (d ? ' on ' + d : '') + '.';
    return 'Agreed' + (who ? ' by ' + who : '') + (d ? ' on ' + d : '') + '.';
  }
  // The closing's lines for a PDF: what was ticked, when, by whom, and the look-again date.
  function closingLines(sec, values) {
    var out = [], box = sec.fields.filter(function (f) { return f.id === 'agreed'; })[0];
    if (values.agreed && box) out.push(box.label + ': Yes. ' + agreedLine(sec, values));
    else if (!sec.solo && String(values.agreedBy || '').trim()) out.push('Who agreed: ' + String(values.agreedBy).trim());
    if (values.lookAgain) out.push('Look at this again on ' + formatDate(values.lookAgain) + '.');
    return out;
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
    this.doc = doc || new global.TOLPDF.Doc({ title: schema.code + ' ' + schema.title, producer: 'Spread Love & Acceptance worksheet, generated on this device' });
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
    d.text(this.L, this.y + 8, this.enc('Spread Love & Acceptance  ·  ' + s.code + (s.plain && s.plain !== s.title ? '  ·  ' + s.title : '')), 'Helvetica', 8, COLORS.brass);
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

  // The closing: a small heading and a line or two. It may use the last few points above the
  // footer rule rather than start a page of its own.
  P.closing = function (title, lines) {
    var self = this, size = 10, lh = 13.5;
    var wrapped = [];
    lines.forEach(function (t) { wrapped = wrapped.concat(self.wrap(t, 'Helvetica', size, self.W)); });
    var need = 24 + wrapped.length * lh;
    if (this.y + need > this.bottom + 10) this.newPage();
    this.y += 6;
    this.doc.text(this.L, this.y + 11, this.enc(title), 'Times-Bold', 12, COLORS.ink);
    this.y += 18;
    wrapped.forEach(function (ln) { self.doc.text(self.L, self.y + size, ln, 'Helvetica', size, COLORS.ink); self.y += lh; });
    this.y += 4;
  };

  P.footers = function () {
    var d = this.doc, n = d.pages.length, self = this;
    var created = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    for (var i = 0; i < n; i++) {
      d.setPage(i);
      d.line(self.L, 744, self.R, 744, COLORS.line, 0.5);
      d.text(self.L, 756, self.enc('Created on this device, ' + created + '. Nothing entered was sent to or stored by the website. ' + (self.schema.privateNote || 'Keep this file somewhere private.')), 'Helvetica', 7, COLORS.soft);
      d.text(self.L, 766, self.enc('A self-reflection worksheet, not a clinical tool. It describes the arrangement, never any one person.'), 'Helvetica', 7, COLORS.soft);
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
    // the names themselves when they are given ("Lena and Sam"), not "Person A" and "Person B"
    if (schema.people) {
      var named = ctx.people().filter(function (c) { return String(state.values['partner' + c] || '').trim(); });
      if (named.length) meta.push([ctx.count() > 1 ? 'On this sheet' : 'Name', ctx.people().map(function (c) { return ctx.name(c); }).join(ctx.count() > 2 ? ', ' : ' and ')]);
      else ctx.people().forEach(function (c, i) { meta.push([labelFor(i), ctx.name(c)]); });
    }
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
        // untouched starter rows are examples, not part of anyone's list
        var filled = rows.filter(function (r) { return !rowIsEmpty(s, r) && !isExampleRow(s, r); });
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

      if (s.type === 'fields' && s.id === 'closing') {
        // a few short lines, never a page of their own
        var cl = closingLines(s, state.values);
        if (cl.length) R.closing(s.title, cl);
        return;
      }

      if (s.type === 'fields') {
        var shown = s.fields.filter(function (f) {
          if (f.privateOptIn && !state.values[f.id + '__include']) return false;
          return !isBlank(state.values[f.id]);
        });
        if (!shown.length) return;
        R.heading(s.title, 40);
        shown.forEach(function (f) {
          var v = state.values[f.id];
          R.longField(f.label, f.type === 'check' ? 'Yes' : f.type === 'date' ? formatDate(v) : String(v));
        });
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
      // it goes after the first part of the sheet, so the names and the first rows come first
      var exampleEl = det;
    }

    // Names and meta fields
    var metaDefs = [];
    if (s.people) {
      syncPeople(s, st);
      var n = peopleCount(st.values);
      CODES.slice(0, n).forEach(function (c, i) {
        metaDefs.push({ id: 'partner' + c, label: self.opts.personLabel ? self.opts.personLabel(i) : labelFor(i), type: 'text', placeholder: 'First name', person: i });
      });
    }
    metaDefs = metaDefs.concat(s.meta || []);
    // "Use your household from before?" when this sheet has no names (or no jobs) yet
    var hhEl = this.hhOfferEl();
    if (hhEl) this.root.appendChild(hhEl);
    if (metaDefs.length) {
      var grid = h('div', { className: 'wpf-meta' });
      var canEdit = s.people && !this.opts.fixedPeople;
      metaDefs.forEach(function (f) {
        var c = self.control(f, st.values[f.id], { key: f.id });
        var kids = [h('label', { for: c.id, text: f.label, 'data-person-label': f.person != null ? String(f.person) : null }), c.el];
        if (canEdit && f.person != null && peopleCount(st.values) > minPeople) {
          kids = [kids[0], h('div', { className: 'wpf-person-row' }, [c.el,
            h('button', { type: 'button', className: 'wpf-person-x', 'data-action': 'remove-person', 'data-person': String(f.person), 'aria-label': 'Remove ' + (String(st.values[f.id] || '').trim() || f.label), title: 'Remove this person', text: '×' })])];
        }
        grid.appendChild(h('div', { className: 'wpf-field' + (f.person != null ? ' wpf-person' : '') }, kids));
      });
      this.root.appendChild(grid);
      if (canEdit) {
        var more = h('div', { className: 'wpf-people-actions' });
        if (peopleCount(st.values) < MAX_PEOPLE) more.appendChild(h('button', { type: 'button', className: 'wpf-add', 'data-action': 'add-person', text: '+ Add a person' }));
        more.appendChild(h('span', { className: 'wpf-help wpf-people-help', text: 'Two to eight people. Every name shows up in the drop-downs below.' }));
        this.root.appendChild(more);
        if (this.hhWrite && global.TOLHousehold) this.root.appendChild(global.TOLHousehold.remember({ tool: this.hhTool(), write: this.hhWrite }));
      }
    }

    // A day-by-day check-in (WP-13): "Just tonight's check-in" first, the three questions for each
    // person. It writes into today's rows of the week's table below, so both always say the same.
    s.sections.forEach(function (sec) { if (sec.personDays && s.people) { var tn = self.tonightEl(sec); if (tn) self.root.appendChild(tn); } });
    // "Someone shared a list with you": the choice comes first, before anything else on the sheet
    // (and, once it is combined, "Send my changes back" in the same place)
    var inEl = this.shareInEl() || (this.sendBack === 'top' ? this.sendBackEl() : null);
    if (inEl) this.root.insertBefore(inEl, this.root.firstChild);
    var lead = s.sections[0] && s.sections[0].type === 'note' ? s.sections[0] : null, howEl = null;
    s.sections.forEach(function (sec, k) {
      // a long note before the first part of the sheet folds into "How to fill it in", with the example
      // (just after the first part of the sheet, so the first rows come first)
      if (sec === lead) { howEl = h('details', { className: 'wpf-example wpf-howto' }, [h('summary', { text: 'How to fill it in' }), self.renderSection(sec)]); return; }
      self.root.appendChild(self.renderSection(sec));
      if (k === (lead ? 1 : 0)) { if (howEl) self.root.appendChild(howEl); if (exampleEl) self.root.appendChild(exampleEl); }
      if (self.opts.canShare && s.share && sec.id === s.share.after) self.root.appendChild(self.shareEl());
    });
    if (exampleEl && !exampleEl.parentNode) this.root.appendChild(exampleEl);
    this.refresh();
  };

  // Today's name in a day-by-day table ("Thu"), and the Monday of this week (2026-10-05)
  function todayIn(days) { return days[(new Date().getDay() + 6) % 7]; }
  function thisMonday() {
    var d = new Date(); d.setDate(d.getDate() - (d.getDay() + 6) % 7);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  var TONIGHT = [
    ['thanks', 'Something I appreciated today'],
    ['friction', 'Something that didn’t feel great'],
    ['ask', 'Something that would help tomorrow']
  ];
  // "Just tonight's check-in": the 90-second ritual itself, for each person, on top of the week's table.
  A.tonightEl = function (sec) {
    var self = this, ctx = this.ctx(), day = todayIn(sec.personDays), rows = this.state.tables[sec.id] || (this.state.tables[sec.id] = []);
    var cols = TONIGHT.filter(function (q) { return sec.columns.some(function (c) { return c.id === q[0]; }); });
    if (!cols.length) return null;
    var only = this.rowsFor && this.rowsFor[sec.id] && ctx.people().indexOf(this.rowsFor[sec.id]) >= 0 ? this.rowsFor[sec.id] : '';
    var hid = 'tonight-' + sec.id;
    var box = h('section', { className: 'wpf-tonight no-print tol-plain', 'aria-labelledby': hid });
    box.appendChild(h('h2', { id: hid, text: 'Just tonight’s check-in' }));
    box.appendChild(h('p', { className: 'wpf-help', text: 'About 90 seconds. Each of you answers in a sentence, about your own day. Then just listen: no debating, no solving. It goes into today’s rows (' + day + ') in the week below.' }));
    var grid = h('div', { className: 'wpf-tonight-people' });
    ctx.people().forEach(function (code) {
      if (only && code !== only) return;
      var i = -1;
      rows.forEach(function (r, k) { if (i < 0 && r && r.day === day && r.who === code) i = k; });
      // a row for today that was removed comes back, empty, in its place in the week
      if (i < 0) {
        var at = rows.length;
        rows.forEach(function (r, k) { if (at === rows.length && r && sec.personDays.indexOf(r.day) > sec.personDays.indexOf(day)) at = k; });
        rows.splice(at, 0, { day: day, who: code }); i = at;
      }
      var fs = h('fieldset', { className: 'wpf-tonight-one' }, [h('legend', { 'data-name-of': code, text: ctx.name(code) })]);
      cols.forEach(function (q) {
        var c = self.control({ type: 'text' }, rows[i][q[0]], { table: sec.id, row: String(i), col: q[0] });
        c.el.setAttribute('data-tonight', '1');
        fs.appendChild(h('div', { className: 'wpf-field' }, [h('label', { for: c.id, text: q[1] }), c.el]));
      });
      grid.appendChild(fs);
    });
    box.appendChild(grid);
    return box;
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
        var field = f.type === 'check'
          ? h('div', { className: 'wpf-field wpf-wide' }, [h('label', { className: 'wpf-optin wpf-tick', for: c.id }, [c.el, ' ' + f.label])])
          : h('div', { className: 'wpf-field wpf-wide' }, [h('label', { for: c.id, text: f.label }), c.el]);
        if (f.chips) {
          var chips = h('div', { className: 'wpf-chips', role: 'group', 'aria-label': (f.chipsLabel || 'Words to add') + ': ' + f.label });
          if (f.chipsLabel) chips.appendChild(h('span', { className: 'wpf-chips-k', text: f.chipsLabel }));
          f.chips.forEach(function (w) { chips.appendChild(h('button', { type: 'button', className: 'wpf-chip', 'data-action': 'chip', 'data-key': f.id, 'data-word': w, text: w })); });
          field.appendChild(chips);
        }
        if (f.help) field.appendChild(h('p', { className: 'wpf-help', text: f.help }));
        // a calm line under the closing tick: "Agreed on …", or what is still to do first
        if (f.closing) field.appendChild(h('p', { className: 'wpf-agreed-note', id: 'wpf-agreed-note', role: 'status', 'aria-live': 'polite' }));
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
        // the two ends in words on every row, so nobody has to scroll back up to remember them
        fs.appendChild(h('p', { className: 'wpf-scale-ends', 'aria-hidden': 'true' }, [h('span', { text: sec.min + ' = ' + sec.anchors[0] }), h('span', { text: sec.max + ' = ' + sec.anchors[1] })]));
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
    var box = h('div', { className: 'wpf-table-box tol-plain' }); // tol-plain: no text bubbles on a form's rows (site.css)
    // A day-by-day table with a row for each person: each person fills in only their own rows, so it
    // can show one person's rows at a time (handy on a shared device). Nothing is hidden from the PDF.
    this.rowsFor = this.rowsFor || {};
    var only = sec.personDays && ctx.count() > 1 && this.rowsFor[sec.id] ? this.rowsFor[sec.id] : '';
    if (only && ctx.people().indexOf(only) < 0) only = '';
    if (sec.personDays && ctx.count() > 1) {
      var pid = 'f' + (++this.uid), sel = h('select', { id: pid, 'data-rows-for': sec.id });
      sel.appendChild(h('option', { value: '', text: 'Everyone\u2019s rows', selected: !only ? 'selected' : null }));
      ctx.people().forEach(function (c) { sel.appendChild(h('option', { value: c, text: 'Only ' + ctx.name(c) + '\u2019s rows', selected: only === c ? 'selected' : null })); });
      box.appendChild(h('div', { className: 'wpf-rows-for' }, [h('label', { for: pid, text: 'Filling in your own rows? Show ' }), sel]));
      if (only) box.appendChild(h('p', { className: 'wpf-turn', role: 'note', text: 'These are ' + ctx.name(only) + '\u2019s rows. Only ' + ctx.name(only) + ' fills them in, about their own day. On a shared device? Hand it over here.' }));
    }
    // On a phone, a day-by-day check-in opens on today's rows (one person's, when "Only …'s rows" is
    // picked), with the rest of the week folded under "Show the whole week". It really is 90 seconds then.
    // Nothing is taken off the sheet or the PDF; the other days are only folded on screen.
    this.weekOpen = this.weekOpen || {};
    var today0 = sec.personDays ? sec.personDays[(new Date().getDay() + 6) % 7] : '';
    var phone = !!(global.matchMedia && global.matchMedia('(max-width: 640px)').matches);
    var foldDay = sec.personDays && phone && !this.weekOpen[sec.id] && rows.some(function (r) { return r && r.day === today0; }) ? today0 : '';
    var folded = 0;
    if (sec.personDays && phone) {
      var todayWho = rows.filter(function (r) { return r && r.day === today0 && (!only || r.who === only); }).map(function (r) { return r.who ? ctx.name(r.who) : ''; }).filter(Boolean);
      var fid = 'f' + (++this.uid);
      box.appendChild(h('div', { className: 'wpf-today' }, [
        h('p', { className: 'wpf-today-k', id: fid, text: foldDay ? 'Today: ' + today0 + (todayWho.length ? ' / ' + todayWho.join(', ') : '') : 'The whole week' }),
        h('button', { type: 'button', className: 'wpf-add', 'data-action': 'week-toggle', 'data-table': sec.id, 'aria-expanded': foldDay ? 'false' : 'true', 'aria-describedby': fid, text: foldDay ? 'Show the whole week' : 'Show just today' })
      ]));
    }
    var table = h('table', { className: 'wpf-table no-bubble' + (sec.fixedRows ? ' wpf-fixed' : '') });
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
      var tr = h('tr', sec.examples ? { 'data-ex-table': sec.id, 'data-ex-row': String(i) } : null);
      if (only && r && r.who !== only) tr.hidden = true;
      else if (foldDay && r && r.day !== foldDay) { tr.hidden = true; folded++; }
      if (sec.fixedRows) tr.appendChild(h('th', { scope: 'row', className: 'wpf-rowlabel', 'data-fixed': fixed[i], text: rowLabel(fixed[i], ctx) }));
      sec.columns.forEach(function (c, ci) {
        var td = h('td', { 'data-label': c.label });
        if (c.type === 'computed') {
          td.appendChild(h('output', { 'data-computed': sec.id + ':' + i + ':' + c.id, text: c.compute(r) }));
        } else {
          var ctl = self.control(c, r[c.id], { table: sec.id, row: String(i), col: c.id });
          ctl.el.setAttribute('aria-label', c.label + ', row ' + (i + 1));
          td.appendChild(ctl.el);
        }
        // starter rows are marked as examples until someone changes them
        if (sec.examples && ci === 0) td.appendChild(h('span', { className: 'wpf-ex-tag', text: 'Example', title: 'An example job. It isn’t counted until you give it an owner or change it.' }));
        tr.appendChild(td);
      });
      if (!sec.fixedRows) {
        tr.appendChild(h('td', { className: 'wpf-remove' }, [
          h('button', { type: 'button', 'data-action': 'remove', 'data-table': sec.id, 'data-row': String(i), 'aria-label': 'Remove row ' + (i + 1) + (sec.title ? ' from ' + sec.title : ''), title: 'Remove this row', text: '×' })
        ]));
      }
      body.appendChild(tr);
    });
    table.appendChild(body);
    box.appendChild(table);
    if (foldDay && folded) box.appendChild(h('p', { className: 'wpf-today-more', text: 'The other ' + (folded === 1 ? 'row is' : folded + ' rows are') + ' folded away, not removed. They are all in the PDF.' }));

    if (!sec.fixedRows) {
      var actions = h('div', { className: 'wpf-table-actions' });
      if (this.undo && this.undo.tbl === sec.id) {
        box.appendChild(h('p', { className: 'wpf-undo' }, [
          h('span', { text: 'Removed ' + (this.undo.what ? '\u201c' + this.undo.what + '\u201d' : 'a row') + '. ' }),
          h('button', { type: 'button', className: 'wpf-add', 'data-action': 'undo-remove', 'data-table': sec.id, text: 'Undo' })]));
      }
      actions.appendChild(h('button', { type: 'button', className: 'wpf-add', 'data-action': 'add', 'data-table': sec.id, text: sec.addLabel || 'Add a row' }));
      if (sec.pull) actions.appendChild(h('button', { type: 'button', className: 'wpf-add', 'data-action': 'pull', 'data-table': sec.id, text: sec.pull.label }));
      if (sec.examples) actions.appendChild(h('button', { type: 'button', className: 'wpf-add wpf-ex-clear', 'data-action': 'clear-examples', 'data-table': sec.id, text: 'Remove the example jobs' }));
      box.appendChild(actions);
    }
    // The task library: common jobs for this road, including the invisible ones, one tap to add
    var lib = sec.library && global.TOL_TASK_LIBRARY ? global.TOL_TASK_LIBRARY(this.road(), sec.library) : null;
    // with the household's own jobs first, once this sheet is using the household's names
    var hhg = this.hhLibGroup(sec);
    if (hhg) lib = { intro: lib && lib.intro, count: (lib ? lib.count : 0) + hhg.items.length, groups: [hhg].concat(lib && lib.groups ? lib.groups : []) };
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
      var open = {};
      Array.prototype.forEach.call(dl.querySelectorAll('details[data-more]'), function (d) { if (d.open) open[d.getAttribute('data-more')] = true; });
      dl.innerHTML = '';
      sec.compute(ctx).forEach(function (it) {
        dl.appendChild(h('dt', { text: it.label }));
        var dd;
        if (it.more) {
          // the number and how it is worked out, folded away under the plain words
          var det = h('details', { className: 'wpf-more', 'data-more': it.label, open: open[it.label] ? 'open' : null }, [h('summary', { text: it.value + ' · ' + it.more })]);
          if (it.note) det.appendChild(h('span', { className: 'wpf-help', text: it.note }));
          dd = h('dd', null, [det]);
        } else {
          dd = h('dd', { text: it.value });
          // a link on screen stands in for the address written out in the PDF's note
          if (it.link) dd.appendChild(h('span', { className: 'wpf-help' }, [h('a', { href: it.link[1], text: it.link[0] + ' \u2192' })]));
          else if (it.note) dd.appendChild(h('span', { className: 'wpf-help', text: it.note }));
        }
        dl.appendChild(dd);
      });
    });
    Array.prototype.forEach.call(this.root.querySelectorAll('output[data-computed]'), function (o) {
      var p = o.getAttribute('data-computed').split(':');
      var sec = self.schema.sections.filter(function (s) { return s.id === p[0]; })[0];
      var col = sec.columns.filter(function (c) { return c.id === p[2]; })[0];
      o.textContent = col.compute(self.state.tables[p[0]][+p[1]] || {});
    });
    // Person drop-downs: fresh names, in the order they were typed at the top
    Array.prototype.forEach.call(this.root.querySelectorAll('select[data-person-select]'), function (sel) {
      var opts = Array.prototype.slice.call(sel.querySelectorAll('option[data-person]'));
      opts.forEach(function (o) { o.textContent = ctx.name(o.getAttribute('data-person')); });
    });
    this.refreshExamples();
    this.refreshClosing();
    Array.prototype.forEach.call(this.root.querySelectorAll('.wpf-person-x'), function (b) {
      var i = +b.getAttribute('data-person');
      b.setAttribute('aria-label', 'Remove ' + ctx.name(CODES[i]));
    });
    Array.prototype.forEach.call(this.root.querySelectorAll('[data-fixed]'), function (t) { t.textContent = rowLabel(t.getAttribute('data-fixed'), ctx); });
    Array.prototype.forEach.call(this.root.querySelectorAll('[data-name-of]'), function (t) { t.textContent = ctx.name(t.getAttribute('data-name-of')); });
    Array.prototype.forEach.call(this.root.querySelectorAll('input[type="number"]'), function (t) { self.flagRange(t); });
  };

  // Starter rows that nobody has changed carry an "Example" tag; it goes as soon as the row is edited.
  A.refreshExamples = function () {
    var self = this, any = {};
    Array.prototype.forEach.call(this.root.querySelectorAll('tr[data-ex-table]'), function (tr) {
      var tid = tr.getAttribute('data-ex-table'), sec = self.schema.sections.filter(function (s) { return s.id === tid; })[0];
      var ex = isExampleRow(sec, (self.state.tables[tid] || [])[+tr.getAttribute('data-ex-row')]);
      tr.classList.toggle('wpf-row-example', ex);
      if (ex) any[tid] = true;
    });
    Array.prototype.forEach.call(this.root.querySelectorAll('[data-action="clear-examples"]'), function (b) { b.hidden = !any[b.getAttribute('data-table')]; });
  };

  // The closing tick: a calm "Agreed on …" line once ticked, and, while something still needs doing
  // first (WP-03: a job with no owner), a gentle note and a box that waits.
  A.refreshClosing = function () {
    var sec = this.schema.sections.filter(function (s) { return s.id === 'closing'; })[0];
    var box = this.root.querySelector('input[data-key="agreed"]'), note = this.root.querySelector('#wpf-agreed-note');
    if (!sec || !box || !note) return;
    var v = this.state.values, on = !!v.agreed, waiting = sec.notYet ? sec.notYet(this.ctx()) : [];
    var list = waiting.slice(0, 5).join(', ') + (waiting.length > 5 ? ' and ' + (waiting.length - 5) + ' more' : '');
    box.disabled = !on && waiting.length > 0;
    note.className = 'wpf-agreed-note' + (on ? ' is-agreed' : waiting.length ? ' is-waiting' : '');
    var text = '';
    if (on) text = agreedLine(sec, v) + (waiting.length ? ' Since then, ' + (waiting.length === 1 ? 'one job has' : waiting.length + ' jobs have') + ' been added without an owner: ' + list + '.' : '');
    else if (waiting.length) text = (waiting.length === 1 ? 'One job doesn’t' : 'A few jobs don’t') + ' have an owner yet: ' + list + '. Give ' + (waiting.length === 1 ? 'it an owner (or remove it)' : 'each one an owner (or remove the ones that don’t apply)') + ', and this box will be ready to tick.';
    if (note.textContent !== text) note.textContent = text;
  };

  A.onInput = function (e) {
    var t = e.target;
    if (t.getAttribute('data-rows-for')) {
      if (e.type !== 'change') return;
      this.rowsFor = this.rowsFor || {}; this.rowsFor[t.getAttribute('data-rows-for')] = t.value;
      var y = global.scrollY, id = t.getAttribute('data-rows-for');
      this.render();
      global.scrollTo(0, y);
      var again = this.root.querySelector('[data-rows-for="' + id + '"]'); if (again) again.focus();
      return;
    }
    if (this.undo) { this.undo = null; Array.prototype.forEach.call(this.root.querySelectorAll('.wpf-undo'), function (x) { x.remove(); }); }
    var val = t.type === 'checkbox' ? t.checked : t.value;
    var tbl = t.getAttribute('data-table');
    if (tbl && t.getAttribute('data-col')) {
      this.state.tables[tbl][+t.getAttribute('data-row')][t.getAttribute('data-col')] = val;
      // the same box can be on the page twice (tonight's check-in and the week's table): keep them in step
      Array.prototype.forEach.call(this.root.querySelectorAll('[data-table="' + tbl + '"][data-row="' + t.getAttribute('data-row') + '"][data-col="' + t.getAttribute('data-col') + '"]'), function (o) {
        if (o !== t && o.type !== 'checkbox' && o.value !== val) o.value = val;
      });
      // tonight's check-in on a week with no date yet: the week is this one
      if (t.getAttribute('data-tonight') && val && (this.schema.meta || []).some(function (f) { return f.id === 'weekOf'; }) && isBlank(this.state.values.weekOf)) {
        this.state.values.weekOf = thisMonday();
        var wk = this.root.querySelector('[data-key="weekOf"]'); if (wk) wk.value = this.state.values.weekOf;
      }
    } else if (t.getAttribute('data-key')) {
      if (t.type === 'radio' && !t.checked) return;
      this.state.values[t.getAttribute('data-key')] = val;
      // the day the closing box was ticked, for the "Agreed on …" line
      if (t.getAttribute('data-key') === 'agreed') { if (val) { if (!this.state.values.agreedOn) this.state.values.agreedOn = today(); } else delete this.state.values.agreedOn; }
    } else return;
    this.changed();
    this.refresh();
    if (t.type === 'number' && e.type === 'change') { var msg = rangeProblem(this.defFor(t), t.value); if (msg) this.status(msg); }
  };

  A.changed = function () {
    this.dirty = true;
    if (this.opts.onChange) this.opts.onChange(this.state);
    if (this.hhWrite) this.hhWrite.soon();
    if (this.keep) this.keepSoon();
    this.tabSoon();
    if (this.afterChange) this.afterChange();
  };
  // "Safe": the page as it is now has been kept on this device, saved as a file, downloaded as a PDF
  // or sent as a link. Leaving the page then asks nothing; any change after that asks again.
  A.markSafe = function (sig) {
    this.safeSig = sig || JSON.stringify(this.state);
    this.dirty = false;
    this.tabNow();
  };
  A.isDirty = function () {
    var now = JSON.stringify(this.state);
    return now !== this.safeSig && now !== JSON.stringify(blankState(this.schema));
  };
  A.hasAnything = function () { return JSON.stringify(this.state) !== JSON.stringify(blankState(this.schema)); };

  /* ---------- the household: names and jobs typed once, offered in every tool (/assets/js/household.js) ---------- */
  function HHmod() { return global.TOLHousehold || null; }
  A.hhTool = function () { return String(this.schema.code || '').toLowerCase(); };
  // The job list a household's jobs go into: One owner per job's table (on any road)
  A.hhJobTable = function () { return this.schema.sections.filter(function (s) { return s.type === 'table' && s.library === 'owner'; })[0] || null; };
  A.hhNames = function () {
    var v = this.state.values;
    return this.schema.people ? CODES.slice(0, peopleCount(v)).map(function (c) { return String(v['partner' + c] || '').trim(); }) : [];
  };
  A.hhNamesEmpty = function () { var HH = HHmod(); return this.hhNames().every(function (n) { return !n || (HH && HH.isPlaceholder(n)); }); };
  // Rows someone wrote in (not empty, not an untouched starter example)
  A.hhOwnRows = function (sec) { return (this.state.tables[sec.id] || []).filter(function (r) { return r && !rowIsEmpty(sec, r) && !isExampleRow(sec, r); }); };
  // What this sheet gives the household: its names, and on One owner per job its jobs and owners
  A.hhCollect = function () {
    var v = this.state.values, sec = this.hhJobTable(), out = { people: this.hhNames() };
    if (sec) {
      var jobs = this.hhOwnRows(sec).filter(function (r) { return r.task && String(r.task).trim(); }).map(function (r) {
        return { name: String(r.task).trim(), owner: r.r && CODES.indexOf(r.r) >= 0 ? String(v['partner' + r.r] || '').trim() : '' };
      });
      if (jobs.length) out.jobs = jobs; // none written here yet: the household keeps its own
    }
    return out;
  };
  A.hhCode = function (name) {
    var names = this.hhNames(), k = String(name || '').toLowerCase();
    for (var i = 0; i < names.length; i++) if (k && names[i].toLowerCase() === k) return CODES[i];
    return '';
  };
  // The household's jobs in the task library, once this sheet is using the household's names
  A.hhLibGroup = function (sec) {
    var HH = HHmod(), hh = HH && sec.library ? HH.get() : null;
    if (!hh || !hh.jobs.length) return null;
    var names = this.hhNames().map(function (n) { return n.toLowerCase(); });
    var using = this.hhUsed || (hh.people.length > 0 && hh.people.every(function (p) { return names.indexOf(p.toLowerCase()) >= 0; }));
    if (!using) return null;
    return { name: 'Your household\u2019s jobs', items: hh.jobs.map(function (j) { return [j.name, '']; }) };
  };
  A.hhOfferEl = function () {
    var HH = HHmod(), hh = HH && !this.hhNo ? HH.get() : null;
    if (!hh) return null;
    if (!this.schema.people) return this.hhNameOfferEl(hh);
    var self = this, sec = this.hhJobTable();
    var canNames = !!this.schema.people && !this.opts.fixedPeople && hh.people.length > 0 && this.hhNamesEmpty();
    var canJobs = !!sec && hh.jobs.length > 0 && !this.hhOwnRows(sec).length;
    if (!canNames && !canJobs) return null;
    return HH.offer({
      question: canNames ? 'Use your household from before?' : 'Use your household\u2019s jobs?',
      names: canNames ? hh.people : [],
      jobs: canJobs ? hh.jobs.map(function (j) { return j.name; }) : [],
      status: this.opts.statusEl || document.getElementById('wpf-status'),
      onUse: function () { return self.hhUse(canNames, canJobs); },
      onNo: function () { self.hhNo = true; },
      focus: function () { return self.root.querySelector(canNames ? '[data-key="partnerA"]' : '[data-col="task"]'); }
    });
  };
  // A sheet about one person ("Your name"): offer the household's names, one tap each, so nobody retypes
  // their name on every device. Only while the box is empty, and never in the Workpaper Suite (it names its sheets).
  A.hhNameOfferEl = function (hh) {
    var f = (this.schema.meta || []).filter(function (m) { return m.id === 'name'; })[0];
    if (!f || !hh.people.length || !isBlank(this.state.values.name) || this.opts.onChange) return null;
    if (global.document && !document.getElementById('tol-hh-css')) {
      var l = document.createElement('link'); l.id = 'tol-hh-css'; l.rel = 'stylesheet'; l.href = '/assets/css/household.css';
      (document.head || document.documentElement).appendChild(l);
    }
    var row = h('div', { className: 'tol-hh-btns' });
    hh.people.forEach(function (nm) { row.appendChild(h('button', { type: 'button', className: 'tol-hh-btn is-main', 'data-action': 'hh-name', 'data-name': nm, text: 'I\u2019m ' + nm })); });
    row.appendChild(h('button', { type: 'button', className: 'tol-hh-btn', 'data-action': 'hh-name', 'data-name': '', text: 'No thanks' }));
    return h('div', { className: 'tol-hh no-print no-bubble' }, [h('div', { className: 'tol-hh-offer', role: 'group', 'aria-label': 'Your name from your household' }, [
      h('p', { className: 'tol-hh-text' }, [h('strong', { text: 'Fill in your name? ' }), 'From the household kept on this device.']), row])]);
  };
  // Fill in the household: names only into empty places, never over a typed name; jobs at the top of
  // the job list, with their owner when that person is on this sheet. Starter examples stay below.
  A.hhUse = function (doNames, doJobs) {
    var HH = HHmod(), hh = HH && HH.get(), self = this, v = this.state.values, names = 0, jobs = 0;
    if (!hh) return '';
    if (doNames) {
      hh.people.forEach(function (nm) {
        var now = self.hhNames(), slot = -1;
        if (now.some(function (n) { return n.toLowerCase() === nm.toLowerCase(); })) return;
        now.forEach(function (n, i) { if (slot < 0 && (!n || HH.isPlaceholder(n))) slot = i; });
        if (slot < 0) { if (!addPerson(self.schema, self.state)) return; slot = peopleCount(v) - 1; }
        v['partner' + CODES[slot]] = nm;
        names++;
      });
      syncPeople(this.schema, this.state);
    }
    var sec = doJobs ? this.hhJobTable() : null;
    if (sec) {
      var rows = this.state.tables[sec.id] || [], have = {}, fresh = [];
      this.hhOwnRows(sec).forEach(function (r) { if (r.task) have[String(r.task).trim().toLowerCase()] = 1; });
      hh.jobs.forEach(function (j) {
        var k = j.name.toLowerCase();
        if (have[k]) return;
        have[k] = 1;
        var r = { task: j.name }, c = j.owner ? self.hhCode(j.owner) : '';
        if (c) r.r = c;
        fresh.push(r); jobs++;
      });
      var rest = rows.filter(function (r) { return r && !rowIsEmpty(sec, r) && !(isExampleRow(sec, r) && have[String(r.task).trim().toLowerCase()]); });
      this.state.tables[sec.id] = fresh.concat(rest);
      if (!this.state.tables[sec.id].length) this.state.tables[sec.id].push({});
    }
    this.hhUsed = true;
    this.changed();
    this.render();
    return HH.addedLine(names, jobs);
  };


  /* ---------- "Share this list": a link or code with the sheet inside it, after the # ---------- */
  // For a sheet two people keep together (One owner per job, the daily check-in): one phone shares its
  // list, the other opens it and chooses to combine it with what is there or to replace it. People are
  // matched by name. The list travels inside the link, after the "#", and a browser never sends that part
  // to any website, so nothing reaches a server: people pass the link or code between them themselves.
  var SHARE_CODE = 'TOLLIST1:', SHARE_HASH = '#list=';
  function b64urlEnc(str) {
    var bin = '';
    try { var b = new TextEncoder().encode(str); for (var i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]); } catch (e) { bin = unescape(encodeURIComponent(str)); }
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64urlDec(str) {
    var t = String(str || '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    while (t.length % 4) t += '=';
    var bin = atob(t);
    try { var a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new TextDecoder().decode(a); }
    catch (e) { return decodeURIComponent(escape(bin)); }
  }
  function fold(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase(); }
  // Read a shared list out of a link or a code (any text around it is fine). null if there isn't one.
  function readShared(text) {
    var s = String(text == null ? '' : text), m = /TOLLIST1:\s*([A-Za-z0-9_-]+)/.exec(s) || /#list=([A-Za-z0-9_-]+)/.exec(s), d = null;
    if (!m || m[1].length > 200000) return null;
    try { d = JSON.parse(b64urlDec(m[1])); } catch (e) { return null; }
    if (!d || d.t !== 'tol-list' || typeof d.wp !== 'string' || !Array.isArray(d.p)) return null;
    d.p = d.p.slice(0, MAX_PEOPLE).map(function (x) { return String(x == null ? '' : x).replace(/\s+/g, ' ').trim().slice(0, 40); });
    d.m = d.m && typeof d.m === 'object' ? d.m : {};
    d.tb = d.tb && typeof d.tb === 'object' ? d.tb : {};
    d.vals = d.vals && typeof d.vals === 'object' ? d.vals : null;
    d.s = typeof d.s === 'number' && isFinite(d.s) ? d.s : null;
    return d;
  }
  A.shareWhat = function () { return (this.schema.share && this.schema.share.what) || 'list'; };
  // This sheet as a small object: names, the boxes at the top, and the rows someone wrote (never the
  // untouched examples, never the closing tick, never a private answer).
  A.shareData = function () {
    var st = this.state, v = st.values;
    if (!this.schema.people) return this.shareDataOne();
    var n = peopleCount(v), names = CODES.slice(0, n).map(function (c) { return String(v['partner' + c] || '').trim(); });
    if (names.some(function (x) { return !x; })) return { error: 'Give everyone a name at the top first, so the other phone knows who is who.' };
    var d = { t: 'tol-list', v: 1, wp: this.schema.code, p: names, m: {}, tb: {} }, rows = 0;
    (this.schema.meta || []).forEach(function (f) { if (!isBlank(v[f.id]) && typeof v[f.id] !== 'object') d.m[f.id] = v[f.id]; });
    this.schema.sections.forEach(function (s) {
      if (s.type !== 'table') return;
      var out = [];
      (st.tables[s.id] || []).forEach(function (r) {
        if (!r || rowIsEmpty(s, r) || isExampleRow(s, r)) return;
        var o = {};
        s.columns.forEach(function (c) {
          var x = r[c.id];
          if (c.type === 'computed' || isBlank(x)) return;
          if (c.type === 'person') { var i = CODES.indexOf(x); x = x === 'Both' ? '*' : i >= 0 ? names[i] || '' : ''; if (!x) return; }
          o[c.id] = x;
        });
        out.push(o); rows++;
      });
      if (out.length) d.tb[s.id] = out;
    });
    if (!rows) return { error: this.shareWhat() === 'week' ? 'Write something on the sheet first, then share it.' : 'Add a job (or give an example job an owner) first, then share the list.' };
    return d;
  };
  // A sheet one person fills in about themselves (How much are you carrying?): their name, the date,
  // their answers and the score they add up to. Never a private answer.
  A.shareDataOne = function () {
    var sc = this.schema, v = this.state.values, name = String(v.name || '').trim(), keys = (sc.share && sc.share.values) || [];
    if (!name) return { error: 'Type your name at the top first, so the others know whose ' + this.shareWhat() + ' this is.' };
    var d = { t: 'tol-list', v: 1, wp: sc.code, p: [name], m: {}, tb: {}, vals: {} }, got = 0;
    (sc.meta || []).forEach(function (f) { if (!isBlank(v[f.id]) && typeof v[f.id] !== 'object') d.m[f.id] = v[f.id]; });
    keys.forEach(function (k) { if (!isBlank(v[k]) && typeof v[k] !== 'object') { d.vals[k] = v[k]; got++; } });
    var sc0 = sc.share && sc.share.score ? sc.share.score(makeCtx(sc, this.state)) : null;
    if (sc.share && sc.share.score && sc0 == null) return { error: 'Answer all five rows first, then share your score.' };
    if (sc0 != null) d.s = Math.round(sc0 * 100) / 100;
    if (!got) return { error: 'Write something on the sheet first, then share it.' };
    return d;
  };
  A.shareLink = function (d) {
    var loc = global.location, enc = b64urlEnc(JSON.stringify(d));
    return { link: loc.origin + loc.pathname + loc.search + SHARE_HASH + enc, code: SHARE_CODE + enc };
  };
  // How many rows a shared list holds, for the offer ("12 jobs")
  A.sharedCount = function (d) {
    var self = this, n = 0;
    if (d.vals && typeof d.vals === 'object') n += Object.keys(d.vals).length;
    Object.keys(d.tb).forEach(function (k) { var s = self.schema.sections.filter(function (x) { return x.id === k; })[0]; if (s && Array.isArray(d.tb[k])) n += d.tb[k].length; });
    return n;
  };
  A.shareEl = function () {
    var what = this.shareWhat(), open = this.shareOpen || '';
    var box = h('div', { className: 'wpf-share no-print tol-plain', role: 'group', 'aria-label': 'Share this ' + what });
    var one = !this.schema.people;
    box.appendChild(h('p', { className: 'wpf-share-h', text: one ? 'Sharing your ' + what + ' with the others?' : what === 'week' ? 'Keeping this week together?' : 'Keeping this list together?' }));
    box.appendChild(h('p', { className: 'wpf-help', text: one ? 'Send it as a link instead of a file, and open theirs here. Someone else\u2019s ' + what + ' goes into \u201cYour partner\u2019s score\u201d below; your own answers stay as they are.' : 'Send it to the others as a link, and open theirs here. When you open one, you choose to combine it with what is here or to replace it. People are matched by name.' }));
    box.appendChild(h('div', { className: 'wpf-share-btns' }, [
      h('button', { type: 'button', className: 'wpf-add', 'data-action': 'share-make', 'aria-expanded': open === 'make' ? 'true' : 'false', text: one ? 'Share as a link' : 'Share this ' + what }),
      h('button', { type: 'button', className: 'wpf-add', 'data-action': 'share-open', 'aria-expanded': open === 'open' ? 'true' : 'false', text: 'Open a shared ' + what })
    ]));
    if (open === 'make') {
      var p = h('div', { className: 'wpf-share-panel', id: 'wpf-share-make' });
      var made = this.shareMade;
      if (made && made.error) p.appendChild(h('p', { className: 'wpf-share-msg', role: 'note', text: made.error }));
      else if (made) {
        p.appendChild(h('div', { className: 'wpf-share-btns' }, [this.sendBtn('Send it: text, WhatsApp, email\u2026', true)]));
        p.appendChild(h('p', { className: 'wpf-help wpf-share-new', text: 'A link holds the ' + what + ' as it is right now. Each time either of you changes something, send a new link: an old one won\u2019t show the change.' }));
        var lid = 'f' + (++this.uid);
        p.appendChild(h('label', { for: lid, className: 'wpf-share-l', text: 'Or copy the link yourself' }));
        var ta = h('textarea', { id: lid, rows: '3', readonly: 'readonly', className: 'wpf-share-code', 'data-share-out': 'link', spellcheck: 'false' });
        ta.value = made.link;
        p.appendChild(ta);
        p.appendChild(h('div', { className: 'wpf-share-btns' }, [
          h('button', { type: 'button', className: 'wpf-add', 'data-action': 'share-copy-link', text: 'Copy the link' }),
          h('button', { type: 'button', className: 'wpf-add', 'data-action': 'share-copy-code', text: 'Copy it as a code instead' })
        ]));
        p.appendChild(h('p', { className: 'wpf-help', text: 'The ' + what + ' travels inside the link, after the # sign. Browsers never send that part to a website, so it doesn\u2019t reach this site or any server. Anyone with the link can read it, so send it only to the people on it.' }));
      }
      box.appendChild(p);
    }
    if (open === 'open') {
      var q = h('div', { className: 'wpf-share-panel', id: 'wpf-share-open' }), iid = 'f' + (++this.uid);
      q.appendChild(h('label', { for: iid, className: 'wpf-share-l', text: 'Paste the link or code you were sent' }));
      var inp = h('textarea', { id: iid, rows: '3', className: 'wpf-share-code', 'data-share-in': '1', autocomplete: 'off', spellcheck: 'false' });
      inp.value = this.sharePaste || '';
      q.appendChild(inp);
      q.appendChild(h('div', { className: 'wpf-share-btns' }, one ? [
        h('button', { type: 'button', className: 'wpf-add', 'data-action': 'share-combine', text: 'Add it here' })
      ] : [
        h('button', { type: 'button', className: 'wpf-add', 'data-action': 'share-combine', text: 'Combine with what’s here' }),
        h('button', { type: 'button', className: 'wpf-add', 'data-action': 'share-replace', text: 'Replace what’s here' })
      ]));
      box.appendChild(q);
    }
    if (this.sendBack === 'share') box.appendChild(this.sendBackEl());
    return box;
  };
  // A button for the site's share sheet (Text, WhatsApp, Email, …, or the phone's own share menu). The
  // link is made fresh at the tap, from the sheet as it is then (see onClick, "share-fresh").
  A.sendBtn = function (label, main) {
    var what = this.shareWhat(), title = 'Our ' + String(this.schema.plain || this.schema.title).replace(/^the /i, '').replace(/^./, function (c) { return c.toLowerCase(); });
    var made = this.shareMade && !this.shareMade.error ? this.shareMade.link : '';
    return h('button', { type: 'button', className: 'wpf-add' + (main ? ' wpf-share-main' : ''), 'data-action': 'share-fresh', 'data-share': '', 'data-share-title': title,
      'data-share-text': title + ': open this to see ' + (what === 'week' ? 'the week' : 'the ' + what) + ' and add to it.', 'data-share-url': made || 'none', 'data-share-result': '', text: label });
  };
  // After a shared list or week is combined or opened here: the other phone still has the old one.
  A.sendBackEl = function () {
    var what = this.shareWhat();
    return h('div', { className: 'wpf-share-in wpf-sendback no-print tol-plain', role: 'group', 'aria-label': 'Send your changes back' }, [
      h('p', {}, [h('strong', { text: 'Send my changes back? ' }), 'The other phone still has the ' + what + ' as it was. Each change needs a new link, so send one now, and again after any change.']),
      h('div', { className: 'wpf-share-btns' }, [this.sendBtn('Send my changes back', true),
        h('button', { type: 'button', className: 'wpf-add', 'data-action': 'share-back-no', text: 'Not now' })])
    ]);
  };
  // A list that came in through a link: say whose and what, and let the person choose.
  A.shareInEl = function () {
    var d = this.sharedIn;
    if (!d) return null;
    var what = this.shareWhat(), n = this.sharedCount(d), names = d.p.filter(Boolean);
    var empty = answered(this.schema, this.state) === 0;
    var box = h('div', { className: 'wpf-share-in no-print tol-plain', role: 'group', 'aria-label': 'A shared ' + what, tabindex: '-1', id: 'wpf-share-in' });
    if (!this.schema.people) {
      box.appendChild(h('p', {}, [h('strong', { text: (names[0] || 'Someone') + ' shared their ' + what + ' with you. ' }), d.s != null ? 'Load score: ' + d.s.toFixed(2) + ' out of 1.00.' : '']));
      box.appendChild(h('p', { className: 'wpf-help', text: this.oneIsMine(d) ? 'It looks like your own sheet, so adding it fills in what is empty here.' : 'Adding it puts their score into \u201cYour partner\u2019s score\u201d. Your own answers stay as they are.' }));
      box.appendChild(h('div', { className: 'wpf-share-btns' }, [
        h('button', { type: 'button', className: 'wpf-add', 'data-action': 'share-in-combine', text: 'Add it here' }),
        h('button', { type: 'button', className: 'wpf-add', 'data-action': 'share-in-no', text: 'Not now' })
      ]));
      return box;
    }
    box.appendChild(h('p', {}, [h('strong', { text: 'Someone shared ' + (what === 'week' ? 'a week' : 'a list') + ' with you. ' }),
      (names.length ? 'Names: ' + names.join(', ') + '. ' : '') + n + (what === 'week' ? (n === 1 ? ' row.' : ' rows.') : (n === 1 ? ' job.' : ' jobs.'))]));
    box.appendChild(h('p', { className: 'wpf-help', text: empty ? 'Nothing is on this page yet, so either choice simply opens it.' : 'Combine keeps everything here and adds what is new, matching people by name. Where both have something different, this page keeps its own and tells you. Replace swaps this page for the shared ' + what + '.' }));
    box.appendChild(h('div', { className: 'wpf-share-btns' }, [
      h('button', { type: 'button', className: 'wpf-add', 'data-action': 'share-in-combine', text: 'Combine with what’s here' }),
      h('button', { type: 'button', className: 'wpf-add', 'data-action': 'share-in-replace', text: 'Replace what’s here' }),
      h('button', { type: 'button', className: 'wpf-add', 'data-action': 'share-in-no', text: 'Not now' })
    ]));
    return box;
  };
  A.onShare = function (act) {
    var self = this, what = this.shareWhat();
    function copyIt(text, ok) {
      function done(worked) {
        if (worked) { self.status(ok); if (self.shareSig) self.markSafe(self.shareSig); }
        else { var ta = self.root.querySelector('[data-share-out]'); if (ta) { ta.focus(); ta.select(); } self.status('Couldn’t copy here. The link is selected: copy it by hand.'); }
      }
      try {
        if (global.navigator && navigator.clipboard && navigator.clipboard.writeText && global.isSecureContext) { navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); }); return; }
      } catch (e) {}
      done(false);
    }
    var paste = this.root.querySelector('[data-share-in]');
    if (paste) this.sharePaste = paste.value;
    if (act === 'share-make' || act === 'share-open') {
      var which = act === 'share-make' ? 'make' : 'open';
      this.shareOpen = this.shareOpen === which ? '' : which;
      if (this.shareOpen === 'make') { var d = this.shareData(); this.shareMade = d.error ? d : this.shareLink(d); this.shareSig = d.error ? '' : JSON.stringify(this.state); }
      this.render();
      var focus = this.root.querySelector(this.shareOpen === 'open' ? '[data-share-in]' : this.shareOpen === 'make' ? (this.shareMade && this.shareMade.error ? '[data-action="share-make"]' : '[data-share-out]') : '[data-action="' + act + '"]');
      if (focus) focus.focus();
      if (this.shareOpen === 'make' && this.shareMade && this.shareMade.error) this.status(this.shareMade.error);
      return;
    }
    if (act === 'share-copy-link' && this.shareMade) { copyIt(this.shareMade.link, 'Link copied. Send it any way you like (a text, an email). Whoever opens it chooses to combine or replace.'); return; }
    if (act === 'share-copy-code' && this.shareMade) { copyIt(this.shareMade.code, 'Code copied. On the other device, open this page and paste it under “Open a shared ' + what + '”.'); return; }
    if (act === 'share-combine' || act === 'share-replace') {
      var got = readShared(this.sharePaste);
      if (!got) { this.status('That doesn’t look like a shared ' + what + '. Copy the whole link, or the code starting with TOLLIST1:'); if (paste) paste.focus(); return; }
      if (got.wp !== this.schema.code) { this.status('That is a shared ' + got.wp + '. Open it on the ' + got.wp + ' page.'); return; }
      var msg = this.takeShared(got, act === 'share-replace');
      if (msg) { this.sharePaste = ''; this.shareOpen = ''; this.sendBack = this.schema.people ? 'share' : ''; this.render(); this.status(msg); var t0 = this.root.querySelector('.wpf-sendback [data-action="share-fresh"]') || this.root.querySelector('[data-action="share-open"]'); if (t0) t0.focus(); }
      return;
    }
    if (act === 'share-in-combine' || act === 'share-in-replace') {
      var m = this.takeShared(this.sharedIn, act === 'share-in-replace');
      if (!m) return;
      this.sharedIn = null; this.sendBack = this.schema.people ? 'top' : ''; this.render(); this.status(m);
      var first = this.root.querySelector('.wpf-sendback [data-action="share-fresh"]') || this.root.querySelector('[data-key="partnerA"]'); if (first) first.focus();
      return;
    }
    if (act === 'share-in-no') {
      this.sharedIn = null; this.render();
      this.status('Left as it was. To open it later, tap the link again, or paste it under “Open a shared ' + what + '”.');
    }
  };
  // Take in a shared sheet. replace: the shared one instead of this page. Otherwise combine: add what is
  // new, fill in what is empty here, and keep this page's own answer wherever both have something different.
  // Is a shared one-person sheet this person's own (same name, or nothing here yet)?
  A.oneIsMine = function (d) {
    var mine = String(this.state.values.name || '').trim();
    return !mine || answered(this.schema, this.state) === 0 || fold(mine) === fold(d.p[0]);
  };
  A.takeSharedOne = function (d) {
    var sc = this.schema, v = this.state.values, what = this.shareWhat(), who = d.p[0] || 'Someone';
    if (this.oneIsMine(d)) {
      var filled = 0, differ = 0, vals = d.vals || {};
      (sc.meta || []).forEach(function (f) { var x = d.m[f.id]; if (x != null && typeof x !== 'object' && isBlank(v[f.id])) { v[f.id] = x; filled++; } });
      ((sc.share && sc.share.values) || []).forEach(function (k) {
        var x = vals[k];
        if (x == null || typeof x === 'object' || x === '') return;
        if (isBlank(v[k])) { v[k] = x; filled++; } else if (String(v[k]) !== String(x)) differ++;
      });
      this.state = sanitize(sc, this.state);
      this.changed();
      return 'Opened ' + who + '\u2019s ' + what + (filled ? '' : ': everything in it was already here') + '.' + (differ ? ' ' + (differ === 1 ? 'One answer is' : differ + ' answers are') + ' different, so this page kept its own.' : '') + ' Nothing was sent anywhere.';
    }
    if (d.s == null || !(d.s >= 0 && d.s <= 1)) return who + ' hasn\u2019t answered all five rows yet, so there is no score to add.';
    var list = String(v.partnerScore || '').split(/[,;\s]+/).filter(Boolean);
    var txt = d.s.toFixed(2);
    if (list.indexOf(txt) >= 0 && this.lastShared === who + txt) return who + '\u2019s score (' + txt + ') is already in \u201cYour partner\u2019s score\u201d.';
    list.push(txt);
    v.partnerScore = list.join(', ');
    this.lastShared = who + txt;
    this.state = sanitize(sc, this.state);
    this.changed();
    return 'Added ' + who + '\u2019s load score (' + txt + ') to \u201cYour partner\u2019s score\u201d. Your own answers are as they were. Nothing was sent anywhere.';
  };
  A.takeShared = function (d, replace) {
    var self = this, sc = this.schema, what = this.shareWhat();
    // a page that holds several sheets (the Workpaper Suite) may put it somewhere better first
    if (this.opts.takeShared) { var routed = this.opts.takeShared(d, replace, this); if (routed) return routed; }
    if (!sc.people) return this.takeSharedOne(d);
    if (replace && answered(sc, this.state) > 0 && !global.confirm('Replace what is on this page with the shared ' + what + '?')) return '';
    var st = replace ? blankState(sc) : this.state, v = st.values, added = { people: [], rows: 0, filled: 0 }, differ = [], dropped = [];
    if (replace) {
      sc.sections.forEach(function (s) { if (s.type === 'table' && s.examples) st.tables[s.id] = []; });
      v.peopleCount = 0;
      CODES.forEach(function (c) { delete v['partner' + c]; });
    }
    // people, matched by name; someone new goes into an empty place, or is added to the sheet
    var map = {}, taken = {};
    function placeholder(x) { x = String(x || '').trim(); return !x || /^(me|them|you|person [a-h1-8])$/i.test(x); }
    d.p.forEach(function (nm) {
      if (!nm) return;
      var n = peopleCount(v), k = fold(nm), hit = -1, i;
      for (i = 0; i < n && hit < 0; i++) if (!taken[i] && fold(v['partner' + CODES[i]]) === k) hit = i;
      for (i = 0; i < n && hit < 0; i++) if (!taken[i] && placeholder(v['partner' + CODES[i]])) hit = i;
      if (hit < 0) { if (!addPerson(sc, st)) { dropped.push(nm); return; } hit = peopleCount(v) - 1; }
      if (placeholder(v['partner' + CODES[hit]])) { v['partner' + CODES[hit]] = nm; if (!replace) added.people.push(nm); }
      taken[hit] = 1; map[k] = CODES[hit];
    });
    if (replace) v.peopleCount = Math.max(minPeople, d.p.filter(Boolean).length);
    syncPeople(sc, st);
    // the boxes at the top
    (sc.meta || []).forEach(function (f) { var x = d.m[f.id]; if (x != null && typeof x !== 'object' && isBlank(v[f.id])) v[f.id] = x; });
    function personVal(x) { return x === '*' ? 'Both' : map[fold(x)] || ''; }
    function show(c, x) { return c.type === 'person' ? (x === 'Both' ? 'Both' : makeCtx(sc, st).name(x)) : String(x); }
    sc.sections.forEach(function (s) {
      var inc = Array.isArray(d.tb[s.id]) ? d.tb[s.id] : null;
      if (s.type !== 'table' || !inc) return;
      var rows = st.tables[s.id] || (st.tables[s.id] = []), key = sc.share && sc.share.keys ? sc.share.keys[s.id] : null;
      inc.slice(0, 400).forEach(function (raw) {
        if (!raw || typeof raw !== 'object') return;
        var r = {};
        s.columns.forEach(function (c) {
          var x = raw[c.id];
          if (c.type === 'computed' || x == null || typeof x === 'object' || x === '') return;
          if (c.type === 'person') { x = personVal(x); if (!x) return; }
          if (c.type === 'select' && c.options.indexOf(x) < 0) return;
          r[c.id] = x;
        });
        if (rowIsEmpty(s, r) && !(s.personDays && r.day && r.who)) return;
        var hit = null;
        if (s.personDays) { if (!r.who || !r.day) return; hit = rows.filter(function (x) { return x && x.day === r.day && x.who === r.who; })[0] || null; }
        else if (key) hit = rows.filter(function (x) { return x && !isBlank(x[key]) && fold(x[key]) === fold(r[key]); })[0] || null;
        else hit = rows.filter(function (x) { return x && s.columns.every(function (c) { return c.type === 'computed' || fold(x[c.id]) === fold(r[c.id]); }); })[0] || null;
        if (hit && isExampleRow(s, hit)) { Object.keys(hit).forEach(function (k) { delete hit[k]; }); Object.keys(r).forEach(function (k) { hit[k] = r[k]; }); added.rows++; return; }
        if (hit) {
          var took = false;
          s.columns.forEach(function (c) {
            if (c.type === 'computed' || c.prefill || isBlank(r[c.id])) return;
            if (isBlank(hit[c.id])) { hit[c.id] = r[c.id]; took = true; }
            else if (fold(hit[c.id]) !== fold(r[c.id])) differ.push((s.personDays ? r.day + ', ' + show({ type: 'person' }, r.who) : String(hit[key] || r[key] || '')) + ': ' + c.label.replace(/\s*\(optional\)$/i, '').toLowerCase() + ' is ' + show(c, r[c.id]) + ' there, ' + show(c, hit[c.id]) + ' here');
          });
          if (took) added.filled++;
          return;
        }
        var slot = rows.filter(function (x) { return x && rowIsEmpty(s, x) && !isExampleRow(s, x); })[0];
        if (slot && !s.personDays) Object.keys(r).forEach(function (k) { slot[k] = r[k]; }); else rows.push(r);
        added.rows++;
      });
      if (!rows.length) rows.push({});
    });
    this.state = sanitize(sc, st);
    syncPeople(sc, this.state);
    this.changed();
    if (this.hhWrite) this.hhWrite.soon();
    var unit = what === 'week' ? ['row', 'rows'] : ['job', 'jobs'];
    if (replace) return 'Opened the shared ' + what + ': ' + d.p.filter(Boolean).join(', ') + '. ' + (dropped.length ? 'There was no room for ' + dropped.join(', ') + ' (eight people at most). ' : '') + 'Nothing was sent anywhere.';
    var bits = [];
    if (added.rows) bits.push(added.rows + ' ' + (added.rows === 1 ? unit[0] : unit[1]) + ' added');
    if (added.filled) bits.push(added.filled + ' filled in where this page was empty');
    if (added.people.length) bits.push(added.people.join(', ') + ' added to the names');
    var msg = 'Combined with the shared ' + what + (bits.length ? ': ' + bits.join('; ') + '.' : ': everything in it was already here.');
    if (differ.length) msg += ' ' + (differ.length === 1 ? 'One thing is' : differ.length + ' things are') + ' different on the shared ' + what + ', so this page kept its own: ' + differ.slice(0, 4).join('; ') + (differ.length > 4 ? '; and ' + (differ.length - 4) + ' more' : '') + '. Change ' + (differ.length === 1 ? 'it' : 'them') + ' here if you agree.';
    if (dropped.length) msg += ' There was no room for ' + dropped.join(', ') + ' (eight people at most).';
    return msg;
  };

  /* ---------- a draft for this tab only (sessionStorage): on by default, gone when the tab closes ---------- */
  // It protects someone who is interrupted, reloads or presses Back. Nothing is written to the device.
  A.tabKey = function () { return TAB_PREFIX + this.schema.code + (this.schema.road ? ':' + this.schema.road : ''); };
  A.tabSoon = function () {
    var self = this;
    clearTimeout(this.tabTimer);
    this.tabTimer = setTimeout(function () { self.tabNow(); }, 300);
  };
  A.tabNow = function () {
    var rec = { format: DRAFT_FORMAT, version: DRAFT_VERSION, workpaper: this.schema.code, state: this.state };
    // whether this state was already kept, saved, downloaded or sent, so a reload doesn't start asking again
    if (this.safeSig && JSON.stringify(this.state) === this.safeSig) rec.safe = 1;
    try { global.sessionStorage.setItem(this.tabKey(), JSON.stringify(rec)); } catch (e) {}
  };
  A.readTab = function () {
    try {
      var d = JSON.parse(global.sessionStorage.getItem(this.tabKey()) || 'null');
      return d && d.format === DRAFT_FORMAT && d.workpaper === this.schema.code && d.state ? d : null;
    } catch (e) { return null; }
  };
  A.clearTab = function () { clearTimeout(this.tabTimer); try { global.sessionStorage.removeItem(this.tabKey()); } catch (e) {} };

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
      this.markSafe();
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
    if (this.afterChange) this.afterChange();
    if (on) {
      if (this.keepNow()) this.status('Kept on this device. It will be here next time you open this page. Press “Erase” to remove it.');
    } else {
      clearTimeout(this.keepTimer);
      try { global.localStorage.removeItem(this.keepKey()); } catch (e) {}
      this.safeSig = null;
      this.dirty = answered(this.schema, this.state) > 0;
      this.status('Not kept any more. Nothing from this worksheet is stored on this device.');
    }
  };
  A.eraseKept = function () {
    clearTimeout(this.keepTimer);
    try { global.localStorage.removeItem(this.keepKey()); } catch (e) {}
    this.keep = false;
    this.safeSig = null;
    this.dirty = answered(this.schema, this.state) > 0;
    this.status('Erased. Nothing from this worksheet is stored on this device. What is on the page stays until you close it.');
    var n = document.getElementById('wpf-erase-note');
    if (n) { n.textContent = ''; setTimeout(function () { n.textContent = 'Erased from this device.'; }, 30); }
  };

  A.onClick = function (e) {
    var b = e.target.closest('button[data-action]');
    if (!b) return;
    var act = b.getAttribute('data-action');
    if (act === 'share-fresh') {
      // the link, made now from what is on the sheet, handed to the site's share sheet (site.js reads
      // data-share-url when this click reaches the page); a sheet that can't be shared yet says why instead
      var d0 = this.shareData();
      if (d0.error) { e.stopPropagation(); e.preventDefault(); this.status(d0.error); return; }
      this.shareMade = this.shareLink(d0);
      this.shareSig = JSON.stringify(this.state);
      b.setAttribute('data-share-url', this.shareMade.link);
      var out = this.root.querySelector('[data-share-out]'); if (out) out.value = this.shareMade.link;
      return;
    }
    if (act === 'share-back-no') { this.sendBack = ''; this.render(); this.status('No problem. \u201cShare this ' + this.shareWhat() + '\u201d makes a new link whenever you\u2019re ready.'); return; }
    if (act.indexOf('share-') === 0) { this.onShare(act); return; }
    if (act === 'hh-name') {
      var nm0 = b.getAttribute('data-name');
      if (nm0) { this.state.values.name = nm0; this.changed(); } else this.hhNo = true;
      this.render();
      var nb = this.root.querySelector('[data-key="name"]'); if (nb) nb.focus();
      this.status(nm0 ? 'Filled in your name: ' + nm0 + '. Change it any time.' : 'No problem. Type your name in the box if you like.');
      return;
    }
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
    if (action === 'week-toggle') {
      this.weekOpen = this.weekOpen || {};
      this.weekOpen[tbl] = !this.weekOpen[tbl];
      this.render();
      var wt = this.root.querySelector('[data-action="week-toggle"][data-table="' + tbl + '"]');
      if (wt) wt.focus();
      this.status(this.weekOpen[tbl] ? 'Showing the whole week.' : 'Showing just today. The other days are folded away, not removed.');
      return;
    }
    if (action === 'clear-examples') {
      var left = rows.filter(function (r) { return !isExampleRow(sec, r); }), gone = rows.length - left.length;
      this.state.tables[tbl] = left.length ? left : [{}];
      this.changed();
      this.render();
      this.status(gone ? 'Removed ' + gone + ' example ' + (gone === 1 ? 'job' : 'jobs') + '. Your own rows are still here.' : 'There are no untouched example jobs left.');
      var first = this.root.querySelector('[data-table="' + tbl + '"][data-col="task"]');
      if (first) first.focus();
      return;
    }
    if (action === 'add') {
      rows.push({});
      this.changed();
      this.render();
      var inputs = this.root.querySelectorAll('[data-table="' + tbl + '"][data-row="' + (rows.length - 1) + '"]');
      if (inputs[0]) inputs[0].focus();
    } else if (action === 'remove') {
      // One tap removes the row; a row with something written in it can come back with "Undo".
      // (No confirm box: some phones and in-app browsers block it, and the tap then did nothing.)
      var i = +b.getAttribute('data-row'), gone = rows[i], wasEmpty = !gone || rowIsEmpty(sec, gone);
      rows.splice(i, 1);
      var filler = false;
      if (!rows.length) { rows.push({}); filler = true; }
      this.undo = wasEmpty ? null : { tbl: tbl, i: i, row: gone, filler: filler, what: rowName(sec, gone) };
      this.changed();
      this.render();
      var nextX = this.root.querySelector('button[data-action="remove"][data-table="' + tbl + '"][data-row="' + Math.min(i, rows.length - 1) + '"]');
      var undoB = this.root.querySelector('[data-action="undo-remove"]');
      if (undoB) undoB.focus(); else if (nextX) nextX.focus();
      this.status(wasEmpty ? 'Removed an empty row.' : 'Removed ' + (this.undo.what ? '\u201c' + this.undo.what + '\u201d' : 'that row') + '. Tap Undo to bring it back.');
    } else if (action === 'undo-remove') {
      var u = this.undo;
      if (!u || u.tbl !== tbl) return;
      var back = this.state.tables[tbl];
      if (u.filler && back.length === 1 && rowIsEmpty(sec, back[0])) back.length = 0;
      back.splice(Math.min(u.i, back.length), 0, u.row);
      this.undo = null;
      this.changed();
      this.render();
      var bx = this.root.querySelector('[data-table="' + tbl + '"][data-row="' + Math.min(u.i, back.length - 1) + '"]:not(button)');
      if (bx) bx.focus();
      this.status('Brought ' + (u.what ? '\u201c' + u.what + '\u201d' : 'the row') + ' back.');
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

  // Download names use the plain name, e.g. One-owner-per-job-WP-03-2026-10-07.pdf (slug is only used here).
  A.fileBase = function () { return (this.schema.slug || this.schema.code) + '-' + this.schema.code + '-' + today(); };

  A.savePdf = function () {
    try {
      var bytes = buildPdf(this.schema, this.state);
      download(bytes, this.fileBase() + '.pdf', 'application/pdf');
      this.markSafe();
      this.status('PDF downloaded to this device. Check your Downloads folder.');
    } catch (err) {
      this.status('The PDF could not be created. Save a draft file so nothing is lost, then try again.');
      if (window.console) console.error(err);
    }
  };

  // A copy for a file that may be passed on: a private answer (privateOptIn) stays out unless its box is ticked.
  A.shareableState = function () {
    var st = this.state, out = null;
    this.schema.sections.forEach(function (sec) {
      (sec.fields || []).forEach(function (f) {
        if (!f.privateOptIn || st.values[f.id + '__include'] || isBlank(st.values[f.id])) return;
        if (!out) out = clone(st);
        delete out.values[f.id];
      });
    });
    return out || st;
  };

  A.saveDraft = function () {
    var shared = this.shareableState(), left = shared !== this.state;
    var draft = { format: DRAFT_FORMAT, version: DRAFT_VERSION, workpaper: this.schema.code, saved: new Date().toISOString(), state: shared };
    download(JSON.stringify(draft, null, 2), this.fileBase() + '-draft.json', 'application/json');
    this.markSafe();
    this.status('Draft file downloaded. Open it here later to keep working, or send it to someone on your road so they can add their part.' + (left ? ' Your raw reaction stayed out of it, as it is just for you; tick its box to include it.' : ''));
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
      this.markSafe();
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
      self.render();
      self.markSafe();
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
    this.render();
    this.markSafe();
    if (this.keep) this.keepSoon();
    this.status(msg || 'Opened.');
  };

  A.clear = function () {
    if (!window.confirm('Clear everything on this page? Anything you haven\'t saved as a PDF or draft file will be gone.')) return;
    this.state = blankState(this.schema);
    this.dirty = false;
    this.clearTab();
    this.render();
    if (this.keep) { this.eraseKept(); var k = document.getElementById('wpf-keep'); if (k) k.checked = false; }
    this.status('Cleared. Nothing from this worksheet remains on the page' + (this.keep ? '.' : ', and nothing is kept on this device.'));
  };

  // The notes about privacy, drafts, PDFs and the ideas behind the sheet, folded under one
  // "How saving works", so the names and the first rows are on the first screen. Nothing is removed.
  function foldHow() {
    var priv = document.querySelector('main .wpf-privacy');
    if (!priv || priv.closest('.wpf-how')) return;
    var det = h('details', { className: 'wpf-how no-bubble', id: 'wpf-how' }, [
      h('summary', null, [h('span', { className: 'wpf-how-t', text: 'How saving works' }), h('span', { className: 'wpf-how-s', text: 'It stays on this device' })])]);
    priv.parentNode.insertBefore(det, priv);
    det.appendChild(priv);
    var idea = document.querySelector('main > .pillar-note');
    if (idea) det.appendChild(idea);
  }
  // "Keep this on this device so it's here tomorrow? [Keep it] [Not now]", in the save bar (always in
  // view, and it never pushes the form about). "Not now" is remembered for this tab only.
  // o: { key, bar, want(), onKeep() }. Returns { check, hide }.
  function keepAsk(o) {
    var el = null, noKey = 'tol-keepask-no:' + o.key;
    function can() {
      try { if (global.sessionStorage.getItem(noKey)) return false; global.localStorage.setItem('tol-keepask-test', '1'); global.localStorage.removeItem('tol-keepask-test'); return true; } catch (e) { return false; }
    }
    function hide() { if (el) { el.remove(); el = null; } }
    function check() {
      if (!o.bar) return;
      if (!o.want()) { hide(); return; }
      if (el || !can()) return;
      el = h('div', { className: 'wpf-keepask no-print', role: 'group', 'aria-label': 'Keep a draft on this device' }, [
        h('p', { className: 'wpf-keepask-q', text: 'Keep this on this device so it\u2019s here tomorrow?' }),
        h('div', { className: 'wpf-keepask-btns' }, [
          h('button', { type: 'button', className: 'wpf-keepask-yes', 'data-keepask': 'yes', text: 'Keep it' }),
          h('button', { type: 'button', className: 'wpf-keepask-no', 'data-keepask': 'no', text: 'Not now' })])
      ]);
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-keepask]'); if (!b) return;
        var yes = b.getAttribute('data-keepask') === 'yes';
        if (!yes) { try { global.sessionStorage.setItem(noKey, '1'); } catch (er) {} }
        hide();
        if (yes) o.onKeep();
      });
      o.bar.insertBefore(el, o.bar.firstChild);
    }
    return { check: check, hide: hide };
  }

  function boot() {
    var wp = document.body.getAttribute('data-wp');
    var schema = global.TOL_WORKPAPERS && global.TOL_WORKPAPERS[wp];
    var root = document.getElementById('wpf-root');
    if (!schema || !root) return;
    // ?road=coworkers (or roommates, caregivers) shows a worksheet worded for that road
    var road = (global.location && (global.location.search.match(/[?&]road=([a-z]+)/) || [])[1]) || '';
    if (road && global.TOL_WORKPAPER_VARIANT) schema = global.TOL_WORKPAPER_VARIANT(wp, road) || schema;
    var app = new App(root, schema, { road: road, canShare: !!schema.share });
    // A list shared through a link (#list=…): it is read here, on this device, and the address is tidied
    // straight away so it doesn't stay in the address bar or the history. Nothing is opened until the person chooses.
    var sharedMsg = '';
    function readHash() {
      if (!schema.share || !/^#list=/.test(global.location.hash || '')) return false;
      var got = readShared(global.location.hash);
      if (got && got.wp === schema.code) app.sharedIn = got;
      else sharedMsg = got ? 'That link is for ' + got.wp + '. Open it on the ' + got.wp + ' page.' : 'That shared link looks incomplete. Ask for it again, or paste it under \u201cOpen a shared ' + app.shareWhat() + '\u201d.';
      try { global.history.replaceState(null, '', global.location.pathname + global.location.search); } catch (e) {}
      return true;
    }
    function sharedSay() {
      if (app.sharedIn) { var si = document.getElementById('wpf-share-in'); if (si) { si.scrollIntoView({ block: 'center' }); si.focus(); } app.status('Someone shared ' + (app.shareWhat() === 'week' ? 'a week' : app.shareWhat() === 'list' ? 'a list' : 'their ' + app.shareWhat()) + ' with you. Choose what to do with it, at the top of the sheet.'); return true; }
      if (sharedMsg) { app.status(sharedMsg); sharedMsg = ''; return true; }
      return false;
    }
    readHash();
    // a link opened in a tab where this page is already open only changes the part after the #
    global.addEventListener('hashchange', function () { if (readHash()) { app.render(); sharedSay(); } });

    // "Keep a draft on this device": off unless the person turns it on
    var keepBox = document.getElementById('wpf-keep'), eraseBtn = document.getElementById('wpf-erase');
    // a quiet word right next to "Erase", so pressing it always shows that something happened
    if (eraseBtn && !document.getElementById('wpf-erase-note')) eraseBtn.parentNode.insertBefore(h('span', { className: 'wpf-erase-note', id: 'wpf-erase-note', role: 'status', 'aria-live': 'polite' }), eraseBtn.nextSibling);
    var kept = app.readKept(), tabbed = app.readTab();
    if (kept) {
      app.state = sanitize(schema, kept.state);
      app.keep = true;
      if (keepBox) keepBox.checked = true;
    }
    if (kept) app.safeSig = JSON.stringify(app.state);
    // this tab's own copy is the newest, kept or not (and it knows whether it was already saved or sent)
    if (tabbed && JSON.stringify(sanitize(schema, tabbed.state)) !== JSON.stringify(blankState(schema))) { app.state = sanitize(schema, tabbed.state); app.dirty = true; if (tabbed.safe) app.safeSig = JSON.stringify(app.state); }
    if (keepBox) keepBox.checked = app.keep;
    // say plainly what happens by default, with a way to clear it now
    var keepP = keepBox && keepBox.closest('p');
    if (keepP && !document.getElementById('wpf-tabnote')) {
      var tn = h('p', { className: 'wpf-tabnote', id: 'wpf-tabnote' });
      tn.appendChild(h('span', { text: 'Kept in this tab until you close it, so a reload or Back won’t lose your answers. ' }));
      var cb = h('button', { type: 'button', className: 'wpf-erase', id: 'wpf-tabclear', text: 'Clear' });
      tn.appendChild(cb);
      keepP.parentNode.insertBefore(tn, keepP);
      cb.addEventListener('click', function () { app.clear(); });
    }
    // "Use these names in the other tools": keeps the household up to date from here, only while ticked
    var HH = global.TOLHousehold;
    if (HH && schema.people) {
      app.hhWrite = HH.writer(app.hhTool(), function () { return app.hhCollect(); });
      HH.onChange(function () { var k = root.querySelector('.tol-hh-keep'); if (k && k.sync) k.sync(); });
    }
    foldHow();
    app.render();
    if (app.hhWrite) app.hhWrite.baseline();
    // "Keep this on this device so it's here tomorrow?": once something is typed, while nothing is kept
    var ask = keepAsk({
      key: app.keepKey(),
      bar: document.querySelector('.wpf-bar-inner'),
      want: function () { return !app.keep && app.hasAnything(); },
      onKeep: function () { if (keepBox) keepBox.checked = true; app.setKeep(true); }
    });
    app.afterChange = ask.check;
    ask.check();
    // a list or week sent from here through the share sheet (or the phone's own share menu)
    document.addEventListener('tol:shared', function (e) {
      var u = e.detail && e.detail.url;
      if (!u || !app.shareMade || u !== app.shareMade.link || !app.shareSig) return;
      app.markSafe(app.shareSig);
      if (app.sendBack) { app.sendBack = ''; var sb = root.querySelector('.wpf-sendback'); if (sb) sb.remove(); }
    });
    if (sharedSay()) { /* said */ }
    else if (kept) app.status('Picked up the draft kept on this device. Press “Erase” to remove it.');
    else if (tabbed && app.dirty) app.status('Your answers from earlier in this tab are back.');
    window.addEventListener('pageshow', function (e) { if (e.persisted) { if (keepBox) keepBox.checked = app.keep; app.render(); } });
    if (keepBox) keepBox.addEventListener('change', function () { app.setKeep(keepBox.checked); });
    if (eraseBtn) eraseBtn.addEventListener('click', function () { app.eraseKept(); if (keepBox) keepBox.checked = false; });

    root.addEventListener('input', function (e) { app.onInput(e); });
    root.addEventListener('change', function (e) { app.onInput(e); });
    root.addEventListener('click', function (e) { app.onClick(e); });

    // On a phone the save bar is one row: "Download PDF" and "More", which opens Open, Save draft
    // and Fillable PDF. It keeps the bottom of the screen free for the form.
    var actions = document.querySelector('.wpf-bar-actions');
    if (actions && !document.getElementById('wpf-more')) {
      var moreBtn = h('button', { type: 'button', id: 'wpf-more', className: 'wpf-btn-quiet wpf-bar-more', 'aria-expanded': 'false', text: 'More ▾' });
      actions.insertBefore(moreBtn, actions.firstChild); actions.classList.add('has-more');
      moreBtn.addEventListener('click', function () {
        var open = !actions.classList.contains('is-open');
        actions.classList.toggle('is-open', open);
        moreBtn.setAttribute('aria-expanded', String(open));
        moreBtn.textContent = open ? 'Less ▴' : 'More ▾';
      });
    }

    var fileInput = document.getElementById('wpf-file');
    document.getElementById('wpf-pdf').addEventListener('click', function () { app.savePdf(); });
    var saveBtn = document.getElementById('wpf-save');
    if (saveBtn && !saveBtn.title) saveBtn.title = 'A small file to keep, or to send to someone on your road so they can add their part';
    saveBtn.addEventListener('click', function () { app.saveDraft(); });
    document.getElementById('wpf-open').addEventListener('click', function () { fileInput.click(); });
    document.getElementById('wpf-clear').addEventListener('click', function () { app.clear(); });
    var fill = document.getElementById('wpf-fillable');
    if (fill) fill.addEventListener('click', function () { app.fillablePdf(); });
    fileInput.addEventListener('change', function () { app.openDraft(fileInput.files[0]); fileInput.value = ''; });

    window.addEventListener('beforeunload', function (e) {
      if (app.keep) app.keepNow();
      // nothing to warn about once this exact page was kept, saved, downloaded or sent as a link
      if (!app.isDirty()) return;
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
    addPerson: addPerson, removePerson: removePerson, personOptions: personOptions, setDefaultLabels: setDefaultLabels, setHousehold: setHousehold,
    setMinPeople: setMinPeople, optionLabel: optionLabel, isExampleRow: isExampleRow, agreedLine: agreedLine, closingLines: closingLines,
    labelFor: function (i) { return labelFor(i); }, readShared: readShared, keepAsk: keepAsk
  };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
