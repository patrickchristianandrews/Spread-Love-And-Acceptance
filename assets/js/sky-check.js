/* sky-check.js: the quick mode of "How am I right now?": four taps on the Nervous System Ladder.
   One copy of the check, used in two places:
     /ladder.html                     the quick check's own page (with the rungs, words to say and "If you feel afraid")
     /quick-checks.html?mode=sky      the "Quick: 4 taps" mode next to the full forecast (Today's Weather)
   Put <div data-sky-check></div> on the page and load this file. Options, as attributes on that div:
     data-more-href="/quick-checks.html"   "Add the rest of today's weather" is a link there (?mode=full&sky=…)
     (no data-more-href)                   the button fires a "tol-sky-more" event on the div instead, with
                                           detail { rung, sky, solo }, so the page can switch modes itself
   Everything happens on this device and nothing is kept: only the rung goes into a shared link (#rung=calm|revved|empty),
   and "?solo=1" or "#solo" starts on the "mostly on my own" wording. Same three words as the Weather:
   calm and connected = Clear, revved up = Gusty, running on empty = Fogged in. */
(function () {
  'use strict';

  var CSS = [
    '.ld-tool{ margin:1rem 0 1.5rem; }',
    '.ld-q{ border:1px solid var(--line); border-radius:14px; background:var(--paper); padding:.9rem 1rem 1rem; margin:0 0 .9rem; min-width:0; }',
    '.ld-q legend{ font:600 1.08rem/1.35 "Fraunces", Georgia, serif; padding:0 .3rem; }',
    '.ld-q .ld-n{ display:block; font:500 .78rem/1.2 "IBM Plex Mono", monospace; color:var(--ink-soft); margin:.2rem 0 .5rem; }',
    '.ld-opts{ display:grid; gap:.5rem; }',
    '.ld-opt{ display:block; width:100%; text-align:left; font:1.02rem/1.4 "Lora", Georgia, serif; min-height:52px; box-sizing:border-box; padding:.65rem 1rem; border-radius:12px; border:1px solid var(--line); background:var(--paper-deep, var(--paper)); color:var(--ink); cursor:pointer; }',
    '.ld-opt:hover{ border-color:var(--credit); }',
    '.ld-opt[aria-pressed="true"]{ border:2px solid var(--credit); background:var(--paper); font-weight:600; }',
    '.ld-opt[aria-pressed="true"]::before{ content:"\\2713  "; color:var(--credit); }',
    '.ld-opt:focus-visible, .ld-btn:focus-visible{ outline:3px solid var(--focus); outline-offset:2px; }',
    '.ld-hint{ color:var(--ink-soft); font-size:.95rem; }',
    '.ld-btn{ font:600 1rem/1.2 "Lora", Georgia, serif; min-height:48px; padding:.5rem 1.2rem; border-radius:999px; border:1px solid var(--ink); background:transparent; color:var(--ink); cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; box-sizing:border-box; }',
    '.ld-btn.is-main{ background:var(--ink); color:var(--paper); }',
    '.ld-acts{ display:flex; flex-wrap:wrap; gap:.5rem; margin:.8rem 0 .3rem; }',
    '.ld-result{ border:2px solid var(--credit); border-radius:16px; background:var(--paper); padding:1.1rem 1.1rem 1.2rem; margin:1.2rem 0 1.5rem; scroll-margin-top:80px; }',
    '.ld-result h2{ margin-top:0 !important; }',
    '.ld-shared{ margin:0 0 .8rem; padding:.6rem .8rem; border-radius:10px; background:var(--paper-deep, var(--paper)); font-size:.98rem; }',
    '.ld-rungs{ display:flex; flex-direction:column; gap:.35rem; margin:.4rem 0 1rem; padding:0; list-style:none; }',
    '.ld-rungs li{ margin:0 !important; max-width:none !important; padding:.5rem .8rem; border-radius:10px; border:1px dashed var(--line); color:var(--ink-soft); font-size:.98rem; }',
    '.ld-rungs li.is-here{ border:2px solid var(--credit); color:var(--ink); font-weight:600; background:var(--paper-deep, var(--paper)); }',
    '.ld-rungs li.is-here::after{ content:"  \\2190  you, right now"; font-weight:400; color:var(--credit); }',
    '.ld-result h3{ font-size:1.1rem; margin:1.2rem 0 .4rem; }',
    '.ld-result ol{ padding-left:1.3rem; margin:.3rem 0 .8rem; }',
    '.ld-result ol li{ margin:.35rem 0; }',
    '.ld-line{ display:flex; flex-wrap:wrap; align-items:center; gap:.4rem .6rem; margin:.4rem 0; padding:.3rem 0 .3rem .9rem; border-left:3px solid var(--credit); }',
    '.ld-line q{ quotes:none; font-style:italic; flex:1 1 14rem; }',
    '.ld-small{ font-size:.95rem; color:var(--ink-soft); }',
    '.ld-status{ min-height:1.4em; margin:.3rem 0 !important; font-size:.95rem; color:var(--ink-soft); }',
    '.ld-share{ margin-top:1.2rem; padding-top:.9rem; border-top:1px solid var(--line); }',
    '.ld-share canvas{ display:block; width:100%; max-width:360px; height:auto; border-radius:12px; border:1px solid var(--line); margin:.5rem 0; }',
    '.ld-more{ margin-top:1.1rem; padding:.8rem .95rem; border-radius:12px; background:var(--paper-deep, var(--paper)); }',
    '.ld-more p{ margin:.2rem 0 .5rem !important; }',
    '.ld-mp{ margin:.6rem 0; }',
    '.ld-mp:empty{ display:none; }',
    '@media print{ .ld-acts, .ld-share, .ld-mp, .ld-more{ display:none !important; } }',
    '.ld-who{ display:flex; flex-wrap:wrap; align-items:center; gap:.4rem .5rem; margin:.4rem 0 .2rem !important; font-size:.95rem; }',
    '.ld-chip{ font:600 .95rem/1.2 "Lora", Georgia, serif; min-height:44px; padding:.4rem .95rem; border-radius:999px; border:1px solid var(--line); background:var(--paper); color:var(--ink); cursor:pointer; }',
    '.ld-chip[aria-pressed="true"]{ border:2px solid var(--credit); font-weight:700; }',
    '.ld-chip:focus-visible{ outline:3px solid var(--focus); outline-offset:2px; }'
  ].join('\n');

  var QS = [
    ['body', 'How does your body feel right now?', ['Breathing is easy, shoulders are loose', 'Heart is quick, jaw or shoulders tight, hard to sit still', 'Heavy, tired or flat, a bit far away']],
    ['thoughts', 'What are your thoughts like?', ['Clear enough. I can think it through', 'Racing. Small things feel urgent or personal', 'Foggy. Words are hard to find']],
    ['urge', 'What do you feel like doing?', ['Talking, or just getting on with things', 'Snapping back, arguing, or fixing it right now', 'Going quiet, hiding away or lying down']],
    ['hear', 'If someone said something hard to you now…', ['I could probably hear it without getting defensive', 'I’d probably bite back or defend myself', 'I’d probably go blank or switch off']]
  ];
  var ORDER = ['calm', 'revved', 'empty'];
  var SKY_OF = { calm: 'clear', revved: 'gusty', empty: 'fog' };

  var R = {
    calm: {
      name: 'Calm and connected', sky: 'Clear',
      what: 'Breathing is easy, and you can hear something hard without getting defensive. Calm doesn’t mean happy: you can be calm and sad, or calm and firm.',
      helps: ['If there’s a talk you’ve been putting off, this is a good window. Keep it to one topic.', 'Try your opening line in the <a href="/signal-translator.html">Chat analyzer</a> before you say it.', 'Notice what helped you get here today (sleep, food, a walk), so you can do more of it.'],
      pause: 'I’m in a decent place to talk. Is now good for you?',
      when: 'Now is a decent time, if the other person is ready too. Ask first, and keep it to one topic.',
      short: 'A good time to talk, if they are ready too.'
    },
    revved: {
      name: 'Revved up', sky: 'Gusty',
      what: 'You feel tense and fast. Your heart is quicker and thoughts move fast, so small things feel urgent or personal. Your pace speeds up and your tone can get sharper, even when you don’t mean it to.',
      helps: ['Breathe out slowly, longer than you breathe in, for one minute. The breathing pacer counts it for you.', 'Move: a short walk, the stairs, or a physical job like the dishes.', 'Write the thing down instead of saying it or sending it. Read it again later.'],
      pause: 'I’m revved up right now, and it isn’t about you. Give me twenty minutes and I’ll come back to this.',
      when: 'In about twenty minutes, once your breathing and heartbeat have slowed. Say a time and keep it. Leave big decisions, money and “you always” sentences for another day.',
      short: 'Settle first. Come back in about twenty minutes.'
    },
    empty: {
      name: 'Running on empty', sky: 'Fogged in',
      what: 'You feel tired and flat, and words are harder to find. Replies get slower and shorter, which the other person may read as not caring. Here it just means ordinary, everyday tiredness.',
      helps: ['Look after the basics first: water, something to eat, warmth, or a lie-down.', 'Do one small, finishable thing, or nothing at all for a while.', 'Tell someone a time rather than a reason: “Can we pick this up tomorrow?”'],
      pause: 'I’m running low right now. It’s not about you. Can we talk after I’ve rested?',
      when: 'Another time is kinder: after rest or food, often tomorrow. Name when, so the other person isn’t left guessing.',
      short: 'Rest first. Talk another time, and say when.'
    }
  };
  // a day mostly on your own: the same rungs, with words about pace instead of talks
  var SOLO = {
    calm: { what: 'Breathing is easy, and your head feels steady. Calm doesn’t mean happy: you can be calm and sad, or calm and firm.',
      helps: ['A good window for the thing you’ve been putting off. Pick one.', 'Write down what’s on your mind, before a busy day buries it.', 'Notice what helped you get here today (sleep, food, a walk), so you can do more of it.'],
      pause: 'I’m having a decent day. Fancy a call or a coffee this week?',
      when: 'Good for one thing that matters, or for getting in touch with someone you’ve been meaning to call.',
      short: 'A good window for one thing that matters.' },
    revved: { helps: ['Breathe out slowly, longer than you breathe in, for one minute. The breathing pacer counts it for you.', 'Move: a short walk, the stairs, or a physical job like the dishes.', 'Write the thing down instead of acting on it. Read it again later.'],
      pause: 'I’m a bit wound up today, so I’ll keep replies short. It isn’t about you.',
      when: 'Settle for about twenty minutes before anything big. Leave big decisions, money and sharp replies for another day.',
      short: 'Settle first, for about twenty minutes.' },
    empty: { what: 'You feel tired and flat, and words are harder to find. Here it just means ordinary, everyday tiredness.',
      helps: ['Look after the basics first: water, something to eat, warmth, or a lie-down.', 'Do one small, finishable thing, or nothing at all for a while.', 'Meant to see or call someone? A short message is enough: “Low on words today. Can we do tomorrow?”'],
      pause: 'I’m running low today, so I’m keeping things small. I’ll get back to you tomorrow.',
      when: 'Keep today small. Anything big can wait until after rest or food, often tomorrow.',
      short: 'Rest first. Keep today small.' }
  };

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function markup(moreHref) {
    var h = '<div class="ld-tool tol-plain" id="ld-tool">';
    QS.forEach(function (q, i) {
      h += '<fieldset class="ld-q" data-q="' + q[0] + '"><legend>' + esc(q[1]) + '</legend><span class="ld-n">' + (i + 1) + ' of 4</span><div class="ld-opts">' +
        q[2].map(function (t, k) { return '<button type="button" class="ld-opt" data-v="' + ORDER[k] + '" aria-pressed="false">' + esc(t) + '</button>'; }).join('') + '</div></fieldset>';
    });
    h += '<p class="ld-hint" id="ld-left" role="status" aria-live="polite"></p></div>';
    h += '<section class="ld-result" id="ld-result" hidden aria-labelledby="ld-r-h" tabindex="-1">' +
      '<p class="ld-shared" id="ld-shared" hidden>Someone shared this result with you. Your own answers might be different. <a href="#ld-tool" id="ld-own">Check where you are →</a></p>' +
      '<h2 id="ld-r-h">Right now: <span id="ld-name">…</span></h2>' +
      '<ul class="ld-rungs no-bubble" aria-label="The ladder"><li data-r="calm">Calm and connected</li><li data-r="revved">Revved up</li><li data-r="empty">Running on empty</li></ul>' +
      '<p class="ld-who" role="group" aria-label="Who is around today"><span>Today I’m:</span> <button type="button" class="ld-chip" data-solo="0" aria-pressed="true">With other people</button><button type="button" class="ld-chip" data-solo="1" aria-pressed="false">Mostly on my own</button></p>' +
      '<p id="ld-what"></p><p class="ld-small" id="ld-mixed" hidden></p>' +
      '<h3>What helps on this rung, right now</h3><ol id="ld-helps"></ol>' +
      '<p class="ld-acts"><a class="ld-btn is-main" href="/night-garden.html" data-breathe>Breathing pacer</a><a class="ld-btn" href="/night-garden.html">The Night Garden</a></p>' +
      '<div class="ld-mp" data-mini-player></div>' +
      '<h3 id="ld-pause-h">A pause line you could say</h3>' +
      '<p class="ld-line"><q id="ld-pause"></q> <button type="button" class="ld-btn" id="ld-copy-line">Copy</button></p>' +
      '<h3 id="ld-when-h">When to come back to a talk</h3><p id="ld-when"></p>' +
      '<p class="ld-small">If you’re tense because you’re afraid of how someone will react, that is not just stress. Your body may be warning you. <a href="/safety.html">Not safe at home?</a> has free, private help.</p>' +
      '<div class="ld-more"><h3 style="margin-top:0">Add the rest of today’s weather</h3><p class="ld-small">Sleep, the pressure you were already carrying, your body and what’s coming up. You get today’s forecast, with a good time to talk, and you can keep it in your almanac on this device.</p>' +
      (moreHref ? '<a class="ld-btn" id="ld-more" href="' + esc(moreHref) + '">Add the rest (about a minute) →</a>' : '<button type="button" class="ld-btn" id="ld-more">Add the rest (about a minute) →</button>') + '</div>' +
      '<div class="ld-share"><h3>Save or share your result</h3><p class="ld-small">Only the rung goes in the link. Nothing is uploaded, and your answers aren’t kept.</p>' +
      '<canvas id="ld-card" width="1080" height="1080" aria-label="A picture of your result" role="img"></canvas>' +
      '<p class="ld-acts"><button type="button" class="ld-btn is-main" id="ld-save">Save image</button><button type="button" class="ld-btn" id="ld-link">Copy link</button><button type="button" class="ld-btn" id="ld-share">Share</button><button type="button" class="ld-btn" id="ld-qr">Show a QR code</button><button type="button" class="ld-btn" id="ld-again">Check again</button></p>' +
      '<p class="ld-status" id="ld-status" role="status" aria-live="polite"></p></div></section>';
    return h;
  }

  function mount(host) {
    if (!host || host.getAttribute('data-sky-ready')) return;
    host.setAttribute('data-sky-ready', '1');
    if (!document.getElementById('ld-css')) { var st = document.createElement('style'); st.id = 'ld-css'; st.textContent = CSS; document.head.appendChild(st); }
    var moreBase = host.getAttribute('data-more-href') || '';
    host.innerHTML = markup(moreBase ? moreBase + '?mode=full' : '');

    var solo = /[#&]solo\b/.test(location.hash) || /[?&]solo=1\b/.test(location.search);
    function D(r) { var d = R[r], o = solo && SOLO[r], x = {}; Object.keys(d).forEach(function (k) { x[k] = o && o[k] ? o[k] : d[k]; }); return x; }
    var answers = {}, current = null;
    var $ = function (id) { return document.getElementById(id); };
    var qs = [].slice.call(host.querySelectorAll('.ld-q'));
    var result = $('ld-result'), statusEl = $('ld-status');
    function say(t) { if (!statusEl) return; statusEl.textContent = ''; setTimeout(function () { statusEl.textContent = t; }, 30); }

    function score() {
      var c = { calm: 0, revved: 0, empty: 0 };
      Object.keys(answers).forEach(function (k) { c[answers[k]]++; });
      var max = Math.max(c.calm, c.revved, c.empty);
      var tied = ORDER.filter(function (r) { return c[r] === max; });
      var pick = tied.length === 1 ? tied[0] : (tied.indexOf(answers.body) >= 0 ? answers.body : (tied.indexOf('revved') >= 0 ? 'revved' : 'empty'));
      var other = ORDER.filter(function (r) { return r !== pick && c[r] > 0; }).sort(function (a, b) { return c[b] - c[a]; })[0] || null;
      return { rung: pick, other: other };
    }
    function linkFor(r) { return location.origin + location.pathname + '#rung=' + r; }
    function moreLink(r) { return moreBase + '?mode=full&sky=' + SKY_OF[r] + (solo ? '&rel=solo' : ''); }

    function show(r, opts) {
      opts = opts || {};
      if (!R[r]) return;
      var d = D(r);
      current = r;
      host.querySelectorAll('.ld-chip').forEach(function (c) { c.setAttribute('aria-pressed', (c.getAttribute('data-solo') === '1') === solo ? 'true' : 'false'); });
      $('ld-pause-h').textContent = solo ? 'A line you could send someone' : 'A pause line you could say';
      $('ld-when-h').textContent = solo ? 'What today is good for' : 'When to come back to a talk';
      $('ld-name').textContent = d.name;
      $('ld-what').textContent = d.what;
      $('ld-helps').innerHTML = d.helps.map(function (h) { return '<li>' + h + '</li>'; }).join('');
      $('ld-pause').textContent = '“' + d.pause + '”';
      $('ld-when').textContent = d.when;
      host.querySelectorAll('.ld-rungs li').forEach(function (li) { li.classList.toggle('is-here', li.getAttribute('data-r') === r); });
      var mixed = $('ld-mixed');
      if (opts.other) { mixed.hidden = false; mixed.textContent = 'Some of your answers pointed to ' + R[opts.other].name.toLowerCase() + ' too. That’s common. Go with the steps that feel most true right now.'; }
      else mixed.hidden = true;
      $('ld-shared').hidden = !opts.shared;
      if (moreBase) $('ld-more').setAttribute('href', moreLink(r));
      result.hidden = false;
      draw(r);
      try { history.replaceState(null, '', location.pathname + location.search + '#rung=' + r); } catch (e) {}
      if (opts.scroll) { result.scrollIntoView({ behavior: 'smooth', block: 'start' }); try { result.focus({ preventScroll: true }); } catch (e) {} }
    }

    host.querySelectorAll('.ld-chip').forEach(function (c) {
      c.addEventListener('click', function () { solo = c.getAttribute('data-solo') === '1'; if (current) show(current, { other: score().other }); });
    });
    qs.forEach(function (fs, i) {
      fs.addEventListener('click', function (e) {
        var b = e.target.closest('.ld-opt'); if (!b) return;
        fs.querySelectorAll('.ld-opt').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        answers[fs.getAttribute('data-q')] = b.getAttribute('data-v');
        var left = qs.filter(function (q) { return !answers[q.getAttribute('data-q')]; });
        if (!left.length) {
          $('ld-left').textContent = '';
          var s = score(); show(s.rung, { other: s.other, scroll: true });
        } else {
          $('ld-left').textContent = left.length === 1 ? 'One more to go.' : left.length + ' more to go.';
          var next = qs[i + 1] && !answers[qs[i + 1].getAttribute('data-q')] ? qs[i + 1] : left[0];
          var first = next.querySelector('.ld-opt');
          if (first && window.innerWidth < 700) next.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (first) try { first.focus({ preventScroll: true }); } catch (x) {}
        }
      });
    });

    // ---------- the picture ----------
    function wrap(ctx, t, maxW) {
      var words = t.split(' '), lines = [], cur = '';
      words.forEach(function (w) { var test = cur ? cur + ' ' + w : w; if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test; });
      if (cur) lines.push(cur); return lines;
    }
    function draw(r) {
      var cv = $('ld-card'); if (!cv || !cv.getContext) return;
      var ctx = cv.getContext('2d'); if (!ctx) return;
      var W = cv.width, H = cv.height, d = D(r), SERIF = 'Georgia, "Times New Roman", serif';
      ctx.fillStyle = '#F5EFDE'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ECE2C4'; ctx.fillRect(0, 0, W, 14);
      ctx.fillStyle = '#7A5620'; ctx.font = '500 30px "Courier New", monospace'; ctx.textAlign = 'left';
      ctx.fillText('HOW AM I RIGHT NOW?', 80, 110);
      ctx.fillStyle = '#2B2620'; ctx.font = '700 76px ' + SERIF;
      ctx.fillText(d.name, 80, 205);
      var top = 270, rh = 92;
      ctx.strokeStyle = '#A8792F'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(110, top - 20); ctx.lineTo(110, top + 3 * rh); ctx.moveTo(250, top - 20); ctx.lineTo(250, top + 3 * rh); ctx.stroke();
      ORDER.forEach(function (k, i) {
        var y = top + i * rh + 30, here = k === r;
        ctx.strokeStyle = here ? '#3E6B4C' : '#D9CBA3'; ctx.lineWidth = here ? 14 : 8;
        ctx.beginPath(); ctx.moveTo(110, y); ctx.lineTo(250, y); ctx.stroke();
        ctx.fillStyle = here ? '#2B2620' : '#8A8170'; ctx.font = (here ? '700 ' : '400 ') + '40px ' + SERIF;
        ctx.fillText(R[k].name + (here ? '  ← me' : ''), 290, y + 13);
      });
      var y = top + 3 * rh + 70;
      ctx.fillStyle = '#3E6B4C'; ctx.font = '700 36px ' + SERIF; ctx.fillText('What helps', 80, y);
      ctx.fillStyle = '#2B2620'; ctx.font = '400 34px ' + SERIF; y += 50;
      wrap(ctx, d.short, W - 160).forEach(function (l) { ctx.fillText(l, 80, y); y += 46; });
      y += 20;
      ctx.fillStyle = '#3E6B4C'; ctx.font = '700 36px ' + SERIF; ctx.fillText('What I might say', 80, y);
      ctx.fillStyle = '#2B2620'; ctx.font = 'italic 400 34px ' + SERIF; y += 50;
      wrap(ctx, '“' + d.pause + '”', W - 160).slice(0, 3).forEach(function (l) { ctx.fillText(l, 80, y); y += 46; });
      ctx.fillStyle = '#5A5346'; ctx.font = '400 26px ' + SERIF;
      ctx.fillText('A best guess, not a reading. Check yours:', 80, H - 92);
      ctx.font = '500 28px "Courier New", monospace'; ctx.fillStyle = '#7A5620';
      ctx.fillText('spreadloveandacceptance.com/ladder.html', 80, H - 50);
    }

    // ---------- copy, save, share ----------
    function copy(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(text); });
      return Promise.resolve(fallback(text));
    }
    function fallback(text) {
      var ta = document.createElement('textarea'), ok = false;
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-1000px';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove(); return ok;
    }
    $('ld-copy-line').addEventListener('click', function () {
      if (!current) return;
      var b = this;
      copy(D(current).pause).then(function (ok) { if (ok) { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1500); say('Copied. Change any words so it sounds like you.'); } else say('Copying didn’t work here. Select the words and copy them by hand.'); });
    });
    $('ld-link').addEventListener('click', function () {
      if (!current) return;
      copy(linkFor(current)).then(function (ok) { say(ok ? 'Link copied. It opens on this result: ' + R[current].name.toLowerCase() + '.' : 'Copying didn’t work here. The link is: ' + linkFor(current)); });
    });
    $('ld-save').addEventListener('click', function () {
      var cv = $('ld-card'); if (!cv || !cv.toBlob) { say('Saving a picture isn’t available here. Try a screenshot.'); return; }
      cv.toBlob(function (blob) {
        if (!blob) { say('Saving a picture isn’t available here. Try a screenshot.'); return; }
        var url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = 'how-am-i-right-now.png'; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        say('Saved the picture. It stays on your device until you choose to send it.');
      }, 'image/png');
    });
    $('ld-share').addEventListener('click', function () {
      if (!current) return;
      var d = D(current), text = 'Right now I’m ' + d.name.toLowerCase() + '. ' + d.short, url = linkFor(current);
      if (window.TOLShareKit && window.TOLShareKit.shareText) { window.TOLShareKit.shareText({ title: 'How am I right now?', text: text, url: url, heading: 'Share your result' }); return; }
      if (window.TOLShare && window.TOLShare.open) { window.TOLShare.open({ title: 'How am I right now?', text: text, url: url, result: true }); return; }
      if (navigator.share) { navigator.share({ title: 'How am I right now?', text: text, url: url }).catch(function () {}); return; }
      copy(text + ' ' + url).then(function (ok) { say(ok ? 'Copied. Paste it wherever you like.' : 'Sharing isn’t available here.'); });
    });
    // "Show a QR code": the same link as Copy link, drawn big for a phone in the same room (share-kit.js, loaded at the tap if needed)
    $('ld-qr').addEventListener('click', function () {
      if (!current) return;
      var url = linkFor(current), o = { title: 'Scan with the other phone', note: 'It opens this result on their phone: ' + R[current].name.toLowerCase() + '. Only the rung is in the link.' };
      if (window.TOLShareKit && window.TOLShareKit.showQR) { window.TOLShareKit.showQR(url, o); return; }
      var sc = document.createElement('script'); sc.src = '/assets/js/share-kit.js'; sc.onload = function () { if (window.TOLShareKit) window.TOLShareKit.showQR(url, o); }; document.head.appendChild(sc);
    });
    // "Add the rest of today's weather": a link to the full forecast (data-more-href), or an event for the page to switch modes
    $('ld-more').addEventListener('click', function (e) {
      if (moreBase || !current) return;
      e.preventDefault();
      var ev; try { ev = new CustomEvent('tol-sky-more', { bubbles: true, detail: { rung: current, sky: SKY_OF[current], solo: solo } }); } catch (x) { ev = document.createEvent('CustomEvent'); ev.initCustomEvent('tol-sky-more', true, false, { rung: current, sky: SKY_OF[current], solo: solo }); }
      host.dispatchEvent(ev);
    });
    $('ld-again').addEventListener('click', reset);
    $('ld-own').addEventListener('click', function (e) { e.preventDefault(); reset(); });
    function reset() {
      answers = {}; current = null;
      host.querySelectorAll('.ld-opt').forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
      result.hidden = true; $('ld-left').textContent = '';
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
      var c = document.getElementById(host.getAttribute('data-top') || '') || host; c.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var f = host.querySelector('.ld-opt'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {}
    }

    // A shared link: #rung=calm | revved | empty
    var m = /(?:^#|&)rung=(calm|revved|empty)\b/.exec(location.hash || '');
    if (m) show(m[1], { shared: true, scroll: false });

    host.TOLSky = { reset: reset, show: show, current: function () { return current; } };
  }

  function mountAll() { [].forEach.call(document.querySelectorAll('[data-sky-check]'), mount); }
  window.TOLSkyCheck = { mount: mount, SKY_OF: SKY_OF };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll); else mountAll();
})();
