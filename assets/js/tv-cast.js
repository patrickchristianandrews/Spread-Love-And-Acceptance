/* tv-cast.js — "Watch on your TV" for the Frequency Buddies videos.

   The episode player draws the cartoon live on a canvas, and a canvas isn't a video file, so a TV has
   nothing to fetch. Every video that also exists as an MP4 can be sent to a TV instead:
   - Chrome on a computer or an Android phone: the Google Cast sender (loaded only when the button is first
     pressed) and Google's Default Media Receiver, which plays the MP4 itself, from the same moment;
   - Safari on an iPhone, iPad or Mac: AirPlay, through a hidden <video> holding the MP4;
   - other browsers with Remote Playback: the browser's own "play on a device" picker;
   - anything else: a short note on what works.
   Used by buddies-player.js (episodes), buddies-trailer.js (the Season 1 trailer) and
   buddies-music-video.js. Nothing is stored and nothing is sent anywhere except the video address,
   to the TV you pick. Window API: TOLCast.button(opts) -> { btn, msg, refresh() }. */
(function () {
  'use strict';
  if (window.TOLCast) return;
  var SDK = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
  var UA = navigator.userAgent || '';
  var IOS = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var AIRPLAY = !!window.WebKitPlaybackTargetAvailabilityEvent;
  var CHROME = !!window.chrome && /(Chrome|Chromium)\/\d/.test(UA) && !IOS && !AIRPLAY;
  var REMOTE = typeof HTMLMediaElement !== 'undefined' && 'remote' in HTMLMediaElement.prototype;

  var WORKS = 'To watch on a TV, use Chrome on a computer or an Android phone on the same Wi-Fi as a Chromecast or Google TV, use AirPlay from an iPhone, iPad or Mac, or mirror your screen to any TV.';
  var MSG = {
    none: 'This browser can’t send the video to a TV. ' + WORKS,
    novideo: 'This episode is drawn live in your browser, so there’s no video file to send to a TV yet. Screen mirroring works for any TV: mirror your phone, tablet or computer, then press Play.',
    looking: 'Looking for your TV…',
    again: 'Ready. Press Watch on your TV again and pick your TV.',
    nodev: 'No Chromecast or Google TV was found. Check that this device and the TV are on the same Wi-Fi, then try again.',
    cancel: 'No TV was picked. Press Watch on your TV to try again.',
    noanswer: 'The TV didn’t answer. Try again in a minute.',
    sending: 'Sending the video to your TV…',
    failed: 'The TV couldn’t start the video. Try again in a minute.',
    airplay: 'Playing on your TV with AirPlay. Pause it from the TV, Control Center or the button here.',
    remote: 'Playing on your TV. Pause it from the TV or the button here.'
  };

  function css() {
    if (document.querySelector('style[data-tv-cast]')) return;
    var st = document.createElement('style'); st.setAttribute('data-tv-cast', '');
    st.textContent = '.tvc-msg{margin:0;padding:.5rem .75rem;border-radius:12px;background:rgba(255,255,255,.1);font-size:.9rem;line-height:1.45;text-align:left}.tvc-msg:empty{display:none}' +
      '.tvc-msg .tvc-row{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.45rem}' +
      '.tvc-v{position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:0;pointer-events:none}';
    document.head.appendChild(st);
  }
  function abs(u) { try { return new URL(u, location.href).href; } catch (e) { return u; } }

  // ---------- the Google Cast sender: loaded once, on the first press ----------
  var GC = { state: 'idle', waiters: [], ctx: null };
  function castLoad(cb) {
    if (GC.state === 'ready') { cb(true); return; }
    if (GC.state === 'failed') { cb(false); return; }
    GC.waiters.push(cb);
    if (GC.state === 'loading') return;
    GC.state = 'loading';
    var done = function (ok) {
      if (GC.state !== 'loading') return;
      GC.state = ok ? 'ready' : 'failed'; clearTimeout(GC.t);
      var w = GC.waiters; GC.waiters = []; w.forEach(function (f) { try { f(ok); } catch (e) {} });
    };
    var prev = window.__onGCastApiAvailable;
    window.__onGCastApiAvailable = function (ok) {
      if (typeof prev === 'function') try { prev(ok); } catch (e) {}
      if (!ok || !window.cast || !cast.framework || !window.chrome || !chrome.cast) { done(false); return; }
      try {
        GC.ctx = cast.framework.CastContext.getInstance();
        GC.ctx.setOptions({ receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID, autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED });
        done(true);
      } catch (e) { done(false); }
    };
    GC.t = setTimeout(function () { done(false); }, 9000);
    try { var sc = document.createElement('script'); sc.src = SDK; sc.async = true; sc.onerror = function () { done(false); }; document.head.appendChild(sc); } catch (e) { done(false); }
  }
  function mediaInfo(m) {
    var url = abs(m.url), mi = new chrome.cast.media.MediaInfo(url, 'video/mp4');
    mi.contentUrl = url; mi.streamType = chrome.cast.media.StreamType.BUFFERED;
    mi.metadata = new chrome.cast.media.GenericMediaMetadata();
    mi.metadata.title = m.title || 'Frequency Buddies'; if (m.subtitle) mi.metadata.subtitle = m.subtitle;
    if (m.poster) mi.metadata.images = [new chrome.cast.Image(abs(m.poster))];
    return mi;
  }

  function button(o) {
    css();
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = (o.className || '') + ' tvc-b';
    btn.innerHTML = '📺<span class="tvc-lbl"> Watch on your TV</span>'; btn.setAttribute('aria-label', 'Watch on your TV'); btn.title = 'Send this video to a Chromecast, Google TV or AirPlay TV';
    var msg = document.createElement('p'); msg.className = (o.msgClass || '') + ' tvc-msg'; msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
    var vid = null, lastUrl = '';
    function say(t, extra) { msg.textContent = t || ''; if (extra) msg.appendChild(extra); }
    function row(btns) { var r = document.createElement('span'); r.className = 'tvc-row'; btns.forEach(function (b) { r.appendChild(b); }); return r; }
    function mkBtn(label, fn) { var b = document.createElement('button'); b.type = 'button'; b.className = o.smallClass || o.className || ''; b.textContent = label; b.addEventListener('click', fn); return b; }
    function media() { try { return o.getMedia ? o.getMedia() : null; } catch (e) { return null; } }
    function casting(how) { try { if (o.onCasting) o.onCasting(how); } catch (e) {} }

    // a hidden <video> with the MP4, for AirPlay and Remote Playback (made ahead of time, so the picker
    // can open straight from the tap)
    function video(m) {
      if (!vid) {
        vid = document.createElement('video'); vid.className = 'tvc-v'; vid.setAttribute('playsinline', ''); vid.setAttribute('x-webkit-airplay', 'allow');
        vid.setAttribute('aria-hidden', 'true'); vid.setAttribute('tabindex', '-1'); vid.preload = AIRPLAY ? 'metadata' : 'none';
        document.body.appendChild(vid);
      }
      if (m && m.url && m.url !== lastUrl) { lastUrl = m.url; vid.src = m.url; if (m.poster) vid.poster = m.poster; }
      return vid;
    }
    function startAt(v, pos) {
      var go = function () { try { if (pos > 1 && isFinite(v.duration)) v.currentTime = Math.min(pos, Math.max(0, v.duration - 2)); } catch (e) {} var p = v.play(); if (p && p.catch) p.catch(function () {}); };
      if (v.readyState >= 1) go(); else { v.addEventListener('loadedmetadata', go, { once: true }); try { v.load(); } catch (e) {} }
    }
    function stopBtn(v) { return row([mkBtn('⏸ Pause on the TV', function () { try { if (v.paused) { v.play(); this.textContent = '⏸ Pause on the TV'; } else { v.pause(); this.textContent = '▶ Play on the TV'; } } catch (e) {} })]); }

    function airplay(m) {
      var v = video(m);
      if (!v.webkitShowPlaybackTargetPicker) { say(MSG.none); return; }
      if (!v.__tvc) {
        v.__tvc = 1;
        v.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', function () {
          if (v.webkitCurrentPlaybackTargetIsWireless) { var mm = media(); startAt(v, mm ? mm.position || 0 : 0); casting('airplay'); say(MSG.airplay, stopBtn(v)); }
          else { try { v.pause(); } catch (e) {} say(''); }
        });
      }
      if (v.webkitCurrentPlaybackTargetIsWireless) { startAt(v, m.position || 0); casting('airplay'); say(MSG.airplay, stopBtn(v)); return; } // already on the TV: just send this one
      try { v.webkitShowPlaybackTargetPicker(); } catch (e) { say(MSG.none); }
    }
    function remote(m) {
      var v = video(m);
      if (!v.__tvcr) {
        v.__tvcr = 1;
        try {
          v.remote.addEventListener('connect', function () { var mm = media(); startAt(v, mm ? mm.position || 0 : 0); casting('remote'); say(MSG.remote, stopBtn(v)); });
          v.remote.addEventListener('disconnect', function () { try { v.pause(); } catch (e) {} });
        } catch (e) {}
      }
      try {
        var p = v.remote.prompt();
        if (p && p.catch) p.catch(function (e) { say(e && e.name === 'NotAllowedError' && /cancel|dismiss/i.test(e.message || '') ? MSG.cancel : MSG.none); });
      } catch (e) { say(MSG.none); }
    }

    // ---------- Chromecast ----------
    function send(ses, m) {
      if (!ses || !m) { say(MSG.failed); return; }
      say(MSG.sending);
      try {
        var req = new chrome.cast.media.LoadRequest(mediaInfo(m)); req.autoplay = true; req.currentTime = Math.max(0, m.position || 0);
        var pr = ses.loadMedia(req), ok = function () {
          var name = ''; try { name = ses.getCastDevice().friendlyName; } catch (e) {}
          casting('cast');
          var rest = []; try { rest = o.getQueue ? o.getQueue() || [] : []; } catch (e) {}
          var extra = rest.length ? row([mkBtn(o.queueLabel ? o.queueLabel(rest) : 'Then play the rest of the season', function () { queue(ses, rest, this); })]) : null;
          say('Playing on ' + (name || 'your TV') + '. You can close this page, and the TV keeps playing.' + (rest.length ? ' Want the next episodes too?' : ''), extra);
        };
        if (pr && pr.then) pr.then(ok, function () { say(MSG.failed); }); else ok();
      } catch (e) { say(MSG.failed); }
    }
    function queue(ses, rest, b) {
      if (b) b.disabled = true;
      var items = rest.map(function (m) { var it = new chrome.cast.media.QueueItem(mediaInfo(m)); it.autoplay = true; return it; });
      var done = function () { say('Added ' + rest.length + ' more episode' + (rest.length === 1 ? '' : 's') + '. They play one after another on your TV.'); };
      var redo = function () { // a receiver that won't add to its list: start the list again, from the same moment
        try {
          var ms = ses.getMediaSession(), cur = null, at = 0;
          try { cur = ms.media; at = ms.getEstimatedTime(); } catch (e) {}
          var first = new chrome.cast.media.QueueItem(cur || mediaInfo(media())); first.autoplay = true; first.startTime = at || 0;
          var q = new chrome.cast.media.QueueLoadRequest([first].concat(items));
          ses.getSessionObj().queueLoad(q, done, function () { say(MSG.failed); });
        } catch (e) { say(MSG.failed); }
      };
      try {
        var ms = ses.getMediaSession(); if (!ms || !ms.queueInsertItems) { redo(); return; }
        ms.queueInsertItems(new chrome.cast.media.QueueInsertItemsRequest(items), done, redo);
      } catch (e) { redo(); }
    }
    function castNow() {
      var m = media(); if (!m) { say(MSG.novideo); return; }
      var ctx = GC.ctx, ses = ctx.getCurrentSession();
      if (ses) { send(ses, m); return; }
      try { if (ctx.getCastState() === cast.framework.CastState.NO_DEVICES_AVAILABLE) say(MSG.nodev); } catch (e) {}
      var p;
      try { p = ctx.requestSession(); } catch (e) { say(MSG.noanswer); return; }
      var after = function (err) {
        if (err) { say(err === 'cancel' ? MSG.cancel : err === 'receiver_unavailable' ? MSG.nodev : MSG.noanswer); return; }
        send(ctx.getCurrentSession(), media());
      };
      if (p && p.then) p.then(function (e) { after(e || null); }, function (e) { after(e || 'error'); });
    }

    btn.addEventListener('click', function () {
      var m = media();
      if (!m) { say(MSG.novideo); return; }
      if (AIRPLAY) { airplay(m); return; }
      if (CHROME) {
        if (GC.state === 'ready') { castNow(); return; }
        var t0 = Date.now(); say(MSG.looking);
        castLoad(function (ok) {
          if (!ok) { say(MSG.none); return; }
          if (Date.now() - t0 < 4500) castNow(); else say(MSG.again); // the browser only opens the TV list right after a tap
        });
        return;
      }
      if (REMOTE) { remote(m); return; }
      say(MSG.none);
    });
    function refresh() { var m = media(); if ((AIRPLAY || (!CHROME && REMOTE)) && m) video(m); if (!m && o.hideWithout) btn.hidden = true; else btn.hidden = false; say(''); }
    if (AIRPLAY) { var m0 = media(); if (m0) video(m0); }
    return { btn: btn, msg: msg, refresh: refresh, say: say };
  }

  window.TOLCast = { button: button, kind: AIRPLAY ? 'airplay' : CHROME ? 'cast' : REMOTE ? 'remote' : 'none', messages: MSG };
})();
