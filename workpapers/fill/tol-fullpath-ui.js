/*
  tol-fullpath-ui.js — The Objective Ledger (TOL-OS)
  The "Full path package" part of the Workpaper Suite page:

    1. Download the full path PDF for a road (and 2 to 8 people, or just you).
    2. Upload the filled package: it is read here, in the browser, and you see
       what was read and what is missing before anything else happens.
    3. Or fill it in here, in a guided form that mirrors the package page by page.

  All three make the same data object (see tol-fullpath-model.js), which also
  downloads and uploads as a small JSON backup. The report is shown on the page
  and downloads as a PDF. On screen it has a contents list and folding sections.

  Privacy: nothing is sent anywhere, and the page's Content-Security-Policy
  blocks it. Nothing is stored unless "Keep a draft on this device" is on (the
  same switch as the rest of the Suite); "Erase" removes it.
*/
(function (global) {
  'use strict';

  var FP = global.TOLFullPath, FPP = global.TOLFullPathPDF;
  var root = document.getElementById('full-path');
  if (!FP || !FPP || !root) return;

  var KEEP_KEY = 'tol-wpf-keep:fullpath';
  var S = { data: null, step: 0, dirty: false, read: null };
  var keepTimer = null;

  function $(id) { return document.getElementById(id); }
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
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function fileBase(data) { return 'Spread-Love-and-Acceptance-Full-Path-' + FP.ROADS[data.road].label.replace(/[^A-Za-z0-9]+/g, '-').replace(/-+$/, '') + '-' + today(); }
  function download(bytes, name, type) {
    var blob = new Blob([bytes], { type: type }), url = URL.createObjectURL(blob), a = h('a', { href: url, download: name, rel: 'noopener' });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  var sayTimer = null;
  function say(msg) {
    var el = $('fp-status') || $('wpf-status');
    if (!el) return;
    el.textContent = '';
    clearTimeout(sayTimer);
    sayTimer = setTimeout(function () { el.textContent = msg; }, 30);
  }
  function reg() { return FP.regOf(S.data); }
  function show(id) { ['fp-preview', 'fp-form', 'fp-report'].forEach(function (x) { $(x).hidden = x !== id; }); }
  function scrollTo(el) { if (el && el.scrollIntoView) el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); }
  function reduced() { return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  /* ------------------------------------------------------------ keep a draft (opt-in, shared switch) */

  function keepOn() { var b = $('ws-keep'); return !!(b && b.checked); }
  function changed() {
    S.dirty = true;
    if (!keepOn()) return;
    clearTimeout(keepTimer);
    keepTimer = setTimeout(keepNow, 400);
  }
  function keepNow() {
    if (!keepOn() || !S.data) return;
    try { global.localStorage.setItem(KEEP_KEY, JSON.stringify(S.data)); S.dirty = false; } catch (e) { /* storage off or full: the page still works */ }
  }
  function eraseKept() { clearTimeout(keepTimer); try { global.localStorage.removeItem(KEEP_KEY); } catch (e) {} }
  function readKept() {
    try { var raw = global.localStorage.getItem(KEEP_KEY); return raw ? FP.fromJSON(JSON.parse(raw)) : null; } catch (e) { return null; }
  }

  /* ------------------------------------------------------------ 1. download */

  function fillRoads(sel, value) {
    sel.innerHTML = '';
    FP.ROAD_ORDER.forEach(function (id) { sel.appendChild(h('option', { value: id, text: FP.ROADS[id].label, selected: id === value ? 'selected' : null })); });
  }
  function fillCount(sel, value) {
    sel.innerHTML = '';
    for (var i = FP.MIN_PEOPLE; i <= FP.MAX_PEOPLE; i++) sel.appendChild(h('option', { value: String(i), text: i + ' people', selected: i === value ? 'selected' : null }));
  }
  function syncDownloadCard() {
    var r = $('fp-road').value, solo = FP.ROADS[r].solo;
    $('fp-count-wrap').hidden = solo;
    $('fp-names-label').firstChild.textContent = solo ? 'Your name (optional) ' : 'Names (optional, separated by commas) ';
    $('fp-names').placeholder = solo ? 'e.g. Sam' : 'e.g. Sam, Ana, Jo';
  }
  function downloadPackage() {
    var road = $('fp-road').value, n = FP.clampPeople(road, $('fp-count').value);
    var names = $('fp-names').value.split(',').map(function (x) { return x.trim().slice(0, 40); }).slice(0, n);
    try {
      var data = FP.blankData(road, n, names);
      names.forEach(function (nm, i) { if (nm) data.values[FP.NS + 'who.p' + (i + 1)] = nm; });
      download(FPP.packagePdf(data), fileBase(data) + '-package.pdf', 'application/pdf');
      say('Your full path package is in your Downloads. Fill it in any PDF app, then bring it back here.');
    } catch (err) {
      say('The PDF could not be made. Please try again.');
      if (global.console) console.error(err);
    }
  }

  /* ------------------------------------------------------------ 2. upload */

  function takeFile(file) {
    if (!file) return;
    var note = $('fp-upload-note');
    if (file.size > 40 * 1024 * 1024) { note.textContent = file.name + ' is too large to be a package from this site.'; return; }
    note.textContent = 'Reading ' + file.name + ' on this device…';
    var isJson = /\.json$/i.test(file.name) || file.type === 'application/json';
    var job = isJson
      ? file.text().then(function (t) { var r = FP.fromJSON(JSON.parse(t)); if (!r) throw Object.assign(new Error('not-backup'), { code: 'not-backup' }); return r; })
      : file.arrayBuffer().then(function (buf) { return FPP.readPackage(buf); });
    job.then(function (r) {
      // answers already here (typed in, or read from another copy): ask, never replace silently
      if (hasAnswers()) { note.textContent = 'Read ' + r.read.total + (r.read.total === 1 ? ' answer' : ' answers') + ' from ' + file.name + '. You already have answers here, so nothing has changed yet.'; askMerge(r, file.name, isJson); return; }
      useRead(r, file.name, isJson);
    }, function (err) {
      var code = err && err.code;
      note.textContent = code === 'protected' ? file.name + ' was saved with a password or protection, so its boxes can’t be read. Save an unprotected copy and try again.'
        : code === 'no-fields' ? file.name + ' has no Full path boxes in it. Is it the package from this page? (Suite PDFs go in "Bring in what you’ve filled in" above.)'
          : code === 'not-backup' ? file.name + ' isn’t a Full path backup file.'
            : code === 'not-pdf' ? file.name + ' isn’t a PDF or a backup file from this page.'
            : file.name + ' couldn’t be read. If a PDF app printed it to a new PDF, the boxes may have been flattened; use the saved original instead.';
      if (global.console && !code) console.error(err);
    });
  }

  function useRead(r, fileName, isJson) {
    S.data = r.data; S.read = r.read; S.step = 0; S.conflicts = null; S.mergeInfo = null;
    changed();
    $('fp-upload-note').textContent = 'Read ' + r.read.total + (r.read.total === 1 ? ' answer' : ' answers') + ' from ' + fileName + '. Nothing was sent anywhere.';
    renderPreview(fileName, isJson);
    show('fp-preview');
    scrollTo($('fp-preview'));
  }
  // Is there anything here worth keeping? Names and starter rows alone don't count.
  function hasAnswers() {
    if (!S.data) return false;
    var reg0 = reg();
    return Object.keys(S.data.values).some(function (k) {
      var fl = reg0.byName[k], v = S.data.values[k];
      if (!fl || v == null || v === '' || v === false) return false;
      if (/^who\.p\d$/.test(fl.id)) return false;
      return !(fl.def && v === fl.def);
    });
  }
  // A second copy (each person filled in their own): add it to what is here, or replace what is here.
  function askMerge(r, fileName, isJson) {
    var box = $('fp-preview'), sameRoad = r.data.road === S.data.road;
    box.innerHTML = '';
    box.appendChild(h('h3', { className: 'fp-h3', tabindex: '-1', id: 'fp-merge-h', text: 'You already have answers here' }));
    box.appendChild(h('p', { text: fileName + ' has ' + r.read.total + (r.read.total === 1 ? ' answer' : ' answers') + '. If each of you filled in your own copy, add this one to what is here: empty boxes are filled from the new file, matching answers stay, and anything that differs is listed so you can choose. Nothing is replaced without asking.' }));
    if (!sameRoad) box.appendChild(h('p', { className: 'fp-warn', text: 'This file is for the ' + FP.ROADS[r.data.road].label + ' road, and you are on ' + FP.ROADS[S.data.road].label + ', so it can’t be combined. You can replace what is here, or keep what is here.' }));
    var row = h('div', { className: 'fp-actions' });
    if (sameRoad) row.appendChild(h('button', { type: 'button', className: 'ws-go', id: 'fp-merge-add', text: 'Add to what’s here (combine)' }));
    row.appendChild(h('button', { type: 'button', className: 'fp-btn-quiet', id: 'fp-merge-replace', text: 'Replace what’s here' }));
    row.appendChild(h('button', { type: 'button', className: 'ws-link', id: 'fp-merge-cancel', text: 'Keep what’s here, and leave this file out' }));
    box.appendChild(row);
    S.pending = { r: r, name: fileName, json: isJson };
    show('fp-preview');
    scrollTo(box);
    $('fp-merge-h').focus();
    say('You already have answers here. Choose whether to add this file to them or replace them.');
  }
  function resolveMerge(how) {
    var pend = S.pending; S.pending = null;
    if (!pend) return;
    if (how === 'cancel') { $('fp-upload-note').textContent = 'Left out. Nothing from ' + pend.name + ' was used, and your answers are as they were.'; say($('fp-upload-note').textContent); show(null); return; }
    if (how === 'replace') {
      if (!global.confirm('Replace every answer here with the ones in ' + pend.name + '? Save your progress first if you might want them back.')) { S.pending = pend; return; }
      useRead(pend.r, pend.name, pend.json); return;
    }
    var res = FP.combine(S.data, pend.r.data);
    if (res.error) { say('These two files can’t be combined.'); return; }
    var back = FP.fromJSON(res.data) || { data: res.data, read: FP.readReport(res.data) };
    S.data = back.data; S.read = back.read; S.step = 0;
    S.conflicts = res.conflicts.map(function (c) { c.pick = 'here'; return c; });
    S.mergeInfo = { name: pend.name, added: res.added, swapped: res.swapped };
    changed();
    $('fp-upload-note').textContent = 'Added ' + pend.name + ' to what was here: ' + res.added + (res.added === 1 ? ' answer' : ' answers') + ' filled in' + (res.conflicts.length ? ', ' + res.conflicts.length + ' to choose between' : '') + '. Nothing was sent anywhere.';
    renderPreview(pend.name, pend.json);
    show('fp-preview');
    scrollTo($('fp-preview'));
  }
  function conflictBox() {
    var cs = S.conflicts || [], mi = S.mergeInfo || {};
    var wrap = h('div', { className: 'fp-merge', id: 'fp-merge' });
    wrap.appendChild(h('h4', { className: 'fp-h4', text: 'Combined with ' + (mi.name || 'the new file') }));
    wrap.appendChild(h('p', { className: 'fp-note', text: (mi.added || 0) + (mi.added === 1 ? ' empty box was' : ' empty boxes were') + ' filled in from it' + (mi.swapped ? ', with people matched by name (so everyone’s answers stayed theirs, whichever box they were in)' : '') + '.' + (cs.length ? ' These answers differ. What is here is kept unless you choose the new one:' : ' No answers disagreed.') }));
    if (!cs.length) return wrap;
    var ul = h('ul', { className: 'fp-conflicts' });
    cs.forEach(function (c, i) {
      var nm = 'fp-cf-' + i;
      function show2(v) { return v === true ? 'Ticked' : String(v); }
      ul.appendChild(h('li', { className: 'fp-conflict' }, [
        h('p', { className: 'fp-conflict-w', text: c.where }),
        h('label', { className: 'fp-opt' }, [h('input', { type: 'radio', name: nm, value: 'here', 'data-conflict': String(i), checked: c.pick === 'here' ? 'checked' : null }), h('span', { text: 'Keep: ' + show2(c.here) })]),
        h('label', { className: 'fp-opt' }, [h('input', { type: 'radio', name: nm, value: 'there', 'data-conflict': String(i), checked: c.pick === 'there' ? 'checked' : null }), h('span', { text: 'Use the new one: ' + show2(c.there) })])
      ]));
    });
    wrap.appendChild(ul);
    return wrap;
  }
  function pickConflict(i, which) {
    var c = S.conflicts && S.conflicts[i];
    if (!c) return;
    c.pick = which;
    S.data.values[c.name] = which === 'there' ? c.there : c.here;
    changed();
  }

  function renderPreview(fileName, isJson) {
    var box = $('fp-preview'), rd = S.read, road = FP.ROADS[rd.road];
    box.innerHTML = '';
    box.appendChild(h('h3', { className: 'fp-h3', tabindex: '-1', id: 'fp-preview-h', text: 'What we read' }));
    box.appendChild(h('p', { className: 'fp-read-sum' }, [
      h('strong', { text: rd.total + (rd.total === 1 ? ' answer' : ' answers') }),
      ' from ' + (S.mergeInfo ? 'both copies together' : isJson ? 'your backup' : 'your filled package') + ': ' + road.label + (road.solo ? '' : ', ' + rd.people + ' people') + (rd.version ? ', package version ' + rd.version : '') + '.'
    ]));
    if (!rd.hadMeta) box.appendChild(h('p', { className: 'fp-warn', text: 'This file didn’t say which road it was for, so we guessed ' + road.label + '. You can change the road in the form.' }));
    var names = FP.people(S.data).list.map(function (p) { return p.label; });
    box.appendChild(h('p', { className: 'fp-read-who', text: (road.solo ? 'For: ' : 'On this road: ') + names.join(', ') }));
    if (S.mergeInfo && S.conflicts) box.appendChild(conflictBox());
    var ul = h('ul', { className: 'fp-read-list' });
    rd.pages.forEach(function (p, i) {
      var missing = p.missing.filter(function (f) { return !/\.(r\d+)\./.test(f.id) || p.filled; }).slice(0, 3).map(function (f) { return f.label; });
      var li = h('li', { className: 'fp-read-item' + (p.filled ? ' is-read' : '') }, [
        h('span', { className: 'fp-read-name', text: (p.code && /^WP|CALC/.test(p.code) ? p.code + ' ' : '') + p.title }),
        h('span', { className: 'fp-read-count', text: p.filled ? p.filled + ' of ' + p.of + ' boxes' : 'Not filled in' }),
        p.filled && missing.length ? h('span', { className: 'fp-read-miss', text: 'Still blank: ' + missing.join('; ') + (p.missing.length > 3 ? '…' : '') }) : null,
        h('button', { type: 'button', className: 'ws-link fp-fix', 'data-step': String(i), text: p.filled ? 'Check or fix' : 'Fill it in' })
      ]);
      ul.appendChild(li);
    });
    box.appendChild(ul);
    if (rd.issues.length) {
      box.appendChild(h('h4', { className: 'fp-h4', text: 'Worth a look before your report' }));
      var il = h('ul', { className: 'fp-issues' });
      rd.issues.slice(0, 20).forEach(function (it) { il.appendChild(h('li', {}, [it.msg + ' ', h('button', { type: 'button', className: 'ws-link fp-fix', 'data-step': String(pageIndex(it.page)), text: 'Fix it' })])); });
      box.appendChild(il);
    }
    if (rd.unknown && rd.unknown.length) box.appendChild(h('p', { className: 'fp-note', text: rd.unknown.length + ' box' + (rd.unknown.length === 1 ? '' : 'es') + ' from a newer or different package weren’t used. Everything else was read.' }));
    box.appendChild(h('div', { className: 'fp-actions' }, [
      h('button', { type: 'button', className: 'ws-go', id: 'fp-make-from-read', text: 'Make my report' }),
      h('button', { type: 'button', className: 'fp-btn-quiet', id: 'fp-fix-all', text: 'Check and fix in the form' })
    ]));
    $('fp-preview-h').focus();
  }
  function pageIndex(id) { var i = 0; reg().pages.forEach(function (p, k) { if (p.id === id) i = k; }); return i; }

  /* ------------------------------------------------------------ 3. the guided form */

  // The names already typed on this page: "Who's on this road?" in step 1 of the Suite, or the names box
  // on the download card. They fill only the name boxes that are still empty.
  function knownNames() {
    var HH = global.TOLHousehold, suite = global.__workpaperSuite, list = [];
    try { list = (suite && suite.state && suite.state().names || []).map(function (x) { return String(x || '').trim(); }); } catch (e) { list = []; }
    if (!list.some(Boolean) && $('fp-names')) list = $('fp-names').value.split(',').map(function (x) { return x.trim(); });
    return list.map(function (x) { return x && !(HH && HH.isPlaceholder(x)) ? x.slice(0, 40) : ''; });
  }
  function whoKey(i) { return FP.NS + 'who.p' + (i + 1); }
  function fillEmptyNames(list) {
    if (!S.data || FP.ROADS[S.data.road].solo) return 0;
    var added = 0;
    (list || []).forEach(function (nm, i) {
      if (!nm || i >= S.data.people) return;
      var cur = String(S.data.values[whoKey(i)] || '').trim();
      if (cur) return;
      S.data.values[whoKey(i)] = nm; added++;
    });
    if (added) changed();
    return added;
  }
  function whoEmpty() {
    if (!S.data) return true;
    for (var i = 0; i < S.data.people; i++) if (String(S.data.values[whoKey(i)] || '').trim()) return false;
    return true;
  }

  function startForm(step) {
    if (!S.data) S.data = FP.blankData($('fp-road').value, $('fp-count').value);
    fillEmptyNames(knownNames());
    S.step = step || 0;
    renderForm();
    show('fp-form');
    scrollTo($('fp-form'));
    var t = $('fp-step-title'); if (t) t.focus();
  }

  function val(name) { var v = S.data.values[name]; return v == null ? '' : v; }
  function setVal(name, v) {
    if (v === '' || v === false || v == null) delete S.data.values[name]; else S.data.values[name] = v;
    changed();
  }

  function control(fl) {
    var id = 'fp-f-' + fl.id.replace(/[^a-z0-9]+/gi, '-'), v = val(fl.name);
    if (fl.type === 'radio') {
      var fs = h('fieldset', { className: 'fp-radio' + (fl.scale ? ' is-scale' : '') + (fl.stack ? ' is-stack' : '') }, [h('legend', { text: fl.label })]);
      var row = h('div', { className: 'fp-radio-row' });
      fl.options.forEach(function (o, i) {
        var rid = id + '-' + i;
        var inp = h('input', { type: 'radio', id: rid, name: id, value: o.label, 'data-name': fl.name, checked: v === o.label ? 'checked' : null });
        row.appendChild(h('label', { className: 'fp-opt', for: rid }, [inp, h('span', { text: fl.scale ? o.label : o.label })]));
      });
      row.appendChild(h('button', { type: 'button', className: 'fp-clear', 'data-clear': fl.name, 'aria-label': 'Clear: ' + fl.label, text: 'Clear' }));
      fs.appendChild(row);
      return fs;
    }
    if (fl.type === 'check') {
      return h('label', { className: 'fp-check', for: id }, [h('input', { type: 'checkbox', id: id, 'data-name': fl.name, checked: v === true ? 'checked' : null }), h('span', { text: fl.label })]);
    }
    var input;
    if (fl.type === 'textarea') { input = h('textarea', { id: id, rows: fl.small ? '2' : '3', 'data-name': fl.name, maxlength: '2000' }); input.value = v; }
    else if (fl.type === 'person') {
      input = h('select', { id: id, 'data-name': fl.name });
      var P = FP.people(S.data), opts = [['', '—']].concat(P.list.map(function (p) { return [p.label, p.label]; }));
      if (fl.both) opts.push(['Everyone', 'Everyone']);
      var hit = P.resolve(v), current = typeof hit === 'number' ? P.label(hit) : hit === 'all' ? 'Everyone' : v;
      if (v && hit === undefined) opts.push([v, v + ' (doesn’t match anyone)']);
      opts.forEach(function (o) { input.appendChild(h('option', { value: o[0], text: o[1], selected: o[0] === current ? 'selected' : null })); });
    } else {
      var type = fl.type === 'date' && (!v || /^\d{4}-\d{2}-\d{2}$/.test(v)) ? 'date' : 'text';
      input = h('input', { type: type, id: id, 'data-name': fl.name, autocomplete: 'off', maxlength: '200', inputmode: fl.type === 'number' ? 'decimal' : null, placeholder: fl.placeholder || (fl.type === 'number' && fl.max === 1 ? '0 to 1' : fl.hint ? fl.hint.split(', ').slice(0, 3).join(', ') + '…' : null) });
      input.value = v;
    }
    var lab = h('label', { className: 'fp-label', for: id }, [h('span', { text: fl.label + (fl.optional ? ' (optional)' : '') })]);
    return h('div', { className: 'fp-field' + (fl.half ? ' is-half' : '') + (fl.third ? ' is-third' : '') + (fl.type === 'textarea' ? ' is-long' : '') }, [lab, input]);
  }

  function rowBox(r, i, b) {
    var head = r.label || rowName(r, i, b);
    var box = h('fieldset', { className: 'fp-row' }, [h('legend', { text: head })]);
    var grid = h('div', { className: 'fp-row-grid' });
    r.fields.forEach(function (fl) { grid.appendChild(control(fl)); });
    box.appendChild(grid);
    return box;
  }
  // Whose row this is (WP-13's daily rows carry a name in their Person box)
  function whoOf(r) {
    var who = r.fields.filter(function (f) { return /\.who$/.test(f.id) && f.prefill; })[0];
    if (!who) return null;
    var P = FP.people(S.data), x = P.resolve(val(who.name));
    return typeof x === 'number' ? x : null;
  }
  function rowsForPicker() {
    var P = FP.people(S.data), sel = h('select', { id: 'fp-rows-for' });
    sel.appendChild(h('option', { value: '', text: 'Everyone\u2019s rows', selected: S.rowsFor == null || S.rowsFor === '' ? 'selected' : null }));
    P.list.forEach(function (p) { sel.appendChild(h('option', { value: String(p.i), text: 'Only ' + p.label + '\u2019s rows', selected: String(S.rowsFor) === String(p.i) ? 'selected' : null })); });
    return h('div', { className: 'fp-rows-for' }, [h('label', { for: 'fp-rows-for', text: 'Filling in your own rows? Show ' }), sel]);
  }
  function turnCue(i, rows) {
    var nm = FP.people(S.data).label(i);
    return h('p', { className: 'fp-turn', role: 'note' }, [h('span', { className: 'fp-turn-dot', 'aria-hidden': 'true', text: '\u270B' }), ' ' + (rows ? 'These are ' + nm + '\u2019s rows. Only ' + nm + ' fills them in, about their own day.' : 'This part is ' + nm + '\u2019s to fill in, about themselves. On a shared device? Hand it over to ' + nm + ' here.')]);
  }
  function rowName(r, i, b) {
    var day = r.fields.filter(function (f) { return /\.day$/.test(f.id); })[0], who = r.fields.filter(function (f) { return /\.who$/.test(f.id) && f.prefill; })[0];
    if (day && who) return val(day.name) + ' · ' + (FP.people(S.data).label(FP.people(S.data).resolve(val(who.name))) || val(who.name));
    return (b.title && /task|slip|sore/i.test(b.title) ? 'Item ' : 'Row ') + (i + 1);
  }

  function liveLines(page) {
    var c = FP.compute(S.data), out = [], f2 = FP.fmt;
    if (page.id === 'wp01' && c.wp01 && !c.R.refusalsOnly) out.push(c.wp01.wb != null ? 'Workload balance so far: ' + f2(c.wp01.wb) + ' (' + c.P.list.map(function (p) { return p.label + ' ' + Math.round(c.wp01.shares[p.i]) + '%'; }).join(', ') + ')' : 'Workload balance: add rows with a name and minutes.');
    if (page.id === 'wp02') c.battery.forEach(function (b) { out.push(b.label + ': ' + (b.score != null ? f2(b.score) + ' (' + b.band.label.toLowerCase() + ')' : b.answered + ' of 5 answered')); });
    if (page.id === 'wp03' && c.wp03) out.push(c.wp03.oc != null ? 'Jobs with an owner so far: ' + c.wp03.owned + ' of ' + c.wp03.tasks + ' (' + f2(c.wp03.oc) + ' out of 1)' : 'Give each job one owner.');
    if (page.id === 'wp04' && c.wp04) out.push(c.wp04.patterns.length ? 'A real pattern (3 or 4 weeks): ' + c.wp04.patterns.map(function (p) { return p.task; }).join(', ') : 'Nothing flagged 3 or 4 weeks so far.');
    if (page.id === 'calc' && c.calc.applies) out.push(c.calc.sol != null ? 'Setup score ' + f2(c.calc.sol) + ' (' + c.calc.solBand.label.toLowerCase() + '), overall score ' + f2(c.calc.apex) : 'Not worked out yet. Still needed: ' + c.calc.missing.join('; ') + '.');
    if (page.id === 'calc' && c.calc.rf != null) out.push('Retuning (RF): ' + f2(c.calc.rf));
    return out;
  }

  function renderForm() {
    var R = reg(), page = R.pages[S.step], box = $('fp-form'), road = FP.ROADS[S.data.road];
    box.innerHTML = '';
    // road and people
    var top = h('div', { className: 'fp-form-top' });
    var rsel = h('select', { id: 'fp-form-road' }); fillRoads(rsel, S.data.road);
    top.appendChild(h('label', { className: 'fp-inline', for: 'fp-form-road' }, [h('span', { text: 'Road' }), rsel]));
    if (!road.solo) { var csel = h('select', { id: 'fp-form-count' }); fillCount(csel, S.data.people); top.appendChild(h('label', { className: 'fp-inline', for: 'fp-form-count' }, [h('span', { text: 'People' }), csel])); }
    box.appendChild(top);
    // steps
    var nav = h('ol', { className: 'fp-steps', 'aria-label': 'Pages of your package' });
    R.pages.forEach(function (p, i) {
      var n = p.fields.filter(function (fl) { var v = S.data.values[fl.name]; return v != null && v !== '' && v !== false && !(fl.def && v === fl.def); }).length;
      nav.appendChild(h('li', {}, [h('button', { type: 'button', className: 'fp-step' + (i === S.step ? ' is-on' : '') + (n ? ' is-filled' : ''), 'data-step': String(i), 'aria-current': i === S.step ? 'step' : null, text: (i + 1) + '. ' + (p.code && /^WP|CALC/.test(p.code) ? p.code : p.short || p.title) })]));
    });
    box.appendChild(nav);
    // the page
    var sec = h('div', { className: 'fp-page' });
    sec.appendChild(h('p', { className: 'fp-page-k', text: 'Page ' + (S.step + 1) + ' of ' + R.pages.length + (page.code && /^WP|CALC/.test(page.code) ? ' · ' + page.code : '') }));
    sec.appendChild(h('h3', { className: 'fp-h3', id: 'fp-step-title', tabindex: '-1', text: page.name || page.title }));
    if (page.name && page.name !== page.title) sec.appendChild(h('p', { className: 'fp-page-sub', text: page.title }));
    if (page.why) sec.appendChild(h('p', { className: 'fp-why', text: page.why }));
    if (page.intro) sec.appendChild(h('p', { className: 'fp-intro', text: page.intro }));
    var hhEl = page.id === 'who' ? householdOffer() : null;
    if (hhEl) sec.appendChild(hhEl);
    page.blocks.forEach(function (b) {
      if (b.kind === 'note') { sec.appendChild(h('p', { className: 'fp-note' + (b.private ? ' fp-private-note' : ''), text: b.text })); return; }
      // a part that belongs to one person: a gentle cue on a shared device, never a lock
      if (b.person != null && (b.turn || b.kind === 'checks' || b.kind === 'cards') && S.data.people > 1) sec.appendChild(turnCue(b.person));
      if (b.kind === 'steps') {
        // on the website there is no PDF to bring back: say what the buttons below do instead
        var ol = h('ol', { className: 'fp-howto' });
        ['Press \u201cMake my report\u201d below. It is made right here, in your browser, and nothing you type or choose is sent anywhere.',
          'To stop and come back later, press \u201cSave my progress\u201d. It downloads a small file; open it here next time with \u201cUpload your filled package\u201d.',
          'Prefer to finish in a PDF app? \u201cDownload my answers as a PDF\u201d gives you the package with everything you typed already in the boxes.'].forEach(function (t) { ol.appendChild(h('li', { text: t })); });
        sec.appendChild(h('h4', { className: 'fp-h4', text: 'When you\u2019re ready' })); sec.appendChild(ol); return;
      }
      if (b.kind === 'derived') {
        var d = h('div', { className: 'fp-derived' }, [h('p', { className: 'fp-derived-k', text: 'Worked out for you' })]);
        var live = liveLines(page);
        (live.length ? live : b.lines).forEach(function (t) { d.appendChild(h('p', { text: t })); });
        d.setAttribute('aria-live', 'polite'); d.id = 'fp-live';
        sec.appendChild(d); return;
      }
      var blk = h('div', { className: 'fp-block fp-' + b.kind });
      if (b.title) blk.appendChild(h('h4', { className: 'fp-h4', text: b.title }));
      if (b.intro) blk.appendChild(h('p', { className: 'fp-intro', text: b.intro }));
      if (b.kind === 'fields') { var g = h('div', { className: 'fp-fields' }); b.fields.forEach(function (fl) { g.appendChild(control(fl)); }); blk.appendChild(g); }
      else if (b.kind === 'scale') {
        var fs = h('fieldset', { className: 'fp-person' }, [h('legend', { text: b.title })]);
        b.fields.forEach(function (fl) { fs.appendChild(control(fl)); });
        blk.innerHTML = ''; blk.appendChild(fs);
      } else if (b.kind === 'checks') {
        b.groups.forEach(function (gr) {
          var fs2 = h('fieldset', { className: 'fp-chips' }, [h('legend', { text: gr.label })]);
          gr.fields.forEach(function (fl) { fs2.appendChild(control(fl)); });
          blk.appendChild(fs2);
        });
      } else if (b.kind === 'grid' || b.kind === 'cards') {
        var rows = b.rows;
        if (b.perPerson) {
          // each person fills in only their own rows: show one person's at a time, if you like
          blk.appendChild(rowsForPicker());
          var pick = S.rowsFor == null || S.rowsFor === '' ? null : +S.rowsFor;
          if (pick != null && pick < S.data.people) { blk.appendChild(turnCue(pick, true)); rows = rows.filter(function (r) { return whoOf(r) === pick; }); }
        }
        var long = b.kind === 'grid' && rows.length > 12, byDay = long && /\.day$/.test(rows[0].fields[0].id);
        if (long) {
          // day-by-day tables fold by day; other long tables fold in tens ("Rows 11 to 14")
          var groups = [], cur = null;
          rows.forEach(function (r, i) {
            i = b.rows.indexOf(r);
            var k = byDay ? (val(r.fields[0].name) || 'Other rows') : 'Rows ' + (Math.floor(i / 10) * 10 + 1) + ' to ' + Math.min(rows.length, Math.floor(i / 10) * 10 + 10);
            if (!cur || cur.k !== k) { cur = { k: k, rows: [] }; groups.push(cur); } cur.rows.push([r, i]);
          });
          groups.forEach(function (gr, gi) {
            var det = h('details', { className: 'fp-day', open: gi === 0 ? 'open' : null }, [h('summary', { text: gr.k })]);
            gr.rows.forEach(function (x) { det.appendChild(rowBox(x[0], x[1], b)); });
            blk.appendChild(det);
          });
        } else rows.forEach(function (r) { blk.appendChild(rowBox(r, b.rows.indexOf(r), b)); });
      }
      sec.appendChild(blk);
    });
    box.appendChild(sec);
    // footer
    var last = S.step === R.pages.length - 1;
    box.appendChild(h('div', { className: 'fp-form-foot' }, [
      h('button', { type: 'button', className: 'fp-btn-quiet', id: 'fp-back', disabled: S.step === 0 ? 'disabled' : null, text: '← Back' }),
      last ? h('button', { type: 'button', className: 'ws-go', id: 'fp-make', text: 'Make my report' }) : h('button', { type: 'button', className: 'ws-go', id: 'fp-next', text: 'Next: ' + shortName(R.pages[S.step + 1]) + ' →' })
    ]));
    box.appendChild(h('p', { className: 'fp-form-more' }, [
      h('button', { type: 'button', className: 'ws-link', id: 'fp-make-any', text: 'Make my report now' }), ' · ',
      h('button', { type: 'button', className: 'ws-link', id: 'fp-json', text: 'Save my progress (a small file)' }), ' · ',
      h('button', { type: 'button', className: 'ws-link', id: 'fp-filled-pdf', text: 'Download my answers as a PDF' })
    ]));
    if (FP.ROADS[S.data.road].solo) return;
    box.appendChild(shareChoice('fp-share-only'));
  }
  // At every download with answers in it: who will see what, and a way to leave the private parts out.
  function shareChoice(id) {
    return h('div', { className: 'fp-share' }, [
      h('p', { className: 'fp-private-note', text: (S.data && S.data.road === 'partners' ? 'Your partner' : 'Everyone you share it with') + ' will see every page if you share the file, including each person\u2019s load score answers, self-notes, raw reaction and calm-down triggers.' }),
      h('label', { className: 'fp-check', for: id }, [h('input', { type: 'checkbox', id: id, 'data-fp-share': '1', checked: S.shareOnly ? 'checked' : null }), h('span', { text: 'Leave the private parts out of what I download (a copy to share)' })])
    ]);
  }
  // "Use your household from before?" on the names page, like the other tools: only when no name is
  // typed here yet, and "Use them" fills only empty boxes (never over a typed name).
  function householdOffer() {
    var HH = global.TOLHousehold, hh = HH && !S.hhNo ? HH.get() : null;
    if (!hh || !hh.people.length || FP.ROADS[S.data.road].solo || !whoEmpty()) return null;
    return HH.offer({
      names: hh.people, status: $('fp-status'),
      onUse: function () {
        var want = Math.min(FP.MAX_PEOPLE, Math.max(S.data.people, hh.people.length));
        if (want !== S.data.people) { S.data.people = FP.clampPeople(S.data.road, want); }
        var n = fillEmptyNames(hh.people);
        S.hhNo = true;
        renderForm();
        return HH.addedLine(n, 0);
      },
      onNo: function () { S.hhNo = true; },
      focus: function () { return $('fp-f-who-p1'); }
    });
  }
  function shortName(p) { return p ? (p.code && /^WP|CALC/.test(p.code) ? p.code + ' ' : '') + (p.name || p.short || p.title) : ''; }

  function onFormInput(e) {
    var t = e.target, name = t.getAttribute('data-name');
    if (!name || !S.data) return;
    if (t.type === 'checkbox') setVal(name, t.checked);
    else if (t.type === 'radio') { if (t.checked) setVal(name, t.value); }
    else setVal(name, t.tagName === 'TEXTAREA' ? t.value : t.value.replace(/^\s+/, ''));
    var live = $('fp-live'), page = reg().pages[S.step];
    if (live && page) { var lines = liveLines(page); if (lines.length) { live.innerHTML = ''; live.appendChild(h('p', { className: 'fp-derived-k', text: 'Worked out for you' })); lines.forEach(function (x) { live.appendChild(h('p', { text: x })); }); } }
    // a name change reaches every person drop-down when the next page is drawn (no redraw here, so focus stays put)
  }

  /* ------------------------------------------------------------ the report on screen */

  function ulOf(items, cls) { var u = h('ul', { className: cls || '' }); items.forEach(function (t) { if (t) u.appendChild(h('li', { text: t })); }); return u; }
  function dlOf(rows, cls) { var d = h('dl', { className: 'fp-kv' + (cls ? ' ' + cls : '') }); rows.forEach(function (r) { if (r[1] == null || r[1] === '') return; d.appendChild(h('dt', { text: r[0] })); d.appendChild(h('dd', { text: r[1] })); }); return d; }
  function linkEl(l, pre) { return l ? h('p', { className: 'fp-links' }, [pre || 'On the site: ', h('a', { href: l[1], text: l[0] })]) : null; }
  function tableEl(t) {
    var wrapEl = h('div', { className: 'fp-tablewrap' });
    if (t.title) wrapEl.appendChild(h('p', { className: 'fp-sub fp-sub-brass', text: t.title }));
    var tb = h('table', { className: 'fp-table' }), cg = h('colgroup'), tot = (t.widths || t.head.map(function () { return 1; })).reduce(function (a, b) { return a + b; }, 0);
    (t.widths || t.head.map(function () { return 1; })).forEach(function (w) { var col = h('col'); col.style.width = (w / tot * 100).toFixed(2) + '%'; cg.appendChild(col); });
    tb.appendChild(cg);
    var th = h('thead'), tr = h('tr'); t.head.forEach(function (x) { tr.appendChild(h('th', { scope: 'col', text: x })); }); th.appendChild(tr); tb.appendChild(th);
    var body = h('tbody');
    t.rows.forEach(function (r) { var row = h('tr'); r.forEach(function (cell, i) { row.appendChild(h(i === 0 ? 'th' : 'td', { scope: i === 0 ? 'row' : null, text: String(cell == null ? '' : cell) })); }); body.appendChild(row); });
    tb.appendChild(body);
    wrapEl.appendChild(tb);
    if (t.note) wrapEl.appendChild(h('p', { className: 'fp-note fp-small', text: t.note }));
    return wrapEl;
  }
  function barsEl(b) {
    var box = h('div', { className: 'fp-bars' }, [h('p', { className: 'fp-sub fp-sub-brass', text: b.title })]);
    b.items.forEach(function (it, i) {
      var fill = h('span', { className: 'fp-bar-fill is-c' + (i % 6) });
      fill.style.width = (it.max > 0 ? Math.max(0, Math.min(1, it.value / it.max)) * 100 : 0).toFixed(1) + '%';
      box.appendChild(h('div', { className: 'fp-bar', role: 'img', 'aria-label': it.label + ': ' + it.text }, [
        h('span', { className: 'fp-bar-l', text: it.label }), h('span', { className: 'fp-bar-v', text: it.text }),
        h('span', { className: 'fp-bar-track', 'aria-hidden': 'true' }, [fill])
      ]));
    });
    if (b.note) box.appendChild(h('p', { className: 'fp-note fp-small', text: b.note }));
    return box;
  }
  function detailEl(s, m) {
    var det = h('details', { className: 'fp-rep-wp' + (s.status === 'blank' ? ' is-blank' : ''), id: 'fp-r-' + s.code.toLowerCase(), open: s.status !== 'blank' ? 'open' : null }, [
      h('summary', {}, [h('span', { className: 'fp-rep-code', text: s.code }), ' ' + s.name + (s.status === 'blank' ? (s.optional ? ' · optional, not filled in' : ' · not filled in') : '')])
    ]);
    if (s.title && s.title !== s.name) det.appendChild(h('p', { className: 'fp-page-sub', text: s.title }));
    det.appendChild(h('p', { className: 'fp-sub', text: 'What was entered' }));
    if (s.entered.length) det.appendChild(dlOf(s.entered)); else det.appendChild(h('p', { className: 'fp-note', text: s.optional ? 'Optional on your road, and not filled in. Nothing here is guessed.' : 'Not filled in. Nothing here is guessed.' }));
    (s.bars || []).forEach(function (b) { det.appendChild(barsEl(b)); });
    (s.tables || []).forEach(function (t) { det.appendChild(tableEl(t)); });
    var shows = (s.shows || []).concat(s.more || []);
    if (shows.length) { det.appendChild(h('p', { className: 'fp-sub', text: 'What it shows' })); det.appendChild(ulOf(shows)); }
    if (s.suggests && s.suggests.length) { det.appendChild(h('p', { className: 'fp-sub', text: 'What it suggests' })); det.appendChild(ulOf(s.suggests)); }
    det.appendChild(h('p', { className: 'fp-sub', text: 'What it can’t tell you' }));
    det.appendChild(h('p', { className: 'fp-note', text: s.doesnt }));
    if (s.card) det.appendChild(h('p', { className: 'fp-callout is-lav fp-quote' }, [h('strong', { text: 'A note you could share: ' }), s.card]));
    det.appendChild(h('p', { className: 'fp-callout is-butter' }, [h('strong', { text: 'One next step: ' }), s.next]));
    if (s.ask) det.appendChild(h('p', { className: 'fp-why', text: (m.road === 'self' ? 'Ask yourself: ' : 'Talk about: ') + s.ask }));
    var le = linkEl(s.link); if (le) det.appendChild(le);
    return det;
  }
  // A pillar named in plain words first: "Fix the setup (Pillar II)", never a bare "Pillar II"
  var PILLAR_WORDS = { I: 'See the whole load', II: 'Fix the setup', III: 'Read your state first', IV: 'Tune how you send and receive', V: 'Notice the quiet incentives' };
  function pillarTag(p) { var k = String(p).toUpperCase(), r = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V' }[k] || k; return PILLAR_WORDS[r] ? PILLAR_WORDS[r] + ' (Pillar ' + r + ')' : 'Pillar ' + p; }
  function itemEl(title, tag, rows, cls) {
    return h('div', { className: 'fp-item ' + (cls || '') }, [h('p', { className: 'fp-item-t', text: title }), tag ? h('p', { className: 'fp-item-tag', text: tag }) : null, dlOf(rows, 'fp-kv-tight')]);
  }

  // The Workpaper Suite's sheets, read into this package and made into the full report in one step.
  function fromSuite() {
    var suite = global.__workpaperSuite, snap = suite && suite.snapshot && suite.snapshot();
    if (!snap || !snap.path) { say('Choose your road at the top first, then fill in a sheet or two.'); return; }
    if (!snap.entries.length) { say('The full report reads the sheets you\u2019ve filled in. Fill in a sheet on your road, or bring in a file, first.'); return; }
    var r = FP.fromSuite(snap, S.data);
    if (!r) { say('The report could not be made from this suite.'); return; }
    S.data = r.data; S.read = r.read; S.from = r.fromSuite; S.origins = r.origins || [];
    changed();
    makeReport();
  }

  function makeReport() {
    if (!S.data) return;
    var m = FP.report(S.data), box = $('fp-report');
    S.model = m;
    box.innerHTML = '';
    box.appendChild(h('div', { className: 'fp-rep-head', 'data-road': m.road }, [
      h('p', { className: 'fp-page-k', text: 'Full path report · ' + m.roadLabel }),
      h('h3', { className: 'fp-h3', id: 'fp-rep-title', tabindex: '-1', text: m.title }),
      h('p', { className: 'fp-rep-for', text: 'For ' + m.forWho + (m.n > 1 ? ' · ' + m.n + ' people' : '') }),
      h('p', { className: 'fp-note', text: 'Not a verdict. ' + (m.lens || 'It describes the setup, never a person.') + ' Everything stays on your device: this report was made here, and nothing was sent anywhere.' })
    ]));
    box.appendChild(h('div', { className: 'fp-actions' }, [
      h('button', { type: 'button', className: 'ws-go', id: 'fp-report-pdf', text: 'Download the report PDF' }),
      h('button', { type: 'button', className: 'fp-btn-quiet', id: 'fp-edit', text: 'Change my answers' }),
      h('button', { type: 'button', className: 'fp-btn-quiet', id: 'fp-json2', text: 'Save my progress (a small file)' })
    ]));
    if (!FP.ROADS[S.data.road].solo) box.appendChild(shareChoice('fp-share-only2'));
    if (S.from) box.appendChild(h('p', { className: 'fp-callout', text: 'Made from your Workpaper Suite: ' + (S.from.length ? S.from.join(', ') : 'your sheets') + '. The CALC-01 page, your Wiring Card and the Ready page aren\u2019t in the Suite; add them with \u201cChange my answers\u201d if you like, and the report updates.' }));
    if (S.from && S.origins && S.origins.length) box.appendChild(h('details', { className: 'fp-origins' }, [h('summary', { text: 'Where the sheets came from' }), ulOf(S.origins)]));
    if (m.stateNote) box.appendChild(h('p', { className: 'fp-callout is-lav', text: m.stateNote }));

    // At a glance: one screen at most, first. Everything else is folded into closed sections below,
    // and "Open every section" opens them all.
    var glance = h('div', { className: 'fp-glance', role: 'group', 'aria-label': 'At a glance' }, [h('h4', { className: 'fp-h4', text: 'At a glance' }), h('p', { className: 'fp-lead', text: m.summary.para })]);
    var held = (m.anomalies || []).filter(function (x) { return x.id === 'wp01-one-sided'; })[0];
    if (held) glance.appendChild(h('p', { className: 'fp-callout is-sand', text: held.text }));
    if (m.summary.top.length) {
      var gl = h('ol', { className: 'fp-glance-top' });
      m.summary.top.slice(0, 3).forEach(function (t) { gl.appendChild(h('li', {}, [h('strong', { text: t.title + '. ' }), 'First step: ' + t.step])); });
      glance.appendChild(h('p', { className: 'fp-sub', text: 'Top things to work on' }));
      glance.appendChild(gl);
    }
    glance.appendChild(h('p', { className: 'fp-note', text: 'The rest is folded into the sections below. Open the ones you want, when you have the time.' }));
    box.appendChild(glance);

    var secs = [];
    function sec(id, title, open, kids) {
      open = false; // folded until someone opens it: the glance above is the short version
      secs.push([id, title]);
      var body = h('div', { className: 'fp-rsec-body' }, kids);
      return h('details', { className: 'fp-rsec', id: 'fp-r-' + id, open: open ? 'open' : null }, [h('summary', {}, [h('span', { className: 'fp-rsec-n', text: String(secs.length) }), h('span', { className: 'fp-rsec-t', text: title })]), body]);
    }
    var all = [];

    // 1. Executive summary
    var tiles = h('div', { className: 'fp-tiles' });
    m.tiles.forEach(function (t) { tiles.appendChild(h('div', { className: 'fp-tile is-' + t.tone }, [h('p', { className: 'fp-tile-k', text: t.k }), h('p', { className: 'fp-tile-v', text: t.v }), h('p', { className: 'fp-tile-b', text: t.band }), t.note ? h('p', { className: 'fp-tile-n', text: t.note }) : null])); });
    var fl = h('ol', { className: 'fp-findings' }); m.findings.forEach(function (t) { fl.appendChild(h('li', { text: t })); });
    var top = h('ol', { className: 'fp-top' });
    m.summary.top.forEach(function (t) { top.appendChild(h('li', {}, [h('strong', { text: t.title }), h('span', { text: t.text }), h('span', { className: 'fp-top-step', text: 'First step: ' + t.step })])); });
    var ready = [];
    if (m.ready && m.ready.going) ready.push('Going well: ' + m.ready.going);
    if (m.ready && m.ready.focus) ready.push('What you most want help with: ' + m.ready.focus);
    if (m.ready && m.ready.when) ready.push('When you’ll read it: ' + m.ready.when);
    all.push(sec('summary', 'Executive summary', true, [
      h('p', { className: 'fp-lead', text: m.summary.para }),
      h('h4', { className: 'fp-h4', text: 'Summary: the headline numbers' }), tiles, ulOf(m.summary.bands, 'fp-bands'),
      h('h4', { className: 'fp-h4', text: 'Key findings' }), fl,
      h('h4', { className: 'fp-h4', text: 'Strengths to protect' }), ulOf(m.summary.strengths.map(function (s) { return s.title + '. ' + s.text; }), 'fp-strengths'),
      h('h4', { className: 'fp-h4', text: 'Top 3 things to work on' }), top,
      h('div', { className: 'fp-callout is-sand' }, [h('strong', { text: 'Confidence: ' + m.confidence.level + '. ' }), m.confidence.text + ' ' + m.confidence.weight]),
      ready.length ? h('div', { className: 'fp-callout' }, [h('strong', { text: 'In your words' }), ulOf(ready)]) : null
    ]));

    // 2. Detailed findings
    var wps = h('div', { className: 'fp-rep-wps' });
    m.sections.forEach(function (s) { wps.appendChild(detailEl(s, m)); });
    var cs = m.calcSection, cdet = h('details', { className: 'fp-rep-wp', id: 'fp-r-calc-01', open: 'open' }, [h('summary', {}, [h('span', { className: 'fp-rep-code', text: 'CALC-01' }), cs.applies ? ' Is the setup working for everyone?' : ' Your state and retuning count'])]);
    if (cs.state) cdet.appendChild(h('p', { className: 'fp-note', text: 'Step zero, your state: ' + cs.state + '.' }));
    cdet.appendChild(dlOf(cs.rows.map(function (r) { return [r[0], r[1] + ' · ' + r[2]]; })));
    cdet.appendChild(ulOf(cs.lines));
    if (cs.moves && cs.moves.length) { cdet.appendChild(h('p', { className: 'fp-sub', text: 'What would move the score' })); cdet.appendChild(ulOf(cs.moves)); }
    var cl = linkEl(cs.link); if (cl) cdet.appendChild(cl);
    wps.appendChild(cdet);
    m.extra.forEach(function (s) { wps.appendChild(detailEl(s, m)); });
    all.push(sec('findings', 'Detailed findings, section by section', true, [h('p', { className: 'fp-note', text: 'Each section says what was entered, what it shows, what it suggests and what it can’t tell you. Tap a heading to fold it away.' }), wps]));

    // 3. Connections
    var ins = h('div', { className: 'fp-items' }), work = m.insights.filter(function (r) { return !r.strength; }), good = m.insights.filter(function (r) { return r.strength; });
    work.forEach(function (r) { ins.appendChild(itemEl(r.title, pillarTag(r.pillar) + ' · ' + r.src.join(', '), [['What we see', r.finding], ['Why it matters', r.why], ['What to try', r.rec ? r.rec.first : '']], 'is-work')); });
    var goodBox = h('div', { className: 'fp-items' });
    good.forEach(function (r) { goodBox.appendChild(itemEl(r.title, pillarTag(r.pillar) + ' · ' + r.src.join(', '), [['What we see', r.finding], ['Why it matters', r.why]], 'is-good')); });
    all.push(sec('connections', 'Connections across workpapers', true, [
      h('p', { className: 'fp-note', text: m.insights.length ? m.insights.length + ' of the report’s ' + m.counts.rules + ' insight rules fired for your answers. They describe the setup, not anyone’s character.' : 'None of the ' + m.counts.rules + ' insight rules fired yet. Most need two or more pages filled in.' }),
      ins, good.length ? h('h4', { className: 'fp-h4', text: 'Strengths the pages show' }) : null, good.length ? goodBox : null
    ]));

    // 4. Worth a second look
    var an = h('div', { className: 'fp-items' });
    m.anomalies.forEach(function (a) { an.appendChild(itemEl(a.where, a.level === 'check' ? 'Worth fixing if it is a typo' : 'Worth knowing', [['What we noticed', a.text], ['What to do', a.fix]], a.level === 'check' ? 'is-check' : 'is-noted')); });
    all.push(sec('checks', 'Worth a second look', true, [
      h('p', { className: 'fp-note', text: 'We ran ' + m.counts.checks + ' gentle checks: numbers that don’t add up, answers that seem to disagree, and gaps. It may be a typo, or it may be real. ' + (m.anomalies.length ? m.anomalies.length + (m.anomalies.length === 1 ? ' thing' : ' things') + ' came up.' : 'Nothing stood out: the numbers hang together.') }),
      an
    ]));

    // 5. Recommendations and plan
    var recBox = h('div', {});
    [['now', 'Now'], ['week', 'This week'], ['month', 'This month']].forEach(function (hz) {
      recBox.appendChild(h('h4', { className: 'fp-h4', text: hz[1] }));
      if (!m.recs[hz[0]].length) { recBox.appendChild(h('p', { className: 'fp-note', text: 'Nothing extra for ' + hz[1].toLowerCase() + '.' })); return; }
      var it = h('div', { className: 'fp-items' });
      m.recs[hz[0]].forEach(function (r) {
        var el = itemEl(r.title, r.pillar ? pillarTag(r.pillar) : '', [['Why', r.why], ['First step', r.first], ['Try saying', r.script], ['It’s working when', r.working]], 'is-rec is-' + hz[0]);
        var le2 = linkEl(r.link, 'Tool: '); if (le2) el.appendChild(le2);
        it.appendChild(el);
      });
      recBox.appendChild(it);
    });
    var pl = h('ol', { className: 'fp-plan' });
    m.plan.forEach(function (w) { pl.appendChild(h('li', {}, [h('strong', { text: 'Week ' + w.week + ': ' + w.title }), h('span', { className: 'fp-plan-wp', text: w.wp + (w.pillar ? ' · ' + pillarTag(w.pillar) : '') }), h('span', { text: w.do })])); });
    recBox.appendChild(h('h4', { className: 'fp-h4', text: 'Your ' + m.plan.length + '-week plan' }));
    recBox.appendChild(pl);
    all.push(sec('recs', 'Recommendations and your plan', true, [recBox]));

    // 6. People, or the Individual road's deeper look
    if (m.persons) {
      var pb = h('div', { className: 'fp-people' });
      m.persons.forEach(function (p) {
        pb.appendChild(h('details', { className: 'fp-person-card' }, [h('summary', { text: p.label }),
          dlOf(p.rows), h('p', { className: 'fp-sub', text: 'What they bring' }), ulOf(p.strengths), h('p', { className: 'fp-sub', text: 'What might help' }), ulOf(p.help),
          h('p', { className: 'fp-callout is-lav fp-quote' }, [h('strong', { text: 'A conversation starter: ' }), '“' + p.starter + '”'])]));
      });
      all.push(sec('people', 'A page for each person', false, [h('p', { className: 'fp-note', text: 'Not scorecards and not a ranking. Each one is written to that person about their own week. Read your own first; share it if you want to.' + (m.persons.some(function (p) { return p.note; }) ? ' A person\u2019s own note from WP-02 shows on their page only. Anyone you share this report with will see it, so leave the private parts out of a copy you share if you\u2019d rather they didn\u2019t.' : '') }), pb]));
    }
    if (m.self) {
      var sd = m.self, sb = [h('p', { text: sd.intro })];
      sd.layers.forEach(function (ly) { sb.push(h('p', { className: 'fp-sub', text: ly[0] })); sb.push(ulOf(ly[1])); });
      sb.push(h('h4', { className: 'fp-h4', text: 'Which layer is it?' })); sb.push(ulOf(sd.sorting));
      sb.push(h('h4', { className: 'fp-h4', text: 'Putting yourself into words' }));
      if (sd.explain.to) sb.push(h('p', { className: 'fp-note', text: 'You named: ' + sd.explain.to + '.' }));
      sb.push(sd.explain.card ? h('p', { className: 'fp-callout is-lav fp-quote', text: sd.explain.card }) : h('p', { className: 'fp-note', text: 'Once your Wiring Card has a few lines, this becomes a short note you can share.' }));
      sb.push(h('p', { className: 'fp-sub', text: 'Lines you could use' })); sb.push(ulOf(sd.explain.scripts, 'fp-quotes'));
      var lp = h('p', { className: 'fp-links' }, ['Read more: ']);
      sd.links.filter(Boolean).forEach(function (l, i) { if (i) lp.appendChild(document.createTextNode(' · ')); lp.appendChild(h('a', { href: l[1], text: l[0] })); });
      sb.push(lp);
      all.push(sec('self', 'Understanding yourself: wiring, patterns, conditions', true, sb));
    }

    // 7. For your road
    var rp = m.roadPart, road = [];
    rp.paras.forEach(function (t) { road.push(h('p', { text: t })); });
    (rp.blocks || []).forEach(function (b) { road.push(h('p', { className: 'fp-sub', text: b[0] })); road.push(h('p', { text: b[1] })); });
    if (rp.step) { road.push(h('p', { className: 'fp-sub', text: rp.step.title })); road.push(ulOf(rp.step.lines)); }
    if (rp.suggestions.length) { road.push(h('p', { className: 'fp-sub', text: 'Suggestions' })); road.push(ulOf(rp.suggestions)); }
    if (rp.look && rp.look.length) { road.push(h('p', { className: 'fp-sub', text: 'What to look for' })); road.push(ulOf(rp.look)); }
    if (rp.together) road.push(h('p', { className: 'fp-callout' }, [h('strong', { text: rp.together[0] + ': ' }), rp.together[1]]));
    if (rp.links.length) { var rl2 = h('p', { className: 'fp-links' }, ['Read and try: ']); rp.links.forEach(function (l, i) { if (i) rl2.appendChild(document.createTextNode(' · ')); rl2.appendChild(h('a', { href: l[1], text: l[0] })); }); road.push(rl2); }
    all.push(sec('road', rp.heading, false, road));

    // 8. The Five Pillars
    var pv = m.pillars, pil = [], soloP = m.road === 'self', withLbl = soloP ? ' With others, if you like: ' : ' Between you and others: ';
    if (pv.strongest && !pv.note) pil.push(h('p', { className: 'fp-callout is-mint' }, [h('strong', { text: 'Looks strongest: Pillar ' + pv.strongest.n + ', ' + pv.strongest.name + '. ' }), 'In you: ' + pv.strongest.inYouI + withLbl + pv.strongest.betweenI]));
    if (pv.care && pv.care !== pv.strongest && !pv.note) pil.push(h('p', { className: 'fp-callout is-peach' }, [h('strong', { text: 'Needs the most care: Pillar ' + pv.care.n + ', ' + pv.care.name + '. ' }), 'In you: ' + pv.care.inYouI + withLbl + pv.care.betweenI]));
    if (pv.note) pil.push(h('p', { className: 'fp-note', text: pv.note }));
    pil.push(barsEl({ title: 'Rough readings, 0 to 1 (higher is steadier)', items: pv.rows.map(function (r) { return { label: 'Pillar ' + r.n + ': ' + r.name, value: r.value || 0, max: 1, text: r.value != null ? FP.fmt(r.value) : 'not filled in' }; }) }));
    var pt = h('ul', { className: 'fp-pillar-list' });
    pv.rows.forEach(function (r) {
      pt.appendChild(h('li', {}, [h('a', { href: '/five-pillars.html#' + r.anchor, text: 'Pillar ' + r.n + ': ' + r.name }), h('span', { className: 'fp-pillar-v', text: r.value != null ? ' · reads ' + FP.fmt(r.value) : ' · not filled in' }),
        dlOf([['The data shows', r.shows], ['In you', r.inYouI], [soloP ? 'With others' : 'Between you', r.betweenI], ['A practice', r.practice]], 'fp-kv-tight')]));
    });
    pil.push(pt);
    pil.push(h('p', { className: 'fp-note', text: 'Rough readings from what you entered, not scores on anyone.' }));
    all.push(sec('pillars', 'The Five Pillars view', true, [h('p', {}, ['How the ', h('a', { href: '/five-pillars.html', text: 'Five Pillars' }), ' show up in your answers: each starts inside you, ' + (soloP ? 'and can show up with the people around you.' : 'then shows up between you and others.')])].concat(pil)));

    // 9. Discussion guide
    var g = m.guide, qs = h('ol', { className: 'fp-questions' });
    g.questions.forEach(function (t) { qs.appendChild(h('li', { text: t })); });
    var gk = [h('h4', { className: 'fp-h4', text: 'Questions' }), qs, h('h4', { className: 'fp-h4', text: 'Ground rules' }), ulOf(g.rules), h('div', { className: 'fp-callout is-butter' }, [h('strong', { text: 'If it lands hard' }), ulOf(g.hard)])];
    if (rp.talk && rp.talk.length) { gk.push(h('h4', { className: 'fp-h4', text: rp.talkTitle })); var tu = h('ul', { className: 'fp-quotes' }); rp.talk.forEach(function (t) { tu.appendChild(h('li', { text: '“' + t + '”' })); }); gk.push(tu); }
    all.push(sec('guide', 'Discussion guide', true, gk));

    // 10. Glossary and method
    all.push(sec('method', 'Glossary and how this report works', false, [
      h('h4', { className: 'fp-h4', text: 'How this report works' }), ulOf(m.method),
      h('h4', { className: 'fp-h4', text: 'How complete the data is' }), h('p', { text: m.confidence.text + ' ' + m.confidence.weight }),
      tableEl({ title: 'Page by page', head: ['Page', 'Status', 'Boxes filled in'], rows: m.completeness, widths: [2.4, 1, 1] }),
      h('h4', { className: 'fp-h4', text: 'Glossary' }), dlOf(m.glossary)
    ]));

    // contents, then the sections
    var toc = h('nav', { className: 'fp-toc', 'aria-label': 'In this report' }, [h('p', { className: 'fp-toc-k', text: 'In this report' })]), tol = h('ol', {});
    secs.forEach(function (x) { tol.appendChild(h('li', {}, [h('a', { href: '#fp-r-' + x[0], 'data-open': 'fp-r-' + x[0], text: x[1] })])); });
    toc.appendChild(tol);
    toc.appendChild(h('p', { className: 'fp-toc-tools' }, [h('button', { type: 'button', className: 'ws-link', id: 'fp-open-all', text: 'Open every section' }), ' · ', h('button', { type: 'button', className: 'ws-link', id: 'fp-close-all', text: 'Fold them all' })]));
    box.appendChild(toc);
    all.forEach(function (x) { box.appendChild(x); });
    var fu = h('ul', { className: 'fp-fair' }); m.fair.forEach(function (t) { fu.appendChild(h('li', { text: t })); });
    box.appendChild(h('h4', { className: 'fp-h4', text: 'Keep it fair' }));
    box.appendChild(fu);
    if (m.care) box.appendChild(h('p', { className: 'fp-why', text: m.care }));
    if (m.close) box.appendChild(h('p', { className: 'fp-callout is-butter fp-close', text: m.close }));
    show('fp-report');
    scrollTo(box);
    $('fp-rep-title').focus();
    say('Your report is ready below. Download the PDF to keep it.');
  }
  function openSection(id) {
    var el = $(id); if (!el) return;
    if (el.tagName === 'DETAILS') el.open = true;
    scrollTo(el);
    var s = el.querySelector('summary'); if (s) s.focus();
  }
  function foldAll(open) { Array.prototype.forEach.call($('fp-report').querySelectorAll('details'), function (d) { d.open = open; }); }

  function reportPdf() {
    if (!S.data) return;
    var share = S.shareOnly && !FP.ROADS[S.data.road].solo;
    try { download(FPP.reportPdf(share ? FP.report(FP.shareCopy(S.data)) : (S.model || FP.report(S.data))), fileBase(S.data) + (share ? '-report-to-share.pdf' : '-report.pdf'), 'application/pdf'); say(share ? 'A copy of your report to share is in your Downloads. It leaves out the load scores, self-notes, raw reaction and calm-down triggers.' : 'Your report is in your Downloads. Keep it somewhere private; ' + (FP.ROADS[S.data.road].solo ? 'it is yours.' : 'anyone you share it with will see every page.')); }
    catch (err) { say('The report PDF could not be made. Save a backup so nothing is lost, then try again.'); if (global.console) console.error(err); }
  }
  function saveJson() {
    if (!S.data) return;
    var out = { format: S.data.format, version: S.data.version, road: S.data.road, people: S.data.people, saved: new Date().toISOString(), values: S.data.values };
    if (S.data.sizes) out.sizes = S.data.sizes;
    if (S.data.focus) out.focus = S.data.focus;
    download(JSON.stringify(out, null, 2), fileBase(S.data) + '-progress.json', 'application/json');
    S.dirty = false;
    say('Your progress file is in your Downloads. Upload it here any time to pick up where you left off.');
  }
  function filledPdf() {
    if (!S.data) return;
    var share = S.shareOnly && !FP.ROADS[S.data.road].solo;
    try { download(FPP.packagePdf(share ? FP.shareCopy(S.data) : S.data), fileBase(S.data) + (share ? '-package-to-share.pdf' : '-package-filled.pdf'), 'application/pdf'); say(share ? 'A copy to share is in your Downloads, without the private parts. Keep your full copy too.' : 'Your answers are in a filled package PDF in your Downloads. You can keep filling it in any PDF app.' + (FP.ROADS[S.data.road].solo ? '' : ' If you share it, everyone will see every page.')); }
    catch (err) { say('The PDF could not be made.'); if (global.console) console.error(err); }
  }

  /* ------------------------------------------------------------ wiring */

  function boot() {
    fillRoads($('fp-road'), 'partners');
    fillCount($('fp-count'), 2);
    var q = (global.location.search.match(/[?&]road=([a-z]+)/) || [])[1];
    if (q && FP.ROADS[q]) $('fp-road').value = q;
    syncDownloadCard();
    $('fp-road').addEventListener('change', syncDownloadCard);
    $('fp-download').addEventListener('click', downloadPackage);
    var file = $('fp-file');
    $('fp-upload').addEventListener('click', function () { file.click(); });
    file.addEventListener('change', function () { takeFile(file.files && file.files[0]); file.value = ''; });
    var drop = $('fp-drop');
    ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
    ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
    drop.addEventListener('drop', function (e) { takeFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });
    var fromBtn = $('ws-fullreport');
    if (fromBtn) fromBtn.addEventListener('click', fromSuite);
    $('fp-start').addEventListener('click', function () {
      if (S.data && (S.data.road !== $('fp-road').value) && Object.keys(S.data.values).length && !global.confirm('Start a new ' + FP.ROADS[$('fp-road').value].label + ' package? What you typed for ' + FP.ROADS[S.data.road].label + ' stays until you close the page, but this starts fresh.')) { startForm(S.step); return; }
      if (!S.data || S.data.road !== $('fp-road').value) S.data = FP.blankData($('fp-road').value, $('fp-count').value);
      // the Suite's "what brings you here" choice comes along when the road is the same
      var su = global.__workpaperSuite, st = su && su.state && su.state();
      if (st && st.path && st.path.id === S.data.road) { if (st.variant) S.data.focus = st.variant; else delete S.data.focus; }
      S.from = null;
      startForm(0);
    });

    root.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-open]');
      if (a && root.contains(a)) { e.preventDefault(); openSection(a.getAttribute('data-open')); return; }
      var t = e.target.closest('button');
      if (!t || !root.contains(t)) return;
      var id = t.id;
      if (t.hasAttribute('data-step')) { var st = +t.getAttribute('data-step'); if (!$('fp-form').hidden) { S.step = st; renderForm(); $('fp-step-title').focus(); } else startForm(st); return; }
      if (t.hasAttribute('data-clear')) { setVal(t.getAttribute('data-clear'), ''); var y = global.scrollY; renderForm(); global.scrollTo(0, y); return; }
      if (id === 'fp-merge-add' || id === 'fp-merge-replace' || id === 'fp-merge-cancel') { resolveMerge(id.slice(9)); return; }
      if (id === 'fp-next') { S.step++; renderForm(); scrollTo($('fp-form')); $('fp-step-title').focus(); }
      else if (id === 'fp-back') { S.step = Math.max(0, S.step - 1); renderForm(); scrollTo($('fp-form')); $('fp-step-title').focus(); }
      else if (id === 'fp-make' || id === 'fp-make-any' || id === 'fp-make-from-read') makeReport();
      else if (id === 'fp-fix-all' || id === 'fp-edit') startForm(id === 'fp-edit' ? 0 : S.step);
      else if (id === 'fp-json' || id === 'fp-json2') saveJson();
      else if (id === 'fp-filled-pdf') filledPdf();
      else if (id === 'fp-report-pdf') reportPdf();
      else if (id === 'fp-open-all' || id === 'fp-close-all') foldAll(id === 'fp-open-all');
    });
    $('fp-preview').addEventListener('change', function (e) { var c = e.target.getAttribute('data-conflict'); if (c != null && e.target.checked) pickConflict(+c, e.target.value); });
    root.addEventListener('change', function (e) {
      if (e.target.getAttribute('data-fp-share')) { S.shareOnly = e.target.checked; Array.prototype.forEach.call(root.querySelectorAll('[data-fp-share]'), function (x) { x.checked = S.shareOnly; }); }
    });
    var form = $('fp-form');
    form.addEventListener('input', onFormInput);
    form.addEventListener('change', function (e) {
      if (e.target.id === 'fp-form-road') { S.data.road = e.target.value; S.data.people = FP.clampPeople(S.data.road, S.data.people); FP.migrateSelf(S.data.values, FP.ROADS[S.data.road].solo); S.step = 0; changed(); renderForm(); return; }
      if (e.target.id === 'fp-rows-for') { S.rowsFor = e.target.value; var y0 = global.scrollY; renderForm(); global.scrollTo(0, y0); var rf = $('fp-rows-for'); if (rf) rf.focus(); return; }
      if (e.target.getAttribute('data-fp-share')) return;
      if (e.target.id === 'fp-form-count') { S.data.people = FP.clampPeople(S.data.road, e.target.value); changed(); renderForm(); return; }
      onFormInput(e);
    });

    // the Suite's "Keep a draft on this device" switch and "Erase" button cover this part too
    var keepBox = $('ws-keep'), erase = $('ws-erase'), clear = $('wpf-clear');
    if (keepBox) keepBox.addEventListener('change', function () { if (keepBox.checked) keepNow(); else eraseKept(); });
    if (erase) erase.addEventListener('click', eraseKept);
    // "Clear this page" asks first; only clear this part if the Suite really did clear.
    if (clear) clear.addEventListener('click', function () {
      var suite = global.__workpaperSuite, before = suite && suite.state();
      setTimeout(function () {
        if (!S.data || (suite && suite.state() === before)) return;
        S.data = null; S.model = null; S.dirty = false; eraseKept(); show(null);
        $('fp-upload-note').textContent = '';
      }, 0);
    }, true);
    var kept = readKept();
    if (kept) {
      S.data = kept.data;
      if (keepBox && !keepBox.checked) keepBox.checked = true;
      $('fp-upload-note').textContent = 'Picked up your Full path draft kept on this device. Press “Erase” at the top to remove it.';
      var go = h('button', { type: 'button', className: 'ws-link', text: 'Carry on filling it in' });
      go.addEventListener('click', function () { startForm(0); });
      $('fp-upload-note').appendChild(document.createTextNode(' '));
      $('fp-upload-note').appendChild(go);
      S.dirty = false;
    }
    global.addEventListener('beforeunload', function (e) {
      if (keepOn()) { keepNow(); return; }
      if (!S.dirty) return;
      e.preventDefault();
      e.returnValue = 'You have unsaved answers in your Full path package.';
      return e.returnValue;
    });
    global.__fullPath = { state: function () { return S; }, take: takeFile, report: makeReport, fromSuite: fromSuite };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
