/* your-music.js — "Visualize your own music" for the site's music visualizers (Brain Breakers on /soundscapes.html and Drift).
   Two ways in, both private:
     1. Use my microphone: the visualizer listens to the room, so it works with Spotify or any music app, on any device.
     2. Use sound from a tab or screen (desktop Chrome and Edge only): the browser asks which tab to share; the picture is
        dropped at once and only the sound is looked at, e.g. the Spotify Web Player tab with "Share tab audio" ticked.
   The sound is only measured, live, by a Web Audio analyser on this device to move the picture. It is never played back
   through the speakers, never recorded, saved or sent anywhere, and every track is stopped when you press Stop listening,
   change source, leave the page, or (for the microphone) switch away from the page.
   We can't connect to a Spotify account: Spotify's playback is protected, so no website can read the sound it plays.

   Use:  var mine = TOLYourMusic.create({ context: fn returning an AudioContext, onStart: fn(analyser, kind), onStop: fn(reason) });
         mine.ui(element, { compact: false })   // draws the buttons, the "Listening" note and the help; can be called for more than one place
         mine.stop('why') · mine.active() · mine.analyser() · mine.kind() */
(function () {
  'use strict';
  if (window.TOLYourMusic) return;

  var nav = navigator, md = nav.mediaDevices;
  var UA = nav.userAgent || '';
  var phone = /Android|iPhone|iPad|iPod|Mobile/i.test(UA) || (/Macintosh/.test(UA) && nav.maxTouchPoints > 1);
  var chromium = !!(nav.userAgentData && nav.userAgentData.brands && nav.userAgentData.brands.some(function (b) { return /Chromium|Google Chrome|Microsoft Edge/.test(b.brand); })) ||
    (/Chrome\/|Edg\//.test(UA) && !/Firefox|FxiOS|OPR\//.test(UA));
  var canMic = !!(md && typeof md.getUserMedia === 'function');
  // tab sound only comes through in desktop Chrome and Edge; Firefox and Safari share pictures without sound, phones can't share at all
  var canTab = !!(md && typeof md.getDisplayMedia === 'function') && !phone && chromium;

  var CSS = '.ym{margin:.6rem 0 0;text-align:left;color:#F2ECFA}' +
    '.ym-k{margin:0 0 .45rem;font:700 .78rem/1.4 "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase;color:#CFC3EE}' +
    '.ym-row{display:flex;flex-wrap:wrap;gap:.45rem}' +
    '.ym-b{font:inherit;font-size:.92rem;min-height:44px;padding:.35rem 1rem;border-radius:999px;border:1px solid rgba(255,255,255,.32);background:rgba(255,255,255,.1);color:#fff;cursor:pointer;display:inline-flex;align-items:center;gap:.4rem;max-width:100%;text-align:left;line-height:1.25}' +
    '.ym-b:hover{background:rgba(255,255,255,.18)}.ym-b:focus-visible{outline:3px solid #fff;outline-offset:2px}' +
    '.ym-b[aria-pressed="true"]{background:#FFD66B;border-color:#FFD66B;color:#3A1B52;font-weight:700}' +
    '.ym-b.ym-stop{background:#FFE3C8;border-color:#FFE3C8;color:#3A1B52;font-weight:700}' +
    '.ym-b[hidden],.ym-live[hidden]{display:none}' +
    '.ym-live{display:flex;align-items:center;gap:.5rem;margin:.55rem 0 0;padding:.35rem .8rem;border-radius:999px;background:rgba(159,232,192,.16);border:1px solid rgba(159,232,192,.45);color:#D9FBE8;font-size:.88rem;line-height:1.35;width:fit-content;max-width:100%}' +
    '.ym-dot{flex:none;width:.6rem;height:.6rem;border-radius:50%;background:#7EE2A8;box-shadow:0 0 0 3px rgba(126,226,168,.25)}' +
    '.ym-msg{margin:.45rem 0 0;min-height:1.2em;font-size:.88rem;line-height:1.5;color:#FFE3C8}' +
    '.ym-msg:empty{min-height:0;margin:0}' +
    '.ym-help{margin:.6rem 0 0;padding:.1rem .9rem;border-radius:16px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.05);font-size:.9rem;line-height:1.5}' +
    '.ym-help summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:600;color:#fff}' +
    '.ym-help summary:focus-visible{outline:3px solid #fff;outline-offset:2px;border-radius:8px}' +
    '.ym-help ol{margin:0 0 .6rem;padding-left:1.3rem}.ym-help li{margin:.2rem 0}.ym-help p{margin:0 0 .6rem;color:#E6DDF8}' +
    '.ym-help .ym-honest{color:#FFE3C8}';

  function addCss() {
    if (document.getElementById('ym-css')) return;
    var s = document.createElement('style'); s.id = 'ym-css'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s);
  }

  function create(opts) {
    opts = opts || {};
    var st = { kind: '', stream: null, src: null, gain: null, an: null, sink: null, lvlT: 0, asking: '', msg: '', views: [] };

    function render() {
      st.views.forEach(function (v) {
        var on = !!st.kind;
        v.mic.hidden = !canMic; v.tab.hidden = !canTab;
        v.mic.setAttribute('aria-pressed', String(st.kind === 'mic'));
        v.tab.setAttribute('aria-pressed', String(st.kind === 'tab'));
        v.mic.disabled = v.tab.disabled = !!st.asking;
        v.stop.hidden = !on;
        v.live.hidden = !on;
        if (v.liveTxt) v.liveTxt.textContent = st.kind === 'tab' ? 'Listening to the sound from the tab you shared. Nothing is recorded or sent.' : 'Listening to your music through the microphone. Nothing is recorded or sent.';
        if (v.msg.textContent !== st.msg) v.msg.textContent = st.msg;
      });
    }
    function tell(m) { st.msg = m || ''; render(); }

    function release() {
      clearInterval(st.lvlT); st.lvlT = 0;
      if (st.stream) st.stream.getTracks().forEach(function (t) { try { t.onended = null; t.stop(); } catch (e) {} });
      [st.src, st.gain, st.an, st.sink].forEach(function (n) { if (n) try { n.disconnect(); } catch (e) {} });
      st.stream = st.src = st.gain = st.an = st.sink = null;
    }
    function stop(reason, msg) {
      var was = st.kind;
      release(); st.kind = '';
      if (msg != null) st.msg = msg;
      else if (was) st.msg = reason === 'source' ? '' : 'Stopped listening. Nothing was recorded.';
      render();
      if (was && opts.onStop) try { opts.onStop(reason || 'stop'); } catch (e) {}
    }

    // the sound goes source → gain (keeps quiet rooms visible) → analyser → a silent gain → output.
    // The last gain is 0, so nothing is ever heard; it is there only because some browsers skip nodes that lead nowhere.
    function wire(stream, kind) {
      var ctx = opts.context && opts.context();
      if (!ctx) { stream.getTracks().forEach(function (t) { t.stop(); }); tell('This browser cannot read sound, so the visualizer cannot follow your music here.'); return false; }
      try { if (ctx.state === 'suspended') ctx.resume(); } catch (e) {}
      st.stream = stream; st.kind = kind;
      st.src = ctx.createMediaStreamSource(stream);
      st.gain = ctx.createGain(); st.gain.gain.value = kind === 'mic' ? 2.5 : 1;
      st.an = ctx.createAnalyser(); st.an.fftSize = 1024; st.an.smoothingTimeConstant = 0.82;
      st.sink = ctx.createGain(); st.sink.gain.value = 0;
      st.src.connect(st.gain); st.gain.connect(st.an); st.an.connect(st.sink); st.sink.connect(ctx.destination);
      // a slow automatic level, so soft music and loud music both move the picture
      var buf = new Uint8Array(st.an.fftSize), lo = kind === 'mic' ? 1 : 0.6, hi = kind === 'mic' ? 14 : 4;
      st.lvlT = setInterval(function () {
        if (!st.an) return;
        st.an.getByteTimeDomainData(buf);
        var pk = 0; for (var i = 0; i < buf.length; i += 4) { var d = Math.abs(buf[i] - 128); if (d > pk) pk = d; }
        var g = st.gain.gain.value, p = pk / 128;
        if (p > 0.85) g = g / 1.12; else if (p < 0.35 && p > 0.004) g = g * 1.05;
        st.gain.gain.value = Math.max(lo, Math.min(hi, g));
      }, 200);
      stream.getTracks().forEach(function (t) { t.onended = function () { if (st.stream === stream) stop('ended', kind === 'tab' ? 'Sharing stopped. Nothing was recorded.' : 'The microphone was turned off. Nothing was recorded.'); }; });
      tell('');
      if (opts.onStart) try { opts.onStart(st.an, kind); } catch (e) {}
      return true;
    }

    function failMsg(err, kind) {
      var n = err && err.name;
      if (kind === 'mic') {
        if (n === 'NotAllowedError' || n === 'SecurityError' || n === 'PermissionDeniedError') return 'The microphone wasn’t allowed, so nothing is being heard. If you want to try again, allow the microphone for this site in your browser (often the lock or settings icon next to the web address), then press Use my microphone.';
        if (n === 'NotFoundError' || n === 'DevicesNotFoundError' || n === 'OverconstrainedError') return 'No microphone was found on this device. You can still play one of the tracks here.';
        if (n === 'NotReadableError' || n === 'TrackStartError' || n === 'AbortError') return 'The microphone seems to be busy in another app. Close it there, then try again.';
        return 'The microphone couldn’t start in this browser. You can still play one of the tracks here.';
      }
      if (n === 'NotAllowedError' || n === 'AbortError') return 'Nothing was shared. When you are ready, press Use sound from a tab, choose the tab with your music, and tick Share tab audio.';
      return 'This browser couldn’t share a tab’s sound. Try Use my microphone instead.';
    }

    function startMic() {
      if (!canMic || st.asking) return;
      stop('source', '');
      st.asking = 'mic'; tell('Your browser will ask to use the microphone. It is only listened to here, never recorded.');
      md.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false }).then(function (stream) {
        st.asking = '';
        if (document.hidden) { stream.getTracks().forEach(function (t) { t.stop(); }); tell(''); return; }
        wire(stream, 'mic');
      }).catch(function (err) { st.asking = ''; tell(failMsg(err, 'mic')); });
    }

    function startTab() {
      if (!canTab || st.asking) return;
      stop('source', '');
      st.asking = 'tab'; tell('Choose the tab with your music (for Spotify, the Spotify Web Player tab) and tick Share tab audio.');
      var cc = null; try { if (typeof window.CaptureController === 'function') cc = new window.CaptureController(); } catch (e) { cc = null; }
      var o = { video: true, audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, suppressLocalAudioPlayback: false }, selfBrowserSurface: 'exclude', surfaceSwitching: 'include', systemAudio: 'include', preferCurrentTab: false };
      if (cc) o.controller = cc;
      md.getDisplayMedia(o).then(function (stream) {
        st.asking = '';
        // stay on this page instead of jumping to the shared tab, so you can watch
        if (cc && cc.setFocusBehavior) try { cc.setFocusBehavior('no-focus-change'); } catch (e) {}
        // the picture of the tab is never used: it is stopped straight away
        stream.getVideoTracks().forEach(function (t) { try { t.stop(); stream.removeTrack(t); } catch (e) {} });
        if (!stream.getAudioTracks().length) {
          stream.getTracks().forEach(function (t) { t.stop(); });
          tell('No sound came with that. Try again, choose a tab (not a window), and make sure Share tab audio is ticked.');
          return;
        }
        wire(stream, 'tab');
      }).catch(function (err) { st.asking = ''; tell(failMsg(err, 'tab')); });
    }

    function ui(el, uo) {
      if (!el) return;
      uo = uo || {};
      addCss();
      el.classList.add('ym');
      var help = uo.compact ? '' :
        '<details class="ym-help"><summary>Using Spotify or another app?</summary>' +
        '<ol><li>Start your music first: on this device, or on a phone or speaker nearby.</li>' +
        (canMic ? '<li><strong>Any device:</strong> choose Use my microphone. Turn the music up a little and keep this device near the speaker.</li>' : '') +
        '<li><strong>On a computer (Chrome or Edge):</strong> play your music in the Spotify Web Player (open.spotify.com) or another tab. Choose Use sound from a tab, pick that tab, and tick <em>Share tab audio</em>.</li></ol>' +
        '<p class="ym-honest">We can’t connect to your Spotify account directly: Spotify doesn’t let websites read the sound it plays. These two ways work with any music app.</p>' +
        '<p>The sound is only measured, live, on this device to move the picture. It is never recorded, saved or sent. The microphone turns off when you press Stop listening or leave this page. On some phones, music from the same phone goes quiet while the microphone is on; if that happens, play it on another device nearby.</p>' +
        '</details>';
      el.innerHTML = (uo.title === false ? '' : '<p class="ym-k">' + (uo.title || 'Or visualize your own music') + '</p>') +
        '<div class="ym-row" role="group" aria-label="Your own music">' +
        '<button type="button" class="ym-b" data-ym="mic" aria-pressed="false"><span aria-hidden="true">&#127908;</span> Use my microphone</button>' +
        '<button type="button" class="ym-b" data-ym="tab" aria-pressed="false"><span aria-hidden="true">&#128421;&#65039;</span> Use sound from a tab</button>' +
        '<button type="button" class="ym-b ym-stop" data-ym="stop" hidden><span aria-hidden="true">&#9632;</span> Stop listening</button>' +
        '</div>' +
        '<p class="ym-live" hidden><span class="ym-dot" aria-hidden="true"></span><span class="ym-live-t"></span></p>' +
        '<p class="ym-msg" role="status" aria-live="polite"></p>' +
        (!canMic && !canTab ? '<p class="ym-msg">This browser can’t listen to sound from a microphone or a tab, so you can enjoy the tracks here instead.</p>' : '') +
        help;
      el.querySelectorAll('p, li, summary, details, strong, em, span, ol').forEach(function (n) { n.classList.add('no-bubble'); });
      var v = { el: el, mic: el.querySelector('[data-ym="mic"]'), tab: el.querySelector('[data-ym="tab"]'), stop: el.querySelector('[data-ym="stop"]'), live: el.querySelector('.ym-live'), liveTxt: el.querySelector('.ym-live-t'), msg: el.querySelector('.ym-msg') };
      v.mic.addEventListener('click', function () { if (st.kind === 'mic') return; if (opts.beforeStart) opts.beforeStart('mic'); startMic(); });
      v.tab.addEventListener('click', function () { if (st.kind === 'tab') return; if (opts.beforeStart) opts.beforeStart('tab'); startTab(); });
      v.stop.addEventListener('click', function () { stop('stop'); });
      st.views.push(v); render();
      return v;
    }

    // leaving the page always lets go of everything
    window.addEventListener('pagehide', function () { stop('pagehide', ''); });
    // the microphone stops when you switch away. A shared tab keeps going (the browser shows its own "sharing" bar with a Stop button),
    // because you need to visit that tab to change the song.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && st.kind === 'mic') stop('hidden', 'The microphone turned off when you left the page. Nothing was recorded. Press Use my microphone to start again.');
    });

    return {
      ui: ui, stop: stop, startMic: startMic, startTab: startTab,
      active: function () { return !!st.kind; }, kind: function () { return st.kind; },
      analyser: function () { return st.an; },
      tracks: function () { return st.stream ? st.stream.getTracks().map(function (t) { return { kind: t.kind, state: t.readyState }; }) : []; }
    };
  }

  window.TOLYourMusic = { create: create, canMic: canMic, canTab: canTab };
})();
