/* emo-data.js: the questions, patterns, steps and words behind "What am I feeling?" (/what-am-i-feeling.html).
   Plain data, no logic. emo-engine.js reads it to choose the next question, build the map, the picture and the plan.
   Nothing here is sent anywhere. It also loads in Node (module.exports) so the persona tests can run without a browser.

   Screens (D.screens), in the order they can appear:
     id, stage, type ('multi' | 'one' | 'slider' | 'text' | 'words' | 'probe' | 'counter'), q (the question), help,
     opts [{ id, t (label), f (factor it points to), w (weight), say (how it reads as a reason), x (exclusive) }],
     dom (the screening area a follow-up belongs to; the quick path follows up on the two busiest areas only),
     path ('thorough' = thorough path only), text (true = an optional short text box under the choices),
     when (the condition, read by emo-engine.js: { any: ['screen:opt', ...] } or a named rule).
   Factors (D.factors): one thing that might be contributing. kind sets its tag and keeps inside and outside causes in
     balance (outside, body, people, inner, needs, change). ctl is where it starts in "What's in your hands"
     (mine, others, cant). art is how the picture draws it. unsure says honestly what a few taps can't show.
   Probes (D.probes): the five overlooked patterns. Each one is a guess with a follow-up question and a check the
     other way (a counterexample). Weights add up to a score: 2 or more is a likely pattern, above 0 a possible one,
     and below that the person has set it aside. */
