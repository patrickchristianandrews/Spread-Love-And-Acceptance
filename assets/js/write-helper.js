/* write-helper.js: "Help me write it", the Chat analyzer's fourth mode (consol12), and the words it shares with two guides.
   One copy of:
     - the kind-no script maker's situations and scripts (also used by /refusals.html#make)
     - the Flip it rules: a complaint, a worry, a harsh thought or anger turned into a starting point (also used by
       /small-wins.html#flip-it), with the same crisis and safety notes
   and the "Help me write it" view: Ask for a change, Reply to something that stung, Say no kindly. Each one ends in the
   checker (the page's own "A message I'm about to send"), so you see how it may land before you send it.
   Everything is put together on this device. Nothing is stored or sent.
   The Chat analyzer loads this file only when "Help me write it" opens (or #write is in the address).
   For other scripts: window.TOLWriteKit = { sayNo: { TYPES, S, ORDER, script(sit, type, tone, when) },
     flip: { CRISIS, DANGER, LABELS, CRISIS_HTML, DANGER_HTML, tidy, complaint, worry, self, anger, run(raw, kind) },
     stingLine(fact, feeling, ask), mount(el, { check(o), sub, onSub(sub) }) } */
(function (root) {
  'use strict';
  if (root.TOLWriteKit) return;

  /* ---------------- Say no kindly (moved here from /refusals.html, unchanged) ---------------- */
  // Each script: say why it's fair (ack) + what you have left (cap) + something instead (alt).
  var TYPES = [
    { k: 'capacity', name: '“I’m full today”', for: 'For when you’re already at capacity.' },
    { k: 'delegate', name: '“Not me, but let’s find who”', for: 'For when it isn’t really yours to do.' },
    { k: 'later', name: '“Yes, just later”', for: 'For when you’ll do it, just not on their timeline.' }
  ];
  var S = {
    family: { label: 'Family guilt', rel: 'family', when: 'next Sunday',
      ack: { warmer: 'I know how much it means to you when we’re all together, and I love that you want me there.', plainer: 'I know you’d like me to come.', firmer: 'I hear that you’d like me there.' },
      capacity: ['I don’t have it in me this weekend. I’m stretched thin, and I’d be poor company.', 'I’m not able to come this weekend.', 'Could I come for lunch {when} instead?', 'I can come {when}, if that works.'],
      delegate: ['I can’t be the one who organises it this time.', 'I won’t be organising it this time.', 'Could one of the others take the lead? I’m happy to bring something.', 'Someone else will need to take the lead. I can bring something.'],
      later: ['I do want to see you, just not this weekend.', 'Not this weekend.', 'Let’s put {when} in the calendar now, so it’s settled.', 'I’ll come {when}. Let’s put it in the calendar.'],
      warm: 'I love you, and I’m not going anywhere.', firm: 'I’ve thought about it, and that’s my answer for now.' },
    friend: { label: 'A friend asking a favour', rel: 'friends', when: 'Saturday morning',
      ack: { warmer: 'I’m really glad you asked me, and I can see you need a hand.', plainer: 'I can see you need a hand with this.', firmer: 'I understand you need help with this.' },
      capacity: ['My week is already full, and I can’t take on anything else right now.', 'I can’t do it this week.', 'Could I help for an hour {when} instead?', 'I could do one hour {when}.'],
      delegate: ['I’m not the best person for this one.', 'I’m not the right person for this one.', 'Could I help you find someone who is? I can ask around tonight.', 'I can help you find someone else, but it won’t be me.'],
      later: ['I’d like to help, just not today.', 'Not today.', 'I’m free {when}. Would that still help?', 'I can do {when}.'],
      warm: 'You matter to me, so I’d rather be honest than let you down.', firm: '' },
    work: { label: 'Extra work at my job', rel: 'coworkers', when: 'next Monday',
      ack: { warmer: 'Thanks for thinking of me. I can see this needs doing.', plainer: 'I can see this needs doing.', firmer: 'I understand this needs doing.' },
      capacity: ['My plate is full this week, and taking this on would put my current deadlines at risk.', 'I don’t have capacity for this right now.', 'If it’s urgent, which of my current tasks should move so I can fit it in?', 'If it has to be me, please tell me which of my current tasks should wait.'],
      delegate: ['I’m not the right person for this one.', 'This one shouldn’t be mine.', 'Someone who knows this area might be a better fit. I’m happy to hand over what I know.', 'It should go to someone else. I can hand over what I know.'],
      later: ['I can take it on, just not until {when}.', 'I can start it {when}, not before.', 'If that’s too late, can we look at what else could move?', 'If that’s too late, it will need to go to someone else.'],
      warm: 'I want to do it well, and right now I can’t.', firm: '' },
    pushed: { label: 'A no that keeps getting pushed', rel: '', when: 'next month',
      ack: { warmer: 'I know this matters to you, and I can tell you were hoping I’d change my mind.', plainer: 'I know you’d like a different answer.', firmer: 'I’ve heard you, and I’ve already given my answer.' },
      capacity: ['My answer is still no. I don’t have room for it.', 'My answer is still no.', 'I’m happy to talk about something else I could do instead.', 'I won’t keep going over it, but I’m glad to talk about something else.'],
      delegate: ['This isn’t something I’m going to do.', 'I’m not going to do this.', 'Maybe someone else can help with it. I’m glad to think through who.', 'You’ll need to find another way. It won’t be me.'],
      later: ['I’m not changing my answer today.', 'Asking again won’t change my answer today.', 'If that changes, I’ll be the one to bring it up, maybe {when}.', 'If that changes, I’ll tell you. Please don’t ask again before then.'],
      warm: 'I care about you, and saying no is part of how I keep caring well.', firm: '',
      extra: 'A no that gets pushed again and again is worth noticing. You can stop explaining; one calm repeat is enough.' },
    money: { label: 'Someone asking for money', rel: '', when: 'at the start of next month',
      ack: { warmer: 'I can hear how stressful money is for you right now, and I’m glad you felt you could ask me.', plainer: 'I can see money is tight for you right now.', firmer: 'I understand you need money.' },
      capacity: ['I’m not able to lend money right now. My own budget doesn’t have room.', 'I can’t lend money.', 'I could help in another way, like going through a budget with you.', 'I can help you look for other support.'],
      delegate: ['I’m not the right person to lend money. Lending between us could strain things.', 'I don’t lend money, even to people I love.', 'Could we look together at who could help, like a free money advice service?', 'A free money advice service would be a better place to start.'],
      later: ['I can’t help with money now.', 'Not right now.', 'I can look at my own budget again {when} and tell you honestly then.', 'I’ll let you know {when}, not before.'],
      warm: 'This is about my budget, not about how much I care.', firm: '',
      extra: 'If money is being used to control you, or someone takes or checks your money without asking, see <a href="/money-together.html#control">Money together</a> on normal limits versus control.' },
    visit: { label: 'A visit or a stay', rel: 'family', when: 'next month',
      ack: { warmer: 'I’d love to see you, and it means a lot that you want to come.', plainer: 'I know you’d like to come and stay.', firmer: 'I hear that you’d like to visit.' },
      capacity: ['We can’t have overnight guests right now. The house and the week are both too full.', 'We can’t have you to stay this time.', 'Could we meet for a meal while you’re in town instead?', 'We can meet for a meal while you’re here.'],
      delegate: ['Our place isn’t the best place to stay this time.', 'Staying with us won’t work this time.', 'There’s a nice place to stay nearby. I’m happy to send you the details.', 'You’ll need to book somewhere nearby. I can send some ideas.'],
      later: ['We’d love to have you, just not this month.', 'Not this month.', 'Would {when} work for you instead?', 'We could do {when}.'],
      warm: 'We’ll make it a good visit when it happens.', firm: '' },
    partner: { label: 'My partner’s plan', rel: 'partner', when: 'next weekend',
      ack: { warmer: 'I love that you planned something for us, and I can tell you put thought into it.', plainer: 'I can see you’ve made a plan for us.', firmer: 'I see you’ve made a plan for us.' },
      capacity: ['I’m running on empty this week, and a big evening out is more than I’ve got.', 'I’m not up for it this week.', 'Could we do something quieter at home instead, and save the big plan?', 'I’d rather stay home this time.'],
      delegate: ['I’m not the right company for this one. It’s more your thing than mine.', 'This one isn’t for me.', 'Would you like to go with a friend who’d enjoy it more? I’d love to hear all about it.', 'Go with someone who’ll enjoy it. I’m happy to stay home.'],
      later: ['I’d like to do it, just not this week.', 'Not this week.', 'Can we move it to {when} instead?', 'I can do {when}.'],
      warm: 'I really do want time with you.', firm: 'Next time, can we check with each other before we make plans for both of us?' },
    roommate: { label: 'A roommate’s request', rel: 'roommates', when: 'tomorrow evening',
      ack: { warmer: 'Thanks for asking me first. I know it’s important to you.', plainer: 'I see why you’re asking.', firmer: 'I understand what you’re asking.' },
      capacity: ['I can’t take that on this week. I’ve already got a lot on.', 'I can’t do it this week.', 'Could we swap? You take it this week, and I’ll take one of yours next week.', 'It will need to be you this week. I’ll do my usual jobs.'],
      delegate: ['I don’t think this one should be my job.', 'That one isn’t mine to do.', 'Let’s put it on the shared list so we can agree who owns it.', 'Let’s agree an owner for it on the shared list.'],
      later: ['I can do it, just not tonight.', 'Not tonight.', 'I’ll do it {when}. Does that work?', 'I’ll do it {when}.'],
      warm: 'I want living together to feel fair for both of us.', firm: '' },
    advice: { label: 'A parent’s advice', rel: 'family', when: 'at the weekend',
      ack: { warmer: 'I know you’re saying this because you love us, and you’ve been through it yourself.', plainer: 'Thanks. I know you mean well.', firmer: 'I hear your advice.' },
      capacity: ['I don’t have room for more opinions on this right now. I’m still finding my way.', 'I’m not looking for advice on this right now.', 'What would really help is a hand with something practical, like dinner one night.', 'I’d welcome help with something practical instead.'],
      delegate: ['This is one we need to decide ourselves.', 'This one is ours to decide.', 'If we want advice, we’ll ask, and you’ll be one of the first people we come to.', 'We’ll ask if we want advice.'],
      later: ['I might want your thoughts, just not today.', 'Not today.', 'Can I come to you about it {when}, when I’ve had time to think?', 'I’ll ask you {when}, if I want to talk it through.'],
      warm: 'I’m glad you’re in our lives.', firm: '' },
    host: { label: 'Hosting a holiday or event', rel: 'family', when: 'next year',
      ack: { warmer: 'I know how much everyone loves being together for the holidays, and I love it too.', plainer: 'I know everyone would like to come here again.', firmer: 'I know you’d all like to come here.' },
      capacity: ['Hosting this year is more than I can manage.', 'I can’t host this year.', 'Could we share it? One person hosts, and everyone brings a dish.', 'I’m happy to bring a dish to wherever it is.'],
      delegate: ['I’ve hosted for a few years now, and I’d like someone else to have a turn.', 'It’s someone else’s turn to host.', 'Could we decide together who hosts this year? I’ll help them plan.', 'Let’s agree who hosts. It won’t be me this year.'],
      later: ['I’d like to host again, just not this year.', 'Not this year.', 'Could I take {when} instead?', 'I can host {when}.'],
      warm: 'Being together is what matters to me, not whose house it is.', firm: '' }
  };
  var ORDER = ['family', 'friend', 'work', 'pushed', 'money', 'visit', 'partner', 'roommate', 'advice', 'host'];

  /* ---------------- Flip it (moved here from /small-wins.html, unchanged) ---------------- */
  var CRISIS = /\b(kill(ing)? myself|end(ing)? (it all|my life)|want(ed)? to die|wish i (was|were) dead|suicid\w*|hurt(ing)? myself|better off without me|no (point|reason) (in )?(living|going on))\b/i;
  var DANGER = /\b(hits? me|hitting me|shoved me|pushed me|chok\w+ me|threaten\w*|scared of (him|her|them)|afraid of (him|her|them)|(won'?t|doesn'?t|don'?t|never) lets? me (see|go|leave|have|out)|checks? my phone|takes? my money|controls? (my|me|everything))\b/i;
  var LABELS = /\b(stupid|an idiot|idiot|useless|a failure|failure|lazy|hopeless|pathetic|worthless|a mess|a loser|loser|terrible|awful|not good enough|a burden|a bad (mum|mom|dad|mother|father|parent|partner|friend|person|wife|husband|boss|son|daughter))\b/i;

  // a threat of harm ("…or I'll slap you", "I know where you live"): never polished into a nicer-sounding threat.
  // The shared reading (message-patterns.js) when it's on the page, and a short fallback when it isn't.
  var HARM_LITE = /\b(?:i'?ll|i will|i'?m (?:going to|gonna)|ima|imma|gonna)\s+(?:\w+\s+)?(?:beat|hit|punch|slap|smack|kick|hurt|choke|strangle|stab|shoot|kill|murder|end|destroy|smash|break|knock|whack)\s+(?:you|u|ya|your|ur)\b|\b(?:you'?re|ur) (?:so )?dead\b(?! (?:tired|right|to me))|\bi know where (?:you|u) live\b|\bsee what happens\b|\b(?:watch|wach) (?:yourself|urself|your back)\b|\btry me\b|\byou(?:'ve| have)? been warned\b/i;
  function patterns() {
    if (root.TOLPatterns) return root.TOLPatterns;
    try { if (typeof module !== 'undefined' && typeof require === 'function') return require('./message-patterns.js'); } catch (e) {}
    return null;
  }
  function threatIn(s) {
    var P = patterns(), t = String(s || '');
    if (P && P.harm) { var h = P.harm(t); return !!(h && !h.playful) || (P.THREAT_RE ? P.THREAT_RE.test(P.prep(t)) : false); }
    return HARM_LITE.test(t);
  }
  var HARM_SEND = 'I’m really angry about [what happened]. What I need is [one specific thing]. Can we talk about it at [a calm time]?';
  function threatFlip(t) {
    return { text: ['The threat is left out. Words like that frighten people, whatever was meant, and a politer version is still a threat.', '', 'What you could say:', '“' + HARM_SEND + '”', '', 'Fill in the gaps when you’re calmer: what happened, and the one thing you need.'].join('\n'),
      send: HARM_SEND, threat: true, why: 'Anger is information about something that matters to you. Said as a feeling and a need, it can be heard and answered. Said as a threat, it can’t.' };
  }
  function tidy(s) { return String(s || '').replace(/\s+/g, ' ').trim().replace(/[.!?…]+$/, '').trim(); }
  function unthird(verb) {
    var v = verb.toLowerCase();
    var map = { does: 'do', has: 'have', is: 'be', goes: 'go', says: 'say' };
    if (map[v]) return map[v];
    if (/ies$/.test(v) && v.length > 4) return v.slice(0, -3) + 'y';
    if (/(sh|ch|ss|x|z)es$/.test(v)) return v.slice(0, -2);
    if (/[^s]s$/.test(v)) return v.slice(0, -1);
    return v;
  }
  function toYou(rest, who, third) {
    var words = rest.split(' ');
    if (third && words.length) words[0] = unthird(words[0]);
    var out = words.join(' ');
    if (who === 'he') out = out.replace(/\bhis\b/gi, 'your').replace(/\bhimself\b/gi, 'yourself').replace(/\bhim\b/gi, 'you');
    if (who === 'she') out = out.replace(/\bherself\b/gi, 'yourself').replace(/\bher\b/gi, 'your');
    if (who === 'they') out = out.replace(/\btheir\b/gi, 'your').replace(/\bthemselves\b/gi, 'yourselves');
    return out;
  }
  function complaintFlip(t) {
    var neg = t.match(/\b(you|he|she|they)\s+(?:never(?:\s+ever)?|don'?t\s+ever|doesn'?t\s+ever|won'?t\s+ever|don'?t|do not|doesn'?t|does not|won'?t|will not|can'?t be bothered to|can'?t even|never even|didn'?t|did not)\s+(.+)$/i);
    var alw = t.match(/\b(you|he|she|they)\s+(always|keeps?|constantly|forever)\s+(.+)$/i);
    var lines, send;
    if (neg) {
      var who = neg[1].toLowerCase(), third = (who === 'he' || who === 'she') && /never/i.test(neg[0]) && !/doesn|does not/i.test(neg[0]);
      var act = toYou(tidy(neg[2]), who, third);
      send = 'Could you ' + act + ' by [when]? It would help me [what it gives you].';
      lines = ['What you could say:', '“' + send + '”', '', 'Fill in the gaps: a day or time, and what it gives you (time to rest, less worry, feeling like a team).'];
    } else if (alw) {
      var who2 = alw[1].toLowerCase(), keep = /^keep/i.test(alw[2]);
      var act2 = toYou(tidy(alw[3]), who2, !keep && (who2 === 'he' || who2 === 'she'));
      if (keep) act2 = 'keep ' + act2;
      send = 'When you ' + act2 + ', I feel [one feeling word]. Could you [what you’d like instead] by [when]? It would help me [what it gives you].';
      lines = ['What you could say:', '“' + send + '”', '', 'Think of the one time that bothered you most, not every time. Then ask for what you’d like instead, not what you want them to stop.'];
    } else {
      send = 'I’d like to ask for one thing. Could you [one specific thing] by [when]? It would help me [what it gives you].';
      lines = ['What happened, in plain words:', '“' + t + '”', '', 'What you could say:', '“' + send + '”', '', 'Ask yourself: what do I want to happen next time? Put that in the gap.'];
    }
    return { text: lines.join('\n'), send: send, why: 'Under most complaints is a request. One clear ask, with a time and a reason, is easier to say yes to than “you never”. (From John Gottman’s research on complaints versus criticism.)' };
  }
  function worryFlip(t) {
    var m = t.match(/\bwhat if\s+(.+)$/i) || t.match(/\b(?:i'?m|i am|i feel)\s+(?:so\s+|really\s+|very\s+|a bit\s+)?(?:worried|scared|afraid|anxious|nervous|stressed)\s+(?:that|about|of)\s+(.+)$/i) || t.match(/\bworried\s+(?:that|about)\s+(.+)$/i);
    var obstacle = m ? tidy(m[1]) : '';
    var lines = [
      'The best outcome would be: [what you hope for]',
      'The main thing in the way: ' + (obstacle ? obstacle : '[what you fear could happen]'),
      'If that happens, I’ll: [one small thing you could do]',
      'One step today: [something that takes ten minutes or less]'
    ];
    return { text: lines.join('\n'), send: '', why: 'This is WOOP, from Gabriele Oettingen’s research: Wish, Outcome, Obstacle, Plan. The worry becomes the obstacle you plan for.' };
  }
  function selfFlip(t) {
    var lab = t.match(LABELS), ev = t.match(/\bi\s+((?:forgot|missed|messed up|failed|lost|said|snapped|yelled|shouted|broke|ruined|didn'?t|did not|couldn'?t|could not|wasted|skipped|overslept|let)\b.*)$/i);
    var event = ev ? tidy(ev[1].replace(/\bmy\b/gi, 'your').replace(/\bme\b/gi, 'you').replace(/\bmyself\b/gi, 'yourself').replace(/\bi am\b/gi, 'you are').replace(/\bi['’]m\b/gi, 'you’re').replace(/\bi was\b/gi, 'you were').replace(/\bi\b/gi, 'you').replace(/\bam\b/gi, 'are')) : '';
    var label = lab ? lab[1].toLowerCase() : '';
    var friend = event ? 'You ' + event + '. That’s one moment, not the whole of you.' : 'That sounds like a hard moment. One mistake is not the whole of you.';
    if (label) friend += /^not /.test(label) ? ' You’re enough, even on a hard day.' : ' You’re not ' + (/^(idiot|failure|loser)$/.test(label) ? 'a ' + label : label) + '. You’re a person having a hard day.';
    var lines = [
      'What a good friend might say:',
      '“' + friend + '”',
      '',
      'Kinder words for yourself:',
      '“I ' + (ev ? tidy(ev[1]) : 'had a hard moment') + '. I’m human. Next time I’ll [one thing].”',
      '',
      'One next step: [one small thing, like a short sorry, a reminder on your phone, or some rest]'
    ];
    return { text: lines.join('\n'), send: '', why: 'Talking to yourself the way you’d talk to a friend is a simple form of self-compassion. Being harsh rarely makes the next try easier.' };
  }
  var VALUES = [
    [/unfair|fair\b|always me|only one who|all the work|the load|chores?/i, 'fairness, and sharing the load'],
    [/\blie[sd]?\b|lying|honest|behind my back|secret/i, 'honesty and trust'],
    [/\blate\b|waiting|waited|cancel\w*|stood me up|forgot/i, 'being able to count on each other, and my time'],
    [/ignor\w+|interrupt\w*|didn'?t listen|not listening|dismiss\w*|talked over/i, 'being heard'],
    [/rude|disrespect\w*|shout\w*|yell\w*|mock\w*|laugh\w* at|sarcas\w*|belittl\w*|eye-?roll/i, 'respect'],
    [/money|spent|spend\w*|bills?\b|debt/i, 'having a say in shared money'],
    [/credit|boss|manager|meeting|took my idea/i, 'fair credit and clear roles'],
    [/mess|dishes|tidy|clean\w*|laundry/i, 'a home that works for all of us']
  ];
  function angerFlip(t) {
    var val = '';
    for (var i = 0; i < VALUES.length; i++) if (VALUES[i][0].test(t)) { val = VALUES[i][1]; break; }
    var send = 'This matters to me because I care about ' + (val || '[what this is protecting]') + '. What I need is [one specific thing]. Could you [one small ask] by [when]?';
    var lines = [
      'This matters to me because I care about: ' + (val || '[what this is protecting]'),
      'What I need is: [one specific thing]',
      'One thing I could ask for: “Could you [one small ask] by [when]?”',
      'When I’ll say it: [a calm time, not in the heat of it]'
    ];
    return { text: lines.join('\n'), send: send, why: 'Anger is information about a value or a limit. Use it to find the request, then wait until your body has settled before you say it.' };
  }

  var CRISIS_HTML = '<p><strong>It sounds like you might be in a lot of pain.</strong> You don’t have to carry this alone. In the US, call or text <strong>988</strong>. Elsewhere, <a href="https://findahelpline.com/" rel="noopener">findahelpline.com</a> lists free lines by country. If you are in danger now, call your local emergency number.</p>';
  // No flip here: asking nicely is not the answer to fear or control.
  var DANGER_HTML = '<p><strong>If you feel afraid of someone, or they control you, a kinder request isn’t the answer, and it isn’t your fault.</strong> <a href="/safety.html">Safety &amp; support</a> has free, private people to talk to.</p>';

  // one say-no script: why it's fair + what you have left + something instead (refusals.html and the Chat analyzer)
  function sayNoScript(k, typeKey, tone, whenText) {
    var d = S[k], t = d[typeKey], firm = tone === 'firmer';
    var when = (whenText || '').replace(/\s+/g, ' ').trim() || d.when;
    var parts = [d.ack[tone], firm ? t[1] : t[0], firm ? t[3] : t[2]];
    if (tone === 'warmer' && d.warm) parts.push(d.warm);
    if (firm && d.firm) parts.push(d.firm);
    return parts.join(' ').replace(/\{when\}/g, when);
  }
  // Flip it: a complaint, a worry, a harsh thought or anger -> a starting point (small-wins.html and the Chat analyzer)
  // returns { alert: html } when it shouldn't be flipped, else { text, send, why }
  function flip(raw, kind) {
    var t = tidy(raw);
    if (!t) return null;
    if (CRISIS.test(raw)) return { alert: CRISIS_HTML };
    if (DANGER.test(raw)) return { alert: DANGER_HTML };
    if (kind !== 'worry' && kind !== 'self' && threatIn(raw)) {
      // the complaint around the threat ("You never listen") still gets its request; the threat part is dropped
      var rest = t.split(/(?:[.!?]+|,)\s*|\s+(?:and|or)\s+(?=i\b|i'|you'll|see\b|watch\b)/i).filter(function (x) { return x && !threatIn(x) && !/^(?:keep (?:it up|going|talking|pushing)|or else|and|or|i swear|you know what|try me|go on then|i'?m warning you)\b/i.test(x.trim()); }).join(', ');
      if (kind === 'complaint' && /\b(?:you|he|she|they)\b/i.test(rest) && rest.split(/\s+/).length >= 3) {
        var r = complaintFlip(tidy(rest));
        r.text = 'The threat is left out. Words like that frighten people, whatever was meant.\n\n' + r.text; r.threat = true;
        return r;
      }
      return threatFlip(t);
    }
    return kind === 'worry' ? worryFlip(t) : kind === 'self' ? selfFlip(t) : kind === 'anger' ? angerFlip(t) : complaintFlip(t);
  }

  /* ================= "Help me write it": the Chat analyzer's fourth mode =================
     mount(el, { check(o), sub, onSub(sub) }): draws three ways in. Each one ends in the checker: check({ text, mine:true, before })
     opens "A message I'm about to send" with the words in the box (and what they said as "Replying to"). Nothing is stored. */
  function escH(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function copyText(text) {
    function fallback() {
      var ta = document.createElement('textarea'), ok = false;
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-1000px';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove(); return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    return Promise.resolve(fallback());
  }
  var SUBS = [
    ['ask', 'Ask for a change', 'Turn a complaint into one clear request'],
    ['reply', 'Reply to something that stung', 'A fact, a feeling and one kind ask'],
    ['no', 'Say no kindly', 'Warmer, plainer or firmer, with something to offer']
  ];
  var FEELINGS = ['hurt', 'worried', 'frustrated', 'left out', 'embarrassed', 'tired', 'confused'];
  function lower1(s) { return /^(I\b|I[’']|[A-Z]{2,})/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1); }
  function stingLine(fact, feel, ask) {
    // a threat typed into a box is left out (a blank instead), never turned into a polite-sounding request
    if (threatIn(fact)) fact = '';
    if (threatIn(feel)) feel = '';
    if (threatIn(ask)) ask = '';
    fact = tidy(fact).replace(/^when\s+/i, '');
    feel = tidy(feel).replace(/^i\s+(?:felt|feel|was|am)\s+/i, '');
    ask = tidy(ask).replace(/^(?:please\s+)?(?:could|can|would|will)\s+you\s+/i, '').replace(/^please\s+/i, '');
    var we = /^(?:we|let['’]s)\s+/i.test(ask);
    if (we) ask = ask.replace(/^(?:we|let['’]s)\s+/i, '');
    return 'When ' + (fact ? lower1(fact) : '[what happened]') + ', I felt ' + (feel || '[one feeling word]') + '. ' +
      (we ? 'Could we ' : 'Could you ') + (ask ? lower1(ask) : '[one small thing]') + '?';
  }

  function mount(root, opts) {
    if (!root || root.getAttribute('data-wh-on')) return;
    root.setAttribute('data-wh-on', '1');
    opts = opts || {};
    var sub = /^(ask|reply|no)$/.test(opts.sub || '') ? opts.sub : 'ask';
    var check = function (o) { if (opts.check) opts.check(o); };
    var h = '<div class="wh-pick" role="group" aria-label="What do you need to write?">' + SUBS.map(function (s) {
      return '<button type="button" class="wh-tab" data-wh="' + s[0] + '" aria-pressed="false" aria-controls="wh-' + s[0] + '"><b>' + s[1] + '</b><small>' + s[2] + '</small></button>';
    }).join('') + '</div>';
    // 1. Ask for a change (Flip it: a complaint, or anger, into one clear request)
    h += '<div class="wh-pane" id="wh-ask" data-pane="ask" hidden>' +
      '<label class="wh-l" for="wh-ask-text">What’s bothering you? Say it the way it comes out.</label>' +
      '<textarea id="wh-ask-text" maxlength="600" rows="3" placeholder="For example: You never help with the dishes."></textarea>' +
      '<fieldset class="wh-kinds"><legend>What kind is it?</legend>' +
      '<label class="wh-chip"><input type="radio" name="wh-kind" value="complaint" checked><span>A complaint about someone</span></label>' +
      '<label class="wh-chip"><input type="radio" name="wh-kind" value="anger"><span>I’m angry about it</span></label></fieldset>' +
      '<div class="wh-acts"><button type="button" class="wh-btn is-main" id="wh-ask-go">Turn it into a request</button><button type="button" class="wh-btn" id="wh-ask-clear">Clear</button></div>' +
      '<div class="wh-alert" id="wh-ask-alert" role="alert" hidden></div>' +
      '<div class="wh-out" id="wh-ask-out" tabindex="-1" hidden></div>' +
      '<p class="wh-note" id="wh-ask-why" hidden></p>' +
      '<div class="wh-acts" id="wh-ask-acts" hidden><button type="button" class="wh-btn is-main" id="wh-ask-check">Check how it may land</button><button type="button" class="wh-btn" id="wh-ask-copy">Copy</button></div>' +
      '<p class="wh-note">A worry, or being hard on yourself? <a href="/small-wins.html#flip-it">Flip it</a> turns those into a plan or kinder words.</p></div>';
    // 2. Reply to something that stung (a fact, a feeling and one kind ask)
    h += '<div class="wh-pane" id="wh-reply" data-pane="reply" hidden>' +
      '<label class="wh-l" for="wh-r-got">What they said <span>(optional)</span></label>' +
      '<textarea id="wh-r-got" maxlength="600" rows="2" placeholder="Paste their message, so your reply is read as an answer to it."></textarea>' +
      '<label class="wh-l" for="wh-r-fact">What happened, just the facts</label>' +
      '<input type="text" id="wh-r-fact" maxlength="200" autocomplete="off" placeholder="For example: you were an hour late and didn’t text">' +
      '<fieldset class="wh-kinds"><legend>How it landed: one feeling word</legend>' + FEELINGS.map(function (f) {
        return '<label class="wh-chip"><input type="radio" name="wh-feel" value="' + f + '"><span>' + f + '</span></label>';
      }).join('') + '</fieldset>' +
      '<label class="wh-l" for="wh-r-own">Or your own word</label><input type="text" id="wh-r-own" maxlength="40" autocomplete="off" placeholder="For example: let down">' +
      '<label class="wh-l" for="wh-r-ask">One kind ask</label>' +
      '<input type="text" id="wh-r-ask" maxlength="200" autocomplete="off" placeholder="For example: send a quick text when you’re running late">' +
      '<p class="wh-k">Your reply</p><div class="wh-out" id="wh-r-out" aria-live="polite"></div>' +
      '<div class="wh-acts"><button type="button" class="wh-btn is-main" id="wh-r-check">Check how it may land</button><button type="button" class="wh-btn" id="wh-r-copy">Copy</button></div>' +
      '<p class="wh-note">Answer the point, not the sting: one fact, one feeling, one ask. Want to go slower? The workpaper <a href="/workpapers/wp-09-say-it-so-it-lands.html">Say it so it lands (WP-09)</a> walks through it on paper.</p></div>';
    // 3. Say no kindly (the script maker from /refusals.html)
    h += '<div class="wh-pane" id="wh-no" data-pane="no" hidden>' +
      '<fieldset class="wh-kinds"><legend>1. What’s the situation?</legend><div class="wh-chips" id="wh-sits"></div></fieldset>' +
      '<fieldset class="wh-kinds"><legend>2. How do you want it to sound?</legend><div class="wh-chips" id="wh-tones">' +
      ['warmer', 'plainer', 'firmer'].map(function (t) { return '<button type="button" class="wh-cbtn" data-tone="' + t + '" aria-pressed="' + (t === 'plainer') + '">' + t.charAt(0).toUpperCase() + t.slice(1) + '</button>'; }).join('') +
      '</div></fieldset>' +
      '<label class="wh-l" for="wh-when">A time you could offer <span>(optional)</span></label><input type="text" id="wh-when" maxlength="60" autocomplete="off" placeholder="for example: Sunday afternoon">' +
      '<div id="wh-no-out" hidden><p class="wh-k" id="wh-no-h">Three ways to say it</p><div id="wh-no-cards"></div><p class="wh-note" id="wh-no-extra" hidden></p></div>' +
      '<p class="wh-note">More on how a kind no works, and what it isn’t: <a href="/refusals.html">Say no kindly</a>.</p></div>';
    h += '<p class="wh-status" id="wh-status" role="status" aria-live="polite"></p>';
    root.innerHTML = h;

    var $ = function (id) { return document.getElementById(id); };
    var statusEl = $('wh-status');
    function say(t) { statusEl.textContent = ''; setTimeout(function () { statusEl.textContent = t; }, 30); }
    function copied(btn, ok) {
      if (ok) { var o = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = o; }, 1500); say('Copied. Change any words so it sounds like you.'); }
      else say('Copying didn’t work here. Select the words and copy them by hand.');
    }
    function show(s, focus) {
      sub = s;
      [].forEach.call(root.querySelectorAll('.wh-tab'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-wh') === s ? 'true' : 'false'); });
      [].forEach.call(root.querySelectorAll('.wh-pane'), function (p) { p.hidden = p.getAttribute('data-pane') !== s; });
      if (opts.onSub) opts.onSub(s);
      if (focus) { var f = root.querySelector('#wh-' + s + ' textarea, #wh-' + s + ' input, #wh-' + s + ' button'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} }
    }
    root.querySelector('.wh-pick').addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.wh-tab'); if (b) show(b.getAttribute('data-wh'), true);
    });

    // 1. ask
    var last = null;
    function askReset() { $('wh-ask-out').hidden = true; $('wh-ask-out').textContent = ''; $('wh-ask-why').hidden = true; $('wh-ask-acts').hidden = true; $('wh-ask-alert').hidden = true; $('wh-ask-alert').innerHTML = ''; last = null; }
    function askGo() {
      var raw = $('wh-ask-text').value, k = (root.querySelector('input[name="wh-kind"]:checked') || {}).value || 'complaint';
      askReset();
      var r = flip(raw, k);
      if (!r) { say('Type a sentence first. A rough one is fine.'); $('wh-ask-text').focus(); return; }
      if (r.alert) { $('wh-ask-alert').innerHTML = r.alert; $('wh-ask-alert').hidden = false; say(''); return; }
      last = r;
      $('wh-ask-out').textContent = r.text; $('wh-ask-out').hidden = false;
      $('wh-ask-why').textContent = r.why + ' This is a starting point. Change any words you like.'; $('wh-ask-why').hidden = false;
      $('wh-ask-acts').hidden = false;
      say('Here is a request to start from. Fill in the gaps, then check how it may land.');
      try { $('wh-ask-out').focus({ preventScroll: true }); } catch (e) {}
    }
    $('wh-ask-go').addEventListener('click', askGo);
    $('wh-ask-text').addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); askGo(); } });
    $('wh-ask-clear').addEventListener('click', function () { $('wh-ask-text').value = ''; askReset(); say('Cleared.'); $('wh-ask-text').focus(); });
    $('wh-ask-copy').addEventListener('click', function () { var b = this; if (last) copyText(last.send || last.text).then(function (ok) { copied(b, ok); }); });
    $('wh-ask-check').addEventListener('click', function () { if (last) check({ text: last.send || tidy($('wh-ask-text').value), mine: true }); });

    // 2. reply to something that stung
    function feelNow() { var own = tidy($('wh-r-own').value); if (own) return own; var r = root.querySelector('input[name="wh-feel"]:checked'); return r ? r.value : ''; }
    function stingNow() { return stingLine($('wh-r-fact').value, feelNow(), $('wh-r-ask').value); }
    function paint() { $('wh-r-out').textContent = stingNow(); }
    ['wh-r-fact', 'wh-r-own', 'wh-r-ask'].forEach(function (id) { $(id).addEventListener('input', paint); });
    root.querySelector('#wh-reply').addEventListener('change', function (e) { if (e.target && e.target.name === 'wh-feel') { $('wh-r-own').value = ''; paint(); } });
    paint();
    $('wh-r-copy').addEventListener('click', function () { var b = this; copyText(stingNow()).then(function (ok) { copied(b, ok); }); });
    $('wh-r-check').addEventListener('click', function () {
      var raw = [$('wh-r-fact').value, $('wh-r-own').value, $('wh-r-ask').value].join(' ');
      if (CRISIS.test(raw) || DANGER.test(raw)) { say(''); $('wh-r-out').innerHTML = CRISIS.test(raw) ? CRISIS_HTML : DANGER_HTML; return; }
      if (!tidy($('wh-r-fact').value) && !tidy($('wh-r-ask').value)) { say('Write what happened and one ask first. Rough is fine.'); $('wh-r-fact').focus(); return; }
      check({ text: stingNow(), mine: true, before: tidy($('wh-r-got').value) });
    });

    // 3. say no kindly
    var sit = null, tone = 'plainer';
    $('wh-sits').innerHTML = ORDER.map(function (k) { return '<button type="button" class="wh-cbtn" data-sit="' + k + '" aria-pressed="false">' + escH(S[k].label) + '</button>'; }).join('');
    function plainAt(i) { var q = root.querySelector('#wh-no-cards q[data-i="' + i + '"]'); return q ? q.textContent.replace(/^“|”$/g, '').trim() : ''; }
    function renderNo() {
      if (!sit) return;
      $('wh-no-cards').innerHTML = TYPES.map(function (t, i) {
        return '<div class="wh-card"><p class="wh-ck">' + (i + 1) + '. ' + t.name + '</p><p class="wh-for">' + t.for + '</p><q data-i="' + i + '">“' + escH(sayNoScript(sit, t.k, tone, $('wh-when').value)) + '”</q>' +
          '<div class="wh-acts"><button type="button" class="wh-btn is-main" data-check="' + i + '">Check how it may land</button><button type="button" class="wh-btn" data-copy="' + i + '">Copy</button></div></div>';
      }).join('');
      $('wh-no-h').textContent = 'Three ways to say it: ' + S[sit].label.toLowerCase() + ', ' + tone;
      var ex = $('wh-no-extra'); if (S[sit].extra) { ex.hidden = false; ex.innerHTML = S[sit].extra; } else ex.hidden = true;
      $('wh-no-out').hidden = false;
    }
    $('wh-sits').addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-sit]'); if (!b) return;
      sit = b.getAttribute('data-sit');
      [].forEach.call($('wh-sits').querySelectorAll('[data-sit]'), function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); });
      renderNo();
    });
    $('wh-tones').addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-tone]'); if (!b) return;
      tone = b.getAttribute('data-tone');
      [].forEach.call($('wh-tones').querySelectorAll('[data-tone]'), function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); });
      renderNo();
    });
    $('wh-when').addEventListener('input', renderNo);
    $('wh-no-cards').addEventListener('click', function (e) {
      var c = e.target.closest && e.target.closest('[data-copy]'), k = e.target.closest && e.target.closest('[data-check]');
      if (c) copyText(plainAt(c.getAttribute('data-copy'))).then(function (ok) { copied(c, ok); });
      if (k) check({ text: plainAt(k.getAttribute('data-check')), mine: true });
    });

    show(sub, false);
    return { show: function (s) { if (/^(ask|reply|no)$/.test(s)) show(s, false); } };
  }

  root.TOLWriteKit = {
    sayNo: { TYPES: TYPES, S: S, ORDER: ORDER, script: sayNoScript },
    flip: { CRISIS: CRISIS, DANGER: DANGER, LABELS: LABELS, CRISIS_HTML: CRISIS_HTML, DANGER_HTML: DANGER_HTML, tidy: tidy,
      complaint: complaintFlip, worry: worryFlip, self: selfFlip, anger: angerFlip, run: flip },
    stingLine: stingLine,
    mount: mount
  };
})(typeof window !== 'undefined' ? window : this);
