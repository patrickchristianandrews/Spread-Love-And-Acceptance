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
  Money tab (optional, group only): one line per cost, what each person paid, in the currency picked
  ($, £, € or another symbol). Each cost is shared (split evenly, by half shares, or by the split you
  agreed), one person's own (left out of the settle-up), an agreed amount like family support (listed,
  not split), a savings goal (kept, never owed), or money coming in (optional: shows what's left). The
  summary leads with each person's total, then the settle-up.

  Two phones: "Send my side to my partner" makes a link (the main way), or a code ("LEMON1:" and a base64 JSON) or a .json
  file with the names, jobs, times and bills (never the example). "Add my partner's side" reads one back
  and merges it: people are matched by name, new jobs and bills are added, blanks are filled in, and
  where both phones have different numbers for the same job, the person chooses: keep mine, use theirs,
  or keep both. Nothing is uploaded; people pass the code between them themselves. "Share it as a link"
  sends one line and …/lemonade-stand.html#side=… (the side, deflated, after the "#", which never reaches a
  server); opening it goes straight to the preview and clears the "#" part. A "my" in a line's name from the
  other phone becomes that person's name ("Call my mum" → "Call Amara’s mum").

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
  var KEY = 'tol-lemonade-stand-v2', DRAFT = 'tol-lemonade-draft', NAMES = 'tol-lemonade-names', MODE_KEY = 'tol-lemonade-mode', MAX_OWN = 5, MAX_WEEKS = 26;
  var COLORS = ['#BFE3CF', '#F8DC6E', '#F2B8C6', '#B9D3F0', '#D9C4F0', '#F6C99B', '#C8E6A0', '#A8DDE0'];
  var WAKING = 112; // about 16 waking hours a day, 7 days

  /* ---------- how often, and categories ---------- */
  // 'wkd' (weekdays, 5 days) came later: a stand or code without it reads exactly as before
  var FREQ = { day: 7, wkd: 5, few: 3, two: 2, week: 1, eow: 0.5, month: 12 / 52 };
  var FREQ_ORDER = ['day', 'wkd', 'few', 'two', 'week', 'eow', 'month'];
  var FREQ_LABEL = { day: 'Each day', wkd: 'Weekdays (5 days)', few: '3 times a week', two: 'Twice a week', week: 'Each week', eow: 'Every other weekend', month: 'Each month' };
  var FREQ_SHORT = { day: 'a day', wkd: 'each weekday', few: '3× a week', two: '2× a week', week: 'a week', eow: 'every other weekend', month: 'a month' };
  // k: 'home' jobs are counted in the split; 'work' and 'rest' are shown beside it, never in it.
  // inv: the whole job is invisible work (thinking or emotional), not just its thinking part.
  var CATS = [
    { id: 'home', n: 'Home & cleaning', k: 'home', act: 'simplify', tip: 'Lower the bar a notch, or split it by room.' },
    { id: 'food', n: 'Food & meals', k: 'home', act: 'simplify', tip: 'Repeat a few easy meals, or cook once for two nights.' },
    { id: 'laundry', n: 'Laundry', k: 'home', act: 'handoff', tip: 'Older kids and adults can each own their own laundry.' },
    { id: 'kids', n: 'Kids & caring', k: 'home', act: 'handoff', tip: 'Trade whole routines, like bedtime on set nights.' },
    { id: 'baby', n: 'New baby', k: 'home', act: 'handoff', tip: 'Take whole nights or whole feeds in turns, so each of you gets a stretch of real sleep.' },
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
  // Daytime care on your own while the other parent is at work: home work, counted in the split and in
  // "Home + paid work", the same way paid work is counted for the one at work
  var SOLO_CARE = 'Looking after the baby on my own (while the other is at work)';
  function isSoloCare(j) { return !j.ex && low(j.name) === low(SOLO_CARE); }
  // The task library: [name, typical amount, how often, unit ('m' minutes, default, or 'h' hours)]
  var LIB = {
    home: [['Dishes & kitchen reset', 20, 'day'], ['Tidying up', 15, 'day'], ['Vacuuming & floors', 45, 'week'], ['Cleaning the bathroom', 40, 'week'], ['Trash & recycling', 10, 'few'], ['Changing the sheets', 20, 'week'], ['Restocking soap, paper & supplies', 15, 'week'], ['Deep clean (fridge, oven, windows)', 60, 'month']],
    food: [['Meal planning & the grocery list', 30, 'week'], ['Grocery shopping', 60, 'week'], ['Putting groceries away', 15, 'week'], ['Cooking dinner', 45, 'day'], ['Breakfasts', 15, 'day'], ['Packing lunches', 15, 'wkd'], ['Clearing out the fridge', 20, 'week']],
    laundry: [['Washing & drying', 20, 'few'], ['Folding & putting away', 25, 'few'], ['Towels & bedding', 20, 'week'], ['Ironing & mending', 30, 'week']],
    kids: [['Getting kids up & ready', 30, 'day'], ['Daycare or nursery drop-off & pickup', 40, 'wkd'], ['School drop-off & pickup', 40, 'wkd'], ['Toddler meals, snacks & mess', 30, 'day'], ['Naps & settling', 20, 'day'], ['Night wakings', 20, 'few'], ['Potty training', 15, 'day'], ['Bedtime routine', 30, 'day'], ['Homework help', 30, 'day'], ['Bath time', 20, 'day'], ['Playing & reading together', 30, 'day'], ['Driving to activities', 60, 'week'], ['Helping a family member at home', 120, 'week']],
    baby: [['Night feeds', 40, 'day'], ['On call at night (the one listening out)', 6, 'few', 'h'], [SOLO_CARE, 8, 'wkd', 'h'], ['Daytime feeds & pumping', 90, 'day'], ['Nappies & diapers', 30, 'day'], ['Bottles, pump parts & sterilizing', 20, 'day'], ['Settling, rocking & naps', 45, 'day'], ['Baby laundry', 20, 'few'], ['Baby appointments & check-ups', 60, 'month'], ['Tracking feeds, sleep & supplies', 10, 'day'], ['Ordering formula, nappies & wipes', 20, 'week']],
    pets: [['Feeding & fresh water', 10, 'day'], ['Dog walks', 30, 'day'], ['Litter, cage or tank cleaning', 15, 'few'], ['Grooming & baths', 30, 'month'], ['Vet visits & pet supplies', 60, 'month']],
    money: [['Paying bills', 20, 'week'], ['Budget & checking accounts', 30, 'week'], ['Splitting shared costs', 15, 'week'], ['Taxes & receipts', 90, 'month'], ['Comparing plans & renewals', 60, 'month']],
    admin: [['Mail & home email', 15, 'few'], ['School forms & sign-ups', 20, 'week'], ['Calls & customer service', 30, 'week'], ['Insurance & documents', 45, 'month'], ['Licenses & registrations', 30, 'month'], ['Filing & keeping papers in order', 30, 'month']],
    appts: [['Booking appointments', 20, 'week'], ['Getting people to appointments', 90, 'month'], ['Pharmacy pickups', 20, 'week'], ['Claims & forms', 30, 'month'], ['Keeping the appointment calendar', 10, 'week']],
    errands: [['Household shopping', 45, 'week'], ['Online orders & deliveries', 15, 'week'], ['Post office & pickups', 20, 'week'], ['Returns & exchanges', 30, 'month'], ['Clothes & shoes for others', 60, 'month'], ['Gifts & cards', 45, 'month']],
    car: [['Gas & car wash', 20, 'week'], ['Car service & tires', 90, 'month'], ['Small fixes around the home', 45, 'week'], ['Waiting in for repair people', 60, 'month'], ['Filters, bulbs & smoke alarm batteries', 20, 'month']],
    yard: [['Mowing', 45, 'week'], ['Weeding & watering', 30, 'week'], ['Raking leaves', 60, 'week'], ['Shoveling snow', 30, 'week'], ['Plants & garden', 20, 'week']],
    social: [['Keeping in touch with family', 30, 'week'], ['Keeping up with both families & in-laws', 20, 'week'], ['Birthdays & holidays', 60, 'month'], ['Thank-you notes & messages', 15, 'week'], ['Hosting & visitors', 120, 'month'], ['Planning time with friends', 20, 'week'], ['Kids’ playdates & parties', 60, 'month']],
    mental: [['Keeping the family calendar', 15, 'few'], ['Noticing what’s running low', 10, 'day'], ['Planning the week ahead', 30, 'week'], ['Remembering dates & deadlines', 10, 'day'], ['Childcare & backup plans', 30, 'week'], ['Checking that things got done', 10, 'day'], ['Trips & holiday planning', 120, 'month']],
    emotional: [['Keeping the peace', 15, 'day'], ['Checking in on how people are', 15, 'day'], ['Calming a hard moment', 20, 'few'], ['Listening & support', 30, 'few'], ['Smoothing things over with family', 30, 'week']],
    work: [['Paid work', 40, 'week', 'h'], ['Commute', 30, 'wkd'], ['School or classes', 15, 'week', 'h'], ['Study & homework (my own)', 5, 'week', 'h'], ['Work messages after hours', 20, 'wkd'], ['A side job', 5, 'week', 'h']],
    rest: [['Time to myself', 30, 'day'], ['A walk or moving my body', 30, 'few'], ['Hobbies', 60, 'week'], ['Time with friends', 120, 'week'], ['Quiet time doing nothing', 20, 'day'], ['A full day off', 8, 'month', 'h']]
  };
  // Library jobs that start as each person's own (their own family, their own life), not shared home work
  var PERSONAL_LIB = { 'keeping in touch with family': 1 };
  var PLAN = [['keep', 'Keep'], ['handoff', 'Hand off'], ['drop', 'Drop'], ['simplify', 'Simplify'], ['schedule', 'Schedule']];

  function libMatch(name) {
    var l = (name || '').trim().toLowerCase(), hit = null;
    Object.keys(LIB).forEach(function (c) { LIB[c].forEach(function (t) { if (t[0].toLowerCase() === l) hit = { cat: c, t: t }; }); });
    return hit;
  }
  // Older stands had no categories: make a calm guess from the job's name, or file it under "Other jobs".
  // Rest is only ever guessed from clearly restful words (a nap, a hobby, the gym for me). A pick-up, a
  // drop-off, a hand-over, a school run, a drive or an appointment is work for someone, never rest.
  var NOT_REST = /pick(?:ing|s)?[ -]?up|drop(?:ping|s)?[ -]?off|hand-?(?:off|over)|school run|\bdriv(?:e|es|ing)\b|\blifts?\b|\brides?\b|appoint|custody|co-?parent|collect|ferry|transport|errand/;
  var GUESS = [
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
  function guessCat(name) {
    var m = libMatch(name); if (m) return m.cat;
    var l = (name || '').toLowerCase(), c = 'other';
    for (var i = 0; i < GUESS.length; i++) if (GUESS[i][1].test(l)) { c = GUESS[i][0]; break; }
    if (c === 'rest' && NOT_REST.test(l)) c = 'other';
    return c;
  }
  // the area a job is counted in, in plain words: "Rest, not in the split"
  var AREA_SHORT = { rest: 'Rest', work: 'Work & school' };
  function areaWords(j) {
    var c = CAT[j.cat] || CAT.other, k = kindOf(j), n = AREA_SHORT[c.id] || c.n;
    if (solo()) return n;
    if (k === 'personal') return 'Own family or personal, not in the split';
    return n + (k === 'home' ? ', in the split' : ', not in the split');
  }

  // The example is shown as grey placeholder text (item.ex), never as values: it is never counted in
  // a total, and the first edit to a row turns that row into yours.
  function exampleRow(name, v, cat) { return { name: '', v: v.map(function () { return 0; }), ex: { name: name, v: v }, cat: cat, freq: 'week', unit: 'h', t: [], nm: [] }; }
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

  var state;       // { people:[], jobs:[], bills:[], owners:[], example:bool, weeks:[], agreed:{on,p[]}, as:int, mode,
                   //   part:[1 or 0.5 per person], me:int (who's filling in: -1 not said, -2 together), cur:'$', checked:bool }
  var keep = false, mode = null;
  // How a bill is shared
  // (savings and money coming in are kept and shown, never split and never owed between people)
  var BILL_KIND = { shared: 'Shared, split', own: 'One person’s own', agreed: 'Agreed amount, like family support', savings: 'Savings goal, kept', income: 'Money coming in (pay)' };
  var BILL_ORDER = ['shared', 'own', 'agreed', 'savings', 'income'];
  // the words for each kind of cost in the money summary
  var KIND_WORD = { shared: 'shared bills', own: 'own costs', agreed: 'family support', savings: 'savings' };
  var COST_KINDS = ['shared', 'own', 'agreed', 'savings'];
  // The money sign: a calm guess from the browser's language, changeable on the Money tab
  var EURO = /^(AT|BE|CY|DE|EE|ES|FI|FR|GR|HR|IE|IT|LT|LU|LV|MT|NL|PT|SI|SK)$/;
  var OTHER_CUR = { IN: '₹', JP: '¥', CN: '¥', KR: '₩', SE: 'kr', NO: 'kr', DK: 'kr', CH: 'CHF', ZA: 'R', PL: 'zł', BR: 'R$', NG: '₦', PH: '₱' };
  var CUR_PICK = ['$', '£', '€'];
  function defaultCur() {
    var l = ''; try { l = String(navigator.language || ''); } catch (e) {}
    var parts = l.split('-'), lang = (parts[0] || '').toLowerCase(), reg = (parts[parts.length - 1] || '').toUpperCase();
    if (parts.length < 2) reg = '';
    if (reg === 'GB' || reg === 'UK') return '£';
    if (EURO.test(reg)) return '€';
    if (OTHER_CUR[reg]) return OTHER_CUR[reg];
    if (!reg && /^(de|fr|es|it|nl|fi|pt|el|sk|sl|et|lv|lt|ga|mt|hr)$/.test(lang)) return '€';
    return '$';
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function num(x) { var n = parseFloat(x); return isFinite(n) && n > 0 ? n : 0; }
  function r1(n) { return Math.round(n * 10) / 10; }
  function sum(a) { return a.reduce(function (s, x) { return s + x; }, 0); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return (Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  // plain time: "20 min", "2.5 h"
  function hrs(h) { if (h <= 0) return '0 h'; if (h < 1) return Math.max(1, Math.round(h * 60)) + ' min'; return r1(h) + ' h'; }
  function nameOf(i) { var n = (state.people[i] || '').trim(); return n || ('Person ' + (i + 1)); }
  function placeholder(n) { n = String(n || '').trim(); return !n || /^(me|them|you|person [a-h1-8])$/i.test(n); }
  // a person with anything typed on their side
  function hasData(i) {
    return state.jobs.some(function (j) { return !j.ex && (num(j.v[i]) > 0 || num((j.t || [])[i]) > 0); }) ||
      state.bills.some(function (b) { return !b.ex && num(b.v[i]) > 0; });
  }
  // Before the other side comes in: someone with nothing on their side yet, while another person has
  // entries. No verdict, score or hand-over hours until their side arrives (or "Show the split anyway").
  // With three or more grown-ups, only while just one of them has filled anything in. Children are never
  // waited for: a parent usually fills in their part, and a child may rightly have none.
  // (kind 'bills' asks about the Money tab; otherwise it's the hours)
  function waitingFor(kind) {
    if (solo() || state.noWait) return [];
    var adults = state.people.map(function (_, i) { return i; }).filter(function (i) { return !state.kid[i]; });
    if (adults.length < 2) return [];
    var have = state.people.map(function (_, i) {
      return kind === 'bills' ? state.bills.some(function (b) { return !b.ex && num(b.v[i]) > 0; })
        : state.jobs.some(function (j) { return !j.ex && (num(j.v[i]) > 0 || num((j.t || [])[i]) > 0); });
    }), withData = adults.filter(function (i) { return have[i]; }).length;
    if (!withData || (adults.length > 2 && withData > 1)) return [];
    return adults.filter(function (i) { return !have[i]; });
  }
  function waitNames(w) { return w.filter(function (i) { return !placeholder(state.people[i]); }).map(nameOf); }
  // what: 'bills' for the Money tab. Never asks anyone to send a code to themselves: on the phone of the
  // person still to fill in ("Who's filling in"), it asks for their own side instead.
  function waitText(w, what) {
    var see = what === 'bills' ? 'to see who owes whom' : 'to see the split';
    var me = state.me, mine = me >= 0 && w.indexOf(me) >= 0, rest = w.filter(function (i) { return i !== me; }), restNamed = waitNames(rest);
    if (mine) {
      return 'Waiting for your side' + (placeholder(state.people[me]) ? '' : ', ' + nameOf(me)) + '. Fill in your own ' + (what === 'bills' ? 'amounts' : 'hours') + ' above ' + see +
        (rest.length ? (restNamed.length === rest.length ? ', and ask ' + joinNames(restNamed) + ' for theirs.' : ', and ask the others for theirs.') : '.');
    }
    var named = waitNames(w);
    if (!named.length || named.length < w.length) return 'Waiting for the other side. Send your side (“Send my side to my partner”, above) ' + see + '.';
    return 'Waiting for ' + joinNames(named.map(function (x) { return x + '’s'; })) + (named.length === 1 ? ' side' : ' sides') + '. Send ' + joinNames(named) + ' your side ' + see + '.';
  }
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
    // the names and the "who is this for" choice on their own too, for this tab only (nothing more)
    try { sessionStorage.setItem(NAMES, JSON.stringify({ people: state.people.map(function (p) { return String(p || '').slice(0, 40); }), mode: mode })); } catch (e) {}
    if (hhWrite) hhWrite.soon();
    if (!keep) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked: stay in-tab only */ }
  }
  function loadDraft() {
    try { var raw = sessionStorage.getItem(DRAFT); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function loadNames() {
    try { var o = JSON.parse(sessionStorage.getItem(NAMES) || 'null'); return o && Array.isArray(o.people) && o.people.some(function (p) { return !placeholder(p); }) ? o : null; } catch (e) { return null; }
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
      // how often, person by person (Ben twice a week, Aisha each day), when someone set it that way
      if (Array.isArray(j.fq)) j.fq = fit(j.fq, n, j.freq).map(function (f) { return FREQ[f] ? f : j.freq; });
      else delete j.fq;
      if (!CAT[j.cat]) j.cat = guessCat(j.name || (j.ex && j.ex.name));
      // a job typed in by hand that an older guess filed under rest (like "Dropping off Leo"): guess again
      if (j.custom && !j.catSet && j.cat === 'rest' && guessCat(j.name) !== 'rest') j.cat = guessCat(j.name);
      // who notices first, as each person sees it (j.nm[i] = 1: "I usually notice first"). An older stand
      // kept one name (nf); that becomes that person's mark. Just me: j.nso = "someone else notices first".
      if (!Array.isArray(j.nm)) {
        j.nm = state.people.map(function () { return 0; });
        if (typeof j.nf === 'number' && j.nf >= 0 && j.nf < n) j.nm[j.nf] = 1;
        if (j.nf === -2) j.nso = 1;
      }
      j.nm = fit(Array.from(j.nm), n, 0).map(function (x) { return x ? 1 : 0; });
      delete j.nf;
    });
    state.bills.forEach(function (b) {
      b.name = b.name || ''; b.v = fit(b.v, n, 0);
      if (!BILL_KIND[b.kind]) b.kind = 'shared';
      if (typeof b.who !== 'number' || b.who >= n || b.who < -1) b.who = -1;
    });
    state.weeks = Array.isArray(state.weeks) ? state.weeks.slice(-MAX_WEEKS) : [];
    state.agreed = state.agreed && typeof state.agreed === 'object' ? state.agreed : { on: false, p: [] };
    state.agreed.p = fit(state.agreed.p, n, '');
    // the nights out of 14 someone lives here (a share of 1 is every night; 0.5 is half the time)
    state.part = fit(state.part, n, 1).map(function (x) { x = +x; return isFinite(x) && x > 0 && x < 1 ? Math.round(x * 14) / 14 || 1 / 14 : 1; });
    state.kid = fit(state.kid, n, false).map(function (x) { return x === true; });
    // tasks from the library start with no one's time ("pick who") unless someone chose a person
    if (!state.asSet || typeof state.as !== 'number' || state.as >= n || state.as < -1) { state.as = -1; state.asSet = false; }
    if (typeof state.me !== 'number' || state.me >= n || state.me < -2) state.me = -1;
    if (typeof state.cur !== 'string' || !state.cur.trim()) { state.cur = defaultCur(); state.curSet = false; }
    state.cur = state.cur.trim().slice(0, 4);
    state.checked = !!state.checked;
    state.noWait = !!state.noWait;
    state.asPick = !!state.asPick;
    state.compact = !!state.compact;
    if (state.tab !== 'money') delete state.tab;
    // a split suggested from the other phone, waiting for "Use it?"
    var ao = state.agreedOffer;
    if (!ao || typeof ao !== 'object' || !Array.isArray(ao.p) || ao.p.length !== n) delete state.agreedOffer;
    else ao.by = String(ao.by || '').slice(0, 40);
  }

  /* ---------- weekly time ---------- */
  // how often a job happens for one person (left out: the job's own "how often")
  function freqOf(j, i) { return i != null && j.fq && FREQ[j.fq[i]] ? j.fq[i] : j.freq; }
  function mult(j, i) { return FREQ[freqOf(j, i)] || 1; }
  function doH(j, i) {
    var n = num(j.v[i]); if (!n) return 0;
    return n * (j.unit === 'm' ? 1 / 60 : 1) * (mult(j, i) - feedInside(j, i));
  }
  function isOnCall(j) { return !j.ex && /^on call at night/.test(low(j.name)); }
  function isNightFeed(j) { return !j.ex && /^night feeds?\b/.test(low(j.name)); }
  function onCallListed() { return state.jobs.some(function (j) { return isOnCall(j) && j.v.some(function (x) { return num(x) > 0; }); }); }
  // Night feeds inside on-call hours, once someone says so, are counted once, but only on the nights that
  // person is on call: on call 3 nights and feeding 7 leaves 4 nights of feeds counted on top.
  function callNights(i) { return Math.min(7, sum(state.jobs.filter(isOnCall).map(function (j) { return num(j.v[i]) > 0 ? mult(j, i) : 0; }))); }
  function feedInside(j, i) { return j.inCall && isNightFeed(j) && num(j.v[i]) > 0 ? Math.min(mult(j, i), callNights(i)) : 0; }
  function nightsTxt(x) { x = Math.round(x * 10) / 10; return x + (x === 1 ? ' night' : ' nights'); }
  // "counted inside on-call on 3 nights for Ben", or '' when none of the feeds sit inside on-call
  function feedNote(j) {
    if (!j.inCall || !isNightFeed(j)) return '';
    var per = state.people.map(function (_, i) { return { i: i, n: feedInside(j, i) }; }).filter(function (o) { return o.n > 0 && (!solo() || o.i === 0); });
    if (!per.length) return '';
    return 'counted inside on-call on ' + (solo() || state.people.length < 2 ? nightsTxt(per[0].n) : joinNames(per.map(function (o, k) { return (k ? nightsTxt(o.n).replace(/ nights?$/, '') : nightsTxt(o.n)) + ' for ' + nameOf(o.i); })));
  }
  // anyone with both night feeds and on-call nights: the feeds can be counted inside on-call
  function feedOverlap(j) { return isNightFeed(j) && state.people.some(function (_, i) { return num(j.v[i]) > 0 && callNights(i) > 0 && (!solo() || i === 0); }); }
  function thH(j, i) { return num((j.t || [])[i]) / 60 * mult(j, i); }
  // a job marked as someone's own family or personal life is counted on its own, outside the shared split
  function kindOf(j) { return j.personal && !solo() ? 'personal' : (CAT[j.cat] || CAT.other).k; }
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
    else wk = isFinite(n) ? (think || j.unit === 'm' ? n / 60 : n) * (j.isBill ? 1 : mult(j, i)) : 0;
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
      inp.setAttribute('aria-label', 'Person ' + (i + 1) + ' name');
      inp.addEventListener('input', function () { state.people[i] = inp.value; relabel(); recalc(); });
      // leaving a name box keeps the household up to date at once (when the tick is on), not a moment later
      inp.addEventListener('change', function () { if (hhWrite) hhWrite.now(false); });
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
    state.jobs.forEach(function (j) { j.v.push(0); j.t.push(0); if (j.nm) j.nm.push(0); if (j.fq) j.fq.push(j.freq); });
    state.bills.forEach(function (b) { b.v.push(0); });
    state.agreed.p.push('');
    delete state.agreedOffer;
    state.part.push(1); state.kid.push(false);
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
    state.jobs.forEach(function (j) { j.v.splice(i, 1); j.t.splice(i, 1); shiftRaw(j, i); if (j.nm) j.nm.splice(i, 1); if (j.fq) j.fq.splice(i, 1); });
    state.bills.forEach(function (b) { b.v.splice(i, 1); shiftRaw(b, i); });
    state.agreed.p.splice(i, 1);
    delete state.agreedOffer;
    state.part.splice(i, 1); state.kid.splice(i, 1);
    state.bills.forEach(function (b) { if (b.who === i) b.who = -1; else if (b.who > i) b.who--; });
    if (state.me === i) state.me = -1; else if (state.me > i) state.me--;
    if (state.as === i) { state.as = -1; state.asSet = false; } else if (state.as > i) state.as--;
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

  /* ---------- whose side is this? (a gentle cue, never a block) ---------- */
  // "Each person fills in only their own side": when someone types on another person's side, say so once,
  // kindly, under that row. Who's filling in comes from the chips near the names; if nobody said, the
  // first side typed on in this visit counts as theirs.
  var cued = {}, firstSide = -1;
  function sideCue(i, el) {
    if (solo() || !el || state.me === -2) return;
    var other;
    if (state.me >= 0) other = i !== state.me;
    else { if (firstSide < 0) firstSide = i; other = i !== firstSide; }
    if (!other || cued[i]) return;
    cued[i] = 1;
    var real = !placeholder(state.people[i]);
    el.textContent = 'This is ' + (real ? nameOf(i) + '’s' : 'someone else’s') + ' side. Hand over the device, or check these numbers with ' + (real ? nameOf(i) : 'them') + '?' +
      (state.me === -1 ? ' (Tap who’s filling in, near the names, and this only shows for the other side.)' : '');
    el.hidden = false;
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
        j.unit === 'h' && freqOf(j, i) === 'week' && !think ? 'because it’s more hours than a week has (168). Were they minutes?' :
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
    var cue = document.createElement('p'); cue.className = 'row-cue'; cue.hidden = true; cue.setAttribute('aria-live', 'polite');
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
    // night feeds listed beside "On call at night": offer to count them once
    var dbl = null;
    if (isNightFeed(item)) {
      dbl = document.createElement('div'); dbl.className = 'row-cue ls-dbl'; dbl.hidden = true;
      var dblP = document.createElement('p'); dblP.className = 'ls-mini'; dblP.style.margin = '0';
      var dblB = document.createElement('button'); dblB.type = 'button'; dblB.className = 'ls-link-btn'; dblB.setAttribute('data-fk', 'dbl' + idx);
      dblB.addEventListener('click', function () {
        item.inCall = !item.inCall; markEdited(); recalc();
        status(item.inCall ? 'Night feeds are counted inside on-call on the nights it covers now, and on top of it on the other nights.' : 'Night feeds are counted on top of on-call again.');
      });
      dbl.appendChild(dblP); dbl.appendChild(dblB);
    }
    function showDbl() {
      if (!dbl) return;
      var both = onCallListed() && feedOverlap(item);
      dbl.hidden = !both;
      if (!both) return;
      var fn = feedNote(item), left = state.people.some(function (_, i) { return (!solo() || i === 0) && doH(item, i) > 0; });
      dblP.textContent = item.inCall ? 'Night feeds are ' + fn + (left ? '. The other nights are counted on top.' : '.') : 'Night feeds on the nights someone is on call happen inside those hours. Count them once on those nights?';
      dblB.textContent = item.inCall ? 'Count them on top again' : 'Count feeds as part of on-call';
    }
    // a job you typed yourself says, in plain words, where it's counted: "Counted as: Rest, not in the split. Change?"
    var area = null;
    if (item.custom) {
      area = document.createElement('p'); area.className = 'row-area'; area.setAttribute('aria-live', 'polite');
      var areaT = document.createElement('span');
      var areaB = document.createElement('button'); areaB.type = 'button'; areaB.className = 'ls-link-btn'; areaB.textContent = 'Change?'; areaB.setAttribute('data-fk', 'ar' + idx);
      areaB.addEventListener('click', function () { cs.focus(); try { if (cs.showPicker) cs.showPicker(); } catch (e) {} });
      area.appendChild(areaT); area.appendChild(document.createTextNode(' ')); area.appendChild(areaB);
    }
    function showArea() {
      if (!area) return;
      area.hidden = !item.name.trim() && !item.v.some(function (x) { return num(x) > 0; });
      areaT.textContent = 'Counted as: ' + areaWords(item) + '.';
    }
    row._refresh = function () { showNote(); showSum(); showDbl(); showArea(); };
    ta.addEventListener('input', function () {
      own(); item.name = ta.value.replace(/\n/g, ' '); autoGrow(ta); markEdited();
      // a job you typed yourself: a calm guess at its area from its name, until you pick one
      if (item.custom && !item.catSet) { var g = guessCat(item.name); if (g !== 'other' && cs.value !== g) cs.value = g; }
      recalc(); renderPicks(); showArea();
    });
    // the guess files the job under its area once you leave the name
    ta.addEventListener('change', function () {
      if (!item.custom || item.catSet) return;
      var g = guessCat(item.name);
      if (g === 'other' || g === item.cat) return;
      item.cat = g;
      // redraw a moment later, once focus has landed where the person tapped (the time box, say), so it stays there
      setTimeout(function () { renderRows(); renderLibTasks(); recalc(); }, 0);
      status('Filed “' + item.name.trim() + '” under ' + CAT[g].n + '. Change its area if that’s not right.');
    });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter') e.preventDefault(); });
    var rm = document.createElement('button');
    rm.type = 'button'; rm.className = 'remove'; rm.innerHTML = '&times;';
    rm.setAttribute('aria-label', 'Remove this job');
    rm.addEventListener('click', function () { state.jobs.splice(state.jobs.indexOf(item), 1); markEdited(); renderRows(); renderOwners(); renderLibTasks(); recalc(); status('Removed the job.'); });
    top.appendChild(ta); top.appendChild(rm);

    // kind of job (in the fold), how often and minutes or hours (beside the time)
    var meta = document.createElement('div'); meta.className = 'row-kind';
    var cs = select(CATS.map(function (c) { return [c.id, c.n]; }), item.cat, 'Kind of job', 'c' + idx);
    var fs = select(FREQ_ORDER.map(function (f) { return [f, FREQ_LABEL[f]]; }), solo() ? freqOf(item, 0) : item.freq, 'How often', 'f' + idx);
    var us = select([['m', 'Minutes'], ['h', 'Hours']], item.unit, 'Minutes or hours', 'u' + idx);
    function labeled(txt, el, cls) { var l = document.createElement('label'); if (cls) l.className = cls; var sp = document.createElement('span'); sp.textContent = txt; l.appendChild(sp); l.appendChild(el); return l; }
    if (!item.custom) meta.appendChild(labeled('Kind of job', cs));
    cs.addEventListener('change', function () { own(); item.cat = cs.value; item.catSet = true; markEdited(); renderRows(); renderLibTasks(); recalc(); status('Moved to ' + CAT[item.cat].n + '.'); });
    fs.addEventListener('change', function () { own(); if (item.fq && solo()) item.fq[0] = fs.value; else { item.freq = fs.value; delete item.fq; } revalidate(item); markEdited(); refreshInputs(); recalc(); });
    // how often, person by person: "Ben twice a week, Aisha each day"
    function freqSel(i) {
      var ps = select(FREQ_ORDER.map(function (f) { return [f, FREQ_LABEL[f]]; }), freqOf(item, i), (solo() ? 'You' : nameOf(i)) + ', how often', 'fq' + i + '-' + idx);
      ps.classList.add('ls-pfreq');
      ps.addEventListener('change', function () { own(); item.fq[i] = ps.value; revalidate(item); markEdited(); refreshInputs(); recalc(); });
      return ps;
    }
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
        if (item.pick != null) { delete item.pick; if (pickBox) pickBox.hidden = true; }
        item.raw = item.raw || {}; item.raw[k] = inp.value;
        if (checkVal(item, k)) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid');
        if (inp.value !== '' && inp.value !== '0') sideCue(i, cue);
        markEdited(); row._refresh(); recalc();
      });
      lab.appendChild(sp); lab.appendChild(inp);
      var pf = !think && item.fq && !solo() ? freqSel(i) : null;
      if (pf) lab.appendChild(pf);
      inputs.push({ i: i, think: think, k: k, inp: inp, sp: sp, pf: pf });
      return lab;
    }
    function refreshInputs() {
      inputs.forEach(function (o) {
        var i = o.i, inp = o.inp;
        o.sp.textContent = (solo() ? 'Me' : nameOf(i)) + (o.think ? ', thinking (min)' : ' (' + unitWord(item) + ')');
        inp.step = o.think || item.unit === 'm' ? '5' : '0.5';
        var lab = (solo() ? 'Your time' : nameOf(i)) + (o.think ? ', thinking part in minutes' : ', ' + unitWord(item)) + ', ' + FREQ_LABEL[freqOf(item, i)].toLowerCase();
        if (o.pf) { o.pf.setAttribute('aria-label', nameOf(i) + ', how often'); if (document.activeElement !== o.pf) o.pf.value = freqOf(item, i); }
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
    var fsLab = labeled('How often', fs, 'ls-sel'); fsLab.hidden = !!item.fq && !solo();
    amts.appendChild(fsLab);
    // a job you typed yourself shows its area right here, so it never quietly lands in the wrong one
    if (item.custom) amts.appendChild(labeled('Area', cs, 'ls-sel ls-sel-wide'));
    // "How often differs by person?": each person's own "how often" beside their time
    var each = null;
    if (!solo() && !item.ex && state.people.length > 1) {
      each = document.createElement('p'); each.className = 'ls-mini ls-freq-each';
      var eb = document.createElement('button'); eb.type = 'button'; eb.className = 'ls-link-btn'; eb.setAttribute('data-fk', 'fe' + idx);
      eb.textContent = item.fq ? 'Same “how often” for everyone' : 'How often differs by person?';
      eb.setAttribute('aria-expanded', String(!!item.fq));
      eb.addEventListener('click', function () {
        own();
        if (item.fq) {
          // back to one "how often": the one used by whoever has time on it (or this phone's person)
          var pick = state.me >= 0 && num(item.v[state.me]) > 0 ? state.me : item.v.map(num).indexOf(Math.max.apply(null, item.v.map(num)));
          item.freq = item.fq[pick >= 0 ? pick : 0] || item.freq; delete item.fq;
          status('One “how often” for everyone on “' + (item.name.trim() || 'this job') + '”: ' + FREQ_LABEL[item.freq].toLowerCase() + '.');
        } else {
          item.fq = state.people.map(function () { return item.freq; });
          status('Each person has their own “how often” on “' + (item.name.trim() || 'this job') + '” now, beside their time.');
        }
        revalidate(item); markEdited(); renderRows(); recalc();
        var r = rowFor(item), f = r && (r.querySelector('select.ls-pfreq[data-fk^="fq' + (state.me >= 0 ? state.me : 0) + '-"]') || r.querySelector('[data-fk^="fe"]'));
        if (f) f.focus();
      });
      each.appendChild(eb);
    }

    // a new task from the library starts with no one's time: tap who does it to fill in the typical time
    var pickBox = null;
    // once someone's time is in, the prompt stays until the list is redrawn, then steps aside
    if (item.pick != null && item.v.some(function (x) { return num(x) > 0; })) delete item.pick;
    if (item.pick != null && !solo() && !item.ex) {
      pickBox = document.createElement('div'); pickBox.className = 'row-pick';
      var pl = document.createElement('p'); pl.className = 'ls-mini'; pl.id = 'pk-' + idx;
      pl.textContent = 'Who does this? Tap to fill in about ' + item.pick + (item.unit === 'h' ? ' h' : ' min') + ' ' + FREQ_SHORT[item.freq] + ':';
      var pg = document.createElement('div'); pg.className = 'ls-pick'; pg.setAttribute('role', 'group'); pg.setAttribute('aria-labelledby', 'pk-' + idx);
      state.people.forEach(function (_, i) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'ls-chip'; b.setAttribute('data-fk', 'pk' + idx + '_' + i);
        b.style.setProperty('--pc', COLORS[i]);
        b.setAttribute('aria-pressed', String(num(item.v[i]) > 0)); b.textContent = nameOf(i);
        b.addEventListener('click', function () {
          var on = num(item.v[i]) > 0;
          item.v[i] = on ? 0 : item.pick;
          if (item.raw) delete item.raw[String(i)];
          b.setAttribute('aria-pressed', String(!on));
          if (!on) sideCue(i, cue);
          markEdited(); refreshInputs(); recalc();
          status(on ? 'Took ' + nameOf(i) + '’s time off “' + (item.name || 'this job') + '”.' : 'Filled in ' + nameOf(i) + '’s time for “' + (item.name || 'this job') + '”. Change it to fit your week.');
        });
        pg.appendChild(b);
      });
      pickBox.appendChild(pl); pickBox.appendChild(pg);
    }

    // someone's own family or personal life (like calls with their own family): counted on its own
    var persTag = document.createElement('p'); persTag.className = 'row-own';
    var persBox = document.createElement('label'); persBox.className = 'ls-check';
    var persIn = document.createElement('input'); persIn.type = 'checkbox'; persIn.autocomplete = 'off'; persIn.setAttribute('data-fk', 'ps' + idx);
    persIn.checked = !!item.personal;
    persBox.appendChild(persIn);
    persBox.appendChild(document.createTextNode(' My own family or personal life (counted on its own, not in the shared split)'));
    function showPers() {
      persTag.hidden = solo() || !item.personal;
      persTag.textContent = 'Own family or personal: counted on its own, not in the shared split. If it’s for the whole home (like keeping up with both families), untick it under “More”.';
    }
    persIn.addEventListener('change', function () {
      own(); item.personal = persIn.checked; showPers(); markEdited(); renderOwners(); recalc();
      status(item.personal ? 'Counted on its own now, outside the shared split.' : 'Counted in the shared split now.');
    });
    showPers();

    // the thinking part and who notices first: optional, folded away until it's wanted
    var more = document.createElement('button');
    more.type = 'button'; more.className = 'ls-more'; more.setAttribute('data-fk', 'm' + idx);
    var hasThink = item.t.some(function (x) { return num(x) > 0; }) || item.nm.some(Boolean) || !!item.nso || (item.raw && Object.keys(item.raw).some(function (k) { return k.charAt(0) === 't'; }));
    var open = !!(hasThink || item.open);
    thinkBox.hidden = !open;
    function moreLabel() { more.textContent = (thinkBox.hidden ? '+ ' : '− ') + 'More: the thinking part, who notices, ' + (solo() ? 'kind' : 'kind, own or shared'); more.setAttribute('aria-expanded', String(!thinkBox.hidden)); }
    more.addEventListener('click', function () { thinkBox.hidden = !thinkBox.hidden; item.open = !thinkBox.hidden; moreLabel(); save(); });
    moreLabel();
    var tnote = document.createElement('p'); tnote.className = 'ls-mini';
    tnote.textContent = 'Noticing, planning and remembering, in minutes each time. Optional.';
    thinkBox.appendChild(tnote);
    visiblePeople().forEach(function (i) { tAmts.appendChild(amountInput(i, true)); });
    thinkBox.appendChild(tAmts);
    var nfWrap = document.createElement('div'); nfWrap.className = 'ls-nf';
    var nfLab = document.createElement('p'); nfLab.className = 'ls-mini'; nfLab.id = 'nf-' + idx;
    // each person marks only their own view ("I usually notice first"); one person's tap is never taken as fact for the others
    var mine = !solo() && state.me >= 0;
    nfLab.textContent = solo() ? 'Who usually notices it needs doing first?' : mine ? 'Do you usually notice it needs doing first? Mark only your own view.' : 'Who usually notices it needs doing first? Each person marks only their own view.';
    var nfg = document.createElement('div'); nfg.className = 'ls-pick'; nfg.setAttribute('role', 'group'); nfg.setAttribute('aria-labelledby', 'nf-' + idx);
    var nfOpts = solo() ? [[0, 'Me'], [-2, 'Someone else']] : mine ? [[state.me, 'I usually notice first']] : state.people.map(function (_, i) { return [i, nameOf(i) + ': I notice first']; });
    function nfOn(i) { return i === -2 ? !!item.nso : !!item.nm[i]; }
    nfOpts.forEach(function (o) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'ls-chip'; b.setAttribute('data-fk', 'nf' + idx + '_' + o[0]);
      if (!solo() && !mine) b.setAttribute('data-nfp', '1');
      if (o[0] >= 0) b.style.setProperty('--pc', COLORS[o[0]]);
      b.setAttribute('aria-pressed', String(nfOn(o[0]))); b.textContent = o[1];
      b.addEventListener('click', function () {
        own();
        var on = !nfOn(o[0]);
        if (o[0] === -2) item.nso = on ? 1 : 0; else item.nm[o[0]] = on ? 1 : 0;
        // just me: "Me" and "Someone else" are one answer
        if (solo() && on) { if (o[0] === -2) item.nm[0] = 0; else item.nso = 0; }
        nfg.querySelectorAll('button').forEach(function (x) { var m = /_(-?\d+)$/.exec(x.getAttribute('data-fk') || ''); if (m) x.setAttribute('aria-pressed', String(nfOn(+m[1]))); });
        markEdited(); recalc();
      });
      nfg.appendChild(b);
    });
    var nfViews = document.createElement('p'); nfViews.className = 'ls-mini ls-nf-views';
    function showViews() {
      if (solo()) { nfViews.hidden = true; return; }
      var others = state.people.map(function (_, i) { return i; }).filter(function (i) { return !mine || i !== state.me; }).filter(function (i) { return item.nm[i]; });
      nfViews.hidden = !mine || !others.length;
      if (!nfViews.hidden) nfViews.textContent = joinNames(others.map(nameOf)) + (others.length === 1 ? ' marked' : ' each marked') + ' this as noticing it first too.';
    }
    nfWrap.appendChild(nfLab); nfWrap.appendChild(nfg); nfWrap.appendChild(nfViews); thinkBox.appendChild(nfWrap); thinkBox.appendChild(meta);
    if (!solo()) thinkBox.appendChild(persBox);

    // three or more people, with "Who's filling in" set: just that person's boxes, and a short line for the
    // rest, so a job never turns into a very tall block on a phone
    var others = null, othT = null;
    if (!solo() && state.me >= 0 && state.people.length > 2 && !item.showAll) {
      inputs.forEach(function (o) { if (o.i !== state.me) o.sp.parentNode.hidden = true; });
      others = document.createElement('p'); others.className = 'ls-mini row-others';
      othT = document.createElement('span');
      var othB = document.createElement('button'); othB.type = 'button'; othB.className = 'ls-link-btn'; othB.textContent = 'Show everyone'; othB.setAttribute('data-fk', 'oa' + idx);
      othB.addEventListener('click', function () {
        item.showAll = true; inputs.forEach(function (o) { o.sp.parentNode.hidden = false; }); others.hidden = true; save();
        var f = amts.querySelector('input'); if (f) f.focus();
      });
      others.appendChild(othT); others.appendChild(document.createTextNode(' ')); others.appendChild(othB);
    }
    function showOthers() {
      if (!othT) return;
      var n = state.people.filter(function (_, i) { return i !== state.me && (num(item.v[i]) > 0 || num(item.t[i]) > 0); }).length;
      othT.textContent = 'Others: ' + (n ? n + ' filled in' : 'none filled in yet') + '.';
    }
    var refresh0 = row._refresh; row._refresh = function () { refresh0(); showOthers(); showViews(); };

    var foot = document.createElement('div'); foot.className = 'row-foot';
    foot.appendChild(more); foot.appendChild(sumLine);
    row.appendChild(top);
    if (pickBox) row.appendChild(pickBox);
    row.appendChild(amts); if (each) row.appendChild(each); if (others) row.appendChild(others); if (area) row.appendChild(area); row.appendChild(persTag); row.appendChild(foot);
    row.appendChild(thinkBox); if (dbl) row.appendChild(dbl); row.appendChild(cue); row.appendChild(note);
    refreshInputs();
    requestAnimationFrame(function () { autoGrow(ta); });
    return row;
  }
  // "Tom paid (£)", "Tom puts in (£)" for savings, "Tom brings in (£)" for money coming in
  function billWho(b, i) { return nameOf(i) + (b.kind === 'income' ? ' brings in' : b.kind === 'savings' ? ' puts in' : ' paid') + ' (' + state.cur + ')'; }
  function makeBillRow(idx) {
    var item = state.bills[idx]; item.isBill = true;
    var row = document.createElement('div'); row.className = 'row'; row.setAttribute('data-bidx', idx);
    var top = document.createElement('div'); top.className = 'row-top';
    var ta = document.createElement('textarea');
    ta.rows = 1; ta.className = 'task-name'; ta.value = item.name; ta.setAttribute('autocomplete', 'off'); ta.setAttribute('data-fk', 'bn' + idx);
    ta.placeholder = item.ex ? 'Example: ' + item.ex.name : 'What was the cost?';
    ta.setAttribute('aria-label', 'Bill name');
    if (item.ex) row.classList.add('is-example');
    var amts = document.createElement('div'); amts.className = 'row-amts';
    var note = document.createElement('p'); note.className = 'row-note'; note.setAttribute('aria-live', 'polite');
    var cue = document.createElement('p'); cue.className = 'row-cue'; cue.hidden = true; cue.setAttribute('aria-live', 'polite');
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
      sp.textContent = billWho(item, i);
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
        if (inp.value !== '' && inp.value !== '0') sideCue(i, cue);
        showNote(); markEdited(); recalc();
      });
      lab.appendChild(sp); lab.appendChild(inp); amts.appendChild(lab);
    });
    // how it's shared: split (evenly, or by the split you agreed), one person's own, or an agreed amount
    function lab2(txt, el, hidden) { var l = document.createElement('label'); l.className = 'ls-sel'; var sp = document.createElement('span'); sp.textContent = txt; l.appendChild(sp); l.appendChild(el); l.hidden = !!hidden; return l; }
    var ks = select(BILL_ORDER.map(function (k) { return [k, BILL_KIND[k]]; }), item.kind || 'shared', 'How this cost is shared', 'bk' + idx);
    var ws = select([[-1, 'Pick who']].concat(state.people.map(function (_, i) { return [i, nameOf(i)]; })), item.who, 'Whose own cost', 'bw' + idx);
    ws.className = 'ls-bill-who';
    // these two take the row's full width, so their words are never cut off (large text, Easy reading)
    var kLab = lab2('How it’s shared', ks), wLab = lab2('Whose?', ws, item.kind !== 'own');
    kLab.classList.add('ls-sel-wide'); wLab.classList.add('ls-sel-wide');
    amts.appendChild(kLab); amts.appendChild(wLab);
    var kindNote = document.createElement('p'); kindNote.className = 'ls-mini ls-kind-note';
    function showKind() {
      wLab.hidden = item.kind !== 'own';
      kindNote.textContent = item.kind === 'own' ? 'Left out of the settle-up: it’s one person’s own cost.' : item.kind === 'agreed' ? 'Kept on the list so it’s seen, but not split and not owed (like money you send to family).'
        : item.kind === 'savings' ? 'Kept on the list and in each person’s total, never split and never owed between you. Like “Our savings, 200 a month”.'
        : item.kind === 'income' ? 'Not a cost. Optional: with money coming in listed, the summary shows what’s left after the costs.' : '';
      kindNote.hidden = !kindNote.textContent;
      amts.querySelectorAll('.pname[data-k="b"]').forEach(function (sp) { sp.textContent = billWho(item, +sp.dataset.i); });
    }
    ks.addEventListener('change', function () { own(); item.kind = ks.value; showKind(); markEdited(); recalc(); });
    ws.addEventListener('change', function () { own(); item.who = +ws.value; markEdited(); recalc(); });
    showKind();
    row.appendChild(top); row.appendChild(amts); row.appendChild(kindNote); row.appendChild(cue); row.appendChild(note);
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
    markSides();
  }
  // With "Who's filling in" set to one person, the other people's columns are shaded as theirs. They stay
  // editable (it's an honour system, and sometimes you fill it in together); the note says whose they are.
  function markSides() {
    var me = solo() ? -1 : state.me;
    document.querySelectorAll('.stand .row-amts .pname').forEach(function (sp) {
      var lab = sp.parentNode, i = +sp.dataset.i;
      if (lab) lab.classList.toggle('is-theirs', me >= 0 && i !== me);
    });
    var note = $('me-note'); if (!note) return;
    var others = me >= 0 ? state.people.map(function (_, i) { return i; }).filter(function (i) { return i !== me; }) : [];
    note.hidden = !others.length;
    if (others.length) {
      var named = others.filter(function (i) { return !placeholder(state.people[i]); }).map(nameOf);
      var whose = named.length === others.length ? joinNames(named.map(function (x) { return x + '’s'; })) : 'The other';
      note.textContent = whose + (others.length === 1 ? ' column is' : ' columns are') + ' shaded: ' + (others.length === 1 && named.length ? 'that’s ' + named[0] + '’s side' : 'those sides are theirs') + ' to fill in. Hand over the device, or type there together if you’re both looking.';
    }
  }
  function relabel() {
    document.querySelectorAll('.row-amts .pname').forEach(function (sp) {
      var i = +sp.dataset.i, k = sp.dataset.k;
      if (k === 'b') { var br = sp.closest('.row'), bb = br ? state.bills[+br.getAttribute('data-bidx')] : null; sp.textContent = bb ? billWho(bb, i) : nameOf(i) + ' paid (' + state.cur + ')'; return; }
      var row = sp.closest('.row'), j = row ? state.jobs[+row.getAttribute('data-idx')] : null;
      if (!j) return;
      sp.textContent = (solo() ? 'Me' : nameOf(i)) + (k === 't' ? ', thinking (min)' : ' (' + unitWord(j) + ')');
    });
    renderAsRow(); renderMeRow(); renderPartRow(); renderAgreed(); renderOwners(); markSides();
    document.querySelectorAll('select.ls-bill-who option').forEach(function (o) { var i = +o.value; if (i >= 0) o.textContent = nameOf(i); });
    document.querySelectorAll('.row-pick .ls-chip').forEach(function (b) { var m = /_(\d+)$/.exec(b.getAttribute('data-fk') || ''); if (m) b.textContent = nameOf(+m[1]); });
    document.querySelectorAll('.ls-nf .ls-chip[data-nfp]').forEach(function (b) {
      var m = /_(-?\d+)$/.exec(b.getAttribute('data-fk') || ''); var i = m ? +m[1] : -1;
      if (i >= 0 && !solo()) b.textContent = nameOf(i) + ': I notice first';
    });
  }
  function markEdited() {
    state.example = false;
    $('example-note').hidden = !anyExample();
  }

  /* ---------- the task library ---------- */
  var libCat = 'home', libTouched = false;
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
        b.addEventListener('click', function () { libCat = c.id; libTouched = true; renderLibCats(); renderLibTasks(); });
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
      if (hint) hint.textContent = libCat === 'baby' ? 'Night time counts. If one of you is on call, listening out while the other sleeps, count those hours too.' :
        c.k === 'work' ? 'Work and school hours are shown beside your home jobs, never mixed into them.' :
        c.k === 'rest' ? 'Rest counts too. It shows how much room your week has to recover.' :
        libCat === 'appts' ? 'Only the logistics: booking, getting there, forms and pickups.' :
        c.inv ? 'This is the invisible part of running a home. It counts.' : '';
      var extra = $('lib-extra'); if (extra) extra.hidden = libCat !== 'baby';
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
  // Whose column a library task fills in: the person picked here, or "Pick who each time" when someone
  // chose it, or else whoever is filling in on this device ("Who's filling in on this device right now?").
  function addAs() { return solo() ? 0 : state.asSet ? state.as : state.asPick ? -1 : state.me >= 0 ? state.me : -1; }
  function libTask(name) { var m = libMatch(name); return m ? m.t : null; }
  // "New baby starter pack": the core baby jobs in one tap
  var BABY_PACK = ['Night feeds', 'Daytime feeds & pumping', 'Nappies & diapers', 'Bottles, pump parts & sterilizing', 'Settling, rocking & naps', 'Baby laundry', 'Tracking feeds, sleep & supplies'];
  function addBabyPack() {
    var me = addAs(), added = [], hadEx = anyExample();
    state.jobs = state.jobs.filter(function (j) { return !j.ex; });
    state.bills = state.bills.filter(function (b) { return !b.ex; });
    BABY_PACK.forEach(function (nm) {
      var t = libTask(nm);
      if (!t || state.jobs.some(function (j) { return low(j.name) === low(nm); })) return;
      var j = { name: t[0], v: zeros(), t: zeros(), cat: 'baby', freq: t[2], unit: t[3] || 'm', nm: zeros() };
      if (me >= 0) j.v[me] = t[1]; else j.pick = t[1];
      state.jobs.push(j); added.push(nm);
    });
    markEdited(); renderRows(); renderLibTasks(); renderOwners(); recalc();
    status((added.length ? 'Added ' + added.length + ' baby job' + (added.length === 1 ? '' : 's') + (me >= 0 ? ' with typical times for ' + (solo() ? 'you' : nameOf(me)) + '. Change them to fit your week.' : '. Tap who does each one to fill in the typical time.') + (hadEx ? ' The grey example is cleared.' : '')
      : 'The baby starter pack is already on your list.') + (!solo() && !state.compact ? ' On a phone? “Just the 3 steps” keeps it short.' : ''));
  }
  // "Split the nights": two night shifts, each with one owner, on the fridge list
  var NIGHT_SHIFTS = ['Night shift, 9pm–2am', 'Night shift, 2am–7am'];
  function splitNights() {
    var list = ownersList(), added = 0, full = false;
    NIGHT_SHIFTS.forEach(function (nm) {
      if (list.some(function (o) { return low(o.name) === low(nm); })) return;
      if (list.length >= MAX_OWN) { full = true; return; }
      list.push({ name: nm, who: -1 }); added++;
    });
    renderOwners(); save();
    status(full ? 'The fridge list below has five jobs already. Take one off, then try again.' : added ? 'Added two night shifts to the fridge list below. Tap who owns each one, and swap a night by asking.' : 'The two night shifts are already on the fridge list below.');
    if (added) { var o = $('owners'); if (o) o.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
  }
  function addFromLib(cat, t) {
    var me = addAs();
    var have = state.jobs.filter(function (j) { return !j.ex && j.name.trim().toLowerCase() === t[0].toLowerCase(); })[0];
    if (have && me < 0) {
      var hr = rowFor(have); if (hr) { hr.scrollIntoView({ block: 'center', behavior: 'smooth' }); var tx = hr.querySelector('.row-pick .ls-chip, .row-amts input'); if (tx) tx.focus({ preventScroll: true }); }
      status('“' + t[0] + '” is already on the list.');
      return;
    }
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
    var j = { name: t[0], v: state.people.map(function () { return 0; }), t: state.people.map(function () { return 0; }), cat: cat, freq: t[2], unit: t[3] || 'm', nm: zeros() };
    var pers = !solo() && !!PERSONAL_LIB[t[0].toLowerCase()];
    if (pers) j.personal = true;
    if (me >= 0) j.v[me] = t[1]; else j.pick = t[1];
    state.jobs.push(j);
    markEdited();
    renderRows(); renderLibTasks(); renderOwners(); recalc();
    var amt = t[1] + (j.unit === 'h' ? ' hours ' : ' minutes ') + FREQ_SHORT[t[2]];
    status((me >= 0 ? 'Added “' + t[0] + '” with about ' + amt + (solo() ? '' : ' for ' + nameOf(me)) + '. Change it to fit your week.'
      : 'Added “' + t[0] + '”. Tap who does it to fill in about ' + amt + '.') +
      (pers ? ' It’s counted as each person’s own family time, not in the shared split; change that under “More”.' : '') +
      (hadEx ? ' The grey example is cleared.' : ''));
  }
  function renderAsRow() {
    var box = $('as-row'); if (!box) return;
    keepFocus(box, function () {
      box.innerHTML = '';
      [-1].concat(state.people.map(function (_, i) { return i; })).forEach(function (i) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'ls-chip'; b.setAttribute('data-fk', 'as' + i);
        if (i >= 0) b.style.setProperty('--pc', COLORS[i]);
        b.setAttribute('aria-pressed', String(addAs() === i)); b.textContent = i < 0 ? 'Pick who each time' : nameOf(i);
        b.addEventListener('click', function () {
          state.as = i; state.asSet = i >= 0; state.asPick = i < 0; renderAsRow(); save();
          status(i < 0 ? 'Tasks you add from the library start with no one’s time. Tap who does each one.' : 'Tasks you add from the library fill in ' + nameOf(i) + '’s time.');
        });
        box.appendChild(b);
      });
    });
  }
  // Who's filling in on this device right now (for the "whose side" cue and the name on a sent file)
  function renderMeRow() {
    var box = $('me-row'); if (!box) return;
    keepFocus(box, function () {
      box.innerHTML = '';
      state.people.map(function (_, i) { return i; }).concat([-2]).forEach(function (i) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'ls-chip'; b.setAttribute('data-fk', 'me' + i);
        if (i >= 0) b.style.setProperty('--pc', COLORS[i]);
        b.setAttribute('aria-pressed', String(state.me === i)); b.textContent = i < 0 ? (state.people.length > 2 ? 'All of us, together' : 'Both of us, together') : nameOf(i);
        b.addEventListener('click', function () {
          state.me = state.me === i ? -1 : i; cued = {}; firstSide = -1;
          renderMeRow(); renderAsRow(); renderSend(); renderRows(); recalc();
          status(state.me === -1 ? 'Okay. Nobody picked.' : state.me === -2 ? 'Filling it in together. Each of you checks your own numbers.' : 'Thanks, ' + nameOf(i) + '. ' + (addAs() === i ? 'Jobs you add from the library fill in your time. ' : '') + 'Other people’s columns are shaded as theirs; you can still type there if you need to.');
        });
        box.appendChild(b);
      });
    });
  }
  // Who lives here part of the time, as nights here out of 14 ("Half the time" and "Every other weekend"
  // are the quick choices), and who's a child (for the "adults and kids" suggestion)
  function nightsOf(i) { return Math.round((state.part[i] || 1) * 14); }
  function nightsWord(n) { return n >= 14 ? 'every night' : n === 7 ? 'half the time' : n + ' of 14 nights'; }
  function renderPartRow() {
    var box = $('part-row'); if (!box) return;
    keepFocus(box, function () {
      box.innerHTML = '';
      state.people.forEach(function (_, i) {
        var cell = document.createElement('div'); cell.className = 'ls-part-p'; cell.style.setProperty('--pc', COLORS[i]);
        var l = document.createElement('label'); var sp = document.createElement('span'); sp.textContent = nameOf(i) + ' is here'; l.appendChild(sp);
        var opts = [[14, 'Every night'], [7, 'Half the time (7 of 14 nights)'], [4, 'Every other weekend (4 of 14 nights)']];
        for (var k = 13; k >= 1; k--) if (k !== 7 && k !== 4) opts.push([k, k + ' of 14 nights']);
        var sel = select(opts.map(function (o) { return [String(o[0]), o[1]]; }), String(nightsOf(i)), nameOf(i) + ': nights here out of 14', 'pt' + i);
        sel.addEventListener('change', function () {
          var was = state.part[i];
          state.part[i] = +sel.value >= 14 ? 1 : +sel.value / 14;
          if (state.part.every(function (x) { return x < 1; })) { state.part[i] = was; sel.value = String(nightsOf(i)); status('At least one person lives here every night.'); return; }
          recalc();
          status(state.part[i] < 1 ? nameOf(i) + ' counts for the nights they’re here (' + nightsWord(nightsOf(i)) + ').' : nameOf(i) + ' counts as a full share again.');
        });
        l.appendChild(sel);
        var kl = document.createElement('label'); kl.className = 'ls-check ls-kid';
        var kb = document.createElement('input'); kb.type = 'checkbox'; kb.autocomplete = 'off'; kb.checked = !!state.kid[i]; kb.setAttribute('data-fk', 'kid' + i);
        kb.addEventListener('change', function () { state.kid[i] = kb.checked; recalc(); status(kb.checked ? nameOf(i) + ' is marked as a child. Try “Suggest an adults and kids split” above, if you like.' : nameOf(i) + ' isn’t marked as a child now.'); });
        kl.appendChild(kb); kl.appendChild(document.createTextNode(' Child'));
        cell.appendChild(l); cell.appendChild(kl);
        box.appendChild(cell);
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

  // The share each person is compared with: the split you agreed (when it adds up to 100%), or an even
  // share where someone who lives here part of the time counts as a half share.
  function target() {
    var n = state.people.length;
    if (state.agreed.on) {
      var p = state.agreed.p.map(function (x) { var v = parseFloat(x); return isFinite(v) ? v : 0; });
      var ps = sum(p);
      if (p.some(function (x) { return x < 0; })) return { error: 'A share in your split can’t be negative.' };
      if (Math.abs(ps - 100) > 0.5) return { error: 'The shares in your split add up to ' + r1(ps) + '%. Make them add up to 100% to compare.' };
      return { t: p.map(function (x) { return x / ps; }), mode: 'agreed' };
    }
    var w = state.part.slice(0, n), ws = sum(w) || n;
    return { t: w.map(function (x) { return x / ws; }), mode: w.some(function (x) { return x !== 1; }) ? 'part' : 'even' };
  }
  function evenTarget() { var n = state.people.length; return { t: state.people.map(function () { return 1 / n; }), mode: 'even' }; }
  function halfNames() { return joinNames(state.part.map(function (x, i) { return x !== 1 ? nameOf(i) + ' (' + nightsWord(nightsOf(i)) + ')' : ''; }).filter(Boolean)); }
  // a share as people say it: 71, or 28.6 when whole numbers can't keep two identical people identical
  function pctNum(x) { var r = Math.round(x * 10) / 10; return String(Math.abs(r - Math.round(r)) < 0.05 ? Math.round(r) : r); }
  function pctList(t) { return t.map(function (x, i) { return nameOf(i) + ' ' + pctNum(x * 100) + '%'; }).join(', '); }
  // "71/29"
  function splitShort(t) { return t.map(function (x) { return pctNum(x * 100); }).join('/'); }
  // A split is only "agreed" once you've both ticked "We've both looked these over"; until then it's the split you set.
  function agreedWord() { return state.checked ? 'agreed' : 'set'; }
  function targetLabel(tg) {
    if (tg.mode === 'agreed') return 'the split you ' + agreedWord() + ' (' + pctList(tg.t) + ')';
    if (tg.mode === 'part') return 'a fair share with ' + halfNames() + ' counted for the nights they’re here (' + pctList(tg.t) + ')';
    return 'an even share';
  }
  // the same target in a few words, for "about 8 h a week more than the 71/29 you set"
  function targetShort(tg) {
    if (tg.mode === 'agreed') return 'the ' + splitShort(tg.t) + ' you ' + agreedWord();
    if (tg.mode === 'part') return 'a fair share for the nights each person is here (' + splitShort(tg.t) + ')';
    return 'an even share';
  }
  // The biggest gap from the target, in plain hours a week. Over about 3 hours it's said in hours, never
  // as "close" or "holding": a score can look fine while one person carries a whole evening more each week.
  var GAP_H = 3;
  function hoursGap(t, tg) {
    var s = sum(t); if (s <= 0 || !tg || tg.error) return null;
    var g = t.map(function (x, i) { return x - tg.t[i] * s; }), big = 0;
    g.forEach(function (x, i) { if (Math.abs(x) > Math.abs(g[big])) big = i; });
    // with two people the one doing more is named; with more, whoever is furthest off
    if (t.length === 2 && g[big] < 0) big = 1 - big;
    var h = Math.abs(g[big]);
    return { i: big, h: h, more: g[big] > 0, big: h > GAP_H, txt: nameOf(big) + ' is doing about ' + hrs(h) + ' a week ' + (g[big] > 0 ? 'more' : 'less') + ' than ' + targetShort(tg) };
  }
  // When the hours look close but the thinking work (noticing, planning, remembering, keeping the peace)
  // sits mostly with one person: 70% or more of it with two people, or 1.5 times an even share with more.
  function invLean() {
    var inv = peopleTotals('home', invH), s = sum(inv), n = inv.length, thr = n === 2 ? 0.7 : Math.max(0.5, 1.5 / n);
    var top = 0; inv.forEach(function (x, i) { if (x > inv[top]) top = i; });
    var nc = noticeCounts(), nt = 0, marks = sum(nc.me); nc.me.forEach(function (x, i) { if (x > nc.me[nt]) nt = i; });
    // who notices first counts only once at least two people have marked their own view
    var byInv = s >= 0.5 && inv[top] / s >= thr, byNotice = nc.who >= 2 && nc.me[nt] >= 3 && nc.me[nt] / marks >= thr;
    var ip = Math.round(inv[top] / s * 100);
    if (byInv) return { i: top, t: 'the noticing and planning sit mostly with ' + who(top) + ' (' + (ip >= 100 ? 'all' : 'about ' + ip + '%') + ' of the thinking and emotional work' +
      (byNotice && nt === top ? ', and as you each marked it, ' + noticeViews(nc) : '') + ')' };
    if (byNotice) return { i: nt, t: 'the noticing sits mostly with ' + who(nt) + ', as you each marked it (' + noticeViews(nc) + ')' };
    return null;
  }
  // How the words are chosen (said on the page too): with two people, the bigger share under 60% is
  // "fairly close", 60% or more "leans one way", 90% or more "nearly all". With three or more, a share
  // of 1.5 times an even share or more "leans one way"; anything less is "fairly even". Against the
  // split you agreed (or half shares), within 10 points of it reads as close.
  // More than about 3 hours a week from the target is said in plain hours, never as "close" or "holding".
  function hoursSentence() {
    var txt = hoursSentence0(), t = totals(state.jobs);
    if (anyBad(state.jobs) || sum(t) <= 0 || waitingFor().length) return txt;
    var tg = target(); if (tg.error) tg = evenTarget();
    var gap = hoursGap(t, tg);
    if (!gap || !gap.big || !/\b(close|holding|fairly even|near)\b/i.test(txt)) return txt;
    var p = pcts(t), lean = invLean();
    return 'This week: ' + state.people.map(function (_, i) { return nameOf(i) + ' ' + Math.round(p[i]) + '%'; }).join(', ') + '. ' + gap.txt + '.' +
      (lean ? ' And ' + lean.t + '.' : '') + ' That’s not a verdict on anyone, just what’s written down. Worth a look together.';
  }
  function hoursSentence0() {
    var t = totals(state.jobs), s = sum(t);
    // a number that can't be counted (negative, not a number, more than a week) holds the read back,
    // so a typo never turns into "100% done by them"
    if (anyBad(state.jobs)) return 'One of the numbers above isn’t counted yet (it’s marked under its row). Fix it to see how the work is split. Nothing is guessed in the meantime.';
    if (s === 0) return anyExample() ? 'Add some hours of your own to see how the work is split. The grey numbers are only an example, so nothing is counted yet.' : 'Add some hours above to see how the work is split.';
    var wait = waitingFor();
    if (wait.length) return waitText(wait);
    var p = pcts(t), n = t.length, even = 100 / n, lean = invLean();
    // the words agree with the balance score: "holding" there never sits beside "leans one way" here
    var bv = balance(), held = !!(bv && bv.value != null && bv.value >= 0.70), bd = bv && bv.value != null ? band(bv.value) : '';
    var shares = state.people.map(function (_, i) { return nameOf(i) + ' ' + Math.round(p[i]) + '%'; }).join(', ');
    var keepOn = ' Keep checking in as things change.';
    var tg = target();
    if (!tg.error && tg.mode !== 'even') {
      var gaps = p.map(function (x, i) { return x - tg.t[i] * 100; }), big = 0;
      gaps.forEach(function (g, i) { if (Math.abs(g) > Math.abs(gaps[big])) big = i; });
      var g = Math.round(Math.abs(gaps[big])), off = nameOf(big) + ' is about ' + g + ' points ' + (gaps[big] > 0 ? 'over' : 'under');
      if (g < 5 || (g < 10 && held)) return lean ? 'Close to ' + targetLabel(tg) + ' in hours (' + shares + '), but ' + lean.t + '. Worth seeing together.' : 'Close to ' + targetLabel(tg) + ' this week: ' + shares + '.' + keepOn;
      if (held) return 'Near ' + targetLabel(tg) + ' this week: ' + shares + '. ' + off + ', and the balance score still reads as holding.' + (lean ? ' But ' + lean.t + '. Worth seeing together.' : keepOn);
      return 'This week the hours sit ' + (bd === 'drifting' ? 'further from ' : 'well away from ') + targetLabel(tg) + ': ' + shares + '. ' + off + ', which reads as ' + (bd || 'drifting') + '. That’s not a verdict on anyone, just what’s written down. Worth talking through together.';
    }
    var top = 0; p.forEach(function (x, i) { if (x > p[top]) top = i; });
    var topPct = Math.round(p[top]);
    var ratio = p[top] / even;
    var allEqual = t.every(function (x) { return Math.abs(x - t[0]) < 1e-9; });
    var but = lean ? ', but ' + lean.t + '. Worth seeing together.' : '';
    if (allEqual) return lean ? 'An even split in hours this week (' + Math.round(even) + '% each)' + but : 'An even split this week: ' + Math.round(even) + '% each.' + keepOn;
    if (n === 2) {
      if (t[1 - top] === 0) return 'Everything listed here this week was done by ' + who(top) + ' (100%). That’s not a verdict on anyone, and it’s worth a calm talk about sharing some of it out.';
      if (topPct >= 90) return 'Nearly all of what’s listed here was done by ' + who(top) + ' (' + topPct + '%). That’s not a verdict on anyone, and it’s worth a calm talk about sharing it out.';
      if (topPct >= 60 && held) return 'This week the hours lean a little one way: about ' + topPct + '% of them were done by ' + who(top) + ', and the balance score still reads as holding.' + (lean ? ' But ' + lean.t + '. Worth seeing together.' : keepOn);
      if (topPct >= 60) return 'This week the hours lean one way: about ' + topPct + '% of them were done by ' + who(top) + '. That’s not a verdict on either of you, just what’s written down. Worth talking through together.';
      return lean ? 'Close in hours this week (' + nameOf(top) + ' ' + topPct + '%, ' + nameOf(1 - top) + ' ' + (100 - topPct) + '%)' + but
        : 'Fairly close this week: ' + nameOf(top) + ' ' + topPct + '%, ' + nameOf(1 - top) + ' ' + (100 - topPct) + '%.' + keepOn;
    }
    var evenTxt = 'An even share for ' + n + ' people would be about ' + Math.round(even) + '% each.';
    if (ratio >= 1.5 && held) return 'This week the hours lean a little one way: about ' + topPct + '% of them were done by ' + who(top) + '. ' + evenTxt + ' The balance score still reads as holding.' + keepOn;
    if (ratio >= 1.5) return 'This week the hours lean one way: about ' + topPct + '% of them were done by ' + who(top) + '. ' + evenTxt + ' That’s not a verdict on anyone, just what’s written down. Worth talking through together.';
    return lean ? 'Fairly even in hours this week (' + shares + ')' + but : 'Fairly even this week: the biggest share, ' + topPct + '%, was done by ' + who(top) + '. ' + evenTxt + keepOn;
  }
  function billTotal(b) { return sum(b.v.map(num)); }
  function billName(b) { return b.name.trim() || 'A cost with no name yet'; }
  function payers(b) { return joinNames(b.v.map(function (x, i) { return num(x) > 0 ? nameOf(i) : ''; }).filter(Boolean)); }
  // The money side, one line each: what each person put in (every kind of cost), what's left when money
  // coming in is listed, then the settle-up for shared bills, then the lists. Shown with line breaks.
  function moneySentence() {
    if (anyBad(state.bills)) return 'One of the amounts above isn’t counted yet (it’s marked under its row). Fix it to see the money side.';
    var real = state.bills.filter(function (b) { return !b.ex && billTotal(b) > 0; });
    function byKind(k) { return real.filter(function (b) { return b.kind === k; }); }
    var shared = byKind('shared'), own = byKind('own'), set = byKind('agreed'), saving = byKind('savings'), inc = byKind('income');
    var costs = real.filter(function (b) { return b.kind !== 'income'; });
    var used = COST_KINDS.filter(function (k) { return byKind(k).length; });
    var out = [], wait = waitingFor('bills');
    // 1. each person's total, family support and savings included
    if (costs.length) {
      out.push('Each person’s total: ' + state.people.map(function (_, i) {
        var tot = sum(costs.map(function (b) { return num(b.v[i]); }));
        var parts = used.map(function (k) { var x = sum(byKind(k).map(function (b) { return num(b.v[i]); })); return x > 0 ? KIND_WORD[k] + ' ' + cash(x) : ''; }).filter(Boolean);
        return nameOf(i) + ' ' + cash(tot) + (used.length > 1 && parts.length ? ' (' + parts.join(', ') + ')' : '');
      }).join('; ') + '.');
    }
    // 2. what's left, only when money coming in is listed (it's never asked for)
    var incT = state.people.map(function (_, i) { return sum(inc.map(function (b) { return num(b.v[i]); })); }), incS = sum(incT);
    if (incS > 0) {
      var left = incS - sum(costs.map(billTotal));
      var inLine = 'Coming in: ' + cash(incS) + (incT.filter(function (x) { return x > 0; }).length > 1 ? ' (' + state.people.map(function (_, i) { return incT[i] > 0 ? nameOf(i) + ' ' + cash(incT[i]) : ''; }).filter(Boolean).join(', ') + ')' : '') + '.';
      if (costs.length) inLine += ' After ' + joinNames(used.map(function (k) { return KIND_WORD[k]; })) + ': ' + (left >= -0.005 ? cash(Math.max(0, left)) + ' left.' : cash(-left) + ' more going out than coming in.');
      out.push(inLine);
    }
    // 3. shared bills: who owes whom, then how it was worked out
    var t = state.people.map(function (_, i) { return sum(shared.map(function (b) { return num(b.v[i]); })); }), s = sum(t);
    if (s > 0 && wait.length) {
      out.push('Shared bills listed so far: ' + cash(s) + '. ' + waitText(wait, 'bills'));
    } else if (s > 0) {
      var tg = target(), fallback = !!tg.error;
      if (fallback) tg = evenTarget();
      var fair = tg.t.map(function (x) { return x * s; });
      var how = tg.mode === 'agreed' ? 'Split by the shares you ' + agreedWord() + ' (' + pctList(tg.t) + '), that’s ' + state.people.map(function (_, i) { return nameOf(i) + ' ' + cash(fair[i]); }).join(', ') + '.'
        : tg.mode === 'part' ? 'With ' + halfNames() + ' counted for the nights they’re here, a fair split is ' + state.people.map(function (_, i) { return nameOf(i) + ' ' + cash(fair[i]); }).join(', ') + '.'
        : 'An even split would be ' + cash(fair[0]) + ' each.';
      var word = tg.mode === 'even' ? 'an even share' : 'their share';
      var parts = t.map(function (x, i) {
        var d = x - fair[i];
        var tail = Math.abs(d) < 0.005 ? 'right on ' + word : (d > 0 ? cash(d) + ' over ' + word : cash(-d) + ' under ' + word);
        return nameOf(i) + ' paid ' + cash(x) + ' (' + tail + ')';
      });
      var settle = settleUp(t, fair);
      out.push(settle ? (tg.mode === 'agreed' ? 'To settle up the shared bills by the split you ' + agreedWord() + ': ' : tg.mode === 'part' ? 'To settle up the shared bills: ' : 'To settle up the shared bills evenly: ') + settle
        : 'The shared bills are already settled: nobody owes anybody.');
      out.push('Shared bills listed: ' + cash(s) + '. ' + how + ' ' + parts.join('; ') + '.' +
        (fallback ? ' (The split you set doesn’t add up to 100% yet, so this uses an even split.)' : '') +
        (tg.mode === 'even' ? ' Even isn’t always the fair answer (incomes and rooms differ), so treat this as a starting point, not a verdict. A split you set, just under the result, is used here too.' : ' Treat it as a starting point, not a verdict.'));
    }
    // 4. the lines that are kept and shown, never owed
    if (own.length) out.push('Each person’s own, not in the settle-up: ' + own.map(function (b) {
      return billName(b) + ' (' + (b.who >= 0 ? nameOf(b.who) + ', ' : '') + cash(billTotal(b)) + ')';
    }).join('; ') + '.');
    if (set.length) out.push('Family support and other agreed amounts, kept on the list but not split or owed: ' + set.map(function (b) {
      return billName(b) + ' (' + cash(billTotal(b)) + (payers(b) ? ', paid by ' + payers(b) : '') + ')';
    }).join('; ') + '.');
    if (saving.length) out.push('Savings, kept and never owed between you: ' + saving.map(function (b) {
      return billName(b) + ' (' + cash(billTotal(b)) + (payers(b) ? ', put in by ' + payers(b) : '') + ')';
    }).join('; ') + '.');
    return out.join('\n');
  }
  // Money with the sign picked on the Money tab ("$", "£", "€" or your own, like "kr" or "CHF").
  function cash(n) { var c = state.cur || '$'; return (/[A-Za-z]$/.test(c) ? c + ' ' : c) + money(n); }
  function joinNames(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  // Who pays whom to reach each person's share (fair[i]): those who paid under their share pay those
  // who paid over, largest first, in whole cents. Same math as the sentence above.
  function settleUp(t, fair) {
    var owe = [], due = [];
    t.forEach(function (x, i) {
      var c = Math.round((x - fair[i]) * 100);
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
  // ever have to move). An even split (or your agreed split, or half shares) scores 1; one person doing it all scores 0.
  function balance() {
    var h = totals(state.jobs), total = sum(h), tg = target();
    if (tg.error) return { error: tg.error };
    var t = tg.t;
    if (total <= 0 || anyBad(state.jobs) || waitingFor().length) return null;
    var s = h.map(function (x) { return x / total; });
    var gaps = s.map(function (x, i) { return x - t[i]; });
    var moved = sum(gaps.map(Math.abs)) / 2, most = 1 - Math.min.apply(null, t);
    return { value: most > 0 ? Math.max(0, Math.min(1, 1 - moved / most)) : 1, shares: s, target: t, gaps: gaps, mode: tg.mode, movedHours: moved * total };
  }
  function band(v) { return v >= 0.70 ? 'holding' : v >= 0.40 ? 'drifting' : 'worth a kind rethink'; }
  function balanceText(b) {
    if (!b) return '';
    if (b.error) return b.error;
    var against = targetLabel({ t: b.target, mode: b.mode });
    // more than about 3 hours a week off: the hours come first, so a "holding" score never hides them
    var gap = hoursGap(totals(state.jobs), { t: b.target, mode: b.mode });
    var reads = gap && gap.big && band(b.value) === 'holding' ? 'the score is in the holding range, but in plain hours ' + gap.txt : 'the setup reads as ' + band(b.value);
    var txt = 'Balance score: ' + b.value.toFixed(2) + ' against ' + against + '. On Chapter II’s scale ' + reads + ' (0.70 or more is holding, 0.40 up to 0.70 is drifting, under 0.40 asks for a kind rethink). It reads the setup, never a person.';
    if (b.value < 0.995 && b.movedHours >= 0.25) txt += ' About ' + hrs(b.movedHours) + ' a week would need to change hands to match.';
    var lean = invLean();
    if (lean) txt += ' The score counts hours only: ' + lean.t + ', and that load is real too.';
    return txt;
  }

  /* ---------- results ---------- */
  function catTotals() {
    return CATS.map(function (c) {
      // a job marked as someone's own family or personal life is shown on its own, never in an area of the split
      var per = state.people.map(function (_, i) { return sum(state.jobs.filter(function (j) { return (CAT[j.cat] ? j.cat : 'other') === c.id && kindOf(j) !== 'personal'; }).map(function (j) { return jobH(j, i); })); });
      return { c: c, per: per };
    });
  }
  // Who notices first, as each person marked it on their own side: me[i] is how many jobs person i marked
  // "I usually notice first"; both is how many jobs more than one person marked; who is how many people marked any.
  function noticeCounts() {
    var c = { me: state.people.map(function () { return 0; }), other: 0, marked: 0, listed: 0, both: 0, who: 0 };
    state.jobs.forEach(function (j) {
      if (j.ex || kindOf(j) !== 'home') return;
      if (!j.name.trim() && !sum(j.v)) return;
      c.listed++;
      var nm = (j.nm || []).slice(0, state.people.length), k = 0;
      if (solo()) nm = [nm[0] || 0];
      nm.forEach(function (x, i) { if (x) { c.me[i]++; k++; } });
      if (solo() && j.nso) { c.other++; k++; }
      if (k) c.marked++;
      if (!solo() && k > 1) c.both++;
    });
    c.who = c.me.filter(function (x) { return x > 0; }).length;
    return c;
  }
  // "Maya marked 6; Jordan hasn't marked yet"
  function noticeViews(c) {
    return state.people.map(function (_, i) { return c.me[i] ? nameOf(i) + ' marked ' + c.me[i] : nameOf(i) + ' hasn’t marked yet'; }).join('; ');
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
  var lastWhole = '';
  function noticeLine(nc) {
    if (!nc.marked) return 'Who notices first? Each person marks their own view under “More” on a job. Unowned work falls to whoever notices first, every time.';
    var marks = sum(nc.me), top = 0; nc.me.forEach(function (x, i) { if (x > nc.me[top]) top = i; });
    return 'Who usually notices first, as each of you sees it: ' + noticeViews(nc) + '.' +
      (nc.both ? ' On ' + nc.both + ' job' + (nc.both === 1 ? '' : 's') + ', more than one of you marked yourself: worth a chat, as you may each be noticing.' : '') +
      (nc.who >= 2 && nc.me[top] >= 3 && nc.me[top] / marks >= 0.6 ? ' Most of the noticing is marked by ' + who(top) + '. Those jobs are good ones to give a single owner, the noticing included (WP-03).' : '') +
      (nc.who < 2 && state.people.length > 1 ? ' One person’s marks are their own view, so it’s worth hearing the other side too.' : '');
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
    nb.textContent = noticeLine(nc);
    var work = peopleTotals('work'), rest = peopleTotals('rest'), pers = peopleTotals('personal'), ctx = [], differ = workDiffers(work);
    // the whole week side by side, for seeing only: it never changes the home split. When paid hours differ,
    // it sits right under the glasses, where the split is read, not far below.
    var whole = sum(work) > 0 && sum(home) > 0 ? 'Home + paid work: ' + state.people.map(function (_, i) { return nameOf(i) + ' ' + hrs(home[i] + work[i]); }).join(', ') + '. This doesn’t change the home split; it shows the whole week.' : '';
    var ww = $('whole-week'), wwOn = !!(whole && differ && !waitingFor().length);
    if (ww) {
      ww.hidden = !wwOn;
      ww.innerHTML = wwOn ? '<p>' + esc(whole) + '</p>' + bar(state.people.map(function (_, i) { return { v: home[i] + work[i], c: COLORS[i] }; })) : '';
    }
    lastWhole = wwOn ? whole : '';
    if (sum(work) > 0) {
      ctx.push('Paid work and school, kept out of the split: ' + state.people.map(function (_, i) { return nameOf(i) + ' ' + hrs(work[i]); }).join(', ') + '.' + (differ && !state.agreed.on ? ' These differ quite a bit, so a split you set together may be fairer than an even one, as Chapter II says.' : ''));
      if (whole && !wwOn) ctx.push(whole);
    }
    if (sum(pers) > 0) ctx.push('Each person’s own family and personal time, counted on its own and not in the split: ' + state.people.map(function (_, i) { return nameOf(i) + ' ' + hrs(pers[i]); }).join(', ') + '.');
    if (sum(rest) > 0) ctx.push('Rest and recharging logged: ' + state.people.map(function (_, i) { return nameOf(i) + ' ' + hrs(rest[i]); }).join(', ') + '.');
    $('r-context').textContent = ctx.join(' ');
    $('r-context').hidden = !ctx.length;
    // a gentle nudge beside "Compare with a split we agreed on", when paid hours differ a lot
    var nudge = $('agreed-nudge');
    if (nudge) {
      nudge.textContent = differ && !state.agreed.on ? 'Paid work hours differ quite a bit this week (' + workers(work).map(function (i) { return nameOf(i) + ' ' + hrs(work[i]); }).join(', ') + '). A split you agree on, like 60/40, may feel fairer than 50/50. Talk it through, then tick the box above if you like.' : '';
      nudge.hidden = !nudge.textContent;
    }
    var ct = $('checked-t');
    if (ct) ct.textContent = checkedLabel();
    var sw = !!suggestSplit(), sk = !!suggestKids();
    if ($('suggest-work')) $('suggest-work').hidden = !sw;
    if ($('suggest-kids')) $('suggest-kids').hidden = !sk;
    if ($('suggest-row')) $('suggest-row').hidden = !sw && !sk;
    // before any split is agreed: a plain word on why the suggestions are there
    var why = $('suggest-why');
    if (why && !state.agreed.on) {
      why.textContent = sk ? 'With children marked, an even share expects as much of a child as of an adult. An adults and kids split may fit better.'
        : sw ? 'Paid work is kept out of the home split. If your paid hours differ, a split that evens out the whole week may feel fairer.' : '';
      why.hidden = !why.textContent;
    }
    renderOffer(); renderIncome();
  }
  // "Ben suggests 71/29. Use it?": a split that came with the other phone's side, never switched on by itself
  function renderOffer() {
    var box = $('agreed-offer'), o = state.agreedOffer; if (!box) return;
    box.hidden = solo() || !o;
    if (box.hidden) return;
    var t = o.p.map(function (x) { return (parseFloat(x) || 0) / 100; });
    $('agreed-offer-t').textContent = (o.by || 'The other phone') + ' suggests ' + splitShort(t) + ' (' + pctList(t) + '). Use it?';
  }
  // Both "Money coming in" lines filled: offer to split shared bills by income (59/41)
  function incomeSplit() {
    if (solo()) return null;
    var inc = state.people.map(function (_, i) { return sum(state.bills.filter(function (b) { return !b.ex && b.kind === 'income'; }).map(function (b) { return num(b.v[i]); })); });
    var adults = state.people.map(function (_, i) { return i; }).filter(function (i) { return !state.kid[i]; });
    if (adults.length < 2 || adults.some(function (i) { return !(inc[i] > 0); })) return null;
    var p = wholePcts(inc);
    var same = state.agreed.on && p.every(function (x, i) { return Math.abs((parseFloat(state.agreed.p[i]) || 0) - x) < 0.05; });
    return { p: p, same: same };
  }
  function renderIncome() {
    var row = $('income-row'), b = $('income-split'); if (!row || !b) return;
    var sg = incomeSplit();
    row.hidden = !sg || sg.same;
    if (sg && !sg.same) b.textContent = 'Split shared bills by income (' + splitShort(sg.p.map(function (x) { return x / 100; })) + ')';
    if (!sg) { var w = $('income-why'); if (w) w.hidden = true; }
  }
  // Whole percentages that add up to 100, from any weights. People with the same weight (two children
  // here the same nights) always get the same share: when whole numbers can't do that, tenths are used.
  function wholePcts(w) {
    var ws = sum(w) || 1, pct = w.map(function (x) { return x / ws * 100; });
    function tryUnit(u) {
      var r = pct.map(function (x) { return Math.floor(x / u + 1e-9); }), left = Math.round(100 / u) - sum(r);
      var groups = [];
      w.forEach(function (x, i) {
        var g = groups.filter(function (gg) { return Math.abs(w[gg.ix[0]] - x) < 1e-9; })[0];
        if (g) g.ix.push(i); else groups.push({ ix: [i], f: pct[i] / u - Math.floor(pct[i] / u + 1e-9) });
      });
      groups.sort(function (a, b) { return b.f - a.f || a.ix.length - b.ix.length; });
      groups.forEach(function (g) { if (left > 0 && g.f > 1e-9 && g.ix.length <= left) { g.ix.forEach(function (i) { r[i]++; }); left -= g.ix.length; } });
      groups.forEach(function (g) { if (left > 0 && g.ix.length <= left) { g.ix.forEach(function (i) { r[i]++; }); left -= g.ix.length; } });
      return { r: r.map(function (x) { return Math.round(x * u * 10) / 10; }), left: left, u: u };
    }
    var a = tryUnit(1); if (!a.left) return a.r;
    var b = tryUnit(0.1);
    // still a few tenths short (rare): the biggest share takes them, so it adds up to 100
    if (b.left) { var top = 0; w.forEach(function (x, i) { if (x > w[top]) top = i; }); b.r[top] = Math.round((b.r[top] + b.left / 10) * 10) / 10; }
    return b.r;
  }
  // "Suggest an adults and kids split": each adult a full share, each child a quarter share, both scaled
  // by the nights they're here. A starting point for ages and what you agree, never a rule.
  var KID_SHARE = 0.25;
  function suggestKids() {
    var k = state.kid.slice(0, state.people.length);
    if (!k.some(Boolean) || k.every(Boolean)) return null;
    return { p: wholePcts(state.people.map(function (_, i) { return (k[i] ? KID_SHARE : 1) * (state.part[i] || 1); })) };
  }
  function kidsWhy(sg) {
    return 'Suggested with each adult as a full share and each child as a quarter share' + (state.part.some(function (x) { return x < 1; }) ? ', less for the nights someone isn’t here' : '') + ': ' + pctList(sg.p.map(function (x) { return x / 100; })) + '. Older children can take on more, so change it to fit their ages and what you agree.';
  }
  // "Suggest a split from paid hours" (two people): the agreed home shares that would make each person's
  // whole week, home plus paid work, about the same. When one person's paid hours alone are more than an
  // even week, they get no home share and it comes as close as it can.
  function suggestSplit() {
    if (state.people.length !== 2 || anyBad(state.jobs)) return null;
    var home = totals(state.jobs), work = peopleTotals('work'), H = sum(home), W = sum(work);
    if (H <= 0 || W <= 0) return null;
    var each = (H + W) / 2, want = work.map(function (w) { return Math.max(0, each - w); }), ws = sum(want);
    if (ws <= 0) return null;
    var r = wholePcts(want);
    var after = r.map(function (x, i) { return x / 100 * H + work[i]; });
    return { p: r, after: after, even: Math.abs(after[0] - after[1]) < 1 };
  }
  function suggestWhy(sg) {
    return 'Suggested so that, with paid work counted, each of you would have about the same week: ' + state.people.map(function (_, i) { return nameOf(i) + ' ' + sg.p[i] + '% of the home jobs, about ' + hrs(sg.after[i]) + ' in all'; }).join(', ') + '.' +
      (sg.even ? '' : ' Paid hours alone are more than half the week here, so this is as close as it gets.') + ' It’s a starting point: change it to what feels fair to you both.';
  }
  // paid hours differ a lot: 10 hours or more apart, and the smaller under two thirds of the bigger.
  // With three or more (often children), only the people who logged some paid work are compared.
  function workers(work) { return work.length === 2 ? [0, 1] : work.map(function (x, i) { return x > 0 ? i : -1; }).filter(function (i) { return i >= 0; }); }
  function workDiffers(work) {
    var w = workers(work).map(function (i) { return work[i]; });
    if (w.length < 2) return false;
    var mx = Math.max.apply(null, w), mn = Math.min.apply(null, w);
    return mx - mn >= 10 && mn <= mx * 0.67;
  }
  // "Have we looked these over together?" (never required, just said in the summary). Either person can
  // tick it, so it speaks for everyone, never for one named person.
  function checkedLabel() { return state.people.length === 2 ? 'We’ve both looked these over' : 'We’ve all looked these over'; }
  function checkedLine() {
    if (state.checked) return state.people.length === 2 ? 'Checked together: we’ve both looked these over.' : 'Checked together: we’ve all looked these over.';
    return 'Not checked together yet, so each person may want to look over their own side.';
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
    var wait = any ? waitingFor() : [];
    var wraps = document.querySelectorAll('#glasses .ls-gwrap');
    wraps.forEach(function (w, i) {
      // while a side is still to come, no percentages: they would read as a verdict
      w.querySelector('.ls-juice').style.height = (any && !wait.length ? Math.max(4, p[i] * 0.92) : 0) + '%';
      w.querySelector('.ls-pct').textContent = any && !wait.length ? Math.round(p[i]) + '%' : '—';
      w.querySelector('.ls-gname').textContent = nameOf(i) + (wait.indexOf(i) >= 0 ? ' · waiting' : any ? ' · ' + r1(t[i]) + 'h' : '');
    });
    var bl = $('balance-line');
    bl.textContent = hoursSentence();
    // a real result is on the page (the "What you got from this" card waits for it)
    if (any && !wait.length) bl.setAttribute('data-ls-result', '1'); else bl.removeAttribute('data-ls-result');
    var ws = $('wait-skip');
    if (ws) {
      var wn = waitNames(wait);
      ws.hidden = !wait.length;
      ws.textContent = wait.length === 1 && wait[0] === state.me ? 'Nothing to add on your side this week? Show the split anyway'
        : (wn.length === wait.length && wn.length ? joinNames(wn) + (wn.length === 1 ? ' has' : ' have') : 'The other side has') + ' nothing to add this week? Show the split anyway';
    }
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
        var s = document.createElement('span'); s.textContent = nameOf(i) + ', share %';
        var inp = document.createElement('input'); inp.type = 'number'; inp.min = '0'; inp.max = '100'; inp.step = '1'; inp.inputMode = 'decimal'; inp.setAttribute('data-fk', 'ag' + i);
        inp.value = state.agreed.p[i];
        inp.addEventListener('input', function () {
          state.agreed.p[i] = inp.value;
          // two people: typing one share fills in the other (40 makes the other 60)
          var v = parseFloat(inp.value), o = box.querySelector('[data-fk="ag' + (1 - i) + '"]');
          if (state.people.length === 2 && inp.value.trim() !== '' && isFinite(v) && v >= 0 && v <= 100) {
            state.agreed.p[1 - i] = String(Math.round((100 - v) * 10) / 10);
            if (o) o.value = state.agreed.p[1 - i];
          }
          recalc();
        });
        l.appendChild(s); l.appendChild(inp); box.appendChild(l);
      });
    });
  }

  function renderAll() {
    normalize();
    renderPeople(); renderAsRow(); renderMeRow(); renderPartRow(); renderRows(); renderGlasses(); renderLibTasks(); renderAgreed(); renderCur();
    $('checked-on').checked = !!state.checked;
    $('example-note').hidden = !anyExample();
    renderOwners();
    recalc();
    // "Just the 3 steps" follows the stand (a cleared or blank stand shows everything again)
    var on = !!state.compact && mode === 'group';
    if (on) document.body.setAttribute('data-ls-compact', ''); else document.body.removeAttribute('data-ls-compact');
    var bs = $('baby-steps'); if (bs) bs.hidden = !on;
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
    var feeds = state.jobs.filter(function (j) { return feedNote(j); });
    if (feeds.length) lines.push('Night feeds: ' + feedNote(feeds[0]) + ', and on top of it on any other nights.');
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
    // only the parts that have something in them: bills alone never start with "0h (0%)"
    var t = totals(state.jobs), p = pcts(t), s = sum(t), ms = moneySentence(), tg = target();
    // every job with time on it is listed, the ones outside the split too, marked as such
    var listed = state.jobs.filter(function (j) { return !j.ex && j.name.trim() && state.people.some(function (_, i) { return jobH(j, i) > 0 || num(j.v[i]) > 0; }); });
    var hasHours = s > 0 || anyBad(state.jobs) || listed.length > 0;
    var lines = [hasHours ? 'Our lemonade stand this week (hours, not a verdict):' : ms ? 'Our shared costs (not a verdict):' : 'Our lemonade stand this week:'];
    if (s > 0) {
      var tgOn = !tg.error && tg.mode !== 'even', wait = anyBad(state.jobs) ? [] : waitingFor();
      // while a side is still to come: hours only, no percentages
      state.people.forEach(function (x, i) {
        lines.push('- ' + nameOf(i) + ': ' + (wait.indexOf(i) >= 0 ? 'side not in yet' : r1(t[i]) + 'h' + (wait.length ? '' : ' (' + Math.round(p[i]) + '%' + (tgOn ? (tg.mode === 'agreed' ? ', ' + agreedWord() + ' ' : ', fair share ') + pctNum(tg.t[i] * 100) + '%' : '') + ')')));
      });
      if (lastWhole) lines.push(lastWhole);
    }
    if (listed.length) {
      lines.push('', 'Jobs (hours a week, thinking part included):');
      listed.forEach(function (j) {
        var k = kindOf(j), fn = feedNote(j);
        var mark = k === 'home' ? '' : k === 'rest' ? ' (rest, not in the split)' : k === 'work' ? ' (paid work or school, not in the split)' : ' (own family or personal, not in the split)';
        lines.push('- ' + j.name.trim() + mark + (fn ? ' (' + fn + ')' : '') + ': ' + state.people.map(function (x, i) {
          return nameOf(i) + ' ' + r1(jobH(j, i)) + 'h' + (j.fq && num(j.v[i]) > 0 ? ' (' + FREQ_LABEL[freqOf(j, i)].toLowerCase() + ')' : '');
        }).join(', '));
      });
    }
    if (s > 0 || anyBad(state.jobs)) {
      lines.push('', hoursSentence());
      var bt = balanceText(balance()); if (bt) lines.push('', bt);
      var tc = topCats(6);
      if (tc.length) { lines.push('', 'By area:'); catTotals().forEach(function (x) { var h = sum(x.per); if (h > 0 && x.c.k === 'home') lines.push('- ' + x.c.n + ': ' + state.people.map(function (_, i) { return nameOf(i) + ' ' + hrs(x.per[i]); }).join(', ')); }); }
      var inv = peopleTotals('home', invH);
      if (sum(inv) > 0) lines.push('', 'Thinking and emotional work (the invisible part): ' + state.people.map(function (_, i) { return nameOf(i) + ' ' + hrs(inv[i]); }).join(', ') + '.');
      var nc = noticeCounts();
      if (nc.marked) lines.push('Who usually notices first, as each person marked it: ' + noticeViews(nc) + '.');
    }
    var feeds = state.jobs.filter(function (j) { return feedNote(j); });
    if (feeds.length) lines.push('', 'Night feeds: ' + feedNote(feeds[0]) + ', and on top of it on any other nights.');
    var ctx = $('r-context') && !$('r-context').hidden ? $('r-context').textContent : '';
    if (ctx) lines.push('', ctx);
    if (ms) lines.push('', ms);
    if (hasHours || ms) lines.push('', checkedLine());
    else lines.push('', 'Nothing is filled in yet.');
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
  // The Money tab: the blocks that only read hours (the glasses, "Add some hours above", nights here) step aside
  function showTab(i) {
    tabs.forEach(function (t, j) { t.setAttribute('aria-selected', String(i === j)); panels[j].hidden = i !== j; });
    panels[i].querySelectorAll('textarea').forEach(autoGrow);
    document.body.setAttribute('data-ls-tab', i ? 'money' : 'hours');
    if (state) { if (i) state.tab = 'money'; else delete state.tab; save(); }
    outlineSync();
  }
  // "Just the 3 steps" for a new baby: the starter pack, your minutes, Send my side
  function setCompact(on) {
    state.compact = !!on && !solo();
    if (state.compact) document.body.setAttribute('data-ls-compact', ''); else document.body.removeAttribute('data-ls-compact');
    var bs = $('baby-steps'); if (bs) bs.hidden = !state.compact;
    if (state.compact) showTab(0);
    outlineSync();
  }
  function setMode(m, announce) {
    mode = m; state.mode = m;
    document.body.setAttribute('data-ls-mode', m);
    $('ls-body').hidden = false;
    document.querySelectorAll('.mode-card').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === m)); });
    if (m === 'solo') showTab(0);
    else if (state.tab === 'money') showTab(1);
    $('copy-result').textContent = m === 'solo' ? 'Copy my summary' : 'Copy the result';
    renderAll();
    setCompact(state.compact);
    var ln = $('last-names'); if (ln) ln.hidden = true;
    outlineSync();
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
    // no draft, but the names from earlier in this tab: the example stand, with those names
    var tabNames = loadNames();
    if (tabNames) { examplePeople(tabNames.people); if (tabNames.mode === 'solo' || tabNames.mode === 'group') state.mode = tabNames.mode; }
  }
  state.jobs = state.jobs || []; state.bills = state.bills || []; state.owners = state.owners || [];
  // a stand saved before examples became grey placeholders: its example numbers were real values,
  // so start from the placeholder example instead of counting them
  if (state.example && !anyExample()) { var ppl = state.people; state = clone(EXAMPLE); state.example = true; state.owners = []; examplePeople(ppl); }
  // the example stand with these names (its rows grow or shrink to fit)
  function examplePeople(ppl) {
    if (!Array.isArray(ppl) || ppl.length < MIN) return;
    state.people = ppl.slice(0, MAX).map(function (p) { return String(p || ''); });
    state.jobs.concat(state.bills).forEach(function (r) { while (r.v.length < state.people.length) r.v.push(0); r.v.length = state.people.length; });
  }
  normalize();
  // Names already known on this device (the household someone chose to keep): an untouched example stand
  // shows them instead of "Me" and "Them", so the owner chips and the rest never fall back to placeholders.
  var hhAuto = false;
  (function () {
    var H = window.TOLHousehold, h = H && H.get ? H.get() : null;
    if (!h || !h.people.length || !state.example || !state.people.every(placeholder) || state.jobs.concat(state.bills).some(function (r) { return !r.ex; })) return;
    h.people.slice(0, MAX).forEach(function (nm, i) { if (i < state.people.length) state.people[i] = nm; else state.people.push(nm); });
    normalize();
    hhAuto = true;
    setTimeout(function () { status('Using the names kept on this device: ' + joinNames(h.people.slice(0, MAX)) + '. Change them above any time.'); }, 0);
  })();
  $('keep-device').checked = keep;
  // the remembered choice, or the stand's own; a stand from before this choice existed was for a group
  mode = loadMode() || (state.mode === 'solo' || state.mode === 'group' ? state.mode : null) || ((saved || (draft && !draft.example)) ? 'group' : null);
  if (mode) setMode(mode, false); else renderAll();

  // After Back or Forward, the browser may put old values back into the boxes. Always redraw the
  // boxes from the stand itself, so what you see and the totals always match.
  window.addEventListener('pageshow', function () { $('keep-device').checked = keep; renderAll(); });
  // switching apps (to copy a code, say) or a reload: the tab's draft is written once more on the way out
  window.addEventListener('pagehide', function () { save(); if (hhWrite) hhWrite.now(false); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') save(); });

  document.querySelectorAll('.mode-card').forEach(function (b) {
    b.addEventListener('click', function () { var m = b.getAttribute('data-mode'); saveMode(m); setMode(m, true); });
  });

  $('clear-draft').addEventListener('click', function () {
    var b = $('clear-draft');
    if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Tap again to clear'; clearTimeout(b.t); b.t = setTimeout(function () { delete b.dataset.armed; b.textContent = 'Clear'; }, 4000); return; }
    delete b.dataset.armed; b.textContent = 'Clear';
    try { sessionStorage.removeItem(DRAFT); sessionStorage.removeItem(NAMES); sessionStorage.removeItem('tol-lemonade-pending'); } catch (e) {}
    if (keep) erase();
    state = clone(EXAMPLE); state.example = true; state.owners = []; state.mode = mode;
    renderAll();
    try { sessionStorage.removeItem(DRAFT); sessionStorage.removeItem(NAMES); } catch (e) {}
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
    // the area you were looking at in the library, if you picked one; otherwise a guess from the name you type
    var cat = libTouched && CAT[libCat] ? libCat : 'other';
    state.jobs.push({ name: '', v: state.people.map(function () { return 0; }), t: state.people.map(function () { return 0; }), cat: cat, freq: 'week', unit: 'm', nm: zeros(), custom: true });
    renderRows(); recalc();
    var r = rowFor(state.jobs[state.jobs.length - 1]); var t = r && r.querySelector('textarea'); if (t) t.focus();
    status('Added a blank job under ' + CAT[cat].n + '. Type its name, then the time, and pick its area if it’s not right.');
  });
  $('add-bill').addEventListener('click', function () {
    state.bills.push({ name: '', v: state.people.map(function () { return 0; }), kind: 'shared', who: -1 });
    renderRows(); recalc();
    var t = moneyEl.querySelectorAll('textarea'); if (t.length) t[t.length - 1].focus();
  });
  $('start-blank').addEventListener('click', function () {
    state = { people: state.people.slice(), jobs: [], bills: [], example: false, owners: [], weeks: state.weeks, agreed: state.agreed, as: state.as, asSet: state.asSet, mode: mode,
      part: state.part, kid: state.kid, me: state.me, cur: state.cur, curSet: state.curSet };
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
  // the suggestions fill in the agreed split, say why, and can be changed like any other agreed split
  function useSuggestion(sg, why) {
    if (!sg) return;
    state.agreed.on = true; state.agreed.p = sg.p.map(String);
    renderAgreed(); recalc();
    var w = $('suggest-why'); if (w) { w.textContent = why; w.hidden = false; }
    status('Filled in a suggested split. Change it to what feels fair to you both.');
  }
  if ($('suggest-work')) $('suggest-work').addEventListener('click', function () { var sg = suggestSplit(); useSuggestion(sg, sg ? suggestWhy(sg) : ''); });
  if ($('suggest-kids')) $('suggest-kids').addEventListener('click', function () { var sg = suggestKids(); useSuggestion(sg, sg ? kidsWhy(sg) : ''); });
  if ($('wait-skip')) $('wait-skip').addEventListener('click', function () {
    state.noWait = true; recalc();
    status('Showing the split with what’s here now.');
    var bl = $('balance-line'); bl.setAttribute('tabindex', '-1'); bl.focus();
  });
  if ($('baby-pack')) $('baby-pack').addEventListener('click', addBabyPack);
  if ($('agreed-offer-use')) $('agreed-offer-use').addEventListener('click', function () {
    var o = state.agreedOffer; if (!o) return;
    state.agreed.on = true; state.agreed.p = o.p.map(String); delete state.agreedOffer;
    renderAgreed(); recalc();
    status('Using ' + splitShort(o.p.map(function (x) { return (parseFloat(x) || 0) / 100; })) + '. Once you’ve both looked it over, tick “We’ve both looked these over”, and it reads as the split you agreed.');
    var a = $('agreed-on'); if (a) a.focus();
  });
  if ($('agreed-offer-no')) $('agreed-offer-no').addEventListener('click', function () {
    delete state.agreedOffer; recalc();
    status('Okay. Nothing changed. You can set a split under “Compare with a split you choose” any time.');
    var a = $('agreed-on'); if (a) a.focus();
  });
  if ($('income-split')) $('income-split').addEventListener('click', function () {
    var sg = incomeSplit(); if (!sg) return;
    state.agreed.on = true; state.agreed.p = sg.p.map(String);
    renderAgreed(); recalc();
    var t = sg.p.map(function (x) { return x / 100; });
    var w = $('income-why');
    if (w) { w.textContent = 'Shared bills are split by what each of you brings in now: ' + pctList(t) + '. The same split is used for the hours under “Hours”; change it under the result any time.'; w.hidden = false; }
    status('Shared bills are split by income now (' + splitShort(t) + ').');
  });
  if ($('baby-steps-on')) $('baby-steps-on').addEventListener('click', function () {
    setCompact(true); save();
    var bs = $('baby-steps'); if (bs) { bs.scrollIntoView({ block: 'start', behavior: 'smooth' }); var h = $('baby-steps-h'); if (h) h.focus({ preventScroll: true }); }
    status('Just the three steps now: the starter pack, your minutes, and Send my side. “Show the full stand” brings the rest back.');
  });
  if ($('baby-steps-off')) $('baby-steps-off').addEventListener('click', function () {
    setCompact(false); save();
    status('The full stand is back.');
    var b = $('baby-steps-on'); if (b && b.offsetParent) b.focus(); else { var r = $('rows'); if (r) r.scrollIntoView({ block: 'start' }); }
  });
  if ($('baby-step-1')) $('baby-step-1').addEventListener('click', function () {
    addBabyPack();
    var me = addAs(), f = rowsEl.querySelector(me >= 0 ? '.row-amts input[data-fk^="' + me + '-"]' : '.row-pick .ls-chip, .row-amts input');
    if (f) { f.scrollIntoView({ block: 'center', behavior: 'smooth' }); f.focus({ preventScroll: true }); }
  });
  if ($('baby-step-3')) $('baby-step-3').addEventListener('click', function () {
    if ($('send-box').hidden) $('send-side').click();
    var sd = $('sides'); if (sd) sd.scrollIntoView({ block: 'start', behavior: 'smooth' });
    var b = $('send-share'); if (b && !$('send-acts').hidden) b.focus({ preventScroll: true });
  });
  if ($('split-nights')) $('split-nights').addEventListener('click', splitNights);
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

  /* ---------- money sign ---------- */
  function renderCur() {
    var sel = $('cur-sel'), oth = $('cur-other'); if (!sel) return;
    var picked = CUR_PICK.indexOf(state.cur) >= 0;
    sel.value = picked ? state.cur : 'other';
    oth.hidden = picked;
    if (!picked && document.activeElement !== oth) oth.value = state.cur;
  }
  $('cur-sel').addEventListener('change', function () {
    var v = $('cur-sel').value, oth = $('cur-other');
    if (v === 'other') {
      oth.hidden = false; oth.focus();
      var t = oth.value.trim(); if (t) { state.cur = t.slice(0, 4); state.curSet = true; relabel(); recalc(); }
      return;
    }
    oth.hidden = true; state.cur = v; state.curSet = true; relabel(); recalc();
    status('Money is shown in ' + v + ' now.');
  });
  $('cur-other').addEventListener('input', function () {
    var t = $('cur-other').value.trim(); if (!t) return;
    state.cur = t.slice(0, 4); state.curSet = true; relabel(); recalc();
  });

  /* ---------- "did the other person agree with these numbers?" (optional, never a gate) ---------- */
  $('checked-on').addEventListener('change', function (e) {
    state.checked = e.target.checked; save();
    status(state.checked ? 'Noted. The copied summary says you looked it over together.' : 'Noted. The summary says it hasn’t been checked together yet.');
  });

  /* ---------- two phones: send my side, add my partner's side ---------- */
  // A short code ("LEMON1:" and a base64 JSON) or a .json file with the names, jobs, times and bills.
  // Never the grey example, never saved weeks. Nothing is uploaded: people pass it between them.
  var SIDE = 'LEMON1:';
  function b64enc(s) {
    try { var b = new TextEncoder().encode(s), bin = ''; for (var i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]); return btoa(bin); }
    catch (e) { return btoa(unescape(encodeURIComponent(s))); }
  }
  function b64dec(s) {
    var bin = atob(String(s || '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/'));
    try { var a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new TextDecoder().decode(a); }
    catch (e) { return decodeURIComponent(escape(bin)); }
  }
  // A link that carries the side after the "#" (never sent to any server, and cleared once it's read):
  // "…/lemonade-stand.html#side=z…" is the side squeezed with deflate where the browser can, "#side=j…" plain.
  function b64url(bytes) { var bin = ''; for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64url(s) { var bin = atob(String(s).replace(/-/g, '+').replace(/_/g, '/')), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function streamBytes(bytes, stream) {
    var out = new Blob([bytes]).stream().pipeThrough(stream);
    return new Response(out).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  function packSide(json) {
    var raw = new TextEncoder().encode(json), plain = 'j' + b64url(raw);
    if (typeof CompressionStream !== 'function') return Promise.resolve(plain);
    try { return streamBytes(raw, new CompressionStream('deflate-raw')).then(function (z) { return 'z' + b64url(z); }, function () { return plain; }); }
    catch (e) { return Promise.resolve(plain); }
  }
  // the side's JSON text from a link (or a message with one in it), or null; a plain LEMON1 code is left to readSide
  function unpackSide(text) {
    var m = /#side=([zj])([A-Za-z0-9_-]+)/.exec(String(text || ''));
    if (!m) return Promise.resolve(null);
    try {
      var bytes = unb64url(m[2]);
      if (m[1] === 'j') return Promise.resolve(new TextDecoder().decode(bytes));
      if (typeof DecompressionStream !== 'function') return Promise.resolve(null);
      return streamBytes(bytes, new DecompressionStream('deflate-raw')).then(function (b) { return new TextDecoder().decode(b); }, function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }
  function sideLink(packed) { return location.origin + '/lemonade-stand.html#side=' + packed; }
  function low(x) { return String(x == null ? '' : x).replace(/\s+/g, ' ').trim().toLowerCase(); }
  function clean(x, n) { return String(x == null ? '' : x).replace(/\s+/g, ' ').trim().slice(0, n || 40); }
  function realJobs() { return state.jobs.filter(function (j) { return !j.ex && (j.name.trim() || state.people.some(function (_, i) { return num(j.v[i]) > 0 || num(j.t[i]) > 0; })); }); }
  function realBills() { return state.bills.filter(function (b) { return !b.ex && (b.name.trim() || billTotal(b) > 0); }); }
  function sideData() {
    var idx = state.people.map(function (_, i) { return i; }).filter(function (i) { return !placeholder(state.people[i]) || hasData(i); });
    if (idx.some(function (i) { return placeholder(state.people[i]); })) return { error: 'Give everyone a name first (tap a name above), so the other phone knows whose times are whose.' };
    if (!idx.length) return { error: 'Type your names first (tap a name above), then send your side.' };
    if (!realJobs().length && !realBills().length) return { error: 'Add a job or a bill first. The grey example is never sent.' };
    function nm(i) { return state.people[i].trim(); }
    function byName(f) { var o = {}, any = false; idx.forEach(function (i) { var v = f(i); if (v) { o[nm(i)] = v; any = true; } }); return any ? o : null; }
    var d = { app: 'lemonade', v: 1, people: idx.map(nm) };
    if (state.me >= 0 && !placeholder(state.people[state.me])) d.by = nm(state.me);
    if (state.curSet || state.cur !== '$') d.cur = state.cur;
    var half = idx.filter(function (i) { return state.part[i] === 0.5; }).map(nm); if (half.length) d.half = half;
    var pn = byName(function (i) { return state.part[i] < 1 && state.part[i] !== 0.5 ? nightsOf(i) : 0; }); if (pn) d.pn = pn;
    var kids = idx.filter(function (i) { return state.kid[i]; }).map(nm); if (kids.length) d.kids = kids;
    if (state.agreed.on) { var ag = byName(function (i) { var v = parseFloat(state.agreed.p[i]); return isFinite(v) && v > 0 ? v : 0; }); if (ag) d.agreed = ag; }
    d.jobs = realJobs().map(function (j) {
      // defaults are left out (the reader fills them back in): each week, minutes, the area the name suggests
      var o = { n: j.name.trim() };
      if (j.cat !== guessCat(o.n)) o.c = j.cat;
      if (j.freq !== 'week') o.f = j.freq;
      // each person's own "how often", where it differs from the job's
      if (j.fq) { var fq = byName(function (i) { return j.fq[i] !== j.freq ? j.fq[i] : ''; }); if (fq) o.fq = fq; }
      if (j.unit !== 'm') o.u = j.unit;
      if (j.inCall) o.ic = 1;
      var v = byName(function (i) { return num(j.v[i]); }), t = byName(function (i) { return num(j.t[i]); });
      if (v) o.v = v; if (t) o.t = t;
      // who notices first, as each person marked it (nf as well, for a phone with an older page)
      var marks = idx.filter(function (i) { return j.nm && j.nm[i]; }).map(nm);
      if (marks.length) { o.nm = marks; if (marks.length === 1) o.nf = marks[0]; }
      if (j.personal) o.p = 1;
      return o;
    });
    d.bills = realBills().map(function (b) {
      var o = { n: b.name.trim() }, v = byName(function (i) { return num(b.v[i]); });
      if (b.kind && b.kind !== 'shared') o.k = b.kind;
      if (v) o.v = v;
      if (b.kind === 'own' && b.who >= 0 && idx.indexOf(b.who) >= 0) o.w = nm(b.who);
      return o;
    });
    var own = ownersList().map(function (o) { var x = { n: o.name }; if (o.who >= 0 && idx.indexOf(o.who) >= 0) x.w = nm(o.who); return x; });
    if (own.length) d.own = own;
    return d;
  }
  function slug(s) { return low(s).replace(/[^a-z0-9À-ɏ]+/g, '-').replace(/^-+|-+$/g, ''); }
  function sideFileName(who) {
    var d = new Date(), day = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    return 'lemonade-stand-' + (slug(who) ? slug(who) + '-side-' : '') + day + '.json';
  }
  // Read a code (any text around it is fine), a .json file, or a household code, into one tidy shape.
  function readSide(text) {
    var s = String(text == null ? '' : text).trim(), raw = null, m;
    if (!s) return null;
    if (s.charAt(0) === '{') { try { raw = JSON.parse(s); } catch (e) { raw = null; } }
    else if ((m = /LEMON1:\s*([A-Za-z0-9+\/=_-]+)/i.exec(s))) { try { raw = JSON.parse(b64dec(m[1])); } catch (e) { raw = null; } }
    if (!raw && HH && HH.fromCode) { var hc = HH.fromCode(s); if (hc) raw = hc; }
    if (!raw || typeof raw !== 'object') return null;
    if (raw.app !== 'lemonade') {
      // a household (names and jobs, never hours): from household.js
      var h = HH && HH.fromCode ? HH.fromCode(JSON.stringify(raw)) : null;
      if (!h) return null;
      // how often comes with the household code now (f); an older code falls back to the library's, or each week
      raw = { app: 'lemonade', by: '', people: h.people, jobs: h.jobs.map(function (j) { var lm = libMatch(j.name); return { n: j.name, f: FREQ[j.f] ? j.f : lm ? lm.t[2] : 'week', fx: !!FREQ[j.f], u: lm && lm.t[3] ? lm.t[3] : 'm' }; }),
        own: h.jobs.filter(function (j) { return j.owner; }).map(function (j) { return { n: j.name, w: j.owner }; }), household: true };
    }
    var people = [];
    (Array.isArray(raw.people) ? raw.people : []).forEach(function (p) {
      p = clean(p); if (p && !placeholder(p) && people.map(low).indexOf(low(p)) < 0 && people.length < MAX) people.push(p);
    });
    function vals(o, cap) {
      var out = {};
      if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { var v = num(o[k]); if (low(k) && v > 0 && v <= cap) out[low(k)] = v; });
      return out;
    }
    function list(a, n) { return (Array.isArray(a) ? a : []).filter(function (x) { return x && typeof x === 'object'; }).slice(0, n); }
    var jobs = list(raw.jobs, 200).map(function (j) {
      var name = clean(j.n, 120), f = FREQ[j.f] ? j.f : 'week', u = j.u === 'h' ? 'h' : 'm';
      var fq = {};
      if (j.fq && typeof j.fq === 'object') Object.keys(j.fq).forEach(function (k) { if (low(k) && FREQ[j.fq[k]]) fq[low(k)] = j.fq[k]; });
      var nmk = (Array.isArray(j.nm) ? j.nm : j.nf ? [j.nf] : []).map(low).filter(Boolean);
      return { n: name, c: CAT[j.c] ? j.c : guessCat(name), f: f, fx: !!j.fx || !!FREQ[j.f], fq: fq, u: u, v: vals(j.v, u === 'h' ? 168 : 168 * 60), t: vals(j.t, 168 * 60), nm: nmk, p: !!j.p, ic: !!j.ic };
    }).filter(function (j) { return j.n || Object.keys(j.v).length; });
    var bills = list(raw.bills, 100).map(function (b) {
      return { n: clean(b.n, 120), k: BILL_KIND[b.k] ? b.k : 'shared', w: low(b.w), v: vals(b.v, 1e9) };
    }).filter(function (b) { return b.n || Object.keys(b.v).length; });
    var own = list(raw.own, MAX_OWN).map(function (o) { return { n: clean(o.n, 60), w: low(o.w) }; }).filter(function (o) { return o.n; });
    if (!people.length && !jobs.length && !bills.length) return null;
    // "Money to my mum" typed on Amara's phone reads "Money to Amara’s mum" here: a "my" in a line's name
    // means the person who typed it (the sender, or else the one person with numbers on that line).
    // The original name is kept (n0), so a line that comes back to the phone it was typed on still matches.
    if (!raw.household) {
      var by = clean(raw.by), sender = '';
      people.forEach(function (p) { if (by && low(p) === low(by)) sender = p; });
      var whose = function (keys) {
        if (sender) return sender;
        var ks = keys.filter(function (k, x) { return keys.indexOf(k) === x; });
        if (ks.length !== 1) return '';
        var hit = ''; people.forEach(function (p) { if (low(p) === ks[0]) hit = p; });
        return hit;
      };
      jobs.forEach(function (j) { var w = whose(Object.keys(j.v).concat(Object.keys(j.t))); if (w) myName(j, w); });
      bills.forEach(function (b) { var w = whose(Object.keys(b.v)); if (w) myName(b, w); });
      own.forEach(function (o) { var w = sender || (o.w ? whose([o.w]) : ''); if (w) myName(o, w); });
    }
    return { by: clean(raw.by), cur: clean(raw.cur, 4), people: people, half: (Array.isArray(raw.half) ? raw.half : []).map(low),
      pn: raw.pn && typeof raw.pn === 'object' ? vals(raw.pn, 13) : null, kids: (Array.isArray(raw.kids) ? raw.kids : []).map(low),
      agreed: raw.agreed && typeof raw.agreed === 'object' ? vals(raw.agreed, 100) : null, jobs: jobs, bills: bills, own: own, household: !!raw.household };
  }
  // "Call my mum" as Amara's line: "Call Amara’s mum". Library tasks keep their names (their columns
  // already say whose time it is, and both phones' times belong on the one line).
  function yourMy(name, who) {
    if (!name || !who || libMatch(name)) return name;
    return name.replace(/(^|[^A-Za-z0-9\u00C0-\u024F'’])my(?![A-Za-z0-9\u00C0-\u024F'’])/gi, function (m, pre) { return pre + who + '’s'; });
  }
  function myName(line, who) { var nn = yourMy(line.n, who); if (nn !== line.n) { line.n0 = line.n; line.n = nn; line.my = who; } }
  // the same line on both phones: the same name, or this phone's own "my" line coming back as "Tom’s"
  function sameLine(localName, incName, meName) {
    var a = low(localName), b = low(incName);
    return !!a && (a === b || (!!meName && low(yourMy(localName, meName)) === b));
  }
  // the incoming time, in this stand's own unit and "how often" (30 min a day there is 3.5 h a week here)
  // (k: the person on the other phone, li: the same person here; each may have their own "how often")
  function convTime(ij, lj, val, think, k, li) {
    var f = FREQ[(ij.fq && ij.fq[k]) || ij.f];
    var wk = think ? val / 60 * f : val * (ij.u === 'm' ? 1 / 60 : 1) * f;
    if (think) return Math.round(wk * 60 / mult(lj, li));
    var x = wk / ((lj.unit === 'm' ? 1 / 60 : 1) * mult(lj, li));
    return lj.unit === 'm' ? Math.round(x) : Math.round(x * 100) / 100;
  }
  function near(a, b) { return Math.abs(a - b) <= Math.max(0.01, Math.abs(a) * 0.005); }
  // What adding the other side would do, before anything changes
  function planSide(d) {
    var map = {}, taken = {}, add = [], skip = [], n = state.people.length;
    d.people.forEach(function (nm) {
      var li = -1;
      state.people.forEach(function (p, i) { if (li < 0 && low(p) === low(nm)) li = i; });
      if (li >= 0) { map[low(nm)] = li; taken[li] = 1; }
    });
    var unmatched = d.people.filter(function (nm) { return map[low(nm)] == null; });
    if (unmatched.length && state.people.some(function (p, i) { return placeholder(p) && hasData(i); }))
      return { error: 'Type the names on this phone first (tap a name above), so ' + joinNames(unmatched) + ' can be matched up. Then try again.' };
    unmatched.forEach(function (nm) {
      var slot = -1;
      state.people.forEach(function (p, i) { if (slot < 0 && !taken[i] && placeholder(p) && !hasData(i)) slot = i; });
      if (slot >= 0) { taken[slot] = 1; map[low(nm)] = slot; add.push({ name: nm, slot: slot }); }
      else if (n < MAX) { map[low(nm)] = n; add.push({ name: nm, slot: n }); n++; }
      else skip.push(nm);
    });
    // who this phone belongs to: "Who's filling in", or with two people, the one who didn't send it
    var meName = state.me >= 0 && !placeholder(state.people[state.me]) ? state.people[state.me].trim() : '';
    if (!meName && d.by && state.people.length === 2) state.people.forEach(function (p) { if (low(p) !== low(d.by) && !placeholder(p) && state.people.some(function (q) { return low(q) === low(d.by); })) meName = p.trim(); });
    // a "my" line typed on this phone, sent back from here: keep its own name
    d.jobs.concat(d.bills, d.own).forEach(function (l) { if (l.n0 && meName && low(l.my) === low(meName)) { l.n = l.n0; delete l.n0; } });
    function unitTxt(j, x, think, li) { return think ? x + ' min thinking' : x + (j.unit === 'h' ? ' h' : ' min') + ' ' + FREQ_SHORT[freqOf(j, li)]; }
    function noTimes(j) { return !j.v.some(function (x) { return num(x) > 0; }) && !j.t.some(function (x) { return num(x) > 0; }); }
    function compare(r, lj, ij, isBill) {
      // a line with no times here yet takes the other phone's "how often" and unit as they are
      var view = lj;
      if (!isBill && noTimes(lj) && !d.household && (ij.f !== lj.freq || ij.u !== lj.unit || Object.keys(ij.fq || {}).length || lj.fq)) {
        r.adopt = true;
        view = { unit: ij.u, freq: ij.f, v: lj.v, t: lj.t, fq: Object.keys(ij.fq || {}).length ? state.people.map(function (p) { return ij.fq[low(p)] || ij.f; }) : null };
      }
      [['v', false], ['t', true]].forEach(function (kk) {
        if (isBill && kk[1]) return;
        var src = ij[kk[0]] || {};
        Object.keys(src).forEach(function (k) {
          var li = map[k]; if (li == null) return;
          var theirs = isBill ? src[k] : convTime(ij, view, src[k], kk[1], k, li);
          var mine = li < state.people.length ? num((kk[1] ? lj.t : lj.v)[li]) : 0;
          if (!theirs) return;
          if (!mine) { r.fill.push({ li: li, k: kk[0], x: theirs }); return; }
          if (near(mine, theirs)) return;
          r.diffs.push({ li: li, k: kk[0], x: theirs, mine: mine,
            txt: (state.people[li] || '').trim() + ': ' + (isBill ? cash(mine) : unitTxt(lj, mine, kk[1], li)) + ' here, ' + (isBill ? cash(theirs) : unitTxt(lj, theirs, kk[1], li)) + ' on ' + fromWord(d) });
        });
      });
      if (r.adopt) r.view = view;
      // a household code has no times, only how often: say so when it differs, never "already the same"
      if (!isBill && d.household && ij.fx && !lj.fq && ij.f !== lj.freq) {
        if (noTimes(lj)) r.freqFill = true;
        else { r.diffs.push({ freq: ij.f, txt: 'How often: ' + FREQ_LABEL[lj.freq].toLowerCase() + ' here, ' + FREQ_LABEL[ij.f].toLowerCase() + ' on ' + fromWord(d) }); r.freqOnly = true; r.choice = 'mine'; }
      }
      r.status = r.diffs.length ? 'conflict' : r.fill.length ? 'fill' : r.freqFill ? 'freq' : 'same';
    }
    var jobs = d.jobs.map(function (ij) {
      var lj = ij.n ? state.jobs.filter(function (j) { return !j.ex && sameLine(j.name, ij.n, meName); })[0] : null;
      var r = { inc: ij, local: lj || null, fill: [], diffs: [], choice: 'both', status: 'new' };
      if (lj) compare(r, lj, ij, false);
      return r;
    });
    var bills = d.bills.map(function (ib) {
      var lb = ib.n ? state.bills.filter(function (b) { return !b.ex && sameLine(b.name, ib.n, meName); })[0] : null;
      var r = { inc: ib, local: lb || null, fill: [], diffs: [], choice: 'both', status: 'new', bill: true };
      if (lb) compare(r, lb, ib, true);
      return r;
    });
    return { d: d, map: map, add: add, skip: skip, jobs: jobs, bills: bills, meName: meName };
  }
  function fromWord(d) { return d.by ? d.by + '’s phone' : 'the other phone'; }
  function zeros() { return state.people.map(function () { return 0; }); }
  function applySide(plan) {
    var d = plan.d, map = plan.map, out = { newJobs: 0, newBills: 0, filled: 0, both: 0, theirs: 0, people: plan.add.map(function (a) { return a.name; }) };
    plan.add.forEach(function (a) { if (a.slot < state.people.length) state.people[a.slot] = a.name; else state.people.push(a.name); });
    normalize();
    // like the task library: real entries make the grey example step aside
    state.jobs = state.jobs.filter(function (j) { return !j.ex; });
    state.bills = state.bills.filter(function (b) { return !b.ex; });
    var tag = ' (from ' + fromWord(d) + ')';
    function newJob(ij, name) {
      var j = { name: name, v: zeros(), t: zeros(), cat: ij.c, freq: ij.f, unit: ij.u, nm: zeros() };
      Object.keys(ij.v).forEach(function (k) { if (map[k] != null) j.v[map[k]] = ij.v[k]; });
      Object.keys(ij.t).forEach(function (k) { if (map[k] != null) j.t[map[k]] = ij.t[k]; });
      if (Object.keys(ij.fq || {}).length) { j.fq = zeros().map(function () { return ij.f; }); Object.keys(ij.fq).forEach(function (k) { if (map[k] != null) j.fq[map[k]] = ij.fq[k]; }); }
      (ij.nm || []).forEach(function (k) { if (map[k] != null) j.nm[map[k]] = 1; });
      if (ij.p) j.personal = true;
      if (ij.ic) j.inCall = true;
      if (!libMatch(name)) { j.custom = true; j.catSet = true; }
      return j;
    }
    function newBill(ib, name) {
      var b = { name: name, v: zeros(), kind: ib.k, who: ib.w && map[ib.w] != null ? map[ib.w] : -1 };
      Object.keys(ib.v).forEach(function (k) { if (map[k] != null) b.v[map[k]] = ib.v[k]; });
      return b;
    }
    function put(row, list) {
      list.forEach(function (f) {
        if (f.freq) { row.freq = f.freq; delete row.fq; return; }
        (f.k === 't' ? row.t : row.v)[f.li] = f.x; if (row.raw) delete row.raw[(f.k === 't' ? 't' : '') + f.li];
      });
    }
    plan.jobs.concat(plan.bills).forEach(function (r) {
      var isBill = !!r.bill, l = r.local;
      if (!l) {
        if (isBill) { state.bills.push(newBill(r.inc, r.inc.n)); out.newBills++; } else { state.jobs.push(newJob(r.inc, r.inc.n)); out.newJobs++; }
        return;
      }
      if (r.adopt && r.view) { l.unit = r.view.unit; l.freq = r.view.freq; if (r.view.fq) l.fq = r.view.fq.slice(0, state.people.length); else delete l.fq; }
      if (r.freqFill) { l.freq = r.inc.f; delete l.fq; out.filled++; }
      if (r.fill.length) { put(l, r.fill); out.filled++; }
      if (!isBill) {
        // each person's own view of who notices first: the sender's from their phone, the others' added
        var snd = d.by && map[low(d.by)] != null ? map[low(d.by)] : -1;
        if (!l.nm) l.nm = zeros();
        if (snd >= 0) l.nm[snd] = (r.inc.nm || []).indexOf(low(d.by)) >= 0 ? 1 : 0;
        (r.inc.nm || []).forEach(function (k) { if (map[k] != null) l.nm[map[k]] = 1; });
      }
      if (!r.diffs.length) return;
      if (r.choice === 'theirs') { put(l, r.diffs); out.theirs++; }
      else if (r.freqOnly) return;
      else if (r.choice === 'both') {
        if (isBill) state.bills.push(newBill(r.inc, r.inc.n + tag)); else state.jobs.push(newJob(r.inc, r.inc.n + tag));
        out.both++;
      }
    });
    // a split from the other phone is offered ("Ben suggests 71/29. Use it?"), never switched on by itself
    if (d.agreed) {
      var ag = state.people.map(function (p) { return d.agreed[low(p)] || 0; });
      var same = state.agreed.on && ag.every(function (x, i) { return Math.abs((parseFloat(state.agreed.p[i]) || 0) - x) < 0.5; });
      if (Math.abs(sum(ag) - 100) <= 0.5 && !same) { state.agreedOffer = { by: d.by || '', p: ag.map(String) }; out.offer = splitShort(ag.map(function (x) { return x / 100; })); }
    }
    plan.add.forEach(function (a) {
      if (d.half.indexOf(low(a.name)) >= 0) state.part[a.slot] = 0.5;
      else if (d.pn && d.pn[low(a.name)] >= 1 && d.pn[low(a.name)] < 14) state.part[a.slot] = d.pn[low(a.name)] / 14;
      if (d.kids.indexOf(low(a.name)) >= 0) state.kid[a.slot] = true;
    });
    if (d.cur && !state.curSet && d.cur !== state.cur) { state.cur = d.cur; out.cur = d.cur; }
    d.own.forEach(function (o) {
      var have = ownersList().filter(function (x) { return sameLine(x.name, o.n, plan.meName); })[0], w = o.w && map[o.w] != null ? map[o.w] : -1;
      if (have) { if (have.who < 0 && w >= 0) have.who = w; }
      else if (state.owners.length < MAX_OWN) state.owners.push({ name: o.n, who: w });
    });
    state.example = false; state.checked = false;
    renderAll();
    var bits = [];
    if (out.people.length) bits.push('added ' + joinNames(out.people) + ' to the stand');
    if (out.newJobs) bits.push(out.newJobs + ' new job' + (out.newJobs === 1 ? '' : 's'));
    if (out.newBills) bits.push(out.newBills + ' new bill' + (out.newBills === 1 ? '' : 's'));
    if (out.filled) bits.push('filled in ' + out.filled + ' line' + (out.filled === 1 ? '' : 's') + ' that were blank here');
    if (out.theirs) bits.push('used their numbers on ' + out.theirs);
    if (out.both) bits.push('kept both on ' + out.both + ' (marked “from ' + fromWord(d) + '”)');
    return (bits.length ? 'Done: ' + bits.join(', ') + '.' : 'Everything from ' + fromWord(d) + ' was already here.') +
      (out.offer ? ' ' + (d.by || 'The other phone') + ' suggests a ' + out.offer + ' split: “Use it?” is just under the result.' : '') + (out.cur ? ' Money is shown in ' + out.cur + ', as on their phone.' : '') +
      (plan.skip.length ? ' There was no room for ' + joinNames(plan.skip) + ' (eight people is the most).' : '') +
      (out.both ? ' Both lines count until you remove one, so talk it through and keep the one that’s right.' : '');
  }

  // the two boxes: send, and add
  var pending = null, PENDING = 'tol-lemonade-pending';
  function dropPending() { try { sessionStorage.removeItem(PENDING); } catch (e) {} }
  // After "Add to my stand": this phone is the person who didn't send it, and the first box they still
  // have to fill in is ready (on the Money tab, when the other side held only bills).
  function afterAdd(plan) {
    var d = plan.d, snd = -1, said = '';
    if (d.household) return '';
    state.people.forEach(function (p, i) { if (d.by && low(p) === low(d.by)) snd = i; });
    if (snd >= 0 && (state.me < 0 || state.me === snd)) {
      var cand = state.people.map(function (_, i) { return i; }).filter(function (i) { return i !== snd && !state.kid[i] && !placeholder(state.people[i]); });
      var mi = -1; state.people.forEach(function (p, i) { if (plan.meName && low(p) === low(plan.meName)) mi = i; });
      var pick = mi >= 0 && mi !== snd ? mi : cand.length === 1 ? cand[0] : -1;
      if (pick >= 0) { state.me = pick; cued = {}; firstSide = -1; said = ' This phone is set to ' + nameOf(pick) + '’s side now.'; renderMeRow(); renderAsRow(); renderSend(); renderRows(); recalc(); }
    }
    var onlyBills = !d.jobs.length && d.bills.length > 0, me = state.me;
    showTab(onlyBills ? 1 : 0);
    var el = null;
    if (me >= 0) {
      if (onlyBills) state.bills.forEach(function (b, i) { if (!el && !b.ex && b.kind !== 'income' && !num(b.v[me])) el = moneyEl.querySelector('input[data-fk="b' + me + '-' + i + '"]'); });
      else state.jobs.forEach(function (j, i) { if (!el && !j.ex && kindOf(j) === 'home' && !num(j.v[me])) el = rowsEl.querySelector('input[data-fk="' + me + '-' + i + '"]'); });
    }
    var spot = el || (onlyBills ? $('tab-money') : null);
    if (spot) {
      setTimeout(function () { spot.scrollIntoView({ block: 'center' }); try { spot.focus({ preventScroll: true }); } catch (e) {} }, 60);
      if (el) said += ' Your first empty box is ready' + (onlyBills ? ' on the Money tab.' : ' below.');
      else if (onlyBills) said += ' Their side was bills only, so the Money tab is open.';
    }
    return said;
  }
  function sideStatus(id, msg) { var el = $(id); if (!el) return; el.textContent = ''; setTimeout(function () { el.textContent = msg; }, 30); }
  function renderSend() {
    var box = $('send-box'); if (!box || box.hidden) return;
    var d = sideData(), code = $('send-code'), acts = $('send-acts'), who = $('send-who');
    who.hidden = state.me >= 0;
    if (!who.hidden) who.textContent = 'Tip: tap your own name under “Who’s filling in on this device?”, so the code and the file carry your name.';
    if (d.error) { code.value = ''; code.hidden = true; acts.hidden = true; $('send-msg').textContent = d.error; return; }
    $('send-msg').textContent = '';
    var json = JSON.stringify(d);
    code.value = SIDE + b64enc(json); code.hidden = false; acts.hidden = false;
    // the link for "Share it", ready before the tap (a phone's share menu wants it at once)
    if (!sendLink || sendLink.json !== json) {
      sendLink = { json: json, url: '', who: d.by || '' };
      packSide(json).then(function (pk) { if (sendLink.json === json) sendLink.url = sideLink(pk); }, function () {});
    }
  }
  var sendLink = { json: '', url: '', who: '' };
  function toggleBox(btn, box, other, otherBtn) {
    var open = box.hidden;
    box.hidden = !open; btn.setAttribute('aria-expanded', String(open));
    if (open) { other.hidden = true; otherBtn.setAttribute('aria-expanded', 'false'); }
    return open;
  }
  $('send-side').addEventListener('click', function () {
    if (toggleBox($('send-side'), $('send-box'), $('add-box'), $('add-side'))) { renderSend(); var c = $('send-share'); if (c && !$('send-acts').hidden) c.focus(); }
  });
  $('add-side').addEventListener('click', function () {
    if (toggleBox($('add-side'), $('add-box'), $('send-box'), $('send-side'))) $('add-code').focus();
  });
  $('send-copy').addEventListener('click', function () {
    renderSend(); var c = $('send-code').value; if (!c) return;
    copyText(c).then(function (ok) {
      sideStatus('send-msg', ok ? 'Copied. Send it to your partner any way you like, then they paste it under “Add my partner’s side”.' : 'Couldn’t copy here. Select the code above by hand.');
      if (!ok) { $('send-code').focus(); $('send-code').select(); }
    });
  });
  $('send-share').addEventListener('click', function () {
    renderSend(); var c = $('send-code').value; if (!c) return;
    // one short line and a link: the side rides after the "#", so it's never uploaded anywhere
    var url = sendLink.url || sideLink('j' + b64url(new TextEncoder().encode(sendLink.json)));
    var line = 'Tap to add ' + (sendLink.who ? sendLink.who + '’s' : 'my') + ' side to your Lemonade Stand';
    if (window.TOLShare) window.TOLShare.share({ title: 'Lemonade Stand', text: line, url: url, result: true });
    else if (navigator.share) navigator.share({ title: 'Lemonade Stand', text: line, url: url }).catch(function () {});
    else copyText(line + '\n' + url).then(function (ok) { sideStatus('send-msg', ok ? 'Sharing isn’t available here, so the link is copied. Paste it into a message.' : 'Couldn’t share here. Open “Other ways” and copy the code.'); });
  });
  $('send-file').addEventListener('click', function () {
    var d = sideData(); if (d.error) { sideStatus('send-msg', d.error); return; }
    if (state.me < 0) { sideStatus('send-msg', 'Tap your own name under “Who’s filling in on this device?” first, so the file has your name on it and never gets mixed up with your partner’s.'); var mr = $('me-row'); if (mr) { mr.scrollIntoView({ block: 'center', behavior: 'smooth' }); var b0 = mr.querySelector('button'); if (b0) b0.focus({ preventScroll: true }); } return; }
    var name = sideFileName(nameOf(state.me));
    try {
      var blob = new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name; a.rel = 'noopener';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      sideStatus('send-msg', 'Saved as ' + name + '. Send the file to your partner; on their phone they tap “Add my partner’s side”, then “Open their file”.');
    } catch (e) { sideStatus('send-msg', 'Couldn’t save a file here. Copy the code instead.'); }
  });
  function review(text, note) {
    // a link (or a message with one) carries the side after "#side=": unpack it first
    if (/#side=[zj]/.test(String(text || ''))) {
      unpackSide(text).then(function (json) {
        if (json) review(json, note);
        else { $('add-review').innerHTML = ''; sideStatus('add-msg', 'That link didn’t open here. Ask for the code instead (under “Other ways” on their phone), and paste it here.'); }
      });
      return;
    }
    var d = readSide(text), box = $('add-review');
    pending = null;
    if (!d) { box.innerHTML = ''; sideStatus('add-msg', 'That doesn’t look like a Lemonade Stand code. Copy the whole thing, starting with LEMON1:, or open the .json file.'); return; }
    var plan = planSide(d);
    if (plan.error) { box.innerHTML = ''; sideStatus('add-msg', plan.error); return; }
    pending = plan;
    // kept in this tab until it's added or set aside, so Back from another page brings the preview back
    try { sessionStorage.setItem(PENDING, String(text)); } catch (e) {}
    $('add-msg').textContent = '';
    var cnt = function (k) { return plan.jobs.concat(plan.bills).filter(function (r) { return r.status === k; }); };
    var news = cnt('new'), fills = cnt('fill'), same = cnt('same'), conf = cnt('conflict'), freqs = cnt('freq');
    var li = [];
    if (plan.add.length) li.push('New at the stand: ' + joinNames(plan.add.map(function (a) { return a.name; })) + '.');
    if (news.length) li.push('New here: ' + news.length + ' (' + news.slice(0, 4).map(function (r) { return r.inc.n || 'a line with no name'; }).join(', ') + (news.length > 4 ? ' and more' : '') + ').');
    if (fills.length) li.push('Fills in what’s blank here on ' + fills.length + ' line' + (fills.length === 1 ? '' : 's') + '.');
    if (freqs.length) li.push('Takes their “how often” on ' + freqs.length + ' line' + (freqs.length === 1 ? '' : 's') + ' with no times here yet (' + freqs.slice(0, 3).map(function (r) { return r.inc.n + ': ' + FREQ_LABEL[r.inc.f].toLowerCase(); }).join(', ') + (freqs.length > 3 ? ' and more' : '') + ').');
    if (same.length) li.push('Already the same here: ' + same.length + '.');
    if (plan.skip.length) li.push('No room for ' + joinNames(plan.skip) + ' (eight people is the most).');
    if (d.household) li.push('This is a household code: names and jobs only, with no times.');
    var html = '<p class="ls-mini-p"><strong>From ' + esc(fromWord(d)) + ':</strong> ' + esc(joinNames(d.people)) + ' · ' + d.jobs.length + ' job' + (d.jobs.length === 1 ? '' : 's') + ', ' + d.bills.length + ' bill' + (d.bills.length === 1 ? '' : 's') + '.</p>' +
      '<ul class="ls-mini-list">' + li.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    if (conf.length) {
      html += '<h3 class="ls-h3">Different numbers on the same line</h3><p class="ls-mini">Nothing is replaced unless you say so. “Keep both” adds their numbers as a second line, marked “from ' + esc(fromWord(d)) + '”, so you can talk it through.</p><ol class="ls-plan-list">' +
        conf.map(function (r, k) {
          var nm = r.inc.n || 'A line with no name';
          return '<li><span class="ls-plan-n">' + esc(nm) + (r.bill ? ' (bill)' : '') + '</span>' + r.diffs.map(function (x) { return '<p class="ls-mini">' + esc(x.txt) + '</p>'; }).join('') +
            '<div class="ls-pick" role="group" aria-label="' + esc(nm) + ': which numbers to keep">' +
            (r.freqOnly ? [['mine', 'Keep mine'], ['theirs', 'Use theirs']] : [['mine', 'Keep mine'], ['theirs', 'Use theirs'], ['both', 'Keep both']]).map(function (c) { return '<button type="button" class="ls-chip" data-cf="' + k + '" data-ch="' + c[0] + '" aria-pressed="' + (r.choice === c[0]) + '">' + c[1] + '</button>'; }).join('') +
            '</div></li>';
        }).join('') + '</ol>';
    }
    html += '<div class="ls-tools"><button type="button" id="add-go">Add to my stand</button><button type="button" id="add-cancel">Not now</button></div>';
    box.innerHTML = html;
    box._conf = conf;
    var go = $('add-go'); if (go && !conf.length) go.focus({ preventScroll: !!note });
    if (note) sideStatus('add-msg', note);
  }
  $('add-check').addEventListener('click', function () { review($('add-code').value); });
  $('add-file').addEventListener('change', function () {
    var f = this.files && this.files[0], inp = this; if (!f) return;
    if (f.size > 1024 * 1024) { sideStatus('add-msg', 'That file is too big to be a Lemonade Stand file.'); inp.value = ''; return; }
    var rd = new FileReader();
    rd.onload = function () { review(String(rd.result || '')); inp.value = ''; };
    rd.onerror = function () { sideStatus('add-msg', 'Couldn’t open that file here. Try pasting the code instead.'); inp.value = ''; };
    rd.readAsText(f);
  });
  $('add-review').addEventListener('click', function (e) {
    var box = $('add-review'), c = e.target.closest('button[data-cf]');
    if (c) {
      var r = box._conf[+c.getAttribute('data-cf')]; if (!r) return;
      r.choice = c.getAttribute('data-ch');
      c.parentNode.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === c)); });
      return;
    }
    if (e.target.id === 'add-cancel') { pending = null; dropPending(); box.innerHTML = ''; sideStatus('add-msg', 'Nothing was added.'); $('add-code').focus(); return; }
    if (e.target.id === 'add-go' && pending) {
      var plan = pending, msg = applySide(plan); pending = null; dropPending();
      box.innerHTML = ''; $('add-code').value = '';
      sideStatus('add-msg', msg + afterAdd(plan));
    }
  });

  // The "Share this tool" button (placed by site.js) says how to bring the other side over
  var SHARE_TOOL_TEXT = 'A free, friendly way to see who does what at home. On two phones? Each of you fills in your own side, then taps “Send my side to my partner” and “Add my partner’s side” to put them together. Nothing is uploaded.';
  function shareHint() {
    document.querySelectorAll('.tol-share-row [data-share]').forEach(function (b) {
      if (!b.hasAttribute('data-share-result')) b.setAttribute('data-share-text', SHARE_TOOL_TEXT);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', shareHint);
  else setTimeout(shareHint, 0);
  window.addEventListener('load', shareHint);

  /* ---------- the household, typed once for the other tools (assets/js/household.js) ---------- */
  var HH = window.TOLHousehold, hhHost = null, hhOffer = null, hhNo = false;
  function hhNamesEmpty() { return state.people.every(function (p) { return !String(p || '').trim() || HH.isPlaceholder(p); }); }
  // The names, and the home jobs with their owner when the fridge list gives one (never the hours)
  function hhCollect() {
    var jobs = [], seen = {};
    // how often goes with each job, so the other phone shows "Each day" where this one has it
    var freqBy = {};
    state.jobs.forEach(function (j) { if (!j.ex && j.name.trim()) freqBy[j.name.trim().toLowerCase()] = j.freq; });
    function add(name, owner) {
      name = String(name || '').trim(); var k = name.toLowerCase();
      if (!name || seen[k]) return;
      seen[k] = jobs.length;
      var j = { name: name }; if (owner) j.owner = owner;
      if (freqBy[k]) j.f = freqBy[k];
      jobs.push(j);
    }
    ownersList().forEach(function (o) { add(o.name, o.who >= 0 && o.who < state.people.length ? nameOf(o.who) : ''); });
    state.jobs.forEach(function (j) { if (!j.ex && kindOf(j) === 'home') add(j.name); });
    return { people: state.people.slice(), jobs: jobs };
  }
  // the household kept on this device, or one pasted from another phone (household.js transfer)
  function hhUse(src) {
    var h = src && src.people ? src : HH.get(); if (!h) return '';
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
        var have = state.jobs.filter(function (j) { return j.name.trim().toLowerCase() === hj.name.toLowerCase(); })[0];
        // already here with no times yet: take the household's "how often"
        if (have) { if (FREQ[hj.f] && !have.fq && !have.v.some(function (x) { return num(x) > 0; })) have.freq = hj.f; return; }
        var m = libMatch(hj.name), zero = function () { var a = []; for (var i = 0; i < n; i++) a.push(0); return a; };
        state.jobs.push({ name: hj.name, v: zero(), t: zero(), cat: guessCat(hj.name), freq: FREQ[hj.f] ? hj.f : m ? m.t[2] : 'week', unit: m && m.t[3] ? m.t[3] : 'm', nm: zeros() });
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
    var h = HH.get();
    // names already swapped in from the household: still offer its jobs, while the stand has none of its own
    var jobsOnly = hhAuto && !!h && h.jobs.length > 0 && !state.jobs.some(function (j) { return !j.ex; });
    var want = !hhNo && !!h && h.people.length > 0 && (hhNamesEmpty() || jobsOnly);
    if (want && !hhOffer) {
      hhOffer = HH.offer({ names: jobsOnly ? [] : h.people, jobs: h.jobs.map(function (j) { return j.name; }), question: jobsOnly ? 'Add the jobs kept from before too?' : 'Use the names from last time?',
        onUse: function () { return hhUse(); }, onNo: function () { hhNo = true; }, focus: function () { return peopleEl.querySelector('input'); } });
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
    // the tick sits right under the names, where they're typed, with one plain line on what it's for
    var hhKeep = HH.remember({ tool: 'lemonade', write: hhWrite, hint: 'Saves retyping your names in the worksheets, the Signal Translator and the Wiring Card.' });
    hhKeep.classList.add('ls-hh-keep');
    var meBox = peopleBox.querySelector('.ls-me');
    peopleBox.insertBefore(hhKeep, meBox || null);
    // "Household names on another phone?": the names and home jobs as a code (household.js)
    if (HH.transfer) {
      peopleBox.appendChild(HH.transfer({ collect: hhCollect, onLoad: function (d) {
        var msg = hhUse(d).replace('from your household', 'from the other phone');
        return msg + (HH.isLinked('lemonade') ? '' : ' To keep them for the other tools too, tick “Use these names in the other tools”.');
      } }));
    }
    hhRefresh();
    hhWrite.baseline();
    HH.onChange(function () { hhKeep.sync(); renderLastNames(); });
  }

  // "Use the names from last time: Tom & Amara": one tap, before "Who is this for?" is picked, when names
  // are kept on this device (only when someone ticked "Use these names in the other tools")
  function ampNames(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' & ' + a[a.length - 1]; }
  function lastNames() { var h = HH && HH.get ? HH.get() : null; return h && h.people.length ? h.people.slice(0, MAX) : []; }
  function renderLastNames() {
    var box = $('last-names'); if (!box) return;
    var names = lastNames();
    box.hidden = !!mode || !names.length;
    if (!box.hidden) $('last-names-btn').textContent = 'Use the names from last time: ' + ampNames(names);
  }
  if ($('last-names-btn')) $('last-names-btn').addEventListener('click', function () {
    var names = lastNames(); if (!names.length) return;
    // names only, in place of "Me", "Them" or an empty name; a name typed already stays
    names.forEach(function (nm) {
      if (state.people.some(function (p) { return low(p) === low(nm); })) return;
      var slot = -1;
      state.people.forEach(function (p, i) { if (slot < 0 && placeholder(p)) slot = i; });
      if (slot >= 0) state.people[slot] = nm;
      else if (state.people.length < MAX) { state.people.push(nm); state.jobs.concat(state.bills).forEach(function (r) { r.v.push(0); if (r.t) r.t.push(0); }); }
    });
    saveMode('group'); setMode('group', false);
    $('mode-msg').textContent = 'Using ' + joinNames(names) + ' from last time. Change the names below any time.';
    var f = peopleEl.querySelector('input'); if (f) f.focus();
  });
  renderLastNames();

  /* ---------- links into the page: #side=… (a partner's side), #add-side, #money, #hours ---------- */
  // scroll there again once the page has settled (fonts, the bar above and late pieces can move it),
  // unless the person has scrolled in the meantime
  function settle(el) {
    var moved = false;
    function mark() { moved = true; }
    ['wheel', 'touchmove', 'keydown'].forEach(function (ev) { window.addEventListener(ev, mark, { once: true, passive: true }); });
    [120, 500, 1200].forEach(function (ms) { setTimeout(function () { if (!moved) el.scrollIntoView({ block: 'start' }); }, ms); });
  }
  function fromHash() {
    var h = location.hash || '';
    if (/^#side=/.test(h) || h === '#add-side') {
      // the side is read once, then cleared from the address bar and this tab's history entry
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
      if (mode !== 'group') { saveMode('group'); setMode('group', false); }
      // the paste box comes first: "Your partner sent you their side? Paste it here"
      var sides = $('sides'), body = $('ls-body');
      if (sides && body && body.firstElementChild !== sides) body.insertBefore(sides, body.firstElementChild);
      $('add-box').hidden = false; $('add-side').setAttribute('aria-expanded', 'true');
      $('send-box').hidden = true; $('send-side').setAttribute('aria-expanded', 'false');
      if (sides) {
        sides.scrollIntoView({ block: 'start' });
        settle(sides);
      }
      if (h === '#add-side') { $('add-code').focus({ preventScroll: true }); return; }
      review(h, 'Your partner’s side is here. Look it over below, then tap “Add to my stand”.');
      return;
    }
    if (h === '#money' || h === '#hours') {
      if (h === '#money' && mode !== 'group') setMode('group', mode === 'solo');
      else if (!mode) setMode('group', false);
      if (h === '#money') setCompact(false);
      if (!solo()) showTab(h === '#money' ? 1 : 0);
      var tab = solo() ? $('panel-hours') : $(h === '#money' ? 'tab-money' : 'tab-hours');
      if (!tab) return;
      var spot = tab.closest('.ls-tabs') || tab;
      if (!solo()) tab.focus({ preventScroll: true });
      spot.scrollIntoView({ block: 'start' });
      // once more after the page settles (fonts and the bar above can move it)
      settle(spot);
    }
  }
  // a partner's side that was being looked over when this tab went elsewhere: its preview comes back
  function restorePending() {
    var t = null; try { t = sessionStorage.getItem(PENDING); } catch (e) {}
    if (!t || pending || /^#side=/.test(location.hash || '')) return;
    if (mode !== 'group') { saveMode('group'); setMode('group', false); }
    var sides = $('sides'), body = $('ls-body');
    if (sides && body && body.firstElementChild !== sides) body.insertBefore(sides, body.firstElementChild);
    $('add-box').hidden = false; $('add-side').setAttribute('aria-expanded', 'true');
    $('send-box').hidden = true; $('send-side').setAttribute('aria-expanded', 'false');
    review(t, 'Your partner’s side is still here, not added yet. Look it over below, then tap “Add to my stand”.');
    if (sides) { sides.scrollIntoView({ block: 'start' }); settle(sides); }
  }
  fromHash();
  restorePending();
  window.addEventListener('hashchange', fromHash);
  window.addEventListener('pageshow', function (e) { if (e.persisted) restorePending(); });

  /* ---------- the "On this page" outline (wide screens, wide-screens.js) ---------- */
  // A section hidden in this mode or tab (like "My week, as a ledger" in "Me and others") leaves the
  // outline, and is never the one marked "you are here".
  var outlineNav;
  function outlineSync() {
    var nav = outlineNav || document.querySelector('nav.tol-outline');
    if (!nav) return;
    if (!outlineNav) {
      outlineNav = nav;
      new MutationObserver(outlineSync).observe(nav, { subtree: true, attributes: true, attributeFilter: ['class'] });
    }
    var shown = [];
    nav.querySelectorAll('a[href^="#"]').forEach(function (a) {
      var t = document.getElementById(a.getAttribute('href').slice(1)), on = !!(t && t.getClientRects().length);
      var li = a.closest('li') || a;
      if (li.hidden !== !on) li.hidden = !on;
      if (on) shown.push({ a: a, t: t });
    });
    var cur = nav.querySelector('a.is-here');
    if (!shown.length || (cur && !cur.closest('li').hidden)) return;
    var y = innerHeight * 0.3, pick = shown[0];
    shown.forEach(function (o) { if (o.t.getBoundingClientRect().top <= y) pick = o; });
    nav.querySelectorAll('a.is-here').forEach(function (a) { a.classList.remove('is-here'); a.removeAttribute('aria-current'); });
    pick.a.classList.add('is-here'); pick.a.setAttribute('aria-current', 'location');
  }
  (function watchOutline() {
    if (document.querySelector('nav.tol-outline')) { outlineSync(); return; }
    var mo = new MutationObserver(function () { if (document.querySelector('nav.tol-outline')) { mo.disconnect(); outlineSync(); } });
    mo.observe(document.body, { childList: true });
    setTimeout(function () { mo.disconnect(); }, 15000);
  })();

  window.TOLLemonade = { recalc: recalc, state: function () { return state; }, mode: function () { return mode; }, setMode: setMode, resultText: resultText, fridgeText: fridgeText, hoursSentence: hoursSentence, moneySentence: moneySentence, balance: balance, saveWeek: saveWeek, library: LIB, categories: CATS,
    sideData: sideData, sideCode: function () { var d = sideData(); return d.error ? '' : SIDE + b64enc(JSON.stringify(d)); }, readSide: readSide,
    sideLink: function () { var d = sideData(); return d.error ? Promise.resolve('') : packSide(JSON.stringify(d)).then(sideLink); } };
})();
