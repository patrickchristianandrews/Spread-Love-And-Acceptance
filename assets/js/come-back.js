/* come-back.js — a kind reason to come back, kept on this device only.
   - Home page: "How much time do you have?" (1, 5, 10, 15 or 30+ minutes) turns into a short plan of
     one to four steps that add up to the time picked. The ideas come from the menu's time launcher (pick-up.js) plus a few more,
     lean toward what you picked in "Start where you are" or opened lately, and change each visit.
     The last choice is remembered here ("Welcome back. 5 minutes again?").
   - Home page: "Today's tiny thing" (one small practice a day).
   - Book chapters, tools, calm games and Frequency Buddies: a short "What you got from this" line
     at the natural end, and a "Next time" idea.
   - Tool, workpaper, book and guide pages: ONE "Recommended next" step at the end (plus at most one
     other idea), picked for "Just me" or "With someone" (tol-mode-v1, chosen on the home page or here),
     and "Done for now? See what you got": what you did here today, in a card to copy, print or save.
   It mostly reads what the site already keeps here (recent pages, Check yourself petals, garden
   levels, episodes, tool drafts) and adds one small key, tol-come-back-v1, for the rest. It reads and
   writes tol-mode-v1 (Just me / With someone) and the "one thing to try" in tol-ten-v1 (Start in 10 minutes).
   No streaks to keep, no timers, nothing to lose: pick up anytime. Nothing is sent anywhere.
   "Hide the helpers" and Quiet mode hide the extras (the time picker stays); a still page never moves.
   In Focus mode (site.js, window.TOLFocus) plans and "Next time" ideas keep to the chosen areas where they can. */
