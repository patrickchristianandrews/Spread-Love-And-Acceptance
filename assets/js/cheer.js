/* cheer.js — little buddies who cheer you on as you read. A few small blob friends sit
   between the sections of a reading page; as you reach one, it wakes up and waves, blinks,
   grins, winks or hops, with a kind word. Tap one for another. The last one celebrates
   reaching the end. site.js loads this on reading pages. Nothing is stored or sent. */
(function () {
  'use strict';
  if (window.TOLCheer) return;
  var main = document.querySelector('main.read') || document.querySelector('main');
  if (!main) return;

  var COLORS = [['#F9C9B4', '#E9A088'], ['#D9C8F0', '#B9A0E0'], ['#C7EBD6', '#8FCBA8'], ['#C6DFF4', '#8FBCE3'], ['#F8E7AE', '#E6C766'], ['#F7C9D4', '#E79AAE']];
  var MOVES = ['wave', 'hop', 'wink', 'grin', 'heart', 'sway', 'clap'];
  var WORDS = {
    start: ['Hi! One idea at a time.', 'Take your time, there’s no rush.', 'So glad you’re here.', 'We’ll go slowly together.'],
    mid: ['You’re doing lovely.', 'Proud of you for reading this.', 'Little steps still count.', 'Breathe out, then keep going.', 'This part is worth it.',
      'You’re getting the hang of it.', 'Nice and steady.', 'Curious is a great way to be.', 'A small break is fine too.', 'You and your people are worth this.',
      'Tap a water drop if a word feels deep.', 'Look how far you’ve come!'],
    half: ['Halfway there!', 'Half done. Lovely pace.'],
    end: ['You made it to the end!', 'All the way through. Well done!', 'That’s the whole thing. Be proud!']
  };
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  // a little blob friend, with parts that move: eyes, mouth, arms, cheeks
  function buddy(c) {
    return '<svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">' +
      '<g class="cb-arm cb-arm-l"><path d="M13 48 Q4 44 5 34" fill="none" stroke="' + c[1] + '" stroke-width="4.5" stroke-linecap="round"/></g>' +
      '<g class="cb-arm cb-arm-r"><path d="M67 48 Q76 44 75 34" fill="none" stroke="' + c[1] + '" stroke-width="4.5" stroke-linecap="round"/></g>' +
      '<path class="cb-body" d="M40 10c16 0 28 10 30 26 2 17-8 33-29 34C20 71 9 59 10 42 11 23 23 10 40 10z" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="2.6"/>' +
      '<ellipse cx="30" cy="22" rx="7" ry="4" fill="#fff" opacity=".6" transform="rotate(-20 30 22)"/>' +
      '<g class="cb-eyes"><g class="cb-eye cb-eye-l"><circle cx="31" cy="40" r="3.4" fill="#2B2620"/><circle cx="32.2" cy="38.8" r="1.1" fill="#fff"/></g>' +
      '<g class="cb-eye cb-eye-r"><circle cx="49" cy="40" r="3.4" fill="#2B2620"/><circle cx="50.2" cy="38.8" r="1.1" fill="#fff"/></g></g>' +
      '<g class="cb-happy"><path d="M27.5 41 Q31 36.5 34.5 41 M45.5 41 Q49 36.5 52.5 41" fill="none" stroke="#2B2620" stroke-width="2.3" stroke-linecap="round"/></g>' +
      '<g class="cb-winkeye"><path d="M45.5 40.5 Q49 43 52.5 40.5" fill="none" stroke="#2B2620" stroke-width="2.3" stroke-linecap="round"/></g>' +
      '<path class="cb-smile" d="M35 48 Q40 52.5 45 48" fill="none" stroke="#2B2620" stroke-width="2.3" stroke-linecap="round"/>' +
      '<path class="cb-grin" d="M33.5 47 Q40 56 46.5 47 Z" fill="#9C4A57" stroke="#2B2620" stroke-width="2" stroke-linejoin="round"/>' +
      '<ellipse cx="25" cy="47" rx="4" ry="2.4" fill="#F2A3B6" opacity=".85"/><ellipse cx="55" cy="47" rx="4" ry="2.4" fill="#F2A3B6" opacity=".85"/>' +
      '</svg>';
  }

  // where to put them: between the page's big blocks, roughly one per screenful, at most six
  var blocks = [], kids = main.children;
  for (var i = 0; i < kids.length; i++) {
    var k = kids[i], tag = k.tagName;
    if (k.matches('.read-head, .depth-bar, .tol-gentle, .tol-private, .tol-tip, .tol-welcome, nav, script, style, .tol-cheer, [hidden], .no-cheer')) continue;
    if (/^(P|DIV|OL|UL|H2|H3|SECTION|BLOCKQUOTE|FIGURE|ASIDE|TABLE|DETAILS)$/.test(tag)) blocks.push(k);
  }
  // an ordered list of ideas counts each idea as a spot
  var spots = [];
  blocks.forEach(function (b) {
    if (b.matches('ol.ideas') && b.children.length > 2) { Array.prototype.forEach.call(b.children, function (li) { spots.push({ el: li, inList: true }); }); }
    else spots.push({ el: b });
  });
  var textLen = (main.textContent || '').length;
  if (spots.length < 4 || textLen < 900) return;

  var want = Math.max(2, Math.min(6, Math.round(textLen / 1800) + 1));
  var chosen = [], step = spots.length / (want + 0.5);
  for (var n = 1; n <= want; n++) {
    var at = Math.min(spots.length - 1, Math.round(step * n) - 1);
    // don't sit right after a heading: wait for its paragraph
    while (at < spots.length - 1 && /^H[23]$/.test(spots[at].el.tagName)) at++;
    if (chosen.indexOf(at) === -1 && at > 0) chosen.push(at);
  }
  var last = spots[spots.length - 1];
  var made = [];
  chosen.forEach(function (at, idx) {
    var s = spots[at];
    if (s === last) return;
    var kind = idx === 0 && at < spots.length / 3 ? 'start' : (Math.abs(at - spots.length / 2) <= step / 2 && !made.some(function (m) { return m.kind === 'half'; }) ? 'half' : 'mid');
    made.push(place(s, kind, idx));
  });
  made.push(place({ el: last.inList ? last.el.parentNode : last.el }, 'end', made.length));

  function place(s, kind, idx) {
    var c = COLORS[(idx + Math.floor(Math.random() * 6)) % COLORS.length];
    var side = idx % 2 ? 'is-right' : 'is-left';
    var w = document.createElement(s.inList ? 'li' : 'div');
    w.className = 'tol-cheer ' + side + (kind === 'end' ? ' is-end' : '');
    w.setAttribute('role', 'presentation');
    w.innerHTML = '<button type="button" class="tol-cheer-b" aria-label="A little friend cheering you on. Tap for another kind word.">' + buddy(c) + '</button>' +
      '<span class="tol-cheer-say" aria-live="off"></span>';
    s.el.parentNode.insertBefore(w, s.el.nextSibling);
    var o = { el: w, kind: kind, said: -1 };
    w.querySelector('.tol-cheer-b').addEventListener('click', function () { cheer(o, true); });
    return o;
  }

  var used = {};
  function say(o) {
    var list = WORDS[o.kind], line, tries = 0;
    do { line = pick(list); tries++; } while (used[line] && tries < 8);
    used[line] = true;
    o.el.querySelector('.tol-cheer-say').textContent = line;
  }
  function cheer(o, tapped) {
    var w = o.el;
    say(o);
    var move = o.kind === 'end' ? (tapped ? pick(['clap', 'hop', 'heart']) : 'clap') : pick(MOVES);
    MOVES.concat(['clap']).forEach(function (m) { w.classList.remove('do-' + m); });
    void w.offsetWidth;
    w.classList.add('is-awake', 'do-' + move);
    if (move === 'heart' || tapped) {
      var h = document.createElement('span'); h.className = 'tol-cheer-heart'; h.setAttribute('aria-hidden', 'true'); h.textContent = pick(['♥', '♥', '✦', '♡']);
      w.querySelector('.tol-cheer-b').appendChild(h);
      setTimeout(function () { h.remove(); }, 1400);
    }
    if (o.kind === 'end' && !tapped) confetti(w);
  }
  function confetti(w) {
    var b = w.querySelector('.tol-cheer-b');
    for (var i = 0; i < 9; i++) {
      var p = document.createElement('span'); p.className = 'tol-cheer-dot'; p.setAttribute('aria-hidden', 'true');
      p.style.setProperty('--dx', (Math.random() * 90 - 45).toFixed(0) + 'px');
      p.style.setProperty('--dy', (-30 - Math.random() * 50).toFixed(0) + 'px');
      p.style.background = COLORS[i % COLORS.length][1];
      b.appendChild(p);
      setTimeout(function (q) { return function () { q.remove(); }; }(p), 1500);
    }
  }

  // wake each one as it scrolls into view, and blink now and then while awake
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var o = made.filter(function (m) { return m.el === e.target; })[0];
        if (o) setTimeout(function () { cheer(o, false); }, 250);
      });
    }, { rootMargin: '0px 0px -22% 0px', threshold: 0.6 });
    made.forEach(function (o) { io.observe(o.el); });
  } else made.forEach(function (o) { cheer(o, false); });

  setInterval(function () {
    if (document.hidden) return;
    made.forEach(function (o) {
      if (!o.el.classList.contains('is-awake') || Math.random() > 0.35) return;
      o.el.classList.remove('is-blink'); void o.el.offsetWidth; o.el.classList.add('is-blink');
    });
  }, 3200);

  window.TOLCheer = { count: made.length };
})();
