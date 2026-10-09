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
  var uid = 0, keep = false, keepTimer = null, suiteSafe = '', suiteAsk = null;

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
    var en = { id: 'e' + (++uid), sid: newSid(), workpaper: code, label: label || '', state: st };
    if (person != null) en.person = person;
    return en;
  }
  // Every sheet has its own identity (sid), kept in drafts and files. The same sheet coming back inside
  // someone else's file (they brought yours in earlier) is that one sheet, never a second copy to count again.
  function newSid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function cellsOf(r, sec) { var o = {}; sec.columns.forEach(function (c) { var v = r && r[c.id]; if (c.type !== 'computed' && v !== '' && v != null && v !== false) o[c.id] = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().toLowerCase() : v; }); return o; }
  function rowKeyOf(r, sec) { var o = cellsOf(r, sec); return JSON.stringify(Object.keys(o).sort().map(function (k) { return [k, o[k]]; })); }
  function realRows(sc, st, sec) { return (st.tables[sec.id] || []).filter(function (r) { return r && !WPK.rowIsEmpty(sec, r) && !WPK.isExampleRow(sec, r); }); }
  // is everything written on sheet a also on sheet b?
  function contained(a, b) {
    if (a.workpaper !== b.workpaper) return false;
    var sc = schema(a.workpaper), ok = true;
    Object.keys(a.state.values).forEach(function (k) {
      var v = a.state.values[k];
      if (!ok || /^(partner[A-H]|peopleCount|roadPeople)$/.test(k) || v === '' || v == null || v === false) return;
      if (String(b.state.values[k] == null ? '' : b.state.values[k]).trim().toLowerCase() !== String(v).trim().toLowerCase()) ok = false;
    });
    sc.sections.forEach(function (sec) {
      if (!ok || sec.type !== 'table') return;
      var have = {}; realRows(sc, b.state, sec).forEach(function (r) { have[rowKeyOf(r, sec)] = 1; });
      realRows(sc, a.state, sec).forEach(function (r) {
        if (!ok || have[rowKeyOf(r, sec)]) return;
        if (sec.personDays) { var o = cellsOf(r, sec), hit = (b.state.tables[sec.id] || []).filter(function (x) { return x && x.day === r.day && x.who === r.who; })[0]; if (hit && Object.keys(o).every(function (k) { return cellsOf(hit, sec)[k] === o[k]; })) return; }
        ok = false;
      });
    });
    return ok;
  }
  // the same sheet from two devices: what is new on the other one is added, nothing here is overwritten
  // detail: return { got, rows, days, values } instead of the count
  function mergeSheet(x, en, detail) {
    var sc = schema(x.workpaper), got = 0, rowsIn = 0, days = {}, vals = 0;
    Object.keys(en.state.values).forEach(function (k) { var v = en.state.values[k]; if (v !== '' && v != null && v !== false && WPK.isBlank(x.state.values[k])) { x.state.values[k] = v; got++; if (!/^partner[A-H]$|^peopleCount$|^roadPeople$/.test(k)) vals++; } });
    sc.sections.forEach(function (sec) {
      if (sec.type !== 'table') return;
      var rows = x.state.tables[sec.id] || (x.state.tables[sec.id] = []), have = {};
      realRows(sc, x.state, sec).forEach(function (r) { have[rowKeyOf(r, sec)] = 1; });
      realRows(sc, en.state, sec).forEach(function (r) {
        if (have[rowKeyOf(r, sec)]) return;
        if (sec.personDays) {
          var hit = rows.filter(function (y) { return y && y.day === r.day && y.who === r.who; })[0];
          if (hit) { sec.columns.forEach(function (c) { if (!c.prefill && WPK.isBlank(hit[c.id]) && !WPK.isBlank(r[c.id])) { hit[c.id] = r[c.id]; got++; days[r.day + '|' + r.who] = 1; } }); return; }
        }
        var slot = rows.filter(function (y) { return y && WPK.rowIsEmpty(sec, y) && !sec.personDays; })[0];
        if (slot) Object.keys(r).forEach(function (k) { slot[k] = r[k]; }); else rows.push(JSON.parse(JSON.stringify(r)));
        have[rowKeyOf(r, sec)] = 1; got++;
        if (sec.personDays) days[r.day + '|' + r.who] = 1; else rowsIn++;
      });
    });
    return detail ? { got: got, rows: rowsIn, days: Object.keys(days).length, values: vals } : got;
  }
  // "7 rows", "1 day", "3 answers": what a merge added to a sheet
  function mergeCount(mi) {
    var bits = [];
    if (mi.rows) bits.push(mi.rows + (mi.rows === 1 ? ' row' : ' rows'));
    if (mi.days) bits.push(mi.days + (mi.days === 1 ? ' day' : ' days'));
    if (mi.values || !bits.length) bits.push((mi.values || mi.got) + ((mi.values || mi.got) === 1 ? ' answer' : ' answers'));
    return bits.join(', ');
  }
  // whose answers came in: "Jordan's", from the file, or the one name on it that isn't on this device's first place
  function mergedWho(en) {
    var by = en.from && en.from.by ? String(en.from.by).trim() : '';
    return by ? by + '\u2019s' : 'the new';
  }
  // a sheet's name in the middle of a sentence: "the 90-second daily check-in"
  function midName(code) { return String(SP.nameOf(code)).replace(/^The /, 'the '); }
  function andJoin(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
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
    if (!(nm0 && nm0.clash.length)) {
      var twin = null, inside = false;
      S.stops.forEach(function (st) { st.entries.forEach(function (x) { if (en.sid && x.sid === en.sid) twin = x; else if (x.workpaper === en.workpaper && filled(x) && contained(en, x)) inside = true; }); });
      if (twin) { var mi = mergeSheet(twin, en, true); if (mi.got) { en.mergedInto = twin; en.mergeInfo = mi; } return false; }
      if (inside) return false;
    }
    if (!en.sid) en.sid = newSid();
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
    // living apart, on a phone: just the two call sheets, for five minutes on a call
    if (S.variant === 'apart' && (phone() || S.short)) box.appendChild(h('p', { className: 'ws-focus-more' }, [h('button', { type: 'button', className: 'ws-focus-b ws-short-b' + (S.short ? ' is-on' : ''), 'data-short': S.short ? 'off' : 'on', 'aria-pressed': S.short ? 'true' : 'false', text: S.short ? 'Show the whole road' : 'Just the two call sheets (5 minutes)' })]));
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
  var NIGHTS = [[14, 'Every night'], [10, 'Most nights'], [7, 'Half the time'], [4, 'Every other weekend'], [2, 'A night or two'], [1, 'Now and then']];
  function nightsOf(nm) {
    var sp = S.split, k = SP.fold(nm || ''), hit = 14;
    if (sp && sp.nights && k) Object.keys(sp.nights).forEach(function (x) { if (SP.fold(x) === k) hit = Math.round(sp.nights[x]); });
    return hit;
  }
  function setNights(i, v) {
    var nm = String(S.names[i] || '').trim();
    if (!nm) return false;
    S.split = S.split || { nights: {}, agreed: {} };
    S.split.nights = S.split.nights || {}; S.split.agreed = S.split.agreed || {};
    Object.keys(S.split.nights).forEach(function (x) { if (SP.fold(x) === SP.fold(nm)) delete S.split.nights[x]; });
    if (v < 14) S.split.nights[nm] = v;
    if (!Object.keys(S.split.nights).length && !Object.keys(S.split.agreed).length) S.split = null;
    return true;
  }
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
        // lives here part of the time (a child who lives in two homes, a partner who works away):
        // the nights out of 14, kept by name, so the report reads a fair share for the nights they're here
        var nightsNow = nightsOf(nm), sel = h('select', { id: 'ws-nights-' + i, 'data-nights': String(i), autocomplete: 'off' });
        NIGHTS.forEach(function (o) { var op = h('option', { value: String(o[0]), text: o[1] }); if (o[0] === nightsNow) op.selected = true; sel.appendChild(op); });
        if (NIGHTS.every(function (o) { return o[0] !== nightsNow; })) { var op2 = h('option', { value: String(nightsNow), text: nightsNow + ' of 14 nights' }); op2.selected = true; sel.appendChild(op2); }
        cell.appendChild(h('label', { className: 'ws-nights', for: 'ws-nights-' + i }, [h('span', { text: 'Lives here' }), sel]));
      }
      if (S.names.length > minPeople()) {
        cell.appendChild(h('button', { type: 'button', className: 'ws-name-x', 'data-remove-name': String(i), 'aria-label': 'Take ' + (nm.trim() || roleLabel(i)) + ' off this road', text: '×' }));
      }
      row.appendChild(cell);
    });
    $('ws-name-add').hidden = S.names.length >= MAX_PEOPLE;
    $('ws-names-count').textContent = S.names.length + ' people · up to ' + MAX_PEOPLE;
    $('ws-care').textContent = p.care;
    renderSplit();
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
  var LEMON_DRAFT = 'tol-lemonade-draft'; // the stand's own copy for this tab (sessionStorage), kept or not
  var LEMON_FREQ = { day: 7, wkd: 5, few: 3, two: 2, week: 1, eow: 0.5, month: 12 / 52 };
  var LEMON_OFTEN = { day: 'Daily', wkd: 'Daily', few: 'Weekly', two: 'Weekly', week: 'Weekly', eow: 'Weekly', month: 'Monthly' };
  var LEMON_WORD = { day: 'each day', wkd: 'each weekday', few: '3 times a week', two: 'twice a week', week: '', eow: 'every other week', month: 'each month' };
  // The stand counts only home jobs in the split (paid work and rest are shown beside it, never in it).
  // Its own area for a job wins; otherwise the same guesses the stand makes from the name.
  var LEMON_AWAY = /^(paid work|commute|school or classes|study & homework \(my own\)|work messages after hours|a side job|time to myself|a walk or moving my body|hobbies|time with friends|quiet time doing nothing|a full day off)$/i;
  var LEMON_GUESS = [
    ['baby', /baby|newborn|nappy|nappies|diaper|night feed|bottle|pump|formula|burp/],
    ['emotional', /emotion|check-?in|peace|listen|support|comfort/], ['money', /bill|budget|money|\btax|\brent\b|bank|\bpay|mortgage|subscription/],
    ['food', /groc|meal|cook|lunch|dinner|breakfast|food|kitchen/], ['laundry', /laundry|fold|iron|towel/],
    ['pets', /\bpets?\b|dog|\bcats?\b|litter|\bvet/], ['work', /commute|(?:drive|driving) to work/],
    ['appts', /appoint|doctor|dentist|pharmac|clinic|prescription|check-?up/],
    ['kids', /kid|child|baby|bedtime|homework|school run|daycare|caring|care for|pick(?:ing|s)?[ -]?up|drop(?:ping|s)?[ -]?off|hand-?(?:off|over)|custody|co-?parent|\bdriv(?:e|es|ing)\b|\blifts?\b|\brides?\b/],
    ['admin', /form|paper|mail|email|insurance|admin|document|renew|licen[cs]e|passport/],
    ['errands', /errand|shop|store|gift|return/], ['car', /car\b|repair|fix|garage|tire/], ['yard', /yard|garden|mow|lawn|snow|leaves|weed/],
    ['social', /birthday|anniversar|family|friend|call|visit|holiday|in-?laws/], ['mental', /plan|remember|calendar|schedul|list|notic|organi[sz]/],
    ['home', /dish|clean|tidy|vacuum|bathroom|trash|floor|sheet|dust/], ['work', /work|job|commute|class|study/],
    ['rest', /\b(?:naps?|napping|rest|resting|relax|relaxing|hobby|hobbies|me[- ]time|time (?:to|for) myself|gym for me|my gym|yoga|meditat\w*|lie[- ]in|sleep(?:ing)? in|day off)\b/]
  ];
  var LEMON_NOT_REST = /pick(?:ing|s)?[ -]?up|drop(?:ping|s)?[ -]?off|hand-?(?:off|over)|school run|\bdriv(?:e|es|ing)\b|\blifts?\b|\brides?\b|appoint|custody|co-?parent|collect|ferry|transport|errand/;
  function lemonHome(name, cat) {
    if (cat === 'work' || cat === 'rest') return false;
    if (cat) return true;
    if (LEMON_AWAY.test(String(name || '').trim())) return false;
    var l = String(name || '').toLowerCase(), c = 'other';
    for (var i = 0; i < LEMON_GUESS.length; i++) if (LEMON_GUESS[i][1].test(l)) { c = LEMON_GUESS[i][0]; break; }
    if (c === 'rest' && LEMON_NOT_REST.test(l)) c = 'other';
    return c !== 'work' && c !== 'rest';
  }
  // A household code ("TOLHOME1:", from "Household on another phone?" on the stand and the other tools):
  // the names, and the jobs with their owners and how often, but never any hours.
  function lemonHome1(text) {
    var HH = global.TOLHousehold, d = HH && HH.fromCode ? HH.fromCode(text) : null;
    if (!d || !d.people.length) return null;
    var people = d.people.map(lemonReal).filter(Boolean).slice(0, MAX_PEOPLE);
    if (!people.length) return null;
    var jobs = d.jobs.map(function (j) { return { n: lemonClean(j.name), f: LEMON_FREQ[j.f] ? j.f : 'week', fq: null, u: 'm', v: {}, t: {}, nf: '', nm: [], home: lemonHome(j.name, '') }; }).filter(function (j) { return j.n; });
    var own = d.jobs.filter(function (j) { return j.owner; }).map(function (j) { return { n: lemonClean(j.name), w: lemonClean(j.owner, 40) }; });
    return { people: people, jobs: jobs, own: own, by: '', kids: [], nights: {}, agreed: {}, home1: true };
  }
  function lemonB64(s) {
    var bin = atob(String(s || '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/'));
    try { var a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new TextDecoder().decode(a); }
    catch (e) { return decodeURIComponent(escape(bin)); }
  }
  function lemonNum(x) { var n = parseFloat(x); return isFinite(n) && n > 0 ? n : 0; }
  function lemonReal(n) { n = String(n || '').trim(); return n && !/^(me|them|you|person [a-h1-8])$/i.test(n) ? n : ''; }
  function lemonClean(x, n) { return String(x == null ? '' : x).replace(/\s+/g, ' ').trim().slice(0, n || 120); }
  // How often a job comes up: one "how often" for the job ("day"), or one per person, by name
  // ({ Maya: 'day', Jordan: 'week' }) or by place ([ 'day', 'week' ]). Each person's own is used for their time.
  function lemonFreq(f, people) {
    if (typeof f === 'string') return LEMON_FREQ[f] ? f : 'week';
    var out = {};
    if (Array.isArray(f)) f.forEach(function (x, i) { if (people[i] && LEMON_FREQ[x]) out[people[i]] = x; });
    else if (f && typeof f === 'object') Object.keys(f).forEach(function (k) { if (LEMON_FREQ[f[k]]) out[String(k).trim()] = f[k]; });
    return Object.keys(out).length ? out : 'week';
  }
  // each person's own "how often" (fq, by name) wins over the job's (f)
  function freqOf(j, who) {
    var hit = null, all = [j.fq, typeof j.f === 'object' ? j.f : null];
    all.forEach(function (o) { if (!hit && o) Object.keys(o).forEach(function (k) { if (!hit && SP.fold(k) === SP.fold(who) && LEMON_FREQ[o[k]]) hit = o[k]; }); });
    return hit || (typeof j.f === 'string' ? j.f : 'week');
  }
  // the one "how often" for One owner per job: the job's own, or the most often anyone does it
  function freqMain(j) {
    var best = typeof j.f === 'string' ? j.f : 'week';
    [j.fq, typeof j.f === 'object' ? j.f : null].forEach(function (o) { if (o) Object.keys(o).forEach(function (k) { if (LEMON_FREQ[o[k]] > LEMON_FREQ[best]) best = o[k]; }); });
    return best;
  }
  // who marked themselves first to notice on a job (each person marks their own), by name
  function noticers(j) { return (j.nm || []).concat(j.nf ? [j.nf] : []).map(function (x) { return SP.fold(x); }); }
  // One tidy shape, whatever the stand sent:
  // { people, by, kids: [names], nights: { name: 1–14 }, agreed: { name: % }, jobs: [{ n, f, u, v, t, nf, home }], own: [{ n, w }] }
  function lemonShape(raw) {
    if (!raw || raw.app !== 'lemonade' || !Array.isArray(raw.people)) return null;
    var people = raw.people.map(lemonReal).filter(Boolean).slice(0, MAX_PEOPLE);
    function obj(o, cap) { var out = {}; if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { var v = lemonNum(o[k]); if (v && (!cap || v <= cap)) out[String(k).trim()] = v; }); return out; }
    var jobs = (Array.isArray(raw.jobs) ? raw.jobs : []).slice(0, 200).filter(function (j) { return j && typeof j === 'object' && !j.p; }).map(function (j) {
      var n = lemonClean(j.n);
      var fq = lemonFreq(j.fq && typeof j.fq === 'object' ? j.fq : null, people);
      return { n: n, f: lemonFreq(j.f, people), fq: typeof fq === 'object' ? fq : null, u: j.u === 'h' ? 'h' : 'm', v: obj(j.v), t: obj(j.t), nf: lemonClean(j.nf, 40),
        nm: (Array.isArray(j.nm) ? j.nm : []).map(function (x) { return lemonClean(x, 40); }).filter(Boolean), home: lemonHome(n, typeof j.c === 'string' ? j.c : '') };
    }).filter(function (j) { return j.n; });
    var own = (Array.isArray(raw.own) ? raw.own : []).slice(0, 40).filter(function (o) { return o && o.n; }).map(function (o) { return { n: lemonClean(o.n), w: lemonClean(o.w, 40) }; });
    var nights = {};
    (Array.isArray(raw.half) ? raw.half : []).forEach(function (nm) { if (lemonReal(nm)) nights[lemonClean(nm, 40)] = 7; });
    var pn = obj(raw.pn, 14); Object.keys(pn).forEach(function (k) { nights[k] = Math.max(1, Math.min(14, Math.round(pn[k]))); });
    var agreed = obj(raw.agreed, 100), as = Object.keys(agreed).reduce(function (a, k) { return a + agreed[k]; }, 0);
    if (Math.abs(as - 100) > 0.5) agreed = {};
    var kids = (Array.isArray(raw.kids) ? raw.kids : []).map(function (k) { return lemonClean(k, 40); }).filter(lemonReal);
    return people.length ? { people: people, jobs: jobs, own: own, by: lemonReal(raw.by), kids: kids, nights: nights, agreed: agreed } : null;
  }
  // A code ("LEMON1:…"), the .json file's text, or a link (…#side=j… plain, #side=z… squeezed). Calls back with the shape or null.
  function lemonRead(text, done) {
    var s = String(text || '').trim(), m, raw = null;
    // a link to this page with the stand in it (…/suite.html#stand=LEMON1:…), as the stand's own button makes
    if ((m = /#stand=(\S+)/.exec(s))) {
      var inner = m[1]; try { inner = decodeURIComponent(inner); } catch (e) {}
      var tries = /^(LEMON1:|TOLHOME1:|\{|#side=)/i.test(inner) ? [inner] : ['LEMON1:' + inner, '#side=' + inner];
      (function next(i) { if (i >= tries.length) return done(null); lemonRead(tries[i], function (d) { if (d) done(d); else next(i + 1); }); })(0);
      return;
    }
    if (/TOLHOME1:/i.test(s)) return done(lemonHome1(s));
    if (s.charAt(0) === '{') { try { raw = JSON.parse(s); } catch (e) { raw = null; } return done(lemonShape(raw) || (raw && Array.isArray(raw.people) && !raw.app ? lemonHome1(s) : null)); }
    if ((m = /LEMON1:\s*([A-Za-z0-9+\/=_-]+)/i.exec(s))) { try { raw = JSON.parse(lemonB64(m[1])); } catch (e) { raw = null; } return done(lemonShape(raw)); }
    if ((m = /#side=([zj])([A-Za-z0-9_-]+)/.exec(s))) {
      var bytes;
      try { var bin = atob(m[2].replace(/-/g, '+').replace(/_/g, '/')); bytes = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); } catch (e) { return done(null); }
      if (m[1] === 'j') { try { raw = JSON.parse(new TextDecoder().decode(bytes)); } catch (e) { raw = null; } return done(lemonShape(raw)); }
      if (typeof DecompressionStream !== 'function') return done(null);
      try {
        new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text().then(function (t) {
          try { done(lemonShape(JSON.parse(t))); } catch (e) { done(null); }
        }, function () { done(null); });
      } catch (e) { done(null); }
      return;
    }
    done(null);
  }
  function lemonFromCode(text) { var out = null; lemonRead(text, function (d) { out = d; }); return out; }
  // The stand on this device: the copy kept with "Keep this on my device" (localStorage), or, when that
  // box was never ticked, the stand's own copy for this tab (sessionStorage). "Save this week" on the stand
  // only writes the tab's copy unless the box is ticked, so both are read; the tab's copy is the newer one.
  function lemonStore() {
    var tab = null, kept = null;
    try { tab = JSON.parse(global.sessionStorage.getItem(LEMON_DRAFT) || 'null'); } catch (e) { tab = null; }
    try { kept = JSON.parse(global.localStorage.getItem(LEMON_KEEP) || 'null'); } catch (e) { kept = null; }
    function real(st) { return st && !st.example && Array.isArray(st.people) && st.people.some(lemonReal) && Array.isArray(st.jobs) && st.jobs.some(function (j) { return j && !j.ex && String(j.name || '').trim(); }) ? st : null; }
    return real(tab) || real(kept);
  }
  function lemonKept() {
    var st = lemonStore();
    if (!st) return null;
    var people = st.people.map(lemonReal);
    if (!people.some(Boolean)) return null;
    var jobs = (Array.isArray(st.jobs) ? st.jobs : []).filter(function (j) { return j && !j.ex && !j.personal && String(j.name || '').trim(); }).map(function (j) {
      var v = {}, t = {};
      people.forEach(function (p, i) { if (!p) return; var a = lemonNum((j.v || [])[i]), b = lemonNum((j.t || [])[i]); if (a) v[p] = a; if (b) t[p] = b; });
      var fq = Array.isArray(j.fq) ? lemonFreq(j.fq, people) : null;
      var nm = Array.isArray(j.nm) ? people.filter(function (p, i) { return p && j.nm[i]; }) : [];
      return { n: lemonClean(j.name), f: lemonFreq(j.freq, people), fq: fq && typeof fq === 'object' ? fq : null, u: j.unit === 'h' ? 'h' : 'm', v: v, t: t, nf: typeof j.nf === 'number' && j.nf >= 0 ? people[j.nf] || '' : '', nm: nm, home: lemonHome(j.name, typeof j.cat === 'string' ? j.cat : '') };
    });
    var own = (Array.isArray(st.owners) ? st.owners : []).filter(function (o) { return o && String(o.name || '').trim(); }).map(function (o) { return { n: lemonClean(o.name), w: o.who >= 0 ? people[o.who] || '' : '' }; });
    var kids = [], nights = {}, agreed = {};
    people.forEach(function (p, i) {
      if (!p) return;
      if (Array.isArray(st.kid) && st.kid[i] === true) kids.push(p);
      var x = Array.isArray(st.part) ? +st.part[i] : 1;
      if (isFinite(x) && x > 0 && x < 1) nights[p] = Math.max(1, Math.round(x * 14));
    });
    if (st.agreed && st.agreed.on && Array.isArray(st.agreed.p)) {
      var sum0 = 0; people.forEach(function (p, i) { var v = parseFloat(st.agreed.p[i]); if (p && isFinite(v) && v > 0) { agreed[p] = v; sum0 += v; } });
      if (Math.abs(sum0 - 100) > 0.5) agreed = {};
    }
    return { people: people.filter(Boolean), jobs: jobs, own: own, by: '', kids: kids, nights: nights, agreed: agreed };
  }

  /* the split a week is compared with: from the stand (the split you agreed, or the nights each person is
     here), kept by name so it follows people whatever order they are in. Shown under the names. */
  function splitOf() {
    var sp = S.split; if (!sp) return null;
    var n = S.names.length, names = S.names.map(function (x) { return SP.fold(x); });
    function byName(o) { var out = names.map(function () { return null; }); Object.keys(o || {}).forEach(function (k) { var i = names.indexOf(SP.fold(k)); if (i >= 0) out[i] = o[k]; }); return out; }
    var ag = byName(sp.agreed), ni = byName(sp.nights);
    var agOk = ag.every(function (x) { return x != null; }) && Math.abs(ag.reduce(function (a, b) { return a + b; }, 0) - 100) <= 0.5;
    if (agOk) return { t: ag.map(function (x) { return x / 100; }), mode: 'agreed', label: 'the split you agreed (' + S.names.map(function (nm, i) { return whoLabel(i) + ' ' + Math.round(ag[i]) + '%'; }).join(', ') + ')' };
    var w = ni.map(function (x) { return x == null ? 1 : x / 14; });
    if (n < 2 || w.every(function (x) { return x === 1; })) return null;
    var ws = w.reduce(function (a, b) { return a + b; }, 0), t = w.map(function (x) { return x / ws; });
    var part = S.names.map(function (nm, i) { return w[i] < 1 ? whoLabel(i) + ' (' + (ni[i] === 7 ? 'half the time' : ni[i] + ' of 14 nights') + ')' : ''; }).filter(Boolean);
    return { t: t, mode: 'part', label: 'a fair share with ' + andList(part) + ' counted for the nights they’re here (' + S.names.map(function (nm, i) { return whoLabel(i) + ' ' + Math.round(t[i] * 100) + '%'; }).join(', ') + ')' };
  }
  WPK.setHousehold && WPK.setHousehold(function () { kidsFit(); return { kids: S.names.map(function (_, i) { return isChild(i); }), target: isSolo() ? null : splitOf() }; });
  function renderSplit() {
    var host = $('ws-split');
    if (!host) { var care = $('ws-care'); if (!care) return; host = h('div', { className: 'ws-split', id: 'ws-split' }); care.parentNode.insertBefore(host, care); }
    host.innerHTML = '';
    var tg = !isSolo() && S.split ? splitOf() : null, sp = S.split;
    var nights = sp ? Object.keys(sp.nights || {}).filter(function (k) { return S.names.some(function (x) { return SP.fold(x) === SP.fold(k); }); }) : [];
    if (!tg && !nights.length) { host.hidden = true; return; }
    host.hidden = false;
    var bits = [];
    if (nights.length) bits.push(andList(nights.map(function (k) { return k + ' is here ' + (sp.nights[k] === 7 ? 'half the time' : sp.nights[k] + ' of 14 nights'); })));
    if (tg) bits.push('each week is read against ' + tg.label);
    host.appendChild(h('p', { className: 'ws-split-t', text: cap1(bits.join('; ')) + '.' }));
    host.appendChild(h('button', { type: 'button', className: 'ws-link', 'data-split-forget': '1', text: 'Use an even split instead' }));
  }

  // On a phone, plain words instead of codes and decimals in what is shown ("Who owns which job", not
  // "WP-03"; "high load (0.75)", not "0.75"). The codes stay on wider screens, in the PDFs and the files.
  function phone() { return !!(global.matchMedia && global.matchMedia('(max-width: 640px)').matches); }
  function codeWord(code) { return phone() ? SP.nameOf(code) : code; }
  function loadWords(x) { x = Math.round(x * 100 + 1e-7) / 100; return x >= 0.8 ? 'very high load' : x >= 0.6 ? 'high load' : x >= 0.45 ? 'medium load, on the heavier side' : x >= 0.3 ? 'medium load, on the lighter side' : x >= 0.15 ? 'light load' : 'very light load'; }
  /* ------------------------------------------------------------ the whole road as a link (#suite=…) */
  // "Send it to my partner as a link": the progress file, squeezed (deflate) where the browser can, after
  // the "#" of a link to this page. A browser never sends that part to any website. Opening the link
  // brings it in like a file. Each change needs a new link, made fresh when the button is tapped.
  var SUITE_HASH = '#suite=', suiteLink = { sig: '', url: '' }, suiteTimer = null;
  function b64u(bytes) { var bin = ''; for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(str) { var t = String(str || '').replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '='; var bin = atob(t), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function suiteBase() { return global.location.origin + global.location.pathname + SUITE_HASH; }
  function suiteJson() { var o = snapshot(true, !linkPrivate); o.saved = String(o.saved || "").slice(0, 10); return JSON.stringify(o); }
  // Personal notes stay out of a link unless the person ticks "Include private notes": the note on How much
  // are you carrying?, and the Calm-Down Kit apart from the pause plan you agree together.
  var linkPrivate = false;
  var KIT_SHARED = { name: 1, date: 1, planWord: 1, planMin: 1, planBack: 1, planFirst: 1 };
  function personalOut(code, st) {
    if (code !== 'WP-02' && code !== 'WP-11') return st;
    var out = JSON.parse(JSON.stringify(st));
    if (code === 'WP-02') delete out.values.note;
    else {
      Object.keys(out.values).forEach(function (k) { if (!KIT_SHARED[k]) delete out.values[k]; });
      out.tables = {};
    }
    return out;
  }
  function suiteLinkPlain() { var j = suiteJson(); return { sig: j, url: suiteBase() + 'j' + b64u(new TextEncoder().encode(j)) }; }
  // the squeezed link, made a moment after each change, so it is ready by the time someone taps Send
  function suiteLinkSoon() {
    clearTimeout(suiteTimer);
    suiteTimer = setTimeout(function () {
      if (!S.path || typeof CompressionStream !== 'function') return;
      var j = suiteJson();
      if (j === suiteLink.sig) return;
      try {
        new Response(new Blob([new TextEncoder().encode(j)]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer().then(function (buf) {
          suiteLink = { sig: j, url: suiteBase() + 'z' + b64u(new Uint8Array(buf)) };
          // a road too long for a QR code: the QR button steps aside, the link still goes
          var qb = $('ws-qr'); if (qb && global.TOLShareKit && global.TOLShareKit.qrFits) qb.hidden = !global.TOLShareKit.qrFits(suiteLink.url);
        }, function () {});
      } catch (e) {}
    }, 700);
  }
  function suiteFromHash(hs, done) {
    var m = /#suite=([zj])([A-Za-z0-9_-]+)/.exec(String(hs || ''));
    if (!m) return done(null);
    var bytes; try { bytes = unb64u(m[2]); } catch (e) { return done(null); }
    if (m[1] === 'j') { try { return done(new TextDecoder().decode(bytes)); } catch (e) { return done(null); } }
    if (typeof DecompressionStream !== 'function') return done(null);
    try { new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text().then(function (t) { done(t); }, function () { done(null); }); } catch (e) { done(null); }
  }
  function takeSuiteText(text, where) {
    var d = null; try { d = JSON.parse(text); } catch (e) { d = null; }
    if (!d || d.format !== SUITE_FORMAT || !Array.isArray(d.entries)) return false;
    if (where === 'link') turnWait = d;
    var f; try { f = new File([text], 'suite-from-a-link.json', { type: 'application/json' }); } catch (e) { f = new Blob([text], { type: 'application/json' }); f.name = 'suite-from-a-link.json'; }
    takeFiles([f]);
    return true;
  }
  function readSuiteHash() {
    var hs = global.location.hash || '';
    if (!/^#suite=/.test(hs)) return;
    try { global.history.replaceState(null, '', global.location.pathname + global.location.search); } catch (e) {}
    suiteFromHash(hs, function (t) { if (!t || !takeSuiteText(t, 'link')) say('That link looks incomplete. Ask for it again, or ask for the progress file instead.'); });
  }
  // "Your turn": someone's road opened from their link. At the top: what they shared, which sheets are
  // yours to fill in, and a way to send it back. Shown once the sheets are in.
  var turnWait = null;
  function yourTurn(d) {
    var old = $('ws-turn'); if (old) old.remove();
    if (!d || !S.path) return;
    var by = String(d.by || '').trim(), byK = SP.fold(by);
    var shared = {}, mine = [], seen = {};
    (d.entries || []).forEach(function (x) { if (x && x.workpaper) shared[x.workpaper] = 1; });
    var me = S.names.map(function (x, i) { return i; }).filter(function (i) { return String(S.names[i] || '').trim() && SP.fold(S.names[i]) !== byK && !isChild(i); });
    S.stops.forEach(function (st) {
      if (seen[st.wp]) return;
      if (perPerson(st.wp)) {
        me.forEach(function (i) { if (!st.entries.some(function (en) { return personOf(en) === i && filled(en); })) { seen[st.wp] = 1; mine.push({ st: st, person: i, label: SP.nameOf(st.wp) + (me.length > 1 ? ' (' + whoLabel(i) + ')' : '') }); } });
      } else if (st.wp === 'WP-01' || st.wp === 'WP-13') { seen[st.wp] = 1; mine.push({ st: st, label: SP.nameOf(st.wp) + ': your own rows' }); }
    });
    var names = Object.keys(shared).map(function (c) { return SP.nameOf(c); });
    var box = h('div', { className: 'ws-lemon-offer ws-turn tol-plain no-bubble', id: 'ws-turn', role: 'group', 'aria-labelledby': 'ws-turn-h', tabindex: '-1' });
    box.appendChild(h('p', { id: 'ws-turn-h' }, [h('strong', { text: 'Your turn' + (me.length === 1 ? ', ' + whoLabel(me[0]) : '') })]));
    box.appendChild(h('p', { text: (by ? by + ' shared' : 'This link brought in') + ' ' + (names.length ? andJoin(names) : 'their road') + '. It\u2019s on this device now, and nothing was sent anywhere.' }));
    if (mine.length) {
      box.appendChild(h('p', { text: 'Yours to fill in:' }));
      var ul = h('ul', { className: 'ws-turn-list' });
      mine.slice(0, 6).forEach(function (m) { ul.appendChild(h('li', null, [h('button', { type: 'button', className: 'ws-link', 'data-turn-open': m.st.key, 'data-turn-person': m.person != null ? String(m.person) : '', text: m.label })])); });
      box.appendChild(ul);
    }
    box.appendChild(h('div', { className: 'ws-lemon-offer-btns' }, [
      h('button', { type: 'button', className: 'ws-go', 'data-turn': 'send', text: 'Send it back' + (by ? ' to ' + by : '') }),
      h('button', { type: 'button', className: 'wpf-add', 'data-turn': 'close', text: 'Close' })]));
    box.appendChild(h('p', { className: 'ws-sub', text: 'Fill in your parts first, then send it back. The link carries the whole road, with your answers added.' }));
    box.addEventListener('click', function (e) {
      var o = e.target.closest('[data-turn-open]');
      if (o) { var pa = o.getAttribute('data-turn-person'); openSheet(o.getAttribute('data-turn-open'), '', pa === '' ? null : pa); return; }
      var b = e.target.closest('[data-turn]'); if (!b) return;
      if (b.getAttribute('data-turn') === 'close') { box.remove(); return; }
      var send = $('ws-send'); if (send) send.click();
    });
    var step = $('ws-step-choose'), sub = step && step.querySelector('.ws-sub');
    if (sub) sub.parentNode.insertBefore(box, sub.nextSibling); else if (step) step.appendChild(box);
    setTimeout(function () { if (box.scrollIntoView) box.scrollIntoView({ block: 'center' }); box.focus({ preventScroll: true }); }, 80);
  }
  // Step 4, without a file: a link or code pasted in (a shared list or week, a whole road, a Lemonade Stand)
  function pasteIn() {
    var box = $('ws-paste-in'), note = $('ws-paste-note'), text = box ? box.value.trim() : '';
    function tell(m) { if (note) { note.textContent = ''; setTimeout(function () { note.textContent = m; }, 30); } }
    if (!text) { tell('Paste the whole link or code first.'); if (box) box.focus(); return; }
    if (/#suite=/.test(text)) { suiteFromHash(text, function (t) { if (t && takeSuiteText(t)) { box.value = ''; tell('Brought in the road from the link. Check it below.'); } else tell('That link looks incomplete. Copy the whole thing, from https to the end.'); }); return; }
    var d = WPK.readShared ? WPK.readShared(text) : null;
    if (d && schema(d.wp)) { box.value = ''; tell('Opening ' + SP.nameOf(d.wp) + ' from the link. Choose to combine it with what is here, or replace it.'); openShared(d); return; }
    if (/LEMON1:|TOLHOME1:|#side=|#stand=/i.test(text)) { lemonRead(text, function (ld) { if (!ld) { tell(LEMON_HOWTO); return; } box.value = ''; tell('That is a Lemonade Stand. It is waiting at the top of the page.'); lemonOffer(ld, { by: ld.by, saved: WPK.today(), file: 'Lemonade Stand code' }); }); return; }
    tell('That doesn\u2019t look like a shared list, week or road. On the other phone, tap \u201cShare this list\u201d (or \u201cShare this week\u201d) and send the link, then paste the whole link here.');
  }
  function shortToggle(on) {
    S.short = !!on; renderFocus(); renderRoad();
    say(on ? 'Showing just the two call sheets: who starts which calls, and the daily check-in. Nothing else is removed.' : 'Showing the whole road again.');
    var f = document.querySelector('.ws-short-b'); if (f) f.focus();
  }
  function cap1(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }
  function splitClean(x) {
    if (!x || typeof x !== 'object') return null;
    var out = { nights: {}, agreed: {} };
    ['nights', 'agreed'].forEach(function (k) { var o = x[k]; if (o && typeof o === 'object') Object.keys(o).slice(0, MAX_PEOPLE).forEach(function (nm) { var v = parseFloat(o[nm]); if (isFinite(v) && v > 0 && v <= (k === 'nights' ? 14 : 100)) out[k][String(nm).slice(0, 40)] = v; }); });
    return Object.keys(out.nights).length || Object.keys(out.agreed).length ? out : null;
  }
  function fromClean(f) {
    var o = {};
    ['by', 'saved', 'file'].forEach(function (k) { if (typeof f[k] === 'string') o[k] = f[k].slice(0, 80); });
    if (f.lemon) o.lemon = 1;
    // the jobs that came in from the stand without an owner (listed there, not picked yet)
    if (Array.isArray(f.unpicked)) o.unpicked = f.unpicked.slice(0, 200).filter(function (x) { return typeof x === 'string'; }).map(function (x) { return x.slice(0, 120); });
    return o;
  }
  // The sheets the stand fills in carry from.lemon, so bringing the stand in again updates them in place.
  function lemonEntry(code) {
    var hit = null;
    S.stops.forEach(function (st) { if (st.wp === code) st.entries.forEach(function (en) { if (!hit && en.from && en.from.lemon) hit = { st: st, en: en }; }); });
    return hit;
  }
  function sheetName(hit) { var i = hit.st.entries.indexOf(hit.en); return hit.en.label || 'Sheet ' + (i + 1); }
  function baseTask(t) { return SP.fold(String(t || '').replace(/\s*\((?:each day|each weekday|3 times a week|twice a week|every other week|each month|noticing and planning)\)\s*$/i, '').replace(/\s*\((?:each day|each weekday|3 times a week|twice a week|every other week|each month|noticing and planning)\)\s*$/i, '')); }
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
    var made = [], extra = [];
    // who is a child, the nights each person is here, the split you agreed: carried over by name
    var kidsNow = [];
    if (kidsOn()) { kidsFit(); d.kids.forEach(function (k) { var i = here().indexOf(SP.fold(k)); if (i >= 0 && !S.kids[i]) { S.kids[i] = true; kidsNow.push(k); } }); }
    if (kidsNow.length) extra.push(andList(kidsNow) + ' marked as ' + (kidsNow.length === 1 ? 'a child' : 'children'));
    var hadSplit = JSON.stringify(S.split || null);
    if (Object.keys(d.nights).length || Object.keys(d.agreed).length) {
      S.split = { nights: {}, agreed: {} };
      Object.keys(d.nights).forEach(function (k) { S.split.nights[k] = d.nights[k]; });
      Object.keys(d.agreed).forEach(function (k) { S.split.agreed[k] = d.agreed[k]; });
    }
    if (JSON.stringify(S.split || null) !== hadSplit && S.split) {
      var tg0 = splitOf();
      if (Object.keys(S.split.nights).length) extra.push('nights here (' + Object.keys(S.split.nights).map(function (k) { return k + ' ' + (S.split.nights[k] === 7 ? 'half the time' : S.split.nights[k] + ' of 14'); }).join(', ') + ')');
      if (tg0 && tg0.mode === 'agreed') extra.push(tg0.label);
    }
    // a week of Who did what, from each person's hours on the home jobs (the ones the stand counts in the split)
    var sides = {}, rows = [];
    d.jobs.forEach(function (j) {
      if (!j.home) return;
      var word = '';
      function push(task, who, mins, how) {
        // a row holds at most a whole day (1,440 minutes): a bigger week is split over a few rows
        var parts = Math.max(1, Math.ceil(mins / 1440));
        for (var k = 0; k < parts; k++) { var r = { task: task, who: who, minutes: String(Math.round(mins / parts)) }; if (how) r.how = how; rows.push(r); }
      }
      Object.keys(j.v).forEach(function (who) {
        var c = codeOf(who); if (!c) return;
        var f = freqOf(j, who); word = LEMON_WORD[f];
        var mins = j.v[who] * (j.u === 'h' ? 60 : 1) * LEMON_FREQ[f];
        if (mins >= 1) { sides[c] = 1; push(j.n + (word ? ' (' + word + ')' : ''), c, mins, noticers(j).indexOf(SP.fold(who)) >= 0 ? 'Noticed and handled' : ''); }
      });
      Object.keys(j.t).forEach(function (who) {
        var c = codeOf(who); if (!c) return;
        var mins = j.t[who] * LEMON_FREQ[freqOf(j, who)];
        if (mins >= 1) { sides[c] = 1; push(j.n + ' (noticing and planning)', c, mins, 'Thinking and planning'); }
      });
    });
    var sideNames = Object.keys(sides).map(function (c) { return whoLabel(WPK.CODES.indexOf(c)); });
    // whose sides actually came in (a stand both people added to carries both, whoever sent it)
    var sideWord = sideNames.length ? andList(sideNames.map(function (x) { return x + '’s'; })).replace(/ & /, ' and ') + (sideNames.length === 1 ? ' side' : ' sides') : d.by ? d.by + '’s side' : '';
    var hasWp01 = S.stops.some(function (st) { return st.wp === 'WP-01'; }) && !isSolo();
    if (rows.length && hasWp01) {
      var h1 = lemonEntry('WP-01');
      if (h1) {
        // in place: each side that came in replaces its own rows from the stand; anything typed here stays
        var names1 = {}; d.jobs.forEach(function (j) { names1[SP.fold(j.n)] = 1; });
        var keep1 = (h1.en.state.tables.audit || []).filter(function (r) { return !(r && sides[r.who] && names1[baseTask(r.task)]) && !(r && WPK.rowIsEmpty(schema('WP-01').sections[0], r)); });
        h1.en.state.tables.audit = keep1.concat(rows);
        h1.en.from.saved = from.saved;
        made.push('Updated ' + SP.nameOf('WP-01') + ' (' + sheetName(h1) + ') with ' + sideWord);
      } else {
        var e1 = newEntry('WP-01'); e1.state.tables.audit = rows; e1.from = { by: from.by, saved: from.saved, file: from.file, lemon: 1 };
        if (place(e1)) made.push(SP.nameOf('WP-01') + ' (' + rows.length + ' rows for one week, ' + sideWord + ')');
      }
    }
    // One owner per job: every job from the stand, with its owner when the stand has one, and how often it comes up
    var owner = {}; d.own.forEach(function (o) { if (o.w) owner[SP.fold(o.n)] = o.w; });
    var seen = {}, jobs = [];
    d.jobs.concat(d.own.map(function (o) { return { n: o.n, f: 'week' }; })).forEach(function (j) {
      var k = SP.fold(j.n), jk = WPK.jobKey(j.n); if (seen[jk]) return; seen[jk] = 1;
      var r = { task: j.n, freq: LEMON_OFTEN[freqMain(j)] || 'Weekly' }, c = owner[k] ? codeOf(owner[k]) : '';
      if (c) r.r = c;
      jobs.push(r);
    });
    if (jobs.length && S.stops.some(function (st) { return st.wp === 'WP-03'; })) {
      var h3 = lemonEntry('WP-03');
      if (h3) {
        var t3 = h3.en.state.tables.treaty || (h3.en.state.tables.treaty = []), sec3 = schema('WP-03').sections.filter(function (x) { return x.id === 'treaty'; })[0], nNew = 0, nSet = 0;
        jobs.forEach(function (r) {
          var hit = t3.filter(function (x) { return x && x.task && WPK.jobKey(x.task) === WPK.jobKey(r.task); })[0];
          if (!hit) { var slot = t3.filter(function (x) { return x && WPK.rowIsEmpty(sec3, x); })[0]; if (slot) Object.keys(r).forEach(function (k) { slot[k] = r[k]; }); else t3.push(r); nNew++; return; }
          if (r.r && !hit.r) { hit.r = r.r; nSet++; }
          if (r.freq && !hit.freq) hit.freq = r.freq;
        });
        var up0 = Array.isArray(h3.en.from.unpicked) ? h3.en.from.unpicked : [];
        jobs.forEach(function (r) { if (!r.r && up0.indexOf(r.task) < 0) up0.push(r.task); });
        h3.en.from.unpicked = up0.filter(function (t) { var hit = t3.filter(function (x) { return x && SP.fold(x.task) === SP.fold(t); })[0]; return hit && !hit.r && !hit.a; }).slice(0, 200);
        made.push('Updated ' + SP.nameOf('WP-03') + ' (' + sheetName(h3) + ')' + (nNew || nSet ? ': ' + [nNew ? nNew + ' new ' + (nNew === 1 ? 'job' : 'jobs') : '', nSet ? nSet + ' owner' + (nSet === 1 ? '' : 's') + ' filled in' : ''].filter(Boolean).join(', ') : ', nothing new on it'));
      } else {
        var e3 = newEntry('WP-03'); e3.state.tables.treaty = jobs; e3.from = { by: from.by, saved: from.saved, file: from.file, lemon: 1, unpicked: jobs.filter(function (r) { return !r.r; }).map(function (r) { return r.task; }).slice(0, 200) };
        var nOwn = jobs.filter(function (r) { return r.r; }).length;
        if (place(e3)) made.push(SP.nameOf('WP-03') + ' (' + (nOwn ? 'you picked owners for ' + nOwn + (nOwn === 1 ? ' job' : ' jobs') + '; ' + (jobs.length - nOwn) + ' more listed, without an owner yet' : jobs.length + ' jobs listed, without an owner yet') + ')');
      }
    }
    syncAllNames(); syncRoadPeople(); renderNames(); renderRoad(); changed();
    // who hasn't added their side to the stand yet (children are never waited for)
    var wait = hasWp01 && rows.length ? S.names.map(function (nm, i) { return i; }).filter(function (i) {
      if (isChild(i) || !String(S.names[i] || '').trim()) return false;
      var e = lemonEntry('WP-01'); return e && !(e.en.state.tables.audit || []).some(function (r) { return r && r.who === WPK.CODES[i]; });
    }).map(whoLabel) : [];
    var waitLine = wait.length ? ' Waiting for ' + andList(wait.map(function (x) { return x + '’s'; })) + (wait.length === 1 ? ' side' : ' sides') + ': bring in ' + (wait.length === 1 ? wait[0] + '’s' : 'their') + ' Lemonade Stand code here too, and this sheet is updated.' : '';
    if (!made.length && !added.length && !extra.length) return 'Nothing new to bring in: those names and jobs are already on your road.' + waitLine;
    var parts = [];
    if (added.length) parts.push('the names ' + andList(added));
    parts = parts.concat(extra, made);
    return 'Brought in from your Lemonade Stand: ' + parts.join('; ') + '.' + waitLine + ' Check them, then change anything on the sheets.';
  }
  function lemonRender() {
    var host = $('ws-lemon'); if (!host) return;
    var kb = $('ws-lemon-kept'); if (kb) kb.hidden = !lemonKept();
  }
  // What a stand holds, in a line, before it comes in: "Maya and Jordan; hours on 23 jobs, from Maya's and
  // Jordan's sides; 5 jobs with an owner"
  function lemonSummary(d) {
    var sides = d.people.filter(function (p) { return d.jobs.some(function (j) { return j.home && ((j.v[p] || 0) > 0 || (j.t[p] || 0) > 0); }); });
    var withHours = d.jobs.filter(function (j) { return j.home && Object.keys(j.v).concat(Object.keys(j.t)).length; }).length;
    var owned = d.own.filter(function (o) { return o.w; }).length, bits = [andList(d.people).replace(/ & /, ' and ')];
    if (withHours) bits.push('hours on ' + withHours + (withHours === 1 ? ' job' : ' jobs') + ', from ' + andList(sides.map(function (x) { return x + '’s'; })).replace(/ & /, ' and ') + (sides.length === 1 ? ' side' : ' sides'));
    else if (d.jobs.length) bits.push(d.jobs.length + (d.jobs.length === 1 ? ' job' : ' jobs') + (d.home1 ? ' (no hours: a household code carries just the names and jobs)' : ''));
    if (owned) bits.push(owned + (owned === 1 ? ' job' : ' jobs') + ' with an owner');
    return bits.join('; ');
  }
  // the road a stand goes onto when none is picked yet: Family with a child or three grown-ups, else Partners
  function lemonRoad(d) { return d.kids.length || d.people.length > 2 ? 'family' : 'partners'; }
  // "Bring in your Lemonade Stand?": a stand that came in through a link (#stand=…) waits here until the
  // person says yes. Nothing is brought in, and nothing is kept, before that.
  var lemonWait = null;
  function lemonOffer(d, from) {
    var old = $('ws-lemon-offer'); if (old) old.remove();
    lemonWait = d ? { d: d, from: from } : null;
    if (!d) return;
    var road = S.path ? null : pathById(lemonRoad(d));
    var box = h('div', { className: 'ws-lemon-offer tol-plain no-bubble', id: 'ws-lemon-offer', role: 'group', 'aria-labelledby': 'ws-lemon-offer-h', tabindex: '-1' });
    box.appendChild(h('p', { className: 'ws-lemon-offer-h', id: 'ws-lemon-offer-h' }, [h('strong', { text: 'Bring in your Lemonade Stand?' })]));
    box.appendChild(h('p', { text: 'From your stand: ' + lemonSummary(d) + '. It fills in your names' + (d.jobs.some(function (j) { return j.home && Object.keys(j.v).length; }) ? ', a week of Who did what' : '') + ' and One owner per job. Nothing is sent anywhere.' }));
    if (road) box.appendChild(h('p', { className: 'ws-sub', text: 'It goes onto the ' + road.label + ' road. You can pick a different road any time; what comes in moves with you.' }));
    box.appendChild(h('div', { className: 'ws-lemon-offer-btns' }, [
      h('button', { type: 'button', className: 'ws-go', 'data-lemon-offer': 'yes', text: 'Bring it in' }),
      h('button', { type: 'button', className: 'wpf-add', 'data-lemon-offer': 'no', text: 'Not now' })]));
    var step = $('ws-step-choose'), sub = step && step.querySelector('.ws-sub');
    if (sub) sub.parentNode.insertBefore(box, sub.nextSibling); else if (step) step.appendChild(box);
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lemon-offer]'); if (!b || !lemonWait) return;
      var w = lemonWait; lemonOffer(null);
      standWait(null);
      if (b.getAttribute('data-lemon-offer') === 'no') { say('Not brought in. To bring it in later, open the link again, or paste the code under “Bring in our Lemonade Stand”.'); return; }
      if (!S.path) { setPath(lemonRoad(w.d), null); changed(); }
      var msg = lemonBring(w.d, w.from), det = $('ws-lemon'), note = $('ws-lemon-note');
      if (det) det.open = true;
      if (note) note.textContent = msg;
      say(msg);
      var t = det || $('ws-names'); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'nearest' });
    });
    setTimeout(function () { if (box.scrollIntoView) box.scrollIntoView({ block: 'center' }); box.focus({ preventScroll: true }); }, 60);
  }
  // …/suite.html#stand=LEMON1:… ("Use this in my Workpaper Suite" on the stand): read here, on this device,
  // then the address is tidied straight away so the stand doesn't stay in the address bar or the history.
  // A stand still waiting for "Bring it in" or "Not now" is kept for this tab only (sessionStorage), so a
  // reload doesn't lose the offer. It goes as soon as either is pressed, or the tab is closed.
  var STAND_WAIT = 'tol-suite-stand-wait';
  function standWait(hs) {
    try { if (hs) global.sessionStorage.setItem(STAND_WAIT, hs); else global.sessionStorage.removeItem(STAND_WAIT); } catch (e) {}
  }
  function readStandHash() {
    var hs = global.location.hash || '';
    if (!/^#stand=/.test(hs)) {
      try { hs = global.sessionStorage.getItem(STAND_WAIT) || ''; } catch (e) { hs = ''; }
      if (!/^#stand=/.test(hs)) return;
    } else standWait(hs);
    try { global.history.replaceState(null, '', global.location.pathname + global.location.search); } catch (e) {}
    lemonRead(hs, function (d) {
      if (!d) { standWait(null); say(LEMON_HOWTO); return; }
      lemonOffer(d, { by: d.by, saved: WPK.today(), file: 'Lemonade Stand link' });
    });
  }
  var LEMON_HOWTO = 'That doesn’t look like a Lemonade Stand code. On the Lemonade Stand, tap “Use this in my Workpaper Suite”, or copy its whole code (it starts with LEMON1: or TOLHOME1:) or the whole link, and paste it here.';

  /* ------------------------------------------------------------ keep a draft on this device (opt-in) */

  // Whose file this is, when the sheets show it: the one person whose own sheets (a load score, a kit)
  // were filled in on this device rather than brought in. Used only for "from Diego's file" in the report.
  function deviceOwner() {
    var mine = {};
    S.stops.forEach(function (st) { st.entries.forEach(function (en) { if (!en.from && filled(en) && perPerson(en.workpaper)) { var p = personOf(en); if (p != null) mine[p] = 1; } }); });
    // no sheet of their own yet: the one person whose daily check-in rows were written on this device
    if (!Object.keys(mine).length) S.stops.forEach(function (st) {
      st.entries.forEach(function (en) {
        var sc = schema(en.workpaper);
        if (en.from || !sc || !sc.people) return;
        sc.sections.forEach(function (sec) {
          if (sec.type !== 'table' || !sec.personDays) return;
          (en.state.tables[sec.id] || []).forEach(function (r) { var i = WPK.CODES.indexOf(r && r.who); if (i >= 0 && !WPK.rowIsEmpty(sec, r)) mine[i] = 1; });
        });
      });
    });
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
  function snapshot(forFile, noPersonal) {
    var entries = [];
    S.stops.forEach(function (st) { st.entries.forEach(function (en) { if (filled(en) || en.label) entries.push({ workpaper: en.workpaper, label: en.label, sid: en.sid || undefined, stop: st.key, person: typeof en.person === 'number' ? en.person : undefined, from: en.from || undefined, state: forFile ? (noPersonal ? personalOut(en.workpaper, shareable(en)) : shareable(en)) : en.state }); }); });
    var out = { format: SUITE_FORMAT, version: 1, path: S.path ? S.path.id : null, names: S.names.slice(), saved: new Date().toISOString(), entries: entries };
    var by = deviceOwner(); if (by) out.by = by;
    if (kidsOn()) { kidsFit(); if (S.kids.some(Boolean)) out.kids = S.kids.slice(); }
    if (S.split) out.split = S.split;
    if (S.variant) out.variant = S.variant;
    if (Array.isArray(S.focusEach)) out.focusEach = S.focusEach.slice(0, MAX_PEOPLE);
    return out;
  }
  function changed() {
    S.dirty = true;
    refreshDynamic();
    suiteLinkSoon();
    if (suiteAsk) suiteAsk();
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
    if (WPK.keepOff) WPK.keepOff('suite', true);
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
    var groups = [], shortOn = !!S.short && S.variant === 'apart';
    var old = $('ws-short-note'); if (old) old.remove();
    if (shortOn) road.parentNode.insertBefore(h('p', { className: 'ws-short-note', id: 'ws-short-note' }, ['Just the two call sheets: who starts which calls, and the 90-second check-in. About five minutes, together on a call. ', h('button', { type: 'button', className: 'ws-link', 'data-short': 'off', text: 'Show the whole road' })]), road);
    S.stops.forEach(function (st) {
      if (shortOn && st.wp !== 'WP-03' && st.wp !== 'WP-13') return;
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
          h('p', { className: 'ws-stop-code' }, [(phone() ? '' : st.wp + (done ? ' · ' : '')) + (done ? done + (done === 1 ? ' sheet filled' : ' sheets filled') : ''), st.optional ? ' ' : null, st.optional ? h('span', { className: 'ws-optional', text: 'Optional' }) : null]),
          h('h3', { className: 'ws-stop-name', text: SP.nameOf(st.wp) }),
          h('p', { className: 'ws-stop-why', text: st.why }),
          PATHS.read && PATHS.read[st.wp] ? h('a', { className: 'ws-read', href: PATHS.read[st.wp], text: (phone() ? 'Read about it first' : 'Read about ' + st.wp + ' first') + ' \u2192' }) : null
        ]);
        if (S.removed && S.removed.key === st.key) body.appendChild(h('p', { className: 'wpf-undo' }, [h('span', { text: 'Removed ' + S.removed.label + '. ' }), h('button', { type: 'button', className: 'wpf-add', 'data-undo-sheet': '1', text: 'Undo' })]));
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
          var cmp = st.wp === 'WP-03' ? compareLists(st) : null;
          if (cmp) body.appendChild(cmp);
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
          h('span', { className: 'ws-sheet-meta', text: a ? a + (a === 1 ? ' answer' : ' answers') + (st.wp === 'WP-02' && SP.metric(en) != null ? ' · ' + loadWords(SP.metric(en)) + ' (' + Math.round(SP.metric(en) * 20) + ' of 20 points)' : '') : '✎' })
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
  // Two (or more) lists of One owner per job, side by side: "You both said" where the lists agree, and
  // "You differ" where one list has a job the other hasn't, or names another owner, or says it another way.
  // Nothing is changed on either list; it is only there to talk through.
  var CMP_SKIP = { the: 1, and: 1, for: 1, with: 1, our: 1, your: 1, each: 1, other: 1, from: 1, into: 1, that: 1, this: 1 };
  function cmpWords(t) { return SP.fold(t).replace(/[\u2019']s\b/g, '').split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 3 && !CMP_SKIP[w]; }).map(function (w) { return w.replace(/(ings?|es|s)$/, ''); }).filter(function (w) { return w.length >= 3; }); }
  function cmpSame(a, b) {
    if (SP.fold(a) === SP.fold(b)) return true;
    var x = cmpWords(a), y = cmpWords(b), both = x.filter(function (w) { return y.indexOf(w) >= 0; }).length;
    return both >= 2 || (both === 1 && Math.max(x.length, y.length) <= 2);
  }
  function compareLists(st) {
    var sc = schema(st.wp), sec = sc && sc.sections.filter(function (x) { return x.id === 'treaty'; })[0];
    if (!sec) return null;
    var lists = st.entries.filter(filled).map(function (en, k) {
      var rows = (en.state.tables.treaty || []).filter(function (r) { return r && String(r.task || '').trim() && !WPK.rowIsEmpty(sec, r) && !WPK.isExampleRow(sec, r); });
      var whose = en.from && en.from.by ? en.from.by : !en.from && deviceOwner() ? deviceOwner() : en.label || 'Sheet ' + (k + 1);
      return { en: en, rows: rows, whose: whose };
    }).filter(function (l) { return l.rows.length; });
    if (lists.length < 2) return null;
    lists = lists.slice(0, 3);
    function who(code) { var i = WPK.CODES.indexOf(code); return code === 'Both' ? 'everyone' : i >= 0 ? whoLabel(i) : ''; }
    function says(r) { return [who(r.r) ? who(r.r) + ' owns it' : 'no owner yet', r.a && who(r.a) ? who(r.a) + ' helps' : '', r.freq ? String(r.freq).toLowerCase() : '', String(r.notes || '').trim() ? '\u201c' + String(r.notes).trim() + '\u201d' : ''].filter(Boolean).join(', '); }
    var used = lists.map(function () { return {}; }), same = [], differ = [];
    lists[0].rows.forEach(function (r0, i0) {
      var hits = lists.slice(1).map(function (l, k) { var j = -1; l.rows.forEach(function (r, ri) { if (j < 0 && !used[k + 1][ri] && cmpSame(r0.task, r.task)) j = ri; }); if (j >= 0) used[k + 1][j] = 1; return j >= 0 ? l.rows[j] : null; });
      used[0][i0] = 1;
      var all = [r0].concat(hits);
      var agree = hits.every(function (r) { return r && (r.r || '') === (r0.r || '') && (r.a || '') === (r0.a || '') && SP.fold(r.notes) === SP.fold(r0.notes) && SP.fold(r.task) === SP.fold(r0.task); });
      if (agree) same.push(String(r0.task).trim() + ': ' + says(r0));
      else differ.push({ task: String(r0.task).trim(), sides: all.map(function (r, k) { return lists[k].whose + ': ' + (r ? (SP.fold(r.task) !== SP.fold(r0.task) ? '\u201c' + String(r.task).trim() + '\u201d, ' : '') + says(r) : 'not on this list'); }) });
    });
    lists.forEach(function (l, k) {
      if (!k) return;
      l.rows.forEach(function (r, ri) { if (!used[k][ri]) differ.push({ task: String(r.task).trim(), sides: lists.map(function (l2, k2) { return l2.whose + ': ' + (k2 === k ? says(r) : 'not on this list'); }) }); });
    });
    var det = h('details', { className: 'ws-compare' }, [h('summary', { text: 'See ' + (lists.length === 2 ? 'both lists' : 'the lists') + ' side by side (' + lists.map(function (l) { return l.whose; }).join(' and ') + ')' })]);
    det.appendChild(h('p', { className: 'ws-compare-note', text: 'Matched by the name of each job. Nothing is changed on either list. Where you differ is a good place to start, not a problem.' }));
    if (same.length) {
      det.appendChild(h('p', { className: 'ws-compare-h', text: 'You both said' }));
      det.appendChild(h('ul', { className: 'ws-compare-list' }, same.map(function (t) { return h('li', { text: t }); })));
    }
    if (differ.length) {
      det.appendChild(h('p', { className: 'ws-compare-h', text: 'You differ' }));
      det.appendChild(h('ul', { className: 'ws-compare-list' }, differ.map(function (d) { return h('li', null, [h('strong', { text: d.task }), h('span', { className: 'ws-compare-sides' }, d.sides.map(function (x) { return h('span', { text: x }); }))]); })));
    } else det.appendChild(h('p', { className: 'ws-compare-note', text: 'Your lists say the same thing.' }));
    return det;
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
    if (missing.length === who.length) return 'The shared average appears here once everyone has filled in their own.';
    if (missing.length) return 'Shared average: waiting on ' + missing.map(whoLabel).join(', ') + '. It is never worked out while anyone\u2019s is missing.';
    var avg = latest.reduce(function (a, b) { return a + b; }, 0) / latest.length;
    return 'Shared average of everyone\u2019s latest: ' + loadWords(avg) + ' (' + (Math.round(avg * 100 + 1e-7) / 100).toFixed(2) + (latest.length === 2 ? ', both in)' : ', all ' + latest.length + ' in)') + '.';
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
                h('span', { className: 'ws-sheet-label', text: (phone() ? '' : code + ' ') + SP.nameOf(code) + ' · ' + whoLabel(i) }), h('span', { className: 'ws-sheet-meta', text: done1 ? '\u2713' : '\u270E' })]));
            });
            return;
          }
          var done = st.entries.some(filled);
          var b = h('button', { type: 'button', className: 'ws-sheet-btn' + (done ? ' is-filled' : ''), 'data-open': st.key, 'data-entry': st.entries[0] ? st.entries[0].id : '' }, [
            h('span', { className: 'ws-sheet-label', text: (phone() ? '' : code + ' ') + SP.nameOf(code) }), h('span', { className: 'ws-sheet-meta', text: done ? '\u2713' : '\u270E' })]);
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
    S.removed = null;
    app = new WPK.App(root, sc, { state: en.state, statusEl: $('ws-sheet-status'), onChange: onSheetChange, fixedPeople: true, personLabel: roleHeading, road: S.path.sheetRoad || S.path.id,
      // "Share this week" / "Open a shared week" (and list, and score): a partner's link lands on this same sheet
      canShare: !isSolo() && !!sc.share, takeShared: suiteTakeShared, readOnly: othersOwn(en) && !en.unlocked });
    if (sharedFor && sharedFor.wp === st.wp) { app.sharedIn = sharedFor; sharedFor = null; }
    app.render();
    readOnlyNote(en, root);
    var sheet = $('ws-sheet');
    sheet.hidden = false;
    document.documentElement.classList.add('ws-locked');
    requestAnimationFrame(function () { sheet.classList.add('is-in'); });
    sheet.querySelector('.ws-sheet-scroll').scrollTop = 0;
    $('ws-sheet-title').focus();
  }

  // Someone else's own sheet (a load score, a calm-down kit) that came in from their file or link: it is
  // theirs to change, so it opens read-only here. "This is mine" unlocks it (the same person's other device).
  function othersOwn(en) {
    if (!perPerson(en.workpaper) || !en.from || !en.from.by) return false;
    var p = personOf(en), by = SP.fold(en.from.by);
    if (p == null || SP.fold(whoLabel(p)) !== by) return false;
    return SP.fold(deviceOwner()) !== by;
  }
  function readOnlyNote(en, root) {
    var old = $('ws-readonly'); if (old) old.remove();
    if (!othersOwn(en) || en.unlocked) return;
    var who = whoLabel(personOf(en));
    var box = h('div', { className: 'ws-readonly tol-plain no-bubble', id: 'ws-readonly', role: 'note' }, [
      h('p', { text: 'This is ' + who + '\u2019s own sheet, from their link or file, so it is read-only here. Only ' + who + ' changes it, on their own device.' }),
      h('button', { type: 'button', className: 'wpf-add', text: 'This is mine: let me change it' })]);
    box.querySelector('button').addEventListener('click', function () {
      en.unlocked = true;
      app.opts.readOnly = false; app.render(); box.remove();
      var f = root.querySelector('input, select, textarea'); if (f) f.focus();
    });
    root.parentNode.insertBefore(box, root);
  }

  // A name typed on a sheet becomes that person's name on the road too.
  function onSheetChange(state) {
    // combining a shared week hands back a fresh copy of the sheet: this entry holds that copy from now on
    if (editing && state && editing.entry.state !== state) editing.entry.state = state;
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

  /* ------------------------------------------------------------ a shared link, and removing a sheet */

  var sharedFor = null, sharedWait = null;
  // A load score shared by someone else on the road goes onto their own sheet (made if they haven't one),
  // never into the sheet that happens to be open. Everything else is combined into the sheet that is open.
  function suiteTakeShared(d, replace, a) {
    if (!editing || !d || d.wp !== editing.entry.workpaper || !perPerson(d.wp)) return '';
    var who = SP.fold(d.p && d.p[0]), i = -1;
    S.names.forEach(function (nm, k) { if (i < 0 && who && SP.fold(nm) === who) i = k; });
    var here = editing.entry.person != null ? editing.entry.person : personOf(editing.entry);
    if (i < 0 || i === here) return '';
    var st = editing.stop, theirs = st.entries.filter(function (en) { return personOf(en) === i; });
    var en = theirs.filter(function (x) { return !filled(x); })[0] || theirs[theirs.length - 1];
    if (!en) { en = newEntry(st.wp, '', i); st.entries.push(en); }
    var v = en.state.values, n = 0;
    Object.keys(d.m || {}).forEach(function (k) { if (WPK.isBlank(v[k]) && typeof d.m[k] !== 'object') { v[k] = d.m[k]; n++; } });
    Object.keys(d.vals || {}).forEach(function (k) { if (WPK.isBlank(v[k]) && typeof d.vals[k] !== 'object') { v[k] = d.vals[k]; n++; } });
    en.state = clean(schema(st.wp), en.state);
    en.from = { by: whoLabel(i), saved: WPK.today(), file: 'a shared link' };
    changed(); renderRoad();
    return 'Put ' + whoLabel(i) + '\u2019s ' + a.shareWhat() + (d.s != null ? ' (' + d.s.toFixed(2) + ')' : '') + ' on ' + whoLabel(i) + '\u2019s own sheet' + (n ? '' : ', which already had it') + '. This sheet is as it was. Nothing was sent anywhere.';
  }
  // A link opened on this page (…/suite.html#list=…): the sheet it belongs to opens with the choice at the
  // top. A week goes to the sheet for the same week; a score to that person's own sheet.
  function openShared(d) {
    if (!S.path) { sharedWait = d; say('Someone shared ' + SP.nameOf(d.wp) + ' with you. Choose your road first, and it opens on the right sheet.'); return; }
    sharedWait = null;
    var stops = S.stops.filter(function (x) { return x.wp === d.wp; });
    var st = stops[0] || extraStop(d.wp), pick = null, person = null;
    if (perPerson(d.wp)) {
      var who = SP.fold(d.p && d.p[0]);
      S.names.forEach(function (nm, k) { if (person == null && who && SP.fold(nm) === who) person = k; });
      if (person != null) stops.forEach(function (x) { x.entries.forEach(function (en) { if (!pick && personOf(en) === person) { pick = en; st = x; } }); });
    } else {
      var wk = d.m && (d.m.weekOf || d.m.reviewDate);
      stops.forEach(function (x) { x.entries.forEach(function (en) { if (!pick && wk && (en.state.values.weekOf || en.state.values.reviewDate) === wk) { pick = en; st = x; } }); });
      if (!pick) stops.forEach(function (x) { x.entries.forEach(function (en) { if (!pick) { pick = en; st = x; } }); });
    }
    sharedFor = d;
    renderRoad();
    openSheet(st.key, pick ? pick.id : '', person != null ? String(person) : null);
    var si = document.getElementById('wpf-share-in'); if (si) si.focus();
  }
  function readSharedHash() {
    if (!/^#list=/.test(global.location.hash || '')) return;
    var d = WPK.readShared ? WPK.readShared(global.location.hash) : null;
    try { global.history.replaceState(null, '', global.location.pathname + global.location.search); } catch (e) {}
    if (!d || !schema(d.wp)) { say('That shared link looks incomplete. Ask for it again, or paste it under \u201cOpen a shared \u2026\u201d on the sheet.'); return; }
    openShared(d);
  }
  // "Remove this sheet": any sheet, filled in or not. It can come back with "Undo" on the road.
  function removeSheet() {
    if (!editing) return;
    var ed = editing, idx = ed.stop.entries.indexOf(ed.entry), label = ed.entry.label || (perPerson(ed.stop.wp) && personOf(ed.entry) != null ? whoLabel(personOf(ed.entry)) + '\u2019s sheet' : 'Sheet ' + (idx + 1));
    var had = filled(ed.entry) || !!ed.entry.label;
    ed.before = -1; // no "new heart" for a sheet that is going
    closeSheet(true);
    var i2 = ed.stop.entries.indexOf(ed.entry);
    if (i2 >= 0) ed.stop.entries.splice(i2, 1);
    S.removed = had ? { key: ed.stop.key, entry: ed.entry, idx: idx, label: label } : null;
    changed(); renderRoad();
    var u = document.querySelector('[data-undo-sheet]'), stopEl = document.querySelector('[data-stop="' + ed.stop.key + '"]');
    (u || (stopEl && stopEl.querySelector('button')) || document.body).focus();
    say('Removed ' + label + ' from ' + SP.nameOf(ed.stop.wp) + '.' + (had ? ' Tap Undo to bring it back.' : ''));
  }
  function undoRemoveSheet() {
    var r = S.removed; if (!r) return;
    var st = S.stops.filter(function (x) { return x.key === r.key; })[0];
    S.removed = null;
    if (!st) return;
    st.entries.splice(Math.min(r.idx, st.entries.length), 0, r.entry);
    changed(); renderRoad();
    var b = document.querySelector('[data-entry="' + r.entry.id + '"]'); if (b) b.focus();
    say('Brought back ' + r.label + '.');
  }

  function closeSheet(quiet) {
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
    if (quiet === true) return;
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
    var loaded = [], problems = [], dupes = 0, hold = [], merged = [];
    nameAsks = [];
    function put(en, road, names) {
      if (differentRoad(road)) { hold.push({ en: en, road: road, names: names }); return; }
      if (road && pathById(road) && !S.path) setPath(road);
      if (place(en)) loaded.push(en); else if (en.mergedInto && en.mergeInfo && en.mergeInfo.got) merged.push(en); else dupes++;
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
          if (d.split && !S.split) S.split = splitClean(d.split);
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
            if (x.from && x.from.lemon) en.from.lemon = 1;
            // a sheet that was brought into that file from someone else's still says whose it was
            if (x.from && typeof x.from.by === 'string' && x.from.by.trim()) en.from.by = x.from.by.trim().slice(0, 40);
            if (typeof x.sid === 'string') en.sid = x.sid.slice(0, 40);
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
      var twice = dupes ? ' ' + dupes + (dupes === 1 ? ' sheet was' : ' sheets were') + ' already on your road with nothing new, so ' + (dupes === 1 ? 'it wasn\u2019t' : 'they weren\u2019t') + ' added again.' : '';
      var msg = '';
      if (loaded.length) {
        changed();
        var names = loaded.map(function (en) { return midName(en.workpaper) + (en.label ? ' (' + en.label + ')' : ''); });
        msg = 'Brought in ' + loaded.length + (loaded.length === 1 ? ' sheet: ' : ' sheets: ') + andJoin(names.slice(0, 6)) + (names.length > 6 ? ' and ' + (names.length - 6) + ' more' : '');
        if (!/[.?!]$/.test(msg)) msg += '.';
        celebrate($('ws-drop'), null);
        var first = document.querySelector('.ws-stop.is-done');
        if (first && first.scrollIntoView && !hold.length) first.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      }
      // answers added to sheets already on the road: say whose, and how much, sheet by sheet
      if (merged.length) {
        if (!loaded.length) changed();
        var byWho = {};
        merged.forEach(function (en) {
          var who = mergedWho(en);
          (byWho[who] = byWho[who] || []).push(midName(en.workpaper) + ' (' + mergeCount(en.mergeInfo) + ')');
        });
        Object.keys(byWho).forEach(function (who) { msg += (msg ? ' ' : '') + 'Added ' + who + ' answers to ' + andJoin(byWho[who]) + '.'; });
      }
      var matched = loaded.filter(function (en) { return en.matched; }).length;
      if (matched) twice += ' People were matched by name, so everyone\u2019s answers stayed theirs' + (matched > 1 ? ' on ' + matched + ' sheets' : '') + '.';
      $('ws-drop-note').textContent = (msg + twice).trim();
      if (turnWait) { var tw = turnWait; turnWait = null; if (loaded.length || merged.length) yourTurn(tw); }
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

  // "…-Partners-Lena-2026-10-07": whose file it is, so two people saving on the same day never get the same name
  function fileSafe(x, n) { return String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, n || 30); }
  function base() {
    var who = fileSafe(deviceOwner() || (isSolo() ? S.names[0] : ''));
    if (!who && S.names.filter(function (x) { return String(x || '').trim(); }).length > 1) { var d = new Date(); who = 'saved-' + ('0' + d.getHours()).slice(-2) + ('0' + d.getMinutes()).slice(-2); }
    return 'Spread-Love-and-Acceptance-Workpaper-Suite-' + (S.path ? fileSafe(S.path.label, 80) + '-' : '') + (who ? who + '-' : '') + WPK.today();
  }

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
      S.split = splitClean(kept.split);
      if (Array.isArray(kept.focusEach)) { S.focusEach = kept.focusEach.slice(0, MAX_PEOPLE).map(function (x) { return typeof x === 'string' && /^[a-z]{1,20}$/.test(x) ? x : null; }); renderFocus(); }
      kept.entries.forEach(function (x) {
        var sc = x && schema(x.workpaper);
        if (!sc) return;
        var en = { workpaper: sc.code, label: typeof x.label === 'string' ? x.label.slice(0, 80) : '', state: clean(sc, x.state) };
        if (typeof x.person === 'number') en.person = x.person;
        if (x.from && typeof x.from === 'object') en.from = fromClean(x.from);
        if (typeof x.sid === 'string') en.sid = x.sid.slice(0, 40);
        place(en);
      });
      syncAllNames(); syncRoadPeople();
      renderNames(); renderRoad();
      S.dirty = false;
      say('Picked up the draft kept on this device. Press “Erase” to remove it.');
    } else if (q && pathById(q)) setPath(q, qf); else renderRoad();

    var nameTimer = null;
    // A name box loses focus the moment a finger or mouse goes down on "Fill it in". Redrawing the road
    // right then swaps that button for a new one, so the tap was lost (the page only scrolled). While a
    // press is under way, the redraw waits until it is over, and the tap opens the sheet the first time.
    var pressing = false, roadWaits = false;
    function roadSoon() { if (pressing) roadWaits = true; else renderRoad(); }
    document.addEventListener('pointerdown', function () { pressing = true; }, true);
    function pressDone() { setTimeout(function () { pressing = false; if (roadWaits) { roadWaits = false; renderRoad(); } }, 0); }
    document.addEventListener('pointerup', pressDone, true);
    document.addEventListener('pointercancel', pressDone, true);
    $('ws-names').addEventListener('input', function (e) {
      var i = e.target.getAttribute('data-name');
      if (i == null) return;
      setName(+i, e.target.value);
      // the road below (each person's own sheets) shows the new name a moment after typing stops
      clearTimeout(nameTimer); nameTimer = setTimeout(roadSoon, 500);
    });
    $('ws-names').addEventListener('change', function (e) {
      var ni = e.target.getAttribute('data-nights');
      if (ni != null) {
        if (!setNights(+ni, +e.target.value)) { e.target.value = '14'; say('Type their name first, then choose how often they live here.'); return; }
        changed(); renderSplit(); renderRoad();
        say(whoLabel(+ni) + (+e.target.value < 14 ? ' lives here ' + e.target.options[e.target.selectedIndex].text.toLowerCase() + '. The report counts a fair share for the nights they\u2019re here.' : ' lives here every night.'));
        return;
      }
      var k = e.target.getAttribute('data-kid');
      if (k != null) {
        kidsFit(); S.kids[+k] = e.target.checked;
        syncRoadPeople(); changed(); renderRoad();
        say(whoLabel(+k) + (e.target.checked ? ' is marked as a child: no load score or calm-down kit is asked of them, and the shared numbers don\u2019t wait for them.' : ' is marked as an adult.'));
        return;
      }
      // (after this event has run its course: on a phone the tap that blurred the box comes right after it)
      if (e.target.getAttribute('data-name') != null) { clearTimeout(nameTimer); nameTimer = setTimeout(roadSoon, 0); }
    });
    $('ws-names').addEventListener('click', function (e) {
      if (e.target.closest('[data-split-forget]')) { S.split = null; changed(); renderNames(); renderRoad(); say('Each week is read against an even split now, with everyone counted as here every night.'); return; }
      var x = e.target.closest('[data-remove-name]');
      if (x) removeName(+x.getAttribute('data-remove-name'));
      if (e.target.closest('#ws-name-add')) addName();
    });
    var lemonGo = $('ws-lemon-go'), lemonUse = $('ws-lemon-kept'), lemonSay = function (m) { var n = $('ws-lemon-note'); if (n) { n.textContent = ''; setTimeout(function () { n.textContent = m; }, 30); } };
    if (lemonGo) lemonGo.addEventListener('click', function () {
      lemonRead($('ws-lemon-code').value, function (d) {
        if (!d) { lemonSay(LEMON_HOWTO); $('ws-lemon-code').focus(); return; }
        lemonSay(lemonBring(d, { by: d.by, saved: WPK.today(), file: 'Lemonade Stand code' }));
        $('ws-lemon-code').value = '';
      });
    });
    if (lemonUse) lemonUse.addEventListener('click', function () {
      var d = lemonKept();
      if (!d) { lemonSay('There’s no Lemonade Stand kept on this device.'); return; }
      lemonSay(lemonBring(d, { saved: WPK.today(), file: 'Lemonade Stand on this device' }));
    });
    lemonRender();
    var keepBox = $('ws-keep');
    if (keepBox) keepBox.addEventListener('change', function () {
      if (keepBox.checked) { keep = true; if (WPK.keepOff) WPK.keepOff('suite', false); if (keepNow()) say('Kept on this device. It will be here next time you open this page. Press “Erase” to remove it.'); if (suiteAsk) suiteAsk(); }
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
      if (sharedWait) { var sw = sharedWait; setTimeout(function () { openShared(sw); }, 80); }
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
        var sb = e.target.closest('[data-short]');
        if (sb) { shortToggle(sb.getAttribute('data-short') === 'on'); return; }
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
      var sh = e.target.closest('[data-short]'); if (sh) { shortToggle(sh.getAttribute('data-short') === 'on'); return; }
      var o = e.target.closest('[data-open]'), a = e.target.closest('[data-again]'), add = e.target.closest('[data-add]');
      if (o) openSheet(o.getAttribute('data-open'), o.getAttribute('data-entry'), o.getAttribute('data-person'));
      if (a) {
        var st = S.stops.filter(function (x) { return x.key === a.getAttribute('data-again'); })[0];
        var pa = a.getAttribute('data-person'), en = newEntry(st.wp, '', pa != null && pa !== '' ? +pa : null);
        st.entries.push(en);
        openSheet(st.key, en.id, pa);
      }
      if (add) { extraStop(add.getAttribute('data-add')); changed(); renderRoad(); say('Added ' + add.getAttribute('data-add') + ' to the end of your road.'); }
      if (e.target.closest('[data-undo-sheet]')) undoRemoveSheet();
    });

    var root = $('ws-sheet-root');
    root.addEventListener('input', function (e) { if (app) app.onInput(e); });
    root.addEventListener('change', function (e) { if (app) app.onInput(e); });
    root.addEventListener('click', function (e) { if (app) app.onClick(e); });
    $('ws-sheet-label').addEventListener('input', function () { if (editing) { editing.entry.label = this.value.slice(0, 80); changed(); } });
    $('ws-sheet-done').addEventListener('click', function () { closeSheet(); });
    $('ws-sheet-x').addEventListener('click', function () { closeSheet(); });
    if ($('ws-sheet-remove')) $('ws-sheet-remove').addEventListener('click', removeSheet);
    readSharedHash();
    global.addEventListener('hashchange', readSharedHash);
    readStandHash();
    global.addEventListener('hashchange', readStandHash);
    readSuiteHash();
    global.addEventListener('hashchange', readSuiteHash);
    if ($('ws-paste-go')) $('ws-paste-go').addEventListener('click', pasteIn);
    var sendB = $('ws-send');
    if (sendB) sendB.addEventListener('click', function (e) {
      // the link is made here, from the road as it is now, before the share sheet (site.js) reads it
      if (!S.path || !S.stops.some(function (st) { return st.entries.some(filled); })) { e.stopPropagation(); e.preventDefault(); say('Fill in a sheet first, then send it.'); return; }
      var j = suiteJson(), link = suiteLink.sig === j ? suiteLink : suiteLinkPlain();
      if (link.url.length > 60000) { e.stopPropagation(); e.preventDefault(); say('Your road is too big for one link. Use \u201cSave my progress\u201d and send the small file instead.'); return; }
      sendB.setAttribute('data-share-url', link.url);
      suiteSafe = j;
    });
    // "Show a QR code": the same link as "Send it to my partner", drawn big for the other phone in the room
    // (share-kit.js; loaded at the tap if it isn't here yet)
    var qrB = $('ws-qr');
    if (qrB) qrB.addEventListener('click', function () {
      if (!S.path || !S.stops.some(function (st) { return st.entries.some(filled); })) { say('Fill in a sheet first, then show the code.'); return; }
      var j = suiteJson(), link = suiteLink.sig === j ? suiteLink : suiteLinkPlain();
      function go() {
        var K = global.TOLShareKit; if (!K || !K.showQR) return;
        if (!K.qrFits(link.url)) { qrB.hidden = true; say('Your road is too long for a QR code. Use \u201cSend it to my partner as a link\u201d instead.'); return; }
        suiteSafe = j;
        K.showQR(link.url, { title: 'Scan with the other phone', note: 'Your road opens on their phone, in their Workpaper Suite. Each change needs a new code or link.' });
      }
      if (global.TOLShareKit && global.TOLShareKit.showQR) { go(); return; }
      var sc = document.createElement('script'); sc.src = '/assets/js/share-kit.js'; sc.onload = go; document.head.appendChild(sc);
    });
    document.addEventListener('tol:shared', function (e) { var u = e.detail && e.detail.url; if (u && u.indexOf(SUITE_HASH) >= 0) { S.dirty = false; say('Sent. If ' + (S.names.filter(function (x) { return String(x || '').trim(); }).length > 2 ? 'anyone' : 'either of you') + ' changes something, send a new link.'); } });
    // "Include private notes in the link": off unless ticked, and only for this link
    var sendRow = sendB && sendB.closest('.ws-send-row');
    if (sendRow && !$('ws-link-private')) {
      var pl = h('label', { className: 'ws-link-private' }, [h('input', { type: 'checkbox', id: 'ws-link-private', autocomplete: 'off' }), ' Include private notes in the link (the note on How much are you carrying?, and the Calm-Down Kit beyond the pause plan). Left out unless you tick this.']);
      sendRow.parentNode.insertBefore(h('p', { className: 'ws-send-private' }, [pl]), sendRow.nextSibling);
      $('ws-link-private').addEventListener('change', function (e) { linkPrivate = e.target.checked; suiteLinkSoon(); });
    }
    suiteLinkSoon();
    // "Keep this on this device so it's here tomorrow?", once something is typed (tol-workpaper.js)
    if (WPK.keepAsk) {
      var askS = WPK.keepAsk({
        key: 'suite', bar: document.querySelector('.wpf-bar-inner'),
        want: function () { return !keep && !!S.path && (S.stops.some(function (st) { return st.entries.some(filled); }) || S.names.some(function (x) { return String(x || '').trim(); })); },
        auto: true,
        onKeep: function (auto) { var kb2 = $('ws-keep'); if (kb2) kb2.checked = true; keep = true; if (WPK.keepOff) WPK.keepOff('suite', false); if (keepNow()) say(auto ? 'Kept on this device, like your other worksheets. To remove it, press \u201cErase\u201d.' : 'Kept on this device for next time. Press \u201cErase\u201d to remove it.'); if (suiteAsk) suiteAsk(); }
      });
      suiteAsk = askS.check;
      askS.check();
    }
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
    // On a phone the save bar is one row: Save my progress, Fillable PDF and More (which opens "Open a saved
    // file"), the same as on a single worksheet, so the bottom of the screen stays free.
    var barActs = document.querySelector('.wpf-bar-actions');
    if (barActs && !$('wpf-more')) {
      var moreB = h('button', { type: 'button', id: 'wpf-more', className: 'wpf-btn-quiet wpf-bar-more', 'aria-expanded': 'false', text: 'More \u25BE' });
      barActs.insertBefore(moreB, barActs.firstChild); barActs.classList.add('has-more', 'ws-bar-actions');
      moreB.addEventListener('click', function () {
        var open = !barActs.classList.contains('is-open');
        barActs.classList.toggle('is-open', open);
        moreB.setAttribute('aria-expanded', String(open));
        moreB.textContent = open ? 'Less \u25B4' : 'More \u25BE';
      });
    }
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
