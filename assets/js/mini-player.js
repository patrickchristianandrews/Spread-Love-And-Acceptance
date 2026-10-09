/* mini-player.js — "Calm sounds": a small player of the site's own calm tracks, right beside a calm
   tool or a chapter. Put <div data-mini-player="Calm sounds while you read"></div> on a page and include
   this script (the attribute's text is the player's heading). It mounts itself on DOMContentLoaded;
   other scripts can call window.TOLMiniPlayer.mount(el) for a player they add later.
   - nothing is downloaded until someone presses play, and it never plays on its own
   - play/pause, next track, volume, repeat, and a link to the full player (/soundscapes.html)
   - remembers the last track and volume in this browser only (and works without storage)
   - Quiet mode pauses it; another sound on the page starting (a video, the full player) pauses it too
   - one sound for the whole page: every player on a page drives the same track */
(function () {
  'use strict';
  if (window.TOLMiniPlayer) return;

  var BASE = '/assets/audio/soundscapes/';
  var TRACKS = [
    { id: 'star', title: 'Shooting Star', note: 'Soft and floating, the calmest', len: '3:27', src: BASE + 'Shooting-Star.mp3' },
    { id: 'beneath', title: 'The Breath Beneath', note: 'Slow, deep and low', len: '2:55', src: BASE + 'The-Breath-Beneath.mp3' }
  ];
  var K_TRACK = 'tol-mini-track', K_VOL = 'tol-mini-vol', K_LOOP = 'tol-mini-loop';
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var idx = 0;
  (function () { var t = lsGet(K_TRACK); for (var i = 0; i < TRACKS.length; i++) if (TRACKS[i].id === t) idx = i; })();
  var vol = parseFloat(lsGet(K_VOL)); if (!(vol >= 0 && vol <= 1)) vol = 0.6;
  var loop = lsGet(K_LOOP) === '1';
  var audio = null, uis = [], startedAt = -1, msg = '';

  function quietOn() { try { return !!(window.TOLQuiet && window.TOLQuiet.on()); } catch (e) { return false; } }
  function playing() { return !!(audio && !audio.paused && !audio.ended); }

  // the audio element is made on the first press of play, not before
  function ensureAudio(host) {
    if (audio) return audio;
    audio = document.createElement('audio');
    audio.className = 'tol-mp-audio';
    audio.preload = 'none';
    audio.setAttribute('playsinline', '');
    audio.hidden = true;
    audio.volume = vol;
    audio.loop = loop;
    audio.addEventListener('play', render);
    audio.addEventListener('pause', render);
    audio.addEventListener('waiting', function () { say('Loading…'); });
    audio.addEventListener('playing', function () { say('Playing ' + TRACKS[idx].title + '.'); });
    audio.addEventListener('error', function () { say('This track could not be played here. Try the full player.'); render(); });
    audio.addEventListener('ended', function () {
      if (audio.loop) return;
      // on to the next one; stop once the list has come back round to where it started
      var n = (idx + 1) % TRACKS.length;
      if (n === startedAt) { say('Finished.'); setTrack(n, false); return; }
      setTrack(n, true);
    });
    (host || document.body).appendChild(audio);
    return audio;
  }
  function setTrack(i, andPlay) {
    idx = (i + TRACKS.length) % TRACKS.length;
    lsSet(K_TRACK, TRACKS[idx].id);
    if (audio) {
      var was = andPlay;
      audio.pause();
      audio.src = TRACKS[idx].src;
      if (was) start();
    }
    render();
  }
  function start(host) {
    ensureAudio(host);
    if (!audio.getAttribute('src')) audio.src = TRACKS[idx].src;
    if (startedAt < 0) startedAt = idx;
    var p = audio.play();
    if (p && p.catch) p.catch(function (e) { if (!e || e.name !== 'AbortError') { say('Press play again to start the sound.'); render(); } });
    render();
  }
  function pause(why) { if (audio) audio.pause(); startedAt = -1; if (why) say(why); render(); }
  function toggle(host) { if (playing()) pause('Paused.'); else start(host); }

  function say(t) { msg = t; uis.forEach(function (u) { u.status.textContent = t; }); }

  var ICON = {
    play: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z" fill="currentColor"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M5 6v12l9-6zM15.5 6H18v12h-2.5z" fill="currentColor"/></svg>',
    loop: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M17 4l3 3-3 3M20 7H8a4 4 0 0 0-4 4v1M7 20l-3-3 3-3M4 17h12a4 4 0 0 0 4-4v-1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  function render() {
    var on = playing(), t = TRACKS[idx];
    uis.forEach(function (u) {
      u.root.classList.toggle('is-playing', on);
      u.play.innerHTML = on ? ICON.pause : ICON.play;
      u.play.setAttribute('aria-label', on ? 'Pause ' + t.title : 'Play ' + t.title);
      u.play.setAttribute('aria-pressed', String(on));
      u.title.textContent = t.title;
      u.note.textContent = t.note + ' · ' + t.len;
      u.loop.setAttribute('aria-pressed', String(loop));
      if (+u.vol.value !== Math.round(vol * 100)) u.vol.value = Math.round(vol * 100);
    });
  }

  var n = 0;
  function mount(el, opts) {
    if (!el || el.nodeType !== 1 || el.__tolMp) return null;
    el.__tolMp = true;
    opts = opts || {};
    var label = opts.label || el.getAttribute('data-mini-player') || 'Calm sounds';
    var id = 'tol-mp-' + (++n);
    el.classList.add('tol-mp', 'no-bubble', 'no-cheer', 'no-listen');
    el.setAttribute('role', 'group');
    el.setAttribute('aria-labelledby', id + '-h');
    el.innerHTML =
      '<p class="tol-mp-h no-bubble" id="' + id + '-h"><span class="tol-mp-wave" aria-hidden="true"><i></i><i></i><i></i></span>' + esc(label) + '</p>' +
      '<div class="tol-mp-row">' +
        '<button type="button" class="tol-mp-play" aria-pressed="false"></button>' +
        '<p class="tol-mp-now no-bubble"><span class="tol-mp-t"></span><span class="tol-mp-n"></span></p>' +
        '<button type="button" class="tol-mp-next" aria-label="Next calm track">' + ICON.next + '</button>' +
      '</div>' +
      '<div class="tol-mp-row2">' +
        '<label class="tol-mp-vol"><span>Volume</span><input type="range" min="0" max="100" step="5" aria-label="Volume"></label>' +
        '<button type="button" class="tol-mp-loop" aria-pressed="false">' + ICON.loop + '<span>Repeat</span></button>' +
        '<a class="tol-mp-full" href="/soundscapes.html">Open the full player</a>' +
      '</div>' +
      '<p class="tol-mp-status sr-only no-bubble" role="status" aria-live="polite"></p>';
    var u = {
      root: el, play: el.querySelector('.tol-mp-play'), next: el.querySelector('.tol-mp-next'), loop: el.querySelector('.tol-mp-loop'),
      vol: el.querySelector('.tol-mp-vol input'), title: el.querySelector('.tol-mp-t'), note: el.querySelector('.tol-mp-n'), status: el.querySelector('.tol-mp-status')
    };
    u.play.addEventListener('click', function () { toggle(el); });
    u.next.addEventListener('click', function () {
      var go = playing();
      startedAt = -1;
      setTrack(idx + 1, go);
      if (!go) say('Next up: ' + TRACKS[idx].title + '. Press play to listen.');
    });
    u.loop.addEventListener('click', function () {
      loop = !loop; lsSet(K_LOOP, loop ? '1' : '0');
      if (audio) audio.loop = loop;
      say(loop ? 'Repeat is on: this track plays again and again.' : 'Repeat is off.');
      render();
    });
    u.vol.addEventListener('input', function () {
      vol = Math.max(0, Math.min(1, (+u.vol.value || 0) / 100));
      if (audio) audio.volume = vol;
      lsSet(K_VOL, String(vol));
      uis.forEach(function (o) { if (o !== u) o.vol.value = Math.round(vol * 100); });
    });
    uis.push(u);
    if (msg) u.status.textContent = msg;
    render();
    return el;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function mountAll(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('[data-mini-player]'), function (el) { mount(el); });
  }

  // Quiet mode turned on: the sound stops
  document.addEventListener('tol-quiet', function () { if (quietOn() && playing()) pause('Paused for Quiet mode.'); });
  // another sound on the page started (the full player, a video): this one steps aside
  document.addEventListener('play', function (e) { if (audio && e.target !== audio && playing()) pause(); }, true);
  // the read-aloud voice and calm music can share the page, but keep the music soft while it reads
  window.addEventListener('pagehide', function () { if (audio) audio.pause(); });

  // the stylesheet, if the page didn't link it itself
  function ensureCss() {
    if (document.querySelector('link[href*="mini-player.css"]')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/assets/css/mini-player.css'; document.head.appendChild(l);
  }

  window.TOLMiniPlayer = {
    mount: function (el, opts) { ensureCss(); return mount(el, opts); },
    mountAll: function (root) { ensureCss(); mountAll(root); },
    play: function () { start(); }, pause: function () { pause(); },
    audio: function () { return audio; }, tracks: TRACKS.map(function (t) { return { id: t.id, title: t.title, src: t.src }; })
  };
  function boot() { if (document.querySelector('[data-mini-player]')) { ensureCss(); mountAll(); } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
