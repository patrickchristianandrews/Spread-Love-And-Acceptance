/* site-chat.js — a small on-device chat that answers only from this site's own pages.
   Nothing typed here ever leaves the browser: there are no network requests with it,
   and the only thing kept is this tab's conversation (sessionStorage, cleared when the tab closes).
   The passages live in chat-kb.js (built by tools/chat/build_kb.py), loaded on first use.

   window.TOLChat.open(opts)       opens the chat as a bottom sheet (phones) or floating panel
   window.TOLChat.close()
   window.TOLChat.mount(el, opts)  puts the chat inline inside el (used by /ask.html)
   opts: { name, emoji, svg, color, greeting, topic }
   Add ?chat=1 to a page's address to open the chat on load. */
(function () {
  'use strict';
  if (window.TOLChat) return;

  var SELF = document.currentScript && document.currentScript.src;
  var KB_URL = SELF ? SELF.replace(/site-chat\.js(\?.*)?$/, 'chat-kb.js') : '/assets/js/chat-kb.js';
  // the background notes: related reading that isn't a page on this site, fetched only when needed
  var BG_URL = KB_URL.replace(/chat-kb\.js$/, 'chat-kb-bg.js');
  var STORE_KEY = 'tol-chat-v1';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PRIVACY_LINE = 'Answers come from this site’s pages and the Professor’s notes. What you type stays on this device.';

  var DEFAULT_CHAR = {
    name: 'Professor Puddles',
    color: '#7FA88A',
    greeting: 'Hi, I’m Professor Puddles! Ask me about anything in the program, like a tool, a workpaper or what a score means. Or tell me what’s going on, with yourself or someone else, and I’ll suggest a few kind next steps, with links to the right pages.'
  };

  // ------------------------------------------------------------------ text helpers
  var STOP = {};
  ('a about above after again all also am an and any are as at be because been before being below between both but by ' +
   'can could did do does doing done down during each few for from further get got had has have having he her here hers him his how ' +
   'i if im in into is it its itself just let lets me might mine more most much my myself need no nor not now of off on once only or ' +
   'other our ours out over own please really same say she should so some such tell than thank thanks that thats the their them then there ' +
   'these they this those through to too under until up us very want was way we were what whats when where which while who whom why ' +
   'will with would you your youre yours yourself ive id dont doesnt didnt isnt arent cant wont wasnt ok okay know think something anything ' +
   'never always everything everyone anything nothing someone somebody everybody thing things one explain means mean define describe site page pages talk bit like lot kind sort ever even still well yes yeah')
    .split(' ').forEach(function (w) { STOP[w] = 1; });

  function fold(s) {
    return String(s || '').toLowerCase()
      .replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"')
      .replace(/\b(wp|calc|prog|report)\s*-?\s*0*(\d{1,2})\b/g, function (m, a, n) { return a + (n.length < 2 ? '0' : '') + n; })
      .replace(/\bworkpaper\s+0*(\d{1,2})\b/g, function (m, n) { return 'wp' + (n.length < 2 ? '0' : '') + n; })
      .replace(/([a-z0-9])-(?=[a-z0-9])/g, '$1')
      .replace(/'s\b/g, '').replace(/'/g, '');
  }
  // put back a dropped silent e on short stems, so "caring" is care (not car) and "hoping" is hope
  function silentE(w) { return /^[^aeiou]*[aeiou][^aeiouwxy]$/.test(w) ? w + 'e' : w; }
  function stem(w) {
    if (w.length <= 3 || /\d/.test(w)) return w;
    if (/ies$/.test(w) && w.length > 4) return w.slice(0, -3) + 'y';
    if (/(ss|us|is)$/.test(w)) return w;
    if (/ing$/.test(w) && w.length > 5) { w = w.slice(0, -3); if (/([^lsz])\1$/.test(w)) w = w.slice(0, -1); else w = silentE(w); }
    else if (/ed$/.test(w) && w.length > 4) { w = w.slice(0, -2); if (/([^lsz])\1$/.test(w)) w = w.slice(0, -1); else w = silentE(w); }
    else if (/(sh|ch|x|z)es$/.test(w)) w = w.slice(0, -2);
    else if (/s$/.test(w)) w = w.slice(0, -1);
    if (/[^aeiou]ly$/.test(w) && w.length >= 6) w = w.slice(0, -2);
    if (/(ism|iz|is)$/.test(w) && w.length >= 8) w = w.replace(/(ism|iz|is)$/, '');
    if (/e$/.test(w) && w.length > 4) w = w.slice(0, -1);
    if (/y$/.test(w) && w.length > 4) w = w.slice(0, -1) + 'i';
    return w;
  }
  function words(s) { return fold(s).match(/[a-z0-9]+/g) || []; }
  function tokens(s, keepStop) {
    var out = [];
    words(s).forEach(function (w) { if (keepStop || !STOP[w]) out.push(stem(w)); });
    return out;
  }
  function phraseKey(s) {
    return words(s).filter(function (w) { return !/^(the|a|an|your|my|our)$/.test(w); }).map(stem).join(' ');
  }
  function wc(s) { return (String(s).match(/\S+/g) || []).length; }
  function sentences(s) {
    return String(s).split(/\n+/).reduce(function (acc, para) {
      return acc.concat(para.match(/[^.!?…]+(?:[.!?…]+[”"’)]*|$)/g) || [para]);
    }, []).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function safePath(u) { return typeof u === 'string' && /^\/[A-Za-z0-9._\-\/]*(#[A-Za-z0-9._\-:]*)?$/.test(u) && u.indexOf('//') === -1; }

  var ROLE = {};
  'partner partners husband wife spouse boyfriend girlfriend mom mum dad mother father parent parents son daughter kid kids child children brother sister sibling family friend friends roommate roommates flatmate housemate boss coworker coworkers colleague manager team people person he she they him her them we'
    .split(' ').forEach(function (w) { ROLE[stem(w)] = 1; });

  // ------------------------------------------------------------------ knowledge base + index
  var KB = null, IDX = null, kbWaiting = [];
  function loadKB(cb) {
    if (IDX) return cb(true);
    kbWaiting.push(cb);
    if (kbWaiting.length > 1) return;
    function done(ok) { if (ok && window.TOL_CHAT_KB) { KB = window.TOL_CHAT_KB; buildIndex(); } var w = kbWaiting; kbWaiting = []; w.forEach(function (f) { f(!!IDX); }); }
    if (window.TOL_CHAT_KB) return done(true);
    var sc = document.createElement('script');
    sc.src = KB_URL; sc.async = true;
    sc.onload = function () { done(true); };
    sc.onerror = function () { done(false); };
    document.head.appendChild(sc);
  }

  function buildIndex() {
    var docs = KB.docs, N = docs.length, df = {}, total = 0;
    var tf = new Array(N), len = new Array(N), head = new Array(N);
    docs.forEach(function (d, i) {
      var f = {};
      function add(list, w) { list.forEach(function (t) { f[t] = (f[t] || 0) + w; }); }
      var body = tokens(d.x);
      add(body, 1);
      add(tokens(d.h), d.g ? 3 : 1.5);
      if (d.t !== d.h) add(tokens(d.t), 1);
      add(tokens(d.k), d.g ? 2 : 0.6);
      tf[i] = f; len[i] = body.length; total += body.length;
      head[i] = {}; tokens(d.h).forEach(function (t) { head[i][t] = 1; });
      Object.keys(f).forEach(function (t) { df[t] = (df[t] || 0) + 1; });
    });
    var syn = {};
    Object.keys(KB.syn || {}).forEach(function (k) {
      var kt = tokens(k, true);
      if (!kt.length) return;
      var key = kt.length === 1 ? kt[0] : ' ' + words(k).join(' ') + ' ';  // phrases are matched on the words themselves
      var rel = [];
      KB.syn[k].forEach(function (p) { tokens(p).forEach(function (t) { if (rel.indexOf(t) === -1 && t !== key) rel.push(t); }); });
      syn[key] = (syn[key] || []).concat(rel);
    });
    // glossary phrases for "what is X" questions
    var gloss = {};
    docs.forEach(function (d, i) {
      if (!d.g) return;
      var names = (d.m || []).concat([d.t, d.t.replace(/\s*\(.*?\)\s*/g, ' ')]);
      (d.t.match(/\((.*?)\)/g) || []).forEach(function (p) { names.push(p.slice(1, -1)); });
      var t2 = d.t.split(/[:(]/)[0]; names.push(t2);
      names.forEach(function (n) { var k = phraseKey(n); if (k && !(k in gloss)) gloss[k] = i; });
    });
    // the site's own topic words: anything in a heading, a title or a synonym list
    var domain = {};
    docs.forEach(function (d, i) { Object.keys(head[i]).forEach(function (t) { domain[t] = 1; }); tokens(d.t).forEach(function (t) { domain[t] = 1; }); });
    Object.keys(syn).forEach(function (k) { if (k.charAt(0) !== ' ') domain[k] = 1; syn[k].forEach(function (t) { domain[t] = 1; }); });
    Object.keys(domain).forEach(function (t) { if (t.length >= 7) domain['~' + t.slice(0, 7)] = 1; });  // procrastinating ~ procrastination
    // the background notes' names (the notes themselves load later): "what is X" can find them, and their
    // topic words count as on-topic, so a question about, say, emotional granularity isn't turned away
    var bgNames = {};
    (KB.bgi || []).forEach(function (e) {
      [e[1]].concat(e[2] || []).forEach(function (n) { var k = phraseKey(n); if (k && !(k in bgNames)) bgNames[k] = e[0]; });
      tokens(e[1]).forEach(function (t) { domain[t] = 1; });
    });
    // program cards: their names, and every word in them, are the program's own vocabulary
    var cardKeys = [];
    (KB.cards || []).forEach(function (c, ci) {
      (c.keys || []).forEach(function (k) {
        var broad = k.charAt(0) === '~', w = words(broad ? k.slice(1) : k).join(' ');
        if (w) cardKeys.push({ k: ' ' + w + ' ', n: w.length, c: ci, broad: broad, t: tokens(w, true) });
      });
      (c.keys || []).concat([c.name || '']).forEach(function (k) { tokens(k).forEach(function (t) { domain[t] = 1; }); });
      if (c.pat) { try { c.re = new RegExp(c.pat); } catch (e) { c.re = null; } }
    });
    cardKeys.sort(function (a, b) { return b.n - a.n; });
    var sit = KB.sit || { who: {}, issues: {}, combos: {} };
    Object.keys(sit.who).forEach(function (k) { try { sit.who[k].re = new RegExp(sit.who[k].match); } catch (e) { sit.who[k].re = /$^/; } });
    Object.keys(sit.issues).forEach(function (k) {
      sit.issues[k].res = (sit.issues[k].match || []).map(function (m) { try { return [new RegExp(m[0]), m[1]]; } catch (e) { return [/$^/, 0]; } });
    });
    (KB.clar || []).forEach(function (c) { try { c.re = new RegExp(c.pat); } catch (e) { c.re = /$^/; } });
    IDX = { N: N, df: df, tf: tf, len: len, head: head, avg: total / N, syn: syn, gloss: gloss, domain: domain,
      bgNames: bgNames, cardKeys: cardKeys, sit: sit, bg: null };
  }

  // ------------------------------------------------------------------ background notes (lazy)
  var bgWaiting = [], bgTried = false;
  function loadBG(cb) {
    if (IDX && IDX.bg) return cb(true);
    if (bgTried && !bgWaiting.length) return cb(false);
    bgWaiting.push(cb);
    if (bgWaiting.length > 1) return;
    bgTried = true;
    function done() {
      if (window.TOL_CHAT_BG && IDX && !IDX.bg) buildBG(window.TOL_CHAT_BG);
      var w = bgWaiting; bgWaiting = []; w.forEach(function (f) { f(!!(IDX && IDX.bg)); });
    }
    if (window.TOL_CHAT_BG) return done();
    var sc = document.createElement('script');
    sc.src = BG_URL; sc.async = true;
    sc.onload = done; sc.onerror = done;
    document.head.appendChild(sc);
  }
  function buildBG(data) {
    var docs = data.docs || [], df = {}, tf = [], len = [], total = 0, byId = {};
    docs.forEach(function (d, i) {
      var f = {};
      function add(list, w) { list.forEach(function (t) { f[t] = (f[t] || 0) + w; }); }
      var body = tokens(d.x.join(' '));
      add(body, 1); add(tokens(d.t), 4); add(tokens((d.a || []).join(' ')), 2.5); add(tokens(d.p || ''), 0.4);
      tf.push(f); len.push(body.length); total += body.length; byId[d.id] = i;
      Object.keys(f).forEach(function (t) { df[t] = (df[t] || 0) + 1; });
    });
    IDX.bg = { docs: docs, df: df, tf: tf, len: len, avg: total / Math.max(1, docs.length), N: docs.length, byId: byId };
  }
  function bgSearch(q) {
    var B = IDX.bg, base = tokens(q), terms = [], seen = {};
    base.forEach(function (t) { if (!seen[t]) { seen[t] = 1; terms.push({ t: t, w: 1, src: t }); } });
    base.forEach(function (t) { (IDX.syn[t] || []).forEach(function (s) { if (!seen[s]) { seen[s] = 1; terms.push({ t: s, w: 0.4, src: t }); } }); });
    function bidf(t) { var n = B.df[t] || 0; return Math.log(1 + (B.N - n + 0.5) / (n + 0.5)); }
    var baseIdf = 0; base.forEach(function (t, j) { if (base.indexOf(t) === j && !ROLE[t]) baseIdf += bidf(t); });
    var hits = [];
    for (var i = 0; i < B.N; i++) {
      var f = B.tf[i], s = 0, covered = {};
      terms.forEach(function (tt) {
        var n = f[tt.t]; if (!n) return;
        s += tt.w * bidf(tt.t) * (n * 2.3) / (n + 1.3 * (0.3 + 0.7 * B.len[i] / B.avg));
        if (!ROLE[tt.src]) covered[tt.src] = Math.max(covered[tt.src] || 0, tt.w >= 1 ? 1 : 0.6);
      });
      if (!s) continue;
      var cov = 0; Object.keys(covered).forEach(function (src) { cov += covered[src] * bidf(src); });
      cov = baseIdf ? cov / baseIdf : 0;
      hits.push({ i: i, s: s * (0.5 + 0.7 * cov), cov: cov });
    }
    hits.sort(function (a, b) { return b.s - a.s; });
    return hits;
  }
  function idf(t) { var n = IDX.df[t] || 0; return Math.log(1 + (IDX.N - n + 0.5) / (n + 0.5)); }

  // prefer is one path prefix or a list of them (earlier in the list wins ties); -1 when u matches none
  function preferRank(prefer, u) {
    var list = typeof prefer === 'string' ? [prefer] : prefer;
    for (var i = 0; i < list.length; i++) if (u.indexOf(list[i]) === 0) return i;
    return -1;
  }

  // Rank every passage for a query. Returns {hits:[{i,s,cov}], terms}
  function search(q, opts) {
    opts = opts || {};
    var base = tokens(q), seen = {}, terms = [];
    base.forEach(function (t) { if (!seen[t]) { seen[t] = 1; terms.push({ t: t, w: 1, src: t }); } });
    base.forEach(function (t) {
      (IDX.syn[t] || []).forEach(function (s) { if (!seen[s]) { seen[s] = 1; terms.push({ t: s, w: 0.45, src: t }); } });
    });
    var qw = ' ' + words(q).join(' ') + ' ';
    Object.keys(IDX.syn).forEach(function (k) {
      if (k.charAt(0) !== ' ' || qw.indexOf(k) === -1) return;
      IDX.syn[k].forEach(function (s) { if (!seen[s]) { seen[s] = 1; terms.push({ t: s, w: 1, src: s }); base.push(s); } });
    });
    if (!terms.length) return { hits: [], terms: [] };
    var k1 = 1.3, b = 0.7, docs = KB.docs, hits = [];
    var qFold = ' ' + words(q).filter(function (w) { return !STOP[w]; }).join(' ') + ' ';
    // who-words (mom, boss, partner…) say who it's about; the rest says what it's about
    function cw(t) { return ROLE[t] ? 0.5 : 1; }
    var baseIdf = 0; base.forEach(function (t, j) { if (base.indexOf(t) === j) baseIdf += idf(t) * cw(t); });
    var wantTip = /\btips?\b/.test(fold(q));
    for (var i = 0; i < IDX.N; i++) {
      var f = IDX.tf[i], s = 0, covered = {};
      for (var j = 0; j < terms.length; j++) {
        var tt = terms[j], n = f[tt.t];
        if (!n) continue;
        var id = idf(tt.t);
        s += tt.w * id * (n * (k1 + 1)) / (n + k1 * (1 - b + b * IDX.len[i] / IDX.avg));
        covered[tt.src] = Math.max(covered[tt.src] || 0, tt.w >= 1 ? 1 : 0.6);
      }
      if (!s) continue;
      var cov = 0; Object.keys(covered).forEach(function (src) { cov += covered[src] * idf(src) * cw(src); });
      cov = baseIdf ? cov / baseIdf : 0;
      var d = docs[i];
      if (d.g) s *= opts.define ? 1.7 : 1.25;
      if (d.tip) s *= wantTip ? 1.6 : 0.55;
      if (d.d) s *= 0.95;
      if (opts.prefer && preferRank(opts.prefer, d.u) >= 0) s *= 3 + 0.4 / (1 + preferRank(opts.prefer, d.u));
      // an everyday word whose site word is this passage's heading: a strong sign it's the right one
      var hd = IDX.head[i];
      if (d.g) for (var jj = 0; jj < terms.length; jj++) if (terms[jj].w < 1 && hd[terms[jj].t]) { s *= 1.35; break; }
      if (/^[\uD800-\uDBFF]/.test(d.h)) s *= 0.8;  // emoji-led listings (episode lists and the like)
      // phrase bonus: two or more query words appearing together
      if (qFold.split(' ').length > 3) {
        var hx = ' ' + words(d.h + ' ' + d.x).join(' ') + ' ';
        var qw = qFold.trim().split(' ');
        for (var p = 0; p + 1 < qw.length; p++) if (hx.indexOf(' ' + qw[p] + ' ' + qw[p + 1] + ' ') !== -1) { s *= 1.15; }
      }
      s *= 0.6 + 0.6 * cov;
      hits.push({ i: i, s: s, cov: cov });
    }
    hits.sort(function (a, b2) { return b2.s - a.s; });
    return { hits: hits, terms: terms, base: base };
  }

  // "what is X" and friends → X
  function definitionTarget(q) {
    var f = fold(q).replace(/[?!.]+\s*$/, '').trim();
    var m = f.match(/^(?:so\s+)?(?:what|whats|wat)\s+(?:(?:is|are|was|does|do)\s+)?(?:(?:a|an|the)\s+)?(.+?)(?:\s+(?:mean|means|stand for|about))?$/) ||
            f.match(/^(?:define|definition of|meaning of|explain|what is meant by|tell me about|who is|who are)\s+(?:(?:a|an|the)\s+)?(.+)$/) ||
            f.match(/^(.+?)\s*(?:means what|meaning)$/);
    return m ? m[1].trim() : null;
  }
  function glossaryFor(phrase) {
    if (!phrase) return -1;
    var k = phraseKey(phrase);
    if (k in IDX.gloss) return IDX.gloss[k];
    return -1;
  }

  // ------------------------------------------------------------------ composing answers
  // Best few sentences of a passage for this query: 2–4 sentences, about 40–90 words.
  function excerpt(doc, qterms) {
    if (doc.g) return doc.x.split('\n').slice(0, 3);
    var ss = sentences(doc.x);
    if (ss.length <= 3 && wc(doc.x) <= 95) return [doc.x];
    var tset = {}; (qterms || []).forEach(function (t) { tset[t.t] = t.w; });
    var best = 0, bestS = -1;
    ss.forEach(function (s, i) {
      var sc = 0; tokens(s).forEach(function (t) { if (tset[t]) sc += tset[t] * idf(t); });
      if (sc > bestS) { bestS = sc; best = i; }
    });
    var start = best, end = best, n = wc(ss[best]);
    while (n < 45 && (end + 1 < ss.length || start > 0)) {
      if (end + 1 < ss.length) { end++; n += wc(ss[end]); }
      else { start--; n += wc(ss[start]); }
    }
    while (end + 1 < ss.length && n + wc(ss[end + 1]) <= 90) { end++; n += wc(ss[end]); }
    if (start > 0 && n < 60 && n + wc(ss[start - 1]) <= 90) { start--; }
    var text = ss.slice(start, end + 1).join(' ');
    return [(start > 0 ? '… ' : '') + text + (end < ss.length - 1 ? ' …' : '')];
  }

  var LEAD_FIRST = ['Here’s what the site says:', 'The site puts it like this:', 'Here’s the gist, from the site:', 'This part of the site fits:'];
  var LEAD_MORE = ['Related, and worth knowing:', 'It also connects to this:', 'Another page adds:'];
  var LEAD_NEXT = ['Here’s a bit more on that:', 'Another part of the site on this:', 'There’s more here too:'];

  function passageBlock(i, qterms) {
    var d = KB.docs[i];
    return { k: 'passage', i: i, h: d.tip ? 'A little tip' : d.h, src: d.tip ? '' : d.t, x: excerpt(d, qterms), u: safePath(d.u) ? d.u : '', l: d.l || '' };
  }

  // Follow-up chips: glossary terms mentioned in what was shown, then headings of other good hits.
  function followUps(shown, hits, limit) {
    var out = [], used = {}, pages = {};
    shown.forEach(function (i) { used[i] = 1; pages[KB.docs[i].u.split('#')[0]] = 1; });
    var text = ' ' + shown.map(function (i) { return KB.docs[i].x; }).join(' ').toLowerCase() + ' ';
    for (var i = 0; i < KB.docs.length && out.length < 2; i++) {
      var d = KB.docs[i];
      if (!d.g || used[i]) continue;
      var hit = (d.m || []).some(function (m) { return m.length > 3 && text.indexOf(m.toLowerCase()) !== -1; });
      if (hit) { used[i] = 1; out.push({ label: d.t, doc: i }); }
    }
    (hits || []).slice(0, 12).forEach(function (h) {
      if (out.length >= limit) return;
      var d = KB.docs[h.i], p = d.u.split('#')[0];
      if (used[h.i] || d.tip || pages[p] || h.cov < 0.3) return;
      used[h.i] = 1; pages[p] = 1;
      out.push({ label: d.h.length > 48 ? d.h.slice(0, 46).replace(/\s+\S*$/, '') + '…' : d.h, doc: h.i });
    });
    return out.slice(0, limit);
  }

  var STARTERS = [
    { label: 'What is Unbilled Debt?', q: 'What is Unbilled Debt?' },
    { label: 'We keep arguing about chores', q: 'How do we stop fighting about chores?' },
    { label: 'Where do I start?', q: 'Where should I start?' },
    { label: 'Which tool fits me?', q: 'Which tool fits my situation?' }
  ];

  // Topics this helper never takes on, however a word or two might overlap with the notes
  var OFF_TOPIC = /\b(car|cars|engine|tires?|tyres?|oil change|brakes?|mechanic|transmission|resumes?|cv|cover letter|job application|recipes?|bake|baking|coding|javascript|python|programming|homework|stocks?|crypto|bitcoin|forecast|football|basketball|baseball|soccer|movie times|flights?|hotels?|translate)\b/;

  // A few everyday questions that need the site's own words for them
  var REWRITES = [
    [/^(where|how) (do|should|can|shall) (i|we) (start|begin)|^(i m |im )?new here|^first time|^where to (start|begin)|^what should i (read|do) first|^how do i get started/, 'start here what to do first', '/start-here.html'],
    // know your own wiring: "explain my ADHD to my partner", "why do I react this way", "is this my wiring or my past"
    [/\bexplain (my|how i m|how im|how i am|myself|me)\b.*\b(adhd|add|autism|autistic|audhd|neurodivergen\w*|sensitiv\w*|hsp|wiring|wired|triggers?|anxiety|dyslexi\w*|needs?)\b|\b(tell|explain to) (my )?(partner|husband|wife|boyfriend|girlfriend|spouse|family|parents?|boss|coworkers?|friends?|roommates?) (about|how) (my|i)\b/,
      'explain ADHD autism sensitivity to my partner this is how I m wired it won t change here s what helps calm moment wiring card', ['/know-yourself-in-depth.html#faq', '/know-yourself-in-depth.html#explain', '/wiring-card.html', '/know-yourself.html#explain']],
    [/\bwhy (do|does|did|am|can t|cant) (i|we|my \w+) (always |just |still )?(react|overreact|respond|get (so|this|that|really)|feel (this|that|so)|snap|shut down|go quiet|freak|panic|explode|take things)\b|\bwhy am i (like this|so (reactive|sensitive|triggered|touchy|jumpy))\b|\b(wiring|wired|neurotype|temperament|personality|nature|how i m built)\b.*\b(or|vs|versus)\b.*\b(past|trauma|childhood|upbringing|history|learned|experiences?|nurture|environment)\b|\b(past|trauma|childhood|upbringing|history|nurture|environment)\b.*\b(or|vs|versus)\b.*\b(wiring|wired|temperament|personality|nature)\b|\bwhere (is|are|does|do) (this|these|that|those|my) (feelings?|reactions?|anger|anxiety|emotions?) (coming|come) from\b|\b(know|understand) (myself|yourself|my own wiring)\b|\bself understanding\b|\bwhat can (i|be) (change|changed|work on|worked on)\b/,
      'know your own wiring three layers of why I react this way wiring shaped patterns today s conditions where is this feeling coming from', ['/know-yourself-in-depth.html#layers', '/know-yourself-in-depth.html#source', '/know-yourself.html', '/know-yourself-in-depth.html']],
    [/\bwho (made|makes|created|built|wrote|writes|runs|is behind|started)\b|\bwho are you guys\b|\b(the )?(author|creator|founder)\b/, 'Christian auditor creator', '/about'],
    [/^(is (it|this|the site|everything) free|how much (does it|is it|does this) cost|what does it cost|is there a (fee|charge|subscription))/, 'free while the program is being built membership', '/ways-in'],
    [/^what is (this|this site|the objective ledger|tol)$|^what s this( site)?$/, 'The Objective Ledger shared ledger what it is', '/start-here.html'],
    [/\b(we|they|you) (each|both|all) think (we|they|you|i) do (more|most)|\bwho (really )?does more\b|\b(why )?(do|does) (everyone|we both|we each) (think|feel) (they|we) do more/, 'why we each think we do more egocentric bias own share', '/library/fairness.html'],
    [/\bi (do|handle|carry|remember) (everything|it all|all of it|all the \w+|most of the \w+)|\bnobody (sees|notices|thanks me for) (what|how much) i do|\bi m the only one who\b/, 'invisible work nobody sees unbilled debt', '/book/preface'],
    // work and teams: "my team of seven", "my staff", "Slack", "my manager"
    [/\b(my|our|a|the) (team|staff|crew|department|manager|boss|coworkers?|colleagues?|employees?)\b|\bteam of\b|\bat work\b|\bworkplace\b|\bwork (chat|team|friends|people|stuff)\b|\bco ?workers?\b|\bcolleagues?\b|\bslack\b|\bmicrosoft teams\b|\bstand ?ups?\b/,
      'coworkers team of three to eight lemonade stand workpapers more than two names team chat one owner per job', ['/relationships-in-depth.html#coworkers', '/library/teams.html#raci', '/library/teams.html', '/relationships.html#coworkers']],
    // "does X work for three people / more than two?"
    [/\b(does|do|can|will|could|would|is)\b.*\b(work|use|used|handle|support|fit|for)\b.*(\b(three|four|five|six|seven|eight|[3-8]|several|multiple)\s*(people|persons|of us|roommates|housemates|flatmates|adults|siblings|members|names)\b|\bmore than (two|2)\b|\bgroups?\b|\bwhole (house|household|family)\b)|^(for )?(more than (two|2)|three or more|3 or more) (people|of us)\b/,
      'works with more than two people three or more whole house lemonade stand team of three to eight', ['/relationships-in-depth.html#roommates', '/relationships-in-depth.html#coworkers', '/relationships.html#roommates']],
    // co-parents: exes, custody, handoffs, two homes
    [/\b(my|our|an|the|her|his) ex\b|\bex (partner|husband|wife|boyfriend|girlfriend)\b|\bex(partner|husband|wife|boyfriend|girlfriend)\b|\bcustody\b|\bhand ?offs?\b|\bexchange (day|days|time|times)\b|\b(custody|kid|child|school|weekend) exchanges?\b|\bexchanges? (is|are|go|goes|get|gets)\b|\bdrop ?offs?\b|\bpick ?ups? and drop|\btwo (homes|houses|households)\b|\bboth (homes|houses)\b|\bparenting (plan|schedule|time)\b|\bco ?parent\w*\b|\bseparated\b|\bdivorced?\b/,
      'co-parents calmer handoffs exchange-day script short logistical kids messengers court order parenting plan', ['/relationships-in-depth.html#co-parents', '/relationships.html#co-parents', '/library/life.html#coparenting']],
    // "how do I say / word / text / bring it up without a fight"
    [/\bhow (do|should|can|could|would|shall) (i|we) (say(?! no\b)|word|phrase|put|tell|raise|ask|text|message|bring (it|this|that|something) up)\b|\bhow to (say(?! no\b)|word|phrase|raise|bring (it|this|that|something) up)\b|\bwhat (do|should|can) i say\b(?! no)|\bbring (it|this|that|something|\w+) up\b|\bwithout (starting )?(a|an)? ?(fight|argument|row)\b|^(text|message|email) (my|to)\b|\bword (it|this|a text|a message|an email)\b/,
      'signal translator testing how a sentence may land before you say it tone filter fact feeling ask one topic same side', ['/signal-translator.html', '/workpapers/wp-09-tone-filter.html', '/check-ins.html#ground', '/check-ins.html']],
    // caregivers, a spouse or partner too
    [/\b(husband|wife|partner|spouse|boyfriend|girlfriend|mom|mum|dad|mother|father|parent|son|daughter)\b.*\b(surgery|operation|illness|ill|sick|injury|injured|hospital|recovering|recovery|diagnosis|disability|disabled)\b|\b(looking after|caring for|care for|taking care of|care of|nursing) (my|our|a|an|his|her) \w+|\bdoing everything for (him|her|them)\b|\b(carer|caregiver|caregiving)\b/,
      'caregivers spouse partner after surgery or illness what to notice one small thing battery check breathe ask for one specific help', ['/relationships-in-depth.html#caregivers', '/relationships.html#caregivers', '/library/stress.html#caregiver-strain']],
    // teenagers and parenting
    [/\bteens?\b|\bteenagers?\b|\bteenage\b|\badolescen\w*|\b1[0-9] ?(year|yr|y) ?olds?\b|\bmy (kid|kids|child|children|son|daughter)\b|\b(kid|child|son|daughter) (is |seems |gets |feels )?(stressed|anxious|upset|struggling|overwhelmed|worried)\b/,
      'talking with teenagers parenting teens ownership of household jobs autonomy stress', ['/library/life.html#teenagers', '/library/life.html#parenting-styles', '/relationships-in-depth.html#family']],
    // roommates, rent and bills
    [/\b(roommates?|roomates?|housemates?|flatmates?|house ?share|shared house)\b|\brent\b|\bvenmo\b|\bsplitwise\b|\bsplit\w* (the )?(bills?|rent|costs?|expenses?|money|utilities)\b|\bshared expenses?\b|\butilit(y|ies)\b|\b(electric|power|water|gas|internet|wifi) bills?\b/,
      'roommates three or more people money rent bills split shared-expenses note house meeting talk about money without a fight', ['/relationships-in-depth.html#roommates', '/relationships.html#roommates', '/library/life.html#roommates-and-shared-homes', '/library/conflict.html#money-disagreements']],
    [/\bbills?\b/, 'money bills split fair shared-expenses note talk about money without a fight', ['/library/conflict.html#money-disagreements', '/relationships-in-depth.html#roommates', '/library/life.html#money-meanings']]
  ];


  function norm(q) { return fold(q).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function fill(s, ctx) {
    return String(s || '').replace(/\{(them|Them|they|They|their|Their)\}/g, function (m, k) {
      var v = ctx[k.toLowerCase()] || '';
      return k.charAt(0) === k.charAt(0).toUpperCase() ? v.charAt(0).toUpperCase() + v.slice(1) : v;
    });
  }
  function safeLinks(list) { return (list || []).filter(function (l) { return l && safePath(l[1]); }); }

  // ------------------------------------------------------------------ safety first
  // Anything that sounds like danger or harm gets a short, kind "this is beyond me", never advice.
  var DANGER = new RegExp([
    '\\b(hits?|hitting|slapp?(s|ed|ing)?|punch(es|ed|ing)?|chok(e|es|ed|ing)|kick(s|ed|ing)?|strangl\\w*|grabb?(ed|ing) me by) (me|us|my (kids?|children|son|daughter|baby))\\b',
    '\\b(shoved|shoves|pushed|pushes) me (down|over|into|against|around)\\b', '\\bbeats? me up\\b',
    '\\babus(e|es|ed|ive|er|ers|ing)\\b', '\\bdomestic (violence|abuse)\\b', '\\bviolen(t|ce)\\b',
    '\\bsuicid\\w*', '\\bkill(ing)? (my ?self|me|him|her|them|everyone)\\b', '\\b(want|wants|wanted|going) to die\\b',
    '\\bend (it all|my life)\\b', '\\bself ?harm\\w*', '\\b(hurt|hurting|harm|harming|cut|cutting) my ?self\\b', '\\bno reason to (live|go on)\\b',
    '\\bthreat(en|ens|ened|ening)\\w* (to )?(hurt|kill|harm)\\b', '\\b(threatens|threatened) me\\b',
    '\\b(afraid|scared|frightened|terrified) (of|for) (him|her|my (life|safety)|my (partner|husband|wife|boyfriend|girlfriend|spouse|ex|dad|father|mom|mum|mother|stepdad|stepmom))\\b',
    '\\bnot safe (at home|with (him|her|them|my))\\b', '\\bfeel unsafe\\b', '\\b(rape|raped|sexual(ly)? assault\\w*|assault(ed|s)? me)\\b',
    '\\bstalk(s|ed|ing|er)?\\b', '\\b(gun|knife|weapon)\\b', '\\boverdos\\w*'
  ].join('|'));
  function safetyReply() {
    return { blocks: [
      { k: 'p', x: 'I’m really glad you said something. What you’re describing sounds serious, and it’s beyond what a small helper like me can help with. You deserve real support from a person.' },
      { k: 'p', x: 'Please reach out to someone you trust, or to a qualified professional who can help with this properly.' }],
      chips: [], kind: 'safety' };
  }

  // ------------------------------------------------------------------ small calculators, worked out right here
  function numList(s) {
    return (s.match(/\d*\.?\d+%?/g) || []).map(function (n) { return n.slice(-1) === '%' ? parseFloat(n) / 100 : parseFloat(n); });
  }
  function r2(v) { return (Math.round(v * 100 + 1e-7) / 100).toFixed(2); }  // 0.565 → 0.57, not 0.56 from float error
  function r3(v) { return String(Math.round(v * 1000) / 1000); }
  var NOT_VERDICT = 'It’s a gut-check that starts a conversation, not a verdict on you or anyone else.';
  var WP02_ITEMS = ['sleep', 'workload elsewhere', 'unresolved conflict', 'how your body feels', 'time pressure today'];
  function wp02Band(v) {
    if (v < 0.3) return 'Under 0.3: whatever comes up right now is probably about the thing itself. Your battery isn’t adding much extra weight to it.';
    if (v <= 0.6) return 'Between 0.3 and 0.6: you’re carrying more than usual. Before a hard talk, the page suggests saying it out loud: “Heads up, I’m carrying more than usual today.”';
    return 'Over 0.6: be gentle with yourself, and put off anything that doesn’t need deciding in the next hour. A high score means “later,” not “never.”';
  }
  function calcBand(v) {
    if (v >= 0.7) return ['0.70 or more: the setup is carrying its own weight.', 'Don’t change the setup. Keep the same rhythm of check-ins.'];
    if (v >= 0.4) return ['0.40 to 0.69: something in the setup is drifting.', 'Look at the input with the biggest gap. It’s often ownership clarity, but check rather than assume.'];
    return ['Under 0.40: the setup, as it stands, doesn’t look like it can last.', 'Rework the whole agreement, not another one-off patch. That’s a statement about the setup, not about anyone.'];
  }
  function calculators(q, f) {
    var low = String(q).toLowerCase().replace(/[’']/g, '');
    var isWp02 = /\b(battery|batteries|wp ?-? ?0?2|stress meter)\b/.test(low);
    var isCalc = /\b(calc ?-? ?0?1|solvency|can the load last)\b/.test(low);
    if (isWp02 && !isCalc) {
      var body = low.replace(/\bwp ?-? ?0?2\b/g, ' ');
      var n = numList(body);
      var ints = n.filter(function (x) { return x === Math.floor(x); });
      if (n.length >= 5 && ints.length === n.length) {
        var five = n.slice(0, 5);
        if (n.length > 5 || five.some(function (x) { return x > 4; })) {
          return { blocks: [{ k: 'p', x: 'I’d love to work that out. The Battery Meter takes exactly five answers, each from 0 (not at all) to 4 (very true): ' + WP02_ITEMS.join(', ') + '. Could you send me five numbers like that, for example “my battery answers are 2, 1, 3, 0, 2”?' }],
            chips: [{ label: 'How does the Battery Meter work?', q: 'How do I use WP-02?' }], kind: 'calc' };
        }
        var sum = five.reduce(function (a, b) { return a + b; }, 0), v = sum / 20;
        var mx = Math.max.apply(null, five), top = [];
        five.forEach(function (x, i) { if (x === mx && mx >= 3) top.push(WP02_ITEMS[i]); });
        var blocks = [
          { k: 'p', x: 'Let’s add it up: ' + five.join(' + ') + ' = ' + sum + '. Then divide by 20: ' + sum + ' ÷ 20 = ' + r2(v) + '.' },
          { k: 'p', x: wp02Band(v) }];
        if (top.length) blocks.push({ k: 'p', x: 'If you answered in the page’s order, the heaviest part right now is ' + top.join(' and ') + '. That’s worth naming, even just to yourself.' });
        blocks.push({ k: 'note', x: 'This is Pillar III, Read your state first. ' + NOT_VERDICT + ' It isn’t a medical test.' });
        blocks.push({ k: 'links', x: safeLinks([['WP-02: How full is your battery?', '/workpapers/wp-02-battery-stress-meter.html'],
          v >= 0.3 ? ['WP-11: The Calm-Down Kit', '/wp-11.html'] : ['Today’s Weather', '/quick-checks.html#today']]) });
        return { blocks: blocks, chips: [{ label: 'What helps when my battery is low?', q: 'What helps when my battery is low?' }, { label: 'How does this feed CALC-01?', q: 'How does CALC-01 work?' }], kind: 'calc', topic: 'battery score' };
      }
      var one = n.filter(function (x) { return x <= 1; });
      if (n.length === 1 && one.length === 1 && n[0] !== Math.floor(n[0]) || (n.length === 1 && n[0] === 0)) {
        return { blocks: [{ k: 'p', x: 'A battery score of ' + r2(n[0]) + ' reads like this. ' + wp02Band(n[0]) }, { k: 'note', x: NOT_VERDICT },
          { k: 'links', x: [['WP-02: How full is your battery?', '/workpapers/wp-02-battery-stress-meter.html']] }],
          chips: [{ label: 'How is it worked out?', q: 'Show me the math for WP-02' }], kind: 'calc', topic: 'battery score' };
      }
      if (/\banswers?\b|\bscored?\b/.test(low) && n.length >= 2 && n.length < 5) {
        return { blocks: [{ k: 'p', x: 'I can work that out for you, but I need all five answers, each from 0 to 4: ' + WP02_ITEMS.join(', ') + '. Try “my battery answers are 3, 2, 4, 1, 2”.' }], chips: [], kind: 'calc' };
      }
      return null;
    }
    // CALC-01: named inputs (balance, ownership, stress/battery), or three numbers after "CALC-01"
    function named(re) { var m = low.match(re); if (!m) return null; var v = parseFloat(m[2]); if (m[2].slice(-1) === '%' || v > 1) v = v / 100; return v; }
    var wb = named(/\b(workload balance|balance|wb)\b[^0-9]{0,24}?(\d*\.?\d+%?)/);
    var oc = named(/\b(ownership clarity|ownership|clarity|oc)\b[^0-9]{0,24}?(\d*\.?\d+%?)/);
    var as = named(/\b(autonomic saturation|saturation|battery|stress|as)\b[^0-9]{0,24}?(\d*\.?\d+%?)/);
    var rf = named(/\b(retuning frequency|retuning|repairs?|rf)\b[^0-9]{0,24}?(\d*\.?\d+%?)/);
    var hasNamed = [wb, oc, as].filter(function (x) { return x != null; }).length;
    if (isCalc && hasNamed < 3) {
      var n3 = numList(low.replace(/\bcalc ?-? ?0?1\b/g, ' ')).map(function (v) { return v > 1 ? v / 100 : v; });
      if (n3.length === 3 && !hasNamed) { wb = n3[0]; oc = n3[1]; as = n3[2]; hasNamed = 3; }
      else if (n3.length === 1 && !hasNamed) {
        var b1 = calcBand(n3[0]);
        return { blocks: [{ k: 'p', x: 'A Solvency Read of ' + r2(n3[0]) + ' falls in this band. ' + b1[0] + ' First move: ' + b1[1] }, { k: 'note', x: 'It reads the setup, never a person. ' + NOT_VERDICT },
          { k: 'links', x: [['CALC-01: Can the load last?', '/workpapers/calculators/calc01-solvency.html']] }],
          chips: [{ label: 'Show me the math', q: 'Show me the math for CALC-01' }], kind: 'calc', topic: 'solvency read' };
      }
    }
    if ((isCalc || hasNamed >= 2) && hasNamed >= 2 && !(hasNamed === 2 && !isCalc && !/\b(balance|ownership)\b/.test(low))) {
      if (hasNamed < 3) {
        return { blocks: [{ k: 'p', x: 'I can run a quick CALC-01 read, but I need all three numbers, each from 0 to 1: workload balance, ownership clarity, and the average battery score. Something like “CALC-01: balance 0.6, ownership 0.5, battery 0.4”.' }],
          chips: [{ label: 'Where do the numbers come from?', q: 'How does CALC-01 work?' }], kind: 'calc' };
      }
      var bad = [wb, oc, as].concat(rf != null ? [rf] : []).some(function (x) { return isNaN(x) || x < 0 || x > 1; });
      if (bad) return { blocks: [{ k: 'p', x: 'Each CALC-01 input runs from 0 to 1 (or 0% to 100%). Could you check the numbers and send them again?' }], chips: [], kind: 'calc' };
      var tW = 0.4 * wb, tO = 0.35 * oc, tA = 0.25 * (1 - as), sol = tW + tO + tA, band = calcBand(sol);
      var gaps = [['workload balance', 0.4 - tW, 'the Lemonade Stand or WP-01', '/lemonade-stand.html'], ['ownership clarity', 0.35 - tO, 'WP-03, One owner per job', '/workpapers/wp-03-raci-treaty.html'], ['the batteries (stress)', 0.25 - tA, 'WP-02 and the Calm-Down Kit', '/workpapers/wp-02-battery-stress-meter.html']];
      gaps.sort(function (a, b) { return b[1] - a[1]; });
      var out = [
        { k: 'p', x: 'Here’s the Solvency Read with your numbers: 0.40 × ' + r2(wb) + ' (balance) + 0.35 × ' + r2(oc) + ' (ownership) + 0.25 × (1 − ' + r2(as) + ') (battery, flipped) = ' + r3(tW) + ' + ' + r3(tO) + ' + ' + r3(tA) + ' = ' + r2(sol) + '.' },
        { k: 'p', x: band[0] + ' First move: ' + band[1] }];
      if (gaps[0][1] > 0.02) out.push({ k: 'p', x: 'The biggest gap is ' + gaps[0][0] + ' (' + r2(gaps[0][1]) + ' of the points available went unearned), so ' + gaps[0][2] + ' is the place to look first.' });
      if (rf != null) {
        var apex = 0.35 * wb + 0.30 * oc + 0.20 * (1 - as) + 0.15 * rf;
        out.push({ k: 'p', x: 'With repair included (retuning ' + r2(rf) + '), the apex score is 0.35 × ' + r2(wb) + ' + 0.30 × ' + r2(oc) + ' + 0.20 × (1 − ' + r2(as) + ') + 0.15 × ' + r2(rf) + ' = ' + r2(apex) + '.' +
          (sol - apex > 0.1 ? ' Solvency is higher than apex, which usually means friction is being swallowed rather than repaired: WP-09 is the place to work on.' : '') });
      }
      out.push({ k: 'note', x: 'Pillars I and II: it reads the setup, never a person. The weights are an openly stated judgment call, not a fitted model, and ' + NOT_VERDICT.charAt(0).toLowerCase() + NOT_VERDICT.slice(1) });
      out.push({ k: 'links', x: safeLinks([['CALC-01: Can the load last?', '/workpapers/calculators/calc01-solvency.html'], [gaps[0][2], gaps[0][3]]]) });
      return { blocks: out, chips: [{ label: 'Where do these numbers come from?', q: 'How does CALC-01 work?' }, { label: 'What does apex mean?', q: 'What is the apex score in CALC-01?' }], kind: 'calc', topic: 'solvency read' };
    }
    // two people's hours → workload balance
    var hrs = low.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b.*?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/);
    if (hrs && /\b(balance|split|lemonade|wb|even|fair)\b/.test(low) && !/\b(three|four|five|six|seven|eight|[3-8]) (of us|people|roommates|housemates)\b/.test(low)) {
      var a = parseFloat(hrs[1]), b = parseFloat(hrs[2]);
      if (a + b > 0) {
        var pa = 100 * a / (a + b), pb = 100 - pa, wbv = 1 - Math.abs(pa - pb) / 100;
        return { blocks: [
          { k: 'p', x: 'Out of ' + (a + b) + ' hours, that’s ' + Math.round(pa) + '% and ' + Math.round(pb) + '%. Workload balance is 1 − |' + Math.round(pa) + ' − ' + Math.round(pb) + '| ÷ 100 = ' + r2(wbv) + ' (1.00 means perfectly even, 0.00 means completely one-sided).' },
          { k: 'p', x: 'The math doesn’t care who carries more, only that the load isn’t shared. For three or more people, the Lemonade Stand and CALC-01 work it out from everyone’s hours for you.' },
          { k: 'note', x: 'Pillar I, See the whole load. ' + NOT_VERDICT },
          { k: 'links', x: [['The Lemonade Stand', '/lemonade-stand.html'], ['CALC-01: Can the load last?', '/workpapers/calculators/calc01-solvency.html']] }],
          chips: [{ label: 'What do I do with this?', q: 'How does CALC-01 work?' }], kind: 'calc', topic: 'workload balance' };
      }
    }
    return null;
  }

  // ------------------------------------------------------------------ program cards: how-to, what for, what it means
  function cardAspect(f) {
    if (/\b(math|formula|formulas|weights?|weighted|calculat\w*|computed?|worked out|scored|scoring|add(ed)? up|divide)\b/.test(f)) return 'math';
    if (/\b(mean|means|meaning|result|results|scores?|reading|band|bands|number|high|low|interpret\w*)\b/.test(f)) return 'results';
    if (/\bhow (do|does|can|should|would) (i|we|you|one)\b|\bhow to\b|\bsteps?\b|\binstructions?\b|\bwalk me through\b|\bguide me\b|\bfill\b|\buse\b|\bplay\b|\bstart\b|\bbegin\b/.test(f)) return 'how';
    return 'about';
  }
  // words that say what kind of answer is wanted, not what it's about
  var ASPECT = {};
  'use work mean result score read math formula step start begin play fill tell show help good best way get go find open try page tool thing number band high low weight calcul worked scor add divide do does doing mine my our we i'
    .split(' ').forEach(function (w) { ASPECT[stem(w)] = 1; ASPECT[w] = 1; });
  function matchCard(f) {
    var fw = ' ' + f + ' ', cards = KB.cards || [], qt = null;
    var fw2 = fw.replace(/(\d)([a-z])/g, '$1 $2').replace(/ checkin(s?) /g, ' check in$1 ');  // "6-week", "90-second check-in"
    for (var i = 0; i < IDX.cardKeys.length; i++) {
      var ck = IDX.cardKeys[i];
      if (fw.indexOf(ck.k) === -1 && fw2.indexOf(ck.k) === -1) continue;
      if (ck.broad) {
        // a broad name ("the library", "battery", "drift") only counts when the question is about the thing itself
        qt = qt || tokens(f);
        var rest = qt.filter(function (t) { return ck.t.indexOf(t) === -1 && !ASPECT[t] && !ROLE[t]; });
        if (rest.length > 0) continue;
      }
      return cards[ck.c];
    }
    for (var j = 0; j < cards.length; j++) if (cards[j].re && cards[j].re.test(f)) return cards[j];
    return null;
  }
  function cardReply(state, c, aspect) {
    var b = [], chips = [];
    if (c.kind === 'intent') aspect = 'about';
    if (aspect === 'math' && !c.math) aspect = c.results ? 'results' : 'about';
    if (aspect === 'results' && !c.results) aspect = 'about';
    if (aspect === 'how' && !(c.how && c.how.length)) aspect = 'about';
    if (aspect === 'math') { b.push({ k: 'p', x: c.math }); if (c.results) b.push({ k: 'p', x: c.results }); }
    else if (aspect === 'results') { b.push({ k: 'p', x: c.results }); }
    else if (aspect === 'how') { b.push({ k: 'p', x: 'Here’s how to use ' + c.name + ', step by step:' }); b.push({ k: 'list', x: c.how }); }
    else {
      (Array.isArray(c.what) ? c.what : [c.what]).forEach(function (x) { if (x) b.push({ k: 'p', x: x }); });
      if (c.how && c.how.length && c.kind !== 'intent') { b.push({ k: 'h', x: 'How to use it' }); b.push({ k: 'list', x: c.how.slice(0, 4) }); }
      else if (c.how && c.how.length) b.push({ k: 'list', x: c.how });
    }
    if (c.pillar && aspect !== 'math') b.push({ k: 'note', x: c.pillar });
    var links = safeLinks(c.links).slice(0, 3);
    if (links.length) b.push({ k: 'links', x: links });
    if (aspect !== 'how' && c.how && c.how.length && c.kind !== 'intent') chips.push({ label: 'How do I use it?', q: 'How do I use ' + c.name + '?' });
    if (aspect !== 'results' && c.results) chips.push({ label: 'What do the results mean?', q: 'What do the results of ' + c.name + ' mean?' });
    if (aspect !== 'math' && c.math) chips.push({ label: 'Show me the math', q: 'Show me the math for ' + c.name });
    (c.chips || []).forEach(function (x) { chips.push({ label: x[0], q: x[1] }); });
    if (c.ex) chips.push({ label: 'Give me an example', q: 'Give me an example' });
    state.last = { kind: 'card', card: c.id, q: c.name, topic: c.name, u: links[0] && links[0][1] };
    return { blocks: b, chips: chips.slice(0, 3), kind: 'card', id: c.id };
  }
  function cardById(id) { var cs = KB.cards || []; for (var i = 0; i < cs.length; i++) if (cs[i].id === id) return cs[i]; return null; }

  // ------------------------------------------------------------------ situations: advice for what's going on
  var WHO_ORDER = ['coparent', 'kid', 'caregiving', 'coworker', 'roommate', 'partner', 'family', 'friend'];
  var SELF_ISSUES = null;
  var FEELS = [
    [/\b(awful|terrible|horrible|guilty|so bad|really bad|ashamed|like a jerk|like a monster)\b/, 'Feeling awful afterward usually means you care how it landed. That’s something to build on, not a verdict on you.'],
    [/\b(furious|angry|mad|livid|irritated|annoyed|frustrated|fed up|sick of it)\b/, 'That frustration makes sense. It usually points at something that matters to you.'],
    [/\b(hurt|sad|upset|heartbroken|crushed|gutted)\b/, 'Feeling hurt by that is completely understandable.'],
    [/\b(exhausted|tired|drained|worn out|wiped out|burn(ed|t) out|running on empty|depleted)\b/, 'Being this worn down makes everything feel heavier, so go gently with yourself.'],
    [/\b(overwhelmed|swamped|drowning|stretched thin|underwater)\b/, 'Feeling overwhelmed is a signal about load, not a sign you’re failing.'],
    [/\b(anxious|nervous|worried|scared|dreading|dread|on edge)\b/, 'Feeling nervous about it is normal. It often means the relationship matters to you.'],
    [/\b(lonely|invisible|unseen|ignored|taken for granted|unappreciated|unnoticed)\b/, 'Feeling unseen is one of the heaviest parts of this, and it deserves to be taken seriously.'],
    [/\b(resent\w*|bitter)\b/, 'Resentment is often a sign that something has gone unnoticed for a while. It’s information, not a character flaw.'],
    [/\b(stuck|lost|confused|dont know what to do|no idea what to do)\b/, 'Feeling stuck is a very normal place to start from.'],
    [/\b(embarrassed|humiliated)\b/, 'Embarrassment stings, and it fades faster than it feels like it will.'],
    [/\b(jealous|envious)\b/, 'Jealousy is a normal feeling, and it usually points at a need worth naming.']
  ];
  function firstGroup(m) { for (var i = 1; i < m.length; i++) if (m[i]) return m[i].trim(); return ''; }
  function detectSituation(f) {
    var S = IDX.sit, best = null, bs = 0, second = 0;
    var who = null, noun = '';
    for (var i = 0; i < WHO_ORDER.length; i++) {
      var w = S.who[WHO_ORDER[i]]; if (!w) continue;
      var m = w.re.exec(f);
      if (m) { who = WHO_ORDER[i]; noun = firstGroup(m); break; }
    }
    var bonus = (who && S.who[who].bonus) || {};
    Object.keys(S.issues).forEach(function (k) {
      var sc = 0; S.issues[k].res.forEach(function (r) { if (r[0].test(f)) sc += r[1]; });
      if (sc && bonus[k]) sc += bonus[k];
      if (sc > bs) { second = bs; bs = sc; best = k; } else if (sc > second) second = sc;
    });
    var personal = /\b(i|im|ive|id|me|my|we|us|our|myself|mine)\b/.test(f);
    if (best && !who) {
      var iss = S.issues[best];
      var hasSelf = iss.selfFirst || iss.reflect_self || iss.going_self || iss.steps_self;
      if (iss.selfFirst || (hasSelf && !/\b(we|us|our|home|house|household)\b/.test(f) && !iss.needsOther)) who = 'self';
      else who = 'other';
    }
    if (best && S.issues[best].only && S.issues[best].only.indexOf(who) === -1) {
      who = S.issues[best].only.indexOf('other') !== -1 ? 'other' : S.issues[best].only[0];
    }
    var feel = '';
    for (var j = 0; j < FEELS.length; j++) if (FEELS[j][0].test(f)) { feel = FEELS[j][1]; break; }
    return { issue: best, score: bs, who: who, noun: noun, personal: personal, feel: feel };
  }
  function whoCtx(who, noun) {
    var W = IDX.sit.who[who] || IDX.sit.who.other;
    var them = noun ? 'your ' + noun.replace(/^(my|our|the|a|an)\s+/, '') : W.them;
    return { them: them, they: 'they', their: 'their', who: who, W: W };
  }
  function sitParts(issueKey, who, noun) {
    var S = IDX.sit, I = S.issues[issueKey], C = S.combos[who + '+' + issueKey] || {}, ctx = whoCtx(who, noun), W = ctx.W;
    var self = who === 'self', other = !self && I.selfFirst;
    function pickF(field) {
      if (C[field] != null) return C[field];
      if (self && I[field + '_self'] != null) return I[field + '_self'];
      if (other && I[field + '_other'] != null) return I[field + '_other'];
      return I[field];
    }
    var steps = (pickF('steps') || []).slice(0, 3);
    var wstep = (W.steps && W.steps[issueKey]) || W.step;
    if (wstep && !C.steps && steps.length < 4 && (!self || I.selfFirst) && !(self && steps.some(function (x) { return /battery/.test(x); }))) steps.push(wstep);
    var scripts = C.scripts || [];
    if (!scripts.length) {
      var sx = I.scripts || {};
      scripts = (sx[who] || []).concat(other ? (I.scripts_other || []) : self ? (sx.self || sx['default'] || []) : (sx['default'] || []));
    }
    var path = (C.path || (self && I.path_self) || I.path || []).slice(0, 2);
    var read = C.read || (W.read && !self ? W.read : null) || (I.path_self && self ? null : (I.path || [])[2]) || (self ? ['Know your own wiring', '/know-yourself.html'] : null);
    if (read && path.every(function (p) { return p[1] !== read[1]; })) path.push(read);
    return { I: I, C: C, ctx: ctx, reflect: pickF('reflect'), going: pickF('going'), steps: steps, scripts: scripts, path: safeLinks(path).slice(0, 3), ex: pickF('ex'), more: pickF('more') };
  }
  function sitReply(state, issueKey, who, noun, feel, variant) {
    var P = sitParts(issueKey, who, noun), ctx = P.ctx, I = P.I;
    var reflect = fill(Array.isArray(P.reflect) ? P.reflect[0] : P.reflect, ctx);
    var b = [{ k: 'p', x: reflect + (feel ? ' ' + feel : '') }];
    b.push({ k: 'h', x: 'What might be going on' });
    b.push({ k: 'p', x: fill(P.going, ctx) });
    b.push({ k: 'h', x: who === 'self' ? 'Small steps for today' : 'Try this today' });
    b.push({ k: 'list', x: P.steps.map(function (s) { return fill(s, ctx); }) });
    if (P.scripts.length) b.push({ k: 'script', l: (I.scriptLabel && (who === 'self' || !I.selfFirst)) ? I.scriptLabel : 'Words you could use', x: fill(P.scripts[(variant || 0) % P.scripts.length], ctx) });
    if (P.path.length) { b.push({ k: 'h', x: 'A short path on the site' }); b.push({ k: 'links', x: P.path }); }
    b.push({ k: 'note', x: 'You know your situation best. This is general guidance from the program, not counseling or a professional opinion.' });
    state.last = { kind: 'sit', issue: issueKey, who: who, noun: noun, v: variant || 0, q: I.label, topic: I.label, u: P.path[0] && P.path[0][1] };
    var chips = [];
    if (I.deeper) chips.push({ label: 'Go deeper: ' + I.deeper[0], q: I.deeper[1] });
    if (P.scripts.length > 1) chips.push({ label: 'Another way to say it', q: 'Another way to say it' });
    if (P.ex) chips.push({ label: 'Give me an example', q: 'Give me an example' });
    else chips.push({ label: 'How do I start?', q: 'How do I start?' });
    return { blocks: b, chips: chips.slice(0, 3), kind: 'sit', id: who + '+' + issueKey };
  }
  // "which tools for roommates?" → the road for that kind of relationship
  function roadReply(state, who, noun) {
    var ctx = whoCtx(who, noun), W = ctx.W;
    var b = [{ k: 'p', x: fill(W.fit || ('Here’s a short path for you and ' + ctx.them + '.'), ctx) }];
    if (W.path && W.path.length) { b.push({ k: 'h', x: 'A short path' }); b.push({ k: 'links', x: safeLinks(W.path).slice(0, 3) }); }
    if (W.read) b.push({ k: 'links', x: safeLinks([W.read]) });
    state.last = { kind: 'road', who: who, noun: noun, q: W.them, topic: W.them, u: W.path && W.path[0] && W.path[0][1] };
    var chips = (W.chips || []).slice(0, 3).map(function (c) { return { label: c[0], q: c[1] }; });
    return { blocks: b, chips: chips, kind: 'road', id: who };
  }
  function whoOnly(f) {
    var rest = f.replace(/\b(my|our|the|a|an|with|about|for|and|me|i|help|advice|issues?|problems?|stuff|trouble|situation|dealing|deal)\b/g, ' ').trim();
    if (!rest || rest.split(' ').length > 2) return null;
    var S = IDX.sit;
    for (var i = 0; i < WHO_ORDER.length; i++) { var w = S.who[WHO_ORDER[i]]; var m = w && w.re.exec(f); if (m && m[0].trim().split(' ').length >= rest.split(' ').length) return { who: WHO_ORDER[i], noun: firstGroup(m) }; }
    return null;
  }
  function clarifyWho(state, who, noun) {
    var ctx = whoCtx(who, noun), W = ctx.W;
    state.last = null;
    return { blocks: [{ k: 'p', x: fill('Happy to help with {them}. What’s it mostly about? Pick one of these, or tell me in your own words.', ctx) }],
      chips: (W.chips || []).slice(0, 4).map(function (c) { return { label: fill(c[0], ctx), q: fill(c[1], ctx) }; }), kind: 'clarify' };
  }

  // ------------------------------------------------------------------ background notes: answers
  function bgReply(state, i, part) {
    var B = IDX.bg, d = B.docs[i];
    var b = [{ k: 'note', x: 'From the Professor’s background notes (not a page on this site):' }];
    var cut = d.x.length <= 2 ? 1 : 2;
    var paras = part === 'more' ? d.x.slice(cut) : d.x.slice(0, cut);
    if (!paras.length) paras = d.x.slice(-1);
    b.push({ k: 'bg', h: d.t, x: paras, ev: d.ev || '' });
    if (d.p) b.push({ k: 'p', x: 'To put it into practice here: ' + d.p });
    if (d.go && safePath(d.go[0])) b.push({ k: 'links', x: [[d.go[1] || 'Read more on the site', d.go[0]]] });
    state.last = { kind: 'bg', bg: i, part: part || 'first', q: d.t, topic: d.t, u: d.go && d.go[0] };
    var chips = [];
    if (part !== 'more' && d.x.length > 1) chips.push({ label: 'Tell me more', q: 'Tell me more' });
    if (d.ex) chips.push({ label: 'Give me an example', q: 'Give me an example' });
    (d.see || []).forEach(function (sid) { var j = B.byId[sid]; if (j != null && chips.length < 3) chips.push({ label: B.docs[j].t, q: 'Explain ' + B.docs[j].t }); });
    return { blocks: b, chips: chips.slice(0, 3), kind: 'bg', id: d.id };
  }
  // a background note named (by a phrase of two or more words) somewhere in a question
  var DEFN_SITE = /\b(wp ?\d+|calc ?01|prog ?01|report ?01|lemonade|pillar|chapter|preface)\b/;
  function bgPhraseIn(q) {
    var k = ' ' + phraseKey(q) + ' ', best = null, n = 0;
    Object.keys(IDX.bgNames).forEach(function (name) {
      if (name.indexOf(' ') === -1 || name.length <= n) return;
      if (k.indexOf(' ' + name + ' ') !== -1 && glossaryFor(name) < 0) { best = IDX.bgNames[name]; n = name.length; }
    });
    return best;
  }
  function bgByName(phrase) {
    if (!phrase) return -1;
    var id = IDX.bgNames[phraseKey(phrase)];
    if (id == null || !IDX.bg) return -1;
    var i = IDX.bg.byId[id];
    return i == null ? -1 : i;
  }

  // ------------------------------------------------------------------ follow-ups: "tell me more", "an example", "what about coworkers?"
  var FU_MORE = /^(ok |okay |and |so |hmm |yes |yes please )?(tell me more|more|some more|more please|go on|continue|keep going|say more|go deeper|deeper|more on that|more about (that|this|it)|tell me more about (that|this|it)|what else|anything else|and then|then what|next|another|why|how so|why does (that|it|this) (work|help)|whats the (science|evidence|research)( on (that|this|it))?)( please)?$/;
  var FU_EX = /^(can you |could you )?(please )?(give me |show me |got |have you got |share )?(an |one |another |a )?(example|examples|sample|instance|script|line)( please| of (that|this|it))?$|^(for example|like what|such as|what would that look like|what does that look like|what would i say|what do i say|what could i say|how would i say (it|that)|how do i say (it|that)|(give me )?another way to (say|put|word) (it|that)|say it another way|different words|other words|another script|another line)\??$/;
  var FU_START = /^(so |ok |okay |and )?(how (do|should|would|can) (i|we) (start|begin|get started|use (it|this|that)|do (it|this|that))|where (do|should) (i|we) (start|begin)|what (do|should) (i|we) do first|first step|whats the first step|what is the first step|how do i begin|where to start)( with (it|this|that))?$/;
  var FU_WHO = /^(and |but |ok |okay |so )?((what|how) about|and|and for|and with|for|with|what if its|what if it s|same (thing )?(for|with)|does (this|that|it) (work|help|apply) (for|with)|would (this|that|it) (work|help) (for|with)|can i use (this|that|it) (for|with))\s+(.{2,40})$/;
  function followUp(state, f, q) {
    var L = state.last;
    if (!L) return null;
    if (FU_EX.test(f)) {
      var anotherWay = /another|different|other/.test(f);
      if (L.kind === 'sit') {
        var P = sitParts(L.issue, L.who, L.noun);
        if (anotherWay || !P.ex) {
          if (P.scripts.length > 1) { var v = (L.v || 0) + 1; state.last.v = v; return { blocks: [{ k: 'p', x: 'Sure, here’s another way to put it:' }, { k: 'script', l: 'Words you could use', x: fill(P.scripts[v % P.scripts.length], P.ctx) }, { k: 'note', x: 'Change any word so it sounds like you. Your own words beat a perfect script.' }], chips: [{ label: 'Another one', q: 'Another way to say it' }, { label: 'How do I start?', q: 'How do I start?' }], kind: 'sit-more' }; }
        }
        if (P.ex) return { blocks: [{ k: 'p', x: 'Here’s an example of how it might go:' }, { k: 'p', x: fill(P.ex, P.ctx) }], chips: [{ label: 'Another way to say it', q: 'Another way to say it' }, { label: 'How do I start?', q: 'How do I start?' }], kind: 'sit-more' };
      }
      if (L.kind === 'card') { var c = cardById(L.card); if (c && c.ex) return { blocks: [{ k: 'p', x: 'Here’s an example:' }, { k: 'p', x: c.ex }], chips: [{ label: 'How do I start?', q: 'How do I start?' }], kind: 'card-more' }; }
      if (L.kind === 'bg' && IDX.bg) { var d = IDX.bg.docs[L.bg]; if (d.ex) return { blocks: [{ k: 'p', x: 'Here’s an example:' }, { k: 'script', l: d.t, x: d.ex }], chips: [{ label: 'Tell me more', q: 'Tell me more' }], kind: 'bg-more' }; }
      if (L.q) return { redirect: L.q + ' example for instance' };
      return null;
    }
    if (FU_MORE.test(f)) {
      if (L.kind === 'sit') { var I = IDX.sit.issues[L.issue]; if (I.deeper) return { redirect: I.deeper[1] }; }
      if (L.kind === 'card') {
        var c2 = cardById(L.card);
        if (c2 && c2.more && !L.moreShown) { state.last.moreShown = 1; return { blocks: [{ k: 'p', x: c2.more }].concat(c2.links && c2.links.length ? [{ k: 'links', x: safeLinks(c2.links).slice(0, 2) }] : []), chips: [{ label: 'How do I start?', q: 'How do I start?' }], kind: 'card-more' }; }
        if (c2) return { redirect: c2.name, prefer: c2.links && c2.links[0] && c2.links[0][1].split('#')[0] };
      }
      if (L.kind === 'bg') {
        if (!IDX.bg) return { needBG: true };
        if (L.part !== 'more') return bgReply(state, L.bg, 'more');
        var sd = IDX.bg.docs[L.bg], nx = (sd.see || []).map(function (s) { return IDX.bg.byId[s]; }).filter(function (j) { return j != null; })[0];
        if (nx != null) { var rr = bgReply(state, nx); rr.blocks.splice(1, 0, { k: 'p', x: 'That’s all my notes say on that. A close cousin of it:' }); return rr; }
      }
      if (L.kind === 'search' || !L.kind) return { more: true };
      if (L.q) return { redirect: L.q };
      return null;
    }
    if (FU_START.test(f)) {
      if (L.kind === 'card') {
        var c3 = cardById(L.card);
        if (c3 && (c3.start || c3.how)) return { blocks: [{ k: 'p', x: 'Here’s a simple way to start with ' + c3.name + ':' }, { k: 'list', x: (c3.start || c3.how).slice(0, 4) }, { k: 'links', x: safeLinks(c3.links).slice(0, 1) }], chips: [], kind: 'card-more' };
      }
      if (L.kind === 'sit') {
        var P2 = sitParts(L.issue, L.who, L.noun);
        var first = P2.path[0];
        return { blocks: [{ k: 'p', x: 'Start small. Today, just do this one thing: ' + fill(P2.steps[0], P2.ctx).replace(/^./, function (ch) { return ch.toLowerCase(); }) },
          first ? { k: 'p', x: 'Then, when you have ten calm minutes, open ' + first[0] + '. It’s the first stop on your short path.' } : { k: 'p', x: 'Then come back and tell me how it went.' },
          { k: 'links', x: first ? [first] : [] }], chips: [{ label: 'Another way to say it', q: 'Another way to say it' }], kind: 'sit-more' };
      }
      if (L.kind === 'bg' && IDX.bg) { var d2 = IDX.bg.docs[L.bg]; if (d2.go) return { blocks: [{ k: 'p', x: 'The easiest way to start is on the site: ' + (d2.p || 'try it in a small, low-stakes moment first.') }, { k: 'links', x: safeLinks([[d2.go[1], d2.go[0]]]) }], chips: [], kind: 'bg-more' }; }
      if (L.kind === 'road') { var W = IDX.sit.who[L.who]; if (W && W.path) return { blocks: [{ k: 'p', x: 'Start with the first stop: ' + W.path[0][0] + '. Give it one ordinary week before judging it.' }, { k: 'links', x: safeLinks([W.path[0]]) }], chips: [], kind: 'road-more' }; }
      return null;
    }
    var mw = f.match(FU_WHO);
    if (mw) {
      var target = mw[mw.length - 1], S = IDX.sit, nw = null, noun = '';
      for (var i = 0; i < WHO_ORDER.length; i++) { var m2 = S.who[WHO_ORDER[i]].re.exec(target); if (m2) { nw = WHO_ORDER[i]; noun = firstGroup(m2); break; } }
      if (!nw && /\b(me|myself|just me|on my own|alone)\b/.test(target)) nw = 'self';
      if (!nw) return null;
      if (L.kind === 'sit') {
        var ok = !S.issues[L.issue].only || S.issues[L.issue].only.indexOf(nw) !== -1;
        if (ok) return sitReply(state, L.issue, nw, noun, '', 0);
      }
      var rr2 = roadReply(state, nw, noun);
      if (L.topic && L.kind !== 'road') rr2.blocks.unshift({ k: 'p', x: 'Good question. Everything here works in any relationship, and ' + L.topic + ' is no exception.' });
      return rr2;
    }
    return null;
  }

  // Decide what to say to one message. Returns {blocks:[...], chips:[...]} (all data, rendered later),
  // or {needBG:true} when the background notes should be fetched first (reply() then asks again).
  function respond(state, q, chipDoc) {
    var f = norm(q);
    if (chipDoc == null) {
      if (DANGER.test(f)) { state.last = null; return safetyReply(); }
      var fu = followUp(state, f, q);
      if (fu && fu.needBG) return fu;
      if (fu && fu.more) return more(state);
      if (fu && fu.redirect) { var keep = state.last; var r0 = respondSite(state, fu.redirect, null, fu.prefer); if (r0.needBG) state.last = keep; return r0; }
      if (fu) return fu;
      var calc = calculators(q, f);
      if (calc) { state.last = { kind: 'calc', q: calc.topic || 'calculator', topic: calc.topic }; return calc; }
      var bgForce = f.match(/^(?:(?:your |the )?(?:background )?notes (?:on|about)|(?:tell me )?more about|go deeper (?:on|into)|deeper on)\s+(.+)$/);
      var defn = definitionTarget(q);
      var target = bgForce ? bgForce[1] : defn;
      var inGloss = target && glossaryFor(target) >= 0;
      if (target && !inGloss && IDX.bgNames[phraseKey(target)] != null && !matchCard(norm(target))) {
        if (!IDX.bg) return { needBG: true };
        var bi = bgByName(target);
        if (bi >= 0) return bgReply(state, bi);
      }
      var named = !target && /^(what|whats|how|hows|can|could|should|tell me|explain|any tips|tips)\b/.test(f) ? bgPhraseIn(q) : null;
      if (named && !matchCard(f) && !DEFN_SITE.test(f)) {
        if (!IDX.bg) return { needBG: true };
        var bj = IDX.bg.byId[named];
        if (bj != null) return bgReply(state, bj);
      }
      var wo = whoOnly(f);
      if (wo) return clarifyWho(state, wo.who, wo.noun);
      for (var ci = 0; ci < (KB.clar || []).length; ci++) {
        var cl = KB.clar[ci];
        if (cl.re.test(f)) { state.last = null; return { blocks: [{ k: 'p', x: cl.x }], chips: cl.chips.map(function (c) { return { label: c[0], q: c[1] }; }), kind: 'clarify' }; }
      }
      var sit = detectSituation(f);
      var card = matchCard(f);
      var asksAbout = /^(what|whats|how|hows|where|which|when|why|is|are|does|do|can|could|should|tell me|explain|show me|define|who)\b/.test(f) && !/\b(when|if) (my|our|i|we|he|she|they)\b|\b(my|our) (partner|husband|wife|boyfriend|girlfriend|spouse|roommates?|housemates?|coworkers?|colleagues?|boss|manager|team|sister|brother|mom|mum|dad|mother|father|parents?|kids?|son|daughter|teen|teenager|friends?|ex)\b.*\b(keeps?|always|never|wont|doesnt|wont|wants?|says?|makes?|leaves?|forgets?)\b/.test(f);
      var road = /\b(path|road|which (tools?|workpapers?|pages?)|what (tools?|workpapers?|pages?)|where (do|should|can) (we|i) (start|begin)|start with|best tool|good tool|tool for|tools for)\b/.test(f);
      if (road && sit.who && sit.who !== 'self' && sit.who !== 'other' && !card && (!sit.issue || sit.score < 3 || /^(which|what|where)\b/.test(f))) return roadReply(state, sit.who, sit.noun);
      var sitOk = sit.issue && sit.score >= 2 && sit.personal && !(defn && !/\b(my|our|i|we|me)\b/.test(norm(defn)));
      if (card && (!sitOk || asksAbout || sit.score < 3)) return cardReply(state, card, cardAspect(f));
      if (sitOk) return sitReply(state, sit.issue, sit.who, sit.noun, sit.feel, 0);
    }
    return respondSite(state, q, chipDoc);
  }

  // The site's own pages, ranked (the original chat), with the background notes as a second shelf.
  function respondSite(state, q, chipDoc, preferIn) {
    var f = norm(q);
    if (chipDoc != null && KB.docs[chipDoc]) {
      var res0 = search(KB.docs[chipDoc].h + ' ' + (KB.docs[chipDoc].m || []).join(' '));
      state.last = { q: KB.docs[chipDoc].h, res: res0, shown: {} };
      state.last.shown[chipDoc] = 1;
      return { blocks: [{ k: 'p', x: pick(['Here you go:', 'Sure. From the site:', 'Here’s that part:']) }, passageBlock(chipDoc, res0.terms)],
        chips: moreChips(state, followUps([chipDoc], res0.hits, 2)) };
    }
    if (/^(hi+|hello+|hey+|hiya|howdy|yo|heya|good (morning|afternoon|evening|day)|greetings)( there)?( buddy| friend)?$/.test(f))
      return { blocks: [{ k: 'p', x: pick(['Hello! ', 'Hi there! ', 'Hey, nice to see you. ']) + 'I can share what this site says about relationships, fair sharing of the load, check-ins, different wiring and calming down. What’s on your mind?' }], chips: STARTERS };
    if (/^(thanks?( you)?( so much| a lot)?|ty|thx|cheers|thank u|appreciate it|that helps?|that was helpful|great|perfect|nice|cool|lovely|awesome)$/.test(f))
      return { blocks: [{ k: 'p', x: pick(['You’re welcome. ', 'Happy to help. ', 'Any time. ']) + 'Ask me something else whenever you like.' }], chips: [{ label: 'Surprise me', q: 'Surprise me' }, { label: 'Give me a little tip', q: 'Give me a tip' }] };
    if (/^(bye|goodbye|see (you|ya)|good ?night|later)$/.test(f))
      return { blocks: [{ k: 'p', x: 'Take care. I’ll be here if you want to look something up again.' }], chips: [] };
    if (/\b(what can you do|what do you do|how do(es)? (this|you) work|who are you|what are you|help me use|what can i ask|how can you help|are you (an? )?(ai|bot|robot|human|real))\b/.test(f) || f === 'help')
      return { blocks: [
        { k: 'p', x: 'I’m Professor Puddles, a small helper that knows this program inside out. I can explain any tool, workpaper, chapter or game, and walk you through how to use it and what your results mean.' },
        { k: 'list', x: ['Tell me what’s going on, with yourself or someone else, and I’ll suggest a few kind steps, words you could use, and a short path on the site.',
          'Type your Battery Meter answers (like “my battery answers are 3, 2, 4, 1, 2”) or your CALC-01 numbers, and I’ll work out the score with you.',
          'Ask “what is…” about any term, and say “tell me more” or “give me an example” to keep going.'] },
        { k: 'p', x: 'When the site doesn’t cover something, I have some background notes, and I’ll always say when an answer comes from them. I’m not a counselor, and I won’t guess. Everything happens in your browser: what you type stays on this device.' }],
        chips: STARTERS };
    if (/\b(surprise me|random|anything interesting|tell me something|teach me something|something new|inspire me)\b/.test(f)) return surprise(state);
    if (/^(give me |got |share )?(a |another |one )?(little |quick |small )?(tip|tips)( please)?( for today)?$/.test(f)) return tip(state);
    var moreQ = /^(tell me )?(more|some more|more please|go on|continue|keep going|and|another|next|what else|anything else|say more|more on that|more about (that|this|it)|and then|then what|why|how so|like what|such as|example|an example|give me an example)$/.test(f);
    var about = f.match(/^(?:tell me more|more) (?:about|on) (.+)$/);
    if (about && !/^(that|this|it)$/.test(about[1])) { q = about[1]; f = about[1]; }
    else if (moreQ) return more(state);

    var prefer = preferIn || null;
    if (!prefer) for (var r = 0; r < REWRITES.length; r++) if (REWRITES[r][0].test(f)) { q = REWRITES[r][1]; prefer = REWRITES[r][2]; f = fold(q); break; }
    var defn = definitionTarget(q);
    var gi = glossaryFor(defn);
    if (gi < 0 && tokens(q).length <= 4) gi = glossaryFor(q);
    var res = search(defn && gi < 0 && !prefer ? defn : q, { define: !!defn && !prefer, prefer: prefer });
    if (!res.terms.length) {
      if (state.last) return more(state);
      return { blocks: [{ k: 'p', x: 'Could you tell me a little more about what you’d like to know? A word or two about the topic is enough.' }], chips: STARTERS };
    }
    var hits = res.hits;
    // a rewrite that names several places: lead with the best passage from each of the first two that have one
    if (prefer && typeof prefer !== 'string' && hits.length) {
      var pinned = [], topScore = hits[0].s;
      prefer.forEach(function (px) {
        if (pinned.length >= 2) return;
        for (var j = 0; j < hits.length; j++) {
          var dj = KB.docs[hits[j].i];
          if (!dj.tip && dj.u.indexOf(px) === 0) { if (pinned.indexOf(hits[j]) === -1) pinned.push(hits[j]); break; }
        }
      });
      if (pinned.length) {
        hits = pinned.map(function (h) { return { i: h.i, s: topScore, cov: 1 }; })
          .concat(hits.filter(function (h) { return pinned.indexOf(h) === -1; }));
      }
    }
    if (gi >= 0) {
      hits = [{ i: gi, s: (hits[0] ? hits[0].s : 1) * 2, cov: 1 }].concat(hits.filter(function (h) { return h.i !== gi; }));
    }
    // short questions: prefer a passage that covers most of what was asked, if it's nearly as strong
    var content = (res.base || []).filter(function (t, j, a) { return a.indexOf(t) === j && !ROLE[t]; }).length;
    if (gi < 0 && content <= 3 && hits[0] && hits[0].cov < 0.5) {
      var fuller = hits.filter(function (h) { return h.cov >= 0.5 && h.s >= hits[0].s * 0.6; })[0];
      hits = fuller ? [fuller].concat(hits.filter(function (h) { return h !== fuller; })) : [];
    }
    var top = hits[0];
    // a question mostly about things this site never covers ("fix my car", "write a resume") gets a polite no,
    // even when a word or two happens to turn up somewhere in a passage
    var own = (res.base || []).filter(function (t, j, a) { return a.indexOf(t) === j && !ROLE[t]; });
    function inDomain(t) { return IDX.domain[t] || (t.length >= 7 && IDX.domain['~' + t.slice(0, 7)]); }
    var wAll = 0, wAway = 0;
    own.forEach(function (t) { var w = idf(t); wAll += w; if (!inDomain(t)) wAway += w; });
    var offTopic = gi < 0 && !prefer && ((wAll > 0 && wAway * 2 >= wAll) || OFF_TOPIC.test(f));
    var weak = offTopic || !top || top.cov < 0.42 || top.s < 2.2;
    // not on a page, but maybe in the background notes (never for off-topic questions)
    if (!offTopic && (weak || (top && top.cov < 0.6)) && !state.noBG) {
      if (!IDX.bg && !bgTried) return { needBG: true };
      if (IDX.bg) {
        var bh = bgSearch(q)[0];
        if (bh && bh.cov >= 0.6 && bh.s >= 3 && (weak || bh.cov > top.cov + 0.25)) return bgReply(state, bh.i);
      }
    }
    state.last = { kind: 'search', q: q, res: { hits: hits, terms: res.terms }, shown: {} };
    if (weak) {
      // No direct answer. If a passage still shares a real part of the question, show the closest one or two,
      // clearly labelled as the nearest match rather than an answer; otherwise say so and offer starters.
      var near = offTopic ? [] : res.hits.filter(function (h) { return !KB.docs[h.i].tip && h.cov >= 0.4 && h.s >= 1.4; }).slice(0, 8);  // the full ranking, before the short-question filter above
      var closest = [], seenKey = {};
      near.forEach(function (h) {
        var d = KB.docs[h.i], key = d.u.split('#')[0] + '|' + d.h.split(':')[0];
        if (closest.length < 2 && !seenKey[key] && (!closest.length || h.s >= near[0].s * 0.6)) { seenKey[key] = 1; closest.push(h.i); }
      });
      if (closest.length) {
        var blocks = [{ k: 'p', x: pick(['I couldn’t find an exact answer to that, but here’s the closest I have:', 'I don’t have a page that answers that directly. This is the nearest thing I found:', 'Nothing here answers that exactly, but this part of the site comes closest:']) }];
        closest.forEach(function (i, n) {
          state.last.shown[i] = 1;
          if (n > 0) blocks.push({ k: 'p', x: 'This may be related too:' });
          blocks.push(passageBlock(i, res.terms));
        });
        var more0 = [], pagesSeen0 = {};
        closest.forEach(function (i) { pagesSeen0[KB.docs[i].u.split('#')[0]] = 1; });
        near.forEach(function (h) { var d = KB.docs[h.i], p = d.u.split('#')[0]; if (more0.length < 2 && !pagesSeen0[p]) { pagesSeen0[p] = 1; more0.push({ label: d.h.length > 48 ? d.h.slice(0, 46).replace(/\s+\S*$/, '') + '…' : d.h, doc: h.i }); } });
        return { blocks: blocks, chips: (more0.length ? more0 : STARTERS.slice(0, 2)).concat([{ label: 'Ask something else', q: 'What can I ask?' }]).slice(0, 3) };
      }
      state.last = null;
      if (offTopic) return { blocks: [{ k: 'p', x: pick(['That one’s outside my little pond, I’m afraid!', 'Ooh, I’d only be guessing on that one, and I’d rather not.', 'That’s not something I know about, sorry!']) +
        ' I stick to this program: sharing the load, getting along, check-ins, different wiring and calming down. Here are some things I can help with:' }], chips: STARTERS, kind: 'offtopic' };
      return { blocks: [{ k: 'p', x: pick(['I looked through the site’s pages and my notes, and couldn’t find anything that really answers that.', 'I’m sorry, I couldn’t find that in the site’s pages or my notes.', 'That one isn’t covered here, as far as I can find.']) +
        ' I’d rather not guess. You could tell me a bit more, or pick one of these:' }],
        chips: STARTERS, kind: 'none' };
    }
    return answerFrom(state, hits, res.terms, true);
  }

  function findGloss(key) {
    if (!KB) return -1;
    for (var i = 0; i < KB.docs.length; i++) if (KB.docs[i].g && (KB.docs[i].k || '').split(' ')[0] === key) return i;
    return -1;
  }

  function answerFrom(state, hits, terms, first) {
    var shown = state.last.shown, picked = [], pages = {};
    Object.keys(shown).forEach(function (i) { pages[KB.docs[i].u.split('#')[0] + '|' + KB.docs[i].h] = 1; });
    var topS = null;
    for (var j = 0; j < hits.length && picked.length < 2; j++) {
      var h = hits[j], d = KB.docs[h.i];
      if (shown[h.i]) continue;
      if (topS === null) topS = h.s;
      else if (h.s < topS * 0.55 || h.cov < 0.5) break;
      var key = d.u.split('#')[0] + '|' + d.h;
      if (pages[key]) continue;
      if (picked.length && d.tip) continue;
      // a glossary entry and a page passage pair well; two long passages are plenty
      pages[key] = 1; pages[d.u.split('#')[0] + '|' + d.h] = 1;
      picked.push(h.i);
      if (!d.g && picked.length === 1 && wc(d.x) > 90) { /* allow one more only if it's short */ }
    }
    if (!picked.length) return { blocks: [{ k: 'p', x: 'That’s everything I found on that here. You could try asking in different words, or pick one of these:' }], chips: STARTERS.slice(0, 3) };
    var blocks = [{ k: 'p', x: first ? pick(LEAD_FIRST) : pick(LEAD_NEXT) }];
    picked.forEach(function (i, n) {
      shown[i] = 1;
      if (n > 0) blocks.push({ k: 'p', x: pick(LEAD_MORE) });
      blocks.push(passageBlock(i, terms));
    });
    return { blocks: blocks, chips: moreChips(state, followUps(picked, hits, 2)) };
  }

  function moreChips(state, chips) {
    var L = state.last;
    if (L && L.res && L.res.hits.some(function (h) { return !L.shown[h.i] && h.cov >= 0.5 && !KB.docs[h.i].tip; })) chips.unshift({ label: 'Tell me more', q: 'Tell me more' });
    return chips.slice(0, 3);
  }

  function more(state) {
    var L = state.last;
    if (!L) return { blocks: [{ k: 'p', x: 'Happy to. What would you like to hear more about?' }], chips: STARTERS };
    var hits = L.res ? L.res.hits.filter(function (h) { return !L.shown[h.i] && h.cov >= 0.45; }) : [];
    if (!hits.length) {
      // the pages have nothing more: the background notes may
      if (L.q && !IDX.bg && !bgTried) return { needBG: true };
      var bh = L.q && IDX.bg ? bgSearch(L.q)[0] : null;
      if (bh && bh.cov >= 0.5 && bh.s >= 2.5) {
        var rb = bgReply(state, bh.i);
        rb.blocks.unshift({ k: 'p', x: 'That’s everything the site’s pages say on that. My background notes add a little more:' });
        return rb;
      }
      return { blocks: [{ k: 'p', x: 'That’s all I could find on that. Want to try something else?' }], chips: STARTERS.slice(0, 3) };
    }
    return answerFrom(state, hits.slice(0, 1).map(function (h) { return { i: h.i, s: h.s, cov: 1 }; }).concat(hits.slice(1)), L.res.terms, false);
  }

  function surprise(state) {
    var pool = [];
    KB.docs.forEach(function (d, i) { if (!d.tip && d.u && wc(d.x) >= 35 && (d.g || !d.d)) pool.push(i); });
    var i = pick(pool), d = KB.docs[i];
    state.last = { q: d.h, res: search(d.h), shown: {} };
    state.last.shown[i] = 1;
    return { blocks: [{ k: 'p', x: pick(['Here’s something from the site:', 'A little something from these pages:', 'Here’s one you might like:']) }, passageBlock(i, [])],
      chips: [{ label: 'Surprise me again', q: 'Surprise me' }].concat(followUps([i], state.last.res.hits, 2)) };
  }

  function tip(state) {
    var pool = [];
    KB.docs.forEach(function (d, i) { if (d.tip) pool.push(i); });
    if (!pool.length) return surprise(state);
    var i = pick(pool);
    return { blocks: [{ k: 'p', x: 'Here’s a little tip from the site’s collection:' }, passageBlock(i, [])], chips: [{ label: 'Another tip', q: 'Give me a tip' }, { label: 'Surprise me', q: 'Surprise me' }] };
  }

  // One message in, one reply out; fetches the background notes first when an answer needs them.
  function reply(state, q, doc, cb) {
    var r;
    function safe(fn) {
      try { return fn(); }
      catch (e) { return { blocks: [{ k: 'p', x: 'Sorry, something went wrong on my side. Could you try asking another way?' }], chips: STARTERS }; }
    }
    r = safe(function () { return respond(state, q, doc); });
    if (r && r.needBG) {
      loadBG(function () {
        var r2 = safe(function () { return respond(state, q, doc); });
        if (r2 && r2.needBG) r2 = { blocks: [{ k: 'p', x: 'I couldn’t open my background notes just now. Could you try again in a moment?' }], chips: STARTERS };
        cb(r2);
      });
      return;
    }
    cb(r);
  }

  // ------------------------------------------------------------------ styles
  var CSS = [
    '.tolc,.tolc *{box-sizing:border-box}',
    '.tolc{--c:#7FA88A;--c-soft:#E6EFE6;--paper:#FBF7EC;--paper2:#F3ECD9;--ink:#2B2620;--ink-soft:#5A5346;--line:#DCCFAE;--focus:#2B5B8C;',
    ' font-family:"Lora",Georgia,serif;color:var(--ink);font-size:16px;line-height:1.55;display:flex;flex-direction:column;background:var(--paper);text-align:left}',
    '.tolc p,.tolc h3{margin:0;max-width:none;line-height:1.5}',
    '.tolc .tolc-name{line-height:1.2}.tolc .tolc-sub{line-height:1.3}',
    '.tolc-scrim{position:fixed;inset:0;z-index:1090;background:rgba(43,38,32,.28)}',
    '.tolc.is-modal{position:fixed;z-index:1100;left:0;right:0;bottom:0;height:min(88vh,720px);height:min(88dvh,720px);border-radius:22px 22px 0 0;',
    ' box-shadow:0 -10px 40px rgba(43,38,32,.22);border:1px solid var(--line);border-bottom:0}',
    '@media (min-width:720px){.tolc.is-modal{left:auto;right:24px;bottom:24px;width:400px;height:min(640px,calc(100vh - 48px));border-radius:22px;border-bottom:1px solid var(--line)}',
    ' .tolc-scrim{background:rgba(43,38,32,.12)}}',
    '.tolc.is-inline{position:relative;height:min(620px,78vh);border:1px solid var(--line);border-radius:20px;box-shadow:0 6px 24px rgba(43,38,32,.08);margin:1.5rem 0;overflow:hidden}',
    // phones: the inline chat grows with the page (no small scroll box inside it); new answers are scrolled into view
    '@media (max-width:719px){.tolc.is-inline{height:auto;overflow:visible}.tolc.is-inline .tolc-log{flex:none;overflow:visible;min-height:10rem;overscroll-behavior:auto}',
    ' .tolc.is-inline .tolc-msg,.tolc.is-inline .tolc-typing{scroll-margin-top:5rem;scroll-margin-bottom:6rem}}',
    '.tolc.is-modal.is-in{animation:tolc-up .28s ease-out}',
    '@keyframes tolc-up{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}',
    '.tolc-head{display:flex;align-items:center;gap:.7rem;padding:.8rem .8rem .7rem 1rem;border-bottom:1px solid var(--line);background:linear-gradient(var(--c-soft),var(--paper));border-radius:inherit;border-bottom-left-radius:0;border-bottom-right-radius:0}',
    '.tolc.is-modal .tolc-head::before{content:"";position:absolute;left:50%;top:6px;width:38px;height:4px;margin-left:-19px;border-radius:4px;background:var(--line)}',
    '@media (min-width:720px){.tolc.is-modal .tolc-head::before{display:none}}',
    '.tolc-av{flex:0 0 auto;width:46px;height:46px;border-radius:50%;background:var(--c-soft);display:grid;place-items:center;font-size:26px;line-height:1;box-shadow:inset 0 0 0 2px var(--c)}',
    '.tolc-av svg{width:38px;height:38px;display:block}',
    '.tolc.is-typing .tolc-av{animation:tolc-bob 1.4s ease-in-out infinite}',
    '@keyframes tolc-bob{0%,100%{transform:none}50%{transform:translateY(-2px) rotate(-3deg)}}',
    '.tolc-who{flex:1;min-width:0}',
    '.tolc-name{font-family:"Fraunces",Georgia,serif;font-weight:600;font-size:1.12rem;line-height:1.2;margin:0;letter-spacing:-.01em}',
    '.tolc-sub{margin:0;font-size:.82rem;color:var(--ink-soft);line-height:1.3}',
    '.tolc-hbtn{min-width:44px;min-height:44px;border:0;background:none;border-radius:12px;color:var(--ink-soft);font:inherit;font-size:.85rem;cursor:pointer;padding:0 .55rem}',
    '.tolc-hbtn:hover{background:var(--paper2);color:var(--ink)}',
    '.tolc-x{font-size:1.5rem;line-height:1}',
    '.tolc-log{flex:1;overflow-y:auto;padding:1rem .9rem .5rem;display:flex;flex-direction:column;gap:.7rem;overscroll-behavior:contain;scroll-behavior:smooth}',
    '.tolc-msg{max-width:92%;padding:.65rem .85rem;border-radius:18px;word-wrap:break-word;overflow-wrap:anywhere}',
    '.tolc-msg p{margin:0 0 .5rem;max-width:none}',
    '.tolc-msg p:last-child{margin-bottom:0}',
    '.tolc-bot{align-self:flex-start;background:#fff;border:1px solid var(--line);border-bottom-left-radius:6px}',
    '.tolc-me{align-self:flex-end;background:var(--c-soft);border:1px solid var(--c);border-bottom-right-radius:6px}',
    '.tolc-card{margin:.5rem 0 .6rem;padding:.6rem .75rem;border-radius:12px;background:var(--paper);border-left:3px solid var(--c)}',
    '.tolc-card:last-child{margin-bottom:0}',
    '.tolc-card h3{font-family:"Fraunces",Georgia,serif;font-size:.98rem;font-weight:600;margin:0 0 .1rem;line-height:1.3}',
    '.tolc-src{font-size:.75rem;color:var(--ink-soft);margin:0 0 .35rem !important;font-style:italic}',
    '.tolc-card p{font-size:.95rem}',
    '.tolc a.tolc-more{display:inline-flex;align-items:center;min-height:44px;color:var(--ink);font-weight:600;font-size:.9rem;text-decoration:underline;text-decoration-color:var(--c);text-decoration-thickness:2px;text-underline-offset:4px}',
    '.tolc a.tolc-more:hover{color:var(--focus)}',
    '.tolc .tolc-h{font-family:"Fraunces",Georgia,serif;font-weight:600;font-size:.92rem;margin:.7rem 0 .2rem;color:var(--ink)}',
    '.tolc .tolc-fine{font-size:.8rem;color:var(--ink-soft);font-style:italic;margin:.5rem 0 .3rem}',
    '.tolc-list{margin:.2rem 0 .5rem;padding-left:1.15rem}.tolc-list li{margin:.2rem 0;font-size:.95rem}',
    '.tolc-links{margin:.1rem 0 .3rem;padding-left:1.3rem}.tolc-links li{margin:0}.tolc-links a.tolc-more{min-height:40px}',
    '.tolc-script{margin:.5rem 0 .6rem;padding:.55rem .75rem;border-radius:12px;background:var(--c-soft);border-left:3px solid var(--c)}',
    '.tolc-script p{font-size:.95rem;margin:0}.tolc-script .tolc-src{font-style:normal;font-weight:600;margin-bottom:.2rem !important}',
    '.tolc-bgcard{background:#FFFDF6;border-left-style:dashed}',
    '.tolc-chips{display:flex;flex-wrap:wrap;gap:.45rem;padding:.2rem .9rem .5rem}',
    '.tolc-chips:empty{display:none}',
    '@media (max-width:719px){.tolc-chips{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;padding-bottom:.6rem}.tolc-chips::-webkit-scrollbar{display:none}.tolc-chip{flex:0 0 auto;white-space:nowrap}}',
    '.tolc-chip{min-height:44px;padding:.45rem .9rem;border-radius:22px;border:1px solid var(--c);background:#fff;color:var(--ink);font:inherit;font-size:.88rem;line-height:1.25;cursor:pointer;text-align:left}',
    '.tolc-chip:hover{background:var(--c-soft)}',
    '.tolc-typing{align-self:flex-start;display:flex;gap:5px;padding:.85rem 1rem;background:#fff;border:1px solid var(--line);border-radius:18px;border-bottom-left-radius:6px}',
    '.tolc-typing i{width:7px;height:7px;border-radius:50%;background:var(--c);animation:tolc-dot 1.1s infinite ease-in-out}',
    '.tolc-typing i:nth-child(2){animation-delay:.15s}.tolc-typing i:nth-child(3){animation-delay:.3s}',
    '@keyframes tolc-dot{0%,80%,100%{opacity:.3;transform:none}40%{opacity:1;transform:translateY(-3px)}}',
    '.tolc-form{display:flex;gap:.5rem;padding:.6rem .8rem 0;border-top:1px solid var(--line);background:var(--paper)}',
    '.tolc-input{flex:1;min-width:0;min-height:46px;border:1px solid var(--line);border-radius:23px;padding:.55rem 1rem;font:inherit;font-size:16px;color:var(--ink);background:#fff}',
    '.tolc-input::placeholder{color:#8A8272}',
    '.tolc-send{flex:0 0 auto;width:46px;height:46px;border-radius:50%;border:0;background:var(--c);color:#fff;cursor:pointer;display:grid;place-items:center}',
    '.tolc-send svg{width:20px;height:20px}',
    '.tolc-send:disabled{opacity:.5;cursor:default}',
    '.tolc-note{margin:0;padding:.4rem 1rem .7rem;font-size:.74rem;line-height:1.35;color:var(--ink-soft);text-align:center;background:var(--paper);border-radius:0 0 inherit inherit}',
    '.tolc.is-modal .tolc-note{padding-bottom:max(.7rem,env(safe-area-inset-bottom))}',
    '.tolc :focus-visible{outline:2px solid var(--focus);outline-offset:2px}',
    '.tolc-sr{position:absolute !important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
    '.tolc-msg.is-new{animation:tolc-in .25s ease-out}',
    '@keyframes tolc-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}',
    'html.tolc-lock,html.tolc-lock body{overflow:hidden}',
    '.tolc[hidden],.tolc-scrim[hidden]{display:none !important}',
    '@media (min-width:720px){html.tolc-lock,html.tolc-lock body{overflow:auto}}',
    '@media (prefers-reduced-motion:reduce){.tolc *,.tolc{animation:none !important;transition:none !important;scroll-behavior:auto !important}}'
  ].join('\n');
  function injectCSS() {
    if (document.getElementById('tolc-style')) return;
    var st = document.createElement('style'); st.id = 'tolc-style'; st.textContent = CSS; document.head.appendChild(st);
  }

  // ------------------------------------------------------------------ the chat widget
  function blobSVG(color) {
    return '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M24 5c9 0 17 6 18 16 1.2 11-6 21-18 21S4.8 32 6 21C7 11 15 5 24 5z" fill="' + color + '"/>' +
      '<ellipse cx="18" cy="22" rx="2.6" ry="3.2" fill="#2B2620"/><ellipse cx="30" cy="22" rx="2.6" ry="3.2" fill="#2B2620"/>' +
      '<circle cx="18.9" cy="20.8" r=".9" fill="#fff"/><circle cx="30.9" cy="20.8" r=".9" fill="#fff"/>' +
      '<path d="M19.5 29c2.6 2.6 6.4 2.6 9 0" stroke="#2B2620" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="13" cy="28" rx="3" ry="1.8" fill="#F2A7A0" opacity=".7"/><ellipse cx="35" cy="28" rx="3" ry="1.8" fill="#F2A7A0" opacity=".7"/></svg>';
  }
  function validColor(c) { return typeof c === 'string' && c.length < 40 && window.CSS && CSS.supports && CSS.supports('color', c) ? c : null; }
  function softOf(color) {
    // a pale tint of the character colour, for bubbles and the header
    var probe = document.createElement('span'); probe.style.color = color; document.body.appendChild(probe);
    var m = getComputedStyle(probe).color.match(/\d+(\.\d+)?/g); probe.remove();
    if (!m) return '#E6EFE6';
    var r = +m[0], g = +m[1], b = +m[2];
    function mix(v) { return Math.round(v * 0.22 + 255 * 0.78); }
    return 'rgb(' + mix(r) + ',' + mix(g) + ',' + mix(b) + ')';
  }

  function load() { try { return JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null'); } catch (e) { return null; } }
  function save(msgs) { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(msgs.slice(-40))); } catch (e) { /* private mode: fine */ } }

  var send_svg = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12l15-7-5 15-2.5-6.2L4 12z" fill="currentColor"/></svg>';

  function Chat(mode, host) {
    var me = this;
    this.mode = mode;
    this.state = { last: null };
    this.msgs = load() || [];
    this.busy = false;
    injectCSS();
    var root = this.root = document.createElement('div');
    root.className = 'tolc no-dive is-' + mode;
    var uid = 'tolc' + Math.random().toString(36).slice(2, 8);
    if (mode === 'modal') {
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-labelledby', uid + '-name');
      root.setAttribute('aria-describedby', uid + '-note');
    } else {
      root.setAttribute('role', 'region');
      root.setAttribute('aria-labelledby', uid + '-name');
    }
    root.innerHTML =
      '<div class="tolc-head"><div class="tolc-av"></div><div class="tolc-who"><p class="tolc-name" id="' + uid + '-name"></p><p class="tolc-sub">Your guide to the whole program</p></div>' +
      '<button type="button" class="tolc-hbtn tolc-reset">Start over</button>' +
      (mode === 'modal' ? '<button type="button" class="tolc-hbtn tolc-x" aria-label="Close chat">&times;</button>' : '') + '</div>' +
      '<div class="tolc-log" role="log" aria-live="polite" aria-relevant="additions" tabindex="0" aria-label="Conversation"></div>' +
      '<div class="tolc-chips" role="group" aria-label="Suggestions"></div>' +
      '<form class="tolc-form" autocomplete="off"><label class="tolc-sr" for="' + uid + '-in"></label>' +
      '<input class="tolc-input" id="' + uid + '-in" type="text" enterkeyhint="send" maxlength="300" spellcheck="true">' +
      '<button class="tolc-send" type="submit" aria-label="Send">' + send_svg + '</button></form>' +
      '<p class="tolc-note" id="' + uid + '-note">' + PRIVACY_LINE + '</p>';
    this.log = root.querySelector('.tolc-log');
    this.chips = root.querySelector('.tolc-chips');
    this.input = root.querySelector('.tolc-input');
    this.form = root.querySelector('.tolc-form');
    this.form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = me.input.value.replace(/\s+/g, ' ').trim();
      if (!v) return;
      me.input.value = '';
      if (me.busy) { me.pending = v; return; }  // asked while a reply is on its way: answer it next
      me.ask(v);
    });
    root.querySelector('.tolc-reset').addEventListener('click', function () { me.reset(); });
    if (mode === 'modal') {
      root.querySelector('.tolc-x').addEventListener('click', function () { api.close(); });
      root.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); api.close(); return; }
        if (e.key !== 'Tab') return;
        var f = Array.prototype.filter.call(root.querySelectorAll('button, a[href], input, [tabindex="0"]'), function (n) { return !n.disabled && n.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });
    }
    this.chips.addEventListener('click', function (e) {
      var b = e.target.closest('.tolc-chip');
      if (!b || me.busy) return;
      var doc = b.getAttribute('data-doc');
      me.log.focus({ preventScroll: true });  // the chip is about to be replaced; keep focus inside the chat
      me.ask(b.getAttribute('data-q') || b.textContent, doc != null ? +doc : null);
    });
    host.appendChild(root);
  }

  Chat.prototype.setChar = function (opts) {
    opts = opts || {};
    var c = this.char = {
      name: (typeof opts.name === 'string' && opts.name.trim()) ? opts.name.trim().slice(0, 40) : DEFAULT_CHAR.name,
      color: validColor(opts.color) || DEFAULT_CHAR.color,
      emoji: typeof opts.emoji === 'string' ? opts.emoji.slice(0, 8) : '',
      svg: typeof opts.svg === 'string' && /^\s*<svg[\s>]/i.test(opts.svg) && !/<script|on\w+\s*=|javascript:/i.test(opts.svg) ? opts.svg : ''
    };
    c.greeting = typeof opts.greeting === 'string' && opts.greeting.trim() ? opts.greeting.trim() :
      (c.name === DEFAULT_CHAR.name ? DEFAULT_CHAR.greeting : 'Hi, I’m ' + c.name + '. Ask me anything about this site, and I’ll share what its pages say, with a link to read more.');
    this.root.style.setProperty('--c', c.color);
    this.root.style.setProperty('--c-soft', softOf(c.color));
    var av = this.root.querySelector('.tolc-av');
    if (c.svg) av.innerHTML = c.svg;
    else if (c.emoji) { av.textContent = c.emoji; }
    else av.innerHTML = blobSVG(c.color);
    av.setAttribute('aria-hidden', 'true');
    this.root.querySelector('.tolc-name').textContent = c.name;
    this.root.querySelector('label').textContent = 'Ask ' + c.name + ' a question';
    this.input.placeholder = 'Ask ' + c.name + ' something…';
  };

  Chat.prototype.render = function (m, isNew) {
    var el = document.createElement('div');
    el.className = 'tolc-msg ' + (m.r === 'u' ? 'tolc-me' : 'tolc-bot') + (isNew ? ' is-new' : '');
    if (m.r === 'u') {
      var p = document.createElement('p'); p.textContent = m.x; el.appendChild(p);
      var sr = document.createElement('span'); sr.className = 'tolc-sr'; sr.textContent = 'You said: '; el.insertBefore(sr, p);
    } else {
      var sr2 = document.createElement('span'); sr2.className = 'tolc-sr'; sr2.textContent = (m.n || 'Buddy') + ' says: '; el.appendChild(sr2);
      (m.b || []).forEach(function (b) {
        if (b.k === 'p') { var p2 = document.createElement('p'); p2.textContent = b.x; el.appendChild(p2); return; }
        if (b.k === 'h' || b.k === 'note') { var ph = document.createElement('p'); ph.className = b.k === 'h' ? 'tolc-h' : 'tolc-fine'; ph.textContent = b.x; el.appendChild(ph); return; }
        if (b.k === 'list') {
          var ul = document.createElement('ul'); ul.className = 'tolc-list';
          (b.x || []).forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
          el.appendChild(ul); return;
        }
        if (b.k === 'script') {
          var sc = document.createElement('div'); sc.className = 'tolc-script';
          if (b.l) { var sl = document.createElement('p'); sl.className = 'tolc-src'; sl.textContent = b.l; sc.appendChild(sl); }
          var sp = document.createElement('p'); sp.textContent = '“' + String(b.x).replace(/^[“"]|[”"]$/g, '') + '”'; sc.appendChild(sp);
          el.appendChild(sc); return;
        }
        if (b.k === 'links') {
          var ol = document.createElement('ol'); ol.className = 'tolc-links';
          (b.x || []).forEach(function (l) {
            if (!l || !safePath(l[1])) return;
            var li2 = document.createElement('li'), a2 = document.createElement('a');
            a2.className = 'tolc-more'; a2.href = l[1]; a2.textContent = l[0] + ' →'; li2.appendChild(a2); ol.appendChild(li2);
          });
          if (ol.children.length) el.appendChild(ol);
          return;
        }
        if (b.k === 'bg') {
          var bc = document.createElement('div'); bc.className = 'tolc-card tolc-bgcard';
          var bh3 = document.createElement('h3'); bh3.textContent = b.h; bc.appendChild(bh3);
          (b.x || []).forEach(function (t) { var bp = document.createElement('p'); bp.textContent = t; bc.appendChild(bp); });
          if (b.ev) { var be = document.createElement('p'); be.className = 'tolc-src'; be.textContent = 'How sure is this? ' + b.ev; bc.appendChild(be); }
          el.appendChild(bc); return;
        }
        var card = document.createElement('div'); card.className = 'tolc-card';
        var h = document.createElement('h3'); h.textContent = b.h; card.appendChild(h);
        if (b.src && b.src !== b.h) { var s = document.createElement('p'); s.className = 'tolc-src'; s.textContent = 'From “' + b.src + '”'; card.appendChild(s); }
        (b.x || []).forEach(function (t) { var q = document.createElement('p'); q.textContent = t; card.appendChild(q); });
        if (b.u && safePath(b.u)) {
          var a = document.createElement('a'); a.className = 'tolc-more'; a.href = b.u;
          a.textContent = (b.l && b.l !== 'Read more' ? b.l : 'Read more') + ' →';
          card.appendChild(a);
        }
        el.appendChild(card);
      });
    }
    this.log.appendChild(el);
    return el;
  };

  Chat.prototype.setChips = function (chips) {
    var box = this.chips; box.textContent = '';
    (chips || []).forEach(function (c) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'tolc-chip'; b.textContent = c.label;
      if (c.doc != null) b.setAttribute('data-doc', c.doc);
      if (c.q) b.setAttribute('data-q', c.q);
      box.appendChild(b);
    });
  };

  // true when the log has no scroll box of its own (the inline chat on a phone): scroll the page instead
  Chat.prototype.flows = function () {
    return this.mode === 'inline' && getComputedStyle(this.log).overflowY === 'visible';
  };

  Chat.prototype.scrollTo = function (el) {
    var log = this.log;
    if (this.flows()) {
      // only after someone has asked something, so a greeting or a restored chat never moves the page on load
      var target = el || log.lastElementChild;
      if (!this.asked || !target) return;
      var r = target.getBoundingClientRect(), vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.top < 60 || r.top > vh * 0.55) target.scrollIntoView({ block: 'start', behavior: REDUCED ? 'auto' : 'smooth' });
      return;
    }
    if (!el) { log.scrollTop = log.scrollHeight; return; }
    var top = el.offsetTop - log.offsetTop - 8;
    log.scrollTop = Math.max(0, Math.min(top, log.scrollHeight));
  };

  Chat.prototype.say = function (blocks, chips, delay) {
    var me = this;
    this.busy = true;
    this.root.classList.add('is-typing');
    var t = document.createElement('div'); t.className = 'tolc-typing'; t.setAttribute('aria-hidden', 'true'); t.innerHTML = '<i></i><i></i><i></i>';
    this.log.appendChild(t); this.scrollTo();

    setTimeout(function () {
      t.remove();
      me.root.classList.remove('is-typing');
      var m = { r: 'b', b: blocks, n: me.char.name };
      me.msgs.push(m); save(me.msgs);
      var el = me.render(m, true);
      me.setChips(chips);
      me.lastChips = chips;
      me.scrollTo(el);
      me.busy = false;
      me.root.querySelector('.tolc-send').disabled = false;
      if (me.pending) { var nx = me.pending; me.pending = null; me.ask(nx); }
    }, delay == null ? (REDUCED ? 250 : 650) : delay);
  };

  Chat.prototype.ask = function (text, doc) {
    var me = this;
    this.asked = true;
    var m = { r: 'u', x: text };
    this.msgs.push(m); save(this.msgs);
    this.setChips([]);
    this.scrollTo(this.render(m, true));
    loadKB(function (ok) {
      if (!ok) { me.say([{ k: 'p', x: 'Sorry, I couldn’t open the site’s pages just now. Please try again in a moment.' }], [], 300); return; }
      reply(me.state, text, doc, function (r) {
        var len = r.blocks.reduce(function (n, b) { return n + wc(b.x && b.x.join ? b.x.join(' ') : b.x || ''); }, 0);
        me.say(r.blocks, r.chips, REDUCED ? 250 : Math.min(1300, 450 + len * 6));
      });
    });
  };

  Chat.prototype.greet = function (text) {
    this.say([{ k: 'p', x: text }], STARTERS, REDUCED ? 150 : 450);
  };

  Chat.prototype.start = function (opts) {
    opts = opts || {};
    var changed = !this.char || (opts.name && opts.name !== this.char.name);
    this.setChar(opts);
    if (!this.started) {
      this.started = true;
      var me = this;
      this.msgs.forEach(function (m) { me.render(m, false); });
      if (this.msgs.length) { this.setChips(STARTERS.slice(0, 3)); this.scrollTo(); }
    }
    if (!this.msgs.length || (changed && opts.greeting)) this.greet(this.char.greeting);
    if (typeof opts.topic === 'string' && opts.topic.trim()) this.ask(opts.topic.trim().slice(0, 300));
    loadKB(function () {});
  };

  Chat.prototype.reset = function () {
    this.msgs = []; save(this.msgs); this.state.last = null;
    this.log.textContent = ''; this.setChips([]);
    this.greet(this.char.greeting);
    this.input.focus();
  };

  // ------------------------------------------------------------------ public API
  var modal = null, scrim = null, inline = null, lastFocus = null;
  var api = {
    open: function (opts) {
      if (inline && document.body.contains(inline.root)) {
        inline.start(opts);
        inline.root.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' });
        inline.input.focus({ preventScroll: true });
        return;
      }
      if (!modal) {
        scrim = document.createElement('div'); scrim.className = 'tolc-scrim'; scrim.hidden = true;
        scrim.addEventListener('click', function () { api.close(); });
        document.body.appendChild(scrim);
        modal = new Chat('modal', document.body);
        modal.root.hidden = true;
      }
      if (modal.root.hidden) lastFocus = document.activeElement;
      scrim.hidden = false; modal.root.hidden = false;
      modal.root.classList.remove('is-in'); void modal.root.offsetWidth; modal.root.classList.add('is-in');
      document.documentElement.classList.add('tolc-lock');
      modal.start(opts);
      setTimeout(function () { modal.input.focus(); }, 30);
    },
    close: function () {
      if (!modal || modal.root.hidden) return;
      modal.root.hidden = true; scrim.hidden = true;
      document.documentElement.classList.remove('tolc-lock');
      if (lastFocus && lastFocus.focus && document.body.contains(lastFocus)) lastFocus.focus();
    },
    mount: function (el, opts) {
      if (!el) return null;
      inline = new Chat('inline', el);
      inline.start(opts);
      return inline;
    },
    // for tests and tooling: rank passages without showing anything
    _ask: function (q, cb) { loadKB(function () { reply({ last: null }, q, null, cb); }); },
    // a conversation that remembers the last topic, for testing follow-ups
    _session: function () { var st = { last: null }; return { ask: function (q, cb) { loadKB(function () { reply(st, q, null, cb); }); }, state: st }; },
    _bgLoaded: function () { return !!(IDX && IDX.bg); },
    _search: function (q, cb) { loadKB(function () { cb(search(q).hits.slice(0, 6).map(function (h) { return [KB.docs[h.i].h, +h.s.toFixed(2), +h.cov.toFixed(2)]; })); }); }
  };
  api._sit = function (q) { var f = norm(q), d = detectSituation(f), sc = {}; Object.keys(IDX.sit.issues).forEach(function (k) { var n = 0; IDX.sit.issues[k].res.forEach(function (r) { if (r[0].test(f)) n += r[1]; }); if (n) sc[k] = n; }); d.all = sc; return d; };
  api._debug = function (q) { return { tokens: tokens(q), top: search(q).hits.slice(0, 3).map(function (h) { return [KB.docs[h.i].h, +h.s.toFixed(2), +h.cov.toFixed(2)]; }), terms: search(q).terms }; };
  window.TOLChat = api;

  function hook() { if (/[?&]chat=1(&|$)/.test(location.search)) api.open(); }
  if (document.readyState === 'complete') setTimeout(hook, 0); else window.addEventListener('load', hook);  // after any inline mount
})();
