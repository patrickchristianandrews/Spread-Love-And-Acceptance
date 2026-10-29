/* collab-results.js — "Share my results": several of your results in one link or QR code, and joining them
   with someone else's. Used by /together.html. Needs collab.js (window.TOLCollab).

   What it does
   - Finds the results this device holds (each tool keeps its own, only on this device): your Wave Code, your
     Wiring Card, your care card, your rituals, how much you're carrying, your quick look at who does what,
     your lists from the fill-in workpapers, this week's check-in card, today's weather, your latest message.
   - A checklist: you tick exactly what goes in. Nothing is ticked for you. The private ones (today's weather,
     a message from "Talk it through in writing") are marked "private" and are never offered as a default.
     Clarify and context answers, and anything about feeling afraid, are never offered at all.
   - One link (…/together.html#together=…, tool "bundle"), with the QR code, text message, email, apps and copy
     buttons from collab.js. Each person's results are their own part of the link, so it works back and forth,
     and for three or more people.
   - Opening one: "Alex sent you some results". For each one: "Combine with mine" (side by side with yours:
     where you match, where you differ, one next step; scores with the gap in kind words; lists merged, with
     who added what) or "Just view". Some open in their own tool for the full comparison (Wavelength, the
     Wiring Card, the Lemonade Stand, the workpapers).
   Nothing is stored on our side. The results travel inside the link.

   For node (tools/collab/test-collab.js): module.exports = { PROVIDERS, available(store), build(store, chosen),
   items(env, myId) } with a store of { ls(key), ss(key) } that returns the stored strings. */
