/* polymath.js — "Try it: connect two fields" on the polymath page. Pick two fields and it shows the root they
   share (balance, signal and noise, feedback loops, limited capacity, ownership and structure, quiet incentives,
   state and setting), how each field sees it, and where it shows up in the program. Nothing is saved or sent. */
(function () {
  'use strict';
  var box = document.querySelector('[data-pm-lab]');
  if (!box) return;

  var ROOTS = {
    balance: { name: 'Balance', ico: '⚖️', idea: 'what flows in has to match what flows out, or something runs dry', tool: ['The Lemonade Stand: see the whole load together', '/lemonade-stand.html'], pillar: 'Pillar I, See the whole load' },
    signal: { name: 'Signal and noise', ico: '📡', idea: 'what’s sent isn’t always what arrives', tool: ['The Signal Translator: how a message may land', '/signal-translator.html'], pillar: 'Pillar IV, Tune how you send and receive' },
    loops: { name: 'Feedback loops', ico: '🔁', idea: 'small things repeated, with a check each time, shape the whole system', tool: ['The 90-second daily check-in (WP-13)', '/workpapers/wp-13-pll-protocol.html'], pillar: 'Pillar V, Notice the quiet incentives' },
    capacity: { name: 'Limited capacity', ico: '🔋', idea: 'everything has a limit, and a system with no spare room breaks on an ordinary bad day', tool: ['Today’s Weather: a one-minute check on yourself', '/quick-checks.html#today'], pillar: 'Pillar III, Read your state first' },
    ownership: { name: 'Ownership and structure', ico: '🗂️', idea: 'work that belongs to everyone belongs to no one', tool: ['One owner per job (WP-03)', '/workpapers/wp-03-raci-treaty.html'], pillar: 'Pillar II, Fix the setup, not the person' },
    incentives: { name: 'Quiet incentives', ico: '🧲', idea: 'things drift toward whatever the setup quietly rewards', tool: ['The Deficit Audit: what keeps coming back (WP-04)', '/workpapers/wp-04-deficit-audit.html'], pillar: 'Pillar V, Notice the quiet incentives' },
    state: { name: 'State and setting', ico: '🌤️', idea: 'the same message lands differently depending on your state and the place you’re in', tool: ['The Night Garden: a calm place to settle first', '/night-garden.html'], pillar: 'Pillar III, Read your state first' }
  };
  // each field: how it sees each root it shares
  var FIELDS = {
    audit: { name: 'Accounting and audit', r: { balance: 'every entry has two sides, and books have to balance', ownership: 'every control needs one named owner', signal: 'separating what’s claimed from what the evidence supports', loops: 'regular reconciliations catch small errors before they grow' } },
    psychology: { name: 'Psychology', r: { signal: 'the gap between intent and impact', capacity: 'masking and stress use up a limited supply', state: 'mood colors how everything is heard', loops: 'habits of thought repeat until something interrupts them' } },
    philosophy: { name: 'Philosophy', r: { signal: 'how we know what we claim to know, and what’s only a guess', ownership: 'duties: who owes what to whom', balance: 'fairness: each person’s needs carry equal weight' } },
    behavioral: { name: 'Behavioral science', r: { loops: 'small, frequent habits beat big, rare efforts', incentives: 'people follow what the setup makes easy', ownership: 'structure that doesn’t need willpower to run', capacity: 'willpower runs out when you’re depleted' } },
    neuro: { name: 'Neurobiology', r: { state: 'the nervous system sets whether you’re calm, revved up or shut down', capacity: 'stress left over from earlier fills the battery', signal: 'nerves carry signals that can be drowned out', loops: 'the body keeps adjusting to stay in balance', balance: 'rest has to match effort' } },
    economics: { name: 'Economics', r: { capacity: 'every resource is limited, and using it has a cost', incentives: 'choices follow what gets rewarded', balance: 'a household at 95% has no safety margin for a bad week', loops: 'markets settle by constant small adjustments' } },
    business: { name: 'Business', r: { ownership: 'unclear ownership causes most failures', incentives: 'what gets measured gets done', loops: 'teams improve by reviewing and adjusting', capacity: 'a team stretched too thin drops things' } },
    finance: { name: 'Finance', r: { balance: 'solvency: is this month sustainable?', capacity: 'reserves are what get you through a surprise', incentives: 'interest quietly rewards what you keep doing' } },
    holistic: { name: 'Holistic practice', r: { state: 'start with the body, then the argument', balance: 'rest, movement and care keep the whole person steady', capacity: 'notice the limit before you’re past it' } },
    senses: { name: 'Aromatherapy and the senses', r: { state: 'light, noise and scent shift what you can take in', signal: 'a busy room adds static to any conversation', capacity: 'too much input fills you up fast' } },
    music: { name: 'Music and sound', r: { signal: 'a clear note through the static', loops: 'rhythm: a pattern that repeats and keeps everyone together', state: 'a song can change the feel of a room', balance: 'harmony: parts that fit instead of competing' } },
    nature: { name: 'Nature and ecology', r: { balance: 'a pond, a forest or a field stays healthy when what’s taken is given back', loops: 'seasons and cycles that come round again', capacity: 'land can only carry so much', ownership: 'a hive gives every job to someone' } }
  };
  var ORDER = ['audit', 'psychology', 'philosophy', 'behavioral', 'neuro', 'economics', 'business', 'finance', 'holistic', 'senses', 'music', 'nature'];
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function opts(sel) { return ORDER.map(function (k) { return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + esc(FIELDS[k].name) + '</option>'; }).join(''); }

  box.innerHTML = '<div class="pm-pick">' +
    '<label>First field<select data-a>' + opts('audit') + '</select></label><span class="pm-plus" aria-hidden="true">+</span>' +
    '<label>Second field<select data-b>' + opts('neuro') + '</select></label>' +
    '<button type="button" data-surprise>Surprise me</button></div>' +
    '<div class="pm-out" aria-live="polite"></div>';
  var A = box.querySelector('[data-a]'), B = box.querySelector('[data-b]'), out = box.querySelector('.pm-out');

  function show() {
    var a = A.value, b = B.value, fa = FIELDS[a], fb = FIELDS[b];
    if (a === b) { out.innerHTML = '<h3>Pick two different fields</h3><p>The interesting part is where two different fields meet. Try changing one of them.</p>'; return; }
    var shared = Object.keys(fa.r).filter(function (k) { return fb.r[k]; });
    if (!shared.length) {
      // no direct root: find a third field that shares one with each, a bridge
      var bridge = null;
      ORDER.some(function (c) { if (c === a || c === b) return false; var x = Object.keys(fa.r).filter(function (k) { return FIELDS[c].r[k]; }), y = Object.keys(fb.r).filter(function (k) { return FIELDS[c].r[k]; }); if (x.length && y.length) { bridge = [c, x[0], y[0]]; return true; } return false; });
      out.innerHTML = '<h3>No direct root, so look for a bridge</h3><p>' + esc(fa.name) + ' and ' + esc(fb.name) + ' don’t share a root on their own. That’s often where new ideas come from: go through a third field.</p>' +
        (bridge ? '<p>' + esc(FIELDS[bridge[0]].name) + ' connects to ' + esc(fa.name) + ' through <strong>' + esc(ROOTS[bridge[1]].name.toLowerCase()) + '</strong>, and to ' + esc(fb.name) + ' through <strong>' + esc(ROOTS[bridge[2]].name.toLowerCase()) + '</strong>. Two steps, one connected picture.</p>' : '');
      return;
    }
    var k = shared[0], R = ROOTS[k];
    var more = shared.slice(1).map(function (x) { return ROOTS[x].ico + ' ' + ROOTS[x].name.toLowerCase(); });
    out.innerHTML = '<h3>' + R.ico + ' The shared root: ' + esc(R.name.toLowerCase()) + '</h3>' +
      '<p>Underneath, both are about the same thing: ' + esc(R.idea) + '.</p>' +
      '<p><strong>In ' + esc(fa.name.toLowerCase()) + ':</strong> ' + esc(fa.r[k]) + '.<br><strong>In ' + esc(fb.name.toLowerCase()) + ':</strong> ' + esc(fb.r[k]) + '.</p>' +
      (more.length ? '<p>They also meet at ' + esc(more.join(' and ')) + '.</p>' : '') +
      '<p>In the program, this root is ' + esc(R.pillar) + '.</p>' +
      '<p class="pm-tool"><a href="' + R.tool[1] + '">' + esc(R.tool[0]) + ' →</a></p>';
  }
  A.addEventListener('change', show); B.addEventListener('change', show);
  box.querySelector('[data-surprise]').addEventListener('click', function () {
    var a = ORDER[Math.floor(Math.random() * ORDER.length)], b;
    do { b = ORDER[Math.floor(Math.random() * ORDER.length)]; } while (b === a);
    A.value = a; B.value = b; show();
  });
  show();
})();

