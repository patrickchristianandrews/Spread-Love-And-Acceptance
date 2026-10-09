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
    return [(start > 0 ? '… ' : '') + text + (end < ss.length - 1 ? ' …' : '')];
  }

  var LEAD_FIRST = ['Here’s what the site says:', 'The site puts it like this:', 'Here’s the gist, from the site:', 'This part of the site fits:'];
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
    var s = String(t || '').replace(/\s*[—|–·-]\s*(Spread Love (&|and) Acceptance|The Objective Ledger)\b.*$/, '').trim();
    return s || String(t || '');
  }
  function passageBlock(i, qterms) {
    var d = KB.docs[i];
    return { k: 'passage', i: i, h: d.tip ? 'A little tip' : pageName(unshout(d.h)), src: d.tip ? '' : pageName(d.t), x: excerpt(d, qterms).map(unshout), u: safePath(d.u) ? d.u : '', l: d.l || '' };
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
    { label: 'I feel like I do everything', q: 'I feel like I do everything at home' },
    { label: 'Find me a good article', q: 'Find me a good article' },
    { label: 'We keep arguing about chores', q: 'How do we stop fighting about chores?' },
    { label: 'Where do I start?', q: 'Where should I start?' },
    { label: 'Which tool fits me?', q: 'Which tool fits my situation?' }
  ];

  // the greeting's chips: the usual ways in, and a way to just chat
  var GREET_CHIPS = STARTERS.slice(0, 4).concat([{ label: 'Just chat', q: 'Let’s just chat' }]);

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
    '\\b(hits?|hitting|slapp?(s|ed|ing)?|punch(es|ed|ing)?|chok(e|es|ed|ing)|kick(s|ed|ing)?|strangl\\w*|grabb?(ed|ing) me by) (me|us|my (kids?|children|son|daughter|baby))\\b',
    '\\b(shoved|shoves|pushed|pushes) me (down|over|into|against|around)\\b', '\\bbeats? me up\\b',
    '\\babus(e|es|ed|ive|er|ers|ing)\\b', '\\bdomestic (violence|abuse)\\b', '\\bviolen(t|ce)\\b',
    '\\bsuicid\\w*', '\\bkill (my ?self|me|him|her|them|everyone)\\b', '\\bkilling (my ?self|him|her|them|everyone)\\b', '\\b(he|she|they|someone|my \\w+) (is |s |are )?(going to |gonna |will |ll |wants to |threatened to |tried to )?kill(ing)? me\\b', '\\b(want|wants|wanted|going) to die\\b',
    '\\bend (it all|my life)\\b', '\\bself ?harm\\w*', '\\b(hurt|hurting|harm|harming|cut|cutting) my ?self\\b', '\\bno reason to (live|go on)\\b',
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
    '\\b(angry|mad|furious|upset|jealous|sulks?|sulky|cold|silent) (if|when|whenever|every time|each time) i (see|go out with|meet( up with)?|visit|talk to|text|call|hang out with|spend time with) (my )?(friends|family|mates|sister|brother|mum|mom|parents|colleagues|coworkers)\\b', '\\b(gives|give) me (an |a )?(allowance|pocket money)\\b', '\\bchecks? (all )?my (receipts|spending|bank|bank statements?|purchases|bank account)\\b', '\\b(have|need|got) to ask (him|her|them|my (partner|husband|wife|boyfriend|girlfriend)) (for )?(money|permission)\\b', '\\b(get|make) (him|her|them|my \\w+) (to )?stop (checking|reading|going through|looking through|tracking) my (phone|texts|messages|location|emails?)\\b', '\\b(has|knows|demands|wants|makes me (give|share)) (all )?my passwords?\\b',
    '\\b(checks|checked|reads|read|goes through|went through|looks through|searches|tracks|monitors|takes|took|smashed|broke) (my|all my) (phone|texts|messages|emails?|location|social media)\\b',
    '\\b(tracks|follows|watches) (me(?! (from )?room to room| around (the|our) (house|flat|apartment|home)| into (the|another|every) (other |next )?room)|where i (am|go))\\b', '\\b(tracking|spy|spying) (app|apps|on me)\\b',
    '\\b(won.?t|wont|doesn.?t|does not|will not|never) let(s)? me (leave|go( out)?|see|talk (to|with) (anyone|anybody|people|friends|family|my \\w+)|have|work|out|sleep|use)\\b',
    '\\b(controls|takes|took|keeps|hides|hid) (all )?(my|the|our) (money|phone|keys|car keys|passport|cards?|paycheck|bank)\\b',
    '\\b(scared|afraid|frightened|terrified) (to go home|to leave|to tell (him|her|them)|of what (he|she|they).?(ll| will) do|of (my|his|her) (partner|husband|wife|boyfriend|girlfriend|ex))\\b',
    '\\b(scared|afraid|frightened|terrified) (of|for) (him|her)\\b', '\\bnot safe\\b', '\\bunsafe\\b',
    '\\b(is it|it(.?s| is)?|was it) (all )?my fault (he|she|they|my \\w+) (yells|yelled|screams|screamed|shouts|hits|hit|hurts|hurt|gets (so )?(angry|mad|violent)|throws|threw|grabs|grabbed|pushes|pushed)\\b',
    '\\b(he|she|they|my \\w+) (says|said|tells me) it(.?s| is)? my fault (he|she|they) (yell|scream|shout|hit|hurt|get angry|lose)\\w*',
    '\\b(isolat\\w+) me\\b', '\\bcut me off from (my )?(friends|family)\\b', '\\b(threatens|threatened) to (leave with|take|hurt) (the )?(kids|children|baby|dog|cat|pet)\\b',
    '\\b(cuts?|cutting|hurts?|hurting|harms?|harming|burns?|burning) (themselves|themself|himself|herself)\\b',
    '\\bgaslight\\w*', '\\bmakes? me feel (crazy|like i m crazy|like im crazy)\\b',
    '\\bthrows things\\b', '\\bthrew (a|the|my) \\w+ at me\\b', '\\bblocks? the door\\b', '\\bcoercive\\b',
    // intimidation: violence near you, not at you, is still a safety matter
    '\\bpunch(es|ed|ing)? (a hole in |holes in )?(the|a) (wall|door|walls|doors)\\b', '\\b(smash|smashes|smashed|smashing|break|breaks|broke|breaking|throw|throws|threw|throwing) (things|stuff|plates|dishes|my \\w+)\\b',
    '\\bthrew (a|the|my|his|her) \\w+ (across|against|at)\\b', '\\b(stands?|stood|standing) (in|at|across) the (door|doorway)\\b', '\\b(block|blocks|blocked|blocking) (the |my )?(door|doorway|way out|way)\\b', '\\bso i can.?t (get out|leave)\\b'
  ].join('|'));
  // the words people use when they may not want to live: these also get the 988 line
  var NOT_LIVE = /\bsuicid\w*|\bkill(ing)? my ?self\b|\b(want|wants|wanted|going) to die\b|\bend (it all|my life)\b|\bno reason to (live|go on)\b|\b(do ?n.?t|do not|dont) (really )?(want|wanna) to (be here|be alive|live|exist|wake up|be around)\b|\b(want|wanna|wish i could) (to )?(disappear|vanish|not exist|not wake up|fall asleep and not wake up)\b|\bi (just |really |honestly )?can.?t go on( anymore| living| like this)?$|\bcan.?t go on (anymore|living|like this)\b|\b(better off|be better) without me\b|\bno (point|reason) (in )?(living|being alive|going on|to keep going)\b|\bwish (i|id) (was|were|had) (dead|never (been )?born|not here|not alive)\b|\btired of (living|being alive|life)\b|\b(nothing|no one|nobody) to live for\b|\btake my (own )?life\b|\bunalive\w*|\bnot (be|being) here anymore\b|\bgive up on (life|living|everything)\b|\bself ?harm\w*|\b(hurt|hurting|harm|harming|cut|cutting) my ?self\b|\boverdos\w*/;
  // Watching, checking, limiting or blaming: a real warning sign, but often asked about before anyone feels in danger.
  // These get a plainer answer with the difference between agreed sharing and control, the hotline, and a way to keep talking.
  var CONTROL = /\b(checks|checked|checking|reads|read|goes through|went through|looks through|searches|tracks|tracking|monitors|monitoring) (my|all my) (phone|texts|messages|emails?|location|social media)\b|\b(tracks|follows|watches) (me(?! (from )?room to room| around (the|our) (house|flat|apartment|home)| into (the|another|every) (other |next )?room)|where i (am|go))\b|\b(tracking|spy|spying) (app|apps|on me)\b|\b(won.?t|wont|doesn.?t|does not|will not|never) let(s)? me (leave|go( out)?|see|talk (to|with) (anyone|anybody|people|friends|family|my \w+)|have|work|out|sleep|use)\b|\b(controls|takes|took|keeps|hides|hid) (all )?(my|the|our) (money|phone|keys|car keys|passport|cards?|paycheck|bank)\b|\b(isolat\w+) me\b|\bcut me off from (my )?(friends|family)\b|\bgaslight\w*|\bmakes? me feel (crazy|like i m crazy|like im crazy)\b|\b(says|said|tells me) it(.?s| is)? my fault (he|she|they)\b|\b(is it|it(.?s| is)?|was it) (all )?my fault (he|she|they|my \w+) (yells|yelled|screams|screamed|shouts|gets (so )?(angry|mad))\b|\b(angry|mad|furious|upset|jealous|sulks?|sulky|cold|silent) (if|when|whenever|every time|each time) i (see|go out with|meet( up with)?|visit|talk to|text|call|hang out with|spend time with) (my )?(friends|family|mates|sister|brother|mum|mom|parents|colleagues|coworkers)\b|\b(gives|give) me (an |a )?(allowance|pocket money)\b|\bchecks? (all )?my (receipts|spending|bank|bank statements?|purchases|bank account)\b|\b(have|need|got) to ask (him|her|them|my (partner|husband|wife|boyfriend|girlfriend)) (for )?(money|permission)\b|\b(get|make) (him|her|them|my \w+) (to )?stop (checking|reading|going through|looking through|tracking) my (phone|texts|messages|location|emails?)\b|\b(has|knows|demands|wants|makes me (give|share)) (all )?my passwords?\b|\bcontrolling\b|\bcoercive\b/;
  var HARD = /\b(hit|hits|hitting|slap\w*|punch\w*|chok\w*|kick\w*|strangl\w*|shov\w*|push\w* me|beat\w*|kill\w*|die|dead|suicid\w*|hurt\w*|harm\w*|rape\w*|assault\w*|gun|knife|weapon|threat\w*|scared|afraid|frightened|terrified|stalk\w*|overdos\w*|not safe|unsafe|violen\w*|abus\w*|throws|threw|blocks? the door|grabb?\w*)\b/;
  // a parent reading a teen's phone is a different question from a partner doing it
  var PARENT_PHONE = /\b(mom|mum|dad|parents?|mother|father|stepmom|stepdad|stepmother|stepfather)\b.{0,40}\b(read\w*|check\w*|go(es)? through|look\w* (at|through)|track\w*|take\w*|took)\b.{0,25}\b(my )?(texts|messages|phone|location|dms|chats?)\b|\b(is|are) (my )?(mom|mum|dad|parents?) allowed to\b/;
  function cardByIdF(id) { return (IDX.first || []).filter(function (x) { return x.id === id; })[0] || null; }
  function controlReply() {
    return { blocks: [
      { k: 'p', x: 'That’s worth taking seriously, and it’s not your fault. Checking someone’s phone or location, limiting who they see or what money they have, or blaming them for someone else’s anger are common signs of control. They aren’t a communication problem that better wording can fix.' },
      { k: 'p', x: 'There’s a real difference between sharing you both chose (like location sharing you each agreed to and can turn off) and checking or tracking that happens in secret, without asking, or that you’d be afraid to say no to.' },
      { k: 'list', x: ['If you feel watched, scared, or like you have to explain yourself to avoid trouble, trust that feeling.',
        'You can talk it through privately with an advocate, even if you’re not sure it “counts”. In the US, the National Domestic Violence Hotline is free and confidential: call 1-800-799-7233, or text START to 88788. Outside the US, findahelpline.com lists free lines.',
        'If your phone might be checked, use a device they can’t see, and look at the Not safe at home? page for how to clear what this site keeps.'] },
      { k: 'links', x: [['Not safe at home? Hotlines, leaving this site quickly, and clearing what it keeps', '/safety.html']] }],
      chips: [{ label: 'What are the red flags?', q: 'What are the red flags in a relationship?' }, { label: 'Something else', q: 'Start over' }], kind: 'safety' };
  }
  // A friend (or anyone else) who is hurting themselves: how to help them, and who helps you help
  var OTHER_HARM = /\b(cuts?|cutting|hurts?|hurting|harms?|harming|burns?|burning) (themselves|themself|himself|herself)\b|\b(friend|sister|brother|son|daughter|kid|child|partner|girlfriend|boyfriend|gf|bf|mom|dad|someone)\b.{0,40}\b(self ?harm\w*|suicid\w*|wants? to die|kill (themselves|himself|herself))\b/;
  function otherHarmReply() {
    return { blocks: [
      { k: 'p', x: 'Thank you for caring about them. That’s a lot to carry, and you don’t have to handle it alone.' },
      { k: 'list', x: ['Tell them you noticed and you care, calmly: “I’m worried about you. I’m not mad. I’m here.” Listen more than you fix.',
        'Don’t promise to keep it secret. Tell a trusted adult (a parent, school counselor, teacher, coach, or doctor) even if they ask you not to. That isn’t betraying them; it’s getting them help.',
        'If they might be in danger right now, call 911 or your local emergency number.',
        'You can call or text 988 (the Suicide & Crisis Lifeline in the US) yourself to ask how to help a friend, or text HOME to 741741 (Crisis Text Line). Outside the US, findahelpline.com lists free lines.',
        'Look after yourself too. Supporting someone who self-harms is heavy; talk to someone about how you’re doing.'] },
      { k: 'links', x: [['For teens: when it’s more than a bad day', '/teens.html']] }], chips: [], kind: 'safety' };
  }
  function safetyReply(f) {
    var live = f && NOT_LIVE.test(f), self = live && !/\b(he|she|they|partner|husband|wife|boyfriend|girlfriend|spouse|ex|dad|father|mom|mum|mother)\b/.test(f);
    var blocks = [
      { k: 'p', x: 'I’m really glad you said something. What you’re describing sounds serious, and it’s beyond what a small helper like me can help with. You deserve real support from a person.' }];
    if (!self) blocks.push(
      { k: 'p', x: 'If someone is hurting, threatening, watching or controlling you, that is not your fault, and it isn’t something better wording or staying calmer can fix. The tips on this site are for two people who are both safe, so please don’t use them to manage someone who frightens you.' },
      { k: 'p', x: 'In the US you can call the National Domestic Violence Hotline at 1-800-799-7233, or text START to 88788, any time. Outside the US, findahelpline.com lists free lines in your country. If you’re in danger right now, call 911 or your local emergency number.' });
    else blocks.push({ k: 'p', x: 'Please reach out to someone you trust, or to a qualified professional who can help with this properly.' });
    if (live) blocks.push({ k: 'p', x: 'You can call or text 988, the Suicide & Crisis Lifeline, any time, day or night, in the US. If you might act on these feelings or you’re in danger right now, call 911 or your local emergency number. In the UK and Ireland, Samaritans are free on 116 123, day or night, and young people in the UK can call Childline free on 0800 1111. Elsewhere, findahelpline.com lists free, confidential lines in your country.' });
    var young = !self && /\b(mum|mom|dad|stepdad|stepmom|stepfather|stepmother|parents?|mother|father|at home|i m 1[0-7]|im 1[0-7]|i am 1[0-7]|teen|school)\b/.test(f || '');
    if (young) blocks.push({ k: 'p', x: 'If you’re under 18: you can call or text Childhelp at 1-800-422-4453, or text HOME to 741741 (Crisis Text Line), in the US. In the UK, call Childline free on 0800 1111. It also counts if the shouting or fighting at home scares you, even if nobody is hurting you directly. Telling an adult you trust (a teacher, school counselor, relative or doctor) is a good step, and if the first person doesn’t help, tell someone else.' });
    blocks.push({ k: 'links', x: [['Not safe at home? Hotlines, leaving this site quickly, and clearing what it keeps', young ? '/safety.html#teens' : '/safety.html']].concat(young ? [['For teens', '/teens.html']] : []) });
    return { blocks: blocks, chips: [], kind: 'safety' };
  }
  // "how do I hide that I visited", "clear my history": how to cover tracks on this site, kindly and plainly
  var HIDE = /\b(hide|cover|delete|clear|erase|remove|wipe)\b.{0,30}\b(visit(ed)?|history|tracks|this site|that i (was|came)|my (searches|chat))\b|\b(private|incognito) (window|mode|browsing)\b|\bquick(ly)? exit\b|\bleave (this site )?quickly\b/;
  function hideReply() {
    return { blocks: [
      { k: 'p', x: 'Here’s how to leave less of a trace. This site keeps small notes only in this browser (your settings, the pages you opened for “Pick up where you left off”, and this chat). The Not safe at home? page has one button to erase all of it and stop the page list.' },
      { k: 'list', x: ['Next time, open the site in a private window (Incognito or Private browsing), so nothing goes into your history.', 'To remove past visits, open your browser’s History, search for “spreadloveandacceptance”, and delete those entries.', 'To leave fast, press Esc twice, or use “Leave this site quickly” in the menu.'] },
      { k: 'links', x: [['Not safe at home? (erase button and hotlines)', '/safety.html'], ['What’s stored on this device', '/on-this-device.html']] }], chips: [], kind: 'safety' };
  }

  // Name-calling, screaming, "walking on eggshells", "he turns everything around on me", "how do I say it so he doesn't get
  // angry": from the person on the receiving end, that is a safety matter, not a wording problem. Never a script for them.
  var VERBAL = /\b(he|she|they|my (partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse|fiance|fiancee))\b.{0,40}\b(calls|called|calling) me (names|worthless|stupid|useless|pathetic|fat|ugly|crazy|psycho|an idiot|a (bitch|slut|whore|loser|failure|idiot))\b|\bcalls me names\b|\bname ?calling\b|\b(puts|put|putting) me down\b|\bbelittl\w* me\b|\b(makes|made) me feel (worthless|small|stupid|like nothing|like im nothing|like i m nothing)\b|\b(says|said|tells me|told me) (i m|im|i am) (worthless|useless|stupid|pathetic|nothing|crazy|a failure)\b|\bwalk\w* on eggshells\b|\b(turns|turned|twists|twisted|flips|flipped) (it|things|everything|this|that|it all) (around|back|round) (on|onto) me\b|\bdarvo\b|\b(is|could) (he|she|my \w+) (be )?(a )?narcissis\w*\b|\b(he|she|my \w+) (is|s) (a )?(narcissis\w*|gaslight\w*)\b|\b(screams|screamed|screaming|yells|yelled|yelling|shouts|shouted|shouting|swears|swore) at me\b.{0,60}\b(names|worthless|stupid|every day|all the time|constantly|always|scared|afraid|so he|so she)\b|\b(say|word|phrase|put|ask) (it|things|anything|stuff|this|that|everything) so (that )?(he|she|they) (doesnt|dont|wont|does not|will not) (get|go) (so )?(angry|mad|furious|off|crazy)\b|\bkeep (him|her|them) (calm|happy|from (getting|going) (angry|mad))\b|\b(he|she|my (partner|husband|wife|boyfriend|girlfriend|bf|gf|spouse|fiance|fiancee))( always| constantly| often| still| keeps)? (yells|screams|shouts|swears|yelling|screaming|shouting) at me\b/;
  // a sibling, a child, a classmate or a boss calling names is a different conversation
  var VERBAL_NOT = /\b(brother|sister|sibling|son|daughter|kids?|child|children|classmates?|kids at school|boss|manager|coworkers?|colleagues?|teacher|students?|roommates?)\b/;
  function verbalReply(f) {
    var b = [{ k: 'p', x: 'I’m really glad you asked. Being screamed at, called names or made to feel worthless, or having things turned around so it’s always your fault, is serious. It isn’t a communication problem you can fix by wording things better, and it is not your fault.' }];
    if (/narcissis|apologi|turns?|turned|twist|flip|darvo/.test(f)) b.push({ k: 'p', x: 'I can’t diagnose anyone, and a label matters less than the pattern. Someone who never apologises and always turns it back on you (sometimes called DARVO: deny, attack, then act as if they’re the one hurt) is a pattern worth taking seriously, whatever the label.' });
    b.push({ k: 'p', x: 'Some signs it has moved from ordinary conflict into control:' });
    b.push({ k: 'list', x: ['You change what you say or do to avoid their anger, or feel you’re walking on eggshells.', 'Name-calling, insults or putting you down, in private or in front of others.', 'You’re always the one to blame, and you’ve started to doubt your own memory.', 'They check on you, or limit who you see or what money you have.', 'You feel scared of them, or of how they’ll react.'] });
    b.push({ k: 'p', x: 'You can talk it through privately with an advocate, even if you’re not sure it “counts”. In the US, the National Domestic Violence Hotline is free and confidential: call 1-800-799-7233, or text START to 88788. In the UK, the National Domestic Abuse Helpline is free on 0808 2000 247, and the Men’s Advice Line is 0808 801 0327. Elsewhere, findahelpline.com lists free lines. If you’re in danger right now, call 911 or your local emergency number.' });
    b.push({ k: 'links', x: [['Not safe at home? The signs, people to talk to, and leaving this site quickly', '/safety.html']] });
    return { blocks: b, chips: [{ label: 'How do I clear this chat?', q: 'how do i clear my history' }, { label: 'Something else', q: 'Start over' }], kind: 'safety' };
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
          v >= 0.3 ? ['WP-11: The Calm-Down Kit', '/wp-11.html'] : ['Today’s Weather', '/quick-checks.html#today']]) });
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
        if (n[0] <= 4) bl1.push({ k: 'p', x: 'If you meant a single answer of ' + n[0] + ' (each one runs from 0 to 4), send me all five, like “my battery answers are ' + n[0] + ', 1, 2, 0, 2”, and I’ll add them up with you.' });
        bl1.push({ k: 'note', x: 'This is Pillar III, Read your state first. ' + NOT_VERDICT + ' It isn’t a medical test.' });
        bl1.push({ k: 'links', x: [['WP-02: How much are you carrying?', '/workpapers/wp-02-how-much-are-you-carrying.html']] });
        return { blocks: bl1, chips: [{ label: 'What helps when my battery is low?', q: 'What helps when my battery is low?' }, { label: 'How is it worked out?', q: 'Show me the math for WP-02' }], kind: 'calc', topic: 'battery score' };
      }
      if (n.length === 1 && n[0] > 20) {
        return { blocks: [{ k: 'p', x: 'The Battery Meter score runs from 0 to 1: five answers from 0 to 4, added up (so 0 to 20), then divided by 20. Could you send me your five answers, like “my battery answers are 2, 1, 3, 0, 2”?' }],
          chips: [{ label: 'How does the Battery Meter work?', q: 'How do I use WP-02?' }], kind: 'calc' };
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
        return { blocks: [{ k: 'p', x: 'A setup score of ' + r2(n3[0]) + ' falls in this band. ' + b1[0] + ' First move: ' + b1[1] }, { k: 'note', x: 'It reads the setup, never a person. ' + NOT_VERDICT },
          { k: 'links', x: [['CALC-01: Is the setup working for everyone?', '/workpapers/calculators/is-the-setup-working-quick.html']] }],
          chips: [{ label: 'Show me the math', q: 'Show me the math for CALC-01' }], kind: 'calc', topic: 'solvency read' };
      }
    }
    if ((isCalc || hasNamed >= 2) && hasNamed >= 2 && !(hasNamed === 2 && !isCalc && !/\b(balance|ownership)\b/.test(low))) {
      if (hasNamed < 3) {
        return { blocks: [{ k: 'p', x: 'I can run a quick CALC-01 read, but I need all three numbers, each from 0 to 1: workload balance, ownership clarity, and the average load score. Something like “CALC-01: balance 0.6, ownership 0.5, battery 0.4”.' }],
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
          { k: 'links', x: [['The Lemonade Stand', '/lemonade-stand.html'], ['CALC-01: Is the setup working for everyone?', '/workpapers/calculators/is-the-setup-working-quick.html']] }],
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
  function spellFix(q) {
    // names are never "corrected": any capitalised word that isn't the first word ("Marcus", "Leo") is left alone
    var NAMES = {};
    String(q).replace(/[’‘`´]/g, "'").split(/\s+/).forEach(function (w, i) { var m = /^([A-Z][a-z]+)/.exec(w); if (m && i > 0 && m[1] !== 'I') NAMES[m[1].toLowerCase()] = 1; });
    var low = String(q).replace(/[’‘`´]/g, "'").toLowerCase(), fixes = [], known = 0, unknown = 0;
    (KB.spellp || []).forEach(function (p) {
      var rx; try { rx = new RegExp(p[0], 'g'); } catch (e) { return; }
      low = low.replace(rx, function (m) {
        var to = m.replace(new RegExp(p[0]), p[1]);
        if (fold(to) !== fold(m)) fixes.push([m, to]);
        return to;
      });
    });
    low = low.replace(/[a-z][a-z']*/g, function (w) {
      var key = w.replace(/'/g, ''), to = (KB.spell || {})[w] || (KB.spell || {})[key];
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
  function cardReply(state, c, aspect) {
    var b = [], chips = [];
    if (c.kind === 'intent') aspect = 'about';
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
      var same = !again && c.kind === 'intent' && state.last && state.last.card === c.id && c.how && c.how.length > 1;
      if (again) b.push({ k: 'p', x: 'That’s the same thing we just looked at, so here’s the short version. The page below has the rest.' });
      else if (same) {
        // the same topic card for a follow-up ("he forgets everything I tell him"): the steps that fit it, not the whole answer again
        var qt = {}; tokens(state.curF || '').forEach(function (t) { if (t.length > 2 && !ROLE[t] && !ASPECT[t]) qt[t] = 1; });
        var fit = c.how.map(function (x, i) { var sc = 0, seen = {}; tokens(x).forEach(function (t) { if (qt[t] && !seen[t]) { seen[t] = 1; sc++; } }); return { x: x, i: i, sc: sc }; })
          .filter(function (o) { return o.sc > 0; }).sort(function (a2, b2) { return b2.sc - a2.sc || a2.i - b2.i; });
        b.push({ k: 'p', x: fit.length ? 'Staying with that, this part fits what you said:' : 'Staying with that, here are two more things to try:' });
        b.push({ k: 'list', x: fit.length ? fit.slice(0, 2).map(function (o) { return o.x; }) : c.how.slice(1, 3) });
        var sc2 = Array.isArray(c.script) ? c.script : c.script ? [c.script] : [];
        if (sc2.length) { var si = sc2.length > 1 ? 1 : 0; b.push({ k: 'script', l: (c.scriptLabels && c.scriptLabels[si]) || 'Words you could use', x: sc2[si] }); }
        var lk2 = safeLinks(c.links).slice(0, 1);
        if (lk2.length) b.push({ k: 'links', x: lk2 });
        state.last = { kind: 'card', card: c.id, q: c.name, topic: c.name, u: lk2[0] && lk2[0][1] };
        return { blocks: b, chips: [{ label: 'Something else', q: 'Start over' }], kind: 'card', id: c.id };
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
    return { blocks: b, chips: chips.slice(0, 3), kind: 'card', id: c.id };
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
    return { issue: best, score: bs, who: who, noun: noun, personal: personal || pronoun, pronoun: pronoun, actor: actor, feel: feel };
  }
  function whoCtx(who, noun) {
    var W = IDX.sit.who[who] || IDX.sit.who.other;
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
    var read = C.read || (W.read && !self && !I.ownRead ? W.read : null) || (I.path_self && self ? null : (I.path || [])[2]) || (self ? ['Know your own wiring', '/know-yourself.html'] : null);
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
    state.last = { kind: 'sit', issue: issueKey, who: who, noun: noun, actor: actor || '', v: variant || 0, q: I.label, topic: I.label, u: P.path[0] && P.path[0][1] };
    var chips = [];
    if (I.deeper) chips.push({ label: 'Go deeper: ' + I.deeper[0], q: I.deeper[1] });
    chips.push({ label: 'What can I do tonight?', q: 'What can I do tonight?' });
    if (P.scripts.length > 1) chips.push({ label: 'Another way to say it', q: 'Another way to say it' });
    else if (P.ex) chips.push({ label: 'Give me an example', q: 'Give me an example' });
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
  var FU_START = /^(so |ok |okay |and )?(how (do|should|would|can) (i|we) (start|begin|get started|use (it|this|that|them|these|those)|do (it|this|that))|where (do|should) (i|we) (start|begin)|what (do|should) (i|we) do first|first step|whats the first step|what is the first step|how do i begin|where to start)( with (it|this|that))?$/;
  var FU_WHO = /^(and |but |ok |okay |so )?((what|how) about|and|and for|and with|for|with|what if its|what if it s|same (thing )?(for|with)|does (this|that|it) (work|help|apply) (for|with)|would (this|that|it) (work|help) (for|with)|can i use (this|that|it) (for|with))\s+(.{2,40})$/;
  var FU_TONIGHT = /^(ok |okay |so |but |and |ok but |okay but |right but |fine but )*(what (do|can|should|could) (i|we) (actually |really |even |possibly )?do( about it| about that)? ?(tonight|now|right now|today|this evening|first)?|what can i do tonight|whats (one|a) (tiny|small|little) (thing|step)( for tonight)?|(one|a) (tiny|small|little) (thing|step)( for tonight| i can do)?|now what|what now|what next|whats next|whats the first step tonight|what (do|should|can) (i|we) do next|give me (one|a|just one|a single) (thing|step)( to do| i can do| for now| right now)?|(tell me )?(one|just one) thing (to do|i can do)|(whats|what is) the next step|next step)( please)?$/;
  // ------------------------------------------------------------------ conversation turns
  // "thanks", "that didn't help", "is that a red flag?", "ok and then what?", "start over", and
  // "what about my sister?" right after a caring answer. They keep the topic we were on.
  var CV_THANKS = /^(ok |okay |oh |aw |aww )?(thanks?|thank (you|u)|ty|thx|cheers|many thanks|appreciate (it|that|you))( (so|very) much| a lot| a bunch| again)?( (puddles|professor|professor puddles|prof))?( (that|this) (helps?|helped|was (helpful|useful|great|kind|nice)))?$|^(that|this) (helps?|helped|was (really |so |very )?(helpful|useful))( thanks?| thank you)?$/;
  var CV_NOHELP = /^(sorry |hmm |um |well |but |no |nah |honestly |ok |okay )*((that|this|it|none of (that|this|it)|your (answer|advice|reply)) (didnt|did not|doesnt|does not|isnt|is not|wasnt|was not|wont|will not) (help|work|helpful|useful|fit|right|it|what i (meant|asked|needed|wanted))( me)?( at all| much| really)?( though)?|not (helpful|useful|really helpful|quite it|it|what i (meant|asked|needed))|(thats|that s) (not (it|helpful|useful|right|what i (meant|asked|needed))|useless|no help|unhelpful)|useless|unhelpful|no help|not helping|still stuck|i m still stuck|im still stuck|(i ve|ive|i have) (already )?tried (that|it|those|this)( already)?|i already tried (that|it|those|this)|tried (that|it) already)$/;
  var CV_REDFLAG = /\b(is|are|isnt|was|could) (that|this|it|those|these|they|he|she|this behaviou?r|that behaviou?r) (be )?(a )?(red flags?|toxic|abus\w*|controlling|manipulat\w*|gaslight\w*|healthy|unhealthy|a warning sign|warning signs?|a bad sign)\b|^(red flags?|any red flags|what are (the |some )?red flags|signs of (abuse|control|coercive control|a toxic relationship)|should i be worried|is (this|that) normal in a relationship)\b/;
  // "is it controlling if I ask him to check before he buys things?": the normal-vs-control money answer, not the red-flag list
  var MONEY_W = /\b(money|buy\w*|bought|spend\w*|purchases?|budget|bank|finances?|card)\b/;
  var CV_NEXT = /^(ok |okay |so |and |alright |right |cool |great |got it |done |ok done |i did that )*(and )?(then what|what then|what after that|after that|and after that|what comes next|what comes after that|whats after that|what do i do after that|what should i do after that|then)\??$/;
  var CV_RESTART = /^(start over|start again|new topic|change of subject|different (topic|question|thing)|something else|never ?mind|forget (it|that)|lets talk about something else)$/;
  var CV_PERSONAL = { therapistq: 1, forcounselors: 1, deployhealth: 1, comehome: 1, differenthours: 1, gaming: 1, friends: 1, joinhome: 1, poly: 1, leftout: 1, fosterload: 1, foster: 1, parentapproach: 1, teenrules: 1, kinshipgp: 1, teenkinship: 1, missing: 1, teenphone: 1, adhdkids: 1, gpadvice: 1, gpshutout: 1, familyboundary: 1, coparentdecide: 1, handoffkit: 1, parttimehome: 1, bizpartner: 1, twofaiths: 1, holidaysplit: 1, moneycontrol: 1, moneystyles: 1, wedding: 1, longhours: 1, toddlers: 1, spanish: 1, illburden: 1, illchores: 1, forgiveok: 1, mustreconcile: 1, inheritance: 1, favourite: 1, siblingrift: 1, emptynest: 1, feelingstalk: 1, feelsfine: 1, autisticwork: 1, isthisrude: 1, sharingroom: 1, gaycouple: 1, selfworry: 1, angerhelp: 1, yellpartner: 1, illnesscare: 1, lgbtadult: 1, familycutoff: 1, wifiprivacy: 1, rahelp: 1, feltsmall: 1, holidayboth: 1, savingworry: 1, caresiblings: 1, caremarriage: 1, rentlate: 1, supplies: 1, sitesafe: 1, cantsleep: 1, evidence: 1, adhdfriends: 1, adhdwork: 1, teenmiddle: 1, teensibling: 1, teentalk: 1, shiftwind: 1, roughweek: 1, teaminvisible: 1, ldtimezones: 1, teensay: 1, stepdiscipline: 1, notenough: 1, raisegently: 1, toosensitive: 1, getstay: 1, backmeup: 1, sendamount: 1, planrecall: 1, gamefortwo: 1, retirepurpose: 1, notrealdad: 1, parttimechild: 1, textmeaning: 1, handover: 1, paidwork: 1, disagreenumbers: 1, longstay: 1, ndcouple: 1, sharelist: 1, breaklength: 1, comeback: 1, sentlink: 1, reconnect: 1, pursuewithdraw: 1, familyduty: 1, retired: 1, longdistance: 1, bioparent: 1, outsider: 1, exschedule: 1, carehelp: 1, careadultkids: 1, careresent: 1, yellkids: 1, exharass: 1, exmessages: 1, exbadmouth: 1, lgbtq: 1, parentphone: 1, parentsfight: 1, teamowners: 1, grownkids: 1, phonetrust: 1, lonely: 1, leave: 1, atwork: 1, grief: 1, overgive: 1, burden: 1, parentsblame: 1, onmyown: 1, teens: 1, raisekids: 1, fightnow: 1, judged: 1, sensitive: 1, overload: 1, meltdown: 1, 'upset-right-now': 1 };
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
    if (CV_RESTART.test(f)) { state.last = null; state.care = null; return { blocks: [{ k: 'p', x: 'Sure, a fresh start. What’s on your mind? A few words is plenty.' }], chips: STARTERS, kind: 'restart' }; }
    if (CV_REDFLAG.test(f) && !(/\bcontrolling\b/.test(f) && MONEY_W.test(f))) {
      var b = [];
      var I0 = L && L.kind === 'sit' && IDX.sit.issues[L.issue];
      if (I0 && L.issue !== 'hurtbythem') b.push({ k: 'p', x: 'On its own, ' + lc1(I0.label) + ' is a common problem, and a fixable one. It isn’t a red flag by itself. What matters is how it happens, and how you feel around them.' });
      else b.push({ k: 'p', x: 'Here’s how to tell an ordinary rough patch from a red flag.' });
      b.push({ k: 'p', x: 'These are red flags, and they’re not a communication problem:' });
      b.push({ k: 'list', x: ['You feel scared of them, or of how they’ll react.', 'They hurt, push, corner or threaten you, or threaten to hurt themselves, the kids or a pet.', 'They check your phone, track where you are, or cut you off from friends and family.', 'They control all the money, or stop you from working.', 'They pressure you into sex, or anything else you don’t want.', 'You’re always the one to blame, and you’ve started to doubt your own memory.'] });
      b.push({ k: 'p', x: 'If any of these fit, please skip the tools here and talk to people who help with this every day. In the US, the National Domestic Violence Hotline is free and private: call 1-800-799-7233, or text START to 88788.' });
      b.push({ k: 'links', x: [['Not safe at home? Hotlines, leaving this site quickly, and clearing what it keeps', '/safety.html']] });
      b.push({ k: 'note', x: I0 ? 'If none of them fit, it’s most likely an ordinary problem you can work on together, and the steps I gave still apply.' : 'If none of them fit, it’s most likely an ordinary problem you can work on together. Tell me what’s going on, and I’ll suggest a few steps.' });
      return { blocks: b, chips: L && L.kind === 'sit' ? [{ label: 'What should I do first?', q: 'What should I do first?' }, { label: 'Words I could use', q: 'Another way to say it' }] : [], kind: 'redflag' };
    }
    if (CV_NOHELP.test(f)) {
      var tried = /tried/.test(f), nb = [];
      if (L && L.kind === 'sit' && IDX.sit.issues[L.issue] && L.nohelp) {
        // second time round: don't repeat the same block; ask what happened, and offer a person to talk to
        state.last = Object.assign({}, L, { nohelp: L.nohelp + 1 });
        return { blocks: [{ k: 'p', x: tried ? 'Got it. Tell me what happened when you tried it: what they said or did, and how it ended. Even one line helps, and I’ll suggest something different.' : 'I hear you. Tell me in one line what happened, or what you’d most like to change, and I’ll come at it differently.' },
          { k: 'note', x: 'If it keeps going round in circles, a counselor or a calm third person you both trust can help you talk it through. That isn’t a failure; it’s often what gets things unstuck.' }],
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
        return { blocks: [{ k: 'p', x: 'I’m still with you on “' + pd.f + '”. To give you real steps, I need one more thing: what usually sets it off, or how does it tend to end? A few words is plenty. Or tap the closest one.' }], chips: pd.chips || STARTERS.slice(0, 3), kind: 'clarify' };
      }
    }
    // after a caregiving answer, "my daughter won't help" and "I resent him" stay about caregiving
    var cc3 = careCard(state);
    if (cc3 && (/^care/.test(cc3.id) || cc3.id === 'illnesscare')) {
      var to = /\b(daughter|son|kids|children|sister|brother|family)\b/.test(f) && /\b(won t|wont|doesn t|doesnt|don t|dont|never|help|visit|call)\b/.test(f) ? 'careadultkids'
        : /\b(resent\w*|guilt\w*|ashamed|angry at him|angry at her)\b/.test(f) ? 'careresent' : /\b(respite|break|helpline|support|someone to call)\b/.test(f) ? 'carehelp' : '';
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
      if (c && sw.who && sw.who !== 'self' && !(sw.issue && sw.score >= 3)) {
        var r = cardReply(state, c, 'about');
        var who = sw.noun ? 'your ' + sw.noun.replace(/^(my|our|the|a|an)\s+/, '') : whoCtx(sw.who).them;
        r.blocks.unshift({ k: 'p', x: 'Yes, the same goes with ' + who + '. Each person carries it a little differently, so go gently and ask, rather than guess.' });
        r.kind = 'care'; state.care = { id: C0.id, turn: state.turn || 0 };
        return r;
      }
    }
    return null;
  }
  function followUp(state, f, q) {
    var L = state.last;
    if (!L) return null;
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
    return { blocks: [{ k: 'p', x: 'Thanks for telling me. I want to make sure I help with the right thing. Is it closest to one of these? Or tell me a little more in your own words, like who it’s with and what happened.' }],
      chips: [{ label: 'We keep having the same fight', q: 'We keep having the same fight again' }, { label: 'Making up after a fight', q: 'How do we make up after a fight?' },
        { label: 'I’m worn out', q: 'I feel exhausted and overwhelmed' }, { label: 'What can I do tonight?', q: 'What can I do tonight?' }], kind: 'clarify' };
  }

  // ------------------------------------------------------------------ care first: tender moments and literal questions
  // Asked plainly, answered plainly: who can see this chat, "is it my fault?", "tell me something calming",
  // "I just had a fight and I have 5 minutes", bigger text, reading out loud. These answer before anything else,
  // and they don't change the topic we were on.
  var SHORTER = /^(ok |so |can you |could you |please |pls )*(tl ?dr|tldr|too long( didnt read)?|make (it|that|this) (shorter|simpler|short)|shorter|shorten (it|that|this)|summari[sz]e( (it|that|this))?|(give me )?(the )?(short|shorter|quick|simple|simpler) version|sum (it|that) up|(say|put) (it|that) (shorter|simpler|more simply|in fewer words|in plain words)|simpler|simplify( (it|that|this))?|too many words|too much text|in short|less words|fewer words)( please| pls)?$/;
  var LEFT_OFF = /^(so |ok |okay |um |hey )*(where (did|was|were) (i|we) (leave|left|leaving) off|where (was|were) (i|we)|what were we (talking about|saying|doing|on)|(pick up|carry on|continue|keep going) (from )?where (i|we) left off|where did we get to|what was i (asking|doing|saying)|remind me what we were (talking about|doing))( please)?$/;
  // A short version of a reply: one line, up to three bullets (two when there are words to use), the words, one link.
  function shortBlocks(blocks, keepScript) {
    var paras = [], bullets = [], link = null, script = null;
    (blocks || []).forEach(function (b) {
      if (b.k === 'script' && keepScript && !script) script = b;
      if (b.k === 'p' && !b.mean && !/^(Here’s|The site|This part|Sure|Here you go|Related|It also|Another page|This may be|In short)/.test(b.x)) paras.push(b.x);
      if (b.k === 'list' && !bullets.length) bullets = b.x.slice(0, 3);
      if (b.k === 'passage') { paras.push((b.x || []).join(' ').replace(/^…\s*/, '').replace(/\s*…$/, '')); if (!link && b.u) link = [b.h, b.u]; }
      if (b.k === 'bg') paras.push((b.x || []).join(' '));
      if (b.k === 'links' && !link && b.x && b.x[0]) link = b.x[0];
    });
    var ss = paras.length ? sentences(paras[0]) : [], first = ss[0] || '';
    if (first && wc(first) < 5 && ss[1]) first += ' ' + ss[1];  // "I’m sorry." alone is too short to stand as the gist
    if (!bullets.length && paras.length) bullets = sentences(paras.join(' ')).slice(1, 3);
    bullets = bullets.map(function (t) { return sentences(t)[0] || t; }).slice(0, script ? 2 : 3);
    if (!first && !bullets.length) return null;
    var out = [];
    if (first) out.push({ k: 'p', x: 'In short: ' + first });
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
    [/\bthe noticing\b/g, 'noticing what needs doing'], [/\bscorecard\b/g, 'score'], [/\bat a calm moment\b/g, 'when you are both calm'], [/\bverdict\b/g, 'final judgement']];
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
      { k: 'p', x: 'Pages have short ways in too: a 🌱 Simple version and 📌 In short at the top of long pages.' }], chips: STARTERS.slice(0, 3), kind: 'short' };
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
    var tail = { k: 'p', x: 'Tools that keep your place do it on this device: Today’s Weather keeps a 7-day log, the Carrier Wave Decoder keeps a journal, and fill-in workpapers can keep a draft if you turn that on.' };
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
    if (L && (L.card === 'longdistance' || (L.kind === 'sit' && L.issue === 'longdistance')) && /\b(bring (it|this) up|nag\w*|stop being (mad|upset|angry)|make (her|him|them) (stop|less)|(she|he|they) (s|is|are) (mad|upset|angry)|without (sounding|starting))\b/.test(f)) {
      var ld = cardById('longdistance');
      return { blocks: [{ k: 'p', x: 'Keep it about the rhythm, not the scorecard: one example, how it felt, and one ask for a plan you both choose.' },
        { k: 'list', x: ['If you usually reach out: “I’ve been the one starting most of our calls, and I miss feeling chosen. Can we agree a rhythm, so it isn’t always on me?”',
          'If you call less: “I know you’ve been reaching out more. Work is heavy right now, and it isn’t about you. Can we pick our call days together, and I’ll start the Sunday one?”',
          'Answer the person as well as the plan: if they asked “are we still on tonight?”, answer that first.'] },
        { k: 'links', x: safeLinks((ld && ld.links) || []).slice(0, 2) }], chips: [], kind: 'care', id: 'longdistance' };
    }
    // a short follow-up just after a topic card ("i do all the meetings and paperwork" after fostering, "how do i get a say"
    // after a co-parent answer) stays with that topic: a card names, in "follow", the card that answers a follow-up's words
    var C1 = state.care, cc1 = C1 && CV_PERSONAL[C1.id] && (state.turn || 0) - C1.turn <= 2 && n <= 20 ? cardById(C1.id) : null;
    var roots = cc1 ? [cc1].concat(C1.root && C1.root !== cc1.id && cardById(C1.root) ? [cardById(C1.root)] : []) : [];
    for (var ri = 0; ri < roots.length; ri++) {
      var fl = roots[ri].follow || [];
      for (var fi = 0; fi < fl.length; fi++) {
        var fre = null; try { fre = new RegExp(fl[fi][0]); } catch (e) { fre = null; }
        var tcard = fre && fre.test(f) && cardById(fl[fi][1]);
        if (tcard) { var rf = cardReply(state, tcard, 'about'); rf.kind = 'care'; state.care = { id: tcard.id, turn: state.turn || 0, f: f, root: C1.root || C1.id }; return rf; }
      }
    }
    for (var i = 0; i < (IDX.first || []).length; i++) {
      var c = IDX.first[i];
      if (!c.re.test(f) || (c.notRe && c.notRe.test(f))) continue;
      if (c.id === 'nextstep' && L && L.kind === 'sit') continue;   // "what next?" after a playbook: its own next step
      if (c.id === 'fault' && n > 18) continue;
      var r = cardReply(state, c, 'about');
      if (c.id === 'fault') {
        var H = IDX.sit.issues.hurtbythem;
        var hurt = (L && L.kind === 'sit' && L.issue === 'hurtbythem') || (H && H.res.some(function (x) { return x[1] >= 5 && x[0].test(f); }));
        if (hurt && c.what_hurt) {
          r.blocks = [{ k: 'p', x: c.what_hurt[0] }, { k: 'list', x: c.how_hurt }].concat(r.blocks.filter(function (b) { return b.k === 'note' || b.k === 'links'; }));
        }
      }
      r.kind = 'care';
      state.care = { id: c.id, turn: state.turn || 0, f: f };
      if (c.id === 'brief') state.brief = 1;
      // a question about the chat or a feeling keeps the topic we were on; a new topic (a meltdown, "I have ADHD") takes over
      if (!c.newTopic) state.last = L || state.last;
      return r;
    }
    return null;
  }
  function unclearReply() {
    return { blocks: [{ k: 'p', x: 'I didn’t catch that. Could you say it another way? A few words is plenty, like “chores” or “my partner snapped at me”.' }], chips: STARTERS, kind: 'unclear' };
  }
  // "What exactly does 'static' mean? Give a definition, not an example." → static, with no example
  function termQuery(q) {
    var parts = String(q).split(/(?<=[.?!])\s+/), noEx = /\b(not|no|without|skip) (an |any |the )?examples?\b|\bdefinition only\b|\bjust (the|a) definition\b/.test(fold(q));
    for (var i = 0; i < parts.length; i++) {
      var f = norm(parts[i]).replace(/\b(exactly|actually|really|precisely|literally|please|plainly|simply)\b/g, ' ')
        .replace(/\b(on|in) (this|the) (site|website|program|page|chat)$|\bhere$/g, ' ').replace(/\s+/g, ' ').trim();
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
    b.push({ k: 'links', x: [['Test how a message may land: the Signal Translator', '/signal-translator.html'], ['Wired Differently: when words land differently', '/wired-differently.html']] });
    state.last = { kind: 'idiom', q: name, topic: Name };
    return { blocks: b, chips: [{ label: 'Another saying', q: 'What does “we’ll see” mean?' }, { label: 'What does static mean?', q: 'What does static mean?' }], kind: 'idiom', id: x.p[0] };
  }

  // "I think you mean…": said once, above the answer, when a typo was read as another word
  function meant(r, sp) {
    if (!r || !r.blocks || !sp || !sp.fixes.length || r.kind === 'unclear') return r;
    // "whats" for "what's", "im" for "I'm": not worth correcting anyone over
    if (sp.fixes.every(function (x) { return String(x[0]).toLowerCase().replace(/[^a-z0-9]/g, '') === String(x[1]).toLowerCase().replace(/[^a-z0-9]/g, ''); })) return r;
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
        qs.forEach(function (q) { if (has(tt, q)) sc += 3; if (has(sx, q)) sc += 1.5; });
        if (!sc) return;
      } else sc = Math.random();
      if (seen[i]) sc -= 100;
      scored.push([sc + Math.random() * 0.5, i]);
    });
    scored.sort(function (a, b) { return b[0] - a[0]; });
    var pick = scored.filter(function (x) { return x[0] > -50; }).slice(0, 3);
    if (!pick.length && qs.length) return null;
    if (!pick.length) pick = scored.slice(0, 3);
    pick.forEach(function (x) { seen[x[1]] = 1; });
    state.art = { topic: aq.topic, seen: seen };
    var arts = pick.map(function (x) { var it = R.items[x[1]]; return { t: it[0], u: it[1], s: it[3], x: it[2] }; });
    var b = [{ k: 'p', x: aq.topic ? 'Here are some good articles on “' + aq.topic + '”, hand-picked for this site from trusted sources. They open on the publisher’s own site.' :
      'Here are a few good articles from the site’s hand-picked reading list. Tell me a topic (“stress”, “apologies”, “ADHD”, “chores”) and I’ll find ones that fit.' }];
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
  function respond(state, q, chipDoc) {
    var sp = null;
    state.turn = (state.turn || 0) + 1;
    if (chipDoc == null) {
      sp = spellFix(q);
      // a spelling fix must never hide a safety concern ("it's my fault" read as "it is my fault")
      if (sp.fixes.length && !(DANGER.test(norm(q)) && !DANGER.test(norm(sp.q)))) q = sp.q; else if (sp.fixes.length) sp = { q: q, fixes: [], known: sp.known, unknown: sp.unknown };
      // "different question: …", "by the way, …": a new topic, so nothing from the last one carries over
      var sw0 = norm(q).match(/^(anyway|anyways|by the way|btw|on another note|new question|different question|another question|other question|unrelated|separate question|changing (the )?subject|switching (topics?|gears))\b\s*(.{6,})$/);
      if (sw0) { state.last = null; state.care = null; q = sw0[sw0.length - 1]; }
      var es = String(q).toLowerCase();
      if (/\bhabl\w*\b.{0,20}\bespa[nñ]ol\b|^\W*(en )?espa[nñ]ol\W*$|\b(se puede|puedo|hay algo|tienes algo|tienen algo|hay una p[aá]gina)\b.{0,30}\bespa[nñ]ol\b/.test(es)) return { blocks: [
        { k: 'p', x: '¡Hola! Casi todo el sitio está en inglés, pero hay una página en español con lo esencial: repartir las tareas de la casa, cuando los hijos pelean, cuando estás muy enojado, cuidar a alguien que quieres, y si no estás seguro en casa.' },
        { k: 'p', x: 'Muchas páginas y herramientas (como el Lemonade Stand y las fichas de trabajo) se pueden usar en español con el traductor del navegador: en Chrome, toca el menú ⋮ y luego “Traducir”. Yo solo puedo responder en inglés por ahora. (Most of the site is in English; there is a Spanish page, and the browser’s Translate works on the tools.)' },
        { k: 'links', x: [['En español', '/en-espanol.html']] }], chips: [], kind: 'lang' };
      if (/[¿¡ñ]|\b(qu[eé]|c[oó]mo|mis|hijos?|esposo|esposa|ayuda|estoy|pelean|tengo|por qu[eé]|necesito|mi pareja|hola)\b/.test(es) && (es.match(/\b(que|qué|como|cómo|mis|mi|hijos|hijo|esposo|esposa|ayuda|estoy|pelean|tengo|necesito|pareja|hola|por|no|se|me|con|los|las|el|la|de|y)\b/g) || []).length >= 3 && !/\b(the|and|my|is|are|i)\b/.test(es)) {
        if (/\b(cuid\w*|enferm\w*|agotad\w*|cansad\w*|parkinson|alzheimer|demencia|c[aá]ncer)\b/.test(es)) return { blocks: [
          { k: 'p', x: 'Hola. Cuidar a alguien que quieres, día tras día, es mucho trabajo, y es normal estar agotado, impaciente a veces, y luego sentir culpa. No es un fallo suyo.' },
          { k: 'p', x: 'Por ahora solo puedo responder en inglés, pero hay una parte en español para quien cuida, con ideas para pedir ayuda a los hijos y líneas de apoyo. (Sorry, I can only answer in English for now. There is a Spanish section for carers, and the full carer page in English.)' },
          { k: 'links', x: [['Cuando cuido a alguien que quiero (en español)', '/en-espanol.html#cuidar'], ['Caring for someone you love (English)', '/caregivers.html']] }], chips: [], kind: 'lang' };
        var EST = [[/\b(casa|tareas|quehaceres|limpi\w*|platos|ropa|no ayuda|no hace nada)\b/, '#casa', 'Repartir las tareas de la casa es una de las peleas más comunes, y tiene arreglo: hagan una lista de todo lo que hay que hacer, también lo que nadie ve (recordar, planear), y den a cada tarea un solo dueño.', 'Las tareas de la casa'],
          [/\b(hijos|ni[nñ]os|hermanos)\b.{0,30}\b(pelean|peleas|pelear|se pegan)\b/, '#hijos-pelean', 'Cuando los hijos pelean, ayuda separar primero, calmar, y después hablar con cada uno por turnos, sin buscar culpables.', 'Cuando los hijos pelean'],
          [/\b(enojad\w*|enfadad\w*|rabia|grit\w*|furios\w*)\b/, '#enojado', 'Cuando estás muy enojado, primero calma el cuerpo (respira, sal un momento) y habla después, cuando los dos estén tranquilos.', 'Cuando estás muy enojado'],
          [/\b(miedo|segur\w*|golpe\w*|pega|amenaz\w*)\b/, '#seguro', 'Si tienes miedo en casa, no es tu culpa. En EE. UU. puedes llamar gratis a la Línea Nacional contra la Violencia Doméstica al 1-800-799-7233 (atienden en español). Si estás en peligro ahora, llama al 911.', 'Si no estás seguro en casa']];
        for (var ei = 0; ei < EST.length; ei++) if (EST[ei][0].test(es)) return { blocks: [{ k: 'p', x: 'Hola. ' + EST[ei][2] },
          { k: 'p', x: 'Por ahora solo puedo responder en inglés, pero esta parte de la página en español habla de esto. (Sorry, I can only answer in English for now; here is the Spanish page on this.)' },
          { k: 'links', x: [[EST[ei][3] + ' (en español)', '/en-espanol.html' + EST[ei][1]], ['En español', '/en-espanol.html']] }], chips: [], kind: 'lang' };
        return { blocks: [{ k: 'p', x: 'Hola. Lo siento: por ahora solo puedo responder en inglés. Hay una página corta en español con pasos para cuando los hijos pelean, cuando estás muy enojado, y si no estás seguro en casa. (Sorry, I can only answer in English for now. Here is a short page in Spanish.)' }, { k: 'links', x: [['En español', '/en-espanol.html']] }], chips: [], kind: 'lang' };
      }
      var vf = norm(q);
      if (!DANGER.test(vf) && VERBAL.test(vf) && !VERBAL_NOT.test(vf) && !SELF_HARMFUL.test(vf)) { state.last = null; state.care = null; state.unsafe = true; return meant(verbalReply(vf), sp); }
      var ft = !DANGER.test(vf) && !state.unsafe && funTurn(state, vf);
      if (ft) return ft;
      var cvf = norm(q), cv = !DANGER.test(cvf) && !HIDE.test(cvf) && convoTurn(state, cvf);
      if (cv) return meant(cv, sp);
      // a question about one of the thirteen fields, or two of them, gets that field's (or pair's) own answer, not the overview
      var nf0 = norm(q), nq0 = KB && KB.nine && !DANGER.test(nf0) && nineQuery(nf0), nr0 = nq0 && nineReply(state, nq0);
      if (nr0) return meant(nr0, sp);
      var aq0 = KB && !DANGER.test(nf0) && artQuery(state, nf0), ar0 = aq0 && artReply(state, aq0);
      if (ar0) return meant(ar0, sp);
      var cf = careFirst(state, q);
      if (cf) return meant(cf, sp);
      var sf = norm(q);
      if (!state.unsafe && !DANGER.test(sf) && !VERBAL.test(sf) && !SELF_HARMFUL.test(sf) && !NOT_LIVE.test(sf) && !FUN_UPSET.test(sf) && sf.split(' ').length <= 12) {
        var sit0 = detectSituation(sf), card0 = matchCard(sf);
        if (!(sit0.issue && sit0.score >= 3) && !card0) { var stt = smallTalk(state, q, sf); if (stt) return stt; }
      }
    }
    var f = norm(q), prevLast = state.last;
    var r = respond1(state, q, chipDoc);
    if (r && r.needBG) return r;
    // nothing here is a word I know ("asdfgh"): say so kindly, rather than "outside my little pond"
    if (sp && r && (r.kind === 'offtopic' || r.kind === 'none') && sp.unknown && !sp.known) return unclearReply();
    r = meant(r, sp);
    // an in-scope message that found nothing (a short, feeling-led one, or a follow-up in its own words):
    // stay with the last topic, or ask a warm clarifying question, rather than "outside my little pond"
    if (chipDoc == null && r && /^(offtopic|none|clarify|unclear)$|^$/.test(r.kind || '') && !FUN_UPSET.test(f) && !DANGER.test(f)) {
      var ack = stAck(state, f);
      if (ack) return ack;
    }
    if (chipDoc == null && r && (r.kind === 'offtopic' || r.kind === 'none') && !OFF_TOPIC.test(f)) {
      var alt = contextReply(state, prevLast, f) || softClarify(state, f);
      if (alt) return meant(alt, sp);
    }
    return r;
  }
  // Once someone has told us about control or danger, later questions in the same chat never get couples tips
  // ("you're on the same side", talk it through calmly, conflict is normal): those could put them at risk.
  var AFTER_SAFE = /\b(he|him|his|she|her|they|them|partner|boyfriend|girlfriend|husband|wife|bf|gf|normal|overreact\w*|too sensitive|my fault|talk to|talk with|stop|friends?|money|phone|argue|argument|fight\w*|calm|leave|stay|love|counts?|is it|am i|what do i do|how do i)\b/;
  function afterSafeReply(f) {
    var b = [{ k: 'p', x: 'Because of what you told me earlier, I won’t suggest ways to talk them round or keep the peace. When someone is checking, limiting or frightening you, that isn’t a communication problem, and it isn’t yours to fix by saying things better.' }];
    if (/\b(normal|overreact\w*|too sensitive|counts?|is it (that )?bad|am i (being )?(dramatic|silly|crazy))\b/.test(f)) b.push({ k: 'p', x: 'What you described isn’t a normal part of disagreeing, and you’re not overreacting by asking about it. You don’t need to be hit for it to count.' });
    b.push({ k: 'p', x: 'An advocate can listen and help you think it through privately, even if you’re not sure it counts. In the US: call 1-800-799-7233, or text START to 88788 (National Domestic Violence Hotline), any time. Outside the US, findahelpline.com lists free lines. If you’re in danger right now, call 911 or your local emergency number.' });
    b.push({ k: 'links', x: [['Not safe at home? Hotlines, leaving this site quickly, and clearing what it keeps', '/safety.html']] });
    return { blocks: b, chips: [{ label: 'How do I clear this chat?', q: 'how do i clear my history' }, { label: 'Something else', q: 'Start over' }], kind: 'safety' };
  }
  // Someone worried about THEIR OWN behaviour ("am I an abuser?", "is yelling at kids abuse?", "I scared my son"):
  // an honest line between yelling and abuse, real help for them, and no victim script or locked safety mode.
  var SELF_HARMFUL = /\b(am i|i m|im|i am|i might be|i think i m|i think im|worried i m|worried im|scared i m|scared im|afraid i m|afraid im|could i be|maybe i m|maybe im)\b.{0,12}\b(an |the |a )?(abuser|abusive( one)?|toxic( one)?|the problem|emotionally abusive|a bad (dad|father|mom|mum|mother|parent|husband|wife|partner))\b|\bis (it|yelling|shouting|screaming|losing my temper)\b.{0,30}\b(abuse|abusive)\b|\bi (scared|frightened|terrified) my (son|daughter|kid|kids|child|children|wife|husband|partner|family)\b|\bmy (son|daughter|kid|child|wife|husband|partner)\b.{0,20}\b(flinch\w*|is scared of me|is afraid of me|was scared of me|cowered)\b/;
  function selfHarmfulReply(f) {
    var hurt = /\b(hit|hits|slap\w*|punch\w*|shov\w*|push\w*|grab\w*|threat\w*|kick\w*|choke\w*|throw|threw)\b/.test(f);
    var b = [{ k: 'p', x: 'It took courage to ask that, and asking it usually means you want to do better. Here’s an honest answer.' },
      { k: 'p', x: 'Yelling now and then, followed by a real repair, is not the same as abuse. It becomes a safety issue if your family is afraid of you, if it comes with threats, name-calling, breaking or throwing things, or control, or if it happens most days. If someone flinched or went quiet around you, take that seriously: not as a verdict on you, but as a sign to get support now.' }];
    if (hurt) b.push({ k: 'p', x: 'If you have hit, shoved, grabbed or threatened anyone, that is abuse, and it’s important to get help today. In the US the National Domestic Violence Hotline (1-800-799-7233) also talks with people who are worried about their own behaviour. If anyone is in danger right now, call 911 or your local emergency number.' });
    b.push({ k: 'list', x: ['In the moment: stop, step back, say “I’m getting too loud, I’m going to take a breath,” and breathe for a minute.',
      'Afterwards, repair: “I scared you when I yelled. That wasn’t okay, and it wasn’t your fault.” Then say what you’ll do differently.',
      'Get support for yourself: your doctor, an Employee Assistance Program, or a counsellor or anger-management group. That’s a strong thing to do for your family.',
      'Write your triggers and first warning signs in the Calm-Down Kit, so you can catch it earlier.'] });
    b.push({ k: 'links', x: [['Is yelling abuse? (and getting help for your anger)', '/parents.html#is-yelling-abuse'], ['When it’s you and your child: four steps', '/upset-right-now.html#parent-child'], ['The Calm-Down Kit', '/workpapers/fill/wp-11.html']] });
    return { blocks: b, chips: [{ label: 'How do I apologise?', q: 'how do i apologize to my family for yelling' }, { label: 'Getting help for my anger', q: 'where can i find help for my anger' }], kind: 'care' };
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
    var R = P.rules || {}, k = r.kind || 'search', f = norm(q);
    // after anything serious, stay plain: for good after safety, and after care or someone's situation until a light topic
    if (/^(safety|redflag)$/.test(k) || state.unsafe) { state.plain = 2; return r; }
    if (/^(care|care-more|sit|sit-more|road|road-more|nohelp|calc|lang)$/.test(k)) { state.plain = Math.max(state.plain || 0, 1); return r; }
    if ((R.never_on_kinds || []).indexOf(k) !== -1) return r;
    if (FUN_UPSET.test(f) || DANGER.test(f) || NOT_LIVE.test(f) || SELF_HARMFUL.test(f) || VERBAL.test(f)) return r;
    var txt = JSON.stringify(r.blocks);
    if (/\d{3}[- ]\d{3}[- ]\d{4}|\b0\d{3} ?\d{3} ?\d{3,4}\b|\b(988|911|999|116 ?123)\b|\/safety\.html/.test(txt)) return r;
    var card = (k === 'card' || k === 'card-more') && r.id ? cardById(r.id) : null;
    var light = card ? (card.kind === 'tool' || (R.light_card_ids || []).indexOf(card.id) !== -1) : false;
    if (light || k === 'thanks' || k === 'fun') { if (state.plain === 1) state.plain = 0; }
    if (state.plain) return r;
    if (card && !light) return r;
    var quiet = quietOn() || state.easy || state.brief;
    var sec = (R.section_for_kind || {})[k];
    var openerOk = !quiet && (light || (R.opener_kinds || []).indexOf(k) !== -1 || k === 'fun');
    var closerOk = light || (R.closer_only_kinds || []).indexOf(k) !== -1 || (R.opener_kinds || []).indexOf(k) !== -1;
    // the kinds with their own voice: "thanks", nothing found, a choice to make
    if (sec && !quiet) {
      var line0 = funLine(state, sec);
      if (!line0) return r;
      var b0 = r.blocks[0];
      if (k === 'thanks' && b0.k === 'p') b0.x = line0;
      else if ((k === 'none' || k === 'offtopic' || k === 'unclear') && b0.k === 'p') {
        var tail = b0.x.match(/(You could tell me[\s\S]*|I stick to this program[\s\S]*|Could you say it another way[\s\S]*)$/);
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
  function nameFrom(q) {
    var m = NAME_SAY.exec(String(q).trim()); if (!m) return '';
    var w = m[1], lw = w.toLowerCase(), named = /my name|call me/i.test(q);
    // "I'm tired" is a feeling, not a name: unless they said "my name is", the word must look like a name (a capital, not a known word)
    if (!named && (w.charAt(0) !== w.charAt(0).toUpperCase() || STOP[lw] || ROLE[stem(lw)] || (IDX && IDX.vocab[lw]) || english(lw) || FEELS.some(function (x) { return x[0].test(lw); }))) return '';
    if (STOP[lw] || /^(not|so|very|just|fine|good|ok|okay|here|back|sorry|tired|sad|bored|new|done|ready|lost|stuck|confused)$/.test(lw)) return '';
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }
  var JUST_CHAT = /^(lets|let s|can we|could we|i (just )?want to|i d like to|id like to)? ?(just )?(chat|talk|have a chat|have a natter|chit ?chat|hang out)( for a bit| for a while| with you| a bit)?( please)?$|^just chat$/;
  function stPrompt(state) {
    var S = KB.pers && KB.pers.smalltalk, list = S && S.chat_prompts ? S.chat_prompts : [];
    if (!list.length) return '';
    var seen = state.funSeen || (state.funSeen = []), fresh = list.filter(function (x) { return seen.indexOf(x) === -1; });
    if (!fresh.length) fresh = list;
    var x = fresh[Math.floor(frand(state) * fresh.length) % fresh.length]; seen.push(x);
    return nameFill(x, chatName(state));
  }
  function smallTalk(state, q, f) {
    var P = KB && KB.pers, S = P && P.smalltalk;
    var fq = String(q).toLowerCase().replace(/[’‘`´]/g, "'").trim();
    var nm = nameFrom(q);
    if (nm) { state.name = nm; try { sessionStorage.setItem('tol-chat-name', nm); } catch (e) {} }
    var hit = null;
    if (S && S.intents) for (var i = 0; i < S.intents.length && !hit; i++) {
      var it = S.intents[i];
      (it.patterns || []).some(function (src) {
        var re = it._re && it._re[src]; if (!re) { try { re = new RegExp(src, 'i'); } catch (e) { re = /$^/; } (it._re = it._re || {})[src] = re; }
        if (re.test(f) || re.test(fq)) { hit = it; return true; } return false;
      });
    }
    if (!hit && !nm && !JUST_CHAT.test(f)) return null;
    var name = chatName(state), b = [], chips = [];
    if (hit && hit.replies && hit.replies.length) {
      var rl = hit.replies.filter(function (x) { return (state.funSeen || []).indexOf(x) === -1; }); if (!rl.length) rl = hit.replies;
      var line = rl[Math.floor(frand(state) * rl.length) % rl.length]; (state.funSeen = state.funSeen || []).push(line);
      b.push({ k: 'p', x: nameFill(line, name) });
      (hit.chips || []).forEach(function (c) { if (Array.isArray(c)) chips.push({ label: c[0], q: c[1] || c[0] }); else if (c && c.label) chips.push({ label: c.label, q: c.q || c.label }); else if (typeof c === 'string') chips.push({ label: c, q: c }); });
    } else if (nm) b.push({ k: 'p', x: 'Lovely to meet you, ' + nm + '! I’ll remember your name while this tab is open (it never leaves your device).' });
    else b.push({ k: 'p', x: 'I’d love that. A professor needs a break from lecturing now and then.' });
    // keep a casual chat going: sometimes ask one of the chat prompts back
    var askBack = (!hit || JUST_CHAT.test(f) || frand(state) < 0.5) && stPrompt(state);
    if (askBack) { b.push({ k: 'p', x: askBack }); state.stAsk = state.turn || 0; }
    if (!chips.length) chips = [{ label: 'Tell me a joke', q: 'Tell me a joke' }, { label: 'Ask about the site', q: 'What can I ask?' }];
    state.last = null;
    return { blocks: b, chips: chips.slice(0, 3), kind: 'chat', fun: 1 };
  }
  // a short answer to the question Puddles just asked back: a warm reply in character, not "I couldn't find that"
  function stAck(state, f) {
    var S = KB && KB.pers && KB.pers.smalltalk;
    if (state.stAsk == null || state.stAsk !== (state.turn || 0) - 1 || f.split(' ').length > 14) return null;
    // a real question after the chat prompt is answered as a question
    if (/^(what|whats|how|hows|why|where|when|which|who|can|could|should|is|are|do|does|tell me|explain|help)\b/.test(f) && f.split(' ').length > 3) return null;
    var acks = (S && (S.acks || S.acknowledgements)) || [];
    var a = acks.length ? acks[Math.floor(frand(state) * acks.length) % acks.length] : pick(['Ooh, I like that. Thank you for telling me.', 'That’s lovely. I’m writing it in my waterproof notebook.', 'Ha, wonderful. You’ve made my pond a little brighter.']);
    var b = [{ k: 'p', x: nameFill(a, chatName(state)) }];
    var nx = frand(state) < 0.6 && stPrompt(state);
    if (nx) { b.push({ k: 'p', x: nx }); state.stAsk = state.turn || 0; } else state.stAsk = null;
    return { blocks: b, chips: [{ label: 'Tell me a joke', q: 'Tell me a joke' }, { label: 'Ask about the site', q: 'What can I ask?' }], kind: 'chat', fun: 1 };
  }
  function respond1(state, q, chipDoc) {
    var f = norm(q), prevLast = state.last;
    if (chipDoc == null && SELF_HARMFUL.test(f) && !/\b(he|she|they|my (husband|wife|partner|boyfriend|girlfriend|ex|dad|mum|mom|father|mother|stepdad|stepmom)) (says|said|calls|called|tells|told) (me )?(i m|im|i am)\b/.test(f)) { state.last = null; state.unsafe = false; return selfHarmfulReply(f); }
    if (chipDoc == null && CV_RESTART.test(f)) state.unsafe = false;
    if (chipDoc == null && state.unsafe && !DANGER.test(f) && !HIDE.test(f) && AFTER_SAFE.test(f)) { state.last = null; return afterSafeReply(f); }
    if (chipDoc == null) {
      if (DANGER.test(f)) {
        state.last = null;
        if (!(PARENT_PHONE.test(f) && !HARD.test(f)) && !OTHER_HARM.test(f) && !NOT_LIVE.test(f)) state.unsafe = true;
        if (OTHER_HARM.test(f) && !/\b(i|me|my ?self)\b.{0,20}\b(cut|hurt|harm|kill|die)\b/.test(f)) return otherHarmReply();
        var pc = PARENT_PHONE.test(f) && !HARD.test(f) && cardByIdF('parentphone');
        if (pc) { var rp = cardReply(state, pc, 'about'); rp.kind = 'care'; return rp; }
        return CONTROL.test(f) && !HARD.test(f) ? controlReply() : safetyReply(f);
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
      if (tf && (!tc || (tf.own && termKey(String(tc.name || '').split(',')[0]) !== termKey(tf.t.t)))) return termReply(state, tf.t, tq.noEx);
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
        if (cl.re.test(f)) { state.last = null; return { blocks: [{ k: 'p', x: cl.x }], chips: cl.chips.map(function (c) { return { label: c[0], q: c[1] }; }), kind: 'clarify', amb: 1 }; }
      }
      var sit = detectSituation(f);
      // "he", "she", "they" after a playbook about someone: the same person, unless someone new is named
      if (prevLast && prevLast.kind === 'sit' && sit.pronoun && (!sit.who || sit.who === 'other') && prevLast.who && prevLast.who !== 'self' && prevLast.who !== 'other') {
        sit.who = prevLast.who; sit.noun = prevLast.noun;
        if (sit.issue && IDX.sit.issues[sit.issue].only && IDX.sit.issues[sit.issue].only.indexOf(sit.who) === -1) sit.who = 'other';
      }
      if (!sit.personal && /^(is it|its|it is|is that|isnt it) (normal|ok|okay|common|natural|wrong|bad|weird|fine|unusual) to\b|\b(feel|feeling|felt)\b/.test(f)) sit.personal = true;
      // "the group chat is dead", "how should roommates split chores": a clear situation, even without "I" or "my"
      if (!sit.personal && sit.issue && !defn && (sit.score >= 5 || (sit.score >= 2 && sit.who && sit.who !== 'self' && sit.who !== 'other' && /^(how|what|why|should|do|does|can)\b/.test(f)))) sit.personal = true;
      var card = matchCard(f);
      var asksAbout = /^(what|whats|how|hows|where|which|when|why|is|are|does|do|can|could|should|tell me|explain|show me|define|who)\b/.test(f) && !/\b(when|if) (my|our|i|we|he|she|they)\b|\b(my|our) (partner|husband|wife|boyfriend|girlfriend|spouse|roommates?|housemates?|coworkers?|colleagues?|boss|manager|team|sister|brother|mom|mum|dad|mother|father|parents?|kids?|son|daughter|teen|teenager|friends?|ex)\b.*\b(keeps?|always|never|wont|doesnt|wont|wants?|says?|makes?|leaves?|forgets?)\b/.test(f);
      var road = /\b(path|road|which (tools?|workpapers?|pages?)|what (tools?|workpapers?|pages?)|where (do|should|can) (we|i) (start|begin)|start with|best tool|good tool|tool for|tools for)\b/.test(f);
      if (road && sit.who && sit.who !== 'self' && sit.who !== 'other' && !card && (!sit.issue || sit.score < 3 || /^(which|what|where)\b/.test(f))) return roadReply(state, sit.who, sit.noun);
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
          'Ask “what is…” about any term, and say “tell me more” or “give me an example” to keep going.'] },
        { k: 'p', x: 'When the site doesn’t cover something, I have some background notes, and I’ll always say when an answer comes from them. I’m not a counselor, and I won’t guess. Everything happens in your browser: what you type stays on this device.' }],
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
      if (!/^(another|tell me more|more|surprise me|give me a tip|another tip)/.test(cq) && recent.indexOf(cq) !== -1) return false;
      if (c.doc != null && /[.!]$/.test(c.label) && !/\?$/.test(c.label)) return false;
      return true;
    });
    return r;
  }

  // One message in, one reply out; fetches the background notes first when an answer needs them.
  function reply(state, q, doc, cb0) {
    var r;
    function cb(x) { x = tidy(state, q, x); if (state.brief) x = briefen(state, x); if (state.easy && x && x.kind !== 'safety') x = easySwap(x); x = flair(state, q, x); if (x) { state.lastKind = x.kind || 'search'; if (x.fun && x.kind !== 'thanks' && !quietOn() && frand(state) < 0.5) x.think = funLine(state, 'thinking'); } cb0(x); }
    function safe(fn) {
      try { return fn(); }
      catch (e) { if (window.console && console.error) console.error(e); return { blocks: [{ k: 'p', x: 'Sorry, something went wrong on my side. Could you try asking another way?' }], chips: STARTERS }; }
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
    // Larger text zooms the page body: keep the whole panel (and its Leave quickly button) on screen
    'html.tol-text-lg:not(.tol-nozoom) .tolc.is-modal{max-height:calc(100vh / 1.15 - 12px);max-height:calc(100dvh / 1.15 - 12px)}',
    'html.tol-text-xl:not(.tol-nozoom) .tolc.is-modal{max-height:calc(100vh / 1.35 - 12px);max-height:calc(100dvh / 1.35 - 12px)}',
    '.tolc-hbtn{white-space:nowrap;flex:0 0 auto;min-width:44px;min-height:44px;border:0;background:none;border-radius:12px;color:var(--ink-soft);font:inherit;font-size:.85rem;cursor:pointer;padding:0 .55rem}',
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
    '.tolc-arts{list-style:none;margin:.3rem 0 .6rem;padding:0;display:grid;gap:.45rem}.tolc-arts li{padding:.55rem .7rem;border-radius:12px;background:rgba(127,178,224,.12);border:1px solid rgba(127,178,224,.35)}.tolc-arts a{font-weight:700;line-height:1.3}.tolc-arts p{margin:.25rem 0 0;font-size:.9rem;line-height:1.4}',
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
      '<div class="tolc-head"><div class="tolc-av"></div><div class="tolc-who"><p class="tolc-name" id="' + uid + '-name"></p><p class="tolc-sub" title="Your guide to the whole program">Program guide</p></div>' +
      '<div class="tolc-hbtns"><button type="button" class="tolc-hbtn tolc-reset">Start over</button>' +
      '<button type="button" class="tolc-hbtn tolc-leave" data-tol-exit title="Leave this site quickly">Leave quickly</button>' +
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
        me.say(r.blocks, r.chips, REDUCED ? 250 : Math.min(1300, 450 + len * 6), r.think);
      });
    });
  };

  Chat.prototype.greet = function (text) {
    this.say([{ k: 'p', x: text }], GREET_CHIPS, REDUCED ? 150 : 450);
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
    if (!this.started) {
      this.started = true;
      var me = this;
      this.msgs.forEach(function (m) { me.render(m, false); });
      if (this.msgs.length) { this.setChips(STARTERS.slice(0, 3)); this.scrollTo(); }
    }
    if (!this.msgs.length || (changed && opts.greeting)) this.greet(this.char.greeting);
    var topic = typeof opts.topic === 'string' ? opts.topic.trim().slice(0, 300) : '';
    if (topic && !(lastUser && lastUser.x === topic)) this.ask(topic);
    loadKB(function () {});
  };

  Chat.prototype.reset = function () {
    this.msgs = []; save(this.msgs); this.state.last = null; this.state.lastReply = null; this.state.recent = [];
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
