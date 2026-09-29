/* message-patterns.js — one shared list of what the message tools look for.

   The Signal Translator, the Carrier Wave Decoder's tone check and the Conversation Reader
   all read wording with this list, so the same words get the same reading in every tool.
   Everything runs in the visitor's browser. Nothing typed is saved or sent anywhere.

   It reads words only. It can't hear a voice, see a face or know two people's history,
   so every mark is a "may land as", never a verdict on the person who wrote it.

   TOLPatterns.LIST            the patterns: {id, name, group, heat, good, what, fix, ex}
   TOLPatterns.scan(text)      -> [{id, start, end, text}], overlaps resolved (longest wins)
   TOLPatterns.has(text, id)   -> true when that pattern is in the text
   TOLPatterns.hasTime(text)   -> a real time or day ("by 8", "Friday", "tonight", "in 20 minutes")
   TOLPatterns.hasAppreciation(text) -> thanks, "love you", "I appreciate", not the sarcastic kind
   TOLPatterns.isFlat(text)    -> a very short reply ("ok", "k", "fine.")
   TOLPatterns.lookFor(el, opts) fills el with the plain-language "What it looks for" list */
(function (root) {
  'use strict';

  var DAYS = '(?:mon|tues|wednes|thurs|fri|satur|sun)day';
  var TIME_RE = new RegExp(
    '\\b(?:by|at|before|after|until|around|from|on)\\s+(?:\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?|o\'clock)?|noon|midnight|tonight|tomorrow|today|' + DAYS + '|the weekend|dinner|lunch|breakfast|bedtime|pickup|the end of (?:the )?(?:day|week|month))\\b' +
    '|\\b(?:tonight|today|tomorrow|this (?:morning|afternoon|evening|week|weekend)|next (?:week|month|' + DAYS + ')|' + DAYS + 's?|in (?:\\d+|an?|ten|five|fifteen|twenty|thirty|a few|two|three) (?:minutes?|mins?|hours?|days?)|after (?:dinner|lunch|breakfast|work|school|the kids are (?:down|asleep|in bed))|before (?:bed|dinner|work|school))\\b' +
    '|\\b(?:for |need |take |give me |in )?(?:an?|one|two|three|\\d+|a few|ten|twenty|thirty|fifteen|five) (?:hours?|minutes?|mins?)\\b' +
    '|\\b\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?)(?![a-z])|\\b(?:eod|end of (?:the )?day|close of business)\\b', 'i');

  // Each pattern's regular expression is written for lower-cased text with curly quotes made straight.
  var LIST = [
    { id: 'sarcasm', name: 'Sarcasm', group: 'edge', heat: 2,
      re: /\b(?:wow,? (?:thanks|thank you|great|nice|ok(?:ay)?|real(?:ly)? (?:nice|helpful|great)|just wow)|thanks for nothing|thanks a lot(?= *(?:[.!…🙄😒🙃]|$))|gee,? thanks|nice of you to (?:finally )?\w+|(?:how|so) (?:nice|good|kind|thoughtful|sweet) of you to (?:finally )?\w+|must be nice|sure you (?:did|are|will|do)|yeah,? right|oh,? (?:great|wonderful|perfect|lovely|fantastic|joy)(?= *(?:[.!,…🙄😒🙃]|$))|what a surprise|big surprise|real mature|(?:great|nice|good) job,? (?:really|genius)|lol,? ok(?:ay)?,? (?:whatever|sure|then)|whatever you say|love that for (?:me|us)|good for you(?= *(?:[.!…🙄😒🙃]|$))|glad you could (?:finally )?(?:make it|join us|show up))/g,
      what: 'Sarcasm says the opposite of the words, and the real meaning rides on tone. In writing the tone is missing, so the reader fills it in with the worst version.',
      fix: 'Say the real thing plainly, once: “I was hurt that you were late.”',
      ex: ['Wow, thanks for nothing.', 'Nice of you to finally show up.', 'Must be nice.', 'lol ok whatever you say 🙄'] },
    { id: 'contempt', name: 'Eye-roll or put-down', group: 'edge', heat: 3,
      re: /🙄|😒|\b(?:grow up|get a life|are you (?:serious|kidding me)|you can't be serious|unbelievable|pathetic|what is wrong with you|what's wrong with you|who does that|you're a joke|give me a break|oh please|spare me|as if|you wish|cry me a river|boo hoo|here we go again|not this again)\b/g,
      what: 'An eye-roll, mocking or a put-down says “I look down on you,” which hurts more than a complaint and is very hard to answer calmly.',
      fix: 'Drop the jab and say the complaint underneath it, about the thing, not the person.',
      ex: ['Grow up.', 'Are you serious right now 🙄', 'Here we go again.'] },
    { id: 'passive', name: 'Passive-aggressive edge', group: 'edge', heat: 2,
      re: /\bsome of us(?: (?:actually|like|have|need|work|care|still|were|are|had|do|clean))?\b|\bi guess i(?:'ll| will) [^.!?\n]{2,60}?(?:again|myself|since (?:nobody|no one|no-one) else (?:will|does|is going to|can|bothers))\b|\bsince (?:nobody|no one|no-one) else (?:will|does|is going to|can|bothers|seems to)\b|\b(?:fine|ok(?:ay)?|it's fine|no worries),? i(?:'ll| will) (?:just )?do it(?: myself)?\b|\bi(?:'ll| will) just do it myself\b|\bno need to be (?:rude|like that|snippy|so \w+)\b|\bnot that (?:you|anyone|anybody) (?:would )?(?:care|cares|noticed?|asked)\b|\bdon't worry about me\b|\bif it's not too much (?:trouble|to ask)\b|\bthanks for (?:finally )?(?:noticing|letting me know|telling me now|the heads up)(?= *(?:[.!…🙂🙄]|$))|\b(?:i'm )?not mad,? just (?:disappointed|saying)\b|\bjust saying\b|\bnoted\.(?=\s*$)/g,
      what: 'A complaint wrapped in politeness (“some of us”, “I guess I’ll do it again”) says two things at once. The reader hears the edge and has no clear ask to answer.',
      fix: 'Make the ask directly: “Could you do the dishes tonight? I’ve done them all week.”',
      ex: ['SOME of us like having clean dishes 🙂', 'I guess I’ll plan the trip again since nobody else will.', 'No need to be rude.'] },
    { id: 'pointed', name: 'Pointed work phrase', group: 'edge', heat: 1.5,
      re: /\b(?:(?:as )?per my (?:last|previous|earlier) (?:message|email|e-mail|note|text|comment|reply|slack)|as (?:previously|already) (?:stated|mentioned|discussed|noted|said|communicated|explained)|as i (?:said|mentioned|stated|noted|explained) (?:before|earlier|already|previously|above)|as i (?:already|previously) (?:said|stated|mentioned|noted|explained)|friendly reminder|gentle reminder|going forward,? please|please advise|to reiterate|reiterating)\b/g,
      what: 'At work, “per my last email” and “as previously stated” are widely read as “you didn’t read it.” The fact gets through, and so does the edge.',
      fix: 'Drop the pointer and restate the fact: “To recap: the deck is due at 5 today.”',
      ex: ['Per my last email, I need this ASAP.', 'As previously stated, the deadline is Friday.'] },
    { id: 'compare', name: 'Comparison to someone else', group: 'blame', heat: 2,
      re: /\b(?:your|my) (?:sister|brother|mom|mum|mother|dad|father|ex|friend|friends|boss|coworker|co-worker|parents|cousin|neighbou?r|roommate|colleague|best friend)\b[^.!?\n]{0,40}?\b(?:would(?:n't)?|always|never|does|doesn't|did|can|could|knows|manages|remembers|helps|gets|has|at least)\b|\bwhy can't you be (?:more )?like\b|\b(?:be|act) (?:more )?like (?:your|my|a normal|other|everyone)\b|\bunlike (?:you|your \w+)\b|\bat least (?:your|my) (?:sister|brother|mom|mum|dad|ex|friend|roommate|coworker) \w+/g,
      what: 'A comparison moves the topic from the task to the person’s worth and brings in a third person. The reader hears “you’re not good enough.”',
      fix: 'Leave the other person out. Say what you’d like from this person, about this thing.',
      ex: ['Your sister always calls on Sundays.', 'Why can’t you be more like your brother?'] },
    { id: 'absolute', name: 'Always / never', group: 'blame', heat: 1.5,
      re: /\b(?:always(?! (?:love|be (?:here|there|on your side)|have your back|grateful|thankful|appreciate|welcome|remember (?:how|the|when)|proud|happy to|glad to|there for))|never(?! (?:mind|forget (?:this|that|how|what you)|stop (?:loving|caring)|been happier|felt so (?:loved|happy|seen)))|every (?:single )?time|constantly|all the time|not once|not even once|nothing ever|no one ever|nobody ever|every single day|nobody (?:else )?(?:cares|helps|listens|does anything|bothers|ever)|no one (?:else )?(?:cares|helps|listens|does anything|bothers)|everyone else (?:does|can|manages|knows|gets|has)|you (?:do|did) nothing|you don't do anything)\b/g,
      what: '“Always” and “never” turn one moment into a verdict on everything. The reader remembers the exception and argues with that, and the point gets lost.',
      fix: 'Name the specific time instead: “twice this week” or “on Tuesday.”',
      ex: ['You never help.', 'Nobody ever listens to me.'] },
    { id: 'dismiss', name: 'Dismissing a feeling', group: 'blame', heat: 2.5,
      re: /\b(?:calm down|just relax|chill out|you're overreacting|you are overreacting|you're (?:too|so) sensitive|you're being dramatic|not a big deal|no big deal|get over it|if you say so|ok whatever|whatever(?= *(?:[.!…🙄😒]|$))|i don't care|stop being so \w+|you're imagining (?:it|things)|it was (?:just )?a joke|can't you take a joke)\b/g,
      what: '“Calm down,” “whatever” or “you’re overreacting” tell the reader their feeling doesn’t count. They usually raise the heat.',
      fix: 'Say what you can see, even if you see it differently: “I can tell this matters to you.”',
      ex: ['Calm down.', 'You’re overreacting.', 'Whatever.'] },
    { id: 'stonewall', name: 'Shutting the door', group: 'door', heat: 2,
      re: /^\s*(?:\.{3,}|…)\s*$|\b(?:not now|i (?:just |really |honestly )?can't do this(?: right now| anymore| today| tonight)?|i (?:just )?can't talk (?:about this )?(?:right )?now|i'm done(?: talking)?(?: about (?:this|it))?|i am done|leave me alone|forget it|never ?mind|i don't want to talk(?: about (?:it|this))?|i have nothing (?:more )?to say|stop (?:texting|messaging|calling) me|don't (?:text|talk to|call) me|i give up|it doesn't matter|doesn't matter)\b/g,
      what: '“Not now,” “forget it” or a silent “…” can mean someone is flooded and needs a break. Without a time to come back, the other person hears “this is over” or “you don’t matter.”',
      fix: 'Keep the pause, and add when you’ll come back: “I can’t do this right now. Can we talk at 8?”',
      ex: ['…', 'Not now.', 'I just can’t do this right now.'] },
    { id: 'flat', name: 'Very short reply', group: 'door', heat: 1, whole: true,
      re: /^\s*(?:k|kk|ok|okay|fine|sure|noted|cool|yep|yup|mhm|nvm|whatever|if you say so|got it)\s*[.!]*\s*$/,
      what: 'A one-word reply can mean “got it, busy” or “I’m upset.” The word is the same, so the reader has to guess, usually from their own mood.',
      fix: 'Add the missing half: “Ok, sounds good!” or “Ok. I need a minute, I’ll reply properly tonight.”',
      ex: ['k', 'fine.', 'ok.'] },
    // what's working
    { id: 'pause', name: 'A pause with a time to come back', group: 'good', good: true, heat: -2,
      what: 'Asking for a break and saying when you’ll return lets both people settle without either one feeling dropped.',
      ex: ['I can’t do this right now. Can we talk at 8?'] },
    { id: 'time', name: 'A real time', group: 'good', good: true, heat: -0.5,
      what: 'A real time (“by Friday”, “at 8”, “tonight”) turns a hope into a plan everyone can see.',
      ex: ['Could you call the landlord by Friday?'] },
    { id: 'appreciation', name: 'Appreciation', group: 'good', good: true, heat: -1,
      re: /\b(?:thank you(?! for nothing)|thanks(?! a lot(?= *(?:[.!…🙄😒🙃]|$))| for nothing)|thx|ty|i appreciate|appreciate (?:it|you|that|this)|i'm grateful|grateful for|love you|i love (?:that|how|it when|you)|it means a lot|that helped|you're (?:the best|amazing|a star)|well done|proud of you)\b|❤️|❤|💕|🫶|🥰|😘/g,
      what: 'Thanks and warmth tell the reader they aren’t only being corrected, which makes the rest easier to hear.',
      ex: ['Thanks for grabbing the groceries!', 'Love you!'] }
  ];
  var BY = {};
  LIST.forEach(function (p) { BY[p.id] = p; });

  function prep(text) { return String(text == null ? '' : text).replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"').toLowerCase(); }
  // "Friday" is a time; "hey everyone" is not always/never; "you're so good at it though!!" isn't shouting (that's each tool's job)
  function hasTime(text) { return TIME_RE.test(prep(text)); }

  function scan(text) {
    var t = prep(text), marks = [];
    LIST.forEach(function (p) {
      if (!p.re) return;
      var rx = new RegExp(p.re.source, p.re.flags.indexOf('g') === -1 ? p.re.flags + 'g' : p.re.flags), m, n = 0;
      if (p.whole) { if (p.re.test(t)) marks.push({ id: p.id, start: 0, end: t.length, text: String(text).trim(), whole: true }); p.re.lastIndex = 0; return; }
      while ((m = rx.exec(t)) && n++ < 50) {
        if (!m[0].length) { rx.lastIndex++; continue; }
        marks.push({ id: p.id, start: m.index, end: m.index + m[0].length, text: String(text).slice(m.index, m.index + m[0].length) });
        rx.lastIndex = m.index + 1;  // overlapping finds too ("wow, nice" and "nice of you to finally show"): the longest wins below
      }
    });
    // a smile after a complaint ("SOME of us like clean dishes 🙂") is part of the edge, not warmth
    var edge = marks.some(function (x) { return BY[x.id].group !== 'good'; });
    if (edge) {
      var sm = /🙂|😊|🙃/g, s;
      while ((s = sm.exec(t))) marks.push({ id: 'passive', start: s.index, end: s.index + s[0].length, text: s[0] });
    }
    // capitals used for emphasis on a group ("SOME of us") are part of the passive edge too
    // longest wins where two overlap; warmth inside sarcasm ("thanks" in "thanks for nothing") goes
    marks.sort(function (a, b) { return a.start - b.start || (b.end - b.start) - (a.end - a.start); });
    var out = [];
    marks.forEach(function (x) {
      var clash = out.filter(function (y) { return x.start < y.end && y.start < x.end; });
      if (!clash.length) { out.push(x); return; }
      if (x.whole || clash.some(function (y) { return y.whole; })) {
        // a whole-message mark ("ok.", "…") sits alongside word marks, except its own twin
        if (!clash.some(function (y) { return y.id === x.id || (x.whole && y.whole); })) out.push(x);
        return;
      }
      var bigger = clash.every(function (y) { return (x.end - x.start) > (y.end - y.start); });
      if (bigger) { out = out.filter(function (y) { return clash.indexOf(y) === -1; }); out.push(x); }
    });
    // shutting the door, but with a time to come back, is a good pause
    if (hasTime(text)) {
      var hadDoor = false;
      out = out.filter(function (x) { if (x.id === 'stonewall') { hadDoor = true; return false; } return true; });
      if (hadDoor) out.push({ id: 'pause', start: 0, end: String(text).length, text: String(text).trim(), whole: true });
      else out.push({ id: 'time', start: 0, end: 0, text: '', whole: true });
    }
    // sarcasm or an edge cancels the warmth it's wrapped in
    if (out.some(function (x) { return x.id === 'sarcasm' || x.id === 'contempt'; })) out = out.filter(function (x) { return x.id !== 'appreciation'; });
    out.sort(function (a, b) { return a.start - b.start; });
    return out;
  }
  function has(text, id) { return scan(text).some(function (m) { return m.id === id; }); }
  function hasAppreciation(text) { return has(text, 'appreciation'); }
  function isFlat(text) { return BY.flat.re.test(prep(text)); }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // The visible list, the same on every page that uses it
  function lookForHTML(opts) {
    opts = opts || {};
    var hard = LIST.filter(function (p) { return !p.good; }), good = LIST.filter(function (p) { return p.good; });
    function li(p) { return '<li><b>' + esc(p.name) + '</b>' + (p.ex && p.ex.length ? ' <span class="lf-ex">(' + p.ex.slice(0, 2).map(function (e) { return '“' + esc(e) + '”'; }).join(', ') + ')</span>' : '') + '<br><span class="lf-why">' + esc(p.what) + '</span></li>'; }
    return '<p>' + esc(opts.intro || 'The Signal Translator, the Carrier Wave Decoder’s tone check and the Conversation Reader all read wording with this same list, so the same words get the same reading in each. It reads words only, never tone of voice or history, so every mark is a “may land as,” not a verdict.') + '</p>' +
      '<h3 class="lf-h">What may land harder than you mean</h3><ul class="lf-list">' + hard.map(li).join('') + '</ul>' +
      '<h3 class="lf-h">What tends to help</h3><ul class="lf-list">' + good.map(li).join('') + '</ul>' +
      '<p class="lf-note">Each tool also has a few checks of its own, like orders, labels, or a question that went unanswered, and it names them where they come up.</p>';
  }
  function lookFor(el, opts) { if (el) el.innerHTML = lookForHTML(opts); }

  var api = { LIST: LIST, BY: BY, scan: scan, has: has, hasTime: hasTime, hasAppreciation: hasAppreciation, isFlat: isFlat, TIME_RE: TIME_RE, lookFor: lookFor, lookForHTML: lookForHTML, prep: prep };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TOLPatterns = api;
})(this);
