/* Start where you are — a situation chooser.
   Drop <div data-tol-start></div> on any page (optionally data-compact) and include this file.
   Nothing is stored or sent; it only routes people to the right page. */
(function () {
  var S = [
    { id:'same-fight', ico:'\uD83D\uDD01', label:'We keep having the same fight',
      say:'Then the argument probably is not about the dishes, the money or the calendar. A thing that comes back every week is usually a gap in the arrangement, and arrangements can be changed without anybody being at fault.',
      picks:[
        ['/workpapers/wp-03-raci-treaty.html','WP-03: one owner per job','Most repeat fights live in jobs nobody formally owns.'],
        ['/workpapers/wp-04-deficit-audit.html','WP-04: the monthly look back','Sorts what keeps going wrong into a broken system, no capacity, or a one-off.'],
        ['/check-ins.html','Check-ins','How to raise it once, properly, instead of ten times badly.']
      ]},
    { id:'empty', ico:'\uD83E\uDEAB', label:'I am running on empty',
      say:'That deserves attention before anything else does. Nothing in the program works well from an empty tank, and you are allowed to start by looking after yourself.',
      picks:[
        ['/night-garden.html','The Night Garden','A calm place to breathe and play for a few minutes. No sign-up, nothing to lose.'],
        ['/quick-checks.html#today','Today\u2019s Weather','One minute, and it tells you what today is actually good for.'],
        ['/wp-11.html','WP-11: the Calm-Down Kit','Decide now what settles you, so it is ready when it is needed.']
      ]},
    { id:'invisible', ico:'\uD83D\uDC41', label:'Nobody sees what I do',
      say:'That is the oldest problem in this program, and the reason it exists. Work that is never seen cannot be shared, and saying "you never help" rarely makes it visible. Writing it down does.',
      picks:[
        ['/book/preface.html','The Preface','Why unseen work builds up like a debt only one person can see.'],
        ['/workpapers/wp-01.html','WP-01: a week, written down','The record that turns an impression into something you can both read.'],
        ['/lemonade-stand.html','The Lemonade Stand','Tasks and hours side by side, in about five minutes.']
      ]},
    { id:'went-badly', ico:'\uD83D\uDCA5', label:'A conversation just went badly',
      say:'Before you replay it another forty times: two people can both be reasonable and still produce a squeal. Working out what slipped is more useful than working out who started it.',
      picks:[
        ['/carrier-wave-decoder.html','The Carrier Wave Decoder','A guided walk back through what actually happened.'],
        ['/workpapers/wp-09-tone-filter.html','WP-09: the Tone Transducer','Turns the thing you want to say into fact, feeling and ask.'],
        ['/check-ins.html','Check-ins','How to reopen it in a room that can hold it.']
      ]},
    { id:'say-hard', ico:'\u2709', label:'I need to say something hard',
      say:'Good. Saying it badly and saying nothing are both worse. It is worth testing the words first, because the same sentence lands very differently depending on who is receiving it.',
      picks:[
        ['/signal-translator.html','The Signal Translator','Type your sentence and see where it might land badly.'],
        ['/workpapers/wp-09-tone-filter.html','WP-09: the Tone Transducer','Fact, feeling, ask. Same content, far less damage.'],
        ['/check-ins.html','Check-ins','Pick the time and the room before you pick the words.']
      ]},
    { id:'past-each-other', ico:'\uD83D\uDCE1', label:'We talk past each other',
      say:'Often neither of you is being difficult. Two brains can process the same sentence differently, and the mismatch runs both ways rather than one person being wrong.',
      picks:[
        ['/wired-differently.html','Wired Differently','How fourteen kinds of wiring receive the same words.'],
        ['/wiring-card.html','Make a wiring card','Say how you receive things once, instead of every time.'],
        ['/book/chapter-1.html','Chapter I','Why reasonable people produce a squeal.']
      ]},
    { id:'know-myself', ico:'\uD83E\uDDED', label:'I want to understand myself better',
      say:'That is the half of the program you can do entirely alone, and it is the half everything else rests on. No partner, no permission, nothing to negotiate.',
      picks:[
        ['/quick-checks.html#today','Today\u2019s Weather','Start today. The almanac shows your patterns within a fortnight.'],
        ['/tools/frequency-calibration.html','Frequency Calibration','Your natural pace for decisions, contact and recovery.'],
        ['/learn/index.html','Stories from Philosophy','Twelve old stories that work as honest mirrors.']
      ]},
    { id:'keep-good', ico:'\uD83C\uDF31', label:'We are okay, and I want to keep it that way',
      say:'The best time to build the habit is now, while nothing is on fire. Almost nobody starts here, and the ones who do have a far easier time of it later.',
      picks:[
        ['/turning-toward.html','Turning toward','Seven small, everyday ways to build connection while things are good.'],
        ['/workpapers/wp-13-pll-protocol.html','WP-13: the 90-second check-in','The smallest habit here, and the one that lasts.'],
        ['/quick-checks.html#today','Today\u2019s Weather','A daily minute that keeps small things small.']
      ]},
    { id:'unsure', ico:'\uD83E\uDD14', label:'I am not sure this is for me',
      say:'Fair. It fits some situations and not others, and it is better to find that out now than after three worksheets. Nothing here costs anything while it is being built.',
      picks:[
        ['/is-this-for-you.html','Is this right for you?','What it is, what it is not, and who it does not suit.'],
        ['/how-it-works.html','How it works','The whole idea in plain language, in about four minutes.'],
        ['/ways-in.html','Ways in','What is free, what an email opens, and what each level shares.']
      ]}
  ];

  function el(t, a, h) {
    var n = document.createElement(t);
    if (a) for (var k in a) { if (a[k] !== null) n.setAttribute(k, a[k]); }
    if (h) n.innerHTML = h;
    return n;
  }
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  document.querySelectorAll('[data-tol-start]').forEach(function (host) {
    var compact = host.hasAttribute('data-compact');
    var wrap = el('div', { class: 'sw' + (compact ? ' is-compact' : '') });
    var opts = el('div', { class: 'sw-opts', role: 'group', 'aria-label': 'What is going on right now' });
    S.forEach(function (s) {
      var b = el('button', { type: 'button', class: 'sw-opt', 'aria-pressed': 'false', 'data-id': s.id },
        '<span class="sw-ico" aria-hidden="true">' + s.ico + '</span><span class="sw-label">' + esc(s.label) + '</span>');
      b.addEventListener('click', function () { choose(s, b); });
      opts.appendChild(b);
    });
    var out = el('div', { class: 'sw-out', 'aria-live': 'polite', hidden: '' });
    wrap.appendChild(opts); wrap.appendChild(out);
    host.appendChild(wrap);

    function choose(s, btn) {
      var was = btn.getAttribute('aria-pressed') === 'true';
      opts.querySelectorAll('.sw-opt').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      if (was) { out.hidden = true; out.innerHTML = ''; return; }
      btn.setAttribute('aria-pressed', 'true');
      var h = '<p class="sw-say">' + esc(s.say) + '</p><ol class="sw-picks">';
      s.picks.forEach(function (p) {
        h += '<li><a href="' + p[0] + '">' + esc(p[1]) + '</a><span>' + esc(p[2]) + '</span></li>';
      });
      h += '</ol><p class="sw-more">Something else going on? <a href="/contents.html">See everything in the program</a> or <a href="/relationships.html">pick by relationship</a>.</p>';
      out.innerHTML = h;
      out.hidden = false;
    }
  });
})();
