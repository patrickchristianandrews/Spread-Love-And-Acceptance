/* brain-map.js: the Brain Map page (/brain-map.html).
   Draws the page from brain-data.js (what to say) and brain-art.js (the picture). It adds no claims of its own.
   Three ways in: Explore (pick ways of being wired, tap parts), Sliders (turn a slider, see which parts light up) and Compare two.
   Works by tap, hover and keyboard: Tab to reach every part and chip, Enter or Space to choose, arrow keys on tabs and sliders,
   Escape to clear. A polite live region says what changed. With reduced motion there are no pulses and nothing moves.
   Nothing is stored or sent; a ?p=autism,adhd&view=inside&tab=sliders address opens it already set. */
(function () {
  'use strict';
  var B = window.TOLBrain, A = window.TOLBrainArt, root = document.getElementById('bm-app');
  if (!B || !A || !root) return;

  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  // ---------- indexes ----------
  var REG = {}, NET = {}, PRO = {}, CIT = {}, DIAL = {};
  B.regions.forEach(function (r) { REG[r.id] = r; });
  REG.whole = { id: 'whole', name: 'The whole brain and body', short: 'Whole brain', job: 'Findings that are not about one part',
    plain: 'Some findings are about how the regions work together across the whole brain, about the body, or about how everyone varies from day to day.' };
  B.networks.forEach(function (n) { NET[n.id] = n; });
  B.profiles.forEach(function (p) { PRO[p.id] = p; });
  B.citations.forEach(function (c) { CIT[c.id] = c; });
  B.dials.forEach(function (d) { DIAL[d.id] = d; });
  var DEEP = { acc: 1, insula: 1, amygdala: 1, hippocampus: 1, striatum: 1, thalamus: 1 };   // only drawn in the inside view
  function drawn(view, rid) { return !!A.views[view][rid]; }

  // ---------- state ----------
  var S = { tab: 'explore', view: 'outside', sel: [], region: null, nets: [], hide: [], sliders: {}, cmpA: 'baseline', cmpB: 'autism' };
  B.dials.forEach(function (d) { S.sliders[d.id] = 50; });

  // ---------- small helpers ----------
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function $(sel, ctx) { return (ctx || root).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || root).querySelectorAll(sel)); }
  function has(a, x) { return a.indexOf(x) !== -1; }
  function names(ids, key) { return ids.map(function (i) { return (REG[i] || NET[i] || PRO[i] || {})[key || 'name']; }); }
  function list(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  var live = null, liveT = 0;
  function say(t) {
    if (!live) return;
    clearTimeout(liveT); live.textContent = '';
    liveT = setTimeout(function () { live.textContent = t; }, 60);
  }

  // ---------- what the research says, for a set of profiles ----------
  function fx(ids) {
    var out = { regions: {}, nets: {}, whole: [] };
    ids.forEach(function (pid) {
      var p = PRO[pid]; if (!p) return;
      p.effects.forEach(function (e) {
        var rec = { p: p, e: e };
        if (e.n) (out.nets[e.n] = out.nets[e.n] || []).push(rec);
        else if (e.r === 'whole') out.whole.push(rec);
        else (out.regions[e.r] = out.regions[e.r] || []).push(rec);
      });
    });
    return out;
  }
  function glyphsOf(recs) {
    var seen = {}, out = [];
    recs.forEach(function (r) { if (r.e.d && !seen[r.e.d]) { seen[r.e.d] = 1; } });
    B.glyphOrder.forEach(function (g) { if (seen[g]) out.push(g); });
    return out;
  }
  function evChip(ev) {
    var e = B.evidence[ev]; if (!e) return '';
    return '<span class="bm-ev" data-ev="' + ev + '" title="' + esc(e.note) + '"><span class="bm-dots" aria-hidden="true">' + '●'.repeat(e.dots) + '○'.repeat(3 - e.dots) + '</span><span class="sr-only">Evidence: </span><span class="bm-evl">' + e.label + '</span></span>';
  }
  function cites(ids) {
    if (!ids || !ids.length) return '';
    return '<span class="bm-cites"><span class="bm-cl">From</span> ' + ids.map(function (id) {
      var c = CIT[id]; return c ? '<a class="bm-cite" href="#src-' + esc(id) + '">' + esc(c.short) + '</a>' : '';
    }).join('<span aria-hidden="true">; </span>') + '</span>';
  }
  function pdot(p) { return '<span class="bm-pdot" style="--pc:' + p.color + '" aria-hidden="true"></span>'; }
  function glyphTag(g) {
    if (!g) return '';
    return '<span class="bm-gt">' + A.glyph(g, 20) + '<span>' + esc(B.glyphs[g].short) + '</span></span>';
  }

  // ---------- the app's skeleton ----------
  function skeleton() {
    var h = [];
    h.push('<div class="bm-live sr-only" id="bm-live" role="status" aria-live="polite" aria-atomic="true"></div>');
    h.push('<div class="bm-tabs" role="tablist" aria-label="Three ways to explore the map">' +
      [['explore', 'Explore'], ['sliders', 'Sliders'], ['compare', 'Compare two']].map(function (t) {
        return '<button type="button" class="bm-tab" role="tab" id="bm-tab-' + t[0] + '" aria-controls="bm-pane-' + t[0] + '" data-act="tab" data-tab="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div>');
    // the chips: used in Explore and Sliders
    h.push('<div class="bm-pick" id="bm-pick" role="group" aria-labelledby="bm-pick-h"><h2 class="bm-h2" id="bm-pick-h">' + esc(B.ui.chipsTitle) + '</h2><p class="bm-help">' + esc(B.ui.chipsHelp) + '</p>' +
      '<button type="button" class="bm-pickbtn" data-act="pick-toggle" aria-expanded="false" aria-controls="bm-chips"><span class="bm-pickt"><span class="bm-k">Ways of being wired</span><span class="bm-picksum" id="bm-picksum">None picked</span></span><span class="bm-pickc">Change</span></button><div class="bm-chips" id="bm-chips">' +
      B.profiles.map(function (p) {
        return '<button type="button" class="bm-chip" data-act="chip" data-p="' + p.id + '" aria-pressed="false" style="--pc:' + p.color + '"><span class="bm-chip-t">' + esc(p.chip) + '</span></button>';
      }).join('') + '</div></div>');
    h.push('<div class="bm-grid" id="bm-grid"><div class="bm-left" id="bm-left">');
    // the stage: the map, its markers' key and the notes about it
    h.push('<div class="bm-stage" id="bm-stage">' +
      '<div class="bm-tools"><div class="bm-seg" role="group" aria-label="Which view of the brain">' +
      '<button type="button" class="bm-segb" data-act="view" data-view="outside" aria-pressed="true">Outside</button>' +
      '<button type="button" class="bm-segb" data-act="view" data-view="inside" aria-pressed="false">Inside</button></div>' +
      '<button type="button" class="bm-clear" data-act="clear" hidden>Clear</button></div>' +
      '<figure class="bm-fig"><div class="bm-plate-wrap" id="bm-plate"></div><div class="bm-tip" id="bm-tip" aria-hidden="true" hidden></div>' +
      '<figcaption class="bm-cap" id="bm-cap"></figcaption></figure>' +
      '<div class="bm-wholewrap" id="bm-wholewrap"></div><p class="bm-litnote" id="bm-litnote" hidden></p>' +
      '<p class="bm-nudge" id="bm-nudge" hidden></p>' +
      '<div class="bm-legend" id="bm-legend"></div></div>');
    // the extras: networks and the list of parts (after the notes on a phone)
    h.push('<div class="bm-extras" id="bm-extras">' +
      '<div class="bm-netsec" role="group" aria-labelledby="bm-nets-h"><p class="bm-k" id="bm-nets-h">Networks: parts that work together</p><div class="bm-netrow">' +
      B.networks.map(function (n) {
        return '<button type="button" class="bm-net" data-act="net" data-n="' + n.id + '" aria-pressed="false">' + A.netIcon(A.netColor[n.id]) + '<span>' + esc(n.short) + '</span></button>';
      }).join('') + '</div><p class="bm-netnote" id="bm-netnote"></p></div>' +
      '<details class="bm-parts" id="bm-partsd"><summary><span class="bm-k">Or pick a part from a list</span></summary><div class="bm-partrow">' +
      B.regions.map(function (r) {
        return '<button type="button" class="bm-part" data-act="region" data-region="' + r.id + '" aria-pressed="false"><span class="bm-sw" style="background:' + A.color[r.id] + '" aria-hidden="true"></span><span class="bm-part-t">' + esc(r.short) + '</span></button>';
      }).join('') + '</div></details></div></div>');
    // the side: panels
    h.push('<div class="bm-side" id="bm-side">' +
      '<div class="bm-pane" id="bm-pane-explore" role="tabpanel" aria-labelledby="bm-tab-explore" tabindex="-1"></div>' +
      '<div class="bm-pane" id="bm-pane-sliders" role="tabpanel" aria-labelledby="bm-tab-sliders" tabindex="-1" hidden></div>' +
      '</div>');
    h.push('</div>');
    h.push('<div class="bm-pane bm-compare" id="bm-pane-compare" role="tabpanel" aria-labelledby="bm-tab-compare" tabindex="-1" hidden></div>');
    root.innerHTML = h.join('');
    live = $('#bm-live');
  }

  // ---------- the map ----------
  var plate, tip, canHover = false;
  try { canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) {}
  function viewDesc(view) {
    return view === 'inside'
      ? 'A cutaway of the brain, cut a little to the side of the center so the deep parts show together. The front is on the left. Near the front are the prefrontal cortex and, arching above the corpus callosum, the anterior cingulate. In the middle sit the thalamus and the striatum, with the insula at the front and low, the amygdala just behind it, and the curved hippocampus wrapping up behind the thalamus. The cerebellum is at the back and bottom. Bands along the rim mark the sensory cortices and the temporal-parietal areas.'
      : 'The left side of the brain seen from outside, with the front on the left. The prefrontal cortex covers the front. Behind it a band for touch runs down from the top, a band for hearing runs along the side, and a cap at the back is for vision. The temporal-parietal area sits where the side meets the back. The cerebellum is tucked underneath at the back.';
  }
  function drawMap() {
    plate.innerHTML = A.build(S.view, { id: 'bm', interactive: true, regions: B.regions, title: S.view === 'inside' ? 'Inside view of the brain' : 'Outside view of the brain', desc: viewDesc(S.view) });
    // one hidden description for each part, so a screen reader hears what it does and what the picks show there
    var d = document.createElement('div'); d.className = 'sr-only'; d.id = 'bm-descs';
    d.innerHTML = B.regions.map(function (r) { return '<p id="bm-rd-' + r.id + '"></p>'; }).join('');
    plate.appendChild(d);
    $('#bm-cap').textContent = S.view === 'inside' ? B.ui.insideNote : B.ui.outsideNote;
  }

  function sliderLight() { // 0..1 for each part, from the sliders
    var lit = {};
    B.dials.forEach(function (d) {
      var v = Math.abs(S.sliders[d.id] - 50) / 50;
      if (v < .16) return;
      d.regions.forEach(function (r) { lit[r] = Math.max(lit[r] || 0, v); });
    });
    return lit;
  }
  function litNets() {
    var out = [];
    B.dials.forEach(function (d) { if (d.net && Math.abs(S.sliders[d.id] - 50) >= 8 && !has(out, d.net)) out.push(d.net); });
    return out;
  }

  function regionLine(rid) { // what a screen reader hears about a part, given the current picks
    var r = REG[rid], t = r.plain, f = fx(S.sel).regions[rid];
    if (f && f.length) {
      t += ' For your picks: ' + f.map(function (x) { return x.p.name + ', ' + (x.e.d ? B.glyphs[x.e.d].label.toLowerCase() : 'a note') + ', evidence ' + B.evidence[x.e.ev].label.toLowerCase(); }).join('; ') + '.';
    } else if (S.sel.length) t += ' This map has no average difference listed here for your picks.';
    if (S.tab === 'sliders' && sliderLight()[rid]) t += ' Lit by your sliders.';
    return t;
  }

  // the networks drawn right now: the ones switched on, the ones your picks have findings for, the ones your sliders touch, minus any you hid
  function netsShown() {
    var out = S.nets.slice();
    if (S.tab === 'sliders') litNets().forEach(function (n) { if (!has(out, n)) out.push(n); });
    else Object.keys(fx(S.sel).nets).forEach(function (n) { if (!has(out, n)) out.push(n); });
    return out.filter(function (n) { return !has(S.hide, n); });
  }

  function paint() {
    if (!plate) return;
    var sliders = S.tab === 'sliders', f = fx(sliders ? [] : S.sel), view = S.view, svg = $('.bm-svg', plate);
    if (!svg) return;
    var marks = {}, hidden = 0, hiddenNames = [];
    Object.keys(f.regions).forEach(function (rid) {
      var g = glyphsOf(f.regions[rid]);
      if (!g.length) return;
      if (drawn(view, rid)) marks[rid] = g; else { hidden++; hiddenNames.push(REG[rid].short); }
    });
    var lit = sliders ? sliderLight() : {};
    // networks to draw: the ones switched on, the ones your picks have findings for, the ones your sliders touch
    var netsOn = netsShown(), netMark = {};
    if (!sliders) Object.keys(f.nets).forEach(function (nid) { var g = glyphsOf(f.nets[nid]); if (g.length) netMark[nid] = g[0]; });
    var netDefs = NET;
    var layer = A.paintLayer(view, { marks: marks, netsOn: netsOn, netDefs: netDefs, netMark: netMark, scale: plate.clientWidth && plate.clientWidth < 560 ? 1.45 : 1.15 });
    $('.bm-marks', svg).innerHTML = layer.marks;
    $('.bm-nets', svg).innerHTML = layer.nets;
    var any = Object.keys(marks).length || Object.keys(lit).length;
    svg.classList.toggle('has-sel', !!any);
    $$('.bm-r', svg).forEach(function (g) {
      var rid = g.getAttribute('data-region');
            g.classList.toggle('has-fx', !!marks[rid]);
      g.classList.toggle('is-sel', S.region === rid);
      g.setAttribute('aria-pressed', S.region === rid ? 'true' : 'false');
      var l = lit[rid] || 0;
      g.classList.toggle('is-lit', l > 0);
      g.style.setProperty('--lit', l ? (0.25 + l * 0.7).toFixed(2) : '0');
      var p = document.getElementById('bm-rd-' + rid); if (p) p.textContent = regionLine(rid);
    });
    // the button for findings that are about the whole brain or body
    var ww = $('#bm-wholewrap'), wg = glyphsOf(f.whole);
    if (f.whole.length) {
      ww.innerHTML = '<button type="button" class="bm-whole" data-act="region" data-region="whole" aria-pressed="' + (S.region === 'whole' ? 'true' : 'false') + '" aria-label="Across the whole brain or body: ' + esc(wg.length ? wg.map(function (g) { return B.glyphs[g].label.toLowerCase(); }).join(', ') : 'notes') + '. Open details."><span>Across the whole brain or body</span>' + wg.map(function (g) { return A.glyph(g, 22); }).join('') + '</button>';
    } else ww.innerHTML = '';
    // the parts list and the networks row
    $$('.bm-part', root).forEach(function (b) {
      var rid = b.getAttribute('data-region'), inView = drawn(view, rid), fxHere = f.regions[rid] && glyphsOf(f.regions[rid]).length;
      b.setAttribute('aria-pressed', S.region === rid ? 'true' : 'false');
      b.classList.toggle('has-fx', !!fxHere); b.classList.toggle('is-far', !inView);
      b.title = inView ? '' : 'Shown in the other view';
    });
    $$('.bm-netbtn', root).forEach(function (b) { var on = has(netsOn, b.getAttribute('data-n')); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.textContent = on ? 'Hide on the map' : 'Show on the map'; });
    $$('button.bm-net', root).forEach(function (b) {
      var nid = b.getAttribute('data-n');
      b.setAttribute('aria-pressed', has(netsOn, nid) ? 'true' : 'false');
      b.classList.toggle('has-fx', !!netMark[nid]);
    });
    var nn = $('#bm-netnote'), shown = netsOn.filter(function (nid) { return NET[nid].nodes.filter(function (r) { return drawn(view, r); }).length >= 2; });
    var unseen = netsOn.filter(function (nid) { return !has(shown, nid); });
    nn.textContent = unseen.length ? names(unseen, 'short').join(', ') + (unseen.length === 1 ? ' needs' : ' need') + ' the inside view to be drawn.' : (netsOn.length ? '' : 'Switch one on to see dotted lines between the parts that work together.');
    // the nudge about parts in the other view
    var nu = $('#bm-nudge');
    if (hidden && !sliders) {
      nu.hidden = false;
      nu.innerHTML = plural(hidden, 'more part has', 'more parts have') + ' a finding in the ' + (view === 'outside' ? 'inside' : 'outside') + ' view (' + esc(hiddenNames.join(', ')) + '). <button type="button" class="bm-linkb" data-act="view" data-view="' + (view === 'outside' ? 'inside' : 'outside') + '">Show the ' + (view === 'outside' ? 'inside' : 'outside') + ' view</button>';
    } else nu.hidden = true;
    var ln = $('#bm-litnote');
    if (sliders) {
      var lk = Object.keys(lit).sort(function (a, b) { return lit[b] - lit[a]; });
      ln.hidden = false;
      if (!lk.length) ln.innerHTML = 'Turn a slider away from the middle and the parts it involves light up.';
      else {
        var far = lk.filter(function (r) { return !drawn(view, r); });
        ln.innerHTML = '<strong>Lit:</strong> ' + lk.map(function (r) { return esc(REG[r].short) + (drawn(view, r) ? '' : ' (' + (view === 'outside' ? 'inside' : 'outside') + ' view)'); }).join(', ') + '.' +
          (far.length ? ' <button type="button" class="bm-linkb" data-act="view" data-view="' + (view === 'outside' ? 'inside' : 'outside') + '">Show the ' + (view === 'outside' ? 'inside' : 'outside') + ' view</button>' : '');
      }
    } else ln.hidden = true;
    $('.bm-clear', root).hidden = !(S.sel.length || S.region || S.nets.length || S.hide.length);
    $$('.bm-segb', root).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-view') === view ? 'true' : 'false'); });
  }

  function legend() {
    $('#bm-legend').innerHTML = '<p class="bm-k">What the markers mean</p><ul class="bm-lg">' + B.glyphOrder.map(function (g) {
      return '<li>' + A.glyph(g, 24) + '<span>' + esc(B.glyphs[g].label) + '</span></li>';
    }).join('') + '</ul>';
  }
  function evKey() { // what Strong, Moderate and Early mean, in the panel where the labels appear
    return '<details class="bm-evkey"><summary>What Strong, Moderate and Early mean</summary><ul class="bm-lg bm-lg-ev">' + ['strong', 'moderate', 'early'].map(function (k) {
      return '<li>' + evChip(k).replace(/ title="[^"]*"/, '') + '<span>' + esc(B.evidence[k].note) + '</span></li>';
    }).join('') + '</ul></details>';
  }

  // ---------- the Explore panel ----------
  function effectLi(rec, multi, showGlyph) {
    var e = rec.e, p = rec.p;
    return '<li class="bm-fxl">' + (multi ? '<span class="bm-fxp">' + pdot(p) + esc(p.name) + '</span> ' : '') + (e.d ? glyphTag(e.d) : '') +
      '<span class="bm-fxt">' + esc(e.t) + '</span> <span class="bm-meta">' + evChip(e.ev) + cites(e.c) + '</span></li>';
  }
  function regionCard() {
    var rid = S.region, r = REG[rid], f = fx(S.sel), recs = rid === 'whole' ? f.whole : (f.regions[rid] || []), multi = S.sel.length > 1;
    var h = ['<section class="bm-regcard" aria-labelledby="bm-rc-h" style="--rc:' + (A.color[rid] || '#7B715F') + '">'];
    h.push('<p class="bm-k">Selected part</p><h3 class="bm-h3" id="bm-rc-h">' + esc(r.name) + '</h3><p class="bm-job">' + esc(r.job) + '</p><p class="bm-plain">' + esc(r.plain) + '</p>');
    if (rid !== 'whole') {
      var inNets = B.networks.filter(function (n) { return has(n.nodes, rid); });
      if (inNets.length) h.push('<p class="bm-parts-of">Works with: ' + inNets.map(function (n) { return '<span class="bm-nchip">' + A.netIcon(A.netColor[n.id]) + esc(n.short) + '</span>'; }).join(' ') + '</p>');
    }
    h.push('<h4 class="bm-h4">What research finds here</h4>');
    if (!S.sel.length) h.push('<p class="bm-empty">Pick a way of being wired above to see what the research finds for this part.</p>');
    else if (!recs.length) h.push('<p class="bm-empty">This map has no average difference listed for this part for ' + esc(list(names(S.sel))) + '. That does not mean there is none. It means the research behind this map does not say.</p>');
    else h.push('<ul class="bm-fxlist">' + recs.map(function (x) { return effectLi(x, multi); }).join('') + '</ul>');
    h.push('<p class="bm-row"><button type="button" class="bm-btn" data-act="region-clear">Close this part</button></p></section>');
    return h.join('');
  }

  function profileSections() {
    var ids = S.sel, ps = ids.map(function (i) { return PRO[i]; }), multi = ps.length > 1, f = fx(ids), h = [];
    // who is picked
    h.push('<section class="bm-picked" aria-label="Your picks">' + ps.map(function (p) {
      return '<div class="bm-pk" style="--pc:' + p.color + '"><p class="bm-pk-n">' + pdot(p) + esc(p.name) + '</p><p class="bm-pk-k">' + esc(p.kind) + '</p><p class="bm-pk-s">' + esc(p.summary) + '</p></div>';
    }).join('') + '</section>');
    if (multi) {
      h.push('<p class="bm-together"><strong>Putting them together.</strong> Many people have more than one. This map shows each one’s average findings side by side. Research on combinations is thin, so the markers may add, cancel or look different together, and nothing here predicts one person. ' + evChip('early') + '</p>');
    }
    // (a) what the research finds, part by part
    var a = ['<details class="bm-sec" open><summary><span class="bm-sh">What the research finds</span><span class="bm-ss">Average differences, part by part</span></summary><div class="bm-sbody">'];
    a.push('<p class="bm-honest">These are averages from group studies, with small-to-moderate effects and a lot of overlap. They describe groups, not any one person, and they do not say what causes what.</p>');
    var any = false;
    B.regions.forEach(function (r) {
      var recs = f.regions[r.id]; if (!recs || !recs.length) return; any = true;
      a.push('<div class="bm-fx" style="--rc:' + A.color[r.id] + '"><h4 class="bm-fxh"><button type="button" class="bm-link" data-act="region" data-region="' + r.id + '"><span class="bm-sw" style="background:' + A.color[r.id] + '" aria-hidden="true"></span>' + esc(r.name) + '</button>' +
        (DEEP[r.id] ? '<span class="bm-deep">inside view</span>' : '') + '</h4><ul class="bm-fxlist">' + recs.map(function (x) { return effectLi(x, multi); }).join('') + '</ul></div>');
    });
    B.networks.forEach(function (n) {
      var recs = f.nets[n.id]; if (!recs || !recs.length) return; any = true;
      a.push('<div class="bm-fx bm-fxn"><h4 class="bm-fxh"><span class="bm-nchip">' + A.netIcon(A.netColor[n.id]) + esc(n.name) + '</span></h4><p class="bm-nd">' + esc(n.plain) + '</p><p class="bm-row"><button type="button" class="bm-btn bm-netbtn" data-act="net" data-n="' + n.id + '" aria-pressed="' + (has(netsShown(), n.id) ? 'true' : 'false') + '">' + (has(netsShown(), n.id) ? 'Hide on the map' : 'Show on the map') + '</button></p><ul class="bm-fxlist">' + recs.map(function (x) { return effectLi(x, multi); }).join('') + '</ul></div>');
    });
    if (f.whole.length) {
      any = true;
      a.push('<div class="bm-fx"><h4 class="bm-fxh"><button type="button" class="bm-link" data-act="region" data-region="whole">The whole brain and body</button></h4><ul class="bm-fxlist">' + f.whole.map(function (x) { return effectLi(x, multi); }).join('') + '</ul></div>');
    }
    if (!any) a.push('<p class="bm-empty">There are no markers for this pick: it is the reference point. Everyone sits somewhere on every slider.</p>');
    // where this comes from, one line each
    ps.forEach(function (p) {
      var ids2 = [];
      p.effects.forEach(function (e) { (e.c || []).forEach(function (c) { if (!has(ids2, c)) ids2.push(c); }); });
      if (p.size) p.size.c.forEach(function (c) { if (!has(ids2, c)) ids2.push(c); });
      var sz = '';
      if (p.size) {
        var hi = A.overlapShare(p.size.lo), lo = A.overlapShare(p.size.hi);
        sz = ' Typical size in the scan studies' + (p.size.vs ? ' (compared with ' + p.size.vs + ')' : '') + ': ' + (p.size.lo).toFixed(1).replace(/^0\./, '0.') + ' to ' + (p.size.hi).toFixed(1) + ' of a standard deviation, so the two groups overlap by about ' + Math.round(lo * 100) + ' to ' + Math.round(hi * 100) + ' percent.';
      }
      a.push('<p class="bm-src">' + (multi ? pdot(p) + '<strong>' + esc(p.name) + '.</strong> ' : '') + '<span class="bm-k bm-k-i">Where this comes from</span> ' + cites(ids2).replace('<span class="bm-cl">From</span> ', '') + esc(sz) + '</p>');
    });
    a.push('</div></details>');
    h.push(a.join(''));
    // (b) from the inside
    var b = ['<details class="bm-sec" open><summary><span class="bm-sh">From the inside</span><span class="bm-ss">What it can feel like</span></summary><div class="bm-sbody"><p class="bm-honest">Everyday descriptions, not research findings. People with the same label feel this differently, and some of it will not fit you or the person you have in mind.</p>'];
    ps.forEach(function (p) {
      b.push('<div class="bm-pb">' + (multi ? '<h4 class="bm-ph">' + pdot(p) + esc(p.name) + '</h4>' : '') + '<dl class="bm-scenes">' + p.inside.map(function (x) { return '<dt>' + esc(x.s) + '</dt><dd>' + esc(x.t) + '</dd>'; }).join('') + '</dl></div>');
    });
    b.push('</div></details>'); h.push(b.join(''));
    // (c) from the outside
    var c = ['<details class="bm-sec"><summary><span class="bm-sh">From the outside</span><span class="bm-ss">How it can look, and get misread</span></summary><div class="bm-sbody">'];
    ps.forEach(function (p) {
      c.push('<div class="bm-pb">' + (multi ? '<h4 class="bm-ph">' + pdot(p) + esc(p.name) + '</h4>' : '') + '<ul class="bm-plist">' + p.outside.map(function (x) { return '<li>' + esc(x.t) + (x.c ? ' <span class="bm-meta">' + cites(x.c) + '</span>' : '') + '</li>'; }).join('') + '</ul></div>');
    });
    c.push('</div></details>'); h.push(c.join(''));
    // (d) what helps
    var d = ['<details class="bm-sec"><summary><span class="bm-sh">What tends to help</span><span class="bm-ss">Practical supports</span></summary><div class="bm-sbody"><p class="bm-honest">What helps varies by person. These are options with the evidence behind each one, not instructions.</p>'];
    ps.forEach(function (p) {
      d.push('<div class="bm-pb">' + (multi ? '<h4 class="bm-ph">' + pdot(p) + esc(p.name) + '</h4>' : '') + '<ul class="bm-plist">' + p.helps.map(function (x) { return '<li>' + esc(x.t) + ' <span class="bm-meta">' + evChip(x.ev) + cites(x.c) + '</span></li>'; }).join('') + '</ul></div>');
    });
    d.push('</div></details>'); h.push(d.join(''));
    // (e) what others can try
    var e2 = ['<details class="bm-sec"><summary><span class="bm-sh">What others can try</span><span class="bm-ss">Three things to say or do</span></summary><div class="bm-sbody">'];
    ps.forEach(function (p) {
      e2.push('<div class="bm-pb">' + (multi ? '<h4 class="bm-ph">' + pdot(p) + esc(p.name) + '</h4>' : '') + '<ol class="bm-try">' + p.others.map(function (x) { return '<li><span class="bm-tk">' + esc(x.k) + '</span> ' + esc(x.t) + '</li>'; }).join('') + '</ol></div>');
    });
    e2.push('<p class="bm-honest">Ask the person first. What helps one person can be the wrong thing for another.</p></div></details>'); h.push(e2.join(''));
    return h.join('');
  }

  function welcome() {
    return '<section class="bm-welcome"><h3 class="bm-h3">Start anywhere</h3>' +
      '<p>Tap a part of the brain to see what it does. Or pick a way of being wired above, and the map will show where research finds differences on average, and what it can feel like.</p>' +
      '<p class="bm-hintline">Try two at once: many people have more than one.</p>' +
      '<ul class="bm-ten">' + B.regions.map(function (r) { return '<li><button type="button" class="bm-link" data-act="region" data-region="' + r.id + '"><span class="bm-sw" style="background:' + A.color[r.id] + '" aria-hidden="true"></span><strong>' + esc(r.name) + '</strong></button> <span class="bm-tj">' + esc(r.job) + '</span></li>'; }).join('') + '</ul></section>';
  }

  function renderExplore() {
    var h = [];
    if (S.region) h.push(regionCard());
    if (S.sel.length) { h.push(evKey()); h.push(profileSections()); }
    else if (!S.region) h.push(welcome());
    $('#bm-pane-explore').innerHTML = h.join('');
  }

  // ---------- Sliders ----------
  function feelWord(v) {
    if (v >= 82) return 'turned way up'; if (v >= 64) return 'turned up'; if (v >= 56) return 'a little up';
    if (v <= 18) return 'turned way down'; if (v <= 36) return 'turned down'; if (v <= 44) return 'a little down';
    return 'in the middle';
  }
  function rangeBars(d) {
    var rows = [], base = B.baselineRange;
    var ids = S.sel.length ? S.sel.filter(function (i) { return i !== 'baseline'; }) : [];
    var pad = '';
    rows.push('<div class="bm-bar-row"><div class="bm-bar bm-bar-base" style="left:' + base[0] + '%;width:' + (base[1] - base[0]) + '%"><span class="bm-bar-l">No label</span></div></div>');
    ids.forEach(function (pid) {
      var r = B.ranges[pid][d.id], p = PRO[pid], w = r.hi - r.lo, right = (r.lo + r.hi) / 2 > 56;
      rows.push('<div class="bm-bar-row"><div class="bm-bar' + (right ? ' is-right' : '') + '" style="left:' + r.lo + '%;width:' + w + '%;--pc:' + p.color + '"><span class="bm-bar-l">' + esc(p.name) + '</span></div></div>');
    });
    return rows.join('') + pad;
  }
  function renderSliders() {
    var h = ['<div class="bm-sl-head"><h2 class="bm-h2">Sliders</h2><p class="bm-plain">Turn a slider to see which parts of the brain are most involved, with no label needed. This is for asking “what if this one is turned up?”, not for scoring yourself. The bars show where each way of being wired you picked tends to sit, as a range, next to the no-label range.</p><p class="bm-honest">' + esc(B.ui.sliderNote) + '</p>' +
      '<p class="bm-row"><button type="button" class="bm-btn" data-act="sl-reset">Reset sliders</button></p></div><div class="bm-sls">'];
    B.dials.forEach(function (d) {
      var v = S.sliders[d.id], ids = S.sel.filter(function (i) { return i !== 'baseline'; });
      h.push('<section class="bm-sl" data-sl-card="' + d.id + '" aria-labelledby="bm-dh-' + d.id + '">' +
        '<h3 class="bm-h3" id="bm-dh-' + d.id + '">' + esc(d.name) + '</h3><p class="bm-help">' + esc(d.blurb) + '</p>' +
        '<div class="bm-track" aria-hidden="false"><div class="bm-bands" data-bands="' + d.id + '">' + rangeBars(d) + '</div>' +
        '<div class="bm-slwrap"><input type="range" class="bm-range" id="bm-sl-' + d.id + '" data-sl="' + d.id + '" min="0" max="100" step="1" value="' + v + '" aria-labelledby="bm-dh-' + d.id + '" aria-describedby="bm-dd-' + d.id + '">' +
        '</div><div class="bm-ends"><span>' + esc(d.low) + '</span><span>' + esc(d.high) + '</span></div></div>' +
        '<p class="bm-feel" id="bm-dd-' + d.id + '" data-feel="' + d.id + '"></p>' +
        '<details class="bm-why"><summary>Why the bars sit where they do</summary><ul class="bm-plist">' +
        (ids.length ? ids : ['baseline']).map(function (pid) {
          var r = B.ranges[pid][d.id], p = PRO[pid];
          return '<li>' + pdot(p) + '<strong>' + esc(p.name) + ':</strong> ' + esc(r.t) + ' <span class="bm-meta">' + evChip(r.ev) + cites(r.c) + '</span></li>';
        }).join('') + '</ul></details></section>');
    });
    h.push('</div>');
    $('#bm-pane-sliders').innerHTML = h.join('');
    B.dials.forEach(function (d) { updateFeel(d.id, false); });
  }
  function updateFeel(did, announce) {
    var d = DIAL[did], v = S.sliders[did], el = $('[data-feel="' + did + '"]'), inp = $('#bm-sl-' + did);
    if (!el || !inp) return;
    var w = feelWord(v), t;
    if (v >= 56) t = d.feelHigh; else if (v <= 44) t = d.feelLow; else t = 'Somewhere in the middle, most days look like most other people’s days.';
    el.innerHTML = '<span class="bm-fw">' + esc(d.name) + ' ' + esc(w) + '.</span> ' + esc(t) + ' <span class="bm-lit">Lights: ' + esc(names(d.regions, 'short').join(', ')) + '.</span>';
    inp.setAttribute('aria-valuetext', v + ' out of 100, ' + w);
    inp.style.setProperty('--v', v + '%');
    if (announce) say(d.name + ' ' + w + '. ' + (Math.abs(v - 50) >= 8 ? 'Lights ' + list(names(d.regions, 'short')) + '.' : 'Nothing lit.'));
  }

  // ---------- Compare ----------
  function marksOf(pid) { // glyph sets by part, for one profile
    var f = fx([pid]), m = {}; Object.keys(f.regions).forEach(function (r) { var g = glyphsOf(f.regions[r]); if (g.length) m[r] = g; });
    var n = {}; Object.keys(f.nets).forEach(function (k) { var g = glyphsOf(f.nets[k]); if (g.length) n[k] = g; });
    return { r: m, n: n };
  }
  function same(a, b) { return a.length === b.length && a.every(function (x, i) { return x === b[i]; }); }
  function miniMap(pid, id) {
    var m = marksOf(pid), nets = Object.keys(m.n), nm = {};
    nets.forEach(function (k) { nm[k] = m.n[k][0]; });
    var html = A.build(S.view, { id: id, regions: B.regions, interactive: false, title: PRO[pid].name + ', ' + S.view + ' view', desc: viewDesc(S.view) });
    var host = document.createElement('div'); host.innerHTML = html;
    var svg = host.firstChild, marks = {};
    Object.keys(m.r).forEach(function (r) { if (drawn(S.view, r)) marks[r] = m.r[r]; });
    var layer = A.paintLayer(S.view, { marks: marks, netsOn: nets, netDefs: NET, netMark: nm, scale: 1.3 });
    svg.querySelector('.bm-marks').innerHTML = layer.marks; svg.querySelector('.bm-nets').innerHTML = layer.nets;
    if (Object.keys(marks).length) svg.classList.add('has-sel'); svg.classList.add('is-mini');
    Array.prototype.forEach.call(svg.querySelectorAll('.bm-r'), function (g) { if (marks[g.getAttribute('data-region')]) g.classList.add('has-fx'); });
    return host.innerHTML;
  }
  function renderCompare() {
    var a = S.cmpA, b = S.cmpB, A_ = PRO[a], B_ = PRO[b], ma = marksOf(a), mb = marksOf(b);
    function opts(sel) { return B.profiles.map(function (p) { return '<option value="' + p.id + '"' + (p.id === sel ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join(''); }
    var h = ['<div class="bm-cmp-head"><h2 class="bm-h2">Compare two</h2><p class="bm-plain">Pick one way of being wired and the no-label baseline, or two ways of being wired. The two maps sit side by side, and the table shows where they differ and where they are the same. Most of the map is the same.</p>' +
      '<div class="bm-selrow"><label class="bm-sel"><span>Left</span><select id="bm-cmpA" data-cmp="A">' + opts(a) + '</select></label>' +
      '<button type="button" class="bm-btn bm-swap" data-act="swap" aria-label="Swap left and right">Swap</button>' +
      '<label class="bm-sel"><span>Right</span><select id="bm-cmpB" data-cmp="B">' + opts(b) + '</select></label></div>' +
      '<div class="bm-seg" role="group" aria-label="Which view of the brain"><button type="button" class="bm-segb" data-act="view" data-view="outside" aria-pressed="' + (S.view === 'outside') + '">Outside</button><button type="button" class="bm-segb" data-act="view" data-view="inside" aria-pressed="' + (S.view === 'inside') + '">Inside</button></div></div>'];
    h.push('<div class="bm-two"><figure class="bm-cfig" style="--pc:' + A_.color + '"><figcaption class="bm-ccap">' + pdot(A_) + esc(A_.name) + '</figcaption><div class="bm-plate-wrap">' + miniMap(a, 'bmA') + '</div></figure>' +
      '<figure class="bm-cfig" style="--pc:' + B_.color + '"><figcaption class="bm-ccap">' + pdot(B_) + esc(B_.name) + '</figcaption><div class="bm-plate-wrap">' + miniMap(b, 'bmB') + '</div></figure></div>');
    // the table
    var rows = [], nSame = 0, nDiff = 0, nNone = 0;
    function row(label, ga, gb, kind) {
      var verdict, cls;
      if (!ga.length && !gb.length) { verdict = 'Neither'; cls = 'none'; nNone++; }
      else if (same(ga, gb)) { verdict = 'Same'; cls = 'same'; nSame++; }
      else { verdict = 'Differs'; cls = 'diff'; nDiff++; }
      function cell(g) { return g.length ? g.map(function (x) { return '<span class="bm-cg">' + A.glyph(x, 22) + '<span class="sr-only">' + esc(B.glyphs[x].label) + '</span></span>'; }).join('') : '<span class="bm-dash" aria-hidden="true">–</span><span class="sr-only">none</span>'; }
      rows.push('<tr class="bm-v-' + cls + '"><th scope="row">' + label + '</th><td>' + cell(ga) + '</td><td>' + cell(gb) + '</td><td><span class="bm-vd">' + verdict + '</span></td></tr>');
    }
    B.regions.forEach(function (r) { row(esc(r.short) + (DEEP[r.id] ? ' <span class="bm-deep">inside</span>' : ''), ma.r[r.id] || [], mb.r[r.id] || []); });
    B.networks.forEach(function (n) { row(esc(n.short) + ' <span class="bm-deep">network</span>', ma.n[n.id] || [], mb.n[n.id] || []); });
    row('Whole brain or body', glyphsOf(fx([a]).whole), glyphsOf(fx([b]).whole));
    var total = nSame + nDiff + nNone;
    h.push('<div class="bm-cmp-sum" role="status"><p class="bm-bignum"><strong>' + (nNone + nSame) + ' of ' + total + '</strong> parts and networks look the same on both sides.</p><p>' + plural(nDiff, 'part differs', 'parts differ') + ', ' + plural(nSame, 'part shows the same marker', 'parts show the same marker') + ', and ' + plural(nNone, 'has no average difference', 'have no average difference') + ' listed for either side. A difference on this map is a small average, with groups that overlap a great deal.</p></div>');
    h.push('<div class="table-wrap bm-tw"><table class="bm-table"><caption class="sr-only">Same means both sides show the same marker. Neither means no average difference is listed for either side. Where ' + esc(A_.name) + ' and ' + esc(B_.name) + ' differ on the map</caption><thead><tr><th scope="col">Part</th><th scope="col">Left</th><th scope="col">Right</th><th scope="col">Result</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div><p class="bm-tnote">Same: both sides show the same marker. Differs: the markers differ, or only one side has one. Neither: no average difference is listed for either side.</p>');
    // overlap
    var sizes = [A_, B_].filter(function (p) { return p.id !== 'baseline' && p.size; });
    var ov = ['<section class="bm-overlap"><h3 class="bm-h3">How much do the groups overlap?</h3>'];
    if (sizes.length) {
      sizes.forEach(function (p) {
        var lo = Math.round(A.overlapShare(p.size.hi) * 100), hi = Math.round(A.overlapShare(p.size.lo) * 100);
        ov.push('<div class="bm-ovrow"><div class="bm-ovfig">' + A.overlap(p.size.hi, { id: 'bmo-' + p.id, colorA: '#8A7F6A', colorB: p.color }) + '</div><p>' + pdot(p) + '<strong>' + esc(p.name) + (p.size.vs ? ', compared with ' + esc(p.size.vs) + '.' : ' and no label.') + '</strong> The structure differences in the large scan studies are about ' + p.size.lo.toFixed(1) + ' to ' + p.size.hi.toFixed(1) + ' of a standard deviation. If both groups are bell-shaped, the curves overlap by about ' + lo + ' to ' + hi + ' percent. The curves above are drawn at ' + p.size.hi.toFixed(1) + '. ' + cites(p.size.c) + '</p></div>');
      });
    } else {
      ov.push('<p>The studies behind ' + (A_.id === 'baseline' && B_.id === 'baseline' ? 'this pick' : esc(list([A_, B_].filter(function (p) { return p.id !== 'baseline'; }).map(function (p) { return p.name; })))) + ' are mostly about brain activity, not size, so there is no single overlap number. Nothing in the research behind this map puts these groups far apart.</p>');
    }
    ov.push('</section>');
    h.push(ov.join(''));
    $('#bm-pane-compare').innerHTML = h.join('');
    return { diff: nDiff, same: nSame, none: nNone, total: total };
  }

  // ---------- tabs and views ----------
  function showTab(t, focus) {
    S.tab = t;
    $$('.bm-tab', root).forEach(function (b) {
      var on = b.getAttribute('data-tab') === t;
      b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
      b.classList.toggle('is-on', on);
    });
    ['explore', 'sliders', 'compare'].forEach(function (k) { var p = $('#bm-pane-' + k); if (p) p.hidden = k !== t; });
    $('#bm-grid').hidden = t === 'compare';
    $('#bm-pick').hidden = t === 'compare';
    $('#bm-stage').classList.toggle('is-sticky', t === 'sliders');
    $('#bm-extras').hidden = t === 'sliders';
    $('#bm-pick').classList.toggle('is-compact', t === 'sliders');
    if (t !== 'sliders') { $('#bm-pick').classList.remove('is-open'); var pb = $('.bm-pickbtn'); if (pb) pb.setAttribute('aria-expanded', 'false'); }
    if (t === 'explore') renderExplore();
    if (t === 'sliders') { if (!S.slidersSeen) { S.slidersSeen = true; if (S.view === 'outside') setView('inside', true); } renderSliders(); }
    if (t === 'compare') renderCompare();
    paint();
    if (focus) { var b = $('#bm-tab-' + t); if (b) b.focus(); }
  }
  function setView(v, quiet) {
    if (v === S.view) return;
    S.view = v;
    if (S.tab !== 'compare') { drawMap(); wirePlate(); }
    if (S.tab === 'compare') renderCompare();
    paint();
    $$('.bm-segb', root).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-view') === v ? 'true' : 'false'); });
    if (!quiet) say((v === 'inside' ? 'Inside view. A cutaway showing the deep parts.' : 'Outside view. The left side of the brain.'));
  }

  // ---------- choosing ----------
  function summarize() {
    if (!S.sel.length) return 'Nothing picked.';
    var f = fx(S.sel), n = Object.keys(f.regions).filter(function (r) { return glyphsOf(f.regions[r]).length; }).length, nn = Object.keys(f.nets).length;
    var inV = Object.keys(f.regions).filter(function (r) { return glyphsOf(f.regions[r]).length && drawn(S.view, r); }).length;
    var t = list(names(S.sel)) + ' picked. ';
    if (S.sel.length === 1 && S.sel[0] === 'baseline') return 'No label picked. The reference point: no markers.';
    t += 'Research finds average differences in ' + plural(n, 'part', 'parts') + (nn ? ' and ' + plural(nn, 'network', 'networks') : '') + '. ' + inV + ' ' + (inV === 1 ? 'is' : 'are') + ' drawn in this view.';
    if (n - inV > 0) t += ' ' + (n - inV) + ' more ' + (n - inV === 1 ? 'is' : 'are') + ' in the ' + (S.view === 'outside' ? 'inside' : 'outside') + ' view.';
    return t;
  }
  function toggleChip(pid) {
    var i = S.sel.indexOf(pid);
    if (i !== -1) S.sel.splice(i, 1);
    else if (pid === 'baseline') S.sel = ['baseline'];
    else { S.sel = S.sel.filter(function (x) { return x !== 'baseline'; }); S.sel.push(pid); }
    syncChips();
    renderExplore(); if (S.tab === 'sliders') renderSliders();
    paint();
    say(summarize());
  }
  function syncChips() {
    $$('.bm-chip', root).forEach(function (b) { var on = has(S.sel, b.getAttribute('data-p')); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    var sm = $('#bm-picksum'); if (sm) sm.textContent = S.sel.length ? list(names(S.sel)) : 'None picked';
  }
  function pickRegion(rid, fromList) {
    if (!REG[rid]) return;
    if (S.tab !== 'explore') showTab('explore');
    if (S.region === rid && !fromList) { S.region = null; }
    else {
      S.region = rid;
      if (rid !== 'whole' && !drawn(S.view, rid)) setView(S.view === 'outside' ? 'inside' : 'outside', true);
    }
    renderExplore(); paint();
    if (S.region) {
      var r = REG[rid], recs = rid === 'whole' ? fx(S.sel).whole : (fx(S.sel).regions[rid] || []);
      say(r.name + '. ' + r.job + '. ' + (S.sel.length ? (recs.length ? 'For your picks: ' + recs.map(function (x) { return x.p.name + ', ' + (x.e.d ? B.glyphs[x.e.d].label.toLowerCase() : 'a note') + ', evidence ' + B.evidence[x.e.ev].label.toLowerCase(); }).join('; ') + '.' : 'No average difference is listed here for your picks.') : 'Pick a way of being wired to see what research finds here.'));
      var card = $('#bm-rc-h'); if (card && matchMedia('(max-width: 979px)').matches) { /* the card is below the map on a phone: bring it into view without stealing focus */ try { card.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); } catch (e) {} }
    } else say('Part closed.');
  }
  function clearAll() {
    if (S.region) { S.region = null; renderExplore(); paint(); say('Part closed.'); return; }
    if (S.sel.length || S.nets.length || S.hide.length) {
      S.sel = []; S.nets = []; S.hide = [];
      syncChips(); renderExplore(); if (S.tab === 'sliders') renderSliders(); paint();
      say('Cleared. Nothing picked, no networks shown.');
    }
  }

  // ---------- events ----------
  function tipShow(g, e) {
    var rid = g.getAttribute('data-region'), r = REG[rid]; if (!r || !tip || !canHover) return;
    tip.innerHTML = '<strong>' + esc(r.name) + '</strong><span>' + esc(r.job) + '</span>';
    tip.hidden = false;
    var box = plate.getBoundingClientRect(), gb = g.getBoundingClientRect();
    var x = e && e.clientX != null && e.type !== 'focusin' ? e.clientX - box.left : gb.left + gb.width / 2 - box.left;
    var y = e && e.clientY != null && e.type !== 'focusin' ? e.clientY - box.top : gb.top - box.top;
    tip.style.left = Math.max(8, Math.min(box.width - 8, x)) + 'px'; tip.style.top = Math.max(0, y - 12) + 'px';
  }
  function tipHide() { if (tip) tip.hidden = true; }
  function wirePlate() {
    // nothing to do: handled by delegation on the plate
  }

  function onClick(e) {
    var t = e.target.closest ? e.target.closest('[data-act], .bm-r') : null; if (!t || !root.contains(t)) return;
    if (t.classList.contains('bm-r')) { pickRegion(t.getAttribute('data-region')); tipHide(); return; }
    var act = t.getAttribute('data-act');
    if (act === 'tab') showTab(t.getAttribute('data-tab'));
    else if (act === 'chip') toggleChip(t.getAttribute('data-p'));
    else if (act === 'pick-toggle') { var pk = $('#bm-pick'), open = !pk.classList.contains('is-open'); pk.classList.toggle('is-open', open); t.setAttribute('aria-expanded', open ? 'true' : 'false'); }
    else if (act === 'view') { setView(t.getAttribute('data-view')); }
    else if (act === 'clear') { S.region = null; clearAll(); if (S.sel.length === 0 && !S.nets.length) { /* already cleared */ } }
    else if (act === 'net') {
      var n = t.getAttribute('data-n'), on = has(netsShown(), n);
      if (on) { S.nets = S.nets.filter(function (x) { return x !== n; }); if (has(netsShown(), n) && !has(S.hide, n)) S.hide.push(n); }
      else { S.hide = S.hide.filter(function (x) { return x !== n; }); if (!has(netsShown(), n) && !has(S.nets, n)) S.nets.push(n); }
      paint();
      var fxHere = S.tab === 'explore' && fx(S.sel).nets[n];
      var seen = NET[n].nodes.filter(function (r) { return drawn(S.view, r); }).length >= 2;
      say(NET[n].name + (on ? ' hidden.' : ' shown. ' + NET[n].plain + (seen ? '' : ' It needs the inside view to be drawn.') + (fxHere ? ' Research has findings for it for your picks.' : '')));
    }
    else if (act === 'region') { pickRegion(t.getAttribute('data-region'), t.classList.contains('bm-part') || t.classList.contains('bm-link') || t.id === 'bm-whole'); }
    else if (act === 'region-clear') { S.region = null; renderExplore(); paint(); say('Part closed.'); }
    else if (act === 'sl-reset') { B.dials.forEach(function (d) { S.sliders[d.id] = 50; var i = $('#bm-sl-' + d.id); if (i) i.value = 50; updateFeel(d.id, false); }); paint(); say('Sliders reset to the middle.'); }
    else if (act === 'swap') { var x = S.cmpA; S.cmpA = S.cmpB; S.cmpB = x; var c = renderCompare(); say('Swapped. ' + PRO[S.cmpA].name + ' on the left, ' + PRO[S.cmpB].name + ' on the right.'); }
  }
  function onKey(e) {
    var g = e.target.closest ? e.target.closest('.bm-r') : null;
    if (g && (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar')) { e.preventDefault(); pickRegion(g.getAttribute('data-region')); return; }
    if (e.key === 'Escape') {
      if (S.tab === 'explore' || S.tab === 'sliders') { var had = S.region || S.sel.length || S.nets.length || S.hide.length; clearAll(); if (had) e.preventDefault(); }
      return;
    }
    var tab = e.target.closest ? e.target.closest('.bm-tab') : null;
    if (tab && /^(ArrowLeft|ArrowRight|Home|End)$/.test(e.key)) {
      var order = ['explore', 'sliders', 'compare'], i = order.indexOf(tab.getAttribute('data-tab'));
      i = e.key === 'Home' ? 0 : e.key === 'End' ? order.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + order.length) % order.length;
      e.preventDefault(); showTab(order[i], true);
    }
  }
  var raf = 0;
  function onInput(e) {
    var inp = e.target.closest ? e.target.closest('.bm-range') : null; if (!inp) return;
    var did = inp.getAttribute('data-sl'); S.sliders[did] = +inp.value; updateFeel(did, false);
    if (!raf) raf = requestAnimationFrame(function () {
      raf = 0;
      // most sliders light deep parts: if nothing lit is in this view but something is in the other one, show that view
      var lit = sliderLight(), ks = Object.keys(lit), here = ks.filter(function (r) { return drawn(S.view, r); }).length;
      if (ks.length && !here) { var other = S.view === 'outside' ? 'inside' : 'outside'; if (ks.some(function (r) { return drawn(other, r); })) { setView(other, true); say('Switched to the ' + other + ' view, where the parts this slider involves are drawn.'); return; } }
      paint();
    });
  }
  function onChange(e) {
    var inp = e.target.closest ? e.target.closest('.bm-range') : null;
    if (inp) { updateFeel(inp.getAttribute('data-sl'), true); return; }
    var sel = e.target.closest ? e.target.closest('[data-cmp]') : null;
    if (sel) { if (sel.getAttribute('data-cmp') === 'A') S.cmpA = sel.value; else S.cmpB = sel.value; var r = renderCompare(); var fe = $('#bm-cmp' + sel.getAttribute('data-cmp')); if (fe) fe.focus(); say(PRO[S.cmpA].name + ' compared with ' + PRO[S.cmpB].name + '. ' + (r.none + r.same) + ' of ' + r.total + ' parts and networks look the same; ' + r.diff + ' differ.'); }
  }
  function onOver(e) {
    var g = e.target.closest ? e.target.closest('.bm-r') : null;
    if (!g || !plate.contains(g)) return;
    if (e.pointerType === 'touch') return;
    tipShow(g, e);
  }
  function onOut(e) { var g = e.target.closest ? e.target.closest('.bm-r') : null; if (g) tipHide(); }
  function onFocusIn(e) { var g = e.target.closest ? e.target.closest('.bm-r') : null; if (g && plate && plate.contains(g)) tipShow(g, e); }
  function onFocusOut(e) { var g = e.target.closest ? e.target.closest('.bm-r') : null; if (g) tipHide(); }

  // ---------- start ----------
  function init() {
    skeleton();
    plate = $('#bm-plate'); tip = $('#bm-tip');
    legend();
    // an address like ?p=autism,adhd&view=inside&tab=sliders opens the page already set
    try {
      var q = new URLSearchParams(location.search), p = (q.get('p') || '').split(',').filter(function (x) { return PRO[x]; });
      if (p.length) S.sel = has(p, 'baseline') ? ['baseline'] : p;
      if (q.get('view') === 'inside') S.view = 'inside';
      var tb = q.get('tab'); if (tb === 'sliders' || tb === 'compare') S.tab = tb;
      var a = q.get('a'), b = q.get('b'); if (PRO[a]) S.cmpA = a; if (PRO[b]) S.cmpB = b;
      if (S.tab === 'compare' && !PRO[b] && S.sel.length) { S.cmpB = S.sel.filter(function (x) { return x !== 'baseline'; })[0] || S.cmpB; }
    } catch (e) {}
    drawMap();
    syncChips();
    showTab(S.tab);
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKey);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onChange);
    plate.addEventListener('mouseover', onOver); plate.addEventListener('mouseout', onOut);
    root.addEventListener('focusin', onFocusIn); root.addEventListener('focusout', onFocusOut);
    try { if (window.matchMedia('(min-width: 980px)').matches) $('#bm-partsd').open = true; } catch (e) {}
    root.classList.add('is-ready');
    if (!reduce) root.classList.add('can-move');
  }
  init();
})();