(function (root) {
  'use strict';
  var D = {};

  /* ------------------------------------------------------------------ feelings */
  // color: the hero color of the family's part of the picture, a suggestion only (people change it in the picture).
  // mood: how the feeling reads in the picture, each 0 to 1: turb (calm to turbulent), energy (slow to quick),
  //   open (closed in to open), weight (light to heavy). motif: which kind of painted shapes it brings.
  // shape / poem: the legend line, "The tall verticals and slow drips: the heaviness that keeps pouring down."
  // look: the same thing in a few words for the picture's description.   edge / edgeSay: kept from the earlier drawing.
  D.families = [
    { id: 'sad', t: 'Sad or low', words: ['down', 'disappointed', 'discouraged', 'grieving', 'heavy-hearted', 'hopeless'], color: '#2F6BFF', edge: 'droop', motif: 'drip',
      mood: { turb: 0.32, energy: 0.2, open: 0.3, weight: 0.88 }, shape: 'tall blue verticals and slow drips', poem: 'the heaviness that keeps pouring down, with one warm light still on', look: 'tall deep-blue verticals and slow drips, with one warm glow' },
    { id: 'anxious', t: 'Worried or anxious', words: ['nervous', 'on edge', 'uneasy', 'dread', 'insecure', 'panicky'], color: '#FFB400', edge: 'tremble', motif: 'shatter',
      mood: { turb: 0.88, energy: 0.82, open: 0.22, weight: 0.5 }, shape: 'dense crossing lines and sharp fragments', poem: 'the mind that will not stop checking and rechecking', look: 'dense crossing lines and sharp fragments in electric color' },
    { id: 'angry', t: 'Angry or irritated', words: ['annoyed', 'frustrated', 'resentful', 'impatient', 'fed up', 'bitter'], color: '#E8203A', edge: 'spiky', motif: 'slash',
      mood: { turb: 0.9, energy: 0.9, open: 0.35, weight: 0.62 }, shape: 'bold diagonal slashes of red and orange', poem: 'the irritation that keeps cutting in', look: 'bold diagonal red and orange slashes against deep cobalt' },
    { id: 'over', t: 'Overwhelmed', words: ['swamped', 'scattered', 'stretched thin', 'frozen', 'behind on everything'], color: '#7B3FF2', edge: 'rings', motif: 'shatter',
      mood: { turb: 0.82, energy: 0.62, open: 0.18, weight: 0.84 }, shape: 'layers piling on layers, with rings that overlap', poem: 'too much arriving all at once', look: 'layers piling on layers, with overlapping rings' },
    { id: 'numb', t: 'Numb or flat', words: ['blank', 'disconnected', 'empty', 'bored', 'going through the motions'], color: '#8E9AC8', edge: 'flat', motif: 'field',
      mood: { turb: 0.08, energy: 0.08, open: 0.25, weight: 0.5 }, shape: 'large, quiet fields of color with one bright thread', poem: 'the stillness where feeling went quiet, and the one thin line that is still awake', look: 'large quiet fields of color with one bright thread' },
    { id: 'lonely', t: 'Lonely', words: ['left out', 'misunderstood', 'unseen', 'homesick', 'isolated'], color: '#00B3A4', edge: 'drift', motif: 'void',
      mood: { turb: 0.28, energy: 0.25, open: 0.35, weight: 0.6 }, shape: 'a wide, open field with one small light far away', poem: 'all that space, and one small light at the edge of it', look: 'a wide open field with one small light far away' },
    { id: 'hurt', t: 'Hurt', words: ['let down', 'rejected', 'embarrassed', 'betrayed', 'taken for granted'], color: '#FF4F9A', edge: 'crack', motif: 'fracture',
      mood: { turb: 0.55, energy: 0.4, open: 0.35, weight: 0.7 }, shape: 'a rose-colored field split by a thin gold crack', poem: 'the place that was cut, and the gold that is already seeping into it', look: 'a rose and violet field split by a thin gold crack' },
    { id: 'guilt', t: 'Guilty or ashamed', words: ['regretful', 'not good enough', 'like a burden', 'exposed'], color: '#C21FB5', edge: 'dense', motif: 'weight',
      mood: { turb: 0.5, energy: 0.28, open: 0.12, weight: 0.9 }, shape: 'dense, pressing shapes that darken toward the middle', poem: 'the weight you keep pressing on yourself, with one ember underneath', look: 'dense plum and crimson shapes pressing in, with one ember at the middle' },
    { id: 'tired', t: 'Worn out', words: ['drained', 'burned out', 'foggy', 'sleepy', 'running on fumes'], color: '#38B6FF', edge: 'soft', motif: 'wash',
      mood: { turb: 0.15, energy: 0.08, open: 0.4, weight: 0.72 }, shape: 'wide, sagging washes of blue and lavender', poem: 'the tiredness that sits under everything', look: 'wide sagging washes of blue, lavender and pink' },
    { id: 'restless', t: 'Restless', words: ['antsy', 'keyed up', 'can’t settle', 'jittery'], color: '#FF6A13', edge: 'scatter', motif: 'burst',
      mood: { turb: 0.72, energy: 0.88, open: 0.6, weight: 0.18 }, shape: 'scattered sparks and quick, jittery strokes', poem: 'the energy with nowhere to land yet', look: 'scattered sparks and quick strokes of orange, yellow and turquoise' },
    { id: 'okay', t: 'Okay or calm', words: ['content', 'relieved', 'grateful', 'hopeful', 'peaceful'], color: '#2BC36B', edge: 'glow', motif: 'wash',
      mood: { turb: 0.1, energy: 0.4, open: 0.85, weight: 0.14 }, shape: 'wide, glowing washes that run from cool to warm', poem: 'the steadier ground, and a little light on it', look: 'wide glowing washes that run from cool blue to warm peach' }
  ];
  D.families.forEach(function (f) { f.edgeSay = f.shape; });
  // when "Okay or calm" comes with real lift (strong, or words like hopeful and grateful), the picture bursts into color instead
  D.joy = { id: 'okay', shape: 'bursting rings and confetti-like petals of warm color', poem: 'the lift of something good', look: 'bursting rings and confetti-like petals in warm yellow, pink and turquoise',
    mood: { turb: 0.3, energy: 0.85, open: 0.95, weight: 0.08 }, words: ['grateful', 'hopeful', 'content'] };
  D.cantName = { id: 'cant', t: 'I can’t name it', color: '#9B8CFF', motif: 'mist', mood: { turb: 0.35, energy: 0.3, open: 0.5, weight: 0.45 },
    shape: 'soft, overlapping veils with a dotted edge', poem: 'a feeling that has no name yet, and does not need one', look: 'soft overlapping veils of pearl, lilac and aqua' };

  /* ------------------------------------------------------------------ stages */
  D.stages = [
    { id: 'now', t: 'Right now', guide: 'Let’s start with what’s here right now. One question at a time. Tap what fits. Mixed feelings are normal.' },
    { id: 'days', t: 'Around your days', guide: 'Now a quick look around your days. Small things count as much as big ones. Tap any that apply, or skip.' },
    { id: 'deeper', t: 'A little deeper', guide: 'A few follow-ups on what you picked, so the picture fits you better.' },
    { id: 'probes', t: 'What you might not have considered', guide: 'Here are a few patterns people often miss. Each one is a guess to check, never an answer. You decide if it fits.' },
    { id: 'wish', t: 'What would help', guide: 'Last question. Then I’ll show you what I’m hearing, so you can check it.' }
  ];

  /* ------------------------------------------------------------------ the screening areas (for "Still unknown") */
  D.areas = {
    s_work: 'work, money and responsibilities', s_people: 'the people in your life', s_small: 'small things and your surroundings',
    s_body2: 'your body and energy', s_mind: 'thoughts and expectations', s_needs: 'needs and what matters to you',
    s_change: 'changes and not knowing', s_good: 'what’s going well'
  };
  D.areaShort = { work: 'work or school', people: 'someone in your life', home: 'home', money: 'money', body: 'your health or body', change: 'a change or something you’re waiting on', other: 'something else' };

  /* ------------------------------------------------------------------ the screens */
  D.screens = [
    // ---- right now
    { id: 's_feel', stage: 'now', type: 'multi', q: 'What’s here right now? Tap any that fit, even if they don’t seem to go together.',
      help: 'Pick as many as you like. “I can’t name it” is a real answer too.', opts: 'families' },
    { id: 's_words', stage: 'now', type: 'words', q: 'Are any of these words closer to it?',
      help: 'Optional. A more exact word can take a little of the heat out of a feeling. Skip if none fit.', when: 'hasFamily' },
    { id: 's_int', stage: 'now', type: 'slider', q: 'How strong is it right now?', lo: 'Barely there', hi: 'As strong as it gets', def: 5 },
    { id: 's_dur', stage: 'now', type: 'one', q: 'How long has it been like this?', opts: [
      { id: 'today', t: 'Just today', say: 'just today', line: 'It started today.' }, { id: 'days', t: 'A few days', say: 'for a few days', line: 'It’s been like this for a few days.' },
      { id: 'weeks', t: 'A couple of weeks', say: 'for a couple of weeks', line: 'It’s been like this for a couple of weeks.' }, { id: 'month', t: 'A month or more', say: 'for a month or more', line: 'It’s been like this for a month or more.' },
      { id: 'comes', t: 'It comes and goes', say: 'on and off', line: 'It comes and goes.' }] },
    { id: 's_body', stage: 'now', type: 'multi', path: 'thorough', q: 'Where do you notice it in your body, if anywhere?', opts: [
      { id: 'chest', t: 'Tight chest or a fast heartbeat', say: 'a tight chest or a fast heartbeat' }, { id: 'stomach', t: 'A knot in my stomach', say: 'a knot in your stomach' }, { id: 'jaw', t: 'Tense jaw, neck or shoulders', say: 'a tense jaw, neck or shoulders' },
      { id: 'head', t: 'Headache or a foggy head', say: 'a headache or a foggy head' }, { id: 'heavy', t: 'A heavy, slow body', say: 'a heavy, slow body' }, { id: 'buzz', t: 'Buzzing or jittery', say: 'buzzing or jitters' },
      { id: 'tears', t: 'Close to tears', say: 'being close to tears' }, { id: 'none', t: 'Nowhere I can tell', x: true }] },
    { id: 's_about', stage: 'now', type: 'one', text: true, q: 'What do you think it’s mostly about?', ph: 'In a few words, if you like (optional)', opts: [
      { id: 'one', t: 'One thing or one person' }, { id: 'many', t: 'Lots of things at once' }, { id: 'nothing', t: 'Nothing I can point to' }] },
    { id: 's_area', stage: 'now', type: 'one', q: 'Which part of life is that in?', when: { any: ['s_about:one'] }, opts: [
      { id: 'work', t: 'Work or school' }, { id: 'people', t: 'Someone in my life' }, { id: 'home', t: 'Home' }, { id: 'money', t: 'Money' },
      { id: 'body', t: 'My health or body' }, { id: 'change', t: 'A change, or something I’m waiting on' }, { id: 'other', t: 'Something else' }] },

    // ---- around your days (every path sees all eight: this is the broad sweep)
    { id: 's_work', stage: 'days', type: 'multi', q: 'Any of these part of your life lately? Work, money and responsibilities.', help: 'Small or big, they all count.', opts: [
      { id: 'load', t: 'A lot on my plate (work, school or home)', f: 'workload' }, { id: 'meaning', t: 'Work that feels pointless or unseen', f: 'meaning' },
      { id: 'money', t: 'Money worries', f: 'money' }, { id: 'care', t: 'Caring for someone (a child, a parent, a partner, a friend)', f: 'caregiving' },
      { id: 'roles', t: 'Too many roles at once', f: 'roles' }, { id: 'insecure', t: 'My job or income feels uncertain', f: 'jobinsecurity' },
      { id: 'none', t: 'None of these', x: true }] },
    { id: 's_people', stage: 'days', type: 'multi', q: 'And with people?', opts: [
      { id: 'tension', t: 'Tension or distance with someone close', f: 'tension' }, { id: 'unheard', t: 'Not feeling heard or appreciated', f: 'unheard' },
      { id: 'lonely', t: 'Lonely or left out', f: 'lonely' }, { id: 'oblig', t: 'Too many plans or social obligations', f: 'obligations' },
      { id: 'crisis', t: 'Someone else’s hard time on my mind', f: 'othercrisis' }, { id: 'unfair', t: 'Being treated unfairly (at work, school or anywhere)', f: 'unfair' },
      { id: 'fine', t: 'Things with people feel mostly fine', g: 'peoplefine', x: true }] },
    { id: 's_small', stage: 'days', type: 'multi', q: 'Small things add up. Any of these lately?', help: 'Each one you pick becomes a thread in your picture.', opts: [
      { id: 'noise', t: 'Noise', f: 'irritants', th: 1 }, { id: 'interrupt', t: 'Interruptions', f: 'irritants', th: 1 }, { id: 'clutter', t: 'Clutter or mess', f: 'irritants', th: 1 },
      { id: 'waiting', t: 'Waiting, delays or lines', f: 'irritants', th: 1 }, { id: 'tech', t: 'Tech that won’t work', f: 'irritants', th: 1 },
      { id: 'routine', t: 'A change in my routine', f: 'irritants', th: 1, say: 'a change in your routine' }, { id: 'rushed', t: 'Always rushing', f: 'irritants', th: 1 },
      { id: 'sensory', t: 'Too bright, crowded, scratchy or smelly', f: 'sensory' }, { id: 'pings', t: 'Constant messages and alerts', f: 'digital' },
      { id: 'chores', t: 'Home tasks or repairs piling up', f: 'home' }, { id: 'none', t: 'None of these', x: true }] },
    { id: 's_body2', stage: 'days', type: 'multi', q: 'How’s your body doing?', opts: [
      { id: 'sleep', t: 'Short or broken sleep', f: 'sleep' }, { id: 'energy', t: 'Low energy', f: 'energy' },
      { id: 'hungry', t: 'Skipped meals, or running on empty', f: 'hunger', say: 'skipped meals' }, { id: 'pain', t: 'Pain or feeling unwell', f: 'pain' },
      { id: 'overstim', t: 'Too much going on around me', f: 'sensory', say: 'too much going on around you' }, { id: 'temp', t: 'Too hot, cold, dark or bright', f: 'sensory' },
      { id: 'norest', t: 'No time to recover between things', f: 'recovery' }, { id: 'still', t: 'Less movement or time outside than usual', f: 'movement' },
      { id: 'health', t: 'A change in health, medicine or cycle', f: 'healthchange' }, { id: 'fine', t: 'My body feels mostly okay', g: 'bodyfine', x: true }] },
    { id: 's_mind', stage: 'days', type: 'multi', q: 'Any thoughts like these on repeat?', opts: [
      { id: 'replay', t: 'Replaying something that happened', f: 'replay' }, { id: 'ahead', t: 'Worrying about what’s next', f: 'worryahead' },
      { id: 'bar', t: 'Expecting more of myself than I have room for', f: 'highbar', say: 'expecting more of yourself than you have room for' }, { id: 'guess', t: 'Guessing what someone thinks of me', f: 'mindread', say: 'guessing what someone thinks of you' },
      { id: 'compare', t: 'Comparing myself with others', f: 'comparing', say: 'comparing yourself with others' }, { id: 'should', t: 'Thinking it “should” be easier', f: 'highbar' },
      { id: 'harm', t: 'Thoughts of hurting myself or not wanting to be here', harm: true }, { id: 'none', t: 'None stand out', x: true }] },
    { id: 's_needs', stage: 'days', type: 'multi', q: 'What have you been going without?', help: 'Pick any. These are ordinary human needs.', opts: [
      { id: 'rest', t: 'Rest', f: 'unmet', need: 'rest' }, { id: 'alone', t: 'Time to myself', f: 'unmet', need: 'time to yourself' },
      { id: 'connect', t: 'Connection', f: 'unmet', need: 'connection' }, { id: 'appreciate', t: 'Appreciation', f: 'unmet', need: 'appreciation' },
      { id: 'control', t: 'A say in my own day', f: 'unmet', need: 'a say in your own day' }, { id: 'values', t: 'Time for what matters to me', f: 'unmet', need: 'time for what matters to you' },
      { id: 'progress', t: 'A sense of progress', f: 'unmet', need: 'a sense of progress' }, { id: 'fun', t: 'Fun or play', f: 'unmet', need: 'fun' },
      { id: 'fair', t: 'Fairness', f: 'unmet', need: 'fairness' }, { id: 'torn', t: 'I feel torn between two things I want', f: 'torn' },
      { id: 'none', t: 'Nothing I can think of', x: true }] },
    { id: 's_change', stage: 'days', type: 'multi', q: 'Is anything changing, or up in the air?', opts: [
      { id: 'big', t: 'A big change lately (a move, a new job, a loss, a new baby, a breakup, graduating)', f: 'change' },
      { id: 'waiting', t: 'Waiting on news, or not knowing what’s next', f: 'waiting' }, { id: 'date', t: 'A hard date or time of year', f: 'anniversary' },
      { id: 'before', t: 'This has happened before', f: 'pattern' }, { id: 'past', t: 'Something from the past came up', f: 'pattern' },
      { id: 'none', t: 'Nothing like that', x: true }] },
    { id: 's_good', stage: 'days', type: 'multi', text: true, q: 'What’s going okay, even a little?', help: 'These count as much as the hard parts.', ph: 'Want to name one? (optional)', opts: [
      { id: 'people', t: 'Someone who helps or gets me', g: 'people' }, { id: 'restore', t: 'Something that restores me (a walk, music, a hobby, a pet)', g: 'restore' },
      { id: 'going', t: 'Something going well', g: 'going' }, { id: 'sleep', t: 'Some good nights of sleep', g: 'sleep' },
      { id: 'place', t: 'A place that feels calm', g: 'place' }, { id: 'laugh', t: 'Something that made me laugh lately', g: 'laugh' },
      { id: 'hard', t: 'Hard to think of anything right now', x: true }] },

    // ---- a little deeper (only where answers point; the quick path follows the two busiest areas)
    { id: 'd_load', stage: 'deeper', dom: 's_work', type: 'slider', q: 'How full is your plate compared with what you can carry?', lo: 'Room to spare', hi: 'Overflowing', def: 5,
      when: { any: ['s_work:load', 's_work:roles', 's_work:care', 's_small:chores'] } },
    { id: 'd_care', stage: 'deeper', dom: 's_work', type: 'one', q: 'Do you get regular time off from caring?', when: { any: ['s_work:care'] }, opts: [
      { id: 'yes', t: 'Yes', f: 'caregiving', w: -0.5, say: 'You get regular time off from caring.' }, { id: 'some', t: 'Sometimes', f: 'caregiving', w: 0.5, say: 'You get time off from caring only sometimes.' },
      { id: 'rarely', t: 'Rarely', f: 'caregiving', w: 1.5, say: 'You rarely get time off from caring.' }, { id: 'never', t: 'Never', f: 'caregiving', w: 2, say: 'You never get time off from caring.' }] },
    { id: 'd_money', stage: 'deeper', dom: 's_work', type: 'one', q: 'Is it one bill or deadline, or a squeeze that keeps going?', when: { any: ['s_work:money'] }, opts: [
      { id: 'one', t: 'One bill or deadline', f: 'money', w: 0.5, say: 'The money worry is one bill or deadline.' }, { id: 'ongoing', t: 'An ongoing squeeze', f: 'money', w: 1.5, say: 'Money has been an ongoing squeeze.' },
      { id: 'both', t: 'Both', f: 'money', w: 2, say: 'There’s a deadline and an ongoing squeeze.' }] },
    { id: 'd_build', stage: 'deeper', dom: 's_people', type: 'one', q: 'With the person or people on your mind, is it about one moment, or has it been building?', when: { any: ['s_people:tension', 's_people:unheard'] }, opts: [
      { id: 'moment', t: 'One moment', f: 'tension', w: 0.5, say: 'It’s about one moment.' }, { id: 'building', t: 'It’s been building', f: 'tension', w: 1.5, say: 'It’s been building for a while.' }] },
    { id: 'd_said', stage: 'deeper', dom: 's_people', type: 'one', q: 'Have you been able to say what you need?', when: { any: ['s_people:tension', 's_people:unheard'] }, opts: [
      { id: 'yes', t: 'Yes, and it went okay', f: 'unheard', w: -0.5, say: 'You said what you need, and it went okay.' },
      { id: 'tried', t: 'I tried, and it didn’t land', f: 'unheard', w: 1, say: 'You tried to say what you need, and it didn’t land.' },
      { id: 'notyet', t: 'Not yet', f: 'unheard', w: 0.5, say: 'You haven’t said what you need yet.' },
      { id: 'unsure', t: 'I’m not sure what I need yet', say: 'You’re not sure yet what you need from them.' }] },
    { id: 'd_unfair', stage: 'deeper', dom: 's_people', type: 'one', q: 'Is the unfair treatment still happening?', when: { any: ['s_people:unfair'] },
      help: 'Being treated unfairly is a real cause of stress. It comes from outside you, and it isn’t yours to fix by thinking differently.', opts: [
      { id: 'yes', t: 'Yes, it’s ongoing', f: 'unfair', w: 2, say: 'It’s still happening.' }, { id: 'once', t: 'It happened once', f: 'unfair', w: 0.5, say: 'It happened once.' }] },
    { id: 'd_lonely', stage: 'deeper', dom: 's_people', type: 'one', path: 'thorough', q: 'When did you last spend time with someone you feel at ease with?', when: { any: ['s_people:lonely', 's_needs:connect'] }, opts: [
      { id: 'week', t: 'This week', f: 'lonely', w: -0.5, say: 'You saw someone you feel at ease with this week.' }, { id: 'month', t: 'This month', f: 'lonely', w: 0.5, say: 'It’s been a few weeks since you saw someone you feel at ease with.' },
      { id: 'longer', t: 'Longer ago than that', f: 'lonely', w: 1.5, say: 'It’s been more than a month since you saw someone you feel at ease with.' }] },
    { id: 'd_small', stage: 'deeper', dom: 's_small', type: 'one', q: 'Roughly how many small things got in your way today?', when: 'anyThread', opts: [
      { id: 'zero', t: 'None today', f: 'irritants', w: -1, say: 'Nothing small got in your way today.' }, { id: 'few', t: '1 or 2', f: 'irritants', w: 0, say: 'One or two small things got in your way today.', n: 1 },
      { id: 'some', t: '3 to 5', f: 'irritants', w: 1.5, say: 'Three to five small things got in your way today.', n: 3 }, { id: 'lots', t: '6 or more', f: 'irritants', w: 2.5, say: 'Six or more small things got in your way today.', n: 6 }] },
    { id: 'd_sensory', stage: 'deeper', dom: 's_small', type: 'one', q: 'Where you spend most of your day, how are the noise, light and crowding?', when: { any: ['s_small:sensory', 's_small:noise', 's_body2:overstim', 's_body2:temp'] }, opts: [
      { id: 'fine', t: 'Fine', f: 'sensory', w: -0.5, say: 'The noise, light and crowding where you spend your day are fine.' }, { id: 'bit', t: 'A bit much', f: 'sensory', w: 1, say: 'Where you spend your day is a bit much for noise, light or crowding.' },
      { id: 'lot', t: 'A lot', f: 'sensory', w: 2, say: 'Where you spend your day is a lot: noise, light or crowding.' }] },
    { id: 'd_digital', stage: 'deeper', dom: 's_small', type: 'one', path: 'thorough', q: 'How often do messages or alerts pull you away from what you’re doing?', when: { any: ['s_small:pings'] }, opts: [
      { id: 'rarely', t: 'Rarely', f: 'digital', w: -1, say: 'Alerts rarely pull you away.' }, { id: 'sometimes', t: 'Sometimes', f: 'digital', w: 0, say: 'Alerts pull you away sometimes.' },
      { id: 'often', t: 'Often', f: 'digital', w: 1, say: 'Alerts often pull you away.' }, { id: 'always', t: 'All the time', f: 'digital', w: 2, say: 'Alerts pull you away all the time.' }] },
    { id: 'd_sleep', stage: 'deeper', dom: 's_body2', type: 'one', q: 'How many of the last 7 nights were short or broken?', when: { any: ['s_body2:sleep'] }, opts: [
      { id: 'n1', t: '0 or 1', f: 'sleep', w: -1, say: 'Only one night or none this week was short.' }, { id: 'n3', t: '2 or 3', f: 'sleep', w: 0.5, say: '2 or 3 of the last 7 nights were short or broken.' },
      { id: 'n5', t: '4 or 5', f: 'sleep', w: 1.5, say: '4 or 5 of the last 7 nights were short or broken.' }, { id: 'n7', t: '6 or 7', f: 'sleep', w: 2, say: '6 or 7 of the last 7 nights were short or broken.' }] },
    { id: 'd_energy', stage: 'deeper', dom: 's_body2', type: 'slider', q: 'How much energy do you have today?', lo: 'Running on empty', hi: 'Plenty', def: 5,
      when: { any: ['s_body2:energy', 's_body2:sleep', 's_body2:norest', 's_body2:hungry', 's_body2:pain'] } },
    { id: 'd_food', stage: 'deeper', dom: 's_body2', type: 'one', q: 'When did you last eat a proper meal?', when: { any: ['s_body2:hungry'] }, opts: [
      { id: 'recent', t: 'In the last few hours', f: 'hunger', w: -1, say: 'You ate a proper meal in the last few hours.' }, { id: 'morning', t: 'This morning', f: 'hunger', w: 0.5, say: 'Your last proper meal was this morning.' },
      { id: 'yesterday', t: 'Yesterday', f: 'hunger', w: 2, say: 'Your last proper meal was yesterday.' }, { id: 'cant', t: 'I can’t remember', f: 'hunger', w: 1.5, say: 'You can’t remember your last proper meal.' }] },
    { id: 'd_recover', stage: 'deeper', dom: 's_body2', type: 'one', q: 'When did you last have time that was fully yours?', when: { any: ['s_body2:norest', 's_work:load', 's_work:care', 's_needs:alone', 's_needs:rest'] }, opts: [
      { id: 'today', t: 'Today', f: 'recovery', w: -1, say: 'You had time that was fully yours today.' }, { id: 'week', t: 'This week', f: 'recovery', w: 0, say: 'You had time that was fully yours this week.' },
      { id: 'month', t: 'This month', f: 'recovery', w: 1, say: 'Your last time that was fully yours was weeks ago.' }, { id: 'cant', t: 'I can’t remember', f: 'recovery', w: 2, say: 'You can’t remember the last time that was fully yours.' }] },
    { id: 'd_thought', stage: 'deeper', dom: 's_mind', type: 'text', q: 'What’s the thought that keeps coming back? A few words is plenty.', help: 'Optional. It stays on this device.', ph: 'For example: “I should have said something.”',
      when: { any: ['s_mind:replay', 's_mind:ahead', 's_mind:bar', 's_mind:guess', 's_mind:compare', 's_mind:should'] } },
    { id: 'd_change', stage: 'deeper', dom: 's_change', type: 'one', q: 'How long ago was the big change?', when: { any: ['s_change:big'] }, opts: [
      { id: 'week', t: 'In the last week or two', f: 'change', w: 1.5, say: 'The big change was in the last week or two.' }, { id: 'month', t: 'In the last month or two', f: 'change', w: 1.5, say: 'The big change was in the last month or two.' },
      { id: 'months', t: 'A few months ago', f: 'change', w: 1, say: 'The big change was a few months ago.' }, { id: 'longer', t: 'Longer ago', f: 'change', w: 0.5, say: 'The big change was a while ago.' }] },
    { id: 'd_wait', stage: 'deeper', dom: 's_change', type: 'one', q: 'Is there anything you can do while you wait?', when: { any: ['s_change:waiting'] }, opts: [
      { id: 'yes', t: 'Yes, a few things', f: 'waiting', w: 0, ctl: 'mine', say: 'There are a few things you can do while you wait.' }, { id: 'little', t: 'A little', f: 'waiting', w: 0.5, say: 'There’s a little you can do while you wait.' },
      { id: 'no', t: 'No, it’s out of my hands', f: 'waiting', w: 1, ctl: 'cant', say: 'The waiting is out of your hands.' }] },
    { id: 'd_before', stage: 'deeper', dom: 's_change', type: 'text', path: 'thorough', q: 'When this happened before, what helped, even a little?', help: 'Optional. What helped once often helps again.', ph: 'For example: “A long walk and telling my sister.”',
      when: { any: ['s_change:before'] } },
    { id: 'd_need', stage: 'deeper', dom: 's_needs', type: 'one', q: 'Of the things you’ve been going without, which matters most right now?', when: 'twoNeeds', opts: 'chosenNeeds' },

    // ---- the five overlooked patterns (the quick path asks the two that answers point to most)
    { id: 'p_acc', stage: 'probes', type: 'probe', probe: 'acc' }, { id: 'c_acc', stage: 'probes', type: 'counter', probe: 'acc' },
    { id: 'p_spill', stage: 'probes', type: 'probe', probe: 'spill' }, { id: 'c_spill', stage: 'probes', type: 'counter', probe: 'spill' },
    { id: 'p_deplete', stage: 'probes', type: 'probe', probe: 'deplete' }, { id: 'c_deplete', stage: 'probes', type: 'counter', probe: 'deplete' },
    { id: 'p_unmet', stage: 'probes', type: 'probe', probe: 'unmet' }, { id: 'c_unmet', stage: 'probes', type: 'counter', probe: 'unmet' },
    { id: 'p_interp', stage: 'probes', type: 'probe', probe: 'interp' }, { id: 'c_interp', stage: 'probes', type: 'counter', probe: 'interp' },

    // ---- what would help
    { id: 's_wish', stage: 'wish', type: 'multi', text: true, q: 'If this felt even a little lighter, what would be different?', help: 'This becomes the opening in your picture.', ph: 'In your own words (optional)', opts: [
      { id: 'rest', t: 'More rest' }, { id: 'heard', t: 'Feeling heard' }, { id: 'less', t: 'Less on my plate' }, { id: 'quiet', t: 'Some quiet' },
      { id: 'close', t: 'Feeling close to someone' }, { id: 'clear', t: 'Knowing what to do next' }, { id: 'capable', t: 'Feeling capable again' },
      { id: 'fun', t: 'Some fun' }, { id: 'fair', t: 'Things feeling fair' }, { id: 'space', t: 'Room to breathe' }] }
  ];

  /* ------------------------------------------------------------------ the five patterns */
  // {list} etc. are filled in by emo-engine.js from this person's own answers
  D.probes = {
    acc: { name: 'The accumulation effect', plain: 'Lots of small things adding up', members: ['irritants', 'sensory', 'digital', 'home'],
      hyp: 'You mentioned {n} small things, like {list}. Small hassles can pile up quietly over a day or a week, until the last one feels like the whole problem.',
      q: 'If everything else today had gone smoothly, how big would this feel?', opts: [
        { id: 'much', t: 'Much smaller', w: 2, say: 'You said it would feel much smaller if the rest of the day had gone smoothly.' },
        { id: 'bit', t: 'A bit smaller', w: 1, say: 'You said it would feel a bit smaller if the rest of the day had gone smoothly.' },
        { id: 'same', t: 'About the same', w: -1.5, say: 'You said it would feel about the same even on a smooth day.' }],
      cq: 'One check the other way. Have you had days with just as many small hassles when you felt fine?', copts: [
        { id: 'often', t: 'Yes, often', w: -1.5, say: 'You’ve often had days with as many hassles and felt fine.' },
        { id: 'some', t: 'Sometimes', w: -0.5, say: 'Some days with as many hassles have felt fine.' },
        { id: 'no', t: 'Not really', w: 0.5, say: 'Days with this many hassles usually don’t feel fine.' }],
      unsure: 'Small things are easy to undercount, and also easy to blame. A few days of noticing them would show more.' },
    spill: { name: 'The spillover effect', plain: 'Stress from one part of life landing in another', members: [],
      hyp: 'You said it’s mostly about {area}. You also mentioned {others}. Stress from one part of life often lands in another, like being short with someone at home after a draining day at work.',
      hyp2: 'You mentioned things in a few parts of life: {others}. Stress from one part of life often lands in another, like being short with someone at home after a draining day at work.',
      q: 'Did some of this feeling come with you from somewhere else?', opts: [
        { id: 'yes', t: 'I think some of it did', w: 2, say: 'You think some of the feeling came with you from {others}.' },
        { id: 'maybe', t: 'Maybe a little', w: 1, say: 'You think a little of it may have come from {others}.' },
        { id: 'no', t: 'No, it started right where I feel it', w: -1.5, say: 'You said it started right where you feel it.' }],
      cq: 'On a day when {otherOne} goes well, do you still feel this way?', cq2: 'On a day when everything else goes well, do you still feel this way about the main thing?', copts: [
        { id: 'same', t: 'Yes, just the same', w: -1.5, say: 'You feel the same even when the rest goes well.' },
        { id: 'less', t: 'A bit less', w: 0.5, say: 'You feel it a bit less when the rest goes well.' },
        { id: 'much', t: 'No, much less', w: 1.5, say: 'You feel it much less when the rest goes well.' }],
      unsure: 'Spillover is hard to see from the inside. Noticing when the feeling starts (after work, after a call) would show more.' },
    interp: { name: 'The interpretation gap', plain: 'The story added on top of what happened', members: ['replay', 'mindread', 'highbar', 'comparing', 'worryahead'],
      hyp: 'You mentioned {list}. Minds fill gaps fast. Sometimes the story we add about why something happened, or what it says about us, weighs more than the event itself. Sometimes the story is right, and that counts too.',
      q: 'Think of the main thing. How much of it is what you know for sure, and how much is your best guess about why?', opts: [
        { id: 'know', t: 'Mostly what I know for sure', w: -1, say: 'You said it’s mostly what you know for sure.' },
        { id: 'mix', t: 'A mix of both', w: 1, say: 'You said it’s a mix of what you know and what you’re guessing.' },
        { id: 'guess', t: 'Mostly my best guess', w: 2, say: 'You said it’s mostly your best guess about why.' }],
      cq: 'Is there another explanation that fits the same facts?', copts: [
        { id: 'maybe', t: 'Yes, maybe', w: 1, say: 'You can see another explanation that might fit the same facts.' },
        { id: 'no', t: 'No, I’m fairly sure of my read', w: -1.5, say: 'You’re fairly sure of your read of what happened.' }],
      unsure: 'Sometimes your read is exactly right, and the hard part is simply what happened. Only you can weigh that.' },
    deplete: { name: 'The depleted-capacity effect', plain: 'Low reserves making everything heavier', members: ['sleep', 'energy', 'hunger', 'recovery', 'pain'],
      hyp: 'You mentioned {list}. When reserves run low, ordinary things feel heavier and feelings run hotter. That doesn’t make the feeling any less real.',
      q: 'If you’d slept well, eaten, and had an hour to yourself, how strong do you think this would feel?', slider: true, lo: 'Barely there', hi: 'As strong as it gets',
      cq: 'Has it felt just as strong on days when you were rested?', copts: [
        { id: 'yes', t: 'Yes, just as strong', w: -1.5, say: 'It has felt just as strong on rested days.' },
        { id: 'some', t: 'Sometimes', w: -0.5, say: 'It has sometimes felt as strong on rested days.' },
        { id: 'no', t: 'No, it’s easier then', w: 1, say: 'It feels easier on rested days.' }],
      unsure: 'Tiredness and hard feelings feed each other both ways, so it’s hard to say which came first.' },
    unmet: { name: 'The unmet-needs effect', plain: 'A need going without for a while', members: ['unmet', 'lonely', 'unheard', 'torn'],
      hyp: 'You’ve been going without {list}. When a need goes unmet for a while, it can show up as irritation, sadness or restlessness that seems to come from nowhere.',
      q: 'Picture getting a little more {need} this week. What happens to the feeling?', opts: [
        { id: 'eases', t: 'It eases a little', w: 2, say: 'Picturing a little more {need} eases the feeling.' },
        { id: 'notmuch', t: 'Not much changes', w: -1, say: 'Picturing more {need} doesn’t change much.' },
        { id: 'cant', t: 'I can’t picture it happening', w: 0.5, say: 'You can’t picture getting more {need} right now, which may mean something is in the way.' }],
      cq: 'Have you felt this way even at times when you had enough {need}?', copts: [
        { id: 'yes', t: 'Yes', w: -1.5, say: 'You’ve felt this way even when you had enough {need}.' },
        { id: 'no', t: 'No', w: 0.5, say: 'You don’t usually feel this way when you have enough {need}.' }],
      unsure: 'Needs overlap, and naming the right one can take a few tries.' }
  };
  D.probeOrder = ['acc', 'spill', 'deplete', 'unmet', 'interp'];

  /* ------------------------------------------------------------------ the factors */
  // kind: outside | body | people | inner | needs | change    ctl: mine | others | cant    art: how the picture draws it
  D.kinds = { outside: 'Around you', body: 'Your body', people: 'Between people', inner: 'Thoughts and expectations', needs: 'Needs', change: 'Change' };
  D.factors = {
    workload: { label: 'A heavy load at work, school or home', kind: 'outside', ctl: 'others', art: 'stone',
      unsure: 'A full plate doesn’t always feel heavy. Support and recovery time change how it lands, and a few taps can’t fully show that.',
      steps: [{ t: 'Sort your plate into keep, delay and hand off', d: 'Write down everything on your plate. Mark one thing to drop, delay or hand to someone else this week.', link: ['/lemonade-stand.html#quick', 'Who does what?'], sig: 'One thing is off your list by the end of the week.' },
              { t: 'Ask for one specific thing to come off your plate', d: 'Pick one task and one person. Ask plainly: “Could you take the Thursday pickup this week?”', link: ['/refusals.html', 'Say no kindly'], sig: 'Someone said yes, or you know where you stand.', ask: true }] },
    meaning: { label: 'Work that feels pointless or unseen', kind: 'outside', ctl: 'others', art: 'stone',
      unsure: 'It’s hard to tell from here whether the work itself, or how it’s noticed, matters more to you.',
      steps: [{ t: 'Notice one way your work helps someone', d: 'This week, write down one moment your work made a difference, however small, and tell one person about it.', link: ['/appreciation-at-work.html', 'Appreciation at work'], sig: 'You can name one thing you did that mattered.' }] },
    money: { label: 'Money pressure', kind: 'outside', ctl: 'others', art: 'stone',
      unsure: 'Money stress depends on details this tool doesn’t ask about, like how soon things are due.',
      steps: [{ t: 'Write down the next step for one money worry', d: 'Pick the money worry that keeps you up most. Write the very next step: a call, a form, a number to look up. Just the next step.', link: ['/money-together.html', 'Money, calmly'], sig: 'The next step is done, or has a day on the calendar.' }] },
    caregiving: { label: 'Caring for someone, with little time off', kind: 'outside', ctl: 'others', art: 'stone',
      unsure: 'Caring can be tiring and meaningful at the same time. Both can be true.',
      steps: [{ t: 'Ask one person for one specific break', d: 'Ask someone for a set two hours off this week, with the day and time: “Could you be with Mom on Saturday from 2 to 4?”', link: ['/caregivers.html', 'For caregivers'], sig: 'You had two hours that were yours.', ask: true }] },
    roles: { label: 'Too many roles at once', kind: 'outside', ctl: 'mine', art: 'stone',
      unsure: 'Some roles might be lighter than others. A short list can’t show which one weighs most.',
      steps: [{ t: 'Pick one role to do at “good enough” this week', d: 'Choose one role where good enough really is enough this week, and let the rest of it slide.', link: ['/invisible-labor-mental-load.html', 'The mental load'], sig: 'One role took less of you, and nothing fell apart.' }] },
    jobinsecurity: { label: 'Work or income that feels uncertain', kind: 'change', ctl: 'cant', art: 'stone',
      unsure: 'Uncertainty is hard partly because there’s no answer yet. That isn’t something to fix by thinking.',
      steps: [{ t: 'Split what you can do from what you’re waiting on', d: 'Make two short lists: what you can do this week (one call, one application) and what you’re waiting on. Do one thing from the first list.', link: ['/make-a-plan.html', 'Plan it once'], sig: 'One thing from your list is done.' }] },
    tension: { label: 'Tension or distance with someone close', kind: 'people', ctl: 'others', art: 'person',
      unsure: 'You’re hearing one side here, your own, which is the only side a tool like this can hear. How the other person sees it is unknown.',
      steps: [{ t: 'Say one small need at a calm time', d: 'Pick a calm moment, not the heat of it. Say one fact, one feeling and one kind ask: “When the dishes sat out last night, I felt let down. Could we sort out who does them?”', link: ['/workpapers/wp-09-say-it-so-it-lands.html', 'Say it so it lands'], sig: 'You said it, and you know a little more about how they see it.', ask: true }] },
    unheard: { label: 'Not feeling heard or appreciated', kind: 'people', ctl: 'others', art: 'person',
      unsure: 'Feeling unheard can come from what someone did, or from a mismatch in how each of you shows care. A few taps can’t tell which.',
      steps: [{ t: 'Tell one person the kind of support that helps you', d: 'Do you need someone to listen, help you plan, lend a hand, or give you room? Tell one person which, in one sentence.', link: ['/support-languages.html', 'Support languages'], sig: 'Someone offered the kind of help you asked for.', ask: true }] },
    lonely: { label: 'Loneliness or feeling left out', kind: 'people', ctl: 'mine', art: 'person',
      unsure: 'Loneliness depends on how connected you feel, which a head count can’t show, so it’s hard to measure.',
      steps: [{ t: 'Send one low-pressure message', d: 'Message one person you’d like to see more. Keep it light and easy to say yes to: “Coffee one morning this week?”', link: ['/friends.html', 'Friends'], sig: 'You had one conversation that felt easy.' }] },
    obligations: { label: 'Too many plans or social obligations', kind: 'people', ctl: 'mine', art: 'stone',
      unsure: 'Some plans drain you and some refill you. The list doesn’t say which are which.',
      steps: [{ t: 'Say “not this week” to one plan', d: 'Pick one plan that drains more than it gives, and step back from it kindly.', link: ['/refusals.html', 'Say no kindly'], sig: 'You had one free evening that would have been booked.' }] },
    othercrisis: { label: 'Carrying someone else’s hard time', kind: 'people', ctl: 'mine', art: 'stone',
      unsure: 'Caring about someone in trouble is natural. How much of it you can carry right now is something only you know.',
      steps: [{ t: 'Decide what you can offer this week, and say it', d: 'Choose what you can give (a call on Sunday, one meal) and let that be enough for now.', link: ['/support-languages.html', 'Support languages'], sig: 'You helped in the way you chose, and still had something left.' }] },
    unfair: { label: 'Being treated unfairly', kind: 'outside', ctl: 'others', art: 'wedge',
      unsure: 'This tool can’t judge what happened. It takes your word for how it felt and doesn’t label anyone.',
      steps: [{ t: 'Write down what happened, with dates', d: 'While it’s fresh, write down what happened, when, and who was there. It’s just for you, and it helps if you decide to raise it later.', link: ['/workpapers/wp-14-is-it-us-or-everything-else.html', 'Is it us, or everything else?'], sig: 'You have a clear note, and it’s out of your head.' }] },
    irritants: { label: 'Lots of small things adding up', kind: 'outside', ctl: 'mine', art: 'thread',
      unsure: 'Small things are easy to undercount, and also easy to blame for something bigger.',
      steps: [{ t: 'Fix, move or block the most frequent small irritant', d: 'Pick the small thing that bugs you most often (a noisy alert, a drawer that sticks, a pile by the door) and deal with just that one today.', link: ['/workpapers/wp-14-is-it-us-or-everything-else.html', 'Is it us, or everything else?'], sig: 'That one thing stops bugging you.' }] },
    sensory: { label: 'A noisy, bright or crowded space', kind: 'outside', ctl: 'mine', art: 'speckle',
      unsure: 'People take in noise, light and crowds very differently. What’s fine for one person is a lot for another.',
      steps: [{ t: 'Give yourself 15 minutes of lower input', d: 'Today, find 15 minutes somewhere quieter and dimmer, or use headphones or earplugs, and notice the difference.', link: ['/wp-11-sound-toolkit.html', 'Sound toolkit'], sig: 'You feel a little less on edge after a quiet stretch.' }] },
    digital: { label: 'Constant messages and alerts', kind: 'outside', ctl: 'mine', art: 'pings',
      unsure: 'Some messages matter and some don’t. A week of fewer alerts would show which.',
      steps: [{ t: 'Turn off one kind of alert for a week', d: 'Pick the alert that interrupts you most and doesn’t need you right away, and switch it off for a week.', link: ['/relax.html', 'Relax'], sig: 'You get through a task without being pulled away.' }] },
    home: { label: 'Home tasks or repairs piling up', kind: 'outside', ctl: 'mine', art: 'stone',
      unsure: 'Home tasks weigh more when they’re unevenly shared. The list doesn’t say how they’re split.',
      steps: [{ t: 'Fifteen minutes on the one task that bugs you most', d: 'Set a timer for 15 minutes on the home task you notice most, and stop when it rings.', link: ['/lemonade-stand.html#quick', 'Who does what?'], sig: 'The thing you notice most is smaller.' }] },
    sleep: { label: 'Short or broken sleep', kind: 'body', ctl: 'mine', art: 'ring',
      unsure: 'Sleep and mood affect each other both ways, so it’s hard to say which came first.',
      steps: [{ t: 'Protect tonight’s sleep', d: 'Pick a wind-down time 30 minutes earlier than usual. Lights low, screens out of reach, the same time again tomorrow.', link: ['/nervous-system.html', 'Your nervous system'], sig: 'You wake a little more rested on more mornings this week.' }] },
    energy: { label: 'Low energy', kind: 'body', ctl: 'mine', art: 'ring',
      unsure: 'Low energy has many possible causes, and a few taps can’t sort them out.',
      steps: [{ t: 'Plan today for the energy you have', d: 'Choose the one thing that matters most today, do it while your energy is best, and let one other thing wait.', link: ['/quick-checks.html#today', 'My weather today'], sig: 'The most important thing got done without running dry.' }] },
    hunger: { label: 'Running on empty: skipped meals or low fuel', kind: 'body', ctl: 'mine', art: 'ring',
      unsure: 'Hunger mostly makes feelings louder when we don’t notice it, so it’s easy to miss.',
      steps: [{ t: 'Eat before the next hard thing', d: 'Before the next hard task or talk, eat something with some protein in it, even small.', link: ['/quick-checks.html#today', 'My weather today'], sig: 'The next hard moment feels a little less sharp.' }] },
    pain: { label: 'Pain or feeling unwell', kind: 'body', ctl: 'cant', art: 'ring',
      unsure: 'Pain and illness change how everything feels, and they come and go in ways a short session can’t track.',
      steps: [{ t: 'Plan today around how your body feels', d: 'Drop or shrink one thing today, and rest without counting it as a failure.', link: ['/nervous-system.html#interoception', 'Reading your body'], sig: 'You got through today with a little left over.' }] },
    recovery: { label: 'No time to recover between things', kind: 'body', ctl: 'mine', art: 'ring',
      unsure: 'Recovery doesn’t need much time, but it does need to be time that’s truly yours. Only you can tell which time counts.',
      steps: [{ t: 'Book 20 minutes that are fully yours', d: 'Put 20 minutes in your calendar this week that belong only to you, and keep them like an appointment.', link: ['/relax.html', 'Relax'], sig: 'You had the 20 minutes, and you felt a small difference after.' }] },
    movement: { label: 'Less movement or time outside', kind: 'body', ctl: 'mine', art: 'ring',
      unsure: 'Movement helps many people, but how much depends on the person and the day.',
      steps: [{ t: 'Take a ten-minute walk outside today', d: 'Ten minutes outside, at any pace. No phone needed.', link: ['/relax.html', 'Relax'], sig: 'You feel a little lighter after the walk.' }] },
    healthchange: { label: 'A change in health, medicine or cycle', kind: 'body', ctl: 'cant', art: 'stone',
      unsure: 'Body changes can shift feelings in ways that are hard to separate from everything else.',
      steps: [{ t: 'Notice if the feeling follows the change', d: 'For a week, jot down how you feel and anything about the change (time of day, a new dose, your cycle). A note on your phone is enough.', link: ['/nervous-system.html#interoception', 'Reading your body'], sig: 'You can see whether the feeling follows a pattern.' }] },
    replay: { label: 'Replaying something that happened', kind: 'inner', ctl: 'mine', art: 'haze',
      unsure: 'Going over something can help you make sense of it, or keep it hot. Which one depends on how it’s done.',
      steps: [{ t: 'Tell it as if it happened to a friend', d: 'When the replay starts, try describing it in the third person: “They felt hurt because…” It gives a little distance.', link: ['/upset-right-now.html', 'Cool-down corner'], sig: 'The replay is shorter, or less sharp.' }] },
    worryahead: { label: 'Worry about what’s coming', kind: 'inner', ctl: 'mine', art: 'haze',
      unsure: 'Some worry is useful planning. It’s hard to tell from here how much is.',
      steps: [{ t: 'Write the worry, then one thing you can do', d: 'Write the worry in one line. Under it, write one thing you can do about it this week, and when you’ll look at it again.', link: ['/wp-11.html', 'Calm-down plan'], sig: 'The worry comes up less often between looks.' }] },
    highbar: { label: 'Expecting more of yourself than there’s room for', kind: 'inner', ctl: 'mine', art: 'haze',
      unsure: 'High standards can be a strength. The question is whether there’s room for them right now.',
      steps: [{ t: 'Write today’s good-enough version', d: 'For one task, write what good enough looks like today, and stop there.', link: ['/small-wins.html', 'Small wins'], sig: 'You finished something at good enough, and it was fine.' }] },
    mindread: { label: 'Guessing what someone else thinks', kind: 'inner', ctl: 'mine', art: 'haze',
      unsure: 'Your guess may be right. Only checking can tell.',
      steps: [{ t: 'Check one guess with a curious question', d: 'Pick one guess about what someone meant, and ask a short, curious question instead: “When you said that, did you mean…?”', link: ['/signal-translator.html', 'Chat analyzer'], sig: 'You know a little more about what they meant.' }] },
    comparing: { label: 'Comparing yourself with others', kind: 'inner', ctl: 'mine', art: 'haze',
      unsure: 'Comparing is human. It weighs more in some settings than others.',
      steps: [{ t: 'Take a one-day break from what sets off comparing', d: 'Notice where comparing starts (a feed, a group chat) and take one day away from it.', link: ['/small-wins.html', 'Small wins'], sig: 'The day feels a little lighter.' }] },
    unmet: { label: 'Going without {needs}', kind: 'needs', ctl: 'mine', art: 'cup',
      unsure: 'Needs overlap, and naming the right one can take a few tries.',
      steps: [] /* chosen from D.needSteps by the need that matters most */ },
    torn: { label: 'Feeling torn between two things you want', kind: 'needs', ctl: 'mine', art: 'cup',
      unsure: 'Inner conflicts often settle with time. A short session isn’t the place to decide them.',
      steps: [{ t: 'Write both sides on one page, without deciding', d: 'Write what each side wants and what it protects. You don’t have to choose today.', link: ['/growing-up.html#roots-h', 'Old rules, new choices'], sig: 'The pull between them feels a little clearer.' }] },
    change: { label: 'A big change', kind: 'change', ctl: 'cant', art: 'horizon',
      unsure: 'Even good changes take adjusting, and endings can take a while to feel.',
      steps: [{ t: 'Keep one small routine steady', d: 'While things change, keep one small routine the same every day: a morning drink, a walk, a call.', link: ['/grief.html', 'Grief and loss'], sig: 'There’s one part of the day that feels familiar.' }] },
    waiting: { label: 'Waiting on news, or not knowing', kind: 'change', ctl: 'cant', art: 'fog',
      unsure: 'Not knowing is hard in itself. That part may simply need time.',
      steps: [{ t: 'Give the worry a ten-minute window', d: 'Choose ten minutes a day to think about the news. When it comes up at other times, tell yourself it has a time slot.', link: ['/wp-11.html', 'Calm-down plan'], sig: 'The waiting takes up less of the day.' }] },
    anniversary: { label: 'A hard date or time of year', kind: 'change', ctl: 'cant', art: 'horizon',
      unsure: 'Dates can stir feelings before we notice the connection.',
      steps: [{ t: 'Plan something gentle for the hard day', d: 'Plan one kind thing for the day itself, and tell one person it’s coming up.', link: ['/grief.html', 'Grief and loss'], sig: 'The day had one gentle moment in it.' }] },
    pattern: { label: 'An old pattern or memory coming up', kind: 'change', ctl: 'mine', art: 'horizon',
      unsure: 'Old patterns can shape a reaction without explaining all of it. This tool makes no guesses about your past.',
      steps: [{ t: 'Try one piece of what helped last time', d: 'Think back to what helped before, even a little, and try one piece of it this week.', link: ['/growing-up.html#roots-h', 'Old rules, new choices'], sig: 'It helps a little again, or you learn what’s different this time.' }] }
  };

  // steps for the unmet need that matters most (d_need or the first one picked)
  D.needSteps = {
    rest: { t: 'Find one small pocket of real rest', d: 'Choose 20 minutes this week to rest on purpose, lying down or sitting still, with nothing to get done.', link: ['/relax.html', 'Relax'], sig: 'You rested once this week without feeling you had to earn it.' },
    alone: { t: 'Ask for 30 minutes on your own', d: 'Ask the people around you for 30 minutes alone, with a time: “I’m taking 30 minutes to myself at 7, then I’m all yours.”', link: ['/support-languages.html#room', 'Give me room'], sig: 'You had the time, and came back a little steadier.', ask: true },
    connect: { t: 'Send one low-pressure message', d: 'Message one person you’d like to feel closer to. Keep it easy to say yes to.', link: ['/friends.html', 'Friends'], sig: 'You had one conversation that felt easy.' },
    appreciate: { t: 'Tell someone what you’d like noticed', d: 'Tell one person close to you one thing you do that you’d like them to notice. It’s fair to ask.', link: ['/support-languages.html', 'Support languages'], sig: 'Someone noticed, or you know more about why not.', ask: true },
    control: { t: 'Claim one decision about tomorrow', d: 'Choose one part of tomorrow that’s yours to decide (when you take a break, what you eat, the order you do things) and decide it.', link: ['/make-a-plan.html', 'Plan it once'], sig: 'One part of the day felt like yours.' },
    values: { t: 'Do one small thing that fits what matters to you', d: 'Pick one small action this week that fits something you care about, even ten minutes of it.', link: ['/growing-up.html#roots-h', 'Old rules, new choices'], sig: 'You did one thing that felt like you.' },
    progress: { t: 'Finish one small thing today', d: 'Pick a task small enough to finish today, and finish it.', link: ['/small-wins.html', 'Small wins'], sig: 'You can point to one thing that’s done.' },
    fun: { t: 'Put one fun thing in the week', d: 'Schedule one thing just for fun this week, with no goal attached.', link: ['/pause-and-play.html', 'Gentle games'], sig: 'You laughed or lost track of time once this week.' },
    fair: { t: 'Look at how things are shared, with facts', d: 'For one week, jot down who does what. Facts make a fairness talk calmer later, if you want one.', link: ['/lemonade-stand.html#quick', 'Who does what?'], sig: 'You have a clearer picture of how things are shared.' }
  };

  /* ------------------------------------------------------------------ protective factors ("what holds you") */
  D.good = {
    people: 'someone who helps or gets you', restore: 'something that restores you', going: 'something going well',
    sleep: 'some good nights of sleep', place: 'a place that feels calm', laugh: 'something that made you laugh'
  };
  D.wishWords = {
    rest: 'more rest', heard: 'feeling heard', less: 'less on your plate', quiet: 'some quiet', close: 'feeling close to someone',
    clear: 'knowing what to do next', capable: 'feeling capable again', fun: 'some fun', fair: 'things feeling fair', space: 'room to breathe'
  };

  /* ------------------------------------------------------------------ colors people can pick from (bright, and each one readable as a swatch) */
  D.swatches = ['#2F6BFF', '#38B6FF', '#00B3A4', '#2BC36B', '#A6D61F', '#FFB400', '#FF6A13', '#FF6F61', '#E8203A', '#FF4F9A', '#C21FB5', '#7B3FF2', '#1E2FA8', '#8E9AC8'];
  D.swatchNames = ['Blue', 'Sky', 'Teal', 'Green', 'Lime', 'Gold', 'Orange', 'Coral', 'Red', 'Rose', 'Magenta', 'Purple', 'Navy', 'Silver'];

  /* ------------------------------------------------------------------ the always-there links */
  D.links = [
    ['/upset-right-now.html', 'Cool-down corner', 'Settle in five minutes when it’s running hot.'],
    ['/wp-11.html', 'Calm-down plan', 'Decide ahead of time what settles you.'],
    ['/workpapers/wp-09-say-it-so-it-lands.html', 'Say it so it lands', 'A fact, a feeling and a kind ask.'],
    ['/support-languages.html', 'Support languages', 'What helps you, and the people around you, through a hard time.'],
    ['/nervous-system.html', 'Your nervous system', 'What stress does in the body, in plain words.'],
    ['/workpapers/wp-02-how-much-are-you-carrying.html', 'How much are you carrying?', 'A quick stress tank check.']
  ];

  D.harmLine = 'If you’re having thoughts of hurting yourself or not wanting to be here, please tell someone you trust today.';
  D.disclaimer = 'This is a picture of what you told me, not a scientific emotional scan.';

  if (typeof module === 'object' && module.exports) module.exports = D; else root.EMO_DATA = D;
})(typeof window !== 'undefined' ? window : this);
