/*
  tol-fullpath-model.js — The Objective Ledger (TOL-OS)
  The Full path package: one road, every workpaper on it, the CALC-01 inputs,
  optional self-notes and a "Ready for your report" page, all in one list of
  fields. That one list drives everything:

    - the fillable package PDF (tol-fullpath-pdf.js),
    - reading a filled package back in (upload),
    - the guided form on the website (typing it in), and
    - the JSON backup.

  All of them make and read the same small data object:

    { format: 'tol-fullpath', version: '1.0', road: 'coworkers', people: 5,
      values: { 'tol.v1.who.p1': 'Sam', 'tol.v1.wp02.p1.q3': '2', ... } }

  Field names are stable and namespaced: tol.v1.<area>.<part>.<question>.
  "v1" is the naming scheme, not the package version; the package version
  travels in the hidden field tol.v1.meta.version. A later scheme (tol.v2.…)
  is mapped back onto these names by MIGRATE, so old packages keep working.

  report(data) turns the data object into a report model (plain text and
  numbers) that the page shows on screen and tol-fullpath-pdf.js prints.

  Everything here is plain computation. Nothing is sent or stored.
*/
(function (global) {
  'use strict';

  var NS = 'tol.v1.';
  var FORMAT = 'tol-fullpath';
  var PKG_VERSION = '1.0';
  var MAX_PEOPLE = 8, MIN_PEOPLE = 2;
  var CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function WPS() { return global.TOL_WORKPAPERS || {}; }
  function schemaFor(code, road) {
    var key = String(code).toLowerCase();
    var v = global.TOL_WORKPAPER_VARIANT ? global.TOL_WORKPAPER_VARIANT(key, road) : null;
    return v || WPS()[key];
  }
  function section(sc, id) { return (sc && sc.sections || []).filter(function (s) { return s.id === id; })[0] || null; }
  // Rounded the same way as CALC-01 everywhere (calc01-core.js), so a number and its band always agree.
  function fmt(n, d) { d = d == null ? 2 : d; var k = Math.pow(10, d); return (Math.round(n * k + 1e-7) / k).toFixed(d); }
  // The one place the CALC-01 arithmetic lives: /assets/js/calc01-core.js (window.TOLCalc01).
  function C1() {
    if (!global.TOLCalc01) throw new Error('calc01-core.js must load before tol-fullpath-model.js');
    return global.TOLCalc01;
  }
  function pct(n) { return Math.round(n * 100) + '%'; }
  function trim(v) { return String(v == null ? '' : v).trim(); }
  function blank(v) { return v == null || v === false || trim(v) === ''; }
  function list(arr) {
    arr = arr.filter(Boolean);
    if (arr.length < 2) return arr.join('');
    return arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function numWord(n) { return ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] || String(n); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }

  /* ------------------------------------------------------------ roads */

  var NAMES = {
    'WP-01': 'Who did what', 'WP-02': 'How full is your battery?', 'WP-03': 'One owner per job',
    'WP-04': 'The monthly look-back', 'WP-09': 'Say it so it lands', 'WP-11': 'The Calm-Down Kit', 'WP-13': 'The 90-second check-in'
  };

  // one: a single person on this road; group2/groupN: everyone, for two or more; work: the shared load;
  // task: one item of it; meeting: where you'd read the report together.
  var ROADS = {
    self: {
      label: 'Individual (just me)', short: 'Just me', solo: true, roles: ['You'],
      one: 'you', many: 'the people around you', group2: 'you', groupN: 'you', setting: 'in your own life',
      meeting: 'a quiet moment on your own', work: 'what you carry', task: 'thing you carry', tasks: 'things you carry',
      wps: ['WP-02', 'WP-11', 'WP-09', 'WP-01'], refusalsOnly: true, calc: false
    },
    partners: {
      label: 'Partners', roles: ['Partner A', 'Partner B'], more: 'Partner', letters: true,
      one: 'partner', many: 'partners', group2: 'the two of you', groupN: 'all of you', setting: 'at home',
      meeting: 'a calm evening check-in', work: 'the jobs at home', task: 'job', tasks: 'jobs',
      wps: ['WP-01', 'WP-03', 'WP-13', 'WP-02', 'WP-09', 'WP-11', 'WP-04'], calc: true
    },
    family: {
      label: 'Family', roles: ['You', 'Family member'], more: 'Family member',
      one: 'family member', many: 'family members', group2: 'the two of you', groupN: 'your family', setting: 'at home',
      meeting: 'a quiet family sit-down (not the holiday table)', work: 'the jobs at home', task: 'job', tasks: 'jobs',
      wps: ['WP-03', 'WP-09', 'WP-02', 'WP-11', 'WP-01', 'WP-04'], calc: true
    },
    coparents: {
      label: 'Co-parents', roles: ['Parent A', 'Parent B'], more: 'Parent', letters: true,
      one: 'co-parent', many: 'co-parents', group2: 'both homes', groupN: 'everyone sharing the parenting', setting: 'between homes',
      meeting: 'the weekly handoff', work: 'the kid tasks', task: 'kid task', tasks: 'kid tasks',
      wps: ['WP-03', 'WP-09', 'WP-04', 'WP-01', 'WP-13', 'WP-02', 'WP-11'], calc: true
    },
    friends: {
      label: 'Friends', roles: ['You', 'Your friend'], more: 'Friend',
      one: 'friend', many: 'friends', group2: 'the two of you', groupN: 'your friends', setting: 'in the friendship',
      meeting: 'a relaxed coffee', work: 'the planning and the give and take', task: 'thing', tasks: 'things',
      wps: ['WP-09', 'WP-01', 'WP-02', 'WP-11'], refusalsOnly: true, calc: false
    },
    roommates: {
      label: 'Roommates', roles: ['You', 'Roommate'], more: 'Roommate',
      one: 'roommate', many: 'roommates', group2: 'the two of you', groupN: 'the whole house', setting: 'in the shared home',
      meeting: 'the house meeting', work: 'the chores and bills', task: 'chore', tasks: 'chores',
      wps: ['WP-03', 'WP-13', 'WP-01', 'WP-04', 'WP-09', 'WP-02', 'WP-11'], calc: true
    },
    coworkers: {
      label: 'Coworkers', roles: ['You', 'Teammate'], more: 'Teammate',
      one: 'teammate', many: 'teammates', group2: 'the two of you', groupN: 'the team', setting: 'on the team',
      meeting: 'the team retrospective', work: 'the recurring team tasks', task: 'team task', tasks: 'team tasks',
      wps: ['WP-03', 'WP-09', 'WP-13', 'WP-04', 'WP-01', 'WP-02', 'WP-11'], calc: true
    },
    caregivers: {
      label: 'Caregivers', roles: ['You', 'Sibling or co-carer'], more: 'Co-carer',
      one: 'co-carer', many: 'co-carers', group2: 'the two of you', groupN: 'everyone sharing the care', setting: 'in the care',
      meeting: 'the handoff check-in', work: 'the parts of the care', task: 'part of the care', tasks: 'parts of the care',
      wps: ['WP-02', 'WP-03', 'WP-11', 'WP-13', 'WP-01', 'WP-09', 'WP-04'], calc: true
    }
  };
  var ROAD_ORDER = ['self', 'partners', 'family', 'coparents', 'friends', 'roommates', 'coworkers', 'caregivers'];

  function road(id) { return ROADS[id] || null; }
  function suitePath(id) {
    var P = global.TOL_SUITE_PATHS;
    return P ? P.paths.filter(function (p) { return p.id === id; })[0] || null : null;
  }
  function clampPeople(roadId, n) {
    if (road(roadId) && road(roadId).solo) return 1;
    n = parseInt(n, 10) || MIN_PEOPLE;
    return Math.max(MIN_PEOPLE, Math.min(MAX_PEOPLE, n));
  }
  // What to call person i on this road when they have no name.
  function roleOf(roadId, i) {
    var r = road(roadId) || ROADS.partners;
    if (r.roles[i]) return r.roles[i];
    return r.letters ? r.more + ' ' + CODES[i] : r.more + ' ' + i;
  }
  // Why each workpaper is on this road, from the Suite's road map.
  function whyOf(roadId, code) {
    var p = suitePath(roadId), hit = null;
    if (p) p.groups.forEach(function (g) { g.stops.forEach(function (s) { if (!hit && s.wp === code) hit = s.why; }); });
    return hit || '';
  }

  /* ------------------------------------------------------------ the field list */

  // f(id, label, type, extra): a field. id is the part after "tol.v1.".
  function f(id, label, type, extra) {
    var o = { id: id, name: NS + id, label: label, type: type || 'text' };
    if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
    return o;
  }
  // Radio options: { v: a safe PDF export value, label, short }.
  function opts(labels, shorts) {
    return labels.map(function (l, i) { return { v: String(l).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') || ('o' + i), label: l, short: shorts ? shorts[i] : l }; });
  }

  var TACTICS = ['Asymmetric breathing (4 in, 6 out)', 'Naming the room (5-4-3)', 'Weight and pressure', 'Gating (lower the lights, step out)', 'Walking it out', 'Low, steady sound'];
  var STATES = opts(['Calm and connected', 'Revved up', 'Running on empty'], ['Calm', 'Revved up', 'Running on empty']);
  var WIRING = [
    { id: 'receive', q: 'How I receive things best', o: [['writing', 'In writing'], ['face', 'Face to face'], ['call', 'A short call'], ['voice', 'A voice note I can replay'], ['one', 'One thing at a time'], ['list', 'A written list']] },
    { id: 'words', q: 'I take words', o: [['literal', 'Literally'], ['tone', 'I read tone as part of the message'], ['both', 'Literally when it matters, tone when it is light']] },
    { id: 'time', q: 'Give me time to answer', o: [['sec', 'A few seconds'], ['min', 'A few minutes'], ['tomorrow', 'Until tomorrow'], ['write', 'Write it down so I can answer later']] },
    { id: 'quiet', q: 'If I go quiet, it means', o: [['think', 'I’m thinking'], ['load', 'I’m overloaded'], ['space', 'I need space'], ['upset', 'I’m upset and don’t have words yet'], ['fine', 'Nothing is wrong']] },
    { id: 'texts', q: 'Short texts from me mean', o: [['brief', 'Nothing. I’m just brief'], ['wrong', 'Something is wrong'], ['minute', 'I need a minute'], ['done', 'I’m done for now, not done with you']] },
    { id: 'upset', q: 'When I’m upset, I need', o: [['space', 'Space first, then a return time'], ['company', 'Quiet company'], ['talk', 'To talk it through'], ['plan', 'A written plan'], ['signal', 'A signal that we are still okay']] },
    { id: 'avoid', q: 'Please avoid', o: [['sarcasm', 'Sarcasm when it matters'], ['calm', '“Calm down”'], ['loud', 'Loud voices'], ['long', 'Long texts or many topics at once'], ['hints', 'Hints instead of the ask'], ['always', 'Always, never, and labels'], ['public', 'Correcting me in public'], ['surprise', 'A hard topic with no warning']] },
    { id: 'ask', q: 'A request lands best as', o: [['could', '“Could you ___ by ___?”'], ['list', 'One written list, not a stack of hints'], ['headline', 'The ask in the first sentence'], ['choice', 'Two clear options, not an open guess']] },
    { id: 'depleted', q: 'When I’m running low, what helps', o: [['shorter', 'Shorter messages'], ['writing', 'Writing only'], ['volume', 'Lower volume and fewer people'], ['notopic', 'Don’t add a second topic'], ['return', 'Name a return time, then give space']] }
  ];
  var WEATHER_WEEKS = 4;

  // A person's display name at build time: the name given, or the road's word for them.
  function labelsFor(roadId, n, names) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(trim(names && names[i]) || roleOf(roadId, i));
    return out;
  }

  function pageWho(ctx) {
    var R = ctx.road, fields = [];
    for (var i = 0; i < ctx.n; i++) {
      fields.push(f('who.p' + (i + 1), R.solo ? 'Your name or initials' : roleOf(ctx.roadId, i) + ': name or initials', 'text', { def: trim(ctx.names[i]), half: true, max: 40 }));
    }
    var more = [f('who.started', 'Date you started', 'date', { half: true })];
    if (R.solo) {
      more.push(f('who.context', 'What would you most like to understand about yourself?', 'textarea', { optional: true }));
      more.push(f('who.others', 'Who would you like to explain yourself to? (Optional: a partner, a friend, your team. First names or roles.)', 'text', { optional: true }));
    } else {
      more.push(f('who.context', 'In a few words, what brings you here?', 'textarea', { optional: true }));
    }
    return {
      id: 'who', title: R.solo ? 'Who this is for' : 'Who’s on this road', short: R.solo ? 'Just me' : 'Who’s on this road',
      intro: R.solo ? 'Just you. Everything in this package is about you, written by you.'
        : 'Up to eight people. First names or initials are plenty. These are the names to use in the "who" boxes on every page: a name, an initial, or "Everyone".',
      blocks: [{ kind: 'fields', fields: fields }, { kind: 'fields', fields: more }]
    };
  }

  function pageWp01(ctx) {
    var sc = schemaFor('WP-01'), blocks = [], i;
    if (!ctx.road.refusalsOnly) {
      blocks.push({ kind: 'fields', fields: [f('wp01.weekOf', 'Week beginning', 'date', { half: true })] });
      var audit = section(sc, 'audit'), rows = [];
      var how = opts(['Asked for', 'Noticed and handled'], ['Asked', 'Noticed']);
      for (i = 0; i < 10; i++) {
        var p = 'wp01.audit.r' + (i + 1) + '.';
        rows.push({ fields: [
          f(p + 'day', 'Day', 'text', { def: DAYS[i] || '', prefill: true, w: 0.7 }),
          f(p + 'task', 'Task noticed or done', 'text', { w: 2.6 }),
          f(p + 'who', 'Who did it', 'person', { both: true, w: 1.3 }),
          f(p + 'minutes', 'Minutes', 'number', { w: 0.8, min: 0 }),
          f(p + 'how', 'Asked for, or noticed?', 'radio', { options: how, w: 1.7 })
        ] });
      }
      blocks.push({ kind: 'grid', title: 'Part A: Who did what, this week', intro: audit.intro + ' In "Who did it", write a name, an initial, or "Everyone".', rows: rows });
      blocks.push({ kind: 'derived', title: 'Worked out for you', lines: ['Minutes and share for each person, how much was noticed and handled without being asked, and the workload balance score (1 = an even split). This becomes the balance input to CALC-01.'] });
    }
    var kinds = opts(['Capacity check', 'Delegation pivot', 'Time commitment'], ['Capacity', 'Delegation', 'Time']);
    var cards = [];
    for (i = 0; i < (ctx.road.refusalsOnly ? 3 : 2); i++) {
      var q = 'wp01.refusals.r' + (i + 1) + '.';
      cards.push({ label: 'Kind no ' + (i + 1), fields: [
        f(q + 'kind', 'Type', 'radio', { options: kinds }),
        f(q + 'ack', 'Say why the request is fair', 'textarea', { small: true }),
        f(q + 'cap', 'Say honestly what you have left', 'textarea', { small: true }),
        f(q + 'alt', 'Offer something instead', 'textarea', { small: true })
      ] });
    }
    blocks.push({ kind: 'cards', title: ctx.road.refusalsOnly ? 'Kind ways to say no' : 'Part B: Neutral refusals (optional)', intro: section(sc, 'refusals').intro, rows: cards });
    return { id: 'wp01', code: 'WP-01', title: sc.title, blocks: blocks };
  }

  function pageWp02(ctx) {
    var sc = schemaFor('WP-02'), items = section(sc, 'factors').items, blocks = [];
    var scale = opts(['0', '1', '2', '3', '4']);
    var privateRoad = ctx.roadId === 'coworkers' || ctx.roadId === 'roommates';
    blocks.push({ kind: 'note', text: 'Each person fills in their own, about themselves only, based on the last 24 to 48 hours. 0 = not at all, 4 = very true. It is a gut-check, not a clinical test.' +
      (ctx.n > 1 ? ' If you’d rather keep your answers private, write just your score in the last box instead (it is the five numbers added up, divided by 20).' : '') +
      (privateRoad ? ' On this road, battery pages stay private unless you choose to share.' : '') });
    for (var i = 0; i < ctx.n; i++) {
      var p = 'wp02.p' + (i + 1) + '.';
      var fl = [f(p + 'date', 'Date', 'date', { half: true })];
      items.forEach(function (it, k) { fl.push(f(p + 'q' + (k + 1), it.label, 'radio', { options: scale, scale: true })); });
      if (ctx.n > 1) fl.push(f(p + 'score', 'Or just your score (0 to 1), if you’d rather not share the five answers', 'number', { min: 0, max: 1, optional: true }));
      fl.push(f(p + 'note', 'Anything you want to name before talking (optional)', 'textarea', { small: true, optional: true }));
      blocks.push({ kind: 'scale', title: ctx.labels[i] + (ctx.n > 1 ? '’s battery' : ''), person: i, fields: fl });
    }
    blocks.push({ kind: 'derived', title: 'Worked out for you', lines: ['Each battery score = the five numbers added up, divided by 20. Under 0.30 is a low load, 0.30 to 0.59 is medium, 0.60 and up is high.', ctx.n > 1 ? 'The average across everyone becomes the stress input to CALC-01. It waits until everyone\u2019s battery is in; it is never worked out for someone else.' : 'On this road it is your own reading, week by week.'] });
    return { id: 'wp02', code: 'WP-02', title: sc.title, blocks: blocks };
  }

  function pageWp03(ctx) {
    var sc = schemaFor('WP-03', ctx.roadId), treaty = section(sc, 'treaty'), blocks = [];
    var ci = treaty.columns.some(function (c) { return c.id === 'c'; });
    var freqs = treaty.columns.filter(function (c) { return c.id === 'freq'; })[0].options;
    var note = sc.sections.filter(function (s) { return s.type === 'note' && s.pdf === false; })[0];
    if (note) blocks.push({ kind: 'note', text: note.text });
    blocks.push({ kind: 'fields', fields: [f('wp03.reviewDate', ctx.roadId === 'coworkers' ? 'Agreement date' : 'Treaty date', 'date', { half: true })] });
    var defs = treaty.defaultRows || [], rows = [];
    for (var i = 0; i < defs.length + 4; i++) {
      var d = defs[i] || {}, p = 'wp03.treaty.r' + (i + 1) + '.';
      var fl = [
        f(p + 'task', 'Task', 'text', { def: d.task || '', w: 2.2 }),
        f(p + 'freq', 'How often', 'text', { def: d.freq || '', w: 1, hint: freqs.join(', ') }),
        f(p + 'r', 'Responsible (does it)', 'person', { w: 1.1 }),
        f(p + 'a', 'Accountable (follows up)', 'person', { w: 1.1 })
      ];
      if (ci) { fl.push(f(p + 'c', 'Consulted', 'text', { w: 1 })); fl.push(f(p + 'i', 'Informed', 'text', { w: 1 })); }
      fl.push(f(p + 'notes', 'Notes', 'text', { def: d.notes || '', w: ci ? 1.1 : 1.8 }));
      rows.push({ fields: fl });
    }
    blocks.push({ kind: 'grid', title: treaty.title, intro: (treaty.intro ? treaty.intro + ' ' : '') + 'Clear the task box on any row that doesn’t apply. How often: ' + freqs.join(', ') + '. For owners, write a name or an initial.', rows: rows });
    blocks.push({ kind: 'derived', title: 'Worked out for you', lines: ['Ownership clarity = the share of tasks that have both a Responsible and an Accountable name. This becomes the ownership input to CALC-01. Tasks still missing an owner are listed in your report.'] });
    var amend = [];
    for (i = 0; i < 2; i++) {
      var q = 'wp03.amend.r' + (i + 1) + '.';
      amend.push({ label: 'Change ' + (i + 1), fields: [f(q + 'date', 'Date', 'date', { half: true }), f(q + 'initials', 'Initials', 'text', { half: true }), f(q + 'change', 'What changed', 'textarea', { small: true })] });
    }
    blocks.push({ kind: 'cards', title: 'Changes to the agreement (optional)', intro: section(sc, 'amendments').intro, rows: amend });
    blocks.push(personSignoff(ctx, 'wp03.ratify', 'Signing off', [['initials', 'Initials', 'text'], ['date', 'Date', 'date']]));
    return { id: 'wp03', code: 'WP-03', title: sc.title, blocks: blocks };
  }

  function personSignoff(ctx, base, title, cols) {
    var rows = [];
    for (var i = 0; i < ctx.n; i++) {
      rows.push({ label: ctx.labels[i], fields: cols.map(function (c) { return f(base + '.p' + (i + 1) + '.' + c[0], c[1], c[2], { w: c[3] || 1.3 }); }) });
    }
    return { kind: 'grid', title: title, rows: rows, rowLabels: true, optional: true };
  }

  function pageWp04(ctx) {
    var sc = schemaFor('WP-04'), blocks = [], i;
    blocks.push({ kind: 'fields', fields: [f('wp04.month', 'Month', 'text', { half: true, placeholder: 'e.g. September 2026' })] });
    var raw = [];
    for (i = 0; i < 8; i++) {
      var p = 'wp04.raw.r' + (i + 1) + '.';
      raw.push({ fields: [f(p + 'task', 'Task that slipped', 'text', { w: 3.4 }), f(p + 'w1', 'Week 1', 'check', { w: 0.7 }), f(p + 'w2', 'Week 2', 'check', { w: 0.7 }), f(p + 'w3', 'Week 3', 'check', { w: 0.7 }), f(p + 'w4', 'Week 4', 'check', { w: 0.7 })] });
    }
    blocks.push({ kind: 'grid', title: section(sc, 'raw').title, intro: section(sc, 'raw').intro, rows: raw });
    var owner = opts(['Yes', 'No']), kind = opts(['Structural gap', 'Capacity issue', 'One-off, no action'], ['Structural', 'Capacity', 'One-off']);
    var cl = [];
    for (i = 0; i < 6; i++) {
      var q = 'wp04.classify.r' + (i + 1) + '.';
      cl.push({ fields: [f(q + 'task', 'Task', 'text', { w: 1.8 }), f(q + 'owner', 'Named owner?', 'radio', { options: owner, w: 1.1 }), f(q + 'kind', 'What kind of gap', 'radio', { options: kind, w: 2.4 }), f(q + 'action', 'Action', 'text', { w: 1.7 })] });
    }
    blocks.push({ kind: 'grid', title: section(sc, 'classify').title, intro: section(sc, 'classify').intro, rows: cl });
    blocks.push({ kind: 'derived', title: 'Worked out for you', lines: ['Times each task was flagged (3 or 4 weeks is a real pattern, not a fluke), and the count of structural gaps, capacity issues and one-offs.'] });
    blocks.push(personSignoff(ctx, 'wp04.signoff', 'Sign-off', [['initials', 'Initials', 'text'], ['date', 'Date', 'date']]));
    return { id: 'wp04', code: 'WP-04', title: sc.title, blocks: blocks };
  }

  function pageWp09(ctx) {
    var sc = schemaFor('WP-09'), blocks = [];
    var head = [f('wp09.date', 'Date', 'date', { half: true })];
    if (!ctx.road.solo) head.unshift(f('wp09.who', 'Whose message is this? (name or initial)', 'person', { half: true }));
    blocks.push({ kind: 'fields', fields: head });
    blocks.push({ kind: 'fields', title: 'Before you speak or send', intro: 'Use it on one thing that actually stung.', fields: [
      f('wp09.raw', 'Raw reaction (optional, just for you)', 'textarea', { small: true, optional: true, privateText: true }),
      f('wp09.rawInclude', 'Include the raw reaction in my report', 'check', { optional: true }),
      f('wp09.fact', 'What’s the fact underneath this? (One sentence, no adjectives.)', 'textarea', { small: true }),
      f('wp09.feeling', 'What’s the feeling underneath this? (Frustrated, tired, unseen, rushed…)', 'textarea', { small: true }),
      f('wp09.ask', 'What’s the actual ask? (What do you want to happen next, specifically?)', 'textarea', { small: true })
    ] });
    var filt = section(sc, 'filter');
    blocks.push({ kind: 'fields', title: filt.title, fields: filt.items.map(function (it) { return f('wp09.filter.' + it.id, it.label, 'radio', { options: opts(it.options) }); }) });
    blocks.push({ kind: 'derived', title: 'Worked out for you', lines: ['Your message in order (fact, feeling, ask), and whether the four checks suggest you’re clear to respond or better off pausing first.'] });
    return { id: 'wp09', code: 'WP-09', title: sc.title, blocks: blocks };
  }

  function pageWp11(ctx) {
    var sc = schemaFor('WP-11'), blocks = [], i;
    blocks.push({ kind: 'note', text: 'Each person’s kit is about themselves. Fill in Part A on an ordinary day, not a hard one. Nothing here works by cold, pain or shock, and none of it is treatment.' });
    blocks.push({ kind: 'fields', fields: [f('wp11.date', 'Date', 'date', { half: true })] });
    var tr = [];
    for (i = 0; i < 3; i++) tr.push({ fields: [f('wp11.triggers.r' + (i + 1) + '.trigger', 'What tends to start it', 'text', { w: 2.5 }), f('wp11.triggers.r' + (i + 1) + '.body', 'Where my body feels it first', 'text', { w: 2.5 })] });
    blocks.push({ kind: 'grid', title: section(sc, 'triggers').title, intro: section(sc, 'triggers').intro, rows: tr });
    var tac = opts(TACTICS, ['Breathing 4 in, 6 out', 'Naming the room', 'Weight and pressure', 'Gating', 'Walking it out', 'Low, steady sound']);
    blocks.push({ kind: 'fields', title: 'Part A: My two defaults', intro: 'Pick two now, so you don’t have to choose in the moment.', fields: [f('wp11.first', 'First default', 'radio', { options: tac, stack: true }), f('wp11.second', 'Second, if the first isn’t available', 'radio', { options: tac, stack: true })] });
    var lines = [];
    for (i = 0; i < ctx.n; i++) lines.push({ label: ctx.labels[i], fields: [f('wp11.lines.p' + (i + 1) + '.line', 'Pause line', 'textarea', { small: true })] });
    blocks.push({ kind: 'cards', title: 'Part A: ' + (ctx.n > 1 ? 'Pause lines' : 'My pause line'), intro: section(sc, 'lines').intro, rows: lines });
    var re = [];
    for (i = 0; i < 3; i++) {
      var p = 'wp11.reentry.r' + (i + 1) + '.';
      re.push({ fields: [f(p + 'time', 'Time', 'text', { w: 1 }), f(p + 'tactic', 'What I did (1 to 6 from the list, or its name)', 'text', { w: 2.6 }), f(p + 'before', 'Battery before (0 to 1)', 'number', { min: 0, max: 1, w: 1.1 }), f(p + 'after', 'Battery after (0 to 1)', 'number', { min: 0, max: 1, w: 1.1 })] });
    }
    blocks.push({ kind: 'grid', title: 'Part C: Coming back', intro: 'Take WP-02 before and after. Under 0.50, go back in. Between 0.50 and 0.60, do a second round. Still 0.60 or above after two rounds? Put it off to a named time. The list: 1 breathing, 2 naming the room, 3 weight and pressure, 4 gating, 5 walking it out, 6 low, steady sound.', rows: re });
    blocks.push({ kind: 'fields', fields: [f('wp11.nextAction', 'Next small action', 'text'), f('wp11.resume', 'If you put the conversation off: when you’ll pick it back up', 'text')] });
    blocks.push(personSignoff(ctx, 'wp11.signoff', 'Defaults set', [['chosen', 'Defaults chosen', 'check'], ['agreed', 'Pause line agreed', 'check'], ['date', 'Date', 'date']]));
    return { id: 'wp11', code: 'WP-11', title: sc.title, blocks: blocks };
  }

  function pageWp13(ctx) {
    var sc = schemaFor('WP-13'), blocks = [], rows = [], k = 0;
    var load = opts(['Low', 'Medium', 'High'], ['Low', 'Med', 'High']);
    blocks.push({ kind: 'fields', fields: [f('wp13.weekOf', 'Week beginning', 'date', { half: true })] });
    DAYS.forEach(function (d) {
      for (var i = 0; i < ctx.n; i++) {
        k++;
        var p = 'wp13.daily.r' + k + '.';
        rows.push({ fields: [
          f(p + 'day', 'Day', 'text', { def: d, prefill: true, w: 0.55 }),
          f(p + 'who', 'Person', 'person', { def: ctx.labels[i], prefill: true, w: 1 }),
          f(p + 'load', 'Load', 'radio', { options: load, w: 2 }),
          f(p + 'thanks', 'One thing I appreciated', 'text', { w: 1.7 }),
          f(p + 'friction', 'One small thing that didn’t feel great', 'text', { w: 1.5 }),
          f(p + 'ask', 'One thing that would help tomorrow', 'text', { w: 1.5 })
        ] });
      }
    });
    var intro = section(sc, 'daily').intro;
    if (ctx.roadId === 'coworkers') intro = 'Run it like a short stand-up. ' + intro.replace('about the other person', 'about a teammate');
    blocks.push({ kind: 'grid', title: ctx.roadId === 'coworkers' ? 'The daily stand-up' : section(sc, 'daily').title, intro: intro, rows: rows, small: true });
    var to = opts(['RACI Treaty (WP-03)', 'Tone Filter (WP-09)', 'Keep watching'], ['Owners', 'Tone', 'Watch']), rs = [];
    for (var j = 0; j < 3; j++) {
      var q = 'wp13.resync.r' + (j + 1) + '.';
      rs.push({ fields: [f(q + 'item', 'Sore spot that keeps coming up', 'text', { w: 3 }), f(q + 'times', 'Times', 'number', { min: 0, w: 0.7 }), f(q + 'to', 'Move to', 'radio', { options: to, w: 2.2 })] });
    }
    blocks.push({ kind: 'grid', title: section(sc, 'resync').title + ' (optional)', intro: section(sc, 'resync').intro, rows: rs });
    blocks.push(personSignoff(ctx, 'wp13.signoff', 'Sign-off', [['committed', 'Committed to the daily loop', 'check'], ['date', 'Date', 'date']]));
    return { id: 'wp13', code: 'WP-13', title: sc.title, blocks: blocks };
  }

  function pageCalc(ctx) {
    var R = ctx.road, blocks = [];
    blocks.push({ kind: 'note', text: R.calc
      ? 'CALC-01 reads one narrow thing: whether the way ' + (ctx.n > 2 ? R.groupN : R.group2) + ' share ' + R.work + ' right now can keep going. It reads the setup, never a person. Most of it is worked out for you from the pages before this one.'
      : 'CALC-01 reads how a workload is shared between people, so on this road the full read isn’t worked out. Two parts still fit: checking your state before you read anything, and counting how often you retuned a message before you answered.' });
    blocks.push({ kind: 'fields', title: 'Step zero: check your state', intro: 'Pick the one closest to true as you fill this in. It doesn’t change any number. It changes whether today is the day to act on them.', fields: [f('calc.state', 'Right now I’m', 'radio', { options: STATES, stack: true })] });
    if (R.calc) {
      blocks.push({ kind: 'derived', title: 'Worked out for you when you bring this back', lines: [
        'Workload balance (WB), from WP-01: how close the logged minutes come to an even split. 1 = even. With two people it is 1 minus the gap between the two shares; with more, 1 minus the share of time that would have to change hands, out of the most it could be.',
        'Ownership clarity (OC), from WP-03: tasks with both a Responsible and an Accountable name, divided by all tasks.',
        'Stress (AS), from WP-02: the average battery score across everyone. It waits until every person\u2019s battery is in.',
        'Solvency = WB × 0.40 + OC × 0.35 + (1 − AS) × 0.25. 0.70 and up: carrying its own weight. 0.40 to 0.69: something is drifting. Under 0.40: can’t last as it is.',
        'Apex = WB × 0.35 + OC × 0.30 + (1 − AS) × 0.20 + RF × 0.15, where RF = retunes ÷ friction moments (below).'
      ] });
      blocks.push({ kind: 'fields', title: 'Your own numbers (optional)', intro: 'Only used when the matching workpaper is blank, for example if you used the Lemonade Stand instead of WP-01. Numbers from 0 to 1. Leave blank to use the worked-out numbers.', fields: [
        f('calc.wb', 'Workload balance (0 to 1)', 'number', { min: 0, max: 1, third: true, optional: true }),
        f('calc.oc', 'Ownership clarity (0 to 1)', 'number', { min: 0, max: 1, third: true, optional: true }),
        f('calc.as', 'Average battery (0 to 1)', 'number', { min: 0, max: 1, third: true, optional: true })
      ] });
    }
    blocks.push({ kind: 'fields', title: 'Retuning count (RF)', intro: 'Count this week’s friction moments: times something landed badly enough to notice. Then count how many of those you ran through fact, feeling and ask (WP-09) before you answered. No friction is not a zero: it just means there was nothing to repair.', fields: [
      f('calc.friction', 'Friction moments this week', 'number', { min: 0, half: true, optional: true }),
      f('calc.retunes', 'Of those, retuned before answering', 'number', { min: 0, half: true, optional: true })
    ] });
    return { id: 'calc', code: 'CALC-01', title: R.calc ? 'Can the load last?' : 'Your state and your retuning count', blocks: blocks };
  }

  function pageNotes(ctx) {
    var blocks = [];
    blocks.push({ kind: 'note', text: 'Optional, and about you. The Wiring Card says how words reach you, so the people around you can send things in a way that lands. It is not a label and not a diagnosis. The weather log is four quick weekly check-ins.' });
    blocks.push({ kind: 'fields', fields: [f('self.wiring.name', 'Name on the card', 'text', { half: true, optional: true })] });
    blocks.push({ kind: 'checks', title: 'My Wiring Card', intro: 'Tick anything true, and add your own words where the list misses.', groups: WIRING.map(function (line) {
      return { label: line.q, fields: line.o.map(function (o) { return f('self.wiring.' + line.id + '.' + o[0], o[1], 'check', { optional: true }); }).concat([f('self.wiring.' + line.id + '.own', 'In my own words', 'text', { optional: true })]) };
    }) });
    var sky = opts(['Clear', 'Gusty', 'Fogged in'], ['Clear', 'Gusty', 'Fogged']), press = opts(['Light', 'Building', 'Heavy']), sleep = opts(['Barely slept', 'Short night', 'About enough', 'Properly rested'], ['Barely', 'Short', 'Enough', 'Rested']);
    var cards = [];
    for (var i = 0; i < WEATHER_WEEKS; i++) {
      var p = 'self.weather.w' + (i + 1) + '.';
      cards.push({ label: 'Week ' + (i + 1), fields: [
        f(p + 'date', 'Date', 'date', { half: true, optional: true }),
        f(p + 'battery', 'Battery score that day (0 to 1, from WP-02)', 'number', { min: 0, max: 1, half: true, optional: true }),
        f(p + 'sky', 'The sky (Clear = calm and connected, Gusty = revved up, Fogged in = running on empty)', 'radio', { options: sky, optional: true }),
        f(p + 'pressure', 'The pressure: what you were already carrying', 'radio', { options: press, optional: true }),
        f(p + 'sleep', 'Last night’s sleep', 'radio', { options: sleep, optional: true }),
        f(p + 'note', 'One line about the week', 'text', { optional: true })
      ] });
    }
    blocks.push({ kind: 'cards', title: 'Weather and battery log', intro: 'Once a week, the same day if you can. Today’s Weather on the website asks the same questions.', rows: cards });
    return { id: 'notes', code: 'NOTES', title: 'Self-notes (optional)', blocks: blocks };
  }

  function pageReady(ctx) {
    var R = ctx.road;
    return {
      id: 'ready', code: 'READY', title: 'Ready for your report',
      blocks: [
        { kind: 'note', text: 'Blank pages are fine. The report says "not filled in" for anything left empty, and it never guesses a number.' },
        { kind: 'fields', fields: [
          f('ready.going', 'One thing that is already going well', 'textarea', { small: true, optional: true }),
          f('ready.focus', 'What would you most like the report to help with?', 'textarea', { small: true, optional: true }),
          f('ready.when', R.solo ? 'When will you read it? (A calm moment, not a hard day.)' : 'When will you read it together? (' + cap(R.meeting) + ' works well.)', 'text', { optional: true }),
          f('ready.fair', R.solo ? 'I’ll read it as a picture of my conditions, not a verdict on me.' : 'We’ll read it as a picture of the setup, not a verdict on anyone.', 'check', { optional: true })
        ] },
        { kind: 'steps', lines: [
          'Save this PDF with your answers in it. Most apps save as you go; in some, use Save or Share, then Save to Files.',
          'Open the Workpaper Suite on the website (spreadloveandacceptance.com/workpapers/fill/suite.html) and go to "Full path package".',
          'Choose "Upload your filled package". It reads your answers on your own device, shows you what it found, and lets you fix anything first.',
          'Press "Make my report". Nothing is sent anywhere: the report is made in your browser.'
        ] }
      ]
    };
  }

  var BUILDERS = { 'WP-01': pageWp01, 'WP-02': pageWp02, 'WP-03': pageWp03, 'WP-04': pageWp04, 'WP-09': pageWp09, 'WP-11': pageWp11, 'WP-13': pageWp13 };

  // The whole package for a road and a number of people, in order.
  var cache = {};
  function build(roadId, n, names) {
    if (!ROADS[roadId]) roadId = 'partners';
    n = clampPeople(roadId, n);
    names = (names || []).slice(0, n);
    var key = roadId + ':' + n + ':' + names.join('\u0001');
    if (cache[key]) return cache[key];
    var R = ROADS[roadId], ctx = { roadId: roadId, road: R, n: n, names: names, labels: labelsFor(roadId, n, names) };
    var pages = [pageWho(ctx)];
    R.wps.forEach(function (code) {
      var p = BUILDERS[code](ctx);
      p.name = NAMES[code];
      p.why = whyOf(roadId, code);
      pages.push(p);
    });
    pages.push(pageCalc(ctx));
    pages.push(pageNotes(ctx));
    pages.push(pageReady(ctx));
    var fields = [], byName = {};
    pages.forEach(function (p) {
      p.fields = [];
      p.blocks.forEach(function (b) {
        var all = b.fields || [];
        (b.rows || []).forEach(function (r) { all = all.concat(r.fields); });
        (b.groups || []).forEach(function (g) { all = all.concat(g.fields); });
        all.forEach(function (fl) { fl.page = p.id; p.fields.push(fl); fields.push(fl); byName[fl.name] = fl; });
      });
    });
    var reg = { road: roadId, n: n, pages: pages, fields: fields, byName: byName, labels: ctx.labels,
      meta: { version: NS + 'meta.version', road: NS + 'meta.road', people: NS + 'meta.people', kind: NS + 'meta.package' } };
    cache[key] = reg;
    return reg;
  }

  /* ------------------------------------------------------------ the data object */

  function blankData(roadId, n, names) {
    var reg = build(roadId, n, names), values = {};
    reg.fields.forEach(function (fl) { if (fl.def) values[fl.name] = fl.def; });
    return { format: FORMAT, version: PKG_VERSION, road: reg.road, people: reg.n, values: values };
  }

  // Fields from any scheme version, mapped onto today's names. v1 is today's.
  var MIGRATE = {
    1: function (name) { return name; }
  };
  function canonical(name) {
    var m = /^tol\.v(\d+)\.(.+)$/.exec(String(name || ''));
    if (!m) return null;
    var fn = MIGRATE[+m[1]];
    return fn ? fn(NS + m[2]) : NS + m[2];
  }

  function isoDate(v) {
    v = trim(v);
    if (!v || /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    var m = v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
    if (m) { var y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return y + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2); }
    var t = Date.parse(v);
    if (!isNaN(t)) { var d = new Date(t); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    return v;
  }
  // A radio answer, from an export value ("Noticed_and_handled"), a label or a short label.
  function radioLabel(fl, v) {
    if (v == null || v === false) return '';
    var s = trim(v);
    if (!s || s === 'Off') return '';
    var low = s.toLowerCase();
    var hit = fl.options.filter(function (o) { return o.v === s || o.label.toLowerCase() === low || String(o.short).toLowerCase() === low; })[0];
    return hit ? hit.label : s;
  }

  // Turn what a PDF (or anything else) handed back into the data object.
  // found: { fullFieldName: string | true | false }. Returns { data, report } where report says what was read.
  function fromFields(found) {
    var canon = {};
    Object.keys(found || {}).forEach(function (k) { var c = canonical(k); if (c) canon[c] = found[k]; });
    var roadId = trim(canon[NS + 'meta.road']);
    var version = trim(canon[NS + 'meta.version']) || '';
    var n = parseInt(canon[NS + 'meta.people'], 10);
    if (!ROADS[roadId]) roadId = guessRoad(canon);
    if (!(n >= 1)) { n = 0; Object.keys(canon).forEach(function (k) { var m = /\.p(\d)\./.exec(k) || /\.who\.p(\d)$/.exec(k); if (m) n = Math.max(n, +m[1]); }); }
    n = clampPeople(roadId, n);
    var reg = build(roadId, n), values = {}, unknown = [];
    Object.keys(canon).forEach(function (name) {
      if (name.indexOf(NS + 'meta.') === 0) return;
      var fl = reg.byName[name], v = canon[name];
      if (!fl) { if (!blank(v)) unknown.push(name); return; }
      if (fl.type === 'check') { values[name] = v === true || (typeof v === 'string' && v !== 'Off' && v !== '' && v !== 'false'); if (!values[name]) delete values[name]; return; }
      if (fl.type === 'radio') { var r = radioLabel(fl, v); if (r) values[name] = r; return; }
      if (typeof v !== 'string') return;
      v = v.replace(/\r\n?/g, '\n');
      if (fl.type !== 'textarea') v = v.replace(/\n/g, ' ');
      if (fl.type === 'date') v = isoDate(v);
      if (trim(v) !== '') values[name] = fl.type === 'textarea' ? v.replace(/\s+$/, '') : trim(v);
    });
    var data = { format: FORMAT, version: PKG_VERSION, road: roadId, people: n, values: values };
    return { data: data, read: readReport(data, { version: version, unknown: unknown, hadMeta: !!canon[NS + 'meta.road'] }) };
  }
  function guessRoad(canon) {
    var keys = Object.keys(canon).join(' ');
    if (/wp03\.treaty\.r\d+\.c\b/.test(keys)) return 'coworkers';
    return /wp01\.audit/.test(keys) ? 'partners' : 'self';
  }

  // A JSON backup (or a draft) back into the data object, cleaned.
  function fromJSON(obj) {
    if (!obj || obj.format !== FORMAT || typeof obj.values !== 'object') return null;
    var found = {};
    Object.keys(obj.values).forEach(function (k) { var v = obj.values[k]; if (typeof v === 'string' || typeof v === 'boolean' || typeof v === 'number') found[k] = typeof v === 'number' ? String(v) : v; });
    found[NS + 'meta.road'] = obj.road; found[NS + 'meta.people'] = String(obj.people); found[NS + 'meta.version'] = obj.version || '';
    return fromFields(found);
  }

  // What was read, page by page, and what is missing or couldn't be matched.
  function readReport(data, extra) {
    var reg = build(data.road, data.people, namesOf(data)), P = people(data), pages = [], issues = [], total = 0;
    reg.pages.forEach(function (p) {
      var filled = 0, need = 0, missing = [];
      p.fields.forEach(function (fl) {
        var v = data.values[fl.name];
        var has = !blank(v) && !(fl.prefill && v === fl.def) && !(fl.def && v === fl.def && /\.(task|freq|notes)$/.test(fl.id));
        if (has) filled++;
        if (!fl.optional && !fl.prefill) need++;
        if (!has && !fl.optional && !fl.prefill && missing.length < 400) missing.push(fl);
        if (has && fl.type === 'person') {
          var who = P.resolve(v);
          if (who === undefined) issues.push({ page: p.id, field: fl, msg: '“' + trim(v) + '” in ' + fieldPlace(p, fl) + ' doesn’t match anyone on the road. Use a name from "Who’s on this road", an initial, or "Everyone".' });
        }
        if (has && fl.type === 'number') {
          var nv = num(v);
          if (nv == null) issues.push({ page: p.id, field: fl, msg: '“' + trim(v) + '” in ' + fieldPlace(p, fl) + ' isn’t a number, so it is left out.' });
          else if ((fl.max != null && nv > fl.max) || (fl.min != null && nv < fl.min)) issues.push({ page: p.id, field: fl, msg: trim(v) + ' in ' + fieldPlace(p, fl) + ' is outside ' + fl.min + ' to ' + fl.max + ', so it is left out.' });
        }
      });
      total += filled;
      pages.push({ id: p.id, code: p.code || '', title: p.title, filled: filled, of: p.fields.length, missing: missing, status: filled === 0 ? 'blank' : 'started' });
    });
    return { road: data.road, roadLabel: ROADS[data.road].label, people: data.people, total: total, pages: pages, issues: issues, version: extra && extra.version, unknown: extra ? extra.unknown : [], hadMeta: extra ? extra.hadMeta : true };
  }
  function fieldPlace(p, fl) {
    var m = /\.r(\d+)\.([a-z]+)$/i.exec(fl.id);
    return (p.code ? p.code + ', ' : '') + fl.label + (m ? ' (row ' + m[1] + ')' : '');
  }

  /* ------------------------------------------------------------ reading the data */

  function num(v) {
    var s = trim(v).replace(',', '.');
    if (!s) return null;
    var pc = /^(-?\d*\.?\d+)\s*%$/.exec(s);
    if (pc) return parseFloat(pc[1]) / 100;
    var h = /^(\d*\.?\d+)\s*(h|hr|hrs|hours?)$/i.exec(s);
    if (h) return parseFloat(h[1]) * 60;
    var m = /^(-?\d*\.?\d+)\s*(m|min|mins|minutes?)?$/i.exec(s);
    return m ? parseFloat(m[1]) : null;
  }
  function inRange(v, lo, hi) { var n = num(v); return n == null || n < lo || n > hi ? null : n; }

  function namesOf(data) {
    var out = [];
    for (var i = 0; i < data.people; i++) out.push(trim(data.values[NS + 'who.p' + (i + 1)]));
    return out;
  }

  // Everyone on the road, and a way to match "sam", "S", "2" or "Everyone" to them.
  function people(data) {
    var names = namesOf(data), n = data.people, list = [];
    for (var i = 0; i < n; i++) list.push({ i: i, name: names[i], label: names[i] || roleOf(data.road, i), role: roleOf(data.road, i) });
    function resolve(v) {
      var s = trim(v);
      if (!s) return null;
      var low = s.toLowerCase().replace(/[.!]+$/, '');
      if (/^(both|everyone|everybody|all|all of us|us|we|together|the team|team|whole team|the house|whole house|the family)$/.test(low)) return 'all';
      var hit = list.filter(function (p) { return p.label.toLowerCase() === low || (p.name && p.name.toLowerCase() === low) || p.role.toLowerCase() === low; });
      if (hit.length === 1) return hit[0].i;
      if (low.length === 1) {
        var ini = list.filter(function (p) { return p.name && p.name.charAt(0).toLowerCase() === low; });
        if (ini.length === 1) return ini[0].i;
        var li = CODES.indexOf(low.toUpperCase());
        if (li >= 0 && li < n) return li;
      }
      var d = /^(?:p|person\s*)?([1-8])$/.exec(low);
      if (d && +d[1] <= n) return +d[1] - 1;
      if (low.length >= 2) {
        var pre = list.filter(function (p) { return p.name && p.name.toLowerCase().indexOf(low) === 0; });
        if (pre.length === 1) return pre[0].i;
        var inits = list.filter(function (p) { return p.name && p.name.split(/\s+/).map(function (w) { return w.charAt(0); }).join('').toLowerCase() === low; });
        if (inits.length === 1) return inits[0].i;
        var first = list.filter(function (p) { return p.name && p.name.split(/\s+/)[0].toLowerCase() === low.split(/\s+/)[0]; });
        if (first.length === 1) return first[0].i;
      }
      return undefined;
    }
    return { list: list, n: n, resolve: resolve, label: function (i) { return list[i] ? list[i].label : ''; } };
  }

  function V(data, id) { var v = data.values[NS + id]; return v == null ? '' : v; }
  function has(data, id) { return !blank(data.values[NS + id]); }
  function rowsOf(data, prefix, cols, max) {
    var out = [];
    for (var r = 1; r <= (max || 80); r++) {
      var row = { _i: r };
      cols.forEach(function (c) { var k = NS + prefix + '.r' + r + '.' + c; row[c] = data.values[k] == null ? '' : data.values[k]; });
      out.push(row);
    }
    return out;
  }

  function batteryBand(s) {
    if (s == null) return null;
    var k = C1().wp02Band(s).key;
    return k === 'low' ? { key: 'low', label: 'Low load' } : k === 'mid' ? { key: 'medium', label: 'Medium load' } : { key: 'high', label: 'High load' };
  }
  // Bands are read from the score rounded to two decimals (calc01-core.js).
  function calcBand(v) {
    if (v == null) return null;
    var k = C1().band(v).key;
    return k === 'high' ? { key: 'good', label: 'Carrying its own weight' } : k === 'mid' ? { key: 'drift', label: 'Something is drifting' } : { key: 'low', label: 'Can’t last as it is set up now' };
  }

  // Every number the report uses, with where it came from. Blank means null, never a guess.
  function compute(data) {
    var reg = build(data.road, data.people, namesOf(data)), R = ROADS[data.road], P = people(data), n = data.people;
    var on = {}; R.wps.forEach(function (c) { on[c] = true; });
    var out = { road: data.road, R: R, n: n, P: P, reg: reg, on: on };

    // WP-02: one battery per person
    out.battery = P.list.map(function (p) {
      var base = 'wp02.p' + (p.i + 1) + '.', sum = 0, got = 0, answers = [];
      for (var q = 1; q <= 5; q++) {
        var v = inRange(V(data, base + 'q' + q), 0, 4);
        answers.push(v);
        if (v != null) { sum += v; got++; }
      }
      var score = null, source = null, shared = inRange(V(data, base + 'score'), 0, 1);
      var bat = got === 5 ? C1().battery(answers) : null;
      if (bat) { score = bat.value; source = 'answers'; }
      else if (shared != null) { score = shared; source = 'shared'; }
      return { i: p.i, label: p.label, score: score, source: source, answered: got, sum: sum, answers: answers, band: batteryBand(score), note: trim(V(data, base + 'note')), date: V(data, base + 'date') };
    });
    var scored = out.battery.filter(function (b) { return b.score != null; });
    out.wp02 = { filled: out.battery.some(function (b) { return b.answered > 0 || b.source; }), scored: scored.length };

    // WP-01: minutes by person, and the balance score
    if (on['WP-01'] && !R.refusalsOnly) {
      var mins = P.list.map(function () { return 0; }), noticed = mins.slice(), rowsUsed = 0, unmatched = [], logged = 0, tasks = [];
      rowsOf(data, 'wp01.audit', ['day', 'task', 'who', 'minutes', 'how'], 10).forEach(function (r) {
        if (!(trim(r.task) || trim(r.who) || trim(r.minutes) || trim(r.how))) return;
        logged++;
        if (trim(r.task)) tasks.push(trim(r.task));
        var m = num(r.minutes), who = P.resolve(r.who);
        if (!(m > 0) || who == null) { if (who === undefined && trim(r.who)) unmatched.push(trim(r.who)); return; }
        rowsUsed++;
        var share = {};
        if (who === 'all') P.list.forEach(function (p) { share[p.i] = m / n; }); else share[who] = m;
        Object.keys(share).forEach(function (k) { mins[k] += share[k]; if (r.how === 'Noticed and handled') noticed[k] += share[k]; });
      });
      // balance for 2 to 8 people against an even split: 1 − (½Σ|share − 1/n|) ÷ (1 − 1/n)
      var bal = C1().balance(mins), total = bal.total, wb = bal.value, shares = bal.shares ? bal.shares.map(function (x) { return x * 100; }) : null;
      out.wp01 = { filled: logged > 0 || has(data, 'wp01.weekOf'), logged: logged, rowsUsed: rowsUsed, minutes: mins, noticed: noticed, total: total, shares: shares, wb: wb, unmatched: unmatched, tasks: tasks };
    }
    // WP-01 Part B: kind no's (every road that has WP-01)
    if (on['WP-01']) {
      out.refusals = rowsOf(data, 'wp01.refusals', ['kind', 'ack', 'cap', 'alt'], 3).filter(function (r) { return trim(r.ack) || trim(r.cap) || trim(r.alt); });
      if (!out.wp01) out.wp01 = { filled: out.refusals.length > 0 };
      else out.wp01.filled = out.wp01.filled || out.refusals.length > 0;
    }

    // WP-03: ownership clarity
    if (on['WP-03']) {
      var reg3 = reg.pages.filter(function (p) { return p.id === 'wp03'; })[0], defs = {};
      reg3.fields.forEach(function (fl) { if (fl.def) defs[fl.name] = fl.def; });
      var cols = ['task', 'freq', 'r', 'a', 'c', 'i', 'notes'], rows3 = rowsOf(data, 'wp03.treaty', cols, 20), touched = false;
      rows3.forEach(function (r) {
        cols.forEach(function (c) {
          var k = NS + 'wp03.treaty.r' + r._i + '.' + c, v = data.values[k];
          if (!blank(v) && v !== defs[k]) touched = true;
          if (blank(v) && defs[k] && c === 'task') touched = true; // a default task cleared on purpose
        });
      });
      touched = touched || has(data, 'wp03.reviewDate');
      var tasks3 = rows3.filter(function (r) { return trim(r.task); });
      var owned = [], unowned = [], half = [], byOwner = P.list.map(function () { return 0; }), unmatched3 = [];
      tasks3.forEach(function (r) {
        var rr = P.resolve(r.r), aa = P.resolve(r.a);
        if (trim(r.r) && rr === undefined) unmatched3.push(trim(r.r));
        if (trim(r.a) && aa === undefined) unmatched3.push(trim(r.a));
        if (trim(r.r) && trim(r.a)) owned.push(r); else if (trim(r.r) || trim(r.a)) half.push(r); else unowned.push(r);
        if (typeof rr === 'number') byOwner[rr]++;
      });
      out.wp03 = { filled: touched, tasks: tasks3.length, owned: owned.length, oc: touched && tasks3.length ? owned.length / tasks3.length : null,
        unowned: unowned.map(function (r) { return trim(r.task); }), half: half.map(function (r) { return trim(r.task); }), byOwner: byOwner, unmatched: unmatched3,
        amend: [1, 2].filter(function (i) { return has(data, 'wp03.amend.r' + i + '.change'); }).length };
    }

    // WP-04: what keeps slipping
    if (on['WP-04']) {
      var raw = rowsOf(data, 'wp04.raw', ['task', 'w1', 'w2', 'w3', 'w4'], 8).filter(function (r) { return trim(r.task); }).map(function (r) {
        return { task: trim(r.task), times: ['w1', 'w2', 'w3', 'w4'].filter(function (w) { return r[w] === true; }).length };
      });
      var cl = rowsOf(data, 'wp04.classify', ['task', 'owner', 'kind', 'action'], 6).filter(function (r) { return trim(r.task); });
      var count = { 'Structural gap': 0, 'Capacity issue': 0, 'One-off, no action': 0 };
      cl.forEach(function (r) { if (count.hasOwnProperty(r.kind)) count[r.kind]++; });
      out.wp04 = { filled: raw.length > 0 || cl.length > 0 || has(data, 'wp04.month'), raw: raw, patterns: raw.filter(function (r) { return r.times >= 3; }), twice: raw.filter(function (r) { return r.times === 2; }),
        classified: cl, structural: count['Structural gap'], capacity: count['Capacity issue'], oneoff: count['One-off, no action'],
        actions: cl.filter(function (r) { return trim(r.action); }).map(function (r) { return trim(r.task) + ': ' + trim(r.action); }) };
    }

    // WP-09: say it so it lands
    if (on['WP-09']) {
      var fact = trim(V(data, 'wp09.fact')), feeling = trim(V(data, 'wp09.feeling')), ask = trim(V(data, 'wp09.ask'));
      var spec = V(data, 'wp09.filter.specific'), sat = V(data, 'wp09.filter.saturation'), neu = V(data, 'wp09.filter.neutral'), pat = V(data, 'wp09.filter.pattern');
      var checks = [spec, sat, neu, pat].filter(Boolean).length, advice = null;
      if (checks) {
        if (sat === 'No' || sat === 'Not sure' || neu === 'Yes' || pat === 'A past pattern') advice = 'pause';
        else if (spec === 'No') advice = 'name';
        else advice = 'clear';
      }
      out.wp09 = { filled: !!(fact || feeling || ask || checks), fact: fact, feeling: feeling, ask: ask, parts: [fact, feeling, ask].filter(Boolean).length, checks: checks, advice: advice,
        pattern: pat === 'A past pattern', satNo: sat === 'No' || sat === 'Not sure', who: trim(V(data, 'wp09.who')), raw: V(data, 'wp09.rawInclude') === true ? trim(V(data, 'wp09.raw')) : '' };
    }

    // WP-11: the calm-down kit
    if (on['WP-11']) {
      var lines = P.list.map(function (p) { return trim(V(data, 'wp11.lines.p' + (p.i + 1) + '.line')); });
      var trig = rowsOf(data, 'wp11.triggers', ['trigger', 'body'], 3).filter(function (r) { return trim(r.trigger) || trim(r.body); });
      var re = rowsOf(data, 'wp11.reentry', ['time', 'tactic', 'before', 'after'], 3).filter(function (r) { return inRange(r.after, 0, 1) != null; });
      var latest = re.length ? inRange(re[re.length - 1].after, 0, 1) : null, before = re.length ? inRange(re[re.length - 1].before, 0, 1) : null;
      var ret = latest == null ? null : latest < 0.5 ? 'back' : latest < 0.6 ? 'again' : (re.length >= 2 ? 'later' : 'again');
      out.wp11 = { filled: !!(V(data, 'wp11.first') || V(data, 'wp11.second') || lines.some(Boolean) || trig.length || re.length),
        first: V(data, 'wp11.first'), second: V(data, 'wp11.second'), lines: lines, triggers: trig, readings: re.length, latest: latest, before: before, ret: ret,
        nextAction: trim(V(data, 'wp11.nextAction')), resume: trim(V(data, 'wp11.resume')) };
    }

    // WP-13: the daily check-in
    if (on['WP-13']) {
      var loads = P.list.map(function () { return { Low: 0, Medium: 0, High: 0 }; }), thanks = [], frictions = [], asks = [], entries = 0;
      rowsOf(data, 'wp13.daily', ['day', 'who', 'load', 'thanks', 'friction', 'ask'], 7 * n).forEach(function (r) {
        if (!(r.load || trim(r.thanks) || trim(r.friction) || trim(r.ask))) return;
        entries++;
        var who = P.resolve(r.who);
        if (typeof who === 'number' && loads[who].hasOwnProperty(r.load)) loads[who][r.load]++;
        var tag = [r.day, typeof who === 'number' ? P.label(who) : trim(r.who)].filter(Boolean).join(', ');
        if (trim(r.thanks)) thanks.push([trim(r.thanks), tag]);
        if (trim(r.friction)) frictions.push(trim(r.friction));
        if (trim(r.ask)) asks.push(trim(r.ask));
      });
      var resync = rowsOf(data, 'wp13.resync', ['item', 'times', 'to'], 3).filter(function (r) { return trim(r.item); });
      out.wp13 = { filled: entries > 0 || resync.length > 0, entries: entries, possible: 7 * n, loads: loads, thanks: thanks, frictions: frictions, asks: asks, resync: resync,
        highDays: loads.map(function (l) { return l.High; }) };
    }

    // CALC-01
    var wbSrc = null, ocSrc = null, asSrc = null, wb = null, oc = null, as = null;
    if (R.calc) {
      if (out.wp01 && out.wp01.wb != null) { wb = out.wp01.wb; wbSrc = 'WP-01'; }
      else if (inRange(V(data, 'calc.wb'), 0, 1) != null) { wb = inRange(V(data, 'calc.wb'), 0, 1); wbSrc = 'yours'; }
      if (out.wp03 && out.wp03.oc != null) { oc = out.wp03.oc; ocSrc = 'WP-03'; }
      else if (inRange(V(data, 'calc.oc'), 0, 1) != null) { oc = inRange(V(data, 'calc.oc'), 0, 1); ocSrc = 'yours'; }
      var st = C1().stress(out.battery.map(function (b) { return b.score; }));
      if (st.value != null) { as = st.value; asSrc = 'WP-02'; }
      else if (inRange(V(data, 'calc.as'), 0, 1) != null) { as = inRange(V(data, 'calc.as'), 0, 1); asSrc = 'yours'; }
    }
    var fr = num(V(data, 'calc.friction')), rt = num(V(data, 'calc.retunes'));
    var rf = C1().retuning(rt, fr).value;
    var calc = { applies: R.calc, wb: wb, oc: oc, as: as, rf: rf, wbSrc: wbSrc, ocSrc: ocSrc, asSrc: asSrc, friction: fr, retunes: rt, capped: fr > 0 && rt > fr,
      asPeople: asSrc === 'WP-02' ? n : 0, state: V(data, 'calc.state'), missing: [] };
    if (R.calc) {
      if (wb == null) calc.missing.push('workload balance (WP-01 minutes with names)');
      if (oc == null) calc.missing.push('ownership clarity (WP-03 tasks with owners)');
      var waiting = out.battery.filter(function (b) { return b.score == null; }).map(function (b) { return b.label; });
      calc.waiting = waiting;
      if (as == null) calc.missing.push('everyone\u2019s battery score (WP-02; still waiting on ' + list(waiting) + '; it is never worked out while anyone\u2019s is missing)');
      if (!calc.missing.length) {
        calc.sol = C1().solvency(wb, oc, as).value;
        var ax = C1().apex(wb, oc, as, rf);
        calc.apex = ax.value;
        calc.apexRebalanced = ax.rebalanced;
        calc.solBand = calcBand(calc.sol); calc.apexBand = calcBand(calc.apex);
        var FIX = { wb: ['WB', 'how the load is split (WP-01, then WP-03)'], oc: ['OC', 'ownership clarity (the unowned rows on WP-03)'], as: ['AS', 'how full everyone\u2019s battery is (WP-02, and what is driving it)'] };
        var terms = C1().shortfalls(wb, oc, as).map(function (t) { return { key: FIX[t.key][0], value: t.key === 'wb' ? wb : t.key === 'oc' ? oc : as, short: t.short, fix: FIX[t.key][1] }; });
        calc.terms = terms;
        calc.worst = terms.slice().sort(function (a, b) { return b.short - a.short; })[0];
        calc.gap = rf != null ? calc.sol - calc.apex : 0;
      }
    }
    out.calc = calc;

    // Self-notes
    var wiring = WIRING.map(function (line) {
      var picked = line.o.filter(function (o) { return V(data, 'self.wiring.' + line.id + '.' + o[0]) === true; }).map(function (o) { return o[1]; });
      var own = trim(V(data, 'self.wiring.' + line.id + '.own'));
      if (own) picked.push(own);
      return { id: line.id, q: line.q, picked: picked };
    });
    var weather = [];
    for (var w = 1; w <= WEATHER_WEEKS; w++) {
      var b = 'self.weather.w' + w + '.';
      var wk = { w: w, date: V(data, b + 'date'), battery: inRange(V(data, b + 'battery'), 0, 1), sky: V(data, b + 'sky'), pressure: V(data, b + 'pressure'), sleep: V(data, b + 'sleep'), note: trim(V(data, b + 'note')) };
      if (wk.date || wk.battery != null || wk.sky || wk.pressure || wk.sleep || wk.note) weather.push(wk);
    }
    out.notes = { name: trim(V(data, 'self.wiring.name')), wiring: wiring, wiringLines: wiring.filter(function (l) { return l.picked.length; }).length, weather: weather };
    out.ready = { going: trim(V(data, 'ready.going')), focus: trim(V(data, 'ready.focus')), when: trim(V(data, 'ready.when')), fair: V(data, 'ready.fair') === true };
    out.who = { started: V(data, 'who.started'), context: trim(V(data, 'who.context')), others: trim(V(data, 'who.others')) };
    out.anything = reg.fields.some(function (fl) { var v = data.values[fl.name]; return !blank(v) && !(fl.def && v === fl.def) && !/^who\.p\d$/.test(fl.id); });
    return out;
  }

  /* ------------------------------------------------------------ the report */

  var PILLARS = [
    { n: 'I', name: 'See the whole load', anchor: 'see-the-load', field: 'Ledger accounting',
      inYou: 'Notice everything you carry, including the invisible, mental and emotional load.',
      between: 'Put {work} on one shared, fair page, so nobody has to argue about whose work counts.',
      betweenSelf: 'When you explain your load to the people around you, show them the page, not a complaint.' },
    { n: 'II', name: 'Fix the setup, not the person', anchor: 'fix-the-setup', field: 'Systems thinking',
      inYou: 'See your habits and routines as a setup you can redesign, not a character flaw.',
      between: 'Give each {task} one owner, with clear handoffs and agreements, instead of blame.',
      betweenSelf: 'Ask for clear owners and handoffs where your load overlaps with someone else’s.' },
    { n: 'III', name: 'Read your state first', anchor: 'read-your-state', field: 'Nervous-system science',
      inYou: 'Know how full your battery is (calm, revved up, shut down) before you judge a moment.',
      between: 'Pick the timing, pause and come back; your state shapes how the other person’s words land.',
      betweenSelf: 'Say your number before a hard talk, so the other person knows what they’re talking to.' },
    { n: 'IV', name: 'Tune how you send and receive', anchor: 'tune-signals', field: 'Signal theory',
      inYou: 'Know your own wiring, pace and how you hear things.',
      between: 'Translate across different wiring and tone; a mismatch is tuning, not a moral failing.',
      betweenSelf: 'Share your Wiring Card, so people can send things in a way that reaches you.' },
    { n: 'V', name: 'Notice the quiet incentives', anchor: 'quiet-incentives', field: 'Behavioral economics',
      inYou: 'Spot the defaults and shortcuts that steer your own choices.',
      between: 'Watch how unclaimed {tasks} drift to one person, and keep fairness and thanks steady.',
      betweenSelf: 'Notice which jobs quietly drift to you, and say so kindly before they settle there.' }
  ];

  function vocab(c) {
    var R = c.R, n = c.n;
    return { one: R.one, many: R.many, tasks: R.tasks, group: n > 2 ? R.groupN : R.group2, Group: cap(n > 2 ? R.groupN : R.group2), work: R.work, task: R.task, meeting: R.meeting, setting: R.setting };
  }
  function fill(t, v) { return String(t).replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); }

  function report(data) {
    var c = compute(data), R = c.R, v = vocab(c), P = c.P, sp = suitePath(data.road), RP = sp && sp.report;
    var model = { road: data.road, roadLabel: R.label, n: c.n, date: new Date(), names: P.list.map(function (p) { return p.label; }), calc: c.calc, battery: c.battery };
    model.forWho = R.solo ? (P.list[0].name || 'You') : list(P.list.map(function (p) { return p.label; }));
    model.title = R.solo ? 'Your full path report' : 'Your full path report: ' + R.label;
    model.lens = RP ? RP.lens : '';
    model.what = RP ? RP.what : '';

    // Summary tiles
    var tiles = [];
    if (R.calc) {
      tiles.push(c.calc.sol != null
        ? { k: 'CALC-01 solvency', v: fmt(c.calc.sol), band: c.calc.solBand.label, tone: c.calc.solBand.key, note: 'WB × 0.40 + OC × 0.35 + (1 − AS) × 0.25' }
        : { k: 'CALC-01 solvency', v: 'Not worked out', band: 'Still needed: ' + c.calc.missing.join('; '), tone: 'none' });
      if (c.calc.sol != null) tiles.push({ k: 'Apex score', v: fmt(c.calc.apex), band: c.calc.apexBand.label, tone: c.calc.apexBand.key, note: c.calc.apexRebalanced ? 'From three inputs, rebalanced: no friction moments were counted, so there was nothing to repair.' : 'Adds your retuning count (RF ' + fmt(c.calc.rf) + ').' });
      tiles.push({ k: 'Workload balance', v: c.calc.wb != null ? fmt(c.calc.wb) : 'Not filled in', band: c.calc.wb == null ? 'WP-01 needs minutes and names' : c.calc.wbSrc === 'yours' ? 'Your own number' : 'From WP-01 (1 = even split)', tone: c.calc.wb == null ? 'none' : c.calc.wb >= 0.7 ? 'good' : c.calc.wb >= 0.4 ? 'drift' : 'low' });
      tiles.push({ k: 'Ownership clarity', v: c.calc.oc != null ? fmt(c.calc.oc) : 'Not filled in', band: c.calc.oc == null ? 'WP-03 needs owners' : c.calc.ocSrc === 'yours' ? 'Your own number' : c.wp03.owned + ' of ' + c.wp03.tasks + ' tasks fully owned', tone: c.calc.oc == null ? 'none' : c.calc.oc >= 0.7 ? 'good' : c.calc.oc >= 0.4 ? 'drift' : 'low' });
    }
    c.battery.forEach(function (b) {
      tiles.push({ k: R.solo ? 'Your battery' : 'Battery: ' + b.label, v: b.score != null ? fmt(b.score) : 'Not filled in', band: b.score != null ? b.band.label + (b.source === 'shared' ? ' (score shared)' : '') : (b.answered ? b.answered + ' of 5 answered' : 'WP-02 blank'), tone: b.score == null ? 'none' : b.band.key === 'low' ? 'good' : b.band.key === 'medium' ? 'drift' : 'low', person: true });
    });
    if (c.calc.rf != null) tiles.push({ k: 'Retuning (RF)', v: fmt(c.calc.rf), band: c.calc.retunes + ' of ' + c.calc.friction + ' friction moments retuned' + (c.calc.capped ? ' (capped at 1.00)' : ''), tone: c.calc.rf >= 0.5 ? 'good' : 'drift' });
    model.tiles = tiles;

    model.findings = findings(c, v);
    model.sections = R.wps.map(function (code) { return wpSection(code, c, v, RP); });
    model.calcSection = calcSection(c, v);
    model.roadPart = roadPart(c, v, RP, sp);
    model.pillars = pillarView(c, v);
    model.plan = plan(c, v, sp);
    model.notes = notesSection(c, v);
    model.ready = c.ready;
    model.who = c.who;
    model.fair = [
      'Not a verdict. This report describes the setup and what was written down, never anyone’s worth, effort or love.',
      R.solo ? 'It reads your conditions, not your character. Patterns are weather, not identity.' : 'No blame. A gap in the setup is a gap in the setup, not a failing of the person who kept covering it.',
      'Not diagnostic, and not a health tool. It can’t tell you what is going on inside anyone, and it makes no health claims.',
      'Rule-of-thumb numbers. The bands are round numbers chosen to be easy to read. A 0.69 and a 0.70 are the same week.',
      'It only knows what was entered. Anything left blank says "not filled in" rather than guessing.'
    ];
    if (c.calc.state === 'Revved up') model.stateNote = 'You marked yourself as revved up. Read it, but don’t act on it today. Bring it to ' + v.meeting + ' instead.';
    else if (c.calc.state === 'Running on empty') model.stateNote = 'You marked yourself as running on empty. You can stop here for today. The numbers will still be true tomorrow, and they were never a verdict on you.';
    else if (c.calc.state === 'Calm and connected') model.stateNote = 'You marked yourself as calm and connected: good conditions for reading this.';
    model.care = sp ? sp.care : '';
    model.close = RP ? RP.close : '';
    model.empty = !c.anything;
    return model;
  }

  function findings(c, v) {
    var R = c.R, out = [], calc = c.calc;
    function add(pri, text) { out.push({ p: pri, t: text }); }
    if (!c.anything) {
      return ['Nothing is filled in yet, so there is nothing to read. That is fine: start with one page, and the report grows with you.',
        R.solo ? 'A good first page is WP-02, your battery. One minute, about the last day or two.' : 'A good first page is ' + (R.wps[0]) + ', ' + NAMES[R.wps[0]] + '.',
        'Everything stays on this device. Nothing is sent anywhere.'];
    }
    if (calc.sol != null) {
      var s = fmt(calc.sol);
      if (calc.sol >= 0.7) add(10, 'The setup reads ' + s + ' on CALC-01: it is carrying its own weight. Keep the same rhythm; nothing needs fixing this week.');
      else if (calc.sol >= 0.4) add(10, 'The setup reads ' + s + ' on CALC-01: something is drifting. The biggest single gap is ' + calc.worst.fix + ', so start there, not with whatever happened most recently.');
      else add(10, 'The setup reads ' + s + ' on CALC-01: as it is set up now, it can’t last. That is a statement about the setup, not about anyone. The biggest gap is ' + calc.worst.fix + '.');
      if (calc.rf != null && Math.abs(calc.gap) >= 0.08) add(7, calc.gap > 0 ? 'Solvency runs ' + fmt(calc.gap) + ' above apex: the setup holds, but repair after friction isn’t keeping up. WP-09 is the place to work, not the owners list.' : 'Apex runs ' + fmt(-calc.gap) + ' above solvency: you repair well, but the setup keeps making friction to repair. The owners list is the place to work.');
    } else if (R.calc && c.anything) {
      add(3, 'CALC-01 isn’t worked out yet. Still needed: ' + calc.missing.join('; ') + '. Nothing is guessed in the meantime.');
    }
    var high = c.battery.filter(function (b) { return b.score != null && b.score >= 0.6; });
    var scored = c.battery.filter(function (b) { return b.score != null; });
    if (R.solo) {
      var b0 = c.battery[0];
      if (b0.score != null) add(9, 'Your battery reads ' + fmt(b0.score) + ': ' + b0.band.label.toLowerCase() + '. ' + (b0.band.key === 'high' ? 'Put off what doesn’t need deciding today, and reach for your settling defaults first.' : b0.band.key === 'medium' ? 'Worth saying out loud before a hard conversation: “Heads up, I’m carrying more than usual today.”' : 'Whatever comes up today is probably about the thing itself, not leftover load.'));
      var top = topFactors(c);
      if (top.length) add(6, 'What’s filling your battery most: ' + list(top.map(function (t) { return t.toLowerCase(); })) + '. Those are conditions, not character, and some are in your control this week.');
    } else if (high.length) {
      add(9, (high.length === 1 ? high[0].label + '’s battery reads ' + fmt(high[0].score) : list(high.map(function (b) { return b.label; })) + ' have batteries at 0.60 or above') + '. That is a high load. Protect it: put off anything that doesn’t need deciding this week, and say your number before any hard talk.');
    } else if (scored.length >= 2) {
      add(4, 'Every battery that was filled in reads under 0.60 (' + scored.map(function (b) { return b.label + ' ' + fmt(b.score); }).join(', ') + '). Good conditions for the harder conversations.');
    }
    if (c.wp03 && c.wp03.filled && c.wp03.unowned.concat(c.wp03.half).length) {
      var gaps = c.wp03.unowned.concat(c.wp03.half);
      add(8, plural(gaps.length, v.task, v.tasks) + ' still need' + (gaps.length === 1 ? 's' : '') + ' a clear owner: ' + list(gaps.slice(0, 4)) + (gaps.length > 4 ? ' and more' : '') + '. Work with no owner drifts to whoever notices it first.');
    } else if (c.wp03 && c.wp03.filled && c.wp03.tasks) {
      add(5, 'Every one of the ' + c.wp03.tasks + ' ' + v.tasks + ' on your list has both a Responsible and an Accountable name. That clarity is doing real work.');
    }
    if (c.wp01 && c.wp01.shares && c.n >= 2) {
      var sh = c.wp01.shares, mx = Math.max.apply(null, sh), iMax = sh.indexOf(mx);
      if (c.calc.wb != null && c.calc.wb < 0.7) add(7, 'The logged minutes leaned one way this week: ' + c.P.list.map(function (p) { return p.label + ' ' + Math.round(sh[p.i]) + '%'; }).join(', ') + '. That is a fact about how ' + v.work + ' fell this week, not about effort or care.');
      else add(3, 'The logged minutes were fairly even this week (' + c.P.list.map(function (p) { return p.label + ' ' + Math.round(sh[p.i]) + '%'; }).join(', ') + ').');
      void iMax;
    }
    if (c.wp04 && c.wp04.patterns.length) add(7, plural(c.wp04.patterns.length, 'task') + ' came up 3 or 4 weeks out of 4: ' + list(c.wp04.patterns.map(function (p) { return p.task; }).slice(0, 3)) + '. That is a pattern, not a fluke, and usually a gap in the setup.');
    if (c.wp09 && c.wp09.advice === 'pause') add(5, 'Your Tone Filter checks suggest pausing before you answer that message' + (c.wp09.pattern ? ': it may be touching an older pattern, not just these words.' : '.'));
    if (c.wp13 && c.wp13.thanks.length) add(4, plural(c.wp13.thanks.length, 'appreciation') + ' written down in the daily check-ins. Those are worth reading again on a harder day.');
    if (c.wp11 && c.wp11.filled && !(c.wp11.first || c.wp11.second)) add(3, 'The Calm-Down Kit is started, but no settling defaults are chosen yet. Picking two on a calm day is what makes it work in the moment.');
    if (R.solo && c.notes.wiringLines) add(5, 'Your Wiring Card has ' + c.notes.wiringLines + ' of 9 lines filled in. That is the start of a short, kind way to explain yourself to others.');
    if (R.solo && c.notes.weather.length >= 2) {
      var wb2 = c.notes.weather.filter(function (w) { return w.battery != null; });
      if (wb2.length >= 2) { var d = wb2[wb2.length - 1].battery - wb2[0].battery; add(6, 'Across your weather log, your battery went from ' + fmt(wb2[0].battery) + ' to ' + fmt(wb2[wb2.length - 1].battery) + (Math.abs(d) < 0.05 ? ': holding steady.' : d < 0 ? ': lighter. Notice what helped.' : ': heavier. Be kind about it, and look at what changed.')); }
    }
    out.sort(function (a, b) { return b.p - a.p; });
    var texts = out.map(function (o) { return o.t; }).slice(0, 3);
    var pads = ['What is filled in so far is enough to start one conversation. You don’t need every page to begin.',
      'Anything left blank shows as "not filled in" below. Nothing is guessed.',
      R.solo ? 'The next small step is on the last page: one thing, this week.' : 'Pick one topic per sitting. The plan at the end has one step per week.'];
    var k = 0;
    while (texts.length < 3) texts.push(pads[k++]);
    return texts;
  }

  function topFactors(c) {
    var sc = schemaFor('WP-02'), items = section(sc, 'factors').items, b = c.battery[0];
    if (!b || !b.answered) return [];
    return items.map(function (it, i) { return { l: it.label.replace(/\s*\(.*\)$/, ''), v: b.answers[i] }; }).filter(function (x) { return x.v != null && x.v >= 3; }).sort(function (a, b2) { return b2.v - a.v; }).map(function (x) { return x.l; }).slice(0, 3);
  }

  var DOESNT = {
    'WP-01': 'It doesn’t show how hard a task felt, the planning and remembering behind it, or anything before this week. Minutes are rough, and a share is not a score on anyone.',
    'WP-02': 'It doesn’t say why anyone feels the way they do, or what anyone should feel. It is a gut-check about the last day or two, not a clinical test.',
    'WP-03': 'It doesn’t show whether each owner has the time, or whether the split feels fair. It only shows whether ownership is clear.',
    'WP-04': 'It doesn’t tally what anyone owes. A task with no owner is a gap in the setup, not a verdict on the person who kept covering it.',
    'WP-09': 'It doesn’t judge the message you received or the person who sent it. It checks your side of the conversation only.',
    'WP-11': 'It doesn’t measure calm, and it isn’t treatment. It is a plan made ahead of time, so a pause is never mistaken for walking out.',
    'WP-13': 'It doesn’t settle anything. Anything that needs a real discussion waits for the weekly catch-up.'
  };

  function wpSection(code, c, v, RP) {
    var R = c.R, s = { code: code, name: NAMES[code], title: (schemaFor(code, c.road) || {}).title, entered: [], shows: [], doesnt: DOESNT[code], next: '', status: 'blank', ask: RP && RP.ask ? RP.ask[code] : '' };
    var P = c.P;
    if (code === 'WP-01') {
      var w = c.wp01 || {};
      if (!w.filled) { s.next = R.refusalsOnly ? 'Draft one kind no for a real request coming up: why the request is fair, what you have left, and what you can offer instead.' : 'Log one ordinary week, 5 to 7 days: each ' + v.task + ', who did it and rough minutes. No discussing it until the week is done.'; return s; }
      s.status = 'filled';
      if (!R.refusalsOnly) {
        s.entered.push(['Rows logged', w.logged ? String(w.logged) : 'Not filled in']);
        s.entered.push(['Minutes with a name', w.total ? fmt(w.total, 0) + ' minutes in ' + w.rowsUsed + ' rows' : 'Not filled in']);
        if (w.total) P.list.forEach(function (p) { s.entered.push([p.label, fmt(w.minutes[p.i], 0) + ' min (' + Math.round(w.shares[p.i]) + '%), ' + fmt(w.noticed[p.i], 0) + ' noticed and handled without being asked']); });
        if (w.wb != null) s.shows.push('Workload balance ' + fmt(w.wb) + (c.n === 2 ? ' (1 minus the gap between the two shares).' : ' (1 minus the share of time that would have to change hands for an even split, out of the most it could be).') + ' ' + (w.wb >= 0.7 ? 'The logged work was fairly even.' : w.wb >= 0.4 ? 'The logged work leaned toward one side.' : 'Most of the logged work landed on one side.'));
        else s.shows.push('No balance score yet: it needs rows with both a name and minutes. An empty log is not an even week.');
        if (w.total) {
          var nt = w.noticed.reduce(function (a, b) { return a + b; }, 0);
          if (nt > 0) s.shows.push(Math.round(nt / w.total * 100) + '% of the logged minutes were noticed and handled without anyone asking: the quiet work that usually goes unseen.');
        }
        if (w.unmatched && w.unmatched.length) s.shows.push('Left out because the name didn’t match anyone: ' + list(w.unmatched.map(function (x) { return '“' + x + '”'; })) + '.');
        s.next = w.wb != null && w.wb < 0.7 ? 'Bring the log to ' + v.meeting + ' and ask one question: which ' + v.task + ' would the busiest person most like to hand over?' : 'Run the same log again in a month and compare. The change matters more than the number.';
      }
      if (c.refusals && c.refusals.length) {
        s.entered.push(['Kind no’s drafted', String(c.refusals.length)]);
        s.shows.push('You have ' + plural(c.refusals.length, 'kind no') + ' ready: ' + c.refusals.map(function (r) { return '“' + [r.ack, r.cap, r.alt].filter(Boolean).join(' ') + '”'; }).slice(0, 2).join('  ') + (R.solo ? ' Saying no to one thing is how you say yes to your own battery.' : ''));
        if (R.refusalsOnly) s.next = 'Say one of them out loud this week, lightly, to a small request first.';
      } else if (R.refusalsOnly) { s.status = 'blank'; s.next = 'Draft one kind no for a real request coming up.'; }
      return s;
    }
    if (code === 'WP-02') {
      var any = c.battery.some(function (b) { return b.answered || b.source; });
      if (!any) { s.next = R.solo ? 'Take one minute with the battery meter tomorrow morning. Just notice; change nothing yet.' : 'Each person fills in their own, about themselves, on the same day.'; return s; }
      s.status = 'filled';
      c.battery.forEach(function (b) {
        s.entered.push([R.solo ? 'Your answers' : b.label, b.score != null ? (b.source === 'shared' ? 'Score shared: ' + fmt(b.score) : b.answers.join(' + ') + ' = ' + b.sum + ', ÷ 20 = ' + fmt(b.score)) : (b.answered ? b.answered + ' of 5 answered (a score needs all five)' : 'Not filled in')]);
      });
      c.battery.forEach(function (b) { if (b.score != null) s.shows.push((R.solo ? 'Your battery' : b.label) + ': ' + fmt(b.score) + ', ' + b.band.label.toLowerCase() + '. ' + (b.band.key === 'high' ? 'A way to press pause, not a way out: “let’s come back to this tomorrow.”' : b.band.key === 'medium' ? 'Worth a heads-up before a hard conversation.' : 'Whatever comes up is probably about the thing itself.')); });
      if (!R.solo && c.calc.asSrc === 'WP-02') s.shows.push('Average across all ' + c.n + ' people: ' + fmt(c.calc.as) + '. This is the stress input to CALC-01.');
      else if (!R.solo && c.calc.applies) s.shows.push('No average yet: still waiting on ' + list(c.battery.filter(function (b) { return b.score == null; }).map(function (b) { return b.label; })) + '. CALC-01 never works it out while anyone\u2019s battery is missing.');
      if (R.solo) { var tf = topFactors(c); if (tf.length) s.shows.push('Scored 3 or 4: ' + list(tf.map(function (x) { return x.toLowerCase(); })) + '.'); }
      var hi = c.battery.filter(function (b) { return b.band && b.band.key === 'high'; });
      s.next = hi.length ? (R.solo ? 'This week, before any hard conversation, reach for your first settling default and say your number out loud.' : 'Agree that anyone at 0.60 or above can say “not today” and name a time instead, with no explanation needed.') : 'Keep it to one minute a day for a week. Patterns show up fast.';
      return s;
    }
    if (code === 'WP-03') {
      var t = c.wp03;
      if (!t.filled) { s.next = 'Sit down once, with the week’s log if you have it, and give every recurring ' + v.task + ' exactly one Responsible and one Accountable name.'; return s; }
      s.status = 'filled';
      s.entered.push([c.road === 'coworkers' ? 'Team tasks listed' : 'Tasks listed', String(t.tasks)]);
      s.entered.push(['Both names filled in', t.owned + ' of ' + t.tasks]);
      P.list.forEach(function (p) { if (t.byOwner[p.i]) s.entered.push([p.label + ' (Responsible)', plural(t.byOwner[p.i], 'task')]); });
      s.shows.push(t.oc != null ? 'Ownership clarity ' + fmt(t.oc) + '. ' + (t.oc >= 0.8 ? 'Almost everything has a clear owner.' : t.oc >= 0.5 ? 'Most things are owned; a few are still floating.' : 'More than half of the list is still unowned or half-owned.') : 'No tasks listed, so there is no clarity number (not a zero).');
      if (t.unowned.length) s.shows.push('No owner yet: ' + list(t.unowned) + '.');
      if (t.half.length) s.shows.push('Only one of the two names: ' + list(t.half) + '.');
      if (t.unmatched.length) s.shows.push('Names that didn’t match anyone on the road: ' + list(t.unmatched.map(function (x) { return '“' + x + '”'; })) + '. They still count as owned.');
      if (c.road === 'coworkers') s.shows.push('Owners are team roles for recurring tasks. They describe the setup, not how well anyone is doing.');
      s.next = t.unowned.length || t.half.length ? 'At ' + v.meeting + ', take the unowned list first and ask for one volunteer per ' + v.task + '. Write it down the same day.' : 'Review it once a month (WP-04), and rework it in writing when life changes.';
      return s;
    }
    if (code === 'WP-04') {
      var d = c.wp04;
      if (!d.filled) { s.next = 'At the end of the month, list what slipped in each week and tick the weeks it came up.'; return s; }
      s.status = 'filled';
      s.entered.push(['Tasks listed', String(d.raw.length)]);
      s.entered.push(['Sorted', d.classified.length ? d.structural + ' structural, ' + d.capacity + ' capacity, ' + d.oneoff + ' one-off' : 'Not filled in']);
      d.raw.forEach(function (r) { s.entered.push([r.task, 'flagged ' + r.times + (r.times === 1 ? ' week' : ' weeks')]); });
      s.shows.push(d.patterns.length ? 'A real pattern (3 or 4 weeks): ' + list(d.patterns.map(function (p) { return p.task; })) + '.' : 'Nothing came up 3 or 4 weeks out of 4.');
      if (d.twice.length) s.shows.push('Came up twice, worth watching: ' + list(d.twice.map(function (p) { return p.task; })) + '.');
      if (d.structural) s.shows.push(plural(d.structural, 'structural gap') + ': fix these on WP-03 in the same sitting.');
      if (d.capacity) s.shows.push(plural(d.capacity, 'capacity issue') + ': the owner can’t keep up. Set a time for that conversation; this page brings it to light but doesn’t replace it.');
      if (d.actions.length) s.shows.push('Actions written down: ' + d.actions.join('; ') + '.');
      s.next = d.structural || d.patterns.length ? 'Give each repeating task a new or clearer owner on WP-03 before you close the look-back.' : 'Do it again next month. A count of structural gaps that falls month after month is the clearest sign the setup is working.';
      return s;
    }
    if (code === 'WP-09') {
      var m = c.wp09;
      if (!m.filled) { s.next = 'Next time something stings, write the fact, the feeling and the ask before you answer.'; return s; }
      s.status = 'filled';
      if (m.who && !R.solo) { var wi = P.resolve(m.who); s.entered.push(['Whose message', typeof wi === 'number' ? P.label(wi) : m.who]); }
      s.entered.push(['Fact', m.fact || 'Not filled in']);
      s.entered.push(['Feeling', m.feeling || 'Not filled in']);
      s.entered.push(['Ask', m.ask || 'Not filled in']);
      if (m.raw) s.entered.push(['Raw reaction (you chose to include it)', m.raw]);
      s.entered.push(['The four checks', m.checks + ' of 4 answered']);
      if (m.parts === 3) s.shows.push('Your message, in order: “' + m.fact + ' ' + m.feeling + ' ' + m.ask + '”');
      else s.shows.push(m.parts + ' of the three parts written. The one that is hardest to write is usually the one that matters most.');
      if (m.advice === 'pause') s.shows.push('The checks suggest pausing first' + (m.satNo ? ': you might read it differently with a lighter battery' : '') + (m.pattern ? (m.satNo ? ', and' : ':') + ' it may be answering an older pattern, not these words' : '') + '. Use a kind “not right now” and come back.');
      else if (m.advice === 'name') s.shows.push('Name the specific task or event first. A message about a pattern is much harder to hear than one about a single thing.');
      else if (m.advice === 'clear') s.shows.push('The checks say you’re clear to respond. Build the reply from the fact, the feeling and the ask.');
      s.next = m.advice === 'pause' ? 'Wait until your battery reads lower, then send the version built from fact, feeling and ask.' : 'Use fact, feeling and ask on one more message this week, and notice how it lands.';
      return s;
    }
    if (code === 'WP-11') {
      var k = c.wp11;
      if (!k.filled) { s.next = 'On an ordinary day, pick your two settling defaults and write one pause line: how you are, how long you need, and when you’ll be back.'; return s; }
      s.status = 'filled';
      s.entered.push(['First default', k.first || 'Not chosen']);
      s.entered.push(['Second default', k.second || 'Not chosen']);
      P.list.forEach(function (p) { s.entered.push([R.solo ? 'Your pause line' : 'Pause line: ' + p.label, k.lines[p.i] || 'Not filled in']); });
      if (k.triggers.length) s.entered.push(['What tends to start it', k.triggers.map(function (t) { return [t.trigger, t.body].filter(Boolean).join(' (felt in: ') + (t.body && t.trigger ? ')' : ''); }).join('; ')]);
      if (k.latest != null) s.shows.push('Latest reading after settling: ' + fmt(k.latest) + (k.before != null ? ' (from ' + fmt(k.before) + ')' : '') + '. ' + (k.ret === 'back' ? 'Under 0.50: go back in, at the time you named.' : k.ret === 'again' ? '0.50 to 0.60, or one round so far: do a second round first.' : 'Still 0.60 or above after two rounds: put it off to a named time. “Tomorrow after dinner” is a real plan; “later” is not.'));
      var missingLines = P.list.filter(function (p) { return !k.lines[p.i]; });
      if (!R.solo && missingLines.length && missingLines.length < c.n) s.shows.push('Pause lines still to write: ' + list(missingLines.map(function (p) { return p.label; })) + '.');
      if (k.first && k.second) s.shows.push('Both defaults are chosen ahead of time, so nobody has to decide in the moment.');
      s.next = !(k.first && k.second) ? 'Choose the missing default on a calm day, and try it once when nothing is wrong.' : R.solo ? 'Say your pause line out loud once this week, even on a small thing, so it feels normal.' : 'Make sure everyone recognizes everyone else’s pause line, so a pause is never mistaken for walking out.';
      return s;
    }
    if (code === 'WP-13') {
      var q = c.wp13;
      if (!q.filled) { s.next = c.road === 'coworkers' ? 'Try the 90-second check-in as a team stand-up for one week: load, one thanks, one ask.' : 'Try it for one week, 90 seconds a day: load, one thanks, one small ask.'; return s; }
      s.status = 'filled';
      s.entered.push(['Check-ins recorded', q.entries + ' of ' + q.possible]);
      P.list.forEach(function (p) { var l = q.loads[p.i]; if (l.Low + l.Medium + l.High) s.entered.push([p.label, l.High + ' high, ' + l.Medium + ' medium, ' + l.Low + ' low']); });
      s.entered.push(['Appreciations', String(q.thanks.length)]);
      var heavy = P.list.filter(function (p) { return q.loads[p.i].High >= 3; });
      if (heavy.length) s.shows.push(list(heavy.map(function (p) { return p.label; })) + ' marked 3 or more high-load days this week. Worth protecting next week.');
      if (q.thanks.length) s.shows.push('Appreciations: ' + q.thanks.slice(0, 3).map(function (t) { return '“' + t[0] + '”'; }).join('  ') + (q.thanks.length > 3 ? '  and ' + (q.thanks.length - 3) + ' more.' : ''));
      if (q.resync.length) s.shows.push('Sore spots moved on: ' + q.resync.map(function (r) { return r.item + (r.to ? ' → ' + r.to : ''); }).join('; ') + '.');
      s.next = q.entries < q.possible / 2 ? 'Aim for most days next week. Short and steady beats long and rare.' : 'Keep it going, and skim the week for anything that came up more than twice.';
      return s;
    }
    return s;
  }

  function calcSection(c, v) {
    var k = c.calc, out = { applies: k.applies, rows: [], lines: [], state: k.state };
    function src(s) { return s === 'yours' ? 'your own number' : s ? 'worked out from ' + s : 'not filled in'; }
    if (k.applies) {
      out.rows.push(['Workload balance (WB)', k.wb != null ? fmt(k.wb) : 'Not filled in', src(k.wbSrc)]);
      out.rows.push(['Ownership clarity (OC)', k.oc != null ? fmt(k.oc) : 'Not filled in', src(k.ocSrc)]);
      out.rows.push(['Average battery (AS)', k.as != null ? fmt(k.as) : 'Not filled in', k.asSrc === 'WP-02' ? 'worked out from WP-02 (all ' + c.n + ' people)' : src(k.asSrc)]);
    }
    out.rows.push(['Retuning (RF)', k.rf != null ? fmt(k.rf) : 'No value', k.friction > 0 ? k.retunes + ' ÷ ' + k.friction + ' friction moments' + (k.capped ? ', capped at 1.00' : '') : (k.friction === 0 ? 'no friction moments: nothing to repair, which is not a zero' : 'not filled in')]);
    if (k.applies) {
      if (k.sol != null) {
        out.lines.push('Solvency = ' + fmt(k.wb) + ' × 0.40 + ' + fmt(k.oc) + ' × 0.35 + (1 − ' + fmt(k.as) + ') × 0.25 = ' + fmt(k.sol) + ': ' + k.solBand.label.toLowerCase() + '.');
        out.lines.push('Apex = ' + (k.apexRebalanced ? '(' + fmt(k.wb) + ' × 0.35 + ' + fmt(k.oc) + ' × 0.30 + (1 − ' + fmt(k.as) + ') × 0.20) ÷ 0.85' : fmt(k.wb) + ' × 0.35 + ' + fmt(k.oc) + ' × 0.30 + (1 − ' + fmt(k.as) + ') × 0.20 + ' + fmt(k.rf) + ' × 0.15') + ' = ' + fmt(k.apex) + ': ' + k.apexBand.label.toLowerCase() + '.');
        out.lines.push('Where the points went: ' + k.terms.map(function (t) { return t.key + ' gives up ' + fmt(t.short, 3); }).join(', ') + '. The biggest gap is ' + k.worst.fix + '.');
        if (k.sol < 0.4 && k.apex < 0.4) out.lines.push('Both scores are low at the same time. In that pattern, one more worksheet probably isn’t what helps most. It may be worth asking someone neutral that everyone trusts to help you rework the setup together.');
      } else {
        out.lines.push('No read yet. Still needed: ' + k.missing.join('; ') + '. The calculator never fills a gap with a guess.');
      }
      out.lines.push('Bands: 0.70 and up, carrying its own weight; 0.40 to 0.69, something is drifting; under 0.40, can’t last as it is set up now. Round numbers, not hard lines.');
    } else {
      out.lines.push('On this road CALC-01’s full read isn’t worked out: it reads how a workload is shared between people. Your battery and your retuning count are the numbers that fit.');
    }
    return out;
  }

  // The part of the report written for this road.
  function roadPart(c, v, RP, sp) {
    var R = c.R, out = { heading: '', paras: [], suggestions: [], look: RP ? RP.look : [], talk: RP ? RP.talk : [], talkTitle: R.solo ? 'Questions to sit with' : 'Conversation starters', together: RP ? RP.together : null, links: [] };
    function sug(t) { out.suggestions.push(t); }
    if (R.solo) {
      out.heading = 'Just you: understanding yourself';
      out.paras.push('This road is about you: how full your battery runs, how you’re wired, the patterns in your weeks, what is in your control, and how to explain yourself to the people around you. It is for you first; share any page only if you want to.');
      var b = c.battery[0];
      out.blocks = [];
      out.blocks.push(['Your battery', b.score != null ? 'It reads ' + fmt(b.score) + ' (' + b.band.label.toLowerCase() + ').' + (topFactors(c).length ? ' The biggest contributors right now: ' + list(topFactors(c).map(function (x) { return x.toLowerCase(); })) + '.' : '') : 'Not filled in yet. One minute with WP-02 is the best first step.']);
      var wired = c.notes.wiring.filter(function (l) { return l.picked.length; });
      out.blocks.push(['Your wiring', wired.length ? wired.map(function (l) { return l.q + ': ' + l.picked.join(', ').replace(/\.$/, ''); }).join('. ') + '.' : 'Not filled in yet. The Wiring Card (or the self-notes page of your package) takes five minutes.']);
      var wx = c.notes.weather;
      var pat = [];
      if (wx.length) {
        var skies = {}; wx.forEach(function (w) { if (w.sky) skies[w.sky] = (skies[w.sky] || 0) + 1; });
        var topSky = Object.keys(skies).sort(function (a, b2) { return skies[b2] - skies[a]; })[0];
        if (topSky && skies[topSky] * 2 > wx.length) pat.push('Most weeks the sky read ' + topSky.toLowerCase() + ' (' + skies[topSky] + ' of ' + wx.length + ').');
        else if (topSky) pat.push('The sky varied from week to week: ' + list(Object.keys(skies).map(function (k) { return k.toLowerCase(); })) + '.');
        var short = wx.filter(function (w) { return w.sleep === 'Barely slept' || w.sleep === 'Short night'; }).length;
        if (short) pat.push(plural(short, 'week') + ' started on short sleep, the single strongest signal in the weather check.');
        var heavy = wx.filter(function (w) { return w.pressure === 'Heavy'; }).length;
        if (heavy) pat.push(plural(heavy, 'week') + ' already felt heavy before anything happened.');
      }
      if (c.wp11 && c.wp11.triggers.length) pat.push('What tends to start it: ' + list(c.wp11.triggers.map(function (t) { return t.trigger; }).filter(Boolean)) + '.');
      out.blocks.push(['Your patterns', pat.length ? pat.join(' ') : 'Not enough weeks logged to see a pattern yet. Four weekly check-ins is plenty.']);
      var ctrl = [];
      if (c.wp11 && (c.wp11.first || c.wp11.second)) ctrl.push('your settling defaults (' + list([c.wp11.first, c.wp11.second].filter(Boolean).map(function (x) { return x.toLowerCase(); })) + ')');
      if (c.wp11 && c.wp11.lines[0]) ctrl.push('your pause line');
      if (c.refusals && c.refusals.length) ctrl.push('your kind no’s');
      ctrl.push('when you have a hard conversation (after reading your battery, not before)');
      ctrl.push('how you phrase it: fact, feeling, ask');
      out.blocks.push(['What’s in your control', 'Not how anyone else feels or answers. But ' + list(ctrl) + '.']);
      var card = explainCard(c);
      out.blocks.push(['Explaining yourself to others', card ? 'A few lines you could share' + (c.who.others ? ' (you named: ' + c.who.others + ')' : '') + ', in your own words: ' + card : 'Once your Wiring Card has a few lines, the report turns them into a short note you can share, in your own words.']);
      out.links = [['Know yourself', '/know-yourself.html'], ['Make a Wiring Card', '/wiring-card.html'], ['Today’s Weather', '/quick-checks.html#today'], ['The Five Pillars', '/five-pillars.html']];
      if (b.score != null && b.band.key === 'high') sug('Your battery is high. This week, protect it: one kind no, one early night, and no big decisions that can wait.');
      if (!c.notes.wiringLines) sug('Fill in the Wiring Card. It is the fastest way to explain yourself without having to explain everything.');
      if (c.wp09 && c.wp09.advice === 'pause') sug('Hold that message for now. Come back to it when your battery is lower.');
      if (!(c.wp11 && c.wp11.first)) sug('Pick your two settling defaults on a calm day, so they are ready on a hard one.');
      sug('Read the Know Yourself page for more ways into self-understanding, all at your own pace.');
      return out;
    }
    out.heading = 'For ' + v.group + ': ' + R.label.toLowerCase();
    if (RP) { out.paras.push(RP.what); out.paras.push(RP.lens); }
    if (sp && sp.care) out.paras.push(sp.care);
    var t = c.wp03, k = c.calc;
    if (c.road === 'coworkers') {
      if (t && t.filled && (t.unowned.length || t.half.length)) sug('Bring the unowned team tasks (' + list(t.unowned.concat(t.half).slice(0, 4)) + ') to the next retrospective and ask for one volunteer owner each. An owner is a team role, not a rating.');
      if (t && t.filled && c.road === 'coworkers') sug('Consulted and Informed can be a group, like "the whole team". Only Responsible and Accountable need one name each.');
      if (c.wp13 && c.wp13.filled) sug('Keep the 90-second stand-up: load, one thanks, one ask. Anything bigger goes to the weekly catch-up, not the stand-up.');
      sug('Battery pages are private on this road. Share a number only if you want to, and never use one to rate a teammate.');
      if (c.wp09 && c.wp09.filled) sug('Before a charged chat or email goes out, run it through fact, feeling and ask. Would it read calmly to someone having a hard day?');
    } else if (c.road === 'partners') {
      if (k.wb != null && k.wb < 0.7) sug('Ask each other: which job would you most like to hand over, and what would make that fair? Then change one owner, not ten.');
      if (t && t.unowned.length) sug('Give the unowned jobs (' + list(t.unowned.slice(0, 4)) + ') an owner tonight, one each, in writing.');
      sug('Say your battery number before any hard talk. If either of you is at 0.60 or above, name a time instead.');
      if (c.wp13 && c.wp13.thanks.length) sug('Read your appreciations to each other once this week. They are the part of the week that is easiest to forget.');
    } else if (c.road === 'family') {
      sug('Share this only with the adults it concerns, at a quiet time. Start with what’s working, then pick one thing to change.');
      if (t && t.unowned.length) sug('Ask the family: which of these do we each assume someone else is doing? ' + list(t.unowned.slice(0, 4)) + '.');
      sug('Agree on one pause line the whole family recognizes, before the next gathering.');
      sug('Never ask a child to keep track of what an adult does. These pages are for the grown-ups.');
    } else if (c.road === 'coparents') {
      sug('Keep your child out of it, and keep each conversation to one topic: usually the next handoff or one slipping kid task.');
      if (t && t.unowned.length) sug('Give each unowned kid task exactly one parent: ' + list(t.unowned.slice(0, 4)) + '.');
      sug('Before a message goes to the other home, ask: would this read calmly if our child saw it one day?');
      sug('A court order or parenting plan always comes first, and these pages are never evidence or for building a case.');
    } else if (c.road === 'friends') {
      sug('Choose one thing that went unseen, and say it once, lightly, in one sentence.');
      if (c.wp09 && c.wp09.parts === 3) sug('Your fact, feeling and ask are ready. Could you say it over coffee? If so, it is the right size.');
      sug('Check your own battery first. Sometimes it was the week, not the friendship.');
      sug('This isn’t a ledger of favors. A good friendship can hold one honest sentence.');
    } else if (c.road === 'roommates') {
      sug('Bring the at-a-glance page to the next house meeting. One thanks each, then one chore to rebalance.');
      if (t && t.unowned.length) sug('Chores with no owner yet: ' + list(t.unowned.slice(0, 4)) + '. Rotating by week or by room is fine; just write it down.');
      if (c.wp04 && c.wp04.patterns.length) sug('The same thing keeps coming back (' + list(c.wp04.patterns.map(function (p) { return p.task; }).slice(0, 2)) + '). Give it a new owner rather than another reminder.');
      sug('No call-outs: every point for the meeting goes through fact, feeling and ask first.');
    } else if (c.road === 'caregivers') {
      var low = c.battery.filter(function (b) { return b.band && b.band.key === 'high'; });
      if (low.length) sug(list(low.map(function (b) { return b.label; })) + (low.length === 1 ? ' is' : ' are') + ' running near empty. That is a signal to get more support, not a failing. Which part of the care could someone else take this week?');
      if (t && t.unowned.length) sug('Put one name next to each part of the care that doesn’t have one: ' + list(t.unowned.slice(0, 4)) + '.');
      sug('For anything about health or medicines, follow the care team’s instructions. These pages are about who owns each task.');
      sug('At each handoff, say what the next person needs to know, in one or two lines.');
    }
    out.links = [['The Five Pillars', '/five-pillars.html'], ['Check-ins', '/check-ins.html'], ['The Signal Translator', '/signal-translator.html'], ['CALC-01', '/calc01-solvency.html']];
    return out;
  }

  // A short, kind note built from the Wiring Card, in the first person.
  function explainCard(c) {
    var w = {}; c.notes.wiring.forEach(function (l) { w[l.id] = l.picked; });
    var bits = [];
    function lc(x) { return x.charAt(0).toLowerCase() + x.slice(1); }
    if (w.receive && w.receive.length) bits.push('I take things in best ' + list(w.receive.map(lc)).replace(/^in /, 'in ') + '.');
    if (w.time && w.time.length) bits.push('Give me ' + lc(w.time[0]).replace(/^a few/, 'a few') + ' to answer.');
    if (w.quiet && w.quiet.length) bits.push('If I go quiet, it usually means ' + lc(w.quiet[0]).replace(/^i’m/, 'I’m').replace(/^i /, 'I ') + '.');
    if (w.ask && w.ask.length) bits.push('A request lands best as ' + lc(w.ask[0]) + '.');
    if (w.avoid && w.avoid.length) bits.push('Please avoid ' + list(w.avoid.map(lc)) + '.');
    if (w.depleted && w.depleted.length) bits.push('When I’m running low, ' + lc(w.depleted[0]) + ' helps.');
    return bits.length ? '“' + bits.join(' ') + '”' : '';
  }

  function pillarView(c, v) {
    var R = c.R, k = c.calc, rows = [];
    function avg(a) { a = a.filter(function (x) { return x != null && !isNaN(x); }); return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }
    var b0 = c.battery.filter(function (b) { return b.score != null; });
    var ev = {
      I: R.solo ? avg([c.wp02.filled ? 1 : 0, c.notes.weather.length ? c.notes.weather.length / WEATHER_WEEKS : null]) : k.wb,
      II: R.solo ? avg([c.wp11 && c.wp11.filled ? ((c.wp11.first ? 0.5 : 0) + (c.wp11.second ? 0.5 : 0)) : null, c.refusals ? (c.refusals.length ? 1 : (c.wp01 && c.wp01.filled ? 0 : null)) : null])
        : avg([k.oc, c.wp04 && c.wp04.classified.length ? 1 - c.wp04.structural / c.wp04.classified.length : null]),
      III: avg([b0.length ? 1 - avg(b0.map(function (b) { return b.score; })) : null, c.wp11 && c.wp11.latest != null ? (c.wp11.latest < 0.5 ? 1 : c.wp11.latest < 0.6 ? 0.5 : 0) : null]),
      IV: avg([k.rf, c.wp09 && c.wp09.filled ? c.wp09.parts / 3 : null, c.notes.wiringLines ? c.notes.wiringLines / 9 : null]),
      V: avg([c.wp13 && c.wp13.entries ? c.wp13.thanks.length / c.wp13.entries : null, c.wp04 && c.wp04.raw.length ? 1 - c.wp04.patterns.length / c.wp04.raw.length : null, !R.solo && c.wp03 && c.wp03.filled && c.wp03.tasks ? 1 - (c.wp03.unowned.length / c.wp03.tasks) : null])
    };
    var from = {
      I: R.solo ? 'WP-02 and your weather log' : 'workload balance (WP-01)',
      II: R.solo ? 'your Calm-Down Kit defaults and kind no’s' : 'ownership clarity (WP-03)' + (c.wp04 ? ' and the monthly look-back (WP-04)' : ''),
      III: 'battery scores (WP-02)' + (c.wp11 ? ' and coming back after settling (WP-11)' : ''),
      IV: 'fact, feeling and ask (WP-09), your retuning count' + (c.notes.wiringLines ? ' and your Wiring Card' : ''),
      V: R.solo ? 'what keeps slipping' : 'appreciations (WP-13), repeat slips (WP-04) and unclaimed ' + v.tasks
    };
    PILLARS.forEach(function (p) {
      var val = ev[p.n];
      rows.push({ n: p.n, name: p.name, anchor: p.anchor, field: p.field, value: val, from: from[p.n], inYou: p.inYou, between: fill(R.solo ? p.betweenSelf : p.between, v) });
    });
    var scored = rows.filter(function (r) { return r.value != null; });
    var out = { rows: rows, strongest: null, care: null, note: '' };
    if (scored.length >= 2) {
      var sorted = scored.slice().sort(function (a, b) { return b.value - a.value; });
      out.strongest = sorted[0];
      out.care = sorted[sorted.length - 1];
      if (out.strongest.value - out.care.value < 0.05) out.note = 'The pillars you filled in read about the same. None stands out as needing more care than the others.';
    } else {
      out.note = 'Not enough is filled in to compare the pillars yet. Two or three pages is enough to start.';
    }
    return out;
  }

  // A 4 to 6 week plan, built from the gaps, then from this road's own weeks.
  function plan(c, v, sp) {
    var R = c.R, k = c.calc, weeks = [];
    function add(pri, title, wp, doIt, pillar) { weeks.push({ p: pri, title: title, wp: wp, do: doIt, pillar: pillar }); }
    var hi = c.battery.filter(function (b) { return b.band && b.band.key === 'high'; });
    if (hi.length || (k.as != null && k.as >= 0.45)) add(9, R.solo ? 'Protect your battery' : 'Protect the batteries', 'WP-02, WP-11', R.solo ? 'One minute with the battery meter each morning. On any day at 0.60 or above, use a settling default before anything hard, and put off what can wait.' : 'Everyone does the battery meter daily and says their number before any hard talk. At 0.60 or above, name a time instead.', 'III');
    if (!R.solo && c.wp03 && ((c.wp03.filled && (c.wp03.unowned.length || c.wp03.half.length)) || (!c.wp03.filled && R.calc))) add(8, 'One owner for every ' + v.task, 'WP-03', c.wp03.filled ? 'Give each of these exactly one Responsible and one Accountable name: ' + list(c.wp03.unowned.concat(c.wp03.half).slice(0, 5)) + '.' : 'Sit down once and give every recurring ' + v.task + ' exactly one owner.', 'II');
    if (!R.solo && R.calc && (k.wb == null || k.wb < 0.7)) add(7, 'See the whole load', 'WP-01', k.wb == null ? 'Log one ordinary week of who did what, with rough minutes. No discussing it until the week is done.' : 'Log another week and compare. Then hand over one ' + v.task + ' from the busiest person.', 'I');
    if (c.wp04 && c.wp04.patterns.length) add(7, 'Fix what keeps slipping', 'WP-04, WP-03', 'Give ' + list(c.wp04.patterns.map(function (p) { return p.task; }).slice(0, 3)) + ' a new or clearer owner, then watch it for a month.', 'V');
    if (c.wp09 && (!c.wp09.filled || c.wp09.advice === 'pause' || (k.rf != null && k.rf < 0.5))) add(6, 'Say it so it lands', 'WP-09', 'Put one charged message a week through fact, feeling and ask before it goes out. Count the friction moments and how many you retuned.', 'IV');
    if (c.wp11 && !(c.wp11.first && c.wp11.second)) add(5, 'Your calm-down kit', 'WP-11', 'On a calm day, pick two settling defaults and write a pause line: how you are, how long you need, when you’ll be back.', 'III');
    if (c.wp13 && (!c.wp13.filled || c.wp13.thanks.length < c.n)) add(5, c.road === 'coworkers' ? 'A short daily stand-up' : 'The 90-second check-in', 'WP-13', 'Every day for a week: load, one thanks, one small ask. No debating.', 'V');
    if (R.solo && !c.notes.wiringLines) add(6, 'Know your wiring', 'Wiring Card', 'Fill in the Wiring Card, then read it back and change anything that isn’t quite true. See /know-yourself.html for more.', 'IV');
    if (R.solo && c.notes.weather.length < 2) add(4, 'Notice your weather', 'Today’s Weather', 'Once a week, check the sky, the pressure and your sleep. Just notice.', 'I');
    if (c.refusals && !c.refusals.length && c.on['WP-01']) add(4, 'Kind ways to say no', 'WP-01 Part B', 'Draft one kind no, then try it on a small request.', 'II');
    weeks.sort(function (a, b) { return b.p - a.p; });
    weeks = weeks.slice(0, 5);
    // top up from the road's own week-by-week plan
    var seen = {}; weeks.forEach(function (w) { seen[w.title] = true; w.wp.split(', ').forEach(function (x) { seen[x] = true; }); });
    (sp && sp.weeks || []).forEach(function (w) {
      if (weeks.length >= 4) return;
      var wps = (w[1] || []).join(', ');
      if (seen[w[0]] || (w[1] && w[1].length && w[1].every(function (x) { return seen[x]; }))) return;
      weeks.push({ p: 0, title: w[0], wp: wps || 'Talk', do: w[3], pillar: '' });
      seen[w[0]] = true;
    });
    while (weeks.length < 3) weeks.push({ p: 0, title: 'Keep the rhythm', wp: 'WP-02', do: 'Keep what is working, and notice one thing you appreciated each day.', pillar: 'V' });
    weeks.push({ p: -1, title: 'Look back', wp: 'Full path report', do: 'Fill in the pages again, make a new report, and compare it with this one. Name one thing that changed, one that didn’t, and one to keep practicing.', pillar: 'I' });
    return weeks.slice(0, 6).map(function (w, i) { return { week: i + 1, title: w.title, wp: w.wp, do: w.do, pillar: w.pillar }; });
  }

  function notesSection(c, v) {
    var n = c.notes, out = { wiring: n.wiring.filter(function (l) { return l.picked.length; }), weather: n.weather, name: n.name, card: explainCard(c) };
    out.filled = !!(out.wiring.length || out.weather.length);
    return out;
  }

  global.TOLFullPath = {
    NS: NS, FORMAT: FORMAT, VERSION: PKG_VERSION, ROADS: ROADS, ROAD_ORDER: ROAD_ORDER, NAMES: NAMES, PILLARS: PILLARS, MAX_PEOPLE: MAX_PEOPLE, MIN_PEOPLE: MIN_PEOPLE,
    build: build, blankData: blankData, fromFields: fromFields, fromJSON: fromJSON, readReport: readReport, canonical: canonical,
    compute: compute, report: report, people: people, roleOf: roleOf, clampPeople: clampPeople, isoDate: isoDate, num: num, fmt: fmt, namesOf: namesOf
  };
})(typeof window !== 'undefined' ? window : globalThis);
