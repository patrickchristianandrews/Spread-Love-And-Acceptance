/* perspective-shifter.js — the Perspective Shifter: see a moment from the other person's side. Tap what might be true
   for them (who they are to you, how they're wired, the state they were in, what was going on around them, their
   history), and what each of you could or couldn't see. It builds a picture of how the moment may have looked from
   where they stood, why it can look different from what was meant, questions to check instead of guessing, and a
   sentence to bridge the gap (which you can test in the Signal Translator). Built on the seven angles of Chapter III.
   Everything happens in this browser; nothing is sent anywhere or kept. */
(function () {
  'use strict';
  var root = document.querySelector('[data-pshift]');
  if (!root) return;

  // each choice: id, label, how it may have shaped the moment for them
  var GROUPS = [
    { id: 'who', t: 'Who are they to you?', one: true, angle: '',
      o: [['partner', 'Partner', 'your partner'], ['family', 'Family', 'a family member'], ['roommate', 'Roommate', 'your roommate'], ['friend', 'Friend', 'your friend'],
          ['coworker', 'Coworker', 'your coworker'], ['coparent', 'Co-parent', 'your co-parent'], ['teen', 'My teen or child', 'your child'], ['other', 'Someone else', 'the other person']] },
    { id: 'state', t: 'What state might they have been in?', one: true, angle: 'Physical tiredness',
      o: [['calm', 'Calm and connected', 'They may simply have been calm, so their words probably meant what they said, no more.'],
          ['revved', 'Revved up', 'If they were revved up, everything felt more urgent to them. A plain question can come out fast and sharp, and a pause from you can feel like a no.'],
          ['empty', 'Running on empty', 'If they were running on empty, short replies and slow answers are what a tired body does. It can look like not caring when it’s only having nothing left.'],
          ['unsure', 'I’m not sure', 'You don’t know what state they were in. That’s worth asking about before deciding what they meant.']] },
    { id: 'around', t: 'What might have been going on around them?', angle: 'Outside stress and time pressure',
      o: [['day', 'A long or hard day', 'A long day fills the tank before they walk in. Some of what you saw may have been left over from earlier, not about you at all.'],
          ['sleep', 'Little sleep', 'With little sleep, small things feel big and patience runs out sooner.'],
          ['rushed', 'Rushed or late', 'When someone is rushed, everything gets shorter: their words, their patience and their attention.'],
          ['money', 'Money worries', 'Money worries sit in the background of everything, so a small cost or chore can carry extra weight.'],
          ['caring', 'Caring for someone', 'Caring for someone else uses up attention you can’t see. They may have had less to give than usual.'],
          ['unwell', 'Not feeling their best', 'If they weren’t feeling their best, a reaction may have been about their body, not about you.'],
          ['noisy', 'A noisy or crowded place', 'In a noisy, busy place, a comment arrives louder and there’s less room to think before answering.'],
          ['others', 'Other people were there', 'With others watching, people protect how they look. A comment can feel like a public correction.'],
          ['text', 'It was a text or message', 'In a message there’s no face or tone, so they had to guess yours, and people often guess the worst.'],
          ['late', 'It was late at night', 'Late at night, everyone’s tank is lower, and a message can land heavier than it would at noon.']] },
    { id: 'wired', t: 'How are they wired?', angle: 'Communication style',
      o: [['tone', 'They notice tone a lot', 'They may have reacted to your tone more than your words. For them, how it was said can be the message.'],
          ['literal', 'They take words literally', 'They may have taken your words exactly as said. A hint or a “maybe” could easily have been missed, or heard as a firm answer.'],
          ['process', 'They need time to process', 'They may have needed time to think. A quick answer from them isn’t always their real answer, and silence may mean “I’m thinking.”'],
          ['loud', 'They think out loud', 'They may have been thinking out loud. What sounded like a decision or a criticism may have been them working it out.'],
          ['direct', 'They’re very direct', 'They may say things plainly, without softeners. What felt blunt may have been meant as simply clear.'],
          ['hint', 'They hint rather than say', 'They may have been hinting. Something important may have been said quietly, between the lines.'],
          ['plans', 'They like a plan', 'For someone who likes a plan, a surprise or a vague answer can feel unsettling, not just inconvenient.'],
          ['senses', 'Noise, light or crowds get to them', 'Noise, light or crowds may have used up their battery before the moment even started.'],
          ['culture', 'Their language or culture differs', 'Words, directness and politeness work differently across languages and cultures. Something polite in one can sound rude in another.']] },
    { id: 'history', t: 'What history might they carry?', angle: 'History and family script',
      o: [['before', 'This has come up before', 'If this has come up before, they may have been answering the last five times, not just today.'],
          ['family', 'They grew up with it done differently', 'In the home they grew up in, this may have been handled another way. What feels normal to them may be different from what feels normal to you.'],
          ['sore', 'It’s a sore topic for them', 'Some topics carry old hurts. A small mention can touch something much bigger.'],
          ['fair', 'They may feel it’s unfair', 'They may have been seeing it through fairness: who usually does this, and whether that’s been noticed.']] }
  ];
  var SEE = [
    { id: 'theysaw', t: 'They may have seen or known things you didn’t', o: [['load', 'their whole day and workload'], ['msg', 'a message, call or news you didn’t see'], ['planned', 'something they had already planned or done'], ['where', 'how it looked from where they stood'], ['promise', 'a promise someone else made them'], ['feel', 'how they were feeling inside']] },
    { id: 'yousaw', t: 'You may have seen or known things they didn’t', o: [['plan', 'the planning you had already done'], ['why', 'the reason behind your timing'], ['meant', 'what you actually meant'], ['tired', 'how tired or stretched you were'], ['done', 'the part already done'], ['deadline', 'a deadline only you knew about']] },
    { id: 'neither', t: 'Neither of you could fully see', o: [['tone', 'each other’s tone, in writing'], ['intent', 'what was going on in the other’s head'], ['next', 'what would happen next'], ['others', 'what other people had said to each of you']] }
  ];
  var S = {}; function sel(g) { return S[g] || (S[g] = []); }
  function on(g, id) { return sel(g).indexOf(id) >= 0; }
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function label(groups, g, id) { var G = groups.filter(function (x) { return x.id === g; })[0]; var o = G && G.o.filter(function (x) { return x[0] === id; })[0]; return o; }
  function joinList(a) { return a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + (a.length > 2 ? ',' : '') + ' and ' + a[a.length - 1]; }

  function build() {
    var html = '<div class="ps-grid"><div class="ps-in">';
    html += '<section class="ps-box"><h2 id="ps-what">1. What happened?</h2><p class="ps-q">In a line, if you like. It stays on this device.</p>' +
      '<textarea rows="2" maxlength="300" data-what placeholder="For example: I asked about the dishes and they snapped."></textarea>' +
      '<label class="ps-lbl">The words that were said, if you want to test a reply later (optional)<input type="text" maxlength="300" data-said placeholder="For example: Are you going to do the dishes?"></label></section>';
    GROUPS.forEach(function (G, i) {
      html += '<section class="ps-box"><h2>' + (i + 2) + '. ' + esc(G.t) + '</h2>' + (G.angle ? '<p class="ps-angle">One of the seven angles: ' + esc(G.angle) + '</p>' : '') +
        '<div class="ps-chips" role="group" aria-label="' + esc(G.t) + '">' + G.o.map(function (o) { return '<button type="button" class="ps-chip" data-g="' + G.id + '" data-id="' + o[0] + '" aria-pressed="false">' + esc(o[1]) + '</button>'; }).join('') + '</div></section>';
    });
    html += '<section class="ps-box"><h2>' + (GROUPS.length + 2) + '. What could each of you see?</h2><p class="ps-q">This is the part people miss most. Two people in the same moment rarely have the same information.</p>';
    SEE.forEach(function (G) {
      html += '<h3 class="ps-h3">' + esc(G.t) + '</h3><div class="ps-chips" role="group" aria-label="' + esc(G.t) + '">' + G.o.map(function (o) { return '<button type="button" class="ps-chip" data-g="' + G.id + '" data-id="' + o[0] + '" aria-pressed="false">' + esc(o[1]) + '</button>'; }).join('') + '</div>';
    });
    html += '</section></div><aside class="ps-out" aria-live="polite" aria-labelledby="ps-out-h"><h2 id="ps-out-h">🔭 Through their eyes</h2><div data-out></div></aside></div>';
    root.innerHTML = html;
  }

  function render() {
    var out = root.querySelector('[data-out]'), whoO = sel('who')[0] ? label(GROUPS, 'who', sel('who')[0]) : null, who = whoO ? whoO[2] : 'the other person';
    var picks = []; GROUPS.forEach(function (G) { if (G.id === 'who') return; sel(G.id).forEach(function (id) { var o = label(GROUPS, G.id, id); if (o) picks.push({ g: G, o: o }); }); });
    var seen = {}; SEE.forEach(function (G) { seen[G.id] = sel(G.id).map(function (id) { return label(SEE, G.id, id)[1]; }); });
    if (!picks.length && !seen.theysaw.length && !seen.yousaw.length && !seen.neither.length) {
      out.innerHTML = '<p class="ps-empty">Tap what might be true for them, on the left. Their side of the moment builds itself here: how it may have looked to them, what each of you could and couldn’t see, and a sentence to bridge the gap.</p>';
      return;
    }
    var h = '<p class="ps-lead">Seen from ' + esc(who) + '’s side, here’s how the moment may have looked. These are possibilities to check, not facts about them.</p>';
    if (picks.length) h += '<h3>How it may have looked to them</h3><ul>' + picks.map(function (p) { return '<li><strong>' + esc(p.o[1]) + ':</strong> ' + esc(p.o[2]) + '</li>'; }).join('') + '</ul>';
    if (seen.theysaw.length || seen.yousaw.length || seen.neither.length) {
      h += '<h3>What each of you could see</h3><div class="ps-vis">' +
        '<div><b>Only they could see</b>' + (seen.theysaw.length ? '<ul>' + seen.theysaw.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<p class="ps-empty">Nothing picked yet.</p>') + '</div>' +
        '<div><b>Only you could see</b>' + (seen.yousaw.length ? '<ul>' + seen.yousaw.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<p class="ps-empty">Nothing picked yet.</p>') + '</div>' +
        '<div><b>Neither of you could see</b>' + (seen.neither.length ? '<ul>' + seen.neither.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<p class="ps-empty">Nothing picked yet.</p>') + '</div></div>';
      h += '<p class="ps-why"><strong>Why it can look different from what was meant:</strong> each of you filled the gaps with what you could see. ' +
        (seen.theysaw.length ? 'They had things you didn’t: ' + esc(joinList(seen.theysaw)) + '. ' : '') +
        (seen.yousaw.length ? 'You had things they didn’t: ' + esc(joinList(seen.yousaw)) + '. ' : '') +
        'So the same moment can be true for both of you and still look completely different. Nobody has to be wrong; you were looking from different places.</p>';
    }
    // questions to check, instead of guessing
    var qs = [];
    if (on('state', 'unsure') || on('state', 'revved') || on('state', 'empty')) qs.push('How was your day, before this came up?');
    if (sel('around').length) qs.push('Was there anything else going on for you at the time?');
    if (on('wired', 'literal') || on('wired', 'hint')) qs.push('When I said it, what did you hear me asking for?');
    if (on('wired', 'process')) qs.push('Would it help to think about it and come back to it later?');
    if (sel('history').length) qs.push('Has this felt like it keeps coming up for you?');
    if (seen.theysaw.length) qs.push('Is there something you knew that I didn’t?');
    if (seen.yousaw.length) qs.push('Can I tell you what was going on on my side?');
    if (!qs.length) qs.push('How did that moment look from where you were?');
    h += '<h3>Questions to check, instead of guessing</h3><ul>' + qs.slice(0, 4).map(function (q) { return '<li>“' + esc(q) + '”</li>'; }).join('') + '</ul>';
    // a sentence to bridge the gap
    var mine = seen.yousaw[0], theirs = (picks.filter(function (p) { return p.g.id === 'around' || p.g.id === 'state'; })[0] || {}).o;
    var bridge = 'I think we may have been seeing this from different places.' +
      (mine ? ' On my side, I knew about ' + mine + ', and I’m not sure that came across.' : '') +
      (theirs ? ' I’m wondering whether, for you, ' + theirsPhrase(theirs[0]) + '.' : '') +
      ' Could we compare notes? I’d like to understand how it looked to you.';
    h += '<h3>A sentence to bridge the gap</h3><p class="ps-bridge">' + esc(bridge) + '</p>' +
      '<p class="ps-acts"><button type="button" class="ps-b" data-copy>Copy the sentence</button><a class="ps-b is-main" href="/signal-translator.html?text=' + encodeURIComponent(bridge) + '">Check how it may land in the Signal Translator →</a></p>';
    var said = (root.querySelector('[data-said]') || {}).value;
    if (said && said.trim()) h += '<p class="ps-acts"><a class="ps-b" href="/signal-translator.html?text=' + encodeURIComponent(said.trim()) + '">See how the words that were said may have been heard →</a></p>';
    h += '<p class="ps-tag">Built on the seven angles in <a href="/book/chapter-3.html">Chapter III</a> and <a href="/five-pillars.html#tune-signals">Pillar IV, Tune how you send and receive</a>. For how different wiring changes what’s heard, see <a href="/wired-differently.html">Wired Differently</a>.</p>';
    out.innerHTML = h;
  }
  function theirsPhrase(id) {
    return { calm: 'you were simply calm and meant it plainly', revved: 'you were already wound up when I asked', empty: 'you were running on empty', unsure: 'something was going on that I didn’t know about',
      day: 'it had already been a long day', sleep: 'you were short on sleep', rushed: 'you were rushed', money: 'money was on your mind', caring: 'you were stretched from caring for someone',
      unwell: 'you weren’t feeling your best', noisy: 'it was hard to think in all that noise', others: 'it felt different with other people there', text: 'my message read differently than I meant', late: 'it landed late, when you were tired' }[id] || 'something was going on that I didn’t know about';
  }

  build();
  root.addEventListener('click', function (e) {
    var b = e.target.closest('.ps-chip');
    if (b) {
      var g = b.getAttribute('data-g'), id = b.getAttribute('data-id'), G = GROUPS.filter(function (x) { return x.id === g; })[0], list = sel(g), i = list.indexOf(id);
      if (i >= 0) list.splice(i, 1); else { if (G && G.one) list.length = 0; list.push(id); }
      Array.prototype.forEach.call(root.querySelectorAll('.ps-chip[data-g="' + g + '"]'), function (c) { var x = on(g, c.getAttribute('data-id')); c.classList.toggle('is-on', x); c.setAttribute('aria-pressed', String(x)); });
      render(); return;
    }
    if (e.target.closest('[data-copy]')) {
      var t = (root.querySelector('.ps-bridge') || {}).textContent || '', st = e.target.closest('[data-copy]');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { st.textContent = 'Copied'; setTimeout(function () { st.textContent = 'Copy the sentence'; }, 1600); });
    }
  });
  root.addEventListener('input', function (e) { if (e.target.hasAttribute('data-said')) { clearTimeout(root._t); root._t = setTimeout(render, 300); } });
  render();
  window.TOLPerspective = { _pick: function (g, id) { var b = root.querySelector('.ps-chip[data-g="' + g + '"][data-id="' + id + '"]'); if (b) b.click(); } };
})();
