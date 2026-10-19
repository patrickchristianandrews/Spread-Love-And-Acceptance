/* logic-lens.js: "The logic behind it" (logic13), the tools on /the-logic-behind-it.html.
   Needs assets/js/logic-library.js (window.TOLLogic) loaded first.

   <div data-logic-find></div>   "Find the logic": pick a kind of situation, or type what happened. What you type is
                                 matched against the library the way the site search matches needs (search11): filler
                                 words dropped, plurals and endings folded, words that mean the same thing joined, and
                                 a word a letter or two off read as the nearest word the library uses. The best one or
                                 two worked situations show as cards with all six parts, and "Show me another analogy"
                                 cycles through each card's analogies.
   <div data-logic-build></div>  "Build your own": the six parts with prompts and analogy suggestions, made into a card
                                 to share (share-kit), save as a picture, copy, or keep in My saved entries when the
                                 device keeps them (TOLProgress.perks()).
   Links: ?item=<id> opens that situation's card; ?q=<words> fills the box and finds it; #l-<id> opens it in the list.
   Nothing typed here is stored or sent anywhere. No storage keys of its own (a saved card goes into tol-entries-v1
   through TOLProgress, only when the person presses Save). */
(function () {
  'use strict';
  var W = window, D = document;
  var LIB = W.TOLLogic;
  if (!LIB || !LIB.items) return;
  var ITEMS = LIB.items, CATS = LIB.cats, SIDES = LIB.sides;
  var BY = {}; ITEMS.forEach(function (it) { BY[it.id] = it; });
  var CATNAME = {}; CATS.forEach(function (c) { CATNAME[c.id] = c.name; });
  var PAGE = '/the-logic-behind-it.html';

  // ---------------------------------------------------------------- small helpers
  function mk(tag, attrs, kids) {
    var e = D.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k]; if (v == null || v === false) return;
      if (k === 'text') e.textContent = v; else if (k === 'cls') e.className = v; else if (k === 'on') Object.keys(v).forEach(function (ev) { e.addEventListener(ev, v[ev]); });
      else e.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c == null) return; e.appendChild(typeof c === 'string' ? D.createTextNode(c) : c); });
    return e;
  }
  function btn(label, cls, fn, attrs) { var a = attrs || {}; a.type = 'button'; a.cls = 'lg-btn' + (cls ? ' ' + cls : ''); a.text = label; a.on = { click: fn }; return mk('button', a); }
  function fold(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘`]/g, "'").replace(/[“”]/g, '"'); }
  function unq(s) { return String(s || '').replace(/^[“"]|[”"]$/g, ''); }

  // ---------------------------------------------------------------- matching (the site search's needs approach)
  var STOP = {};
  ('a an the and or but so to of in on at by for with from into about as is it its be been am are was were do does did done have has had having ' +
   'i im ive id me my mine myself we us our ours you your yours he him his she her hers they them their theirs this that these those there here ' +
   'what how why when where which can could would should will shall may might must just really very quite too also still even ever ' +
   'get got gets getting keep keeps kept one some any all each every much many more most lot lots thing things stuff something anything ' +
   'dont doesnt didnt cant cannot wont isnt arent wasnt werent havent hasnt hadnt wouldnt couldnt shouldnt aint not no ' +
   'youre theyre hes shes thats whats theres lets ok okay please like liked likes liking want need ' +
   'someone somebody person people react reacted reacts reaction reactions act acted acting behave behaves behaved behaviour behavior ' +
   'always never again every time times then than if because cause did does make makes made seem seems seemed think thinks thought ' +
   'explain understand logic behind sense mean means meant go goes going gone went').split(' ').forEach(function (w) { STOP[w] = 1; });
  // phrases that read as one idea
  var MULTI = [
    ['small talk', 'smalltalk'], ['chit chat', 'smalltalk'], ['eye contact', 'eyecontact'], ['road rage', 'roadrage'], ['white lies', 'whitelie'], ['white lie', 'whitelie'],
    ['last minute', 'lastminute'], ['last-minute', 'lastminute'], ['shut down', 'shutdown'], ['shuts down', 'shutdown'], ['shutting down', 'shutdown'],
    ['melt down', 'meltdown'], ['lost it', 'meltdown'], ['silent treatment', 'quiet'], ['how are you', 'howareyou'], ['i love you', 'iloveyou'],
    ["i'm fine", 'imfine'], ['im fine', 'imfine'], ['on time', 'ontime'], ['full stop', 'fullstop'], ['special interest', 'interest'], ['non verbal', 'quiet'],
    ['non-verbal', 'quiet'], ['said no', 'refuse'], ['say no', 'refuse'], ['saying no', 'refuse'], ['say goodbye', 'goodbye'], ['saying goodbye', 'goodbye'],
    ['in laws', 'parent'], ['in-laws', 'parent'], ['mother in law', 'parent'], ['father in law', 'parent'], ['tell me off', 'criticise'], ['told off', 'criticise']
  ].map(function (m) { return [new RegExp('(^|[^a-z0-9])' + m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-z0-9])', 'g'), '$1' + m[1]]; });
  // words that mean the same thing: the first word is the one they all become
  var SYN = {}, SYNG = [
    'quiet silent silence mute nonverbal stonewall stonewalls stonewalling withdrawn withdraws',
    'angry mad cross furious annoyed irritable grumpy cranky snappy irritated',
    'snap snapped snaps snapping shout shouted shouts shouting yell yelled yells yelling scream screamed screams screaming',
    'leave left leaves leaving exit exited bail bailed bails disappear disappeared snuck sneak sneaked',
    'party wedding gathering bbq barbecue celebration do',
    'cancel cancelled canceled cancels cancelling canceling flake flaked flakes flaky',
    'tired exhausted drained knackered wiped shattered sleepy worn fatigued',
    'hungry hangry starving',
    'hug hugs hugged hugging cuddle cuddles touch touched touching kiss',
    'noise noisy loud sound sounds noises',
    'plan plans arrangement arrangements schedule',
    'change changed changes changing switch switched',
    'rude blunt harsh direct abrupt curt cold brutal rudeness tactless',
    'lie lies lying lied fib fibbing pretend pretended pretending fake',
    'hint hints hinting hinted',
    'feeling feelings emotion emotions emotional',
    'cry crying cried tears',
    'meltdown meltdowns tantrum tantrums explode exploded explodes freak freaked',
    'shutdown frozen freeze froze freezes',
    'interest obsession obsessed hobby hobbies',
    'talk talking talks chat chatting conversation conversations speak speaking',
    'phone call calls calling ring rang',
    'text texts texting message messages messaging whatsapp email emails reply replies',
    'drive driving driver drivers drives road tailgate tailgating tailgater tailgated horn honk honked honks beep beeped motorway roadrage',
    'tip tips tipping tipped',
    'food eat eats eating meal meals',
    'sorry apologise apologize apologises apologizes apologising apologizing apology apologies',
    'teen teenager teenage teens',
    'kid kids child children son daughter',
    'work job office colleague colleagues coworker coworkers boss manager team',
    'school teacher class homework',
    'eye eyes',
    'partner husband wife boyfriend girlfriend spouse bf gf',
    'parent parents mum mom mother dad father grandparents grandparent grandma grandad nan',
    'goodbye goodbyes bye',
    'criticise criticize criticism criticised criticized critic feedback',
    'refuse refused refuses decline declined turned',
    'gift gifts present presents',
    'jumper jumpers sweater sweaters cardigan cardigans pullover',
    'honest honestly honesty truth truthful truthfully',
    'forget forgot forgets forgetting forgotten forgetful',
    'correct corrected corrects correcting correction corrections',
    'late lateness',
    'argue argument arguments arguing argued fight fights fighting row rows',
    'upset hurt sad distressed'
  ];
  SYNG.forEach(function (g) { var w = g.split(' '); w.forEach(function (x) { SYN[x] = w[0]; }); });
  function stem(w) {
    w = w.replace(/'s$/, '').replace(/'/g, '');
    if (w.length > 5 && /ies$/.test(w)) w = w.slice(0, -3) + 'y';
    else if (w.length > 5 && /ing$/.test(w)) w = w.slice(0, -3);
    else if (w.length > 4 && /ed$/.test(w)) w = w.slice(0, -2);
    else if (w.length > 4 && /(ches|shes|sses|xes|zes)$/.test(w)) w = w.slice(0, -2);
    else if (w.length > 3 && /s$/.test(w) && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);
    if (w.length > 4 && /([b-df-hj-np-tv-z])\1$/.test(w) && !/(ll|ss|ff|zz)$/.test(w)) w = w.slice(0, -1);
    if (w.length > 4 && /e$/.test(w)) w = w.slice(0, -1);
    return w;
  }
  function canon(w) { var r = SYN[w] || SYN[w.replace(/'/g, '')]; return r || stem(w); }
  var P = null;   // prepared index
  function tokens(q, fz) {
    var f = ' ' + fold(q).replace(/[¿?¡!.,;:()"“”«»\/]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
    MULTI.forEach(function (m) { f = f.replace(m[0], m[1]); });
    var out = [], seen = {};
    f.split(/[^a-z0-9'-]+/).forEach(function (w) {
      w = w.replace(/^['-]+|['-]+$/g, '');
      if (!w || STOP[w] || STOP[w.replace(/'/g, '')] || w.length < 2) return;
      var c = canon(w);
      if (fz && P && !P.df[c]) { var n = near(w); if (n) { c = n; fz[c] = 1; } }
      if (c && !seen[c]) { seen[c] = 1; out.push(c); }
    });
    return out;
  }
  function editDist(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (j = 0; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) {
      var best = 1e9;
      for (j = 1; j <= b.length; j++) {
        var c = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        if (d[i][j] < best) best = d[i][j];
      }
      if (best > max) return max + 1;
    }
    return d[a.length][b.length];
  }
  // a word the library doesn't use: the nearest one it does, a letter or two off ("tailgatting", "meltdwon")
  function near(t) {
    t = t.replace(/'/g, ''); if (t.length < 4 || /\d/.test(t)) return null;
    var max = t.length <= 6 ? 1 : 2, best = null, bd = 9;
    P.rawList.forEach(function (v) {
      if (Math.abs(v.length - t.length) > max) return;
      var dd = editDist(t, v, max);
      if (dd <= max && (dd < bd || (dd === bd && (P.df[P.raw[v]] || 0) > (P.df[P.raw[best]] || 0)))) { bd = dd; best = v; }
    });
    return best ? P.raw[best] : null;
  }
  function prep() {
    if (P) return P;
    P = { df: {}, raw: {}, N: ITEMS.length };
    ITEMS.forEach(function (it) {
      var bag = {};
      var src = (it.s || []).concat([it.t, it.looks]);
      it._p = src.map(function (s, i) {
        fold(s).split(/[^a-z0-9'-]+/).forEach(function (w) { w = w.replace(/'/g, ''); if (w.length > 3 && !STOP[w]) P.raw[w] = canon(w); });
        var t = tokens(s); t.forEach(function (x) { bag[x] = 1; });
        return { t: t, w: i < (it.s || []).length ? 1 : 0.8 };
      });
      it._bag = bag;
      Object.keys(bag).forEach(function (t) { P.df[t] = (P.df[t] || 0) + 1; });
    });
    Object.keys(SYN).forEach(function (v) { if (v.length > 3 && /^[a-z]+$/.test(v)) P.raw[v] = SYN[v]; });
    Object.keys(P.raw).forEach(function (v) { if (!P.df[P.raw[v]]) delete P.raw[v]; });
    P.rawList = Object.keys(P.raw);
    return P;
  }
  function idf(t) { return Math.log(1 + P.N / (P.df[t] || 0.5)); }
  // what someone typed -> { best: [items], close: [items] }
  function match(q) {
    prep();
    var fz = {}, Q = tokens(q, fz);
    if (!Q.length) return { best: [], close: [], tokens: Q, scores: [] };
    var w = {}, qW = 0;
    Q.forEach(function (t) { w[t] = P.df[t] ? idf(t) * (fz[t] ? 0.85 : 1) : 1; qW += w[t]; });
    var scored = ITEMS.map(function (it) {
      var best = 0, bestCov = 0;
      it._p.forEach(function (p) {
        if (!p.t.length) return;
        var m = 0, pW = 0;
        p.t.forEach(function (t) { pW += idf(t); });
        Q.forEach(function (t) { if (p.t.indexOf(t) !== -1) m += w[t]; });
        if (!m) return;
        var covQ = m / qW, covP = Math.min(1, m / pW), s = (0.6 * covQ + 0.4 * covP) * p.w;
        if (s > best) { best = s; bestCov = covQ; }
      });
      var bm = 0; Q.forEach(function (t) { if (it._bag[t]) bm += w[t]; });
      var bagCov = bm / qW;
      return { it: it, score: 0.75 * best + 0.25 * bagCov, covQ: Math.max(bestCov, bagCov * 0.9) };
    }).filter(function (x) { return x.score > 0; }).sort(function (a, b) { return b.score - a.score; });
    var out = [], top = scored[0], near1 = null;
    if (top && top.score >= 0.3 && top.covQ >= 0.34) {
      out.push(top.it);
      var two = scored[1];
      if (two && two.score >= Math.max(0.3, top.score * 0.75) && two.covQ >= 0.34) out.push(two.it);
    }
    // nothing sure enough: still the closest one, shown in full, when it shares a real word with what was typed
    if (!out.length && top && top.score >= 0.2) near1 = top.it;
    return {
      best: out, tokens: Q, nearest: near1,
      close: scored.filter(function (x) { return out.indexOf(x.it) === -1 && x.it !== near1 && x.score >= 0.1; }).slice(0, 3).map(function (x) { return x.it; }),
      scores: scored.slice(0, 5).map(function (x) { return [x.it.id, Math.round(x.score * 100) / 100]; })
    };
  }

  // ---------------------------------------------------------------- the card (all six parts)
  var cardN = 0;
  function cardText(d) {
    var out = [d.t, '', '1. What it looks like from outside: ' + d.looks, '2. The logic: ' + d.chain.filter(Boolean).join(' → '),
      '3. Like this: ' + (d.an[d.ai || 0] || ''), '4. Why it fits: ' + d.fits, '5. The other side: ' + d.other,
      '6. To explain it: ' + unq(d.say) + '\n   One small step: ' + d.step];
    if (d.care) out.push('', 'With care: ' + d.care);
    return out.filter(function (x) { return x != null; }).join('\n');
  }
  function part(n, label, body) {
    return mk('div', { cls: 'lg-part' }, [mk('p', { cls: 'lg-k' }, [mk('span', { cls: 'lg-n', 'aria-hidden': 'true', text: String(n) }), label]), body]);
  }
  // d: an item, or a built card { t, looks, chain, an, fits, other, say, step, mine: true }
  function card(d, opts) {
    opts = opts || {};
    var id = 'lgc' + (++cardN);
    d = Object.assign({}, d); d.ai = 0;
    var an = (d.an || []).filter(Boolean);
    var head = mk('header', { cls: 'lg-card-h' }, [
      mk('p', { cls: 'lg-tag', text: d.mine ? 'Your card' : (SIDES[d.side] || '') + (d.cat ? ' · ' + CATNAME[d.cat] : '') }),
      mk(opts.h || 'h3', { cls: 'lg-card-t', id: id + '-t', tabindex: '-1', text: d.t })
    ]);
    var chain = mk('ol', { cls: 'lg-chain' }, d.chain.filter(Boolean).map(function (c) { return mk('li', { text: c }); }));
    var anP = mk('p', { cls: 'lg-an', 'aria-live': 'polite', text: an[0] || '' });
    var anCount = mk('span', { cls: 'lg-an-n', text: an.length > 1 ? 'Analogy 1 of ' + an.length : '' });
    var anRow = mk('div', { cls: 'lg-an-row' }, [anP]);
    if (an.length > 1) anRow.appendChild(mk('p', { cls: 'lg-an-more' }, [btn('Show me another analogy', 'lg-quiet lg-another', function () {
      d.ai = (d.ai + 1) % an.length; anP.textContent = an[d.ai]; anCount.textContent = 'Analogy ' + (d.ai + 1) + ' of ' + an.length;
    }, { 'aria-describedby': id + '-ann' }), ' ', (anCount.id = id + '-ann', anCount)]));
    var six = mk('div', { cls: 'lg-six' }, [
      mk('p', { cls: 'lg-say', text: unq(d.say) ? '“' + unq(d.say) + '”' : '' }),
      mk('p', { cls: 'lg-step' }, [mk('strong', { text: 'One small step: ' }), d.step || ''])
    ]);
    var c = mk('article', { cls: 'lg-card tol-plain' + (d.mine ? ' is-mine' : ''), 'aria-labelledby': id + '-t', 'data-item': d.id || null }, [
      head,
      part(1, 'What it looks like from outside', mk('p', { text: d.looks })),
      part(2, 'The logic behind it', chain),
      part(3, 'It works like this', anRow),
      part(4, 'Why the reaction fits', mk('p', { text: d.fits })),
      part(5, 'The other side', mk('p', { text: d.other })),
      part(6, 'One sentence to explain it, and one small step', six)
    ]);
    if (d.care) c.appendChild(mk('p', { cls: 'lg-care' }, [mk('strong', { text: 'With care: ' }), d.care]));
    if (d.refs && d.refs.length) c.appendChild(mk('p', { cls: 'lg-refs' }, ['Research: ', mk('a', { href: '/the-logic-behind-it-in-depth.html#research', text: 'what this leans on, and how strong it is' })]));
    var acts = mk('div', { cls: 'lg-acts' });
    var status = mk('p', { cls: 'lg-status', role: 'status' });
    acts.appendChild(btn('Share this card', '', function () { share(d); }));
    acts.appendChild(btn('Copy the words', 'lg-quiet', function () { copy(cardText(d), status); }));
    var K = W.TOLShareKit;
    if (K && typeof K.saveImage === 'function') acts.appendChild(btn('Save as a picture', 'lg-quiet', function () {
      Promise.resolve(K.saveImage({ title: d.t, text: pictureText(d), url: d.mine ? '' : location.origin + PAGE, format: 'square' })).then(function () { status.textContent = 'Picture saved to this device.'; }, function () { status.textContent = 'Couldn’t make the picture here. “Copy the words” still works.'; });
    }));
    if (d.mine) saveRow(acts, d, status);
    if (!d.mine && opts.build !== false) acts.appendChild(btn('Make my own from this', 'lg-quiet', function () { fillBuild(d); }));
    c.appendChild(acts); c.appendChild(status);
    if (!d.mine && d.id) c.appendChild(mk('p', { cls: 'lg-perma' }, [mk('a', { href: PAGE + '?item=' + encodeURIComponent(d.id) + '#find', text: 'Link to this situation' })]));
    return c;
  }
  function pictureText(d) {
    return d.chain.filter(Boolean).join(' → ') + '\n\n' + (d.an[d.ai || 0] || '') + '\n\n' + (unq(d.say) ? '“' + unq(d.say) + '”' : '');
  }
  function share(d) {
    var K = W.TOLShareKit, text = cardText(d);
    var url = d.mine ? false : location.origin + PAGE + '?item=' + encodeURIComponent(d.id) + '#find';
    if (K && K.shareText) { K.shareText({ title: 'The logic behind it: ' + d.t, text: text, url: url, heading: 'Share this card' }); return; }
    if (W.TOLShare && W.TOLShare.open) { W.TOLShare.open({ title: 'The logic behind it: ' + d.t, text: text, url: url || undefined, result: true }); return; }
    if (navigator.share) { navigator.share({ title: d.t, text: text + (url ? '\n' + url : '') }).catch(function () {}); return; }
    copy(text + (url ? '\n' + url : ''));
  }
  function copy(text, status) {
    function ok() { if (status) status.textContent = 'Copied. Paste it wherever you like.'; }
    function no() { if (status) status.textContent = 'Couldn’t copy here. Select the words on the card and copy them.'; }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(ok, no); return; }
    } catch (e) {}
    try { var t = mk('textarea', { cls: 'lg-offscreen', 'aria-hidden': 'true' }); t.value = text; D.body.appendChild(t); t.select(); var r = D.execCommand('copy'); t.remove(); if (r) ok(); else no(); } catch (e2) { no(); }
  }
  // "Save to My saved entries": only where the device keeps them (the app, or someone's own computer)
  function lsMode(k) { try { return W.localStorage.getItem(k); } catch (e) { return null; } }
  function saveRow(acts, d, status) {
    var Pg = W.TOLProgress, perks = false;
    try { perks = !!(Pg && typeof Pg.perks === 'function' && Pg.perks()); } catch (e) { perks = false; }
    var computer = false;
    try { computer = !!(W.matchMedia && W.matchMedia('(pointer: fine)').matches) && !/Android|Mobi|iPad|iPhone|iPod/i.test(W.navigator.userAgent) && !(W.navigator.platform === 'MacIntel' && W.navigator.maxTouchPoints > 1); } catch (e) { computer = false; }
    if (Pg && typeof Pg.saveEntry === 'function' && perks) {
      acts.appendChild(btn('Save to My saved entries', 'lg-quiet', function () {
        var r = false;
        try { r = Pg.saveEntry({ tool: 'logic', title: 'The logic behind it: ' + d.t, text: cardText(d), data: { t: d.t, looks: d.looks, chain: d.chain, an: d.an, fits: d.fits, other: d.other, say: d.say, step: d.step } }); } catch (e) { r = false; }
        status.textContent = r ? 'Saved in My saved entries, on this device only.' : 'Couldn’t save it here. “Copy the words” still works.';
      }));
    } else if (computer && Pg && Pg.KEYS && Pg.KEYS.mode && lsMode(Pg.KEYS.mode) === 'shared') {
      acts.appendChild(mk('p', { cls: 'lg-perk' }, ['This computer is set as shared, so cards aren’t kept here. Use “Copy the words” or a picture of the card, or change it on ', mk('a', { href: '/on-this-device.html', text: 'On this device' }), ' if it’s really yours.']));
    } else if (computer && Pg && typeof Pg.saveEntry === 'function' && Pg.KEYS && Pg.KEYS.mode && !lsMode(Pg.KEYS.mode)) {
      // a computer the site hasn't been told is yours: saving waits for a yes, so nothing is left behind on a shared one
      var note = mk('p', { cls: 'lg-perk' }, ['My saved entries keeps cards only on a computer you’ve said is your own, so nothing is left behind on a shared one. Nothing is sent anywhere either way.']);
      var mine = btn('This is my own computer: save it', 'lg-quiet', function () {
        try { W.localStorage.setItem(Pg.KEYS.mode, 'own'); } catch (e) {}
        var ok = false; try { ok = !!(Pg.perks() && Pg.saveEntry({ tool: 'logic', title: 'The logic behind it: ' + d.t, text: cardText(d), data: { t: d.t, looks: d.looks, chain: d.chain, an: d.an, fits: d.fits, other: d.other, say: d.say, step: d.step } })); } catch (e2) { ok = false; }
        note.remove(); mine.remove();
        status.textContent = ok ? 'Saved in My saved entries, on this computer only. You can change “own or shared” any time on On this device.' : 'Couldn’t save it here. “Copy the words” still works.';
      });
      acts.appendChild(mine); acts.appendChild(note);
    } else {
      acts.appendChild(mk('p', { cls: 'lg-perk' }, ['On a phone or tablet, My saved entries lives in the ', mk('a', { href: '/install.html', text: 'free app' }), '. In the browser, “Copy the words” or a picture of the card keeps it. Nothing is sent anywhere either way.']));
    }
  }

  // ---------------------------------------------------------------- Find the logic
  var findHost = null, out = null, input = null, catRow = null, catList = null;
  var EXAMPLES = ['A driver tailgated me', 'My partner goes quiet when we argue', 'My friend left the party without saying goodbye', 'Why do people do small talk?', 'My teen gives one-word answers', 'They think I’m rude at work'];
  function showCards(list, lead) {
    out.textContent = '';
    if (lead) out.appendChild(lead);
    list.forEach(function (it, i) { out.appendChild(card(it, { h: 'h3' })); });
    var t = out.querySelector('.lg-card-t'); if (t) try { t.focus({ preventScroll: true }); } catch (e) {}
    try { out.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e2) { out.scrollIntoView(); }
  }
  function pickList(items, head) {
    var box = mk('div', { cls: 'lg-picks' }, [mk('p', { cls: 'lg-picks-h', text: head })]);
    var ul = mk('ul', { cls: 'lg-pick-ul' });
    items.forEach(function (it) { ul.appendChild(mk('li', {}, [btn(it.t, 'lg-pick', function () { showCards([it], null); }, { 'data-id': it.id })])); });
    box.appendChild(ul);
    return box;
  }
  function runFind(q) {
    q = String(q || '').trim().slice(0, 300);
    catRow.querySelectorAll('[aria-pressed]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    catList.textContent = '';
    if (!q) { out.textContent = ''; out.appendChild(mk('p', { cls: 'lg-note', text: 'Type a few words about what happened, or pick a kind of situation above.' })); return; }
    var M = match(q);
    if (M.best.length) {
      showCards(M.best, mk('p', { cls: 'lg-found', text: M.best.length > 1 ? 'Two situations that may fit what you described:' : 'The situation that fits best:' }));
      if (M.close.length) out.appendChild(pickList(M.close, 'Or one of these:'));
      return;
    }
    if (M.nearest) {
      showCards([M.nearest], mk('p', { cls: 'lg-found', text: 'This is the closest situation in the library. It may not fit exactly:' }));
      if (M.close.length) out.appendChild(pickList(M.close, 'Or one of these:'));
      out.appendChild(mk('p', { cls: 'lg-note' }, ['Not it? Pick a kind of situation above, or ', mk('a', { href: '#build', text: 'build your own card' }), ' with the same six parts.']));
      return;
    }
    out.textContent = '';
    out.appendChild(mk('p', { cls: 'lg-note', text: 'Nothing in the library matches that closely yet.' }));
    if (M.close.length) out.appendChild(pickList(M.close, 'These are the nearest:'));
    out.appendChild(mk('p', { cls: 'lg-note' }, ['You can pick a kind of situation above, or ', mk('a', { href: '#build', text: 'build your own card' }), ' with the same six parts.']));
  }
  function mountFind(host) {
    findHost = host; host.textContent = '';
    var form = mk('form', { cls: 'lg-form', role: 'search', 'aria-label': 'Find the logic behind a reaction' });
    input = mk('input', { type: 'text', id: 'lg-q', name: 'q', maxlength: '300', autocomplete: 'off', enterkeyhint: 'search', placeholder: 'For example: my friend left without saying goodbye', 'aria-describedby': 'lg-q-hint' });
    form.appendChild(mk('label', { for: 'lg-q', cls: 'lg-lab', text: 'What happened? Describe the reaction in your own words' }));
    form.appendChild(mk('p', { id: 'lg-q-hint', cls: 'lg-hint', text: 'Yours or someone else’s. A few words is enough. Nothing you type leaves this page.' }));
    form.appendChild(mk('div', { cls: 'lg-qrow' }, [input, mk('button', { type: 'submit', cls: 'lg-btn lg-go', text: 'Find the logic' })]));
    form.addEventListener('submit', function (e) { e.preventDefault(); runFind(input.value); });
    host.appendChild(form);
    var ex = mk('div', { cls: 'lg-ex' }, [mk('p', { cls: 'lg-ex-h', text: 'Or try one:' })]);
    EXAMPLES.forEach(function (x) { ex.appendChild(btn(x, 'lg-chip', function () { input.value = x; runFind(x); })); });
    host.appendChild(ex);
    host.appendChild(mk('p', { cls: 'lg-lab lg-lab-cats', id: 'lg-cats-h', text: 'Or pick a kind of situation' }));
    catRow = mk('div', { cls: 'lg-cats', role: 'group', 'aria-labelledby': 'lg-cats-h' });
    CATS.forEach(function (c) {
      var n = ITEMS.filter(function (it) { return it.cat === c.id; }).length;
      catRow.appendChild(btn(c.name + ' (' + n + ')', 'lg-chip lg-cat', function (e) {
        var b = e.currentTarget, on = b.getAttribute('aria-pressed') === 'true';
        catRow.querySelectorAll('[aria-pressed]').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        catList.textContent = '';
        out.textContent = '';   // an earlier "fits best" belongs to what was typed, not to this kind of situation
        if (on) return;
        b.setAttribute('aria-pressed', 'true');
        catList.appendChild(mk('p', { cls: 'lg-hint', text: c.blurb }));
        catList.appendChild(pickList(ITEMS.filter(function (it) { return it.cat === c.id; }), 'Pick one to see the logic:'));
      }, { 'aria-pressed': 'false', 'data-cat': c.id }));
    });
    host.appendChild(catRow);
    catList = mk('div', { cls: 'lg-catlist' });
    host.appendChild(catList);
    out = mk('div', { cls: 'lg-out', 'aria-live': 'polite', id: 'lg-out' });
    host.appendChild(out);
  }

  // ---------------------------------------------------------------- Build your own
  var THEMES = [
    ['Energy', ['A phone at 3% switching off everything but the call.', 'A car pulling into the services before the fuel light comes on.', 'A handful of spoons: each task costs one, and today there were fewer.']],
    ['Too much at once', ['Too many tabs open: everything slows and the fan gets loud.', 'A sink overflowing when the tap stays on.', 'A juggler handed one more ball.']],
    ['Plans and maps', ['A sat nav recalculating mid-journey.', 'Reading the whole recipe before you start cooking.', 'A pilot’s pre-flight checklist.']],
    ['Protection', ['A smoke alarm that goes off for toast.', 'A circuit breaker tripping to stop a fire.', 'A computer starting in safe mode.']],
    ['Different rulebooks', ['An accent: it’s how they learned to say it.', 'Driving on the left or the right: neither is wrong.', 'Two plugs for the same electricity.']],
    ['Starting and stopping', ['A heavy train needing a long way to stop.', 'A car that only starts on a hill.', 'A flywheel: hard to start, hard to stop.']],
    ['Care in another language', ['Two languages for the same sentence.', 'A letter written in actions rather than ink.', 'A gift wrapped in awkward paper.']],
    ['Order', ['Library books shelved by number.', 'A well-labelled toolbox.', 'Tools hung on their outlines on the wall.']]
  ];
  var LABEL_WORDS = /\b(rude|weird|crazy|lazy|selfish|dramatic|childish|stupid|psycho|mental|insane|attention[- ]seeking|needy|cold|mean|nasty|over the top|ridiculous|pathetic|difficult)\b/i;
  var F = {}, buildOut = null, buildMsg = null;
  function field(key, label, hint, kind, ph) {
    var id = 'lgb-' + key;
    var el = kind === 'area' ? mk('textarea', { id: id, rows: '3', maxlength: '400', placeholder: ph || '', 'aria-describedby': id + '-h' }) : mk('input', { id: id, type: 'text', maxlength: '200', placeholder: ph || '', 'aria-describedby': id + '-h', autocomplete: 'off' });
    F[key] = el;
    return mk('div', { cls: 'lg-field' }, [mk('label', { for: id, cls: 'lg-lab', text: label }), mk('p', { cls: 'lg-hint', id: id + '-h', text: hint }), el]);
  }
  function mountBuild(host) {
    host.textContent = '';
    var form = mk('form', { cls: 'lg-build', 'aria-label': 'Build your own card' });
    var f1 = field('looks', '1. What it looks like from outside', 'Camera words: what a camera would see or hear. No labels like “rude” or “weird”.', 'text', 'At the party, she left without saying goodbye.');
    var warn = mk('p', { cls: 'lg-warn', role: 'status' });
    F.looks.addEventListener('input', function () { var m = LABEL_WORDS.exec(F.looks.value); warn.textContent = m ? '“' + m[0] + '” is a judgement, not something a camera sees. Try saying what happened instead.' : ''; });
    f1.appendChild(warn);
    form.appendChild(f1);
    var fs = mk('fieldset', { cls: 'lg-fs' }, [mk('legend', { cls: 'lg-lab', text: '2. The logic chain' }), mk('p', { cls: 'lg-hint', text: 'Three or four short steps, each following from the one before. Start with a plain fact about how things work, and end with why the reaction makes sense.' })]);
    [['c1', 'Step 1: the starting fact', 'Energy is a budget'], ['c2', 'Step 2: what happened to it', 'The party spent it faster than expected'], ['c3', 'Step 3: what would happen next', 'Staying past zero risks a shutdown'], ['c4', 'Step 4, if you need it: so the reaction…', 'Leaving quietly protects the evening']].forEach(function (s) {
      var id = 'lgb-' + s[0]; F[s[0]] = mk('input', { id: id, type: 'text', maxlength: '140', placeholder: s[2], autocomplete: 'off' });
      fs.appendChild(mk('div', { cls: 'lg-field lg-step-f' }, [mk('label', { for: id, cls: 'lg-sublab', text: s[1] }), F[s[0]]]));
    });
    form.appendChild(fs);
    var f3 = field('an', '3. An analogy', 'Something familiar that works the same way inside. A good analogy shares the mechanism, not just the mood.', 'area', 'A phone at 3% switching off everything but the call.');
    var themes = mk('div', { cls: 'lg-themes', role: 'group', 'aria-label': 'Analogy ideas by theme' });
    var sugg = mk('div', { cls: 'lg-sugg' });
    THEMES.forEach(function (th) {
      themes.appendChild(btn(th[0], 'lg-chip', function (e) {
        themes.querySelectorAll('[aria-pressed]').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        e.currentTarget.setAttribute('aria-pressed', 'true');
        sugg.textContent = '';
        th[1].forEach(function (a) { sugg.appendChild(btn(a, 'lg-pick lg-sugg-b', function () { F.an.value = F.an.value.trim() ? F.an.value.trim() + '\n' + a : a; F.an.focus(); })); });
      }, { 'aria-pressed': 'false' }));
    });
    f3.appendChild(mk('p', { cls: 'lg-sublab', text: 'Need an idea? Pick a theme, then tap one to use it (or to add a second one):' }));
    f3.appendChild(themes); f3.appendChild(sugg);
    form.appendChild(f3);
    form.appendChild(field('fits', '4. Why the reaction fits', 'What makes it reasonable, said fairly. “For many people…”, not “everyone” or “always”.', 'area'));
    form.appendChild(field('other', '5. The other side', 'What the other person may have felt or needed. Nobody is the bad guy.', 'area'));
    form.appendChild(field('say', '6. One sentence to explain it', 'Something you could actually say out loud.', 'text', 'I had a good time. I just ran out of battery.'));
    form.appendChild(field('step', 'And one small step that helps both people', 'Small enough to do this week.', 'text', 'Send a short text afterwards.'));
    form.appendChild(field('t', 'A title for your card (optional)', 'A few words.', 'text', 'Leaving early'));
    buildMsg = mk('p', { cls: 'lg-warn', role: 'status' });
    form.appendChild(mk('div', { cls: 'lg-acts' }, [mk('button', { type: 'submit', cls: 'lg-btn lg-go', text: 'Make my card' }), btn('Clear', 'lg-quiet', function () { Object.keys(F).forEach(function (k) { F[k].value = ''; }); warn.textContent = ''; buildMsg.textContent = ''; buildOut.textContent = ''; })]));
    form.appendChild(buildMsg);
    form.appendChild(mk('p', { cls: 'lg-hint', text: 'Nothing is sent anywhere. Your card stays on this page until you close it, unless you choose to share, copy or save it.' }));
    form.addEventListener('submit', function (e) { e.preventDefault(); makeCard(); });
    host.appendChild(form);
    buildOut = mk('div', { cls: 'lg-out', 'aria-live': 'polite', id: 'lg-built' });
    host.appendChild(buildOut);
  }
  function val(k) { return F[k] ? F[k].value.replace(/\s+/g, ' ').trim() : ''; }
  function makeCard() {
    var chain = ['c1', 'c2', 'c3', 'c4'].map(val).filter(Boolean);
    var missing = [];
    if (!val('looks')) missing.push('what it looks like');
    if (chain.length < 2) missing.push('at least two steps of the logic');
    if (!val('say') && !val('step')) missing.push('a sentence or a small step');
    if (missing.length) { buildMsg.textContent = 'Almost there. Add ' + missing.join(', ') + ', then press Make my card again.'; return; }
    buildMsg.textContent = '';
    var d = { mine: true, t: val('t') || 'The logic behind it', looks: val('looks'), chain: chain, an: (F.an.value || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean),
      fits: val('fits'), other: val('other'), say: val('say'), step: val('step') };
    buildOut.textContent = '';
    buildOut.appendChild(mk('p', { cls: 'lg-found', text: 'Your card:' }));
    buildOut.appendChild(card(d, { h: 'h3', build: false }));
    var t = buildOut.querySelector('.lg-card-t'); if (t) try { t.focus({ preventScroll: true }); } catch (e) {}
    try { buildOut.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e2) {}
  }
  function fillBuild(it) {
    if (!F.looks) return;
    F.t.value = it.t; F.looks.value = it.looks;
    ['c1', 'c2', 'c3', 'c4'].forEach(function (k, i) { F[k].value = it.chain[i] || ''; });
    F.an.value = (it.an || []).join('\n'); F.fits.value = it.fits; F.other.value = it.other; F.say.value = unq(it.say); F.step.value = it.step;
    var b = D.getElementById('build'); if (b) try { b.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
    try { F.looks.focus({ preventScroll: true }); } catch (e2) {}
  }

  // ---------------------------------------------------------------- the list without JavaScript: "Show me another analogy" there too
  function enhanceList() {
    D.querySelectorAll('article.lg-static').forEach(function (det) {
      var ul = det.querySelector('ul.lg-an-all'); if (!ul) return;
      var lis = ul.querySelectorAll('li'); if (lis.length < 2) return;
      var i = 0, p = mk('p', { cls: 'lg-an', 'aria-live': 'polite', text: lis[0].textContent });
      var n = mk('span', { cls: 'lg-an-n', text: 'Analogy 1 of ' + lis.length });
      var b = btn('Show me another analogy', 'lg-quiet lg-another', function () { i = (i + 1) % lis.length; p.textContent = lis[i].textContent; n.textContent = 'Analogy ' + (i + 1) + ' of ' + lis.length; });
      ul.hidden = true;
      ul.parentNode.insertBefore(p, ul);
      ul.parentNode.insertBefore(mk('p', { cls: 'lg-an-more' }, [b, ' ', n]), ul);
    });
    function openHash() {
      var h = (location.hash || '').slice(1); if (!/^l-[a-z0-9-]+$/.test(h)) return;
      var el = D.getElementById(h); if (el && el.tagName === 'DETAILS') { el.open = true; try { el.scrollIntoView({ block: 'start' }); } catch (e) {} }
    }
    openHash(); W.addEventListener('hashchange', openHash);
  }

  function start() {
    var fh = D.querySelector('[data-logic-find]'), bh = D.querySelector('[data-logic-build]');
    if (fh) mountFind(fh);
    if (bh) mountBuild(bh);
    enhanceList();
    if (fh) {
      var sp; try { sp = new URLSearchParams(location.search); } catch (e) { sp = null; }
      var item = sp && sp.get('item'), q = sp && sp.get('q');
      if (item && BY[item]) showCards([BY[item]], mk('p', { cls: 'lg-found', text: 'The situation you were sent:' }));
      else if (q) { input.value = q.slice(0, 300); runFind(q); }
    }
  }
  W.TOLLogicLens = { match: match, tokens: function (q) { prep(); return tokens(q, {}); } };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})();
