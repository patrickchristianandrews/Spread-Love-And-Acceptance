/* Mood Arbitrage: shared content for both levels of the tool
   (/tools/mood-arbitrage-free.html and /tools/mood-arbitrage-full.html).
   Everything runs in this browser. Nothing typed or chosen is saved or sent. */
(function () {
  'use strict';

  var STATES = {
    up: { name: 'Wound up', also: 'on guard', tag: 'loosely borrowed label: “sympathetic”',
      signs: 'Tight jaw, fast or sharp words, braced shoulders, and everything suddenly feels urgent.' },
    down: { name: 'Shut down', also: 'flat, far away', tag: 'loosely borrowed label: “dorsal”',
      signs: 'A blank face, few or no words, looking away, moving slowly or not at all.' },
    scattered: { name: 'Scattered', also: 'too many threads', tag: 'an everyday description',
      signs: 'Worries spilling out one after another, can’t settle on one thing, fidgety, jumping ahead.' },
    unsure: { name: 'Not sure', also: 'can’t tell', tag: '',
      signs: 'You can see something is off, but not which way.' }
  };

  var MOVES = {
    up: { title: 'Lower the temperature', goal: 'Help them feel you’re on the same side.',
      how: 'Slow down before you say anything. Sit or stand beside them rather than across. Name what you see without judging it, and leave the actual problem for later. If light humor is normal between you, one warm, silly line about the situation (never about them) can break the tension.',
      words: ['“This got tense fast. I’m not here to score points. Can we both take a breath?”',
              '“I’m on your side here. Let’s sort the rest out later, together.”'],
      body: 'Slower movements, a lower and quieter voice, open hands, and plenty of room.',
      avoid: ['Lecturing, or listing what was agreed', 'Matching their volume or speed', 'Jokes at their expense, or any humor when they’re hurt'],
      ifNot: 'Drop any lightness at once: “Sorry, that wasn’t the moment for a joke. Tell me again. I’m listening.”' },
    down: { title: 'Steady company', goal: 'Let them know they’re not alone, without asking anything of them.',
      how: 'Stay near, quietly, with no questions to answer. Let them know you’re not upset and not going anywhere. Offer something small and warm, like a drink or a blanket, rather than a plan.',
      words: ['“You don’t have to talk. I’m just going to sit here for a bit.”',
              '“No rush. We can pick this up tomorrow, whenever you’re ready.”'],
      body: 'Still, calm and unhurried. Sit rather than stand. Touch only if you know it’s welcome.',
      avoid: ['A string of questions (“What’s wrong? Talk to me.”)', 'Pep talks or quick fixes', 'Taking the quiet personally'],
      ifNot: 'If they move away, respect it: “I’ll give you some room. I’m in the next room when you want me.”' },
    scattered: { title: 'One thread at a time', goal: 'Help them find the one next step.',
      how: 'Stay calm and simple. Say back that there’s a lot at once, then help find the single next step. Offer to take one practical thing off their plate, and ask before you take it.',
      words: ['“That’s a lot at once. What’s the one thing that needs doing first?”',
              '“Want me to handle [one thing] while you do [the next step]?”'],
      body: 'Settled and clear. Short sentences, one idea at a time.',
      avoid: ['“It’ll be fine” or “It’s not that bad”', 'Adding your own list of worries', 'Taking over everything without asking'],
      ifNot: 'Ask directly: “Do you want help with this, or do you just need me to listen?”' },
    unsure: { title: 'Ask first', goal: 'Let them choose what would help.',
      how: 'When you can’t tell, ask. Offer two or three kinds of help and let them pick. Asking is a move, not a failure to read them.',
      words: ['“I can see today’s a lot. Would company, some quiet, or help with one thing be best?”'],
      body: 'Calm, near but not crowding.',
      avoid: ['Guessing, then pushing a move they didn’t ask for'],
      ifNot: 'Take “I don’t know” as an answer: “Okay. I’m around. Just say the word.”' }
  };

  var STAY = 'Give it a few minutes. Don’t rush back to the topic. Come back to it later, at a set time, when you’re both steadier.';

  var YOU = {
    steady: { name: 'Steady', text: 'You’re steady, and that’s what makes the move possible. Take one slow breath and go.' },
    up: { name: 'Wound up too', text: 'You’re wound up too, and two wound-up people make more static, not less. Settle first: step away for a few minutes and breathe out slowly. Use a holding line: “I want to help with this, and I need five minutes first.” The <a href="/wp-11.html">Calm-Down Kit (WP-11)</a> has your own list for this.' },
    low: { name: 'Running low', text: 'You’re running low. You can still offer something small and honest: “I’m wiped out, and I’m here. Can we sort this properly tomorrow?” Look after your own battery too; the <a href="/wp-11.html">Calm-Down Kit (WP-11)</a> is built for this.' }
  };

  var SITUATIONS = {
    disagree: { name: 'A disagreement between us', text: 'Because the tension is between you, own your part in one sentence before anything else (“I got sharp about the money. I’m sorry.”), then set a time to finish the topic.',
      agree: 'When one of us gets wound up, either can say ‘pause.’ We’ll take twenty minutes and come back at a set time.' },
    elsewhere: { name: 'A hard day from somewhere else', text: 'This started somewhere else, so it isn’t yours to fix. Your job is company and a little relief, not solutions or advice.',
      agree: 'When one of us has had a hard day, we’ll say so early, and the other will hold new problems until the next day.' },
    load: { name: 'Too much on their plate', text: 'The weight is sitting on one person. Once it settles, share the load for real: one job moves to you, for good, with no reminders needed.',
      agree: 'Each recurring job gets one named owner, written down, so nobody carries the list alone. (<a href="/workpapers/wp-03-raci-treaty.html">One owner per job (WP-03)</a> helps.)' },
    sensory: { name: 'Too much noise, people or light', text: 'Change the place before anything else: a quieter room, outside, or leaving early. Keep words to a minimum until you’re out.',
      agree: 'When a place gets too loud or busy for one of us, either can say ‘time to go,’ no explanation needed.' }
  };

  var RELS = {
    partner: { name: 'A partner', text: 'You probably know what comforts them. Use it, and check you’re not guessing from an old pattern.' },
    family: { name: 'Family', text: 'Old family roles come back fast. Speak to the person in front of you today, not to the argument from years ago.' },
    coparent: { name: 'A co-parent', text: 'Keep it calm, brief and about the kids and the logistics. Save anything bigger for a planned message.' },
    roommate: { name: 'A roommate', text: 'Offer, don’t assume. Some roommates want company; others want their door closed.' },
    coworker: { name: 'A coworker', text: 'Keep it light and professional. Skip touch, keep any humor gentle, and offer a practical hand or a later time to talk.' },
    care: { name: 'Someone I care for', text: 'A slow, predictable routine is often the most calming move. Look after your own state as well; caring on an empty battery is hard on both of you.' },
    friend: { name: 'A friend', text: 'Ask what would help. “Do you want to vent, or do you want ideas?” is a friend’s best question.' }
  };

  var PRACTICE = [
    ['Week 1: Notice', 'Once a day, name your own state and the other person’s, just to yourself. No moves yet.'],
    ['Week 2: Ask', 'At a calm time, share the three states and ask which move helps them most. Write their answer down.'],
    ['Week 3: Try one move', 'Use one move in a small, low-stakes moment. Notice what lands and what doesn’t.'],
    ['Week 4: Review together', 'Talk about what helped and what didn’t, and keep one agreement for the next month.']
  ];

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function strip(h) { return String(h).replace(/<[^>]+>/g, ''); }

  // Build a plan from the choices. Every field is optional except their state.
  function plan(c) {
    var m = MOVES[c.them] || MOVES.unsure, st = STATES[c.them] || STATES.unsure;
    var p = { title: 'My plan: ' + m.title, sections: [] };
    var sub = [];
    if (c.rel && RELS[c.rel]) sub.push('with ' + RELS[c.rel].name.charAt(0).toLowerCase() + RELS[c.rel].name.slice(1));
    if (c.sit && SITUATIONS[c.sit]) sub.push(SITUATIONS[c.sit].name.toLowerCase());
    p.sub = 'Their state: ' + st.name.toLowerCase() + (sub.length ? ' · ' + sub.join(' · ') : '');
    p.sections.push({ h: '1. First, you', html: c.you && YOU[c.you] ? YOU[c.you].text : 'Check your own state before you do anything. If you’re wound up or running low too, settle first or name a time to come back.' });
    p.sections.push({ h: '2. What you’re seeing', html: esc(st.name + (st.also ? ' (' + st.also + ')' : '') + '. ' + st.signs) + ' It’s your best guess, not a verdict, so stay ready to be wrong.' });
    p.sections.push({ h: '3. The move: ' + m.title, html: esc(m.goal + ' ' + m.how) + (c.sit && SITUATIONS[c.sit] ? ' ' + SITUATIONS[c.sit].text : '') });
    p.sections.push({ h: 'Words to try', list: m.words.map(esc) });
    p.sections.push({ h: 'With your body', html: esc(m.body) });
    p.sections.push({ h: 'Avoid', list: m.avoid.map(esc) });
    if (c.rel && RELS[c.rel]) p.sections.push({ h: 'For this relationship', html: esc(RELS[c.rel].text) });
    p.sections.push({ h: 'If it doesn’t land', html: esc(m.ifNot) });
    p.sections.push({ h: '4. Stay with it', html: esc(STAY) });
    var ag = c.sit && SITUATIONS[c.sit] ? SITUATIONS[c.sit].agree : 'When one of us is having a hard moment, the other will ask “Company, quiet, or help with one thing?” before doing anything else.';
    p.sections.push({ h: 'Afterwards: one agreement to suggest', html: '“' + ag + '”' });
    return p;
  }

  function planHTML(p, withPractice) {
    var h = p.sections.map(function (s) {
      return '<h4>' + esc(s.h) + '</h4>' + (s.list ? '<ul>' + s.list.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' : '<p>' + s.html + '</p>');
    }).join('');
    if (withPractice) {
      h += '<h4>Four weeks to build the skill</h4><ul class="ma-practice">' + PRACTICE.map(function (w) { return '<li><span class="ma-box" aria-hidden="true"></span><span><strong>' + esc(w[0]) + '.</strong> ' + esc(w[1]) + '</span></li>'; }).join('') + '</ul>';
    }
    return h;
  }

  function planText(p, withPractice) {
    var t = p.title + '\n' + p.sub + '\n';
    p.sections.forEach(function (s) {
      t += '\n' + s.h + '\n' + (s.list ? s.list.map(function (x) { return '- ' + strip(x); }).join('\n') : strip(s.html)) + '\n';
    });
    if (withPractice) t += '\nFour weeks to build the skill\n' + PRACTICE.map(function (w) { return '[ ] ' + w[0] + ': ' + w[1]; }).join('\n') + '\n';
    return t + '\nFrom Soften a tense moment, The Objective Ledger. A rule of thumb, not a clinical tool.';
  }

  function copy(text, done) {
    function fb() {
      var ok = false;
      try { var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-1000px'; document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); document.body.removeChild(ta); } catch (e) {}
      done(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, fb); else fb();
  }

  window.TOLMood = { STATES: STATES, MOVES: MOVES, STAY: STAY, YOU: YOU, SITUATIONS: SITUATIONS, RELS: RELS, PRACTICE: PRACTICE,
    plan: plan, planHTML: planHTML, planText: planText, copy: copy, esc: esc };
})();
