/* sound-senses.js — the music visualizer and vibration, the heart of /soundscapes.html (the Brain Breakers page).
   Whichever Brain Breaker is playing is listened to with a Web Audio analyser, entirely on this device.
   Nothing is recorded, saved or sent.
   SEE: a big stage at the top of the page, drawn live. Six looks: Stars (a starfield that twinkles with the
        highs, with shooting stars on the beat), Aurora (soft ribbons), Rings (a ring leaves
        the centre on each low pulse), Tunnel (hexagons rush toward you, faster when it is louder), Bars (a
        spectrum) and Wave (the sound's own shape). Auto picks looks that suit the track and changes them every so
        often. Under the stage a live card shows the track's own notes and an energy meter. It goes full screen.
        While something plays and the stage has scrolled away, a slim bar under the header keeps a live
        picture, the name and a Stop button in view. Every track has a "Play in the visualizer" button.
        With reduced motion on, only a still, slowly changing Glow is drawn.
        In full screen a Choose panel opens over the picture: the tracks come first (and an "Undecided? Find what is
        right for you" button that opens the same picker as the page), then the See and Feel choices.
   FEEL: opt-in vibration on phones that allow it (Chrome on Android; iPhones don't). Off until chosen.
        Match follows the track (slow heartbeat for Shooting Star, rumble for Thunderous Shimmer, beat for
        Watching a Shooting Star). Rumble follows the low tones, Beat follows pulses, Heartbeat is a steady lub-dub. Pulses are short and
        never faster than about two a second, and stop when the sound stops or the page is hidden.
   YOUR OWN MUSIC: under the stage (and in the full-screen Choose panel), "Use my microphone" or "Use sound from a tab"
        (desktop Chrome and Edge) lets the visualizer and vibration follow Spotify or any other music app. That sound is only
        measured, live, on this device (your-music.js): never played back, recorded or sent. Starting a track stops it.
   */
