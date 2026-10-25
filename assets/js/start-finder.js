/* start-finder.js: "Find your starting point". Three quick questions, then ONE recommended exercise,
   one short read and one "or try this instead", with the reason ("Because you said ...").
   Use anywhere:  <div data-start-finder></div>  <script src="/assets/js/start-finder.js" defer></script>
     data-start-finder="compact"  smaller headings, for the home page
     data-url                     read ?who=&what=&time= from the address (the /start-here.html page sets it; /find-your-start.html now leads there)
   It loads its own styles (/assets/css/start-finder.css). Nothing is stored and nothing is sent. */
(function () {
  'use strict';
  if (window.TOLStartFinder) return;
  var doc = document;

  // [address, plain name, about how long, what it gives you]
  var T = {
    weather: ['/quick-checks.html', 'How am I right now?', 'about 1 minute', 'a one-minute read on what today has room for'],
    ladder: ['/ladder.html', 'How am I right now? Four quick taps', 'about 1 minute', 'four taps, then one calm step that fits'],
    upset: ['/upset-right-now.html', 'Upset right now? A 5-minute calm-down', 'about 5 minutes', 'pause, breathe and pick a time to come back'],
    garden: ['/night-garden.html', 'Breathing game (in Cool-down corner)', 'about 2 minutes', 'slow breaths, nothing to win or lose'],
    carry: ['/workpapers/wp-02-how-much-are-you-carrying.html', 'Load check: how much are you carrying?', 'about 2 minutes', 'five quick questions that separate what you’re already carrying from what just happened'],
    kit: ['/wp-11.html', 'Calm-down plan', 'about 10 minutes', 'decide ahead of time what you notice first and what settles you'],
    selfpath: ['/self-path.html', 'Your self-discovery path', 'a minute or two a step', 'small steps on your own, at your own pace'],
    wavelength: ['/wavelength.html', 'How you connect: the 2-minute style quiz', 'about 2 minutes', 'twelve either/or taps that put how you talk and listen into words'],
    wiring: ['/wiring-card.html', 'How you connect: how to talk to me, a card', 'about 10 minutes', 'a one-page card on what helps words reach you'],
    flip: ['/small-wins.html#flip-it', 'Turn a complaint into a request', 'about 2 minutes', 'a complaint or worry turned into a request or a plan'],
    signal: ['/signal-translator.html', 'Chat analyzer', 'about 2 minutes', 'see how a message may land and a calmer version that keeps your ask, or paste a whole chat to see where it turned'],
    shifter: ['/carrier-wave-decoder.html?tab=their-side', 'See it from their side', 'about 5 minutes', 'their side of the moment, and questions to ask instead of guessing'],
    decoder: ['/carrier-wave-decoder.html', 'After a talk went wrong: a step-by-step reset', 'about 20 minutes', 'work out what slipped, settle, and practice what to say next time'],
    write: ['/write-it-through.html', 'Talk it through in writing', 'about 10 minutes, then a wait', 'one topic, facts not verdicts, one clear ask'],
    landit: ['/workpapers/wp-09-say-it-so-it-lands.html', 'Before you reply: say it so it lands', 'about 5 minutes', 'a fact, a feeling and one kind ask'],
    pause: ['/pursue-withdraw.html#plan-h', 'Make a pause plan for arguments (in Cool-down corner)', 'about 10 minutes', 'a pause word, a break length and a time to come back, agreed on a calm day'],
    checkin: ['/check-ins.html#card', 'Kitchen-table check-in: weekly, or a family plan', 'about 5 minutes', 'one topic, a set time and a calm start'],
    no: ['/signal-translator.html#write-no', 'Say no kindly (Chat analyzer: Help me write it)', 'about 2 minutes', 'three kind, clear ways to say no that you can copy and change'],
    daily: ['/workpapers/wp-13-daily-check-in.html', '90-second daily check-in', 'about 90 seconds a day', 'one sentence each, so small things stay small'],
    lemonq: ['/lemonade-stand.html#quick', 'Who does what? The quick look', 'about 2 minutes', 'the jobs and bills on one list, and the split in plain words'],
    owner: ['/workpapers/wp-03-one-owner-per-job.html', 'One owner per job: a who-owns-what list', 'about 30 minutes', 'every regular job gets one owner, so nobody has to keep asking'],
    keeps: ['/workpapers/wp-04-what-keeps-coming-back.html', 'What keeps coming back?', 'about 20 minutes, once a month', 'find what keeps slipping and fix the setup, not the person'],
    room: ['/sharing-a-room.html#agreement-h', 'Plan it once: a room agreement', 'about 5 minutes', 'quiet hours, guests and cleaning, written down together'],
    deal: ['/gaming-and-time-together.html#deal-h', 'Plan it once: a time-together deal (games and phones)', 'about 10 minutes', 'a small deal so both of you feel chosen'],
    week: ['/different-hours.html#our-week', 'Plan it once: our week on one page', 'about 10 minutes', 'both schedules, protected sleep and one together time'],
    work: ['/work.html#owner-list', 'Team job list: one owner and a backup', 'about 20 minutes', 'every recurring job with one owner and a backup'],
    bond: ['/bonding.html#bd-picker', 'Stay close: one small bonding idea', 'about 1 minute to pick', 'one small idea sized to your time and energy'],
    turn: ['/turning-toward.html', 'Turning toward: a 7-day start', 'about 1 minute a day', 'tiny everyday ways to reach back'],
    care: ['/love-languages.html#ll-card-h', 'How you connect: what feels like care, a card', 'about 5 minutes', 'the specific small things that make you feel cared for'],
    touch: ['/touchstones.html#ts-card-h', 'Stay close: your shared words and rituals', 'about 5 minutes', 'the jokes, names and rituals that say “we’re us”'],
    rhythms: ['/tools/frequency-calibration.html', 'Compare your daily rhythms', 'about 10 minutes', 'where your pace for money, plans and rest differs, and one small agreement each'],
    six: ['/week-0.html', 'Six gentle weeks, starting with week 0', 'five minutes, then one small step a week', 'a gentle structure, alone or with anyone']
  };
  // [address, title]
  var R = {
    fighting: ['/how-to-stop-fighting-with-your-partner.html', 'How to stop fighting: seven calm steps'],
    pursue: ['/pursue-withdraw.html', 'One wants to talk now, one needs space'],
    invisible: ['/invisible-labor-mental-load.html', 'Invisible labour and the mental load'],
    complacency: ['/complacency.html', 'Complacency: why “it’s fine” stops being checked'],
    wired: ['/wired-differently.html', 'Wired differently: how people hear the same words'],
    know: ['/know-yourself.html', 'Know your own wiring'],
    load: ['/share-the-load.html', 'Share the load: which tool to use first'],
    roommates: ['/share-the-load.html#roommates', 'Roommates: chores, bills and a house meeting'],
    friends: ['/friends.html', 'Friends: when a friendship drifts'],
    parents: ['/parents.html', 'For parents: big feelings, siblings and teens'],
    grown: ['/grown-up-children.html', 'Grown-up children and parents'],
    obligations: ['/family-obligations.html', 'Family, money and in-laws'],
    turning: ['/turning-toward.html', 'Turning toward: seven small ways to connect'],
    checkins: ['/check-ins.html', 'Check-ins: one hard topic, at a calm time'],
    work: ['/work.html', 'At work: fair workloads, clear messages, real thanks'],
    thanks: ['/appreciation-at-work.html', 'Appreciation at work'],
    more: ['/more-than-two.html', 'More than two partners: sharing the load'],
    hours: ['/different-hours.html', 'Different hours: nights, shifts, and the one at home'],
    exHouse: ['/examples.html#housemates', 'What small changes look like: roommates (made-up example)'],
    exSiblings: ['/examples.html#siblings', 'What small changes look like: adult siblings (made-up example)'],
    exWork: ['/examples.html#cofounders', 'What small changes look like: co-founders (made-up example)'],
    exPoly: ['/examples.html#poly', 'What small changes look like: a polyamorous home (made-up example)']
  };

  // who -> [label, "because" phrase, together?, [what id, label, [2 min, 10 min, longer], read, fallback alt]]
  var WHO = [
    ['me', 'Just me', 'it’s just you', false, [
      ['stressed', 'I’m stressed or running on empty', ['carry', 'kit', 'selfpath'], 'know', 'garden'],
      ['upset', 'I’m upset right now', ['upset', 'upset', 'kit'], 'pursue', 'garden'],
      ['understand', 'I want to understand myself better', ['wavelength', 'wiring', 'selfpath'], 'know', 'weather'],
      ['message', 'A message I got, or want to send, is bothering me', ['signal', 'landit', 'write'], 'wired', 'shifter'],
      ['load', 'I’m carrying too much at home', ['carry', 'lemonq', 'owner'], 'invisible', 'no']
    ]],
    ['partner', 'A partner', 'it’s about a partner', true, [
      ['same', 'We keep having the same argument', ['shifter', 'pause', 'decoder'], 'fighting', 'keeps'],
      ['space', 'One of us wants to talk now, the other needs space', ['ladder', 'pause', 'kit'], 'pursue', 'checkin'],
      ['chores', 'Chores or the mental load feel unfair', ['carry', 'lemonq', 'owner'], 'invisible', 'daily'],
      ['distant', 'We feel a bit distant', ['turn', 'care', 'bond'], 'complacency', 'daily'],
      ['text', 'A text or message went wrong', ['signal', 'landit', 'write'], 'wired', 'shifter'],
      ['screens', 'Phones, gaming or different schedules', ['turn', 'deal', 'week'], 'hours', 'rhythms']
    ]],
    ['family', 'Family', 'it’s about family', true, [
      ['tension', 'Arguments or tension at home', ['shifter', 'checkin', 'decoder'], 'parents', 'pause'],
      ['work', 'Sharing the work at home', ['carry', 'lemonq', 'owner'], 'load', 'daily'],
      ['hardtalk', 'A hard talk with a parent, grown child or sibling is coming', ['signal', 'landit', 'write'], 'grown', 'shifter'],
      ['close', 'We’d like to feel closer', ['bond', 'touch', 'turn'], 'exSiblings', 'care'],
      ['no', 'I need to say no to a family request', ['no', 'landit', 'write'], 'obligations', 'carry']
    ]],
    ['friend', 'A friend', 'it’s about a friend', true, [
      ['drift', 'We’ve drifted apart', ['bond', 'turn', 'touch'], 'friends', 'signal'],
      ['fallout', 'We had a falling out', ['shifter', 'landit', 'write'], 'friends', 'signal'],
      ['text', 'A message went wrong', ['signal', 'landit', 'write'], 'friends', 'shifter'],
      ['no', 'I need to say no or set a limit', ['no', 'landit', 'write'], 'friends', 'carry']
    ]],
    ['house', 'Housemates', 'it’s about roommates', true, [
      ['chores', 'Chores and bills feel unfair', ['lemonq', 'lemonq', 'owner'], 'roommates', 'checkin'],
      ['room', 'Noise, guests, sleep or room rules', ['signal', 'room', 'room'], 'roommates', 'landit'],
      ['meeting', 'We need a house meeting', ['checkin', 'checkin', 'owner'], 'roommates', 'lemonq'],
      ['unspoken', 'Tension nobody has talked about', ['shifter', 'landit', 'checkin'], 'exHouse', 'signal']
    ]],
    ['work', 'Work', 'it’s about work', true, [
      ['owners', 'Nobody is sure who owns what', ['carry', 'work', 'work'], 'work', 'keeps'],
      ['message', 'A message landed badly, or I need to send a hard one', ['signal', 'landit', 'landit'], 'wired', 'shifter'],
      ['overload', 'Too much on my plate', ['carry', 'no', 'kit'], 'work', 'work'],
      ['thanks', 'We’d like to appreciate each other better', ['daily', 'wiring', 'wavelength'], 'thanks', 'bond']
    ]],
    ['many', 'More than two of us', 'there are more than two of you', true, [
      ['load', 'Sharing the load among three or more', ['lemonq', 'lemonq', 'owner'], 'more', 'keeps'],
      ['same', 'The same argument keeps coming back', ['shifter', 'pause', 'keeps'], 'more', 'checkin'],
      ['time', 'Time together and schedules', ['turn', 'rhythms', 'week'], 'more', 'deal'],
      ['text', 'A message went wrong', ['signal', 'landit', 'write'], 'exPoly', 'shifter']
    ]]
  ];
  var TIME = [['2', '2 minutes', 'about 2 minutes, or not much energy'], ['10', '10 minutes', 'about 10 minutes'], ['more', 'Longer', 'more time']];

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i][0] === id) return list[i]; return null; }
  function lower1(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function quoteWhat(s) { return /^(I|I’m|I’d)\b/.test(s) ? s : lower1(s); }

  function ensureCss() {
    var links = doc.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < links.length; i++) if ((links[i].getAttribute('href') || '').indexOf('start-finder.css') >= 0) return;
    var l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = '/assets/css/start-finder.css'; doc.head.appendChild(l);
  }

  var n = 0;
  function chips(name, items, legend, hint) {
    return '<fieldset class="sf-q" data-q="' + name + '"><legend class="sf-legend">' + legend + '</legend>' +
      (hint ? '<p class="sf-hint">' + hint + '</p>' : '') +
      '<div class="sf-chips">' + items.map(function (it) {
        return '<label class="sf-chip"><input type="radio" name="' + name + '" value="' + esc(it[0]) + '"><span>' + esc(it[1]) + '</span></label>';
      }).join('') + '</div></fieldset>';
  }

  function mount(root) {
    if (root.getAttribute('data-sf-done')) return;
    root.setAttribute('data-sf-done', '1');
    var id = 'sf' + (++n), compact = root.getAttribute('data-start-finder') === 'compact';
    root.classList.add('sf', 'tol-plain', 'no-bubble', 'no-cheer', 'no-dive');
    if (compact) root.classList.add('sf-compact');
    root.innerHTML =
      '<form class="sf-form" novalidate>' +
      chips(id + '-who', WHO.map(function (w) { return [w[0], w[1]]; }), '<span class="sf-n">1</span> Who is it about?') +
      '<fieldset class="sf-q" data-q="what"><legend class="sf-legend"><span class="sf-n">2</span> What’s going on?</legend>' +
      '<div class="sf-chips sf-what"><p class="sf-wait">Pick who it’s about first.</p></div></fieldset>' +
      chips(id + '-time', TIME.map(function (t) { return [t[0], t[1]]; }), '<span class="sf-n">3</span> How much time and energy do you have?') +
      '</form>' +
      '<div class="sf-out" aria-live="polite"></div>';

    var form = root.querySelector('.sf-form'), whatBox = root.querySelector('.sf-what'), out = root.querySelector('.sf-out');
    var st = { who: '', what: '', time: '' };

    function drawWhat() {
      var w = find(WHO, st.who);
      if (!w) { whatBox.innerHTML = '<p class="sf-wait">Pick who it’s about first.</p>'; return; }
      whatBox.innerHTML = w[4].map(function (x) {
        return '<label class="sf-chip"><input type="radio" name="' + id + '-what" value="' + esc(x[0]) + '"' + (x[0] === st.what ? ' checked' : '') + '><span>' + esc(x[1]) + '</span></label>';
      }).join('');
    }

    function card(k, big) {
      var t = T[k];
      return '<a class="' + (big ? 'sf-go' : 'sf-alt-a') + '" href="' + esc(t[0]) + '">' +
        '<span class="sf-go-t">' + esc(t[1]) + '</span><span class="sf-go-m">' + esc(t[2]) + ' · ' + esc(t[3]) + '</span></a>';
    }

    function draw() {
      var w = find(WHO, st.who), x = w && find(w[4], st.what), tm = find(TIME, st.time);
      if (!w || !x || !tm) { out.innerHTML = ''; return; }
      var slot = st.time === '2' ? 0 : st.time === '10' ? 1 : 2;
      var pick = x[2][slot];
      // "or try this instead": the next size up (or down), else this answer's own second idea
      var alt = x[2][slot === 2 ? 1 : slot + 1];
      if (!alt || alt === pick) alt = x[2][slot === 0 ? 2 : 0];
      if (!alt || alt === pick) alt = x[4];
      var read = R[x[3]];
      var because = 'Because you said ' + esc(w[2]) + ', “' + esc(quoteWhat(x[1])) + ',” and you have ' + esc(tm[2]) + '.';
      var h = '<div class="sf-res" tabindex="-1">' +
        '<p class="sf-k">Your starting point</p>' + card(pick, true) +
        '<p class="sf-why">' + because + '</p>';
      if (st.what === 'upset' || pick === 'upset') h += '<p class="sf-note">Come back to the topic later, at a time you name. Nothing needs solving in the next five minutes.</p>';
      else if (w[3]) h += '<p class="sf-note">Doing it with someone? Ask first, and each answer for yourself. Either of you can stop, and nothing is shared unless you send it. Going on alone is fine too.</p>';
      h += '<div class="sf-more">' +
        (read ? '<p class="sf-line"><span class="sf-k2">One short read</span> <a href="' + esc(read[0]) + '">' + esc(read[1]) + '</a></p>' : '') +
        (alt && T[alt] ? '<p class="sf-line"><span class="sf-k2">Or try this instead</span> <a href="' + esc(T[alt][0]) + '">' + esc(T[alt][1]) + '</a> <span class="sf-soft">' + esc(T[alt][2]) + '</span></p>' : '') +
        '</div>' +
        '<p class="sf-again"><button type="button" class="sf-reset">Start over</button></p>' +
        '</div>';
      out.innerHTML = h;
      out.querySelector('.sf-reset').addEventListener('click', reset);
    }

    function reset() {
      st = { who: '', what: '', time: '' };
      Array.prototype.forEach.call(form.querySelectorAll('input'), function (i) { i.checked = false; });
      drawWhat(); draw();
      var first = form.querySelector('input'); if (first) first.focus();
    }

    form.addEventListener('change', function (e) {
      var t = e.target; if (!t || t.type !== 'radio') return;
      if (t.name === id + '-who') { if (st.who !== t.value) { st.who = t.value; st.what = ''; drawWhat(); } }
      else if (t.name === id + '-what') st.what = t.value;
      else if (t.name === id + '-time') st.time = t.value;
      draw();
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); });

    // optional: ?who=&what=&time= on the page's address
    if (root.hasAttribute('data-url')) {
      try {
        var q = new URLSearchParams(location.search);
        var who = q.get('who'), what = q.get('what'), time = q.get('time');
        if (who && find(WHO, who)) {
          st.who = who; form.querySelector('input[name="' + id + '-who"][value="' + who + '"]').checked = true;
          if (what && find(find(WHO, who)[4], what)) st.what = what;
          drawWhat();
        }
        if (time && find(TIME, time)) { st.time = time; form.querySelector('input[name="' + id + '-time"][value="' + time + '"]').checked = true; }
        draw();
      } catch (e) { /* no params */ }
    }
  }

  function mountAll() {
    var els = doc.querySelectorAll('[data-start-finder]');
    if (!els.length) return;
    ensureCss();
    Array.prototype.forEach.call(els, mount);
  }
  window.TOLStartFinder = { mount: mount, mountAll: mountAll, tools: T, reads: R, who: WHO };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mountAll);
  else mountAll();
})();
