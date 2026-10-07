/* Start where you are — a situation chooser.
   Drop <div data-tol-start></div> on any page (optionally data-compact) and include this file.
   Nothing is stored or sent; it only routes people to the right page. */
(function () {
  var S = [
    { id:'same-fight', ico:'\uD83D\uDD01', label:'We keep having the same fight',
      say:'Then the argument probably is not about the dishes, the money or the calendar. A thing that comes back every week is usually a gap in the arrangement, and arrangements can be changed without anybody being at fault.',
      picks:[
        ['/workpapers/wp-03-raci-treaty.html','WP-03: one owner per job','Most repeat fights live in jobs nobody formally owns.'],
        ['/workpapers/wp-04-deficit-audit.html','WP-04: the monthly look-back','Sorts what keeps going wrong into a gap in the setup, too little time or energy, or a one-off.'],
        ['/check-ins.html','Check-ins','How to raise it once, properly, instead of ten times badly.']
      ]},
    { id:'empty', ico:'\uD83E\uDEAB', label:'I am running on empty',
      say:'That deserves attention before anything else does. Nothing in the program works well from an empty tank, and you are allowed to start by looking after yourself.',
      picks:[
        ['/night-garden.html','The Night Garden','A calm place to breathe and play for a few minutes. No sign-up, nothing to lose.'],
        ['/quick-checks.html#today','Today\u2019s Weather','One minute, and it tells you what today is actually good for.'],
        ['/wp-11.html','WP-11: the Calm-Down Kit','Decide now what settles you, so it is ready when it is needed.']
      ]},
    { id:'caring', ico:'\uD83E\uDD1D', label:'I\u2019m looking after someone I love',
      say:'Caring for a parent, or for a husband, wife or partner after surgery or an illness, can get heavy quietly. Start with your own battery, because you matter here too. Then try one small thing today: a one-minute break, or asking one person for one specific help, like \u201cCould you do Thursday\u2019s drive?\u201d',
      picks:[
        ['/relationships-in-depth.html#caregivers','Caregivers: where to start','What to notice, and how to share the care so it does not all land on you.'],
        ['/workpapers/wp-02-battery-stress-meter.html','The battery check (WP-02)','A quick look at how full your battery is today, before you judge the day.'],
        ['#breathe','Breathe','A one-minute calm break, right here on this page.']
      ]},
    { id:'home-bills', ico:'\uD83C\uDFE0', label:'We share a home and the bills',
      say:'Shared homes run more smoothly when everyone sees the same list. Put every job and every bill on one page, agree how the rent and bills are split, and talk about money at a set time, starting with the numbers rather than with who is late. This works with three or more people, too.',
      picks:[
        ['/relationships-in-depth.html#roommates','Roommates: rent, bills and three or more people','A shared-expenses note, fair splits, and how to talk about money without a fight.'],
        ['/lemonade-stand.html','The Lemonade Stand','Jobs and hours side by side. Works with more than two people.'],
        ['/signal-translator.html','The Signal Translator','Test your opening line about money before the house meeting.']
      ]},
    { id:'invisible', ico:'\uD83D\uDC41', label:'Nobody sees what I do',
      say:'That is the oldest problem in this program, and the reason it exists. Work that is never seen cannot be shared, and saying "you never help" rarely makes it visible. Writing it down does.',
      picks:[
        ['/book/preface.html','The Preface','Why unseen work builds up like a debt only one person can see.'],
        ['/workpapers/wp-01.html','WP-01: a week, written down','The record that turns an impression into something you can both read.'],
        ['/lemonade-stand.html','The Lemonade Stand','Tasks and hours side by side, in about five minutes.']
      ]},
    { id:'went-badly', ico:'\uD83D\uDCA5', label:'A conversation just went badly',
      say:'Before you replay it another forty times: two people can both be reasonable and still end up out of tune. Working out what slipped is more useful than working out who started it.',
      picks:[
        ['/carrier-wave-decoder.html','The Carrier Wave Decoder','A guided walk back through what actually happened.'],
        ['/workpapers/wp-09-tone-filter.html','WP-09: the Tone Filter','Turns the thing you want to say into fact, feeling and ask.'],
        ['/check-ins.html','Check-ins','How to reopen it in a room that can hold it.']
      ]},
    { id:'say-hard', ico:'\u2709', label:'I need to say something hard',
      say:'Good. Saying it badly and saying nothing are both worse. It is worth testing the words first, because the same sentence lands very differently depending on who is receiving it.',
      picks:[
        ['/signal-translator.html','The Signal Translator','Type your sentence and see where it might land badly.'],
        ['/workpapers/wp-09-tone-filter.html','WP-09: the Tone Filter','Fact, feeling, ask. Same content, far less damage.'],
        ['/check-ins.html','Check-ins','Pick the time and the room before you pick the words.']
      ]},
    { id:'past-each-other', ico:'\uD83D\uDCE1', label:'We talk past each other',
      say:'Often neither of you is being difficult. Two brains can process the same sentence differently, and the mismatch runs both ways rather than one person being wrong.',
      picks:[
        ['/wired-differently.html','Wired Differently','How fourteen kinds of wiring receive the same words.'],
        ['/wavelength.html','Wavelength','Find both of your Wave Codes and compare them, to see where to tune in on purpose.'],
        ['/wiring-card.html','Make a wiring card','Say how you receive things once, instead of every time.'],
        ['/book/chapter-1.html','Chapter I','Why reasonable people produce a squeal.']
      ]},
    { id:'know-myself', ico:'\uD83E\uDDED', label:'I want to understand myself better',
      say:'That is the half of the program you can do entirely alone, and it is the half everything else rests on. No partner, no permission, nothing to negotiate.',
      picks:[
        ['/self-path.html','Your self-discovery path','Step by step, on your own: your battery, your wiring, what settles you and kind ways to say no.'],
        ['/book/self-2-now-in-depth.html#control','Your circle of control','What is yours to do, what is theirs to decide, and how to match energy kindly.'],
        ['/wavelength.html','Wavelength','How you think, talk and listen: your wiring, your Wave Code and sixteen self-discovery chapters.'],
        ['/quick-checks.html#today','Today\u2019s Weather','Start today. Within two weeks, the almanac shows your patterns.']
      ]},
    { id:'give-too-much', ico:'\u2696', label:'I give more than I get back',
      say:'Quiet resentment, a silent scorecard and being tired before the day starts are not character flaws. They are a budget running in the red, and the fix starts on your side of the line.',
      picks:[
        ['/book/self-2-now-in-depth.html#control','Your circle of control, and matching energy','Signs you are over-giving, and how to match care and effort kindly.'],
        ['/self-path.html','Your self-discovery path','A gentle first week, including kind ways to say no.'],
        ['/workpapers/wp-02-battery-stress-meter.html','The battery check (WP-02)','How full your battery really is today.']
      ]},
    { id:'child-teen', ico:'\uD83E\uDDD2', label:'Things are hard with my child or teen',
      say:'Pulling away and pushing back are a normal part of growing up, and they can still hurt. Side-by-side time, short talks and listening first usually help more than the perfect speech.',
      picks:[
        ['/library/life.html#teenagers','Talking with teenagers','What the research says about conflict with teens, and where it stops.'],
        ['/turning-toward.html','Turning toward','Small, everyday ways to stay connected.'],
        ['/workpapers/wp-13-pll-protocol.html','WP-13: the 90-second check-in','A tiny daily habit that keeps the door open.']
      ]},
    { id:'not-safe', ico:'\uD83D\uDEE1', label:'I don\u2019t feel safe with someone',
      say:'If someone hurts, threatens, watches or controls you, that is not a communication problem and it is not your fault. Please skip the tools here and talk to people who help with this every day.',
      picks:[
        ['/safety.html','Not safe at home?','Free hotlines, how to leave this site quickly, and how to clear what it keeps.']
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
      ]},
    { id:'group', ico:'\uD83D\uDC65', label:'I want to use this with a group',
      say:'A church small group, a couples\u2019 class or a community circle can use the free pages together, with no sign-up for anyone.',
      picks:[
        ['/groups.html','Leading a group','Six sessions with discussion questions and one-page handouts.'],
        ['/check-ins.html','Check-ins','A good first session: hear it back before you answer.']
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
    var out = el('div', { class: 'sw-out', 'aria-live': 'polite', tabindex: '-1', hidden: '' });
    out.style.scrollMarginTop = '5rem';
    out.style.outline = 'none';
    out.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[data-breathe]');
      var btn = document.querySelector('.tol-breathe-btn');
      if (a && btn) { e.preventDefault(); btn.click(); }
    });
    wrap.appendChild(opts); wrap.appendChild(out);
    host.appendChild(wrap);

    function choose(s, btn) {
      var was = btn.getAttribute('aria-pressed') === 'true';
      opts.querySelectorAll('.sw-opt').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      if (was) { out.hidden = true; out.innerHTML = ''; return; }
      btn.setAttribute('aria-pressed', 'true');
      var h = '<p class="sw-say">' + esc(s.say) + '</p><ol class="sw-picks">';
      s.picks.forEach(function (p) {
        // '#breathe' opens the site's Breathe break (the Night Garden if that button is missing)
        var link = p[0] === '#breathe' ? 'href="/night-garden.html" data-breathe="1"' : 'href="' + p[0] + '"';
        h += '<li><a ' + link + '>' + esc(p[1]) + '</a><span>' + esc(p[2]) + '</span></li>';
      });
      h += '</ol><p class="sw-more">Something else going on? <a href="/contents.html">See everything in the program</a> or <a href="/relationships.html">pick by relationship</a>.</p>';
      out.innerHTML = h;
      out.hidden = false;
      // bring the answer into view and move focus to it, so it never opens off-screen
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      try { out.focus({ preventScroll: true }); } catch (e) { out.focus(); }
      out.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
    }
  });
})();