(function () {
  'use strict';
  var host = document.getElementById('senses');
  if (!host) return;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var RM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var canVib = typeof navigator.vibrate === 'function';
  var LOOKS = RM ? ['glow'] : ['media'];   // one picture: the Media player look (a still glow when the device asks for less motion)
  // what Auto cycles through for each track, and how Match feels it
  var ROTATE = { star: ['media', 'stars', 'aurora', 'wave'], shimmer: ['media', 'rings', 'bars', 'tunnel'], bedroom: ['media', 'rings', 'bars', 'wave'], watching: ['media', 'tunnel', 'stars', 'aurora'], other: ['media', 'stars', 'aurora', 'tunnel', 'rings', 'bars', 'wave'] };
  var TRACKFEEL = { star: 'heart', shimmer: 'rumble', bedroom: 'beat', watching: 'beat', other: 'rumble' };
  var TRACKID = { 'Shooting Star': 'star', 'Thunderous Shimmer': 'shimmer', 'Bouncy Bedroom': 'bedroom', 'Watching a Shooting Star': 'watching' };
  var LEVELS = ['off', 'soft', 'medium', 'strong'];
  // phone motors barely register anything under about 30 ms, so a pulse is 30 to 200 ms, and the rumble is a pattern of on and off
  var HAPT = { soft: { min: 32, max: 55, duty: 0.4 }, medium: { min: 48, max: 95, duty: 0.65 }, strong: { min: 70, max: 170, duty: 0.92 } };
  var FEELS = ['match', 'rumble', 'beat', 'heart'];
  var look = LOOKS[0];
  var level = lsGet('tol-haptic'); level = canVib && level && level !== 'off' ? 'medium' : 'off';   // vibration is simply on or off
  var feel = 'match';   // vibration follows each track's own kind of pulse

  // ---------- the panel ----------
  var NAMES = { media: 'Media player', auto: 'Auto', stars: 'Stars', aurora: 'Aurora', rings: 'Rings', tunnel: 'Tunnel', bars: 'Bars', wave: 'Wave', glow: 'Glow' };
  var FNAMES = { match: 'Match the track', rumble: 'Rumble', beat: 'Beat', heart: 'Heartbeat' };
  var LNAMES = { off: 'Off', soft: 'Soft', medium: 'Medium', strong: 'Strong' };
  function btns(group, list, names, cur) {
    return list.map(function (k) { return '<button type="button" class="sn-b" data-' + group + '="' + k + '" aria-pressed="' + (k === cur) + '">' + names[k] + '</button>'; }).join('');
  }
  host.innerHTML =
    '<p class="sn-kick">The big idea</p>' +
    '<h2 id="senses-h" class="sn-title">Music visualizer and vibration</h2>' +
    '<p class="sn-lede">Press play on a Brain Breaker and the visualizer moves with the music, like the classic media players. Turn on vibration and your phone feels it with you, each track with its own kind of pulse. You can also let it follow your own music, from Spotify or any app. Everything happens on your device.</p>' +
    '<div class="sn-stage" id="sn-stage"><canvas id="sn-cv" aria-hidden="true"></canvas><p class="sn-idle" id="sn-idle">Press <strong>Play in the visualizer</strong> on a track below, or visualize your own music.</p>' +
    '<div class="sn-hud"><span class="sn-now" id="sn-now"></span><span class="sn-buzz" id="sn-buzz" title="Lights up when the phone is asked to vibrate" aria-hidden="true">&#x26A1;</span><button type="button" class="sn-b sn-hud-b" id="sn-full" aria-label="Full screen">&#x26F6; Full screen</button></div>' +
    '<div class="sn-ovl" id="sn-ovl" role="dialog" aria-label="Choose a track" hidden><div class="sn-ovl-in">' +
      '<div class="sn-ovl-top"><p class="sn-ovl-k">Pick a Brain Breaker</p><button type="button" class="sn-b" id="sn-ovl-x" aria-label="Close this panel">&times; Close</button></div>' +
      '<div class="sn-trk" id="sn-trk"></div>' +
      '<div class="sn-find" id="sn-ovl-find" hidden></div>' +
      '<div id="sn-ovl-mine"></div>' +
      '<p class="sn-ovl-k" id="sn-ovl-vk">Vibration</p><div id="sn-ovl-ctl"></div>' +
    '</div></div>' +
    '<button type="button" class="sn-b sn-opt" id="sn-opt" aria-expanded="false" aria-controls="sn-ovl">&#x2630; Choose</button></div>' +
    '<div class="sn-mine" id="sn-mine"></div>' +
    '<div class="sn-info" id="sn-info" hidden aria-live="polite"><div class="sn-info-top"><strong id="sn-info-name"></strong><span class="sn-meter" aria-hidden="true"><i id="sn-meter"></i></span><span class="sn-meter-l">Energy</span></div><dl id="sn-info-fx"></dl></div>' +
    '<div class="sn-row" id="sn-feel-row" role="group" aria-label="Vibration"><button type="button" class="sn-b sn-vib" id="sn-vib" aria-pressed="' + (level !== 'off') + '">&#x1F4F3; Vibration: <b>' + (level !== 'off' ? 'on' : 'off') + '</b></button></div>' +
    '<p class="sn-note" id="sn-note"></p><p class="sn-status" id="sn-status" role="status" aria-live="polite"></p>';
  host.querySelectorAll('p, h2').forEach(function (n) { n.classList.add('no-bubble'); });
  var stage = document.getElementById('sn-stage'), cv = document.getElementById('sn-cv'), g = cv.getContext('2d'), idle = document.getElementById('sn-idle'),
      status = document.getElementById('sn-status'), infoEl = document.getElementById('sn-info'), infoName = document.getElementById('sn-info-name'), infoFx = document.getElementById('sn-info-fx'), meter = document.getElementById('sn-meter'), note = document.getElementById('sn-note'), nowEl = document.getElementById('sn-now'), fullBtn = document.getElementById('sn-full');
  note.textContent = canVib
    ? 'Vibration is off until you turn it on. It is short and gentle, uses a little battery, and stops when the sound stops. Low sounds also rumble through a phone speaker or headphones, which is its own kind of feeling.'
    : 'This device cannot vibrate from a web page (iPhones cannot), so you can see the sound here, and feel it through the speaker or headphones. On an Android phone with Chrome you can also feel it as vibration.';
  if (!canVib) { document.getElementById('sn-feel-row').hidden = true; document.getElementById('sn-ovl-vk').hidden = true; }
  if (RM) note.textContent += ' Your device asks for less motion, so the picture is a still, slowly changing glow.';

  // the slim bar that follows you down the page while something plays
  var dock = document.createElement('div');
  dock.className = 'sn-dock'; dock.hidden = true; dock.setAttribute('role', 'region'); dock.setAttribute('aria-label', 'Now playing');
  dock.innerHTML = '<canvas class="sn-dock-cv" aria-hidden="true" width="120" height="28"></canvas><span class="sn-dock-name"></span><button type="button" class="sn-dock-b" data-dock="open">Open</button><button type="button" class="sn-dock-b" data-dock="stop">Stop</button>';
  document.body.appendChild(dock);
  var dcv = dock.querySelector('canvas'), dg = dcv.getContext('2d'), dname = dock.querySelector('.sn-dock-name');

  function say(msg) { status.textContent = msg; }
  function press(group, val) { host.querySelectorAll('[data-' + group + ']').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-' + group) === val)); }); }
  function smooth() { return RM ? 'auto' : 'smooth'; }
  function stopAll() {
    if (mine) mine.stop('stop');
    document.querySelectorAll('.track-player').forEach(function (a) { try { if (!a.paused) a.pause(); } catch (e) {} });
    if (window.TOLBrainBreaks && window.TOLBrainBreaks.stop) try { window.TOLBrainBreaks.stop(); } catch (e) {}
  }
  host.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-look')) { look = b.getAttribute('data-look'); lsSet('tol-sense-look', look); press('look', look); rings.length = 0; autoAt = performance.now(); autoI = 0; say(look === 'auto' ? 'The picture will change every so often.' : 'Seeing sound as ' + NAMES[look] + '.'); }
    else if (b.hasAttribute('data-level')) { level = b.getAttribute('data-level'); lsSet('tol-haptic', level); press('level', level); vOK = true; if (level === 'off') stopBuzz(); else { var hh = HAPT[level]; vibe([hh.min, 90, hh.max]); } say(level === 'off' ? 'Vibration is off.' : 'Feeling sound: ' + LNAMES[level] + ', ' + FNAMES[feel] + '. That was a sample.'); heartOn = false; }
    else if (b.hasAttribute('data-feel')) { feel = b.getAttribute('data-feel'); lsSet('tol-haptic-mode', feel); press('feel', feel); heartOn = false; stopBuzz(); say('Feeling the sound as ' + FNAMES[feel] + (level === 'off' ? '. Choose a strength above to turn vibration on.' : '.')); }
    else if (b.id === 'sn-test') {
      if (level === 'off') { say('Choose Soft, Medium or Strong first.'); return; }
      var tp = HAPT[level]; vibe([tp.min, 120, tp.max, 120, tp.min]); say('That was a test pulse: short, long, short. If you felt nothing, check that your phone’s vibration or touch feedback is on and that it is not in battery saver or do-not-disturb.');
    }
    else if (b.id === 'sn-vib') {
      level = level === 'off' ? 'medium' : 'off'; lsSet('tol-haptic', level); vOK = true;
      b.setAttribute('aria-pressed', String(level !== 'off')); b.querySelector('b').textContent = level !== 'off' ? 'on' : 'off';
      if (level === 'off') { stopBuzz(); say('Vibration is off.'); } else { var hh = HAPT[level]; vibe([hh.min, 90, hh.max]); say('Vibration is on. It follows the music.'); }
    }
    else if (b.id === 'sn-full') toggleFull();
  });
  dock.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.getAttribute('data-dock') === 'open') stage.scrollIntoView({ block: 'center', behavior: smooth() });
    else if (b.getAttribute('data-dock') === 'stop') { stopAll(); }
  });

  // ---------- the Choose panel (full screen) ----------
  var ovl = document.getElementById('sn-ovl'), optBtn = document.getElementById('sn-opt'), trkEl = document.getElementById('sn-trk'), findEl = document.getElementById('sn-ovl-find'), ctlEl = document.getElementById('sn-ovl-ctl');
  var BLURB = { 'Shooting Star': 'Soft and floating · quiets a busy mind', 'Thunderous Shimmer': 'Textured and curious · a little spark', 'Bouncy Bedroom': 'Cozy and playful · a light bounce', 'Watching a Shooting Star': 'Big and cinematic · gets you moving' };
  var finder = null, moved = [];
  function cards() { return Array.prototype.slice.call(document.querySelectorAll('.track-card')).filter(function (c) { return c.querySelector('.track-player'); }); }
  function cardName(c) { var h = c.querySelector('.track-title'); return h ? h.textContent.replace(/^\d+\.\s*/, '') : 'Track'; }
  function drawTracks() {
    var cs = cards(), html = '';
    cs.forEach(function (c, i) {
      var a = c.querySelector('.track-player'), on = !a.paused && !a.ended, nm = cardName(c);
      html += '<button type="button" class="sn-trkb" data-trk="' + i + '" aria-pressed="' + on + '"><span class="sn-trkb-i" aria-hidden="true">' + (on ? '&#10074;&#10074;' : '&#9654;') + '</span><span><strong>' + nm + '</strong><small>' + (BLURB[nm] || '') + '</small></span></button>';
    });
    html += '<button type="button" class="sn-trkb sn-und" data-und="1" aria-expanded="' + (!findEl.hidden) + '" aria-controls="sn-ovl-find"><span class="sn-trkb-i" aria-hidden="true">?</span><span><strong>Undecided?</strong><small>Find what is right for you</small></span></button>';
    trkEl.innerHTML = html;
    trkEl.querySelectorAll('*').forEach(function (n) { n.classList.add('no-bubble'); });
  }
  function anyPlaying() { return (mine && mine.active()) || cards().some(function (c) { var a = c.querySelector('.track-player'); return a && !a.paused && !a.ended; }); }
  function openOvl() { drawTracks(); ovl.hidden = false; optBtn.setAttribute('aria-expanded', 'true'); var f = trkEl.querySelector('button'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} }
  function closeOvl() { ovl.hidden = true; optBtn.setAttribute('aria-expanded', 'false'); }
  optBtn.addEventListener('click', function () { if (ovl.hidden) openOvl(); else closeOvl(); });
  document.getElementById('sn-ovl-x').addEventListener('click', closeOvl);
  trkEl.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-und')) {
      findEl.hidden = !findEl.hidden;
      if (!findEl.hidden && !finder) {
        if (window.TOLFinder) finder = window.TOLFinder.mount(findEl, { onPlay: function () { setTimeout(function () { drawTracks(); closeOvl(); }, 250); } });
        else findEl.innerHTML = '<p class="sn-ovl-k">The picker is still loading. Try again in a moment.</p>';
      }
      drawTracks(); if (!findEl.hidden) findEl.scrollIntoView({ block: 'nearest', behavior: smooth() });
      return;
    }
    var c = cards()[+b.getAttribute('data-trk')]; if (!c) return;
    var a = c.querySelector('.track-player');
    if (!a.paused) { a.pause(); drawTracks(); return; }
    cards().forEach(function (o) { var oa = o.querySelector('.track-player'); if (oa !== a && !oa.paused) oa.pause(); });
    var p = a.play(); if (p && p.catch) p.catch(function () { say('Your browser blocked the sound. Tap a track again.'); });
    closeOvl();
  });
  function watchTracks() { cards().forEach(function (c) { var a = c.querySelector('.track-player'); ['play', 'pause', 'ended'].forEach(function (ev) { a.addEventListener(ev, function () { if (!ovl.hidden) drawTracks(); }); }); }); }
  watchTracks();
  // the See / Feel / Like rows move into the panel while full screen is on, and back after
  function moveControls(into) {
    if (into && !moved.length) {
      host.querySelectorAll('.sn-row').forEach(function (r) { var ph = document.createComment('sn-row'); r.parentNode.insertBefore(ph, r); moved.push({ r: r, ph: ph }); ctlEl.appendChild(r); });
    } else if (!into && moved.length) {
      moved.forEach(function (m) { m.ph.parentNode.insertBefore(m.r, m.ph); m.ph.parentNode.removeChild(m.ph); }); moved = [];
    }
  }
  // full screen: the buttons and options appear when the screen is touched, clicked or a key is pressed, then fade away by themselves
  var quietT = 0;
  function quietWake() {
    stage.classList.remove('is-quiet'); clearTimeout(quietT);
    if (!isFull()) return;
    quietT = setTimeout(function () {
      var a = document.activeElement, kb = false; try { kb = !!(a && stage.contains(a) && a.matches(':focus-visible')); } catch (e) {}
      if (isFull() && !kb && (!ovl || ovl.hidden)) stage.classList.add('is-quiet'); else if (isFull()) quietWake();
    }, 3200);
  }
  ['pointerdown', 'pointermove', 'touchstart', 'click', 'keydown'].forEach(function (ev) { stage.addEventListener(ev, quietWake, { passive: true }); });
  function onFullChange(f) { quietWake(); moveControls(f); if (f) { if (anyPlaying()) closeOvl(); else openOvl(); } else closeOvl(); }

  // ---------- full screen ----------
  function isFull() { return document.fullscreenElement === stage || document.webkitFullscreenElement === stage || stage.classList.contains('is-full'); }
  function toggleFull() {
    if (isFull()) { var ex = document.exitFullscreen || document.webkitExitFullscreen; if (document.fullscreenElement || document.webkitFullscreenElement) { try { ex.call(document); } catch (e) {} } stage.classList.remove('is-full'); document.documentElement.style.overflow = ''; syncFull(); return; }
    var rq = stage.requestFullscreen || stage.webkitRequestFullscreen;
    if (rq) { try { var pr = rq.call(stage); if (pr && pr.catch) pr.catch(function () { stage.classList.add('is-full'); document.documentElement.style.overflow = 'hidden'; syncFull(); }); } catch (e) { stage.classList.add('is-full'); document.documentElement.style.overflow = 'hidden'; } }
    else { stage.classList.add('is-full'); document.documentElement.style.overflow = 'hidden'; }
    setTimeout(syncFull, 120);
  }
  var lastFull = false;
  function syncFull() { var f = isFull(); fullBtn.innerHTML = f ? '&#x2715; Exit full screen' : '&#x26F6; Full screen'; fullBtn.setAttribute('aria-label', f ? 'Exit full screen' : 'Full screen'); stage.classList.toggle('is-full-now', f); if (f !== lastFull) { lastFull = f; onFullChange(f); } }
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) { document.addEventListener(ev, function () { if (!document.fullscreenElement && !document.webkitFullscreenElement) { stage.classList.remove('is-full'); document.documentElement.style.overflow = ''; } syncFull(); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && stage.classList.contains('is-full')) toggleFull(); });

  // ---------- "Play in the visualizer" on every sound ----------
  function addSeeButtons() {
    document.querySelectorAll('.track-card').forEach(function (card) {
      var a = card.querySelector('.track-player'); if (!a || card.querySelector('.sn-see')) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'sn-see'; b.innerHTML = '&#x25B6; Play in the visualizer';
      b.addEventListener('click', function () {
        document.querySelectorAll('.track-player').forEach(function (o) { if (o !== a && !o.paused) o.pause(); });
        var p = a.play(); if (p && p.catch) p.catch(function () { say('Your browser blocked the sound. Press play on the track.'); });
        stage.scrollIntoView({ block: 'center', behavior: smooth() });
      });
      a.parentNode.insertBefore(b, a.nextSibling);
    });
  }
  addSeeButtons();

  // ---------- finding what is playing ----------
  var AC = null, taps = typeof WeakMap === 'function' ? new WeakMap() : null, an = null, bufF = null, bufT = null, srcName = '', curCard = null;
  function shared() { if (AC) return AC; var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; try { AC = new C(); } catch (e) { AC = null; } return AC; }
  function trackAnalyser(a) {
    var c = shared(); if (!c || !taps) return null;
    var t = taps.get(a);
    if (!t) {
      try { var s = c.createMediaElementSource(a), n = c.createAnalyser(); n.fftSize = 1024; n.smoothingTimeConstant = 0.82; s.connect(n); n.connect(c.destination); t = { an: n }; taps.set(a, t); } catch (e) { return null; }
    }
    if (c.state === 'suspended') c.resume();
    return t.an;
  }
  function findSource() {
    if (mine && mine.active() && mine.analyser()) return { an: mine.analyser(), card: null, name: 'Your music', mine: true };
    var audios = document.querySelectorAll('.track-player');
    for (var i = 0; i < audios.length; i++) {
      var a = audios[i];
      if (!a.paused && !a.ended) { var n = trackAnalyser(a); if (n) { var card = a.closest('.track-card'), h = card && card.querySelector('.track-title'); return { an: n, card: card, name: h ? h.textContent.replace(/^\d+\.\s*/, '') : 'the track' }; } }
    }
    return null;
  }

  // ---------- your own music (Spotify or any app), through the microphone or a shared tab ----------
  var mine = window.TOLYourMusic ? window.TOLYourMusic.create({
    context: shared,
    beforeStart: function () { var c = shared(); if (c && c.state === 'suspended') try { c.resume(); } catch (e) {} document.querySelectorAll('.track-player').forEach(function (a) { try { if (!a.paused) a.pause(); } catch (e) {} }); if (window.TOLBrainBreaks && window.TOLBrainBreaks.stop) try { window.TOLBrainBreaks.stop(); } catch (e) {} },
    onStart: function () { lastCheck = 0; if (!ovl.hidden) closeOvl(); },
    onStop: function () { lastCheck = 0; if (!ovl.hidden) drawTracks(); }
  }) : null;
  if (mine) {
    mine.ui(document.getElementById('sn-mine'));
    mine.ui(document.getElementById('sn-ovl-mine'), { compact: true, title: 'Or your own music' });
    // starting one of the tracks here stops listening to your own music
    document.querySelectorAll('.track-player').forEach(function (a) { a.addEventListener('play', function () { if (mine.active()) mine.stop('source', 'Stopped listening to your music, so this track can play.'); }); });
  }

  function trackKey() { return TRACKID[srcName] || 'other'; }
  function showInfo() {
    var fx = curCard && curCard.querySelector('.bb-fx'); infoName.textContent = srcName;
    infoFx.innerHTML = fx ? fx.innerHTML : ''; infoEl.hidden = !fx;
    infoEl.querySelectorAll('div, dt, dd, dl, strong, span').forEach(function (n) { n.classList.add('no-bubble'); });
  }
  function curFeel() { return feel === 'match' ? TRACKFEEL[trackKey()] : feel; }

  // ---------- reading the sound ----------
  var stars = [], shoots = [], lvl = 0, bass = 0, mid = 0, high = 0, ema = 0, prevB = 0, fluxAvg = 0, lastBeat = 0, lastRumble = 0, rings = [], t0 = performance.now(), peaks = [], tun = 0, lastT = 0, autoAt = performance.now(), autoI = 0;
  function band(lo, hi, hz) {
    var a = Math.max(0, Math.floor(lo / hz)), b = Math.min(bufF.length - 1, Math.ceil(hi / hz)), s = 0, n = 0;
    for (var i = a; i <= b; i++) { s += bufF[i]; n++; }
    return n ? s / n / 255 : 0;
  }
  function analyse() {
    var hz = an.context.sampleRate / an.fftSize;
    if (!bufF || bufF.length !== an.frequencyBinCount) { bufF = new Uint8Array(an.frequencyBinCount); bufT = new Uint8Array(an.fftSize); }
    an.getByteFrequencyData(bufF); an.getByteTimeDomainData(bufT);
    var b = band(20, 250, hz), m = band(250, 2000, hz), h = band(2000, 9000, hz);
    bass += (b - bass) * 0.35; mid += (m - mid) * 0.25; high += (h - high) * 0.25;
    lvl += (Math.min(1, (bass * 1.3 + mid + high) / 1.6) - lvl) * 0.2;
    var now = performance.now(), beat = false;
    ema += (b - ema) * 0.04;
    // an onset is a quick rise in the low and low-mid sound compared with its recent average
    var o = Math.max(b, m * 0.8), flux = Math.max(0, o - prevB); prevB = o; fluxAvg += (flux - fluxAvg) * 0.06;
    if (((b > ema * 1.16 + 0.035 && b > 0.12) || (flux > fluxAvg * 1.9 + 0.012 && o > 0.08)) && now - lastBeat > 300) { beat = true; lastBeat = now; }
    return { beat: beat, now: now };
  }

  // ---------- feeling it ----------
  var heartOn = false, heartTimer = 0, lastRumble = 0, vOK = true, flashT = 0, buzzDot = null;
  function flash() {
    if (!buzzDot) buzzDot = document.getElementById('sn-buzz'); if (!buzzDot) return;
    buzzDot.classList.add('on'); clearTimeout(flashT); flashT = setTimeout(function () { buzzDot.classList.remove('on'); }, 140);
  }
  // one call into the phone; it says so if the browser refuses (Chrome wants a tap on the page first)
  function vibe(pattern) {
    if (!canVib || level === 'off') return false;
    var ok = false; try { ok = navigator.vibrate(pattern); } catch (e) {}
    if (ok === false) { if (vOK) { vOK = false; say('Your browser would not vibrate yet. Tap the page once, then press Try a pulse.'); } }
    else { vOK = true; flash(); }
    return ok;
  }
  function stopBuzz() { clearTimeout(heartTimer); heartOn = false; try { if (canVib) navigator.vibrate(0); } catch (e) {} }
  function heartbeat() {
    if (!heartOn) return;
    var h = HAPT[level] || HAPT.medium;
    vibe([h.min, 110, Math.round(h.min * 0.8)]);
    heartTimer = setTimeout(heartbeat, 900);
  }
  function feelStep(r) {
    if (!canVib || level === 'off') { if (heartOn) stopBuzz(); return; }
    var cf = curFeel(), h = HAPT[level] || HAPT.medium;
    if (cf === 'heart') { if (!heartOn) { heartOn = true; heartbeat(); } return; }
    if (heartOn) stopBuzz();
    if (cf === 'beat') {
      if (r.beat) vibe(Math.round(h.min + Math.min(1, bass * 1.4) * (h.max - h.min)));
      // soft music has few clear beats: if nothing has pulsed for a while, a slow breath-paced pulse keeps it alive
      else if (lvl > 0.12 && r.now - lastBeat > 1800) { lastBeat = r.now; vibe(h.min); }
    } else if (cf === 'rumble' && r.now - lastRumble > 230) {
      // a texture that follows the low end: the louder the lows, the longer it buzzes inside each quarter second
      lastRumble = r.now;
      var e = Math.min(1, bass * 1.5 + lvl * 0.3);
      if (e > 0.1) { var on = Math.round(h.min * 0.6 + e * (230 * h.duty - h.min * 0.6)); if (on >= 22) vibe([on]); }
    }
  }

  // ---------- drawing it ----------
  var W = 300, H = 280, dpr = 1;
  function fit() {
    var full = isFull();
    var w = Math.max(200, Math.round(stage.clientWidth || cv.parentNode.clientWidth));
    H = full ? Math.max(200, Math.round(stage.clientHeight || window.innerHeight)) : Math.round(Math.max(250, Math.min(420, w * 0.46)));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(H * dpr); }
    cv.style.height = H + 'px'; W = w; g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function bg() { var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#171A34'); gr.addColorStop(1, '#262050'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  function rgba(c, a) { return 'rgba(' + c + ',' + a.toFixed(3) + ')'; }
  var WARM = '247,168,150', TEAL = '127,224,215', VIOLET = '178,150,240', GOLD = '248,215,106', PINK = '255,150,190';
  function drawAurora(t) {
    bg();
    var cols = [[WARM, bass], [TEAL, mid], [VIOLET, high]];
    for (var i = 0; i < 3; i++) {
      var c = cols[i][0], e = cols[i][1], amp = H * (0.06 + e * 0.26), base = H * (0.38 + i * 0.17), ph = t / (1800 + i * 500) + i * 2;
      g.beginPath(); g.moveTo(0, H);
      for (var x = 0; x <= W; x += 6) { var y = base + Math.sin(x / (70 + i * 30) + ph) * amp + Math.sin(x / (33 + i * 11) - ph * 1.4) * amp * 0.35; g.lineTo(x, y); }
      g.lineTo(W, H); g.closePath();
      var gr = g.createLinearGradient(0, base - amp, 0, H); gr.addColorStop(0, rgba(c, 0.18 + e * 0.55)); gr.addColorStop(1, rgba(c, 0));
      g.fillStyle = gr; g.fill();
    }
  }
  function drawRings(t, beatNow) {
    bg();
    var cx = W / 2, cy = H / 2, reach = Math.hypot(W, H) / 2;
    if (beatNow || (curFeel() === 'rumble' && lvl > 0.08 && t - (drawRings.last || 0) > 1700)) { rings.push({ r: 20, a: 0.35 + lvl * 0.6, c: beatNow ? WARM : TEAL }); drawRings.last = t; if (rings.length > 16) rings.shift(); }
    for (var i = rings.length - 1; i >= 0; i--) {
      var o = rings[i]; o.r += (1.1 + lvl * 2.2) * (H / 280); o.a *= 0.985;
      if (o.a < 0.02 || o.r > reach) { rings.splice(i, 1); continue; }
      g.strokeStyle = rgba(o.c, o.a); g.lineWidth = 2 + lvl * 3; g.beginPath(); g.arc(cx, cy, o.r, 0, Math.PI * 2); g.stroke();
    }
    var r = (16 + bass * 34 + mid * 14) * (H / 280), gr = g.createRadialGradient(cx, cy, 2, cx, cy, r * 2.2);
    gr.addColorStop(0, rgba(GOLD, 0.95)); gr.addColorStop(0.5, rgba(WARM, 0.35 + lvl * 0.3)); gr.addColorStop(1, rgba(VIOLET, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r * 2.2, 0, Math.PI * 2); g.fill();
  }
  function drawStars(t, beatNow) {
    var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0B0C22'); gr.addColorStop(1, '#241A4A'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    var want = Math.round(60 + W / 6);
    while (stars.length < want) stars.push({ x: Math.random(), y: Math.random(), z: 0.2 + Math.random() * 0.8, p: Math.random() * 6.28 });
    // a glow low in the sky that swells with the low tones
    var ng = g.createRadialGradient(W / 2, H * 1.05, 4, W / 2, H * 1.05, H * (0.55 + bass * 0.7)); ng.addColorStop(0, rgba(WARM, 0.18 + bass * 0.5)); ng.addColorStop(0.5, rgba(VIOLET, 0.1 + mid * 0.25)); ng.addColorStop(1, rgba(VIOLET, 0)); g.fillStyle = ng; g.fillRect(0, 0, W, H);
    var dt = Math.min(60, t - (drawStars.last || t)); drawStars.last = t;
    stars.forEach(function (s) {
      s.x -= (0.00003 + lvl * 0.00012) * s.z * dt; if (s.x < -0.02) { s.x = 1.02; s.y = Math.random(); }
      var tw = 0.5 + 0.5 * Math.sin(t / 380 * s.z + s.p), a = 0.25 + 0.75 * tw * (0.5 + high * 1.6), r = (0.6 + s.z * 1.6) * (1 + bass * 0.9) * (H / 280);
      g.fillStyle = rgba(s.z > 0.75 ? GOLD : '255,255,255', Math.min(1, a)); g.beginPath(); g.arc(s.x * W, s.y * H, r, 0, 6.2832); g.fill();
    });
    if ((beatNow || (lvl > 0.1 && Math.random() < 0.004 + lvl * 0.01)) && shoots.length < 6) shoots.push({ x: 0.45 + Math.random() * 0.6, y: Math.random() * 0.5, v: 0.5 + Math.random() * 0.6, a: 1 });
    for (var i = shoots.length - 1; i >= 0; i--) {
      var o = shoots[i]; o.x -= 0.011 * o.v * (1 + lvl); o.y += 0.006 * o.v * (1 + lvl); o.a -= 0.014;
      if (o.a <= 0) { shoots.splice(i, 1); continue; }
      var x = o.x * W, y = o.y * H, tl = 70 * o.v * (H / 280), tg = g.createLinearGradient(x, y, x + tl, y - tl * 0.5);
      tg.addColorStop(0, rgba('255,246,214', o.a)); tg.addColorStop(1, rgba(GOLD, 0)); g.strokeStyle = tg; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + tl, y - tl * 0.5); g.stroke();
      g.fillStyle = rgba('255,255,255', o.a); g.beginPath(); g.arc(x, y, 2.4, 0, 6.2832); g.fill();
    }
  }
  function drawWave() {
    bg();
    var n = bufT.length, step = Math.max(1, Math.floor(n / W)), mid2 = H / 2, amp = H * (0.08 + lvl * 0.3);
    g.lineJoin = 'round';
    for (var pass = 0; pass < 2; pass++) {
      g.beginPath();
      for (var i = 0, x = 0; i < n; i += step, x++) { var v = (bufT[i] - 128) / 128; var y = mid2 + v * amp * (pass ? 0.5 : 1); if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.strokeStyle = pass ? rgba(VIOLET, 0.45) : rgba(TEAL, 0.9); g.lineWidth = pass ? 6 : 2.4; g.stroke();
    }
  }
  function drawBars() {
    bg();
    var n = Math.max(20, Math.min(64, Math.floor(W / 15))), bw = W / n, maxBin = Math.floor(bufF.length * 0.55), floor = H * 0.8;
    for (var i = 0; i < n; i++) {
      var lo = Math.floor(Math.pow(i / n, 1.7) * maxBin) + 1, hi = Math.floor(Math.pow((i + 1) / n, 1.7) * maxBin) + 2, s = 0, c = 0;
      for (var k = lo; k <= hi && k < bufF.length; k++) { s += bufF[k]; c++; }
      var v = c ? s / c / 255 : 0; peaks[i] = Math.max(v, (peaks[i] || 0) - 0.012);
      var bh = Math.max(3, v * floor * 0.95), x = i * bw + bw * 0.14, col = i / n < 0.4 ? WARM : i / n < 0.75 ? TEAL : VIOLET;
      var gr = g.createLinearGradient(0, floor - bh, 0, floor); gr.addColorStop(0, rgba(col, 0.95)); gr.addColorStop(1, rgba(col, 0.35));
      g.fillStyle = gr; g.fillRect(x, floor - bh, bw * 0.72, bh);
      g.fillStyle = rgba(col, 0.12); g.fillRect(x, floor + 4, bw * 0.72, bh * 0.28);
      g.fillStyle = rgba(GOLD, 0.9); g.fillRect(x, floor - peaks[i] * floor * 0.95 - 4, bw * 0.72, 2.5);
    }
  }
  function hexagon(cx, cy, r, rot) { g.beginPath(); for (var k = 0; k < 6; k++) { var a = rot + k * Math.PI / 3; if (k) g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); else g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); }
  function drawTunnel(t) {
    bg();
    var cx = W / 2, cy = H / 2, N = 16, maxR = Math.hypot(W, H) * 0.62, dt = Math.min(60, t - lastT); lastT = t;
    tun += (0.00005 + lvl * 0.00026 + bass * 0.0001) * dt;
    for (var i = 0; i < N; i++) {
      var q = (i / N + tun) % 1, r = Math.pow(q, 2.3) * maxR + 4, a = Math.min(1, q * 4) * (1 - q) * (0.55 + lvl * 0.8);
      g.strokeStyle = rgba(i % 3 === 0 ? WARM : i % 3 === 1 ? TEAL : VIOLET, Math.min(0.95, a)); g.lineWidth = 1 + q * 5 * (0.6 + bass); hexagon(cx, cy, r, t / 4000 + i * 0.07 + q * 0.4); g.stroke();
    }
    var gr = g.createRadialGradient(cx, cy, 0, cx, cy, 40 + bass * 90); gr.addColorStop(0, rgba(GOLD, 0.55 + bass * 0.4)); gr.addColorStop(1, rgba(PINK, 0)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }

  // Media player: like the classic Windows Media Player visualizations. Each frame keeps the last one, zoomed in and turned
  // a touch so everything streams outward in trails, then draws the live sound on top as a six-way kaleidoscope: the
  // waveform as glowing ribbons, the spectrum as petals, and a burst of light on every beat. The colors drift with the music.
  var fbc = null, fbg = null, mHue = 200, mSpin = 0;
  function drawMedia(t, beatNow) {
    var cw = cv.width, ch = cv.height;
    if (!fbc) { fbc = document.createElement('canvas'); fbg = fbc.getContext('2d'); }
    if (fbc.width !== cw || fbc.height !== ch) { fbc.width = cw; fbc.height = ch; fbg.fillStyle = '#070512'; fbg.fillRect(0, 0, cw, ch); }
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.fillStyle = '#070512'; g.fillRect(0, 0, cw, ch);
    mSpin += 0.0025 + mid * 0.01; mHue = (mHue + 0.35 + bass * 2.2 + (beatNow ? 18 : 0)) % 360;
    g.save(); g.translate(cw / 2, ch / 2); g.rotate(0.006 * Math.sin(t / 2600) + mid * 0.01); var z = 1.018 + bass * 0.035 + (beatNow ? 0.05 : 0); g.scale(z, z);
    g.globalAlpha = 0.8 - high * 0.08; g.drawImage(fbc, -cw / 2, -ch / 2); g.restore(); g.globalAlpha = 1;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.globalCompositeOperation = 'lighter';
    var cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.46, K = 6, M = 64, nT = bufT.length, nF = Math.floor(bufF.length * 0.45);
    for (var s = 0; s < K; s++) {
      g.save(); g.translate(cx, cy); g.rotate(s * Math.PI * 2 / K + mSpin); if (s % 2) g.scale(1, -1);
      // the waveform as a ribbon across this slice
      g.beginPath();
      for (var i = 0; i <= M; i++) {
        var a = i / M * Math.PI * 2 / K, v = (bufT[Math.floor(i / M * (nT - 1))] - 128) / 128, f = bufF[Math.floor(Math.pow(i / M, 1.6) * nF)] / 255;
        var r = R * (0.22 + 0.42 * f + 0.28 * v * (0.6 + lvl));
        if (i) g.lineTo(Math.cos(a) * r, Math.sin(a) * r); else g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.strokeStyle = 'hsla(' + ((mHue + s * 14) % 360) + ',95%,58%,' + (0.28 + lvl * 0.35).toFixed(2) + ')'; g.lineWidth = 1.2 + bass * 2.4; g.stroke();
      // the spectrum as petals reaching out from the middle
      for (var j = 0; j < 10; j++) {
        var fv = bufF[Math.floor(Math.pow((j + 0.5) / 10, 1.5) * nF)] / 255; if (fv < 0.08) continue;
        var pa = (j + 0.5) / 10 * Math.PI * 2 / K, pr = R * (0.15 + fv * 0.85);
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(Math.cos(pa - 0.2) * pr * 0.6, Math.sin(pa - 0.2) * pr * 0.6, Math.cos(pa) * pr, Math.sin(pa) * pr);
        g.strokeStyle = 'hsla(' + ((mHue + 120 + j * 12) % 360) + ',90%,55%,' + (fv * 0.3).toFixed(2) + ')'; g.lineWidth = 1 + fv * 2; g.stroke();
      }
      g.restore();
    }
    // a soft burst of light in the middle, bigger on the beat
    var br = R * (0.1 + bass * 0.35 + (beatNow ? 0.2 : 0)), gr = g.createRadialGradient(cx, cy, 0, cx, cy, br);
    gr.addColorStop(0, 'hsla(' + ((mHue + 60) % 360) + ',100%,65%,' + (0.12 + bass * 0.25).toFixed(2) + ')'); gr.addColorStop(1, 'hsla(' + mHue + ',100%,50%,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, br, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'source-over';
    fbg.globalCompositeOperation = 'copy'; fbg.drawImage(cv, 0, 0); fbg.globalCompositeOperation = 'source-over';
  }
  function drawGlow() {
    bg();
    var r = (40 + lvl * 90) * (H / 280), gr = g.createRadialGradient(W / 2, H / 2, 4, W / 2, H / 2, r * 1.6);
    gr.addColorStop(0, rgba(GOLD, 0.5 + lvl * 0.4)); gr.addColorStop(0.5, rgba(WARM, 0.2 + lvl * 0.3)); gr.addColorStop(1, rgba(VIOLET, 0));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  function drawIdle(t) {
    bg();
    var k = 0.5 + 0.5 * Math.sin(t / 2600), gr = g.createRadialGradient(W / 2, H / 2, 2, W / 2, H / 2, (70 + k * 12) * (H / 280));
    gr.addColorStop(0, rgba(GOLD, 0.16)); gr.addColorStop(1, rgba(VIOLET, 0)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  // the slim "now playing" bar: a tiny live spectrum
  function drawDock() {
    if (!an || !bufF) return;
    dg.clearRect(0, 0, 120, 28); var n = 24, bw = 120 / n, maxBin = Math.floor(bufF.length * 0.5);
    for (var i = 0; i < n; i++) {
      var lo = Math.floor(Math.pow(i / n, 1.7) * maxBin) + 1, hi = Math.floor(Math.pow((i + 1) / n, 1.7) * maxBin) + 2, s = 0, c = 0;
      for (var k = lo; k <= hi && k < bufF.length; k++) { s += bufF[k]; c++; }
      var v = c ? s / c / 255 : 0, bh = Math.max(2, v * 26); dg.fillStyle = i / n < 0.4 ? '#F7A896' : i / n < 0.75 ? '#7FE0D7' : '#B296F0'; dg.fillRect(i * bw + 1, 28 - bh, bw - 2, bh);
    }
  }

  // ---------- the loop ----------
  var visible = true, lastCheck = 0, lastDraw = 0, raf = 0;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0.05 }).observe(stage);
  function placeDock() { var bar = document.querySelector('.tol-bar'), top = bar ? Math.max(0, Math.round(bar.getBoundingClientRect().bottom)) : 0; dock.style.top = top + 'px'; }
  function showDock(on) { if (dock.hidden === !on) return; dock.hidden = !on; if (on) placeDock(); }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (document.hidden) { if (an) { an = null; stopBuzz(); showDock(false); } return; }
    if (now - lastCheck > 400) {
      lastCheck = now;
      var s = findSource();
      if (s && s.an !== an) { an = s.an; srcName = s.name; curCard = s.card; showInfo(); idle.hidden = true; say(s.mine ? 'Seeing your music.' : 'Seeing ' + srcName + '.'); nowEl.textContent = srcName; dname.textContent = srcName; lastBeat = 0; ema = 0; }
      else if (!s && an) { an = null; stopBuzz(); idle.hidden = false; rings.length = 0; nowEl.textContent = ''; infoEl.hidden = true; curCard = null; say('The sound stopped.'); }
    }
    showDock(!!an && !visible && !isFull());
    if (!visible && !(an && level !== 'off') && dock.hidden) return;
    if (RM && now - lastDraw < 160) { if (an) { var rr = analyse(); feelStep(rr); } return; }
    lastDraw = now;
    if (visible || isFull()) fit();
    if (!an) { if (visible || isFull()) { RM ? drawGlow() : drawIdle(now - t0); } return; }
    var r = analyse(); feelStep(r);
    if (!dock.hidden) drawDock();
    if (!visible && !isFull()) return;
    var t = now - t0, cur = look;
    if (look === 'auto') { var rot = ROTATE[trackKey()]; if (now - autoAt > 14000) { autoAt = now; autoI = (autoI + 1) % rot.length; rings.length = 0; } cur = rot[autoI % rot.length]; }
    meter.style.width = Math.round(Math.min(1, lvl * 1.15) * 100) + '%';
    if (cur === 'media') drawMedia(t, r.beat); else if (cur === 'stars') drawStars(t, r.beat); else if (cur === 'rings') drawRings(t, r.beat); else if (cur === 'wave') drawWave(); else if (cur === 'glow') drawGlow(); else if (cur === 'bars') drawBars(); else if (cur === 'tunnel') drawTunnel(t); else drawAurora(t);
  }
  window.addEventListener('pagehide', stopBuzz);
  window.addEventListener('resize', function () { if (!dock.hidden) placeDock(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stopBuzz(); });
  fit(); drawIdle(0);
  raf = requestAnimationFrame(loop);
})();