(function () {
  'use strict';
  if (window.TOLComeBack) return;
  var doc = document, root = doc.documentElement;
  if (doc.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;
  try { if (window.top !== window.self) return; } catch (e) { return; }
  if (/palcam-pop/.test(location.search)) return;

  var KEY = 'tol-come-back-v1';
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function json(k) { try { return JSON.parse(lsGet(k) || 'null'); } catch (e) { return null; } }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function el(tag, attrs, html) {
    var n = doc.createElement(tag);
    if (attrs) for (var a in attrs) if (attrs[a] != null) n.setAttribute(a, attrs[a]);
    if (html != null) n.innerHTML = html;
    return n;
  }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function dayNum() { var d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); }

  var path = location.pathname.replace(/\/$/, '/index.html');
  if (path === '/') path = '/index.html';
  var simplePath = path.replace(/-in-depth\.html$/, '.html');
  var isHome = path === '/index.html';

  // pages that are full-screen, tender, or private: nothing extra here
  var SKIP = /^\/(night-garden|garden-backdrop|pal-cam-tv|calm-visualizer|soundscapes|keepsakes|on-this-device|membership|dashboard|404|offline|growing-up|growing-up-in-depth|know-yourself|know-yourself-in-depth|privacy-policy|refund-policy|terms-of-service|telemetry|sent-this)\.html$|^\/(legal|workpapers\/fill|store|supabase|do|snapshot)\//;
  if (SKIP.test(path) || (doc.body && doc.body.hasAttribute('data-sensitive')) || (doc.body && doc.body.hasAttribute('data-no-comeback'))) return;

  /* ---------------------------------------------------------------- our one small record */
  var S = { time: null, sit: null, days: [], read: {}, did: {}, fin: {}, earned: {}, tiny: {}, visits: 0 };
  (function () { var o = json(KEY); if (o && typeof o === 'object') for (var k in o) S[k] = o[k]; })();
  // with "Stop remembering pages I visit" on, which pages were read or tried is never written down
  function save() {
    var o = S, off = false; try { off = !!localStorage.getItem('tol-recent-off'); } catch (e) {}
    if (off) { o = {}; Object.keys(S).forEach(function (k) { o[k] = S[k]; }); o.read = {}; o.did = {}; o.fin = {}; }
    lsSet(KEY, JSON.stringify(o));
  }
  (function markDay() {
    var t = today();
    if (!Array.isArray(S.days)) S.days = [];
    if (S.days[S.days.length - 1] !== t) { S.days.push(t); if (S.days.length > 120) S.days = S.days.slice(-120); }
    save();
  })();

  function helpersOff() { return root.classList.contains('tol-no-helpers') || !!(window.TOLQuiet && window.TOLQuiet.on()); }
  function still() {
    return root.classList.contains('tol-still') || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  // the stylesheet, once
  (function () {
    if (doc.querySelector('link[data-come-back]')) return;
    var l = el('link', { rel: 'stylesheet', href: '/assets/css/come-back.css', 'data-come-back': '' });
    doc.head.appendChild(l);
  })();

  /* ---------------------------------------------------------------- what the site already keeps */
  var BOOK = [
    { u: '/book/self-1-then.html', code: 'Then', t: 'Where you came from', n: 'where your lens came from, and which old rules to keep',
      gain: 'You now know one way to meet your own reactions: some of what you feel was learned long ago, and you can keep the rules that still help.' },
    { u: '/book/self-2-now.html', code: 'Now', t: 'Who you are today', n: 'your wiring, your weather and your words',
      gain: 'You now know one way to read yourself before you speak: your wiring, how today is going, and one clear sentence about what helps.' },
    { u: '/book/self-3-next.html', code: 'Next', t: 'Who you are becoming', n: 'what matters to you, one small goal and a kind monthly look',
      gain: 'You now know one way to grow toward something: pick what matters, one small step, a plan for the tired day, and a gentle look back.' },
    { u: '/book/preface.html', code: 'Preface', t: 'The work nobody sees', n: 'why the unseen work at home deserves to be noticed',
      gain: 'You now know why the unseen work of a home is worth writing down: once both of you can see it, it can be shared and thanked.' },
    { u: '/book/chapter-1.html', code: 'Chapter I', t: 'Why we get out of tune', n: 'how pace, tone and urgency nudge two people out of step',
      gain: 'You now know one way to get back in tune: notice the static, slow down, say it again softly, and agree on a better time.' },
    { u: '/book/chapter-2.html', code: 'Chapter II', t: 'Is the split working?', n: 'a fair look at how the work is shared, never at a person',
      gain: 'You now know one way to check whether the way you share the work can last, by looking at the setup instead of at a person.' },
    { u: '/book/chapter-3.html', code: 'Chapter III', t: 'Full tanks and different angles', n: 'why some reactions are bigger than their cause',
      gain: 'You now know one way to tell leftover stress from what is happening right now, before you answer.' },
    { u: '/book/chapter-4.html', code: 'Chapter IV', t: 'Two kinds of fair', n: 'agreeing on what fair means to you both',
      gain: 'You now know there are two kinds of fair, and that agreeing on which one your home uses saves a lot of arguing.' },
    { u: '/book/chapter-5.html', code: 'Chapter V', t: 'The monthly look-back', n: 'a calm monthly check that catches what weekly talks miss',
      gain: 'You now know one way to look back once a month and fix the arrangement, never the person.' }
  ];
  function bookIdx(u) { for (var i = 0; i < BOOK.length; i++) if (BOOK[i].u === u) return i; return -1; }
  function chaptersRead() { return BOOK.filter(function (b) { return S.read[b.u]; }).length; }
  function nextChapter() { for (var i = 0; i < BOOK.length; i++) if (!S.read[BOOK[i].u]) return BOOK[i]; return null; }

  var TOOLS = {
    '/signal-translator.html': { t: 'Signal Translator', gain: 'You just found a kinder way to say it, before it was said.',
      result: function () { var r = doc.getElementById('results'); return r && !r.hidden && !r.hasAttribute('data-no-reward') && r.textContent.trim().length > 20 ? r : null; } },
    '/conversation-reader.html': { t: 'Conversation Reader', gain: 'You just looked at a talk from both sides, without blaming anyone.',
      result: function () { var r = doc.getElementById('cr-out'); return r && !r.querySelector('.cr-safety') && r.textContent.trim().length > 20 ? r : null; } },
    '/carrier-wave-decoder.html': { t: 'Carrier Wave Decoder', gain: 'You just worked out what slipped in a talk, not who started it.',
      result: function () { var r = doc.getElementById('result'); return r && !r.hidden ? r : null; } },
    '/lemonade-stand.html': { t: 'Lemonade Stand', gain: 'You just put the work where everyone can see it. That is the first step to sharing it.',
      result: function () { var r = doc.getElementById('balance-line'); return r && (r.hasAttribute('data-ls-result') || (r.textContent.trim() && !/^(Add some hours|Waiting for)/i.test(r.textContent.trim()) && !/\bWaiting for\b/.test(r.textContent))) && !/\bWaiting for\b/.test(r.textContent) ? (doc.querySelector('.ls-tools') || r) : null; } },
    '/quick-checks.html': { t: 'Today’s Weather', gain: 'You just checked in with yourself first. Knowing your weather makes the rest of the day easier to plan.',
      result: function () {
        var a = json('tol-weather-v1'), e = Array.isArray(a) && a[a.length - 1]; return e && e.d === today() ? doc.getElementById('today') : null; } },
    '/wavelength.html': { t: 'Wavelength', gain: 'You just learned something about how you take things in, and how to say it to the people you love.',
      result: function () { return lsGet('tol-wavelength-v1') ? doc.querySelector('main') : null; }, atEnd: true },
    '/wiring-card.html': { t: 'Wiring Card', gain: 'You just put how you work into words someone else can read.',
      result: function () { return lsGet('tol-wiring-card') ? doc.querySelector('main') : null; }, atEnd: true }
  };
  function toolTried(u) {
    if (S.did[u]) return true;
    if (u === '/quick-checks.html') { var a = json('tol-weather-v1'); return Array.isArray(a) && a.length > 0; }
    if (u === '/lemonade-stand.html') { var l = json('tol-lemonade-stand-v2'); return !!(l && !l.example && l.jobs && l.jobs.some(function (j) { return j && j.name; })); }
    if (u === '/wavelength.html') return !!(lsGet('tol-wavelength-v1') || lsGet('tol-heartprint-v1'));
    if (u === '/wiring-card.html') return !!lsGet('tol-wiring-card');
    if (u === '/carrier-wave-decoder.html') { var c = json('cwd-v1'); return !!(c && ((c.log && c.log.length) || Object.keys(c.done || {}).length)); }
    return false;
  }
  function toolsTried() { return Object.keys(TOOLS).filter(toolTried); }

  var GAMES = [['words', 'Quiet Words', '/quiet-words.html'], ['bloom', 'Word Bloom', '/word-bloom.html'], ['crossword', 'Quiet Crossword', '/quiet-crossword.html'],
    ['journey', 'The Frequency Journey', '/frequency-journey.html'], ['pond', 'The Night Garden', '/night-garden.html'], ['fireflies', 'The Night Garden', '/night-garden.html']];
  var GAME_PAGES = /^\/(quiet-words|word-bloom|quiet-crossword|daily-ledger-crossword|frequency-journey-play)\.html$/;
  function rewardsRaw() { var o = json('tol-rewards-v1'); return o && typeof o === 'object' ? o : {}; }
  function gamesPlayed() {
    var r = rewardsRaw(), from = r.from || {}, g = r.games || {}, names = {};
    GAMES.forEach(function (x) { if (from[x[0]] || g[x[0]]) names[x[1]] = x[2]; });
    return names;
  }

  var EPISODES = [
    ['s1e1', 'The Storm Over the Treehouse', 'You watched the pals take a pause before fixing things. Next time something goes wrong today, try asking “what would Tidbit do?”'],
    ['s1e2', 'Out of Tune', 'You watched the pals say what they mean, then check how it landed. Try it at dinner: “Did that come out the way I meant?”'],
    ['s1e3', 'The Heavy Basket', 'You watched the pals share the load. Try asking “what would Tidbit do?” today, and lay one job out where everyone can see it.'],
    ['s1e4', 'Who Broke the Kite?', 'You watched the pals look at how things were set up before blaming anyone. When something breaks today, ask “how was it set up?”'],
    ['s1e5', 'The Longest Night', 'You watched the pals notice a quiet habit and choose a new way. Pick one small habit to notice together today.']
  ];
  function buddies() { var b = json('tol-buddies-v1'); return b && typeof b === 'object' ? b : {}; }
  function episodesWatched() { var w = buddies().watched || {}; return EPISODES.filter(function (e) { return w[e[0]]; }); }
  function nextEpisode() { var w = buddies().watched || {}; for (var i = 0; i < EPISODES.length; i++) if (!w[EPISODES[i][0]]) return EPISODES[i]; return null; }

  function petals() { var lp = json('tol-learnplay-v1'); return (lp && lp.petals) || 0; }
  function recent() { var r = json('tol-recent'); return Array.isArray(r) ? r.filter(function (x) { return x && x.u; }) : []; }

  // the garden: "Level 4 · 2 more levels until Koi in the pond arrive"
  function gardenLine() {
    var R = window.TOLRewards; if (!R || !R.state) return '';
    var st = R.state();
    var s = 'Level ' + st.level + ' in <a href="/keepsakes.html">your garden</a>';
    if (st.next && st.next.kind === 'garden' && st.next.id.indexOf('garden-flies') !== 0) s += '. ' + (st.toNext <= 1 ? 'One more level' : st.toNext + ' more levels') + ' until ' + esc(st.next.name.charAt(0).toLowerCase() + st.next.name.slice(1)) + ' arrives';
    else if (st.next) s += '. More fireflies are on their way';
    return s + '.';
  }
  function whenRewards(fn) {
    var n = 0;
    (function wait() { if (window.TOLRewards) return fn(window.TOLRewards); if (++n < 30) setTimeout(wait, 200); else fn(null); })();
  }
  // a gentle celebration with the site's own levels: once per thing (and once a day for tools), never noisy
  function celebrate(id, why, daily) {
    var mark = daily ? today() : 1;
    if (S.earned[id] === mark) return;
    S.earned[id] = mark; save();
    whenRewards(function (R) { if (R) try { R.earn(1, 'come-back', why, { soft: true }); } catch (e) {} });
  }

  /* ---------------------------------------------------------------- plans for the time you have */
  // situation tags: from "Start where you are" and from the pages opened lately
  var SIT_TAGS = { 'same-fight': 'load', 'home-bills': 'load', invisible: 'load', empty: 'calm', caring: 'calm',
    'went-badly': 'talk', 'say-hard': 'talk', 'past-each-other': 'talk', 'know-myself': 'self', 'keep-good': 'book', unsure: 'book' };
  var HREF_TAGS = [[/night-garden|breathe|soundscapes|word-bloom|quiet-|pause-and-play|frequency-journey/, 'calm'], [/signal-translator|conversation-reader|carrier-wave|check-ins/, 'talk'],
    [/lemonade|workpapers|wp-0|calc01|chore/, 'load'], [/wavelength|wiring-card|know-yourself|wired-differently|quick-checks/, 'self'], [/^\/book\//, 'book'], [/frequency-buddies|pal-cam/, 'kids']];
  // Focus mode: an idea fits when it's in the chosen areas, or belongs to none (Breathe, today's tiny thing)
  function fits(u) { var F = window.TOLFocus; try { return !F || !F.isOn() || F.allows(u); } catch (e) { return true; } }
  function tagOf(u) { for (var i = 0; i < HREF_TAGS.length; i++) if (HREF_TAGS[i][0].test(u)) return HREF_TAGS[i][1]; return ''; }
  function wanted() {
    var w = {};
    if (S.sit && SIT_TAGS[S.sit]) w[SIT_TAGS[S.sit]] = 3;
    recent().slice(0, 4).forEach(function (r, i) { var t = tagOf(r.u); if (t) w[t] = (w[t] || 0) + (i === 0 ? 2 : 1); });
    return w;
  }

  // minutes and tags for the menu launcher's ideas (pick-up.js), so both share one list
  var MIN_FOR = { '#breathe': 1, '/quick-checks.html#today': 1, '/night-garden.html': 1, '/signal-translator.html': 3, '/conversation-reader.html': 5, '/lemonade-stand.html': 5,
    '/wiring-card.html': 5, '/start-in-10-minutes.html': 10, '/carrier-wave-decoder.html': 10, '/workpapers/wp-03-one-owner-per-job.html': 10, '/soundscapes.html': 10 };
  function fromLauncher() {
    var T = window.TOLPickUp && window.TOLPickUp.time, out = { 1: [], 5: [], 15: [] };
    if (!T) return out;
    Object.keys(T).forEach(function (k) {
      (T[k] || []).forEach(function (r) {
        var m = MIN_FOR[r[2]] || +k, tier = m <= 1 ? 1 : m <= 5 ? 5 : 15;
        out[tier].push({ t: r[1], u: r[2], m: m, why: 'Good for: ' + r[0].charAt(0).toLowerCase() + r[0].slice(1), tag: r[2] === '#breathe' ? 'calm' : tagOf(r[2]) });
      });
    });
    return out;
  }
  function pools() {
    var nc = nextChapter() || BOOK[0], ne = nextEpisode() || EPISODES[0], L = fromLauncher();
    var P = {
      1: [
        { t: 'Check today’s weather', u: '/quick-checks.html#today', m: 1, why: 'one minute on how you are doing today', tag: 'self' },
        { t: 'Take a breath in the Night Garden', u: '/night-garden.html', m: 1, why: 'a calm spot, nothing to win or lose', tag: 'calm' },
        { t: 'Breathe for one minute', u: '#breathe', m: 1, why: 'opens right here, on this page', tag: 'calm' },
        { t: 'Read today’s tiny thing', u: '#cb-tiny', m: 1, why: 'one small idea to carry into your day', tag: 'book' }
      ],
      5: [
        { t: 'Read the start of ' + nc.code + ': ' + nc.t, u: nc.u, m: 4, why: nc.n, tag: 'book' },
        { t: 'Run one message through the Signal Translator', u: '/signal-translator.html', m: 3, why: 'see how it may land before you send it', tag: 'talk' },
        { t: 'Try a Check yourself moment', u: '/five-pillars.html', m: 4, why: 'a quick question on the Five Pillars, with a petal for you', tag: 'self' },
        { t: 'Watch one chapter of Frequency Buddies with a kid', u: '/frequency-buddies.html?ep=' + ne[0], m: 4, why: ne[1] + ', in short pieces', tag: 'kids' }
      ],
      10: [
        { t: 'Read the first half of ' + nc.code + ': ' + nc.t, u: nc.u, m: 6, why: nc.n, tag: 'book' },
        { t: 'Plan your early signs in the Calm-Down Kit', u: '/wp-11.html', m: 6, why: 'what you notice first, and what settles you', tag: 'calm' },
        { t: 'Say one message so it lands', u: '/workpapers/wp-09-say-it-so-it-lands.html', m: 6, why: 'a fact, a feeling and a kind ask', tag: 'talk' },
        { t: 'Play a calm game level', u: '/pause-and-play.html', m: 8, why: 'no timers and no way to lose', tag: 'calm' }
      ],
      15: [
        { t: 'Read all of ' + nc.code + ': ' + nc.t, u: nc.u, m: 12, why: nc.n, tag: 'book' },
        { t: 'Find your Wavelength', u: '/wavelength.html', m: 12, why: 'how you think, talk and listen', tag: 'self' },
        { t: (mode() === 'me' ? 'List your own jobs in the Lemonade Stand' : 'Fill in the Lemonade Stand together'), u: '/lemonade-stand.html', m: 10, why: mode() === 'me' ? 'see your own load, with no blame' : 'jobs and hours side by side, together', tag: 'load' },
        { t: 'Play a calm game level', u: '/pause-and-play.html', m: 8, why: 'no timers and no way to lose', tag: 'calm' }
      ],
      30: [
        { t: 'Walk one road of the Workpaper Suite', u: '/workpapers/fill/suite.html', m: 25, why: 'one fillable path, at your own pace', tag: 'load' },
        { t: 'Start (or continue) Six gentle weeks', u: '/prog-01.html', m: 20, why: 'one small session a week', tag: 'book' },
        { t: 'All the Wavelength chapters', u: '/wavelength.html', m: 25, why: 'the full picture of how you take things in', tag: 'self' },
        { t: 'Watch an episode together: ' + ne[1], u: '/frequency-buddies.html?ep=' + ne[0], m: 16, why: 'Tidbit and Sugarfoot, for the whole family', tag: 'kids' },
        { t: nc.code + ' in full, with the longer version', u: nc.u.replace(/\.html$/, '-in-depth.html'), m: 20, why: nc.n, tag: 'book' }
      ]
    };
    // add the menu launcher's ideas (same list as "How much time do you have?" in the menu)
    [1, 5, 15].forEach(function (k) {
      L[k].forEach(function (x) { if (!P[k].some(function (y) { return y.u.split('?')[0] === x.u.split('?')[0]; })) P[k].push(x); });
    });
    // the 10-minute plan can also use the five-minute ideas that take the full five
    P[5].forEach(function (x) { if (x.m === 5 && !P[10].some(function (y) { return samePage(x, y); })) P[10].push(x); });
    // in Focus mode, each list keeps the ideas in your areas (a list with none of them stays as it was)
    Object.keys(P).forEach(function (k) { var f = P[k].filter(function (x) { return !x.u || fits(x.u); }); if (f.some(function (x) { return x.u && x.u.charAt(0) !== '#'; })) P[k] = f; });
    return P;
  }
  var CLOSERS = [
    { t: 'Notice one thing that went okay today', m: 0.5 },
    { t: 'Let one slow breath out before you go back to your day', m: 0.5 },
    { t: 'Say one thank-you, out loud or in a text', m: 0.5 }
  ];
  function pathOf(u) { return String(u || '').split(/[?#]/)[0]; }
  // pages opened lately (site.js keeps them in 'tol-recent'), so a plan can offer something new
  function visited() { var v = {}; recent().forEach(function (r) { v[pathOf(r.u)] = 1; }); return v; }
  // the list in the order it fits you: your kind of thing first, the rest rotating in so it stays fresh.
  // Pages opened lately (and anything already in the plan) are left out, unless that would leave nothing.
  function ranked(list, seed, avoid) {
    var w = wanted(), seen = visited(), last = pathOf((recent()[0] || {}).u);
    function notUsed(x) { return !avoid || avoid.indexOf(pathOf(x.u)) === -1 || !pathOf(x.u); }
    var ok = list.filter(function (x) { var pa = pathOf(x.u); return notUsed(x) && !(pa && seen[pa]); });
    if (!ok.length) ok = list.filter(function (x) { return notUsed(x) && pathOf(x.u) !== last; });
    if (!ok.length) ok = list.filter(notUsed);
    if (!ok.length) ok = list.slice();
    var scored = ok.map(function (x, i) { return { x: x, s: (w[x.tag] || 0) * 10 + ((i * 7 + seed * 3) % ok.length) }; });
    scored.sort(function (a, b) { return b.s - a.s; });
    var top = Math.max(1, Math.min(scored.length, Object.keys(w).length ? 2 : scored.length));
    var out = scored.map(function (o) { return o.x; }), lead = out.splice(seed % top, 1)[0];
    out.unshift(lead);
    return out;
  }
  function pickFrom(list, seed, avoid) { return ranked(list, seed, avoid)[0]; }
  // Breathe falls back to the Night Garden, so the two count as one place
  function placeOf(u) { return u === '#breathe' ? '/night-garden.html' : pathOf(u) || u; }
  function samePage(a, b) { return placeOf(a.u) === placeOf(b.u); }
  // one main step plus up to two small ones that add up to exactly the minutes picked.
  // A one-minute opener (a breath, today's weather) goes first when one fits.
  function fit(target, mains, smalls, seed) {
    var M = ranked(mains.filter(function (x) { return x.m <= target; }), seed);
    for (var i = 0; i < M.length; i++) {
      var main = M[i], rem = target - main.m;
      if (!rem) return [main];
      var F = ranked(smalls.filter(function (x) { return x.m <= rem && !samePage(x, main); }), seed + 1).slice(0, 8);
      var best = null, bestScore = -1e9;
      for (var a = 0; a < F.length; a++) {
        var tries = [[F[a], a]];
        for (var b = a + 1; b < F.length; b++) if (!samePage(F[a], F[b])) tries.push([F[a], F[b], a + b]);
        tries.forEach(function (c) {
          var rank = c.pop(), sum = 0; c.forEach(function (x) { sum += x.m; });
          if (sum !== rem) return;
          // prefer a one-minute opener, then fewer steps, then the ones that fit you best (earlier in F)
          var sc = (c.some(function (x) { return x.m === 1; }) ? 100 : 0) + (c.length === 1 ? 20 : 0) - rank;
          if (sc > bestScore) { bestScore = sc; best = c; }
        });
      }
      if (best) {
        var open = best.filter(function (x) { return x.m === 1; }).slice(0, 1);
        return open.concat([main], best.filter(function (x) { return open.indexOf(x) === -1; }));
      }
    }
    return null;
  }
  function plan(min, seed) {
    var P = pools(), steps = [], used = [];
    function add(x) { if (x) { steps.push(x); used.push(pathOf(x.u)); } }
    var ones = P[1].filter(function (x) { return x.u !== '#cb-tiny' || !helpersOff(); });
    if (min === 1) {
      add(pickFrom(P[1], seed));
      steps.push(CLOSERS[seed % CLOSERS.length]);
    } else if (min === 5 || min === 10 || min === 15) {
      var mains = min === 5 ? P[5] : min === 10 ? P[10] : P[15];
      var smalls = min === 5 ? ones : ones.concat(P[5].filter(function (x) { return x.m <= 5; }));
      var got = fit(min, mains, smalls, seed);
      if (got) return got;
      // nothing adds up exactly: a short opener and the closest main step
      add(pickFrom(ones, seed + 1));
      add(pickFrom(mains.filter(function (x) { return x.m < min; }), seed, used));
    } else {
      add({ t: 'Check today’s weather', u: '/quick-checks.html#today', m: 1, why: 'so you know what today is good for' });
      add(pickFrom(P[30], seed, used));
      add(pickFrom(P[15].filter(function (x) { return x.tag === 'calm'; }).concat(P[1].filter(function (x) { return x.u === '/night-garden.html'; })), seed + 1, used));
    }
    return steps;
  }
  function mins(m) { return m < 1 ? 'a moment' : m === 1 ? '1 min' : m + ' min'; }
  var LABEL = { 1: '1-minute', 5: '5-minute', 10: '10-minute', 15: '15-minute', 30: '30-minute' };
  var NICE = { 1: '1 minute', 5: '5 minutes', 10: '10 minutes', 15: '15 minutes', 30: '30 minutes or more' };

  function timePicker(box) {
    var opts = box.querySelectorAll('[data-cb-min]'), out = box.querySelector('[data-cb-plan]'), q = box.querySelector('.hh-time-q');
    if (!opts.length || !out) return;
    // the buttons are one group, named by the question
    var grp = opts[0].parentNode;
    if (grp && grp !== box && !grp.getAttribute('role')) {
      grp.setAttribute('role', 'group');
      if (q) { if (!q.id) q.id = 'cb-time-q'; grp.setAttribute('aria-labelledby', q.id); }
    }
    var seed = (S.visits || 0) + dayNum();
    S.visits = (S.visits || 0) + 1; save();
    function show(min, welcome) {
      var steps = plan(min, seed), total = 0;
      steps.forEach(function (s) { total += s.m; });
      out.innerHTML =
        '<p class="cb-plan-h">' + 'Your ' + LABEL[min] + ' plan' + (welcome ? ', fresh for today' : '') + '</p>' +
        '<ol class="cb-steps">' + steps.map(function (s) {
          var link = !s.u ? '<span class="cb-step-t">' + esc(s.t) + '</span>'
            : '<a class="cb-step-t" href="' + esc(s.u === '#breathe' ? '/night-garden.html' : s.u) + '"' + (s.u === '#breathe' ? ' data-cb-breathe' : '') + (s.u.charAt(0) === '#' && s.u !== '#breathe' ? ' data-cb-jump="' + esc(s.u) + '"' : '') + '>' + esc(s.t) + '</a>';
          return '<li><span class="cb-m">' + mins(s.m) + '</span><span class="cb-step">' + link + (s.why ? '<small>' + esc(s.why) + '</small>' : '') + '</span></li>';
        }).join('') + '</ol>' +
        '<p class="cb-plan-foot">About ' + (min === 30 ? '30 minutes or more' : NICE[min]) + '. Stop whenever you like. <button type="button" data-cb-again>Another idea</button></p>';
      out.classList.toggle('is-welcome', !!welcome);
      out.hidden = false;
    }
    function choose(btn, welcome) {
      var on = btn.getAttribute('aria-pressed') !== 'true' || welcome;
      opts.forEach(function (b) { b.setAttribute('aria-pressed', String(on && b === btn)); });
      if (!on) { out.hidden = true; out.innerHTML = ''; return; }
      var m = +btn.getAttribute('data-cb-min');
      S.time = m; save();
      show(m, welcome);
    }
    opts.forEach(function (b) { b.addEventListener('click', function () { if (q && q.getAttribute('data-q')) q.textContent = q.getAttribute('data-q'); choose(b); }); });
    out.addEventListener('click', function (e) {
      var again = e.target.closest('[data-cb-again]');
      if (again) { seed++; show(S.time || 5); var f = out.querySelector('.cb-step-t'); if (f && f.focus) try { f.focus({ preventScroll: true }); } catch (x) {} return; }
      var br = e.target.closest('[data-cb-breathe]');
      if (br) { var bb = doc.querySelector('.tol-breathe-btn'); if (bb) { e.preventDefault(); bb.click(); } return; }
      var j = e.target.closest('[data-cb-jump]');
      if (j) { var t = doc.querySelector(j.getAttribute('data-cb-jump')); if (t && !t.hidden && t.offsetParent) { e.preventDefault(); t.scrollIntoView({ block: 'start', behavior: still() ? 'auto' : 'smooth' }); try { t.focus({ preventScroll: true }); } catch (x) {} } else { e.preventDefault(); } }
    });
    // welcome back: the same amount of time as last time, already chosen
    var last = +S.time;
    if (last && LABEL[last]) {
      var b = box.querySelector('[data-cb-min="' + last + '"]');
      if (b) {
        // wait briefly for the menu's ideas, so the plan draws on the full list
        var n = 0; (function go() { if (window.TOLPickUp || ++n > 10) choose(b, true); else setTimeout(go, 150); })();
      }
    }
  }

  /* ---------------------------------------------------------------- "Today's tiny thing" */
  var PILLAR_PRACTICE = [
    ['See the whole load.', 'Name one job someone at home does that nobody mentions. Thank them for it today.', '/five-pillars.html'],
    ['Fix the setup, not the person.', 'Pick one thing that keeps slipping and ask “how is this set up?” instead of “who forgot?”', '/five-pillars.html'],
    ['Read your state first.', 'Before a hard talk, ask yourself: am I hungry, tired or rushed? If so, choose a better time.', '/quick-checks.html#today'],
    ['Tune how you send and receive.', 'Say one thing today, then ask: “Did that come out the way I meant?”', '/signal-translator.html'],
    ['Notice the quiet incentives.', 'Spot one job that drifted to one person without anyone deciding. Just notice it for now.', '/five-pillars.html']
  ];
  var CHECKIN_Q = [
    'What is one thing that went well this week, and who helped it happen?',
    'What is one small thing that would make tomorrow a little easier?',
    'What is something you appreciated today but did not say out loud?',
    'When did you feel most like yourself this week?',
    'What is one job you would happily trade, and one you would keep?'
  ];
  function tinyCard() {
    var d = dayNum(), kind = d % 3, box = el('aside', { class: 'cb-tiny cb-extra no-bubble no-cheer', id: 'cb-tiny', tabindex: '-1', 'aria-labelledby': 'cb-tiny-h' });
    var head = '<p class="cb-k" id="cb-tiny-h">Today’s tiny thing</p>';
    function fill(title, body, link, linkText) {
      var done = S.tiny && S.tiny[today()];
      box.innerHTML = head + '<p class="cb-tiny-t"><strong>' + esc(title) + '</strong> ' + esc(body) + '</p>' +
        '<p class="cb-tiny-row"><button type="button" data-cb-tried' + (done ? ' disabled' : '') + '>' + (done ? 'Tried it today' : 'I tried it') + '</button>' +
        (link ? ' <a href="' + esc(link) + '">' + esc(linkText) + '</a>' : '') + '<span class="cb-tiny-say" role="status"></span></p>';
    }
    if (kind === 0) { var p = PILLAR_PRACTICE[Math.floor(d / 3) % PILLAR_PRACTICE.length]; fill(p[0], p[1], p[2], 'More on this'); }
    else if (kind === 1) { fill('A question to ask:', CHECKIN_Q[Math.floor(d / 3) % CHECKIN_Q.length], '/check-ins.html', 'How check-ins work'); }
    else {
      var p2 = PILLAR_PRACTICE[(Math.floor(d / 3) + 2) % PILLAR_PRACTICE.length]; fill(p2[0], p2[1], p2[2], 'More on this');
      if (window.TOLTips) try { window.TOLTips.get(null, function (t) { fill(t[0], t[1], '', ''); }, d); } catch (e) {}
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cb-tried]'); if (!b) return;
      S.tiny = S.tiny || {}; S.tiny[today()] = 1;
      var ks = Object.keys(S.tiny).sort(); if (ks.length > 60) delete S.tiny[ks[0]];
      save();
      b.disabled = true; b.textContent = 'Tried it today';
      var n = Object.keys(S.tiny).length;
      box.querySelector('.cb-tiny-say').textContent = n > 1 ? ' Lovely. That makes ' + n + ' tiny things so far.' : ' Lovely. Small things add up.';
      celebrate('tiny', 'A tiny thing, tried', true);
    });
    return box;
  }

    function stat(n, of, label, none) {
    var dots = '';
    if (of) { dots = '<span class="cb-dots" aria-hidden="true">'; for (var i = 0; i < of; i++) dots += '<i' + (i < n ? ' class="on"' : '') + '></i>'; dots += '</span>'; }
    return '<li class="' + (n ? 'is-on' : 'is-zero') + '"><span class="cb-n">' + n + (of ? '<small> of ' + of + '</small>' : '') + '</span><span class="cb-l">' + esc(n ? label : none) + '</span>' + dots + '</li>';
  }
  function nextIdea() {
    var nc = nextChapter(), ne = nextEpisode(), tools = toolsTried(), w = wanted(), c = [];
    if (w.kids && ne) c.push(['/frequency-buddies.html?ep=' + ne[0], 'Episode ' + (EPISODES.indexOf(ne) + 1) + ': ' + ne[1], 'with Tidbit and Sugarfoot']);
    if (nc && chaptersRead()) c.push([nc.u, nc.code + ': ' + nc.t, nc.n]);
    if (tools.indexOf('/quick-checks.html') === -1) c.push(['/quick-checks.html#today', 'Today’s Weather', 'one minute on how you are doing']);
    if (tools.indexOf('/wavelength.html') === -1) c.push(['/wavelength.html', 'Find your Wavelength', 'how you think, talk and listen']);
    if (nc) c.push([nc.u, nc.code + ': ' + nc.t, nc.n]);
    if (ne) c.push(['/frequency-buddies.html?ep=' + ne[0], 'Episode ' + (EPISODES.indexOf(ne) + 1) + ': ' + ne[1], 'with Tidbit and Sugarfoot']);
    c.push(['/prog-01.html', 'Six gentle weeks', 'one small session a week']);
    // the first idea in your focus, if Focus mode is on and one fits
    return c.filter(function (x) { return fits(x[0]); })[0] || c[0];
  }
  function anything() { return chaptersRead() || toolsTried().length || Object.keys(gamesPlayed()).length || episodesWatched().length || petals(); }
  /* ---------------------------------------------------------------- Just me / With someone */
  // one choice, kept on this device; it only changes which steps are suggested and what "done" looks like
  var MODE_KEY = 'tol-mode-v1', TEN_KEY = 'tol-ten-v1';
  function mode() { var m = lsGet(MODE_KEY); return m === 'me' || m === 'with' ? m : ''; }
  function setMode(m) {
    if (m === 'me' || m === 'with') lsSet(MODE_KEY, m); else try { localStorage.removeItem(MODE_KEY); } catch (e) {}
    try { doc.dispatchEvent(new CustomEvent('tol-mode', { detail: { mode: mode() } })); } catch (e) {}
  }
  function ten() { var t = json(TEN_KEY); return t && typeof t === 'object' ? t : {}; }
  function tenDone() { return !!ten().fin; }

  /* ---------------------------------------------------------------- "Recommended next" */
  // [address, name, why]
  var W = {
    ten: ['/start-in-10-minutes.html', 'Start in 10 minutes', 'four small steps, one at a time'],
    weather: ['/quick-checks.html#today', 'Check today’s weather', 'one minute on how you are doing'],
    almanac: ['/quick-checks.html#almanac', 'Your weather over time', 'a few days in, your own pattern starts to show'],
    wiring: ['/wiring-card.html', 'Your Wiring Card', 'how you work, in words someone else can read'],
    wavelength: ['/wavelength.html', 'Find your Wavelength', 'how you think, talk and listen'],
    selfpath: ['/self-path.html', 'Your self path', 'six small steps on your own, at your own pace'],
    signal: ['/signal-translator.html', 'The Signal Translator', 'test one message before you send it'],
    notes: ['/signal-translator.html#notes', 'Your talking notes', 'write down what you want to say, before the talk'],
    reader: ['/conversation-reader.html', 'The Conversation Reader', 'look at a talk that went sideways, from both sides'],
    decoder: ['/carrier-wave-decoder.html', 'The Carrier Wave Decoder', 'work out what slipped, not who started it'],
    checkins: ['/check-ins.html', 'Check-ins', 'raise one thing at a calm, set time'],
    lemon: ['/lemonade-stand.html', 'The Lemonade Stand', 'every job and its hours, where everyone can see them'],
    setup: ['/is-the-setup-working.html', 'Is the setup working for everyone?', 'a fair look at the split, never at a person'],
    wp01: ['/workpapers/wp-01.html', 'Who did what', 'write down the jobs that keep a home running'],
    wp02: ['/workpapers/wp-02-how-much-are-you-carrying.html', 'How much are you carrying?', 'a quick look at how full your battery is'],
    wp03: ['/workpapers/wp-03-one-owner-per-job.html', 'One owner per job', 'so nothing falls between you'],
    wp04: ['/workpapers/wp-04-what-keeps-coming-back.html', 'What keeps coming back?', 'one short page, once a month'],
    wp09: ['/workpapers/wp-09-say-it-so-it-lands.html', 'Say it so it lands', 'a fact, a feeling and a kind ask'],
    kit: ['/wp-11.html', 'The Calm-Down Kit', 'what you notice first, and what settles you'],
    daily: ['/workpapers/wp-13-daily-check-in.html', 'The 90-second daily check-in', 'a tiny daily habit to share'],
    six: ['/prog-01.html', 'Six gentle weeks', 'one small session a week'],
    pause: ['/pursue-withdraw.html', 'One wants to talk now, one needs space', 'both sides, and a pause plan'],
    turning: ['/turning-toward.html', 'Turning toward', 'seven small habits for staying close']
  };
  // page -> { me: next, with: next, alt: one other idea }. A next is a key of W, or [key, a better "why" for this page].
  var NEXT = {
    '/quick-checks.html': { me: 'wiring', with: ['checkins', 'now you know your weather, pick a good time to talk'], alt: 'almanac' },
    '/ladder.html': { me: 'kit', with: ['kit', 'plan what settles each of you, before the next hard moment'], alt: 'weather' },
    '/signal-translator.html': { me: 'wp09', with: 'checkins', alt: 'reader' },
    '/conversation-reader.html': { me: ['signal', 'test your next message before you send it'], with: ['decoder', 'go through it together, without blame'], alt: 'pause' },
    '/carrier-wave-decoder.html': { me: 'wp04', with: ['checkins', 'how to raise it once, calmly, at a good time'] },
    '/lemonade-stand.html': { me: ['wp02', 'see how full your own battery is'], with: ['wp03', 'give every job one owner, together'], alt: 'setup' },
    '/wavelength.html': { me: 'wiring', with: ['wiring', 'one page you can hand to someone, and swap'] },
    '/wiring-card.html': { me: 'selfpath', with: ['checkins', 'swap cards in a short, calm talk'], alt: 'wavelength' },
    '/wp-11.html': { me: 'weather', with: ['checkins', 'share your plan at a calm time'] },
    '/wp-11-sound-toolkit.html': { me: 'kit', with: 'kit' },
    '/check-ins.html': { me: 'notes', with: 'daily' },
    '/pursue-withdraw.html': { me: 'kit', with: ['kit', 'agree a pause plan together'] },
    '/self-path.html': { me: 'wavelength', with: ['checkins', 'share one thing you learned about yourself'] },
    '/five-pillars.html': { me: 'ten', with: 'ten' },
    '/how-it-works.html': { me: 'ten', with: 'ten' },
    '/is-this-for-you.html': { me: 'ten', with: 'ten' },
    '/is-the-setup-working.html': { me: 'wp02', with: 'wp03' },
    '/turning-toward.html': { me: 'weather', with: 'daily' },
    '/small-wins.html': { me: 'weather', with: 'turning' },
    '/perspective-shifter.html': { me: 'signal', with: 'checkins' },
    '/communication-style-quiz.html': { me: 'wiring', with: ['wiring', 'then swap cards'] },
    '/heartprint.html': { me: 'wiring', with: 'wiring' }
  };
  var WP = { '01': { me: 'wp02', with: 'wp02' }, '02': { me: 'kit', with: 'wp03' }, '03': { me: 'wp04', with: 'wp04' }, '04': { me: 'wp09', with: 'wp09' },
    '09': { me: 'signal', with: 'checkins' }, '11': { me: 'weather', with: 'checkins' }, '13': { me: 'weather', with: 'six' } };
  // the rest go by what the page is about
  var TAG_NEXT = [
    [/lemonade|workpaper|wp-|chore|share-the-load|invisible|money|calc|setup|sharing-a-room|different-hours/, { me: ['lemon', 'see your own load, with no blame'], with: ['lemon', 'list the jobs side by side, together'] }],
    [/communication|check-ins|apolog|pursue|fighting|conversation|signal|carrier|perspective|languages|love-languages|turning|touchstones|complacency/, { me: 'signal', with: 'checkins' }],
    [/wavelength|wiring|know-yourself|wired-differently|self-|small-wins|growing-up|heartprint|pawprint|quiz|understanding-/, { me: 'wiring', with: 'wiring' }],
    [/calm|breath|soundscape|upset|ladder|grief|empty-nest|when-one-is-ill/, { me: 'weather', with: 'weather' }]
  ];
  function wpRule() { var m = /\/wp-?(\d\d)\b/.exec(simplePath); return m && WP[m[1]] ? WP[m[1]] : null; }
  function bookRule() {
    var i = bookIdx(simplePath); if (i < 0) return null;
    var nx = BOOK[i + 1], deep = simplePath !== path;
    if (!nx) return { me: ['wp04', 'put it to work, once a month'], with: ['wp04', 'put it to work, once a month'] };
    var o = { u: deep ? nx.u.replace(/\.html$/, '-in-depth.html') : nx.u, t: nx.code + ': ' + nx.t, n: nx.n };
    return { me: o, with: o };
  }
  // Part Three chapters name their own next chapter: use that link
  function partThreeRule(main) {
    var m = /^\/book\/understanding-(\d+)-/.exec(simplePath); if (!m) return null;
    var want = new RegExp('/book/understanding-' + (+m[1] + 1) + '-[a-z-]+\\.html$'), a = null;
    Array.prototype.some.call(main.querySelectorAll('a[href*="understanding-"]'), function (x) { if (want.test(x.getAttribute('href').split('#')[0])) { a = x; return true; } return false; });
    if (!a) return { me: 'selfpath', with: 'checkins' };
    var t = a.textContent.replace(/\s+/g, ' ').replace(/^.*?:\s*/, '').replace(/[→\s]+$/, '').trim();
    var o = { u: a.getAttribute('href'), t: 'Next chapter: ' + t, n: 'the next part of how people work' };
    return { me: o, with: o };
  }
  function tagRule() {
    for (var i = 0; i < TAG_NEXT.length; i++) if (TAG_NEXT[i][0].test(simplePath)) return TAG_NEXT[i][1];
    // a page about one kind of relationship: say one thing well
    return { me: ['signal', 'check a message before you send it'], with: 'checkins' };
  }
  function pick(spec) {
    if (!spec) return null;
    if (spec.u) return spec;
    var k = typeof spec === 'string' ? spec : spec[0], w = W[k]; if (!w) return null;
    return { u: w[0], t: w[1], n: typeof spec === 'string' ? w[2] : spec[1] };
  }
  var mainEl = null;
  function recommend() {
    var m = mode() || 'me';
    var rule = NEXT[simplePath] || bookRule() || (mainEl && partThreeRule(mainEl)) || wpRule() || tagRule();
    var nx = pick(rule[m] || rule.me), alt = pick(rule.alt);
    if (nx && pathOf(nx.u) === simplePath && !/#/.test(nx.u)) nx = null;
    if (!nx || (nx.u === W.ten[0] && tenDone())) nx = pick(m === 'with' ? 'checkins' : 'selfpath');
    if (pathOf(nx.u) === simplePath) nx = pick(m === 'with' ? 'six' : 'weather');
    // until the 10-minute path is done, it is the one other idea
    if (!alt && nx.u !== W.ten[0] && !tenDone()) alt = pick('ten');
    if (alt && (pathOf(alt.u) === pathOf(nx.u) || (pathOf(alt.u) === simplePath && !/#/.test(alt.u)))) alt = null;
    return { next: nx, alt: alt };
  }

  /* ---------------------------------------------------------------- "Done for now? See what you got" */
  var SKY_WORD = { clear: 'clear', gusty: 'gusty', fog: 'fogged in' };
  function isToday(ts) { if (!ts) return false; var d = new Date(+ts); return !isNaN(d) && d.toDateString() === new Date().toDateString(); }
  function keysLS() { var out = []; try { for (var i = 0; i < localStorage.length; i++) out.push(localStorage.key(i)); } catch (e) {} return out; }
  // what the tools keep on this device, by name
  var WP_TITLES = { 'WP-01': 'Who did what', 'WP-02': 'How much are you carrying?', 'WP-03': 'One owner per job', 'WP-04': 'What keeps coming back?',
    'WP-09': 'Say it so it lands', 'WP-11': 'The Calm-Down Kit', 'WP-13': 'The 90-second daily check-in' };
  function kept() {
    var out = [];
    keysLS().forEach(function (k) {
      var m = /^tol-wpf-keep:(.+)$/.exec(k); if (!m) return;
      var id = m[1];
      if (id.indexOf('suite') === 0) out.push('The Workpaper Suite');
      else if (id === 'fullpath') out.push('The workpaper package');
      else { var code = id.split(':')[0].toUpperCase(); out.push(WP_TITLES[code] || 'A workpaper'); }
    });
    if (lsGet('tol-wiring-card')) out.push('Your Wiring Card');
    if (lsGet('tol-wavelength-v1') || lsGet('tol-heartprint-v1')) out.push('Your Wavelength');
    var lem = json('tol-lemonade-stand-v2'); if (lem && !lem.example && lem.jobs && lem.jobs.some(function (j) { return j && j.name; })) out.push('Your Lemonade Stand list');
    if (lsGet('tol-ten-log-v1')) out.push('Your list of things you did');
    if (lsGet('tol-calc01-full-v2')) out.push('Is the setup working for everyone?');
    return out.filter(function (x, i) { return out.indexOf(x) === i; });
  }
  function didToday() {
    var out = [], t = ten(), done = Array.isArray(t.done) ? t.done.length : 0;
    if (t.day === today() && done) out.push(t.fin ? 'Finished Start in 10 minutes' : 'Start in 10 minutes: ' + done + ' of 4 steps');
    var a = json('tol-weather-v1'), e = Array.isArray(a) && a[a.length - 1];
    if (e && e.d === today()) out.push('Checked your weather' + (SKY_WORD[e.sky] ? ': ' + SKY_WORD[e.sky] : ''));
    BOOK.forEach(function (b) { if (isToday(S.read[b.u])) out.push('Read ' + b.code + ': ' + b.t); });
    Object.keys(S.did || {}).forEach(function (u) { if (isToday(S.did[u]) && TOOLS[u]) out.push('Tried the ' + TOOLS[u].t); });
    Object.keys(S.fin || {}).forEach(function (u) { var f = S.fin[u]; if (f && isToday(f.at) && f.t) out.push('Read to the end: ' + f.t); });
    if (S.tiny && S.tiny[today()]) out.push('Tried today’s tiny thing');
    return out.filter(function (x, i) { return out.indexOf(x) === i; }).slice(0, 8);
  }
  var MODE_LINE = { me: 'Just me. On your own is complete as it is.', with: 'With someone. Share this card with them if you like.' };
  function summary() {
    var r = recommend(), m = mode();
    return { did: didToday(), kept: kept(), tryIt: (ten().try || '').trim(), next: r.next, mode: m };
  }
  function summaryText(o, short) {
    var L = [];
    if (short) {
      if (o.did.length) L.push('Did: ' + o.did.slice(0, 3).join('; ') + '.');
      if (o.tryIt) L.push('Trying: ' + o.tryIt);
      L.push('Next: ' + o.next.t);
      return L.join('\n').slice(0, 300);
    }
    L.push('What I got today');
    if (o.mode) L.push(MODE_LINE[o.mode]);
    L.push('');
    L.push('What I did:');
    if (o.did.length) o.did.forEach(function (d) { L.push('- ' + d); }); else L.push('- Read and looked around. That counts.');
    if (o.tryIt) { L.push(''); L.push('One thing I will try: ' + o.tryIt); }
    L.push(''); L.push('My next step: ' + o.next.t + ' (' + location.origin + o.next.u + ')');
    return L.join('\n');
  }
  function doneHTML() {
    var o = summary();
    return '<p class="cb-done-h">What you got today</p>' +
      (o.mode ? '<p class="cb-done-mode">' + esc(MODE_LINE[o.mode]) + '</p>' : '') +
      '<p class="cb-k">What you did</p>' +
      (o.did.length ? '<ul class="cb-done-list">' + o.did.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>'
        : '<p class="cb-done-none">Nothing written down yet, and that is fine. Reading and looking around count.</p>') +
      (o.kept.length ? '<p class="cb-k">Kept on this device</p><p class="cb-done-kept">' + o.kept.map(esc).join(' · ') + '</p>' : '') +
      '<label class="cb-k cb-done-l" for="cb-done-try">One thing I’ll try</label>' +
      '<input type="text" id="cb-done-try" class="cb-done-try" maxlength="160" autocomplete="off" placeholder="Optional. Small is good." value="' + esc(o.tryIt) + '">' +
      '<p class="cb-k">Your next step</p><p class="cb-done-next"><a href="' + esc(o.next.u) + '">' + esc(o.next.t) + '</a> <span>' + esc(o.next.n) + '</span></p>' +
      '<p class="cb-done-btns"><button type="button" data-cb-copy>Copy text</button><button type="button" data-cb-print>Print</button>' +
      (window.TOLShareKit && window.TOLShareKit.saveImage ? '<button type="button" data-cb-img>Save as image</button>' : '') + '</p>' +
      '<p class="cb-done-say" role="status" aria-live="polite"></p>' +
      '<p class="cb-done-foot">Only on this device. Nothing to keep up: come back whenever you like. <a href="/on-this-device.html">What’s kept here</a></p>';
  }
  function copyText(text, say) {
    function fallback() {
      var ta = el('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; doc.body.appendChild(ta); ta.select();
      var ok = false; try { ok = doc.execCommand('copy'); } catch (e) {} ta.remove();
      say(ok ? 'Copied. Paste it anywhere you like.' : 'Copying didn’t work here. Select the words and copy them by hand.');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { say('Copied. Paste it anywhere you like.'); }, fallback); else fallback();
  }
  // print just the card: a copy of it on its own, the rest of the page hidden for the printer
  function printCard(card) {
    var old = doc.getElementById('cb-print-root'); if (old) old.remove();
    var host = el('div', { id: 'cb-print-root' }), c = card.cloneNode(true);
    c.hidden = false; c.removeAttribute('id');
    Array.prototype.forEach.call(c.querySelectorAll('input'), function (i) { var p = el('p', { class: 'cb-done-tryp' }); p.textContent = i.value || '—'; i.replaceWith(p); });
    host.appendChild(c); doc.body.appendChild(host); root.classList.add('cb-print');
    function done() { root.classList.remove('cb-print'); host.remove(); window.removeEventListener('afterprint', done); }
    window.addEventListener('afterprint', done);
    try { window.print(); } catch (e) {}
    setTimeout(function () { if (!window.matchMedia || !window.matchMedia('print').matches) done(); }, 1500);
  }
  function saveTry(v) {
    var t = ten(); t.try = String(v || '').slice(0, 160); if (!t.try) delete t.try;
    try { localStorage.setItem(TEN_KEY, JSON.stringify(t)); } catch (e) {}
  }

  var panel = null;
  function drawPanel() {
    if (!panel) return;
    var r = recommend(), m = mode(), card = panel.querySelector('.cb-done'), open = !!(card && !card.hidden);
    function mb(k, t) { return '<button type="button" data-cb-mode="' + k + '" aria-pressed="' + String(m === k) + '">' + t + '</button>'; }
    panel.innerHTML = '<p class="cb-k" id="cb-nx-h">Recommended next</p>' +
      '<p class="cb-nx-main"><a class="cb-nx-go" href="' + esc(r.next.u) + '">' + esc(r.next.t) + '</a> <span class="cb-nx-why">' + esc(r.next.n) + '</span></p>' +
      (r.alt ? '<p class="cb-nx-alt">Or: <a href="' + esc(r.alt.u) + '">' + esc(r.alt.t) + '</a> <span class="cb-nx-why">' + esc(r.alt.n) + '</span></p>' : '') +
      '<div class="cb-nx-foot"><span class="cb-nx-for" role="group" aria-labelledby="cb-nx-for-l"><span id="cb-nx-for-l">Ideas for</span> ' + mb('me', 'Just me') + mb('with', 'With someone') + '</span>' +
      '<button type="button" class="cb-nx-done" aria-expanded="' + open + '" aria-controls="cb-done">Done for now? See what you got</button></div>' +
      '<div class="cb-done" id="cb-done" tabindex="-1"' + (open ? '' : ' hidden') + '>' + (open ? doneHTML() : '') + '</div>';
  }
  function buildPanel(main) {
    panel = el('aside', { class: 'cb-nx tol-plain no-bubble no-dive no-cheer', 'aria-labelledby': 'cb-nx-h' });
    drawPanel();
    placeAtEnd(main, panel);
    panel.addEventListener('click', function (e) {
      var mb = e.target.closest('[data-cb-mode]');
      if (mb) { var k = mb.getAttribute('data-cb-mode'); setMode(k); var f = panel.querySelector('[data-cb-mode="' + k + '"]'); if (f) f.focus(); return; }
      var card = panel.querySelector('.cb-done'), say = function (t) { var s = panel.querySelector('.cb-done-say'); if (s) s.textContent = t; };
      if (e.target.closest('.cb-nx-done')) {
        var open = card.hidden;
        card.innerHTML = open ? doneHTML() : ''; card.hidden = !open;
        e.target.closest('.cb-nx-done').setAttribute('aria-expanded', String(open));
        if (open) try { card.focus({ preventScroll: true }); card.scrollIntoView({ block: 'nearest', behavior: still() ? 'auto' : 'smooth' }); } catch (x) {}
        return;
      }
      if (e.target.closest('[data-cb-copy]')) { copyText(summaryText(summary()), say); return; }
      if (e.target.closest('[data-cb-print]')) { printCard(card); return; }
      if (e.target.closest('[data-cb-img]')) {
        var K = window.TOLShareKit;
        if (K && K.saveImage) K.saveImage({ title: 'What I got today', text: summaryText(summary(), true) }).then(function () { say('Saved as an image.'); }, function () { say('The image couldn’t be made here. Try Copy text instead.'); });
      }
    });
    panel.addEventListener('input', function (e) { if (e.target.id === 'cb-done-try') saveTry(e.target.value); });
    doc.addEventListener('tol-mode', drawPanel);
    // reaching the end of a page counts as finishing it (shown only in "What you got today")
    if ('IntersectionObserver' in window && bookIdx(simplePath) < 0 && !TOOLS[path]) {
      var io = new IntersectionObserver(function (es) {
        if (!es.some(function (x) { return x.isIntersecting; })) return;
        io.disconnect();
        var h = doc.querySelector('main h1'), t = h ? h.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
        if (!t) return;
        S.fin = S.fin || {}; S.fin[path] = { t: t, at: Date.now() };
        var ks = Object.keys(S.fin); if (ks.length > 40) { ks.sort(function (a, b) { return S.fin[a].at - S.fin[b].at; }); delete S.fin[ks[0]]; }
        save();
      }, { threshold: 0.5 });
      io.observe(panel);
    }
  }
  // the end card of a tool or chapter keeps the recommended next right under it
  function nextUnder(box) { if (panel && box && box.parentNode && box.nextElementSibling !== panel) box.after(panel); }

  var NO_NEXT = /^\/(index|start-in-10-minutes|start-here|contents|by-relationship|library|whats-new|roadmap|brand|install|about|glossary|research|podcast-index|safety|upset-right-now|ask|ways-in|suite-index|program|program-overview|curriculum|prog-01|en-espanol|reading|surprise|quest|pause-and-play|infographic|search|frequency-buddies[a-z0-9-]*|pal-cam[a-z-]*|frequency-journey[a-z-]*)(-in-depth)?\.html$|^\/book\/topic-/;
  function wantsNext(main) {
    if (NO_NEXT.test(path) || !/^en/i.test(root.getAttribute('lang') || 'en')) return false;
    if (GAME_PAGES.test(path) || doc.body.classList.contains('is-game')) return false;
    return main.classList.contains('read') || main.classList.contains('sheet') || !!NEXT[simplePath] || /^\/(workpapers|book)\//.test(path);
  }

  /* ---------------------------------------------------------------- end cards */
  function endCard(label) {
    return el('aside', { class: 'cb-end cb-extra no-bubble no-cheer', 'aria-label': label || 'What you got from this' });
  }
  function fillEnd(box, gain, next, extra) {
    box.innerHTML = '<p class="cb-k">What you got from this</p><p class="cb-benefit">' + esc(gain) + '</p>' +
      (next ? '<p class="cb-next"><span class="cb-k">Next time</span> <a href="' + esc(next[0]) + '">' + esc(next[1]) + '</a>' + (next[2] ? ' <span class="cb-next-n">' + esc(next[2]) + '</span>' : '') + '</p>' : '') +
      '<p class="cb-mini">' + (extra || '') + '<span data-cb-garden></span></p>';
    whenRewards(function () { var g = box.querySelector('[data-cb-garden]'); if (g) g.innerHTML = gardenLine() ? gardenLine() + ' ' : ''; });
    if (!still()) { box.classList.add('cb-in'); }
  }
  function placeAtEnd(main, box) {
    var grow = main.querySelector(':scope > .growing-note, :scope > aside.growing-note');
    if (grow) main.insertBefore(box, grow); else main.appendChild(box);
  }

  function bookPage(main) {
    var i = bookIdx(simplePath); if (i < 0) return;
    var b = BOOK[i];
    var box = endCard();
    placeAtEnd(main, box);
    nextUnder(box);
    function draw() { fillEnd(box, b.gain, null, '<span>' + chaptersRead() + ' of ' + BOOK.length + ' chapters read.</span> '); }
    draw();
    // read: the end of the chapter came into view
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        if (!es.some(function (e) { return e.isIntersecting; })) return;
        io.disconnect();
        if (!S.read[b.u]) { S.read[b.u] = Date.now(); save(); draw(); }
        celebrate('read:' + b.u, b.code + ' read', false);
      }, { threshold: 0.6 });
      io.observe(box);
    }
  }

  function toolPage(main) {
    var T = TOOLS[path]; if (!T) return;
    var box = null;
    function check() {
      var anchor = T.result();
      if (!anchor) return;
      if (!box) {
        box = endCard();
        if (T.atEnd || anchor === main) placeAtEnd(main, box); else anchor.after(box);
        fillEnd(box, T.gain, null, '');
        nextUnder(box);
        if (!S.did[path]) { S.did[path] = Date.now(); save(); }
        celebrate('tool:' + path, 'You tried the ' + T.t, true);
      }
    }
    check();
    var t = null;
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(check, 400); }).observe(main, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] });
    if (path === '/quick-checks.html' || T.atEnd) setInterval(check, 2500);
  }

  function gamePage(main) {
    var box = null, game = '';
    GAMES.forEach(function (g) { if (g[2] === path) game = g[1]; });
    function show() {
      var played = gamesPlayed(), other = null;
      GAMES.forEach(function (g) { if (!other && g[2] !== path && !played[g[1]] && g[2] !== '/night-garden.html') other = g; });
      var next = other ? [other[2], other[1], '— another calm game, for next time'] : ['/pause-and-play.html', 'All the calm games', ''];
      if (!box) { box = endCard('What you got from this game'); placeAtEnd(main, box); }
      fillEnd(box, 'You just took a few calm minutes for yourself. That counts.', next, '');
    }
    whenRewards(function (R) {
      if (!R || R._cbWrapped) return;
      var orig = R.earn; R._cbWrapped = true;
      R.earn = function (n, source) { var r = orig.apply(R, arguments); if (source !== 'come-back' && source !== 'learn-play') try { setTimeout(show, 50); } catch (e) {} return r; };
    });
  }

  function buddiesPage(main) {
    var box = null, seen = JSON.stringify(buddies().watched || {});
    function show(fresh) {
      var w = episodesWatched(); if (!w.length) return;
      var lastId = buddies().last, ep = null;
      w.forEach(function (e) { if (e[0] === lastId) ep = e; });
      ep = ep || w[w.length - 1];
      var ne = nextEpisode();
      var next = ne ? ['/frequency-buddies.html?ep=' + ne[0], 'Episode ' + (EPISODES.indexOf(ne) + 1) + ': ' + ne[1], ''] : ['/frequency-buddies-shuffle.html', 'Frequency Buddies Shuffle', '— your favorite moments, mixed up'];
      if (!box) { box = endCard('What you got from Frequency Buddies'); var after = main.querySelector('[data-buddies-script]') || main.querySelector('.fbp-player'); if (after) after.after(box); else main.appendChild(box); }
      fillEnd(box, ep[2], next, '<span>' + w.length + ' of ' + EPISODES.length + ' episodes watched.</span> ');
      if (fresh) celebrate('ep:' + ep[0], 'An episode with the pals', false);
    }
    show(false);
    setInterval(function () {
      if (root.classList.contains('fb-streaming')) return;
      var now = JSON.stringify(buddies().watched || {});
      if (now !== seen) { seen = now; show(true); }
    }, 3000);
  }

  function homePage(main) {
    var tp = main.querySelector('[data-cb-time]');
    if (tp) timePicker(tp);
    // remember the situation picked in "Start where you are", so plans can lean that way
    main.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.sw-opt[data-id]');
      if (b) setTimeout(function () { if (b.getAttribute('aria-pressed') === 'true') { S.sit = b.getAttribute('data-id'); save(); } }, 0);
    });
    if (helpersOff()) return;
    var wrap = el('div', { class: 'cb-home cb-extra' });
    wrap.appendChild(tinyCard());
    var st = main.querySelector('.announce-stack'), at = st;
    while (at && at.nextElementSibling && /tol-pickup-host|tol-offer/.test(at.nextElementSibling.className)) at = at.nextElementSibling;
    if (at) at.after(wrap); else main.appendChild(wrap);
  }

  var HUBS = /^\/(pause-and-play|contents|start-here|learn\/index|quest)\.html$/;
  function start() {
    var main = doc.querySelector('main') || doc.querySelector('[role="main"]'); if (!main) return;
    if (isHome) return homePage(main);
    mainEl = main;
    // one recommended next step, also with the helpers hidden (it is the way on, not an extra)
    if (wantsNext(main)) buildPanel(main);
    if (helpersOff()) return;
    if (bookIdx(simplePath) >= 0) return bookPage(main);
    if (TOOLS[path]) return toolPage(main);
    if (path === '/frequency-buddies.html') return buddiesPage(main);
    if (GAME_PAGES.test(path) || (doc.body.classList.contains('is-game') && !HUBS.test(path))) return gamePage(main);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();

  window.TOLComeBack = { plan: plan, state: function () { return JSON.parse(JSON.stringify(S)); }, mode: mode, setMode: setMode, recommend: recommend, didToday: didToday };
})();
