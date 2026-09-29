/* calm-visualizer.js — "Drift", a calm visualizer with binaural beats.
   You say how you feel; Drift picks a pair of soft tones (one per ear), a slow breathing pace,
   a color palette and a visual style, then glides the beat from "where you are" toward slower.
   Sound: WebAudio, two sine oscillators panned hard left/right, an optional soft noise or pad bed.
   Pictures: a WebGL fragment shader (five styles), with a 2D-canvas fallback.
   Safety: every visual change is slow (well under 3 changes a second at any point on screen),
   brightness is capped, no strobing and no saturated red. Nothing is sent anywhere. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var TAU = Math.PI * 2;
  var reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var prefersReduced = !!(reduceMQ && reduceMQ.matches);

  // ---------- the sessions ----------
  // carrier: the tone in the middle (Hz); from → to: the beat (difference between the ears) glides over `glide` minutes.
  // breath: seconds [in, hold, out, rest]. style: the default picture. pal: [deep, a, b, light].
  var STYLES = [
    { id: 'tunnel', name: 'Tunnel', ico: '🌀', say: 'a slow flight down a glowing tunnel' },
    { id: 'kaleido', name: 'Kaleidoscope', ico: '🔮', say: 'a slowly opening kaleidoscope' },
    { id: 'nebula', name: 'Nebula', ico: '🌌', say: 'drifting through soft clouds of colour and stars' },
    { id: 'liquid', name: 'Liquid', ico: '🫧', say: 'swirling liquid colour' },
    { id: 'mandala', name: 'Mandala', ico: '🪷', say: 'glowing geometry turning slowly in space' }
  ];
  var BANDS = {
    delta: 'a very slow beat, about one to four a second',
    theta: 'a slow beat, about four to eight a second',
    alpha: 'a gentle beat, about eight to twelve a second',
    smr: 'a livelier beat, about twelve to fifteen a second'
  };
  var BEDS = { pink: 'Soft rain-like noise', brown: 'Deep, low hush', pad: 'Warm hum', none: 'Tones only' };
  var FEEL = [
    { id: 'wired', e: '⚡', name: 'Wired', full: 'Wired / on edge', hint: 'Buzzy, jumpy, can’t settle',
      carrier: 200, from: 14, to: 10, band: 'alpha', glide: 3, bed: 'pink', breath: [4, 0, 6, 0], style: 'tunnel', len: 10,
      pal: ['#0B1E2E', '#3FA7C9', '#7B6FD6', '#BDF2E6'], cols: 'cool teal and violet',
      desc: 'A slow glide down a cool, glowing tunnel. The beat starts close to that buzzy, switched-on pace and slows gently while your out-breath grows long.' },
    { id: 'anxious', e: '🌀', name: 'Anxious', full: 'Anxious / racing thoughts', hint: 'Worry loops, tight chest',
      carrier: 180, from: 12, to: 8, band: 'alpha', glide: 4, bed: 'brown', breath: [4, 0, 7, 0], style: 'mandala', len: 10,
      pal: ['#0E1236', '#5B7BE0', '#9A7BE8', '#BFD8FF'], cols: 'cool blues and violets',
      desc: 'Soft geometry turning slowly in cool blues, around a light that breathes with you. The out-breath is long and unhurried.' },
    { id: 'overwhelmed', e: '🌊', name: 'Overwhelmed', full: 'Overwhelmed', hint: 'Too much at once',
      carrier: 170, from: 10, to: 7, band: 'theta', glide: 4, bed: 'pad', breath: [4, 1, 6, 1], style: 'liquid', len: 10,
      pal: ['#0C2426', '#3FB7A0', '#6FA8DC', '#D6C8F5'], cols: 'sea greens and soft lavender',
      desc: 'Slow liquid color with nothing to follow or keep up with. The beat slows little by little, and a warm hum swells gently with each breath.' },
    { id: 'low', e: '🌧️', name: 'Low', full: 'Low / flat', hint: 'Heavy, gray, no spark',
      carrier: 210, from: 6, to: 10, band: 'alpha', glide: 3, bed: 'pad', breath: [4, 1, 5, 0], style: 'kaleido', len: 10,
      pal: ['#2A1030', '#E89A6B', '#D77FB0', '#F5D38A'], cols: 'warm dusk: apricot, orchid and gold',
      desc: 'A warm dusk kaleidoscope that slowly opens toward you. The beat meets a low, heavy pace and lifts a little, like the light coming up.' },
    { id: 'tired', e: '🦉', name: 'Tired but wired', full: 'Tired but can’t switch off', hint: 'Exhausted, mind still on',
      carrier: 160, from: 10, to: 6, band: 'theta', glide: 5, bed: 'brown', breath: [4, 0, 7, 1], style: 'nebula', len: 15,
      pal: ['#151030', '#8B6FD0', '#5A7BC8', '#F0B8D0'], cols: 'dusky violet and rose',
      desc: 'Drifting through soft violet clouds and far-off stars. The beat slows gently while a deep hush sits underneath.' },
    { id: 'angry', e: '😤', name: 'Angry', full: 'Angry / frustrated', hint: 'Hot, tense, fed up',
      carrier: 190, from: 14, to: 9, band: 'alpha', glide: 3, bed: 'brown', breath: [4, 0, 8, 0], style: 'liquid', len: 10,
      pal: ['#082421', '#2FA58A', '#4F9FC8', '#BFEFD8'], cols: 'cooling jade and sea blue',
      desc: 'Cool, flowing jade and blue, the opposite of hot. The out-breath is twice as long as the in-breath, and the beat eases from a fast pace to a gentle one.' },
    { id: 'scattered', e: '🧭', name: 'Scattered', full: 'Scattered / can’t focus', hint: 'Thoughts everywhere',
      carrier: 220, from: 10, to: 14, band: 'smr', glide: 2, bed: 'pink', breath: [4, 4, 4, 4], style: 'tunnel', len: 10,
      pal: ['#0C1A30', '#45C4B0', '#8BC8F5', '#FFE7A0'], cols: 'clear mint, sky and soft gold',
      desc: 'One steady point to rest your eyes on, at the end of a slow tunnel. Box breathing (in, hold, out, hold) and a beat that lifts a little.' },
    { id: 'unwind', e: '🍃', name: 'Unwind', full: 'Just want to unwind', hint: 'Nothing wrong, just winding down',
      carrier: 200, from: 12, to: 9, band: 'alpha', glide: 3, bed: 'pad', breath: [4, 0, 6, 0], style: 'kaleido', len: 15,
      pal: ['#1E1640', '#F2A98A', '#B08BE6', '#8FD3E8'], cols: 'pastel sunset',
      desc: 'A pastel sunset kaleidoscope, a warm hum and an easy breath. The beat settles into a gentle pace and stays there.' },
    { id: 'sleep', e: '🌙', name: 'Sleep', full: 'Getting ready for sleep', hint: 'Winding down for bed',
      carrier: 150, from: 7, to: 2.5, band: 'delta', glide: 8, bed: 'brown', breath: [4, 1, 7, 1], style: 'nebula', len: 20,
      pal: ['#04061A', '#3E4AA8', '#6B5BB8', '#E8D9A8'], cols: 'deep indigo and moonlight',
      desc: 'Deep indigo sky and slow stars that dim as the session goes on. The beat slows right down. Fine to fall asleep; it fades out by itself.' }
  ];
  var IDLE = { id: 'idle', pal: ['#14163A', '#7A6FD8', '#4FA3C8', '#F2C6DC'], style: 'liquid', breath: [4, 0, 6, 0], carrier: 200, from: 10, to: 10 };
  var AFTER = [
    { id: 'calmer', e: '😌', name: 'Calmer' },
    { id: 'settled', e: '🌿', name: 'Settled' }
  ];
  var CHEER = [
    'You gave yourself a few quiet minutes. That counts.',
    'Notice how your body feels right now, so you can find your way back here.',
    'Calm is a skill, and you just practised it.',
    'Whatever you feel now is okay. Feelings are weather. They pass.'
  ];
  function feel(id) { for (var i = 0; i < FEEL.length; i++) if (FEEL[i].id === id) return FEEL[i]; return null; }
  function iriFor(f) { return !f ? 0.35 : f.id === 'sleep' ? 0.12 : f.id === 'tired' ? 0.25 : 0.38; }
  function styleIdx(id) { for (var i = 0; i < STYLES.length; i++) if (STYLES[i].id === id) return i; return 0; }

  // ---------- remembered on this device only ----------
  var KEY = 'tol-drift-v1';
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { saved = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} }

  var S = {
    feel: null, intensity: 3, len: 10, bed: 'pink', style: 'tunnel',
    vol: typeof saved.vol === 'number' ? Math.max(0, Math.min(100, saved.vol)) : 30,
    words: saved.words !== false,
    gentle: prefersReduced ? true : !!saved.gentle
  };

  // ---------- session maths ----------
  function plan(f, intensity, lenMin) {
    var k = 0.5 + 0.125 * (intensity - 1);                 // 1 → start halfway to the "meet you" beat, 5 → all the way
    var from = f.to + (f.from - f.to) * k;
    var glide = Math.min(f.glide * (0.7 + 0.15 * (intensity - 1)), lenMin * 0.6) * 60; // seconds
    var br = f.breath.slice();
    if (intensity >= 4) br[2] += (intensity - 3) * 0.5;    // a stronger feeling gets a longer out-breath
    return { from: Math.round(from * 10) / 10, to: f.to, glide: glide, breath: br, carrier: f.carrier, total: lenMin * 60 };
  }
  function beatAt(p, t) { return t >= p.glide ? p.to : p.from + (p.to - p.from) * (t / p.glide); }
  function breathAt(br, t) {
    var cyc = br[0] + br[1] + br[2] + br[3], x = t % cyc;
    if (x < br[0]) return { b: 0.5 - 0.5 * Math.cos(Math.PI * x / br[0]), ph: 0, left: br[0] - x };
    x -= br[0];
    if (x < br[1]) return { b: 1, ph: 1, left: br[1] - x };
    x -= br[1];
    if (x < br[2]) return { b: 0.5 + 0.5 * Math.cos(Math.PI * x / br[2]), ph: 2, left: br[2] - x };
    x -= br[2];
    return { b: 0, ph: 3, left: br[3] - x };
  }
  function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function hz(x) { return (Math.round(x * 10) / 10).toString().replace(/\.0$/, ''); }

  // ---------- sound ----------
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
  function ensureCtx() {
    if (!AC) return null;
    if (!ctx) {
      try { ctx = new AC({ latencyHint: 'playback' }); } catch (e) { try { ctx = new AC(); } catch (e2) { ctx = null; } }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(function () {});
    return ctx;
  }
  function volGain(v) { return v / 100 * 0.5; }                 // 30% → 0.15, low to begin with
  function ramp(param, to, dur) {
    var now = ctx.currentTime;
    try { param.cancelScheduledValues(now); param.setValueAtTime(param.value, now); param.linearRampToValueAtTime(to, now + Math.max(0.02, dur)); }
    catch (e) { param.value = to; }
  }
  // hard left (-1) or right (+1): a StereoPanner where there is one, otherwise a channel merger
  function toSide(node, side, dest) {
    if (ctx.createStereoPanner) { var p = ctx.createStereoPanner(); p.pan.value = side; node.connect(p); p.connect(dest); return p; }
    var m = ctx.createChannelMerger(2); node.connect(m, 0, side < 0 ? 0 : 1); m.connect(dest); return m;
  }
  function noiseBuffer(kind) {
    var sr = ctx.sampleRate, len = Math.floor(sr * 6), fade = Math.floor(sr * 0.5);
    var buf = ctx.createBuffer(2, len, sr);
    for (var ch = 0; ch < 2; ch++) {
      var raw = new Float32Array(len + fade), b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0, peak = 0;
      for (var i = 0; i < raw.length; i++) {
        var w = Math.random() * 2 - 1, v;
        if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; v = last * 3.5; }
        else { // pink (Paul Kellet)
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          v = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
        }
        raw[i] = v; if (Math.abs(v) > peak) peak = Math.abs(v);
      }
      var out = buf.getChannelData(ch), g = peak ? 0.9 / peak : 1;
      for (var j = 0; j < len; j++) {
        var s = raw[j];
        if (j < fade) { var a = j / fade; s = raw[j] * a + raw[len + j] * (1 - a); } // seamless loop
        out[j] = s * g;
      }
    }
    return buf;
  }

  var A = null; // the running sound graph
  function audioStart(p, f, bed, vol) {
    var c = ensureCtx(); if (!c) return null;
    var g = { nodes: [] };
    g.env = c.createGain(); g.env.gain.value = 0;           // fades in and out
    g.vol = c.createGain(); g.vol.gain.value = volGain(vol);
    g.mute = c.createGain(); g.mute.gain.value = 1;
    g.env.connect(g.vol); g.vol.connect(g.mute); g.mute.connect(c.destination);
    // the two tones: carrier − beat/2 on the left, carrier + beat/2 on the right
    g.oL = c.createOscillator(); g.oR = c.createOscillator(); g.oL.type = g.oR.type = 'sine';
    g.gL = c.createGain(); g.gR = c.createGain(); g.gL.gain.value = g.gR.gain.value = 0.42;
    g.oL.connect(g.gL); g.oR.connect(g.gR);
    g.pL = toSide(g.gL, -1, g.env); g.pR = toSide(g.gR, 1, g.env);
    g.nodes.push(g.oL, g.oR, g.gL, g.gR, g.pL, g.pR);
    // the soft bed
    g.bed = c.createGain(); g.bed.gain.value = 0; g.bed.connect(g.env); g.bedLevel = 0; g.nodes.push(g.bed);
    if (bed === 'pink' || bed === 'brown') {
      var src = c.createBufferSource(); src.buffer = noiseBuffer(bed); src.loop = true;
      var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = bed === 'pink' ? 2400 : 900; lp.Q.value = 0.4;
      src.connect(lp); lp.connect(g.bed); g.bedLevel = bed === 'pink' ? 0.1 : 0.2; g.srcs = [src]; g.nodes.push(src, lp);
    } else if (bed === 'pad') {
      var root = p.carrier / 2, ratios = f.id === 'low' || f.id === 'unwind' ? [1, 1.25, 1.5, 2] : [1, 1.5, 2, 2.25];
      var plp = c.createBiquadFilter(); plp.type = 'lowpass'; plp.frequency.value = 650; plp.Q.value = 0.5; plp.connect(g.bed);
      g.srcs = [];
      ratios.forEach(function (r, i) {
        var o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = root * r; o.detune.value = (i % 2 ? 3 : -3);
        var og = c.createGain(); og.gain.value = [0.5, 0.28, 0.3, 0.16][i];
        o.connect(og); og.connect(plp); g.srcs.push(o); g.nodes.push(o, og);
      });
      g.nodes.push(plp); g.bedLevel = 0.16; g.pad = true;
    }
    var now = c.currentTime;
    g.oL.start(now); g.oR.start(now); (g.srcs || []).forEach(function (s) { s.start(now); });
    g.bed.gain.setValueAtTime(g.bedLevel, now);
    A = g;
    schedule(p, 0);
    ramp(g.env.gain, 1, 8);                                    // 8-second fade in
    return g;
  }
  // set the tones for "t seconds into the session", then glide toward the target
  function schedule(p, t) {
    if (!A || !ctx) return;
    var now = ctx.currentTime, b = beatAt(p, t);
    [[A.oL, -1], [A.oR, 1]].forEach(function (x) {
      var fr = x[0].frequency;
      try {
        fr.cancelScheduledValues(now);
        fr.setValueAtTime(p.carrier + x[1] * b / 2, now);
        if (t < p.glide) fr.linearRampToValueAtTime(p.carrier + x[1] * p.to / 2, now + (p.glide - t));
      } catch (e) { fr.value = p.carrier + x[1] * b / 2; }
    });
  }
  function audioEnd(fade) {
    var g = A; A = null; if (!g || !ctx) return;
    ramp(g.env.gain, 0, fade);
    setTimeout(function () {
      try { g.oL.stop(); g.oR.stop(); (g.srcs || []).forEach(function (s) { s.stop(); }); } catch (e) {}
      g.nodes.concat([g.env, g.vol, g.mute]).forEach(function (n) { try { n.disconnect(); } catch (e) {} });
      if (!A && ctx && ctx.state === 'running' && !testing) ctx.suspend().catch(function () {});
    }, fade * 1000 + 150);
  }
  var testing = false;
  // a short, soft chime in one ear only
  function earTest(side) {
    var c = ensureCtx(); if (!c) return false;
    testing = true;
    var now = c.currentTime, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), v = c.createGain();
    o.type = 'sine'; o.frequency.value = 392; o2.type = 'sine'; o2.frequency.value = 784;
    var g2 = c.createGain(); g2.gain.value = 0.25; o2.connect(g2); g2.connect(g);
    v.gain.value = Math.max(0.03, volGain(S.vol)) * 1.4;
    o.connect(g); var pan = toSide(g, side, v); v.connect(c.destination);
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.5, now + 0.05); g.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
    o.start(now); o2.start(now); o.stop(now + 1.7); o2.stop(now + 1.7);
    setTimeout(function () { [o, o2, g, g2, v, pan].forEach(function (n) { try { n.disconnect(); } catch (e) {} }); testing = false; }, 1900);
    return true;
  }

  // ---------- pictures ----------
  var stage = $('cv-stage'), glc = $('cv-gl'), c2 = $('cv-2d');
  var V = {
    style: styleIdx(IDLE.style), prevStyle: -1, mixStart: 0,
    palFrom: IDLE.pal, palTo: IDLE.pal, palStart: -10,
    vt: 0, bt: 0, pulse: 0, last: 0, breath: IDLE.breath, beat: 10,
    dim: 1, cap: 0.82, iri: 0.35, gentleAmt: S.gentle ? 1 : 0,
    scale: window.innerWidth < 700 ? 0.55 : 0.7, frames: [], good: 0, hidden: false
  };
  function hex(h) { return [parseInt(h.substr(1, 2), 16) / 255, parseInt(h.substr(3, 2), 16) / 255, parseInt(h.substr(5, 2), 16) / 255]; }
  function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function curPal(now) {
    var k = smooth((now - V.palStart) / 3), a = V.palFrom, b = V.palTo, out = [];
    for (var i = 0; i < 4; i++) { var x = hex(a[i]), y = hex(b[i]); out.push([x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k]); }
    return out;
  }
  function setLook(pal, style, now) {
    now = now == null ? V.last : now;
    if (pal && pal !== V.palTo) { V.palFrom = V.palTo; V.palTo = pal; V.palStart = now; }
    var si = typeof style === 'number' ? style : styleIdx(style);
    if (si !== V.style) { V.prevStyle = V.style; V.style = si; V.mixStart = now; }
    glc.setAttribute('aria-label', 'Slow, softly glowing pictures: ' + STYLES[V.style].say + ', around a light that breathes.');
  }

  var VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';
  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
    'uniform vec2 uR; uniform float uT, uB, uP, uSA, uSB, uMix, uDim, uCap, uIri;',
    'uniform vec3 uC0, uC1, uC2, uC3;',
    '#define TAU 6.2831853',
    'mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }',
    // the feeling's palette, with a slow iridescent rainbow folded in (uIri: how much)
    'vec3 pal(float x){ float y=fract(x)*3.0; vec3 a=mix(uC1,uC2,smoothstep(0.0,1.0,y)); a=mix(a,uC3,smoothstep(1.0,2.0,y)); a=mix(a,uC1,smoothstep(2.0,3.0,y));',
    '  vec3 iri = 0.55 + 0.45*cos(TAU*(x*0.7 + uT*0.003 + vec3(0.0,0.33,0.67))); return mix(a, iri*mix(vec3(1.0), a, 0.35)*1.05, uIri); }',
    'float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }',
    'float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x), mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x), f.y); }',
    'float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=rot(0.5)*p*2.03+3.1; a*=0.5; } return v; }',

    // 0. Tunnel: flying slowly down a tiled, twisting tube of color toward a soft light
    'vec3 tunnel(vec2 p){',
    '  p *= 1.0 + 0.10*uB; p = rot(uT*0.025)*p;',
    '  float r = length(p), a = atan(p.y,p.x);',
    '  float z = 0.5/(r+0.02), v = z*1.6 + uT*0.25;',          // rings pass any point 0.25 times a second
    '  float s1 = sin(TAU*v), s2 = sin(8.0*a + z*1.1 + 0.6*sin(uT*0.05));',
    '  float chk = s1*s2, tile = smoothstep(-1.0, 1.0, chk), edge = pow(1.0-abs(chk), 2.5);',
    '  vec3 c1 = pal(v*0.07), c2 = pal(v*0.07 + 0.22);',
    '  vec3 col = mix(c1*0.55, c2*0.95, tile) + edge*0.12*uC3;',
    '  col = mix((c1*0.55 + c2*0.95)*0.5, col, smoothstep(0.07, 0.24, r));',   // no fine detail near the vanishing point
    '  col *= 0.2 + 0.8*smoothstep(0.02, 0.5, r);',
    '  col += uC3*exp(-r*r*60.0)*0.75;',
    '  return col; }',

    // 1. Kaleidoscope: three layers of folded, mirrored light zooming slowly toward you
    'vec3 kaleido(vec2 p){',
    '  vec3 acc = uC0*0.6 + pal(length(p)*0.4 + uT*0.004)*0.08;',
    '  for (int L=0; L<3; L++){',
    '    float fl = float(L), ph = fract(uT*0.022 + fl/3.0), sc = mix(2.6, 0.45, ph), al = sin(3.14159*ph); al *= al;',
    '    vec2 q = rot(uT*0.018*(mod(fl,2.0)*2.0-1.0) + fl) * p * sc * (1.0 - 0.08*uB);',
    '    float a = atan(q.y,q.x), r = length(q), k = TAU/8.0;',
    '    a = abs(mod(a,k) - 0.5*k); q = r*vec2(cos(a),sin(a));',
    '    for (int i=0;i<4;i++){ float fi = float(i); q = abs(q) - vec2(0.5,0.28); q = rot(0.7 + 0.12*sin(uT*0.03 + fl))*q; q *= 1.25;',
    '      acc += pal(fl*0.33 + fi*0.14 + r*0.25) * (0.03/(abs(length(q)-0.45)*sc + 0.05)) * al * 0.36; }',
    '  }',
    '  return acc; }',

    // 2. Nebula: clouds of colour with stars flying past in depth
    'vec3 nebula(vec2 p){',
    '  vec2 q = rot(uT*0.008) * p * (1.0 - 0.06*uB);',
    '  vec2 w = vec2(fbm(q*1.2 + uT*0.02), fbm(q*1.2 - uT*0.017 + 4.0));',
    '  float n = fbm(q*1.6 + w*1.5), n2 = fbm(q*2.6 - w*1.1 + 9.0);',
    '  vec3 col = mix(uC0, pal(n*0.9 + w.x*0.3), smoothstep(0.25,0.85,n)) * (0.5 + 0.9*n);',
    '  col += pal(n2*0.8 + 0.5) * smoothstep(0.45, 0.85, n2) * 0.45;',
    '  for (int L=0; L<3; L++){',
    '    float fl = float(L), ph = fract(uT*0.025 + fl/3.0), sc = mix(16.0, 3.5, ph);',
    '    vec2 sp = p*sc + fl*17.0, id = floor(sp), f = fract(sp) - 0.5;',
    '    float h = hash(id + fl*3.7);',
    '    vec2 off = (vec2(hash(id+3.1), hash(id+7.7)) - 0.5)*0.6;',
    '    col += smoothstep(0.1, 0.0, length(f - off)) * step(0.75, h) * sin(3.14159*ph) * mix(pal(h*3.0), vec3(1.0), 0.5) * 0.55;',
    '  }',
    '  return col; }',

    // 3. Liquid: swirling, marbled, iridescent colour
    'vec3 liquid(vec2 p){',
    '  vec2 q = p * (3.0 - 0.18*uB); float t = uT*0.09;',
    '  for (int i=1;i<6;i++){ float fi=float(i);',
    '    q += vec2(0.6/fi*sin(fi*q.y + t + 0.3*fi), 0.6/fi*cos(fi*q.x + t*0.8 + 0.7*fi)); }',
    '  float v = sin(q.x*1.3 + q.y*0.7), w = 0.5 + 0.5*cos(length(q)*1.6 - t*0.4);',
    '  vec3 col = pal(v*0.3 + w*0.25);',
    '  float film = 0.5 + 0.5*sin((q.x + q.y)*4.0 + v*1.5 + t*0.3);',                // thin-film bands, like oil on water
    '  col = mix(col, pal(film*0.7 + w*0.2 + 0.4), 0.5);',
    '  col *= 0.35 + 0.7*w;',
    '  col += pow(0.5+0.5*sin(q.x*1.6 - q.y*1.2 + t*0.7), 8.0)*0.25*uC3;',
    '  return col + uC0*0.25; }',

    // 4. Mandala: glowing sacred geometry (the flower of life) on tilted planes at different depths
    'vec3 mandala(vec2 p){',
    '  vec3 acc = uC0*0.7 + pal(length(p)*0.5 + uT*0.004)*0.1*(1.0 - smoothstep(0.0, 1.0, length(p)));',
    '  for (int L=0; L<3; L++){',
    '    float fl = float(L);',
    '    vec3 rd = normalize(vec3(p, 1.3));',
    '    rd.yz = rot(0.42*sin(uT*0.045 + fl*2.0))*rd.yz; rd.xz = rot(0.42*cos(uT*0.037 + fl*1.3))*rd.xz;',
    '    if (rd.z < 0.2) continue;',
    '    float tt = (1.0 + fl*0.7)/rd.z;',
    '    vec2 q = rot(uT*0.03*(mod(fl,2.0)*2.0-1.0))*rd.xy*tt;',
    '    q /= (1.0 + fl*0.7) * (0.92 + 0.12*uB);',
    '    float a = atan(q.y,q.x), r = length(q), k = TAU/6.0;',
    '    a = abs(mod(a,k) - 0.5*k); vec2 f = r*vec2(cos(a),sin(a));',
    '    float R0 = 0.3, c1 = length(f - vec2(R0,0.0)) - R0, c2 = length(f - vec2(1.5*R0, 0.866*R0)) - R0;',
    '    float d = min(abs(c1), abs(c2));',
    '    d = min(d, abs(r - 2.0*R0)); d = min(d, abs(r - 0.5*R0));',
    '    d = min(d, abs(f.y*0.866 + f.x*0.5 - 1.732*R0*0.5) + step(2.0*R0, r));',
    '    float inside = smoothstep(2.1*R0, 1.9*R0, r), fade = 0.6 - fl*0.15;',
    '    float petal = (smoothstep(0.02, -0.02, c1) + smoothstep(0.02, -0.02, c2)) * inside;',
    '    acc += pal(fl*0.3 + r*0.8) * (0.01/(d + 0.012)) * smoothstep(2.6*R0, 1.6*R0, r) * fade;',
    '    acc += pal(fl*0.3 + r*0.8 + 0.4) * petal * 0.06 * fade;',
    '  }',
    '  return acc; }',
    'vec3 scene(float s, vec2 p){ if (s<0.5) return tunnel(p); if (s<1.5) return kaleido(p); if (s<2.5) return nebula(p); if (s<3.5) return liquid(p); return mandala(p); }',
    'void main(){',
    '  vec2 p = (gl_FragCoord.xy - 0.5*uR)/min(uR.x,uR.y);',
    '  vec3 col = scene(uSA, p);',
    '  if (uMix > 0.001) col = mix(col, scene(uSB, p), uMix);',
    '  float r = length(p), s = 0.1 + 0.07*uB;',
    '  col += mix(uC3, uC2, 0.3) * exp(-r*r/(s*s)) * (0.28 + 0.05*uP);',   // the breathing light
    '  col *= 1.0 - 0.5*smoothstep(0.45, 1.15, r);',
    '  col = 1.0 - exp(-col*1.25);',                                        // soft tone map: nothing clips harshly
    '  col = clamp(mix(vec3(dot(col, vec3(0.299,0.587,0.114))), col, 1.2), 0.0, 1.0);',
    '  gl_FragColor = vec4(col*uCap*uDim, 1.0);',
    '}'
  ].join('\n');

  var GL = null;
  function initGL() {
    var gl = null;
    try { gl = glc.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power' }) || glc.getContext('experimental-webgl'); } catch (e) { gl = null; }
    if (!gl) return null;
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { var m = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error(m); } return s; }
    try {
      var pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
      gl.useProgram(pr);
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      var u = {};
      ['uR', 'uT', 'uB', 'uP', 'uSA', 'uSB', 'uMix', 'uDim', 'uCap', 'uIri', 'uC0', 'uC1', 'uC2', 'uC3'].forEach(function (n) { u[n] = gl.getUniformLocation(pr, n); });
      return { gl: gl, u: u };
    } catch (e) { if (window.console) console.warn('Drift: WebGL unavailable, using the simple pictures.', e && e.message); return null; }
  }
  GL = initGL();
  var g2 = null;
  if (!GL) { glc.hidden = true; c2.hidden = false; c2.setAttribute('role', 'img'); c2.removeAttribute('aria-hidden'); c2.setAttribute('aria-label', glc.getAttribute('aria-label')); g2 = c2.getContext('2d'); }
  glc.addEventListener('webglcontextlost', function (e) { e.preventDefault(); GL = null; });
  glc.addEventListener('webglcontextrestored', function () { GL = initGL(); sized = ''; });

  var sized = '';
  function fit() {
    var w = stage.clientWidth, h = stage.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (GL) {
      var W = Math.max(64, Math.round(w * dpr * V.scale)), H = Math.max(64, Math.round(h * dpr * V.scale)), key = W + 'x' + H;
      if (key !== sized) { glc.width = W; glc.height = H; GL.gl.viewport(0, 0, W, H); sized = key; }
    } else if (g2) {
      var d2 = Math.min(dpr, 1.25), W2 = Math.round(w * d2), H2 = Math.round(h * d2), k2 = W2 + 'x' + H2;
      if (k2 !== sized) { c2.width = W2; c2.height = H2; sized = k2; }
    }
  }

  // the look at visual time vt, breath b (0..1), for this frame
  function draw(now, b) {
    var pal = curPal(now), mix = V.prevStyle >= 0 ? smooth((now - V.mixStart) / 3) : 1;
    if (mix >= 1) V.prevStyle = -1;
    // gentle mode keeps the breathing light small and steady
    var bb = b * (1 - 0.75 * V.gentleAmt);
    var pulse = 0.5 + 0.5 * Math.sin(V.pulse * TAU) * (1 - V.gentleAmt);
    if (GL) {
      var gl = GL.gl, u = GL.u;
      gl.uniform2f(u.uR, glc.width, glc.height);
      gl.uniform1f(u.uT, V.vt); gl.uniform1f(u.uB, bb); gl.uniform1f(u.uP, pulse);
      if (V.prevStyle >= 0) { gl.uniform1f(u.uSA, V.prevStyle); gl.uniform1f(u.uSB, V.style); gl.uniform1f(u.uMix, mix); }
      else { gl.uniform1f(u.uSA, V.style); gl.uniform1f(u.uSB, V.style); gl.uniform1f(u.uMix, 0); }
      gl.uniform1f(u.uDim, V.dim); gl.uniform1f(u.uCap, V.cap); gl.uniform1f(u.uIri, V.iri);
      gl.uniform3fv(u.uC0, pal[0]); gl.uniform3fv(u.uC1, pal[1]); gl.uniform3fv(u.uC2, pal[2]); gl.uniform3fv(u.uC3, pal[3]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else if (g2) draw2d(pal, bb, pulse);
  }
  function rgb(c, a) { return 'rgba(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ',' + a + ')'; }
  function draw2d(pal, b, pulse) {
    var W = c2.width, H = c2.height, m = Math.min(W, H), cx = W / 2, cy = H / 2, t = V.vt, k = V.cap * V.dim;
    g2.globalCompositeOperation = 'source-over'; g2.globalAlpha = 1;
    var bg = g2.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, rgb(pal[0], 1)); bg.addColorStop(1, rgb([pal[0][0] * 0.6 + pal[1][0] * 0.25, pal[0][1] * 0.6 + pal[1][1] * 0.25, pal[0][2] * 0.6 + pal[1][2] * 0.25], 1));
    g2.fillStyle = bg; g2.fillRect(0, 0, W, H);
    g2.globalCompositeOperation = 'lighter';
    for (var L = 0; L < 2; L++) {
      var n = L ? 12 : 8, rotA = t * 0.03 * (L ? -1 : 1);
      for (var i = 0; i < n; i++) {
        var a = rotA + i * TAU / n, d = m * (0.16 + 0.1 * L) * (0.9 + 0.2 * b);
        g2.save(); g2.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d); g2.rotate(a);
        g2.fillStyle = rgb(pal[1 + ((i + L) % 3)], 0.1 * k);
        g2.beginPath(); g2.ellipse(0, 0, m * (0.16 + 0.06 * L), m * 0.05, 0, 0, TAU); g2.fill(); g2.restore();
      }
    }
    var R = m * (0.1 + 0.07 * b) * 1.6, og = g2.createRadialGradient(cx, cy, 0, cx, cy, R);
    og.addColorStop(0, rgb(pal[3], 0.55 * k * (0.9 + 0.1 * pulse))); og.addColorStop(0.5, rgb(pal[2], 0.2 * k)); og.addColorStop(1, rgb(pal[2], 0));
    g2.fillStyle = og; g2.beginPath(); g2.arc(cx, cy, R, 0, TAU); g2.fill();
    g2.globalCompositeOperation = 'source-over';
    if (V.dim < 1) { g2.fillStyle = 'rgba(0,0,0,' + (1 - V.dim) + ')'; g2.fillRect(0, 0, W, H); }
  }

  // ---------- the loop ----------
  var run = null; // the running session
  var words = $('cv-words'), lastPh = -1;
  var WORDS = ['Breathe in…', 'Hold softly…', 'And out…', 'Rest…'];
  function frame(ts) {
    requestAnimationFrame(frame);
    if (V.hidden) { V.last = ts / 1000; return; }
    var now = ts / 1000, dt = Math.min(0.1, Math.max(0, now - (V.last || now)));
    // gentle mode caps the frame rate too
    if (V.gentleAmt > 0.5 && now - (V.lastDraw || 0) < 1 / 20) { V.last = now; return; }
    V.last = now; V.lastDraw = now;
    step(dt, now);
    fit();
    var br = breathAt(V.breath, V.bt);
    draw(now, br.b);
    showWords(br);
    adapt(dt);
  }
  // advance the clocks: breath in real time, pictures at a speed set by the beat, slower when gentle
  function step(dt, now) {
    var target = S.gentle ? 1 : 0;
    V.gentleAmt += (target - V.gentleAmt) * Math.min(1, dt / 1.5);
    var speed = Math.max(0.75, Math.min(1.05, 0.75 + V.beat * 0.02)) * (1 - 0.88 * V.gentleAmt);
    V.vt += dt * speed; V.bt += dt;
    V.pulse += dt * Math.min(0.5, V.beat / 16) * (1 - V.gentleAmt); // a slow glow, a fraction of the beat, never above 0.5 a second
    if (run) {
      V.beat = beatAt(run.p, run.t);
      if (run.f.id === 'sleep') V.dim = 1 - 0.45 * smooth(run.t / run.p.total);
    }
  }
  function adapt(dt) {
    if (!GL || !dt) return;
    V.frames.push(dt); if (V.frames.length < 40) return;
    var avg = V.frames.reduce(function (a, b) { return a + b; }, 0) / V.frames.length; V.frames = [];
    if (V.gentleAmt > 0.5) return;
    if (avg > 1 / 40 && V.scale > 0.3) { V.scale = Math.max(0.3, V.scale * 0.85); V.good = 0; }
    else if (avg < 1 / 55 && V.scale < 0.85) { if (++V.good >= 3) { V.scale = Math.min(0.85, V.scale * 1.08); V.good = 0; } }
  }
  function showWords(br) {
    var on = !!run && !run.paused && (S.words || S.gentle);
    if (!on) { if (words.classList.contains('is-on')) words.classList.remove('is-on'); lastPh = -1; return; }
    var ph = br.ph; if (V.breath[ph] === 0) return;
    if (ph !== lastPh) {
      lastPh = ph;
      words.innerHTML = WORDS[ph] + '<small>' + (ph === 0 ? 'in for ' + V.breath[0] : ph === 2 ? 'out for ' + V.breath[2] : ph === 1 ? 'hold for ' + V.breath[1] : 'rest for ' + V.breath[3]) + '</small>';
      words.classList.add('is-on');
    }
  }
  document.addEventListener('visibilitychange', function () {
    V.hidden = document.hidden;
    if (!document.hidden && run && !run.paused) wake(true);
  });
  if (reduceMQ && reduceMQ.addEventListener) reduceMQ.addEventListener('change', function (e) { if (e.matches) { S.gentle = true; syncToggles(); } });

  // ---------- the session ----------
  var tick = null, wl = null;
  function wake(on) {
    try {
      if (on && navigator.wakeLock && !wl) navigator.wakeLock.request('screen').then(function (l) { wl = l; l.addEventListener('release', function () { wl = null; }); }).catch(function () {});
      if (!on && wl) { wl.release().catch(function () {}); wl = null; }
    } catch (e) {}
  }
  function say(t) { var s = $('cv-status'); s.textContent = ''; setTimeout(function () { s.textContent = t; }, 60); }
  function show(id) {
    ['cv-pick', 'cv-setup', 'cv-end'].forEach(function (c) { $(c).hidden = c !== id; });
    var box = id && $(id).querySelector('.cv-box'); if (box) box.scrollTop = 0;
    var h = id && $(id).querySelector('h1, h2'); if (h) h.focus({ preventScroll: true });
  }

  function begin() {
    var f = feel(S.feel); if (!f) return;
    var p = plan(f, S.intensity, S.len);
    run = { f: f, p: p, t: 0, paused: false, fading: false, done: false, lastTick: performance.now() };
    V.breath = p.breath; V.bt = 0; V.beat = p.from; V.dim = 1; V.cap = f.id === 'sleep' ? 0.68 : 0.82; V.iri = iriFor(f);
    setLook(f.pal, S.style);
    audioStart(p, f, S.bed, S.vol);
    if (A && S.muted) A.mute.gain.value = 0;
    show(null);
    $('cv-ctrl').hidden = false; $('cv-clock').hidden = false; $('cv-paused').hidden = true;
    $('cv-sub').textContent = f.full;
    setPauseBtn(); updClock(); wake(true); poke();
    // keyboard and screen-reader users land on the session controls, not on the page top
    try { $('cv-pause').focus({ preventScroll: true }); } catch (e) { $('cv-pause').focus(); }
    saved.feel = f.id; saved.len = S.len; saved.bed = S.bed; saved.style = S.style; saved.intensity = S.intensity; save();
    say('Session started: ' + f.full + ', ' + S.len + ' minutes. ' + (A ? 'The sound fades in slowly.' : 'Sound isn’t available in this browser, but the pictures and breathing still work.'));
    clearInterval(tick); tick = setInterval(onTick, 250);
  }
  // the session clock runs on wall time here (not in the picture loop), so it keeps going while the screen is off
  function onTick() {
    if (!run) return;
    var now = performance.now(), dt = Math.max(0, (now - run.lastTick) / 1000); run.lastTick = now;
    if (!run.paused) run.t = Math.min(run.p.total, run.t + dt);
    updClock();
    if (run.paused) return;
    if (!run.fading && run.t >= run.p.total - 10) { run.fading = true; if (A) ramp(A.env.gain, 0, 10); }
    if (run.t >= run.p.total) finish(false);
  }
  function updClock() {
    if (!run) return;
    $('cv-left').textContent = fmt(run.p.total - run.t) + ' left';
    $('cv-prog').style.width = (100 * run.t / run.p.total).toFixed(1) + '%';
  }
  function setPauseBtn() {
    var b = $('cv-pause'), p = run && run.paused;
    b.innerHTML = p ? '<span aria-hidden="true">&#9654;</span> Resume' : '<span aria-hidden="true">&#10074;&#10074;</span> Pause';
  }
  function pause(on) {
    if (!run || run.done) return;
    run.paused = on;
    $('cv-paused').hidden = !on;
    if (A && ctx) {
      if (on) { ramp(A.env.gain, 0, 0.8); setTimeout(function () { if (run && run.paused && ctx.state === 'running') ctx.suspend().catch(function () {}); }, 900); }
      else {
        (ctx.state === 'suspended' ? ctx.resume() : Promise.resolve()).catch(function () {}).then(function () {
          if (!A || !run) return; schedule(run.p, run.t); ramp(A.env.gain, run.fading ? 0 : 1, 2);
        });
      }
    }
    setPauseBtn(); say(on ? 'Paused.' : 'Resumed.'); wake(!on); poke();
  }
  function finish(early) {
    if (!run || run.done) return;
    run.done = true; clearInterval(tick);
    audioEnd(early ? 2.5 : 0.3);
    wake(false);
    var f = run.f; run = null;
    V.dim = 1; V.beat = 10; V.cap = 0.82; V.iri = iriFor(null);
    $('cv-ctrl').hidden = true; $('cv-clock').hidden = true; $('cv-paused').hidden = true; words.classList.remove('is-on');
    stage.classList.remove('is-idle');
    $('cv-sub').textContent = 'A calm visualizer';
    $('cv-end-h').textContent = early ? 'Gently done' : 'Welcome back';
    $('cv-end-msg').textContent = '';
    $('cv-again').setAttribute('data-feel', f.id);
    Array.prototype.forEach.call($('cv-after').querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', 'false'); });
    var go = $('cv-end-go'); if (go) go.remove();
    show('cv-end');
    say(early ? 'Session ended.' : 'Session finished. How do you feel now?');
    if (!early && window.TOLRewards && typeof window.TOLRewards.earn === 'function') { try { window.TOLRewards.earn(6, 'breathe', 'A Drift session'); } catch (e) {} }
  }

  // hide the controls while you watch; any touch, move or key brings them back
  var idleT = null;
  function poke() {
    stage.classList.remove('is-idle'); clearTimeout(idleT);
    if (run && !run.paused) idleT = setTimeout(function () { if (run && !run.paused && !stage.querySelector('.cv-ctrl :focus-visible, .cv-top :focus-visible')) stage.classList.add('is-idle'); }, 6000);
  }
  ['pointermove', 'pointerdown', 'keydown', 'focusin'].forEach(function (ev) { stage.addEventListener(ev, poke, { passive: true }); });

  // ---------- the setup card ----------
  function chip(name, value, label, checked) {
    return '<label class="cv-chip"><input type="radio" name="' + name + '" value="' + value + '"' + (checked ? ' checked' : '') + '><span>' + label + '</span></label>';
  }
  function feelBtn(f, cls) {
    return '<button type="button" class="cv-feel" data-id="' + f.id + '"' + (cls ? ' aria-pressed="false"' : '') + '><span class="e" aria-hidden="true">' + f.e + '</span><strong>' + (cls ? f.name : '<span class="l">' + f.full + '</span><span class="s">' + f.name + '</span>') + '</strong>' +
      (f.hint && !cls ? '<small>' + f.hint + '</small>' : '') + (!cls && saved.feel === f.id ? '<span class="last">last time</span>' : '') + '</button>';
  }
  $('cv-feels').innerHTML = FEEL.map(function (f) { return feelBtn(f); }).join('');
  $('cv-after').innerHTML = AFTER.concat(FEEL).map(function (f) { return feelBtn(f, true); }).join('');
  $('cv-len').innerHTML = [5, 10, 15, 20].map(function (m) { return chip('cv-len', m, m + ' min', false); }).join('');
  $('cv-style').innerHTML = STYLES.map(function (s) { return chip('cv-style', s.id, '<span aria-hidden="true">' + s.ico + '</span> ' + s.name, false); }).join('');
  $('cv-bed').innerHTML = ['pink', 'brown', 'pad', 'none'].map(function (b) { return chip('cv-bed', b, BEDS[b], false); }).join('');

  function setRadio(name, v) { Array.prototype.forEach.call(document.querySelectorAll('input[name="' + name + '"]'), function (i) { i.checked = String(i.value) === String(v); }); }
  function openSetup(id) {
    var f = feel(id); if (!f) return;
    S.feel = id;
    var same = saved.feel === id;
    S.len = same && saved.len ? saved.len : f.len;
    S.bed = same && saved.bed ? saved.bed : f.bed;
    S.style = same && saved.style ? saved.style : f.style;
    S.intensity = same && saved.intensity ? saved.intensity : 3;
    $('cv-s-emo').textContent = f.e;
    $('cv-s-name').textContent = f.full;
    $('cv-s-desc').textContent = f.desc;
    $('cv-int').value = S.intensity;
    setRadio('cv-len', S.len); setRadio('cv-style', S.style); setRadio('cv-bed', S.bed);
    setLook(f.pal, S.style); V.iri = iriFor(f);
    V.breath = plan(f, S.intensity, S.len).breath; V.bt = 0;
    facts(); show('cv-setup');
  }
  function facts() {
    var f = feel(S.feel); if (!f) return;
    var p = plan(f, S.intensity, S.len), br = p.breath;
    var breath = 'In ' + br[0] + (br[1] ? ' · hold ' + br[1] : '') + ' · out ' + br[2] + (br[3] ? ' · rest ' + br[3] : '') + ' seconds';
    var mins = Math.round(p.glide / 60 * 2) / 2;
    $('cv-s-facts').innerHTML =
      '<li><span aria-hidden="true">🎧</span><span>Tones: ' + hz(p.carrier - p.to / 2) + ' Hz left, ' + hz(p.carrier + p.to / 2) + ' Hz right</span></li>' +
      '<li><span aria-hidden="true">〰️</span><span>Beat: starts near ' + hz(p.from) + ' a second and drifts to ' + hz(p.to) + ' over about ' + mins + ' min, in ' + BANDS[f.band] + '</span></li>' +
      '<li><span aria-hidden="true">🫁</span><span>Breath: ' + breath + '</span></li>' +
      '<li><span aria-hidden="true">🎨</span><span>Colors: ' + f.cols + '</span></li>';
    var labels = ['', 'A little. A short, easy glide.', 'Some.', 'Medium.', 'Quite strong. A longer glide and a slower out-breath.', 'A lot. The longest glide and the slowest out-breath. Go easy on yourself.'];
    $('cv-int-out').textContent = labels[S.intensity];
    $('cv-int').setAttribute('aria-valuetext', ['', 'A little', 'Some', 'Medium', 'Quite strong', 'A lot'][S.intensity] || '');
    $('cv-begin').textContent = 'Begin · ' + S.len + ' min';
    V.breath = br;
  }
  function table() {
    var rows = FEEL.map(function (f) {
      var br = f.breath;
      return '<tr><td>' + f.e + ' ' + f.full + '</td><td>' + f.carrier + ' Hz</td><td>' + hz(f.from) + ' → ' + hz(f.to) + ' Hz</td><td>' + br[0] + (br[1] ? '-' + br[1] : '') + '-' + br[2] + (br[3] ? '-' + br[3] : '') + '</td><td>' + STYLES[styleIdx(f.style)].name + '</td><td>' + BEDS[f.bed] + '</td></tr>';
    }).join('');
    $('cv-table').innerHTML = '<table><thead><tr><th>Feeling</th><th>Tone</th><th>Beat</th><th>Breath (s)</th><th>Pictures</th><th>Background</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }
  table();

  function syncToggles() {
    $('cv-words-on').checked = S.words; $('cv-gentle').checked = S.gentle;
    $('cv-words-btn').setAttribute('aria-pressed', String(S.words));
    $('cv-gentle-btn').setAttribute('aria-pressed', String(S.gentle));
    $('cv-vol').value = S.vol; $('cv-vol2').value = S.vol; $('cv-vol-out').textContent = S.vol + '%';
    $('cv-look-name').textContent = STYLES[styleIdx(S.style)].name;
    $('cv-look').setAttribute('aria-label', 'Change the pictures. Now: ' + STYLES[styleIdx(S.style)].name);
    var m = $('cv-mute'); m.setAttribute('aria-pressed', String(!!S.muted));
    m.innerHTML = S.muted ? '<span aria-hidden="true">&#128263;</span> Unmute' : '<span aria-hidden="true">&#128264;</span> Mute';
  }
  function setVol(v) {
    S.vol = Math.max(0, Math.min(100, +v || 0)); saved.vol = S.vol; save();
    if (A && ctx) ramp(A.vol.gain, volGain(S.vol), 0.3);
    syncToggles();
  }

  // ---------- wiring ----------
  $('cv-feels').addEventListener('click', function (e) { var b = e.target.closest('.cv-feel'); if (b) openSetup(b.getAttribute('data-id')); });
  $('cv-back').addEventListener('click', function () { setLook(IDLE.pal, S.style); show('cv-pick'); });
  $('cv-int').addEventListener('input', function () { S.intensity = +this.value; facts(); });
  $('cv-len').addEventListener('change', function (e) { S.len = +e.target.value; facts(); });
  $('cv-style').addEventListener('change', function (e) { S.style = e.target.value; setLook(null, S.style); syncToggles(); });
  $('cv-bed').addEventListener('change', function (e) { S.bed = e.target.value; });
  $('cv-vol').addEventListener('input', function () { setVol(this.value); });
  $('cv-vol2').addEventListener('input', function () { setVol(this.value); });
  $('cv-words-on').addEventListener('change', function () { S.words = this.checked; saved.words = S.words; save(); syncToggles(); });
  $('cv-gentle').addEventListener('change', function () { S.gentle = this.checked; saved.gentle = S.gentle; save(); syncToggles(); });
  $('cv-words-btn').addEventListener('click', function () { S.words = !S.words; saved.words = S.words; save(); syncToggles(); say(S.words ? 'Breathing words on.' : 'Breathing words off.'); });
  $('cv-gentle-btn').addEventListener('click', function () { S.gentle = !S.gentle; saved.gentle = S.gentle; save(); syncToggles(); say(S.gentle ? 'Gentle visuals on. The picture is nearly still.' : 'Gentle visuals off.'); });
  $('cv-look').addEventListener('click', function () {
    var i = (styleIdx(S.style) + 1) % STYLES.length; S.style = STYLES[i].id; saved.style = S.style; save();
    setLook(null, S.style); syncToggles(); say('Pictures: ' + STYLES[i].name + '.');
  });
  $('cv-mute').addEventListener('click', function () {
    S.muted = !S.muted; if (A && ctx) ramp(A.mute.gain, S.muted ? 0 : 1, 0.4);
    syncToggles(); say(S.muted ? 'Sound muted.' : 'Sound on.');
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-ear]'), function (b) {
    b.addEventListener('click', function () {
      var side = +b.getAttribute('data-ear'), ok = earTest(side), msg = $('cv-ear-msg');
      msg.textContent = !ok ? 'Sound isn’t available in this browser.' :
        side < 0 ? 'You should hear a soft chime in your left ear only.' : 'You should hear a soft chime in your right ear only.';
      if (ok) setTimeout(function () { msg.textContent += ' If it came from the other side, swap your earbuds.'; }, 1800);
    });
  });
  $('cv-begin').addEventListener('click', begin);
  $('cv-pause').addEventListener('click', function () { pause(!(run && run.paused)); });
  $('cv-stop').addEventListener('click', function () { finish(true); });
  $('cv-after').addEventListener('click', function (e) {
    var b = e.target.closest('.cv-feel'); if (!b) return;
    Array.prototype.forEach.call(this.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    var id = b.getAttribute('data-id'), f = feel(id), msg = $('cv-end-msg'), old = $('cv-end-go'); if (old) old.remove();
    var cheer = CHEER[Math.floor(Math.random() * CHEER.length)];
    if (!f || id === 'unwind' || id === 'sleep') {
      msg.textContent = (id === 'sleep' ? 'Sleep well. ' : id === 'unwind' ? 'Lovely. Let yourself keep unwinding. ' : 'That’s lovely to hear. ') + cheer;
    } else {
      msg.textContent = 'Thanks for noticing. Still feeling ' + f.name.toLowerCase() + ' is okay; some days it takes a little longer. ' + cheer;
      var go = document.createElement('button'); go.type = 'button'; go.className = 'cv-btn'; go.id = 'cv-end-go';
      go.textContent = 'A round for “' + f.name + '”'; go.addEventListener('click', function () { openSetup(id); });
      $('cv-again').parentNode.appendChild(go);
    }
  });
  $('cv-again').addEventListener('click', function () { openSetup(this.getAttribute('data-feel') || saved.feel || 'unwind'); });
  $('cv-new').addEventListener('click', function () {
    $('cv-feels').innerHTML = FEEL.map(function (f) { return feelBtn(f); }).join('');
    setLook(IDLE.pal, S.style); show('cv-pick');
  });

  // full screen: the stage fills the screen (and the browser's own full screen where there is one)
  var fullBtn = $('cv-full');
  function setFull(on) {
    document.documentElement.classList.toggle('cv-full', on);
    fullBtn.setAttribute('aria-pressed', String(on));
    fullBtn.innerHTML = '<span aria-hidden="true">&#10530;</span> ' + (on ? 'Exit full screen' : 'Full screen');
    sized = '';
  }
  fullBtn.addEventListener('click', function () {
    var on = !document.documentElement.classList.contains('cv-full'), d = document.documentElement;
    setFull(on);
    try {
      if (on && d.requestFullscreen && !document.fullscreenElement) d.requestFullscreen().catch(function () {});
      else if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    } catch (e) {}
  });
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && document.documentElement.classList.contains('cv-full')) setFull(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.documentElement.classList.contains('cv-full') && !document.fullscreenElement) setFull(false);
    // Escape during a session pauses it and puts you on Pause / Resume
    if (e.key === 'Escape' && run && !run.done) {
      if (!run.paused) pause(true);
      try { $('cv-pause').focus({ preventScroll: true }); } catch (x) { $('cv-pause').focus(); }
    }
    var tag = (e.target && e.target.tagName) || '';
    if ((e.key === ' ' || e.key === 'k') && run && !/INPUT|BUTTON|SELECT|TEXTAREA|A|SUMMARY/.test(tag)) { e.preventDefault(); pause(!run.paused); }
  });
  window.addEventListener('resize', function () { sized = ''; });
  window.addEventListener('pagehide', function () { if (A) audioEnd(0.1); wake(false); });

  syncToggles();
  if (saved.feel && feel(saved.feel)) S.style = saved.style || feel(saved.feel).style;
  setLook(IDLE.pal, IDLE.style, 0);
  requestAnimationFrame(frame);

  // a small window for checking the pictures frame by frame (used by the page's own tests)
  window.TOLDrift = {
    presets: FEEL, styles: STYLES, plan: plan, beatAt: beatAt, breathAt: breathAt,
    graph: function () { return A ? { ctx: ctx && ctx.state, left: A.oL.frequency.value, right: A.oR.frequency.value, vol: A.vol.gain.value, env: A.env.gain.value, bed: !!A.srcs, panner: A.pL && A.pL.constructor && A.pL.constructor.name } : null; },
    session: function () { return run ? { feel: run.f.id, t: run.t, total: run.p.total, paused: run.paused, beat: V.beat } : null; },
    // render the picture at visual time t with breath b and read back relative luminance on a grid
    sample: function (opts) {
      opts = opts || {};
      var st = styleIdx(opts.style || 'tunnel'), f = feel(opts.feel) || FEEL[0];
      V.style = st; V.prevStyle = -1; V.palFrom = V.palTo = f.pal; V.palStart = -99; V.vt = opts.t || 0; V.pulse = opts.pulse || 0;
      V.gentleAmt = opts.gentle ? 1 : 0; V.cap = f.id === 'sleep' ? 0.68 : 0.82; V.dim = 1; V.iri = iriFor(f);
      if (opts.w) { V.scale = 1; glc.width = opts.w; glc.height = opts.h || opts.w; if (GL) GL.gl.viewport(0, 0, glc.width, glc.height); sized = glc.width + 'x' + glc.height; V.hidden = true; }
      draw(V.last, opts.b || 0);
      if (!GL) return null;
      var gl = GL.gl, W = glc.width, H = glc.height, px = new Uint8Array(W * H * 4), n = opts.grid || 16, out = [];
      gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
      function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
      var red = 0;
      for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
        var i = ((Math.floor((y + 0.5) * H / n)) * W + Math.floor((x + 0.5) * W / n)) * 4, R = px[i], G = px[i + 1], B = px[i + 2];
        out.push(0.2126 * lin(R) + 0.7152 * lin(G) + 0.0722 * lin(B));
        if (R + G + B > 0 && R / (R + G + B) >= 0.8) red++;
      }
      return { lum: out, red: red };
    },
    release: function () { V.hidden = document.hidden; sized = ''; }
  };
})();
