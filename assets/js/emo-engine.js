/* emo-engine.js: the simple, written-out rules behind "What am I feeling?" (/what-am-i-feeling.html).
   No network: it reads the answers kept in memory on this device and the data in emo-data.js.
   It chooses the next question, sorts what someone said into the four parts of the map (Confirmed by you,
   Likely contributors, Possible connections, Still unknown), lists the parts of the picture, and writes the plan.
   Every guess carries the answers behind it, so the page can always show "Why?".
   Loads in the browser (window.EMO_ENGINE) and in Node (module.exports) for the persona tests. */
(function (root) {
  'use strict';
  var D = (typeof module === 'object' && module.exports) ? require('./emo-data.js') : root.EMO_DATA;

  /* ------------------------------------------------------------------ small helpers */
  var SCREEN = {}; D.screens.forEach(function (s) { SCREEN[s.id] = s; });
  var FAM = {}; D.families.forEach(function (f) { FAM[f.id] = f; });
  var MERGE = { acc: 'irritants', unmet: 'unmet' };
  function skipped(v) { return v === 'skip' || v === 'idk'; }
  function val(S, id) { return S.ans ? S.ans[id] : undefined; }
  function picked(S, id) { var v = val(S, id); return Array.isArray(v) ? v : []; }
  function has(S, key) {
    var p = key.split(':'), v = val(S, p[0]);
    return Array.isArray(v) ? v.indexOf(p[1]) >= 0 : v === p[1];
  }
  function num(S, id) { var v = val(S, id); return typeof v === 'number' ? v : null; }
  function txt(S, id) { var v = S.ans ? S.ans[id + ':t'] : ''; return typeof v === 'string' ? v.trim() : ''; }
  function optOf(screen, id) { var o = opts(screen, null); for (var i = 0; i < o.length; i++) if (o[i].id === id) return o[i]; return null; }
  function list(arr, and) {
    arr = arr.filter(Boolean);
    if (arr.length < 2) return arr.join('');
    return arr.slice(0, -1).join(', ') + ' ' + (and || 'and') + ' ' + arr[arr.length - 1];
  }
  function lc(t) { return t ? t.charAt(0).toLowerCase() + t.slice(1) : t; }
  function quoteList(arr) { return list(arr.map(function (t) { return '“' + t + '”'; })); }
  function cap(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }
  function sayOf(o) { return o.say && !/[.]$/.test(o.say) ? o.say : lc(o.t); }

  // the options a screen shows (some are built from earlier answers)
  function opts(screen, S) {
    if (screen.opts === 'families') return D.families.map(function (f) { return { id: f.id, t: f.t }; }).concat([{ id: D.cantName.id, t: D.cantName.t }]);
    if (screen.opts === 'chosenNeeds') {
      var src = SCREEN.s_needs.opts;
      return src.filter(function (o) { return o.need && S && picked(S, 's_needs').indexOf(o.id) >= 0; }).map(function (o) { return { id: o.id, t: o.t }; });
    }
    if (screen.type === 'probe') { var p = D.probes[screen.probe]; return p.opts || []; }
    if (screen.type === 'counter') return D.probes[screen.probe].copts;
    return screen.opts || [];
  }

  /* ------------------------------------------------------------------ self-harm words (one kind line, then carry on) */
  var HARM = /(kill(ing)? my ?self|suicid|end (it all|my life|things)|hurt(ing)? my ?self|self[- ]?harm|cut(ting)? my ?self|(don'?t|do not) want to (be here|live|be alive|wake up|exist)|not want(ing)? to (be here|live|be alive)|better off without me|no reason to live|want to die|wish i (was|were) dead)/i;
  function harmIn(t) { return !!t && HARM.test(String(t).replace(/[’‘]/g, '\'')); }
  function harm(S) {
    if (has(S, 's_mind:harm')) return true;
    for (var k in (S.ans || {})) if (/:t$/.test(k) && harmIn(S.ans[k])) return true;
    return false;
  }

  /* ------------------------------------------------------------------ which areas of life came up */
  var AREA_OF = { workload: 'work', meaning: 'work', roles: 'work', caregiving: 'work', jobinsecurity: 'work', money: 'money',
    tension: 'people', unheard: 'people', lonely: 'people', obligations: 'people', othercrisis: 'people', unfair: 'people',
    home: 'home', sleep: 'body', energy: 'body', hunger: 'body', pain: 'body', recovery: 'body', movement: 'body', healthchange: 'body',
    change: 'change', waiting: 'change', anniversary: 'change' };
  var AREA_SAY = { work: 'work and responsibilities', money: 'money', people: 'the people in your life', home: 'home', body: 'your body and energy', change: 'changes in your life' };
  var AREA_ONE = { work: 'work', money: 'money', people: 'things with people', home: 'home', body: 'your body', change: 'the change' };
  function chipFactors(S) {
    var out = {};
    ['s_work', 's_people', 's_small', 's_body2', 's_mind', 's_needs', 's_change'].forEach(function (sid) {
      picked(S, sid).forEach(function (oid) { var o = optOf(SCREEN[sid], oid); if (o && o.f) (out[o.f] = out[o.f] || []).push(o); });
    });
    return out;
  }
  function areasMentioned(S) {
    var cf = chipFactors(S), a = [];
    for (var f in cf) { var ar = AREA_OF[f]; if (ar && a.indexOf(ar) < 0) a.push(ar); }
    return a;
  }
  function spillParts(S) {
    var area = val(S, 's_area'); if (!AREA_SAY[area]) area = null;
    var others = areasMentioned(S).filter(function (x) { return x !== area; });
    return { area: area, others: others };
  }

  /* ------------------------------------------------------------------ the five patterns: how strongly answers point to each */
  function threadOpts(S) { return picked(S, 's_small').map(function (id) { return optOf(SCREEN.s_small, id); }).filter(function (o) { return o && o.th; }); }
  function needOpts(S) { return picked(S, 's_needs').map(function (id) { return optOf(SCREEN.s_needs, id); }).filter(function (o) { return o && o.need; }); }
  function mindOpts(S) { return picked(S, 's_mind').map(function (id) { return optOf(SCREEN.s_mind, id); }).filter(function (o) { return o && o.f; }); }
  function bodyLow(S) { return picked(S, 's_body2').map(function (id) { return optOf(SCREEN.s_body2, id); }).filter(function (o) { return o && ['sleep', 'energy', 'hunger', 'pain', 'recovery'].indexOf(o.f) >= 0; }); }
  function strengths(S) {
    var s = {};
    var small = threadOpts(S).length + (has(S, 's_small:sensory') ? 0.5 : 0) + (has(S, 's_small:pings') ? 0.5 : 0) + (has(S, 's_small:chores') ? 0.5 : 0);
    var ds = val(S, 'd_small'); small += ds === 'some' ? 1.5 : ds === 'lots' ? 2.5 : ds === 'zero' ? -1 : 0;
    if (has(S, 's_about:many')) small += 1;
    s.acc = small >= 2 ? small : 0;
    var sp = spillParts(S);
    s.spill = sp.area ? (sp.others.length ? 1 + sp.others.length * 0.5 + (sp.area === 'people' && (sp.others.indexOf('work') >= 0 || sp.others.indexOf('body') >= 0) ? 1 : 0) : 0)
                      : (sp.others.length >= 3 ? sp.others.length * 0.5 : 0);
    if (s.spill < 1.5) s.spill = 0;
    var dep = bodyLow(S).length, dsl = val(S, 'd_sleep'), en = num(S, 'd_energy'), rec = val(S, 'd_recover');
    dep += dsl === 'n5' ? 1 : dsl === 'n7' ? 1.5 : 0; if (en !== null && en <= 3) dep += 1; if (rec === 'cant' || rec === 'month') dep += 0.5;
    s.deplete = dep >= 1 ? dep : 0;
    var un = needOpts(S).length + (has(S, 's_people:lonely') ? 0.5 : 0) + (has(S, 's_people:unheard') ? 0.5 : 0);
    s.unmet = un >= 1 ? un : 0;
    var it = mindOpts(S).length + (has(S, 's_people:tension') ? 0.5 : 0) + (has(S, 's_people:unheard') ? 0.5 : 0);
    s.interp = it >= 1 ? it : 0;
    return s;
  }
  function chosenProbes(S) {
    var s = strengths(S);
    var ids = D.probeOrder.filter(function (p) { return s[p] > 0; });
    ids.sort(function (a, b) { return (s[b] - s[a]) || (D.probeOrder.indexOf(a) - D.probeOrder.indexOf(b)); });
    return S.path === 'thorough' ? ids : ids.slice(0, 2);
  }

  /* ------------------------------------------------------------------ the question order */
  function topDomains(S) {
    var c = [];
    ['s_work', 's_people', 's_small', 's_body2', 's_mind', 's_needs', 's_change'].forEach(function (sid, i) {
      var n = picked(S, sid).filter(function (oid) { var o = optOf(SCREEN[sid], oid); return o && o.f; }).length;
      if (n) c.push({ sid: sid, n: n, i: i });
    });
    c.sort(function (a, b) { return (b.n - a.n) || (a.i - b.i); });
    return c.slice(0, 2).map(function (x) { return x.sid; });
  }
  function whenOk(S, w) {
    if (!w) return true;
    if (w === 'hasFamily') return picked(S, 's_feel').some(function (id) { return !!FAM[id]; });
    if (w === 'anyThread') return threadOpts(S).length > 0;
    if (w === 'twoNeeds') return needOpts(S).length >= 2;
    if (w.any) return w.any.some(function (k) { return has(S, k); });
    return true;
  }
  function active(S, sc) {
    if (typeof sc === 'string') sc = SCREEN[sc];
    if (!sc) return false;
    if (sc.path === 'thorough' && S.path !== 'thorough') return false;
    if (!whenOk(S, sc.when)) return false;
    if (sc.stage === 'deeper' && S.path !== 'thorough' && topDomains(S).indexOf(sc.dom) < 0) return false;
    if (sc.type === 'probe') return chosenProbes(S).indexOf(sc.probe) >= 0;
    if (sc.type === 'counter') { var pv = val(S, 'p_' + sc.probe); return chosenProbes(S).indexOf(sc.probe) >= 0 && pv !== undefined && !skipped(pv); }
    return true;
  }
  function firstScreen(S) { for (var i = 0; i < D.screens.length; i++) if (active(S, D.screens[i])) return D.screens[i].id; return null; }
  function nextScreen(S, from) {
    var i = 0; if (from) { for (; i < D.screens.length; i++) if (D.screens[i].id === from) { i++; break; } }
    for (; i < D.screens.length; i++) if (active(S, D.screens[i])) return D.screens[i].id;
    return null;
  }
  // the screens this person would see with their answers so far (unanswered later screens counted as they stand now)
  function activeList(S) { return D.screens.filter(function (s) { return active(S, s); }).map(function (s) { return s.id; }); }

  /* ------------------------------------------------------------------ filling in the pattern texts */
  function fill(t, S, pid) {
    if (!t) return '';
    var m = {};
    if (pid === 'acc') { var th = threadOpts(S); m.n = String(th.length || 'a few'); m.list = list(th.slice(0, 3).map(sayOf)) || 'noise and interruptions'; }
    if (pid === 'spill') { var sp = spillParts(S); m.area = sp.area ? AREA_SAY[sp.area] : 'one part of life'; m.others = list(sp.others.map(function (a) { return AREA_SAY[a]; })) || 'other parts of life'; m.otherOne = sp.others.length ? AREA_ONE[sp.others[0]] : 'everything else'; }
    if (pid === 'deplete') { m.list = list(bodyLow(S).map(sayOf)) || 'running low'; }
    if (pid === 'unmet') { var nd = needOpts(S); m.list = list(nd.map(function (o) { return o.need; })) || 'something you need'; m.need = topNeed(S) ? topNeed(S).need : 'of what you need'; }
    if (pid === 'interp') { var mo = mindOpts(S); m.list = list(mo.map(sayOf)) || 'some tension with someone'; }
    return t.replace(/\{(\w+)\}/g, function (_, k) { return m[k] != null ? m[k] : ''; });
  }
  function topNeed(S) {
    var nd = needOpts(S); if (!nd.length) return null;
    var pick = val(S, 'd_need'); for (var i = 0; i < nd.length; i++) if (nd[i].id === pick) return nd[i];
    return nd[0];
  }
  function screenText(S, sc) {
    if (typeof sc === 'string') sc = SCREEN[sc];
    var p = sc.probe ? D.probes[sc.probe] : null;
    if (sc.type === 'probe') {
      var sp = spillParts(S);
      return { hyp: fill(sc.probe === 'spill' && !sp.area ? p.hyp2 : p.hyp, S, sc.probe), q: fill(p.q, S, sc.probe), name: p.plain };
    }
    if (sc.type === 'counter') {
      var sp2 = spillParts(S);
      return { q: fill(sc.probe === 'spill' && !sp2.others.length ? p.cq2 : p.cq, S, sc.probe), name: p.plain };
    }
    return { q: sc.q, help: sc.help || '' };
  }
  function screenOpts(S, sc) {
    if (typeof sc === 'string') sc = SCREEN[sc];
    var o = opts(sc, S);
    if (sc.probe) return o.map(function (x) { return { id: x.id, t: fill(x.t, S, sc.probe) }; });
    return o;
  }

  /* ------------------------------------------------------------------ the result of each pattern check */
  function probeResult(S, pid) {
    var p = D.probes[pid], f = val(S, 'p_' + pid), c = val(S, 'c_' + pid), why = [], score = 0;
    if (f === undefined) return { status: 'unasked', score: 0, why: why };
    if (skipped(f)) return { status: f === 'idk' ? 'unknown' : 'skipped', score: 0, why: why };
    if (p.slider) {
      var now = num(S, 's_int'), then = typeof f === 'number' ? f : null, w = 0;
      if (then !== null && now !== null) {
        var d = now - then; w = d >= 3 ? 2 : d >= 1 ? 1 : -1.5;
        why.push(d > 0 ? 'You said it would feel about ' + then + ' out of 10 if you were rested and fed, compared with ' + now + ' now.' : 'You said it would feel about the same even if you were rested and fed.');
      } else if (then !== null) { w = then <= 3 ? 1 : 0; why.push('You said it would feel about ' + then + ' out of 10 if you were rested and fed.'); }
      score += w;
    } else {
      var o = null; (p.opts || []).forEach(function (x) { if (x.id === f) o = x; });
      if (o) { score += o.w; why.push(fill(o.say, S, pid)); }
    }
    if (c !== undefined && !skipped(c)) {
      var co = null; p.copts.forEach(function (x) { if (x.id === c) co = x; });
      if (co) { score += co.w; why.push(fill(co.say, S, pid)); }
    }
    return { status: score >= 2 ? 'likely' : score > 0 ? 'possible' : 'out', score: score, why: why, counterIdk: c === 'idk' };
  }

  /* ------------------------------------------------------------------ factor scores, each with its reasons */
  function factorScores(S) {
    var F = {}, cf = chipFactors(S);
    function add(fid, w, say) { var x = F[fid] || (F[fid] = { id: fid, score: 0, why: [] }); x.score += w; if (say) x.why.push(say); }
    for (var fid in cf) {
      var arr = cf[fid];
      add(fid, 2 + Math.min(2, (arr.length - 1) * 0.5), 'You picked ' + quoteList(arr.map(function (o) { return o.t; })) + '.');
    }
    // follow-up answers
    D.screens.forEach(function (sc) {
      if (sc.stage !== 'deeper' || sc.type !== 'one') return;
      var v = val(S, sc.id); if (!v || skipped(v)) return;
      var o = optOf(sc, v); if (!o || !o.f) return;
      var fid = o.f;
      if (fid === 'tension' && !F.tension && F.unheard) fid = 'unheard';
      if (F[fid] || (o.w || 0) >= 1.5) add(fid, o.w || 0, o.say);
    });
    var load = num(S, 'd_load');
    if (load !== null && F.workload) add('workload', load >= 8 ? 2 : load >= 6 ? 1 : load <= 3 ? -1 : 0, 'You put your plate at ' + load + ' out of 10.');
    else if (load !== null && load >= 8) add('workload', 2, 'You put your plate at ' + load + ' out of 10.');
    var en = num(S, 'd_energy');
    if (en !== null && (en <= 3 || F.energy)) add('energy', en <= 3 ? 1.5 : en >= 7 ? -1 : 0, 'Your energy today is ' + en + ' out of 10.');
    // what they said it's about
    var area = val(S, 's_area');
    var AREA_F = { work: ['workload', 'meaning', 'roles', 'caregiving', 'jobinsecurity'], people: ['tension', 'unheard', 'lonely', 'unfair', 'othercrisis', 'obligations'],
      home: ['home', 'irritants'], money: ['money'], body: ['sleep', 'pain', 'healthchange', 'energy'], change: ['change', 'waiting', 'anniversary'] };
    (AREA_F[area] || []).forEach(function (f) { if (F[f]) add(f, 1, 'You said it’s mostly about ' + D.areaShort[area] + '.'); });
    // patterns the person recognized, or set aside
    D.probeOrder.forEach(function (pid) {
      var r = probeResult(S, pid), mem = D.probes[pid].members;
      mem.forEach(function (f) {
        if (!F[f]) return;
        if (r.status === 'likely') add(f, 1, MERGE[pid] === f ? '' : 'It fits a pattern you recognized: ' + lc(D.probes[pid].plain) + '.');
        else if (r.status === 'out') add(f, -0.5, '');
      });
    });
    // labels with this person's own words filled in
    for (var k in F) {
      var def = D.factors[k]; F[k].kind = def.kind; F[k].ctl = def.ctl;
      F[k].label = def.label.replace('{needs}', list(needOpts(S).map(function (o) { return o.need; }), 'or') || 'something you need');
    }
    var w = val(S, 'd_wait'); if (F.waiting && w) { var wo = optOf(SCREEN.d_wait, w); if (wo && wo.ctl) F.waiting.ctl = wo.ctl; }
    if (F.money && val(S, 'd_money') === 'one') F.money.ctl = 'mine';
    if (F.unmet && val(S, 'p_unmet') === 'cant') F.unmet.ctl = 'others';
    return F;
  }
  var KIND_ORDER = ['outside', 'body', 'people', 'change', 'needs', 'inner'];
  function rankFactors(F) {
    return Object.keys(F).map(function (k) { return F[k]; }).filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return (b.score - a.score) || (KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)); });
  }

  /* ------------------------------------------------------------------ "Here's what I'm hearing" */
  function feelWords(S) {
    var fams = picked(S, 's_feel').filter(function (id) { return FAM[id]; }), words = picked(S, 's_words');
    return fams.map(function (fid) {
      var w = words.filter(function (x) { return x.indexOf(fid + ':') === 0; }).map(function (x) { return x.split(':')[1]; });
      return { id: fid, t: FAM[fid].t, words: w, color: FAM[fid].color };
    });
  }
  function feelPhrase(S) {
    var fw = feelWords(S); if (!fw.length) return '';
    var parts = fw.map(function (f) { return f.words.length ? list(f.words.slice(0, 2)) : lc(f.t); });
    return list(parts);
  }
  function patternOn(ids, pid) { if (ids['p:' + pid]) return ids['p:' + pid]; for (var k in ids) if (ids[k].pattern === pid) return ids[k]; return null; }
  function buildMap(S) {
    var items = [], F = factorScores(S), ranked = rankFactors(F), un = [], aside = [];
    function it(id, cat, text, why, extra) { var o = { id: id, cat: cat, text: text, why: why || [] }; for (var k in (extra || {})) o[k] = extra[k]; items.push(o); }
    // confirmed by you: what was said directly
    var fp = feelPhrase(S), cant = has(S, 's_feel:cant');
    if (fp) it('c:feel', 'confirmed', 'You feel ' + fp + (cant ? ', and something else you can’t name yet' : '') + '.', ['You picked ' + quoteList(feelWords(S).map(function (f) { return f.t; })) + (picked(S, 's_words').length ? ', and the words ' + quoteList(picked(S, 's_words').map(function (x) { return x.split(':')[1]; })) : '') + '.'], { tag: 'Feeling' });
    else if (cant) it('c:feel', 'confirmed', 'You feel something you can’t name yet. That’s common, and the picture can hold it without a name.', ['You picked “I can’t name it.”'], { tag: 'Feeling' });
    var n = num(S, 's_int'); if (n !== null) it('c:int', 'confirmed', 'It’s about ' + n + ' out of 10 right now.', ['You set the strength to ' + n + '.'], { tag: 'Feeling' });
    var dur = val(S, 's_dur'); var dOpt = dur && optOf(SCREEN.s_dur, dur); if (dOpt) it('c:dur', 'confirmed', dOpt.line, ['You picked “' + dOpt.t + '”.'], { tag: 'Feeling' });
    var bodyN = picked(S, 's_body').filter(function (x) { return x !== 'none'; }).map(function (x) { return sayOf(optOf(SCREEN.s_body, x)); });
    if (bodyN.length) it('c:body', 'confirmed', 'You notice it in your body as ' + list(bodyN) + '.', ['You picked these in “Where do you notice it?”'], { tag: 'Body' });
    var ab = val(S, 's_about'), abT = txt(S, 's_about'), area = val(S, 's_area');
    if (ab === 'one') it('c:about', 'confirmed', 'You think it’s mostly about ' + (D.areaShort[area] || 'one thing or one person') + '.' + (abT ? ' In your words: “' + abT + '”.' : ''), ['You picked “One thing or one person”' + (D.areaShort[area] ? ' and “' + optOf(SCREEN.s_area, area).t + '”' : '') + '.'], { tag: 'What it’s about' });
    else if (ab === 'many') it('c:about', 'confirmed', 'It feels like lots of things at once.' + (abT ? ' In your words: “' + abT + '”.' : ''), ['You picked “Lots of things at once.”'], { tag: 'What it’s about' });
    else if (ab === 'nothing') it('c:about', 'confirmed', 'You can’t point to one cause.' + (abT ? ' In your words: “' + abT + '”.' : ''), ['You picked “Nothing I can point to.”'], { tag: 'What it’s about' });
    else if (abT) it('c:about', 'confirmed', 'In your words, it’s about “' + abT + '”.', ['You wrote this yourself.'], { tag: 'What it’s about' });
    var th = txt(S, 'd_thought'); if (th) it('c:thought', 'confirmed', 'The thought that keeps coming back: “' + th + '”.', ['You wrote this yourself.'], { tag: 'Thoughts' });
    if (harm(S)) it('c:harm', 'confirmed', 'You mentioned thoughts of hurting yourself or not wanting to be here. ' + D.harmLine, ['You told me this, in a tap or in your own words.'], { tag: 'Important' });
    if (val(S, 'c_interp') === 'no') it('c:sure', 'confirmed', 'You’re fairly sure of your read of what happened. That counts.', ['You answered “No, I’m fairly sure of my read.”'], { tag: 'Thoughts' });
    var good = picked(S, 's_good').filter(function (g) { return D.good[g]; }).map(function (g) { return D.good[g]; }), gT = txt(S, 's_good');
    if (good.length || gT) it('c:good', 'confirmed', 'Going okay: ' + list(good.concat(gT ? ['“' + gT + '”'] : [])) + '.', ['You picked these under “What’s going okay.”'], { tag: 'What holds you' });
    var bf = txt(S, 'd_before'); if (bf) it('c:before', 'confirmed', 'What helped before: “' + bf + '”.', ['You wrote this yourself.'], { tag: 'What holds you' });
    var wish = picked(S, 's_wish').map(function (w) { return D.wishWords[w]; }).filter(Boolean), wT = txt(S, 's_wish');
    if (wish.length || wT) it('c:wish', 'confirmed', 'You’d like ' + list(wish.concat(wT ? ['“' + wT + '”'] : [])) + '.', ['You picked these under “What would be different?”'], { tag: 'What you want' });

    // likely contributors and possible connections: factors
    ranked.forEach(function (f) {
      it('f:' + f.id, f.score >= 3.5 ? 'likely' : 'possible', f.label + '.', f.why.filter(Boolean), { tag: D.kinds[f.kind], kind: f.kind, score: f.score, fid: f.id });
    });
    // and the patterns that were checked
    D.probeOrder.forEach(function (pid) {
      var r = probeResult(S, pid), p = D.probes[pid];
      var into = MERGE[pid] && F[MERGE[pid]] && F[MERGE[pid]].score > 0 ? 'f:' + MERGE[pid] : null, host = null;
      items.forEach(function (x) { if (x.id === into) host = x; });
      if (host && (r.status === 'likely' || r.status === 'possible')) {
        host.text = host.text.replace(/\.$/, '') + ' (' + lc(p.name) + ').'; host.why = host.why.concat(r.why); host.pattern = pid;
        if (r.status === 'likely' && host.cat !== 'likely') host.cat = 'likely';
      } else if (r.status === 'likely' || r.status === 'possible') it('p:' + pid, r.status, p.plain + ' (' + lc(p.name) + ').', r.why, { tag: 'Pattern', score: r.score + 1, pid: pid });
      else if (r.status === 'out') aside.push(p.plain);
      else if (r.status === 'unknown') un.push('Whether ' + lc(p.plain) + ' plays a part. You weren’t sure, which is fine.');
      if ((r.status === 'likely' || r.status === 'possible') && r.counterIdk) un.push('Whether ' + lc(p.plain) + ' also happens on easier days.');
    });

    // still unknown
    Object.keys(D.areas).forEach(function (sid) {
      var v = val(S, sid);
      if (v === undefined) un.push('We didn’t get to ' + D.areas[sid] + '.');
      else if (skipped(v)) un.push(v === 'idk' ? 'You weren’t sure about ' + D.areas[sid] + '.' : 'We skipped ' + D.areas[sid] + '.');
    });
    if (!fp && !cant && val(S, 's_feel') === undefined) un.push('What the feeling is. We stopped before naming it.');
    if (val(S, 's_feel') === 'idk') un.push('What the feeling is. You weren’t sure, and that’s okay.');
    if (ab === 'nothing' || ab === 'idk' || skipped(ab)) un.push('What set it off, if anything did.');
    if (val(S, 'd_said') === 'unsure') un.push('What you need from the people involved. It may get clearer with time.');
    if (val(S, 'd_need') === 'idk') un.push('Which need matters most right now.');
    if (F.tension || F.unheard) un.push('How the other person sees it. Only they can say.');
    un.push('How this changes from day to day. One session is a snapshot.');
    un.slice(0, 7).forEach(function (t, i) { it('u:' + i, 'unknown', t, ['A short set of questions can’t see everything.'], { tag: 'Unknown' }); });
    return { items: items, aside: aside };
  }
  // the person's own changes: confirm, edit the words, remove, or add something
  function applyEdits(map, edits) {
    edits = edits || {}; var e = edits.items || {}, out = [], removed = [];
    map.items.forEach(function (x) {
      var m = e[x.id] || {}, y = {}; for (var k in x) y[k] = x[k];
      if (m.text) { y.text = m.text; y.edited = true; }
      if (m.cat) { y.cat = m.cat; y.moved = true; }
      if (m.removed) removed.push(y); else out.push(y);
    });
    (edits.added || []).forEach(function (a) {
      var y = { id: a.id, cat: 'confirmed', text: a.text, why: ['You added this yourself.'], tag: 'Added by you', added: true };
      if (a.removed) removed.push(y); else out.push(y);
    });
    return { items: out, removed: removed, aside: map.aside };
  }

  /* ------------------------------------------------------------------ the picture: one part per thing the person said */
  var STONE_COLORS = ['#8C7B6B', '#7E8A84', '#A08C72', '#9A8296', '#8D8F6E', '#A38672', '#7F8799', '#96806E'];
  function buildArt(S, fin) {
    var els = [], ids = {}; fin.items.forEach(function (x) { ids[x.id] = x; });
    var F = factorScores(S);
    function f(fid) { return ids['f:' + fid] ? F[fid] : null; }
    function why(fid) { var x = ids['f:' + fid]; return x ? x.why : []; }
    function el(o) { els.push(o); }
    // the center: the feeling
    var fw = ids['c:feel'] ? feelWords(S) : [], n = ids['c:int'] ? num(S, 's_int') : null, cant = has(S, 's_feel:cant') && !!ids['c:feel'];
    var fams = fw.map(function (x) { return { id: x.id, color: x.color, words: x.words, t: x.t, edge: FAM[x.id].edge, edgeSay: FAM[x.id].edgeSay }; });
    if (cant || !fams.length) fams.push({ id: 'cant', color: D.cantName.color, words: [], t: 'something without a name yet', edge: 'cloud', edgeSay: 'soft cloud with a dotted outline' });
    var strength = n === null ? 5 : n;
    var edgeLines = fams.map(function (x) { return 'The ' + x.edgeSay + ' stands for ' + (x.id === 'cant' ? 'a feeling you can’t name yet' : lc(x.t)) + '.'; });
    el({ id: 'core', kind: 'core', title: 'The shape in the middle', fams: fams, n: strength,
      meaning: (fw.length ? 'How you feel right now: ' + feelPhrase(S) + '. ' : 'How you feel right now, even without a name for it. ') +
        (n !== null ? 'Its size shows the strength you gave it, ' + n + ' out of 10. ' : 'You didn’t give it a strength, so it’s drawn at a middle size. ') + edgeLines.join(' '),
      why: [].concat(ids['c:feel'] ? ids['c:feel'].why : [], ids['c:int'] ? ids['c:int'].why : []), color: fams[0].color, multi: true });
    // threads: each small irritant
    if (f('irritants')) {
      var th = threadOpts(S).map(sayOf), dsO = optOf(SCREEN.d_small, val(S, 'd_small') || ''), extra = dsO && dsO.n ? Math.max(0, dsO.n - th.length) : 0;
      var accIt = patternOn(ids, 'acc'), knot = !!accIt;
      el({ id: 'threads', kind: 'threads', title: 'The thin threads', count: Math.min(14, Math.max(1, th.length + extra)), knot: knot, color: '#9A6A5C',
        meaning: (th.length + extra) + ' thin thread' + (th.length + extra === 1 ? '' : 's') + ' cross the middle, one for each small thing that gets in your way' + (th.length ? ': ' + list(th) : '') + (extra ? ', plus ' + extra + ' more from today' : '') + '.' +
          (knot ? ' They meet in a small knot because the accumulation pattern seemed to fit when you checked it.' : ''),
        why: why('irritants') });
    }
    // stones: weight carried
    var si = 0;
    ['workload', 'caregiving', 'money', 'home', 'roles', 'jobinsecurity', 'meaning', 'obligations', 'othercrisis', 'healthchange'].forEach(function (fid) {
      var x = f(fid); if (!x) return;
      el({ id: 'stone-' + fid, kind: 'stone', fid: fid, title: 'A stone: ' + lc(x.label), weight: Math.min(6, x.score), color: STONE_COLORS[si++ % STONE_COLORS.length],
        meaning: 'A stone at the bottom for ' + lc(x.label) + '. Stones are weight you carry, and this one’s size follows how strongly your answers pointed to it.', why: why(fid) });
    });
    // people
    if (f('tension')) el({ id: 'p-tension', kind: 'person', style: 'jagged', title: 'A figure with a jagged line', color: '#B5655A', meaning: 'A figure joined to the middle by a jagged line, for tension or distance with someone close. It shows the strain between you. It says nothing about who that person is.', why: why('tension') });
    if (f('unheard')) el({ id: 'p-unheard', kind: 'person', style: 'broken', title: 'A figure with a broken line', color: '#9C7FA6', meaning: 'A figure with a broken line between you, for not feeling heard or appreciated.', why: why('unheard') });
    if (f('lonely')) el({ id: 'p-lonely', kind: 'person', style: 'far', title: 'A figure far away', color: '#5F9598', meaning: 'A figure far off along a dotted line, for feeling lonely or left out.', why: why('lonely') });
    if (ids['c:good'] && has(S, 's_good:people')) el({ id: 'p-support', kind: 'person', style: 'warm', title: 'Warm figures close by', color: '#E0A458', meaning: 'Two warm figures close to the middle, for someone who helps or gets you.', why: ['You picked “Someone who helps or gets me.”'] });
    // pressure from outside
    if (f('unfair')) el({ id: 'wedges', kind: 'wedges', title: 'Wedges pressing in', color: '#A35D6A', meaning: 'Soft wedges pressing in from the edges, for being treated unfairly. They start outside the frame because this comes from outside you.', why: why('unfair') });
    // reserves ring
    var bodyF = ['sleep', 'energy', 'hunger', 'recovery', 'pain', 'movement'].filter(function (k) { return f(k); });
    if (bodyF.length || ids['p:deplete']) {
      var en = num(S, 'd_energy'), fillPart = en !== null ? en / 10 : Math.max(0.15, 0.7 - bodyF.length * 0.12);
      el({ id: 'ring', kind: 'ring', title: 'The ring around the middle', fill: fillPart, color: '#6FA3A0',
        meaning: 'A ring around the middle for your reserves. It’s about ' + Math.round(fillPart * 100) + '% full' + (en !== null ? ', from the energy you gave today (' + en + ' out of 10)' : ', an estimate from your answers') + '. The empty part stands for ' + (list(bodyF.map(function (k) { return lc(F[k].label); })) || 'low reserves') + '.',
        why: [].concat.apply([], bodyF.map(why)).concat(ids['p:deplete'] ? ids['p:deplete'].why : []) });
    }
    // thoughts
    var innerF = ['replay', 'worryahead', 'highbar', 'mindread', 'comparing'].filter(function (k) { return f(k); });
    if (innerF.length) el({ id: 'haze', kind: 'haze', title: 'Pale wisps above', count: innerF.length, color: '#A8A5B8',
      meaning: 'Pale wisps drifting above the middle, for thoughts on repeat: ' + list(innerF.map(function (k) { return lc(F[k].label); })) + '.', why: [].concat.apply([], innerF.map(why)) });
    if (ids['p:interp']) el({ id: 'story', kind: 'story', title: 'A dashed outline', color: '#7A7287',
      meaning: 'A dashed outline around the middle, for the story layer: the part of it that may be a guess about why. It’s dashed because it may or may not be true.', why: ids['p:interp'].why });
    // needs
    var cupsN = (f('unmet') ? needOpts(S).length : 0) + (f('torn') ? 1 : 0);
    if (cupsN) el({ id: 'cups', kind: 'cups', title: 'Empty cups', count: Math.min(8, cupsN), torn: !!f('torn'), color: '#7C8FB0',
      meaning: 'Empty cups on the right, one for each thing you’ve been going without' + (f('unmet') ? ': ' + list(needOpts(S).map(function (o) { return o.need; })) : '') + (f('torn') ? (f('unmet') ? '. One is split in two, for feeling torn between two things you want' : ': this one is split in two, for feeling torn between two things you want') : '') + '.',
      why: why('unmet').concat(why('torn')) });
    // change and not knowing
    var chF = ['change', 'anniversary', 'pattern'].filter(function (k) { return f(k); });
    if (chF.length) el({ id: 'horizon', kind: 'horizon', title: 'A ground line with a step in it', color: '#8D9C86',
      meaning: 'A ground line with a step in it, for ' + list(chF.map(function (k) { return lc(F[k].label); })) + '. The ground shifts where life has shifted.', why: [].concat.apply([], chF.map(why)) });
    if (f('waiting') || f('jobinsecurity')) el({ id: 'fog', kind: 'fog', title: 'A band of mist', color: '#AEB9C2',
      meaning: 'A band of mist across the lower part, for ' + list([f('waiting') ? 'waiting on news or not knowing' : '', f('jobinsecurity') ? 'work or income that feels uncertain' : '']) + '.', why: why('waiting').concat(why('jobinsecurity')) });
    // surroundings
    if (f('sensory')) el({ id: 'speckle', kind: 'speckle', title: 'A fine speckle at the edges', density: Math.min(1, F.sensory.score / 5), color: '#9B8F80', meaning: 'A fine speckle around the edges, for noise, light and crowding where you spend your day.', why: why('sensory') });
    if (f('digital')) el({ id: 'pings', kind: 'pings', title: 'Small squares near the top', count: Math.min(12, 3 + Math.round(F.digital.score * 1.5)), color: '#7E90A6', meaning: 'Small squares scattered near the top, for messages and alerts pulling at your attention.', why: why('digital') });
    // spillover
    if (ids['p:spill']) {
      var sp = spillParts(S);
      el({ id: 'bridge', kind: 'bridge', title: 'A ribbon toward the middle', color: '#C48B5C', from: sp.others[0] || 'work',
        meaning: 'A ribbon reaching the middle from below, for stress that may be spilling over from ' + (list(sp.others.map(function (a) { return AREA_SAY[a]; })) || 'another part of life') + ' into ' + (sp.area ? AREA_SAY[sp.area] : 'the rest of your day') + '.', why: ids['p:spill'].why });
    }
    // what holds you
    var goodL = picked(S, 's_good').filter(function (g) { return D.good[g] && g !== 'people'; });
    if (ids['c:good'] && (goodL.length || txt(S, 's_good'))) el({ id: 'anchors', kind: 'anchors', title: 'Small lights at the bottom', count: Math.max(1, goodL.length + (txt(S, 's_good') ? 1 : 0)), color: '#D9A441',
      meaning: 'Small lights low on the left, for what’s going okay: ' + list(goodL.map(function (g) { return D.good[g]; }).concat(txt(S, 's_good') ? ['“' + txt(S, 's_good') + '”'] : [])) + '.', why: ids['c:good'].why });
    // what you want: the opening
    if (ids['c:wish']) el({ id: 'opening', kind: 'opening', title: 'An opening with light', color: '#F0BE5E',
      meaning: 'An opening in the frame with light coming in, and a path of small dots toward it, for what you want: ' + ids['c:wish'].text.replace(/^You’d like /, '').replace(/\.$/, '') + '.', why: ids['c:wish'].why });
    // things the person added
    var added = fin.items.filter(function (x) { return x.added; });
    if (added.length) el({ id: 'added', kind: 'added', title: 'Small diamonds', count: Math.min(6, added.length), color: '#6E8B74', meaning: 'Small diamonds near the middle, for things you added yourself: ' + list(added.map(function (a) { return '“' + a.text + '”'; })) + '.', why: ['You added these on the map.'] });
    return els;
  }
  // the person's own changes to the picture: remove a part, change its color, or say what it means in their words
  function applyArt(els, art) {
    art = art || {}; var rm = art.removed || {}, col = art.color || {}, lab = art.label || {};
    return els.filter(function (e) { return !rm[e.id]; }).map(function (e) {
      var y = {}; for (var k in e) y[k] = e[k];
      if (col[e.id]) y.color = col[e.id];
      if (e.fams) y.fams = e.fams.map(function (fm) { var z = {}; for (var k2 in fm) z[k2] = fm[k2]; if (col[e.id + ':' + fm.id]) z.color = col[e.id + ':' + fm.id]; return z; });
      if (lab[e.id]) { y.own = lab[e.id]; }
      return y;
    });
  }

  /* ------------------------------------------------------------------ the plan */
  var PROBE_STEP = {
    spill: { t: 'Put a short buffer between two parts of your day', d: 'Before you walk in the door, or move from one part of the day to the next, take five minutes: a short walk, one song, a few slow breaths. Less of one place comes with you into the next.', link: ['/nervous-system.html', 'Your nervous system'], sig: 'The next part of the day feels a little more like its own.' }
  };
  var PROBE_CTL = { acc: 'mine', spill: 'mine', deplete: 'mine', unmet: 'mine', interp: 'mine' };
  function stepFor(S, x, F) {
    if (x.fid === 'unmet') { var tn = topNeed(S); return tn && D.needSteps[tn.id] ? [D.needSteps[tn.id]] : []; }
    if (x.fid) return D.factors[x.fid].steps || [];
    if (x.pid === 'acc') return D.factors.irritants.steps;
    if (x.pid === 'deplete') { var b = ['sleep', 'hunger', 'recovery', 'energy'].filter(function (k) { return F[k] && F[k].score > 0; })[0] || 'recovery'; return D.factors[b].steps; }
    if (x.pid === 'unmet') { var tn2 = topNeed(S); return tn2 && D.needSteps[tn2.id] ? [D.needSteps[tn2.id]] : D.factors.lonely.steps; }
    if (x.pid === 'interp') return (F.mindread ? D.factors.mindread : D.factors.replay).steps;
    if (x.pid === 'spill') return [PROBE_STEP.spill];
    return [];
  }
  function sentence(t) { t = String(t || '').trim(); return t && !/[.!?”]$/.test(t) ? t + '.' : t; }
  function buildPlan(S, fin, planEd) {
    planEd = planEd || {};
    var F = factorScores(S), ids = {}; fin.items.forEach(function (x) { ids[x.id] = x; });
    // what is happening
    var hp = [];
    var fp = ids['c:feel'] ? feelPhrase(S) : '';
    if (ids['c:feel'] && ids['c:feel'].edited) hp.push(ids['c:feel'].text);
    else if (fp) hp.push('Right now you feel ' + fp + (has(S, 's_feel:cant') ? ', with something else you can’t name yet' : '') + '.');
    else if (ids['c:feel']) hp.push('Right now you feel something you can’t name yet.');
    if (ids['c:int']) hp.push('You put it at ' + num(S, 's_int') + ' out of 10.');
    if (ids['c:dur']) hp.push(ids['c:dur'].text);
    if (ids['c:about']) hp.push(ids['c:about'].text);
    if (!hp.length) hp.push('We didn’t get far enough to name what’s happening, and that’s okay. Even a few answers can show something.');
    // what might be contributing, ranked: the ones the person confirmed first
    var contrib = fin.items.filter(function (x) { return (x.fid || x.pid || x.added) && x.cat !== 'unknown'; });
    var rankCat = { confirmed: 0, likely: 1, possible: 2 };
    contrib.sort(function (a, b) { return (rankCat[a.cat] - rankCat[b.cat]) || ((b.score || 0) - (a.score || 0)); });
    var C = contrib.map(function (x) {
      var unsure = x.fid ? D.factors[x.fid].unsure : x.pid ? D.probes[x.pid].unsure : 'You added this, so the questions didn’t ask about it.';
      return { id: x.id, title: x.text.replace(/\.$/, ''), tag: x.tag, cat: x.cat, supports: x.why.length ? x.why : ['You confirmed this on the map.'], unsure: unsure, fid: x.fid, pid: x.pid, added: !!x.added };
    });
    // what's in your hands
    var ctl = { mine: [], others: [], cant: [] };
    C.forEach(function (c) {
      if (c.pid) return;
      var where = (planEd.ctl && planEd.ctl[c.id]) || (c.fid ? (F[c.fid] && F[c.fid].ctl) || D.factors[c.fid].ctl : 'mine');
      ctl[where].push({ id: c.id, t: c.title });
    });
    // one or two first steps that fit
    var steps = [], used = {}, kindsUsed = {};
    function take(c, allowAsk) {
      var cands = stepFor(S, c, F); if (!cands.length) return false;
      var st = null;
      for (var i = 0; i < cands.length; i++) { if (used[cands[i].t]) continue; if (!allowAsk && cands[i].ask) continue; st = cands[i]; break; }
      if (!st) return false;
      used[st.t] = true; kindsUsed[c.fid ? D.factors[c.fid].kind : 'pattern'] = true;
      var why = c.supports.filter(function (w) { return w && !/^You confirmed/.test(w); }).slice(0, 3);
      var where = c.cat === 'confirmed' ? 'something you confirmed' : c.cat === 'likely' ? 'one of the likely contributors on your map' : 'a possible connection on your map';
      steps.push({ t: st.t, d: st.d, link: st.link, sig: st.sig, from: c.title, why: 'It’s aimed at ' + lc(c.title) + ', ' + where + '.', whyList: why });
      return true;
    }
    if (harm(S) && ids['c:harm']) steps.push({ t: 'Tell someone you trust today', d: D.harmLine + ' You can say it simply: “I’ve been having a really hard time, and I need you to know.”', link: null, sig: 'Someone knows, and you’re not carrying it alone.', from: 'What you told me', why: 'It comes first because you mentioned thoughts of hurting yourself or not wanting to be here.', whyList: [] });
    var max = 2;
    function ctlOf(c) { if (c.pid) return PROBE_CTL[c.pid]; var w = planEd.ctl && planEd.ctl[c.id]; return w || (c.fid ? (F[c.fid] && F[c.fid].ctl) || D.factors[c.fid].ctl : 'mine'); }
    // first: the highest-ranked contributor with a step the person can take on their own
    for (var i = 0; i < C.length && steps.length < max; i++) if (!C[i].added && take(C[i], false)) break;
    // then: something from a different kind (inside vs outside), asking others for help is fine here
    for (var j = 0; j < C.length && steps.length < max; j++) {
      var c = C[j]; if (c.added) continue;
      var k = c.fid ? D.factors[c.fid].kind : 'pattern'; if (kindsUsed[k]) continue;
      if (ctlOf(c) === 'cant' && !(c.fid && D.factors[c.fid].steps.length)) continue;
      if (take(c, true)) break;
    }
    for (var m = 0; m < C.length && steps.length < max; m++) if (take(C[m], true)) break;
    if (!steps.length || (steps.length === 1 && harm(S) && ids['c:harm'])) {
      steps.push({ t: 'Name it in a word or two', d: 'Once today, stop and finish the sentence “Right now I feel….” One or two words is plenty.', link: ['/quick-checks.html#today', 'My weather today'], sig: 'You can name the feeling a little faster next time.', from: 'A starting point', why: 'The map is still thin, and putting a feeling into words is a small, safe place to start.', whyList: [] });
    }
    // how you'll know it helped
    var sig = steps.map(function (s) { return s.sig; }).filter(Boolean);
    var links = [], seen = {};
    steps.forEach(function (s) { if (s.link && !seen[s.link[0]]) { seen[s.link[0]] = 1; links.push([s.link[0], s.link[1], 'Linked from your first steps.']); } });
    D.links.forEach(function (l) { if (!seen[l[0]] && links.length < 7) { seen[l[0]] = 1; links.push(l); } });
    return { happening: hp.join(' '), contributors: C, control: ctl, steps: steps, signals: sig, links: links, harm: harm(S) && !!ids['c:harm'] };
  }

  /* ------------------------------------------------------------------ a one-line summary for the history list */
  function summary(S, fin) {
    var fp = feelPhrase(S) || (has(S, 's_feel:cant') ? 'something without a name yet' : 'not named'), n = num(S, 's_int');
    var top = fin.items.filter(function (x) { return (x.fid || x.pid) && x.cat !== 'unknown'; }).slice(0, 3).map(function (x) { return x.text.replace(/\.$/, ''); });
    return { feel: fp, n: n, top: top };
  }
  function seedOf(S) {
    var s = JSON.stringify(S.ans || {}) + (S.id || ''), h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  var E = { D: D, SCREEN: SCREEN, has: has, picked: picked, num: num, txt: txt, val: val, skipped: skipped, list: list, cap: cap, sentence: sentence,
    active: active, firstScreen: firstScreen, nextScreen: nextScreen, activeList: activeList, screenText: screenText, screenOpts: screenOpts,
    strengths: strengths, chosenProbes: chosenProbes, probeResult: probeResult, factorScores: factorScores, rankFactors: rankFactors,
    buildMap: buildMap, applyEdits: applyEdits, buildArt: buildArt, applyArt: applyArt, buildPlan: buildPlan, summary: summary,
    harmIn: harmIn, harm: harm, feelWords: feelWords, feelPhrase: feelPhrase, seedOf: seedOf, topDomains: topDomains };
  if (typeof module === 'object' && module.exports) module.exports = E; else root.EMO_ENGINE = E;
})(typeof window !== 'undefined' ? window : this);
