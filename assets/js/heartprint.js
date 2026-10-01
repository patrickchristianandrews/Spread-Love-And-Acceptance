/* heartprint.js — Your Heartprint: a guided personal statement. Nine short steps of tap-to-choose (and a line in your
   own words, if you like) become a warm, first-person statement you can share with the people in your life. As you
   choose, "Things you might not have noticed" shows connections between your choices that are easy to miss, each
   with the field it comes from, the pillar it belongs to and a tool to try.
   Everything happens in this browser. Nothing is sent anywhere. A draft is kept on this device only if you turn
   that on, and "Start over" erases it. */
(function () {
  'use strict';
  var root = document.querySelector('[data-heartprint]');
  if (!root) return;
  var KEY = 'tol-heartprint-v1';
  try { var old = localStorage.getItem('tol-pawprint-v1'); if (old && !localStorage.getItem(KEY)) localStorage.setItem(KEY, old); localStorage.removeItem('tol-pawprint-v1'); } catch (e) {}

  // ---------- the steps: each choice has a short label and the words it adds to the statement ----------
  var STEPS = [
    { id: 'now', t: 'Right now, in my life', q: 'What’s going on for you these days? Pick any that fit.', lead: 'Right now, ', join: 'and',
      o: [['busy', 'A busy season', 'I’m in a busy season'], ['caring', 'Caring for someone', 'I’m caring for someone'], ['kids', 'Kids at home', 'I have kids at home'],
          ['newjob', 'A new job or role', 'I’m settling into a new job'], ['study', 'Studying', 'I’m studying'], ['move', 'A move or a big change', 'I’m in the middle of a big change'],
          ['money', 'Watching money closely', 'I’m watching money closely'], ['shared', 'Sharing a home', 'I’m sharing a home'], ['calm', 'A calmer season', 'life is fairly calm']] },
    { id: 'wired', t: 'How I’m wired', q: 'How do you tend to work? Pick the ones that sound like you.', lead: 'About how I’m wired: ', join: 'and',
      o: [['alone', 'I recharge on my own', 'I recharge on my own'], ['people', 'I recharge with people', 'I recharge with people'],
          ['thinkfirst', 'I think first, then talk', 'I think first and talk second'], ['thinkloud', 'I think out loud', 'I think out loud'],
          ['direct', 'I say things directly', 'I say things directly'], ['hint', 'I hint more than I say', 'I tend to hint rather than say it straight'],
          ['plans', 'I like a plan', 'I like to have a plan'], ['flow', 'I go with the flow', 'I like to go with the flow'],
          ['details', 'I notice the details', 'I notice the small details'], ['bigpic', 'I see the big picture', 'I see the big picture first'],
          ['senses', 'Noise, light or crowds get to me', 'noise, bright light or crowds wear me out quickly'], ['fast', 'I move fast', 'I move quickly'], ['slow', 'I take my time', 'I like to take my time']] },
    { id: 'fills', t: 'What fills my battery', q: 'What leaves you feeling more like yourself?', lead: 'What fills my battery: ', join: 'and', list: true,
      o: [['outside', 'Time outside', 'time outside'], ['music', 'Music', 'music'], ['quiet', 'Quiet time', 'quiet time'], ['move', 'Moving my body', 'moving my body'],
          ['talk', 'Talking it through', 'talking things through'], ['make', 'Making things', 'making something with my hands'], ['sleep', 'A good night’s sleep', 'a good night’s sleep'],
          ['pets', 'Time with pets', 'time with animals'], ['together', 'Time together, no agenda', 'unhurried time together'], ['order', 'A tidy space', 'a tidy space'], ['laugh', 'Laughing', 'a good laugh']] },
    { id: 'drains', t: 'What drains it', q: 'What wears you down faster than people might guess?', lead: 'What drains it: ', join: 'and', list: true,
      o: [['change', 'Last-minute changes', 'last-minute changes'], ['clutter', 'Clutter', 'clutter'], ['openconflict', 'Conflict left hanging', 'a disagreement left hanging'],
          ['interrupt', 'Being interrupted', 'being interrupted'], ['messages', 'Too many messages', 'a flood of messages'], ['vague', 'Plans that stay vague', 'plans that stay vague'],
          ['unseen', 'Feeling unseen', 'feeling that my effort goes unseen'], ['rushed', 'Being rushed', 'being rushed'], ['noise', 'Noise and busy places', 'noise and busy places'], ['alonetoo', 'Too much time alone', 'too much time alone']] },
    { id: 'stretched', t: 'When I’m stretched, you might notice', q: 'When your battery runs low, what do people see on the outside?', lead: 'When I’m stretched, you might notice that ', join: 'or',
      o: [['quiet', 'I go quiet', 'I go quiet'], ['short', 'I get short', 'I get short with people'], ['plan', 'I over-plan', 'I start over-planning'],
          ['space', 'I need space', 'I need some space'], ['talkmore', 'I talk more', 'I talk more than usual'], ['hide', 'I hide it well', 'I hide it well, so it can be hard to tell'], ['busy', 'I keep busy', 'I keep myself very busy']] },
    { id: 'helps', t: 'What helps me then', q: 'What actually helps when you’re stretched?', lead: 'What helps then: ', join: 'and', list: true,
      o: [['headsup', 'A heads-up', 'a heads-up before plans change'], ['spacetime', 'Space, with a time to come back', 'some space, with a time we’ll talk again'], ['practical', 'Practical help', 'practical help with one specific thing'],
          ['okay', 'Hearing that we’re okay', 'hearing that we’re okay'], ['written', 'A message instead of a talk', 'a written message instead of a big talk'], ['hug', 'A hug', 'a hug'],
          ['listen', 'Listening, no fixing', 'listening without trying to fix it'], ['food', 'Food and rest first', 'food and rest before anything serious']] },
    { id: 'care', t: 'How I show care', q: 'How does your love and care usually come out?', lead: 'How I show care: ', join: 'and', list: true,
      o: [['doing', 'Doing things for people', 'doing practical things for the people I love'], ['words', 'Kind words', 'kind words'], ['time', 'Time together', 'spending time together'],
          ['gifts', 'Small gifts', 'small gifts'], ['remember', 'Remembering details', 'remembering the details that matter to you'], ['fixing', 'Fixing problems', 'fixing problems'], ['checkin', 'Checking in', 'checking in on how you are']] },
    { id: 'unseen', t: 'The work I do that may go unseen', q: 'Which of these quietly lands on you?', lead: 'Work I do that may go unseen: ', join: 'and', list: true,
      o: [['dates', 'Remembering dates', 'remembering dates and appointments'], ['planning', 'Planning ahead', 'planning ahead'], ['peace', 'Keeping the peace', 'keeping the peace'],
          ['lowon', 'Noticing what’s running low', 'noticing what’s running low'], ['family', 'Keeping in touch with family', 'keeping in touch with family'], ['forms', 'Forms, bills and admin', 'forms, bills and admin'],
          ['mood', 'Reading the mood in the room', 'reading the mood in the room']] },
    { id: 'values', t: 'What matters most to me', q: 'Pick up to four things that matter most.', lead: 'What matters most to me: ', join: 'and', list: true, max: 4,
      o: [['fair', 'Fairness', 'fairness'], ['honest', 'Honesty', 'honesty'], ['kind', 'Kindness', 'kindness'], ['grow', 'Growing', 'growing as a person'], ['calm', 'Calm', 'a calm home'],
          ['fun', 'Fun', 'fun'], ['family', 'Family', 'family'], ['indep', 'Independence', 'independence'], ['faith', 'Faith', 'faith'], ['reliable', 'Being reliable', 'being someone you can count on']] }
  ];
  var BYSTEP = {}; STEPS.forEach(function (s) { BYSTEP[s.id] = s; });

  // ---------- connections you might not have noticed ----------
  // when: every [step, choice] listed must be picked. Each has the field it comes from, the pillar, and a tool.
  var F = { ps: 'Psychology', ph: 'Philosophy', bs: 'Behavioral science', nb: 'Neurobiology', ec: 'Economics', bu: 'Business', fi: 'Finance', ht: 'Holistic practice', ar: 'The senses' };
  var PIL = { 1: ['Pillar I, See the whole load', 'see-the-load'], 2: ['Pillar II, Fix the setup, not the person', 'fix-the-setup'], 3: ['Pillar III, Read your state first', 'read-your-state'],
    4: ['Pillar IV, Tune how you send and receive', 'tune-signals'], 5: ['Pillar V, Notice the quiet incentives', 'quiet-incentives'] };
  var INSIGHTS = [
    { when: [['wired', 'alone'], ['stretched', 'quiet']], f: 'ps', p: 4, t: 'Your quiet can be read as being upset with someone.', d: 'If you recharge alone and go quiet when stretched, the people around you may guess it’s about them. One line in your Heartprint, “When I go quiet, I’m recharging, not upset with you,” saves a lot of guessing.', l: ['Wired Differently', '/wired-differently.html'] },
    { when: [['wired', 'direct']], f: 'ps', p: 4, t: 'Direct words can land harder than you mean them.', d: 'People who say things straight are often heard as sharper than they intend, especially by people who hint. Adding a softener or a reason (“because I want to get this right”) keeps your meaning and lowers the static.', l: ['The Signal Translator', '/signal-translator.html'] },
    { when: [['wired', 'hint']], f: 'ps', p: 4, t: 'Hints can go unheard, then turn into disappointment.', d: 'If you tend to hint, a literal listener may miss it completely, and you may feel let down by someone who never knew. Try saying one plain ask, out loud, once.', l: ['Say it so it lands (WP-09)', '/workpapers/wp-09-tone-filter.html'] },
    { when: [['wired', 'thinkfirst'], ['drains', 'openconflict']], f: 'bs', p: 3, t: 'You need time to answer, and you hate leaving things open.', d: 'Those two pull against each other. The answer is a named time: “Can I think about it and come back to you at eight?” It gives you room without leaving the disagreement hanging.', l: ['Chapter III: later, not never', '/book/chapter-3.html'] },
    { when: [['wired', 'thinkloud']], f: 'ps', p: 4, t: 'Thinking out loud can sound like deciding.', d: 'When you process by talking, others may take a half-formed idea as a firm plan, or as criticism. A quick “I’m thinking out loud here” changes how every sentence after it is heard.', l: ['Chapter I: what was meant and what was heard', '/book/chapter-1.html'] },
    { when: [['wired', 'plans'], ['drains', 'change']], f: 'nb', p: 3, t: 'A heads-up can turn a change from a jolt into a shrug.', d: 'For a planner, a sudden change isn’t just inconvenient; it lands in the body first. Asking for even ten minutes’ warning, by name, is a small request with a big effect.', l: ['Today’s Weather', '/quick-checks.html#today'] },
    { when: [['wired', 'senses']], f: 'ar', p: 3, t: 'Where and when you talk is part of the conversation.', d: 'If noise, light or crowds wear you out, a hard talk in a busy room starts with your battery already low. Suggest a quiet place and a calm time for anything important.', l: ['Chapter IV: giving a comment time to land', '/book/chapter-4.html'] },
    { when: [['drains', 'noise']], f: 'ar', p: 3, t: 'Busy places spend your battery before anyone says a word.', d: 'Leaving room to settle after a crowded day (even ten quiet minutes) can make the evening feel completely different.', l: ['Breathe or the Night Garden', '/night-garden.html'] },
    { when: [['stretched', 'short'], ['now', 'busy']], f: 'nb', p: 3, t: 'Some of the snap may be leftover stress, not this moment.', d: 'A busy season fills your tank before you get home. A reaction three sizes too big is often leftover stress meeting a small moment. Saying “Heads up, I’m carrying a lot today” changes how everything after it lands.', l: ['Chapter III: full tanks', '/book/chapter-3.html'] },
    { when: [['stretched', 'hide']], f: 'ps', p: 3, t: 'If you hide it well, people can’t help in time.', d: 'Hiding stress is a skill, and it has a cost: the people who’d gladly help don’t know you need it until you’re past empty. A simple battery number (“I’m at about 7 out of 10 today”) lets them see what you don’t show.', l: ['The Battery & Stress Meter (WP-02)', '/workpapers/wp-02-battery-stress-meter.html'] },
    { when: [['stretched', 'plan']], f: 'bs', p: 2, t: 'Over-planning can be stress in disguise.', d: 'When things feel out of control, making lists can feel like the only lever. It helps to notice which plans are needed and which are a way of calming down, so others don’t feel managed.', l: ['Chapter II: is the split working?', '/book/chapter-2.html'] },
    { when: [['care', 'doing'], ['drains', 'unseen']], f: 'ps', p: 1, t: 'Care that comes out as doing is the easiest to miss.', d: 'If you show love by doing things, someone who looks for words or time may not see it as care at all, and you may feel unseen. Naming it helps: “When I sort the car out, that’s me looking after you.”', l: ['Turning Toward', '/turning-toward.html'] },
    { when: [['care', 'remember']], f: 'ec', p: 1, t: 'Remembering is real work, even when it looks like nothing.', d: 'Remembering the details people care about is a gift, and it’s also the kind of unseen work that adds up. It counts, and it’s fair to say so.', l: ['The Preface: unbilled debt', '/book/preface.html'] },
    { when: [['unseen', 'dates']], f: 'fi', p: 1, t: 'That’s unbilled debt.', d: 'Remembering dates and appointments is work that gets done but never written down. Over months, it builds up like a debt only one person can see. Logging one week of it with WP-01 often surprises everyone.', l: ['Who did what (WP-01)', '/workpapers/wp-01.html'] },
    { when: [['unseen', 'lowon']], f: 'bu', p: 5, t: 'Jobs drift to whoever notices first.', d: 'If you’re the one who notices what’s running low, the job of noticing has probably become yours by default, without anyone deciding it. Giving it a named owner (even if that’s still you) makes it visible.', l: ['One owner per job (WP-03)', '/workpapers/wp-03-raci-treaty.html'] },
    { when: [['unseen', 'peace']], f: 'ps', p: 1, t: 'Keeping the peace is work, too.', d: 'Smoothing things over and steering conversations somewhere calmer takes real energy, and it usually goes unthanked because when it works, nothing seems to happen.', l: ['The kinds of unseen work', '/book/preface-in-depth.html'] },
    { when: [['unseen', 'mood']], f: 'nb', p: 3, t: 'Reading the room all day can fill your tank quietly.', d: 'If you’re always tracking how everyone else feels, your own state can slip off the list. Checking your own battery first isn’t selfish; it’s how you keep reading the room well.', l: ['Today’s Weather', '/quick-checks.html#today'] },
    { when: [['values', 'fair'], ['unseen', '*']], f: 'ec', p: 1, t: 'Fairness starts with seeing the whole load.', d: 'If fairness matters to you and some of your work goes unseen, a shared page of who does what is the kindest first step. Facts on one page calm this conversation down fast.', l: ['The Lemonade Stand', '/lemonade-stand.html'] },
    { when: [['now', 'caring']], f: 'ht', p: 3, t: 'People who care for others often stop counting their own needs.', d: 'Pick one thing from “What fills my battery” and give it a real time this week, written down like any other appointment.', l: ['Caring for someone', '/relationships-in-depth.html'] },
    { when: [['now', 'kids'], ['unseen', '*']], f: 'bu', p: 2, t: 'Family logistics run like a small business.', d: 'School forms, lunches and birthday gifts are recurring jobs. Each one runs better with one named owner than with “whoever remembers.”', l: ['One owner per job (WP-03)', '/workpapers/wp-03-raci-treaty.html'] },
    { when: [['helps', 'spacetime']], f: 'bs', p: 3, t: 'Space works best with a time to come back.', d: '“I need a break” can sound like leaving. “I need twenty minutes, then let’s talk at eight” sounds like caring about the conversation. The time is what makes space feel safe for both of you.', l: ['The Calm-Down Kit (WP-11)', '/wp-11.html'] },
    { when: [['helps', 'written']], f: 'ps', p: 4, t: 'Writing can say what a face-to-face talk can’t.', d: 'Some people find hard things easier to say and hear in writing: there’s time to think, and no tone of voice to misread. Saying so in your Heartprint lets people offer it.', l: ['The Signal Translator', '/signal-translator.html'] },
    { when: [['wired', 'fast'], ['wired', 'slow']], f: 'ph', p: 4, t: 'You move fast and slow.', d: 'Many people do: fast at some things, slow at others. Naming which is which helps others match your pace, instead of guessing.', l: ['Chapter I: what sets the frequency', '/book/chapter-1-in-depth.html'] },
    { when: [['fills', 'quiet'], ['now', 'kids']], f: 'ht', p: 3, t: 'Quiet may be the rarest thing in your week.', d: 'With kids at home, quiet doesn’t happen by accident. Agreeing on even fifteen protected minutes, and swapping turns, is a setup fix, not a luxury.', l: ['Fix the setup, not the person', '/five-pillars.html#fix-the-setup'] },
    { when: [['values', 'reliable'], ['stretched', 'hide']], f: 'ph', p: 2, t: 'Being reliable and hiding stress can wear each other out.', d: 'If being someone people can count on matters to you, saying “not this week” can feel like failing. But an honest “not right now, I’ll do it Thursday” is still being reliable.', l: ['Kind ways to say no (WP-01)', '/workpapers/wp-01.html'] },
    { when: [['drains', 'messages']], f: 'bs', p: 2, t: 'A flood of messages is a setup problem.', d: 'Agreeing on one place and one time for household logistics (a shared list, or a short catch-up on Sundays) can quiet the stream without anyone feeling ignored.', l: ['Check-ins', '/check-ins.html'] },
    { when: [['wired', 'details'], ['unseen', '*']], f: 'ec', p: 5, t: 'Noticing details is a gift that quietly becomes a job.', d: 'When you see what others miss, you end up handling it. That’s a quiet incentive at work: the setup rewards whoever notices first.', l: ['Notice the quiet incentives', '/five-pillars.html#quiet-incentives'] }
  ];

  // ---------- state ----------
  var S = { pick: {}, words: {}, name: '', keep: false, at: 0 };
  function load() { try { var o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && o.keep) { S = o; S.pick = S.pick || {}; S.words = S.words || {}; } } catch (e) {} }
  function save() { try { if (S.keep) localStorage.setItem(KEY, JSON.stringify(S)); else localStorage.removeItem(KEY); } catch (e) {} }
  load();
  function picked(step, id) { return !!(S.pick[step] && S.pick[step].indexOf(id) >= 0); }
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }

  // ---------- writing the statement ----------
  function joinList(a, word) { if (a.length <= 1) return a.join(''); return a.slice(0, -1).join(', ') + (a.length > 2 ? ',' : '') + ' ' + word + ' ' + a[a.length - 1]; }
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function sentences() {
    var out = [];
    STEPS.forEach(function (st) {
      var ids = S.pick[st.id] || [], bits = st.o.filter(function (o) { return ids.indexOf(o[0]) >= 0; }).map(function (o) { return o[2]; });
      var own = (S.words[st.id] || '').trim();
      if (!bits.length && !own) return;
      var line = bits.length ? st.lead + joinList(bits, st.join) + '.' : '';
      if (line) line = cap(line);
      if (own) line += (line ? ' ' : '') + cap(own.replace(/\s+/g, ' ')) + (/[.!?]$/.test(own) ? '' : '.');
      out.push({ t: st.t, line: line });
    });
    return out;
  }
  function insights() {
    return INSIGHTS.filter(function (x) {
      return x.when.every(function (w) { return w[1] === '*' ? (S.pick[w[0]] || []).length > 0 : picked(w[0], w[1]); });
    });
  }
  function plain() {
    var n = S.name.trim(), lines = sentences();
    var head = (n ? n + '’s Heartprint' : 'My Heartprint') + '\n' + '(a little note about me, so you don’t have to guess)\n';
    return head + '\n' + lines.map(function (x) { return x.line; }).join('\n\n') + (lines.length ? '\n\nThank you for reading this. It’s how I work best, not a list of rules.' : '');
  }

  // ---------- drawing it ----------
  function render() {
    var st = STEPS[S.at], total = STEPS.length, ins = insights(), lines = sentences();
    var dots = STEPS.map(function (x, i) { var has = (S.pick[x.id] || []).length || (S.words[x.id] || '').trim(); return '<li class="' + (i === S.at ? 'is-now' : '') + (has ? ' is-done' : '') + '"><button type="button" data-go="' + i + '" aria-label="Step ' + (i + 1) + ': ' + esc(x.t) + (i === S.at ? ' (you’re here)' : '') + '">' + (i + 1) + '</button></li>'; }).join('');
    var chips = st.o.map(function (o) { var on = picked(st.id, o[0]); return '<button type="button" class="pp-chip' + (on ? ' is-on' : '') + '" aria-pressed="' + on + '" data-pick="' + o[0] + '">' + (on ? '✓ ' : '') + esc(o[1]) + '</button>'; }).join('');
    root.innerHTML =
      '<div class="pp-grid"><section class="pp-step" aria-labelledby="pp-st-h">' +
        '<ol class="pp-dots" aria-label="Steps">' + dots + '</ol>' +
        '<p class="pp-k">Step ' + (S.at + 1) + ' of ' + total + '</p><h2 id="pp-st-h">' + esc(st.t) + '</h2><p class="pp-q">' + esc(st.q) + (st.max ? '' : ' Pick as many as you like.') + '</p>' +
        '<div class="pp-chips" role="group" aria-label="' + esc(st.t) + '">' + chips + '</div>' +
        '<label class="pp-own">In your own words (optional)<textarea rows="2" maxlength="400" data-own placeholder="Anything to add, in your own words…">' + esc(S.words[st.id] || '') + '</textarea></label>' +
        '<div class="pp-nav">' + (S.at ? '<button type="button" class="pp-b" data-prev>← Back</button>' : '<span></span>') +
          (S.at < total - 1 ? '<button type="button" class="pp-b is-main" data-next>Next: ' + esc(STEPS[S.at + 1].t) + ' →</button>' : '<a class="pp-b is-main" href="#pp-statement">See my Heartprint ↓</a>') + '</div>' +
      '</section>' +
      '<aside class="pp-ins" aria-labelledby="pp-ins-h" aria-live="polite"><h2 id="pp-ins-h">🔎 Things you might not have noticed' + (ins.length ? ' <span class="pp-n">' + ins.length + '</span>' : '') + '</h2>' +
        (ins.length ? '<ul>' + ins.map(function (x) { var P = PIL[x.p]; return '<li><strong>' + esc(x.t) + '</strong><p>' + esc(x.d) + '</p><p class="pp-tag">' + esc(F[x.f]) + ' · <a href="/five-pillars.html#' + P[1] + '">' + esc(P[0]) + '</a> · <a href="' + x.l[1] + '">' + esc(x.l[0]) + ' →</a></p></li>'; }).join('') + '</ul>'
          : '<p class="pp-empty">As you choose, connections between your choices show up here: things that are easy to miss about yourself, and why they matter to the people around you.</p>') +
      '</aside></div>' +
      '<section class="pp-out" id="pp-statement" aria-labelledby="pp-out-h"><h2 id="pp-out-h">💗 Your Heartprint</h2>' +
        '<label class="pp-name">Your name (optional)<input type="text" maxlength="40" data-name value="' + esc(S.name) + '" placeholder="So it reads “Jo’s Heartprint”"></label>' +
        '<div class="pp-card"><p class="pp-card-h">' + esc(S.name.trim() ? S.name.trim() + '’s Heartprint' : 'My Heartprint') + '</p><p class="pp-card-s">A little note about me, so you don’t have to guess</p>' +
          (lines.length ? lines.map(function (x) { return '<p>' + esc(x.line) + '</p>'; }).join('') + '<p class="pp-card-end">Thank you for reading this. It’s how I work best, not a list of rules.</p>'
            : '<p class="pp-empty">Your statement builds itself here as you choose. Start with step 1.</p>') + '</div>' +
        '<div class="pp-acts"><button type="button" class="pp-b is-main" data-copy' + (lines.length ? '' : ' disabled') + '>Copy my Heartprint</button><button type="button" class="pp-b" data-dl' + (lines.length ? '' : ' disabled') + '>Save as a text file</button><button type="button" class="pp-b" data-print' + (lines.length ? '' : ' disabled') + '>Print</button><button type="button" class="pp-b" data-reset>Start over</button></div>' +
        '<label class="pp-keep"><input type="checkbox" data-keep' + (S.keep ? ' checked' : '') + '> Keep a draft on this device, so I can come back to it</label>' +
        '<p class="pp-status" aria-live="polite"></p>' +
      '</section>';
  }
  function status(t) { var s = root.querySelector('.pp-status'); if (s) s.textContent = t; }
  function refreshOut() {
    // redraw without losing focus in the text box
    var a = document.activeElement, own = a && a.hasAttribute && a.hasAttribute('data-own'), nm = a && a.hasAttribute && a.hasAttribute('data-name'), pos = a && a.selectionStart;
    render();
    if (own || nm) { var el = root.querySelector(own ? '[data-own]' : '[data-name]'); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (e) {} } }
  }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || !root.contains(b)) return;
    var st = STEPS[S.at];
    if (b.hasAttribute('data-pick')) {
      var id = b.getAttribute('data-pick'), list = S.pick[st.id] = S.pick[st.id] || [], i = list.indexOf(id);
      if (i >= 0) list.splice(i, 1); else { if (st.max && list.length >= st.max) list.shift(); list.push(id); }
      save(); render(); var nb = root.querySelector('[data-pick="' + id + '"]'); if (nb) nb.focus(); return;
    }
    if (b.hasAttribute('data-go')) { S.at = +b.getAttribute('data-go'); save(); render(); focusStep(); return; }
    if (b.hasAttribute('data-next')) { S.at = Math.min(STEPS.length - 1, S.at + 1); save(); render(); focusStep(); return; }
    if (b.hasAttribute('data-prev')) { S.at = Math.max(0, S.at - 1); save(); render(); focusStep(); return; }
    if (b.hasAttribute('data-copy')) {
      var txt = plain(), done = function () { status('Copied. Paste it into a message, a note or a card.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { status('Copying didn’t work here. Try “Save as a text file” instead.'); });
      else status('Copying didn’t work here. Try “Save as a text file” instead.');
      return;
    }
    if (b.hasAttribute('data-dl')) {
      var blob = new Blob([plain()], { type: 'text/plain' }), u = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = u; a.download = (S.name.trim() ? S.name.trim().replace(/[^\w -]/g, '') + ' - ' : '') + 'My Heartprint.txt'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 2000); status('Saved to your device.'); return;
    }
    if (b.hasAttribute('data-print')) { document.documentElement.classList.add('pp-printing'); window.print(); setTimeout(function () { document.documentElement.classList.remove('pp-printing'); }, 500); return; }
    if (b.hasAttribute('data-reset')) {
      if (!window.confirm('Start over? This clears every choice' + (S.keep ? ' and the draft kept on this device' : '') + '.')) return;
      S = { pick: {}, words: {}, name: '', keep: false, at: 0 }; try { localStorage.removeItem(KEY); } catch (e) {} render(); focusStep(); return;
    }
  });
  root.addEventListener('input', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-own')) { S.words[STEPS[S.at].id] = t.value; save(); clearTimeout(root._t); root._t = setTimeout(refreshOut, 350); }
    if (t.hasAttribute('data-name')) { S.name = t.value; save(); clearTimeout(root._t); root._t = setTimeout(refreshOut, 350); }
  });
  root.addEventListener('change', function (e) {
    if (e.target.hasAttribute('data-keep')) { S.keep = e.target.checked; save(); status(S.keep ? 'Your draft will be kept on this device. “Start over” erases it.' : 'Nothing is kept on this device now.'); }
  });
  function focusStep() { var h = root.querySelector('#pp-st-h'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); var r = root.querySelector('.pp-step'); if (r && r.getBoundingClientRect().top < 60) r.scrollIntoView({ block: 'start' }); } }
  render();
  window.TOLHeartprint = { insights: function () { return insights().map(function (x) { return x.t; }); }, text: plain, _set: function (step, ids) { S.pick[step] = ids.slice(); render(); } };
})();
