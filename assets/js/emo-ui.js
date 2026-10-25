/* emo-ui.js: the screens of "What am I feeling?" (/what-am-i-feeling.html).
   Questions, the "Here's what I'm hearing" map, the picture with its legend, the plan, and the optional history.
   It runs on simple written-out rules (emo-engine.js), not AI, and nothing is sent anywhere.

   localStorage key: tol-emo-v1  { sessions: [ { id, at, path, ans, edits, art, planEd, seed } ] }
   It is written only when someone taps "Save this session on this device". "Delete" and "Delete all" remove it.
   Nothing else is stored: unfinished answers live in the page and go when it closes. */
(function () {
  'use strict';
  var E = window.EMO_ENGINE, ART = window.EMO_ART, app = document.getElementById('emo-app');
  if (!E || !app) return;
  var D = E.D, KEY = 'tol-emo-v1', MAXS = 20;
  var NAMES = ['Blue', 'Teal', 'Green', 'Olive', 'Gold', 'Orange', 'Red', 'Rose', 'Purple', 'Brown', 'Gray', 'Navy'];
  var STAGE = {}; D.stages.forEach(function (s) { STAGE[s.id] = s; });
  var S = null, first = true, store = load(), compare = null;

  /* ------------------------------------------------------------------ small helpers */
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function load() { try { var o = JSON.parse(lsGet(KEY) || 'null'); if (o && Array.isArray(o.sessions)) return o; } catch (e) {} return { sessions: [] }; }
  function save() { return lsSet(KEY, JSON.stringify(store)); }
  function $(sel, root) { return (root || app).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || app).querySelectorAll(sel)); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function nice(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); }
  function short(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  var DROP = '<svg viewBox="-4 -14 88 92" aria-hidden="true" focusable="false"><path d="M40 8C33 22 14 36 14 50c0 14 12 22 26 22s26-8 26-22C66 36 47 22 40 8z" fill="#CFE6FA" stroke="#7FB2E0" stroke-width="2.6"/><ellipse cx="30" cy="30" rx="5" ry="3" fill="#fff" opacity=".6" transform="rotate(-25 30 30)"/><circle cx="31" cy="46" r="6.2" fill="rgba(255,255,255,.35)" stroke="#3A3350" stroke-width="1.8"/><circle cx="49" cy="46" r="6.2" fill="rgba(255,255,255,.35)" stroke="#3A3350" stroke-width="1.8"/><path d="M37.2 46h5.6" stroke="#3A3350" stroke-width="1.8"/><circle cx="31" cy="46.5" r="2.4" fill="#2B2620"/><circle cx="49" cy="46.5" r="2.4" fill="#2B2620"/><path d="M35 56 Q40 60.5 45 56" fill="none" stroke="#2B2620" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="23" cy="55" rx="3.6" ry="2.2" fill="#F2A3B6" opacity=".85"/><ellipse cx="57" cy="55" rx="3.6" ry="2.2" fill="#F2A3B6" opacity=".85"/><g transform="translate(-9 15) rotate(-20 40 10) scale(.82)"><path d="M18 10 L40 1 L62 10 L40 19 Z" fill="#3A3350"/><path d="M29 14.5v6c3 3 19 3 22 0v-6l-11 4.5z" fill="#4A4266"/><path d="M60 10 v11" stroke="#F4D26B" stroke-width="1.6"/><circle cx="60" cy="22.5" r="2.3" fill="#F4D26B"/></g></svg>';
  function guide(html) { return '<div class="emo-guide no-bubble">' + DROP + '<p><b>Professor Puddles</b><br>' + html + '</p></div>'; }

  /* ------------------------------------------------------------------ a session */
  function newSession(path) {
    return { id: uid(), at: new Date().toISOString(), path: path, ans: {}, cur: null, hist: [], edits: { items: {}, added: [] }, art: { removed: {}, color: {}, label: {} },
      planEd: { ctl: {} }, numbers: true, phase: 'ask', savedId: null, editing: null, openArt: null };
  }
  function seed() { return E.seedOf(S); }
  function curMap() { return E.applyEdits(E.buildMap(S), S.edits); }
  function artParts() { return E.applyArt(E.buildArt(S, curMap()), S.art); }
  function prune() {
    Object.keys(S.ans).forEach(function (k) {
      var id = k.replace(/:t$/, '');
      if (E.SCREEN[id] && !E.active(S, E.SCREEN[id]) && id !== S.cur) delete S.ans[k];
    });
  }

  /* ------------------------------------------------------------------ the start */
  function introHTML() {
    var n = store.sessions.length;
    return '<div class="emo-card" data-phase="intro">' +
      guide('Hi. I’ll ask, you steer. Tap what fits, skip what doesn’t, and stop whenever you like.') +
      '<h2 class="emo-qh" id="emo-h" tabindex="-1">Where would you like to start?</h2>' +
      '<p class="emo-help">Both versions look at the same parts of life. The thorough one asks more follow-up questions where your answers point.</p>' +
      '<div class="emo-start">' +
        '<button type="button" class="emo-btn" data-act="start" data-path="quick"><span>The quick version</span><small>About 3 minutes</small></button>' +
        '<button type="button" class="emo-btn is-quiet" data-act="start" data-path="thorough"><span>The thorough version</span><small>Up to 8 minutes</small></button>' +
      '</div>' +
      (n ? '<p class="emo-row is-end"><button type="button" class="emo-btn is-quiet" data-act="hist">Past sessions on this device (' + n + ')</button></p>' : '') +
      '</div>';
  }

  /* ------------------------------------------------------------------ one question */
  function totalQs() {
    var list = E.activeList(S), extra = 0;
    list.forEach(function (id) { var sc = E.SCREEN[id]; if (sc.type === 'probe' && list.indexOf('c_' + sc.probe) < 0) extra++; });
    return { list: list, total: list.length + extra };
  }
  function optInput(type, name, o, checked) {
    return '<label><input type="' + type + '" name="' + name + '" value="' + esc(o.id) + '"' + (o.x ? ' data-x="1"' : '') + (checked ? ' checked' : '') + '><span>' + esc(o.t) + '</span></label>';
  }
  function askHTML() {
    var sc = E.SCREEN[S.cur], tx = E.screenText(S, sc), v = S.ans[S.cur], T = totalQs(), idx = Math.max(1, T.list.indexOf(S.cur) + 1);
    var st = STAGE[sc.stage], prev = S.hist.length ? E.SCREEN[S.hist[S.hist.length - 1]] : null, h = '';
    var pct = Math.min(100, Math.round(idx / T.total * 100));
    h += '<div class="emo-card" data-phase="ask">';
    h += '<p class="emo-stage">' + esc(st.t) + '</p>';
    h += '<div class="emo-prog"><p class="emo-prog-t" id="emo-pt">Question ' + idx + ' of about ' + T.total + '</p><div class="emo-bar" role="progressbar" aria-labelledby="emo-pt" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><span style="width:' + pct + '%"></span></div></div>';
    if (!prev || prev.stage !== sc.stage) h += guide(esc(st.guide));
    var name = 'emo-opt', picks = Array.isArray(v) ? v : (typeof v === 'string' ? [v] : []);
    if (sc.type === 'probe') {
      var p = D.probes[sc.probe];
      h += '<div class="emo-probe no-bubble"><p class="emo-k">A guess to check: ' + esc(p.plain.toLowerCase()) + '</p><p>' + esc(tx.hyp) + '</p></div>';
    }
    if (sc.type === 'counter') h += '<div class="emo-probe no-bubble"><p class="emo-k">One check the other way</p></div>';
    var slider = sc.type === 'slider' || (sc.type === 'probe' && D.probes[sc.probe].slider);
    h += '<fieldset class="emo-q"><legend id="emo-h" tabindex="-1">' + esc(tx.q) + '</legend>';
    if (tx.help) h += '<p class="emo-help">' + esc(tx.help) + '</p>';
    if (slider) {
      var lo = sc.lo || D.probes[sc.probe].lo, hi = sc.hi || D.probes[sc.probe].hi, val = typeof v === 'number' ? v : (sc.def == null ? 5 : sc.def);
      h += '<div class="emo-slider"><output id="emo-out" for="emo-range" aria-hidden="true">' + val + ' <small>out of 10</small></output>' +
        '<input type="range" id="emo-range" min="0" max="10" step="1" value="' + val + '" aria-label="' + esc(tx.q) + '" aria-valuetext="' + val + ' out of 10"><div class="emo-ends"><span>' + esc(lo) + '</span><span>' + esc(hi) + '</span></div></div>';
    } else if (sc.type === 'words') {
      var fams = E.picked(S, 's_feel').filter(function (id) { return D.families.some(function (f) { return f.id === id; }); });
      fams.forEach(function (fid) {
        var fam = D.families.filter(function (f) { return f.id === fid; })[0];
        h += '<fieldset class="emo-wordset"><legend>' + esc(fam.t) + '</legend><div class="emo-wordgrid">' +
          fam.words.map(function (w) { var k = fid + ':' + w; return '<label><input type="checkbox" name="emo-w" value="' + esc(k) + '"' + (picks.indexOf(k) >= 0 ? ' checked' : '') + '><span>' + esc(w) + '</span></label>'; }).join('') + '</div></fieldset>';
      });
    } else if (sc.type === 'text') {
      h += '<div class="emo-textwrap"><label for="emo-text">Your words (optional)</label><input class="emo-text" id="emo-text" type="text" maxlength="240" autocomplete="off" placeholder="' + esc(sc.ph || '') + '" value="' + esc(S.ans[S.cur + ':t'] || '') + '"></div>';
    } else {
      var multi = sc.type === 'multi', os = E.screenOpts(S, sc);
      h += '<div class="emo-opts">' + os.map(function (o) { return optInput(multi ? 'checkbox' : 'radio', name, o, picks.indexOf(o.id) >= 0); }).join('') + '</div>';
    }
    if (sc.text) h += '<div class="emo-textwrap"><label for="emo-text">In your own words (optional)</label><input class="emo-text" id="emo-text" type="text" maxlength="240" autocomplete="off" placeholder="' + esc(sc.ph || '') + '" value="' + esc(S.ans[S.cur + ':t'] || '') + '"></div>';
    h += '</fieldset>';
    h += '<p class="emo-harm" id="emo-harm" role="status" hidden>' + esc(D.harmLine) + '</p>';
    var isLast = !E.nextScreen(S, S.cur);
    h += '<div class="emo-row"><button type="button" class="emo-btn is-quiet" data-act="back"' + (S.hist.length ? '' : ' disabled') + '>Back</button>' +
      '<button type="button" class="emo-btn" data-act="next">' + (isLast ? 'See what I’m hearing' : 'Continue') + '</button>' +
      '<button type="button" class="emo-btn is-quiet" data-act="idk">I don’t know</button>' +
      '<button type="button" class="emo-btn is-quiet" data-act="skip">Skip</button></div>';
    h += '<p class="emo-row is-end"><button type="button" class="emo-btn is-link" data-act="stop">Stop and see what we have</button></p>';
    return h + '</div>';
  }
  function collect(sc) {
    var tEl = $('#emo-text'), text = tEl ? tEl.value.trim() : '', v, range = $('#emo-range');
    if (range) v = +range.value;
    else if (sc.type === 'text') v = text ? 'text' : 'skip';
    else if (sc.type === 'words') { v = $$('input[name="emo-w"]:checked').map(function (i) { return i.value; }); if (!v.length) v = 'skip'; }
    else {
      var ch = $$('.emo-opts input:checked').map(function (i) { return i.value; });
      if (sc.type === 'multi') v = ch.length || text ? ch : 'skip';
      else v = ch.length ? ch[0] : (text ? 'text' : 'skip');
    }
    return { v: v, text: text };
  }
  function answer(v, text) {
    var id = S.cur;
    S.ans[id] = v;
    if (text) S.ans[id + ':t'] = text; else delete S.ans[id + ':t'];
    S.hist.push(id); S.cur = E.nextScreen(S, id); prune();
    if (!S.cur) S.phase = 'map';
    render();
  }
  function harmCheck() {
    var note = $('#emo-harm'); if (!note) return;
    var t = $('#emo-text'), on = !!$('input[value="harm"]:checked') || (t && E.harmIn(t.value));
    note.hidden = !on;
  }

  /* ------------------------------------------------------------------ "Here's what I'm hearing" */
  var CATS = [
    ['confirmed', 'Confirmed by you', 'What you told me directly. Edit anything that’s off.'],
    ['likely', 'Likely contributors', 'Your answers pointed to these most strongly. They are still guesses.'],
    ['possible', 'Possible connections', 'Worth a look, with weaker or partial support. Skip any that don’t fit.'],
    ['unknown', 'Still unknown', 'What we didn’t ask, what you weren’t sure of, and what a short session can’t see.']
  ];
  function itemHTML(x, fin) {
    var e = S.editing === x.id, canNo = x.id !== 'c:harm', h = '<li class="emo-item c-' + x.cat + '" data-id="' + esc(x.id) + '">';
    if (e) {
      h += '<div class="emo-editrow"><label class="sr-only" for="emo-ed">Change the wording</label><input id="emo-ed" type="text" maxlength="240" value="' + esc(x.text) + '">' +
        '<button type="button" class="emo-btn is-small" data-act="edit-save">Save</button><button type="button" class="emo-btn is-small is-quiet" data-act="edit-cancel">Cancel</button></div>';
    } else {
      h += '<div><span class="emo-tag">' + esc(x.tag || '') + '</span><span class="emo-text-t">' + esc(x.text) + '</span>' + (x.edited ? ' <span class="emo-edited">(your wording)</span>' : '') + '</div>';
    }
    if (!e) {
      h += '<div class="emo-ib">';
      if (x.cat === 'likely' || x.cat === 'possible') h += '<button type="button" class="emo-btn is-small is-quiet" data-act="confirm">That’s right</button>';
      if (x.cat !== 'unknown') h += '<button type="button" class="emo-btn is-small is-quiet" data-act="edit">Edit</button>';
      if (canNo) h += '<button type="button" class="emo-btn is-small is-quiet" data-act="reject">' + (x.cat === 'unknown' ? 'Hide' : 'That’s not right') + '</button>';
      h += '<details><summary>Why?</summary><ul class="emo-why">' + (x.why.length ? x.why.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') : '<li>You added this yourself.</li>') + '</ul></details></div>';
    }
    return h + '</li>';
  }
  function mapHTML() {
    var fin = curMap(), h = '<div class="emo-card" data-phase="map">';
    h += guide('Before any picture, let’s check what I heard. You can confirm, change or remove any line.');
    h += '<h2 class="emo-qh" id="emo-h" tabindex="-1">Here’s what I’m hearing</h2>';
    h += '<p class="emo-help">These are guesses built from your answers. They are not conclusions, and nothing here says anything about your personality, your past, anyone else, or your mental health.</p>';
    CATS.forEach(function (c) {
      var items = fin.items.filter(function (x) { return x.cat === c[0]; });
      h += '<h3 class="emo-h3">' + c[1] + ' (' + items.length + ')</h3><p class="emo-sub">' + c[2] + '</p>';
      h += items.length ? '<ul class="emo-items">' + items.map(function (x) { return itemHTML(x, fin); }).join('') + '</ul>' : '<p class="emo-empty">Nothing here yet.</p>';
    });
    var kinds = {}; fin.items.forEach(function (x) { if (x.kind && x.cat !== 'unknown') kinds[x.kind] = (kinds[x.kind] || 0) + 1; });
    var kl = Object.keys(kinds).map(function (k) { return kinds[k] + ' ' + D.kinds[k].toLowerCase(); });
    h += '<p class="emo-balance">The map weighs what’s around you (work, home, noise), your body, the people in your life, your thoughts and your needs alike.' + (kl.length ? ' Right now it holds ' + E.list(kl) + '.' : '') + '</p>';
    h += '<form class="emo-add" data-act="add"><label for="emo-add">Something missing? Add it in your own words.</label><input id="emo-add" type="text" maxlength="240" autocomplete="off" placeholder="For example: my landlord has been slow to fix the heat"><button type="submit" class="emo-btn is-small">Add to the map</button></form>';
    if (fin.removed.length) {
      h += '<div class="emo-aside"><strong>Set aside by you</strong><ul>' + fin.removed.map(function (x) { return '<li><span>' + esc(x.text) + '</span> <button type="button" class="emo-btn is-small is-link" data-act="undo" data-id="' + esc(x.id) + '">Put it back</button></li>'; }).join('') + '</ul></div>';
    }
    if (fin.aside.length) h += '<div class="emo-aside"><strong>Checked and set aside by your answers</strong><ul>' + fin.aside.map(function (t) { return '<li>' + esc(t) + '. Your answers didn’t support it.</li>'; }).join('') + '</ul></div>';
    h += '<div class="emo-row"><button type="button" class="emo-btn" data-act="to-art">Make my picture</button>' +
      '<button type="button" class="emo-btn is-quiet" data-act="to-plan">Go to my plan</button>' +
      '<button type="button" class="emo-btn is-quiet" data-act="back-q"' + (S.hist.length ? '' : ' disabled') + '>Back to the questions</button></div>';
    return h + '</div>';
  }

  /* ------------------------------------------------------------------ the picture and its legend */
  function legendHTML(parts) {
    return '<ol class="emo-legend no-bubble">' + parts.map(function (e, i) {
      var open = S.openArt === e.id, sw = e.fams ? e.fams.map(function (f) { return '<span class="emo-sw" style="background:' + f.color + '"></span>'; }).join('') : '<span class="emo-sw" style="background:' + e.color + '"></span>';
      var h = '<li class="emo-leg" id="leg-' + (i + 1) + '" data-id="' + esc(e.id) + '"><span class="emo-num" aria-hidden="true">' + (i + 1) + '</span><div>';
      h += '<h4><span class="sr-only">Part ' + (i + 1) + ': </span>' + sw + ' ' + esc(e.title) + '</h4><p>' + esc(e.meaning) + '</p>';
      if (e.own) h += '<p class="emo-own">What it means to you: “' + esc(e.own) + '”</p>';
      h += '<details><summary>Why?</summary><ul class="emo-why">' + (e.why && e.why.length ? e.why.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') : '<li>It comes from your answers above.</li>') + '</ul></details>';
      h += '<details><summary>Change the color</summary>';
      var rows = e.fams ? e.fams.map(function (f) { return { key: e.id + ':' + f.id, label: f.t, color: f.color }; }) : [{ key: e.id, label: '', color: e.color }];
      rows.forEach(function (r) {
        h += '<div class="emo-swrow">' + (r.label ? '<b>' + esc(r.label) + '</b>' : '') + '<div class="emo-swatches" role="group" aria-label="Color for ' + esc(r.label || e.title) + '">' +
          D.swatches.map(function (c, k) { return '<button type="button" class="emo-sw-btn" data-act="color" data-key="' + esc(r.key) + '" data-c="' + c + '" style="background:' + c + '" aria-label="' + NAMES[k] + '" aria-pressed="' + (c.toLowerCase() === String(r.color).toLowerCase()) + '"></button>'; }).join('') + '</div></div>';
      });
      h += '<p class="emo-sub">Colors are personal. Pick the ones that feel like these things to you.</p></details>';
      if (open) {
        h += '<div class="emo-mine"><label for="emo-mine">What does this mean for you instead? (optional)</label><textarea id="emo-mine" maxlength="240">' + esc(e.own || '') + '</textarea>' +
          '<div class="emo-row"><button type="button" class="emo-btn is-small" data-act="own-save">Save my meaning</button><button type="button" class="emo-btn is-small is-quiet" data-act="own-remove">Remove it from the picture</button><button type="button" class="emo-btn is-small is-link" data-act="own-cancel">Cancel</button></div></div>';
      } else h += '<div class="emo-ib"><button type="button" class="emo-btn is-small is-quiet" data-act="own-open">That’s not right</button></div>';
      return h + '</div></li>';
    }).join('') + '</ol>';
  }
  function artHTML() {
    var parts = artParts(), gone = Object.keys(S.art.removed).filter(function (k) { return S.art.removed[k]; });
    var h = '<div class="emo-card" data-phase="art"><p class="emo-print-only">A picture from my answers, ' + esc(nice(S.at)) + '. Made on spreadloveandacceptance.com. It stays on this device.</p>';
    h += '<h2 class="emo-qh" id="emo-h" tabindex="-1">Your picture</h2>';
    h += '<p class="emo-help emo-noprint">Every shape comes from something you told me. The list under the picture says what each one stands for, in plain words. Change anything that’s off.</p>';
    h += '<div class="emo-figure"><canvas id="emo-canvas" class="emo-canvas" width="1350" height="1350" role="img" aria-label="A calm picture made from your answers, with ' + parts.length + ' numbered parts. The list below it describes every part in words.">The list below describes the picture in words.</canvas>' +
      '<p class="emo-cap"><strong>' + esc(D.disclaimer) + '</strong></p></div>';
    h += '<div class="emo-row emo-noprint"><button type="button" class="emo-btn" data-act="png">Save the image (PNG)</button><button type="button" class="emo-btn is-quiet" data-act="print">Print</button>' +
      '<button type="button" class="emo-btn is-quiet" data-act="numbers" aria-pressed="' + S.numbers + '">' + (S.numbers ? 'Hide the numbers' : 'Show the numbers') + '</button></div>';
    h += '<h3 class="emo-h3">What each part means for you</h3>' + legendHTML(parts);
    if (gone.length) h += '<p class="emo-removed emo-noprint">Removed from the picture: ' + gone.map(function (k) { return '<button type="button" class="emo-btn is-small is-link" data-act="art-back" data-id="' + esc(k) + '">Put back ' + esc(k.replace(/^stone-|^p-/, '').replace(/-/g, ' ')) + '</button>'; }).join(' ') + '</p>';
    h += '<p class="emo-note">Colors are personal associations. A color or shape here means what you say it means, nothing more.</p>';
    h += '<div class="emo-row emo-noprint"><button type="button" class="emo-btn" data-act="to-plan">Go to my plan</button><button type="button" class="emo-btn is-quiet" data-act="to-map">Back to the map</button></div>';
    return h + '</div>';
  }
  function drawCanvas() {
    var c = $('#emo-canvas'); if (!c || !ART) return;
    try { ART.draw(c, artParts(), { seed: seed(), numbers: S.numbers, px: c.width }); } catch (e) { if (window.console) console.error(e); }
  }
  function wrap(ctx, text, w) {
    var words = String(text).split(/\s+/), lines = [], cur = '';
    words.forEach(function (wd) { var t = cur ? cur + ' ' + wd : wd; if (ctx.measureText(t).width > w && cur) { lines.push(cur); cur = wd; } else cur = t; });
    if (cur) lines.push(cur); return lines;
  }
  function exportPng() {
    var parts = artParts(), size = 1800, pad = 70, fs = 30, lh = 42, art = document.createElement('canvas');
    art.width = art.height = size; ART.draw(art, parts, { seed: seed(), numbers: true, px: size });
    var m = document.createElement('canvas').getContext('2d'); m.font = fs + 'px Georgia, serif';
    var rows = parts.map(function (e, i) { return wrap(m, (i + 1) + '.  ' + e.title + '. ' + (e.own ? 'In your words: ' + e.own : e.meaning), size - pad * 2); });
    var cap = wrap(m, D.disclaimer + ' Made on spreadloveandacceptance.com on ' + short(S.at) + '. Nothing was sent anywhere.', size - pad * 2);
    var lines = rows.reduce(function (t, r) { return t + r.length; }, 0), H = size + 70 + lines * lh + parts.length * 16 + 40 + cap.length * lh + 50;
    var out = document.createElement('canvas'); out.width = size; out.height = H; var ctx = out.getContext('2d');
    ctx.fillStyle = '#FBF6EA'; ctx.fillRect(0, 0, size, H); ctx.drawImage(art, 0, 0);
    var y = size + 60; ctx.fillStyle = '#2B2620'; ctx.font = fs + 'px Georgia, serif'; ctx.textBaseline = 'alphabetic';
    rows.forEach(function (r) { r.forEach(function (ln, k) { ctx.fillText(ln, pad + (k ? 46 : 0), y); y += lh; }); y += 16; });
    y += 20; ctx.font = 'italic ' + fs + 'px Georgia, serif'; cap.forEach(function (ln) { ctx.fillText(ln, pad, y); y += lh; });
    function done(url, rev) { var a = document.createElement('a'); a.href = url; a.download = 'my-feelings-picture.png'; document.body.appendChild(a); a.click(); a.remove(); if (rev) setTimeout(function () { URL.revokeObjectURL(url); }, 4000); }
    if (out.toBlob) out.toBlob(function (b) { if (b) done(URL.createObjectURL(b), true); else done(out.toDataURL('image/png')); }, 'image/png'); else done(out.toDataURL('image/png'));
  }

  /* ------------------------------------------------------------------ the plan */
  var MV = { mine: 'in my hands', others: 'needs other people', cant: 'can’t change now' };
  var CTL = [['mine', 'What’s in my hands'], ['others', 'What needs other people'], ['cant', 'What I can’t change right now']];
  function ctlHTML(plan) {
    return '<div class="emo-three">' + CTL.map(function (c) {
      var items = plan.control[c[0]];
      return '<div class="emo-col"><h4>' + c[1] + '</h4>' + (items.length ? '<ul>' + items.map(function (it) {
        return '<li>' + esc(it.t) + '<div class="emo-mv" role="group" aria-label="Move: ' + esc(it.t) + '">' + CTL.filter(function (o) { return o[0] !== c[0]; }).map(function (o) { return '<button type="button" data-act="mv" data-id="' + esc(it.id) + '" data-to="' + o[0] + '">Move to ' + MV[o[0]] + '</button>'; }).join('') + '</div></li>';
      }).join('') + '</ul>' : '<p class="emo-empty">Nothing here.</p>') + '</div>';
    }).join('') + '</div>';
  }
  function ctlLabel(k) { return { mine: 'mine', others: 'others', cant: 'can’t change' }[k]; }
  function planHTML() {
    var fin = curMap(), plan = E.buildPlan(S, fin, S.planEd), h = '<div class="emo-card emo-plan" data-phase="plan"><p class="emo-print-only">My plan, ' + esc(nice(S.at)) + '. Made on spreadloveandacceptance.com. It stays on this device.</p>';
    h += '<h2 class="emo-qh" id="emo-h" tabindex="-1">Your plan</h2>';
    h += '<p class="emo-help">Built from what you confirmed on the map. It’s a place to start, and you know your life better than any tool does.</p>';
    h += '<h3><span class="emo-n">1</span> What is happening</h3><p>' + esc(plan.happening) + '</p>';
    if (plan.harm) h += '<p class="emo-harm">' + esc(D.harmLine) + '</p>';
    h += '<h3><span class="emo-n">2</span> What might be contributing</h3><p class="emo-sub">Ranked, with what supports each one and what’s uncertain. These are guesses to test, never a verdict.</p>';
    function contrib(c) {
      return '<li><strong>' + esc(c.title) + '</strong><span class="emo-pill">' + (c.cat === 'confirmed' ? 'You confirmed' : c.cat === 'likely' ? 'Likely' : 'Possible') + '</span>' +
        '<p><strong>What supports it.</strong> ' + esc(c.supports.slice(0, 3).join(' ')) + '</p><p><strong>What’s uncertain.</strong> ' + esc(c.unsure) + '</p></li>';
    }
    if (plan.contributors.length) {
      h += '<ol class="emo-contrib">' + plan.contributors.slice(0, 6).map(contrib).join('') + '</ol>';
      if (plan.contributors.length > 6) h += '<details class="emo-keep"><summary>Show the other ' + (plan.contributors.length - 6) + '</summary><ol class="emo-contrib" start="7">' + plan.contributors.slice(6).map(contrib).join('') + '</ol></details>';
    } else h += '<p class="emo-empty">We didn’t get far enough to rank anything, and that’s okay. Taking the full set of questions would show more.</p>';
    h += '<h3><span class="emo-n">3</span> What’s within my control, what needs others, what I can’t change now</h3><p class="emo-sub">I sorted these for you. Move any that sit in the wrong place.</p><div id="emo-ctl">' + ctlHTML(plan) + '</div>';
    h += '<h3><span class="emo-n">4</span> First steps</h3><p class="emo-sub">One or two small things, each chosen for a reason you can see.</p><ol class="emo-steps">' + plan.steps.map(function (s) {
      return '<li><h4>' + esc(s.t) + '</h4><p>' + esc(s.d) + '</p><p class="emo-fit"><strong>Why it fits.</strong> ' + esc(s.why) + ' ' + esc((s.whyList || []).join(' ')) + '</p>' +
        (s.link ? '<p><a href="' + esc(s.link[0]) + '">' + esc(s.link[1]) + ' &rarr;</a></p>' : '') + '</li>';
    }).join('') + '</ol>';
    h += '<p class="emo-note">A short session isn’t enough to decide anything big, like confronting someone or ending a relationship. If something like that is on your mind, give it a few days and look again.</p>';
    h += '<h3><span class="emo-n">5</span> How you’ll know it helped</h3><ul class="emo-list">' + plan.signals.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') +
      (E.num(S, 's_int') !== null ? '<li>Your 0 to 10 number comes in lower than the ' + E.num(S, 's_int') + ' you gave today, or the same number feels easier to carry.</li>' : '') + '</ul>';
    h += '<div class="emo-checkin emo-noprint" id="emo-checkin"><strong>Set a check-in</strong><p class="emo-sub">Pick a day. It goes in your own calendar with a plain title, so it says nothing private. Nothing is sent to us.</p>' +
      '<div class="emo-opts" role="radiogroup" aria-label="When to check in">' + [['1', 'Tomorrow'], ['3', 'In 3 days'], ['7', 'In a week'], ['14', 'In two weeks']].map(function (o) { return '<label><input type="radio" name="emo-ci" value="' + o[0] + '"><span>' + o[1] + '</span></label>'; }).join('') + '</div>' +
      '<div id="emo-ci-host"></div><p class="emo-sub">Or take one small minute a day: <a href="/#small-days">Seven small days</a> on the home page.</p></div>';
    h += '<h3>More on this site</h3><ul class="emo-links">' + plan.links.map(function (l) { return '<li><a href="' + esc(l[0]) + '">' + esc(l[1]) + '</a> ' + esc(l[2]) + '</li>'; }).join('') + '</ul>';
    h += '<p class="emo-note emo-noprint">Saving is optional. A saved session stays on this device only, so you can compare it with a later one and delete it anytime. There are no predictions and no diagnosis, only what you told me on each day.</p>';
    h += '<div class="emo-row emo-noprint"><button type="button" class="emo-btn" data-act="save">' + (S.savedId ? 'Save again (replaces this one)' : 'Save this session on this device') + '</button>' +
      '<button type="button" class="emo-btn is-quiet" data-act="print">Print</button><button type="button" class="emo-btn is-quiet" data-act="to-art">See my picture</button><button type="button" class="emo-btn is-quiet" data-act="to-map">Back to the map</button>' +
      '<button type="button" class="emo-btn is-link" data-act="restart">Start over</button>' + (store.sessions.length ? '<button type="button" class="emo-btn is-link" data-act="hist">Past sessions (' + store.sessions.length + ')</button>' : '') + '</div>';
    h += '<p class="emo-saved" id="emo-saved" role="status"></p>';
    return h + '</div>';
  }

  /* ------------------------------------------------------------------ past sessions */
  function sessState(x) { return { id: x.id, at: x.at, path: x.path, ans: x.ans, edits: x.edits || { items: {}, added: [] }, art: x.art || { removed: {}, color: {}, label: {} }, planEd: x.planEd || { ctl: {} }, numbers: true }; }
  function sumOf(x) {
    var st = sessState(x), save = S; S = st; var fin = curMap(), sm = E.summary(st, fin), parts = artParts(); S = save;
    return { st: st, fin: fin, sm: sm, parts: parts };
  }
  function histHTML() {
    var h = '<div class="emo-card" data-phase="hist"><h2 class="emo-qh" id="emo-h" tabindex="-1">Past sessions on this device</h2>';
    h += '<p class="emo-help">Only you can see these. They are not sent anywhere. Pick two to put side by side. This shows what you told me on each day. It doesn’t predict anything and it isn’t a diagnosis.</p>';
    if (!store.sessions.length) h += '<p class="emo-empty">Nothing saved yet. Finish a session and choose “Save this session on this device” to see it here.</p>';
    else {
      h += '<ul class="emo-sess">' + store.sessions.slice().reverse().map(function (x) {
        var r = sumOf(x), sm = r.sm;
        return '<li data-id="' + esc(x.id) + '"><label><input type="checkbox" name="emo-pick" value="' + esc(x.id) + '"><span><strong>' + esc(nice(x.at)) + '</strong><br>Felt ' + esc(sm.feel) + (sm.n !== null ? ', about ' + sm.n + ' out of 10' : '') + '.' +
          (sm.top.length ? ' Main contributors you confirmed or that fit: ' + esc(sm.top.join('; ').toLowerCase()) + '.' : '') + '</span></label>' +
          '<div class="emo-ib"><button type="button" class="emo-btn is-small is-quiet" data-act="open-s" data-id="' + esc(x.id) + '">Open it</button><button type="button" class="emo-btn is-small is-quiet" data-act="del-s" data-id="' + esc(x.id) + '">Delete</button></div></li>';
      }).join('') + '</ul>';
      h += '<div class="emo-row"><button type="button" class="emo-btn" data-act="compare">Compare the two I picked</button><button type="button" class="emo-btn is-quiet" data-act="del-all">Delete all of them</button></div><p class="emo-saved" id="emo-hmsg" role="status"></p>';
    }
    h += '<div class="emo-row"><button type="button" class="emo-btn is-quiet" data-act="new">Start a new session</button></div>';
    return h + '</div>';
  }
  function cmpHTML() {
    var a = compare[0], b = compare[1], ra = sumOf(a), rb = sumOf(b);
    function col(x, r) {
      var conf = r.fin.items.filter(function (i) { return i.cat === 'confirmed' && i.id !== 'c:feel' && i.id !== 'c:int' && i.id !== 'c:dur' && i.id !== 'c:about'; }).slice(0, 5);
      var lik = r.fin.items.filter(function (i) { return i.cat === 'likely' || i.cat === 'possible'; }).slice(0, 7);
      return '<div><h4>' + esc(short(x.at)) + '</h4><p>Felt ' + esc(r.sm.feel) + (r.sm.n !== null ? ', about ' + r.sm.n + ' out of 10' : '') + '.</p><canvas data-cmp="' + esc(x.id) + '" width="600" height="600" role="img" aria-label="Picture from ' + esc(short(x.at)) + ', described in the lists below"></canvas>' +
        '<p><strong>Contributors on that day</strong></p><ul>' + (lik.length ? lik.map(function (i) { return '<li>' + esc(i.text) + '</li>'; }).join('') : '<li>None came up.</li>') + '</ul>' +
        (conf.length ? '<p><strong>Other things you told me</strong></p><ul>' + conf.map(function (i) { return '<li>' + esc(i.text) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
    }
    function ids(r) { return r.fin.items.filter(function (i) { return i.fid || i.pid; }).map(function (i) { return i.fid || ('p:' + i.pid); }); }
    function lab(r, k) { var it = r.fin.items.filter(function (i) { return (i.fid || ('p:' + i.pid)) === k; })[0]; return it ? it.text.replace(/\.$/, '') : k; }
    var ia = ids(ra), ib = ids(rb), both = ia.filter(function (k) { return ib.indexOf(k) >= 0; }), onlyA = ia.filter(function (k) { return ib.indexOf(k) < 0; }), onlyB = ib.filter(function (k) { return ia.indexOf(k) < 0; });
    function ul(arr, r) { return arr.length ? '<ul>' + arr.map(function (k) { return '<li>' + esc(lab(r, k)) + '</li>'; }).join('') + '</ul>' : '<p class="emo-empty">Nothing.</p>'; }
    var h = '<div class="emo-card" data-phase="cmp"><h2 class="emo-qh" id="emo-h" tabindex="-1">Two sessions, side by side</h2>';
    h += '<p class="emo-help">This lines up what you told me on two days. It doesn’t say why anything changed, and it doesn’t predict what comes next.</p>';
    if (ra.sm.n !== null && rb.sm.n !== null) h += '<p>You rated the feeling ' + ra.sm.n + ' out of 10 on ' + esc(short(a.at)) + ' and ' + rb.sm.n + ' out of 10 on ' + esc(short(b.at)) + '.</p>';
    h += '<div class="emo-cmp">' + col(a, ra) + col(b, rb) + '</div>';
    h += '<h3 class="emo-h3">Showed up on both days</h3>' + ul(both, ra) + '<h3 class="emo-h3">Only on ' + esc(short(a.at)) + '</h3>' + ul(onlyA, ra) + '<h3 class="emo-h3">Only on ' + esc(short(b.at)) + '</h3>' + ul(onlyB, rb);
    h += '<div class="emo-row"><button type="button" class="emo-btn is-quiet" data-act="hist">Back to past sessions</button></div></div>';
    return h;
  }

  /* ------------------------------------------------------------------ show the right screen */
  function render() {
    var h;
    if (S && S.phase === 'ask' && !S.cur) S.cur = E.firstScreen(S);
    if (!S) { h = app.dataset.phase === 'hist' ? histHTML() : introHTML(); if (compare) h = cmpHTML(); }
    else if (S.phase === 'ask') h = askHTML();
    else if (S.phase === 'map') h = mapHTML();
    else if (S.phase === 'art') h = artHTML();
    else if (S.phase === 'plan') h = planHTML();
    else h = introHTML();
    app.innerHTML = h;
    app.dataset.phase = S ? S.phase : (compare ? 'cmp' : (app.dataset.phase === 'hist' ? 'hist' : 'intro'));
    app.dataset.screen = S && S.phase === 'ask' ? S.cur : '';
    app.dataset.type = S && S.phase === 'ask' ? E.SCREEN[S.cur].type : '';
    if (S && S.phase === 'art') drawCanvas();
    if (compare && !S) $$('canvas[data-cmp]').forEach(function (c) {
      var x = compare.filter(function (y) { return y.id === c.getAttribute('data-cmp'); })[0], save = S, r;
      S = sessState(x); try { r = artParts(); ART.draw(c, r, { seed: E.seedOf(S), numbers: false, px: c.width }); } catch (e) {} S = save;
    });
    if (S && S.phase === 'ask') harmCheck();
    var f = S && S.focus ? $(S.focus) : null; if (S) S.focus = null;
    if (!f && !first) f = $('#emo-h');
    if (f) f.focus({ preventScroll: !!(S && S.keepScroll) });
    if (S) S.keepScroll = false;
    first = false;
  }

  /* ------------------------------------------------------------------ actions */
  function say(id, t) { var el = $('#' + id); if (el) el.textContent = t; }
  function fromSaved(x) { S = sessState(x); S.cur = null; S.hist = []; S.savedId = x.id; S.editing = null; S.openArt = null; S.phase = 'plan'; }
  function ymd(d) { var p = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  var acts = {
    start: function (t) { S = newSession(t.getAttribute('data-path')); S.cur = E.firstScreen(S); compare = null; render(); },
    hist: function () { S = null; compare = null; app.dataset.phase = 'hist'; render(); },
    'new': function () { S = null; compare = null; app.dataset.phase = 'intro'; render(); },
    back: function () { if (!S.hist.length) return; var sc = E.SCREEN[S.cur], c = collect(sc); S.ans[S.cur] = c.v; if (c.text) S.ans[S.cur + ':t'] = c.text; S.cur = S.hist.pop(); render(); },
    next: function () { var c = collect(E.SCREEN[S.cur]); answer(c.v, c.text); },
    idk: function () { var c = collect(E.SCREEN[S.cur]); answer('idk', ''); void c; },
    skip: function () { answer('skip', ''); },
    stop: function () { var sc = E.SCREEN[S.cur], c = collect(sc); if (c.v !== 'skip') { S.ans[S.cur] = c.v; if (c.text) S.ans[S.cur + ':t'] = c.text; } S.hist.push(S.cur); S.cur = null; S.phase = 'map'; render(); },
    'back-q': function () { if (!S.hist.length) return; S.cur = S.hist.pop(); S.phase = 'ask'; render(); },
    confirm: function (t) { var id = t.closest('[data-id]').getAttribute('data-id'); (S.edits.items[id] = S.edits.items[id] || {}).cat = 'confirmed'; S.keepScroll = true; render(); },
    edit: function (t) { S.editing = t.closest('[data-id]').getAttribute('data-id'); S.focus = '#emo-ed'; S.keepScroll = true; render(); },
    'edit-save': function () {
      var v = $('#emo-ed').value.trim(), id = S.editing, a = S.edits.added.filter(function (x) { return x.id === id; })[0];
      if (v) { if (a) a.text = v; else { var o = S.edits.items[id] = S.edits.items[id] || {}; o.text = v; o.cat = 'confirmed'; } }
      S.editing = null; S.keepScroll = true; render();
    },
    'edit-cancel': function () { S.editing = null; S.keepScroll = true; render(); },
    reject: function (t) {
      var id = t.closest('[data-id]').getAttribute('data-id'), a = S.edits.added.filter(function (x) { return x.id === id; })[0];
      if (a) a.removed = true; else (S.edits.items[id] = S.edits.items[id] || {}).removed = true;
      S.keepScroll = true; render();
    },
    undo: function (t) { var id = t.getAttribute('data-id'); if (S.edits.items[id]) delete S.edits.items[id].removed; var a = S.edits.added.filter(function (x) { return x.id === id; })[0]; if (a) a.removed = false; S.keepScroll = true; render(); },
    'to-art': function () { S.phase = 'art'; render(); },
    'to-plan': function () { S.phase = 'plan'; render(); },
    'to-map': function () { S.phase = 'map'; render(); },
    color: function (t) { var k = t.getAttribute('data-key'); S.art.color[k] = t.getAttribute('data-c'); var open = $$('.emo-leg details[open]').map(function (d) { return d.parentNode.parentNode.id; }); S.keepScroll = true; render(); open.forEach(function (id) { var d = $('#' + id + ' details:nth-of-type(2)'); if (d) d.open = true; }); var b = $('[data-key="' + k + '"][data-c="' + S.art.color[k] + '"]'); if (b) b.focus({ preventScroll: true }); },
    'own-open': function (t) { S.openArt = t.closest('[data-id]').getAttribute('data-id'); S.focus = '#emo-mine'; S.keepScroll = true; render(); },
    'own-save': function () { var v = $('#emo-mine').value.trim(); if (v) S.art.label[S.openArt] = v; else delete S.art.label[S.openArt]; S.openArt = null; S.keepScroll = true; render(); },
    'own-remove': function () { S.art.removed[S.openArt] = true; S.openArt = null; S.keepScroll = true; render(); },
    'own-cancel': function () { S.openArt = null; S.keepScroll = true; render(); },
    'art-back': function (t) { delete S.art.removed[t.getAttribute('data-id')]; S.keepScroll = true; render(); },
    numbers: function () { S.numbers = !S.numbers; S.keepScroll = true; render(); S.focus = null; var b = $('[data-act="numbers"]'); if (b) b.focus({ preventScroll: true }); },
    png: function () { exportPng(); },
    print: function () { window.print(); },
    mv: function (t) { S.planEd.ctl[t.getAttribute('data-id')] = t.getAttribute('data-to'); var plan = E.buildPlan(S, curMap(), S.planEd), box = $('#emo-ctl'); box.innerHTML = ctlHTML(plan); var b = $('#emo-ctl [data-id="' + t.getAttribute('data-id') + '"]'); if (b) b.focus({ preventScroll: true }); },
    save: function () {
      var x = { id: S.savedId || uid(), at: S.at, path: S.path, ans: copy(S.ans), edits: copy(S.edits), art: copy(S.art), planEd: copy(S.planEd) };
      var i = -1; store.sessions.forEach(function (y, k) { if (y.id === x.id) i = k; });
      if (i >= 0) store.sessions[i] = x; else { store.sessions.push(x); if (store.sessions.length > MAXS) store.sessions.shift(); }
      S.savedId = x.id;
      say('emo-saved', save() ? 'Saved on this device. Find it under “Past sessions”, and delete it anytime.' : 'Your browser wouldn’t let this page save. Nothing was kept.');
    },
    restart: function () { S = null; compare = null; app.dataset.phase = 'intro'; first = false; render(); },
    'open-s': function (t) { var id = t.getAttribute('data-id'), x = store.sessions.filter(function (y) { return y.id === id; })[0]; if (x) { fromSaved(x); render(); } },
    'del-s': function (t) {
      if (t.getAttribute('data-sure') !== '1') { t.setAttribute('data-sure', '1'); t.textContent = 'Tap again to delete'; return; }
      var id = t.getAttribute('data-id'); store.sessions = store.sessions.filter(function (y) { return y.id !== id; }); save(); app.dataset.phase = 'hist'; render(); say('emo-hmsg', 'Deleted.');
    },
    'del-all': function (t) {
      if (t.getAttribute('data-sure') !== '1') { t.setAttribute('data-sure', '1'); t.textContent = 'Tap again to delete all'; return; }
      store.sessions = []; save(); try { localStorage.removeItem(KEY); } catch (e) {} app.dataset.phase = 'hist'; render(); say('emo-hmsg', 'Everything this page kept is gone.');
    },
    compare: function () {
      var ids = $$('input[name="emo-pick"]:checked').map(function (i) { return i.value; });
      if (ids.length !== 2) { say('emo-hmsg', 'Pick exactly two sessions to compare.'); return; }
      compare = ids.map(function (id) { return store.sessions.filter(function (y) { return y.id === id; })[0]; }).filter(Boolean).sort(function (p, q) { return p.at < q.at ? -1 : 1; });
      if (compare.length === 2) { S = null; render(); } else compare = null;
    }
  };
  app.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!t || t.tagName === 'FORM' || !app.contains(t)) return;
    var f = acts[t.getAttribute('data-act')]; if (f) { e.preventDefault(); f(t); }
  });
  app.addEventListener('submit', function (e) {
    var f = e.target.closest ? e.target.closest('form[data-act="add"]') : null; if (!f) return;
    e.preventDefault();
    var v = $('#emo-add').value.trim(); if (!v) return;
    S.edits.added.push({ id: 'a:' + uid(), text: v }); S.keepScroll = true; S.focus = '#emo-add'; render();
  });
  app.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches && t.matches('.emo-opts input[data-x]') && t.checked) $$('.emo-opts input', t.closest('.emo-opts')).forEach(function (i) { if (i !== t) i.checked = false; });
    else if (t.matches && t.matches('.emo-opts input[type=checkbox]') && t.checked) { var x = $('.emo-opts input[data-x]', t.closest('.emo-opts')); if (x) x.checked = false; }
    if (t.name === 'emo-ci' && window.TOLRemind) {
      var d = new Date(); d.setDate(d.getDate() + (+t.value)); var host = $('#emo-ci-host'); host.innerHTML = '';
      window.TOLRemind.once(host, { date: ymd(d), to: '/what-am-i-feeling.html', what: 'A quick look at how things are going. Open the page, take the short version, and compare with last time if you saved it.' });
      var tm = host.querySelector('input[type=time]'); if (tm) tm.focus({ preventScroll: true });
    }
    if (S && S.phase === 'ask') harmCheck();
  });
  app.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'emo-range') { var o = $('#emo-out'); o.innerHTML = t.value + ' <small>out of 10</small>'; t.setAttribute('aria-valuetext', t.value + ' out of 10'); }
    else if (t.id === 'emo-text') harmCheck();
  });
  app.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.id === 'emo-text') { e.preventDefault(); acts.next(); }
    if (e.key === 'Enter' && e.target.id === 'emo-ed') { e.preventDefault(); acts['edit-save'](); }
  });
  render();
})();
