/* come-back.js — a kind reason to come back, kept on this device only.
   - Home page: "How much time do you have?" (1, 5, 10, 15 or 30+ minutes) turns into a short plan of
     one to four steps that add up to the time picked. The ideas come from the menu's time launcher (pick-up.js) plus a few more,
     lean toward what you picked in "Start where you are" or opened lately, and change each visit.
     The last choice is remembered here ("Welcome back. 5 minutes again?").
   - Home page: "Today's tiny thing" (one small practice a day).
   - Book chapters, tools, calm games and Frequency Buddies: a short "What you got from this" line
     at the natural end, and a "Next time" idea.
   It mostly reads what the site already keeps here (recent pages, Check yourself petals, garden
   levels, episodes, tool drafts) and adds one small key, tol-come-back-v1, for the rest.
   No streaks to keep, no timers, nothing to lose: pick up anytime. Nothing is sent anywhere.
   "Hide the helpers" and Quiet mode hide the extras (the time picker stays); a still page never moves. */
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
  var S = { time: null, sit: null, days: [], read: {}, did: {}, earned: {}, tiny: {}, visits: 0 };
  (function () { var o = json(KEY); if (o && typeof o === 'object') for (var k in o) S[k] = o[k]; })();
  function save() { lsSet(KEY, JSON.stringify(S)); }
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
      next: ['/conversation-reader.html', 'The Conversation Reader', 'for a talk that already went sideways'], result: function () { var r = doc.getElementById('results'); return r && !r.hidden && r.textContent.trim().length > 20 ? r : null; } },
    '/conversation-reader.html': { t: 'Conversation Reader', gain: 'You just looked at a talk from both sides, without blaming anyone.',
      next: ['/signal-translator.html', 'The Signal Translator', 'to test your next message before you send it'], result: function () { var r = doc.getElementById('cr-out'); return r && r.textContent.trim().length > 20 ? r : null; } },
    '/carrier-wave-decoder.html': { t: 'Carrier Wave Decoder', gain: 'You just worked out what slipped in a talk, not who started it.',
      next: ['/check-ins.html', 'Check-ins', 'how to raise it once, calmly, at a good time'], result: function () { var r = doc.getElementById('result'); return r && !r.hidden ? r : null; } },
    '/lemonade-stand.html': { t: 'Lemonade Stand', gain: 'You just put the work where everyone can see it. That is the first step to sharing it.',
      next: ['/workpapers/wp-03-one-owner-per-job.html', 'One owner per job (WP-03)', 'so nothing falls between you'], result: function () { var r = doc.getElementById('balance-line'); return r && (r.hasAttribute('data-ls-result') || (r.textContent.trim() && !/^(Add some hours|Waiting for)/i.test(r.textContent.trim()) && !/\bWaiting for\b/.test(r.textContent))) && !/\bWaiting for\b/.test(r.textContent) ? (doc.querySelector('.ls-tools') || r) : null; } },
    '/quick-checks.html': { t: 'Today’s Weather', gain: 'You just checked in with yourself first. Knowing your weather makes the rest of the day easier to plan.',
      next: ['/quick-checks.html#today', 'Check again tomorrow', 'a few days in, your own pattern starts to show'], result: function () {
        var a = json('tol-weather-v1'), e = Array.isArray(a) && a[a.length - 1]; return e && e.d === today() ? doc.getElementById('today') : null; } },
    '/wavelength.html': { t: 'Wavelength', gain: 'You just learned something about how you take things in, and how to say it to the people you love.',
      next: ['/wiring-card.html', 'Your Wiring Card', 'to share it on one page'], result: function () { return lsGet('tol-wavelength-v1') ? doc.querySelector('main') : null; }, atEnd: true },
    '/wiring-card.html': { t: 'Wiring Card', gain: 'You just put how you work into words someone else can read.',
      next: ['/wavelength.html', 'Wavelength', 'to go deeper into how you think, talk and listen'], result: function () { return lsGet('tol-wiring-card') ? doc.querySelector('main') : null; }, atEnd: true }
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
        { t: 'Fill in the Lemonade Stand with your partner', u: '/lemonade-stand.html', m: 10, why: 'jobs and hours side by side, together', tag: 'load' },
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
        '<p class="cb-plan-h">' + (welcome ? 'Your ' + LABEL[min] + ' plan, fresh for today' : 'Your ' + LABEL[min] + ' plan') + '</p>' +
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
        if (q) { q.setAttribute('data-q', q.textContent); q.textContent = 'Welcome back. ' + NICE[last].replace(' or more', '+').replace(/^./, function (c) { return c.toUpperCase(); }) + ' again?'; }
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
    var nc = nextChapter(), ne = nextEpisode(), tools = toolsTried(), w = wanted();
    if (w.kids && ne) return ['/frequency-buddies.html?ep=' + ne[0], 'Episode ' + (EPISODES.indexOf(ne) + 1) + ': ' + ne[1], 'with Tidbit and Sugarfoot'];
    if (nc && chaptersRead()) return [nc.u, nc.code + ': ' + nc.t, nc.n];
    if (tools.indexOf('/quick-checks.html') === -1) return ['/quick-checks.html#today', 'Today’s Weather', 'one minute on how you are doing'];
    if (tools.indexOf('/wavelength.html') === -1) return ['/wavelength.html', 'Find your Wavelength', 'how you think, talk and listen'];
    if (nc) return [nc.u, nc.code + ': ' + nc.t, nc.n];
    if (ne) return ['/frequency-buddies.html?ep=' + ne[0], 'Episode ' + (EPISODES.indexOf(ne) + 1) + ': ' + ne[1], 'with Tidbit and Sugarfoot'];
    return ['/prog-01.html', 'Six gentle weeks', 'one small session a week'];
  }
  function anything() { return chaptersRead() || toolsTried().length || Object.keys(gamesPlayed()).length || episodesWatched().length || petals(); }
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
    var b = BOOK[i], deep = simplePath !== path, nx = BOOK[i + 1];
    var next = nx ? [deep ? nx.u.replace(/\.html$/, '-in-depth.html') : nx.u, nx.code + ': ' + nx.t, '— ' + nx.n]
      : ['/workpapers/wp-04-what-keeps-coming-back.html', 'Put it to work: What keeps coming back? (WP-04)', '— one short page, once a month'];
    var box = endCard();
    placeAtEnd(main, box);
    function draw() { fillEnd(box, b.gain, next, '<span>' + chaptersRead() + ' of ' + BOOK.length + ' chapters read.</span> '); }
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
        fillEnd(box, T.gain, T.next, '');
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
    var main = doc.querySelector('main'); if (!main) return;
    if (isHome) return homePage(main);
    if (helpersOff()) return;
    if (bookIdx(simplePath) >= 0) return bookPage(main);
    if (TOOLS[path]) return toolPage(main);
    if (path === '/frequency-buddies.html') return buddiesPage(main);
    if (GAME_PAGES.test(path) || (doc.body.classList.contains('is-game') && !HUBS.test(path))) return gamePage(main);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();

  window.TOLComeBack = { plan: plan, state: function () { return JSON.parse(JSON.stringify(S)); } };
})();
