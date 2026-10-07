/*
  lemonade-calc.js
  The Objective Ledger — Lemonade Stand calculator (just me, or 2 to 8 people)

  First step, "Who is this for?":
    - Just me ('solo'): your own week as a ledger. Where your time and attention go, the thinking
      work made visible, rest against load, a gentle "sustainable or stretched?" read, what you could
      hand off, drop, simplify or schedule, and a copyable summary to explain your load to others.
      No comparison between people.
    - Me and others I share a home with ('group'): the split between 2 to 8 people, as before.
  The choice is remembered on this device (tol-lemonade-mode). Switching keeps every entry: "just me"
  is simply the first person's side of the same stand.

  Hours tab: one line per job. Add jobs from the task library (typical minutes filled in, editable) or
  type your own. Per job: the category, how often (each day, 3 times a week, each week, each month),
  minutes or hours, each person's time, and, optionally, the thinking part (noticing, planning,
  remembering) in minutes and who notices first.
  Money tab (optional, group only): one line per shared cost, what each person paid.

  Descriptive, not evaluative: it reports what was entered and states the split as a plain fact, never
  a verdict on anyone. Each person fills in only their own side.

  Nothing typed is sent anywhere. While the tab is open, a draft is kept in sessionStorage (this tab
  only, gone when the tab closes) so a Back button or an interruption never loses the stand; "Clear"
  removes it. If the visitor ticks "Keep this on my device", the stand (and any saved weeks) is kept in
  localStorage (this browser only) until they press "Erase".

  The household (assets/js/household.js): a stand that starts with no names offers the names and jobs
  kept from another tool ("Use your household from before?"). Ticking "Use these names in the other
  tools" keeps the names and home jobs (never the hours) in this browser for the other tools to offer,
  and keeps them up to date from here; unticking forgets them.

  "Chores with one owner each": the no-project path. Pick up to five jobs (straight from the rows, or
  typed in), give each one owner with one tap, then copy or print a fridge list.
*/
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var peopleEl = $('people'), rowsEl = $('rows'), moneyEl = $('money-rows');
  if (!peopleEl || !rowsEl) return;

  var MIN = 2, MAX = 8;
  var KEY = 'tol-lemonade-stand-v2', DRAFT = 'tol-lemonade-draft', MODE_KEY = 'tol-lemonade-mode', MAX_OWN = 5, MAX_WEEKS = 26;
  var COLORS = ['#BFE3CF', '#F8DC6E', '#F2B8C6', '#B9D3F0', '#D9C4F0', '#F6C99B', '#C8E6A0', '#A8DDE0'];
  var WAKING = 112; // about 16 waking hours a day, 7 days

  /* ---------- how often, and categories ---------- */
  var FREQ = { day: 7, few: 3, week: 1, month: 12 / 52 };
  var FREQ_ORDER = ['day', 'few', 'week', 'month'];
  var FREQ_LABEL = { day: 'Each day', few: '3 times a week', week: 'Each week', month: 'Each month' };
  var FREQ_SHORT = { day: 'a day', few: '3× a week', week: 'a week', month: 'a month' };
  // k: 'home' jobs are counted in the split; 'work' and 'rest' are shown beside it, never in it.
  // inv: the whole job is invisible work (thinking or emotional), not just its thinking part.
  var CATS = [
    { id: 'home', n: 'Home & cleaning', k: 'home', act: 'simplify', tip: 'Lower the bar a notch, or split it by room.' },
    { id: 'food', n: 'Food & meals', k: 'home', act: 'simplify', tip: 'Repeat a few easy meals, or cook once for two nights.' },
    { id: 'laundry', n: 'Laundry', k: 'home', act: 'handoff', tip: 'Older kids and adults can each own their own laundry.' },
    { id: 'kids', n: 'Kids & caring', k: 'home', act: 'handoff', tip: 'Trade whole routines, like bedtime on set nights.' },
    { id: 'pets', n: 'Pets', k: 'home', act: 'handoff', tip: 'One person owns feeding, another owns walks.' },
    { id: 'money', n: 'Money & bills', k: 'home', act: 'schedule', tip: 'Set autopay where you can, and keep one money half hour a week.' },
    { id: 'admin', n: 'Admin & paperwork', k: 'home', act: 'schedule', tip: 'Batch it into one admin slot a week.' },
    { id: 'appts', n: 'Appointments & health admin', k: 'home', act: 'schedule', tip: 'Book the next visit before you leave, and keep one shared calendar.' },
    { id: 'errands', n: 'Errands & shopping', k: 'home', act: 'simplify', tip: 'Combine trips, or order ahead for pickup.' },
    { id: 'car', n: 'Car & repairs', k: 'home', act: 'schedule', tip: 'Pick one fix-it morning a month.' },
    { id: 'yard', n: 'Yard & outdoors', k: 'home', act: 'simplify', tip: 'Let some of it grow a little wild, or share it out.' },
    { id: 'social', n: 'Social & family keeping-in-touch', k: 'home', act: 'handoff', tip: 'Each person keeps in touch with their own side of the family.' },
    { id: 'mental', n: 'Planning & remembering', k: 'home', inv: true, act: 'handoff', tip: 'Hand off the whole job, the remembering included, not just the doing.' },
    { id: 'emotional', n: 'Emotional work', k: 'home', inv: true, act: 'handoff', tip: 'Say it out loud, and take turns being the one who checks in.' },
    { id: 'work', n: 'Work & school hours', k: 'work' },
    { id: 'rest', n: 'Rest & recharging', k: 'rest' },
    { id: 'other', n: 'Other jobs', k: 'home', act: 'simplify', tip: 'Ask whether it still needs doing at all.' }
  ];
  var CAT = {}; CATS.forEach(function (c) { CAT[c.id] = c; });
  // The task library: [name, typical amount, how often, unit ('m' minutes, default, or 'h' hours)]
  var LIB = {
    home: [['Dishes & kitchen reset', 20, 'day'], ['Tidying up', 15, 'day'], ['Vacuuming & floors', 45, 'week'], ['Cleaning the bathroom', 40, 'week'], ['Trash & recycling', 10, 'few'], ['Changing the sheets', 20, 'week'], ['Restocking soap, paper & supplies', 15, 'week'], ['Deep clean (fridge, oven, windows)', 60, 'month']],
    food: [['Meal planning & the grocery list', 30, 'week'], ['Grocery shopping', 60, 'week'], ['Putting groceries away', 15, 'week'], ['Cooking dinner', 45, 'day'], ['Breakfasts', 15, 'day'], ['Packing lunches', 15, 'day'], ['Clearing out the fridge', 20, 'week']],
    laundry: [['Washing & drying', 20, 'few'], ['Folding & putting away', 25, 'few'], ['Towels & bedding', 20, 'week'], ['Ironing & mending', 30, 'week']],
    kids: [['Getting kids up & ready', 30, 'day'], ['School drop-off & pickup', 40, 'day'], ['Bedtime routine', 30, 'day'], ['Homework help', 30, 'day'], ['Bath time', 20, 'day'], ['Playing & reading together', 30, 'day'], ['Driving to activities', 60, 'week'], ['Helping a family member at home', 120, 'week']],
    pets: [['Feeding & fresh water', 10, 'day'], ['Dog walks', 30, 'day'], ['Litter, cage or tank cleaning', 15, 'few'], ['Grooming & baths', 30, 'month'], ['Vet visits & pet supplies', 60, 'month']],
    money: [['Paying bills', 20, 'week'], ['Budget & checking accounts', 30, 'week'], ['Splitting shared costs', 15, 'week'], ['Taxes & receipts', 90, 'month'], ['Comparing plans & renewals', 60, 'month']],
    admin: [['Mail & home email', 15, 'few'], ['School forms & sign-ups', 20, 'week'], ['Calls & customer service', 30, 'week'], ['Insurance & documents', 45, 'month'], ['Licenses & registrations', 30, 'month'], ['Filing & keeping papers in order', 30, 'month']],
    appts: [['Booking appointments', 20, 'week'], ['Getting people to appointments', 90, 'month'], ['Pharmacy pickups', 20, 'week'], ['Claims & forms', 30, 'month'], ['Keeping the appointment calendar', 10, 'week']],
    errands: [['Household shopping', 45, 'week'], ['Online orders & deliveries', 15, 'week'], ['Post office & pickups', 20, 'week'], ['Returns & exchanges', 30, 'month'], ['Clothes & shoes for others', 60, 'month'], ['Gifts & cards', 45, 'month']],
    car: [['Gas & car wash', 20, 'week'], ['Car service & tires', 90, 'month'], ['Small fixes around the home', 45, 'week'], ['Waiting in for repair people', 60, 'month'], ['Filters, bulbs & smoke alarm batteries', 20, 'month']],
    yard: [['Mowing', 45, 'week'], ['Weeding & watering', 30, 'week'], ['Raking leaves', 60, 'week'], ['Shoveling snow', 30, 'week'], ['Plants & garden', 20, 'week']],
    social: [['Keeping in touch with family', 30, 'week'], ['Birthdays & holidays', 60, 'month'], ['Thank-you notes & messages', 15, 'week'], ['Hosting & visitors', 120, 'month'], ['Planning time with friends', 20, 'week'], ['Kids’ playdates & parties', 60, 'month']],
    mental: [['Keeping the family calendar', 15, 'few'], ['Noticing what’s running low', 10, 'day'], ['Planning the week ahead', 30, 'week'], ['Remembering dates & deadlines', 10, 'day'], ['Childcare & backup plans', 30, 'week'], ['Checking that things got done', 10, 'day'], ['Trips & holiday planning', 120, 'month']],
    emotional: [['Keeping the peace', 15, 'day'], ['Checking in on how people are', 15, 'day'], ['Calming a hard moment', 20, 'few'], ['Listening & support', 30, 'few'], ['Smoothing things over with family', 30, 'week']],
    work: [['Paid work', 40, 'week', 'h'], ['Commute', 30, 'day'], ['School or classes', 15, 'week', 'h'], ['Study & homework (my own)', 5, 'week', 'h'], ['Work messages after hours', 20, 'day'], ['A side job', 5, 'week', 'h']],
    rest: [['Time to myself', 30, 'day'], ['A walk or moving my body', 30, 'few'], ['Hobbies', 60, 'week'], ['Time with friends', 120, 'week'], ['Quiet time doing nothing', 20, 'day'], ['A full day off', 8, 'month', 'h']]
  };
  var PLAN = [['keep', 'Keep'], ['handoff', 'Hand off'], ['drop', 'Drop'], ['simplify', 'Simplify'], ['schedule', 'Schedule']];

  function libMatch(name) {
    var l = (name || '').trim().toLowerCase(), hit = null;
    Object.keys(LIB).forEach(function (c) { LIB[c].forEach(function (t) { if (t[0].toLowerCase() === l) hit = { cat: c, t: t }; }); });
    return hit;
  }
  // Older stands had no categories: make a calm guess from the job's name, or file it under "Other jobs".
  var GUESS = [
    ['emotional', /emotion|check-?in|peace|listen|support|comfort/], ['money', /bill|budget|money|tax|rent|bank|pay/],
    ['food', /groc|meal|cook|lunch|dinner|breakfast|food|kitchen/], ['laundry', /laundry|fold|iron|towel/],
    ['pets', /pet|dog|cat\b|litter|vet/], ['kids', /kid|child|baby|bedtime|homework|school run|daycare|caring|care for/],
    ['appts', /appoint|doctor|dentist|pharmac|clinic/], ['admin', /form|paper|mail|email|insurance|admin|document/],
    ['errands', /errand|shop|store|gift|return/], ['car', /car\b|repair|fix|garage|tire/], ['yard', /yard|garden|mow|lawn|snow|leaves|weed/],
    ['social', /birthday|family|friend|call|visit|holiday/], ['mental', /plan|remember|calendar|schedul|list|notic/],
    ['home', /dish|clean|tidy|vacuum|bathroom|trash|floor|sheet|dust/], ['work', /work|job|commute|class|study/], ['rest', /rest|hobby|myself|relax|off\b/]
  ];
  function guessCat(name) {
    var m = libMatch(name); if (m) return m.cat;
    var l = (name || '').toLowerCase(), c = 'other';
    for (var i = 0; i < GUESS.length; i++) if (GUESS[i][1].test(l)) { c = GUESS[i][0]; break; }
    return c;
  }

  // The example is shown as grey placeholder text (item.ex), never as values: it is never counted in
  // a total, and the first edit to a row turns that row into yours.
  function exampleRow(name, v, cat) { return { name: '', v: v.map(function () { return 0; }), ex: { name: name, v: v }, cat: cat, freq: 'week', unit: 'h', t: [], nf: -1 }; }
  var EXAMPLE = {
    people: ['Me', 'Them'],
    jobs: [
      exampleRow('Groceries & meal planning', [3, 1], 'food'),
      exampleRow('Dishes', [1, 4], 'home'),
      exampleRow('Laundry', [0, 3], 'laundry'),
      exampleRow('Bills & scheduling', [2, 0], 'money'),
      exampleRow('Emotional check-ins', [2, 2], 'emotional')
    ],
    bills: [
      exampleRow('Rent', [600, 600]),
      exampleRow('Power & internet', [140, 0])
    ]
  };
  function anyExample() { return state.jobs.concat(state.bills).some(function (r) { return !!r.ex; }); }
  function anyBad(list) { return list.some(function (r) { return r.raw && Object.keys(r.raw).length; }); }

  var state;       // { people:[], jobs:[], bills:[], owners:[], example:bool, weeks:[], agreed:{on,p[]}, as:int, mode }
  var keep = false, mode = null;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function num(x) { var n = parseFloat(x); return isFinite(n) && n > 0 ? n : 0; }
  function r1(n) { return Math.round(n * 10) / 10; }
  function sum(a) { return a.reduce(function (s, x) { return s + x; }, 0); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return (Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  // plain time: "20 min", "2.5 h"
  function hrs(h) { if (h <= 0) return '0 h'; if (h < 1) return Math.max(1, Math.round(h * 60)) + ' min'; return r1(h) + ' h'; }
  function nameOf(i) { var n = (state.people[i] || '').trim(); return n || ('Person ' + (i + 1)); }
  function status(msg) { var s = $('ls-status'); if (s) { s.textContent = msg; clearTimeout(status.t); status.t = setTimeout(function () { s.textContent = ''; }, 4000); } }
  function solo() { return mode === 'solo'; }
  function visiblePeople() { return solo() ? [0] : state.people.map(function (_, i) { return i; }); }

  /* ---------- storage (opt-in only, except the remembered "who is this for" choice) ---------- */
  function loadSaved() {
    try { var raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  var hhWrite = null; // keeps the household up to date, only while "Use these names in the other tools" is ticked
  function save() {
    try { sessionStorage.setItem(DRAFT, JSON.stringify(state)); } catch (e) { /* no tab storage: the page still works */ }
    if (hhWrite) hhWrite.soon();
    if (!keep) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked: stay in-tab only */ }
  }
  function loadDraft() {
    try { var raw = sessionStorage.getItem(DRAFT); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function loadMode() { try { var m = localStorage.getItem(MODE_KEY); return m === 'solo' || m === 'group' ? m : null; } catch (e) { return null; } }
  function saveMode(m) { try { localStorage.setItem(MODE_KEY, m); } catch (e) {} }
  // "you" and "them" read better than "Me" and "Them" inside a sentence
  function who(i) { var n = nameOf(i), l = n.toLowerCase(); return l === 'me' ? 'you' : l === 'them' ? 'them' : n; }
  function erase() {
    try { localStorage.removeItem(KEY); localStorage.removeItem(MODE_KEY); } catch (e) {}
    keep = false;
    $('keep-device').checked = false;
    status('Erased. Nothing from the stand is kept on this device now.');
  }

  /* ---------- making any saved stand fit the current shape ---------- */
  function fit(a, n, fill) { a = Array.isArray(a) ? a : []; while (a.length < n) a.push(fill); a.length = n; return a; }
  function normalize() {
    state.people = Array.isArray(state.people) ? state.people.slice(0, MAX) : ['Me', 'Them'];
    while (state.people.length < MIN) state.people.push('');
    var n = state.people.length;
    state.jobs = Array.isArray(state.jobs) ? state.jobs : [];
    state.bills = Array.isArray(state.bills) ? state.bills : [];
    state.owners = Array.isArray(state.owners) ? state.owners : [];
    state.jobs.forEach(function (j) {
      j.name = j.name || ''; j.v = fit(j.v, n, 0); j.t = fit(j.t, n, 0);
      // a stand from before "how often" and minutes: its numbers were hours this week
      if (!FREQ[j.freq]) j.freq = 'week';
      if (j.unit !== 'm' && j.unit !== 'h') j.unit = 'h';
      if (!CAT[j.cat]) j.cat = guessCat(j.name || (j.ex && j.ex.name));
      if (typeof j.nf !== 'number' || j.nf >= n) j.nf = -1;
    });
    state.bills.forEach(function (b) { b.name = b.name || ''; b.v = fit(b.v, n, 0); });
    state.weeks = Array.isArray(state.weeks) ? state.weeks.slice(-MAX_WEEKS) : [];
    state.agreed = state.agreed && typeof state.agreed === 'object' ? state.agreed : { on: false, p: [] };
    state.agreed.p = fit(state.agreed.p, n, '');
    if (typeof state.as !== 'number' || state.as >= n || state.as < 0) state.as = 0;
  }

  /* ---------- weekly time ---------- */
  function mult(j) { return FREQ[j.freq] || 1; }
  function doH(j, i) { return num(j.v[i]) * (j.unit === 'm' ? 1 / 60 : 1) * mult(j); }
  function thH(j, i) { return num((j.t || [])[i]) / 60 * mult(j); }
  function kindOf(j) { return (CAT[j.cat] || CAT.other).k; }
  function jobH(j, i) { return doH(j, i) + thH(j, i); }
  // invisible: the thinking part of any job, plus the whole of a thinking or emotional job
  function invH(j, i) { return thH(j, i) + ((CAT[j.cat] || {}).inv ? doH(j, i) : 0); }
  function peopleTotals(kind, fn) {
    return state.people.map(function (_, i) {
      return sum(state.jobs.filter(function (j) { return kindOf(j) === kind; }).map(function (j) { return (fn || jobH)(j, i); }));
    });
  }
  // the household split: doing plus thinking time on home jobs (work and rest are shown beside it)
  function totals(list) {
    if (list === state.bills) {
      var t = state.people.map(function () { return 0; });
      list.forEach(function (r) { r.v.forEach(function (x, i) { if (i < t.length) t[i] += num(x); }); });
      return t;
    }
    return peopleTotals('home');
  }
  function pcts(t) {
    var s = sum(t);
    // no hours yet means empty glasses, not an even split
    return t.map(function (x) { return s > 0 ? x / s * 100 : 0; });
  }

  /* ---------- checking a typed number ---------- */
  // A negative number, or more hours than a week has, is left out and said so under the row (never quietly zeroed).
  function checkVal(j, k) {
    var think = k.charAt(0) === 't', i = +(think ? k.slice(1) : k);
    var raw = j.raw && j.raw[k] != null ? j.raw[k] : null;
    var s = raw != null ? raw : String((think ? j.t[i] : j.v[i]) || '');
    var n = parseFloat(s), wk;
    if (s === '' || s === '0') { wk = 0; n = 0; }
    else wk = isFinite(n) ? (think || j.unit === 'm' ? n / 60 : n) * (j.isBill ? 1 : mult(j)) : 0;
    var bad = s !== '' && (!isFinite(n) || n < 0 || (!j.isBill && wk > 168));
    var arr = think ? j.t : j.v;
    if (bad) { j.raw = j.raw || {}; j.raw[k] = s; arr[i] = 0; }
    else { if (j.raw) delete j.raw[k]; arr[i] = num(s); }
    return bad;
  }
  function revalidate(j) {
    var ks = [];
    state.people.forEach(function (_, i) { ks.push(String(i)); if (!j.isBill) ks.push('t' + i); });
    ks.forEach(function (k) { checkVal(j, k); });
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
    hhRefresh();
  }
  function addPerson() {
    if (state.people.length >= MAX) return;
    state.people.push('');
    state.jobs.forEach(function (j) { j.v.push(0); j.t.push(0); });
    state.bills.forEach(function (b) { b.v.push(0); });
    state.agreed.p.push('');
    renderAll();
    var inputs = peopleEl.querySelectorAll('input');
    if (inputs.length) inputs[inputs.length - 1].focus();
    status('Added a person. There are ' + state.people.length + ' at the stand.');
  }
  function shiftRaw(r, i) {
    if (!r.raw) return;
    var out = {};
    Object.keys(r.raw).forEach(function (k) {
      var t = k.charAt(0) === 't', n = +(t ? k.slice(1) : k);
      if (n === i) return;
      out[(t ? 't' : '') + (n > i ? n - 1 : n)] = r.raw[k];
    });
    r.raw = out;
  }
  function removePerson(i) {
    if (state.people.length <= MIN) return;
    var gone = nameOf(i);
    state.people.splice(i, 1);
    state.jobs.forEach(function (j) { j.v.splice(i, 1); j.t.splice(i, 1); shiftRaw(j, i); if (j.nf === i) j.nf = -1; else if (j.nf > i) j.nf--; });
    state.bills.forEach(function (b) { b.v.splice(i, 1); shiftRaw(b, i); });
    state.agreed.p.splice(i, 1);
    if (state.as >= state.people.length) state.as = 0;
    ownersList().forEach(function (o) { if (o.who === i) o.who = -1; else if (o.who > i) o.who--; });
    renderAll();
    status('Removed ' + gone + '.');
  }

  /* ---------- focus that survives a redraw ---------- */
  function keepFocus(box, fn) {
    var a = document.activeElement, k = a && box.contains(a) ? a.getAttribute('data-fk') : null;
    fn();
    if (k) { var el = box.querySelector('[data-fk="' + k + '"]'); if (el) el.focus(); }
  }

  /* ---------- job rows ---------- */
  function autoGrow(t) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }
  function unitWord(j) { return j.unit === 'm' ? 'min' : 'hours'; }
  function noteText(j) {
    return Object.keys(j.raw || {}).map(function (k) {
      var think = k.charAt(0) === 't', i = +(think ? k.slice(1) : k), raw = j.raw[k], n = parseFloat(raw);
      var whose = (solo() ? 'You' : nameOf(i)) + (think ? ', thinking part' : '');
      return whose + ': “' + raw + '” isn’t counted, ' + (!isFinite(n) ? 'because it isn’t a number.' :
        n < 0 ? 'because ' + (j.isBill ? 'amounts' : 'time') + ' can’t be negative.' :
        j.unit === 'h' && j.freq === 'week' && !think ? 'because it’s more hours than a week has (168). Were they minutes?' :
        'because it comes to more hours than a week has (168). Check the number and how often.');
    }).join(' ');
  }
  function select(opts, val, label, fk) {
    var s = document.createElement('select');
    s.setAttribute('aria-label', label); s.setAttribute('data-fk', fk);
    opts.forEach(function (o) { var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; if (o[0] === val) op.selected = true; s.appendChild(op); });
    return s;
  }
  function makeJobRow(idx) {
    var item = state.jobs[idx];
    var row = document.createElement('div');
    row.className = 'row'; row.setAttribute('data-idx', idx);
    var top = document.createElement('div'); top.className = 'row-top';
    var ta = document.createElement('textarea');
    ta.rows = 1; ta.className = 'task-name'; ta.value = item.name; ta.setAttribute('autocomplete', 'off'); ta.setAttribute('data-fk', 'n' + idx);
    ta.placeholder = item.ex ? 'Example: ' + item.ex.name : 'What was the job?';
    ta.setAttribute('aria-label', 'Job name');
    if (item.ex) row.classList.add('is-example');
    var amts = document.createElement('div'); amts.className = 'row-amts';
    var thinkBox = document.createElement('div'); thinkBox.className = 'row-think';
    var tAmts = document.createElement('div'); tAmts.className = 'row-amts';
    var sumLine = document.createElement('p'); sumLine.className = 'row-sum';
    var note = document.createElement('p'); note.className = 'row-note'; note.setAttribute('aria-live', 'polite');
    // the first edit to an example row makes it yours: its grey example numbers go
    function own() {
      if (!item.ex) return;
      delete item.ex; row.classList.remove('is-example');
      ta.placeholder = 'What was the job?';
      amts.querySelectorAll('input').forEach(function (x) { x.placeholder = '0'; });
    }
    function showNote() { var t = noteText(item); note.textContent = t; note.hidden = !t; }
    function showSum() {
      var vp = visiblePeople(), tot = sum(vp.map(function (i) { return jobH(item, i); }));
      sumLine.textContent = tot > 0 ? 'About ' + hrs(tot) + ' a week' + (vp.length > 1 ? ' in all' : '') + '.' : '';
    }
    row._refresh = function () { showNote(); showSum(); };
    ta.addEventListener('input', function () { own(); item.name = ta.value.replace(/\n/g, ' '); autoGrow(ta); markEdited(); recalc(); renderPicks(); });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter') e.preventDefault(); });
    var rm = document.createElement('button');
    rm.type = 'button'; rm.className = 'remove'; rm.innerHTML = '&times;';
    rm.setAttribute('aria-label', 'Remove this job');
    rm.addEventListener('click', function () { state.jobs.splice(state.jobs.indexOf(item), 1); markEdited(); renderRows(); renderOwners(); renderLibTasks(); recalc(); status('Removed the job.'); });
    top.appendChild(ta); top.appendChild(rm);

    // kind of job (in the fold), how often and minutes or hours (beside the time)
    var meta = document.createElement('div'); meta.className = 'row-kind';
    var cs = select(CATS.map(function (c) { return [c.id, c.n]; }), item.cat, 'Kind of job', 'c' + idx);
    var fs = select(FREQ_ORDER.map(function (f) { return [f, FREQ_LABEL[f]]; }), item.freq, 'How often', 'f' + idx);
    var us = select([['m', 'Minutes'], ['h', 'Hours']], item.unit, 'Minutes or hours', 'u' + idx);
    function labeled(txt, el, cls) { var l = document.createElement('label'); if (cls) l.className = cls; var sp = document.createElement('span'); sp.textContent = txt; l.appendChild(sp); l.appendChild(el); return l; }
    meta.appendChild(labeled('Kind of job', cs));
    cs.addEventListener('change', function () { own(); item.cat = cs.value; markEdited(); renderRows(); renderLibTasks(); recalc(); status('Moved to ' + CAT[item.cat].n + '.'); });
    fs.addEventListener('change', function () { own(); item.freq = fs.value; revalidate(item); markEdited(); refreshInputs(); recalc(); });
    us.addEventListener('change', function () {
      own();
      var to = us.value;
      // switching units keeps the same amount of time: 30 minutes becomes 0.5 hours
      item.v = item.v.map(function (x) { var n = num(x); return n ? (to === 'h' ? Math.round(n / 60 * 100) / 100 : Math.round(n * 60)) : 0; });
      item.unit = to; revalidate(item); markEdited(); refreshInputs(); recalc();
    });

    var inputs = [];
    function amountInput(i, think) {
      var k = (think ? 't' : '') + i;
      var lab = document.createElement('label');
      lab.style.setProperty('--pc', COLORS[i]);
      var sp = document.createElement('span'); sp.className = 'pname'; sp.dataset.i = i; sp.dataset.k = think ? 't' : 'v';
      var inp = document.createElement('input');
      inp.type = 'number'; inp.min = '0'; inp.inputMode = 'decimal'; inp.autocomplete = 'off'; inp.setAttribute('data-fk', k + '-' + idx);
      inp.addEventListener('input', function () {
        own();
        item.raw = item.raw || {}; item.raw[k] = inp.value;
        if (checkVal(item, k)) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid');
        markEdited(); row._refresh(); recalc();
      });
      lab.appendChild(sp); lab.appendChild(inp);
      inputs.push({ i: i, think: think, k: k, inp: inp, sp: sp });
      return lab;
    }
    function refreshInputs() {
      inputs.forEach(function (o) {
        var i = o.i, inp = o.inp;
        o.sp.textContent = (solo() ? 'Me' : nameOf(i)) + (o.think ? ', thinking (min)' : ' (' + unitWord(item) + ')');
        inp.step = o.think || item.unit === 'm' ? '5' : '0.5';
        var lab = (solo() ? 'Your time' : nameOf(i)) + (o.think ? ', thinking part in minutes' : ', ' + unitWord(item)) + ', ' + FREQ_LABEL[item.freq].toLowerCase();
        if (item.ex && !o.think) { inp.value = ''; inp.placeholder = String(item.ex.v[i] || 0); lab += ' (example: ' + (item.ex.v[i] || 0) + ')'; }
        else {
          inp.placeholder = '0';
          var raw = item.raw && item.raw[o.k] != null ? item.raw[o.k] : null;
          var v = o.think ? item.t[i] : item.v[i];
          if (document.activeElement !== inp) inp.value = raw != null ? raw : (o.think ? (v || '') : (v || 0));
        }
        inp.setAttribute('aria-label', lab);
        if (item.raw && item.raw[o.k] != null) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid');
      });
      row._refresh();
    }
    visiblePeople().forEach(function (i) { amts.appendChild(amountInput(i, false)); });
    amts.appendChild(labeled('Counted in', us, 'ls-sel'));
    amts.appendChild(labeled('How often', fs, 'ls-sel'));

    // the thinking part and who notices first: optional, folded away until it's wanted
    var more = document.createElement('button');
    more.type = 'button'; more.className = 'ls-more'; more.setAttribute('data-fk', 'm' + idx);
    var hasThink = item.t.some(function (x) { return num(x) > 0; }) || item.nf !== -1 || (item.raw && Object.keys(item.raw).some(function (k) { return k.charAt(0) === 't'; }));
    var open = !!(hasThink || item.open);
    thinkBox.hidden = !open;
    function moreLabel() { more.textContent = (thinkBox.hidden ? '+ ' : '− ') + 'More: the thinking part, who notices, kind'; more.setAttribute('aria-expanded', String(!thinkBox.hidden)); }
    more.addEventListener('click', function () { thinkBox.hidden = !thinkBox.hidden; item.open = !thinkBox.hidden; moreLabel(); save(); });
    moreLabel();
    var tnote = document.createElement('p'); tnote.className = 'ls-mini';
    tnote.textContent = 'Noticing, planning and remembering, in minutes each time. Optional.';
    thinkBox.appendChild(tnote);
    visiblePeople().forEach(function (i) { tAmts.appendChild(amountInput(i, true)); });
    thinkBox.appendChild(tAmts);
    var nfWrap = document.createElement('div'); nfWrap.className = 'ls-nf';
    var nfLab = document.createElement('p'); nfLab.className = 'ls-mini'; nfLab.id = 'nf-' + idx; nfLab.textContent = 'Who usually notices it needs doing first?';
    var nfg = document.createElement('div'); nfg.className = 'ls-pick'; nfg.setAttribute('role', 'group'); nfg.setAttribute('aria-labelledby', 'nf-' + idx);
    var nfOpts = solo() ? [[0, 'Me'], [-2, 'Someone else']] : state.people.map(function (_, i) { return [i, nameOf(i)]; });
    nfOpts.forEach(function (o) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'ls-chip'; b.setAttribute('data-fk', 'nf' + idx + '_' + o[0]);
      if (o[0] >= 0) b.style.setProperty('--pc', COLORS[o[0]]);
      b.setAttribute('aria-pressed', String(item.nf === o[0])); b.textContent = o[1];
      b.addEventListener('click', function () {
        own(); item.nf = item.nf === o[0] ? -1 : o[0];
        nfg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', String(item.nf === o[0]));
        markEdited(); recalc();
      });
      nfg.appendChild(b);
    });
    nfWrap.appendChild(nfLab); nfWrap.appendChild(nfg); thinkBox.appendChild(nfWrap); thinkBox.appendChild(meta);

    var foot = document.createElement('div'); foot.className = 'row-foot';
    foot.appendChild(more); foot.appendChild(sumLine);
    row.appendChild(top); row.appendChild(amts); row.appendChild(foot);
    row.appendChild(thinkBox); row.appendChild(note);
    refreshInputs();
    requestAnimationFrame(function () { autoGrow(ta); });
    return row;
  }
  function makeBillRow(idx) {
    var item = state.bills[idx]; item.isBill = true;
    var row = document.createElement('div'); row.className = 'row';
    var top = document.createElement('div'); top.className = 'row-top';
    var ta = document.createElement('textarea');
    ta.rows = 1; ta.className = 'task-name'; ta.value = item.name; ta.setAttribute('autocomplete', 'off'); ta.setAttribute('data-fk', 'bn' + idx);
    ta.placeholder = item.ex ? 'Example: ' + item.ex.name : 'What was the cost?';
    ta.setAttribute('aria-label', 'Bill name');
    if (item.ex) row.classList.add('is-example');
    var amts = document.createElement('div'); amts.className = 'row-amts';
    var note = document.createElement('p'); note.className = 'row-note'; note.setAttribute('aria-live', 'polite');
    function own() {
      if (!item.ex) return;
      delete item.ex; row.classList.remove('is-example'); ta.placeholder = 'What was the cost?';
      amts.querySelectorAll('input').forEach(function (x) { x.placeholder = '0'; });
    }
    function showNote() { var t = noteText(item); note.textContent = t; note.hidden = !t; }
    ta.addEventListener('input', function () { own(); item.name = ta.value.replace(/\n/g, ' '); autoGrow(ta); markEdited(); recalc(); });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter') e.preventDefault(); });
    var rm = document.createElement('button');
    rm.type = 'button'; rm.className = 'remove'; rm.innerHTML = '&times;'; rm.setAttribute('aria-label', 'Remove this bill');
    rm.addEventListener('click', function () { state.bills.splice(state.bills.indexOf(item), 1); renderRows(); recalc(); });
    top.appendChild(ta); top.appendChild(rm);
    state.people.forEach(function (p, i) {
      var lab = document.createElement('label'); lab.style.setProperty('--pc', COLORS[i]);
      var sp = document.createElement('span'); sp.className = 'pname'; sp.dataset.i = i; sp.dataset.k = 'b';
      sp.textContent = nameOf(i) + ' paid';
      var inp = document.createElement('input');
      inp.type = 'number'; inp.min = '0'; inp.step = '0.01'; inp.inputMode = 'decimal'; inp.autocomplete = 'off'; inp.setAttribute('data-fk', 'b' + i + '-' + idx);
      inp.setAttribute('aria-label', nameOf(i) + ', amount paid' + (item.ex ? ' (example: ' + (item.ex.v[i] || 0) + ')' : ''));
      if (item.ex) { inp.value = ''; inp.placeholder = String(item.ex.v[i] || 0); }
      else { inp.placeholder = '0'; inp.value = item.raw && item.raw[i] != null ? item.raw[i] : (item.v[i] || 0); }
      if (item.raw && item.raw[i] != null) inp.setAttribute('aria-invalid', 'true');
      inp.addEventListener('input', function () {
        own();
        item.raw = item.raw || {}; item.raw[i] = inp.value;
        if (checkVal(item, String(i))) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid');
        showNote(); markEdited(); recalc();
      });
      lab.appendChild(sp); lab.appendChild(inp); amts.appendChild(lab);
    });
    row.appendChild(top); row.appendChild(amts); row.appendChild(note);
    showNote();
    requestAnimationFrame(function () { autoGrow(ta); });
    return row;
  }
  function renderRows() {
    keepFocus(rowsEl, function () {
      rowsEl.innerHTML = '';
      CATS.forEach(function (c) {
        var idx = [];
        state.jobs.forEach(function (j, i) { if ((CAT[j.cat] ? j.cat : 'other') === c.id) idx.push(i); });
        if (!idx.length) return;
        var g = document.createElement('div'); g.className = 'ls-group';
        var h = document.createElement('h3'); h.className = 'ls-group-h no-bubble';
        h.innerHTML = esc(c.n) + ' <span data-cat="' + c.id + '"></span>';
        g.appendChild(h);
        idx.forEach(function (i) { g.appendChild(makeJobRow(i)); });
        rowsEl.appendChild(g);
      });
      if (!state.jobs.length) rowsEl.innerHTML = '<p class="ls-panel-note">No jobs yet. Tap a task in the library above, or add your own below.</p>';
    });
    keepFocus(moneyEl, function () {
      moneyEl.innerHTML = '';
      state.bills.forEach(function (b, i) { moneyEl.appendChild(makeBillRow(i)); });
    });
  }
  function relabel() {
    document.querySelectorAll('.row-amts .pname').forEach(function (sp) {
      var i = +sp.dataset.i, k = sp.dataset.k;
      if (k === 'b') { sp.textContent = nameOf(i) + ' paid'; return; }
      var row = sp.closest('.row'), j = row ? state.jobs[+row.getAttribute('data-idx')] : null;
      if (!j) return;
      sp.textContent = (solo() ? 'Me' : nameOf(i)) + (k === 't' ? ', thinking (min)' : ' (' + unitWord(j) + ')');
    });
    renderAsRow(); renderAgreed(); renderOwners();
    document.querySelectorAll('.ls-nf .ls-chip').forEach(function (b) {
      var m = /_(-?\d+)$/.exec(b.getAttribute('data-fk') || ''); var i = m ? +m[1] : -1;
      if (i >= 0 && !solo()) b.textContent = nameOf(i);
    });
  }
  function markEdited() {
    state.example = false;
    $('example-note').hidden = !anyExample();
  }

  /* ---------- the task library ---------- */
  var libCat = 'home';
  function renderLibCats() {
    var box = $('lib-cats'); if (!box) return;
    keepFocus(box, function () {
      box.innerHTML = '';
      CATS.forEach(function (c) {
        if (c.id === 'other') return;
        var n = state.jobs.filter(function (j) { return j.cat === c.id && !j.ex; }).length;
        var b = document.createElement('button'); b.type = 'button'; b.className = 'ls-cat'; b.setAttribute('data-fk', 'lc-' + c.id);
        b.setAttribute('aria-pressed', String(libCat === c.id));
        b.innerHTML = esc(c.n) + (n ? ' <span class="ls-count">' + n + '</span>' : '');
        if (n) b.setAttribute('aria-label', c.n + ', ' + n + ' on your list');
        b.addEventListener('click', function () { libCat = c.id; renderLibCats(); renderLibTasks(); });
        box.appendChild(b);
      });
    });
  }
  function renderLibTasks() {
    var box = $('lib-tasks'); if (!box) return;
    renderLibCats();
    keepFocus(box, function () {
      box.innerHTML = '';
      var c = CAT[libCat];
      var hint = $('lib-hint');
      if (hint) hint.textContent = c.k === 'work' ? 'Work and school hours are shown beside your home jobs, never mixed into them.' :
        c.k === 'rest' ? 'Rest counts too. It shows how much room your week has to recover.' :
        libCat === 'appts' ? 'Only the logistics: booking, getting there, forms and pickups.' :
        c.inv ? 'This is the invisible part of running a home. It counts.' : '';
      (LIB[libCat] || []).forEach(function (t, k) {
        var have = state.jobs.filter(function (j) { return !j.ex && j.name.trim().toLowerCase() === t[0].toLowerCase(); })[0];
        var b = document.createElement('button'); b.type = 'button'; b.className = 'ls-task'; b.setAttribute('data-fk', 'lt-' + libCat + '-' + k);
        var amt = t[1] + (t[3] === 'h' ? ' h' : ' min') + ' ' + FREQ_SHORT[t[2]];
        b.setAttribute('aria-pressed', String(!!have));
        b.innerHTML = '<span class="ls-task-n">' + esc(t[0]) + '</span><span class="ls-task-t">' + (have ? 'On your list' : 'about ' + esc(amt)) + '</span>';
        b.setAttribute('aria-label', (have ? t[0] + ', on your list. Go to it.' : 'Add ' + t[0] + ', about ' + amt));
        b.addEventListener('click', function () { addFromLib(libCat, t); });
        box.appendChild(b);
      });
    });
  }
  function rowFor(j) { return rowsEl.querySelector('.row[data-idx="' + state.jobs.indexOf(j) + '"]'); }
  function addFromLib(cat, t) {
    var me = solo() ? 0 : state.as;
    var have = state.jobs.filter(function (j) { return !j.ex && j.name.trim().toLowerCase() === t[0].toLowerCase(); })[0];
    if (have) {
      // already listed: fill in this person's side if it's empty, then go to it
      var filled = false;
      if (!num(have.v[me])) { have.v[me] = have.unit === (t[3] || 'm') ? t[1] : (have.unit === 'h' ? Math.round(t[1] / 60 * 100) / 100 : t[1] * 60); if (have.raw) delete have.raw[String(me)]; filled = true; }
      renderRows(); recalc();
      var r = rowFor(have); if (r) { r.scrollIntoView({ block: 'center', behavior: 'smooth' }); var inp = r.querySelector('.row-amts input[data-fk="' + me + '-' + state.jobs.indexOf(have) + '"]') || r.querySelector('textarea'); if (inp) inp.focus({ preventScroll: true }); }
      status(filled ? 'Filled in ' + (solo() ? 'your' : nameOf(me) + '’s') + ' time for “' + t[0] + '”. Change it to fit your week.' : '“' + t[0] + '” is already on the list.');
      return;
    }
    // the first library task clears the grey example, so it never mixes with yours
    var hadEx = anyExample();
    state.jobs = state.jobs.filter(function (j) { return !j.ex; });
    state.bills = state.bills.filter(function (b) { return !b.ex; });
    var j = { name: t[0], v: state.people.map(function () { return 0; }), t: state.people.map(function () { return 0; }), cat: cat, freq: t[2], unit: t[3] || 'm', nf: -1 };
    j.v[me] = t[1];
    state.jobs.push(j);
    markEdited();
    renderRows(); renderLibTasks(); renderOwners(); recalc();
    status('Added “' + t[0] + '” with about ' + t[1] + (j.unit === 'h' ? ' hours ' : ' minutes ') + FREQ_SHORT[t[2]] + (solo() ? '' : ' for ' + nameOf(me)) + '. Change it to fit your week.' + (hadEx ? ' The grey example is cleared.' : ''));
  }
  function renderAsRow() {
    var box = $('as-row'); if (!box) return;
    keepFocus(box, function () {
      box.innerHTML = '';
      state.people.forEach(function (_, i) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'ls-chip'; b.setAttribute('data-fk', 'as' + i);
        b.style.setProperty('--pc', COLORS[i]);
        b.setAttribute('aria-pressed', String(state.as === i)); b.textContent = nameOf(i);
        b.addEventListener('click', function () { state.as = i; renderAsRow(); save(); status('Tasks you add from the library fill in ' + nameOf(i) + '’s time.'); });
        box.appendChild(b);
      });
    });
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

  // How the words are chosen (said on the page too): with two people, the bigger share under 60% is
  // "fairly close", 60% or more "leans one way", 90% or more "nearly all". With three or more, a share
  // of 1.5 times an even share or more "leans one way"; anything less is "fairly even".
  function hoursSentence() {
    var t = totals(state.jobs), s = sum(t);
    // a number that can't be counted (negative, not a number, more than a week) holds the read back,
    // so a typo never turns into "100% done by them"
    if (anyBad(state.jobs)) return 'One of the numbers above isn’t counted yet (it’s marked under its row). Fix it to see how the work is split. Nothing is guessed in the meantime.';
    if (s === 0) return anyExample() ? 'The grey numbers are only an example, so nothing is counted yet. Type your own hours to see how the work is split.' : 'Add some hours above to see how the work is split.';
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
    var t = totals(state.bills), s = sum(t);
    if (anyBad(state.bills)) return 'One of the amounts above isn’t counted yet (it’s marked under its row). Fix it to see the money side.';
    if (s === 0) return '';
    var fair = s / t.length;
    var parts = t.map(function (x, i) {
      var d = x - fair;
      var tail = Math.abs(d) < 0.005 ? 'right on an even share' : (d > 0 ? cash(d) + ' over an even share' : cash(-d) + ' under an even share');
      return nameOf(i) + ' paid ' + cash(x) + ' (' + tail + ')';
    });
    var settle = settleUp(t, fair);
    return 'Shared costs listed: ' + cash(s) + '. An even split would be ' + cash(fair) + ' each. ' + parts.join('; ') + '.' + (settle ? ' To settle up evenly: ' + settle : '') + ' Even isn’t always the fair answer (incomes and rooms differ), so treat this as a starting point, not a verdict.';
  }
  // Money with the dollar sign (the page has no currency setting).
  function cash(n) { return '$' + money(n); }
  function joinNames(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  // Who pays whom to reach an even split: those who paid under their share pay those who paid over,
  // largest first, in whole cents. Same even-split math as the sentence above.
  function settleUp(t, fair) {
    var owe = [], due = [];
    t.forEach(function (x, i) {
      var c = Math.round((x - fair) * 100);
      if (c < 0) owe.push({ i: i, c: -c }); else if (c > 0) due.push({ i: i, c: c });
    });
    if (!owe.length || !due.length) return '';
    owe.sort(function (a, b) { return b.c - a.c; }); due.sort(function (a, b) { return b.c - a.c; });
    var moves = [], o = 0, d = 0;
    while (o < owe.length && d < due.length) {
      var c = Math.min(owe[o].c, due[d].c);
      if (c > 0) moves.push({ from: owe[o].i, to: due[d].i, c: c });
      owe[o].c -= c; due[d].c -= c;
      if (owe[o].c <= 0) o++;
      if (due[d].c <= 0) d++;
    }
    // drop leftover rounding cents (one or two cents per person at most)
    moves = moves.filter(function (m) { return m.c > 2; });
    if (!moves.length) return '';
    // group "A, B and C each owe D $30" when the same amount goes to the same person
    var groups = [];
    moves.forEach(function (m) {
      var g = groups.filter(function (x) { return x.to === m.to && x.c === m.c; })[0];
      if (g) g.from.push(m.from); else groups.push({ to: m.to, c: m.c, from: [m.from] });
    });
    return groups.map(function (g) {
      var who = joinNames(g.from.map(function (i) { return nameOf(i); }));
      return who + (g.from.length > 1 ? ' each owe ' : ' owes ') + nameOf(g.to) + ' ' + cash(g.c / 100) + '.';
    }).join(' ');
  }

  /* ---------- Chapter II's balance score (same math as CALC-01) ---------- */
  // Balance = 1 − (share of hours that would have to move to match the target) ÷ (the most that could
  // ever have to move). An even split (or your agreed split) scores 1; one person doing it all scores 0.
  function balance() {
    var h = totals(state.jobs), n = h.length, total = sum(h), t, modeB = 'even';
    if (state.agreed.on) {
      var p = state.agreed.p.map(function (x) { var v = parseFloat(x); return isFinite(v) ? v : 0; });
      var ps = sum(p);
      if (p.some(function (x) { return x < 0; })) return { error: 'An agreed share can’t be negative.' };
      if (Math.abs(ps - 100) > 0.5) return { error: 'Your agreed shares add up to ' + r1(ps) + '%. Make them add up to 100% to compare.' };
      t = p.map(function (x) { return x / ps; }); modeB = 'agreed';
    } else t = h.map(function () { return 1 / n; });
    if (total <= 0 || anyBad(state.jobs)) return null;
    var s = h.map(function (x) { return x / total; });
    var gaps = s.map(function (x, i) { return x - t[i]; });
    var moved = sum(gaps.map(Math.abs)) / 2, most = 1 - Math.min.apply(null, t);
    return { value: most > 0 ? Math.max(0, Math.min(1, 1 - moved / most)) : 1, shares: s, target: t, gaps: gaps, mode: modeB, movedHours: moved * total };
  }
  function band(v) { return v >= 0.70 ? 'holding' : v >= 0.40 ? 'drifting' : 'worth a kind rethink'; }
  function balanceText(b) {
    if (!b) return '';
    if (b.error) return b.error;
    var against = b.mode === 'agreed' ? 'the split you agreed (' + b.target.map(function (x, i) { return nameOf(i) + ' ' + Math.round(x * 100) + '%'; }).join(', ') + ')' : 'an even share';
    var txt = 'Balance score: ' + b.value.toFixed(2) + ' against ' + against + '. On Chapter II’s scale the setup reads as ' + band(b.value) + ' (0.70 or more is holding, 0.40 up to 0.70 is drifting, under 0.40 asks for a kind rethink). It reads the setup, never a person.';
    if (b.value < 0.995 && b.movedHours >= 0.25) txt += ' About ' + hrs(b.movedHours) + ' a week would need to change hands to match.';
    return txt;
  }

  /* ---------- results ---------- */
  function catTotals() {
    return CATS.map(function (c) {
      var per = state.people.map(function (_, i) { return sum(state.jobs.filter(function (j) { return (CAT[j.cat] ? j.cat : 'other') === c.id; }).map(function (j) { return jobH(j, i); })); });
      return { c: c, per: per };
    });
  }
  function noticeCounts() {
    var c = { me: state.people.map(function () { return 0; }), other: 0, marked: 0, listed: 0 };
    state.jobs.forEach(function (j) {
      if (j.ex || kindOf(j) !== 'home') return;
      if (!j.name.trim() && !sum(j.v)) return;
      c.listed++;
      if (j.nf >= 0) { c.me[j.nf]++; c.marked++; } else if (j.nf === -2) { c.other++; c.marked++; }
    });
    return c;
  }
  function soloNums() {
    var home = peopleTotals('home', doH)[0], think = peopleTotals('home', thH)[0], inv = peopleTotals('home', invH)[0];
    var work = peopleTotals('work')[0], rest = peopleTotals('rest')[0];
    return { home: home + think, doing: home, think: think, inv: inv, work: work, rest: rest, load: home + think + work };
  }
  // A gentle read of time, not of how anyone feels: how much of a waking week is spoken for.
  function stretchRead(s) {
    if (s.load <= 0) return { k: '', t: 'Add a few jobs, your work hours and some rest to see how your week reads.' };
    var share = s.load / WAKING, pct = Math.round(share * 100);
    var restNote = s.rest <= 0 ? ' You haven’t logged any rest yet. If there is some, add it from “Rest & recharging”.' :
      s.rest < 3.5 ? ' Rest is thin on the list (' + hrs(s.rest) + ' a week), so it may be worth protecting a little more.' : '';
    if (share < 0.5) return { k: 'roomy', t: 'Looks sustainable: about ' + pct + '% of a waking week (' + hrs(s.load) + ' of about ' + WAKING + ' h) is spoken for, which leaves real room.' + restNote };
    if (share < 0.7) return { k: 'full', t: 'Full but workable: about ' + pct + '% of a waking week (' + hrs(s.load) + ' of about ' + WAKING + ' h) is spoken for.' + restNote };
    return { k: 'stretched', t: 'Stretched: about ' + pct + '% of a waking week (' + hrs(s.load) + ' of about ' + WAKING + ' h) is spoken for. That’s a lot to keep up week after week. Look below at what you could hand off, drop, simplify or schedule.' + (s.rest < 3.5 ? ' Rest is thin on the list, too.' : '') };
  }
  function bar(parts, label) {
    var tot = sum(parts.map(function (p) { return p.v; }));
    if (tot <= 0) return '';
    return '<div class="ls-bar" aria-hidden="true">' + parts.map(function (p) {
      return p.v > 0 ? '<span class="ls-seg' + (p.cls ? ' ' + p.cls : '') + '" style="width:' + (p.v / tot * 100).toFixed(2) + '%;--pc:' + p.c + '"></span>' : '';
    }).join('') + '</div>' + (label ? '<span class="sr-only">' + esc(label) + '</span>' : '');
  }
  function fillBar(v, max, c, cls) {
    return '<div class="ls-bar ls-bar-one" aria-hidden="true"><span class="ls-seg' + (cls ? ' ' + cls : '') + '" style="width:' + (max > 0 ? Math.max(1, v / max * 100) : 0).toFixed(2) + '%;--pc:' + c + '"></span></div>';
  }
  function renderCats() {
    var box = $(solo() ? 'r-cats-solo' : 'r-cats'); if (!box) return;
    var vp = visiblePeople(), ct = catTotals().map(function (x) { return { c: x.c, per: x.per, tot: sum(vp.map(function (i) { return x.per[i]; })) }; }).filter(function (x) { return x.tot > 0; });
    if (!ct.length) { box.innerHTML = '<p class="ls-panel-note">Your areas show up here once you add some time.</p>'; return; }
    var max = Math.max.apply(null, ct.map(function (x) { return x.tot; }));
    box.innerHTML = '<ul class="ls-cat-list">' + ct.map(function (x) {
      var whoLine = vp.length > 1 ? vp.map(function (i) { return nameOf(i) + ' ' + hrs(x.per[i]); }).join(' · ') : '';
      var tag = x.c.inv ? ' <small>(invisible)</small>' : '';
      if (vp.length > 1 && x.c.k !== 'home') tag = x.c.k === 'work' ? ' <small>(not in the split)</small>' : ' <small>(rest, not in the split)</small>';
      var b = vp.length > 1 ? bar(vp.map(function (i) { return { v: x.per[i], c: COLORS[i] }; })) : fillBar(x.tot, max, x.c.k === 'rest' ? '#BFE3CF' : x.c.k === 'work' ? '#B9D3F0' : '#F8DC6E', x.c.inv ? 'is-inv' : '');
      return '<li><div class="ls-cat-top"><span>' + esc(x.c.n) + tag + '</span><span class="ls-num">' + hrs(x.tot) + '</span></div>' + b + (whoLine ? '<p class="ls-mini">' + esc(whoLine) + '</p>' : '') + '</li>';
    }).join('') + '</ul>';
  }
  function groupResults() {
    var b = balance();
    $('r-balance').textContent = balanceText(b);
    var vis = $('r-vis');
    var home = totals(state.jobs), inv = peopleTotals('home', invH), allInv = sum(inv);
    if (sum(home) <= 0) vis.innerHTML = '<p class="ls-panel-note">Once there are hours, you’ll see the work you can see and the work you can’t, side by side.</p>';
    else {
      vis.innerHTML = '<ul class="ls-cat-list">' + state.people.map(function (_, i) {
        var seen = home[i] - inv[i];
        return '<li><div class="ls-cat-top"><span>' + esc(nameOf(i)) + '</span><span class="ls-num">' + hrs(home[i]) + '</span></div>' +
          bar([{ v: seen, c: COLORS[i] }, { v: inv[i], c: COLORS[i], cls: 'is-inv' }]) +
          '<p class="ls-mini">' + hrs(seen) + ' of work you can see · ' + hrs(inv[i]) + ' thinking and emotional work' + (allInv > 0 ? ' (' + Math.round(inv[i] / allInv * 100) + '% of all of it)' : '') + '</p></li>';
      }).join('') + '</ul>' + (allInv > 0 ? '' : '<p class="ls-mini">No thinking or emotional work counted yet. Open “More” on a job, or add from “Planning & remembering” and “Emotional work”.</p>');
    }
    var nc = noticeCounts(), nb = $('r-notice');
    if (!nc.marked) nb.textContent = 'Who notices first? Mark it under “More” on a job. Unowned work falls to whoever notices first, every time.';
    else {
      var top = 0; nc.me.forEach(function (x, i) { if (x > nc.me[top]) top = i; });
      nb.textContent = 'Who notices first, on the ' + nc.marked + ' job' + (nc.marked === 1 ? '' : 's') + ' you marked: ' + state.people.map(function (_, i) { return nameOf(i) + ' ' + nc.me[i]; }).join(', ') + '.' +
        (nc.me[top] / nc.marked >= 0.6 && nc.marked >= 3 ? ' Most of the noticing sits with ' + who(top) + '. Those jobs are good ones to give a single owner, the noticing included (WP-03).' : '');
    }
    var work = peopleTotals('work'), rest = peopleTotals('rest'), ctx = [];
    if (sum(work) > 0) ctx.push('Paid work and school, kept out of the split: ' + state.people.map(function (_, i) { return nameOf(i) + ' ' + hrs(work[i]); }).join(', ') + '. If these differ a lot, a split you agree on may be fairer than an even one, as Chapter II says.');
    if (sum(rest) > 0) ctx.push('Rest and recharging logged: ' + state.people.map(function (_, i) { return nameOf(i) + ' ' + hrs(rest[i]); }).join(', ') + '.');
    $('r-context').textContent = ctx.join(' ');
    $('r-context').hidden = !ctx.length;
  }
  function soloResults() {
    var s = soloNums();
    $('r-tiles').innerHTML = [
      ['Home & life jobs', s.doing, 'the doing part'], ['The thinking part', s.think, 'noticing, planning, remembering'],
      ['Work & school', s.work, 'paid work, commute, classes'], ['Rest & recharging', s.rest, 'time that refills you']
    ].map(function (t) { return '<div class="ls-tile"><span class="ls-tile-n">' + hrs(t[1]) + '</span><span class="ls-tile-l">' + t[0] + '</span><span class="ls-tile-d">' + t[2] + '</span></div>'; }).join('');
    var rd = stretchRead(s);
    var rb = $('r-read'); rb.textContent = rd.t; rb.setAttribute('data-k', rd.k);
    // the invisible part, made visible
    var ib = $('r-inv');
    if (s.inv <= 0) ib.innerHTML = '<p class="ls-mini">No invisible work counted yet. Open “More” on a job, or add tasks from “Planning & remembering” and “Emotional work”. It’s often the part nobody sees, you included.</p>';
    else {
      var items = state.jobs.filter(function (j) { return kindOf(j) === 'home' && invH(j, 0) > 0; }).sort(function (a, b) { return invH(b, 0) - invH(a, 0); }).slice(0, 5);
      ib.innerHTML = '<p>About <strong>' + hrs(s.inv) + '</strong> of your week is work nobody sees: noticing, planning, remembering and keeping the peace. That’s ' + Math.round(s.inv / (s.home || 1) * 100) + '% of your home and life jobs.</p>' +
        '<ul class="ls-mini-list">' + items.map(function (j) { return '<li>' + esc(j.name.trim() || 'A job with no name yet') + ': ' + hrs(invH(j, 0)) + ' a week</li>'; }).join('') + '</ul>';
    }
    var nc = noticeCounts(), nb = $('r-notice-solo');
    nb.textContent = nc.marked ? 'You’re the one who notices first on ' + nc.me[0] + ' of the ' + nc.marked + ' job' + (nc.marked === 1 ? '' : 's') + ' you marked.' + (nc.me[0] / nc.marked >= 0.6 && nc.marked >= 3 ? ' Noticing is work too. When you hand a job off, hand off the noticing with it.' : '')
      : 'Who notices first? Mark it under “More” on a job, to see how much of the noticing is yours.';
    renderPlan();
  }
  function planned(act) { return state.jobs.filter(function (j) { return j.plan === act && !j.ex; }); }
  function renderPlan() {
    var box = $('r-plan'); if (!box) return;
    var list = state.jobs.filter(function (j) { return !j.ex && kindOf(j) === 'home' && jobH(j, 0) > 0; }).sort(function (a, b) { return jobH(b, 0) - jobH(a, 0); }).slice(0, 10);
    keepFocus(box, function () {
      if (!list.length) { box.innerHTML = '<p class="ls-panel-note">Your biggest jobs show up here, so you can choose what to keep, hand off, drop, simplify or schedule.</p>'; return; }
      box.innerHTML = '<ol class="ls-plan-list">' + list.map(function (j) {
        var idx = state.jobs.indexOf(j), c = CAT[j.cat] || CAT.other;
        return '<li><div class="ls-cat-top"><span class="ls-plan-n">' + esc(j.name.trim() || 'A job with no name yet') + '</span><span class="ls-num">' + hrs(jobH(j, 0)) + ' a week</span></div>' +
          (c.tip ? '<p class="ls-mini">Idea: ' + esc(c.tip) + '</p>' : '') +
          '<div class="ls-pick" role="group" aria-label="What to do with ' + esc(j.name.trim() || 'this job') + '">' +
          PLAN.map(function (p) { return '<button type="button" class="ls-chip" data-plan="' + p[0] + '" data-j="' + idx + '" data-fk="pl' + idx + p[0] + '" aria-pressed="' + (j.plan === p[0]) + '">' + p[1] + '</button>'; }).join('') +
          '</div></li>';
      }).join('') + '</ol>';
    });
    var off = sum(planned('handoff').concat(planned('drop')).map(function (j) { return jobH(j, 0); }));
    var light = sum(planned('simplify').concat(planned('schedule')).map(function (j) { return jobH(j, 0); }));
    var line = [];
    if (off > 0) line.push('Handing off and dropping what you marked would free up about ' + hrs(off) + ' a week.');
    if (light > 0) line.push('Simplifying and scheduling makes another ' + hrs(light) + ' a week lighter or calmer.');
    $('r-plan-sum').textContent = line.join(' ');
  }

  /* ---------- weeks, kept as you go ---------- */
  function snapshot() {
    var home = totals(state.jobs), b = balance();
    return {
      d: new Date().toISOString().slice(0, 10), m: mode || 'group', n: state.people.map(function (_, i) { return nameOf(i); }),
      h: home.map(r1), k: peopleTotals('home', invH).map(r1), w: peopleTotals('work').map(r1), r: peopleTotals('rest').map(r1),
      b: b && b.value != null ? Math.round(b.value * 100) / 100 : null
    };
  }
  function dayLabel(d) {
    var p = (d || '').split('-'); if (p.length !== 3) return d || '';
    var dt = new Date(+p[0], +p[1] - 1, +p[2]);
    return 'Week of ' + dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function weekLoad(w) { return (w.h[0] || 0) + (w.w[0] || 0); }
  function renderTrend() {
    var box = $('r-trend'); if (!box) return;
    var weeks = state.weeks || [], cur = snapshot(), isSolo = solo();
    var any = sum(cur.h) + sum(cur.w) + sum(cur.r) > 0;
    keepFocus(box, function () {
      if (!weeks.length) {
        box.innerHTML = '<p class="ls-panel-note">Save this week when it’s done. Next week, change what was different and save again, and you’ll see how things move over time. Your list stays, so it only takes a minute.</p>';
        return;
      }
      var rows = weeks.map(function (w, wi) { return { w: w, wi: wi }; }).slice(-8);
      if (any) rows.push({ w: cur, wi: -1 });
      var max = Math.max.apply(null, rows.map(function (r) { return Math.max(weekLoad(r.w), r.w.r[0] || 0); }).concat([1]));
      box.innerHTML = '<ul class="ls-weeks">' + rows.map(function (r) {
        var w = r.w, lab = r.wi < 0 ? 'This week (not saved yet)' : dayLabel(w.d);
        var body;
        if (isSolo) {
          body = '<div class="ls-wk-bars">' + fillBar(weekLoad(w), max, '#F8DC6E') + fillBar(w.r[0] || 0, max, '#BFE3CF') + '</div>' +
            '<p class="ls-mini">Load ' + hrs(weekLoad(w)) + ' (invisible ' + hrs(w.k[0] || 0) + ') · rest ' + hrs(w.r[0] || 0) + '</p>';
        } else {
          var tot = sum(w.h);
          body = bar(w.h.map(function (x, i) { return { v: x, c: COLORS[i % COLORS.length] }; })) +
            '<p class="ls-mini">' + (tot > 0 ? w.h.map(function (x, i) { return esc(w.n[i] || ('Person ' + (i + 1))) + ' ' + Math.round(x / tot * 100) + '%'; }).join(' · ') : 'No hours') + (w.b != null ? ' · balance ' + w.b.toFixed(2) : '') + '</p>';
        }
        return '<li><div class="ls-cat-top"><span>' + esc(lab) + '</span>' + (r.wi >= 0 ? '<button type="button" class="remove ls-wk-rm" data-wk="' + r.wi + '" data-fk="wk' + r.wi + '" aria-label="Remove ' + esc(dayLabel(w.d)) + '">&times;</button>' : '') + '</div>' + body + '</li>';
      }).join('') + '</ul><p class="ls-trend-line">' + esc(trendSentence()) + '</p>';
    });
  }
  function trendSentence() {
    var weeks = state.weeks || []; if (!weeks.length) return '';
    var last = weeks[weeks.length - 1], cur = snapshot(), since = 'Since your last saved week (' + dayLabel(last.d).replace('Week of ', '') + '), ';
    if (solo()) {
      if (weekLoad(cur) + cur.r[0] <= 0) return '';
      var dl = weekLoad(cur) - weekLoad(last), dr = (cur.r[0] || 0) - (last.r[0] || 0);
      return since + 'your load is ' + (Math.abs(dl) < 0.5 ? 'about the same' : (dl > 0 ? 'up ' : 'down ') + hrs(Math.abs(dl))) + ', and rest is ' + (Math.abs(dr) < 0.5 ? 'about the same' : (dr > 0 ? 'up ' : 'down ') + hrs(Math.abs(dr))) + '.';
    }
    if (cur.b == null || last.b == null) return '';
    var d = cur.b - last.b;
    return since + 'the balance score went from ' + last.b.toFixed(2) + ' to ' + cur.b.toFixed(2) + (Math.abs(d) < 0.03 ? ', about the same.' : d > 0 ? ', closer to your target.' : ', further from your target.') + ' A single week can be odd, so look at the run of weeks.';
  }
  function saveWeek() {
    var s = snapshot();
    if (sum(s.h) + sum(s.w) + sum(s.r) <= 0) { status('Add some time first, then save the week.'); return; }
    state.weeks = (state.weeks || []).filter(function (w) { return w.d !== s.d; });
    state.weeks.push(s);
    state.weeks = state.weeks.slice(-MAX_WEEKS);
    save(); renderTrend();
    status('Saved this week. Your list stays, so next week you only change what was different.' + (keep ? '' : ' Tick “Keep this on my device” to keep your weeks after you close this tab.'));
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
    // per-category hours beside each group heading
    var vp = visiblePeople();
    rowsEl.querySelectorAll('.ls-group-h [data-cat]').forEach(function (sp) {
      var c = sp.getAttribute('data-cat');
      var h = sum(state.jobs.filter(function (j) { return (CAT[j.cat] ? j.cat : 'other') === c; }).map(function (j) { return sum(vp.map(function (i) { return jobH(j, i); })); }));
      sp.textContent = h > 0 ? '· ' + hrs(h) + ' a week' : '';
    });
    rowsEl.querySelectorAll('.row').forEach(function (r) { if (r._refresh) r._refresh(); });
    renderCats();
    if (solo()) soloResults(); else groupResults();
    renderTrend();
    var ex = $('explain-text'); if (ex) ex.textContent = solo() ? resultText() : '';
    save();
  }

  /* ---------- chores with one owner each (no week of logging needed) ---------- */
  function ownersList() { state.owners = (state.owners || []).slice(0, MAX_OWN); return state.owners; }
  function renderPicks() {
    var box = $('own-pick'); if (!box) return;
    var picked = ownersList().map(function (o) { return o.name.trim().toLowerCase(); });
    var names = [];
    state.jobs.forEach(function (jb) { if (kindOf(jb) !== 'home') return; var nm = jb.name.trim(); if (nm && names.map(function (x) { return x.toLowerCase(); }).indexOf(nm.toLowerCase()) < 0) names.push(nm); });
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

  /* ---------- agreed split (group) ---------- */
  function renderAgreed() {
    var box = $('agreed-pcts'); if (!box) return;
    $('agreed-on').checked = !!state.agreed.on;
    box.hidden = !state.agreed.on;
    keepFocus(box, function () {
      box.innerHTML = '';
      state.people.forEach(function (_, i) {
        var l = document.createElement('label'); l.style.setProperty('--pc', COLORS[i]);
        var s = document.createElement('span'); s.textContent = nameOf(i) + ', agreed %';
        var inp = document.createElement('input'); inp.type = 'number'; inp.min = '0'; inp.max = '100'; inp.step = '1'; inp.inputMode = 'decimal'; inp.setAttribute('data-fk', 'ag' + i);
        inp.value = state.agreed.p[i];
        inp.addEventListener('input', function () { state.agreed.p[i] = inp.value; recalc(); });
        l.appendChild(s); l.appendChild(inp); box.appendChild(l);
      });
    });
  }

  function renderAll() {
    normalize();
    renderPeople(); renderAsRow(); renderRows(); renderGlasses(); renderLibTasks(); renderAgreed();
    $('example-note').hidden = !anyExample();
    renderOwners();
    recalc();
  }

  /* ---------- result text ---------- */
  function topCats(n) {
    var vp = visiblePeople();
    return catTotals().map(function (x) { return { c: x.c, h: sum(vp.map(function (i) { return x.per[i]; })) }; })
      .filter(function (x) { return x.h > 0 && x.c.k === 'home'; }).sort(function (a, b) { return b.h - a.h; }).slice(0, n);
  }
  function listNames(arr) { var n = arr.map(function (j) { return j.name.trim(); }).filter(Boolean); return n.length <= 1 ? n.join('') : n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1]; }
  function soloText() {
    var s = soloNums(), lines = ['My week, as I logged it (rough numbers, not a contest):'];
    lines.push('- Home and life jobs: ' + hrs(s.doing));
    lines.push('- The thinking part (noticing, planning, remembering): ' + hrs(s.think));
    if (s.work > 0) lines.push('- Work and school: ' + hrs(s.work));
    lines.push('- Rest and recharging: ' + hrs(s.rest));
    lines.push('', stretchRead(s).t);
    var tc = topCats(5);
    if (tc.length) { lines.push('', 'Where my time and attention go:'); tc.forEach(function (x) { lines.push('- ' + x.c.n + ': ' + hrs(x.h) + ' a week'); }); }
    if (s.inv > 0) lines.push('', 'About ' + hrs(s.inv) + ' a week of it is work nobody sees: noticing, planning, remembering and keeping the peace.');
    var nc = noticeCounts();
    if (nc.marked) lines.push('I’m the one who notices first on ' + nc.me[0] + ' of the ' + nc.marked + ' job' + (nc.marked === 1 ? '' : 's') + ' I marked.');
    var ho = planned('handoff'), dr = planned('drop'), si = planned('simplify'), sc = planned('schedule');
    if (ho.length || dr.length || si.length || sc.length) {
      lines.push('', 'What would help:');
      if (ho.length) lines.push('- Could someone take over ' + listNames(ho) + '? The whole job, the remembering included.');
      if (dr.length) lines.push('- I’m going to stop doing ' + listNames(dr) + '.');
      if (si.length) lines.push('- I’m going to make ' + listNames(si) + ' simpler.');
      if (sc.length) lines.push('- I’m putting ' + listNames(sc) + ' on a set time each week.');
    }
    lines.push('', 'Made with the Lemonade Stand at Spread Love & Acceptance.');
    return lines.join('\n');
  }
  function resultText() {
    if (solo()) return soloText();
    var t = totals(state.jobs), p = pcts(t), s = sum(t);
    var lines = ['Our lemonade stand this week (hours, not a verdict):'];
    state.people.forEach(function (x, i) { lines.push('- ' + nameOf(i) + ': ' + r1(t[i]) + 'h (' + (s ? Math.round(p[i]) : 0) + '%)'); });
    var jobs = state.jobs.filter(function (j) { return j.name.trim() && kindOf(j) === 'home'; });
    if (jobs.length) {
      lines.push('', 'Jobs (hours a week, thinking part included):');
      jobs.forEach(function (j) {
        lines.push('- ' + j.name.trim() + ': ' + state.people.map(function (x, i) { return nameOf(i) + ' ' + r1(jobH(j, i)) + 'h'; }).join(', '));
      });
    }
    lines.push('', hoursSentence());
    var bt = balanceText(balance()); if (bt) lines.push('', bt);
    var tc = topCats(6);
    if (tc.length) { lines.push('', 'By area:'); catTotals().forEach(function (x) { var h = sum(x.per); if (h > 0 && x.c.k === 'home') lines.push('- ' + x.c.n + ': ' + state.people.map(function (_, i) { return nameOf(i) + ' ' + hrs(x.per[i]); }).join(', ')); }); }
    var inv = peopleTotals('home', invH);
    if (sum(inv) > 0) lines.push('', 'Thinking and emotional work (the invisible part): ' + state.people.map(function (_, i) { return nameOf(i) + ' ' + hrs(inv[i]); }).join(', ') + '.');
    var nc = noticeCounts();
    if (nc.marked) lines.push('Who notices first: ' + state.people.map(function (_, i) { return nameOf(i) + ' ' + nc.me[i]; }).join(', ') + ' (of ' + nc.marked + ' jobs marked).');
    var ctx = $('r-context') && !$('r-context').hidden ? $('r-context').textContent : '';
    if (ctx) lines.push('', ctx);
    var ms = moneySentence();
    if (ms) lines.push('', ms);
    lines.push('', 'Made with the Lemonade Stand at Spread Love & Acceptance.');
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
  // a clean printed summary, built from the same words as the copied text
  function printSummary() {
    var box = $('ls-print'); if (!box) return;
    var lines = resultText().split('\n'), html = '<h1>' + (solo() ? 'My week at the Lemonade Stand' : 'Our week at the Lemonade Stand') + '</h1><p class="ls-print-date">' + esc(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })) + '</p>', inList = false;
    lines.forEach(function (l) {
      if (/^- /.test(l)) { if (!inList) { html += '<ul>'; inList = true; } html += '<li>' + esc(l.slice(2)) + '</li>'; return; }
      if (inList) { html += '</ul>'; inList = false; }
      if (!l.trim()) return;
      html += /:$/.test(l) ? '<h2>' + esc(l.replace(/:$/, '')) + '</h2>' : '<p>' + esc(l) + '</p>';
    });
    if (inList) html += '</ul>';
    box.innerHTML = html;
    document.body.classList.add('print-summary');
    var done = function () { document.body.classList.remove('print-summary'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
    setTimeout(done, 1500);
  }

  /* ---------- who is this for ---------- */
  var tabs = [$('tab-hours'), $('tab-money')], panels = [$('panel-hours'), $('panel-money')];
  function showTab(i) { tabs.forEach(function (t, j) { t.setAttribute('aria-selected', String(i === j)); panels[j].hidden = i !== j; }); panels[i].querySelectorAll('textarea').forEach(autoGrow); }
  function setMode(m, announce) {
    mode = m; state.mode = m;
    document.body.setAttribute('data-ls-mode', m);
    $('ls-body').hidden = false;
    document.querySelectorAll('.mode-card').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === m)); });
    if (m === 'solo') showTab(0);
    $('copy-result').textContent = m === 'solo' ? 'Copy my summary' : 'Copy the result';
    renderAll();
    if (announce) $('mode-msg').textContent = m === 'solo' ? 'Set up for just you. Your own week, with no comparison. Your entries are all still here.' : 'Set up for you and the people you share a home with. Each person fills in only their own side.';
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
  normalize();
  $('keep-device').checked = keep;
  // the remembered choice, or the stand's own; a stand from before this choice existed was for a group
  mode = loadMode() || (state.mode === 'solo' || state.mode === 'group' ? state.mode : null) || ((saved || (draft && !draft.example)) ? 'group' : null);
  if (mode) setMode(mode, false); else renderAll();

  // After Back or Forward, the browser may put old values back into the boxes. Always redraw the
  // boxes from the stand itself, so what you see and the totals always match.
  window.addEventListener('pageshow', function () { $('keep-device').checked = keep; renderAll(); });

  document.querySelectorAll('.mode-card').forEach(function (b) {
    b.addEventListener('click', function () { var m = b.getAttribute('data-mode'); saveMode(m); setMode(m, true); });
  });

  $('clear-draft').addEventListener('click', function () {
    var b = $('clear-draft');
    if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Tap again to clear'; clearTimeout(b.t); b.t = setTimeout(function () { delete b.dataset.armed; b.textContent = 'Clear'; }, 4000); return; }
    delete b.dataset.armed; b.textContent = 'Clear';
    try { sessionStorage.removeItem(DRAFT); } catch (e) {}
    if (keep) erase();
    state = clone(EXAMPLE); state.example = true; state.owners = []; state.mode = mode;
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
    var cat = CAT[libCat] && CAT[libCat].k === 'home' ? libCat : 'other';
    state.jobs.push({ name: '', v: state.people.map(function () { return 0; }), t: state.people.map(function () { return 0; }), cat: cat, freq: 'week', unit: 'm', nf: -1, open: true });
    renderRows(); recalc();
    var r = rowFor(state.jobs[state.jobs.length - 1]); var t = r && r.querySelector('textarea'); if (t) t.focus();
    status('Added a blank job under ' + CAT[cat].n + '. Type its name, then the time. You can change its kind.');
  });
  $('add-bill').addEventListener('click', function () {
    state.bills.push({ name: '', v: state.people.map(function () { return 0; }) });
    renderRows(); recalc();
    var t = moneyEl.querySelectorAll('textarea'); if (t.length) t[t.length - 1].focus();
  });
  $('start-blank').addEventListener('click', function () {
    state = { people: state.people.slice(), jobs: [], bills: [], example: false, owners: [], weeks: state.weeks, agreed: state.agreed, as: state.as, mode: mode };
    renderAll();
    status('Blank stand ready. Add jobs from the library, or your own.');
  });

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { showTab(i); });
    tab.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var o = tabs[1 - i]; o.click(); o.focus(); }
    });
  });

  $('agreed-on').addEventListener('change', function (e) {
    state.agreed.on = e.target.checked;
    if (state.agreed.on && state.agreed.p.every(function (x) { return x === '' || x == null; })) {
      var n = state.people.length, ev = Math.floor(100 / n);
      state.agreed.p = state.people.map(function (_, i) { return String(i === 0 ? 100 - ev * (n - 1) : ev); });
    }
    renderAgreed(); recalc();
  });
  $('r-plan').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-plan]'); if (!b) return;
    var j = state.jobs[+b.getAttribute('data-j')]; if (!j) return;
    var p = b.getAttribute('data-plan');
    j.plan = j.plan === p ? undefined : p;
    recalc();
  });
  $('r-trend').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-wk]'); if (!b) return;
    var i = +b.getAttribute('data-wk'), w = state.weeks[i];
    state.weeks.splice(i, 1); save(); renderTrend();
    status('Removed ' + dayLabel(w && w.d) + '.');
    var nb = $('save-week'); if (nb) nb.focus();
  });
  $('save-week').addEventListener('click', saveWeek);
  $('print-result').addEventListener('click', printSummary);
  $('copy-explain').addEventListener('click', function () {
    copyText(resultText()).then(function (ok) { status(ok ? 'Copied. Paste it into a message, or read it out when you talk.' : 'Couldn’t copy here. Try selecting the text by hand.'); });
  });

  $('copy-result').addEventListener('click', function () {
    copyText(resultText()).then(function (ok) { status(ok ? (solo() ? 'Copied. Paste it wherever you like.' : 'Copied. Paste it into your group chat.') : 'Couldn’t copy here. Try selecting the text by hand.'); });
  });
  $('share-result').addEventListener('click', function () {
    var text = resultText();
    if (window.TOLShare) {   // the site's own share: the device's share menu, or a small sheet with Copy, Text and Email
      window.TOLShare.share({ title: 'Our lemonade stand', text: text, url: false, result: true }).then(function (r) {
        if (r && r.method === 'native') status('Shared.');
      });
    } else if (navigator.share) {
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

  /* ---------- the household, typed once for the other tools (assets/js/household.js) ---------- */
  var HH = window.TOLHousehold, hhHost = null, hhOffer = null, hhNo = false;
  function hhNamesEmpty() { return state.people.every(function (p) { return !String(p || '').trim() || HH.isPlaceholder(p); }); }
  // The names, and the home jobs with their owner when the fridge list gives one (never the hours)
  function hhCollect() {
    var jobs = [], seen = {};
    function add(name, owner) {
      name = String(name || '').trim(); var k = name.toLowerCase();
      if (!name || seen[k]) return;
      seen[k] = jobs.length;
      var j = { name: name }; if (owner) j.owner = owner;
      jobs.push(j);
    }
    ownersList().forEach(function (o) { add(o.name, o.who >= 0 && o.who < state.people.length ? nameOf(o.who) : ''); });
    state.jobs.forEach(function (j) { if (!j.ex && kindOf(j) === 'home') add(j.name); });
    return { people: state.people.slice(), jobs: jobs };
  }
  function hhUse() {
    var h = HH.get(); if (!h) return '';
    var names = 0, jobs = 0, n;
    h.people.forEach(function (nm) {
      if (state.people.some(function (p) { return String(p || '').trim().toLowerCase() === nm.toLowerCase(); })) return;
      var slot = -1;
      state.people.forEach(function (p, i) { if (slot < 0 && (!String(p || '').trim() || HH.isPlaceholder(p))) slot = i; });
      if (slot >= 0) state.people[slot] = nm;
      else if (state.people.length < MAX) state.people.push(nm);
      else return;
      names++;
    });
    normalize();
    n = state.people.length;
    if (h.jobs.length) {
      // like the task library: the grey example makes way for real jobs
      state.jobs = state.jobs.filter(function (j) { return !j.ex; });
      state.bills = state.bills.filter(function (b) { return !b.ex; });
      h.jobs.forEach(function (hj) {
        if (state.jobs.some(function (j) { return j.name.trim().toLowerCase() === hj.name.toLowerCase(); })) return;
        var m = libMatch(hj.name), zero = function () { var a = []; for (var i = 0; i < n; i++) a.push(0); return a; };
        state.jobs.push({ name: hj.name, v: zero(), t: zero(), cat: guessCat(hj.name), freq: m ? m.t[2] : 'week', unit: m && m.t[3] ? m.t[3] : 'm', nf: -1 });
        jobs++;
      });
      // the fridge list, when it is empty: jobs that already have an owner in the household
      if (!ownersList().length) {
        h.jobs.filter(function (hj) { return hj.owner; }).slice(0, MAX_OWN).forEach(function (hj) {
          var who = -1;
          state.people.forEach(function (p, i) { if (String(p || '').trim().toLowerCase() === hj.owner.toLowerCase()) who = i; });
          state.owners.push({ name: hj.name, who: who });
        });
      }
    }
    state.example = false;
    renderAll();
    return HH.addedLine(names, jobs);
  }
  // A stand with no names yet offers the household kept from another tool (only in "Me and others")
  function hhRefresh() {
    if (!HH || !hhHost) return;
    var h = HH.get(), want = !hhNo && !!h && h.people.length > 0 && hhNamesEmpty();
    if (want && !hhOffer) {
      hhOffer = HH.offer({ names: h.people, jobs: h.jobs.map(function (j) { return j.name; }), onUse: hhUse, onNo: function () { hhNo = true; }, focus: function () { return peopleEl.querySelector('input'); } });
      hhHost.appendChild(hhOffer);
    } else if (!want && hhOffer && !hhOffer.querySelector('.tol-hh-offer').hidden) {
      hhOffer.remove(); hhOffer = null;
    }
  }
  if (HH) {
    var peopleBox = peopleEl.parentNode;
    hhHost = document.createElement('div');
    peopleBox.insertBefore(hhHost, peopleBox.firstChild);
    hhWrite = HH.writer('lemonade', hhCollect);
    var hhKeep = HH.remember({ tool: 'lemonade', write: hhWrite });
    peopleBox.appendChild(hhKeep);
    hhRefresh();
    hhWrite.baseline();
    HH.onChange(function () { hhKeep.sync(); });
  }

  window.TOLLemonade = { recalc: recalc, state: function () { return state; }, mode: function () { return mode; }, setMode: setMode, resultText: resultText, fridgeText: fridgeText, hoursSentence: hoursSentence, balance: balance, saveWeek: saveWeek, library: LIB, categories: CATS };
})();
