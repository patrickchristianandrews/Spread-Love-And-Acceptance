/* calm-music.js — the shared music for the Night Garden and Quiet Words.
   Warm pads drift slowly through four dreamy chords (8 seconds each, two box-breathing
   counts), a soft kalimba-like melody wanders over them, and everything the player does is
   answered with notes that fit the chord playing now, so nothing ever clashes.
   Made in the browser; nothing is downloaded or sent. */
(function () {
  'use strict';
  function hz(n) { return 440 * Math.pow(2, (n - 69) / 12); } // MIDI note number to frequency
  // Cmaj9, Am9, Fmaj9, G6/9: gentle, open, always resolving back home
  var CHORDS = [
    { pad: [48, 55, 64, 71, 74], tones: [60, 62, 64, 67, 71, 72, 74, 76, 79] },
    { pad: [45, 52, 60, 67, 71], tones: [57, 60, 62, 64, 67, 69, 71, 72, 76] },
    { pad: [41, 48, 57, 64, 67], tones: [57, 60, 64, 65, 67, 69, 72, 76, 77] },
    { pad: [43, 50, 59, 64, 69], tones: [59, 62, 64, 67, 69, 71, 74, 76, 79] }
  ];

  function create(ac, out) {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    var sr = ac.sampleRate, master = ac.createGain(); master.gain.value = 0;
    if (out) master.connect(out);
    else { var comp = ac.createDynamicsCompressor(); comp.threshold.value = -22; comp.knee.value = 24; comp.ratio.value = 2; master.connect(comp); comp.connect(ac.destination); }
    // a warm, spacious hall
    var hall = ac.createConvolver(), len = Math.floor(sr * 4.5), ir = ac.createBuffer(2, len, sr);
    for (var ch = 0; ch < 2; ch++) { var d = ir.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    hall.buffer = ir; var wet = ac.createGain(); wet.gain.value = 0.6; hall.connect(wet); wet.connect(master);
    function send(node, dry) { var g = ac.createGain(); g.gain.value = dry; node.connect(g); g.connect(master); node.connect(hall); }
    function pan(v) { if (ac.createStereoPanner) { var p = ac.createStereoPanner(); p.pan.value = v; return p; } return ac.createGain(); }

    // the pad: one voice pair per chord note, crossfading gently from chord to chord
    var padBus = ac.createGain(), padLP = ac.createBiquadFilter(); padBus.gain.value = 0.09; padLP.type = 'lowpass'; padLP.frequency.value = 1300; padLP.Q.value = 0.3;
    padBus.connect(padLP); send(padLP, 0.55);
    var drift = ac.createOscillator(), driftG = ac.createGain(); drift.frequency.value = 0.025; driftG.gain.value = 250; drift.connect(driftG); driftG.connect(padLP.frequency); drift.start();
    var voices = [], stops = [drift];
    for (var v = 0; v < 5; v++) {
      var vg = ac.createGain(); vg.gain.value = v < 2 ? 0.55 : 0.4; vg.connect(padBus);
      var pair = [-1, 1].map(function (side) {
        var o = ac.createOscillator(), p = pan(side * (0.15 + v * 0.1)); o.type = 'sine'; o.detune.value = side * (2 + v);
        o.connect(p); p.connect(vg); o.start(); stops.push(o); return o;
      });
      voices.push(pair);
    }
    var chordAt = 0, timers = [];
    function setChord(k, glide) {
      chordAt = k; var c = CHORDS[k], t = ac.currentTime;
      voices.forEach(function (pair, i) { pair.forEach(function (o) { o.frequency.setTargetAtTime(hz(c.pad[i]), t, glide == null ? 1.6 : glide); }); });
    }
    setChord(0, 0.01);

    // a kalimba-like pluck: a soft body, a whisper of overtone, a long gentle ring
    function pluck(f, vol, when) {
      var t = ac.currentTime + (when || 0), g = ac.createGain(), p = pan(Math.random() * 0.8 - 0.4), lp = ac.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 2600;
      [[1, 1], [2, 0.14], [3.01, 0.04]].forEach(function (h) {
        var o = ac.createOscillator(), og = ac.createGain(); o.type = 'sine'; o.frequency.value = f * h[0];
        og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(vol * h[1], t + 0.012); og.gain.exponentialRampToValueAtTime(0.0001, t + (h[0] === 1 ? 3.2 : 1.2));
        o.connect(og); og.connect(lp); o.start(t); o.stop(t + 3.4);
      });
      lp.connect(p); p.connect(g); g.gain.value = 1; send(g, 0.6);
    }
    // the wandering melody: sparse, stepwise, always on the chord
    var mel = 4, playing = false, level = 0.55;
    function melodyStep() {
      if (!playing) return;
      var tones = CHORDS[chordAt].tones;
      if (Math.random() < 0.55) {
        mel = Math.max(0, Math.min(tones.length - 1, mel + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
        pluck(hz(tones[mel]), 0.05 + Math.random() * 0.025);
        if (Math.random() < 0.18) pluck(hz(tones[Math.max(0, mel - 2)]), 0.03, 0.5); // now and then, a soft answer
      }
    }
    function chordStep() { if (playing) setChord((chordAt + 1) % CHORDS.length); }

    return {
      ctx: ac,
      pad: padBus,
      start: function () {
        if (ac.state !== 'running' && ac.resume) ac.resume();
        if (!playing) { playing = true; timers.push(setInterval(chordStep, 8000)); timers.push(setInterval(melodyStep, 1300)); }
        master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(level, ac.currentTime, 2);
      },
      stop: function () { playing = false; timers.forEach(clearInterval); timers = []; master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(0, ac.currentTime, 0.6); },
      level: function (v) { level = v; if (playing) master.gain.setTargetAtTime(v, ac.currentTime, 0.8); },
      // the i-th note of a rising line that fits the chord playing now
      note: function (i) { var tones = CHORDS[chordAt].tones, n = tones[i % tones.length] + 12 * Math.floor(i / tones.length); return hz(n > 88 ? n - 24 : n); },
      pluck: function (f, vol, when) { pluck(f, vol == null ? 0.07 : vol, when); },
      // a little rising arpeggio that settles, for a found word or a finished picture
      reward: function (big) {
        var tones = CHORDS[chordAt].tones, pick = big ? [0, 2, 4, 6, 8, 6] : [2, 4, 6];
        pick.forEach(function (k, j) { pluck(hz(tones[k]), (big ? 0.07 : 0.06) * (1 - j * 0.06), j * (big ? 0.16 : 0.12)); });
      },
      home: function () { setChord(0); },
      end: function () { this.stop(); setTimeout(function () { try { stops.forEach(function (o) { o.stop(); }); } catch (e) {} }, 2500); }
    };
  }
  window.TOLMusic = { create: create };
})();
