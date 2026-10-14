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
  function esPage() { try { return !!(W && W.TOLLang && W.TOLLang.es()); } catch (e) { return false; } }
  function T(en, es) { return esPage() && es ? es : en; }
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

  var WL_AXES = [['pace', 'Pace', 'Ritmo', { Q: 'Quick Spark', S: 'Slow Simmer' }], ['lens', 'Lens', 'Lente', { F: 'Forest (big picture first)', T: 'Trees (details first)' }],
    ['send', 'Sending', 'Al hablar', { D: 'Direct', N: 'Nuanced' }], ['recv', 'Receiving', 'Al escuchar', { E: 'Explicit', A: 'Attuned' }]];
  var CARE = [['w', 'Words', 'Palabras'], ['s', 'Acts of service', 'Actos de servicio'], ['g', 'Gifts', 'Regalos'], ['t', 'Quality time', 'Tiempo de calidad'], ['p', 'Touch', 'Contacto físico']];
  var SKY = { clear: 'Clear: calm and connected', gusty: 'Gusty: revved up', fog: 'Fogged in: running on empty' };
  var WP_LISTS = [['WP-03', 'One owner per job', 'treaty', 'task', 'r'], ['WP-01', 'Who did what', 'audit', 'task', 'who'], ['WP-04', 'What keeps coming back', 'raw', 'task', ''],
    ['WP-12', 'Same moment, different speeds', 'agree', 'moment', ''], ['WP-14', 'Is it us, or is it everything else?', 'wrong', 'moment', ''], ['WP-15', 'Keep your little rituals alive', 'rituals', 'ritual', '']];

  /* Each result: id, title [en, es], private, version, get(store) → the data that goes in the link (or null),
     sub(data) → a short line for the checklist, view: how two or more of them are joined, open(data, name) → a
     link to the tool's own fuller view (optional). */
  var PROVIDERS = [
    { id: 'wavelength', title: ['Your Wave Code (communication style)', 'Tu código Wave (estilo de comunicación)'], v: 1,
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
      view: { kind: 'fields', fields: WL_AXES.map(function (a) { return { k: a[0], en: a[1], es: a[2] }; }),
        shape: function (d) { var o = {}; WL_AXES.forEach(function (a, i) { var L = String(d.c || '').charAt(i); o[a[0]] = L ? L + ' · ' + (a[3][L] || '') : ''; }); return o; },
        next: function () { return T('Pick the line where you differ most, and each say one thing that helps you there.', 'Elijan la línea donde más difieren, y digan cada uno algo que les ayude ahí.'); } },
      open: function (d, n, id) { return C.link(C.envelope({ tool: 'wavelength', id: id, name: n, d: { c: d.c } }), '/wavelength.html'); },
      openLabel: ['Open the full comparison in Wavelength', 'Abrir la comparación completa en Wavelength'] },
    { id: 'wiring', title: ['Your Wiring Card', 'Tu Tarjeta de cableado'], v: 1,
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
      sub: function (d) { return T((d.count || 0) + ' things that help you' + (d.wave ? ' · Wave Code ' + d.wave : ''), (d.count || 0) + ' cosas que te ayudan' + (d.wave ? ' · código ' + d.wave : '')); },
      view: { kind: 'fields', fields: [{ k: 'wave', en: 'Wave Code', es: 'Código Wave' }, { k: 'count', en: 'Things that help, on the card', es: 'Cosas que ayudan, en la tarjeta' }],
        shape: function (d) { return { wave: d.wave || '', count: d.count != null ? String(d.count) : '' }; },
        next: function () { return T('Open the cards side by side on the Wiring Card page, and each read the other’s “what helps” out loud.', 'Abran las tarjetas lado a lado en la página de la Tarjeta, y lea cada uno en voz alta lo que ayuda al otro.'); } },
      open: function (d) { return (W ? W.location.origin : 'https://spreadloveandacceptance.com') + '/wiring-card.html#card=' + encodeURIComponent(d.code); },
      openLabel: ['Open both cards side by side', 'Abrir las dos tarjetas lado a lado'] },
    { id: 'care', title: ['Your care card (what feels like care right now)', 'Tu tarjeta de cuidado'], v: 1,
      get: function (store) { var r = J(store.ss('tol-collab-results')), c = r && r.care; if (!c) return null; var o = {}, any = false; CARE.forEach(function (g) { if (Array.isArray(c[g[0]]) && c[g[0]].length) { o[g[0]] = c[g[0]].slice(0, 12).map(function (x) { return str(x, 120); }); any = true; } }); return any ? o : null; },
      sub: function (d) { var n = 0; Object.keys(d).forEach(function (k) { n += (d[k] || []).length; }); return T(n + ' things ticked', n + ' cosas marcadas'); },
      view: { kind: 'fields', fields: CARE.map(function (g) { return { k: g[0], en: g[1], es: g[2] }; }),
        next: function () { return T('This week, each try one thing from the other’s card.', 'Esta semana, prueben cada uno una cosa de la tarjeta del otro.'); } } },
    { id: 'rituals', title: ['Your rituals and touchstones', 'Tus rituales'], v: 1,
      get: function (store) {
        var items = [], st = wpState(store, 'WP-15'), r = J(store.ss('tol-collab-results'));
        ((st && st.tables && st.tables.rituals) || []).forEach(function (row) { if (row && str(row.ritual, 120)) items.push({ t: str(row.ritual, 120), x: str(row.state, 40) }); });
        ((r && r.touch && r.touch.items) || []).forEach(function (t) { if (str(t, 120)) items.push({ t: str(t, 120) }); });
        return items.length ? { items: items.slice(0, 60) } : null;
      },
      sub: function (d) { return T(d.items.length + ' on your list', d.items.length + ' en tu lista'); },
      view: { kind: 'list', next: function () { return T('Pick one from the joined list to keep (or restart) this week, small enough for a hard week.', 'Elijan uno de la lista unida para mantener (o retomar) esta semana, algo pequeño que aguante una semana difícil.'); } } },
    { id: 'load', title: ['How much you’re carrying (WP-02)', 'Cuánto estás cargando (WP-02)'], v: 1,
      get: function (store) {
        var st = wpState(store, 'WP-02'), v = st && st.values; if (!v) return null;
        var sum = 0, n = 0; ['sleep', 'work', 'conflict', 'physical', 'time'].forEach(function (id) { var x = +wpVal(v, 'factors', id); if (wpVal(v, 'factors', id) !== '' && wpVal(v, 'factors', id) != null && isFinite(x) && x >= 0 && x <= 4) { sum += x; n++; } });
        return n === 5 ? { s: Math.round(sum / 20 * 100) / 100 } : null;
      },
      sub: function (d) { return T('Load score ' + d.s.toFixed(2) + ' (0 is light, 1 is very heavy)', 'Carga ' + d.s.toFixed(2) + ' (0 es poca, 1 es mucha)'); },
      view: { kind: 'score', k: 's', scoreLabel: '', next: function () { return T('If one load reads higher, look together at one thing that could move off that plate this week.', 'Si una carga está más alta, miren juntos una cosa que podría salir de ese plato esta semana.'); } },
      open: function (d, n) { return C.wrap('workpaper', { t: 'tol-list', v: 1, wp: 'WP-02', p: [n || 'Someone'], m: {}, tb: {}, vals: {}, s: d.s }, { page: '/workpapers/fill/wp-02.html', name: n }); },
      openLabel: ['Add it beside yours on How much are you carrying?', 'Ponerlo junto al tuyo en ¿Cuánto estás cargando?'] },
    { id: 'chores', title: ['Your quick look at who does what (Lemonade Stand)', 'Tu vistazo a quién hace qué (Lemonade Stand)'], v: 1,
      get: function (store) {
        var q = J(store.ls('tol-lemonade-quick')); if (!q || !Array.isArray(q.people) || !Array.isArray(q.list)) return null;
        var me = typeof q.me === 'number' ? q.me : 0, a = q.ans && q.ans[me]; if (!a) return null;
        var ids = q.list.filter(function (id) { return a[id] != null; }); if (!ids.length) return null;
        var s = ids.map(function (id) { var x = a[id]; return x === 'b' ? 'b' : typeof x === 'number' ? String(x) : '-'; }).join('');
        var ans = {}; ans[me] = s;
        return { x: { v: 1, p: q.people.map(function (p) { return str(p, 40); }), l: ids, a: ans, f: me, t: -1 }, n: ids.length, who: str(q.people[me], 40) };
      },
      sub: function (d) { return T(d.n + ' jobs answered', d.n + ' tareas respondidas'); },
      view: { kind: 'fields', fields: [{ k: 'n', en: 'Jobs answered', es: 'Tareas respondidas' }], shape: function (d) { return { n: String(d.n) }; },
        next: function () { return T('Open the Lemonade Stand to see each job side by side, with the ones you see differently picked out.', 'Abran el Lemonade Stand para ver cada tarea lado a lado, con las que ven distinto marcadas.'); } },
      open: function (d, n) { return C.wrap('lemonade-quick', d.x, { page: '/lemonade-stand.html', name: n }); },
      openLabel: ['Compare in the Lemonade Stand', 'Comparar en el Lemonade Stand'] },
    { id: 'checkin', title: ['This week’s check-in card', 'La tarjeta de esta semana'], v: 1,
      get: function (store) { var c = J(store.ss('tol-checkin-card')); if (!c) return null; var o = {}; ['well', 'heavy', 'try', 'next'].forEach(function (k) { if (str(c[k])) o[k] = str(c[k]); }); if (Array.isArray(c.jobs) && c.jobs.length) o.jobs = c.jobs.slice(0, 12).map(function (x) { return str(x, 60); }); return Object.keys(o).length ? o : null; },
      sub: function (d) { return d.well ? '“' + d.well.slice(0, 50) + (d.well.length > 50 ? '…' : '') + '”' : T('Filled in this week', 'Completada esta semana'); },
      view: { kind: 'fields', fields: [{ k: 'well', en: 'One thing that went well', es: 'Algo que fue bien' }, { k: 'heavy', en: 'One thing that felt heavy', es: 'Algo que pesó' }, { k: 'try', en: 'One small thing to try next week', es: 'Algo pequeño para probar' }, { k: 'next', en: 'Our next check-in', es: 'Nuestra próxima conversación' }, { k: 'jobs', en: 'Jobs that slipped', es: 'Tareas que se quedaron sin hacer' }],
        next: function () { return T('Pick one of the “try next week” ideas and agree who does it.', 'Elijan una de las ideas para la semana que viene y acuerden quién la hace.'); } } },
    { id: 'weather', private: true, title: ['Today’s weather (how you are today)', 'El clima de hoy (cómo estás hoy)'], v: 1,
      get: function (store) { var a = J(store.ls('tol-weather-v1')); if (!Array.isArray(a) || !a.length) return null; var e = a[a.length - 1]; if (!e || !SKY[e.sky]) return null; return { d: str(e.d, 10), sky: e.sky, load: e.load != null ? String(e.load) : '', sleep: e.sleep != null ? String(e.sleep) : '' }; },
      sub: function (d) { return SKY[d.sky] + (d.d ? ' · ' + d.d : ''); },
      view: { kind: 'fields', fields: [{ k: 'd', en: 'Day', es: 'Día' }, { k: 'sky', en: 'Weather', es: 'Clima' }, { k: 'load', en: 'Load', es: 'Carga' }, { k: 'sleep', en: 'Sleep', es: 'Sueño' }],
        format: function (k, v) { return k === 'sky' ? SKY[v] || '' : null; },
        next: function () { return T('If either of you is fogged in, keep today light and pick a better time for anything big.', 'Si alguno está nublado, que hoy sea liviano y busquen otro momento para lo importante.'); } } },
    { id: 'letter', private: true, title: ['Your latest message from “Talk it through in writing”', 'Tu último mensaje de «Háblalo por escrito»'], v: 1,
      get: function (store) {
        var s = J(store.ls('tol-letters')), c = s && s.convos && s.cur && s.convos[s.cur], t = c && Array.isArray(c.turns) ? c.turns.filter(function (x) { return x && x.who === 'me'; }).slice(-1)[0] : null;
        return t && (str(t.f) || str(t.a)) ? { f: str(t.f, 500), a: str(t.a, 500) } : null;
      },
      sub: function (d) { return d.a ? '“' + d.a.slice(0, 50) + (d.a.length > 50 ? '…' : '') + '”' : ''; },
      view: { kind: 'fields', fields: [{ k: 'f', en: 'What happened', es: 'Lo que pasó' }, { k: 'a', en: 'The ask', es: 'Lo que pido' }] } },
    { id: 'setup', title: ['Is the setup working? (your latest numbers)', '¿Funciona el sistema? (tus últimos números)'], v: 1,
      get: function (store) {
        var s = J(store.ls('tol-calc01-full-v2')), t = s && Array.isArray(s.trend) ? s.trend[s.trend.length - 1] : null; if (!t) return null;
        var o = {}; ['sol', 'apex', 'wb', 'oc', 'as', 'rf'].forEach(function (k) { if (typeof t[k] === 'number' && isFinite(t[k])) o[k] = Math.round(t[k] * 100) / 100; });
        if (t.date) o.date = str(t.date, 12);
        return o.sol != null || o.apex != null ? o : null;
      },
      sub: function (d) { return T('Setup score ' + (d.sol != null ? d.sol.toFixed(2) : '–') + (d.date ? ' · ' + d.date : ''), 'Puntaje ' + (d.sol != null ? d.sol.toFixed(2) : '–')); },
      view: { kind: 'fields', fields: [{ k: 'date', en: 'Date', es: 'Fecha' }, { k: 'sol', en: 'Setup score', es: 'Puntaje del sistema' }, { k: 'apex', en: 'Overall score', es: 'Puntaje general' }, { k: 'wb', en: 'Balance', es: 'Equilibrio' }, { k: 'oc', en: 'Ownership', es: 'Dueños' }, { k: 'as', en: 'Stress', es: 'Estrés' }, { k: 'rf', en: 'Retuning', es: 'Reajuste' }],
        format: function (k, v) { return typeof v === 'number' ? v.toFixed(2) : null; },
        next: function () { return T('Where your numbers differ most, compare what each of you counted, not who is right.', 'Donde sus números más difieren, comparen qué contó cada uno, no quién tiene razón.'); } } }
  ];
  // the fill-in workpapers kept together: a merged list in the side-by-side view; the full combine on their own page
  WP_LISTS.forEach(function (w) {
    PROVIDERS.push({ id: 'wp-' + w[0].slice(3), title: [w[1] + ' (' + w[0] + ')', w[1] + ' (' + w[0] + ')'], v: 1,
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
      sub: function (d) { return T(d.items.length + (d.items.length === 1 ? ' row' : ' rows'), d.items.length + ' filas'); },
      view: { kind: 'list', next: function () { return T('Open it on the worksheet to combine the two lists properly, matched by name, with a choice wherever they differ.', 'Ábranlo en la hoja para combinar bien las dos listas, con una opción donde difieren.'); } },
      open: function (d, n) { return C.wrap('workpaper', d.list, { page: '/workpapers/fill/wp-' + w[0].slice(3) + '.html', name: n }); },
      openLabel: ['Combine on the worksheet', 'Combinar en la hoja'] });
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
  function title(id) { var p = BY_ID[id]; return p ? T(p.title[0], p.title[1]) : id; }

  // the sender's side: a checklist (nothing ticked), a name, the "Send by" buttons
  function mountSend(box, getBase) {
    box.textContent = '';
    var have = available(STORE), chosen = [];
    var nid = 'tres-name';
    box.appendChild(mk('p', { cls: 'tcol-me' }, [mk('label', { for: nid, text: T('Your name (optional)', 'Tu nombre (opcional)') }), mk('input', { type: 'text', id: nid, cls: 'tcol-name', maxlength: '40', autocomplete: 'off', placeholder: T('Me', 'Yo') })]));
    var name = box.querySelector('#' + nid); name.value = C.me().name || '';
    if (!have.length) {
      box.appendChild(mk('p', { cls: 'tres-none', text: T('Nothing to share from this device yet. Your results show up here once you’ve done a tool (and it was kept on this device, or done in this tab).', 'Todavía no hay nada para compartir desde este aparato. Tus resultados aparecen aquí cuando hagas una herramienta.') }));
    }
    box.appendChild(mk('p', { cls: 'tcol-send-h', text: have.length ? T('Choose what goes in. Nothing is ticked for you.', 'Elige qué va. No hay nada marcado por defecto.') : '' }));
    var ul = mk('ul', { cls: 'tres-pick', role: 'group', 'aria-label': T('Results to share', 'Resultados para compartir') });
    have.forEach(function (a) {
      var id = 'tres-c-' + a.id, p = BY_ID[a.id];
      var lab = mk('label', { for: id }, [mk('input', { type: 'checkbox', id: id, 'data-res': a.id }), mk('span', {}, [mk('span', { cls: 'tres-t', text: title(a.id) }), p.private ? mk('span', { cls: 'tres-priv', text: T('private', 'privado') }) : null, mk('span', { cls: 'tres-s', text: p.sub ? p.sub(a.data) : '' })])]);
      ul.appendChild(mk('li', {}, [lab]));
    });
    if (have.length) box.appendChild(ul);
    if (have.some(function (a) { return BY_ID[a.id].private; })) box.appendChild(mk('p', { cls: 'tcol-small', text: T('“Private” ones are about how you are, or something you wrote for one person. They only go in if you tick them yourself.', 'Los «privados» son sobre cómo estás, o algo que escribiste para una persona. Solo van si los marcas tú.') }));
    function url() {
      if (!chosen.length) return '';
      var me = C.me(), base = getBase ? getBase() : null;
      var env = C.envelope({ tool: 'bundle', id: me.id, name: (name.value || '').trim(), d: build(STORE, chosen), base: base, r: base ? base.r : null });
      return C.link(env, '/together.html');
    }
    var send = C.sendBlock({ url: url, title: T('My results', 'Mis resultados'), subject: T('Some of my results, to put next to yours', 'Algunos de mis resultados, para ver junto a los tuyos'),
      text: function () { var n = (name.value || '').trim(); return T((n ? n + ' here. ' : '') + 'Here are some of my results from Spread Love & Acceptance. Open the link to see them, and put yours next to them if you like. Nothing is uploaded: it travels inside the link.', (n ? 'Soy ' + n + '. ' : '') + 'Aquí van algunos de mis resultados. Abre el enlace para verlos y, si quieres, pon los tuyos al lado. No se sube nada: viaja dentro del enlace.'); },
      empty: function () { return T('Tick at least one result first.', 'Marca al menos un resultado primero.'); },
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
    var from = env.f && env.p[env.f] ? env.p[env.f].n : '', ids = Object.keys(got.byItem);
    var senders = Object.keys(env.p).filter(function (k) { return k !== me.id; }).map(function (k) { return env.p[k].n || T('Someone', 'Alguien'); });
    box.appendChild(mk('h2', { id: 'tres-in-h', tabindex: '-1', text: senders.length > 1 ? T(senders.join(', ') + ' sent you some results', senders.join(', ') + ' te enviaron algunos resultados') : T((from || T('Someone', 'Alguien')) + ' sent you some results', (from || 'Alguien') + ' te envió algunos resultados') }));
    box.appendChild(mk('p', { text: ids.length ? T('Here’s what came in: ', 'Esto es lo que llegó: ') + ids.map(title).join(', ') + '. ' + T('For each one, put yours next to it, or just look.', 'Para cada uno, pon el tuyo al lado o solo míralo.') : T('Nothing in this link that this page can show.', 'Nada en este enlace que esta página pueda mostrar.') }));
    if (got.unknown.length) box.appendChild(mk('p', { cls: 'tcol-small', text: T('Some of it comes from a newer version of the site, so this page can’t show it yet. Nothing was added.', 'Una parte viene de una versión más nueva del sitio y esta página todavía no puede mostrarla. No se agregó nada.') }));
    ids.forEach(function (id) {
      var p = BY_ID[id], list = got.byItem[id].filter(function (x) { return !x.me; }), card = mk('section', { cls: 'tres-item', 'aria-label': title(id) });
      card.appendChild(mk('h4', { text: title(id) }));
      if (got.newer.indexOf(id) >= 0) card.appendChild(mk('p', { cls: 'tcol-small', text: T('This came from a newer version of the site. Showing what this page can read.', 'Esto viene de una versión más nueva del sitio. Se muestra lo que esta página puede leer.') }));
      var missing = senders.filter(function (n) { return !list.some(function (x) { return (x.n || T('Someone', 'Alguien')) === n; }); });
      if (missing.length) card.appendChild(mk('p', { cls: 'tcol-small', text: T(missing.join(', ') + ' didn’t include this one.', missing.join(', ') + ' no incluyó este.') }));
      var mineD = mineNow[id], out = mk('div', { cls: 'tres-out' });
      var acts = mk('div', { cls: 'tres-acts' });
      var comb = mk('button', { type: 'button', cls: 'tcol-btn', 'data-r': 'combine', text: T('Combine with mine', 'Combinar con el mío') });
      if (!mineD) { comb.disabled = true; comb.setAttribute('aria-disabled', 'true'); }
      var just = mk('button', { type: 'button', cls: 'tcol-btn tcol-quiet', 'data-r': 'view', text: T('Just view', 'Solo ver') });
      acts.appendChild(comb); acts.appendChild(just);
      card.appendChild(acts);
      if (!mineD) card.appendChild(mk('p', { cls: 'tcol-small', text: T('You haven’t done this one on this device yet (or it wasn’t kept here), so there’s nothing of yours to put next to it.', 'Todavía no hiciste este en este aparato (o no se guardó aquí), así que no hay nada tuyo para poner al lado.') }));
      card.appendChild(out);
      function show(withMine) {
        out.textContent = '';
        var people = list.map(function (x) { return { id: x.id, n: x.n, d: shaped(id, x.d) }; });
        if (withMine && mineD) people.unshift({ id: me.id, n: C.me().name, me: true, d: shaped(id, mineD) });
        var v = p.view || {};
        out.appendChild(C.combine.view(people, { kind: v.kind, fields: v.fields, format: v.format, k: v.k, scoreLabel: v.scoreLabel, next: withMine ? v.next : null, tool: id, title: withMine ? T('Side by side', 'Lado a lado') : T('What they sent', 'Lo que enviaron') }));
        if (p.open) list.forEach(function (x) {
          var u = ''; try { u = p.open(x.d, x.n, x.id); } catch (e) { u = ''; }
          if (u) out.appendChild(mk('p', {}, [mk('a', { href: u, cls: 'tcol-btn tcol-quiet', text: T(p.openLabel[0], p.openLabel[1]) + (list.length > 1 ? ' (' + (x.n || T('Someone', 'Alguien')) + ')' : '') })]));
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
      if (!env || env.t !== 'bundle') { recv.hidden = false; recv.textContent = ''; recv.appendChild(mk('p', { cls: 'tcol-in', text: env ? T('That link is for a tool, not a set of results. Open it on its own page.', 'Ese enlace es de una herramienta, no de un conjunto de resultados.') : T('That link didn’t open. Part of it may have been cut off. Ask them to send it again, or as a code.', 'Ese enlace no se abrió. Pide que lo envíen otra vez, o como código.') })); return true; }
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
      if (!env || env.t !== 'bundle') { st.textContent = T('That doesn’t look like a results link or code. Copy all of it and try again.', 'Eso no parece un enlace o código de resultados.'); return; }
      var m = /(?:#together=|TOL-TOGETHER:)\s*(1\.[A-Za-z0-9_-]+)/i.exec(ta.value) || /(1\.[A-Za-z0-9_-]{8,})/.exec(ta.value);
      if (m) { ta.value = ''; st.textContent = ''; W.location.hash = 'together=' + m[1]; }
    });
  }
  if (W && D) { if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start(); }

  var API = { PROVIDERS: PROVIDERS, available: available, build: build, items: items, shaped: shaped };
  if (W) W.TOLCollabResults = API;
  if (typeof module === 'object' && module.exports) module.exports = API;
})();
