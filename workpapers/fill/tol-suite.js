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
  - The household (/assets/js/household.js): on a shared road with no names yet,
    "Who's on this road?" offers the names kept from another tool, and fills
    only empty places. Ticking "Use these names in the other tools" keeps the
    names (and the jobs and owners from One owner per job) in this browser for
    the other tools, until it is unticked. One owner per job offers the
    household's jobs when it is opened with none of your own on it.
  - "Who's on this road?" holds 2 to 8 people. Every worksheet's person
    drop-downs list all of them. The "Just me" road (self) holds one: your own
    name, with every sheet worded for you alone.
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

  var S = { path: null, variant: null, names: ['', ''], stops: [], dirty: false, view: 'steps' };
  var uid = 0, keep = false, keepTimer = null;

  // "Just me" is one person, on their own. Every other road has at least two.
  function isSolo() { return !!S.path && S.path.id === 'self'; }
  function minPeople() { return isSolo() ? 1 : MIN_PEOPLE; }
  // Fit the names to the road: "Just me" keeps only the first, and the others it set aside come back
  // when you switch to a road with more people on it.
  function fitNames() {
    if (isSolo()) {
      if (S.names.length > 1) S.away = S.names.slice(1);
      S.names = S.names.slice(0, 1);
      if (!S.names.length) S.names = [''];
    } else {
      if (S.names.length < MIN_PEOPLE && S.away) S.names = S.names.concat(S.away).slice(0, MAX_PEOPLE);
      S.away = null;
      while (S.names.length < MIN_PEOPLE) S.names.push('');
    }
  }

  // What to call person i on this road when they have no name yet ("You", "Teammate", "Teammate 2" …)
  function roleLabel(i) { return SP.roleOf(S.path ? S.path.people : null, i); }
  function roleHeading(i) { var r = roleLabel(i); return r === 'You' ? 'Your name' : r; }
  WPK.setDefaultLabels(function (i) { return roleLabel(i); });

  // Put everyone on the road onto a sheet that has people on it.
  function applyNames(sc, st) {
    if (sc.people) {
      var n = WPK.peopleCount(st.values);
      // A sheet brought over to "Just me" with someone else's answers on it keeps them.
      if (isSolo() && n > 1 && WPK.answered(sc, st) > 0) {
        st.values.partnerA = S.names[0];
        WPK.syncPeople(sc, st);
        return;
      }
      S.names.forEach(function (nm, i) { st.values['partner' + WPK.CODES[i]] = nm; });
      for (var k = S.names.length; k < n; k++) delete st.values['partner' + WPK.CODES[k]];
      st.values.peopleCount = S.names.length;
      // a sheet that had more people than the road now does: take the extra ones off
      while (WPK.peopleCount(st.values) > S.names.length) WPK.removePerson(sc, st, WPK.peopleCount(st.values) - 1);
      WPK.syncPeople(sc, st);
    }
  }
  // A sheet started on one road can be opened on another, where its version may have more parts
  // (WP-01 on "Just me" is only the kind ways to say no): give it the parts it hasn't got yet.
  function fitState(sc, st) {
    var blank = WPK.blankState(sc);
    Object.keys(blank.tables).forEach(function (k) { if (!Array.isArray(st.tables[k])) st.tables[k] = blank.tables[k]; });
    return st;
  }
  // A clean copy of a saved sheet that keeps every part of it, even ones this road's version doesn't show.
  function clean(sc, raw) {
    var st = WPK.sanitize(sc, raw), base = SP.schemaFor(sc.code, null);
    if (base && base !== sc) {
      var all = WPK.sanitize(base, raw);
      Object.keys(all.tables).forEach(function (k) { if (!st.tables[k]) st.tables[k] = all.tables[k]; });
    }
    return st;
  }
  // A new sheet. On a shared road, a sheet that belongs to one person (their battery, their kit)
  // carries that person's name; other one-person sheets start with no name rather than borrowing one.
  function newEntry(code, label, person) {
    var sc = schema(code), st = WPK.blankState(sc);
    if (sc.people) applyNames(sc, st);
    else if (sc.meta && sc.meta.some(function (m) { return m.id === 'name'; })) st.values.name = person != null ? (S.names[person] || '') : isSolo() ? S.names[0] : '';
    if (code === 'WP-02' && !isSolo()) st.values.roadPeople = adults().length;
    var en = { id: 'e' + (++uid), workpaper: code, label: label || '', state: st };
    if (person != null) en.person = person;
    return en;
  }
  function filled(en) { return SP.answers(en) > 0; }
  // WP-02 and WP-11 are filled in by each person about themselves: on a shared road, one set per person.
  function perPerson(code) { var sc = schema(code); return !isSolo() && !!(sc && sc.perPerson); }
  function personOf(en) {
    if (typeof en.person === 'number' && en.person >= 0 && en.person < S.names.length) return en.person;
    var nm = SP.fold(en.state && en.state.values && en.state.values.name);
    if (!nm) return null;
    for (var i = 0; i < S.names.length; i++) if (SP.fold(S.names[i]) === nm || SP.fold(roleLabel(i)) === nm) return i;
    return null;
  }
  function whoLabel(i) { return String(S.names[i] || '').trim() || roleLabel(i); }
  // Children on the road (Family, Co-parents): the sheets about yourself (load scores, calm-down kits)
  // and the shared average wait only for the adults. "Never ask a child to keep track of what a parent does."
  var KID_ROADS = { family: true, coparents: true };
  function kidsOn() { return !!S.path && !!KID_ROADS[S.path.id]; }
  function isChild(i) { return kidsOn() && !!(S.kids && S.kids[i]); }
  function adults() { return S.names.map(function (_, i) { return i; }).filter(function (i) { return !isChild(i); }); }
  function kidsFit() {
    S.kids = (S.kids || []).slice(0, S.names.length);
    // co-parents: the first two are the parents; anyone added after them starts out as a child
    while (S.kids.length < S.names.length) S.kids.push(!!S.path && S.path.id === 'coparents' && S.kids.length >= 2);
  }
  // How many people are on the road goes onto every battery sheet, so its shared average waits for everyone.
  function syncRoadPeople() {
    kidsFit();
    S.stops.forEach(function (st) { st.entries.forEach(function (en) { if (en.workpaper === 'WP-02') { if (isSolo()) delete en.state.values.roadPeople; else en.state.values.roadPeople = adults().length; } }); });
  }
  // The same sheet brought in twice is only kept once.
  function sig(en) { return en.workpaper + '|' + (en.label || '') + '|' + JSON.stringify(en.state.values) + '|' + JSON.stringify(en.state.tables); }

  // Lay out the stops for a road, carrying over any sheets already filled in.
  // variant: the road's other way in ("flat" on Partners), or nothing for the road as it is.
  function setPath(id, variant) {
    var p = pathById(id);
    if (!p) return;
    if (PATHS.variant) p = PATHS.variant(p, variant);
    S.variant = p.variant || null;
    // (what counts as filled in is read on the road the sheet was filled in on)
    var pool = {};
    S.stops.forEach(function (st) { st.entries.forEach(function (en) { if (filled(en) || en.label) (pool[en.workpaper] = pool[en.workpaper] || []).push(en); }); });
    SP.setRoad(p.id, p.sheetRoad || null);
    S.path = p;
    WPK.setMinPeople(minPeople());
    fitNames();
    S.stops = [];
    p.groups.forEach(function (g, gi) {
      g.stops.forEach(function (s, si) {
        S.stops.push({ key: gi + '-' + si, wp: s.wp, why: s.why, again: s.again, optional: !!s.optional, group: g.title, groupNote: g.note, along: g.along || [], reads: g.reads || [], gi: gi, entries: [] });
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

  // A sheet made on someone else's device may list the same people in another order (there, A = Jordan
  // and B = Maya; here, A = Maya). Match people by name, so Jordan's answers stay Jordan's. map[i] = the
  // place on this road for the sheet's person i.
  function nameMap(sc, st) {
    if (!sc.people) return null;
    var here = S.names.map(function (x) { return SP.fold(x); }), n = WPK.peopleCount(st.values);
    if (!here.some(Boolean)) return null;
    var there = WPK.CODES.slice(0, n).map(function (c) { return SP.fold(st.values['partner' + c]); });
    if (!there.some(Boolean)) return null;
    var map = [], used = {}, unknown = [];
    there.forEach(function (nm, i) { var j = nm ? here.indexOf(nm) : -1; if (j >= 0 && !used[j]) { map[i] = j; used[j] = 1; } else if (nm) unknown.push(i); });
    // the rest keep their own place when it is free, or take the next free one
    there.forEach(function (nm, i) { if (map[i] != null) return; var j = !used[i] ? i : -1; for (var k = 0; j < 0 && k < WPK.MAX_PEOPLE; k++) if (!used[k]) j = k; map[i] = j; used[j] = 1; });
    var moved = map.some(function (j, i) { return j !== i; });
    // names that don't match anyone here, sitting where someone else's name is: worth asking
    var clash = unknown.filter(function (i) { return here[i] && here[i] !== there[i]; });
    return { map: map, moved: moved, clash: clash, there: WPK.CODES.slice(0, n).map(function (c) { return String(st.values['partner' + c] || '').trim(); }) };
  }
  // Move every person's answers on a sheet to their new place (names, person boxes, per-person rows).
  function remapSheet(sc, st, map) {
    var n = WPK.peopleCount(st.values), most = Math.max(n, Math.max.apply(null, map.concat([0])) + 1);
    var names = {}; WPK.CODES.slice(0, n).forEach(function (c, i) { names[WPK.CODES[map[i]]] = st.values['partner' + c] || ''; });
    WPK.CODES.slice(0, most).forEach(function (c) { st.values['partner' + c] = names[c] || ''; });
    st.values.peopleCount = most;
    function code(v) { var i = WPK.CODES.indexOf(v); return i >= 0 && i < map.length && map[i] != null ? WPK.CODES[map[i]] : v; }
    sc.sections.forEach(function (s) {
      if (s.type !== 'table') return;
      var rows = st.tables[s.id] || [];
      var cols = s.columns.filter(function (c) { return c.type === 'person'; });
      rows.forEach(function (r) { if (r) cols.forEach(function (c) { if (r[c.id]) r[c.id] = code(r[c.id]); }); });
      if (s.fixedRows && s.fixedRows[0] === '@A' && s.fixedRows[1] === '@B') {
        var out = []; rows.forEach(function (r, i) { if (i < map.length) out[map[i]] = r; });
        for (var k = 0; k < out.length; k++) if (!out[k]) out[k] = {};
        st.tables[s.id] = out;
      }
    });
    WPK.syncPeople(sc, st);
  }
  var nameAsks = [];

  // Put a sheet that came from a file onto the road. Returns false when that exact sheet is already there.
  function place(en) {
    var s0 = sig(en);
    if (S.stops.some(function (st) { return st.entries.some(function (x) { return sig(x) === s0; }); })) return false;
    var sc0 = schema(en.workpaper), nm0 = nameMap(sc0, en.state);
    if (nm0 && nm0.clash.length) nameAsks.push({ en: en, info: nm0 });
    else if (nm0 && nm0.moved) { remapSheet(sc0, en.state, nm0.map); en.matched = true; }
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
    if (en.person == null && perPerson(en.workpaper)) { var p = personOf(en); if (p != null) en.person = p; }
    return true;
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
    renderFocus();
  }

  // "What brings you here?" on a road that has another way in (Partners: unfair, or fine but flat).
  // It changes the order, the first stops and which sheets are optional; the sheets themselves stay.
  function renderFocus() {
    var box = $('ws-focus');
    if (!box) {
      var paths = $('ws-paths');
      if (!paths) return;
      box = h('div', { className: 'ws-focus', id: 'ws-focus', hidden: true });
      paths.parentNode.insertBefore(box, paths.nextSibling);
    }
    var base = S.path ? (S.path.base || S.path) : null;
    box.innerHTML = '';
    if (!base || !base.variants) { box.hidden = true; return; }
    box.hidden = false;
    var qid = 'ws-focus-q';
    box.appendChild(h('p', { className: 'ws-focus-q', id: qid, text: base.ask || 'What brings you here?' }));
    var row = h('div', { className: 'ws-focus-row', role: 'radiogroup', 'aria-labelledby': qid });
    var choices = [['', base.main || { label: base.label }]].concat(Object.keys(base.variants).map(function (k) { return [k, base.variants[k]]; }));
    choices.forEach(function (c) {
      var on = (S.variant || '') === c[0];
      row.appendChild(h('button', { type: 'button', className: 'ws-focus-b' + (on ? ' is-on' : ''), role: 'radio', 'aria-checked': on ? 'true' : 'false', tabindex: on ? '0' : '-1', 'data-focus': c[0] }, [
        h('span', { className: 'ws-focus-t', text: c[1].label })
      ]));
    });
    box.appendChild(row);
    var cur = choices.filter(function (c) { return (S.variant || '') === c[0]; })[0];
    if (cur && cur[1].note) box.appendChild(h('p', { className: 'ws-focus-note', text: cur[1].note }));
    // Two or more people may not answer this the same way: one answer each, if you like.
    if (isSolo() || S.names.length < 2) return;
    var each = Array.isArray(S.focusEach) ? S.focusEach : null;
    if (!each) { box.appendChild(h('p', { className: 'ws-focus-more' }, [h('button', { type: 'button', className: 'ws-link', 'data-focus-each': 'on', text: 'We\u2019d answer this differently' })])); return; }
    var grid = h('div', { className: 'ws-focus-each', role: 'group', 'aria-label': 'One answer each' });
    S.names.forEach(function (nm, i) {
      var id = 'ws-focus-p' + i, sel = h('select', { id: id, 'data-focus-person': String(i) });
      sel.appendChild(h('option', { value: '', text: '\u2014', selected: each[i] == null ? 'selected' : null }));
      choices.forEach(function (c) { sel.appendChild(h('option', { value: c[0] || 'main', text: c[1].label, selected: each[i] === (c[0] || 'main') ? 'selected' : null })); });
      grid.appendChild(h('label', { className: 'ws-focus-p', for: id }, [h('span', { text: whoLabel(i) }), sel]));
    });
    box.appendChild(grid);
    var picked = each.filter(function (x) { return x; });
    var differ = picked.length >= 2 && picked.some(function (x) { return x !== picked[0]; });
    box.appendChild(h('p', { className: 'ws-focus-note', text: differ ? 'You answered differently, and that is useful to know. Your road follows the main order so it fits everyone; start by talking about why each of you picked your answer.' : 'Each of you can pick your own answer. When you agree, your road follows it.' }));
    box.appendChild(h('p', { className: 'ws-focus-more' }, [h('button', { type: 'button', className: 'ws-link', 'data-focus-each': 'off', text: 'Back to one answer for us both' })]));
  }

  var namesQ = null, namesNote = null, reportAbout = null; // the page's own words, for the roads with more people
  function renderNames() {
    var p = S.path, wrap = $('ws-names');
    if (!p) { wrap.hidden = true; return; }
    wrap.hidden = false;
    var solo = isSolo(), q = $('ws-names-q'), note = $('ws-names-note'), about = $('ws-report-about');
    if (q) {
      if (namesQ == null) namesQ = q.innerHTML;
      if (solo) { q.textContent = 'Who\u2019s this for? '; q.appendChild(h('span', { text: '(optional, a first name or initial)' })); } else q.innerHTML = namesQ;
    }
    if (note) {
      if (namesNote == null) namesNote = note.textContent;
      note.textContent = solo ? 'This road is just for you.' : namesNote;
    }
    if (about) {
      if (reportAbout == null) reportAbout = about.textContent;
      about.textContent = solo ? 'Just what you\u2019ve written, told for your road: where things stand, a question to ask yourself for each sheet, how to read it, what to look for, questions to sit with, your weeks on this road, and the kind words worth keeping close.' : reportAbout;
    }
    $('ws-name-add').parentNode.hidden = solo;
    var row = $('ws-names-row');
    row.innerHTML = '';
    S.names.forEach(function (nm, i) {
      var inp = h('input', { type: 'text', id: 'ws-name-' + i, autocomplete: 'off', maxlength: '40', 'data-name': String(i) });
      inp.value = nm;
      var lab = h('label', { className: 'ws-name', for: 'ws-name-' + i }, [h('span', { text: roleHeading(i) }), inp]);
      var cell = h('div', { className: 'ws-name-cell' }, [lab]);
      if (kidsOn()) {
        kidsFit();
        var kb = h('input', { type: 'checkbox', id: 'ws-kid-' + i, 'data-kid': String(i), autocomplete: 'off' });
        kb.checked = !!S.kids[i];
        cell.appendChild(h('label', { className: 'ws-kid', for: 'ws-kid-' + i, title: 'Children aren\u2019t asked to fill in a load score or a calm-down kit, and the shared numbers don\u2019t wait for them.' }, [kb, ' Child']));
      }
      if (S.names.length > minPeople()) {
        cell.appendChild(h('button', { type: 'button', className: 'ws-name-x', 'data-remove-name': String(i), 'aria-label': 'Take ' + (nm.trim() || roleLabel(i)) + ' off this road', text: '×' }));
      }
      row.appendChild(cell);
    });
    $('ws-name-add').hidden = S.names.length >= MAX_PEOPLE;
    $('ws-names-count').textContent = S.names.length + ' people · up to ' + MAX_PEOPLE;
    $('ws-care').textContent = p.care;
    hhRefresh();
    refreshDynamic();
  }

  /* ------------------------------------------------------------ the household, typed once (household.js) */

  var HH = global.TOLHousehold, hhHost = null, hhOffer = null, hhKeep = null, hhNo = false, hhWrite = null;
  function hhNamesEmpty() { return S.names.every(function (n) { return !String(n || '').trim() || HH.isPlaceholder(n); }); }
  // The road's names, and the jobs (with owners) written on One owner per job
  function hhCollect() {
    var jobs = [], seen = {};
    S.stops.forEach(function (st) {
      st.entries.forEach(function (en) {
        var sc = schema(en.workpaper), sec = sc && sc.sections.filter(function (x) { return x.type === 'table' && x.library === 'owner'; })[0];
        if (!sec) return;
        (en.state.tables[sec.id] || []).forEach(function (r) {
          if (!r || !r.task || WPK.rowIsEmpty(sec, r) || WPK.isExampleRow(sec, r)) return;
          var name = String(r.task).trim(), k = name.toLowerCase(), ci = WPK.CODES.indexOf(r.r);
          if (!name || seen[k]) return;
          seen[k] = 1;
          jobs.push({ name: name, owner: ci >= 0 ? String(S.names[ci] || '').trim() : '' });
        });
      });
    });
    var out = { people: S.names.slice() };
    if (jobs.length) out.jobs = jobs;
    return out;
  }
  // Names go only into empty places, never over a typed one; extra people are added to the road.
  function hhUse() {
    var hh = HH.get(), added = 0;
    if (!hh) return '';
    hh.people.forEach(function (nm) {
      if (S.names.some(function (n) { return String(n || '').trim().toLowerCase() === nm.toLowerCase(); })) return;
      var slot = -1;
      S.names.forEach(function (n, i) { if (slot < 0 && (!String(n || '').trim() || HH.isPlaceholder(n))) slot = i; });
      if (slot < 0) {
        if (S.names.length >= MAX_PEOPLE) return;
        S.names.push('');
        eachPeopleSheet(function (sc, st) { while (WPK.peopleCount(st.values) < S.names.length && WPK.addPerson(sc, st)) { /* keep in step with the road */ } });
        slot = S.names.length - 1;
      }
      setName(slot, nm);
      added++;
    });
    syncRoadPeople();
    changed();
    renderNames(); renderRoad();
    return HH.addedLine(added, 0) + (hh.jobs.length ? ' Its jobs are offered when you open One owner per job.' : '');
  }
  function hhRefresh() {
    if (!HH || !hhHost) return;
    var shared = !!S.path && !isSolo();
    hhHost.hidden = !shared;
    if (hhKeep) { hhKeep.hidden = !shared; hhKeep.sync(); }
    var hh = HH.get(), want = shared && !hhNo && !!hh && hh.people.length > 0 && hhNamesEmpty();
    if (want && !hhOffer) {
      hhOffer = HH.offer({ names: hh.people, onUse: hhUse, onNo: function () { hhNo = true; }, focus: function () { return $('ws-name-0'); } });
      hhHost.appendChild(hhOffer);
    } else if (!want && hhOffer && !hhOffer.querySelector('.tol-hh-offer').hidden) {
      hhOffer.remove(); hhOffer = null;
    }
  }
  function hhSetup() {
    if (!HH) return;
    var wrap = $('ws-names'), q = $('ws-names-q');
    if (!wrap) return;
    hhHost = h('div', { className: 'ws-hh' });
    if (q && q.parentNode === wrap) wrap.insertBefore(hhHost, q.nextSibling); else wrap.insertBefore(hhHost, wrap.firstChild);
    hhWrite = HH.writer('suite', hhCollect);
    hhKeep = HH.remember({ tool: 'suite', write: hhWrite });
    wrap.appendChild(hhKeep);
    HH.onChange(function () { if (hhKeep) hhKeep.sync(); });
  }

  // A person added and never named, with nothing on any sheet, is taken off before anything is made,
  // so no one who isn't there turns up in a PDF as "Roommate 4".
  function pruneNames() {
    var gone = 0;
    while (!isSolo() && S.names.length > minPeople()) {
      var i = S.names.length - 1, code = WPK.CODES[i];
      if (String(S.names[i] || '').trim()) break;
      var used = false;
      S.stops.forEach(function (st) {
        st.entries.forEach(function (en) {
          if (en.person === i && filled(en)) used = true;
          var sc = schema(en.workpaper);
          if (sc && sc.people) sc.sections.forEach(function (s) {
            if (s.type !== 'table') return;
            (en.state.tables[s.id] || []).forEach(function (r, ri) {
              if (s.columns.some(function (c) { return c.type === 'person' && !c.prefill && r[c.id] === code; })) used = true;
              if (s.personDays && r.who === code && !WPK.rowIsEmpty(s, r)) used = true;
              if (s.fixedRows && WPK.fixedRowsFor(s, en.state)[ri] === '@' + code && !WPK.rowIsEmpty(s, r)) used = true;
            });
          });
        });
      });
      if (used) break;
      S.names.pop();
      eachPeopleSheet(function (sc, st) { if (WPK.peopleCount(st.values) > S.names.length) WPK.removePerson(sc, st, WPK.peopleCount(st.values) - 1); });
      gone++;
    }
    if (gone) { syncRoadPeople(); renderNames(); renderRoad(); }
    return gone;
  }

  function eachPeopleSheet(fn) {
    S.stops.forEach(function (st) {
      st.entries.forEach(function (en) { var sc = schema(en.workpaper); if (sc && sc.people) fn(sc, en.state, en); });
    });
  }

  function setNameQuiet(i, v) { S.names[i] = v; renderNames(); }
  function setName(i, v) {
    var old = S.names[i];
    S.names[i] = v;
    var k = 'partner' + WPK.CODES[i];
    S.stops.forEach(function (st) {
      st.entries.forEach(function (en) {
        var vals = en.state.values, sc = schema(en.workpaper);
        if (sc.people && (vals[k] || '') === old) vals[k] = v;
        else if (!sc.people && en.person === i) vals.name = v;
        else if (!sc.people && i === 0 && isSolo() && vals.hasOwnProperty('name') && (vals.name || '') === old) vals.name = v;
      });
    });
    changed();
  }

  function addName() {
    if (isSolo() || S.names.length >= MAX_PEOPLE) return;
    S.names.push('');
    eachPeopleSheet(function (sc, st) {
      while (WPK.peopleCount(st.values) < S.names.length && WPK.addPerson(sc, st)) { /* keep in step with the road */ }
    });
    syncRoadPeople();
    changed();
    renderNames(); renderRoad();
    var inp = $('ws-name-' + (S.names.length - 1));
    if (inp) inp.focus();
    say('Added a person. ' + S.names.length + ' people on this road.');
  }

  function removeName(i) {
    if (S.names.length <= minPeople()) return;
    var who = S.names[i].trim() || roleLabel(i);
    if (!global.confirm('Take ' + who + ' off this road? On every sheet, the jobs they own go back to "—".')) return;
    S.names.splice(i, 1);
    kidsFit(); S.kids.splice(i, 1);
    eachPeopleSheet(function (sc, st) { if (WPK.peopleCount(st.values) > i) WPK.removePerson(sc, st, i); });
    S.stops.forEach(function (st) { st.entries.forEach(function (en) { if (typeof en.person === 'number') { if (en.person === i) delete en.person; else if (en.person > i) en.person--; } }); });
    syncRoadPeople();
    changed();
    renderNames(); renderRoad();
    var add = $('ws-name-add');
    if (add && !add.hidden) add.focus();
    say(who + ' is off this road.');
  }

  /* ------------------------------------------------------------ the Lemonade Stand, brought in (step 1) */
  // A Lemonade Stand code ("LEMON1:" and a base64 JSON, from "Send my side" on /lemonade-stand.html), or the
  // stand kept on this device (only when someone ticked "Keep this on my device" there). It prefills the
  // names, a week of Who did what from the hours, and One owner per job from the jobs and their owners.
  // Nothing is sent anywhere; the code is read here, on this page.
  var LEMON_KEEP = 'tol-lemonade-stand-v2';
  var LEMON_FREQ = { day: 7, few: 3, week: 1, eow: 0.5, month: 12 / 52 };
  var LEMON_OFTEN = { day: 'Daily', few: 'Weekly', week: 'Weekly', eow: 'Weekly', month: 'Monthly' };
  function lemonB64(s) {
    var bin = atob(String(s || '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/'));
    try { var a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new TextDecoder().decode(a); }
    catch (e) { return decodeURIComponent(escape(bin)); }
  }
  function lemonNum(x) { var n = parseFloat(x); return isFinite(n) && n > 0 ? n : 0; }
  function lemonReal(n) { n = String(n || '').trim(); return n && !/^(me|them|you|person [a-h1-8])$/i.test(n) ? n : ''; }
  // { people: [names], jobs: [{ n, f, u, v: { name: amount }, t: { name: minutes } }], own: [{ n, w }], by }
  function lemonFromCode(text) {
    var m = /LEMON1:\s*([A-Za-z0-9+\/=_-]+)/i.exec(String(text || '')), raw = null;
    if (!m) return null;
    try { raw = JSON.parse(lemonB64(m[1])); } catch (e) { return null; }
    if (!raw || raw.app !== 'lemonade' || !Array.isArray(raw.people)) return null;
    var people = raw.people.map(lemonReal).filter(Boolean).slice(0, MAX_PEOPLE);
    function obj(o) { var out = {}; if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { var v = lemonNum(o[k]); if (v) out[String(k).trim()] = v; }); return out; }
    var jobs = (Array.isArray(raw.jobs) ? raw.jobs : []).slice(0, 200).filter(function (j) { return j && typeof j === 'object' && !j.p; }).map(function (j) {
      return { n: String(j.n || '').replace(/\s+/g, ' ').trim().slice(0, 120), f: LEMON_FREQ[j.f] ? j.f : 'week', u: j.u === 'h' ? 'h' : 'm', v: obj(j.v), t: obj(j.t) };
    }).filter(function (j) { return j.n; });
    var own = (Array.isArray(raw.own) ? raw.own : []).slice(0, 40).filter(function (o) { return o && o.n; }).map(function (o) { return { n: String(o.n).trim().slice(0, 120), w: String(o.w || '').trim() }; });
    return people.length ? { people: people, jobs: jobs, own: own, by: lemonReal(raw.by) } : null;
  }
  function lemonKept() {
    var st = null;
    try { st = JSON.parse(global.localStorage.getItem(LEMON_KEEP) || 'null'); } catch (e) { st = null; }
    if (!st || st.example || !Array.isArray(st.people)) return null;
    var people = st.people.map(lemonReal);
    if (!people.some(Boolean)) return null;
    var jobs = (Array.isArray(st.jobs) ? st.jobs : []).filter(function (j) { return j && !j.ex && !j.personal && String(j.name || '').trim(); }).map(function (j) {
      var v = {}, t = {};
      people.forEach(function (p, i) { if (!p) return; var a = lemonNum((j.v || [])[i]), b = lemonNum((j.t || [])[i]); if (a) v[p] = a; if (b) t[p] = b; });
      return { n: String(j.name).trim().slice(0, 120), f: LEMON_FREQ[j.freq] ? j.freq : 'week', u: j.unit === 'h' ? 'h' : 'm', v: v, t: t };
    });
    var own = (Array.isArray(st.owners) ? st.owners : []).filter(function (o) { return o && String(o.name || '').trim(); }).map(function (o) { return { n: String(o.name).trim(), w: o.who >= 0 ? people[o.who] || '' : '' }; });
    return { people: people.filter(Boolean), jobs: jobs, own: own, by: '' };
  }
  function lemonBring(d, from) {
    if (!S.path) return 'Choose your road first, then bring in your stand.';
    var here = function () { return S.names.map(function (x) { return SP.fold(x); }); }, added = [];
    // names: matched by name; someone new goes into an empty place, or is added to the road
    d.people.forEach(function (p) {
      if (here().indexOf(SP.fold(p)) >= 0) return;
      var slot = S.names.findIndex ? S.names.findIndex(function (x) { return !String(x || '').trim(); }) : -1;
      if (slot >= 0) setName(slot, p);
      else if (!isSolo() && S.names.length < MAX_PEOPLE) { addName(); setName(S.names.length - 1, p); }
      else return;
      added.push(p);
    });
    function codeOf(name) { var i = here().indexOf(SP.fold(name)); return i >= 0 ? WPK.CODES[i] : ''; }
    var made = [];
    // a week of Who did what, from each person's hours
    var rows = [];
    d.jobs.forEach(function (j) {
      Object.keys(j.v).forEach(function (who) {
        var c = codeOf(who); if (!c) return;
        var mins = j.v[who] * (j.u === 'h' ? 60 : 1) * LEMON_FREQ[j.f];
        if (mins >= 1) rows.push({ task: j.n, who: c, minutes: String(Math.round(mins)) });
      });
      Object.keys(j.t).forEach(function (who) {
        var c = codeOf(who); if (!c) return;
        var mins = j.t[who] * LEMON_FREQ[j.f];
        if (mins >= 1) rows.push({ task: j.n + ' (noticing and planning)', who: c, minutes: String(Math.round(mins)), how: 'Noticed and handled' });
      });
    });
    if (rows.length && S.stops.some(function (st) { return st.wp === 'WP-01'; }) && !isSolo()) {
      var e1 = newEntry('WP-01'); e1.state.tables.audit = rows; e1.from = from; if (place(e1)) made.push('Who did what (' + rows.length + ' rows for one week)');
    }
    // One owner per job: every job from the stand, with its owner when the stand has one
    var owner = {}; d.own.forEach(function (o) { if (o.w) owner[o.n.toLowerCase()] = o.w; });
    var seen = {}, jobs = [];
    d.jobs.concat(d.own.map(function (o) { return { n: o.n, f: 'week' }; })).forEach(function (j) {
      var k = j.n.toLowerCase(); if (seen[k]) return; seen[k] = 1;
      var r = { task: j.n, freq: LEMON_OFTEN[j.f] || 'Weekly' }, c = owner[k] ? codeOf(owner[k]) : '';
      if (c) r.r = c;
      jobs.push(r);
    });
    if (jobs.length && S.stops.some(function (st) { return st.wp === 'WP-03'; })) {
      var e3 = newEntry('WP-03'); e3.state.tables.treaty = jobs; e3.from = from; if (place(e3)) made.push('One owner per job (' + jobs.length + ' jobs, ' + jobs.filter(function (r) { return r.r; }).length + ' with an owner)');
    }
    syncAllNames(); syncRoadPeople(); renderNames(); renderRoad(); changed();
    if (!made.length && !added.length) return 'Nothing new to bring in: those names and jobs are already on your road.';
    return 'Brought in from your Lemonade Stand: ' + (added.length ? 'the names ' + andList(added) + (made.length ? '; ' : '.') : '') + (made.length ? made.join('; ') + '.' : '') + ' Check them, then change anything on the sheets.';
  }
  function lemonRender() {
    var host = $('ws-lemon'); if (!host) return;
    var kb = $('ws-lemon-kept'); if (kb) kb.hidden = !lemonKept();
  }

  /* ------------------------------------------------------------ keep a draft on this device (opt-in) */

  // Whose file this is, when the sheets show it: the one person whose own sheets (a load score, a kit)
  // were filled in on this device rather than brought in. Used only for "from Diego's file" in the report.
  function deviceOwner() {
    var mine = {};
    S.stops.forEach(function (st) { st.entries.forEach(function (en) { if (!en.from && filled(en) && perPerson(en.workpaper)) { var p = personOf(en); if (p != null) mine[p] = 1; } }); });
    var k = Object.keys(mine);
    return k.length === 1 ? String(S.names[+k[0]] || '').trim() : '';
  }
  // A copy of a sheet for a file that may be passed on: a private answer ("Raw reaction" on Say it so it
  // lands, "Optional, and just for you") stays out unless its own "Include …" box is ticked.
  function shareable(en) {
    var sc = schema(en.workpaper), st = en.state, out = null;
    (sc && sc.sections || []).forEach(function (sec) {
      (sec.fields || []).forEach(function (f) {
        if (!f.privateOptIn || st.values[f.id + '__include'] || WPK.isBlank(st.values[f.id])) return;
        if (!out) out = JSON.parse(JSON.stringify(st));
        delete out.values[f.id];
      });
    });
    return out || st;
  }
  function snapshot(forFile) {
    var entries = [];
    S.stops.forEach(function (st) { st.entries.forEach(function (en) { if (filled(en) || en.label) entries.push({ workpaper: en.workpaper, label: en.label, stop: st.key, person: typeof en.person === 'number' ? en.person : undefined, from: en.from || undefined, state: forFile ? shareable(en) : en.state }); }); });
    var out = { format: SUITE_FORMAT, version: 1, path: S.path ? S.path.id : null, names: S.names.slice(), saved: new Date().toISOString(), entries: entries };
    var by = deviceOwner(); if (by) out.by = by;
    if (kidsOn()) { kidsFit(); if (S.kids.some(Boolean)) out.kids = S.kids.slice(); }
    if (S.variant) out.variant = S.variant;
    if (Array.isArray(S.focusEach)) out.focusEach = S.focusEach.slice(0, MAX_PEOPLE);
    return out;
  }
  function changed() {
    S.dirty = true;
    refreshDynamic();
    if (hhWrite) hhWrite.soon();
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
    var note = $('ws-erase-note');
    if (note) { note.textContent = ''; setTimeout(function () { note.textContent = 'Erased from this device.'; }, 30); }
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
      if (!g) { g = { title: st.group, note: st.groupNote, along: st.along || [], reads: st.reads || [], stops: [] }; groups.push(g); }
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
      // pages to read or try first, before any sheet (a road's variant can start this way)
      (g.reads || []).forEach(function (r) {
        n++;
        var rd = h('li', { className: 'ws-stop is-reading' });
        rd.style.setProperty('--c', ['#F7CAD4', '#EBDDF6', '#CFE6D2', '#F8E7AE', '#D8E4F4', '#F9D9B8'][(n - 1) % 6]);
        rd.appendChild(h('span', { className: 'ws-dot', 'aria-hidden': 'true' }, [h('span', { text: String(n) })]));
        rd.appendChild(h('div', { className: 'ws-stop-body' }, [
          h('p', { className: 'ws-stop-code', text: 'Read or try' }),
          h('h3', { className: 'ws-stop-name', text: r[0] }),
          r[2] ? h('p', { className: 'ws-stop-why', text: r[2] }) : null,
          h('a', { className: 'ws-read', href: r[1], text: 'Open ' + r[0] + ' \u2192' })
        ]));
        ol.appendChild(rd);
      });
      g.stops.forEach(function (st) {
        n++;
        var sc = schema(st.wp), done = st.entries.filter(filled).length, entries = st.entries.length ? st.entries : [null];
        var stop = h('li', { className: 'ws-stop' + (done ? ' is-done' : ''), 'data-stop': st.key });
        stop.style.setProperty('--c', ['#F7CAD4', '#EBDDF6', '#CFE6D2', '#F8E7AE', '#D8E4F4', '#F9D9B8'][(n - 1) % 6]);
        stop.appendChild(h('span', { className: 'ws-dot', 'aria-hidden': 'true' }, [h('span', { text: done ? '♥' : String(n) })]));
        var body = h('div', { className: 'ws-stop-body' }, [
          h('p', { className: 'ws-stop-code' }, [st.wp + (done ? ' · ' + done + (done === 1 ? ' sheet filled' : ' sheets filled') : ''), st.optional ? ' ' : null, st.optional ? h('span', { className: 'ws-optional', text: 'Optional' }) : null]),
          h('h3', { className: 'ws-stop-name', text: SP.nameOf(st.wp) }),
          h('p', { className: 'ws-stop-why', text: st.why }),
          PATHS.read && PATHS.read[st.wp] ? h('a', { className: 'ws-read', href: PATHS.read[st.wp], text: 'Read about ' + st.wp + ' first \u2192' }) : null
        ]);
        if (perPerson(st.wp)) body.appendChild(personRows(st));
        else {
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
        }
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
    var missing = (S.path.addable || ORDER).filter(function (c) { return !have[c] && schema(c); });
    var add = $('ws-add');
    add.innerHTML = '';
    if (missing.length) {
      add.appendChild(h('span', { className: 'ws-add-label', text: 'Add another workpaper:' }));
      missing.forEach(function (c) { add.appendChild(h('button', { type: 'button', className: 'ws-chip', 'data-add': c, text: c + ' ' + SP.nameOf(c) })); });
    }
    renderProgress();
  }

  // A sheet each person fills in about themselves: one row per person on the road, each with their own
  // sheets and their own "another day". WP-02 also shows the shared average, or who it is waiting on.
  function personRows(st) {
    var box = h('div', { className: 'ws-people-rows' }), mine = st.entries.map(function (en) { return { en: en, p: personOf(en) }; });
    var kids = [];
    S.names.forEach(function (nm, i) {
      var theirs = mine.filter(function (x) { return x.p === i; }).map(function (x) { return x.en; });
      if (isChild(i) && !theirs.length) { kids.push(whoLabel(i)); return; }
      var row = h('div', { className: 'ws-person-row' }, [h('span', { className: 'ws-person-name', text: whoLabel(i) })]);
      var list = h('div', { className: 'ws-sheets' });
      theirs.forEach(function (en, k) {
        var a = SP.answers(en), label = en.label || entryDay(en, k);
        var btn = h('button', { type: 'button', className: 'ws-sheet-btn' + (a ? ' is-filled' : ''), 'data-open': st.key, 'data-entry': en.id, 'data-person': String(i) }, [
          h('span', { className: 'ws-sheet-label', text: a ? label : 'Keep going: ' + label }),
          h('span', { className: 'ws-sheet-meta', text: a ? a + (a === 1 ? ' answer' : ' answers') + (st.wp === 'WP-02' && SP.metric(en) != null ? ' · ' + (Math.round(SP.metric(en) * 100 + 1e-7) / 100).toFixed(2) : '') : '✎' })
        ]);
        btn.setAttribute('aria-label', (a ? 'Open ' : 'Fill in ') + whoLabel(i) + '\u2019s ' + SP.nameOf(st.wp) + ', ' + label);
        list.appendChild(btn);
      });
      if (!theirs.length) {
        var b0 = h('button', { type: 'button', className: 'ws-sheet-btn', 'data-open': st.key, 'data-entry': '', 'data-person': String(i) }, [
          h('span', { className: 'ws-sheet-label', text: 'Fill in ' + (String(nm || '').trim() ? whoLabel(i) + '\u2019s' : 'this person\u2019s') }), h('span', { className: 'ws-sheet-meta', text: '✎' })]);
        b0.setAttribute('aria-label', 'Fill in ' + SP.nameOf(st.wp) + ' for ' + whoLabel(i));
        list.appendChild(b0);
      } else if (st.again && theirs.some(filled)) {
        list.appendChild(h('button', { type: 'button', className: 'ws-again', 'data-again': st.key, 'data-person': String(i), text: '+ ' + st.again, 'aria-label': st.again + ' for ' + whoLabel(i) }));
      }
      row.appendChild(list);
      box.appendChild(row);
    });
    var other = mine.filter(function (x) { return x.p == null && (filled(x.en) || x.en.label); });
    if (other.length) {
      var orow = h('div', { className: 'ws-person-row' }, [h('span', { className: 'ws-person-name', text: 'Not matched to anyone yet' })]), ol = h('div', { className: 'ws-sheets' });
      other.forEach(function (x, k) {
        var en = x.en, label = String(en.state.values.name || '').trim() || en.label || 'Sheet ' + (k + 1);
        ol.appendChild(h('button', { type: 'button', className: 'ws-sheet-btn is-filled', 'data-open': st.key, 'data-entry': en.id }, [h('span', { className: 'ws-sheet-label', text: label }), h('span', { className: 'ws-sheet-meta', text: 'open' })]));
      });
      orow.appendChild(ol);
      orow.appendChild(h('p', { className: 'ws-person-hint', text: 'Open one and put a name from "Who\u2019s on this road?" in its name box to move it to that person.' }));
      box.appendChild(orow);
    }
    if (kids.length) box.appendChild(h('p', { className: 'ws-person-hint', text: 'Not asked of ' + andList(kids) + (kids.length === 1 ? ', who is marked as a child.' : ', who are marked as children.') + ' This sheet is for the adults, each about themselves.' }));
    if (st.wp === 'WP-02') box.appendChild(h('p', { className: 'ws-shared', text: sharedAverage(st) }));
    return box;
  }
  function entryDay(en, k) {
    var d = en.state.values.date;
    return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? WPK.formatDate(d) : (en.workpaper === 'WP-11' ? 'Their kit' : 'Day ' + (k + 1));
  }
  // Everyone's latest load, and the shared average only once all of them are in (as in CALC-01).
  function sharedAverage(st) {
    var who = adults();
    var latest = who.map(function (i) {
      var theirs = st.entries.filter(function (en) { return personOf(en) === i && SP.metric(en) != null; });
      theirs.sort(function (a, b) { var x = a.state.values.date || '', y = b.state.values.date || ''; return x < y ? -1 : x > y ? 1 : 0; });
      return theirs.length ? SP.metric(theirs[theirs.length - 1]) : null;
    });
    var missing = who.filter(function (i, k) { return latest[k] == null; });
    if (missing.length === who.length) return 'The shared average (the stress number in CALC-01) appears here once everyone has filled in their own.';
    if (missing.length) return 'Shared average: waiting on ' + missing.map(whoLabel).join(', ') + '. It is never worked out while anyone\u2019s is missing.';
    var avg = latest.reduce(function (a, b) { return a + b; }, 0) / latest.length;
    return 'Shared average of everyone\u2019s latest: ' + (Math.round(avg * 100 + 1e-7) / 100).toFixed(2) + (latest.length === 2 ? ' (both in)' : ' (all ' + latest.length + ' in)') + '. That is the stress number for CALC-01.';
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
          if (perPerson(code)) {
            // one button per person: everyone fills in their own
            S.names.forEach(function (_, i) {
              if (isChild(i)) return;
              var theirs = st.entries.filter(function (en) { return personOf(en) === i; }), done1 = theirs.some(filled);
              row.appendChild(h('button', { type: 'button', className: 'ws-sheet-btn' + (done1 ? ' is-filled' : ''), 'data-open': st.key, 'data-entry': theirs[0] ? theirs[0].id : '', 'data-person': String(i) }, [
                h('span', { className: 'ws-sheet-label', text: code + ' ' + SP.nameOf(code) + ' · ' + whoLabel(i) }), h('span', { className: 'ws-sheet-meta', text: done1 ? '\u2713' : '\u270E' })]));
            });
            return;
          }
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
    if (!S.path) { refreshDynamic(); return; }
    var total = S.stops.length, done = S.stops.filter(function (st) { return st.entries.some(filled); }).length;
    var bubbles = h('span', { className: 'ws-bubbles', 'aria-hidden': 'true' });
    for (var i = 0; i < total; i++) bubbles.appendChild(h('span', { className: i < done ? 'is-on' : '' }));
    box.appendChild(bubbles);
    box.appendChild(h('span', { text: done === total ? 'Every stop has a sheet. Lovely work.' : done + ' of ' + total + ' stops started' }));
    $('ws-make').classList.toggle('is-ready', done > 0);
    refreshDynamic();
  }

  /* ------------------------------------------------------------ the page answers as you choose */

  // Before a road is picked, steps 2 to 4 wait for one; the report (step 5) waits for something written.
  // Step 1 keeps a little summary of the road, and the buttons say what they will make.
  var LOCK_BTNS = ['ws-fillable', 'ws-choose', 'ws-fullreport', 'ws-report', 'ws-save'];
  var was = { road: null, work: null }, booted = false;
  function trimmedNames() { return S.names.map(function (x) { return String(x || '').trim(); }).filter(Boolean); }
  function andList(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' & ' + a[a.length - 1]; }
  function shortRoad(p) { return p.id === 'program' ? '6-week program' : p.label; }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function sheetsFilled() { var n = 0; S.stops.forEach(function (st) { st.entries.forEach(function (en) { if (filled(en)) n++; }); }); return n; }
  function stopsWritten() { return S.stops.filter(function (st) { return st.entries.some(filled); }).length; }
  function workpaperCount() { var seen = {}; S.stops.forEach(function (st) { seen[st.wp] = true; }); return Object.keys(seen).length; }
  function announce(msg) {
    var el = $('ws-announce');
    if (!el || !msg) return;
    el.textContent = '';
    setTimeout(function () { el.textContent = msg; }, 60);
  }
  function setLock(sec, locked, note) {
    var body = sec.querySelector('.ws-step-body'), noteEl = sec.querySelector('[data-lock-note]');
    if (!body) return;
    var hadFocus = locked && body.contains(document.activeElement);
    sec.classList.toggle('is-locked', locked);
    if (noteEl) {
      noteEl.hidden = !locked;
      if (note && noteEl.getAttribute('data-lock-text') !== note && !noteEl.querySelector('button')) { noteEl.textContent = note; noteEl.setAttribute('data-lock-text', note); }
    }
    if (locked) { body.setAttribute('aria-disabled', 'true'); body.setAttribute('inert', ''); }
    else { body.removeAttribute('aria-disabled'); body.removeAttribute('inert'); }
    LOCK_BTNS.forEach(function (id) { var b = $(id); if (b && body.contains(b)) b.disabled = locked; });
    if (hadFocus && noteEl) { noteEl.setAttribute('tabindex', '-1'); noteEl.focus(); }
  }
  function chip(text, cls) { return h('li', { className: 'ws-chip-s' + (cls ? ' ' + cls : ''), text: text }); }
  function refreshDynamic() {
    var p = S.path, names = trimmedNames(), sheets = sheetsFilled(), written = stopsWritten(), total = S.stops.length;
    var road = !!p, work = road && written > 0;
    // step 1: the road at a glance
    var sum = $('ws-summary'), chips = $('ws-chips');
    if (sum && chips) {
      sum.hidden = !road;
      chips.innerHTML = '';
      if (road) {
        var r = h('li', { className: 'ws-chip-s is-road' }, [h('span', { className: 'ws-chip-icon', 'aria-hidden': 'true', text: p.icon }), document.createTextNode(' ' + p.label)]);
        r.style.setProperty('--c', p.color);
        chips.appendChild(r);
        chips.appendChild(names.length ? chip(andList(names)) : chip(isSolo() ? 'No name yet' : 'No names yet', 'is-quiet'));
        chips.appendChild(chip(plural(total, 'stop', 'stops')));
        if (p.weeks && p.weeks.length) chips.appendChild(chip(plural(p.weeks.length, 'week', 'weeks')));
        chips.appendChild(sheets ? chip(plural(sheets, 'sheet', 'sheets') + ' filled in', 'is-done') : chip('No sheets filled in yet', 'is-quiet'));
      }
    }
    // the locks
    Array.prototype.forEach.call(document.querySelectorAll('.ws-lockable'), function (sec) {
      var needsWork = sec.getAttribute('data-unlock') === 'work';
      setLock(sec, needsWork ? !work : !road, !road ? 'Pick a road above to unlock this.' : 'Fill in or bring in at least one sheet to write your report.');
    });
    // the buttons say what they will make
    var fb = $('ws-fillable'), fn = $('ws-fillable-note');
    if (fb) fb.textContent = !road ? 'Download the fillable PDF' : isSolo() ? 'Download your Just me fillable PDF' : 'Download the ' + shortRoad(p) + ' fillable PDF';
    if (fn) fn.textContent = !road ? 'Every workpaper on the road you pick' : [plural(workpaperCount(), 'workpaper', 'workpapers'), shortRoad(p) + ' road'].concat(names.length ? [names.join(', ')] : []).join(' \u00b7 ');
    var rn = $('ws-report-note'), frn = $('ws-fullreport-note');
    if (rn) rn.textContent = road ? written + ' of ' + plural(total, 'stop', 'stops') + ' ' + (written === 1 ? 'has' : 'have') + ' something written' : '';
    if (frn) frn.textContent = !road ? '' : sheets ? 'Reads ' + (sheets === 1 ? 'the 1 sheet' : 'all ' + sheets + ' sheets') + ' you\u2019ve filled in' : 'Reads every sheet you fill in';
    // tell people, gently, when something opens up
    if (booted) {
      if (road && was.road === false) announce('Steps 2 to 4 are open: your fillable PDF, your road, and bringing in files.');
      if (work && was.work === false) announce('Step 5 is open: your report can be written from what you\u2019ve filled in.');
    }
    was.road = road; was.work = work;
    mirrorFullPath();
  }

  // The Full path package below asks for a road and names too: it starts with yours, and keeps
  // following step 1 until you change it there yourself.
  var fpFollow = true, fpSyncing = false;
  function hasOption(sel, v) { return Array.prototype.some.call(sel.options, function (o) { return o.value === v; }); }
  function fire(el, type) { var e; try { e = new Event(type, { bubbles: true }); } catch (x) { e = document.createEvent('Event'); e.initEvent(type, true, true); } el.dispatchEvent(e); }
  function mirrorFullPath() {
    var road = $('fp-road'), cnt = $('fp-count'), nms = $('fp-names'), note = $('fp-mirror-note');
    if (!road || !nms || !road.options.length) return;
    if (note) note.hidden = !S.path;
    if (!S.path) return;
    if (!fpFollow) {
      if (note && !note.querySelector('button')) {
        note.textContent = 'Set here, apart from your road above. ';
        note.appendChild(h('button', { type: 'button', className: 'ws-link', id: 'fp-follow', text: 'Use my road from step 1 again' }));
      }
      return;
    }
    var id = S.path.id;
    if (!hasOption(road, id)) id = id === 'program' && hasOption(road, 'partners') ? 'partners' : null;
    var list = S.names.map(function (x) { return String(x || '').trim(); });
    while (list.length && !list[list.length - 1]) list.pop();
    fpSyncing = true;
    try {
      if (id && road.value !== id) { road.value = id; fire(road, 'change'); }
      var n = String(Math.max(MIN_PEOPLE, S.names.length));
      if (cnt && !isSolo() && hasOption(cnt, n) && cnt.value !== n) { cnt.value = n; fire(cnt, 'change'); }
      var v = list.join(', ');
      if (nms.value !== v) nms.value = v;
    } finally { fpSyncing = false; }
    if (note) note.textContent = 'Filled in from step 1' + (id ? ': ' + road.options[road.selectedIndex].text : '') + (list.some(Boolean) ? ' \u00b7 ' + list.filter(Boolean).join(', ') : '') + '. Change anything here and it stays as you set it.';
  }

  /* ------------------------------------------------------------ the sheet editor */

  var editing = null, app = null, lastFocus = null;

  function openSheet(stopKey, entryId, person) {
    var st = S.stops.filter(function (x) { return x.key === stopKey; })[0];
    if (!st) return;
    var en = st.entries.filter(function (x) { return x.id === entryId; })[0];
    var who = person != null && person !== '' && !isNaN(+person) ? +person : null;
    if (!en) { en = newEntry(st.wp, '', perPerson(st.wp) ? who : null); st.entries.push(en); }
    var sc = schema(st.wp);
    fitState(sc, en.state);
    if (sc.people) applyNames(sc, en.state);
    if (st.wp === 'WP-02' && !isSolo()) en.state.values.roadPeople = S.names.length;
    editing = { stop: st, entry: en, before: SP.answers(en) };
    lastFocus = document.activeElement;
    var p = personOf(en);
    // the plain name is the title; the technical name sits in the small line above it
    $('ws-sheet-code').textContent = st.wp + (sc.title !== SP.nameOf(st.wp) ? ' · ' + sc.title : '') + ' · ' + st.group;
    $('ws-sheet-title').textContent = SP.nameOf(st.wp) + (perPerson(st.wp) && p != null ? ' · ' + whoLabel(p) : '');
    $('ws-sheet-why').textContent = st.why + (perPerson(st.wp) ? ' Everyone fills in their own, about themselves.' : '') +
      (perPerson(st.wp) && p != null && S.names.length > 1 ? ' This one is ' + whoLabel(p) + '\u2019s to fill in. On a shared device? Hand it over to ' + whoLabel(p) + ' now.' + (st.wp === 'WP-02' ? ' Everyone on your road will see it if you share the file.' : '') : '');
    $('ws-sheet-label').value = en.label || '';
    var root = $('ws-sheet-root');
    // People come from "Who's on this road?", and are named the way this road does.
    app = new WPK.App(root, sc, { state: en.state, statusEl: $('ws-sheet-status'), onChange: onSheetChange, fixedPeople: true, personLabel: roleHeading, road: S.path.sheetRoad || S.path.id });
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
    // a name typed on someone's own sheet decides whose it is
    if (editing && perPerson(editing.entry.workpaper) && editing.entry.person != null && SP.fold(state.values.name) && SP.fold(state.values.name) !== SP.fold(S.names[editing.entry.person]) && SP.fold(state.values.name) !== SP.fold(roleLabel(editing.entry.person))) {
      var nm = SP.fold(state.values.name), match = -1;
      S.names.forEach(function (x, i) { if (SP.fold(x) === nm) match = i; });
      if (match >= 0) editing.entry.person = match; else if (!String(S.names[editing.entry.person] || '').trim()) setNameQuiet(editing.entry.person, state.values.name);
    }
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
    if (!filled(ed.entry) && !ed.entry.label && (ed.stop.entries.length > 1 || perPerson(ed.stop.wp))) ed.stop.entries.splice(ed.stop.entries.indexOf(ed.entry), 1);
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

  // A file from another road is held here until the person decides: switch roads, bring the sheets
  // onto this road anyway, or leave them out. Nothing is merged without asking.
  var held = null;
  function roadHasWork() { return S.stops.some(function (st) { return st.entries.some(filled); }); }
  function differentRoad(id) { return id && pathById(id) && S.path && S.path.id !== id && roadHasWork(); }
  // A one-person sheet (a load score, a calm-down kit) saved on another device says which place it had
  // there (person 0, 1 …). Each device can list the same people in a different order (Diego's: A = Diego;
  // Lena's: A = Lena), so the place is turned back into the name it had there, and matched by name here.
  function personByName(en, there, names) {
    var who = Array.isArray(names) ? String(names[there] || '').trim() : '', k = SP.fold(who), here = S.names.map(function (x) { return SP.fold(x); });
    var j = k ? here.indexOf(k) : -1;
    if (j >= 0) { en.person = j; if (j !== there) en.matched = true; return; }
    if (!k || !here.some(Boolean)) { en.person = there; return; }   // no names to go by: it keeps its place
    // someone not on this road yet: their own name goes on the sheet, and personOf() finds them once they are added
    if (!String(en.state.values.name || '').trim()) en.state.values.name = who;
  }
  // Where a sheet came from, for the report: "from Lena's file, saved 7 Oct".
  function fromNote(file, d) {
    var o = { file: String(file && file.name || '').slice(0, 120) };
    if (d && typeof d.by === 'string' && d.by.trim()) o.by = d.by.trim().slice(0, 40);
    if (d && typeof d.saved === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d.saved)) o.saved = d.saved.slice(0, 10);
    else if (file && file.lastModified) { var t = new Date(file.lastModified); if (!isNaN(t)) o.saved = t.toISOString().slice(0, 10); }
    return o;
  }
  function takeFiles(files) {
    files = Array.prototype.slice.call(files || []);
    if (!files.length) return;
    var loaded = [], problems = [], dupes = 0, hold = [];
    nameAsks = [];
    function put(en, road, names) {
      if (differentRoad(road)) { hold.push({ en: en, road: road, names: names }); return; }
      if (road && pathById(road) && !S.path) setPath(road);
      if (place(en)) loaded.push(en); else dupes++;
    }
    var jobs = files.map(function (f) {
      if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') {
        return SP.readFilled(f).then(function (entries) {
          if (!entries.length) { problems.push(f.name + " has no fill-in boxes from this site"); return; }
          if (entries.path && !S.path) setPath(entries.path);
          if (Array.isArray(entries.names) && !differentRoad(entries.path) && !S.names.some(function (x) { return String(x || '').trim(); })) {
            S.names = entries.names.slice(0, MAX_PEOPLE); fitNames();
          }
          entries.forEach(function (en) { if (SP.answers(en) > 0 || en.label) { en.from = fromNote(f, null); put(en, entries.path, entries.names); } });
          if (!entries.some(function (en) { return SP.answers(en) > 0; })) problems.push(f.name + ' is still blank');
        }, function () { problems.push(f.name + " couldn't be read"); });
      }
      if (f.size > 4 * 1024 * 1024) { problems.push(f.name + ' is too large'); return Promise.resolve(); }
      return readText(f).then(function (txt) {
        var d;
        try { d = JSON.parse(txt); } catch (e) { problems.push(f.name + " isn't a draft or suite file"); return; }
        if (d && d.format === SUITE_FORMAT && Array.isArray(d.entries)) {
          var other = differentRoad(d.path);
          if (d.path && pathById(d.path) && !S.path) setPath(d.path, typeof d.variant === 'string' ? d.variant : null);
          if (!other && Array.isArray(d.names) && !S.names.some(function (x) { return String(x || '').trim(); })) {
            S.names = d.names.slice(0, MAX_PEOPLE).map(function (x) { return String(x || ''); });
            fitNames();
          }
          // who is marked as a child there, matched by name here
          if (Array.isArray(d.kids) && Array.isArray(d.names)) {
            kidsFit();
            d.kids.forEach(function (kid, j) { var k = SP.fold(d.names[j]), at = k ? S.names.map(function (x) { return SP.fold(x); }).indexOf(k) : -1; if (kid && at >= 0) S.kids[at] = true; });
          }
          d.entries.forEach(function (x) {
            var sc = x && schema(x.workpaper);
            if (!sc) return;
            var en = { workpaper: sc.code, label: typeof x.label === 'string' ? x.label.slice(0, 80) : '', state: clean(sc, x.state) };
            if (typeof x.person === 'number') personByName(en, x.person, d.names);
            en.from = fromNote(f, d);
            put(en, d.path, d.names);
          });
          return;
        }
        if (d && d.format === WPK.DRAFT_FORMAT && d.state && schema(d.workpaper)) {
          var sc2 = schema(d.workpaper), en2 = { workpaper: sc2.code, label: '', state: clean(sc2, d.state) };
          en2.from = fromNote(f, d);
          put(en2, null);
          return;
        }
        problems.push(f.name + " isn't a draft or suite file");
      }, function () { problems.push(f.name + " couldn't be read"); });
    });
    Promise.all(jobs).then(function () {
      if (loaded.length && !S.path) setPath('partners');
      syncAllNames(); syncRoadPeople();
      renderNames(); renderRoad();
      var twice = dupes ? ' ' + dupes + (dupes === 1 ? ' sheet was' : ' sheets were') + ' already on your road, so ' + (dupes === 1 ? 'it wasn\u2019t' : 'they weren\u2019t') + ' added again.' : '';
      var msg = '';
      if (loaded.length) {
        changed();
        var names = loaded.map(function (en) { return en.workpaper + (en.label ? ' (' + en.label + ')' : ''); });
        msg = 'Brought in ' + loaded.length + (loaded.length === 1 ? ' sheet: ' : ' sheets: ') + names.slice(0, 6).join(', ') + (names.length > 6 ? ' and ' + (names.length - 6) + ' more' : '') + '.';
        celebrate($('ws-drop'), null);
        var first = document.querySelector('.ws-stop.is-done');
        if (first && first.scrollIntoView && !hold.length) first.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      }
      var matched = loaded.filter(function (en) { return en.matched; }).length;
      if (matched) twice += ' People were matched by name, so everyone\u2019s answers stayed theirs' + (matched > 1 ? ' on ' + matched + ' sheets' : '') + '.';
      $('ws-drop-note').textContent = (msg + twice).trim();
      if (nameAsks.length && !hold.length) { askAboutNames(); return; }
      if (hold.length) askAboutRoad(hold);
      else if (msg || twice) say((msg + twice).trim() + (problems.length ? ' ' + problems.join('; ') + '.' : ''));
      else say(problems.length ? problems.join('; ') + '.' : 'Nothing to bring in from those files.');
    });
  }

  // A sheet whose names don't match the names here: show both, and let the person choose.
  function askAboutNames() {
    var a = nameAsks[0], note = $('ws-drop-note');
    if (!a) return;
    var here = S.names.map(function (x, i) { return WPK.CODES[i] + ' is ' + (String(x || '').trim() || roleLabel(i)); });
    var there = a.info.there.map(function (x, i) { return WPK.CODES[i] + ' = ' + (x || roleLabel(i)); });
    note.appendChild(h('span', { className: 'ws-hold-msg', text: ' The ' + a.en.workpaper + ' sheet says ' + there.join(', ') + '; here ' + here.join(', ') + '. Is that the same people in another order?' }));
    var two = a.info.there.length === 2 && S.names.length === 2;
    var row = h('span', { className: 'ws-hold-actions' }, [
      two ? h('button', { type: 'button', className: 'wpf-add', 'data-names': 'swap', text: 'Swap them (A \u2194 B)' }) : null,
      h('button', { type: 'button', className: 'wpf-add', 'data-names': 'keep', text: two ? 'Keep it as it is' : 'Keep the order as it is' })
    ]);
    note.appendChild(row);
    say('The names on that sheet don\u2019t match the names here. Choose what to do, just under "Drop files here".');
    var b = note.querySelector('[data-names]'); if (b) b.focus();
  }
  function resolveNames(how) {
    var a = nameAsks.shift(), note = $('ws-drop-note');
    if (!a) return;
    if (how === 'swap') { var sc = schema(a.en.workpaper); remapSheet(sc, a.en.state, [1, 0]); applyNames(sc, a.en.state); changed(); renderRoad(); }
    note.textContent = how === 'swap' ? 'Swapped: the answers on that ' + a.en.workpaper + ' sheet now sit with the right names.' : 'Kept as it is.';
    say(note.textContent);
    if (nameAsks.length) askAboutNames();
  }

  // Sheets from another road: say so, and let the person choose.
  function askAboutRoad(hold) {
    held = hold;
    var from = pathById(hold[0].road), note = $('ws-drop-note');
    var n = hold.length, kinds = hold.map(function (x) { return x.en.workpaper; }).filter(function (c, i, a) { return a.indexOf(c) === i; }).join(', ');
    note.textContent = '';
    note.appendChild(h('span', { className: 'ws-hold-msg', text: 'That file is from the ' + from.label + ' road (' + n + (n === 1 ? ' sheet: ' : ' sheets: ') + kinds + '). You\u2019re on the ' + S.path.label + ' road, which already has sheets on it. What would you like to do?' }));
    var row = h('span', { className: 'ws-hold-actions' }, [
      h('button', { type: 'button', className: 'wpf-add', 'data-hold': 'switch', text: 'Switch to ' + from.label + ' and bring them in' }),
      h('button', { type: 'button', className: 'wpf-add', 'data-hold': 'here', text: 'Add them to my ' + S.path.label + ' road' }),
      h('button', { type: 'button', className: 'ws-link', 'data-hold': 'skip', text: 'Keep them separate (leave them out)' })
    ]);
    note.appendChild(row);
    say('That file is from a different road. Choose what to do with it, just under "Drop files here".');
    var b = note.querySelector('button'); if (b) b.focus();
  }
  function resolveHeld(how) {
    var hold = held; held = null;
    if (!hold) return;
    var note = $('ws-drop-note'), added = 0, dup = 0;
    if (how === 'skip') { note.textContent = 'Left out. Nothing from that file was added, and your ' + S.path.label + ' road is as it was.'; say(note.textContent); return; }
    if (how === 'switch') {
      setPath(hold[0].road);
      if (Array.isArray(hold[0].names) && hold[0].names.some(function (x) { return String(x || '').trim(); }) && !S.names.some(function (x) { return String(x || '').trim(); })) { S.names = hold[0].names.slice(0, MAX_PEOPLE).map(function (x) { return String(x || ''); }); fitNames(); }
    }
    hold.forEach(function (x) { if (place(x.en)) added++; else dup++; });
    syncAllNames(); syncRoadPeople(); renderNames(); renderRoad(); changed();
    note.textContent = (how === 'switch' ? 'Switched to the ' + S.path.label + ' road. ' : '') + 'Brought in ' + added + (added === 1 ? ' sheet' : ' sheets') + '.' + (dup ? ' ' + dup + ' already here, not added again.' : '');
    say(note.textContent);
  }

  /* ------------------------------------------------------------ making files */

  function plan() {
    var groups = [];
    S.stops.forEach(function (st) {
      var g = groups.filter(function (x) { return x.title === st.group; })[0];
      // pages to read first (a variant's first stops) go in the PDF's reading list for that group, first
      if (!g) { g = { title: st.group, note: st.groupNote, along: (st.reads || []).map(function (r) { return [r[0], r[1]]; }).concat(st.along || []), entries: [] }; groups.push(g); }
      var list = st.entries.length ? st.entries.slice() : [];
      if (perPerson(st.wp)) {
        // a sheet for everyone: their own, or a blank one with their name on it
        S.names.forEach(function (_, i) { if (!isChild(i) && !list.some(function (en) { return personOf(en) === i; })) list.push(newEntry(st.wp, '', i)); });
        list.sort(function (a, b) { var x = personOf(a), y = personOf(b); return (x == null ? 99 : x) - (y == null ? 99 : y); });
      }
      if (!list.length) list = [newEntry(st.wp)];
      list.forEach(function (en, k) {
        var p = perPerson(st.wp) ? personOf(en) : null, lab = en.label;
        if (!lab && p != null) lab = whoLabel(p) + (en.state.values.date ? ' · ' + WPK.formatDate(en.state.values.date) : '');
        g.entries.push({ workpaper: en.workpaper, label: lab, state: en.state, why: st.why });
      });
    });
    return { path: S.path, names: S.names.slice(), people: S.path.people, groups: groups, tip: roadTip() };
  }

  // A little tip for the end of the report, from the site's tips library, picked for this road, in
  // American English (the library has a few British spellings, and those are skipped here).
  var TIP_ROADS = {
    self: ['calm', 'rest', 'selftalk', 'mind', 'body'], partners: ['connection', 'talking', 'home', 'kindness'], family: ['family', 'talking', 'home', 'kindness'],
    coparents: ['family', 'talking', 'kindness'], friends: ['friends', 'connection', 'kindness'], roommates: ['home', 'talking', 'kindness'],
    coworkers: ['work', 'talking', 'focus'], caregivers: ['rest', 'kindness', 'family', 'calm'], program: ['connection', 'talking', 'home']
  };
  var BRITISH = /\b(flavour|colour|favourite|behaviour|organis|realis|recognis|apologis|centre|practise|neighbour|towards|kettle|whilst|learnt|mum\b|fortnight|queue|cosy|tidy up|jumper)/i;
  var tipCache = {};
  function roadTip() {
    var id = S.path ? S.path.id : 'partners';
    if (tipCache[id] !== undefined) return tipCache[id];
    if (!global.TOLTips) return null;
    var d = new Date(), seed = d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate(), got = null;
    for (var k = 0; k < 16 && !got; k++) global.TOLTips.get(TIP_ROADS[id] || null, function (t) { if (t && t[0] && !BRITISH.test(t[0] + ' ' + t[1])) got = ['', t[0], t[1]]; }, seed + k * 13);
    if (got) tipCache[id] = got;
    return got;
  }
  var tip = null, soloTip = null;

  function base() { return 'Spread-Love-and-Acceptance-Workpaper-Suite-' + (S.path ? S.path.label.replace(/[^A-Za-z0-9]+/g, '-') + '-' : '') + WPK.today(); }

  function makePdf(kind) {
    if (!S.path) { say('Choose your road first, then your PDF is made from it.'); $('ws-paths').querySelector('button').focus(); return; }
    var pruned = pruneNames();
    var p = plan();
    if (kind === 'report' && !p.groups.some(function (g) { return g.entries.some(function (en) { return SP.answers(en) > 0; }); })) {
      say('The report is made from what you’ve filled in. Fill in a sheet, or bring in a draft, first. The fillable PDF works any time.');
      return;
    }
    try {
      var bytes = kind === 'report' ? SP.report(p) : SP.fillable(null, { plan: p });
      WPK.download(bytes, base() + (kind === 'report' ? '-report.pdf' : '-fillable.pdf'), 'application/pdf');
      say((kind === 'report' ? 'Your report is in your Downloads. Keep it somewhere private.' : 'Your fillable PDF is in your Downloads. Tap any box to type, or print it. Bring it back here any time.') + (pruned ? ' (A person added without a name or any answers was taken off first.)' : ''));
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
    most = Math.min(isSolo() ? 1 : MAX_PEOPLE, most);
    eachPeopleSheet(function (sc, st) {
      for (var i = 0; i < most; i++) {
        var v = String(st.values['partner' + WPK.CODES[i]] || '');
        if (i >= S.names.length) S.names.push(v);
        else if (!S.names[i].trim() && v.trim()) S.names[i] = v;
      }
    });
    fitNames();
    eachPeopleSheet(function (sc, st) { applyNames(sc, st); });
  }

  function saveSuite() {
    if (!S.path) { say('Choose your road first.'); return; }
    pruneNames();
    var file = snapshot(true);
    WPK.download(JSON.stringify(file, null, 2), base() + '.json', 'application/json');
    S.dirty = false;
    say('Your progress file is in your Downloads. Open it here next time, on any device, to pick up where you left off.');
  }

  function clearAll() {
    if (!global.confirm('Clear everything on this page? Anything you haven\'t saved as a PDF or suite file will be gone.')) return;
    S = { path: S.path, variant: S.variant, names: ['', ''], stops: [], dirty: false, view: S.view || 'steps' };
    if (S.path) setPath(S.path.id, S.variant); else { renderNames(); renderRoad(); }
    if (keep) eraseKept('Cleared, and the draft kept on this device is erased. Nothing you typed remains.');
    else say('Cleared. Nothing you typed remains on the page.');
  }

  /* ------------------------------------------------------------ wiring */

  function boot() {
    if (global.TOLTips) global.TOLTips.get(['calm'], function () { /* loads the tips library, so a road's tip is ready when a report is made */ }, 1);
    var eraseBtn0 = $('ws-erase');
    if (eraseBtn0 && !$('ws-erase-note')) eraseBtn0.parentNode.insertBefore(h('span', { className: 'wpf-erase-note', id: 'ws-erase-note', role: 'status', 'aria-live': 'polite' }), eraseBtn0.nextSibling);
    hhSetup();
    renderPaths();
    var q = (global.location.search.match(/[?&]road=([a-z]+)/) || [])[1];
    var qf = (global.location.search.match(/[?&]focus=([a-z]+)/) || [])[1] || null;
    var kept = readKept();
    if (kept) {
      // Pick up the draft kept on this device (the person turned this on earlier)
      keep = true;
      if ($('ws-keep')) $('ws-keep').checked = true;
      if (kept.path && pathById(kept.path)) setPath(kept.path, typeof kept.variant === 'string' ? kept.variant : null);
      if (Array.isArray(kept.names)) { S.names = kept.names.slice(0, MAX_PEOPLE).map(function (x) { return String(x || ''); }); fitNames(); }
      if (Array.isArray(kept.kids)) S.kids = kept.kids.slice(0, MAX_PEOPLE).map(Boolean);
      if (Array.isArray(kept.focusEach)) { S.focusEach = kept.focusEach.slice(0, MAX_PEOPLE).map(function (x) { return typeof x === 'string' && /^[a-z]{1,20}$/.test(x) ? x : null; }); renderFocus(); }
      kept.entries.forEach(function (x) {
        var sc = x && schema(x.workpaper);
        if (!sc) return;
        var en = { workpaper: sc.code, label: typeof x.label === 'string' ? x.label.slice(0, 80) : '', state: clean(sc, x.state) };
        if (typeof x.person === 'number') en.person = x.person;
        place(en);
      });
      syncAllNames(); syncRoadPeople();
      renderNames(); renderRoad();
      S.dirty = false;
      say('Picked up the draft kept on this device. Press “Erase” to remove it.');
    } else if (q && pathById(q)) setPath(q, qf); else renderRoad();

    var nameTimer = null;
    $('ws-names').addEventListener('input', function (e) {
      var i = e.target.getAttribute('data-name');
      if (i == null) return;
      setName(+i, e.target.value);
      // the road below (each person's own sheets) shows the new name a moment after typing stops
      clearTimeout(nameTimer); nameTimer = setTimeout(renderRoad, 500);
    });
    $('ws-names').addEventListener('change', function (e) {
      var k = e.target.getAttribute('data-kid');
      if (k != null) {
        kidsFit(); S.kids[+k] = e.target.checked;
        syncRoadPeople(); changed(); renderRoad();
        say(whoLabel(+k) + (e.target.checked ? ' is marked as a child: no load score or calm-down kit is asked of them, and the shared numbers don\u2019t wait for them.' : ' is marked as an adult.'));
        return;
      }
      if (e.target.getAttribute('data-name') != null) { clearTimeout(nameTimer); renderRoad(); }
    });
    $('ws-names').addEventListener('click', function (e) {
      var x = e.target.closest('[data-remove-name]');
      if (x) removeName(+x.getAttribute('data-remove-name'));
      if (e.target.closest('#ws-name-add')) addName();
    });
    var lemonGo = $('ws-lemon-go'), lemonUse = $('ws-lemon-kept'), lemonSay = function (m) { var n = $('ws-lemon-note'); if (n) { n.textContent = ''; setTimeout(function () { n.textContent = m; }, 30); } };
    if (lemonGo) lemonGo.addEventListener('click', function () {
      var d = lemonFromCode($('ws-lemon-code').value);
      if (!d) { lemonSay('That doesn’t look like a Lemonade Stand code. Copy the whole thing, starting with LEMON1:'); $('ws-lemon-code').focus(); return; }
      lemonSay(lemonBring(d, { by: d.by, saved: WPK.today(), file: 'Lemonade Stand code' }));
      $('ws-lemon-code').value = '';
    });
    if (lemonUse) lemonUse.addEventListener('click', function () {
      var d = lemonKept();
      if (!d) { lemonSay('There’s no Lemonade Stand kept on this device.'); return; }
      lemonSay(lemonBring(d, { saved: WPK.today(), file: 'Lemonade Stand on this device' }));
    });
    lemonRender();
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
      var had = S.path, id = b.getAttribute('data-path');
      setPath(id, had && had.id === id ? S.variant : null);
      changed();
      // keep the names and the summary in view; step 2 (your fillable PDF) sits right below them
      if (!had) setTimeout(function () { var t = $('ws-summary'); if (t && t.scrollIntoView) t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' }); }, 60);
      say(S.path.label + ': your road has ' + S.stops.length + ' stops.');
    });
    $('ws-paths').addEventListener('keydown', function (e) {
      if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].indexOf(e.key) < 0) return;
      var bs = Array.prototype.slice.call(this.querySelectorAll('[data-path]')), i = bs.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      bs[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length].focus();
    });

    // "What brings you here?": the same road, in the order that fits
    var focusBox = $('ws-focus');
    if (focusBox) {
      focusBox.addEventListener('change', function (e) {
        var i = e.target.getAttribute('data-focus-person');
        if (i == null || !S.path) return;
        S.focusEach = (S.focusEach || []).slice(); S.focusEach[+i] = e.target.value || null;
        var picked = S.focusEach.filter(function (x) { return x; });
        var key = picked.length && picked.every(function (x) { return x === picked[0]; }) ? (picked[0] === 'main' ? null : picked[0]) : null;
        if ((S.variant || null) !== key) setPath(S.path.id, key); else renderFocus();
        changed();
        var again = $('ws-focus-p' + i); if (again) again.focus();
      });
      focusBox.addEventListener('click', function (e) {
        var fe = e.target.closest('[data-focus-each]');
        if (fe) { S.focusEach = fe.getAttribute('data-focus-each') === 'on' ? S.names.map(function () { return S.variant || null; }) : null; renderFocus(); changed(); var f0 = $('ws-focus-p0') || $('ws-focus').querySelector('[data-focus-each]'); if (f0) f0.focus(); return; }
        var b = e.target.closest('[data-focus]');
        if (!b || !S.path) return;
        var key = b.getAttribute('data-focus') || null;
        if ((S.variant || null) === key) return;
        setPath(S.path.id, key);
        changed();
        var nb = $('ws-focus').querySelector('[data-focus="' + (key || '') + '"]');
        if (nb) nb.focus();
        var first = S.stops[0];
        say('Your road is set for: ' + b.textContent + '. ' + (S.path.groups[0] && S.path.groups[0].reads && S.path.groups[0].reads.length ? 'It starts with ' + S.path.groups[0].reads.map(function (r) { return r[0]; }).join(', ') + ', then ' + SP.nameOf(first.wp) + '.' : 'It starts with ' + SP.nameOf(first.wp) + '.'));
      });
      focusBox.addEventListener('keydown', function (e) {
        if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].indexOf(e.key) < 0) return;
        var bs = Array.prototype.slice.call(this.querySelectorAll('[data-focus]')), i = bs.indexOf(document.activeElement);
        if (i < 0) return;
        e.preventDefault();
        bs[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length].click();
      });
    }
    $('ws-view').addEventListener('click', function (e) {
      var b = e.target.closest('[data-view]'); if (!b) return;
      S.view = b.getAttribute('data-view'); renderRoad();
    });
    $('ws-step-road').addEventListener('click', function (e) {
      var o = e.target.closest('[data-open]'), a = e.target.closest('[data-again]'), add = e.target.closest('[data-add]');
      if (o) openSheet(o.getAttribute('data-open'), o.getAttribute('data-entry'), o.getAttribute('data-person'));
      if (a) {
        var st = S.stops.filter(function (x) { return x.key === a.getAttribute('data-again'); })[0];
        var pa = a.getAttribute('data-person'), en = newEntry(st.wp, '', pa != null && pa !== '' ? +pa : null);
        st.entries.push(en);
        openSheet(st.key, en.id, pa);
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
    if ($('ws-sheet-draft')) $('ws-sheet-draft').addEventListener('click', function () { if (app) app.saveDraft(); });
    $('ws-drop').addEventListener('click', function (e) { var hb = e.target.closest('[data-hold]'); if (hb) resolveHeld(hb.getAttribute('data-hold')); var nb = e.target.closest('[data-names]'); if (nb) resolveNames(nb.getAttribute('data-names')); });
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
    if ($('ws-open-early')) $('ws-open-early').addEventListener('click', function () { fileInput.click(); });
    // A file dropped on step 4 before a road is picked still comes in, and picks its own road.
    var bring = $('ws-bring');
    if (bring) {
      ['dragenter', 'dragover'].forEach(function (t) { bring.addEventListener(t, function (e) { if (bring.classList.contains('is-locked')) e.preventDefault(); }); });
      bring.addEventListener('drop', function (e) { if (!bring.classList.contains('is-locked')) return; e.preventDefault(); takeFiles(e.dataTransfer && e.dataTransfer.files); });
    }
    // The Full path package follows step 1 until its road or names are changed there by hand.
    ['fp-road', 'fp-count', 'fp-names'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener(id === 'fp-names' ? 'input' : 'change', function () { if (!fpSyncing && fpFollow) { fpFollow = false; mirrorFullPath(); } });
    });
    var fpCard = $('fp-mirror-note');
    if (fpCard) fpCard.addEventListener('click', function (e) {
      if (!e.target.closest('#fp-follow')) return;
      fpFollow = true; mirrorFullPath();
      var r = $('fp-road'); if (r) r.focus();
    });
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
    refreshDynamic();
    hhRefresh();
    if (hhWrite) hhWrite.baseline();
    booted = true;
    // the Full path package fills its own road list once it has started: follow step 1 after that
    setTimeout(mirrorFullPath, 0);
  }

  global.__workpaperSuite = { state: function () { return S; }, take: takeFiles, plan: function () { return plan(); }, snapshot: function () { return snapshot(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
