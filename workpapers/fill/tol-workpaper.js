/*
  tol-workpaper.js — The Objective Ledger (TOL-OS)
  Renders a fill-in workpaper from tol-workpaper-schemas.js and turns the
  entries into a PDF with tol-pdf.js.

  Privacy by design:
  - Nothing is sent anywhere. There are no network requests in this file,
    and the page's Content-Security-Policy blocks them (connect-src 'none').
  - Nothing is stored in the browser: no cookies, localStorage or IndexedDB.
  - Inputs have autocomplete off, so the browser doesn't remember entries.
  - The only copies are the files the person chooses to download: the PDF,
    and an optional draft file (.json) they can reopen later to keep working.
*/
(function (global) {
  'use strict';

  var COLORS = {
    ink: '#211D17', soft: '#524B3E', line: '#D9CBA3', brass: '#A8792F',
    head: '#F3ECD9', credit: '#3E6B4C', creditSoft: '#EAF1E9'
  };
  var DRAFT_FORMAT = 'tol-workpaper-draft';
  var DRAFT_VERSION = 1;

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
      name: function (p) {
        if (p === 'A') return (state.values.partnerA || '').trim() || 'Partner A';
        if (p === 'B') return (state.values.partnerB || '').trim() || 'Partner B';
        if (p === 'Both') return 'Both';
        return '';
      }
    };
  }

  function rowLabel(label, ctx) {
    return label === '@A' ? ctx.name('A') : label === '@B' ? ctx.name('B') : label;
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

  function Report(schema, state) {
    this.schema = schema;
    this.ctx = makeCtx(schema, state);
    this.doc = new global.TOLPDF.Doc({ title: schema.code + ' ' + schema.title, producer: 'The Objective Ledger (TOL-OS) worksheet, generated on this device' });
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
      this.doc.text(this.L, this.y + 6, this.enc(this.schema.code + '  ·  ' + this.schema.title), 'Helvetica', 7.5, COLORS.soft);
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
    d.text(this.L, this.y + 8, this.enc('The Objective Ledger  ·  ' + s.code), 'Helvetica', 8, COLORS.brass);
    this.y += 16;
    d.text(this.L, this.y + 20, this.enc(s.title), 'Times-Bold', 21, COLORS.ink);
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
      d.text(self.L, 766, self.enc('A heuristic self-reflection worksheet, not a clinical instrument. It describes the arrangement, never either person.'), 'Helvetica', 7, COLORS.soft);
      var pg = self.enc('Page ' + (i + 1) + ' of ' + n);
      d.text(self.R - global.TOLPDF.textWidth(pg, 'Helvetica', 7), 766, pg, 'Helvetica', 7, COLORS.soft);
    }
  };

  function buildPdf(schema, state) {
    var R = new Report(schema, state), ctx = R.ctx;

    R.titleBlock();

    var meta = [];
    if (schema.people) meta.push(['Partner A', ctx.name('A')], ['Partner B', ctx.name('B')]);
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
          var cols = [{ label: '', w: 1.6 }].concat(s.columns);
          cells = rows.map(function (r, i) {
            return [rowLabel(s.fixedRows[i], ctx)].concat(s.columns.map(function (c) { return displayCell(c, r, ctx); }));
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
          s.items.map(function (it) { return [it.label, state.values[s.id + '.' + it.id] || '—']; }));
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

    R.footers();
    return R.doc.output();
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

  function App(root, schema) {
    this.root = root;
    this.schema = schema;
    this.state = blankState(schema);
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
      el = h('select', base);
      el.appendChild(h('option', { value: '', text: '—' }));
      var opts = def.type === 'person'
        ? ['A', 'B'].concat(def.both ? ['Both'] : []).map(function (p) { return { v: p, l: self.ctx().name(p), person: p }; })
        : def.options.map(function (o) { return { v: o, l: o }; });
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
    }
    return { el: el, id: id };
  };

  A.render = function () {
    var self = this, s = this.schema, st = this.state;
    this.root.innerHTML = '';
    this.uid = 0;

    // Names and meta fields
    var metaDefs = [];
    if (s.people) {
      metaDefs.push({ id: 'partnerA', label: 'Partner A', type: 'text', placeholder: 'First name or initial' });
      metaDefs.push({ id: 'partnerB', label: 'Partner B', type: 'text', placeholder: 'First name or initial' });
    }
    metaDefs = metaDefs.concat(s.meta || []);
    if (metaDefs.length) {
      var grid = h('div', { className: 'wpf-meta' });
      metaDefs.forEach(function (f) {
        var c = self.control(f, st.values[f.id], { key: f.id });
        grid.appendChild(h('div', { className: 'wpf-field' }, [h('label', { for: c.id, text: f.label }), c.el]));
      });
      this.root.appendChild(grid);
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
          opts.appendChild(h('label', { for: id }, [r, h('span', { text: o })]));
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
    var self = this, rows = this.state.tables[sec.id], ctx = this.ctx();
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
      if (sec.fixedRows) tr.appendChild(h('th', { scope: 'row', className: 'wpf-rowlabel', 'data-fixed': sec.fixedRows[i], text: rowLabel(sec.fixedRows[i], ctx) }));
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
    Array.prototype.forEach.call(this.root.querySelectorAll('option[data-person]'), function (o) { o.textContent = ctx.name(o.getAttribute('data-person')); });
    Array.prototype.forEach.call(this.root.querySelectorAll('[data-fixed]'), function (t) { t.textContent = rowLabel(t.getAttribute('data-fixed'), ctx); });
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
    this.dirty = true;
    this.refresh();
  };

  A.onClick = function (e) {
    var b = e.target.closest('button[data-action]');
    if (!b) return;
    var tbl = b.getAttribute('data-table'), rows = this.state.tables[tbl];
    var sec = this.schema.sections.filter(function (s) { return s.id === tbl; })[0];
    var action = b.getAttribute('data-action');
    if (action === 'add') {
      rows.push({});
      this.dirty = true;
      this.render();
      var inputs = this.root.querySelectorAll('[data-table="' + tbl + '"][data-row="' + (rows.length - 1) + '"]');
      if (inputs[0]) inputs[0].focus();
    } else if (action === 'remove') {
      var i = +b.getAttribute('data-row');
      if (!rowIsEmpty(sec, rows[i]) && !window.confirm('Remove this row and what is written in it?')) return;
      rows.splice(i, 1);
      if (!rows.length) rows.push({});
      this.dirty = true;
      this.render();
    } else if (action === 'pull') {
      var have = {}, key = sec.pull.key, added = 0;
      rows.forEach(function (r) { if (r[key]) have[r[key].trim().toLowerCase()] = true; });
      var fresh = sec.pull.from(this.ctx()).filter(function (r) { return !have[String(r[key]).trim().toLowerCase()]; });
      var kept = rows.filter(function (r) { return !rowIsEmpty(sec, r); });
      this.state.tables[tbl] = kept.concat(fresh);
      if (!this.state.tables[tbl].length) this.state.tables[tbl].push({});
      added = fresh.length;
      this.dirty = true;
      this.render();
      this.status(added ? 'Added ' + added + (added === 1 ? ' task.' : ' tasks.') : 'No new tasks flagged twice or more in Part A.');
    }
  };

  A.status = function (msg) {
    var el = document.getElementById('wpf-status');
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

  A.openDraft = function (file) {
    var self = this;
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { this.status('That file is too large to be a workpaper draft.'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var d;
      try { d = JSON.parse(reader.result); } catch (e) { self.status("That file isn't a workpaper draft. Choose a .json file saved from this page."); return; }
      if (!d || d.format !== DRAFT_FORMAT || !d.state) { self.status("That file isn't a workpaper draft. Choose a .json file saved from this page."); return; }
      if (d.workpaper !== self.schema.code) { self.status('That draft is for ' + d.workpaper + '. Open it on the ' + d.workpaper + ' page.'); return; }
      if (self.dirty && !window.confirm('Replace what is on this page with the draft?')) return;
      var fresh = blankState(self.schema);
      var values = d.state.values || {}, tables = d.state.tables || {};
      Object.keys(values).forEach(function (k) { if (typeof values[k] !== 'object') fresh.values[k] = values[k]; });
      self.schema.sections.forEach(function (s) {
        if (s.type !== 'table' || !Array.isArray(tables[s.id])) return;
        var rows = tables[s.id].filter(function (r) { return r && typeof r === 'object'; }).map(function (r) {
          var clean = {};
          s.columns.forEach(function (c) { if (r[c.id] != null && typeof r[c.id] !== 'object') clean[c.id] = r[c.id]; });
          return clean;
        });
        if (s.fixedRows) rows = s.fixedRows.map(function (_, i) { return rows[i] || {}; });
        fresh.tables[s.id] = rows.length ? rows : [{}];
      });
      self.state = fresh;
      self.dirty = false;
      self.render();
      self.status('Draft opened.');
    };
    reader.onerror = function () { self.status('That file could not be read.'); };
    reader.readAsText(file);
  };

  A.clear = function () {
    if (!window.confirm('Clear everything on this page? Anything you haven\'t saved as a PDF or draft file will be gone.')) return;
    this.state = blankState(this.schema);
    this.dirty = false;
    this.render();
    this.status('Cleared. Nothing from this worksheet remains on the page.');
  };

  function boot() {
    var wp = document.body.getAttribute('data-wp');
    var schema = global.TOL_WORKPAPERS && global.TOL_WORKPAPERS[wp];
    var root = document.getElementById('wpf-root');
    if (!schema || !root) return;
    var app = new App(root, schema);
    app.render();

    root.addEventListener('input', function (e) { app.onInput(e); });
    root.addEventListener('change', function (e) { app.onInput(e); });
    root.addEventListener('click', function (e) { app.onClick(e); });

    var fileInput = document.getElementById('wpf-file');
    document.getElementById('wpf-pdf').addEventListener('click', function () { app.savePdf(); });
    document.getElementById('wpf-save').addEventListener('click', function () { app.saveDraft(); });
    document.getElementById('wpf-open').addEventListener('click', function () { fileInput.click(); });
    document.getElementById('wpf-clear').addEventListener('click', function () { app.clear(); });
    fileInput.addEventListener('change', function () { app.openDraft(fileInput.files[0]); fileInput.value = ''; });

    window.addEventListener('beforeunload', function (e) {
      if (!app.dirty) return;
      e.preventDefault();
      e.returnValue = '';
    });
  }

  global.TOLWorkpaper = { buildPdf: buildPdf, blankState: blankState, makeCtx: makeCtx };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
