/* cheer.js — little friends who cheer you on as you read. A handful of characters (blobs,
   clouds, stars, drops, hearts, moons, frogs, bunnies, bears, cats), often in a silly disguise,
   sit between the sections of a reading page. As you reach one it wakes up: it waves, blinks,
   grins, winks or hops, and either says a kind word or shares a "did you know?" from the
   program that fits the page. Some of them are happy to chat (site-chat.js), answering only
   from this site's own pages. Tap one for another. site.js loads this on reading pages.
   Nothing is stored or sent. */
(function () {
  'use strict';
  if (window.TOLCheer) return;
  var main = document.querySelector('main.read') || document.querySelector('main');
  if (!main) return;

  var CHAT_ON = false; // the chat with the buddies (site-chat.js) switches on here once it's ready
  var COLORS = [['#F9C9B4', '#E9A088'], ['#D9C8F0', '#B9A0E0'], ['#C7EBD6', '#8FCBA8'], ['#C6DFF4', '#8FBCE3'], ['#F8E7AE', '#E6C766'], ['#F7C9D4', '#E79AAE']];
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- who they are ----------
  // each: the body (drawn in a 80x80 box, face centred near 40,42), a colour if it has its own, and a name
  var KINDS = {
    blob: { name: ['Bloop', 'Puddle', 'Mochi', 'Dumpling'], body: function (c) { return '<path d="M40 10c16 0 28 10 30 26 2 17-8 33-29 34C20 71 9 59 10 42 11 23 23 10 40 10z" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="2.6"/>'; } },
    cloud: { col: ['#F4F6FF', '#B9C4E6'], name: ['Nimbus', 'Puff', 'Drizzle'], body: function (c) { return '<path d="M20 66c-9 0-14-7-13-14 1-6 6-10 11-10 0-11 9-19 20-19 9 0 16 5 19 12 9-1 17 6 17 15 0 9-7 16-16 16z" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="2.6" stroke-linejoin="round"/>'; } },
    star: { col: ['#FBE9A6', '#E2C45A'], name: ['Twinkle', 'Sparky', 'Stella'], body: function (c) { return '<path d="M40 8l9 19 21 3-15 15 4 21-19-10-19 10 4-21-15-15 21-3z" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="2.6" stroke-linejoin="round"/>'; } },
    drop: { col: ['#CFE6FA', '#7FB2E0'], name: ['Splash', 'Dewdrop', 'Ripple'], body: function (c) { return '<path d="M40 8C33 22 14 36 14 50c0 14 12 22 26 22s26-8 26-22C66 36 47 22 40 8z" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="2.6"/>'; } },
    heart: { col: ['#F7C1CF', '#E38BA4'], name: ['Lovey', 'Pip', 'Sweetpea'], body: function (c) { return '<path d="M40 70C22 58 8 47 9 32 10 20 20 13 29 14c5 0 9 3 11 7 2-4 6-7 11-7 9-1 19 6 20 18 1 15-13 26-31 38z" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="2.6" stroke-linejoin="round"/>'; } },
    moon: { col: ['#FFF3CC', '#E8D28A'], name: ['Luna', 'Crescent', 'Nightlight'], body: function (c) { return '<circle cx="40" cy="42" r="29" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="2.6"/><circle cx="27" cy="30" r="4" fill="' + c[1] + '" opacity=".35"/><circle cx="55" cy="58" r="3" fill="' + c[1] + '" opacity=".35"/>'; } },
    frog: { col: ['#BFE6C4', '#7FBF8C'], name: ['Hopkins', 'Lily', 'Ribbit'], body: function (c) { return '<circle cx="27" cy="24" r="9" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="2.4"/><circle cx="53" cy="24" r="9" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="2.4"/><ellipse cx="40" cy="47" rx="29" ry="23" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="2.6"/><ellipse cx="40" cy="56" rx="16" ry="9" fill="#E8F7EA"/>'; }, eyesUp: true },
    bunny: { col: ['#F6F2FB', '#C9BCE0'], name: ['Clover', 'Thistle', 'Buttons'], body: function (c) { return '<ellipse cx="29" cy="16" rx="6" ry="15" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="2.4"/><ellipse cx="51" cy="16" rx="6" ry="15" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="2.4"/><ellipse cx="29" cy="17" rx="2.5" ry="10" fill="#F7C9D4"/><ellipse cx="51" cy="17" rx="2.5" ry="10" fill="#F7C9D4"/><ellipse cx="40" cy="48" rx="26" ry="23" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="2.6"/>'; } },
    bear: { col: ['#E7C9A9', '#B98C63'], name: ['Honey', 'Barnaby', 'Cocoa'], body: function (c) { return '<circle cx="18" cy="22" r="9" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="2.4"/><circle cx="62" cy="22" r="9" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="2.4"/><circle cx="40" cy="44" r="28" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="2.6"/><ellipse cx="40" cy="53" rx="10" ry="7" fill="#F6E6D2"/>'; } },
    cat: { col: ['#E3E1EE', '#A9A4C4'], name: ['Whiskers', 'Marmalade', 'Socks'], body: function (c) { return '<path d="M14 34 L16 10 L32 22 Z M66 34 L64 10 L48 22 Z" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="2.4" stroke-linejoin="round"/><ellipse cx="40" cy="45" rx="28" ry="25" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="2.6"/><path d="M12 48h10M12 53h10M58 48h10M58 53h10" stroke="' + c[1] + '" stroke-width="1.4" stroke-linecap="round"/>'; } }
  };
  var KIND_KEYS = Object.keys(KINDS);

  // ---------- the silly disguises ----------
  var DISGUISES = {
    groucho: { title: 'in a very convincing disguise', svg: '<g class="cb-dz"><circle cx="31" cy="40" r="6.5" fill="none" stroke="#2B2620" stroke-width="2"/><circle cx="49" cy="40" r="6.5" fill="none" stroke="#2B2620" stroke-width="2"/><path d="M37.5 40h5" stroke="#2B2620" stroke-width="2"/><path d="M26 34q5-4 10 0M44 34q5-4 10 0" stroke="#2B2620" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse cx="40" cy="45.5" rx="3.4" ry="3" fill="#F2A3B6"/><path d="M31 49q4-3 9 0 5-3 9 0-4 4-9 1-5 3-9-1z" fill="#3A2A22"/></g>', hideMouth: true },
    tophat: { title: 'dressed for the opera', svg: '<g class="cb-dz"><rect x="27" y="-4" width="26" height="20" rx="2" fill="#2E2A3A"/><rect x="27" y="10" width="26" height="4" fill="#E38BA4"/><ellipse cx="40" cy="16" rx="21" ry="4" fill="#2E2A3A"/></g>' },
    detective: { title: 'on the case', svg: '<g class="cb-dz"><path d="M18 18q22-18 44 0l-4 4q-18-10-36 0z" fill="#A98A5C"/><path d="M22 20q18-8 36 0" stroke="#7C6440" stroke-width="2" fill="none"/><circle cx="66" cy="58" r="8" fill="rgba(210,235,255,.5)" stroke="#6B5A4E" stroke-width="2.6"/><path d="M60 64l-8 8" stroke="#6B5A4E" stroke-width="3.4" stroke-linecap="round"/></g>' },
    crown: { title: 'feeling royal', svg: '<g class="cb-dz"><path d="M24 20l4-14 7 9 5-12 5 12 7-9 4 14z" fill="#F4D26B" stroke="#D9AE3C" stroke-width="1.6" stroke-linejoin="round"/><circle cx="40" cy="14" r="2" fill="#E38BA4"/></g>' },
    beret: { title: 'being very artistic', svg: '<g class="cb-dz"><ellipse cx="36" cy="16" rx="22" ry="8" fill="#D5586F" transform="rotate(-10 36 16)"/><path d="M37 8l2-5" stroke="#D5586F" stroke-width="2.4" stroke-linecap="round"/></g>' },
    party: { title: 'ready for a party', svg: '<g class="cb-dz"><path d="M40 -6l11 24H29z" fill="#C6DFF4" stroke="#8FBCE3" stroke-width="1.4" stroke-linejoin="round"/><circle cx="36" cy="10" r="1.8" fill="#F7C9D4"/><circle cx="43" cy="5" r="1.8" fill="#F8E7AE"/><circle cx="40" cy="-6" r="3" fill="#F2A3B6"/></g>' },
    shades: { title: 'too cool for school', svg: '<g class="cb-dz"><rect x="23" y="35" width="15" height="10" rx="4" fill="#2B2620"/><rect x="42" y="35" width="15" height="10" rx="4" fill="#2B2620"/><path d="M38 38h4" stroke="#2B2620" stroke-width="2"/><path d="M26 37l5 0" stroke="#fff" stroke-width="1.4" opacity=".6"/></g>', hideEyes: true },
    chef: { title: 'cooking up something good', svg: '<g class="cb-dz"><path d="M26 18c-6 0-8-8-2-11 1-6 9-7 12-3 3-4 11-3 12 3 6 3 4 11-2 11z" fill="#FFFFFF" stroke="#D9D2E6" stroke-width="1.6"/><rect x="27" y="16" width="26" height="5" rx="1.5" fill="#FFFFFF" stroke="#D9D2E6" stroke-width="1.4"/></g>' },
    wizard: { title: 'practising a little magic', svg: '<g class="cb-dz"><path d="M40 -10l14 28H24z" fill="#7C6CC4"/><ellipse cx="40" cy="18" rx="20" ry="4" fill="#6A5AB0"/><path d="M36 2l1.2 2.5 2.6.3-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.3z" fill="#F8E7AE"/></g>' },
    pirate: { title: 'sailing the seven seas', svg: '<g class="cb-dz"><path d="M18 22q22-16 44 0z" fill="#D5586F"/><circle cx="55" cy="18" r="2" fill="#fff"/><path d="M22 34l36 10" stroke="#2B2620" stroke-width="1.4"/><ellipse cx="49" cy="40" rx="5.5" ry="5" fill="#2B2620"/></g>', hideRightEye: true },
    nose: { title: 'honk honk', svg: '<g class="cb-dz"><circle cx="40" cy="46" r="4.6" fill="#E4566E"/><circle cx="38.6" cy="44.6" r="1.3" fill="#fff" opacity=".7"/></g>' },
    flowers: { title: 'wearing a flower crown', svg: '<g class="cb-dz"><path d="M20 20q20-10 40 0" stroke="#8FCBA8" stroke-width="2" fill="none"/><circle cx="22" cy="19" r="3.4" fill="#F7C9D4"/><circle cx="31" cy="15" r="3.4" fill="#F8E7AE"/><circle cx="40" cy="14" r="3.6" fill="#D9C8F0"/><circle cx="49" cy="15" r="3.4" fill="#C6DFF4"/><circle cx="58" cy="19" r="3.4" fill="#F7C9D4"/></g>' }
  };
  var DZ_KEYS = Object.keys(DISGUISES);

  var WORDS = {
    start: ['Hi! One idea at a time.', 'Take your time, there’s no rush.', 'So glad you’re here.', 'We’ll go slowly together.', 'Oh hello! Nobody recognises me in this.'],
    mid: ['You’re doing lovely.', 'Proud of you for reading this.', 'Little steps still count.', 'Breathe out, then keep going.', 'This part is worth it.',
      'You’re getting the hang of it.', 'Nice and steady.', 'Curious is a great way to be.', 'A small break is fine too.', 'You and your people are worth this.',
      'Tap a water drop if a word feels deep.', 'Look how far you’ve come!', 'I’m not a character in a disguise. Who said that?'],
    half: ['Halfway there!', 'Half done. Lovely pace.'],
    end: ['You made it to the end!', 'All the way through. Well done!', 'That’s the whole thing. Be proud!']
  };

  function buddy(kind, c, dz) {
    var K = KINDS[kind], D = dz ? DISGUISES[dz] : {}, up = K.eyesUp ? -16 : 0;
    var eyes = '<g class="cb-eyes"' + (D.hideEyes ? ' style="display:none"' : '') + '><g class="cb-eye cb-eye-l"><circle cx="31" cy="' + (40 + up) + '" r="3.4" fill="#2B2620"/><circle cx="32.2" cy="' + (38.8 + up) + '" r="1.1" fill="#fff"/></g>' +
      '<g class="cb-eye cb-eye-r"' + (D.hideRightEye ? ' style="display:none"' : '') + '><circle cx="49" cy="' + (40 + up) + '" r="3.4" fill="#2B2620"/><circle cx="50.2" cy="' + (38.8 + up) + '" r="1.1" fill="#fff"/></g></g>' +
      '<g class="cb-happy"' + (D.hideEyes ? ' style="display:none"' : '') + '><path d="M27.5 ' + (41 + up) + ' Q31 ' + (36.5 + up) + ' 34.5 ' + (41 + up) + (D.hideRightEye ? '' : ' M45.5 ' + (41 + up) + ' Q49 ' + (36.5 + up) + ' 52.5 ' + (41 + up)) + '" fill="none" stroke="#2B2620" stroke-width="2.3" stroke-linecap="round"/></g>' +
      '<g class="cb-winkeye"><path d="M45.5 ' + (40.5 + up) + ' Q49 ' + (43 + up) + ' 52.5 ' + (40.5 + up) + '" fill="none" stroke="#2B2620" stroke-width="2.3" stroke-linecap="round"/></g>';
    var mouth = D.hideMouth ? '' : '<path class="cb-smile" d="M35 50 Q40 54.5 45 50" fill="none" stroke="#2B2620" stroke-width="2.3" stroke-linecap="round"/>' +
      '<path class="cb-grin" d="M33.5 49 Q40 58 46.5 49 Z" fill="#9C4A57" stroke="#2B2620" stroke-width="2" stroke-linejoin="round"/>';
    return '<svg viewBox="-4 -12 88 90" aria-hidden="true" focusable="false">' +
      '<g class="cb-arm cb-arm-l"><path d="M13 52 Q4 48 5 38" fill="none" stroke="' + c[1] + '" stroke-width="4.5" stroke-linecap="round"/></g>' +
      '<g class="cb-arm cb-arm-r"><path d="M67 52 Q76 48 75 38" fill="none" stroke="' + c[1] + '" stroke-width="4.5" stroke-linecap="round"/></g>' +
      K.body(c) + '<ellipse cx="30" cy="26" rx="6" ry="3.4" fill="#fff" opacity=".5" transform="rotate(-20 30 26)"/>' +
      eyes + mouth +
      '<ellipse cx="24" cy="49" rx="4" ry="2.4" fill="#F2A3B6" opacity=".85"/><ellipse cx="56" cy="49" rx="4" ry="2.4" fill="#F2A3B6" opacity=".85"/>' +
      (D.svg || '') + '</svg>';
  }

  // ---------- facts that fit this page, from the mini-dive glossary ----------
  var facts = [];
  function gatherFacts() {
    var G = window.TOL_DIVES; if (!G) return;
    var text = (main.textContent || '').toLowerCase(), onPage = [], other = [];
    Object.keys(G).forEach(function (k) {
      var d = G[k]; if (!d.s) return;
      var hit = (d.m || []).some(function (m) { return m.length > 3 && text.indexOf(m.toLowerCase()) !== -1; });
      (hit ? onPage : other).push(k);
    });
    facts = shuffle(onPage).concat(shuffle(other).slice(0, 4));
  }
  var factAt = 0;
  function nextFact() {
    if (!facts.length) gatherFacts();
    if (!facts.length) return null;
    var k = facts[factAt++ % facts.length], d = window.TOL_DIVES[k];
    return { key: k, t: d.t, s: d.s };
  }

  // ---------- where they sit ----------
  var blocks = [], kids = main.children;
  for (var i = 0; i < kids.length; i++) {
    var k = kids[i], tag = k.tagName;
    if (k.matches('.read-head, .depth-bar, .tol-gentle, .tol-private, .tol-tip, .tol-welcome, nav, script, style, .tol-cheer, [hidden], .no-cheer')) continue;
    if (/^(P|DIV|OL|UL|H2|H3|SECTION|BLOCKQUOTE|FIGURE|ASIDE|TABLE|DETAILS)$/.test(tag)) blocks.push(k);
  }
  var spots = [];
  blocks.forEach(function (b) {
    if (b.matches('ol.ideas') && b.children.length > 2) { Array.prototype.forEach.call(b.children, function (li) { spots.push({ el: li, inList: true }); }); }
    else spots.push({ el: b });
  });
  var textLen = (main.textContent || '').length;
  if (spots.length < 4 || textLen < 900) return;

  var want = Math.max(2, Math.min(8, Math.round(textLen / 1400) + 1));
  var chosen = [], step = spots.length / (want + 0.5);
  for (var n = 1; n <= want; n++) {
    var at = Math.min(spots.length - 1, Math.round(step * n) - 1);
    while (at < spots.length - 1 && /^H[23]$/.test(spots[at].el.tagName)) at++;
    if (chosen.indexOf(at) === -1 && at > 0) chosen.push(at);
  }
  var last = spots[spots.length - 1], made = [], kinds = shuffle(KIND_KEYS.slice()), dzs = shuffle(DZ_KEYS.slice());
  chosen.forEach(function (at, idx) {
    var s = spots[at]; if (s === last) return;
    var kind = idx === 0 && at < spots.length / 3 ? 'start' : (Math.abs(at - spots.length / 2) <= step / 2 && !made.some(function (m) { return m.kind === 'half'; }) ? 'half' : 'mid');
    made.push(place(s, kind, idx));
  });
  made.push(place({ el: last.inList ? last.el.parentNode : last.el }, 'end', made.length));

  function place(s, kind, idx) {
    var who = kinds[idx % kinds.length], K = KINDS[who], c = K.col || COLORS[(idx + Math.floor(Math.random() * 6)) % COLORS.length];
    var dz = Math.random() < 0.65 ? dzs[idx % dzs.length] : null;
    var name = pick(K.name) + (dz === 'detective' ? ', PI' : dz === 'crown' ? ' the First' : dz === 'wizard' ? ' the Wise' : dz === 'pirate' ? ' Sea-Legs' : '');
    var role = kind === 'end' ? 'cheer' : (idx % 3 === 1 ? 'fact' : idx % 3 === 2 && CHAT_ON ? 'chat' : 'cheer');
    var w = document.createElement(s.inList ? 'li' : 'div');
    w.className = 'tol-cheer ' + (idx % 2 ? 'is-right' : 'is-left') + (kind === 'end' ? ' is-end' : '') + ' is-' + role;
    w.innerHTML = '<button type="button" class="tol-cheer-b" aria-label="' + esc(name) + (dz ? ', ' + DISGUISES[dz].title : '') + '. Tap for another.">' + buddy(who, c, dz) + '</button>' +
      '<div class="tol-cheer-say"><span class="tol-cheer-name">' + esc(name) + (dz ? ' <em>' + esc(DISGUISES[dz].title) + '</em>' : '') + '</span><span class="tol-cheer-line"></span></div>';
    s.el.parentNode.insertBefore(w, s.el.nextSibling);
    var o = { el: w, kind: kind, role: role, name: name, who: who, c: c, dz: dz };
    w.querySelector('.tol-cheer-b').addEventListener('click', function () { cheer(o, true); });
    w.addEventListener('click', function (e) {
      var d = e.target.closest('[data-cheer-dive]'); if (d && window.TOLDives) { e.preventDefault(); window.TOLDives.open(d.getAttribute('data-cheer-dive'), d); }
      var ch = e.target.closest('[data-cheer-chat]'); if (ch) { e.preventDefault(); openChat(o, ch.getAttribute('data-cheer-chat')); }
    });
    return o;
  }

  // ---------- talking with them (site-chat.js, answers only from this site) ----------
  function openChat(o, topic) {
    var opts = { name: o.name, svg: buddy(o.who, o.c, o.dz), color: o.c[0], topic: topic || '',
      greeting: 'Hi, I’m ' + o.name + (o.dz ? ', ' + DISGUISES[o.dz].title : '') + '! Ask me anything about the program, and I’ll answer from the pages on this site.' + (topic ? ' Shall we start with ' + topic + '?' : '') };
    if (window.TOLChat) return window.TOLChat.open(opts);
    var sc = document.createElement('script'); sc.src = '/assets/js/site-chat.js';
    sc.onload = function () { if (window.TOLChat) window.TOLChat.open(opts); };
    document.head.appendChild(sc);
  }

  var used = {};
  function say(o) {
    var line = o.el.querySelector('.tol-cheer-line');
    if (o.role === 'fact') {
      var f = nextFact();
      if (f) { line.innerHTML = '<b>&#128161; Did you know?</b> <strong>' + esc(f.t) + ':</strong> ' + esc(f.s) + ' <button type="button" class="tol-cheer-more" data-cheer-dive="' + esc(f.key) + '">Wade in &rarr;</button>'; return; }
    }
    var list = WORDS[o.kind], w, tries = 0;
    do { w = pick(list); tries++; } while (used[w] && tries < 8);
    used[w] = true;
    line.innerHTML = esc(w) + (o.role === 'chat' ? ' <button type="button" class="tol-cheer-more" data-cheer-chat="">&#128172; Ask me something</button>' : '');
  }
  var MOVES = ['wave', 'hop', 'wink', 'grin', 'heart', 'sway', 'clap', 'spin', 'peek'];
  function cheer(o, tapped) {
    var w = o.el;
    say(o);
    var move = o.kind === 'end' ? (tapped ? pick(['clap', 'hop', 'heart', 'spin']) : 'clap') : pick(MOVES);
    MOVES.forEach(function (m) { w.classList.remove('do-' + m); });
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

  window.TOLCheer = { count: made.length, chat: function (topic) { openChat(made[0] || { name: 'Bloop', who: 'blob', c: COLORS[0], dz: null }, topic); } };
})();
