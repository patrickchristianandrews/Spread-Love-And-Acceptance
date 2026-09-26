/* breathe.js — the Breathe break (loaded by site.js the first time someone taps Breathe)
   and the live soundscapes (also used by /soundscapes.html).

   Three methods: box breathing (4 in, 4 hold, 4 out, 4 hold), calm breathing (4 in, 6 out)
   and 4-7-8 for sleep. While you breathe, the screen tells you what to do now, gives one
   listen-to-your-body prompt each round, and now and then explains what is happening.

   Sound is made in the browser, or streams the site's own track. Nothing is sent anywhere,
   and choices are remembered only in this browser. */
(function () {
  'use strict';

  // ---------- Methods ----------
  var PATTERNS = {
    box: { name: 'Box breathing', how: 'Four equal sides: breathe in for 4, hold for 4, breathe out for 4, hold for 4. Follow the dot around the square.',
      steps: [['in', 4], ['top', 4], ['out', 4], ['bottom', 4]], shape: 'box' },
    calm: { name: 'Calm breathing', how: 'In for 4, out for 6. A longer breath out is the simplest way to tell your body it can settle.',
      steps: [['in', 4], ['out', 6]], shape: 'ring' },
    sleep: { name: '4-7-8 for sleep', how: 'In through your nose for 4, hold for 7, out through your mouth for 8. Lovely before bed. If the hold feels long, count faster and keep the rhythm.',
      steps: [['in', 4], ['top', 7], ['out', 8]], shape: 'ring' }
  };
  var WORD = { in: 'Breathe in', top: 'Hold', out: 'Breathe out', bottom: 'Hold' };
  var GUIDE = {
    in: ['Breathe in slowly through your nose.', 'Let your belly rise first, then your chest.', 'Fill up gently, like pouring water into a glass.', 'Feel the cool air at the tip of your nose.'],
    top: ['Hold gently. No squeezing, no strain.', 'Rest at the top, and notice the stillness.', 'Keep your shoulders soft while you hold.', 'Just pause. There’s nothing to do.'],
    out: ['Let it go slowly through your mouth.', 'Feel your shoulders drop as the air leaves.', 'Breathe out slow and warm, like fogging a mirror.', 'Let your whole body get a little heavier.'],
    bottom: ['Rest at the bottom, empty and easy.', 'Notice the quiet before the next breath.', 'Stay soft. The next breath will come.', 'Pause, and let your belly relax.']
  };
  // one prompt per round, for listening to what your body and mind are doing
  var BODY = [
    ['Where does your breath land?', 'Notice whether your belly or your chest moves most. Either is fine. Just notice.'],
    ['Notice your heartbeat.', 'Your heart naturally slows a little each time you breathe out. See if you can feel it.'],
    ['Scan your face.', 'Forehead, eyes, jaw, tongue. Let each one soften as you breathe out.'],
    ['Notice your thoughts.', 'If your mind wanders, that’s normal. Notice where it went, and come back to the count.'],
    ['Feel your hands.', 'Many people notice their hands getting warmer or heavier as they relax.'],
    ['Listen to the sounds around you.', 'Near sounds, far sounds. Let them come and go without following them.'],
    ['Notice your shoulders.', 'Are they lower than when you started? Let them drop one more notch.'],
    ['Name what you feel.', 'Tired, worried, okay, anything. Name it gently. Nothing needs fixing right now.'],
    ['Feel the ground under you.', 'Your feet, your seat, your back. Let them take your weight.'],
    ['Notice the space between thoughts.', 'In the pauses there may be a moment of quiet. Rest there.'],
    ['Check in with your stomach.', 'Tight or soft? Breathe into it and let it loosen.'],
    ['Notice your breath getting easier.', 'You don’t have to make it happen. Let the rhythm carry you.']
  ];
  // now and then: what is happening, and why it helps
  var WHY = [
    'Slow, steady breathing turns up your body’s “rest and digest” side, the opposite of fight or flight.',
    'Breathing out slowly nudges your heart rate down. That’s why the out-breath matters so much.',
    'Counting gives a busy mind one simple job, so worries get less room.',
    'The pauses slow your whole rhythm down, so each breath is deeper and calmer.',
    'Nurses, athletes and first responders use box breathing to steady themselves under pressure.',
    'Paying attention to your body, without judging it, is a skill. Every round is practice.'
  ];

  // ---------- Sound ----------
  var PENTA = [130.81, 146.83, 164.81, 196, 220]; // C D E G A, the scale of The Breath Beneath
  function unlockMediaAudio() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try { // a moment of silence through a media element lets iPhones play with the silent switch on
      var n = 800, buf = new Uint8Array(44 + n), dv = new DataView(buf.buffer), w = function (o, s) { for (var i = 0; i < s.length; i++) buf[o + i] = s.charCodeAt(i); };
      w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
      dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); w(36, 'data'); dv.setUint32(40, n, true);
      for (var k = 44; k < 44 + n; k++) buf[k] = 128;
      var a = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))); var p = a.play(); if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  var SCAPES = {
    beneath: { name: 'The Breath Beneath', note: 'The original track: slow, deep and low. Best with headphones.' },
    deep: { name: 'Deep', note: 'In the style of The Breath Beneath: warm low drones with a slow heartbeat pulse, and notes that bloom now and then.' },
    ocean: { name: 'Ocean', note: 'Soft waves that rise as you breathe in and fall as you breathe out.' },
    rain: { name: 'Soft rain', note: 'Gentle rain on a quiet evening, with a warm hum underneath.' },
    bowls: { name: 'Singing bowls', note: 'Slow, ringing bowls over a soft drone.' }
  };

  function Engine() {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    unlockMediaAudio();
    var ac = new AC(), sr = ac.sampleRate, master = ac.createGain(), comp = ac.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 18; comp.ratio.value = 2.5; comp.attack.value = 0.02; comp.release.value = 0.5;
    master.gain.value = 0; master.connect(comp); comp.connect(ac.destination);
    var hall = ac.createConvolver(), irLen = Math.floor(sr * 4.5), ir = ac.createBuffer(2, irLen, sr);
    for (var ch = 0; ch < 2; ch++) { var d = ir.getChannelData(ch); for (var i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 3); }
    hall.buffer = ir; var wet = ac.createGain(); wet.gain.value = 0.5; hall.connect(wet); wet.connect(master);
    function send(node, dry) { var g = ac.createGain(); g.gain.value = dry; node.connect(g); g.connect(master); node.connect(hall); }
    function pan(v) { if (ac.createStereoPanner) { var p = ac.createStereoPanner(); p.pan.value = v; return p; } return ac.createGain(); }
    function noise(sec) { var len = Math.floor(sr * sec), nb = ac.createBuffer(1, len, sr), dd = nb.getChannelData(0), l = 0; for (var i = 0; i < len; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; dd[i] = l * 3.5; } var s = ac.createBufferSource(); s.buffer = nb; s.loop = true; return s; }
    function white(sec) { var len = Math.floor(sr * sec), nb = ac.createBuffer(1, len, sr), dd = nb.getChannelData(0); for (var i = 0; i < len; i++) dd[i] = Math.random() * 2 - 1; var s = ac.createBufferSource(); s.buffer = nb; s.loop = true; return s; }
    function bowl(f, vol, where) {
      var t = ac.currentTime + (where || 0), g = ac.createGain(); g.gain.value = 1; send(g, 0.6);
      [[1, 1], [2.71, .42], [5.16, .18], [8.43, .07]].forEach(function (p, i) {
        [0, 1.2 + i].forEach(function (beat, j) {
          var o = ac.createOscillator(), og = ac.createGain(), pn = pan(j ? 0.35 : -0.35), dec = 8 / (1 + i * 0.9);
          o.frequency.value = f * p[0] + beat; og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(vol * p[1] * 0.5, t + 0.015);
          og.gain.exponentialRampToValueAtTime(0.0001, t + dec); o.connect(og); og.connect(pn); pn.connect(g); o.start(t); o.stop(t + dec + 0.1);
        });
      });
    }
    // a soft, slow note that swells in and fades away (the "blooms" of the Deep soundscape)
    function bloom(f, vol, len) {
      var t = ac.currentTime, o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), pn = pan(Math.random() * 1.2 - 0.6), lp = ac.createBiquadFilter();
      o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = f; o2.frequency.value = f; o2.detune.value = 7; lp.type = 'lowpass'; lp.frequency.value = 1400;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + len * 0.4); g.gain.linearRampToValueAtTime(0, t + len);
      o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(pn); send(pn, 0.4); o.start(t); o2.start(t); o.stop(t + len + 0.1); o2.stop(t + len + 0.1);
    }

    var bed = null, bedName = '', media = null, mediaSrc = null, timers = [];
    function clearTimers() { timers.forEach(clearInterval); timers = []; }
    function build(name) {
      var g = ac.createGain(), nodes = [], react = {}; g.gain.value = 0; g.connect(master);
      function keep(n) { nodes.push(n); return n; }
      if (name === 'beneath') {
        if (!media) {
          media = new Audio('/assets/audio/soundscapes/The-Breath-Beneath.mp4'); media.loop = true; media.preload = 'auto'; media.setAttribute('playsinline', '');
          try { mediaSrc = ac.createMediaElementSource(media); } catch (e) { mediaSrc = null; }
        }
        var mg = ac.createGain(); mg.gain.value = 1.1;
        if (mediaSrc) { mediaSrc.connect(mg); mg.connect(g); } else media.volume = 1;
        media.currentTime = 0; var pr = media.play(); if (pr && pr.catch) pr.catch(function () {});
        react.stop = function () { media.pause(); try { if (mediaSrc) mediaSrc.disconnect(); } catch (e) {} };
      }
      if (name === 'deep' || name === 'bowls' || name === 'rain' || name === 'ocean') {
        // the warm low bed shared by every generated soundscape: C and G drones, with an octave
        // above so phone speakers can carry them, and a slow heartbeat pulse every two seconds
        var low = ac.createGain(), lf = ac.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.value = name === 'deep' ? 1100 : 900;
        low.gain.value = name === 'deep' ? 0.24 : 0.17; low.connect(lf); send(lf, 0.8);
        [[65.41, .26], [98, .18], [130.81, .38], [196, .34], [261.63, .42], [329.63, .3], [392, .22]].forEach(function (v, i) {
          [-1, 1].forEach(function (side) {
            var o = keep(ac.createOscillator()), og = ac.createGain(), pn = pan(side * (0.2 + i * 0.1));
            o.type = i < 2 ? 'sine' : 'triangle'; o.frequency.value = v[0]; o.detune.value = side * (3 + i * 2);
            og.gain.value = v[1] * 0.5; o.connect(og); og.connect(pn); pn.connect(low); o.start();
          });
        });
        var pulse = keep(ac.createOscillator()), pg = ac.createGain(); pulse.frequency.value = 1 / 2.05; pg.gain.value = name === 'deep' ? 0.07 : 0.03;
        pulse.connect(pg); pg.connect(low.gain); pulse.start();
        var drift = keep(ac.createOscillator()), dg = ac.createGain(); drift.frequency.value = 0.03; dg.gain.value = 260; drift.connect(dg); dg.connect(lf.frequency); drift.start();
        react.low = low; react.lf = lf;
      }
      if (name === 'deep') {
        timers.push(setInterval(function () { var f = PENTA[Math.floor(Math.random() * 5)] * (Math.random() < 0.5 ? 2 : 1); bloom(f, 0.08, 7 + Math.random() * 4); }, 4300));
        setTimeout(function () { bloom(329.63, 0.08, 9); }, 800);
      }
      if (name === 'bowls') {
        var notes = [293.66, 329.63, 392, 440, 523.25];
        timers.push(setInterval(function () { bowl(notes[Math.floor(Math.random() * notes.length)], 0.1); }, 5500));
        setTimeout(function () { bowl(392, 0.1); }, 600);
      }
      if (name === 'ocean') {
        var sea = ac.createGain(), sf = ac.createBiquadFilter(); sea.gain.value = 0.04; sf.type = 'lowpass'; sf.frequency.value = 1000;
        [[-0.6, 3.1], [0.6, 3.7]].forEach(function (v) { var ns = keep(noise(v[1])), pn = pan(v[0]); ns.connect(pn); pn.connect(sf); ns.start(); });
        sf.connect(sea); send(sea, 0.8); react.sea = sea; react.sf = sf;
        var foam = ac.createGain(), ff = ac.createBiquadFilter(), fs = keep(noise(2.3)); foam.gain.value = 0; ff.type = 'bandpass'; ff.frequency.value = 3000; ff.Q.value = 0.7;
        fs.connect(ff); ff.connect(foam); send(foam, 0.5); fs.start(); react.foam = foam;
      }
      if (name === 'rain') {
        var rn = keep(white(2.7)), hp = ac.createBiquadFilter(), bp = ac.createBiquadFilter(), rg = ac.createGain();
        hp.type = 'highpass'; hp.frequency.value = 900; bp.type = 'lowpass'; bp.frequency.value = 5500; rg.gain.value = 0.05;
        rn.connect(hp); hp.connect(bp); bp.connect(rg); send(rg, 0.9); rn.start();
        var drops = ac.createGain(); drops.gain.value = 0.9; send(drops, 0.7);
        timers.push(setInterval(function () { // a few soft drops on leaves and glass
          for (var k = 0; k < 3; k++) {
            var t = ac.currentTime + Math.random() * 0.5, o = ac.createOscillator(), og = ac.createGain(), pn = pan(Math.random() * 1.6 - 0.8), f0 = 1800 + Math.random() * 2600;
            o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + 0.05);
            og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(0.012 + Math.random() * 0.015, t + 0.003); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
            o.connect(og); og.connect(pn); pn.connect(drops); o.start(t); o.stop(t + 0.12);
          }
        }, 450));
      }
      return { g: g, nodes: nodes, react: react };
    }
    function setBed(name) {
      if (name === bedName) return;
      var old = bed; clearTimers();
      if (old) {
        old.g.gain.setTargetAtTime(0, ac.currentTime, 0.6);
        setTimeout(function () { try { old.nodes.forEach(function (n) { n.stop(); }); if (old.react.stop) old.react.stop(); old.g.disconnect(); } catch (e) {} }, 3000);
      }
      bedName = name; bed = name ? build(name) : null;
      if (bed) bed.g.gain.setTargetAtTime(1, ac.currentTime, 1.2);
    }
    var CUE = { in: 392, top: 440, out: 329.63, bottom: 293.66 };
    return {
      ctx: ac,
      start: function (name) { if (ac.state !== 'running') ac.resume(); setBed(name); master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(0.75, ac.currentTime, 1.2); },
      bed: setBed,
      mute: function (m) { master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(m ? 0 : 0.75, ac.currentTime, m ? 0.3 : 0.8); if (media) { if (m) media.pause(); else if (bedName === 'beneath') media.play().catch(function () {}); } },
      cue: function (k) { bowl(CUE[k] || 392, k === 'in' || k === 'out' ? 0.075 : 0.04); },
      // soundscapes that follow the breath
      phase: function (k, secs) {
        if (!bed) return; var r = bed.react, t = ac.currentTime, tc = Math.max(0.6, secs / 3);
        if (r.sea) {
          if (k === 'in') { r.sea.gain.setTargetAtTime(0.12, t, tc); r.sf.frequency.setTargetAtTime(2400, t, tc); r.foam.gain.setTargetAtTime(0.02, t + secs * 0.3, tc); }
          if (k === 'out') { r.sea.gain.setTargetAtTime(0.02, t, tc); r.sf.frequency.setTargetAtTime(800, t, tc); r.foam.gain.setTargetAtTime(0, t, 0.8); }
        }
        if (r.lf) {
          if (k === 'in') r.lf.frequency.setTargetAtTime(1600, t, tc);
          if (k === 'out') r.lf.frequency.setTargetAtTime(800, t, tc);
        }
      },
      chord: function () { bowl(293.66, 0.09); bowl(440, 0.06, 0.7); bowl(587.33, 0.05, 1.4); },
      end: function () {
        clearTimers(); master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(0, ac.currentTime, 0.8);
        setTimeout(function () { try { if (bed) { bed.nodes.forEach(function (n) { n.stop(); }); if (bed.react.stop) bed.react.stop(); } ac.close(); } catch (e) {} }, 3500);
      }
    };
  }

  // ---------- The break ----------
  function get(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tap(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

  var ov = null, api = null;
  function build() {
    var floaters = ''; for (var f = 0; f < 9; f++) floaters += '<b class="' + (f % 3 === 1 ? 'tol-heart' : 'tol-bub') + '"></b>';
    function chips(group, items, cur) {
      return '<div class="br-chips" role="group" aria-label="' + group + '">' + items.map(function (it) {
        return '<button type="button" data-' + group + '="' + it[0] + '" aria-pressed="' + (it[0] === cur) + '">' + it[1] + '</button>';
      }).join('') + '</div>';
    }
    ov = document.createElement('div');
    ov.className = 'tol-breathe br'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Breathing break'); ov.hidden = true;
    ov.innerHTML =
      '<div class="tol-breathe-aurora" aria-hidden="true"><i></i><i></i><i></i></div>' +
      '<div class="tol-breathe-bg" aria-hidden="true">' + floaters + '</div>' +
      // choose
      '<section class="br-pick">' +
        '<h2>Take a breather</h2>' +
        '<p class="br-lede">Pick a way to breathe. The screen will guide you the whole way.</p>' +
        '<div class="br-methods">' +
          Object.keys(PATTERNS).map(function (k) {
            var p = PATTERNS[k];
            return '<button type="button" class="br-method" data-method="' + k + '" aria-pressed="false"><strong>' + esc(p.name) + '</strong><small>' +
              p.steps.map(function (s) { return (s[0] === 'in' ? 'in ' : s[0] === 'out' ? 'out ' : 'hold ') + s[1]; }).join(' · ') + '</small></button>';
          }).join('') +
        '</div>' +
        '<p class="br-how"></p>' +
        '<p class="br-label">How long</p>' + chips('min', [['1', '1 min'], ['3', '3 min'], ['5', '5 min']], get('tol-br-min', '1')) +
        '<p class="br-label">Sound</p>' + chips('scape', [['beneath', 'The Breath Beneath'], ['deep', 'Deep'], ['ocean', 'Ocean'], ['rain', 'Soft rain'], ['bowls', 'Singing bowls'], ['off', 'Silence']], get('tol-br-scape', 'deep')) +
        '<p class="br-scape-note"></p>' +
        '<p class="br-phones">&#127911; Soundscapes are more beneficial with headphones: the deep, low tones and the gentle left-to-right movement come through fully.</p>' +
        '<div class="tol-breathe-row"><button type="button" class="br-begin" data-act="begin">Begin</button><button type="button" data-act="close">Not now</button></div>' +
      '</section>' +
      // breathe
      '<section class="br-run" hidden>' +
        '<p class="br-top"><span class="br-method-name"></span> · <span class="br-round"></span></p>' +
        '<p class="tol-breathe-focus" aria-live="polite"><span></span><small></small></p>' +
        '<div class="br-stage" aria-hidden="true">' +
          '<span class="tol-breathe-halo"></span><span class="tol-breathe-ripples"></span>' +
          '<svg class="br-shape" viewBox="0 0 200 200"><defs><linearGradient id="br-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE3C4"/><stop offset=".5" stop-color="#F7B8C6"/><stop offset="1" stop-color="#CDB8F2"/></linearGradient></defs>' +
            '<path class="br-track" d=""/><path class="br-trail" d=""/><g class="br-labels"></g><circle class="br-dot" r="7" cx="0" cy="0"/></svg>' +
          '<div class="tol-breathe-orb"><span class="tol-breathe-count"></span></div>' +
        '</div>' +
        '<p class="tol-breathe-word" aria-live="polite"></p>' +
        '<p class="br-guide"></p>' +
        '<p class="br-why"></p>' +
        '<div class="br-progress" aria-hidden="true"><i></i></div>' +
        '<div class="tol-breathe-row"><button type="button" data-act="close">I’m done</button><button type="button" data-act="mute" aria-pressed="false">&#127925; Sound on</button></div>' +
      '</section>' +
      // done
      '<section class="br-done" hidden>' +
        '<p class="br-heart" aria-hidden="true">&#9829;</p>' +
        '<h2>Well done.</h2>' +
        '<p class="br-lede">Before you go, take a moment to notice:</p>' +
        '<ul class="br-reflect"><li>Is your breathing slower than when you started?</li><li>Are your shoulders lower, your jaw softer?</li><li>Is your mind a little quieter, even by a notch?</li></ul>' +
        '<p class="br-lede">Whatever you notice is fine. Coming back to this often is what makes it work.</p>' +
        '<div class="tol-breathe-row"><button type="button" data-act="again">Again</button><button type="button" data-act="change">Change method</button><button type="button" data-act="close">I’m done</button><a href="/night-garden.html">Visit the Night Garden</a></div>' +
      '</section>';
    document.body.appendChild(ov);
    wire();
  }

  var $ = function (q) { return ov.querySelector(q); };
  var method = 'box', minutes = 1, scape = 'deep', engine = null, muted = false, timers = [], raf = 0, last = null;
  var run = { start: 0, total: 0, cycle: 0, rounds: 0 };
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function stopAll() { timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); raf = 0; }
  function soft(node, text) {
    if (node.textContent === text) return;
    node.classList.add('is-fading');
    setTimeout(function () { node.textContent = text; node.classList.remove('is-fading'); }, 260);
  }
  function show(which) { ['pick', 'run', 'done'].forEach(function (w) { $('.br-' + w).hidden = w !== which; }); if (ov) ov.scrollTop = 0; }

  function pickUI() {
    ov.querySelectorAll('[data-method]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-method') === method)); });
    ov.querySelectorAll('[data-min]').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-min') === minutes)); });
    ov.querySelectorAll('[data-scape]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-scape') === scape)); });
    $('.br-how').textContent = PATTERNS[method].how;
    $('.br-scape-note').textContent = scape === 'off' ? 'Just the guide on screen, in silence.' : SCAPES[scape].note;
  }

  // the path the dot follows: a square for box breathing, a circle otherwise
  var SHAPE = { len: 0, at: null };
  function drawShape() {
    var P = PATTERNS[method], track = $('.br-track'), trail = $('.br-trail'), labels = $('.br-labels');
    labels.innerHTML = '';
    if (P.shape === 'box') {
      var d = 'M30 170 L30 30 L170 30 L170 170 Z';
      track.setAttribute('d', d); trail.setAttribute('d', d);
      [['Breathe in', 16, 100, -90], ['Hold', 100, 18, 0], ['Breathe out', 184, 100, 90], ['Hold', 100, 188, 0]].forEach(function (l) {
        var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', l[1]); t.setAttribute('y', l[2]); t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'middle');
        if (l[3]) t.setAttribute('transform', 'rotate(' + l[3] + ' ' + l[1] + ' ' + l[2] + ')');
        t.textContent = l[0]; labels.appendChild(t);
      });
    } else {
      var c = 'M100 22 A78 78 0 1 1 99.99 22 Z';
      track.setAttribute('d', c); trail.setAttribute('d', c);
    }
    SHAPE.len = track.getTotalLength();
    trail.style.strokeDasharray = SHAPE.len; trail.style.strokeDashoffset = SHAPE.len;
  }

  function begin() {
    var P = PATTERNS[method];
    run.cycle = P.steps.reduce(function (s, x) { return s + x[1]; }, 0);
    run.rounds = Math.max(2, Math.round(minutes * 60 / run.cycle));
    show('run'); ov.scrollTop = 0; drawShape();
    $('.br-method-name').textContent = P.name; $('.br-round').textContent = 'Getting ready';
    soft($('.tol-breathe-focus span'), 'Sit comfortably, and let your eyes soften.'); soft($('.tol-breathe-focus small'), P.how);
    soft($('.tol-breathe-word'), 'Get ready…'); $('.br-guide').textContent = 'Breathe out fully first, to make room.'; $('.br-why').textContent = '';
    $('.tol-breathe-count').textContent = ''; $('.br-progress i').style.width = '0';
    var orb = $('.tol-breathe-orb'); orb.style.transition = 'transform 2s ease'; orb.style.transform = 'scale(.7)';
    if (scape !== 'off') {
      if (!engine) engine = Engine();
      if (engine) { engine.start(scape); if (muted) engine.mute(true); }
    }
    muteUI();
    run.start = performance.now() + 3500;
    later(function () { stepLoop(0, 0); }, 3500);
    raf = requestAnimationFrame(tick);
  }

  var cur = { round: 0, step: 0, stepStart: 0, stepLen: 0, k: '' };
  function stepLoop(round, step) {
    var P = PATTERNS[method];
    if (round >= run.rounds) { finish(); return; }
    var s = P.steps[step], k = s[0], secs = s[1];
    cur = { round: round, step: step, stepStart: performance.now(), stepLen: secs * 1000, k: k };
    if (step === 0) {
      $('.br-round').textContent = 'Round ' + (round + 1) + ' of ' + run.rounds;
      var b = BODY[round % BODY.length];
      if (round === run.rounds - 1) b = ['Notice how you feel now.', 'Compare it with when you started. Even a little calmer counts.'];
      soft($('.tol-breathe-focus span'), b[0]); soft($('.tol-breathe-focus small'), b[1]);
      soft($('.br-why'), round % 2 === 1 ? 'What’s happening: ' + WHY[((round - 1) / 2) % WHY.length] : '');
      ripple();
    }
    soft($('.tol-breathe-word'), WORD[k]);
    soft($('.br-guide'), GUIDE[k][(round + step) % GUIDE[k].length]);
    var orb = $('.tol-breathe-orb');
    orb.style.transition = 'transform ' + secs + 's cubic-bezier(.45,0,.55,1)';
    if (k === 'in') orb.style.transform = 'scale(1.12)';
    if (k === 'out') orb.style.transform = 'scale(.7)';
    ov.classList.toggle('is-in', k === 'in' || k === 'top'); ov.classList.toggle('is-out', k === 'out' || k === 'bottom');
    for (var i = 0; i < secs; i++) (function (n) { later(function () { $('.tol-breathe-count').textContent = String(secs - n); }, n * 1000); })(i);
    if (engine && !muted && scape !== 'off') { engine.cue(k); engine.phase(k, secs); }
    tap(k === 'in' ? 14 : 8);
    var next = step + 1 < P.steps.length ? [round, step + 1] : [round + 1, 0];
    later(function () { stepLoop(next[0], next[1]); }, secs * 1000);
  }

  // moves the dot around the shape and fills the trail, smoothly, every frame
  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (!cur.k || now < run.start) return;
    var P = PATTERNS[method], before = 0;
    for (var i = 0; i < cur.step; i++) before += P.steps[i][1];
    var frac = (before * 1000 + Math.min(cur.stepLen, now - cur.stepStart)) / (run.cycle * 1000);
    var pt = $('.br-track').getPointAtLength(SHAPE.len * frac), dot = $('.br-dot');
    dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
    $('.br-trail').style.strokeDashoffset = SHAPE.len * (1 - frac);
    var all = (cur.round * run.cycle * 1000 + before * 1000 + Math.min(cur.stepLen, now - cur.stepStart)) / (run.rounds * run.cycle * 1000);
    $('.br-progress i').style.width = (all * 100).toFixed(2) + '%';
  }
  function ripple() { var r = document.createElement('i'), box = $('.tol-breathe-ripples'); box.appendChild(r); setTimeout(function () { r.remove(); }, 4200); }

  function finish() {
    stopAll(); cur.k = ''; ov.classList.remove('is-in', 'is-out'); show('done');
    if (engine && !muted && scape !== 'off') { engine.chord(); later(function () { if (engine) engine.mute(true); }, 7000); }
    tap([10, 60, 10]);
    var btn = ov.querySelector('.br-done [data-act="again"]'); if (btn) btn.focus();
    try { var n = +get('tol-br-count', '0') + 1; set('tol-br-count', String(n)); } catch (e) {}
  }
  function muteUI() {
    var b = $('.br-run [data-act="mute"]'); b.hidden = scape === 'off';
    b.setAttribute('aria-pressed', String(muted)); b.innerHTML = muted ? '&#127925; Sound off' : '&#127925; Sound on';
  }

  function open() {
    if (!ov) build();
    last = document.activeElement; ov.hidden = false; document.documentElement.style.overflow = 'hidden';
    ov.classList.remove('is-open', 'is-in', 'is-out'); void ov.offsetWidth; ov.classList.add('is-open');
    method = get('tol-br-method', 'box'); if (!PATTERNS[method]) method = 'box';
    minutes = +get('tol-br-min', '1') || 1; scape = get('tol-br-scape', 'deep'); if (!SCAPES[scape] && scape !== 'off') scape = 'deep';
    muted = false; show('pick'); pickUI();
    $('.br-begin').focus();
  }
  function close() {
    stopAll(); cur.k = '';
    if (engine) { engine.end(); engine = null; }
    ov.hidden = true; document.documentElement.style.overflow = '';
    if (last && last.focus) last.focus();
  }

  function wire() {
    ov.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-method')) { method = b.getAttribute('data-method'); set('tol-br-method', method); pickUI(); }
      if (b.hasAttribute('data-min')) { minutes = +b.getAttribute('data-min'); set('tol-br-min', String(minutes)); pickUI(); }
      if (b.hasAttribute('data-scape')) { scape = b.getAttribute('data-scape'); set('tol-br-scape', scape); pickUI(); }
      var act = b.getAttribute('data-act');
      if (act === 'begin' || act === 'again') begin();
      if (act === 'change') { if (engine) { engine.end(); engine = null; } show('pick'); pickUI(); $('.br-begin').focus(); }
      if (act === 'close') close();
      if (act === 'mute') { muted = !muted; if (engine) engine.mute(muted); muteUI(); }
    });
    document.addEventListener('keydown', function (e) {
      if (!ov || ov.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        var f = Array.prototype.filter.call(ov.querySelectorAll('button, a'), function (x) { return x.offsetParent !== null; }), first = f[0], lastEl = f[f.length - 1];
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
      }
    });
  }

  api = { open: open, close: close, Engine: Engine, SCAPES: SCAPES };
  window.TOLBreathe = api;
})();
