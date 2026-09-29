/* learn-play.js — a playful learning layer for reading pages.
   - "Check yourself" moments after some sections: quick questions, pillar sort-its, tap-to-match,
     flip cards, "would you rather" picks, fill-the-gap and tiny sliders. Each one found earns a
     petal (through the shared rewards in rewards.js) and a small, calm sparkle.
   - A "Learning trail" ribbon near the top of the page: "3 of 5 moments found", with a badge and a
     suggested next page when the trail is done, and an easy way to start over.
   - "Explain it like I'm new" toggles on the fullest paragraphs of the full pages.
   - The quest map (/quest.html) reads the same progress and lights a lantern for each finished trail.
   The words live in learn-play-data.js, loaded on demand. Progress stays in this browser only
   (localStorage); nothing is sent anywhere. No motion with "Keep the page still" or reduced motion.
   Add ?learnplay=off to a page's address to switch it off there. */
(function () {
  'use strict';
  if (window.TOLLearnPlay) return;
  var KEY = 'tol-learnplay-v1';
  var DATA_SRC = '/assets/js/learn-play-data.js';
  var doc = document, root = doc.documentElement;

  if (/[?&]learnplay=off\b/.test(location.search)) return;

  /* ---------------------------------------------------------------- progress (this browser only) */
  var S = { pages: {}, awarded: {}, petals: 0, seen: {}, trails: {} };
  try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); if (o && typeof o === 'object') for (var k in o) S[k] = o[k]; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function norm(p) {
    p = (p || '/').split('#')[0].split('?')[0];
    try { p = decodeURI(p); } catch (e) {}
    if (p === '' || /\/$/.test(p)) p += 'index.html';
    if (!/\.[a-z0-9]+$/i.test(p)) p += '.html';
    return p.replace(/\/{2,}/g, '/');
  }
  var here = norm(location.pathname);
  if (here !== '/404.html') { S.seen[here] = S.seen[here] || Date.now(); save(); }

  function pageState(path) { return S.pages[path] || { done: {} }; }
  function doneCount(path, total) { var d = pageState(path).done, n = 0; for (var i = 0; i < total; i++) if (d[i]) n++; return n; }

  /* ---------------------------------------------------------------- explorer levels, by petals */
  var LEVELS = [[0, 'Curious Visitor', '🌱'], [3, 'Trail Finder', '🧭'], [8, 'Path Sprout', '🌿'], [15, 'Lantern Lighter', '🏮'],
    [25, 'Map Maker', '🗺️'], [40, 'Pillar Pal', '🏛️'], [60, 'Five-Pillar Explorer', '⛵'], [90, 'Grand Explorer', '🌟']];
  function level(p) {
    p = p == null ? S.petals : p;
    var i = 0; while (i + 1 < LEVELS.length && p >= LEVELS[i + 1][0]) i++;
    var cur = LEVELS[i], nxt = LEVELS[i + 1] || null;
    return { n: i + 1, name: cur[1], icon: cur[2], petals: p, next: nxt ? { name: nxt[1], at: nxt[0], icon: nxt[2] } : null,
      progress: nxt ? (p - cur[0]) / (nxt[0] - cur[0]) : 1 };
  }

  /* ---------------------------------------------------------------- small helpers */
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function el(tag, attrs, html) {
    var n = doc.createElement(tag);
    if (attrs) for (var a in attrs) { if (attrs[a] != null && attrs[a] !== false) n.setAttribute(a, attrs[a] === true ? '' : attrs[a]); }
    if (html != null) n.innerHTML = html;
    return n;
  }
  function textOf(n) { return (n.textContent || '').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase(); }
  function key(s) { return String(s).replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase(); }
  function still() {
    return root.classList.contains('tol-still') || !!(window.TOLStill && typeof window.TOLStill.on === 'function' && window.TOLStill.on()) ||
      !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function shuffledIdx(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); var s = shuffle(a), same = true; for (var j = 0; j < n; j++) if (s[j] !== j) same = false; if (same && n > 1) s.push(s.shift()); return s; }
  var uid = 0; function nid(p) { uid++; return 'lp-' + p + '-' + uid; }
  var hasCSP = !!doc.querySelector('meta[http-equiv="Content-Security-Policy"]');

  var PILLARS = [null,
    { roman: 'I', name: 'See the whole load', plain: 'Notice all the work, even the unseen kind', hint: 'Is this about making hidden work visible?' },
    { roman: 'II', name: 'Fix the setup', plain: 'Change who does what, not who’s to blame', hint: 'Is this about changing how a job is arranged or who owns it?' },
    { roman: 'III', name: 'Read your state first', plain: 'Check how tired or stressed you are first', hint: 'Is this about checking your own energy or stress before reacting?' },
    { roman: 'IV', name: 'Tune how you send and receive', plain: 'Pick words that land the way you mean', hint: 'Is this about choosing words, or how a message is heard?' },
    { roman: 'V', name: 'Notice the quiet incentives', plain: 'Spot jobs that drift to one person unasked', hint: 'Is this about a job that slid to someone without anyone deciding?' }];
  var KIND = { quiz: 'Quick question', sort: 'Sort it', pillar: 'Which pillar is this?', match: 'Match it up', flip: 'Tap to flip', wyr: 'Would you rather', gap: 'Fill the gap', slider: 'Slide and see' };
  var YAY = ['Yes!', 'Spot on!', 'Nailed it.', 'Exactly right.', 'Lovely!', 'You got it.'];
  function yay() { return YAY[Math.floor(Math.random() * YAY.length)]; }

  /* ---------------------------------------------------------------- rewards: a petal each */
  function withRewards(fn) {
    if (window.TOLRewards) return fn(window.TOLRewards);
    if (hasCSP) return;
    var s = doc.querySelector('script[src="/assets/js/rewards.js"]');
    if (!s) { s = el('script', { src: '/assets/js/rewards.js' }); doc.head.appendChild(s); }
    s.addEventListener('load', function () { if (window.TOLRewards) fn(window.TOLRewards); });
  }
  function awardPetal(path, i, why) {
    var id = path + '#' + i;
    if (S.awarded[id]) return false;
    S.awarded[id] = 1; S.petals = (S.petals || 0) + 1; save();
    withRewards(function (R) { try { R.earn(1, 'learn-play', '🌸 A petal for you: ' + why); } catch (e) {} });
    return true;
  }

  /* ---------------------------------------------------------------- styles */
  function style() {
    if (doc.getElementById('lp-style')) return;
    var css =
      '.lp-card,.lp-trail{--lp-ink:#2B2620;--lp-soft:#574F42;--lp-plum:#5E3F7A;--lp-rim:linear-gradient(135deg,#F7C9D4,#D9C8F0 30%,#C6DFF4 55%,#C7EBD6 78%,#F8E7AE);' +
        '--bb-fill:rgba(255,251,242,.97);position:relative;box-sizing:border-box;max-width:100%;color:var(--lp-ink);font-family:Lora,Georgia,serif;' +
        'border:1.5px solid transparent;border-radius:28px;background:radial-gradient(120% 90% at 12% 6%,rgba(255,255,255,.9),rgba(255,255,255,0) 40%) padding-box,linear-gradient(var(--bb-fill),var(--bb-fill)) padding-box,var(--lp-rim) border-box;' +
        'box-shadow:0 12px 28px -16px rgba(80,60,130,.35),inset 0 2px 0 rgba(255,255,255,.75);padding:1rem clamp(1rem,.7rem + 1.6vw,1.5rem) 1.05rem;margin:0 0 1.3rem;}' +
      '.lp-card{--bb-fill:rgba(252,247,255,.97);margin:1.4rem 0 1.6rem;}' +
      '.lp-card.lp-t1{--bb-fill:rgba(255,248,236,.97)}.lp-card.lp-t2{--bb-fill:rgba(240,249,244,.97)}.lp-card.lp-t3{--bb-fill:rgba(240,246,253,.97)}.lp-card.lp-t4{--bb-fill:rgba(255,244,247,.97)}' +
      '.lp-card [hidden],.lp-trail [hidden]{display:none !important}' +
      '.lp-top{display:flex;align-items:center;gap:.55rem;margin:0 0 .35rem}' +
      '.lp-badge{display:inline-grid;place-items:center;width:2.3rem;height:2.3rem;flex:none;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#F9E1EA 65%,#EBDDF6);font-size:1.15rem;box-shadow:0 3px 8px -4px rgba(80,60,130,.4)}' +
      '.read .lp-card p.lp-kicker,.lp-kicker{margin:0 !important;font:600 .76rem/1.2 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--lp-plum);max-width:none}' +
      '.lp-found{margin-left:auto;padding:.2rem .6rem;border-radius:999px;background:#DDF1E4;color:#1E4A2C;font:600 .8rem/1.2 Lora,Georgia,serif;white-space:nowrap}' +
      '.read .lp-card h3.lp-q,.lp-q{margin:.15rem 0 .75rem !important;font:600 1.12rem/1.35 Fraunces,Georgia,serif !important;color:var(--lp-ink);max-width:none}' +
      '.lp-help{margin:-.4rem 0 .6rem !important;font-size:.9rem;color:var(--lp-soft);max-width:none !important}' +
      '.lp-opts{display:grid;gap:.5rem;margin:0 0 .6rem;padding:0;list-style:none}.lp-opts.is-row{grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr))}' +
      '.lp-btn{appearance:none;-webkit-appearance:none;display:flex;align-items:center;justify-content:flex-start;gap:.5rem;width:100%;min-height:44px;box-sizing:border-box;margin:0;padding:.55rem .95rem;' +
        'border:1.5px solid #D8CBEA;border-radius:18px;background:#FFFFFF;color:var(--lp-ink);font:500 1rem/1.35 Lora,Georgia,serif;text-align:left;cursor:pointer;' +
        'box-shadow:0 3px 8px -6px rgba(80,60,130,.45);transition:transform .18s cubic-bezier(.2,.9,.3,1.3),background .18s,border-color .18s}' +
      '.lp-btn:hover{border-color:#B9A0E0;background:#FDFBFF;transform:translateY(-1px) rotate(-.4deg)}.lp-btn:active{transform:scale(.97)}' +
      '.lp-btn:focus-visible{outline:3px solid #2B5B8C !important;outline-offset:2px}' +
      '.lp-btn[aria-pressed="true"]{background:#3C3350;border-color:#3C3350;color:#FFF8EE}' +
      '.lp-btn.is-right{background:#DDF1E4;border-color:#8FCBA8;color:#173F24}.lp-btn.is-tried{background:#FBEFF2;border-color:#E9B8C6;color:#5C2438}' +
      '.lp-btn[aria-disabled="true"]{cursor:default}.lp-btn[aria-disabled="true"]:hover{transform:none}' +
      '.lp-btn .lp-mark{flex:none;margin-left:auto;font-size:1rem}' +
      '.lp-chip{width:auto;display:inline-flex;justify-content:center;border-radius:999px;padding:.45rem 1.05rem}' +
      '.lp-say{min-height:1.4em;margin:.5rem 0 0 !important;padding:0;font:500 1rem/1.5 Lora,Georgia,serif;color:var(--lp-ink);max-width:none !important}' +
      '.lp-say:empty{display:none}.lp-say b{color:#1E4A2C}.lp-say.is-twist b{color:#6B2B45}' +
      '.lp-say:not(:empty){padding:.55rem .85rem;border-radius:16px;background:rgba(255,255,255,.75)}' +
      '.lp-row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin:.7rem 0 0}' +
      '.lp-ghost{width:auto;min-height:44px;background:transparent;border-style:dashed;box-shadow:none;color:var(--lp-plum);font-size:.95rem}' +
      '.lp-next{width:auto;background:#3C3350;border-color:#3C3350;color:#FFF8EE}.lp-next:hover{background:#4E4366;border-color:#4E4366;color:#FFF8EE}' +
      '.lp-done-row{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem .8rem;margin:.75rem 0 0;font:600 .95rem/1.3 Lora,Georgia,serif;color:#1E4A2C}' +
      '.lp-done-row[hidden]{display:none}' +
      /* sort */
      '.lp-sortitem{margin:0 0 .6rem !important;padding:.7rem .95rem;border-radius:18px;background:#FFFFFF;border:1.5px dashed #CDBBE6;font:600 1.03rem/1.45 Lora,Georgia,serif;max-width:none !important}' +
      '.lp-count{display:block;margin:0 0 .3rem;font:500 .78rem/1.2 "IBM Plex Mono",monospace;color:var(--lp-soft)}' +
      '.lp-bins .lp-btn{justify-content:center;text-align:center}' +
      '.lp-bins .lp-pil{display:inline-grid;place-items:center;min-width:1.9rem;height:1.9rem;padding:0 .3rem;border-radius:999px;background:#F3EAFB;color:#4E3F6B;font:600 .75rem/1 "IBM Plex Mono",monospace}' +
      '.lp-btn[aria-disabled="true"] .lp-pil{background:rgba(255,255,255,.6)}' +
      '.lp-k-pillar .lp-bins{grid-template-columns:repeat(auto-fit,minmax(15rem,1fr))}.lp-k-pillar .lp-bins .lp-btn{justify-content:flex-start;text-align:left;gap:.65rem}' +
      '.lp-pn{display:grid;gap:.1rem}.lp-pn small{font:400 .86rem/1.3 Lora,Georgia,serif;opacity:.85}' +
      /* match */
      '.lp-match{display:grid;grid-template-columns:1fr 1fr;gap:.6rem .8rem}.lp-match h4{margin:0 0 .15rem !important;font:600 .76rem/1.2 "IBM Plex Mono",monospace;letter-spacing:.05em;text-transform:uppercase;color:var(--lp-plum)}' +
      '.lp-col{display:grid;gap:.45rem;align-content:start}.lp-col .lp-btn{font-size:.95rem}' +
      '.lp-btn.is-matched{background:#EEF8F1;border-color:#A8D8B9;color:#173F24}.lp-btn .lp-pair{flex:none;margin-left:auto;display:inline-grid;place-items:center;width:1.6rem;height:1.6rem;border-radius:50%;background:#C7EBD6;color:#173F24;font:600 .78rem/1 "IBM Plex Mono",monospace}' +
      '@media (max-width:520px){.lp-match{grid-template-columns:1fr}}' +
      /* flip */
      '.lp-flips{display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:.7rem}' +
      '.lp-flip{appearance:none;-webkit-appearance:none;position:relative;display:block;width:100%;min-height:9.5rem;padding:0;border:0;background:none;cursor:pointer;perspective:900px;font:inherit;color:inherit;text-align:left}' +
      '.lp-flip:focus-visible{outline:3px solid #2B5B8C;outline-offset:3px;border-radius:20px}' +
      '.lp-flip-in{position:relative;display:grid;width:100%;height:100%;min-height:9.5rem;transform-style:preserve-3d;transition:transform .55s cubic-bezier(.3,.9,.3,1.15)}' +
      '.lp-flip[aria-pressed="true"] .lp-flip-in{transform:rotateY(180deg)}' +
      '.lp-face{grid-area:1/1;display:flex;flex-direction:column;justify-content:center;gap:.35rem;box-sizing:border-box;min-height:9.5rem;padding:.85rem 1rem;border-radius:20px;backface-visibility:hidden;-webkit-backface-visibility:hidden;border:1.5px solid #E0D2EE;box-shadow:0 6px 14px -10px rgba(80,60,130,.5)}' +
      '.lp-front{background:linear-gradient(160deg,#FFFFFF,#F6EEFB);font:600 1.08rem/1.35 Fraunces,Georgia,serif;text-align:center;align-items:center}' +
      '.lp-front small{font:500 .8rem/1.2 Lora,Georgia,serif;color:var(--lp-soft)}' +
      '.lp-back{background:linear-gradient(160deg,#FFFDF6,#EEF7F1);transform:rotateY(180deg);font:400 .95rem/1.45 Lora,Georgia,serif}' +
      '.lp-back b{display:block;font:600 .72rem/1.2 "IBM Plex Mono",monospace;letter-spacing:.05em;text-transform:uppercase;color:var(--lp-plum)}' +
      '.lp-flip:hover .lp-front{border-color:#C9B3E6}' +
      /* would you rather */
      '.lp-wyr{display:grid;grid-template-columns:1fr auto 1fr;gap:.6rem;align-items:stretch}.lp-or{align-self:center;font:italic 600 1rem Fraunces,Georgia,serif;color:var(--lp-plum)}' +
      '.lp-wyr .lp-btn{min-height:4.2rem;justify-content:center;text-align:center;font-weight:600}' +
      '.lp-lead{margin:.45rem 0 0 !important;padding:.55rem .8rem;border-radius:16px;background:#FFFFFF;border:1.5px solid #E6DAF2;font-size:.95rem;line-height:1.45;max-width:none !important}' +
      '.lp-lead[hidden]{display:none}' +
      '@media (max-width:560px){.lp-wyr{grid-template-columns:1fr}.lp-or{justify-self:center}}' +
      /* gap */
      '.lp-sentence{margin:0 0 .7rem !important;font:500 1.08rem/1.7 Lora,Georgia,serif;max-width:none !important}' +
      '.lp-blank{display:inline-block;min-width:5.5rem;padding:0 .4rem;border-bottom:2.5px dashed #B9A0E0;color:var(--lp-plum);font-weight:600;text-align:center}' +
      '.lp-blank.is-filled{border-bottom-style:solid;border-color:#8FCBA8;color:#173F24;background:#EEF8F1;border-radius:8px 8px 0 0}' +
      '.lp-chips{display:flex;flex-wrap:wrap;gap:.5rem}' +
      /* slider */
      '.lp-slide label{display:block;margin:0 0 .35rem;font:600 .95rem/1.3 Lora,Georgia,serif}' +
      '.lp-range{width:100%;min-height:44px;margin:0;accent-color:#7C5BB0;cursor:pointer}' +
      '.lp-meter{position:relative;height:14px;border-radius:999px;background:#EFE6F4;overflow:hidden;margin:.2rem 0 .6rem}.lp-meter i{position:absolute;inset:0 auto 0 0;border-radius:999px;background:linear-gradient(90deg,#C7EBD6,#F8E7AE 55%,#F7C9D4);transition:width .25s}' +
      '.lp-readout{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}.lp-zone-ico{display:inline-grid;place-items:center;width:2.6rem;height:2.6rem;border-radius:50%;background:#fff;font-size:1.35rem;box-shadow:0 3px 8px -5px rgba(80,60,130,.5)}' +
      '.lp-zone-name{font:600 1.02rem/1.3 Fraunces,Georgia,serif}.lp-val{font:500 .85rem/1.2 "IBM Plex Mono",monospace;color:var(--lp-soft)}' +
      '.lp-zones{display:flex;gap:.3rem;margin:.55rem 0 0;padding:0;list-style:none}.lp-zones li{flex:1;height:6px;margin:0;border-radius:6px;background:#E8DDF0;max-width:none}.lp-zones li.is-seen{background:#9ED3B2}' +
      /* celebration */
      '.lp-spark{position:absolute;right:1.4rem;top:1.2rem;width:0;height:0;pointer-events:none;z-index:2}.lp-spark span{position:absolute;font-size:16px;animation:lp-fly .9s cubic-bezier(.2,.8,.2,1) both}' +
      '@keyframes lp-fly{0%{transform:translate(0,0) scale(.3);opacity:0}20%{opacity:1}100%{transform:translate(var(--dx),var(--dy)) rotate(var(--r)) scale(1);opacity:0}}' +
      '.lp-card.is-pop .lp-badge{animation:lp-pop .5s cubic-bezier(.2,1.4,.4,1)}@keyframes lp-pop{40%{transform:scale(1.25) rotate(-8deg)}}' +
      '.lp-pop-in{animation:lp-popin .35s cubic-bezier(.2,1.4,.4,1)}@keyframes lp-popin{0%{transform:scale(.7);opacity:.3}}' +
      '.lp-card:hover .lp-badge{animation:lp-wig .6s ease}@keyframes lp-wig{25%{transform:rotate(-10deg)}75%{transform:rotate(8deg)}}' +
      /* the trail ribbon */
      '.lp-trail{--bb-fill:rgba(255,249,236,.97);padding:.8rem 1.1rem .85rem}' +
      '.lp-trail-row{display:flex;align-items:center;flex-wrap:wrap;gap:.45rem .7rem}' +
      '.lp-trail-ico{font-size:1.35rem}.read .lp-trail p.lp-trail-t,.lp-trail-t{margin:0 !important;font:500 1rem/1.35 Lora,Georgia,serif;max-width:none}.lp-trail-t strong{font-family:Fraunces,Georgia,serif}' +
      '.lp-vh{position:absolute !important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
      '.read .lp-trail a.lp-petals,.lp-petals{min-height:44px;box-sizing:border-box;text-decoration:none;margin-left:auto;display:inline-flex;align-items:center;gap:.35rem;padding:.3rem .75rem;border-radius:999px;background:rgba(255,255,255,.9);border:1px solid #EBD3E4;color:#4E3F6B;font:600 .88rem/1.2 Lora,Georgia,serif;white-space:nowrap}' +
      '.read .lp-trail ol.lp-dots,.lp-dots{display:flex;flex-wrap:wrap;gap:.35rem;margin:.55rem 0 0 !important;padding:0 !important;list-style:none}' +
      '.read .lp-dots li,.lp-dots li{margin:0;max-width:none}' +
      '.read .lp-trail a.lp-dot,.lp-dot{display:inline-grid;place-items:center;min-width:44px;height:44px;box-sizing:border-box;padding:0 .5rem;border-radius:999px;border:1.5px dashed #CDBBE6;background:#fff;color:#4E3F6B;text-decoration:none;font:600 .9rem/1 "IBM Plex Mono",monospace;transition:transform .18s}' +
      '.read .lp-trail a.lp-dot:hover{transform:translateY(-2px)}.read .lp-trail a.lp-dot.is-done,.lp-dot.is-done{border-style:solid;border-color:#8FCBA8;background:#DDF1E4;color:#173F24}' +
      '.lp-dot.is-locked{opacity:.8}' +
      '.lp-trail-bar{display:block;height:6px;margin:.55rem 0 0;border-radius:6px;background:#EFE6F4;overflow:hidden}.lp-trail-bar i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#F4A6B8,#C9A7E8);transition:width .6s}' +
      '.lp-trail-end{margin:.65rem 0 0;padding:.65rem .85rem;border-radius:18px;background:#FFFFFF;border:1.5px solid #CFE9D8;display:flex;flex-wrap:wrap;gap:.35rem .75rem;align-items:center}' +
      '.lp-trail-end[hidden]{display:none}.lp-trail-end strong{font-family:Fraunces,Georgia,serif}.lp-medal{font-size:1.6rem}' +
      '.lp-trail-tools{display:flex;flex-wrap:wrap;gap:.4rem .6rem;align-items:center;margin:.5rem 0 0;font-size:.92rem}' +
      '.read .lp-trail-tools a,.lp-trail-tools a{display:inline-flex;align-items:center;min-height:44px;padding:0 .3rem;color:#4E3F6B}' +
      '.lp-trail-tools .lp-btn{width:auto}' +
      '.lp-trail .lp-note{margin:.4rem 0 0 !important;font-size:.9rem;color:var(--lp-soft);max-width:none !important}' +
      /* explain it like I'm new */
      'button.lp-eli-btn{appearance:none;-webkit-appearance:none;display:inline-flex;align-items:center;gap:.35rem;min-height:44px;margin:.35rem .2rem 0 0;padding:.3rem .85rem;border:1.5px solid #D8CBEA;border-radius:999px;background:#FFFDF8;color:#4E3F6B;font:600 .88rem/1.2 Lora,Georgia,serif;cursor:pointer;vertical-align:middle;transition:transform .18s}' +
      'button.lp-eli-btn:hover{transform:translateY(-1px) rotate(-1deg);border-color:#B9A0E0}button.lp-eli-btn:focus-visible{outline:3px solid #2B5B8C;outline-offset:2px}' +
      'button.lp-eli-btn[aria-expanded="true"]{background:#F3EAFB}' +
      '.lp-eli-panel{display:block;margin:.5rem 0 .2rem;padding:.7rem .9rem;border-radius:18px;background:#F4FAF6;border:1.5px solid #CFE9D8;color:#2B2620;font:400 .98rem/1.55 Lora,Georgia,serif;font-style:normal}' +
      '.lp-eli-panel[hidden]{display:none}.lp-eli-k{display:block;font:600 .72rem/1.3 "IBM Plex Mono",monospace;letter-spacing:.05em;text-transform:uppercase;color:#2F5A3C;margin:.2rem 0 .1rem}' +
      /* the quest map page */
      '.lp-quest-state{display:inline-flex;align-items:center;gap:.3rem;padding:.15rem .55rem;border-radius:999px;background:#F3EEF8;color:#4E3F6B;font:600 .8rem/1.3 Lora,Georgia,serif;white-space:nowrap}' +
      '.lp-quest-state.is-lit{background:#FFF1C9;color:#5C4210}.lp-quest-state.is-glow{background:#FCE8EF;color:#6B2B45}.lp-quest-state.is-visited{background:#E6F2FB;color:#1F4666}' +
      /* stillness */
      'html.tol-still .lp-card *,html.tol-still .lp-trail *,html.tol-still .lp-eli-btn,html.tol-still .lp-card{animation:none !important;transition:none !important}' +
      'html.tol-still .lp-btn:hover,html.tol-still .lp-eli-btn:hover,html.tol-still a.lp-dot:hover{transform:none !important}' +
      'html.tol-still .lp-spark{display:none !important}' +
      '@media (prefers-reduced-motion:reduce){.lp-card *,.lp-trail *,.lp-eli-btn,.lp-card{animation:none !important;transition:none !important}.lp-btn:hover,.lp-eli-btn:hover,a.lp-dot:hover{transform:none !important}.lp-spark{display:none !important}}' +
      '@media print{.lp-card,.lp-trail,.lp-eli-btn,.lp-eli-panel{display:none !important}}';
    var s = el('style', { id: 'lp-style' }); s.textContent = css; doc.head.appendChild(s);
  }

  /* ---------------------------------------------------------------- celebration */
  function sparkle(card) {
    card.classList.remove('is-pop'); void card.offsetWidth;
    if (still()) return;
    card.classList.add('is-pop');
    var box = el('div', { class: 'lp-spark', 'aria-hidden': 'true' }), bits = ['🌸', '✨', '💗', '🫧', '🌼'];
    for (var i = 0; i < 12; i++) {
      var sp = doc.createElement('span'), a = i / 12 * Math.PI * 2, d = 38 + (i % 3) * 16;
      sp.textContent = bits[i % bits.length];
      sp.style.setProperty('--dx', Math.round(Math.cos(a) * d) + 'px'); sp.style.setProperty('--dy', Math.round(Math.sin(a) * d) + 'px'); sp.style.setProperty('--r', (i * 41 % 160 - 80) + 'deg');
      sp.style.animationDelay = (i % 4) * 40 + 'ms'; box.appendChild(sp);
    }
    card.appendChild(box);
    setTimeout(function () { box.remove(); card.classList.remove('is-pop'); }, 1200);
  }

  /* ---------------------------------------------------------------- the moment renderers
     Each gets (m, ui) and fills ui.body. ui.say(html, twist) speaks into the live region,
     ui.finish() marks the moment found. Each returns { solve } that shows the finished state. */
  function btn(label, attrs) { var b = el('button', Object.assign({ type: 'button', class: 'lp-btn' }, attrs || {})); b.innerHTML = label; return b; }
  function off(b) { b.setAttribute('aria-disabled', 'true'); }
  function isOff(b) { return b.getAttribute('aria-disabled') === 'true'; }

  var R = {};
  R.quiz = function (m, ui) {
    var list = el('div', { class: 'lp-opts', role: 'group', 'aria-label': 'Choices' }), btns = [];
    shuffledIdx(m.o.length).forEach(function (i) {
      var o = m.o[i], b = btn(esc(o[0]), { 'data-lp-v': i });
      b.addEventListener('click', function () {
        if (isOff(b)) return;
        if (o[1]) { win(b, o[2]); ui.finish(); }
        else { b.classList.add('is-tried'); off(b); b.insertAdjacentHTML('beforeend', '<span class="lp-mark" aria-hidden="true">↺</span>'); ui.say(twist(o[2]), true); }
      });
      btns[i] = b; list.appendChild(b);
    });
    function win(b, say) {
      btns.forEach(function (x) { off(x); }); b.classList.add('is-right');
      b.insertAdjacentHTML('beforeend', '<span class="lp-mark" aria-hidden="true">✓</span>');
      ui.say(good(say));
    }
    ui.body.appendChild(list);
    return { solve: function () { for (var i = 0; i < m.o.length; i++) if (m.o[i][1]) { win(btns[i], m.o[i][2]); break; } } };
  };
  // Praise and "not quite" lines: one cheer at the start (never two), and the rest starts with a capital
  function cap(t) { t = String(t || '').trim(); return t.charAt(0).toUpperCase() + t.slice(1); }
  var CHEER = /^(Yes!|Yes\.|Yes,|Exactly\.|Exactly right\.|Exactly!|Spot on!|Nailed it\.|Lovely!|You got it\.|Right!|Correct\.)\s*/;
  function good(t) {
    t = String(t || '').trim(); if (!t) return '<b>' + esc(yay()) + '</b>';
    var m = CHEER.exec(t);
    return m ? '<b>' + esc(m[1]) + '</b>' + (t.slice(m[0].length) ? ' ' + esc(cap(t.slice(m[0].length))) : '') : '<b>' + esc(yay()) + '</b> ' + esc(cap(t));
  }
  function twist(t) {
    t = String(t || '').trim() || 'Not quite. Try another one.';
    var m = /^(Not quite\.)\s*/.exec(t), rest = m ? t.slice(m[0].length) : t;
    return '<b>Not quite.</b> ' + esc(cap(rest || 'Try another one.'));
  }
  // “That one is ‘Who was responsible?’” without a stray period after a question mark
  function quoted(label) { label = String(label).replace(/<[^>]+>/g, '').trim(); return '“' + label + (/[.?!]$/.test(label) ? '”' : '.”'); }

  function sorter(m, ui, bins, hintFor, noteFor) {
    var at = 0, order = shuffledIdx(m.items.length);
    var wrap = el('div', { class: 'lp-sort' });
    var count = el('span', { class: 'lp-count' }), item = el('p', { class: 'lp-sortitem' });
    var grid = el('div', { class: 'lp-opts is-row lp-bins', role: 'group', 'aria-label': 'Choose where it goes' });
    var nextRow = el('div', { class: 'lp-row' }), next = btn('Next example →', { class: 'lp-btn lp-next' });
    next.hidden = true; nextRow.appendChild(next);
    var bBtns = bins.map(function (label, bi) {
      var b = btn(label, { 'data-lp-bin': bi });
      b.addEventListener('click', function () {
        if (isOff(b) || !next.hidden || at >= order.length) return;
        var it = m.items[order[at]];
        if (it[1] === bi) {
          b.classList.add('is-right'); bBtns.forEach(off);
          ui.say(good(noteFor(it, bi)));
          if (at === order.length - 1) { at++; count.textContent = 'All ' + order.length + ' sorted'; ui.finish(); }
          else { next.hidden = false; next.focus(); }
        } else { b.classList.add('is-tried'); off(b); ui.say(twist(hintFor(it)), true); }
      });
      return b;
    });
    bBtns.forEach(function (b) { grid.appendChild(b); });
    next.addEventListener('click', function () { at++; show(); var f = bBtns[0]; if (f) f.focus(); });
    function show() {
      next.hidden = true;
      bBtns.forEach(function (b) { b.classList.remove('is-right', 'is-tried'); b.removeAttribute('aria-disabled'); });
      count.textContent = 'Example ' + (at + 1) + ' of ' + order.length + ' in this card';
      item.innerHTML = esc(m.items[order[at]][0]);
      item.classList.remove('lp-pop-in'); void item.offsetWidth; if (!still()) item.classList.add('lp-pop-in');
    }
    wrap.appendChild(el('p', { class: 'lp-help' }, 'Read the example, then tap the answer that fits. A new example follows until all ' + order.length + ' are done.'));
    wrap.appendChild(count); wrap.appendChild(item); wrap.appendChild(grid); wrap.appendChild(nextRow);
    ui.body.appendChild(wrap); show();
    return { solve: function () {
      at = order.length; next.hidden = true; count.textContent = 'All ' + order.length + ' sorted';
      item.innerHTML = m.items.map(function (it) { return esc(it[0]) + ' → <b>' + bins[it[1]].replace(/<[^>]+>/g, '') + '</b>'; }).join('<br>');
      bBtns.forEach(off);
    } };
  }
  R.sort = function (m, ui) {
    return sorter(m, ui, m.bins.map(esc), function () { return 'Read it once more and try another answer.'; },
      function (it, bi) { return it[2] || ('That one goes with ' + quoted(m.bins[bi])); });
  };
  R.pillar = function (m, ui) {
    var only = m.only || [1, 2, 3, 4, 5], bins = only.map(function (p) { return '<span class="lp-pil" aria-hidden="true">' + PILLARS[p].roman + '</span> <span class="lp-pn"><b>' + esc(PILLARS[p].name) + '</b><small>' + esc(PILLARS[p].plain) + '</small></span>'; });
    var mm = { items: m.items.map(function (it) { return [it[0], only.indexOf(it[1]), it[2]]; }) };
    return sorter(mm, ui, bins, function (it) { var h = PILLARS[only[it[1]]].hint; return 'Ask yourself: ' + h.charAt(0).toLowerCase() + h.slice(1); },
      function (it) { var p = PILLARS[only[it[1]]]; return it[2] || (yay() + ' That’s Pillar ' + p.roman + ', ' + p.name + ': ' + p.plain.toLowerCase() + '.'); });
  };

  R.match = function (m, ui) {
    var help = el('p', { class: 'lp-help' }, 'Tap a word, then tap its plain meaning. Works with the keyboard too.');
    var box = el('div', { class: 'lp-match' });
    var left = el('div', { class: 'lp-col', role: 'group', 'aria-label': 'Words' }, '<h4 aria-hidden="true">Word</h4>');
    var right = el('div', { class: 'lp-col', role: 'group', 'aria-label': 'Plain meanings' }, '<h4 aria-hidden="true">Plain meaning</h4>');
    var sel = null, matched = 0, L = [], Rt = [];
    function pick(side, i, b) {
      if (isOff(b)) return;
      if (sel && sel.side === side) { sel.b.setAttribute('aria-pressed', 'false'); if (sel.i === i) { sel = null; return; } }
      if (!sel || sel.side === side) { sel = { side: side, i: i, b: b }; b.setAttribute('aria-pressed', 'true'); ui.say('Now pick its ' + (side === 'L' ? 'plain meaning' : 'word') + '.'); return; }
      var li = side === 'L' ? i : sel.i, ri = side === 'R' ? i : sel.i;
      sel.b.setAttribute('aria-pressed', 'false');
      if (li === ri) { pair(li); ui.say(good(yay() + ' “' + m.pairs[li][0] + '” means ' + lower(m.pairs[li][1]) + '.')); if (matched === m.pairs.length) ui.finish(); }
      else { var b2 = sel.b; ui.say(twist('Not quite. Those two aren’t a pair. Try another.'), true); [b, b2].forEach(function (x) { x.classList.add('is-tried'); setTimeout(function () { x.classList.remove('is-tried'); }, 900); }); }
      sel = null;
    }
    function lower(t) { return /^[“"]/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1); }
    function pair(i) {
      if (isOff(L[i])) return; matched++;
      [L[i], Rt[i]].forEach(function (x) { off(x); x.setAttribute('aria-pressed', 'false'); x.classList.add('is-matched'); x.insertAdjacentHTML('beforeend', '<span class="lp-pair" aria-hidden="true">' + (i + 1) + '</span>'); });
      L[i].setAttribute('aria-label', m.pairs[i][0] + ', matched with ' + m.pairs[i][1]);
      Rt[i].setAttribute('aria-label', m.pairs[i][1] + ', matched with ' + m.pairs[i][0]);
    }
    shuffledIdx(m.pairs.length).forEach(function (i) { var b = btn(esc(m.pairs[i][0]), { 'aria-pressed': 'false', 'data-lp-l': i }); b.addEventListener('click', function () { pick('L', i, b); }); L[i] = b; left.appendChild(b); });
    shuffledIdx(m.pairs.length).forEach(function (i) { var b = btn(esc(m.pairs[i][1]), { 'aria-pressed': 'false', 'data-lp-r': i }); b.addEventListener('click', function () { pick('R', i, b); }); Rt[i] = b; right.appendChild(b); });
    box.appendChild(left); box.appendChild(right);
    ui.body.appendChild(help); ui.body.appendChild(box);
    return { solve: function () { for (var i = 0; i < m.pairs.length; i++) pair(i); } };
  };

  R.flip = function (m, ui) {
    var grid = el('div', { class: 'lp-flips' }), seen = {}, n = 0, cards = [];
    m.cards.forEach(function (c, i) {
      var b = el('button', { type: 'button', class: 'lp-flip', 'aria-pressed': 'false', 'data-lp-f': i });
      b.innerHTML = '<span class="lp-flip-in"><span class="lp-face lp-front"><span>' + esc(c[0]) + '</span><small>Tap to flip</small></span>' +
        '<span class="lp-face lp-back" aria-hidden="true"><b>What it means</b><span>' + esc(c[1]) + '</span>' + (c[2] ? '<b>Try this</b><span>' + esc(c[2]) + '</span>' : '') + '</span></span>';
      var front = b.querySelector('.lp-front'), back = b.querySelector('.lp-back');
      function set(on) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); front.setAttribute('aria-hidden', on ? 'true' : 'false'); back.setAttribute('aria-hidden', on ? 'false' : 'true'); }
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-pressed') !== 'true'; set(on);
        if (on) { ui.say('<b>' + esc(c[0]) + ':</b> ' + esc(c[1]) + (c[2] ? ' <b>Try this:</b> ' + esc(c[2]) : '')); if (!seen[i]) { seen[i] = 1; n++; if (n === m.cards.length) ui.finish(); } }
      });
      cards.push({ set: set, i: i }); grid.appendChild(b);
    });
    ui.body.appendChild(grid);
    return { solve: function () { cards.forEach(function (c) { seen[c.i] = 1; }); n = m.cards.length; } };
  };

  R.wyr = function (m, ui) {
    var box = el('div', { class: 'lp-wyr', role: 'group', 'aria-label': 'Two choices' }), leads = [], btns = [], picked = -1;
    var peek = btn('Peek at the other path', { class: 'lp-btn lp-ghost' }); peek.hidden = true;
    m.o.forEach(function (o, i) {
      var col = el('div'), b = btn(esc(o[0]), { 'aria-pressed': 'false', 'data-lp-v': i }), lead = el('p', { class: 'lp-lead', id: nid('lead') }, '<b>This leads to:</b> ' + esc(o[1]));
      lead.hidden = true; b.setAttribute('aria-describedby', lead.id);
      b.addEventListener('click', function () {
        if (picked !== -1) return;
        picked = i; b.setAttribute('aria-pressed', 'true'); lead.hidden = false; if (!still()) lead.classList.add('lp-pop-in');
        btns.forEach(function (x) { off(x); });
        ui.say(esc(o[1]) + (m.say ? ' ' + esc(m.say) : '')); peek.hidden = false; ui.finish();
      });
      col.appendChild(b); col.appendChild(lead); leads.push(lead); btns.push(b); box.appendChild(col);
      if (i === 0 && m.o.length > 1) box.appendChild(el('span', { class: 'lp-or', 'aria-hidden': 'true' }, 'or'));
    });
    peek.addEventListener('click', function () { leads.forEach(function (l) { l.hidden = false; }); peek.hidden = true; var other = m.o[picked === 0 ? 1 : 0]; if (other) ui.say('<b>The other path:</b> ' + esc(other[1])); });
    var row = el('div', { class: 'lp-row' }); row.appendChild(peek);
    ui.body.appendChild(box); ui.body.appendChild(row);
    return { solve: function () { picked = 0; btns.forEach(off); leads.forEach(function (l) { l.hidden = false; }); } };
  };

  R.gap = function (m, ui) {
    var parts = m.s.split('___');
    var sent = el('p', { class: 'lp-sentence' });
    var blank = el('span', { class: 'lp-blank' }, '<span aria-hidden="true">&nbsp;?&nbsp;</span><span class="lp-vh">(blank)</span>');
    sent.appendChild(doc.createTextNode(parts[0])); sent.appendChild(blank); sent.appendChild(doc.createTextNode(parts[1] || ''));
    var chips = el('div', { class: 'lp-chips', role: 'group', 'aria-label': 'Words for the gap' }), bs = [];
    shuffledIdx(m.o.length).forEach(function (i) {
      var b = btn(esc(m.o[i]), { class: 'lp-btn lp-chip', 'data-lp-v': i });
      b.addEventListener('click', function () {
        if (isOff(b)) return;
        if (i === m.a) { fill(); ui.say(good(m.say)); ui.finish(); }
        else { b.classList.add('is-tried'); off(b); ui.say(twist('Not quite. “' + m.o[i] + '” isn’t the page’s word. Try another.'), true); }
      });
      bs[i] = b; chips.appendChild(b);
    });
    function fill() { blank.textContent = m.o[m.a]; blank.classList.add('is-filled'); if (!still()) blank.classList.add('lp-pop-in'); bs.forEach(off); bs[m.a].classList.add('is-right'); }
    ui.body.appendChild(sent); ui.body.appendChild(chips);
    return { solve: fill };
  };

  var FMT = {
    pct: function (v) { return v + '%'; }, int: function (v) { return String(v); }, none: function () { return ''; },
    dec2: function (v) { return v.toFixed(2); },
    balance: function (v) { return 'You ' + v + '% · them ' + (100 - v) + '% · balance ' + (1 - Math.abs(2 * v - 100) / 100).toFixed(2); },
    solv: function (v) { return 'Ownership ' + v.toFixed(2) + ' → Solvency Read ≈ ' + (0.39 + 0.35 * v).toFixed(2); },
    over20: function (v) { return v + ' ÷ 20 = ' + (v / 20).toFixed(2); },
    of10: function (v) { return v + ' of 10 · ' + v + ' ÷ 10 = ' + (v / 10).toFixed(2); },
    ratio5: function (v) { return v + ' of 5 · ' + v + ' ÷ 5 = ' + (v / 5).toFixed(2); }
  };
  R.slider = function (m, ui) {
    var id = nid('range'), fmt = FMT[m.fmt] || FMT.int, dec = String(m.step).indexOf('.') !== -1 ? String(m.step).split('.')[1].length : 0;
    var wrap = el('div', { class: 'lp-slide' });
    var lab = el('label', { for: id }, esc(m.label));
    var input = el('input', { type: 'range', id: id, class: 'lp-range', min: m.min, max: m.max, step: m.step, value: m.start != null ? m.start : m.min });
    var meter = el('div', { class: 'lp-meter', 'aria-hidden': 'true' }, '<i></i>');
    var read = el('div', { class: 'lp-readout' }, '<span class="lp-zone-ico" aria-hidden="true"></span><span><span class="lp-zone-name"></span><br><span class="lp-val"></span></span>');
    var dots = el('ul', { class: 'lp-zones', 'aria-hidden': 'true' });
    m.zones.forEach(function () { dots.appendChild(el('li')); });
    var need = Math.min(m.need || m.zones.length, m.zones.length, 3), seen = {}, nSeen = 0, lastZ = -1, done = false;
    var hint = el('p', { class: 'lp-help' }, need > 1 ? 'Try at least ' + need + ' different spots.' : '');
    function val() { var v = parseFloat(input.value); return dec ? +v.toFixed(dec) : v; }
    function zoneOf(v) { for (var i = 0; i < m.zones.length; i++) if (v <= m.zones[i][0] + 1e-9) return i; return m.zones.length - 1; }
    function update(speak) {
      var v = val(), zi = zoneOf(v), z = m.zones[zi], pct = (v - m.min) / (m.max - m.min) * 100;
      meter.firstChild.style.width = Math.max(4, pct) + '%';
      read.querySelector('.lp-zone-ico').textContent = z[3] || '•';
      read.querySelector('.lp-zone-name').textContent = z[1];
      read.querySelector('.lp-val').textContent = fmt(v);
      input.setAttribute('aria-valuetext', (fmt(v) ? fmt(v) + ', ' : '') + z[1]);
      if (!seen[zi]) { seen[zi] = 1; nSeen++; dots.children[zi].classList.add('is-seen'); }
      if (zi !== lastZ && speak) ui.say('<b>' + esc(z[1]) + ':</b> ' + esc(z[2]));
      lastZ = zi;
      if (!done && nSeen >= need && speak) { done = true; ui.finish(); }
    }
    input.addEventListener('input', function () { update(true); });
    wrap.appendChild(lab); wrap.appendChild(hint); wrap.appendChild(input); wrap.appendChild(meter); wrap.appendChild(read); wrap.appendChild(dots);
    ui.body.appendChild(wrap); update(false);
    return { solve: function () { done = true; m.zones.forEach(function (z, i) { if (!seen[i]) { seen[i] = 1; dots.children[i].classList.add('is-seen'); } }); } };
  };

  /* ---------------------------------------------------------------- placing things on the page */
  function findHeading(main, at) {
    var want = key(at), hs = main.querySelectorAll('h2, h3');
    for (var i = 0; i < hs.length; i++) if (!hs[i].closest('.lp-card, .tol-gate, [hidden]') && textOf(hs[i]).indexOf(want) !== -1) return hs[i];
    return null;
  }
  // Where the section that starts at heading h ends. Returns { parent, before } for insertBefore.
  function sectionEnd(main, h) {
    var li = h.closest('li');
    if (li && main.contains(li) && /^(OL|UL)$/.test(li.parentElement.tagName)) {
      var list = li.parentElement, nextLi = li.nextElementSibling;
      while (nextLi && nextLi.classList.contains('tol-cheer')) nextLi = nextLi.nextElementSibling;
      if (!nextLi) return { parent: list.parentNode, before: list.nextSibling };
      // split the list here, keeping the numbering, so the card sits between two sections
      var rest = doc.createElement(list.tagName);
      for (var a = 0; a < list.attributes.length; a++) { var at = list.attributes[a]; if (at.name !== 'id' && at.name !== 'start') rest.setAttribute(at.name, at.value); }
      var count = 0; Array.prototype.forEach.call(list.children, function (c) { if (c.tagName === 'LI' && !c.classList.contains('tol-cheer') && (c.compareDocumentPosition(nextLi) & 4)) count++; });
      var baseStart = parseInt(list.getAttribute('start') || '1', 10);
      if (list.tagName === 'OL') rest.setAttribute('start', String(baseStart + count));
      if (list.classList.contains('ideas')) rest.style.counterReset = 'idea ' + (baseStart - 1 + count);
      rest.setAttribute('data-lp-split', '1');
      while (nextLi) { var n = nextLi.nextElementSibling; rest.appendChild(nextLi); nextLi = n; }
      list.parentNode.insertBefore(rest, list.nextSibling);
      return { parent: list.parentNode, before: rest };
    }
    // a heading inside its own box (section, article): the card goes after the box
    var box = h.parentElement;
    if (box && box !== main && /^(SECTION|ARTICLE)$/.test(box.tagName) && box.firstElementChild && box.querySelector('h2, h3') === h) {
      return { parent: box.parentNode, before: box.nextSibling };
    }
    // otherwise: walk on from the heading to just before the next heading of the same or higher level
    var lvl = +h.tagName.charAt(1), n2 = h.nextElementSibling, last = h;
    while (n2) {
      if (/^H[1-6]$/.test(n2.tagName) && +n2.tagName.charAt(1) <= lvl) break;
      if (n2.querySelector && lvl === 2 && n2.querySelector(':scope > h2')) break;
      last = n2; n2 = n2.nextElementSibling;
    }
    return { parent: last.parentNode, before: last.nextSibling };
  }
  function isLocked(node) {
    var l = node.closest('.locked-section');
    return !!(l && !doc.body.classList.contains('unlocked') && getComputedStyle(l).display === 'none');
  }

  /* ---------------------------------------------------------------- a reading page */
  function mountPage(D, main) {
    var P = D.pages[here];
    if (!P || !P.m || !P.m.length) return;
    style();
    var total = P.m.length, cards = [], trail = null;

    function ensure() { if (!S.pages[here]) S.pages[here] = { done: {} }; return S.pages[here]; }

    P.m.forEach(function (m, i) {
      var h = m.at ? findHeading(main, m.at) : null;
      var spot;
      if (h) spot = sectionEnd(main, h);
      else {
        // no heading matched: spread the leftovers evenly between the page's sections
        var hs = main.querySelectorAll(':scope > h2, :scope > section, :scope > ol.ideas > li > h2');
        var pick = hs[Math.min(hs.length - 1, Math.round((i + 1) * hs.length / (total + 1)))];
        spot = pick ? sectionEnd(main, pick.tagName === 'SECTION' ? pick.querySelector('h2') || pick : pick) : { parent: main, before: null };
      }
      var card = buildCard(m, i);
      card.el.setAttribute('data-lp-at', h ? 'heading' : 'spread');
      spot.parent.insertBefore(card.el, spot.before);
      cards.push(card);
    });

    function buildCard(m, i) {
      var id = 'lp-m' + (i + 1), hid = id + '-h', tint = (i % 4) + 1;
      var c = el('aside', { class: 'lp-card no-dive lp-t' + tint + ' lp-k-' + m.k, id: id, 'aria-labelledby': hid, 'data-lp-i': i });
      c.innerHTML = '<div class="lp-top"><span class="lp-badge" aria-hidden="true">' + ({ quiz: '💭', sort: '🗂️', pillar: '🏛️', match: '🧩', flip: '🃏', wyr: '🔀', gap: '✏️', slider: '🎚️' }[m.k] || '🌸') + '</span>' +
        '<p class="lp-kicker">Check yourself · moment ' + (i + 1) + ' of ' + total + ' on this page</p><span class="lp-found" hidden>🌸 Found</span></div>' +
        '<h3 class="lp-q" id="' + hid + '">' + esc(m.q || '') + '</h3><div class="lp-body"></div><p class="lp-say" aria-live="polite"></p>' +
        '<div class="lp-done-row" hidden><span class="lp-done-t"></span><button type="button" class="lp-btn lp-ghost lp-again">Play it again</button></div>';
      var body = c.querySelector('.lp-body'), sayEl = c.querySelector('.lp-say'), doneRow = c.querySelector('.lp-done-row'), found = c.querySelector('.lp-found');
      var card = { el: c, i: i, m: m };
      var ui = {
        card: c, body: body,
        say: function (html, tw) { sayEl.classList.toggle('is-twist', !!tw); sayEl.innerHTML = html; },
        finish: function () { complete(card); }
      };
      function render(solved) {
        body.innerHTML = ''; sayEl.innerHTML = '';
        var r = (R[m.k] || R.quiz)(m, ui);
        card.r = r;
        if (solved && r && r.solve) r.solve();
      }
      card.render = render;
      card.markDone = function (fresh, petal) {
        c.classList.add('is-done'); found.hidden = false;
        doneRow.hidden = false;
        doneRow.querySelector('.lp-done-t').textContent = fresh ? (petal ? '🌸 +1 petal! Moment found.' : '🌸 Found again. (That petal is already yours.)') : '🌸 Moment found';
      };
      c.querySelector('.lp-again').addEventListener('click', function () {
        doneRow.hidden = true; render(false);
        var f = body.querySelector('button, input'); if (f) f.focus();
      });
      var already = !!ensure().done[i];
      render(already);
      if (already) card.markDone(false);
      return card;
    }

    function complete(card) {
      var st = ensure(), was = !!st.done[card.i];
      st.done[card.i] = 1; save();
      var petal = awardPetal(here, card.i, (P.t || 'this page') + ', moment ' + (card.i + 1));
      card.markDone(true, petal);
      sparkle(card.el);
      refresh();
      if (!was && doneCount(here, total) === total) trailDone();
    }

    /* the trail ribbon */
    function buildTrail() {
      trail = el('div', { class: 'lp-trail no-dive', role: 'region', 'aria-label': 'Learning trail for this page' });
      trail.innerHTML =
        '<div class="lp-trail-row"><span class="lp-trail-ico" aria-hidden="true">🧭</span><p class="lp-trail-t"><strong>Learning trail</strong> · <span class="lp-trail-n" aria-live="polite"></span></p>' +
        '<a class="lp-petals" href="/quest.html" aria-label=""></a></div>' +
        '<span class="lp-trail-bar" aria-hidden="true"><i></i></span><ol class="lp-dots" aria-label="Moments on this page"></ol><p class="lp-note" hidden></p>' +
        '<div class="lp-trail-end" hidden></div>' +
        '<div class="lp-trail-tools"><a href="/quest.html">🗺️ Your quest map</a><button type="button" class="lp-btn lp-ghost lp-reset">Start this trail over</button></div>';
      var dots = trail.querySelector('.lp-dots');
      P.m.forEach(function (m, i) { dots.appendChild(el('li', null, '<a class="lp-dot" href="#lp-m' + (i + 1) + '"></a>')); });
      var reset = trail.querySelector('.lp-reset'), armed = null;
      reset.addEventListener('click', function () {
        if (!armed) { reset.textContent = 'Tap again to start over'; armed = setTimeout(function () { armed = null; reset.textContent = 'Start this trail over'; }, 4000); return; }
        clearTimeout(armed); armed = null; reset.textContent = 'Start this trail over';
        delete S.pages[here]; delete S.trails[here]; save();
        cards.forEach(function (c) { c.el.classList.remove('is-done'); c.el.querySelector('.lp-found').hidden = true; c.el.querySelector('.lp-done-row').hidden = true; c.render(false); });
        refresh(); trail.querySelector('.lp-trail-n').textContent = 'Fresh start! ' + trail.querySelector('.lp-trail-n').textContent;
      });
      var head = main.querySelector(':scope > p.depth-bar') || main.querySelector(':scope > header.read-head') || main.querySelector(':scope > header');
      var chooser = main.querySelector(':scope > .tol-depth-choose, :scope > .depth-choose');
      var after = chooser && head && (head.compareDocumentPosition(chooser) & 4) ? chooser : head;
      if (after) after.parentNode.insertBefore(trail, after.nextSibling); else main.insertBefore(trail, main.firstChild);
      refresh();
    }

    function refresh() {
      if (!trail) return;
      var d = ensure().done, n = 0, openTotal = 0, lockedN = 0;
      var links = trail.querySelectorAll('.lp-dot');
      cards.forEach(function (c, i) {
        var locked = isLocked(c.el), a = links[i];
        if (d[i]) n++;
        if (locked && !d[i]) lockedN++; else openTotal++;
        a.className = 'lp-dot' + (d[i] ? ' is-done' : '') + (locked && !d[i] ? ' is-locked' : '');
        a.textContent = d[i] ? '🌸' : locked ? '🔒' : String(i + 1);
        a.setAttribute('aria-label', 'Moment ' + (i + 1) + ', ' + (KIND[c.m.k] || 'moment').toLowerCase() + (d[i] ? ', found' : locked ? ', opens when you sign up free' : ', not found yet'));
        if (locked && !d[i]) a.removeAttribute('href'); else a.setAttribute('href', '#lp-m' + (i + 1));
      });
      trail.querySelector('.lp-trail-n').textContent = n + ' of ' + total + ' moments found';
      trail.querySelector('.lp-trail-bar i').style.width = Math.max(4, n / total * 100) + '%';
      var note = trail.querySelector('.lp-note');
      note.hidden = !lockedN; note.textContent = lockedN ? lockedN + (lockedN === 1 ? ' more moment opens' : ' more moments open') + ' when you sign up free and open the full page.' : '';
      var L = level(), pet = trail.querySelector('.lp-petals');
      pet.innerHTML = '<span aria-hidden="true">🌸</span> ' + (S.petals || 0) + ' · ' + esc(L.name);
      pet.setAttribute('aria-label', (S.petals || 0) + ' petals. Explorer level: ' + L.name + '. Open your quest map.');
      var end = trail.querySelector('.lp-trail-end');
      if (n === total) {
        var nx = nextFor(D, here), np = nx && D.pages[nx];
        end.innerHTML = '<span class="lp-medal" aria-hidden="true">🏮</span><span><strong>Trail complete!</strong> A lantern is lit for this page on your <a href="/quest.html">quest map</a>.</span>' +
          (np ? '<span>Next up: <a href="' + esc(nx) + '">' + esc(np.t) + ' →</a></span>' : '');
        end.hidden = false;
      } else end.hidden = true;
    }

    function trailDone() {
      S.trails[here] = Date.now(); save();
      refresh();
      if (trail) {
        var end = trail.querySelector('.lp-trail-end');
        var ann = trail.querySelector('.lp-trail-n'); ann.textContent = 'Trail complete! ' + ann.textContent;
        if (!still()) { end.classList.remove('lp-pop-in'); void end.offsetWidth; end.classList.add('lp-pop-in'); sparkle(trail); }
      }
    }

    buildTrail();
    // membership can open the full page after we've loaded: keep the count honest
    try { new MutationObserver(function () { refresh(); }).observe(doc.body, { attributes: true, attributeFilter: ['class'] }); } catch (e) {}

    // "Explain it like I'm new"
    (P.e || []).forEach(function (e) {
      var want = key(e.f), nodes = main.querySelectorAll('p, li, dd, td, blockquote');
      for (var i = 0; i < nodes.length; i++) {
        var nd = nodes[i];
        if (nd.closest('.lp-card, .lp-trail, nav, .tol-cheer') || nd.querySelector('.lp-eli-btn')) continue;
        if (textOf(nd).indexOf(want) === -1) continue;
        var pid = nid('eli');
        var b = el('button', { type: 'button', class: 'lp-eli-btn no-dive', 'aria-expanded': 'false', 'aria-controls': pid }, '<span aria-hidden="true">🐣</span> Explain it like I’m new');
        var panel = el('span', { class: 'lp-eli-panel no-dive', id: pid, role: 'note' },
          '<span class="lp-eli-k">In plain words</span>' + esc(e.s) + (e.x ? '<span class="lp-eli-k">Tiny example</span>' + esc(e.x) : ''));
        panel.hidden = true;
        b.addEventListener('click', function (b, panel) { return function () { var on = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', String(on)); panel.hidden = !on; if (on && !still()) { panel.classList.remove('lp-pop-in'); void panel.offsetWidth; panel.classList.add('lp-pop-in'); } }; }(b, panel));
        nd.appendChild(doc.createTextNode(' ')); nd.appendChild(b); nd.appendChild(panel);
        break;
      }
    });
  }

  function nextFor(D, path) {
    var P = D.pages[path], nx = P && P.n;
    function done(p) { var q = D.pages[p]; return q && doneCount(p, q.m.length) === q.m.length; }
    if (nx && D.pages[nx] && !done(nx)) return nx;
    var ord = D.order || [];
    for (var i = 0; i < ord.length; i++) if (ord[i] !== path && D.pages[ord[i]] && !done(ord[i])) return ord[i];
    return nx || null;
  }

  /* ---------------------------------------------------------------- the quest map page */
  function mountQuest(D, qroot) {
    style();
    function status(path, full) {
      var P = D.pages[path];
      if (P) {
        var t = P.m.length, n = doneCount(path, t);
        if (n === t) return { cls: 'is-lit', icon: '🏮', text: 'Lantern lit', n: n, t: t, lit: true };
        if (n > 0) return { cls: 'is-glow', icon: '🕯️', text: n + ' of ' + t + ' moments', n: n, t: t };
        if (S.seen[path]) return { cls: 'is-visited', icon: '👣', text: 'Visited, ' + t + ' moments to find', n: 0, t: t };
        return { cls: '', icon: '✨', text: t + ' moments to find', n: 0, t: t };
      }
      if (S.seen[path] || (full && S.seen[full])) return { cls: 'is-visited', icon: '👣', text: 'Visited', visited: true };
      return { cls: '', icon: '✨', text: 'Not visited yet' };
    }
    var regions = {};
    Array.prototype.forEach.call(qroot.querySelectorAll('[data-lp]'), function (item) {
      var path = item.getAttribute('data-lp'), full = item.getAttribute('data-lp-full');
      var st = status(path, full), reg = item.closest('[data-lp-region]'), rid = reg ? reg.getAttribute('data-lp-region') : '';
      var tag = item.querySelector('.lp-quest-state') || el('span', { class: 'lp-quest-state' });
      tag.className = 'lp-quest-state ' + st.cls;
      tag.innerHTML = '<span aria-hidden="true">' + st.icon + '</span> ' + esc(st.text);
      if (!tag.parentNode) item.appendChild(tag);
      if (full && D.pages[full]) {
        var fs = status(full), ft = item.querySelector('.lp-quest-full') || el('span', { class: 'lp-quest-state lp-quest-full' });
        ft.className = 'lp-quest-state lp-quest-full ' + fs.cls;
        ft.innerHTML = '<span aria-hidden="true">' + (fs.lit ? '⭐' : '☆') + '</span> Full page: ' + esc(fs.lit ? 'done' : fs.n ? fs.n + ' of ' + fs.t : fs.t + ' moments');
        if (!ft.parentNode) item.appendChild(ft);
      }
      var r = regions[rid] = regions[rid] || { trails: 0, lit: 0, visited: 0, pieces: 0 };
      r.pieces++;
      if (D.pages[path]) { r.trails++; if (st.lit) r.lit++; }
      if (st.lit || st.visited || S.seen[path]) r.visited++;
    });
    // light the lanterns on the map
    Object.keys(regions).forEach(function (rid) {
      var r = regions[rid], isle = qroot.querySelector('[data-lp-isle="' + rid + '"]');
      if (!isle) return;
      var cnt = isle.querySelector('.lp-isle-count');
      if (cnt) cnt.textContent = r.trails ? r.lit + ' of ' + r.trails + ' lanterns lit' : r.visited + ' of ' + r.pieces + ' visited';
      isle.setAttribute('aria-label', (isle.getAttribute('data-lp-name') || '') + ': ' + (cnt ? cnt.textContent : ''));
      var lamps = isle.querySelector('.lp-lamps');
      if (lamps) {
        var ns = 'http://www.w3.org/2000/svg', total = Math.max(r.trails, 1), cx = +lamps.getAttribute('data-x'), cy = +lamps.getAttribute('data-y');
        while (lamps.firstChild) lamps.removeChild(lamps.firstChild);
        for (var i = 0; i < total; i++) {
          var x = cx + (i - (total - 1) / 2) * 16, lit = i < r.lit;
          var g = doc.createElementNS(ns, 'g'); g.setAttribute('class', 'lp-lamp' + (lit ? ' is-lit' : ''));
          var halo = doc.createElementNS(ns, 'circle'); halo.setAttribute('cx', x); halo.setAttribute('cy', cy); halo.setAttribute('r', lit ? 9 : 0); halo.setAttribute('fill', 'rgba(255,214,110,.45)');
          var c = doc.createElementNS(ns, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', cy); c.setAttribute('r', 5); c.setAttribute('fill', lit ? '#FFC94D' : '#FFFFFF'); c.setAttribute('stroke', lit ? '#C98A12' : '#9C8BB8'); c.setAttribute('stroke-width', '1.6');
          g.appendChild(halo); g.appendChild(c); lamps.appendChild(g);
        }
      }
    });
    // explorer level
    var ex = qroot.querySelector('[data-lp-explorer]');
    if (ex) {
      var L = level(), lit = 0, trails = 0;
      Object.keys(D.pages).forEach(function (p) { trails++; if (doneCount(p, D.pages[p].m.length) === D.pages[p].m.length) lit++; });
      ex.innerHTML = '<span class="lp-ex-ico" aria-hidden="true">' + L.icon + '</span><div><p class="lp-ex-k">Your explorer level</p><p class="lp-ex-name">Level ' + L.n + ': ' + esc(L.name) + '</p>' +
        '<p class="lp-ex-sub">🌸 ' + (S.petals || 0) + ' petal' + (S.petals === 1 ? '' : 's') + ' · 🏮 ' + lit + ' of ' + trails + ' trails lit</p>' +
        '<span class="lp-trail-bar" aria-hidden="true"><i style="width:' + Math.max(4, Math.round(L.progress * 100)) + '%"></i></span>' +
        '<p class="lp-ex-next">' + (L.next ? (L.next.at - (S.petals || 0)) + ' more petal' + (L.next.at - (S.petals || 0) === 1 ? '' : 's') + ' to ' + L.next.icon + ' ' + esc(L.next.name) : 'The very top. Thank you for exploring every corner.') + '</p></div>';
    }
    // start here / next up
    var sh = qroot.querySelector('[data-lp-start]');
    if (sh) {
      var first = !(S.petals > 0), picks;
      if (first) picks = ['/five-pillars.html', '/start-here.html', '/know-yourself.html'];
      else { picks = []; var nx = nextFor(D, ''); (D.order || []).forEach(function (p) { if (picks.length < 3 && D.pages[p] && doneCount(p, D.pages[p].m.length) < D.pages[p].m.length) picks.push(p); }); if (!picks.length && nx) picks.push(nx); }
      var why = { '/five-pillars.html': 'The five ideas under everything, in ten minutes.', '/start-here.html': 'How the pieces fit, in order.', '/know-yourself.html': 'Why you react the way you do.' };
      var h = sh.querySelector('[data-lp-start-h]'); if (h) h.textContent = first ? 'Start here: three easy first steps' : (picks.length ? 'Next up on your trail' : 'Every trail is lit!');
      var list = sh.querySelector('[data-lp-start-list]');
      if (list) list.innerHTML = picks.map(function (p) { var P = D.pages[p], t = P.m.length, n = doneCount(p, t); return '<li><a href="' + esc(p) + '"><strong>' + esc(P.t) + '</strong><small>' + esc(why[p] && first ? why[p] : (n ? n + ' of ' + t + ' moments found. Pick up where you left off.' : t + ' moments to find')) + '</small></a></li>'; }).join('');
    }
    var resetAll = qroot.querySelector('[data-lp-resetall]');
    if (resetAll && !resetAll.lpWired) {
      resetAll.lpWired = true; var armed = null, label = resetAll.textContent;
      resetAll.addEventListener('click', function () {
        if (!armed) { resetAll.textContent = 'Tap again to clear every trail'; armed = setTimeout(function () { armed = null; resetAll.textContent = label; }, 4000); return; }
        clearTimeout(armed); armed = null; resetAll.textContent = label;
        S.pages = {}; S.trails = {}; save(); mountQuest(D, qroot);
        var say = qroot.querySelector('[data-lp-say]'); if (say) say.textContent = 'All trails cleared. Your petals and garden stay yours.';
      });
    }
  }

  /* ---------------------------------------------------------------- public bits */
  window.TOLLearnPlay = {
    state: function () { return JSON.parse(JSON.stringify(S)); },
    petals: function () { return S.petals || 0; },
    level: level,
    path: here,
    resetPage: function (p) { delete S.pages[norm(p || here)]; save(); },
    resetAll: function () { S.pages = {}; S.trails = {}; save(); }
  };

  /* ---------------------------------------------------------------- start */
  function withData(fn) {
    if (window.TOLLearnPlayData) return fn(window.TOLLearnPlayData);
    var s = el('script', { src: DATA_SRC });
    s.onload = function () { if (window.TOLLearnPlayData) fn(window.TOLLearnPlayData); };
    doc.head.appendChild(s);
  }
  function start() {
    if (doc.body.hasAttribute('data-no-learnplay')) return;
    var q = doc.querySelector('[data-lp-quest]');
    if (q) return withData(function (D) { mountQuest(D, q); window.addEventListener('storage', function (e) { if (e.key === KEY) { try { var o = JSON.parse(e.newValue || '{}'); for (var k in o) S[k] = o[k]; } catch (x) {} mountQuest(D, q); } }); });
    var main = doc.querySelector('main.read');
    if (!main || hasCSP) return;
    withData(function (D) { if (D.pages[here]) mountPage(D, main); });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})();
