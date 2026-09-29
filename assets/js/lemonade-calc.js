/*
  lemonade-calc.js
  The Objective Ledger — Lemonade Stand calculator (2 to 8 people)

  Hours tab: one line per job, hours per person.
  Money tab (optional): one line per shared cost, what each person paid.

  Descriptive, not evaluative: it reports what was entered and states the
  split as a plain fact, never a verdict on anyone.

  Nothing typed is sent anywhere. While the tab is open, a draft is kept in
  sessionStorage (this tab only, gone when the tab closes) so a Back button or
  an interruption never loses the stand; "Clear" removes it. If the visitor
  ticks "Keep this on my device", the stand is kept in localStorage (this
  browser only) until they press "Erase".

  "Chores with one owner each": the no-project path. Pick up to five jobs
  (straight from the rows, or typed in), give each one owner with one tap,
  then copy or print a fridge list. No week of logging needed first.
*/
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var peopleEl = $('people'), rowsEl = $('rows'), moneyEl = $('money-rows');
  if (!peopleEl || !rowsEl) return;

  var MIN = 2, MAX = 8;
  var KEY = 'tol-lemonade-stand-v2', DRAFT = 'tol-lemonade-draft', MAX_OWN = 5;
  var COLORS = ['#BFE3CF', '#F8DC6E', '#F2B8C6', '#B9D3F0', '#D9C4F0', '#F6C99B', '#C8E6A0', '#A8DDE0'];

  // The example is shown as grey placeholder text (item.ex), never as values: it is never counted in
  // a total, and the first edit to a row turns that row into yours.
  function exampleRow(name, v) { return { name: '', v: v.map(function () { return 0; }), ex: { name: name, v: v } }; }
  var EXAMPLE = {
    people: ['Me', 'Them'],
    jobs: [
      exampleRow('Groceries & meal planning', [3, 1]),
      exampleRow('Dishes', [1, 4]),
      exampleRow('Laundry', [0, 3]),
      exampleRow('Bills & scheduling', [2, 0]),
      exampleRow('Emotional check-ins', [2, 2])
    ],
    bills: [
      exampleRow('Rent', [600, 600]),
      exampleRow('Power & internet', [140, 0])
    ]
  };
  function anyExample() { return state.jobs.concat(state.bills).some(function (r) { return !!r.ex; }); }
  function anyBad(list) { return list.some(function (r) { return r.raw && Object.keys(r.raw).length; }); }

  var state;       // { people:[], jobs:[{name,v[]}], bills:[{name,v[]}], example:bool }
  var keep = false;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function num(x) { var n = parseFloat(x); return isFinite(n) && n > 0 ? n : 0; }
  function r1(n) { return Math.round(n * 10) / 10; }
  function money(n) { return (Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function nameOf(i) { var n = (state.people[i] || '').trim(); return n || ('Person ' + (i + 1)); }
  function status(msg) { var s = $('ls-status'); if (s) { s.textContent = msg; clearTimeout(status.t); status.t = setTimeout(function () { s.textContent = ''; }, 4000); } }

  /* ---------- storage (opt-in only) ---------- */
  function loadSaved() {
    try { var raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function save() {
    try { sessionStorage.setItem(DRAFT, JSON.stringify(state)); } catch (e) { /* no tab storage: the page still works */ }
    if (!keep) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked: stay in-tab only */ }
  }
  function loadDraft() {
    try { var raw = sessionStorage.getItem(DRAFT); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  // "you" and "them" read better than "Me" and "Them" inside a sentence
  function who(i) { var n = nameOf(i), l = n.toLowerCase(); return l === 'me' ? 'you' : l === 'them' ? 'them' : n; }
  function erase() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    keep = false;
    $('keep-device').checked = false;
    status('Erased. Nothing from the stand is kept on this device now.');
  }

  /* ---------- people ---------- */
  function renderPeople() {
    peopleEl.innerHTML = '';
    state.people.forEach(function (p, i) {
      var wrap = document.createElement('div');
      wrap.className = 'ls-person';
      wrap.style.setProperty('--pc', COLORS[i]);
      var dot = document.createElement('span'); dot.className = 'dot';
      var inp = document.createElement('input');
      inp.type = 'text'; inp.value = p; inp.maxLength = 40; inp.autocomplete = 'off';
      inp.setAttribute('aria-label', 'Name of person ' + (i + 1));
      inp.addEventListener('input', function () { state.people[i] = inp.value; relabel(); recalc(); });
      wrap.appendChild(dot); wrap.appendChild(inp);
      if (state.people.length > MIN) {
        var rm = document.createElement('button');
        rm.type = 'button'; rm.className = 'remove'; rm.innerHTML = '&times;';
        rm.setAttribute('aria-label', 'Remove ' + nameOf(i));
        rm.addEventListener('click', function () { removePerson(i); });
        wrap.appendChild(rm);
      }
      peopleEl.appendChild(wrap);
    });
    $('add-person').hidden = state.people.length >= MAX;
  }
  function addPerson() {
    if (state.people.length >= MAX) return;
    state.people.push('');
    state.jobs.forEach(function (j) { j.v.push(0); });
    state.bills.forEach(function (b) { b.v.push(0); });
    renderAll();
    var inputs = peopleEl.querySelectorAll('input');
    if (inputs.length) inputs[inputs.length - 1].focus();
    status('Added a person. There are ' + state.people.length + ' at the stand.');
  }
  function removePerson(i) {
    if (state.people.length <= MIN) return;
    var gone = nameOf(i);
    state.people.splice(i, 1);
    state.jobs.forEach(function (j) { j.v.splice(i, 1); });
    state.bills.forEach(function (b) { b.v.splice(i, 1); });
    renderAll();
    status('Removed ' + gone + '.');
  }

  /* ---------- rows ---------- */
  function autoGrow(t) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }
  function makeRow(list, idx, container, kind) {
    var item = list[idx];
    var row = document.createElement('div');
    row.className = 'row';
    var top = document.createElement('div'); top.className = 'row-top';
    var ta = document.createElement('textarea');
    ta.rows = 1; ta.className = 'task-name'; ta.value = item.name; ta.setAttribute('autocomplete', 'off');
    ta.placeholder = item.ex ? 'Example: ' + item.ex.name : kind === 'job' ? 'What was the job?' : 'What was the cost?';
    ta.setAttribute('aria-label', kind === 'job' ? 'Job name' : 'Bill name');
    if (item.ex) row.classList.add('is-example');
    // the first edit to an example row makes it yours: its grey example numbers go
    function own() {
      if (!item.ex) return;
      delete item.ex; row.classList.remove('is-example');
      ta.placeholder = kind === 'job' ? 'What was the job?' : 'What was the cost?';
      amts.querySelectorAll('input').forEach(function (x) { x.placeholder = '0'; });
    }
    ta.addEventListener('input', function () { own(); item.name = ta.value.replace(/\n/g, ' '); autoGrow(ta); markEdited(); recalc(); if (kind === 'job') renderPicks(); });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter') e.preventDefault(); });
    var rm = document.createElement('button');
    rm.type = 'button'; rm.className = 'remove'; rm.innerHTML = '&times;';
    rm.setAttribute('aria-label', kind === 'job' ? 'Remove this job' : 'Remove this bill');
    rm.addEventListener('click', function () { list.splice(list.indexOf(item), 1); renderRows(); renderOwners(); recalc(); });
    top.appendChild(ta); top.appendChild(rm);
    var amts = document.createElement('div'); amts.className = 'row-amts';
    var note = document.createElement('p'); note.className = 'row-note'; note.setAttribute('aria-live', 'polite');
    function showNote() {
      var bad = Object.keys(item.raw || {});
      note.textContent = bad.map(function (k) {
        var raw = item.raw[k], n = parseFloat(raw);
        return nameOf(+k) + ': “' + raw + '” isn’t counted, ' + (!isFinite(n) ? 'because it isn’t a number.' : n < 0 ? 'because ' + (kind === 'job' ? 'hours' : 'amounts') + ' can’t be negative.' : 'because it’s more hours than a week has (168). Were they minutes?');
      }).join(' ');
      note.hidden = !bad.length;
    }
    state.people.forEach(function (p, i) {
      var lab = document.createElement('label');
      lab.style.setProperty('--pc', COLORS[i]);
      var sp = document.createElement('span'); sp.className = 'pname'; sp.dataset.i = i;
      sp.textContent = nameOf(i) + (kind === 'job' ? ' (hours)' : ' paid');
      var inp = document.createElement('input');
      inp.type = 'number'; inp.min = '0'; inp.step = kind === 'job' ? '0.5' : '0.01'; inp.inputMode = 'decimal'; inp.autocomplete = 'off';
      inp.setAttribute('aria-label', nameOf(i) + (kind === 'job' ? ', hours' : ', amount paid') + (item.ex ? ' (example: ' + (item.ex.v[i] || 0) + ')' : ''));
      // an example row shows its numbers as grey placeholders, which are never counted
      if (item.ex) { inp.value = ''; inp.placeholder = String(item.ex.v[i] || 0); }
      else { inp.placeholder = '0'; inp.value = item.raw && item.raw[i] != null ? item.raw[i] : (item.v[i] || 0); }
      if (item.raw && item.raw[i] != null) inp.setAttribute('aria-invalid', 'true');
      inp.addEventListener('input', function () {
        own();
        // a negative number, or more hours than a week has, is left out and said so under the row (never quietly zeroed)
        var raw = inp.value, n = parseFloat(raw), bad = raw !== '' && (!isFinite(n) || n < 0 || (kind === 'job' && n > 168));
        if (bad) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid');
        item.v[i] = bad ? 0 : num(raw);
        item.raw = item.raw || {};
        if (bad) item.raw[i] = raw; else delete item.raw[i];
        showNote();
        markEdited(); recalc();
      });
      lab.appendChild(sp); lab.appendChild(inp);
      amts.appendChild(lab);
    });
    row.appendChild(top); row.appendChild(amts); row.appendChild(note);
    showNote();
    container.appendChild(row);
    requestAnimationFrame(function () { autoGrow(ta); });
    return ta;
  }
  function renderRows() {
    rowsEl.innerHTML = ''; moneyEl.innerHTML = '';
    state.jobs.forEach(function (j, i) { makeRow(state.jobs, i, rowsEl, 'job'); });
    state.bills.forEach(function (b, i) { makeRow(state.bills, i, moneyEl, 'bill'); });
  }
  function relabel() {
    document.querySelectorAll('.row-amts .pname').forEach(function (sp) {
      var i = +sp.dataset.i;
      sp.textContent = nameOf(i) + (sp.closest('#money-rows') ? ' paid' : ' (hours)');
    });
  }
  function markEdited() {
    state.example = false;
    $('example-note').hidden = !anyExample();
  }

  /* ---------- glasses ---------- */
  function renderGlasses() {
    var g = $('glasses'); g.innerHTML = '';
    g.classList.toggle('is-many', state.people.length > 4);
    state.people.forEach(function (p, i) {
      var w = document.createElement('div'); w.className = 'ls-gwrap';
      w.style.setProperty('--pc', COLORS[i]);
      w.innerHTML = '<div class="ls-glass"><span class="ls-straw"></span><span class="ls-slice"></span><div class="ls-juice"></div><span class="ls-pct">0%</span></div><span class="ls-gname"></span>';
      g.appendChild(w);
    });
  }

  /* ---------- totals ---------- */
  function totals(list) {
    var t = state.people.map(function () { return 0; });
    list.forEach(function (r) { r.v.forEach(function (x, i) { if (i < t.length) t[i] += num(x); }); });
    return t;
  }
  function pcts(t) {
    var sum = t.reduce(function (a, b) { return a + b; }, 0);
    // no hours yet means empty glasses, not an even split
    return t.map(function (x) { return sum > 0 ? x / sum * 100 : 0; });
  }

  // How the words are chosen (said on the page too): with two people, the bigger share under 60% is
  // "fairly close", 60% or more "leans one way", 90% or more "nearly all". With three or more, a share
  // of 1.5 times an even share or more "leans one way"; anything less is "fairly even".
  function hoursSentence() {
    var t = totals(state.jobs), sum = t.reduce(function (a, b) { return a + b; }, 0);
    // a number that can't be counted (negative, not a number, more than a week) holds the read back,
    // so a typo never turns into "100% done by them"
    if (anyBad(state.jobs)) return 'One of the numbers above isn’t counted yet (it’s marked under its row). Fix it to see how the work is split. Nothing is guessed in the meantime.';
    if (sum === 0) return anyExample() ? 'The grey numbers are only an example, so nothing is counted yet. Type your own hours to see how the work is split.' : 'Add some hours above to see how the work is split.';
    var p = pcts(t), n = t.length, even = 100 / n;
    var top = 0; p.forEach(function (x, i) { if (x > p[top]) top = i; });
    var topPct = Math.round(p[top]);
    var ratio = p[top] / even;
    var allEqual = t.every(function (x) { return Math.abs(x - t[0]) < 1e-9; });
    if (allEqual) return 'An even split this week: ' + Math.round(even) + '% each. Keep checking in as things change.';
    if (n === 2) {
      if (t[1 - top] === 0) return 'Everything listed here this week was done by ' + who(top) + ' (100%). That’s not a verdict on anyone, and it’s worth a calm talk about sharing some of it out.';
      if (topPct >= 90) return 'Nearly all of what’s listed here was done by ' + who(top) + ' (' + topPct + '%). That’s not a verdict on anyone, and it’s worth a calm talk about sharing it out.';
      if (topPct >= 60) return 'This week the hours lean one way: about ' + topPct + '% of them were done by ' + who(top) + '. That’s not a verdict on either of you, just what’s written down. Worth talking through together.';
      return 'Fairly close this week: ' + nameOf(top) + ' ' + topPct + '%, ' + nameOf(1 - top) + ' ' + (100 - topPct) + '%. Keep checking in as things change.';
    }
    var evenTxt = 'An even share for ' + n + ' people would be about ' + Math.round(even) + '% each.';
    if (ratio >= 1.5) return 'This week the hours lean one way: about ' + topPct + '% of them were done by ' + who(top) + '. ' + evenTxt + ' That’s not a verdict on anyone, just what’s written down. Worth talking through together.';
    return 'Fairly even this week: the biggest share, ' + topPct + '%, was done by ' + who(top) + '. ' + evenTxt + ' Keep checking in as things change.';
  }
  function moneySentence() {
    var t = totals(state.bills), sum = t.reduce(function (a, b) { return a + b; }, 0);
    if (anyBad(state.bills)) return 'One of the amounts above isn’t counted yet (it’s marked under its row). Fix it to see the money side.';
    if (sum === 0) return '';
    var fair = sum / t.length;
    var parts = t.map(function (x, i) {
      var d = x - fair;
      var tail = Math.abs(d) < 0.005 ? 'right on an even share' : (d > 0 ? money(d) + ' over an even share' : money(-d) + ' under an even share');
      return nameOf(i) + ' paid ' + money(x) + ' (' + tail + ')';
    });
    return 'Shared costs listed: ' + money(sum) + '. An even split would be ' + money(fair) + ' each. ' + parts.join('; ') + '. Even isn’t always the fair answer (incomes and rooms differ), so treat this as a starting point, not a verdict.';
  }

  function recalc() {
    var t = totals(state.jobs), p = pcts(t), any = t.some(function (x) { return x > 0; }) && !anyBad(state.jobs);
    var wraps = document.querySelectorAll('#glasses .ls-gwrap');
    wraps.forEach(function (w, i) {
      w.querySelector('.ls-juice').style.height = (any ? Math.max(4, p[i] * 0.92) : 0) + '%';
      w.querySelector('.ls-pct').textContent = any ? Math.round(p[i]) + '%' : '—';
      w.querySelector('.ls-gname').textContent = nameOf(i) + (any ? ' · ' + r1(t[i]) + 'h' : '');
    });
    $('balance-line').textContent = hoursSentence();
    $('money-line').textContent = moneySentence();
    save();
  }

  /* ---------- chores with one owner each (no week of logging needed) ---------- */
  function ownersList() { state.owners = (state.owners || []).slice(0, MAX_OWN); return state.owners; }
  function renderPicks() {
    var box = $('own-pick'); if (!box) return;
    var picked = ownersList().map(function (o) { return o.name.trim().toLowerCase(); });
    var names = [];
    state.jobs.forEach(function (jb) { var nm = jb.name.trim(); if (nm && names.map(function (x) { return x.toLowerCase(); }).indexOf(nm.toLowerCase()) < 0) names.push(nm); });
    box.innerHTML = '';
    if (!names.length) { box.innerHTML = '<p class="ls-panel-note">Jobs you list above show up here. Or type one below.</p>'; return; }
    names.forEach(function (nm) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'ls-chip';
      var on = picked.indexOf(nm.toLowerCase()) >= 0;
      b.setAttribute('aria-pressed', String(on)); b.textContent = nm;
      b.addEventListener('click', function () { toggleOwn(nm); });
      box.appendChild(b);
    });
  }
  function toggleOwn(nm) {
    var list = ownersList(), k = -1;
    list.forEach(function (o, i) { if (o.name.trim().toLowerCase() === nm.trim().toLowerCase()) k = i; });
    if (k >= 0) { list.splice(k, 1); status('Took “' + nm + '” off the list.'); }
    else if (list.length >= MAX_OWN) { status('Five is plenty for one fridge list. Take one off first.'); return; }
    else { list.push({ name: nm, who: -1 }); status('Added “' + nm + '”. Now tap who owns it.'); }
    renderOwners(); save();
  }
  function renderOwners() {
    var ol = $('own-list'); if (!ol) return;
    renderPicks();
    var list = ownersList();
    ol.innerHTML = '';
    $('own-empty').hidden = list.length > 0;
    list.forEach(function (o, idx) {
      if (o.who >= state.people.length) o.who = -1;
      var li = document.createElement('li'); li.className = 'ls-own';
      var h = document.createElement('p'); h.className = 'ls-own-job'; h.textContent = o.name;
      var g = document.createElement('div'); g.className = 'ls-own-who'; g.setAttribute('role', 'group'); g.setAttribute('aria-label', 'Who owns ' + o.name);
      state.people.forEach(function (p, i) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'ls-chip';
        b.style.setProperty('--pc', COLORS[i]);
        b.setAttribute('aria-pressed', String(o.who === i)); b.textContent = nameOf(i);
        b.addEventListener('click', function () { o.who = o.who === i ? -1 : i; renderOwners(); save(); status(o.who === i ? nameOf(i) + ' owns “' + o.name + '”.' : 'No owner for “' + o.name + '” yet.'); });
        g.appendChild(b);
      });
      var rm = document.createElement('button'); rm.type = 'button'; rm.className = 'remove'; rm.innerHTML = '&times;';
      rm.setAttribute('aria-label', 'Take ' + o.name + ' off the list');
      rm.addEventListener('click', function () { toggleOwn(o.name); });
      li.appendChild(h); li.appendChild(g); li.appendChild(rm);
      ol.appendChild(li);
    });
    $('own-add').hidden = list.length >= MAX_OWN;
    var fl = $('fridge'); if (fl) fl.textContent = fridgeText();
  }
  function fridgeText() {
    var list = ownersList();
    if (!list.length) return '';
    var lines = ['Who owns what (our fridge list)', ''];
    list.forEach(function (o) { lines.push('• ' + o.name + ': ' + (o.who >= 0 ? nameOf(o.who) : '(no owner yet)')); });
    lines.push('', 'Owning a job means you do it, or you make sure it gets done. Swap by asking, not by quietly dropping it.');
    return lines.join('\n');
  }

  function renderAll() {
    renderPeople(); renderRows(); renderGlasses();
    $('example-note').hidden = !anyExample();
    renderOwners();
    recalc();
  }

  /* ---------- result text ---------- */
  function resultText() {
    var t = totals(state.jobs), p = pcts(t), sum = t.reduce(function (a, b) { return a + b; }, 0);
    var lines = ['Our lemonade stand this week (hours, not a verdict):'];
    state.people.forEach(function (x, i) { lines.push('- ' + nameOf(i) + ': ' + r1(t[i]) + 'h (' + (sum ? Math.round(p[i]) : 0) + '%)'); });
    var jobs = state.jobs.filter(function (j) { return j.name.trim(); });
    if (jobs.length) {
      lines.push('', 'Jobs:');
      jobs.forEach(function (j) {
        lines.push('- ' + j.name.trim() + ': ' + state.people.map(function (x, i) { return nameOf(i) + ' ' + r1(num(j.v[i])) + 'h'; }).join(', '));
      });
    }
    lines.push('', hoursSentence());
    var ms = moneySentence();
    if (ms) lines.push('', ms);
    lines.push('', 'Made with the Lemonade Stand at The Objective Ledger.');
    return lines.join('\n');
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove(); return ok;
  }

  /* ---------- wire up ---------- */
  var saved = loadSaved(), draft = loadDraft();
  if (saved && saved.people && saved.people.length >= MIN) {
    keep = true;
    // the tab's own draft is newer than the kept copy when both exist
    state = draft && draft.people && draft.people.length >= MIN ? draft : saved;
  } else if (draft && draft.people && draft.people.length >= MIN) {
    state = draft;
    if (!state.example) status('Your stand from earlier in this tab is back.');
  } else {
    state = clone(EXAMPLE); state.example = true;
  }
  state.jobs = state.jobs || []; state.bills = state.bills || []; state.owners = state.owners || [];
  // a stand saved before examples became grey placeholders: its example numbers were real values,
  // so start from the placeholder example instead of counting them
  if (state.example && !anyExample()) { var ppl = state.people; state = clone(EXAMPLE); state.example = true; state.owners = []; if (ppl && ppl.length >= MIN) { state.people = ppl.slice(0, MAX); state.jobs.concat(state.bills).forEach(function (r) { while (r.v.length < state.people.length) r.v.push(0); r.v.length = state.people.length; }); } }
  $('keep-device').checked = keep;
  renderAll();

  // After Back or Forward, the browser may put old values back into the boxes. Always redraw the
  // boxes from the stand itself, so what you see and the totals always match.
  window.addEventListener('pageshow', function () { $('keep-device').checked = keep; renderAll(); });

  $('clear-draft').addEventListener('click', function () {
    var b = $('clear-draft');
    if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Tap again to clear'; clearTimeout(b.t); b.t = setTimeout(function () { delete b.dataset.armed; b.textContent = 'Clear'; }, 4000); return; }
    delete b.dataset.armed; b.textContent = 'Clear';
    try { sessionStorage.removeItem(DRAFT); } catch (e) {}
    if (keep) erase();
    state = clone(EXAMPLE); state.example = true; state.owners = [];
    renderAll();
    try { sessionStorage.removeItem(DRAFT); } catch (e) {}
    status('Cleared. The example is back, and nothing from before is kept in this tab.');
  });

  $('own-add-go').addEventListener('click', function () {
    var inp = $('own-new'), v = inp.value.trim();
    if (!v) { inp.focus(); return; }
    toggleOwn(v); inp.value = ''; inp.focus();
  });
  $('own-new').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('own-add-go').click(); } });
  $('own-copy').addEventListener('click', function () {
    var t = fridgeText();
    if (!t) { status('Pick a job or two first.'); return; }
    copyText(t).then(function (ok) { status(ok ? 'Copied. Paste it into your group chat, or print it for the fridge.' : 'Couldn’t copy here. Try selecting the text by hand.'); });
  });
  $('own-print').addEventListener('click', function () {
    if (!fridgeText()) { status('Pick a job or two first.'); return; }
    document.body.classList.add('print-fridge');
    var done = function () { document.body.classList.remove('print-fridge'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
    setTimeout(done, 1500);
  });

  $('add-person').addEventListener('click', addPerson);
  $('add-row').addEventListener('click', function () {
    state.jobs.push({ name: '', v: state.people.map(function () { return 0; }) });
    renderRows(); recalc();
    var t = rowsEl.querySelectorAll('textarea'); if (t.length) t[t.length - 1].focus();
  });
  $('add-bill').addEventListener('click', function () {
    state.bills.push({ name: '', v: state.people.map(function () { return 0; }) });
    renderRows(); recalc();
    var t = moneyEl.querySelectorAll('textarea'); if (t.length) t[t.length - 1].focus();
  });
  $('start-blank').addEventListener('click', function () {
    state = { people: state.people.slice(), jobs: [{ name: '', v: [] }], bills: [], example: false, owners: [] };
    state.jobs[0].v = state.people.map(function () { return 0; });
    renderAll();
    status('Blank stand ready. Add your own jobs.');
  });

  var tabs = [$('tab-hours'), $('tab-money')], panels = [$('panel-hours'), $('panel-money')];
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t, j) { t.setAttribute('aria-selected', String(i === j)); panels[j].hidden = i !== j; });
      panels[i].querySelectorAll('textarea').forEach(autoGrow);
    });
    tab.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var o = tabs[1 - i]; o.click(); o.focus(); }
    });
  });

  $('copy-result').addEventListener('click', function () {
    copyText(resultText()).then(function (ok) { status(ok ? 'Copied. Paste it into your group chat.' : 'Couldn’t copy here. Try selecting the text by hand.'); });
  });
  $('share-result').addEventListener('click', function () {
    var text = resultText();
    if (navigator.share) {
      navigator.share({ title: 'Our lemonade stand', text: text }).catch(function (e) {
        if (e && e.name === 'AbortError') return;
        copyText(text).then(function (ok) { status(ok ? 'Copied instead. Paste it wherever you like.' : 'Couldn’t share here.'); });
      });
    } else {
      copyText(text).then(function (ok) { status(ok ? 'Sharing isn’t available here, so it’s copied. Paste it wherever you like.' : 'Couldn’t share here.'); });
    }
  });
  $('keep-device').addEventListener('change', function (e) {
    keep = e.target.checked;
    if (keep) { save(); status('Kept on this device only. Press “Erase” any time to remove it.'); }
    else { try { localStorage.removeItem(KEY); } catch (err) {} status('No longer kept. Nothing from the stand is on this device now.'); }
  });
  $('erase-device').addEventListener('click', erase);

  window.TOLLemonade = { recalc: recalc, state: function () { return state; }, resultText: resultText, fridgeText: fridgeText, hoursSentence: hoursSentence };
})();