(function () {
  'use strict';
  var W = typeof window !== 'undefined' ? window : null, D = W && W.document;
  var C = (W && W.TOLCollab) || (typeof require === 'function' ? require('./collab.js') : null);
  function J(s) { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function str(s, n) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n || 300); }
  var BUNDLE_V = 1;

  // a fill-in workpaper's draft: this tab's copy first (it is the newest), then the one kept on this device
  function wpState(store, code) {
    var t = J(store.ss('tol-wpf-tab:' + code)), k = J(store.ls('tol-wpf-keep:' + code));
    var d = t && t.state ? t : k && k.state ? k : null;
    return d && d.state && typeof d.state === 'object' ? d.state : null;
  }
  function wpNames(v) { var out = {}; 'ABCDEFGH'.split('').forEach(function (c) { var n = str(v && v['partner' + c], 40); if (n) out[c] = n; }); return out; }
  function wpVal(v, sec, id) { if (!v) return null; if (v[sec + '.' + id] != null) return v[sec + '.' + id]; return v[sec] && typeof v[sec] === 'object' ? v[sec][id] : null; }

  var WL_AXES = [['pace', 'Pace', { Q: 'Quick Spark', S: 'Slow Simmer' }], ['lens', 'Lens', { F: 'Forest (big picture first)', T: 'Trees (details first)' }],
    ['send', 'Sending', { D: 'Direct', N: 'Nuanced' }], ['recv', 'Receiving', { E: 'Explicit', A: 'Attuned' }]];
  var CARE = [['w', 'Words'], ['s', 'Acts of service'], ['g', 'Gifts'], ['t', 'Quality time'], ['p', 'Touch']];
  var SKY = { clear: 'Clear: calm and connected', gusty: 'Gusty: revved up', fog: 'Fogged in: running on empty' };
  var WP_LISTS = [['WP-03', 'One owner per job', 'treaty', 'task', 'r'], ['WP-01', 'Who did what', 'audit', 'task', 'who'], ['WP-04', 'What keeps coming back', 'raw', 'task', ''],
    ['WP-12', 'Same moment, different speeds', 'agree', 'moment', ''], ['WP-14', 'Is it us, or is it everything else?', 'wrong', 'moment', ''], ['WP-15', 'Keep your little rituals alive', 'rituals', 'ritual', '']];

  /* Each result: id, title [en], private, version, get(store) → the data that goes in the link (or null),
     sub(data) → a short line for the checklist, view: how two or more of them are joined, open(data, name) → a
     link to the tool's own fuller view (optional). */
  var PROVIDERS = [
    { id: 'wavelength', title: ['Your Wave Code (communication style)'], v: 1,
      get: function (store) {
        var r = W && W.TOLWavelengthData && W.TOLWavelengthData.results ? W.TOLWavelengthData.results() : null;
        var me = r && r.filter(function (x) { return x.main; })[0];
        if (me && /^[QS][FT][DN][EA]$/.test(me.code)) return { c: me.code, a: str(me.archetype, 60) };
        var s = J(store.ss('tol-wavelength-tab-v1')) || J(store.ls('tol-wavelength-v1')), ans = s && s.answers;
        // without the quiz's own scoring here, only a finished quiz with clear answers is read
        if (!ans) return null;
        var code = '', ok = true;
        [['pace', 'Q', 'S'], ['lens', 'F', 'T'], ['send', 'D', 'N'], ['recv', 'E', 'A']].forEach(function (a) {
          var x = Array.isArray(ans[a[0]]) ? ans[a[0]] : []; if (x.length < 3 || x.some(function (v) { return v !== 'a' && v !== 'b'; })) ok = false;
          var n = x.filter(function (v) { return v === 'a'; }).length; code += n >= 2 ? a[1] : a[2];
        });
        return ok && !(s.chips && s.chips.length) ? { c: code } : null;
      },
      sub: function (d) { return d.c + (d.a ? ', ' + d.a : ''); },
      view: { kind: 'fields', fields: WL_AXES.map(function (a) { return { k: a[0], en: a[1] }; }),
        shape: function (d) { var o = {}; WL_AXES.forEach(function (a, i) { var L = String(d.c || '').charAt(i); o[a[0]] = L ? L + ' · ' + (a[2][L] || '') : ''; }); return o; },
        next: function () { return 'Pick the line where you differ most, and each say one thing that helps you there.'; } },
      open: function (d, n, id) { return C.link(C.envelope({ tool: 'wavelength', id: id, name: n, d: { c: d.c } }), '/wavelength.html'); },
      openLabel: ['Open the full comparison in Wavelength'] },
    { id: 'wiring', title: ['Your “how I like to be spoken to” card'], v: 1,
      get: function (store) {
        var s = J(store.ss('tol-wiring-draft')) || J(store.ls('tol-wiring-card')), a = s && s.A;
        if (!a) return null;
        var o = {}; if (str(a.name, 40)) o.n = str(a.name, 40);
        if (Array.isArray(a.wiring) && a.wiring.length) o.w = a.wiring.slice(0, 20).map(String);
        if (a.wave) o.v = String(a.wave).slice(0, 4);
        var p = {}; Object.keys(a.picks || {}).forEach(function (k) { if (Array.isArray(a.picks[k]) && a.picks[k].length) p[k] = a.picks[k].slice(0, 30); }); if (Object.keys(p).length) o.p = p;
        var c = {}; Object.keys(a.custom || {}).forEach(function (k) { var v = str(a.custom[k], 300); if (v) c[k] = v; }); if (Object.keys(c).length) o.c = c;
        if (!o.w && !o.p && !o.c) return null;
        // the same "WC1." code the Wiring Card makes for its own links
        var b = C.b64e(new TextEncoder().encode(JSON.stringify(o)));
        return { code: 'WC1.' + b + '.', n: o.n || '', wave: o.v || '', count: Object.keys(p).reduce(function (s0, k) { return s0 + p[k].length; }, 0) + Object.keys(c).length };
      },
      sub: function (d) { return ((d.count || 0) + ((d.count || 0) === 1 ? ' thing that helps you' : ' things that help you') + (d.wave ? ' · Wave Code ' + d.wave : '')); },
      view: { kind: 'fields', fields: [{ k: 'wave', en: 'Wave Code' }, { k: 'count', en: 'Things that help, on the card' }],
        shape: function (d) { return { wave: d.wave || '', count: d.count != null ? String(d.count) : '' }; },
        next: function () { return 'Open the cards side by side on the “how I like to be spoken to” card page, and each read the other’s “what helps” out loud.'; } },
      open: function (d) { return (W ? W.location.origin : 'https://spreadloveandacceptance.com') + '/wiring-card.html#card=' + encodeURIComponent(d.code); },
      openLabel: ['Open both cards side by side'] },
    { id: 'care', title: ['Your care card (what feels like care right now)'], v: 1,
      get: function (store) { var r = J(store.ss('tol-collab-results')), c = r && r.care; if (!c) return null; var o = {}, any = false; CARE.forEach(function (g) { if (Array.isArray(c[g[0]]) && c[g[0]].length) { o[g[0]] = c[g[0]].slice(0, 12).map(function (x) { return str(x, 120); }); any = true; } }); return any ? o : null; },
      sub: function (d) { var n = 0; Object.keys(d).forEach(function (k) { n += (d[k] || []).length; }); return (n + (n === 1 ? ' thing ticked' : ' things ticked')); },
      view: { kind: 'fields', fields: CARE.map(function (g) { return { k: g[0], en: g[1] }; }),
        next: function () { return 'This week, each try one thing from the other’s card.'; } } },
    { id: 'rituals', title: ['Your rituals and touchstones (the touchstone list and WP-15)'], v: 1,
      get: function (store) {
        var items = [], st = wpState(store, 'WP-15'), r = J(store.ss('tol-collab-results'));
        ((st && st.tables && st.tables.rituals) || []).forEach(function (row) { if (row && str(row.ritual, 120)) items.push({ t: str(row.ritual, 120), x: str(row.state, 40) }); });
        ((r && r.touch && r.touch.items) || []).forEach(function (t) { if (str(t, 120)) items.push({ t: str(t, 120) }); });
        return items.length ? { items: items.slice(0, 60) } : null;
      },
      sub: function (d) { return (d.items.length + ' on your list'); },
      view: { kind: 'list', next: function () { return 'Pick one from the joined list to keep (or restart) this week, small enough for a hard week.'; } } },
    { id: 'load', wp: true, title: ['WP-02 How much are you carrying?'], v: 1,
      get: function (store) {
        var st = wpState(store, 'WP-02'), v = st && st.values; if (!v) return null;
        var sum = 0, n = 0; ['sleep', 'work', 'conflict', 'physical', 'time'].forEach(function (id) { var x = +wpVal(v, 'factors', id); if (wpVal(v, 'factors', id) !== '' && wpVal(v, 'factors', id) != null && isFinite(x) && x >= 0 && x <= 4) { sum += x; n++; } });
        return n === 5 ? { s: Math.round(sum / 20 * 100) / 100 } : null;
      },
      sub: function (d) { return ('Load score ' + d.s.toFixed(2) + ' (0 is light, 1 is very heavy)'); },
      view: { kind: 'score', k: 's', scoreLabel: '', next: function () { return 'If one load reads higher, look together at one thing that could move off that plate this week.'; } },
      open: function (d, n) { return C.wrap('workpaper', { t: 'tol-list', v: 1, wp: 'WP-02', p: [n || 'Someone'], m: {}, tb: {}, vals: {}, s: d.s }, { page: '/workpapers/fill/wp-02.html', name: n }); },
      openLabel: ['Add it beside yours on How much are you carrying?'] },
    { id: 'chores', title: ['Your quick look at who does what'], v: 1,
      get: function (store) {
        var q = J(store.ls('tol-lemonade-quick')); if (!q || !Array.isArray(q.people) || !Array.isArray(q.list)) return null;
        var me = typeof q.me === 'number' ? q.me : 0, a = q.ans && q.ans[me]; if (!a) return null;
        var ids = q.list.filter(function (id) { return a[id] != null; }); if (!ids.length) return null;
        var s = ids.map(function (id) { var x = a[id]; return x === 'b' ? 'b' : typeof x === 'number' ? String(x) : '-'; }).join('');
        var ans = {}; ans[me] = s;
        return { x: { v: 1, p: q.people.map(function (p) { return str(p, 40); }), l: ids, a: ans, f: me, t: -1 }, n: ids.length, who: str(q.people[me], 40) };
      },
      sub: function (d) { return (d.n + ' jobs answered'); },
      view: { kind: 'fields', fields: [{ k: 'n', en: 'Jobs answered' }], shape: function (d) { return { n: String(d.n) }; },
        next: function () { return 'Open Who does what? to see each job side by side, with the ones you see differently picked out.'; } },
      open: function (d, n) { return C.wrap('lemonade-quick', d.x, { page: '/lemonade-stand.html', name: n }); },
      openLabel: ['Compare in Who does what?'] },
    { id: 'checkin', title: ['This week’s check-in card'], v: 1,
      get: function (store) { var c = J(store.ss('tol-checkin-card')); if (!c) return null; var o = {}; ['well', 'heavy', 'try', 'next'].forEach(function (k) { if (str(c[k])) o[k] = str(c[k]); }); if (Array.isArray(c.jobs) && c.jobs.length) o.jobs = c.jobs.slice(0, 12).map(function (x) { return str(x, 60); }); return Object.keys(o).length ? o : null; },
      sub: function (d) { return d.well ? '“' + d.well.slice(0, 50) + (d.well.length > 50 ? '…' : '') + '”' : 'Filled in this week'; },
      view: { kind: 'fields', fields: [{ k: 'well', en: 'One thing that went well' }, { k: 'heavy', en: 'One thing that felt heavy' }, { k: 'try', en: 'One small thing to try next week' }, { k: 'next', en: 'Our next check-in' }, { k: 'jobs', en: 'Jobs that slipped' }],
        next: function () { return 'Pick one of the “try next week” ideas and agree who does it.'; } } },
    { id: 'weather', private: true, title: ['Today’s weather (how you are today)'], v: 1,
      get: function (store) { var a = J(store.ls('tol-weather-v1')); if (!Array.isArray(a) || !a.length) return null; var e = a[a.length - 1]; if (!e || !SKY[e.sky]) return null; return { d: str(e.d, 10), sky: e.sky, load: e.load != null ? String(e.load) : '', sleep: e.sleep != null ? String(e.sleep) : '' }; },
      sub: function (d) { return SKY[d.sky] + (d.d ? ' · ' + d.d : ''); },
      view: { kind: 'fields', fields: [{ k: 'd', en: 'Day' }, { k: 'sky', en: 'Weather' }, { k: 'load', en: 'Load' }, { k: 'sleep', en: 'Sleep' }],
        format: function (k, v) { return k === 'sky' ? SKY[v] || '' : null; },
        next: function () { return 'If either of you is fogged in, keep today light and pick a better time for anything big.'; } } },
    { id: 'letter', private: true, title: ['Your latest message from “Write it through”'], v: 1,
      get: function (store) {
        var s = J(store.ls('tol-letters')), c = s && s.convos && s.cur && s.convos[s.cur], t = c && Array.isArray(c.turns) ? c.turns.filter(function (x) { return x && x.who === 'me'; }).slice(-1)[0] : null;
        return t && (str(t.f) || str(t.a)) ? { f: str(t.f, 500), a: str(t.a, 500) } : null;
      },
      sub: function (d) { return d.a ? '“' + d.a.slice(0, 50) + (d.a.length > 50 ? '…' : '') + '”' : ''; },
      view: { kind: 'fields', fields: [{ k: 'f', en: 'What happened' }, { k: 'a', en: 'The ask' }] } },
    { id: 'setup', title: ['Is the setup working? (your latest numbers)'], v: 1,
      get: function (store) {
        var s = J(store.ls('tol-calc01-full-v2')), t = s && Array.isArray(s.trend) ? s.trend[s.trend.length - 1] : null; if (!t) return null;
        var o = {}; ['sol', 'apex', 'wb', 'oc', 'as', 'rf'].forEach(function (k) { if (typeof t[k] === 'number' && isFinite(t[k])) o[k] = Math.round(t[k] * 100) / 100; });
        if (t.date) o.date = str(t.date, 12);
        return o.sol != null || o.apex != null ? o : null;
      },
      sub: function (d) { return ('Setup score ' + (d.sol != null ? d.sol.toFixed(2) : '–') + (d.date ? ' · ' + d.date : '')); },
      view: { kind: 'fields', fields: [{ k: 'date', en: 'Date' }, { k: 'sol', en: 'Setup score' }, { k: 'apex', en: 'Overall score' }, { k: 'wb', en: 'Balance' }, { k: 'oc', en: 'Ownership' }, { k: 'as', en: 'Stress' }, { k: 'rf', en: 'Retuning' }],
        format: function (k, v) { return typeof v === 'number' ? v.toFixed(2) : null; },
        next: function () { return 'Where your numbers differ most, compare what each of you counted, not who is right.'; } } }
  ];
  // the fill-in workpapers kept together: a merged list in the side-by-side view; the full combine on their own page
  WP_LISTS.forEach(function (w) {
    PROVIDERS.push({ id: 'wp-' + w[0].slice(3), wp: true, title: [w[0] + ' ' + w[1]], v: 1,
      get: function (store) {
        var st = wpState(store, w[0]); if (!st || !st.tables) return null;
        // (WP-03's untouched starter jobs have no owner yet: only the jobs someone gave an owner travel)
        var rows = (st.tables[w[2]] || []).filter(function (r) { return r && str(r[w[3]], 120) && (w[0] !== 'WP-03' || r.r); }), names = wpNames(st.values || {});
        if (!rows.length) return null;
        var items = rows.slice(0, 60).map(function (r) { var o = { t: str(r[w[3]], 120) }; if (w[4] && r[w[4]]) o.x = r[w[4]] === 'Both' ? 'shared' : names[r[w[4]]] || ''; if (!o.x) delete o.x; return o; });
        var tb = {}; tb[w[2]] = rows.slice(0, 200).map(function (r) { var o = {}; Object.keys(r).forEach(function (k) { var v = r[k]; if (v == null || v === '' || typeof v === 'object') return; if (/^[A-H]$/.test(v) && names[v]) v = names[v]; else if (v === 'Both') v = '*'; o[k] = v; }); return o; });
        var p = 'ABCDEFGH'.split('').map(function (c) { return names[c]; }).filter(Boolean);
        return { items: items, list: { t: 'tol-list', v: 1, wp: w[0], p: p, m: {}, tb: tb } };
      },
      sub: function (d) { return (d.items.length + (d.items.length === 1 ? ' row' : ' rows')); },
      view: { kind: 'list', next: function () { return 'Open it on the worksheet to combine the two lists properly, matched by name, with a choice wherever they differ.'; } },
      open: function (d, n) { return C.wrap('workpaper', d.list, { page: '/workpapers/fill/wp-' + w[0].slice(3) + '.html', name: n }); },
      openLabel: ['Combine on the worksheet'] });
  });
  var BY_ID = {}; PROVIDERS.forEach(function (p) { BY_ID[p.id] = p; });

  // ---- plain logic (node-testable)
  function available(store) {
    return PROVIDERS.map(function (p) { var d = null; try { d = p.get(store); } catch (e) { d = null; } return d ? { id: p.id, private: !!p.private, data: d } : null; }).filter(Boolean);
  }
  // only what was ticked goes in; a private one only if it was ticked by name
  function build(store, chosen) {
    chosen = Array.isArray(chosen) ? chosen : [];
    var out = {};
    available(store).forEach(function (a) { if (chosen.indexOf(a.id) >= 0) out[a.id] = { v: BY_ID[a.id].v, d: a.data }; });
    return { v: BUNDLE_V, items: out };
  }
  // for each result in a bundle: everyone who sent one, in order of when they sent it
  function items(env, myId) {
    var out = {}, unknown = [], newer = [];
    Object.keys((env && env.p) || {}).forEach(function (pid) {
      var p = env.p[pid], its = p.d && p.d.items && typeof p.d.items === 'object' ? p.d.items : {};
      Object.keys(its).forEach(function (id) {
        var it = its[id]; if (!it || typeof it !== 'object' || !it.d || typeof it.d !== 'object') return;
        if (!BY_ID[id]) { if (unknown.indexOf(id) < 0) unknown.push(id); return; }
        if ((+it.v || 1) > BY_ID[id].v && newer.indexOf(id) < 0) newer.push(id);
        (out[id] = out[id] || []).push({ id: pid, n: p.n, at: p.at, me: pid === myId, d: it.d });
      });
    });
    Object.keys(out).forEach(function (id) { out[id].sort(function (a, b) { return (a.at || 0) - (b.at || 0); }); });
    return { byItem: out, unknown: unknown, newer: newer };
  }
  // the answers in a form the side-by-side view reads
  function shaped(id, d) { var v = BY_ID[id] && BY_ID[id].view; return v && v.shape ? v.shape(d) : d; }

  // ============================================================== the page (/together.html)
  function mk(tag, attrs, kids) {
    var n = D.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { var v = attrs[k]; if (v == null || v === false) return; if (k === 'text') n.textContent = v; else if (k === 'cls') n.className = v; else n.setAttribute(k, v === true ? '' : v); });
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? D.createTextNode(c) : c); });
    return n;
  }
  var STORE = { ls: function (k) { try { return W.localStorage.getItem(k); } catch (e) { return null; } }, ss: function (k) { try { return W.sessionStorage.getItem(k); } catch (e) { return null; } } };
  function title(id) { var p = BY_ID[id]; return p ? p.title[0] : id; }

  // the sender's side: a checklist (nothing ticked), a name, the "Send by" buttons
  function mountSend(box, getBase) {
    box.textContent = '';
    var have = available(STORE), chosen = [];
    var nid = 'tres-name';
    box.appendChild(mk('p', { cls: 'tcol-me' }, [mk('label', { for: nid, text: 'Your name (optional)' }), mk('input', { type: 'text', id: nid, cls: 'tcol-name', maxlength: '40', autocomplete: 'off', placeholder: 'Me' })]));
    var name = box.querySelector('#' + nid); name.value = C.me().name || '';
    if (!have.length) {
      box.appendChild(mk('p', { cls: 'tres-none', text: 'Nothing to share from this device yet. Your results show up here once you’ve done a tool (and it was kept on this device, or done in this tab).' }));
    }
    box.appendChild(mk('p', { cls: 'tcol-send-h', text: have.length ? 'Choose what goes in. Nothing is ticked for you.' : '' }));
    // tools and workpapers are listed apart, each under its own heading
    var ul = mk('div', { cls: 'tres-groups', role: 'group', 'aria-label': 'Results to share' });
    var groups = [['From the tools', have.filter(function (a) { return !BY_ID[a.id].wp; })], ['From the workpapers', have.filter(function (a) { return BY_ID[a.id].wp; })]];
    groups.forEach(function (g) {
      if (!g[1].length) return;
      var gl = mk('ul', { cls: 'tres-pick' });
      ul.appendChild(mk('p', { cls: 'tres-gh', text: g[0] }));
      ul.appendChild(gl);
      g[1].forEach(function (a) { add(gl, a); });
    });
    function add(list, a) {
      var id = 'tres-c-' + a.id, p = BY_ID[a.id];
      var lab = mk('label', { for: id }, [mk('input', { type: 'checkbox', id: id, 'data-res': a.id }), mk('span', {}, [mk('span', { cls: 'tres-t', text: title(a.id) }), p.private ? mk('span', { cls: 'tres-priv', text: 'private' }) : null, mk('span', { cls: 'tres-s', text: p.sub ? p.sub(a.data) : '' })])]);
      list.appendChild(mk('li', {}, [lab]));
    }
    if (have.length) box.appendChild(ul);
    if (have.some(function (a) { return BY_ID[a.id].private; })) box.appendChild(mk('p', { cls: 'tcol-small', text: '“Private” ones are about how you are, or something you wrote for one person. They only go in if you tick them yourself.' }));
    function url() {
      if (!chosen.length) return '';
      var me = C.me(), base = getBase ? getBase() : null;
      var env = C.envelope({ tool: 'bundle', id: me.id, name: (name.value || '').trim(), d: build(STORE, chosen), base: base, r: base ? base.r : null });
      return C.link(env, '/together.html');
    }
    var send = C.sendBlock({ url: url, title: 'My results', subject: 'Some of my results, to put next to yours',
      text: function () { var n = (name.value || '').trim(); return ((n ? n + ' here. ' : '') + 'Here are some of my results from Spread Love & Acceptance. Open the link to see them, and put yours next to them if you like. Nothing is uploaded: it travels inside the link.'); },
      empty: function () { return 'Tick at least one result first.'; },
      onSent: function () { C.saveMe((name.value || '').trim() || null); } });
    box.appendChild(send);
    ul.addEventListener('change', function () { chosen = Array.prototype.filter.call(ul.querySelectorAll('input:checked'), function () { return true; }).map(function (i) { return i.getAttribute('data-res'); }); send.refresh(); });
    name.addEventListener('input', function () { send.refresh(); });
    return { chosen: function () { return chosen.slice(); }, url: url };
  }

  // the receiver's side: what came in, each with "Combine with mine" and "Just view"
  function mountReceive(box, env) {
    box.textContent = '';
    var me = C.me(), got = items(env, me.id), mineNow = {};
    available(STORE).forEach(function (a) { mineNow[a.id] = a.data; });
    // only results someone else sent (your own part comes back with a reply, and is already yours)
    var from = env.f && env.p[env.f] && env.f !== me.id ? env.p[env.f].n : '', ids = Object.keys(got.byItem).filter(function (id) { return got.byItem[id].some(function (x) { return !x.me; }); });
    if (!from) { var o0 = Object.keys(env.p).filter(function (k) { return k !== me.id; }).sort(function (a, b) { return (env.p[b].at || 0) - (env.p[a].at || 0); })[0]; if (o0) from = env.p[o0].n; }
    var senders = Object.keys(env.p).filter(function (k) { return k !== me.id; }).map(function (k) { return env.p[k].n || 'Someone'; });
    box.appendChild(mk('h2', { id: 'tres-in-h', tabindex: '-1', text: senders.length > 1 ? (senders.join(', ') + ' sent you some results') : ((from || 'Someone') + ' sent you some results') }));
    box.appendChild(mk('p', { text: ids.length ? 'Here’s what came in: ' + ids.map(title).join(', ') + '. ' + 'For each one, put yours next to it, or just look.' : 'Nothing in this link that this page can show.' }));
    if (got.unknown.length) box.appendChild(mk('p', { cls: 'tcol-small', text: 'Some of it comes from a newer version of the site, so this page can’t show it yet. Nothing was added.' }));
    ids.forEach(function (id) {
      var p = BY_ID[id], list = got.byItem[id].filter(function (x) { return !x.me; }), card = mk('section', { cls: 'tres-item', 'aria-label': title(id) });
      card.appendChild(mk('p', { cls: 'tres-kind', text: p.wp ? 'Workpaper' : 'Tool' }));
      card.appendChild(mk('h4', { text: title(id) }));
      if (got.newer.indexOf(id) >= 0) card.appendChild(mk('p', { cls: 'tcol-small', text: 'This came from a newer version of the site. Showing what this page can read.' }));
      var missing = senders.filter(function (n) { return !list.some(function (x) { return (x.n || 'Someone') === n; }); });
      if (missing.length) card.appendChild(mk('p', { cls: 'tcol-small', text: (missing.join(', ') + ' didn’t include this one.') }));
      var mineD = mineNow[id], out = mk('div', { cls: 'tres-out' });
      var acts = mk('div', { cls: 'tres-acts' });
      var comb = mk('button', { type: 'button', cls: 'tcol-btn', 'data-r': 'combine', text: 'Combine with mine' });
      if (!mineD) { comb.disabled = true; comb.setAttribute('aria-disabled', 'true'); }
      var just = mk('button', { type: 'button', cls: 'tcol-btn tcol-quiet', 'data-r': 'view', text: 'Just view' });
      acts.appendChild(comb); acts.appendChild(just);
      card.appendChild(acts);
      if (!mineD) card.appendChild(mk('p', { cls: 'tcol-small', text: 'You haven’t done this one on this device yet (or it wasn’t kept here), so there’s nothing of yours to put next to it.' }));
      card.appendChild(out);
      function show(withMine) {
        out.textContent = '';
        var people = list.map(function (x) { return { id: x.id, n: x.n, d: shaped(id, x.d) }; });
        if (withMine && mineD) people.unshift({ id: me.id, n: C.me().name, me: true, d: shaped(id, mineD) });
        var v = p.view || {};
        out.appendChild(C.combine.view(people, { kind: v.kind, fields: v.fields, format: v.format, k: v.k, scoreLabel: v.scoreLabel, next: withMine ? v.next : null, tool: id, title: withMine ? 'Side by side' : 'What they sent' }));
        if (p.open) list.forEach(function (x) {
          var u = ''; try { u = p.open(x.d, x.n, x.id); } catch (e) { u = ''; }
          if (u) out.appendChild(mk('p', {}, [mk('a', { href: u, cls: 'tcol-btn tcol-quiet', text: p.openLabel[0] + (list.length > 1 ? ' (' + (x.n || 'Someone') + ')' : '') })]));
        });
      }
      comb.addEventListener('click', function () { show(true); });
      just.addEventListener('click', function () { show(false); });
      box.appendChild(card);
    });
  }

  function start() {
    var send = D.getElementById('tres-send'), recv = D.getElementById('tres-recv'), back = D.getElementById('tres-back');
    if (!send || !C) return;
    var received = null;
    function fromHash() {
      if (!/^#together=/.test(W.location.hash || '')) return false;
      var env = C.read(W.location.hash);
      try { W.history.replaceState(W.history.state, '', W.location.pathname + W.location.search); } catch (e) {}
      if (!env || env.t !== 'bundle') { recv.hidden = false; recv.textContent = ''; recv.appendChild(mk('p', { cls: 'tcol-in', text: env ? 'That link is for a tool, not a set of results. Open it on its own page.' : 'That link didn’t open. Part of it may have been cut off. Ask them to send it again, or as a code.' })); return true; }
      var res = C.merge(received, env); received = res ? res.env : env;
      C.saveMe();
      recv.hidden = false; mountReceive(recv, received);
      if (back) back.hidden = false;
      var h = D.getElementById('tres-in-h'); if (h) setTimeout(function () { h.scrollIntoView({ block: 'start' }); h.focus({ preventScroll: true }); }, 60);
      return true;
    }
    mountSend(send, function () { return received; });
    fromHash();
    W.addEventListener('hashchange', fromHash);
    var pasteBtn = D.getElementById('tres-open');
    if (pasteBtn) pasteBtn.addEventListener('click', function () {
      var ta = D.getElementById('tres-paste'), env = C.read(ta.value), st = D.getElementById('tres-paste-st');
      if (!env || env.t !== 'bundle') { st.textContent = 'That doesn’t look like a results link or code. Copy all of it and try again.'; return; }
      var m = /(?:#together=|TOL-TOGETHER:)\s*([12]\.[A-Za-z0-9_-]+)/i.exec(ta.value) || /([12]\.[A-Za-z0-9_-]{8,})/.exec(ta.value);
      if (m) { ta.value = ''; st.textContent = ''; W.location.hash = 'together=' + m[1]; }
    });
  }
  if (W && D) { if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start(); }

  var API = { PROVIDERS: PROVIDERS, available: available, build: build, items: items, shaped: shaped };
  if (W) W.TOLCollabResults = API;
  if (typeof module === 'object' && module.exports) module.exports = API;
})();
