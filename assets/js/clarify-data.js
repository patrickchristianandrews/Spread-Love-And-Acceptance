/* clarify-data.js: the questions a tool asks before it says anything about a situation that may be unfair.

   When a tool, worksheet, calculator or Professor Puddles sees something that MAY be unfair (one person doing
   most of the load, money that leans one way, one person making the decisions, one-sided apologies, a limit
   that feels unfair, a topic that keeps coming back, someone feeling unheard, pressure, or fear), it asks a
   few short questions first, and only then gives its read. The read is proportionate to the answers, never
   to the first thing the tool noticed. Questions, not verdicts. It describes behaviour and effects and never
   labels a person.

   Everything here is plain data plus one pure function. Nothing is stored or sent anywhere.

   API (browser: window.TOLClarifyData; Node: require('./clarify-data.js'))
     TYPES                       { id: {title, why, questions:[{id, short, text, answers:[{id, text, w, f}]}]} }
     ALIASES                     other names a tool may use for a type ('chores' -> 'load', 'unheard' -> 'communication' ...)
     typeId(name)                -> a type id, or null
     guessType(text)             -> a type id from a few plain words ("the dishes again" -> 'load'), or null
     questions(type, lang)       -> [{id, short, text, answers:[{id, text}]}] with "Not sure" and "Skip" added
     evaluate(type, answers, ctx)-> {level, key, type, reasons[], flags, score, safety, crisis, skipped, answers}
                                    answers: {questionId: answerId}; 'notsure' and 'skip' are always allowed.
                                    ctx: {text, lang}. ctx.text (anything the person typed) is checked for crisis
                                    wording and explicit threats only.
     next(result, lang)          -> {title, body, say, links:[{text, href}], extra, footer}: the proportionate next step
     exportForChat(lang)         -> a plain JSON-safe object of every bank, the rules and the next steps, for chat turns
     t(words)                    -> the words as plain text

   LEVELS
     0  "Sounds like an ordinary rough patch, or a one-off"  -> everyday tips
     1  "Worth a calm talk"                                    -> one tool and words to start
     2  "A pattern worth working on together"                  -> a plan: tools, worksheets, the six-week program
     3  "A heavier pattern, worth a slower look"               -> a neutral note, worded as an option
     4  safety                                                 -> a short, neutral reply: the read, and no resources

   THE RULES (tools/clarify/test-clarify.js checks every one of them)
     Each answer has a weight w (plus = more concern, minus = an ordinary explanation) and flags f.
       benign flags   agreed, temp, mutual, improving, content, care, oneoff, context, repairs
                      (agreed, temporary, goes both ways, talked about and getting better, both fine with it,
                      a limit set out of care or respect, a one-off, outside pressure, it gets repaired)
       pattern flags  often, long, stuck, oneway
       pressure (P)   fallout (saying no leads to a big row, days of silence, or something taken away), cantno
       clear signs(S) isolation (kept from people in general), surveil (phone, messages or location checked without
                      agreement), moneyctl (kept from money they need), textthreat (a threat in what they typed)
       safety         afraid ("I feel afraid"), threat ("they have threatened to hurt..."), danger ("not safe right
                      now"), and crisis wording in ctx.text
     "Not sure" and "Skip" weigh nothing. "Skip all" gives level 0 with ordinary tips, never escalation.
     score = the sum of w; C = answers with w >= 1; B = answers with a benign flag.
       Safety   afraid, threat, danger or crisis wording on their own; otherwise two different clear signs (S >= 2),
                or one clear sign together with a pressure sign (S >= 1 and P >= 1). Nothing else.
       Level 3  score >= 7 with at least 3 concerns, and either talking hasn't helped (stuck) or there is a pressure
                or clear sign.
       Level 2  score >= 5 with at least 2 concerns and something that makes it a pattern (often, long, stuck,
                one way, or a pressure or clear sign).
       Level 1  score >= 2; or any concern when it hasn't been talked about yet, talking hasn't changed it yet, or you
                don't know how they feel.
       Level 0  everything else.
     Floors: one clear sign is at least level 2; a pressure sign, or a threat in the typed words, at least level 1.
     Ordinary explanations pull the level DOWN: with no pressure or clear sign, two or more benign answers cap the
       read at level 1, and one benign answer caps it at level 2.
     One answer alone can never reach level 3 or safety, except "I feel afraid", "they have threatened to hurt...",
       "not safe right now", or crisis wording. (The largest single weight is 3; level 3 needs 3 concerns.)
     A "no", a limit, or a request made out of care or respect for the relationship (any relationship, couples
       included) is an ordinary explanation (benign 'care'), never a sign of anything worse.

   Words: plain, warm, both-sides. No labels for people. */