/* the 36 pairs (a grid on a wide screen, a list field by field on a phone) and the chain through all nine */
(function () {
  'use strict';
  var N = window.TOL_NINE, grid = document.querySelector('[data-nine-grid]'), chainEl = document.querySelector('[data-nine-chain]');
  if (!N) return;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var NAME = {}; N.fields.forEach(function (f) { NAME[f[0]] = f[1]; });
  function find(a, b) { for (var i = 0; i < N.pairs.length; i++) { var p = N.pairs[i]; if ((p[0] === a && p[1] === b) || (p[0] === b && p[1] === a)) return p; } return null; }
  function detail(p) {
    var P = N.pillars[p[6]];
    return '<h3>' + esc(NAME[p[0]]) + ' + ' + esc(NAME[p[1]]) + '</h3><p class="ng-tag">' + esc(N.tiers[p[3]]) + ' connection · the shared root: ' + esc(N.roots[p[2]]) + '</p><p>' + esc(p[4]) + '</p>' +
      '<p class="ng-tag"><a href="/five-pillars.html#' + P[1] + '">' + esc(P[0]) + '</a> · <a href="' + p[5][1] + '">' + esc(p[5][0]) + ' →</a></p>';
  }
  if (grid) {
    var count = { o: 0, h: 0, a: 0 }; N.pairs.forEach(function (p) { count[p[3]]++; });
    var head = '<tr><th></th>' + N.fields.map(function (f) { return '<th scope="col"><span>' + esc(f[1]) + '</span></th>'; }).join('') + '</tr>';
    var rows = N.fields.map(function (r) {
      return '<tr><th scope="row">' + esc(r[1]) + '</th>' + N.fields.map(function (c) {
        if (r[0] === c[0]) return '<td><span class="ng-self" aria-hidden="true"></span></td>';
        var p = find(r[0], c[0]);
        return '<td><button type="button" class="ng-cell t-' + p[3] + '" data-a="' + r[0] + '" data-b="' + c[0] + '" aria-label="' + esc(r[1] + ' and ' + c[1] + ': ' + N.tiers[p[3]].toLowerCase() + ' connection, ' + N.roots[p[2]]) + '">' + p[3].toUpperCase() + '</button></td>';
      }).join('') + '</tr>';
    }).join('');
    var list = N.fields.map(function (f) {
      var mine = N.pairs.filter(function (p) { return p[0] === f[0] || p[1] === f[0]; });
      return '<details><summary>' + esc(f[1]) + ' · ' + mine.length + ' connections</summary><ul>' + mine.map(function (p) { var other = p[0] === f[0] ? p[1] : p[0], P = N.pillars[p[6]]; return '<li><strong>+ ' + esc(NAME[other]) + '</strong> <span class="ng-tag">(' + esc(N.tiers[p[3]].toLowerCase()) + ', ' + esc(N.roots[p[2]]) + ')</span><br>' + esc(p[4]) + ' <span class="ng-tag"><a href="/five-pillars.html#' + P[1] + '">' + esc(P[0].split(',')[0]) + '</a> · <a href="' + p[5][1] + '">' + esc(p[5][0]) + '</a></span></li>'; }).join('') + '</ul></details>';
    }).join('');
    grid.innerHTML = '<p class="ng-key"><span><i style="background:#3E6B4C"></i>O: obvious (' + count.o + ')</span><span><i style="background:#2F5F8A"></i>H: hidden (' + count.h + ')</span><span><i style="background:#7C5BA6"></i>A: abstract (' + count.a + ')</span></p>' +
      '<div class="ng-grid-only"><div class="ng-wrap"><table class="ng-table"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="ng-out" aria-live="polite"><p>Pick any square to see how those two fields connect.</p></div></div>' +
      '<div class="ng-list ng-list-only">' + list + '</div>';
    var out = grid.querySelector('.ng-out');
    grid.addEventListener('click', function (e) {
      var b = e.target.closest('.ng-cell'); if (!b) return;
      Array.prototype.forEach.call(grid.querySelectorAll('.ng-cell.is-on'), function (x) { x.classList.remove('is-on'); });
      Array.prototype.forEach.call(grid.querySelectorAll('.ng-cell[data-a="' + b.getAttribute('data-b') + '"][data-b="' + b.getAttribute('data-a') + '"], .ng-cell[data-a="' + b.getAttribute('data-a') + '"][data-b="' + b.getAttribute('data-b') + '"]'), function (x) { x.classList.add('is-on'); });
      out.innerHTML = detail(find(b.getAttribute('data-a'), b.getAttribute('data-b')));
    });
  }
  if (chainEl) {
    chainEl.innerHTML = N.chain.map(function (c) { var P = N.pillars[c[3]]; return '<li><span class="nc-h">' + esc(NAME[c[0]]) + ' → ' + esc(NAME[c[1]]) + '</span>' + esc(c[2]) + ' <span class="ng-tag">(<a href="/five-pillars.html#' + P[1] + '">' + esc(P[0]) + '</a>)</span></li>'; }).join('');
  }

  // each field chapter: its closest links, one per tier where it has one, climbing obvious → hidden → abstract
  Array.prototype.forEach.call(document.querySelectorAll('[data-field-links]'), function (el) {
    var f = el.getAttribute('data-field-links');
    var mine = N.pairs.filter(function (p) { return p[0] === f || p[1] === f; });
    var pick = [];
    ['o', 'h', 'a'].forEach(function (t) { var p = mine.filter(function (x) { return x[3] === t; })[0]; if (p) pick.push(p); });
    mine.forEach(function (p) { if (pick.length < 3 && pick.indexOf(p) < 0) pick.push(p); });
    pick.sort(function (x, y) { return 'oha'.indexOf(x[3]) - 'oha'.indexOf(y[3]); });
    el.innerHTML = '<h4>Closest links, from obvious to hidden</h4><ul>' + pick.map(function (p) {
      var other = p[0] === f ? p[1] : p[0];
      return '<li class="t-' + p[3] + '"><strong>+ <a href="#field-' + other + '">' + esc(NAME[other]) + '</a></strong> <span class="ng-tag">(' + esc(N.tiers[p[3]].toLowerCase()) + ', ' + esc(N.roots[p[2]]) + ')</span><br>' + esc(p[4]) + ' <a href="' + p[5][1] + '">' + esc(p[5][0]) + ' →</a></li>';
    }).join('') + '</ul><p class="ng-tag">All ' + mine.length + ' of its links are in <a href="#all-pairs">the grid of 36 pairs</a>.</p>';
  });
  // a link to a field chapter opens it
  function openField() {
    var m = /^#field-(\w+)$/.exec(location.hash), d = m && document.getElementById('field-' + m[1]);
    if (d && d.tagName === 'DETAILS') d.open = true;
  }
  window.addEventListener('hashchange', openField); openField();

  // the climb: two examples from each tier, then the deepest tier, where three or more fields meet at once
  var climbEl = document.querySelector('[data-nine-climb]');
  if (climbEl) {
    var EX = { o: [['ps', 'nb'], ['ec', 'fi']], h: [['ps', 'ph'], ['nb', 'fi']], a: [['ph', 'bs'], ['fi', 'ar']] };
    var ABOUT = {
      o: ['#3E6B4C', 'Two fields using the same idea in plain sight. You’d spot these on a first read.'],
      h: ['#2F5F8A', 'Fields that look far apart, until you see the root they share.'],
      a: ['#7C5BA6', 'The deepest patterns between two fields, where they stop looking like separate subjects.']
    };
    var cnt = { o: 0, h: 0, a: 0 }; N.pairs.forEach(function (p) { cnt[p[3]]++; });
    var html = ['o', 'h', 'a'].map(function (t, i) {
      return '<li style="--tc:' + ABOUT[t][0] + '"><span class="pc-lvl">Step ' + (i + 1) + ' of 4</span><h3>' + esc(N.tiers[t]) + '</h3><p>' + esc(ABOUT[t][1]) + ' There are ' + cnt[t] + ' of them.</p><ul>' +
        EX[t].map(function (k) { var p = find(k[0], k[1]); return '<li><strong>' + esc(NAME[p[0]]) + ' + ' + esc(NAME[p[1]]) + '</strong> <span class="ng-tag">(' + esc(N.roots[p[2]]) + ')</span><br>' + esc(p[4]) + '</li>'; }).join('') +
        '</ul><p class="ng-tag">See all ' + cnt[t] + ' in <a href="#all-pairs">the grid</a>.</p></li>';
    }).join('');
    if (N.deep) {
      html += '<li style="--tc:#A8792F"><span class="pc-lvl">Step 4 of 4</span><h3>' + esc(N.tiers.d || 'Deepest') + ': where many fields meet at once</h3><p>Here the connections stop being pairs. One everyday moment runs through three, six, or all nine fields.</p><ul>' +
        N.deep.map(function (d) {
          return '<li><strong>' + esc(d.title) + '</strong><span class="pc-chips">' + d.fields.map(function (f) { return '<span>' + esc(NAME[f]) + '</span>'; }).join('') + '</span>' + esc(d.text) +
            (d.steps ? ' <a href="#flow-moment">Follow it step by step ↓</a>' : '') + ' <a href="' + d.tool[1] + '">' + esc(d.tool[0]) + ' →</a></li>';
        }).join('') + '</ul></li>';
    }
    climbEl.innerHTML = html;
  }

  // flowchart 1: one moment through all nine fields, snaking across three rows on a wide screen
  var flowEl = document.querySelector('[data-flow-moment]');
  var talk = N.deep && N.deep.filter(function (d) { return d.steps; })[0];
  if (flowEl && talk) {
    var STAGE = ['s-in', 's-in', 's-in', 's-btw', 's-btw', 's-btw', 's-out', 's-out', 's-out'];
    // grid places: row 1 left to right, row 2 right to left, row 3 left to right; arrows follow the path
    var COL = [1, 2, 3, 3, 2, 1, 1, 2, 3], ARROW = ['a-r', 'a-r', 'a-d', 'a-l', 'a-l', 'a-d', 'a-r', 'a-r', 'a-d'];
    var STAGE_NAME = { 's-in': 'inside you', 's-btw': 'between you', 's-out': 'around you' };
    flowEl.innerHTML = '<li class="fc-pill a-d" style="grid-column:1">Something happens</li>' +
      talk.steps.map(function (s, i) {
        return '<li class="' + STAGE[i] + ' ' + ARROW[i] + '" style="--c:' + COL[i] + '" data-row="' + (Math.floor(i / 3) + 2) + '"><b><small>' + (i + 1) + '</small>' + esc(NAME[s[0]]) + '</b><span class="fc-vh">(' + STAGE_NAME[STAGE[i]] + ') </span>' + esc(s[1]) + '</li>';
      }).join('') +
      '<li class="fc-pill fc-decided" style="--c:3">' + esc(talk.decide) + '</li>';
  }
})();
