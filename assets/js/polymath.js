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