(function (root) {
  'use strict';

  function t(x) { return x == null ? '' : String(x); }
  // an answer: id, words, weight, flags
  function A(id, text, w, f) { return { id: id, text: text, w: w || 0, f: f || [] }; }
  function Q(id, short, text, answers) { return { id: id, short: short, text: text, answers: answers }; }

  var BENIGN = ['agreed', 'temp', 'mutual', 'improving', 'content', 'care', 'oneoff', 'context', 'repairs'];
  var PATTERN = ['often', 'long', 'stuck', 'oneway'];
  var PRESSURE = ['fallout', 'cantno'];
  var SIGNS = ['isolation', 'surveil', 'moneyctl', 'textthreat'];
  var SAFETY = ['afraid', 'threat', 'danger'];

  /* ---------- questions used by more than one type ---------- */
  function qHowLong(textEn) {
    return Q('howlong', 'How long', textEn || 'How long has it been like this?', [
      A('new', 'A few weeks, or less', -1),
      A('months', 'A few months', 1),
      A('years', 'A year or more', 2, ['long'])
    ]);
  }
  function qReason(textEn) {
    return Q('reason', 'A reason for now', textEn || 'Is there a reason it’s this way for now?', [
      A('agreed', 'Yes, we agreed it this way', -2, ['agreed']),
      A('temp', 'Yes, something for now: illness, a new baby, a new job, exams, a move', -2, ['temp']),
      A('changed', 'It was agreed once, but things have changed', 1),
      A('none', 'Not that I know of', 1)
    ]);
  }
  function qTalked(textEn) {
    return Q('talked', 'Talked about it', textEn || 'Have you talked about it together?', [
      A('better', 'Yes, and it’s getting better', -2, ['improving']),
      A('same', 'Yes, but nothing has changed', 2, ['stuck']),
      A('worse', 'Yes, and it ended in a row or got worse', 2, ['stuck']),
      A('notyet', 'Not yet', 0, ['nottalked'])
    ]);
  }
  function qFeel(textEn) {
    return Q('feel', 'How each of you feels', textEn || 'How do you each feel about it?', [
      A('fine', 'We both seem fine with it', -2, ['content']),
      A('little', 'One of us minds a little', 1),
      A('worn', 'One of us feels worn down or resentful', 2),
      A('dunno', 'I don’t know how they feel', 0, ['unknownfeel'])
    ]);
  }
  function qBoth(textEn) {
    return Q('both', 'Both ways', textEn || 'Does it go both ways, over time?', [
      A('both', 'Yes, it evens out over time', -2, ['mutual']),
      A('mostly', 'Mostly one way', 1),
      A('always', 'Always one way', 2, ['oneway'])
    ]);
  }
  function qSayNo(textEn) {
    return Q('sayno', 'Saying no', textEn || 'Can both of you say no, or disagree, without it turning into a big problem?', [
      A('yes', 'Yes, both of us can', -2, ['mutual']),
      A('awkward', 'Mostly. It can be a bit awkward', 0),
      A('upset', 'One of us gets upset or goes quiet for a while', 1),
      A('fallout', 'It leads to a big row, days of silence, or something being taken away', 2, ['fallout'])
    ]);
  }
  // asked gently, and last, and only for the types where it fits
  function qAfraid() {
    return Q('afraid', 'Feeling free to say no', 'Last one, and only if it fits: do you ever feel afraid, or unable to say no?', [
      A('no', 'No', 0),
      A('peace', 'Sometimes I hold back to keep the peace', 1),
      A('cantno', 'I feel I can’t say no', 2, ['cantno']),
      A('afraid', 'Yes, I feel afraid', 0, ['afraid'])
    ]);
  }
  function qOften(textEn) {
    return Q('often', 'How often', textEn || 'How often does it happen?', [
      A('once', 'It was a one-off', -2, ['oneoff']),
      A('sometimes', 'Now and then', 0),
      A('most', 'Most of the time', 2, ['often'])
    ]);
  }

  /* ---------- the banks, one per kind of concern ---------- */
  var TYPES = {
    load: {
      title: 'Who does what at home',
      why: 'A split that leans one way can be just right (long hours, an illness, something you agreed), or it can be wearing someone down. A few answers help tell which.',
      questions: [
        qHowLong('How long has the split been like this?'),
        qReason(),
        qFeel(),
        qTalked(),
        Q('evens', 'Evens out elsewhere', 'Does it even out in other ways, like paid work, caring or other jobs?', [
          A('yes', 'Yes, it evens out', -2, ['mutual']),
          A('partly', 'Partly', 0),
          A('no', 'No, not really', 2, ['oneway'])
        ])
      ]
    },
    money: {
      title: 'Money',
      why: 'Couples and families set up money in many fair ways: shared, separate, or one person handling it by agreement. A few answers help tell an ordinary setup from one that isn’t working for someone.',
      questions: [
        Q('setup', 'How money is set up', 'How is money set up between you?', [
          A('shared', 'Shared, and we can both see it', -2, ['mutual']),
          A('separate', 'Separate, and that suits us', -2, ['agreed']),
          A('oneagreed', 'One of us handles it, and we agreed that', -2, ['agreed']),
          A('onesay', 'One of us handles it, and the other doesn’t get a say', 2, ['oneway'])
        ]),
        Q('access', 'Everyday money', 'Can each of you get to money for everyday needs?', [
          A('both', 'Yes, both of us', -2, ['mutual']),
          A('checkin', 'We check in on big spends, by agreement', -1, ['agreed']),
          A('ask', 'One of us has to ask, and usually gets it', 1),
          A('kept', 'One of us is kept from money they need', 3, ['moneyctl'])
        ]),
        qReason('Is there a reason it’s this way for now (a job loss, paying off debt, study, illness)?'),
        qTalked(),
        qSayNo('Can both of you say no to a spend, or disagree about money, without it turning into a big problem?'),
        qAfraid()
      ]
    },
    decisions: {
      title: 'Who makes the decisions',
      why: 'Many people split decisions by what each knows best, and that works well. A few answers help tell that apart from one person’s view not counting.',
      questions: [
        Q('how', 'How decisions get made', 'When a decision affects you both, what usually happens?', [
          A('together', 'We decide together', -2, ['mutual']),
          A('split', 'Each of us leads on different things, by agreement', -2, ['agreed']),
          A('onefine', 'One of us usually decides, and the other is fine with that', -1, ['content']),
          A('onenot', 'One of us decides, and the other’s view doesn’t count', 2, ['oneway'])
        ]),
        qHowLong(),
        qTalked(),
        qSayNo(),
        qAfraid()
      ]
    },
    communication: {
      title: 'How you talk to each other',
      why: 'Everyone snaps or tunes out on a bad day. A few answers help tell a rough patch from a way of talking that keeps leaving someone unheard.',
      questions: [
        qOften('How often do talks end with one of you feeling unheard or spoken down to?'),
        Q('stress', 'On hard days', 'Does it happen more when one of you is tired, stressed or unwell?', [
          A('hard', 'Yes, mostly on hard days', -1, ['context']),
          A('any', 'No, it happens on good days too', 1)
        ]),
        qBoth(),
        Q('repair', 'Afterward', 'Afterward, does one of you come back and make it right?', [
          A('usually', 'Yes, usually', -2, ['repairs']),
          A('sometimes', 'Sometimes', 0),
          A('rarely', 'Rarely', 1),
          A('blamed', 'No, it’s left, or it gets turned back on me', 2, ['stuck'])
        ]),
        qAfraid()
      ]
    },
    limits: {
      title: 'A limit or a “no” that feels unfair',
      why: 'A “no,” a limit or a request made out of care or respect for the relationship is a normal part of being close. A few answers help tell that apart from a limit that leaves someone cut off.',
      questions: [
        Q('about', 'What the limit is about', 'What is the limit mainly about?', [
          A('safety', 'Health, safety, or money we can’t afford', -2, ['care']),
          A('respect', 'Respect for the relationship (for example an ex, flirting, late-night messages)', -2, ['care']),
          A('comfort', 'Comfort or taste (noise, guests, tidiness)', -1, ['care']),
          A('people', 'Who I can see or talk to, in general (friends, family)', 3, ['isolation'])
        ]),
        Q('same', 'Same for both', 'Does the same limit apply to both of you?', [
          A('yes', 'Yes, to both of us', -2, ['mutual']),
          A('reason', 'No, but there’s a reason we both understand', -1, ['agreed']),
          A('no', 'No, only to me', 1)
        ]),
        Q('set', 'How it was set', 'How did the limit come about?', [
          A('agreed', 'We agreed it together', -2, ['agreed']),
          A('asked', 'It was asked kindly, and I could say no', -1, ['care']),
          A('one', 'One of us set it', 1)
        ]),
        qSayNo('Can you talk about the limit, or say no to it, without it turning into a big problem?'),
        qAfraid()
      ]
    },
    time: {
      title: 'Time and attention',
      why: 'Time together gets thin for ordinary reasons: work, a baby, study, caring. A few answers help tell a busy season from someone feeling left out for a long time.',
      questions: [
        qHowLong('How long has time together felt thin?'),
        Q('busy', 'Something taking time', 'Is something taking extra time right now (work, a baby, study, caring, an illness)?', [
          A('temp', 'Yes, and it will ease', -2, ['temp']),
          A('ongoing', 'Yes, and it’s ongoing', 0),
          A('no', 'Not really', 1)
        ]),
        Q('want', 'Wanting more time', 'Do you both want more time together?', [
          A('both', 'Yes, we both miss it', -1, ['mutual']),
          A('one', 'One of us wants more than the other', 1),
          A('dunno', 'I’m not sure they do', 0, ['unknownfeel'])
        ]),
        qTalked()
      ]
    },
    repair: {
      title: 'Apologies and blame',
      why: 'In most homes one person finds “sorry” easier to say. A few answers help tell that apart from the blame always landing on the same person.',
      questions: [
        Q('first', 'Who says sorry', 'When something goes wrong, who usually says sorry first?', [
          A('both', 'Both of us, at different times', -2, ['mutual']),
          A('meok', 'Mostly me, and that’s okay with me', 0, ['content']),
          A('menot', 'Mostly me, even when it wasn’t my doing', 1),
          A('always', 'Always me. The other never does', 2, ['oneway'])
        ]),
        Q('blame', 'Where blame lands', 'Does the blame land on one person most of the time?', [
          A('shared', 'No, we share it', -2, ['mutual']),
          A('sometimes', 'Sometimes', 0),
          A('mostly', 'Yes, most things become one person’s fault', 2, ['oneway'])
        ]),
        qHowLong(),
        qTalked()
      ]
    },
    recurring: {
      title: 'A topic that keeps coming back',
      why: 'Every couple and family has a few topics that come back. Many never fully go away, and that’s normal. A few answers help tell a familiar topic from one that is stuck.',
      questions: [
        qHowLong('How long has this topic been coming back?'),
        Q('happens', 'When it comes up', 'When it comes up, what usually happens?', [
          A('eases', 'We talk, and it eases for a while', -1, ['improving']),
          A('circle', 'We go round the same circle', 1),
          A('row', 'It turns into a row', 2)
        ]),
        Q('changed', 'Anything changed', 'Has anything changed since you first talked about it?', [
          A('better', 'Yes, it’s a bit better', -2, ['improving']),
          A('same', 'No change', 1, ['stuck']),
          A('worse', 'It’s worse', 2, ['stuck'])
        ]),
        Q('outside', 'Outside pressure', 'Is outside pressure under it (money, work, health, family)?', [
          A('mostly', 'Yes, mostly outside pressure', -1, ['context']),
          A('some', 'Some of both', 0),
          A('us', 'No, it’s between us', 1)
        ]),
        qFeel()
      ]
    },
    respect: {
      title: 'Respect',
      why: 'Teasing, a sharp word on a bad day, or being talked over now and then happen in most homes. A few answers help tell those apart from something that keeps hurting.',
      questions: [
        qOften(),
        Q('what', 'What it looks like', 'What does it mostly look like?', [
          A('tease', 'Teasing that goes a bit far', 0),
          A('talkover', 'Being talked over, or not listened to', 1),
          A('putdown', 'Put-downs or being made fun of, maybe in front of others', 2),
          A('checked', 'My phone, messages or where I am checked without my okay', 3, ['surveil']),
          A('keptfrom', 'Being kept from friends or family', 3, ['isolation'])
        ]),
        qBoth(),
        Q('hurt', 'When you say it hurt', 'When you say it hurt, what happens?', [
          A('listen', 'They listen, and it changes', -2, ['improving']),
          A('again', 'They say sorry, but it happens again', 1, ['stuck']),
          A('laughed', 'It’s laughed off, or turned back on me', 2, ['stuck'])
        ]),
        qAfraid()
      ]
    },
    afraid: {
      title: 'Feeling afraid or unsafe',
      why: 'Only you know how safe you feel. These few questions help point you to the right kind of help, whatever the answers are.',
      questions: [
        Q('safenow', 'Safe right now', 'Right now, are you safe?', [
          A('yes', 'Yes, I’m safe right now', 0),
          A('no', 'No, not right now', 0, ['danger'])
        ]),
        Q('fear', 'Afraid of how they react', 'Do you ever feel afraid of how they’ll react?', [
          A('no', 'No', 0),
          A('worry', 'I worry they’ll be upset, but I’m not afraid', 1),
          A('yes', 'Yes, I feel afraid', 0, ['afraid'])
        ]),
        Q('threat', 'Threats', 'Have they ever threatened to hurt you, someone you love, a pet, or themselves?', [
          A('no', 'No', 0),
          A('yes', 'Yes', 0, ['threat'])
        ]),
        Q('free', 'Friends, family and money', 'Can you see friends and family, and use money, freely?', [
          A('yes', 'Yes', -1),
          A('mostly', 'Mostly', 0),
          A('no', 'No, that gets stopped or checked', 3, ['isolation'])
        ])
      ]
    }
  };

  var ALIASES = {
    chores: 'load', housework: 'load', 'mental-load': 'load', mentalload: 'load', split: 'load', fairness: 'load', work: 'load',
    bills: 'money', spending: 'money', finances: 'money',
    decision: 'decisions', choices: 'decisions',
    tone: 'communication', unheard: 'communication', talk: 'communication', talking: 'communication', listening: 'communication',
    limit: 'limits', no: 'limits', boundary: 'limits', boundaries: 'limits', pressure: 'limits', rules: 'limits',
    attention: 'time', together: 'time', phone: 'time',
    apology: 'repair', apologies: 'repair', blame: 'repair', sorry: 'repair',
    recurring: 'recurring', again: 'recurring', 'keeps-coming-back': 'recurring', topic: 'recurring',
    disrespect: 'respect', putdowns: 'respect',
    fear: 'afraid', unsafe: 'afraid', safety: 'afraid', scared: 'afraid'
  };
  var ORDER = ['load', 'money', 'decisions', 'communication', 'limits', 'time', 'repair', 'recurring', 'respect', 'afraid'];
  function typeId(name) {
    if (!name) return null;
    var k = String(name).toLowerCase().trim();
    if (TYPES[k]) return k;
    return ALIASES[k] || null;
  }
  // a first guess from a few typed words; the person can always change it
  var GUESS = [
    ['afraid', /\b(?:afraid|scared|frightened|unsafe|not safe|fear)\b/i],
    ['money', /\b(?:money|bills?|spend(?:ing)?|budget|rent|debt|paid|pay(?:ing)?|card)\b/i],
    ['limits', /\b(?:won't let|not allowed|allowed to|limit|boundar(?:y|ies)|said no|says no|forbid|rules? for me)\b/i],
    ['repair', /\b(?:sorry|apolog\w*|blame[sd]?|my fault|fault)\b/i],
    ['respect', /\b(?:disrespect\w*|rude|mock\w*|put[- ]?downs?|made fun|laugh(?:ed|s) at|insult\w*)\b/i],
    ['decisions', /\b(?:decid\w*|decision\w*|without asking|choose|chose|decide)\b/i],
    ['communication', /\b(?:listen\w*|unheard|ignor\w*|yell\w*|shout\w*|snap\w*|tone|talk(?:ed)? over|interrupt\w*)\b/i],
    ['time', /\b(?:time together|no time|attention|phone|busy|date night)\b/i],
    ['load', /\b(?:chores?|dishes|laundry|cleaning|cook\w*|housework|trash|groceries|mental load)\b/i],
    ['recurring', /\b(?:again|keeps? coming|every time|always the same|same fight|same argument)\b/i]
  ];
  function guessType(text) {
    var s = String(text || '');
    for (var i = 0; i < GUESS.length; i++) if (GUESS[i][1].test(s)) return GUESS[i][0];
    return null;
  }

  var NOTSURE = 'Not sure';
  var SKIP = 'Skip';
  function questions(type, lang) {
    var ty = TYPES[typeId(type)]; if (!ty) return [];
    return ty.questions.map(function (q) {
      return { id: q.id, short: t(q.short, lang), text: t(q.text, lang),
        answers: q.answers.map(function (a) { return { id: a.id, text: t(a.text, lang) }; })
          .concat([{ id: 'notsure', text: t(NOTSURE, lang), neutral: true }, { id: 'skip', text: t(SKIP, lang), neutral: true, skip: true }]) };
    });
  }

  /* ---------- reading typed words: crisis wording and explicit threats only ---------- */
  var PAT = null;
  function patterns() {
    if (PAT) return PAT;
    if (root && root.TOLPatterns) return (PAT = root.TOLPatterns);
    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') { try { PAT = require('./message-patterns.js'); } catch (e) { PAT = null; } }
    return PAT;
  }
  // a small fallback, used only when the shared pattern list isn't on the page
  var CRISIS_FALLBACK = /\b(?:kill myself|end my life|take my (?:own )?life|want to die|don't want to (?:live|be alive)|better off without me|suicid\w*|hurt myself)\b/i;
  var THREAT_FALLBACK = /\b(?:(?:said|says|threatened)(?: that)? (?:he|she|they)(?:'d| would|'ll| will) (?:kill|hurt) (?:me|the kids|my)|threatened to (?:kill|hurt|take the kids))\b/i;
  function readText(text) {
    var s = String(text || ''); if (!s.trim()) return { crisis: false, threat: false };
    var p = patterns(), crisis = false, threat = false;
    // the shared list knows everyday exaggeration ("I'll die of embarrassment"); the fallback is only for pages without it
    try { crisis = p && p.selfHarm ? !!p.selfHarm(s) : CRISIS_FALLBACK.test(s); } catch (e) { crisis = CRISIS_FALLBACK.test(s); }
    try { threat = p && p.threats ? p.threats(s).length > 0 : false; } catch (e) {}
    if (!threat) threat = THREAT_FALLBACK.test(s);
    return { crisis: crisis, threat: threat };
  }

  /* ---------- the read ---------- */
  var LEVEL_KEYS = ['l0', 'l1', 'l2', 'l3', 'safety'];
  var LEVEL_TITLES = [
    'Sounds like an ordinary rough patch, or a one-off',
    'Worth a calm talk',
    'A pattern worth working on together',
    'A heavier pattern, worth a slower look',
    'Some of this sounds serious'
  ];
  var FLAG_WORDS = {
    agreed: 'It was agreed between you.',
    temp: 'There’s a reason for now that should ease.',
    mutual: 'It goes both ways, or evens out.',
    improving: 'You’ve talked, and it’s getting better.',
    content: 'You both seem fine with it.',
    care: 'The limit comes from care or respect for the relationship.',
    oneoff: 'It was a one-off.',
    context: 'Outside pressure seems to be part of it.',
    repairs: 'It usually gets made right afterward.',
    often: 'It happens most of the time.',
    long: 'It has gone on for a year or more.',
    stuck: 'Talking hasn’t changed it yet.',
    oneway: 'It mostly goes one way.',
    fallout: 'Saying no seems to come at a cost.',
    cantno: 'You said you feel you can’t say no.',
    isolation: 'Seeing friends or family seems to be limited.',
    surveil: 'Your phone, messages or whereabouts get checked without your okay.',
    moneyctl: 'Someone is kept from money they need.',
    textthreat: 'What you wrote includes words that can read as a threat.',
    afraid: 'You said you feel afraid.',
    threat: 'You said there have been threats.',
    danger: 'You said you’re not safe right now.',
    crisis: 'What you wrote sounds like you may be in a lot of pain.',
    nottalked: 'It hasn’t been talked about yet.',
    unknownfeel: 'You’re not sure how the other person feels.'
  };

  function has(arr, x) { return arr.indexOf(x) >= 0; }
  function evaluate(type, answers, ctx) {
    ctx = ctx || {};
    var lang = ctx.lang || 'en', id = typeId(type), ty = TYPES[id];
    answers = answers || {};
    var res = { type: id, level: 0, key: 'l0', score: 0, reasons: [], flags: [], safety: false, crisis: false, skipped: false, answers: answers, answered: 0, notsure: 0 };
    var tx = readText(ctx.text);
    if (tx.crisis) { res.crisis = true; res.flags.push('crisis'); }
    if (tx.threat) res.flags.push('textthreat');
    if (answers === 'skip' || ctx.skipAll) {
      res.skipped = true;
      if (res.crisis) { res.level = 4; res.key = 'safety'; res.safety = true; res.reasons.push(t(FLAG_WORDS.crisis, lang)); }
      else res.reasons.push(t('You skipped the questions, so this is the everyday read. That’s completely fine.', lang));
      return res;
    }
    var score = 0, C = 0, B = 0, flags = res.flags, took = [];
    (ty ? ty.questions : []).forEach(function (q) {
      var aid = answers[q.id]; if (aid == null || aid === 'skip') return;
      res.answered++;
      if (aid === 'notsure') { res.notsure++; took.push(t(q.short, lang) + ': ' + t(NOTSURE, lang).toLowerCase()); return; }
      var a = null; q.answers.forEach(function (x) { if (x.id === aid) a = x; });
      if (!a) return;
      score += a.w;
      if (a.w >= 1) C++;
      if (a.f.some(function (f) { return has(BENIGN, f); })) B++;
      a.f.forEach(function (f) { if (!has(flags, f)) flags.push(f); });
      took.push(t(q.short, lang) + ': ' + lowerFirst(t(a.text, lang)));
    });
    if (has(flags, 'textthreat')) C++;
    var S = SIGNS.filter(function (f) { return has(flags, f); }).length;
    var Pn = PRESSURE.filter(function (f) { return has(flags, f); }).length;
    var pattern = PATTERN.some(function (f) { return has(flags, f); }) || Pn > 0 || S > 0;
    var safety = has(flags, 'afraid') || has(flags, 'threat') || has(flags, 'danger') || res.crisis || S >= 2 || (S >= 1 && Pn >= 1);
    var level = 0;
    if (safety) level = 4;
    else {
      if (score >= 2 || (C >= 1 && (has(flags, 'nottalked') || has(flags, 'unknownfeel') || has(flags, 'stuck')))) level = 1;
      if (score >= 5 && C >= 2 && pattern) level = 2;
      if (score >= 7 && C >= 3 && (has(flags, 'stuck') || Pn > 0 || S > 0)) level = 3;
      if (S >= 1 && level < 2) level = 2;
      if ((Pn >= 1 || has(flags, 'textthreat')) && level < 1) level = 1;
      if (!Pn && !S) { if (B >= 2 && level > 1) level = 1; else if (B === 1 && level > 2) level = 2; }
    }
    res.level = level; res.key = LEVEL_KEYS[level]; res.safety = level === 4; res.score = score;
    // what it took into account: the signs that mattered first, then each answer
    var lead = [];
    ['crisis', 'danger', 'afraid', 'threat', 'textthreat', 'isolation', 'surveil', 'moneyctl', 'cantno', 'fallout', 'stuck', 'long', 'often', 'oneway', 'nottalked', 'unknownfeel']
      .concat(BENIGN).forEach(function (f) { if (has(flags, f) && FLAG_WORDS[f]) lead.push(t(FLAG_WORDS[f], lang)); });
    res.reasons = lead.slice(0, 5);
    res.took = took;
    if (res.notsure >= 3) res.reasons.push(t('Several answers were “not sure.” That’s fine: a calm talk can fill in the gaps.', lang));
    if (!res.answered && !res.reasons.length) res.reasons.push(t('No answers yet, so this is the everyday read.', lang));
    else if (!res.reasons.length) res.reasons.push(t(level ? 'Some of your answers point to something worth a closer look.'
      : 'Nothing in your answers points past an ordinary rough patch.', lang));
    return res;
  }
  function lowerFirst(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }

  /* ---------- the next step, by type and level ---------- */
  function L(text, href) { return { text: text, href: href }; }
  var NEXT = {
    load: {
      l0: { body: 'It sounds like the split works for you both for now. Keep thanking each other for the quiet jobs, and look again if something changes.',
        links: [L('The Lemonade Stand: who does what', '/lemonade-stand.html')] },
      l1: { body: 'Pick a calm time and look at the list together, as a setup to adjust, not a score.',
        say: 'Can we look at who does what this week? I’m not keeping score. I just want it to feel fair to both of us.',
        links: [L('A kind weekly check-in', '/check-ins.html')] },
      l2: { body: 'Give each job one owner, look back once a month at what keeps slipping, and try the six-week program together.',
        links: [L('One owner per job (WP-03)', '/workpapers/fill/wp-03.html'), L('What keeps coming back? (WP-04)', '/workpapers/fill/wp-04.html'), L('The six-week program', '/prog-01.html')] }
    },
    money: {
      l0: { body: 'Your setup sounds like one you both chose. A short money check-in now and then keeps it that way.',
        links: [L('Money together', '/money-together.html')] },
      l1: { body: 'Set twenty minutes, when you’re both rested, to look at how money works for you both.',
        say: 'Could we sit down for twenty minutes and look at how money works for us? I’d like us both to feel okay about it.',
        links: [L('Money together', '/money-together.html')] },
      l2: { body: 'Agree on a plan you can both see: what’s shared, what’s each person’s own, and how big spends get decided. Then check in on it weekly for a while.',
        links: [L('Money together', '/money-together.html'), L('A kind weekly check-in', '/check-ins.html')] }
    },
    decisions: {
      l0: { body: 'Sounds like the way you decide works for you both. Saying “what do you think?” now and then keeps it that way.',
        links: [L('Communication, in plain words', '/communication.html')] },
      l1: { body: 'Next time something affects you both, each say what you’d like before anyone decides.',
        say: 'Next time something affects us both, can we each say what we’d like before we decide?',
        links: [L('A kind weekly check-in', '/check-ins.html')] },
      l2: { body: 'Agree which decisions you make together and which each of you leads on, write it down, and look at it again in a month.',
        links: [L('Say it so it lands (WP-09)', '/workpapers/fill/wp-09.html'), L('Communication, in plain words', '/communication.html')] }
    },
    communication: {
      l0: { body: 'Sounds like a rough moment, not a pattern. A short “sorry I snapped, can we try again?” usually does it.',
        links: [L('Communication, in plain words', '/communication.html')] },
      l1: { body: 'Try the fact, the feeling and one small ask, at a calm time.',
        say: 'When we talked last night, I didn’t feel heard. Can we try again, one at a time?',
        links: [L('Say it so it lands (WP-09)', '/workpapers/fill/wp-09.html')] },
      l2: { body: 'Pick one habit to change together, like hearing each other back before answering, and practice it on small topics first.',
        links: [L('Say it so it lands (WP-09)', '/workpapers/fill/wp-09.html'), L('One wants to talk, one needs space', '/pursue-withdraw.html'), L('Seven calm steps out of the same fights', '/how-to-stop-fighting-with-your-partner.html')] }
    },
    limits: {
      l0: { body: 'A limit set out of care or respect for the relationship is a normal part of being close. It helps when you both know the reason behind it.',
        links: [L('A kind weekly check-in', '/check-ins.html')] },
      l1: { body: 'Ask about the reason first, then say how it lands for you. Both can be true.',
        say: 'Can you tell me more about why this matters to you? I’d like to understand, and to say how it lands for me.',
        links: [L('A kind weekly check-in', '/check-ins.html')] },
      l2: { body: 'Agree the limits you both keep, and why, and make room for either of you to ask to change one.',
        links: [L('Communication, in plain words', '/communication.html'), L('A kind weekly check-in', '/check-ins.html')] }
    },
    time: {
      l0: { body: 'Sounds like a busy season. A few minutes of real attention each day goes a long way until it eases.',
        links: [L('Turning toward: small daily habits', '/turning-toward.html')] },
      l1: { body: 'Name what you miss, and ask for one small, regular thing.',
        say: 'I miss us. Could we keep one evening a week just for the two of us?',
        links: [L('Turning toward: small daily habits', '/turning-toward.html')] },
      l2: { body: 'Plan time together on purpose: one small daily habit and one ritual a week, and check how it’s going in a month.',
        links: [L('Bonding: how closeness grows', '/bonding.html'), L('Keep your little rituals alive (WP-15)', '/workpapers/fill/wp-15.html')] }
    },
    repair: {
      l0: { body: 'Sounds like you each repair in your own way. Saying thank you for the apologies you get keeps it easy.',
        links: [L('Apology languages', '/apology-languages.html')] },
      l1: { body: 'Talk about how each of you likes to hear sorry, and agree that either of you can go first.',
        say: 'I’d like us both to be able to say sorry. Can we each name one thing we’d do differently next time?',
        links: [L('Apology languages', '/apology-languages.html')] },
      l2: { body: 'After each rough moment, each of you names your own part, one fact each, before anything else. Practice it for a few weeks.',
        links: [L('Say it so it lands (WP-09)', '/workpapers/fill/wp-09.html'), L('Apology languages', '/apology-languages.html')] }
    },
    recurring: {
      l0: { body: 'Some topics come back in every home, and that’s normal. Catching them early, on a calm day, keeps them small.',
        links: [L('A kind weekly check-in', '/check-ins.html')] },
      l1: { body: 'Set a calm time to look at it properly, not in the moment it comes up.',
        say: 'This one keeps coming back. Can we set a calm time this week to look at it properly?',
        links: [L('What keeps coming back? (WP-04)', '/workpapers/fill/wp-04.html')] },
      l2: { body: 'Look back once a month at what keeps coming back, sort out the cause (the setup, capacity, or outside pressure), and fix one thing at a time.',
        links: [L('What keeps coming back? (WP-04)', '/workpapers/fill/wp-04.html'), L('Is it us, or everything else? (WP-14)', '/workpapers/fill/wp-14.html'), L('The six-week program', '/prog-01.html')] }
    },
    respect: {
      l0: { body: 'Sounds like an off moment. Saying “that one stung” lightly, at the time, usually sorts it.',
        links: [L('Communication, in plain words', '/communication.html')] },
      l1: { body: 'Name the moment and how it landed, and ask for one change.',
        say: 'When that was said in front of our friends, it stung. Can we keep jokes like that between us, or drop them?',
        links: [L('Say it so it lands (WP-09)', '/workpapers/fill/wp-09.html')] },
      l2: { body: 'Agree together what’s off limits, even when you’re upset, and check in weekly on how it’s going.',
        links: [L('Communication, in plain words', '/communication.html'), L('A kind weekly check-in', '/check-ins.html')] }
    },
    afraid: {
      l0: { body: 'Glad to hear you feel safe.',
        links: [] },
      l1: { body: 'It can help to talk it over with someone you trust, so you can see it clearly.',
        links: [] },
      l2: { body: 'Some of what you said is worth some care. Talking it over with someone you trust can help you see it clearly.',
        links: [] }
    }
  };
  var L3 = { body: 'Not because anything is wrong with either of you: some patterns are easier to shift when you slow down, take one topic at a time, and each say what you need. Someone you both trust can help hold that conversation, if it feels right.',
    links: [] };
  // level 4: a short, neutral reply (the owner's decision: no resources, numbers or links)
  var SAFE = { body: 'That sounds really hard. This quick check is a small guide to this site, and it can’t help with this one.',
    links: [] };
  // crisis wording in what they typed: plain suicide guidance instead (the owner's update), still with no numbers, services or links
  var SUICIDE = { body: 'I’m really glad you said something. If you’re having thoughts of hurting yourself or not wanting to be here, please tell someone you trust today, and don’t stay alone with it.', links: [] };
  var SAFE_FOOT = 'If it doesn’t fit, that’s okay too: the steps for a calm talk are still here.';

  function next(result, lang) {
    lang = lang || 'en';
    var id = (result && result.type) || 'load', lvl = result ? result.level : 0, bank = NEXT[id] || NEXT.load;
    var src = lvl >= 4 ? (result && result.crisis ? SUICIDE : SAFE) : lvl === 3 ? L3 : bank[LEVEL_KEYS[lvl]] || bank.l1;
    var out = { level: lvl, key: LEVEL_KEYS[lvl], title: t(LEVEL_TITLES[lvl], lang), body: t(src.body, lang), say: src.say ? t(src.say, lang) : '',
      links: (src.links || []).map(function (l) { return { text: t(l.text, lang), href: l.href }; }), extra: '', footer: '', footerLinks: [] };
    // at level 3, the type's own plan stays one tap away
    if (lvl === 3 && bank.l2) out.links = out.links.concat(bank.l2.links.slice(0, 1).map(function (l) { return { text: t(l.text, lang), href: l.href }; }));
    if (lvl >= 4) { if (id !== 'afraid' && bank.l1) { out.footer = t(SAFE_FOOT, lang); out.footerLinks = bank.l1.links.map(function (l) { return { text: t(l.text, lang), href: l.href }; }); } }
    return out;
  }

  /* ---------- for Professor Puddles: the same banks and rules, as plain data ---------- */
  function exportForChat(lang) {
    lang = lang || 'en';
    var types = {};
    ORDER.forEach(function (id) {
      var ty = TYPES[id];
      types[id] = { title: t(ty.title, lang), why: t(ty.why, lang),
        questions: ty.questions.map(function (q) {
          return { id: q.id, short: t(q.short, lang), text: t(q.text, lang), answers: q.answers.map(function (a) { return { id: a.id, text: t(a.text, lang), w: a.w, flags: a.f.slice() }; })
            .concat([{ id: 'notsure', text: t(NOTSURE, lang), w: 0, flags: [] }, { id: 'skip', text: t(SKIP, lang), w: 0, flags: [] }]) };
        }),
        next: ['l0', 'l1', 'l2'].map(function (k, i) { return next({ type: id, level: i }, lang); })
      };
    });
    return {
      version: 1, lang: lang, order: ORDER.slice(), aliases: JSON.parse(JSON.stringify(ALIASES)), types: types,
      levels: LEVEL_TITLES.map(function (x, i) { return { level: i, key: LEVEL_KEYS[i], title: t(x, lang) }; }),
      level3: next({ type: 'load', level: 3 }, lang), safety: next({ type: 'afraid', level: 4 }, lang),
      flags: { benign: BENIGN.slice(), pattern: PATTERN.slice(), pressure: PRESSURE.slice(), signs: SIGNS.slice(), safety: SAFETY.slice() },
      rules: [
        'Ask the questions of one type in order, one per turn. Every question also accepts "Not sure" and "Skip". "Skip all" ends with level 0 and everyday tips.',
        'score = sum of w over the answers; C = answers with w >= 1; B = answers with a benign flag; S = distinct clear signs; P = distinct pressure signs.',
        'Safety (level 4): an answer flagged afraid, threat or danger; crisis wording in what they typed; S >= 2; or S >= 1 and P >= 1.',
        'Level 3: score >= 7 and C >= 3 and (stuck or P or S).',
        'Level 2: score >= 5 and C >= 2 and one of often, long, stuck, oneway, P or S.',
        'Level 1: score >= 2, or C >= 1 with nottalked, stuck or unknownfeel.',
        'Floors: S >= 1 gives at least level 2; P >= 1 or a threat in the typed words gives at least level 1.',
        'Caps (only when P = 0 and S = 0): B >= 2 caps at level 1; B = 1 caps at level 2.',
        'A single answer never reaches level 3 or safety, except afraid, threat, danger or crisis wording.',
        'A no, a limit or a request made out of care or respect for the relationship is benign (care), never control.',
        'Never label a person. Describe what happens and how it lands. Offer the next step as an option.'
      ],
      howToUse: 'Call TOLClarifyData.evaluate(type, {questionId: answerId}, {text, lang}) for the level, then TOLClarifyData.next(result, lang) for the words. Or follow the rules above by hand.'
    };
  }

  var api = { TYPES: TYPES, ALIASES: ALIASES, ORDER: ORDER, LEVEL_KEYS: LEVEL_KEYS, LEVEL_TITLES: LEVEL_TITLES, FLAG_WORDS: FLAG_WORDS,
    BENIGN: BENIGN, PATTERN: PATTERN, PRESSURE: PRESSURE, SIGNS: SIGNS, SAFETY: SAFETY,
    t: t, typeId: typeId, guessType: guessType, questions: questions, evaluate: evaluate, next: next, readText: readText, exportForChat: exportForChat,
    NOTSURE: NOTSURE, SKIP: SKIP };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TOLClarifyData = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
