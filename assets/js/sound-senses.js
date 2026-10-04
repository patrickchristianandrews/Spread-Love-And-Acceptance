/* sound-senses.js — "See and feel the sound" for /soundscapes.html.
   Whatever is playing (a track, a live soundscape or a Breathe-break bed) is listened to with a Web Audio
   analyser, entirely on this device. Nothing is recorded, saved or sent.
   SEE: a canvas drawing of the sound. Aurora (soft ribbons), Rings (a ring leaves the centre on each low pulse)
        and Wave (the sound's own shape). With reduced motion on, only a still, slowly changing Glow is drawn.
   FEEL: opt-in vibration on phones that allow it (Chrome on Android; iPhones don't). Off until chosen.
        Rumble follows the low tones, Beat follows pulses, Heartbeat is a steady lub-dub. Pulses are short and
        never faster than about two a second, and stop when the sound stops or the page is hidden.
   window.TOLSenses.engine(eng | null) lets the page say that a Breathe-break bed is playing. */
(function () {
  'use strict';
  var host = document.getElementById('senses');
  if (!host) return;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var RM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var canVib = typeof navigator.vibrate === 'function';
  var LOOKS = RM ? ['glow'] : ['aurora', 'rings', 'wave'];
  var LEVELS = ['off', 'soft', 'medium', 'strong'], GAIN = { off: 0, soft: 0.6, medium: 1, strong: 1.7 };
  var FEELS = ['rumble', 'beat', 'heart'];
  var look = lsGet('tol-sense-look'); if (LOOKS.indexOf(look) < 0) look = LOOKS[0];
  var level = lsGet('tol-haptic'); if (LEVELS.indexOf(level) < 0 || !canVib) level = 'off';
  var feel = lsGet('tol-haptic-mode'); if (FEELS.indexOf(feel) < 0) feel = 'rumble';

  // ---------- the panel ----------
  var NAMES = { aurora: 'Aurora', rings: 'Rings', wave: 'Wave', glow: 'Glow' };
  var FNAMES = { rumble: 'Rumble', beat: 'Beat', heart: 'Heartbeat' };
  function btns(group, list, names, cur) {
    return list.map(function (k) { return '<button type="button" class="sn-b" data-' + group + '="' + k + '" aria-pressed="' + (k === cur) + '">' + names[k] + '</button>'; }).join('');
  }
  var LNAMES = { off: 'Off', soft: 'Soft', medium: 'Medium', strong: 'Strong' };
  host.innerHTML =
    '<h2 id="senses-h" class="live-h">See and feel the sound</h2>' +
    '<p class="live-lede">Press play on any sound below and watch it move, or let your phone feel it with you. Everything happens on your device.</p>' +
    '<div class="sn-stage"><canvas id="sn-cv" aria-hidden="true"></canvas><p class="sn-idle" id="sn-idle">Press play on a track or a live soundscape to see it here.</p></div>' +
    '<div class="sn-row" role="group" aria-label="How to see the sound"><span class="sn-l">See</span>' + btns('look', LOOKS, NAMES, look) + '</div>' +
    '<div class="sn-row" id="sn-feel-row" role="group" aria-label="How strongly to feel the sound"><span class="sn-l">Feel</span>' + btns('level', LEVELS, LNAMES, level) + '</div>' +
    '<div class="sn-row" id="sn-mode-row" role="group" aria-label="What to feel"><span class="sn-l">Like</span>' + btns('feel', FEELS, FNAMES, feel) +
    '<button type="button" class="sn-b sn-test" id="sn-test">Try a pulse</button></div>' +
    '<p class="sn-note" id="sn-note"></p><p class="sn-status" id="sn-status" role="status" aria-live="polite"></p>';
  host.querySelectorAll('p, h2').forEach(function (n) { n.classList.add('no-bubble'); });
  var cv = document.getElementById('sn-cv'), g = cv.getContext('2d'), idle = document.getElementById('sn-idle'),
      status = document.getElementById('sn-status'), note = document.getElementById('sn-note');
  note.textContent = canVib
    ? 'Vibration is off until you choose a strength. It is short and gentle, uses a little battery, and stops when the sound stops. Low sounds also rumble through a phone speaker or headphones, which is its own kind of feeling.'
    : 'This device cannot vibrate from a web page (iPhones cannot), so you can see the sound here, and feel it through the speaker or headphones. On an Android phone with Chrome you can also feel it as vibration.';
  if (!canVib) { document.getElementById('sn-feel-row').hidden = true; document.getElementById('sn-mode-row').hidden = true; }
  if (RM) note.textContent += ' Your device asks for less motion, so the picture is a still, slowly changing glow.';

  function say(msg) { status.textContent = msg; }
  function press(group, val) { host.querySelectorAll('[data-' + group + ']').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-' + group) === val)); }); }
  host.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-look')) { look = b.getAttribute('data-look'); lsSet('tol-sense-look', look); press('look', look); rings.length = 0; say('Seeing sound as ' + NAMES[look] + '.'); }
    else if (b.hasAttribute('data-level')) { level = b.getAttribute('data-level'); lsSet('tol-haptic', level); press('level', level); if (level === 'off') stopBuzz(); else { buzz(24, true); } say(level === 'off' ? 'Vibration is off.' : 'Feeling sound: ' + LNAMES[level] + ', ' + FNAMES[feel] + '.'); heartOn = false; }
    else if (b.hasAttribute('data-feel')) { feel = b.getAttribute('data-feel'); lsSet('tol-haptic-mode', feel); press('feel', feel); heartOn = false; stopBuzz(); say('Feeling the sound as ' + FNAMES[feel] + (level === 'off' ? '. Choose a strength above to turn vibration on.' : '.')); }
    else if (b.id === 'sn-test') {
      if (level === 'off') { say('Choose Soft, Medium or Strong first.'); return; }
      buzz(30, true); setTimeout(function () { buzz(60, true); }, 450); say('That was a test pulse.');
    }
  });

  // ---------- finding what is playing ----------
  var AC = null, taps = typeof WeakMap === 'function' ? new WeakMap() : null, eng = null, an = null, bufF = null, bufT = null, srcName = '';
  var engName = '';
  window.TOLSenses = { engine: function (e, name) { eng = e || null; engName = e && name ? name : ''; } };
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
    var audios = document.querySelectorAll('.track-player');
    for (var i = 0; i < audios.length; i++) {
      var a = audios[i];
      if (!a.paused && !a.ended) { var n = trackAnalyser(a); if (n) { var card = a.closest('.track-card'), h = card && card.querySelector('.track-title'); return { an: n, name: h ? h.textContent.replace(/^\d+\.\s*/, '') : 'the track' }; } }
    }
    var L = window.TOLLiveSounds;
    if (L && L.playing && L.playing()) { var la = L.analyser && L.analyser(); if (la) return { an: la, name: L.playing() }; }
    if (eng && eng.analyser) { var ea = eng.analyser(); if (ea) return { an: ea, name: engName || 'the soundscape' }; }
    return null;
  }

  // ---------- reading the sound ----------
  var lvl = 0, bass = 0, mid = 0, high = 0, ema = 0, lastBeat = 0, lastRumble = 0, rings = [], t0 = performance.now();
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
    if (b > ema * 1.16 + 0.035 && b > 0.12 && now - lastBeat > 380) { beat = true; lastBeat = now; }
    return { beat: beat, now: now };
  }

  // ---------- feeling it ----------
  var heartOn = false, heartTimer = 0;
  function buzz(ms, force) {
    if (!canVib || level === 'off') return;
    var d = Math.max(8, Math.min(70, Math.round(ms * GAIN[level])));
    try { navigator.vibrate(d); } catch (e) {}
  }
  function stopBuzz() { clearTimeout(heartTimer); heartOn = false; try { if (canVib) navigator.vibrate(0); } catch (e) {} }
  function heartbeat() {
    if (!heartOn) return;
    var k = GAIN[level] || 1;
    try { navigator.vibrate([Math.min(60, Math.round(26 * k)), 90, Math.min(50, Math.round(20 * k))]); } catch (e) {}
    heartTimer = setTimeout(heartbeat, 940);
  }
  function feelStep(r) {
    if (!canVib || level === 'off') { if (heartOn) stopBuzz(); return; }
    if (feel === 'heart') { if (!heartOn) { heartOn = true; heartbeat(); } return; }
    if (heartOn) stopBuzz();
    if (feel === 'beat') { if (r.beat) buzz(14 + bass * 40); }
    else if (feel === 'rumble' && bass > 0.06 && r.now - lastRumble > 450) { lastRumble = r.now; buzz(9 + bass * 55); }
  }

  // ---------- drawing it ----------
  var W = 300, H = 220, dpr = 1;
  function fit() {
    var w = Math.max(200, Math.round(cv.parentNode.clientWidth)); dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(H * dpr); }
    cv.style.height = H + 'px'; W = w; g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function bg() { var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#171A34'); gr.addColorStop(1, '#262050'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  function rgba(c, a) { return 'rgba(' + c + ',' + a.toFixed(3) + ')'; }
  var WARM = '247,168,150', TEAL = '127,224,215', VIOLET = '178,150,240', GOLD = '248,215,106';
  function drawAurora(t) {
    bg();
    var cols = [[WARM, bass], [TEAL, mid], [VIOLET, high]];
    for (var i = 0; i < 3; i++) {
      var c = cols[i][0], e = cols[i][1], amp = 14 + e * 62, base = H * (0.38 + i * 0.17), ph = t / (1800 + i * 500) + i * 2;
      g.beginPath(); g.moveTo(0, H);
      for (var x = 0; x <= W; x += 6) { var y = base + Math.sin(x / (70 + i * 30) + ph) * amp + Math.sin(x / (33 + i * 11) - ph * 1.4) * amp * 0.35; g.lineTo(x, y); }
      g.lineTo(W, H); g.closePath();
      var gr = g.createLinearGradient(0, base - amp, 0, H); gr.addColorStop(0, rgba(c, 0.18 + e * 0.55)); gr.addColorStop(1, rgba(c, 0));
      g.fillStyle = gr; g.fill();
    }
  }
  function drawRings(t, beatNow) {
    bg();
    var cx = W / 2, cy = H / 2;
    if (beatNow || (feel === 'rumble' && lvl > 0.08 && t - (drawRings.last || 0) > 1700)) { rings.push({ r: 20, a: 0.35 + lvl * 0.6, c: beatNow ? WARM : TEAL }); drawRings.last = t; if (rings.length > 14) rings.shift(); }
    for (var i = rings.length - 1; i >= 0; i--) {
      var o = rings[i]; o.r += 1.1 + lvl * 2.2; o.a *= 0.985;
      if (o.a < 0.02 || o.r > W) { rings.splice(i, 1); continue; }
      g.strokeStyle = rgba(o.c, o.a); g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, o.r, 0, Math.PI * 2); g.stroke();
    }
    var r = 16 + bass * 34 + mid * 14, gr = g.createRadialGradient(cx, cy, 2, cx, cy, r * 2.2);
    gr.addColorStop(0, rgba(GOLD, 0.95)); gr.addColorStop(0.5, rgba(WARM, 0.35 + lvl * 0.3)); gr.addColorStop(1, rgba(VIOLET, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r * 2.2, 0, Math.PI * 2); g.fill();
  }
  function drawWave() {
    bg();
    var n = bufT.length, step = Math.max(1, Math.floor(n / W)), mid2 = H / 2, amp = 20 + lvl * 80;
    g.lineJoin = 'round';
    for (var pass = 0; pass < 2; pass++) {
      g.beginPath();
      for (var i = 0, x = 0; i < n; i += step, x++) { var v = (bufT[i] - 128) / 128; var y = mid2 + v * amp * (pass ? 0.5 : 1); if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.strokeStyle = pass ? rgba(VIOLET, 0.45) : rgba(TEAL, 0.9); g.lineWidth = pass ? 5 : 2; g.stroke();
    }
  }
  function drawGlow() {
    bg();
    var r = 40 + lvl * 90, gr = g.createRadialGradient(W / 2, H / 2, 4, W / 2, H / 2, r * 1.6);
    gr.addColorStop(0, rgba(GOLD, 0.5 + lvl * 0.4)); gr.addColorStop(0.5, rgba(WARM, 0.2 + lvl * 0.3)); gr.addColorStop(1, rgba(VIOLET, 0));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  function drawIdle(t) {
    bg();
    var k = 0.5 + 0.5 * Math.sin(t / 2600), gr = g.createRadialGradient(W / 2, H / 2, 2, W / 2, H / 2, 70 + k * 12);
    gr.addColorStop(0, rgba(GOLD, 0.16)); gr.addColorStop(1, rgba(VIOLET, 0)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }

  // ---------- the loop ----------
  var visible = true, lastCheck = 0, lastDraw = 0, raf = 0;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0.05 }).observe(host);
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (document.hidden) { if (an) { an = null; stopBuzz(); } return; }
    if (now - lastCheck > 400) {
      lastCheck = now;
      var s = findSource();
      if (s && s.an !== an) { an = s.an; srcName = s.name; idle.hidden = true; say('Seeing ' + srcName + '.'); lastBeat = 0; ema = 0; }
      else if (!s && an) { an = null; stopBuzz(); idle.hidden = false; rings.length = 0; say('The sound stopped.'); }
    }
    if (!visible && !(an && level !== 'off')) return;
    if (RM && now - lastDraw < 160) { if (an) { var rr = analyse(); feelStep(rr); } return; }
    lastDraw = now; fit();
    if (!an) { RM ? drawGlow() : drawIdle(now - t0); return; }
    var r = analyse(); feelStep(r);
    if (!visible) return;
    var t = now - t0;
    if (look === 'rings') drawRings(t, r.beat); else if (look === 'wave') drawWave(); else if (look === 'glow') drawGlow(); else drawAurora(t);
  }
  window.addEventListener('pagehide', stopBuzz);
  document.addEventListener('visibilitychange', function () { if (document.hidden) stopBuzz(); });
  fit(); drawIdle(0);
  raf = requestAnimationFrame(loop);
})();
