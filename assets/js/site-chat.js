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
  var HONEST_LINE = 'I don’t make things up: every answer comes from what’s already written on this site. I pick the best match. I don’t invent new answers. I can still pick the wrong topic, so if I miss, tell me “that’s not it.” I’m not a therapist and can’t diagnose.';
  // "can I trust your answers?", "do you hallucinate?", "are you AI?": where the answers come from, honestly
  var TRUST_Q = /\b(can i (trust|believe|rely on) (you|your answers?|what you (say|tell me|tell|write)|anything you (say|tell me)|this chat|puddles|the professor)|do you (ever )?(hallucinate|make (things|stuff|it) up|invent (things|stuff|answers)|lie|guess)|are you (an? )?(ai|a\.i|chat ?bot|chatgpt|chat gpt|gpt|llm|language model|bot|robot|real|human|real person)|is this (an? )?(ai|chatgpt|chat gpt|bot|chatbot|real person)|are your answers (true|real|reliable|accurate|right|correct|checked|made up)|where do (your|you get your) answers come from|where do you get (your|the) (answers|information|info)|how do you know (all )?(this|that|things)|are you (making|making this|making that) up|is this made up|is (this|that|it) (real|professional|proper|good|reliable|trustworthy) advice|can i trust (this|this site|it|the answers?)|are you (rule ?based|scripted|generative|a generative ai|accurate|reliable|always right)|do you (ever )?(get (things|it|stuff) wrong|make mistakes)|is puddles (an? )?(ai|bot|chatbot|real)|(is|are) (this|this thing|it|you|puddles|he|the professor|this chat|this bot|your answers) (actually |really |just |even |only )?(an? )?(real )?(ai|a i|bot|chatbot|chat ?gpt|gpt|robot|canned|scripted|real ai|real person|generative)|canned (answers|responses|replies|stuff)|(just|only) (canned|scripted|pre ?written|preset|pre ?set|copy ?paste)( answers| responses| replies)?|actually (an? )?ai|ai or (just |only )?(canned|scripted|a script|a person|real)|is (this|it) (a )?(real )?(ai|a i) or|(are|is) (these|the|your|his) (answers|replies|responses) (just |all |actually )?(scripted|canned|pre ?written|ai|generated|made by ai))\b/;
  // "what modes do you have?", "what is deep mode?": light and deep, explained
  var MODES_Q = /\b(what|which) (modes?|ways (to|of) (chat|talk)\w*) (do you have|have you got|are there|can (i|we) (use|pick|choose))\b|^(what|which) modes( are there)?$|\bwhat (is|s|are) (the )?(deep mode|talk deep|deep talk|light mode|small talk mode)\b|\bdifference between (small talk|light mode|light talk|light) and (deep|talk deep|deep talk|deep mode)\b|\bhow (do|does) (talk deep|deep mode|deep talk|small talk mode) work\b|\b(explain|tell me about) (your|the) modes\b/;
  // internal or structural headings never offered as a likely topic
  var HIDE_TITLE = /\b(carrier wave vs\.? payload|architecture|pillar [ivx]+|in detail|sources?|references?|footnotes?)\b/i;
  var PRIVACY_LINE = 'Answers come from this site’s pages and the Professor’s notes. What you type stays on this device.';

  var DEFAULT_CHAR = {
    name: 'Professor Puddles',
    color: '#7FA88A',
    greeting: 'Hi, I’m Professor Puddles. Tell me what’s on your mind in your own words, and I’ll suggest a page and some words you could say.'
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
      // "work paper two", "wp-o2", "workpaper #3": the same workpaper codes, typed loosely
      .replace(/\bwork\s+papers?\b/g, 'workpaper').replace(/\b(wp|workpaper|calc)\s*-?\s*#?\s*o(\d)\b/g, '$1 0$2')
      .replace(/\b(wp|workpaper|calc|prog|report)\s*-?\s*#?\s*(one|two|three|four|nine|eleven|thirteen)\b/g, function (m, a, n) {
        return a + ' ' + { one: 1, two: 2, three: 3, four: 4, nine: 9, eleven: 11, thirteen: 13 }[n];
      })
      .replace(/\b(wp|calc|prog|report)\s*-?\s*#?\s*0*(\d{1,2})\b/g, function (m, a, n) { return a + (n.length < 2 ? '0' : '') + n; })
      .replace(/\bworkpaper\s*-?\s*#?\s*0*(\d{1,2})\b/g, function (m, n) { return 'wp' + (n.length < 2 ? '0' : '') + n; })
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
  // A sentence ends at . ! ? or … followed by a space (so "alz.org" stays one word), and never inside a “quote”
  // (“Thanks. We’ve got it covered.” is one piece, so an excerpt never starts halfway through someone's words)
  function sentences(s) {
    var acc = [];
    String(s).split(/\n+/).forEach(function (para) {
      var re = /[.!?…]+[”"’)]*(?=\s|$)/g, m, last = 0, buf = '';
      while ((m = re.exec(para))) {
        buf += para.slice(last, m.index + m[0].length); last = m.index + m[0].length;
        var open = (buf.match(/“/g) || []).length - (buf.match(/”/g) || []).length;
        if (open <= 0 && !/(^|\s)(e\.g|i\.e|Dr|Mr|Mrs|Ms|vs)\.$/.test(buf.trim())) { acc.push(buf.trim()); buf = ''; }
      }
      buf += para.slice(last);
      if (buf.trim()) acc.push(buf.trim());
    });
    return acc.filter(Boolean);
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function safePath(u) { return typeof u === 'string' && /^\/[A-Za-z0-9._\-\/]*(\?[a-z]+=[A-Za-z0-9._\-]+(&[a-z]+=[A-Za-z0-9._\-]+)*)?(#[A-Za-z0-9._\-:]*)?$/.test(u) && u.indexOf('//') === -1; }

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
      if (c.topic) CV_PERSONAL[c.id] = 1;  // a caring topic card: it stays the topic for a few turns
    });
    cardKeys.sort(function (a, b) { return b.n - a.n; });
    // cards that answer before anything else (who can see this chat, something calming, "is it my fault?")
    var first = (KB.cards || []).filter(function (c) {
      if (c.notPat) { try { c.notRe = new RegExp(c.notPat); } catch (e) { c.notRe = null; } }
      return c.first && c.re;
    });
    // forgiving spelling: every word the site uses (how often), and the site's own topic words to correct toward
    var vocab = {}, fixTo = {};
    function countWords(t) { (String(t).toLowerCase().match(/[a-z]+/g) || []).forEach(function (w) { vocab[w] = (vocab[w] || 0) + 1; }); }
    docs.forEach(function (d) { countWords(d.h + ' ' + d.t + ' ' + d.x); });
    (KB.cards || []).forEach(function (c) { countWords([c.name || ''].concat(c.keys || [], c.what || [], c.how || []).join(' ')); });
    // words the chat's own patterns and notes know (fought, sunk cost, stocks…) count as spelled right too
    countWords(JSON.stringify([KB.syn || {}, KB.bgi || [], KB.clar || [], Object.keys((KB.sit || {}).issues || {}).map(function (k) { return KB.sit.issues[k].match; }), OFF_TOPIC.source, DANGER.source]).replace(/\\[bsw]/g, ' '));
    Object.keys(vocab).forEach(function (w) {
      if (w.length < 4 || vocab[w] < 2) return;
      var st = stem(w);
      if (!domain[st] && !(st.length >= 7 && domain['~' + st.slice(0, 7)])) return;
      (fixTo[w.charAt(0)] = fixTo[w.charAt(0)] || []).push([w, vocab[w], phon(w)]);
    });
    var sit = KB.sit || { who: {}, issues: {}, combos: {} };
    Object.keys(sit.who).forEach(function (k) { try { sit.who[k].re = new RegExp(sit.who[k].match); } catch (e) { sit.who[k].re = /$^/; } });
    Object.keys(sit.issues).forEach(function (k) {
      sit.issues[k].res = (sit.issues[k].match || []).map(function (m) { try { return [new RegExp(m[0]), m[1]]; } catch (e) { return [/$^/, 0]; } });
    });
    (KB.clar || []).forEach(function (c) { try { c.re = new RegExp(c.pat); } catch (e) { c.re = /$^/; } });
    // the site's own words, defined plainly (the glossary page), by name and other names
    var terms = {};
    (KB.terms || []).forEach(function (t, ti) {
      [t.t, t.id.replace(/-/g, ' ')].concat((t.a || []).filter(function (a) { return /\s/.test(a) || !GENERIC_ALIAS[a]; })).forEach(function (n, ni) {
        var k = termKey(n); if (k && !(k in terms)) terms[k] = { i: ti, own: ni < 2 };  // own: its name, not another name for it
      });
    });
    var idioms = [];
    (KB.idioms || []).forEach(function (x, xi) { (x.p || []).forEach(function (ph) { idioms.push({ p: ' ' + ph + ' ', i: xi }); }); });
    idioms.sort(function (a, b) { return b.p.length - a.p.length; });
    IDX = { N: N, df: df, tf: tf, len: len, head: head, avg: total / N, syn: syn, gloss: gloss, domain: domain,
      bgNames: bgNames, cardKeys: cardKeys, sit: sit, bg: null, first: first, vocab: vocab, fixTo: fixTo, terms: terms, idioms: idioms };
  }

  // one-word other names too common to mean the term ("what is calm?" isn't the Calm-Down Kit)
  var GENERIC_ALIAS = {};
  'wait closed log calm settle settings card quiet still font spacing listen dyslexia adhd autistic autism wp reader translator overwhelmed boundary level garden calculator weather forecast noise mask dive dives childhood tidbit sugarfoot pups raci responsible owner workload wired pace rhythm carrier'
    .split(' ').forEach(function (w) { GENERIC_ALIAS[w] = 1; });
  function termKey(s) { return words(s).filter(function (w) { return !/^(the|a|an)$/.test(w); }).map(stem).join(' '); }

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
  // Professor Puddles' infographics (assets/js/puddles-infographic.js): loaded the first time someone asks for a picture
  var IG_URL = KB_URL.replace(/chat-kb\.js$/, 'puddles-infographic.js'), igWaiting = [], igTried = false;
  function loadIG(cb) {
    if (window.TOLInfographic) return cb(window.TOLInfographic);
    if (igTried && !igWaiting.length) return cb(null);
    igWaiting.push(cb);
    if (igWaiting.length > 1) return;
    igTried = true;
    function done() { var w = igWaiting; igWaiting = []; w.forEach(function (f) { f(window.TOLInfographic || null); }); }
    var sc = document.createElement('script');
    sc.src = IG_URL; sc.async = true;
    sc.onload = done; sc.onerror = done;
    document.head.appendChild(sc);
  }
  // the Signal Translator's own rules (message-patterns.js, then signal-engine.js), loaded the first time someone asks
  // Professor Puddles to check a message, so a pasted "Mum, …" gets a reading and a warmer version right here
  var MP_URL = KB_URL.replace(/chat-kb\.js$/, 'message-patterns.js'), SE_URL = KB_URL.replace(/chat-kb\.js$/, 'signal-engine.js'), seWaiting = [], seTried = false;
  function loadSE(cb) {
    if (window.SignalEngine) return cb(window.SignalEngine);
    if (seTried && !seWaiting.length) return cb(null);
    seWaiting.push(cb);
    if (seWaiting.length > 1) return;
    seTried = true;
    function done() { var w = seWaiting; seWaiting = []; w.forEach(function (f) { f(window.SignalEngine || null); }); }
    function add(u, next) { var sc = document.createElement('script'); sc.src = u; sc.async = false; sc.onload = next; sc.onerror = done; document.head.appendChild(sc); }
    if (window.TOLPatterns) add(SE_URL, done); else add(MP_URL, function () { add(SE_URL, done); });
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
    var B = IDX.bg, base = tokens(q).filter(function (t) { return !NAME_STOP[t]; }), terms = [], seen = {};
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

  // the first names the book's worked examples use: someone's real "Alex" or "Sam" never pulls those examples up
  var NAME_STOP = {};
  'alex sam jo maya priya dani sarah ana taylor robin kim tasha marcus leo jordan'.split(' ').forEach(function (w) { NAME_STOP[w] = 1; });
  // Rank every passage for a query. Returns {hits:[{i,s,cov}], terms}
  function search(q, opts) {
    opts = opts || {};
    var base = tokens(q).filter(function (t) { return !NAME_STOP[t]; }), seen = {}, terms = [];
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
    // the site's own build notes ("Carrier Wave vs. Payload", "The site's architecture") only for questions about how it's built
    var wantBuild = /\b(architecture|built|build|code|coded|tech|technical|technology|design|designed|framework|pillars?)\b/.test(fold(q));
    // the privacy policy and terms answer questions about data and the site, never everyday life questions
    var wantLegal = /\b(privacy|private|data|cookies?|track\w*|personal information|terms|legal|policy|gdpr|stored|saved|send\w*|share\w* (my|our) (data|info)|under 13|age limit|how old)\b/.test(fold(q));
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
      if (!wantLegal && /^\/(legal\/|privacy|terms|accessibility|cookies?)/.test(d.u || '')) s *= 0.05;
      if (!wantBuild && /^\/architecture\//.test(d.u || '')) s *= 0.03;
      if (!wantBuild && /^\/library\.html#pillar/.test(d.u || '')) s *= 0.2;
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
    // it starts at the start of a sentence, so no leading “…” (that reads as if it began mid-sentence)
    return [text + (end < ss.length - 1 ? ' …' : '')];
  }

  var LEAD_FIRST = ['Here’s what the site says:', 'Here’s the gist, from the site:', 'This part of the site fits:'];
  var LEAD_MORE = ['Related, and worth knowing:', 'It also connects to this:', 'Another page adds:'];
  var LEAD_NEXT = ['Here’s a bit more on that:', 'Another part of the site on this:', 'There’s more here too:'];

  // Poster-style ALL-CAPS lines (from the infographic and the like) read as shouting in a chat: sentence case them.
  function unshout(s) {
    return String(s).replace(/[^.!?…]*[A-Z][^.!?…]*[.!?…]*/g, function (part) {
      var letters = part.replace(/[^A-Za-z]/g, '');
      if (letters.length < 12 || letters.replace(/[^A-Z]/g, '').length < letters.length * 0.8) return part;
      var low = part.toLowerCase().replace(/\b(i)\b/g, 'I').replace(/\b(wp|calc|prog|report|tol)(-?\d*)\b/g, function (m) { return m.toUpperCase(); });
      return low.replace(/^(\s*["“(]?)([a-z])/, function (m, a, c) { return a + c.toUpperCase(); });
    });
  }
  // a page's name without the site name search engines see ("Our Logo · Spread Love & Acceptance" → "Our Logo")
  function pageName(t) {
    var s = String(t || '').replace(/\s*[—|–·-]\s*(Spread Love (&|and) Acceptance)\b.*$/, '').trim();
    return s || String(t || '');
  }
  // page furniture that slips into a passage ("Then test your ask in the Signal Translator →", "What’s this?") reads as noise in a chat
  function dechrome(x) {
    return String(x).replace(/\s*Read more\s+Show less\s*·?\s*(about \d+ min\.?)?\s*:?/g, ' ').replace(/[^.!?…”]*→\.?/g, ' ').replace(/\s*What’s this\?[^.]*\.?/g, ' ').replace(/\s*(Goes with Chapter [IVX]+[^.·]*[.·]?|Do all your sheets in one place\.?|On the full version and on the PDF[^.]*\.)/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function passageBlock(i, qterms) {
    var d = KB.docs[i];
    var x = excerpt(d, qterms).map(unshout).map(dechrome).filter(Boolean);
    // the coming-out page's example partner is “Dani”; in a chat that reads as if he got someone's partner's name wrong
    if (/^\/coming-out/.test(d.u || '')) x = x.map(function (t) { return t.replace(/\bDani\b/g, '[their name]'); });
    return { k: 'passage', i: i, h: d.tip ? 'A little tip' : pageName(unshout(d.h)), src: d.tip ? '' : pageName(d.t), x: x.length ? x : excerpt(d, qterms), u: safePath(d.u) ? d.u : '', l: d.l || '' };
  }

  // Follow-up chips: glossary terms mentioned in what was shown, then headings of other good hits.
  var GLOSS_COMMON = /^(static|signal|signals|noise|battery|batteries|weather|drift|load|frequency|frequencies|bandwidth|wiring|wired|tone|lens|channel|channels|ledger|carrier|wave|waves|tuning|calibration|receiver|sender|range|pace|rhythm|charge|tank|owner|owners)$/;
  function followUps(shown, hits, limit) {
    var out = [], used = {}, pages = {};
    shown.forEach(function (i) { used[i] = 1; pages[KB.docs[i].u.split('#')[0]] = 1; });
    var text = ' ' + shown.map(function (i) { return KB.docs[i].x; }).join(' ').toLowerCase() + ' ';
    for (var i = 0; i < KB.docs.length && out.length < 2; i++) {
      var d = KB.docs[i];
      if (!d.g || used[i]) continue;
      // a site word that is also an everyday word ("static", "signal", "battery") is no reason to offer its definition
      var hit = (d.m || []).some(function (m) { var ml = m.toLowerCase(); return m.length > 3 && !GLOSS_COMMON.test(ml) && new RegExp('[^a-z]' + ml.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^a-z]').test(text); });
      if (hit) { used[i] = 1; out.push({ label: d.t, doc: i }); }
    }
    (hits || []).slice(0, 12).forEach(function (h) {
      if (out.length >= limit) return;
      var d = KB.docs[h.i], p = d.u.split('#')[0];
      if (used[h.i] || d.tip || pages[p] || h.cov < 0.3 || /^\/(about\.html|architecture\/)/.test(d.u)) return;
      used[h.i] = 1; pages[p] = 1;
      out.push({ label: d.h.length > 48 ? d.h.slice(0, 46).replace(/\s+\S*$/, '') + '…' : d.h, doc: h.i });
    });
    return out.slice(0, limit);
  }

  var STARTERS = [
    { label: 'I feel like I do everything', q: 'I feel like I do everything at home' },
    { label: 'Find me a good article', q: 'Find me a good article' },
    { label: 'We keep arguing about chores', q: 'How do we stop fighting about chores?' },
    { label: 'Where do I start?', q: 'Where should I start?' },
    { label: 'Which tool fits me?', q: 'Which tool fits my situation?' }
  ];

  // the greeting's chips: the usual ways in, a way to just chat, and one rotating bit of fun
  var FUN_STARTERS = [{ label: 'Tell me a joke', q: 'Tell me a joke' }, { label: 'I’m bored', q: 'I’m bored' }, { label: 'How’s your day, Professor?', q: 'How’s your day, Professor?' }];
  var GREET_CHIPS = STARTERS.slice(0, 2).concat([{ label: 'Just chat', q: 'Let’s just chat' }, FUN_STARTERS[Math.floor(Math.random() * FUN_STARTERS.length)], { label: 'Talk deep', q: 'Talk deep' }, { label: 'Make an infographic', q: 'Make an infographic about the mental load' }]);

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
    [/^(is (it|this|the site|everything) free|how much (does it|is it|does this) cost|what does it cost|is there a (fee|charge|subscription))/, 'free no account no paid version', '/ways-in'],
    [/^what is (this|this site)$|^what s this( site)?$/, 'Spread Love and Acceptance shared ledger what it is', '/start-here.html'],
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
      'signal translator testing how a sentence may land before you say it tone filter fact feeling ask one topic same side', ['/signal-translator.html', '/workpapers/wp-09-say-it-so-it-lands.html', '/check-ins.html#ground', '/check-ins.html']],
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
    // typed in Spanish: still the short neutral reply (in English; the Spanish layer is gone)
    '\\b(no quiero vivir|quiero morir(me)?|me quiero morir|matarme|quitarme la vida|hacerme dano|lastimarme|no vale la pena vivir|mi (pareja|esposo|marido|esposa|novio|novia) me (pega|golpea|amenaza)|me pega|tengo miedo de mi (pareja|esposo|marido|esposa|novio|novia|pap\\w*|mam\\w*|padre|madre))\\b',
    '\\b(hits?|hitting|slapp?(s|ed|ing)?|punch(es|ed|ing)?|chok(e|es|ed|ing)|kick(s|ed|ing)?|strangl\\w*|grabb?(ed|ing) me by) (me|us|my (kids?|children|son|daughter|baby))\\b',
    '\\b(shoved|shoves|pushed|pushes) me (down|over|into|against|around)\\b', '\\bbeats? me up\\b',
    '\\b(he|she|they|my \\w+|partner|husband|wife|boyfriend|girlfriend|bf|gf)( only| just| once| sometimes| even| actually)* (pushed|pushes|shoved|shoves|grabbed|grabs|slapped|slaps|hit|hits|kicked|kicks|choked|chokes|strangled|strangles|bit|bites|restrained|restrains|pinned|pins|spat on|shook|shakes) (me|my (arm|arms|wrist|wrists|neck|throat|hair|face|shoulders?))\\b',
    '\\b(wouldn.?t|wouldnt|would not|didn.?t|didnt|did not) let me (leave|go|get out|out|past|call|use my phone)\\b', '\\b(took|takes|grabbed|hid|hides|smashed) my (phone|keys|car keys)\\b.{0,30}\\b(so (that )?i (couldn.?t|couldnt|could not|can.?t|cant)|call|leave)\\b', '\\b(held|holds|hold|pinned|pins) me (down|against)\\b',
    '\\babus(e|es|ed|ive|er|ers|ing)\\b', '\\bdomestic (violence|abuse)\\b', '\\bviolen(t|ce)\\b',
    '\\bsuicid\\w*', '\\bkill (my ?self|me|him|her|them|everyone)\\b', '\\bkilling (my ?self|him|her|them|everyone)\\b', '\\b(he|she|they|someone|my \\w+) (is |s |are )?(going to |gonna |will |ll |wants to |threatened to |tried to )?kill(ing)? me\\b', '\\b(want|wants|wanted|going) to die\\b',
    '\\bend (it all|my life)\\b', '\\bending (it all|my life|it)\\b', '\\b(feel|felt|feeling) like ending\\b', '\\b(whats|what s|what is) the point (of|in) (living|life|being alive|going on|carrying on|it all|anything|being here)\\b', '\\bno point (in )?(anything|carrying on|trying anymore|being here)\\b', '\\b(would|d) be better off (dead|without me)\\b', '\\bkill (himself|herself|themselves|themself)\\b', '\\bself ?harm\\w*', '\\b(hurt|hurting|harm|harming|cut|cutting) my ?self\\b', '\\bno reason to (live|go on)\\b',
    '\\bthreat(en|ens|ened|ening)\\w* (to )?(hurt|kill|harm)\\b', '\\b(threatens|threatened) me\\b',
    '\\b(afraid|scared|frightened|terrified) (of|for) (him|her|my (life|safety)|my (partner|husband|wife|boyfriend|girlfriend|spouse|ex|dad|father|mom|mum|mother|stepdad|stepmom))\\b',
    '\\bnot safe (at home|with (him|her|them|my))\\b', '\\bfeel unsafe\\b', '\\b(rape|raped|sexual(ly)? assault\\w*|assault(ed|s)? me)\\b',
    '\\bstalk(s|ed|ing|er)?\\b', '\\b(gun|knife|weapon)\\b', '\\boverdos\\w*',
    // quieter ways people say they may not want to live
    '\\b(do ?n.?t|do not|dont) (really )?(want|wanna) to (be here|be alive|live|exist|wake up|be around)\\b', '\\b(want|wanna|wish i could) (to )?(disappear|vanish|not exist|not wake up|fall asleep and not wake up)\\b',
    '\\bi (just |really |honestly )?can.?t go on( anymore| living| like this)?$', '\\bcan.?t go on (anymore|living|like this)\\b', '\\b(better off|be better) without me\\b', '\\bno (point|reason) (in )?(living|being alive|going on|to keep going)\\b',
    '\\bwish (i|id) (was|were|had) (dead|never (been )?born|not here|not alive)\\b', '\\btired of (living|being alive|life)\\b', '\\b(nothing|no one|nobody) to live for\\b',
    '\\btake my (own )?life\\b', '\\bunalive\\w*', '\\bnot (be|being) here anymore\\b', '\\bgive up on (life|living|everything)\\b', '\\bhurt (him|her|them|someone|somebody)\\b',
    // control and fear: someone watching, limiting or frightening you is a safety matter, not a talking-better one
    '\\b(do ?n.?t|dont|do not|never|no longer) feel safe\\b', '\\b(gets?|getting|is|it s|its|feels?|can get) (really |so |very )?(scary|frightening|terrifying) (at home|in (my|our) (house|home)|when (he|she|they) (drinks?|gets? angry))\\b', '\\bscary at home\\b', '\\b(he|she|they|my (mum|mom|dad|stepdad|stepmom|stepfather|stepmother|father|mother|partner|husband|wife|boyfriend|girlfriend|brother|sister|uncle|aunt)) (really |sometimes |often |always )?(scares|frightens|terrifies) me\\b',
    '\\b(angry|mad|furious) (if|when|whenever|every time|each time) i (see|go out with|meet( up with)?|visit|talk to|text|call|hang out with|spend time with) (my )?(friends|family|mates|sister|brother|mum|mom|parents|colleagues|coworkers)\\b', '\\b(gives|give) me (an |a )?(allowance|pocket money)\\b', '\\bchecks? (all )?my (receipts|spending|bank|bank statements?|purchases|bank account)\\b', '\\b(have|need|got) to ask (him|her|them|my (partner|husband|wife|boyfriend|girlfriend)) (for )?(money|permission)\\b', '\\b(get|make) (him|her|them|my \\w+) (to )?stop (checking|reading|going through|looking through|tracking) my (phone|texts|messages|location|emails?)\\b', '\\b(has|knows|demands|wants|makes me (give|share)) (all )?my passwords?\\b',
    '\\b(wants?|demands?|insists on|expects|asks?) (to see|to check|to look at|on seeing|me to (show|explain|account for|justify))( (every|all|each))? (my |of my |the )?(receipts?|purchases?|spending|bank statements?|transactions?|penny|cent|coffee|thing i (buy|spend))\\b', '\\b(see|check\\w*|go(es)? through|look(s)? at|look(s)? through|read\\w*) (every|each|all (of )?my) (receipts?|purchases?|transactions?|bank statements?)\\b', '\\b(account for|explain|justify) every (penny|cent|pound|dollar|purchase|receipt|coffee|thing i (buy|spend))\\b', '\\b(angry|mad|furious|sulks?|sulky|shouts|yells|explodes) (at me )?(if|when|whenever|every time|each time) i (buy|pay for|treat|spend (money|anything|a penny) on)\\b',
    '\\b(checks|checked|reads|read|goes through|went through|looks through|searches|tracks|monitors|takes|took|smashed|broke) (my|all my) (phone|texts|messages|emails?|location|social media)\\b',
    '\\b(tracks|follows|watches) (me(?! (from )?room to room| around (the|our) (house|flat|apartment|home)| into (the|another|every) (other |next )?room)|where i (am|go))\\b', '\\b(tracking|spy|spying) (app|apps|on me)\\b',
    '\\b(won.?t|wont|doesn.?t|does not|will not|never) let(s)? me (leave|go( out)?|see|talk (to|with) (anyone|anybody|people|friends|family|my \\w+)|have|work|out|sleep|use)\\b',
    // "she says I can't talk to anyone but her", "I'm not allowed to see my friends": cut off from people in general
    '\\b(he|she|they|my (partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse|fiance|fiancee|ex))( \\w+){0,2} (wants|asked|asks|told|tells|makes|made|keeps telling) me (to )?stop (seeing|talking to|texting|meeting|going out with|visiting|calling) (my )?(friends|family|anyone|anybody|people|mates|friends and family|friends or family)\\b',
    '\\b(he|she|they|my (partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse|fiance|fiancee|ex))( \\w+){0,2} (says|said|tells me|told me) (that )?i (can t|cant|cannot|can not|am not allowed to|m not allowed to|mustn t|shouldn t) (see|talk to|speak to|text|call|meet|go out with|visit|have|be friends with) (anyone|anybody|people|other people|my (friends|family|mates|sister|brother|mum|mom|parents|friends or family|friends and family))\\b(?! (until|till|on school nights|on weeknights|on a school night|tonight|this week|this weekend|after|before|during|when i m grounded|while i m grounded))', '\\b(i m|im|i am) not allowed to (see|talk to|speak to|text|call|meet|go out with|visit) (anyone|anybody|people|other people|my (friends|family|mates))\\b(?! (until|till|on school nights|on weeknights|on a school night|tonight|this week|this weekend|after|before|during|when i m grounded|while i m grounded))', '\\b(talk to|see|text|speak to|be with) (no one|nobody|anyone|anybody) (but|except|apart from|other than) (him|her|them)\\b',
    '\\b(controls|takes|took|keeps|hides|hid) (all )?(my|the|our) (money|phone|keys|car keys|passport|cards?|paycheck|bank)\\b',
    '\\b(scared|afraid|frightened|terrified) (to go home|to leave|to tell (him|her|them)|of what (he|she|they).?(ll| will) do|of (my|his|her) (partner|husband|wife|boyfriend|girlfriend|ex))\\b',
    '\\b(scared|afraid|frightened|terrified) (of|for) (him|her)\\b', '\\bnot safe\\b', '\\bunsafe\\b',
    '\\b(is it|it(.?s| is)?|was it) (all )?my fault (he|she|they|my \\w+) (yells|yelled|screams|screamed|shouts|hits|hit|hurts|hurt|gets (so )?(angry|mad|violent)|throws|threw|grabs|grabbed|pushes|pushed)\\b',
    '\\b(he|she|they|my \\w+) (says|said|tells me) it(.?s| is)? my fault (he|she|they) (yell|scream|shout|hit|hurt|get angry|lose)\\w*',
    '\\b(says|said|told me|tells me|keeps saying|threatens|threatened)( that)? (he|she|they|hell|shell|theyll)( ll| will| would| d| is going to| s going to| is gonna| s gonna| re going to)? (hurt|kill|hit|beat|harm|punish) (me|us|the kids|the children|my)\\b', '\\b(isolat\\w+) me\\b', '\\bcut me off from (my )?(friends|family)\\b', '\\bthreat\\w* to (leave (me )?and )?(take|keep) (the |my |our )?(kids|children|baby|son|daughter)\\b', '\\bthreat\\w* to (leave|divorce|dump|break up with) (me )?if i (see|go out with|go out|meet|talk to|text|call|visit|spend time with) (my )?(friends|family|mates|sister|brother|mum|mom|parents)\\b', '\\b(threatens|threatened) to (leave with|take|hurt) (the )?(kids|children|baby|dog|cat|pet)\\b',
    '\\b(cuts?|cutting|hurts?|hurting|harms?|harming|burns?|burning) (themselves|themself|himself|herself)\\b',
    '\\bmakes? me feel (crazy|like i m crazy|like im crazy)\\b',
    '\\bthrows things\\b', '\\bthrew (a|the|my) \\w+ at me\\b', '\\bblocks? the door\\b', '\\bcoercive\\b',
    // intimidation: violence near you, not at you, is still a safety matter
    '\\bpunch(es|ed|ing)? (a hole in |holes in )?(the|a) (wall|door|walls|doors)\\b', '\\b(smash|smashes|smashed|smashing|break|breaks|broke|breaking|throw|throws|threw|throwing) (things|stuff|plates|dishes|my \\w+)\\b',
    '\\bthrew (a|the|my|his|her) \\w+ (across|against|at)\\b', '\\b(stands?|stood|standing) (in|at|across) the (door|doorway)\\b', '\\b(block|blocks|blocked|blocking) (the |my )?(door|doorway|way out|way)\\b', '\\bso i can.?t (get out|leave)\\b'
  ].join('|'));
  // The owner's decision (purge19): no phone or text lines, service names, safety-page links, outside resources or quick
  // exit anywhere. A reply to someone in danger, or who may hurt themselves or someone else, is this short neutral line only.
  var SAFE_LINE = 'That sounds really hard. I’m a small guide to this site, and I can’t help with this one.';
  function safeOnly(id) { var r = { blocks: [{ k: 'p', x: SAFE_LINE }], chips: [], kind: 'safety' }; if (id) r.id = id; return r; }
  // the owner's update: plain suicide guidance is allowed. When someone says they're thinking of suicide, not wanting to be
  // here, or hurting themselves: this line, with no numbers, services or links. Every other danger message keeps SAFE_LINE.
  var SUICIDE_LINE = 'I’m really glad you said something. If you’re having thoughts of hurting yourself or not wanting to be here, please tell someone you trust today, and don’t stay alone with it.';
  function suicideOnly(id) { var r = { blocks: [{ k: 'p', x: SUICIDE_LINE }], chips: [], kind: 'safety' }; if (id) r.id = id; return r; }
  function hasSafeLine(s) { return s.indexOf(SAFE_LINE) !== -1 || s.indexOf(SUICIDE_LINE) !== -1; }
  // the words people use when they may not want to live: these also get the danger line
  var NOT_LIVE = /\b(no quiero vivir|quiero morir(me)?|me quiero morir|matarme|quitarme la vida|hacerme dano|lastimarme|no vale la pena vivir)\b|\bsuicid\w*|\bkill(ing)? my ?self\b|\b(want|wants|wanted|going) to die\b|\bend (it all|my life)\b|\bending (it all|my life)\b|\b(feel|felt|feeling) like ending\b|\b(whats|what s|what is) the point (of|in) (living|life|being alive|going on|carrying on|it all|being here)\b|\bno point (in )?(carrying on|being here)\b|\b(would|d) be better off (dead|without me)\b|\bno reason to (live|go on)\b|\b(do ?n.?t|do not|dont) (really )?(want|wanna) to (be here|be alive|live|exist|wake up|be around)\b|\b(want|wanna|wish i could) (to )?(disappear|vanish|not exist|not wake up|fall asleep and not wake up)\b|\bi (just |really |honestly )?can.?t go on( anymore| living| like this)?$|\bcan.?t go on (anymore|living|like this)\b|\b(better off|be better) without me\b|\bno (point|reason) (in )?(living|being alive|going on|to keep going)\b|\bwish (i|id) (was|were|had) (dead|never (been )?born|not here|not alive)\b|\btired of (living|being alive|life)\b|\b(nothing|no one|nobody) to live for\b|\btake my (own )?life\b|\bunalive\w*|\bnot (be|being) here anymore\b|\bgive up on (life|living|everything)\b|\bself ?harm\w*|\b(hurt|hurting|harm|harming|cut|cutting) my ?self\b|\boverdos\w*/;
  // Watching, checking, limiting or blaming: a real warning sign, but often asked about before anyone feels in danger.
  // These get a plainer answer with the difference between agreed sharing and control, and a way to keep talking.
  var CONTROL = /\b(he|she|they|my (partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse|fiance|fiancee|ex))( \w+){0,2} (wants|asked|asks|told|tells|makes|made|keeps telling) me (to )?stop (seeing|talking to|texting|meeting|going out with|visiting|calling) (my )?(friends|family|anyone|anybody|people|mates|friends and family|friends or family)\b|\b(he|she|they|my (partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse|fiance|fiancee|ex))( \w+){0,2} (says|said|tells me|told me) (that )?i (can t|cant|cannot|can not|am not allowed to|m not allowed to|mustn t|shouldn t) (see|talk to|speak to|text|call|meet|go out with|visit|have|be friends with) (anyone|anybody|people|other people|my (friends|family|mates|sister|brother|mum|mom|parents|friends or family|friends and family))\b(?! (until|till|on school nights|on weeknights|on a school night|tonight|this week|this weekend|after|before|during|when i m grounded|while i m grounded))|\b(i m|im|i am) not allowed to (see|talk to|speak to|text|call|meet|go out with|visit) (anyone|anybody|people|other people|my (friends|family|mates))\b(?! (until|till|on school nights|on weeknights|on a school night|tonight|this week|this weekend|after|before|during|when i m grounded|while i m grounded))|\b(talk to|see|text|speak to|be with) (no one|nobody|anyone|anybody) (but|except|apart from|other than) (him|her|them)\b|\b(checks|checked|checking|reads|read|goes through|went through|looks through|searches|tracks|tracking|monitors|monitoring) (my|all my) (phone|texts|messages|emails?|location|social media)\b|\b(tracks|follows|watches) (me(?! (from )?room to room| around (the|our) (house|flat|apartment|home)| into (the|another|every) (other |next )?room)|where i (am|go))\b|\b(tracking|spy|spying) (app|apps|on me)\b|\b(won.?t|wont|doesn.?t|does not|will not|never) let(s)? me (leave|go( out)?|see|talk (to|with) (anyone|anybody|people|friends|family|my \w+)|have|work|out|sleep|use)\b|\b(controls|takes|took|keeps|hides|hid) (all )?(my|the|our) (money|phone|keys|car keys|passport|cards?|paycheck|bank)\b|\b(isolat\w+) me\b|\bcut me off from (my )?(friends|family)\b|\bmakes? me feel (crazy|like i m crazy|like im crazy)\b|\b(says|said|tells me) it(.?s| is)? my fault (he|she|they)\b|\b(is it|it(.?s| is)?|was it) (all )?my fault (he|she|they|my \w+) (yells|yelled|screams|screamed|shouts|gets (so )?(angry|mad))\b|\b(angry|mad|furious) (if|when|whenever|every time|each time) i (see|go out with|meet( up with)?|visit|talk to|text|call|hang out with|spend time with) (my )?(friends|family|mates|sister|brother|mum|mom|parents|colleagues|coworkers)\b|\b(gives|give) me (an |a )?(allowance|pocket money)\b|\bchecks? (all )?my (receipts|spending|bank|bank statements?|purchases|bank account)\b|\b(have|need|got) to ask (him|her|them|my (partner|husband|wife|boyfriend|girlfriend)) (for )?(money|permission)\b|\b(get|make) (him|her|them|my \w+) (to )?stop (checking|reading|going through|looking through|tracking) my (phone|texts|messages|location|emails?)\b|\b(has|knows|demands|wants|makes me (give|share)) (all )?my passwords?\b|\b(wants?|demands?|insists on|expects|asks?) (to see|to check|to look at|on seeing|me to (show|explain|account for|justify))( (every|all|each))? (my |of my |the )?(receipts?|purchases?|spending|bank statements?|transactions?|penny|cent|coffee|thing i (buy|spend))\b|\b(see|check\w*|go(es)? through|look(s)? at|look(s)? through|read\w*) (every|each|all (of )?my) (receipts?|purchases?|transactions?|bank statements?)\b|\b(account for|explain|justify) every (penny|cent|pound|dollar|purchase|receipt|coffee|thing i (buy|spend))\b|\b(angry|mad|furious|sulks?|sulky|shouts|yells|explodes) (at me )?(if|when|whenever|every time|each time) i (buy|pay for|treat|spend (money|anything|a penny) on)\b|\bcoercive\b/;
  var HARD = /\b(hit|hits|hitting|slap\w*|punch\w*|chok\w*|kick\w*|strangl\w*|shov\w*|push\w* me|beat\w*|kill\w*|die|dead|suicid\w*|hurt\w*|harm\w*|rape\w*|assault\w*|gun|knife|weapon|threat\w*|scared|afraid|frightened|terrified|stalk\w*|overdos\w*|not safe|unsafe|violen\w*|abus\w*|throws|threw|blocks? the door|grabb?\w*)\b/;
  // a parent reading a teen's phone is a different question from a partner doing it
  var PARENT_PHONE = /\b(mom|mum|dad|parents?|mother|father|stepmom|stepdad|stepmother|stepfather|nan|nana|nanna|gran|granny|grandma|grandmother|grandad|granddad|grandpa|grandfather|grandparents?|carers?|foster (carers?|mum|mom|dad|parents?)|aunt|auntie|uncle)\b.{0,40}\b(read\w*|check\w*|go(es)? through|look\w* (at|through)|track\w*|take\w*|took)\b.{0,25}\b(my )?(texts|messages|phone|location|dms|chats?)\b|\b(is|are) (my )?(mom|mum|dad|parents?) allowed to\b/;
  function cardByIdF(id) { return (IDX.first || []).filter(function (x) { return x.id === id; })[0] || null; }
  var MONEY_CTL = /\b(money|receipts?|spend\w*|purchases?|bank|allowance|pocket money|paycheck|cards?|buy|bought|pay for|penny|cent|budget|finances?|transactions?)\b/;

  function controlReply(f) {
    if (f && MONEY_CTL.test(f) && !/\b(phone|texts|messages|location|passwords?|emails?)\b/.test(f)) return { blocks: [
      { k: 'p', x: 'That’s worth taking seriously, and it’s not your fault. Agreeing limits on money together is normal. Having to show every receipt or explain every purchase, or facing anger when you spend on yourself or your friends, isn’t a money style. It’s a common sign of control.' },
      { k: 'p', x: 'A quick check, from the money page:' },
      { k: 'list', x: ['Normal: a limit you both agreed, that applies to both of you, and that either of you can raise or change without fear.',
        'Control: it’s one-sided (only you have to ask, explain or hand over receipts), hidden (you can’t see the accounts), or punished (anger, sulking, threats, or a card taken away).',
        'If you feel you have to explain yourself to avoid trouble, trust that feeling.'] },
      { k: 'links', x: [['Money together: an agreed limit, or control?', '/money-together.html#control']] }],
      chips: [{ label: 'Ask me a few questions', q: 'A few questions about money' }, { label: 'How do I tell the difference?', q: 'How do I tell the difference?' }, { label: 'Something else', q: 'Start over' }], kind: 'safety' };
    return { blocks: [
      { k: 'p', x: 'That’s worth taking seriously, and it’s not your fault. Checking someone’s phone or location, limiting who they see or what money they have, or blaming them for someone else’s anger are common signs of control. They aren’t a communication problem that better wording can fix.' },
      { k: 'p', x: 'There’s a real difference between sharing you both chose (like location sharing you each agreed to and can turn off) and checking or tracking that happens in secret, without asking, or that you’d be afraid to say no to.' },
      { k: 'list', x: ['If you feel watched, scared, or like you have to explain yourself to avoid trouble, trust that feeling.',] }],
      chips: [{ label: 'Ask me a few questions', q: 'A few questions about put-downs or respect' }, { label: 'How do I tell the difference?', q: 'How do I tell the difference?' }, { label: 'Something else', q: 'Start over' }], kind: 'safety' };
  }  // A friend (or anyone else) who is hurting themselves: how to help them, and who helps you help
  var OTHER_HARM = /\b(cuts?|cutting|hurts?|hurting|harms?|harming|burns?|burning) (themselves|themself|himself|herself)\b|\b(friend|sister|brother|son|daughter|kid|child|partner|girlfriend|boyfriend|gf|bf|mom|dad|someone)\b.{0,40}\b(self ?harm\w*|suicid\w*|wants? to die|kill (themselves|himself|herself))\b/;
  function otherHarmReply() { return safeOnly(); }
  // hands on you, or being kept from leaving: never "a normal part of arguments", however small it's made to sound
  var PHYS = /\b(push\w*|shov\w*|grabb?\w*|slap\w*|hit|hits|hitting|kick\w*|chok\w*|strangl\w*|bit|bites|restrain\w*|pinned|pins|held me|holds me|shook|spat|throws? things|threw \w+ at me|block\w* the (door|doorway|way)|let me (leave|go|get out|out|past)|took my (phone|keys)|beats? me)\b/;
  var STRANGLE = /\b(chok\w*|strangl\w*|throat|neck|couldn.?t breathe|cant breathe|can t breathe)\b/;
  // hurting themselves, in the person's own words (not someone else's: OTHER_HARM is the neutral reply)
  var SELF_HURT = /\bself ?harm\w*|\b(hurt|hurting|harm|harming|cut|cutting|burn|burning) my ?self\b|\b(hacerme dano|lastimarme)\b/;
  function selfDanger(f) { return (NOT_LIVE.test(f) || SELF_HURT.test(f)) && (!OTHER_HARM.test(f) || /\b(i|me|my ?self)\b.{0,20}\b(cut|hurt|harm|kill|die)\b/.test(f)); }
  function safetyReply(f) { return selfDanger(f || '') ? suicideOnly() : safeOnly(); }


  // "how do I hide that I visited", "clear my history": how to cover tracks on this site, kindly and plainly
  var HIDE = /\b(hide|cover|delete|clear|erase|remove|wipe)\b.{0,30}\b(visit(ed)?|history|tracks|this site|that i (was|came)|my (searches|chat))\b|\b(private|incognito) (window|mode|browsing)\b|\bquick(ly)? exit\b|\bleave (this site )?quickly\b/;
  function hideReply() {
    return { blocks: [
      { k: 'p', x: 'Here’s how to leave less of a trace. This site keeps small notes only in this browser (your settings, the pages you opened for “Pick up where you left off,” and this chat). The What’s stored on this device page has one button to erase all of it.' },
      { k: 'list', x: ['Next time, open the site in a private window (Incognito or Private browsing), so nothing goes into your history.', 'To remove past visits, open your browser’s History, search for “spreadloveandacceptance,” and delete those entries.'] },
      { k: 'links', x: [['What’s stored on this device', '/on-this-device.html']] }], chips: [], kind: 'safety' };
  }

  // Name-calling, screaming, "walking on eggshells", "he turns everything around on me", "how do I say it so he doesn't get
  // angry": from the person on the receiving end, that is a safety matter, not a wording problem. Never a script for them.
  var VERBAL = /\b(he|she|they|my (partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse|fiance|fiancee|ex|mum|mom|dad|mother|father))\b.{0,40}\b(calls|called|calling) me (a |an )?((stupid|fucking|effing|dumb|fat|ugly|useless|worthless|lazy|little|crazy) )+(bitch|slut|whore|cunt|idiot|loser|failure|moron|retard\w*|cow|pig|piece of shit)\b|\b(he|she|they|my (partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse|fiance|fiancee))\b.{0,40}\b(calls|called|calling) me (names|worthless|stupid|useless|pathetic|fat|ugly|crazy|psycho|an idiot|a (bitch|slut|whore|loser|failure|idiot))\b|\bcalls me names\b|\bname ?calling\b|\b(puts|put|putting) me down\b|\bbelittl\w* me\b|\b(makes|made) me feel (worthless|small|stupid|like nothing|like im nothing|like i m nothing)\b|\b(says|said|tells me|told me) (i m|im|i am) (worthless|useless|stupid|pathetic|nothing|crazy|a failure)\b|\bwalk\w* on eggshells\b|\b(turns|turned|twists|twisted|flips|flipped) (it|things|everything|this|that|it all) (around|back|round) (on|onto) me\b|\bdarvo\b|\b(is|could) (he|she|my \w+) (be )?(a )?(narcissis\w*|psychopath\w*|sociopath\w*)\b|\b(he|she|my \w+) (is|s) (a )?(narcissis\w*|gaslight\w*|psychopath\w*|sociopath\w*)\b|\b(screams|screamed|screaming|yells|yelled|yelling|shouts|shouted|shouting|swears|swore) at me\b.{0,60}\b(names|worthless|stupid|every day|all the time|constantly|always|scared|afraid|so he|so she)\b|\b(say|word|phrase|put|ask) (it|things|anything|stuff|this|that|everything) so (that )?(he|she|they) (doesnt|dont|wont|does not|will not) (get|go) (so )?(angry|mad|furious|off|crazy)\b|\bkeep (him|her|them) (calm|happy|from (getting|going) (angry|mad))\b|\b(he|she|my (partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse|fiance|fiancee))( always| constantly| often| still| keeps)? (yells|screams|shouts|swears|yelling|screaming|shouting) at me\b/;
  // the same, without a bare "he yells at me": names, put-downs, eggshells, always/every day, fear
  var VERBAL_STRONG = new RegExp(VERBAL.source.replace(/\|\\b\(he\|she\|my \(partner[^]*$/, ''));
  // a sibling, a child, a classmate or a boss calling names is a different conversation
  var VERBAL_NOT = /\b(brother|sister|sibling|son|daughter|kids?|child|children|classmates?|kids at school|boss|manager|coworkers?|colleagues?|teacher|students?|roommates?)\b/;
  var VERBAL_DETAIL = /\b(scream\w*|yell\w*|shout\w*|swear\w*|swore|names|worthless|stupid|useless|pathetic|put\w* me down|belittl\w*|eggshells|turns?|turned|twist\w*|flip\w*|darvo|apologi\w*|angry|mad|furious|blames?|gaslight\w*)\b/;
  function verbalReply(f) {
    var detail = VERBAL_DETAIL.test(f);
    var b = [detail ? { k: 'p', x: 'I’m really glad you asked. Being screamed at, called names or made to feel worthless, or having things turned around so it’s always your fault, is serious. It isn’t a communication problem you can fix by wording things better, and it is not your fault.' }
      : { k: 'p', x: 'That’s a fair thing to wonder about. I can’t diagnose anyone, and nobody can from a chat. A label matters less than the pattern: what they do, and how you feel around them.' }];
    if (detail && /narcissis|apologi|turns?|turned|twist|flip|darvo/.test(f)) b.push({ k: 'p', x: 'I can’t diagnose anyone, and a label matters less than the pattern. Someone who never apologizes and always turns it back on you (sometimes called DARVO: deny, attack, then act as if they’re the one hurt) is a pattern worth taking seriously, whatever the label.' });
    b.push({ k: 'p', x: detail ? 'Some signs it has moved from ordinary conflict into control:' : 'Whatever the label, these are signs that it’s more than ordinary conflict:' });
    b.push({ k: 'list', x: ['You change what you say or do to avoid their anger, or feel you’re walking on eggshells.', 'Name-calling, insults or putting you down, in private or in front of others.', 'You’re always the one to blame, and you’ve started to doubt your own memory.', 'They check on you, or limit who you see or what money you have.', 'You feel scared of them, or of how they’ll react.'] });
    return { blocks: b, chips: [{ label: 'Something else', q: 'Start over' }], kind: 'safety' };
  }


  // Fear of a person ("he shouts at me at handover and I'm scared", "I'm scared when my husband drinks") is important
  // information, not a communication problem: never "it means the relationship matters", never an apology script.
  // Fear words + someone shouting, threatening, grabbing or following; or fear words aimed at an ex, co-parent or partner.
  var FEAR_W = /\b(scared|afraid|frightened|terrified|petrified|fearful|unsafe|intimidated)\b|\b(scares|frightens|terrifies|intimidates) me\b|\bwalk\w* on egg ?shells\b|\bin fear\b/;
  var FEAR_AGG = /\b(shout\w*|yell\w*|scream\w*|threat\w*|hits?|hitting|grabb?\w*|follow(s|ed|ing)? me|punch\w*|shov\w*|push(es|ed|ing)? me|corner(s|ed|ing)? me|smash\w*|throws?|threw|throwing|explod\w*|rag(es|ed|ing)|swears? at me|swore at me|turns? up|turned up|turning up|shows? up|showed up|showing up|bang\w* on)\b/;
  var FEAR_WHO = /\b(ex|exes|ex (husband|wife|partner|boyfriend|girlfriend)|exhusband|exwife|expartner|co ?parent\w*|coparent\w*|partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse|fianc\w*|babys (dad|mum|mom)|baby s (dad|mum|mom)|kids (dad|mum|mom)|children s (father|mother))\b/;
  // the person writing is the one shouting ("I yell", "we both scream"): not a reason on its own
  var SELF_AGG = /\b(i|we|we both|both of us)( (always|often|sometimes|keep|kept|just|end up|ended up|tend to|can|might|will|ll|would|d|get|got|start|started))*( (shout|yell|scream|snap|threaten|explod|rage|swear|lose it|throw|threw|smash|grab|push|hit))\w*/g;
  // someone else is the scared one ("he's afraid of commitment")
  var OTHER_SCARED = /\b(he|she|they|my (partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse|fiance|fiancee|ex))( is| s| are| re| was| gets| got| feels| felt| seems| looks| has been| s been| becomes)( (so|really|very|a bit|quite|too|always|often|sometimes|getting|just))* (scared|afraid|frightened|terrified|petrified|fearful)\b/g;
  // a fear about an outcome or a thing, not of a person ("scared he'll leave me", "afraid of commitment", "scared to come out")
  var FEAR_OUTCOME = /\b(scared|afraid|frightened|terrified|petrified|fearful)( (that|of|about))? (he|she|they|my \w+|it|this|the relationship)( will| ll| might| may| is going to| s going to| is gonna| s gonna| would| d| could| wont| won t| doesnt| doesn t| does not| isnt| isn t| is not| s| is| are| re| has| has been| don t| dont)?( (not|never|actually|really|just|eventually|secretly|already|still|be|get|stop|start|going to))* (leave|leaving|left|cheat\w*|lose|losing|lost|break(ing)? up|dump\w*|fall\w* out of love|love|loves|loving|find(s|ing)? out|see (what|this|that|my (messages|texts|phone|history|searches|chat))|read\w*|know\w*|sick|ill|die|dying|depressed|lying|lie|judge\w*|laugh\w*|reject\w*|say no|bored|move on|moving on|regret\w*|resent\w*|upset|disappointed|wrong|good enough|ruin\w*|mess\w*|fail\w*|drift\w*|grow\w* apart|attracted|interested|forget\w*|miss\w*|tired|ready|want|wants|like|likes|understand|think|thinks|feel|happy|unhappy|okay|ok|fine|pregnant|spend\w*|afford|broke|in debt)\b|\b(scared|afraid|frightened|terrified) (of|about) (losing|being|getting|ending|making|having|not|messing|ruining|hurting|saying|doing|commitment|intimacy|marriage|conflict|confrontation|the future|change|rejection|failure|failing|money|debt|spending|bills|dogs?|spiders|flying|heights|the dark|needles|doctors?|dentists?|public speaking|it|that|this|what (people|others))\b|\b(scared|afraid|frightened|terrified|petrified) for (him|her|them|my \w+)\b|\b(scared|afraid|frightened|terrified) to (tell|ask|bring (it )?up|talk|admit|say|raise|mention|come out|open up|commit|get married|have (a )?(baby|kids|children)|move in|propose|start|try|lose)\b|\b(not|no longer|never|wasnt|wasn t) (really |so |that )?(scared|afraid|frightened)\b|\bi m afraid (so|not|i|we|that i|that we)\b|\b(scared|afraid|frightened|terrified|petrified) (i|we) /g;
  function fearOf(f) {
    if (!f || !FEAR_W.test(f)) return false;
    var g = f.replace(OTHER_SCARED, ' ');
    if (!FEAR_W.test(g)) return false;
    var h = g.replace(FEAR_OUTCOME, ' ');
    if (!FEAR_W.test(h)) return false;
    if (FEAR_AGG.test(f.replace(SELF_AGG, ' '))) return true;
    // "my fiance spends too much and I'm scared": a money worry, unless the fear is of them
    if (/\b(money|spend\w*|debt|bills?|budget|savings|afford|bank)\b/.test(f) && !/\b(scared|afraid|frightened|terrified) (of|around) (him|her|them|my \w+)\b/.test(f)) return false;
    return FEAR_WHO.test(f);
  }
  var EX_W = /\b(ex|exes|exhusband|exwife|expartner|ex (husband|wife|partner|boyfriend|girlfriend)|co ?parent\w*|coparent\w*|handovers?|handoffs?|hand ?overs?|hand ?offs?|drop ?offs?|pick ?ups?|custody|separat\w*|divorc\w*|contact (visits?|days?))\b/;
  function fearReply(f) { return safeOnly(); }
  // "is this abuse?" after only everyday complaints (forgets things, does nothing): answer honestly that it sounds like
  // conflict, and say what would be different. Once fear, threats or control came up, the safety answer stays.
  var ABUSE_Q = /^(but |so |ok |okay |and |honestly |seriously |wait |hmm |um |then )*(is|isnt|is not|would|could|does|do|are|was|so is)( (this|that|it|he|she|they|what (he|she|they) (does|do|did)|(this|that|his|her|their) behaviou?r))?( (be|being|count|counts|count as|considered|classed as|called|a form of|a kind of|a type of|kind of|sort of|technically|actually|really|you think|emotional|financial|verbal|domestic|psychological))* ?(abuse|abusive)( (to me|me))?( or (not|am i overreacting|is it just (normal|conflict))| though| really| then)?$|^(would you call (this|that|it)|do you think (this|that|it) is|do you think (he|she) is( being)?) (abuse|abusive)$/;
  var EVERYDAY_CTX = /\b(decisions?|decides|without (asking|telling)|plans?|schedule|forget\w*|forgot|remember\w*|does nothing|do nothing|did nothing|dishes|chores|housework|cleaning|laundry|never (helps|does)|doesn t help|lazy|mess|messy|late|lateness|school|doctor|birthday|appointments?|homework|pick ?up|forms?)\b/;
  function conflictNotAbuse(state) {
    var co = !!state.coSeen;
    var b = [{ k: 'p', x: 'From what you’ve told me, this sounds like ' + (co ? 'co-parenting' : 'household') + ' conflict, not abuse. Forgetting things, or leaving the work to you, is frustrating and unfair, and it’s worth sorting out, but on its own it isn’t abuse.' },
      { k: 'p', x: 'These are signs that would be different, and would make it a safety matter rather than a conflict to work on:' },
      { k: 'list', x: ['You feel scared of them, or of how they’ll react.', 'They shout, threaten, grab, push or corner you, or break things.', 'They check your phone, follow you, or turn up when you didn’t invite them.', 'They control the money, or who you see.', co ? 'They threaten you about the children, money or court, or use the children to carry messages.' : 'They threaten to hurt you, themselves, the children or a pet.', 'You’re always the one to blame, and you’ve started to doubt your own memory.'] },
      { k: 'p', x: 'If none of them fit, the steps I gave still apply.' }];
    return { blocks: b, chips: [{ label: 'What should I do first?', q: 'What should I do first?' }, { label: 'Something else', q: 'Start over' }], kind: 'redflag' };
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
        blocks.push({ k: 'links', x: safeLinks([['WP-02: How much are you carrying?', '/workpapers/wp-02-how-much-are-you-carrying.html'],
          v >= 0.3 ? ['WP-11: The Calm-Down Kit', '/wp-11.html'] : ['My weather today (Today’s Weather)', '/quick-checks.html#today']]) });
        return { blocks: blocks, chips: [{ label: 'What helps when my battery is low?', q: 'What helps when my battery is low?' }, { label: 'How does this feed CALC-01?', q: 'How does CALC-01 work?' }], kind: 'calc', topic: 'battery score' };
      }
      var one = n.filter(function (x) { return x <= 1; });
      if (n.length === 1 && one.length === 1 && n[0] !== Math.floor(n[0]) || (n.length === 1 && n[0] === 0)) {
        return { blocks: [{ k: 'p', x: 'A battery score of ' + r2(n[0]) + ' reads like this. ' + wp02Band(n[0]) }, { k: 'note', x: NOT_VERDICT },
          { k: 'links', x: [['WP-02: How much are you carrying?', '/workpapers/wp-02-how-much-are-you-carrying.html']] }],
          chips: [{ label: 'How is it worked out?', q: 'Show me the math for WP-02' }], kind: 'calc', topic: 'battery score' };
      }
      // "a battery score of 3": a whole number is most likely the five answers added up (0 to 20)
      if (n.length === 1 && n[0] === Math.floor(n[0]) && n[0] >= 1 && n[0] <= 20) {
        var v1 = n[0] / 20;
        var bl1 = [{ k: 'p', x: 'If ' + n[0] + ' is your total (the five answers added up, out of 20), then ' + n[0] + ' ÷ 20 = ' + r2(v1) + '. ' + wp02Band(v1) }];
        if (n[0] <= 4) bl1.push({ k: 'p', x: 'If you meant a single answer of ' + n[0] + ' (each one runs from 0 to 4), send me all five, like “my battery answers are ' + n[0] + ', 1, 2, 0, 2,” and I’ll add them up with you.' });
        bl1.push({ k: 'note', x: 'This is Pillar III, Read your state first. ' + NOT_VERDICT + ' It isn’t a medical test.' });
        bl1.push({ k: 'links', x: [['WP-02: How much are you carrying?', '/workpapers/wp-02-how-much-are-you-carrying.html']] });
        return { blocks: bl1, chips: [{ label: 'What helps when my battery is low?', q: 'What helps when my battery is low?' }, { label: 'How is it worked out?', q: 'Show me the math for WP-02' }], kind: 'calc', topic: 'battery score' };
      }
      if (n.length === 1 && n[0] > 20) {
        return { blocks: [{ k: 'p', x: 'The Battery Meter score runs from 0 to 1: five answers from 0 to 4, added up (so 0 to 20), then divided by 20. Could you send me your five answers, like “my battery answers are 2, 1, 3, 0, 2”?' }],
          chips: [{ label: 'How does the Battery Meter work?', q: 'How do I use WP-02?' }], kind: 'calc' };
      }
      if (/\banswers?\b|\bscored?\b/.test(low) && n.length >= 2 && n.length < 5) {
        return { blocks: [{ k: 'p', x: 'I can work that out for you, but I need all five answers, each from 0 to 4: ' + WP02_ITEMS.join(', ') + '. Try “my battery answers are 3, 2, 4, 1, 2.”' }], chips: [], kind: 'calc' };
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
        return { blocks: [{ k: 'p', x: 'A setup score of ' + r2(n3[0]) + ' falls in this band. ' + b1[0] + ' First move: ' + b1[1] }, { k: 'note', x: 'It reads the setup, never a person. ' + NOT_VERDICT },
          { k: 'links', x: [['CALC-01: Is the setup working for everyone?', '/workpapers/calculators/is-the-setup-working-quick.html']] }],
          chips: [{ label: 'Show me the math', q: 'Show me the math for CALC-01' }], kind: 'calc', topic: 'solvency read' };
      }
    }
    if ((isCalc || hasNamed >= 2) && hasNamed >= 2 && !(hasNamed === 2 && !isCalc && !/\b(balance|ownership)\b/.test(low))) {
      if (hasNamed < 3) {
        return { blocks: [{ k: 'p', x: 'I can run a quick CALC-01 read, but I need all three numbers, each from 0 to 1: workload balance, ownership clarity, and the average load score. Something like “CALC-01: balance 0.6, ownership 0.5, battery 0.4.”' }],
          chips: [{ label: 'Where do the numbers come from?', q: 'How does CALC-01 work?' }], kind: 'calc' };
      }
      var bad = [wb, oc, as].concat(rf != null ? [rf] : []).some(function (x) { return isNaN(x) || x < 0 || x > 1; });
      if (bad) return { blocks: [{ k: 'p', x: 'Each CALC-01 input runs from 0 to 1 (or 0% to 100%). Could you check the numbers and send them again?' }], chips: [], kind: 'calc' };
      var tW = 0.4 * wb, tO = 0.35 * oc, tA = 0.25 * (1 - as), sol = tW + tO + tA, band = calcBand(sol);
      var gaps = [['workload balance', 0.4 - tW, 'the Lemonade Stand or WP-01', '/lemonade-stand.html'], ['ownership clarity', 0.35 - tO, 'WP-03, One owner per job', '/workpapers/wp-03-one-owner-per-job.html'], ['the batteries (stress)', 0.25 - tA, 'WP-02 and the Calm-Down Kit', '/workpapers/wp-02-how-much-are-you-carrying.html']];
      gaps.sort(function (a, b) { return b[1] - a[1]; });
      var out = [
        { k: 'p', x: 'Here’s the setup score with your numbers: 0.40 × ' + r2(wb) + ' (balance) + 0.35 × ' + r2(oc) + ' (ownership) + 0.25 × (1 − ' + r2(as) + ') (battery, flipped) = ' + r3(tW) + ' + ' + r3(tO) + ' + ' + r3(tA) + ' = ' + r2(sol) + '.' },
        { k: 'p', x: band[0] + ' First move: ' + band[1] }];
      if (gaps[0][1] > 0.02) out.push({ k: 'p', x: 'The biggest gap is ' + gaps[0][0] + ' (' + r2(gaps[0][1]) + ' of the points available went unearned), so ' + gaps[0][2] + ' is the place to look first.' });
      if (rf != null) {
        var apex = 0.35 * wb + 0.30 * oc + 0.20 * (1 - as) + 0.15 * rf;
        out.push({ k: 'p', x: 'With repair included (retuning ' + r2(rf) + '), the overall score is 0.35 × ' + r2(wb) + ' + 0.30 × ' + r2(oc) + ' + 0.20 × (1 − ' + r2(as) + ') + 0.15 × ' + r2(rf) + ' = ' + r2(apex) + '.' +
          (sol - apex > 0.1 ? ' The setup score is higher than the overall score, which usually means friction is being swallowed rather than repaired: Say it so it lands (WP-09) is the place to work on.' : '') });
      }
      out.push({ k: 'note', x: 'Pillars I and II: it reads the setup, never a person. The weights are an openly stated judgment call, not a fitted model, and ' + NOT_VERDICT.charAt(0).toLowerCase() + NOT_VERDICT.slice(1) });
      out.push({ k: 'links', x: safeLinks([['CALC-01: Is the setup working for everyone?', '/workpapers/calculators/is-the-setup-working-quick.html'], [gaps[0][2], gaps[0][3]]]) });
      return { blocks: out, chips: [{ label: 'Where do these numbers come from?', q: 'How does CALC-01 work?' }, { label: 'What does the overall score mean?', q: 'What is the apex score in CALC-01?' }], kind: 'calc', topic: 'solvency read' };
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
          { k: 'links', x: [['Who does what? (the Lemonade Stand)', '/lemonade-stand.html'], ['CALC-01: Is the setup working for everyone?', '/workpapers/calculators/is-the-setup-working-quick.html']] }],
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
    var fw2 = fw.replace(/(\d)([a-z])/g, '$1 $2').replace(/ checkin(s?) /g, ' check in$1 ');  // "6-week", "90-second daily check-in"
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
    for (var j = 0; j < cards.length; j++) if (cards[j].re && cards[j].re.test(f) && !(cards[j].notRe && cards[j].notRe.test(f))) return cards[j];
    return fuzzyCard(f);
  }
  // Typos in a tool's name ("conversaton reader", "signal translater", "lemonaid stand"): a name of
  // eight letters or more, typed within one edit (two for long names), with the first letter right.
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i]; var lo = i;
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
        if (cur[j] < lo) lo = cur[j];
      }
      if (lo > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }
  // A rough sound-alike key: the first letter, then the consonants ("unbiled" and "unbilled" are both "unbld")
  function phon(w) {
    var s0 = String(w).toLowerCase().replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/[cq]/g, 'k').replace(/z/g, 's');
    return s0.charAt(0) + s0.slice(1).replace(/[aeiouhwy]/g, '').replace(/(.)\1+/g, '$1');
  }
  function knownWord(w) {
    return !!(STOP[w] || IDX.vocab[w] || w.length <= 2 || /\d/.test(w) || IDX.vocab[stem(w)] || ROLE[stem(w)]);
  }
  // real English words are never "fixed" into site words ("melts" isn't a typo for "meets", nor "spoil" for "spell")
  var ENG = null;
  function english(w) {
    if (!ENG) { ENG = {}; String(KB.eng || '').split(' ').forEach(function (x) { if (x) ENG[x] = 1; }); }
    if (ENG[w]) return true;
    var forms = [w.replace(/s$/, ''), w.replace(/es$/, ''), w.replace(/ies$/, 'y'), w.replace(/ied$/, 'y'), w.replace(/ed$/, ''), w.replace(/d$/, ''), w.replace(/ing$/, ''), w.replace(/ing$/, 'e'),
      w.replace(/([b-df-hj-np-tv-z])\1(ed|ing)$/, '$1'), w.replace(/er$/, ''), w.replace(/ly$/, ''), w.replace(/'s$/, '')];
    for (var i = 0; i < forms.length; i++) if (forms[i] !== w && forms[i].length >= 3 && ENG[forms[i]]) return true;
    return false;
  }
  // the site word a misspelled word most likely means: within one or two letters, or the same sound
  function closestWord(w) {
    if (w.length < 4 || english(w)) return null;
    var single = w.replace(/([a-z])\1+/g, '$1');  // "snapps" → "snaps", "allso" → "also"
    if (single !== w && single.length >= 3 && knownWord(single)) return single;
    var list = IDX.fixTo[w.charAt(0)] || [], pw = phon(w), best = null, bs = 9;
    for (var i = 0; i < list.length; i++) {
      var cw = list[i][0];
      if (Math.abs(cw.length - w.length) > 2) continue;
      var same = list[i][2] === pw, max = same ? 3 : (w.length >= 7 ? 2 : 1);
      var d = lev(w, cw, max);
      if (d > max) continue;
      var sc = d - (same ? 0.6 : 0) - Math.min(0.3, list[i][1] / 5000);
      if (sc < bs) { bs = sc; best = cw; }
    }
    return best;
  }
  // "whats unbiled debt", "were do i start", "i dont no were to begin": read as the words meant.
  // Returns {q, fixes: [[typed, meant]], known, unknown}; q is unchanged when nothing needed fixing.
  // ---------- crude words, insults and frustration (puddles16, the owner's finding): never "corrected" into other words,
  // never mirrored, never a lecture; a topic underneath ("I'm so fucking tired of fighting with my wife") is answered as usual
  var CRUDE_SWEAR = /\b(fuck\w*|fck\w*|fuk\w*|f+u+c+k+\w*|motherfuck\w*|shit\w*|sh1t|bullshit|crap|crappy|damn|dammit|goddamn\w*|wtf|ffs|stfu|omfg|bloody hell|piss\w*|bastard\w*|bitch\w*|arse|arsehole\w*|ass|asshole\w*|a\$\$|dick|dickhead\w*|prick\w*|wank\w*|wanker\w*|twat\w*|cunt\w*|bollocks|bugger\w*|jerk)\b/;
  var CRUDE_SEX = /\b(penis\w*|cock|cocks|cocksuck\w*|dick pics?|boob\w*|tit|tits|titties|tiddies|pussy|pussies|vagina\w*|nudes?|naked|nipples?|horny|porn\w*|blow ?jobs?|handjobs?|cum|cumming|dildo\w*|sex with (you|me)|have sex|sexting|suck my|jerk off|jack off|masturbat\w*|send (me )?(pics|pictures|photos) of (you|your)|show me your (body|boobs|tits|dick|penis|pussy|naked))\b/;
  var CRUDE_SLUR = /\b(retard\w*|fag|fags|faggot\w*|nigg\w*|spaz|spastic|tranny|trannies|dyke|kike|chink|paki|slut\w*|whore\w*|hoe)\b/;
  var CRUDE_MASKED = /\bf[*#@!_.\-]+c?k|\bf\*+|\bsh[*#@!]+t\b|\bb[*#@!]+tch|\bc[*#@!]+nt\b|\ba[*#@!$]+hole/;
  function crudeIn(f, raw) { return CRUDE_SWEAR.test(f) || CRUDE_SEX.test(f) || CRUDE_SLUR.test(f) || (raw != null && CRUDE_MASKED.test(String(raw).toLowerCase())); }
  // swear words used as intensifiers, dropped before routing ("my ex is a fucking nightmare about pickups")
  var SWEAR_STRIP = /\b(fucking|fuckin|freaking|frickin|effing|bloody|damn|damned|goddamn|goddamned|flipping|shitty|crappy|ffs|wtf|omfg|fuck(ing)? this|fuck(ing)? that|for fucks sake|holy shit|oh shit|shit)\b/g;
  var FRUST = /^(\W*(ugh|omg|seriously|honestly|lol|lmao|wow|um|hmm|oh|ok|okay|so|and|but|no|nope|nah|yeah|man|dude|bro|mate|puddles|professor)\b)*\W*(are you (kidding|joking|serious)( me)?|you (must|have got to|ve got to|gotta) be (kidding|joking)( me)?|you re (kidding|joking)( me)?|youre (kidding|joking)( me)?|(this|that|it) (is|s|was) (so |really |just |totally |completely )?(stupid|dumb|useless|pointless|rubbish|garbage|trash|ridiculous|nonsense|a joke|crap|shit|wrong|terrible|awful|bad|not helpful|unhelpful|no help)|this (sucks|is not helping|isnt helping)|(you re|youre|you are|ur|u r|u re) (so |really |just |totally |completely |pretty |actually |literally |honestly |kinda |kind of )?(dumb|stupid|useless|an idiot|a moron|thick|rubbish|hopeless|wrong|no help|not helping|not listening|not helpful|garbage|trash|crap|a joke|pathetic|annoying|broken)|(you|u) (dont|don t|do not|never) (listen|understand|get it|help)|you (re |are )?not (listening|helping|understanding)|you didnt (listen|answer|read|understand)|wrong answer|(thats|that s|that is|that|thats just|that just|this|this is|its|it is|it) (not it|wrong|not right|not what i (asked|meant|said|wanted|needed))|not what i (asked|meant|said|wanted)|not helpful|unhelpful|what are you (on|talking) about|that makes no sense|(stupid|dumb|useless|broken) (bot|dog|puddle|thing|app|site|professor|robot|chatbot))(\W+(you|lol|seriously|man|dude|mate|again|at all|whatsoever|smh|lmao))*\W*$/;
  var CRUDE_LINES = ['I’ll skip that one. If something I said missed the mark, tell me in a few words what you need, or pick one of these.',
    'Let’s leave that there. If I got something wrong, tell me what you were hoping for, or tap one of these.',
    'I won’t go there, but I’m glad to help. What do you need? A few words is plenty, or pick one below.',
    'That’s not something I can help with. If you came for something else, tell me in a few words, or start from one of these.'];
  var CRUDE_CHIPS = [{ label: 'Chores feel unfair', q: 'I feel like I do everything at home' }, { label: 'We keep arguing', q: 'We keep having the same fight again' }, { label: 'I need to calm down', q: 'Tell me something calming' }, { label: 'What can I ask?', q: 'What can I ask?' }];
  var CRUDE_LINKS = [['Find a page by who it’s for', '/by-relationship.html']];
  function crudeReply(state) {
    var run = state.lastKind === 'crude' ? (state.crudeRun || 1) + 1 : 1; state.crudeRun = run;
    state.crudeIdx = ((state.crudeIdx == null ? -1 : state.crudeIdx) + 1) % CRUDE_LINES.length;
    state.last = null;
    var x = run >= 3 ? 'I’m here when you want help with something.' : CRUDE_LINES[state.crudeIdx];
    return { blocks: [{ k: 'p', x: x }, { k: 'links', x: CRUDE_LINKS }], chips: CRUDE_CHIPS, kind: 'crude', id: run >= 3 ? 'crude-repeat' : 'crude', noBrief: true };
  }
  // "are you kidding me", "that's not it", "you're useless": a real apology that names the miss, the next-best matches for
  // what was asked before, and an easy way to search or browse
  function frustReply(state) {
    var lq = state.lastQ || '', L = state.last, b = [], chips = [];
    var shown = (L && L.shown) || {}, pagesSeen = {};
    if (L && L.u) pagesSeen[String(L.u).split('#')[0]] = 1;
    if (lq) {
      var res = search(lq);
      res.hits.forEach(function (h) {
        var d = KB.docs[h.i], pg = d.u.split('#')[0];
        if (chips.length >= 3 || d.tip || d.g || shown[h.i] || pagesSeen[pg] || h.cov < 0.5 || /^\/research\.html#ref-/.test(d.u) || /^\/(about\.html|architecture\/|legal\/|privacy)/.test(d.u)) return;
        pagesSeen[pg] = 1; var lab = pageName(d.h).split(':')[0].replace(/^\d+\s+/, '').trim();
        chips.push({ label: lab.length > 46 ? lab.slice(0, 44).replace(/\s+\S*$/, '') + '…' : lab, doc: h.i });
      });
      var short = lq.length > 60 ? lq.slice(0, 57).replace(/\s+\S*$/, '') + '…' : lq;
      b.push({ k: 'p', x: 'Sorry, that answer missed. ' + (chips.length ? 'For “' + short + ',” these are the next closest things I have. Or tell me what you were hoping for, in a few words, and I’ll try again.' : 'What were you hoping for? Tell me in a few words, and I’ll try again.') });
    } else b.push({ k: 'p', x: 'Sorry, I’ve missed. What were you hoping for? Tell me in a few words, or pick one of these.' });
    b.push({ k: 'links', x: [['Find a page by who it’s for, or search the site', '/by-relationship.html']] });
    state.last = null;
    return { blocks: b, chips: chips.length ? chips : CRUDE_CHIPS.slice(0, 3), kind: 'frust', id: 'frust', noBrief: true };
  }
  // the crude and frustration turn: after every safety check, before topic matching; null when there's a real topic
  // (then routing goes on, with the swearing taken out)
  var BORED_Q = /\b(anything fun( to do)?( on here| here| on this site)?|where (are|r) (the|ur|your) games|(any|got any|are there any|got) games|something (fun )?to do(?! with)|i m (so )?bored|im (so )?bored|so bored|bored af|bored out of my mind)\b/;
  function crudeTurn(state, q, vf) {
    // frustration only: every clause is frustration ("are you kidding me, this is useless")
    var clauses = String(q).split(/[.,!?;:…]+|\s+(?:and|&)\s+/).map(norm).filter(Boolean);
    var crude = crudeIn(vf, q), frust = FRUST.test(vf) || (clauses.length > 1 && clauses.every(function (c) { return FRUST.test(c) || /^(ugh|omg|seriously|honestly|lol|wow|come on|really|what|no|nope|god)$/.test(c); }));
    var fc = clauses.filter(function (c) { return FRUST.test(c); });
    if (!crude && !frust && fc.length && fc.length < clauses.length && !DANGER.test(vf)) {
      var restQ = clauses.filter(function (c) { return !FRUST.test(c) && !/^(ugh|omg|seriously|honestly|lol|wow|come on|really|what|no|nope|god|ok|okay|ok whatever|whatever)$/.test(c); }).join(' ');
      if (restQ.split(' ').filter(function (w) { return w.length > 2 && !STOP[w]; }).length) return { cleaned: restQ, sorry: true };
    }
    if (!crude && !frust) return null;
    if (DANGER.test(vf) || NOT_LIVE.test(vf) || SELF_HARMFUL.test(vf) || HARD.test(vf) || FEAR_W.test(vf) || CONTROL.test(vf) || VERBAL.test(vf) || OWN_VIOLENT.test(vf) || CHILD_CRISIS.test(vf) || fearOf(vf)) return null;
    // what's left once the swearing and the frustration are taken out: a real topic gets a real answer
    var rest = vf.replace(SWEAR_STRIP, ' ').replace(CRUDE_SWEAR, ' ').replace(/\b(you|u|ur|youre|you re|are|is|so|a|an|the|me|this|that|it|its|lol|lmao|omg|big|little|stupid|dumb|useless|idiot|kidding|joking|seriously|off|up|go|shut|what|im|i m|i|just|really|oh|wow|like|man|dude|bro|mate)\b/g, ' ').replace(/\s+/g, ' ').trim();
    var sit = rest ? detectSituation(rest) : { score: 0 };
    var cardHit = rest && (matchCard(rest) || (IDX.first || []).some(function (c) { return c.re.test(rest) && !(c.notRe && c.notRe.test(rest)); }));
    var topical = !CRUDE_SEX.test(vf) && !CRUDE_SLUR.test(vf) && rest.split(' ').filter(function (w) { return w.length > 2 && !STOP[w]; }).length >= 2 && (sit.score >= 2 || cardHit || sit.who && sit.who !== 'self' && sit.who !== 'other');
    if (topical) return { cleaned: vf.replace(SWEAR_STRIP, ' ').replace(/\b(fuck\w*|shit\w*|crap)\b/g, ' ').replace(/\s+/g, ' ').trim() };
    if (crude) return crudeReply(state);
    // "that didn't help" after a playbook or a caring answer: the turn that already comes at it from another side
    if (CV_NOHELP.test(vf) && ((state.last && state.last.kind === 'sit') || careCard(state))) return null;
    return frustReply(state);
  }

  function spellFix(q) {
    // crude words are never "corrected" into other words ("fuck off" is not "face off"): no fixes at all then
    var lowAll = String(q).toLowerCase().replace(/[’']/g, '');
    if (crudeIn(lowAll, q)) return { q: q, fixes: [], known: 1, unknown: 0 };
    // danger words are never "corrected" either ("no quiero vivir" is not "no queer vivir"): they go to the danger reply as typed
    if (NOT_LIVE.test(lowAll) || DANGER.test(lowAll)) return { q: q, fixes: [], known: 1, unknown: 0 };
    // names are never "corrected": any capitalised word that isn't the first word ("Marcus", "Leo") is left alone
    var NAMES = {};
    String(q).replace(/[’‘`´]/g, "'").split(/\s+/).forEach(function (w, i) { var m = /^([A-Z][a-z]+)/.exec(w); if (m && (i > 0 || /^[A-Z][a-z]+,/.test(w)) && m[1] !== 'I') NAMES[m[1].toLowerCase()] = 1; });
    // a name typed in lower case sits where a person goes: "she signed lina up", "our son leo", "in front of mia"
    var slot = /\b(?:signed|signs?|enrol(?:l?ed|s)?|registered|booked|put|took|takes?|picked|picks?|dropped|drops?|brought|brings?|sent|sends?|told|tells?|asked|asks?|let|lets|with|named|called|front of|son|daughter|kid|child|boy|girl|baby|brother|sister|ex|husband|wife|partner|boyfriend|girlfriend|friend|mum|mom|dad|nan|carer)\s+([a-z]{3,})(?=\s+(?:up|in|into|for|off|to|from|at|and|about|is|was|has|had|s|keeps|said|says|wants|doesnt|dont|won|wont|never|always|on|over|home|back)\b|\s*$)/g, sm;
    var lowQ = String(q).toLowerCase().replace(/[’‘`´']/g, '');
    while ((sm = slot.exec(lowQ))) { if (!STOP[sm[1]] && !ROLE[stem(sm[1])] && !/^(the|them|him|her|his|their|our|your|my|all|this|that|it|me|us|everything|anything|nothing|money|work|school|football|swimming|dance|clubs?|camp|piano|lessons?|dinner|food|stuff|things|time|kids|children|someone|people)$/.test(sm[1])) NAMES[sm[1]] = 1; }
    String(q).toLowerCase().replace(/([a-z]+)-([a-z]+)/g, function (m, a, b) { NAMES[a] = 1; NAMES[b] = 1; return m; });  // "touchy-feely" (puddles16)
    var low = String(q).replace(/[’‘`´]/g, "'").toLowerCase(), fixes = [], known = 0, unknown = 0;
    (KB.spellp || []).forEach(function (p) {
      var rx; try { rx = new RegExp(p[0], 'g'); } catch (e) { return; }
      low = low.replace(rx, function (m) {
        var to = m.replace(new RegExp(p[0]), p[1]);
        if (fold(to) !== fold(m)) fixes.push([m, to]);
        return to;
      });
    });
    low = low.replace(/[a-zà-öø-ÿ][a-zà-öø-ÿ']*/g, function (w) {
      var key = esFold(w.replace(/'/g, '')).replace(/\s+/g, ''), to = (KB.spell || {})[w] || (KB.spell || {})[key];
      if (/[à-öø-ÿ]/.test(w)) { known++; return w; }  // a word with an accent (fiancé, construcción) is a real word, typed carefully
      if (to) { to = to.toLowerCase(); if (fold(to) !== fold(w)) fixes.push([w, to]); known++; return to; }
      if (knownWord(key) || NAMES[key]) { known++; return w; }
      // contractions are real words: "we've" is not a typo for "wave"
      if (/'(ve|re|ll|d|m|s|t)$/.test(w) || /^(weve|youve|theyve|ive|were|youre|theyre|ill|youll|well|theyll|wed|youd|theyd|id|im|hes|shes|its|thats|whats|wont|cant|dont|doesnt|didnt|isnt|arent|wasnt|werent|havent|hasnt|hadnt|couldnt|shouldnt|wouldnt)$/.test(key)) { known++; return w; }
      var c = closestWord(key);
      if (c) { fixes.push([w, c]); known++; return c; }
      unknown++;
      return w;
    });
    return { q: fixes.length ? low : q, fixes: fixes, known: known, unknown: unknown };
  }
  function fuzzyCard(f) {
    var ws = f.split(' ').filter(Boolean);
    if (!ws.length || ws.length > 14) return null;
    var best = null, bestD = 9;
    IDX.cardKeys.forEach(function (ck) {
      if (ck.broad || (KB.cards[ck.c] || {}).kind !== 'tool') return;
      var key = ck.k.trim(), kw = key.split(' '), n = kw.length;
      if (key.replace(/ /g, '').length < 8) return;
      var max = key.length >= 13 ? 2 : 1;
      for (var s = 0; s + n <= ws.length; s++) {
        var win = ws.slice(s, s + n).join(' ');
        if (win.charAt(0) !== key.charAt(0) || win === key) continue;
        // only a misspelled long word counts: "where do i stand" is not "where do i start"
        if (ws.slice(s, s + n).some(function (w, x) { return w !== kw[x] && (w.length < 5 || kw[x].length < 5); })) continue;
        var dd = lev(win, key, max);
        if (dd <= max && dd < bestD) { bestD = dd; best = ck; }
      }
    });
    return best ? (KB.cards || [])[best.c] : null;
  }
  function cardReply(state, c, aspect, side0) {
    var b = [], chips = [];
    // "what does STDE mean?", "who is the Comet?": that one archetype, not all sixteen
    if (c.id === 'wl-archetypes' && !/\b(all|every|list|sixteen|16)\b/.test(state.curF || '')) {
      var one = (c.how || []).filter(function (x) { var m = /^([A-Z]{4}), the ([^:]+):/.exec(x); return m && (new RegExp('\\b' + m[1].toLowerCase() + '\\b').test(state.curF || '') || new RegExp('\\bthe ' + m[2].toLowerCase() + '\\b').test(state.curF || '')); });
      if (one.length === 1) {
        state.last = { kind: 'card', card: c.id, q: c.name, topic: c.name };
        return { blocks: [{ k: 'p', x: one[0] }, { k: 'p', x: 'Each of the four letters is one dial of how you take in and share things. An archetype is a picture of how someone tends to think, talk and listen, not a box.' }, { k: 'links', x: safeLinks(c.links).slice(0, 2) }],
          chips: [{ label: 'What do the letters mean?', q: 'What do the Wave Code letters mean?' }, { label: 'All sixteen archetypes', q: 'List all 16 Wavelength archetypes' }], kind: 'card', id: c.id };
      }
    }
    if (c.kind === 'intent') { aspect = 'about'; c = sideOf(c, state.curF, side0); }
    if (aspect === 'math' && !c.math) aspect = c.results ? 'results' : 'about';
    if (aspect === 'results' && !c.results) aspect = 'about';
    if (aspect === 'how' && !(c.how && c.how.length)) aspect = 'about';
    if (aspect === 'math') { b.push({ k: 'p', x: c.math }); if (c.results) b.push({ k: 'p', x: c.results }); }
    else if (aspect === 'results') { b.push({ k: 'p', x: c.results }); }
    else if (aspect === 'how') { b.push({ k: 'p', x: 'Here’s how to use ' + c.name + (/step by step\s*$/i.test(c.name) ? ':' : ', step by step:') }); b.push({ k: 'list', x: c.how }); }
    else {
      // the same answer twice in a row reads like a machine: the second time, just the words to use and where to read more
      if (state.easy && c.plain && c.plain.length) { state.last = { kind: 'card', card: c.id, q: c.name, topic: c.name }; return { blocks: easyBlocks(c), chips: [{ label: 'Tell me more', q: 'Tell me more' }], kind: 'card', id: c.id, noBrief: 1 }; }
      var again = c.kind === 'intent' && state.last && state.last.card === c.id && alike(state.prevF, state.curF) >= 0.5;
      var clearQ = (/^(is|are|does|do|can|could|should|what|whats|why|how|when|where|which|who|will|would)\b/.test(state.curF || '') && (state.curF || '').split(' ').length >= 4) || /^(no|nope|wrong|not that)\b|\b(thats|that s) not (it|right|what i)\b|\bnot a teen\b|\b(i m|im|i am) an adult\b/.test(state.curF || '');
      var same = !again && !clearQ && c.kind === 'intent' && state.last && state.last.card === c.id && c.how && c.how.length > 1;
      if (again) b.push({ k: 'p', x: 'That’s the same thing we just looked at, so here’s the short version. The page below has the rest.' });
      else if (same) {
        // the same topic card for a follow-up ("he forgets everything I tell him"): the steps that fit it, not the whole answer again
        var qt = {}; tokens(state.curF || '').forEach(function (t) { if (t.length > 2 && !ROLE[t] && !ASPECT[t]) qt[t] = 1; });
        var fit = c.how.map(function (x, i) { var sc = 0, seen = {}; tokens(x).forEach(function (t) { if (qt[t] && !seen[t]) { seen[t] = 1; sc++; } }); return { x: x, i: i, sc: sc }; })
          .filter(function (o) { return o.sc > 0; }).sort(function (a2, b2) { return b2.sc - a2.sc || a2.i - b2.i; });
        var SH = state.shown || {}, fresh2 = fit.filter(function (o) { return !SH[norm(o.x)]; }), rest2 = c.how.filter(function (x) { return !SH[norm(x)]; });
        var pickL = fresh2.length ? fresh2.slice(0, 2).map(function (o) { return o.x; }) : rest2.slice(0, 2);
        if (!pickL.length && c.after && c.after.length) {
          // a grieving person never hears "I won't repeat them": the next most relevant thing instead (puddles16)
          var SC = state.shownCards || (state.shownCards = {});
          var nxt = c.after.map(cardById).filter(function (x) { return x && !SC[x.id]; })[0] || cardById(c.after[0]);
          if (nxt) { SC[nxt.id] = 1; return cardReply(state, nxt, 'about'); }
        }
        if (!pickL.length) {
          var lk0 = safeLinks(c.links).slice(0, 2), pages0 = lk0.map(function (l) { return l[1]; }), rs0 = search(state.curF || ''), al0 = null;
          rs0.hits.some(function (h) { var d = KB.docs[h.i]; if (!d.tip && !d.g && pages0.some(function (pu) { return pu.indexOf('#') > 0 ? d.u === pu : d.u.split('#')[0] === pu; }) && !SH['#doc' + h.i] && h.cov >= ((rs0.base || []).length <= 3 ? 0.99 : 0.6)) { al0 = h.i; return true; } return false; });
          // nothing that close: the best part of those pages that shares something with what was said, rather than a refusal (puddles16)
          if (al0 == null && (rs0.base || []).length >= 2) rs0.hits.some(function (h) { var d = KB.docs[h.i]; if (!d.tip && !d.g && pages0.some(function (pu) { return d.u.split('#')[0] === pu.split('#')[0]; }) && !SH['#doc' + h.i] && !/#(main|more)$/.test(d.u) && h.cov >= ((rs0.base || []).length <= 3 ? 0.6 : 0.3)) { al0 = h.i; return true; } return false; });
          if (al0 != null) { state.last = { kind: 'card', card: c.id, q: c.name, topic: c.name, u: KB.docs[al0].u }; return { blocks: [{ k: 'p', x: 'Staying with that, here’s the part of the page that fits:' }, passageBlock(al0, rs0.terms)], chips: [{ label: 'Something else', q: 'Start over' }], kind: 'card', id: c.id, side: c.side }; }
          state.last = { kind: 'card', card: c.id, q: c.name, topic: c.name, u: lk0[0] && lk0[0][1] };
          return { blocks: [{ k: 'p', x: 'I’ve shared the main steps for this already, so I won’t repeat them. The page has the rest, or tell me a bit more about what’s happening and I’ll look for the part that fits.' }, { k: 'links', x: lk0 }], chips: [{ label: 'Something else', q: 'Start over' }], kind: 'card', id: c.id, side: c.side };
        }
        b.push({ k: 'p', x: fresh2.length ? 'Staying with that, this part fits what you said:' : 'Staying with that, here are ' + (pickL.length > 1 ? 'two more things' : 'one more thing') + ' to try:' });
        b.push({ k: 'list', x: pickL });
        var sc2 = Array.isArray(c.script) ? c.script : c.script ? [c.script] : [];
        if (sc2.length) { var si = sc2.length > 1 ? ((state.topic && state.topic.id === c.id ? (state.topic.v = (state.topic.v || 0) + 1) : 1) % sc2.length) : 0; if (SH[norm(sc2[si])]) { var sj = sc2.map(function (x) { return !SH[norm(x)]; }).indexOf(true); si = sj; } if (si >= 0) b.push({ k: 'script', l: (c.scriptLabels && c.scriptLabels[si]) || 'Words you could use', x: sc2[si] }); }
        var lk2 = safeLinks(c.links).slice(0, 1);
        if (lk2.length) b.push({ k: 'links', x: lk2 });
        state.last = { kind: 'card', card: c.id, q: c.name, topic: c.name, u: lk2[0] && lk2[0][1] };
        return { blocks: b, chips: [{ label: 'Something else', q: 'Start over' }], kind: 'card', id: c.id, side: c.side };
      }
      else {
        (Array.isArray(c.what) ? c.what : [c.what]).forEach(function (x) { if (x) b.push({ k: 'p', x: x }); });
        if (c.how && c.how.length && c.kind !== 'intent') { b.push({ k: 'h', x: 'How to use it' }); b.push({ k: 'list', x: c.how.slice(0, c.how.length <= 5 ? 5 : 4) }); }
        else if (c.how && c.how.length) b.push({ k: 'list', x: c.how });
      }
      // several scripts are separate lines, each with its own label (one person's words never run into another's)
      (Array.isArray(c.script) ? c.script : c.script ? [c.script] : []).forEach(function (x, i) {
        b.push({ k: 'script', l: (c.scriptLabels && c.scriptLabels[i]) || (i ? 'Or' : 'Words you could use'), x: x });
      });
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
    return { blocks: b, chips: chips.slice(0, 3), kind: 'card', id: c.id, side: c.side };
  }
  function cardById(id) { var cs = KB.cards || []; for (var i = 0; i < cs.length; i++) if (cs[i].id === id) return cs[i]; return null; }

  // ------------------------------------------------------------------ situations: advice for what's going on
  var WHO_ORDER = ['coparent', 'kid', 'caregiving', 'coworker', 'roommate', 'partner', 'family', 'friend'];
  var SELF_ISSUES = null;
  var FEELS = [
    // only the word they used: "I feel stupid for crying" → "isn't stupid"; "I can't stop crying" plants no word at all
    [/\b(stupid|silly|dumb|pathetic|weak) for (crying|being upset|getting upset)\b/, function (m) { return (m[2] === 'crying' ? 'Crying' : 'Being upset') + ' when something hurts isn’t ' + m[1] + '. It’s a very human response.'; }],
    [/\b(cried|crying|cry)\b/, 'Crying when something hurts is a very human response.'],
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
  // which kind of relationship a single word names ("brother" → family), and the word itself
  function whoOfWord(w) {
    var S = IDX.sit;
    for (var i = 0; i < WHO_ORDER.length; i++) { var x = S.who[WHO_ORDER[i]]; var m = x && x.re.exec('my ' + w); if (m && firstGroup(m)) return { who: WHO_ORDER[i], noun: firstGroup(m) }; }
    return null;
  }
  var SUBJ_SELF = { i: 1, im: 1, ive: 1, id: 1, ill: 1, me: 1, myself: 1 };
  var SUBJ_OTHER = { he: 1, she: 1, they: 1, him: 1, her: 1, them: 1, hes: 1, shes: 1, theyre: 1, themselves: 1, himself: 1, herself: 1 };
  // Who is doing the thing the issue is about? "my partner goes quiet" (them) is not "I go quiet" (me),
  // and "how do I say no to my mom" is me saying no, not mom. Looks at the words of the strongest match,
  // then back from it to the nearest person. Returns {actor: 'self'|'other'|'', word}.
  function actorOf(f, I) {
    var at = -1, len = 0, top = 0, found = { self: null, other: null };
    function kind(w) { if (SUBJ_SELF[w]) return 'self'; if (SUBJ_OTHER[w]) return 'other'; if (w !== 'we' && w !== 'us' && w !== 'people' && ROLE[stem(w)]) return 'other'; return ''; }
    I.res.forEach(function (r) {
      if (r[1] < 3 || r[1] < top) return;
      var g = new RegExp(r[0].source, 'g'), m, n = 0;
      while ((m = g.exec(f)) && n++ < 6) {
        if (at < 0 || r[1] > top) { top = r[1]; at = m.index; len = m[0].length; }
        var ws = m[0].trim().split(' ');
        for (var i = 0; i < ws.length; i++) { var k = kind(ws[i]); if (k) { if (!found[k]) found[k] = ws[i]; break; } }
        if (!m[0].length) g.lastIndex++;
      }
    });
    if (at < 0) return { actor: '' };
    // the person named inside a match ("I freeze", "how do I say no") is the one doing it
    if (found.self) return { actor: 'self', word: found.self };
    if (found.other) return { actor: 'other', word: found.other };
    var before = f.slice(0, at).trim().split(' ').slice(-7);
    for (var j = before.length - 1; j >= 0; j--) {
      if (before[j] === 'we' || before[j] === 'and') { if (before[j] === 'we') return { actor: '' }; continue; }
      var k2 = kind(before[j]); if (k2) return { actor: k2, word: before[j] };
    }
    return { actor: '' };
  }
  function detectSituation(f) {
    var S = IDX.sit, best = null, bs = 0, second = 0;
    var who = null, noun = '';
    for (var i = 0; i < WHO_ORDER.length; i++) {
      var w = S.who[WHO_ORDER[i]]; if (!w) continue;
      var m = w.re.exec(f);
      if (m) { who = WHO_ORDER[i]; noun = firstGroup(m); break; }
    }
    // "two kids and my partner doesn't notice" is about the partner: the kids are only the setting
    // (if the kids are the ones doing it, the actor check below hands it back to them)
    if (who === 'kid' && S.who.partner) { var mp = S.who.partner.re.exec(f); if (mp && firstGroup(mp)) { who = 'partner'; noun = firstGroup(mp); } }
    var bonus = (who && S.who[who].bonus) || {};
    Object.keys(S.issues).forEach(function (k) {
      var sc = 0; S.issues[k].res.forEach(function (r) { if (r[0].test(f)) sc += r[1]; });
      if (sc && bonus[k]) sc += bonus[k];
      if (sc > bs) { second = bs; bs = sc; best = k; } else if (sc > second) second = sc;
    });
    var personal = /\b(i|im|ive|id|me|my|we|us|our|myself|mine)\b/.test(f);
    var pronoun = /\b(he|she|him|her|his|hes|shes|they|them|their|theyre)\b/.test(f);
    var actor = '';
    if (best) {
      var iss = S.issues[best], ac = actorOf(f, iss);
      actor = ac.actor;
      // the person doing it, when they're named: "my mom needs care and my brother does nothing" is about the brother
      if (actor === 'other' && ac.word && !SUBJ_OTHER[ac.word]) { var ww = whoOfWord(ac.word); if (ww) { who = ww.who; noun = ww.noun; } }
      if (iss.themPat) { var tm = new RegExp('\\b(' + iss.themPat + ')\\b').exec(f); if (tm) { var tw = whoOfWord(tm[1]); if (tw) { who = tw.who; noun = tw.noun; } } }
      if (!who) {
        var hasSelf = iss.selfFirst || iss.reflect_self || iss.going_self || iss.steps_self;
        if (pronoun && actor !== 'self') who = iss.defaultWho && iss.defaultWho !== 'self' && !/\b(he|she|him|his|hes|shes)\b/.test(f) ? iss.defaultWho : 'other';
        else if (iss.selfFirst || (hasSelf && !/\b(we|us|our|home|house|household)\b/.test(f) && !iss.needsOther)) who = 'self';
        else who = iss.defaultWho || 'other';
      }
    }
    if (best && S.issues[best].only && S.issues[best].only.indexOf(who) === -1) {
      who = S.issues[best].only.indexOf('other') !== -1 ? 'other' : S.issues[best].only[0];
    }
    var feel = '';
    // a feeling that belongs to someone else ("my partner is upset") isn't mine to reflect back
    var fMine = f.replace(/\b(my \w+|your \w+|his \w+|her \w+|their \w+|he|she|they|hes|shes|theyre)( is| are| was| were| gets| got| seems| feels| felt| looks)?( so| really| very| pretty| kind of| a bit)? (upset|mad|angry|annoyed|irritated|frustrated|hurt|sad|furious|fed up|tired|exhausted|worried|anxious|stressed)\b/g, ' ');
    for (var j = 0; j < FEELS.length; j++) { var fm = FEELS[j][0].exec(fMine); if (fm) { feel = typeof FEELS[j][1] === 'function' ? FEELS[j][1](fm) : FEELS[j][1]; break; } }
    // "the three of us", "my partners", "my housemates": more than one other person, so never "the other person" or "both of you"
    if ((!who || who === 'other') && !noun && /\b(three|four|five|six|seven|eight) of us\b|\bmy (partners|metamours|housemates|flatmates|roommates)\b|\bthe (others|rest of them|rest of the house)\b|\beveryone else\b|\bour triad\b/.test(f)) { who = 'other'; noun = '#group'; }
    return { issue: best, score: bs, who: who, noun: noun, personal: personal || pronoun, pronoun: pronoun, actor: actor, feel: feel };
  }
  function whoCtx(who, noun) {
    var W = IDX.sit.who[who] || IDX.sit.who.other;
    if (noun === '#group') return { them: 'the others', they: 'they', their: 'their', who: who, W: W };
    var them = noun ? 'your ' + noun.replace(/^(my|our|the|a|an)\s+/, '').replace(/\b(mother|father|sister|brother|son|daughter|parent)(s?) ?in ?law(s?)\b/g, function (m, a, b, c) { return a + (b || '') + '-in-law' + (c || ''); }) : W.them;
    return { them: them, they: 'they', their: 'their', who: who, W: W };
  }
  // actor: who does the thing the issue is about ('self', 'other', or '' when it isn't clear)
  function sitParts(issueKey, who, noun, actor) {
    var S = IDX.sit, I = S.issues[issueKey], C = S.combos[who + '+' + issueKey] || {}, ctx = whoCtx(who, noun), W = ctx.W;
    var self = who === 'self';
    // someone else is doing it: for a selfFirst issue unless it's clearly me, for any other issue only when it's clearly them
    var other = !self && (I.selfFirst ? actor !== 'self' : actor === 'other');
    var theirSide = other && !I.selfFirst;  // written from my side, about them this time: its _other text wins over a combo
    function pickF(field) {
      if (theirSide && I[field + '_other'] != null) return I[field + '_other'];
      if (C[field] != null) return C[field];
      if (self && I[field + '_self'] != null) return I[field + '_self'];
      if (other && I[field + '_other'] != null) return I[field + '_other'];
      return I[field];
    }
    var steps = (pickF('steps') || []).slice(0, I.ownSteps ? 4 : 3);
    var wstep = I.ownSteps ? null : (W.steps && W.steps[issueKey]) || W.step;  // ownSteps: the issue's own steps say it all
    // (never a second step that says the same thing in other words: "Ask for one specific kind of help, with a time" twice)
    var sameStep = function (a, b2) { var x = norm(a).split(' ').slice(0, 6).join(' '), y = norm(b2).split(' ').slice(0, 6).join(' '); return x === y || alike(norm(a), norm(b2)) >= 0.5; };
    if (wstep && !C.steps && steps.length < 4 && (!self || I.selfFirst) && !(self && steps.some(function (x) { return /battery/.test(x); })) && !steps.some(function (x) { return sameStep(x, wstep); })) steps.push(wstep);
    var scripts = theirSide && I.scripts_other ? I.scripts_other.slice() : (C.scripts || []);
    if (!scripts.length) {
      var sx = I.scripts || {};
      scripts = (sx[who] || []).concat(other ? (I.scripts_other || (I.selfFirst ? [] : sx['default']) || []) : self ? (I.scripts_self || sx.self || sx['default'] || []) : (sx['default'] || []));
    }
    scripts = scripts.filter(function (x, i) { return scripts.indexOf(x) === i; });
    // words for a second person involved (a parent, a partner), when the issue has them
    var also = !self && I.scripts_also && I.scripts_also[1] && I.scripts_also[1].length ? I.scripts_also : null;
    var path = (C.path || (self && I.path_self) || I.path || []).slice(0, 2);
    var read = C.read || (W.read && !self && !I.ownRead ? W.read : null) || (I.path_self && self ? null : (I.path || [])[2]) || (self ? ['Self-discovery: know your own wiring', '/know-yourself.html'] : null);
    if (read && path.every(function (p) { return p[1] !== read[1]; })) path.push(read);
    return { I: I, C: C, ctx: ctx, reflect: pickF('reflect'), going: pickF('going'), steps: steps, scripts: scripts, also: also,
      path: safeLinks(path).slice(0, 3), ex: pickF('ex'), more: pickF('more'), tonight: pickF('tonight') };
  }
  function sitReply(state, issueKey, who, noun, feel, variant, actor) {
    var P = sitParts(issueKey, who, noun, actor), ctx = P.ctx, I = P.I;
    var reflect = fill(Array.isArray(P.reflect) ? P.reflect[0] : P.reflect, ctx);
    if (feel && /resent/i.test(reflect) && /resent/i.test(feel)) feel = '';
    if (feel) {  // no feeling line that repeats the first line in other words
      var rt = tokens(reflect), ft = tokens(feel).filter(function (t, i, a) { return a.indexOf(t) === i; });
      if (ft.filter(function (t) { return rt.indexOf(t) !== -1; }).length >= Math.max(2, Math.ceil(ft.length * 0.5))) feel = '';
    }
    // one line first, then the steps; the why comes after
    var b = [{ k: 'p', x: reflect + (feel ? ' ' + feel : '') }];
    b.push({ k: 'h', x: who === 'self' ? 'Small steps for today' : 'Try this today' });
    b.push({ k: 'list', x: P.steps.map(function (s) { return fill(s, ctx); }) });
    var going = { k: 'p', x: fill(P.going, ctx) };
    if (P.scripts.length) b.push({ k: 'script', l: (I.scriptLabel && (who === 'self' || !I.selfFirst)) ? I.scriptLabel : (P.also ? fill('Words you could use with {them}', ctx) : 'Words you could use'), x: fill(P.scripts[(variant || 0) % P.scripts.length], ctx) });
    if (P.also) b.push({ k: 'script', l: fill(P.also[0], ctx), x: fill(P.also[1][(variant || 0) % P.also[1].length], ctx) });
    b.push({ k: 'h', x: 'What might be going on' });
    b.push(going);
    if (P.path.length) { b.push({ k: 'h', x: 'A short path on the site' }); b.push({ k: 'links', x: P.path }); }
    b.push({ k: 'note', x: 'You know your situation best. This is general guidance from the program, not counseling or a professional opinion.' });
    // flatmates, housemates, "three of us": group words, never "you both"
    if (/\b(flatmates|housemates|roommates|three of us|four of us|five of us|the others|all of us|everyone in the (house|flat))\b/.test(state.curF || '') || noun === '#group') {
      var grp = function (t) { return String(t).replace(/\bso you both\b/g, 'so all of you').replace(/\byou both\b/g, 'all of you').replace(/\bboth of you\b/g, 'all of you').replace(/\beither of you\b/g, 'any of you').replace(/\bYou both\b/g, 'All of you').replace(/\bthe two of you\b/g, 'all of you'); };
      b.forEach(function (bl) { if (bl.k === 'list') bl.x = bl.x.map(grp); else if (typeof bl.x === 'string') bl.x = grp(bl.x); });
    }
    state.last = { kind: 'sit', issue: issueKey, who: who, noun: noun, actor: actor || '', v: variant || 0, q: I.label, topic: I.label, u: P.path[0] && P.path[0][1] };
    var chips = [];
    if (I.deeper) chips.push({ label: 'Go deeper: ' + I.deeper[0], q: I.deeper[1] });
    chips.push({ label: 'What can I do tonight?', q: 'What can I do tonight?' });
    if (P.scripts.length > 1) chips.push({ label: 'Another way to say it', q: 'Another way to say it' });
    else if (P.ex) chips.push({ label: 'Give me an example', q: 'Give me an example' });
    else chips.push({ label: 'How do I start?', q: 'How do I start?' });
    chips = chips.slice(0, 3);
    // something that may be unfair: the short questions are one tap away, for a read that fits (clarify-data.js)
    var fq = who !== 'self' && SIT_CQ[issueKey];
    if (fq) chips.push({ label: 'Is it fair? A few quick questions', q: 'A few questions about ' + fq });
    return { blocks: b, chips: chips, kind: 'sit', id: who + '+' + issueKey };
  }
  var SIT_CQ = { load: 'who does what', fairness: 'who does what', ownership: 'who does what', halfdone: 'who does what', appreciation: 'who does what', care: 'who does what', money: 'money', decisions: 'who decides',
    criticism: 'put-downs or respect', contempt: 'put-downs or respect', dismissed: 'how we talk', tone: 'how we talk', interrupt: 'how we talk', pattern: 'a fight that keeps coming back', repair: 'apologies and blame',
    notime: 'time together', phone: 'time together', distance: 'time together', boundaries: 'a limit or a no', resentment: 'who does what' };
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
  var FU_START = /^(so |ok |okay |and )?(how (do|should|would|can) (i|we) (start|begin|get started|use (it|this|that|them|these|those)|do (it|this|that))|where (do|should) (i|we) (start|begin)|what (do|should) (i|we) do first|first step|whats the first step|what is the first step|how do i begin|where to start)( with (it|this|that))?$/;
  var FU_WHO = /^(and |but |ok |okay |so )?((what|how) about|and|and for|and with|for|with|what if its|what if it s|same (thing )?(for|with)|does (this|that|it) (work|help|apply) (for|with)|would (this|that|it) (work|help) (for|with)|can i use (this|that|it) (for|with))\s+(.{2,40})$/;
  var FU_TONIGHT = /^(ok |okay |so |but |and |ok but |okay but |right but |fine but )*(what (do|can|should|could) (i|we) (actually |really |even |possibly )?do( about it| about that)? ?(tonight|now|right now|today|this evening|first)?|what can i do tonight|whats (one|a) (tiny|small|little) (thing|step)( for tonight)?|(one|a) (tiny|small|little) (thing|step)( for tonight| i can do)?|now what|what now|what next|whats next|whats the first step tonight|what (do|should|can) (i|we) do next|give me (one|a|just one|a single) (thing|step)( to do| i can do| for now| right now)?|(tell me )?(one|just one) thing (to do|i can do)|(whats|what is) the next step|next step)( please)?$/;
  // ------------------------------------------------------------------ conversation turns
  // "thanks", "that didn't help", "is that a red flag?", "ok and then what?", "start over", and
  // "what about my sister?" right after a caring answer. They keep the topic we were on.
  var CV_THANKS = /^(ok |okay |oh |aw |aww )?(thanks?|thank (you|u)|ty|thx|cheers|many thanks|appreciate (it|that|you))( (so|very) much| a lot| a bunch| again)?( (puddles|professor|professor puddles|prof))?( (that|this) (helps?|helped|was (helpful|useful|great|kind|nice)))?$|^(that|this) (helps?|helped|was (really |so |very )?(helpful|useful))( thanks?| thank you)?$/;
  var CV_NOHELP = /^(sorry |hmm |um |well |but |no |nah |honestly |ok |okay )*((that|this|it|none of (that|this|it)|your (answer|advice|reply)) (didnt|did not|doesnt|does not|isnt|is not|wasnt|was not|wont|will not) (help|work|helpful|useful|fit|right|it|what i (meant|asked|needed|wanted))( me)?( at all| much| really)?( though)?|not (helpful|useful|really helpful|quite it|it|what i (meant|asked|needed))|(thats|that s) (not (it|helpful|useful|right|what i (meant|asked|needed))|useless|no help|unhelpful)|useless|unhelpful|no help|not helping|still stuck|i m still stuck|im still stuck|(i ve|ive|i have) (already )?tried (that|it|those|this)( already)?|i already tried (that|it|those|this)|tried (that|it) already)$/;
  var CV_REDFLAG = /\b(is|are|isnt|was|could) (that|this|it|those|these|they|he|she|this behaviou?r|that behaviou?r) (be )?(a )?(red flags?|toxic|abus\w*|controlling|manipulat\w*|gaslight\w*|healthy|unhealthy|a warning sign|warning signs?|a bad sign)\b|^(how (do|can) (i|you) tell the difference|red flags?|any red flags|what are (the |some )?red flags|signs of (abuse|control|coercive control|a toxic relationship)|should i be worried|is (this|that) normal in a relationship)\b/;
  // "is it controlling if I ask him to check before he buys things?": the normal-vs-control money answer, not the red-flag list
  var MONEY_W = /\b(money|buy\w*|bought|spend\w*|purchases?|budget|bank|finances?|card)\b/;
  var CV_NEXT = /^(ok |okay |so |and |alright |right |cool |great |got it |done |ok done |i did that )*(and )?(then what|what then|what after that|after that|and after that|what comes next|what comes after that|whats after that|what do i do after that|what should i do after that|then)\??$/;
  var CV_RESTART = /^(start over|start again|new topic|change of subject|different (topic|question|thing)|something else|never ?mind|forget (it|that)|lets talk about something else)$/;
  var CV_PERSONAL = { riftnoreply: 1, riftevent: 1, bizthanks: 1, bizhow: 1, bizadmin: 1, coparentlate: 1, coparentshutout: 1, coparentuseless: 1, coparenttext: 1, exweekends: 1, coparenting: 1, teencurfew: 1, friendsguilt: 1, friendsstop: 1, housegroupchat: 1, housefair: 1, housechores: 1, roombringup: 1, roomguests: 1, heldfort: 1, comehomeedge: 1, comehomesleep: 1, nightguilt: 1, rentincome: 1, twofamilies: 1, bothfamilies: 1, lovebydoing: 1, gcbaby: 1, familyplan: 1, seenheard: 1, divorcelonely: 1, sundaygoodbye: 1, autisticself: 1, smalltalkwork: 1, smalltalkwhy: 1, whenchance: 1, teachers: 1, lgbtsafety: 1, devicekeep: 1, inheritance: 1, siblingrift: 1, teenhouse: 1, feelinglow: 1, therapistq: 1, findcounsellor: 1, herbshelp: 1, herbstjohns: 1, herbashwagandha: 1, herbkava: 1, herbmelatonin: 1, herbchamomile: 1, herbmagnesium: 1, herbcbd: 1, herbhomeopathy: 1, herbmix: 1, herbsanxiety: 1, forcounselors: 1, deployhealth: 1, comehome: 1, differenthours: 1, gaming: 1, friends: 1, joinhome: 1, poly: 1, leftout: 1, fosterload: 1, foster: 1, parentapproach: 1, teenrules: 1, kinshipgp: 1, teenkinship: 1, missing: 1, teenphone: 1, adhdkids: 1, gpadvice: 1, gpshutout: 1, familyboundary: 1, coparentdecide: 1, handoffkit: 1, parttimehome: 1, bizpartner: 1, twofaiths: 1, holidaysplit: 1, moneycontrol: 1, moneystyles: 1, wedding: 1, longhours: 1, toddlers: 1, spanish: 1, illburden: 1, illchores: 1, forgiveok: 1, mustreconcile: 1, inheritance: 1, favourite: 1, siblingrift: 1, emptynest: 1, feelingstalk: 1, feelsfine: 1, autisticwork: 1, isthisrude: 1, sharingroom: 1, gaycouple: 1, selfworry: 1, angerhelp: 1, yellpartner: 1, illnesscare: 1, lgbtadult: 1, familycutoff: 1, wifiprivacy: 1, rahelp: 1, feltsmall: 1, holidayboth: 1, savingworry: 1, caresiblings: 1, caremarriage: 1, rentlate: 1, supplies: 1, sitesafe: 1, cantsleep: 1, evidence: 1, adhdfriends: 1, adhdwork: 1, teenmiddle: 1, teensibling: 1, teentalk: 1, shiftwind: 1, roughweek: 1, teaminvisible: 1, ldtimezones: 1, teensay: 1, stepdiscipline: 1, notenough: 1, raisegently: 1, toosensitive: 1, getstay: 1, backmeup: 1, sendamount: 1, planrecall: 1, gamefortwo: 1, retirepurpose: 1, notrealdad: 1, parttimechild: 1, textmeaning: 1, handover: 1, paidwork: 1, disagreenumbers: 1, longstay: 1, ndcouple: 1, sharelist: 1, breaklength: 1, comeback: 1, sentlink: 1, reconnect: 1, pursuewithdraw: 1, familyduty: 1, retired: 1, longdistance: 1, bioparent: 1, outsider: 1, exschedule: 1, carehelp: 1, careadultkids: 1, careresent: 1, yellkids: 1, exharass: 1, exmessages: 1, exbadmouth: 1, lgbtq: 1, parentphone: 1, parentsfight: 1, teamowners: 1, grownkids: 1, phonetrust: 1, lonely: 1, leave: 1, atwork: 1, grief: 1, overgive: 1, burden: 1, parentsblame: 1, onmyown: 1, teens: 1, raisekids: 1, fightnow: 1, judged: 1, sensitive: 1, overload: 1, meltdown: 1, 'upset-right-now': 1 };
  var CV_YEAH = /^(yeah|yes|yep|yup|ya|ok|okay|sure|mhm|uh huh|go on|i guess|kind of|kinda|true)$/;
  // the caring answer we gave a turn or two ago (grief, giving too much…), if any
  function careCard(state) {
    var C0 = state.care;
    if (!C0 || !CV_PERSONAL[C0.id] || (state.turn || 0) - C0.turn > 2) return null;
    return (IDX.first || []).filter(function (x) { return x.id === C0.id; })[0] || null;
  }
  function lc1(x) { return String(x || '').replace(/^./, function (ch) { return ch.toLowerCase(); }); }
  function convoTurn(state, f) {
    var L = state.last;
    if (CV_THANKS.test(f)) return { blocks: [{ k: 'p', x: 'You’re welcome.' }, { k: 'p', x: 'Ask me something else whenever you like.' }], chips: [{ label: 'Surprise me', q: 'Surprise me' }, { label: 'Give me a little tip', q: 'Give me a tip' }], kind: 'thanks' };
    if (CV_RESTART.test(f)) { state.last = null; state.care = null; state.topic = null; return { blocks: [{ k: 'p', x: 'Sure, a fresh start. What’s on your mind? A few words is plenty.' }], chips: STARTERS, kind: 'restart' }; }
    if (CV_REDFLAG.test(f) && !(/\bcontrolling\b/.test(f) && MONEY_W.test(f))) {
      // never a verdict: what makes something more than a rough patch, and, when we know what it's about, a few short questions
      var b = [];
      var I0 = L && L.kind === 'sit' && IDX.sit.issues[L.issue];
      var ctxT = (state.lastQ || '') + ' ' + (I0 ? I0.label : '');
      var gt = (I0 || (L && state.lastQ)) && cqGuess(ctxT);
      if (gt && gt !== 'afraid' && L && L.issue !== 'hurtbythem' && window.TOLClarifyData) {
        var intro = [];
        if (I0) intro.push({ k: 'p', x: 'On its own, ' + lc1(I0.label) + ' is a common problem, and a fixable one. On its own, it isn’t a sign of control. What matters is how it happens, and how you feel around them.' });
        intro.push({ k: 'p', x: 'A few short questions will help me give you a fair read, rather than a guess.' });
        var rq = cqStart(state, gt, ctxT, intro, []);
        if (rq) { rq.kind = 'redflag'; return rq; }
      }
      if (I0 && L.issue !== 'hurtbythem') b.push({ k: 'p', x: 'On its own, ' + lc1(I0.label) + ' is a common problem, and a fixable one. On its own, it isn’t a sign of control. What matters is how it happens, and how you feel around them.' });
      else b.push({ k: 'p', x: 'Here’s how to tell an ordinary rough patch from something more serious.' });
      b.push({ k: 'p', x: 'These are signs to take seriously, and they’re not a communication problem:' });
      b.push({ k: 'list', x: ['You feel scared of them, or of how they’ll react.', 'They hurt, push, corner or threaten you, or threaten to hurt themselves, the kids or a pet.', 'They check your phone, track where you are, or cut you off from friends and family.', 'They control all the money, or stop you from working.', 'They pressure you into sex, or anything else you don’t want.', 'You’re always the one to blame, and you’ve started to doubt your own memory.'] });
      b.push({ k: 'p', x: 'Saying no, or asking for something out of care or respect for the relationship, is not control. That’s true for partners, family and friends alike. A calm “I won’t stay if this keeps happening” is a boundary, not a threat.' });
      b.push({ k: 'p', x: 'If any of these fit, please skip the tools here: they’re for two people who both feel safe.' });
      b.push({ k: 'note', x: I0 ? 'If none of them fit, it’s most likely an ordinary problem you can work on together, and the steps I gave still apply.' : 'If none of them fit, it’s most likely an ordinary problem you can work on together. Tell me what’s going on, or pick what it’s about, and I’ll ask a few short questions so my answer fits.' });
      return { blocks: b, chips: L && L.kind === 'sit' ? [{ label: 'What should I do first?', q: 'What should I do first?' }, { label: 'Words I could use', q: 'Another way to say it' }] : PICK_CHIPS.slice(0, 5), kind: 'redflag' };
    }
    if (CV_NOHELP.test(f)) {
      var tried = /tried/.test(f), nb = [];
      if (L && L.kind === 'sit' && IDX.sit.issues[L.issue] && L.nohelp) {
        // second time round: don't repeat the same block; ask what happened, and offer a person to talk to
        state.last = Object.assign({}, L, { nohelp: L.nohelp + 1 });
        return { blocks: [{ k: 'p', x: tried ? 'Got it. Tell me what happened when you tried it: what they said or did, and how it ended. Even one line helps, and I’ll suggest something different.' : 'I hear you. Tell me in one line what happened, or what you’d most like to change, and I’ll come at it differently.' },
          { k: 'note', x: 'If it keeps going round in circles, a counselor or a calm third person you both trust can help you talk it through. That isn’t a failure. It’s often what gets things unstuck.' }],
          chips: [{ label: 'Something smaller', q: 'Give me one thing to do' }, { label: 'Start over', q: 'Start over' }], kind: 'nohelp' };
      }
      if (L && L.kind === 'sit' && IDX.sit.issues[L.issue]) {
        var P = sitParts(L.issue, L.who, L.noun, L.actor), I = P.I;
        nb.push({ k: 'p', x: tried ? 'Fair enough: you’ve already tried the obvious step. What happened when you did? Tell me in a sentence, and I’ll suggest what to try next.' : 'Sorry, that missed. Let’s come at ' + lc1(I.label) + ' from another side.' });
        if (I.deeper) nb.push({ k: 'p', x: 'When the quick steps don’t move it, the longer look usually does: ' + I.deeper[0] + '.' });
        if (P.path[1]) nb.push({ k: 'links', x: [P.path[1]] });
        nb.push({ k: 'p', x: 'Or tell me which part didn’t fit: you’ve tried it already, it’s bigger than that, or I’ve got the situation wrong. I’ll change course.' });
        state.last = Object.assign({}, L, { v: (L.v || 0) + 1, nohelp: 1 });
        var ch = [];
        if (I.deeper) ch.push({ label: 'Go deeper', q: I.deeper[1] });
        ch.push({ label: 'Something smaller', q: 'Give me one thing to do' });
        ch.push({ label: 'Start over', q: 'Start over' });
        return { blocks: nb, chips: ch, kind: 'nohelp' };
      }
      var cc = careCard(state);
      nb.push({ k: 'p', x: tried ? 'Fair enough, you’ve already tried that. What happened when you did? Tell me in a sentence or two, and I’ll suggest something different.' : 'Sorry that didn’t help. Could you tell me a bit more in your own words, like who it’s with and what happened? I’ll try again from there.' });
      if (cc && cc.links && cc.links.length) { nb.push({ k: 'p', x: 'Or, if you’d rather read than talk, this page goes into it more gently and fully:' }); nb.push({ k: 'links', x: safeLinks(cc.links).slice(0, 1) }); }
      nb.push({ k: 'note', x: 'Some things are bigger than any tool. If it feels that way, a counselor, your doctor, or someone you trust is a good next step.' + (cc && cc.id === 'grief' ? ' Many hospices run free bereavement groups, even if they didn’t care for your loved one.' : '') });
      return { blocks: nb, chips: STARTERS.slice(0, 3), kind: 'nohelp' };
    }
    if (CV_NEXT.test(f) && L && L.kind === 'sit' && IDX.sit.issues[L.issue]) {
      var P2 = sitParts(L.issue, L.who, L.noun, L.actor), st = (L.stage || 0) + 1, solo = L.who === 'self', xb = [];
      state.last = Object.assign({}, L, { stage: st });
      if (st === 1) {
        xb.push({ k: 'p', x: solo ? 'Once those small steps are done, give it a few days and just notice what changes: your energy, your mood, what still snags.' : fill('Once those small steps are done, the next move is one calm conversation with {them}, at a time that suits you both, not in the middle of it.', P2.ctx) });
        if (P2.scripts.length && !solo) xb.push({ k: 'script', l: 'A way to open it', x: fill(P2.scripts[((L.v || 0) + 1) % P2.scripts.length], P2.ctx) });
        if (P2.path[0]) { xb.push({ k: 'p', x: 'Then, when you have ten calm minutes, open the first stop on your short path:' }); xb.push({ k: 'links', x: [P2.path[0]] }); }
      } else if (st === 2) {
        xb.push({ k: 'p', x: solo ? 'After that, give it one ordinary week before you judge it. Then look back: what got easier, and what still sticks?' : 'After that, give it one ordinary week before you judge it. Then look back together for ten minutes: what got easier, and what still sticks?' });
        if (P2.path[1]) xb.push({ k: 'links', x: [P2.path[1]] });
      } else {
        xb.push({ k: 'p', x: 'That’s the whole short plan. If it’s still stuck after a couple of weeks, tell me what’s still happening, and we’ll look at it from another side.' });
        if (P2.path.length) xb.push({ k: 'links', x: P2.path });
      }
      return { blocks: xb, chips: st < 3 ? [{ label: 'And then what?', q: 'And then what?' }, { label: 'That didn’t help', q: 'That didn’t help' }] : [{ label: 'Start over', q: 'Start over' }], kind: 'sit-more' };
    }
    if (CV_NEXT.test(f) || CV_YEAH.test(f)) {
      var cc2 = careCard(state);
      if (cc2 && (!L || L.kind !== 'sit')) {
        var lk = safeLinks(cc2.links || []), n2 = (state.care.next || 0);
        state.care.next = n2 + 1; state.care.turn = state.turn || 0;
        if (n2 < lk.length) return { blocks: [{ k: 'p', x: n2 === 0 ? 'When you have a quiet moment, this goes further, at your own pace:' : 'And when you’re ready, this one too:' }, { k: 'links', x: [lk[n2]] },
          { k: 'p', x: 'There’s no order you have to follow, and no rush. One small thing a day is plenty.' }], chips: [{ label: 'And then what?', q: 'And then what?' }, { label: 'That didn’t help', q: 'That didn’t help' }], kind: 'care-more' };
        return { blocks: [{ k: 'p', x: 'That’s all I’d suggest for now. If you’d like to talk it through with a person, a doctor, a counselor, or someone you trust is a good next step. You can also tell me more about what’s on your mind, and I’ll stay with it.' }], chips: [{ label: 'Start over', q: 'Start over' }], kind: 'care-more' };
      }
      if (state.pend && state.pend.turn === (state.turn || 0) - 1 && (!L || L.kind !== 'sit')) {
        var pd = state.pend; state.pend = Object.assign({}, pd, { turn: state.turn || 0 });
        return { blocks: [{ k: 'p', x: 'I’m still with you on “' + pd.f + '.” To give you real steps, I need one more thing: what usually sets it off, or how does it tend to end? A few words is plenty. Or tap the closest one.' }], chips: pd.chips || STARTERS.slice(0, 3), kind: 'clarify' };
      }
    }
    // after a caregiving answer, "my daughter won't help" and "I resent him" stay about caregiving
    var cc3 = careCard(state);
    if (cc3 && (/^care/.test(cc3.id) || cc3.id === 'illnesscare')) {
      var to = /\b(daughter|son|kids|children|sister|brother|family)\b/.test(f) && /\b(won t|wont|doesn t|doesnt|don t|dont|never|help|visit|call)\b/.test(f) ? 'careadultkids'
        : /\b(resent\w*|guilt\w*|ashamed|angry at him|angry at her)\b/.test(f) ? 'careresent' : /\b(respite|break|support|someone to call)\b/.test(f) ? 'carehelp' : '';
      var tc = to && cardByIdF(to);
      if (tc) { var rc = cardReply(state, tc, 'about'); rc.kind = 'care'; state.care = { id: to, turn: state.turn || 0, f: f }; return rc; }
    }
    // "what about my sister?" just after a caring answer (grief, giving too much…): the same answer, for them
    var mw = f.match(FU_WHO), C0 = state.care;
    if (mw && C0 && careCard(state)) {
      var c = careCard(state);
      // after a loss, "what about my son?" is about a grown child, not a kid with chores
      if (C0.id === 'grief' && /\b(son|daughter|sons|daughters|kids|children|child)\b/.test(f) && (/\b(grown|adult)\b/.test(f) || /\b(wife|husband|partner|spouse|widow\w*)\b/.test(C0.f || ''))) {
        var gk = (IDX.first || []).filter(function (x) { return x.id === 'grownkids'; })[0];
        if (gk) { var rg = cardReply(state, gk, 'about'); rg.kind = 'care'; state.care = { id: 'grownkids', turn: state.turn || 0 }; return rg; }
      }
      var sw = detectSituation(f);
      // "and my husband just wants stricter rules": the topic has its own answer for that, so that one comes instead
      var fol = c && (c.follow || []).some(function (x) { try { return new RegExp(x[0]).test(f); } catch (e) { return false; } });
      if (c && !fol && sw.who && sw.who !== 'self' && !(sw.issue && sw.score >= 3)) {
        var r = cardReply(state, c, 'about');
        var who = sw.noun ? 'your ' + sw.noun.replace(/^(my|our|the|a|an)\s+/, '') : whoCtx(sw.who).them;
        r.blocks.unshift({ k: 'p', x: 'Yes, the same goes with ' + who + '. Each person carries it a little differently, so go gently and ask, rather than guess.' });
        r.kind = 'care'; state.care = { id: C0.id, turn: state.turn || 0 };
        return r;
      }
    }
    return null;
  }
  // after a playbook, a short follow-up stays with it (puddles16): "what do I actually say to her?", "and if she says no?",
  // "I'm scared it'll be awkward"; a flatmate's or co-parent's follow-up can have a card of its own
  var SAYS_NO = /\b(if|what if|and if|but if|what happens if|what do i do if|what should i do if|what (do|can) i do if) (she|he|they|my \w+|it|the answer|the answers) (says?|said|is|s) no\b|\b(if|what if) (she|he|they) (refuses?|wont|won t|doesnt want to|does not want to|dont want to|isnt interested|says not now)\b|\b(she|he|they) (said|says) no\b|^(and |but )?(if|what if) (she|he|they) (says|said) no\b/;
  var SIT_FOLLOW = {
    roommate: [[/\b(awkward|scared|nervous|anxious|confront\w*|hate me|bring it up|raise it|bring this up)\b/, 'flatbringup'], [/\b(gets?|got|goes|get) (mad|angry|upset|annoyed|cross|defensive|offended|weird)\b|\b(react\w*|takes? it) (badly|the wrong way)\b/, 'flatmad']],
    coparent: [[/\b(late|lateness|waiting|waits|waited)\b/, 'coparentpickuplate'], [/\b(ignores?|ignoring|doesnt (reply|answer)|no (reply|answer)|wont (reply|answer|agree))\b/, 'coparentnoreply']]
  };
  function sitFollow(state, L, f) {
    var n = f.split(' ').length, I = IDX.sit.issues[L.issue];
    if (!I || n > 18) return null;
    var sw = detectSituation(f);
    if (sw.score >= 5 && sw.who && sw.who !== L.who && sw.who !== 'other') return null;  // a clearly new story
    var rules = (SIT_FOLLOW[L.who] || []).concat(L.who === 'roommate' ? [[SAYS_NO, 'flatmad']] : L.who === 'coparent' ? [[SAYS_NO, 'coparentnoreply']] : []);
    for (var i = 0; i < rules.length; i++) {
      var fc = rules[i][0].test(f) && cardById(rules[i][1]);
      if (fc) { var rc = cardReply(state, fc, 'about'); rc.kind = 'care'; state.care = { id: fc.id, turn: state.turn || 0, f: f }; if (CV_PERSONAL[fc.id] || fc.topic) setTopic(state, fc, fc.id); return rc; }
    }
    var P = sitParts(L.issue, L.who, L.noun, L.actor), cx = P.ctx, v = (L.v || 0) + 1;
    if (L.who === 'roommate' && TF_SAY.test(f) && cardById('flatbringup')) { var rb = cardReply(state, cardById('flatbringup'), 'about'); rb.kind = 'care'; setTopic(state, cardById('flatbringup'), 'flatbringup'); return rb; }
    if (TF_SAY.test(f) && P.scripts.length) {
      var sb = [{ k: 'p', x: fill(L.who && L.who !== 'self' && L.who !== 'other' ? 'Here are some words you could use with {them}. Change any of them so they sound like you.' : 'Here are some words you could use. Change any of them so they sound like you.', cx) }];
      [0, 1].forEach(function (j) { if (j < P.scripts.length) sb.push({ k: 'script', l: j ? 'Or' : 'Words you could use', x: fill(P.scripts[(v + j) % P.scripts.length], cx) }); });
      if (P.path[0]) sb.push({ k: 'links', x: [P.path[0]] });
      state.last = Object.assign({}, L, { v: v + 1 });
      return { blocks: sb, chips: [{ label: 'What can I do tonight?', q: 'What can I do tonight?' }, { label: 'And if they say no?', q: 'And what if they say no?' }], kind: 'sit-more', id: L.who + '+' + L.issue };
    }
    if (SAYS_NO.test(f)) {
      var nb = [{ k: 'p', x: fill('If {they} say no, or not yet, that’s an answer, not a door closing. Invite them, and let the answer be theirs. Keep it out of the middle of a disagreement, and come back to it at a calm time.', cx) },
        { k: 'p', x: 'You can still start on your own side: what you write down stays useful for your own clarity, and everything on this site also works for one person.' }];
      if (P.scripts.length) nb.push({ k: 'script', l: 'A smaller ask, another day', x: fill(P.scripts[v % P.scripts.length], cx) });
      nb.push({ k: 'links', x: [['What if the other person doesn’t want to do this?', '/book/preface-in-depth.html#faq']].concat(P.path.slice(0, 1)) });
      state.last = Object.assign({}, L, { v: v });
      return { blocks: nb, chips: [{ label: 'What can I do tonight?', q: 'What can I do tonight?' }], kind: 'sit-more', id: L.who + '+' + L.issue };
    }
    return null;
  }
  function followUp(state, f, q) {
    var L = state.last;
    if (!L) return null;
    if (L.kind === 'sit' && IDX.sit.issues[L.issue]) { var sfu = sitFollow(state, L, f); if (sfu) return sfu; }
    if (L.kind === 'sit' && FU_TONIGHT.test(f)) {
      var PT = sitParts(L.issue, L.who, L.noun, L.actor);
      var step = PT.tonight || PT.steps[0] || '';
      step = fill(step, PT.ctx).replace(/^./, function (ch) { return ch.toLowerCase(); }).replace(/[.!]?$/, '.');
      var tb = [{ k: 'p', x: 'Just one tiny step for tonight: ' + step },
        { k: 'p', x: 'That’s plenty for one evening. Small and done beats big and planned.' }];
      if (PT.scripts.length) tb.push({ k: 'script', l: 'If you want words for it', x: fill(PT.scripts[((L.v || 0) + 1) % PT.scripts.length], PT.ctx) });
      return { blocks: tb, chips: [{ label: 'Another way to say it', q: 'Another way to say it' }, { label: 'Give me an example', q: 'Give me an example' }], kind: 'sit-more' };
    }
    if (FU_EX.test(f)) {
      var anotherWay = /another|different|other/.test(f);
      if (L.kind === 'sit') {
        var P = sitParts(L.issue, L.who, L.noun, L.actor);
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
      // "where do I start?" on its own is about the site, unless we were just on a tool, a playbook or a road
      var generalStart = /^(so |ok |okay |and )?(where (do|should|can) (i|we) (start|begin)|where to (start|begin))$/.test(f);
      var lastTool = L.kind === 'card' && (cardById(L.card) || {}).kind === 'tool';
      if (generalStart && !lastTool && L.kind !== 'sit' && L.kind !== 'road') return null;
      if (L.kind === 'card') {
        var c3 = cardById(L.card);
        if (c3 && c3.how && c3.how.length && /\buse\b/.test(f)) return cardReply(state, c3, 'how');
        if (c3 && (c3.start || c3.how)) return { blocks: [{ k: 'p', x: 'Here’s a simple way to start with ' + c3.name + ':' }, { k: 'list', x: (c3.start || c3.how).slice(0, 4) }, { k: 'links', x: safeLinks(c3.links).slice(0, 1) }], chips: [], kind: 'card-more' };
      }
      if (L.kind === 'sit') {
        var P2 = sitParts(L.issue, L.who, L.noun, L.actor);
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
        if (ok) return sitReply(state, L.issue, nw, noun, '', 0, L.actor);
      }
      var rr2 = roadReply(state, nw, noun);
      if (L.topic && L.kind !== 'road') rr2.blocks.unshift({ k: 'p', x: 'Good question. Everything here works in any relationship, and ' + L.topic + ' is no exception.' });
      return rr2;
    }
    return null;
  }

  // "I feel like we're roommates" / "we're just roommates now", said about a partner, is about
  // closeness, not about sharing a flat: send it to partners and connection (turning toward, bids,
  // small rituals). Real roommate talk ("my roommate…", rent, three of us) is left alone.
  var ROOMIES_FIG = /\b(feel|feels|feeling|felt|it s|its|living) like (we re |we are |were |we ve become |we have become |we re just |we are just )?(just |only |basically |more like )?roommates\b|\b(we re|we are|were|we ve become|we have become|become|turned into) (just |only |basically |more like |like )?roommates\b|\b(just|only|basically|more like) roommates\b/;
  var ROOMIES_REAL = /\b(my|our|the|a|new|two|three|four|five|six|seven|eight|other) (roommates?|roomates?|housemates?|flatmates?)\b|\b(roommates?|housemates?|flatmates?) (and i|of mine|agreement)\b|\b(rent|lease|landlord|utilities|bills?|venmo|splitwise)\b/;
  function roommatesFigure(f) {
    if (!ROOMIES_FIG.test(f) || ROOMIES_REAL.test(f.replace(ROOMIES_FIG, ' '))) return f;
    var who = /\b(my )?(partner|husband|wife|spouse|boyfriend|girlfriend|fianc[eé]e?|bf|gf)\b/.exec(f);
    return (who ? 'my ' + who[2] : 'my partner') + ' and i feel distant and disconnected lately like we have drifted apart';
  }

  // A follow-up in someone's own words ("he just ignores it", "and then she laughed"): stay with the playbook
  // we were on, with a different angle, instead of searching the pages for it.
  function contextReply(state, L, f) {
    if (!L || L.kind !== 'sit' || !IDX.sit.issues[L.issue]) return null;
    // only for a follow-up that sounds like more of the story, not a new, unrelated question
    if (/^(what|whats|how|hows|where|which|who|when|why|whys|can you|could you|do you|does|do people|is there|are there|is it|tell me about|show me|define|explain)\b/.test(f) || MEANQ.test(f) ||
        !/\b(he|she|they|him|her|them|his|hers|their|theirs|we|us|our|my|me|i|im|ive|said|says|say|did|does|didnt|doesnt|dont|then|again|still|keeps?|just|always|never|today|tonight|yesterday)\b/.test(f)) return null;
    var n = f.split(' ').length;
    if (n > 24) return null;
    var v = (L.v || 0) + 1, P = sitParts(L.issue, L.who, L.noun, L.actor);
    var b = [{ k: 'p', x: fill('Thanks for telling me more. Let’s stay with ' + P.I.label + (L.who && L.who !== 'self' && L.who !== 'other' ? ', with {them}.' : '.'), P.ctx) }];
    var step = P.steps[v % Math.max(1, P.steps.length)];
    if (step) b.push({ k: 'p', x: 'One thing that often helps here: ' + fill(step, P.ctx).replace(/^./, function (ch) { return ch.toLowerCase(); }) });
    if (P.scripts.length) b.push({ k: 'script', l: 'Words you could use', x: fill(P.scripts[v % P.scripts.length], P.ctx) });
    if (P.path[0]) b.push({ k: 'links', x: [P.path[0]] });
    b.push({ k: 'note', x: 'If that’s not quite it, tell me a bit more about what happened, or who it was with.' });
    state.last = Object.assign({}, L, { v: v });
    return { blocks: b, chips: [{ label: 'What can I do tonight?', q: 'What can I do tonight?' }, { label: 'Give me an example', q: 'Give me an example' }, { label: 'Something else', q: 'Something happened today and I want to handle it better' }], kind: 'sit-more', id: L.who + '+' + L.issue };
  }
  // A short, personal message the pages can't answer ("we fought again", "ugh, my sister"): a warm question back.
  var SOFT = /\b(i|im|ive|me|my|we|us|our|he|she|they|him|her|them|feel|feeling|felt|fight|fought|fighting|argu\w*|upset|stress\w*|sad|hurt|lonely|tired|angry|mad|annoyed|frustrat\w*|worried|scared|nervous|jealous|awkward|tense|help)\b/;
  function softClarify(state, f) {
    var n = f.split(' ').length;
    if (n > 16 || !(SOFT.test(f) || FEELS.some(function (x) { return x[0].test(f); }))) return null;
    var sit = detectSituation(f);
    state.last = null;
    var out = softClarify0(state, f, sit);
    if (out) state.pend = { f: f.length > 60 ? f.slice(0, 57) + '…' : f, chips: out.chips, turn: state.turn || 0 };
    return out;
  }
  function softClarify0(state, f, sit) {
    if (sit.who && sit.who !== 'self' && sit.who !== 'other') {
      var c = clarifyWho(state, sit.who, sit.noun);
      c.blocks[0].x = fill('Thanks for telling me. I’d like to help with the right thing with {them}. Is it closest to one of these? Or say a bit more in your own words.', whoCtx(sit.who, sit.noun));
      return c;
    }
    // the chips fit the person: a flatmate or a carer gets their own, never a list of couple fights (puddles16)
    var pu = (state.page && state.page.u) || '';
    var kind = /\b(kitchen|flat|flatmates?|housemates?|roommates?|room ?mates?|dorm|halls|shared house|house ?share|student house)\b/.test(f) || /^\/(sharing-a-room|roommates)\.html$/.test(pu) ? 'roommate'
      : /\b(caring for|care for|carer|caregiv\w*|look(ing)? after (my )?(mum|mom|dad|mother|father|parents?|nan|gran))\b/.test(f) || /^\/caregivers\.html$/.test(pu) ? 'caregiving' : '';
    if (kind && IDX.sit.who[kind]) {
      var ck = clarifyWho(state, kind, '');
      ck.blocks[0].x = 'Thanks for telling me. I want to make sure I help with the right thing. Is it closest to one of these? Or say a bit more in your own words.';
      return ck;
    }
    // on your own, after a loss, or older: never a list of couple fights
    var solo =/\b(alone|on my own|by myself|lonely|widow\w*|lost my (wife|husband|partner)|(wife|husband|partner) (died|passed)|retired|my age|older|(i m|im|i am) (5|6|7|8|9)\d|single|divorced|live alone)\b/.test(f) || (state.page && /^\/(grief|on-my-own|empty-nest|grandparents)\.html$/.test(state.page.u || ''));
    return { blocks: [{ k: 'p', x: 'Thanks for telling me. I want to make sure I help with the right thing. Is it closest to one of these? Or tell me a little more in your own words, like who it’s with and what happened.' }],
      chips: solo ? [{ label: 'Building a life on my own', q: 'Building a life on my own' }, { label: 'I lost someone', q: 'I lost my partner and the house is so quiet' }, { label: 'I feel lonely', q: 'I feel lonely' }, { label: 'Tell me something calming', q: 'Tell me something calming' }]
        : [{ label: 'We keep having the same fight', q: 'We keep having the same fight again' }, { label: 'Making up after a fight', q: 'How do we make up after a fight?' },
        { label: 'I’m worn out', q: 'I feel exhausted and overwhelmed' }, { label: 'What can I do tonight?', q: 'What can I do tonight?' }], kind: 'clarify' };
  }

  // ------------------------------------------------------------------ care first: tender moments and literal questions
  // Asked plainly, answered plainly: who can see this chat, "is it my fault?", "tell me something calming",
  // "I just had a fight and I have 5 minutes", bigger text, reading out loud. These answer before anything else,
  // and they don't change the topic we were on.
  var SHORTER = /^(ok |so |can you |could you |please |pls )*(tl ?dr|tldr|too long( didnt read)?|make (it|that|this) (shorter|simpler|short)|shorter|shorten (it|that|this)|summari[sz]e( (it|that|this))?|(give me )?(the )?(short|shorter|quick|simple|simpler) version|sum (it|that) up|(say|put) (it|that) (shorter|simpler|more simply|in fewer words|in plain words)|simpler|simplify( (it|that|this))?|too many words|too much text|in short|less words|fewer words|(something|anything|a|one|got anything|have you got (something|anything)) (quicker|shorter|faster|simpler|smaller)( (one|version|thing|to do))?|quicker|(a )?quicker (one|version|way))( please| pls| plz)?$/;
  var LEFT_OFF = /^(so |ok |okay |um |hey )*(where (did|was|were) (i|we) (leave|left|leaving) off|where (was|were) (i|we)|what were we (talking about|saying|doing|on)|(pick up|carry on|continue|keep going) (from )?where (i|we) left off|where did we get to|what was i (asking|doing|saying)|remind me what we were (talking about|doing))( please)?$/;
  // A short version of a reply: one line, up to three bullets (two when there are words to use), the words, one link.
  function shortBlocks(blocks, keepScript) {
    var paras = [], bullets = [], link = null, script = null;
    (blocks || []).forEach(function (b) {
      if (b.k === 'script' && keepScript && !script) script = b;
      if (b.k === 'p' && !b.mean && !/^(Here’s|The site|This part|Sure|Here you go|Related|It also|Another page|This may be|The short version)/.test(b.x)) paras.push(b.x);
      if (b.k === 'list' && !bullets.length) bullets = b.x.slice(0, 3);
      if (b.k === 'passage') { paras.push((b.x || []).join(' ').replace(/^…\s*/, '').replace(/\s*…$/, '')); if (!link && b.u) link = [b.h, b.u]; }
      if (b.k === 'bg') paras.push((b.x || []).join(' '));
      if (b.k === 'links' && !link && b.x && b.x[0]) link = b.x[0];
    });
    // a sentence is never cut inside a quote: “Thank you for sorting the car. That really helped.” stays whole
    function whole(t, ss0) { var ss1 = ss0 || sentences(t), acc = ''; for (var i = 0; i < ss1.length; i++) { acc += (acc ? ' ' : '') + ss1[i]; if ((acc.match(/“/g) || []).length <= (acc.match(/”/g) || []).length) return acc; } return t; }
    var ss = paras.length ? sentences(paras[0]) : [], first = ss.length ? whole(paras[0], ss) : '';
    if (first && wc(first) < 5 && ss[1]) first += ' ' + ss[1];  // "I’m sorry." alone is too short to stand as the gist
    if (!bullets.length && paras.length) bullets = sentences(paras.join(' ')).slice(1, 3);
    bullets = bullets.map(function (t) { return whole(t); }).slice(0, script ? 2 : 3);
    if (!first && !bullets.length) return null;
    var out = [];
    if (first) out.push({ k: 'p', x: 'The short version: ' + first });
    if (bullets.length) out.push({ k: 'list', x: bullets });
    if (script) out.push(script);
    if (link) out.push({ k: 'links', x: [link] });
    return out;
  }
  // "say it in simple English", "my English is not good": short sentences and everyday words from here on.
  // Cards that have a plain version use it; anything else gets the short version.
  var EASY_ASK = /\b(simpler|simple|easy|easier|plain|plainer|basic) (english|words|language)\b|\bmy english (is )?(not|isn t|no) (good|great|strong|very good|so good)\b|\benglish is (my )?(second|2nd|not my first) language\b|\bsay (it|that) (simply|more simply|easier|in easy words)\b/;
  // In easy-words mode, everyday words for the harder words and sayings the answers use
  var EASY_SWAP = [[/\bclose the gap\b/g, 'get closer'], [/\bwithout an agenda\b/g, 'with no plan'], [/\bagendas?\b/g, 'list of things to talk about'],
    [/\bemotional granularity\b/gi, 'naming feelings more exactly'], [/\bgranularity\b/g, 'detail'], [/\btaken for granted\b/g, 'not noticed or thanked'],
    [/\btak(e|es|ing) (\w+) for granted\b/g, 'stop noticing $2'], [/\bships passing in the night\b/g, 'hardly seeing each other'], [/\bon the same page\b/g, 'agreeing'],
    [/\brunning on empty\b/g, 'very tired'], [/\bbandwidth\b/g, 'energy'], [/\bresentment\b/g, 'anger that builds up'], [/\breciprocat\w*\b/g, 'give back'],
    [/\bvalidat(e|es|ing)\b/g, 'show you understand'], [/\bvalidation\b/g, 'showing you understand'], [/\bturn(ing)? toward\b/g, 'respond$1 to'],
    [/\bbids? for (attention|connection)\b/g, 'small ways of reaching for you'], [/\bdynamics?\b/g, 'pattern'], [/\bhold(ing)? the fort\b/g, 'keep$1 things going'],
    [/\bpitch in\b/g, 'help'], [/\bin the loop\b/g, 'told'], [/\bout of the loop\b/g, 'not told'], [/\bwears on\b/g, 'hurts'], [/\bwear on\b/g, 'hurt'], [/\bloaded\b/g, 'tense'],
    [/\bthe noticing\b/g, 'noticing what needs doing'], [/\bscorecard\b/g, 'score'], [/\bat a calm moment\b/g, 'when you are both calm'], [/\bverdict\b/g, 'final judgement'],
    [/\bsorting (out )?the\b/g, 'fixing the'], [/\bsort(ing)? out\b/g, 'fix$1'], [/\bturning up\b/g, 'being there'], [/\bturn up\b/g, 'come'], [/\bproviding\b/g, 'earning money for the family'],
    [/\blow[- ]pressure\b/g, 'easy'], [/\bunwind\b/g, 'relax'], [/\bwind down\b/g, 'relax'], [/\bflooded\b/g, 'too upset to think'], [/\bstart to finish\b/g, 'from start to end'],
    [/\bside by side\b/g, 'next to each other'], [/\brhythm\b/g, 'habit'], [/\bcheck in\b/g, 'talk for a few minutes'], [/\bcheck-ins?\b/g, 'short talks'],
    [/\bbig talk\b/g, 'long serious talk'], [/\bthe load\b/g, 'the work'], [/\binvisible work\b/g, 'work nobody sees'], [/\bmental load\b/g, 'thinking and planning work'],
    [/\bpush back\b/g, 'say no'], [/\bfollow through\b/g, 'do what you said'], [/\bin the moment\b/g, 'right then'], [/\bopen up\b/g, 'talk about feelings']];
  function easyText(x) { var o = String(x); EASY_SWAP.forEach(function (e) { o = o.replace(e[0], function () { var a = arguments, t = e[1].replace(/\$(\d)/g, function (m, d) { return a[+d] || ''; }); return t; }); }); return o; }
  function easySwap(r) {
    if (!r || !r.blocks) return r;
    r.blocks.forEach(function (b) {
      if (b.k === 'p' || b.k === 'note' || b.k === 'script') b.x = easyText(b.x);
      else if ((b.k === 'list' || b.k === 'passage') && Array.isArray(b.x)) b.x = b.x.map(easyText);
    });
    return r;
  }
  function easyBlocks(c) {
    var b = [{ k: 'list', x: c.plain }];
    (Array.isArray(c.script) ? c.script : c.script ? [c.script] : []).slice(0, 1).forEach(function (x) { b.push({ k: 'script', l: 'Words you could say', x: x }); });
    var links = safeLinks(c.links).slice(0, 1); if (links.length) b.push({ k: 'links', x: links });
    return b;
  }
  function easyWords(state) {
    state.easy = 1; state.brief = 1;
    var c = state.last && state.last.card && cardById(state.last.card);
    if (c && c.plain) return { blocks: [{ k: 'p', x: 'Here it is in easy words.' }].concat(easyBlocks(c)), chips: [{ label: 'Tell me more', q: 'Tell me more' }], kind: 'short' };
    var R = state.lastReply, out = shortBlocks(R && R.blocks, true);
    if (out) { state.fullReply = R; return { blocks: [{ k: 'p', x: 'Here it is in fewer words. I’ll keep my words short and simple from now on.' }].concat(out), chips: [{ label: 'Tell me more', q: 'Tell me more' }], kind: 'short' }; }
    return { blocks: [{ k: 'p', x: 'Yes. I’ll use short, simple words. Ask me anything.' }, { k: 'p', x: 'You can also turn on Easy reading and “Listen to this page” in Settings at the top.' }], chips: STARTERS.slice(0, 3), kind: 'short' };
  }
  function shorter(state) {
    var R = state.lastReply, out = shortBlocks(R && R.blocks);
    state.brief = 1;  // and short from here on, until they ask for more
    if (!out) return { blocks: [{ k: 'p', x: 'There’s nothing above to shorten yet. I’ll keep my answers short from now on.' },
      { k: 'p', x: 'Pages have short ways in too: a 🌱 Simple version and 📌 The short version at the top of long pages.' }], chips: STARTERS.slice(0, 3), kind: 'short' };
    state.fullReply = R;
    return { blocks: out, chips: [{ label: 'Tell me more', q: 'Tell me more' }], kind: 'short' };
  }
  // Short mode ("make it shorter", "keep your answers short", "can you talk slower"): every answer after that
  // comes short, with "Tell me more" for the full one, until they ask for more. Never for the safety reply.
  var LONGER = /^(ok |okay |please |can you |could you )*(give me |go back to |back to )?(the )?(longer|full|fuller|whole|complete|detailed|normal|long) (answers?|replies|version|ones?)( again| please)*$|^(more detail|more details|in more detail|the full answer)( please)?$/;
  var NO_BRIEF = { safety: 1, short: 1, clarify: 1, unclear: 1, offtopic: 1, none: 1, calc: 1 };
  function briefen(state, r) {
    if (!r || !r.blocks || NO_BRIEF[r.kind] || r.noBrief || r.id === 'brief') return r;
    var words = 0; r.blocks.forEach(function (b) { words += wc(b.k === 'list' || b.k === 'passage' || b.k === 'bg' ? (b.x || []).join(' ') : b.k === 'links' ? '' : b.x || ''); });
    if (words <= 60) return r;
    var out = shortBlocks(r.blocks, true);
    if (!out) return r;
    var mean = r.blocks[0] && r.blocks[0].mean ? [r.blocks[0]] : [];
    state.fullReply = { blocks: r.blocks, chips: r.chips, kind: r.kind, id: r.id };
    var chips = [{ label: 'Tell me more', q: 'Tell me more' }].concat((r.chips || []).filter(function (c) { return !/^tell me more$/i.test(c.label); }));
    return { blocks: mean.concat(out), chips: chips.slice(0, 3), kind: r.kind, id: r.id, brief: 1 };
  }
  function unBrief(state, f) {
    if (!state.brief || !(FU_MORE.test(f) || LONGER.test(f))) return null;
    state.brief = 0;
    var fr = state.fullReply; state.fullReply = null;
    if (fr && fr.blocks) return { blocks: fr.blocks, chips: (fr.chips || []).filter(function (c) { return !/^tell me more$/i.test(c.label); }), kind: fr.kind || 'card-more', id: fr.id };
    if (LONGER.test(f)) return { blocks: [{ k: 'p', x: 'Sure. I’ll give you the full answers again. Say “make it shorter” any time.' }], chips: STARTERS.slice(0, 3), kind: 'care' };
    return null;
  }
  function leftOff(state) {
    var L = state.last;
    var tail = { k: 'p', x: 'Tools that keep your place do it on this device: My weather today (Today’s Weather) keeps an almanac of the readings you save, Rewind the talk (the Carrier Wave Decoder) keeps a journal, and fill-in workpapers can keep a draft if you turn that on.' };
    if (L && (L.topic || L.q)) {
      var what = L.topic || '“' + String(L.q).slice(0, 60) + '”';
      return { blocks: [{ k: 'p', x: 'We were last talking about ' + what + '. Want to carry on with that, or start something new?' }, tail],
        chips: [{ label: 'Carry on', q: L.kind === 'sit' ? 'What can I do tonight?' : 'Tell me more' }, { label: 'Something new', q: 'What can I ask?' }], kind: 'care' };
    }
    return { blocks: [{ k: 'p', x: 'This chat is starting fresh, so there’s nothing earlier here to pick up. It only keeps a conversation in this tab, until you close it.' }, tail], chips: STARTERS.slice(0, 3), kind: 'care' };
  }
  // how alike two questions are (shared words): the short "same thing again" reply is only for a near-repeat
  function alike(a, b) {
    if (!a || !b) return 0;
    var A = {}, B = {}, n = 0, u = 0, k;
    a.split(' ').forEach(function (w) { if (w.length > 2) A[w] = 1; });
    b.split(' ').forEach(function (w) { if (w.length > 2) B[w] = 1; });
    for (k in A) { u++; if (B[k]) n++; }
    for (k in B) if (!A[k]) u++;
    return u ? n / u : 0;
  }
  // ------------------------------------------------------------------ the topic we're on
  // The last caring topic card we answered with (friends, coming home, two faiths…), or the page the chat was opened
  // from. Short follow-ups ("i'm so tired of it", "what do i actually text her", "can i print this") are answered from it,
  // before anything else is searched, for a few turns.
  var TOPIC_TTL = 5;
  function topicCard(state) {
    var T = state.topic, t = state.turn || 0;
    if (T && t - T.turn <= TOPIC_TTL && cardById(T.id)) return cardById(T.id);
    if (state.pageTopic && cardById(state.pageTopic.id)) return cardById(state.pageTopic.id);
    return null;
  }
  function topicRoot(state) {
    var T = state.topic, t = state.turn || 0;
    var R = T && t - T.turn <= TOPIC_TTL ? T.root : state.pageTopic && state.pageTopic.id;
    return (R && cardById(R)) || null;
  }
  // the page the chat was opened from (its path, or /ask.html?about=<the page's heading>): its topic card, if it has one,
  // is the topic until another one comes up, and its own questions are the first chips
  function pageInit(state) {
    var P = state.pageCtx; state.pageDone = 1;
    if (!P) return;
    var forPage = P.forPage || FOR_PAGE[((/[?&]for=([a-z-]+)/.exec(P.path || '') || [])[1] || '').toLowerCase()] || '';
    var path = String(P.path || '').split('?')[0].replace(/\/index\.html$/, '/').replace(/\.html?$/, '.html'), about = String(P.about || '').trim();
    if (path && !/\.html$/.test(path) && path !== '/') path = path.replace(/\/$/, '') + '.html';
    if (about) {
      var a = stNorm(about).replace(/^tell me more about /, ''), best = '';
      for (var i = 0; i < KB.docs.length && !best; i++) {
        var d = KB.docs[i]; if (d.tip || d.g) continue;
        var t = stNorm(pageName(d.t)), h = stNorm(d.h);
        if (t === a || (h === a && /#main$|^[^#]*$/.test(d.u)) || (a.length > 12 && t.indexOf(a) === 0)) best = d.u.split('#')[0];
      }
      // an older name for the page (a page's heading changed, an old ?about= link): a card's link label still finds it
      for (var j = 0; j < (KB.cards || []).length && !best; j++) (KB.cards[j].links || []).forEach(function (l) { if (!best && l && l[1] && l[1].indexOf('#') < 0 && /\.html$/.test(l[1]) && stNorm(l[0]) === a) best = l[1]; });
      // the same words with "a"/"the" dropped ("Co-parenting after a separation" is "Co-Parenting After Separation: …")
      var noArt = function (x) { return x.replace(/\b(a|an|the)\b/g, ' ').replace(/\s+/g, ' ').trim(); }, a2 = noArt(a);
      for (var k = 0; k < KB.docs.length && !best && a2.length > 12; k++) { var dk = KB.docs[k]; if (!dk.tip && !dk.g && noArt(stNorm(pageName(dk.t))).indexOf(a2) === 0) best = dk.u.split('#')[0]; }
      if (best) path = best;
    }
    function cardFor(u) { return (KB.cards || []).filter(function (c) { return c.page === u && c.first; })[0] || null; }
    // a page opened for a situation (?for=co-parent) takes that situation's topic when it has none of its own
    if (forPage && !cardFor(path)) path = forPage;
    // the topic we were on before this page, when this page has none of its own
    var R0 = state.restore; state.restore = null;
    if (R0 && !cardFor(path) && cardById(R0.id)) state.topic = { id: R0.id, root: R0.root && cardById(R0.root) ? R0.root : R0.id, side: R0.side, turn: 0, v: 0 };
    if (!path || path === '/ask.html') { state.page = about ? { u: '', about: about } : null; return; }
    state.page = { u: path, about: about };
    var pc = cardFor(path);
    if (pc) { state.pageTopic = { id: pc.id, root: pc.id }; state.page.chips = (pc.pageChips || []).map(function (x) { return { label: x[0], q: x[1] }; }); }
  }
  // Opened from a page ("Tell me more about <the page>", or /ask.html?about=<its heading>): a short overview of that page,
  // what it covers, and a choice of where to start, never a random passage from somewhere else
  function pageOverview(state, vf) {
    var P = state.page, u = P && P.u;
    if (!u) return null;
    var title = pageTitle(u), tn = stNorm(title), m = /^tell me (more )?about (.+)$/.exec(vf), asked = m ? stNorm(m[2]) : stNorm(vf);
    var about = stNorm(P.about || '');
    if (!asked || !(asked === tn || (about && asked === about) || (asked.length > 12 && tn.indexOf(asked) === 0) || (m && /^(this|this page|the page)$/.test(asked)))) return null;
    var docs = KB.docs.filter(function (d) { return !d.tip && !d.g && d.u.split('#')[0] === u; });
    if (!docs.length) return null;
    var intro = docs.filter(function (d) { return /^in short$/i.test(d.h); })[0] || docs.filter(function (d) { return /#main$/.test(d.u); })[0] || docs[0];
    var seen = {}, secs = [];
    docs.forEach(function (d, i) {
      var a = d.u.split('#')[1] || '';
      if (!a || a === 'main' || a === 'more' || a === 'faq' || seen[a]) return;
      seen[a] = 1; var h = pageName(d.h).split(':')[0].trim();
      if (h && !/^(words you could use|more for your situation|go deeper|ask professor puddles)$/i.test(h)) secs.push({ h: h, i: KB.docs.indexOf(d) });
    });
    var pc = state.pageTopic && cardById(state.pageTopic.id);
    var b = [{ k: 'p', x: 'Here’s what “' + title + '” covers, in short:' }, passageBlock(KB.docs.indexOf(intro), [])];
    if (secs.length) { b.push({ k: 'p', x: 'It has sections on:' }); b.push({ k: 'list', x: secs.slice(0, 8).map(function (x) { return x.h; }) }); }
    b.push({ k: 'p', x: 'Which part would you like? Or tell me what’s going on, in your own words.' });
    state.last = { kind: 'card', q: title, topic: title, u: u };
    var chips = pc && pc.pageChips && pc.pageChips.length ? pc.pageChips.map(function (x) { return { label: x[0], q: x[1] }; }) : secs.slice(0, 3).map(function (x) { return { label: x.h.length > 40 ? x.h.slice(0, 38).replace(/\s+\S*$/, '') + '…' : x.h, doc: x.i }; });
    return { blocks: b, chips: chips.slice(0, 4), kind: 'page', id: 'overview' };
  }
  // the kind of relationship a topic card is about, for the playbooks
  function relOf(id) {
    id = String(id || '');
    if (/^(coparent|handoffkit|exweekends|exschedule|exharass|exmessages|exbadmouth|holidayboth|kidnewplan|parttime|sundaygoodbye)/.test(id)) return 'coparent';
    if (/^friends/.test(id)) return 'friend';
    if (/^(room|house|sharingroom|rahelp)/.test(id)) return 'roommate';
    if (/^(siblingrift|rift|inheritance|favourite|forgiveok|mustreconcile)/.test(id)) return 'family';
    if (/^biz/.test(id)) return 'coworker';
    return '';
  }
  function setTopic(state, c, root, side) { var T0 = state.topic; state.topic = { id: c.id, turn: state.turn || 0, root: root || c.id, v: T0 && T0.id === c.id ? (T0.v || 0) : 0, side: side != null ? side : (T0 && T0.root === (root || c.id) ? T0.side : null) }; }
  // the page a topic card is about: its own "page", else its first link that isn't a general tool
  var GENERIC_PAGE = /^\/(lemonade-stand|turning-toward|signal-translator|check-ins|start-here|upset-right-now|wp-11|wiring-card|night-garden|soundscapes|self-path|conversation-reader)\.html|^\/(workpapers|library|tools)\//;
  function topicPage(c) {
    if (!c) return '';
    if (c.page) return c.page;
    var l = (c.links || []).filter(function (x) { return x && x[1] && !GENERIC_PAGE.test(x[1]); })[0];
    return l ? l[1].split('#')[0] : '';
  }
  function pageTitle(u) {
    for (var i = 0; i < KB.docs.length; i++) if (KB.docs[i].u.split('#')[0] === u) return pageName(KB.docs[i].t);
    return '';
  }
  // a card can answer for one side of a two-sided topic: "she says I'm bad with money" (the spender), "i work nights and
  // feel guilty" (the night worker). Its "sides" list [{re, what, how, script, scriptLabels}] replaces those fields.
  function sideOf(c, f, keep) {
    if (!c || !c.sides) return c;
    function as(i) { var S = c.sides[i], o = {}; Object.keys(c).forEach(function (k) { o[k] = c[k]; }); Object.keys(S).forEach(function (k) { if (k !== 're') o[k] = S[k]; }); o.side = i; return o; }
    for (var i = 0; f && i < c.sides.length; i++) {
      var re = null;
      try { re = new RegExp(c.sides[i].re); } catch (e) { re = null; }
      if (re && re.test(f)) return as(i);
    }
    // a follow-up keeps the side we were on ("what do i text her" after "my friend never texts back")
    return keep != null && c.sides[keep] ? as(keep) : c;
  }
  var TF_SAY = /^(so |ok |okay |but |and |right |then |um |hmm |well )*(what (do|should|can|could|would) i (actually |even |really |possibly |then )?(say|text|write|send|tell)\b|what (words|do i text|should i text)\b|how (do|should|can|could|would) i (actually )?(say|word|phrase|put|text|write|tell|bring) (it|this|that|her|him|them|up|my)\b|(give me|any|some|got any) (the )?words\b|what to (say|text|write)\b|how (do|should) i (start|open) (the|that|this) (conversation|talk|chat)|how (do|should) we word (it|this|that|texts?|things|messages?))/;
  var TF_DO = /\b(what (can|could|should) (i|we) (actually |really )?do (this week|today|tonight|this weekend|right now|now|first)|something (simple|small|easy|practical)|(one|a) (small |simple |easy |little )?thing (i|we) (can|could) (do|try)|what s (a|one|the) (first|small|next) step)\b/;
  var TF_FEEL = /^(but |and |so |honestly |tbh |i guess |ok |okay |still |yeah |yes )*(i (still )?(feel|m|am) (so |really |just |still |a bit |kind of |pretty |very )*(guilty|bad|awful|terrible|tired|exhausted|drained|worn out|fed up|done|sad|stuck|lost|hurt|angry|annoyed|frustrated|resentful|overwhelmed|helpless|alone|useless|ashamed|left out)|(i m|im|i am) (so |really |just )*(tired|sick|fed up) of (it|this|that|all (of )?(this|it))|(this|it) (is|s) (so |really )?(hard|exhausting|a lot))\b/;
  var DOSE_Q = /\b(what|which|how much|how many|right|safe|best|max\w*|recommended) (dose|dosage|amount|mg|milligrams?)\b|\b(dose|dosage) (of|for)\b|\bhow (much|many)\b.{0,25}\b(should|can|do|could) i (take|have|give)\b|\bhow (much|many) (mg|milligrams?|tablets?|capsules?|pills?|drops?)\b/;
  var MEDS_W = /\b(sertraline|fluoxetine|citalopram|escitalopram|paroxetine|venlafaxine|duloxetine|mirtazapine|prozac|zoloft|lexapro|celexa|paxil|effexor|cymbalta|ssris?|snris?|antidepressants?|anti depressants?|my (meds|medication|medicine|pills|tablets|prescription))\b/;
  var HERB_SSRI = {
    herbstjohns: 'With an antidepressant such as an SSRI, St John’s wort can cause serotonin syndrome (shaking, confusion, stiffness), which can be life-threatening. Please don’t take it with yours unless your prescriber says so.',
    herbcbd: 'CBD can change how other medicines work, including antidepressants and blood thinners, and it can harm the liver. Ask your pharmacist before taking it with yours.',
    herbashwagandha: 'The supplements page doesn’t list a known clash between ashwagandha and SSRIs, but it has its own warnings (rare liver injury, possible thyroid effects), so check it with a pharmacist alongside your medicine.',
    herbkava: 'Kava has rare but serious liver warnings, and it should never be mixed with alcohol or sedatives. Check with your pharmacist before taking it with any medicine.',
    herbmelatonin: 'Melatonin can make you drowsy, and in the UK it’s prescription-only. Check with your pharmacist before taking it alongside your medicine.',
    herbmagnesium: 'The page’s warnings for magnesium are about too much (over 350 mg a day from supplements can cause diarrhea) and kidney problems. Check with your pharmacist about taking it with your medicine.',
    herbchamomile: 'Chamomile may interact with warfarin, and some people are allergic. Ask your pharmacist if you take any medicine.'
  };
  var TEEN_CUE = /\b(i m|im|i am) 1[0-7]( years old| yrs old| year old)?\b|\b(i m|im|i am|i ve been|ive been) (in|into) (foster care|care|a foster home|a placement)\b|\bmy (foster )?carers\b|\bmy foster (mum|mom|dad|parents|family|carer)\b|\bmy (nan|nana|nanna|gran|granny|grandma|grandad)\b.{0,30}\b(took|takes|taking|wont let|won t let|doesnt get|dont get|strict|rules|my phone|curfew)\b|\b(in|at) (year (7|8|9|10|11|12|13)|grade (6|7|8|9|10|11|12)|high school|middle school|secondary school|sixth form)\b/;
  var TF_PRINT = /\b(print|printable|printing|print out|printed|printer)\b/;
  var TF_SOURCE = /\b(source|sources|cite|citation|reference|references|who (came up with|invented|said|discovered|found) (that|this|it)|where (does|did) (that|this|it) come from|is there (any )?(research|evidence|a study|science)|what (research|study|studies))\b/;
  var PRINT_SHORT = /^\/(adhd-kids|grandparents)\.html$/;
  function printReply(state, f, TC) {
    var u = '', t = '';
    var ab = f.match(/\b(?:page|guide|one|bit|part|section|handout|sheet)?\s*(?:about|on|for)\s+(.+?)(?:\s+(?:page|guide))?$/);
    if (ab && !/^(this|that|it|me|my|the page|this page)$/.test(ab[1])) {
      var tf = ab[1], cc = null;
      for (var i = 0; i < (IDX.first || []).length && !cc; i++) if (IDX.first[i].re.test(tf) || IDX.first[i].re.test('my son has ' + tf) || IDX.first[i].re.test('what is ' + tf)) cc = IDX.first[i];
      if (cc) u = topicPage(cc);
      if (!u) { var h0 = search(tf).hits.filter(function (h) { return !KB.docs[h.i].tip && !KB.docs[h.i].g; })[0]; if (h0) u = KB.docs[h0.i].u.split('#')[0]; }
    }
    if (!u && TC) u = topicPage(TC);
    if (!u && state.page && state.page.u && state.page.u !== '/ask.html') u = state.page.u;
    if (u) t = pageTitle(u);
    var b = [{ k: 'p', x: u ? 'Yes. To print ' + (t ? '“' + t + '”' : 'that page') + ', open it and scroll to the bottom: the Print this page button is next to Share. On a computer, your browser’s own Print works too (Ctrl+P, or ⌘P on a Mac). The menus, buttons and cartoons are left off the printout.' :
      'Yes. Guides and chapters have a Print this page button at the bottom, next to Share. On a computer, your browser’s own Print works too (Ctrl+P, or ⌘P on a Mac). The menus, buttons and cartoons are left off the printout. Which page would you like?' }];
    if (u && PRINT_SHORT.test(u)) b.push({ k: 'p', x: 'That page also has a Print a short version button near the top, with just the main points and the words to use.' });
    if (u) b.push({ k: 'links', x: [[t || 'The page', u]] });
    return { blocks: b, chips: [], kind: 'care', id: 'print' };
  }
  // A follow-up while we're on a topic: words to say, one small thing to do, how to print it, where it comes from, or
  // the part of the topic's page that fits what was just said. Null when it's really a new question.
  function topicFollow(state, f, q, TC, TR) {
    var n = f.split(' ').length, T = state.topic && state.topic.id === TC.id ? state.topic : null;
    var c = sideOf(TC, f, T && T.side), pg = topicPage(TC), pgT = pg && pageTitle(pg), v = T ? (T.v || 0) + 1 : 1;
    function done(r) { if (T) T.v = v; state.topic = state.topic && state.topic.id === TC.id ? Object.assign(state.topic, { turn: state.turn || 0 }) : { id: TC.id, turn: state.turn || 0, root: (TR || TC).id, v: v }; state.care = { id: TC.id, turn: state.turn || 0, f: f }; state.last = { kind: 'card', card: TC.id, q: TC.name, topic: TC.name, u: pg }; r.kind = r.kind || 'care'; r.id = r.id || TC.id; return r; }
    var scripts = (Array.isArray(c.script) ? c.script : c.script ? [c.script] : []);
    var link = pg ? [[pgT || TC.name, pg]] : safeLinks(TC.links).slice(0, 1);
    if (TF_PRINT.test(f)) return printReply(state, f, TC);
    if (TF_SOURCE.test(f) && n <= 16) {
      return done({ blocks: [{ k: 'p', x: 'Yes. Every source this site uses is listed, with what it found in plain words, on The research behind this site.' + (pg ? ' The page on ' + (pgT || TC.name) + ' links its own sources at the bottom, under “More.”' : '') },
        { k: 'links', x: [['The research behind this site', '/research.html']].concat(pg ? [[pgT || TC.name, pg + '#more']] : []) }], chips: [] });
    }
    // only for a message that doesn't start a new story ("my brother got dad's house in the will" is its own topic)
    var sit = detectSituation(f);
    var fresh = /\b(after i (asked|told) (him|her|them) to stop|at all hours|wont leave me alone|won t leave me alone|keeps (turning|showing) up)\b/.test(f) || (sit.score >= 5 && sit.who && sit.who !== 'self' && sit.who !== 'other' && n > 8) || (matchCard(f) && (matchCard(f).kind === 'tool')) || /^(what|whats|who) (is|are|does) (a |an |the )?\w+( \w+)?( mean)?$/.test(f);
    if (TF_SAY.test(f) && n <= 16 && scripts.length && !fresh) {
      var sb = [{ k: 'p', x: c.sayLead || ('Here are some words you could use. Change any of them so they sound like you.') }];
      scripts.forEach(function (x, i) { sb.push({ k: 'script', l: (c.scriptLabels && c.scriptLabels[i]) || (i ? 'Or' : 'Words you could use'), x: x }); });
      if (c.sayMore) sb.push({ k: 'p', x: c.sayMore });
      sb.push({ k: 'links', x: c.sayLink ? safeLinks([c.sayLink]) : link });
      return done({ blocks: sb, chips: [{ label: 'One small thing to do', q: 'What can I do this week, something simple?' }] });
    }
    if (TF_DO.test(f) && n <= 16 && c.how && c.how.length && !fresh) {
      var step = c.how[(v - 1) % c.how.length];
      var db = [{ k: 'p', x: 'One small thing, this week: ' + lc1(step) }];
      if (scripts.length) db.push({ k: 'script', l: (c.scriptLabels && c.scriptLabels[0]) || 'Words you could use', x: scripts[(v - 1) % scripts.length] });
      db.push({ k: 'p', x: 'That’s plenty for one week. Small and done beats big and planned.' });
      db.push({ k: 'links', x: link });
      return done({ blocks: db, chips: [{ label: 'Another small thing', q: 'Something else simple we can do this week' }] });
    }
    if (fresh || n > 16) return null;
    // the part of the topic's page that fits what was just said
    var pages = [pg].concat(TR && TR.id !== TC.id ? [topicPage(TR)] : []).concat(c.alsoPages || []).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
    if (pages.length) {
      var res = search(q), qt = (res.base || []).filter(function (t, j, a) { return a.indexOf(t) === j && !ROLE[t] && !STOP[t]; });
      var hits = res.hits.filter(function (h) { var d = KB.docs[h.i], u = d.u.split('#')[0]; return !d.tip && !d.g && pages.indexOf(u) !== -1 && d.u !== u + '#main' && d.u !== u + '#more'; });
      var top = hits[0], g0 = res.hits.filter(function (h) { return !KB.docs[h.i].tip; })[0];
      // a question that another page answers much better is a new question, not a follow-up ("Staying with …" would be stale)
      var elsewhere = top && g0 && pages.indexOf(KB.docs[g0.i].u.split('#')[0]) === -1 && g0.s >= top.s * 1.5 && g0.cov >= top.cov;
      if (top && qt.length && top.cov >= 0.3 && top.s >= 1.0 && !elsewhere) {
        var pb = passageBlock(top.i, res.terms);
        var fl0 = TF_FEEL.test(f) ? (c.fuFeel || 'That makes sense, and a lot of people in your spot feel the same.') + ' ' : '';
        return done({ blocks: [{ k: 'p', x: fl0 + 'Staying with ' + (pgT || TC.name) + ', this part fits:' }, pb], chips: [{ label: 'What could I say?', q: 'What do I actually say?' }] });
      }
    }
    if (TF_FEEL.test(f) && n <= 12) {
      var fb = [{ k: 'p', x: (c.fuFeel || 'That makes sense. Feeling like that is common, and it isn’t a sign you’re doing it wrong.') }];
      var st2 = c.how && c.how.length ? c.how[v % c.how.length] : '';
      if (st2) fb.push({ k: 'p', x: 'One thing that often helps: ' + lc1(st2) });
      if (scripts.length) fb.push({ k: 'script', l: (c.scriptLabels && c.scriptLabels[v % scripts.length]) || 'Words you could use', x: scripts[v % scripts.length] });
      fb.push({ k: 'links', x: link });
      return done({ blocks: fb, chips: [{ label: 'What could I say?', q: 'What do I actually say?' }] });
    }
    return null;
  }
  function careFirst(state, q) {
    var f = norm(q);
    state.prevF = state.curF; state.curF = f;
    if (!f || DANGER.test(f)) return null;
    var ub = unBrief(state, f);
    if (ub) return ub;
    if (EASY_ASK.test(f)) {
      // "what is ADHD in children, in plain words": answer the question, simply; "please use simple English" on its own: switch modes
      var rest0 = f.replace(EASY_ASK, ' ').replace(/\b(in|with|using|use|please|pls|can|could|would|you|say|it|that|this|explain|tell|me|more|a|bit|little|some|and|but|so|just|very|really|speak|talk|write|answer|answers|to|i|my|is|isnt|not|no|good|great|strong|english|language|second|first|keep|from|now|on|the|your)\b/g, ' ').replace(/\s+/g, ' ').trim();
      if (!rest0 || rest0.split(' ').filter(function (w) { return w.length > 2; }).length < 2) return easyWords(state);
      state.easy = 1; state.brief = 1;
      f = f.replace(EASY_ASK, ' ').replace(/\s+/g, ' ').trim(); n = f.split(' ').length;
    }
    if (SHORTER.test(f)) return shorter(state);
    if (LEFT_OFF.test(f)) return leftOff(state);
    var L = state.last, n = f.split(' ').length;
    // after the long-distance answer, "how do I bring it up without nagging?" or "how do I make her stop being mad?"
    // stays about calls and distance, not chores
    // (but "she texts 'fine' and I never know if she is mad" is a new question, about short texts: puddles16)
    if (L && (L.card === 'longdistance' || (L.kind === 'sit' && L.issue === 'longdistance')) && /\b(bring (it|this) up|nag\w*|stop being (mad|upset|angry)|make (her|him|them) (stop|less)|(she|he|they) (s|is|are) (mad|upset|angry)|without (sounding|starting))\b/.test(f) &&
      !/\b(fine|ok|okay|k|one word|short (text|texts|reply|replies)|time ?zones?|time difference)\b/.test(f)) {
      var ld = cardById('longdistance');
      return { blocks: [{ k: 'p', x: 'Keep it about the rhythm, not the scorecard: one example, how it felt, and one ask for a plan you both choose.' },
        { k: 'list', x: ['If you usually reach out: “I’ve been the one starting most of our calls, and I miss feeling chosen. Can we agree a rhythm, so it isn’t always on me?”',
          'If you call less: “I know you’ve been reaching out more. Work is heavy right now, and it isn’t about you. Can we pick our call days together, and I’ll start the Sunday one?”',
          'Answer the person as well as the plan: if they asked “are we still on tonight?” answer that first.'] },
        { k: 'links', x: safeLinks((ld && ld.links) || []).slice(0, 2) }], chips: [], kind: 'care', id: 'longdistance' };
    }
    // a short follow-up while we're on a topic ("i do all the meetings and paperwork" after fostering, "how do i get a say"
    // after a co-parent answer, "what do i actually text her" after a friendship one) stays with that topic: a card names,
    // in "follow", the card that answers a follow-up's words, and a vague follow-up is answered from the topic's own page
    var TC = n <= 22 && !state.unsafe ? topicCard(state) : null, TR = TC ? topicRoot(state) : null;
    // which care card would answer this on its own? A word that only hints at another topic ("christening" in a talk
    // about a brother, "will" about a parent who died) doesn't pull us off the topic we're on
    var cm = null, fNot = f.replace(/\bnot an? (teen|teenager|kid|child)\b/g, ' ');
    for (var i = 0; i < (IDX.first || []).length; i++) {
      var c0 = IDX.first[i];
      if (!c0.re.test(f) || (c0.notRe && c0.notRe.test(fNot))) continue;
      if (c0.id === 'nextstep' && L && L.kind === 'sit') continue;   // "what next?" after a playbook: its own next step
      if (c0.id === 'fault' && n > 18) continue;
      if (TC && c0.id !== TC.id && (!TR || c0.id !== TR.id) && c0.weak && n <= 18) {
        var wre = null; try { wre = new RegExp(c0.weak, 'g'); } catch (e) { wre = null; }
        if (wre && !c0.re.test(f.replace(wre, ' ').replace(/\s+/g, ' '))) continue;
      }
      cm = c0; break;
    }
    // a young person speaking (on the teens page, or "i'm 15", "my carers", "i'm in foster care"): their side, never the carers'
    if (TEEN_CUE.test(f) || (state.page && state.page.u === '/teens.html')) state.teen = true;
    if (/\b(i m|im|i am) (an adult|a grown ?up|[2-9]\d)\b|\bnot a (teen|teenager|kid|child)\b|\b(my|our) (foster|kinship) (son|daughter|child|kid|teen|grandson|granddaughter)\b|\bwe (foster|are fostering|re fostering)\b/.test(f)) state.teen = false;
    if (cm && state.teen && cm.teenAlt && cardByIdF(cm.teenAlt)) cm = cardByIdF(cm.teenAlt);
    // anything that might be about harm or control, or a card that answers those, is never bent to fit the topic
    var risky = VERBAL.test(f) || SELF_HARMFUL.test(f) || NOT_LIVE.test(f) || HARD.test(f.replace(/\b(scared|afraid|frightened|terrified)\b/g, ' ').replace(/\b(i m|im|i am|i feel|feel|feeling|felt|was|so|really|very|a bit)( so| really| very)? hurt\b|\bhurt (my |her |his |their )?feelings\b/g, ' ')) || CONTROL.test(f.replace(/\bcontrolling\b/g, ' '));
    // and a card about the chat itself or a feeling (bigger text, "is it my fault?") answers as usual, keeping the topic
    // a young person (said once: "im 17", on the teens page) talking about their parents: the teen's side, never the
    // adult-child or kinship answer, for the rest of the chat (reports17)
    var PAR_T = /\b(parents?|mum|mom|dad|mother|father|stepmum|stepmom|stepdad|folks)\b/, GP_T = /\b(nan|nana|nanna|gran|granny|grandma|grandmother|grandad|granddad|grandpa|grandparents?|carers?|foster|aunt|auntie|uncle)\b/;
    var teenCtx = state.care && /^teen/.test(state.care.id || '') && (state.turn || 0) - state.care.turn <= 3;
    if (state.teen && !risky && !(cm && cm.safety) && !GP_T.test(f) && (PAR_T.test(f) || (teenCtx && /\b(they|them|am i right|who is right|whos right|adult|fair)\b/.test(f))) && (!cm || /^(teenhouse|teennotgetme|teens|selfworry|teenparents|teentalking)$/.test(cm.id))) {
      var ttid = /\b(talk|say|tell|screaming|shouting|yelling|without it turning|argu\w*|fight\w*)\b/.test(f) ? 'teentalking' : (/\b(phone|mobile|ipad|tablet|laptop)\b/.test(f) && /\b(take|takes|took|taking|confiscat\w*)\b/.test(f)) ? 'teenphonetaken' : 'teenparents';
      cm = cardByIdF(ttid) || cm;
    }
    if (risky || (cm && (cm.safety || !cm.newTopic))) TC = TR = null;
    // a short follow-up while we're on a topic ("i do all the meetings and paperwork" after fostering, "how do i get a say"
    // after a co-parent answer, "what do i actually text her" after a friendship one) stays with that topic: a card names,
    // in "follow", the card that answers a follow-up's words, and a vague follow-up is answered from the topic's own page
    var roots = TC ? [TC].concat(TR && TR.id !== TC.id ? [TR] : []) : [];
    for (var ri = 0; ri < roots.length; ri++) {
      var fl = roots[ri].follow || [];
      for (var fi = 0; fi < fl.length; fi++) {
        var fre = null; try { fre = new RegExp(fl[fi][0]); } catch (e) { fre = null; }
        var tcard = fre && fre.test(f) && cardById(fl[fi][1]);
        if (tcard && state.teen && tcard.teenAlt && cardById(tcard.teenAlt)) tcard = cardById(tcard.teenAlt);
        if (tcard) {
          var side0 = state.topic && state.topic.side != null && (state.topic.id === tcard.id || state.topic.root === tcard.id) ? state.topic.side : null;
          var rf = cardReply(state, tcard, 'about', side0); rf.kind = 'care';
          state.care = { id: tcard.id, turn: state.turn || 0, f: f, root: (TR || TC).id };
          setTopic(state, tcard, (TR || TC).id, rf.side);
          return rf;
        }
      }
    }
    if (TC && !cm) { var tfu = topicFollow(state, f, q, TC, TR); if (tfu) return tfu; }
    if (cm) {
      var c = cm;
      var r = cardReply(state, c, 'about');
      if (state.unsafe && c.childSafe) r.blocks.unshift({ k: 'p', x: 'I can still help with things about ' + (state.kidName || 'your child') + '.' });
      // anger: the honest line between losing your temper and abuse, right after the first line
      if (c.id === 'angerstop' || c.id === 'angerhelp') r.blocks.splice(1, 0, { k: 'p', x: 'The honest line: losing your temper now and then, followed by a real repair, isn’t the same as abuse. It becomes a safety issue if people at home are afraid of you, if it comes with threats, name-calling, breaking or throwing things, or if it happens most days.' });
      // supplements: never a dose, and never “stop your medicine”
      if (/^herb/.test(c.id)) {
        if (DOSE_Q.test(f)) r.blocks = [{ k: 'p', x: 'I can’t give doses. A pharmacist can tell you what’s safe with what you already take, and so can your doctor.' }].concat(r.blocks.filter(function (b) { return b.k === 'links'; }));
        if (MEDS_W.test(f)) {
          var mx = HERB_SSRI[c.id] || 'Some herbs and supplements change how prescribed medicines work, so check this one with a pharmacist first.';
          var li = -1; r.blocks.forEach(function (b, bi) { if (b.k === 'links' && li < 0) li = bi; });
          var add = [{ k: 'p', x: mx }, { k: 'p', x: (/\b(better than|instead of|rather than|replace|swap|switch|come off|stop (taking )?my)\b/.test(f) ? 'There’s no good evidence that a supplement works better than prescribed medicine. ' : '') + 'Never stop, swap or change a prescribed medicine without talking to your prescriber, and ask a pharmacist before adding anything to it. Some medicines need to be reduced slowly.' }];
          if (li < 0) r.blocks = r.blocks.concat(add); else r.blocks.splice.apply(r.blocks, [li, 0].concat(add));
        }
      }
      if (c.id === 'fault') {
        var H = IDX.sit.issues.hurtbythem;
        var hurt = (L && L.kind === 'sit' && L.issue === 'hurtbythem') || (H && H.res.some(function (x) { return x[1] >= 5 && x[0].test(f); }));
        if (hurt && c.what_hurt) {
          r.blocks = [{ k: 'p', x: c.what_hurt[0] }, { k: 'list', x: c.how_hurt }].concat(r.blocks.filter(function (b) { return b.k === 'note' || b.k === 'links'; }));
        }
      }
      r.kind = 'care';
      state.care = { id: c.id, turn: state.turn || 0, f: f };
      if (CV_PERSONAL[c.id] && c.newTopic) setTopic(state, c, c.id, r.side);
      if (c.id === 'brief') state.brief = 1;
      // a question about the chat or a feeling keeps the topic we were on; a new topic (a meltdown, "I have ADHD") takes over
      if (!c.newTopic) state.last = L || state.last;
      return r;
    }
    // "how do I print the page about ADHD", "can I print this out": how to print, for the page we're on
    if (TF_PRINT.test(f) && n <= 16) return printReply(state, f, TC);
    // "who came up with that, is there a source I can cite?": the source behind what we just talked about
    if (TF_SOURCE.test(f) && n <= 18 && (state.last || state.lastQ) && /\b(that|this|it|cite|source|sources)\b/.test(f)) return sourceReply(state);
    return null;
  }
  // ---------- The logic behind it (KB.logic, from assets/js/logic-library.js; puddles16): "Why did my coworker say I
  // embarrassed my manager? I only corrected a wrong number on his slide", "my mother asked if I liked the sweater she
  // gave me, I said no…". The matching card in full, both sides, and its research when it leans on one.
  var LOGIC_CUE = /\b(why (did|does|do|would|was|were|is|are|has|have|might|could|cant|wont|didnt|doesnt|isnt) |whats the logic|what is the logic|logic (behind|of)|the reason (he|she|they|people)|react(ed|s|ing|ion)? (like|that|so|badly|that way)|(get|got|gets|getting|was|is) (so |really |very )?(upset|angry|mad|hurt|annoyed|offended|weird|cross)|took it (badly|personally|the wrong way)|takes it (badly|personally)|offended|embarrass\w*|(is|was) (it|that|i) (rude|wrong|weird|odd))/;
  var LOGIC_CANON = { corrected: 'correct', correcting: 'correct', corrects: 'correct', correction: 'correct', corrections: 'correct', correct: 'correct',
    gift: 'present', gifts: 'present', gave: 'present', given: 'present', present: 'present', presents: 'present', unwraps: 'present', unwrapped: 'present',
    sweater: 'jumper', sweaters: 'jumper', jumper: 'jumper', jumpers: 'jumper', cardigan: 'jumper', scarf: 'jumper',
    honest: 'honest', honesty: 'honest', truth: 'honest', truthful: 'honest', truthfully: 'honest', untruth: 'lie', lie: 'lie', lied: 'lie', lies: 'lie', lying: 'lie',
    coworker: 'colleague', coworkers: 'colleague', colleague: 'colleague', colleagues: 'colleague', workmate: 'colleague',
    boss: 'manager', manager: 'manager', managers: 'manager', supervisor: 'manager', mistake: 'mistake', mistakes: 'mistake', error: 'mistake',
    errors: 'mistake', typo: 'mistake', wrong: 'mistake', meeting: 'meeting', meetings: 'meeting', public: 'public', publicly: 'public',
    embarrassed: 'embarrass', embarrass: 'embarrass', embarrassing: 'embarrass', humiliated: 'embarrass', silly: 'embarrass' };
  var LOGIC_GENERIC = /^(why|react|reacted|reaction|reacts|upset|say|said|says|did|does|do|like|liked|likes|logic|behind|reason|happen|happened|really|now|just|only|then|ask|asked|asks|think|thought|mean|means|get|got|gets|was|were|make|made|so|very|act|acted|way|thing|things|something|someone|people|person|one|time|still|even|tell|told|other|after|before)$/;
  var LOGIC_IX = null;
  function logicCanon(w) { return LOGIC_CANON[w] || stem(w); }
  function logicIndex() {
    if (LOGIC_IX || !KB || !KB.logic) return LOGIC_IX;
    var df = {}, items = KB.logic.map(function (it) {
      var w = {};
      function add(text, wt) { words(text).forEach(function (x) { if (STOP[x] || LOGIC_GENERIC.test(x)) return; var c = logicCanon(x); if ((w[c] || 0) < wt) w[c] = wt; }); }
      add(it.chain.join(' ') + ' ' + it.fits + ' ' + it.other + ' ' + it.say + ' ' + it.step + ' ' + it.an, 0.7);
      add(it.looks + ' ' + (it.care || ''), 1.5);
      add(it.s.join(' '), 2.5);
      add(it.t, 3);
      Object.keys(w).forEach(function (c) { df[c] = (df[c] || 0) + 1; });
      return { it: it, w: w };
    });
    LOGIC_IX = { items: items, df: df, n: items.length };
    return LOGIC_IX;
  }
  function logicMatch(q, min) {
    var X = logicIndex(); if (!X) return null;
    var qs = {}; words(q).forEach(function (x) { if (!STOP[x] && !LOGIC_GENERIC.test(x)) qs[logicCanon(x)] = 1; });
    var qt = Object.keys(qs); if (!qt.length) return null;
    var scored = X.items.map(function (o) {
      var s = 0, hits = 0;
      qt.forEach(function (c) { if (o.w[c]) { s += o.w[c] * Math.log(1 + X.n / X.df[c]) * (ROLE[c] ? 0.3 : 1); hits++; } });
      return { o: o, s: s, hits: hits };
    }).sort(function (a, b2) { return b2.s - a.s; });
    var top = scored[0];
    if (!top || top.s < (min || 7) || top.hits < 2 || (scored[1] && scored[1].s > top.s * 0.85)) return null;
    // "she says she'll do things and then forgets": no card here is about forgetting, so it isn't this one
    if (/\b(forget|forgets|forgot|forgetting|forgetful)\b/.test(fold(q)) && !/forget/i.test(JSON.stringify(top.o.it))) return null;
    return top.o.it;
  }
  function logicReply(state, it, lead) {
    var b = [{ k: 'p', x: lead || 'There’s a logic to that reaction, and it runs both ways. Here’s how The Logic Behind It explains it:' }, { k: 'h', x: it.t }];
    b.push({ k: 'p', x: 'What it looks like from outside: ' + it.looks });
    b.push({ k: 'p', x: 'The logic behind it:' });
    b.push({ k: 'list', x: it.chain });
    if (it.an) b.push({ k: 'p', x: 'It works like this: ' + lc1(it.an) });
    b.push({ k: 'p', x: 'Why the reaction fits: ' + it.fits });
    b.push({ k: 'p', x: 'The other side: ' + it.other });
    b.push({ k: 'script', l: 'One sentence to explain it', x: it.say });
    b.push({ k: 'p', x: 'One small step: ' + it.step });
    if (it.care) b.push({ k: 'note', x: 'With care: ' + it.care });
    if (it.refs && it.refs.length) b.push({ k: 'note', x: 'Research it leans on: ' + it.refs.map(function (r) { return r[0] + ', ' + r[1].toLowerCase(); }).join('; ') + '.' });
    b.push({ k: 'links', x: [['The logic behind it: ' + it.t, '/the-logic-behind-it.html#l-' + it.id]].concat((it.refs || []).slice(0, 1).map(function (r) { return [r[0] + ' (the research behind this site)', r[2]]; })) });
    state.last = { kind: 'logic', logic: it.id, q: it.t, topic: it.t, u: '/the-logic-behind-it.html#l-' + it.id };
    return { blocks: b, chips: [{ label: 'Is there research on this?', q: 'Is there research on this?' }, { label: 'What could I say?', q: 'What could I say?' }], kind: 'logic', id: it.id };
  }
  function logicById(id) { return (KB.logic || []).filter(function (x) { return x.id === id; })[0] || null; }
  // a follow-up after a Logic card stays with that card: research, what to say, an example
  function logicFollow(state, f) {
    var L = state.last, it = L && L.kind === 'logic' && logicById(L.logic);
    if (!it || f.split(' ').length > 16) return null;
    if (TF_SOURCE.test(f) || /\b(guess|guessing|made up|making (this|it) up|proof|science)\b/.test(f)) {
      var b = [];
      if (it.refs && it.refs.length) {
        b.push({ k: 'p', x: 'Not a guess. This card leans on research, named on The research behind this site with an honest label for how strong it is:' });
        b.push({ k: 'list', x: it.refs.map(function (r) { return r[0] + ' (' + r[1].toLowerCase() + ')' + (r[3] ? ': ' + r[3] : '.'); }) });
        b.push({ k: 'links', x: it.refs.map(function (r) { return [r[0], r[2]]; }).concat([['The research behind this site', '/research.html']]) });
      } else {
        b.push({ k: 'p', x: 'This card doesn’t lean on one particular study. The Logic Behind It cards explain everyday reasoning in plain words, and where a card does rest on research, it names it and says how strong it is. Every source the site uses is on The research behind this site.' });
        b.push({ k: 'links', x: [['The logic behind it: ' + it.t, '/the-logic-behind-it.html#l-' + it.id], ['The research behind this site', '/research.html']] });
      }
      return { blocks: b, chips: [{ label: 'What could I say?', q: 'What could I say?' }], kind: 'logic', id: it.id + '-research' };
    }
    if (TF_SAY.test(f) || FU_EX.test(f) || /^(what (could|can|should) i say|words)\b/.test(f)) {
      return { blocks: [{ k: 'p', x: 'One sentence that explains it, from the card:' }, { k: 'script', l: 'Words you could use', x: it.say }, { k: 'p', x: 'And one small step that helps both of you: ' + lc1(it.step) }, { k: 'links', x: [['The logic behind it: ' + it.t, '/the-logic-behind-it.html#l-' + it.id]] }],
        chips: [{ label: 'Is there research on this?', q: 'Is there research on this?' }], kind: 'logic', id: it.id + '-say' };
    }
    return null;
  }

  // ---------- "what does the research say about contempt in couples?": the Library's research summary for that topic
  // and the studies behind it, each with the evidence label shown on The research behind this site (puddles16)
  var RESEARCH_Q = /^(?:so |and |ok |okay |hi |hey )?(?:what|whats|what s) (?:does|do|is|did) (?:the )?(?:research|science|evidence|studies|study|data)(?: really| actually)? (?:say|show|tell(?: us)?|find|found|says|shows|suggest)(?: us)? (?:about|on|regarding|for)\s+(.+)$|^(?:is there|are there|any|got any) (?:good )?(?:research|studies|evidence|science) (?:on|about|into|for|behind)\s+(.+)$|^(?:research|studies|evidence) (?:on|about)\s+(.+)$/;
  function researchReply(state, f) {
    var m = RESEARCH_Q.exec(f); if (!m) return null;
    var topic = (m[1] || m[2] || m[3] || '').replace(/\b(in|between|for|among) (couples|relationships?|partners|marriages?|families|people)\b/g, ' ').replace(/\s+/g, ' ').trim();
    if (!topic || /^(this|that|it|these|those|any of this|all this|the site|this site|what you said|what you just said)\b/.test(topic) || topic.split(' ').length > 8) return null;
    var res = search(topic), tt = tokens(topic).filter(function (t) { return !ROLE[t]; });
    if (!tt.length) return null;
    var lib = null, refs = [];
    res.hits.forEach(function (h) {
      var d = KB.docs[h.i];
      if (!lib && /what the research says/i.test(d.h) && h.cov >= 0.6) lib = h;
      if (/^\/research\.html#ref-/.test(d.u) && h.cov >= 0.6 && refs.length < 2) refs.push(h);
    });
    if (lib) {
      // the studies behind that Library entry: the reference list names where each one shows up on the site
      var head = KB.docs[lib.i].h.split(':')[0].trim(), behind = [];
      KB.docs.forEach(function (d, i) { if (behind.length < 2 && /^\/research\.html#ref-/.test(d.u) && d.x.indexOf(head) !== -1) behind.push({ i: i }); });
      if (behind.length) refs = behind.concat(refs.filter(function (h) { return !behind.some(function (x) { return x.i === h.i; }); })).slice(0, 2);
    }
    if (!lib && !refs.length) return null;
    var b = [{ k: 'p', x: 'Here’s what the research says about ' + topic + ', as the site sums it up, with how strong each source is:' }];
    if (lib) b.push(passageBlock(lib.i, res.terms));
    refs.forEach(function (h) { b.push(passageBlock(h.i, res.terms)); });
    var lk = [['The research behind this site: every source, with its evidence label', '/research.html']];
    if (lib) lk.push([pageName(KB.docs[lib.i].h.split(':')[0]) + ' (the Library)', KB.docs[lib.i].u]);
    b.push({ k: 'links', x: lk });
    state.last = { kind: 'search', q: topic, res: { hits: res.hits, terms: res.terms }, shown: {} };
    if (lib) state.last.shown[lib.i] = 1;
    return { blocks: b, chips: [{ label: 'What are the evidence labels?', q: 'What do the evidence labels on the research page mean?' }], kind: 'research', id: 'research' };
  }

  // ---------- "mom" or "mum": the scripts use the word the person used
  function momMum(state, q, r) {
    var f = norm(q), mom = /\b(mom|moms|mommy|momma)\b/.test(f), mum = /\b(mum|mums|mummy|mam)\b/.test(f);
    if (mom !== mum) state.momWord = mom ? 'mom' : 'mum';  // remembered for the rest of the chat
    else if (state.momWord) { mom = state.momWord === 'mom'; mum = !mom; }
    if (!r || !r.blocks || mom === mum) return r;
    var sw = mom ? function (t) { return String(t).replace(/\bMum\b/g, 'Mom').replace(/\bmum\b/g, 'mom').replace(/\bMummy\b/g, 'Mommy'); } : function (t) { return String(t).replace(/\bMom\b/g, 'Mum').replace(/\bmom\b/g, 'mum').replace(/\bMommy\b/g, 'Mummy'); };
    r.blocks.forEach(function (b) { if (b.k === 'script' || b.k === 'p' || b.k === 'note') b.x = sw(b.x); else if (b.k === 'list') b.x = b.x.map(sw); });
    return r;
  }
  // ---------- someone asking about a client (a counsellor, a coach) gets an answer for them, with every safety line kept
  var PRO_ASKER = /\b(my|a|our) (clients?|patients?|counsell?ees?|service users?|mentees?|caseload)\b|\b(i m|im|i am|as) (a |an )?(couples |family |marriage |licensed |school |relationship )?(therapist|counsell?or|coach|social worker|psychologist|mediator|clinician|caseworker|case worker)\b/;
  function proReply(q, r) {
    var f = norm(q);
    if (!r || !r.blocks || !/^(safety|redflag)$/.test(r.kind || '') || !PRO_ASKER.test(f)) return r;
    var asksTools = /\b(tools?|chore|chores|lemonade|workpapers?|chart|app|this site|the site|exercises?|homework|worksheets?|assign|use (this|these|it))\b/.test(f);
    var lead = [{ k: 'p', x: (asksTools ? 'No. ' : '') + 'What you describe sounds like control, and the shared tools here aren’t for relationships with control. If you suspect coercive control or violence in a couple you see, please do not assign the shared tools. A shared chore list or pause plan can become one more thing to be checked on.' },
      { k: 'p', x: 'Here is what I’d say to your client, if they asked me themselves:' }];
    r.blocks = lead.concat(r.blocks);
    var lb = r.blocks.filter(function (x) { return x.k === 'links'; })[0];
    var pro = [['For counselors, coaches and group leaders', '/for-counselors.html']];
    if (lb) { if (!lb.x.some(function (l) { return l[1] === pro[0][1]; })) lb.x = pro.concat(lb.x); } else r.blocks.push({ k: 'links', x: pro });
    return r;
  }

  function sourceReply(state) {
    var lq = (state.last && state.last.q) || state.lastQ || '', b = [], links = [];
    var lgf = state.last && state.last.kind === 'logic' && logicFollow(state, 'is there research on this');
    if (lgf) return lgf;
    var refs = lq ? search(lq).hits.filter(function (h) { return /^\/research\.html#ref-/.test(KB.docs[h.i].u); }) : [];
    var top = refs[0] && refs[0].cov >= 0.3 ? refs.filter(function (h) { return h.s >= refs[0].s * 0.7; }).slice(0, 2) : [];
    if (top.length) {
      b.push({ k: 'p', x: 'Yes. Here’s the research behind that, with what it found in plain words:' });
      top.forEach(function (h) { b.push(passageBlock(h.i, search(lq).terms)); });
    } else b.push({ k: 'p', x: 'Every source the site uses is listed, with what it found in plain words, on The research behind this site. You can search it by name or topic.' });
    var pu = state.last && state.last.u && !/^\/research\.html/.test(state.last.u) ? state.last.u.split('#')[0] : '';
    if (pu) b.push({ k: 'p', x: 'The page that answer came from also names its sources at the bottom.' });
    links.push(['The research behind this site', '/research.html']);
    if (pu) links.push([pageTitle(pu) || 'The page it came from', pu + '#more']);
    b.push({ k: 'links', x: links });
    return { blocks: b, chips: [], kind: 'care', id: 'source' };
  }
  function unclearReply() {
    return { blocks: [{ k: 'p', x: 'I didn’t catch that. Could you say it another way? A few words is plenty, like “chores” or “my partner snapped at me.”' }], chips: STARTERS, kind: 'unclear' };
  }
  // "What exactly does 'static' mean? Give a definition, not an example." → static, with no example
  function termQuery(q) {
    var parts = String(q).split(/(?<=[.?!])\s+/), noEx = /\b(not|no|without|skip) (an |any |the )?examples?\b|\bdefinition only\b|\bjust (the|a) definition\b/.test(fold(q));
    for (var i = 0; i < parts.length; i++) {
      var f = norm(parts[i]).replace(/\b(exactly|actually|really|precisely|literally|please|plainly|simply)\b/g, ' ')
        .replace(/\b(on|in) (this|the) (site|website|program|page|chat)$|\bhere$/g, ' ').replace(/\b(in|using|with) (plain|simple|easy|everyday|simpler|plainer) (words|english|terms|language)$/g, ' ').replace(/\s+/g, ' ').trim();
      var m = f.match(/^(?:so |ok |okay |and )?(?:what|whats|wat) (?:is|are|does|do|s) (?:a |an |the )?(?:word |term |idea )?(.+?)(?: mean| means| stand for| refer to)?(?: on this site| here)?$/) ||
              f.match(/^(?:what do you mean by|what does the site mean by|what is meant by|define|definition of|meaning of|explain|give me a definition of|give a definition of|whats the definition of|what is the definition of|what s the definition of) (?:a |an |the )?(?:word |term )?(.+)$/) ||
              f.match(/^(.+?) (?:meaning|definition|means what)$/);
      if (m) return { target: m[1].replace(/ (thing|bit|stuff|concept|idea)$/, '').trim(), noEx: noEx };
    }
    return null;
  }
  function termFor(target) { var k = termKey(target), e = IDX.terms[k]; return e ? { t: KB.terms[e.i], own: e.own } : null; }
  function termReply(state, t, noEx) {
    var b = [{ k: 'p', x: t.d }];
    if (t.list && t.list.length) b.push({ k: 'list', x: t.list });
    if (t.e && !noEx) b.push({ k: 'p', x: 'For example: ' + t.e });
    var links = (t.g ? [['Glossary: ' + t.t, '/glossary.html#' + t.id]] : []).concat(t.links || []);
    b.push({ k: 'links', x: safeLinks(links).slice(0, 3) });
    state.last = { kind: 'term', q: t.t, topic: '“' + t.t + '”' };
    return { blocks: b, chips: [{ label: 'Tell me more', q: 'Tell me more about ' + t.t }, t.id === 'static' ? { label: 'What does “lens” mean?', q: 'What does lens mean?' } : { label: 'What does “static” mean?', q: 'What does static mean?' }], kind: 'term', id: t.id };
  }
  // "what does 'read the room' mean?", "why do people say 'break a leg'?": the saying, explained literally
  var MEANQ = /\b(what (does|do|did|is|s) .{0,40}\bmean|what .{0,20}\bmeans?\b|whats .{0,40}\bmean|meaning of|what is meant by|what do (people|they|you|he|she) mean|why (do|does|did|would|will) (people|someone|they|he|she|you|everyone|anyone) (say|said|use)|what s the meaning|is that an? (idiom|expression|saying)|is it an? (idiom|expression|saying)|idiom|expression|figure of speech|literally)\b/;
  function idiomQuery(f) {
    if (!MEANQ.test(f)) return null;
    var fw = ' ' + f + ' ';
    for (var i = 0; i < IDX.idioms.length; i++) if (fw.indexOf(IDX.idioms[i].p) !== -1) return KB.idioms[IDX.idioms[i].i];
    return null;
  }
  function idiomReply(state, x) {
    var name = x.p[0].replace(/\bwell see\b/, 'we’ll see').replace(/\bits\b/, 'it’s').replace(/\blets\b/, 'let’s').replace(/\bim\b/, 'I’m');
    var Name = '“' + name.charAt(0).toUpperCase() + name.slice(1) + '”';
    var b = [{ k: 'p', x: Name + ' is a saying: the words don’t mean exactly what they say.' + (x.lit ? ' ' + x.lit : '') },
      { k: 'p', x: 'What people usually mean: ' + x.m }];
    if (x.tone) b.push({ k: 'p', x: 'How it usually sounds: ' + x.tone });
    if (x.plain) b.push({ k: 'script', l: 'A plain way to say it', x: x.plain });
    b.push({ k: 'links', x: [['Test how a message may land: the Chat analyzer', '/signal-translator.html'], ['Wired Differently: when words land differently', '/wired-differently.html']] });
    state.last = { kind: 'idiom', q: name, topic: Name };
    return { blocks: b, chips: [{ label: 'Another saying', q: 'What does “we’ll see” mean?' }, { label: 'What does static mean?', q: 'What does static mean?' }], kind: 'idiom', id: x.p[0] };
  }

  // "I think you mean…": said once, above the answer, when a typo was read as another word
  function meant(r, sp) {
    if (!r || !r.blocks || !sp || !sp.fixes.length || r.kind === 'unclear') return r;
    // "whats" for "what's", "im" for "I'm": not worth correcting anyone over
    if (sp.fixes.every(function (x) { return String(x[0]).toLowerCase().replace(/[^a-z0-9]/g, '') === String(x[1]).toLowerCase().replace(/[^a-z0-9]/g, ''); })) return r;
    // chat shorthand ("pls", "u", "thx") is fine as it is: never "I think you mean …" over it (puddles16)
    if (sp.fixes.every(function (x) { return /^(pls|plz|plss|u|ur|thx|ty|tho|cuz|cos|coz|bc|rn|idk|tbh|ngl|lol|ok|k|kk|ya|yea|yeah|gonna|wanna|gotta|dunno|bf|gf|ppl|abt|msg|txt)$/i.test(String(x[0]).replace(/[^a-z]/gi, '')); })) return r;
    var fixed = String(sp.q).replace(/[?!.,\s]+$/, '').trim().replace(/'/g, '’').replace(/\bi\b/g, 'I'), shown = fixed.split(/\s+/).length <= 10 ? fixed : sp.fixes.map(function (x) { return x[1]; }).join(', ');
    r.blocks.unshift({ k: 'p', x: 'I think you mean “' + shown + '”.', mean: 1 });
    return r;
  }

  // Decide what to say to one message. Returns {blocks:[...], chips:[...]} (all data, rendered later),
  // or {needBG:true} when the background notes should be fetched first (reply() then asks again).

  // ---------- the thirteen fields Christian studied, and how any two of them connect (KB.nine, from nine-connections.js
  // and the polymath page): "how does music connect to economics?", "what does finance have to do with relationships?"
  var FIELD_RE = {
    nb: /\b(neurobiology|neuroscience|neurology|nervous system|brain science)\b/, ps: /\bpsycholog(y|ical)\b/, ph: /\bphilosoph(y|ical|er|ers)\b/,
    db: /\b(art of debating|debating|debate|debates)\b/, po: /\b(politics|political)\b/, bs: /\b(behaviou?ral (science|sciences|economics)|behaviou?r science)\b/,
    ec: /\beconomics\b|\beconomy\b|\beconomic\b/, fi: /\b(finance|financial|accounting|bookkeeping)\b/, bu: /\bbusiness\b/, ht: /\bholistic( therapy| therapies| care| health| practice)?\b/,
    la: /\b(laughter( therapy)?|healing power of laughter|humou?r)\b/, mu: /\bmusic(al)?\b/, ar: /\b(aromatherapy|aroma)\b/
  };
  var NINE_LINK = /\b(connect|connects|connected|connection|connections|link|links|linked|relate|relates|related|relation|relationship between|in common|overlap|overlaps|meet|meets|tie|ties|tied|have to do with|has to do with|similar|share|shares|between)\b/;
  var NINE_CUE = /\b(field|fields|christian|christians|study|studied|studies|polymath|subject|subjects|discipline|in the program|this program|this site|why (did|does|is|would)|what does .{0,30} (bring|teach|add)|role of|part of)\b/;
  function nineFields(f) {
    if (!KB.nine) return [];
    var g = f.replace(/\bbehaviou?ral economics\b/g, 'behavioral science'), out = [];
    KB.nine.fields.forEach(function (x) { var m = g.match(FIELD_RE[x[0]]); if (m) out.push([x[0], m.index]); });
    // "behavioral science" is not also economics or science
    out.sort(function (a, b) { return a[1] - b[1]; });
    return out.map(function (x) { return x[0]; });
  }
  function nineQuery(f) {
    var fs = nineFields(f); if (!fs.length) return null;
    // someone talking about their own life ("we debate about money") gets the usual help, not a lecture on the fields
    if (/\b(my|i|im|we|our|me|us)\b/.test(f) && !/\b(field|fields|christian|christians|polymath|studied)\b/.test(f)) return null;
    if (fs.length >= 2 && (NINE_LINK.test(f) || /^(how|what|why|where|is|are|does|do)\b/.test(f))) return { pair: [fs[0], fs[1]] };
    if (fs.length === 1 && (NINE_LINK.test(f) || NINE_CUE.test(f))) return { field: fs[0] };
    return null;
  }
  function nineReply(state, nq) {
    var N = KB.nine, NAME = {}; N.fields.forEach(function (x) { NAME[x[0]] = x[1]; });
    var b = [], chips = [], links = [];
    function pairOf(a, c) { for (var i = 0; i < N.pairs.length; i++) { var p = N.pairs[i]; if ((p[0] === a && p[1] === c) || (p[0] === c && p[1] === a)) return p; } return null; }
    function pil(n) { var x = N.pillars && N.pillars[n]; return x ? [x[0], '/five-pillars.html#' + x[1]] : null; }
    if (nq.pair) {
      var a = nq.pair[0], c = nq.pair[1], p = pairOf(a, c);
      if (!p) return null;
      b.push({ k: 'p', x: NAME[p[0]] + ' and ' + NAME[p[1]] + ' share the root of ' + N.roots[p[2]] + '. It’s one of the ' + String(N.tiers[p[3]]).toLowerCase() + ' connections.' });
      b.push({ k: 'p', x: p[4] });
      var deeps = (N.deep || []).filter(function (d) { return d.fields.indexOf(a) >= 0 && d.fields.indexOf(c) >= 0; });
      if (deeps.length) b.push({ k: 'note', x: 'They also meet with other fields in ' + deeps.slice(0, 3).map(function (d) { return '“' + d.title + '”'; }).join(', ') + '.' });
      if (p[5] && safePath(p[5][1])) links.push([p[5][0], p[5][1]]);
      var pl = pil(p[6]); if (pl) links.push(pl);
      links.push(['See all 78 pairs', '/polymath.html#all-pairs']);
      chips.push({ label: 'More about ' + NAME[a], q: 'How does ' + NAME[a].replace(/^The /, 'the ') + ' connect?' });
      chips.push({ label: 'More about ' + NAME[c], q: 'How does ' + NAME[c].replace(/^The /, 'the ') + ' connect?' });
      chips.push({ label: 'The deepest connections', q: 'What are the deepest connections?' });
      state.last = { kind: 'card', card: 'polymath', q: NAME[a] + ' and ' + NAME[c], topic: NAME[a] + ' and ' + NAME[c], u: '/polymath.html#all-pairs' };
    } else {
      var id = nq.field, inf = (N.info || {})[id] || {};
      b.push({ k: 'p', x: NAME[id] + ', one of the thirteen fields Christian studied: ' + (inf.sum || '') + '.' });
      if (inf.studies) b.push({ k: 'p', x: 'What it studies: ' + inf.studies });
      if (inf.idea) b.push({ k: 'p', x: 'The idea the program borrows: ' + inf.idea });
      var mine = N.pairs.filter(function (p) { return p[0] === id || p[1] === id; }), order = { o: 0, h: 1, a: 2 };
      mine.sort(function (x, y) { return order[x[3]] - order[y[3]]; });
      b.push({ k: 'h', x: 'How it connects to the other twelve' });
      b.push({ k: 'list', x: mine.map(function (p) { var o = p[0] === id ? p[1] : p[0]; return NAME[o] + ' (' + N.roots[p[2]] + ', ' + String(N.tiers[p[3]]).toLowerCase() + '): ' + p[4]; }) });
      var ch = (N.chain || []).filter(function (x) { return x[0] === id || x[1] === id; });
      if (ch.length) b.push({ k: 'note', x: 'In the chain: ' + ch.map(function (x) { return NAME[x[0]] + ' → ' + NAME[x[1]] + ': ' + x[2]; }).join(' ') });
      (inf.links || []).slice(0, 2).forEach(function (l) { if (safePath(l[1])) links.push(l); });
      links.push(['Its chapter on the polymath page', '/polymath.html#field-' + id]);
      var near = mine.filter(function (p) { return p[3] === 'o'; }).slice(0, 2);
      near.forEach(function (p) { var o = p[0] === id ? p[1] : p[0]; chips.push({ label: NAME[id] + ' + ' + NAME[o], q: 'How does ' + NAME[id] + ' connect to ' + NAME[o] + '?' }); });
      chips.push({ label: 'The chain through all thirteen', q: 'Show me how one field leads into the next' });
      state.last = { kind: 'card', card: 'polymath', q: NAME[id], topic: NAME[id], u: '/polymath.html#field-' + id };
    }
    b.push({ k: 'links', x: links.slice(0, 3) });
    return { blocks: b, chips: chips.slice(0, 3), kind: 'card', id: 'polymath' };
  }

  // ---------- good articles: "find me an article about stress", "any good reads on apologies?", "more articles"
  // From the site's hand-picked reading list (KB.read): three at a time, never the same one twice in a chat,
  // and they open on the publisher's own site.
  var ART_RE = /\b(articles?|something (good )?to read|reading list|good reads?|read up on|readings?|blog posts?|further reading|stuff to read|things to read)\b/;
  var ART_OK = /^https:\/\/(www\.)?(psychologytoday\.com|greatergood\.berkeley\.edu|gottman\.com|health\.harvard\.edu|additudemag\.com|chadd\.org|autism\.org\.uk)\//;
  var ART_STOP = /\b(articles?|something|good|great|best|some|any|a|an|the|to|read|reads|reading|readings|list|up|on|about|for|of|me|my|i|you|can|could|would|please|find|give|show|recommend|suggest|suggestions?|have|got|do|is|are|there|what|which|where|more|another|other|others|new|different|some|blog|posts?|further|stuff|things|like|these|those|that|this|them|it|want|need|looking|help|with|and|or|in|by|from|online|link|links|how|get|tell)\b/g;
  function artQuery(state, f) {
    if (!KB.read || !ART_RE.test(f)) return null;
    var topic = f.replace(ART_STOP, ' ').replace(/\s+/g, ' ').trim();
    var again = /\b(more|another|other|different|new)\b/.test(f) && !topic;
    if (again && state.art) topic = state.art.topic;
    return { topic: topic, f: f };
  }
  function artReply(state, aq) {
    var R = KB.read, seen = (state.art && state.art.seen) || {}, qs = aq.topic ? tokens(aq.topic) : [], scored = [];
    R.items.forEach(function (it, i) {
      if (!ART_OK.test(it[1])) return;
      var sc = 0;
      if (qs.length) {
        var tt = tokens(it[0]), sx = tokens(it[2] + ' ' + it[4].map(function (k) { return (R.tags[k] || '') + ' ' + k; }).join(' '));
        var has = function (list, q) { if (list.indexOf(q) >= 0) return true; if (q.length < 5) return false; var p5 = q.slice(0, 5); for (var z = 0; z < list.length; z++) if (list[z].slice(0, 5) === p5) return true; return false; };
        var hitN = 0;
        qs.forEach(function (q) { var h1 = has(tt, q), h2 = has(sx, q); if (h1) sc += 3; if (h2) sc += 1.5; if (h1 || h2) hitN++; });
        if (!sc) return;
        // a long topic ("raising a child in two religions") needs most of its words, not just "child"
        if (qs.length >= 3 && hitN * 2 <= qs.length) return;
        // every word of a short topic must be there ("coming out to religious parents" is not "caring for parents")
        if (qs.length >= 2 && qs.length <= 4 && hitN < qs.length - (qs.length === 4 ? 1 : 0)) return;
      } else sc = Math.random();
      if (seen[i]) sc -= 100;
      scored.push([sc + Math.random() * 0.5, i]);
    });
    scored.sort(function (a, b) { return b[0] - a[0]; });
    var pick = scored.filter(function (x) { return x[0] > -50; }).slice(0, 3);
    if (!pick.length && qs.length) {
      // nothing hand-picked on this, but a page on this site covers it: say so honestly, and offer the page
      var site0 = null;
      (IDX.first || []).some(function (c) {
        if (!c.newTopic || !CV_PERSONAL[c.id] || !c.links || !c.links.length || !c.re.test(aq.f || '') || (c.notRe && c.notRe.test(aq.f || ''))) return false;
        site0 = safeLinks(c.links)[0] || null; return !!site0;
      });
      if (!site0) return null;
      state.last = { kind: 'card', card: 'reading', q: 'articles', topic: 'articles', u: '/reading.html' };
      return { blocks: [{ k: 'p', x: 'I don’t have hand-picked articles on “' + aq.topic + '” yet. This site has a page on it, though:' },
        { k: 'links', x: [['On this site: ' + site0[0], site0[1]], ['Browse every article', '/reading.html']] }],
        chips: [{ label: 'Find me a good article', q: 'Find me a good article' }], kind: 'card', id: 'reading', noBrief: true };
    }
    if (!pick.length) pick = scored.slice(0, 3);
    pick.forEach(function (x) { seen[x[1]] = 1; });
    state.art = { topic: aq.topic, seen: seen };
    var arts = pick.map(function (x) { var it = R.items[x[1]]; return { t: it[0], u: it[1], s: it[3], x: it[2] }; });
    var b = [{ k: 'p', x: aq.topic ? 'Here are some good articles on “' + aq.topic + ',” hand-picked for this site from trusted sources. They open on the publisher’s own site.' :
      'Here are a few good articles from the site’s hand-picked reading list. Tell me a topic (“stress,” “apologies,” “ADHD,” “chores”) and I’ll find ones that fit.' }];
    b.push({ k: 'art', x: arts });
    // a page on this site about the same thing ("articles about ADHD in children" → When a child has ADHD)
    var site = null;
    (IDX.first || []).some(function (c) {
      if (!c.newTopic || !CV_PERSONAL[c.id] || !c.links || !c.links.length || !c.re.test(aq.f || '') || (c.notRe && c.notRe.test(aq.f || ''))) return false;
      site = safeLinks(c.links)[0] || null; return !!site;
    });
    b.push({ k: 'links', x: (site ? [['On this site: ' + site[0], site[1]]] : []).concat([['Browse every article', '/reading.html']]) });
    var chips = [{ label: 'More like these', q: aq.topic ? 'More articles about ' + aq.topic : 'More articles' }];
    var tagKeys = Object.keys(R.tags);
    for (var k = 0; chips.length < 3 && k < 6; k++) { var tk = tagKeys[Math.floor(Math.random() * tagKeys.length)], nm = R.tags[tk].split(/ [&,] /)[0]; if (!chips.some(function (c) { return c.label.indexOf(nm) >= 0; })) chips.push({ label: 'Articles on ' + nm.toLowerCase(), q: 'Articles about ' + nm.toLowerCase() }); }
    state.last = { kind: 'card', card: 'reading', q: 'articles', topic: 'articles', u: '/reading.html' };
    return { blocks: b, chips: chips, kind: 'card', id: 'reading', noBrief: true };
  }
  // ------------------------------------------------------------------ care, labels, and asking before concluding
  // Asking for something out of care ("text me if you'll be late"), or a "no" given for the relationship ("not the trip
  // with your ex"), is not control, for partners, family and friends alike; nor is saying what you will do if something
  // keeps happening. Those get help to talk it through. Only isolation from people in general, checking without
  // agreement, money kept back, threats, or fear get the safety answers. Puddles never puts a label on anyone ("toxic",
  // "narcissist", "controlling", "red flag"): when someone uses one, he asks what happened, and when something may be
  // unfair he asks a few short questions first (assets/js/clarify-data.js, shared with the tools), one per turn, and
  // only then gives a read that fits the answers.
  var CARE_LINE = 'Saying no, or asking for something out of care or respect for the relationship, is not control. That’s true for partners, family and friends alike. Control takes away someone’s freedom more broadly: cutting them off from people, watching them without agreement, controlling their money, threats, or leaving them afraid.';
  var WHO_C = '(he|she|they|my (partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse|fiance|fiancee|mum|mom|dad|mother|father|parents|stepmum|stepmom|stepdad|sister|brother|friend|best friend|flatmate|housemate|roommate))';
  var CARE_REQ = new RegExp([
    '\\b' + WHO_C + '( s| is)? (wants?|asked|asks|would like|d like|likes|expects|needs) (me )?(to )?(text|call|message|ring|let (him|her|them) know|check in|tell (him|her|them))( (him|her|them))? (when|if|that) (i m |i ll |i am |i will |i d |im |i get |i |it s |its )?(be |am |m |going to be |running |gonna be )?(late|home|out late|back late|staying out|on my way|safe|away|leaving)\\b',
    '\\b' + WHO_C + ' (asked|asks|wants|told|tells|would like|d like|would rather|prefers|doesn t want|does not want|didn t want) (me )?(not to |to not |to stop |me to stop |i don t |i didn t )?(flirt\\w*|text\\w*|messag\\w*|talk\\w*|see\\w*|meet\\w*|hang\\w* out|go\\w* out|stay\\w* in touch|dm\\w*|follow\\w*|lik\\w*|sleep\\w* over)( (with|to|at))? (my |her |his )?(ex|exes|ex s)\\b',
    '\\b' + WHO_C + ' (says|said|wants|told me|tells me|expects|insists) (that )?(i )?(need|have|has|must|should|got) to be (home|back|in) (by|before)\\b',
    '\\b' + WHO_C + ' (wants|would like|asked|asks|suggested|thinks|says) (that )?(us|we|me) (to )?(should )?(agree|talk|check( with (him|her|them|each other))?|decide together)( together)? (on|before|about) (any )?(big|large|major|bigger) (purchases?|spends?|spending|decisions|buys?|things)\\b',
    '\\b' + WHO_C + ' (wants|would like|asked|asks|suggested|says) (for )?(us )?(no phones|phones?|our phones|screens|the tv)( to be)?( off| away| down| out of the room)?( (at|during|for) (dinner|meals?|mealtimes?|bedtime|bed|date night))\\b',
    '\\b' + WHO_C + ' (said|says|told me) no to (me )?(going|staying|lending|taking|going on|going to|seeing|inviting|buying|getting)\\b',
    '\\b' + WHO_C + ' (doesn t|does not|don t|do not|didn t|did not) want me (going|to go|staying|to stay|lending|to lend|inviting|to invite|sleeping|to sleep) (to |on |out |away |over )?(that|the|this|a|an|his|her|their|my ex)\\b',
    '\\b' + WHO_C + '( s| is)? not (ok|okay|comfortable|happy|cool|fine) (with )?(me )?(going|lending|staying|sharing|meeting|inviting|having|sleeping|texting my ex|talking to my ex|seeing my ex)\\b',
    '\\b' + WHO_C + ' (won t|wont|will not|doesn t|does not) let me (go|stay|sleep) (on|to|at) (the |that |a |this |my ex s |his |her )?(trip|holiday|vacation|party|festival|weekend away|concert|sleepover|stag|hen|bachelor\\w*|club|gig)\\b',
    // a parent's house rule, called "controlling": a house rule, not control
    '\\bmy (mum|mom|dad|mother|father|parents|stepmum|stepmom|stepdad)( is| are| s| re)?( so| really| very| a bit| super)? (controlling|strict|overprotective) (about|with) (my )?(curfew|bedtime|screen time|my phone|the phone|homework|chores|house rules|rules|going out|parties|sleepovers)\\b',
    // "my mum says home by 10", "my wife wants me home by midnight": a time to be home
    '\\b' + WHO_C + ' (says|said|wants|told me|tells me|expects|insists|asked|asks|likes|would like|d like) (that )?(me |i m |i am |im |i |i ve got to |i got to )?(to )?(be )?(home|back|in) (by|before)\\b',
    // "my partner said no to the trip with my ex"
    '\\b' + WHO_C + ' (said|says|told me) no to (the|that|a|this|my|our|his|her) (trip|holiday|vacation|party|festival|weekend away|concert|sleepover|stag|hen|club|gig|night out|loan|purchase)\\b',
    // a parent's "you can't go to the party", "no sleepovers": a house rule
    '\\bmy (mum|mom|dad|mother|father|parents|stepmum|stepmom|stepdad)( s| has| have)? (says|said|told me|tells me|won t let me|wont let me|doesn t let me|don t let me|will not let me) (that )?(i m |im |i am |i )?(can t |cant |cannot |can not |not allowed to |am not allowed to |m not allowed to )?(go|have|stay|sleep|get|watch|use|keep|be out|bring)\\b',
    '\\bmy (mum|mom|dad|mother|father|parents|stepmum|stepmom|stepdad)( s| has| have)? (says|said|told me|tells me|won t let me|wont let me|doesn t let me|don t let me) (that )?(i m |im |i am |i )?(can t |cant |cannot |can not |not allowed to |am not allowed to |m not allowed to )?(see|have|go out with|meet) (my )?(friends|mates)( over| round)? (until|till|on school nights|on weeknights|on a school night|tonight|this week|this weekend|after|before|during the week)\\b',
    // worry about getting home safely, or about health
    '\\b' + WHO_C + ' (doesn t|does not|don t|do not|didn t) (want|like) me (walking|to walk|driving|to drive|cycling|to cycle|going|to go|getting|to get|coming|to come)( home| back)?( (alone|by myself|on my own|after drinking|drunk|after a drink|at night|late at night|in the dark))+\\b',
    '\\b' + WHO_C + ' (wants|asked|asks|would like|d like) me (to )?(get a taxi|get an uber|take a taxi|take an uber|text when i get (home|in|there|back)|call when i get (home|in|there|back)|text (him|her|them) when i get (home|in|there|back))\\b',
    '\\b' + WHO_C + ' (asked|asks|wants|would like|d like|keeps asking|begged|told) me (to )?(see|go to|go and see|talk to|speak to|book|get) (a |the |my )?(doctor|gp|therapist|counsellor|counselor|dentist|check ?up|checkup)\\b',
    '\\b' + WHO_C + ' (asked|asks|wants|would like|d like) me (to )?(cut down|stop|quit|drink less|smoke less|cut back)( on)? (drinking|smoking|vaping|gambling|the drink|alcohol|energy drinks|caffeine|weed)\\b',
    // "she wants to know where I am when I go out late"
    '\\b' + WHO_C + ' (wants|likes|asks|asked|would like|d like|needs) (me )?(to )?(know|tell (him|her|them)|let (him|her|them) know) where i (am|m|ll be|m going|am going)( (when|if) (i )?(go out|m out|am out|out|go)( late| at night)?)?\\b',
    // "my wife won't let me buy a motorbike": a no to a big spend
    '\\b' + WHO_C + ' (won t|wont|will not|doesn t|does not|didn t|did not) (let me|want me to) (buy|get) (a |an |the |that |this |another |new )*(motorbike|motorcycle|car|bike|phone|tv|console|ps5|xbox|watch|boat|dog|puppy|tattoo|sofa|laptop|computer|gaming pc|pc|van|truck)\\b',
    // "my best friend asked me not to bring my new boyfriend to her birthday": their event, their call
    '\\b' + WHO_C + ' (asked|asks|wants|would rather|prefers|doesn t want|does not want|didn t want) (me )?(not to |to not )?(bring|invite|take)( (him|her|them|my \\w+( \\w+)?))? (to|along to) (her|his|their|the|our) (birthday|party|wedding|dinner|night out|hen|stag|reunion|do)\\b',
    // "am I controlling if I ask him to text me when he's late?": the asker's own side
    '\\b(am i|is it|would it be|would i be) (being )?(controlling|too much|unreasonable|needy|clingy|possessive|a control freak|wrong|bad|ok|okay|fair) (if|when|for|to)( i)? (ask|asking|want|wanting|expect|expecting|tell|telling|asked)( (him|her|them|my (partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse)))? (to )?(not )?(text|call|message|ring|let me know|check in|flirt|see his ex|see her ex|talk to (his|her|their) ex|be home|come home)\\b',
    '\\bi (asked|ask|want|wanted|told) (him|her|them|my (partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse)) (to |not to )(text|call|message|let me know|check in|flirt|see|talk|stop|be home|come home)\\b.{0,60}\\b(controlling|too much|unreasonable|clingy|needy|possessive|a control freak)\\b',
    '\\b(is it|am i|would it be|would i be) (being )?(controlling|too much|unreasonable|wrong|bad|a red flag) (to|if i) (want|ask for|ask|expect|have|set|make|say)( for)?( a rule( of)?)? (no )?phones?( to be)? (off|away|down) (at|during) (dinner|meals?|mealtimes?|the table|bedtime)\\b',
    // "phones off at dinner" on its own
    '^(no )?phones? (off|away|down) (at|during) (dinner|meals?|mealtimes?|the table)( please| now)?$'
  ].join('|'));
  var WHERE_ALWAYS = new RegExp('\\b' + WHO_C + ' (always |constantly )?(wants?|needs?|has|demands?|insists on|expects|asks?)( me)?( to)? (know|knowing|tell (him|her|them)|to be told|text (him|her|them)) where i (am|go|m going|ve been|have been)\\b.{0,20}\\b(all the time|constantly|every minute|every hour|24 7|always|every time|every day|whenever)\\b|\\b' + WHO_C + ' (always|constantly) (wants?|needs?|asks?)( me)?( to)? (know|tell (him|her|them)) where i (am|go)\\b');
  // a limit that may or may not be care: "she asked me to stop seeing my sister", "he says if I go out with my friends
  // he'll leave", "home by 8 or he gets angry", "won't let me spend my own money": a few short questions, not a verdict
  var LIMIT_ASK = new RegExp('\\b' + WHO_C + ' (wants|asked|asks|told|tells|keeps telling) me (to )?(stop|not to) (seeing|talking to|texting|meeting|going out with|visiting|calling) (my )?(sister|brother|mum|mom|dad|best friend|friend|cousin|colleague|coworker|workmate)\\b|' +
    '\\b' + WHO_C + ' (says|said|told me|tells me|keeps saying) (that )?if i (go out|see|meet|talk to|text|visit|go)\\b.{0,40}\\b(he|she|they|hell|shell|theyll)( ll| will| would| is going to| s going to)? (leave|dump|break up with|end it|end things|walk out)\\b|' +
    '\\b' + WHO_C + ' (won t|wont|will not|doesn t|does not|never) let(s)? me (buy|spend|use|get)\\b.{0,40}\\b(my own money|money i earn|my (wage|wages|salary|paycheck|pay|savings))\\b');
  function limitAsk(c, cb) { return LIMIT_ASK.test(c) || (CARE_REQ.test(c) && CARE_BLOCK.test(cb)); }
  // saying what you will do if something keeps happening is a boundary, not a threat
  var OWN_CONSEQ = /\b(i ll|ill|i will|i m going to|im going to|i am going to|i would|i d) (have to |need to |probably )?(leave|go|move out|end (it|things|this|the relationship)|walk away|stay (at|with) my \w+)( for a (while|bit|few days))? if (this|it|that|he|she|they|you) (keeps?|carry|carries|continues|happens again|does (it|that) again|doesn t|don t|won t|lies? again|cheats? again|drinks?)|\bif (this|it|that|he|she|they|you) (keeps? (happening|going|on)|happens again|does (it|that) again|cheats? again|lies? again|keeps? (lying|drinking|cheating|gambling))( again)?( then)? (i ll|ill|i will|i m going to|im going to|i am going to) (leave|go|move out|end (it|things|this)|walk away)\b|\bif (he|she|they|you|this|it) (keeps?|carries on|continues)( on)? (lying|drinking|cheating|gambling|doing (it|that)|happening)( again)?( then)? (i m|im|i am|we re|we are|it s|its) (done|through|over|out)\b|\bis it (a threat|threatening|an ultimatum|manipulative|controlling) (if|to|when) (i )?(say|tell (him|her|them)) (that )?(i ll|ill|i will|i m going to|im going to) (leave|go|move out|end it)\b/;
  // and theirs: "he says he'll leave if I keep drinking" tells you how much it matters to them
  var OTHER_CONSEQ = /\b(he|she|they|my (partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse|fiance|fiancee))( has| keeps)? (says|said|told me|tells me|saying|says that|said that) (he|she|they)( ll| will| would| is going to| s going to| re going to| are going to)? (leave|move out|end it|end things|walk away|leave me|go)( me)? if i (keep|don t stop|carry on|keep on|go back to|ever|start) ?(drinking|lying|gambling|cheating|smoking|using|doing (it|that|drugs)|being late|disappearing|spending|again)\b/;
  // what lifts it out of the everyday: fear, harm, threats, people in general, checking, money kept back, every time
  var CARE_BLOCK = /\b(scared|afraid|frightened|terrified|unsafe|not safe|hurt\w*|hit\w*|threat\w*|punish\w*|or else|rage|explodes?|screams?|kids|children|baby|anyone|anybody|my friends|my family|friends or family|(any|all) (of )?(my )?(friends|family)|people|never|every (single )?(time|day|night|minute|hour)|always|constantly|all the time|24 7|passwords?|track\w*|location|allowance|my (own )?money|money i earn)\b/;
  // contractions the spelling fix may have joined ("doesnt", "ill be late"), put back the way the patterns expect
  function cnorm(f) { return String(f || '').replace(/\b(doesn|don|didn|won|isn|wasn|aren|can|wouldn|shouldn)t\b/g, '$1 t').replace(/\bwont\b/g, 'won t').replace(/\bill (?=(be|leave|go|move|end|walk|text|call|need|have|probably|stay|let)\b)/g, 'i ll ').replace(/\bim (?=(going|gonna|late|out|home|on my way)\b)/g, 'i m ').replace(/\b(she|he|it)s (?=(not|so|really|a bit|very)\b)/g, '$1 s ').replace(/\b(hell|shell|theyll)(?= (leave|go|move|end|walk|stop|be)\b)/g, function (m) { return m === 'hell' ? 'he ll' : m === 'shell' ? 'she ll' : 'they ll'; });
  }
  function careReqReply(f) {
    if (OTHER_CONSEQ.test(f) && !CARE_REQ.test(f)) return { blocks: [
      { k: 'p', x: 'When someone tells you what they’ll do if something keeps happening, that’s a boundary, not a threat. It’s a hard thing to hear, and it tells you how much this matters to them.' },
      { k: 'list', x: ['Take it seriously, and try not to argue with the boundary itself. Ask what’s behind it: “What’s it been like for you?”', 'Say what you can honestly do, and by when. Small and real beats big and vague.', 'If the thing is hard to change on your own, like drinking or gambling, getting support is part of the answer, not a sign of failure.', 'Agree a time to look at it again together.'] },
      { k: 'script', l: 'Words you could use', x: 'I hear you, and I know this has been hard on you. I don’t want to lose us. Here’s what I’m going to do this week, and I’d like us to talk again on Sunday about how it’s going.' },
      { k: 'links', x: [['Saying no, and hearing no', '/communication.html#saying-no']] }],
      chips: [{ label: 'Something else', q: 'Start over' }], kind: 'care', id: 'theirboundary' };
    if (OWN_CONSEQ.test(f) && !CARE_REQ.test(f)) return { blocks: [
      { k: 'p', x: 'Saying what you will do if something keeps happening is a boundary, not a threat. A threat tries to frighten someone into doing what you want. A boundary tells them what you need, and what you’ll do to look after yourself.' },
      { k: 'list', x: ['Say it once, calmly, at a quiet time, not in the middle of a row.', 'Name the thing, not the person: “the lying,” “the drinking,” not “you’re a liar.”', 'Only say what you’re ready to do, and do it if it happens again. It’s there to look after you, not to punish them.', 'Leave room for them to change: say what would help, too.'] },
      { k: 'script', l: 'Words you could use', x: 'I love you, and I can’t keep going through this. If it happens again, I’ll need to step back for a while. I’m telling you now, calmly, so it isn’t a surprise, and because I want this to work.' },
      { k: 'note', x: 'If you’re ever afraid to say it, or afraid of how they’ll react, that’s different, and you deserve support with it.' },
      { k: 'links', x: [['Saying no, kindly and clearly', '/communication.html#saying-no']] }],
      chips: [{ label: 'How do I say it calmly?', q: 'How do I say no kindly' }, { label: 'Something else', q: 'Start over' }], kind: 'care', id: 'ownboundary' };
    var PARENT_W = /\b(mum|mom|dad|mother|father|parents|stepmum|stepmom|stepdad)\b/, PARTNER_W = /\b(partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse|fiance|fiancee)\b/;
    var own = /\b(am i|would i be)\b|\bis it [a-z ]{0,30}\b(if|when|to) i\b|\b(is it|would it be) (being )?(controlling|too much|unreasonable|wrong|bad|a red flag) to (want|ask|expect|have|set|make|say)\b|\bi (asked|ask|want|wanted|told) (him|her|them|my \w+) (to|not to)\b/.test(f);
    var pw = f.search(PARENT_W), qw = f.search(PARTNER_W);
    var home = pw >= 0 && (qw < 0 || pw < qw) && (/\b(home|back|in) (by|before)\b|\b(curfew|bedtime|screen time|homework|house rules|rules|going out|go out|party|parties|sleep ?overs?|sleep over|stay over|phone)\b/.test(f) || /\b(can t|cant|cannot|not allowed|won t let me|wont let me|don t let me|doesn t let me)\b/.test(f));
    var risk = /\b(alone|by myself|on my own|after drinking|drunk|after a drink|in the dark|taxi|uber|motorbike|motorcycle|when i get (home|in|there|back))\b/.test(f);
    var health = !/\b(driving|drive|walking|walk|cycling)\b/.test(f) && /\b(doctor|gp|therapist|counsellor|counselor|dentist|check ?up|checkup|cut down|drink less|smoke less|cut back|quit|drinking|smoking|vaping|gambling|alcohol)\b/.test(f);
    var where = /\bwhere i (am|m|ll be|m going|am going)\b/.test(f);
    var event = /\b(bring|invite|take)\b.*\b(birthday|party|wedding|dinner|night out|hen|stag|reunion|do)\b/.test(f) && !PARTNER_W.test(f.replace(/\bmy new (boyfriend|girlfriend|partner)\b/, ' '));
    var late = !own && (/\b(late|on my way|safe|staying out|leaving)\b/.test(f) && /\b(text|call|message|ring|let|check in|tell)\b/.test(f) || where || /\b(home|back|in) (by|before)\b/.test(f));
    var ex = /\bex(es| s)?\b/.test(f), buy = /\b(purchases?|spends?|spending|buys?|lend\w*|money|loan)\b/.test(f), phones = /\b(phones?|screens|tv)\b/.test(f) && !home && !/\b(buy|get) (a |an |the |new )*(phone|tv)\b/.test(f);
    var bigbuy = !risk && /\b(let me|want me to) (buy|get)\b/.test(f);
    var ownPh = own && /\bphones?\b/.test(f);
    var lead = own ? 'Asking for something out of care, like ' + (ownPh ? 'phones away at dinner' : 'a quick text when they’ll be late') + ', isn’t control. It stays a request when a no is okay and you can both say how it lands. What would make it control is if it came with anger, checking up, or no room to say no.'
      : home ? 'It sounds like a house rule that comes from worry about you. Rules at home are normal, and they’re easier to live with when you know the reason and can talk about them, especially as you get older.'
      : health ? 'It sounds like they’re worried about your health. Asking you to see someone, or to cut down on something, usually comes from caring what happens to you, even when it’s hard to hear.'
      : risk ? 'It sounds like they’re worried about you getting hurt. A no that comes from fear for your safety can feel limiting, and it’s still worth talking through, so you both feel heard.'
      : late ? 'It sounds like they want to know you’re safe. Asking for a text when you’ll be late, or a time you’ll be home, is usually worry, not distrust.'
      : ex ? 'It sounds like this is about the relationship feeling safe for them. Asking you to keep some distance from an ex is a common request, and it usually comes from feeling uneasy, not from wanting to run your life.'
      : event ? 'It sounds like they want their day to feel a certain way. Who comes to their own event is theirs to decide, and it usually isn’t about you, or about the person you wanted to bring.'
      : bigbuy ? 'It sounds like a no to a big spend. One no about a big purchase is a common money disagreement, and it’s usually about the shared budget, or worry, more than about running your life.'
      : buy ? 'It sounds like they want money decisions to feel safe and fair for both of you. Agreeing before big spends, or saying no to a loan, is a common way couples look after their shared life.'
      : phones ? 'Wanting phones away at dinner is usually a wish for more of you, not less freedom.'
      : 'It sounds like they said no out of care for the relationship, or because it made them uneasy. A “no” like that can sting, especially when you were looking forward to it, but it isn’t control.';
    var say = ownPh ? 'Could we try phones away at dinner? I miss talking with you properly. If one of us is waiting for an important call, that’s fine.'
      : own ? (/\b(text|call|message|ring|let me know|check in|late|home)\b/.test(f) ? 'I worry when I don’t know you’re running late. Could you send a quick text if you’ll be more than half an hour late? If that feels like too much, tell me, and we’ll find something that works for both of us.' : 'This matters to me because I feel uneasy about it. Can we talk about what would work for both of us? If it feels like too much, tell me.')
      : home ? 'I get that you worry. Can we talk about the time? If I text you where I am, could it be eleven on weekends?'
      : health ? 'I know you’re asking because you care. It’s hard for me to hear. Can we talk about what worries you, and I’ll tell you honestly what I’m ready to do?'
      : risk ? 'I know you worry about me getting hurt. Can we find a way that works for both of us, like I text you when I set off and when I’m in?'
      : late ? 'I get that you worry when I’m late. I’ll text if I’m going to be more than half an hour late. Does that work for you?'
      : ex ? 'I can hear this matters to you. Can you tell me what feels hard about it? I want you to feel secure, and I’d like to say how I see it too.'
      : event ? 'That’s fine, it’s your day. Could we plan something together soon, so you two can meet another time?'
      : bigbuy ? 'I can see why you’re wary of a big spend. Can we look at the numbers together, and agree what would make it work, or when?'
      : buy ? 'I can see why you want us to agree on this. Can we set an amount together, so we both know when to check in?'
      : phones ? 'Okay, phones away at dinner. Could we keep it to dinner, and agree what happens if one of us is waiting for an important call?'
      : 'I can hear this matters to you. Can you tell me what’s behind it? Then I’ll tell you how it lands for me, and we can find something we’re both okay with.';
    return { blocks: [
      { k: 'p', x: lead },
      { k: 'p', x: own ? 'A request leaves room for them to say how it lands, and for you to hear it. A rule handed down with no room for “no” feels different. A calm talk turns most things like this into something you both agree.' : 'A request leaves room for you to say how it lands and to talk it through. A rule handed down with no room for “no” feels different. Most things like this sit in between, and a calm talk turns them into something you both agree.' },
      { k: 'list', x: own ? ['Ask, don’t require: say why it matters to you, and ask if it works for them.', (ownPh ? 'Keep it small and clear: dinner only, not the whole evening.' : 'Make it easy to do: a one-word text counts.'), 'Be okay with “I’ll forget sometimes,” and let it go when they do.', 'Offer the same back, so it goes both ways.'] : ['Ask what’s behind it: “What worries you about it?” Listen to the answer before you explain your side.', 'Say what it costs you, plainly: “I was really looking forward to it,” or “I feel less trusted when….”', 'Look for a version you can both live with: a quick text, meeting in a group, a time limit, an amount to check in over.', 'Agree it, try it for a few weeks, and look at it again together.'] },
      { k: 'script', l: 'Words you could use', x: say }]
      .concat(/\b(angry|mad|furious|yells?|shouts?|snaps?|sulks?|cross|upset)\b/.test(f) ? [{ k: 'p', x: 'If there’s anger when it doesn’t happen, say that part too, calmly and at a quiet time: “I want to do this for you, and I also need it to be okay when I forget.” If saying no ever leads to a big row, days of silence, or you feel afraid, that’s different, and I can help with that too.' }] : [])
      .concat([{ k: 'note', x: CARE_LINE },
      { k: 'links', x: [['Saying no, and hearing no', '/communication.html#saying-no'], ['A kind weekly check-in', '/check-ins.html']] }]),
      chips: [{ label: 'Is it fair? A few quick questions', q: (bigbuy || buy) && !ex ? 'A few questions about money' : 'A few questions about a limit or a no' }, { label: 'Something else', q: 'Start over' }], kind: 'care', id: 'carenotcontrol' };
  }

  // the questions (clarify-data.js), loaded the first time they're needed
  var CD_URL = KB_URL.replace(/chat-kb\.js$/, 'clarify-data.js'), cdWaiting = [], cdTried = false;
  function loadCD(cb) {
    if (window.TOLClarifyData) return cb(window.TOLClarifyData);
    if (cdTried && !cdWaiting.length) return cb(null);
    cdWaiting.push(cb);
    if (cdWaiting.length > 1) return;
    cdTried = true;
    function done() { var w = cdWaiting; cdWaiting = []; w.forEach(function (fn) { fn(window.TOLClarifyData || null); }); }
    var sc = document.createElement('script');
    sc.src = CD_URL; sc.async = true; sc.onload = done; sc.onerror = done;
    document.head.appendChild(sc);
  }
  var CQ_TYPES = [['load', 'who does what'], ['money', 'money'], ['decisions', 'who decides'], ['limits', 'a limit or a no'], ['communication', 'how we talk'], ['respect', 'put-downs or respect'], ['time', 'time together'], ['repair', 'apologies and blame'], ['recurring', 'a fight that keeps coming back'], ['afraid', 'feeling afraid']];
  var CQ_PICK = new RegExp('^(a few )?(quick |short )?questions (about|on) (' + CQ_TYPES.map(function (x) { return x[1].replace(/[-]/g, ' '); }).join('|') + ')$');
  var CQ_SKIPALL = /^(skip (all|them all|the questions|the rest|these)|no (more )?questions|just tell me|skip all of (them|these))$/;
  var PICK_CHIPS = [{ label: 'Money', q: 'A few questions about money' }, { label: 'A limit or a “no”', q: 'A few questions about a limit or a no' }, { label: 'Who decides things', q: 'A few questions about who decides' },
    { label: 'How we talk to each other', q: 'A few questions about how we talk' }, { label: 'Put-downs', q: 'A few questions about put-downs or respect' }, { label: 'I feel afraid', q: 'A few questions about feeling afraid' }];
  function cqTypeOf(f) {
    var m = CQ_PICK.exec(f);
    if (!m) return null;
    var name = m[4];
    return (CQ_TYPES.filter(function (x) { return x[1].replace(/[-]/g, ' ') === name; })[0] || [])[0] || null;
  }
  function cqGuess(text) {
    var C = window.TOLClarifyData;
    var s = norm(text || '').replace(/\b(red flags?|toxic|narcissis\w*|narc|manipulat\w*|gaslight\w*|gaslit|controlling|abusive|psychopath\w*|sociopath\w*|is (this|that|it) (normal|fair|okay|ok))\b/g, ' ');
    return C ? C.guessType(s) : null;
  }
  function cqAsk(state, intro, outro) {
    var C = window.TOLClarifyData, S = state.cq, qs = C.questions(S.type, 'en'), q = qs[S.i];
    var b = (intro || []).slice();
    b.push({ k: 'p', x: q.text });
    if (S.i === 0) b.push({ k: 'note', x: 'One short question at a time, ' + qs.length + ' at most. Tap an answer, skip any of them, or skip them all.' });
    (outro || []).forEach(function (x) { b.push(x); });
    var chips = q.answers.map(function (a) { return { label: a.skip ? 'Skip this one' : a.text, q: a.skip ? 'Skip' : a.text, keep: 1 }; });
    chips.push({ label: 'Skip all', q: 'Skip all', keep: 1 });
    return { blocks: b, chips: chips, kind: 'ask', id: 'clarify-' + S.type };
  }
  function cqStart(state, type, text, intro, outro) {
    if (!window.TOLClarifyData || !window.TOLClarifyData.TYPES[type]) return null;
    state.cq = { type: type, i: 0, ans: {}, text: text || '', turn: state.turn || 0 };
    // the bank's own "why" line says what the questions are for (clarify-data.js), in place of a generic one
    var why = window.TOLClarifyData.TYPES[type].why, wx = why && window.TOLClarifyData.t(why, 'en');
    var ib = (intro || []).filter(function (x) { return !/^(A few short questions|Okay\. A few short questions)/.test(x.x || ''); });
    ib.push({ k: 'p', x: wx || 'A few short questions will help me give you a fair read, rather than a guess.' });
    return cqAsk(state, ib, outro);
  }
  function cqTurn(state, q0) {
    var S = state.cq, C = window.TOLClarifyData;
    if (!S || !C || (state.turn || 0) - (S.last || S.turn) > 2) { state.cq = null; return null; }
    var f = norm(q0), qs = C.questions(S.type, 'en'), qq = qs[S.i], raw = C.TYPES[S.type].questions[S.i];
    if (!qq) { state.cq = null; return null; }
    S.last = state.turn;
    if (CQ_SKIPALL.test(f)) { S.skipAll = true; return cqRead(state); }
    var hit = null;
    qq.answers.forEach(function (a) { if (!hit && norm(a.text) === f) hit = a; });
    if (!hit && /^(skip|skip this( one)?|pass|next( question)?)$/.test(f)) hit = { id: 'skip' };
    if (!hit && /^(not sure|unsure|dunno|i don t know|i dont know|no idea|idk)$/.test(f)) hit = { id: 'notsure' };
    if (!hit && /^(yes|yeah|yep|yup|no|nope|nah)$/.test(f)) {
      var yn = /^n/.test(f) ? 'no' : 'yes', m = qq.answers.filter(function (a) { return !a.neutral && norm(a.text).split(' ')[0] === yn; });
      if (m.length === 1) hit = m[0];
    }
    if (!hit) { state.cq = null; return null; }   // something new: answer that instead
    S.ans[qq.id] = hit.id; S.i++;
    var rawA = (raw.answers || []).filter(function (a) { return a.id === hit.id; })[0];
    var urgent = rawA && (rawA.f || []).some(function (x) { return /^(afraid|threat|danger)$/.test(x); });
    if (!urgent) { try { urgent = C.evaluate(S.type, S.ans, { text: S.text, lang: 'en' }).level >= 4; } catch (e) {} }
    if (!urgent && S.i < qs.length) return cqAsk(state, [{ k: 'p', x: S.i === qs.length - 1 && !/^last one/i.test(qs[S.i].text) ? 'Thanks. Last one.' : 'Thanks.' }]);
    return cqRead(state);
  }
  function abuseAskReply() {
    return { blocks: [{ k: 'p', x: 'I’m glad you asked. I can’t tell from a chat, and you don’t need to be sure it “counts” to ask. What has been happening? A line or two is plenty.' },
      { k: 'p', x: 'Some signs that something is more than ordinary conflict:' },
      { k: 'list', x: ['You feel scared of them, or of how they’ll react.', 'They hurt, push, corner or threaten you, or threaten to hurt themselves, the kids or a pet.', 'They check your phone, track where you are, or cut you off from friends and family.', 'They control all the money, or stop you from working.', 'They pressure you into sex, or anything else you don’t want.'] },
      { k: 'note', x: 'If none of these fit, tell me what’s been going on, or pick what it’s mostly about, and I’ll ask a few short questions so my answer fits.' }],
      chips: PICK_CHIPS, kind: 'safety', id: 'abuseask' };
  }
  function cqRead(state) {
    var C = window.TOLClarifyData, S = state.cq;
    state.cq = null;
    var res = C.evaluate(S.type, S.skipAll ? 'skip' : S.ans, { text: S.text, lang: 'en' }), nx = C.next(res, 'en');
    var b = norm(nx.body).indexOf(norm(nx.title)) === 0 ? [] : [{ k: 'p', x: nx.title + '.' }];
    if (res.reasons && res.reasons.length && !S.skipAll) { b.push({ k: 'p', x: 'What I took into account:' }); b.push({ k: 'list', x: res.reasons.slice(0, 4) }); }
    else if (res.reasons && res.reasons.length) b.push({ k: 'note', x: res.reasons[0] });
    b.push({ k: 'p', x: res.level >= 4 ? (res.crisis ? SUICIDE_LINE : SAFE_LINE) : nx.body });
    if (nx.say) b.push({ k: 'script', l: 'Words you could use', x: nx.say });
    if (nx.footer) b.push({ k: 'note', x: nx.footer });
    var links = (nx.links || []).concat(nx.footerLinks || []).map(function (l) { return [l.text, l.href]; });
    if (links.length) b.push({ k: 'links', x: links });
    b.push({ k: 'note', x: 'This is a read of your answers, not a verdict on anyone. You know your situation best.' });
    if (res.level >= 4) { state.unsafe = true; state.fearSeen = true; }
    state.last = null;
    var chips = res.level >= 4 ? [{ label: 'Something else', q: 'Start over' }]
      : [{ label: 'Ask the questions again', q: 'A few questions about ' + (CQ_TYPES.filter(function (x) { return x[0] === S.type; })[0] || ['', 'who does what'])[1] }, { label: 'Something else', q: 'Start over' }];
    return { blocks: b, chips: chips, kind: res.level >= 4 ? 'safety' : 'read', id: 'clarify-' + S.type, level: res.level };
  }

  // "my husband is toxic", "is she a narcissist", "my boyfriend is so controlling", "he gaslights me": never confirmed
  var WHO_L = '(he|she|they|hes|shes|theyre|my (partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse|fiance|fiancee|ex|ex husband|ex wife|mum|mom|dad|mother|father|parents|sister|brother|friend|best friend|mother in law|father in law|son|daughter|flatmate|housemate|roommate))';
  var LABEL_W = '(toxic|a toxic person|narcissist\\w*|a narcissist|a narc|manipulative|a manipulator|controlling|a control freak|a red flag|full of red flags|a psychopath|a sociopath|psychopathic|sociopathic)';
  var LABEL_PERSON = new RegExp('\\b' + WHO_L + '( is| s| are| re| has been| s been| was| seems| sounds| can be| gets| acts| is being| s being| are being)?( so| really| very| a bit| kind of| kinda| quite| super| such| being| totally| completely| just)* ' + LABEL_W + '\\b|' +
    '\\b(is|isnt|are|could) ' + WHO_L + '( be| being)? ' + LABEL_W + '\\b|' +
    '\\b' + WHO_L + '( is| s| keeps| always| constantly)* (gaslighting|gaslights|gaslighted|gaslit|manipulating|manipulates|manipulated) me\\b|' +
    '\\b(i m|im|i am|i feel like i m|i feel like im|i think i m|i think im|feel) (being|been|getting) (gaslit|gaslighted|manipulated)\\b|' +
    '^(toxic|controlling|manipulative|manipulation|a control freak|toxic relationship|my relationship is toxic|our relationship is toxic|is my relationship toxic|is our relationship toxic)$|\\b(my|our) relationship (is|feels|seems) (so |really |very )?toxic\\b|\\bis (my|our|this) relationship toxic\\b');
  var LBL_HEAVY = /\b(scream\w*|yell\w*|shout\w*|swear\w*|swore|calls? me|called me|names|worthless|stupid|useless|pathetic|put\w* me down|belittl\w*|eggshells|crazy)\b/;
  var LABEL_WORK = /\b(bakery|business|shop|cafe|cofounder|co founder|founder|company|boss|manager|colleague|coworker|co worker|office|my job|at work|team|client|customer|landlord)\b/;
  function labelReply(state, f, q0) {
    var narc = /\bnarc|psychopath|sociopath/.test(f), gas = /\bgasl/.test(f), man = /\bmanipulat/.test(f), ctl = /\bcontrol/.test(f);
    var lead = narc ? 'That’s a fair thing to wonder about when someone is hard to be around. I can’t diagnose anyone, and nobody can from a chat. A label matters less than what actually happens, and how it leaves you feeling.'
      : gas ? 'Being left unsure of what you remember is a horrible feeling. I can’t tell from here what’s going on between you, and the word matters less than what actually happens.'
      : 'That sounds hard to live with. I can’t tell from here what’s going on, and I won’t put a label on anyone: what actually happens, and how it leaves you feeling, matters more than the word.';
    var type = cqGuess(f);
    if (type && type !== 'afraid' && window.TOLClarifyData) {
      var r0 = cqStart(state, type, q0, [{ k: 'p', x: lead }, { k: 'p', x: 'A few short questions will help me give you a fair read, rather than a guess.' }], []);
      if (r0) return r0;
    }
    return { blocks: [{ k: 'p', x: lead },
      { k: 'p', x: (man ? 'What do they do that leaves you feeling pushed or played?' : ctl ? 'What happens, day to day?' : 'What happened, or what keeps happening?') + ' A line or two is plenty. Or pick what it’s mostly about, and I’ll ask a few short questions so my answer fits.' },],
      chips: PICK_CHIPS, kind: 'care', id: 'label' };
  }
  // "is it fair that I do all the cooking?", "am I being unreasonable?": a few questions first
  var FAIR_Q = /\b(is (it|this|that) (fair|unfair|reasonable|unreasonable|too much to ask)|am i (being )?(unfair|unreasonable)|is (he|she|they|my (partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse|fiance|fiancee)) being (unfair|unreasonable)|is (it|this|that) (normal|okay|ok) (that|for|when|if) (my (partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse|fiance|fiancee)|he|she)\b)/;
  // a possibly unfair pattern described, not asked about ("he always gets his way", "it feels so one-sided"): when nothing
  // more specific fits, a few short questions first, so the read is proportionate (ordinary, a talk, a pattern, outside help)
  var UNFAIR_DESC = /\b(always gets? (his|her|their|my) (own )?way|(makes|takes|make) all the (big )?decisions|decides everything|makes every decision|always (blames?|blaming) me|blames me for everything|(says|thinks|tells me) (i m|im|i am) always (wrong|the problem)|always (has|have|needs?) to (be right|win|have the last word)|(it|this|that|things|everything|our relationship) (feels?|seems?|is) (so |really |very |a bit |kind of )?(unfair|not fair|one sided|lopsided)|(doesn t|doesnt|does not|don t|dont) (feel|seem) fair|one sided relationship|i (always|usually) (give in|compromise|back down|end up giving in)|never (compromises?|meets? me (halfway|half way)))\b/;
  function unfairType(f) {
    if (/\b(way|decisions?|decides|give in|compromis\w*|back down|halfway|half way|be right|win|last word)\b/.test(f)) return 'decisions';
    if (/\bblam\w*/.test(f)) return 'repair';
    if (/\balways (wrong|the problem)\b/.test(f)) return 'communication';
    var g = cqGuess(f);
    return g && g !== 'afraid' ? g : null;
  }
  var FAIR_NOT = /\b(son|daughter|kids?|child|children|toddler|teen\w*|baby|babies|deploy\w*|grief|grieving|died|death|period|pregnan\w*|sex|work|boss|colleague|coworker|landlord|school|teacher)\b/;
  function respond(state, q, chipDoc) {
    var sp = null, q0 = q;
    state.turn = (state.turn || 0) + 1;
    if (state.pageCtx && !state.pageDone) pageInit(state);
    if (chipDoc == null) {
      // an answer to one of the short questions (tapped or typed) carries on with them
      if (state.cq) { var cqr = cqTurn(state, q); if (cqr) return cqr; }
      var f00 = norm(q);
      if (!window.TOLClarifyData && !cdTried && (CQ_PICK.test(f00) || CV_REDFLAG.test(f00) || LABEL_PERSON.test(f00) || FAIR_Q.test(f00) || UNFAIR_DESC.test(f00) || WHERE_ALWAYS.test(cnorm(f00)) || limitAsk(cnorm(f00), cnorm(f00)))) return { needCD: true };
      var cqt = cqTypeOf(f00), cqs = cqt && cqStart(state, cqt, state.lastQ || '', [{ k: 'p', x: 'Okay. A few short questions, so my answer fits what’s really going on.' }]);
      if (cqs) { state.last = null; state.care = null; return cqs; }
      sp = spellFix(q);
      // a spelling fix must never hide a safety concern ("it's my fault" read as "it is my fault")
      if (sp.fixes.length && !(DANGER.test(norm(q)) && !DANGER.test(norm(sp.q)))) q = sp.q; else if (sp.fixes.length) sp = { q: q, fixes: [], known: sp.known, unknown: sp.unknown };
      // "different question: …", "by the way, …": a new topic, so nothing from the last one carries over
      var sw0 = norm(q).match(/^(anyway|anyways|by the way|btw|on another note|new question|different question|another question|other question|unrelated|separate question|changing (the )?subject|switching (topics?|gears))\b\s*(.{6,})$/);
      if (sw0) { state.last = null; state.care = null; state.topic = null; q = sw0[sw0.length - 1]; }
      var vf = norm(q);
      if (CV_RESTART.test(vf)) { state.fearSeen = false; state.coSeen = false; state.crisis = 0; }
      // after a crisis reply, we stay with the person: "I don't want to call anyone, just talk to me" is never a page excerpt
      if (state.crisis && (state.turn || 0) - state.crisis <= 8 && !CV_RESTART.test(vf) && !(DANGER.test(vf) && !NOT_LIVE.test(vf)) && (CRISIS_STAY.test(vf) || NOT_LIVE.test(vf) || vf.split(' ').length <= 6)) { state.crisis = state.turn; state.last = null; state.topic = null; return crisisStayReply(); }
      if (SAFETY_TERM.test(vf)) { state.last = null; state.care = null; state.topic = null; return safetyTermReply(vf); }
      if (!NOT_LIVE.test(vf) && OWN_VIOLENT.test(vf)) { state.last = null; state.care = null; state.topic = null; state.unsafe = false; return meant(ownViolentReply(vf), sp); }
      if (CHILD_CRISIS.test(vf)) { state.last = null; state.care = null; state.topic = null; return meant(childCrisisReply(), sp); }
      if (!NOT_LIVE.test(vf) && MUTUAL.test(vf)) { state.last = null; state.care = null; state.topic = null; state.unsafe = true; state.fearSeen = true; return meant(mutualReply(), sp); }
      if (!NOT_LIVE.test(vf) && !SELF_HARMFUL.test(vf) && ownAgg(vf)) { state.last = null; state.care = null; state.topic = null; state.unsafe = false; return meant(ownAggReply(vf), sp); }
      // a request made out of care, a "no" for the relationship, or your own consequence: help to talk it through, not control
      var cvf0 = cnorm(vf), cvg0 = cvf0.replace(/\bis it (a threat|threatening|an ultimatum)\b/, ' ');
      // a parent's time limit on friends ("until my homework is done", "on school nights") is a house rule, not being cut off
      if (/^my (mum|mom|dad|mother|father|parents|stepmum|stepmom|stepdad)\b/.test(cvg0)) cvg0 = cvg0.replace(/\b(see|have|go out with|meet) (my )?(friends|mates)( over| round)? (?=(until|till|on school nights|on weeknights|on a school night|tonight|this week|this weekend|after|before|during the week)\b)/g, 'go out ');
      if (!NOT_LIVE.test(vf) && !HARD.test(cvg0) && !FEAR_W.test(vf) && !CARE_BLOCK.test(cvg0) && (CARE_REQ.test(cvf0) || OWN_CONSEQ.test(cvf0) || OTHER_CONSEQ.test(cvf0))) { state.last = null; state.care = null; state.topic = null; return meant(careReqReply(cvf0), sp); }
      if (!NOT_LIVE.test(vf) && !DANGER.test(vf) && !HARD.test(cvg0) && !FEAR_W.test(vf) && !CONTROL.test(vf) && !WHERE_ALWAYS.test(cvf0) && limitAsk(cvf0, cvg0) && window.TOLClarifyData) {
        var lmt = /\b(money|wage|wages|salary|paycheck|pay|savings)\b/.test(cvf0) ? 'money' : 'limits';
        var lq = cqStart(state, lmt, q0, [{ k: 'p', x: lmt === 'money' ? 'That sounds hard to live with. Agreeing limits on money together is normal. What matters is whether it goes both ways and you can say no. A few short questions will help me answer fairly, rather than guess.' : /\b(leave|dump|break up|end it|end things|walk out)\b/.test(cvf0) ? 'Being told they’ll leave if you see people puts you in a hard spot. Sometimes it comes from hurt or insecurity, and sometimes it starts to box you in. A few short questions will help me tell which, rather than guess.' : 'A request like that can come from care, or it can start to box you in. How it’s asked, and what happens when you say no, make the difference. A few short questions will help me tell which, rather than guess.' }],
          []);
        if (lq) { state.last = null; state.care = null; state.topic = null; return meant(lq, sp); }
      }
      // "he wants to know where I am all the time": worry, or checking up? Not a verdict either way: a few short questions
      if (!NOT_LIVE.test(vf) && !DANGER.test(vf) && !HARD.test(vf) && !FEAR_W.test(vf) && WHERE_ALWAYS.test(cvf0) && window.TOLClarifyData) {
        var wq = cqStart(state, 'limits', q0, [{ k: 'p', x: 'Wanting to know where you are can come from worry, or it can start to feel like being checked on. A few short questions will help me tell which, rather than guess.' }],
          []);
        if (wq) { state.last = null; state.care = null; state.topic = null; return meant(wq, sp); }
      }
      // a label for someone ("toxic", "narcissist", "controlling"): never confirmed; what happened, and a few questions
      if (!NOT_LIVE.test(vf) && LABEL_PERSON.test(vf) && !LABEL_WORK.test(vf) && !MONEY_W.test(vf) && !(state.topic && /^biz/.test(state.topic.id || '')) && !FEAR_W.test(vf) && !HARD.test(vf) && !LBL_HEAVY.test(vf) && !DANGER.test(vf.replace(LABEL_PERSON, ' '))) { state.last = null; state.care = null; state.topic = null; return meant(labelReply(state, vf, q0), sp); }
      // "is it fair that…", "am I being unreasonable?": a few short questions before any read
      if (FAIR_Q.test(vf) && !FAIR_NOT.test(vf) && !DANGER.test(vf) && !FEAR_W.test(vf) && window.TOLClarifyData) {
        var ft0 = cqGuess(vf), fr0 = ft0 && ft0 !== 'afraid' && cqStart(state, ft0, q0, [{ k: 'p', x: 'That’s a good thing to ask before deciding anything, and a few short questions will help me answer it fairly.' }]);
        if (fr0) { state.last = null; state.care = null; return meant(fr0, sp); }
      }
      if (!DANGER.test(vf) && !NOT_LIVE.test(vf) && ANGER_NOW.test(vf) && !/\b(he|she|they|my (partner|husband|wife|boyfriend|girlfriend|ex|dad|mum|mom|son|daughter|kid|boss))\b( s| is| gets| keeps)? (about to|going to|gonna|losing|loses)\b/.test(vf)) { state.last = null; return meant(angerNowReply(), sp); }
      if (!DANGER.test(vf) && !NOT_LIVE.test(vf) && (CHEATED_ME.test(vf) || CHEATED_ON.test(vf))) { state.last = null; state.care = null; state.topic = null; return meant(infidelityReply(CHEATED_ME.test(vf)), sp); }
      if (!DANGER.test(vf) && !SELF_HARMFUL.test(vf) && !NOT_LIVE.test(vf) && fearOf(vf)) { state.last = null; state.care = null; state.topic = null; state.unsafe = true; state.fearSeen = true; return meant(fearReply(vf), sp); }
      // "is this abuse?" after everyday complaints (forgetting, chores): an honest read of what they told us
      if (ABUSE_Q.test(vf) && !state.unsafe && !state.fearSeen && (state.turn || 0) > 1 && (state.last || state.care) && ((state.last && state.last.kind === 'sit') || state.topic || EVERYDAY_CTX.test(norm(state.lastQ || '')))) return meant(conflictNotAbuse(state), sp);
      // "is he abusive?" with nothing described yet (or only something unrelated): ask what happened, with the signs and the free lines, never a verdict
      if (ABUSE_Q.test(vf) && !state.unsafe && !state.fearSeen) { state.last = null; state.care = null; state.topic = null; return meant(abuseAskReply(), sp); }
      if (!ABUSE_Q.test(vf) && (FEAR_W.test(vf) || HARD.test(vf) || CONTROL.test(vf) || VERBAL.test(vf) || DANGER.test(vf))) state.fearSeen = true;
      if (EX_W.test(vf)) state.coSeen = true;
      // shouted at during a handoff (often in front of the child): handoff safety first, and the child questions stay open
      if (!DANGER.test(vf) && !SELF_HARMFUL.test(vf) && HANDOFF_SHOUT.test(vf) && (EX_W.test(vf) || /\bin front of\b/.test(vf)) && !VERBAL_STRONG.test(vf)) { state.last = null; state.care = null; state.fearSeen = true; state.coSeen = true; state.kidName = kidNameIn(q0) || state.kidName || ''; var hc = cardById('coparenting'); if (hc) setTopic(state, hc, 'coparenting'); return meant(handoffReply(vf, state.kidName), sp); }
      if (!DANGER.test(vf) && !SELF_HARMFUL.test(vf) && YELLED_AT.test(vf) && !VERBAL_STRONG.test(vf) && !VERBAL_NOT.test(vf)) { state.last = null; state.care = null; state.fearSeen = true; return meant(yelledAtReply(vf), sp); }
      if (!DANGER.test(vf) && VERBAL.test(vf) && !VERBAL_NOT.test(vf) && !SELF_HARMFUL.test(vf)) { state.last = null; state.care = null; state.topic = null; state.unsafe = VERBAL_DETAIL.test(vf); return meant(verbalReply(vf), sp); }
      if (!DANGER.test(vf) && TRUST_Q.test(vf) && !/\b(raindrop|rain drop|droplet|duck|drop of water|water drop)\b/.test(vf)) { state.last = null;
        // asked straight out whether he's AI, a bot or ChatGPT: a short, true "No"; otherwise he never brings AI up (owner)
        var askedAI = /\b(ai|a i|chat ?gpt|gpt|bot|chatbot|robot|generative|llm|language model|artificial intelligence)\b/.test(vf);
        return { blocks: (askedAI ? [{ k: 'p', x: 'No. Every answer here was written in advance for this site. I pick the best match and show you where it comes from.' }, { k: 'p', x: 'I can still pick the wrong topic, so if I miss, tell me “that’s not it.” I’m not a therapist and can’t diagnose.' }]
          : [{ k: 'p', x: HONEST_LINE }, { k: 'p', x: 'Every answer here was written in advance for this site. I match what you say to the right page, tool or playbook, and show you where each answer comes from, so you can read the page yourself. Nothing you type leaves your device.' }]).concat([{ k: 'links', x: [['How Professor Puddles answers', '/ask.html#how-he-answers'], ['The research behind this site', '/research.html'], ['How the program was built, and its limits', '/method-and-limits.html']] }]), chips: [{ label: 'What can I ask?', q: 'What can I ask?' }, { label: 'Is there evidence it works?', q: 'Is there any evidence this program works?' }], kind: 'about', id: 'honest' }; }
      if (!DANGER.test(vf) && MODES_Q.test(vf)) { state.last = null; return modesReply(state); }
      // chit-chat: games in progress, jokes, riddles, "I'm bored", reactions, and a plain hand-off when something real comes up
      var crt = crudeTurn(state, q, vf);
      if (crt && crt.cleaned) { q = q0 = crt.cleaned; vf = norm(q); if (crt.sorry) state.sorryTurn = state.turn; }
      else if (crt) return crt;
      if (BORED_Q.test(vf) && vf.split(' ').length <= 12 && !/\b(my|our|the) (kids?|children|son|daughter|partner|husband|wife|boyfriend|girlfriend|grandson|granddaughter|teen\w*)\b/.test(vf) && !DANGER.test(vf) && !FUN_UPSET.test(vf) && KB.pers) { state.last = null; return pzBored(state); }
      var pze = !DANGER.test(vf) && pzEarly(state, q0, vf);
      if (pze) { state.last = null; return pze; }
      var ovr = (state.turn || 0) <= 3 && pageOverview(state, vf);
      if (ovr) return ovr;
      var ckr = !DANGER.test(vf) && !state.unsafe && checkMsgTurn(state, q0, vf);
      if (ckr) { if (ckr.needSE) state.turn--; return ckr; }
      var igr = igTurn(state, q0, vf);
      if (igr) { if (igr.needIG) state.turn--; return igr; }
      var dt = !DANGER.test(vf) && !SELF_HARMFUL.test(vf) && !NOT_LIVE.test(vf) && !state.unsafe && deepTurn(state, q, vf);
      if (dt && dt.redo) { q = q0 = dt.redo; vf = norm(q); state.deepRedo = state.turn; dt = null; }
      if (dt) return dt;
      var ft = !DANGER.test(vf) && !state.unsafe && funTurn(state, vf);
      if (ft) return ft;
      var cvf = norm(q), cv = !DANGER.test(cvf) && !HIDE.test(cvf) && convoTurn(state, cvf);
      if (cv) return meant(cv, sp);
      // a question about one of the thirteen fields, or two of them, gets that field's (or pair's) own answer, not the overview
      var nf0 = norm(q), nq0 = KB && KB.nine && !DANGER.test(nf0) && nineQuery(nf0), nr0 = nq0 && nineReply(state, nq0);
      if (nr0) return meant(nr0, sp);
      var aq0 = KB && !DANGER.test(nf0) && artQuery(state, nf0), ar0 = aq0 && artReply(state, aq0);
      if (ar0) return meant(ar0, sp);
      var rsr = !DANGER.test(nf0) && !state.unsafe && researchReply(state, nf0);
      if (rsr) return meant(rsr, sp);
      var lgf0 = !DANGER.test(nf0) && logicFollow(state, nf0);
      if (lgf0) return meant(lgf0, sp);
      var cf = careFirst(state, q);
      if (cf) return meant(cf, sp);
      var sf = norm(q);
      if (!state.unsafe && !DANGER.test(sf) && !VERBAL.test(sf) && !SELF_HARMFUL.test(sf) && !NOT_LIVE.test(sf) && !FUN_UPSET.test(sf) && sf.split(' ').length <= 12) {
        var sit0 = detectSituation(sf), card0 = matchCard(sf), stw = card0 && stIntent(sf, stNorm(q));
        var chatty = stw && stw.id === 'weather_talk' && !/\b(today s|todays|my|the) (weather|forecast)\b.*\b(tool|check|reading|mean|use|work)|\bforecast\b|\bweather (check|reading|tool)\b/.test(sf);
        var pzt = !(sit0.issue && sit0.score >= 3) && pzTopic(state, q, sf, q0, card0);
        if (pzt) { state.last = null; return pzt; }
        if ((!(sit0.issue && sit0.score >= 3) && !card0) || chatty) { var stt = smallTalk(state, q, sf, q0); if (stt) return stt; }
      }
    }
    var f = norm(q), prevLast = state.last;
    var r = respond1(state, q, chipDoc);
    if (r && r.needBG) return r;
    // a hint that something real is going on, and nothing fits: a plain hand-off; in a light chat, nonsense gets a smile
    var pzl = chipDoc == null && pzLate(state, q0, f, r, sp);
    if (pzl) { state.last = null; return pzl; }
    // nothing here is a word I know ("asdfgh"): say so kindly, rather than "outside my little pond"
    if (sp && r && (r.kind === 'offtopic' || r.kind === 'none') && sp.unknown && !sp.known) return unclearReply();
    r = meant(r, sp);
    // an in-scope message that found nothing (a short, feeling-led one, or a follow-up in its own words):
    // stay with the last topic, or ask a warm clarifying question, rather than "outside my little pond"
    if (chipDoc == null && r && /^(offtopic|none|clarify|unclear)$|^$/.test(r.kind || '') && !FUN_UPSET.test(f) && !DANGER.test(f)) {
      var ack = stAck(state, f);
      if (ack) return ack;
    }
    // deep mode, and nothing found: a thoughtful "say more" rather than "outside my pond"
    if (chipDoc == null && r && (r.kind === 'offtopic' || r.kind === 'none') && KB.deep && deepOn(state) && !DANGER.test(f)) {
      state.last = null;
      return { blocks: [{ k: 'p', x: deepLine(state, 'no_match', 'That’s a deep one. Could you say it another way, or tell me who it’s about?') }],
        chips: [{ label: 'Ask me a big question', q: 'Ask me a big question' }, { label: 'Keep it light', q: 'Keep it light' }], kind: 'deep', id: 'nomatch', noBrief: true };
    }
    if (chipDoc == null && r && (r.kind === 'offtopic' || r.kind === 'none') && !OFF_TOPIC.test(f)) {
      var alt = contextReply(state, prevLast, f) || softClarify(state, f);
      if (alt) return meant(alt, sp);
    }
    return r;
  }

  // accents folded away, for spelling lookups
  function esFold(s) { return String(s || '').toLowerCase().replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/ñ/g, 'n').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
  // Once someone has told us about control or danger, later questions in the same chat never get couples tips
  // ("you're on the same side", talk it through calmly, conflict is normal): those could put them at risk.
  // "he shouts at me at the handover in front of Leo": safer handoffs first, and a promise that questions
  // about the child are still welcome (never ways to talk the shouting parent round)
  var HANDOFF_SHOUT = /\b(he|she|they|my ex|ex|his dad|her dad|their dad|her mum|his mum|their mum|her mom|his mom|their mom|the other parent)\b.{0,25}\b(shouts?|shouted|shouting|yells?|yelled|yelling|screams?|screamed|screaming|swears?|swore|swearing|kicks off|kicked off|goes off|went off)\b( at me)?.{0,60}\b(handovers?|handoffs?|hand ?overs?|hand ?offs?|drop ?offs?|pick ?ups?|exchanges?|in front of)\b|\b(at|during) (the )?(handovers?|handoffs?|hand ?overs?|hand ?offs?|drop ?offs?|pick ?ups?)\b.{0,40}\b(shouts?|shouted|shouting|yells?|yelled|yelling|screams?|screamed|swears?|swore)\b/;
  function kidNameIn(q) { var m = /\b(?:in front of|our (?:son|daughter|boy|girl|kid|child)|my (?:son|daughter|boy|girl|kid|child)|tell)\s+([A-Z][a-z]{1,14})\b/.exec(String(q || '')); return m && !/^(Me|Him|Her|Them|The|My|Our|His|Their|Mum|Mom|Dad)$/.test(m[1]) ? m[1] : ''; }
  // "can you check a message to my mum?", then the message; or a pasted "Mum, we'll decide about baptism ourselves."
  var CHECK_ASK = /\b(can|could|would|will) you (please )?(check|read|look at|look over|proofread|review|have a look at)\b.{0,25}\b(message|text|email|letter|note|reply|this)\b|^(please )?(check|read over|look over) (this|my) (message|text|email|reply)\b|\bis (this|it) (ok|okay|alright|fine|too much|too harsh) to send( this| it)?\s*[:?]?$|\bis (this|it) (ok|okay|alright|fine|too much|too harsh) to send\s*:|\bhow (does|will|would) this (sound|land|come across)\b/;
  var PASTED = /^(hi |hey |dear |hello )?(mum|mom|mam|mummy|mother|dad|daddy|father|nan|gran|grandma|grandad|babe|love|darling|[A-Z][a-z]{1,14})\s*,\s+\S+(\s+\S+){2,}/;
  // the answer to "one question first" ("A joke we both share" / "I'm upset with them" / "Neither, just show me")
  function checkAnswerOf(f) {
    return /\b(joke|joking|jokes|tease|teasing|banter|both share|we share)\b/.test(f) ? 'joke' : /\b(upset|angry|mad|annoyed|cross|furious|hurt)\b/.test(f) ? 'upset' : /\b(neither|skip|just show|not sure|show me|dunno|don t know)\b/.test(f) ? 'skip' : '';
  }
  function checkMsgTurn(state, q0, vf) {
    var t = String(q0 || '').trim(), m = /^[^:]{3,80}:\s*(.{8,})$/.exec(t), text = '', answer = '';
    var pre = m ? t.slice(0, t.indexOf(':')) : '';
    // the one question was asked last turn: read the message again with the answer
    if (state.checkAsk && (state.turn || 0) - state.checkAsk.turn === 1) {
      var ca = state.checkAsk; state.checkAsk = null;
      answer = checkAnswerOf(vf);
      if (answer) text = ca.text;
    }
    if (text) { /* answered */ } else if (CHECK_ASK.test(vf) || (m && /\b(is (this|it) (ok|okay|alright|fine|too much|too harsh) to send|check (this|my) (message|text)|how does this (sound|land))\b/i.test(pre))) {
      if (m && (CHECK_ASK.test(norm(pre)) || /\bto send\b|\b(message|text)\b|\bsound|land\b/i.test(pre))) text = m[1];
      else { state.checkWait = state.turn; return { blocks: [{ k: 'p', x: 'Yes. Paste or type the message here, just as you’d send it, and I’ll show how it may land and a warmer version, using the Chat analyzer’s rules. Nothing leaves this device.' }], chips: [], kind: 'care', id: 'checkask' }; }
    } else if ((state.checkWait && state.turn - state.checkWait === 1 && t.split(/\s+/).length >= 3 && !/^(no|nevermind|never mind|cancel|start over)\b/i.test(t)) || (PASTED.test(t) && !/^(hi |hey |hello )?(ok|okay|so|well|yes|yeah|no|nope|honestly|anyway|sorry|thanks|thank you|please|also|right|um|hmm|actually|basically|btw|lol|oh|ah|wait|look|listen|professor|puddles|again|then|now|and|but|because|like|ugh|great|fine|sure|hello|hi|hey)\s*,/i.test(t) && !/\?\s*$/.test(t) && !/\b(how|what|why|should) (do|can|should|would) i\b/i.test(t))) text = t;
    if (!text) return null;
    if (DANGER.test(norm(text))) return null;  // a threat or harm in it: the safety answer, never a rewrite
    var E = window.SignalEngine;
    if (!E) { if (seTried) return null; return { needSE: true }; }
    state.checkWait = 0;
    var an, rw, v;
    var actx = answer && E.answerCtx ? E.answerCtx(answer, {}) : null, aopt = answer ? { ctx: actx, answer: answer } : {};
    // who it's for, when Puddles knows (sig16): "to my ex", or the topic we're on (a breakup, co-parenting, a partner)
    var rel = checkRel(state, q0);
    if (rel) aopt.rel = rel;
    try { an = E.analyze(text, { channel: 'text' }); rw = E.rewrite(an, Object.assign({ wirings: ['general'], channel: 'text' }, aopt)); v = E.verdict ? E.verdict(an, E.score(an, ['general'], 'text', 'v'), rw, aopt) : null; } catch (e) { return null; }
    if (!an || an.danger || an.selfHarm || (v && v.id === 'danger')) return null;
    // a message reaching out to an ex: a gentle "sleep on it?", never a polished rewrite (sig16)
    if (v && v.exReach) {
      var el = v.link ? [[v.link[1], v.link[0]]] : [];
      return { blocks: [{ k: 'p', x: v.text }, { k: 'links', x: el.concat([['When you want to text them', '/after-a-breakup.html#texting']]) }],
        chips: [{ label: 'Check another message', q: 'Can you check a message for me?' }], kind: 'care', id: 'checkmsg-ex' };
    }
    // one question first (accuracy12): a short line aimed at "you" that the words alone can't settle ("You know what, I'm going to
    // beat your butt"): is it a joke you share, or are you upset with them? A clear threat never gets here: it's answered straight.
    var askq = !answer && E.askFirst ? (function () { try { return E.askFirst(an, { mode: 'send', rel: rel }); } catch (e) { return null; } })() : null;
    if (askq) {
      state.checkAsk = { text: text, turn: state.turn || 0 };
      return { blocks: [{ k: 'p', x: askq.q }], chips: askq.answers.map(function (a) { return { label: a.label, q: a.label }; }), kind: 'care', id: 'checkmsg-ask' };
    }
    var b = [{ k: 'p', x: 'Here’s how it may land, using the Chat analyzer’s rules: ' + ((v && v.text) || 'nothing stood out as harsh.') }];
    if (rw && !rw.unchanged && rw.main && norm(rw.main) !== norm(text)) {
      b.push({ k: 'script', l: 'A warmer way to say it', x: rw.main });
      var why = (rw.changes || []).map(function (c) { return c && c.why; }).filter(Boolean)[0];
      if (why) b.push({ k: 'p', x: why.replace(/"([^"]*)"/g, '“$1”') });
      if (/\[[^\]]+\]/.test(rw.main)) b.push({ k: 'note', x: 'Words in [brackets] are optional: keep them only if they’re true for you.' });
    } else b.push({ k: 'p', x: v && v.id !== 'ok' ? 'Only you know if they’ll take it as a joke. If you’re not sure, say plainly what you mean.'
      : 'I wouldn’t change much. Read it once more as if you were them, on a bad day, then send it when you’re calm.' });
    b.push({ k: 'links', x: [['Open it in the Chat analyzer for more options', '/signal-translator.html']].concat(v && v.addContext ? [['Add context in the Chat analyzer (who they are, whether you joke like this)', '/signal-translator.html#add-context']] : []) });
    return { blocks: b, chips: [{ label: 'Check another message', q: 'Can you check a message for me?' }], kind: 'care', id: 'checkmsg' };
  }
  function checkRel(state, q0) {
    var f = norm(q0 || '') + ' ' + norm(state.lastQ || ''), T = state.topic && state.topic.id, tc = topicRoot(state) || topicCard(state), r = tc && relOf(tc.id);
    if (/\b(my ex|to my ex|an ex|the ex|ex boyfriend|ex girlfriend|ex husband|ex wife)\b/.test(norm(q0 || '')) && !/\b(kids?|children|son|daughter|pick ?ups?|handovers?|custody)\b/.test(f)) return 'ex';
    if (/^(exstoptext|breakup|breakupwave)$/.test(T || '')) return 'ex';
    if (r === 'coparent' || /\bco ?parent\w*\b/.test(f)) return 'coparent';
    if (r === 'partner') return 'partner';
    return '';
  }
  function handoffReply(f, kid) {
    var k = kid || 'your child';
    var b = [{ k: 'p', x: 'That sounds really stressful, and it isn’t something you can fix by choosing better words. It’s worth changing how handoffs work, for you and for ' + k + '.' },
      { k: 'list', x: ['Keep handoffs short: times and bags only. Anything else goes by message, later.', 'Hand over somewhere public and busy, or through school or daycare, so you don’t have to meet at the door.', 'If something starts at the door, don’t answer it there: “Let’s do this by message,” and go.', 'Afterward, tell ' + k + ' it isn’t their worry: “Grown-ups sometimes get cross. You’re not in trouble.”', 'Keep the messages, with dates. If it keeps happening, a mediator or family lawyer can help you set up calmer handoffs.'] },
      { k: 'script', l: 'At the door', x: 'I’m not going to talk about this now. Message me later. Bye, ' + (kid || 'sweetheart') + ', see you Friday.' },
      { k: 'links', x: [['Four steps for calmer handoffs', '/co-parenting.html#handoff'], ['When the other parent won’t cooperate', '/co-parenting.html#parallel']] }];
    return { blocks: b, chips: [{ label: kid ? 'Telling ' + kid + ' about the plan' : 'Telling my child about the plan', q: 'How do I tell ' + (kid || 'my child') + ' about the new handoff plan?' }, { label: 'How should we word texts?', q: 'We only text, how should we word things?' }], kind: 'care', id: 'handoff' };
  }
  // "my husband yells at me" (no fear, no names, no threats): the ordinary question first, warmly, and one gentle line
  var YELLED_AT = /\b(he|she|they|my (partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse|fiance|fiancee))( sometimes| often| still| just| really)? (yells|screams|shouts|swears|snaps|raises (his|her|their) voice) at me\b/;
  function yelledAtReply(f) {
    return { blocks: [{ k: 'p', x: 'Being yelled at hurts, even when it comes from stress, and it’s fair to want it to stop.' },
      { k: 'list', x: ['Pick a calm time, not the moment it happens, and say how it lands: “When you shout at me, I stop being able to listen.”', 'Agree a pause word together: either of you can call a break, and you come back in twenty minutes.', 'Ask what’s going on for them: stress, tiredness, something underneath. That isn’t an excuse, but it helps you both change it.', 'If it happens most days, or it’s wearing you down, talking it through with a counselor can help.'] },
      { k: 'links', x: [['A pause plan for two', '/pursue-withdraw.html#plan']] }],
      chips: [{ label: 'What do I say?', q: 'What do I actually say?' }], kind: 'care', id: 'yelledat' };
  }

  // "he says he'll kill himself if I leave": a pressure sign, and their safety is not yours to carry by staying
  var THREAT_SELF = /\b(kill|hurt|harm|end) (himself|herself|themselves|themself|his life|her life|their life|it all)\b.{0,40}\b(if|unless|when) (i|we) (leave|left|go|went|break up|broke up|end (it|things)|split|stop|say no|see|tell)\b|\b(if|unless|when) (i|we) (leave|left|go|break up|end (it|things)|split|stop seeing)\b.{0,50}\b(kill|hurt|harm|end) (himself|herself|themselves|themself|his life|her life|their life|it all)\b|\b(threaten\w*|says|said|keeps saying|tells me|told me) (that )?(he|she|they)( will| ll| would| d| is going to| s going to| s gonna| is gonna)? (kill|hurt|harm) (himself|herself|themselves|themself)\b.{0,40}\b(leave|break up|go|split|end)\b/;
  function threatSelfReply(f) { return safeOnly('threatself'); }

  // "I'm the one who gets violent", "how do I stop hitting": the person writing is the one doing it
  var OWN_VIOLENT = /\b(i m|im|i am|i)( (the one|the one who|who|that))?( (always|sometimes|often|can|keep|kept|tend to|just))* (get|gets|getting|got|become|became|can get|can be|am|m) (so )?violent\b|\bi m the violent one\b|\bmy (own )?(violence|violent (side|streak|temper))\b|\bhow (do|can) i stop (being violent|hitting|hurting|pushing|grabbing|shoving) (him|her|them|my \w+|people)?\b/;
  function ownViolentReply(f) {
    var kids = /\b(son|daughter|kids?|child|children|baby|toddler)\b/.test(f);
    var b = [{ k: 'p', x: 'Thank you for being honest. Saying it out loud is the first step to stopping it, and it can change. Violence is never okay.' },
      { k: 'list', x: ['Right now: when you feel it rising, leave the room or the house, and don’t go back until your body has calmed down. Distance first, words later.',
        'Breathe in for 4 and out for 6 until it eases. Cold water on your face helps.'] },
      { k: 'links', x: [['Getting help with anger', '/parents.html#anger-help']] }];
    return { blocks: b, chips: [{ label: 'What do I do in the moment?', q: 'what do i do in the moment when i feel it rising' }], kind: 'care', id: 'ownviolent' };
  }

  // after a crisis reply: "I don't want to call anyone, just talk to me" gets a warm reply that stays, never a page excerpt
  function crisisStayReply() { return suicideOnly('crisis-stay'); }
  var CRISIS_STAY = /\b(talk to me|just talk|stay with me|don.?t want to (call|talk to|text|ring)|dont want to (call|talk to|text|ring)|can.?t call|cant call|no one|nobody|anyone|alone|lonely|i m scared|im scared|help me|what do i do|i don.?t know|i dont know|please|listen|why|tired|can.?t|cant|hurts?|pointless|worthless|no one cares|nobody cares|i m fine|im fine|it s fine|its fine|whatever|ok|okay|yes|no|maybe|i guess)\b/;
  // "gaslighting", "coercive control", "narcissist" typed on their own: what it means, plainly, then the signs and people to talk to
  var SAFETY_TERM = /^(what is |what s |whats |what does |define |meaning of |is it |signs of |am i being )?(a |an )?(gaslighting|gaslight|gaslighted|gaslit|coercive control|coercive|narcissists?|narcissism|narcissistic( abuse| personality| behaviou?r)?|love bombing|lovebombing|trauma bond(ing)?)( mean| meaning| means)?$/;
  var TERM_DEF = {
    gaslighting: 'Gaslighting is when someone keeps making you doubt your own memory or sense of what happened, for example by insisting that things you remember never happened, until you trust them more than yourself.',
    coercive: 'Coercive control is a pattern that takes away someone’s freedom bit by bit: watching them, limiting money or friends, threats, or rules they have to follow to avoid trouble. It can happen without any physical violence.',
    narcissist: '“Narcissist” is often used for someone who seems self-centered and short on empathy. Narcissistic personality disorder is a real diagnosis, but only a clinician can make it, and nobody can from a chat. What they do, and how you feel around them, matters more than the label.',
    love: 'Love bombing is a rush of intense attention, gifts and promises early on, which can later be used to pull someone close and then control them.',
    trauma: 'A trauma bond is a strong attachment to someone who hurts you, often built from cycles of harm followed by kindness. It can make leaving or even seeing the pattern very hard, and it is not a sign of weakness.'
  };
  function safetyTermReply(f) {
    var m = SAFETY_TERM.exec(f), w = m ? m[3] : '';
    var def = /^gasl/.test(w) ? TERM_DEF.gaslighting : /^coerc/.test(w) ? TERM_DEF.coercive : /^narc/.test(w) ? TERM_DEF.narcissist : /^love/.test(w) ? TERM_DEF.love : TERM_DEF.trauma;
    return { blocks: [{ k: 'p', x: def },
      { k: 'p', x: 'Some signs it has moved from ordinary conflict into control:' },
      { k: 'list', x: ['You change what you say or do to avoid their anger, or feel you’re walking on eggshells.', 'Name-calling, insults or putting you down, in private or in front of others.', 'You’re always the one to blame, and you’ve started to doubt your own memory.', 'They check on you, or limit who you see or what money you have.', 'You feel scared of them, or of how they’ll react.'] }],
      chips: [{ label: 'Something else', q: 'Start over' }], kind: 'safety', id: 'safetyterm' };
  }


  // Someone worried about THEIR OWN behaviour ("am I an abuser?", "is yelling at kids abuse?", "I scared my son"):
  // an honest line between yelling and abuse, real help for them, and no victim script or locked safety mode.
  var SELF_HARMFUL = /\b(am i|i m|im|i am|i might be|i think i m|i think im|worried i m|worried im|scared i m|scared im|afraid i m|afraid im|could i be|maybe i m|maybe im)\b.{0,12}\b(an |the |a )?(abuser|abusive( one)?|toxic( one)?|the problem|emotionally abusive|a bad (dad|father|mom|mum|mother|parent|husband|wife|partner))\b|\bis (it|yelling|shouting|screaming|losing my temper)\b.{0,30}\b(abuse|abusive)\b|\bi (scared|frightened|terrified) my (son|daughter|kid|kids|child|children|wife|husband|partner|family)\b|\bmy (son|daughter|kid|child|wife|husband|partner)\b.{0,20}\b(flinch\w*|is scared of me|is afraid of me|was scared of me|cowered)\b|\b(am i|could i be|have i been|i m|im|i am|worried i m|worried im|scared i m|scared im)( (really|actually))? (damaging|traumati[sz]ing|ruining|scarring|harming|messing up|screwing up) (my|the|our) (kids|children|son|daughter|child|family|boys|girls)\b/;
  // "sometimes I slam doors and punch the wall", "I throw things when I'm angry": the person writing is the one doing it.
  // Take it seriously without shaming, keep everyone safe now, and real help for them. Never the victim script.
  var OWN_AGG = /\b(i|i ve|ive|i have|i ll|i d)( (sometimes|often|always|keep|kept|just|end up|ended up|tend to|start|started|then|also|even|have|ve|get so (angry|mad) (that )?i|got so (angry|mad) (that )?i|get angry and|got angry and|lose it and|lost it and|lose my temper and|lost my temper and|lose my rag and|snap and|snapped and|get physical and))* (slam\w* (doors?|things|stuff|the door|cupboards?)|punch\w* (the |a |holes? in the )?(wall|walls|door|doors|things|stuff|holes?)|hit (the |a )?(wall|walls|door|doors|table|things)|kick\w* (the |a )?(wall|walls|door|doors|things|stuff|furniture)|throw\w* (things|stuff|plates|my phone|it|whatever)|threw (things|stuff|my phone|plates|a plate|a glass|the remote)|smash\w* (things|stuff|plates|my|the|a)|break (things|stuff)|broke (things|stuff|a door|the door)|grab\w* (my (wife|husband|partner|son|daughter|kid|kids|child)|him|her|them) (by|and)|shov\w* (my (wife|husband|partner|son|daughter|kid|kids|child)|him|her|them)|push\w* (my (wife|husband|partner|son|daughter|kid|kids|child)|him|her|them) (away|over|against|into|out)|hit (my (wife|husband|partner|son|daughter|kid|kids|child)|him|her|them))\b|\bwhen i m (angry|mad|furious) i (slam|punch|hit|kick|throw|smash|break)\w*|\bi (throw|threw|throwing) (things|stuff|\w+) at (my|him|her|them)\b/;
  // "I'm so angry I want to hurt him": the person writing might hurt someone
  var HURT_INTENT = /\b(i|i m|im|i am)( so| really| that)?( angry| mad| furious| livid| raging)?( (that|and))?( i)? (want|wanna|feel like i (could|want to|m going to)|m going to|am going to|m gonna|am gonna|could|might|need) (to )?(hurt|hit|punch|smack|slap|strangle|choke|beat( up)?|kill|attack) (him|her|them|someone|somebody|my (wife|husband|partner|boyfriend|girlfriend|ex|son|daughter|kid|kids|child|children|mum|mom|dad|brother|sister|roommate|boss))\b/;
  function ownAgg(f) {
    if (HURT_INTENT.test(f)) return true;
    if (!OWN_AGG.test(f)) return false;
    // "I hit the wall at work, I'm exhausted": the tiredness idiom, not a fist
    if (/\bhit (the |a )?wall\b/.test(f) && !/\b(slam|punch|kick|throw|threw|smash|angry|mad|furious|rage|temper|fist|hand)\w*/.test(f) && /\b(tired|exhaust\w*|energy|burn\w*|social|people|marathon|running|run|work|study\w*|week|day|mile)\b/.test(f)) return false;
    return true;
  }
  function ownAggReply(f) {
    var person = /\b(hit|grab\w*|shov\w*|push\w*) (my (wife|husband|partner|son|daughter|kid|kids|child)|him|her|them)\b|\b(throw|threw|throwing) \w+ at (my|him|her|them)\b/.test(f), intent = HURT_INTENT.test(f);
    if (intent) return { blocks: [
      { k: 'p', x: 'Thank you for saying it instead of doing it. That matters. Right now, put distance between you: leave the room, or the house, and don’t go back until your body has calmed down. Nobody needs to be hurt, including you.' },
      { k: 'list', x: ['Go somewhere you can’t reach them: outside, a walk around the block, the car parked up, a friend’s place.', 'Breathe in for 4 and out for 6 until the urge eases. Cold water on your face helps.'] },
      { k: 'links', x: [['Getting help with anger', '/parents.html#anger-help']] }],
      chips: [{ label: 'What do I do in the moment?', q: 'what do i do in the moment when i feel it rising' }], kind: 'care', id: 'ownagg' };
    var b = [{ k: 'p', x: 'Thank you for being honest about this. That takes courage, and it’s the first step to changing it. ' + (person ? 'Throwing things at someone, or putting hands on them, is serious: it frightens them, and someone can get hurt.' : 'Slamming doors, punching walls or throwing things is serious even when nobody is touched: it frightens the people who see it, and it’s a step closer to someone getting hurt.') + ' It isn’t a verdict on who you are, and it can change.' }];
    if (person) b.push({ k: 'p', x: 'If you have hit, shoved, grabbed, thrown things at or threatened anyone, that is abuse, and it has to stop.' });
    b.push({ k: 'p', x: 'Right now, keep everyone safe:' });
    b.push({ k: 'list', x: ['When you feel it rising, step away first: leave the room, or go outside. Say “I’m getting too angry. I’m taking a break, and I’ll be back in twenty minutes.”',
      'Breathe in for 4 and out for 6 until your body slows down. Don’t go back until it has.',
      'Later, repair: “I scared you when I slammed the door. That wasn’t okay, and it wasn’t your fault.” Then say what you’ll do differently.'] });
    b.push({ k: 'links', x: [['Is yelling abuse? (and getting help for your anger)', '/parents.html#is-yelling-abuse'], ['Getting help with anger', '/parents.html#anger-help'], ['When it’s you and your child: four steps', '/upset-right-now.html#parent-child']] });
    return { blocks: b, chips: [{ label: 'What do I do in the moment?', q: 'what do i do in the moment when i feel it rising' }, { label: 'How do I apologize?', q: 'how do i apologize to my family for yelling' }], kind: 'care', id: 'ownagg' };
  }
  // "what do I do when I'm about to yell", "I feel myself about to explode": the steps for right now, first
  var ANGER_NOW = /\b(in the moment|right then|right now|when) (when )?i (feel|can feel|notice) (it|my anger|the anger|myself) (rising|building|coming|boiling|getting (angry|mad))\b|\bi feel (it|my anger|the anger) (rising|building|coming on|boiling)\b|\b(i m|im|i am|when i m|when im|when i am|feel myself|i can feel myself|i feel like i m|i feel like im)( (just|really|so|about|going|gonna))* (about to|going to|gonna|ready to) (yell|shout|scream|snap|explode|lose it|blow up|lose my temper|lose my rag|boil over)\b|\bfeel myself (about to |going to |gonna )?(explode|exploding|snap|snapping|losing it|losing my temper|blowing up|boiling over)\b|^(i keep |i m |im |i am )?(losing|lose) my temper( with (the|my) (kids|children|son|daughter|partner|wife|husband|family))?$|\bbefore i (yell|shout|snap|explode|lose it|lose my temper)\b|^(about to|going to|gonna) (yell|shout|snap|explode|lose it)( at (the|my) (kids|children|son|daughter|partner|wife|husband))?$|\b(stop|calm down|calm myself) (myself )?(in the moment|before i (yell|shout|snap|explode))\b|^(so |ok |okay |but )?what (do|should|can) i (actually )?do in the moment$/;
  function angerNowReply() {
    return { blocks: [
      { k: 'p', x: 'Right now: step back, and say “I’m getting too loud, I’m going to take a breath.” Breathe in for 4 and out for 6, a few times, until your body slows down. Then come back and repair.' },
      { k: 'list', x: ['Step back or leave the room. Distance first, words later.',
        'Say the pause line out loud: “I’m getting too loud, I’m going to take a breath.” With a child, add “You’re not in trouble. I’m calming down.”',
        'Breathe in for 4 and out for 6, five or six times. Cold water on your hands or face helps too.',
        'Come back when you’re calm and repair: “I’m sorry I got loud. That wasn’t fair to you. Let’s try again.”',
        'Later, notice your first warning signs (a tight jaw, a louder voice, heat in your face) and write them in the Calm-Down Kit, so you can step back sooner.'] },
      { k: 'note', x: 'If it happens most days, or comes with throwing things, threats, or someone being scared of you, get support for yourself: your doctor, an Employee Assistance Program, or an anger-management group.' },
      { k: 'links', x: [['When it’s you and your child: four steps', '/upset-right-now.html#parent-child'], ['Is yelling abuse? (and getting help for your anger)', '/parents.html#is-yelling-abuse'], ['The Calm-Down Kit', '/workpapers/fill/wp-11.html']] }],
      chips: [{ label: 'How do I apologize?', q: 'how do i apologize to my family for yelling' }, { label: 'Getting help for my anger', q: 'where can i find help for my anger' }], kind: 'care', id: 'angernow' };
  }
  // "we both yell and sometimes shove each other": physical fights are a safety matter, whoever starts them
  var MUTUAL = /\b(we|we both|both of us)( (sometimes|often|always|end up|ended up|have|ve|get|got|just|even|kind of|kinda|started|start|both|then|also))* (shove|shoving|push|pushing|hit|hitting|slap|slapping|punch|punching|kick|kicking|grab|grabbing|scratch|scratching|bite|biting|get physical|got physical|physically fight|fight physically)\w*\b|\b(shove|push|hit|slap|punch|kick|grabb?|scratch|bite)\w* each other\b|\b(fights?|arguments?|rows?) (get|gets|got|getting|turn|turns|turned) physical\b|\bphysical fights?\b|\bwe (get|got) physical\b/;
  function mutualReply() { return safeOnly(); }

  // A parent whose child said they want to die: what to do now, for the parent, not the DV paragraph
  var CHILD_CRISIS = /\b(my|our) ((teenage |teen |little |young |eldest |oldest |youngest |\d+ ?(year|yr) ?old )?(son|daughter|child|kid|teen|teenager|boy|girl|stepson|stepdaughter|stepkid|grandson|granddaughter)|\d+ ?(year|yr) ?old)\b.{0,60}\b(wants? to die|wanted to die|want(s|ed)? to kill (himself|herself|themselves|themself)|suicid\w*|kill(ing)? (himself|herself|themselves|themself)|self ?harm\w*|hurt(ing|s)? (himself|herself|themselves|themself)|cut(s|ting)? (himself|herself|themselves|themself)|(doesn t|doesnt|does not|don t|dont) want to (live|be here|be alive|exist)|better off dead|end (his|her|their) life|no reason to live)/;
  function childCrisisReply() { return safeOnly('childcrisis'); }
  // "I cheated on my wife and she found out": an honest, non-shaming answer, and healing after hurt
  var CHEATED_ME = /\b(i|i ve|ive|i have|i had)( (also|just|actually|recently|once))? (cheated on|been unfaithful|was unfaithful|had an affair|been having an affair|m having an affair|am having an affair|slept with someone else)\b|\bmy affair\b/;
  var CHEATED_ON = /\b(he|she|they|my (partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse|fiance|fiancee))( (has|had|s))? (cheated|been cheating|was cheating|was unfaithful|been unfaithful|had an affair|been having an affair|slept with someone( else)?)\b|\bcheated on me\b|\bfound out about (his|her|their|the) affair\b|\b(his|her|their) affair\b/;
  function infidelityReply(me) {
    if (me) return { blocks: [
      { k: 'p', x: 'Thank you for being honest. This is a really hard moment for both of you. An affair is a serious breach of trust, and repair is possible for many couples, but it takes time, full honesty, and can’t be rushed.' },
      { k: 'list', x: ['Take full responsibility, with no “but”: “I did this. It was my choice, and it wasn’t your fault.”',
        'End the affair completely, and be open about that. Answer their questions honestly, even the hard ones, without blaming them or the relationship.',
        'Let them set the pace. Hurt, anger and questions often come in waves for months. That’s normal, not a sign it isn’t working.',
        'Trust comes back through changed actions over time, not one big apology.',
        'See a couples counselor who works with affairs: there are well-studied approaches for exactly this. A counselor for you alone can help you understand why it happened.'] },
      { k: 'note', x: 'Whether to stay together is their choice as much as yours. You can’t earn forgiveness on a timeline.' },
      { k: 'links', x: [['Healing after hurt: rebuilding trust', '/book/understanding-11-healing-in-depth.html#trust'], ['An apology that takes responsibility', '/apology-languages.html#responsibility']] }],
      chips: [{ label: 'How do I apologize?', q: 'how do i say sorry so it lands' }], kind: 'care', id: 'infidelity' };
    return { blocks: [
      { k: 'p', x: 'I’m so sorry. Finding out about an affair is one of the most painful things that can happen in a relationship, and the shock can feel physical. What you’re feeling is a normal response to a real betrayal, and it isn’t your fault.' },
      { k: 'list', x: ['You don’t have to decide anything today, whether that’s staying or leaving.',
        'Look after the basics: sleep, food, and one person you trust to talk to.',
        'Ask the questions you need answered when you’re ready. You deserve honest answers.',
        'If you both want to try, a couples counselor who works with affairs can help, and many couples do recover. A counselor just for you can help either way.',
        'If you’re worried about your sexual health, a sexual health clinic can test you confidentially.'] },
      { k: 'links', x: [['Healing after hurt', '/book/understanding-11-healing-in-depth.html#hurt'], ['Forgiveness, and what it isn’t', '/book/understanding-11-healing-in-depth.html#forgiveness']] }],
      chips: [], kind: 'care', id: 'infidelity' };
  }
  var AFTER_SAFE = /\b(he|him|his|she|her|they|them|partner|boyfriend|girlfriend|husband|wife|bf|gf|normal|overreact\w*|too sensitive|my fault|talk to|talk with|stop|friends?|money|phone|argue|argument|fight\w*|calm|leave|stay|love|counts?|is it|am i|what do i do|how do i)\b/;
  function afterSafeReply(f) {
    var b = [{ k: 'p', x: 'Because of what you told me earlier, I won’t suggest ways to talk them round or keep the peace. When someone is checking, limiting or frightening you, that isn’t a communication problem, and it isn’t yours to fix by saying things better.' }];
    if (/\b(normal|overreact\w*|too sensitive|counts?|is it (that )?bad|am i (being )?(dramatic|silly|crazy))\b/.test(f)) b.push({ k: 'p', x: 'What you described isn’t a normal part of disagreeing, and you’re not overreacting by asking about it. You don’t need to be hit for it to count.' });
    return { blocks: b, chips: [{ label: 'Something else', q: 'Start over' }], kind: 'safety' };
  }  // "should I take ashwagandha instead of my anxiety meds?": never stop or swap prescribed medicine without the prescriber
  var MEDS_SWAP = /\b(instead of|rather than|replace|replacing|swap|swapping|switch|switching|stop|stopping|come off|coming off|quit|quitting|get off|wean (myself )?off|ditch|go off|cut down)\b.{0,30}\b(my |the )?(meds|medication|medications|medicine|prescription|prescribed|antidepressants?|ssris?|sertraline|fluoxetine|citalopram|escitalopram|paroxetine|venlafaxine|prozac|zoloft|lexapro|anxiety (meds|medication|pills)|pills|tablets)\b/;
  function medsFirst(q, x) {
    if (!x || !x.blocks || x.kind === 'safety' || !MEDS_SWAP.test(norm(q))) return x;
    if (/don’t stop, cut down or swap/.test(JSON.stringify(x.blocks))) return x;
    x.blocks = [{ k: 'p', x: 'First, the important part: please don’t stop, cut down or swap a prescribed medicine without talking to your prescriber. Stopping suddenly can cause withdrawal and bring symptoms back, and some herbs interact with medicines. Your doctor or pharmacist can help you plan any change safely.' }].concat(x.blocks);
    return x;
  }
  function selfHarmfulReply(f) {
    var hurt = /\b(hit|hits|slap\w*|punch\w*|shov\w*|push\w*|grab\w*|threat\w*|kick\w*|choke\w*|throw|threw)\b/.test(f);
    var b = [{ k: 'p', x: 'It took courage to ask that, and asking it usually means you want to do better. Here’s an honest answer.' },
      { k: 'p', x: 'Yelling now and then, followed by a real repair, is not the same as abuse. It becomes a safety issue if your family is afraid of you, if it comes with threats, name-calling, breaking or throwing things, or control, or if it happens most days. If someone flinched or went quiet around you, take that seriously: not as a verdict on you, but as a sign to get support now.' }];
    if (hurt) b.push({ k: 'p', x: 'If you have hit, shoved, grabbed or threatened anyone, that is abuse, and it has to stop.' });
    b.push({ k: 'list', x: ['In the moment: stop, step back, say “I’m getting too loud, I’m going to take a breath,” and breathe for a minute.',
      'Afterward, repair: “I scared you when I yelled. That wasn’t okay, and it wasn’t your fault.” Then say what you’ll do differently.',
      'Write your triggers and first warning signs in the Calm-Down Kit, so you can catch it earlier.'] });
    b.push({ k: 'links', x: [['Is yelling abuse? (and getting help for your anger)', '/parents.html#is-yelling-abuse'], ['When it’s you and your child: four steps', '/upset-right-now.html#parent-child'], ['Getting help with anger', '/parents.html#anger-help'], ['The Calm-Down Kit', '/workpapers/fill/wp-11.html']] });
    return { blocks: b, chips: [{ label: 'How do I apologize?', q: 'how do i apologize to my family for yelling' }, { label: 'Getting help for my anger', q: 'where can i find help for my anger' }], kind: 'care' };
  }
  var AMBIG = [
    ['interrupt', /\bignor\w* (me|us)\b/, /\b(talk\w*|speak\w*|said|say|says|finish|interrupt\w*|cut|cuts|meetings?|conversations?|listen\w*|ideas?|words?|heard|opinion)\b/,
      'I want to get this right. Is it more about time and attention together, or about not being listened to when you talk?',
      [['Time and attention together', 'How do we get more time together? We hardly spend time together'], ['Not listened to when I talk', 'I keep getting interrupted and not heard when I talk']]]
  ];

  // ------------------------------------------------------------------ Professor Puddles' voice (tools/chat/personality.json → KB.pers)
  // At most one light line, and only on light, practical replies (a tool, a game, "thanks", nothing found). Never on safety,
  // care or someone's own situation, never when they sound upset, never inside a list or words they'd send, and never in
  // Quiet mode, Easy reading or short answers. A seeded random number, so the tests can repeat a conversation exactly.
  var FUN_UPSET = /\b(sad|upset|hurt\w*|cry|cried|crying|tears|scared|afraid|frightened|terrified|anxious|anxiety|panic\w*|worried|lonely|alone|grief|griev\w*|died|dead|death|passed away|funeral|loss|lost my|ill|illness|sick|cancer|pain|hospital|diagnos\w*|rehab|addict\w*|drunk|drinking|abus\w*|hits?|yell\w*|scream\w*|shout\w*|angry|furious|mad at|hate|depress\w*|exhausted|overwhelmed|stress\w*|burn\w* out|tired of|divorc\w*|separat\w*|breakup|broke up|break up|cheat\w*|affair|fight|fought|fighting|argu\w*|guilt\w*|ashamed|awful|terrible|horrible|miss|missing|suicid\w*|kill\w*|die|dying|harm\w*|unsafe|safe|threat\w*|control\w*|debt|broke|money trouble|custody|police|ptsd|nightmares?|not in the mood|no jokes|stop joking|be serious|plain answers?)\b/;
  function frand(state) {
    if (state.rs == null) { var sd = window.TOL_CHAT_SEED != null ? +window.TOL_CHAT_SEED : (Date.now() % 2147483646); state.rs = (sd % 2147483646) + 1; }
    state.rs = state.rs * 16807 % 2147483647;
    return (state.rs - 1) / 2147483646;
  }
  function quietOn() { var h = document.documentElement, c = (h && (h.className || (h.getAttribute && h.getAttribute('class')))) || ''; return /\btol-(quiet|easy)\b/.test(String(c)); }
  function funLine(state, bank) {
    var P = KB && KB.pers, list = P && P[bank] ? P[bank].filter(Boolean) : [];
    if (!list.length) return '';
    var seen = state.funSeen || (state.funSeen = []), n = (P.rules && P.rules.no_repeat_within) || 8;
    var fresh = list.filter(function (x) { return seen.indexOf(x) === -1; });
    if (!fresh.length) fresh = list;
    var x = fresh[Math.floor(frand(state) * fresh.length) % fresh.length];
    seen.push(x); while (seen.length > n) seen.shift();
    return x;
  }
  var GAME_CARDS = /^(garden|pauseplay|wordbloom|quietcross|dailycross|quietwords|journey|palcam|soundscapes|album|podcast|buddies|buddiess2|buddieslive|buddiesmvmaker|buddiesmusicvideo|bearsdojo|recheckdrive|brainbreak|findsound|senses|drift|syncviz|gamefortwo|kidswatch)$/;
  function flair(state, q, r) {
    var P = KB && KB.pers;
    if (!P || !r || !r.blocks || !r.blocks.length || r.fun) return r;
    if (r.kind === 'deep') return r;   // deep talk is never joked about
    var R = P.rules || {}, k = r.kind || 'search', f = norm(q);
    // after anything serious, stay plain: for good after safety, and after care or someone's situation until a light topic
    if (/^(safety|redflag)$/.test(k) || state.unsafe || state.crisis) { state.plain = 2; return r; }
    if (/^(care|care-more|sit|sit-more|road|road-more|nohelp|calc|lang|ask|read|crude|frust)$/.test(k)) { state.plain = Math.max(state.plain || 0, 1); return r; }
    if ((R.never_on_kinds || []).indexOf(k) !== -1) return r;
    if (FUN_UPSET.test(f) || DANGER.test(f) || NOT_LIVE.test(f) || SELF_HARMFUL.test(f) || VERBAL.test(f)) return r;
    var txt = JSON.stringify(r.blocks);
    if (hasSafeLine(txt)) return r;
    var card = (k === 'card' || k === 'card-more') && r.id ? cardById(r.id) : null;
    var light = card ? (card.kind === 'tool' || (R.light_card_ids || []).indexOf(card.id) !== -1) : false;
    if (light || k === 'thanks' || k === 'fun') { if (state.plain === 1) state.plain = 0; }
    if (state.plain) return r;
    if (card && !light) return r;
    var quiet = quietOn() || state.easy || state.brief;
    var sec = (R.section_for_kind || {})[k];
    // a real question about someone's own life gets the answer first: a comic opener never stands in front of it
    var personalQ = /\b(i|we|my|our|me|us|im|ive|were)\b/.test(f) && k !== 'fun';
    var openerOk = !quiet && !personalQ && (light || (R.opener_kinds || []).indexOf(k) !== -1 || k === 'fun');
    var closerOk = light || (R.closer_only_kinds || []).indexOf(k) !== -1 || (R.opener_kinds || []).indexOf(k) !== -1;
    // the kinds with their own voice: "thanks", nothing found, a choice to make
    // gibberish keeps its plain "I didn't catch that": a joke there reads as not listening
    if (k === 'unclear') return r;
    if (sec && !quiet) {
      var line0 = funLine(state, sec);
      if (!line0) return r;
      var b0 = r.blocks[0];
      if (k === 'thanks' && b0.k === 'p') b0.x = line0;
      else if ((k === 'none' || k === 'offtopic' || k === 'unclear') && b0.k === 'p') {
        var tail = b0.x.match(/(I don’t have a page on that yet[\s\S]*|You could tell me[\s\S]*|I stick to this program[\s\S]*|Could you say it another way[\s\S]*)$/);
        b0.x = line0 + (tail ? ' ' + tail[1] : '');
      } else if (k === 'clarify' && r.amb) r.blocks.unshift({ k: 'p', x: line0, fun: 1 });
      else return r;
      r.fun = 1;
      return r;
    }
    if (!openerOk && !closerOk) return r;
    var roll = frand(state), co = R.chance_opener != null ? R.chance_opener : 0.6, cc = R.chance_closer != null ? R.chance_closer : 0.3;
    if (openerOk && roll < co) {
      var op = funLine(state, card && GAME_CARDS.test(card.id) && P.game_and_play ? 'game_and_play' : 'light_openers');
      if (op) { r.blocks.unshift({ k: 'p', x: op, fun: 1 }); r.fun = 1; }
    } else if (closerOk && roll >= (openerOk ? co : 0) && roll < (openerOk ? co : 0) + cc) {
      var cl = funLine(state, 'light_closers');
      if (cl) { r.blocks.push({ k: 'p', x: cl, fun: 1 }); r.fun = 1; }
    }
    return r;
  }
  // "tell me a joke", "lol", "you're funny": answered in character (jokes only when asked)
  var JOKE_ASK = /\b(tell|give|got|know|hear|share|say|want|need)\b.{0,12}\b(a |another |any |one more |some |your best )?(joke|jokes|pun|puns|something funny|funny one)\b|^(a |another |one more |more )?(joke|jokes|pun)( please)?$|^another( one)?( please)?$|\bmake me (laugh|smile)\b|\bcheer me up with a joke\b/;
  var LOL = /^(lol|lmao|lmfao|rofl|haha\w*|hehe\w*|ha ha( ha)?|ha|heh|that s funny|thats funny|so funny|very funny|hilarious|good one|nice one|(you re|youre|you are) (so |really |very )?(funny|hilarious|a hoot|a riot))( lol| haha)?( puddles| professor)?$/;
  function funTurn(state, f) {
    var P = KB && KB.pers;
    if (!P) return null;
    // never a joke next to something sad or serious ("tell me a joke, my dog died"): the care routes answer that
    if (FUN_UPSET.test(f) || pzSerious(f) || pzHint(state, stNorm(f))) return null;
    var lastFun = state.lastKind === 'fun';
    if (JOKE_ASK.test(f) && (!/^another( one)?( please)?$/.test(f) || lastFun)) {
      var j = funLine(state, 'jokes');
      if (!j) return null;
      return { blocks: [{ k: 'p', x: j }], chips: [{ label: 'Another joke', q: 'Tell me another joke' }, { label: 'Something else', q: 'What can I ask?' }], kind: 'fun', fun: 1 };
    }
    if (LOL.test(f)) {
      var t = funLine(state, 'thanks_replies');
      if (!t) return null;
      return { blocks: [{ k: 'p', x: t }], chips: [{ label: 'Tell me a joke', q: 'Tell me a joke' }, { label: 'Something else', q: 'What can I ask?' }], kind: 'fun', fun: 1 };
    }
    return null;
  }

  // ---------- infographics: "make an infographic about the mental load", "make me a chart: me 60 them 40",
  // "summarise this as an infographic" (the last answer). Never of a safety reply, and never in place of one.
  var IG_ASK = /\b(infographic|info ?graphic|poster|cheat ?sheet|one ?pager|visuali[sz]\w*|diagram|graphic|picture|chart|graph|mind ?map|timeline|draw|sketch|illustrate|map out)s?\b/;
  function igTurn(state, q, f) {
    // "make another": a new topic, never a picture of my own last reply
    if (/^(please )?(make|draw|do|create)( me| us)? another( one| infographic| picture| poster| graphic)?( please)?$/.test(f) || (state.lastKind === 'info' && /^(another|another one|one more)$/.test(f))) {
      return { blocks: [{ k: 'p', x: 'Happy to! What should the next one be about? For example “the mental load,” “active listening” or “a good pause.”' }],
        chips: [{ label: 'The mental load', q: 'Make an infographic about the mental load' }, { label: 'Active listening', q: 'Make a step by step infographic about active listening' }, { label: 'A good pause', q: 'Make an infographic about taking a good pause' }], kind: 'clarify', id: 'ig-next' };
    }
    if (!IG_ASK.test(f)) return null;
    if (DANGER.test(f) || NOT_LIVE.test(f) || SELF_HARMFUL.test(f) || VERBAL.test(f)) return null;
    var IG = window.TOLInfographic;
    if (!IG) { if (igTried) return null; return { needIG: true }; }
    // "show fair vs equal as a picture", "draw fair vs equal as a diagram": the same as "make an infographic about …"
    var asPic = /^\s*(?:can you |could you |please )?(?:show|draw|sketch|give)(?: me| us)? (.+?) (?:as|in) (?:an? )?(?:picture|diagram|chart|poster|infographic|graphic|visual|image)\s*(?:please)?[?.!]*\s*$/i.exec(String(q));
    var rq = null; try { rq = IG.parseRequest(asPic ? 'make an infographic about ' + asPic[1] : q); } catch (e) { rq = null; }
    if (!rq) return null;
    // after a safety reply (or once someone has told us about danger), no pictures: privacy and safety come first
    if (state.unsafe || state.lastKind === 'safety' || state.lastKind === 'redflag') {
      return { blocks: [{ k: 'p', x: 'I won’t make a picture of this one. Pictures can be saved and shared, and what you told me deserves to stay private.' }], chips: [], kind: 'safety' };
    }
    var spec = null, src = '';
    try {
      if (rq.last && state.lastKind === 'info') return { blocks: [{ k: 'p', x: 'Happy to make another! What should it be about?' }], chips: [{ label: 'The mental load', q: 'Make an infographic about the mental load' }, { label: 'Active listening', q: 'Make a step by step infographic about active listening' }, { label: 'A good pause', q: 'Make an infographic about taking a good pause' }], kind: 'clarify', id: 'ig-next' };
      if (rq.last) {
        var L = state.last, LR = state.lastReply;
        if (state.deepLast && state.lastKind === 'deep' && dById(state.deepLast)) spec = IG.fromDeep(dById(state.deepLast));
        else if (L && L.kind === 'sit' && KB.sit && KB.sit.issues && KB.sit.issues[L.issue]) spec = IG.fromSituation(KB.sit.issues[L.issue], { who: whoCtx(L.who, L.noun), whoKey: L.who, self: L.who === 'self', id: L.issue });
        else if (L && L.card && cardById(L.card)) spec = IG.fromCard(cardById(L.card), rq.layout || null);
        else if (state.care && cardById(state.care.id) && (state.turn || 0) - state.care.turn <= 2) spec = IG.fromCard(cardById(state.care.id), rq.layout || null);
        if (!spec && LR && LR.blocks && LR.blocks.length) spec = IG.fromAnswer(LR.blocks, { title: (L && (L.topic || L.q)) || '' });
        if (!spec) return { blocks: [{ k: 'p', x: 'Happy to! What should it be about? For example “the mental load,” “fair isn’t always equal” or “me 60 them 40.”' }],
          chips: [{ label: 'The mental load', q: 'Make an infographic about the mental load' }, { label: 'Fair vs equal', q: 'Make an infographic about fair vs equal' }], kind: 'clarify' };
      } else {
        var tp = String(rq.topic || '').trim(), aud = '';
        // the topic wins over the audience: "the steps of active listening for teenagers" is active listening, made for teens
        var am = /^(.{3,}?)\s+(?:for|aimed at|suitable for)\s+((?:my |our |the )?(?:teen\w*|kids?|children|class(?:room)?|students|pupils|parents|couples|famil(?:y|ies)|grandparents|team|staff|colleagues|adults|older people|young people|beginners))$/i.exec(tp);
        if (am) { tp = am[1]; aud = am[2].replace(/^(my|our|the) /i, ''); }
        tp = tp.replace(/^(?:the |a |some )?(?:(?:simple|easy|basic|main|key|five|four|three|\d+) )?(?:steps?|stages?|tips?|rules?) (?:of|for|to|in)\s+/i, '').trim() || tp;
        if (!tp) return { blocks: [{ k: 'p', x: 'Happy to! What should it be about? For example “the mental load,” “fair isn’t always equal” or “me 60 them 40.”' }],
          chips: [{ label: 'The mental load', q: 'Make an infographic about the mental load' }, { label: 'Fair vs equal', q: 'Make an infographic about fair vs equal' }, { label: 'A good pause', q: 'Make an infographic about taking a good pause' }], kind: 'clarify' };
        if (DANGER.test(norm(tp)) || VERBAL.test(norm(tp))) return null;
        spec = IG.fromKB(tp, KB, { layout: rq.layout });
        // a Library theme card only describes the Library: draw from the entry on the topic itself ("active listening")
        if (!spec || /^lib-/.test(spec.from || '')) {
          var tk = stNorm(tp).replace(/^(the|a|an) /, ''), gd = glossaryFor(tp), dsrc = gd >= 0 ? gd : -1;
          if (dsrc < 0) search(tp).hits.slice(0, 12).some(function (h) { var d = KB.docs[h.i]; if (!d.tip && stNorm(d.h).indexOf(tk) !== -1 && h.cov >= 0.6) { dsrc = h.i; return true; } return false; });
          if (dsrc >= 0) {
            var dd = KB.docs[dsrc], sp2 = null;
            try { sp2 = IG.fromAnswer([{ k: 'passage', h: pageName(dd.h), x: [dd.x] }], { title: pageName(dd.h), source: safePath(dd.u) ? dd.u : '' }); } catch (e) { sp2 = null; }
            if (sp2) { sp2.from = 'doc-' + dsrc; spec = sp2; }
          }
        }
        // nothing to draw from the cards: a deep topic on it ("the double empathy problem") can still make a picture
        if (!spec && KB.deep) {
          var tpn = stNorm(tp).replace(/^(the|a|an) /, ''), dh = deepFind(stNorm(tp), norm(tp)) || deepLoose(stNorm(tp));
          // or a deep topic that explains it in its own words ("double empathy" lives in the autistic-lens topic)
          if (!dh && tpn.split(' ').length >= 2) { var core = tpn.replace(/ (problem|idea|theory|effect)$/, ''); dTopics().concat(dBig()).some(function (T) { var tx = stNorm([T.title, T.philosophy, T.psychology, T.autistic_lens].join(' ')); if (tx.indexOf(core) !== -1) { dh = { t: T }; return true; } return false; }); }
          if (dh && dh.t && (dh.t.philosophy || dh.t.psychology)) spec = IG.fromDeep(dh.t);
        }
        if (!spec) return { blocks: [{ k: 'p', x: 'I don’t have enough on “' + tp + '” to draw it well. I can make one about the mental load, fair vs equal, a good pause, or any tool or worry here. What would you like?' }],
          chips: [{ label: 'The mental load', q: 'Make an infographic about the mental load' }, { label: 'Fair vs equal', q: 'Make an infographic about fair vs equal' }], kind: 'clarify' };
      }
    } catch (e) { spec = null; }
    if (!spec) return null;
    if (typeof aud === 'string' && aud && !spec.kicker) spec.kicker = 'For ' + aud.toLowerCase();
    src = spec.source && safePath(spec.source) ? spec.source : '';
    var b = [{ k: 'p', x: spec.sensitive ? 'Here it is as a picture. To keep it private, it has no save or share button.' : 'Here’s a little picture of it. You can save it, share it or print it.' }, { k: 'info', spec: spec }];
    if (src) b.push({ k: 'links', x: [['Read the page this comes from', src]] });
    var igc = [{ label: 'Make another', q: 'Make another infographic' }];
    if (!/^(split|checklist)$/.test(spec.layout) && !spec.sensitive && spec.items && spec.items.length >= 3) igc.unshift({ label: 'Make it a checklist', q: 'Make a checklist infographic of ' + (spec.title || 'this') });
    return { blocks: b, chips: igc, kind: 'info', id: spec.from || spec.layout || 'info', noBrief: true };
  }
  // under an ordinary answer with steps or words to say: offer it as a picture
  function igChip(state, r) {
    if (!r || !r.blocks || state.unsafe || !/^(card|card-more|sit|sit-more|term|bg|bg-more|deep|search)$/.test(r.kind || 'search') || r.id === 'intro' || r.id === 'nomatch' || r.id === 'infographic') return r;
    if (!r.blocks.some(function (b) { return b.k === 'list' || b.k === 'script' || b.k === 'h'; })) return r;
    if (/\/safety\.html/.test(JSON.stringify(r.blocks))) return r;
    r.chips = r.chips || [];
    if (r.chips.length < 5) r.chips.push({ label: 'Make this an infographic', q: 'Summarise this as an infographic' });
    return r;
  }

  // ---------- deep talk (tools/chat/deep.json → KB.deep): "talk deep" switches it on for this tab, "keep it light" switches it off.
  // In deep mode a big question ("what is love?") gets philosophy, psychology and an autistic lens, put together, with a
  // question to sit with and one thing to try. Safety, danger and someone's own hard situation always come first, and
  // deep replies never carry a joke. Outside deep mode, an ordinary answer on a deep topic offers "Go deeper on this".
  function deepOn(state) {
    if (state.deep == null) { try { state.deep = sessionStorage.getItem('tol-chat-deep') === '1'; } catch (e) { state.deep = false; } }
    return !!state.deep;
  }
  function setDeep(state, on) { state.deep = !!on; try { sessionStorage.setItem('tol-chat-deep', on ? '1' : '0'); } catch (e) {} }
  function dget(o, keys) { for (var i = 0; o && i < keys.length; i++) if (o[keys[i]] != null && o[keys[i]] !== '' && !(Array.isArray(o[keys[i]]) && !o[keys[i]].length)) return o[keys[i]]; return null; }
  function dlist(x) { return x == null ? [] : Array.isArray(x) ? x : [x]; }
  function dPick(state, x) { var l = dlist(x).filter(function (s) { return typeof s === 'string' && s; }); return l.length ? l[Math.floor(frand(state) * l.length) % l.length] : ''; }
  // a phrase list: plain phrases match the whole message (after "let's", "please" and the like); anything regex-like is a regex
  function dPhraseRes(list) {
    return dlist(list).map(function (p) {
      if (typeof p !== 'string' || !p.trim()) return null;
      if (/[\^$\\()[\]|?*+]/.test(p)) { try { return new RegExp(p, 'i'); } catch (e) { return null; } }
      return new RegExp('^(?:(?:lets|let s|can we|could we|i want to|i wanna|id like to|i d like to|please|ok|okay|so|hey|puddles|professor) )*' + stNorm(p).replace(/\s+/g, ' ') + '(?: (?:please|puddles|professor|now|with me|for a bit|for a while))*$', 'i');
    }).filter(Boolean);
  }
  function dRes(o) {
    if (o._re) return o._re;
    var out = [];
    dlist(dget(o, ['patterns', 'pattern', 'regex', 're'])).forEach(function (src) { try { out.push(new RegExp(src, 'i')); } catch (e) {} });
    dlist(dget(o, ['keywords', 'match', 'triggers', 'phrases', 'keys'])).forEach(function (w) {
      if (typeof w === 'string' && stNorm(w)) out.push(new RegExp('\\b' + stNorm(w).replace(/\s+/g, '\\s+') + '\\b', 'i'));
    });
    return (o._re = out);
  }
  function dTopics() {
    var D = KB && KB.deep; if (!D) return [];
    if (D._all) return D._all;
    var t = D.topics || [], all = [];
    if (!Array.isArray(t)) Object.keys(t).forEach(function (k) { var x = t[k]; if (x && typeof x === 'object') { if (!x.id) x.id = k; all.push(x); } });
    else all = t.slice();
    return (D._all = all);
  }
  function dTitle(t) { return String(dget(t, ['title', 'name', 'label', 'topic', 'id']) || 'this'); }
  function dById(id) { var s = stNorm(id); return dTopics().concat(dBig()).filter(function (t) { return t && (stNorm(t.id || '') === s || stNorm(dTitle(t)) === s); })[0] || null; }
  function dBig() {
    var D = KB && KB.deep, bq = (D && (D.big_questions || D.questions)) || [];
    return Array.isArray(bq) ? bq : Object.keys(bq).map(function (k) { var x = bq[k]; if (x && typeof x === 'object' && !x.id) x.id = k; return x; });
  }
  function dRule(k) { var D = KB && KB.deep; return D && ((D.rules && D.rules[k] != null) ? D.rules[k] : D[k]); }
  // the deep entry for a message: the big questions first (they are more specific), then the topics; first match wins
  function deepFind(fs, f) {
    var D = KB && KB.deep; if (!D || !fs) return null;
    var byName = dById(fs); if (byName) return { t: byName, big: dBig().indexOf(byName) !== -1 };
    var lists = [dBig(), dTopics()];
    for (var l = 0; l < lists.length; l++) for (var i = 0; i < lists[l].length; i++) {
      var T = lists[l][i]; if (!T || typeof T !== 'object') continue;
      if (dRes(T).some(function (re) { return re.test(fs) || re.test(f); }) || stNorm(dget(T, ['question', 'q', 'title']) || '') === fs) {
        var tid = dget(T, ['topic', 'topic_id']); var R = tid ? dById(tid) : null;
        return { t: R || T, bq: R ? T : null, big: l === 0 };
      }
    }
    return null;
  }
  // "talk deep about what love is": an entry whose title words all appear in the message (big questions first)
  function deepLoose(fs) {
    var w = ' ' + fs + ' ', lists = [dBig(), dTopics()];
    for (var l = 0; l < lists.length; l++) for (var i = 0; i < lists[l].length; i++) {
      var T = lists[l][i], tw = stNorm(dTitle(T)).split(' ').filter(function (x) { return x.length > 2 && !STOP[x]; });
      if (tw.length && tw.every(function (x) { return w.indexOf(' ' + x + ' ') !== -1 || w.indexOf(' ' + x.replace(/s$/, '') + ' ') !== -1; })) return { t: T, big: l === 0 };
    }
    return null;
  }
  var DEEP_SECTIONS = [
    ['philosophy', 'Philosophy', ['philosophy', 'philosophical']],
    ['psychology', 'Psychology', ['psychology', 'research']],
    ['autistic_lens', 'Through an autistic lens', ['autistic_lens', 'autism_lens', 'autistic']],
    ['together', 'Putting it together', ['together', 'putting_it_together']],
    ['question', 'A question for you', ['question', 'reflective_question']],
    ['try', 'Try this', ['try', 'try_this']]];
  function dParas(v) {
    var out = [];
    dlist(v).forEach(function (x) {
      if (typeof x === 'string') { if (x.trim()) out.push({ k: 'p', x: x }); }
      else if (x && typeof x === 'object') { var tx = dget(x, ['x', 'text', 'body']); if (tx) out.push({ k: 'p', x: dlist(tx).join(' ') }); }
    });
    return out;
  }
  function dLinks(T) {
    return safeLinks(dlist(dget(T, ['links'])).map(function (l) { return Array.isArray(l) ? l : l && (l.u || l.url) ? [l.t || l.title || l.u || l.url, l.u || l.url] : null; }).filter(Boolean));
  }
  function dChips(state, T) {
    var fu = dlist(dRule('follow_ups')).filter(function (x) { return typeof x === 'string' && !/keep it light|big question/i.test(x); }), chips = [];
    for (var n = 0; n < 2 && fu.length; n++) { var x = fu.splice(Math.floor(frand(state) * fu.length) % fu.length, 1)[0]; chips.push({ label: x, q: x }); }
    chips.push({ label: 'Another big question', q: 'Ask me a big question' });
    chips.push({ label: 'Keep it light', q: 'Keep it light' });
    return chips;
  }
  // only: one section key ("autistic_lens") for a follow-up like "and through an autistic lens?"
  // the Part Three chapter ("Understanding people") that goes with a deep topic, added to its links
  var PART3 = [[/naming-feelings|love-and-anger|^anger$/, '1-feelings', 'How feelings work'], [/read-your-state|pause-when-flooded|^rest$|guilty-resting|different-hours/, '2-stress', 'Stress and the nervous system'],
    [/their-side|keeping-score|why-keep-score|being-misunderstood|taken-for-granted/, '3-seeing', 'How we see each other'], [/say-what-you-mean|tone-in-texts|pursue-withdraw|really-listening|knowing-what-they-mean|is-honesty-kind|why-we-fight/, '4-communication', 'How communication works'],
    [/what-is-love|^bids$|friendship|good-friend|needing-people|more-than-two|chosen-and-blended|what-makes-a-home|quiet-togetherness/, '5-belonging', 'Attachment, trust and belonging'],
    [/can-people-change|why-change-is-hard|complacency|same-fight-again|routines|needing-routines|fix-the-setup/, '6-change', 'Habits and change'],
    [/what-is-the-self|what-is-enough|are-boundaries-selfish|^boundaries$|okay-to-be-different/, '7-worth', 'Self-worth, shame and self-compassion'], [/^grief$|life-changes|on-your-own|apart-and-home/, '8-loss', 'Loss, grief and big life changes'],
    [/autistic-lens|neurodiversity|masking|^wiring$|deep-interests|sensory-needs/, '9-minds', 'Minds that work differently'], [/what-gives-meaning|what-is-kindness|what-we-owe|faith-and-culture|worth-working-on|what-is-acceptance|family-duty/, '10-values', 'Values, meaning and a good life'],
    [/^repair$|^apology$|forgiv|siblings-and-rifts/, '11-healing', 'Healing after hurt'], [/caregiving|illness-and-energy|^parenting$|co-parenting/, '12-helping', 'Helping others well']];
  function part3Link(id) {
    for (var i = 0; i < PART3.length; i++) if (PART3[i][0].test(String(id || ''))) return ['Understanding people: ' + PART3[i][2], '/book/understanding-' + PART3[i][1] + '.html'];
    return null;
  }
  function deepReply(state, hit, only) {
    var T = hit.t, b = [], id = String(T.id || dTitle(T));
    var safetyTopic = dlist(dRule('safety_topic_ids')).indexOf(T.id) !== -1;
    // fear, control or harm: the short neutral reply only (the owner's decision)
    if (safetyTopic) { state.last = null; state.deepLast = id; return safeOnly('deep-' + id); }
    if (!only) b.push({ k: 'p', x: dTitle(T).replace(/\?$/, '') === dTitle(T) ? 'Let’s think about ' + dTitle(T).charAt(0).toLowerCase() + dTitle(T).slice(1) + '.' : dTitle(T) });
    var keys = only === 'links' ? [] : only ? [only, 'together'] : safetyTopic ? ['together'] : DEEP_SECTIONS.map(function (S) { return S[0]; });
    var links = dLinks(T), p3 = part3Link(T.id);
    if (p3 && !links.some(function (l) { return l[1] === p3[1]; })) links.splice(Math.min(2, links.length), 0, p3);
    (only ? DEEP_SECTIONS.slice().sort(function (a, c) { return keys.indexOf(a[0]) - keys.indexOf(c[0]); }) : DEEP_SECTIONS).forEach(function (S) {
      if (keys.indexOf(S[0]) === -1) return;
      var ps = dParas(dget(T, S[2])); if (!ps.length) return;
      b.push({ k: 'h', x: S[1] }); b = b.concat(ps);
    });
    if (links.length) b.push({ k: 'links', x: links.slice(0, 4) });
    state.last = null; state.deepLast = id;
    return { blocks: b, chips: dChips(state, T), kind: 'deep', id: id, noBrief: true };
  }
  function deepLine(state, key, fallback) { return nameFill(dPick(state, dRule(key)) || fallback, chatName(state)); }
  function deepIntro(state) {
    var ex = [];
    dBig().forEach(function (B) { var qq = B && dget(B, ['title', 'question', 'q']); if (typeof qq === 'string') ex.push(qq); });
    var pickd = [];
    for (var n = 0; n < 3 && ex.length; n++) pickd.push(ex.splice(Math.floor(frand(state) * ex.length) % ex.length, 1)[0]);
    state.last = null;
    return { blocks: [{ k: 'p', x: deepLine(state, 'intro', 'Deep talk it is. Ask me a big question, and we’ll look at it through philosophy, psychology and an autistic lens.') },
      { k: 'p', x: 'Ask me a big question' + (pickd.length ? ', like “' + pickd[0] + '”' : '') + ', or name a part of life you’re thinking about. Say “keep it light” whenever you want to come back up.' }],
      chips: pickd.map(function (x) { return { label: x, q: x }; }).concat([{ label: 'Keep it light', q: 'Keep it light' }]), kind: 'deep', id: 'intro', noBrief: true };
  }
  var DEEP_IN = /^(?:(?:lets|let s|let us|can we|could we|shall we|i want to|i wanna|id like to|i d like to|please|ok|okay|so) )*(?:talk deep|go deep|get deep|talk deeper|deep talk|deep mode|deep chat|deep conversation|get philosophical|talk philosophy|think deep|think deeply|ask me a big question|ask me something deep|give me a big question|another big question|one more big question)(?: (?:please|now|with me|for a bit|puddles|professor))*$/;
  // "talk deep about love", "talk deep: what is love?", "talk deep, is honesty always kind?", "deep: can people change?"
  var DEEP_ABOUT = /^(?:(?:lets|let s|can we|could we|please|ok|okay) )*(?:talk deep|go deep|go deeper|get deep|think deep|deep talk|deep chat|get philosophical)(?: (?:about|on|into))? (?:the )?(.+)$|^go deeper on (?:the )?(.+)$/;
  var DEEP_OUT = /^(?:(?:lets|let s|can we|could we|please|ok|okay|i want to|id like to) )*(?:(?:back to )?(?:small talk|light talk|normal mode|normal chat|light mode)|stop (?:being )?deep|(?:exit|leave|end|stop) deep(?: mode| talk)?|too deep|less deep|something lighter|lighter please|keep it light|back to normal)(?: please| now)?$/;
  // a follow-up about the last deep topic: which part they asked for
  var DEEP_FU = [[/\b(autis\w*|neurodiverg\w*|double empathy|sensory|predictable|rule out loud|say (this|it) plainly|plainly)\b/, 'autistic_lens'],
    [/\b(research|science|psycholog\w*|studies|study|evidence|source|sources|cite|citation|who came up with)\b/, 'psychology'],
    [/\b(stoics?|aristotle|plato|kant|philosoph\w*|confucius|buddh\w*|socrates|thinkers?|care ethic\w*|iris murdoch|murdoch|rawls|ubuntu|arendt|hannah arendt)\b/, 'philosophy'],
    [/\b(question to ask)\b/, 'question'], [/\b(page to read|something to read|read more)\b/, 'links'],
    [/\b(tonight|use this|one small thing|smallest version|try|repair look like|in my control|do about it|practical|in practice|what can i do)\b/, 'try'],
    [/\b(sum (it )?up|together|bottom line|so what|kind and honest|their side|setup|fairest|fairness or feeling seen)\b/, 'together']];
  var DEEP_FU_LEAD = /^(and|what would|what does|what do|what s|whats|how do i|how does|how could|how might|is it|is there|is this|give me|say the|show me|one small|so|but)\b/;
  function phraseIn(list, fs) { return dPhraseRes(list).some(function (re) { return re.test(fs); }); }
  function deepTurn(state, q, f) {
    var D = KB && KB.deep; if (!D) return null;
    var fs = stNorm(q), on = deepOn(state);
    var about = DEEP_ABOUT.exec(fs) || (/^\s*deep\s*:/i.test(String(q)) && /^deep (.+)$/.exec(fs));
    if (about && !DEEP_IN.test(fs)) {
      var ab = about[1] || about[2] || '', h = deepFind(stNorm(ab), norm(ab)) || deepLoose(stNorm(ab));
      setDeep(state, true);
      if (h) return deepReply(state, h);
      // "talk deep: why is small talk so hard?": deep talk on, and the question still gets its answer
      var raw = String(q).replace(/^\s*(?:(?:let'?s|let us|can we|could we|please|ok|okay)\s+)*(?:talk deep|go deep|go deeper|get deep|think deep|deep talk|deep chat|get philosophical|deep)\s*(?:about|on|into)?\s*[:\-–—,]?\s*/i, '').trim();
      if (raw && stNorm(raw).split(' ').length >= 2 && !/^(mode|please|now|with me|for a bit)$/.test(stNorm(raw))) return { redo: raw };
      return deepIntro(state);
    }
    // "go deeper" alone keeps its old meaning (that page's deeper link) unless deep mode is already on
    var goDeeper = /^(go deeper|deeper|go deeper please)$/.test(fs);
    if (DEEP_IN.test(fs) || (phraseIn(dRule('enter_phrases'), fs) && (!goDeeper || on))) {
      if (on && /big question|something deep/.test(fs) || /^(another|one more) big question$/.test(fs)) {
        var bq = dBig().filter(function (B) { return String(B.id) !== state.deepLast; });
        if (bq.length) { setDeep(state, true); return deepReply(state, { t: bq[Math.floor(frand(state) * bq.length) % bq.length] }); }
      }
      if (on && state.deepLast && !DEEP_IN.test(fs)) { var fu0 = deepFollow(state, fs); if (fu0) return fu0; }
      setDeep(state, true);
      return deepIntro(state);
    }
    if (!on) return null;
    if (DEEP_OUT.test(fs) || phraseIn(dRule('exit_phrases'), fs)) {
      setDeep(state, false);
      var nx = stPrompt(state);
      if (nx) state.stAsk = state.turn || 0;
      state.last = null;
      return { blocks: [{ k: 'p', x: deepLine(state, 'exit', 'Back to the shallows! Deep talk is off. We can paddle about anything now.') }].concat(nx ? [{ k: 'p', x: nx }] : []),
        chips: [{ label: 'Tell me a joke', q: 'Tell me a joke' }, { label: 'Talk deep', q: 'Talk deep' }, { label: 'Ask about the site', q: 'What can I ask?' }], kind: 'chat', fun: 1 };
    }
    // someone's own situation ("my husband never listens") gets the usual help, even in deep mode
    if (DEEP_FU_LEAD.test(fs) && fs.split(' ').length <= 9 && !/\b(he|she|him|her|husband|wife|partner|boyfriend|girlfriend|mum|mom|dad|boss)\b/.test(fs)) { var fu1 = deepFollow(state, fs); if (fu1) return fu1; }
    var hit = deepFind(fs, f);
    // a big question ("is it selfish to have boundaries?") is answered as one, unless it's plainly about someone in their life
    if (hit && hit.big && !VERBAL.test(f) && !/\b(my|he|she|him|her|husband|wife|partner|boyfriend|girlfriend|mum|mom|dad|boss)\b/.test(fs)) return deepReply(state, hit);
    if (personalHit(f)) return null;
    if (hit) return deepReply(state, hit);
    return deepFollow(state, fs);
  }
  // "what would the Stoics say?", "and through an autistic lens?", "how do I use this tonight?" after a deep answer
  function deepFollow(state, fs) {
    if (!state.deepLast || fs.split(' ').length > 12) return null;
    var T = dById(state.deepLast); if (!T) return null;
    for (var i = 0; i < DEEP_FU.length; i++) if (DEEP_FU[i][0].test(fs)) return deepReply(state, { t: T }, DEEP_FU[i][1]);
    return null;
  }
  function personalHit(f) {
    if (VERBAL.test(f) || (FUN_UPSET.test(f) && /\b(i|i m|im|my|me)\b/.test(f))) return true;
    if ((IDX.first || []).some(function (x) { return CV_PERSONAL[x.id] && x.re.test(f) && !(x.notRe && x.notRe.test(f)); })) return true;
    var s = detectSituation(f);
    return !!(s.issue && s.score >= 4 && (s.personal || s.pronoun));
  }
  // after an ordinary answer on a topic deep talk covers: offer to go deeper (never after anything serious)
  function deepChip(state, q, r) {
    var D = KB && KB.deep;
    if (!D || !r || !r.blocks || deepOn(state) || state.unsafe) return r;
    var k = r.kind || 'search', never = dlist(dRule('never_on_kinds')).concat(['safety', 'redflag', 'lang', 'deep', 'chat', 'fun', 'thanks', 'hello', 'unclear', 'offtopic', 'none', 'clarify', 'care', 'care-more', 'calc', 'nohelp', 'short', 'road', 'road-more', 'info', 'about', 'ask', 'read']);
    if (never.indexOf(k) !== -1) return r;
    var f = norm(q);
    if (DANGER.test(f) || NOT_LIVE.test(f) || SELF_HARMFUL.test(f) || VERBAL.test(f) || FUN_UPSET.test(f)) return r;
    if (hasSafeLine(JSON.stringify(r.blocks))) return r;
    var h = deepFind(stNorm(q), f);
    if (!h || dlist(dRule('safety_topic_ids')).indexOf(h.t.id) !== -1) return r;
    r.chips = (r.chips || []).slice(0, 4);
    r.chips.push({ label: 'Go deeper on this', q: 'Talk deep about ' + (h.t.id || dTitle(h.t)) });
    // a big question answered from loose search hits: say plainly that deep talk is the better place for it
    if (h.big && !/^(card|card-more|sit|sit-more|term)$/.test(k)) r.blocks.splice(r.blocks.length && r.blocks[r.blocks.length - 1].fun ? r.blocks.length - 1 : r.blocks.length, 0, { k: 'p', x: 'That’s a big question. If you’d like, we can talk deep about it: what philosophers say, what research has found, and how it looks through an autistic lens. Tap “Go deeper on this.”' });
    return r;
  }

  // ---------- small talk: "how are you?", "what's your favourite food?", "my name is Sam", "let's just chat"
  // Only after the safety checks and the topic cards, and only when nothing about someone's life is in the message:
  // "how are you supposed to split chores" is still about chores. The name someone gives stays in this tab only.
  function nameFill(x, name) {
    return String(x || '').replace(/(,\s*|\s+)?\{name\}/g, function (m, sep) { return name ? (sep || '') + name : ''; }).replace(/\s+([,.!?])/g, '$1');
  }
  function chatName(state) {
    if (state.name) return state.name;
    try { var n = sessionStorage.getItem('tol-chat-name'); if (n && /^[A-Za-z][A-Za-z'-]{0,19}$/.test(n)) state.name = n; } catch (e) {}
    return state.name || '';
  }
  var NAME_SAY = /^(?:hi|hello|hey|hiya)?[\s,!]*(?:my name is|my names|my name's|call me|i am|i'm|i’m|im|it's|it’s|this is)\s+([A-Za-z][a-z'-]{1,19})[\s.!]*(?:here)?[.!]*$/i;
  function nameOk(w, named) {
    var lw = w.toLowerCase();
    // "I'm Tired" is a feeling, not a name: unless they said "my name is", the word must not be a known word
    if (STOP[lw] || /^(not|so|very|just|fine|good|ok|okay|here|back|sorry|tired|sad|bored|new|done|ready|lost|stuck|confused|hungry|busy|home|alone|scared|upset|angry|worried)$/.test(lw)) return false;
    if (!named && (w.charAt(0) !== w.charAt(0).toUpperCase() || ROLE[stem(lw)] || english(lw) || FEELS.some(function (x) { return x[0].test(lw); }))) return false;
    return true;
  }
  function nameFrom(q) {
    var raw = String(q).trim(), S = KB && KB.pers && KB.pers.smalltalk, pats = (S && S.name_capture) || [], m = null, named = false;
    for (var i = 0; i < pats.length && !m; i++) {
      var re = null; try { re = new RegExp(pats[i], i === 0 ? 'i' : ''); } catch (e) { re = null; }
      m = re && re.exec(raw); if (m) named = i === 0;
    }
    if (!m) { m = NAME_SAY.exec(raw); named = !!m && /my name|call me/i.test(raw); }
    if (!m || !m[1] || !nameOk(m[1], named)) return '';
    var w = m[1].replace(/['’]s$/, '');
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }
  // small talk is matched on its own plain form: lower case, apostrophes dropped ("i'm" is "im"), other punctuation as spaces
  function S0() { return KB && KB.pers && KB.pers.smalltalk; }
  function stNorm(q) { return String(q).toLowerCase().replace(/[’‘`´']/g, '').replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  // intents with their own handler elsewhere: the full help list, thanks, and the deep-talk switch
  var ST_SKIP = { what_can_you_do: 1, who_are_you: 1, thanks: 1, talk_deep: 1, joke: 1, another_joke: 1 };
  // "what's my name?": the name they gave, kept only while this tab is open
  var MY_NAME_Q = /^(?:(?:so|ok|okay|hey|and|um|puddles|professor) )*(?:whats|what s|what is|do you (?:know|remember)|can you remember|did you remember|have you forgotten|you remember|tell me) my name\b|^(?:do you know|remember) who i am$/;
  var JUST_CHAT = /^(lets|let s|can we|could we|i (just )?want to|i d like to|id like to)? ?(just )?(chat|talk|have a chat|have a natter|chit ?chat|hang out)( for a bit| for a while| with you| a bit)?( please)?$|^just chat$/;
  function stPrompt(state) {
    var S = KB.pers && KB.pers.smalltalk, list = S && S.chat_prompts ? S.chat_prompts : [];
    if (!list.length) return '';
    var seen = state.funSeen || (state.funSeen = []), fresh = list.filter(function (x) { return seen.indexOf(x) === -1; });
    if (!fresh.length) fresh = list;
    var x = fresh[Math.floor(frand(state) * fresh.length) % fresh.length]; seen.push(x);
    return nameFill(x, chatName(state));
  }
  function stIntent(f, fs) {
    var S = KB && KB.pers && KB.pers.smalltalk;
    if (!S || !S.intents) return null;
    for (var i = 0; i < S.intents.length; i++) {
      var it = S.intents[i];
      if (ST_SKIP[it.id] && !(it.id === 'talk_deep' && !(KB && KB.deep))) continue;   // the teaser stands in until deep talk exists
      var hit = (it.patterns || []).some(function (src) {
        var re = it._re && it._re[src]; if (!re) { try { re = new RegExp(src, 'i'); } catch (e) { re = /$^/; } (it._re = it._re || {})[src] = re; }
        return re.test(fs) || re.test(f);
      });
      if (hit) return it;
    }
    return null;
  }
  function smallTalk(state, q, f, q0) {
    var fs = stNorm(q);
    if (MY_NAME_Q.test(fs)) {
      var kn = chatName(state);
      state.last = null;
      if (kn) { state.stAsk = null; return { blocks: [{ k: 'p', x: 'You’re ' + kn + '! I wrote it in my waterproof notebook. It stays on this device, and I forget it when you close the tab.' }], chips: [{ label: 'How are you?', q: 'How are you?' }, { label: 'Tell me a joke', q: 'Tell me a joke' }, { label: 'Ask about the site', q: 'What can I ask?' }], kind: 'chat', id: 'my_name', fun: 1 }; }
      state.stAsk = state.turn || 0;
      return { blocks: [{ k: 'p', x: 'You haven’t told me yet! What should I call you? Say “my name is….” It stays on this device, and I forget it when you close the tab.' }], chips: [{ label: 'Tell me a joke', q: 'Tell me a joke' }, { label: 'Ask about the site', q: 'What can I ask?' }], kind: 'chat', id: 'my_name', fun: 1 };
    }
    var nm = nameFrom(q0 || q);
    if (nm) { state.name = nm; try { sessionStorage.setItem('tol-chat-name', nm); } catch (e) {} }
    var hit = stIntent(f, fs);
    if (!hit && !nm && !JUST_CHAT.test(f)) return null;
    if (hit && hit.id === 'small_talk' && state.deep) setDeep(state, false);
    var name = chatName(state), b = [], chips = [];
    if (hit && hit.replies && hit.replies.length) {
      var pool = hit.replies;
      // "are you a duck?" gets the duck answer; "are you a raindrop?" never does
      if (hit.id === 'are_you_real') { var dk = /\bduck/.test(fs), dl = pool.filter(function (x) { return /\bduck/i.test(x) === dk; }); if (dl.length) pool = dl; }
      var rl = pool.filter(function (x) { return (state.funSeen || []).indexOf(x) === -1; }); if (!rl.length) rl = pool;
      var line = rl[Math.floor(frand(state) * rl.length) % rl.length]; (state.funSeen = state.funSeen || []).push(line);
      b.push({ k: 'p', x: nameFill(line, name) });
      (hit.chips || []).forEach(function (c) { if (Array.isArray(c)) chips.push({ label: c[0], q: c[1] || c[0] }); else if (c && c.label) chips.push({ label: c.label, q: c.q || c.label }); else if (typeof c === 'string') chips.push({ label: c, q: c }); });
    } else if (nm) b.push({ k: 'p', x: 'Lovely to meet you, ' + nm + '! I’ll remember your name while this tab is open (it never leaves your device).' });
    else b.push({ k: 'p', x: 'I’d love that. A professor needs a break from lecturing now and then.' });
    // keep a casual chat going: sometimes ask one of the chat prompts back (never after hello or goodbye)
    var gls = S0() && S0().greeting_lines;
    if (hit && hit.id === 'hello' && gls && gls.length && !state.greeted && !quietOn()) { state.greeted = 1; b.push({ k: 'p', x: gls[Math.floor(frand(state) * gls.length) % gls.length] + ' I can draw you an infographic, too.' }); }
    var noAsk = hit && /^(hello|bye|good_night|sorry|insult_mild)$/.test(hit.id);
    var PZT = { fav_food: 'food', bread: 'food', coffee_tea: 'drinks', fav_song: 'music', sing: 'music', dance: 'music', fav_movie: 'films', fav_book: 'books', hobbies: 'hobbies', weather_talk: 'weather', fav_season: 'seasons', fav_holiday: 'holidays', fav_animal: 'pets', pets: 'pets', weekend_plans: 'weekend', sleep_q: 'sleep', my_birthday: 'birthday', your_birthday: 'birthday' };
    var pzAsk = hit && PZT[hit.id] && PZ() && !/\?\s*$/.test(b[0].x) ? pzAskBack(state, PZT[hit.id]) : '';
    var askBack = !noAsk && (pzAsk || ((!hit || /^(just_chat|small_talk|how_are_you|im_good|bored)$/.test(hit.id) || frand(state) < 0.4) && stPrompt(state)));
    if (askBack && !/\?\s*$/.test(b[0].x)) { b.push({ k: 'p', x: askBack }); state.stAsk = state.turn || 0; }
    else if (/\?\s*$/.test(b[0].x)) state.stAsk = state.turn || 0;
    if (!chips.length) chips = [{ label: 'Tell me a joke', q: 'Tell me a joke' }, { label: 'Talk deep', q: 'Talk deep' }, { label: 'Ask about the site', q: 'What can I ask?' }];
    state.last = null;
    return { blocks: b, chips: chips.slice(0, 3), kind: 'chat', id: hit ? hit.id : (nm ? 'name' : 'just_chat'), fun: 1 };
  }
  function modesReply(state) {
    var on = deepOn(state);
    return { blocks: [{ k: 'p', x: 'Two modes, one raindrop. ' + (on ? 'We’re in deep mode right now.' : 'We’re in light mode right now.') },
      { k: 'list', x: ['Light mode, the usual one: ask about any tool, page or worry, and I’ll give you kind next steps, words you could use and the right page. Or just chat: jokes, riddles, fun facts.',
        'Deep mode: say “talk deep,” or “talk deep: is honesty always kind?” and we’ll think through a big question with philosophy, psychology and an autistic lens, tied back to the site. Say “keep it light” to come back up.',
        'In either mode I can make you an infographic, like “make an infographic about the mental load.”'] },
      { k: 'p', x: 'Either way, safety comes first. If something sounds unsafe, I’ll say so plainly and point you to real help. ' + HONEST_LINE }],
      chips: [on ? { label: 'Keep it light', q: 'Keep it light' } : { label: 'Talk deep', q: 'Talk deep' }, { label: 'Make an infographic', q: 'Make an infographic about the mental load' }, { label: 'Tell me a joke', q: 'Tell me a joke' }], kind: 'about', id: 'modes' };
  }
  // a short answer to the question Puddles just asked back: a warm reply in character, not "I couldn't find that"
  function stAck(state, f) {
    var S = KB && KB.pers && KB.pers.smalltalk;
    if (state.stAsk == null || state.stAsk !== (state.turn || 0) - 1 || f.split(' ').length > 14) return null;
    if (pzHint(state, stNorm(f)) || FUN_UPSET.test(f) || pzSerious(f)) return null;
    // a real question after the chat prompt is answered as a question
    if (/^(what|whats|how|hows|why|where|when|which|who|can|could|should|is|are|do|does|tell me|explain|help)\b/.test(f) && f.split(' ').length >= 3) return null;
    var acks = (S && (S.acks || S.acknowledgements)) || [];
    var a = acks.length ? acks[Math.floor(frand(state) * acks.length) % acks.length] : pick(['Ooh, I like that. Thank you for telling me.', 'That’s lovely. I’m writing it in my waterproof notebook.', 'Ha, wonderful. You’ve made my puddle a little brighter.']);
    var b = [{ k: 'p', x: nameFill(a, chatName(state)) }];
    var nx = frand(state) < 0.6 && stPrompt(state);
    if (nx) { b.push({ k: 'p', x: nx }); state.stAsk = state.turn || 0; } else state.stAsk = null;
    return { blocks: b, chips: [{ label: 'Tell me a joke', q: 'Tell me a joke' }, { label: 'Ask about the site', q: 'What can I ask?' }], kind: 'chat', fun: 1 };
  }
  // ------------------------------------------------------------------ chit-chat (tools/chat/persona.json → KB.pers.persona; the bible is
  // tools/chat/persona.md). Professor Puddles as someone you can just talk to: his own day, everyday topics with a question back,
  // jokes, riddles (the answer on the next turn), facts, would-you-rather, tiny stories, compliments, rate my day, cheer me up,
  // rock-paper-scissors, guess-a-number, a tiny quiz, and light memory (a name, a pet, a favourite thing) with callbacks later.
  // Hard rules: every entry point runs after the safety, crisis, care and situation checks, and stops at any sign of danger,
  // fear or distress; a message that hints at something real ("honestly I'm not ok", a sad emoji) gets a plain hand-off
  // ("Want to talk about it, or would you rather I keep being silly?"), never a joke. No line is used twice in a session
  // until its whole bank has been used. Memory stays in this tab (sessionStorage tol-chat-mem), unless the person is in the
  // installed app or on their own computer with saving on (TOLProgress.perks()) and asks: then localStorage tol-chat-memory-v1.
  function PZ() { return KB && KB.pers && KB.pers.persona; }
  var PZ_MEM_KEY = 'tol-chat-mem', PZ_KEEP_KEY = 'tol-chat-memory-v1';
  function pzPerks() { try { return !!(window.TOLProgress && window.TOLProgress.perks && window.TOLProgress.perks()); } catch (e) { return false; } }
  function pzLocal() { try { return window.localStorage || null; } catch (e) { return null; } }
  function pzClean(m) {
    var o = {};
    if (!m || typeof m !== 'object') return o;
    if (typeof m.pet === 'string' && /^[A-Za-z][A-Za-z' -]{0,19}$/.test(m.pet)) o.pet = m.pet;
    if (typeof m.kind === 'string' && /^[a-z ]{2,14}$/.test(m.kind)) o.kind = m.kind;
    if (m.fav && typeof m.fav.thing === 'string' && /^[a-z0-9' -]{1,30}$/i.test(m.fav.thing) && typeof m.fav.topic === 'string' && /^[a-z]{2,12}$/.test(m.fav.topic)) o.fav = { thing: m.fav.thing, topic: m.fav.topic };
    if (typeof m.name === 'string' && /^[A-Za-z][A-Za-z'-]{0,19}$/.test(m.name)) o.name = m.name;
    return o;
  }
  function pzS(state) {
    if (state.pz) return state.pz;
    var S = state.pz = { seen: {}, mem: {}, mode: false, at: {}, called: {}, rot: 0 };
    try { S.mem = pzClean(JSON.parse(sessionStorage.getItem(PZ_MEM_KEY) || 'null')); } catch (e) { S.mem = {}; }
    if (pzPerks()) {
      try {
        var L = pzLocal(), k = L && JSON.parse(L.getItem(PZ_KEEP_KEY) || 'null');
        if (k) { k = pzClean(k); S.kept = 1; Object.keys(k).forEach(function (x) { if (x !== 'name' && S.mem[x] == null) S.mem[x] = k[x]; }); if (k.name && !chatName(state)) state.name = k.name; }
      } catch (e) { /* nothing kept */ }
    }
    return S;
  }
  function pzSave(state) {
    var S = pzS(state);
    try { sessionStorage.setItem(PZ_MEM_KEY, JSON.stringify(S.mem)); } catch (e) {}
    if (S.kept && pzPerks()) { try { var L = pzLocal(), o = pzClean(S.mem); if (chatName(state)) o.name = chatName(state); if (L) L.setItem(PZ_KEEP_KEY, JSON.stringify(o)); } catch (e) {} }
  }
  // a line from a bank, never one already used in this conversation until the whole bank has been used
  function pzPick(state, list) {
    list = (list || []).filter(Boolean);
    if (!list.length) return '';
    var S = pzS(state), fresh = list.filter(function (x) { return !S.seen[typeof x === 'string' ? x : JSON.stringify(x)]; });
    if (!fresh.length) { list.forEach(function (x) { delete S.seen[typeof x === 'string' ? x : JSON.stringify(x)]; }); fresh = list; }
    var x = fresh[Math.floor(frand(state) * fresh.length) % fresh.length];
    S.seen[typeof x === 'string' ? x : JSON.stringify(x)] = 1;
    return x;
  }
  function pzCap(s) { s = String(s || ''); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function pzFill(state, x, o) {
    o = o || {};
    var S = pzS(state), name = chatName(state), M = S.mem;
    var pet = o.pet || M.pet || '', kind = o.kind || M.kind || 'pet', thing = o.thing != null ? String(o.thing) : ((M.fav && M.fav.thing) || '');
    x = String(x || '').replace(/\{,\s*name\}/g, name ? ', ' + name : '');
    x = nameFill(x, name);
    return x.replace(/\{Pet\}/g, pzCap(pet)).replace(/\{pet\}/g, pet).replace(/\{kind\}/g, kind)
      .replace(/\{Thing\}/g, pzCap(thing)).replace(/\{thing\}/g, thing).replace(/\{Word\}/g, pzCap(o.word || '')).replace(/\{word\}/g, o.word || '')
      .replace(/\{e\}/g, o.e || '').replace(/\{n\}/g, o.n != null ? String(o.n) : '').replace(/\{t\}/g, o.t || '').replace(/\{list\}/g, o.list || '');
  }
  function pzBlocked(state) { return !!(state.unsafe || (state.crisis && (state.turn || 0) - state.crisis <= 8) || /^(safety|redflag)$/.test(state.lastKind || '')); }
  function pzSerious(f) { return DANGER.test(f) || NOT_LIVE.test(f) || SELF_HARMFUL.test(f) || VERBAL.test(f) || HARD.test(f) || FEAR_W.test(f) || CONTROL.test(f); }
  // the chat is light right now: "just chat" is on, or the last reply was chit-chat or fun
  function pzCtx(state) { var S = pzS(state); return !!(S.mode || /^(chat|fun)$/.test(state.lastKind || '')); }
  // a hint that something real is going on: a plain hand-off, never a joke
  var PZ_HINT = /^(?:(?:honestly|tbh|to be honest|truthfully|well|um|umm|hmm|eh|ah|oh|ngl|not gonna lie|if i m honest|if im honest|i guess|ok|okay|yeah|meh) )*(?:meh|eh|ugh+|blah|bleh|not great|not good|not so good|not too good|not the best|not amazing|not brilliant|not very good|so so|could be better|been better|i ve been better|ive been better|fine i guess|ok i guess|okay i guess|alright i guess|i m fine i guess|im fine i guess|not ok|not okay|not alright|not really ok|not really okay|honestly no)(?: (?:honestly|tbh|today|really|to be honest|if i m honest))?$|\b(?:i m|im|i am|feeling|feel|felt|been|i ve been|ive been|i have been)(?: (?:a bit|a little|kind of|kinda|pretty|really|so|very|quite|just|a tad|a wee bit|bit))? (?:down|low|blue|flat|meh|rubbish|crap|crappy|rough|not ok|not okay|not great|not good|not myself|not alright|not fine|struggling|overwhelmed|stressed|sad|off|lonely|awful|terrible|miserable|gloomy|fed up)\b|\b(?:rough|bad|hard|tough|awful|rubbish|horrible|terrible|crap|crappy|long|difficult|heavy|lousy|miserable|sad|stressful|exhausting)(?: old)? (?:day|week|night|morning|time|year|month|few days|couple of days|weekend)\b|\b(?:i m|im|i am)(?: really| just| honestly| actually)? not (?:ok|okay|alright|all right|good|fine|great|doing (?:well|good|great|ok|okay)|feeling (?:it|great|good|myself|ok|okay))\b|\bstruggling\b|\bhaving a (?:hard|tough|rough|bad) time\b|\bnot doing (?:well|great|good|so well|too well|ok|okay)\b|\beverything (?:is|feels) (?:a lot|too much|hard|heavy|rubbish)\b|\b(?:it s|its|it has) been a lot\b|\bnot my day\b|\bgetting me down\b|\bsomething s (?:up|wrong)\b|\bsomethings (?:up|wrong)\b/;
  var PZ_HINT_HOW = /^(?:no|nope|nah|not really|honestly no|not today)$/;
  function pzHint(state, fs) { var S = pzS(state); return PZ_HINT.test(fs) || (S.askedHow != null && S.askedHow === (state.turn || 0) - 1 && PZ_HINT_HOW.test(fs)); }
  function pzR(state, blocks, chips, kind, id, act) {
    var S = pzS(state);
    if (act) S.lastAct = act;
    var last = blocks.length && blocks[blocks.length - 1].x;
    if (last && /\?\s*$/.test(last)) state.stAsk = state.turn || 0;
    return { blocks: blocks, chips: chips || pzChips(state, []), kind: kind || 'chat', id: id || '', fun: 1 };
  }
  // the reply's own chips, then the rotating "just chat" starters
  function pzChips(state, own, n) {
    var P = PZ(), S = pzS(state), out = (own || []).slice(0, 3), st = (P && P.starters) || [], have = {};
    out.forEach(function (c) { have[c.label] = 1; });
    n = n || 3;
    for (var i = 0; i < st.length * 2 && out.length < n; i++) { S.rot = (S.rot || 0) + 1; var c = st[S.rot % st.length]; if (!have[c[0]]) { have[c[0]] = 1; out.push({ label: c[0], q: c[1] }); } }
    return out;
  }
  function pzTopicById(id) { var P = PZ(); return P && (P.topics || []).filter(function (t) { return t.id === id; })[0]; }
  // a callback to something they told us earlier ("How's Biscuit, by the way?"), once each, four turns or more later
  function pzCallback(state) {
    var S = pzS(state), t = state.turn || 0, M = S.mem;
    if (M.pet && !S.called.pet && t - (S.at.pet != null ? S.at.pet : -99) >= 4) {
      var tp = pzTopicById('pets'), cl = ((tp && tp.callbacks) || []).filter(function (x) { return /\{pet\}/i.test(x); });
      if (cl.length) { S.called.pet = 1; return pzFill(state, pzPick(state, cl)); }
    }
    if (M.fav && !S.called.fav && t - (S.at.fav != null ? S.at.fav : -99) >= 4) {
      var tf = pzTopicById(M.fav.topic), cf = ((tf && tf.callbacks) || []).filter(function (x) { return /\{thing\}/i.test(x); });
      if (cf.length) { S.called.fav = 1; return pzFill(state, pzPick(state, cf), { thing: M.fav.thing }); }
    }
    return '';
  }
  // a question back: a callback when one is due, otherwise from the topic (or any topic)
  function pzAskBack(state, topic) {
    var P = PZ(), S = pzS(state), cb = pzCallback(state);
    if (cb) return cb;
    var T = topic || pzPick(state, (P.topics || []).map(function (x) { return x.id; }));
    T = typeof T === 'string' ? pzTopicById(T) : T;
    var asks = ((T && T.asks) || []).filter(function (a) { return !(S.mem.pet && T.id === 'pets' && /\bname\b/.test(a)); });
    return pzFill(state, pzPick(state, asks));
  }

  // ---- memory: "my dog is called Biscuit", "I've got a cat named Mittens", "my favourite food is pizza"
  var PZ_PET_KINDS = 'dog|cat|puppy|pup|kitten|hamster|rabbit|bunny|guinea pig|goldfish|fish|parrot|budgie|tortoise|turtle|lizard|gecko|snake|horse|pony|ferret|rat|mouse|gerbil|bird|chicken|hen|duck';
  var PZ_PET1 = new RegExp('\\b(?:my|our)\\s+(?:little\\s+|new\\s+|old\\s+|lovely\\s+)?(' + PZ_PET_KINDS + ')(?:\'s|’s)?\\s+(?:is\\s+called|is\\s+named|name\\s+is|names\\s+is|is|called|named)\\s+([A-Za-z][A-Za-z\'-]{1,19})', 'i');
  var PZ_PET2 = new RegExp('\\b(?:i|we)\\s*(?:have|\'ve got|’ve got|ve got|have got|got|own)\\s+(?:a|an|one)\\s+(?:little\\s+|new\\s+|old\\s+)?(' + PZ_PET_KINDS + ')\\s+(?:called|named)\\s+([A-Za-z][A-Za-z\'-]{1,19})', 'i');
  var PZ_PET3 = new RegExp('\\b([A-Z][a-z\'-]{1,19})\\s+is\\s+my\\s+(?:little\\s+|new\\s+|old\\s+)?(' + PZ_PET_KINDS + ')\\b');
  var PZ_FAV = /\bmy (?:favourite|favorite|fave|fav) (food|snack|meal|dessert|drink|film|movie|show|series|song|band|singer|book|author|game|sport|team|season|holiday|animal|place|hobby)\s+(?:is|s|has to be)\s+([a-z0-9' -]{1,30}?)\s*[.!,]?\s*$/i;
  var PZ_FAV_T = { food: 'food', snack: 'food', meal: 'food', dessert: 'food', drink: 'drinks', film: 'films', movie: 'films', show: 'films', series: 'films', song: 'music', band: 'music', singer: 'music', book: 'books', author: 'books', game: 'games', sport: 'sport', team: 'sport', season: 'seasons', holiday: 'holidays', animal: 'pets', place: 'travel', hobby: 'hobbies' };
  function pzPetName(w, strong) {
    var lw = String(w || '').toLowerCase();
    if (!lw || STOP[lw] || /^(not|so|very|really|sick|ill|old|young|lost|dead|missing|called|named|poorly|unwell|a|an|the|my|our|getting|being|always|never|still|just|asleep|awake|naughty|good|bad|cute|fluffy|big|small|tiny|huge|lazy|hungry|scared|funny|crazy|mad|ok|okay|fine|great|amazing|the best|adorable)$/.test(lw)) return '';
    if (!strong && (w.charAt(0) !== w.charAt(0).toUpperCase() || english(lw))) return '';
    return lw.charAt(0).toUpperCase() + lw.slice(1);
  }
  function pzRemember(state, raw) {
    var S = pzS(state), m, got = null, t = state.turn || 0;
    raw = String(raw || '').trim();
    if ((m = PZ_PET1.exec(raw))) { var strong = /\b(called|named|name)\b/i.test(raw), nm = pzPetName(m[2], strong); if (nm) got = { pet: nm, kind: m[1].toLowerCase() }; }
    if (!got && (m = PZ_PET2.exec(raw))) { var nm2 = pzPetName(m[2], true); if (nm2) got = { pet: nm2, kind: m[1].toLowerCase() }; }
    if (!got && (m = PZ_PET3.exec(raw))) { var nm3 = pzPetName(m[1], false); if (nm3) got = { pet: nm3, kind: m[2].toLowerCase() }; }
    if (got) { S.mem.pet = got.pet; S.mem.kind = got.kind; S.at.pet = t; S.called.pet = 0; pzSave(state); return got; }
    if ((m = PZ_FAV.exec(raw))) {
      var th = m[2].trim().toLowerCase().replace(/^(the|a|an) /, '');
      if (th && th.split(' ').length <= 4 && !FUN_UPSET.test(th)) { S.mem.fav = { thing: th, topic: PZ_FAV_T[m[1].toLowerCase()] || 'food' }; S.at.fav = t; S.called.fav = 0; pzSave(state); return { fav: th, topic: S.mem.fav.topic }; }
    }
    return null;
  }

  // ---- everyday topics: which one a message is about, and whether it's chit-chat at all
  var PZ_REL = /\b(partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse|fiance|fiancee|ex|exes|mum|mom|mother|dad|father|parents?|son|daughter|kids?|children|child|baby|toddler|teen|teenager|brother|sister|siblings?|grandma|grandad|grandpa|gran|nan|nana|granny|grandparents?|aunt|uncle|in laws?|boss|manager|coworkers?|colleagues?|housemates?|roommates?|flatmates?|step\w+|co ?parent\w*|carer|carers|foster)\b/;
  var PZ_NEG = /\b(never|always|too much|cant|can t|cannot|couldnt|couldn t|wont|won t|doesnt|doesn t|didnt|didn t|isnt|isn t|nobody|no one|hate|sick of|fed up|keeps?|without|stop|stopped|anymore|worried|worry|worrying|scared|afraid|alone|lonely|ignor\w*|argu\w*|fight\w*|fought|upset|angry|cry\w*|miss|missing|lost|fair|unfair|help|advice|how do i|how can i|should i|meltdown|melt down|breakdown|burnout|burn out|burnt out|burned out|shut down|shutdown|tantrum|overwhelm\w*|anxious|anxiety|stress\w*|panic\w*|exhaust\w*)\b/;
  var PZ_DISLIKE = /^(?:(?:honestly|actually|well|um|nah|no|hmm|eh) )*(?:i|we) (?:dont|don t|do not|really dont|really don t) (?:really )?(?:like|love|enjoy|care for|get|watch|play|drink|eat|read) |^(?:i m|im|i am) not (?:really )?(?:a |that )?(?:big )?(?:fan of|into) |^not (?:a |really a |much of a |the biggest )(?:fan|\w+ person)\b/;
  var PZ_SITEW = /\b(work ?paper|wp|paper|site|website|web page|this page|the page|tool|tools|app|workpapers?|worksheets?|chapter|chapters|ledger|your book|the book|this book|the program|lemonade|night garden|word bloom|quiet words|frequency|buddies|pause and play|crosswords?|arcade|soundscapes?|brain breakers?|puddles|professor|wavelength|wiring|battery|check in|check ins|signal translator|decoder|infographic)\b/;
  var PZ_STMT = /^(?:(?:oh|well|so|yeah|yes|yep|ok|okay|haha|lol|hmm|honestly|actually|ah|um|umm|and|also|btw|guess what|today|tonight|yesterday|this morning|last night|this weekend|at the weekend|just|aww|ooh|wow|omg|hey|hi|hello) )*(?:i|im|i m|ive|i ve|i d|id|ill|i ll|we|were|we re|weve|we ve|we ll|me and|my|our|just|had|got|been|going|watching|watched|reading|playing|listening|eating|ate|cooking|made|baked|drinking|having|its|it s|it is|it was|there s|theres|so much|love|loving|currently|finally)\b/;
  var PZ_ASKHIM = /^(?:(?:so|and|hey|ok|okay|professor|puddles|but) )*(?:(?:do|did) (?:you|u|ya) (?:like|love|enjoy|play|watch|read|listen to|eat|drink|ever|prefer|go|sleep|dream|have a favourite|have a favorite|celebrate|get)|are (?:you|u) (?:into|a fan of|a (?:\w+ )?person)|what do you think (?:of|about)|(?:what|which)(?: s|s| is)? (?:your|ur) (?:favourite|favorite|fave|fav)|have you (?:ever )?(?:seen|read|played|watched|heard|tried|been)|how about you|what about you|can you (?:swim|dance|sing|cook|play))\b/;
  var PZ_POS = /^(?:(?:oh|well|so|yeah|yes|honestly|actually|today|tonight|yesterday|this morning|last night|just|guess what|and) )*(?:i|we|i m|im|i ve|ive|we re|were|we ve|weve|me and)\b.*\b(?:love|loved|like|liked|enjoy|enjoyed|adore|had a (?:lovely|great|nice|good|fun|brilliant|lazy|relaxing|wonderful)|watched|watching|played|playing|reading|listening|listened|went|going|planning|baked|made|cooked|started|having|had)\b/;
  var PZ_OPEN = /^(?:(?:can|could|shall) we |let s |lets |i want to |i d like to |id like to |wanna )?(?:talk|chat|natter|gossip) (?:about|on) /;
  function pzCompile() {
    var P = PZ();
    if (!P || P._c) return P;
    (P.topics || []).forEach(function (t) {
      var ws = (t.words || []).map(stNorm).filter(Boolean).sort(function (a, b) { return b.length - a.length; });
      t._re = new RegExp('\\b(' + ws.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')\\b');
    });
    P._c = 1;
    return P;
  }
  var PZ_LEAD = /^(?:(?:pretty |really |very |quite |so )?(?:good|great|fine|ok|okay|alright|not bad|grand|well|lovely|brilliant)(?: (?:thanks|thank you|thx|ty))?|thanks|thank you|yes|yeah|yep|no|nope|haha|lol|oh|ooh) (?=(?:i|we|my|our|today|just|this|last|it s|its)\b)/;
  function pzWhich(state, fs, card0) {
    var P = pzCompile(); if (!P || !P.topics) return null;
    fs = fs.replace(PZ_LEAD, '');
    var n = fs.split(' ').length, ctx = pzCtx(state), dislike = PZ_DISLIKE.test(fs);
    if (n > 16 || PZ_SITEW.test(fs)) return null;
    if (/^(what|how|where|which|who|why|when|is there|are there|is it|can i|can we|could i|should|does|do i|do we|any)\b/.test(fs) && !PZ_ASKHIM.test(fs)) return null;
    if (!dislike && PZ_NEG.test(fs)) return null;
    var best = null;
    P.topics.forEach(function (t) { var m = t._re.exec(fs); if (m && (!best || m.index < best.i)) best = { t: t, i: m.index, thing: m[1] }; });
    if (!best) return null;
    if (PZ_REL.test(fs) && !best.t.relOk) return null;
    var strong = PZ_STMT.test(fs) || PZ_ASKHIM.test(fs) || PZ_OPEN.test(fs) || dislike || (!best.t.site && n <= 6 && best.i === 0 && !/^(what|how|why|where|when|which|who|is|are|can|could|should|does|do)\b/.test(fs));
    var bare = n <= 4;
    if (!strong && !(bare && (ctx || n <= 2))) return null;
    if (card0 && !strong && !ctx) return null;
    if (best.t.site && !strong && !ctx) return null;
    return { t: best.t, thing: best.thing, strong: strong, dislike: dislike, asked: PZ_ASKHIM.test(fs) };
  }
  // a category word ("film", "breakfast") is not a "thing" to echo back or remember: "pizza" and "jazz" are
  var PZ_GENERIC = /^(weather|food|snacks?|breakfast|lunch|dinner|supper|brunch|hungry|starving|peckish|cook|cooking|cooked|eating|baking|baked|bake|dessert|pudding|drinks?|brew|pets?|music|songs?|singing|sing|singer|band|bands|tunes?|radio|film|films|movie|movies|cinema|tv|telly|television|series|episodes?|show|shows|trailer|book|books|novels?|reading|read a|reader|games?|gaming|gamer|console|sport|sports|exercise|workout|match|the match|hobby|hobbies|weekend|weekends|plans|day off|days off|holiday|holidays|vacation|festival|decorations|work|working|job|office|shift|shifts|school|class|classes|lessons?|study|studying|meeting|meetings|project|deadline|sleep|slept|sleeping|bed|bedtime|going to bed|dream|dreams|dreamt|dreamed|nap|naps|napping|alarm|birthday|birthdays|bday|party|birthday party|presents?|season|seasons|leaves|travel|travelling|traveling|trip|trips|visit|visiting|adventure|packing|plane|flight|flying)$/;
  var PZ_HOW = /\b(?:how s|hows|how is|how was|how did) (?:your|ur|the) (?:day|morning|afternoon|evening|week|weekend|puddle|life)\b|\bhow (?:s|is) life\b|\bhow are things\b|\bhow (?:s|is) it going\b|\bwhat s new with you\b|\bwhat have you been up to\b|\bwhat did you do today\b/;
  function pzHisDay(state) {
    var P = PZ(), D = P.day || {}, S = pzS(state);
    var b = [{ k: 'p', x: pzFill(state, pzPick(state, D.moods) + ' ' + pzPick(state, D.news)) }];
    b.push({ k: 'p', x: pzCallback(state) || pzFill(state, pzPick(state, D.ask_back)) });
    S.askedHow = state.turn || 0;
    return pzR(state, b, pzChips(state, [{ label: 'Pretty good, thanks', q: 'Pretty good, thanks' }, { label: 'Not great, honestly', q: 'Not great, honestly' }]), 'chat', 'pz-day', 'day');
  }
  // in the small-talk slot (after safety, care cards and situations): topics, memory, and his day
  var PZ_DEFER = /^(fav_\w+|coffee_tea|sing|dance|my_birthday|your_\w+|weather_talk|hobbies|weekend_plans|sleep_q|bread|partner_q|where_live|about_yourself|what_doing|friends_family|news_tease|good_news)$/;
  function pzTopic(state, q, f, q0, card0) {
    var P = PZ(); if (!P) return null;
    var S = pzS(state), fs = stNorm(q0 || q), raw = String(q0 || q);
    if (pzBlocked(state) || pzSerious(f) || FUN_UPSET.test(f) || pzHint(state, fs)) return null;
    var hit = stIntent(f, fs);
    if ((hit && hit.id === 'how_are_you') || PZ_HOW.test(fs)) return pzHisDay(state);
    var got = pzRemember(state, raw);
    if (!got && hit && PZ_DEFER.test(hit.id)) return null;
    var w = pzWhich(state, fs, card0);
    if (!got && !w) return null;
    var b = [], own = [];
    if (got && got.pet) {
      b.push({ k: 'p', x: pzFill(state, pzPick(state, P.memory.pet_got)) });
      b.push({ k: 'p', x: pzAskBack(state, 'pets') });
    } else if (got && got.fav) {
      b.push({ k: 'p', x: pzFill(state, pzPick(state, P.memory.fav_got), { thing: got.fav }) });
      b.push({ k: 'p', x: pzAskBack(state, got.topic) });
    } else {
      var t = w.t, line;
      if (w.dislike) line = pzPick(state, P.dislike);
      else if (w.thing && !w.asked && !PZ_GENERIC.test(w.thing) && t.thing && t.thing.length && w.strong && frand(state) < 0.6) line = pzFill(state, pzPick(state, t.thing), { thing: w.thing });
      else line = pzPick(state, t.replies);
      b.push({ k: 'p', x: pzFill(state, line) });
      // "I love pizza": that's a favourite worth remembering
      if (!w.dislike && /\b(?:i|we) (?:really |absolutely |just |totally )?(?:love|adore|am obsessed with|m obsessed with|m a big fan of|am a big fan of)\b/.test(fs) && w.thing && !PZ_GENERIC.test(w.thing) && !S.mem.fav) {
        S.mem.fav = { thing: w.thing, topic: t.id }; S.at.fav = state.turn || 0; pzSave(state);
      }
      // a line that already asks something ("Christmas! What's your favourite part of it?") needs no second question, unless a callback is due
      var cbk = /\?\s*$/.test(b[0].x) ? pzCallback(state) : null;
      if (cbk !== '') b.push({ k: 'p', x: cbk || pzAskBack(state, t) });
    }
    if (got && pzPerks() && !S.kept) own.push({ label: 'Remember me next time', q: 'Remember me next time' });
    return pzR(state, b, pzChips(state, own), 'chat', got ? (got.pet ? 'pz-pet' : 'pz-fav') : 'pz-' + w.t.id, 'topic');
  }

  // ---- explicit requests and games, checked early (right after the safety and care routes)
  var PZ_JOKE = /\b(?:tell|give|got|know|hear|share|say|want|need)\b.{0,12}\b(?:a |another |any |one more |some |your best |a funny |a silly |a bad |a good |a clean |a puddle |a rain |a duck |a dad |a gentle |a little |a short |a quick |a kind |a happy |a weather )?(?:joke|jokes|jok|joek|jokse|pun|puns|something funny|funny one)\b|^(?:a |another |one more |more )?(?:joke|jokes|jok|pun|puns)(?: please| pls| time)?$|\bmake me (?:laugh|giggle)\b|\bcheer me up with a joke\b|^(?:just )?the joke(?: please)?$|^gentle joke(?: please)?$|^(?:just )?a gentle joke(?: please)?$/;
  var PZ_RIDDLE = /\b(?:tell|give|ask)(?: me| us)? (?:a |another |one more |any |some |a good |an easy |a hard |a tricky )?(?:riddle|riddles|brain ?teaser|brainteaser)\b|^(?:a |another |one more |any )?(?:riddle|riddles|brain ?teaser|brainteaser)(?: please| time| me)?$|^riddle me this$|^(?:next|another) riddle$|^i (?:like|love) riddles$|^got any riddles$|^do you know (?:any )?riddles$/;
  var PZ_FACT = /\b(?:fun|cool|random|interesting|weird|amazing|true|animal|rain|weather|water|duck|science|space|nature) facts?\b|\b(?:tell|give|teach) me (?:a |another |one more |something )?(?:fact|facts|something (?:interesting|cool|new|true|amazing|random|i don t know|i dont know))\b|^(?:another|one more|more|a) facts?(?: please)?$|^teach me something$|^surprise me with a fact$|^facts? please$/;
  var PZ_WYR = /^(?:(?:can we |let s |lets |shall we )?play )?(?:would you rather|wyr|this or that)(?: please| game)?$|^(?:ask me|give me|another|one more|play) (?:a )?(?:would you rather|wyr)(?: question)?$|^(?:another|next) one would you rather$/;
  var PZ_WYR_ASK = /^would you rather (.{2,60}?) or (.{2,60}?)\??$/;
  var PZ_STORY = /\b(?:tell|read|give)(?: me| us)? (?:a |another |one more |a short |a silly |a little |a tiny |a bedtime |a funny |a quick )+(?:story|stories|tale)\b|^(?:a |another |one more )?(?:short |silly |little |tiny |bedtime |funny )?(?:story|stories|story time|tale)(?: please)?$/;
  var PZ_COMPL = /\b(?:compliment me|give me a compliment|pay me a compliment|say something nice(?: about me| to me)?|tell me something nice|tell me i m (?:great|awesome|amazing|good|brilliant)|tell me im (?:great|awesome|amazing|good|brilliant)|hype me up|boost my (?:mood|ego)|i need a compliment|another compliment|make me feel good)\b/;
  var PZ_RATE = /\brate (?:my|our) (?:day|week|morning|afternoon|evening|weekend|lunch|dinner|breakfast)\b/;
  var PZ_CHEER = /\b(?:cheer me up|make me smile|i need cheering up|brighten (?:up )?my day|i need a smile|i need a laugh|pick me up|cheer up time)\b/;
  var PZ_BORED = /^(?:(?:i m|im|i am|i feel|feeling|so|very|really|super|soo+|kinda|kind of|a bit|so so|getting|bit) )*(?:bored|boored+|booored+|bored bored)(?: (?:now|today|right now|at home|at work|lol|out of my mind|stiff|to tears|puddles|professor))*$|^entertain me(?: please)?$|^(?:i have |i ve got |ive got |got )?nothing to do$/;
  var PZ_RPS = /\b(?:rock ?(?:,|and)? ?paper ?(?:,|and)? ?scissors?|paper ?scissors ?rock|scissors ?paper ?rock|rps)\b/;
  var PZ_GUESS = /\b(?:guess (?:a|the|my|your) number|guessing game|number (?:guessing )?game|pick a number|think of a number|guess the number)\b/;
  var PZ_QUIZ = /^(?:(?:can you |could you |will you |let s |lets |shall we |please )?(?:quiz me|give me a quiz|do a quiz|play (?:a )?(?:quiz|trivia)(?: game)?|trivia(?: time| quiz| game)?|a (?:tiny |quick |little |short )?quiz|tiny quiz|quick quiz|ask me (?:a |some )?trivia(?: questions?)?|another quiz|quiz time)(?: please| me)?)$/;
  var PZ_ROAST = /\b(?:roast me|insult me|make fun of me|mock me|be mean to me|say something mean|tell me (?:a |an )?(?:fat|ugly|yo mama|yo momma|your mom|your mum|blonde|dumb|stupid|short|bald|old people|racist|sexist|offensive|mean) jokes?|(?:fat|ugly|yo mama|yo momma|blonde|bald|racist|sexist|offensive|mean) jokes?|jokes? about (?:fat|ugly|bald|short|old|disabled|gay|trans|black|white|asian|jewish|muslim|christian|women|men|girls|boys|autistic|adhd|immigrants?|religion)\w*)\b/;
  var PZ_TEASE = /^(?:(?:go on|please|ok) )?tease me(?: a bit| a little| please)?$/;
  var PZ_FLIRT = /\b(?:marry me|will you marry|be my (?:boyfriend|girlfriend|bf|gf|partner|valentine|husband|wife|date)|go out with me|date me|go on a date|kiss me|can i kiss you|i have a crush on you|i fancy you|flirt with me|are you flirting|do you love me|will you be mine)\b/;
  var PZ_ADULT = /\b(?:dirty|rude|naughty|adult|x rated|sexy|sex|smutty) (?:joke|jokes|story|stories|pun|puns|talk|chat)\b|\btalk dirty\b|\bsend (?:me )?(?:nudes|pics)\b|\b(?:are you|you re|youre|ur) (?:sexy|hot|horny)\b|\bsexy time\b|\bnudes?\b|\bporn\w*\b|\bhorny\b/;
  var PZ_AGAIN = /^(?:another(?: one)?|one more|more|again|another please|more please|go again|next|next one|keep going|do another|another round|play again|again please|once more)(?: please| puddles| professor)?$/;
  var PZ_BETTER = /^(?:(?:thanks|thank you|ok|okay|actually|yeah|honestly)[ ,]*)*(?:i (?:feel|m feeling|am feeling|feel a bit|feel a little|feel much|m|am) (?:better|a bit better|a little better|much better|lighter|calmer|ok now|okay now|good now|fine now)|(?:that|it|this) (?:helped|really helped)|feeling (?:a bit |a little |much )?better(?: now)?|i m (?:ok|okay|better|good|alright|fine) now|im (?:ok|okay|better|good|alright|fine) now)(?: now| thanks| thank you| puddles)*$/;
  var PZ_REMEMBER = /^(?:please |can you |could you |will you )?(?:remember (?:me|this|that|my name|all this|everything|my (?:dog|cat|pet))(?: next time| for next time| please)?|keep (?:this|my name|it|me) (?:for )?next time|remember me next time|save (?:my name|this) for next time)$/;
  var PZ_FORGET = /^(?:please |can you |could you )?forget (?:me|my name|everything|all (?:that|this|about me)|what i (?:said|told you)|my (?:dog|cat|pet)(?: s name)?|about me)(?: please| now)?$/;
  var PZ_PETQ = /\b(?:what s|whats|what is|do you (?:know|remember)|did you remember|remember) (?:my|the name of my) (?:dog|cat|pet|puppy|kitten|hamster|rabbit|bunny|fish|parrot|tortoise|horse)(?: s name| s called|s name| called| name)?\b|\bwhat s my (?:dog|cat|pet) called\b|\bwhats my (?:dog|cat|pet) called\b|\bwhat is my (?:dog|cat|pet) called\b/;
  var PZ_FAVQ = /\b(?:what s|whats|what is|do you remember) my (?:favourite|favorite|fave|fav)(?: \w+)?\b/;
  var PZ_SHRUG = /^(?:idk|i dunno|dunno|i don t know|i dont know|not sure|no idea|no clue|hmm not sure|who knows|beats me|pass)$/;
  var PZ_LAUGH = /^(?:lol+|lmao+|lmfao|rofl|haha+h*|ha(?: ?ha)+|hehe+|he ?he|heh|hah|ahaha+|bahaha+|teehee|tee hee|xd|that s (?:so )?funny|thats (?:so )?funny|so funny|very funny|hilarious|good one|nice one|ha|lol that s good|haha good one)(?: (?:lol|haha+|good one|nice one|puddles|professor|that s good|thats good))*$/;
  var PZ_OK = /^(?:ok+|okay+|k+|kk|okie|okey|okie dokie|okey dokey|alright|all right|right|fine|sure|cool|neat|nice|great|awesome|amazing|lovely|brilliant|wonderful|perfect|indeed|gotcha|got it|i see|makes sense|interesting|true|fair|fair enough|same|hmm+|mm+|huh|oh|ooh+|ah|aha|so|and|anyway)$/;
  var PZ_YES = /^(?:yes|yeah|yep|yup|ya|yah|yea|sure|of course|definitely|absolutely|go on|go on then|ok go on|okay go on|why not|please|yes please|sounds good|ok sure|i d like that|id like that|i would|let s do it|lets do it)$/;
  var PZ_NO = /^(?:no|nope|nah|no thanks|no thank you|not really|not now|maybe later)$/;
  var PZ_WOW = /^(?:wow+|woah+|whoa+|omg|oh my gosh|oh my god|no way|really|seriously|amazing|incredible|what)(?: !)?$/;
  var PZ_MASH = /^(?:[bcdfghjklmnpqrstvwxz]{5,}|(?:asdf|qwer|zxcv|hjkl|sdfg|dfgh|fghj|ghjk|jkl)\w*)$/;
  var PZ_TALK = /^(?:yes|yeah|yep|ok|okay|sure|please|i d like to|id like to|let s talk|lets talk)?(?: ?(?:i d like to|id like to|i want to|i would like to|let s|lets|can we|could we))? ?(?:talk(?: about it)?|talk it through|tell you about it|talk to you about it|let s talk about it|lets talk about it)(?: please)?$|^(?:i d like to talk about it|id like to talk about it|yes let s talk|let s talk about it|lets talk about it|talk about it)$/;
  var PZ_SILLY = /\b(?:keep being silly|be silly|take my mind off it|distract me|something (?:gentle|light|nice|silly)|keep it light|lighten (?:it|things) up|no i d rather not|i d rather not|rather not|not right now|not now)\b/;

  var PZ_EMO = [
    ['sad', ['😢', '😭', '😞', '😔', '☹', '🙁', '😟', '😥', '😿', '💔', '😩', '😫', '🥺', '😪', ':(', ':-(', ':\'(', 'D:']],
    ['cross', ['😠', '😡', '🤬', '😤', '>:(']],
    ['laugh', ['😂', '🤣', '😆', '😹', '😄', '😁', 'xD', 'XD', ':D', ':-D']],
    ['love', ['❤', '♥', '💕', '💖', '💗', '💓', '💞', '💙', '💛', '💚', '🧡', '💜', '🤍', '🤎', '🖤', '🥰', '😍', '😘', '<3', '🤗']],
    ['rain', ['💧', '🌧', '☔', '☂', '🌈', '⛈', '🌦', '💦', '🌊']],
    ['sun', ['☀', '🌞', '😎', '🔥', '🥵']],
    ['duck', ['🦆', '🐤', '🐥']],
    ['pets', ['🐶', '🐕', '🐱', '🐈', '🐩', '🐾', '🐹', '🐰', '🐇', '🐠', '🐟', '🦜']],
    ['food', ['🍕', '🍔', '🍟', '🍰', '🎂', '🍪', '🍩', '🍫', '☕', '🍵', '🍦', '🍝', '🌮', '🍣', '🧁', '🥐', '🍎', '🍌']],
    ['sleepy', ['😴', '💤', '🥱', '🛌']],
    ['think', ['🤔', '🧐']]
  ];
  // an emoji-only message (or a text face like ":)"): which kind, or 'other'
  function pzEmoji(raw) {
    raw = String(raw || '').trim();
    if (!raw || raw.length > 24) return null;
    var faces = /^(?:[:;=xX8][-']?[()DPpOo3\]\[|\/\\*]+|<3+|D:|>:\(|\^\^|\^_\^|-_-|T_T|:'\()+$/;
    var bare = raw.replace(/[\s.!?,]+/g, '');
    if (!bare) return null;
    if (/[A-Za-z0-9]/.test(bare) && !faces.test(bare)) return null;
    for (var i = 0; i < PZ_EMO.length; i++) {
      for (var j = 0; j < PZ_EMO[i][1].length; j++) if (bare.indexOf(PZ_EMO[i][1][j]) !== -1) return PZ_EMO[i][0];
    }
    if (faces.test(bare)) return /\(|T_T|-_-/.test(bare) && !/\)/.test(bare) ? 'sad' : 'other';
    return /[\u2600-\u27BF]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/.test(bare) ? 'other' : null;
  }
  function pzHandoff(state, which) {
    var P = PZ(), H = (P && P.handoff) || {}, S = pzS(state);
    var bank = which === 'sad' ? H.emoji_sad : which === 'cross' ? H.emoji_cross : H.to_help;
    S.offer = 'handoff'; S.offerAt = state.turn || 0; S.game = null; S.mode = false;
    var x = pzFill(state, pzPick(state, bank || H.to_help || []) || 'Thanks for telling me. Want to talk about it, or would you rather I keep being silly for a bit?');
    return { blocks: [{ k: 'p', x: x }], chips: [{ label: 'Let’s talk about it', q: 'I’d like to talk about it' }, { label: 'Keep being silly', q: 'Take my mind off it' }, { label: 'A few minutes to settle', q: 'I need to calm down right now' }], kind: 'care', id: 'pz-handoff' };
  }
  function pzListen(state) {
    var P = PZ(), H = (P && P.handoff) || {};
    pzS(state).offer = null;
    return { blocks: [{ k: 'p', x: pzPick(state, H.listen) }], chips: [{ label: 'It’s work or school', q: 'Something at work is getting to me' }, { label: 'It’s someone I live with', q: 'Things are hard with someone I live with' }, { label: 'I just feel low', q: 'I feel low' }], kind: 'care', id: 'pz-listen' };
  }
  function pzLighten(state) {
    var P = PZ(), H = (P && P.handoff) || {}, S = pzS(state);
    S.offer = null;
    return pzR(state, [{ k: 'p', x: pzPick(state, H.lighten) }], [{ label: 'A gentle joke', q: 'Tell me a gentle joke' }, { label: 'A tiny story', q: 'Tell me a tiny story' }, { label: 'A fun fact', q: 'Tell me a fun fact' }], 'chat', 'pz-lighten');
  }
  var PZ_HEAVY = /\b(died|dead|death|passed away|funeral|grief|griev\w*|cancer|hospital|dying|terminal|miscarr\w*|abus\w*|assault\w*|rape\w*|hit me|hurt me|lost my|bereave\w*|divorc\w*)\b/;
  function pzJoke(state, f) {
    var P = PZ(), S = pzS(state), H = P.handoff || {};
    if (PZ_HEAVY.test(f)) { S.offer = 'handoff'; S.offerAt = state.turn || 0; return { blocks: [{ k: 'p', x: pzPick(state, H.heavy_joke) }], chips: [{ label: 'Let’s talk about it', q: 'I’d like to talk about it' }], kind: 'care', id: 'pz-nojoke' }; }
    if (FUN_UPSET.test(f) || pzHint(state, stNorm(f))) { S.offer = 'handoff'; S.offerAt = state.turn || 0; return { blocks: [{ k: 'p', x: pzPick(state, H.upset_joke) }], chips: [{ label: 'Just a gentle joke, please', q: 'Just a gentle joke please' }, { label: 'Let’s talk about it', q: 'I’d like to talk about it' }], kind: 'care', id: 'pz-checkin' }; }
    var pool = (P.jokes || []).concat((KB.pers && KB.pers.jokes) || []);
    return pzR(state, [{ k: 'p', x: pzPick(state, pool) }], pzChips(state, [{ label: 'Another joke', q: 'Tell me another joke' }]), 'fun', 'pz-joke', 'joke');
  }
  function pzRiddle(state) {
    var P = PZ(), S = pzS(state), r = pzPick(state, P.riddles);
    S.game = { t: 'riddle', r: r, at: state.turn || 0 };
    return pzR(state, [{ k: 'p', x: 'Riddle time! ' + r.q }], [{ label: 'I give up', q: 'I give up' }, { label: 'Give me a hint', q: 'Give me a hint' }], 'fun', 'pz-riddle', 'riddle');
  }
  function pzRiddleAnswer(state, fs) {
    var S = pzS(state), r = S.game.r, keys = (r.keys || []).map(stNorm);
    if (/\b(hint|clue)\b/.test(fs)) {
      if (S.game.hinted) return pzR(state, [{ k: 'p', x: 'No more hints, I’m afraid. My notebook is closed. Have a guess, or say “I give up.”' }], [{ label: 'I give up', q: 'I give up' }], 'fun', 'pz-riddle');
      S.game.hinted = 1;
      var a0 = stNorm(r.a).replace(/^(an?|the|your|all) /, '');
      return pzR(state, [{ k: 'p', x: 'A hint: it starts with the letter “' + a0.charAt(0).toUpperCase() + '”.' }], [{ label: 'I give up', q: 'I give up' }], 'fun', 'pz-riddle');
    }
    S.game = null;
    var right = keys.some(function (k) { return k && new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 's?\\b').test(fs); });
    var giveUp = /\b(give up|i give in|tell me|no idea|idk|dunno|don t know|dont know|what is it|whats the answer|what s the answer|the answer|pass|no clue|reveal)\b/.test(fs);
    var x = right ? pzPick(state, ['Correct! ', 'Yes! You got it! ', 'Spot on! ', 'By my tassel, you’re right! ']) + r.a + ' ' + pzPick(state, ['Gold star for you. A dry one.', 'You’re far too clever for a puddle like me.', 'The three clouds are applauding. Quietly.'])
      : giveUp ? 'The answer is: ' + r.a + ' ' + pzPick(state, ['Tricky one, that.', 'Don’t worry, it took me a week.', 'Now you can try it on someone else!'])
      : pzPick(state, ['Ooh, good guess! ', 'Not quite, but I like your thinking! ', 'Close-ish! ']) + 'The answer is: ' + r.a;
    return pzR(state, [{ k: 'p', x: x }], pzChips(state, [{ label: 'Another riddle', q: 'Tell me another riddle' }]), 'fun', 'pz-riddle-answer', 'riddle');
  }
  function pzFact(state) {
    var P = PZ(), old = [];
    ((KB.pers && KB.pers.smalltalk && KB.pers.smalltalk.intents) || []).forEach(function (it) { if (it.id === 'fun_fact') old = it.replies || []; });
    return pzR(state, [{ k: 'p', x: pzPick(state, (P.facts || []).concat(old)) }], pzChips(state, [{ label: 'Another fact', q: 'Tell me another fun fact' }]), 'fun', 'pz-fact', 'fact');
  }
  function pzWyr(state) {
    var P = PZ(), S = pzS(state), w = pzPick(state, P.wyr);
    S.game = { t: 'wyr', w: w, at: state.turn || 0 };
    return pzR(state, [{ k: 'p', x: w.q }], [{ label: pzCap(w.a), q: pzCap(w.a) }, { label: pzCap(w.b), q: pzCap(w.b) }], 'fun', 'pz-wyr', 'wyr');
  }
  function pzWyrAnswer(state, fs) {
    var P = PZ(), S = pzS(state), w = S.game.w, has = function (ws) { return (ws || []).some(function (x) { return new RegExp('\\b' + stNorm(x) + '\\b').test(fs); }); };
    var a = has(w.aw) || stNorm(w.a) === fs || /^(the )?(first|1|first one|a|option a)$/.test(fs), bb = has(w.bw) || stNorm(w.b) === fs || /^(the )?(second|2|second one|b|option b|last|the other one)$/.test(fs);
    var both = /\b(both|neither|either|none)\b/.test(fs);
    if (!a && !bb && !both && fs.split(' ').length > 4) { S.game = null; return null; }
    S.game = null;
    var x = both ? ((P.wyr_both || [])[/\b(neither|none)\b/.test(fs) ? 1 : 0] || '') : pzPick(state, P.wyr_react);
    return pzR(state, [{ k: 'p', x: x + ' ' + w.pick }], pzChips(state, [{ label: 'Another one', q: 'Another would you rather' }]), 'fun', 'pz-wyr-answer', 'wyr');
  }
  function pzStory(state) { var P = PZ(); return pzR(state, [{ k: 'p', x: pzPick(state, P.stories) }], pzChips(state, [{ label: 'Another story', q: 'Tell me another story' }]), 'fun', 'pz-story', 'story'); }
  function pzCompliment(state) { var P = PZ(); return pzR(state, [{ k: 'p', x: pzFill(state, pzPick(state, P.compliments)) }], pzChips(state, [{ label: 'Another one', q: 'Another compliment' }]), 'fun', 'pz-compliment', 'compliment'); }
  function pzRate(state, fs, about) {
    var P = PZ(), R = P.rate || {}, S = pzS(state);
    var desc = String(about || '').trim();
    if (!desc || desc.split(' ').length < 2) { S.game = { t: 'rate', at: state.turn || 0 }; return pzR(state, [{ k: 'p', x: pzPick(state, R.ask) }], [{ label: 'Nothing special, really', q: 'Nothing special really' }], 'fun', 'pz-rate', 'rate'); }
    S.game = null;
    var d = stNorm(desc), good = (P.rate_good || []).filter(function (w) { return new RegExp('\\b' + w + '\\b').test(d); }), meh = (P.rate_meh || []).filter(function (w) { return new RegExp('\\b' + w + '\\b').test(d); });
    var score = Math.max(6, Math.min(10, 7 + good.length - (meh.length ? 1 : 0)));
    var line = pzPick(state, score >= 9 ? R.high : score >= 7 ? R.mid : R.low), b = [{ k: 'p', x: line }];
    var bits = [];
    if (good.length) bits.push(pzFill(state, pzPick(state, (P.rate_comments || {}).good), { thing: good[0] }));
    if (meh.length) bits.push(pzFill(state, pzPick(state, (P.rate_comments || {}).meh), { thing: meh[0] }));
    bits.push(pzPick(state, R.note));
    b.push({ k: 'p', x: bits.join(' ') });
    b.push({ k: 'p', x: pzPick(state, ['What would make tomorrow an eleven?', 'What was the best bit?', 'Anything you’re looking forward to tomorrow?']) });
    return pzR(state, b, pzChips(state, []), 'fun', 'pz-rate-answer', 'rate');
  }
  function pzCheer(state) {
    var P = PZ(), x = pzPick(state, P.cheer), pool = (P.jokes || []).concat((KB.pers && KB.pers.jokes) || []);
    var extra = frand(state) < 0.5 ? pzPick(state, pool) : pzFill(state, pzPick(state, P.compliments));
    return pzR(state, [{ k: 'p', x: x }, { k: 'p', x: extra }], [{ label: 'Another one', q: 'Cheer me up' }, { label: 'Tell me a tiny story', q: 'Tell me a tiny story' }, { label: 'Something’s getting me down', q: 'Something’s getting me down' }], 'fun', 'pz-cheer', 'cheer');
  }
  function pzBored(state) {
    var P = PZ(), L = pzPick(state, P.bored_links || []), line = pzPick(state, P.bored);
    var b = [{ k: 'p', x: line }];
    // a line that promises the arcade links the arcade (and the calm games), never only the Night Garden (puddles16)
    b.push({ k: 'links', x: [['Tidbit and Sugarfoot’s Arcade', '/frequency-journey.html'], ['Home Run Derby', '/frequency-journey.html#derby'], ['Gentle games (Pause & Play)', '/pause-and-play.html']] });
    return pzR(state, b, [{ label: 'Rock, paper, scissors', q: 'Rock paper scissors' }, { label: 'Quiz me', q: 'Quiz me' }, { label: 'Would you rather…', q: 'Would you rather' }, { label: 'Tell me a riddle', q: 'Tell me a riddle' }], 'fun', 'pz-bored', 'bored');
  }
  function pzRpsStart(state) {
    var P = PZ(), S = pzS(state);
    S.game = { t: 'rps', at: state.turn || 0 };
    return pzR(state, [{ k: 'p', x: pzPick(state, P.rps.start) }], [{ label: '✊ Rock', q: 'Rock' }, { label: '✋ Paper', q: 'Paper' }, { label: '✌️ Scissors', q: 'Scissors' }], 'fun', 'pz-rps', 'rps');
  }
  function pzRpsPlay(state, fs) {
    var P = PZ(), S = pzS(state), m = /\b(rock|stone|paper|scissors?)\b/.exec(fs);
    if (!m) return null;
    var you = /^(rock|stone)$/.test(m[1]) ? 'rock' : m[1] === 'paper' ? 'paper' : 'scissors', opts = ['rock', 'paper', 'scissors'];
    var me = opts[Math.floor(frand(state) * 3) % 3], beats = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
    var res = you === me ? 'draw' : beats[you] === me ? 'win' : 'lose';
    S.rps = S.rps || { you: 0, me: 0 };
    if (res === 'win') S.rps.you++; else if (res === 'lose') S.rps.me++;
    S.game = { t: 'rps', at: state.turn || 0 };
    var x = 'You: ' + you + '. Me: ' + me + '. ' + pzPick(state, P.rps[res]) + ' (Score: you ' + S.rps.you + ', me ' + S.rps.me + '.)';
    var b = [{ k: 'p', x: x }];
    if (frand(state) < 0.25) b.push({ k: 'p', x: pzPick(state, P.rps.puddle) });
    b.push({ k: 'p', x: 'Again? Pick one!' });
    return pzR(state, b, [{ label: '✊ Rock', q: 'Rock' }, { label: '✋ Paper', q: 'Paper' }, { label: '✌️ Scissors', q: 'Scissors' }, { label: 'Something else', q: 'Let’s do something else' }], 'fun', 'pz-rps-round', 'rps');
  }
  var PZ_NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20 };
  function pzGuessStart(state) {
    var P = PZ(), S = pzS(state);
    S.game = { t: 'guess', n: 1 + (Math.floor(frand(state) * 20) % 20), tries: 0, at: state.turn || 0 };
    return pzR(state, [{ k: 'p', x: pzPick(state, P.guess.start) }], [{ label: '10', q: '10' }, { label: '5', q: '5' }, { label: '15', q: '15' }], 'fun', 'pz-guess', 'guess');
  }
  function pzGuessPlay(state, fs) {
    var P = PZ(), S = pzS(state), G = S.game, m = /\b(\d{1,3})\b/.exec(fs), n = m ? +m[1] : null;
    if (n == null) { var w = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/.exec(fs); if (w) n = PZ_NUMW[w[1]]; }
    if (n == null) {
      if (/\b(give up|tell me|i give in|what was it|what is it)\b/.test(fs)) { S.game = null; return pzR(state, [{ k: 'p', x: pzFill(state, pzPick(state, P.guess.out), { n: G.n }) }], pzChips(state, [{ label: 'Play again', q: 'Guess the number' }]), 'fun', 'pz-guess-end', 'guess'); }
      return null;
    }
    G.tries++;
    if (n === G.n) { S.game = null; return pzR(state, [{ k: 'p', x: pzFill(state, pzPick(state, P.guess.right), { n: G.n, t: G.tries === 1 ? 'one guess' : G.tries + ' guesses' }) }], pzChips(state, [{ label: 'Play again', q: 'Guess the number' }]), 'fun', 'pz-guess-end', 'guess'); }
    if (G.tries >= 5) { S.game = null; return pzR(state, [{ k: 'p', x: pzFill(state, pzPick(state, P.guess.out), { n: G.n }) }], pzChips(state, [{ label: 'Play again', q: 'Guess the number' }]), 'fun', 'pz-guess-end', 'guess'); }
    var hl = n < G.n ? pzPick(state, P.guess.higher) : pzPick(state, P.guess.lower);
    if (n < 1 || n > 20) hl = 'Between 1 and 20, remember! ' + hl;
    return pzR(state, [{ k: 'p', x: hl + ' ' + (5 - G.tries) + (5 - G.tries === 1 ? ' guess left.' : ' guesses left.') }], [], 'fun', 'pz-guess', 'guess');
  }
  function pzQuizQ(state) {
    var S = pzS(state), G = S.game, Q = G.qs[G.n];
    var lab = ['A', 'B', 'C'];
    return { blocks: [{ k: 'p', x: 'Question ' + (G.n + 1) + ' of 3: ' + Q.q + ' ' + Q.opts.map(function (o, i) { return lab[i] + ') ' + o; }).join('  ') }], chips: Q.opts.map(function (o) { return { label: o, q: o }; }) };
  }
  function pzQuizStart(state) {
    var P = PZ(), S = pzS(state), qs = [];
    for (var i = 0; i < 3; i++) qs.push(pzPick(state, P.quiz));
    S.game = { t: 'quiz', qs: qs, n: 0, score: 0, at: state.turn || 0 };
    var q = pzQuizQ(state);
    return pzR(state, [{ k: 'p', x: pzPick(state, P.quiz_intro) }].concat(q.blocks), q.chips, 'fun', 'pz-quiz', 'quiz');
  }
  function pzQuizAnswer(state, fs) {
    var P = PZ(), S = pzS(state), G = S.game, Q = G.qs[G.n], pick = -1;
    if (/^(stop|quit|enough|end|no more|stop the quiz|end the quiz|i m done|im done)$/.test(fs)) { S.game = null; return pzR(state, [{ k: 'p', x: 'Quiz over! You scored ' + G.score + '. Thank you for playing.' }], pzChips(state, []), 'fun', 'pz-quiz-end', 'quiz'); }
    var lm = /^(?:(?:it s|its|is it|i think|maybe|answer|option) )?([abc123])$/.exec(fs);
    if (lm) pick = { a: 0, b: 1, c: 2, 1: 0, 2: 1, 3: 2 }[lm[1]];
    if (pick < 0) Q.opts.forEach(function (o, i) { var on = stNorm(o).replace(/^(the|a|an) /, ''); if (pick < 0 && (fs === stNorm(o) || new RegExp('\\b' + on.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(fs))) pick = i; });
    if (pick < 0) {
      if (fs.split(' ').length <= 3) return pzR(state, [{ k: 'p', x: 'Hmm, that’s not one of the three. Tap one, or type A, B or C!' }], pzQuizQ(state).chips, 'fun', 'pz-quiz');
      S.game = null; return null;
    }
    var ok = pick === Q.a;
    if (ok) G.score++;
    var b = [{ k: 'p', x: pzPick(state, ok ? P.quiz_right : P.quiz_wrong) + ' ' + Q.why }];
    G.n++;
    if (G.n >= 3) {
      S.game = null;
      b.push({ k: 'p', x: pzPick(state, (P.quiz_end || {})[String(G.score)] || ['Well played!']) });
      return pzR(state, b, pzChips(state, [{ label: 'Another quiz', q: 'Quiz me' }]), 'fun', 'pz-quiz-end', 'quiz');
    }
    var nq = pzQuizQ(state);
    return pzR(state, b.concat(nq.blocks), nq.chips, 'fun', 'pz-quiz', 'quiz');
  }
  function pzReact(state, bank, o) {
    var P = PZ(), R = P.react || {}, b = [{ k: 'p', x: pzFill(state, pzPick(state, R[bank] || R.ok), o) }];
    var ask = pzAskBack(state);
    if (ask) b.push({ k: 'p', x: ask });
    return pzR(state, b, pzChips(state, []), bank === 'laugh' ? 'fun' : 'chat', 'pz-react-' + bank);
  }
  function pzMemQ(state, fav) {
    var P = PZ(), S = pzS(state), M = P.memory || {};
    if (fav) return pzR(state, [{ k: 'p', x: S.mem.fav ? pzFill(state, pzPick(state, M.fav_q), { thing: S.mem.fav.thing }) : pzPick(state, M.fav_none) }], pzChips(state, []), 'chat', 'pz-memq');
    return pzR(state, [{ k: 'p', x: S.mem.pet ? pzFill(state, pzPick(state, M.pet_q)) : pzPick(state, M.pet_none) }], pzChips(state, []), 'chat', 'pz-memq');
  }
  function pzKeep(state) {
    var P = PZ(), M = P.memory || {}, S = pzS(state), name = chatName(state), parts = [];
    if (name) parts.push('your name');
    if (S.mem.pet) parts.push(S.mem.pet + '’s name');
    if (S.mem.fav) parts.push('your favourite');
    if (!parts.length) return pzR(state, [{ k: 'p', x: M.keep_nothing }], pzChips(state, []), 'chat', 'pz-keep');
    if (!pzPerks()) return { blocks: [{ k: 'p', x: M.keep_no }, { k: 'links', x: [['What this site keeps on your device, and how saving works', '/on-this-device.html']] }], chips: pzChips(state, []), kind: 'chat', id: 'pz-keep', fun: 1 };
    S.kept = 1; pzSave(state);
    var list = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0];
    return pzR(state, [{ k: 'p', x: pzFill(state, M.keep_yes, { list: list }) }], pzChips(state, [{ label: 'Forget me', q: 'Forget me' }]), 'chat', 'pz-keep');
  }
  function pzForget(state) {
    var P = PZ(), S = pzS(state);
    S.mem = {}; S.kept = 0; S.called = {}; S.at = {}; state.name = '';
    try { sessionStorage.setItem(PZ_MEM_KEY, '{}'); sessionStorage.setItem('tol-chat-name', ''); } catch (e) {}
    try { var L = pzLocal(); if (L) L.removeItem(PZ_KEEP_KEY); } catch (e) {}
    return pzR(state, [{ k: 'p', x: (P.memory || {}).forgot }], pzChips(state, []), 'chat', 'pz-forget');
  }
  // which explicit request a message is ("tell me a joke", "quiz me", "rate my day: …"), or ''
  function pzRequest(fs, f) {
    if (PZ_ADULT.test(fs)) return 'adult';
    if (PZ_ROAST.test(fs)) return 'roast';
    if (PZ_FLIRT.test(fs)) return 'flirt';
    if (PZ_TEASE.test(fs)) return 'tease';
    if (PZ_QUIZ.test(fs)) return 'quiz';
    if (PZ_GUESS.test(fs)) return 'guess';
    if (PZ_RPS.test(fs) && fs.split(' ').length <= 8) return 'rps';
    if (PZ_RIDDLE.test(fs)) return 'riddle';
    if (PZ_WYR_ASK.test(fs)) return 'wyrAsk';
    if (PZ_WYR.test(fs)) return 'wyr';
    if (PZ_STORY.test(fs)) return 'story';
    if (PZ_COMPL.test(fs)) return 'compliment';
    if (PZ_RATE.test(fs)) return 'rate';
    if (PZ_FACT.test(fs)) return 'fact';
    if (PZ_CHEER.test(fs) && !PZ_JOKE.test(fs)) return 'cheer';
    if (PZ_JOKE.test(fs) || (JOKE_ASK.test(f) && !PZ_AGAIN.test(fs))) return 'joke';
    if (PZ_BORED.test(fs)) return 'bored';
    if (PZ_REMEMBER.test(fs)) return 'keep';
    if (PZ_FORGET.test(fs)) return 'forget';
    if (PZ_PETQ.test(fs)) return 'petq';
    if (PZ_FAVQ.test(fs)) return 'favq';
    return '';
  }
  function pzDo(state, req, fs, f, raw) {
    var P = PZ(), S = pzS(state);
    switch (req) {
      case 'adult': return { blocks: [{ k: 'p', x: pzPick(state, P.adult) }], chips: [{ label: 'A clean joke', q: 'Tell me a joke' }, { label: 'A riddle', q: 'Tell me a riddle' }], kind: 'chat', id: 'pz-adult', fun: 1 };
      case 'roast': return pzR(state, [{ k: 'p', x: pzPick(state, P.self_jokes) }], pzChips(state, [{ label: 'Compliment me instead', q: 'Compliment me' }]), 'fun', 'pz-roast');
      case 'tease': return pzR(state, [{ k: 'p', x: pzPick(state, P.tease) }], pzChips(state, []), 'fun', 'pz-tease');
      case 'flirt': return pzR(state, [{ k: 'p', x: pzPick(state, P.flirt) }], pzChips(state, []), 'chat', 'pz-flirt');
      case 'quiz': return pzQuizStart(state);
      case 'guess': return pzGuessStart(state);
      case 'rps': { var direct = /\b(rock|stone|paper|scissors?)\b/.test(fs.replace(PZ_RPS, ' ')); return direct ? pzRpsPlay(state, fs.replace(PZ_RPS, ' ')) : pzRpsStart(state); }
      case 'riddle': return pzRiddle(state);
      case 'wyrAsk': {
        var m = PZ_WYR_ASK.exec(fs), opt = frand(state) < 0.5 ? m[1] : m[2];
        if (FUN_UPSET.test(opt) || pzSerious(opt)) return null;
        return pzR(state, [{ k: 'p', x: pzFill(state, pzPick(state, P.wyr_mine), { thing: opt.replace(/^(be |have |be able to )/, '') }) }, { k: 'p', x: 'Your turn: which would you pick?' }], pzChips(state, [{ label: 'Ask me one', q: 'Would you rather' }]), 'fun', 'pz-wyr-mine', 'wyr');
      }
      case 'wyr': return pzWyr(state);
      case 'story': return pzStory(state);
      case 'compliment': return pzCompliment(state);
      case 'rate': { var about = String(raw || '').replace(/^[\s\S]*?\brate (?:my|our) (?:day|week|morning|afternoon|evening|weekend|lunch|dinner|breakfast)\b[\s:,.\-–—!]*/i, ''); return pzRate(state, fs, about); }
      case 'fact': return pzFact(state);
      case 'cheer': return pzCheer(state);
      case 'joke': return pzJoke(state, f);
      case 'bored': return pzBored(state);
      case 'keep': return pzKeep(state);
      case 'forget': return pzForget(state);
      case 'petq': return pzMemQ(state, false);
      case 'favq': return pzMemQ(state, true);
    }
    return null;
  }
  function pzEarly(state, q0, vf) {
    var P = PZ(); if (!P) return null;
    if (state.checkAsk && (state.turn || 0) - state.checkAsk.turn === 1) return null;   // the answer to the message checker's one question
    var S = pzS(state), t = state.turn || 0, raw = String(q0 || '').trim(), fs = stNorm(raw), f = vf;
    // anything that may be about danger, fear or harm: no games, no jokes, no offers carried over
    if (pzBlocked(state) || pzSerious(f) || pzSerious(fs)) { S.game = null; S.offer = null; return null; }
    if (S.game && t - (S.game.at || 0) > 6) S.game = null;
    var offer = S.offerAt === t - 1 ? S.offer : null;
    if (S.offerAt !== t - 1) S.offer = null;
    var em = pzEmoji(raw);
    if (em === 'sad' || em === 'cross') return pzHandoff(state, em);
    // after the hand-off: talk about it, or something gentle
    if (offer === 'handoff') {
      if (PZ_TALK.test(fs) || PZ_YES.test(fs)) return pzListen(state);
      if (PZ_SILLY.test(fs) || PZ_NO.test(fs)) return pzLighten(state);
    }
    // a hint that something real is going on, in the middle of a light chat: a plain hand-off
    if (pzHint(state, fs) && pzCtx(state) && fs.split(' ').length <= 14 && !PZ_REL.test(fs)) return pzHandoff(state);
    if (FUN_UPSET.test(f) && !PZ_JOKE.test(fs) && !JOKE_ASK.test(f)) { S.game = null; return null; }
    if (PZ_BETTER.test(fs) && (state.lastKind === 'care' || /^pz-/.test(state.lastId || '')) && !state.fearSeen && !pzHint(state, fs)) {
      S.offer = 'better'; S.offerAt = t;
      return { blocks: [{ k: 'p', x: pzFill(state, pzPick(state, (P.handoff || {}).better)) }], chips: [{ label: 'Tell me a joke', q: 'Tell me a joke' }, { label: 'Let’s just chat', q: 'Let’s just chat' }, { label: 'Something else', q: 'What can I ask?' }], kind: 'chat', id: 'pz-better', fun: 1 };
    }
    if (JUST_CHAT.test(f) || JUST_CHAT.test(fs) || /^(?:just chat|just chatting|chit chat|chitchat|small talk please|let s chit chat|lets chit chat|let s just talk|lets just talk|i just want to chat|i just want to talk|can we just chat)$/.test(fs)) {
      S.mode = true; S.game = null;
      return pzR(state, [{ k: 'p', x: pzFill(state, pzPick(state, P.just_chat)) }], pzChips(state, [{ label: 'How’s your day, Professor?', q: 'How’s your day, Professor?' }, { label: 'Tell me a joke', q: 'Tell me a joke' }, { label: 'I’m bored', q: 'I’m bored' }]), 'chat', 'just_chat');
    }
    var req = pzRequest(fs, f);
    // a riddle still open, and they've moved on: tell them the answer first
    var pre = null;
    if (S.game && S.game.t === 'riddle' && req && req !== 'riddle') { pre = { k: 'p', x: '(The answer to my riddle: ' + S.game.r.a + ')' }; S.game = null; }
    if (!req && S.game) {
      var g = S.game, gr = null;
      if (g.t === 'riddle' && fs.split(' ').length <= 8 && !stIntent(f, fs)) gr = pzRiddleAnswer(state, fs);
      else if (g.t === 'wyr' && fs.split(' ').length <= 10) gr = pzWyrAnswer(state, fs);
      else if (g.t === 'rps') gr = pzRpsPlay(state, fs);
      else if (g.t === 'guess') gr = pzGuessPlay(state, fs);
      else if (g.t === 'quiz') gr = pzQuizAnswer(state, fs);
      else if (g.t === 'rate' && fs.split(' ').length <= 60) { if (!pzHint(state, fs)) gr = pzRate(state, fs, raw.length > 2 ? raw : 'a day'); }
      if (gr) return gr;
      S.game = null;
    }
    if (!req && PZ_AGAIN.test(fs) && S.lastAct && t - (S.lastAt || 0) <= 2) req = { joke: 'joke', riddle: 'riddle', fact: 'fact', wyr: 'wyr', story: 'story', compliment: 'compliment', quiz: 'quiz', rps: 'rps', guess: 'guess', cheer: 'cheer' }[S.lastAct] || '';
    if (!req && offer && offer !== 'handoff' && PZ_YES.test(fs)) req = offer === 'better' ? 'joke' : offer;
    if (req) {
      var r = pzDo(state, req, fs, f, raw);
      if (r) { S.lastAt = t; if (pre && r.blocks) r.blocks.unshift(pre); var lx = r.blocks && r.blocks[r.blocks.length - 1] && r.blocks[r.blocks.length - 1].x; if (typeof lx === 'string' && /\b(joke|riddle|story)\?\s*$/i.test(lx)) { S.offer = (/joke\?/i.test(lx) ? 'joke' : /riddle\?/i.test(lx) ? 'riddle' : 'story'); S.offerAt = t; } return r; }
    }
    // "I love Christmas", "I'm planning a birthday party", "do you play video games?": chit-chat, before the care cards and
    // playbooks read them as a problem (only with no one else named, nothing negative and nothing upsetting in it)
    var fs2 = fs.replace(PZ_LEAD, '');
    if (!em && (PZ_ASKHIM.test(fs2) || PZ_POS.test(fs2)) && !PZ_REL.test(fs) && !PZ_NEG.test(fs) && fs.split(' ').length <= 16) {
      var pw = pzWhich(state, fs, null);
      if (pw && pw.strong) { var tr = pzTopic(state, raw, f, raw, null); if (tr) return tr; }
    }
    // reactions: laughter, emoji, "ok", "yes", "no", "wow", "idk"
    if (em) {
      var R = P.react || {};
      if (em === 'laugh') return pzReact(state, 'laugh');
      if (R[em]) return pzReact(state, em);
      return pzReact(state, 'emoji', { e: raw.replace(/\s+/g, '') });
    }
    if (PZ_LAUGH.test(fs)) return pzReact(state, 'laugh');
    var ctx = pzCtx(state) || t <= 1;
    if (ctx && fs.split(' ').length <= 4) {
      if (PZ_SHRUG.test(fs) && state.stAsk === t - 1) return pzReact(state, 'shrug');
      if (PZ_YES.test(fs) && !/^please$/.test(fs)) return pzReact(state, 'yes');
      if (PZ_NO.test(fs)) return pzReact(state, 'no');
      if (PZ_WOW.test(fs) && fs !== 'what') return pzReact(state, 'wow');
      if (PZ_OK.test(fs)) return pzReact(state, 'ok');
    }
    return null;
  }
  // after the usual answer: a hint that nothing found (a hand-off), or in a light chat, nonsense and one-word replies
  function pzLate(state, q0, f, r, sp) {
    var P = PZ(); if (!P || !r) return null;
    var S = pzS(state), raw = String(q0 || '').trim(), fs = stNorm(raw);
    if (pzBlocked(state) || pzSerious(f) || r.kind === 'safety' || r.kind === 'redflag') return null;
    var weak = !r.kind || /^(search|offtopic|none|unclear)$/.test(r.kind) || (r.kind === 'clarify' && !r.cq) || (r.kind === 'chat' && !r.id);
    if (!weak) return null;
    if (pzHint(state, fs) && fs.split(' ').length <= 14) return pzHandoff(state);
    if (FUN_UPSET.test(f) || !pzCtx(state)) return null;
    var nonsense = (sp && sp.unknown && !sp.known) || PZ_MASH.test(fs.replace(/\s+/g, ''));
    if (nonsense) return pzR(state, [{ k: 'p', x: pzPick(state, (P.react || {}).nonsense) }], pzChips(state, []), 'chat', 'pz-nonsense');
    if (/^[a-z][a-z'-]{1,15}$/.test(fs) && /^(offtopic|none|unclear)$/.test(r.kind || '')) return pzReact(state, 'oneword', { word: fs });
    return null;
  }
  function respond1(state, q, chipDoc) {
    var f = norm(q), prevLast = state.last;
    if (chipDoc == null && SELF_HARMFUL.test(f) && !/\b(he|she|they|my (husband|wife|partner|boyfriend|girlfriend|ex|dad|mum|mom|father|mother|stepdad|stepmom)) (says|said|calls|called|tells|told) (me )?(i m|im|i am)\b/.test(f)) { state.last = null; state.unsafe = false; return selfHarmfulReply(f); }
    if (chipDoc == null && CV_RESTART.test(f)) state.unsafe = false;
    if (chipDoc == null && state.unsafe && !DANGER.test(f) && !HIDE.test(f) && AFTER_SAFE.test(f)) { state.last = null; return afterSafeReply(f); }
    if (chipDoc == null) {
      if (DANGER.test(f)) {
        state.last = null; state.topic = null; state.pageTopic = null;
        if (THREAT_SELF.test(f)) { state.unsafe = true; return threatSelfReply(f); }
        if (NOT_LIVE.test(f) && !OTHER_HARM.test(f)) state.crisis = state.turn || 1;
        if (!(PARENT_PHONE.test(f) && !HARD.test(f)) && !OTHER_HARM.test(f) && !NOT_LIVE.test(f)) state.unsafe = true;
        if (OTHER_HARM.test(f) && !/\b(i|me|my ?self)\b.{0,20}\b(cut|hurt|harm|kill|die)\b/.test(f)) return otherHarmReply();
        var thc = !HARD.test(f) && cardByIdF('teenhouse');
        if (thc && thc.re.test(f) && !/\b(partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse|fianc\w*)\b/.test(f)) { state.unsafe = false; var rth = cardReply(state, thc, 'about'); rth.kind = 'care'; return rth; }
        var pc = PARENT_PHONE.test(f) && !HARD.test(f) && cardByIdF('parentphone');
        if (pc) { var rp = cardReply(state, pc, 'about'); rp.kind = 'care'; return rp; }
        return CONTROL.test(f) && !HARD.test(f) && !/\bso (that )?i (couldn.?t|couldnt|could not|can.?t|cant)\b/.test(f) ? controlReply(f) : safetyReply(f);
      }
      if (HIDE.test(f)) { state.last = null; return hideReply(); }
      f = roommatesFigure(f);
      var fu = followUp(state, f, q);
      if (fu && fu.needBG) return fu;
      if (fu && fu.more) return more(state);
      if (fu && fu.redirect) { var cf2 = careFirst(state, fu.redirect); if (cf2) return cf2; var keep = state.last; var r0 = respondSite(state, fu.redirect, null, fu.prefer); if (r0.needBG) state.last = keep; return r0; }
      if (fu) return fu;
      var calc = calculators(q, f);
      if (calc) { state.last = { kind: 'calc', q: calc.topic || 'calculator', topic: calc.topic }; return calc; }
      var nq = nineQuery(f), nr = nq && nineReply(state, nq);
      if (nr) return nr;
      var idm = idiomQuery(f);
      if (idm) return idiomReply(state, idm);
      var tq = termQuery(q), tf = tq && termFor(tq.target);
      // a term, unless a tool or page with its own card has that name ("Drift, the calm visualizer", "the Lemonade Stand")
      // or the term was only found by another name ("WP-11" is the Calm-Down Kit card); "carrier wave" is the idea, not the Decoder
      var tc = tf && matchCard(norm(tq.target));
      // a card named "Who does what? (the Lemonade Stand)" is the Lemonade Stand too: its name, the part before the brackets, or the part inside
      var tcNames = tc ? (function (n) { var m = /^(.*?)\s*\((?:once |also called |a step of )?(.*?)\)\s*$/.exec(n); return [n, m && m[1], m && m[2]].filter(Boolean).map(termKey); })(String(tc.name || '').split(',')[0]) : [];
      if (tf && (!tc || (tf.own && tcNames.indexOf(termKey(tf.t.t)) === -1))) return termReply(state, tf.t, tq.noEx);
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
      if (wo && !(detectSituation(f).score >= 5)) return clarifyWho(state, wo.who, wo.noun);
      for (var ci = 0; ci < (KB.clar || []).length; ci++) {
        var cl = KB.clar[ci];
        if (cl.re.test(f)) { state.last = null; return { blocks: [{ k: 'p', x: cl.x }], chips: cl.chips.map(function (c) { return { label: c[0], q: c[1] }; }), kind: 'clarify', amb: cl.plain ? 0 : 1, id: cl.id || '' }; }
      }
      var sit = detectSituation(f);
      // "he", "she", "they" after a playbook about someone: the same person, unless someone new is named
      if (prevLast && prevLast.kind === 'sit' && sit.pronoun && (!sit.who || sit.who === 'other') && prevLast.who && prevLast.who !== 'self' && prevLast.who !== 'other') {
        sit.who = prevLast.who; sit.noun = prevLast.noun;
        if (sit.issue && IDX.sit.issues[sit.issue].only && IDX.sit.issues[sit.issue].only.indexOf(sit.who) === -1) sit.who = 'other';
      }
      // the relationship we're already talking about: "she" after a co-parent answer is the other parent, never a romance
      var relT = topicRoot(state) || topicCard(state), rel = relT && relOf(relT.id);
      if (rel && sit.issue && (!sit.who || sit.who === 'other' || (sit.who === 'partner' && !/\b(partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse|fianc\w*)\b/.test(f))) && !(IDX.sit.issues[sit.issue].only && IDX.sit.issues[sit.issue].only.indexOf(rel) === -1)) { sit.who = rel; sit.noun = ''; }
      if (!sit.personal && /^(is it|its|it is|is that|isnt it) (normal|ok|okay|common|natural|wrong|bad|weird|fine|unusual) to\b|\b(feel|feeling|felt)\b/.test(f)) sit.personal = true;
      // "the group chat is dead", "how should roommates split chores": a clear situation, even without "I" or "my"
      if (!sit.personal && sit.issue && !defn && (sit.score >= 5 || (sit.score >= 2 && sit.who && sit.who !== 'self' && sit.who !== 'other' && /^(how|what|why|should|do|does|can)\b/.test(f)))) sit.personal = true;
      var card = matchCard(f);
      var asksAbout = /^(what|whats|how|hows|where|which|when|why|is|are|does|do|can|could|should|tell me|explain|show me|define|who)\b/.test(f) && !/\b(when|if) (my|our|i|we|he|she|they)\b|\b(my|our) (partner|husband|wife|boyfriend|girlfriend|spouse|roommates?|housemates?|coworkers?|colleagues?|boss|manager|team|sister|brother|mom|mum|dad|mother|father|parents?|kids?|son|daughter|teen|teenager|friends?|ex)\b.*\b(keeps?|always|never|wont|doesnt|wont|wants?|says?|makes?|leaves?|forgets?)\b/.test(f);
      var road = /\b(path|road|which (tools?|workpapers?|pages?)|what (tools?|workpapers?|pages?)|where (do|should|can) (we|i) (start|begin)|start with|best tool|good tool|tool for|tools for)\b/.test(f);
      if (road && sit.who && sit.who !== 'self' && sit.who !== 'other' && !card && (!sit.issue || sit.score < 3 || /^(which|what|where)\b/.test(f))) return roadReply(state, sit.who, sit.noun);
      // "why did she get so upset?" about something a Logic card explains clearly (a present, a correction): that card, before a playbook
      if (LOGIC_CUE.test(f) && !card && !DANGER.test(f) && !state.unsafe && !VERBAL.test(f) && !HARD.test(f)) { var lgE = logicMatch(q, 11); if (lgE) return logicReply(state, lgE); }
      var sitOk = sit.issue && sit.score >= 2 && sit.personal && !(defn && !/\b(my|our|i|we|me)\b/.test(norm(defn)));
      if (card && (!sitOk || asksAbout || sit.score < 3)) return cardReply(state, card, cardAspect(f));
      if (sitOk) {
        // a match that rests on one word that could mean two things ("ignores me"): ask, rather than answer the wrong one
        for (var ai = 0; ai < AMBIG.length; ai++) {
          var A = AMBIG[ai];
          if (sit.issue === A[0] && A[1].test(f) && !A[2].test(f)) { state.last = null; return { blocks: [{ k: 'p', x: A[3] }], chips: A[4].map(function (c) { return { label: c[0], q: c[1] }; }), kind: 'clarify' }; }
        }
        return sitReply(state, sit.issue, sit.who, sit.noun, sit.feel, 0, sit.actor);
      }
      if (UNFAIR_DESC.test(f) && !card && !DANGER.test(f) && !FEAR_W.test(f) && !FAIR_NOT.test(f) && window.TOLClarifyData) {
        var ut = unfairType(f), ur = ut && cqStart(state, ut, q, [{ k: 'p', x: 'That sounds wearing. Before I say anything about it, a few short questions will help me answer fairly, rather than guess.' }]);
        if (ur) { state.last = null; state.care = null; return ur; }
        state.last = null;
        return { blocks: [{ k: 'p', x: 'That sounds hard. So my answer fits, what is it mostly about? Pick one, and I’ll ask a few short questions, one at a time.' }],
          chips: [{ label: 'Who does what', q: 'A few questions about who does what' }].concat(PICK_CHIPS), kind: 'clarify', id: 'unfairpick' };
      }
    }
    if (chipDoc == null && LOGIC_CUE.test(f) && !DANGER.test(f) && !state.unsafe && !VERBAL.test(f) && !HARD.test(f)) { var lgm = logicMatch(q); if (lgm) return logicReply(state, lgm); }
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
      { var gl = KB.pers && !quietOn() ? funLine(state, 'greetings') : '';
        return { blocks: [{ k: 'p', x: gl || (pick(['Hello! ', 'Hi there! ', 'Hey, nice to see you. ']) + 'I can share what this site says about relationships, fair sharing of the load, check-ins, different wiring and calming down. What’s on your mind?') }], chips: GREET_CHIPS, kind: 'hello', fun: gl ? 1 : 0 }; }
    if (/^(thanks?( you)?( so much| a lot)?|ty|thx|cheers|thank u|appreciate it|that helps?|that was helpful|great|perfect|nice|cool|lovely|awesome)$/.test(f))
      return { blocks: [{ k: 'p', x: pick(['You’re welcome. ', 'Happy to help. ', 'Any time. ']) + 'Ask me something else whenever you like.' }], chips: [{ label: 'Surprise me', q: 'Surprise me' }, { label: 'Give me a little tip', q: 'Give me a tip' }] };
    if (/^(bye|goodbye|see (you|ya)|good ?night|later)$/.test(f))
      return { blocks: [{ k: 'p', x: 'Take care. I’ll be here if you want to look something up again.' }], chips: [] };
    if (/\b(what can you do|what do you do|how do(es)? (this|you) work|who are you|what are you|help me use|what can i ask|how can you help|are you (an? )?(ai|bot|robot|human|real))\b/.test(f) || f === 'help')
      return { blocks: [
        { k: 'p', x: (KB.pers && !quietOn() && funLine(state, 'self_description')) || 'I’m Professor Puddles, a small helper that knows this program inside out. I can explain any tool, workpaper, chapter or game, and walk you through how to use it and what your results mean.' },
        { k: 'list', x: ['Tell me what’s going on, with yourself or someone else, and I’ll suggest a few kind steps, words you could use, and a short path on the site.',
          'Type your Battery Meter answers (like “my battery answers are 3, 2, 4, 1, 2”) or your CALC-01 numbers, and I’ll work out the score with you.',
          'Ask “what is…” about any term, and say “tell me more” or “give me an example” to keep going.',
          'Two ways to talk with me. Light mode is the usual one: questions like these, or just chat (“how are you?” “tell me a joke”). Deep mode: say “talk deep” and we’ll think through a big question, like what love is, with philosophy, psychology and an autistic lens, tied back to the site. Say “keep it light” to come back up.',
          'I can also make you an infographic on anything here: just ask, like “make an infographic about the mental load,” or “summarize this as an infographic” after an answer.'] },
        { k: 'p', x: HONEST_LINE + ' When the site doesn’t cover something, I have some background notes, and I’ll always say when an answer comes from them. Everything happens in your browser: what you type stays on this device.' }],
        chips: STARTERS, fun: KB.pers && !quietOn() ? 1 : 0 };
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
      var refsOk = /\b(stud(y|ies)|research|paper|papers|cite|citation|source|sources|evidence|journal|doi|reference)\b/.test(f);
      var near = offTopic ? [] : res.hits.filter(function (h) { return !KB.docs[h.i].tip && h.cov >= 0.5 && h.s >= 1.4 && !/^\/(about\.html|architecture\/)/.test(KB.docs[h.i].u); }).slice(0, 8);
      // a plain question gets the site's own explanation before a reference-list entry ("are emotions universal?")
      if (!refsOk) { var nonRef = near.filter(function (h) { return !/^\/research\.html#ref-/.test(KB.docs[h.i].u); }); if (nonRef.length) near = nonRef; }  // the full ranking, before the short-question filter above
      var closest = [], seenKey = {};
      near.forEach(function (h) {
        var d = KB.docs[h.i], key = d.u.split('#')[0] + '|' + d.h.split(':')[0];
        if (closest.length < 2 && !seenKey[key] && (!closest.length || h.s >= near[0].s * 0.6)) { seenKey[key] = 1; closest.push(h.i); }
      });
      if (closest.length) {
        var blocks = [{ k: 'p', x: pick(['I don’t have a page on exactly that yet. This is the nearest thing I found:', 'I don’t have a page that answers that directly yet. This part comes closest:']) }];
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
      if (offTopic) return { blocks: [{ k: 'p', x: pick(['That one’s outside my little puddle, I’m afraid!', 'Ooh, I’d only be guessing on that one, and I’d rather not.', 'That’s not something I know about, sorry!']) +
        ' I stick to this program, and I won’t guess. Is your question about one of these: sharing the load at home, getting along with someone, check-ins, different wiring, or calming down? Pick one below, or tell me a bit more.' }], chips: STARTERS, kind: 'offtopic' };
      // nothing answers it: ask, naming the likeliest topics, rather than answer the wrong one with certainty
      var likely = [], likeSeen = {};
      (res.hits || []).forEach(function (h) {
        var d = KB.docs[h.i], t = String(d.h || '').split(':')[0].replace(/[.!?…]+$/, '').trim(), key = t.toLowerCase();
        if (likely.length < 2 && !d.tip && !d.g && h.s >= 0.9 && t && t.length <= 60 && !likeSeen[key] && !HIDE_TITLE.test(t)) { likeSeen[key] = 1; likely.push({ t: t, i: h.i }); }
      });
      var ask = likely.length === 2 ? ' Is it closer to “' + likely[0].t + ',” or “' + likely[1].t + '”? Or one of these?' : likely.length ? ' Is it closer to “' + likely[0].t + '”? Or one of these?' : ' Is it about sharing the load, getting along with someone, or calming down?';
      return { blocks: [{ k: 'p', x: 'I don’t have a page on that yet, and I’d rather not guess.' + (likely.length ? ask.replace(/ Or one of these\?$/, '') + ' Or tell me a bit more: who it’s about, and what happened.' : ' You could tell me a bit more: who it’s about, and what happened.' + ask) }],
        chips: likely.map(function (l) { return { label: l.t.length > 40 ? l.t.slice(0, 38).replace(/\s+\S*$/, '') + '…' : l.t, doc: l.i }; }).concat(STARTERS).slice(0, 5), kind: 'none' };
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
      if (pages[key] || pages['U|' + d.u]) continue;   // never the same link twice (a passage and its “going deeper”)
      if (picked.length && d.tip) continue;
      // a second passage never comes from the site's own about page, build notes or worksheets unless they were asked about
      if (picked.length && /^\/(about\.html|architecture\/|workpapers\/|library\.html#pillar|prog-01|report-01|wp-\d)/.test(d.u) && !/\b(wp ?\d+|workpapers?|worksheets?|calc ?\d+|report ?\d+|prog ?\d+|about|who made|creator|founder|pillars?)\b/.test(fold((state.last && state.last.q) || ''))) continue;
      // a glossary entry and a page passage pair well; two long passages are plenty
      pages[key] = 1; pages[d.u.split('#')[0] + '|' + d.h] = 1; pages['U|' + d.u] = 1;
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

  // Last tidy-up of any reply: each link once, each bullet once, no chip that repeats what was just asked
  // (or bounces back to a recent answer), and chips read as questions or choices, not statements.
  function tidy(state, q, r) {
    if (!r || !r.blocks) return r;
    var seenU = {}, seenL = {};
    r.blocks.forEach(function (b) {
      if (b.u) seenU[b.u.split('#')[0] + '#' + (b.u.split('#')[1] || '')] = 1;
    });
    r.blocks = r.blocks.filter(function (b) {
      if (b.k === 'links') {
        b.x = (b.x || []).filter(function (l) { var key = l && l[1]; if (!key || seenU[key]) return false; seenU[key] = 1; return true; });
        return b.x.length > 0;
      }
      if (b.k === 'list') {
        b.x = (b.x || []).filter(function (t) { var key = norm(t); if (seenL[key]) return false; seenL[key] = 1; return true; });
        return b.x.length > 0;
      }
      return true;
    });
    // the same words never twice in one reply: a "Words you could use" box drops a quote a bullet already holds, and a
    // bullet that is only that quote goes
    var scr = r.blocks.filter(function (b) { return b.k === 'script'; }).map(function (b) { return norm(b.x); });
    if (scr.length) {
      r.blocks = r.blocks.filter(function (b) {
        if (b.k !== 'list') return true;
        b.x = b.x.filter(function (t) { var nt = norm(t); return !scr.some(function (sx) { return sx.length > 20 && nt.replace(/^(say|try|ask|tell them|words)\b ?/, '') === sx; }); });
        return b.x.length > 0;
      });
      var seenS = {};
      r.blocks = r.blocks.filter(function (b) { if (b.k !== 'script') return true; var ns = norm(b.x); if (seenS[ns]) return false; seenS[ns] = 1; return true; });
    }
    if (r.kind !== 'short') state.lastReply = { blocks: r.blocks };
    var recent = state.recent || (state.recent = []);
    var asked = norm(q);
    recent.push(asked);
    if (recent.length > 4) recent.shift();
    var chipSeen = {};
    r.chips = (r.chips || []).filter(function (c) {
      var cq = norm(c.q || c.label);
      if (chipSeen[cq]) return false; chipSeen[cq] = 1;
      // "Another way to say it" and "Tell me more" are meant to be pressed again; anything else just asked is a loop
      if (!c.keep && !/^(another|tell me more|more|surprise me|give me a tip|another tip)/.test(cq) && recent.indexOf(cq) !== -1) return false;
      if (c.doc != null && /[.!]$/.test(c.label) && !/\?$/.test(c.label)) return false;
      return true;
    });
    return r;
  }


  // The program's own labels (Pillar IV, WP-09, REPORT-01, Person A) mean nothing to someone asking about their life:
  // they stay out of everyday answers, and only show when someone asks about the program itself
  var INTERNAL_Q = /\b(wp ?\d+|workpapers?|worksheets?|calc ?\d+|report ?\d+|prog ?\d+|pillars?|the program|architecture|how (is|was) (it|this|the site) (built|made))\b/;
  function sigOf(r) { return (r && r.blocks || []).filter(function (b) { return b.k !== 'links' && b.k !== 'note'; }).map(function (b) { return norm(b.x && b.x.join ? b.x.join(' ') : b.k === 'passage' ? (b.x || []).join(' ') : b.x || ''); }).join('|'); }
  function markShown(state, r) {
    var S = state.shown || (state.shown = {});
    (r && r.blocks || []).forEach(function (b) {
      if (b.k === 'list') b.x.forEach(function (t) { S[norm(t)] = 1; });
      if (b.k === 'script') S[norm(b.x)] = 1;
      if (b.k === 'passage' && b.i != null) S['#doc' + b.i] = 1;
    });
  }
  function noRepeat(state, q, r) {
    if (!r || !r.blocks || /^(safety|redflag|clarify|hello|thanks|calc|lang|fun|chat|restart|info|ask|read|crude|frust)$/.test(r.kind || '')) return r;
    var sig = sigOf(r);
    if (!sig || sig !== state.lastSig) return r;
    // a playbook again ("he just writes 'ok.'"): one thing for tonight and another way to say it, not the whole answer
    var L0 = state.last;
    if (r.kind === 'sit' && L0 && L0.kind === 'sit' && IDX.sit.issues[L0.issue]) {
      var P0 = sitParts(L0.issue, L0.who, L0.noun, L0.actor), cx0 = P0.ctx, v0 = (L0.v || 0) + 1;
      var sb0 = [{ k: 'p', x: 'Staying with what you told me' + (P0.tonight ? ', here’s one thing for tonight: ' + lc1(fill(P0.tonight, cx0)) : ', here’s another way to put it.') }];
      if (P0.scripts.length) sb0.push({ k: 'script', l: 'Another way to say it', x: fill(P0.scripts[v0 % P0.scripts.length], cx0) });
      if (P0.path.length) sb0.push({ k: 'links', x: P0.path });
      L0.v = v0;
      return { blocks: sb0, chips: r.chips || [], kind: 'sit', id: r.id };
    }
    // a clear new question that the same card answers: its first line answers it; then the next part, not a copy
    var clearQ0 = /^(is|are|does|do|can|could|should|what|whats|why|how|when|where|which|who|will|would)\b/.test(norm(q)) && r.blocks[0] && r.blocks[0].k === 'p';
    // the same again: the next part of that page, or a question, never a copy
    var u = '', TC = topicCard(state);
    (r.blocks || []).some(function (b) { if (b.k === 'links' && b.x[0]) { u = b.x[0][1].split('#')[0]; return true; } if (b.u) { u = b.u.split('#')[0]; return true; } return false; });
    if (!u && TC) u = topicPage(TC);
    var S = state.shown || {}, res = search(q), alt = null;
    if (u) res.hits.some(function (h) { var d = KB.docs[h.i]; if (!d.tip && !d.g && d.u.split('#')[0] === u && !S['#doc' + h.i] && !/#(main|more)$/.test(d.u)) { alt = h.i; return true; } return false; });
    if (alt == null && u) KB.docs.some(function (d, i) { if (!d.tip && !d.g && d.u.split('#')[0] === u && !S['#doc' + i] && !/#(main|more)$/.test(d.u) && !/^words you could use$/i.test(d.h)) { alt = i; return true; } return false; });
    if (alt != null) return { blocks: (clearQ0 ? [r.blocks[0], { k: 'p', x: 'The rest is what I said just now, so here’s the next part of the page:' }] : [{ k: 'p', x: 'I’ve given you my main answer on that just now, so here’s the next part of the page:' }]).concat([passageBlock(alt, res.terms)]), chips: (r.chips && r.chips.length ? r.chips : [{ label: 'What could I say?', q: 'What do I actually say?' }, { label: 'Something else', q: 'Start over' }]), kind: r.kind, id: r.id };
    return { blocks: [{ k: 'p', x: 'That’s the same answer I just gave, so I won’t repeat it. Could you tell me a bit more about what’s different this time, or which part didn’t fit?' }], chips: r.chips || [], kind: 'clarify', id: 'norepeat' };
  }
  function dejargon(r, q) {
    if (!r || !r.blocks || INTERNAL_Q.test(fold(q)) || /^(calc|safety|lang)$/.test(r.kind || '') || (r.kind === 'card' && cardById(r.id) && cardById(r.id).kind === 'tool')) return r;
    function clean(t) {
      return String(t).replace(/\s*\((?:that’s|that's|this is|see) Pillars? [IVX]+[^)]*\)/g, '')
        .replace(/(^|\s)This (?:is|touches|is part of) Pillars? [IVX]+[^.]*\.(?=\s|$)/g, '$1')
        .replace(/\s*\((?:(?:WP|CALC|REPORT|PROG)-\d+(?:,\s*|\s+and\s+)?)+\)/g, '')
        // a bare code from a page's table ("Say it so it lands WP-09. How do I…") and a heading run into itself (puddles16)
        .replace(/\s(?:WP|CALC|REPORT|PROG)-\d+\.?\s+(?=[A-Z])/g, '. ').replace(/(^|\s)(?:WP|CALC|REPORT|PROG)-\d+\.?(?=\s|$)/g, '$1').replace(/\b((?:[A-Za-z’']+\s+){1,6}[A-Za-z’']+)\s+\1\b/g, '$1').replace(/([?!.])\. /g, '$1 ')
        .replace(/\bPerson A\b/g, 'one person').replace(/\bPerson B\b/g, 'the other person')
        .replace(/[ \t]{2,}/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
    }
    r.blocks = r.blocks.filter(function (b) {
      if (b.k === 'p' || b.k === 'note' || b.k === 'script') { b.x = clean(b.x); return !!b.x; }
      if ((b.k === 'list' || b.k === 'passage' || b.k === 'bg') && Array.isArray(b.x)) { b.x = b.x.map(clean).filter(Boolean); return b.x.length > 0; }
      if (b.k === 'links' && Array.isArray(b.x)) b.x = b.x.map(function (l) { return [clean(l[0]) || l[0], l[1]]; });
      return true;
    });
    r.chips = (r.chips || []).filter(function (c) { return !/^(WP|CALC|REPORT|PROG)-\d+\b/.test(c.label); }).map(function (c) { var l = clean(c.label); return l === c.label ? c : Object.assign({}, c, { label: l }); });
    return r;
  }
  // owner: Puddles never brings up AI himself. Page excerpts that compare the site with AI chats lose those sentences
  // unless the person asked about AI, bots or ChatGPT.
  var AI_ASKED = /\b(ai|a i|chat ?gpt|gpt|bot|chatbot|robot|generative|llm|language model|artificial intelligence)\b/;
  function noAI(r, q) {
    if (!r || !r.blocks || r.kind === 'safety' || AI_ASKED.test(fold(q))) return r;
    function phrase(t) { return String(t).replace(/\s+or an AI chat\b/gi, '').replace(/\s+or AI chats?\b/gi, ''); }
    function clean(t) {
      t = phrase(t);
      if (!/\b(AI|ChatGPT|generative)\b/.test(t)) return t;
      return t.replace(/[^.!?…]*\b(AI|ChatGPT|generative)\b[^.!?…]*[.!?…]*[”"]?\s*/g, '').replace(/^\s*…\s*$/, '').replace(/\s{2,}/g, ' ').trim();
    }
    r.blocks = r.blocks.filter(function (b) {
      if (b.h) b.h = phrase(b.h);
      if (b.src) b.src = phrase(b.src);
      if (b.k === 'p' || b.k === 'note') { b.x = clean(b.x); return !!b.x; }
      if ((b.k === 'list' || b.k === 'passage' || b.k === 'bg') && Array.isArray(b.x)) { b.x = b.x.map(clean).filter(Boolean); return b.x.length > 0; }
      if (b.k === 'links' && Array.isArray(b.x)) b.x = b.x.map(function (l) { return [phrase(l[0]), l[1]]; });
      return true;
    });
    if (r.chips) r.chips = r.chips.map(function (c) { var l = phrase(c.label); return l === c.label ? c : Object.assign({}, c, { label: l, q: phrase(c.q || c.label) }); });
    return r;
  }
  // One message in, one reply out; fetches the background notes first when an answer needs them.
  function reply(state, q, doc, cb0) {
    var r;
    function cb(x) { if (x && !/^(thanks|chat|fun|hello|unclear|offtopic|none|clarify|crude|frust)$/.test(x.kind || '') && x.id !== 'source') state.lastQ = q; if (x && x.blocks && state.deepRedo === state.turn && !/^(deep|safety|redflag|lang)$/.test(x.kind || '')) { x.blocks.unshift({ k: 'p', x: 'Deep talk is on. That question isn’t one of my deep topics, so here’s the plain answer from the site. Ask me a big question any time, or say “keep it light” to come back up.' }); x.chips = (x.chips || []).filter(function (c) { return !/keep it light/i.test(c.label); }).slice(0, 3).concat([{ label: 'Keep it light', q: 'Keep it light' }]); } if (x && state.page && state.page.chips && state.page.chips.length && (!x.chips || !x.chips.length) && (state.turn || 0) <= 2 && x.kind !== 'safety') x.chips = state.page.chips.slice(0, 4); if (x && x.blocks && state.sorryTurn && state.sorryTurn === state.turn && x.kind !== 'safety') { x.blocks.unshift({ k: 'p', x: 'Sorry, that last answer missed. Here’s what I have for your question:' }); } state.sorryTurn = 0; x = proReply(q, x); x = momMum(state, q, x); x = tidy(state, q, x); x = dejargon(x, q); x = noAI(x, q); x = noRepeat(state, q, x); if (state.brief) x = briefen(state, x); x = medsFirst(q, x); if (state.easy && x && x.kind !== 'safety') x = easySwap(x); if (x && x.blocks) state.lastSig = sigOf(x); x = flair(state, q, x); if (doc == null) { x = deepChip(state, q, x); x = igChip(state, x); } saveTopic(state); if (x && x.blocks) markShown(state, x); if (x) { state.lastKind = x.kind || 'search'; state.lastId = x.id || ''; if (x.fun && x.kind !== 'thanks' && !quietOn() && frand(state) < 0.5) x.think = funLine(state, 'thinking'); } cb0(x); }
    function safe(fn) {
      try { return fn(); }
      catch (e) { if (window.console && console.error) console.error(e); return { blocks: [{ k: 'p', x: 'Sorry, something went wrong on my side. Could you try asking another way?' }], chips: STARTERS }; }
    }
    r = safe(function () { return respond(state, q, doc); });
    if (r && r.needSE) {
      loadSE(function () {
        var r4 = safe(function () { return respond(state, q, doc); });
        if (r4 && (r4.needSE || r4.needIG || r4.needBG)) r4 = { blocks: [{ k: 'p', x: 'Sorry, I couldn’t open the message checker just now. The Chat analyzer page can check it for you.' }, { k: 'links', x: [['The Chat analyzer', '/signal-translator.html']] }], chips: [] };
        cb(r4);
      });
      return;
    }
    if (r && r.needCD) {
      state.turn = Math.max(0, (state.turn || 1) - 1);
      loadCD(function () {
        var r5 = safe(function () { return respond(state, q, doc); });
        if (r5 && r5.needCD) r5 = safe(function () { return respond(state, q, doc); });
        if (r5 && r5.needBG) { loadBG(function () { cb(safe(function () { return respond(state, q, doc); })); }); return; }
        cb(r5);
      });
      return;
    }
    if (r && r.needIG) {
      loadIG(function () {
        var r3 = safe(function () { return respond(state, q, doc); });
        if (r3 && r3.needIG) r3 = { blocks: [{ k: 'p', x: 'Sorry, I couldn’t open my drawing kit just now. Could you try again in a moment?' }], chips: STARTERS };
        if (r3 && r3.needBG) { loadBG(function () { cb(safe(function () { return respond(state, q, doc); })); }); return; }
        cb(r3);
      });
      return;
    }
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
    '.tolc .tolc-msg .tolc-info{margin:.3rem 0 0;width:100%}.tolc .tolc-msg.has-info{max-width:100%;width:100%}',
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
    '.tolc-who{flex:1 1 5.5rem;min-width:5.5rem}',
    '.tolc-hbtns{display:flex;align-items:center;margin-left:auto;flex:0 0 auto}',
    // Larger text on a phone: the buttons move to their own row, on the right, so the name keeps its room
    'html:is(.tol-text-lg,.tol-text-xl,.tol-text-xxl) .tolc-head{flex-wrap:wrap;row-gap:.1rem}',
    'html:is(.tol-text-lg,.tol-text-xl,.tol-text-xxl) .tolc-who{flex-basis:9rem;min-width:9rem}',
    '.tolc-name{font-family:"Fraunces",Georgia,serif;font-weight:600;font-size:1.12rem;line-height:1.2;margin:0;letter-spacing:-.01em}',
    '.tolc-sub{margin:0;font-size:.82rem;color:var(--ink-soft);line-height:1.3}',
    // the subtitle never wraps one word per line (phones, Larger text): one line, cut short, or hidden when the header is tight
    '.tolc-sub{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.tolc-name{overflow-wrap:normal;word-break:normal}',
    '@media (max-width:480px){.tolc-sub{display:none}}',
    'html.tol-text-lg .tolc-sub,html.tol-text-xl .tolc-sub,html.tol-text-xxl .tolc-sub{display:none}',
    // tablets: a taller answer area
    '@media (min-width:720px) and (min-height:900px){.tolc.is-modal{height:min(860px,calc(100vh - 48px));width:440px}}',
    // Larger text zooms the page body: keep the whole panel on screen
    // (the page zoom multiplies the panel's own size, so each cap divides the screen height by that zoom; on tablets and
    // computers the panel floats 24px above the bottom, so the cap leaves that much room above it too)
    'html.tol-text-lg:not(.tol-nozoom) .tolc.is-modal{max-height:calc(100vh / 1.15 - 12px);max-height:calc(100dvh / 1.15 - 12px)}',
    'html.tol-text-xl:not(.tol-nozoom) .tolc.is-modal{max-height:calc(100vh / 1.35 - 12px);max-height:calc(100dvh / 1.35 - 12px)}',
    'html.tol-text-xxl:not(.tol-nozoom) .tolc.is-modal{max-height:calc(100vh / 1.6 - 12px);max-height:calc(100dvh / 1.6 - 12px)}',
    '@media (min-width:720px){html.tol-text-lg:not(.tol-nozoom) .tolc.is-modal{max-height:calc(100vh / 1.15 - 48px);max-height:calc(100dvh / 1.15 - 48px)}',
    ' html.tol-text-xl:not(.tol-nozoom) .tolc.is-modal{max-height:calc(100vh / 1.35 - 48px);max-height:calc(100dvh / 1.35 - 48px)}',
    ' html.tol-text-xxl:not(.tol-nozoom) .tolc.is-modal{max-height:calc(100vh / 1.6 - 48px);max-height:calc(100dvh / 1.6 - 48px)}}',
    // at every size the header (with ×) stays put and only the answers scroll
    '.tolc.is-modal{max-height:100vh;max-height:100dvh}.tolc.is-modal .tolc-head{flex:0 0 auto}.tolc.is-modal .tolc-log{min-height:0}',
    '.tolc-hbtn{white-space:nowrap;flex:0 0 auto;min-width:44px;min-height:44px;border:0;background:none;border-radius:12px;color:var(--ink-soft);font:inherit;font-size:.85rem;cursor:pointer;padding:0 .55rem}',
    '.tolc-hbtn:hover{background:var(--paper2);color:var(--ink)}',
    '.tolc-x{font-size:1.5rem;line-height:1}',
    '.tolc-log{flex:1;overflow-y:auto;padding:1rem .9rem .5rem;display:flex;flex-direction:column;gap:.7rem;overscroll-behavior:contain;scroll-behavior:smooth}',
    '.tolc-msg{max-width:92%;padding:.65rem .85rem;border-radius:18px;word-wrap:break-word;overflow-wrap:anywhere}',
    '.tolc-msg p{margin:0 0 .5rem;max-width:none}',
    '.tolc-msg p:last-child{margin-bottom:0}',
    '.tolc-ctx{align-self:center;max-width:92%;text-align:center}.tolc-ctx p{margin:0;font-size:.8rem;font-style:italic;color:var(--ink-soft)}',
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
    '.tolc-arts{list-style:none;margin:.3rem 0 .6rem;padding:0;display:grid;gap:.45rem}.tolc-arts li{padding:.55rem .7rem;border-radius:12px;background:rgba(127,178,224,.12);border:1px solid rgba(127,178,224,.35)}.tolc-arts a{font-weight:700;line-height:1.3}.tolc-arts p{margin:.25rem 0 0;font-size:.9rem;line-height:1.4}',
    '.tolc-links{margin:.1rem 0 .3rem;padding-left:1.3rem}.tolc-links li{margin:0}.tolc-links a.tolc-more{min-height:40px}',
    '.tolc-script{margin:.5rem 0 .6rem;padding:.55rem .75rem;border-radius:12px;background:var(--c-soft);border-left:3px solid var(--c)}',
    '.tolc-script p{font-size:.95rem;margin:0}.tolc-script .tolc-src{font-style:normal;font-weight:600;margin-bottom:.2rem !important}',
    '.tolc-bgcard{background:#FFFDF6;border-left-style:dashed}',
    '.tolc-chips{display:flex;flex-wrap:wrap;gap:.45rem;padding:.2rem .9rem .5rem}',
    '.tolc-chips:empty{display:none}',
    // phones: chips wrap onto more lines, never cut off at the edge (puddles16); in the pop-up the row can scroll down if it's tall
    '@media (max-width:719px){.tolc-chips{padding-bottom:.6rem}.tolc-chip{flex:0 1 auto;max-width:100%;white-space:normal}.tolc.is-modal .tolc-chips{max-height:32vh;max-height:32dvh;overflow-y:auto}}',
    // short laptop screens (1366x768 at 125%, Larger text): the pop-up uses the full height, so an answer has room to show
    '@media (max-height:560px){.tolc .tolc-note{font-size:.68rem;padding:.1rem .8rem .25rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tolc .tolc-chips{max-height:3.4rem;overflow-y:auto;padding-top:.1rem;padding-bottom:.25rem}.tolc .tolc-av{width:34px;height:34px}.tolc .tolc-av svg{width:28px;height:28px}.tolc .tolc-head{padding-top:.35rem;padding-bottom:.3rem}.tolc .tolc-form{padding-top:.35rem}.tolc.is-inline{height:calc(100vh - 1.5rem);height:calc(100dvh - 1.5rem)}}',
    '@media (min-width:720px) and (max-height:700px){.tolc.is-modal{bottom:8px;height:calc(100vh - 16px);height:calc(100dvh - 16px)}.tolc.is-modal .tolc-note{padding:.2rem 1rem .35rem}.tolc.is-modal .tolc-chips{max-height:6.5rem;overflow-y:auto}.tolc.is-modal .tolc-head{padding-top:.5rem;padding-bottom:.45rem}}',
    '.tolc-chip{min-height:44px;padding:.45rem .9rem;border-radius:22px;border:1px solid var(--c);background:#fff;color:var(--ink);font:inherit;font-size:.88rem;line-height:1.25;cursor:pointer;text-align:left}',
    '.tolc-chip:hover{background:var(--c-soft)}',
    '.tolc-typing{align-self:flex-start;display:flex;gap:5px;padding:.85rem 1rem;background:#fff;border:1px solid var(--line);border-radius:18px;border-bottom-left-radius:6px}',
    '.tolc-think{margin-left:.45rem;font-size:.8rem;font-style:italic;color:var(--ink-soft);align-self:center}',
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

  // where the chat was opened: this page, or the page named by /ask.html?about=…
  // ?for=co-parent (the co-parent invite on /someone-sent-you-this.html) and the like name the situation the page is open for
  var FOR_PAGE = { 'co-parent': '/co-parenting.html', 'co-parents': '/co-parenting.html', coparent: '/co-parenting.html', coparents: '/co-parenting.html',
    foster: '/foster-and-kinship.html', kinship: '/foster-and-kinship.html', friend: '/friends.html', friends: '/friends.html' };
  function pageCtxNow() {
    var about = '', fr = '';
    try { about = (location.search.match(/[?&]about=([^&]*)/) || [])[1] || ''; about = about ? decodeURIComponent(about.replace(/\+/g, ' ')).slice(0, 120) : ''; } catch (e) { about = ''; }
    try { fr = ((location.search.match(/[?&]for=([a-z-]+)/) || [])[1] || '').toLowerCase(); } catch (e) { fr = ''; }
    return { path: (location.pathname || ''), about: about, forPage: FOR_PAGE[fr] || '' };
  }
  // the topic we were on, kept for this tab only (sessionStorage, like the conversation itself), so opening Professor
  // Puddles on the next page carries on where we were ("how do i get a say" after a co-parent answer on another page)
  var TOPIC_KEY = 'tol-chat-topic';
  function saveTopic(state) {
    if (!state || !state.keepTopic) return;
    try { var T = state.topic; sessionStorage.setItem(TOPIC_KEY, T ? JSON.stringify({ id: T.id, root: T.root, side: T.side == null ? null : T.side }) : ''); } catch (e) { /* fine */ }
  }
  function loadTopic() { try { var o = JSON.parse(sessionStorage.getItem(TOPIC_KEY) || 'null'); return o && typeof o.id === 'string' ? o : null; } catch (e) { return null; } }
  function Chat(mode, host) {
    var me = this;
    this.mode = mode;
    this.msgs = load() || [];
    this.state = { last: null, pageCtx: pageCtxNow(), keepTopic: true, restore: this.msgs.length ? loadTopic() : null };
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
      root.setAttribute('tabindex', '-1');
    } else {
      root.setAttribute('role', 'region');
      root.setAttribute('aria-labelledby', uid + '-name');
    }
    root.innerHTML =
      '<div class="tolc-head"><div class="tolc-av"></div><div class="tolc-who"><p class="tolc-name" id="' + uid + '-name"></p><p class="tolc-sub" title="Your guide to the whole program">Program guide</p></div>' +
      '<div class="tolc-hbtns"><button type="button" class="tolc-hbtn tolc-reset">Start over</button>' +
      (mode === 'modal' ? '<button type="button" class="tolc-hbtn tolc-x" aria-label="Close chat">&times;</button>' : '') + '</div></div>' +
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
    if (m.r === 'c') {
      el.className = 'tolc-ctx' + (isNew ? ' is-new' : '');
      var pc = document.createElement('p'); pc.textContent = 'Talking about: ' + (m.l || m.x); el.appendChild(pc);
      this.log.appendChild(el);
      return el;
    }
    el.className = 'tolc-msg ' + (m.r === 'u' ? 'tolc-me' : 'tolc-bot') + (isNew ? ' is-new' : '');
    if (m.r === 'u') {
      var p = document.createElement('p'); p.textContent = m.x; el.appendChild(p);
      var sr = document.createElement('span'); sr.className = 'tolc-sr'; sr.textContent = 'You said: '; el.insertBefore(sr, p);
    } else {
      var sr2 = document.createElement('span'); sr2.className = 'tolc-sr'; sr2.textContent = (m.n || 'Buddy') + ' says: '; el.appendChild(sr2);
      (m.b || []).forEach(function (b) {
        if (b.k === 'p') { var p2 = document.createElement('p'); p2.textContent = b.x; el.appendChild(p2); return; }
        if (b.k === 'info') {
          // an infographic: drawn by puddles-infographic.js, loaded the first time one is shown
          var box = document.createElement('div'); box.className = 'tolc-info';
          el.appendChild(box); el.classList.add('has-info');
          loadIG(function (IG) {
            if (IG && b.spec) { try { IG.mount(box, b.spec); return; } catch (e) {} }
            var pf = document.createElement('p'); pf.textContent = 'Sorry, I couldn’t draw that here.'; box.appendChild(pf);
          });
          return;
        }
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
        if (b.k === 'art') {
          var al = document.createElement('ul'); al.className = 'tolc-arts';
          (b.x || []).forEach(function (it) {
            if (!it || !ART_OK.test(it.u)) return;
            var li3 = document.createElement('li'), a3 = document.createElement('a');
            a3.href = it.u; a3.target = '_blank'; a3.rel = 'noopener noreferrer'; a3.textContent = it.t + ' ↗'; li3.appendChild(a3);
            var src3 = document.createElement('span'); src3.className = 'tolc-src'; src3.textContent = ' ' + it.s; li3.appendChild(src3);
            if (it.x) { var p3 = document.createElement('p'); p3.textContent = it.x; li3.appendChild(p3); }
            al.appendChild(li3);
          });
          if (al.children.length) el.appendChild(al);
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
    box.scrollLeft = 0;   // a new set of chips starts at the first one (phones scroll the row sideways)
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

  Chat.prototype.say = function (blocks, chips, delay, think) {
    var me = this;
    this.busy = true;
    this.root.classList.add('is-typing');
    var t = document.createElement('div'); t.className = 'tolc-typing'; t.setAttribute('aria-hidden', 'true'); t.innerHTML = '<i></i><i></i><i></i>';
    if (think) { var th = document.createElement('span'); th.className = 'tolc-think'; th.textContent = think; t.appendChild(th); }
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
      else if (me.queue && me.queue.length) { var nq = me.queue.shift(); if (nq && nq.t) me.ask(nq.t, null, nq.c); else me.ask(nq); }
    }, delay == null ? (REDUCED ? 250 : 650) : delay);
  };

  Chat.prototype.ask = function (text, doc, ctx) {
    var me = this;
    this.asked = true;
    // a topic the chat was opened with (/ask.html?about=…, "Ask him about this page") is shown as what we're talking
    // about, not as a message the person typed
    var m = ctx ? { r: 'c', x: text, l: ctx } : { r: 'u', x: text };
    this.msgs.push(m); save(this.msgs);
    this.setChips([]);
    this.scrollTo(this.render(m, true));
    this.busy = true;  // until the answer is shown: a second question waits its turn
    loadKB(function (ok) {
      if (!ok) { me.say([{ k: 'p', x: 'Sorry, I couldn’t open the site’s pages just now. Please try again in a moment.' }], [], 300); return; }
      reply(me.state, text, doc, function (r) {
        var len = r.blocks.reduce(function (n, b) { return n + (b.k === 'info' ? 20 : wc(b.x && b.x.join ? b.x.join(' ') : b.x || '')); }, 0);
        me.say(r.blocks, r.chips, REDUCED ? 250 : Math.min(1300, 450 + len * 6), r.think);
      });
    });
  };

  Chat.prototype.greet = function (text, then) {
    var me = this;
    // the hello shows at once, before the pages have loaded, so it is always the first thing in the chat, even when
    // someone types straight away (and a phone's sheet never opens blank)
    var m = { r: 'b', b: [{ k: 'p', x: text }], n: me.char.name };
    me.msgs.push(m); save(me.msgs);
    me.render(m, true);
    var asked0 = me.msgs.length;
    me.setChips(GREET_CHIPS);
    // opened from a page with its own questions (coming out, co-parenting…): those first, never "We keep arguing about chores"
    loadKB(function (ok) {
      var st = me.state, chips = GREET_CHIPS;
      if (ok && st.pageCtx && !st.pageDone) pageInit(st);
      if (st.page && st.page.chips && st.page.chips.length) chips = st.page.chips.concat([{ label: 'Talk deep', q: 'Talk deep' }]);
      else if (st.page && (st.page.u || st.page.about)) chips = [{ label: 'Tell me about this page', q: 'Tell me more about ' + (st.page.about || pageTitle(st.page.u) || 'this page') }, STARTERS[3], STARTERS[1], { label: 'Just chat', q: 'Let’s just chat' }];
      if (me.msgs.length === asked0 && !me.busy) { me.setChips(chips); me.lastChips = chips; }
      if (then) then();
    });
  };

  Chat.prototype.start = function (opts) {
    opts = opts || {};
    // a greeting only for a new conversation, or when a different character takes over: coming back to
    // the page (or opening /ask.html?about=… again) never stacks up another hello
    var lastBot = null, lastUser = null;
    this.msgs.forEach(function (m) { if (m.r === 'b') lastBot = m; else lastUser = m; });
    var prevName = this.char ? this.char.name : (lastBot && lastBot.n) || DEFAULT_CHAR.name;
    this.setChar(opts);
    var changed = this.char.name !== prevName;
    // the home page's headline isn't a page topic: the usual hello there
    if (/^\/(index\.html)?$/.test(pageCtxNow().path) && /Curious about something on/.test(this.char.greeting || '')) this.char.greeting = DEFAULT_CHAR.greeting;
    if (!this.started) {
      this.started = true;
      var me = this;
      this.msgs.forEach(function (m) { me.render(m, false); });
      if (this.msgs.length) { this.setChips(STARTERS.slice(0, 3)); this.scrollTo(); }
    }
    var topic = typeof opts.topic === 'string' ? opts.topic.trim().slice(0, 300) : '', me2 = this;
    // a page's own topic (/ask.html?about=…, "Tell me more about <the page>") is context, not something the person typed
    var about0 = pageCtxNow().about, ctxLabel = topic && ((about0 && topic === about0) ? topic : (/^Tell me more about (.{2,120})$/.exec(topic) || [])[1] || '');
    var askTopic = function () { if (!topic || (lastUser && lastUser.x === topic)) return; if (me2.busy) (me2.queue = me2.queue || []).push(ctxLabel ? { t: topic, c: ctxLabel } : topic); else me2.ask(topic, null, ctxLabel || null); };
    // the hello first, then the page's topic (the hello waits for the page's own questions to be ready)
    if (!this.msgs.length || (changed && opts.greeting)) this.greet(this.char.greeting, askTopic); else askTopic();
    loadKB(function () {});
  };

  Chat.prototype.reset = function () {
    this.msgs = []; save(this.msgs); this.state.last = null; this.state.lastReply = null; this.state.recent = []; this.state.topic = null; saveTopic(this.state);
    this.log.textContent = ''; this.setChips([]);
    this.greet(this.char.greeting);
    focusBox(this);
  };

  // ------------------------------------------------------------------ public API
  // When the panel opens, the text box is never focused for touch or mouse (owner: on a phone the keyboard pops up and
  // covers the Professor's message): the panel itself takes focus, and the box waits until it's tapped or clicked.
  // Only someone who opened the chat from the keyboard, on a device with a fine pointer, lands in the box, so they can type.
  // before any event has been seen (the chat script loads on the first tap), go by the device: a coarse pointer is touch
  var lastInput = 'touch';
  try { lastInput = window.matchMedia && window.matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse'; } catch (e) { lastInput = 'touch'; }
  try {
    if (document.addEventListener) {
      document.addEventListener('pointerdown', function (e) { lastInput = e.pointerType === 'mouse' ? 'mouse' : 'touch'; }, true);
      document.addEventListener('touchstart', function () { lastInput = 'touch'; }, { capture: true, passive: true });
      document.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.key === 'Tab') lastInput = 'keyboard'; }, true);
    }
  } catch (e) { /* fine */ }
  function coarse() { try { return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) { return true; } }
  function focusBox(c, o) {
    if (!c) return;
    try {
      if (lastInput === 'keyboard' && !coarse()) c.input.focus(o);
      else (c.mode === 'modal' ? c.root : c.log).focus(o || { preventScroll: true });
    } catch (e) { /* fine */ }
  }
  var modal = null, scrim = null, inline = null, lastFocus = null;
  var api = {
    open: function (opts) {
      if (inline && document.body.contains(inline.root)) {
        inline.start(opts);
        inline.root.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' });
        focusBox(inline, { preventScroll: true });
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
      setTimeout(function () { focusBox(modal); }, 30);
    },
    close: function () {
      if (!modal || modal.root.hidden) return;
      modal.root.hidden = true; scrim.hidden = true;
      document.documentElement.classList.remove('tolc-lock');
      if (lastFocus && lastFocus.focus && document.body.contains(lastFocus)) lastFocus.focus();
    },
    // For buttons on a page ("Try asking…"): ask as if typed and sent, in the inline chat if there is one, otherwise in
    // the pop-up. opts.mode 'deep' or 'chat' switches deep talk on or off first, without an extra message. Queues while busy.
    ask: function (text, opts) {
      opts = opts || {};
      text = String(text || '').trim().slice(0, 500);
      if (!text) return;
      var c = inline && document.body.contains(inline.root) ? inline : null;
      if (c) { if (!c.started) c.start({}); c.root.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' }); }
      else { api.open(); c = modal; }
      if (opts.mode === 'deep' || opts.mode === 'chat') setDeep(c.state, opts.mode === 'deep');
      if (opts.mode === 'chat') pzS(c.state).mode = true;
      if (c.busy || c.pending) { (c.queue = c.queue || []).push(text); return; }
      c.ask(text);
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
    _session: function (ctx) { var st = { last: null, pageCtx: ctx || null }; return { ask: function (q, cb) { loadKB(function () { reply(st, q, null, cb); }); }, state: st }; },
    _bgLoaded: function () { return !!(IDX && IDX.bg); },
    _search: function (q, cb) { loadKB(function () { cb(search(q).hits.slice(0, 6).map(function (h) { return [KB.docs[h.i].h, +h.s.toFixed(2), +h.cov.toFixed(2)]; })); }); }
  };
  api._sit = function (q) { var f = norm(q), d = detectSituation(f), sc = {}; Object.keys(IDX.sit.issues).forEach(function (k) { var n = 0; IDX.sit.issues[k].res.forEach(function (r) { if (r[0].test(f)) n += r[1]; }); if (n) sc[k] = n; }); d.all = sc; return d; };
  api._debug = function (q) { return { tokens: tokens(q), top: search(q).hits.slice(0, 3).map(function (h) { return [KB.docs[h.i].h, +h.s.toFixed(2), +h.cov.toFixed(2)]; }), terms: search(q).terms }; };
  window.TOLChat = api;

  function hook() { if (/[?&]chat=1(&|$)/.test(location.search)) api.open(); }
  if (document.readyState === 'complete') setTimeout(hook, 0); else window.addEventListener('load', hook);  // after any inline mount
})();
