/*
  lemonade-calc.js
  The Objective Ledger — Lemonade Stand calculator (2 to 8 people)

  Hours tab: one line per job, hours per person.
  Money tab (optional): one line per shared cost, what each person paid.

  Descriptive, not evaluative: it reports what was entered and states the
  split as a plain fact, never a verdict on anyone.

  Nothing typed is sent anywhere. If the visitor ticks "Keep this on my
  device", the stand is kept in localStorage (this browser only) until
  they press "Erase".
*/
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var peopleEl = $('people'), rowsEl = $('rows'), moneyEl = $('money-rows');
  if (!peopleEl || !rowsEl) return;

  var MIN = 2, MAX = 8;
  var KEY = 'tol-lemonade-stand-v2';
  var COLORS = ['#BFE3CF', '#F8DC6E', '#F2B8C6', '#B9D3F0', '#D9C4F0', '#F6C99B', '#C8E6A0', '#A8DDE0'];

  var EXAMPLE = {
    people: ['Me', 'Them'],
    jobs: [
      { name: 'Groceries & meal planning', v: [3, 1] },
      { name: 'Dishes', v: [1, 4] },
      { name: 'Laundry', v: [0, 3] },
      { name: 'Bills & scheduling', v: [2, 0] },
      { name: 'Emotional check-ins', v: [2, 2] }
    ],
    bills: [
      { name: 'Rent', v: [600, 600] },
      { name: 'Power & internet', v: [140, 0] }
    ]
  };

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
    if (!keep) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked: stay in-tab only */ }
  }
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
      inp.type = 'text'; inp.value = p; inp.maxLength = 40;
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
    ta.rows = 1; ta.className = 'task-name'; ta.value = item.name;
    ta.placeholder = kind === 'job' ? 'What was the job?' : 'What was the cost?';
    ta.setAttribute('aria-label', kind === 'job' ? 'Job name' : 'Bill name');
    ta.addEventListener('input', function () { item.name = ta.value.replace(/\n/g, ' '); autoGrow(ta); markEdited(); recalc(); });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter') e.preventDefault(); });
    var rm = document.createElement('button');
    rm.type = 'button'; rm.className = 'remove'; rm.innerHTML = '&times;';
    rm.setAttribute('aria-label', kind === 'job' ? 'Remove this job' : 'Remove this bill');
    rm.addEventListener('click', function () { list.splice(list.indexOf(item), 1); renderRows(); recalc(); });
    top.appendChild(ta); top.appendChild(rm);
    var amts = document.createElement('div'); amts.className = 'row-amts';
    state.people.forEach(function (p, i) {
      var lab = document.createElement('label');
      lab.style.setProperty('--pc', COLORS[i]);
      var sp = document.createElement('span'); sp.className = 'pname'; sp.dataset.i = i;
      sp.textContent = nameOf(i) + (kind === 'job' ? ' (hours)' : ' paid');
      var inp = document.createElement('input');
      inp.type = 'number'; inp.min = '0'; inp.step = kind === 'job' ? '0.5' : '0.01'; inp.inputMode = 'decimal';
      inp.value = item.v[i] || 0;
      inp.addEventListener('input', function () {
        // a negative number, or more hours than a week has, is left out and said so (never quietly zeroed)
        var raw = inp.value, n = parseFloat(raw), bad = raw !== '' && (!isFinite(n) || n < 0 || (kind === 'job' && n > 168));
        if (bad) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid');
        item.v[i] = bad ? 0 : num(raw);
        if (bad) status(n < 0 ? (kind === 'job' ? 'Hours' : 'Amounts') + ' can’t be negative, so ' + raw + ' is left out.' : raw + ' hours is more than a week has (168), so it is left out. Were they minutes?');
        markEdited(); recalc();
      });
      lab.appendChild(sp); lab.appendChild(inp);
      amts.appendChild(lab);
    });
    row.appendChild(top); row.appendChild(amts);
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
    if (state.example) { state.example = false; $('example-note').hidden = true; }
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

  function hoursSentence() {
    var t = totals(state.jobs), sum = t.reduce(function (a, b) { return a + b; }, 0);
    if (sum === 0) return 'Add some hours above to see how the work is split.';
    var p = pcts(t), n = t.length, even = 100 / n;
    var top = 0; p.forEach(function (x, i) { if (x > p[top]) top = i; });
    var topPct = Math.round(p[top]);
    var ratio = p[top] / even;
    if (n === 2) {
      if (topPct >= 90) return nameOf(top) + ' is carrying nearly all of what’s listed here (' + topPct + '%). That’s not a verdict on anyone, and it’s worth a calm talk about sharing it out.';
      if (topPct >= 60) return 'This week, ' + nameOf(top) + ' shows about ' + topPct + '% of the listed hours. That’s not a verdict on either of you — it’s just what’s written down. Worth talking through together.';
      return 'Fairly close split this week — ' + nameOf(top) + ' at ' + topPct + '%, ' + nameOf(1 - top) + ' close behind. Keep checking in as things change.';
    }
    var evenTxt = 'An even share for ' + n + ' people would be about ' + Math.round(even) + '% each.';
    if (ratio >= 1.5) return 'This week, ' + nameOf(top) + ' shows about ' + topPct + '% of the listed hours. ' + evenTxt + ' That’s not a verdict on anyone — it’s just what’s written down. Worth talking through together.';
    return 'Fairly even this week: the biggest share is ' + nameOf(top) + ' at ' + topPct + '%. ' + evenTxt + ' Keep checking in as things change.';
  }
  function moneySentence() {
    var t = totals(state.bills), sum = t.reduce(function (a, b) { return a + b; }, 0);
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
    var t = totals(state.jobs), p = pcts(t), any = t.some(function (x) { return x > 0; });
    var wraps = document.querySelectorAll('#glasses .ls-gwrap');
    wraps.forEach(function (w, i) {
      w.querySelector('.ls-juice').style.height = (any ? Math.max(4, p[i] * 0.92) : 0) + '%';
      w.querySelector('.ls-pct').textContent = any ? Math.round(p[i]) + '%' : '—';
      w.querySelector('.ls-gname').textContent = nameOf(i) + ' · ' + r1(t[i]) + 'h';
    });
    $('balance-line').textContent = hoursSentence();
    $('money-line').textContent = moneySentence();
    save();
  }

  function renderAll() {
    renderPeople(); renderRows(); renderGlasses();
    $('example-note').hidden = !state.example;
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
  var saved = loadSaved();
  if (saved && saved.people && saved.people.length >= MIN) {
    state = saved; keep = true; $('keep-device').checked = true;
    state.jobs = state.jobs || []; state.bills = state.bills || [];
  } else {
    state = clone(EXAMPLE); state.example = true;
  }
  renderAll();

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
    state = { people: state.people.slice(), jobs: [{ name: '', v: [] }], bills: [], example: false };
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

  window.TOLLemonade = { recalc: recalc, state: function () { return state; }, resultText: resultText };
})();
