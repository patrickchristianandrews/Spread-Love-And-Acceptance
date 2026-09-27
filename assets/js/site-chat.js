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
  var STORE_KEY = 'tol-chat-v1';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PRIVACY_LINE = 'Answers come only from this site’s pages. What you type stays on this device.';

  var DEFAULT_CHAR = {
    name: 'Professor Puddles',
    color: '#7FA88A',
    greeting: 'Hi, I’m Professor Puddles! Ask me about anything on this site, like the book, the workpapers, check-ins, different wiring or ways to calm down, and I’ll share what the pages say, with a link to read more.'
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
    IDX = { N: N, df: df, tf: tf, len: len, head: head, avg: total / N, syn: syn, gloss: gloss, domain: domain };
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
    { label: 'Surprise me', q: 'Surprise me' }
  ];

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


  // Decide what to say to one message. Returns {blocks:[...], chips:[...]} (all data, rendered later).
  function respond(state, q, chipDoc) {
    var f = fold(q).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
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
        { k: 'p', x: 'I’m a small helper that looks things up in this site’s own pages: the book, the workpapers, the guides and the glossary. I share the most relevant passages, with a link so you can read the whole thing.' },
        { k: 'p', x: 'I don’t make things up and I’m not a counselor, so if the pages don’t cover something, I’ll say so. Everything happens in your browser. What you type stays on this device.' }],
        chips: STARTERS };
    if (/\b(surprise me|random|anything interesting|tell me something|teach me something|something new|inspire me)\b/.test(f)) return surprise(state);
    if (/^(give me |got |share )?(a |another |one )?(little |quick |small )?(tip|tips)( please)?( for today)?$/.test(f)) return tip(state);
    var moreQ = /^(tell me )?(more|some more|more please|go on|continue|keep going|and|another|next|what else|anything else|say more|more on that|more about (that|this|it)|and then|then what|why|how so|like what|such as|example|an example|give me an example)$/.test(f);
    var about = f.match(/^(?:tell me more|more) (?:about|on) (.+)$/);
    if (about && !/^(that|this|it)$/.test(about[1])) { q = about[1]; f = about[1]; }
    else if (moreQ) return more(state);

    var prefer = null;
    for (var r = 0; r < REWRITES.length; r++) if (REWRITES[r][0].test(f)) { q = REWRITES[r][1]; prefer = REWRITES[r][2]; f = fold(q); break; }
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
    var offTopic = gi < 0 && !prefer && wAll > 0 && wAway * 2 >= wAll;
    var weak = offTopic || !top || top.cov < 0.42 || top.s < 2.2;
    state.last = { q: q, res: { hits: hits, terms: res.terms }, shown: {} };
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
      return { blocks: [{ k: 'p', x: pick(['I looked through the site’s pages and couldn’t find anything that really answers that.', 'I’m sorry, I couldn’t find that in the site’s pages.', 'That one isn’t covered on this site, as far as I can find.']) +
        ' I can only share what’s written here, so I’d rather not guess. Here are some things I can help with:' }],
        chips: STARTERS };
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
    var hits = L.res.hits.filter(function (h) { return !L.shown[h.i] && h.cov >= 0.45; });
    if (!hits.length) return { blocks: [{ k: 'p', x: 'That’s all I could find on that. Want to try something else?' }], chips: STARTERS.slice(0, 3) };
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
      '<div class="tolc-head"><div class="tolc-av"></div><div class="tolc-who"><p class="tolc-name" id="' + uid + '-name"></p><p class="tolc-sub">Answers from this site’s pages</p></div>' +
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
      var r;
      try { r = respond(me.state, text, doc); }
      catch (e) { r = { blocks: [{ k: 'p', x: 'Sorry, something went wrong on my side. Could you try asking another way?' }], chips: STARTERS }; }
      var len = r.blocks.reduce(function (n, b) { return n + wc(b.x && b.x.join ? b.x.join(' ') : b.x || ''); }, 0);
      me.say(r.blocks, r.chips, REDUCED ? 250 : Math.min(1300, 450 + len * 6));
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
    _ask: function (q, cb) { loadKB(function () { cb(respond({ last: null }, q)); }); },
    _search: function (q, cb) { loadKB(function () { cb(search(q).hits.slice(0, 6).map(function (h) { return [KB.docs[h.i].h, +h.s.toFixed(2), +h.cov.toFixed(2)]; })); }); }
  };
  api._debug = function (q) { return { tokens: tokens(q), top: search(q).hits.slice(0, 3).map(function (h) { return [KB.docs[h.i].h, +h.s.toFixed(2), +h.cov.toFixed(2)]; }), terms: search(q).terms }; };
  window.TOLChat = api;

  function hook() { if (/[?&]chat=1(&|$)/.test(location.search)) api.open(); }
  if (document.readyState === 'complete') setTimeout(hook, 0); else window.addEventListener('load', hook);  // after any inline mount
})();
