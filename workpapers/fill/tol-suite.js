/*
  tol-suite.js — The Objective Ledger (TOL-OS)
  The Workpaper Suite: choose your road (just you, a kind of relationship, or
  the 6-week program), fill in its workpapers in order, bring in drafts and
  filled-in PDFs, and make one PDF you can fill in or print, plus a report
  grouped the way your road goes.

  Privacy by design, like every fill-in workpaper:
  - Nothing is sent anywhere, and the page's Content-Security-Policy blocks it.
  - Nothing you type is stored in the browser unless you tick "Keep a draft on
    this device". Then the whole suite is kept in localStorage on this device
    only, until you press "Erase". Otherwise it lives on this page until you
    close it, and in the files you choose to download.
  - "Who's on this road?" holds 2 to 8 people. Every worksheet's person
    drop-downs list all of them.
*/
(function (global) {
  'use strict';

  var WPK = global.TOLWorkpaper, SP = global.TOLSuitePDF, PATHS = global.TOL_SUITE_PATHS;
  if (!WPK || !SP || !PATHS) return;
  var SUITE_FORMAT = 'tol-workpaper-suite';
  var KEEP_KEY = 'tol-wpf-keep:suite';
  var MIN_PEOPLE = 2, MAX_PEOPLE = WPK.MAX_PEOPLE || 8;
  var ORDER = ['WP-01', 'WP-02', 'WP-03', 'WP-04', 'WP-09', 'WP-11', 'WP-13'];

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
  function schema(code) { return SP.schemaFor(code); }
  function pathById(id) { return PATHS.paths.filter(function (p) { return p.id === id; })[0] || null; }
  var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------ state (in memory only) */

  var S = { path: null, names: ['', ''], stops: [], dirty: false, view: 'steps' };
  var uid = 0, keep = false, keepTimer = null;

  // What to call person i on this road when they have no name yet ("You", "Teammate", "Teammate 2" …)
  function roleLabel(i) { return SP.roleOf(S.path ? S.path.people : null, i); }
  function roleHeading(i) { var r = roleLabel(i); return r === 'You' ? 'Your name' : r; }
  WPK.setDefaultLabels(function (i) { return roleLabel(i); });

  // Put everyone on the road onto a sheet that has people on it.
  function applyNames(sc, st) {
    if (sc.people) {
      var n = WPK.peopleCount(st.values);
      S.names.forEach(function (nm, i) { st.values['partner' + WPK.CODES[i]] = nm; });
      for (var k = S.names.length; k < n; k++) delete st.values['partner' + WPK.CODES[k]];
      st.values.peopleCount = S.names.length;
      // a sheet that had more people than the road now does: take the extra ones off
      while (WPK.peopleCount(st.values) > S.names.length) WPK.removePerson(sc, st, WPK.peopleCount(st.values) - 1);
      WPK.syncPeople(sc, st);
    }
  }
  function newEntry(code, label) {
    var sc = schema(code), st = WPK.blankState(sc);
    if (sc.people) applyNames(sc, st);
    else if (sc.meta && sc.meta.some(function (m) { return m.id === 'name'; })) st.values.name = S.names[0];
    return { id: 'e' + (++uid), workpaper: code, label: label || '', state: st };
  }
  function filled(en) { return SP.answers(en) > 0; }

  // Lay out the stops for a road, carrying over any sheets already filled in.
  function setPath(id) {
    var p = pathById(id);
    if (!p) return;
    SP.setRoad(p.id);
    var pool = {};
    S.stops.forEach(function (st) { st.entries.forEach(function (en) { if (filled(en) || en.label) (pool[en.workpaper] = pool[en.workpaper] || []).push(en); }); });
    S.path = p;
    S.stops = [];
    p.groups.forEach(function (g, gi) {
      g.stops.forEach(function (s, si) {
        S.stops.push({ key: gi + '-' + si, wp: s.wp, why: s.why, again: s.again, group: g.title, groupNote: g.note, along: g.along || [], gi: gi, entries: [] });
      });
    });
    // Hand earlier sheets back out: one per stop for that workpaper, extra ones to its last stop.
    Object.keys(pool).forEach(function (code) {
      var stops = S.stops.filter(function (st) { return st.wp === code; });
      if (!stops.length) stops = [extraStop(code)];
      pool[code].forEach(function (en, i) { (stops[Math.min(i, stops.length - 1)]).entries.push(en); });
    });
    renderPaths(); renderNames(); renderRoad();
  }

  function extraStop(code) {
    var st = { key: 'x-' + code, wp: code, why: 'Added by you.', again: 'Another copy', group: 'Also on your road', groupNote: 'Workpapers you added yourself.', gi: 99, entries: [] };
    S.stops.push(st);
    return st;
  }

  // Put a sheet that came from a file onto the road.
  function place(en) {
    var stops = S.stops.filter(function (st) { return st.wp === en.workpaper; });
    if (!stops.length) stops = [extraStop(en.workpaper)];
    var target = null;
    stops.some(function (st) {
      var emptyIdx = -1;
      st.entries.some(function (x, i) { if (!filled(x)) { emptyIdx = i; return true; } return false; });
      if (!st.entries.length) { target = st; return true; }
      if (emptyIdx >= 0) { st.entries.splice(emptyIdx, 1); target = st; return true; }
      return false;
    });
    if (!target) target = stops[stops.length - 1];
    en.id = 'e' + (++uid);
    target.entries.push(en);
    var sc = schema(en.workpaper);
    if (sc.people && !S.names.some(function (x) { return String(x || '').trim(); })) {
      var n = WPK.peopleCount(en.state.values);
      S.names = WPK.CODES.slice(0, n).map(function (c) { return String(en.state.values['partner' + c] || ''); });
    }
  }

  /* ------------------------------------------------------------ step 1: roads */

  function renderPaths() {
    var box = $('ws-paths');
    box.innerHTML = '';
    PATHS.paths.forEach(function (p) {
      var on = S.path && S.path.id === p.id;
      var b = h('button', { type: 'button', className: 'ws-path' + (on ? ' is-on' : ''), role: 'radio', 'aria-checked': on ? 'true' : 'false', 'data-path': p.id }, [
        h('span', { className: 'ws-path-icon', 'aria-hidden': 'true', text: p.icon }),
        h('span', { className: 'ws-path-name', text: p.label }),
        h('span', { className: 'ws-path-blurb', text: p.blurb })
      ]);
      b.style.setProperty('--c', p.color);
      box.appendChild(b);
    });
  }

  function renderNames() {
    var p = S.path, wrap = $('ws-names');
    if (!p) { wrap.hidden = true; return; }
    wrap.hidden = false;
    var row = $('ws-names-row');
    row.innerHTML = '';
    S.names.forEach(function (nm, i) {
      var inp = h('input', { type: 'text', id: 'ws-name-' + i, autocomplete: 'off', maxlength: '40', 'data-name': String(i) });
      inp.value = nm;
      var lab = h('label', { className: 'ws-name', for: 'ws-name-' + i }, [h('span', { text: roleHeading(i) }), inp]);
      var cell = h('div', { className: 'ws-name-cell' }, [lab]);
      if (S.names.length > MIN_PEOPLE) {
        cell.appendChild(h('button', { type: 'button', className: 'ws-name-x', 'data-remove-name': String(i), 'aria-label': 'Take ' + (nm.trim() || roleLabel(i)) + ' off this road', text: '×' }));
      }
      row.appendChild(cell);
    });
    $('ws-name-add').hidden = S.names.length >= MAX_PEOPLE;
    $('ws-names-count').textContent = S.names.length + ' people · up to ' + MAX_PEOPLE;
    $('ws-care').textContent = p.care;
  }

  function eachPeopleSheet(fn) {
    S.stops.forEach(function (st) {
      st.entries.forEach(function (en) { var sc = schema(en.workpaper); if (sc && sc.people) fn(sc, en.state, en); });
    });
  }

  function setName(i, v) {
    var old = S.names[i];
    S.names[i] = v;
    var k = 'partner' + WPK.CODES[i];
    S.stops.forEach(function (st) {
      st.entries.forEach(function (en) {
        var vals = en.state.values, sc = schema(en.workpaper);
        if (sc.people && (vals[k] || '') === old) vals[k] = v;
        if (!sc.people && i === 0 && vals.hasOwnProperty('name') && (vals.name || '') === old) vals.name = v;
      });
    });
    changed();
  }

  function addName() {
    if (S.names.length >= MAX_PEOPLE) return;
    S.names.push('');
    eachPeopleSheet(function (sc, st) {
      while (WPK.peopleCount(st.values) < S.names.length && WPK.addPerson(sc, st)) { /* keep in step with the road */ }
    });
    changed();
    renderNames();
    var inp = $('ws-name-' + (S.names.length - 1));
    if (inp) inp.focus();
    say('Added a person. ' + S.names.length + ' people on this road.');
  }

  function removeName(i) {
    if (S.names.length <= MIN_PEOPLE) return;
    var who = S.names[i].trim() || roleLabel(i);
    if (!global.confirm('Take ' + who + ' off this road? On every sheet, the jobs they own go back to "—".')) return;
    S.names.splice(i, 1);
    eachPeopleSheet(function (sc, st) { if (WPK.peopleCount(st.values) > i) WPK.removePerson(sc, st, i); });
    changed();
    renderNames();
    var add = $('ws-name-add');
    if (add && !add.hidden) add.focus();
    say(who + ' is off this road.');
  }

  /* ------------------------------------------------------------ keep a draft on this device (opt-in) */

  function snapshot() {
    var entries = [];
    S.stops.forEach(function (st) { st.entries.forEach(function (en) { if (filled(en) || en.label) entries.push({ workpaper: en.workpaper, label: en.label, stop: st.key, state: en.state }); }); });
    return { format: SUITE_FORMAT, version: 1, path: S.path ? S.path.id : null, names: S.names.slice(), saved: new Date().toISOString(), entries: entries };
  }
  function changed() {
    S.dirty = true;
    if (!keep) return;
    clearTimeout(keepTimer);
    keepTimer = setTimeout(keepNow, 400);
  }
  function keepNow() {
    if (!keep) return false;
    try {
      global.localStorage.setItem(KEEP_KEY, JSON.stringify(snapshot()));
      S.dirty = false;
      return true;
    } catch (e) {
      say('This browser won’t keep a draft (storage is off or full). Save a suite file instead.');
      return false;
    }
  }
  function readKept() {
    try {
      var raw = global.localStorage.getItem(KEEP_KEY), d = raw ? JSON.parse(raw) : null;
      return d && d.format === SUITE_FORMAT && Array.isArray(d.entries) ? d : null;
    } catch (e) { return null; }
  }
  function eraseKept(msg) {
    clearTimeout(keepTimer);
    try { global.localStorage.removeItem(KEEP_KEY); } catch (e) {}
    keep = false;
    var box = $('ws-keep'); if (box) box.checked = false;
    S.dirty = S.stops.some(function (st) { return st.entries.some(filled); });
    say(msg || 'Erased. Nothing from your suite is stored on this device. What is on the page stays until you close it.');
  }

  /* ------------------------------------------------------------ step 2: the road */

  function renderRoad() {
    var road = $('ws-road'), empty = $('ws-road-empty');
    road.innerHTML = '';
    $('ws-step-road').classList.toggle('is-waiting', !S.path);
    empty.hidden = !!S.path;
    if (!S.path) { renderProgress(); $('ws-view').hidden = true; $('ws-weeks').hidden = true; return; }
    $('ws-view').hidden = false;
    Array.prototype.forEach.call($('ws-view').querySelectorAll('[data-view]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === S.view)); });
    var weeksEl = $('ws-weeks');
    road.hidden = S.view === 'weeks'; weeksEl.hidden = S.view !== 'weeks';
    if (S.view === 'weeks') renderWeeks(weeksEl);
    $('ws-road-title').textContent = S.path.label + ': your road';
    var groups = [];
    S.stops.forEach(function (st) {
      var g = groups.filter(function (x) { return x.title === st.group; })[0];
      if (!g) { g = { title: st.group, note: st.groupNote, along: st.along || [], stops: [] }; groups.push(g); }
      g.stops.push(st);
    });
    var n = 0;
    groups.forEach(function (g, gi) {
      var li = h('li', { className: 'ws-group' }, [h('p', { className: 'ws-group-title', text: g.title }), g.note ? h('p', { className: 'ws-group-note', text: g.note }) : null]);
      // what to read and try alongside this step, so you can follow along
      if (g.along && g.along.length) {
        var al = h('div', { className: 'ws-along' }, [h('span', { className: 'ws-along-k', text: 'Read and try alongside' })]);
        g.along.forEach(function (a) { al.appendChild(h('a', { className: 'ws-along-a', href: a[1], text: a[0] })); });
        li.appendChild(al);
      }
      var ol = h('ol', { className: 'ws-stops' });
      g.stops.forEach(function (st) {
        n++;
        var sc = schema(st.wp), done = st.entries.filter(filled).length, entries = st.entries.length ? st.entries : [null];
        var stop = h('li', { className: 'ws-stop' + (done ? ' is-done' : ''), 'data-stop': st.key });
        stop.style.setProperty('--c', ['#F7CAD4', '#EBDDF6', '#CFE6D2', '#F8E7AE', '#D8E4F4', '#F9D9B8'][(n - 1) % 6]);
        stop.appendChild(h('span', { className: 'ws-dot', 'aria-hidden': 'true' }, [h('span', { text: done ? '♥' : String(n) })]));
        var body = h('div', { className: 'ws-stop-body' }, [
          h('p', { className: 'ws-stop-code', text: st.wp + (done ? ' · ' + done + (done === 1 ? ' sheet filled' : ' sheets filled') : '') }),
          h('h3', { className: 'ws-stop-name', text: SP.nameOf(st.wp) }),
          h('p', { className: 'ws-stop-why', text: st.why }),
          PATHS.read && PATHS.read[st.wp] ? h('a', { className: 'ws-read', href: PATHS.read[st.wp], text: 'Read about ' + st.wp + ' first \u2192' }) : null
        ]);
        var list = h('div', { className: 'ws-sheets' });
        entries.forEach(function (en, i) {
          var a = en ? SP.answers(en) : 0;
          var label = en ? (en.label || SP.labelOf(en, i)) : 'Sheet 1';
          var btn = h('button', { type: 'button', className: 'ws-sheet-btn' + (a ? ' is-filled' : ''), 'data-open': st.key, 'data-entry': en ? en.id : '' }, [
            h('span', { className: 'ws-sheet-label', text: a ? label : (en ? 'Keep going: ' + label : 'Fill it in') }),
            h('span', { className: 'ws-sheet-meta', text: a ? a + (a === 1 ? ' answer' : ' answers') + ' · open' : '✎' })
          ]);
          btn.setAttribute('aria-label', (a ? 'Open ' : 'Fill in ') + st.wp + ' ' + SP.nameOf(st.wp) + (a ? ', ' + label : ''));
          list.appendChild(btn);
        });
        if (st.again && st.entries.some(filled)) list.appendChild(h('button', { type: 'button', className: 'ws-again', 'data-again': st.key, text: '+ ' + st.again }));
        body.appendChild(list);
        stop.appendChild(body);
        ol.appendChild(stop);
        void sc;
      });
      li.appendChild(ol);
      road.appendChild(li);
    });
    // Add a workpaper that isn't on this road
    var have = {};
    S.stops.forEach(function (st) { have[st.wp] = true; });
    var missing = ORDER.filter(function (c) { return !have[c] && schema(c); });
    var add = $('ws-add');
    add.innerHTML = '';
    if (missing.length) {
      add.appendChild(h('span', { className: 'ws-add-label', text: 'Add another workpaper:' }));
      missing.forEach(function (c) { add.appendChild(h('button', { type: 'button', className: 'ws-chip', 'data-add': c, text: c + ' ' + SP.nameOf(c) })); });
    }
    renderProgress();
  }

  // Week by week: this road's own plan, with its workpapers, reading and a small practice
  function renderWeeks(el) {
    el.innerHTML = '';
    (S.path.weeks || []).forEach(function (w, i) {
      var li = h('li', { className: 'ws-week' }, [
        h('p', { className: 'ws-week-k', text: 'Week ' + (i + 1) }),
        h('h3', { className: 'ws-week-h', text: w[0] }),
        w[3] ? h('p', { className: 'ws-week-do', text: w[3] }) : null
      ]);
      if (w[1] && w[1].length) {
        var row = h('div', { className: 'ws-sheets' });
        w[1].forEach(function (code) {
          var st = S.stops.filter(function (x) { return x.wp === code; })[0];
          if (!st) return;
          var done = st.entries.some(filled);
          var b = h('button', { type: 'button', className: 'ws-sheet-btn' + (done ? ' is-filled' : ''), 'data-open': st.key, 'data-entry': st.entries[0] ? st.entries[0].id : '' }, [
            h('span', { className: 'ws-sheet-label', text: code + ' ' + SP.nameOf(code) }), h('span', { className: 'ws-sheet-meta', text: done ? '\u2713' : '\u270E' })]);
          row.appendChild(b);
        });
        li.appendChild(row);
      }
      if (w[2] && w[2].length) {
        var al = h('div', { className: 'ws-along' }, [h('span', { className: 'ws-along-k', text: 'Read and try this week' })]);
        w[2].forEach(function (a) { if (a) al.appendChild(h('a', { className: 'ws-along-a', href: a[1], text: a[0] })); });
        li.appendChild(al);
      }
      el.appendChild(li);
    });
  }

  function renderProgress() {
    var box = $('ws-progress');
    box.innerHTML = '';
    if (!S.path) return;
    var total = S.stops.length, done = S.stops.filter(function (st) { return st.entries.some(filled); }).length;
    var bubbles = h('span', { className: 'ws-bubbles', 'aria-hidden': 'true' });
    for (var i = 0; i < total; i++) bubbles.appendChild(h('span', { className: i < done ? 'is-on' : '' }));
    box.appendChild(bubbles);
    box.appendChild(h('span', { text: done === total ? 'Every stop has a sheet. Lovely work.' : done + ' of ' + total + ' stops started' }));
    $('ws-make').classList.toggle('is-ready', done > 0);
  }

  /* ------------------------------------------------------------ the sheet editor */

  var editing = null, app = null, lastFocus = null;

  function openSheet(stopKey, entryId) {
    var st = S.stops.filter(function (x) { return x.key === stopKey; })[0];
    if (!st) return;
    var en = st.entries.filter(function (x) { return x.id === entryId; })[0];
    if (!en) { en = newEntry(st.wp); st.entries.push(en); }
    var sc = schema(st.wp);
    if (sc.people) applyNames(sc, en.state);
    editing = { stop: st, entry: en, before: SP.answers(en) };
    lastFocus = document.activeElement;
    $('ws-sheet-code').textContent = st.wp + ' · ' + st.group;
    $('ws-sheet-title').textContent = sc.title;
    $('ws-sheet-why').textContent = st.why;
    $('ws-sheet-label').value = en.label || '';
    var root = $('ws-sheet-root');
    // People come from "Who's on this road?", and are named the way this road does.
    app = new WPK.App(root, sc, { state: en.state, statusEl: $('ws-sheet-status'), onChange: onSheetChange, fixedPeople: true, personLabel: roleHeading });
    app.render();
    var sheet = $('ws-sheet');
    sheet.hidden = false;
    document.documentElement.classList.add('ws-locked');
    requestAnimationFrame(function () { sheet.classList.add('is-in'); });
    sheet.querySelector('.ws-sheet-scroll').scrollTop = 0;
    $('ws-sheet-title').focus();
  }

  // A name typed on a sheet becomes that person's name on the road too.
  function onSheetChange(state) {
    changed();
    if (!editing || !schema(editing.entry.workpaper).people) return;
    var touched = false;
    S.names.forEach(function (nm, i) {
      var v = state.values['partner' + WPK.CODES[i]];
      if (v != null && v !== nm) { S.names[i] = v; touched = true; }
    });
    if (touched) {
      S.stops.forEach(function (st) { st.entries.forEach(function (en) { if (en !== editing.entry) { var sc = schema(en.workpaper); if (sc.people) applyNames(sc, en.state); } }); });
      renderNames();
    }
  }

  function closeSheet() {
    if (!editing) return;
    var ed = editing, sheet = $('ws-sheet');
    editing = null;
    sheet.classList.remove('is-in');
    document.documentElement.classList.remove('ws-locked');
    setTimeout(function () { sheet.hidden = true; $('ws-sheet-root').innerHTML = ''; }, reduced ? 0 : 320);
    // An untouched new sheet leaves no trace.
    if (!filled(ed.entry) && !ed.entry.label && ed.stop.entries.length > 1) ed.stop.entries.splice(ed.stop.entries.indexOf(ed.entry), 1);
    renderRoad();
    var now = SP.answers(ed.entry);
    var stopEl = document.querySelector('[data-stop="' + ed.stop.key + '"]');
    if (now > 0 && ed.before === 0) {
      celebrate(stopEl, 'A new heart on your road');
      if (global.TOLGarden) try { global.TOLGarden.gift('workpapers'); } catch (e) {}
    } else if (now > ed.before) say('Saved on this page. ' + now + ' answers on that sheet.');
    var back = stopEl && stopEl.querySelector('[data-entry="' + ed.entry.id + '"]');
    (back || lastFocus || document.body).focus && (back || lastFocus).focus();
  }

  /* ------------------------------------------------------------ little joys */

  function celebrate(anchor, msg) {
    if (msg) say(msg);
    if (!anchor || reduced) return;
    anchor.classList.remove('is-stamp'); void anchor.offsetWidth; anchor.classList.add('is-stamp');
    var r = anchor.getBoundingClientRect(), layer = h('div', { className: 'ws-burst', 'aria-hidden': 'true' });
    layer.style.left = (r.left + 34) + 'px';
    layer.style.top = (r.top + 30) + 'px';
    for (var i = 0; i < 12; i++) {
      var b = h('span', { className: i % 3 ? 'ws-b-bub' : 'ws-b-heart', text: i % 3 ? '' : '♥' });
      var ang = (i / 12) * Math.PI * 2, dist = 46 + (i % 4) * 14;
      b.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
      b.style.setProperty('--dy', Math.round(Math.sin(ang) * dist - 20) + 'px');
      b.style.animationDelay = (i % 4) * 40 + 'ms';
      layer.appendChild(b);
    }
    document.body.appendChild(layer);
    setTimeout(function () { layer.remove(); }, 1500);
  }

  var sayTimer = null;
  function say(msg) {
    var el = $('wpf-status');
    el.textContent = '';
    clearTimeout(sayTimer);
    sayTimer = setTimeout(function () { el.textContent = msg; }, 30);
  }

  /* ------------------------------------------------------------ bringing files in */

  function readText(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = rej;
      r.readAsText(file);
    });
  }

  function takeFiles(files) {
    files = Array.prototype.slice.call(files || []);
    if (!files.length) return;
    var loaded = [], problems = [];
    var jobs = files.map(function (f) {
      if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') {
        return SP.readFilled(f).then(function (entries) {
          if (!entries.length) { problems.push(f.name + " has no fill-in boxes from this site"); return; }
          if (entries.path && !S.path) setPath(entries.path);
          entries.forEach(function (en) { if (SP.answers(en) > 0 || en.label) { place(en); loaded.push(en); } });
          if (!entries.some(function (en) { return SP.answers(en) > 0; })) problems.push(f.name + ' is still blank');
        }, function () { problems.push(f.name + " couldn't be read"); });
      }
      if (f.size > 4 * 1024 * 1024) { problems.push(f.name + ' is too large'); return Promise.resolve(); }
      return readText(f).then(function (txt) {
        var d;
        try { d = JSON.parse(txt); } catch (e) { problems.push(f.name + " isn't a draft or suite file"); return; }
        if (d && d.format === SUITE_FORMAT && Array.isArray(d.entries)) {
          if (d.path && pathById(d.path) && !S.path) setPath(d.path);
          if (Array.isArray(d.names) && !S.names.some(function (x) { return String(x || '').trim(); })) {
            S.names = d.names.slice(0, MAX_PEOPLE).map(function (x) { return String(x || ''); });
            while (S.names.length < MIN_PEOPLE) S.names.push('');
          }
          d.entries.forEach(function (x) {
            var sc = x && schema(x.workpaper);
            if (!sc) return;
            var en = { workpaper: sc.code, label: typeof x.label === 'string' ? x.label.slice(0, 80) : '', state: WPK.sanitize(sc, x.state) };
            place(en); loaded.push(en);
          });
          return;
        }
        if (d && d.format === WPK.DRAFT_FORMAT && d.state && schema(d.workpaper)) {
          var sc2 = schema(d.workpaper), en2 = { workpaper: sc2.code, label: '', state: WPK.sanitize(sc2, d.state) };
          place(en2); loaded.push(en2);
          return;
        }
        problems.push(f.name + " isn't a draft or suite file");
      }, function () { problems.push(f.name + " couldn't be read"); });
    });
    Promise.all(jobs).then(function () {
      if (loaded.length && !S.path) setPath('partners');
      syncAllNames();
      renderNames(); renderRoad();
      if (loaded.length) {
        changed();
        var names = loaded.map(function (en) { return en.workpaper + (en.label ? ' (' + en.label + ')' : ''); });
        var msg = 'Brought in ' + loaded.length + (loaded.length === 1 ? ' sheet: ' : ' sheets: ') + names.slice(0, 6).join(', ') + (names.length > 6 ? '…' : '') + '.';
        say(msg + (problems.length ? ' ' + problems.join('; ') + '.' : ''));
        $('ws-drop-note').textContent = msg;
        celebrate($('ws-drop'), null);
        var first = document.querySelector('.ws-stop.is-done');
        if (first && first.scrollIntoView) first.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      } else say(problems.length ? problems.join('; ') + '.' : 'Nothing to bring in from those files.');
    });
  }

  /* ------------------------------------------------------------ making files */

  function plan() {
    var groups = [];
    S.stops.forEach(function (st) {
      var g = groups.filter(function (x) { return x.title === st.group; })[0];
      if (!g) { g = { title: st.group, note: st.groupNote, along: st.along || [], entries: [] }; groups.push(g); }
      var list = st.entries.length ? st.entries : [newEntry(st.wp)];
      list.forEach(function (en) { g.entries.push({ workpaper: en.workpaper, label: en.label, state: en.state, why: st.why }); });
    });
    return { path: S.path, names: S.names.slice(), people: S.path.people, groups: groups, tip: tip };
  }

  var tip = null; // a little tip for the end of the report, from the site's tips library

  function base() { return 'TOL-Workpaper-Suite-' + (S.path ? S.path.label.replace(/[^A-Za-z0-9]+/g, '-') + '-' : '') + WPK.today(); }

  function makePdf(kind) {
    if (!S.path) { say('Choose your road first, then your PDF is made from it.'); $('ws-paths').querySelector('button').focus(); return; }
    var p = plan();
    if (kind === 'report' && !p.groups.some(function (g) { return g.entries.some(function (en) { return SP.answers(en) > 0; }); })) {
      say('The report is made from what you’ve filled in. Fill in a sheet, or bring in a draft, first. The fillable PDF works any time.');
      return;
    }
    try {
      var bytes = kind === 'report' ? SP.report(p) : SP.fillable(null, { plan: p });
      WPK.download(bytes, base() + (kind === 'report' ? '-report.pdf' : '-fillable.pdf'), 'application/pdf');
      say(kind === 'report' ? 'Your report is in your Downloads. Keep it somewhere private.' : 'Your fillable PDF is in your Downloads. Tap any box to type, or print it. Bring it back here any time.');
      celebrate($(kind === 'report' ? 'ws-report' : 'ws-fillable'), null);
    } catch (err) {
      say('The PDF could not be made. Save a suite file so nothing is lost, then try again.');
      if (global.console) console.error(err);
    }
  }

  // Make sure the road has room for everyone named on any sheet, and every sheet lists everyone.
  function syncAllNames() {
    var most = S.names.length;
    eachPeopleSheet(function (sc, st) { most = Math.max(most, WPK.peopleCount(st.values)); });
    most = Math.min(MAX_PEOPLE, most);
    eachPeopleSheet(function (sc, st) {
      for (var i = 0; i < most; i++) {
        var v = String(st.values['partner' + WPK.CODES[i]] || '');
        if (i >= S.names.length) S.names.push(v);
        else if (!S.names[i].trim() && v.trim()) S.names[i] = v;
      }
    });
    eachPeopleSheet(function (sc, st) { applyNames(sc, st); });
  }

  function saveSuite() {
    if (!S.path) { say('Choose your road first.'); return; }
    var file = snapshot();
    WPK.download(JSON.stringify(file, null, 2), base() + '.json', 'application/json');
    S.dirty = false;
    say('Suite file downloaded. Open it here next time to pick up where you left off.');
  }

  function clearAll() {
    if (!global.confirm('Clear everything on this page? Anything you haven\'t saved as a PDF or suite file will be gone.')) return;
    S = { path: S.path, names: ['', ''], stops: [], dirty: false, view: S.view || 'steps' };
    if (S.path) setPath(S.path.id); else { renderNames(); renderRoad(); }
    if (keep) eraseKept('Cleared, and the draft kept on this device is erased. Nothing you typed remains.');
    else say('Cleared. Nothing you typed remains on the page.');
  }

  /* ------------------------------------------------------------ wiring */

  function boot() {
    if (global.TOLTips) {
      var d = new Date();
      global.TOLTips.get(['connection', 'talking', 'kindness', 'home', 'calm'], function (t) { tip = ['', t[0], t[1]]; }, d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate());
    }
    renderPaths();
    var q = (global.location.search.match(/[?&]road=([a-z]+)/) || [])[1];
    var kept = readKept();
    if (kept) {
      // Pick up the draft kept on this device (the person turned this on earlier)
      keep = true;
      if ($('ws-keep')) $('ws-keep').checked = true;
      if (kept.path && pathById(kept.path)) setPath(kept.path);
      if (Array.isArray(kept.names)) { S.names = kept.names.slice(0, MAX_PEOPLE).map(function (x) { return String(x || ''); }); while (S.names.length < MIN_PEOPLE) S.names.push(''); }
      kept.entries.forEach(function (x) {
        var sc = x && schema(x.workpaper);
        if (!sc) return;
        place({ workpaper: sc.code, label: typeof x.label === 'string' ? x.label.slice(0, 80) : '', state: WPK.sanitize(sc, x.state) });
      });
      syncAllNames();
      renderNames(); renderRoad();
      S.dirty = false;
      say('Picked up the draft kept on this device. Press “Erase” to remove it.');
    } else if (q && pathById(q)) setPath(q); else renderRoad();

    $('ws-names').addEventListener('input', function (e) {
      var i = e.target.getAttribute('data-name');
      if (i != null) setName(+i, e.target.value);
    });
    $('ws-names').addEventListener('click', function (e) {
      var x = e.target.closest('[data-remove-name]');
      if (x) removeName(+x.getAttribute('data-remove-name'));
      if (e.target.closest('#ws-name-add')) addName();
    });
    var keepBox = $('ws-keep');
    if (keepBox) keepBox.addEventListener('change', function () {
      if (keepBox.checked) { keep = true; if (keepNow()) say('Kept on this device. It will be here next time you open this page. Press “Erase” to remove it.'); }
      else eraseKept('Not kept any more. Nothing from your suite is stored on this device.');
    });
    var eraseBtn = $('ws-erase');
    if (eraseBtn) eraseBtn.addEventListener('click', function () { eraseKept(); });

    $('ws-paths').addEventListener('click', function (e) {
      var b = e.target.closest('[data-path]');
      if (!b) return;
      var had = S.path;
      setPath(b.getAttribute('data-path'));
      changed();
      if (!had) setTimeout(function () { var t = $('ws-step-road'); if (t.scrollIntoView) t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }, 60);
      say(S.path.label + ': your road has ' + S.stops.length + ' stops.');
    });
    $('ws-paths').addEventListener('keydown', function (e) {
      if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].indexOf(e.key) < 0) return;
      var bs = Array.prototype.slice.call(this.querySelectorAll('[data-path]')), i = bs.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      bs[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length].focus();
    });

    $('ws-view').addEventListener('click', function (e) {
      var b = e.target.closest('[data-view]'); if (!b) return;
      S.view = b.getAttribute('data-view'); renderRoad();
    });
    $('ws-step-road').addEventListener('click', function (e) {
      var o = e.target.closest('[data-open]'), a = e.target.closest('[data-again]'), add = e.target.closest('[data-add]');
      if (o) openSheet(o.getAttribute('data-open'), o.getAttribute('data-entry'));
      if (a) {
        var st = S.stops.filter(function (x) { return x.key === a.getAttribute('data-again'); })[0];
        var en = newEntry(st.wp);
        st.entries.push(en);
        openSheet(st.key, en.id);
      }
      if (add) { extraStop(add.getAttribute('data-add')); changed(); renderRoad(); say('Added ' + add.getAttribute('data-add') + ' to the end of your road.'); }
    });

    var root = $('ws-sheet-root');
    root.addEventListener('input', function (e) { if (app) app.onInput(e); });
    root.addEventListener('change', function (e) { if (app) app.onInput(e); });
    root.addEventListener('click', function (e) { if (app) app.onClick(e); });
    $('ws-sheet-label').addEventListener('input', function () { if (editing) { editing.entry.label = this.value.slice(0, 80); changed(); } });
    $('ws-sheet-done').addEventListener('click', closeSheet);
    $('ws-sheet-x').addEventListener('click', closeSheet);
    $('ws-sheet-draft').addEventListener('click', function () { if (app) app.saveDraft(); });
    document.addEventListener('keydown', function (e) {
      if (!editing) return;
      if (e.key === 'Escape') closeSheet();
      if (e.key === 'Tab') { // keep focus inside the sheet
        var f = $('ws-sheet').querySelectorAll('button, input, select, textarea, [tabindex="-1"]');
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    var fileInput = $('ws-file'), drop = $('ws-drop');
    $('ws-choose').addEventListener('click', function () { fileInput.click(); });
    $('wpf-open').addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () { takeFiles(fileInput.files); fileInput.value = ''; });
    ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
    ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
    drop.addEventListener('drop', function (e) { takeFiles(e.dataTransfer && e.dataTransfer.files); });

    $('ws-fillable').addEventListener('click', function () { makePdf('fillable'); });
    $('ws-report').addEventListener('click', function () { makePdf('report'); });
    $('wpf-pdf').addEventListener('click', function () { makePdf('fillable'); });
    $('ws-save').addEventListener('click', saveSuite);
    $('wpf-save').addEventListener('click', saveSuite);
    $('wpf-clear').addEventListener('click', clearAll);

    global.addEventListener('beforeunload', function (e) {
      if (keep) keepNow();
      if (!S.dirty) return;
      e.preventDefault();
      e.returnValue = 'You have unsaved entries.';
      return 'You have unsaved entries.';
    });
  }

  global.__workpaperSuite = { state: function () { return S; }, take: takeFiles, plan: function () { return plan(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
