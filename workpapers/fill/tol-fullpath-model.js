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
  // Roughly how many times a week a job comes up, by its "How often" on One owner per job
  var KID_ROADS = { family: true, coparents: true };
  var FREQ_WEIGHT = { Daily: 7, 'Each meeting': 2, Weekly: 1, Monthly: 0.25, 'As needed': 0.5, Ongoing: 1 };

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
  // For matching names: no accents, no case ("José" = "Jose").
  function fold(s) { return trim(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  // "Tom and Aoife", "Tom & Aoife", "Tom, Aoife", "Tom/Aoife", "Tom + Aoife": more than one name.
  var SEVERAL_RE = /\s*(?:,|&|\+|\/|\band\b)\s*/i;
  // "a, b, c and 2 more": never a count that doesn't match what is listed.
  function listSome(arr, k) { arr = arr.filter(Boolean); return arr.length > k ? arr.slice(0, k).join(', ') + ' and ' + (arr.length - k) + ' more' : list(arr); }
  // End someone's words with a full stop, so fact, feeling and ask read as sentences when joined.
  function sentence(t, ask) {
    t = trim(t);
    if (!t) return '';
    t = t.charAt(0).toUpperCase() + t.slice(1);
    if (/[.!?\u2026\u201D"')]$/.test(t)) return t;
    return t + (ask && /^(could|can|would|will|shall|may|do|does|is|are)\b/i.test(t) ? '?' : '.');
  }
  function feelingSentence(t) {
    t = trim(t);
    if (!t) return '';
    if (!/^(i|i'm|i\u2019m|im|i've|i\u2019ve|my|we|we're|we\u2019re|it|this|that|feeling|felt)\b/i.test(t) && t.split(/\s+/).length <= 5) t = 'I feel ' + t.charAt(0).toLowerCase() + t.slice(1);
    return sentence(t);
  }
  function said(parts) { return parts.filter(Boolean).join(' '); }
  function numWord(n) { return ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] || String(n); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }

  /* ------------------------------------------------------------ roads */

  var NAMES = {
    'WP-01': 'Who did what', 'WP-02': 'How much are you carrying?', 'WP-03': 'One owner per job',
    'WP-04': 'What keeps coming back?', 'WP-09': 'Say it so it lands', 'WP-11': 'The Calm-Down Kit', 'WP-13': 'The 90-second daily check-in'
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
      wps: ['WP-03', 'WP-09', 'WP-13', 'WP-01', 'WP-02', 'WP-11', 'WP-04'], calc: true
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
      wps: ['WP-03', 'WP-13', 'WP-01', 'WP-09', 'WP-04', 'WP-02', 'WP-11'], calc: true
    },
    coworkers: {
      label: 'Coworkers', roles: ['You', 'Teammate'], more: 'Teammate',
      one: 'teammate', many: 'teammates', group2: 'the two of you', groupN: 'the team', setting: 'on the team',
      meeting: 'the team retrospective', work: 'the recurring team tasks', task: 'team task', tasks: 'team tasks',
      wps: ['WP-03', 'WP-09', 'WP-13', 'WP-01', 'WP-04', 'WP-02', 'WP-11'], calc: true
    },
    caregivers: {
      label: 'Caregivers', roles: ['You', 'Sibling or co-carer'], more: 'Co-carer',
      one: 'co-carer', many: 'co-carers', group2: 'the two of you', groupN: 'everyone sharing the care', setting: 'in the care',
      meeting: 'the handoff check-in', work: 'the parts of the care', task: 'part of the care', tasks: 'parts of the care',
      wps: ['WP-02', 'WP-03', 'WP-11', 'WP-13', 'WP-09', 'WP-01', 'WP-04'], calc: true
    }
  };
  var ROAD_ORDER = ['self', 'partners', 'family', 'coparents', 'friends', 'roommates', 'coworkers', 'caregivers'];

  function road(id) { return ROADS[id] || null; }
  // focus: the road's other way in, from the Suite ("flat" on Partners: fine, but flat). The report then
  // follows that road's order, and the sheets it marks optional aren't asked for.
  function suitePath(id, focus) {
    var P = global.TOL_SUITE_PATHS;
    var p = P ? P.paths.filter(function (x) { return x.id === id; })[0] || null : null;
    return p && focus && P.variant ? P.variant(p, focus) : p;
  }
  // The workpapers this road's report reads, in its order; on a variant, the variant's order.
  function focusOf(data) { var sp = data && data.focus ? suitePath(data.road, data.focus) : null; return sp && sp.variant ? sp : null; }
  function optionalOf(sp) { var out = {}; if (sp) sp.groups.forEach(function (g) { g.stops.forEach(function (x) { if (x.optional) out[x.wp] = true; }); }); return out; }
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
    { id: 'upset', q: 'When I’m upset, I need', o: [['space', 'Space first, then a return time'], ['company', 'Quiet company'], ['talk', 'To talk it through'], ['plan', 'A written plan'], ['signal', 'A sign that things are still okay']] },
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
      // Family and Co-parents: a child isn't asked for a load score, and the shared numbers don't wait for them
      if (KID_ROADS[ctx.roadId]) fields.push(f('who.p' + (i + 1) + '.child', (roleOf(ctx.roadId, i)) + ' is a child', 'check', { optional: true, half: true }));
    }
    var more = [f('who.started', 'Date you started', 'date', { half: true })];
    if (R.solo) {
      more.push(f('who.context', 'What would you most like to understand about yourself?', 'textarea', { optional: true }));
      more.push(f('who.others', 'Is there anyone you’d like to share what you learn with someday? (Optional. Leave it blank if this is just for you.)', 'text', { optional: true }));
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
      for (i = 0; i < Math.max(10, ctx.sizes.audit || 0); i++) {
        var p = 'wp01.audit.r' + (i + 1) + '.';
        rows.push({ fields: [
          f(p + 'day', 'Day', 'text', { def: DAYS[i] || '', prefill: true, w: 0.7 }),
          f(p + 'task', 'Task noticed or done', 'text', { w: 2.6 }),
          f(p + 'who', 'Who did it', 'person', { both: true, w: 1.3 }),
          f(p + 'minutes', 'Minutes', 'number', { w: 0.8, min: 0 }),
          f(p + 'how', 'How it came up: asked for, or noticed?', 'radio', { options: how, w: 1.7 })
        ] });
      }
      blocks.push({ kind: 'grid', title: 'Part A: Who did what, this week', intro: audit.intro + ' In "Who did it", write a name, an initial, or "Everyone". "Asked for" only means someone mentioned it first; it doesn\u2019t make the person who did it a helper, and the job counts just the same.', rows: rows });
      blocks.push({ kind: 'derived', title: 'Worked out for you', lines: ['Minutes and share for each person, how much was noticed and handled without being asked, and the workload balance score (1 = an even split). This becomes the balance input to CALC-01.'] });
    }
    var kinds = opts(['Capacity check', 'Delegation pivot', 'Time commitment'], ['Capacity', 'Delegation', 'Time']);
    var cards = [];
    for (i = 0; i < Math.max(ctx.road.refusalsOnly ? 3 : 2, ctx.sizes.refusals || 0); i++) {
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
    blocks.push({ kind: 'note', text: (ctx.road.solo ? 'Answer about yourself, based on the last 24 to 48 hours.' : 'Each person fills in their own, about themselves only, based on the last 24 to 48 hours.') + ' 0 = not at all, 4 = very true. It is a gut-check, not a clinical test.' +
      (ctx.n > 1 ? ' If you’d rather keep your answers private, write just your score in the last box instead (it is the five numbers added up, divided by 20).' : '') +
      (privateRoad ? ' On this road, battery pages stay private unless you choose to share.' : '') });
    if (ctx.n > 1) blocks.push({ kind: 'note', private: true, text: shareLine(ctx) });
    for (var i = 0; i < ctx.n; i++) {
      var p = 'wp02.p' + (i + 1) + '.';
      var fl = [f(p + 'date', 'Date', 'date', { half: true })];
      items.forEach(function (it, k) { fl.push(f(p + 'q' + (k + 1), it.label, 'radio', { options: scale, scale: true })); });
      if (ctx.n > 1) fl.push(f(p + 'score', 'Or just your score (0 to 1), if you’d rather not share the five answers', 'number', { min: 0, max: 1, optional: true }));
      fl.push(f(p + 'note', ctx.road.solo ? 'Anything else on your mind right now (optional)' : 'Anything you want to name before talking (optional)', 'textarea', { small: true, optional: true }));
      blocks.push({ kind: 'scale', title: ctx.labels[i] + (ctx.n > 1 ? '’s load score' : ''), person: i, turn: ctx.n > 1, fields: fl });
    }
    blocks.push({ kind: 'derived', title: 'Worked out for you', lines: ['Each load score = the five numbers added up, divided by 20. Under 0.30 is a low load, 0.30 to 0.59 is medium, 0.60 and up is high.', ctx.n > 1 ? 'The average across everyone becomes the stress input to CALC-01. It waits until everyone\u2019s load score is in; it is never worked out for someone else.' : 'On this road it is your own reading, week by week.'] });
    return { id: 'wp02', code: 'WP-02', title: sc.title, blocks: blocks };
  }

  function pageWp03(ctx) {
    var sc = schemaFor('WP-03', ctx.roadId), treaty = section(sc, 'treaty'), blocks = [];
    var ci = treaty.columns.some(function (c) { return c.id === 'c'; });
    var freqs = treaty.columns.filter(function (c) { return c.id === 'freq'; })[0].options;
    var note = sc.sections.filter(function (s) { return s.type === 'note' && s.pdf === false; })[0];
    if (note) blocks.push({ kind: 'note', text: note.text });
    blocks.push({ kind: 'fields', fields: [f('wp03.reviewDate', 'Date of this list', 'date', { half: true })] });
    var defs = treaty.defaultRows || [], rows = [];
    for (var i = 0; i < Math.max(defs.length + 4, ctx.sizes.treaty || 0); i++) {
      var d = defs[i] || {}, p = 'wp03.treaty.r' + (i + 1) + '.';
      var fl = [
        f(p + 'task', 'Job', 'text', { def: d.task || '', w: 2.2 }),
        f(p + 'freq', 'How often', 'text', { def: d.freq || '', w: 1, hint: freqs.join(', ') }),
        f(p + 'r', 'Owner (does it)', 'person', { w: 1.1 }),
        f(p + 'a', 'Helper (optional)', 'person', { w: 1.1 })
      ];
      if (ci) { fl.push(f(p + 'c', 'Consulted', 'text', { w: 1 })); fl.push(f(p + 'i', 'Informed', 'text', { w: 1 })); }
      fl.push(f(p + 'notes', 'Notes', 'text', { def: d.notes || '', w: ci ? 1.1 : 1.8 }));
      rows.push({ fields: fl });
    }
    blocks.push({ kind: 'grid', title: treaty.title, intro: (treaty.intro ? treaty.intro + ' ' : '') + 'Clear the task box on any row that doesn’t apply. How often: ' + freqs.join(', ') + '. Each job needs one owner: write a name or an initial. A helper is optional.', rows: rows });
    blocks.push({ kind: 'derived', title: 'Worked out for you', lines: ['Ownership clarity = the share of jobs that have an owner. This becomes the ownership input to CALC-01. Jobs still missing an owner are listed in your report.'] });
    var amend = [];
    for (i = 0; i < Math.max(2, ctx.sizes.amend || 0); i++) {
      var q = 'wp03.amend.r' + (i + 1) + '.';
      amend.push({ label: 'Change ' + (i + 1), fields: [f(q + 'date', 'Date', 'date', { half: true }), f(q + 'who', 'Who', 'text', { half: true }), f(q + 'change', 'What changed', 'textarea', { small: true })] });
    }
    blocks.push({ kind: 'cards', title: 'Changes to the agreement (optional)', intro: section(sc, 'amendments').intro, rows: amend });
    blocks.push(closing(ctx, 'wp03', section(sc, 'closing').intro));
    return { id: 'wp03', code: 'WP-03', title: sc.title, blocks: blocks };
  }

  // The last lines of a page people settle on together: one box to tick, and an optional date to
  // come back to it. Nothing to sign.
  function closing(ctx, base, intro, personal) {
    var solo = ctx.road.solo || personal; // WP-11 is a personal kit on every road
    var out = { kind: 'fields', title: solo ? 'Where I’ve landed' : 'Where we’ve landed', fields: [
      f(base + '.closing.agreed', solo ? 'I’m going with this' : 'We’re agreed on this', 'check', { optional: true }),
      f(base + '.closing.lookAgain', 'Look at this again on', 'date', { half: true, optional: true })
    ] };
    if (intro) out.intro = intro;
    return out;
  }

  function pageWp04(ctx) {
    var sc = schemaFor('WP-04'), blocks = [], i;
    blocks.push({ kind: 'fields', fields: [f('wp04.month', 'Month', 'text', { half: true, placeholder: 'e.g. September 2026' })] });
    var raw = [];
    for (i = 0; i < Math.max(8, ctx.sizes.raw || 0); i++) {
      var p = 'wp04.raw.r' + (i + 1) + '.';
      raw.push({ fields: [f(p + 'task', 'Task that slipped', 'text', { w: 3.4 }), f(p + 'w1', 'Week 1', 'check', { w: 0.7 }), f(p + 'w2', 'Week 2', 'check', { w: 0.7 }), f(p + 'w3', 'Week 3', 'check', { w: 0.7 }), f(p + 'w4', 'Week 4', 'check', { w: 0.7 })] });
    }
    blocks.push({ kind: 'grid', title: section(sc, 'raw').title, intro: section(sc, 'raw').intro, rows: raw });
    var owner = opts(['Yes', 'No']), kind = opts(['Structural gap', 'Capacity issue', 'One-off, no action'], ['Structural', 'Capacity', 'One-off']);
    var cl = [];
    for (i = 0; i < Math.max(6, ctx.sizes.classify || 0); i++) {
      var q = 'wp04.classify.r' + (i + 1) + '.';
      cl.push({ fields: [f(q + 'task', 'Task', 'text', { w: 1.8 }), f(q + 'owner', 'Named owner?', 'radio', { options: owner, w: 1.1 }), f(q + 'kind', 'What kind of gap', 'radio', { options: kind, w: 2.4 }), f(q + 'action', 'Action', 'text', { w: 1.7 })] });
    }
    blocks.push({ kind: 'grid', title: section(sc, 'classify').title, intro: section(sc, 'classify').intro, rows: cl });
    blocks.push({ kind: 'derived', title: 'Worked out for you', lines: ['Times each task was flagged (3 or 4 weeks is a real pattern, not a fluke), and the count of structural gaps, capacity issues and one-offs.'] });
    blocks.push(closing(ctx, 'wp04'));
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
    var soloFilt = { pattern: 'Am I reacting to what happened just now, or to an old pattern?' };
    blocks.push({ kind: 'fields', title: ctx.road.solo ? 'The filter: before you react' : filt.title, fields: filt.items.map(function (it) { return f('wp09.filter.' + it.id, (ctx.road.solo && soloFilt[it.id]) || it.label, 'radio', { options: ctx.road.solo && it.id === 'pattern' ? opts(it.options).map(function (o, k) { o.label = o.short = ['What just happened', 'An old pattern'][k] || o.label; return o; }) : opts(it.options) }); }) });
    blocks.push({ kind: 'derived', title: 'Worked out for you', lines: ['Your message in order (fact, feeling, ask), and whether the four checks suggest you’re clear to respond or better off pausing first.'] });
    return { id: 'wp09', code: 'WP-09', title: sc.title, blocks: blocks };
  }

  function pageWp11(ctx) {
    var sc = schemaFor('WP-11'), blocks = [], i;
    blocks.push({ kind: 'note', text: (ctx.road.solo ? 'This kit is all about you. The pause plan at the end is the one part you might share with someone close.' : 'Each person\u2019s kit is about themselves, and that part stays theirs. The one part to agree and share is \u201cOur pause plan\u201d: the pause word, the break, and how you come back.') + ' Fill in Part A on an ordinary day, not a hard one. Nothing here works by cold, pain or shock, and none of it is treatment.' });
    blocks.push({ kind: 'fields', fields: [f('wp11.date', 'Date', 'date', { half: true })] });
    var tr = [];
    for (i = 0; i < Math.max(3, ctx.sizes.triggers || 0); i++) tr.push({ fields: [f('wp11.triggers.r' + (i + 1) + '.trigger', 'What tends to start it', 'text', { w: 2.5 }), f('wp11.triggers.r' + (i + 1) + '.body', 'Where my body feels it first', 'text', { w: 2.5 })] });
    blocks.push({ kind: 'grid', title: section(sc, 'triggers').title, intro: section(sc, 'triggers').intro, rows: tr });
    var tac = opts(TACTICS, ['Breathing 4 in, 6 out', 'Naming the room', 'Weight and pressure', 'Gating', 'Walking it out', 'Low, steady sound']);
    blocks.push({ kind: 'fields', title: 'Part A: My two defaults', intro: 'Pick two now, so you don’t have to choose in the moment.', fields: [f('wp11.first', 'First default', 'radio', { options: tac, stack: true }), f('wp11.second', 'Second, if the first isn’t available', 'radio', { options: tac, stack: true })] });
    var lines = [];
    for (i = 0; i < ctx.n; i++) lines.push({ label: ctx.labels[i], fields: [f('wp11.lines.p' + (i + 1) + '.line', 'Pause line', 'textarea', { small: true })] });
    blocks.push({ kind: 'cards', title: 'Part A: ' + (ctx.n > 1 ? 'Pause lines' : 'My pause line'), intro: ctx.road.solo ? 'One sentence, ready ahead of time, for when you need a break from a hard moment, so stepping away feels planned instead of like giving up. Say how you are, how long you need, and what you’ll do next: "I’m at capacity. I’m taking ten minutes, then I’ll come back to this."' : section(sc, 'lines').intro, rows: lines });
    var re = [];
    for (i = 0; i < Math.max(3, ctx.sizes.reentry || 0); i++) {
      var p = 'wp11.reentry.r' + (i + 1) + '.';
      re.push({ fields: [f(p + 'time', 'Time', 'text', { w: 1 }), f(p + 'tactic', 'What I did (1 to 6 from the list, or its name)', 'text', { w: 2.6 }), f(p + 'before', 'Load score before (0 to 1)', 'number', { min: 0, max: 1, w: 1.1 }), f(p + 'after', 'Load score after (0 to 1)', 'number', { min: 0, max: 1, w: 1.1 })] });
    }
    blocks.push({ kind: 'fields', title: ctx.road.solo ? 'My pause plan (yours to share, if you like)' : 'Our pause plan (agree it together, and share it)', intro: (ctx.road.solo ? 'This part is made to be shared with someone close, if you want to.' : 'Unlike the rest of the kit, this part is meant to be agreed together and shared, so a pause is never mistaken for walking out.') + ' A few words in each box is plenty.', fields: [
      f('wp11.plan.word', ctx.road.solo ? 'My pause word or signal' : 'Our pause word or signal', 'text', { half: true, optional: true, placeholder: 'e.g. Timeout, or a hand on the table' }),
      f('wp11.plan.min', 'The shortest break we take', 'text', { half: true, optional: true, placeholder: 'e.g. 20 minutes' }),
      f('wp11.plan.back', 'How we set the time to come back', 'text', { optional: true, placeholder: 'e.g. Whoever pauses names a time, within the day' }),
      f('wp11.plan.first', 'The first sentence when we come back', 'text', { optional: true, placeholder: 'e.g. Thanks for waiting. I\u2019m ready to listen now.' })
    ] });
    blocks.push({ kind: 'grid', title: 'Part C: Coming back', intro: 'After each round, ask yourself one thing: do I still feel hot? If you still feel hot, take another round. If you feel settled enough to listen, ' + (ctx.road.solo ? 'go back to what you were doing.' : 'go back at the time you named.') + ' Still hot after two rounds? Put it off to a named time; that is a plan, not giving up. If you like numbers (WP-02, 0 to 1): under 0.50 go back, 0.50 to 0.59 another round, 0.60 or above after two rounds put it off. The list: 1 breathing, 2 naming the room, 3 weight and pressure, 4 gating, 5 walking it out, 6 low, steady sound.', rows: re });
    blocks.push({ kind: 'fields', fields: [f('wp11.nextAction', 'Next small action', 'text'), f('wp11.resume', ctx.road.solo ? 'If you put it off: when you’ll pick it back up' : 'If you put the conversation off: when you’ll pick it back up', 'text')] });
    blocks.push(closing(ctx, 'wp11', null, true));
    return { id: 'wp11', code: 'WP-11', title: sc.title, blocks: blocks };
  }

  // Who the appreciation is about, in plain words for this road and this many people.
  function otherOne(ctx) {
    if (ctx.roadId === 'coworkers') return ctx.n === 2 ? 'your teammate' : 'a teammate';
    if (ctx.roadId === 'coparents') return ctx.n === 2 ? 'the other parent' : 'someone sharing the parenting';
    if (ctx.roadId === 'caregivers') return ctx.n === 2 ? 'the other person sharing the care' : 'someone sharing the care';
    if (ctx.roadId === 'friends') return ctx.n === 2 ? 'your friend' : 'one of your friends';
    return ctx.n === 2 ? 'the other person' : 'someone at home';
  }
  function wp13Intro(ctx) {
    var who = ctx.n > 1 ? 'Each person fills in only their own rows: yours are the ones with your name in the Person column (' + ctx.labels.join(', ') + '). ' : '';
    return (ctx.roadId === 'coworkers' ? 'Run it like a short stand-up. ' : '') + who + 'Load: "Today I was at about low / medium / high capacity." Appreciation: one specific thing you appreciated about ' + otherOne(ctx) + ' today. The other two are optional. Anything that needs a real discussion waits for the weekly catch-up.' +
      (ctx.n > 1 ? ' If you can, do the evening one face to face or on a call, and kindly.' : '');
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
    blocks.push({ kind: 'grid', title: ctx.roadId === 'coworkers' ? 'The daily stand-up' : section(sc, 'daily').title, intro: wp13Intro(ctx), rows: rows, small: true, perPerson: ctx.n > 1 });
    var to = opts(['RACI Treaty (WP-03)', 'Tone Filter (WP-09)', 'Keep watching'], ['Owners', 'Tone', 'Watch']), rs = [];
    for (var j = 0; j < Math.max(3, ctx.sizes.resync || 0); j++) {
      var q = 'wp13.resync.r' + (j + 1) + '.';
      rs.push({ fields: [f(q + 'item', 'Sore spot that keeps coming up', 'text', { w: 3 }), f(q + 'times', 'Times', 'number', { min: 0, w: 0.7 }), f(q + 'to', 'Move to', 'radio', { options: to, w: 2.2 })] });
    }
    blocks.push({ kind: 'grid', title: section(sc, 'resync').title + ' (optional)', intro: section(sc, 'resync').intro, rows: rs });
    blocks.push(closing(ctx, 'wp13'));
    return { id: 'wp13', code: 'WP-13', title: sc.title, blocks: blocks };
  }

  function pageCalc(ctx) {
    var R = ctx.road, blocks = [];
    blocks.push({ kind: 'note', text: R.calc
      ? 'CALC-01 reads one narrow thing: whether the way ' + (ctx.n > 2 ? R.groupN : R.group2) + ' share ' + R.work + ' right now can keep going. It reads the setup, never a person. Most of it is worked out for you from the pages before this one.'
      : 'On this road, CALC-01 looks at two things about you: how you’re doing before you read anything, and how often you paused to rework a reply before answering.' });
    blocks.push({ kind: 'fields', title: 'Step zero: check your state', intro: 'Pick the one closest to true as you fill this in. It doesn’t change any number. It changes whether today is the day to act on them.', fields: [f('calc.state', 'Right now I’m', 'radio', { options: STATES, stack: true })] });
    if (R.calc) {
      blocks.push({ kind: 'derived', title: 'Worked out for you when you bring this back', lines: [
        'Workload balance (WB), from WP-01: how close the logged minutes come to an even split. 1 = even. With two people it is 1 minus the gap between the two shares; with more, 1 minus the share of time that would have to change hands, out of the most it could be.',
        'Ownership clarity (OC), from WP-03: jobs with an owner, divided by all jobs (starter examples nobody filled in are left out).',
        'Stress (AS), from WP-02: the average load score across everyone. It waits until every person\u2019s load score is in.',
        'Setup score = WB × 0.40 + OC × 0.35 + (1 − AS) × 0.25. 0.70 and up: working well. 0.40 to 0.69: needs a look. Under 0.40: needs a rethink, together. Higher means the setup is working better.',
        'Overall score = WB × 0.35 + OC × 0.30 + (1 − AS) × 0.20 + RF × 0.15, where RF = retunes ÷ friction moments (below).'
      ] });
      blocks.push({ kind: 'fields', title: 'Your own numbers (optional)', intro: 'Only used when the matching workpaper is blank, for example if you used the Lemonade Stand instead of WP-01. Numbers from 0 to 1. Leave blank to use the worked-out numbers.', fields: [
        f('calc.wb', 'Workload balance (0 to 1)', 'number', { min: 0, max: 1, third: true, optional: true }),
        f('calc.oc', 'Ownership clarity (0 to 1)', 'number', { min: 0, max: 1, third: true, optional: true }),
        f('calc.as', 'Average load (0 to 1)', 'number', { min: 0, max: 1, third: true, optional: true })
      ] });
    }
    blocks.push({ kind: 'fields', title: 'Retuning count (RF)', intro: 'Count this week’s friction moments: times something landed badly enough to notice. Then count how many of those you ran through fact, feeling and ask (WP-09) before you answered. No friction is not a zero: it just means there was nothing to repair.', fields: [
      f('calc.friction', 'Friction moments this week', 'number', { min: 0, half: true, optional: true }),
      f('calc.retunes', 'Of those, retuned before answering', 'number', { min: 0, half: true, optional: true })
    ] });
    return { id: 'calc', code: 'CALC-01', title: R.calc ? 'Is the setup working for everyone?' : 'Your state and your retuning count', blocks: blocks };
  }

  // Self-notes. On "Just me" there is one card (self.wiring.*, self.weather.*). With two or more people
  // each person has their own card and log (self.p1.wiring.*, self.p2.weather.*), so nobody's answers
  // mix into someone else's. Files made before that still open: see migrateSelf().
  var SHARE_LINE = 'Your partner will see this page if you share the file. You can leave the private pages out of a copy you share (choose that when you download).';
  function shareLine(ctx) { return ctx.road.solo ? '' : ctx.roadId === 'partners' ? SHARE_LINE : SHARE_LINE.replace('Your partner', 'Everyone you share the file with'); }
  function notesBlocks(ctx, base, who) {
    var blocks = [];
    var sky = opts(['Clear', 'Gusty', 'Fogged in'], ['Clear', 'Gusty', 'Fogged']), press = opts(['Light', 'Building', 'Heavy']), sleep = opts(['Barely slept', 'Short night', 'About enough', 'Properly rested'], ['Barely', 'Short', 'Enough', 'Rested']);
    blocks.push({ kind: 'checks', title: who != null ? ctx.labels[who] + '\u2019s Wiring Card' : 'My Wiring Card', person: who, intro: who != null ? 'Only ' + ctx.labels[who] + ' fills in this card, about themselves. Tick anything true, and add your own words where the list misses.' : 'Tick anything true, and add your own words where the list misses.', groups: WIRING.map(function (line) {
      return { label: line.q, fields: line.o.map(function (o) { return f(base + 'wiring.' + line.id + '.' + o[0], o[1], 'check', { optional: true, person: who }); }).concat([f(base + 'wiring.' + line.id + '.own', 'In my own words', 'text', { optional: true, person: who })]) };
    }) });
    var cards = [];
    for (var i = 0; i < WEATHER_WEEKS; i++) {
      var p = base + 'weather.w' + (i + 1) + '.';
      cards.push({ label: 'Week ' + (i + 1), fields: [
        f(p + 'date', 'Date', 'date', { half: true, optional: true, person: who }),
        f(p + 'battery', 'Load score that day (0 to 1, from WP-02)', 'number', { min: 0, max: 1, half: true, optional: true, person: who }),
        f(p + 'sky', 'The sky (Clear = calm and connected, Gusty = revved up, Fogged in = running on empty)', 'radio', { options: sky, optional: true, person: who }),
        f(p + 'pressure', 'The pressure: what you were already carrying', 'radio', { options: press, optional: true, person: who }),
        f(p + 'sleep', 'Last night\u2019s sleep', 'radio', { options: sleep, optional: true, person: who }),
        f(p + 'note', 'One line about the week', 'text', { optional: true, person: who })
      ] });
    }
    blocks.push({ kind: 'cards', title: who != null ? ctx.labels[who] + '\u2019s weather and load log' : 'Weather and load log', person: who, intro: 'Once a week, the same day if you can. Today\u2019s Weather on the website asks the same questions.', rows: cards });
    return blocks;
  }
  function pageNotes(ctx) {
    var blocks = [];
    blocks.push({ kind: 'note', text: 'Optional, and about you. The Wiring Card says how words reach you best' + (ctx.road.solo ? '. Keep it for yourself, or share it with anyone you choose.' : ', so the people around you can send things in a way that lands. Each person has a card and a log of their own: fill in only your own.') + ' It is not a label and not a diagnosis. The weather log is four quick weekly check-ins.' });
    if (!ctx.road.solo) blocks.push({ kind: 'note', private: true, text: shareLine(ctx) });
    if (ctx.road.solo) {
      blocks.push({ kind: 'fields', fields: [f('self.wiring.name', 'Name on the card', 'text', { half: true, optional: true })] });
      notesBlocks(ctx, 'self.', null).forEach(function (b) { blocks.push(b); });
    } else {
      for (var i = 0; i < ctx.n; i++) notesBlocks(ctx, 'self.p' + (i + 1) + '.', i).forEach(function (b) { blocks.push(b); });
    }
    return { id: 'notes', code: 'NOTES', title: 'Self-notes (optional)', private: true, blocks: blocks };
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
          'Press "Make my report". Nothing you type or choose is sent anywhere: the report is made in your browser.'
        ] }
      ]
    };
  }

  var BUILDERS = { 'WP-01': pageWp01, 'WP-02': pageWp02, 'WP-03': pageWp03, 'WP-04': pageWp04, 'WP-09': pageWp09, 'WP-11': pageWp11, 'WP-13': pageWp13 };

  // The whole package for a road and a number of people, in order.
  var cache = {};
  // sizes (optional): more rows than the printed package has, e.g. { audit: 14 } when a Workpaper
  // Suite log is longer. The field names stay the same pattern (…audit.r14.task).
  var SIZE_KEYS = { audit: 'wp01.audit', refusals: 'wp01.refusals', treaty: 'wp03.treaty', amend: 'wp03.amend', raw: 'wp04.raw', classify: 'wp04.classify', triggers: 'wp11.triggers', reentry: 'wp11.reentry', resync: 'wp13.resync' };
  var SIZE_MAX = 40;
  function cleanSizes(s) {
    var out = {};
    Object.keys(SIZE_KEYS).forEach(function (k) { var v = s && parseInt(s[k], 10); if (v > 0) out[k] = Math.min(SIZE_MAX, v); });
    return out;
  }
  // The rows to read for a table: at least the old fixed count, more when the data has more.
  var SIZE_READ = { audit: 10, refusals: 3, treaty: 20, amend: 2, raw: 8, classify: 6, triggers: 3, reentry: 3, resync: 3 };
  function sizeOf(data, k) { return Math.max(SIZE_READ[k] || 3, (data && data.sizes && data.sizes[k]) || 0); }
  // Which sizes a set of field names needs (from a PDF or a backup that had more rows).
  function sizesFromNames(names) {
    var out = {};
    names.forEach(function (nm) {
      Object.keys(SIZE_KEYS).forEach(function (k) {
        var m = new RegExp('^' + (NS + SIZE_KEYS[k]).replace(/\./g, '\\.') + '\\.r(\\d+)\\.').exec(nm);
        if (m) out[k] = Math.max(out[k] || 0, +m[1]);
      });
    });
    return cleanSizes(out);
  }
  function build(roadId, n, names, sizes) {
    if (!ROADS[roadId]) roadId = 'partners';
    n = clampPeople(roadId, n);
    names = (names || []).slice(0, n);
    sizes = cleanSizes(sizes);
    var key = roadId + ':' + n + ':' + names.join('\u0001') + ':' + JSON.stringify(sizes);
    if (cache[key]) return cache[key];
    var R = ROADS[roadId], ctx = { roadId: roadId, road: R, n: n, names: names, labels: labelsFor(roadId, n, names), sizes: sizes };
    var pages = [pageWho(ctx)];
    R.wps.forEach(function (code) {
      var p = BUILDERS[code](ctx);
      p.name = NAMES[code];
      if (R.solo && code === 'WP-01') { p.name = 'Kind ways to say no'; p.title = 'Kind ways to say no'; }
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

  function blankData(roadId, n, names, sizes) {
    var reg = build(roadId, n, names, sizes), values = {};
    reg.fields.forEach(function (fl) { if (fl.def) values[fl.name] = fl.def; });
    var out = { format: FORMAT, version: PKG_VERSION, road: reg.road, people: reg.n, values: values };
    sizes = cleanSizes(sizes);
    if (Object.keys(sizes).length) out.sizes = sizes;
    return out;
  }
  function regOf(data) { return build(data.road, data.people, namesOf(data), data.sizes); }

  // Fields from any scheme version, mapped onto today's names. v1 is today's.
  // v1 packages made before the closing lines came in had "Initials" on WP-03 changes (now "Who")
  // and sign-off grids at the end of four pages; those are quietly left behind.
  var MIGRATE = {
    1: function (name) { return name.replace(/^(tol\.v1\.wp03\.amend\.r\d+\.)initials$/, '$1who'); }
  };
  var RETIRED = /^tol\.v1\.wp(03\.ratify|04\.signoff|11\.signoff|13\.signoff)\./;
  function canonical(name) {
    var m = /^tol\.v(\d+)\.(.+)$/.exec(String(name || ''));
    if (!m) return null;
    var fn = MIGRATE[+m[1]];
    return fn ? fn(NS + m[2]) : NS + m[2];
  }

  // A typed date to YYYY-MM-DD. "10/7/26", "Oct 7, 2026", and also "Oct 7", "7 October" or "10/7"
  // with no year: those are read as this year, or last year when this year's would still be ahead
  // (a check-in date is never in the future). Date.parse alone reads "Oct 7" as 2001.
  var MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  function ymd(y, m, d) { return y + '-' + ('0' + m).slice(-2) + '-' + ('0' + d).slice(-2); }
  function nearestPast(m, d, now) {
    now = now || new Date();
    var y = now.getFullYear(), t = new Date(y, m - 1, d), lim = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    if (t > lim) y--;
    return ymd(y, m, d);
  }
  function isoDate(v, now) {
    v = String(v == null ? '' : v).trim();
    if (!v || /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    var m = v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
    if (m) { var y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return ymd(y, m[1], m[2]); }
    if (!/\b\d{4}\b/.test(v)) {
      var s = v.toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, '$1').replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim();
      var md = /^(?:[a-z]+day )?([a-z]{3,})\s+(\d{1,2})$/.exec(s) || null, dm = /^(?:[a-z]+day )?(\d{1,2})\s+(?:of )?([a-z]{3,})$/.exec(s);
      var mon = md ? MONTHS.indexOf(md[1].slice(0, 3)) : dm ? MONTHS.indexOf(dm[2].slice(0, 3)) : -1, day = md ? +md[2] : dm ? +dm[1] : 0;
      if (mon >= 0 && day >= 1 && day <= 31) return nearestPast(mon + 1, day, now);
      var sl = /^(\d{1,2})[\/.\-](\d{1,2})$/.exec(s.replace(/ /g, ''));
      if (sl && +sl[1] >= 1 && +sl[1] <= 12 && +sl[2] >= 1 && +sl[2] <= 31) return nearestPast(+sl[1], +sl[2], now);
      return v;
    }
    var t = Date.parse(v);
    if (!isNaN(t)) { var d = new Date(t); return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
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
    migrateSelf(canon, ROADS[roadId].solo);
    if (!(n >= 1)) { n = 0; Object.keys(canon).forEach(function (k) { if (RETIRED.test(k)) return; var m = /\.p(\d)\./.exec(k) || /\.who\.p(\d)$/.exec(k); if (m) n = Math.max(n, +m[1]); }); }
    n = clampPeople(roadId, n);
    var sizes = sizesFromNames(Object.keys(canon)), reg = build(roadId, n, null, sizes), values = {}, unknown = [];
    Object.keys(canon).forEach(function (name) {
      if (name.indexOf(NS + 'meta.') === 0 || RETIRED.test(name)) return;
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
    if (Object.keys(sizes).length) data.sizes = sizes;
    return { data: data, read: readReport(data, { version: version, unknown: unknown, hadMeta: !!canon[NS + 'meta.road'] }) };
  }
  // Self-notes moved from one card for the whole road (self.wiring.*) to one card each (self.p1.wiring.*).
  // An older file's single card goes to the person named on it ("Name on the card"), or else person 1.
  // On "Just me" it is the other way round: a card for person 1 is the one card.
  function migrateSelf(canon, solo) {
    var OLD = /^tol\.v1\.self\.(wiring|weather)\./, NEW = /^tol\.v1\.self\.p(\d)\.(wiring|weather)\./, nameKey = NS + 'self.wiring.name';
    if (solo) {
      Object.keys(canon).forEach(function (k) { var m = NEW.exec(k); if (m && m[1] === '1') { var t = k.replace(/^tol\.v1\.self\.p1\./, NS + 'self.'); if (!(t in canon)) canon[t] = canon[k]; delete canon[k]; } });
      return;
    }
    var keys = Object.keys(canon).filter(function (k) { return OLD.test(k) && k !== nameKey; });
    var nm = fold(canon[nameKey]);
    delete canon[nameKey];
    if (!keys.length) return;
    var idx = 0;
    if (nm) {
      var names = []; for (var i = 1; i <= MAX_PEOPLE; i++) names.push(fold(canon[NS + 'who.p' + i]));
      var hit = names.indexOf(nm);
      if (hit < 0) names.forEach(function (x, j) { if (hit < 0 && x && (x.split(/\s+/)[0] === nm.split(/\s+/)[0] || (nm.length === 1 && x.charAt(0) === nm))) hit = j; });
      if (hit < 0 && nm.length === 1 && CODES.indexOf(nm.toUpperCase()) >= 0) hit = CODES.indexOf(nm.toUpperCase());
      var d = /^(?:p|person\s*)?([1-8])$/.exec(nm); if (hit < 0 && d) hit = +d[1] - 1;
      if (hit >= 0) idx = hit;
    }
    keys.forEach(function (k) { var t = k.replace(/^tol\.v1\.self\./, NS + 'self.p' + (idx + 1) + '.'); if (!(t in canon)) canon[t] = canon[k]; delete canon[k]; });
  }
  function guessRoad(canon) {
    var keys = Object.keys(canon).join(' ');
    if (/wp03\.treaty\.r\d+\.c\b/.test(keys)) return 'coworkers';
    return /wp01\.audit/.test(keys) ? 'partners' : 'self';
  }

  /* ------------------------------------------------------------ from the Workpaper Suite */

  // The sheets someone filled in on the Suite page (its snapshot: road, names, entries), turned into
  // this package's data object, so the full report can be made from them without typing anything twice.
  // Only what was written is carried over; everything else stays blank ("not filled in").
  var FACTOR_IDS = ['sleep', 'work', 'conflict', 'physical', 'time'];
  function fromSuite(snap, keep) {
    if (!snap || !Array.isArray(snap.entries)) return null;
    var roadId = snap.path === 'program' ? 'partners' : snap.path;
    if (!ROADS[roadId]) roadId = 'partners';
    var R = ROADS[roadId], names = (snap.names || []).map(function (x) { return trim(x); });
    var n = clampPeople(roadId, R.solo ? 1 : Math.max(MIN_PEOPLE, names.length)), V = {}, sizes = {};
    names = names.slice(0, n);
    function label(i) { return names[i] || roleOf(roadId, i); }
    function whoName(code) { if (code === 'Both') return 'Everyone'; var i = CODES.indexOf(code); return i >= 0 && i < n ? label(i) : trim(code); }
    function set(k, v) { if (v === true) V[k] = true; else if (v != null && v !== false && trim(v) !== '') V[k] = String(v); }
    function rowsOfT(st, id) { return ((st && st.tables && st.tables[id]) || []).filter(function (r) { return r && Object.keys(r).some(function (k) { return k !== 'day' && k !== 'who' && r[k] !== '' && r[k] != null && r[k] !== false; }); }); }
    function written(en) {
      var v = en.state && en.state.values || {}, t = en.state && en.state.tables || {};
      return Object.keys(v).some(function (k) { return !/^(partner[A-H]|peopleCount|roadPeople|name)$/.test(k) && v[k] !== '' && v[k] != null && v[k] !== false; }) ||
        Object.keys(t).some(function (id) { return rowsOfT(en.state, id).length; });
    }
    function dateOf(en) { var v = en.state.values; return v.date || v.weekOf || v.reviewDate || ''; }
    function latest(list) { list = list.filter(written); if (!list.length) return null; var dated = list.filter(function (e) { return /^\d{4}-\d{2}-\d{2}$/.test(dateOf(e)); }); if (dated.length === list.length) list = list.slice().sort(function (a, b) { return dateOf(a) < dateOf(b) ? -1 : dateOf(a) > dateOf(b) ? 1 : 0; }); return list[list.length - 1]; }
    function personOf(en) {
      if (R.solo) return 0;
      if (typeof en.person === 'number' && en.person < n) return en.person;
      var nm = fold(en.state.values.name);
      for (var i = 0; i < n; i++) if (nm && (fold(names[i]) === nm || fold(roleOf(roadId, i)) === nm)) return i;
      return null;
    }
    // A sheet's closing lines (old drafts may still carry a sign-off table instead; that is left behind)
    function closingFrom(en, base) { var v = en.state.values; if (v.agreed === true) V[base + '.closing.agreed'] = true; set(base + '.closing.lookAgain', v.lookAgain); }
    var by = {};
    snap.entries.forEach(function (e) { if (e && e.state && e.workpaper) (by[e.workpaper] = by[e.workpaper] || []).push(e); });
    var got = [];

    // Each person may log their own week, or their own check-ins, on their own device. The same week
    // brought in from two files is one week: read every sheet for it, never just the last one.
    function weekOf(en) { return trim(en.state.values.weekOf); }
    function sameWeek(list, base) { return list.filter(function (e) { return e !== base && written(e) && (!weekOf(e) || !weekOf(base) || weekOf(e) === weekOf(base)); }); }
    // a row's identity is what is written in it (blank boxes and key order don't make a new row), so the
    // same row brought in from two files is counted once
    function rowKey(r) { var o = {}; Object.keys(r).sort().forEach(function (k) { if (r[k] !== '' && r[k] != null && r[k] !== false) o[k] = typeof r[k] === 'string' ? trim(r[k]).toLowerCase() : r[k]; }); return JSON.stringify(o); }
    var e1 = latest(by['WP-01'] || []);
    if (e1) {
      var also1 = sameWeek(by['WP-01'] || [], e1);
      if (also1.length) {
        // one week: every sheet's rows, each keeping who did it (the same row twice counts once)
        var st1 = JSON.parse(JSON.stringify(e1.state)), have1 = {};
        st1.tables.audit = rowsOfT(st1, 'audit');
        st1.tables.audit = st1.tables.audit.filter(function (r) { if (have1[rowKey(r)]) return false; have1[rowKey(r)] = 1; return true; });
        also1.forEach(function (e) { rowsOfT(e.state, 'audit').forEach(function (r) { if (!have1[rowKey(r)]) { have1[rowKey(r)] = 1; st1.tables.audit.push(r); } }); });
        e1 = { workpaper: e1.workpaper, person: e1.person, state: st1 };
      }
      got.push('WP-01');
      set('wp01.weekOf', e1.state.values.weekOf);
      if (!R.refusalsOnly) {
        var a1 = rowsOfT(e1.state, 'audit');
        a1.forEach(function (r, i) { var p = 'wp01.audit.r' + (i + 1) + '.'; set(p + 'day', r.day); set(p + 'task', r.task); set(p + 'who', whoName(r.who)); set(p + 'minutes', r.minutes); set(p + 'how', r.how); });
        if (a1.length > 10) sizes.audit = a1.length;
      }
      var rf = rowsOfT(e1.state, 'refusals');
      rf.forEach(function (r, i) { var p = 'wp01.refusals.r' + (i + 1) + '.'; set(p + 'kind', r.kind); set(p + 'ack', r.ack); set(p + 'cap', r.cap); set(p + 'alt', r.alt); });
      if (rf.length > 2) sizes.refusals = rf.length;
    }
    for (var i = 0; i < n; i++) {
      var e2 = latest((by['WP-02'] || []).filter(function (e) { return personOf(e) === i; }));
      if (!e2) continue;
      got.push('WP-02');
      var p2 = 'wp02.p' + (i + 1) + '.';
      FACTOR_IDS.forEach(function (id, k) { set(p2 + 'q' + (k + 1), e2.state.values['factors.' + id]); });
      set(p2 + 'date', e2.state.values.date); set(p2 + 'note', e2.state.values.note);
    }
    var e3 = latest(by['WP-03'] || []);
    if (e3) {
      got.push('WP-03');
      set('wp03.reviewDate', e3.state.values.reviewDate);
      // the sheet's own rule: a starter job nobody touched is an example, and isn't counted until it is given an owner or changed
      var exRows = [];
      [schemaFor('WP-03', snap.variant), schemaFor('WP-03', roadId), schemaFor('WP-03')].forEach(function (sc3) { var tr = section(sc3, 'treaty'); if (tr && tr.examples) exRows = exRows.concat(tr.defaultRows || []); });
      function example3(r) { return exRows.some(function (d) { return d.task === r.task && trim(r.freq) === trim(d.freq) && ['r', 'a', 'c', 'i', 'notes'].every(function (k) { return blank(r[k]) || r[k] === d[k]; }); }); }
      var t3 = rowsOfT(e3.state, 'treaty').filter(function (r) { return trim(r.task) && !example3(r); });
      t3.forEach(function (r, i) { var p = 'wp03.treaty.r' + (i + 1) + '.'; set(p + 'task', r.task); set(p + 'freq', r.freq); set(p + 'r', whoName(r.r)); set(p + 'a', whoName(r.a)); set(p + 'c', r.c); set(p + 'i', r.i); set(p + 'notes', r.notes); });
      sizes.treaty = t3.length;
      var am = rowsOfT(e3.state, 'amendments');
      am.forEach(function (r, i) { var p = 'wp03.amend.r' + (i + 1) + '.'; set(p + 'date', r.date); set(p + 'who', [r.initA, r.initB].filter(Boolean).join(' ')); set(p + 'change', r.change); });
      if (am.length > 2) sizes.amend = am.length;
      closingFrom(e3, 'wp03');
    }
    var e4 = latest(by['WP-04'] || []);
    if (e4) {
      got.push('WP-04');
      set('wp04.month', e4.state.values.month);
      var r4 = rowsOfT(e4.state, 'raw').filter(function (r) { return trim(r.task); });
      r4.forEach(function (r, i) { var p = 'wp04.raw.r' + (i + 1) + '.'; set(p + 'task', r.task); ['w1', 'w2', 'w3', 'w4'].forEach(function (w) { if (r[w]) V[p + w] = true; }); });
      if (r4.length > 8) sizes.raw = r4.length;
      var c4 = rowsOfT(e4.state, 'classify').filter(function (r) { return trim(r.task); });
      c4.forEach(function (r, i) { var p = 'wp04.classify.r' + (i + 1) + '.'; set(p + 'task', r.task); set(p + 'owner', r.owner); set(p + 'kind', r.kind); set(p + 'action', r.action); });
      if (c4.length > 6) sizes.classify = c4.length;
      closingFrom(e4, 'wp04');
    }
    var e9 = latest(by['WP-09'] || []);
    if (e9) {
      got.push('WP-09');
      var v9 = e9.state.values;
      set('wp09.date', v9.date); if (!R.solo) set('wp09.who', v9.name);
      // the raw reaction is just for its writer: it comes along only when its own box is ticked
      if (v9.raw__include) { set('wp09.raw', v9.raw); V['wp09.rawInclude'] = true; }
      set('wp09.fact', v9.fact); set('wp09.feeling', v9.feeling); set('wp09.ask', v9.ask);
      ['specific', 'saturation', 'neutral', 'pattern'].forEach(function (id) { set('wp09.filter.' + id, v9['filter.' + id]); });
    }
    var kits = [];
    for (var j = 0; j < n; j++) kits[j] = latest((by['WP-11'] || []).filter(function (e) { return personOf(e) === j; }));
    if (!kits.some(Boolean)) { var any11 = latest(by['WP-11'] || []); if (any11) kits[0] = any11; }
    if (kits.some(Boolean)) {
      got.push('WP-11');
      kits.forEach(function (k, j) {
        if (!k) return;
        var line = (k.state.tables.lines || [])[0];
        if (line) set('wp11.lines.p' + (j + 1) + '.line', line.line);
      });
      // the package has one set of defaults, triggers and readings: the first kit that has them
      var main = kits.filter(function (k) { return k && (k.state.values.first || k.state.values.second); })[0] || kits.filter(Boolean)[0];
      set('wp11.date', main.state.values.date); set('wp11.first', main.state.values.first); set('wp11.second', main.state.values.second);
      set('wp11.nextAction', main.state.values.nextAction); set('wp11.resume', main.state.values.resume);
      // the shared pause plan: from whichever kit has it written
      var planKit = kits.filter(function (k) { return k && (k.state.values.planWord || k.state.values.planMin || k.state.values.planBack || k.state.values.planFirst); })[0];
      if (planKit) { var pv0 = planKit.state.values; set('wp11.plan.word', pv0.planWord); set('wp11.plan.min', pv0.planMin); set('wp11.plan.back', pv0.planBack); set('wp11.plan.first', pv0.planFirst); }
      closingFrom(main, 'wp11');
      var tr = rowsOfT(main.state, 'triggers');
      tr.forEach(function (r, i) { set('wp11.triggers.r' + (i + 1) + '.trigger', r.trigger); set('wp11.triggers.r' + (i + 1) + '.body', r.body); });
      if (tr.length > 3) sizes.triggers = tr.length;
      var withReadings = kits.filter(function (k) { return k && rowsOfT(k.state, 'reentry').length; }), rk = withReadings[withReadings.length - 1];
      if (rk) {
        var re = rowsOfT(rk.state, 'reentry');
        re.forEach(function (r, i) { var p = 'wp11.reentry.r' + (i + 1) + '.'; set(p + 'time', r.time); set(p + 'tactic', r.tactic); set(p + 'before', r.before); set(p + 'after', r.after); });
        if (re.length > 3) sizes.reentry = re.length;
      }
    }
    var e13 = latest(by['WP-13'] || []);
    if (e13) {
      var also13 = sameWeek(by['WP-13'] || [], e13);
      if (also13.length) {
        // one week of check-ins: each person's rows from whichever sheet has them written
        var st13 = JSON.parse(JSON.stringify(e13.state)), daily = st13.tables.daily || (st13.tables.daily = []), have13 = {};
        function slot(r) { return r.day + '|' + r.who; }
        daily.forEach(function (r) { if (r && r.day && r.who) have13[slot(r)] = r; });
        also13.forEach(function (e) {
          (e.state.tables.daily || []).forEach(function (r) {
            if (!r || !r.day || !r.who) return;
            var mine = have13[slot(r)];
            if (!mine) { mine = { day: r.day, who: r.who }; daily.push(mine); have13[slot(r)] = mine; }
            ['load', 'thanks', 'friction', 'ask'].forEach(function (k) { if (blank(mine[k]) && !blank(r[k])) mine[k] = r[k]; });
          });
          var rs0 = st13.tables.resync || (st13.tables.resync = []), seenR = {};
          rs0.forEach(function (r) { if (r && trim(r.item)) seenR[trim(r.item).toLowerCase()] = 1; });
          rowsOfT(e.state, 'resync').forEach(function (r) { if (trim(r.item) && !seenR[trim(r.item).toLowerCase()]) { seenR[trim(r.item).toLowerCase()] = 1; rs0.push(r); } });
        });
        if (!trim(st13.values.weekOf)) also13.some(function (e) { if (weekOf(e)) { st13.values.weekOf = weekOf(e); return true; } return false; });
        e13 = { workpaper: e13.workpaper, state: st13 };
      }
      got.push('WP-13');
      set('wp13.weekOf', e13.state.values.weekOf);
      (e13.state.tables.daily || []).forEach(function (r) {
        var d = DAYS.indexOf(r.day), pi = CODES.indexOf(r.who);
        if (d < 0 || pi < 0 || pi >= n) return;
        var p = 'wp13.daily.r' + (d * n + pi + 1) + '.';
        set(p + 'load', r.load); set(p + 'thanks', r.thanks); set(p + 'friction', r.friction); set(p + 'ask', r.ask);
      });
      var rs = rowsOfT(e13.state, 'resync').filter(function (r) { return trim(r.item); });
      rs.forEach(function (r, i) { var p = 'wp13.resync.r' + (i + 1) + '.'; set(p + 'item', r.item); set(p + 'times', r.times); set(p + 'to', r.to); });
      if (rs.length > 3) sizes.resync = rs.length;
      closingFrom(e13, 'wp13');
    }
    if (KID_ROADS[roadId] && Array.isArray(snap.kids)) snap.kids.forEach(function (k, i) { if (k && i < n) V['who.p' + (i + 1) + '.child'] = true; });
    var data = blankData(roadId, n, names, sizes);
    if (e3) Object.keys(data.values).forEach(function (k) { if (k.indexOf(NS + 'wp03.treaty.') === 0) delete data.values[k]; });
    names.forEach(function (nm, i) { if (nm) data.values[NS + 'who.p' + (i + 1)] = nm; });
    // what the Suite has no page for (CALC-01 inputs, self-notes, the Ready page) comes from an earlier package, if there is one
    if (keep && keep.road === roadId && keep.values) Object.keys(keep.values).forEach(function (k) { if (/^tol\.v1\.(calc|self|ready)\.|^tol\.v1\.who\.(started|context|others)$/.test(k)) data.values[k] = keep.values[k]; });
    Object.keys(V).forEach(function (k) { data.values[NS + k] = V[k]; });
    if (typeof snap.variant === 'string') data.focus = snap.variant;
    if (snap.split && typeof snap.split === 'object' && !R.solo) {
      var byNm = function (o) { return names.map(function (nm) { var hit = null; Object.keys(o || {}).forEach(function (k) { if (nm && fold(k) === fold(nm)) hit = o[k]; }); return hit; }); };
      data.split = { nights: byNm(snap.split.nights), agreed: byNm(snap.split.agreed) };
    }
    var r = fromJSON(data);
    if (r) {
      r.fromSuite = got.filter(function (x, k, a) { return a.indexOf(x) === k; });
      // where each sheet brought in from a file came from: "WP-02 (Diego): from Diego's file, saved Oct 7"
      r.origins = [];
      snap.entries.forEach(function (e) {
        if (!e || !e.from || !written(e)) return;
        var who = personOf(e), d = /^\d{4}-\d{2}-\d{2}$/.test(e.from.saved || '') ? new Date(e.from.saved + 'T12:00:00') : null;
        r.origins.push(e.workpaper + (who != null && who >= 0 ? ' (' + label(who) + ')' : '') + ': from ' + (e.from.by ? e.from.by + '’s file' : e.from.file ? trim(e.from.file) : 'a file brought in') +
          (d && !isNaN(d) ? ', saved ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''));
      });
    }
    return r;
  }

  // A JSON backup (or a draft) back into the data object, cleaned.
  function fromJSON(obj) {
    if (!obj || obj.format !== FORMAT || typeof obj.values !== 'object') return null;
    var found = {};
    Object.keys(obj.values).forEach(function (k) { var v = obj.values[k]; if (typeof v === 'string' || typeof v === 'boolean' || typeof v === 'number') found[k] = typeof v === 'number' ? String(v) : v; });
    found[NS + 'meta.road'] = obj.road; found[NS + 'meta.people'] = String(obj.people); found[NS + 'meta.version'] = obj.version || '';
    var r = fromFields(found);
    // the Suite's "what brings you here" choice (a road variant), when there is one
    if (r && typeof obj.focus === 'string' && /^[a-z]{1,20}$/.test(obj.focus) && r.data.road === obj.road) r.data.focus = obj.focus;
    if (r && obj.split) { var sc0 = splitClean(obj.split, r.data.people); if (sc0) r.data.split = sc0; }
    return r;
  }
  // The split a week is read against, from the Lemonade Stand (through the Suite): the share each person
  // agreed, or the nights (out of 14) each person is here. One entry per place on the road; null = not said.
  function splitClean(x, n) {
    if (!x || typeof x !== 'object') return null;
    function arr(a, hi) { return Array.isArray(a) ? a.slice(0, n).map(function (v) { var f = parseFloat(v); return isFinite(f) && f > 0 && f <= hi ? f : null; }) : []; }
    var out = { nights: arr(x.nights, 14), agreed: arr(x.agreed, 100) };
    while (out.nights.length < n) out.nights.push(null);
    while (out.agreed.length < n) out.agreed.push(null);
    return out.nights.some(function (v) { return v != null; }) || out.agreed.some(function (v) { return v != null; }) ? out : null;
  }

  /* ------------------------------------------------------------ two copies into one */

  // When each person fills in their own copy, the second file is added to the first, never swapped in
  // silently. People are matched by name first (Lena is Lena whichever box she was in), then:
  //  - a box that is empty here takes the new file's answer;
  //  - a box with the same answer stays as it is;
  //  - a box with a different answer keeps what is here, and is listed in conflicts so the person can choose.
  // A starter value nobody changed (a printed job, a day, a name in its own row) counts as empty.
  // Returns { data, added, same, conflicts: [{ name, where, here, there }], matched, swapped } or { error }.
  var PERSON_KEY = /^(tol\.v1\.(?:who\.p|wp02\.p|wp11\.lines\.p|self\.p))(\d)(\.|$)/;
  function personNames(data) { var out = []; for (var i = 0; i < data.people; i++) out.push(fold(data.values[NS + 'who.p' + (i + 1)])); return out; }
  function matchPeople(base, add) {
    var bn = personNames(base), an = personNames(add), map = [], used = {}, extra = base.people;
    an.forEach(function (nm, i) { var j = nm ? bn.indexOf(nm) : -1; if (j >= 0 && !used[j]) { map[i] = j; used[j] = 1; } });
    // initials or first names ("L" or "Lena B" for Lena)
    an.forEach(function (nm, i) {
      if (map[i] != null || !nm) return;
      var j = -1; bn.forEach(function (b, k) { if (j < 0 && !used[k] && b && (b.split(/\s+/)[0] === nm.split(/\s+/)[0] || (nm.length === 1 && b.charAt(0) === nm) || (b.length === 1 && nm.charAt(0) === b))) j = k; });
      if (j >= 0) { map[i] = j; used[j] = 1; }
    });
    // everyone else: their own slot if it is free (an unnamed person stays where they were), or a new place
    an.forEach(function (nm, i) {
      if (map[i] != null) return;
      if (!used[i] && (!nm || !bn[i]) && i < Math.max(base.people, add.people)) { map[i] = i; used[i] = 1; return; }
      while (used[extra]) extra++;
      map[i] = extra; used[extra] = 1; extra++;
    });
    return map;
  }
  function remapPerson(name, map, nFrom, nTo) {
    var m = PERSON_KEY.exec(name);
    if (m) { var j = map[+m[2] - 1]; return j == null ? name : m[1] + (j + 1) + name.slice(m[1].length + m[2].length); }
    var d = /^tol\.v1\.wp13\.daily\.r(\d+)\.(.+)$/.exec(name);
    if (d) {
      var k = +d[1] - 1, day = Math.floor(k / nFrom), who = k % nFrom, to = map[who] == null ? who : map[who];
      if (day > 6) return name;
      return NS + 'wp13.daily.r' + (day * nTo + to + 1) + '.' + d[2];
    }
    return name;
  }
  function combine(base, add) {
    if (!base || !add) return { error: 'missing' };
    if (base.road !== add.road) return { error: 'road' };
    var map = matchPeople(base, add), nTo = clampPeople(base.road, Math.max(base.people, add.people, Math.max.apply(null, map.concat([0])) + 1));
    var swapped = map.some(function (j, i) { return j !== i; });
    var ident = []; for (var i = 0; i < base.people; i++) ident.push(i);
    var out = { format: FORMAT, version: PKG_VERSION, road: base.road, people: nTo, values: {} };
    var sizes = {}; [base.sizes, add.sizes].forEach(function (s) { Object.keys(s || {}).forEach(function (k) { sizes[k] = Math.max(sizes[k] || 0, s[k]); }); });
    if (Object.keys(sizes).length) out.sizes = sizes;
    if (base.focus) out.focus = base.focus; else if (add.focus) out.focus = add.focus;
    Object.keys(base.values).forEach(function (k) { out.values[remapPerson(k, ident, base.people, nTo)] = base.values[k]; });
    var reg = build(out.road, nTo, null, sizes), res = { added: 0, same: 0, conflicts: [], matched: map, swapped: swapped };
    function isStarter(fl, v) { return !!(fl && fl.def && v === fl.def && !/^who\./.test(fl.id)); }
    Object.keys(add.values).forEach(function (k0) {
      var k = remapPerson(k0, map, add.people, nTo), av = add.values[k0], bv = out.values[k], fl = reg.byName[k];
      if (blank(av)) return;
      // a day or a name the package fills in for each row: keep what is here
      if (fl && fl.prefill) { if (blank(bv)) out.values[k] = av; return; }
      if (blank(bv) || (isStarter(fl, bv) && !isStarter(fl, av))) { out.values[k] = av; res.added++; return; }
      if (trim(bv) === trim(av) || (fl && fl.type === 'check' && !!bv === !!av)) { res.same++; return; }
      if (isStarter(fl, av)) return;
      var p = fl ? reg.pages.filter(function (x) { return x.id === fl.page; })[0] : null;
      res.conflicts.push({ name: k, where: fl && p ? fieldPlace(p, fl) : k.replace(NS, ''), here: bv, there: av });
    });
    // a starter job the other copy took off (its task box cleared) goes here too, while it is still only a starter
    var addKeys = {}; Object.keys(add.values).forEach(function (k0) { if (!blank(add.values[k0])) addKeys[remapPerson(k0, map, add.people, nTo)] = 1; });
    var addHas03 = Object.keys(addKeys).some(function (k) { return k.indexOf(NS + 'wp03.') === 0; });
    if (addHas03) Object.keys(out.values).forEach(function (k) {
      var m = /^(tol\.v1\.wp03\.treaty\.r\d+\.)task$/.exec(k), fl = reg.byName[k];
      if (!m || addKeys[k] || !isStarter(fl, out.values[k])) return;
      var rowBlankHere = ['r', 'a', 'c', 'i'].every(function (c2) { return blank(out.values[m[1] + c2]); });
      if (rowBlankHere) ['task', 'freq', 'notes'].forEach(function (c2) { var f2 = reg.byName[m[1] + c2]; if (!f2 || isStarter(f2, out.values[m[1] + c2]) || blank(out.values[m[1] + c2])) delete out.values[m[1] + c2]; });
    });
    res.data = out;
    return res;
  }

  // A copy to share: the same answers without the private pages, so nobody's load score, self-notes,
  // raw reaction or calm-down triggers travel further than they meant them to.
  var PRIVATE_RE = /^tol\.v1\.(wp02\.|self\.|wp09\.raw|wp11\.(triggers|reentry)\.)/;
  function shareCopy(data) {
    var out = JSON.parse(JSON.stringify(data));
    Object.keys(out.values).forEach(function (k) { if (PRIVATE_RE.test(k)) delete out.values[k]; });
    out.shared = true;
    return out;
  }
  function hasPrivate(data) { return !!data && Object.keys(data.values || {}).some(function (k) { return PRIVATE_RE.test(k) && !blank(data.values[k]); }); }

  // What was read, page by page, and what is missing or couldn't be matched.
  function readReport(data, extra) {
    var reg = regOf(data), P = people(data), pages = [], issues = [], total = 0;
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
          else if ((fl.max != null && nv > fl.max) || (fl.min != null && nv < fl.min)) issues.push({ page: p.id, field: fl, msg: trim(v) + ' in ' + fieldPlace(p, fl) + (fl.min != null && fl.max != null ? ' is outside ' + fl.min + ' to ' + fl.max : fl.min != null ? ' is below ' + fl.min : ' is above ' + fl.max) + ', so it is left out.' });
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
    for (var i = 0; i < n; i++) {
      var role = roleOf(data.road, i);
      // "You" reads oddly in a report about several people ("You is…"), so an unnamed first person is "Person 1 (you)".
      list.push({ i: i, name: names[i], label: names[i] || (role === 'You' && n > 1 ? 'Person 1 (you)' : role), role: role });
    }
    // "José", "Jose" and "jose" are the same person; "Tom and Aoife" is two people (see ownersOf), never Tom.
    function resolve(v) {
      var s = trim(v);
      if (!s) return null;
      var low = fold(s).replace(/[.!]+$/, '');
      if (/^(both|everyone|everybody|all|all of us|us|we|together|the team|team|whole team|the house|whole house|the family)$/.test(low)) return 'all';
      var hit = list.filter(function (p) { return fold(p.label) === low || (p.name && fold(p.name) === low) || fold(p.role) === low; });
      if (hit.length === 1) return hit[0].i;
      if (SEVERAL_RE.test(low)) return undefined;
      if (low.length === 1) {
        var ini = list.filter(function (p) { return p.name && fold(p.name).charAt(0) === low; });
        if (ini.length === 1) return ini[0].i;
        var li = CODES.indexOf(low.toUpperCase());
        if (li >= 0 && li < n) return li;
      }
      var d = /^(?:p|person\s*)?([1-8])$/.exec(low);
      if (d && +d[1] <= n) return +d[1] - 1;
      if (low.length >= 2) {
        var pre = list.filter(function (p) { return p.name && fold(p.name).indexOf(low) === 0; });
        if (pre.length === 1) return pre[0].i;
        var inits = list.filter(function (p) { return p.name && fold(p.name).split(/\s+/).map(function (w) { return w.charAt(0); }).join('') === low; });
        if (inits.length === 1) return inits[0].i;
        var first = list.filter(function (p) { return p.name && fold(p.name).split(/\s+/)[0] === low.split(/\s+/)[0]; });
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
    return k === 'high' ? { key: 'good', label: 'Working well' } : k === 'mid' ? { key: 'drift', label: 'Needs a look' } : { key: 'low', label: 'Needs a rethink, together' };
  }

  // Every number the report uses, with where it came from. Blank means null, never a guess.
  function compute(data) {
    var reg = regOf(data), R = ROADS[data.road], P = people(data), n = data.people;
    var fsp = focusOf(data);
    if (fsp) {
      // the same road and pages, read in the variant's order, with its optional sheets known
      var order = [], R2 = {};
      fsp.groups.forEach(function (g) { g.stops.forEach(function (x) { if (R.wps.indexOf(x.wp) >= 0 && order.indexOf(x.wp) < 0) order.push(x.wp); }); });
      R.wps.forEach(function (w) { if (order.indexOf(w) < 0) order.push(w); });
      Object.keys(R).forEach(function (k) { R2[k] = R[k]; });
      R2.wps = order; R2.focus = fsp.variant; R2.optional = optionalOf(fsp);
      R = R2;
    }
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
      return { i: p.i, label: p.label, score: score, source: source, answered: got, sum: sum, answers: answers, band: batteryBand(score), note: trim(V(data, base + 'note')), date: V(data, base + 'date'),
        child: !!(KID_ROADS[data.road] && V(data, 'who.p' + (p.i + 1) + '.child') && !got && score == null) };
    });
    // the shared load numbers are for the adults: a child marked as one is never waited for
    var adultsB = out.battery.filter(function (b) { return !b.child; });
    var scored = out.battery.filter(function (b) { return b.score != null; });
    out.wp02 = { filled: out.battery.some(function (b) { return b.answered > 0 || b.source; }), scored: scored.length };

    // WP-01: minutes by person, and the balance score
    var kidAt = P.list.map(function (p) { return !!(KID_ROADS[data.road] && V(data, 'who.p' + (p.i + 1) + '.child')); });
    out.kids = kidAt;
    out.target = targetOf(data, P);
    if (on['WP-01'] && !R.refusalsOnly) {
      var mins = P.list.map(function () { return 0; }), noticed = mins.slice(), seen = {}, rowsUsed = 0, unmatched = [], logged = 0, tasks = [], sharedRows = [];
      rowsOf(data, 'wp01.audit', ['day', 'task', 'who', 'minutes', 'how'], sizeOf(data, 'audit')).forEach(function (r) {
        if (!(trim(r.task) || trim(r.who) || trim(r.minutes) || trim(r.how))) return;
        logged++;
        if (trim(r.task)) tasks.push(trim(r.task));
        var m = num(r.minutes), ow = ownersOf(P, r.who);
        if (!ow.all) ow.list.forEach(function (k) { seen[k] = true; }); // a row for everyone isn't anyone's own side
        if (!(m > 0) || !ow.list.length) { if (ow.unknown.length && trim(r.who)) unmatched.push(trim(r.who)); return; }
        rowsUsed++;
        // a row shared by several named people is split evenly between them, and said so in the report
        if (ow.multi && !ow.all) sharedRows.push({ task: trim(r.task) || 'a row', who: ow.list.map(P.label) });
        Object.keys(ow.list).forEach(function (j) { var k = ow.list[j], s = m / ow.list.length; mins[k] += s; if (r.how === 'Noticed and handled') noticed[k] += s; });
      });
      // balance for 2 to 8 people against an even split: 1 − (½Σ|share − 1/n|) ÷ (1 − 1/n)
      // read against the split agreed on the Lemonade Stand (or each person's nights here), when there is one,
      // the same way the stand reads it, so the two never give opposite answers about the same week
      var bal = C1().balance(mins, out.target ? out.target.t.map(function (x) { return x * 100; }) : null);
      if (bal.error && out.target) bal = C1().balance(mins);
      var total = bal.total, wb = bal.value, shares = bal.shares ? bal.shares.map(function (x) { return x * 100; }) : null;
      // Someone on the road with no rows at all hasn't added their side yet. Their week is missing, not
      // zero (as with a load score nobody has filled in), so the split, the balance and any hand-over wait.
      var oneSided = null;
      if (n >= 2 && rowsUsed > 0) {
        var none = P.list.filter(function (p) { return !seen[p.i] && !kidAt[p.i]; }); // a child is never waited for
        if (none.length) oneSided = { have: P.list.filter(function (p) { return seen[p.i]; }).map(function (p) { return p.label; }), missing: none.map(function (p) { return p.label; }) };
      }
      if (oneSided) { wb = null; shares = null; }
      out.wp01 = { filled: logged > 0 || has(data, 'wp01.weekOf'), logged: logged, rowsUsed: rowsUsed, minutes: mins, noticed: noticed, total: total, shares: shares, wb: wb, unmatched: unmatched, tasks: tasks, sharedRows: sharedRows, oneSided: oneSided };
    }
    // WP-01 Part B: kind no's (every road that has WP-01)
    if (on['WP-01']) {
      out.refusals = rowsOf(data, 'wp01.refusals', ['kind', 'ack', 'cap', 'alt'], sizeOf(data, 'refusals')).filter(function (r) { return trim(r.ack) || trim(r.cap) || trim(r.alt); });
      if (!out.wp01) out.wp01 = { filled: out.refusals.length > 0 };
      else out.wp01.filled = out.wp01.filled || out.refusals.length > 0;
    }

    // WP-03: ownership clarity
    if (on['WP-03']) {
      var reg3 = reg.pages.filter(function (p) { return p.id === 'wp03'; })[0], defs = {};
      reg3.fields.forEach(function (fl) { if (fl.def) defs[fl.name] = fl.def; });
      var cols = ['task', 'freq', 'r', 'a', 'c', 'i', 'notes'], rows3 = rowsOf(data, 'wp03.treaty', cols, sizeOf(data, 'treaty')), touched = false;
      rows3.forEach(function (r) {
        cols.forEach(function (c) {
          var k = NS + 'wp03.treaty.r' + r._i + '.' + c, v = data.values[k];
          if (!blank(v) && v !== defs[k]) touched = true;
          if (blank(v) && defs[k] && c === 'task') touched = true; // a default task cleared on purpose
        });
      });
      touched = touched || has(data, 'wp03.reviewDate');
      // a printed starter job nobody filled in (same task and how-often, no names) is an example:
      // it never counts for or against the clarity number. If the same job shows up in your own
      // log (WP-01) or look-back (WP-04), it is clearly yours, so it counts.
      var starterIdx = {}, starters = [], seen = {};
      [['wp01.audit', 'audit'], ['wp04.raw', 'raw'], ['wp04.classify', 'classify']].forEach(function (t) {
        rowsOf(data, t[0], ['task'], sizeOf(data, t[1])).forEach(function (r) { if (trim(r.task)) seen[trim(r.task).toLowerCase()] = true; });
      });
      rows3.forEach(function (r) {
        var p = NS + 'wp03.treaty.r' + r._i + '.';
        if (trim(r.task) && defs[p + 'task'] === trim(r.task) && !seen[trim(r.task).toLowerCase()] && !trim(r.r) && !trim(r.a) && !trim(r.c) && !trim(r.i) && (blank(r.freq) || r.freq === defs[p + 'freq']) && (blank(r.notes) || r.notes === defs[p + 'notes'])) { starterIdx[r._i] = true; starters.push(trim(r.task)); }
      });
      var tasks3 = rows3.filter(function (r) { return trim(r.task) && !starterIdx[r._i]; });
      var owned = [], unowned = [], half = [], byOwner = P.list.map(function () { return 0; }), byWeight = byOwner.slice(), unmatched3 = [];
      tasks3.forEach(function (r) {
        var ro = ownersOf(P, r.r), ao = ownersOf(P, r.a);
        if (trim(r.r) && ro.unknown.length) unmatched3.push(trim(r.r));
        if (trim(r.a) && ao.unknown.length) unmatched3.push(trim(r.a));
        // one owner per job; the helper is optional (half = a helper but no owner)
        if (trim(r.r)) owned.push(r); else if (trim(r.a)) half.push(r); else unowned.push(r);
        if (ro.list.length === 1) { byOwner[ro.list[0]]++; byWeight[ro.list[0]] += FREQ_WEIGHT[r.freq] != null ? FREQ_WEIGHT[r.freq] : 1; }
      });
      // the same jobs counted by how often they come up (a daily job is seven times a week), so a list of
      // monthly jobs doesn't look as heavy as a list of daily ones
      var wsum = byWeight.reduce(function (a, b) { return a + b; }, 0), wtop = wsum ? byWeight.indexOf(Math.max.apply(null, byWeight)) : -1;
      out.wp03 = { filled: touched, tasks: tasks3.length, owned: owned.length, oc: touched && tasks3.length ? owned.length / tasks3.length : null, conc: n >= 2 ? C1().concentration(byOwner, 3) : null,
        weighted: n >= 2 && wsum > 0 ? { top: wtop, share: byWeight[wtop] / wsum, byWeight: byWeight } : null,
        unowned: unowned.map(function (r) { return trim(r.task); }), half: half.map(function (r) { return trim(r.task); }), byOwner: byOwner, unmatched: unmatched3, starters: starters, starterIdx: starterIdx,
        amend: rowsOf(data, 'wp03.amend', ['change'], sizeOf(data, 'amend')).filter(function (r) { return trim(r.change); }).length };
    }

    // WP-04: what keeps slipping
    if (on['WP-04']) {
      var raw = rowsOf(data, 'wp04.raw', ['task', 'w1', 'w2', 'w3', 'w4'], sizeOf(data, 'raw')).filter(function (r) { return trim(r.task); }).map(function (r) {
        return { task: trim(r.task), times: ['w1', 'w2', 'w3', 'w4'].filter(function (w) { return r[w] === true; }).length };
      });
      var cl = rowsOf(data, 'wp04.classify', ['task', 'owner', 'kind', 'action'], sizeOf(data, 'classify')).filter(function (r) { return trim(r.task); });
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
      var trig = rowsOf(data, 'wp11.triggers', ['trigger', 'body'], sizeOf(data, 'triggers')).filter(function (r) { return trim(r.trigger) || trim(r.body); });
      var re = rowsOf(data, 'wp11.reentry', ['time', 'tactic', 'before', 'after'], sizeOf(data, 'reentry')).filter(function (r) { return inRange(r.after, 0, 1) != null; });
      var latest = re.length ? inRange(re[re.length - 1].after, 0, 1) : null, before = re.length ? inRange(re[re.length - 1].before, 0, 1) : null;
      var ret = latest == null ? null : latest < 0.5 ? 'back' : latest < 0.6 ? 'again' : (re.length >= 2 ? 'later' : 'again');
      var plan11 = { word: trim(V(data, 'wp11.plan.word')), min: trim(V(data, 'wp11.plan.min')), back: trim(V(data, 'wp11.plan.back')), first: trim(V(data, 'wp11.plan.first')) };
      plan11.any = !!(plan11.word || plan11.min || plan11.back || plan11.first);
      out.wp11 = { plan: plan11, filled: !!(V(data, 'wp11.first') || V(data, 'wp11.second') || lines.some(Boolean) || trig.length || re.length || plan11.any),
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
      var resync = rowsOf(data, 'wp13.resync', ['item', 'times', 'to'], sizeOf(data, 'resync')).filter(function (r) { return trim(r.item); });
      out.wp13 = { filled: entries > 0 || resync.length > 0, entries: entries, possible: 7 * n, loads: loads, thanks: thanks, frictions: frictions, asks: asks, resync: resync,
        highDays: loads.map(function (l) { return l.High; }) };
    }

    // Who carries the most, beside the scores: the busiest person's share of the jobs with one named
    // owner, of the logged minutes and of the unasked-for minutes. Clarity can read 1.00 with one
    // person holding every job, so this is what keeps a high score honest.
    out.conc = { owned: out.wp03 && out.wp03.filled ? out.wp03.conc : null,
      // a log with someone's week still missing says nothing about who carries more
      minutes: out.wp01 && out.wp01.minutes && !out.wp01.oneSided && n >= 2 && !out.target ? C1().concentration(out.wp01.minutes, 60) : null,
      noticed: out.wp01 && out.wp01.noticed && !out.wp01.oneSided && n >= 2 ? C1().concentration(out.wp01.noticed, 60) : null };
    out.conc.flag = !!((out.conc.owned && out.conc.owned.flag) || (out.conc.minutes && out.conc.minutes.flag));
    out.conc.lines = [];
    // Owning jobs and the time they took are two different things, and can point at different people.
    // Each line says which one it counts, and how often the jobs come up, so they never read as a contradiction.
    if (out.conc.owned && out.conc.owned.flag) {
      var wt = out.wp03.weighted, wline = wt && wt.top === out.conc.owned.top ? '; counting how often each comes up, about ' + pct(wt.share) + ' of the weekly jobs' : wt ? '; counting how often each comes up, ' + P.label(wt.top) + '’s jobs come up most (about ' + pct(wt.share) + ')' : '';
      out.conc.lines.push(P.label(out.conc.owned.top) + ' owns ' + out.conc.owned.count + ' of the ' + out.conc.owned.total + ' ' + R.tasks + ' with one named owner (' + pct(out.conc.owned.share) + wline + ')');
    }
    if (out.conc.minutes && out.conc.minutes.flag) out.conc.lines.push(P.label(out.conc.minutes.top) + ' logged ' + pct(out.conc.minutes.share) + ' of the minutes this week' + (out.conc.owned && out.conc.owned.flag && out.conc.owned.top !== out.conc.minutes.top ? ' (owning a job and the time it took this week are counted separately, so they can point at different people)' : ''));
    // (who marked work as noticed first is each person's own view of their rows: it is said once, in the WP-01 read, never as who "carries more")

    // CALC-01
    var wbSrc = null, ocSrc = null, asSrc = null, wb = null, oc = null, as = null;
    if (R.calc) {
      if (out.wp01 && out.wp01.wb != null) { wb = out.wp01.wb; wbSrc = 'WP-01'; }
      else if (inRange(V(data, 'calc.wb'), 0, 1) != null) { wb = inRange(V(data, 'calc.wb'), 0, 1); wbSrc = 'yours'; }
      if (out.wp03 && out.wp03.oc != null) { oc = out.wp03.oc; ocSrc = 'WP-03'; }
      else if (inRange(V(data, 'calc.oc'), 0, 1) != null) { oc = inRange(V(data, 'calc.oc'), 0, 1); ocSrc = 'yours'; }
      var st = C1().stress(adultsB.map(function (b) { return b.score; }));
      if (st.value != null) { as = st.value; asSrc = 'WP-02'; }
      else if (inRange(V(data, 'calc.as'), 0, 1) != null) { as = inRange(V(data, 'calc.as'), 0, 1); asSrc = 'yours'; }
    }
    var fr = num(V(data, 'calc.friction')), rt = num(V(data, 'calc.retunes'));
    var rf = C1().retuning(rt, fr).value;
    var calc = { applies: R.calc, wb: wb, oc: oc, as: as, rf: rf, wbSrc: wbSrc, ocSrc: ocSrc, asSrc: asSrc, friction: fr, retunes: rt, capped: fr > 0 && rt > fr,
      asPeople: asSrc === 'WP-02' ? adultsB.length : 0, state: V(data, 'calc.state'), missing: [] };
    if (R.calc) {
      if (wb == null) calc.missing.push('workload balance (WP-01 minutes with names)');
      if (oc == null) calc.missing.push('ownership clarity (WP-03 tasks with owners)');
      var waiting = adultsB.filter(function (b) { return b.score == null; }).map(function (b) { return b.label; });
      calc.waiting = waiting;
      if (as == null) calc.missing.push('everyone\u2019s load score (WP-02; still waiting on ' + list(waiting) + '; it is never worked out while anyone\u2019s is missing)');
      if (!calc.missing.length) {
        calc.sol = C1().solvency(wb, oc, as).value;
        var ax = C1().apex(wb, oc, as, rf);
        calc.apex = ax.value;
        calc.apexRebalanced = ax.rebalanced;
        calc.solBand = calcBand(calc.sol); calc.apexBand = calcBand(calc.apex);
        var FIX = { wb: ['WB', 'how the load is split (WP-01, then WP-03)'], oc: ['OC', 'ownership clarity (the unowned rows on WP-03)'], as: ['AS', 'how full everyone\u2019s load score is (WP-02, and what is driving it)'] };
        var terms = C1().shortfalls(wb, oc, as).map(function (t) { return { key: FIX[t.key][0], value: t.key === 'wb' ? wb : t.key === 'oc' ? oc : as, short: t.short, fix: FIX[t.key][1] }; });
        calc.terms = terms;
        calc.worst = terms.slice().sort(function (a, b) { return b.short - a.short; })[0];
        calc.gap = rf != null ? calc.sol - calc.apex : 0;
      }
    }
    out.calc = calc;

    // Self-notes: one card on "Just me"; one card each on a shared road. out.notes is the card the
    // report reads closely (on a shared road, the first person who filled theirs in; out.notes.who says
    // whose it is), and out.notesBy has everyone's.
    if (R.solo) { out.notes = notesFor(data, 'self.'); out.notes.who = 0; out.notesBy = [out.notes]; }
    else {
      out.notesBy = P.list.map(function (p) { var nb = notesFor(data, 'self.p' + (p.i + 1) + '.'); nb.who = p.i; nb.label = p.label; return nb; });
      out.notes = out.notesBy.filter(function (nb) { return nb.wiringLines || nb.weather.length; })[0] || out.notesBy[0];
    }
    out.ready = { going: trim(V(data, 'ready.going')), focus: trim(V(data, 'ready.focus')), when: trim(V(data, 'ready.when')), fair: V(data, 'ready.fair') === true };
    out.who = { started: V(data, 'who.started'), context: trim(V(data, 'who.context')), others: trim(V(data, 'who.others')) };
    out.anything = reg.fields.some(function (fl) { var v = data.values[fl.name]; return !blank(v) && !(fl.def && v === fl.def) && !/^who\.p\d$/.test(fl.id); });
    return out;
  }

  function notesFor(data, base) {
    var wiring = WIRING.map(function (line) {
      var picked = line.o.filter(function (o) { return V(data, base + 'wiring.' + line.id + '.' + o[0]) === true; }).map(function (o) { return o[1]; });
      var ids = line.o.filter(function (o) { return V(data, base + 'wiring.' + line.id + '.' + o[0]) === true; }).map(function (o) { return o[0]; });
      var own = trim(V(data, base + 'wiring.' + line.id + '.own'));
      if (own) picked.push(own);
      return { id: line.id, q: line.q, picked: picked, ids: ids };
    });
    var weather = [];
    for (var w = 1; w <= WEATHER_WEEKS; w++) {
      var b = base + 'weather.w' + w + '.';
      var wk = { w: w, date: V(data, b + 'date'), battery: inRange(V(data, b + 'battery'), 0, 1), sky: V(data, b + 'sky'), pressure: V(data, b + 'pressure'), sleep: V(data, b + 'sleep'), note: trim(V(data, b + 'note')) };
      if (wk.date || wk.battery != null || wk.sky || wk.pressure || wk.sleep || wk.note) weather.push(wk);
    }
    return { base: base, name: base === 'self.' ? trim(V(data, 'self.wiring.name')) : '', wiring: wiring, wiringLines: wiring.filter(function (l) { return l.picked.length; }).length, weather: weather };
  }

  /* ------------------------------------------------------------ the report */

  var PILLARS = [
    { n: 'I', name: 'See the whole load', anchor: 'see-the-load', field: 'Ledger accounting',
      inYou: 'Notice everything you carry, including the invisible, mental and emotional load.',
      between: 'Put {work} on one shared, fair page, so nobody has to argue about whose work counts.',
      betweenSelf: 'If you ever explain your load to someone, show them the page, not a complaint.' },
    { n: 'II', name: 'Fix the setup, not the person', anchor: 'fix-the-setup', field: 'Systems thinking',
      inYou: 'See your habits and routines as a setup you can redesign, not a character flaw.',
      between: 'Give each {task} one owner, with clear handoffs and agreements, instead of blame.',
      betweenSelf: 'Where your load overlaps with anyone else’s, ask for a clear owner instead of quietly taking it on.' },
    { n: 'III', name: 'Read your state first', anchor: 'read-your-state', field: 'Nervous-system science',
      inYou: 'Know how much you’re carrying today (calm, revved up or running on empty) before you judge a moment.',
      between: 'Pick the timing, pause and come back; your state shapes how the other person’s words land.',
      betweenSelf: 'When you’re running low around other people, it’s okay to say so simply: “I’m running low today.”' },
    { n: 'IV', name: 'Tune how you send and receive', anchor: 'tune-signals', field: 'Signal theory',
      inYou: 'Know your own wiring, pace and how you hear things.',
      between: 'Translate across different wiring and tone; a mismatch is tuning, not a moral failing.',
      betweenSelf: 'If you like, share your Wiring Card, so people can send things in a way that reaches you.' },
    { n: 'V', name: 'Notice the quiet incentives', anchor: 'quiet-incentives', field: 'Behavioral economics',
      inYou: 'Spot the defaults and shortcuts that steer your own choices.',
      between: 'Watch how unclaimed {tasks} drift to one person, and keep fairness and thanks steady.',
      betweenSelf: 'Notice which jobs quietly drift to you, and speak up kindly before they settle there.' }
  ];

  function vocab(c) {
    var R = c.R, n = c.n;
    return { one: R.one, many: R.many, tasks: R.tasks, group: n > 2 ? R.groupN : R.group2, Group: cap(n > 2 ? R.groupN : R.group2), work: R.work, task: R.task, meeting: R.meeting, setting: R.setting };
  }
  function fill(t, v) { return String(t).replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); }

  function report(data) {
    var c = compute(data), R = c.R, v = vocab(c), P = c.P, sp = suitePath(data.road, data.focus), RP = sp && sp.report;
    var model = { road: data.road, roadLabel: R.label, n: c.n, date: new Date(), names: P.list.map(function (p) { return p.label; }), calc: c.calc, battery: c.battery };
    model.forWho = R.solo ? (P.list[0].name || 'You') : list(P.list.map(function (p) { return p.label; }));
    model.title = R.solo ? 'Your full path report' : 'Your full path report: ' + R.label;
    model.lens = RP ? RP.lens : '';
    model.what = RP ? RP.what : '';

    // Summary tiles
    var tiles = [];
    // Words first, numbers second: each tile leads with plain words, and the number sits in the small
    // note with its scale and cut-offs stated, so nothing reads as a verdict.
    function tone3(x) { return x == null ? 'none' : x >= 0.7 ? 'good' : x >= 0.4 ? 'drift' : 'low'; }
    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    if (R.calc) {
      tiles.push(c.calc.sol != null
        ? { k: 'Is the setup working?', v: c.calc.solBand.label, band: 'CALC-01, from balance, ownership and how much everyone is carrying.', tone: c.calc.solBand.key, note: 'Setup score ' + fmt(c.calc.sol) + ' of 1, higher = working better (0.70+ working well, 0.40 to 0.69 needs a look, under 0.40 needs a rethink, together).' }
        : { k: 'Is the setup working?', v: 'Not worked out yet', band: R.focus && R.optional && R.optional['WP-01'] ? 'This read is built on the load sheets (WP-01 and WP-03), which are optional on your road. Fill them in only if the load feels uneven.' : 'Still needed: ' + c.calc.missing.join('; '), tone: 'none' });
      if (c.calc.sol != null) tiles.push({ k: 'With repairs counted', v: c.calc.apexBand.label, band: c.calc.apexRebalanced ? 'No friction moments were counted, so there was nothing to repair.' : 'Adds how often friction was repaired.', tone: c.calc.apexBand.key, note: 'Apex ' + fmt(c.calc.apex) + ' of 1' + (c.calc.apexRebalanced ? ', from three inputs.' : ', with retuning ' + fmt(c.calc.rf) + '.') });
      tiles.push({ k: 'How the time is shared', v: c.calc.wb != null ? cap(C1().shareWords(c.calc.wb)) : 'Not filled in', band: c.calc.wb == null ? (c.wp01 && c.wp01.oneSided ? 'Waiting for ' + list(c.wp01.oneSided.missing) + '’s week' : 'WP-01 needs minutes and names') : c.calc.wbSrc === 'yours' ? 'Your own number' : 'From WP-01', tone: tone3(c.calc.wb), note: c.calc.wb != null ? 'Balance ' + fmt(c.calc.wb) + ' of 1, where 1 = an even split (0.70+ fairly even, 0.40 to 0.69 leaning, under 0.40 mostly on one person).' : '' });
      tiles.push({ k: 'Does each job have a name?', v: c.calc.oc == null ? 'Not filled in' : c.calc.oc >= 0.995 ? 'Every job has one' : c.calc.oc >= 0.7 ? 'Most jobs have one' : c.calc.oc >= 0.4 ? 'Some jobs have one' : 'Few jobs have one', band: c.calc.oc == null ? 'WP-03 needs owners' : c.calc.ocSrc === 'yours' ? 'Your own number' : c.wp03.owned + ' of ' + c.wp03.tasks + ' jobs with an owner', tone: tone3(c.calc.oc), note: c.calc.oc != null ? 'Ownership clarity ' + fmt(c.calc.oc) + ' of 1.' : '' });
      var co = c.conc && (c.conc.owned && c.conc.owned.flag ? c.conc.owned : c.conc.minutes && c.conc.minutes.flag ? c.conc.minutes : null);
      if (co) tiles.push({ k: 'Who’s carrying more right now', v: P.label(co.top), band: c.conc.lines[0], tone: 'drift', note: 'About ' + pct(co.share) + '; an even share would be ' + pct(1 / c.n) + '. Noted at half or more, and 20 points over even.' });
    }
    c.battery.forEach(function (b) {
      tiles.push({ k: R.solo ? 'How much you’re carrying' : 'How much ' + b.label + ' is carrying', v: b.score != null ? b.band.label : 'Not filled in', band: b.score != null ? 'From WP-02' + (b.source === 'shared' ? ' (score shared)' : '') : (b.answered ? b.answered + ' of 5 answered' : 'WP-02 blank'), tone: b.score == null ? 'none' : b.band.key === 'low' ? 'good' : b.band.key === 'medium' ? 'drift' : 'low', person: true, note: b.score != null ? 'Load score ' + fmt(b.score) + ' of 1, higher = heavier (under 0.30 low, 0.30 to 0.59 medium, 0.60+ high).' : '' });
    });
    if (c.calc.rf != null) tiles.push({ k: 'Repair after friction', v: c.calc.rf >= 0.5 ? 'A working habit' : 'Room to grow', band: c.calc.retunes + ' of ' + c.calc.friction + ' friction moments retuned' + (c.calc.capped ? ' (capped at 1.00)' : ''), tone: c.calc.rf >= 0.5 ? 'good' : 'drift', note: 'Retuning ' + fmt(c.calc.rf) + ' of 1 (0.50+ is a working habit).' });
    model.tiles = tiles;

    model.findings = findings(c, v);
    model.sections = R.wps.map(function (code) { var s = wpSection(code, c, v, RP); if (R.optional && R.optional[code]) s.optional = true; return s; });
    model.focus = R.focus || null;
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

    // The deeper read: facts, insight rules, data checks, recommendations and the rest.
    var F = facts(c, data);
    model.sections.forEach(function (s) { extras(s.code, s, F, v); });
    model.extra = [notesDetail(F, v), readyDetail(F, v)];
    var fired = fireRules(F, v), checks = runChecks(F);
    // "Working well, nothing to fix" only when there really is nothing else to work on: never beside a
    // Top 3, and never when one person holds most of the planning and remembering.
    var hasWork = fired.some(function (r) { return !r.strength && r.rec && r.id !== 'state-not-now'; });
    if (hasWork) fired.forEach(function (r) { if (r.id === 'sol-holding') r.rec = null; });
    if (hasWork) model.findings = model.findings.map(function (t) { return t.replace(': it is working well. Keep the same rhythm; nothing needs fixing this week.', ': the core numbers are working well. A few smaller things are still worth a look, and they are in the Top 3 below.'); });
    model.insights = fired;
    model.anomalies = checks;
    model.recs = recommend(fired, checks, F, v, model.sections.concat(R.solo ? [model.extra[0]] : []));
    otherView(model.recs, fired, F, v);
    model.plan = plan2(model.recs, c, v, sp);
    model.persons = personViews(F, v);
    model.self = selfDiscovery(F, v);
    model.pillars = pillars2(model.pillars, F, fired, v);
    model.guide = guide(fired, F, v, RP);
    model.glossary = R.solo ? GLOSSARY.filter(function (g) { return !SOLO_SKIP_TERMS[g[0]]; }) : GLOSSARY.filter(function (g) { return data.road === 'coworkers' || g[0] !== 'Consulted and Informed'; });
    model.method = method(F);
    model.confidence = confidence(F, checks);
    model.completeness = completeness(data);
    model.summary = summaryOf(F, v, fired, model.confidence, model.recs, model);
    model.counts = { rules: RULES.length, checks: CHECKS.length, fired: fired.length, flagged: checks.length };
    if (c.calc.sol != null) {
      model.calcSection.moves = C1().suggestions({ wb: c.calc.wb, oc: c.calc.oc, as: c.calc.as, weights: C1().W.sol,
        balance: c.calc.wbSrc === 'WP-01' && F.w1 ? F.w1.balance : null,
        ownership: c.calc.ocSrc === 'WP-03' && c.wp03 && c.wp03.tasks ? { total: c.wp03.tasks, owned: c.wp03.owned } : null,
        names: P.list.map(function (p) { return p.label; }) }).filter(function (x) { return !(x.key === 'wb' && !(F.w1 && F.w1.handoff)) && !(x.gain != null && x.gain <= 0); }).map(function (x) { return x.text; });
    } else model.calcSection.moves = [];
    model.calcSection.link = linkOf('CALC-01');
    model.fair.push('Everything stays on your device. The report was made in your browser and nothing was sent anywhere.');
    if (R.solo) soloWords(model);
    return model;
  }

  function findings(c, v) {
    var R = c.R, out = [], calc = c.calc;
    function add(pri, text) { out.push({ p: pri, t: text }); }
    if (!c.anything) {
      return ['Nothing is filled in yet, so there is nothing to read. That is fine: start with one page, and the report grows with you.',
        R.solo ? 'A good first page is WP-02, your load score. One minute, about the last day or two.' : 'A good first page is ' + (R.wps[0]) + ', ' + NAMES[R.wps[0]] + '.',
        'Everything stays on this device. Nothing you type or choose is sent anywhere.'];
    }
    if (calc.sol != null) {
      var s = fmt(calc.sol), leans = leanReasons(c);
      if (calc.sol >= 0.7 && leans.length) add(10, 'The setup reads ' + s + ' on CALC-01, so the numbers hold, but ' + list(leans) + '. A high score can hide a setup that leans on one person or keeps slipping, so that is the place to look before calling it settled.');
      else if (calc.sol >= 0.7) add(10, 'The setup reads ' + s + ' on CALC-01: it is working well. Keep the same rhythm; nothing needs fixing this week.');
      else if (calc.sol >= 0.4) add(10, 'The setup reads ' + s + ' on CALC-01: it needs a look, because something is slipping. The biggest single gap is ' + calc.worst.fix + ', so start there, not with whatever happened most recently.');
      else add(10, 'The setup reads ' + s + ' on CALC-01: it needs a rethink, together, because it is asking too much as it is. That is a statement about the setup, not about anyone. The biggest gap is ' + calc.worst.fix + '.');
      if (calc.rf != null && Math.abs(calc.gap) >= 0.08) add(7, calc.gap > 0 ? 'The setup score runs ' + fmt(calc.gap) + ' above the overall score: the setup holds, but repair after friction isn’t keeping up. WP-09 is the place to work, not the owners list.' : 'Apex runs ' + fmt(-calc.gap) + ' above the setup score: you repair well, but the setup keeps making friction to repair. The owners list is the place to work.');
    } else if (R.calc && c.anything && !R.focus) {
      add(3, 'CALC-01 isn’t worked out yet. Still needed: ' + calc.missing.join('; ') + '. Nothing is guessed in the meantime.');
    }
    var high = c.battery.filter(function (b) { return b.score != null && b.score >= 0.6; });
    var scored = c.battery.filter(function (b) { return b.score != null; });
    if (R.solo) {
      var b0 = c.battery[0];
      if (b0.score != null) add(9, 'Your load reads ' + fmt(b0.score) + ': ' + b0.band.label.toLowerCase() + '. ' + (b0.band.key === 'high' ? 'Put off what doesn’t need deciding today, and reach for your settling defaults first.' : b0.band.key === 'medium' ? 'Worth saying out loud before a hard conversation: “Heads up, I’m carrying more than usual today.”' : 'Whatever comes up today is probably about the thing itself, not leftover load.'));
      var top = topFactors(c);
      if (top.length) add(6, 'What’s adding most to your load: ' + list(top.map(function (t) { return t.toLowerCase(); })) + '. Those are conditions, not character, and some are in your control this week.');
    } else if (high.length) {
      add(9, (high.length === 1 ? high[0].label + '’s load reads ' + fmt(high[0].score) : list(high.map(function (b) { return b.label; })) + ' have load scores at 0.60 or above') + '. That is a high load. Protect it: put off anything that doesn’t need deciding this week, and say your number before any hard talk.');
    } else if (scored.length >= 2) {
      add(4, 'Every load score that was filled in reads under 0.60 (' + scored.map(function (b) { return b.label + ' ' + fmt(b.score); }).join(', ') + '). Good conditions for the harder conversations.');
    }
    if (c.wp03 && c.wp03.filled && c.wp03.unowned.concat(c.wp03.half).length) {
      var gaps = c.wp03.unowned.concat(c.wp03.half);
      add(8, plural(gaps.length, v.task, v.tasks) + ' still need' + (gaps.length === 1 ? 's' : '') + ' a clear owner: ' + list(gaps.slice(0, 4)) + (gaps.length > 4 ? ' and more' : '') + '. Work with no owner drifts to whoever notices it first.');
    } else if (c.wp03 && c.wp03.filled && c.wp03.tasks) {
      add(5, 'Every one of the ' + c.wp03.tasks + ' ' + v.tasks + ' on your list has an owner. That clarity is doing real work.');
    }
    if (c.wp01 && c.wp01.shares && c.n >= 2) {
      var sh = c.wp01.shares, mx = Math.max.apply(null, sh), iMax = sh.indexOf(mx);
      if (c.calc.wb != null && c.calc.wb < 0.7) add(7, 'The logged minutes leaned one way this week: ' + c.P.list.map(function (p) { return p.label + ' ' + Math.round(sh[p.i]) + '%'; }).join(', ') + '. That is a fact about how ' + v.work + ' fell this week, not about effort or care.');
      else add(3, 'The logged minutes were fairly even this week (' + c.P.list.map(function (p) { return p.label + ' ' + Math.round(sh[p.i]) + '%'; }).join(', ') + ').');
      void iMax;
    }
    if (c.wp04 && c.wp04.patterns.length) add(7, plural(c.wp04.patterns.length, 'task') + ' came up 3 or 4 weeks out of 4: ' + listSome(c.wp04.patterns.map(function (p) { return p.task; }), 3) + '. That is a pattern, not a fluke, and usually a gap in the setup.');
    if (c.conc && c.conc.flag && !(calc.sol != null && calc.sol >= 0.7)) add(7, cap(c.conc.lines.join('; ')) + '. That is a fact about how the setup has settled, not about effort or care, and it is worth one question: which job would they hand over first?');
    if (c.wp09 && c.wp09.advice === 'pause') add(5, 'Your Say it so it lands checks suggest pausing before you answer that message' + (c.wp09.pattern ? ': it may be touching an older pattern, not just these words.' : '.'));
    if (c.wp13 && c.wp13.thanks.length) add(4, plural(c.wp13.thanks.length, 'appreciation') + ' written down in the daily check-ins. Those are worth reading again on a harder day.');
    if (c.wp11 && c.wp11.filled && !(c.wp11.first || c.wp11.second)) add(3, 'The Calm-Down Kit is started, but no settling defaults are chosen yet. Picking two on a calm day is what makes it work in the moment.');
    if (R.solo && c.notes.wiringLines) add(5, 'Your Wiring Card has ' + c.notes.wiringLines + ' of 9 lines filled in. That is the start of a short, kind way to explain yourself, whenever you want to share it.');
    if (R.solo && c.notes.weather.length >= 2) {
      var wb2 = c.notes.weather.filter(function (w) { return w.battery != null; });
      if (wb2.length >= 2) { var d = wb2[wb2.length - 1].battery - wb2[0].battery; add(6, 'Across your weather log, your load went from ' + fmt(wb2[0].battery) + ' to ' + fmt(wb2[wb2.length - 1].battery) + (Math.abs(d) < 0.05 ? ': holding steady.' : d < 0 ? ': lighter. Notice what helped.' : ': heavier. Be kind about it, and look at what changed.')); }
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

  // What a high CALC-01 read can hide: one person holding most of the jobs or minutes, or a task
  // that slips most weeks.
  function leanReasons(c) {
    var out = (c.conc && c.conc.lines || []).slice();
    if (c.wp04 && c.wp04.patterns.length) out.push(listSome(c.wp04.patterns.map(function (p) { return p.task; }), 2) + (c.wp04.patterns.length === 1 ? ' slipped' : ' slipped') + ' 3 or 4 weeks out of 4');
    return out;
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

  // "Based on Maya's log only. Jordan hasn't added a week yet."
  function oneSidedLine(o) {
    return 'Based on ' + list(o.have.map(function (x) { return x + '’s'; })) + ' log only. ' + list(o.missing) + (o.missing.length === 1 ? ' hasn’t' : ' haven’t') + ' added ' + (o.missing.length === 1 ? 'a week' : 'their weeks') + ' yet.';
  }
  function wpSection(code, c, v, RP) {
    var R = c.R, s = { code: code, name: NAMES[code], title: (schemaFor(code, c.road) || {}).title, entered: [], shows: [], doesnt: DOESNT[code], next: '', status: 'blank', ask: RP && RP.ask ? RP.ask[code] : '' };
    var P = c.P;
    if (code === 'WP-01') {
      var w = c.wp01 || {};
      if (!w.filled) { s.next = R.refusalsOnly ? 'Draft one kind no for a real request coming up: why the request is fair, what you have left, and what you can offer instead.' : 'Log one ordinary week, 5 to 7 days: each ' + v.task + ', who did it and rough minutes. No discussing it until the week is done.'; return s; }
      s.status = 'filled';
      if (!R.refusalsOnly) {
        if (w.oneSided) s.shows.push(oneSidedLine(w.oneSided) + ' The split, the balance and any hand-over wait until everyone’s week is in.');
        s.entered.push(['Rows logged', w.logged ? String(w.logged) : 'Not filled in']);
        s.entered.push(['Minutes with a name', w.total ? fmt(w.total, 0) + ' minutes in ' + w.rowsUsed + ' rows' : 'Not filled in']);
        if (w.total) P.list.forEach(function (p) { s.entered.push([p.label, w.oneSided && w.oneSided.missing.indexOf(p.label) >= 0 ? 'Not added yet' : fmt(w.minutes[p.i], 0) + ' min' + (w.shares ? ' (' + Math.round(w.shares[p.i]) + '%)' : '') + ', ' + fmt(w.noticed[p.i], 0) + ' noticed and handled without being asked']); });
        if (w.wb != null) s.shows.push('Workload balance ' + fmt(w.wb) + (c.n === 2 ? ' (1 minus the gap between the two shares).' : ' (1 minus the share of time that would have to change hands for an even split, out of the most it could be).') + ' ' + (w.wb >= 0.7 ? 'The logged work was fairly even.' : w.wb >= 0.4 ? 'The logged work leaned toward one side.' : 'Most of the logged work landed on one side.'));
        else if (!w.oneSided) s.shows.push('No balance score yet: it needs rows with both a name and minutes. An empty log is not an even week.');
        if (w.total) {
          var nt = w.noticed.reduce(function (a, b) { return a + b; }, 0);
          if (nt > 0) s.shows.push(Math.round(nt / w.total * 100) + '% of the logged minutes were noticed and handled without anyone asking: the quiet work that usually goes unseen.');
        }
        if (w.sharedRows && w.sharedRows.length) s.shows.push(plural(w.sharedRows.length, 'row') + ' named more than one person (' + listSome(w.sharedRows.map(function (x) { return x.task + ': ' + list(x.who); }), 3) + '). Those minutes were split evenly between the names written. If one person led it, write just their name.');
        if (w.unmatched && w.unmatched.length) s.shows.push('Left out because the name didn’t match anyone: ' + list(w.unmatched.map(function (x) { return '“' + x + '”'; })) + '.');
        s.next = w.wb != null && w.wb < 0.7 ? 'Bring the log to ' + v.meeting + ' and ask one question: which ' + v.task + ' would the busiest person most like to hand over?' : 'Run the same log again in a month and compare. The change matters more than the number.';
      }
      if (c.refusals && c.refusals.length) {
        s.entered.push(['Kind no’s drafted', String(c.refusals.length)]);
        s.shows.push('You have ' + plural(c.refusals.length, 'kind no') + ' ready: ' + c.refusals.map(function (r) { return '“' + said([sentence(r.ack), sentence(r.cap), sentence(r.alt)]) + '”'; }).slice(0, 2).join('  ') + (R.solo ? ' Saying no to one thing is how you say yes to your own energy.' : ''));
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
      c.battery.forEach(function (b) { if (b.score != null) s.shows.push((R.solo ? 'Your load score' : b.label) + ': ' + fmt(b.score) + ', ' + b.band.label.toLowerCase() + '. ' + (b.band.key === 'high' ? 'A way to press pause, not a way out: “let’s come back to this tomorrow.”' : b.band.key === 'medium' ? 'Worth a heads-up before a hard conversation.' : 'Whatever comes up is probably about the thing itself.')); });
      if (!R.solo && c.calc.asSrc === 'WP-02') s.shows.push('Average across ' + (c.calc.asPeople < c.n ? 'the ' + c.calc.asPeople + ' adults' : 'all ' + c.n + ' people') + ': ' + fmt(c.calc.as) + '. This is the stress input to CALC-01.');
      else if (!R.solo && c.calc.applies) s.shows.push('No average yet: still waiting on ' + list(c.battery.filter(function (b) { return b.score == null && !b.child; }).map(function (b) { return b.label; })) + '. CALC-01 never works it out while anyone\u2019s load score is missing.');
      if (R.solo) { var tf = topFactors(c); if (tf.length) s.shows.push('Scored 3 or 4: ' + list(tf.map(function (x) { return x.toLowerCase(); })) + '.'); }
      var hi = c.battery.filter(function (b) { return b.band && b.band.key === 'high'; });
      s.next = hi.length ? (R.solo ? 'This week, before any hard conversation, reach for your first settling default and say your number out loud.' : 'Agree that anyone at 0.60 or above can say “not today” and name a time instead, with no explanation needed.') : 'Keep it to one minute a day for a week. Patterns show up fast.';
      return s;
    }
    if (code === 'WP-03') {
      var t = c.wp03;
      if (!t.filled) { s.next = 'Sit down once, with the week’s log if you have it, and give every recurring ' + v.task + ' exactly one owner.'; return s; }
      s.status = 'filled';
      s.entered.push([c.road === 'coworkers' ? 'Team tasks listed' : 'Tasks listed', String(t.tasks)]);
      s.entered.push(['Jobs with an owner', t.owned + ' of ' + t.tasks]);
      P.list.forEach(function (p) { if (t.byOwner[p.i]) s.entered.push([p.label + ' (owner)', plural(t.byOwner[p.i], 'job')]); });
      s.shows.push(t.oc != null ? 'Ownership clarity ' + fmt(t.oc) + '. ' + (t.oc >= 0.9 ? 'Almost everything has a clear owner.' : t.oc >= 0.7 ? 'Most things are owned; a few are still floating.' : t.oc >= 0.4 ? 'Some things are owned; many are still floating.' : 'More than half of the list still has no owner.') : 'No tasks listed, so there is no clarity number (not a zero).');
      if (t.conc && t.conc.flag) s.shows.push(P.label(t.conc.top) + ' owns ' + t.conc.count + ' of the ' + t.conc.total + ' ' + v.tasks + ' with one named owner (' + pct(t.conc.share) + '; an even share would be ' + pct(1 / c.n) + '). Clarity reads whether each job has a name, not how the jobs are spread, so read the two together.');
      if (t.unowned.length) s.shows.push('No owner yet: ' + list(t.unowned) + '.');
      if (t.half.length) s.shows.push('A helper, but no owner yet: ' + list(t.half) + '.');
      if (t.starters && t.starters.length) s.shows.push('Left out as examples (starter jobs nobody filled in): ' + list(t.starters.slice(0, 6)) + (t.starters.length > 6 ? ' and more' : '') + '.');
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
      if (m.parts === 3) s.shows.push('Your message, in order: “' + said([sentence(m.fact), feelingSentence(m.feeling), sentence(m.ask, true)]) + '”');
      else s.shows.push(m.parts + ' of the three parts written. The one that is hardest to write is usually the one that matters most.');
      if (m.advice === 'pause') s.shows.push('The checks suggest pausing first' + (m.satNo ? ': you might read it differently with a lighter load' : '') + (m.pattern ? (m.satNo ? ', and' : ':') + ' it may be answering an older pattern, not these words' : '') + '. Use a kind “not right now” and come back.');
      else if (m.advice === 'name') s.shows.push('Name the specific task or event first. A message about a pattern is much harder to hear than one about a single thing.');
      else if (m.advice === 'clear' && m.checks < 4) s.shows.push('The checks answered so far look fine; ' + plural(4 - m.checks, 'check') + ' still ' + (4 - m.checks === 1 ? 'needs' : 'need') + ' an answer before you respond.');
      else if (m.advice === 'clear') s.shows.push('The checks say you’re clear to respond. Build the reply from the fact, the feeling and the ask.');
      s.next = m.advice === 'pause' ? 'Wait until your load score reads lower, then send the version built from fact, feeling and ask.' : 'Use fact, feeling and ask on one more message this week, and notice how it lands.';
      return s;
    }
    if (code === 'WP-11') {
      var k = c.wp11;
      if (!k.filled) { s.next = 'On an ordinary day, pick your two settling defaults and write one pause line: how you are, how long you need, and when you’ll be back.'; return s; }
      s.status = 'filled';
      s.entered.push(['First default', k.first || 'Not chosen']);
      s.entered.push(['Second default', k.second || 'Not chosen']);
      P.list.forEach(function (p) { s.entered.push([R.solo ? 'Your pause line' : 'Pause line: ' + p.label, k.lines[p.i] || 'Not filled in']); });
      if (k.plan && k.plan.any) s.entered.push([R.solo ? 'Pause plan' : 'Our pause plan (shared)', [k.plan.word && 'pause word: ' + k.plan.word, k.plan.min && 'shortest break: ' + k.plan.min, k.plan.back && 'coming back: ' + k.plan.back, k.plan.first && 'first words back: ' + q(k.plan.first)].filter(Boolean).join('; ')]);
      if (!R.solo && !(k.plan && k.plan.any)) s.shows.push('Our pause plan isn\u2019t agreed yet: a pause word, the shortest break, and how you come back. It is the one part of the kit made to share.');
      if (k.triggers.length) s.entered.push(['What tends to start it', k.triggers.map(function (t) { return [t.trigger, t.body].filter(Boolean).join(' (felt in: ') + (t.body && t.trigger ? ')' : ''); }).join('; ')]);
      if (k.latest != null) s.shows.push('Latest reading after settling: ' + fmt(k.latest) + (k.before != null ? ' (from ' + fmt(k.before) + ')' : '') + '. ' + (k.ret === 'back' ? 'Settled enough (under 0.50): go back in, at the time you named.' : k.ret === 'again' ? 'Still a bit hot (0.50 to 0.60, or one round so far): take another round first.' : 'Still hot after two rounds (0.60 or above): put it off to a named time. “Tomorrow after dinner” is a real plan; “later” is not.'));
      var missingLines = P.list.filter(function (p) { return !k.lines[p.i]; });
      if (!R.solo && missingLines.length && missingLines.length < c.n) s.shows.push('Pause lines still to write: ' + list(missingLines.map(function (p) { return p.label; })) + '.');
      if (k.first && k.second) s.shows.push('Both defaults are chosen ahead of time, so nobody has to decide in the moment.');
      s.next = !(k.first && k.second) ? 'Choose the missing default on a calm day, and try it once when nothing is wrong.' : R.solo ? 'Say your pause line out loud once this week, even on a small thing, so it feels normal.' : 'Make sure everyone recognizes everyone else’s pause line, so a pause is never mistaken for walking out.';
      return s;
    }
    if (code === 'WP-13') {
      var q = c.wp13;
      if (!q.filled) { s.next = c.road === 'coworkers' ? 'Try the 90-second daily check-in as a team stand-up for one week: load, one thanks, one ask.' : 'Try it for one week, 90 seconds a day: load, one thanks, one small ask.'; return s; }
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
      out.rows.push(['Average load (AS)', k.as != null ? fmt(k.as) : 'Not filled in', k.asSrc === 'WP-02' ? 'worked out from WP-02 (' + (k.asPeople < c.n ? 'the ' + k.asPeople + ' adults; children aren\u2019t asked' : 'all ' + c.n + ' people') + ')' : src(k.asSrc)]);
    }
    out.rows.push(['Retuning (RF)', k.rf != null ? fmt(k.rf) : 'No value', k.friction > 0 ? k.retunes + ' ÷ ' + k.friction + ' friction moments' + (k.capped ? ', capped at 1.00' : '') : (k.friction === 0 ? 'no friction moments: nothing to repair, which is not a zero' : 'not filled in')]);
    if (k.applies) {
      if (k.sol != null) {
        out.lines.push('Setup score = ' + fmt(k.wb) + ' × 0.40 + ' + fmt(k.oc) + ' × 0.35 + (1 − ' + fmt(k.as) + ') × 0.25 = ' + fmt(k.sol) + ': ' + k.solBand.label.toLowerCase() + '.');
        out.lines.push('Overall score = ' + (k.apexRebalanced ? '(' + fmt(k.wb) + ' × 0.35 + ' + fmt(k.oc) + ' × 0.30 + (1 − ' + fmt(k.as) + ') × 0.20) ÷ 0.85' : fmt(k.wb) + ' × 0.35 + ' + fmt(k.oc) + ' × 0.30 + (1 − ' + fmt(k.as) + ') × 0.20 + ' + fmt(k.rf) + ' × 0.15') + ' = ' + fmt(k.apex) + ': ' + k.apexBand.label.toLowerCase() + '.');
        out.lines.push('Where the points went: ' + k.terms.map(function (t) { return t.key + ' gives up ' + fmt(t.short, 3); }).join(', ') + '. The biggest gap is ' + k.worst.fix + '.');
        if (c.conc && c.conc.lines.length) out.lines.push('Beside the score: ' + c.conc.lines.join('; ') + '. The score reads whether jobs are named and time is logged, not how they are spread, so this is worth reading next to it' + (k.sol >= 0.7 ? ', even at ' + fmt(k.sol) + '.' : '.'));
        if (k.sol < 0.4 && k.apex < 0.4) out.lines.push('Both scores are low at the same time. In that pattern, one more worksheet probably isn’t what helps most. It may be worth asking someone neutral that everyone trusts to help you rework the setup together.');
      } else {
        out.lines.push('No read yet. Still needed: ' + k.missing.join('; ') + '. The calculator never fills a gap with a guess.');
      }
      out.lines.push('Bands: 0.70 and up, working well; 0.40 to 0.69, needs a look; under 0.40, needs a rethink, together. Higher means the setup is working better. Round numbers, not hard lines.');
    } else {
      out.lines.push('On this road CALC-01’s full read isn’t worked out: it reads how a workload is shared between people. Your load score and your retuning count are the numbers that fit.');
    }
    return out;
  }

  // The part of the report written for this road.
  function roadPart(c, v, RP, sp) {
    var R = c.R, out = { heading: '', paras: [], suggestions: [], look: RP ? RP.look : [], talk: RP ? RP.talk : [], talkTitle: R.solo ? 'Questions to sit with' : 'Conversation starters', together: RP ? RP.together : null, links: [] };
    function sug(t) { out.suggestions.push(t); }
    if (R.solo) {
      out.heading = 'Just you: understanding yourself';
      out.paras.push('This road is about you: how full your battery runs, how you’re wired, the patterns in your weeks, what is in your control, and, if you ever want to, how to explain yourself to the people around you. It is for you first; share any page only if you want to.');
      var b = c.battery[0];
      out.blocks = [];
      out.blocks.push(['Your load score', b.score != null ? 'It reads ' + fmt(b.score) + ' (' + b.band.label.toLowerCase() + ').' + (topFactors(c).length ? ' The biggest contributors right now: ' + list(topFactors(c).map(function (x) { return x.toLowerCase(); })) + '.' : '') : 'Not filled in yet. One minute with WP-02 is the best first step.']);
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
      ctrl.push('when you have a hard conversation (after reading your load score, not before)');
      ctrl.push('how you phrase it: fact, feeling, ask');
      out.blocks.push(['What’s in your control', 'Not how anyone else feels or answers. But ' + list(ctrl) + '.']);
      var card = explainCard(c);
      out.blocks.push(['Putting yourself into words', card ? 'A few lines you could share' + (c.who.others ? ' (you named: ' + c.who.others + ')' : '') + ', in your own words: ' + card : 'Once your Wiring Card has a few lines, the report turns them into a short note you can share, in your own words.']);
      out.links = [['Know yourself', '/know-yourself.html'], ['Make a Wiring Card', '/wiring-card.html'], ['Today’s Weather', '/quick-checks.html#today'], ['The Five Pillars', '/five-pillars.html']];
      if (b.score != null && b.band.key === 'high') sug('Your load score is high. This week, protect it: one kind no, one early night, and no big decisions that can wait.');
      if (!c.notes.wiringLines) sug('Fill in the Wiring Card. It is the fastest way to explain yourself without having to explain everything.');
      if (c.wp09 && c.wp09.advice === 'pause') sug('Hold that message for now. Come back to it when your load is lower.');
      if (!(c.wp11 && c.wp11.first)) sug('Pick your two settling defaults on a calm day, so they are ready on a hard one.');
      sug('Read the Know Yourself page for more ways into self-understanding, all at your own pace.');
      return out;
    }
    // "For your family" on its own when the road's name only repeats it ("For your family: family")
    var rl = R.label.toLowerCase(), grp = String(v.group || '');
    out.heading = grp.toLowerCase().indexOf(rl) >= 0 || rl.indexOf(grp.replace(/^your\s+/i, '').toLowerCase()) === 0 ? 'For ' + grp : 'For ' + grp + ': ' + rl;
    if (RP) { out.paras.push(RP.what); out.paras.push(RP.lens); }
    if (sp && sp.care) out.paras.push(sp.care);
    var t = c.wp03, k = c.calc;
    if (c.road === 'coworkers') {
      if (t && t.filled && (t.unowned.length || t.half.length)) sug('Bring the unowned team tasks (' + list(t.unowned.concat(t.half).slice(0, 4)) + ') to the next retrospective and ask for one volunteer owner each. An owner is a team role, not a rating.');
      if (t && t.filled && c.road === 'coworkers') sug('The helper, Consulted and Informed can be a group, like "the whole team". Only the owner needs to be one name.');
      if (c.wp13 && c.wp13.filled) sug('Keep the 90-second stand-up: load, one thanks, one ask. Anything bigger goes to the weekly catch-up, not the stand-up.');
      sug('Load score pages are private on this road. Share a number only if you want to, and never use one to rate a teammate.');
      if (c.wp09 && c.wp09.filled) sug('Before a charged chat or email goes out, run it through fact, feeling and ask. Would it read calmly to someone having a hard day?');
    } else if (c.road === 'partners') {
      if (k.wb != null && k.wb < 0.7) sug('Ask each other: which job would you most like to hand over, and what would make that fair? Then change one owner, not ten.');
      if (t && t.unowned.length) sug('Give the unowned jobs (' + list(t.unowned.slice(0, 4)) + ') an owner tonight, one each, in writing.');
      sug('Say your load number before any hard talk. If either of you is at 0.60 or above, name a time instead.');
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
      sug('Check your own load score first. Sometimes it was the week, not the friendship.');
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
    out.links = [['The Five Pillars', '/five-pillars.html'], ['Check-ins', '/check-ins.html'], ['The Signal Translator', '/signal-translator.html'], ['CALC-01', '/is-the-setup-working.html']];
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
      III: b0.length ? avg([1 - avg(b0.map(function (b) { return b.score; })), c.wp11 && c.wp11.latest != null ? (c.wp11.latest < 0.5 ? 1 : c.wp11.latest < 0.6 ? 0.5 : 0) : null]) : null,
      IV: avg([k.rf, c.wp09 && c.wp09.filled ? c.wp09.parts / 3 : null, c.notes.wiringLines ? c.notes.wiringLines / 9 : null]),
      V: avg([c.wp13 && c.wp13.entries ? c.wp13.thanks.length / c.wp13.entries : null, c.wp04 && c.wp04.raw.length ? 1 - c.wp04.patterns.length / c.wp04.raw.length : null, !R.solo && c.wp03 && c.wp03.filled && c.wp03.tasks ? 1 - (c.wp03.unowned.length / c.wp03.tasks) : null])
    };
    var from = {
      I: R.solo ? 'WP-02 and your weather log' : 'workload balance (WP-01)',
      II: R.solo ? 'your Calm-Down Kit defaults and kind no’s' : 'ownership clarity (WP-03)' + (c.wp04 ? ' and What keeps coming back? (WP-04)' : ''),
      III: 'load scores (WP-02)' + (c.wp11 ? ' and coming back after settling (WP-11)' : ''),
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
    if (!R.solo && c.wp03 && ((c.wp03.filled && (c.wp03.unowned.length || c.wp03.half.length)) || (!c.wp03.filled && R.calc))) add(8, 'One owner for every ' + v.task, 'WP-03', c.wp03.filled ? 'Give each of these exactly one owner: ' + list(c.wp03.unowned.concat(c.wp03.half).slice(0, 5)) + '.' : 'Sit down once and give every recurring ' + v.task + ' exactly one owner.', 'II');
    if (!R.solo && R.calc && (k.wb == null || k.wb < 0.7)) add(7, 'See the whole load', 'WP-01', k.wb == null ? 'Log one ordinary week of who did what, with rough minutes. No discussing it until the week is done.' : 'Log another week and compare. Then hand over one ' + v.task + ' from the busiest person.', 'I');
    if (c.wp04 && c.wp04.patterns.length) add(7, 'Fix what keeps slipping', 'WP-04, WP-03', 'Give ' + list(c.wp04.patterns.map(function (p) { return p.task; }).slice(0, 3)) + ' a new or clearer owner, then watch it for a month.', 'V');
    if (c.wp09 && (!c.wp09.filled || c.wp09.advice === 'pause' || (k.rf != null && k.rf < 0.5))) add(6, 'Say it so it lands', 'WP-09', 'Put one charged message a week through fact, feeling and ask before it goes out. Count the friction moments and how many you retuned.', 'IV');
    if (c.wp11 && !(c.wp11.first && c.wp11.second)) add(5, 'Your calm-down kit', 'WP-11', 'On a calm day, pick two settling defaults and write a pause line: how you are, how long you need, when you’ll be back.', 'III');
    if (c.wp13 && (!c.wp13.filled || c.wp13.thanks.length < c.n)) add(5, c.road === 'coworkers' ? 'A short daily stand-up' : 'The 90-second daily check-in', 'WP-13', 'Every day for a week: load, one thanks, one small ask. No debating.', 'V');
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

  /* ============================================================ the deeper read */
  // Everything below turns the numbers from compute() into the long report: facts about each
  // page, a library of insight rules that connect the pages, gentle data checks, ranked
  // recommendations, a view for each person, the pillars, a discussion guide and a method note.
  // Same promise as above: plain computation on this device, and a blank is never a guess.

  var LINKS = {
    'WP-01': ['WP-01 Who did what', '/workpapers/fill/wp-01.html'],
    'WP-02': ['WP-02 How much are you carrying?', '/workpapers/fill/wp-02.html'],
    'WP-03': ['WP-03 One owner per job', '/workpapers/fill/wp-03.html'],
    'WP-04': ['WP-04 What keeps coming back?', '/workpapers/fill/wp-04.html'],
    'WP-09': ['WP-09 Say it so it lands', '/workpapers/fill/wp-09.html'],
    'WP-11': ['WP-11 The Calm-Down Kit', '/workpapers/fill/wp-11.html'],
    'WP-13': ['WP-13 The 90-second daily check-in', '/workpapers/fill/wp-13.html'],
    'CALC-01': ['CALC-01, Is the setup working for everyone?', '/is-the-setup-working.html'],
    NOTES: ['Make a Wiring Card', '/wiring-card.html'],
    wiring: ['Make a Wiring Card', '/wiring-card.html'],
    weather: ['Today’s Weather', '/quick-checks.html#today'],
    READY: ['The Workpaper Suite', '/workpapers/fill/suite.html'],
    know: ['Know yourself', '/know-yourself.html'],
    pillars: ['The Five Pillars', '/five-pillars.html'],
    checkins: ['Check-ins', '/check-ins.html'],
    signal: ['The Signal Translator', '/signal-translator.html'],
    lemonade: ['The Lemonade Stand', '/lemonade-stand.html'],
    decoder: ['Carrier Wave Decoder', '/carrier-wave-decoder.html'],
    pause: ['Pause and Play', '/pause-and-play.html'],
    wired: ['Wired differently', '/wired-differently.html']
  };
  function linkOf(k) { return LINKS[k] ? LINKS[k].slice() : null; }

  var STOP = ['with', 'from', 'that', 'this', 'they', 'them', 'what', 'when', 'into', 'each', 'after', 'before', 'about', 'shared', 'cleaning', 'team', 'week', 'weekly', 'daily', 'their', 'other', 'things', 'stuff', 'some', 'make', 'making', 'take', 'taking', 'doing', 'have', 'again', 'really', 'just', 'felt', 'feel'];
  function words(s) {
    return trim(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(function (w) { return w.length >= 4 && STOP.indexOf(w) < 0; })
      .map(function (w) { return w.replace(/ies$/, 'y').replace(/(es|s)$/, ''); });
  }
  // Two task names that are probably the same job ("Trash" and "Trash and recycling").
  function sameTask(a, b) {
    var A = words(a), B = words(b);
    if (!A.length || !B.length) return trim(a).toLowerCase() === trim(b).toLowerCase() && trim(a) !== '';
    return A.some(function (w) { return B.indexOf(w) >= 0; });
  }
  // Planning, remembering and keeping track: the load that doesn't look like work.
  var MENTAL_RE = /\b(plan|planning|planned|remember\w*|remind\w*|schedul\w*|calendar|book|booking|organi[sz]\w*|track\w*|lists?|research\w*|coordinat\w*|arrang\w*|follow[- ]?ups?|budget\w*|bills?|paperwork|admin\w*|inbox|triage|appointments?|birthdays?|gifts?|meal plan\w*|notes|forms?|renew\w*|permission\w*|check[- ]?ins?|emotional|logistics|rota|status|insurance|medications?|handoffs?)\b/i;
  function freqKind(f) {
    f = trim(f).toLowerCase();
    if (!f) return 'unknown';
    if (/daily|each meeting|ongoing|every day|weekday|each shift/.test(f)) return 'frequent';
    if (/week/.test(f)) return 'weekly';
    if (/month|quarter|year|term/.test(f)) return 'occasional';
    if (/as needed|one[- ]?off|once|when needed/.test(f)) return 'asneeded';
    return 'other';
  }
  function avgOf(a) { a = a.filter(function (x) { return x != null && !isNaN(x); }); return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }
  function sumOf(a) { return a.reduce(function (s, x) { return s + (x || 0); }, 0); }
  function uniq(a) { var seen = {}, out = []; a.forEach(function (x) { var k = String(x); if (!seen[k]) { seen[k] = 1; out.push(x); } }); return out; }
  function q(s) { return '“' + s + '”'; }
  function pc(x) { return Math.round(x * 100) + '%'; }
  function minText(m) { m = Math.round(m); return m >= 120 ? m + ' min (' + (Math.round(m / 6) / 10) + ' h)' : m + ' min'; }
  function lc(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function short(s, n) { s = trim(s); n = n || 60; return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; }

  // "Sam", "Sam and Jo", "Everyone": who owns a job, allowing for a list of names.
  function ownersOf(P, raw) {
    var s = trim(raw);
    if (!s) return { list: [], all: false, multi: false, unknown: [] };
    var r = P.resolve(s);
    if (r === 'all') return { list: P.list.map(function (p) { return p.i; }), all: true, multi: P.n > 1, unknown: [] };
    if (typeof r === 'number') return { list: [r], all: false, multi: false, unknown: [] };
    var parts = s.split(/\s*(?:,|&|\+|\/|\band\b)\s*/i).filter(Boolean);
    if (parts.length > 1) {
      var ids = uniq(parts.map(P.resolve).filter(function (x) { return typeof x === 'number'; }));
      if (ids.length > 1) return { list: ids, all: false, multi: true, unknown: [] };
    }
    return { list: [], all: false, multi: false, unknown: [s] };
  }

  var ABSOLUTE_RE = /\b(always|never|every single time|every time|constantly|nothing ever|you people)\b/i;
  var FINE_RE = /\b(?:feel(?:ing)?|i'?m|i am|we'?re|we are|doing|all)\s+(?:fine|great|good|ok|okay|relaxed|calm|rested)\b|\bno stress\b|\bnot stressed\b|\ball good\b|\bstress[- ]free\b/i;

  function dayIndex(d) { var k = DAYS.map(function (x) { return x.toLowerCase(); }).indexOf(trim(d).slice(0, 3).toLowerCase()); return k; }
  function parseISO(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trim(s)); if (!m) return null; var d = new Date(+m[1], +m[2] - 1, +m[3]); return isNaN(d) ? null : d; }

  /* ---------- facts: every page, read closely */

  function facts(c, data) {
    var P = c.P, n = c.n, R = c.R;
    var F = { c: c, data: data, P: P, n: n, R: R, road: c.road, solo: !!R.solo, now: new Date() };
    var pp = P.list.map(function (p) {
      return { i: p.i, label: p.label, name: p.name, minutes: null, share: null, noticed: 0, asked: 0, rows01: 0, mental: 0, battery: c.battery[p.i], top: [],
        r: 0, a: 0, ra: 0, recurR: 0, checkins: 0, loads: { Low: 0, Medium: 0, High: 0 }, thanks: 0, friction: 0, asks: 0,
        pause: !!(c.wp11 && c.wp11.lines[p.i]), committed: false };
    });
    F.pp = pp;

    // WP-01: rows, owners, time sinks, invisible and mental load
    if (c.wp01 && c.wp01.minutes) {
      var rows = [];
      rowsOf(data, 'wp01.audit', ['day', 'task', 'who', 'minutes', 'how'], sizeOf(data, 'audit')).forEach(function (r) {
        if (!(trim(r.task) || trim(r.who) || trim(r.minutes) || trim(r.how))) return;
        var m = num(r.minutes), who = P.resolve(r.who);
        rows.push({ day: trim(r.day), task: trim(r.task), whoRaw: trim(r.who), who: who, min: m, minRaw: trim(r.minutes), how: r.how || '', mental: MENTAL_RE.test(r.task || ''), noticed: r.how === 'Noticed and handled' });
      });
      var everyone = 0, sinks = {}, names = {};
      rows.forEach(function (r) {
        if (typeof r.who === 'number') { pp[r.who].rows01++; if (r.mental) pp[r.who].mental++; }
        if (!(r.min > 0) || r.who == null) return;
        if (r.who === 'all') everyone += r.min;
        var per = r.who === 'all' ? P.list.map(function (p) { return p.i; }) : [r.who];
        per.forEach(function (i) { var s = r.min / per.length; if (r.noticed) pp[i].noticed += s; else if (r.how === 'Asked for') pp[i].asked += s; });
        if (r.task) { var key = r.task.toLowerCase(); sinks[key] = (sinks[key] || 0) + r.min; names[key] = r.task; }
      });
      var total = c.wp01.total || 0;
      pp.forEach(function (p) { p.minutes = c.wp01.minutes[p.i]; p.share = c.wp01.shares ? c.wp01.shares[p.i] / 100 : null; });
      var namedMental = rows.filter(function (r) { return r.mental && typeof r.who === 'number'; });
      F.w1 = { rows: rows, total: total, everyone: everyone,
        sinks: Object.keys(sinks).map(function (k) { return { task: names[k], min: sinks[k], share: total ? sinks[k] / total : 0 }; }).sort(function (a, b) { return b.min - a.min; }),
        noOwner: rows.filter(function (r) { return r.task && !r.whoRaw; }),
        noMin: rows.filter(function (r) { return (r.task || r.whoRaw) && !trim(r.minRaw); }),
        mentalRows: rows.filter(function (r) { return r.mental; }), namedMental: namedMental,
        noticedTotal: sumOf(pp.map(function (p) { return p.noticed; })),
        days: uniq(rows.filter(function (r) { return r.day && (r.task || r.whoRaw); }).map(function (r) { return r.day; })).length,
        handoff: null };
      if (c.wp01.wb != null && n >= 2) {
        var bh = C1().balance(c.wp01.minutes.map(function (m) { return m / 60; })), ho = C1().balanceHandoff(bh);
        // Only a handoff that really helps: it must raise the balance, and never move work toward
        // someone whose load score is higher than the giver's.
        var bf = ho && c.battery[ho.from], bt = ho && c.battery[ho.to];
        var heavierTo = !!(bf && bt && bf.score != null && bt.score != null && bt.score > bf.score);
        if (ho && ho.after != null && ho.after > c.wp01.wb + 0.005 && !heavierTo) F.w1.handoff = { from: P.label(ho.from), to: P.label(ho.to), fromI: ho.from, toI: ho.to, hours: ho.hours, after: ho.after };
        F.w1.balance = bh;
      }
    }
    F.refusals = c.refusals || null;

    // WP-02: batteries and what fills them
    var FACT = section(schemaFor('WP-02'), 'factors').items.map(function (it) { return it.label.replace(/\s*\(.*\)$/, ''); });
    F.factors = FACT;
    var full = c.battery.filter(function (b) { return b.answered === 5; });
    F.factorAvg = FACT.map(function (l, k) { return avgOf(full.map(function (b) { return b.answers[k]; })); });
    F.factorHigh = FACT.map(function (l, k) { return c.battery.filter(function (b) { return b.answers[k] != null && b.answers[k] >= 3; }).map(function (b) { return b.label; }); });
    pp.forEach(function (p) {
      var b = p.battery;
      if (b.answered) p.top = FACT.map(function (l, k) { return { l: l, k: k, v: b.answers[k] }; }).filter(function (x) { return x.v != null && x.v >= 3; }).sort(function (a, b2) { return b2.v - a.v; });
    });
    var scored = c.battery.filter(function (b) { return b.score != null; });
    F.bat = { scored: scored, full: full, avg: avgOf(scored.map(function (b) { return b.score; })), all: scored.length === n && n > 0,
      max: scored.length ? scored.slice().sort(function (a, b) { return b.score - a.score; })[0] : null,
      min: scored.length ? scored.slice().sort(function (a, b) { return a.score - b.score; })[0] : null };
    F.bat.spread = scored.length >= 2 ? F.bat.max.score - F.bat.min.score : null;
    F.bat.high = scored.filter(function (b) { return b.band.key === 'high'; });

    // WP-03: owners, gaps, too many owners, recurring load
    if (c.wp03 && c.wp03.filled) {
      var rows3 = [];
      rowsOf(data, 'wp03.treaty', ['task', 'freq', 'r', 'a', 'c', 'i', 'notes'], sizeOf(data, 'treaty')).forEach(function (r) {
        if (!trim(r.task) || (c.wp03.starterIdx && c.wp03.starterIdx[r._i])) return;
        rows3.push({ task: trim(r.task), freq: trim(r.freq), fk: freqKind(r.freq), rRaw: trim(r.r), aRaw: trim(r.a), ro: ownersOf(P, r.r), ao: ownersOf(P, r.a), cRaw: trim(r.c), iRaw: trim(r.i), notes: trim(r.notes) });
      });
      rows3.forEach(function (r) {
        if (r.ro.list.length === 1) { pp[r.ro.list[0]].r++; if (r.fk === 'frequent' || r.fk === 'weekly') pp[r.ro.list[0]].recurR++; }
        if (r.ao.list.length === 1) pp[r.ao.list[0]].a++;
        if (r.ro.list.length === 1 && r.ao.list.length === 1 && r.ro.list[0] === r.ao.list[0]) pp[r.ro.list[0]].ra++;
      });
      var single = rows3.filter(function (r) { return r.ro.list.length === 1 && r.ao.list.length === 1; });
      F.w3 = { rows: rows3, single: single,
        rOnly: rows3.filter(function (r) { return r.rRaw && !r.aRaw; }), aOnly: rows3.filter(function (r) { return !r.rRaw && r.aRaw; }),
        none: rows3.filter(function (r) { return !r.rRaw && !r.aRaw; }), multi: rows3.filter(function (r) { return r.ro.multi || r.ao.multi; }),
        sameRA: single.filter(function (r) { return r.ro.list[0] === r.ao.list[0]; }),
        recurring: rows3.filter(function (r) { return r.fk === 'frequent' || r.fk === 'weekly'; }), occasional: rows3.filter(function (r) { return r.fk === 'occasional' || r.fk === 'asneeded'; }),
        ci: rows3.filter(function (r) { return r.cRaw || r.iRaw; }).length };
      F.w3.gaps = rows3.filter(function (r) { return !r.rRaw || r.ro.multi || r.ao.multi; });
    }

    // WP-04: what slipped, week by week
    if (c.wp04 && c.wp04.filled) {
      var raw4 = rowsOf(data, 'wp04.raw', ['task', 'w1', 'w2', 'w3', 'w4'], sizeOf(data, 'raw')).filter(function (r) { return trim(r.task); }).map(function (r) {
        var wk = ['w1', 'w2', 'w3', 'w4'].map(function (w) { return r[w] === true; });
        return { task: trim(r.task), weeks: wk, times: wk.filter(Boolean).length };
      });
      var cl = c.wp04.classified.map(function (r) { return { task: trim(r.task), owner: r.owner || '', kind: r.kind || '', action: trim(r.action) }; });
      F.w4 = { raw: raw4, cl: cl, weekTotals: [0, 1, 2, 3].map(function (k) { return raw4.filter(function (r) { return r.weeks[k]; }).length; }),
        unsorted: c.wp04.patterns.filter(function (p) { return !cl.some(function (x) { return sameTask(x.task, p.task); }); }),
        oneoffRepeat: cl.filter(function (x) { return x.kind === 'One-off, no action' && raw4.some(function (r) { return sameTask(r.task, x.task) && r.times >= 3; }); }),
        noTicks: raw4.filter(function (r) { return r.times === 0; }),
        noAction: cl.filter(function (x) { return (x.kind === 'Structural gap' || x.kind === 'Capacity issue') && !x.action; }),
        noKind: cl.filter(function (x) { return !x.kind; }) };
    }

    // WP-09: the message itself
    if (c.wp09 && c.wp09.filled) {
      var msg = [c.wp09.fact, c.wp09.feeling, c.wp09.ask].filter(Boolean).join(' ');
      F.w9 = { words: msg ? msg.split(/\s+/).length : 0, absolutes: ABSOLUTE_RE.test(c.wp09.fact + ' ' + c.wp09.feeling + ' ' + c.wp09.ask),
        blame: /\byou (made|make|never|always|don'?t|didn'?t|don’t|didn’t)\b/i.test(c.wp09.feeling), whoI: c.wp09.who ? P.resolve(c.wp09.who) : null,
        askQ: /\?\s*$/.test(c.wp09.ask) || /^(could|can|would|will|shall)\b/i.test(c.wp09.ask) };
    }

    // WP-11: settling readings
    if (c.wp11 && c.wp11.filled) {
      var re = rowsOf(data, 'wp11.reentry', ['time', 'tactic', 'before', 'after'], sizeOf(data, 'reentry')).map(function (r) { return { time: trim(r.time), tactic: trim(r.tactic), before: inRange(r.before, 0, 1), after: inRange(r.after, 0, 1) }; })
        .filter(function (r) { return r.before != null || r.after != null || r.tactic; });
      var pairs = re.filter(function (r) { return r.before != null && r.after != null; });
      F.w11 = { re: re, pairs: pairs, avgDrop: avgOf(pairs.map(function (r) { return r.before - r.after; })), rose: pairs.filter(function (r) { return r.after > r.before + 0.001; }),
        same: !!(c.wp11.first && c.wp11.first === c.wp11.second), lines: c.wp11.lines.filter(Boolean).length };
    }

    // WP-13: the daily check-in, day by day
    if (c.wp13 && c.wp13.filled) {
      var d13 = [];
      rowsOf(data, 'wp13.daily', ['day', 'who', 'load', 'thanks', 'friction', 'ask'], 7 * n).forEach(function (r, idx) {
        var who = P.resolve(r.who); if (typeof who !== 'number') who = idx % n;
        d13.push({ day: trim(r.day) || DAYS[Math.floor(idx / n)], who: who, any: !!(r.load || trim(r.thanks) || trim(r.friction) || trim(r.ask)), load: r.load || '', thanks: trim(r.thanks), friction: trim(r.friction), ask: trim(r.ask) });
      });
      d13.forEach(function (r) {
        if (!r.any) return;
        var p = pp[r.who]; p.checkins++;
        if (p.loads.hasOwnProperty(r.load)) p.loads[r.load]++;
        if (r.thanks) p.thanks++; if (r.friction) p.friction++; if (r.ask) p.asks++;
      });
      var byDay = DAYS.map(function (d) {
        var rs = d13.filter(function (r) { return r.any && dayIndex(r.day) === DAYS.indexOf(d); });
        return { day: d, n: rs.length, high: rs.filter(function (r) { return r.load === 'High'; }).length, friction: rs.filter(function (r) { return r.friction; }).length, thanks: rs.filter(function (r) { return r.thanks; }).length };
      });
      var fr = d13.filter(function (r) { return r.any && r.friction; });
      var agreed13 = V(data, 'wp13.closing.agreed') === true;
      pp.forEach(function (p) { p.committed = agreed13; });
      F.w13 = { rows: d13, byDay: byDay, entries: c.wp13.entries, possible: 7 * n, rate: c.wp13.entries / (7 * n),
        empty: d13.filter(function (r) { return r.any && r.load && !r.thanks && !r.friction && !r.ask; }),
        daysWith: byDay.filter(function (d) { return d.n; }).length,
        skipped: pp.filter(function (p) { return p.checkins === 0; }), few: pp.filter(function (p) { return p.checkins > 0 && p.checkins < 4; }),
        frictionRows: fr, frictionOnHigh: fr.filter(function (r) { return r.load === 'High'; }).length,
        frictionDays: byDay.filter(function (d) { return d.friction; }), highDays: byDay.filter(function (d) { return d.high; }),
        repeatFriction: repeats(fr.map(function (r) { return r.friction; })), repeatAsk: repeats(d13.filter(function (r) { return r.ask; }).map(function (r) { return r.ask; })),
        weekOf: parseISO(V(data, 'wp13.weekOf')) };
      F.w13.bothDays = F.w13.frictionDays.filter(function (d) { return d.high; });
      // Only a day or two of check-ins: too early for a rate or a pattern, so it is read as a start
      F.w13.early = F.w13.entries > 0 && F.w13.daysWith <= 2;
    }

    // Self-notes: whose they are, the wiring, the weather
    var nw = c.notes.name, ni = F.solo ? 0 : c.notes.who;
    if (F.solo && nw) ni = 0;
    F.notesWho = typeof ni === 'number' ? ni : null;
    F.notesLabel = F.notesWho != null ? P.label(F.notesWho) : (nw || 'the person who filled in the self-notes');
    var wmap = {}; c.notes.wiring.forEach(function (l) { wmap[l.id] = l.picked; });
    F.wiring = wmap;
    F.wiringIds = {};
    c.notes.wiring.forEach(function (l) { F.wiringIds[l.id] = l.ids; });
    var wx = c.notes.weather, wb = wx.filter(function (w) { return w.battery != null; });
    function grp(pred) { return avgOf(wb.filter(pred).map(function (w) { return w.battery; })); }
    F.wx = { weeks: wx, bat: wb, trend: wb.length >= 2 ? wb[wb.length - 1].battery - wb[0].battery : null, first: wb[0] || null, last: wb[wb.length - 1] || null,
      swings: [], shortAvg: grp(function (w) { return w.sleep === 'Barely slept' || w.sleep === 'Short night'; }), restAvg: grp(function (w) { return w.sleep === 'About enough' || w.sleep === 'Properly rested'; }),
      heavyAvg: grp(function (w) { return w.pressure === 'Heavy'; }), lightAvg: grp(function (w) { return w.pressure === 'Light' || w.pressure === 'Building'; }),
      skyOdd: wb.filter(function (w) { return (w.sky === 'Clear' && w.battery >= 0.7) || (w.sky === 'Fogged in' && w.battery <= 0.2); }),
      short: wx.filter(function (w) { return w.sleep === 'Barely slept' || w.sleep === 'Short night'; }).length };
    for (var k = 1; k < wb.length; k++) { var dlt = wb[k].battery - wb[k - 1].battery; if (Math.abs(dlt) >= 0.3) F.wx.swings.push({ a: wb[k - 1], b: wb[k], d: dlt }); }
    var dates = wx.map(function (w) { return parseISO(w.date); });
    F.wx.outOfOrder = dates.some(function (d, i) { return i && d && dates[i - 1] && d < dates[i - 1]; });

    // Who has nothing in at all (only meaningful with two or more people)
    pp.forEach(function (p) {
      var b = p.battery;
      p.anything = !!((p.minutes != null && p.minutes > 0) || p.rows01 || b.answered || b.source || p.checkins || p.r || p.a || p.pause);
    });
    return F;
  }
  function repeats(list) {
    var out = [];
    list.forEach(function (t, i) {
      var same = list.filter(function (u, j) { return j !== i && sameTask(t, u); });
      if (same.length && !out.some(function (o) { return sameTask(o.text, t); })) out.push({ text: t, times: same.length + 1 });
    });
    return out;
  }

  /* ---------- the insight rules: each one connects what was entered to a finding, a reason and a step */
  // A rule: when(F, v) returns the details it needs, or nothing. Then find (what we see), why (why it
  // matters), rec (one recommendation: now, this week or this month) and q (a question to talk about).
  // strength: true marks something to protect rather than fix.

  function lbl(list) { return list.map(function (p) { return p.label; }); }
  // A loose match of a WP-01 job against the WP-03 rows that have an owner: the job's name, or its key
  // words in a row's task or notes ("Plan the week's meals" matches Groceries, "owns meal planning").
  var GENERIC = { plan: 1, planning: 1, plans: 1, week: 1, weeks: 1, weekly: 1, daily: 1, day: 1, days: 1, make: 1, take: 1, sort: 1, check: 1, stuff: 1, things: 1, thing: 1, jobs: 1, job: 1, task: 1, tasks: 1, home: 1, house: 1, the: 1, and: 1, for: 1, with: 1, from: 1, each: 1, after: 1, before: 1, some: 1, more: 1, kids: 0 };
  function keyWords(t) { return fold(t).replace(/[\u2019']s\b/g, '').split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 4 && !GENERIC[w]; }).map(function (w) { return w.replace(/(ings?|es|s)$/, ''); }).filter(function (w) { return w.length >= 3; }); }
  function ownedOnWp03(F, task) {
    if (!F.w3) return false;
    var kw = keyWords(task);
    return F.w3.rows.some(function (r) {
      if (!r.rRaw) return false;
      if (sameTask(r.task, task)) return true;
      var hay = keyWords(r.task + ' ' + r.notes);
      return kw.some(function (w) { return hay.indexOf(w) >= 0; });
    });
  }
  // Only the coworkers' version of WP-03 has Consulted and Informed columns.
  function hasCI(F) { return F.road === 'coworkers'; }
  function heaviest(F) { var pp = F.pp.filter(function (p) { return p.minutes != null; }); return pp.length ? pp.slice().sort(function (a, b) { return b.minutes - a.minutes; })[0] : null; }
  function lightest(F) { var pp = F.pp.filter(function (p) { return p.minutes != null; }); return pp.length ? pp.slice().sort(function (a, b) { return a.minutes - b.minutes; })[0] : null; }
  function highestBat(F) { return F.bat.max ? F.pp[F.bat.max.i] : null; }
  function ownWord(F) { return F.road === 'coworkers' ? 'team role' : 'owner'; }
  function sayNumber(F) { return F.solo ? '“Heads up: I’m at about ' : '“Before we start: I’m at about '; }

  var RULES = [
    /* --- the overall read (CALC-01) --- */
    { id: 'sol-holding', pillar: 'II', src: ['CALC-01'], pri: 5, strength: true, title: 'The setup is carrying its own weight',
      when: function (F) { return F.c.calc.sol != null && F.c.calc.solBand.key === 'good' && !leanReasons(F.c).length ? F.c.calc : null; },
      find: function (k) { return 'CALC-01 reads ' + fmt(k.sol) + ': the way the load is shared is carrying its own weight.'; },
      why: 'A setup that holds leaves room for the harder, more interesting conversations, and it is easier to keep than to rebuild.',
      rec: function (k, F, v) { return { h: 'month', title: 'Keep the rhythm that is working', first: 'Put a date in the calendar a month from now to fill the pages again and compare.', script: '“This is working. Can we keep it exactly as it is for another month?”', link: linkOf('CALC-01'), working: 'The next report reads 0.70 or above again.' }; },
      q: function () { return 'What are we doing right now that we would miss if it stopped?'; } },
    { id: 'sol-leans', pillar: 'V', src: ['CALC-01', 'WP-03', 'WP-01', 'WP-04'], pri: 9, title: 'The numbers hold, but the setup leans',
      when: function (F) { var k = F.c.calc, r = leanReasons(F.c); return k.sol != null && k.solBand.key === 'good' && r.length ? { k: k, r: r, who: F.c.conc && F.c.conc.flag ? (F.c.conc.owned && F.c.conc.owned.flag ? F.c.conc.owned : F.c.conc.minutes) : null } : null; },
      find: function (d) { return 'CALC-01 reads ' + fmt(d.k.sol) + ', and yet ' + list(d.r) + '.'; },
      why: 'CALC-01 reads whether jobs have names and whether the logged time is even. It can read high while one reliable person quietly holds most of it, or while the same thing slips most weeks. That is how a setup that looks fine wears someone down.',
      rec: function (d, F, v) { var nm = d.who ? F.P.label(d.who.top) : null; return { h: 'week', title: nm ? 'Share out some of what ' + nm + ' holds' : 'Fix what keeps slipping', first: nm ? 'Ask ' + nm + ' which ' + v.task + ' they would hand over first, and move it to someone else on WP-03, with a date to check how it went.' : 'Give what keeps slipping a new or clearer owner on WP-03, and check it at the next look-back.', script: nm ? '“You hold most of these. Which one would you hand over if you could?”' : '“This one keeps slipping. What would make it fit, and who would like to own it?”', link: linkOf('WP-03'), working: nm ? 'Nobody owns more than half the list, and the score still holds.' : 'It isn’t ticked on next month’s look-back.' }; },
      q: function (d) { return d.who ? 'Is the work spread the way everyone would choose, or has it settled on one person?' : 'Why does the same thing keep slipping when the rest is working?'; } },
    { id: 'sol-drifting', pillar: 'II', src: ['CALC-01'], pri: 9, title: 'The setup needs a look',
      when: function (F) { var k = F.c.calc; return k.sol != null && k.solBand.key === 'drift' ? k : null; },
      find: function (k) { return 'CALC-01 reads ' + fmt(k.sol) + ': the setup needs a look, because something is slipping. The part losing the most points is ' + k.worst.fix + '.'; },
      why: 'Drift is the stage where small, specific changes still work. Waiting tends to turn a setup problem into a feelings problem.',
      rec: function (k, F, v) { return { h: 'week', title: 'Work on the biggest gap first: ' + k.worst.fix.replace(/ \(.*\)$/, ''), first: 'Open the page behind ' + k.worst.fix + ' and change one thing there, not ten.', script: '“The report says the biggest gap is ' + k.worst.fix.replace(/ \(.*\)$/, '') + '. Could we pick one small change there this week?”', link: k.worst.key === 'WB' ? linkOf('WP-01') : k.worst.key === 'OC' ? linkOf('WP-03') : linkOf('WP-02'), working: 'The ' + k.worst.key + ' number moves up on the next report.', plan: { title: 'Close the biggest gap', wp: k.worst.key === 'WB' ? 'WP-01, WP-03' : k.worst.key === 'OC' ? 'WP-03' : 'WP-02, WP-11', do: 'Start with ' + k.worst.fix + '. One change, written down, then leave it for the week.', pillar: 'II' } }; },
      q: function (k) { return 'The biggest gap is ' + k.worst.fix.replace(/ \(.*\)$/, '') + '. Does that match what it feels like from where you sit?'; } },
    { id: 'sol-low', pillar: 'II', src: ['CALC-01'], pri: 10, title: 'The setup needs a rethink, together',
      when: function (F) { var k = F.c.calc; return k.sol != null && k.solBand.key === 'low' ? k : null; },
      find: function (k) { return 'CALC-01 reads ' + fmt(k.sol) + ': as it is set up now, it asks too much of you. That is about the setup, not anyone in it. The biggest gap is ' + k.worst.fix + '.'; },
      why: function (k) { return 'A low read usually means several things are stretched at once, so fixing the loudest one rarely helps.' + (k.apex != null && k.apex < 0.4 ? ' Both scores are low, which is the pattern where a neutral person everyone trusts can help you rework the setup together.' : ''); },
      rec: function (k, F, v) { return { h: 'now', title: 'Take one topic, the biggest gap, and nothing else', first: 'Agree that the next conversation is only about ' + k.worst.fix.replace(/ \(.*\)$/, '') + '.', script: '“Can we talk about just one thing this week: ' + k.worst.fix.replace(/ \(.*\)$/, '') + '? Everything else can wait.”', link: linkOf('CALC-01'), working: 'Each conversation ends with one written change, and the next read is higher.' }; },
      q: function () { return 'If we could change only one thing about how the load is shared, which one would help most?'; } },
    { id: 'apex-gap', pillar: 'IV', src: ['CALC-01', 'WP-09'], pri: 6, title: 'Repair and setup are out of step',
      when: function (F) { var k = F.c.calc; return k.sol != null && k.rf != null && Math.abs(k.gap) >= 0.08 ? k : null; },
      find: function (k) { return k.gap > 0 ? 'The setup score runs ' + fmt(k.gap) + ' above the overall score: the setup holds, but repair after friction isn’t keeping up.' : 'The overall score runs ' + fmt(-k.gap) + ' above the setup score: you repair well, but the setup keeps making friction to repair.'; },
      why: function (k) { return k.gap > 0 ? 'When repair lags, small frictions pile up even in a fair setup.' : 'Good repair is a strength, but it is tiring to keep repairing what the setup keeps causing.'; },
      rec: function (k, F, v) { return k.gap > 0 ? { h: 'week', title: 'Retune one message a week', first: 'Next time something lands badly, write the fact, the feeling and the ask before answering.', script: '“Give me a minute to say that better.”', link: linkOf('WP-09'), working: 'Retunes out of friction moments goes above half.' } : { h: 'week', title: 'Fix the setup that keeps causing friction', first: 'Look at what the frictions were about, and give that ' + v.task + ' a clear owner.', script: '“We keep smoothing this over. Could we fix who owns it instead?”', link: linkOf('WP-03'), working: 'Fewer friction moments to count next week.' }; } },

    /* --- Pillar I: see the whole load (WP-01) --- */
    { id: 'load-uneven', pillar: 'I', src: ['WP-01'], pri: 8, title: 'The logged minutes lean one way',
      when: function (F) { var w = F.c.wp01; if (!(F.n >= 2 && w && w.wb != null && w.wb < 0.7)) return null; return { top: heaviest(F), wb: w.wb, even: 1 / F.n, ho: F.w1.handoff }; },
      find: function (d, F) { return d.top.label + ' logged ' + pc(d.top.share) + ' of the minutes; an even split would be ' + pc(d.even) + ' each. Workload balance reads ' + fmt(d.wb) + '.'; },
      why: 'A lean in one ordinary week is a fact about how the work fell, not about effort or care. Left alone, a lean tends to settle into a default.',
      rec: function (d, F, v) { var ho = d.ho; return { h: 'week', title: 'One handoff, not a rebuild', first: ho ? 'Move about ' + C1().f1(ho.hours) + ' hour' + (ho.hours === 1 ? '' : 's') + ' a week from ' + ho.from + ' to ' + ho.to + '. Balance would go from ' + fmt(d.wb) + ' to ' + fmt(ho.after) + '.' : 'Pick one ' + v.task + ' that the busiest person would most like to hand over.', script: '“Which of these would you most like to hand over, and what would make that fair?”', link: linkOf('WP-01'), working: 'Next week’s log reads 0.70 or above, and nobody had to be reminded.', plan: { title: 'Hand over one ' + v.task, wp: 'WP-01, WP-03', do: ho ? 'Move about ' + C1().f1(ho.hours) + ' hour' + (ho.hours === 1 ? '' : 's') + ' a week from ' + ho.from + ' to ' + ho.to + ', write it on WP-03, and log the week again.' : 'Hand one ' + v.task + ' from the busiest person to someone else, write it on WP-03, and log the week again.', pillar: 'I' } }; },
      q: function (d) { return d.top.label + ' carried ' + pc(d.top.share) + ' of the logged time. Is that what everyone expected before seeing the number?'; } },
    { id: 'load-even', pillar: 'I', src: ['WP-01'], pri: 3, strength: true, title: 'The logged time is shared evenly',
      when: function (F) { var w = F.c.wp01; return F.n >= 2 && w && w.wb != null && w.wb >= 0.8 ? w : null; },
      find: function (w) { return 'Workload balance reads ' + fmt(w.wb) + ': the logged minutes were close to an even split.'; },
      why: 'An even split in hours is the base everything else stands on. The next thing to check is the planning and remembering, which minutes don’t show.' },
    { id: 'mental-uneven', pillar: 'I', src: ['WP-01'], pri: 8, title: 'Even in hours, uneven in mental load',
      when: function (F) {
        if (!(F.n >= 2 && F.w1 && F.w1.namedMental.length >= 3)) return null;
        var counts = F.pp.map(function (p) { return p.mental; }), top = F.pp.slice().sort(function (a, b) { return b.mental - a.mental; })[0];
        var share = top.mental / sumOf(counts);
        return share >= 0.65 ? { top: top, share: share, total: sumOf(counts), even: F.c.wp01.wb != null && F.c.wp01.wb >= 0.7 } : null;
      },
      find: function (d) { return (d.even ? 'Balance looks even in hours but uneven in mental-load items: ' : '') + d.top.label + ' logged ' + d.top.mental + ' of the ' + d.total + ' planning, remembering and keeping-track items (' + pc(d.share) + ').'; },
      why: 'Planning and remembering are short in minutes and long in the head. They are the part of the load that is easiest to miss and most tiring to carry alone.',
      rec: function (d, F, v) { return { h: 'week', title: 'Share the remembering, not only the doing', first: 'Pick one planning job ' + d.top.label + ' carries, and move the whole of it (noticing, deciding and doing) to someone else.', script: '“Could you own the whole of this one, including remembering it’s due? I’ll stay out of it.”', link: linkOf('WP-03'), working: 'The next WP-01 log shows planning items under more than one name.', plan: { title: 'Share the remembering', wp: 'WP-01, WP-03', do: 'Move one whole planning job (noticing, deciding and doing) away from ' + d.top.label + ', with its new owner written on WP-03.', pillar: 'I' } }; },
      q: function (d) { return 'Which things do you keep track of in your head that nobody else sees?'; } },
    { id: 'invisible-one', pillar: 'I', src: ['WP-01'], pri: 7, title: 'Most of the unasked-for work falls to one person',
      when: function (F) {
        if (!(F.n >= 2 && F.w1 && F.w1.noticedTotal >= 60)) return null;
        var top = F.pp.slice().sort(function (a, b) { return b.noticed - a.noticed; })[0], share = top.noticed / F.w1.noticedTotal;
        return share >= 0.65 ? { top: top, share: share, min: top.noticed } : null;
      },
      find: function (d) { return d.top.label + ' did ' + pc(d.share) + ' of the work that was noticed and handled without anyone asking (' + minText(d.min) + ').'; },
      why: 'Work nobody asked for is the work nobody sees. It is often what keeps things running, and the first thing to go unthanked.',
      rec: function (d, F, v) { return { h: 'now', title: 'Name the unseen work out loud', first: 'Read the "noticed and handled" rows to each other, and say thank you for each one.', script: '“I hadn’t realized you were doing all of this without being asked. Thank you.”', link: linkOf('WP-01'), working: d.top.label + ' says they feel seen, and the next log shows more names in that column.' }; } },
    { id: 'invisible-high', pillar: 'I', src: ['WP-01'], pri: 4, title: 'Much of the work was unasked-for',
      when: function (F) { return F.w1 && F.w1.total > 0 && F.w1.noticedTotal / F.w1.total >= 0.5 ? { share: F.w1.noticedTotal / F.w1.total } : null; },
      find: function (d) { return pc(d.share) + ' of the logged minutes were noticed and handled without anyone asking.'; },
      why: 'A lot of self-started work is a strength, and also a sign that jobs have no named owner, so someone steps in each time.',
      rec: function (d, F, v) { return { h: 'month', title: 'Turn repeat rescues into owned jobs', first: 'Find the noticed-and-handled jobs that happen every week, and give each a named owner on WP-03.', script: '“This keeps coming up. Who would like to own it properly?”', link: linkOf('WP-03'), working: 'Fewer noticed-and-handled rows, more planned ones.' }; } },
    { id: 'top-sink', pillar: 'I', src: ['WP-01'], pri: 5, title: 'One job takes most of the time',
      when: function (F) { return F.w1 && F.w1.sinks.length >= 2 && F.w1.sinks[0].share >= 0.4 ? F.w1.sinks[0] : null; },
      find: function (s) { return q(s.task) + ' took ' + minText(s.min) + ', ' + pc(s.share) + ' of all the logged time.'; },
      why: 'When one job takes this much, a small change to how it is done (batching, sharing, a simpler standard) moves the whole picture.',
      rec: function (s, F, v) { return { h: 'month', title: 'Make ' + q(s.task) + ' smaller', first: 'Ask whether ' + q(s.task) + ' could be batched, split, or done to a simpler standard.', script: '“This one takes the most time. Is there an easier version we’d both be happy with?”', link: linkOf('WP-01'), working: 'Its share of the logged time drops below 40%.' }; } },
    { id: 'everyone-hides', pillar: 'I', src: ['WP-01'], pri: 4, title: '"Everyone" hides who did what',
      when: function (F) { return F.n >= 2 && F.w1 && F.w1.total > 0 && F.w1.everyone / F.w1.total >= 0.3 ? { share: F.w1.everyone / F.w1.total } : null; },
      find: function (d) { return pc(d.share) + ' of the logged minutes were marked "Everyone", which splits them evenly on paper.'; },
      why: 'Shared jobs are real, but "everyone" can hide who actually started, planned or finished them, so the balance may look more even than it felt.',
      rec: function (d, F, v) { return { h: 'month', title: 'Log shared jobs by who led them', first: 'Next week, write the name of whoever started or planned each shared job.', script: '', link: linkOf('WP-01'), working: 'Fewer than a third of minutes marked "Everyone".' }; } },
    { id: 'load-battery-align', pillar: 'III', src: ['WP-01', 'WP-02'], pri: 7, title: 'Most minutes and the highest load belong to the same person',
      when: function (F) {
        var h = heaviest(F), b = highestBat(F);
        return F.n >= 2 && h && b && h.i === b.i && b.battery.score >= 0.5 && F.c.wp01.wb != null && F.c.wp01.wb < 0.85 && F.bat.scored.length >= 2 ? { p: h } : null;
      },
      find: function (d) { return d.p.label + ' logged the most minutes (' + pc(d.p.share) + ') and has the highest load (' + fmt(d.p.battery.score) + '). The hours and the load scores line up.'; },
      why: 'When the same person logs the most and also carries the highest load, a small handoff helps twice: less work, and more room to recover.',
      rec: function (d, F, v) { return { h: 'now', title: 'Take something off ' + d.p.label + '’s plate this week', first: 'Ask ' + d.p.label + ' for one ' + v.task + ' they would happily hand over for two weeks.', script: '“What’s one thing I could take off your plate this week, no strings?”', link: linkOf('WP-02'), working: d.p.label + '’s load reads lower next week.' }; },
      q: function (d) { return 'What would make next week lighter for ' + d.p.label + ', even a little?'; } },
    { id: 'battery-beyond-list', pillar: 'III', src: ['WP-01', 'WP-02'], pri: 5, title: 'A heavy load that the list doesn’t explain',
      when: function (F) {
        var l = lightest(F), b = highestBat(F);
        return F.n >= 2 && l && b && l.i === b.i && b.battery.score >= 0.6 && F.bat.scored.length >= 2 ? { p: l } : null;
      },
      find: function (d) { return d.p.label + ' logged the fewest minutes here but has the highest load (' + fmt(d.p.battery.score) + '). Something outside this list is filling it.'; },
      why: 'A load score reads the whole of life, not only these ' + 'jobs. Knowing that stops anyone from reading a light log as a light week.',
      rec: function (d, F, v) { return { h: 'now', title: 'Ask what else ' + d.p.label + ' is carrying', first: 'Ask, once and gently, what is filling ' + d.p.label + '’s load score this week, and accept any answer, including "not now".', script: '“You’re carrying a lot this week. Is there anything I can’t see that I could help with?”', link: linkOf('WP-02'), working: d.p.label + ' feels asked about, not assessed.' }; } },

    /* --- Pillar II: fix the setup (WP-03, WP-04) --- */
    { id: 'own-gaps', pillar: 'II', src: ['WP-03'], pri: 8, title: 'Some jobs still need a clear owner',
      when: function (F) { return F.w3 && (F.w3.none.length + F.w3.aOnly.length) ? { list: F.w3.none.concat(F.w3.aOnly) } : null; },
      find: function (d, F, v) { return plural(d.list.length, v.task, v.tasks) + ' still ' + (d.list.length === 1 ? 'needs' : 'need') + ' an owner: ' + list(d.list.slice(0, 5).map(function (r) { return r.task; })) + (d.list.length > 5 ? ' and more' : '') + '.'; },
      why: 'Work with no owner drifts to whoever notices it first, and that is rarely the same as whoever has room for it.',
      rec: function (d, F, v) { return { h: 'week', title: 'One owner for every ' + v.task, first: 'At ' + v.meeting + ', go down the unowned list and ask for one volunteer per ' + v.task + '. Write it on WP-03 the same day.', script: '“Nobody owns ' + d.list[0].task + ' yet. Who would like it, and who will notice if it doesn’t happen?”', link: linkOf('WP-03'), working: 'Ownership clarity reads 0.90 or above.', plan: { title: 'One ' + ownWord(F) + ' per ' + v.task, wp: 'WP-03', do: 'Give each of these exactly one owner: ' + list(d.list.slice(0, 5).map(function (r) { return r.task; })) + '.', pillar: 'II' } }; },
      q: function (d, F, v) { return 'Which of the unowned ' + v.tasks + ' do we each quietly assume someone else is doing?'; } },
    { id: 'own-clear', pillar: 'II', src: ['WP-03'], pri: 3, strength: true, title: 'Ownership is clear',
      when: function (F) { return F.w3 && F.c.wp03.oc != null && F.c.wp03.oc >= 0.9 && F.c.wp03.tasks >= 3 ? F.c.wp03 : null; },
      find: function (t, F, v) { return t.owned + ' of ' + t.tasks + ' ' + v.tasks + ' have an owner (' + fmt(t.oc) + ').'; },
      why: 'Clear owners take the arguing out of who should have done it. That clarity is doing real work.' },
    { id: 'own-too-many', pillar: 'II', src: ['WP-03'], pri: 6, title: 'Some jobs have too many owners',
      when: function (F) { return F.w3 && F.w3.multi.length ? { list: F.w3.multi } : null; },
      find: function (d) { return list(d.list.slice(0, 4).map(function (r) { return r.task; })) + (d.list.length === 1 ? ' has' : ' have') + ' more than one name, or "Everyone", as the owner or the helper.'; },
      why: 'When everyone owns a job, nobody quite does. Shared jobs work best with one name who starts it and one who notices if it didn’t happen.',
      rec: function (d, F, v) { return { h: 'week', title: 'Swap "everyone" for one name', first: 'For ' + d.list[0].task + ', put one name as the owner, and ' + (hasCI(F) ? 'keep the group in Consulted or Informed.' : 'write who helps in the Notes box.'), script: '“We all help with this. Who is the one who makes sure it happens?”', link: linkOf('WP-03'), working: 'No row has "Everyone" as the owner or the helper.' }; } },
    // (no rule for an owner without a helper: the helper is optional)
    { id: 'a-no-r', pillar: 'II', src: ['WP-03'], pri: 6, title: 'A helper, but no owner',
      when: function (F) { return F.w3 && F.w3.aOnly.length ? { list: F.w3.aOnly } : null; },
      find: function (d, F, v) { return list(d.list.slice(0, 4).map(function (r) { return r.task; })) + (d.list.length === 1 ? ' has' : ' have') + ' a helper but no owner.'; },
      why: 'Someone watching a job that nobody is named to do is how reminders turn into nagging.',
      rec: function (d, F, v) { return { h: 'week', title: 'Name who does it', first: 'Ask the helper whether they would rather own ' + d.list[0].task + ' themselves or hand it to a named person.', script: '“You’re keeping an eye on this one. Would you rather do it, or hand it to someone?”', link: linkOf('WP-03'), working: 'Every row with a helper also has an owner.' }; } },
    { id: 'own-concentrated', pillar: 'V', src: ['WP-03'], pri: 7, title: 'One person holds most of the named jobs',
      when: function (F) {
        if (!(F.n >= 2 && F.w3)) return null;
        var tot = sumOf(F.pp.map(function (p) { return p.r; })); if (tot < 4) return null;
        var top = F.pp.slice().sort(function (a, b) { return b.r - a.r; })[0], share = top.r / tot;
        return share >= Math.max(0.5, 1 / F.n + 0.2) ? { top: top, share: share, tot: tot } : null;
      },
      find: function (d, F, v) {
        // counted by jobs; by how often they come up, the picture can differ (several monthly jobs vs a few daily ones)
        var wt = F.c.wp03 && F.c.wp03.weighted, by = wt ? (wt.top === d.top.i ? ' Counting how often each comes up, that is about ' + pc(wt.share) + ' of the weekly jobs.' : ' Counting how often each comes up, though, ' + F.P.label(wt.top) + '’s jobs come up most (about ' + pc(wt.share) + '), so the time may lean the other way.') : '';
        return d.top.label + ' owns ' + d.top.r + ' of the ' + d.tot + ' ' + v.tasks + ' with a single named ' + ownWord(F) + ' (' + pc(d.share) + ').' + by;
      },
      why: 'Jobs drift to whoever is reliable, then settle there. The setup ends up leaning on one person without anyone deciding it should.',
      rec: function (d, F, v) { return { h: 'month', title: 'Rebalance the named jobs', first: 'Ask ' + d.top.label + ' which ' + v.task + ' they would give away first, and who would like to try it.', script: '“You hold most of these. Which one would you hand over if you could?”', link: linkOf('WP-03'), working: 'Nobody owns more than half the list.' }; } },
    { id: 'recurring-one', pillar: 'V', src: ['WP-03'], pri: 5, title: 'The daily and weekly jobs sit with one person',
      when: function (F) {
        if (!(F.n >= 2 && F.w3)) return null;
        var tot = sumOf(F.pp.map(function (p) { return p.recurR; })); if (tot < 3) return null;
        var top = F.pp.slice().sort(function (a, b) { return b.recurR - a.recurR; })[0], share = top.recurR / tot;
        return share >= 0.6 && share >= 1 / F.n + 0.2 ? { top: top, share: share, tot: tot } : null;
      },
      find: function (d, F, v) { return d.top.label + ' owns ' + d.top.recurR + ' of the ' + d.tot + ' daily or weekly ' + v.tasks + '. Recurring work is the kind that never lets up.'; },
      why: 'One-off jobs end; recurring ones come back every day or week. A fair split of recurring jobs matters more than a fair count of jobs.',
      rec: function (d, F, v) { return { h: 'month', title: 'Share the recurring jobs', first: 'Trade one daily or weekly ' + v.task + ' from ' + d.top.label + ' for one occasional job.', script: '“Could we swap one of the every-week ones for one of the now-and-then ones?”', link: linkOf('WP-03'), working: 'Recurring jobs are split closer to evenly on WP-03.' }; } },
    { id: 'battery-owns-most', pillar: 'V', src: ['WP-02', 'WP-03'], pri: 8, title: 'The highest load also owns the most',
      when: function (F) {
        if (!(F.n >= 2 && F.w3 && F.bat.scored.length >= 2)) return null;
        var b = highestBat(F); if (!b || b.battery.score < 0.5) return null;
        var mostR = F.pp.slice().sort(function (a, c) { return c.r - a.r; });
        return mostR[0].i === b.i && mostR[0].r > mostR[1].r ? { p: b } : null;
      },
      find: function (d, F, v) { return d.p.label + ' has the highest load (' + fmt(d.p.battery.score) + ') and also owns the most ' + v.tasks + ' (' + d.p.r + ').'; },
      why: 'The person with the highest load is also holding the most. That is usually the setup drifting, not a choice anyone made.',
      rec: function (d, F, v) { return { h: 'week', title: 'Lighten ' + d.p.label + '’s list first', first: 'Move one of ' + d.p.label + '’s ' + v.tasks + ' to the person with the most room this week.', script: '“You’re carrying a lot right now. Which one could I take for the next two weeks?”', link: linkOf('WP-03'), working: d.p.label + ' holds fewer jobs and reads lower next time.' }; } },
    { id: 'drift-to-one', pillar: 'V', src: ['WP-01', 'WP-03'], pri: 7, title: 'Unowned jobs drift to one person',
      when: function (F) {
        if (!(F.n >= 2 && F.w1 && F.w3)) return null;
        var loose = F.w3.gaps;
        // a job that already has an owner on WP-03 (by its name, or named in a row's notes) isn't drifting
        var hits = F.w1.rows.filter(function (r) { return typeof r.who === 'number' && r.task && (r.noticed || loose.some(function (g) { return sameTask(g.task, r.task); })) && !ownedOnWp03(F, r.task); });
        if (hits.length < 2) return null;
        var cnt = F.pp.map(function (p) { return hits.filter(function (r) { return r.who === p.i; }).length; });
        var top = F.pp[cnt.indexOf(Math.max.apply(null, cnt))], share = cnt[top.i] / hits.length;
        if (share < 0.6) return null;
        var hb = highestBat(F);
        return { top: top, n: cnt[top.i], of: hits.length, tasks: uniq(hits.filter(function (r) { return r.who === top.i; }).map(function (r) { return r.task; })), alsoBat: !!(hb && hb.i === top.i && hb.battery.score >= 0.5) };
      },
      find: function (d, F, v) { return (d.alsoBat ? 'The person with the heaviest load also picks up the most unowned-by-default jobs: ' : '') + d.top.label + ' did ' + d.n + ' of the ' + d.of + ' logged jobs that had no clear owner or were handled without being asked (' + list(d.tasks.slice(0, 3)) + ').'; },
      why: 'Unowned work doesn’t spread out; it collects on whoever notices first. That is a quiet incentive in the setup, not a trait of the person.',
      rec: function (d, F, v) { return { h: 'week', title: 'Give the drifting jobs a home', first: 'Put ' + list(d.tasks.slice(0, 2)) + ' on WP-03 with a named ' + ownWord(F) + ' who isn’t ' + d.top.label + '.', script: '“I’ve noticed I pick these up by default. Could one of them be yours for a month?”', link: linkOf('WP-03'), working: 'Next week’s log shows those jobs under another name.' }; },
      q: function (d) { return 'Which jobs does ' + d.top.label + ' pick up just because they notice first?'; } },
    { id: 'slip-unowned', pillar: 'II', src: ['WP-04', 'WP-03'], pri: 8, title: 'What keeps slipping has no clear owner',
      when: function (F) {
        if (!(F.w4 && F.w3)) return null;
        var pats = F.w4.raw.filter(function (r) { return r.times >= 2; });
        var hits = pats.filter(function (p) { return F.w3.gaps.some(function (g) { return sameTask(g.task, p.task); }); });
        return hits.length ? { list: hits } : null;
      },
      find: function (d) { return list(d.list.map(function (p) { return p.task + ' (' + p.times + ' of 4 weeks)'; })) + (d.list.length === 1 ? ' keeps' : ' keep') + ' slipping, and ' + (d.list.length === 1 ? 'it has' : 'they have') + ' no single clear owner on WP-03.'; },
      why: 'A repeat slip on an unowned job is the clearest sign of a gap in the setup rather than a person. It is also the easiest to fix.',
      rec: function (d, F, v) { return { h: 'now', title: 'Give ' + d.list[0].task + ' one owner', first: 'Before anything else, put one owner’s name next to ' + d.list[0].task + '.', script: '“This one keeps slipping because nobody owns it. Who would like it?”', link: linkOf('WP-04'), working: 'It isn’t ticked on next month’s look-back.' }; } },
    { id: 'structural-most', pillar: 'II', src: ['WP-04'], pri: 5, title: 'Most slips are about the setup',
      when: function (F) { var d = F.c.wp04; return d && d.structural >= 2 && d.structural >= d.capacity + d.oneoff ? d : null; },
      find: function (d) { return d.structural + ' of the ' + d.classified.length + ' sorted slips are structural gaps (no owner, unclear handoff), against ' + d.capacity + ' capacity ' + (d.capacity === 1 ? 'issue' : 'issues') + '.'; },
      why: 'Structural gaps are good news in a way: they are fixed on paper, in one sitting, without asking anyone to try harder.',
      rec: function (d, F, v) { return { h: 'week', title: 'Fix the structural gaps in one sitting', first: 'Take each structural gap to WP-03 and give it an owner before you close the look-back.', script: '', link: linkOf('WP-04'), working: 'Fewer structural gaps next month.' }; } },
    { id: 'capacity-highbat', pillar: 'III', src: ['WP-04', 'WP-02'], pri: 6, title: 'Capacity issues while loads run high',
      when: function (F) { var d = F.c.wp04; return d && d.capacity >= 1 && F.bat.high.length ? { cap: d.capacity, who: F.bat.high } : null; },
      find: function (d) { return plural(d.cap, 'slip') + ' sorted as a capacity issue, while ' + list(lbl(d.who)) + (d.who.length === 1 ? ' reads' : ' read') + ' 0.60 or above on the load score.'; },
      why: 'A capacity issue means the owner can’t keep up, not that they don’t care. When someone is carrying a lot, adding reminders makes it worse.',
      rec: function (d, F, v) { return { h: 'week', title: 'Lower the load before raising the bar', first: 'For each capacity issue, ask what could be dropped, simplified or shared, before asking for more effort.', script: '“This isn’t about trying harder. What could come off the list so this one fits?”', link: linkOf('WP-04'), working: 'The same job isn’t ticked next month, and the load reads lower.' }; } },
    { id: 'clear-but-slips', pillar: 'II', src: ['WP-03', 'WP-04'], pri: 6, title: 'Clear on paper, still slipping',
      when: function (F) { return F.c.wp03 && F.c.wp03.oc != null && F.c.wp03.oc >= 0.8 && F.c.wp04 && F.c.wp04.patterns.length ? F.c.wp04.patterns : null; },
      find: function (p) { return 'Ownership is clear on paper (0.80 or above), yet ' + list(p.slice(0, 3).map(function (x) { return x.task; })) + ' still slipped 3 or 4 weeks out of 4.'; },
      why: 'When ownership is clear and a job still slips, the usual cause is capacity or timing, not clarity. Another reminder won’t help; a smaller job or a better time might.',
      rec: function (p, F, v) { return { h: 'month', title: 'Ask about capacity, not clarity', first: 'Ask the owner of ' + p[0].task + ' what gets in the way, and what would make it fit.', script: '“You own this and it still slips. What gets in the way, honestly?”', link: linkOf('WP-04'), working: 'It isn’t ticked next month.' }; } },
    { id: 'clear-but-skips', pillar: 'V', src: ['WP-03', 'WP-13'], pri: 6, title: 'Ownership is clear, check-ins keep skipping',
      when: function (F) { return F.c.wp03 && F.c.wp03.oc != null && F.c.wp03.oc >= 0.8 && F.w13 && !F.w13.early && F.w13.rate < 0.5 ? { rate: F.w13.rate } : null; },
      find: function (d) { return 'Ownership is clear on paper, but only ' + pc(d.rate) + ' of the possible daily check-ins happened.'; },
      why: 'Clear owners set the setup up; the check-in keeps it steady. Without it, small slips surface late, at the monthly look-back or in an argument.',
      rec: function (d, F, v) { return { h: 'week', title: 'Make the check-in smaller', first: 'Cut the check-in to one line each (load and one thanks), at a time you already share.', script: '“Could we do the 90-second version, just load and one thanks, right after ' + (F.road === 'coworkers' ? 'the morning sync' : 'dinner') + '?”', link: linkOf('WP-13'), working: 'Five or more check-ins next week.' }; } },
    { id: 'self-accountable', pillar: 'II', src: ['WP-03'], pri: 4, title: 'Everyone follows up on their own jobs',
      when: function (F) { return F.n >= 2 && F.w3 && F.w3.single.length >= 3 && F.w3.sameRA.length === F.w3.single.length ? { n: F.w3.single.length } : null; },
      find: function (d) { return 'On all ' + d.n + ' rows with a helper, the helper is the same person as the owner.'; },
      why: 'That can work well, but nobody else notices when a job slips. For a few important jobs, a different person as the helper is a safety net.',
      rec: function (d, F, v) { return { h: 'month', title: 'Add a second pair of eyes to the key jobs', first: 'Choose the two ' + v.tasks + ' that matter most and ask someone else to be the helper.', script: '', link: linkOf('WP-03'), working: 'Slips on those jobs are caught within a day or two.' }; } },

    /* --- Pillar III: read your state (WP-02, WP-11, weather) --- */
    { id: 'bat-high', pillar: 'III', src: ['WP-02'], pri: 9, title: function (d, F) { return F.solo ? 'Your load score is running high' : 'A load score is running high'; },
      when: function (F) { return F.bat.high.length ? { who: F.bat.high } : null; },
      find: function (d, F) { return F.solo ? 'Your load reads ' + fmt(d.who[0].score) + ': a high load right now.' : list(d.who.map(function (b) { return b.label + ' (' + fmt(b.score) + ')'; })) + (d.who.length === 1 ? ' is' : ' are') + ' at 0.60 or above: a high load right now.'; },
      why: 'At a high load, words land harder and decisions come out worse. It is a reason to pick the timing, not a reason to avoid the talk.',
      rec: function (d, F, v) { return { h: 'now', title: F.solo ? 'Protect your battery this week' : 'Protect the highest loads this week', first: F.solo ? 'Put off what doesn’t need deciding this week, and use your first settling default before anything hard.' : 'Agree that anyone at 0.60 or above can say “not today” and name a time instead, with no explanation needed.', script: sayNumber(F) + fmt(d.who[0].score) + ' today. Can we pick this up tomorrow at a set time?”', link: linkOf('WP-02'), working: 'Nothing big gets decided on a heavy-load day, and the number drops within the week.', plan: { title: F.solo ? 'Protect your battery' : 'Protect the batteries', wp: 'WP-02, WP-11', do: F.solo ? 'One minute with the battery meter each morning. On any day at 0.60 or above, use a settling default before anything hard, and put off what can wait.' : 'Everyone does the battery meter daily and says their number before any hard talk. At 0.60 or above, name a time instead.', pillar: 'III' } }; },
      q: function (d, F) { return F.solo ? 'What would a slightly lighter week look like for you, and what is one thing you could put down?' : 'When someone is running high, what is the kindest way for them to say "not today"?'; } },
    { id: 'bat-low-all', pillar: 'III', src: ['WP-02'], pri: 3, strength: true, title: 'Loads are light',
      when: function (F) { return F.bat.scored.length && F.bat.scored.every(function (b) { return b.score < 0.3; }) && (F.solo || F.bat.scored.length >= 2) ? F.bat : null; },
      find: function (b, F) { return F.solo ? 'Your load reads ' + fmt(b.scored[0].score) + ': a low load. Good conditions to look at harder things.' : 'Every load score that was filled in reads under 0.30 (' + b.scored.map(function (x) { return x.label + ' ' + fmt(x.score); }).join(', ') + '). Good conditions for the harder conversations.'; },
      why: 'Light loads mean what comes up is probably about the thing itself, not leftover load. It is the best time to talk about setup changes.' },
    { id: 'bat-spread', pillar: 'III', src: ['WP-02'], pri: 5, title: 'Load scores are far apart',
      when: function (F) { return F.bat.spread != null && F.bat.spread >= 0.35 ? { hi: F.bat.max, lo: F.bat.min, d: F.bat.spread } : null; },
      find: function (d) { return 'Load scores are ' + fmt(d.d) + ' apart: ' + d.hi.label + ' at ' + fmt(d.hi.score) + ', ' + d.lo.label + ' at ' + fmt(d.lo.score) + '.'; },
      why: 'People having very different weeks can hear the same sentence very differently. It is nobody’s fault; it is worth knowing before a conversation.',
      rec: function (d, F, v) { return { h: 'now', title: 'Say your numbers before you start', first: 'Open the next conversation with everyone’s load score number, and let whoever is carrying the most choose the timing.', script: '“I’m at ' + fmt(d.lo.score) + ', you’re at ' + fmt(d.hi.score) + '. You pick when we talk.”', link: linkOf('WP-02'), working: 'Hard talks happen on days when everyone reads under 0.60.' }; } },
    { id: 'stressor-shared', pillar: 'III', src: ['WP-02'], pri: 6, title: 'The same thing is weighing on several people',
      when: function (F) {
        if (!(F.n >= 2 && F.bat.full.length >= 2)) return null;
        var k = -1, best = 0;
        F.factorHigh.forEach(function (who, i) { if (who.length >= 2 && who.length >= F.bat.full.length / 2 && who.length > best) { best = who.length; k = i; } });
        return k >= 0 ? { f: F.factors[k], who: F.factorHigh[k], k: k } : null;
      },
      find: function (d) { return lc(d.f) + ' scored 3 or 4 for ' + list(d.who) + '.'; },
      why: 'A stressor you share is one you can tackle together, and knowing it is shared takes some of the sting out.',
      rec: function (d, F, v) { var sleep = d.k === 0, time = d.k === 4; return { h: 'week', title: 'Tackle the shared stressor together', first: sleep ? 'Agree on one earlier night for everyone this week, and protect it.' : time ? 'Look at next week together and move one deadline or commitment before it arrives.' : 'Name it together, once, and agree one small thing that would ease it this week.', script: '“It sounds like ' + lc(d.f) + ' is hitting all of us. What’s one thing we could do about it together?”', link: linkOf('WP-02'), working: 'That line scores lower for most people next week.' }; } },
    { id: 'stressor-top', pillar: 'III', src: ['WP-02'], pri: 5, title: 'What is adding most to the load',
      when: function (F) {
        var best = -1; F.factorAvg.forEach(function (a, i) { if (a != null && a >= 2.5 && (best < 0 || a > F.factorAvg[best])) best = i; });
        return best >= 0 ? { f: F.factors[best], avg: F.factorAvg[best], k: best } : null;
      },
      find: function (d, F) { return (F.solo ? 'The biggest part of your load right now is ' : 'The biggest part of the load, on average, is ') + lc(d.f) + ' (' + C1().f1(d.avg) + ' out of 4).'; },
      why: 'Knowing the driver turns "I feel awful" into something with a handle on it. Some drivers are in your control this week; some are just weather.',
      rec: function (d, F, v) { return { h: 'week', title: 'Ease the biggest driver', first: d.k === 0 ? 'Protect sleep for three nights this week; treat it as real work on the setup.' : d.k === 1 ? 'Name one thing from the workload elsewhere that can wait until next week.' : d.k === 2 ? 'Pick a calm time to settle one unresolved thing, using fact, feeling and ask.' : d.k === 3 ? 'Eat, rest or look after the body first, before any hard conversation.' : 'Move one deadline or commitment before it arrives, not after.', script: '', link: d.k === 2 ? linkOf('WP-09') : linkOf('WP-02'), working: 'That line reads 2 or less next week.' }; } },
    { id: 'sleep-driver', pillar: 'III', src: ['WP-02', 'NOTES'], pri: 5, title: 'Sleep is part of the story',
      when: function (F) {
        var who = F.factorHigh[0] || [];
        return who.length || F.wx.short >= 2 ? { who: who, weeks: F.wx.short } : null;
      },
      find: function (d, F) { return [d.who.length ? (F.solo ? 'Sleep debt scored 3 or 4 on your load score' : 'Sleep debt scored 3 or 4 for ' + list(d.who)) : '', d.weeks >= 2 ? plural(d.weeks, 'week') + ' of the weather log started on short sleep' : ''].filter(Boolean).join(', and ') + '.'; },
      why: 'Sleep is the strongest single signal in the weather check. A short night makes everything else read heavier, including other people.',
      rec: function (d, F, v) { return { h: 'week', title: 'Protect sleep before the hard talks', first: 'Don’t schedule a hard conversation after a short night. Move it by a day.', script: '“I slept badly. Can we do this tomorrow instead? I want to be fair to it.”', link: linkOf('weather'), working: 'Fewer weeks start on a short night.' }; } },
    { id: 'conflict-driver', pillar: 'IV', src: ['WP-02', 'WP-09'], pri: 5, title: 'Something unresolved is weighing on someone',
      when: function (F) { var who = F.factorHigh[2] || []; return who.length ? { who: who } : null; },
      find: function (d, F) { return (F.solo ? 'Unresolved conflict scored 3 or 4 on your load score' : 'Unresolved conflict scored 3 or 4 for ' + list(d.who)) + '. It doesn’t say with whom, and it doesn’t need to.'; },
      why: 'An open conflict anywhere adds to everyone’s load. Settling one, even a small one, often lowers the whole number.',
      rec: function (d, F, v) { return { h: 'week', title: 'Settle one open thing, gently', first: 'Write the fact, the feeling and the ask for the open thing, then choose a calm time to say it.', script: '“Can we find twenty minutes this week to sort out the thing from last week? No rush today.”', link: linkOf('WP-09'), working: 'That line reads 2 or less next week.' }; } },
    { id: 'high-days', pillar: 'III', src: ['WP-13'], pri: 6, title: 'Several high-load days in a row of check-ins',
      when: function (F) { var h = F.pp.filter(function (p) { return p.loads.High >= 3; }); return F.w13 && h.length ? { who: h } : null; },
      find: function (d) { return list(d.who.map(function (p) { return p.label + ' (' + p.loads.High + ' days)'; })) + ' marked high load on 3 or more days of the check-in week.'; },
      why: 'Three high days in a week is a pattern, not a bad day. It usually needs something taken off, not more resilience.',
      rec: function (d, F, v) { return { h: 'week', title: 'Plan next week around the high days', first: 'Look at which days were high, and move one ' + v.task + ' off those days next week.', script: '', link: linkOf('WP-13'), working: 'Fewer high-load days next week.' }; } },
    { id: 'friction-high', pillar: 'III', src: ['WP-13'], pri: 7, title: 'Friction lines up with high-load days',
      when: function (F) { var w = F.w13; if (!w || w.frictionRows.length < 2) return null; var rate = w.frictionOnHigh / w.frictionRows.length, days = w.frictionDays.length ? w.bothDays.length / w.frictionDays.length : 0; return rate >= 0.6 || (days >= 0.6 && w.frictionDays.length >= 2) ? { rate: Math.max(rate, days), days: w.bothDays.map(function (d) { return d.day; }) } : null; },
      find: function (d) { return 'Friction days in the check-ins line up with high-load days (' + pc(d.rate) + ' of friction' + (d.days.length ? ', on ' + list(d.days) : '') + ').'; },
      why: 'When friction clusters on high-load days, it is usually the load talking, not the relationship. That changes what to fix.',
      rec: function (d, F, v) { return { h: 'now', title: 'On a high day, pause before you answer', first: 'Agree that on a high-load day, anything that stings waits until the next morning.', script: '“It’s a high day for me. Can I answer that tomorrow?”', link: linkOf('WP-11'), working: 'Friction shows up on fewer high-load days next week.' }; },
      q: function () { return 'Looking at the check-ins, were the hard moments really about the thing, or about the day?'; } },
    { id: 'weather-heavier', pillar: 'III', src: ['NOTES'], pri: 6, title: 'The weather log is getting heavier',
      when: function (F) { return F.wx.trend != null && F.wx.trend >= 0.15 ? F.wx : null; },
      find: function (w) { return 'Across the weather log, the load went from ' + fmt(w.first.battery) + ' to ' + fmt(w.last.battery) + ': heavier week by week.'; },
      why: 'A rising trend across weeks is worth acting on before it becomes the new normal. Be kind about it, and look at what changed.',
      rec: function (w, F, v) { return { h: 'week', title: 'Look at what changed', first: 'Read the weekly notes side by side and circle what was different in the heavier weeks.', script: '', link: linkOf('weather'), working: 'The next weekly reading is lower.' }; } },
    { id: 'weather-lighter', pillar: 'III', src: ['NOTES'], pri: 3, strength: true, title: 'The weather log is getting lighter',
      when: function (F) { return F.wx.trend != null && F.wx.trend <= -0.15 ? F.wx : null; },
      find: function (w) { return 'Across the weather log, the load went from ' + fmt(w.first.battery) + ' to ' + fmt(w.last.battery) + ': lighter week by week.'; },
      why: 'Something helped. Naming it makes it easier to keep doing on purpose.' },
    { id: 'weather-sleep', pillar: 'III', src: ['NOTES'], pri: 5, title: 'Short-sleep weeks run heavier',
      when: function (F) { var w = F.wx; return w.shortAvg != null && w.restAvg != null && w.shortAvg - w.restAvg >= 0.15 ? w : null; },
      find: function (w) { return 'Weeks that started on short sleep averaged ' + fmt(w.shortAvg) + ' on the load score, against ' + fmt(w.restAvg) + ' after enough sleep.'; },
      why: 'That is a link in your own numbers, not a rule for everyone. It suggests sleep is one of the levers that works for you.',
      rec: function (w, F, v) { return { h: 'month', title: 'Use sleep as a lever', first: 'Pick one night a week to protect, and see if that week reads lighter.', script: '', link: linkOf('weather'), working: 'The protected-sleep weeks read lower.' }; } },
    { id: 'weather-pressure', pillar: 'III', src: ['NOTES'], pri: 4, title: 'Heavy-pressure weeks run heavier',
      when: function (F) { var w = F.wx; return w.heavyAvg != null && w.lightAvg != null && w.heavyAvg - w.lightAvg >= 0.15 ? w : null; },
      find: function (w) { return 'Weeks that already felt heavy averaged ' + fmt(w.heavyAvg) + ' on the load score, against ' + fmt(w.lightAvg) + ' in lighter weeks.'; },
      why: 'What you were already carrying shapes how the week reads. It is a reason to plan fewer extras into heavy weeks.',
      rec: function (w, F, v) { return { h: 'month', title: 'Plan lighter weeks around heavy ones', first: 'When a week starts heavy, drop one optional thing on day one.', script: '', link: linkOf('weather'), working: 'Heavy weeks read closer to the others.' }; } },
    { id: 'weather-checkin-week', pillar: 'III', src: ['NOTES', 'WP-13'], pri: 5, title: 'The friction week was a stormy week',
      when: function (F) {
        if (!(F.w13 && F.w13.weekOf && F.w13.frictionRows.length >= 2)) return null;
        var start = F.w13.weekOf.getTime(), hit = F.wx.weeks.filter(function (w) { var d = parseISO(w.date); return d && Math.abs(d.getTime() - start) <= 6 * 864e5 && (w.sky === 'Gusty' || w.sky === 'Fogged in' || (w.battery != null && w.battery >= 0.6)); })[0];
        return hit ? { w: hit, fr: F.w13.frictionRows.length } : null;
      },
      find: function (d) { return 'The check-in week had ' + d.fr + ' friction notes, and the weather log for that week reads ' + (d.w.sky ? lc(d.w.sky) : 'a load score of ' + fmt(d.w.battery)) + '.'; },
      why: 'Friction in a low-weather week says as much about the weather as about anyone. It is worth reading the two side by side.',
      rec: null },
    { id: 'settle-works', pillar: 'III', src: ['WP-11'], pri: 3, strength: true, title: 'Settling works',
      when: function (F) { return F.w11 && F.w11.pairs.length >= 2 && F.w11.avgDrop != null && F.w11.avgDrop >= 0.1 ? F.w11 : null; },
      find: function (w) { return 'After settling, the load dropped by ' + fmt(w.avgDrop) + ' on average (' + plural(w.pairs.length, 'reading') + ').'; },
      why: 'That is your own evidence that a pause is a real tool, not a way out. Worth remembering on the day it feels pointless.' },
    { id: 'nokit-highbat', pillar: 'III', src: ['WP-11', 'WP-02'], pri: 6, title: 'A heavy load and no calm-down plan yet',
      when: function (F) { return F.c.wp11 && F.bat.high.length && !(F.c.wp11.first || F.c.wp11.second) ? { who: F.bat.high } : null; },
      find: function (d, F) { return (F.solo ? 'Your load is high' : list(lbl(d.who)) + (d.who.length === 1 ? '’s load is' : '’s loads are') + ' high') + ', and no settling defaults are chosen on WP-11 yet.'; },
      why: 'Choosing in the moment is hardest exactly when you need it. Two defaults picked on a calm day make the pause automatic.',
      rec: function (d, F, v) { return { h: 'now', title: 'Pick two settling defaults today', first: 'Choose two from the list on WP-11 (breathing 4 in and 6 out is a good first one) and write a pause line.', script: '“I need twenty minutes. I’m not leaving the conversation; I’ll be back at half past.”', link: linkOf('WP-11'), working: 'The next hard moment has a pause in it instead of a raised voice.', plan: { title: 'Your calm-down kit', wp: 'WP-11', do: 'On a calm day, pick two settling defaults and write a pause line: how you are, how long you need, when you’ll be back.', pillar: 'III' } }; } },
    { id: 'pause-partial', pillar: 'III', src: ['WP-11'], pri: 4, title: 'Not everyone has a pause line yet',
      when: function (F) { if (!(F.n >= 2 && F.c.wp11 && F.c.wp11.filled)) return null; var miss = F.pp.filter(function (p) { return !p.pause; }); return miss.length && miss.length < F.n ? { miss: miss } : null; },
      find: function (d) { return 'Pause lines are still to write for ' + list(lbl(d.miss)) + '.'; },
      why: 'A pause only feels safe when everyone recognizes it. Without a line, a pause can be mistaken for walking out.',
      rec: function (d, F, v) { return { h: 'week', title: 'Everyone writes a pause line', first: 'Each person writes one sentence: how they are, how long they need, and when they will be back.', script: '“I’m flooded. Twenty minutes, then I’m back.”', link: linkOf('WP-11'), working: 'Everyone can say everyone else’s pause line.' }; } },

    /* --- Pillar IV: tune how you send and receive (WP-09, RF, Wiring Card) --- */
    { id: 'rf-low', pillar: 'IV', src: ['CALC-01', 'WP-09'], pri: 6, title: 'Few frictions got retuned',
      when: function (F) { var k = F.c.calc; return k.rf != null && k.rf < 0.5 ? k : null; },
      find: function (k) { return k.retunes + ' of ' + k.friction + ' friction moments ' + (k.retunes === 1 ? 'was' : 'were') + ' retuned before answering (RF ' + fmt(k.rf) + ').'; },
      why: 'Retuning is the habit that stops one bad moment from becoming a bad week. It gets easier each time.',
      rec: function (k, F, v) { return { h: 'week', title: 'Retune one message a week', first: 'Pick the next message that stings and write the fact, the feeling and the ask before you answer.', script: '“Give me a minute to say that better.”', link: linkOf('WP-09'), working: 'Half or more of next week’s friction moments are retuned.', plan: { title: 'Say it so it lands', wp: 'WP-09', do: 'Put one charged message a week through fact, feeling and ask before it goes out. Count the friction moments and how many you retuned.', pillar: 'IV' } }; } },
    { id: 'rf-high', pillar: 'IV', src: ['CALC-01', 'WP-09'], pri: 3, strength: true, title: 'Most frictions got retuned',
      when: function (F) { var k = F.c.calc; return k.rf != null && k.rf >= 0.75 ? k : null; },
      find: function (k) { return k.retunes + ' of ' + k.friction + ' friction moments ' + (k.retunes === 1 ? 'was' : 'were') + ' retuned before answering (RF ' + fmt(k.rf) + ').'; },
      why: 'That is the repair habit working. It is worth saying out loud, because it is invisible when it works.' },
    { id: 'wp09-pause', pillar: 'III', src: ['WP-09'], pri: 6, title: 'Say it so it lands says: pause first',
      when: function (F) { return F.c.wp09 && F.c.wp09.advice === 'pause' ? F.c.wp09 : null; },
      find: function (m) { return 'The four checks on WP-09 suggest pausing before answering' + (m.pattern ? ': it may be answering an older pattern, not just these words' : m.satNo ? ': you might read it differently with a lighter load' : '') + '.'; },
      why: 'A reply sent while carrying a lot, or at an old pattern, lands on the wrong target. Waiting a day costs little.',
      rec: function (m, F, v) { return { h: 'now', title: 'Hold that message for now', first: 'Save the draft and come back to it when your load reads lower.', script: '“I want to answer this properly. Can I come back to you tomorrow?”', link: linkOf('WP-09'), working: 'The version you send is built from fact, feeling and ask.' }; } },
    { id: 'wp09-absolutes', pillar: 'IV', src: ['WP-09'], pri: 4, title: 'Always and never in the message',
      when: function (F) { return F.w9 && (F.w9.absolutes || F.w9.blame) ? F.w9 : null; },
      find: function (w) { return 'The WP-09 draft uses ' + (w.absolutes ? '"always" or "never"' : '') + (w.absolutes && w.blame ? ' and ' : '') + (w.blame ? 'a "you made me" shape in the feeling' : '') + '.'; },
      why: 'Absolutes turn one event into a pattern, and a pattern is much harder to hear than a single thing. It is a tuning issue, not a character one.',
      rec: function (w, F, v) { return { h: 'now', title: 'Swap the absolute for the one time', first: 'Replace "always" or "never" with the one specific time it happened.', script: '“On Tuesday, the dishes sat overnight, and I felt tired.”', link: linkOf('WP-09'), working: 'The next draft names one event.' }; } },
    { id: 'wp09-partial', pillar: 'IV', src: ['WP-09'], pri: 4, title: 'One part of the message is missing',
      when: function (F) { var m = F.c.wp09; return m && m.filled && m.parts >= 1 && m.parts < 3 ? m : null; },
      find: function (m) { return 'The WP-09 message has ' + m.parts + ' of its 3 parts; still to write: ' + list([!m.fact && 'the fact', !m.feeling && 'the feeling', !m.ask && 'the ask'].filter(Boolean)) + '.'; },
      why: 'The part that is hardest to write is usually the one that matters most. Without an ask, the other person has to guess what would help.',
      rec: function (m, F, v) { return { h: 'week', title: 'Finish the message', first: 'Write the missing part in one plain sentence.', script: m.ask ? '' : '“Could we ___ by ___?”', link: linkOf('WP-09'), working: 'All three parts fit in one short message.' }; } },
    { id: 'wiring-vs-tone', pillar: 'IV', src: ['NOTES', 'WP-09'], pri: 6, title: 'The Wiring Card and the message don’t quite match',
      when: function (F) {
        if (!(F.c.wp09 && F.c.wp09.filled && F.c.notes.wiringLines)) return null;
        var W = F.wiringIds, out = [];
        if (W.ask && W.ask.indexOf('headline') >= 0 && F.c.wp09.ask && F.c.wp09.parts === 3) out.push('The card says a request lands best with the ask in the first sentence; the WP-09 draft puts the ask last. For this reader, try the ask first, then the fact and feeling.');
        if (W.avoid && W.avoid.indexOf('always') >= 0 && F.w9.absolutes) out.push('The card asks to avoid "always", "never" and labels, and the WP-09 draft uses one.');
        if (W.avoid && W.avoid.indexOf('long') >= 0 && F.w9.words > 50) out.push('The card asks to avoid long texts, and the WP-09 draft runs to ' + F.w9.words + ' words.');
        if (W.receive && (W.receive.indexOf('one') >= 0 || W.receive.indexOf('list') >= 0) && F.w9.words > 60) out.push('The card says one thing at a time; the WP-09 draft may carry more than one.');
        if (W.time && (W.time.indexOf('tomorrow') >= 0 || W.time.indexOf('write') >= 0) && F.c.wp09.advice === 'clear') out.push('The card asks for time to answer; even when the checks say you’re clear, give the reply that time.');
        if (W.words && W.words.indexOf('literal') >= 0 && F.c.wp09.ask && !F.w9.askQ) out.push('The card says words are taken literally; make the ask an explicit request (“Could you ___ by ___?”) rather than a hint.');
        if (W.receive && W.receive.indexOf('writing') >= 0 && F.c.wp09.parts === 3) out.push('The card says things are taken in best in writing: sending the fact, feeling and ask as a short written message may land better than saying it in passing.');
        return out.length ? { lines: out } : null;
      },
      find: function (d) { return d.lines[0]; },
      why: function (d) { return (d.lines.length > 1 ? d.lines.slice(1).join(' ') + ' ' : '') + 'A mismatch between how a message is sent and how it is best received is tuning, not a moral failing.'; },
      rec: function (d, F, v) { return { h: 'week', title: 'Send it the way it is best received', first: 'Rewrite the WP-09 message to match the Wiring Card: order, length and channel.', script: '', link: linkOf('wiring'), working: 'The reply comes back calmer than last time.' }; },
      q: function () { return 'How does each of us take in a hard message best: written or spoken, ask first or ask last?'; } },
    { id: 'quiet-meaning', pillar: 'IV', src: ['NOTES', 'WP-02'], pri: 5, title: 'Going quiet has a meaning worth sharing',
      when: function (F) {
        var W = F.wiringIds.quiet || [], i = F.notesWho; if (!W.length) return null;
        var b = i != null ? F.c.battery[i] : null;
        return (W.indexOf('load') >= 0 || W.indexOf('space') >= 0 || W.indexOf('upset') >= 0) && b && b.score != null && b.score >= 0.5 ? { who: F.notesLabel, what: (F.wiring.quiet || [])[0], b: b } : null;
      },
      find: function (d) { return 'The Wiring Card says going quiet means ' + q(lc(d.what)) + ', and ' + d.who + '’s load reads ' + fmt(d.b.score) + ' this week.'; },
      why: 'Silence is easy to misread as sulking or not caring. Saying what it means ahead of time turns it into information.',
      rec: function (d, F, v) { return { h: 'now', title: 'Say what quiet means, ahead of time', first: 'Share the quiet line from the Wiring Card before the next busy day.', script: '“If I go quiet this week, it means ' + lc(d.what).replace(/^i’m/, 'I’m') + '. It isn’t about you.”', link: linkOf('wiring'), working: 'Nobody reads the next quiet spell as a problem.' }; } },

    /* --- Pillar V: notice the quiet incentives (WP-13, WP-01 part B, WP-04) --- */
    { id: 'thanks-flow', pillar: 'V', src: ['WP-13'], pri: 3, strength: true, title: 'Appreciation is flowing',
      when: function (F) { var w = F.c.wp13; return w && w.thanks.length >= 3 && w.thanks.length >= w.entries / 2 ? w : null; },
      find: function (w) { return plural(w.thanks.length, 'appreciation') + ' written down in ' + w.entries + ' check-ins, for example ' + q(w.thanks[0][0]); },
      why: 'Thanks are the steadiest of the quiet incentives: they keep fair setups fair. They are also worth reading again on a harder day.' },
    { id: 'thanks-low', pillar: 'V', src: ['WP-13'], pri: 5, title: 'Few appreciations were written',
      when: function (F) { var w = F.c.wp13; return w && w.entries >= 4 && w.thanks.length < w.entries / 3 ? w : null; },
      find: function (w) { return 'Only ' + w.thanks.length + ' of ' + w.entries + ' check-ins included something appreciated.'; },
      why: 'When thanks go quiet, work starts to feel owed rather than given. It is the cheapest thing to bring back.',
      rec: function (w, F, v) { return { h: 'week', title: 'One thanks a day', first: 'Make the thanks the first line of every check-in this week, even a small one.', script: '“Thanks for ___ today. I noticed.”', link: linkOf('WP-13'), working: 'Most check-ins next week include a thanks.', plan: { title: F.road === 'coworkers' ? 'A short daily stand-up' : 'The 90-second daily check-in', wp: 'WP-13', do: 'Every day for a week: load, one thanks, one small ask. Thanks first. No debating.', pillar: 'V' } }; } },
    { id: 'thanks-uneven', pillar: 'V', src: ['WP-13'], pri: 4, title: 'Thanks are written by some, not others',
      when: function (F) { if (!(F.n >= 2 && F.w13)) return null; var zero = F.pp.filter(function (p) { return p.checkins >= 2 && p.thanks === 0; }), many = F.pp.filter(function (p) { return p.thanks >= 2; }); return zero.length && many.length ? { zero: zero, many: many } : null; },
      find: function (d) { return list(lbl(d.many)) + ' wrote appreciations in the check-ins; ' + list(lbl(d.zero)) + ' checked in but wrote none.'; },
      why: 'Often it is just habit: some people show thanks in actions, not words. Saying it out loud still makes it count for the other person.',
      rec: function (d, F, v) { return { h: 'week', title: 'Everyone writes one thanks', first: 'Each person adds one thanks to their check-in, even a small one.', script: '', link: linkOf('WP-13'), working: 'Everyone writes at least two thanks next week.' }; } },
    { id: 'repeat-friction', pillar: 'V', src: ['WP-13'], pri: 6, title: 'The same small friction keeps coming back',
      when: function (F) { return F.w13 && F.w13.repeatFriction.length ? F.w13.repeatFriction[0] : null; },
      find: function (r) { return 'A friction about ' + q(short(r.text, 50)) + ' came up ' + r.times + ' times in the check-ins.'; },
      why: 'A repeat friction is a sore spot, and sore spots belong in the setup (WP-03) or the tone (WP-09), not in more daily check-ins.',
      rec: function (r, F, v) { return { h: 'week', title: 'Move the sore spot to where it can be fixed', first: 'Write it in the re-sync box on WP-13 and move it to WP-03 (an owner) or WP-09 (how it is said).', script: '', link: linkOf('WP-13'), working: 'It doesn’t come up next week.' }; } },
    { id: 'repeat-ask', pillar: 'V', src: ['WP-13'], pri: 5, title: 'The same ask keeps coming back',
      when: function (F) { return F.w13 && F.w13.repeatAsk.length ? F.w13.repeatAsk[0] : null; },
      find: function (r) { return 'The ask ' + q(short(r.text, 50)) + ' came up ' + r.times + ' times.'; },
      why: 'An ask that repeats is a request that hasn’t found an owner yet. Once it has one, nobody has to keep asking.',
      rec: function (r, F, v) { return { h: 'week', title: 'Turn the repeated ask into a job', first: 'Give the thing behind the ask a named owner on WP-03.', script: '“You’ve asked for this a few times. Let’s make it someone’s job.”', link: linkOf('WP-03'), working: 'The ask stops appearing in the check-ins.' }; } },
    // With only a day or two written, this reads as a start, not a rate: no percentage, no "patchy".
    { id: 'checkins-skip', pillar: 'V', src: ['WP-13'], pri: 5, title: function (w) { return w.early ? 'The check-ins have started' : 'Check-ins are patchy'; },
      when: function (F) { var w = F.w13; if (!w) return null; return w.early || w.rate < 0.5 || (F.n >= 2 && w.skipped.length && w.skipped.length < F.n) ? w : null; },
      find: function (w, F) {
        if (w.early) return 'You’ve started: ' + plural(w.entries, 'check-in') + ' so far. A few more will show a pattern.';
        return w.entries + ' of ' + w.possible + ' possible check-ins ' + (w.entries === 1 ? 'was' : 'were') + ' filled in (' + pc(w.rate) + ')' + (F.n >= 2 && w.skipped.length ? '; none yet from ' + list(lbl(w.skipped)) : '') + '.';
      },
      why: function (w) { return w.early ? 'A day or two is a good start. A check-in only works when it is short enough to keep, so keep it small while it becomes a habit.' : 'A check-in only works when it is short enough to keep. A patchy week usually means the check-in is too long or at the wrong time, not that anyone doesn’t care.'; },
      rec: function (w, F, v) { return { h: 'week', title: w.early ? 'Keep the check-in going' : 'A check-in short enough to keep', first: 'Attach the check-in to something that already happens every day, like dinner, and keep it to 90 seconds.', script: '', link: linkOf('checkins'), working: 'Five or more days of check-ins next week, from everyone.' }; } },
    { id: 'checkins-steady', pillar: 'V', src: ['WP-13'], pri: 3, strength: true, title: 'Check-ins are steady',
      when: function (F) { return F.w13 && F.w13.rate >= 0.8 ? F.w13 : null; },
      find: function (w) { return w.entries + ' of ' + w.possible + ' possible check-ins ' + (w.entries === 1 ? 'was' : 'were') + ' filled in (' + pc(w.rate) + ').'; },
      why: 'Short and steady beats long and rare. This habit is what keeps small things small.' },
    { id: 'resync-open', pillar: 'II', src: ['WP-13', 'WP-03'], pri: 4, title: 'A sore spot was moved to owners, but the owners list still has gaps',
      when: function (F) { var r = F.c.wp13 && F.c.wp13.resync.filter(function (x) { return /RACI|Owners/i.test(x.to || ''); }); return r && r.length && F.w3 && F.w3.gaps.length ? { r: r } : null; },
      find: function (d) { return q(d.r[0].item) + ' was moved to the owners list, and WP-03 still has jobs without a clear owner.'; },
      why: 'Moving a sore spot is only half the fix. It lands when the job has a name next to it.',
      rec: function (d, F, v) { return { h: 'week', title: 'Finish the move', first: 'Find ' + q(d.r[0].item) + ' on WP-03 (or add it) and give it an owner.', script: '', link: linkOf('WP-03'), working: 'It stops coming up in the check-ins.' }; } },
    { id: 'nokindno-highbat', pillar: 'V', src: ['WP-01', 'WP-02'], pri: 5, title: 'A heavy load and no kind no ready',
      when: function (F) { return F.refusals && !F.refusals.length && F.c.on['WP-01'] && F.bat.high.length ? { who: F.bat.high } : null; },
      find: function (d, F) { return (F.solo ? 'Your load is high' : list(lbl(d.who)) + (d.who.length === 1 ? ' is' : ' are') + ' running high') + ', and no kind no is drafted on WP-01.'; },
      why: 'Saying yes by default is one of the quiet incentives that keeps a heavy load heavy. A kind no ready in advance makes the next yes a real one.',
      rec: function (d, F, v) { return { h: 'week', title: 'Draft one kind no', first: 'Write why the next request is fair, what you honestly have left, and what you can offer instead.', script: '“That’s a fair ask. I’m at capacity this week. I could do it on Saturday.”', link: linkOf('WP-01'), working: 'You say it once, to a small request, and it goes fine.', plan: { title: 'Kind ways to say no', wp: 'WP-01 Part B', do: 'Draft one kind no, then try it on a small request.', pillar: 'V' } }; } },
    { id: 'kindno-ready', pillar: 'V', src: ['WP-01'], pri: 2, strength: true, title: 'Kind no’s are ready',
      when: function (F) { return F.refusals && F.refusals.length ? F.refusals : null; },
      find: function (r) { return plural(r.length, 'kind no') + ' drafted and ready, for example ' + q(short(said([sentence(r[0].ack), sentence(r[0].cap), sentence(r[0].alt)]), 90)); },
      why: 'Saying no to one thing is how you say yes to your energy, and a drafted one is much easier to say.' },
    { id: 'ready-going', pillar: 'V', src: ['READY'], pri: 4, strength: true, title: 'In your words: what is going well',
      when: function (F) { return F.c.ready.going ? F.c.ready : null; },
      find: function (r) { return 'You named something already going well: ' + q(short(r.going, 120)); },
      why: 'Starting from what works keeps the rest of the report in proportion. It is the thing to protect while you change anything else.' },
    { id: 'ready-focus', pillar: 'I', src: ['READY'], pri: 4, title: 'What you asked the report to help with',
      when: function (F) {
        var f = F.c.ready.focus; if (!f) return null;
        var map = [[/chore|fair|split|share|house|job|task|owner|who does|load|work/i, 'WP-01 and WP-03'], [/talk|argu|fight|tone|say|word|message|text|listen|heard/i, 'WP-09 and the Wiring Card'], [/tired|stress|drain|exhaust|battery|overwhelm|calm|sunday/i, 'WP-02, WP-11 and the weather log'], [/slip|forget|remember|drop/i, 'WP-04 and WP-13'], [/thank|apprec|seen|notice/i, 'WP-13 and WP-01']];
        var hit = map.filter(function (m) { return m[0].test(f); }).map(function (m) { return m[1]; });
        return { f: f, where: hit };
      },
      find: function (d) { return 'You asked for help with ' + q(short(d.f, 100)) + (d.where.length ? '. The sections that speak to it most: ' + list(d.where.slice(0, 2)) + '.' : '.'); },
      why: 'Reading the report through your own question keeps it useful. Everything else can wait for another sitting.' },
    { id: 'state-not-now', pillar: 'III', src: ['CALC-01'], pri: 9, title: 'Read today, act another day',
      when: function (F) { var s = F.c.calc.state; return s === 'Revved up' || s === 'Running on empty' ? { s: s } : null; },
      find: function (d) { return 'You marked yourself as ' + lc(d.s) + ' while filling this in.'; },
      why: 'Your state shapes how every number here reads. The numbers will still be true tomorrow.',
      rec: function (d, F, v) { return { h: 'now', title: 'Read it now, decide later', first: 'Read the report, then close it. Bring one point to ' + v.meeting + ' on a calmer day.', script: '“I’ve read it. Can we look at one thing from it on ' + (F.solo ? 'a calmer day' : 'the weekend') + '?”', link: linkOf('WP-11'), working: 'Nothing is decided on the day you read it.' }; } },
    { id: 'solo-wiring-none', pillar: 'IV', src: ['NOTES'], pri: 6, title: 'Your wiring isn’t written down yet',
      when: function (F) { return F.solo && !F.c.notes.wiringLines ? true : null; },
      find: function () { return 'The Wiring Card is blank, so the report can’t yet turn it into a short note to share.'; },
      why: 'The card is the fastest way to explain yourself without having to explain everything.',
      rec: function (d, F, v) { return { h: 'week', title: 'Fill in the Wiring Card', first: 'Tick what is true on the self-notes page, then read it back and change anything that isn’t quite right.', script: '', link: linkOf('wiring'), working: 'You can hand someone the card instead of a long explanation.', plan: { title: 'Know your wiring', wp: 'Wiring Card', do: 'Fill in the Wiring Card, then read it back and change anything that isn’t quite true. See /know-yourself.html for more.', pillar: 'IV' } }; } },
    { id: 'solo-pattern', pillar: 'II', src: ['WP-09', 'WP-11'], pri: 5, title: 'An older pattern may be in the room',
      when: function (F) { return F.c.wp09 && F.c.wp09.pattern ? { trig: F.c.wp11 ? F.c.wp11.triggers.map(function (t) { return t.trigger; }).filter(Boolean) : [] } : null; },
      find: function (d) { return 'On WP-09 you said you may be responding to a pattern from a past conversation' + (d.trig.length ? '; your Calm-Down Kit names ' + list(d.trig.map(function (t) { return q(t); })) + ' as what tends to start it' : '') + '.'; },
      why: 'Patterns are a setup, not a flaw. Once you can name one, you can plan around it instead of being surprised by it.',
      rec: function (d, F, v) { return { h: 'month', title: 'Plan around the pattern', first: 'Write what usually starts it, and one thing you will do differently next time it shows up.', script: '“This one touches an old sore spot for me, so I might need a minute.”', link: linkOf('know'), working: 'Next time, you notice the pattern before you answer.' }; } }
  ];

  function fireRules(F, v) {
    var out = [];
    var held = F.c && F.c.wp01 && F.c.wp01.oneSided;
    RULES.forEach(function (r) {
      var d;
      // a log with only one side in says nothing yet about how the work is shared
      if (held && (r.src || []).indexOf('WP-01') >= 0) return;
      try { d = r.when(F, v); } catch (e) { d = null; }
      if (!d) return;
      var o = { id: r.id, pillar: r.pillar, src: r.src, pri: r.pri, strength: !!r.strength, title: typeof r.title === 'function' ? r.title(d, F, v) : r.title,
        finding: r.find(d, F, v), why: typeof r.why === 'function' ? r.why(d, F, v) : r.why,
        rec: r.rec ? r.rec(d, F, v) : null, q: r.q ? r.q(d, F, v) : null };
      if (o.rec) { o.rec.why = o.finding; o.rec.from = r.id; o.rec.pri = r.pri; o.rec.pillar = r.pillar; }
      out.push(o);
    });
    out.sort(function (a, b) { return b.pri - a.pri; });
    return out;
  }

  /* ---------- data checks: things worth a second look */
  // Each check returns the details it needs, or nothing. The wording stays gentle: it may be a
  // typo, or it may be real. level 'check' = probably worth fixing; 'note' = worth knowing.

  var CHECKS = [
    { id: 'wp01-one-sided', where: 'WP-01', level: 'check',
      when: function (F) { return F.c.wp01 && F.c.wp01.oneSided ? F.c.wp01.oneSided : null; },
      text: function (o) { return oneSidedLine(o) + ' A missing week isn’t a week of zero, so the split, the balance and any hand-over are held back until ' + (o.missing.length === 1 ? 'it is' : 'they are') + ' in.'; },
      fix: function (o) { return 'Each person adds their own rows to Who did what (on their own device is fine; then bring the files together here). If ' + list(o.missing) + ' really did none of these jobs this week, a row saying so with 0 minutes is enough.'; } },
    { id: 'wp01-week-too-long', where: 'WP-01', level: 'check',
      when: function (F) { if (!F.w1) return null; var over = F.pp.filter(function (p) { return p.minutes != null && p.minutes > 80 * 60; }); return over.length ? over : null; },
      text: function (o) { return list(o.map(function (p) { return p.label + ', ' + minText(p.minutes) + ','; })).replace(/,$/, '') + ' logged more than 80 hours in one week of jobs. That may be a typo (hours typed as minutes), or it may be a very heavy week.'; },
      fix: 'Check the minutes column on WP-01. Hours can be written as "2h".' },
    { id: 'wp01-row-long', where: 'WP-01', level: 'check',
      when: function (F) { var r = F.w1 && F.w1.rows.filter(function (x) { return x.min > 600; }); return r && r.length ? r : null; },
      text: function (r) { return list(r.slice(0, 3).map(function (x) { return q(x.task || 'a row') + ' at ' + minText(x.min); })) + ' took more than 10 hours in a single row. It may be real, or several days added up in one row.'; },
      fix: 'If it covers several days, split it into one row per day.' },
    { id: 'wp01-hours-as-minutes', where: 'WP-01', level: 'note',
      when: function (F) {
        if (!F.w1) return null;
        var ms = F.w1.rows.filter(function (x) { return x.min > 0; }).map(function (x) { return x.min; }).sort(function (a, b) { return a - b; });
        if (ms.length < 3) return null;
        // Only a 1, 2 or 3 among rows that mostly take an hour or more is worth a question: a 5-minute
        // job (taking out the trash) is ordinary and is never flagged.
        var med = ms[Math.floor(ms.length / 2)], r = F.w1.rows.filter(function (x) { return x.min > 0 && x.min <= 3 && !/h/i.test(x.minRaw); });
        return med >= 60 && r.length ? r : null;
      },
      text: function (r) { return list(r.slice(0, 3).map(function (x) { return q(x.task || 'a row') + ' (' + x.minRaw + ' min)'; })) + ': a very small number next to the others. If it was hours, it would change the balance; if it really was that quick, nothing to do.'; },
      fix: 'If it was hours, write it as "2h" and the report will turn it into minutes.' },
    { id: 'wp01-no-owner', where: 'WP-01', level: 'check',
      when: function (F) { return F.w1 && F.w1.noOwner.length ? F.w1.noOwner : null; },
      text: function (r) { return plural(r.length, 'row') + ' on WP-01 ' + (r.length === 1 ? 'names' : 'name') + ' a job but not who did it (' + listSome(r.map(function (x) { return q(x.task); }), 3) + '), so ' + (r.length === 1 ? 'its minutes aren’t' : 'those minutes aren’t') + ' in the balance.'; },
      fix: 'Add a name, an initial, or "Everyone".' },
    { id: 'wp01-no-minutes', where: 'WP-01', level: 'note',
      when: function (F) { return F.w1 && F.w1.noMin.length ? F.w1.noMin : null; },
      text: function (r) { return plural(r.length, 'row') + ' on WP-01 ' + (r.length === 1 ? 'has' : 'have') + ' no minutes (' + listSome(r.map(function (x) { return q(x.task || x.whoRaw); }), 3) + '), so ' + (r.length === 1 ? 'it counts as a job' : 'they count as jobs') + ' but not as time.'; },
      fix: 'A rough guess is fine: 5, 15, 30 or 60 minutes.' },
    { id: 'wp01-duplicate', where: 'WP-01', level: 'note',
      when: function (F) {
        if (!F.w1) return null;
        var seen = {}, dup = [];
        F.w1.rows.forEach(function (r) { if (!r.task) return; var k = [r.day, r.task.toLowerCase(), r.whoRaw.toLowerCase(), r.minRaw].join('|'); if (seen[k]) dup.push(r); seen[k] = 1; });
        return dup.length ? dup : null;
      },
      text: function (r) { return q(r[0].task) + ' appears twice on the same day with the same person and minutes. It may have been copied, or it really happened twice.'; },
      fix: 'If it was copied, clear one of the rows.' },
    { id: 'names-unmatched', where: 'WP-01, WP-03', level: 'check',
      when: function (F) { var u = uniq(((F.c.wp01 && F.c.wp01.unmatched) || []).concat((F.c.wp03 && F.c.wp03.unmatched) || [])); return u.length ? u : null; },
      text: function (u) { return list(u.slice(0, 4).map(function (x) { return q(x); })) + (u.length === 1 ? ' doesn’t' : ' don’t') + ' match anyone on the road, so ' + (u.length === 1 ? 'it isn’t' : 'they aren’t') + ' counted for a person.'; },
      fix: 'Use a name from "Who’s on this road", an initial, or "Everyone".' },
    { id: 'names-duplicate', where: 'Who’s on this road', level: 'check',
      when: function (F) { if (F.n < 2) return null; var nm = F.pp.map(function (p) { return (p.name || '').toLowerCase(); }).filter(Boolean); var d = nm.filter(function (x, i) { return nm.indexOf(x) !== i; }); return d.length ? uniq(d) : null; },
      text: function (d) { return 'Two people share the name ' + q(d[0]) + ', so an answer with that name can’t be matched to one of them.'; },
      fix: 'Add an initial to one of them (for example "Sam B").' },
    { id: 'person-empty', where: 'All pages', level: 'note',
      when: function (F) { if (F.n < 2) return null; var e = F.pp.filter(function (p) { return !p.anything; }), some = F.pp.some(function (p) { return p.anything; }); return some && e.length ? e : null; },
      text: function (e) { return list(lbl(e)) + (e.length === 1 ? ' has' : ' have') + ' no entries anywhere yet (no minutes, load score, check-ins or owned jobs). The report can’t say anything about ' + (e.length === 1 ? 'them' : 'their weeks') + ', and that is not the same as "nothing to say".'; },
      fix: 'Only if they want to: their own battery page (WP-02) is the easiest place to start.' },
    { id: 'wp02-extreme', where: 'WP-02', level: 'note',
      when: function (F) { var e = F.bat.full.filter(function (b) { return b.sum === 0 || b.sum === 20; }); return e.length ? e : null; },
      text: function (e) { return list(e.map(function (b) { return b.label + ' (' + fmt(b.score) + ')'; })) + ': every answer at the very ' + (e[0].sum === 0 ? 'bottom' : 'top') + ' of the scale. That can be real; it can also be a quick tap down one column.'; },
      fix: 'Worth a second look at WP-02, answering each line on its own.' },
    { id: 'wp02-identical', where: 'WP-02', level: 'note',
      when: function (F) {
        if (F.n < 2) return null;
        var groups = {};
        F.bat.full.forEach(function (b) { var k = b.answers.join(','); (groups[k] = groups[k] || []).push(b.label); });
        var g = Object.keys(groups).filter(function (k) { return groups[k].length >= 2; }).map(function (k) { return { who: groups[k], a: k }; });
        return g.length ? g[0] : null;
      },
      text: function (g) { return list(g.who) + ' have exactly the same five WP-02 answers (' + g.a.replace(/,/g, ', ') + '). It may be a real match, or one page copied from another.'; },
      fix: 'Each person fills in their own, about themselves.' },
    { id: 'wp02-partial', where: 'WP-02', level: 'check',
      when: function (F) { var p = F.c.battery.filter(function (b) { return b.answered > 0 && b.answered < 5 && b.source !== 'shared'; }); return p.length ? p : null; },
      text: function (p) { return list(p.map(function (b) { return b.label + ' (' + b.answered + ' of 5)'; })) + ': a load score needs all five answers, so ' + (p.length === 1 ? 'this one isn’t' : 'these aren’t') + ' worked out yet.'; },
      fix: 'Fill in the missing lines, or write just the score in the last box.' },
    { id: 'wp02-shared-conflict', where: 'WP-02', level: 'check',
      when: function (F) {
        var d = F.c.battery.filter(function (b) { var s = inRange(V(F.data, 'wp02.p' + (b.i + 1) + '.score'), 0, 1); return b.source === 'answers' && s != null && Math.abs(s - b.score) > 0.05; });
        return d.length ? d.map(function (b) { return { b: b, s: inRange(V(F.data, 'wp02.p' + (b.i + 1) + '.score'), 0, 1) }; }) : null;
      },
      text: function (d) { return d[0].b.label + ' wrote a score of ' + fmt(d[0].s) + ', but the five answers add up to ' + fmt(d[0].b.score) + '. The report uses the answers.'; },
      fix: 'Clear the score box, or check the five answers.' },
    { id: 'contradiction-fine', where: 'WP-02, Ready page', level: 'note',
      when: function (F) {
        var hi = F.bat.scored.filter(function (b) { return b.score >= 0.75; }); if (!hi.length) return null;
        var texts = [['the Ready page', F.c.ready.going], ['the Ready page', F.c.ready.focus], ['“What brings you here”', F.c.who.context]].concat(F.c.battery.map(function (b) { return ['WP-02 (' + b.label + ')', b.note]; }));
        var hit = texts.filter(function (t) { return t[1] && FINE_RE.test(t[1]); })[0];
        return hit ? { hi: hi[0], where: hit[0], text: hit[1] } : null;
      },
      text: function (d) { return d.hi.label + '’s load reads ' + fmt(d.hi.score) + ', and ' + d.where + ' says ' + q(short(d.text, 60)) + '. Both can be true on different days; it may be worth checking which one is today.'; },
      fix: 'No need to change anything. Just say your number out loud before a hard talk.' },
    { id: 'contradiction-state', where: 'CALC-01, WP-02', level: 'note',
      when: function (F) {
        var s = F.c.calc.state, i = F.solo ? 0 : F.notesWho, b = i != null ? F.c.battery[i] : null, avg = F.bat.avg;
        var val = b && b.score != null ? b.score : (F.solo ? null : avg);
        if (val == null || !s) return null;
        if (s === 'Calm and connected' && val >= 0.7) return { s: s, v: val, dir: 'high' };
        if (s === 'Running on empty' && val < 0.3) return { s: s, v: val, dir: 'low' };
        return null;
      },
      text: function (d) { return 'Step zero says ' + q(lc(d.s)) + ', while the load reads ' + fmt(d.v) + '. They were probably filled in on different days, which is fine; the state on the day you read the report matters most.'; },
      fix: 'Check your state again before reading on.' },
    { id: 'wp03-everyone', where: 'WP-03', level: 'note',
      when: function (F) { return F.w3 && F.w3.multi.length ? F.w3.multi : null; },
      text: function (r) { return listSome(r.map(function (x) { return q(x.task); }), 3) + (r.length === 1 ? ' lists' : ' list') + ' "Everyone" or several names as the owner. It counts as owned in the clarity number, which may make ownership look clearer than it is.'; },
      fix: function (d, F) { return hasCI(F) ? 'Put one name as the owner and move the group to Consulted or Informed.' : 'Put one name as the owner, and a helper or the Notes box for the others.'; } },
    { id: 'wp03-default-untouched', where: 'WP-03', level: 'note',
      // starter jobs nobody filled in are left out of the clarity number as examples; say so once
      when: function (F) {
        if (!F.w3) return null;
        var kept = (F.c.wp03 && F.c.wp03.starters) || [];
        return kept.length >= 3 ? kept.map(function (t) { return { task: t }; }) : null;
      },
      text: function (k, F) { return plural(k.length, 'starter job') + ' from the printed list ' + (k.length === 1 ? 'was' : 'were') + ' kept but not given an owner. They are examples, so they are left out of the clarity number, not counted against it.'; },
      fix: 'Clear the task box on any row that doesn’t apply.' },
    { id: 'wp04-oneoff-repeats', where: 'WP-04', level: 'check',
      when: function (F) { return F.w4 && F.w4.oneoffRepeat.length ? F.w4.oneoffRepeat : null; },
      text: function (r) { return q(r[0].task) + ' is sorted as a one-off, but it was ticked 3 or more weeks out of 4. Something that comes back most weeks is probably a pattern.'; },
      fix: 'Re-sort it as a structural gap or a capacity issue.' },
    { id: 'wp04-unsorted', where: 'WP-04', level: 'note',
      when: function (F) { return F.w4 && F.w4.unsorted.length && F.w4.cl.length ? F.w4.unsorted : null; },
      text: function (r) { return list(r.slice(0, 3).map(function (x) { return q(x.task); })) + ' came up 3 or 4 weeks but isn’t in the sorting table.'; },
      fix: 'Add it to Part B and decide what kind of gap it is.' },
    { id: 'wp04-no-ticks', where: 'WP-04', level: 'note',
      when: function (F) { return F.w4 && F.w4.noTicks.length ? F.w4.noTicks : null; },
      text: function (r) { return list(r.slice(0, 3).map(function (x) { return q(x.task); })) + (r.length === 1 ? ' is' : ' are') + ' listed as slipping, but no week is ticked.'; },
      fix: 'Tick the weeks it came up, or clear the row.' },
    { id: 'wp04-owner-conflict', where: 'WP-04, WP-03', level: 'note',
      when: function (F) {
        if (!(F.w4 && F.w3)) return null;
        var r = F.w4.cl.filter(function (x) { return x.owner === 'Yes' && F.w3.none.some(function (g) { return sameTask(g.task, x.task); }); });
        return r.length ? r : null;
      },
      text: function (r) { return q(r[0].task) + ' says "named owner: yes" on WP-04, but WP-03 shows no owner for it. One of the two pages may be out of date.'; },
      fix: 'Update whichever page is older.' },
    { id: 'wp13-empty-checkins', where: 'WP-13', level: 'note',
      when: function (F) { return F.w13 && F.w13.empty.length >= 2 ? F.w13.empty : null; },
      text: function (r) { return plural(r.length, 'check-in') + ' marked a load but left the thanks, friction and ask blank. That counts as a check-in, and the notes are where most of the value is.'; },
      fix: 'Even one word in "One thing I appreciated" is enough.' },
    { id: 'wp13-committed-skipped', where: 'WP-13', level: 'note',
      when: function (F) { if (!F.w13) return null; var s = F.pp.filter(function (p) { return p.committed && p.checkins < 3; }); return s.length ? s : null; },
      text: function (s) { return list(lbl(s)) + ' agreed to the daily check-in but ' + (s.length === 1 ? 'has' : 'have') + ' fewer than 3 check-ins recorded. It may be that they were done out loud and not written down.'; },
      fix: 'If they happened out loud, a tick for the load is enough to record them.' },
    { id: 'wp13-gap-day', where: 'WP-13', level: 'note',
      when: function (F) {
        if (!F.w13) return null;
        var on = F.w13.byDay.map(function (d) { return d.n > 0; }), first = on.indexOf(true), last = on.lastIndexOf(true);
        var gaps = F.w13.byDay.filter(function (d, i) { return i > first && i < last && !d.n; });
        return first >= 0 && gaps.length ? gaps : null;
      },
      text: function (g) { return 'The check-ins skip ' + list(g.map(function (d) { return d.day; })) + ' in the middle of the week. A missed day is normal; it may also be a day worth asking about.'; },
      fix: 'Nothing to fix. If it was a hard day, that is worth a gentle word.' },
    { id: 'calc-typed-conflict', where: 'CALC-01', level: 'check',
      when: function (F) {
        var k = F.c.calc, out = [];
        [['wb', 'Workload balance', F.c.wp01 && F.c.wp01.wb, 'WP-01'], ['oc', 'Ownership clarity', F.c.wp03 && F.c.wp03.oc, 'WP-03'], ['as', 'Average load', k.asSrc === 'WP-02' ? k.as : null, 'WP-02']].forEach(function (t) {
          var typed = inRange(V(F.data, 'calc.' + t[0]), 0, 1);
          if (typed != null && t[2] != null && Math.abs(typed - t[2]) >= 0.1) out.push({ name: t[1], typed: typed, derived: t[2], src: t[3] });
        });
        return out.length ? out : null;
      },
      text: function (o) { return o.map(function (x) { return x.name + ' was typed as ' + fmt(x.typed) + ', but ' + x.src + ' works out to ' + fmt(x.derived); }).join('; ') + '. The report uses the worked-out number; the typed one may be from an earlier week.'; },
      fix: 'Clear the typed number on the CALC-01 page, or check the worksheet.' },
    { id: 'calc-retunes-exceed', where: 'CALC-01', level: 'check',
      when: function (F) { return F.c.calc.capped ? F.c.calc : null; },
      text: function (k) { return k.retunes + ' retunes were counted against ' + k.friction + ' friction moments. You can’t retune more moments than there were, so RF is capped at 1.00.'; },
      fix: 'Check the two numbers on the CALC-01 page.' },
    { id: 'calc-friction-vs-wp13', where: 'CALC-01, WP-13', level: 'note',
      when: function (F) { var k = F.c.calc; if (!(F.w13 && k.friction != null)) return null; var n13 = F.w13.frictionRows.length; return n13 >= 2 && k.friction < n13 / 2 ? { k: k, n13: n13 } : null; },
      text: function (d) { return 'The CALC-01 page counts ' + d.k.friction + ' friction ' + (d.k.friction === 1 ? 'moment' : 'moments') + ', while the check-ins note ' + d.n13 + '. They may cover different weeks, or some small ones weren’t counted.'; },
      fix: 'Count friction for the same week as the check-ins.' },
    { id: 'numbers-out-of-range', where: 'Several pages', level: 'check',
      when: function (F) { var iss = readReport(F.data).issues.filter(function (i) { return /isn’t a number|is outside|is below|is above/.test(i.msg); }); return iss.length ? iss : null; },
      text: function (i) { return plural(i.length, 'number') + ' couldn’t be used: ' + i.slice(0, 3).map(function (x) { return x.msg.replace(/, so it is left out\.$/, ''); }).join('; ') + '.'; },
      fix: 'Load score and CALC numbers run from 0 to 1 (for example 0.45).' },
    { id: 'dates-odd', where: 'Dates', level: 'note',
      when: function (F) {
        var now = F.now.getTime() + 864e5, out = [];
        F.c.reg.fields.forEach(function (fl) { if (fl.type !== 'date') return; var v = F.data.values[fl.name]; if (blank(v)) return; var d = parseISO(v); if (!d) out.push({ fl: fl, v: v, why: 'not a date' }); else if (d.getTime() > now) out.push({ fl: fl, v: v, why: 'in the future' }); else if (d.getFullYear() < 2000) out.push({ fl: fl, v: v, why: 'a long time ago' }); });
        return out.length ? out : null;
      },
      text: function (o) { return list(o.slice(0, 3).map(function (x) { return q(x.v) + ' (' + lc(x.fl.label) + ') looks ' + x.why; })) + '. It may be a typo.'; },
      fix: 'Dates read best as YYYY-MM-DD.' },
    { id: 'weather-swing', where: 'Weather log', level: 'note',
      when: function (F) { return F.wx.swings.length ? F.wx.swings : null; },
      text: function (s) { return 'The load moved ' + fmt(Math.abs(s[0].d)) + ' between week ' + s[0].a.w + ' (' + fmt(s[0].a.battery) + ') and week ' + s[0].b.w + ' (' + fmt(s[0].b.battery) + '). A big swing can be real; it can also be a typo.'; },
      fix: 'If it was real, the note for that week is worth reading again.' },
    { id: 'weather-sky-odd', where: 'Weather log', level: 'note',
      when: function (F) { return F.wx.skyOdd.length ? F.wx.skyOdd : null; },
      text: function (w) { return 'Week ' + w[0].w + ' says the sky was ' + lc(w[0].sky) + ' with a load score of ' + fmt(w[0].battery) + '. Those usually point the other way; it may be real, or one of them may be a slip.'; },
      fix: 'Check that week’s entry.' },
    { id: 'weather-order', where: 'Weather log', level: 'note',
      when: function (F) { return F.wx.outOfOrder ? true : null; },
      text: function () { return 'The weather log dates aren’t in order, so the trend may read backwards.'; },
      fix: 'Put the earliest week first.' },
    { id: 'weather-gap', where: 'Weather log', level: 'note',
      when: function (F) { var ws = F.wx.weeks.map(function (w) { return w.w; }); if (ws.length < 2) return null; var miss = []; for (var k = ws[0] + 1; k < ws[ws.length - 1]; k++) if (ws.indexOf(k) < 0) miss.push(k); return miss.length ? miss : null; },
      text: function (m) { return 'The weather log is missing week ' + list(m.map(String)) + ' between filled-in weeks. The trend jumps over it.'; },
      fix: 'Fill it in from memory if you can, or leave it: a missed week is normal.' },
    { id: 'wp11-rose', where: 'WP-11', level: 'note',
      when: function (F) { return F.w11 && F.w11.rose.length ? F.w11.rose : null; },
      text: function (r) { return 'In ' + plural(r.length, 'settling round') + ', the load reads higher after (' + fmt(r[0].after) + ') than before (' + fmt(r[0].before) + '). The two boxes may be swapped, or that round just didn’t help, which happens.'; },
      fix: 'Check which box is "before".' },
    { id: 'wp11-same-default', where: 'WP-11', level: 'note',
      when: function (F) { return F.w11 && F.w11.same ? F.c.wp11.first : null; },
      text: function (d) { return 'The first and second settling defaults are both ' + q(lc(d)) + '. The second is meant for when the first isn’t available.'; },
      fix: 'Pick a different second default.' },
    { id: 'wp09-who-unmatched', where: 'WP-09', level: 'note',
      when: function (F) { return F.w9 && F.c.wp09.who && F.w9.whoI === undefined ? F.c.wp09.who : null; },
      text: function (w) { return 'WP-09 says the message is ' + q(w) + '’s, which doesn’t match anyone on the road.'; },
      fix: 'Use a name from "Who’s on this road".' }
  ];

  function runChecks(F) {
    var out = [];
    CHECKS.forEach(function (ck) {
      var d;
      try { d = ck.when(F); } catch (e) { d = null; }
      if (!d) return;
      out.push({ id: ck.id, where: ck.where, level: ck.level, text: ck.text(d, F), fix: typeof ck.fix === 'function' ? ck.fix(d, F) : ck.fix });
    });
    out.sort(function (a, b) { return (a.level === 'check' ? 0 : 1) - (b.level === 'check' ? 0 : 1); });
    return out;
  }

  /* ---------- section by section: numbers, small tables, bars and what they suggest */

  function tbl(title, head, rows, widths, note) { return { title: title, head: head, rows: rows, widths: widths || null, note: note || '' }; }
  function bars(title, items, note) { return { title: title, items: items, note: note || '' }; }

  function extras(code, s, F, v) {
    var c = F.c, P = F.P, n = F.n;
    s.tables = []; s.bars = []; s.more = []; s.suggests = []; s.link = linkOf(code);
    if (s.status === 'blank') { s.suggests.push('Nothing to read yet. ' + s.next); return s; }
    if (code === 'WP-01' && F.w1) {
      var w = F.w1, mx = Math.max.apply(null, F.pp.map(function (p) { return p.minutes || 0; }).concat([1]));
      if (w.total) s.bars.push(bars('Logged minutes by person', F.pp.map(function (p) { return { label: p.label, value: p.minutes || 0, max: mx, text: minText(p.minutes || 0) + ' (' + pc(p.share || 0) + ')' }; }), n >= 2 ? 'An even split would be ' + pc(1 / n) + ' each.' : ''));
      if (w.total) s.tables.push(tbl('Who carried which kind of work', ['Person', 'Minutes', 'Share', 'Noticed, not asked', 'Planning items'], F.pp.map(function (p) { return [p.label, String(Math.round(p.minutes || 0)), pc(p.share || 0), minText(p.noticed), String(p.mental)]; }), [1.4, 1, 0.9, 1.3, 1], '"Noticed, not asked" is the work nobody requested. "Planning items" are rows about planning, remembering or keeping track.'));
      if (w.sinks.length) s.tables.push(tbl('The biggest time sinks', ['Job', 'Minutes', 'Share of the week'], w.sinks.slice(0, 3).map(function (x) { return [x.task, String(Math.round(x.min)), pc(x.share)]; }), [2.4, 1, 1.2]));
      if (w.sinks.length) s.more.push('Top time sinks: ' + list(w.sinks.slice(0, 3).map(function (x) { return x.task + ' (' + minText(x.min) + ', ' + pc(x.share) + ')'; })) + '.');
      if (w.noOwner.length) s.more.push('Jobs with no one named: ' + list(w.noOwner.slice(0, 4).map(function (x) { return x.task; })) + '. Their minutes aren’t in the balance yet.');
      if (w.mentalRows.length) s.more.push(plural(w.mentalRows.length, 'row') + ' of ' + w.rows.length + (w.mentalRows.length === 1 ? ' is' : ' are') + ' planning, remembering or keeping track (the mental load)' + (n >= 2 && w.namedMental.length ? ': ' + F.pp.filter(function (p) { return p.mental; }).map(function (p) { return p.label + ' ' + p.mental; }).join(', ') : '') + '.');
      else if (w.rows.length) s.more.push('None of the rows look like planning or remembering. That work is easy to leave off a log; it may be worth adding next time.');
      if (w.everyone) s.more.push(pc(w.everyone / w.total) + ' of the minutes were marked "Everyone" and split evenly.');
      if (w.days) s.more.push('The log covers ' + plural(w.days, 'day') + (w.days < 5 ? ', so it is a partial week; read the balance as rough.' : '.'));
      if (w.handoff) s.more.push('The one handoff that would help the balance most (worked out the CALC-01 way): about ' + C1().f1(w.handoff.hours) + ' hour' + (w.handoff.hours === 1 ? '' : 's') + ' a week from ' + w.handoff.from + ' to ' + w.handoff.to + ', taking balance from ' + fmt(c.wp01.wb) + ' to ' + fmt(w.handoff.after) + '.');
      if (c.wp01.wb != null) s.suggests.push(c.wp01.wb >= 0.7 ? 'The time is shared fairly this week. The next place to look is the planning and remembering, which minutes don’t capture well.' : 'One handoff would do more than a rebuild. Start with the job the busiest person would most like to hand over.');
      if (w.noticedTotal && w.total) s.suggests.push(pc(w.noticedTotal / w.total) + ' of the time was self-started. ' + (w.noticedTotal / w.total >= 0.4 ? 'Some of those jobs probably want a named owner on WP-03.' : 'Most work was asked for, so owners are doing their job.'));
    }
    if (code === 'WP-01' && F.refusals && F.refusals.length) {
      var kinds = {}; F.refusals.forEach(function (r) { var k = r.kind || 'Not sorted'; kinds[k] = (kinds[k] || 0) + 1; });
      s.tables.push(tbl('Kind no’s drafted', ['Kind', 'Fair reason', 'What’s left', 'Offer instead'], F.refusals.map(function (r) { return [r.kind || 'Not sorted', r.ack ? 'Yes' : 'Not yet', r.cap ? 'Yes' : 'Not yet', r.alt ? 'Yes' : 'Not yet']; }), [1.4, 1, 1, 1]));
      var whole = F.refusals.filter(function (r) { return r.ack && r.cap && r.alt; }).length;
      s.more.push(whole + ' of ' + F.refusals.length + ' kind no’s ' + (whole === 1 ? 'has' : 'have') + ' all three parts (why it is fair, what you have left, what you can offer). Kinds: ' + Object.keys(kinds).map(function (k) { return lc(k) + ' ' + kinds[k]; }).join(', ') + '.');
      s.suggests.push(whole === F.refusals.length ? 'You have words ready. The next step is saying one out loud to a small request.' : 'The missing part is usually the offer. A no with an offer lands as care, not rejection.');
    }
    if (code === 'WP-02') {
      var sc = F.bat.scored;
      if (sc.length) s.bars.push(bars(F.solo ? 'Your load score' : 'Load score by person (0 to 1)', sc.map(function (b) { return { label: b.label, value: b.score, max: 1, text: fmt(b.score) + ', ' + b.band.label.toLowerCase() }; }), 'Under 0.30 low load · 0.30 to 0.59 medium · 0.60 and up high.'));
      if (F.bat.full.length) s.tables.push(tbl('What is adding to the ' + (F.solo ? 'load' : 'loads'), ['What fills it', F.solo ? 'Your answer (0 to 4)' : 'Average (0 to 4)', F.solo ? 'Level' : 'Scored 3 or 4 by'],
        F.factors.map(function (l, k) { var a = F.factorAvg[k]; return [l, a == null ? '—' : C1().f1(a), F.solo ? (a == null ? '—' : a >= 3 ? 'High' : a >= 2 ? 'Some' : 'Low') : (F.factorHigh[k].length ? F.factorHigh[k].join(', ') : 'No one')]; }), [2.4, 1.1, 1.8]));
      var best = -1; F.factorAvg.forEach(function (a, i) { if (a != null && (best < 0 || a > F.factorAvg[best])) best = i; });
      if (best >= 0) s.more.push('Highest-scoring stressor: ' + lc(F.factors[best]) + ' (' + C1().f1(F.factorAvg[best]) + ' of 4' + (F.solo ? '' : ' on average') + ').');
      if (!F.solo && sc.length) s.more.push(F.bat.all ? 'The ' + (n === 2 ? 'pair' : F.road === 'coworkers' ? 'team' : 'group') + ' average is ' + fmt(F.bat.avg) + '.' : 'Of the ' + sc.length + ' load scores filled in, the average is ' + fmt(F.bat.avg) + '. The full average waits for everyone.');
      if (F.bat.spread != null) s.more.push('The spread between the highest and the lowest load is ' + fmt(F.bat.spread) + (F.bat.spread >= 0.35 ? ': very different weeks.' : '.'));
      var shared = sc.filter(function (b) { return b.source === 'shared'; });
      if (shared.length) s.more.push(list(lbl(shared)) + ' shared a score rather than the five answers. That is fine; it just means the stressor table can’t include them.');
      if (sc.length) s.suggests.push(F.bat.high.length ? 'Timing matters more than content this week. Hard conversations go better on a day under 0.60.' : 'Conditions are workable. What comes up is probably about the thing itself.');
      if (best >= 0 && F.factorAvg[best] >= 2) s.suggests.push('The biggest lever may be outside the ' + v.tasks + ': ' + lc(F.factors[best]) + '.');
    }
    if (code === 'WP-03' && F.w3) {
      var t3 = F.w3, word = F.road === 'coworkers' ? ' (team roles, not ratings)' : '';
      if (n >= 2) {
        s.tables.push(tbl('Who holds which ' + v.tasks + word, ['Person', 'Owns', 'Helps with', 'Daily or weekly (owned)'], F.pp.map(function (p) { return [p.label, String(p.r), String(p.a), String(p.recurR)]; }), [1.4, 1.1, 1.1, 1.3]));
        var rmax = Math.max.apply(null, F.pp.map(function (p) { return p.r; }).concat([1]));
        s.bars.push(bars('Jobs owned, by person', F.pp.map(function (p) { return { label: p.label, value: p.r, max: rmax, text: plural(p.r, v.task, v.tasks) }; })));
      }
      if (t3.gaps.length) s.tables.push(tbl(cap(v.tasks) + ' that need a look', ['Job', 'How often', 'What’s missing'], t3.gaps.slice(0, 12).map(function (r) { return [r.task, r.freq || '—', !r.rRaw && !r.aRaw ? 'No owner yet' : !r.rRaw ? 'A helper, but no owner' : 'Several names or "Everyone"']; }), [2.4, 1.1, 1.6]));
      s.more.push('Ownership rate: ' + c.wp03.owned + ' of ' + c.wp03.tasks + ' ' + v.tasks + ' have an owner (' + (c.wp03.tasks ? pc(c.wp03.owned / c.wp03.tasks) : '0%') + ').');
      if (t3.multi.length) s.more.push('Too many owners: ' + list(t3.multi.slice(0, 4).map(function (r) { return r.task; })) + '.');
      s.more.push('How often: ' + t3.recurring.length + ' daily or weekly, ' + t3.occasional.length + ' monthly or as needed' + (t3.rows.length - t3.recurring.length - t3.occasional.length ? ', ' + (t3.rows.length - t3.recurring.length - t3.occasional.length) + ' not marked' : '') + '.');
      if (F.road === 'coworkers') s.more.push(t3.ci ? plural(t3.ci, 'row') + (t3.ci === 1 ? ' uses' : ' use') + ' Consulted or Informed, which is where a group belongs.' : 'No rows use Consulted or Informed yet. They are the right place for "the whole team".');
      s.suggests.push(c.wp03.oc != null && c.wp03.oc >= 0.8 ? 'Ownership is mostly clear, so repeat slips are more likely about capacity or timing than clarity.' : 'The unowned ' + v.tasks + ' are the quickest win in the whole report: one sitting, one name each.');
    }
    if (code === 'WP-04' && F.w4) {
      var w4 = F.w4;
      if (w4.raw.length) s.tables.push(tbl('Week by week', ['Task', 'Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Times'], w4.raw.map(function (r) { return [r.task].concat(r.weeks.map(function (x) { return x ? '•' : ''; })).concat([String(r.times)]); }), [2.6, 0.6, 0.6, 0.6, 0.6, 0.7], '• = it slipped that week. 3 or 4 weeks is a pattern.'));
      if (w4.raw.length) s.bars.push(bars('Slips per week', w4.weekTotals.map(function (t, i) { return { label: 'Week ' + (i + 1), value: t, max: Math.max(1, w4.raw.length), text: plural(t, 'slip') }; })));
      if (w4.cl.length) s.tables.push(tbl('The three kinds of gap', ['Kind of gap', 'Count', 'Jobs'], [['Structural gap', 'Structural gap'], ['Capacity issue', 'Capacity issue'], ['One-off, no action', 'One-off']].map(function (k) { var j = w4.cl.filter(function (x) { return x.kind === k[0]; }); return [k[1], String(j.length), j.length ? j.map(function (x) { return x.task; }).join(', ') : '—']; }), [1.4, 0.7, 2.6]));
      var wt = w4.weekTotals, trend = wt[3] - wt[0];
      if (w4.raw.length) s.more.push('Slips per week: ' + wt.join(', ') + (trend >= 2 ? ' (rising through the month).' : trend <= -2 ? ' (falling through the month).' : '.'));
      s.more.push(plural(c.wp04.patterns.length, 'pattern') + ' (3 or 4 weeks), ' + c.wp04.twice.length + ' twice, ' + w4.raw.filter(function (r) { return r.times === 1; }).length + ' once.');
      if (F.w3) { var m3 = w4.raw.filter(function (r) { return r.times >= 2 && F.w3.gaps.some(function (g) { return sameTask(g.task, r.task); }); }); if (m3.length) s.more.push('Also without a clear owner on WP-03: ' + list(m3.map(function (r) { return r.task; })) + '.'); }
      if (w4.unsorted.length) s.more.push('Patterns not yet sorted: ' + list(w4.unsorted.map(function (p) { return p.task; })) + '.');
      s.suggests.push(c.wp04.structural >= c.wp04.capacity ? 'Most gaps can be fixed on paper: owners and handoffs, not effort.' : 'Capacity is the bigger issue: something may need to come off the list, not be tried harder.');
    }
    if (code === 'WP-09' && c.wp09 && c.wp09.filled) {
      var it9 = section(schemaFor('WP-09'), 'filter').items;
      s.tables.push(tbl('The four checks', ['Check', 'Answer'], it9.map(function (it) { return [it.label, V(F.data, 'wp09.filter.' + it.id) || 'Not answered']; }), [3.2, 1]));
      if (F.w9) {
        s.more.push('The message runs to ' + plural(F.w9.words, 'word') + (F.w9.words > 60 ? ': long for one message. Could it be one thing?' : '.'));
        if (F.w9.absolutes) s.more.push('It uses "always" or "never". Swapping in the one time it happened makes it easier to hear.');
        if (c.wp09.ask && !F.w9.askQ) s.more.push('The ask reads as a statement. “Could you ___ by ___?” is easier to say yes to.');
      }
      s.suggests.push(c.wp09.advice === 'pause' ? 'This one wants a pause before it is sent.' : c.wp09.checks < 4 ? 'Answer the ' + plural(4 - c.wp09.checks, 'check') + ' still open before you send it. ' + (c.wp09.parts === 3 ? 'The message itself is written.' : 'Finishing the missing part matters too.') : c.wp09.parts === 3 ? 'This message is ready to send, at a calm time.' : 'Finishing the missing part will do more than polishing the rest.');
    }
    if (code === 'WP-11' && c.wp11 && c.wp11.filled) {
      if (F.w11 && F.w11.re.length) s.tables.push(tbl('Coming back', ['Time', 'What I did', 'Before', 'After', 'Change'], F.w11.re.map(function (r) { return [r.time || '—', r.tactic || '—', r.before != null ? fmt(r.before) : '—', r.after != null ? fmt(r.after) : '—', r.before != null && r.after != null ? (r.after <= r.before ? '−' : '+') + fmt(Math.abs(r.after - r.before)) : '—']; }), [0.8, 2.2, 0.8, 0.8, 0.8]));
      if (F.w11 && F.w11.avgDrop != null) s.more.push('On average the load ' + (F.w11.avgDrop >= 0 ? 'dropped by ' : 'rose by ') + fmt(Math.abs(F.w11.avgDrop)) + ' after settling.');
      if (n >= 2) s.more.push('Pause lines written: ' + (F.w11 ? F.w11.lines : 0) + ' of ' + n + '.');
      if (c.wp11.triggers.length) s.more.push('What tends to start it: ' + list(c.wp11.triggers.map(function (t) { return t.trigger; }).filter(Boolean)) + '.');
      if (c.wp11.ret === 'later' && !c.wp11.resume) s.more.push('The last reading says to put the conversation off, and no time to pick it back up is written yet.');
      s.suggests.push(c.wp11.first && c.wp11.second ? 'The kit is ready. The practice is trying it once on a calm day, so it feels normal on a hard one.' : 'The kit is half-made. Choosing the second default is the step that makes it work.');
    }
    if (code === 'WP-13' && F.w13) {
      var w13 = F.w13;
      s.tables.push(tbl('Check-ins by person', ['Person', 'Check-ins', 'High / med / low', 'Thanks', 'Frictions'], F.pp.map(function (p) { return [p.label, p.checkins + ' of 7', p.loads.High + ' / ' + p.loads.Medium + ' / ' + p.loads.Low, String(p.thanks), String(p.friction)]; }), [1.4, 1, 1.3, 0.8, 0.9]));
      s.bars.push(bars('Check-ins by day', w13.byDay.map(function (d) { return { label: d.day, value: d.n, max: n, text: d.n + ' of ' + n + (d.high ? ', ' + d.high + ' high' : '') + (d.friction ? ', ' + plural(d.friction, 'friction') : '') }; })));
      s.more.push(w13.early ? 'You’ve started: ' + plural(w13.entries, 'check-in') + ' so far, on ' + plural(w13.daysWith, 'day') + '. A few more will show a pattern.' : 'Consistency: ' + w13.entries + ' of ' + w13.possible + ' possible check-ins (' + pc(w13.rate) + '), on ' + w13.daysWith + ' of 7 days.');
      if (n >= 2 && w13.skipped.length) s.more.push('No check-ins yet from ' + list(lbl(w13.skipped)) + '.');
      if (w13.frictionRows.length) s.more.push(plural(w13.frictionRows.length, 'friction note') + ', ' + w13.frictionOnHigh + ' of them on a high-load day.');
      if (w13.repeatFriction.length) s.more.push('A friction that repeats: ' + q(short(w13.repeatFriction[0].text, 50)) + ' (' + w13.repeatFriction[0].times + ' times).');
      if (w13.repeatAsk.length) s.more.push('An ask that repeats: ' + q(short(w13.repeatAsk[0].text, 50)) + ' (' + w13.repeatAsk[0].times + ' times).');
      if (w13.empty.length) s.more.push(plural(w13.empty.length, 'check-in') + ' had a load but no notes.');
      s.suggests.push(w13.early ? 'Keep going for a few more days, at the same time each day. Then the pattern will show.' : w13.rate >= 0.6 ? 'The habit is holding. Skim the week for anything that came up more than twice and move it on.' : 'The check-in may be too long or at the wrong time. Shorter and attached to an existing routine usually fixes it.');
    }
    return s;
  }

  function notesDetail(F, v) {
    var c = F.c, n = c.notes, s = { code: 'NOTES', name: 'Your wiring and your weather', title: 'Self-notes: the Wiring Card and the weather log', entered: [], shows: [], doesnt: 'It can’t tell you why a week went the way it did, and the Wiring Card is not a label or a diagnosis. It is a note about how words reach ' + (F.solo ? 'you' : F.notesLabel) + '.', next: '', status: n.wiringLines || n.weather.length ? 'filled' : 'blank', ask: '' };
    extras('NOTES', s, F, v); s.link = linkOf('wiring');
    // on a shared road, everyone's own card and log, each under their own name
    var mine = F.solo ? [n] : (c.notesBy || [n]).filter(function (nb) { return nb.wiringLines || nb.weather.length; });
    var whose = F.solo ? 'your' : F.notesLabel + '\u2019s';
    if (!F.solo && mine.length) s.status = 'filled';
    if (!F.solo && mine.length) s.entered.push(['Whose notes', list(mine.map(function (nb) { return nb.label; }))]);
    if (!F.solo && mine.length) s.shows.push('Each card is that person\u2019s own, about themselves. If you share this report, everyone on it will see these notes.');
    mine.forEach(function (nb) {
      nb.wiring.filter(function (l) { return l.picked.length; }).forEach(function (l) { s.entered.push([(F.solo ? '' : nb.label + ': ') + l.q, l.picked.join('; ')]); });
      if (!F.solo && nb !== n && nb.weather.length) s.tables.push(tbl(nb.label + '\u2019s weather log', ['Week', 'Battery', 'Sky', 'Pressure', 'Sleep'], nb.weather.map(function (w) { return ['Week ' + w.w + (w.date ? ' (' + w.date + ')' : ''), w.battery != null ? fmt(w.battery) : '—', w.sky || '—', w.pressure || '—', w.sleep || '—']; }), [1.6, 0.8, 1, 1, 1.2]));
    });
    if (n.weather.length) {
      s.tables.unshift(tbl(F.solo ? 'The weather log' : F.notesLabel + '\u2019s weather log', ['Week', 'Battery', 'Sky', 'Pressure', 'Sleep'], n.weather.map(function (w) { return ['Week ' + w.w + (w.date ? ' (' + w.date + ')' : ''), w.battery != null ? fmt(w.battery) : '—', w.sky || '—', w.pressure || '—', w.sleep || '—']; }), [1.6, 0.8, 1, 1, 1.2]));
      if (F.wx.bat.length) s.bars.push(bars(F.solo ? 'Load score, week by week' : F.notesLabel + '\u2019s load score, week by week', F.wx.bat.map(function (w) { return { label: 'Week ' + w.w, value: w.battery, max: 1, text: fmt(w.battery) }; })));
      if (F.wx.trend != null) s.shows.push('Across ' + whose + ' weather log, the load went from ' + fmt(F.wx.first.battery) + ' to ' + fmt(F.wx.last.battery) + (Math.abs(F.wx.trend) < 0.05 ? ': holding steady.' : F.wx.trend < 0 ? ': lighter.' : ': heavier.'));
      var skies = {}; n.weather.forEach(function (w) { if (w.sky) skies[w.sky] = (skies[w.sky] || 0) + 1; });
      if (Object.keys(skies).length) s.shows.push('Sky: ' + Object.keys(skies).map(function (k) { return lc(k) + ' ' + skies[k]; }).join(', ') + '.');
      if (F.wx.shortAvg != null && F.wx.restAvg != null) s.shows.push('Short-sleep weeks averaged ' + fmt(F.wx.shortAvg) + ', rested weeks ' + fmt(F.wx.restAvg) + '.');
      if (F.wx.heavyAvg != null && F.wx.lightAvg != null) s.shows.push('Heavy-pressure weeks averaged ' + fmt(F.wx.heavyAvg) + ', lighter weeks ' + fmt(F.wx.lightAvg) + '.');
      var notes = n.weather.filter(function (w) { return w.note; });
      if (notes.length) s.shows.push((F.solo ? 'In your words: ' : 'In ' + F.notesLabel + '\u2019s words: ') + notes.map(function (w) { return 'week ' + w.w + ', ' + q(w.note); }).join('; ') + '.');
      if (F.notesWho != null && F.c.battery[F.notesWho].score != null && F.wx.last) s.shows.push('The latest weekly reading (' + fmt(F.wx.last.battery) + ') next to the WP-02 score (' + fmt(F.c.battery[F.notesWho].score) + ').');
    }
    mine.forEach(function (nb) { if (nb.wiringLines) s.shows.push((F.solo ? '' : nb.label + ': ') + nb.wiringLines + ' of 9 Wiring Card lines filled in.'); });
    s.card = explainCard(c);
    if (!F.solo) mine.forEach(function (nb) { if (nb !== n) { var cd = explainCard({ notes: nb }); if (cd) s.shows.push('A note ' + nb.label + ' could share: ' + cd); } });
    if (!F.solo && s.card) s.card = F.notesLabel + ': ' + s.card;
    s.suggests = [];
    if (F.wx.bat.length >= 2) s.suggests.push(F.wx.trend > 0.05 ? 'The weeks are getting heavier. It suggests looking at what changed, kindly.' : 'The weeks are steady or lighter. Something is helping; worth naming it.');
    if (n.wiringLines) s.suggests.push('The card is enough to share. People can only send things the way you receive them if they know how that is.');
    s.next = !n.wiringLines ? 'Fill in the Wiring Card: nine short lines about how words reach you.' : n.weather.length < 2 ? 'Log the weather once a week for a month: the sky, the pressure, your sleep.' : 'Share the note built from your card with one person this week.';
    if (s.status === 'blank') s.suggests = ['Nothing to read yet. ' + s.next];
    return s;
  }

  function readyDetail(F, v) {
    var r = F.c.ready, s = { code: 'READY', name: 'Ready for your report', title: 'In your own words', entered: [], shows: [], suggests: [], tables: [], bars: [], more: [],
      doesnt: 'It can’t weigh your words against the numbers; they are yours, and they stand as written.', next: '', status: r.going || r.focus || r.when || r.fair ? 'filled' : 'blank', ask: '', link: linkOf('READY') };
    if (r.going) s.entered.push(['Already going well', r.going]);
    if (r.focus) s.entered.push(['What you want help with', r.focus]);
    if (r.when) s.entered.push(['When you’ll read it', r.when]);
    s.entered.push(['Read as a picture, not a verdict', r.fair ? 'Ticked' : 'Not ticked']);
    if (F.c.who.context) s.entered.push([F.solo ? 'What you’d like to understand' : 'What brings you here', F.c.who.context]);
    if (r.going) s.shows.push('Start from this: ' + q(short(r.going, 140)) + ' It belongs in the "strengths to protect" list.');
    if (r.focus) s.shows.push('Your question for the report: ' + q(short(r.focus, 140)));
    if (!r.fair && s.status === 'filled') s.shows.push('The "not a verdict" box isn’t ticked. Worth agreeing on out loud before reading together.');
    s.suggests.push(r.when ? 'You’ve picked a time to read it. Keep it, and check your load scores first.' : 'Pick a calm time to read it, ' + (F.solo ? 'on your own' : 'together') + '.');
    s.next = r.focus ? 'Read the sections that speak to your question first, then stop.' : 'Before reading, write one question you want the report to help with.';
    if (s.status === 'blank') s.suggests = ['Nothing written here yet. ' + s.next];
    return s;
  }

  /* ---------- recommendations and the plan */

  var HORIZON = { now: 0, week: 1, month: 2 };
  function recommend(fired, checks, F, v, sections) {
    var recs = fired.filter(function (r) { return r.rec; }).map(function (r) { return r.rec; });
    var fixes = checks.filter(function (x) { return x.level === 'check'; });
    // Checking a number is housekeeping: it goes after every real finding, never above one.
    var tidyRec = fixes.length ? ({ h: 'now', pri: 0.5, title: 'Check a few numbers', why: plural(fixes.length, 'entry', 'entries') + ' may be typos (see "Worth a second look"), and they touch the numbers below.', first: fixes[0].fix, script: '', link: linkOf('READY'), working: 'The next report has nothing marked "worth fixing".', from: 'checks' }) : null;
    // a sheet the road marks optional isn't asked for when it is blank
    sections.filter(function (s) { return s.status === 'blank' && !s.optional; }).forEach(function (s, i) {
      recs.push({ h: i < 1 ? 'week' : 'month', pri: 2 - i * 0.1, title: 'Fill in ' + s.code + ', ' + s.name, why: s.code + ' was left blank, so the report can’t say anything about it yet.', first: s.next, script: '', link: linkOf(s.code), working: 'The next report has a section for it.', from: 'blank:' + s.code,
        plan: { title: s.name, wp: s.code, do: s.next, pillar: '' } });
    });
    var seen = {};
    recs = recs.filter(function (r) { var k = r.title.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; });
    recs.sort(function (a, b) { return b.pri - a.pri || HORIZON[a.h] - HORIZON[b.h]; });
    var caps = { now: 3, week: 4, month: 5 }, out = { now: [], week: [], month: [] };
    recs.forEach(function (r) {
      var h = r.h;
      while (h && out[h].length >= caps[h]) h = h === 'now' ? 'week' : h === 'week' ? 'month' : null;
      if (h) out[h].push(r);
    });
    ['now', 'week', 'month'].forEach(function (h) { out[h].sort(function (a, b) { return b.pri - a.pri; }); });
    // Always listed, always last: at the end of "now" if there is room, otherwise at the end of "this week".
    if (tidyRec) { if (out.now.length < caps.now) out.now.push(tidyRec); else { tidyRec.h = 'week'; out.week.push(tidyRec); } }
    return out;
  }

  // A report about two or more people shouldn't be mostly about one of them. When the findings name
  // one person far more than another, add one step about the other person's view and unseen work.
  function otherView(recs, fired, F, v) {
    if (F.solo || F.n < 2) return;
    var text = fired.map(function (r) { return [r.title, r.finding, r.rec ? r.rec.first + ' ' + r.rec.title : ''].join(' '); }).join(' ');
    function count(lab) { var re = new RegExp('(^|[^A-Za-z\u00C0-\u024F])' + lab.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z\u00C0-\u024F])', 'g'); return (text.match(re) || []).length; }
    var counts = F.pp.map(function (p) { return { p: p, k: count(p.label) }; }).sort(function (a, b) { return b.k - a.k; });
    var most = counts[0], least = counts[counts.length - 1];
    if (most.k < 3 || least.k * 2 > most.k) return;
    var nm = least.p.label;
    var rec = { h: 'week', pri: 7.5, pillar: 'I', from: 'other-view', title: 'Hear ' + nm + '\u2019s side of the week',
      why: 'Most of what this report picks out is about ' + most.p.label + '. ' + nm + '\u2019s view counts just as much: the planning, noticing or worrying they do may simply not be on these pages yet.',
      first: 'Ask ' + nm + ' one open question, and only listen: what did you carry this week that isn\u2019t written here?',
      script: '\u201cWhat did this week look like from where you sit? What isn\u2019t on these pages?\u201d', link: linkOf('WP-01'),
      working: nm + ' adds at least one thing to the next log that wasn\u2019t there before.',
      plan: { title: 'Hear ' + nm + '\u2019s side', wp: 'Talk, then WP-01', do: 'Ask ' + nm + ' what they carried that the pages don\u2019t show, and add it to next week\u2019s log under their name.', pillar: 'I' } };
    recs.week.unshift(rec);
    if (recs.week.length > 5) recs.week.pop();
  }

  function plan2(recs, c, v, sp) {
    var R = c.R, weeks = [], seen = {};
    function push(w) { var k = w.title.toLowerCase(); if (seen[k]) return; seen[k] = 1; weeks.push(w); }
    // A road variant that starts with reading (Partners, fine but flat) keeps that as week 1
    var w0 = sp && sp.variant && sp.weeks && sp.weeks[0];
    if (w0 && !(w0[1] && w0[1].length)) push({ title: w0[0], wp: (w0[2] || []).map(function (l) { return l && l[0]; }).filter(Boolean).join(', ') || 'Read', do: w0[3], pillar: '' });
    recs.now.concat(recs.week, recs.month).forEach(function (r) {
      if (weeks.length >= 5) return;
      if (r.from === 'checks' || r.from === 'state-not-now') return;
      var code = r.link ? (/^(WP-\d+|CALC-01)/.exec(r.link[0]) || [r.link[0]])[0] : 'Talk';
      var p = r.plan || { title: r.title, wp: code, do: r.first, pillar: r.pillar || '' };
      push({ title: p.title, wp: p.wp, do: p.do, pillar: p.pillar || r.pillar || '', from: r.title });
    });
    weeks.forEach(function (w) { w.wp.split(', ').forEach(function (x) { seen[x] = true; }); });
    (sp && sp.weeks || []).forEach(function (w) {
      if (weeks.length >= 4) return;
      var wps = (w[1] || []).join(', ');
      if (seen[w[0].toLowerCase()] || (w[1] && w[1].length && w[1].every(function (x) { return seen[x]; }))) return;
      push({ title: w[0], wp: wps || 'Talk', do: w[3], pillar: '' });
    });
    while (weeks.length < 3) push({ title: weeks.length ? 'Keep the rhythm' : 'Start small', wp: 'WP-02', do: 'Keep what is working, and notice one thing you appreciated each day.', pillar: 'V' });
    weeks = weeks.slice(0, 5);
    weeks.push({ title: 'Look back', wp: 'Full path report', do: 'Fill in the pages again, make a new report, and compare it with this one. Name one thing that changed, one that didn’t, and one to keep practicing.', pillar: 'I' });
    return weeks.map(function (w, i) { return { week: i + 1, title: w.title, wp: w.wp, do: w.do, pillar: w.pillar, from: w.from || '' }; });
  }

  /* ---------- a kind page for each person */

  function personViews(F, v) {
    if (F.solo) return null;
    var c = F.c, R = F.R;
    return F.pp.map(function (p) {
      var rows = [], strengths = [], help = [], b = p.battery, starter = '';
      if (c.on['WP-01'] && !R.refusalsOnly) rows.push(['Logged time (WP-01)', F.w1 && F.w1.total ? (p.minutes ? minText(p.minutes) + ', ' + pc(p.share) + ' of the logged week' + (p.noticed ? '; ' + minText(p.noticed) + ' noticed and handled without being asked' : '') + (p.mental ? '; ' + plural(p.mental, 'planning item') : '') : 'No rows under this name') : 'WP-01 not filled in']);
      rows.push(['Load score (WP-02)', b.score != null ? fmt(b.score) + ', ' + b.band.label.toLowerCase() + (p.top.length ? '. Scored highest: ' + list(p.top.slice(0, 2).map(function (x) { return lc(x.l); })) : '') : b.answered ? b.answered + ' of 5 answered' : 'Not filled in']);
      if (c.on['WP-03']) rows.push([F.road === 'coworkers' ? 'Team roles (WP-03)' : 'Owns (WP-03)', F.w3 ? 'Owns ' + p.r + ', helps with ' + p.a + (p.recurR ? ' (' + p.recurR + ' daily or weekly)' : '') : 'WP-03 not filled in']);
      if (c.on['WP-13']) rows.push(['Check-ins (WP-13)', F.w13 ? p.checkins + ' of 7 days' + (p.checkins ? '; ' + p.loads.High + ' high, ' + p.loads.Medium + ' medium, ' + p.loads.Low + ' low; ' + plural(p.thanks, 'thanks', 'thanks') + ' written' : '') : 'WP-13 not filled in']);
      if (c.on['WP-11']) rows.push(['Pause line (WP-11)', c.wp11 && c.wp11.lines[p.i] ? q(c.wp11.lines[p.i]) : 'Not written yet']);
      // their own words from WP-02, on their own page only (and only because they wrote it in the file)
      if (b.note) rows.push(['What ' + p.label + ' wanted to name first (WP-02, their own words)', q(b.note)]);
      // strengths: what this person brings
      if (p.thanks >= 2) strengths.push('Wrote ' + p.thanks + ' appreciations in the check-ins: keeps thanks flowing.');
      if (p.noticed >= 30) strengths.push('Noticed and handled ' + minText(p.noticed) + ' of work nobody asked for.');
      if (p.mental >= 2) strengths.push('Carries planning and remembering (' + plural(p.mental, 'item') + ').');
      if (p.ra >= 2) strengths.push('Sees ' + plural(p.ra, v.task, v.tasks) + ' through from doing to following up.');
      else if (p.r >= 2) strengths.push('Clearly named on ' + plural(p.r, v.task, v.tasks) + '.');
      if (p.a >= 2 && p.ra < p.a) strengths.push('Keeps an eye on ' + plural(p.a - p.ra, v.task, v.tasks) + ' that others do.');
      if (b.score != null && b.band.key === 'low') strengths.push('Load in the low band: steady ground for the harder talks this week.');
      if (p.checkins >= 5) strengths.push('Checked in on ' + p.checkins + ' of 7 days.');
      if (p.pause) strengths.push('Has a pause line ready.');
      if (b.source === 'shared') strengths.push('Shared a load score, which helps everyone pick the timing.');
      if (!strengths.length) strengths.push(p.anything ? 'Took part in the pages. That is where it starts.' : 'Is on this road. Their pages are theirs to fill in, when and if they want to.');
      // what might help
      if (b.band && b.band.key === 'high') help.push('Fewer decisions this week, and a named time to pick up any hard conversation.');
      if (p.top.some(function (x) { return x.k === 0; })) help.push('Protecting sleep this week, which counts as real work on the setup.');
      if (p.top.some(function (x) { return x.k === 4; })) help.push('One deadline or commitment moved before it arrives.');
      if (F.w3 && p.r >= 3 && p.r / Math.max(1, sumOf(F.pp.map(function (x) { return x.r; }))) > 1 / F.n + 0.15) help.push('Handing one ' + v.task + ' to someone else, or naming a backup.');
      if (p.noticed >= 60) help.push('Having the unasked-for work said out loud and thanked.');
      if (F.w13 && p.checkins < 3) help.push('A shorter check-in, even one line.');
      if (c.on['WP-11'] && !p.pause) help.push('A pause line written on a calm day.');
      if (b.score == null && !b.answered) help.push('Filling in their own battery page, only if they want to.');
      if (!help.length) help.push('More of the same: what they are doing seems to be working.');
      // one conversation starter, chosen for this person
      var T = v.task, Ts = v.tasks;
      if (b.band && b.band.key === 'high') starter = 'What would make this week feel lighter for you, even a little?';
      else if (p.noticed >= 60) starter = 'What do you do around ' + (F.road === 'coworkers' ? 'the team' : 'here') + ' that you think nobody notices?';
      else if (F.w3 && p.r >= 3) starter = 'Which of your ' + Ts + ' would you most like to hand over or share?';
      else if (p.mental >= 2) starter = 'What are you keeping track of in your head that we could write down together?';
      else if (F.w13 && p.checkins < 3) starter = 'What would make a 90-second daily check-in easy for you to keep?';
      else if (p.thanks >= 2) starter = 'What has felt good to notice this week?';
      else starter = 'What is one thing that is working for you right now, and one small thing that would help?';
      return { i: p.i, label: p.label, rows: rows, strengths: strengths.slice(0, 4), help: help.slice(0, 3), starter: starter, note: b.note || '' };
    });
  }

  /* ---------- the Individual road: wiring, patterns and conditions */

  function selfDiscovery(F, v) {
    if (!F.solo) return null;
    var c = F.c, b = c.battery[0], W = F.wiring, wiring = [], patterns = [], conditions = [], sorting = [];
    c.notes.wiring.filter(function (l) { return l.picked.length; }).forEach(function (l) { wiring.push(l.q + ': ' + l.picked.join(', ') + '.'); });
    if (!wiring.length) wiring.push('Not written down yet. The Wiring Card (nine short lines) is where this layer lives.');
    if (c.wp11 && c.wp11.triggers.length) patterns.push('What tends to start it: ' + list(c.wp11.triggers.map(function (t) { return t.trigger + (t.body ? ' (felt first in: ' + lc(t.body) + ')' : ''); }).filter(Boolean)) + '.');
    if (c.wp09 && c.wp09.pattern) patterns.push('On WP-09 you said you may be answering an older pattern, not just the words in front of you.');
    if (F.wx.weeks.length) { var skies = {}; F.wx.weeks.forEach(function (w) { if (w.sky) skies[w.sky] = (skies[w.sky] || 0) + 1; }); var top = Object.keys(skies).sort(function (a, b2) { return skies[b2] - skies[a]; })[0]; if (top && skies[top] >= 2) patterns.push('The sky read ' + lc(top) + ' in ' + skies[top] + ' of ' + F.wx.weeks.length + ' logged weeks.'); }
    if (F.refusals && F.refusals.length) patterns.push('Your kind no’s are mostly ' + lc(F.refusals[0].kind || 'unsorted') + ': that is the request you most need words for.');
    if (!patterns.length) patterns.push('Not enough logged yet to see a pattern. Four weekly weather check-ins and one WP-09 are plenty.');
    if (b.score != null) conditions.push('Load score ' + fmt(b.score) + ' (' + b.band.label.toLowerCase() + ')' + (F.pp[0].top.length ? ', driven most by ' + list(F.pp[0].top.slice(0, 2).map(function (x) { return lc(x.l); })) : '') + '.');
    if (F.wx.last) conditions.push('Latest weather: ' + [F.wx.last.sky && 'sky ' + lc(F.wx.last.sky), F.wx.last.pressure && 'pressure ' + lc(F.wx.last.pressure), F.wx.last.sleep && lc(F.wx.last.sleep)].filter(Boolean).join(', ') + '.');
    if (F.wx.shortAvg != null && F.wx.restAvg != null) conditions.push('Short-sleep weeks read ' + fmt(F.wx.shortAvg) + ' against ' + fmt(F.wx.restAvg) + ' when rested.');
    if (c.calc.state) conditions.push('Step zero today: ' + lc(c.calc.state) + '.');
    if (!conditions.length) conditions.push('Not filled in yet. One minute with WP-02 is the quickest way in.');
    sorting.push('If it shows up whatever the week, it is probably wiring: work with it, and tell people about it.');
    sorting.push('If it shows up after the same trigger, it is probably a pattern: plan around it ahead of time.');
    sorting.push('If it shows up on short-sleep or heavy weeks, it is probably conditions: look after the conditions first.');
    var scripts = [];
    if (W.quiet && W.quiet.length) scripts.push('“If I go quiet, it usually means ' + lc(W.quiet[0]).replace(/^i’m/, 'I’m') + '. It isn’t about you.”');
    if (W.ask && W.ask.length) scripts.push('“Things land best for me as ' + lc(W.ask[0]) + '.”');
    if (W.time && W.time.length) scripts.push('“Can I have ' + lc(W.time[0]) + ' to answer? I want to answer properly.”');
    scripts.push('“I’m at about ' + (b.score != null ? fmt(b.score) : 'a medium load') + ' today. Can we pick this up at a set time?”');
    if (c.wp11 && c.wp11.lines[0]) scripts.push(q(c.wp11.lines[0]));
    return {
      intro: 'Three layers help sort out what is going on inside you. Wiring is how you are built to send and receive: it stays fairly steady. Patterns are what repeats: the same trigger, the same reaction. Conditions are this week’s weather: load score, sleep and pressure. Most hard moments are a mix, and naming the layer tells you what to do about it.',
      layers: [['Wiring (steady)', wiring], ['Patterns (repeat)', patterns], ['Conditions (this week)', conditions]],
      sorting: sorting,
      explain: { to: c.who.others, card: explainCard(c), scripts: scripts.slice(0, 5) },
      links: [linkOf('know'), linkOf('wiring'), linkOf('wired'), linkOf('weather')]
    };
  }

  /* ---------- the Five Pillars, expanded */

  function pillars2(pv, F, fired, v) {
    var c = F.c, k = c.calc, byP = {};
    fired.forEach(function (r) { (byP[r.pillar] = byP[r.pillar] || []).push(r); });
    var hb = highestBat(F), heavy = heaviest(F);
    var D = {
      I: { shows: F.w1 && F.w1.total ? minText(F.w1.total) + ' logged across ' + plural(F.n, 'person', 'people') + '; balance ' + (c.wp01.wb != null ? fmt(c.wp01.wb) : 'not worked out') + '; ' + plural(F.w1.mentalRows.length, 'planning item') + '; ' + pc(F.w1.noticedTotal / F.w1.total) + ' noticed without being asked.' : F.solo ? (c.battery[0].score != null ? 'Load score ' + fmt(c.battery[0].score) + '; ' : '') + plural(F.wx.weeks.length, 'week') + ' of the weather log.' : 'WP-01 isn’t filled in, so the load isn’t on the page yet.',
        inYou: F.w1 && F.w1.mentalRows.length ? 'Notice the planning and remembering you carry. It counts, even when it only takes two minutes to do.' : F.solo ? 'Write down everything you carried this week, including the parts nobody sees. It is usually more than you think.' : null,
        between: heavy && c.wp01 && c.wp01.wb != null && c.wp01.wb < 0.7 ? 'Read the log together, without discussing it until the week is done. ' + heavy.label + '’s ' + pc(heavy.share) + ' is a fact about the week, not about anyone.' : null,
        practice: F.solo ? 'Once a week, list what you carried, and circle one thing you could put down.' : 'Log one ordinary week on WP-01 every month, and read it together.' },
      II: { shows: F.w3 ? 'Ownership ' + (c.wp03.oc != null ? fmt(c.wp03.oc) : 'not worked out') + ' (' + c.wp03.owned + ' of ' + c.wp03.tasks + ' with an owner); ' + plural(F.w3.gaps.length, 'job') + ' need a look' + (c.wp04 && c.wp04.classified.length ? '; ' + c.wp04.structural + ' structural gaps this month.' : '.') : F.solo ? (c.wp11 && (c.wp11.first || c.wp11.second) ? 'Settling defaults chosen: ' + list([c.wp11.first, c.wp11.second].filter(Boolean).map(lc)) + '.' : 'No settling defaults chosen yet.') : 'WP-03 isn’t filled in, so owners aren’t on the page yet.',
        inYou: F.solo ? 'When something slips, ask "what would make this easier next time?" before "what is wrong with me?"' : 'When a job slips, treat it as a setup question first: who owns it, and when is the handoff?',
        between: F.w3 && F.w3.gaps.length ? 'Give ' + q(F.w3.gaps[0].task) + ' one owner. One owner per job does more than any reminder.' : null,
        practice: F.solo ? 'Redesign one routine this month instead of trying harder at it.' : 'One owner per job, written down, and checked once a month on WP-04.' },
      III: { shows: F.bat.scored.length ? (F.solo ? 'Load score ' + fmt(F.bat.scored[0].score) : 'Load scores: ' + F.bat.scored.map(function (b) { return b.label + ' ' + fmt(b.score); }).join(', ')) + (F.w11 && F.w11.avgDrop != null ? '; settling moved it by ' + fmt(F.w11.avgDrop) + ' on average' : '') + (F.wx.trend != null ? '; weather trend ' + (F.wx.trend > 0 ? '+' : '') + fmt(F.wx.trend) : '') + '.' : 'No load scores yet.',
        inYou: F.pp[0] && F.solo && F.pp[0].top.length ? 'Your load comes most from ' + lc(F.pp[0].top[0].l) + '. Check it before you judge a moment.' : 'Check your number before you judge a moment, yours or anyone else’s.',
        between: hb && !F.solo && hb.battery.score >= 0.5 ? 'Let the person with the highest load (' + hb.label + ', ' + fmt(hb.battery.score) + ') choose the timing of the next hard talk.' : null,
        practice: 'Say your number before any hard talk. At 0.60 or above, name a time instead.' },
      IV: { shows: [k.rf != null ? 'Retuning ' + fmt(k.rf) + ' (' + k.retunes + ' of ' + k.friction + ')' : '', c.wp09 && c.wp09.filled ? 'WP-09: ' + c.wp09.parts + ' of 3 parts written' : '', c.notes.wiringLines ? 'Wiring Card: ' + c.notes.wiringLines + ' of 9 lines' : ''].filter(Boolean).join('; ') + '.',
        inYou: F.wiring.receive && F.wiring.receive.length ? 'You take things in best ' + lc(F.wiring.receive[0]) + '. Knowing that is half of being understood.' : null,
        between: (byP.IV || []).filter(function (r) { return r.id === 'wiring-vs-tone'; })[0] ? 'Send the WP-09 message the way the Wiring Card says it is best received.' : c.wp09 && c.wp09.parts === 3 ? 'Your fact, feeling and ask are ready; say them at a calm time, in the order that suits the listener.' : null,
        practice: 'Put one charged message a week through fact, feeling and ask.' },
      V: { shows: [c.wp13 && c.wp13.filled ? plural(c.wp13.thanks.length, 'appreciation') + ' in ' + c.wp13.entries + ' check-ins' : '', c.wp04 && c.wp04.patterns.length ? plural(c.wp04.patterns.length, 'repeat slip') : '', F.w3 ? plural(F.w3.gaps.length, 'job') + ' without one clear owner' : '', F.refusals ? plural(F.refusals.length, 'kind no') + ' drafted' : ''].filter(Boolean).join('; ') + '.',
        inYou: 'Notice which jobs you pick up by default, and which ones you leave because someone else always does.',
        between: (byP.V || []).filter(function (r) { return r.id === 'drift-to-one' || r.id === 'own-concentrated'; })[0] ? 'Jobs are drifting to one person. Name them kindly before they settle there.' : c.wp13 && c.wp13.thanks.length ? 'Keep the thanks going: they are what keeps a fair setup fair.' : null,
        practice: 'One thanks a day, and name unclaimed jobs before they settle.' }
    };
    pv.rows.forEach(function (r) {
      var d = D[r.n], rules = (byP[r.n] || []);
      r.shows = d.shows && d.shows !== '.' ? d.shows : 'Not filled in yet.';
      r.inYouI = d.inYou || r.inYou;
      r.betweenI = d.between || r.between;
      r.practice = d.practice;
      r.rules = rules.map(function (x) { return x.title; });
    });
    // Pillar V: when jobs are collecting on one person, the reading says so too, so the number and the
    // words agree (every job can have an owner on paper while the unasked-for ones settle on one person).
    var drift = (byP.V || []).filter(function (r) { return r.id === 'drift-to-one' || r.id === 'own-concentrated'; })[0];
    pv.rows.forEach(function (r) {
      if (r.n !== 'V') return;
      if (drift && r.value != null && r.value > 0.6) {
        r.value = 0.6;
        r.shows = (r.shows === 'Not filled in yet.' ? '' : r.shows.replace(/\.$/, '') + '; ') + 'but jobs are collecting on one person (' + lc(drift.title) + ').';
      } else if (!drift && r.value != null && r.value >= 0.7) {
        r.betweenI = c.wp13 && c.wp13.thanks.length ? 'Keep the thanks going: they are what keeps a fair setup fair.' : D.V.between || pv.rows.filter(function (x) { return x.n === 'V'; })[0].between;
      }
    });
    var scoredP = pv.rows.filter(function (r) { return r.value != null; });
    if (scoredP.length >= 2) {
      var sortedP = scoredP.slice().sort(function (a, b) { return b.value - a.value; });
      pv.strongest = sortedP[0]; pv.care = sortedP[sortedP.length - 1];
      pv.note = pv.strongest.value - pv.care.value < 0.05 ? 'The pillars you filled in read about the same. None stands out as needing more care than the others.' : '';
    }
    return pv;
  }

  /* ---------- the discussion guide */

  function guide(fired, F, v, RP) {
    var qs = [];
    fired.forEach(function (r) { if (r.q && qs.indexOf(r.q) < 0 && qs.length < 6) qs.push(r.q); });
    // two questions about the quiet incentives (Pillar V): which jobs get thanked, and which drift
    if (!F.solo) (global.TOL_PILLAR_V || []).slice(0, 2).forEach(function (t) { if (qs.length < 8 && qs.indexOf(t) < 0) qs.push(t); });
    (RP && RP.talk || []).forEach(function (t) { if (qs.length < 10 && qs.indexOf(t) < 0) qs.push(t); });
    var gen = F.solo ? ['Which part of this feels like wiring, which like a pattern, and which like this week’s weather?', 'What surprised you most, and what didn’t surprise you at all?', 'What would "a little better" look like by the end of next week?', 'Who would you like to share one page of this with, and which page?', 'Where does the report miss something that matters to you?', 'What is one thing you would like to be kinder to yourself about?']
      : ['What surprised you most in this report, and what didn’t surprise you at all?', 'Where does the report not match your experience? What does it miss?', 'What is one thing in here you would like to thank someone for?', 'Which one number would you most like to see change by next month?', 'What would "a little better" look like by the end of next week?', 'Is there anything here that should wait for a calmer day?'];
    gen.forEach(function (t) { if (qs.length < 10 && qs.indexOf(t) < 0) qs.push(t); });
    while (qs.length < 8) qs.push('What is one small thing we could try this week?');
    var rules = F.solo ? [
      'Read it like a letter from a friend, not a school report. It describes your conditions, never your worth.',
      'Check your load score first. At 0.60 or above, read the summary only and come back another day.',
      'One section per sitting is plenty.',
      'Timing: a calm, unhurried moment on your own, not late at night or right after a hard conversation.',
      'Start with the strengths to protect before the things to work on.',
      'If you share a page, share the page, not a complaint: let the report be the third voice.'
    ] : [
      'Let the report be a third voice in the conversation (in the room or on the call): point at the page, not at each other.',
      'Check everyone’s load score first. If anyone reads 0.60 or above, pick another time.',
      'Timing: ' + v.meeting + ', unhurried' + (F.road === 'coworkers' ? '; not in a busy chat thread or a hallway.' : F.road === 'coparents' || F.road === 'family' ? '; never in front of children.' : '; not late at night, and by voice (in person or on a call), not over text.'),
      'One topic per sitting. Pick it from the "top 3" list, and let the rest wait.',
      'Start with what is working, then the one thing to change.',
      'Talk about the setup, not the person: "the unowned ' + v.tasks + '", not "you never".',
      'Anyone can pause. Use your pause line and say when you will come back.',
      'End with one written change and a date to look again.'
    ];
    var hard = [
      'Stop reading. You can close it and come back another day; it will say the same thing tomorrow.',
      F.solo ? 'Say it simply to yourself: "That landed harder than I expected. I’ll come back to it on Sunday."' : 'Name it simply: “This landed harder than I expected. Can we pause and come back on Sunday?”',
      'Use a settling default from WP-11, then check your load score again before deciding anything.',
      'Next time, read the "strengths to protect" first.',
      'Remember what this is: a picture of the setup and what was written down, not a verdict on anyone.',
      'If a section feels unfair, say so. The report only knows what was entered, and it can be wrong.'
    ];
    return { questions: qs.slice(0, 12), rules: rules, hard: hard };
  }

  /* ---------- the Individual road: words for one person, never a second one */

  var SOLO_SKIP_TERMS = { 'Workload balance (WB)': 1, 'Ownership clarity (OC)': 1, 'Average load (AS)': 1, 'Setup score': 1, 'Overall score': 1, 'Owner': 1, 'Helper': 1,
    'Consulted and Informed': 1, 'Noticed and handled': 1, 'Structural gap': 1, 'Capacity issue': 1, 'Pattern': 1 };
  var SOLO_WORDS = [
    [/“([^”]*?)\s*Can we pick this up ([^”?]*)\?”/g, '“$1 I’ll pick this up $2.”'],
    [/Can we pick this up ([^?”]*)\?/g, 'I’ll pick this up $1.'],
    [/Can we do this tomorrow instead\?/g, 'I’ll do this tomorrow instead.'],
    [/Worth agreeing on out loud before reading together\./g, 'Worth ticking before you read it.'],
    [/the other person has to guess what would help/g, 'whoever hears it has to guess what would help'],
    [/Can we find twenty minutes this week to ([^?”]*)\? No rush today\./g, 'I’ll find twenty minutes this week to $1. No rush today.'],
    [/Can we look at one thing from it on ([^?”]*)\?/g, 'I’ll look at one thing from it on $1.'],
    [/Don’t schedule a hard conversation after a short night\./g, 'Don’t take on anything hard after a short night.'],
    [/before (?:any|a) hard (?:talk|conversation)/g, 'before anything hard'],
    [/before the hard talks/g, 'before hard things'],
    [/Hard conversations go better/g, 'Hard things go better'],
    [/after a hard conversation/g, 'after a hard day'],
    [/when you have a hard conversation/g, 'when you take on something hard'],
    [/pick up any hard conversation/g, 'pick up anything hard'],
    [/(?:any|a|the next) hard (?:talk|conversation)/g, 'anything hard'],
    [/Say your number out loud/g, 'Say your number to yourself'],
    [/say your number out loud/g, 'say your number to yourself'],
    [/so nobody has to decide in the moment/g, 'so you don’t have to decide in the moment'],
    [/It checks your side of the conversation only\./g, 'It only looks at your side of things.'],
    [/responding to a pattern from a past conversation/g, 'reacting to an old pattern'],
    [/Am I responding to their words, or to a pattern from a past conversation\?/g, 'Am I reacting to what happened just now, or to an old pattern?'],
    [/How does each of us take in a hard message best/g, 'How do you take in a hard message best'],
    [/Bring one point to [^.]+ on a calmer day\./g, 'Come back to one point on a calmer day.'],
    [/Each pillar starts inside you, then shows up between you and others/g, 'Each pillar starts inside you, and can show up with the people around you']
  ];
  function soloText(t) { SOLO_WORDS.forEach(function (w) { t = t.replace(w[0], w[1]); }); return t; }
  function soloWords(root) {
    var seen = [];
    (function walk(o) {
      if (!o || typeof o !== 'object' || o instanceof Date || seen.indexOf(o) !== -1) return;
      seen.push(o);
      Object.keys(o).forEach(function (k) { if (typeof o[k] === 'string') o[k] = soloText(o[k]); else walk(o[k]); });
    })(root);
  }

  /* ---------- glossary, method and how complete the data is */

  var GLOSSARY = [
    ['Battery', 'A quick self-check (WP-02) of how full you are right now: five answers from 0 to 4, added up and divided by 20. Higher means more load.'],
    ['Band', 'A rough range a number falls in, such as low, medium or high load. Round numbers chosen to be easy to read, not hard lines.'],
    ['Workload balance (WB)', 'How close the logged minutes come to an even split. 1.00 is even.'],
    ['Ownership clarity (OC)', 'The share of jobs with an owner.'],
    ['Average load (AS)', 'Everyone’s load score averaged. Only worked out when every load score is in.'],
    ['Setup score', 'The CALC-01 read of whether the way the load is shared can keep going.'],
    ['Overall score', 'The setup score with repair after friction (retuning) added in.'],
    ['Retuning (RF)', 'Friction moments you ran through fact, feeling and ask before answering, divided by all friction moments.'],
    ['Friction moment', 'A time something landed badly enough to notice.'],
    ['Owner', 'The one person who does the job and sees it through.'],
    ['Helper', 'Optional: someone who pitches in, covers, or notices if the job slips.'],
    ['Consulted and Informed', 'People asked before, or told after. A group like "the whole team" fits here.'],
    ['Mental load', 'Planning, remembering and keeping track: work that is short in minutes and long in the head.'],
    ['Noticed and handled', 'Work done without anyone asking. Often invisible, and the first to go unthanked.'],
    ['Structural gap', 'A slip caused by the setup: no owner, or an unclear handoff.'],
    ['Capacity issue', 'A slip because the owner can’t keep up. Not a matter of caring.'],
    ['Pattern', 'Something that slipped 3 or 4 weeks out of 4. More than a fluke.'],
    ['Settling default', 'A way to calm down you chose ahead of time (WP-11), so you don’t have to choose in the moment.'],
    ['Pause line', 'One sentence that says how you are, how long you need, and when you will be back.'],
    ['Fact, feeling, ask', 'The three parts of a message that lands (WP-09): what happened, how it felt, and what you would like next.'],
    ['Wiring Card', 'A short note about how words reach you. Not a label and not a diagnosis.'],
    ['Weather log', 'Four weekly check-ins of your sky (state), pressure (what you were carrying) and sleep.'],
    ['Insight rule', 'A plain check that connects two or more pages and fires only when your answers meet its condition.'],
    ['Not a verdict', 'The report describes a setup and what was written down. It never judges anyone’s worth, effort or love.'],
    ['The Five Pillars', 'See the whole load; fix the setup, not the person; read your state first; tune how you send and receive; notice the quiet incentives.']
  ];

  function method(F) {
    var out = [
      'Load score (WP-02): the five answers added up and divided by 20. Under 0.30 is a low load, 0.30 to 0.59 medium, 0.60 and up high.',
      'Workload balance (WP-01): each person’s share of the logged minutes is compared with an even split. Balance is 1 minus the part of the time that would have to change hands, out of the most it could be. With two people this is 1 minus the gap between the two shares.',
      'Ownership clarity (WP-03): jobs with an owner, divided by all jobs listed.',
      'Setup score (CALC-01): balance × 0.40 + ownership × 0.35 + (1 − average load) × 0.25. The overall score adds retuning: × 0.35, × 0.30, × 0.20 and retuning × 0.15. With no friction counted, the overall score uses the first three, rebalanced.',
      'Bands for the setup score and overall score: 0.70 and up, working well; 0.40 to 0.69, needs a look; under 0.40, needs a rethink, together. Higher means working better. Bands are read from the number rounded to two decimals, so the number and the band always agree.',
      'Patterns (WP-04): 3 or 4 weeks out of 4. Consistency (WP-13): check-ins filled in, divided by 7 days × the number of people.',
      'Insight rules connect two or more pages. Each one fires only when its condition is met by what was entered, and says what it found, why it matters and one step to take. This report has ' + RULES.length + ' rules; the ones that fired for you are listed.',
      'Data checks (' + CHECKS.length + ' of them) look for numbers that may be typos or answers that seem to disagree. They are worded gently because the answer may be real.',
      'Recommendations come from the rules that fired, ranked by how much they matter, and sorted into now, this week and this month. The plan takes one a week.',
      'Nothing is guessed. A blank page says "not filled in", and a score waits until everything it needs is there.',
      'All of it is worked out on this device. Nothing you type or choose is sent anywhere.'
    ];
    if (F.solo) {
      out = out.filter(function (t) { return !/^(Workload balance|Ownership clarity|Setup score|Bands for the setup score|Patterns \(WP-04\))/.test(t); });
      out.splice(1, 0, 'Retuning (CALC-01): friction moments you ran through fact, feeling and ask before answering, divided by all friction moments. On this road CALC-01 only looks at you, so there is no shared-workload score.',
        'Weather log: your load score week by week, read next to your sky, pressure and sleep to show what tends to make a week heavier or lighter.');
    }
    return out;
  }

  function confidence(F, checks) {
    var c = F.c, secs = [];
    var opt = c.R.optional || {};
    c.R.wps.forEach(function (code) {
      var ok0 = code === 'WP-01' ? !!(c.wp01 && c.wp01.filled) : code === 'WP-03' ? !!(c.wp03 && c.wp03.filled) : true;
      if (opt[code] && !ok0) return; // optional on this road, and left blank: not counted against the picture
      var ok = code === 'WP-02' ? c.wp02.filled : code === 'WP-01' ? !!(c.wp01 && c.wp01.filled) : code === 'WP-03' ? !!(c.wp03 && c.wp03.filled) : code === 'WP-04' ? !!(c.wp04 && c.wp04.filled) : code === 'WP-09' ? !!(c.wp09 && c.wp09.filled) : code === 'WP-11' ? !!(c.wp11 && c.wp11.filled) : !!(c.wp13 && c.wp13.filled);
      secs.push([code + ' ' + NAMES[code], ok]);
    });
    var calcOk = !!(c.calc.state || c.calc.friction != null || c.calc.retunes != null || has(F.data, 'calc.wb') || has(F.data, 'calc.oc') || has(F.data, 'calc.as'));
    // CALC-01 is built on the load sheets: on a road where those are optional, a blank one isn't counted either
    if (calcOk || !(opt['WP-01'] && opt['WP-03'])) secs.push(['CALC-01 inputs', calcOk]);
    secs.push(['the Wiring Card', !!c.notes.wiringLines]);
    secs.push(['the weather log', !!c.notes.weather.length]);
    secs.push(['the Ready page', !!(c.ready.going || c.ready.focus || c.ready.when || c.ready.fair)]);
    var filled = secs.filter(function (s) { return s[1]; }), blankS = secs.filter(function (s) { return !s[1]; }), share = filled.length / secs.length;
    var level = share >= 0.75 ? 'Fuller picture' : share >= 0.4 ? 'Partial picture' : 'Early picture';
    var core = F.solo ? c.battery[0].score != null : c.calc.applies && !c.R.focus ? c.calc.sol != null : F.bat.scored.length > 0 || !!(c.wp13 && c.wp13.filled);
    var fixes = checks.filter(function (x) { return x.level === 'check'; }).length;
    var text = 'Based on ' + filled.length + ' of ' + secs.length + ' sections; ' + (blankS.length ? list(blankS.map(function (s) { return s[0]; })) + (blankS.length === 1 ? ' was' : ' were') + ' blank.' : 'nothing was left blank.');
    var weight = level === 'Fuller picture' ? 'Enough is filled in to take the patterns seriously' : level === 'Partial picture' ? 'Treat it as a first sketch: the patterns are real, and a few more pages would make them firmer' : 'Treat it as a starting point: most pages are still blank, so read the findings as hints';
    weight += core ? '.' : (F.solo ? ', and your load score isn’t in yet.' : c.calc.applies && !c.R.focus ? ', and the overall CALC-01 read isn’t worked out yet.' : '.');
    if (fixes) weight += ' ' + plural(fixes, 'entry', 'entries') + ' may be typos (see "Worth a second look"), so treat the numbers they touch as rough.';
    return { level: level, text: text, weight: weight, filled: filled.length, of: secs.length, blank: blankS.map(function (s) { return s[0]; }), sections: secs };
  }

  function completeness(data) {
    return readReport(data).pages.map(function (p) { return [(p.code && /^WP|CALC/.test(p.code) ? p.code + ' ' : '') + p.title, p.filled ? 'Filled in' : 'Not filled in', p.filled + ' of ' + p.of]; });
  }

  function summaryOf(F, v, fired, conf, recs, model) {
    var c = F.c, R = F.R, k = c.calc, bits = [];
    var who = F.solo ? (F.pp[0].name || 'you') : list(F.pp.map(function (p) { return p.label; }));
    // In their own words first: what brought them here, when they wrote it
    var ctx = trim(c.who && c.who.context);
    if (ctx) { ctx = short(ctx.replace(/\s+/g, ' '), 220); bits.push('You said: ' + q(/[.!?\u2026]$/.test(ctx) ? ctx : ctx + '.')); }
    bits.push('This report reads what ' + (F.solo ? (F.pp[0].name ? F.pp[0].name + ' entered' : 'you entered') : who + ' entered') + ' on the ' + R.label + ' road' + (R.focus === 'flat' ? ', for a relationship that is fine but feels flat' : '') + ': ' + conf.filled + ' of ' + conf.of + ' sections.');
    // Not much written yet: say so gently, before any number
    var early = conf.level === 'Early picture' || (F.w13 && F.w13.early && conf.filled <= 3);
    if (early) bits.push('This is an early read. Only a little is filled in so far, so take it as a first look, not a pattern. It gets clearer with each page.');
    if (k.sol != null) bits.push('Overall, the setup reads ' + fmt(k.sol) + ' on CALC-01 (' + k.solBand.label.toLowerCase() + '), and the part losing the most points is ' + k.worst.fix.replace(/ \(.*\)$/, '') + '.');
    else if (k.applies && !R.focus && !early) bits.push('The overall CALC-01 read isn’t worked out yet, because ' + (k.missing.length === 1 ? 'one input is' : k.missing.length + ' inputs are') + ' still missing.');
    if (F.solo && c.battery[0].score != null) bits.push('Your load reads ' + fmt(c.battery[0].score) + ', a ' + c.battery[0].band.label.toLowerCase() + '.');
    else if (!F.solo && F.bat.scored.length) bits.push(F.bat.high.length ? list(lbl(F.bat.high)) + (F.bat.high.length === 1 ? ' is' : ' are') + ' running at a high load, so timing matters this week.' : 'No one’s load score is in the high band, so conditions are workable.');
    var work = fired.filter(function (r) { return !r.strength && r.rec && r.id !== 'state-not-now'; });
    var good = fired.filter(function (r) { return r.strength; });
    if (k.sol != null && k.sol >= 0.7 && leanReasons(c).length) bits.push('The score holds, but ' + list(leanReasons(c)) + ', so read it together with that.');
    // What is working comes first, then the one thing to work on
    var named = good.filter(function (r) { return r.id !== 'ready-going'; });
    if (named.length) bits.push('What’s working: ' + lc(named[0].title) + '.');
    else if (c.ready.going) bits.push('What’s working, in your own words: ' + q(short(c.ready.going, 100).replace(/[.!]$/, '')) + '.');
    else if (conf.filled) bits.push('What’s working: you started, and you are looking at it ' + (F.solo ? 'honestly.' : 'together.'));
    if (work.length) bits.push(early ? 'A first thing to try: ' + lc(work[0].rec && work[0].rec.title || work[0].title) + '.' : 'The clearest thing to work on: ' + lc(work[0].title) + '.');
    if (!work.length && !good.length && !early) bits.push('There isn’t enough filled in yet to draw firm conclusions, and that is fine: the report grows with each page.');
    bits.push('It is a picture of the setup, not a verdict on anyone.');
    var strengths = good.slice(0, 5).map(function (r) { return { title: r.title, text: r.finding }; });
    if (!strengths.length) strengths.push({ title: 'You started', text: conf.filled ? 'You filled in ' + plural(conf.filled, 'section') + '. Looking at it honestly is the first strength.' : 'You opened the package. Looking honestly is where it starts.' });
    // Top 3: one entry per finding. A rule and the recommendation it made are the same item, so they are
    // matched by where they came from (the rule's id), and by their words, never listed twice.
    var top = [], usedFrom = {}, usedText = {};
    function addTop(from, title, text, step) {
      var tk = String(title || '').toLowerCase(), xk = String(text || '').toLowerCase();
      if (top.length >= 3 || (from && usedFrom[from]) || usedText['t:' + tk] || (xk && usedText['x:' + xk])) return;
      if (from) usedFrom[from] = 1;
      usedText['t:' + tk] = 1; if (xk) usedText['x:' + xk] = 1;
      top.push({ title: title, text: text, step: step, from: from || '' });
    }
    work.forEach(function (r) { addTop(r.id, r.title, r.finding, r.rec.first); });
    recs.now.concat(recs.week, recs.month).forEach(function (r) { addTop(r.from, r.title, r.why, r.first); });
    var guideBands = [];
    if (k.applies) guideBands.push('Setup score and overall score: 0.70 and up, working well; 0.40 to 0.69, needs a look; under 0.40, needs a rethink, together. Here higher means working better.');
    if (k.applies) guideBands.push('Workload balance and ownership clarity: 1.00 is an even split or every job has an owner; 0.70 and up reads well.');
    guideBands.push('How much you’re carrying (the WP-02 load score): under 0.30 low load, 0.30 to 0.59 medium, 0.60 and up high. Higher means heavier, not a worse person.');
    if (c.wp11 && c.wp11.readings) guideBands.push('Coming back after settling (WP-11) uses the same WP-02 load score with one line of its own: under 0.50, return to the conversation. It sits inside the medium range on purpose: you don’t need a light load to come back, just less than half.');
    if (c.conc && c.conc.lines.length) guideBands.push('Who’s carrying more right now: noted when one person holds half or more of the jobs or minutes, and at least 20 points over an even share. It sits beside the scores; it isn’t part of them.');
    if (k.rf != null) guideBands.push('Retuning (RF): the share of friction moments repaired before answering. 0.50 and up is a working habit.');
    return { para: bits.join(' '), strengths: strengths, top: top, bands: guideBands };
  }

  global.TOLFullPath = {
    NS: NS, FORMAT: FORMAT, VERSION: PKG_VERSION, ROADS: ROADS, ROAD_ORDER: ROAD_ORDER, NAMES: NAMES, PILLARS: PILLARS, MAX_PEOPLE: MAX_PEOPLE, MIN_PEOPLE: MIN_PEOPLE,
    build: build, regOf: regOf, blankData: blankData, fold: fold, sentence: sentence, fromSuite: fromSuite, fromFields: fromFields, fromJSON: fromJSON, readReport: readReport, canonical: canonical,
    combine: combine, migrateSelf: migrateSelf, shareCopy: shareCopy, hasPrivate: hasPrivate, matchPeople: matchPeople, PRIVATE_RE: PRIVATE_RE,
    compute: compute, report: report, RULES: RULES, CHECKS: CHECKS, facts: facts, people: people, roleOf: roleOf, clampPeople: clampPeople, isoDate: isoDate, num: num, fmt: fmt, namesOf: namesOf
  };
})(typeof window !== 'undefined' ? window : globalThis);
