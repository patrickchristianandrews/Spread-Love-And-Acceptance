/* roots.js — "Roots & Wings": a gentle, tap-first walk back through the stages of growing up,
   to see where a trait or reaction may have started, how to notice it, and one small way to
   tackle it this week. Used on /growing-up.html. Put <div data-roots></div> where it should go.
   This is self-reflection, not therapy or diagnosis. It never asks for details of anything painful.
   Answers stay in this browser tab only (sessionStorage) unless "Keep my answers on this device"
   is ticked, which saves them in this browser (localStorage) until Erase. Nothing is sent anywhere. */
(function () {
  'use strict';
  var KEY_TAB = 'tol-roots-tab', KEY_DEVICE = 'tol-roots-v1';
  var HEAVY = 'If a memory feels heavy, it’s okay to stop here. Talking it through with a trained counselor can help, on your own or with someone you trust.';
  var NOBLAME = 'Most families were doing their best with what they had; noticing where a rule came from isn’t blaming anyone. If that doesn’t fit your story, that’s okay too.';

  /* ---------------------------------------------------------------- the life stages */
  var STAGES = [
    { id: 'early', name: 'The early years', ages: 'about 0 to 5', in: 'early years', child: true,
      q: 'Is the world safe? Is it okay to start things and take up space?',
      tip: 'Most people don’t remember much from these years. Tap only what you know or have been told, or skip ahead.' },
    { id: 'school', name: 'School years', ages: 'about 6 to 11', in: 'school years', child: true, q: 'Am I capable? How do I measure up?' },
    { id: 'teen', name: 'The teen years', ages: 'about 12 to 17', in: 'teen years', child: true, q: 'Who am I, and where do I belong?' },
    { id: 'young', name: 'Young adulthood', ages: 'about 18 to 25', in: 'young adult years', q: 'Can I be close to someone without losing myself?' },
    { id: 'adult', name: 'Adult life since then', ages: 'after about 25', in: 'adult life', q: 'What am I building, and who am I building it with?',
      tip: 'If you’re not there yet, just skip this one.' },
    { id: 'recent', name: 'The last year or two', ages: 'lately', in: 'last year or two', recent: true, q: 'What is life asking of me right now?',
      tip: 'Old patterns often get louder when life is asking a lot. This helps you see why a trait may feel bigger lately.' }
  ];
  function stage(id) { for (var i = 0; i < STAGES.length; i++) if (STAGES[i].id === id) return STAGES[i]; return null; }

  /* ---------------------------------------------------------------- the answer choices
     [id, label, how it reads in a sentence] */
  var MOODS_CHILD = [['calm', 'Calm', 'home felt calm'], ['busy', 'Busy', 'home was very busy'], ['tense', 'Tense', 'home often felt tense'],
    ['unpredict', 'Unpredictable', 'home felt unpredictable'], ['changed', 'It changed over time', 'things at home kept changing'], ['none', 'Nothing stands out', '']];
  var MOODS_ADULT = [['calm', 'Calm', 'life felt calm'], ['busy', 'Busy', 'life was very busy'], ['tense', 'Tense', 'life often felt tense'],
    ['unpredict', 'Unpredictable', 'life felt unpredictable'], ['changed', 'A lot kept changing', 'a lot kept changing'], ['none', 'Nothing stands out', '']];
  var ROLES = [
    ['helper', 'The helper', 'the helper'], ['peace', 'The peacekeeper', 'the peacekeeper'], ['responsible', 'The responsible one', 'the responsible one'],
    ['quiet', 'The quiet one', 'the quiet one'], ['funny', 'The funny one', 'the funny one'], ['achiever', 'The achiever', 'the achiever'],
    ['carer', 'The one who looked after a parent or siblings', 'the one who looked after others'], ['invisible', 'The invisible one', 'the invisible one'],
    ['strong', 'The strong one', 'the strong one'], ['planner', 'The planner', 'the one who planned and organized'], ['none', 'None of these', '']];
  var CHANGES_CHILD = [
    ['move', 'Moving home', 'you moved'], ['sibling', 'A new sibling', 'a new sibling arrived'], ['split', 'Parents splitting up', 'your parents split up'],
    ['away', 'A parent away a lot', 'a parent was away a lot'], ['money', 'Money worries', 'there were money worries'], ['ill', 'Illness in the family', 'someone in the family was ill'],
    ['loss', 'Losing someone close', 'you lost someone close'], ['school', 'Changing schools', 'you changed schools'], ['step', 'A new step-family', 'a new step-family came together'],
    ['leftout', 'Being bullied or left out', 'you were bullied or left out'], ['pressure', 'A big success, or pressure to succeed', 'there was pressure to succeed'],
    ['hard', 'Something hard happened that I’d rather not name', 'something hard was happening'], ['none', 'Nothing stands out', '']];
  var CHANGES_ADULT = [
    ['move', 'Moving', 'you moved'], ['rel', 'A new relationship, or a breakup', 'a relationship began or ended'], ['parent', 'Becoming a parent', 'you became a parent'],
    ['job', 'A new job, or losing one', 'work changed'], ['money', 'Money worries', 'there were money worries'], ['ill', 'Illness, yours or someone close', 'there was illness close to you'],
    ['loss', 'Losing someone close', 'you lost someone close'], ['carer', 'Caring for someone', 'you were caring for someone'],
    ['pressure', 'A big success, or pressure to do well', 'there was pressure to do well'], ['leftout', 'Feeling left out or pushed aside', 'you felt left out or pushed aside'],
    ['hard', 'Something hard happened that I’d rather not name', 'something hard was happening'], ['none', 'Nothing stands out', '']];
  var PRAISED = [['helpful', 'Being helpful', 'being helpful'], ['results', 'Good grades or results', 'good results'], ['easy', 'Being quiet and easy', 'being quiet and easy'],
    ['strong', 'Being strong, not crying', 'being strong'], ['funny', 'Being funny', 'being funny'], ['caring', 'Looking after others', 'looking after others'],
    ['independent', 'Doing it all yourself', 'doing it all yourself'], ['none', 'Nothing stands out', '']];
  var TROUBLE = [['mistakes', 'Mistakes or mess', 'mistakes'], ['loud', 'Being loud or “too much”', 'being “too much”'], ['feelings', 'Crying or big feelings', 'big feelings'],
    ['asking', 'Asking for things', 'asking for things'], ['no', 'Saying no or talking back', 'saying no'], ['rest', 'Resting or being slow', 'resting'], ['none', 'Nothing stands out', '']];
  var RULES = [['cry', '“Don’t cry”'], ['good', '“Be good”'], ['fuss', '“Don’t make a fuss”'], ['work', '“Work comes first”'], ['peace', '“Keep the peace”'],
    ['private', '“Family business stays in the family”'], ['rest', '“Rest is earned”'], ['need', '“Don’t need too much”'], ['best', '“Be the best”'],
    ['others', '“Others come first”'], ['mistakes', '“Mistakes aren’t okay”'], ['notice', '“Whoever notices, does it”'], ['strong', '“Be strong”'], ['none', 'Nothing stands out']];

  /* each question: [key, choices, single?, child wording, adult wording, recent wording, hint] */
  var Q = {
    mood: ['mood', null, true, 'What was the mood at home, most of the time?', 'What was the mood of those years, most of the time?', 'How have things felt lately, most of the time?'],
    changes: ['changes', null, false, 'Did any big changes happen?', 'Did any big changes happen?', 'What has changed lately?', 'Tap any that fit. You never need to say more.'],
    roles: ['roles', ROLES, false, 'Which roles did you take on at home?', 'Which roles did you find yourself in?', 'Which roles are you in lately?', 'Many people had more than one.'],
    praised: ['praised', PRAISED, false, 'What got you praised?', '', ''],
    trouble: ['trouble', TROUBLE, false, 'What got you in trouble, or a frown?', '', ''],
    rules: ['rules', RULES, false, 'Which unspoken rules did home have?', 'Which rules were you living by?', 'Which old rules feel loud lately?', 'Rules nobody said out loud, but everyone knew.']
  };
  function choices(key, st) {
    if (key === 'mood') return st.child ? MOODS_CHILD : MOODS_ADULT;
    if (key === 'changes') return st.child ? CHANGES_CHILD : CHANGES_ADULT;
    return Q[key][1];
  }
  function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i][0] === id) return list[i]; return null; }

  /* ---------------------------------------------------------------- hard times, in general
     Only how a hard time felt, what helped, and how it may show up now. Never what happened. */
  var ANS = [['yes', 'Yes'], ['little', 'A little'], ['no', 'No'], ['pass', 'Rather not say']];
  var FELT = [
    { id: 'unsafe', q: 'Was there a time you felt unsafe, or very alone?', phrase: 'feeling unsafe or very alone',
      grow: 'Feeling unsafe or very alone can grow into a habit of counting only on yourself.', then: 'Counting on yourself got you through.',
      now: 'Now it can be hard to let people in, or to trust that they’ll stay.', notice: '“I’ll handle it” before anyone offers, or pulling back when someone gets close.',
      tryit: 'Let one person you trust help with one small thing this week.', traits: ['help', 'strong'], links: ['wiringcard'] },
    { id: 'toobig', q: 'Did something happen that felt too big for you to handle at that age?', phrase: 'something that felt too big for your age',
      grow: 'Something too big for your age can teach a body to brace, or to switch off.', then: 'Bracing or switching off helped you get through something you couldn’t change.',
      now: 'Now a stressful moment can feel bigger than it is, or your mind can go blank.', notice: 'Going still, foggy or very alert when pressure rises.',
      tryit: 'Plan a pause ahead of time with the Calm-Down Kit, so you have a way out and a way back.', traits: ['shutdown', 'control'], links: ['calm'] },
    { id: 'fast', q: 'Did you have to grow up fast, or look after others before you were ready?', phrase: 'having to grow up fast',
      grow: 'Growing up fast often grows into being the strong, responsible one.', then: 'Being capable early helped the people around you, and you.',
      now: 'Now resting and receiving can feel uncomfortable, and you may carry more than your share.', notice: 'Restlessness when you stop, or “I’m fine” when you’re not.',
      tryit: 'Hand one job back this week, and let someone else carry it their way.', traits: ['strong', 'help', 'rest', 'moods'], links: ['lemonade'] },
    { id: 'watch', q: 'Did home feel unpredictable, so you had to watch the mood to know what was coming?', phrase: 'having to watch the mood at home',
      grow: 'Watching the mood at home can grow into a quickness to notice tension.', then: 'It kept you ready back then.',
      now: 'Now calm can feel like the calm before a storm, and you may brace before anything has happened.', notice: 'Your shoulders rise or your breath goes shallow in a quiet room, as if you’re waiting.',
      tryit: 'When you notice it, name it once: “That’s my old weather radar. Today is today.” Then find three things around you that say you’re okay now.', traits: ['moods', 'apologize', 'quiet', 'control'], links: ['weather'] },
    { id: 'unseen', q: 'Was there a time no one noticed you were struggling?', phrase: 'struggling without anyone noticing',
      grow: 'Struggling without anyone noticing can grow into hiding it very well.', then: 'Keeping it to yourself may have kept things simpler for everyone.',
      now: 'Now the people close to you may not know when you need them.', notice: 'Smiling through it, or quietly waiting for someone to guess.',
      tryit: 'Say one plain sentence to someone you trust: “I’m having a hard week. Can we talk tonight?”', traits: ['help', 'strong', 'please'], links: ['signal'] },
    { id: 'loss', q: 'Did you lose someone or something important, and not get much chance to talk about it?', phrase: 'a loss you didn’t get to talk about',
      grow: 'A loss you didn’t get to talk about can stay tucked away, unfinished.', then: 'Not talking about it may have been the only way to keep going.',
      now: 'Now goodbyes, endings or changes can hit harder than you expect.', notice: 'A heaviness around certain dates, places or changes.',
      tryit: 'Give it a little room: write one line about who or what you lost, or share one memory with someone you trust.', traits: ['change', 'strong'], links: [] }
  ];
  var HELPED = [['place', 'A place'], ['pet', 'A pet'], ['music', 'Music'], ['books', 'Books or stories'], ['humor', 'Humor'], ['faith', 'Faith'],
    ['friends', 'Friends'], ['moving', 'Sport, play or being outside'], ['making', 'Making things'], ['else', 'Something else']];
  var SIGNS = [
    { id: 'guard', q: 'Do you feel on guard even when things are calm?', name: 'Feeling on guard when things are calm',
      text: 'Your alarm may have learned to stay on, because once it needed to.', tryit: 'When calm feels uneasy, put both feet on the floor and make your out-breath slower than your in-breath. Check your battery with Today’s Weather.', links: ['weather', 'calm'] },
    { id: 'back', q: 'Do some tones of voice, sounds, smells or places bring an old feeling right back?', name: 'Old feelings coming right back',
      text: 'The feeling may be older than the moment. Chapter III calls this leftover stress.', tryit: 'Say to yourself, “This feeling is from then. I’m here now,” and step away for a minute if you can.', links: ['ch3'] },
    { id: 'bigger', q: 'Do you react more strongly than a moment seems to deserve, and only realize it later?', name: 'Reacting bigger than the moment',
      text: 'Part of the reaction may belong to an older moment.', tryit: 'Once you’ve settled, try the one-minute lens check, and if it helps, a repair: “That was bigger than what you did. Part of it is older than us.”', links: ['lenscheck'] },
    { id: 'rest', q: 'Is it hard to rest, slow down or let others help?', name: 'Finding it hard to rest or be helped',
      text: 'Staying busy and self-reliant may once have kept things steady.', tryit: 'Take one short rest on purpose before the list is done, and accept one offer of help.', links: ['weather', 'rulebook'] },
    { id: 'numb', q: 'Do you go numb or far away when things get heated?', name: 'Going numb or far away',
      text: 'Going far away was a way through, once.', tryit: 'Agree on a pause signal and a time to come back, and tell the people close to you what helps.', links: ['calm', 'wiringcard'] },
    { id: 'blurry', q: 'Are there parts of a time in your life that feel blurry, or that you avoid thinking about?', name: 'Blurry or avoided times',
      text: 'That’s common, and you don’t need to fill in the gaps.', tryit: 'Go gently, and only look when you want to.', links: [] }
  ];
  var SIGN_TRAITS = { guard: ['control', 'moods'], back: ['shutdown', 'defensive'], bigger: ['defensive', 'quiet'], rest: ['rest', 'help'], numb: ['shutdown', 'quiet'], blurry: ['change'] };
  function hYes(id) { var v = S.h[id]; return v === 'yes' || v === 'little'; }

  /* the screens, in order */
  var STEPS = [{ t: 'traits' }];
  STAGES.forEach(function (s) {
    if (s.child) { STEPS.push({ t: 'stage', s: s.id, part: 1, qs: ['mood', 'changes'] }); STEPS.push({ t: 'stage', s: s.id, part: 2, qs: ['roles', 'praised', 'trouble', 'rules'] }); }
    else STEPS.push({ t: 'stage', s: s.id, part: 0, qs: ['mood', 'changes', 'roles', 'rules'] });
  });
  STEPS.push({ t: 'hard', part: 1 }, { t: 'hard', part: 2 }, { t: 'hard', part: 3 });
  STEPS.push({ t: 'results' });

  /* ---------------------------------------------------------------- the tools it can point to */
  var LINKS = {
    rulebook: ['The rulebook from home', '#home'], lenscheck: ['The one-minute lens check', '#check'],
    wavelength: ['Wavelength', '/wavelength.html'], knowyourself: ['Know your own wiring', '/know-yourself.html'],
    signal: ['The Signal Translator', '/signal-translator.html'], shifter: ['The Perspective Shifter', '/perspective-shifter.html'],
    calm: ['The Calm-Down Kit (WP-11)', '/wp-11.html'], weather: ['Today’s Weather', '/quick-checks.html#today'],
    sayno: ['Kind ways to say no (WP-01)', '/workpapers/wp-01.html'], ch3: ['Chapter III: leftover stress', '/book/chapter-3.html'],
    lemonade: ['The Lemonade Stand', '/lemonade-stand.html'], checkins: ['Swap rulebooks in a check-in', '/check-ins.html'],
    wiringcard: ['The Wiring Card', '/wiring-card.html']
  };

  /* ---------------------------------------------------------------- traits: where they often start, and what helps
     roots: r: role, u: rule, p: praised for, t: trouble for, c: change, m: mood */
  var TRAITS = [
    { id: 'apologize', label: 'I over-apologize',
      roots: 'r:peace r:quiet r:invisible r:helper u:fuss u:good u:peace u:mistakes t:mistakes t:loud t:asking p:easy m:tense m:unpredict c:split',
      typical: 'It often grows in homes where keeping things calm mattered a lot, or where mistakes or big feelings brought trouble.',
      protect: 'Saying sorry first may have calmed things down fast, or kept trouble from starting.',
      cost: 'Now it can shrink your space, make small things feel like your fault, and leave people unsure when you really mean it.',
      notice: '“Sorry” comes out before you’ve had a thought, often with a quick tight feeling in your chest or a smile you don’t feel.',
      tryit: ['Swap one “sorry” a day for “thank you”: “Thanks for waiting” instead of “Sorry I’m late.”'],
      say: 'I’m not going to apologize for asking. I’d just like to know.',
      rule: ['If something’s wrong, it’s probably my fault.', 'I apologize when I’ve done something, not to make a moment smaller.'],
      links: ['signal', 'rulebook', 'lenscheck'] },
    { id: 'rest', label: 'I can’t rest until everything’s done',
      roots: 'r:responsible r:helper r:achiever r:carer u:work u:rest u:notice u:best p:helpful p:results t:rest c:money c:ill c:pressure c:away m:busy',
      typical: 'It often grows where there was a lot to do, help was praised, or resting looked lazy.',
      protect: 'Keeping busy may have kept things steady, earned praise, or helped a stretched household get through.',
      cost: 'Now rest can feel like something you haven’t earned yet, so you run low, and you may feel uneasy when others rest.',
      notice: 'Restlessness when you sit down: a list starts in your head, or guilt shows up when someone else is busy.',
      tryit: ['Take one 15-minute rest this week before the list is done. Notice what actually happens. Usually, nothing bad.', 'Check your battery first with Today’s Weather. A low battery makes this rule louder.'],
      say: 'I’m stopping for twenty minutes. The rest can wait.',
      rule: ['Rest is earned.', 'Rest is part of the work, not the prize for finishing it.'],
      links: ['weather', 'rulebook', 'lemonade'] },
    { id: 'quiet', label: 'I go quiet in conflict',
      roots: 'r:quiet r:peace r:invisible u:peace u:fuss u:cry u:private t:feelings t:no t:loud p:easy m:tense m:unpredict c:split',
      typical: 'It often grows where speaking up made things bigger, or where keeping the peace was everyone’s job.',
      protect: 'Going quiet may have kept a bigger argument from happening, or kept the peace when speaking up made things worse.',
      cost: 'Now people may read your silence as not caring, and what you need doesn’t get said, so it can come out later as resentment.',
      notice: 'Your throat tightens, your mind goes blank, or the thought “there’s no point saying anything” arrives.',
      tryit: ['Agree on a pause signal ahead of time, and a time to come back. The Calm-Down Kit helps you plan it.'],
      say: 'I want to answer this, and I need a few minutes to find my words. Can we pick it up at eight?',
      rule: ['Keep the peace, keep quiet.', 'I can take a pause and still come back and say my part.'],
      links: ['calm', 'wavelength', 'signal'] },
    { id: 'control', label: 'I need to be in control of plans',
      roots: 'r:responsible r:planner r:carer r:strong u:notice u:mistakes u:strong m:unpredict m:changed m:tense c:move c:split c:away c:money c:ill c:step c:school c:job',
      typical: 'It often grows where plans couldn’t be counted on, or where a lot kept changing.',
      protect: 'When plans couldn’t be counted on, holding the plan yourself may have been how you made life feel steady.',
      cost: 'Now it can mean carrying the whole mental load, feeling on edge when plans shift, and others feeling shut out.',
      notice: 'A jolt of alarm when a plan changes, or the urge to take over before anyone else has a chance.',
      tryit: ['Hand over one small plan this week, and let it go a little differently than you would do it.', 'Use the Perspective Shifter to see a change of plan from the other person’s side.'],
      say: 'I notice I want to grab this plan. Can you own it, and tell me the time and place once it’s set?',
      rule: ['If I don’t hold the plan, it falls apart.', 'Plans can be shared, and a change of plan isn’t an emergency.'],
      links: ['shifter', 'lemonade', 'calm'] },
    { id: 'moods', label: 'I feel responsible for everyone’s mood',
      roots: 'r:peace r:carer r:helper r:funny u:peace u:others m:tense m:unpredict c:ill c:split c:loss c:away c:money t:loud p:caring',
      typical: 'It often grows where a grown-up’s mood set the weather for the whole home.',
      protect: 'Reading the room and smoothing things over may have helped keep a tense or stretched home steadier.',
      cost: 'Now other people’s moods can take over your day, and it’s hard to know what you feel when someone near you is upset.',
      notice: 'You scan faces when you walk in, or your stomach drops when someone sighs.',
      tryit: ['When someone’s upset, ask instead of fixing: “Do you want help, or company?”', 'Check your own weather first, before you take on theirs.'],
      say: 'I can see you’re having a hard day. I’m here if you want me, and I’m going to finish what I’m doing.',
      rule: ['If someone’s upset, it’s my job to fix it.', 'I can care about someone’s mood without carrying it.'],
      links: ['weather', 'shifter', 'ch3'] },
    { id: 'help', label: 'I find it hard to ask for help',
      roots: 'r:strong r:responsible r:carer r:invisible r:achiever u:need u:strong u:private u:fuss u:cry t:asking p:independent p:strong c:money c:ill c:away c:split c:carer m:busy',
      typical: 'It often grows where the grown-ups were stretched thin, or where needing things felt like a bother.',
      protect: 'If the grown-ups were stretched thin, needing very little may have been a way to help, or to keep from being turned down.',
      cost: 'Now you may carry too much alone, and the people close to you don’t get the chance to show up for you.',
      notice: '“I’ll just do it myself” arrives before you’ve even asked, or a hot feeling of being a bother.',
      tryit: ['Ask for one small, specific thing this week, like “Can you grab milk on the way home?”, and notice what happens.'],
      say: 'I could use a hand with this. Would you take the dishes tonight?',
      rule: ['Needing help makes me a burden.', 'Asking clearly is fair. People who care about me can say yes or no.'],
      links: ['signal', 'wiringcard', 'rulebook'] },
    { id: 'defensive', label: 'I get defensive at feedback',
      roots: 'r:achiever r:responsible r:invisible u:mistakes u:best u:good t:mistakes p:results c:pressure c:leftout c:school c:job m:tense',
      typical: 'It often grows where mistakes brought trouble, or where you were compared, picked on or under pressure.',
      protect: 'If mistakes were met with trouble, or you were compared or picked on, shielding yourself fast may have kept you from being hurt.',
      cost: 'Now even kind feedback can land like an attack, and small notes turn into big arguments.',
      notice: 'Heat in your face, a fast “but…”, or the urge to explain before they’ve finished.',
      tryit: ['Next time you get feedback, say “Let me think about that,” and answer an hour later.', 'Run the words through the Signal Translator to hear them without the old sting.'],
      say: 'Part of me wants to defend myself. Give me a minute so I can actually hear you.',
      rule: ['Mistakes mean I’m bad.', 'I can own a mistake without being one.'],
      links: ['signal', 'lenscheck', 'ch3'] },
    { id: 'please', label: 'I people-please',
      roots: 'r:helper r:peace r:invisible r:funny u:good u:others u:peace u:fuss p:helpful p:easy p:caring t:no t:asking m:tense',
      typical: 'It often grows where being good, easy or helpful was how you stayed close and out of trouble.',
      protect: 'Saying yes may have kept people happy, kept you close, or kept trouble away.',
      cost: 'Now you may say yes when you mean no, run out of time and energy, and quietly resent it.',
      notice: 'A “yes” comes out before you’ve checked your calendar, or your stomach drops right after you say it.',
      tryit: ['Use a pause line before you answer: “Let me check and get back to you.”', 'Who did what (WP-01) has kind ways to say no without starting a fight.'],
      say: 'I’d love to help, and I can’t this week.',
      rule: ['Being good means saying yes.', 'My no is what makes my yes mean something.'],
      links: ['sayno', 'signal', 'wavelength'] },
    { id: 'change', label: 'I avoid change',
      roots: 'r:quiet r:responsible r:planner u:good u:fuss m:unpredict m:changed c:move c:school c:split c:step c:loss c:ill c:sibling c:rel c:job',
      typical: 'It often grows where a lot changed early, or changes arrived without warning.',
      protect: 'If a lot changed when you were young, holding on to what stayed the same may have been how you felt safe.',
      cost: 'Now new things can feel risky even when they’re good for you, and you may miss chances or feel stuck.',
      notice: 'Dread when someone says “What if we…?”, or finding reasons to wait before you’ve thought it through.',
      tryit: ['Try one tiny change this week, on purpose and with an end date: a new route, a new recipe.', 'Plan the calm part first with the Calm-Down Kit.'],
      say: 'I’m slow with changes. Can we try it for two weeks and then look again?',
      rule: ['Change means losing something.', 'I can go slowly with change and still say yes to it.'],
      links: ['calm', 'knowyourself', 'shifter'] },
    { id: 'score', label: 'I keep score',
      roots: 'r:responsible r:helper r:invisible r:carer u:notice u:work u:others p:helpful c:sibling c:step c:money c:pressure m:busy',
      typical: 'It often grows where you did a lot that wasn’t seen, or where fairness was hard to come by.',
      protect: 'If you did a lot without it being seen, keeping count may have been how you made sure you weren’t forgotten.',
      cost: 'Now a quiet tally can turn into resentment the other person doesn’t even know about.',
      notice: 'The thought “I always…” or “they never…”, and a tight jaw while you do a job.',
      tryit: ['Put the count on paper instead of in your head: the Lemonade Stand shows who does what, without blame.', 'Swap rulebooks on a calm day about “whoever notices, does it.”'],
      say: 'I’ve been keeping a quiet count, and that isn’t fair to either of us. Can we split this out loud?',
      rule: ['Whoever notices, does it.', 'Each job gets one owner, by choice.'],
      links: ['lemonade', 'checkins', 'rulebook'] },
    { id: 'shutdown', label: 'I shut down when voices rise',
      roots: 'r:quiet r:invisible r:peace u:peace u:cry u:fuss m:tense m:unpredict c:split c:leftout c:hard t:loud t:feelings',
      typical: 'It often grows where raised voices came before something bad, or where there was nowhere to go.',
      protect: 'If raised voices came before something bad, going still or far away may have been your body’s way of getting through.',
      cost: 'Now even ordinary loudness, like excitement or venting, can switch you off, and others may not know why you’ve gone.',
      notice: 'You go numb, foggy or very still when voices rise, even when nobody is upset with you.',
      tryit: ['On a calm day, tell the people close to you what loud does to you. The Wiring Card is a good place to write it.', 'Plan a pause in the Calm-Down Kit, so you can step out and come back.'],
      say: 'When voices get loud I switch off. Can we keep it softer, or take five and start again?',
      rule: ['Loud means something bad is coming.', 'Loud is sometimes just loud. I can ask for softer and still stay.'],
      links: ['calm', 'wiringcard', 'ch3'] },
    { id: 'strong', label: 'I always have to be the strong one',
      roots: 'r:strong r:carer r:responsible r:helper u:strong u:cry u:need u:private p:strong p:independent c:ill c:loss c:away c:split c:money c:carer t:feelings',
      typical: 'It often grows where someone had to hold it together, or where tears weren’t welcome.',
      protect: 'If someone needed to hold it together, being the strong one may have helped your family, or you, get through.',
      cost: 'Now you may hide it when you’re struggling, and others may not know you need anything.',
      notice: '“I’m fine” comes out on its own, or you feel tired in a way you don’t let show.',
      tryit: ['Tell one person you trust one true thing about how you are this week.', 'Write what helps you on your Wiring Card.'],
      say: 'I’m usually the strong one, and right now I’m tired. Can you take this one?',
      rule: ['I have to be the strong one.', 'Strong people lean too. Letting someone help is part of a fair share.'],
      links: ['wiringcard', 'weather', 'knowyourself'] }
  ];
  TRAITS.forEach(function (t) { t.r = t.roots.split(' ').map(function (x) { var p = x.split(':'); return { k: p[0], id: p[1] }; }); });
  function trait(id) { for (var i = 0; i < TRAITS.length; i++) if (TRAITS[i].id === id) return TRAITS[i]; return null; }
  var KIND_KEY = { r: 'roles', u: 'rules', p: 'praised', t: 'trouble', c: 'changes', m: 'mood' };
  var WEIGHT = { r: 3, u: 3, p: 2, t: 2, c: 2, m: 1 };

  /* ---------------------------------------------------------------- small helpers */
  function get(store, k) { try { return window[store].getItem(k); } catch (e) { return null; } }
  function set(store, k, v) { try { window[store].setItem(k, v); } catch (e) {} }
  function del(store, k) { try { window[store].removeItem(k); } catch (e) {} }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function and(list) { return list.length < 2 ? (list[0] || '') : list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1]; }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function stillMotion() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

  function blank() {
    var a = {}; STAGES.forEach(function (s) { a[s.id] = { mood: '', changes: [], roles: [], praised: [], trouble: [], rules: [] }; });
    return { v: 1, step: 0, traits: [], other: '', a: a, h: { when: [], helped: [] }, oldRule: '', newRule: '' };
  }
  function clean(d) {
    var b = blank(); if (!d || typeof d !== 'object') return b;
    b.step = Math.max(0, Math.min(STEPS.length - 1, +d.step || 0));
    b.traits = Array.isArray(d.traits) ? d.traits.filter(function (x) { return x === 'other' || x === 'explore' || trait(x); }) : [];
    ['other', 'oldRule', 'newRule'].forEach(function (k) { b[k] = typeof d[k] === 'string' ? d[k].slice(0, 400) : ''; });
    STAGES.forEach(function (s) {
      var x = d.a && d.a[s.id]; if (!x) return;
      b.a[s.id].mood = typeof x.mood === 'string' ? x.mood : '';
      ['changes', 'roles', 'praised', 'trouble', 'rules'].forEach(function (k) { if (Array.isArray(x[k])) b.a[s.id][k] = x[k].filter(function (v) { return typeof v === 'string'; }); });
    });
    if (d.h && typeof d.h === 'object') {
      Object.keys(d.h).forEach(function (k) {
        if (k === 'when' || k === 'helped') { if (Array.isArray(d.h[k])) b.h[k] = d.h[k].filter(function (v) { return typeof v === 'string'; }); }
        else if (typeof d.h[k] === 'string' && find(ANS, d.h[k])) b.h[k] = d.h[k];
      });
    }
    return b;
  }
  function hardAnswered() { return Object.keys(S.h).some(function (k) { var x = S.h[k]; return Array.isArray(x) ? x.length > 0 : !!x; }); }
  function vals(st, key) { var x = S.a[st][key]; return key === 'mood' ? (x && x !== 'none' ? [x] : []) : x.filter(function (v) { return v !== 'none'; }); }
  function answered(st) { return ['mood', 'changes', 'roles', 'praised', 'trouble', 'rules'].some(function (k) { var x = S.a[st][k]; return k === 'mood' ? !!x : x.length > 0; }); }
  function isEmpty() { return !S.traits.length && !S.other.trim() && !S.oldRule.trim() && !S.newRule.trim() && !hardAnswered() && !STAGES.some(function (s) { return answered(s.id); }); }

  /* ---------------------------------------------------------------- reading the answers */
  function itemsFor(t, sid) {
    var out = [];
    t.r.forEach(function (x) { if (vals(sid, KIND_KEY[x.k]).indexOf(x.id) > -1) out.push(x); });
    return out;
  }
  function score(items) { return items.reduce(function (n, x) { return n + WEIGHT[x.k]; }, 0); }
  function clauses(items, st) {
    var by = { r: [], u: [], p: [], t: [], c: [], m: [] }, out = [];
    items.forEach(function (x) { by[x.k].push(x.id); });
    if (by.r.length) out.push((st.recent ? 'you’re ' : 'you were ') + and(by.r.slice(0, 2).map(function (id) { return find(ROLES, id)[2]; })));
    if (by.u.length) {
      var r = by.u.slice(0, 2).map(function (id) { return find(RULES, id)[1]; });
      out.push(st.child ? and(r) + (r.length > 1 ? ' were unspoken rules' : ' was one of the unspoken rules') : (st.recent ? 'you’re living by ' : 'you were living by ') + and(r));
    }
    if (by.p.length) out.push('you were praised for ' + and(by.p.slice(0, 2).map(function (id) { return find(PRAISED, id)[2]; })));
    if (by.t.length) out.push('you could get in trouble for ' + and(by.t.slice(0, 2).map(function (id) { return find(TROUBLE, id)[2]; })));
    by.c.slice(0, 2).forEach(function (id) { var c = find(choices('changes', st), id); if (c) out.push(c[2]); });
    by.m.forEach(function (id) { var m = find(choices('mood', st), id); if (m && m[2]) out.push(m[2]); });
    return and(out.slice(0, 3));
  }
  /* where one trait may have started, from this person's own answers */
  function rootsOf(t) {
    var rows = STAGES.map(function (s) { var it = itemsFor(t, s.id); return { s: s, it: it, n: score(it) }; });
    var past = rows.filter(function (r) { return !r.s.recent && r.n >= 2; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 2)
      .sort(function (a, b) { return STAGES.indexOf(a.s) - STAGES.indexOf(b.s); });
    var lines = [];
    past.forEach(function (r, i) {
      lines.push((i === 0 ? 'This may have started in your ' : 'It may have grown stronger in your ') + r.s.in + ', when ' + clauses(r.it, r.s) + '.');
    });
    if (past.length) lines.push('Your ' + past[0].s.in + ' often ask “' + past[0].s.q + '” Something that touches the question you’re answering at the time tends to go deeper.');
    // a role or rule from this trait that repeats across stages
    var rep = null;
    t.r.forEach(function (x) {
      if (rep || (x.k !== 'r' && x.k !== 'u')) return;
      var where = STAGES.filter(function (s) { return !s.recent && vals(s.id, KIND_KEY[x.k]).indexOf(x.id) > -1; });
      if (where.length >= 2) rep = { x: x, where: where };
    });
    if (rep) {
      var nm = rep.x.k === 'r' ? 'Being ' + find(ROLES, rep.x.id)[2] : find(RULES, rep.x.id)[1];
      lines.push(nm + ' shows up in your ' + and(rep.where.map(function (s) { return s.in; })) + ', so it may have become a habit, not just a phase.');
    }
    var rec = rows[rows.length - 1];
    if (rec.n >= 2) lines.push('It may feel louder lately, because ' + clauses(rec.it, rec.s) + '. Old patterns often get louder when life is asking a lot.');
    var felt = FELT.filter(function (f) { return hYes(f.id) && f.traits.indexOf(t.id) > -1; }).map(function (f) { return f.phrase; });
    if (felt.length) lines.push('It may ' + (lines.length ? 'also ' : '') + 'connect to ' + and(felt.slice(0, 2)) + ', from your answers about hard times.');
    return { lines: lines, found: past.length > 0 || rec.n >= 2 || felt.length > 0 };
  }
  /* the strongest patterns across all the answers, for "not sure yet" and for everyone */
  function patterns() {
    var out = [];
    function count(key, list) {
      var seen = {};
      STAGES.forEach(function (s) { if (s.recent) return; vals(s.id, key).forEach(function (v) { (seen[v] = seen[v] || []).push(s); }); });
      return Object.keys(seen).filter(function (k) { return seen[k].length >= 2 && find(list, k); }).map(function (k) { return { id: k, where: seen[k] }; })
        .sort(function (a, b) { return b.where.length - a.where.length; });
    }
    function stagesIn(list) { return and(list.map(function (s) { return s.in; })); }
    count('roles', ROLES).slice(0, 2).forEach(function (r) {
      out.push({ n: 6, t: 'You were ' + find(ROLES, r.id)[2] + ' in your ' + stagesIn(r.where) + '. A role that repeats can turn into a seat you slide into without choosing, at home, at work and with friends.' });
    });
    count('rules', RULES).slice(0, 2).forEach(function (r) {
      out.push({ n: 5, t: find(RULES, r.id)[1] + ' shows up in your ' + stagesIn(r.where) + '. A rule that keeps showing up is often one you’re still living by.' });
    });
    STAGES.forEach(function (s) {
      var ch = vals(s.id, 'changes').filter(function (v) { return v !== 'hard'; });
      if (ch.length >= 3 && !s.recent) out.push({ n: 5, t: 'A lot changed in your ' + s.in + ': ' + and(ch.map(function (id) { return find(choices('changes', s), id)[1].toLowerCase(); })) + '. When many things change at once, people often learn to stay alert, hold on to the plan, or need very little.' });
    });
    STAGES.forEach(function (s) {
      var m = S.a[s.id].mood;
      if (s.child && (m === 'tense' || m === 'unpredict')) out.push({ n: 4, t: 'Home felt ' + (m === 'tense' ? 'tense' : 'unpredictable') + ' in your ' + s.in + '. Children in homes like that often get very good at reading the room. That skill is real, and it can be tiring to keep running.' });
    });
    STAGES.forEach(function (s) {
      var p = vals(s.id, 'praised');
      if (p.length && s.child) out.push({ n: 3, t: 'In your ' + s.in + ' you were praised for ' + and(p.slice(0, 2).map(function (id) { return find(PRAISED, id)[2]; })) + '. What gets praised can turn into what we feel we must keep doing to be okay.' });
      var tr = vals(s.id, 'trouble');
      if (tr.length && s.child) out.push({ n: 3, t: 'In your ' + s.in + ', ' + and(tr.slice(0, 2).map(function (id) { return find(TROUBLE, id)[2]; })) + ' could get you in trouble. What got us in trouble often turns into what we still avoid.' });
    });
    var rc = vals('recent', 'changes').filter(function (v) { return v !== 'hard'; }), rm = S.a.recent.mood;
    if (rc.length >= 2 || rm === 'tense' || rm === 'busy' || rm === 'unpredict') out.push({ n: 4, t: 'The last year or two has asked a lot of you. Old patterns often get louder when we’re stretched, so go easy on yourself.' });
    // keep the first of each kind of story, strongest first, and not too many
    out.sort(function (a, b) { return b.n - a.n; });
    var seen = {}, res = [];
    out.forEach(function (p) { if (res.length < 5 && !seen[p.t]) { seen[p.t] = 1; res.push(p.t); } });
    return res;
  }
  function suggested() {
    return TRAITS.map(function (t) {
      var n = 0; STAGES.forEach(function (s) { n += score(itemsFor(t, s.id)); });
      FELT.forEach(function (f) { if (hYes(f.id) && f.traits.indexOf(t.id) > -1) n += 2; });
      SIGNS.forEach(function (g) { if (hYes(g.id) && SIGN_TRAITS[g.id].indexOf(t.id) > -1) n += 2; });
      return { t: t, n: n };
    })
      .filter(function (x) { return x.n >= 4 && S.traits.indexOf(x.t.id) < 0; }).sort(function (a, b) { return b.n - a.n; }).slice(0, S.traits.some(function (x) { return trait(x); }) ? 2 : 3).map(function (x) { return x.t; });
  }
  function chosenRules() {
    var seen = {}, out = [];
    STAGES.forEach(function (s) { vals(s.id, 'rules').forEach(function (r) { if (!seen[r]) { seen[r] = 1; out.push(find(RULES, r)[1]); } }); });
    return out;
  }

  /* ---------------------------------------------------------------- styles */
  function css() {
    if (document.getElementById('rw-css')) return;
    var s = document.createElement('style'); s.id = 'rw-css';
    s.textContent =
      '.rw{ margin:1rem 0 .5rem; padding:1rem 1.1rem 1.1rem; border:1px solid var(--line); border-radius:14px; background:rgba(255,253,247,.94); max-width:46rem; box-sizing:border-box; overflow-wrap:break-word; }' +
      '.rw{ scroll-margin-top:84px; }' +
      '.rw *{ box-sizing:border-box; }' +
      '.rw p{ margin:.4rem 0; max-width:none; }' +
      '.rw-top{ display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:.3rem .8rem; margin:0 0 .35rem; font-size:.88rem; color:var(--ink-soft); }' +
      '.rw-bar{ height:8px; border-radius:999px; background:var(--paper-deep); overflow:hidden; margin:0 0 .9rem; }' +
      '.rw-bar i{ display:block; height:100%; width:0; background:var(--credit); border-radius:999px; transition:width .35s ease; }' +
      '.rw h3.rw-h{ font-family:"Fraunces", Georgia, serif; font-size:1.3rem; line-height:1.25; margin:.1rem 0 .3rem; }' +
      '.rw h3.rw-h:focus{ outline:none; }' +
      '.rw-ages{ font-size:.92rem; color:var(--ink-soft); margin:0 0 .3rem !important; }' +
      '.rw-bigq{ font-family:"Fraunces", Georgia, serif; font-style:italic; font-size:1.05rem; }' +
      '.rw-tip{ font-size:.94rem; color:var(--ink-soft); }' +
      '.rw-heavy{ margin:.7rem 0 .9rem !important; padding:.55rem .8rem; border-left:4px solid var(--credit); background:rgba(62,107,76,.07); border-radius:0 10px 10px 0; font-size:.93rem; }' +
      '.rw-q{ margin:1.05rem 0 0; }' +
      '.rw-q h4{ font-size:1.02rem; margin:0 0 .15rem; font-weight:600; font-family:inherit; }' +
      '.rw-hint{ font-size:.88rem; color:var(--ink-soft); margin:0 0 .35rem !important; }' +
      '.rw-chips{ display:flex; flex-wrap:wrap; gap:.45rem; margin:.4rem 0 0; }' +
      '.rw-chip{ font:inherit; font-size:.95rem; line-height:1.25; text-align:left; min-height:44px; padding:.45rem .85rem; border:1px solid var(--line); border-radius:999px; background:#FFFDF7; color:var(--ink); cursor:pointer; max-width:100%; }' +
      '.rw-chip:hover{ border-color:var(--brass); }' +
      '.rw-chip[aria-pressed="true"]{ background:var(--paper-deep); border-color:var(--brass); box-shadow:inset 0 0 0 1px var(--brass); }' +
      '.rw-chip[aria-pressed="true"]::before{ content:"✓ "; color:var(--credit); font-weight:600; }' +
      '.rw-chip.is-quiet{ border-style:dashed; }' +
      '.rw button:focus-visible, .rw a:focus-visible, .rw textarea:focus, .rw input:focus-visible{ outline:3px solid var(--focus); outline-offset:2px; }' +
      '.rw textarea, .rw-in{ width:100%; font:inherit; font-size:1rem; line-height:1.45; padding:.5rem .6rem; border:1px solid #BFAE80; border-radius:8px; background:#FFFDF7; color:var(--ink); resize:vertical; }' +
      '.rw-nav{ display:flex; flex-wrap:wrap; gap:.5rem; align-items:center; margin:1.2rem 0 0; }' +
      '.rw-btn{ font:inherit; font-size:.98rem; min-height:44px; padding:.45rem 1.1rem; border:1px solid var(--brass); border-radius:999px; background:#FFFDF7; color:var(--ink); cursor:pointer; }' +
      '.rw-btn:hover{ background:var(--paper-deep); }' +
      '.rw-btn.is-go{ background:var(--ink); color:var(--paper); border-color:var(--ink); }' +
      '.rw-btn.is-go:hover{ background:#000; }' +
      '.rw-btn.is-link{ border-color:transparent; text-decoration:underline; padding-left:.5rem; padding-right:.5rem; }' +
      '.rw-nav .rw-spacer{ flex:1 1 auto; }' +
      '.rw-card{ margin:1rem 0 0; padding:.85rem 1rem .9rem; border:1px solid var(--line); border-left:4px solid var(--brass); border-radius:10px; background:#FFFDF7; }' +
      '.rw-card h4{ font-family:"Fraunces", Georgia, serif; font-size:1.15rem; margin:0 0 .35rem; }' +
      '.rw-card h5{ font-size:.82rem; letter-spacing:.04em; text-transform:uppercase; color:var(--brass-ink); margin:.8rem 0 .15rem; font-family:"IBM Plex Mono", monospace; font-weight:500; }' +
      '.rw-card ul{ margin:.2rem 0 .2rem 1.1rem; padding:0; }' +
      '.rw-card li{ margin:.2rem 0; max-width:none; }' +
      '.rw-say{ font-family:"Fraunces", Georgia, serif; font-size:1.02rem; }' +
      '.rw-links{ display:flex; flex-wrap:wrap; gap:.3rem 1rem; margin:.5rem 0 0 !important; font-size:.95rem; }' +
      '.rw-tl{ list-style:none; margin:.4rem 0 0; padding:0; }' +
      '.rw-tl > li{ margin:0; padding:.55rem 0 .55rem 1rem; border-left:3px solid var(--line); max-width:none; }' +
      '.rw-tl strong{ display:block; }' +
      '.rw-tl span{ display:block; font-size:.94rem; }' +
      '.rw-pick{ display:flex; flex-wrap:wrap; gap:.4rem; margin:.35rem 0 .5rem; }' +
      '.rw-pick .rw-chip{ font-size:.9rem; }' +
      '.rw-label{ display:block; font-weight:600; margin:.7rem 0 .25rem; }' +
      '.rw-save{ display:flex; gap:.55rem; align-items:flex-start; margin:1.1rem 0 0; padding:.8rem 0 0; border-top:1px dashed var(--line); font-size:.95rem; }' +
      '.rw-save input{ width:22px; height:22px; margin:.1rem 0 0; flex:none; }' +
      '.rw-where{ font-size:.9rem; color:var(--ink-soft); }' +
      '.rw-status{ font-size:.92rem; color:var(--credit); min-height:1.3em; }' +
      '@media (max-width:420px){ .rw{ padding:.85rem .8rem 1rem; } .rw-chip{ font-size:.93rem; padding:.45rem .75rem; } .rw-nav .rw-btn{ flex:1 1 auto; } .rw-nav .rw-spacer{ display:none; } }' +
      '@media (prefers-reduced-motion: reduce){ .rw-bar i{ transition:none; } }' +
      '@media print{ .rw-nav, .rw-save, .rw-where, .rw-status, .rw-bar, .rw-top{ display:none; } }';
    document.head.appendChild(s);
  }

  /* ---------------------------------------------------------------- drawing each screen */
  var S = blank(), host = null, box = null;

  function chip(group, id, label, on, quiet) {
    return '<button type="button" class="rw-chip' + (quiet ? ' is-quiet' : '') + '" data-g="' + group + '" data-v="' + id + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(label) + '</button>';
  }
  function head(step) {
    var n = STEPS.indexOf(step), total = STEPS.length - 1, pct = Math.round(n / total * 100);
    var label = step.t === 'results' ? 'Your results' : 'Step ' + (n + 1) + ' of ' + total;
    return '<div class="rw-top"><span>' + label + '</span>' + (step.t === 'stage' ? '<span>' + esc(stage(step.s).name) + '</span>' : step.t === 'hard' ? '<span>Hard times, in general (optional)</span>' : '') + '</div>' +
      '<div class="rw-bar" role="progressbar" aria-label="How far along you are" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>';
  }
  function nav(step) {
    var n = STEPS.indexOf(step), last = STEPS.length - 2;
    var h = '<div class="rw-nav">';
    if (n > 0) h += '<button type="button" class="rw-btn" data-act="back">← Back</button>';
    h += '<span class="rw-spacer"></span>';
    if (step.t === 'stage') h += '<button type="button" class="rw-btn is-link" data-act="skipstage">Skip this stage</button>';
    if (step.t === 'hard') h += '<button type="button" class="rw-btn is-link" data-act="skiphard">Skip to my results</button>';
    if (step.t !== 'results') h += '<button type="button" class="rw-btn is-go" data-act="next">' + (n === last ? 'See my results →' : n === 0 ? 'Start →' : 'Next →') + '</button>';
    return h + '</div>';
  }
  function screenTraits() {
    var h = '<h3 class="rw-h" tabindex="-1">What would you like to understand?</h3>' +
      '<p>Pick a trait or reaction you notice in yourself. You can pick several, or just explore. Then we’ll walk gently through the stages of your life, from the early years up to now, with a few tap questions each.</p>' +
      '<p class="rw-tip">This is self-reflection, not therapy or a diagnosis. It never asks for the details of anything painful, and you can skip any question.</p>' +
      '<p class="rw-heavy">' + HEAVY + '</p>' +
      '<div class="rw-q" role="group" aria-labelledby="rw-q-traits"><h4 id="rw-q-traits">I’d like to understand why…</h4><div class="rw-chips">';
    TRAITS.forEach(function (t) { h += chip('traits', t.id, t.label, S.traits.indexOf(t.id) > -1); });
    h += chip('traits', 'other', 'Something else', S.traits.indexOf('other') > -1) +
      chip('traits', 'explore', 'I’m not sure yet, just explore', S.traits.indexOf('explore') > -1, true) + '</div></div>' +
      '<div class="rw-other"' + (S.traits.indexOf('other') > -1 ? '' : ' hidden') + '><label class="rw-label no-bubble" for="rw-other">In a few words, what do you notice?</label>' +
      '<input class="rw-in" id="rw-other" type="text" maxlength="120" autocomplete="off" placeholder="For example: I get jealous fast" value="' + esc(S.other) + '"></div>';
    return h;
  }
  function screenStage(step) {
    var st = stage(step.s), wording = st.recent ? 5 : st.child ? 3 : 4;
    var h = '<h3 class="rw-h" tabindex="-1">' + esc(st.name) + (step.part === 2 ? ': who you were' : step.part === 1 ? ': what was going on' : '') + '</h3>' +
      '<p class="rw-ages">' + esc(cap(st.ages)) + '</p>' +
      '<p class="rw-bigq">The big question then: “' + esc(st.q) + '”</p>' +
      (st.tip && step.part !== 2 ? '<p class="rw-tip">' + esc(st.tip) + '</p>' : '') +
      '<p class="rw-heavy">' + HEAVY + '</p>';
    step.qs.forEach(function (key) {
      var q = Q[key], text = q[wording] || q[3], list = choices(key, st), cur = S.a[st.id][key], gid = 'rw-q-' + st.id + '-' + key;
      h += '<div class="rw-q" role="group" aria-labelledby="' + gid + '"><h4 id="' + gid + '">' + esc(text) + '</h4>' +
        (q[6] ? '<p class="rw-hint">' + esc(q[6]) + (q[2] ? '' : '') + '</p>' : (q[2] ? '<p class="rw-hint">Pick one, or skip.</p>' : '')) + '<div class="rw-chips">';
      list.forEach(function (c) {
        var on = q[2] ? cur === c[0] : cur.indexOf(c[0]) > -1;
        h += chip(st.id + '.' + key, c[0], c[1], on, c[0] === 'none' || c[0] === 'hard');
      });
      h += '</div></div>';
    });
    return h;
  }

  function answerGroup(id, q) {
    var gid = 'rw-q-h-' + id, h = '<div class="rw-q" role="group" aria-labelledby="' + gid + '"><h4 id="' + gid + '">' + esc(q) + '</h4><div class="rw-chips">';
    ANS.forEach(function (a) { h += chip('h.' + id, a[0], a[1], S.h[id] === a[0], a[0] === 'pass'); });
    return h + '</div></div>';
  }
  function screenHard(step) {
    var h;
    if (step.part === 1) {
      h = '<h3 class="rw-h" tabindex="-1">Hard times, in general: how it felt</h3>' +
        '<p>This part is optional. Some people call very hard experiences trauma. These questions only ask how it felt and how it shows up now, never what happened. Skip any of them.</p>' +
        '<p class="rw-heavy">' + HEAVY + '</p>';
      FELT.forEach(function (f) { h += answerGroup(f.id, f.q); });
      h += '<div class="rw-q" role="group" aria-labelledby="rw-q-h-when"><h4 id="rw-q-h-when">If any of these fit, roughly when? (optional)</h4><div class="rw-chips">';
      STAGES.forEach(function (st) { h += chip('h.when', st.id, st.name, S.h.when.indexOf(st.id) > -1); });
      return h + '</div></div>';
    }
    if (step.part === 2) {
      h = '<h3 class="rw-h" tabindex="-1">Hard times, in general: what helped</h3>' +
        '<p>Whatever was hard, something helped you get through. That counts.</p>';
      h += answerGroup('who', 'Was there someone you could go to? A grandparent, a teacher, a friend, a neighbor?');
      h += '<div class="rw-q" role="group" aria-labelledby="rw-q-h-helped"><h4 id="rw-q-h-helped">What helped you get through?</h4><p class="rw-hint">Tap any that fit.</p><div class="rw-chips">';
      HELPED.forEach(function (c) { h += chip('h.helped', c[0], c[1], S.h.helped.indexOf(c[0]) > -1); });
      return h + '</div></div>';
    }
    h = '<h3 class="rw-h" tabindex="-1">Hard times, in general: how it may show up now</h3>' +
      '<p>These are signs to notice, not a diagnosis. Many people recognize one or two.</p>' +
      '<p class="rw-heavy">' + HEAVY + '</p>';
    SIGNS.forEach(function (g) { h += answerGroup(g.id, g.q); });
    return h;
  }
  function hardResults() {
    var felt = FELT.filter(function (f) { return hYes(f.id); }), signs = SIGNS.filter(function (g) { return hYes(g.id); });
    var who = hYes('who'), helped = S.h.helped.map(function (id) { return find(HELPED, id)[1].toLowerCase(); });
    if (!felt.length && !signs.length && !who && !helped.length) return '';
    var h = '<div class="rw-card"><h4>Hard times, and how they may show up now</h4>';
    if (signs.length >= 3) h += '<p class="rw-heavy">These are common after hard times, and they make sense. Many people find it helps to talk them through with a trained counselor, on your own or with someone you trust. You’re not alone in this.</p>';
    if (who || helped.length) {
      h += '<h5>What helped you get through</h5>';
      if (who) h += '<p>You had someone you could go to. This is part of how you got through, and steady people are still worth leaning on.</p>';
      if (helped.length) h += '<p>' + esc(cap(and(helped))) + ' helped you get through. This is part of how you got through, and it can still help on hard days.</p>';
    }
    felt.forEach(function (f) {
      h += '<h5>' + esc(cap(f.phrase)) + '</h5><p>' + esc(f.grow) + ' ' + esc(f.then) + ' ' + esc(f.now) + '</p>' +
        '<p><strong>Notice:</strong> ' + esc(f.notice) + '</p><p><strong>Try:</strong> ' + esc(f.tryit) + '</p>' + (f.links.length ? linkHtml(f.links) : '');
    });
    var when = S.h.when.map(function (id) { return stage(id).in; });
    if (felt.length && when.length) h += '<p class="rw-tip">You said this was around your ' + esc(and(when)) + '. Look at that part of your timeline below for what else was going on.</p>';
    signs.forEach(function (g) {
      h += '<h5>' + esc(g.name) + '</h5><p>' + esc(g.text) + ' <strong>Try:</strong> ' + esc(g.tryit) + '</p>' + (g.links.length ? linkHtml(g.links) : '');
    });
    return h + '</div>';
  }
  function hardText() {
    var out = [], felt = FELT.filter(function (f) { return hYes(f.id); }), signs = SIGNS.filter(function (g) { return hYes(g.id); });
    var helped = S.h.helped.map(function (id) { return find(HELPED, id)[1].toLowerCase(); });
    if (!felt.length && !signs.length && !hYes('who') && !helped.length) return out;
    out.push('Hard times, and how they may show up now');
    if (hYes('who')) out.push('- I had someone I could go to. This is part of how I got through.');
    if (helped.length) out.push('- ' + cap(and(helped)) + ' helped me get through.');
    felt.forEach(function (f) { out.push('- ' + cap(f.phrase) + ': ' + f.grow + ' ' + f.then + ' ' + f.now + ' Notice: ' + f.notice + ' Try: ' + f.tryit); });
    signs.forEach(function (g) { out.push('- ' + g.name + ': ' + g.text + ' Try: ' + g.tryit); });
    if (signs.length >= 3) out.push('These are common after hard times, and they make sense. Many people find it helps to talk them through with a trained counselor, on your own or with someone you trust.');
    out.push('');
    return out;
  }

  function linkHtml(ids) {
    return '<p class="rw-links">' + ids.map(function (id) { var l = LINKS[id]; return '<a href="' + l[1] + '">' + esc(l[0]) + ' →</a>'; }).join('') + '</p>';
  }
  function traitCard(t, intro) {
    var r = rootsOf(t), h = '<div class="rw-card"><h4>' + esc(t.label) + '</h4>' + (intro ? '<p class="rw-tip">' + esc(intro) + '</p>' : '') +
      '<h5>Where it may have started</h5>';
    if (r.found) h += r.lines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('');
    else h += '<p>Your answers don’t point to one stage, and that’s okay. ' + esc(t.typical) + ' Ask yourself: how old do I feel when it happens?</p>';
    h += '<h5>It made sense then</h5><p>' + esc(t.protect) + ' It made sense then.</p>' +
      '<h5>What it may cost now</h5><p>' + esc(t.cost) + '</p>' +
      '<h5>How to notice it in the moment</h5><p>' + esc(t.notice) + '</p>' +
      '<h5>Try this week</h5><ul>' + t.tryit.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') +
      '<li>Words to try: <span class="rw-say">“' + esc(t.say) + '”</span></li>' +
      '<li>A new rule you might choose: instead of “' + esc(t.rule[0].replace(/\.$/, '')) + '”, try <strong>“' + esc(t.rule[1]) + '”</strong> ' +
      '<button type="button" class="rw-btn is-link" data-act="userule" data-old="' + esc(t.rule[0]) + '" data-new="' + esc(t.rule[1]) + '">Use this in My new rules</button></li></ul>' +
      linkHtml(t.links) + '</div>';
    return h;
  }
  function otherCard(text, pats) {
    return '<div class="rw-card"><h4>' + esc(text) + '</h4><h5>Where it may have started</h5>' +
      (pats.length ? '<p>Look at the patterns above and the timeline below. Which stage does this feel closest to? How old do you feel when it happens?</p>'
        : '<p>Look at the timeline below and ask: when does this feel like it started? How old do I feel when it happens?</p>') +
      '<h5>It made sense then</h5><p>Most habits started as a good answer to a real problem. Ask: what did this protect me from, back then?</p>' +
      '<h5>What it may cost now</h5><p>Ask: what does it cost me, or the people close to me, now?</p>' +
      '<h5>How to notice it in the moment</h5><p>A reaction that feels bigger than the moment, or an “always” or “never” in your head.</p>' +
      '<h5>Try this week</h5><ul><li>The next time it happens, once you’ve settled, run the one-minute lens check: Where did I learn this? How old does this feel? Is it true here, now? What would the adult me choose?</li>' +
      '<li>Write the old rule behind it, and one you’d choose instead, in My new rules below.</li></ul>' + linkHtml(['lenscheck', 'rulebook', 'knowyourself']) + '</div>';
  }
  function timeline() {
    var rows = [];
    STAGES.forEach(function (s) {
      if (!answered(s.id)) return;
      var a = S.a[s.id], bits = [];
      if (a.mood) bits.push(['Mood', a.mood === 'none' ? 'nothing stands out' : find(choices('mood', s), a.mood)[1].toLowerCase()]);
      [['roles', 'Roles', ROLES], ['changes', 'Changes', choices('changes', s)], ['praised', 'Praised for', PRAISED], ['trouble', 'Trouble for', TROUBLE], ['rules', 'Rules', RULES]].forEach(function (g) {
        var x = a[g[0]]; if (!x.length) return;
        bits.push([g[1], x.map(function (id) { var c = find(g[2], id); return c ? (c[0] === 'none' ? 'nothing stands out' : c[0] === 'hard' ? 'something hard (not named)' : g[0] === 'rules' ? c[1] : c[1].toLowerCase()) : ''; }).join(', ')]);
      });
      rows.push({ s: s, bits: bits });
    });
    return rows;
  }
  function screenResults() {
    var tids = S.traits.filter(function (x) { return trait(x); }), explore = S.traits.indexOf('explore') > -1, other = S.traits.indexOf('other') > -1 && S.other.trim();
    var pats = patterns(), anyAnswers = hardAnswered() || STAGES.some(function (s) { return answered(s.id); }), anyHard = STAGES.some(function (s) { return vals(s.id, 'changes').indexOf('hard') > -1; });
    var h = '<h3 class="rw-h" tabindex="-1">Where your traits may have started</h3>' +
      '<p>These are gentle guesses from your own answers, not facts about you. Keep what fits and leave the rest.</p>' +
      '<p class="rw-tip">' + NOBLAME + '</p>';
    if (anyHard) h += '<p class="rw-heavy">You marked that something hard happened. You don’t need to look at it here. ' + HEAVY + '</p>';
    if (!anyAnswers) h += '<p>You skipped the stage questions, and that’s fine. The cards below use what often lies behind each trait. You can go back any time and tap a few answers for a closer fit.</p>';
    if (pats.length) h += '<div class="rw-card"><h4>Patterns in your answers</h4><ul>' + pats.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div>';
    tids.forEach(function (id) { h += traitCard(trait(id)); });
    h += hardResults();
    if (other) h += otherCard(S.other.trim(), pats);
    if (explore || (!tids.length && !other)) {
      var sug = suggested();
      if (sug.length) sug.forEach(function (t, i) { h += traitCard(t, i === 0 ? 'Traits like this often grow from answers like yours. It may not fit you, and that’s okay.' : ''); });
      else if (!pats.length) h += '<div class="rw-card"><h4>A gentle way in</h4><p>Nothing strong stood out, which is common. Try the one-minute lens check the next time a reaction feels bigger than the moment, or write the rulebook from home.</p>' + linkHtml(['lenscheck', 'rulebook', 'knowyourself']) + '</div>';
    }
    h += '<p class="rw-tip">Not every trait is learned. Some of it is simply how you’re wired, and that isn’t something to fix. <a href="/know-yourself.html">Know your own wiring</a> helps you tell the two apart.</p>';
    var tl = timeline();
    if (tl.length) {
      h += '<h4 class="rw-sub">Your timeline</h4><ol class="rw-tl">' + tl.map(function (r) {
        return '<li><strong>' + esc(r.s.name) + ' (' + esc(r.s.ages) + ')</strong>' + r.bits.map(function (b) { return '<span>' + esc(b[0]) + ': ' + esc(b[1]) + '</span>'; }).join('') + '</li>';
      }).join('') + '</ol>';
    }
    var rules = chosenRules();
    h += '<div class="rw-card"><h4>My new rules</h4><p>Pick one old rule and rewrite it into one you choose. You can keep the old rule, too, if it still serves you.</p>' +
      (rules.length ? '<p class="rw-hint">Rules from your answers:</p><div class="rw-pick">' + rules.map(function (r) { return '<button type="button" class="rw-chip" data-act="pickrule" data-old="' + esc(r) + '">' + esc(r) + '</button>'; }).join('') + '</div>' : '') +
      '<label class="rw-label no-bubble" for="rw-old">The old rule</label><textarea id="rw-old" data-k="oldRule" rows="2" placeholder="For example: Rest is earned">' + esc(S.oldRule) + '</textarea>' +
      '<label class="rw-label no-bubble" for="rw-new">The rule I choose now</label><textarea id="rw-new" data-k="newRule" rows="2" placeholder="For example: Rest is part of the work">' + esc(S.newRule) + '</textarea></div>' +
      '<div class="rw-nav"><button type="button" class="rw-btn" data-act="back">← Back</button>' +
      '<button type="button" class="rw-btn" data-act="copy">Copy</button><button type="button" class="rw-btn" data-act="print">Print</button>' +
      '<button type="button" class="rw-btn" data-act="download">Save as text</button><button type="button" class="rw-btn" data-act="restart">Start over</button></div>' +
      '<p class="rw-heavy">' + HEAVY + '</p>';
    return h;
  }

  function render(focus) {
    var step = STEPS[S.step];
    var body = step.t === 'traits' ? screenTraits() : step.t === 'stage' ? screenStage(step) : step.t === 'hard' ? screenHard(step) : screenResults();
    box.querySelector('.rw-screen').innerHTML = head(step) + body + (step.t === 'results' ? '' : nav(step));
    if (focus) {
      var h = box.querySelector('.rw-h');
      if (h) { try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }
      var top = box.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.6) box.scrollIntoView({ behavior: stillMotion() ? 'auto' : 'smooth', block: 'start' });
    }
  }

  /* ---------------------------------------------------------------- saving, copying, printing */
  function keeping() { return get('localStorage', KEY_DEVICE) !== null; }
  function save() {
    var json = JSON.stringify(S);
    set('sessionStorage', KEY_TAB, json);
    if (keeping()) set('localStorage', KEY_DEVICE, json);
  }
  function say(msg) {
    var s = box.querySelector('.rw-status'); if (!s) return;
    s.textContent = msg; clearTimeout(s._t); s._t = setTimeout(function () { s.textContent = ''; }, 6000);
  }
  function asText() {
    var out = ['Roots & Wings: where my traits may have started', ''];
    var tids = S.traits.filter(function (x) { return trait(x); }), pats = patterns();
    if (pats.length) { out.push('Patterns in my answers'); pats.forEach(function (p) { out.push('- ' + p); }); out.push(''); }
    var cards = tids.map(trait);
    if (S.traits.indexOf('explore') > -1 || (!tids.length && !(S.traits.indexOf('other') > -1 && S.other.trim()))) cards = cards.concat(suggested());
    cards.forEach(function (t) {
      var r = rootsOf(t);
      out.push(t.label.toUpperCase());
      out.push('Where it may have started: ' + (r.found ? r.lines.join(' ') : t.typical));
      out.push('It made sense then: ' + t.protect);
      out.push('What it may cost now: ' + t.cost);
      out.push('How to notice it: ' + t.notice);
      out.push('Try this week:'); t.tryit.forEach(function (x) { out.push('- ' + x); });
      out.push('- Words to try: “' + t.say + '”');
      out.push('- A new rule: instead of “' + t.rule[0].replace(/\.$/, '') + '”, “' + t.rule[1] + '”');
      out.push('');
    });
    if (S.traits.indexOf('other') > -1 && S.other.trim()) {
      out.push(S.other.trim().toUpperCase());
      out.push('Ask: when did this start? How old do I feel when it happens? What did it protect me from back then? What does it cost now? What would the adult me choose?', '');
    }
    out = out.concat(hardText());
    var tl = timeline();
    if (tl.length) {
      out.push('My timeline');
      tl.forEach(function (r) { out.push(r.s.name + ' (' + r.s.ages + ')'); r.bits.forEach(function (b) { out.push('  ' + b[0] + ': ' + b[1]); }); });
      out.push('');
    }
    if (S.oldRule.trim() || S.newRule.trim()) {
      out.push('My new rules');
      out.push('The old rule: ' + (S.oldRule.trim() || '________'));
      out.push('The rule I choose now: ' + (S.newRule.trim() || '________'));
      out.push('');
    }
    out.push(NOBLAME);
    out.push('From “Where your lens came from”, Spread Love & Acceptance. This is self-reflection, not therapy or a diagnosis.');
    return out.join('\n');
  }
  function printIt() {
    var text = asText(), lines = text.split('\n');
    var html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Roots &amp; Wings</title>' +
      '<style>body{font:15px/1.5 Georgia,serif;color:#211D17;margin:2rem;max-width:42rem;}h1{font-size:1.35rem;}h2{font-size:1.05rem;margin:1.2rem 0 .2rem;}p{margin:.2rem 0;}.s{font-size:.88rem;color:#555;margin-top:1.2rem;}</style></head><body>' +
      '<h1>' + esc(lines[0]) + '</h1>';
    lines.slice(1).forEach(function (l) {
      if (!l.trim()) return;
      if (/^[A-Z0-9’'“” ,.!?-]{4,}$/.test(l) && l === l.toUpperCase()) html += '<h2>' + esc(l.charAt(0) + l.slice(1).toLowerCase()) + '</h2>';
      else if (/^(Patterns in my answers|My timeline|My new rules|Hard times, and how they may show up now)$/.test(l)) html += '<h2>' + esc(l) + '</h2>';
      else html += '<p>' + esc(l) + '</p>';
    });
    html += '</body></html>';
    var fr = document.createElement('iframe');
    fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(fr);
    var w = fr.contentWindow; w.document.open(); w.document.write(html); w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) { window.print(); } setTimeout(function () { fr.remove(); }, 1500); }, 60);
  }
  function copyIt(text) {
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;'; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove(); say(ok ? 'Copied. You can paste it into a note or a message.' : 'Copying didn’t work here. Try Save as text instead.');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { say('Copied. You can paste it into a note or a message.'); }, fallback);
    else fallback();
  }
  function download(text) {
    try {
      var url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })), a = document.createElement('a');
      a.href = url; a.download = 'roots-and-wings.txt'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      say('Saved as a text file on this device.');
    } catch (e) { say('Saving didn’t work here. Try Copy instead.'); }
  }

  /* ---------------------------------------------------------------- taps and keys */
  function toggle(btn) {
    var g = btn.getAttribute('data-g'), v = btn.getAttribute('data-v');
    if (g === 'traits') {
      var i = S.traits.indexOf(v);
      if (i > -1) S.traits.splice(i, 1); else S.traits.push(v);
      btn.setAttribute('aria-pressed', i > -1 ? 'false' : 'true');
      var o = box.querySelector('.rw-other');
      if (v === 'other' && o) { o.hidden = i > -1; if (i < 0) { var inp = o.querySelector('input'); if (inp) inp.focus(); } }
    } else if (g.indexOf('h.') === 0) {
      var hk = g.slice(2);
      if (hk === 'when' || hk === 'helped') { var hl = S.h[hk], hi = hl.indexOf(v); if (hi > -1) hl.splice(hi, 1); else hl.push(v); }
      else S.h[hk] = S.h[hk] === v ? '' : v;
      Array.prototype.forEach.call(btn.parentNode.querySelectorAll('.rw-chip'), function (b) {
        var bv = b.getAttribute('data-v'), x = S.h[hk];
        b.setAttribute('aria-pressed', (Array.isArray(x) ? x.indexOf(bv) > -1 : x === bv) ? 'true' : 'false');
      });
    } else {
      var p = g.split('.'), st = p[0], key = p[1], a = S.a[st];
      if (Q[key][2]) a.mood = a.mood === v ? '' : v;
      else {
        var list = a[key], j = list.indexOf(v);
        if (j > -1) list.splice(j, 1);
        else if (v === 'none') list.length = 0, list.push('none');
        else { var n = list.indexOf('none'); if (n > -1) list.splice(n, 1); list.push(v); }
      }
      Array.prototype.forEach.call(btn.parentNode.querySelectorAll('.rw-chip'), function (b) {
        var bv = b.getAttribute('data-v');
        b.setAttribute('aria-pressed', (Q[key][2] ? a.mood === bv : a[key].indexOf(bv) > -1) ? 'true' : 'false');
      });
    }
    save();
  }
  function go(n) { S.step = Math.max(0, Math.min(STEPS.length - 1, n)); save(); render(true); }

  function init() {
    host = document.querySelector('[data-roots]');
    if (!host) return;
    css();
    var saved = get('localStorage', KEY_DEVICE) || get('sessionStorage', KEY_TAB);
    try { S = clean(saved ? JSON.parse(saved) : null); } catch (e) { S = blank(); }
    host.innerHTML = '<div class="rw no-dive no-cheer no-bubble" data-no-bubble role="region" aria-label="Roots and Wings">' +
      '<div class="rw-screen"></div>' +
      '<label class="rw-save"><input type="checkbox" data-act="keep"> <span>Keep my answers on this device, so they’re here next time</span></label>' +
      '<p class="rw-where">Nothing you type or choose is sent anywhere. Your answers stay in this browser tab, and are gone when you close it, unless you tick the box. ' +
      '<button type="button" class="rw-btn is-link" data-act="erase">Erase my answers</button></p>' +
      '<p class="rw-status" role="status" aria-live="polite"></p></div>';
    box = host.firstChild;
    var keep = box.querySelector('[data-act="keep"]'); keep.checked = keeping();
    render(false);

    box.addEventListener('click', function (e) {
      var c = e.target.closest('.rw-chip[data-g]'); if (c) { toggle(c); return; }
      var b = e.target.closest('button[data-act]'); if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'next') go(S.step + 1);
      else if (act === 'back') go(S.step - 1);
      else if (act === 'skipstage') {
        var cur = STEPS[S.step].s, n = S.step; while (n < STEPS.length - 1 && STEPS[n].s === cur) n++; go(n);
      }
      else if (act === 'skiphard') go(STEPS.length - 1);
      else if (act === 'pickrule' || act === 'userule') {
        S.oldRule = b.getAttribute('data-old').replace(/^“|”$/g, '');
        if (act === 'userule') S.newRule = b.getAttribute('data-new');
        save();
        var o = box.querySelector('#rw-old'), nw = box.querySelector('#rw-new');
        if (o) o.value = S.oldRule; if (nw && act === 'userule') nw.value = S.newRule;
        if (act === 'userule') { say('Added to My new rules, below. Change the words so they sound like you.'); }
        else if (nw) nw.focus();
      }
      else if (act === 'copy') copyIt(asText());
      else if (act === 'print') printIt();
      else if (act === 'download') download(asText());
      else if (act === 'restart') {
        if (!isEmpty() && !window.confirm('Start over? This clears your answers.')) return;
        var k = keeping(); S = blank(); save(); if (!k) del('sessionStorage', KEY_TAB);
        render(true); say('Cleared. You can start fresh.');
      }
      else if (act === 'erase') {
        if (!isEmpty() && !window.confirm('Erase all your Roots & Wings answers from this tab and this device?')) return;
        del('sessionStorage', KEY_TAB); del('localStorage', KEY_DEVICE); S = blank(); keep.checked = false;
        render(true); say('Erased from this tab and this device.');
      }
    });
    box.addEventListener('input', function (e) {
      var t = e.target;
      if (t.id === 'rw-other') { S.other = t.value.slice(0, 120); save(); }
      else if (t.getAttribute('data-k')) { S[t.getAttribute('data-k')] = t.value.slice(0, 400); save(); }
    });
    keep.addEventListener('change', function () {
      if (keep.checked) { set('localStorage', KEY_DEVICE, JSON.stringify(S)); say('Kept on this device. Press Erase my answers to remove them.'); }
      else { del('localStorage', KEY_DEVICE); say('No longer kept on this device. They stay in this tab until you close it.'); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
