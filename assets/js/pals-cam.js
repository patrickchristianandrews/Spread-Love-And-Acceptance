/* pals-cam.js — "Check in on Tidbit & Sugarfoot": a full-screen pal cam for the Frequency Journey.
   Any element with [data-palcam-open] opens it. The two pals are drawn by pups.js, exactly as
   everywhere else in the journey, and act out little scripted activities from pals-cam-acts.js.

   How it stays smooth:
   - one requestAnimationFrame loop, time-based (dt clamped to 50 ms), paused when the overlay is
     closed or the tab is hidden, and resumed without a jump;
   - every activity is a pure function of its own clock, so nothing can pile up or drift, and the
     engine eases each pal's drawn position, turn, squash and tilt toward that target;
   - legs move with the distance walked, and between activities the pals walk or hop to their
     next spots instead of snapping there;
   - a watchdog eases them home and moves on if an activity overruns, throws, or strays off stage.

   The setting rotates each time it opens (a shuffled bag), and the light follows the viewer's own
   clock. The tally of what they've done today is kept in this browser only (localStorage), as a
   small convenience. Nothing is sent anywhere. */
(function () {
  'use strict';
  var LH = 300, G = 248, LW_MIN = 320, LW_MAX = 560, S = 1.15, KEY = 'tol-palcam-v1';
  var RM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var SPEED = RM ? 0.72 : 1, PMAX = RM ? 50 : 140;
  var NAMES = ['Tidbit', 'Sugarfoot'];

  // ---------- small maths ----------
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mix(a, b, p) { return a + (b - a) * p; }
  function eio(p) { p = clamp(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function eout(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
  function ein(p) { p = clamp(p, 0, 1); return p * p * p; }
  function eback(p) { p = clamp(p, 0, 1); var c = 1.70158; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); }
  function sgn(v) { return v < 0 ? -1 : 1; }
  function angDiff(a, b) { var d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
  function rnd(i) { var x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); } // steady pseudo-random, for star fields
  function fin(v) { return typeof v === 'number' && isFinite(v); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function hexRgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function mixHex(a, b, p) { var x = hexRgb(a), y = hexRgb(b); return 'rgb(' + Math.round(mix(x[0], y[0], p)) + ',' + Math.round(mix(x[1], y[1], p)) + ',' + Math.round(mix(x[2], y[2], p)) + ')'; }
  function todayKey() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

  // ---------- per-viewer memory (a convenience only; it can fail and that's fine) ----------
  function load() { try { var o = JSON.parse(localStorage.getItem(KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* private mode: fine */ } }
  var mem = load();

  // ---------- drawing helpers, shared with the activity scripts ----------
  var U = {
    circle: function (g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, Math.max(0.01, r), 0, Math.PI * 2); g.fill(); },
    ell: function (g, x, y, rx, ry, col, rot) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, Math.PI * 2); g.fill(); },
    rr: function (g, x, y, w, h, r, col) { g.fillStyle = col; g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); },
    line: function (g, x1, y1, x2, y2, col, w) { g.strokeStyle = col; g.lineWidth = w || 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); },
    heart: function (g, x, y, r, col) {
      g.fillStyle = col || '#F28AA8'; g.beginPath(); g.moveTo(x, y + r * 0.9);
      g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.5, x, y - r * 0.5);
      g.bezierCurveTo(x + r * 0.7, y - r * 1.5, x + r * 1.6, y - r * 0.2, x, y + r * 0.9); g.fill();
    },
    star: function (g, x, y, r, col, rot) {
      g.fillStyle = col || '#F8D76A'; g.beginPath();
      for (var i = 0; i < 10; i++) { var a = (rot || 0) - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      g.closePath(); g.fill();
    },
    bone: function (g, x, y, len, rot, col) {
      g.save(); g.translate(x, y); g.rotate(rot || 0); g.fillStyle = col || '#F6EEDD';
      var h = len / 2; g.fillRect(-h, -len * 0.09, len, len * 0.18);
      [[-h, -1], [-h, 1], [h, -1], [h, 1]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1] * len * 0.12, len * 0.14, 0, Math.PI * 2); g.fill(); });
      g.restore();
    },
    ball: function (g, x, y, r, col, seam) {
      U.circle(g, x, y, r, col || '#D7E857');
      if (seam !== false) { g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = Math.max(0.8, r * 0.16); g.beginPath(); g.arc(x - r * 0.9, y, r * 0.75, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(x + r * 0.9, y, r * 0.75, Math.PI - 0.9, Math.PI + 0.9); g.stroke(); }
      U.circle(g, x - r * 0.35, y - r * 0.4, r * 0.22, 'rgba(255,255,255,.5)');
    },
    cloud: function (g, x, y, s, col) {
      g.fillStyle = col || 'rgba(255,255,255,.92)'; g.beginPath();
      g.arc(x, y, 12 * s, 0, Math.PI * 2); g.arc(x + 14 * s, y - 6 * s, 14 * s, 0, Math.PI * 2); g.arc(x + 30 * s, y, 11 * s, 0, Math.PI * 2);
      g.rect(x, y, 30 * s, 10 * s); g.fill();
    },
    note: function (g, x, y, s, col) {
      g.fillStyle = col || '#6E5AA8'; g.strokeStyle = col || '#6E5AA8'; g.lineWidth = 1.6 * s;
      g.beginPath(); g.ellipse(x, y, 3.6 * s, 2.7 * s, -0.4, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(x + 3.2 * s, y - 1); g.lineTo(x + 3.2 * s, y - 13 * s); g.quadraticCurveTo(x + 7 * s, y - 10 * s, x + 8 * s, y - 7 * s); g.stroke();
    },
    text: function (g, str, x, y, size, col, weight) {
      g.font = (weight || '700') + ' ' + size + 'px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col || '#3C3350'; g.fillText(str, x, y);
    },
    rainbow: function (g, x, y, r, w, a, a0, a1) {
      var cols = ['#F27D7D', '#F6B26B', '#F7DC6F', '#8FD694', '#7FB8F0', '#B79CEB'];
      g.save(); g.globalAlpha *= a == null ? 1 : a; g.lineCap = 'butt';
      for (var i = 0; i < cols.length; i++) { g.strokeStyle = cols[i]; g.lineWidth = w; g.beginPath(); g.arc(x, y, r - i * w, a0 == null ? Math.PI : a0, a1 == null ? Math.PI * 2 : a1); g.stroke(); }
      g.restore();
    },
    flame: function (g, x, y, s, t) {
      var f = 1 + Math.sin(t / 40) * 0.15 + Math.sin(t / 23) * 0.08;
      U.ell(g, x, y + 6 * s * f, 4 * s, 9 * s * f, '#F6A04D'); U.ell(g, x, y + 4 * s * f, 2.2 * s, 5.5 * s * f, '#FFE69A');
    },
    hat: function (g, x, y, s, col) {
      U.rr(g, x - 9 * s, y - 16 * s, 18 * s, 16 * s, 2 * s, col || '#2C2638'); U.rr(g, x - 13 * s, y - 2 * s, 26 * s, 4 * s, 2 * s, col || '#2C2638');
      U.rr(g, x - 9 * s, y - 6 * s, 18 * s, 3 * s, 0, '#E4566E');
    },
    crown: function (g, x, y, s) {
      g.fillStyle = '#F6CB4C'; g.beginPath(); g.moveTo(x - 8 * s, y); g.lineTo(x - 9 * s, y - 9 * s); g.lineTo(x - 4 * s, y - 4 * s); g.lineTo(x, y - 11 * s); g.lineTo(x + 4 * s, y - 4 * s); g.lineTo(x + 9 * s, y - 9 * s); g.lineTo(x + 8 * s, y); g.closePath(); g.fill();
      U.circle(g, x, y - 3 * s, 1.5 * s, '#E4566E');
    },
    // a pal drawn anywhere at any size (for tiny dogs, portraits and photos)
    pup: function (g, key, x, y, s, face, pose, t, wag) {
      var P = window.TOLPups; if (!P) return;
      g.save(); g.translate(x, y); g.scale(s * (face || 1), s); P.draw(g, P.looks[key], pose || 'sit', t / 90, wag == null ? Math.sin(t / 110) * 0.5 : wag, false, t, 0); g.restore();
    }
  };

  // ---------- time of day, from the viewer's own clock ----------
  var SKY = [ // hour, top, bottom, light (0 night .. 1 midday)
    [0, '#0B1030', '#1F2552', 0], [4.6, '#0E1436', '#28305E', 0.02], [5.6, '#3B3F7C', '#E7A2A6', 0.35], [6.6, '#7FA7D9', '#FAD4B2', 0.7],
    [8.5, '#79BDEC', '#DDF0FB', 0.95], [12, '#5AAEEA', '#CFEBFA', 1], [15.5, '#68B2E7', '#D8EEF8', 0.97], [17.3, '#7AA2D6', '#FCDDA9', 0.82],
    [18.8, '#8A76B6', '#F7B084', 0.55], [19.8, '#3F3C7C', '#D88B8C', 0.25], [20.8, '#141A40', '#3A3565', 0.05], [24, '#0B1030', '#1F2552', 0]
  ];
  function skyAt(h) {
    for (var i = 0; i < SKY.length - 1; i++) {
      var a = SKY[i], b = SKY[i + 1];
      if (h >= a[0] && h <= b[0]) { var p = eio((h - a[0]) / (b[0] - a[0])); return { top: mixHex(a[1], b[1], p), bot: mixHex(a[2], b[2], p), light: mix(a[3], b[3], p) }; }
    }
    return { top: SKY[0][1], bot: SKY[0][2], light: 0 };
  }
  function phaseOf(h) {
    if (h >= 5 && h < 7) return 'dawn'; if (h >= 7 && h < 11) return 'morning'; if (h >= 11 && h < 14) return 'midday';
    if (h >= 14 && h < 17) return 'afternoon'; if (h >= 17 && h < 19) return 'golden hour'; if (h >= 19 && h < 20.75) return 'dusk'; return 'night';
  }
  function isDark(h) { var p = phaseOf(h); return p === 'night' || p === 'dusk'; }

  // ---------- the settings (a new one each time the cam opens) ----------
  function hills(g, env, y, amp, col, seed) {
    g.fillStyle = col; g.beginPath(); g.moveTo(env.x0, env.y1);
    for (var x = env.x0; x <= env.x1 + 8; x += 8) g.lineTo(x, y - amp * (0.55 + 0.45 * Math.sin(x / 57 + seed) * Math.cos(x / 131 + seed * 2)));
    g.lineTo(env.x1, env.y1); g.closePath(); g.fill();
  }
  function ground(g, env, top, col, col2) {
    var gr = g.createLinearGradient(0, top, 0, env.y1); gr.addColorStop(0, col); gr.addColorStop(1, col2 || col);
    g.fillStyle = gr; g.fillRect(env.x0, top, env.x1 - env.x0, env.y1 - top);
  }
  function tree(g, x, y, s, col, trunk) { U.rr(g, x - 3 * s, y - 26 * s, 6 * s, 28 * s, 2 * s, trunk || '#8A6340'); U.circle(g, x, y - 38 * s, 20 * s, col); U.circle(g, x - 13 * s, y - 28 * s, 13 * s, col); U.circle(g, x + 13 * s, y - 29 * s, 14 * s, col); }
  function pine(g, x, y, s, col, snow) {
    U.rr(g, x - 2.5 * s, y - 8 * s, 5 * s, 10 * s, 1, '#7A5638');
    for (var i = 0; i < 3; i++) { var yy = y - 8 * s - i * 14 * s, w = (22 - i * 5) * s; g.fillStyle = col; g.beginPath(); g.moveTo(x - w, yy); g.lineTo(x, yy - 22 * s); g.lineTo(x + w, yy); g.closePath(); g.fill();
      if (snow) { g.fillStyle = '#F7FBFF'; g.beginPath(); g.moveTo(x - w * 0.45, yy - 12 * s); g.lineTo(x, yy - 22 * s); g.lineTo(x + w * 0.45, yy - 12 * s); g.closePath(); g.fill(); } }
  }
  function skyline(g, env, base, col, winCol, lit) {
    var x = env.x0 - 10, i = 0;
    while (x < env.x1) {
      var w = 26 + ((i * 37) % 23), h = 40 + ((i * 53) % 60);
      U.rr(g, x, base - h, w, h + 2, 2, col);
      if (lit > 0.05) { g.fillStyle = winCol; for (var wy = base - h + 6; wy < base - 8; wy += 10) for (var wx = x + 5; wx < x + w - 6; wx += 8) if (((wx * 7 + wy * 3 + i) % 5) < 2) g.fillRect(wx, wy, 4, 5); }
      x += w + 4; i++;
    }
  }
  function flowers(g, env, y0, y1, n, cols) {
    for (var i = 0; i < n; i++) { var x = env.x0 + ((i * 97.3) % (env.x1 - env.x0)), y = y0 + ((i * 41.7) % (y1 - y0)); U.line(g, x, y, x, y + 5, '#6FA15A', 1); U.circle(g, x, y, 2.4, cols[i % cols.length]); U.circle(g, x, y, 0.9, '#FFF3B0'); }
  }
  function pumpkin(g, x, y, s) { U.ell(g, x - 5 * s, y, 7 * s, 8 * s, '#E98A3A'); U.ell(g, x + 5 * s, y, 7 * s, 8 * s, '#E98A3A'); U.ell(g, x, y, 7 * s, 8.5 * s, '#F29A45'); U.rr(g, x - 1.2 * s, y - 11 * s, 2.4 * s, 4 * s, 1, '#5E7A3A'); }

  var SETTINGS = [
    { id: 'backyard', name: 'the backyard', draw: function (g, env) {
      hills(g, env, G - 64, 20, '#9BCB8A', 1); tree(g, env.x0 + 40, G - 30, 1.4, '#6FAE6A');
      g.fillStyle = '#E9D2AE'; for (var x = env.x0; x < env.x1; x += 14) { g.beginPath(); g.moveTo(x, G - 18); g.lineTo(x, G - 58); g.lineTo(x + 5, G - 64); g.lineTo(x + 10, G - 58); g.lineTo(x + 10, G - 18); g.fill(); }
      U.rr(g, env.x0, G - 50, env.x1 - env.x0, 5, 0, '#D5BA90'); U.rr(g, env.x0, G - 30, env.x1 - env.x0, 5, 0, '#D5BA90');
      var dx = env.x1 - 70; U.rr(g, dx, G - 56, 48, 40, 3, '#C9674E'); g.fillStyle = '#8E3F33'; g.beginPath(); g.moveTo(dx - 6, G - 54); g.lineTo(dx + 24, G - 78); g.lineTo(dx + 54, G - 54); g.fill(); U.ell(g, dx + 24, G - 30, 11, 14, '#4A2C28');
      ground(g, env, G - 20, '#8FCB76', '#76B561'); for (var i = 0; i < 9; i++) U.rr(g, env.x0 + i * 70, G - 20, 34, env.y1 - G + 20, 0, 'rgba(255,255,255,.06)');
    } },
    { id: 'beach', name: 'the beach', water: true, draw: function (g, env) {
      ground(g, env, G - 58, '#6FC0E0', '#4FA7CE'); U.cloud(g, env.x1 - 120, G - 72, 0.5, 'rgba(255,255,255,.7)');
      g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(env.x0 + 60, G - 66); g.lineTo(env.x0 + 74, G - 90); g.lineTo(env.x0 + 74, G - 64); g.fill(); U.rr(g, env.x0 + 52, G - 64, 30, 5, 2, '#C9674E');
      ground(g, env, G - 24, '#F3DEA8', '#EACB85');
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 3; g.beginPath(); for (var x = env.x0; x < env.x1; x += 6) g.lineTo(x, G - 24 + Math.sin(x / 14) * 1.5); g.stroke();
      var ux = env.x1 - 56; U.line(g, ux, G - 8, ux + 4, G - 70, '#8A6340', 3); g.fillStyle = '#E4566E'; g.beginPath(); g.moveTo(ux - 30, G - 62); g.quadraticCurveTo(ux + 4, G - 96, ux + 38, G - 70); g.closePath(); g.fill();
      g.fillStyle = '#FFF6E0'; g.beginPath(); g.moveTo(ux - 8, G - 70); g.quadraticCurveTo(ux + 4, G - 90, ux + 16, G - 68); g.closePath(); g.fill();
    } },
    { id: 'snow', name: 'a snowy hill', snow: true, draw: function (g, env) {
      hills(g, env, G - 70, 36, '#DDE8F4', 3); pine(g, env.x0 + 30, G - 40, 1.2, '#4E8A6A', true); pine(g, env.x1 - 40, G - 44, 1.4, '#4E8A6A', true); pine(g, env.x1 - 90, G - 36, 0.9, '#5B9676', true);
      ground(g, env, G - 26, '#F5F9FD', '#E4EDF7'); for (var i = 0; i < 6; i++) U.ell(g, env.x0 + 40 + i * 90, G + 10 + (i % 2) * 14, 30, 4, 'rgba(160,185,220,.25)');
    } },
    { id: 'pond', name: 'the park by the pond', water: true, draw: function (g, env) {
      hills(g, env, G - 60, 16, '#A6D494', 5); tree(g, env.x1 - 40, G - 38, 1.2, '#78B46B');
      ground(g, env, G - 34, '#96CF7C', '#7CBB66');
      U.ell(g, env.x0 + (env.x1 - env.x0) * 0.32, G - 26, 90, 12, '#7CC3DE'); U.ell(g, env.x0 + (env.x1 - env.x0) * 0.32 - 10, G - 28, 60, 5, 'rgba(255,255,255,.35)');
      for (var i = 0; i < 5; i++) { var rx = env.x0 + 20 + i * 13; U.line(g, rx, G - 22, rx + 2, G - 48 - (i % 2) * 8, '#5E8E4A', 2); U.ell(g, rx + 2, G - 46 - (i % 2) * 8, 2, 5, '#8A5E3A'); }
      var px = env.x0 + (env.x1 - env.x0) * 0.4; U.ell(g, px, G - 26, 8, 3, '#FFFFFF'); U.circle(g, px + 6, G - 31, 3.4, '#FFFFFF'); U.ell(g, px + 10, G - 31, 2, 1, '#F2A84B');
    } },
    { id: 'forest', name: 'a forest clearing', leaves: true, draw: function (g, env) {
      for (var i = 0; i < 9; i++) pine(g, env.x0 + i * ((env.x1 - env.x0) / 8), G - 34 - (i % 3) * 6, 1.2 + (i % 2) * 0.3, i % 2 ? '#3F7A58' : '#4D8C63', false);
      for (var j = 0; j < 4; j++) tree(g, env.x0 + 30 + j * ((env.x1 - env.x0) / 3.3), G - 24, 1.1, '#5F9E5E', '#7A5638');
      ground(g, env, G - 24, '#7FB866', '#6AA555');
      [[env.x0 + 26, G + 12], [env.x1 - 30, G + 20], [env.x1 - 50, G + 24]].forEach(function (m) { U.rr(g, m[0] - 1.5, m[1] - 6, 3, 6, 1, '#F3E9D6'); U.ell(g, m[0], m[1] - 7, 6, 4, '#E4566E'); U.circle(g, m[0] - 2, m[1] - 8, 1, '#fff'); });
    } },
    { id: 'rooftop', name: 'the rooftop garden', city: true, draw: function (g, env) {
      skyline(g, env, G - 30, '#8D8AAE', '#FCE5A0', env.dark); skyline(g, { x0: env.x0 + 17, x1: env.x1 }, G - 30, 'rgba(110,105,145,.9)', '#FDEBB2', env.dark * 0.8);
      U.rr(g, env.x0, G - 36, env.x1 - env.x0, 6, 0, '#9E6E5C'); for (var x = env.x0; x < env.x1; x += 16) U.rr(g, x, G - 58, 3, 24, 1, '#6B5A70'); U.rr(g, env.x0, G - 60, env.x1 - env.x0, 4, 2, '#6B5A70');
      ground(g, env, G - 30, '#C98A6E', '#B7765C'); for (var y = G - 24; y < env.y1; y += 12) U.rr(g, env.x0, y, env.x1 - env.x0, 1.2, 0, 'rgba(0,0,0,.08)');
      [env.x0 + 34, env.x1 - 44].forEach(function (px, i) { U.rr(g, px - 18, G - 34, 36, 18, 3, '#8C5A46'); flowers(g, { x0: px - 16, x1: px + 16 }, G - 40, G - 36, 6, i ? ['#F7DC6F', '#F28AA8'] : ['#B79CEB', '#F6B26B']); });
      g.strokeStyle = 'rgba(80,70,90,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(env.x0, G - 96); g.quadraticCurveTo((env.x0 + env.x1) / 2, G - 70, env.x1, G - 96); g.stroke();
    }, lights: function (g, env) { // string lights, glowing at dusk and night
      for (var i = 0; i < 18; i++) { var p = i / 17, x = mix(env.x0, env.x1, p), y = (1 - p) * (1 - p) * (G - 96) + 2 * (1 - p) * p * (G - 70) + p * p * (G - 96) + 3;
        U.circle(g, x, y, 2.4, ['#FCE38A', '#F7A8C2', '#A8E0F7'][i % 3]); if (env.dark > 0.2) U.circle(g, x, y, 6, 'rgba(255,230,150,' + (0.25 * env.dark).toFixed(2) + ')'); }
    } },
    { id: 'meadow', name: 'the meadow', fireflies: true, draw: function (g, env) {
      hills(g, env, G - 80, 30, '#B7DDA0', 7); hills(g, env, G - 50, 20, '#A2D48A', 2);
      ground(g, env, G - 26, '#9AD17F', '#86C46B'); flowers(g, env, G - 40, env.y1 - 6, 44, ['#F28AA8', '#F7DC6F', '#B79CEB', '#FFFFFF', '#F6B26B']);
    } },
    { id: 'dock', name: 'the lakeside dock', water: true, draw: function (g, env) {
      hills(g, env, G - 64, 18, '#6E9F7E', 4); for (var i = 0; i < 7; i++) pine(g, env.x0 + 20 + i * 70, G - 58, 0.8, '#4F7F62', false);
      ground(g, env, G - 58, '#79B8D6', '#4E90B6');
      for (var k = 0; k < 8; k++) U.rr(g, env.x0 + ((k * 83) % (env.x1 - env.x0)), G - 50 + k * 8, 26, 1.6, 1, 'rgba(255,255,255,.35)');
      U.rr(g, env.x0, G - 16, env.x1 - env.x0, 30, 0, '#B98B5E'); for (var x = env.x0; x < env.x1; x += 22) U.rr(g, x, G - 16, 1.4, 30, 0, 'rgba(80,50,30,.35)');
      U.rr(g, env.x0, G + 14, env.x1 - env.x0, 6, 0, '#8A6340'); [env.x0 + 20, env.x1 - 24].forEach(function (x) { U.rr(g, x - 4, G - 30, 8, 60, 2, '#8A6340'); });
    } },
    { id: 'citypark', name: 'the city park', city: true, draw: function (g, env) {
      skyline(g, env, G - 40, '#A9B4CF', '#FCE5A0', env.dark); tree(g, env.x0 + 34, G - 36, 1.1, '#6FAE6A'); tree(g, env.x1 - 34, G - 36, 1.2, '#78B46B');
      ground(g, env, G - 40, '#94CC7C', '#7FBB68'); U.rr(g, env.x0, G - 10, env.x1 - env.x0, 22, 0, '#E6D9C0');
      var bx = env.x0 + (env.x1 - env.x0) * 0.72; U.rr(g, bx - 26, G - 44, 52, 5, 2, '#9B6B45'); U.rr(g, bx - 26, G - 54, 52, 5, 2, '#9B6B45'); U.rr(g, bx - 22, G - 40, 3, 12, 1, '#4B4A55'); U.rr(g, bx + 19, G - 40, 3, 12, 1, '#4B4A55');
    }, lights: function (g, env) {
      var lx = env.x0 + (env.x1 - env.x0) * 0.2; U.rr(g, lx - 1.5, G - 100, 3, 76, 1, '#4B4A55'); U.rr(g, lx - 6, G - 106, 12, 8, 3, '#4B4A55');
      U.circle(g, lx, G - 96, 4, env.dark > 0.2 ? '#FFE9A8' : '#EDE6D2'); if (env.dark > 0.2) U.circle(g, lx, G - 96, 16, 'rgba(255,230,150,' + (0.22 * env.dark).toFixed(2) + ')');
    } },
    { id: 'pumpkins', name: 'the pumpkin patch', leaves: true, draw: function (g, env) {
      hills(g, env, G - 64, 20, '#D9B77A', 6); tree(g, env.x0 + 30, G - 40, 1.2, '#E8913F'); tree(g, env.x1 - 30, G - 44, 1.3, '#D8643F');
      ground(g, env, G - 34, '#B78D57', '#A07A48');
      [[env.x0 + 70, G - 40], [env.x1 - 100, G - 42]].forEach(function (h) { U.rr(g, h[0] - 20, h[1] - 14, 40, 18, 3, '#E9C96B'); U.line(g, h[0] - 20, h[1] - 6, h[0] + 20, h[1] - 6, 'rgba(150,110,40,.5)', 1); });
      for (var i = 0; i < 9; i++) pumpkin(g, env.x0 + 22 + i * ((env.x1 - env.x0 - 40) / 8), G - 26 + (i % 2) * 5, 0.8 + (i % 3) * 0.15);
      for (var j = 0; j < 4; j++) pumpkin(g, env.x0 + 30 + j * ((env.x1 - env.x0) / 4), G + 26 + (j % 2) * 8, 0.9);
    } }
  ];

  // ---------- state ----------
  var ACTS = [], BYID = {}, COMBOS = {};
  var ov, box, cv, g, capEl, capMain, capPunch, whereEl, badge, tallyN, tallyTot, chips, btnPause, openerEl = null;
  var DPR = 1, CW = 0, CH = 0, LW = 400, K = 1, OX = 0, OY = 0, bg = null, bgKey = '';
  var isOpen = false, paused = false, raf = 0, last = 0, clock = 0, hour = 12, setting = SETTINGS[0];
  var mode = 'travel', cur = null, trav = null, outgoing = null, trick = null, comboLeft = 0, lastActId = null;
  var R = [], parts = [], bubbles = [], ambient = [], shake = 0, outTime = 0;
  var frames = [], stats = { acts: 0, recovers: 0, errors: 0, maxOut: 0 };
  var lastOver = [null, null], lastUnder = [null, null], lastCape = [null, null];

  function dogDefaults(i) {
    return { i: i, x: 0, lift: 0, face: i ? -1 : 1, pose: 'sit', ph: null, rot: 0, pivot: 'center', sx: 1, sy: 1, tilt: 0, wag: 1, blink: null,
      alpha: 1, scale: 1, dy: i ? 3 : -3, cape: null, capeFly: false, under: null, over: null, ear: 0, noEar: false, z: i };
  }
  function renderDefaults(i) {
    var d = dogDefaults(i); d.x = home(i); d.ph = 0; d.wph = i * 2; d.wagS = 1; d.pose = 'sit'; d.popT = -1e9;
    d.blinkAt = 800 + Math.random() * 2500; d.tiltAt = 2500 + Math.random() * 3000; d.flickAt = 1500 + Math.random() * 2000; d.idleTilt = 0;
    return d;
  }
  function span() { return LW / 2 - 52; }
  function cx() { return LW / 2; }
  function home(i) { return cx() + (i ? 62 : -62); }

  // ---------- the API every activity script gets ----------
  function makeA() {
    var A = { t: 0, prevT: -1, dur: 1, k: 0, probe: false, U: U, R: RM, fired: null };
    A.e = function (a, b) { return eio((A.t - a) / (b - a)); };
    A.p = function (a, b) { return clamp((A.t - a) / (b - a), 0, 1); };
    A.out = function (a, b) { return eout((A.t - a) / (b - a)); };
    A.back = function (a, b) { return A.t < a ? 0 : eback((A.t - a) / (b - a)); };
    A.bump = function (a, b) { return A.t > a && A.t < b ? Math.sin(Math.PI * (A.t - a) / (b - a)) : 0; };
    A.in = function (a, b) { return A.t >= a && A.t < b; };
    A.osc = function (period, amp, ph) { return Math.sin(Math.PI * 2 * A.t / period + (ph || 0)) * (amp == null ? 1 : amp); };
    A.mix = mix; A.clamp = clamp; A.eio = eio; A.eout = eout;
    A.once = function (t0) { if (A.probe) return false; if (A.prevT < t0 && A.t >= t0) { if (A.fired[t0]) return false; A.fired[t0] = 1; return true; } return false; };
    A.walk = function (d, xa, xb, a, b) {
      if (A.t < a) return 0; var p = clamp((A.t - a) / (b - a), 0, 1);
      d.x = mix(xa, xb, eio(p)); if (p < 1 && Math.abs(xb - xa) > 1) { d.pose = 'run'; d.face = sgn(xb - xa); } return p;
    };
    A.hop = function (d, t0, dur, h) {
      var t = A.t, pre = RM ? 90 : 150, post = RM ? 180 : 260;
      if (t < t0 - pre || t > t0 + dur + post) return t > t0 + dur ? 1 : 0;
      if (t < t0) { var q = (t - (t0 - pre)) / pre, s = Math.sin(q * Math.PI / 2) * 0.13; d.sy *= 1 - s; d.sx *= 1 + s * 0.7; return 0; } // anticipation
      if (t < t0 + dur) { var p = (t - t0) / dur, st = Math.abs(1 - 2 * p); d.lift += h * 4 * p * (1 - p); d.sy *= 1 + 0.1 * st * (1 - p * 0.6); d.sx *= 1 - 0.06 * st; return p; }
      var r = (t - t0 - dur) / post, sq = Math.sin(r * Math.PI * 1.6) * (1 - r) * 0.15; d.sy *= 1 - sq; d.sx *= 1 + sq * 0.7; return 1; // landing squash with overshoot
    };
    A.flip = function (d, t0, dur, h, turns, dir) {
      var p = A.hop(d, t0, dur, h); if (A.t >= t0 && A.t <= t0 + dur) d.rot += (dir || -1) * Math.PI * 2 * (turns || 1) * eio(p); return p;
    };
    A.spin = function (d, t0, dur, turns) {
      if (A.t < t0 || A.t > t0 + dur) return; var p = eio((A.t - t0) / dur); d.face = (d.face || 1) * Math.cos(Math.PI * 2 * (turns || 1) * p);
    };
    A.faceTo = function (d, o) { d.face = sgn(o.x - d.x); };
    A.tick = function (period, from, to) { if (A.probe || A.t < (from || 0) || (to != null && A.t > to)) return false; return Math.floor(A.prevT / period) !== Math.floor(A.t / period) && A.prevT >= 0 && A.t !== A.prevT; };
    A.say = function (who, text, a, b, opt) {
      if (A.probe || A.t < a || A.t > b) return;
      if (who && typeof who === 'object' && who.i != null && who.x != null && who.pose != null) who = who.i;
      bubbles.push({ who: who, text: text, p: (A.t - a), rem: b - A.t, opt: opt || {} });
    };
    A.burst = function (x, y, n, kind, o) { if (!A.probe) burst(x, y, n, kind, o); };
    A.shake = function (px) { if (!A.probe && !RM) shake = Math.max(shake, px); };
    A.head = function (i) { return headPos(i); };
    A.mouth = function (i) { var h = headPos(i), sc = S * R[i].scale; return { x: h.x + h.face * 12 * sc, y: h.y + 7 * sc, face: h.face }; };
    A.rpose = function (i) { return R[i].pose; };
    A.headL = function (i) { var p = R[i].pose; return p === 'sit' ? { x: 18, y: -38 } : p === 'bow' ? { x: 22, y: -14 } : p === 'lie' ? { x: 19, y: -19 } : { x: 21, y: i ? -33 : -30.5 }; };
    A.pos = function (i) { var r = R[i]; return { x: r.x, y: G + r.dy - r.lift, face: sgn(r.face) }; };
    A.pup = function (g2, key, x, y, s, face, pose, wag) { U.pup(g2, key, x, y, s, face, pose, clock, wag); };
    return A;
  }
  var A = makeA(), AO = makeA(), AP = makeA();
  function syncA(a) { a.W = LW; a.H = LH; a.G = G; a.cx = cx(); a.span = span(); a.x0 = home(0); a.x1 = home(1); a.S = S; a.now = clock; a.dark = isDark(hour); a.hour = hour; a.setting = setting.id; a.water = !!setting.water; a.snow = !!setting.snow; }

  function headPos(i) {
    var r = R[i], sc = S * r.scale, f = sgn(r.face), hx = r.pose === 'sit' ? 18 : r.pose === 'bow' ? 22 : r.pose === 'lie' ? 19 : 21, hy = r.pose === 'sit' ? -38 : r.pose === 'bow' ? -14 : r.pose === 'lie' ? -19 : (i ? -33 : -30.5);
    var fa = clamp(Math.abs(r.face), 0.15, 1), sx = r.x + f * hx * sc * fa * r.sx, sy = G + r.dy - r.lift + hy * sc * r.sy;
    if (r.rot) { var px = r.pivot === 'hind' ? r.x - f * 12 * sc : r.x, py = r.pivot === 'hind' ? G + r.dy - r.lift : G + r.dy - r.lift - 22 * sc, a = r.rot * f, dx = sx - px, dy = sy - py;
      sx = px + dx * Math.cos(a) - dy * Math.sin(a); sy = py + dx * Math.sin(a) + dy * Math.cos(a); }
    return { x: sx, y: sy, face: f };
  }

  // ---------- particles (capped) ----------
  var PCOL = { heart: ['#F28AA8', '#F7A8C2', '#E4566E'], spark: ['#F8D76A', '#FFF1B0', '#FFFFFF'], confetti: ['#F27D7D', '#F6B26B', '#F7DC6F', '#8FD694', '#7FB8F0', '#B79CEB'],
    star: ['#F8D76A', '#FFE9A8'], puff: ['rgba(255,255,255,.9)'], drop: ['#8CCBF0', '#B5E0F7'], note: ['#6E5AA8', '#E4566E', '#3E8FB0'], leaf: ['#8FC46B', '#E8913F', '#D8643F', '#F2C14E'],
    dirt: ['#A98A5C', '#8A6B45'], snow: ['#FFFFFF', '#EAF3FC'], crumb: ['#C9965F', '#E0B77F'], bubble: ['rgba(180,220,255,.9)'], fw: ['#F27D7D', '#F7DC6F', '#8FD694', '#7FB8F0', '#B79CEB', '#F7A8C2'] };
  function burst(x, y, n, kind, o) {
    o = o || {}; n = Math.round(n * (RM ? 0.5 : 1));
    for (var i = 0; i < n; i++) {
      if (parts.length >= PMAX) parts.shift();
      var a = o.angle != null ? o.angle + (Math.random() - 0.5) * (o.spread || 1) : -Math.PI / 2 + (Math.random() - 0.5) * (o.spread || 2.4), sp = (o.speed || 0.12) * (0.5 + Math.random());
      var cols = o.col ? [o.col] : PCOL[kind] || PCOL.spark;
      parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: o.grav != null ? o.grav : (kind === 'confetti' ? 0.00012 : kind === 'heart' || kind === 'note' || kind === 'bubble' || kind === 'star' ? -0.00002 : kind === 'puff' ? -0.00003 : 0.00025),
        life: 0, ttl: (o.life || (kind === 'puff' ? 700 : 1300)) * (0.75 + Math.random() * 0.5), k: kind, col: cols[i % cols.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.012, s: (o.size || 1) * (0.8 + Math.random() * 0.4) });
    }
  }
  function stepParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.life += dt; if (p.life >= p.ttl) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.k === 'confetti' || p.k === 'leaf' || p.k === 'snow') { p.vx *= 0.995; p.x += Math.sin((p.life + p.rot * 100) / 180) * 0.02 * dt; }
      if (p.y > G + 40 && p.vy > 0 && p.k !== 'drop') { p.y = G + 40; p.vy = 0; p.vx *= 0.5; }
    }
  }
  function drawParts() {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], q = p.life / p.ttl, a = q < 0.1 ? q / 0.1 : 1 - Math.max(0, (q - 0.6) / 0.4); g.globalAlpha = clamp(a, 0, 1);
      if (p.k === 'heart') U.heart(g, p.x, p.y, 4.5 * p.s, p.col);
      else if (p.k === 'confetti' || p.k === 'fwc') { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.col; g.fillRect(-2.5 * p.s, -1.5 * p.s, 5 * p.s, 3 * p.s); g.restore(); }
      else if (p.k === 'star') U.star(g, p.x, p.y, 4 * p.s, p.col, p.rot);
      else if (p.k === 'puff') U.circle(g, p.x, p.y, (5 + q * 9) * p.s, p.col);
      else if (p.k === 'note') U.note(g, p.x, p.y, 0.9 * p.s, p.col);
      else if (p.k === 'leaf') { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); U.ell(g, 0, 0, 4 * p.s, 2 * p.s, p.col); g.restore(); }
      else if (p.k === 'bubble') { g.strokeStyle = p.col; g.lineWidth = 1; g.beginPath(); g.arc(p.x, p.y, 4 * p.s, 0, Math.PI * 2); g.stroke(); }
      else if (p.k === 'fw') U.circle(g, p.x, p.y, 1.8 * p.s, p.col);
      else U.circle(g, p.x, p.y, (p.k === 'snow' ? 2.2 : p.k === 'drop' ? 1.8 : 1.6) * p.s, p.col);
    }
    g.globalAlpha = 1;
  }

  // ---------- choosing what's next: a shuffled bag, no repeats until all are seen ----------
  function fits(a) {
    if (!a) return false; if (a.broken) return false;
    if (a.time === 'night' && !isDark(hour)) return false;
    if (a.time === 'day' && isDark(hour)) return false;
    return true;
  }
  function refillBag() {
    var ids = shuffle(ACTS.map(function (a) { return a.id; }));
    if (ids.length > 1 && ids[0] === lastActId) { ids.push(ids.shift()); }
    mem.bag = ids; persist();
  }
  function takeFromBag(prefer) {
    if (!Array.isArray(mem.bag) || !mem.bag.length) refillBag();
    for (var pass = 0; pass < 2; pass++) {
      var best = -1;
      for (var i = 0; i < mem.bag.length; i++) {
        var a = BYID[mem.bag[i]]; if (!fits(a) || a.id === lastActId) continue;
        if (!prefer || prefer(a)) { best = i; break; }
        if (best < 0 && pass === 1) best = i;
      }
      if (best < 0 && prefer && pass === 0) { for (var j = 0; j < mem.bag.length; j++) { var b = BYID[mem.bag[j]]; if (fits(b) && b.id !== lastActId) { best = j; break; } } }
      if (best >= 0) { var id = mem.bag.splice(best, 1)[0]; persist(); return BYID[id]; }
      refillBag();
    }
    var ok = ACTS.filter(function (a) { return fits(a) && a.id !== lastActId; });
    return ok[Math.floor(Math.random() * ok.length)] || ACTS[0];
  }
  function removeFromBag(id) { if (Array.isArray(mem.bag)) { var i = mem.bag.indexOf(id); if (i >= 0) { mem.bag.splice(i, 1); persist(); } } }

  // ---------- running activities ----------
  function frameDogs(act, a) {
    var D = [dogDefaults(0), dogDefaults(1)];
    var st = act.at ? act.at(a) : null;
    D[0].x = st ? st[0] : a.x0; D[1].x = st ? st[1] : a.x1;
    D[0].face = sgn(D[1].x - D[0].x); D[1].face = -D[0].face;
    act.run(a, D[0], D[1]);
    return D;
  }
  function probeStart(act) {
    syncA(AP); AP.t = 0; AP.prevT = 0; AP.dur = act.dur; AP.k = 0; AP.probe = true; AP.fired = {};
    try { return frameDogs(act, AP); } catch (e) { act.broken = true; stats.errors++; return [dogDefaults(0), dogDefaults(1)].map(function (d, i) { d.x = home(i); return d; }); }
  }
  function startTravel(act, opt) {
    opt = opt || {};
    if (mode === 'act' && cur) { outgoing = { act: cur.act, t: cur.t, a: 1 }; }
    for (var i = 0; i < 2; i++) { if (cur && cur.lastD) { lastOver[i] = cur.lastD[i].over; lastUnder[i] = cur.lastD[i].under; lastCape[i] = cur.lastD[i].cape; } }
    var to = probeStart(act), maxd = 0;
    var from = R.map(function (r) { return { x: r.x, lift: r.lift, face: r.face }; });
    for (var j = 0; j < 2; j++) maxd = Math.max(maxd, Math.abs(to[j].x - from[j].x));
    var cross = (from[0].x - from[1].x) * (to[0].x - to[1].x) < 0;
    trav = { t: 0, act: act, from: from, to: to, cross: cross, dur: clamp(420 + maxd * 6, 650, 1700) * (RM ? 1.25 : 1), intro: opt.intro, combo: opt.combo };
    mode = 'travel'; cur = null;
    setCaption(act, opt);
  }
  function startAct(act) {
    cur = { act: act, t: 0, prevT: -1, fired: {}, counted: false, lastD: null };
    mode = 'act'; lastActId = act.id; stats.acts++;
  }
  function finishAct() {
    var a = cur && cur.act, next = null, combo = false;
    if (a && COMBOS[a.id] && Math.random() < 0.6) { var b = BYID[COMBOS[a.id]]; if (fits(b) && b.id !== a.id) { next = b; removeFromBag(b.id); combo = true; } }
    if (!next) { combo = comboLeft > 0 || Math.random() < 0.2; next = takeFromBag(); }
    comboLeft = combo && comboLeft <= 0 ? 1 : 0;
    startTravel(next, { combo: combo });
  }
  function recover(why) {
    stats.recovers++;
    for (var i = 0; i < 2; i++) { var r = R[i]; if (!fin(r.x) || !fin(r.lift) || !fin(r.rot) || !fin(r.face) || !fin(r.sx) || !fin(r.sy) || !fin(r.scale)) R[i] = renderDefaults(i); }
    trick = null; outTime = 0;
    var next = takeFromBag();
    startTravel(next, {});
    return why;
  }

  // ---------- caption, badge and today's tally ----------
  function setCaption(act, opt) {
    if (!capEl) return;
    var txt = act.cap;
    capMain.textContent = (opt.combo ? 'Combo! ' : opt.intro ? 'Surprise! ' : '') + txt;
    capPunch.textContent = '';
    cv.setAttribute('aria-label', 'Tidbit and Sugarfoot in ' + setting.name + ': ' + txt);
    badge.hidden = !opt.combo && !opt.intro; badge.textContent = opt.combo ? 'Combo!' : 'Surprise!';
    if (!badge.hidden) { badge.classList.remove('is-pop'); void badge.offsetWidth; badge.classList.add('is-pop'); }
  }
  function countSeen(act) {
    if (!mem.day || mem.day !== todayKey()) { mem.day = todayKey(); mem.seen = {}; }
    mem.seen = mem.seen || {}; var isNew = !mem.seen[act.id]; mem.seen[act.id] = (mem.seen[act.id] || 0) + 1; persist(); renderTally(isNew ? act.id : null);
  }
  function renderTally(newId) {
    if (!chips) return;
    if (!mem.day || mem.day !== todayKey()) { mem.day = todayKey(); mem.seen = {}; }
    var seen = mem.seen || {}, ids = Object.keys(seen).filter(function (id) { return BYID[id]; });
    tallyN.textContent = ids.length; tallyTot.textContent = ACTS.length;
    chips.innerHTML = '';
    ids.sort(function (a, b) { return ACTS.indexOf(BYID[a]) - ACTS.indexOf(BYID[b]); }).forEach(function (id) {
      var li = document.createElement('li'); li.textContent = BYID[id].name + (seen[id] > 1 ? ' ×' + seen[id] : '');
      if (id === newId) li.className = 'is-new'; chips.appendChild(li);
    });
    if (!ids.length) { var li = document.createElement('li'); li.className = 'is-empty'; li.textContent = 'Nothing yet. Keep watching!'; chips.appendChild(li); }
    if (newId) { tallyN.classList.remove('is-pop'); void tallyN.offsetWidth; tallyN.classList.add('is-pop'); }
  }

  // ---------- one frame ----------
  function step(dt) {
    var sdt = dt * SPEED;
    clock += dt;
    if (trick) { trick.t += dt; if (trick.t >= trick.dur) trick = null; }
    var D, frozen = !!trick;
    if (outgoing) { outgoing.a -= dt / 450; if (outgoing.a <= 0) outgoing = null; }

    if (mode === 'act' && cur) {
      if (!frozen) { cur.prevT = cur.t; cur.t += sdt; }
      syncA(A); A.t = cur.t; A.prevT = frozen ? cur.t : cur.prevT; A.dur = cur.act.dur; A.k = clamp(cur.t / cur.act.dur, 0, 1); A.probe = false; A.fired = cur.fired;
      try { D = frameDogs(cur.act, A); } catch (e) { cur.act.broken = true; stats.errors++; if (window.console) console.warn('pal cam: ' + cur.act.id, e); recover('error'); return step(0); }
      cur.lastD = D;
      if (cur.act.punch && cur.t >= cur.act.punch[0] && capPunch.textContent !== cur.act.punch[1]) capPunch.textContent = cur.act.punch[1];
      if (!cur.counted && cur.t >= cur.act.dur * 0.55) { cur.counted = true; countSeen(cur.act); }
      if (cur.t >= cur.act.dur) { finishAct(); return step(0); }
      if (cur.t > cur.act.dur + 2500) { recover('overtime'); return step(0); } // watchdog (belt and braces)
    } else if (trav) {
      if (!frozen) trav.t += sdt;
      D = travelDogs(trav);
      if (trav.t >= trav.dur + 110) { var a = trav.act; trav = null; startAct(a); return step(0); }
      if (trav.t > trav.dur + 3000) { recover('travel'); return step(0); }
    } else { recover('idle'); return step(0); }

    if (trick) applyTrick(D);
    // watchdog: anything non-finite, or a pal far off stage, and they ease home and move on
    var sp = span(), c = cx(), bad = false, out = false;
    for (var i = 0; i < 2; i++) {
      var d = D[i];
      if (!fin(d.x) || !fin(d.lift) || !fin(d.rot) || !fin(d.face) || !fin(d.sx) || !fin(d.sy) || !fin(d.scale)) { bad = true; break; }
      if (d.x < c - sp - 30 || d.x > c + sp + 30 || d.lift > 200 || d.lift < -40) out = true;
      d.x = clamp(d.x, c - sp, c + sp); d.lift = clamp(d.lift, -12, 172); d.scale = clamp(d.scale, 0.2, 1.5);
    }
    if (bad) { stats.errors++; if (cur) cur.act.broken = true; recover('nan'); return step(0); }
    outTime = out ? outTime + dt : 0; stats.maxOut = Math.max(stats.maxOut, outTime);
    if (outTime > 350) { recover('bounds'); return step(0); }

    idle(D, dt);
    smooth(D, dt);
    stepParts(dt);
    shake = Math.max(0, shake - dt * 0.02);
  }

  function travelDogs(tv) {
    var D = [dogDefaults(0), dogDefaults(1)];
    for (var i = 0; i < 2; i++) {
      var d = D[i], f = tv.from[i], to = tv.to[i], lag = i ? 110 : 0, p = clamp((tv.t - lag) / tv.dur, 0, 1), e = eio(p), dist = Math.abs(to.x - f.x);
      d.x = mix(f.x, to.x, e);
      d.lift = f.lift * (1 - eout(Math.min(1, p * 2.2)));
      if (dist > 20) { var hops = Math.max(1, Math.round(dist / 55)); d.lift += Math.abs(Math.sin(p * Math.PI * hops)) * (RM ? 4 : 8) * (1 - p * 0.3); }
      else d.lift += Math.sin(clamp((p - 0.2) / 0.6, 0, 1) * Math.PI) * (RM ? 6 : 12); // a ready-steady hop in place
      if (tv.cross && i === 1) d.lift += Math.sin(p * Math.PI) * 46; // leapfrog instead of walking through her pal
      d.pose = dist > 8 && p < 0.97 ? 'run' : to.pose === 'run' ? 'run' : p < 0.9 ? 'run' : to.pose;
      d.face = dist > 8 && p < 0.86 ? sgn(to.x - f.x) : to.face;
      d.dy = to.dy; d.scale = mix(1, to.scale, e); d.alpha = mix(1, to.alpha, e);
      d.wag = 1.6;
      if (tv.t < 320) { d.overPrev = lastOver[i]; d.underPrev = lastUnder[i]; d.capePrev = lastCape[i]; d.prevA = 1 - tv.t / 320; }
      if (tv.intro) { if (tv.t < 900 && !RM) d.lift += 0; }
    }
    if (tv.intro) { if (tv.t < 700) { bubbles.push({ who: 0, text: '!', p: tv.t, rem: 700 - tv.t, opt: {} }); bubbles.push({ who: 1, text: '!', p: Math.max(0, tv.t - 80), rem: 700 - tv.t, opt: {} }); } }
    return D;
  }

  var TRICKS = ['spin', 'flip', 'bow', 'hop'];
  function applyTrick(D) {
    var d = D[trick.i], o = D[1 - trick.i], p = trick.t / trick.dur, t = trick.t;
    // the other pal looks over, wags hard and laughs
    o.face = sgn(d.x - o.x) || o.face; o.wag = 3;
    if (trick.kind === 'spin') { d.face = sgn(d.face || 1) * Math.cos(Math.PI * 4 * eio(p)); d.pose = 'run'; d.ph = 0; d.lift += Math.sin(p * Math.PI) * 10; }
    else if (trick.kind === 'flip') {
      var pre = 0.14, q = clamp((p - pre) / 0.66, 0, 1);
      if (p < pre) { d.sy *= 1 - Math.sin(p / pre * Math.PI / 2) * 0.14; d.sx *= 1.08; }
      else if (q < 1) { d.lift += 64 * 4 * q * (1 - q); d.rot += -Math.PI * 2 * eio(q) * (RM ? 0 : 1); d.pose = 'run'; d.ph = 1.2; }
      else { var r = (p - pre - 0.66) / 0.2, sq = Math.sin(r * Math.PI * 1.5) * (1 - r) * 0.16; d.sy *= 1 - sq; d.sx *= 1 + sq * 0.6; }
    }
    else if (trick.kind === 'bow') { d.pose = p > 0.12 && p < 0.85 ? 'bow' : d.pose; d.wag = 3.5; d.tilt += Math.sin(p * Math.PI) * 0.2; }
    else { for (var h = 0; h < 3; h++) { var a = h / 3, b = (h + 0.8) / 3; if (p > a && p < b) d.lift += Math.sin((p - a) / (b - a) * Math.PI) * 22; } d.pose = 'run'; d.ph = 0; d.wag = 3; }
    if (t < 900) bubbles.push({ who: 1 - trick.i, text: trick.laugh, p: Math.max(0, t - 250), rem: 900 - t, opt: {} });
  }
  function doTrick(i) {
    if (trick || !isOpen) return;
    trick = { i: i, t: 0, dur: RM ? 1500 : 1150, kind: TRICKS[Math.floor(Math.random() * TRICKS.length)], laugh: ['Ha!', 'Yay!', '<3', 'Wow!'][Math.floor(Math.random() * 4)] };
    var h = headPos(i); burst(h.x, h.y - 10, 5, 'heart'); burst(h.x, h.y - 6, 6, 'spark');
  }

  function idle(D, dt) {
    for (var i = 0; i < 2; i++) {
      var d = D[i], r = R[i];
      // blinks, curious head tilts and ear flicks on their own little timers, so they are never still
      if (clock > r.blinkAt + 140) r.blinkAt = clock + 1800 + Math.random() * 3200;
      if (d.blink == null) d.blink = clock > r.blinkAt && clock < r.blinkAt + 130;
      if (clock > r.tiltAt + 900) { r.tiltAt = clock + 2600 + Math.random() * 3800; r.tiltDir = Math.random() < 0.5 ? -1 : 1; }
      var tq = clamp((clock - r.tiltAt) / 900, 0, 1); d.tilt += (r.tiltDir || 1) * 0.2 * Math.sin(tq * Math.PI);
      if (clock > r.flickAt + 260) r.flickAt = clock + 1400 + Math.random() * 2600;
      var fq = clamp((clock - r.flickAt) / 260, 0, 1); d.ear += Math.sin(fq * Math.PI * 2) * 0.28 * (1 - fq);
      if (d.pose !== 'lie') d.sy *= 1 + 0.014 * Math.sin(clock / 430 + i * 1.7); // breathing
    }
  }

  function smooth(D, dt) {
    function ex(tau) { return 1 - Math.exp(-dt / tau); }
    var kx = ex(42), kf = ex(70), ks = ex(34), ka = ex(90);
    for (var i = 0; i < 2; i++) {
      var d = D[i], r = R[i], ox = r.x, ol = r.lift;
      r.x += (d.x - r.x) * kx; r.lift += (d.lift - r.lift) * kx;
      r.rot += angDiff(r.rot, d.rot) * kx; if (Math.abs(r.rot) > Math.PI * 2) r.rot = r.rot % (Math.PI * 2);
      r.face += (d.face - r.face) * kf; r.sx += (d.sx - r.sx) * ks; r.sy += (d.sy - r.sy) * ks; r.scale += (d.scale - r.scale) * ka;
      r.alpha += (d.alpha - r.alpha) * ka; r.tilt += (d.tilt - r.tilt) * kx; r.dy += (d.dy - r.dy) * ka; r.ear = d.ear;
      r.wagS += (d.wag - r.wagS) * ex(200); r.wph += dt * 0.0105 * r.wagS * (RM ? 0.6 : 1);
      if (d.pose !== r.pose) { r.popT = clock; r.pose = d.pose; }
      // legs follow the ground covered, never a clock, and settle when she stops
      var moved = Math.abs(r.x - ox) + Math.abs(r.lift - ol) * 0.25;
      if (d.ph != null) r.ph = d.ph;
      else if (r.pose === 'run' && moved > dt * 0.004) r.ph += moved * 0.2 / (S * r.scale);
      else { var tgt = Math.round(r.ph / Math.PI) * Math.PI; r.ph += (tgt - r.ph) * ex(120); }
      r.blink = d.blink; r.pivot = d.pivot; r.cape = d.cape; r.capeFly = d.capeFly; r.under = d.under; r.over = d.over; r.noEar = d.noEar; r.z = d.z;
      r.overPrev = d.overPrev; r.underPrev = d.underPrev; r.capePrev = d.capePrev; r.prevA = d.prevA || 0; r.hide = d.hide;
    }
  }

  // ---------- drawing ----------
  function drawDog(i) {
    var r = R[i], P = window.TOLPups; if (!P || r.hide || r.alpha < 0.02) return;
    var sc = S * r.scale, baseY = G + r.dy, y = baseY - r.lift, f = r.face, fa = Math.abs(f) < 0.15 ? 0.15 : Math.abs(f), fs = sgn(f);
    var pq = clamp((clock - r.popT) / 200, 0, 1), pop = Math.sin(pq * Math.PI) * 0.07; // a small squash hides a change of pose
    g.save(); g.globalAlpha = r.alpha;
    var sh = clamp(1 - r.lift / 200, 0.3, 1);
    U.ell(g, r.x, baseY + 1, 20 * sc * sh, 3.8 * sc * sh, 'rgba(40,30,60,' + (0.16 * sh).toFixed(3) + ')');
    g.translate(r.x, y); g.scale(fs, 1);
    if (r.rot) { var px = r.pivot === 'hind' ? -12 * sc : 0, py = r.pivot === 'hind' ? 0 : -22 * sc; g.translate(px, py); g.rotate(r.rot); g.translate(-px, -py); }
    g.scale(fa * sc * r.sx * (1 + pop * 0.6), sc * r.sy * (1 - pop));
    var L = P.looks[i ? 'collar' : 'drop'];
    if (r.underPrev && r.prevA > 0) { g.save(); g.globalAlpha *= r.prevA; safeCall(r.underPrev, i); g.restore(); }
    if (r.under) safeCall(r.under, i);
    if (r.cape) P.cape(g, L, clock, r.cape, r.capeFly);
    else if (r.capePrev && r.prevA > 0) { g.save(); g.globalAlpha *= r.prevA; P.cape(g, L, clock, r.capePrev, false); g.restore(); }
    P.draw(g, L, r.pose, r.ph, Math.sin(r.wph) * 0.55, !!r.blink, clock, r.tilt, { ear: r.ear, noEar: r.noEar });
    if (r.over) safeCall(r.over, i);
    if (r.overPrev && r.prevA > 0) { g.save(); g.globalAlpha *= r.prevA; safeCall(r.overPrev, i); g.restore(); }
    g.restore();
  }
  function safeCall(fn, i) { try { g.save(); fn(g, A, i, clock); g.restore(); } catch (e) { g.restore(); stats.errors++; } }

  function drawBubbles() {
    for (var j = 0; j < bubbles.length; j++) {
      var b = bubbles[j], pos = typeof b.who === 'number' ? headPos(b.who) : b.who;
      var pin = RM ? clamp(b.p / 200, 0, 1) : eback(clamp(b.p / 260, 0, 1)), fade = clamp(b.rem / 180, 0, 1), s = RM ? 1 : pin;
      if (s <= 0.01) continue;
      var txt = b.text, heart = txt === '<3', big = txt.length <= 2;
      g.save(); g.globalAlpha = fade * clamp(pin * 1.4, 0, 1);
      g.font = '700 ' + (big ? 16 : 12.5) + 'px Fraunces, Georgia, serif';
      var w = heart ? 26 : Math.max(24, g.measureText(txt).width + 14), h = 24;
      var bx = clamp(pos.x + (b.opt.dx || (pos.face || 1) * 8), w / 2 + 4, LW - w / 2 - 4), by = clamp(pos.y - 30 + (b.opt.dy || 0), h / 2 + 4, LH - 10);
      g.translate(bx, by); g.scale(s, s);
      g.fillStyle = '#FFFDF8'; g.strokeStyle = 'rgba(92,74,134,.55)'; g.lineWidth = 1.2;
      g.beginPath(); if (g.roundRect) g.roundRect(-w / 2, -h / 2, w, h, 12); else g.rect(-w / 2, -h / 2, w, h); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-4, h / 2 - 1); g.lineTo(0, h / 2 + 7); g.lineTo(5, h / 2 - 1); g.closePath(); g.fill();
      if (heart) U.heart(g, 0, 1, 6.5, '#E4566E'); else U.text(g, txt, 0, 1, big ? 16 : 12.5, txt === '!' || txt === '!!' ? '#D0485F' : txt === '?' ? '#3E7FB0' : '#4E3F6B');
      g.restore();
    }
  }

  function resize() {
    if (!cv) return;
    var r = cv.parentNode.getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1); CW = Math.max(200, Math.round(r.width)); CH = Math.max(180, Math.round(r.height));
    cv.width = Math.round(CW * DPR); cv.height = Math.round(CH * DPR); cv.style.width = CW + 'px'; cv.style.height = CH + 'px';
    LW = clamp(CW / CH * LH, LW_MIN, LW_MAX); K = Math.min(CW / LW, CH / LH); OX = (CW - LW * K) / 2; OY = (CH - LH * K) * 0.62;
    bgKey = ''; // the backdrop is redrawn to fit
  }
  function envBox() { return { x0: -OX / K - 4, x1: (CW - OX) / K + 4, y0: -OY / K - 4, y1: (CH - OY) / K + 4, dark: clamp(1 - skyAt(hour).light * 1.6, 0, 1) }; }
  function buildBg() {
    var key = CW + 'x' + CH + '@' + DPR + setting.id + Math.round(hour * 12);
    if (key === bgKey && bg) return; bgKey = key;
    bg = bg || document.createElement('canvas'); bg.width = cv.width; bg.height = cv.height;
    var b = bg.getContext('2d'), env = envBox(), sky = skyAt(hour);
    b.setTransform(DPR * K, 0, 0, DPR * K, DPR * OX, DPR * OY);
    var gr = b.createLinearGradient(0, env.y0, 0, G); gr.addColorStop(0, sky.top); gr.addColorStop(1, sky.bot);
    b.fillStyle = gr; b.fillRect(env.x0, env.y0, env.x1 - env.x0, env.y1 - env.y0);
    // stars and the moon at night, the sun by day, where the clock says they'd be
    if (env.dark > 0.1) { for (var i = 0; i < 70; i++) { var sx = env.x0 + rnd(i) * (env.x1 - env.x0), sy = env.y0 + rnd(i + 500) * (G - 70 - env.y0); U.circle(b, sx, sy, (i % 5 === 0 ? 1.3 : 0.8), 'rgba(255,250,230,' + (env.dark * (0.45 + (i % 3) * 0.2)).toFixed(2) + ')'); } }
    var h = hour, sunP = (h - 5.8) / (20.2 - 5.8);
    if (sunP > 0 && sunP < 1) { var sx2 = mix(env.x0 + 30, env.x1 - 30, sunP), sy2 = G - 50 - Math.sin(sunP * Math.PI) * 170;
      var sg = b.createRadialGradient(sx2, sy2, 4, sx2, sy2, 44); sg.addColorStop(0, 'rgba(255,248,210,.9)'); sg.addColorStop(1, 'rgba(255,240,190,0)'); b.fillStyle = sg; b.fillRect(sx2 - 44, sy2 - 44, 88, 88);
      U.circle(b, sx2, sy2, 15, sunP < 0.12 || sunP > 0.86 ? '#FFC98A' : '#FFE68A'); }
    var mh = h < 12 ? h + 24 : h, moonP = (mh - 19.5) / (30.5 - 19.5);
    if (moonP > 0 && moonP < 1) { var mx = mix(env.x0 + 40, env.x1 - 40, moonP), my = G - 60 - Math.sin(moonP * Math.PI) * 160;
      U.circle(b, mx, my, 20, 'rgba(255,250,220,.12)'); U.circle(b, mx, my, 12, '#FBF3D5'); U.circle(b, mx + 5, my - 3, 10, sky.top); }
    // the setting, then dimmed for the hour, then anything that glows
    var lay = document.createElement('canvas'); lay.width = bg.width; lay.height = bg.height; var l = lay.getContext('2d');
    l.setTransform(DPR * K, 0, 0, DPR * K, DPR * OX, DPR * OY); env.dark = clamp(1 - sky.light * 1.6, 0, 1);
    try { setting.draw(l, env); } catch (e) { stats.errors++; }
    var warm = phaseOf(hour) === 'golden hour' || phaseOf(hour) === 'dawn';
    l.setTransform(1, 0, 0, 1, 0, 0); l.globalCompositeOperation = 'source-atop';
    if (env.dark > 0) { l.fillStyle = 'rgba(22,24,64,' + (env.dark * 0.55).toFixed(3) + ')'; l.fillRect(0, 0, lay.width, lay.height); }
    if (warm) { l.fillStyle = 'rgba(255,170,90,.12)'; l.fillRect(0, 0, lay.width, lay.height); }
    b.setTransform(1, 0, 0, 1, 0, 0); b.drawImage(lay, 0, 0);
    b.setTransform(DPR * K, 0, 0, DPR * K, DPR * OX, DPR * OY);
    if (setting.lights) try { setting.lights(b, env); } catch (e) { stats.errors++; }
  }
  function ambientStep(dt) {
    // drifting clouds by day, fireflies after dark, snow on the hill, leaves in autumn places
    var env = envBox(), dark = isDark(hour), want = [];
    if (!ambient.length) {
      for (var i = 0; i < 3; i++) ambient.push({ k: 'cloud', x: mix(env.x0, env.x1, Math.random()), y: 30 + i * 28, s: 0.6 + Math.random() * 0.5, v: 0.004 + Math.random() * 0.004 });
      if (dark || setting.fireflies) for (var f = 0; f < (RM ? 5 : 9); f++) ambient.push({ k: 'fly', x: mix(env.x0, env.x1, Math.random()), y: G - 30 - Math.random() * 110, s: Math.random() * 6, v: 0 });
      if (setting.snow) for (var s = 0; s < (RM ? 10 : 22); s++) ambient.push({ k: 'snow', x: mix(env.x0, env.x1, Math.random()), y: mix(env.y0, G + 30, Math.random()), s: Math.random() * 6, v: 0.012 + Math.random() * 0.012 });
      if (setting.leaves) for (var l2 = 0; l2 < (RM ? 3 : 6); l2++) ambient.push({ k: 'leaf', x: mix(env.x0, env.x1, Math.random()), y: mix(env.y0, G, Math.random()), s: Math.random() * 6, v: 0.01 + Math.random() * 0.01 });
    }
    for (var j = 0; j < ambient.length; j++) {
      var a = ambient[j];
      if (a.k === 'cloud') { a.x += a.v * dt * (RM ? 0.5 : 1); if (a.x > env.x1 + 10) a.x = env.x0 - 60; }
      else if (a.k === 'snow' || a.k === 'leaf') { a.y += a.v * dt; a.x += Math.sin(clock / 900 + a.s) * 0.01 * dt; if (a.y > G + 40) { a.y = env.y0; a.x = mix(env.x0, env.x1, Math.random()); } }
    }
  }
  function drawAmbientBack() {
    var dark = isDark(hour), light = skyAt(hour).light;
    for (var j = 0; j < ambient.length; j++) { var a = ambient[j]; if (a.k === 'cloud') U.cloud(g, a.x, a.y, a.s, dark ? 'rgba(160,160,200,.18)' : 'rgba(255,255,255,' + (0.55 + light * 0.35).toFixed(2) + ')'); }
    if (setting.water) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.2; var env = envBox(); for (var w = 0; w < 4; w++) { var wx = env.x0 + ((clock * 0.01 + w * 97) % (env.x1 - env.x0)); g.beginPath(); g.moveTo(wx, G - 40 + w * 5); g.lineTo(wx + 16, G - 40 + w * 5); g.stroke(); } }
  }
  function drawAmbientFront() {
    var dark = isDark(hour);
    for (var j = 0; j < ambient.length; j++) {
      var a = ambient[j];
      if (a.k === 'fly' && dark) { var fx = a.x + Math.sin(clock / 1300 + a.s) * 14, fy = a.y + Math.cos(clock / 1700 + a.s * 2) * 9, gl = 0.5 + 0.5 * Math.sin(clock / 700 + a.s * 3); U.circle(g, fx, fy, 5, 'rgba(255,240,140,' + (0.18 * gl).toFixed(2) + ')'); U.circle(g, fx, fy, 1.6, 'rgba(255,245,170,' + (0.5 + 0.5 * gl).toFixed(2) + ')'); }
      else if (a.k === 'snow') U.circle(g, a.x, a.y, 1.6 + (a.s % 1), 'rgba(255,255,255,.85)');
      else if (a.k === 'leaf') { g.save(); g.translate(a.x, a.y); g.rotate(clock / 600 + a.s); U.ell(g, 0, 0, 3.6, 1.8, ['#E8913F', '#D8643F', '#F2C14E'][Math.floor(a.s) % 3]); g.restore(); }
    }
  }

  function drawActLayer(state, aObj, layer, alpha) {
    var act = state.act, fn = act[layer]; if (!fn) return;
    syncA(aObj); aObj.t = state.t; aObj.prevT = state.t; aObj.dur = act.dur; aObj.k = clamp(state.t / act.dur, 0, 1); aObj.probe = aObj !== A; aObj.fired = aObj.fired || {};
    g.save(); g.globalAlpha = alpha;
    try { fn.call(act, g, aObj); } catch (e) { stats.errors++; act.broken = true; if (window.console) console.warn('pal cam: ' + act.id, e); }
    g.restore();
  }
  function draw() {
    buildBg();
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.drawImage(bg, 0, 0);
    var sx = shake ? Math.sin(clock * 0.07) * shake : 0, sy = shake ? Math.cos(clock * 0.09) * shake * 0.6 : 0;
    g.setTransform(DPR * K, 0, 0, DPR * K, DPR * (OX + sx * K), DPR * (OY + sy * K));
    drawAmbientBack();
    if (outgoing) drawActLayer(outgoing, AO, 'back', clamp(outgoing.a, 0, 1));
    if (cur) drawActLayer(cur, A, 'back', 1);
    var order = R[0].z <= R[1].z ? [0, 1] : [1, 0];
    drawDog(order[0]); if (cur && cur.act.mid) drawActLayer(cur, A, 'mid', 1); drawDog(order[1]);
    if (outgoing) drawActLayer(outgoing, AO, 'front', clamp(outgoing.a, 0, 1));
    if (cur) drawActLayer(cur, A, 'front', 1);
    drawParts();
    drawAmbientFront();
    drawBubbles();
    bubbles.length = 0;
  }

  function loop(now) {
    raf = 0;
    if (!isOpen || paused || document.hidden) return;
    raf = requestAnimationFrame(loop);
    var dt = last ? now - last : 16; last = now;
    if (frames.length < 20000) frames.push(dt);
    dt = clamp(dt, 0, 50); // after a hiccup or a tab switch nothing jumps
    ambientStep(dt);
    step(dt);
    draw();
  }
  function run() { if (!raf && isOpen && !paused && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } }
  function halt() { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; }

  // ---------- the overlay ----------
  var CSS = '' +
    '.pc-launch{display:inline-flex;align-items:center;justify-content:center;gap:.55rem;min-height:48px;padding:.55rem 1.15rem .55rem .7rem;border-radius:999px;border:2px solid #F3C6D3;background:linear-gradient(135deg,#FFF6E8,#FBE6F0 60%,#E9E2FB);color:#3C3350;font:600 1rem/1.2 Lora,Georgia,serif;cursor:pointer;box-shadow:0 6px 18px rgba(92,74,134,.16);text-decoration:none;touch-action:manipulation;max-width:100%;box-sizing:border-box}' +
    '.pc-launch:hover{box-shadow:0 10px 24px rgba(92,74,134,.22);background:linear-gradient(135deg,#FFF1DC,#F9DCE9 60%,#E2D8FA)}' +
    '.pc-launch:focus-visible{outline:3px solid #7C6BB0;outline-offset:3px}' +
    '.pc-launch .pc-paw{flex:none;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#3C3350;color:#FFF3D6}' +
    '.pc-launch .pc-paw svg{width:20px;height:20px}' +
    '.pc-launch small{display:block;font:500 .72rem/1.2 "IBM Plex Mono",monospace;letter-spacing:.04em;color:#7A6590}' +
    '.pc-launch-row{position:relative;z-index:97;display:flex;justify-content:center;margin:.2rem 0 .9rem}' +
    // the game shows full-screen cards (z-index 95); the launcher stays above their veil, and they make room below it
    '.fj-card{padding-top:max(.8rem,var(--pc-row-b,0px))}' +
    '.pc-launch-row[hidden]{display:none}' +
    '.pc-launch .pc-lt{display:block}' +
    '.pc-launch small .pc-dot{display:inline-block;margin-right:.35rem;vertical-align:1px}' +
    '.pc-launch .pc-dot{width:8px;height:8px;border-radius:50%;background:#E4566E;box-shadow:0 0 0 3px rgba(228,86,110,.2);animation:pcDot 2s ease-in-out infinite}' +
    '@keyframes pcDot{50%{opacity:.35}}' +
    '.pc-ov{position:fixed;inset:0;z-index:10000;display:flex;align-items:stretch;justify-content:center;background:#4A3F63;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);box-sizing:border-box;overscroll-behavior:contain}' +
    '.pc-ov[hidden]{display:none}' +
    '.pc-box{display:flex;flex-direction:column;width:100%;max-width:1000px;height:100%;background:#FFFBF4;color:#3C3350;box-sizing:border-box;padding:.6rem .7rem .7rem;gap:.5rem;overflow:hidden;font-family:Lora,Georgia,serif}' +
    '@media (max-width:759px){.pc-box{justify-content:center}}' +
    '@media (min-width:760px){.pc-ov{align-items:center;padding:1.2rem}.pc-box{height:min(100%,860px);border-radius:26px;box-shadow:0 24px 70px rgba(30,20,50,.4);padding:.9rem 1.1rem 1rem}}' +
    '.pc-top{display:flex;align-items:center;justify-content:space-between;gap:.6rem;flex:none}' +
    '.pc-top h2{margin:0;font:600 1.12rem/1.2 Fraunces,Georgia,serif;color:#3C3350}' +
    '.pc-k{margin:0 0 .1rem;font:500 .68rem/1.25 "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase;color:#8A6D8F}' +
    '.pc-x{flex:none;display:inline-flex;align-items:center;gap:.3rem;min-width:48px;min-height:48px;padding:0 .9rem;border-radius:999px;border:1px solid #E6D6EE;background:#fff;color:#3C3350;font:600 .95rem Lora,Georgia,serif;cursor:pointer}' +
    '.pc-x svg{width:18px;height:18px}' +
    '.pc-stage{position:relative;flex:1 1 auto;min-height:220px;max-height:118vw;border-radius:20px;overflow:hidden;background:#CFE6F7;box-shadow:inset 0 0 0 1px rgba(60,40,90,.08)}' +
    '.pc-cv{position:absolute;left:0;top:0;display:block;touch-action:manipulation;cursor:pointer;-webkit-user-select:none;user-select:none}' +
    '.pc-rec{position:absolute;left:.6rem;top:.55rem;display:inline-flex;align-items:center;gap:.35rem;padding:.2rem .55rem;border-radius:999px;background:rgba(255,253,248,.85);font:600 .66rem/1.2 "IBM Plex Mono",monospace;letter-spacing:.08em;color:#8A3E52;pointer-events:none}' +
    '.pc-rec i{width:7px;height:7px;border-radius:50%;background:#E4566E;animation:pcDot 2s ease-in-out infinite}' +
    '.pc-badge{position:absolute;right:.6rem;top:.55rem;padding:.25rem .7rem;border-radius:999px;background:#3C3350;color:#FFF3D6;font:700 .8rem/1.2 Fraunces,Georgia,serif;pointer-events:none}' +
    '.pc-badge.is-pop{animation:pcPop .5s cubic-bezier(.2,1.6,.4,1) both}' +
    '@keyframes pcPop{from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}' +
    '.pc-cap{flex:none;margin:0;min-height:2.7em;text-align:center;font:500 1.05rem/1.35 Fraunces,Georgia,serif;color:#3C3350;text-wrap:balance}' +
    '.pc-cap .pc-punch{display:block;font:italic 500 .95rem/1.3 Fraunces,Georgia,serif;color:#8A3E52;min-height:1.3em}' +
    '.pc-btns{flex:none;display:grid;grid-template-columns:1.2fr 1.2fr .8fr;gap:.45rem}' +
    '.pc-b{min-height:50px;padding:.4rem .6rem;border-radius:16px;border:1px solid #E6D6EE;background:#fff;color:#3C3350;font:600 1rem/1.15 Lora,Georgia,serif;cursor:pointer;touch-action:manipulation}' +
    '.pc-b.is-main{background:#3C3350;border-color:#3C3350;color:#FFF8EE}' +
    '.pc-b.is-sur{background:linear-gradient(135deg,#FFE7A8,#F9C6D6);border-color:transparent}' +
    '.pc-b[aria-pressed="true"]{background:#EFE7FB;border-color:#B9A6DA}' +
    '.pc-b:focus-visible,.pc-x:focus-visible,.pc-tr:focus-visible,.pc-tally summary:focus-visible{outline:3px solid #7C6BB0;outline-offset:2px}' +
    '.pc-trs{flex:none;display:grid;grid-template-columns:1fr 1fr;gap:.45rem}' +
    '.pc-tr{min-height:44px;padding:.3rem .5rem;border-radius:14px;border:1px dashed #D9C8F0;background:rgba(255,255,255,.7);color:#5B4A86;font:600 .86rem/1.15 Lora,Georgia,serif;cursor:pointer;touch-action:manipulation}' +
    '.pc-tally{flex:none;border-radius:14px;background:#F6EFFB;padding:0 .8rem}' +
    '.pc-tally summary{min-height:44px;display:flex;align-items:center;gap:.4rem;cursor:pointer;font:600 .92rem Lora,Georgia,serif;list-style:none}' +
    '.pc-tally summary::-webkit-details-marker{display:none}' +
    '.pc-tally summary::after{content:"▾";margin-left:auto;color:#8A6D8F}' +
    '.pc-tally[open] summary::after{content:"▴"}' +
    '.pc-tally b{display:inline-grid;place-items:center;min-width:1.8rem;height:1.6rem;padding:0 .35rem;border-radius:999px;background:#3C3350;color:#FFF3D6;font:600 .8rem "IBM Plex Mono",monospace}' +
    '.pc-tally b.is-pop{animation:pcPop .5s cubic-bezier(.2,1.6,.4,1) both}' +
    '.pc-chips{list-style:none;margin:0 0 .5rem;padding:0;display:flex;flex-wrap:wrap;gap:.3rem;max-height:7.5rem;overflow:auto}' +
    '.pc-chips li{padding:.2rem .6rem;border-radius:999px;background:#fff;border:1px solid #E6D6EE;font-size:.8rem;line-height:1.3}' +
    '.pc-chips li.is-new{background:#FFF3C9;border-color:#F0D680}' +
    '.pc-chips li.is-empty{border-style:dashed;color:#8A7F92}' +
    '.pc-note{margin:0 0 .6rem;font-size:.78rem;color:#7A6E86}' +
    '.pc-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
    '@media (max-width:420px){.pc-box{gap:.4rem;padding:.5rem .55rem .6rem}.pc-cap{font-size:.98rem}.pc-b{font-size:.95rem}.pc-top h2{font-size:1rem}}' +
    '@media (max-height:640px){.pc-trs{display:none}.pc-cap{min-height:2.4em}}' +
    '@media (prefers-reduced-motion: reduce){.pc-launch .pc-dot,.pc-rec i{animation:none}.pc-badge.is-pop,.pc-tally b.is-pop{animation:none}}' +
    'html.pc-lock,html.pc-lock body{overflow:hidden}' +
    // the page underneath is fully covered, so it stops painting while the cam is open (smoother frames)
    'html.pc-lock body > :not(.pc-ov){visibility:hidden !important}';

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  (function styles() { var st = el('style'); st.setAttribute('data-palcam', ''); st.textContent = CSS; (document.head || document.documentElement).appendChild(st); })();
  // the buttons wait, hidden, until the cam is ready (so nothing on the page is a dead end)
  function reveal() { if (!window.TOLPups) return; Array.prototype.forEach.call(document.querySelectorAll('[data-palcam-row][hidden], [data-palcam-open][hidden]'), function (b) { b.hidden = false; }); }
  // keep the game's full-screen cards clear of the launcher at the top of the page
  var rowQ = 0;
  function rowRoom() {
    rowQ = 0; var row = document.querySelector('[data-palcam-row]:not([hidden])'); if (!row) return;
    var b = row.getBoundingClientRect().bottom; document.documentElement.style.setProperty('--pc-row-b', (b > 0 ? Math.round(b + 8) : 0) + 'px');
  }
  function rowSoon() { if (!rowQ) rowQ = requestAnimationFrame(rowRoom); }
  window.addEventListener('scroll', rowSoon, { passive: true }); window.addEventListener('resize', rowSoon);
  function ready() { reveal(); rowRoom(); setTimeout(rowRoom, 400); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
  function build() {
    if (ov) return;
    ov = el('div', 'pc-ov'); ov.hidden = true; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'pc-h'); ov.setAttribute('aria-describedby', 'pc-cap');
    ov.innerHTML =
      '<div class="pc-box">' +
        '<div class="pc-top"><div><p class="pc-k" id="pc-where">Pal cam</p><h2 id="pc-h">Checking in on Tidbit &amp; Sugarfoot</h2></div>' +
        '<button type="button" class="pc-x" aria-label="Close the pal cam"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>Close</button></div>' +
        '<div class="pc-stage"><canvas class="pc-cv" role="img" aria-label="Tidbit and Sugarfoot playing"></canvas><span class="pc-rec" aria-hidden="true"><i></i>PAL CAM</span><span class="pc-badge" hidden></span></div>' +
        '<p class="pc-cap" id="pc-cap"><span class="pc-main" aria-live="polite"></span><span class="pc-punch"></span></p>' +
        '<div class="pc-btns"><button type="button" class="pc-b is-main pc-next">Next!</button><button type="button" class="pc-b is-sur pc-sur">Surprise me</button><button type="button" class="pc-b pc-pause" aria-pressed="false">Pause</button></div>' +
        '<div class="pc-trs"><button type="button" class="pc-tr" data-trick="0">Tidbit, do a trick!</button><button type="button" class="pc-tr" data-trick="1">Sugarfoot, do a trick!</button></div>' +
        '<details class="pc-tally"><summary>What they’ve done today <b class="pc-n">0</b><span class="pc-sr"> activities, </span><span aria-hidden="true">of</span> <span class="pc-tot">0</span></summary>' +
          '<ul class="pc-chips"></ul><p class="pc-note">Tap a pal for a happy trick. This list is kept in this browser only, just for you, and starts fresh each day.</p></details>' +
      '</div>';
    document.body.appendChild(ov);
    box = ov.querySelector('.pc-box'); cv = ov.querySelector('.pc-cv'); g = cv.getContext('2d');
    capEl = ov.querySelector('.pc-cap'); capMain = ov.querySelector('.pc-main'); capPunch = ov.querySelector('.pc-punch'); whereEl = ov.querySelector('#pc-where');
    badge = ov.querySelector('.pc-badge'); tallyN = ov.querySelector('.pc-n'); tallyTot = ov.querySelector('.pc-tot'); chips = ov.querySelector('.pc-chips'); btnPause = ov.querySelector('.pc-pause');
    ov.querySelector('.pc-x').addEventListener('click', close);
    ov.querySelector('.pc-next').addEventListener('click', function () { next(false); });
    ov.querySelector('.pc-sur').addEventListener('click', function () { next(true); });
    btnPause.addEventListener('click', function () { setPaused(!paused); });
    Array.prototype.forEach.call(ov.querySelectorAll('.pc-tr'), function (b) { b.addEventListener('click', function () { if (paused) setPaused(false); doTrick(+b.getAttribute('data-trick')); }); });
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    cv.addEventListener('pointerdown', function (e) {
      var r = cv.getBoundingClientRect(), lx = (e.clientX - r.left - OX) / K, ly = (e.clientY - r.top - OY) / K, best = -1, bd = 1e9;
      for (var i = 0; i < 2; i++) { var q = R[i], d = Math.hypot(lx - q.x, ly - (G + q.dy - q.lift - 24 * S * q.scale)); if (d < 48 * S * q.scale && d < bd) { bd = d; best = i; } }
      if (best >= 0) { if (paused) setPaused(false); doTrick(best); }
    });
    window.addEventListener('resize', function () { if (isOpen) { resize(); if (paused) draw(); } });
    if (window.ResizeObserver) new ResizeObserver(function () { if (isOpen) { var r = cv.parentNode.getBoundingClientRect(); if (Math.round(r.width) !== CW || Math.round(r.height) !== CH) { resize(); if (paused) draw(); } } }).observe(cv.parentNode);
    document.addEventListener('visibilitychange', function () { if (document.hidden) halt(); else run(); });
    // while the cam is open, keys belong to it (so the game underneath never moves), Esc closes, Tab stays inside
    window.addEventListener('keydown', function (e) {
      if (!isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key === 'Tab') {
        var f = Array.prototype.filter.call(ov.querySelectorAll('button, summary, [href], [tabindex]:not([tabindex="-1"])'), function (x) { return !x.disabled && x.offsetParent !== null; });
        if (f.length) { var i = f.indexOf(document.activeElement); if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); } }
      }
      e.stopPropagation();
    }, true);
    window.addEventListener('keyup', function (e) { if (isOpen) e.stopPropagation(); }, true);
    document.addEventListener('focusin', function (e) { if (isOpen && !ov.contains(e.target)) { var x = ov.querySelector('.pc-x'); if (x) x.focus(); } });
  }
  function setPaused(v) {
    paused = v; btnPause.setAttribute('aria-pressed', v ? 'true' : 'false'); btnPause.textContent = v ? 'Play' : 'Pause';
    if (v) halt(); else run();
  }
  function pickSetting(forceId) {
    if (forceId) { for (var i = 0; i < SETTINGS.length; i++) if (SETTINGS[i].id === forceId) return SETTINGS[i]; }
    var bag = Array.isArray(mem.sbag) ? mem.sbag.filter(function (id) { return SETTINGS.some(function (s) { return s.id === id; }); }) : [];
    if (!bag.length) { bag = shuffle(SETTINGS.map(function (s) { return s.id; })); if (bag[0] === mem.lastSet) bag.push(bag.shift()); }
    var id = bag.shift(); if (id === mem.lastSet && bag.length) { bag.push(id); id = bag.shift(); }
    mem.sbag = bag; mem.lastSet = id; persist();
    for (var j = 0; j < SETTINGS.length; j++) if (SETTINGS[j].id === id) return SETTINGS[j];
    return SETTINGS[0];
  }
  function loadActs() {
    var src = window.TOLPalsCamActs || { acts: [], combos: [] };
    ACTS = (src.acts || []).filter(function (a) { return a && a.id && typeof a.run === 'function'; });
    BYID = {}; ACTS.forEach(function (a) { a.dur = a.dur || 7000; BYID[a.id] = a; });
    COMBOS = {}; (src.combos || []).forEach(function (c) { if (BYID[c[0]] && BYID[c[1]]) COMBOS[c[0]] = c[1]; });
  }
  function open(opts) {
    opts = opts || {};
    if (!window.TOLPups) return;
    if (!ACTS.length) loadActs();
    if (!ACTS.length) return;
    build();
    if (isOpen) return;
    openerEl = opts.opener || document.activeElement;
    var now = new Date(); hour = opts.hour != null ? +opts.hour : now.getHours() + now.getMinutes() / 60;
    setting = pickSetting(opts.setting);
    ambient = []; parts = []; bubbles = []; outgoing = null; trick = null; comboLeft = 0; bgKey = ''; clock = 0; stats.maxOut = 0;
    var ph = phaseOf(hour); whereEl.textContent = 'Pal cam · ' + ph.charAt(0).toUpperCase() + ph.slice(1) + ' at ' + setting.name;
    ov.hidden = false; isOpen = true; document.documentElement.classList.add('pc-lock');
    resize();
    R = [renderDefaults(0), renderDefaults(1)];
    // they come running in from either side, then the first activity (a random one) begins
    R[0].x = cx() - span() + 4; R[1].x = cx() + span() - 4;
    var first = opts.act && BYID[opts.act] ? BYID[opts.act] : takeFromBag();
    if (opts.act && BYID[opts.act]) removeFromBag(opts.act);
    cur = null; mode = 'travel'; startTravel(first, {});
    renderTally(null);
    setPaused(false);
    ov.querySelector('.pc-x').focus();
    run();
  }
  function close() {
    if (!isOpen) return;
    isOpen = false; halt(); ov.hidden = true; document.documentElement.classList.remove('pc-lock');
    var o = openerEl; openerEl = null;
    if (o && o.focus && document.contains(o)) { try { o.focus({ preventScroll: true }); } catch (e) { o.focus(); } }
  }
  function next(surprise) {
    if (!isOpen) return;
    if (paused) setPaused(false);
    trick = null;
    var act = surprise ? takeFromBag(function (a) { return a.kind === 'surprising' || a.kind === 'cool'; }) : takeFromBag();
    if (surprise) { burst(cx(), 90, 16, 'confetti', { speed: 0.16, spread: 3 }); }
    comboLeft = 0; startTravel(act, { intro: surprise });
  }

  // ---------- hooking up the buttons ----------
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-palcam-open]');
    if (!b) return; e.preventDefault(); open({ opener: b });
  });

  // For testing and for the curious. Nothing is sent anywhere.
  window.TOLPalsCam = {
    open: open, close: close, next: function () { next(false); }, surprise: function () { next(true); }, trick: doTrick,
    isOpen: function () { return isOpen; },
    frames: function () { return frames.slice(); }, resetFrames: function () { frames.length = 0; },
    state: function () {
      var r = cv ? cv.getBoundingClientRect() : { left: 0, top: 0 };
      function toClient(x, y) { return [r.left + OX + x * K, r.top + OY + y * K]; }
      return {
        open: isOpen, mode: mode, act: cur ? cur.act.id : trav ? trav.act.id : null, t: cur ? cur.t : trav ? trav.t : 0, setting: setting.id, hour: hour, phase: phaseOf(hour),
        count: ACTS.length, stats: JSON.parse(JSON.stringify(stats)), particles: parts.length,
        stage: { l: toClient(0, 0)[0], t: toClient(0, 0)[1], r: toClient(LW, LH)[0], b: toClient(LW, LH)[1] },
        dogs: R.map(function (q) {
          var sc = S * q.scale, y = G + q.dy - q.lift, a = toClient(q.x - 42 * sc, y - 62 * sc), b = toClient(q.x + 42 * sc, y + 4);
          return { x: q.x, lift: q.lift, pose: q.pose, l: a[0], t: a[1], r: b[0], b: b[1] };
        })
      };
    },
    acts: function () { if (!ACTS.length) loadActs(); return ACTS.map(function (a) { return { id: a.id, name: a.name, kind: a.kind, time: a.time || 'any' }; }); },
    settings: SETTINGS.map(function (s) { return s.id; }),
    U: U, rnd: rnd
  };
})();
