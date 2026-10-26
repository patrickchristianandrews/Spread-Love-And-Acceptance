/* buddies-music-video-maker.js — make your own Frequency Buddies theme song music video.

   Built on the music video's own renderer (buddies-music-video.js): a creation is a plain "plan" the renderer
   draws from — for each of the seven parts of the song a backdrop, a stage, the lights, effects and a dance move,
   plus who is on stage (and as what) and what everyone wears in each part.
   - Saved creations stay in this browser only (localStorage). Nothing is sent anywhere.
   - Share puts the whole creation in the link itself (after the #), so opening the link replays it on the site.
   - "Save as a video" records the picture and the song in this browser, where the browser can do that. */
(function () {
  'use strict';
  var MV = window.TOLMusicVideo; if (!MV || !MV.mount) return;
  var SEC = MV.sections, OPT = MV.opt, CAST = MV.cast, NS = SEC.length;
  var NAMES = { tidbit: 'Tidbit', sugarfoot: 'Sugarfoot', ducklings: 'The ducklings', snail: 'Dot the snail', owl: 'Ollie the owl', robot: 'Beep the robot', frog: 'Hopper the frog', squirrel: 'Nutmeg the squirrel', butterfly: 'The butterfly', puddles: 'Professor Puddles', moon: 'The Moon' };
  var EMOJI = { tidbit: '🐶', sugarfoot: '🐕', ducklings: '🐥', snail: '🐌', owl: '🦉', robot: '🤖', frog: '🐸', squirrel: '🐿️', butterfly: '🦋', puddles: '💧', moon: '🌙' };
  var KEY = 'tol-mv-maker-v1', MAXSLOTS = 6;
  function ix(k, id) { for (var i = 0; i < OPT[k].length; i++) if (OPT[k][i][0] === id) return i; return 0; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function memGet() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function memSet(m) { try { localStorage.setItem(KEY, JSON.stringify(m)); return true; } catch (e) { return false; } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- starter shows ----------
  function plan(o) {
    var p = { title: o.title || '', sec: [], role: {}, fit: {} };
    for (var i = 0; i < NS; i++) p.sec.push({ back: ix('back', o.back[i]), light: ix('light', o.light[i]), fx: o.fx[i], move: ix('move', o.move[i]), stage: ix('stage', o.stage[i]) });
    CAST.forEach(function (id) { p.role[id] = ix('role', (o.role || {})[id] || 'off'); var f = (o.fit && (o.fit[id] || o.fit['*'])) || ['none']; p.fit[id] = []; for (var j = 0; j < NS; j++) p.fit[id].push(ix('fit', f[Math.min(j, f.length - 1)])); });
    return p;
  }
  var C = 1, H = 2, F = 4, B = 8, S = 16; // confetti, hearts, fireworks, bubbles, sparkles
  var PRESETS = [
    { id: 'classic', name: 'The big show', make: function () { return plan({ title: 'The big show',
      back: ['night', 'night', 'sunset', 'party', 'space', 'sea', 'finale'], light: ['cool', 'spot', 'warm', 'party', 'cool', 'warm', 'rainbow'], fx: [S, S, H, C | H, S, B, C | F | H],
      move: ['side', 'free', 'side', 'conga', 'mirror', 'slide', 'pose'], stage: ['classic', 'risers', 'classic', 'classic', 'split', 'turntable', 'lift'],
      role: { tidbit: 'lead', sugarfoot: 'lead', ducklings: 'backup', snail: 'backup', robot: 'drums', frog: 'keys', owl: 'horns', squirrel: 'guitar', butterfly: 'chorus', puddles: 'chorus', moon: 'lead' },
      fit: { '*': ['tophat', 'rock', 'flowers', 'sparkle', 'astro', 'pirate', 'band'] } }); } },
    { id: 'rock', name: 'Rock concert', make: function () { return plan({ title: 'Rock concert',
      back: ['party', 'party', 'rainbow', 'party', 'space', 'party', 'finale'], light: ['party', 'spot', 'rainbow', 'party', 'cool', 'party', 'rainbow'], fx: [C, S, S, C | F, S, C | F, C | F | S],
      move: ['jump', 'free', 'side', 'jump', 'slide', 'free', 'pose'], stage: ['classic', 'risers', 'classic', 'lift', 'split', 'classic', 'lift'],
      role: { tidbit: 'lead', sugarfoot: 'lead', robot: 'drums', frog: 'keys', owl: 'horns', squirrel: 'guitar', ducklings: 'chorus', puddles: 'backup', snail: 'crowd' },
      fit: { '*': ['rock'], tidbit: ['rock', 'rock', 'rock', 'sparkle', 'rock', 'rock', 'sparkle'], sugarfoot: ['rock', 'rock', 'rock', 'sparkle', 'rock', 'rock', 'sparkle'] } }); } },
    { id: 'beach', name: 'Beach party', make: function () { return plan({ title: 'Beach party',
      back: ['sea', 'sea', 'sunset', 'sea', 'sunset', 'sea', 'sunset'], light: ['warm', 'warm', 'warm', 'party', 'warm', 'rainbow', 'warm'], fx: [B, B, H | B, B | C, H, B | S, C | H | B],
      move: ['side', 'free', 'side', 'conga', 'mirror', 'slide', 'pose'], stage: ['classic', 'classic', 'risers', 'classic', 'turntable', 'classic', 'lift'],
      role: { tidbit: 'lead', sugarfoot: 'lead', frog: 'lead', ducklings: 'backup', snail: 'backup', squirrel: 'guitar', robot: 'drums', butterfly: 'chorus', moon: 'lead' },
      fit: { '*': ['flowers', 'flowers', 'flowers', 'pirate', 'flowers', 'pirate', 'flowers'] } }); } },
    { id: 'space', name: 'Space show', make: function () { return plan({ title: 'Space show',
      back: ['space', 'space', 'night', 'space', 'space', 'space', 'finale'], light: ['cool', 'spot', 'cool', 'rainbow', 'cool', 'party', 'rainbow'], fx: [S, S, S, F | S, S | B, F | C, F | C | S],
      move: ['side', 'spin', 'mirror', 'conga', 'free', 'jump', 'pose'], stage: ['classic', 'turntable', 'classic', 'split', 'turntable', 'classic', 'lift'],
      role: { tidbit: 'lead', sugarfoot: 'lead', robot: 'lead', puddles: 'backup', owl: 'horns', frog: 'keys', ducklings: 'chorus', moon: 'lead' },
      fit: { '*': ['astro'], tidbit: ['astro', 'astro', 'astro', 'sparkle', 'astro', 'astro', 'royal'], sugarfoot: ['astro', 'astro', 'astro', 'sparkle', 'astro', 'astro', 'royal'] } }); } },
    { id: 'camp', name: 'Cozy campfire', make: function () { return plan({ title: 'Cozy campfire',
      back: ['campfire', 'campfire', 'campfire', 'night', 'campfire', 'snow', 'campfire'], light: ['warm', 'spot', 'warm', 'warm', 'warm', 'cool', 'warm'], fx: [S, S, H, H | S, S, S, H | S],
      move: ['side', 'side', 'mirror', 'side', 'mirror', 'conga', 'pose'], stage: ['classic', 'classic', 'classic', 'classic', 'classic', 'classic', 'classic'],
      role: { tidbit: 'lead', sugarfoot: 'lead', owl: 'horns', squirrel: 'guitar', snail: 'chorus', ducklings: 'chorus', puddles: 'backup', moon: 'lead' },
      fit: { '*': ['none', 'none', 'flowers', 'flowers', 'none', 'none', 'flowers'] } }); } }
  ];

  // ---------- a creation, written into a short link ----------
  function encode(p) {
    var s = '1', b36 = function (n) { return clamp(n | 0, 0, 35).toString(36); };
    p.sec.forEach(function (x) { s += b36(x.back) + b36(x.light) + b36(x.fx) + b36(x.move) + b36(x.stage); });
    CAST.forEach(function (id) { s += b36(p.role[id]); });
    CAST.forEach(function (id) { for (var i = 0; i < NS; i++) s += b36(p.fit[id][i]); });
    if (p.title) s += '~' + encodeURIComponent(p.title.slice(0, 40));
    return s;
  }
  function decode(code) {
    try {
      code = String(code || ''); var ti = code.indexOf('~'), title = '';
      if (ti >= 0) { title = decodeURIComponent(code.slice(ti + 1)).slice(0, 40); code = code.slice(0, ti); }
      if (code[0] !== '1' || code.length !== 1 + NS * 5 + CAST.length + CAST.length * NS || !/^[0-9a-z]+$/.test(code)) return null;
      var k = 1, n = function (max) { var v = parseInt(code[k++], 36); return clamp(isNaN(v) ? 0 : v, 0, max); };
      var p = { title: title, sec: [], role: {}, fit: {} };
      for (var i = 0; i < NS; i++) p.sec.push({ back: n(OPT.back.length - 1), light: n(OPT.light.length - 1), fx: n(31), move: n(OPT.move.length - 1), stage: n(OPT.stage.length - 1) });
      CAST.forEach(function (id) { p.role[id] = n(OPT.role.length - 1); });
      CAST.forEach(function (id) { p.fit[id] = []; for (var j = 0; j < NS; j++) p.fit[id].push(n(OPT.fit.length - 1)); });
      return p;
    } catch (e) { return null; }
  }
  function linkFor(p) { return location.origin + location.pathname + '#mv=' + encode(p); }

  // ---------- surprises ----------
  function surpriseSection(p, i) {
    var x = p.sec[i]; x.back = Math.floor(Math.random() * OPT.back.length); x.light = Math.floor(Math.random() * OPT.light.length);
    x.move = Math.floor(Math.random() * OPT.move.length); x.stage = Math.random() < 0.4 ? 0 : Math.floor(Math.random() * OPT.stage.length);
    var n = 1 + Math.floor(Math.random() * 2); x.fx = 0; for (var k = 0; k < n; k++) x.fx |= 1 << Math.floor(Math.random() * 5);
    var all = Math.random() < 0.5 ? Math.floor(Math.random() * OPT.fit.length) : -1;
    CAST.forEach(function (id) { p.fit[id][i] = all >= 0 ? all : Math.floor(Math.random() * OPT.fit.length); });
  }
  function surpriseAll(p) {
    var guests = CAST.filter(function (id) { return id !== 'tidbit' && id !== 'sugarfoot' && id !== 'moon'; });
    p.role.tidbit = ix('role', pick(['lead', 'lead', 'lead', 'backup'])); p.role.sugarfoot = ix('role', pick(['lead', 'lead', 'lead', 'backup']));
    var band = ['drums', 'keys', 'horns', 'guitar'].filter(function () { return Math.random() < 0.7; });
    guests.forEach(function (id) { p.role[id] = ix('role', Math.random() < 0.15 ? 'off' : pick(['lead', 'backup', 'backup', 'chorus', 'chorus', 'crowd'])); });
    band.forEach(function (r) { var g = pick(guests); p.role[g] = ix('role', r); });
    p.role.moon = Math.random() < 0.6 ? 1 : 0;
    for (var i = 0; i < NS; i++) surpriseSection(p, i);
    p.title = pick(['My superstar show', 'The best show ever', 'Pals on stage', 'Our big night', 'Dance party!', 'The sparkle show']);
  }

  // ---------- the page ----------
  function mount(root) {
    var mem = memGet(), shared = null;
    var m = /#mv=([^&]+)/.exec(location.hash || ''); if (m) shared = decode(m[1]);
    var P = shared || decode(mem.current) || PRESETS[0].make();
    var sel = 0, tab = 'stage', recUrl = null, playing = 0, tl = null, player = null;
    function current() { return P; }
    function changed(noSave) { delete P._g; if (!noSave) { var mm = memGet(); mm.current = encode(P); memSet(mm); } if (player) player.refresh(); render(); }

    root.innerHTML =
      '<div class="mvm-player"></div>' +
      '<div class="mvm-bar" role="toolbar" aria-label="Your music video">' +
        '<button type="button" class="mvm-b is-main mvm-play">▶ Play my video</button>' +
        '<button type="button" class="mvm-b is-share mvm-share">🔗 Share</button>' +
        '<button type="button" class="mvm-b mvm-surprise-all">🎲 Surprise me</button>' +
        '<button type="button" class="mvm-b mvm-rec">🎥 Save as a video</button>' +
      '</div>' +
      '<p class="mvm-recnote" aria-live="polite" hidden></p>' +
      '<div class="mvm-name"><label for="mvm-title">Name your video</label><input id="mvm-title" maxlength="40" autocomplete="off" placeholder="My superstar show"></div>' +
      '<section class="mvm-card" aria-labelledby="mvm-pre-h"><h2 id="mvm-pre-h">Start from a show</h2><div class="mvm-chips mvm-presets"></div></section>' +
      '<section class="mvm-card mvm-edit" aria-labelledby="mvm-tl-h"><h2 id="mvm-tl-h">The song, part by part</h2>' +
        '<p class="mvm-help">Pick a part of the song, then choose how it looks. The picture above shows your changes right away.</p>' +
        '<div class="mvm-tl" role="group" aria-label="Parts of the song"></div>' +
        '<div class="mvm-sechead"><h3 class="mvm-secname"></h3><div class="mvm-secbtns"><button type="button" class="mvm-b mvm-surprise-sec">🎲 Surprise me for this part</button><button type="button" class="mvm-b mvm-copyall">Use this for every part</button></div></div>' +
        '<div class="mvm-tabs" role="tablist" aria-label="What to change"></div>' +
        '<div class="mvm-panel" role="tabpanel" tabindex="0"></div>' +
      '</section>' +
      '<section class="mvm-card" aria-labelledby="mvm-save-h"><h2 id="mvm-save-h">Save it on this device</h2>' +
        '<p class="mvm-help">Keep up to ' + MAXSLOTS + ' videos here. They stay in this browser only.</p>' +
        '<div class="mvm-row"><button type="button" class="mvm-b is-main mvm-save">💾 Save</button><button type="button" class="mvm-b mvm-share">🔗 Share</button></div>' +
        '<ul class="mvm-slots"></ul><p class="mvm-msg" aria-live="polite"></p>' +
        '<div class="mvm-linkbox" hidden><label for="mvm-link">Your link</label><input id="mvm-link" readonly></div>' +
      '</section>';
    var $ = function (s) { return root.querySelector(s); };
    var startShared = '<p class="fbmv-k">A music video, just for you</p><h3>Someone made this for you!</h3><p class="mvm-st-title"></p><div class="fbmv-row"><button type="button" class="fbmv-b is-main fbmv-go">▶ Play it</button><button type="button" class="fbmv-b mvm-own">🎬 Make your own</button></div>';
    var startMine = '<p class="fbmv-k">The music video maker</p><h3>Make your own music video!</h3><p>Pick the stage, the lights, the moves and the outfits below, then press Play.</p><div class="fbmv-row"><button type="button" class="fbmv-b is-main fbmv-go">▶ Play my video</button></div>';
    var endHtml = '<p class="fbmv-k">That’s a wrap!</p><h3>What a show!</h3><div class="fbmv-row"><button type="button" class="fbmv-b is-main fbmv-again">↺ Watch it again</button><button type="button" class="fbmv-b fbmv-share2">🔗 Share it</button><button type="button" class="fbmv-b mvm-edit-it">✏️ Keep editing</button></div>';
    var hostEl = $('.mvm-player'); hostEl.setAttribute('data-mv-host', '');
    MV.mount(hostEl, { plan: current, startHtml: shared ? startShared : startMine, endHtml: endHtml, onSection: function (ci) { playing = ci; if (tl) paintTl(); },
      shareData: function () { return { title: (P.title || 'My Frequency Buddies music video') + ' · Frequency Buddies', text: 'Watch the Frequency Buddies music video I made!', url: linkFor(P) }; } });
    player = MV.player;
    if (shared) { var stt = hostEl.querySelector('.mvm-st-title'); if (stt) stt.textContent = P.title ? '“' + P.title + '”' : 'A Frequency Buddies theme song music video.'; }
    var own = hostEl.querySelector('.mvm-own'); if (own) own.addEventListener('click', function () { try { history.replaceState(null, '', location.pathname); } catch (e) {} hostEl.querySelector('.fbmv-start').hidden = true; $('.mvm-edit').scrollIntoView({ behavior: 'smooth', block: 'start' }); changed(); });
    var eit = hostEl.querySelector('.mvm-edit-it'); if (eit) eit.addEventListener('click', function () { hostEl.querySelector('.fbmv-end').hidden = true; $('.mvm-edit').scrollIntoView({ behavior: 'smooth', block: 'start' }); });

    // the toolbar
    $('.mvm-play').addEventListener('click', function () { player.seek(0); player.play(); hostEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    Array.prototype.forEach.call(root.querySelectorAll('.mvm-share'), function (b) { b.addEventListener('click', function () {
      var url = linkFor(P); $('.mvm-linkbox').hidden = false; $('#mvm-link').value = url;
      MV.share({ title: (P.title || 'My Frequency Buddies music video') + ' · Frequency Buddies', text: 'Watch the Frequency Buddies music video I made!', url: url }, function (msg) { say(msg); player.flash(msg); });
    }); });
    $('#mvm-link').addEventListener('focus', function () { this.select(); });
    $('.mvm-surprise-all').addEventListener('click', function () { surpriseAll(P); $('#mvm-title').value = P.title; changed(); say('Surprise! A brand-new show. Press Play to see it.'); player.seek(SEC[sel].a + (sel ? 0.9 : 5)); });
    var title = $('#mvm-title'); title.value = P.title || '';
    title.addEventListener('input', function () { P.title = title.value.slice(0, 40); var mm = memGet(); mm.current = encode(P); memSet(mm); });
    // save as a video
    var recBtn = $('.mvm-rec'), recNote = $('.mvm-recnote');
    if (!player.recSupported()) { recNote.hidden = false; recNote.textContent = 'This browser can’t save the video as a file. Try Chrome, Edge or Firefox on a computer, or press Share to send the link instead.'; recBtn.disabled = true; recBtn.setAttribute('aria-disabled', 'true'); }
    recBtn.addEventListener('click', function () {
      if (player.recording()) { player.recStop(true); return; }
      if (recUrl) { try { URL.revokeObjectURL(recUrl); } catch (e) {} recUrl = null; }
      recNote.hidden = false; recNote.textContent = 'Recording… your video plays once from the start (about a minute and a half). Keep this tab open. Press Stop to cancel.';
      recBtn.textContent = '■ Stop recording';
      player.record(function (r) {
        recBtn.textContent = '🎥 Save as a video';
        if (r.error) { recNote.textContent = r.error === 'nosong' ? 'The song couldn’t load, so the video can’t be saved right now. Try again in a moment.' : 'This browser can’t save the video as a file. Press Share to send the link instead.'; return; }
        if (r.cancelled) { recNote.textContent = 'Recording stopped.'; return; }
        recUrl = r.url; var nm = (P.title || 'My Frequency Buddies music video').replace(/[^\w ’'!-]+/g, '').trim() || 'My music video';
        recNote.innerHTML = 'Your video is ready! <a class="mvm-b is-main" href="' + recUrl + '" download="' + esc(nm) + '.' + r.ext + '">⬇ Download it (' + Math.max(1, Math.round(r.blob.size / 1048576)) + ' MB, ' + r.ext.toUpperCase() + ')</a>';
      });
    });

    // presets
    var pre = $('.mvm-presets');
    PRESETS.forEach(function (pr) { var b = document.createElement('button'); b.type = 'button'; b.className = 'mvm-chip'; b.textContent = pr.name; b.addEventListener('click', function () { P = pr.make(); title.value = P.title; changed(); say('Starting from “' + pr.name + '.” Change anything you like.'); player.seek(SEC[sel].a + (sel ? 0.9 : 5)); }); pre.appendChild(b); });

    // the timeline across the top
    tl = $('.mvm-tl');
    SEC.forEach(function (S2, i) { var b = document.createElement('button'); b.type = 'button'; b.className = 'mvm-seg'; b.style.flexGrow = String(Math.max(4, S2.b - S2.a)); b.innerHTML = '<span class="n">' + (i + 1) + '</span><span class="t">' + esc(S2.name) + '</span>'; b.addEventListener('click', function () { selectSec(i, true); }); tl.appendChild(b); });
    function selectSec(i, jump) { sel = i; if (jump) { player.seek(SEC[i].a + (i ? 0.9 : 5)); } render(); }
    function paintTl() { Array.prototype.forEach.call(tl.children, function (b, i) { b.setAttribute('aria-pressed', String(i === sel)); b.classList.toggle('is-now', i === playing); b.setAttribute('aria-label', 'Part ' + (i + 1) + ': ' + SEC[i].name + (i === playing ? ', playing now' : '')); }); }
    $('.mvm-surprise-sec').addEventListener('click', function () { surpriseSection(P, sel); changed(); say('Surprise! ' + SEC[sel].name + ' has a new look.'); });
    $('.mvm-copyall').addEventListener('click', function () { var x = P.sec[sel]; for (var i = 0; i < NS; i++) if (i !== sel) { P.sec[i] = { back: x.back, light: x.light, fx: x.fx, move: x.move, stage: x.stage }; CAST.forEach(function (id) { P.fit[id][i] = P.fit[id][sel]; }); } changed(); say('Every part now looks like ' + SEC[sel].name + '.'); });

    // the tabs
    var TABS = [['stage', '🎭 Stage & lights'], ['fx', '✨ Effects'], ['moves', '💃 Dance moves'], ['fits', '🎩 Costumes'], ['cast', '🐾 Who’s on stage']];
    var tabsEl = $('.mvm-tabs'), panel = $('.mvm-panel');
    TABS.forEach(function (tb, i) { var b = document.createElement('button'); b.type = 'button'; b.className = 'mvm-tab'; b.id = 'mvm-tab-' + tb[0]; b.setAttribute('role', 'tab'); b.textContent = tb[1]; b.addEventListener('click', function () { tab = tb[0]; render(); }); b.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); var j = (i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length; tab = TABS[j][0]; render(); tabsEl.children[j].focus(); } }); tabsEl.appendChild(b); });
    function chips(label, k, val, onPick, multi) {
      var wrap = document.createElement('div'); wrap.className = 'mvm-group'; var h = document.createElement('h4'); h.textContent = label; wrap.appendChild(h);
      var row = document.createElement('div'); row.className = 'mvm-chips'; row.setAttribute('role', 'group'); row.setAttribute('aria-label', label);
      OPT[k].forEach(function (o, i) { var b = document.createElement('button'); b.type = 'button'; b.className = 'mvm-chip'; b.textContent = o[1]; var on = multi ? !!(val & (1 << i)) : val === i; b.setAttribute('aria-pressed', String(on)); b.addEventListener('click', function () { onPick(i); }); row.appendChild(b); });
      wrap.appendChild(row); return wrap;
    }
    function select(label, id, opts, val, onPick) {
      var w = document.createElement('div'); w.className = 'mvm-sel'; var l = document.createElement('label'); l.htmlFor = id; l.innerHTML = label; var s2 = document.createElement('select'); s2.id = id;
      opts.forEach(function (o) { var op = document.createElement('option'); op.value = String(o[0]); op.textContent = o[1]; if (o[0] === val) op.selected = true; s2.appendChild(op); });
      s2.addEventListener('change', function () { onPick(+s2.value); }); w.appendChild(l); w.appendChild(s2); return w;
    }
    function onStage() { return CAST.filter(function (id) { return P.role[id] > 0; }); }
    function render() {
      paintTl();
      $('.mvm-secname').textContent = 'Part ' + (sel + 1) + ': ' + SEC[sel].name;
      Array.prototype.forEach.call(tabsEl.children, function (b, i) { var on = TABS[i][0] === tab; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on) panel.setAttribute('aria-labelledby', b.id); });
      var x = P.sec[sel]; panel.innerHTML = '';
      $('.mvm-sechead').hidden = tab === 'cast';
      if (tab === 'stage') {
        panel.appendChild(chips('Backdrop', 'back', x.back, function (i) { x.back = i; changed(); }));
        panel.appendChild(chips('The stage', 'stage', x.stage, function (i) { x.stage = i; changed(); }));
        panel.appendChild(chips('Lights', 'light', x.light, function (i) { x.light = i; changed(); }));
      } else if (tab === 'fx') {
        panel.appendChild(chips('Effects (pick as many as you like)', 'fx', x.fx, function (i) { x.fx ^= 1 << i; changed(); }, true));
      } else if (tab === 'moves') {
        panel.appendChild(chips('Everyone dancing does…', 'move', x.move, function (i) { x.move = i; changed(); }));
        var n = document.createElement('p'); n.className = 'mvm-help'; n.textContent = 'The band keeps playing and the crowd keeps cheering. The singers sing their own lines.'; panel.appendChild(n);
      } else if (tab === 'fits') {
        panel.appendChild(chips('Everyone wears', 'fit', -1, function (i) { CAST.forEach(function (id) { P.fit[id][sel] = i; }); changed(); }));
        var grid = document.createElement('div'); grid.className = 'mvm-sels';
        onStage().forEach(function (id) { grid.appendChild(select(EMOJI[id] + ' ' + esc(NAMES[id]), 'mvm-fit-' + id, OPT.fit.map(function (o, i) { return [i, o[1]]; }), P.fit[id][sel], function (v) { P.fit[id][sel] = v; changed(); })); });
        panel.appendChild(grid);
      } else {
        var h4 = document.createElement('p'); h4.className = 'mvm-help'; h4.textContent = 'Pick who joins the show and what each one does. This is the same for the whole song.'; panel.appendChild(h4);
        var grid2 = document.createElement('div'); grid2.className = 'mvm-sels';
        CAST.forEach(function (id) {
          var roles = id === 'moon' ? [[0, 'Not today'], [1, 'Up in the sky']] : (id === 'tidbit' || id === 'sugarfoot') ? OPT.role.map(function (o, i) { return [i, o[1]]; }).filter(function (o) { var r = OPT.role[o[0]][0]; return r !== 'off'; }) : OPT.role.map(function (o, i) { return [i, o[1]]; });
          grid2.appendChild(select(EMOJI[id] + ' ' + esc(NAMES[id]), 'mvm-role-' + id, roles, P.role[id], function (v) { P.role[id] = v; changed(); }));
        });
        panel.appendChild(grid2);
      }
    }
    // saving on this device
    function say(t) { $('.mvm-msg').textContent = t; }
    function slots() { var mm = memGet(); return Array.isArray(mm.slots) ? mm.slots : []; }
    function paintSlots() {
      var ul = $('.mvm-slots'), L = slots(); ul.innerHTML = '';
      if (!L.length) { ul.innerHTML = '<li class="mvm-empty">Nothing saved yet.</li>'; return; }
      L.forEach(function (sl, i) {
        var li = document.createElement('li'); li.innerHTML = '<span>' + esc(sl.name || 'My music video') + '</span>';
        var lo = document.createElement('button'); lo.type = 'button'; lo.className = 'mvm-b'; lo.textContent = 'Open'; lo.setAttribute('aria-label', 'Open ' + (sl.name || 'My music video'));
        lo.addEventListener('click', function () { var p = decode(sl.code); if (!p) { say('That one couldn’t be opened.'); return; } P = p; title.value = P.title || ''; changed(); say('Opened “' + (sl.name || 'My music video') + '.”'); });
        var del = document.createElement('button'); del.type = 'button'; del.className = 'mvm-b'; del.textContent = 'Delete'; del.setAttribute('aria-label', 'Delete ' + (sl.name || 'My music video'));
        del.addEventListener('click', function () { var mm = memGet(), A = slots(); A.splice(i, 1); mm.slots = A; memSet(mm); paintSlots(); say('Deleted.'); });
        li.appendChild(lo); li.appendChild(del); ul.appendChild(li);
      });
    }
    $('.mvm-save').addEventListener('click', function () {
      var mm = memGet(), A = slots(), name = (P.title || '').trim() || 'My music video ' + (A.length + 1), code = encode(P), at = -1;
      A.forEach(function (sl, i) { if (sl.name === name) at = i; });
      if (at >= 0) A[at] = { name: name, code: code }; else { if (A.length >= MAXSLOTS) { say('Your ' + MAXSLOTS + ' spots are full. Delete one to save this one.'); return; } A.push({ name: name, code: code }); }
      mm.slots = A; say(memSet(mm) ? 'Saved “' + name + '” on this device.' : 'This browser won’t let the page save things. Use Share to keep a link instead.'); paintSlots();
    });
    paintSlots(); render();
    if (!shared) { var mm0 = memGet(); mm0.current = encode(P); memSet(mm0); }
    window.TOLMusicVideoMaker = { plan: function () { return P; }, encode: encode, decode: decode, link: function () { return linkFor(P); }, select: selectSec, presets: PRESETS.map(function (p) { return p.id; }), preset: function (id) { PRESETS.forEach(function (pr) { if (pr.id === id) { P = pr.make(); title.value = P.title; changed(); } }); } };
  }
  function auto() { var el = document.querySelector('[data-music-video-maker]'); if (el && !el.__mvm) { el.__mvm = 1; mount(el); } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})();
